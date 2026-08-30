// ============================================================================
// THE FIBRE OVER A SPATIAL GRIP — its dimension, its SHAPE, and how much of it to show.
//
// In the plane, holding the maximum number of control points always leaves a COUNT. In space it
// almost always leaves a FAMILY: dim = 4(m+1) + 3 − 1 = 4m+6 against 3 per held point, and 3
// divides that only sometimes. What is left over is a fibre, and the figure has to traverse it.
//
// DIMENSION TRANSFERS; SHAPE DOES NOT. That warning is already paid for in this repository
// (SEPTIC_SIX_POINTS §4), and the spatial cubic proves it twice over. Ten degrees of freedom, three
// held control points, nine conditions, one dimension left — either way. And yet:
//
//     hold P₀,P₁,P₃    a CLOSED ellipse. Every member the same length, so the fairness
//                      selector is blind on it. Length has a closed form, |P₁−P₀|·(1+T).
//     hold P₀,P₁,P₂    an OPEN parabola, axis the first leg, arc length growing quadratically.
//                      There is no coming home.
//
// Same degree, same dimension, same number of held points — a loop you can tour or a road you can
// only walk down, decided by WHICH three. So an instrument may compute the dimension but must
// MEASURE the shape.
//
// WHAT THIS MODULE REPORTS, per grip:
//   · dimension  — nullity of the held-point Jacobian, less the one gauge direction;
//   · closure    — walked, not assumed: step along the fibre and see whether the control polygon
//                  returns to where it started;
//   · extent     — how much is worth showing, since an open fibre has no natural end. The window
//                  closes when the curve grows past a multiple of its size at the start, which is
//                  the constraint that actually matters: the picture staying readable.
//
// ARC LENGTH IS MEASURED IN THE CONTROL POLYGON, not in the spinor. That is the metric a viewer
// sees, and it also makes the Hopf gauge free of charge: A ↦ A e^{iθ} moves the spinor and not the
// curve, so it contributes nothing to the distance and needs no special handling in the walk.
// ============================================================================
import type { Matrix } from './linalg'
import { leastSquares, luFactor, luSolve } from './linalg'
import type { Quat, Vec3 } from './quaternion'
import {
  QUAT_I, qadd, qmul, qscale, qsub, qnormSq,
  sandwich, polarSandwich, quatFromSandwich, vadd, vdot, vnorm, vsub, vscale,
} from './quaternion'
import { type SpatialPHCurve, controlPoints, spatialControlPointJacobian } from './phSpatialFreeDragN'
import {
  type SpatialHermiteData, anglesOf, gaugeRefsFor, interpolateSpatialQuintic,
} from './phSpatialQuintic'
import { type FiberPoint, type InteriorHandle, spatialCubicFiberAtAngleFor } from './phSpatialCubic'

const dot = (a: readonly number[], b: readonly number[]): number =>
  a.reduce((s, v, i) => s + v * b[i], 0)
const norm = (a: readonly number[]): number => Math.sqrt(dot(a, a))

const pack = (c: SpatialPHCurve): number[] => [
  ...c.A.flatMap((a) => [a.u, a.v, a.p, a.q]), c.p0.x, c.p0.y, c.p0.z,
]
const unpack = (x: readonly number[], m: number): SpatialPHCurve => {
  const A: Quat[] = []
  for (let k = 0; k <= m; k++) A.push({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] })
  const o = 4 * (m + 1)
  return { A, p0: { x: x[o], y: x[o + 1], z: x[o + 2] } }
}

/** The Hopf gauge direction A ↦ A·i, which moves the spinor and not the curve. */
function gaugeDirection(c: SpatialPHCurve): number[] {
  const g: number[] = []
  for (const a of c.A) g.push(-a.v, a.u, a.q, -a.p)   // a·i
  g.push(0, 0, 0)
  return g
}

/** Rows of the control-point Jacobian belonging to the held indices. */
function gripRows(c: SpatialPHCurve, grip: readonly number[]): Matrix {
  const J = spatialControlPointJacobian(c)
  return grip.flatMap((i) => [J[3 * i], J[3 * i + 1], J[3 * i + 2]])
}

/** Orthonormal basis of the kernel, by projecting the standard basis off the row space. */
function kernelBasis(rows: Matrix, n: number, tol = 1e-9): number[][] {
  const rowOrth: number[][] = []
  for (const r of rows) {
    let w = [...r]
    for (let pass = 0; pass < 2; pass++) {
      for (const u of rowOrth) {
        const d = dot(u, w)
        w = w.map((v, i) => v - d * u[i])
      }
    }
    const nn = norm(w)
    if (nn > tol * Math.max(norm(r), 1)) rowOrth.push(w.map((v) => v / nn))
  }
  const basis: number[][] = []
  for (let k = 0; k < n; k++) {
    let w: number[] = Array.from({ length: n }, (_, i) => (i === k ? 1 : 0))
    for (let pass = 0; pass < 2; pass++) {
      for (const u of [...rowOrth, ...basis]) {
        const d = dot(u, w)
        w = w.map((v, i) => v - d * u[i])
      }
    }
    const nn = norm(w)
    if (nn > 1e-7) basis.push(w.map((v) => v / nn))
  }
  return basis
}

const polygonDistance = (a: readonly Vec3[], b: readonly Vec3[]): number =>
  Math.sqrt(a.reduce((s, p, i) => s + (p.x - b[i].x) ** 2 + (p.y - b[i].y) ** 2 + (p.z - b[i].z) ** 2, 0))
const extentOf = (pts: readonly Vec3[]): number => {
  let d = 0
  for (const p of pts) for (const q of pts) {
    d = Math.max(d, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z))
  }
  return d
}

/**
 * Gauss–Newton back onto "the grip points sit at these targets", from a starting curve.
 *
 * What a DRAG calls: the held point has moved, so the curve must follow. Minimum-norm, so the rest
 * of the curve moves as little as the constraint allows, and PH holds by construction throughout
 * because the unknowns are the generator and the origin.
 */
