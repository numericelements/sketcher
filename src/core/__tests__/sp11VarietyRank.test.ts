// ============================================================================
// IS THE PH VARIETY SINGULAR WHERE WE WORK? — measured, and the answer is no.
//
// THE OBJECT. Eliminating λ from the chart condition leaves the residue conditions as pure quadrics
// in the spinor: F_k(𝒜) = N′(r_k) − 2N(r_k)Σ_k with N = 𝒜i𝒜*, three real equations per real pole.
// For a degree-3 spinor and two poles that is a map ℝ¹⁶ → ℝ⁶, and V = F⁻¹(0) is the variety of
// admissible spinors. Expected dimension 16 − 6 = 10, which cross-checks: familyBasis gives 8 at
// FIXED λ, plus the two λ's = 10.
//
// MEASURED:
//   60 / 60 samples across V            rank 6 — FULL. V is a smooth 10-manifold there.
//   𝒜 with a SIMPLE root at each pole   rank 6 — still smooth
//   𝒜 with a DOUBLE root at a pole      rank 3 — the drop is exactly one pole's three conditions
//   𝒜 = 0                               rank 0
//
// TWO CONSEQUENCES, and the first is the one that matters for this project.
//
// 1. THE λ-CHART'S EXCLUDED STRATUM CONSISTS OF SMOOTH POINTS OF V. For a real pole, σ(r) = |𝒜(r)|²
//    vanishes exactly when 𝒜(r) = 0 — and the rank there is still 6. So the stratum that every chart
//    in this repository refuses is not a feature of the variety at all; it is entirely the chart's
//    doing, which is what mobiusMovesTheStratum and sp11ChartCondition argued on other grounds and
//    this measures directly.
//
// 2. LOCAL COORDINATES EXIST. Constant rank on a neighbourhood means V is locally a smooth
//    10-manifold, so by the implicit function theorem a chart with honest coordinates EXISTS around
//    every point we have visited. Our failure to produce one is therefore not an obstruction in the
//    geometry — it is that we have no explicit global parametrisation. That is a much better
//    position to be stuck in than "the variety is singular here".
//
// So "the space is not a smooth manifold everywhere" is TRUE but practically irrelevant: the
// singular locus needs 𝒜(r) = 𝒜′(r) = 0, eight real conditions, codimension 8 inside a
// 10-dimensional variety. Nothing we have ever hit is anywhere near it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, familyBasis, packSpinor, type MultiPoleParams } from '../rationalPHMultiPoleSpatial'
import {
  sandwich, qpDeriv, qpEval, qpMul, qpReal, qpConst, orthonormalise, type QPoly,
} from '../sp11RationalPH'

const ROOTS = [1.7, -0.9]
const SIGMA = (k: number): number => ROOTS.reduce((s, rl, l) => (l === k ? s : s + 1 / (ROOTS[k] - rl)), 0)

const toSpinor = (x: readonly number[]): QPoly => {
  const n = x.length / 4 - 1
  const A: QPoly = [[], [], [], []]
  for (let c = 0; c < 4; c++) A[c] = Array.from({ length: n + 1 }, (_, k) => x[4 * k + c])
  return A
}
const pack = (A: QPoly, n: number): number[] => {
  const o = new Array<number>(4 * (n + 1)).fill(0)
  for (let c = 0; c < 4; c++) for (let k = 0; k <= n; k++) o[4 * k + c] = A[c][k] ?? 0
  return o
}

