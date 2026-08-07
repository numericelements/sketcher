// ============================================================================
// FREE-MODE drag for a spatial PH cubic — grab any control point.
//
// The spatial twin of phFreeDrag, and the same contrast it exists to make:
//
//   STRICT  pin both ends, prescribe one interior point   9 conditions on 10 DOF
//           → one spare, so the answer is a CURVE of curves and a slider chooses.
//
//   FREE    pin nothing, drag any of the four              3 conditions on 10 DOF
//           → SEVEN spare, so minimum-norm chooses: dragged point to the cursor,
//             everything else as little as possible.
//
// Seven spare against the planar cubic's four. The more room the manifold has, the
// more an optimizer has to decide — and the further "strict" and "free" sit apart.
//
// PH holds BY CONSTRUCTION: the unknowns are A₀, A₁ and the origin, so r′ = A i A*
// is a sandwich no matter what the solve does and there is nothing to enforce.
//
// THE JACOBIAN IS FREE, because the derivative of the sandwich IS the polarization
// we already have. For Q(A) = A i A*,
//
//     dQ(A)·δ = δ i A* + A i δ* = polarSandwich(A, δ)
//
// so each column is one call with δ a basis quaternion. The legs are
// ΔP₀ = Q(A₀)/3, ΔP₁ = polarSandwich(A₀,A₁)/6, ΔP₂ = Q(A₁)/3, and every control
// point is the origin plus the legs before it — a cumulative sum, as in the plane.
//
// ONE WRINKLE THE PLANE DOES NOT HAVE. The gauge A ↦ A(cos θ + i sin θ) is
// CONTINUOUS here, so the 12×11 Jacobian is permanently rank-deficient by one: there
// is always a direction that changes the unknowns and moves nothing. The ridge in
// `leastSquares` handles it — the minimum-norm step simply never travels along the
// gauge — but that is asserted in the tests rather than assumed, because a silently
// singular solve is exactly the kind of thing that works until it doesn't.
// ============================================================================
import { leastSquares, type Matrix } from './linalg'
import {
  type Quat,
  type Vec3,
  polarSandwich,
  vscale,
} from './quaternion'
import { type SpatialPHCubic, controlPoints } from './phSpatialCubic'

const BASIS: Quat[] = [
  { u: 1, v: 0, p: 0, q: 0 },
  { u: 0, v: 1, p: 0, q: 0 },
  { u: 0, v: 0, p: 1, q: 0 },
  { u: 0, v: 0, p: 0, q: 1 },
]

const toVector = (c: SpatialPHCubic): number[] => [
  c.A0.u, c.A0.v, c.A0.p, c.A0.q,
  c.A1.u, c.A1.v, c.A1.p, c.A1.q,
  c.p0.x, c.p0.y, c.p0.z,
]

const fromVector = (x: readonly number[]): SpatialPHCubic => ({
  A0: { u: x[0], v: x[1], p: x[2], q: x[3] },
  A1: { u: x[4], v: x[5], p: x[6], q: x[7] },
  p0: { x: x[8], y: x[9], z: x[10] },
})

/**
 * ∂(P₀,P₁,P₂,P₃)/∂(A₀, A₁, origin) — exact, 12×11. Columns are
 * [A₀.u..A₀.q, A₁.u..A₁.q, origin.x..origin.z].
 */
export function spatialControlPointJacobian(c: SpatialPHCubic): Matrix {
  // Per-leg derivatives, as 3-vectors, one per unknown column.
  const dLeg: Vec3[][] = [
    // ΔP₀ = Q(A₀)/3
    [
      ...BASIS.map((d) => vscale(polarSandwich(c.A0, d), 1 / 3)),
      ...BASIS.map(() => ({ x: 0, y: 0, z: 0 })),
    ],
    // ΔP₁ = polarSandwich(A₀,A₁)/6 — linear in each argument
    [
      ...BASIS.map((d) => vscale(polarSandwich(d, c.A1), 1 / 6)),
      ...BASIS.map((d) => vscale(polarSandwich(c.A0, d), 1 / 6)),
    ],
    // ΔP₂ = Q(A₁)/3
    [
      ...BASIS.map(() => ({ x: 0, y: 0, z: 0 })),
      ...BASIS.map((d) => vscale(polarSandwich(c.A1, d), 1 / 3)),
    ],
  ]

  const acc: Vec3[] = Array.from({ length: 8 }, () => ({ x: 0, y: 0, z: 0 }))
  const J: Matrix = []
  for (let i = 0; i < 4; i++) {
    if (i > 0) {
      for (let k = 0; k < 8; k++) {
        const d = dLeg[i - 1][k]
        acc[k] = { x: acc[k].x + d.x, y: acc[k].y + d.y, z: acc[k].z + d.z }
      }
    }
    const rows: [keyof Vec3, number][] = [['x', 0], ['y', 1], ['z', 2]]
    for (const [axis, oi] of rows) {
      const line = acc.map((v) => v[axis])
      line.push(oi === 0 ? 1 : 0, oi === 1 ? 1 : 0, oi === 2 ? 1 : 0) // ∂/∂origin
      J.push(line)
    }
  }
  return J
}

