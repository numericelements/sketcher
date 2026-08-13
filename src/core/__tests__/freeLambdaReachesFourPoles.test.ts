// ============================================================================
// SOLVING FOR THE TWIST RATES REACHES WHERE THE LINEAR CONSTRUCTION BUILDS NOTHING.
//
// At (n, m) = (3, 4) the fixed-λ fibre is 4(n+1) − 4m = 0: `familyBasis` returns an empty list and the
// chart's whole method — take the nullspace, combine the basis — has nothing to work with. Yet the
// variety there is four-dimensional, 4(n+1) − 3m, because with λ FREE the residue costs three real
// conditions per pole rather than four. All four dimensions sit in the λ's, which the linear
// construction is handed rather than solves for.
//
// Eliminating λ leaves pure quadrics in the spinor, three per pole, and those can be solved directly.
// This file measures that the result is a genuine rational PH quartic with four poles.
//
// AND IT NEEDED A BUG FIX IN toMember TO WORK AT ALL, which is the more useful finding. That function
// set the numerator degree to 2n − m + 1 — correct when the numerator outranks the denominator, wrong
// when it does not. ∫N/w² = q/w with deg q ≤ m − 1, and the integration constant then makes
// p = q + Cw of degree m. Pinning p(0) = 0 with the smaller degree is an inconsistent system, and it
// showed up exactly as one: the Wronskian residual read 1.9e-2 at (3,4) against 1e-15 everywhere else,
// while every other indicator — the quadrics, the λ-form, even phDefect — read machine zero, because
// they are all computed from 𝒜 and N and never look at p.
//
// So the curve was wrong and only one number knew. deg p = max(2n − m + 1, m) fixes it, changes
// nothing for m ≤ n where the first term already dominates, and the whole 1000-test suite is
// unaffected.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { freeLambdaTangent, solveWithFreeLambda, stepAlong } from '../rationalPHFreeLambda'
import {
  type MultiPoleParams,
  curveAt, familyBasis, packSpinor, phDefect, poleMargin, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { jacobian, layoutFor, pack, rankOf, residual } from '../rationalPHVariety'
import type { Quat } from '../quaternion'

const L = layoutFor(4)
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-9 * s) top--
  return top
}
const fibreAt = (n: number, roots: number[]): number =>
  familyBasis({ A: ZERO(n + 1), roots, lambdas: roots.map(() => 0.3) }).length

const FOUR_POLE_SETS: number[][] = [
  [1.7, -0.9, 2.6, -3.1],
  [1.6, -1.2, 2.2, -2.8],
  [2.0, -0.7, 3.0, -1.9],
]

