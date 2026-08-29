/**
 * PROPERNESS BY TRIANGULAR VANISHING — an exact combinatorial CERTIFICATE (not a
 * classification; the lean companion's correction, verified 2026-08-30).
 *
 * The a-priori bound (properness) for a grip asks: can all held points coincide while the
 * spinor stays on the unit sphere? The KILL-CASCADE certifies the easy cases: a block whose
 * surviving pair terms reduce to a single diagonal w·S(𝒜ⱼ) forces 𝒜ⱼ = 0 (|S(q)| = |q|²);
 * iterate to fixpoint. All coefficients killed ⟹ escape set = {0} ⟹ the held map is proper
 * (coercive: |targets| ≳ |𝒜|²) — the {0,1,3,5} proof, mechanised (docs/SURJECTIVITY.md).
 * The kill uses only anisotropy of the square, so it holds verbatim over ℂ — where a full
 * kill upgrades to complete surjectivity (square homogeneous + trivial zero fibre ⟹ onto).
 *
 * Honesty in both directions, pinned:
 *   · the certificate can MISS proper grips — {0,2,3,5} at degree 5 is proper (companion's
 *     i-circle proof, numeric sphere-min 1.0e-1) yet survives the cascade;
 *   · genuine escapes exist — {0,2,4,5,6,9} holds both endpoints, measured sphere-min 6e-36;
 *   · THE FILTER: at hold-(m+3) the certificate still fires — the degree-7 square case and
 *     three of the nine degree-9 infeasibility-candidate grips are (interior-)proper — so
 *     properness holds where surjectivity is KNOWN false, refuting the plain
 *     open-closed-connected program and locating the true difficulty in critical-value
 *     NON-SEPARATION. A change in any of these is a discovery: update the doc.
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

  it('the certificate misses the proper grip {0,2,3,5} — certificate, not classification', () => {
    expect(survivors(2, [0, 2, 3, 5]).length).toBeGreaterThan(0)
  })

  it('THE FILTER: the certificate fires at hold-(m+3), where surjectivity is false', () => {
    // Degree 7 square case: interior coefficients all killed (survivor 𝒜₃ feeds only unheld
    // top legs) — yet half of all six-point polygons are infeasible (SEPTIC_SIX_POINTS).
    expect(survivors(3, [0, 1, 2, 3, 4, 5])).toEqual([3])
    // Three of the nine degree-9 hold-7 candidate grips: FULL kills — proper outright, with
    // the strongest measured infeasibility. Properness therefore cannot separate m+2 from
    // m+3; it does make each candidate's infeasible region OPEN (robust evidence).
    for (const g of [[0, 1, 3, 4, 5, 8, 9], [0, 1, 3, 5, 7, 8, 9], [0, 2, 3, 4, 6, 8, 9]]) {
      expect(survivors(4, g), `{${g}}`).toEqual([])
    }
  })
})
