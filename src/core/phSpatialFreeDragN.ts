// ============================================================================
// FREE-MODE drag for a spatial PH curve of ANY degree — grab any control point.
//
// The degree-general version of phSpatialFreeDrag (which is cubic-only, m = 1). A
// generator A(t) of degree m gives a hodograph r′ = A i A* of degree 2m and a curve
// of degree 2m+1, so:
//
//     unknowns   4(m+1) generator coefficients + 3 origin
//     gauge      A ↦ A(cos θ + i sin θ) costs ONE, continuously
//     DOF        4(m+1) + 3 − 1
//
//   m = 1  cubic     8 + 3 − 1 = 10   against  4 points × 3 =  12 residuals
//   m = 2  quintic  12 + 3 − 1 = 14   against  6 points × 3 =  18 residuals
//
// PH holds BY CONSTRUCTION: the unknowns are the generator and the origin, so r′ is a
// sandwich whatever the solve does and there is nothing to enforce.
//
// THE JACOBIAN IS FREE, because the derivative of the sandwich IS the polarization.
// Writing the hodograph in Bernstein form with the square weights
//
//     dⱼ = Σ_{a+b=j} C(m,a)C(m,b)/C(2m,j) · A_a i A_b*
//
// the derivative in A_k of the whole coefficient collapses to ONE polarization,
//
//     ∂dⱼ/∂A_k · δ  =  W[j][k] · polarSandwich(δ, A_{j−k})
//
// because the ordered pairs (k, j−k) and (j−k, k) carry the SAME weight — the square
// weights are symmetric — and their two derivative terms are exactly the two halves
// of the polarization. Legs are dⱼ/(2m+1), and each control point is the origin plus
// the legs before it.
//
// THE GAUGE makes the Jacobian permanently rank-deficient by one: there is always a
// direction that changes the unknowns and moves nothing. The ridge in `leastSquares`
// absorbs it, and that is asserted in the tests rather than assumed, because a
// silently singular solve works until it doesn't.
//
// Cross-checked against the cubic module on cubic inputs, so the two cannot drift
// apart while both exist. (Making phSpatialFreeDrag a thin adapter over this is the
// obvious cleanup; it is deliberately NOT done in the same change that introduces
// this, because slide 6 rides on it.)
// ============================================================================
import { leastSquares, type Matrix } from './linalg'
import { type Quat, type Vec3, polarSandwich, qadd, qscale, sandwich, vscale } from './quaternion'

const BASIS: Quat[] = [
  { u: 1, v: 0, p: 0, q: 0 },
  { u: 0, v: 1, p: 0, q: 0 },
  { u: 0, v: 0, p: 1, q: 0 },
  { u: 0, v: 0, p: 0, q: 1 },
]

/** A spatial PH curve as its generator coefficients plus a starting point. */
export interface SpatialPHCurve {
  /** A(t) in the Bernstein basis of degree m = A.length − 1. */
  readonly A: readonly Quat[]
  readonly p0: Vec3
}

const binomial = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

/** W[j][a] = C(m,a)C(m,j−a)/C(2m,j) — the Bernstein weights of the square. */
export function squareWeights(m: number): number[][] {
  const out: number[][] = []
  for (let j = 0; j <= 2 * m; j++) {
    const row = new Array(m + 1).fill(0)
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) {
      row[a] = (binomial(m, a) * binomial(m, j - a)) / binomial(2 * m, j)
    }
    out.push(row)
  }
  return out
}

export function generatorAt(c: SpatialPHCurve, t: number): Quat {
  const m = c.A.length - 1
  let acc: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = 0; k <= m; k++) {
    const b = binomial(m, k) * (1 - t) ** (m - k) * t ** k
    acc = qadd(acc, qscale(c.A[k], b))
  }
  return acc
}

/** The 2m+1 Bernstein coefficients of r′ = A i A*. */
export function hodographCoefficients(c: SpatialPHCurve): Vec3[] {
  const m = c.A.length - 1
  const W = squareWeights(m)
  const out: Vec3[] = []
  for (let j = 0; j <= 2 * m; j++) {
    let acc: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) {
      const b = j - a
      if (a > b) continue
      const w = W[j][a]
      if (w === 0) continue
      acc = vadd3(acc, vscale(a === b ? sandwich(c.A[a]) : polarSandwich(c.A[a], c.A[b]), w))
    }
    out.push(acc)
  }
  return out
}

const vadd3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })

export function controlPoints(c: SpatialPHCurve): Vec3[] {
  const d = hodographCoefficients(c)
  const n = d.length // = 2m+1, the curve degree
  const pts: Vec3[] = [c.p0]
  for (let k = 0; k < n; k++) pts.push(vadd3(pts[k], vscale(d[k], 1 / n)))
  return pts
}

const toVector = (c: SpatialPHCurve): number[] => [
  ...c.A.flatMap((a) => [a.u, a.v, a.p, a.q]),
  c.p0.x, c.p0.y, c.p0.z,
]

const fromVector = (x: readonly number[], m: number): SpatialPHCurve => {
  const A: Quat[] = []
  for (let k = 0; k <= m; k++) {
    A.push({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] })
  }
  const o = 4 * (m + 1)
  return { A, p0: { x: x[o], y: x[o + 1], z: x[o + 2] } }
}

/**
 * ∂(control points)/∂(generator, origin) — exact. Rows are the 3(2m+2) coordinates,
 * columns [A₀.u..A_m.q, origin.x..origin.z].
 */
