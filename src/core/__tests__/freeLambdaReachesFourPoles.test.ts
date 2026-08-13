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
import { solveWithFreeLambda } from '../rationalPHFreeLambda'
import {
  type MultiPoleParams,
  familyBasis, phDefect, poleMargin, toMember,
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
    for (const [roots, n] of [[[1.7], 2], [[1.7, -0.9, 2.6], 3]] as const) {
      const sol = solveWithFreeLambda(roots as number[], n)
      expect(sol).not.toBeNull()
      expect(phDefect(toMember(sol!.params))).toBeLessThan(1e-12)
      expect(sol!.lambdaFormResidual).toBeLessThan(1e-12)
    }
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
