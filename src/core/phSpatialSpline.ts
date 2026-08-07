// ============================================================================
// C² SPATIAL PH QUINTIC SPLINES, and LOCAL EDITING of them.
//
// The published scheme (Farouki–Giannelli–Sestini, Adv. Comput. Math. 42 (2016)
// 199–225) edits a PLANAR C² PH quintic spline by displacing one B-spline control
// point, and shows that a two-segment window CANNOT preserve C²: holding the
// neighbours fixed leaves one complex unknown against two complex equations, so
// "the continuity between modified and unmodified segments must be relaxed from
// C² to C¹."
//
// MEASURED HERE (2026-08-07): that is a consequence of the WINDOW WIDTH, not of the
// PH structure. Widen the window and C² comes back.
//
//                      keep C²        relax to C¹
//     plane            W = 4          W = 2   ← the published scheme
//     space            W = 3          W = 2
//
// and SPACE NEEDS A NARROWER WINDOW THAN THE PLANE. Per segment the plane offers 6
// unknowns against 4 conditions per joint (ratio 1.5); space offers 12 against 6
// (ratio 2). Space has proportionally more room, so it reaches feasibility sooner.
//
// Better still, the two cases are feasible in DIFFERENT WAYS. At W = 4 the plane is
// exactly square (24 unknowns, 24 equations) — finitely many ways to perform the
// edit, discrete branches, no slack. At W = 3 space has 36 against 30: a
// SIX-DIMENSIONAL family (five after the gauge). So in space you not only recover
// C², you recover it with room to choose — which is where a further invariant
// (curvature-extrema count, a curvature bound) can live. The plane has no such room.
//
// AND THERE IS NO MAXIMUM DRAG DISTANCE. A single Gauss–Newton solve attempting the
// whole displacement at once diverges past ~3 units, which is a basin-of-attraction
// limit and nothing more. Dragged the way an editor drags — small warm-started steps
// — the control point travels at least 30 units in every direction tested, more than
// ten times the curve's own extent, with σ = |A|² staying ≈ 1 (no cusp) and the
// residual at machine zero. The PH structure does not bound the gesture; only
// invariants you choose to impose do.
//
// WHAT "LOCAL" MEANS HERE. Everything outside the window is untouched — not
// approximately, exactly (measured < 1e-9 for every control point, for a drag of every
// control point). That needs the window to reproduce where it ENDS, not merely its net
// displacement, plus hodograph and r″ matching at each window edge.
//
// EVERY CONTROL POINT IS DRAGGABLE, THE TWO ENDPOINTS INCLUDED, and the boundary
// bookkeeping follows one rule:
//
//     A boundary condition exists only to protect a NEIGHBOUR.
//
// So a window that reaches segment 0 imposes nothing on its left: the start tangent
// and curvature are free, which is exactly what dragging P₁ means. (That is also
// [FGS16]'s observation that the ends of an open planar spline keep C² for free —
// arrived at here for a concrete reason rather than adopted.)
//
// With one exception, which is semantic rather than mathematical: the curve's END
// POSITIONS are boundary data and move ONLY when they are themselves dragged.
// Otherwise nudging P₁ would drift P₀ — min-norm would happily spend the freedom —
// and you could no longer control the two independently. So "no neighbour" frees the
// end DERIVATIVES; the end POINT stays pinned unless it is the handle.
// ============================================================================
import { leastSquares, type Matrix } from './linalg'
import {
  type Quat,
  type Vec3,
  polarSandwich,
  qadd,
  qnormSq,
  qscale,
  qsub,
  sandwich,
  vadd,
  vscale,
  vsub,
} from './quaternion'

/** Bernstein weights of the square for a quadratic generator (m = 2). */
const SQUARE_W: readonly (readonly number[])[] = [
  [1, 0, 0],
  [1 / 2, 1 / 2, 0],
  [1 / 6, 4 / 6, 1 / 6],
  [0, 1 / 2, 1 / 2],
  [0, 0, 1],
]
/** Curve degree of one segment: r′ = A i A* is degree 4, so r is degree 5. */
const DEGREE = 5

