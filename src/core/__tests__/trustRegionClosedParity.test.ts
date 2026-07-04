import { it, expect } from 'vitest'
import { slide, familyBound, rational, complex, type WeightedCP } from '../index'
const d = 3
const periodicKnots = (nn: number) => Array.from({ length: nn }, (_, i) => i / nn)
const mk = (fam: 'rational' | 'complex', nn: number): WeightedCP[] => Array.from({ length: nn }, (_, i) => {
  const a = (2 * Math.PI * i) / nn
  const x = 180 * Math.cos(a) + 12 * Math.sin(3 * a)
  const y = 95 * Math.sin(a) + 9 * Math.cos(2 * a)
  return fam === 'rational' ? rational(x, y, 1 + 0.15 * Math.cos(2 * a)) : complex(x, y, 1 + 0.1 * Math.cos(a), 0.06 * Math.sin(a))
})
// CLOSED-curve acceptance for the banded trust-region (seam permutation +
// bordered Cholesky). Measured at pin time (dense-TR gave the same tracking at
// 2-2.5x the cost; the editor's previous primal-dual path: rational 79/55/18%,
// complex 72/54/19%):
//   rational: 89/91/82%  @107/250/549 ms   complex: 88/79/73% @146/140/591 ms
it('closed TR column: tracking floors + bound held', () => {
  for (const fam of ['rational', 'complex'] as const) {
    for (const nn of [8, 16, 32]) {
      const knots = periodicKnots(nn)
      let cps = mk(fam, nn)
      const k = Math.floor(nn / 3)
      const sx = cps[k].re, sy = cps[k].im
      const target = { x: sx + 55, y: sy + 200 }
      const start = familyBound(fam, cps, knots, d, 'closed')
      let maxB = start
      const t0 = performance.now()
      for (let s = 1; s <= 15; s++) {
        const t = s / 15
        cps = slide(fam, cps, knots, d, 'closed', k,
          { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
          { solver: 'trust-region', jacobian: 'analytic', maxIterations: 50 }).points
        maxB = Math.max(maxB, familyBound(fam, cps, knots, d, 'closed'))
      }
      const ms = (performance.now() - t0) / 15
      const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
      const tracked = 100 - 100 * err / Math.hypot(55, 200)
      const floors: Record<string, Record<number, number>> = {
        rational: { 8: 80, 16: 82, 32: 72 },
        complex: { 8: 78, 16: 68, 32: 62 },
      }
      expect(maxB, `${fam} n=${nn}: bound rose`).toBeLessThanOrEqual(start)
      expect(tracked, `${fam} n=${nn}: tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(floors[fam][nn])
      console.log(`CLOSED-TR ${fam.padEnd(8)} n=${String(nn).padStart(2)}: tracked ${tracked.toFixed(0).padStart(4)}%  bound ${start}->${maxB}  ${ms.toFixed(0).padStart(5)}ms/tick`)
    }
  }
}, 600000)
