// ============================================================================
// THE CIRCLE, IN THE COVARIANT CONSTRUCTION — and exactly what covariance does NOT buy.
//
// The circle is the shape this whole line of work is named after, and it is the canonical specimen
// every λ-chart in this repository refuses: its poles are ±i and σ(±i) = 0, so 𝒜(±i) is singular and
// the chart's equation 𝒜′(r) = 𝒜(r)(Σ + λi) cannot be solved for the dial. This file asks whether
// the covariant system refuses it too.
//
// IT DOES NOT, AND THE REASON IS FLAT: the covariant system never inverts anything. It is
// {C̄A′ + ĀC′ = 𝒜i𝒜*, Re(ĀC) = 0}, pure linear algebra with no pole ever named. The circle drops
// straight out, with a hand-derived degree-1 spinor.
//
// BUT THE HONEST RESULT IS SHARPER THAN "COVARIANCE FIXES IT", and the last test is the point:
//   · the circle needs A REAL. It does not need the quaternionic freedom at all. So what excluded it
//     was never the CONSTRUCTION — Kalkan et al.'s system holds it too — it was OUR λ COORDINATES.
//     Two different things had been running together under "the circle is excluded".
//   · and rational arc length is STILL unavailable: σ′(i) = 4i ≠ 0 = 2σ(i)Σ. Arc length is a METRIC
//     property and Möbius maps are not isometries, so no amount of conformal covariance can deliver
//     it. Covariance dissolves the PH obstruction. It does not touch the arc-length one.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  qpReal, qpImag, qpConst, qpAdd, qpMul, qpNorm, qpDegree, qpMax,
  sandwich, covariantWronskian, nullPart, solveForC, curveAt, phDefect, polySqrt,
  pMax, pEval, pDeriv,
  type QPoly, type Poly, type Column,
} from '../sp11RationalPH'

// --- the circle, in the classical real-denominator form ----------------------
const W: Poly = [1, 0, 1]                                    // w = 1 + t²
const P: Poly[] = [[1, 0, -1], [0, 2], [0]]                  // p = (1 − t², 2t, 0)
const N_CIRCLE: QPoly = qpImag([[0, -4], [2, 0, -2], [0]])   // N = wp′ − w′p
const U_CIRCLE: Column = { A: qpReal(W), C: qpImag(P) }

/** THE HAND-DERIVED SPINOR: 𝒜 = (1+k) + (−1+k)t. Nothing in the repo produced this. */
const SPINOR: QPoly = qpAdd(qpConst(1, 0, 0, 1), qpMul(qpConst(-1, 0, 0, 1), qpReal([0, 1])))

// complex evaluation of a REAL polynomial, for the pole tests
const cEval = (p: Poly, re: number, im: number): [number, number] => {
  let a = 0, b = 0
  for (let i = p.length - 1; i >= 0; i--) { const na = a * re - b * im + p[i]; b = a * im + b * re; a = na }
  return [a, b]
}

