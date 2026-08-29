/**
 * PROPERNESS BY TRIANGULAR VANISHING — the exact combinatorial classification.
 *
 * The a-priori bound (properness) for a grip asks: can all held points coincide while the
 * spinor stays on the unit sphere? The KILL-CASCADE decides the provable cases: a block whose
 * surviving pair terms reduce to a single diagonal w·S(𝒜ⱼ) forces 𝒜ⱼ = 0 (|S(q)| = |q|²);
 * iterate to fixpoint. All coefficients killed ⟹ escape set = {0} ⟹ the held map is proper
 * (coercive: |targets| ≳ |𝒜|²) — the {0,1,3,5} proof, mechanised (docs/SURJECTIVITY.md).
 *
 * Two durable facts pinned:
 *   · which grips the argument proves — at degree 9 exactly the FIVE perfectly-spread grips;
 *   · that the argument's limit is REAL, not an artifact: {0,2,4,5,6,9} holds both endpoints
 *     yet has a genuine escape (measured sphere-minimum 6e-36 — block sums let S(𝒜₀) cancel
 *     against polar terms inside a gap), so plain properness is NOT universal and the general
 *     lemma must quotient the escape directions.
 */
import { describe, expect, it } from 'vitest'

function* choose(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) { yield [...acc]; return }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i); yield* choose(n, k, i + 1, acc); acc.pop()
  }
}

/** Coefficient indices NOT killed by the cascade (empty ⟹ properness proven for the grip). */
function survivors(m: number, grip: readonly number[]): number[] {
  const killed = new Set<number>()
  const blocks: Array<Array<[number, number]>> = []
  for (let k = 0; k + 1 < grip.length; k++) {
    const terms: Array<[number, number]> = []
    for (let j = grip[k]; j < grip[k + 1]; j++) {
      for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) {
        const b = j - a
        if (b >= a) terms.push([a, b])
      }
    }
    blocks.push(terms)
  }
  for (let pass = 0; pass < 2 * m + 4; pass++) {
    let progress = false
    for (const terms of blocks) {
      const live = terms.filter(([a, b]) => !killed.has(a) && !killed.has(b))
      if (live.length === 1 && live[0][0] === live[0][1] && !killed.has(live[0][0])) {
        killed.add(live[0][0])
        progress = true
      }
    }
    if (!progress) break
  }
  return Array.from({ length: m + 1 }, (_, j) => j).filter((j) => !killed.has(j))
}

const properGrips = (m: number): string[] =>
  [...choose(2 * m + 2, m + 2)].filter((g) => survivors(m, g).length === 0).map((g) => `{${g}}`)

describe('the kill-cascade properness classification', () => {
  it('degree 9: exactly the five perfectly-spread grips', () => {
    expect(properGrips(4)).toEqual([
      '{0,1,3,5,7,9}', '{0,1,3,5,8,9}', '{0,1,3,6,8,9}', '{0,1,4,6,8,9}', '{0,2,4,6,8,9}',
    ])
  })

  it('degree 5 includes the minimal scattered grip {0,1,3,5}', () => {
    const p = properGrips(2)
    expect(p).toContain('{0,1,3,5}')
    // Pin the whole degree-5 and degree-7 counts so a change is always a conscious event.
    expect(p.length).toBe(3)
    expect(properGrips(3).length).toBe(4)
  })

  it('the argument does NOT reach {0,2,4,5,6,9} — the measured block-cancellation escape', () => {
    expect(survivors(4, [0, 2, 4, 5, 6, 9]).length).toBeGreaterThan(0)
  })
})