/**
 * A C² PH quintic spline. Each segment carries the three Bernstein coefficients of
 * its quadratic quaternion generator, on the unit parameter interval.
 */
export interface SpatialPHSpline {
  readonly segments: readonly (readonly Quat[])[]
  readonly p0: Vec3
}

/** The five degree-4 hodograph coefficients of one segment. */
export function segmentHodograph(A: readonly Quat[]): Vec3[] {
  const out: Vec3[] = []
  for (let j = 0; j < 5; j++) {
    let acc: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = Math.max(0, j - 2); a <= Math.min(2, j); a++) {
      const b = j - a
      if (a > b) continue
      const w = SQUARE_W[j][a]
      if (w === 0) continue
      acc = vadd(acc, vscale(a === b ? sandwich(A[a]) : polarSandwich(A[a], A[b]), w))
    }
    out.push(acc)
  }
  return out
}

const segmentLegs = (A: readonly Quat[]): Vec3[] =>
  segmentHodograph(A).map((d) => vscale(d, 1 / DEGREE))

/** r″ at the start of a segment: d/du (A i A*) = polarSandwich(A′, A). */
const accelAtStart = (A: readonly Quat[]): Vec3 => polarSandwich(qscale(qsub(A[1], A[0]), 2), A[0])
const accelAtEnd = (A: readonly Quat[]): Vec3 => polarSandwich(qscale(qsub(A[2], A[1]), 2), A[2])

export function generatorAt(A: readonly Quat[], u: number): Quat {
  const s = 1 - u
  return qadd(qadd(qscale(A[0], s * s), qscale(A[1], 2 * s * u)), qscale(A[2], u * u))
}

/**
 * Build a C² PH quintic spline from the MIDDLE generator coefficients.
 *
 * Taking the quaternion preimage A(t) to be a C¹ quadratic spline makes the curve
 * C²: A continuous gives r′ = A i A* continuous, and A′ continuous gives
 * r″ = polarSandwich(A′, A) continuous. For unit parameter spacing that is exactly
 * the averaging rule below — the quaternion analogue of the planar w-condition.
 */
export function c2SplineFromMiddles(
  middles: readonly Quat[],
  first: Quat,
  last: Quat,
  p0: Vec3,
): SpatialPHSpline {
  const n = middles.length
  const shared: Quat[] = [first]
  for (let k = 1; k < n; k++) shared.push(qscale(qadd(middles[k - 1], middles[k]), 0.5))
  shared.push(last)
  return {
    segments: middles.map((m, k) => [shared[k], m, shared[k + 1]]),
    p0,
  }
}

/** All 5n+1 Bézier control points of the composite curve. */
export function splineControlPoints(s: SpatialPHSpline): Vec3[] {
  const out: Vec3[] = [s.p0]
  let cur = s.p0
  for (const A of s.segments) {
    for (const leg of segmentLegs(A)) {
      cur = vadd(cur, leg)
      out.push(cur)
    }
  }
  return out
}

/**
 * Sample one segment as a polyline. Each segment is a quintic Bézier on six
 * consecutive composite control points, so this is de Casteljau and nothing more —
 * kept here so the figures hold no evaluation code of their own.
 */
export function sampleSegment(s: SpatialPHSpline, k: number, steps = 24): Vec3[] {
  const cps = splineControlPoints(s)
  const base = cps.slice(DEGREE * k, DEGREE * k + DEGREE + 1)
  const out: Vec3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const work = base.map((p) => ({ ...p }))
    for (let r = 1; r <= DEGREE; r++) {
      for (let j = 0; j <= DEGREE - r; j++) {
        work[j] = vadd(vscale(work[j], 1 - t), vscale(work[j + 1], t))
      }
    }
    out.push(work[0])
  }
  return out
}

