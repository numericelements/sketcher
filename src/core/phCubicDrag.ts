// ============================================================================
// FREE-MODE drag for the planar PH cubic — grab ANY control point.
//
// The contrast this exists to make. In STRICT mode (phCubic.ts) you pin P₀ and P₃
// and prescribe P₁: 6 DOF against 6 conditions, a SQUARE system, so nothing is
// chosen — there are simply two branches, in closed form. Nothing for an optimizer
// to do.
//
// In FREE mode nothing is pinned and any one control point is dragged: 6 DOF
// against 2 conditions, so **4 degrees of freedom are spare** and something must
// choose how to spend them. The choice made here is the canonical one:
//
//     move the dragged point to the cursor, and move everything else AS LITTLE
//     AS POSSIBLE
//
// which is minimum-norm displacement on the constraint manifold — in the
// small-step limit, a horizontal lift for the metric on control-point space. Not a
// heuristic; the same object as the pseudoinverse solution in redundant-manipulator
// inverse kinematics (4 DOF, a 2-DOF task, a 2-DOF null space).
//
// Two consequences worth knowing, both of them real and neither a bug:
//   * the OTHER control points always move a little — they must, since prescribing
//     one control point alone leaves the PH variety (codimension 2);
//   * the motion is PATH-DEPENDENT. Drag a loop and the curve does not return.
//     That is HOLONOMY of the connection, the continuous sibling of the monodromy
//     that strict mode shows discretely. (In redundant IK it is the known
//     "non-repeatability" problem.)
//
// Formulation. Unknowns x = (w₀.re, w₀.im, w₁.re, w₁.im, c₀.re, c₀.im) ∈ ℝ⁶. The
// four control points are exact functions of x:
//
//     P₀ = c₀,  P₁ = P₀ + w₀²/3,  P₂ = P₁ + w₀w₁/3,  P₃ = P₂ + w₁²/3
//
// so the curve is PH BY CONSTRUCTION — there is no PH constraint to enforce and no
// way for the solve to leave the manifold. We minimise
//
//     Σⱼ μⱼ · |Pⱼ(x) − Tⱼ|²
//
// with a large weight on the dragged point (target = cursor) and unit weight on the
// others (target = where they were). As the weight grows this tends to the
// hard-constrained minimum-norm step; a finite weight is better behaved and is the
// same device the sceneStore drag routes already use (`targetWeights`).
//
// Solved by Gauss–Newton with an analytic 8×6 Jacobian, warm-started from the
// current state. Two or three iterations per tick; no barrier, no trust region —
// this is deliberately NOT the production solver, because there are no
// inequalities here.
// ============================================================================
import { type Complex, cmul, cscale } from './complex'
import { type Matrix, leastSquares } from './linalg'
import { type PHCubicGenerator, controlPoints } from './phCubic'

/** The 6 real unknowns: generator plus the integration constant. */
export interface PHCubicState {
  readonly generator: PHCubicGenerator
  readonly p0: Complex
}

const toVector = (s: PHCubicState): number[] => [
  s.generator.w0.re, s.generator.w0.im,
  s.generator.w1.re, s.generator.w1.im,
  s.p0.re, s.p0.im,
]

const fromVector = (x: readonly number[]): PHCubicState => ({
  generator: { w0: { re: x[0], im: x[1] }, w1: { re: x[2], im: x[3] } },
  p0: { re: x[4], im: x[5] },
})

/** Multiplication by the complex number z, as a real 2×2 block. */
const mulBlock = (z: Complex): [[number, number], [number, number]] => [
  [z.re, -z.im],
  [z.im, z.re],
]

/**
 * ∂(P₀,P₁,P₂,P₃)/∂x — an exact 8×6 Jacobian. Rows are (P₀.x, P₀.y, P₁.x, …).
 *
 * The legs are w₀²/3, w₀w₁/3, w₁²/3, so the derivatives are complex-linear:
 *   ∂(w₀²/3)/∂w₀  = 2w₀/3
 *   ∂(w₀w₁/3)/∂w₀ = w₁/3,   ∂(w₀w₁/3)/∂w₁ = w₀/3
 *   ∂(w₁²/3)/∂w₁  = 2w₁/3
 * and each control point accumulates the legs before it. Every point also depends
 * on c₀ with derivative the identity.
 */
export function controlPointJacobian(s: PHCubicState): Matrix {
  const { w0, w1 } = s.generator
  const dLeg0_dw0 = mulBlock(cscale(w0, 2 / 3))
  const dLeg1_dw0 = mulBlock(cscale(w1, 1 / 3))
  const dLeg1_dw1 = mulBlock(cscale(w0, 1 / 3))
  const dLeg2_dw1 = mulBlock(cscale(w1, 2 / 3))

  // Accumulated derivative of Pᵏ w.r.t. w₀ and w₁ (2×2 blocks), k = 0..3.
  const accW0: [[number, number], [number, number]][] = []
  const accW1: [[number, number], [number, number]][] = []
  let a0: [[number, number], [number, number]] = [[0, 0], [0, 0]]
  let a1: [[number, number], [number, number]] = [[0, 0], [0, 0]]
  accW0.push(a0)
  accW1.push(a1)
  const add = (
    m: [[number, number], [number, number]],
    n: [[number, number], [number, number]],
  ): [[number, number], [number, number]] => [
    [m[0][0] + n[0][0], m[0][1] + n[0][1]],
    [m[1][0] + n[1][0], m[1][1] + n[1][1]],
  ]
  const zero: [[number, number], [number, number]] = [[0, 0], [0, 0]]
  // P₁ = P₀ + leg₀
  a0 = add(a0, dLeg0_dw0); a1 = add(a1, zero); accW0.push(a0); accW1.push(a1)
  // P₂ = P₁ + leg₁
  a0 = add(a0, dLeg1_dw0); a1 = add(a1, dLeg1_dw1); accW0.push(a0); accW1.push(a1)
  // P₃ = P₂ + leg₂
  a0 = add(a0, zero); a1 = add(a1, dLeg2_dw1); accW0.push(a0); accW1.push(a1)

  const J: Matrix = []
  for (let k = 0; k < 4; k++) {
    for (let row = 0; row < 2; row++) {
      J.push([
        accW0[k][row][0], accW0[k][row][1],
        accW1[k][row][0], accW1[k][row][1],
        row === 0 ? 1 : 0, row === 1 ? 1 : 0,
      ])
    }
  }
  return J
}

