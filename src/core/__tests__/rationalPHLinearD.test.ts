import { describe, it, expect } from 'vitest'
import {
  reconstructRationalPHLinearD,
  rationalPHLinearDFromParams,
  rationalPHExactFromParams,
  type RationalPHLinearDParams,
} from '../rationalPHLinearD'
import { rationalPHBound, rationalPHMarkers, curvatureExtremaReducedNumeratorRationalPH } from '../rationalPHCurvature'
import { curvatureExtremaNumeratorComplex, curvatureExtremaMarkers } from '../curvature'

// Exactly-PH rational curves with a LINEAR denominator. These pins guard the two properties the
// whole generating-function bound rests on and that the soft-PH AB drag could NOT guarantee:
//   (1) the reconstruction is EXACT (Wronskian residual ≈ machine zero), so the drawn curve is a
//       true PH curve — not the legacy forward-Euler approximation;
//   (2) Ñ (built from S,D) is sign-identical to the drawn curve's general curvature numerator g,
//       so markers, S⁻(Ñ), and the canvas all agree (CLAUDE.md Law 3).

const CASES: RationalPHLinearDParams[] = [
  { s0: { re: 0.7, im: -0.4 }, s2: { re: 0.9, im: 0.5 }, d1: { re: 1.2, im: 0.3 }, origin: { x: -1, y: 0 } },
  { s0: { re: 1.0, im: 0.2 }, s2: { re: -0.6, im: 0.8 }, d1: { re: 0.8, im: -0.4 }, origin: { x: 0, y: 0 } },
  { s0: { re: 0.3, im: 1.1 }, s2: { re: 0.7, im: -0.3 }, d1: { re: 1.4, im: 0.1 }, origin: { x: 2, y: 1 } },
  { s0: { re: -0.5, im: 0.5 }, s2: { re: 1.2, im: 0.9 }, d1: { re: 0.6, im: 0.0 }, origin: { x: 0, y: 0 } }, // real D
]

const sDegOf = (c: { sReCPs: number[] }) => c.sReCPs.length - 1

describe('exactly-PH rational curve, linear denominator', () => {
  it('reconstructs F to machine precision (exact Wronskian, not forward Euler)', () => {
    for (const prm of CASES) {
      const c = rationalPHLinearDFromParams(prm)
      expect(c.wronskianResidual).toBeLessThan(1e-10)
    }
  })

  it('produces a genuinely non-constant (rational) denominator', () => {
    for (const prm of CASES) {
      const c = rationalPHLinearDFromParams(prm)
      const w0 = { re: c.controlPoints[0].w_re, im: c.controlPoints[0].w_im }
      const wN = { re: c.controlPoints.at(-1)!.w_re, im: c.controlPoints.at(-1)!.w_im }
      expect(Math.hypot(w0.re - wN.re, w0.im - wN.im)).toBeGreaterThan(1e-6) // weights actually vary
    }
  })

  it('an INCOMPATIBLE (S, D) — S′(r) ≠ 0 — leaves a large residual (the constraint is real)', () => {
    // Same D, but S built directly (no s1 = −2 s2 r correction): not on the PH manifold.
    const c = reconstructRationalPHLinearD([0.7, 0.3, 0.9], [-0.4, 0.1, 0.5], [1, 1.2], [0, 0.3], { x: 0, y: 0 })
    expect(c.wronskianResidual).toBeGreaterThan(1e-2)
  })

  it('Ñ is sign-identical to the drawn curve’s general g (Law 3 honesty), pointwise', () => {
    for (const prm of CASES) {
      const c = rationalPHLinearDFromParams(prm)
      const sDeg = sDegOf(c)
      const NN = curvatureExtremaNumeratorComplex // general Chen g of the drawn curve
      // reduced Ñ(t) and general g(t) as evaluable numerators of the SAME dκ/dt
      const Ntilde = curvatureExtremaReducedNumeratorRationalPH(
        c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1,
      )
      const gGen = NN(
        c.controlPoints.map((p) => p.re), c.controlPoints.map((p) => p.im),
        c.controlPoints.map((p) => p.w_re), c.controlPoints.map((p) => p.w_im),
        c.knots, c.degree,
      )
      let compared = 0
      for (let i = 1; i < 100; i++) {
        const t = i / 100
        const a = Ntilde.evaluate(t)
        const b = gGen.evaluate(t)
        if (Math.abs(a) > 1e-9 && Math.abs(b) > 1e-9) {
          expect(Math.sign(a)).toBe(Math.sign(b))
          compared++
        }
      }
      expect(compared).toBeGreaterThan(50) // actually exercised the comparison
    }
  })

  it('Ñ markers agree with the drawn curve’s general markers, and S⁻(Ñ) ≥ #markers (Law 1)', () => {
    for (const prm of CASES) {
      const c = rationalPHLinearDFromParams(prm)
      const sDeg = sDegOf(c)
      const nMarkers = rationalPHMarkers(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1)
      const bound = rationalPHBound(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1)
      const genMarkers = curvatureExtremaMarkers(
        'complex-rational',
        c.controlPoints.map((p) => p.re), c.controlPoints.map((p) => p.im),
        c.controlPoints.map((p) => p.w_re), c.controlPoints.map((p) => p.w_im),
        c.knots, c.degree, false,
      )
      expect(nMarkers.length).toBe(genMarkers.length) // same crossings — the honesty payoff
      expect(bound).toBeGreaterThanOrEqual(nMarkers.length)
    }
  })
})

// F13's polynomial corner: degD=0 (constant D, no residue conditions, all S free) is the ordinary
// polynomial PH curve. degS=2 → the classic degree-5 quintic; the weights are all equal (a constant
// D degree-elevated), i.e. the curve is polynomial, not rational.
describe('degD=0 (constant D) = polynomial PH corner', () => {
  const C = (re: number, im = 0) => ({ re, im })
  it('degS=2, D=const → degree-5 curve, all weights equal & real, exactly PH', () => {
    const c = rationalPHExactFromParams({
      degS: 2, degD: 0, sFree: [C(0.9, 0.3), C(-0.4, 1.1), C(0.6, -0.5)], roots: [], origin: { x: -1, y: 2 },
    })
    expect(c.degree).toBe(5)
    expect(c.controlPoints.length).toBe(6)
    const w0 = c.controlPoints[0].w_re
    for (const p of c.controlPoints) {
      expect(Math.abs(p.w_re - w0)).toBeLessThan(1e-12) // all weights equal ⇒ polynomial
      expect(Math.abs(p.w_im)).toBeLessThan(1e-12)      // and real
    }
    expect(c.wronskianResidual).toBeLessThan(1e-10)
  })

  it('degS=3, D=const → degree-7 polynomial PH, exactly PH', () => {
    const c = rationalPHExactFromParams({
      degS: 3, degD: 0, sFree: [C(1, 0), C(0.2, 0.4), C(-0.3, 0.5), C(0.15, -0.2)], roots: [], origin: { x: 0, y: 0 },
    })
    expect(c.degree).toBe(7)
    expect(c.wronskianResidual).toBeLessThan(1e-10)
    const w0 = c.controlPoints[0].w_re
    for (const p of c.controlPoints) expect(Math.abs(p.w_re - w0) + Math.abs(p.w_im)).toBeLessThan(1e-12)
  })
})
