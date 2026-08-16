// ============================================================================
// RATIONAL ARC LENGTH IS FREE INSIDE THE λ-CHART.
//
// The speed is σ/w², so s = ∫σ/w² dt — the SAME integral this project already fights for the curve
// itself, with σ where N stood. Logs are again the only obstruction, and killing them is again a
// residue condition at each pole:
//
//     σ′(r_k) = 2 σ(r_k) Σ_k          (rational arc length)
//     N′(r_k) = 2 N(r_k) Σ_k          (rational PH — what the chart enforces)
//
// Character for character the same equation, one on the scalar part and one on the vector part. And
// the first is IMPLIED by the second, in two lines:
//
//     σ = 𝒜𝒜*  ⟹  σ′ = 2 Re(𝒜′𝒜*)
//     𝒜′(r) = 𝒜(r)(Σ + λi)  ⟹  𝒜′(r)𝒜(r)* = Σσ(r) + λN(r)
//     N = 𝒜i𝒜* is a PURE VECTOR, so Re(·) = Σσ(r) and the dial contributes nothing.
//
// So every member of the chart has rational arc length whether or not it was asked for, at any dial
// and any pole placement. That is what this file measures.
//
// SCOPE — AND IT IS WIDER THAN A PREVIOUS VERSION OF THIS BLOCK CLAIMED. That version said "any pole
// placement means any REAL one, and a complex pole cannot be measured here". The first half was a fair
// caution; the second was wrong, because it read `roots: number[]` in THIS module as a statement about
// the codebase. `rationalPHComplexPoleSpatial` is the same chart one axis wider, and the condition is
// now measured off the real axis: |σ′(r) − 2σ(r)Σ| relative comes out 8.8e-17, 1.0e-16, 6.5e-16 at
// three complex poles (the last test in this file). The derivation never used the reality of r, and it
// does not need to.
//
// FAROUKI'S ARCTANGENT IS STILL NOT A COUNTEREXAMPLE, for the reason it never was: his complex-centre
// curve has σ with SIMPLE poles (w | σ), so it is a σ = h·w stratum member and not a chart member.
// Complex poles and the stratum are different conditions — measured, a conjugate pair with
// |σ(r)|/scale ≈ 1.1 is an ordinary chart member (realPolesCannotBeOnTheStratum.test.ts and
// RATIONAL_PH_STATE §12.2).
//
// ATTRIBUTION. The residue criterion is Farouki & Sakkalis (CAGD 32, 2015; 74, 2019). The
// unification — one quaternion representation carrying the curve AND its arc length — and the
// construction of ALL spatial rational curves with rational arc length are Schröcker & Šír,
// arXiv:2310.08047 (2023, rev. 2024), whose first method adapts Kalkan et al. (2022) through a
// linear system: this chart's shape. Measured here, not discovered here.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  seedQuintic, toMember, withDial, dataOf, denominatorOf, projectToFamily, projectToData,
  familyBasis, packSpinor, unpackSpinor, poleMargin,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'
import {
  type Cx, cx, cabs,
  familyBasis as cxFamilyBasis, toMember as cxToMember, unpackSpinor as cxUnpack,
} from '../rationalPHComplexPoleSpatial'

const evalP = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dP = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))
const bigSigma = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

/** |σ′(r_k) − 2σ(r_k)Σ_k| relative, worst over the poles. */
function arcLengthDefect(prm: MultiPoleParams): number {
  const sg = toMember(prm).sigma as number[]
  const sgD = dP(sg)
  return Math.max(...prm.roots.map((r, k) => {
    const lhs = evalP(sgD, r)
    const rhs = 2 * evalP(sg, r) * bigSigma(prm.roots, k)
    return Math.abs(lhs - rhs) / Math.max(Math.abs(lhs), Math.abs(rhs), 1e-30)
  }))
}

/**
 * INDEPENDENT CHECK — the log coefficients of σ/w² by partial fractions, never touching the identity
 * above. Residue of σ/w² at a simple root r of w is [σ′(r)w′(r) − σ(r)w″(r)] / w′(r)³.
 */
function logCoefficients(prm: MultiPoleParams): number[] {
  const sg = toMember(prm).sigma as number[]
  const w = denominatorOf(prm.roots)
  const wD = dP(w), wDD = dP(wD)
  return prm.roots.map((r) => {
    const w1 = evalP(wD, r)
    return (evalP(dP(sg), r) * w1 - evalP(sg, r) * evalP(wDD, r)) / w1 ** 3
  })
}

const seed = seedQuintic()
const target = dataOf(toMember(seed))

