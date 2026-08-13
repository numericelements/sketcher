// ============================================================================
// TAKING AN EXISTING RATIONAL PH CURVE THROUGH A MÖBIUS TRANSFORMATION.
//
// The practical question: given a rational PH curve you already have — written the ordinary way as
// p/w with w real — can you put it in the covariant form and push a Möbius map through it? Yes, and
// the two directions cost very different things:
//
//   INTO the form:  free. The column IS (w, p). No computation at all.
//   THE MAP:        U ↦ GU, a constant matrix times a polynomial column. LINEAR, so no degree grows,
//                   and PH survives exactly — verified here against the map applied POINTWISE, which
//                   is what shows the column transports the geometry rather than merely staying
//                   self-consistent.
//   BACK OUT:       costs. The gauge fixing U ↦ U·Ā makes the denominator |A|², of degree 2·deg A.
//                   Measured below: a degree-2 denominator comes back as degree 8 after one generic
//                   Möbius map, and the seed's degree-2 denominator becomes degree 10 under inversion.
//
// SO THE ANSWER IS: representing and transforming are free; INSISTING ON A REAL DENOMINATOR
// AFTERWARDS is the whole cost. If a pipeline can hold the column form between operations, a chain
// of Möbius maps is a chain of constant matrix products and the degree never moves at all — pinned
// in the last test, where five maps in a row leave the degree where it started.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import {
  applyMobius, mobiusPoint, gTranslate, gRotate, gScale, G_INVERT, mMul, type Mat2,
} from '../sp11Factorisation'
import {
  fromRealDenominator, toRealDenominator, curveAt, phDefect, nullPart, qpDegree,
  qpNorm, covariantWronskian, polySqrt, pMax, qpMax, type Poly, type Column,
} from '../sp11RationalPH'

const nullGap = (U: Column): number => pMax(nullPart(U)) / ((qpMax(U.A) * qpMax(U.C)) || 1)

// an ordinary rational PH curve, in the form anybody would already have it
const m = toMember(seedQuintic())
const W = m.w as Poly
const P = (m.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]     // translated off the origin so inversion is non-degenerate
  return Array.from({ length: Math.max(pi.length, W.length) }, (_, k) => (pi[k] ?? 0) + a * (W[k] ?? 0))
})
const CIRCLE_W: Poly = [1, 0, 1]
const CIRCLE_P: Poly[] = [[1, 0, -1], [0, 2], [0]]

/** A generic Möbius map: rotate, scale, translate, invert, translate again. */
const G_GENERIC: Mat2 = mMul(
  mMul(gTranslate([0.7, -1.3, 0.4]), G_INVERT),
  mMul(gTranslate([-2, 0.5, 1.1]), mMul(gRotate([0.6, 0.8, 0, 0]), gScale(1.7))),
)

describe('an existing PH curve through a Mobius map', () => {
  it('going IN is free: the column is literally (w, p)', () => {
    const U = fromRealDenominator(P, W)
    expect(U.A[0]).toEqual(W)                       // A is w, untouched
    expect(nullGap(U)).toBeLessThan(1e-12)
    expect(phDefect(U)).toBeLessThan(1e-9)          // and it is the same PH curve
    // and it round-trips back UNCHANGED — same coefficients, same degree, nothing inflated
    const back = toRealDenominator(U)!
    expect(back.w).toEqual(W)
    for (let i = 0; i < 3; i++) {
      expect(back.p[i].length).toBe(P[i].length)
      for (let k = 0; k < P[i].length; k++) expect(back.p[i][k]).toBeCloseTo(P[i][k], 12)
    }
  })

  it('THE MAP IS FREE TOO: PH survives and no degree moves', () => {
    for (const [w, p] of [[W, P], [CIRCLE_W, CIRCLE_P]] as [Poly, Poly[]][]) {
      const U = fromRealDenominator(p, w)
      const V = applyMobius(G_GENERIC, U)
      expect(nullGap(V)).toBeLessThan(1e-10)
      expect(phDefect(V)).toBeLessThan(1e-8)
      // degrees: the column is a CONSTANT matrix times U, so each entry is bounded by the input
      const before = Math.max(qpDegree(U.A), qpDegree(U.C))
      expect(Math.max(qpDegree(V.A), qpDegree(V.C))).toBeLessThanOrEqual(before)
    }
  })

  it('and it transports the GEOMETRY: the mapped column agrees with the map applied pointwise', () => {
    const U = fromRealDenominator(P, W)
    const V = applyMobius(G_GENERIC, U)
    let checked = 0
    for (let i = 0; i <= 60; i++) {
      const t = -3 + i / 10
      const before = curveAt(U, t)
      if (!before) continue
      const expected = mobiusPoint(G_GENERIC, [before.x, before.y, before.z])
      const actual = curveAt(V, t)
      if (!expected || !actual) continue
      const scale = 1 + Math.hypot(...expected)
      expect(Math.hypot(actual.x - expected[0], actual.y - expected[1], actual.z - expected[2]) / scale)
        .toBeLessThan(1e-9)
      checked++
    }
    expect(checked).toBeGreaterThan(40)
  })

  it('COMING BACK OUT is what costs: the denominator degree doubles', () => {
    const U = fromRealDenominator(P, W)
    expect(qpDegree(U.A)).toBe(2)                     // w = (t-1.7)(t+0.9)

    const V = applyMobius(G_GENERIC, U)
    const out = toRealDenominator(V)
    expect(out).not.toBeNull()
    // deg |A|² = 2·deg A, and A picked up p's degree through the inversion inside G
    expect(out!.w.length - 1).toBe(2 * qpDegree(V.A))
    expect(out!.w.length - 1).toBeGreaterThan(2)      // strictly worse than we started

    // the pure inversion case, which is the one measured in mobiusMovesTheStratum: 2 -> 10
    const inv = applyMobius(G_INVERT, U)
    expect(qpDegree(inv.A)).toBe(5)                   // A becomes -p
    expect(toRealDenominator(inv)!.w.length - 1).toBe(10)
  })

  it('BUT A CHAIN OF MAPS IS FREE: five in a row and the degree has not moved', () => {
    const U = fromRealDenominator(P, W)
    const start = Math.max(qpDegree(U.A), qpDegree(U.C))
    let V = U
    const chain = [G_GENERIC, G_INVERT, gTranslate([1, -2, 0.5]), gRotate([0.3, 0, 0.9, 0.2]), G_GENERIC]
    for (const G of chain) V = applyMobius(G, V)
    expect(Math.max(qpDegree(V.A), qpDegree(V.C))).toBeLessThanOrEqual(start)
    expect(nullGap(V)).toBeLessThan(1e-9)
    expect(polySqrt(qpNorm(covariantWronskian(V)))).not.toBeNull()   // still PH after all five
    // whereas fixing a real denominator even ONCE at the end already costs the doubling
    expect(toRealDenominator(V)!.w.length - 1).toBe(2 * qpDegree(V.A))
  })
})