export function correctToGrip(
  from: SpatialPHCurve,
  grip: readonly number[],
  targets: readonly Vec3[],
  iterations = 24,
): { curve: SpatialPHCurve; residual: number } {
  const m = from.A.length - 1
  let x = pack(from)
  let residual = Infinity
  for (let it = 0; it < iterations; it++) {
    const cur = unpack(x, m)
    const pts = controlPoints(cur)
    const r = grip.flatMap((g, k) => [
      pts[g].x - targets[k].x, pts[g].y - targets[k].y, pts[g].z - targets[k].z,
    ])
    residual = Math.max(...r.map(Math.abs))
    if (residual < 1e-12) break
    let d: number[]
    try { d = leastSquares(gripRows(cur, grip), r.map((v) => -v), 1e-12) } catch { break }
    let lam = 1
    let moved = false
    for (let bt = 0; bt < 20; bt++) {
      const trial = x.map((v, i) => v + lam * d[i])
      const p2 = controlPoints(unpack(trial, m))
      const r2 = grip.flatMap((g, k) => [
        p2[g].x - targets[k].x, p2[g].y - targets[k].y, p2[g].z - targets[k].z,
      ])
      if (Math.max(...r2.map(Math.abs)) < residual) { x = trial; moved = true; break }
      lam *= 0.5
    }
    if (!moved) break
  }
  return { curve: unpack(x, m), residual }
}

export interface FibreDimension {
  /** Free directions that MOVE the curve — the gauge already removed. */
  readonly dimension: number
  /** Kernel dimension including the gauge. */
  readonly nullity: number
  /** How far the gauge direction is from the kernel, relative. Must be ~0 or the rest is nonsense. */
  readonly gaugeResidual: number
}

/** Dimension of the fibre over `grip`, with the gauge verified to lie in the kernel first. */
export function fibreDimension(c: SpatialPHCurve, grip: readonly number[]): FibreDimension {
  const rows = gripRows(c, grip)
  const n = rows[0].length
  const K = kernelBasis(rows, n)
  const g = gaugeDirection(c)
  const gn = norm(g)
  // the gauge must be IN the kernel: its component off the kernel is the check
  let off = [...g]
  for (const u of K) {
    const d = dot(u, off)
    off = off.map((v, i) => v - d * u[i])
  }
  return {
    dimension: Math.max(0, K.length - 1),
    nullity: K.length,
    gaugeResidual: gn > 0 ? norm(off) / gn : 0,
  }
}

export interface FibreWalk {
  /** Samples along the fibre, in order, starting from the seed. */
  readonly samples: SpatialPHCurve[]
  /** Arc length, measured in the control polygon, at each sample. */
  readonly arcLength: number[]
  /** True if the walk returned to its starting polygon. */
  readonly closed: boolean
  /** Total length if closed; the length walked if not. */
  readonly length: number
  /** Why the walk stopped. */
  readonly stopped: 'closed' | 'extent' | 'steps' | 'stalled'
}

export interface FibreWalkOptions {
  /** Arc length per sample, as a fraction of the seed curve's extent. */
  readonly step?: number
  /** Stop when the curve's extent exceeds this multiple of the seed's. */
  readonly maxGrowth?: number
  readonly maxSteps?: number
  /** Walk against the null direction instead of along it. */
  readonly reverse?: boolean
}

/**
 * Walk the fibre from `seed`, holding `grip` fixed, and report where it goes.
 *
 * Predictor along the kernel direction that is not the gauge, corrector by minimum-norm least
 * squares back onto the held points. The step is adapted so each sample advances a fixed arc
 * length IN THE CONTROL POLYGON, so the slider reads the same on a closed fibre and an open one.
 *
 * ABOVE DIMENSION ONE THIS IS A PATH, NOT A TOUR. The walk carries its heading forward, so it
 * travels straight ahead through the family; on a torus that winds without closing, and it covers
 * a curve rather than the whole fibre. That is a usable slider and an honest one, provided the
 * caller reads `closed` only at dimension one — above it, a near-return is a near-return and not a
 * statement about the fibre's shape. `fibreDimension` first.
 */
export function walkFibre(
  seed: SpatialPHCurve,
  grip: readonly number[],
  options: FibreWalkOptions = {},
): FibreWalk {
  const step = options.step ?? 0.04
  const maxGrowth = options.maxGrowth ?? 3
  const maxSteps = options.maxSteps ?? 900
  const m = seed.A.length - 1
  const startPts = controlPoints(seed)
  const startExtent = extentOf(startPts)
  const ds = step * startExtent
  const targets = grip.map((i) => startPts[i])

  let x = pack(seed)
  const samples: SpatialPHCurve[] = [seed]
  const arcLength: number[] = [0]
  let total = 0
  let stopped: FibreWalk['stopped'] = 'steps'
  let h = ds
  let heading: number[] | null = null

  for (let s = 0; s < maxSteps; s++) {
    const cur = unpack(x, m)
    const rows = gripRows(cur, grip)
    const K = kernelBasis(rows, x.length)
    if (K.length < 2) { stopped = 'stalled'; break }
    // THE DIRECTION IS CARRIED, not re-chosen. On a one-dimensional fibre the kernel has a single
    // direction and any rule gives the same path. Above that it does not: picking "the first basis
    // vector" would follow whatever order the basis happened to come out in, and could jump when
    // that order changed mid-walk. Projecting the PREVIOUS direction onto the current kernel means
    // the slider goes straight ahead through the family — smooth, reproducible, and the natural
    // reading of "travel the space". On a torus it will wind without closing, which is fine: the
    // caller is told the dimension and only claims closure at dimension one.
    const g = gaugeDirection(cur)
    const gn = norm(g)
    const offGauge = (w: number[]): number[] => {
      if (gn === 0) return w
      const gu = g.map((v) => v / gn)
      const d = dot(gu, w)
      return w.map((v, i) => v - d * gu[i])
    }
    const project = (w: number[]): number[] => {
      let acc = new Array<number>(w.length).fill(0)
      for (const u of K) {
        const d = dot(u, w)
        acc = acc.map((v, i) => v + d * u[i])
      }
      return offGauge(acc)
    }
    let dir: number[] | null = null
    if (heading) {
      const t = project(heading)
      const nn = norm(t)
      if (nn > 1e-9) dir = t.map((v) => v / nn)
    }
    if (!dir) {
      for (const u of K) {
        const w = offGauge([...u])
        const nn = norm(w)
        if (nn > 1e-6) { dir = w.map((v) => v / nn); break }
      }
      if (dir && options.reverse) dir = dir.map((v) => -v)
    }
    if (!dir) { stopped = 'stalled'; break }
    heading = dir

    const before = controlPoints(cur)
    let next = x.map((v, i) => v + h * dir[i])
    // corrector: minimum-norm least squares back onto the held points
    for (let it = 0; it < 12; it++) {
      const st = unpack(next, m)
      const pts = controlPoints(st)
      const r = grip.flatMap((i, k) => [
        pts[i].x - targets[k].x, pts[i].y - targets[k].y, pts[i].z - targets[k].z,
      ])
      if (Math.max(...r.map(Math.abs)) < 1e-12 * Math.max(1, startExtent)) break
      let corr: number[]
      try { corr = leastSquares(gripRows(st, grip), r.map((v) => -v), 1e-12) } catch { break }
      next = next.map((v, i) => v + corr[i])
    }
    const after = controlPoints(unpack(next, m))
    const moved = polygonDistance(before, after)
    if (!Number.isFinite(moved) || moved === 0) { stopped = 'stalled'; break }
    // adapt so each sample advances about ds
    if (moved > 1.6 * ds || moved < 0.4 * ds) h *= Math.min(3, Math.max(0.33, ds / moved))

    x = next
    total += moved
    samples.push(unpack(x, m))
    arcLength.push(total)

    if (total > 3 * ds && polygonDistance(after, startPts) < 0.4 * ds) { stopped = 'closed'; break }
    if (extentOf(after) > maxGrowth * startExtent) { stopped = 'extent'; break }
  }

  return { samples, arcLength, closed: stopped === 'closed', length: total, stopped }
}

