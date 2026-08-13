// ============================================================================
// FACTORISATION AGAINST THE JOINT (A, C) PROBLEM — a measured NEGATIVE result.
//
// THE HOPE. sp11RationalPH solves for C with A prescribed: a slice, not a parametrisation. The route
// Schröcker & Šír use classically is quaternion polynomial FACTORISATION, so the natural attempt is
// to build the motion as a product of LINEAR Sp(1,1) factors and read the curve off the first column.
// If PH came out automatically, the joint problem would be parametrised and we would have a chart.
//
// WHAT FACTORISATION DOES GIVE, exactly and for free (all machine zero below):
//   · group membership: M†JM = ρJ with ρ = Π(t² + dⱼ) REAL, predictable from the factors alone
//   · the null condition on the column, automatically — nothing to enforce
//   · degree control: deg A = k, deg C = k−1 for k factors, growing by one per factor
//   · boundedness control: every dⱼ > 0 ⟹ ρ has no real root
//
// WHAT IT DOES NOT GIVE, and this is the result: PH.
//   · k = 1 is ALWAYS PH — and the reason is a two-line derivation, not luck. For M = tI − H,
//     M† = tI + JHJ so M⁻¹M′ = ρ⁻¹(tI + H), hence ω₂₁ = H₂₁/ρ has CONSTANT direction and |Ñ|² comes
//     out a constant. Those curves are the one-parameter-subgroup trajectories: circles and lines.
//   · k ≥ 2 is never PH ONCE ANY FACTOR IS ELLIPTIC OR HYPERBOLIC: 0/103 at k = 2 and 0/114 at k = 3
//     over factor sets containing at least one non-parabolic factor. Two such factors conjugate the
//     directions apart and the sum in Ω = Σⱼ Gⱼ⁻¹(Fⱼ⁻¹Fⱼ′)Gⱼ stops having constant direction.
//   · the ONLY k ≥ 2 survivors are ALL-PARABOLIC (d = 0, translation-type) products, and the ones
//     that always work are degenerate: unconjugated parabolic factors give a straight LINE.
//     Conjugated ones work only when they happen to share a parabolic subgroup (12/60, 7/60, 4/60,
//     1/60 at k = 2..5).
//
// A CORRECTION THIS FILE ONCE GOT WRONG. The first version read 0/60 at every k ≥ 2 and asserted
// "never PH". That was a polySqrt bug: it rejected every perfect square with a zero constant term,
// and the all-parabolic survivors are exactly the ones with |Ñ|²(0) = 0. Every positive below is
// now verified independently of polySqrt.
//   · and the hybrid does not rescue it: prescribing A from a factor product and a RANDOM spinor
//     gives an unsolvable system (residual 0.3–0.7), because (A, 𝒜) must be COMPATIBLE — which is
//     exactly what Kalkan et al.'s Thm 4.6 characterises.
//
// SO FACTORISATION SOLVES THE GROUP HALF COMPLETELY AND CONTRIBUTES NOTHING TO THE PH HALF. That is
// worth pinning: it closes off a plausible-looking route with measurements rather than opinion.
//
// STILL OPEN, and deliberately not asserted here: whether a compatible spinor EXISTS for a generic
// factor-built A. A small descent (C eliminated by least squares, 5 restarts × 50 iterations) stalls
// at residual 1e-2 rather than reaching zero. That is suggestive of "no", but the budget was small
// and it is not evidence. See findCompatibleSpinor.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  rotationSeed, translationSeed, scalingSeed, conjugate, factorProduct, columnOf,
  gTranslate, gRotate, gScale, G_INVERT, groupDefect, algebraDefect, scalarSquare,
  predictedRho, rhoFloor, mMul, linearFactor,
  type Mat2,
} from '../sp11Factorisation'
import {
  covariantWronskian, qpNorm, polySqrt, nullPart, pMax, pMul, qpMax, qpDegree, solveForC, sandwich, curveAt,
  type QPoly,
} from '../sp11RationalPH'

const rnd = (s: number): number => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x) }
const randG = (s: number): Mat2 => {
  let G = gRotate([rnd(s) - 0.5, rnd(s + 1) - 0.5, rnd(s + 2) - 0.5, rnd(s + 3) - 0.5])
  G = mMul(G, gTranslate([rnd(s + 4) * 2 - 1, rnd(s + 5) * 2 - 1, rnd(s + 6) * 2 - 1]))
  if (rnd(s + 7) > 0.5) G = mMul(G, G_INVERT)
  return mMul(G, gScale(0.5 + rnd(s + 8)))
}
const seedOf = (kind: number, s: number): Mat2 =>
  kind === 0 ? rotationSeed([rnd(s) - 0.5, rnd(s + 1) - 0.5, rnd(s + 2) - 0.5])
    : kind === 1 ? translationSeed([rnd(s + 3) * 2 - 1, rnd(s + 4) * 2 - 1, rnd(s + 5) * 2 - 1])
      : scalingSeed(rnd(s + 6) * 1.5)
