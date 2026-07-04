import { it } from 'vitest'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../index'
import '../../../../../../numericelements/git/closed-curve/src/models/CurveModel3d'
import { RationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/bsplines/R1toR2/RationalBSplineR1toR2'
import { Vector3d } from '../../../../../../numericelements/git/closed-curve/src/mathVector/Vector3d'
import { OpRationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/OpRationalBSplineR1toR2'
import { ActiveControl } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/BaseOpBSplineR1toR2'
import { Optimizer } from '../../../../../../numericelements/git/closed-curve/src/optimizers/Optimizer'
import { DenseMatrix } from '../../../../../../numericelements/git/closed-curve/src/linearAlgebra/DenseMatrix'

// E1 (LAB_NOTEBOOK_DRAG): isolate factor A (weight DOF) inside ERIC'S stack.
// Same solver, same rules — but the z (weight) block is pinned: zero objective
// gradient in z, zero constraint-Jacobian columns in z, zero applied/evaluated
// z-steps. If A dominates F12's 91-vs-47 gap, this should collapse toward ~50%.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

const dispBound = (x: number[], y: number[], w: number[]) => {
  const { signs } = complexCurvatureConstraintState(x, y, w, w.map(() => 0), KNOTS, DEGREE, false, { re: 1, im: 0 })
  return cyclicSignChanges(signs, false)
}

class PinnedWeightsProblem extends OpRationalBSplineR1toR2 {
  private zStart() { return (this.numberOfIndependentVariables * 2) / 3 }
  private zeroZ(step: number[]) {
    const out = step.slice()
    for (let i = this.zStart(); i < out.length; i++) out[i] = 0
    return out
  }
  get gradient_f0(): number[] {
    const g = super.gradient_f0.slice()
    for (let i = this.zStart(); i < g.length; i++) g[i] = 0
    return g
  }
  get gradient_f(): DenseMatrix {
    const m = super.gradient_f
    const out = new DenseMatrix(m.shape[0], m.shape[1])
    for (let r = 0; r < m.shape[0]; r++)
      for (let c = 0; c < m.shape[1]; c++)
        out.set(r, c, c >= this.zStart() ? 0 : m.get(r, c))
    return out
  }
  step(deltaX: number[]) { super.step(this.zeroZ(deltaX)) }
  fStep(step: number[]) { return super.fStep(this.zeroZ(step)) }
  f0Step(step: number[]) { return super.f0Step(this.zeroZ(step)) }
}

it('E1: Eric stack, weights pinned', () => {
  const k = 3, target = { x: X0[3] + 55, y: Y0[3] + 200 }
  const moveLen = Math.hypot(55, 200)
  let spline = new RationalBSplineR1toR2(
    X0.map((x, i) => new Vector3d(x * W0[i], Y0[i] * W0[i], W0[i])), KNOTS)
  const start = dispBound(X0, Y0, W0)
  let maxB = start, throws = 0
  const sx = X0[3], sy = Y0[3]
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    try {
      const cps = spline.controlPoints
      const w = cps[k].z
      const targetCps = cps.map((p, i) => i === k ? new Vector3d(tick.x * w, tick.y * w, w) : p)
      const problem = new PinnedWeightsProblem(
        new RationalBSplineR1toR2(targetCps, KNOTS), spline.clone(), ActiveControl.curvatureExtrema)
      new Optimizer(problem).optimize_using_trust_region(1e-8, 10, 50)
      spline = problem.spline
    } catch { throws++ }
    const cur = spline.controlPoints
    maxB = Math.max(maxB, dispBound(cur.map(p => p.x / p.z), cur.map(p => p.y / p.z), cur.map(p => p.z)))
  }
  const cur = spline.controlPoints
  const err = Math.hypot(cur[k].x / cur[k].z - target.x, cur[k].y / cur[k].z - target.y)
  const wDrift = Math.max(...cur.map((p, i) => Math.abs(p.z - W0[i]) / W0[i]))
  console.log(`E1 PINNED-WEIGHTS: tracked ${(100 - 100 * err / moveLen).toFixed(0)}%  bound ${start}->max ${maxB}  wDrift ${(100 * wDrift).toFixed(2)}%  throws ${throws}/15`)
}, 300000)