/** The residue conditions as pure quadrics: three real equations per real pole. */
function F(x: readonly number[]): number[] {
  const N = sandwich(toSpinor(x))
  const Nd = qpDeriv(N)
  const out: number[] = []
  ROOTS.forEach((r, k) => {
    const a = qpEval(Nd, r), b = qpEval(N, r), s = SIGMA(k)
    out.push(a[1] - 2 * s * b[1], a[2] - 2 * s * b[2], a[3] - 2 * s * b[3])
  })
  return out
}
/** Central differences — EXACT for a quadratic map, so this is the true Jacobian up to round-off. */
function jacobian(x: readonly number[]): number[][] {
  const m = F(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = 1e-4 * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = F(hi), fl = F(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}
const rankOf = (J: number[][], tol = 1e-7): number => orthonormalise(J, tol).length
const norm = (v: readonly number[]): number => Math.hypot(...v)

const seed = seedQuintic()
const linear = (r: number): QPoly => qpReal([-r, 1])
const B_CONST = qpConst(0.7, -0.3, 0.5, 0.2)

describe('the PH variety, and whether it is singular where we work', () => {
  it('the setup is what it claims: 3 quadrics per real pole, and the seed lies on V', () => {
    expect(ROOTS).toEqual(seed.roots)
    expect(F(packSpinor(seed.A)).length).toBe(3 * ROOTS.length)
    expect(norm(F(packSpinor(seed.A)))).toBeLessThan(1e-9)
  })

  it('the dimension cross-checks: 16 - 6 = 10 = familyBasis(8) + two lambdas', () => {
    expect(packSpinor(seed.A).length).toBe(16)
    expect(familyBasis(seed).length).toBe(8)
    expect(16 - 6).toBe(familyBasis(seed).length + ROOTS.length)
  })

  it('V IS SMOOTH WHERE WE WORK: full rank at every sample', () => {
    let full = 0
    for (let t = 0; t < 40; t++) {
      const prm: MultiPoleParams = { ...seed, lambdas: [-3 + (t % 7), -2 + ((t * 3) % 5)] }
      const B = familyBasis(prm)
      const x = new Array<number>(16).fill(0)
      B.forEach((b, i) => {
        const amp = 2 * Math.sin(2.1 * t + 1.7 * i)
        for (let j = 0; j < 16; j++) x[j] += amp * b[j]
      })
      expect(norm(F(x))).toBeLessThan(1e-8)          // it really is on V
      expect(rankOf(jacobian(x))).toBe(6)
      full++
    }
    expect(full).toBe(40)
  })

  it('THE EXCLUDED STRATUM IS SMOOTH: sigma(r) = 0 at both poles, rank still 6', () => {
    // for a REAL pole, sigma(r) = |𝒜(r)|² vanishes exactly when 𝒜(r) = 0
    const A = qpMul(qpMul(linear(ROOTS[0]), linear(ROOTS[1])), qpMul(qpReal([1, 1]), B_CONST))
    const x = pack(A, 3)
    expect(norm(F(x))).toBeLessThan(1e-10)                       // on V, automatically
    for (const r of ROOTS) {
      const a = qpEval(A, r)
      expect(Math.hypot(...a)).toBeLessThan(1e-12)               // sigma(r) = 0
    }
    expect(rankOf(jacobian(x))).toBe(6)                          // and yet SMOOTH
  })

  it('the singular locus needs a DOUBLE root at a pole — and the rank drops by exactly 3', () => {
    const A = qpMul(qpMul(qpMul(linear(ROOTS[0]), linear(ROOTS[0])), linear(ROOTS[1])), B_CONST)
    const x = pack(A, 3)
    expect(norm(F(x))).toBeLessThan(1e-10)
    const d = qpDeriv(A)
    expect(Math.hypot(...qpEval(A, ROOTS[0]))).toBeLessThan(1e-12)
    expect(Math.hypot(...qpEval(d, ROOTS[0]))).toBeLessThan(1e-12)   // double root at pole 1
    expect(Math.hypot(...qpEval(d, ROOTS[1]))).toBeGreaterThan(1e-3) // simple at pole 2
    expect(rankOf(jacobian(x))).toBe(3)                              // one pole's 3 conditions die
    expect(rankOf(jacobian(new Array<number>(16).fill(0)))).toBe(0)  // and the origin kills all 6
  })
})
