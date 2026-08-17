// ============================================================================
// THE λ-CHART AND THE CONFORMAL CONSTRUCTION COVER DISJOINT STRATA — measured on ONE
// scale-free indicator, per pole, so the two are compared like with like.
//
// This is the instrument for THE_MAP.md §6 question 1 (does the MIXED cell exist — some
// poles invertible, some singular?), and it has to exist before that question can be
// asked: until now the two rows were known to be disjoint by CONSTRUCTION (row 2 divides
// by σ(r) and so needs it nonzero; row 7 satisfies ‖N‖ = h·w and so kills σ at every root
// of w), never by a common measurement.
//
// THE INDICATOR. At a pole r, σ(r) = det 𝒜(r) = a² + b² + c² + d² over ℂ — a COMPLEX sum
// of squares, which is why it can vanish off the real axis with 𝒜(r) ≠ 0. Divide by the
// Hermitian norm ‖𝒜(r)‖² = |a|² + |b|² + |c|² + |d|², which cannot vanish unless 𝒜(r) = 0:
//
//     softness(r) = |σ(r)| / ‖𝒜(r)‖²      ∈ [0, 1]
//
//     0   rank 1 — 𝒜(r) singular but NONZERO. The chart's hole. SOFT.
//     1   as far from singular as the pole can be.                HARD.
//
// Scale-free in 𝒜, so members of different degrees and normalisations are comparable, and
// PER POLE, never a norm over the poles — a norm hides exactly the mixed signature the
// open question is about (one pole at σ ≈ 0 while another sits at O(1)).
//
// THE MEASUREMENT. Softness ~2e-11 at all six poles of the conformal sextic against 0.69
// to 0.99 on λ-chart members: ten orders of magnitude, with nothing in between. And the
// conformal poles are RANK 1 rather than a degree drop — ‖𝒜(r)‖² runs from 7.4e-2 to 15,
// nowhere near zero — which is the distinction that makes them a chart's hole rather than
// a lower-degree curve in disguise.
//
// WHAT IS STILL OPEN, and what this file does not claim: every member measured here is
// uniformly soft or uniformly hard, which is what each construction guarantees. It is NOT
// evidence that the mixed cell is empty — neither construction can produce one, so
// neither can look for one. That needs the continuation of §6, and the Lean side has
// proved a conjugate pair is both soft or both hard, so the first place mixed can occur
// is m ≥ 3 poles.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import { sexticSeed } from '../conformalPHSeeds'
import { hopfForm, hodograph, rootsOf } from '../conformalPHHopf'
import { type Quat } from '../quaternion'
import {
  cx, familyBasis, unpackSpinor, toMember, phDefect, type ComplexPoleParams,
} from '../rationalPHComplexPoleSpatial'

const C = (re: number, im = 0): Complex => ({ re, im })

/** A quaternion polynomial at a COMPLEX argument — four complex components. */
function evalQuatPoly(A: readonly Quat[], z: Complex): Complex[] {
  let acc: Complex[] = [C(0), C(0), C(0), C(0)]
  for (let k = A.length - 1; k >= 0; k--) {
    const c = [A[k].u, A[k].v, A[k].p, A[k].q]
    acc = acc.map((a, i) => cadd(cmul(z, a), C(c[i])))
  }
  return acc
}

/** |σ(r)| / ‖𝒜(r)‖² — see the header. Zero is the chart's hole. */
function probe(A: readonly Quat[], z: Complex) {
  const q = evalQuatPoly(A, z)
  let s: Complex = C(0)
  for (const a of q) s = cadd(s, cmul(a, a))
  const herm = q.reduce((t, a) => t + a.re * a.re + a.im * a.im, 0)
  return { sigma: cnorm(s), herm, softness: cnorm(s) / Math.max(herm, 1e-300) }
}

describe('the two charts cover disjoint strata', () => {
  it('every pole of the conformal member is SOFT, and rank one rather than a degree drop', () => {
    const s = sexticSeed()
    const hf = hopfForm(s)
    expect(hf).not.toBeNull()
    const hg = hodograph(s)
    // The extraction must be trustworthy before its σ means anything.
    expect(hf!.sandwichDefect).toBeLessThan(1e-9)
    expect(hf!.normDefect).toBeLessThan(1e-9)

    const poles = rootsOf(hg.w.map((c) => C(c)))
    expect(poles.length).toBe(6)
    for (const r of poles) {
      const d = probe(hf!.A, r)
      expect(d.softness).toBeLessThan(1e-8)   // σ(r) = 0: the λ-chart cannot go here
      expect(d.herm).toBeGreaterThan(1e-3)    // 𝒜(r) ≠ 0: RANK ONE, not a degree drop
    }
  })

  it('every λ-chart member is HARD at its pole', () => {
    for (const [n, re, im, lr, li] of [
      [3, 0.5, 0.8, 0.3, 0.0], [3, 1.4, 0.6, -0.2, 0.5], [4, 0.5, 1.2, 0.3, 0.4],
    ] as const) {
      const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
      const base: ComplexPoleParams = {
        A: Array.from({ length: n + 1 }, () => ZQ), pairs: [cx(re, im)], lambdas: [cx(lr, li)],
      }
      const B = familyBasis(base)
      expect(B.length).toBeGreaterThan(0)
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => {
        const a = 1.3 * Math.sin(1.7 * i + 0.6)
        for (let j = 0; j < 4 * (n + 1); j++) x[j] += a * b[j]
      })
      const m: ComplexPoleParams = { ...base, A: unpackSpinor(x) }
      expect(phDefect(toMember(m))).toBeLessThan(1e-12)
      expect(probe(m.A, C(re, im)).softness).toBeGreaterThan(0.5)
    }
  })

  it('and nothing measured lands between them', () => {
    // Ten orders of magnitude with an empty middle. Which is the point: two charts that
    // do not overlap are not an atlas, and the connective tissue is what §6 asks for.
    const hf = hopfForm(sexticSeed())!
    const hg = hodograph(sexticSeed())
    const soft = rootsOf(hg.w.map((c) => C(c))).map((r) => probe(hf.A, r).softness)

    const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
    const base: ComplexPoleParams = {
      A: Array.from({ length: 4 }, () => ZQ), pairs: [cx(0.5, 0.8)], lambdas: [cx(0.3, 0)],
    }
    const B = familyBasis(base)
    const x = new Array<number>(16).fill(0)
    B.forEach((b, i) => {
      const a = 1.3 * Math.sin(1.7 * i + 0.6)
      for (let j = 0; j < 16; j++) x[j] += a * b[j]
    })
    const hard = probe(unpackSpinor(x), C(0.5, 0.8)).softness

    expect(Math.log10(hard / Math.max(...soft))).toBeGreaterThan(8)
  })
})
