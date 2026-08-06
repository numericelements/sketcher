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
//
// NOW A THIN ADAPTER over core/phFreeDrag, which does the same thing for a
// generator of ANY degree (the quintic slide needed it too, and two copies of one
// algorithm is the duplication worth avoiding). This module keeps the cubic-shaped
// API — {w0, w1} rather than an array — so its callers and its eight tests are
// unchanged, which means those tests now validate the general implementation.
// ============================================================================
import { type Complex, cmul } from './complex'
import { type Matrix } from './linalg'
import type { PHCubicGenerator } from './phCubic'
import {
  type FreeDragOptions,
  type FreeDragResult as GeneralFreeDragResult,
  type PHFreeState,
  dragPHFree,
  freeControlPointJacobian,
  phPolygonResidual,
} from './phFreeDrag'

export type { FreeDragOptions } from './phFreeDrag'

/** The 6 real unknowns: generator plus the integration constant. */
export interface PHCubicState {
  readonly generator: PHCubicGenerator
  readonly p0: Complex
}

export interface FreeDragResult extends Omit<GeneralFreeDragResult, 'state'> {
  readonly state: PHCubicState
}

const toGeneral = (s: PHCubicState): PHFreeState => ({
  generator: [s.generator.w0, s.generator.w1],
  p0: s.p0,
})
const fromGeneral = (s: PHFreeState): PHCubicState => ({
  generator: { w0: s.generator[0], w1: s.generator[1] },
  p0: s.p0,
})

/** ∂(P₀,P₁,P₂,P₃)/∂x — the exact 8×6 Jacobian, from the general assembly. */
export function controlPointJacobian(s: PHCubicState): Matrix {
  return freeControlPointJacobian(toGeneral(s))
}

/**
 * One free-mode drag step: move control point `index` toward `target`, keeping the
 * other three as close as possible to where they are now.
 */
export function dragPHCubicFree(
  from: PHCubicState,
  index: number,
  target: Complex,
  options: FreeDragOptions = {},
): FreeDragResult {
  const r = dragPHFree(toGeneral(from), index, target, options)
  return { ...r, state: fromGeneral(r.state) }
}

/** Build a free-mode state from a generator and origin (the strict mode's output). */
export const freeStateFrom = (generator: PHCubicGenerator, p0: Complex): PHCubicState => ({
  generator,
  p0,
})

/**
 * The PH residual for a CUBIC control polygon: the legs are a geometric progression,
 * so ΔP₁² = ΔP₀·ΔP₂. Identically zero by construction — free mode parameterises by
 * the generator and cannot leave the manifold — and kept as an assertion target.
 * `phPolygonResidual` in phFreeDrag is the any-degree version.
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

export { phPolygonResidual }

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