// ---------------------------------------------------------------------------
// THE CASCADE CHART — global coordinates, where they exist
// ---------------------------------------------------------------------------

/**
 * Coordinates on the family over the FIRST m+2 control points, at any spatial degree.
 *
 * The walk above is what to do when there are no coordinates. Here there are. Holding the first
 * m+2 control points fixes N₀…N_m, and the hodograph's Bernstein coefficients are built so that
 *
 *     N_j = c_j·polar(𝒜₀, 𝒜_j) + (terms in 𝒜₁…𝒜_{j−1}),      c_j = C(m,j)/C(2m,j)
 *
 * so each one is LINEAR in the next coefficient given the earlier ones. 𝒜₀ comes from a square
 * root that always succeeds, and every stage after it is a 3×4 solve with a one-dimensional
 * kernel ℝ·(𝒜₀i) — constant across stages. Nothing is ever solved, so:
 *
 *   · every t ∈ ℝᵐ is a curve with exactly those m+2 control points — the chart is GLOBAL;
 *   · every such curve is reachable — existence is guaranteed, for any points you can drag to;
 *   · the m coordinates are independent and commute, unlike m directions of a walk.
 *
 * This is the spatial analogue of the planar cascade, and the reason the two differ: there the
 * stage is multiplication by w₀ on ℂ, which is invertible and leaves nothing over, so the plane
 * gets a unique curve where space gets ℝᵐ. The one proviso is the same in both — N₀ ≠ 0, i.e. the
 * first two control points must not coincide.
 */
export interface FibreChart {
  /** How many coordinates: m, the generator degree. */
  readonly dimension: number
  /** t ∈ ℝᵐ ↦ the curve with the prescribed first m+2 control points. */
  readonly build: (t: readonly number[]) => SpatialPHCurve
  /**
   * The coordinates of a curve already in the family — the inverse of `build`.
   *
   * NEEDED BECAUSE t = 0 IS NOT WHERE YOU STARTED. Each stage takes the minimum-norm solution, so
   * the chart's origin is the minimum-norm member of the fibre, which can be a long way from the
   * curve that defined it: at degree 7 it sat 152 units away, off the screen entirely. A caller
   * centring a slider on the curve in front of the user must ask where that curve IS.
   *
   * The spinor is first rotated into the chart's gauge, since 𝒜 and 𝒜e^{iθ} are the same curve
   * with different coefficients and only one of them matches the chart's 𝒜₀.
   */
  readonly tOf: (c: SpatialPHCurve) => number[]
  /**
   * How far `build(t)` actually misses the held points, in world units.
   *
   * Zero for the cascade chart, which never solves anything. NOT zero for a retraction chart,
   * which corrects onto the grip iteratively and can be pushed past where that corrector still
   * converges — so a caller calibrating a dial must ask, or it will offer travel that silently
   * stops holding the points it says it holds.
   */
  readonly residual: (t: readonly number[]) => number
  /**
   * Period of each coordinate, when the coordinate is an ANGLE.
   *
   * Present only where the fibre's dial genuinely comes back to where it started, which is what
   * lets a caller wrap the slider and draw a control point's locus as a closed circle instead of
   * an arc over whatever range happened to fit on screen. Absent on a chart whose coordinates are
   * merely coordinates — and absence is a statement, not an omission.
   */
  readonly period?: readonly number[]
  /**
   * The number of samples this chart can actually DISTINGUISH along a dial, where that is finite.
   *
   * Only a quantised chart has one: the cubic tour holds a traced list and snaps to the nearest
   * member, so asking it for fewer samples than it holds throws resolution away, and asking for
   * more returns duplicates. A drawer should sweep at least this many and no fewer. A chart with a
   * formula has no such number and does not set it.
   */
  readonly naturalSteps?: number
}

/** The cascade chart is one FibreChart among others; the old name still reads in its own file. */
export type CascadeChart = FibreChart

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** Minimum-norm solution of polar(𝒜₀, X) = b — 3×4, rank 3, kernel ℝ·(𝒜₀i). */
function polarSolver(A0: Quat): ((b: Vec3) => Quat) | null {
  const basis: Quat[] = [
    { u: 1, v: 0, p: 0, q: 0 }, { u: 0, v: 1, p: 0, q: 0 },
    { u: 0, v: 0, p: 1, q: 0 }, { u: 0, v: 0, p: 0, q: 1 },
  ]
  const M: number[][] = [[], [], []]
  for (const e of basis) {
    const col = polarSandwich(A0, e)
    M[0].push(col.x); M[1].push(col.y); M[2].push(col.z)
  }
  const MMt = [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
    M[i].reduce((s, _, c) => s + M[i][c] * M[j][c], 0)))
  const fact = luFactor(MMt)
  if (!fact) return null
  return (b: Vec3): Quat => {
    const y = luSolve(fact, [b.x, b.y, b.z])
    const c = [0, 1, 2, 3].map((k) => M[0][k] * y[0] + M[1][k] * y[1] + M[2][k] * y[2])
    return { u: c[0], v: c[1], p: c[2], q: c[3] }
  }
}

