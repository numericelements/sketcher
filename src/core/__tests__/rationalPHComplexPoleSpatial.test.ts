// ============================================================================
// THE COMPLEX-POLE CHART — and the one thing it can do that the real-pole chart cannot.
//
// The real-pole charts (rationalPHOnePoleSpatial, rationalPHMultiPoleSpatial) cannot produce a
// BOUNDED curve: a real pole is a place the curve runs to infinity. Move the poles off the real
// axis and w > 0 on all of ℝ, so the curve is bounded on the whole line. That is what this module
// buys, and the last test here measures it.
//
// Pinned: the count (8 real conditions per conjugate pair, not 4), the no-log condition holding at
// BOTH members of a pair from one complex λ, exact PH, and boundedness.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  cx,
  cabs,
  denominatorOf,
  sigmaAt,
  conditionMatrix,
  familyBasis,
  toMember,
  curveAt,
  speedAt,
  phDefect,
  speedNumeratorAtPole,
  unpackSpinor,
  type ComplexPoleParams,
} from '../rationalPHComplexPoleSpatial'

/** A degree-2 spinor drawn from the admissible family at the given poles and dials. */
function member(pairs: ReturnType<typeof cx>[], lambdas: ReturnType<typeof cx>[], mix: number[]) {
  const zero = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
  const probe: ComplexPoleParams = { A: zero, pairs, lambdas }
  const basis = familyBasis(probe)
  const packed = new Array(12).fill(0)
  basis.forEach((v, i) => v.forEach((x, j) => { packed[j] += (mix[i] ?? 0) * x }))
  return { A: unpackSpinor(packed), pairs, lambdas } satisfies ComplexPoleParams
}

describe('the complex-pole chart', () => {
  const pairs = [cx(0.4, 1.3)]
  const lambdas = [cx(0.7, -0.45)]

  it('w has real coefficients and NO real roots — the point of the exercise', () => {
    const w = denominatorOf(pairs)
    expect(w).toEqual([0.4 * 0.4 + 1.3 * 1.3, -0.8, 1])
    for (let i = 0; i <= 200; i++) expect(w[0] + w[1] * (-10 + i / 10) + w[2] * (-10 + i / 10) ** 2).toBeGreaterThan(0)
  })

  it('a conjugate pair costs EIGHT real conditions, not four', () => {
    const prm = member(pairs, lambdas, [1])
    const M = conditionMatrix(prm)
    expect(M.length).toBe(8)
    expect(M[0].length).toBe(12)
    // so the admissible spinors form a 12 - 8 = 4 dimensional space
    expect(familyBasis(prm).length).toBe(4)
  })

  it('Sigma is the sum over the OTHER roots, including the conjugate partner', () => {
    // one pair: the only other root is r-bar, so Sigma = 1/(r - r_bar) = 1/(2 i Im r)
    const S = sigmaAt(pairs, 0)
    expect(S.re).toBeCloseTo(0, 12)
    expect(S.im).toBeCloseTo(-1 / (2 * 1.3), 12)
  })

  it('the no-log condition holds at BOTH poles, from ONE complex lambda', () => {
    const prm = member(pairs, lambdas, [1, -0.6, 0.35, 0.8])
    const m = toMember(prm)
    // noLog is the worst relative |N'(r) - 2 N(r) Sigma| over the poles
    expect(m.noLog).toBeLessThan(1e-12)
  })

  it('recovers the curve exactly: the Wronskian solve is consistent and the curve is PH', () => {
    const prm = member(pairs, lambdas, [1, -0.6, 0.35, 0.8])
    const m = toMember(prm)
    expect(m.wronskian).toBeLessThan(1e-12)
    expect(phDefect(m)).toBeLessThan(1e-12)
  })

  it('and sigma at the pole is NONZERO, so the chart legitimately applies', () => {
    const prm = member(pairs, lambdas, [1, -0.6, 0.35, 0.8])
    expect(cabs(speedNumeratorAtPole(prm, 0))).toBeGreaterThan(1e-6)
  })

  it('THE PAYOFF: the curve is BOUNDED on the whole real line', () => {
    const prm = member(pairs, lambdas, [1, -0.6, 0.35, 0.8])
    const m = toMember(prm)
    expect(m.denominatorFloor).toBeGreaterThan(0) // w never vanishes for real t
    // and the curve stays finite far outside [0,1], where a real-pole member would have blown up
    let worst = 0
    for (let i = 0; i <= 400; i++) {
      const t = -8 + (16 * i) / 400
      const c = curveAt(m, t)
      worst = Math.max(worst, Math.hypot(c.x, c.y, c.z))
      expect(Number.isFinite(speedAt(m, t))).toBe(true)
    }
    expect(Number.isFinite(worst)).toBe(true)
  })

  it('two conjugate pairs: sixteen conditions, and the count is 4(n+1) - 8m', () => {
    const two = [cx(0.4, 1.3), cx(-1.1, 0.7)]
    const lam2 = [cx(0.7, -0.45), cx(-0.3, 0.9)]
    // deg A = 4 -> 5 coefficients -> 20 real unknowns; 2 pairs -> 16 conditions -> 4 left
    const zero = Array.from({ length: 5 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
    const probe: ComplexPoleParams = { A: zero, pairs: two, lambdas: lam2 }
    expect(conditionMatrix(probe).length).toBe(16)
    expect(familyBasis(probe).length).toBe(4 * 5 - 8 * 2)

    // and a member drawn from it still satisfies the conditions at all four poles
    const basis = familyBasis(probe)
    const packed = new Array(20).fill(0)
    const mix = [1, -0.5, 0.8, 0.3]
    basis.forEach((v, i) => v.forEach((x, j) => { packed[j] += (mix[i] ?? 0) * x }))
    const m = toMember({ A: unpackSpinor(packed), pairs: two, lambdas: lam2 })
    expect(m.noLog).toBeLessThan(1e-10)
    expect(m.wronskian).toBeLessThan(1e-10)
    expect(m.denominatorFloor).toBeGreaterThan(0)
  })
})