describe('solving for the twist rates', () => {
  it('the linear construction really does build nothing at n + 1 = m', () => {
    for (const roots of FOUR_POLE_SETS) expect(fibreAt(3, roots)).toBe(0)
    expect(fibreAt(4, [1.7, -0.9, 2.6, -3.1, 4.2])).toBe(0)
    // …while it is perfectly healthy on either side
    expect(fibreAt(2, [1.7])).toBe(8)
    expect(fibreAt(3, [1.7, -0.9, 2.6])).toBe(4)
  })

  it('THE QUADRIC SOLVE REACHES (3,4), and what it returns is a PH quartic with four poles', () => {
    for (const roots of FOUR_POLE_SETS) {
      const sol = solveWithFreeLambda(roots, 3)
      expect(sol).not.toBeNull()
      expect(sol!.residual).toBeLessThan(1e-12)            // the residue quadrics hold
      expect(sol!.lambdaFormResidual).toBeLessThan(1e-12)  // and the λ-form is recovered, not assumed
      expect(sol!.params.lambdas.length).toBe(4)

      const m = toMember(sol!.params)
      expect(m.wronskian).toBeLessThan(1e-12)              // p really does reproduce N — the bug above
      expect(phDefect(m)).toBeLessThan(1e-12)
      expect(trim(m.w as number[])).toBe(4)                // four poles
      expect(Math.max(...(m.p as number[][]).map(trim))).toBe(4)
      expect(poleMargin(sol!.params)).toBeGreaterThan(0.1) // and none of them on the drawn piece
    }
  })

  it('and the member sits on the variety, measured by the independent exact system', () => {
    for (const roots of FOUR_POLE_SETS) {
      const m = toMember(solveWithFreeLambda(roots, 3)!.params)
      const x = pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
      const scale = Math.max(...x.map(Math.abs)) ** 4
      expect(Math.max(...residual(x, L).map(Math.abs)) / scale).toBeLessThan(1e-14)
    }
  })

  it('THE toMember FIX: the numerator degree is max(2n − m + 1, m), and only one number caught it', () => {
    // (3,4): 2n − m + 1 = 3 but deg w = 4, so the numerator is degree 4 after the integration constant
    const m34 = toMember(solveWithFreeLambda(FOUR_POLE_SETS[0], 3)!.params)
    expect(Math.max(...(m34.p as number[][]).map(trim))).toBe(4)
    expect(m34.wronskian).toBeLessThan(1e-12)

    // and nothing changes where the numerator already outranked the denominator
    const one: MultiPoleParams = solveWithFreeLambda([1.7], 2)!.params
    const m21 = toMember(one)
    expect(trim(m21.w as number[])).toBe(1)
    expect(Math.max(...(m21.p as number[][]).map(trim))).toBe(4)   // 2n − m + 1 = 4, unchanged
    expect(m21.wronskian).toBeLessThan(1e-12)
  })

  it('the solver also reproduces the families the linear construction already had', () => {
    const known: [number[], number][] = [[[1.7], 2], [[1.7, -0.9, 2.6], 3]]
    for (const [roots, n] of known) {
      const sol = solveWithFreeLambda(roots, n)
      expect(sol).not.toBeNull()
      expect(phDefect(toMember(sol!.params))).toBeLessThan(1e-12)
      expect(sol!.lambdaFormResidual).toBeLessThan(1e-12)
    }
  })

  it('AND YOU CAN MOVE WITHIN IT: predictor–corrector walks stay exactly PH', () => {
    // No linear fibre to combine here, so a slider costs a solve per step rather than a dot product.
    for (const roots of FOUR_POLE_SETS.slice(0, 2)) {
      const sol = solveWithFreeLambda(roots, 3)!
      const x0 = packSpinor(sol.params.A)
      const m0 = toMember(sol.params)
      let diameter = 0
      for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
        const a = curveAt(m0, i / 20), b = curveAt(m0, j / 20)
        diameter = Math.max(diameter, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z))
      }
      const signature = (x: number[]): number[] => {
        const m = toMember({ ...sol.params, A: unpackSpinor(x) })
        return [0.2, 0.5, 0.8].flatMap((t) => { const v = curveAt(m, t); return [v.x, v.y, v.z] })
      }
      const s0 = signature(x0)

      let bestMove = 0
      let landed = 0
      const T = freeLambdaTangent(x0, roots)
      for (const d of T) {
        const y = stepAlong(x0, roots, d, 0.4)
        if (!y) continue
        landed++
        expect(phDefect(toMember({ ...sol.params, A: unpackSpinor(y) }))).toBeLessThan(1e-12)
        bestMove = Math.max(bestMove, Math.hypot(...signature(y).map((v, i) => v - s0[i])) / diameter)
      }
      expect(landed).toBeGreaterThanOrEqual(T.length - 1)   // 35 of 36 steps landed
      expect(bestMove).toBeGreaterThan(0.3)                 // measured 0.35 … 0.54 of the curve's size
    }
  })

  it('BUT THE TANGENT IS 6-DIMENSIONAL WHERE THE COUNT SAYS 3 — recorded, not explained', () => {
    // dim 𝒱 = 4(n+1) − 3m = 4 at (3,4), so with the unit-norm equation the tangent should be 3. It
    // measures 6, meaning three of the thirteen equations are dependent here. That matches the other
    // symptom — rank 7 rather than 13 in the (p,w,σ) system — so these points are degenerate in both
    // formulations at once, and the dimension formula is not describing them.
    for (const roots of FOUR_POLE_SETS) {
      const sol = solveWithFreeLambda(roots, 3)!
      expect(freeLambdaTangent(packSpinor(sol.params.A), roots).length).toBe(6)
    }
    // where the linear construction works, the count and the tangent agree
    const three = solveWithFreeLambda([1.7, -0.9, 2.6], 3)!
    expect(freeLambdaTangent(packSpinor(three.params.A), [1.7, -0.9, 2.6]).length)
      .toBe(familyBasis(three.params).length - 1 + 3)       // fibre 4, minus the norm, plus the λ's
  })

  it('every member the chart builds is a SINGULAR point of the variety — including the new ones', () => {
    const rankOfMember = (prm: MultiPoleParams): number => {
      const m = toMember(prm)
      return rankOf(jacobian(pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L), L))
    }
    expect(rankOfMember(solveWithFreeLambda([1.7], 2)!.params)).toBe(11)
    expect(rankOfMember(solveWithFreeLambda([1.7, -0.9, 2.6], 3)!.params)).toBe(7)
    for (const roots of FOUR_POLE_SETS) expect(rankOfMember(solveWithFreeLambda(roots, 3)!.params)).toBe(7)
    // against 13 at a generic point (degree4IsThirteen), so reaching (3,4) has not by itself
    // moved us off the singular locus — which is the next thing to understand.
    expect(L.equations).toBe(13)
  })
})
