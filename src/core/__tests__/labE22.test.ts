// ============================================================================
// E22 (#26) — row scaling and the production engine: a VERIFIED NO-OP.
//
// Theory: with honest margins ≈ 0 (E21 constants) the log barrier is scale-
// invariant per row (∇log(f/s) = ∇f/f — s cancels), so constraint-row scaling
// cannot affect the trust-region trajectory. Measured (15-tick rational-open
// drags, rowScale ∈ {robust, none, envelope}):
//   TR:    uniform n=16 87.9×3 | uniform n=32 81.0×3 | clustered n=24 97.4×3
//          — identical in every cell. F1's conditioning worry does not apply
//          to the production engine's row space.
//   ipopt: clustered n=24 robust 2.2% → none 7.1% → ENVELOPE 59.5% — the
//          slack-based machinery IS scale-sensitive, and the envelope
//          equalizes the knot range exactly as F1 predicted. (Uniform cells
//          unchanged ~5–17%: ipopt's collapse there is step strategy, E13a.)
// The rowScale flag stays as a measured experimental lever; production default
// remains 'robust'. This test pins the TR invariance so a future margin or
// barrier change that silently BREAKS it (i.e., reintroduces scale
// sensitivity) is caught.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { slide, rational, familyBound, type WeightedCP } from '../index'

const d = 3
const openKnots = (nn: number, cluster = false) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) {
    let t = i / (inner - 1)
    if (cluster) t = t ** 2.5
    k.push(t)
  }
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const mk = (nn: number): WeightedCP[] => Array.from({ length: nn }, (_, i) => {
  const a = (2 * Math.PI * i) / nn
  return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
})

describe('E22: trust-region row-scale invariance (the log barrier cancels s)', () => {
  it('uniform n=16 and clustered n=24: identical tracking across all three regimes', () => {
    for (const [n, cluster] of [[16, false], [24, true]] as const) {
      const knots = openKnots(n, cluster)
      const results: number[] = []
      for (const rowScale of ['robust', 'none', 'envelope'] as const) {
        let cps = mk(n)
        const k = Math.floor(n / 3)
        const sx = cps[k].re, sy = cps[k].im
        const target = { x: sx + 55, y: sy + 200 }
        const startB = familyBound('rational', cps, knots, d, 'open')
        for (let s = 1; s <= 15; s++) {
          const t = s / 15
          cps = slide('rational', cps, knots, d, 'open', k,
            { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
            { solver: 'trust-region', jacobian: 'analytic', maxIterations: 25, rowScale }).points
          expect(familyBound('rational', cps, knots, d, 'open'), `${rowScale} tick ${s}`).toBeLessThanOrEqual(startB)
        }
        const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
        results.push(100 - (100 * err) / Math.hypot(55, 200))
      }
      // Invariance: the three regimes land within a whisker of each other.
      expect(Math.abs(results[0] - results[1]), `n=${n} robust vs none`).toBeLessThan(0.5)
      expect(Math.abs(results[0] - results[2]), `n=${n} robust vs envelope`).toBeLessThan(0.5)
    }
  }, 240000)
})