const isPH = (Hs: readonly Mat2[]): boolean =>
  polySqrt(qpNorm(covariantWronskian(columnOf(factorProduct(Hs))))) !== null

describe('linear factors in Sp(1,1)', () => {
  it('the three seeds lie in the algebra and square to a real scalar', () => {
    expect(algebraDefect(rotationSeed([0.3, -0.7, 0.5]))).toBe(0)
    expect(algebraDefect(translationSeed([1, 0.4, -0.2]))).toBe(0)
    expect(algebraDefect(scalingSeed(0.6))).toBe(0)
    expect(scalarSquare(rotationSeed([0.3, -0.7, 0.5]))).toBeCloseTo(0.83, 12)   // |h|²
    expect(scalarSquare(translationSeed([1, 0.4, -0.2]))).toBe(0)                // parabolic
    expect(scalarSquare(scalingSeed(0.6))).toBeCloseTo(-0.36, 12)                // −c²
  })

  it('and conjugation preserves both, so the whole orbit is generated exactly', () => {
    for (let s = 1; s < 8; s++) {
      const H = conjugate(randG(s * 5), rotationSeed([0.3, -0.7, 0.5]))
      expect(algebraDefect(H)).toBeLessThan(1e-12)
      expect(scalarSquare(H)).toBeCloseTo(0.83, 8)
    }
  })

  it('a single factor is Sp(1,1)-valued up to the real scalar t² + d', () => {
    const H = conjugate(randG(11), rotationSeed([0.4, 0.2, -0.6]))
    const { defect, rho } = groupDefect(linearFactor(H))
    expect(defect).toBeLessThan(1e-12)
    expect(rho[0]).toBeCloseTo(scalarSquare(H)!, 8)
    expect(rho[2]).toBeCloseTo(1, 12)
  })

  it('THE GROUP HALF IS FREE: products stay in the group, rho = product of (t² + d)', () => {
    for (const k of [2, 3, 4]) {
      const Hs = Array.from({ length: k }, (_, f) =>
        conjugate(randG(k * 31 + f * 7), seedOf(Math.floor(rnd(k * 3 + f) * 3), k * 11 + f)))
      const M = factorProduct(Hs)
      const { defect, rho } = groupDefect(M)
      expect(defect).toBeLessThan(1e-10)
      expect(rho.length - 1).toBe(2 * k)
      const pred = predictedRho(Hs)
      expect(pred).not.toBeNull()
      for (let i = 0; i < pred!.length; i++) expect(rho[i]).toBeCloseTo(pred![i], 6)
    }
  })

  it('and so is the null condition, plus degree control: deg A = k, deg C = k - 1', () => {
    for (const k of [1, 2, 3, 4]) {
      const Hs = Array.from({ length: k }, (_, f) =>
        conjugate(randG(k * 17 + f * 5 + 1), seedOf(Math.floor(rnd(k * 7 + f) * 3), k * 13 + f * 3)))
      const U = columnOf(factorProduct(Hs))
      expect(pMax(nullPart(U)) / (qpMax(U.A) * qpMax(U.C) || 1)).toBeLessThan(1e-12)
      expect(qpDegree(U.A)).toBe(k)
      expect(qpDegree(U.C)).toBe(k - 1)
    }
  })

  it('all d > 0 makes rho root-free, which is the bounded case', () => {
    const Hs = Array.from({ length: 3 }, (_, f) =>
      conjugate(randG(f * 9 + 21), rotationSeed([rnd(f) - 0.5, rnd(f + 4) - 0.5, rnd(f + 8) - 0.5])))
    for (const H of Hs) expect(scalarSquare(H)!).toBeGreaterThan(0)
    expect(rhoFloor(groupDefect(factorProduct(Hs)).rho)).toBeGreaterThan(1e-6)
  })

  // --- and here is what factorisation does NOT give -------------------------
  it('ONE factor is ALWAYS PH — and |N-tilde|^2 is a CONSTANT, which is why', () => {
    // M = tI − H gives M⁻¹M′ = ρ⁻¹(tI + H), so ω₂₁ = H₂₁/ρ has constant direction.
    for (let kind = 0; kind < 3; kind++) {
      for (let s = 0; s < 6; s++) {
        const H = conjugate(randG(s * 13 + kind * 3 + 2), seedOf(kind, s * 5 + kind))
        const q = qpNorm(covariantWronskian(columnOf(factorProduct([H]))))
        expect(polySqrt(q)).not.toBeNull()
        expect(pMax(q.slice(1))).toBeLessThan(1e-10 * pMax(q))   // constant: no t dependence
      }
    }
  })

  it('ANY elliptic or hyperbolic factor kills PH at k >= 2', () => {
    for (const k of [2, 3]) {
      let ph = 0, tot = 0
      for (let trial = 0; trial < 60; trial++) {
        const kinds = Array.from({ length: k }, (_, f) => Math.floor(rnd(trial * 7 + f) * 3))
        if (kinds.every((x) => x === 1)) continue          // all-parabolic is the exception, below
        const Hs = kinds.map((kd, f) => conjugate(randG(trial * 17 + f * 5 + 1), seedOf(kd, trial * 11 + f * 3)))
        tot++
        if (isPH(Hs)) ph++
      }
      expect(tot).toBeGreaterThan(30)
      expect(ph).toBe(0)
    }
  })

  it('the ONLY reliable k >= 2 survivors are all-parabolic — and they are straight LINES', () => {
    for (const k of [2, 3, 4]) {
      for (let trial = 0; trial < 10; trial++) {
        const Hs = Array.from({ length: k }, (_, f) => translationSeed(
          [rnd(trial * 11 + f * 3) * 2 - 1, rnd(trial * 11 + f * 3 + 1) * 2 - 1, rnd(trial * 11 + f * 3 + 2) * 2 - 1]))
        expect(isPH(Hs)).toBe(true)
        const U = columnOf(factorProduct(Hs))
        const pts = [0.7, 1.3, 2.9].map((t) => curveAt(U, t)!)
        const d1 = [pts[1].x - pts[0].x, pts[1].y - pts[0].y, pts[1].z - pts[0].z]
        const d2 = [pts[2].x - pts[0].x, pts[2].y - pts[0].y, pts[2].z - pts[0].z]
        const cross = Math.hypot(
          d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0])
        expect(cross / (Math.hypot(...d1) * Math.hypot(...d2))).toBeLessThan(1e-9)   // collinear
      }
    }
  })

  it('and every positive is verified WITHOUT polySqrt, which once hid exactly these', () => {
    let checked = 0
    for (const k of [2, 3]) {
      for (let trial = 0; trial < 10; trial++) {
        const Hs = Array.from({ length: k }, (_, f) => translationSeed(
          [rnd(trial * 11 + f * 3) * 2 - 1, rnd(trial * 11 + f * 3 + 1) * 2 - 1, rnd(trial * 11 + f * 3 + 2) * 2 - 1]))
        const q = qpNorm(covariantWronskian(columnOf(factorProduct(Hs))))
        expect(Math.abs(q[0] ?? 0)).toBeLessThan(1e-12 * pMax(q))   // vanishes at 0: the blind spot
        const root = polySqrt(q)
        expect(root).not.toBeNull()
        const sq = pMul(root!, root!)
        let gap = 0
        for (let i = 0; i < Math.max(sq.length, q.length); i++) gap = Math.max(gap, Math.abs((sq[i] ?? 0) - (q[i] ?? 0)))
        expect(gap / (pMax(q) || 1)).toBeLessThan(1e-9)
        checked++
      }
    }
    expect(checked).toBe(20)
  })

  it('THE HYBRID FAILS TOO: a factor-built A with a RANDOM spinor is not solvable', () => {
    // (A, 𝒜) must be compatible — Kalkan et al., Thm 4.6. Prescribing A does not free the spinor.
    for (let trial = 0; trial < 6; trial++) {
      const k = 3, m = 3
      const Hs = Array.from({ length: k }, (_, f) =>
        conjugate(randG(trial * 17 + f * 5 + 1), seedOf(Math.floor(rnd(trial * 7 + f) * 3), trial * 11 + f * 3)))
      const A = columnOf(factorProduct(Hs)).A
      const spinor: QPoly = [0, 1, 2, 3].map((c) =>
        Array.from({ length: m + 1 }, (_, kk) => rnd(trial * 31 + c * 7 + kk * 3) * 2 - 1)) as QPoly
      expect(solveForC(A, sandwich(spinor), 2 * m + 1 - k).residual).toBeGreaterThan(1e-3)
    }
  })
})
