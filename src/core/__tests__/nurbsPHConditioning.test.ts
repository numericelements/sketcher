// ============================================================================
// PH IMPOSED DIRECTLY ON A RATIONAL BÉZIER — what it reaches, and what it costs.
//
// THE FORMULATION, with no conformal lift anywhere: unknowns are the control points P_k, the
// weights w_k and the speed numerator ρ, and the whole condition is
//
//     ‖q′w − qw′‖² = ρ²        q = w·P,        4d−1 Bernstein equations
//
// WHAT IT BUYS. Hard poles are GENERIC here. The conformal model cannot represent one at the
// curve's own degree — ⟨C,C⟩ ≡ 0 forces every pole isotropic (conformalPolesAreSoft) — but in
// (P, w, ρ) nothing forces it, and the λ-chart quartic with σ(1.7) = 8.2 sits in this variety at
// its own degree 4 with isotropy 1.0 at the pole. Also: positive weights ⟹ W(t) > 0 on [0,1], so
// "no pole on the curve" is a box constraint rather than a sampled guard.
//
// WHAT IT COSTS, and this is the part a solver author needs before starting. The constraint
// Jacobian has NO RANK. Row-normalised, its spectrum decays smoothly over eight orders with no gap
// anywhere, so there is no principled truncation level for a Gauss–Newton step:
//
//     1e+0 6e-1 4e-1 2e-1 2e-1 8e-2 4e-2 2e-2 5e-4 7e-5 3e-7 2e-8 | 3e-17 1e-17 8e-18
//
// Against the conformal defining Jacobian, which has 23 clean values and then machine zero — a
// twelve-order gap (conformalPHStructure, conformalFamilyDimensions). The reason is structural:
// ⟨P′,P′⟩ = h² is QUADRATIC in the conformal unknowns, ‖q′w − qw′‖² = ρ² is QUARTIC in (P, w).
// That is what the fifth coordinate buys.
//
// THREE THINGS THIS FILE HAD TO RULE OUT FIRST, because each one looked like the explanation:
//   · seed placement — refuted, this member is the λ-chart quartic, not a random solve;
//   · scaling — refuted, the projective rescale (q,w,ρ) ↦ (λq, λw, λ²ρ) is free and changes nothing;
//   · a finite-difference Jacobian — refuted here, by computing the Jacobian ANALYTICALLY and
//     checking it against finite differences. Only the last one or two singular values were noise.
//
// And the exact count of structural redundancies is 3, not the 2 that the degree bookkeeping
// predicts (‖N‖² and ρ² are both elevations of degree-(4d−4) polynomials).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinToPower, rootsOf, type Poly } from '../conformalPHHopf'
import { hardQuarticMember } from '../hardQuarticWitness'
import {
  type Rat, analyticJacobian, hodographN, numericJacobian, packRat, phResidual,
  projectiveNormalise, rowNormalise, singularValues, unpackRat,
} from '../nurbsPH'
import { type Complex, cadd, cmul, cnorm } from '../complex'

const DEG = 4

// --- the λ-chart quartic, a curve we KNOW is good, expressed in (P, w, ρ) --------------------
const POLE = 1.7
const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
const toBern = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) acc += (binom(k, j) / binom(n, j)) * a[j]
    return acc
  })
function hardQuarticAsRat(): { rat: Rat; sigmaAtPole: number } {
  const m = hardQuarticMember()
  const wB = toBern([...m.w], DEG)
  const qB = [0, 1, 2].map((i) => toBern([...m.p[i]], DEG))
  return {
    rat: {
      P: Array.from({ length: DEG + 1 }, (_, k) => [qB[0][k] / wB[k], qB[1][k] / wB[k], qB[2][k] / wB[k]]),
      w: wB,
      rho: toBern([...m.sigma], 2 * DEG - 1),
    },
    sigmaAtPole: [...m.sigma].reduceRight((s, c) => s * POLE + c, 0),
  }
}

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}

