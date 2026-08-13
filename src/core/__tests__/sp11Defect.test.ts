// ============================================================================
// THE PH DEFECT: the square class made into a NUMBER, and where it can be computed.
//
// sp11SquareClass established that [q] ∈ ℝ(t)*/(ℝ(t)*)² is the Möbius-invariant content of PH, with
// PH ⟺ the class is trivial. This file turns that yes/no into a graded quantity — the degree of the
// ODD-MULTIPLICITY part of q = −det(Ĥ′), which is the square class's representative:
//
//     defect(c) = deg ∏_{eᵢ odd} pᵢ ,      q = ∏ pᵢ^{eᵢ}
//
// PH is defect 0. A curve with defect 8 is eight conditions away from PH, invariantly.
//
// AND A PRACTICAL FINDING THAT IS THE POINT OF THE FILE. The defect is computable in the COVARIANT
// column form and NOT in the real-denominator gauge. Measured: on the seed, q has degree 12 and
// resolves cleanly into 6 double roots (defect 0). Push the same curve through one inversion in the
// p/w form and q becomes degree 32 with leading coefficients at ~1e-15 relative; root-finding then
// reports 28 spurious SIMPLE roots instead of 6 doubles, and the defect reads 28 instead of 0.
// Nothing is wrong with the mathematics — the identity q̃ = q·⟨p,p⟩² still holds to 1e-12 — but the
// invariant has become unmeasurable in that representation.
//
// So this is a third reason to hold the column form, alongside degree and linearity: it is the only
// one of the two in which this invariant can actually be evaluated. Multiplicity detection is worth
// √ε at best, and the gauge fixing spends that budget before you start.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import {
  applyMobius, gTranslate, gRotate, gScale, G_INVERT, mMul, mScale, type Mat2,
} from '../sp11Factorisation'
import {
  fromRealDenominator, speedSquared, qpConst, pMax, pMul, pSub, pAdd, pDeriv, type Poly,
} from '../sp11RationalPH'

// --- complex roots, then multiplicity clustering ------------------------------
type C = { re: number; im: number }
const cMul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
const cSub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
const cDiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
const cAbs = (a: C): number => Math.hypot(a.re, a.im)
const cEval = (p: Poly, z: C): C => p.reduceRight<C>((a, c) => cAdd(cMul(a, z), { re: c, im: 0 }), { re: 0, im: 0 })

function allRoots(poly: Poly): C[] {
  const a = poly.slice()
  const s = pMax(a) || 1
  // 1e-10, not 1e-13: after a Mobius chain q carries dust at ~2e-11 relative, and a retained dust
  // coefficient becomes a spurious extra root. The genuine leading coefficients on these specimens
  // sit at ~1e-4 relative, so there are six orders of separation — this cuts machine zero, not signal.
  while (a.length > 1 && Math.abs(a[a.length - 1]) < 1e-10 * s) a.pop()
  const n = a.length - 1
  if (n < 1) return []
  const mon = a.map((c) => c / a[n])
  let z: C[] = Array.from({ length: n }, (_, k) =>
    ({ re: 0.4 * Math.cos(2.3 * k + 0.7), im: 0.4 * Math.sin(2.3 * k + 0.7) + 0.9 }))
  for (let it = 0; it < 4000; it++) {
    let move = 0
    z = z.map((zi, i) => {
      let den: C = { re: 1, im: 0 }
      z.forEach((zj, j) => { if (i !== j) den = cMul(den, cSub(zi, zj)) })
      if (cAbs(den) < 1e-300) return zi
      const step = cDiv(cEval(mon, zi), den)
      move = Math.max(move, cAbs(step))
      return cSub(zi, step)
    })
    if (move < 1e-14) break
  }
  return z
}

/**
 * Degree of the odd-multiplicity part ∏_{eᵢ odd} pᵢ — each distinct odd-multiplicity root counted
 * ONCE, whatever its multiplicity. The clustering tolerance is RELATIVE to root magnitude and
 * deliberately generous (1e-3): a root of multiplicity m is located to only ε^(1/m), so a double
 * root separates by ~1e-8 and anything tighter than that splits it and reports 2 instead of 1.
 */
export function defectOf(q: Poly, tol = 1e-3): number {
  const rs = allRoots(q)
  const used = new Array<boolean>(rs.length).fill(false)
  let odd = 0
  for (let i = 0; i < rs.length; i++) {
    if (used[i]) continue
    let count = 1
    used[i] = true
    for (let j = i + 1; j < rs.length; j++) {
      if (!used[j] && cAbs(cSub(rs[i], rs[j])) < tol * (1 + cAbs(rs[i]))) { used[j] = true; count++ }
    }
    // ONE per odd-multiplicity root: the odd part contains a triple root once, not three times.
    if (count % 2 === 1) odd += 1
  }
  return odd
}

const qOf = (p: readonly Poly[], w: Poly): Poly =>
  p.map((pi) => pSub(pMul(pDeriv(pi), w), pMul(pi, pDeriv(w))))
    .reduce<Poly>((acc, n) => pAdd(acc, pMul(n, n)), [0])