/** The chart over the first m+2 control points, or null if the first leg has no length. */
export function cascadeChart(m: number, points: readonly Vec3[]): CascadeChart | null {
  if (points.length < m + 2) return null
  const n = 2 * m + 1
  const N = Array.from({ length: m + 1 }, (_, j) => vscale(vsub(points[j + 1], points[j]), n))
  const A0 = quatFromSandwich(N[0])
  if (!A0) return null
  const solve = polarSolver(A0)
  if (!solve) return null
  const k = qmul(A0, QUAT_I)

  const kk = qnormSq(k)

  /** Rotate a spinor into this chart's gauge, so 𝒜₀ matches and the coefficients are comparable. */
  const align = (c: SpatialPHCurve): Quat[] => {
    const a0 = c.A[0]
    const n0 = qnormSq(a0)
    if (n0 < 1e-30) return [...c.A]
    // g = 𝒜₀⁻¹·𝒜₀ᶜʰᵃʳᵗ, a unit quaternion in the i-plane when both share a sandwich
    const inv: Quat = { u: a0.u / n0, v: -a0.v / n0, p: -a0.p / n0, q: -a0.q / n0 }
    const g = qmul(inv, A0)
    return c.A.map((a) => qmul(a, g))
  }

  const chart: FibreChart = {
    dimension: m,
    // nothing here is solved, so the held points are hit exactly at every t
    residual: () => 0,
    tOf: (c: SpatialPHCurve): number[] => {
      const A = align(c)
      const out: number[] = []
      for (let j = 1; j <= m && j < A.length; j++) {
        let rest: Vec3 = { x: 0, y: 0, z: 0 }
        for (let a = 1; a <= j - 1; a++) {
          const b = j - a
          if (b < a || b > m) continue
          const w = (binom(m, a) * binom(m, b)) / binom(2 * m, j)
          rest = vadd(rest, a === b ? vscale(sandwich(A[a]), w) : vscale(polarSandwich(A[a], A[b]), w))
        }
        const cj = binom(m, j) / binom(2 * m, j)
        const base = solve(vscale(vsub(N[j], rest), 1 / cj))
        const d = qsub(A[j], base)
        out.push(kk > 0 ? (d.u * k.u + d.v * k.v + d.p * k.p + d.q * k.q) / kk : 0)
      }
      return out
    },
    build: (t: readonly number[]): SpatialPHCurve => {
      const A: Quat[] = [A0]
      for (let j = 1; j <= m; j++) {
        // strip the terms already determined, then invert polar(𝒜₀,·) on what is left
        let rest: Vec3 = { x: 0, y: 0, z: 0 }
        for (let a = 1; a <= j - 1; a++) {
          const b = j - a
          if (b < a || b > m) continue
          const w = (binom(m, a) * binom(m, b)) / binom(2 * m, j)
          rest = vadd(rest, a === b ? vscale(sandwich(A[a]), w) : vscale(polarSandwich(A[a], A[b]), w))
        }
        const cj = binom(m, j) / binom(2 * m, j)
        A.push(qadd(solve(vscale(vsub(N[j], rest), 1 / cj)), qscale(k, t[j - 1] ?? 0)))
      }
      return { A, p0: points[0] }
    },
  }
  return chart
}

// ---------------------------------------------------------------------------
// COORDINATES OVER ANY GRIP — normal coordinates at the curve in front of you
// ---------------------------------------------------------------------------

/**
 * m dials on the fibre over ANY grip, centred on `seed`.
 *
 * The cascade chart above is exact and global, but it exists only over the first m+2 control
 * points. Every other grip had nothing, and a figure with nothing falls back to walking ONE path —
 * which on a 2-dimensional fibre shows a curve inside a surface and calls it the family. Measured
 * at degree 5 over {0,1,4,5}: dimension 2, one slider.
 *
 * So: take the kernel of the held-point Jacobian at the seed, drop the gauge direction out of it,
 * and use what is left as an orthonormal frame. Coordinate t means "step t along that frame, then
 * project back onto the held points by minimum-norm Gauss–Newton". This is the standard retraction
 * chart on a level set, and it has the two properties the figure needs:
 *
 *   · t = 0 IS the curve on screen — unlike the cascade chart, whose origin is the minimum-norm
 *     member of the fibre and sat 152 units away at degree 7;
 *   · the coordinates COMMUTE, because t enters as one linear combination followed by one
 *     projection — not as a sequence of flows, which would depend on the order they were applied.
 *
 * WHAT IT IS NOT. These are chart coordinates, not angles. Where a fibre closes, its natural dial
 * has a PERIOD and the loci of the control points are circles — that is the quintic Hermite grip
 * {0,1,4,5}, where φ₀ and φ₂ come from inverting a sandwich in closed form and the family is a
 * torus. Nothing here recovers that period; a caller wanting true circles at that grip must use
 * phSpatialQuintic, and a caller using this one must draw the arc it actually reaches and claim
 * nothing more.
 *
 * The corrector can be pushed past where it converges, so `residual` is real here and a caller
 * calibrating a dial must consult it — otherwise the dial offers travel that stops holding the
 * points it says it holds.
 *
 * AND EVERY SAMPLE MUST BE BUILT FROM THE BASE. Sampling a dial by MARCHING — correct, step,
 * correct — is 15–35% cheaper and draws a different curve: the minimum-norm projection depends on
 * where it starts, so a marched chain and `build` land on different points of the same fibre.
 * Measured at degree 5, they diverged by 0.357, and the drawn path then missed the control point
 * it was supposed to pass through by two hundredths. The saving is not worth a path the figure
 * cannot stand on; short arcs make the corrector converge quickly from the base anyway.
 */
