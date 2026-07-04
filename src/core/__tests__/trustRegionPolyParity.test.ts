import { it, expect } from 'vitest'
import { slide, familyBound, poly, type WeightedCP } from '../index'
const d = 3
const openKnots = (nn: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (nn: number) => Array.from({ length: nn }, (_, i) => i / nn)
const mk = (nn: number): WeightedCP[] => Array.from({ length: nn }, (_, i) => {
  const a = (2 * Math.PI * i) / nn
  return poly(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a))
})
// POLYNOMIAL acceptance on the banded trust-region. Measured at pin time
// (census ipopt route: open 73/41/8%, closed 85/37/13%):
//   open: 90/78/79% @8/15/40ms     closed: 87/77/94% @15/30/96ms
it('polynomial TR column: floors + bound held', () => {
  for (const topo of ['open', 'closed'] as const) {
    for (const nn of [8, 16, 32]) {
      const knots = topo === 'open' ? openKnots(nn) : periodicKnots(nn)
      let cps = mk(nn)
      const k = Math.floor(nn / 3)
      const sx = cps[k].re, sy = cps[k].im
      const target = { x: sx + 55, y: sy + 200 }
      const start = familyBound('polynomial', cps, knots, d, topo)
      let maxB = start
      const t0 = performance.now()
      for (let s = 1; s <= 15; s++) {
        const t = s / 15
        cps = slide('polynomial', cps, knots, d, topo, k,
          { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
          { solver: 'trust-region', jacobian: 'ad', maxIterations: 50 }).points
        maxB = Math.max(maxB, familyBound('polynomial', cps, knots, d, topo))
      }
      const ms = (performance.now() - t0) / 15
      const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
      const tracked = 100 - 100 * err / Math.hypot(55, 200)
      const floors: Record<string, Record<number, number>> = {
        open: { 8: 82, 16: 70, 32: 70 },
        closed: { 8: 78, 16: 68, 32: 85 },
      }
      expect(maxB, `${topo} n=${nn}: bound rose`).toBeLessThanOrEqual(start)
      expect(tracked, `${topo} n=${nn}: tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(floors[topo][nn])
      console.log(`POLY-TR ${topo.padEnd(6)} n=${String(nn).padStart(2)}: tracked ${(100 - 100 * err / Math.hypot(55, 200)).toFixed(0).padStart(4)}%  bound ${start}->${maxB}  ${ms.toFixed(0).padStart(5)}ms/tick  (census ipopt: ${topo === 'open' ? { 8: 73, 16: 41, 32: 8 }[nn] : { 8: 85, 16: 37, 32: 13 }[nn]}%)`)
    }
  }
}, 600000)
