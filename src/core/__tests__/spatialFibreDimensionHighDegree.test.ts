// ============================================================================
// THE DIMENSION RULE PAST THE FIGURE'S DEGREES — m at every grip, degrees 9 and 11.
//
// Eric's question (2026-08-24): degrees 3, 5, 7 give 1-, 2-, 3-parameter families — does
// degree 9 give 4? The count says yes (4m+6 − 3(m+2) = m) but the count is only the answer
// where the held-point rows stay independent, and rank DOES drop in this territory (the
// spatial cubic takes C¹ Hermite data at rank 7 of 9). Measured: dimension is m at every one
// of the C(10,6) = 210 grips of degree 9 and C(12,7) = 792 of degree 11, gauge exactly in the
// kernel — and off-CI the sweep was run through degree 15 (3003 + 11440 more grips, same
// result, ~26s, too slow to pin). No rank drop has ever been observed for a control-point grip.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { fibreDimension } from '../spatialFibre'
import { seedFor } from '../../talks/ph-polynomial/SpatialSubsetFigure'

function* choose(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) { yield [...acc]; return }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i)
    yield* choose(n, k, i + 1, acc)
    acc.pop()
  }
}

describe('the spatial family dimension at high degree', () => {
  it('degrees 9 and 11: every grip leaves exactly an m-parameter family', () => {
    for (const m of [4, 5]) {
      const seed = seedFor(m)
      let count = 0
      for (const grip of choose(2 * m + 2, m + 2)) {
        const r = fibreDimension(seed, grip)
        expect(r.dimension, `degree ${2 * m + 1}, grip {${grip}}`).toBe(m)
        count++
      }
      expect(count).toBe(m === 4 ? 210 : 792)
    }
  }, 300_000)
})