export function retractionChart(
  seed: SpatialPHCurve,
  grip: readonly number[],
  options: { iterations?: number } = {},
): FibreChart | null {
  const iterations = options.iterations ?? 16
  const m = seed.A.length - 1
  const startPts = controlPoints(seed)
  const scale = Math.max(1e-9, extentOf(startPts))
  const targets = grip.map((i) => startPts[i])
  const x0 = pack(seed)
  const K = kernelBasis(gripRows(seed, grip), x0.length)
  if (K.length === 0) return null

  // the gauge is in the kernel and moves the spinor without moving the curve — project it out,
  // then re-orthonormalise, so each remaining direction is a real motion of the polygon
  const g = gaugeDirection(seed)
  const gn = norm(g)
  const gu = gn > 0 ? g.map((v) => v / gn) : null
  const dirs: number[][] = []
  for (const u of K) {
    let w = [...u]
    if (gu) {
      const d = dot(gu, w)
      w = w.map((v, i) => v - d * gu[i])
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const b of dirs) {
        const d = dot(b, w)
        w = w.map((v, i) => v - d * b[i])
      }
    }
    const nn = norm(w)
    if (nn > 1e-7) dirs.push(w.map((v) => v / nn))
  }
  if (dirs.length === 0) return null

  const predict = (t: readonly number[]): number[] => {
    let x = [...x0]
    for (let k = 0; k < dirs.length; k++) {
      const tk = t[k] ?? 0
      if (tk !== 0) x = x.map((v, i) => v + tk * dirs[k][i])
    }
    return x
  }

  /** Minimum-norm Gauss–Newton back onto the held points, from wherever you start. */
  const correct = (start: readonly number[]): { x: number[]; residual: number } => {
    let x = [...start]
    let worst = Infinity
    for (let it = 0; it < iterations; it++) {
      const st = unpack(x, m)
      const pts = controlPoints(st)
      const r = grip.flatMap((i, k) => [
        pts[i].x - targets[k].x, pts[i].y - targets[k].y, pts[i].z - targets[k].z,
      ])
      worst = Math.max(...r.map(Math.abs))
      if (worst < 1e-12 * scale) break
      let corr: number[]
      try { corr = leastSquares(gripRows(st, grip), r.map((v) => -v), 1e-12) } catch { break }
      if (corr.some((v) => !Number.isFinite(v))) break
      x = x.map((v, i) => v + corr[i])
    }
    return { x, residual: worst }
  }

  const solve = (t: readonly number[]): { x: number[]; residual: number } => correct(predict(t))

  return {
    dimension: dirs.length,
    build: (t) => unpack(solve(t).x, m),
    residual: (t) => solve(t).residual,
    // a LOCAL inverse: the frame is the seed's, so this is exact near t = 0 and drifts with the
    // fibre's curvature further out. The figure only ever asks for the seed itself, where it is 0.
    tOf: (c) => {
      const d = pack(c).map((v, i) => v - x0[i])
      return dirs.map((u) => dot(u, d))
    },
  }
}

// ---------------------------------------------------------------------------
// WHICH GRIPS LEAVE A BOUNDED FAMILY
// ---------------------------------------------------------------------------

/**
 * The grips whose fibre is COMPACT — hold both ends, and one point out of each consecutive pair.
 *
 *     hold P₀ and P_n, plus exactly one of (P₁,P₂), one of (P₃,P₄), … , one of (P_{n−2},P_{n−1})
 *
 * There are 2^m of them, which is also the largest number of interpolants the PLANAR problem ever
 * has at the same degree — and that is not a coincidence but the measured correlation. Sweeping
 * every grip at degrees 3, 5 and 7 (4 + 15 + 56 = 75 grips, exhaustive), the planar count reaches
 * its maximum 2^m on exactly these grips, and on exactly these grips the spatial fibre stays
 * bounded. Every other grip loses planar branches AND has a spatial family that runs to infinity:
 *
 *     degree 3   {0,1,3} {0,2,3}                    count 2 of 2, fibre CLOSES
 *     degree 5   {0,1,3,5} {0,1,4,5} {0,2,3,5} …    count 4 of 4, bounded (and {0,1,4,5} is the
 *                                                   quintic Hermite torus, in closed form)
 *     degree 7   the eight {0,·,·,·,7}              count 8 of 8, bounded over 8000 walk samples
 *
 * The dimension is m either way — it is 4m+6−3(m+2) and cannot see WHICH points are held. What the
 * grip decides is the shape, and this is the rule for it.
 *
 * HOW FAR THIS IS PINNED: exhaustively at m = 1, 2, 3, by walking. Running away is proved (a path
 * left every bound; the one grip that looked bounded at 400 steps, {0,2,3,4,7}, blew past ×40 when
 * given 4000). Staying bounded is strong evidence rather than proof, except at {0,1,4,5} where the
 * closed form settles it. Beyond m = 3 this is a conjecture.
 */
export function maximalGrips(m: number): number[][] {
  const n = 2 * m + 1
  let out: number[][] = [[0]]
  for (let k = 0; k < m; k++) {
    const lo = 2 * k + 1
    out = out.flatMap((g) => [[...g, lo], [...g, lo + 1]])
  }
  return out.map((g) => [...g, n])
}

/** Is this grip one of the 2^m that leave a bounded family? */
export function isMaximalGrip(m: number, grip: readonly number[]): boolean {
  const s = [...grip].sort((a, b) => a - b)
  const n = 2 * m + 1
  if (s.length !== m + 2 || s[0] !== 0 || s[s.length - 1] !== n) return false
  for (let k = 0; k < m; k++) {
    if (s[k + 1] !== 2 * k + 1 && s[k + 1] !== 2 * k + 2) return false
  }
  return true
}

/**
 * The quintic Hermite grip {P₀,P₁,P₄,P₅}: two dials that are ANGLES, in closed form.
 *
 * This is the one grip in the figure whose fibre is known exactly rather than charted. Holding
 * those four control points is prescribing C¹ Hermite data, since
 *
 *     dᵢ = 5(P₁ − P₀),      d_f = 5(P₅ − P₄)
 *
 * and inverting a sandwich is a square root whose solution set is a CIRCLE: 𝒜₀ = base₀·e^{iφ₀} and
 * 𝒜₂ = base₂·e^{iφ₂}. Closure then fixes 𝒜₁ through a second square root whose own circle is the
 * global gauge, so the fibre is exactly the torus (φ₀, φ₂) — [FGMS08] (49)–(55), and nothing
 * iterates. The retraction chart would give the same two dials over this grip, but as chart
 * coordinates over a bisected range; here they have a period, so the sliders wrap and the loci of
 * the free control points close.
 *
 * Returns null on degenerate data (a vanishing end derivative, or a vanishing closure vector), and
 * only ever for {0,1,4,5} at degree 5 — every other grip must use `retractionChart`.
 */
