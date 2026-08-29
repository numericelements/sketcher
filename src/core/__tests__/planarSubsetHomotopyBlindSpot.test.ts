/**
 * THE HOMOTOPY'S DIVERGENCE VERDICT IS NOT AN EMPTINESS CERTIFICATE — pinned specimen.
 *
 * Degree 9 (K=5), grip {0,1,2,3,4,8} — a grade-1, count-1 grip — at this configuration:
 * `solveSubset` reports all 32 paths diverged (robust to six independent gammas AND to raising
 * `big` to 1e9; a 0.15-perturbed neighbourhood reads empty too). Yet the solution EXISTS: the
 * grip's consecutive prefix cascades exactly (divisions), and Newton from cascade-seeded tails
 * finds it, verified against every held point — with generator coefficients of magnitude ~5e3.
 * The finite root's basin is simply invisible to the homotopy in this near-degenerate region
 * (nearby, the grade-1 tail division w₄ = RHS/B approaches B = 0, and the one finite root runs
 * huge; the other two 2026-08-29 specimens reached |w| ≈ 7e5).
 *
 * Two facts pinned, per docs/SURJECTIVITY.md:
 *   1. the homotopy still misses it (if THIS flips, the tracker improved — update the doc);
 *   2. the cascade-seeded Newton solution exists and verifies (must never regress).
 *
 * The same lesson vetted the 3D hold-7 candidates: they RESIST seeds up to scale 2000, so the
 * boundary evidence stands; this blind spot was a 2D tracker artifact, not a discriminant.
 */
import { describe, expect, it } from 'vitest'
import type { Complex } from '../complex'
import { cadd, cdiv, cmul, cnorm, cscale, csub } from '../complex'
import { solveSubset, trackSolutions, type PlanarPHSubsetSolution } from '../planarPHSubset'

const GRIP = [0, 1, 2, 3, 4, 8]
// The exact sampled configuration (sweep seed: grip-hash with cfg 0).
const TARGETS: Complex[] = (() => {
  let s = GRIP.reduce((acc, i) => 31 * acc + i, 7) >>> 0
  const r = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
  return Array.from({ length: 6 }, () => ({ re: 4 * r() - 2, im: 4 * r() - 2 }))
})()

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
const csqrt = (z: Complex): Complex => {
  const r = cnorm(z)
  const th = Math.atan2(z.im, z.re) / 2
  return { re: Math.sqrt(r) * Math.cos(th), im: Math.sqrt(r) * Math.sin(th) }
}

/** w₀…w₃ from the four prefix legs, by the exact 2D division cascade (K = 5). */
function prefixCascade(targets: readonly Complex[]): Complex[] {
  const K = 5
  const N = targets.slice(1).map((t, j) => cscale(csub(t, targets[j]), 2 * K - 1))
  const w: Complex[] = [csqrt(N[0])]
  for (let j = 1; j <= 3; j++) {
    let rest: Complex = { re: 0, im: 0 }
    for (let a = 1; a <= j - 1; a++) {
      const b = j - a
      if (b < a) continue
      const wt = ((a === b ? 1 : 2) * binom(K - 1, a) * binom(K - 1, b)) / binom(2 * K - 2, j)
      rest = cadd(rest, cscale(cmul(w[a], w[b]), wt))
    }
    const cj = (2 * binom(K - 1, j)) / binom(2 * K - 2, j)
    w.push(cdiv(cscale(csub(N[j], rest), 1 / cj), w[0]))
  }
  return w
}

describe('the homotopy blind spot (degree 9, grade-1 grip, huge-root region)', () => {
  it('the homotopy still reads this configuration as empty', () => {
    const rep = solveSubset(5, GRIP, TARGETS)
    expect(rep.solutions.length, 'the tracker found the huge root — an improvement, not a regression: update docs/SURJECTIVITY.md').toBe(0)
    expect(rep.diverged).toBe(32)
    expect(rep.failed).toBe(0)
  })

  it('the solution exists: cascade-seeded Newton finds and verifies it', () => {
    const pre = prefixCascade(TARGETS)
    let s = 987
    const r = () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 2 ** 32
    }
    const seeds = Array.from({ length: 200 }, (_, k) => {
      const scale = [1, 10, 100, 1000][k % 4]
      return {
        w: Array.from({ length: 5 }, (_, a) =>
          a < 4 ? { ...pre[a] } : { re: scale * (2 * r() - 1), im: scale * (2 * r() - 1) }),
      } as PlanarPHSubsetSolution
    })
    const found = trackSolutions(5, GRIP, TARGETS, seeds)
      .filter((x): x is PlanarPHSubsetSolution => x !== null)
      .filter((sol) => GRIP.every((idx, i) => cnorm(csub(sol.controlPoints[idx], TARGETS[i])) < 1e-7))
    expect(found.length).toBeGreaterThan(0)
    const mag = Math.max(...found[0].w.map(cnorm))
    expect(mag).toBeGreaterThan(1e3) // the root really is huge — that is WHY the tracker misses it
  })
})
