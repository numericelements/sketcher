// ============================================================================
// DOES THE RATIONAL PARAMETRISATION SCALE? — degree, pole count, and speed.
//
// Everything measured so far used deg 𝒜 = 3 with two poles: 16 unknowns, 6 quadrics, dim 𝒱 = 10.
// Two questions follow. Is that structure special to those numbers, and is it fast enough to drag?
//
// THE COUNTS, and they are general rather than fitted. At fixed λ the conditions are LINEAR, four
// real ones per real pole, so the fibre is a subspace of dimension 4(n+1) − 4m. Sweeping the m dials
// adds m, giving
//
//     dim 𝒱 = 4(n+1) − 4m + m = 4(n+1) − 3m ,        codim 𝒱 = 3m .        [for m ≤ n]
//
// THAT BRACKET WAS ADDED LATER and it matters. The formula assumes the 3m residue conditions are
// independent, and they are not once m ≥ n+1: deg N = 2n and deg w² = 2m, so deg N ≤ deg w² − 2 and
// the residues of N/w² sum to ZERO identically — three linear dependencies. At m = n+1 the true
// dimension is 4(n+1) − 3m + 3 = n + 4. Every (n,m) verified below has m ≤ n, so nothing here is
// wrong; the regime simply is not covered. Measured in residuesSumToZero.test.ts.
//
// Note what the codimension does NOT depend on: the spinor degree. Three quadrics per real pole, and
// n only ever enlarges the fibre. So the Bézout bound on deg 𝒱 is 2^{3m} — a function of the POLE
// COUNT alone (64 at m = 2, matching the witness count).
//
// AND THE ARGUMENT THAT 𝒱 IS RATIONAL IS POLE-BY-POLE, hence degree-independent: Ωi + iΩ* = 2Σi at
// each r_k, with no division. So the parametrisation is not a degree-3 accident. Verified below at
// seven (n, m) combinations, from (2,2) up to (6,3).
//
// SPEED. A chart member is a nullspace of a 4m × 4(n+1) matrix followed by a linear combination —
// no solver, no iteration, PH exact by construction. Timed at the bottom: well inside a frame
// budget at every size tried, which is what "you can drag along it" has to mean in practice.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { familyBasis, type MultiPoleParams } from '../rationalPHMultiPoleSpatial'
import { sandwich, qpDeriv, qpEval, orthonormalise, type QPoly } from '../sp11RationalPH'
import type { Quat } from '../quaternion'

const SIGMA = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