export function quinticHermiteChart(points: readonly Vec3[]): FibreChart | null {
  if (points.length !== 6) return null
  const data: SpatialHermiteData = {
    pi: points[0],
    pf: points[5],
    di: vscale(vsub(points[1], points[0]), 5),
    df: vscale(vsub(points[5], points[4]), 5),
  }
  const refs = gaugeRefsFor(data)
  if (!refs) return null
  const at = (t: readonly number[]): SpatialPHCurve | null => {
    const phi0 = t[0] ?? 0
    const phi2 = t[1] ?? 0
    const q = interpolateSpatialQuintic(data, (phi0 + phi2) / 2, phi2 - phi0, refs)
    return q ? { A: [q.A0, q.A1, q.A2], p0: q.p0 } : null
  }
  const fallback = at([0, 0])
  if (!fallback) return null
  const TAU = 2 * Math.PI
  const build = (t: readonly number[]): SpatialPHCurve => at(t) ?? fallback
  return {
    dimension: 2,
    period: [TAU, TAU],
    build,
    // exact by construction: the grip is the data, so every (φ₀,φ₂) holds it
    residual: () => 0,
    tOf: (c) => {
      if (c.A.length !== 3) return [0, 0]
      const { alpha, beta } = anglesOf({ A0: c.A[0], A1: c.A[1], A2: c.A[2], p0: c.p0 }, refs)
      return [alpha - beta / 2, alpha + beta / 2]
    },
  }
}

/** The grip that chart is for: both ends and both tangent legs, at degree 5 only. */
export const isQuinticHermiteGrip = (m: number, grip: readonly number[]): boolean =>
  m === 2 && [...grip].sort((a, b) => a - b).join(',') === '0,1,4,5'

/**
 * The two cubic grips whose fibre is a closed ELLIPSE — toured, so the dial comes home.
 *
 * At degree 3 the maximal grips are {P₀,P₁,P₃} and {P₀,P₂,P₃}: both ends held, one point out of
 * the single pair (P₁,P₂). Their fibre is an ellipse, proved in phSpatialCubic and drawn on the
 * cubic slide, and phSpatialCubic.spatialCubicFiberAt already traces it all the way round.
 *
 * So the dial here is POSITION AROUND THE LOOP, given a period of 2π so the slider wraps and a
 * control point's locus is drawn as the whole ellipse rather than the arc a chart would reach.
 *
 * IT IS EXACT AND CONTINUOUS. θ goes straight into the closed form of the ellipse
 * (`spatialCubicFiberAtAngleFor`), so `build` returns the fibre member AT that angle rather than
 * the nearest one on a traced list — no quantisation, no ceiling on how finely the locus can be
 * drawn, and `residual` is 0 because the formula solves the reduction outright.
 *
 * `tOf` INVERTS IT IN CLOSED FORM TOO, which matters because `build` is now continuous: a
 * quantised inverse would make the curve jump the moment the dial was read. The free control
 * point is a + b·cos θ + c·sin θ, so three evaluations give a, b and c, and reading a curve's
 * angle is one 2×2 solve. Control points are gauge-invariant, so this needs no spinor
 * normalisation — which is why the inverse is taken through the point rather than through z,
 * whose (z₂,z₃) part rotates by 2φ under 𝒜 → 𝒜e^{iφ}.
 */
export function cubicTourChart(points: readonly Vec3[], grip: readonly number[]): FibreChart | null {
  if (points.length !== 4) return null
  const s = [...grip].sort((a, b) => a - b)
  if (s.length !== 3 || s[0] !== 0 || s[2] !== 3) return null
  const which: InteriorHandle | null = s[1] === 1 ? 1 : s[1] === 2 ? 2 : null
  if (which === null) return null

  const TAU = 2 * Math.PI
  const at = (theta: number): FiberPoint | null =>
    spatialCubicFiberAtAngleFor(points[0], points[3], points[s[1]], which, theta)
  if (!at(0)) return null

  const build = (t: readonly number[]): SpatialPHCurve => {
    const f = at(t[0] ?? 0)!
    return { A: [f.curve.A0, f.curve.A1], p0: f.curve.p0 }
  }

  // a, b, c of the free point's ellipse, from three angles.
  const e0 = at(0)!.derived, eq = at(Math.PI / 2)!.derived, ep = at(Math.PI)!.derived
  const a = vscale(vadd(e0, ep), 0.5)
  const b = vscale(vsub(e0, ep), 0.5)
  const c = vsub(eq, a)
  const bb = vdot(b, b), bc = vdot(b, c), cc = vdot(c, c)
  const det = bb * cc - bc * bc
  const free = which === 1 ? 2 : 1

  return {
    dimension: 1,
    period: [TAU],
    build,
    residual: () => 0,
    tOf: (curve) => {
      const q = vsub(controlPoints(curve)[free], a)
      // A flattened ellipse (b ∥ c) has no unique angle; say so by searching instead of
      // dividing by a determinant that is telling us the inverse does not exist.
      if (!(Math.abs(det) > 1e-24 * (bb * cc + 1))) {
        let best = 0, bestD = Infinity
        for (let i = 0; i < 720; i++) {
          const d = vnorm(vsub(at((TAU * i) / 720)!.derived, controlPoints(curve)[free]))
          if (d < bestD) { bestD = d; best = i }
        }
        return [(TAU * best) / 720]
      }
      const qb = vdot(q, b), qc = vdot(q, c)
      return [Math.atan2((bb * qc - bc * qb) / det, (qb * cc - qc * bc) / det)]
    },
  }
}

/** The grips that chart is for: both ends and one interior point, at degree 3 only. */
export const isCubicTourGrip = (m: number, grip: readonly number[]): boolean => {
  if (m !== 1) return false
  const s = [...grip].sort((a, b) => a - b)
  return s.length === 3 && s[0] === 0 && s[2] === 3 && (s[1] === 1 || s[1] === 2)
}