const degOf = (a: Poly): number => {
  const s = pMax(a) || 1
  let d = 0
  a.forEach((v, i) => { if (Math.abs(v) > 1e-9 * s) d = i })
  return d
}

// --- specimens ----------------------------------------------------------------
const m = toMember(seedQuintic())
const W = m.w as Poly
const P = (m.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]
  return Array.from({ length: Math.max(pi.length, W.length) }, (_, k) => (pi[k] ?? 0) + a * (W[k] ?? 0))
})
const NW: Poly = [1, 0.6, -0.3, 0.4]
const NP: Poly[] = [[0.2, 1.1, -0.7, 0.5], [-0.4, 0.3, 0.9, -0.2], [0.7, -0.5, 0.1, 0.8]]

const G: Mat2 = mMul(
  mMul(gTranslate([0.7, -1.3, 0.4]), G_INVERT),
  mMul(gTranslate([-2, 0.5, 1.1]), mMul(gRotate([0.6, 0.8, 0, 0]), gScale(1.7))),
)
const CHAIN: Mat2[] = [G, G_INVERT, gTranslate([1, -2, 0.5]), G, G_INVERT]

describe('the PH defect', () => {
  it('the algorithm is right on polynomials with KNOWN multiplicity structure', () => {
    const sq = (a: Poly): Poly => pMul(a, a)
    const t2p1: Poly = [1, 0, 1]           // t² + 1
    const t2p4: Poly = [4, 0, 1]           // t² + 4
    const tm1: Poly = [-1, 1]              // t − 1

    expect(defectOf(pMul(sq(t2p1), t2p4))).toBe(2)                 // even² · odd¹ → deg 2
    expect(defectOf(sq(pMul(t2p1, t2p4)))).toBe(0)                 // a perfect square → 0
    expect(defectOf(pMul(pMul(sq(t2p1), t2p1), sq(t2p4)))).toBe(2) // (t²+1)³(t²+4)² → deg 2
    expect(defectOf(pMul(sq(t2p1), tm1))).toBe(1)                  // one real simple root
    expect(defectOf(pMul(pMul(sq(t2p1), t2p4), tm1))).toBe(3)      // 2 + 1
  })

  it('and it is scale-invariant, as a square class must be', () => {
    const base = pMul(pMul([1, 0, 1], [1, 0, 1]), [4, 0, 1])
    for (const s of [1e-4, 0.5, 7, 1e3]) expect(defectOf(base.map((c) => c * s))).toBe(2)
  })

  it('THE SPECIMENS: PH is defect 0, and the ordinary curve is eight conditions away', () => {
    expect(defectOf(speedSquared(fromRealDenominator(P, W)))).toBe(0)
    const q = speedSquared(fromRealDenominator(NP, NW))
    expect(degOf(q)).toBe(8)
    expect(defectOf(q)).toBe(8)          // q is squarefree: every root simple
  })

  it('IN THE COLUMN FORM the defect survives a Mobius chain', () => {
    for (const [p, w, expected] of [[P, W, 0], [NP, NW, 8]] as [Poly[], Poly, number][]) {
      let V = fromRealDenominator(p, w)
      for (const g of CHAIN) V = applyMobius(g, V)
      expect(defectOf(speedSquared(V))).toBe(expected)
    }
  })

  it('and survives a rescaled generator, where q itself moves by lambda^4', () => {
    const U = fromRealDenominator(NP, NW)
    const scaled = applyMobius(mScale(gRotate([1, 0, 0, 0]), qpConst(1.7)), U)
    // the VALUE changed (that is pinned in sp11SquareClass); the CLASS, hence the defect, did not
    expect(defectOf(speedSquared(scaled))).toBe(8)
  })

  it('THE LIMITATION, measured: the gauge-fixed route makes the defect unmeasurable', () => {
    // same curve, one inversion done the ordinary way. The identity still holds exactly...
    const q = qOf(P, W)
    const p2 = P.map((pi) => pMul(pi, W))
    const w2 = P.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0])
    const q2 = qOf(p2, w2)
    const pred = pMul(q, pMul(w2, w2))
    const lead = pred.findIndex((v) => Math.abs(v) > 1e-12 * pMax(pred))
    const c = q2[lead] / pred[lead]
    let gap = 0
    for (let i = 0; i < Math.max(pred.length, q2.length); i++) gap = Math.max(gap, Math.abs((q2[i] ?? 0) - c * (pred[i] ?? 0)))
    expect(gap / (pMax(q2) || 1)).toBeLessThan(1e-12)     // ...the mathematics is fine

    // ...but the invariant can no longer be evaluated: the true defect is 0 (the curve is still PH)
    // and root-finding on a degree-32 polynomial whose leading coefficients are ~1e-15 relative
    // reports dozens of spurious simple roots instead of the doubled ones.
    expect(defectOf(q2)).toBeGreaterThan(10)             // measured 28, against a true value of 0
    expect(defectOf(speedSquared(fromRealDenominator(P, W)))).toBe(0)   // computable in the column
  })
})