describe('PH imposed directly on a rational Bézier', () => {
  const { rat, sigmaAtPole } = hardQuarticAsRat()

  it('a curve we KNOW is good satisfies it, and its pole is HARD — the cell the lift cannot reach', () => {
    const scale = Math.max(...hodographN(rat).flat().map(Math.abs)) ** 2
    const res = Math.max(...phResidual(rat).map(Math.abs)) / scale
    const wp = bernsteinToPower(rat.w)
    const trimmed = [...wp]
    const sc = Math.max(...wp.map(Math.abs))
    while (trimmed.length > 1 && Math.abs(trimmed[trimmed.length - 1]) < 1e-10 * sc) trimmed.pop()
    const N = hodographN(rat).map((Ni) => bernsteinToPower(Ni))
    const root = rootsOf(trimmed.map((v) => ({ re: v, im: 0 })))[0]
    const Nv = N.map((Ni) => cpeval(Ni, root))
    const iso = cnorm(Nv.reduce((a, z) => cadd(a, cmul(z, z)), C0)) / Math.hypot(...Nv.map(cnorm)) ** 2

    console.log(`    PH residual ${res.toExponential(1)} relative;  σ(1.7) = ${sigmaAtPole.toFixed(2)};` +
      `  denominator degree ${trimmed.length - 1}, root ${root.re.toFixed(4)};  isotropy ${iso.toFixed(4)}`)
    expect(res, 'the λ-chart quartic IS a point of this variety, at its own degree 4').toBeLessThan(1e-12)
    expect(Math.abs(sigmaAtPole), 'and it is genuinely hard').toBeGreaterThan(1)
    expect(iso, 'isotropy 1.0 — as far from soft as a pole gets').toBeGreaterThan(0.99)
    expect(new Set(rat.w.map((v) => Math.sign(v))).size, 'weights share a sign, so W > 0 on [0,1]').toBe(1)
  })

  it('the analytic Jacobian agrees with finite differences, so the spectrum is not FD noise', () => {
    const Ja = analyticJacobian(rat)
    const Jf = numericJacobian((v) => phResidual(unpackRat(v, DEG)), packRat(rat))
    let gap = 0, scale = 0
    for (let i = 0; i < Ja.length; i++) for (let j = 0; j < Ja[0].length; j++) {
      gap = Math.max(gap, Math.abs(Ja[i][j] - Jf[i][j])); scale = Math.max(scale, Math.abs(Ja[i][j]))
    }
    console.log(`    analytic vs finite-difference: ${(gap / scale).toExponential(1)} relative`)
    expect(gap / scale, 'the analytic derivative is right').toBeLessThan(1e-8)
  })

  it('and the spectrum has NO GAP — eight orders of smooth decay, then exactly three zeros', () => {
    for (const [tag, r] of [['as given  ', rat], ['projective', projectiveNormalise(rat)]] as [string, Rat][]) {
      const sv = singularValues(rowNormalise(analyticJacobian(r)))
      console.log(`    ${tag}  ${sv.map((v) => (v / sv[0]).toExponential(0)).join(' ')}`)

      const rel = sv.map((v) => v / sv[0])
      const zeros = rel.filter((v) => v < 1e-14).length
      expect(zeros, 'three structural redundancies among the 4d−1 = 15 equations').toBe(3)

      // no gap: every consecutive ratio among the NONZERO values stays under three orders
      const live = rel.filter((v) => v >= 1e-14)
      let worst = 1
      for (let i = 1; i < live.length; i++) worst = Math.max(worst, live[i - 1] / live[i])
      console.log(`      largest consecutive ratio among the ${live.length} nonzero values: ${worst.toExponential(1)}`)
      expect(worst, 'no twelve-order cliff anywhere — unlike the conformal Jacobian').toBeLessThan(1e3)
    }
  })
})
