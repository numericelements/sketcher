// ============================================================================
// TWO QUESTIONS ABOUT THE COLUMN AS A REPRESENTATION, INDEPENDENT OF PH.
//
// 1. HOW DOES IT COMPARE with the other ways of applying a Möbius map? Three representations of the
//    same curve, and the difference is degree, not correctness:
//
//      p/w  (ordinary rational Bézier)   Möbius is NOT linear. Inversion is (p, w) ↦ (p·w, ⟨p,p⟩),
//                                        quadratic in p, and the degree roughly DOUBLES.
//      ℝ^{4,1} null vector (= CGA)       Möbius IS linear, H ↦ GHG†. But the representation is
//                                        already (w², wp, |p|²) — the SQUARE of the pair you had.
//      ℍ² column (A, C)                  Möbius is linear AND the representation is minimal.
//
//    The relationship is exact and is the whole point: Ĥ = UU†, so the conformal vector is the
//    column SQUARED and the column is its spinor square root. Measured below — every entry of the
//    lift has exactly the degree of the corresponding product of column entries. You do not get to
//    choose "linear" and "small" separately; the square root gives both.
//
// 2. DOES ANY OF THIS NEED PH? No. The null condition Re(ĀC) = 0 holds for (w, p) with w REAL and p
//    IMAGINARY, which is every rational curve in ℝ³ whatsoever. PH is a separate condition — |Ñ|² a
//    perfect square — that is simply not imposed. Verified here on a deliberately non-PH rational
//    Bézier: it represents, it transforms, the geometry transports pointwise, and it is not PH
//    before or after.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  applyMobius, mobiusPoint, gTranslate, gRotate, gScale, G_INVERT, mMul, type Mat2,
} from '../sp11Factorisation'
import {
  fromRealDenominator, toRealDenominator, conformalLift, curveAt, nullPart, qpDegree,
  qpNorm, covariantWronskian, polySqrt, speedSquared, pMax, qpMax, pMul, pAdd, pSub,
  type Poly, type Column,
} from '../sp11RationalPH'

const nullGap = (U: Column): number => pMax(nullPart(U)) / ((qpMax(U.A) * qpMax(U.C)) || 1)
/**
 * NOT-PH, established independently of polySqrt: run the square-root coefficient recursion by hand
 * and report the relative residual of s² against |Ñ|². polySqrt returning null could just mean a
 * guard tripped (it has done exactly that twice), so a NEGATIVE claim needs this instead — a large
 * residual means genuinely not a square, not merely rejected.
 */
function squareResidual(U: Column): number {
  const a = qpNorm(covariantWronskian(U))
  if ((a[0] ?? 0) <= 0) return NaN                 // the recursion below assumes a positive start
  const n = Math.floor((a.length - 1) / 2)
  const hat = a.map((c) => c / a[0])
  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  const sq = pMul(s, s)
  let d = 0
  for (let i = 0; i < Math.max(sq.length, hat.length); i++) d = Math.max(d, Math.abs((sq[i] ?? 0) - (hat[i] ?? 0)))
  return d / (pMax(hat) || 1)
}
const degOf = (a: Poly): number => {
  const s = pMax(a) || 1
  let d = 0
  a.forEach((v, i) => { if (Math.abs(v) > 1e-12 * s) d = i })
  return d
}

// --- a deliberately ORDINARY rational curve: no PH anything -------------------
// a rational cubic with lopsided weights, in power basis. Nothing special about it.
const W: Poly = [1, 0.6, -0.3, 0.4]
const P: Poly[] = [[0.2, 1.1, -0.7, 0.5], [-0.4, 0.3, 0.9, -0.2], [0.7, -0.5, 0.1, 0.8]]

const G_GENERIC: Mat2 = mMul(
  mMul(gTranslate([0.7, -1.3, 0.4]), G_INVERT),
  mMul(gTranslate([-2, 0.5, 1.1]), mMul(gRotate([0.6, 0.8, 0, 0]), gScale(1.7))),
)

