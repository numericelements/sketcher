import { describe, it, expect } from 'vitest'
import { solveTrustRegion, type Matrix } from '../ipopt/linearAlgebra'
import { solveTrustRegionBanded, denseToSymBandInterleaved } from '../ipopt/bandedTrustRegion'
import { symBandMatVec, ldlFactorBand, ldlSolveBand } from '../banded'

/**
 * Gate for the banded trust-region solve that will replace the dense Cholesky in
 * the IPOPT inner loop (the keystone of the linear-drag convergence). It must give
 * the SAME dogleg step as `solveTrustRegion` on a Hessian that is banded in the
 * interleaved [x₀,y₀,x₁,y₁,…] ordering — for Newton-inside-TR, dogleg-boundary, and
 * near-singular cases — so swapping it into IPOPT changes cost, not behaviour.
 */

// Deterministic small "random" (no Math.random → reproducible).
function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff - 0.5
  }
}

const toInterleaved = (v: number, nCP: number) => (v < nCP ? 2 * v : 2 * (v - nCP) + 1)

// A symmetric, SPD, BLOCK-ordered matrix whose interleaved permutation is banded
// with half-width ≤ b (so the banded extraction captures every nonzero → exact).
function bandedSPD(nCP: number, b: number, seed: number): Matrix {
  const n = 2 * nCP
  const H: Matrix = Array.from({ length: n }, () => new Array(n).fill(0))
  const rnd = lcg(seed)
  for (let vi = 0; vi < n; vi++) {
    for (let vj = 0; vj <= vi; vj++) {
      if (Math.abs(toInterleaved(vi, nCP) - toInterleaved(vj, nCP)) <= b) {
        const val = rnd() * 0.3
        H[vi][vj] += val
        if (vi !== vj) H[vj][vi] += val
      }
    }
  }
  for (let v = 0; v < n; v++) H[v][v] += n // diagonal dominance ⇒ SPD
  return H
}

describe('banded trust-region solve (IPOPT keystone)', () => {
  const nCP = 8
  const b = 5
  const reg = 1e-8
  const H = bandedSPD(nCP, b, 12345)
  const n = 2 * nCP
  const gradient = Array.from({ length: n }, (_, i) => Math.sin(i * 1.3) * 2 + 0.5)

  // Spans Newton-inside-TR (large δ), dogleg boundary (mid δ), and tiny-step (small δ).
  for (const delta of [1e-3, 0.02, 0.1, 0.5, 5, 1e6]) {
    it(`matches dense solveTrustRegion at δ=${delta}`, () => {
      const rD = solveTrustRegion(gradient, H, delta, reg)
      const rB = solveTrustRegionBanded(gradient, H, delta, reg, nCP, b)
      let maxAbs = 1e-12
      let maxDiff = 0
      for (let i = 0; i < n; i++) {
        maxAbs = Math.max(maxAbs, Math.abs(rD.step[i]))
        maxDiff = Math.max(maxDiff, Math.abs(rD.step[i] - rB.step[i]))
      }
      expect(maxDiff / maxAbs).toBeLessThan(1e-7)
      expect(rB.hitsBoundary).toBe(rD.hitsBoundary)
    })
  }

  it('the band extraction + LDL solve matches a dense solve of the same system', () => {
    // Sanity on the extraction itself: M⁻¹·rhs (banded) == H⁻¹·rhs (dense), with the
    // interleaved permutation applied to rhs and result.
    const M = denseToSymBandInterleaved(H, nCP, b)
    const rhs = Array.from({ length: n }, (_, i) => Math.cos(i) + 1)
    const rhsP = new Array<number>(n)
    for (let v = 0; v < n; v++) rhsP[toInterleaved(v, nCP)] = rhs[v]
    // Hx via the band (before factoring), then solve, should recover rhs.
    const Hx = symBandMatVec(M, rhsP)
    expect(ldlFactorBand(M)).toBe(true)
    const back = ldlSolveBand(M, Hx)
    let maxErr = 0
    for (let i = 0; i < n; i++) maxErr = Math.max(maxErr, Math.abs(back[i] - rhsP[i]))
    expect(maxErr).toBeLessThan(1e-9)
  })
})
