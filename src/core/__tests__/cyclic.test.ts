import { describe, it, expect } from 'vitest'
import { symBandZero, symBandAdd, symBandAddDiag, ldlFactorBand } from '../banded'
import { solveArrowhead, denseSolve, denseToArrowhead } from '../cyclic'

/**
 * Gate for the closed-curve arrowhead solve (port of ne-core cyclic.rs's
 * arrowhead_solves_cyclic_banded_system): build an SPD CYCLIC-banded matrix
 * (diagonal + off-diagonals that wrap n−1↔0), split it into a plain band A plus the
 * low-rank seam block E_SS, then assert solveArrowhead recovers a known x from
 * rhs = M·x — i.e. it inverts the cyclic system the band alone can't represent.
 */

const NV = 12
const B = 2
const cyclicDist = (i: number, j: number) => {
  const d = Math.abs(i - j)
  return Math.min(d, NV - d)
}
// Reference cyclic matrix M (independent of the band/seam split): diag 4, and for
// i≠j within cyclic distance B, entry 0.5/dist.
const entry = (i: number, j: number) => (i === j ? 4 : cyclicDist(i, j) <= B ? 0.5 / cyclicDist(i, j) : 0)
const matvec = (x: number[]) => x.map((_, i) => x.reduce((s, xj, j) => s + entry(i, j) * xj, 0))

describe('closed-curve arrowhead solve (cyclic.ts)', () => {
  it('recovers x from a cyclic-banded SPD system (band + seam block)', () => {
    // Split M into a plain band A (non-wrap |i−j|≤B) + seam block E_SS (the wrap pairs).
    const seam = [0, 1, NV - 2, NV - 1] // the 2b variables straddling the seam
    const idx = new Map<number, number>(seam.map((v, k) => [v, k]))
    const a = symBandZero(NV, B)
    const s = seam.length
    const eSS: number[][] = Array.from({ length: s }, () => new Array<number>(s).fill(0))
    for (let i = 0; i < NV; i++) {
      symBandAddDiag(a, i, 4)
      for (let j = 0; j < i; j++) {
        const v = entry(i, j)
        if (v === 0) continue
        if (Math.abs(i - j) <= B) {
          symBandAdd(a, i, j, v) // local → band
        } else {
          // wrap pair → seam block (symmetrized)
          const ia = idx.get(i)!, ib = idx.get(j)!
          eSS[ia][ib] += v
          eSS[ib][ia] += v
        }
      }
    }
    expect(ldlFactorBand(a)).toBe(true)

    const xTrue = Array.from({ length: NV }, (_, i) => 1 + i * 0.7 - (i % 3))
    const rhs = matvec(xTrue)
    const x = solveArrowhead(a, seam, eSS, rhs)
    let maxErr = 0
    for (let i = 0; i < NV; i++) maxErr = Math.max(maxErr, Math.abs(x[i] - xTrue[i]))
    expect(maxErr).toBeLessThan(1e-9)
  })

  it('denseSolve solves a small dense system', () => {
    const A = [[2, 1, 0], [1, 3, 1], [0, 1, 2]]
    const xTrue = [1, -2, 3]
    const b = A.map((row) => row.reduce((s, v, j) => s + v * xTrue[j], 0))
    const x = denseSolve(A, b)
    for (let i = 0; i < 3; i++) expect(Math.abs(x[i] - xTrue[i])).toBeLessThan(1e-12)
  })

  it('denseToArrowhead + solveArrowhead == dense solve of the same matrix', () => {
    // A dense BLOCK-ordered SPD matrix; extract arrowhead at band half-width b and
    // confirm the solve matches a dense solve (any off-band entries → seam block).
    const nCP = 6
    const n = 2 * nCP
    let seed = 99
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5 }
    const H: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) { const v = rnd() * 0.2; H[i][j] = v; H[j][i] = v }
      H[i][i] = n // diagonally dominant ⇒ SPD
    }
    const ah = denseToArrowhead(H, nCP, 3)
    expect(ldlFactorBand(ah.band)).toBe(true)
    const rhs = Array.from({ length: n }, (_, i) => Math.cos(i) + 0.5)
    // solveArrowhead works in INTERLEAVED order (band/seam are interleaved); permute
    // the rhs in and the result out, matching the solveTrustRegionArrowhead wrapper.
    const toInt = (v: number) => (v < nCP ? 2 * v : 2 * (v - nCP) + 1)
    const rhsP = new Array<number>(n)
    for (let v = 0; v < n; v++) rhsP[toInt(v)] = rhs[v]
    const xP = solveArrowhead(ah.band, ah.seam, ah.eSS, rhsP)
    const x = new Array<number>(n)
    for (let v = 0; v < n; v++) x[v] = xP[toInt(v)]
    const xRef = denseSolve(H, rhs)
    let maxErr = 0
    for (let i = 0; i < n; i++) maxErr = Math.max(maxErr, Math.abs(x[i] - xRef[i]))
    expect(maxErr).toBeLessThan(1e-9)
  })

  it('s=0 (no seam) reduces to the plain banded solve', () => {
    const a = symBandZero(5, 1)
    for (let i = 0; i < 5; i++) symBandAddDiag(a, i, 3)
    for (let i = 1; i < 5; i++) symBandAdd(a, i, i - 1, 1)
    const aRef = (x: number[]) => x.map((_, i) => 3 * x[i] + (i > 0 ? x[i - 1] : 0) + (i < 4 ? x[i + 1] : 0))
    const xTrue = [2, -1, 4, 0, 3]
    const rhs = aRef(xTrue)
    expect(ldlFactorBand(a)).toBe(true)
    const x = solveArrowhead(a, [], [], rhs)
    for (let i = 0; i < 5; i++) expect(Math.abs(x[i] - xTrue[i])).toBeLessThan(1e-9)
  })
})