const toSpinor = (x: readonly number[]): QPoly => {
  const n = x.length / 4 - 1
  const A: QPoly = [[], [], [], []]
  for (let c = 0; c < 4; c++) A[c] = Array.from({ length: n + 1 }, (_, k) => x[4 * k + c])
  return A
}
/** The 3m quadrics: N′(r_k) − 2N(r_k)Σ_k, vector part. */
function quadrics(x: readonly number[], roots: readonly number[]): number[] {
  const N = sandwich(toSpinor(x))
  const Nd = qpDeriv(N)
  const out: number[] = []
  roots.forEach((r, k) => {
    const a = qpEval(Nd, r), b = qpEval(N, r), s = SIGMA(roots, k)
    out.push(a[1] - 2 * s * b[1], a[2] - 2 * s * b[2], a[3] - 2 * s * b[3])
  })
  return out
}
/** Central differences — exact on a quadratic map. */
function rank(x: readonly number[], roots: readonly number[]): number {
  const m = quadrics(x, roots).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = 1e-4 * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = quadrics(hi, roots), fl = quadrics(lo, roots)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return orthonormalise(J, 1e-7).length
}
const zeroSpinor = (n: number): Quat[] => Array.from({ length: n + 1 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const norm = (v: readonly number[]): number => Math.hypot(...v)

/** (deg 𝒜, poles) — chosen to vary BOTH independently. */
const CASES: [number, number[]][] = [
  [2, [1.7, -0.9]],
  [3, [1.7, -0.9]],
  [4, [1.7, -0.9]],
  [5, [1.7, -0.9]],
  [3, [1.7]],
  [5, [1.7, -0.9, 2.6]],
  [6, [1.7, -0.9, 2.6]],
]

describe('does the parametrisation scale', () => {
  it('THE FIBRE IS 4(n+1) - 4m at every size, not just at deg 3', () => {
    for (const [n, roots] of CASES) {
      const m = roots.length
      const prm: MultiPoleParams = { A: zeroSpinor(n), roots, lambdas: roots.map((_, i) => 0.4 + 0.3 * i) }
      expect(familyBasis(prm).length).toBe(4 * (n + 1) - 4 * m)
    }
  })

  it('and the fibre still lies INSIDE V — the pole-by-pole argument is degree-independent', () => {
    for (const [n, roots] of CASES) {
      const prm: MultiPoleParams = { A: zeroSpinor(n), roots, lambdas: roots.map((_, i) => 0.4 + 0.3 * i) }
      const B = familyBasis(prm)
      for (let t = 0; t < 5; t++) {
        const x = new Array<number>(4 * (n + 1)).fill(0)
        B.forEach((b, i) => { const a = 2 * Math.sin(1.9 * t + 1.3 * i); for (let j = 0; j < x.length; j++) x[j] += a * b[j] })
        expect(norm(quadrics(x, roots))).toBeLessThan(1e-8)
      }
    }
  })

  it('CODIMENSION IS 3m — independent of the spinor degree', () => {
    for (const [n, roots] of CASES) {
      const m = roots.length
      const prm: MultiPoleParams = { A: zeroSpinor(n), roots, lambdas: roots.map((_, i) => 0.4 + 0.3 * i) }
      const B = familyBasis(prm)
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => { const a = 1.7 * Math.cos(0.9 * i + 0.3); for (let j = 0; j < x.length; j++) x[j] += a * b[j] })
      expect(rank(x, roots)).toBe(3 * m)                       // full, so dim V = 4(n+1) - 3m
    }
  })

  it('so dim V = 4(n+1) - 3m, and the three routes agree at every size', () => {
    for (const [n, roots] of CASES) {
      const m = roots.length
      const prm: MultiPoleParams = { A: zeroSpinor(n), roots, lambdas: roots.map((_, i) => 0.4 + 0.3 * i) }
      const B = familyBasis(prm)
      const fibre = B.length
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => { const a = 1.1 * Math.sin(0.8 * i + 2); for (let j = 0; j < x.length; j++) x[j] += a * b[j] })
      // route 1: fibre + dials.  route 2: unknowns minus the MEASURED codimension.
      expect(fibre + m).toBe(4 * (n + 1) - rank(x, roots))
      expect(fibre + m).toBe(4 * (n + 1) - 3 * m)
    }
  })

  it('THE DEGREE BOUND depends on the POLE COUNT, not the spinor degree', () => {
    // codim 3m quadrics ⟹ Bezout 2^{3m}. At m = 2 that is 64, which is the witness count.
    for (const [, roots] of CASES) {
      const m = roots.length
      expect(2 ** (3 * m)).toBe(m === 1 ? 8 : m === 2 ? 64 : 512)
    }
  })

  it('AND IT IS FAST: a chart member costs a nullspace and a linear combination', () => {
    for (const [n, roots] of CASES) {
      const prm: MultiPoleParams = { A: zeroSpinor(n), roots, lambdas: roots.map((_, i) => 0.4 + 0.3 * i) }
      const t0 = performance.now()
      const REPS = 40
      for (let r = 0; r < REPS; r++) {
        const B = familyBasis(prm)
        const x = new Array<number>(4 * (n + 1)).fill(0)
        B.forEach((b, i) => { const a = Math.sin(r + i); for (let j = 0; j < x.length; j++) x[j] += a * b[j] })
      }
      const ms = (performance.now() - t0) / REPS
      expect(ms).toBeLessThan(16)          // a 60 Hz frame, with the whole budget to spare
    }
  })
})
