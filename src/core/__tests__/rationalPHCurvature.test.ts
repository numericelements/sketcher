// Pinning the generating-function rational-PH curvature-extrema numerator
// (rationalPHCurvature.ts). The claim: with z = A/B and A′B − AB′ = S², the honest
// reduced numerator Ñ = Im(S̄²·B̄·K′), K′ = S·W₁′ − 2·S′·W₁, W₁ = S′B − SB′, has
//   (1) sign(Ñ) ≡ sign(dκ/dt) ≡ sign(the general complex-rational Chen g), pointwise;
//   (2) degree 4·deg S + 2·deg B − 2  (16 for a degree-5 rational PH curve), versus the
//       general Chen g at degree 44 for the same curve — a real reduction, so a tighter
//       S⁻ bound on the same (fewer) coefficients.
// The general Chen g on (P = A/B, w = B) is the oracle (it is what the editor DISPLAYS
// for the drawable complex-rational curve). Core-only: the seed is a hard-coded fixture
// (a real ABPHMetadata the editor produces); the genuinely-rational fixture is derived
// from it by a det-1 Möbius map A→A, B→γA+1, which keeps it PH with the SAME S (the
// Wronskian scales by αδ−βγ = 1). No sketcher import (architecture boundary).
import { describe, it, expect } from 'vitest'
import { ComplexBD } from '../complexBernstein'
import { decomposeToBernstein } from '../bernstein'
import { curvatureExtremaNumeratorComplex } from '../curvature'
import {
  curvatureExtremaReducedNumeratorRationalPH, reducedNumeratorJacobianRationalPH,
  rationalPHBound, rationalPHMarkers,
} from '../rationalPHCurvature'

interface Meta {
  degree: number; aReCPs: number[]; aImCPs: number[]; bReCPs: number[]; bImCPs: number[]
  sReCPs: number[]; sImCPs: number[]; knots: number[]; sKnots: number[]
}

// A real degree-5 PH curve from the editor (createABPHFromTwoPoints(100,300,520,340)).
// B ≡ 1 here (this construction yields a polynomial PH curve).
const POLY: Meta = {
  degree: 5,
  aReCPs: [100, 116.5685424949, 251.2994231491, 425.2691193458, 536.5685424949, 520],
  aImCPs: [300, 126.0303038033, 14.7308806542, 31.2994231491, 166.0303038033, 340],
  bReCPs: [1, 1, 1, 1, 1, 1],
  bImCPs: [0, 0, 0, 0, 0, 0],
  sReCPs: [21.8703815643, 29.52653847, 19.88644959],
  sImCPs: [-19.88644959, 1.4028517525, 21.8703815643],
  knots: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  sKnots: [0, 0, 0, 1, 1, 1],
}

// det-1 Möbius (α=1, β=0, δ=1, γ complex): A→A, B→γ·A + 1 — genuinely rational (B
// non-constant, complex), still PH with the same S. |γ·A| ≈ 0.6 < 1 in [0,1] so B ≠ 0.
const gammaRe = 0.001, gammaIm = 0.0005
const RAT: Meta = {
  ...POLY,
  bReCPs: POLY.aReCPs.map((ar, i) => 1 + gammaRe * ar - gammaIm * POLY.aImCPs[i]),
  bImCPs: POLY.aReCPs.map((ar, i) => gammaRe * POLY.aImCPs[i] + gammaIm * ar),
}

const sDegOf = (m: Meta) => m.sKnots.length - m.sReCPs.length - 1
const reduced = (m: Meta) => curvatureExtremaReducedNumeratorRationalPH(
  m.sReCPs, m.sImCPs, m.sKnots, sDegOf(m), m.bReCPs, m.bImCPs, m.knots, m.degree,
)
const chen = (m: Meta) => {
  const n = m.aReCPs.length
  const Pre: number[] = [], Pim: number[] = []
  for (let i = 0; i < n; i++) {
    const b2 = m.bReCPs[i] ** 2 + m.bImCPs[i] ** 2
    Pre.push((m.aReCPs[i] * m.bReCPs[i] + m.aImCPs[i] * m.bImCPs[i]) / b2)
    Pim.push((m.aImCPs[i] * m.bReCPs[i] - m.aReCPs[i] * m.bImCPs[i]) / b2)
  }
  return curvatureExtremaNumeratorComplex(Pre, Pim, m.bReCPs, m.bImCPs, m.knots, m.degree)
}

