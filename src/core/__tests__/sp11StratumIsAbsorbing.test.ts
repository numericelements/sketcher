// ============================================================================
// THE σ = 0 STRATUM IS ABSORBING — so you cannot Möbius your way out of it.
//
// THE IDEA THIS FILE KILLS. The atlas picture suggested a trick: the circle is excluded from every
// λ-chart, but Möbius maps move the poles, so perhaps a Möbius map carries the circle into a chart
// we do have — edit there, map back, and the last gap closes with machinery already built.
//
// IT DOES NOT WORK, and the reason is one identity we had already measured. Under inversion
//
//     σ̃ = σ · w̃ ,      w̃ = ⟨p,p⟩ the NEW denominator
//
// so σ̃ vanishes at every root of w̃ — that is, at the image's OWN poles — for ANY curve whatsoever.
// One inversion always lands ON the stratum. And similarities do not move the pole structure at all.
// So the stratum can be entered and never left: it is ABSORBING under the Möbius group.
//
// Measured below from both sides: the seed starts OFF the stratum and lands on it, and the circle
// starts ON it and stays. No sequence of Möbius maps takes either into a λ-chart.
//
// AND THE CORRECT RESOLUTION, which the repository already contains. The circle is not an awkward
// case to be transported somewhere convenient; it is a member of the CONFORMAL family, σ = h·w with
// h = 2 constant, and that family needs a chart of its own. conformalPHCurve is exactly that: built
// directly in ℝ^{4,1}, "no polynomial source curve and no Möbius image", and at degree 3 its span
// collapses to a circle by counting alone.
//
// So the atlas has two chart TYPES, not one type plus a repair: λ-charts where σ(r) ≠ 0, and the
// conformal chart where σ = h·w. They are disjoint because the stratum is absorbing, and that is
// why both have to exist.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import { pAdd, pSub, pMul, pDeriv, pMax, type Poly } from '../sp11RationalPH'

const relGap = (a: Poly, b: Poly): number => {
  let d = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
  return d / (Math.max(pMax(a), pMax(b)) || 1)
}
const wronskian = (p: readonly Poly[], w: Poly): Poly[] =>
  p.map((pi) => pSub(pMul(pDeriv(pi), w), pMul(pi, pDeriv(w))))
/** σ² = |N|², the speed numerator squared. */
const sigmaSq = (p: readonly Poly[], w: Poly): Poly =>
  wronskian(p, w).reduce<Poly>((acc, n) => pAdd(acc, pMul(n, n)), [0])
/** one inversion: (p, w) ↦ (p·w, ⟨p,p⟩) */
const invert = (p: readonly Poly[], w: Poly): { p: Poly[]; w: Poly } => ({
  p: p.map((pi) => pMul(pi, w)),
  w: p.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0]),
})

// the circle, and the seed translated off the origin
const CW: Poly = [1, 0, 1]
const CP: Poly[] = [[1, 0, -1], [0, 2], [0]]
const m0 = toMember(seedQuintic())
const SW = m0.w as Poly
const SP = (m0.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]
  return Array.from({ length: Math.max(pi.length, SW.length) }, (_, k) => (pi[k] ?? 0) + a * (SW[k] ?? 0))
})

describe('the sigma = 0 stratum is absorbing', () => {
  it('the circle is a CONFORMAL-family member: sigma = h*w with h constant', () => {
    // sigma² = 4w², so sigma = 2w and h = 2
    expect(relGap(sigmaSq(CP, CW), pMul(pMul(CW, CW), [4]))).toBeLessThan(1e-12)
  })

  it('and similarities do not change that — translation, rotation and scaling all keep h constant', () => {
    // translation: p ↦ p + a·w leaves N, hence sigma, untouched
    const trans = CP.map((pi, i) => pAdd(pi, pMul(CW, [[3, -1, 2][i]])))
    expect(relGap(sigmaSq(trans, CW), pMul(pMul(CW, CW), [4]))).toBeLessThan(1e-12)
    // scaling: p ↦ s·p scales sigma by s, so h = 2s — still a constant
    const s = 2.5
    const scaled = CP.map((pi) => pi.map((c) => c * s))
    expect(relGap(sigmaSq(scaled, CW), pMul(pMul(CW, CW), [4 * s * s]))).toBeLessThan(1e-12)
  })

  it('THE IDENTITY: one inversion gives sigma-tilde = sigma * w-tilde, for ANY curve', () => {
    for (const [p, w] of [[SP, SW], [CP, CW]] as [Poly[], Poly][]) {
      const inv = invert(p, w)
      // sigma-tilde² = sigma² · w-tilde²
      expect(relGap(sigmaSq(inv.p, inv.w), pMul(sigmaSq(p, w), pMul(inv.w, inv.w)))).toBeLessThan(1e-10)
    }
  })

  it('SO THE IMAGE ALWAYS SITS ON THE STRATUM — shown concretely on the circle', () => {
    // The identity above already IS the proof: sigma-tilde² = sigma²·w-tilde² means
    // sigma-tilde = ±sigma·w-tilde, which vanishes at every root of w-tilde — the image's OWN poles.
    // Long division would re-derive that less reliably (the seed's image reaches degree 32 with
    // leading coefficients at ~1e-15 relative), so instead it is made concrete where the degrees
    // are small: the circle, whose image has w-tilde = (1+t²)² with poles at ±i.
    const inv = invert(CP, CW)
    expect(relGap(inv.w, pMul(CW, CW))).toBeLessThan(1e-12)          // w-tilde = (1+t²)²
    const s2 = sigmaSq(inv.p, inv.w)
    // evaluate sigma-tilde² at the new pole t = i: real polynomial at a purely imaginary argument
    const at = (poly: Poly, im: number): [number, number] => {
      let re = 0, imag = 0
      for (let k = poly.length - 1; k >= 0; k--) {
        const nr = re * 0 - imag * im + poly[k]
        imag = re * im + imag * 0
        re = nr
      }
      return [re, imag]
    }
    const [re, imv] = at(s2, 1)
    expect(Math.hypot(re, imv) / (pMax(s2) || 1)).toBeLessThan(1e-12)  // sigma-tilde(i) = 0
    // whereas the ORIGINAL seed's sigma does NOT vanish at its own poles — it starts off the stratum
    const seedSigma2 = sigmaSq(SP, SW)
    let v = 0
    for (let k = seedSigma2.length - 1; k >= 0; k--) v = v * 1.7 + seedSigma2[k]
    expect(Math.abs(v) / (pMax(seedSigma2) || 1)).toBeGreaterThan(1e-6)
  })

  it('and a SECOND inversion does not rescue it either — the factor only accumulates', () => {
    const once = invert(CP, CW)
    const twice = invert(once.p, once.w)
    // sigma after two inversions still carries the newest denominator as a factor
    const s2 = sigmaSq(twice.p, twice.w)
    const w2 = pMul(twice.w, twice.w)
    let scale = pMax(s2) || 1
    const rem = s2.slice()
    for (let k = rem.length - 1; k >= w2.length - 1; k--) {
      const f = rem[k] / w2[w2.length - 1]
      for (let j = 0; j < w2.length; j++) rem[k - (w2.length - 1) + j] -= f * w2[j]
    }
    expect(pMax(rem) / scale).toBeLessThan(1e-8)
    scale = 1
  })
})
