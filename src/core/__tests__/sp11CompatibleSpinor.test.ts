// ============================================================================
// DO COMPATIBLE SPINORS EXIST FOR A PRESCRIBED A?  — yes, with a computable predictor.
//
// sp11Factorisation left this open: factorisation supplies A and the whole group structure, but the
// pair (A, 𝒜) must be COMPATIBLE for {C̄A′ + ĀC′ = 𝒜i𝒜*, Re(ĀC) = 0} to be solvable at all. A crude
// descent stalled at residual 1e-2, which was suggestive of "no" and was NOT evidence. This file
// answers it properly, and the answer is YES.
//
// THE SOLVER. M depends only on A and deg C, so it is FIXED: the system is solvable exactly when
// rhs(𝒜) lands in col(M). And rhs is QUADRATIC in the spinor with an analytic derivative
// ∂(𝒜i𝒜*)/∂e = e i 𝒜* + 𝒜 i e*. So this is Levenberg-Marquardt with a real Jacobian, minimising
// ‖(I − P)rhs‖ / ‖rhs‖ on the unit sphere — normalised because the problem is homogeneous and 𝒜 = 0
// is a global minimum that means nothing. It reaches 1e-16, not 1e-2.
//
// THE PREDICTOR. Let V be the achievable-Wronskian space — the image of {C : Re(ĀC) = 0} under
// C ↦ C̄A′ + ĀC′ — of dimension D, and n = deg Ñ. Being a perfect square costs n conditions, and one
// dimension scales out, so the count is
//
//     slack = D − 1 − n .
//
// MEASURED: for factor-built (generic) A, slack ≥ 0 predicts solvability and it holds up — the solver
// reaches machine zero wherever slack ≥ 0 and stalls at 1e-1 wherever slack < 0.
//
// BUT THE COUNT IS NOT NECESSARY, and the calibration is what caught it. The SPECIMEN has slack = −3
// and is nevertheless an exact solution — because its A came from a real PH curve and is therefore
// not generic. So slack is a predictor for generic A and nothing more; it must never be used to rule
// a case out. Calibrating against known-solvable cases before trusting the count also caught a wrong
// kernel extraction that had made the seed itself read as unsolvable.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import {
  rotationSeed, translationSeed, scalingSeed, conjugate, factorProduct, columnOf,
  gTranslate, gRotate, gScale, G_INVERT, mMul, rhoFloor, type Mat2,
} from '../sp11Factorisation'
import {
  wronskianImage, findCompatibleSpinor, nullspaceBasis, orthonormalise,
  qpReal, qpImag, qpMul, qpConst, qpNorm, covariantWronskian, nullPart,
  pMax, pMul, type QPoly, type Poly, type Column,
} from '../sp11RationalPH'

const rnd = (s: number): number => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x) }
const randG = (s: number): Mat2 => {
  let G = gRotate([rnd(s) - 0.5, rnd(s + 1) - 0.5, rnd(s + 2) - 0.5, rnd(s + 3) - 0.5])
  G = mMul(G, gTranslate([rnd(s + 4) * 2 - 1, rnd(s + 5) * 2 - 1, rnd(s + 6) * 2 - 1]))
  if (rnd(s + 7) > 0.5) G = mMul(G, G_INVERT)
  return mMul(G, gScale(0.5 + rnd(s + 8)))
}
const seedOf = (kind: number, s: number): Mat2 =>
  kind === 0 ? rotationSeed([rnd(s) - 0.5, rnd(s + 1) - 0.5, rnd(s + 2) - 0.5])
    : kind === 1 ? translationSeed([rnd(s + 3) * 2 - 1, rnd(s + 4) * 2 - 1, rnd(s + 5) * 2 - 1])
      : scalingSeed(rnd(s + 6) * 1.5)
const factorA = (k: number, s: number): QPoly =>
  columnOf(factorProduct(Array.from({ length: k }, (_, f) =>
    conjugate(randG(f * 9 + 21 + k * 3 + s * 97), seedOf(Math.floor(rnd(s * 7 + f + k) * 3), f * 5 + k * 3 + s))))).A

const relGap = (a: Poly, b: Poly): number => {
  let d = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
  return d / (Math.max(pMax(a), pMax(b)) || 1)
}
/**
 * PH, checked WITHOUT polySqrt: |Ñ|² must equal (|𝒜|²)². polySqrt's coefficient recursion loses
 * degree-16 squares to round-off, so a false Infinity there is not evidence of anything.
 */
const phGapAgainstSpinor = (U: Column, spinor: QPoly): number =>
  relGap(qpNorm(covariantWronskian(U)), pMul(qpNorm(spinor), qpNorm(spinor)))
