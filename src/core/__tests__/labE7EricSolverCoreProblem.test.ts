import { it } from 'vitest'
import { CurvatureDragProblem, complexCurvatureConstraintState, cyclicSignChanges, rational, type WeightedCP } from '../index'
import '../../../../../../numericelements/git/closed-curve/src/models/CurveModel3d'
import { Optimizer } from '../../../../../../numericelements/git/closed-curve/src/optimizers/Optimizer'
import { DenseMatrix } from '../../../../../../numericelements/git/closed-curve/src/linearAlgebra/DenseMatrix'
import { identityMatrix } from '../../../../../../numericelements/git/closed-curve/src/linearAlgebra/DiagonalMatrix'

// E7 (LAB_NOTEBOOK_DRAG): Eric's SOLVER on CORE'S problem formulation.
// If it tracks ~90%: the solver ensemble (trust region + log barrier + per-step
// feasibility) is the driver and core's scaled/margin formulation is fine.
// If it stalls ~50%: core's FORMULATION is the disease, not its solvers.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

const dispBound = (x: number[], y: number[], w: number[]) => {
  const { signs } = complexCurvatureConstraintState(x, y, w, w.map(() => 0), KNOTS, DEGREE, false, { re: 1, im: 0 })
  return cyclicSignChanges(signs, false)
}

/** Adapter: core CurvatureDragProblem -> Eric's IOptimizationProblem (f_i <= 0). */
class CoreProblemForEric {
  constructor(private core: CurvatureDragProblem) {}
  get numberOfIndependentVariables() { return this.core.numVariables }
  get f0() { return this.core.computeObjective() }
  get gradient_f0() { return this.core.computeObjectiveGradient() }
  get hessian_f0() { return identityMatrix(this.core.numVariables) }
  get numberOfConstraints() { return this.core.numConstraints }
  // Core's own feasibility convention (InteriorPointOptimizer:320):
  // signs[i] * constraints[i] < 0  <=>  feasible — exactly Eric's f_i <= 0.
  get f() {
    const sg = this.core.getConstraintSigns()
    return this.core.computeConstraints().map((v, i) => sg[i] * v)
  }
  get gradient_f() {
    const sg = this.core.getConstraintSigns()
    const J = this.core.computeConstraintJacobian()
    const m = new DenseMatrix(J.length, this.core.numVariables)
    for (let r = 0; r < J.length; r++) for (let c = 0; c < J[r].length; c++) m.set(r, c, sg[r] * J[r][c])
    return m
  }
  hessian_f = undefined
  step(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    // Eric's design: the sliding state (signs on the fixed active set) follows
    // every ACCEPTED step, matching what his problems do inside step().
    this.core.updateConstraintState()
  }
  fStep(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    const sg = this.core.getConstraintSigns()
    const out = this.core.computeConstraints().map((v, i) => sg[i] * v)
    this.core.setVariables(x)
    return out
  }
  f0Step(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    const out = this.core.computeObjective()
    this.core.setVariables(x)
    return out
  }
}

it("E7: Eric's solver on core's problem", () => {
  const k = 3, target = { x: X0[3] + 55, y: Y0[3] + 200 }
  const moveLen = Math.hypot(55, 200)
  let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
  const start = dispBound(X0, Y0, W0)
  let maxB = start, throws = 0
  const t0 = performance.now()
  const sx = X0[3], sy = Y0[3]
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    try {
      const core = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
        cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
      const adapter = new CoreProblemForEric(core)
      new Optimizer(adapter as never).optimize_using_trust_region(1e-8, 10, 50)
      cps = core.result()
    } catch { throws++ }
    maxB = Math.max(maxB, dispBound(cps.map(p => p.re), cps.map(p => p.im), cps.map(p => p.wRe)))
  }
  const ms = (performance.now() - t0) / 15
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  console.log(`E7 ERIC-SOLVER/CORE-PROBLEM: tracked ${(100 - 100 * err / moveLen).toFixed(0)}%  bound ${start}->max ${maxB}  throws ${throws}/15  ${ms.toFixed(0)}ms/tick`)
}, 300000)

it("E9: Eric's LINE-SEARCH solver on core's problem", () => {
  const k = 3, target = { x: X0[3] + 55, y: Y0[3] + 200 }
  const moveLen = Math.hypot(55, 200)
  let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
  const start = dispBound(X0, Y0, W0)
  let maxB = start, throws = 0
  const sx = X0[3], sy = Y0[3]
  for (let s2 = 1; s2 <= 15; s2++) {
    const t = s2 / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    try {
      const core = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
        cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
      const adapter = new CoreProblemForEric(core)
      new Optimizer(adapter as never).optimize_using_line_search(1e-6, 50)
      cps = core.result()
    } catch { throws++ }
    maxB = Math.max(maxB, dispBound(cps.map(p => p.re), cps.map(p => p.im), cps.map(p => p.wRe)))
  }
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  console.log(`E9 LINE-SEARCH/CORE-PROBLEM: tracked ${(100 - 100 * err / moveLen).toFixed(0)}%  bound ${start}->max ${maxB}  throws ${throws}/15`)
}, 300000)
