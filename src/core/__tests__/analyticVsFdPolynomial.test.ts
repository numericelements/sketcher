// Head-to-head on a POLYNOMIAL drag: same solver (ipopt), same guard, ONLY the Jacobian
// backend varies — 'fd' (finite differences) vs 'analytic' (analyticGradient.ts, ported
// from Rust ne-core) vs 'ad' (forward-AD, gradient.ts). Isolates feel (cursor tracking)
// and speed as a function of the gradient method. Correctness (bound held) is asserted;
// tracking + ms/tick are LOGGED (per THE_IDEAS idea VII §7 — no timing ceilings).
import { describe, it, expect } from 'vitest'
import {
  CurvatureDragProblem, familyBound, enforceBoundNonincreasing, type WeightedCP,
} from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'

const DEGREE = 3

const knotsFor = (n: number) => {
  const k: number[] = []
  for (let i = 0; i < DEGREE + 1; i++) k.push(0)
  for (let i = 1; i < n - DEGREE; i++) k.push(i / (n - DEGREE))
  for (let i = 0; i < DEGREE + 1; i++) k.push(1)
  return k
}
// A wavy open cubic — several curvature extrema, so the sign constraints actually bind.
const mkCps = (n: number): WeightedCP[] =>
  Array.from({ length: n }, (_, i) => ({ re: 30 + 34 * i, im: 120 + 90 * Math.sin((Math.PI * i) / 3.5), wRe: 1, wIm: 0 }))

const runDrag = (n: number, backend: 'fd' | 'analytic' | 'ad') => {
  const knots = knotsFor(n)
  const k = Math.floor(n / 2)
  const s0 = mkCps(n)
  const sx = s0[k].re, sy = s0[k].im
  const target = { x: sx + 40, y: sy - 150 } // a real pull, into the constrained region
  const moveLen = Math.hypot(40, 150)
  let cps = mkCps(n)
  const startBound = familyBound('polynomial', cps, knots, DEGREE, 'open')
  let maxBound = startBound
  let rawViolations = 0
  const t0 = performance.now()
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const problem = new CurvatureDragProblem(
      'polynomial', cps, knots, DEGREE, 'open', k, tick,
      cps.map((p) => p.wRe), cps.map((p) => p.wIm), backend, { re: 1, im: 0 }, {},
    )
    const r = new InteriorPointOptimizer(problem, { maxIterations: 40, enableBFGS: false, returnBestFeasible: true }).optimize()
    problem.setVariables(r.variables)
    const raw = problem.result()
    if (familyBound('polynomial', raw, knots, DEGREE, 'open') > startBound) rawViolations++
    const before = cps
    cps = enforceBoundNonincreasing(
      cps, raw,
      (p: readonly WeightedCP[]) => familyBound('polynomial', p, knots, DEGREE, 'open'),
      (a: number) => before.map((p, i) => ({ re: p.re + a * (raw[i].re - p.re), im: p.im + a * (raw[i].im - p.im), wRe: p.wRe, wIm: p.wIm })),
    )
    maxBound = Math.max(maxBound, familyBound('polynomial', cps, knots, DEGREE, 'open'))
  }
  const ms = (performance.now() - t0) / 15
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  const tracked = 100 - (100 * err) / moveLen
  return { tracked, ms, rawViolations, startBound, maxBound }
}

describe('analytic vs FD vs AD Jacobian — polynomial drag (feel + speed)', () => {
  it('bound held for every backend and size; tracking + ms/tick logged (dense ipopt path)', () => {
    const backends = ['fd', 'analytic', 'ad'] as const
    const sizes = [11, 21, 41, 81]
    // eslint-disable-next-line no-console
    console.log('\n  n    backend    tracked    ms/tick   (min of 3; dense ipopt; only the Jacobian varies)')
    for (const n of sizes) {
      const ms: Record<string, number> = {}
      const trk: Record<string, number> = {}
      for (const backend of backends) {
        let best = runDrag(n, backend)
        for (let rep = 0; rep < 2; rep++) {
          const r = runDrag(n, backend)
          if (r.ms < best.ms) best = r
        }
        ms[backend] = best.ms
        trk[backend] = best.tracked
        expect(best.maxBound, `n=${n} ${backend}: bound rose ${best.startBound}→${best.maxBound}`).toBeLessThanOrEqual(best.startBound)
      }
      for (const b of backends) {
        // eslint-disable-next-line no-console
        console.log(`  ${String(n).padStart(3)}  ${b.padEnd(9)}  ${trk[b].toFixed(1).padStart(6)}%  ${ms[b].toFixed(2).padStart(8)}   ${b === 'fd' ? '(baseline)' : `${((ms.fd / ms[b] - 1) * 100).toFixed(0)}% faster than fd`}`)
      }
      // analytic and AD (both exact) track within a hair of each other.
      expect(Math.abs(trk.analytic - trk.ad), `n=${n}: analytic vs ad tracking`).toBeLessThan(0.5)
    }
  }, 300000)
})