describe('the circle in the Sp(1,1) construction', () => {
  it('the hand-derived spinor reproduces the circle Wronskian exactly', () => {
    const s = sandwich(SPINOR)
    expect(qpDegree(SPINOR)).toBe(1)
    for (let c = 0; c < 4; c++) {
      for (let k = 0; k < 4; k++) {
        expect(s[c][k] ?? 0).toBeCloseTo(N_CIRCLE[c][k] ?? 0, 12)
      }
    }
    // and |𝒜|² = 2w, so sigma = 2(1+t²) — the classical circle speed numerator
    expect(qpNorm(SPINOR).slice(0, 3)).toEqual([2, 0, 2])
  })

  it('and the circle satisfies the covariant PH condition', () => {
    expect(pMax(nullPart(U_CIRCLE))).toBeLessThan(1e-12)
    expect(phDefect(U_CIRCLE)).toBeLessThan(1e-12)
    const sigma = polySqrt(qpNorm(covariantWronskian(U_CIRCLE)))
    expect(sigma).not.toBeNull()
    expect(sigma!.slice(0, 3).map((v) => +v.toFixed(9))).toEqual([2, 0, 2])   // 2(1+t²)
  })

  it('THE SOLVE: prescribe the spinor and A, and the circle comes back', () => {
    const r = solveForC(qpReal(W), N_CIRCLE, 2)
    expect(r.residual).toBeLessThan(1e-10)
    expect(pMax(nullPart(r.U)) / (qpMax(r.U.A) * qpMax(r.U.C))).toBeLessThan(1e-12)
    expect(phDefect(r.U)).toBeLessThan(1e-10)
    // the recovered C differs from p by a TRANSLATION only: C − p = (imaginary constant)·w
    const diff = [1, 2, 3].map((c) => [0, 1, 2].map((k) => (r.U.C[c][k] ?? 0) - (P[c - 1][k] ?? 0)))
    for (const d of diff) {
      const a = d[0]                                  // the constant, if C − p = a·w = a(1 + t²)
      expect(d[1]).toBeCloseTo(0, 9)                  // w has no t term
      expect(d[2]).toBeCloseTo(a, 9)                  // and its t² coefficient equals its constant
    }
    expect(pMax(r.U.C[0])).toBeLessThan(1e-12)        // C stayed imaginary
  })

  it('and the curve really is a unit circle — a translate of it', () => {
    const r = solveForC(qpReal(W), N_CIRCLE, 2)
    // C = p + a·w, so the translation a is the DIFFERENCE of the constant coefficients — C's own
    // constant is p(0) + a = (1,0,0) + a, which is not the centre.
    const centre = [1, 2, 3].map((c) => (r.U.C[c][0] ?? 0) - (P[c - 1][0] ?? 0))
    for (let i = 0; i <= 400; i++) {
      const t = -20 + i / 10
      const x = curveAt(r.U, t)!
      expect(Math.hypot(x.x - centre[0], x.y - centre[1], x.z - centre[2])).toBeCloseTo(1, 9)
    }
  })

  it('THE EXCLUSION WAS OURS, NOT THE CONSTRUCTION\'S: A is REAL here', () => {
    // the circle needs no quaternionic freedom at all — A = w = 1 + t², a real polynomial. So the
    // system that holds it is exactly Kalkan et al.'s. What refused the circle was the λ CHART.
    const r = solveForC(qpReal(W), N_CIRCLE, 2)
    expect(pMax(r.U.A[1]) + pMax(r.U.A[2]) + pMax(r.U.A[3])).toBe(0)

    // and here is the chart's refusal, measured: sigma(±i) = 0, so 𝒜(±i) is singular in
    // ℍ⊗ℂ ≅ M₂(ℂ) where sigma = det 𝒜, and 𝒜′(r) = 𝒜(r)(Σ + λi) has nothing to divide by.
    const sigma = qpNorm(SPINOR)                       // 2 + 2t²
    for (const s of [1, -1]) {
      const [re, im] = cEval(sigma, 0, s)
      expect(Math.hypot(re, im)).toBeLessThan(1e-12)
    }
    // while N(±i) is NOT zero — isotropic, not zero. (The distinction that cost a retraction.)
    const nRe = cEval(N_CIRCLE[1], 0, 1), nJm = cEval(N_CIRCLE[2], 0, 1)
    expect(Math.hypot(nRe[0], nRe[1], nJm[0], nJm[1])).toBeGreaterThan(1)
  })

  it('WHAT COVARIANCE DOES NOT BUY: the arc length is still not rational', () => {
    // rational arc length needs σ′(r) = 2σ(r)Σ at each pole (see rationalArcLengthInChart).
    // For the circle, poles ±i and Σ = 1/(i − (−i)) = −i/2:
    const sigma = qpNorm(SPINOR)                       // 2 + 2t²  (= 2w)
    const [sRe, sIm] = cEval(sigma, 0, 1)              // σ(i) = 0
    const [dRe, dIm] = cEval(pDeriv(sigma), 0, 1)      // σ′(i) = 4i
    expect(Math.hypot(sRe, sIm)).toBeLessThan(1e-12)
    expect(Math.hypot(dRe, dIm)).toBeGreaterThan(1)    // measured 4
    // so σ′(i) − 2σ(i)Σ = 4i − 0 ≠ 0: the log term survives, and s(t) = 2 arctan t.
    // Arc length is METRIC and Möbius maps are not isometries — conformal covariance cannot
    // reach this obstruction, and does not claim to.
    expect(Math.hypot(dRe, dIm)).toBeGreaterThan(Math.hypot(sRe, sIm) + 1)
  })
})