const nullGap = (U: Column): number =>
  pMax(nullPart(U)) / (Math.max(...U.A.map(pMax)) * Math.max(...U.C.map(pMax)) || 1)

// --- the calibration data ----------------------------------------------------
const m0 = toMember(seedQuintic())
const wSeed = m0.w as Poly
const pSeed = (m0.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]
  return Array.from({ length: Math.max(pi.length, wSeed.length) }, (_, k) => (pi[k] ?? 0) + a * (wSeed[k] ?? 0))
})

describe('compatible spinors', () => {
  it('the linear-algebra helpers are exact: nullspace dimension is dim - rank', () => {
    const rows = [[1, 0, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0]]   // rank 2 in R^4
    expect(orthonormalise(rows).length).toBe(2)
    expect(nullspaceBasis(rows, 4).length).toBe(2)
  })

  it('CALIBRATION on cases where a solution is KNOWN to exist', () => {
    // the seed: A = w real, deg 2, deg C = 5. The kernel is {C imaginary}, 3(degC+1) = 18, and the
    // Wronskian map kills exactly the 3 translations, so D = 15 — checkable by hand.
    const seed = wronskianImage(qpReal(wSeed), 5)
    expect(seed.D).toBe(15)
    expect(seed.n).toBe(6)
    expect(seed.slack).toBe(8)

    const circle = wronskianImage(qpReal([1, 0, 1]), 2)
    expect(circle.D).toBe(6)
    expect(circle.slack).toBeGreaterThanOrEqual(0)
  })

  it('AND THE COUNT IS NOT NECESSARY: the specimen has NEGATIVE slack and is a solution', () => {
    const A = qpMul(qpConst(-1), qpImag(pSeed))
    const c = wronskianImage(A, 2)
    expect(c.slack).toBeLessThan(0)                       // measured -3
    // yet this exact pair solves — it is the specimen, verified in sp11RationalPH.test.ts.
    const U: Column = { A, C: qpReal(wSeed) }
    expect(nullGap(U)).toBeLessThan(1e-12)
    // its Wronskian is a sandwich, so the curve is PH despite the count saying "no room":
    // |Ñ|² = σ², with σ the seed's own speed numerator (the specimen's Ñ is −N).
    const sigma = m0.sigma as Poly
    expect(relGap(qpNorm(covariantWronskian(U)), pMul(sigma, sigma))).toBeLessThan(1e-9)
    // A is not generic: it came from a PH curve, which is exactly the locus the count ignores.
  })

  it('THE SOLVER WORKS: slack >= 0 gives a compatible spinor at machine precision', () => {
    const cases: [number, number][] = [[2, 1], [2, 3], [2, 5], [3, 2], [3, 4], [4, 3], [4, 5]]
    let solved = 0
    for (const [k, degC] of cases) {
      const m = (k + degC - 1) / 2
      const A = factorA(k, 0)
      const count = wronskianImage(A, degC)
      if (count.slack < 0) continue
      const r = findCompatibleSpinor(A, m, degC, 8, 60)
      expect(r).not.toBeNull()
      expect(r!.residual).toBeLessThan(1e-9)
      expect(nullGap(r!.U)).toBeLessThan(1e-10)
      expect(phGapAgainstSpinor(r!.U, r!.spinor)).toBeLessThan(1e-8)   // genuinely PH
      solved++
    }
    expect(solved).toBeGreaterThanOrEqual(6)
  }, 30_000)

  it('and it FAILS where slack < 0, so the predictor is doing real work', () => {
    for (const [k, degC] of [[4, 1], [5, 2]] as [number, number][]) {
      const m = (k + degC - 1) / 2
      const A = factorA(k, 0)
      expect(wronskianImage(A, degC).slack).toBeLessThan(0)
      const r = findCompatibleSpinor(A, m, degC, 8, 60)
      expect(r!.residual).toBeGreaterThan(1e-3)          // measured 8.7e-2 and 7.0e-1
    }
  }, 30_000)

  it('the constructed curves are honest PH curves, and some are bounded', () => {
    let bounded = 0
    for (const [k, degC] of [[3, 2], [3, 4], [2, 3]] as [number, number][]) {
      const m = (k + degC - 1) / 2
      const A = factorA(k, 0)
      if (wronskianImage(A, degC).slack < 0) continue
      const r = findCompatibleSpinor(A, m, degC, 8, 60)
      if (!r || r.residual > 1e-9) continue
      expect(phGapAgainstSpinor(r.U, r.spinor)).toBeLessThan(1e-8)
      if (rhoFloor(qpNorm(A)) > 1e-6) bounded++
    }
    expect(bounded).toBeGreaterThanOrEqual(1)   // boundedness is controlled by |A|, not guaranteed
  }, 30_000)
})
