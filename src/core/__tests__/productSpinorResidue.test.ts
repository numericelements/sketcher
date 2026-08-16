// ============================================================================
// THE PRODUCT SPINOR — does a mixed pole pattern come for free? Measured answer: NO, and the two
// reasons are worth having written down, because the construction is still the right ansatz.
//
// THE PLAN THIS TESTS (SPHERE_REPRESENTATION_SLIDES §3, Lean-side C21 `mixed_nonempty`). σ = |𝒜|² is
// MULTIPLICATIVE, so 𝒜 = 𝒜_circle · 𝒜_hard has σ vanishing where the circle factor says and nowhere
// else — a MIXED soft/hard pole pattern by construction. The hope was that the residue conditions
// N′(r) = 2ΣN(r) would survive the product, answering C21 with an object instead of a search.
//
// THE LEAN SIDE'S PREDICTION, verified here to 5.6e-16:  N(𝒜₁𝒜₂) = 𝒜₁·N(𝒜₂)·𝒜₁* — the product's
// hodograph is the second factor's, conjugated by the first. They said the term that decides survival
// is 𝒜₁′(r). It is, and it has a closed form. Differentiating at a pole r of the second factor,
//
//     N′(r) = 𝒜₁′(r)N₂(r)𝒜₁*(r)  +  𝒜₁(r)N₂′(r)𝒜₁*(r)  +  𝒜₁(r)N₂(r)𝒜₁*′(r)
//                    X                    ↑ = 2Σ N(r)              −X*      (since N* = −N)
//
// so the two stray terms are X − X* = 2·vec(X), and
//
//     THE OBSTRUCTION IS   vec( 𝒜₁′(r) · N₂(r) · 𝒜₁*(r) ) = 0 ,
//
// three real equations per pole. Measured: 0 exactly for a CONSTANT 𝒜₁ (which mixes nothing), 2.5 and
// 4.0 for two ordinary linear ones. Generic factors break it.
//
// AND A SECOND OBSTRUCTION, INDEPENDENT OF THE FIRST, which the algebra above hides: Σ is not a
// property of a factor. Σ_k = Σ_{l≠k} 1/(r_k − r_l) runs over ALL the poles, so merging two pole sets
// moves Σ at every pole — measured, Σ at the pole i is −i/2 for the circle alone and +0.167i once a
// second conjugate pair at ±2i joins it. Each factor solved its conditions against a Σ that no longer
// exists after the merge.
//
// SO THE PRODUCT IS AN ANSATZ, NOT A CONSTRUCTION. What multiplicativity buys is the σ-VANISHING
// PATTERN, which is the hard half to arrange; both obstructions above are then ordinary equations to
// solve inside that ansatz rather than reasons it cannot work. The tool for it is the λ-free quadric
// formulation (`rationalPHFreeLambda`), which never divides and so can reach σ(r) = 0.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { qpMul, qpConj, qpDeriv, sandwich, qpNorm, qpReal, qpAdd, qpConst, pMax, pSub, type QPoly } from '../sp11RationalPH'

type C = [number, number]
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]]
const csub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]]
const cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
const cabs = (a: C): number => Math.hypot(a[0], a[1])

/** An element of ℍ⊗ℂ: four complex numbers. */
type HC = [C, C, C, C]
const hcMul = (a: HC, b: HC): HC => [
  csub(csub(csub(cmul(a[0], b[0]), cmul(a[1], b[1])), cmul(a[2], b[2])), cmul(a[3], b[3])),
  cadd(csub(cadd(cmul(a[0], b[1]), cmul(a[1], b[0])), cmul(a[3], b[2])), cmul(a[2], b[3])),
  cadd(cadd(csub(cmul(a[0], b[2]), cmul(a[1], b[3])), cmul(a[2], b[0])), cmul(a[3], b[1])),
  cadd(csub(cadd(cmul(a[0], b[3]), cmul(a[1], b[2])), cmul(a[2], b[1])), cmul(a[3], b[0])),
]
const hcConj = (a: HC): HC => [a[0], [-a[1][0], -a[1][1]], [-a[2][0], -a[2][1]], [-a[3][0], -a[3][1]]]
const hcScale = (a: HC, s: C): HC => [cmul(a[0], s), cmul(a[1], s), cmul(a[2], s), cmul(a[3], s)]
const hcSub = (a: HC, b: HC): HC => [csub(a[0], b[0]), csub(a[1], b[1]), csub(a[2], b[2]), csub(a[3], b[3])]
const hcNorm = (a: HC): number => Math.max(...a.map(cabs))
const hcVec = (a: HC): number => Math.max(cabs(a[1]), cabs(a[2]), cabs(a[3]))
/** Evaluate a real-coefficient quaternion polynomial at a COMPLEX t. */
const hcEval = (A: QPoly, t: C): HC =>
  A.map((p) => p.reduceRight<C>((s, c) => cadd(cmul(s, t), [c, 0]), [0, 0])) as HC

