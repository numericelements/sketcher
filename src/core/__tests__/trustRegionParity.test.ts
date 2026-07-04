import { describe, it, expect } from 'vitest'
import { slide, familyBound, rational, type WeightedCP } from '../index'

// PORT ACCEPTANCE for the trust-region barrier optimizer (the closed-curve port,
// lab notebook E15c): driving core's own problem via slide({solver:'trust-region'})
// must reproduce the measured column — 95/91/80% tracked at n=8/16/32 where core's
// other solvers reach 46/17/6 — with the displayed bound held at every step.
// Thresholds carry slack for platform float variation, not for regressions.

const d = 3
const openKnots = (nn: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const mk = (nn: number): WeightedCP[] => Array.from({ length: nn }, (_, i) => {
  const a = (2 * Math.PI * i) / nn
  return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
})

describe('trust-region port: E15c acceptance column', () => {
  const expected: Record<number, number> = { 8: 88, 16: 84, 32: 70 } // measured 95/91/80
  for (const nn of [8, 16, 32]) {
    it(`open rational n=${nn}: tracks ≥${expected[nn]}%, bound held every step`, () => {
      const knots = openKnots(nn)
      let cps = mk(nn)
      const k = Math.floor(nn / 3)
      const sx = cps[k].re, sy = cps[k].im
      const target = { x: sx + 55, y: sy + 200 }
      const start = familyBound('rational', cps, knots, d, 'open')
      for (let s = 1; s <= 15; s++) {
        const t = s / 15
        cps = slide('rational', cps, knots, d, 'open', k,
          { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
          { solver: 'trust-region', jacobian: 'analytic', maxIterations: 50 }).points
        expect(familyBound('rational', cps, knots, d, 'open'), `step ${s}: bound rose`).toBeLessThanOrEqual(start)
      }
      const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
      const tracked = 100 - (100 * err) / Math.hypot(55, 200)
      expect(tracked, `tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(expected[nn])
    }, 120000)
  }

  it('the F9 stall drag (n=7): ≥85% tracked, bound held', () => {
    const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
    const X0 = [-152, -180, -263, -152, 20, 180, 207]
    const Y0 = [17, -79, -184, -235, -212, -278, -346]
    const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]
    let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
    const k = 3, sx = X0[3], sy = Y0[3]
    const target = { x: sx + 55, y: sy + 200 }
    const start = familyBound('rational', cps, KNOTS, d, 'open')
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      cps = slide('rational', cps, KNOTS, d, 'open', k,
        { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
        { solver: 'trust-region', jacobian: 'analytic', maxIterations: 50 }).points
      expect(familyBound('rational', cps, KNOTS, d, 'open'), `step ${s}: bound rose`).toBeLessThanOrEqual(start)
    }
    const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    const tracked = 100 - (100 * err) / Math.hypot(55, 200)
    expect(tracked, `tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(85)
  }, 120000)
})
