import { describe, it, expect } from 'vitest'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../index'
// Break the models<->optimizationProblems init cycle the same way Eric's webpack
// entry does: evaluate the model layer first.
import '../../../../../../numericelements/git/closed-curve/src/models/CurveModel3d'
// Eric's own optimizer, imported straight from his closed-curve project.
import { RationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/bsplines/R1toR2/RationalBSplineR1toR2'
import { Vector3d } from '../../../../../../numericelements/git/closed-curve/src/mathVector/Vector3d'
import { OpRationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/OpRationalBSplineR1toR2'
import { ActiveControl } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/BaseOpBSplineR1toR2'
import { Optimizer } from '../../../../../../numericelements/git/closed-curve/src/optimizers/Optimizer'

// ERIC'S DESIGN AS THE IN-REPO ORACLE (FOUNDATIONS F12). His closed-curve
// optimizer (../../numericelements/git/closed-curve — trust region + barrier,
// never accepts an infeasible step, weights FREE, scaled-Bernstein products,
// closest-to-zero inactive set) run on the F9 stall drag:
//
//   ERIC design @800 steps: 91% tracked, bound 2 held, 967ms/tick
//   ERIC design @50 steps:  91% tracked, bound 2 held,  66ms/tick  ← this pin
//   core primal-dual @20:   47%, 8/15 infeasible raw steps, 7/15 dead ticks
//   core ipopt @20:         46%      core ipopt @800: 18% (MORE budget = WORSE)
//
// So the current core drag is a DESIGN regression on this case, not a budget
// problem. Measured drivers to investigate/port (task list): free weights
// (they drift 5–25× in his run — a whole DOF block core froze), per-step
// feasibility, the inactive-set rule, scaled products. This test pins his
// capability so the regression can never be argued away; it depends on the
// sibling checkout of closed-curve (skip if absent).

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

const dispBound = (x: number[], y: number[], w: number[]) => {
  const { signs } = complexCurvatureConstraintState(x, y, w, w.map(() => 0), KNOTS, DEGREE, false, { re: 1, im: 0 })
  return cyclicSignChanges(signs, false)
}

describe("Eric's closed-curve optimizer: the design oracle on the F9 drag", () => {
  it('tracks ≥80% at 50 steps/tick while the displayed bound never rises', () => {
    const k = 3, target = { x: X0[3] + 55, y: Y0[3] + 200 }
    const moveLen = Math.hypot(55, 200)
    let spline = new RationalBSplineR1toR2(
      X0.map((x, i) => new Vector3d(x * W0[i], Y0[i] * W0[i], W0[i])), KNOTS)
    const start = dispBound(X0, Y0, W0)
    const sx = X0[3], sy = Y0[3]
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
      const cps = spline.controlPoints
      const w = cps[k].z
      const targetCps = cps.map((p, i) => i === k ? new Vector3d(tick.x * w, tick.y * w, w) : p)
      const problem = new OpRationalBSplineR1toR2(
        new RationalBSplineR1toR2(targetCps, KNOTS), spline.clone(), ActiveControl.curvatureExtrema)
      new Optimizer(problem).optimize_using_trust_region(1e-8, 10, 50)
      spline = problem.spline
      const cur = spline.controlPoints
      expect(
        dispBound(cur.map(p => p.x / p.z), cur.map(p => p.y / p.z), cur.map(p => p.z)),
        `step ${s}: displayed bound rose`,
      ).toBeLessThanOrEqual(start)
    }
    const cur = spline.controlPoints
    const err = Math.hypot(cur[k].x / cur[k].z - target.x, cur[k].y / cur[k].z - target.y)
    const tracked = 100 - 100 * err / moveLen
    expect(tracked, `Eric's design tracked only ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(80)
  }, 120000)
})
