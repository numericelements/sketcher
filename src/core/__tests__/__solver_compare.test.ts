// BENCH, not a test: head-to-head solver comparison with console output and
// NO assertions. Skipped in the suite (a timeout is its only failure mode);
// remove .skip to run explicitly. (Design review 2026-07-05, finding T-2.)
import { it } from 'vitest'
import {
  CurvatureDragProblem, PrimalDualOptimizer, BarrierOptimizer, familyBound,
  enforceBoundNonincreasing, rational, type WeightedCP,
} from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'

// Three-solver head-to-head on the F9 stall drag, guard applied identically.
// Per tick: raw-step bound (did the solver leave the feasible set?), guard alpha
// (did the guard keep anything?), final tracking.
const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

it('solver comparison on the F9 drag', () => {
  const target = { x: X0[3] + 55, y: Y0[3] + 200 }
  const moveLen = Math.hypot(55, 200)
  for (const solver of ['primal-dual', 'barrier', 'ipopt'] as const) {
    let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
    const k = 3, sx = cps[k].re, sy = cps[k].im
    let rawViolations = 0, guardCollapses = 0
    const t0 = performance.now()
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
      const problem = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
        cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
      const opt = solver === 'primal-dual'
        ? new PrimalDualOptimizer(problem, { maxIterations: 20, returnBestFeasible: true })
        : solver === 'barrier'
          ? new BarrierOptimizer(problem, { maxIterations: 20, returnBestFeasible: true })
          : new InteriorPointOptimizer(problem, { maxIterations: 20, enableBFGS: false, returnBestFeasible: true })
      const r = opt.optimize()
      problem.setVariables(r.variables)
      const raw = problem.result()
      const startB = familyBound('rational', cps, KNOTS, DEGREE, 'open')
      if (familyBound('rational', raw, KNOTS, DEGREE, 'open') > startB) rawViolations++
      const before = cps
      const guarded = enforceBoundNonincreasing(
        cps, raw,
        (p: readonly WeightedCP[]) => familyBound('rational', p, KNOTS, DEGREE, 'open'),
        (a: number) => before.map((p, i) => ({ re: p.re + a * (raw[i].re - p.re), im: p.im + a * (raw[i].im - p.im), wRe: p.wRe, wIm: p.wIm })),
      )
      const rawStep = Math.sqrt(before.reduce((s2, p, i) => s2 + (raw[i].re - p.re) ** 2 + (raw[i].im - p.im) ** 2, 0))
      const keptStep = Math.sqrt(before.reduce((s2, p, i) => s2 + (guarded[i].re - p.re) ** 2 + (guarded[i].im - p.im) ** 2, 0))
      if (rawStep > 1e-6 && keptStep < 1e-6 * rawStep) guardCollapses++
      cps = guarded
    }
    const ms = (performance.now() - t0) / 15
    const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    console.log(`${solver.padEnd(11)} tracked ${(100 - 100 * err / moveLen).toFixed(0).padStart(3)}%  rawViolations ${rawViolations}/15  guardCollapses ${guardCollapses}/15  ${ms.toFixed(0)}ms/tick`)
  }
}, 300000)

it('is ipopt stationary at each tick? (translation-descent probe)', () => {
  const target = { x: X0[3] + 55, y: Y0[3] + 200 }
  let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
  const k = 3, sx = cps[k].re, sy = cps[k].im
  const Ds: string[] = []
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const problem = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
      cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
    const r = new InteriorPointOptimizer(problem, { maxIterations: 20, enableBFGS: false, returnBestFeasible: true }).optimize()
    problem.setVariables(r.variables)
    const raw = problem.result()
    const tickTargets = cps.map((p, i) => i === k ? tick : { x: p.re, y: p.im })
    const pull = { x: tick.x - raw[k].re, y: tick.y - raw[k].im }
    const pl = Math.hypot(pull.x, pull.y)
    const u = pl > 1e-12 ? { x: pull.x / pl, y: pull.y / pl } : { x: 0, y: 0 }
    let D = 0
    for (let i = 0; i < cps.length; i++) D += (raw[i].re - tickTargets[i].x) * u.x + (raw[i].im - tickTargets[i].y) * u.y
    Ds.push(D.toFixed(2))
    cps = raw // ipopt never violated, guard is a no-op here
  }
  console.log('ipopt per-tick dObj/dTranslation:', Ds.join(' '))
}, 300000)

it('trust-region radius at termination (Eric prediction: collapses at stall)', () => {
  const target = { x: X0[3] + 55, y: Y0[3] + 200 }
  let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
  const k = 3, sx = cps[k].re, sy = cps[k].im
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const problem = new CurvatureDragProblem('rational', cps, KNOTS, DEGREE, 'open', k, tick,
      cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
    const r = new InteriorPointOptimizer(problem, { maxIterations: 20, enableBFGS: false, returnBestFeasible: true }).optimize()
    problem.setVariables(r.variables)
    const raw = problem.result()
    const prog = Math.hypot(raw[k].re - cps[k].re, raw[k].im - cps[k].im)
    console.log(`tick ${String(s).padStart(2)}: delta ${r.finalDelta !== undefined ? r.finalDelta.toExponential(2) : 'n/a'}  reason ${r.terminationReason}  iters ${r.iterations}  draggedMoved ${prog.toFixed(2)}`)
    cps = raw
  }
}, 300000)