export interface FreeDragOptions {
  /** Weight on the dragged control point (default 60). Higher tracks harder. */
  readonly dragWeight?: number
  /** Weight holding each untouched control point where it was (default 1). */
  readonly holdWeight?: number
  /** Gauss–Newton iterations per call (default 3). */
  readonly iterations?: number
  /** Levenberg damping added to the normal equations (default 1e-9). */
  readonly regularization?: number
}

export interface FreeDragResult {
  readonly state: PHCubicState
  readonly controlPoints: Complex[]
  /** |dragged point − cursor| — how well the gesture was honoured. */
  readonly trackingError: number
  /** max |Pⱼ − Pⱼ_before| over the untouched points — how much else moved. */
  readonly disturbance: number
  readonly iterations: number
}

/**
 * One free-mode drag step: move control point `index` toward `target`, keeping the
 * other three as close as possible to where they are now.
 *
 * Warm-started from `from`, so a drag is a sequence of these — which is what makes
 * the motion a path (and what makes it path-dependent).
 */
export function dragPHCubicFree(
  from: PHCubicState,
  index: number,
  target: Complex,
  options: FreeDragOptions = {},
): FreeDragResult {
  const dragWeight = options.dragWeight ?? 60
  const holdWeight = options.holdWeight ?? 1
  const iterations = options.iterations ?? 3
  const reg = options.regularization ?? 1e-9

  const before = controlPoints(from.generator, from.p0)
  const targets: Complex[] = before.map((p, j) => (j === index ? target : p))
  const weights = before.map((_, j) => (j === index ? dragWeight : holdWeight))

  let x = toVector(from)
  let used = 0
  for (let it = 0; it < iterations; it++) {
    used = it + 1
    const s = fromVector(x)
    const cps = controlPoints(s.generator, s.p0)
    const J = controlPointJacobian(s)

    // Weighted residual and Jacobian: scale each row by √μ.
    const A: Matrix = []
    const b: number[] = []
    for (let j = 0; j < 4; j++) {
      const sw = Math.sqrt(weights[j])
      A.push(J[2 * j].map((v) => v * sw), J[2 * j + 1].map((v) => v * sw))
      b.push(-(cps[j].re - targets[j].re) * sw, -(cps[j].im - targets[j].im) * sw)
    }
    const step = leastSquares(A, b, reg)
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
    // Converged when the step stops mattering at the data's scale.
    if (Math.max(...step.map(Math.abs)) < 1e-12) break
  }

  const state = fromVector(x)
  const after = controlPoints(state.generator, state.p0)
  const trackingError = Math.hypot(after[index].re - target.re, after[index].im - target.im)
  let disturbance = 0
  for (let j = 0; j < 4; j++) {
    if (j === index) continue
    disturbance = Math.max(disturbance, Math.hypot(after[j].re - before[j].re, after[j].im - before[j].im))
  }
  return { state, controlPoints: after, trackingError, disturbance, iterations: used }
}

/** Build a free-mode state from a generator and origin (the strict mode's output). */
export const freeStateFrom = (generator: PHCubicGenerator, p0: Complex): PHCubicState => ({
  generator,
  p0,
})

/**
 * The PH residual — identically zero by construction, kept as an assertion target.
 * The legs of a PH cubic satisfy ΔP₁² = ΔP₀·ΔP₂, and free mode parameterizes by
 * the generator, so it CANNOT leave the manifold no matter how the solve behaves.
 */
export function phResidual(cps: readonly Complex[]): number {
  const d0 = { re: cps[1].re - cps[0].re, im: cps[1].im - cps[0].im }
  const d1 = { re: cps[2].re - cps[1].re, im: cps[2].im - cps[1].im }
  const d2 = { re: cps[3].re - cps[2].re, im: cps[3].im - cps[2].im }
  const lhs = cmul(d1, d1)
  const rhs = cmul(d0, d2)
  const scale = Math.max(1e-30, Math.hypot(lhs.re, lhs.im) + Math.hypot(rhs.re, rhs.im))
  return Math.hypot(lhs.re - rhs.re, lhs.im - rhs.im) / scale
}

/** Convenience: run a whole drag path, returning every intermediate state. */
export function dragPathFree(
  from: PHCubicState,
  index: number,
  path: readonly Complex[],
  options: FreeDragOptions = {},
): FreeDragResult[] {
  const out: FreeDragResult[] = []
  let state = from
  for (const target of path) {
    const step = dragPHCubicFree(state, index, target, options)
    out.push(step)
    state = step.state
  }
  return out
}