/** Worst hodograph and r″ mismatch across the internal joints. */
export function continuityDefects(s: SpatialPHSpline): { c1: number; c2: number } {
  let c1 = 0
  let c2 = 0
  for (let k = 0; k + 1 < s.segments.length; k++) {
    const a = s.segments[k]
    const b = s.segments[k + 1]
    c1 = Math.max(c1, Math.hypot(...toArr(vsub(sandwich(a[2]), sandwich(b[0])))))
    c2 = Math.max(c2, Math.hypot(...toArr(vsub(accelAtEnd(a), accelAtStart(b)))))
  }
  return { c1, c2 }
}
const toArr = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** Smallest σ = |A|² anywhere on the spline. Zero means a cusp. */
export function minSpeed(s: SpatialPHSpline, perSegment = 24): number {
  let m = Infinity
  for (const A of s.segments) {
    for (let i = 0; i <= perSegment; i++) m = Math.min(m, qnormSq(generatorAt(A, i / perSegment)))
  }
  return m
}

export interface LocalEditOptions {
  /** Segments allowed to move. 3 keeps C² in space; 2 forces the C¹ relaxation. */
  readonly window?: number
  /** Hold r″ at the window edges (C²) or only the hodograph (C¹). */
  readonly keepC2?: boolean
  readonly iterations?: number
  readonly regularization?: number
}

export interface LocalEditResult {
  readonly spline: SpatialPHSpline
  readonly converged: boolean
  readonly residual: number
  /** Inclusive segment range that was allowed to move. */
  readonly movedSegments: readonly [number, number]
  readonly iterations: number
}

/**
 * The window of `width` segments that may move when control point `index` is dragged,
 * centred on that point's own segment and clamped to the spline.
 */
export function editWindow(
  s: SpatialPHSpline,
  index: number,
  width: number,
): [number, number] | null {
  const n = s.segments.length
  if (index < 0 || index > DEGREE * n) return null
  if (width > n) return null
  // Control point `index` is the end of leg `index-1`, which belongs to segment
  // ⌊(index-1)/DEGREE⌋; index 0 is the start of segment 0.
  const own = index === 0 ? 0 : Math.min(n - 1, Math.floor((index - 1) / DEGREE))
  const start = Math.max(0, Math.min(n - width, own - Math.floor((width - 1) / 2)))
  return [start, start + width - 1]
}

/**
 * Drag one control point, letting only a window of segments move, and leaving the
 * rest of the spline EXACTLY unchanged.
 *
 * Warm-started from `s`, so an interactive drag is a sequence of these — which is
 * what makes the reachable distance effectively unbounded (see the header). Returns
 * `converged: false` rather than a wrong answer when the step cannot be met.
 */
