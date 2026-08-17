// ============================================================================
// HOW BIG IS THE SPATIAL PH HERMITE FAMILY? — the count that killed T^{k−1}.
//
// A spatial polynomial PH curve of degree 2k−1 has a generator 𝒜 with k quaternion coefficients,
// 4k real unknowns. C¹ Hermite data is c(0), c(1), c′(0), c′(1); the integration constant absorbs
// c(0), leaving NINE real conditions on the spinor:
//
//     c′(0) = 𝒜(0) i 𝒜(0)*      c′(1) = 𝒜(1) i 𝒜(1)*      Δc = ∫₀¹ 𝒜 i 𝒜*
//
// NINE, and it does not grow with k. So the family of curves is
//
//     4k  −  rank  −  1 (the gauge 𝒜 ↦ 𝒜e^{iθ})     =  4k − 10   once the rank is full
//
// which is 2 at k = 3 and SIX at k = 4 — not k−1 = 3. The k−1 formula belongs to a different
// problem, point interpolation with k+1 points, where the conditions DO grow as 3k; the two agree at
// k = 3 and nowhere else. `RATIONAL_PH_STATE` §5 had the degree-8 row (16 free, rank 9, six) before
// the claim was ever made.
//
// The gauge is checked here rather than assumed: the direction 𝒜 ↦ 𝒜·i is verified to lie in the
// Jacobian's kernel, which is what earns the −1.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { sandwich, orthonormalise, type QPoly } from '../sp11RationalPH'

/** k quaternion coefficients (power basis) packed as 4k reals. */
const toQPoly = (x: readonly number[], k: number): QPoly =>
  [0, 1, 2, 3].map((c) => Array.from({ length: k }, (_, j) => x[4 * j + c])) as QPoly

const evalAt = (p: readonly number[], t: number): number => p.reduceRight((s, c) => s * t + c, 0)
const integrate = (p: readonly number[]): number => p.reduce((s, c, m) => s + c / (m + 1), 0)

/** The nine C¹ Hermite numbers: c′(0), c′(1), ∫₀¹c′. */
function hermite(x: readonly number[], k: number): number[] {
  const N = sandwich(toQPoly(x, k))
  const out: number[] = []
  for (const comp of [1, 2, 3]) out.push(evalAt(N[comp], 0))
  for (const comp of [1, 2, 3]) out.push(evalAt(N[comp], 1))
  for (const comp of [1, 2, 3]) out.push(integrate(N[comp]))
  return out
}

function jacobian(x: readonly number[], k: number): number[][] {
  const base = hermite(x, k)
  const cols = x.map((_, j) => {
    const h = 1e-6 * Math.max(1, Math.abs(x[j]))
    const up = x.slice(); up[j] += h
    const dn = x.slice(); dn[j] -= h
    const fu = hermite(up, k), fd = hermite(dn, k)
    return fu.map((v, i) => (v - fd[i]) / (2 * h))
  })
  return base.map((_, i) => cols.map((c) => c[i]))
}

/** d/dθ (𝒜 e^{iθ}) at θ = 0 is 𝒜·i — the gauge direction, in packed coordinates. */
function gaugeDirection(x: readonly number[], k: number): number[] {
  const out = new Array(4 * k).fill(0)
  for (let j = 0; j < k; j++) {
    const [a, b, c, d] = [x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]]
    // (a + bi + cj + dk)·i = −b + a i + d j − c k
    out[4 * j] = -b; out[4 * j + 1] = a; out[4 * j + 2] = d; out[4 * j + 3] = -c
  }
  return out
}

describe('the spatial C¹ Hermite family is 4k − 10, not k − 1', () => {
  let seed = 7
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed / 2147483648) * 2 - 1 }

  for (const k of [2, 3, 4, 5]) {
    it(`k = ${k} (degree ${2 * k - 1})`, () => {
      // average over several random spinors: the rank is generic, not a property of one point
      let bestRank = 0
      let gaugeWorst = 0
      for (let trial = 0; trial < 5; trial++) {
        const x = Array.from({ length: 4 * k }, rnd)
        const J = jacobian(x, k)
        bestRank = Math.max(bestRank, orthonormalise(J, 1e-8).length)
        const g = gaugeDirection(x, k)
        const Jg = J.map((row) => row.reduce((s, v, i) => s + v * g[i], 0))
        const scale = Math.max(...J.flat().map(Math.abs)) * Math.hypot(...g)
        gaugeWorst = Math.max(gaugeWorst, Math.max(...Jg.map(Math.abs)) / scale)
      }
      const dim = 4 * k - bestRank - 1
      console.log(
        `k=${k}  degree ${2 * k - 1}   unknowns ${4 * k}   rank ${bestRank} of 9   ` +
        `family ${dim}      4k−10 = ${4 * k - 10}    k−1 = ${k - 1}`,
      )
      expect(gaugeWorst).toBeLessThan(1e-7)          // the gauge really is in the kernel
      if (k >= 3) {
        expect(bestRank).toBe(9)
        expect(dim).toBe(4 * k - 10)
      }
    })
  }
})