// ---------------------------------------------------------------------------
// ARE TWO MEMBERS OF A FIBRE CONNECTED?
// ---------------------------------------------------------------------------

export interface FibreBridge {
  /** True if the walk arrived, holding the grip the whole way and never jumping. */
  readonly connected: boolean
  /** Control-polygon distance from the last point of the path to the target. */
  readonly arrived: number
  /** Distance between the two endpoints — what the path had to cover. */
  readonly span: number
  /** Largest and typical step between consecutive members: a JUMP is a broken path. */
  readonly maxGap: number
  readonly medianGap: number
  /** Worst violation of the grip anywhere on the path. */
  readonly held: number
  readonly path: SpatialPHCurve[]
}

/**
 * Try to join two members of the same fibre by a path that never leaves it.
 *
 * The question is the one the plane raises. A planar interpolation problem has a COUNT — eight
 * septics through a given grip — and each of those eight is also a spatial PH curve holding the
 * same control points, so all eight lie in ONE spatial fibre. Eight separate answers there too, or
 * eight points of a single connected family? Dimension cannot say; only a path can.
 *
 * WHY THIS IS NOT STEEPEST DESCENT, which was tried first and cannot even start. At a PLANAR
 * member the fibre's tangent space is entirely OUT of the plane — measured, the dials move the
 * curve 25–45× further in z than in the plane, and the in-plane part is second order. The
 * direction toward another planar solution is entirely IN the plane. So the gradient's projection
 * onto the fibre vanishes: every planar member is a critical point of distance-to-any-other, and
 * descent stalls at step zero. That is not a solver weakness, it is the same fact that makes the
 * planar problem have a count at all — there is no in-plane direction that preserves the grip.
 *
 * So: interpolate in the PARAMETERS and project each intermediate back onto the held points. The
 * straight line leaves the fibre immediately and the corrector pulls it back, which is a homotopy
 * rather than a descent and has no reason to care that the endpoints are critical points.
 *
 * WHAT MAKES A SUCCESS A PROOF. The path is only a path if it is continuous, so the step between
 * consecutive members is reported alongside the typical step: a corrector that jumped to a distant
 * sheet shows up as one gap far larger than the rest, and `connected` requires that it did not.
 * The grip is checked at every member too. A failure means this construction did not find a path,
 * not that none exists.
 *
 * The target is gauge-aligned first, since 𝒜 and 𝒜e^{iθ} are the same curve and interpolating
 * toward the wrong representative would sweep the whole gauge circle for nothing.
 */
export function bridgeInFibre(
  from: SpatialPHCurve,
  to: SpatialPHCurve,
  grip: readonly number[],
  options: { steps?: number; jumpFactor?: number; detour?: number } = {},
): FibreBridge {
  const steps = options.steps ?? 400
  const jumpFactor = options.jumpFactor ?? 8
  const detour = options.detour ?? 0
  const m = from.A.length - 1
  const startPts = controlPoints(from)
  const scale = Math.max(1e-9, extentOf(startPts))
  const targets = grip.map((i) => startPts[i])

  // gauge-align the target: rotate 𝓑 ↦ 𝓑e^{iθ} to sit closest to 𝓐
  const qdot = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q
  let cs = 0
  let sn = 0
  for (let k = 0; k <= m && k < to.A.length; k++) {
    cs += qdot(to.A[k], from.A[k])
    sn += qdot(qmul(to.A[k], QUAT_I), from.A[k])
  }
  const theta = Math.atan2(sn, cs)
  const rot: Quat = { u: Math.cos(theta), v: Math.sin(theta), p: 0, q: 0 }
  const aligned: SpatialPHCurve = { A: to.A.map((a) => qmul(a, rot)), p0: to.p0 }

  const correct = (v: readonly number[]): number[] => {
    let x = [...v]
    for (let it = 0; it < 20; it++) {
      const st = unpack(x, m)
      const pts = controlPoints(st)
      const r = grip.flatMap((i, k) => [
        pts[i].x - targets[k].x, pts[i].y - targets[k].y, pts[i].z - targets[k].z,
      ])
      if (Math.max(...r.map(Math.abs)) < 1e-13 * scale) break
      let corr: number[]
      try { corr = leastSquares(gripRows(st, grip), r.map((v2) => -v2), 1e-12) } catch { break }
      if (corr.some((c) => !Number.isFinite(c))) break
      x = x.map((c, i) => c + corr[i])
    }
    return x
  }

  const a = pack(from)
  const b = pack(aligned)

  /**
   * THE DETOUR, and without it a straight homotopy between two planar members cannot work.
   *
   * Both endpoints have 𝒜 in the planar subalgebra (u = q = 0), so every point of the straight
   * line does too. The residual of a planar curve on planar targets has no z component, so the
   * minimum-norm correction has no u or q component either: the whole homotopy stays IN the plane.
   * And in the plane the problem is zero-dimensional with isolated roots, so Newton snaps to one
   * of them and the "path" is a sequence of jumps — which is what the gap test reports.
   *
   * So the homotopy is bowed OUT of the plane and back: a half-sine along a fibre direction at the
   * start, zero at both ends so the endpoints are untouched. Leaving the plane is not a trick to
   * make the method work, it is the content of the question — the plane's answers are separated by
   * the plane, and the detour asks whether space joins them.
   */
  let bow: number[] | null = null
  if (detour !== 0) {
    const K = kernelBasis(gripRows(from, grip), a.length)
    const gd = gaugeDirection(from)
    const gn2 = norm(gd)
    for (const u of K) {
      let w = [...u]
      if (gn2 > 0) {
        const gu2 = gd.map((v) => v / gn2)
        const d = dot(gu2, w)
        w = w.map((v, i) => v - d * gu2[i])
      }
      const nn = norm(w)
      if (nn > 1e-7) { bow = w.map((v) => (v / nn) * detour * scale); break }
    }
  }

  const path: SpatialPHCurve[] = []
  const gaps: number[] = []
  let held = 0
  let prev: Vec3[] | null = null
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    const bulge = bow ? Math.sin(Math.PI * s) : 0
    const x = correct(a.map((v, j) => (1 - s) * v + s * b[j] + (bow ? bulge * bow[j] : 0)))
    const st = unpack(x, m)
    const pts = controlPoints(st)
    grip.forEach((idx, k) => {
      held = Math.max(held, vnorm(vsub(pts[idx], targets[k])))
    })
    if (prev) gaps.push(polygonDistance(prev, pts))
    prev = pts
    path.push(st)
  }

  const sorted = [...gaps].sort((x, y) => x - y)
  const medianGap = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const maxGap = sorted.length ? sorted[sorted.length - 1] : 0
  const goal = controlPoints(to)
  const arrived = prev ? polygonDistance(prev, goal) : Infinity
  const span = polygonDistance(startPts, goal)
  const connected = arrived < 1e-6 * scale && held < 1e-7 * scale &&
    (medianGap === 0 || maxGap <= jumpFactor * medianGap)
  return { connected, arrived, span, maxGap, medianGap, held, path }
}