/** THE CIRCLE'S SPINOR: 𝒜 = (1+k) + (−1+k)t, poles ±i. */
const A_CIRCLE: QPoly = qpAdd(qpConst(1, 0, 0, 1), qpMul(qpConst(-1, 0, 0, 1), qpReal([0, 1])))
const I: C = [0, 1]

describe('the product spinor, and whether the residue condition survives', () => {
  it('the Lean side identity: N(𝒜₁𝒜₂) = 𝒜₁·N(𝒜₂)·𝒜₁*', () => {
    const A1: QPoly = qpAdd(qpConst(0.7, 0.3, -0.2, 0.5), qpMul(qpConst(0.2, -0.6, 0.4, 0.1), qpReal([0, 1])))
    const A2 = A_CIRCLE
    const lhs = sandwich(qpMul(A1, A2))
    const rhs = qpMul(qpMul(A1, sandwich(A2)), qpConj(A1))
    const gap = Math.max(...lhs.map((p, i) => pMax(pSub(p, rhs[i]))))
    console.log('identity gap:', gap.toExponential(1))
    expect(gap).toBeLessThan(1e-12)
    // and sigma is multiplicative
    const s1 = qpNorm(qpMul(A1, A2)), s2 = qpMul(qpReal(qpNorm(A1)), qpReal(qpNorm(A2)))[0]
    console.log('sigma multiplicative gap:', pMax(pSub(s1, s2)).toExponential(1))
  })

  it('the circle alone satisfies its residue condition at t = i', () => {
    const N = sandwich(A_CIRCLE)
    const Nr = hcEval(N, I), dNr = hcEval(qpDeriv(N), I)
    const SIGMA: C = [0, -0.5]                       // Σ = 1/(i − (−i)) = −i/2
    const want = hcScale(Nr, [2 * SIGMA[0], 2 * SIGMA[1]])
    console.log('circle: |N′(i) − 2ΣN(i)| =', hcNorm(hcSub(dNr, want)).toExponential(1))
    expect(hcNorm(hcSub(dNr, want))).toBeLessThan(1e-12)
  })

  it('THE OBSTRUCTION, term by term, for 𝒜 = 𝒜₁·𝒜_circle', () => {
    for (const [label, A1] of [
      ['constant 𝒜₁', qpConst(0.7, 0.3, -0.2, 0.5)],
      ['linear 𝒜₁  ', qpAdd(qpConst(0.7, 0.3, -0.2, 0.5), qpMul(qpConst(0.2, -0.6, 0.4, 0.1), qpReal([0, 1])))],
      ['𝒜₁ = 1 + t·i', qpAdd(qpConst(1), qpMul(qpConst(0, 1), qpReal([0, 1])))],
    ] as [string, QPoly][]) {
      const N2 = sandwich(A_CIRCLE)
      const a1 = hcEval(A1, I), da1 = hcEval(qpDeriv(A1), I)
      const n2 = hcEval(N2, I)
      // X = 𝒜₁′(r)·N₂(r)·𝒜₁*(r);  the two extra terms sum to X − X* = 2·vec(X)
      const X = hcMul(hcMul(da1, n2), hcConj(a1))
      console.log(`${label}   |vec(X)| = ${hcVec(X).toExponential(1)}   (0 ⇒ the condition survives at this pole)`)
    }
  })

  it('AND THE SECOND OBSTRUCTION: merging pole sets moves Σ', () => {
    // circle poles ±i; add one more conjugate pair ±2i. Σ at +i changes.
    const before: C = [0, -0.5]                                   // 1/(i − (−i))
    // 1/(i−(−i)) + 1/(i−2i) + 1/(i+2i) = −i/2 + 1/(−i) + 1/(3i) = −i/2 + i − i/3
    const after: C = [0, -0.5 + 1 - 1 / 3]
    console.log('Σ at the pole i:  alone', before, '  with a second pair at ±2i', after)
    expect(Math.abs(after[1] - before[1])).toBeGreaterThan(0.5)
  })
})
