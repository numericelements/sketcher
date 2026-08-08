// ============================================================================
// C² SPLINES OF DEGREE-7 RM-ERF SEGMENTS — a rotation-minimizing frame along a
// whole curve, edited with no locality guarantee and no window.
//
// WHY NO WINDOW. Slide 8 buys EXACT locality on a C² PH quintic spline and pays for it
// in stiffness: the window's C² walls eat the freedom, leaving three spare parameters
// to move ten control points, and the measured amplification reaches 4.4×. Slide 9's
// single Bézier has no locality at all and feels excellent — four spare over six points.
// The feel tracks that ratio, so this module drops the window entirely and pins only the
// two END POINTS, exactly as slide 9 does:
//
//     unknowns    16n + 3
//     conditions  5n (class) + 6(n−1) (C² joints) + 3 + 3 (ends) + 3 (cursor) = 11n + 3
//     gauge       n  (one per segment; every residual here is gauge-invariant)
//     spare       4n
//
// which is a ratio of about 0.59 spare per movable control point FOR ANY n — essentially
// slide 9's. (An earlier note of mine warned that RM-ERF on a spline would be too stiff;
// that count was for a WINDOWED edit, where the window edges cost twelve extra
// conditions. Without a window the arithmetic is completely different.)
//
// So locality here is not promised — it is MEASURED. `reach` reports how many segments
// actually moved, and the figure ghosts the pre-drag curve so the affected span is
// visible rather than asserted.
//
// CONSTRUCTION PUTS THE CONTINUITY IN THE GENERATOR. Make A(t) a C¹ cubic spline and the
// curve is C² for free, so the projection only has to satisfy the 5n class conditions and
// never touches continuity. The obvious alternative — build segment by segment, inheriting
// C¹ and C² and prescribing each span — is UNSTABLE, and measurably so: |r′| at the joints
// ran 2.46 → 1.95 → 8.36 → 17.54 → 72.66 at n = 4 and reached 5066 by n = 7. See
// buildRmErfSpline for the full account and for the two further traps (the planar locus,
// and the fact that climbing out of it drives |A| toward a cusp).
//
// A NOTE ON THE B-SPLINE FORM. Degree 7 meeting with C² needs interior knots of
// multiplicity 5. We work in Bézier-segment form, as slide 8's module does; the knot
// structure matters for export to a CAD system, not for the mathematics here.
// ============================================================================
import { leastSquares } from './linalg'
import {
  type Quat,
  type Vec3,
  polarSandwich,
  qadd,
  qscale,
  qsub,
  sandwich,
  vadd,
  vnorm,
  vscale,
  vsub,
} from './quaternion'
import {
  type Frame,
  erfAt,
  erfTwistRate,
  hodographCoefficients,
  minSpeed as segmentMinSpeed,
  planarity as segmentPlanarity,
  rmErfResidual,
  speedAt,
} from './phSpatialSeptic'

const DEGREE = 7
/** Generator coefficients per segment (a cubic quaternion polynomial). */
const PER_SEGMENT = 4

/** A C² spline whose every segment is a degree-7 RM-ERF curve. */
export interface SepticSpline {
  readonly segments: readonly (readonly Quat[])[]
  readonly p0: Vec3
}

const legsOf = (A: readonly Quat[]): Vec3[] =>
  hodographCoefficients(A).map((d) => vscale(d, 1 / DEGREE))

/** r″ at a segment's ends: d/dt (A i A*) = polarSandwich(A′, A), with A′ = 3ΔA. */
const accelAtStart = (A: readonly Quat[]): Vec3 => polarSandwich(qscale(qsub(A[1], A[0]), 3), A[0])
const accelAtEnd = (A: readonly Quat[]): Vec3 => polarSandwich(qscale(qsub(A[3], A[2]), 3), A[3])

/** All 7n+1 Bézier control points. */
export function splineControlPoints(s: SepticSpline): Vec3[] {
  const out: Vec3[] = [s.p0]
  let cur = s.p0
  for (const A of s.segments) {
    for (const leg of legsOf(A)) {
      cur = vadd(cur, leg)
      out.push(cur)
    }
  }
  return out
}