describe.each([['polynomial B≡1', POLY], ['genuinely rational B', RAT]] as const)(
  'rational-PH generating-function numerator (%s)', (_label, m) => {
    it('sign(Ñ) ≡ sign(Chen g) and sign(dκ/dt), pointwise', () => {
      const N = reduced(m), g = chen(m)
      const sDeg = sDegOf(m)
      const S = new ComplexBD(decomposeToBernstein(m.sReCPs, m.sKnots, sDeg), decomposeToBernstein(m.sImCPs, m.sKnots, sDeg))
      const B = new ComplexBD(decomposeToBernstein(m.bReCPs, m.knots, m.degree), decomposeToBernstein(m.bImCPs, m.knots, m.degree))
      const sig = (t: number) => {
        const s = { re: S.re.evaluate(t), im: S.im.evaluate(t) }, b = { re: B.re.evaluate(t), im: B.im.evaluate(t) }
        const d = b.re * b.re + b.im * b.im
        return { re: (s.re * b.re + s.im * b.im) / d, im: (s.im * b.re - s.re * b.im) / d }
      }
      const h = 1e-5
      const kappa = (t: number) => {
        const s = sig(t), sp = { re: (sig(t + h).re - sig(t - h).re) / (2 * h), im: (sig(t + h).im - sig(t - h).im) / (2 * h) }
        return (2 * (s.re * sp.im - s.im * sp.re)) / (s.re * s.re + s.im * s.im) ** 2
      }
      const vals: number[] = [], gvals: number[] = []
      let compared = 0, agreeK = 0
      for (let k = 1; k < 400; k++) {
        const t = 0.02 + (0.96 * k) / 400
        const nv = N.evaluate(t), gv = g.evaluate(t), dk = (kappa(t + h) - kappa(t - h)) / (2 * h)
        vals.push(nv); gvals.push(gv)
        if (Math.abs(nv) < 1e-9 || Math.abs(dk) < 1e-9) continue
        compared++
        if (Math.sign(nv) === Math.sign(dk)) agreeK++
      }
      const tn = 1e-6 * Math.max(...vals.map(Math.abs)), tg = 1e-6 * Math.max(...gvals.map(Math.abs))
      let cRel = 0, aRel = 0
      for (let i = 0; i < vals.length; i++) {
        if (Math.abs(vals[i]) < tn || Math.abs(gvals[i]) < tg) continue
        cRel++; if (Math.sign(vals[i]) === Math.sign(gvals[i])) aRel++
      }
      expect(aRel).toBe(cRel)       // sign identity vs the general Chen g
      expect(agreeK).toBe(compared) // sign identity vs finite-differenced dκ/dt
    })

    it('degree is 4·degS + 2·degB − 2 and strictly below Chen g', () => {
      const N = reduced(m), g = chen(m)
      expect(N.coeffs[0].length - 1).toBe(4 * sDegOf(m) + 2 * m.degree - 2) // 16
      expect(N.coeffs[0].length - 1).toBeLessThan(g.coeffs[0].length - 1)   // 16 < 44
    })

    it('S⁻(Ñ) ≥ #markers — the one law that must always hold', () => {
      const sDeg = sDegOf(m)
      const sb = rationalPHBound(m.sReCPs, m.sImCPs, m.sKnots, sDeg, m.bReCPs, m.bImCPs, m.knots, m.degree)
      const markers = rationalPHMarkers(m.sReCPs, m.sImCPs, m.sKnots, sDeg, m.bReCPs, m.bImCPs, m.knots, m.degree)
      expect(sb).toBeGreaterThanOrEqual(markers.length)
    })

    it('analytic ∂Ñ/∂(S,B) matches finite differences', () => {
      const sDeg = sDegOf(m)
      const J = reducedNumeratorJacobianRationalPH(m.sReCPs, m.sImCPs, m.sKnots, sDeg, m.bReCPs, m.bImCPs, m.knots, m.degree)
      const base = reduced(m).flatCoeffs()
      const eps = 1e-4
      const scale = Math.max(...base.map(Math.abs), 1)
      // FD column for perturbing field[j] by eps
      const fd = (_get: () => number[], set: (v: number) => void, _j: number, cur: number) => {
        set(cur + eps); const plus = reduced(m).flatCoeffs(); set(cur)
        return plus.map((v, k) => (v - base[k]) / eps)
      }
      const cmp = (analytic: number[][], arr: number[]) => {
        for (let j = 0; j < arr.length; j++) {
          const cur = arr[j]
          const col = fd(() => arr, (v) => { arr[j] = v }, j, cur)
          for (let k = 0; k < col.length; k++) {
            expect(Math.abs(analytic[j][k] - col[k])).toBeLessThan(1e-3 * scale + 1e-6 * Math.abs(col[k]) * scale)
          }
        }
      }
      cmp(J.dSre, m.sReCPs); cmp(J.dSim, m.sImCPs)
      cmp(J.dBre, m.bReCPs); cmp(J.dBim, m.bImCPs)
    })
  },
)

it('numerator throws (does not silently misalign) when S and B breakpoints differ', () => {
  expect(() => curvatureExtremaReducedNumeratorRationalPH(
    POLY.sReCPs, POLY.sImCPs, [0, 0, 0, 0.5, 1, 1, 1], 2, // S has an interior break B lacks
    POLY.bReCPs, POLY.bImCPs, POLY.knots, POLY.degree,
  )).toThrow(/share breakpoints/)
})
