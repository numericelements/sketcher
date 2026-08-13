// ============================================================================
// THE SQUARE CLASS OF −det(Ĥ′) IS THE MÖBIUS-INVARIANT CONTENT OF THE PH CONDITION.
//
// WHY THIS IS THE RIGHT INVARIANT. σ is not a function, it is a conformal density of WEIGHT ONE:
// under a Möbius map |c′| ↦ ρ|c′|, which is why "PH is metric and Möbius is not" kept forcing a
// trade. But q := −det(Ĥ′) = σ², so q ↦ q·ρ² — multiplied by a SQUARE, always, unconditionally.
// Hence the square class [q] ∈ ℝ(t)*/(ℝ(t)*)² is Möbius-invariant, and
//
//     PH  ⟺  the square class of q is trivial.
//
// Squaring kills the conformal weight automatically, which is why this works where dividing by a
// second density (conformal arc length) would have risked irrationality. The statement is
// elementary and is imported from quadratic-form theory over ℝ[t], not discovered here.
//
// MEASURED, and the two representations show it differently:
//
//   COLUMN FORM      q is INVARIANT OUTRIGHT, q̃ = q, after a chain of five Möbius maps including
//                    two inversions. Degree does not move. That is stronger than square-class
//                    invariance and it holds because these generators have M†JM = ±J, so det is
//                    preserved exactly. Rescale a generator and the constant reappears as λ⁴ — a
//                    square, so the CLASS survives even when the value does not (last test).
//
//   REAL-DENOMINATOR q̃ = q·⟨p,p⟩² exactly, to 1e-12. The value is not invariant at all and the
//   GAUGE            degree grows by 2·deg⟨p,p⟩ = 4·deg p — but the extra factor is a PERFECT
//                    SQUARE, so the class is untouched. (The growth is derived from the identity,
//                    not measured: on the seed q̃'s leading coefficients are ~1e-15 relative and the
//                    measured degree slides with the threshold. An earlier exploratory reading of
//                    "grew by 14" was that artefact; the true figure is 20.)
//
// So the square class is precisely what survives the gauge choice: the covariant form sees an
// invariant, the gauge-fixed form sees only its shadow. And PH — trivial class — is preserved by
// both readings, before and after, for a PH curve and for a deliberately non-PH one.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import {
  applyMobius, gTranslate, gRotate, gScale, G_INVERT, mMul, mScale, type Mat2,
} from '../sp11Factorisation'
import {
  fromRealDenominator, speedSquared, qpConst,
  pMax, pMul, pSub, pAdd, pDeriv, type Poly,
} from '../sp11RationalPH'