export function spatialControlPointJacobian(c: SpatialPHCurve): Matrix {
  const m = c.A.length - 1
  const degree = 2 * m + 1
  const nCols = 4 * (m + 1) + 3
  const W = squareWeights(m)

  // Per-leg derivative in each generator column, as 3-vectors.
  const dLeg: Vec3[][] = []
  for (let j = 0; j < degree; j++) {
    const row: Vec3[] = []
    for (let k = 0; k <= m; k++) {
      for (const delta of BASIS) {
        const other = j - k
        if (other < 0 || other > m || W[j][k] === 0) {
          row.push({ x: 0, y: 0, z: 0 })
        } else {
          row.push(vscale(polarSandwich(delta, c.A[other]), W[j][k] / degree))
        }
      }
    }
    dLeg.push(row)
  }

  const nGen = 4 * (m + 1)
  const acc: Vec3[] = Array.from({ length: nGen }, () => ({ x: 0, y: 0, z: 0 }))
  const J: Matrix = []
  for (let i = 0; i <= degree; i++) {
    if (i > 0) for (let k = 0; k < nGen; k++) acc[k] = vadd3(acc[k], dLeg[i - 1][k])
    for (const [axis, oi] of [['x', 0], ['y', 1], ['z', 2]] as [keyof Vec3, number][]) {
      const line = acc.map((v) => v[axis] as number)
      line.push(oi === 0 ? 1 : 0, oi === 1 ? 1 : 0, oi === 2 ? 1 : 0)
      J.push(line)
    }
  }
  if (J[0].length !== nCols) throw new Error('jacobian column count mismatch')
  return J
}

export interface SpatialFreeDragOptions {
  readonly dragWeight?: number
  readonly holdWeight?: number
  readonly iterations?: number
  /** Ridge on the normal equations — also what absorbs the gauge's null direction. */
  readonly regularization?: number
  /**
   * Control points to HOLD, beyond the ordinary hold weight — the free-mode editor's "the ends
   * stay where they are unless you grab one". These get `pinWeight` instead of `holdWeight`, so
   * the pin is a heavy least-squares term rather than a hard constraint: cheap, and it keeps the
   * solve a single unconstrained least squares. The dragged index always wins over a pin, so
   * grabbing a pinned endpoint moves it. The planar twin is phFreeDrag's option of the same name.
   *
   * The drift is measured rather than assumed (phSpatialFreeDragPinned.test.ts); if a caller ever
   * needs it exactly zero, the honest fix is a constrained solve — projecting onto the nullspace
   * of the pin rows — and not a bigger weight.
   */
  readonly pinned?: readonly number[]
  /** Weight on a pinned point (default 4000 — ~66× the drag weight). */
  readonly pinWeight?: number
}

export interface SpatialFreeDragResult {
  readonly state: SpatialPHCurve
  readonly controlPoints: Vec3[]
  readonly trackingError: number
  readonly disturbance: number
  readonly iterations: number
}

/**
 * One free-mode drag step: move control point `index` toward `target`, keeping the
 * others as close as possible to where they are. Warm-started, so a drag is a
 * sequence of these — which is what makes the motion a path, and path-dependent.
 */
export function dragSpatialFree(
  from: SpatialPHCurve,
  index: number,
  target: Vec3,
  options: SpatialFreeDragOptions = {},
): SpatialFreeDragResult {
  const dragWeight = options.dragWeight ?? 60
  const holdWeight = options.holdWeight ?? 1
  const iterations = options.iterations ?? 3
  const reg = options.regularization ?? 1e-8
  const pinWeight = options.pinWeight ?? 4000
  const pinned = new Set(options.pinned ?? [])
  const m = from.A.length - 1

  const before = controlPoints(from)
  const targets = before.map((p, j) => (j === index ? target : p))
  const weights = before.map((_, j) =>
    j === index ? dragWeight : pinned.has(j) ? pinWeight : holdWeight)

  let x = toVector(from)
  let used = 0
  for (let it = 0; it < iterations; it++) {
    used = it + 1
    const s = fromVector(x, m)
    const cps = controlPoints(s)
    const J = spatialControlPointJacobian(s)

    const A: Matrix = []
    const b: number[] = []
    for (let j = 0; j < cps.length; j++) {
      const sw = Math.sqrt(weights[j])
      A.push(
        J[3 * j].map((v) => v * sw),
        J[3 * j + 1].map((v) => v * sw),
        J[3 * j + 2].map((v) => v * sw),
      )
      b.push(
        -(cps[j].x - targets[j].x) * sw,
        -(cps[j].y - targets[j].y) * sw,
        -(cps[j].z - targets[j].z) * sw,
      )
    }
    const step = leastSquares(A, b, reg)
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
    if (Math.max(...step.map(Math.abs)) < 1e-12) break
  }

  const state = fromVector(x, m)
  const after = controlPoints(state)
  const d = (a: Vec3, b2: Vec3): number => Math.hypot(a.x - b2.x, a.y - b2.y, a.z - b2.z)
  let disturbance = 0
  for (let j = 0; j < after.length; j++) {
    if (j !== index) disturbance = Math.max(disturbance, d(after[j], before[j]))
  }
  return {
    state,
    controlPoints: after,
    trackingError: d(after[index], target),
    disturbance,
    iterations: used,
  }
}