export function localEdit(
  s: SpatialPHSpline,
  index: number,
  target: Vec3,
  options: LocalEditOptions = {},
): LocalEditResult | null {
  const width = options.window ?? 3
  const keepC2 = options.keepC2 ?? true
  const iterations = options.iterations ?? 40
  const reg = options.regularization ?? 1e-11

  const win = editWindow(s, index, width)
  if (win === null) return null
  const [k0, k1] = win
  const W = k1 - k0 + 1
  const n = s.segments.length

  const cps = splineControlPoints(s)
  const original = s.segments.slice(k0, k1 + 1)

  // A boundary condition exists only to protect a NEIGHBOUR. Where the window meets
  // the curve's own end there is no neighbour, so nothing is imposed — the start (or
  // end) point, tangent and curvature are free, which is precisely what dragging P₀
  // or P₁ means. That is also why the ends are the easy place to edit, as [FGS16]
  // observe for the planar case.
  const openLeft = k0 === 0
  const openRight = k1 === s.segments.length - 1
  // The curve's END POINTS are boundary data: they move only when you drag them, or
  // nudging P₁ would drift P₀ and you could not control the two independently. So
  // "no neighbour" frees the end TANGENT and CURVATURE, but the end POSITION stays
  // pinned unless it is the thing being dragged.
  const freeOrigin = openLeft && index === 0
  const freeEnd = openRight && index === DEGREE * s.segments.length

  const leftHodo = sandwich(original[0][0])
  const leftAccel = accelAtStart(original[0])
  const rightHodo = sandwich(original[W - 1][2])
  const rightAccel = accelAtEnd(original[W - 1])

  const windowStartCp = DEGREE * k0
  const legOffset = index - windowStartCp // which leg inside the window ends at `index`
  if (legOffset < 0 || legOffset > DEGREE * W) return null
  // Dragging the window's own first point is only meaningful when that point is free.
  if (legOffset === 0 && !freeOrigin) return null

  /** Where the window must end, when there is a neighbour after it to protect. */
  const endTarget = cps[DEGREE * (k1 + 1)]

  const pack = (segs: readonly (readonly Quat[])[]): number[] => {
    const v = segs.flatMap((A) => A.flatMap((a) => [a.u, a.v, a.p, a.q]))
    // When the window opens on the left, the curve's origin is an unknown too, so
    // that P₀ can move without translating the whole spline.
    return freeOrigin ? [...v, s.p0.x, s.p0.y, s.p0.z] : v
  }
  const unpack = (x: readonly number[]): Quat[][] =>
    Array.from({ length: W }, (_, seg) =>
      [0, 1, 2].map((j) => {
        const o = 12 * seg + 4 * j
        return { u: x[o], v: x[o + 1], p: x[o + 2], q: x[o + 3] }
      }),
    )
  const originOf = (x: readonly number[]): Vec3 =>
    freeOrigin ? { x: x[12 * W], y: x[12 * W + 1], z: x[12 * W + 2] } : cps[windowStartCp]

  const residual = (x: readonly number[]): number[] => {
    const w = unpack(x)
    const r: number[] = []
    const push = (v: Vec3): void => { r.push(v.x, v.y, v.z) }

    if (!openLeft) {
      push(vsub(sandwich(w[0][0]), leftHodo))
      if (keepC2) push(vsub(accelAtStart(w[0]), leftAccel))
    }
    for (let seg = 1; seg < W; seg++) {
      push(vsub(sandwich(w[seg][0]), sandwich(w[seg - 1][2])))
      push(vsub(accelAtStart(w[seg]), accelAtEnd(w[seg - 1])))
    }
    if (!openRight) {
      push(vsub(sandwich(w[W - 1][2]), rightHodo))
      if (keepC2) push(vsub(accelAtEnd(w[W - 1]), rightAccel))
    }

    let cur = originOf(x)
    let dragged = legOffset === 0 ? cur : cur
    let count = 0
    for (const A of w) {
      for (const leg of segmentLegs(A)) {
        cur = vadd(cur, leg)
        count++
        if (count === legOffset) dragged = cur
      }
    }
    // Pin where the window ENDS (not its net displacement), so that a moving origin
    // cannot drag the untouched tail along with it.
    if (!freeEnd) push(vsub(cur, endTarget))
    push(vsub(dragged, target))
    return r
  }

  let x = pack(original)
  const E = residual(x).length
  const U = x.length
  const h = 1e-6
  let used = 0
  for (let it = 0; it < iterations; it++) {
    used = it + 1
    const r = residual(x)
    const J: Matrix = Array.from({ length: E }, () => new Array(U).fill(0))
    for (let col = 0; col < U; col++) {
      const plus = x.slice(); plus[col] += h
      const minus = x.slice(); minus[col] -= h
      const rp = residual(plus)
      const rm = residual(minus)
      for (let e = 0; e < E; e++) J[e][col] = (rp[e] - rm[e]) / (2 * h)
    }
    // leastSquares throws on a singular normal-equation matrix, which happens when
    // an over-large step has already wandered somewhere degenerate. A drag handler
    // must never throw: report non-convergence and let the caller keep the last good
    // state, exactly as it would for a step it could not meet.
    let step: number[]
    try {
      step = leastSquares(J, r.map((v) => -v), reg)
    } catch {
      break
    }
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
    if (Math.max(...step.map(Math.abs)) < 1e-14) break
  }

  const finalResidual = Math.max(...residual(x).map(Math.abs))
  const edited = unpack(x)
  const segments = s.segments.map((A, k) => (k >= k0 && k <= k1 ? edited[k - k0] : A))
  void n
  return {
    // Only a window that opens on the left owns the curve's origin; otherwise
    // originOf is the WINDOW's start point, which is not the same thing.
    spline: { segments, p0: freeOrigin ? originOf(x) : s.p0 },
    converged: finalResidual < 1e-10,
    residual: finalResidual,
    movedSegments: [k0, k1],
    iterations: used,
  }
}