describe('rational arc length inside the chart', () => {
  it('the seed satisfies the arc-length residue condition it never asked for', () => {
    expect(arcLengthDefect(seed)).toBeLessThan(1e-11)
    for (const c of logCoefficients(seed)) expect(Math.abs(c)).toBeLessThan(1e-11)
  })

  it('THE DIAL IS INVISIBLE TO IT — N is a pure vector, so lambda drops out', () => {
    for (const v of [-30, -3, 0, 3, 30]) {
      const out = withDial(seed, target, { lambda: { index: 0, value: v } })
      expect(out).not.toBeNull()
      expect(arcLengthDefect(out!)).toBeLessThan(1e-10)
    }
  })

  it('and moving the poles does not break it either', () => {
    for (const [r0, r1] of [[1.05, -0.05], [4, -3], [60, -50], [1.3, -10]]) {
      const solved = projectToData(projectToFamily({ ...seed, roots: [r0, r1] }), target)
      if (poleMargin(solved) < 1e-3) continue
      // 1e-9, not 1e-10: fixing familyBasis (familyBasisConditioning.test.ts) changed WHICH member
      // of the fibre the projection lands on, and one pole placement now conditions slightly worse
      // — 1.3e-10 against the old 1e-10 bound. The identity is unaffected; the bound was fitted to
      // a member produced by a basis that was sometimes wrong.
      expect(arcLengthDefect(solved)).toBeLessThan(1e-9)
    }
  })

  it('it holds across the WHOLE admissible family, not just near the seed', () => {
    const basis = familyBasis(seed)
    let worst = 0
    for (let trial = 0; trial < 60; trial++) {
      const x = packSpinor(seed.A).slice()
      basis.forEach((b, i) => {
        const amp = 4 * Math.sin(1.9 * trial + 2.3 * i) * Math.cos(0.7 * trial - 0.5 * i)
        for (let j = 0; j < x.length; j++) x[j] += amp * b[j]
      })
      worst = Math.max(worst, arcLengthDefect({ ...seed, A: unpackSpinor(x) }))
    }
    expect(worst).toBeLessThan(1e-10)
  })

  it('CONTROL: a spinor off the family fails it outright, so the test has teeth', () => {
    const bad = {
      ...seed,
      A: seed.A.map((q, i) => ({ u: q.u + 0.3 * (i + 1), v: q.v - 0.2, p: q.p + 0.11, q: q.q })),
    }
    expect(arcLengthDefect(bad)).toBeGreaterThan(0.5)          // measured 0.90
    expect(Math.abs(logCoefficients(bad)[0])).toBeGreaterThan(1) // measured 33.5
  })
  /**
   * OFF THE REAL AXIS, which is what §12.2 used to record as unmeasurable. Same identity, same
   * derivation, a pole at a complex parameter. With ONE conjugate pair {r, r̄} the sum has a single
   * term: Σ_r = 1/(r − r̄) = 1/(2i·Im r).
   */
  it('AND IT HOLDS AT A COMPLEX POLE — the derivation never used r being real', () => {
    const cmul = (a: Cx, b: Cx): Cx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
    const csub = (a: Cx, b: Cx): Cx => ({ re: a.re - b.re, im: a.im - b.im })
    const cdiv = (a: Cx, b: Cx): Cx => {
      const d = b.re * b.re + b.im * b.im
      return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
    }
    const evalC = (p: readonly number[], t: Cx): Cx =>
      p.reduceRight<Cx>((acc, c) => ({ re: acc.re * t.re - acc.im * t.im + c, im: acc.re * t.im + acc.im * t.re }), cx(0))
    const ZERO = (k: number) => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

    let worst = 0
    for (const [n, pole] of [[3, cx(0, 1)], [3, cx(0.4, 1.3)], [4, cx(-0.2, 0.8)]] as const) {
      const base = { A: ZERO(n + 1), pairs: [pole], lambdas: [cx(0.4, -0.2)] }
      const B = cxFamilyBasis(base)
      expect(B.length, 'the complex-pole fibre is not empty').toBeGreaterThan(0)
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => {
        const a = 1.3 * Math.sin(1.7 * i + 0.6)
        for (let j = 0; j < x.length; j++) x[j] += a * b[j]
      })
      const sg = [...cxToMember({ ...base, A: cxUnpack(x) }).sigma]
      const Sigma = cdiv(cx(1), csub(pole, cx(pole.re, -pole.im)))
      const lhs = evalC(dP(sg), pole)
      const rhs = cmul(cmul(cx(2), evalC(sg, pole)), Sigma)
      worst = Math.max(worst, cabs(csub(lhs, rhs)) / Math.max(cabs(lhs), cabs(rhs), 1e-30))
    }
    console.log(`    at COMPLEX poles: worst |σ′(r) − 2σ(r)Σ| relative = ${worst.toExponential(1)}`)
    expect(worst, 'rational arc length is free off the real axis too').toBeLessThan(1e-12)
  })
})