/** One segment as a polyline — de Casteljau on its eight control points. */
export function sampleSegment(s: SepticSpline, k: number, steps = 20): Vec3[] {
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
export function continuityDefects(s: SepticSpline): { c1: number; c2: number } {
  let c1 = 0
  let c2 = 0
  for (let k = 0; k + 1 < s.segments.length; k++) {
    const a = s.segments[k], b = s.segments[k + 1]
    c1 = Math.max(c1, vnorm(vsub(sandwich(a[3]), sandwich(b[0]))))
    c2 = Math.max(c2, vnorm(vsub(accelAtEnd(a), accelAtStart(b))))
  }
  return { c1, c2 }
}

/** Worst RM-ERF residual over all segments — class membership, measured. */
export function classDefect(s: SepticSpline): number {
  let worst = 0
  for (const A of s.segments) worst = Math.max(worst, ...rmErfResidual(A).map(Math.abs))
  return worst
}

/** ∫|ω₁| ds over the whole spline. Zero when every segment is RM-ERF. */
export function totalTwist(s: SepticSpline, perSegment = 120): number {
  let acc = 0
  for (const A of s.segments) {
    for (let k = 0; k < perSegment; k++) {
      const t = (k + 0.5) / perSegment
      acc += (Math.abs(erfTwistRate(A, t)) * speedAt(A, t)) / perSegment
    }
  }
  return acc
}

export function minSpeed(s: SepticSpline): number {
  let m = Infinity
  for (const A of s.segments) m = Math.min(m, segmentMinSpeed(A))
  return m
}

/** Least planar segment — a flat spline has no frame story to tell. */
export function planarity(s: SepticSpline): number {
  let best = 0
  for (const A of s.segments) best = Math.max(best, segmentPlanarity(A))
  return best
}

/** A single degree-7 curve IS a one-segment spline — lets one curve share this machinery. */
export const asSpline = (q: { readonly A: readonly Quat[]; readonly p0: Vec3 }): SepticSpline => ({
  segments: [q.A],
  p0: q.p0,
})

/** One point of segment `k`, by de Casteljau on its eight control points. */
function segmentPointAt(cps: readonly Vec3[], k: number, t: number): Vec3 {
  const work = cps.slice(DEGREE * k, DEGREE * k + DEGREE + 1).map((p) => ({ ...p }))
  for (let r = 1; r <= DEGREE; r++) {
    for (let j = 0; j <= DEGREE - r; j++) {
      work[j] = vadd(vscale(work[j], 1 - t), vscale(work[j + 1], t))
    }
  }
  return work[0]
}

/**
 * The whole spline as ONE polyline.
 *
 * Drawn per segment instead, two strokes meet at each joint and can notch at any real
 * line width — and a coarse sample count that looks fine on a short segment reads as a
 * visible polygon over a longer span. One continuous path avoids both.
 */
export function sampleSpline(s: SepticSpline, perSegment = 60): Vec3[] {
  const cps = splineControlPoints(s)
  const out: Vec3[] = []
  for (let k = 0; k < s.segments.length; k++) {
    // Skip each joint's duplicate sample; the previous segment already emitted it.
    for (let i = k === 0 ? 0 : 1; i <= perSegment; i++) {
      out.push(segmentPointAt(cps, k, i / perSegment))
    }
  }
  return out
}

/** Cumulative arc length: nodes of (segment, parameter, distance travelled). */
function arcTable(s: SepticSpline, perSegment: number): { k: number; t: number; s: number }[] {
  const nodes: { k: number; t: number; s: number }[] = [{ k: 0, t: 0, s: 0 }]
  let travelled = 0
  for (let k = 0; k < s.segments.length; k++) {
    for (let i = 0; i < perSegment; i++) {
      // σ = |A|² is the speed with respect to t, exactly — no square roots to quadrature.
      travelled += speedAt(s.segments[k], (i + 0.5) / perSegment) / perSegment
      nodes.push({ k, t: (i + 1) / perSegment, s: travelled })
    }
  }
  return nodes
}

/** Total arc length, ∫σ dt over every segment. */
export function arcLength(s: SepticSpline, perSegment = 128): number {
  const nodes = arcTable(s, perSegment)
  return nodes[nodes.length - 1].s
}

/**
 * The frame comb with stations at EQUAL ARC LENGTH rather than equal parameter.
 *
 * Not merely tidier: ω₁ = dθ/ds is defined PER UNIT ARC LENGTH, so arc length is the
 * frame's own parameter and the honest sampling for showing twist. It also matters
 * visibly — σ varies about 2.4× along a typical member here, so parameter-uniform
 * stations crowd at the slow end and thin out at the fast one.
 */
export function frameCombByArcLength(
  s: SepticSpline,
  stations: number,
  length: number,
  resolution = 96,
): { bars: [Vec3, Vec3][]; rail: Vec3[] } {
  const cps = splineControlPoints(s)
  const nodes = arcTable(s, resolution)
  const total = nodes[nodes.length - 1].s
  const bars: [Vec3, Vec3][] = []
  const rail: Vec3[] = []
  if (total <= 0) return { bars, rail }

  let cursor = 0
  for (let j = 0; j <= stations; j++) {
    const want = (total * j) / stations
    while (cursor < nodes.length - 2 && nodes[cursor + 1].s < want) cursor++
    const a = nodes[cursor], b = nodes[cursor + 1]
    // Linear inversion of the arc-length function between neighbouring nodes.
    const span = b.s - a.s
    const u = span > 0 ? Math.min(1, Math.max(0, (want - a.s) / span)) : 0
    // A joint sits between nodes of different segments; take the later one's start.
    const k = b.k
    const t = a.k === b.k ? a.t + u * (b.t - a.t) : u * b.t
    const f = erfAt(s.segments[k], t)
    if (!f) continue
    const at = segmentPointAt(cps, k, t)
    const tip = vadd(at, vscale(f.e2, length))
    bars.push([at, tip])
    rail.push(tip)
  }
  return { bars, rail }
}

/** The frame along the whole spline, as bars and the rail their tips trace. */
export function frameComb(
  s: SepticSpline,
  perSegment: number,
  length: number,
): { bars: [Vec3, Vec3][]; rail: Vec3[] } {
  const bars: [Vec3, Vec3][] = []
  const rail: Vec3[] = []
  for (let k = 0; k < s.segments.length; k++) {
    const pts = sampleSegment(s, k, perSegment)
    for (let i = 0; i <= perSegment; i++) {
      // Skip the shared joint sample so consecutive segments do not double up.
      if (k > 0 && i === 0) continue
      const f: Frame | null = erfAt(s.segments[k], i / perSegment)
      if (!f) continue
      const at = pts[i]
      const tip = vadd(at, vscale(f.e2, length))
      bars.push([at, tip])
      rail.push(tip)
    }
  }
  return { bars, rail }
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

const A_FROM = (x: readonly number[], offset = 0): Quat[] =>
  [0, 1, 2, 3].map((k) => ({
    u: x[offset + 4 * k],
    v: x[offset + 4 * k + 1],
    p: x[offset + 4 * k + 2],
    q: x[offset + 4 * k + 3],
  }))
const A_TO = (A: readonly Quat[]): number[] => A.flatMap((a) => [a.u, a.v, a.p, a.q])

function solveDamped(
  f: (x: readonly number[]) => number[],
  x0: readonly number[],
  iterations: number,
  damping = 1,
): number[] | null {
  let x = x0.slice()
  const h = 1e-6
  for (let it = 0; it < iterations; it++) {
    const r = f(x)
    if (Math.max(...r.map(Math.abs)) < 1e-13) break
    const m = r.length
    const J: number[][] = Array.from({ length: m }, () => new Array(x.length).fill(0))
    for (let c = 0; c < x.length; c++) {
      const plus = x.slice(); plus[c] += h
      const minus = x.slice(); minus[c] -= h
      const rp = f(plus), rm = f(minus)
      for (let e = 0; e < m; e++) J[e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    try {
      step = leastSquares(J, r.map((v) => -v), 1e-11)
    } catch {
      return null
    }
    if (!step.every(Number.isFinite)) return null
    const next = x.map((v, i) => v + damping * step[i])
    if (!next.every(Number.isFinite)) return null
    x = next
  }
  return Math.max(...f(x).map(Math.abs)) < 1e-9 ? x : null
}

/**
 * Build a C² RM-ERF spline of `n` segments.
 *
 * THREE THINGS HAD TO BE GOT RIGHT HERE, and the first two attempts failed by
 * measurement rather than by opinion.
 *
 * 1. THE GENERATOR CARRIES THE CONTINUITY. Making A(t) a C¹ cubic spline makes the
 *    curve C² for free — A continuous gives r′ = A i A* continuous, A′ continuous gives
 *    r″ = polarSandwich(A′,A) continuous — so the projection only has to satisfy the 5n
 *    CLASS conditions and never touches continuity.
 *
 *    The rejected alternative was segment-by-segment: inherit C¹ and C² from the
 *    predecessor and prescribe each segment's span. It is unstable, and spectacularly:
 *    measured |r′| at the joints ran 2.46 → 1.95 → 8.36 → 17.54 → 72.66 at n = 4, and
 *    reached 5066 by n = 7 before failing outright. Prescribing the SPAN while inheriting
 *    both derivatives forces the speed to compound. The generator-side construction has
 *    |r′| in 0.37–1.50 at every n up to 10.
 *
 * 2. THE PLANAR TRAP, AGAIN. Every planar PH curve satisfies the class conditions for
 *    free, so the planar locus is a large attractor and a min-norm projection lands on
 *    it: measured planarity 0.014 from a smooth seed, and no better than 0.121 across
 *    six different seed families. Seed-hunting is not enough. What works is to USE THE
 *    SLACK — the class has ~25 spare dimensions at n = 6 — and climb planarity along the
 *    class's own tangent space, which lifts it to 0.22–0.53 with the class residual
 *    still at 1e-16.
 *
 * 3. BUT CLIMBING PLANARITY DRIVES |A| DOWN. Unguarded, the ascent reaches planarity
 *    0.525 and drags min σ to 0.075 — the same small-|A| attraction that made a geometric
 *    drag metric fail on slide 8. So the ascent stops when the speed floor is reached.
 *    Measured trade: floor 0.5 → planarity 0.12 (no gain); floor 0.35 → 0.22; floor 0.2
 *    → 0.26. The default sits at the knee.
 *
 * Returns null rather than a flat, cusped or non-converged spline.
 */
export function buildRmErfSpline(
  n: number,
  options: { p0?: Vec3; minPlanarity?: number; speedFloor?: number } = {},
): SepticSpline | null {
  const p0 = options.p0 ?? { x: 0, y: 0, z: 0 }
  const wantPlanar = options.minPlanarity ?? 0.12
  const speedFloor = options.speedFloor ?? 0.35

  /** C¹ cubic Hermite in quaternion space — hence a C² curve, by construction. */
  const segmentsFrom = (c: readonly Quat[], m: readonly Quat[]): Quat[][] => {
    const out: Quat[][] = []
    for (let k = 0; k < c.length - 1; k++) {
      out.push([c[k], qadd(c[k], qscale(m[k], 1 / 3)), qsub(c[k + 1], qscale(m[k + 1], 1 / 3)), c[k + 1]])
    }
    return out
  }
  const packCM = (c: readonly Quat[], m: readonly Quat[]): number[] =>
    [...c, ...m].flatMap((a) => [a.u, a.v, a.p, a.q])
  const segsOf = (x: readonly number[]): Quat[][] => {
    const q = (o: number): Quat => ({ u: x[o], v: x[o + 1], p: x[o + 2], q: x[o + 3] })
    const c = Array.from({ length: n + 1 }, (_, k) => q(4 * k))
    const m = Array.from({ length: n + 1 }, (_, k) => q(4 * (n + 1) + 4 * k))
    return segmentsFrom(c, m)
  }
  const classResidualOf = (x: readonly number[]): number[] =>
    segsOf(x).flatMap((A) => rmErfResidual(A))
  const worstClass = (x: readonly number[]): number =>
    Math.max(...classResidualOf(x).map(Math.abs))
  const leastPlanar = (x: readonly number[]): number =>
    Math.min(...segsOf(x).map((A) => segmentPlanarity(A)))
  const mostPlanar = (x: readonly number[]): number =>
    Math.max(...segsOf(x).map((A) => segmentPlanarity(A)))
  const slowest = (x: readonly number[]): number =>
    Math.min(...segsOf(x).map((A) => segmentMinSpeed(A)))
  const spatialness = (x: readonly number[]): number =>
    segsOf(x).reduce((acc, A) => acc + segmentPlanarity(A), 0)

  const onToClass = (x: readonly number[], iterations = 50): number[] | null =>
    solveDamped(classResidualOf, x, iterations)

  // Seeds that vary strongly WITHIN each segment; gentle ones project to flat curves.
  const families: ((k: number) => Quat)[] = [
    (k) => ({ u: 1, v: 0.5 * (k % 2 ? -1 : 1), p: 0.5 * (k % 4 < 2 ? 1 : -1), q: 0.45 * ((k + 1) % 4 < 2 ? 1 : -1) }),
    (k) => ({ u: 1, v: 0.45 * Math.sin(1.55 * k), p: 0.4 * (k % 2 ? -1 : 1), q: 0.35 * Math.cos(1.1 * k + 0.6) }),
    (k) => ({ u: 1, v: 0.34 * Math.sin(2.1 * k + 0.2), p: 0.34 * Math.cos(1.7 * k), q: 0.28 * Math.sin(1.3 * k + 1.1) }),
  ]

  let best: number[] | null = null
  let bestScore = -1
  for (const seed of families) {
    const c = Array.from({ length: n + 1 }, (_, k) => seed(k))
    const m = c.map((_, k) => qscale(qsub(c[Math.min(n, k + 1)], c[Math.max(0, k - 1)]), 0.5))
    let x = onToClass(packCM(c, m))
    if (x === null) continue

    // Climb out of the planar locus along the class's tangent space, stopping at the
    // speed floor. g − Jᵀ(JJᵀ)⁻¹Jg is the component of the gradient that stays on the
    // class to first order; the corrector cleans up the second order.
    const h = 1e-6
    for (let step = 0; step < 40; step++) {
      const g = new Array(x.length).fill(0)
      for (let c2 = 0; c2 < x.length; c2++) {
        const plus = x.slice(); plus[c2] += h
        const minus = x.slice(); minus[c2] -= h
        g[c2] = (spatialness(plus) - spatialness(minus)) / (2 * h)
      }
      const J = jacobianOf(classResidualOf, x)
      const Jg = J.map((row) => row.reduce((acc, v, i) => acc + v * g[i], 0))
      const JJt = J.map((_, a) => J.map((_, b) => J[a].reduce((acc, v, i) => acc + v * J[b][i], 0)))
      let y: number[]
      try {
        y = leastSquares(JJt, Jg, 1e-10)
      } catch {
        break
      }
      const projected = g.map((v, i) => v - J.reduce((acc, row, a) => acc + row[i] * y[a], 0))
      const norm = Math.hypot(...projected)
      if (!Number.isFinite(norm) || norm < 1e-12) break
      const trial = onToClass(x.map((v, i) => v + (0.25 * projected[i]) / norm), 20)
      if (trial === null) break
      if (spatialness(trial) <= spatialness(x)) break
      if (slowest(trial) < speedFloor) break
      x = trial
    }

    const score = mostPlanar(x)
    if (score > bestScore) { bestScore = score; best = x }
  }
  if (best === null) return null

  const spline: SepticSpline = { segments: segsOf(best), p0 }
  if (worstClass(best) > 1e-9) return null
  if (mostPlanar(best) < wantPlanar) return null
  if (leastPlanar(best) < 0) return null
  if (minSpeed(spline) < speedFloor * 0.5) return null
  if (continuityDefects(spline).c2 > 1e-7) return null
  return spline
}

function jacobianOf(
  f: (x: readonly number[]) => number[],
  x: readonly number[],
): number[][] {
  const m = f(x).length
  const h = 1e-6
  const J: number[][] = Array.from({ length: m }, () => new Array(x.length).fill(0))
  for (let c = 0; c < x.length; c++) {
    const plus = x.slice(); plus[c] += h
    const minus = x.slice(); minus[c] -= h
    const fp = f(plus), fm = f(minus)
    for (let e = 0; e < m; e++) J[e][c] = (fp[e] - fm[e]) / (2 * h)
  }
  return J
}

// ---------------------------------------------------------------------------
// Editing: the whole spline moves, minimum norm decides, the ends are held
// ---------------------------------------------------------------------------

export interface SplineDragResult {
  readonly state: SepticSpline
  readonly converged: boolean
  readonly trackingError: number
  readonly classDefect: number
  readonly c2Defect: number
}

const pack = (s: SepticSpline): number[] => [
  ...s.segments.flatMap((A) => A_TO(A)),
  s.p0.x, s.p0.y, s.p0.z,
]
const unpack = (x: readonly number[], n: number): SepticSpline => ({
  segments: Array.from({ length: n }, (_, k) => A_FROM(x, 4 * PER_SEGMENT * k)),
  p0: { x: x[16 * n], y: x[16 * n + 1], z: x[16 * n + 2] },
})

/**
 * Drag one control point of the whole spline. No window: every segment may move, and
 * the minimum-norm step spends the freedom, so the change decays away from the cursor
 * rather than stopping at a wall. The two END POINTS are held — whichever is not the
 * one being dragged — which is what stops the curve sliding bodily (slide 9's lesson).
 *
 * Warm-started; the class and C² conditions are HARD, never penalties.
 */
export function dragSpline(
  from: SepticSpline,
  index: number,
  target: Vec3,
  iterations = 16,
): SplineDragResult {
  const n = from.segments.length
  const before = splineControlPoints(from)
  const LAST = DEGREE * n

  const residual = (x: readonly number[]): number[] => {
    const s = unpack(x, n)
    const cps = splineControlPoints(s)
    const r: number[] = []
    const push = (a: Vec3, b: Vec3): void => { r.push(a.x - b.x, a.y - b.y, a.z - b.z) }
    for (const A of s.segments) r.push(...rmErfResidual(A))
    for (let k = 0; k + 1 < n; k++) {
      push(sandwich(s.segments[k][3]), sandwich(s.segments[k + 1][0]))
      push(accelAtEnd(s.segments[k]), accelAtStart(s.segments[k + 1]))
    }
    for (const end of [0, LAST]) {
      if (end === index) continue
      push(cps[end], before[end])
    }
    push(cps[index], target)
    return r
  }

  let x = pack(from)
  const E = residual(x).length
  const U = x.length
  const h = 1e-6
  for (let it = 0; it < iterations; it++) {
    const r = residual(x)
    if (Math.max(...r.map(Math.abs)) < 1e-12) break
    const J: number[][] = Array.from({ length: E }, () => new Array(U).fill(0))
    for (let c = 0; c < U; c++) {
      const plus = x.slice(); plus[c] += h
      const minus = x.slice(); minus[c] -= h
      const rp = residual(plus), rm = residual(minus)
      for (let e = 0; e < E; e++) J[e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    try {
      step = leastSquares(J, r.map((v) => -v), 1e-11)
    } catch {
      break
    }
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
  }

  const state = unpack(x, n)
  const after = splineControlPoints(state)
  const cd = classDefect(state)
  const c2 = continuityDefects(state).c2
  return {
    state,
    converged: cd < 1e-8 && c2 < 1e-7 && vnorm(vsub(after[index], target)) < 1e-6,
    trackingError: vnorm(vsub(after[index], target)),
    classDefect: cd,
    c2Defect: c2,
  }
}

/**
 * HOW LOCAL DID IT TURN OUT? The number of segments containing a control point that
 * moved more than `fraction` of the drag itself.
 *
 * There is no locality guarantee here, so this is the honest way to talk about it: a
 * measurement with a stated threshold, not a promise. Reported alongside a ghost of the
 * pre-drag curve, so the affected span can also just be seen.
 */
export function reach(
  before: readonly Vec3[],
  after: readonly Vec3[],
  dragIndex: number,
  segments: number,
  fraction = 0.01,
): number {
  const dragged = vnorm(vsub(after[dragIndex], before[dragIndex]))
  if (dragged <= 0) return 0
  const cutoff = dragged * fraction
  let count = 0
  for (let k = 0; k < segments; k++) {
    let moved = 0
    for (let i = DEGREE * k; i <= DEGREE * (k + 1); i++) {
      moved = Math.max(moved, vnorm(vsub(after[i], before[i])))
    }
    if (moved > cutoff) count++
  }
  return count
}

/** Per-segment displacement profile — how the disturbance decays with distance. */
export function displacementProfile(
  before: readonly Vec3[],
  after: readonly Vec3[],
  segments: number,
): number[] {
  const out: number[] = []
  for (let k = 0; k < segments; k++) {
    let moved = 0
    for (let i = DEGREE * k; i <= DEGREE * (k + 1); i++) {
      moved = Math.max(moved, vnorm(vsub(after[i], before[i])))
    }
    out.push(moved)
  }
  return out
}