describe('the column as a representation, with PH set aside', () => {
  it('an ORDINARY rational curve is already a valid column — PH plays no part', () => {
    const U = fromRealDenominator(P, W)
    expect(nullGap(U)).toBeLessThan(1e-14)                  // it represents a curve in R^3
    // and it is emphatically NOT PH — established by the residual, not by a guard
    expect(polySqrt(qpNorm(covariantWronskian(U)))).toBeNull()
    expect(squareResidual(U)).toBeGreaterThan(1e-2)
    // the curve it carries is the one we wrote down
    for (const t of [0.1, 0.5, 0.9, 2.2]) {
      const wv = W.reduceRight((s, c) => s * t + c, 0)
      const x = curveAt(U, t)!
      expect(x.x).toBeCloseTo(P[0].reduceRight((s, c) => s * t + c, 0) / wv, 10)
      expect(x.y).toBeCloseTo(P[1].reduceRight((s, c) => s * t + c, 0) / wv, 10)
      expect(x.z).toBeCloseTo(P[2].reduceRight((s, c) => s * t + c, 0) / wv, 10)
    }
  })

  it('and it takes a Mobius map with the geometry intact and no degree growth', () => {
    const U = fromRealDenominator(P, W)
    const V = applyMobius(G_GENERIC, U)
    expect(Math.max(qpDegree(V.A), qpDegree(V.C)))
      .toBeLessThanOrEqual(Math.max(qpDegree(U.A), qpDegree(U.C)))
    expect(nullGap(V)).toBeLessThan(1e-12)
    let checked = 0
    for (let i = 0; i <= 40; i++) {
      const t = -2 + i / 10
      const before = curveAt(U, t)
      if (!before) continue
      const want = mobiusPoint(G_GENERIC, [before.x, before.y, before.z])
      const got = curveAt(V, t)
      if (!want || !got) continue
      expect(Math.hypot(got.x - want[0], got.y - want[1], got.z - want[2]) / (1 + Math.hypot(...want)))
        .toBeLessThan(1e-9)
      checked++
    }
    expect(checked).toBeGreaterThan(25)
    expect(polySqrt(qpNorm(covariantWronskian(V)))).toBeNull()   // still not PH, as expected
    expect(squareResidual(V)).toBeGreaterThan(1e-2)              // and genuinely so, not a guard
  })

  it('-det(H-prime) = |N-tilde|^2 is an IDENTITY, not a condition — it holds off PH too', () => {
    // This matters for reading the equation correctly: it is true for EVERY rational curve, so it
    // cannot be a geometric condition on one. The PH content is entirely that the square ROOT is a
    // polynomial — an arithmetic statement, not a differential-geometric one.
    const U = fromRealDenominator(P, W)
    expect(squareResidual(U)).toBeGreaterThan(1e-2)          // this curve is NOT PH
    const lhs = speedSquared(U)
    const rhs = qpNorm(covariantWronskian(U))
    let d = 0
    for (let i = 0; i < Math.max(lhs.length, rhs.length); i++) d = Math.max(d, Math.abs((lhs[i] ?? 0) - (rhs[i] ?? 0)))
    expect(d / (pMax(rhs) || 1)).toBeLessThan(1e-12)          // and the identity holds anyway
    // and it still holds after a Mobius map, still off PH
    const V = applyMobius(G_GENERIC, U)
    const l2 = speedSquared(V), r2 = qpNorm(covariantWronskian(V))
    let d2 = 0
    for (let i = 0; i < Math.max(l2.length, r2.length); i++) d2 = Math.max(d2, Math.abs((l2[i] ?? 0) - (r2[i] ?? 0)))
    expect(d2 / (pMax(r2) || 1)).toBeLessThan(1e-10)
  })

  it('THE COMPARISON: the conformal vector is the column SQUARED', () => {
    const U = fromRealDenominator(P, W)
    const lift = conformalLift(U)
    // for U = (w, p): the lift is (w², −wp, |p|²) — the standard null lift w²(1, x, |x|²)
    expect(lift.h11).toEqual(pMul(W, W))
    for (let i = 0; i < 3; i++) {
      const gap = pSub(lift.h12[i], pMul(W, P[i]).map((c) => -c))
      expect(pMax(gap)).toBeLessThan(1e-12)
    }
    // and the DEGREES: every entry of the lift is a product of two column entries
    expect(degOf(lift.h11)).toBe(2 * qpDegree(U.A))
    expect(degOf(lift.h22)).toBe(2 * qpDegree(U.C))
    expect(Math.max(...lift.h12.map(degOf))).toBe(qpDegree(U.A) + qpDegree(U.C))
  })

  it('and the p/w route is the one that is NOT linear: inversion doubles it', () => {
    // inversion in the ordinary homogeneous form: (p, w) ↦ (p·w, <p,p>), quadratic in p
    const pw = P.map((pi) => pMul(pi, W))
    const pp = P.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0])
    expect(degOf(pp)).toBe(6)                       // was 3
    expect(Math.max(...pw.map(degOf))).toBe(6)      // was 3

    // the column does the SAME map with no growth at all
    const U = fromRealDenominator(P, W)
    const V = applyMobius(G_INVERT, U)
    expect(qpDegree(V.A)).toBe(3)
    expect(qpDegree(V.C)).toBe(3)
    // and converting the column result back out reproduces exactly the p/w answer
    const back = toRealDenominator(V)!
    expect(degOf(back.w)).toBe(6)
    const scale = back.w[0] / pp[0]
    for (let k = 0; k < pp.length; k++) expect(back.w[k]).toBeCloseTo(pp[k] * scale, 9)
  })

  it('so a Mobius CHAIN is free on any rational curve, PH or not', () => {
    const U = fromRealDenominator(P, W)
    const start = Math.max(qpDegree(U.A), qpDegree(U.C))
    let V = U
    for (const G of [G_GENERIC, G_INVERT, gTranslate([1, -2, 0.5]), G_GENERIC, G_INVERT]) {
      V = applyMobius(G, V)
    }
    expect(Math.max(qpDegree(V.A), qpDegree(V.C))).toBeLessThanOrEqual(start)
    expect(nullGap(V)).toBeLessThan(1e-10)
    // whereas the p/w route would have doubled five times: 3 -> 6 -> 12 -> ... before reduction
    expect(degOf(toRealDenominator(V)!.w)).toBe(2 * qpDegree(V.A))
  })
})
