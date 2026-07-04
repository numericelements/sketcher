import { describe, it, expect } from 'vitest'
import { optimizeCurve, type OptimizeRationalResult } from '../optimizer'
import { slide, complexCurvatureConstraintState, cyclicSignChanges, type WeightedCP } from '../../core'
import type { Curve } from '../types/curve'

// WHY the open-rational drag routes to core and must never go back (fable branch,
// measured 2026-07-03): on this 15-step drag the LEGACY rational optimizer tracks the
// cursor to ~97% (err 5.8/207) — but it does so by letting the DISPLAYED bound explode
// 2→3→5→7→…→10 (Law 2/Law 3 violation: it enforces a different quantity than the editor
// shows). Core holds the displayed bound at 2 for all 15 steps and honestly stalls at
// ~47% tracking (err ~110/207). The tracking gap is the standing solver-quality work +
// the LOOSE open Bernstein bound (#28) — it is NOT a reason to reroute to legacy.
// This test dies with the legacy optimizer; that deletion is its success condition.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

// The DISPLAYED bound (Law 3): complex numerator with w_im = 0 + robust signs.
const dispBound = (x: number[], y: number[], w: number[]) => {
  const { signs } = complexCurvatureConstraintState(x, y, w, w.map(() => 0), KNOTS, DEGREE, false, { re: 1, im: 0 })
  return cyclicSignChanges(signs, false)
}

describe('open-rational drag: legacy violates the displayed bound; core keeps it', () => {
  const k = 3, sx = X0[k], sy = Y0[k], move = { x: 55, y: 200 }

  it('legacy tracks further ONLY by letting the displayed bound grow', () => {
    let curve: Curve = {
      id: 'x', kind: 'rational', degree: DEGREE, closed: false,
      controlPoints: X0.map((x, i) => ({ x, y: Y0[i], w: W0[i] })), knots: KNOTS,
    }
    const start = dispBound(X0, Y0, W0)
    let maxBound = start
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const r = optimizeCurve(curve, sx + move.x * t, sy + move.y * t, k, { maxIterations: 20, enableBFGS: false }) as OptimizeRationalResult
      curve = {
        ...curve,
        controlPoints: r.controlPointsX.map((x, i) => ({ x, y: r.controlPointsY[i], w: r.controlPointsW[i] })),
      }
      maxBound = Math.max(maxBound, dispBound(r.controlPointsX, r.controlPointsY, r.controlPointsW))
    }
    // The measured violation (was 10 vs start 2). If this ever starts PASSING the
    // bound (maxBound === start), legacy got fixed — celebrate, re-measure tracking,
    // and update the routing rationale; don't just delete the assertion.
    expect(maxBound, 'legacy now holds the displayed bound?! re-evaluate routing rationale').toBeGreaterThan(start)
  }, 30000)

  it('core holds the displayed bound at every step of the same drag', () => {
    let cps: WeightedCP[] = X0.map((x, i) => ({ re: x, im: Y0[i], wRe: W0[i], wIm: 0 }))
    const start = dispBound(X0, Y0, W0)
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const r = slide('rational', cps, KNOTS, DEGREE, 'open', k, { x: sx + move.x * t, y: sy + move.y * t },
        { solver: 'primal-dual', jacobian: 'analytic', maxIterations: 20 })
      cps = r.points
      expect(dispBound(cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.wRe)), `step ${s}`).toBeLessThanOrEqual(start)
    }
    // Honest tracking level at the time of measurement: err ≈ 110 of 207 (~47%).
    // Solver-quality work (+ the tight open bound, #28) should push this DOWN over
    // time; the assertion is a canary against regressing far below today's level.
    const err = Math.hypot(cps[k].re - (sx + move.x), cps[k].im - (sy + move.y))
    expect(err).toBeLessThan(0.6 * Math.hypot(move.x, move.y))
  }, 30000)
})