// ---------------------------------------------------------------------------
// (kept below: the descent attempt, and why it cannot start)
// ---------------------------------------------------------------------------

export interface FibreConnection {
  /** True if a path inside the fibre got from one to the other. */
  readonly reached: boolean
  /** Control-polygon distance at the start, and at the end of the attempt. */
  readonly start: number
  readonly distance: number
  readonly steps: number
  /** Worst violation of the grip anywhere along the path — the path stayed IN the fibre, or it did not. */
  readonly held: number
  readonly path: SpatialPHCurve[]
}

/**
 * Try to walk from one member of a fibre to another WITHOUT leaving it.
 *
 * The question this answers is the one the plane raises. A planar interpolation problem has a
 * COUNT — eight septics through a given grip, say — and each of those eight is also a spatial PH
 * curve holding the same control points, so all eight live in one spatial fibre. Are they eight
 * separate answers there too, or eight points of a single connected family? Dimension cannot say;
 * only a path can.
 *
 * Projected descent, and each part is chosen so that a success MEANS something:
 *
 *   · the objective is CONTROL-POLYGON distance, not spinor distance, because 𝒜 and 𝒜e^{iθ} are
 *     the same curve and a spinor objective would chase the gauge;
 *   · the step is the negative gradient PROJECTED ONTO THE FIBRE's tangent space, so the walk
 *     cannot leave by cheating downhill through curves that break the grip;
 *   · every step is corrected back onto the held points and the worst violation over the whole
 *     path is reported, so "it arrived" is only claimed for a path that stayed inside;
 *   · the step is backtracked, and the walk stops when no admissible step reduces the distance —
 *     a local minimum, reported honestly as not-reached rather than retried until it looks better.
 *
 * FAILURE IS NOT PROOF OF DISCONNECTION. Descent finds local minima, so a `reached: false` says
 * this path did not get there, not that no path exists. Success, on the other hand, is a
 * constructive proof: the path is returned.
 */
export function connectInFibre(
  from: SpatialPHCurve,
  to: SpatialPHCurve,
  grip: readonly number[],
  options: { maxSteps?: number; step?: number; tolerance?: number } = {},
): FibreConnection {
  const maxSteps = options.maxSteps ?? 4000
  const m = from.A.length - 1
  const goal = controlPoints(to)
  const startPts = controlPoints(from)
  const scale = Math.max(1e-9, extentOf(startPts))
  const tolerance = options.tolerance ?? 1e-7 * scale
  const targets = grip.map((i) => startPts[i])

  const correct = (v: readonly number[]): number[] => {
    let x = [...v]
    for (let it = 0; it < 12; it++) {
      const st = unpack(x, m)
      const pts = controlPoints(st)
      const r = grip.flatMap((i, k) => [
        pts[i].x - targets[k].x, pts[i].y - targets[k].y, pts[i].z - targets[k].z,
      ])
      if (Math.max(...r.map(Math.abs)) < 1e-13 * scale) break
      let corr: number[]
      try { corr = leastSquares(gripRows(st, grip), r.map((v2) => -v2), 1e-12) } catch { break }
      if (corr.some((c) => !Number.isFinite(c))) break
      x = x.map((c, i) => c + corr[i])
    }
    return x
  }

  const gripError = (x: readonly number[]): number => {
    const pts = controlPoints(unpack(x, m))
    let e = 0
    grip.forEach((i, k) => { e = Math.max(e, polygonDistance([pts[i]], [targets[k]])) })
    return e
  }

  let x = correct(pack(from))
  const start = polygonDistance(controlPoints(unpack(x, m)), goal)
  let best = start
  let held = gripError(x)
  const path: SpatialPHCurve[] = [unpack(x, m)]
  let h = options.step ?? 0.05 * scale
  let steps = 0

  for (; steps < maxSteps && best > tolerance; steps++) {
    const st = unpack(x, m)
    const pts = controlPoints(st)
    const J = spatialControlPointJacobian(st)
    // gradient of ½‖p − goal‖² in the parameters, then projected onto the fibre
    const r = pts.flatMap((p, i) => [p.x - goal[i].x, p.y - goal[i].y, p.z - goal[i].z])
    const g = new Array<number>(J[0].length).fill(0)
    for (let row = 0; row < J.length; row++) {
      for (let c = 0; c < g.length; c++) g[c] += J[row][c] * r[row]
    }
    const K = kernelBasis(gripRows(st, grip), g.length)
    const gu = gaugeDirection(st)
    const gn = norm(gu)
    let dir = new Array<number>(g.length).fill(0)
    for (const u of K) {
      const d = dot(u, g)
      dir = dir.map((v, i) => v - d * u[i])
    }
    if (gn > 0) {                       // the gauge moves nothing, so spending the step on it wastes it
      const un = gu.map((v) => v / gn)
      const d = dot(un, dir)
      dir = dir.map((v, i) => v - d * un[i])
    }
    const dn = norm(dir)
    if (dn < 1e-14) break
    dir = dir.map((v) => v / dn)

    let moved = false
    for (let trial = 0; trial < 12; trial++) {
      const cand = correct(x.map((v, i) => v + h * dir[i]))
      const d = polygonDistance(controlPoints(unpack(cand, m)), goal)
      if (d < best) {
        x = cand
        best = d
        held = Math.max(held, gripError(x))
        path.push(unpack(x, m))
        moved = true
        h *= 1.3
        break
      }
      h *= 0.5
    }
    if (!moved) break                   // no admissible step goes downhill: a local minimum
  }

  return { reached: best <= tolerance, start, distance: best, steps, held, path }
}