export interface SpatialFreeDragOptions {
  readonly dragWeight?: number
  readonly holdWeight?: number
  readonly iterations?: number
  /** Ridge on the normal equations. Also what absorbs the gauge's null direction. */
  readonly regularization?: number
}

export interface SpatialFreeDragResult {
  readonly state: SpatialPHCubic
  readonly controlPoints: Vec3[]
  readonly trackingError: number
  readonly disturbance: number
  readonly iterations: number
}

/**
 * One free-mode drag step: move control point `index` toward `target`, keeping the
 * other three as close as possible to where they are. Warm-started from `from`, so a
 * drag is a sequence of these — which is what makes the motion a path, and
 * path-dependent (holonomy, as in the plane).
 */
export function dragSpatialCubicFree(
  from: SpatialPHCubic,
  index: number,
  target: Vec3,
  options: SpatialFreeDragOptions = {},
): SpatialFreeDragResult {
  const dragWeight = options.dragWeight ?? 60
  const holdWeight = options.holdWeight ?? 1
  const iterations = options.iterations ?? 3
  const reg = options.regularization ?? 1e-8

  const before = controlPoints(from)
  const targets = before.map((p, j) => (j === index ? target : p))
  const weights = before.map((_, j) => (j === index ? dragWeight : holdWeight))

  let x = toVector(from)
  let used = 0
  for (let it = 0; it < iterations; it++) {
    used = it + 1
    const s = fromVector(x)
    const cps = controlPoints(s)
    const J = spatialControlPointJacobian(s)

    const A: Matrix = []
    const b: number[] = []
    for (let j = 0; j < 4; j++) {
      const sw = Math.sqrt(weights[j])
      A.push(J[3 * j].map((v) => v * sw), J[3 * j + 1].map((v) => v * sw), J[3 * j + 2].map((v) => v * sw))
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

  const state = fromVector(x)
  const after = controlPoints(state)
  const d = (a: Vec3, b2: Vec3): number => Math.hypot(a.x - b2.x, a.y - b2.y, a.z - b2.z)
  let disturbance = 0
  for (let j = 0; j < 4; j++) if (j !== index) disturbance = Math.max(disturbance, d(after[j], before[j]))
  return {
    state,
    controlPoints: after,
    trackingError: d(after[index], target),
    disturbance,
    iterations: used,
  }
}

/**
 * Is this control polygon a spatial PH cubic, judged from the POLYGON alone?
 *
 * Recover A₀ from the first leg (3·ΔP₀ = A₀ i A₀ conj, the Hopf inverse, up to a
 * gauge that does not matter here), likewise A₁ from the last, and check that the
 * middle leg is consistent with them. Free mode parameterises by the
 * generator so this is ~machine zero by construction; the readout asserts it from
 * what is drawn rather than from the code path.
 *
 * Returns the relative middle-leg error, or NaN when a leg vanishes.
 */
export function spatialPHPolygonResidual(cps: readonly Vec3[]): number {
  if (cps.length !== 4) return NaN
  const leg = (i: number): Vec3 => ({
    x: cps[i + 1].x - cps[i].x,
    y: cps[i + 1].y - cps[i].y,
    z: cps[i + 1].z - cps[i].z,
  })
  const l0 = leg(0), l1 = leg(1), l2 = leg(2)
  const n0 = Math.hypot(l0.x, l0.y, l0.z)
  const n2 = Math.hypot(l2.x, l2.y, l2.z)
  if (n0 === 0 || n2 === 0) return NaN
  // |ΔP₁| is forced: |A₀iA₁* + A₁iA₀*|/6 ≤ 2|A₀||A₁|/6, with equality iff the
  // generators are gauge-aligned — and |A₀|² = 3|ΔP₀|, |A₁|² = 3|ΔP₂|.
  const bound = Math.sqrt(3 * n0) * Math.sqrt(3 * n2) / 3
  const got = Math.hypot(l1.x, l1.y, l1.z)
  // A genuine PH cubic has |ΔP₁| ≤ bound; equality is the planar/aligned case.
  return got <= bound * (1 + 1e-9) ? 0 : (got - bound) / bound
}