const degOf = (a: Poly): number => {
  const s = pMax(a) || 1
  let d = 0
  a.forEach((v, i) => { if (Math.abs(v) > 1e-9 * s) d = i })   // 1e-9: round-off leaves dust above 1e-12
  return d
}
/** Best constant c with b ≈ c·a, and the worst relative deviation from it. */
function proportionality(a: Poly, b: Poly): { c: number; gap: number } {
  const lead = a.findIndex((v) => Math.abs(v) > 1e-12 * pMax(a))
  const c = b[lead] / a[lead]
  let d = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) d = Math.max(d, Math.abs((b[i] ?? 0) - c * (a[i] ?? 0)))
  return { c, gap: d / (pMax(b) || 1) }
}
/** Is q a perfect square? Residual of the coefficient recursion — NOT polySqrt, which has guards. */
function squareResidual(q: Poly): number {
  if ((q[0] ?? 0) <= 0) return NaN
  const n = Math.floor((q.length - 1) / 2)
  const hat = q.map((c) => c / q[0])
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
/** q for a curve written the ordinary way: |wp′ − w′p|². */
const qOf = (p: readonly Poly[], w: Poly): Poly =>
  p.map((pi) => pSub(pMul(pDeriv(pi), w), pMul(pi, pDeriv(w))))
    .reduce<Poly>((acc, n) => pAdd(acc, pMul(n, n)), [0])

// --- one PH curve and one deliberately ordinary one --------------------------
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

describe('the square class of -det(H-prime)', () => {
  it('PH vs not-PH IS the square class being trivial or not', () => {
    expect(squareResidual(speedSquared(fromRealDenominator(P, W)))).toBeLessThan(1e-9)
    expect(squareResidual(speedSquared(fromRealDenominator(NP, NW)))).toBeGreaterThan(1e-2)
  })

  it('IN THE COLUMN FORM q is invariant outright — five Mobius maps, two inversions', () => {
    for (const [p, w, tol] of [[P, W, 1e-5], [NP, NW, 1e-9]] as [Poly[], Poly, number][]) {
      const U = fromRealDenominator(p, w)
      const q = speedSquared(U)
      let V = U
      for (const g of CHAIN) V = applyMobius(g, V)
      const qt = speedSquared(V)
      expect(degOf(qt)).toBe(degOf(q))                      // degree does not move
      const { c, gap } = proportionality(q, qt)
      expect(Math.abs(c - 1)).toBeLessThan(1e-6)            // and the value is unchanged
      expect(gap).toBeLessThan(tol)                          // 1e-5 on the seed: round-off at degree 12
    }
  })

  it('IN THE REAL-DENOMINATOR GAUGE it is NOT invariant — but the extra factor is a SQUARE', () => {
    for (const [p, w, stableDegree] of [[P, W, false], [NP, NW, true]] as [Poly[], Poly, boolean][]) {
      const q = qOf(p, w)
      // one inversion, the ordinary way: (p, w) -> (p*w, <p,p>)
      const p2 = p.map((pi) => pMul(pi, w))
      const w2 = p.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0])
      const q2 = qOf(p2, w2)

      // THE CLAIM, and it is exact: q2 = q * <p,p>^2 — multiplied by a perfect square.
      expect(proportionality(pMul(q, pMul(w2, w2)), q2).gap).toBeLessThan(1e-12)

      // The degree therefore grows by 2*deg<p,p> = 4*deg p. That is DERIVED from the identity
      // rather than measured, because q2's leading coefficients sit at ~1e-15 relative on the
      // seed and the measured degree slides with the threshold (23 / 26 / 29 at 1e-9 / -12 / -15).
      // <p,p> itself is well conditioned — its leading coefficient is a sum of squares.
      const degP = Math.max(...p.map(degOf))
      expect(degOf(w2)).toBe(2 * degP)
      const predictedGrowth = 2 * degOf(w2)
      expect(predictedGrowth).toBe(4 * degP)

      // where the arithmetic IS well conditioned, the measured growth matches the prediction
      if (stableDegree) expect(degOf(q2) - degOf(q)).toBe(predictedGrowth)
    }
  })

  it('so the CLASS is preserved by both readings: PH before iff PH after', () => {
    for (const [p, w, isPH] of [[P, W, true], [NP, NW, false]] as [Poly[], Poly, boolean][]) {
      let V = fromRealDenominator(p, w)
      for (const g of CHAIN) V = applyMobius(g, V)
      const after = squareResidual(speedSquared(V))
      if (isPH) expect(after).toBeLessThan(1e-5)
      else expect(after).toBeGreaterThan(1e-2)

      // and the same through the gauge-fixed route, where the degree grew
      const p2 = p.map((pi) => pMul(pi, w))
      const w2 = p.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0])
      const afterGauge = squareResidual(qOf(p2, w2))
      if (isPH) expect(afterGauge).toBeLessThan(1e-8)
      else expect(afterGauge).toBeGreaterThan(1e-2)
    }
  })

  it('and rescaling a generator shows the CLASS surviving where the VALUE does not', () => {
    // U -> lambda*U sends H -> lambda^2 H, so q -> lambda^4 q. Not invariant; still a square factor.
    const U = fromRealDenominator(NP, NW)
    const q = speedSquared(U)
    const lambda = 1.7
    const scaled = applyMobius(mScale(gRotate([1, 0, 0, 0]), qpConst(lambda)), U)
    const qs = speedSquared(scaled)
    const { c, gap } = proportionality(q, qs)
    expect(gap).toBeLessThan(1e-10)                          // still proportional
    expect(Math.abs(c - lambda ** 4)).toBeLessThan(1e-8)     // by lambda^4, NOT by 1
    expect(Math.abs(Math.sqrt(c) - lambda ** 2)).toBeLessThan(1e-8)   // and lambda^4 is a square
  })
})
