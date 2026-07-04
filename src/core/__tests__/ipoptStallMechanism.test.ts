import { describe, it, expect } from 'vitest'
import { CurvatureDragProblem, familyBound, rational, type WeightedCP } from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'

// THE STALL MECHANISM, SOLVED (lab notebook E10; F13). Core's IP stalled on the
// F9 drag (46% tracked, worse with MORE budget) because of two acceptance-
// arithmetic defects that only bind together:
//   1. the ρ ratchet — predictedReduction came from the FULL Newton step, so a
//      δ-limited step always looked bad and the trust region could never
//      re-expand after a collapse;
//   2. feasibility search billed to the budget — every true-violation rejection
//      consumed an outer iteration (7/15 ticks were all-rejections).
// With `consistentPredictedReduction` + `freeFeasibilityShrinks` the SAME solver
// (dogleg, FTB, SOC, watchdog, filter intact) reaches 74% @20 iters, 90% @60,
// 92% @200 — parity with Eric's closed-curve optimizer (the design oracle) —
// and budget helps again. This pins the fixed behavior and the restored
// budget-monotonicity; the displayed bound must hold throughout (Law 2).

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

const run = (maxIterations: number) => {
  let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
  const k = 3, sx = X0[3], sy = Y0[3]
  const target = { x: sx + 55, y: sy + 200 }
  const start = familyBound('rational', cps, KNOTS, DEGREE, 'open')
  let maxB = start
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const problem = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
      cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
    const opt = new InteriorPointOptimizer(problem, {
      maxIterations, enableBFGS: false, returnBestFeasible: true,
      consistentPredictedReduction: true, freeFeasibilityShrinks: true,
    })
    const r = opt.optimize()
    problem.setVariables(r.variables)
    cps = problem.result()
    maxB = Math.max(maxB, familyBound('rational', cps, KNOTS, DEGREE, 'open'))
  }
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  return { tracked: 100 - 100 * err / Math.hypot(55, 200), maxB, start }
}

describe('ipopt stall mechanism fixes (consistent ρ + free feasibility shrinks)', () => {
  it('@20 iters: ≥65% tracked (was 46%), bound held', () => {
    const r = run(20)
    expect(r.maxB, 'bound rose').toBeLessThanOrEqual(r.start)
    expect(r.tracked, `tracked ${r.tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(65)
  }, 60000)

  it('@60 iters: ≥85% tracked AND better than @20 (budget-monotonicity restored)', () => {
    const r60 = run(60)
    const r20 = run(20)
    expect(r60.maxB, 'bound rose').toBeLessThanOrEqual(r60.start)
    expect(r60.tracked, `tracked ${r60.tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(85)
    // The pre-fix pathology was 46% @20 → 18% @800: more budget made it WORSE.
    expect(r60.tracked).toBeGreaterThan(r20.tracked - 1)
  }, 120000)
})
