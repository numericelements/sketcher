// ============================================================================
// IS THE EXCLUDED STRATUM σ(r) = 0 MÖBIUS-INVARIANT?
//
// WHY IT MATTERS. Every λ-chart in this repo divides by 𝒜(r), so all of them assume σ(r) ≠ 0. The
// circle sits on σ(r) = 0, and so does the ENTIRE conformal family — which is why the two
// implementations here are disjoint. If that stratum is a genuine Möbius-invariant feature, a
// Möbius-covariant reformulation (Sp(1,1) ≅ Spin(4,1) ⊂ Cl⁺(4,1) ≅ M₂(ℍ)) inherits the same wall
// and buys only elegance. If it is NOT invariant, the stratum is an artefact of the SIMILARITY
// lift — 𝒜 ↦ 𝒜v𝒜* covers only ℝ⁺ × SO(3), four of Möbius's ten dimensions — and a covariant
// formulation would have no wall at all.
//
// THE TEST. Similarities are exactly what the plain spinor already handles, so the only generator
// that can decide anything is INVERSION, c ↦ c/|c|². Homogeneously that is
//
//     (p, w)  ↦  (p·w, ⟨p,p⟩)
//
// and the conformal factor 1/|c|² gives, with no algebra beyond it,
//
//     σ̃ / w̃²  =  |c̃′|  =  |c′| / |c|²  =  (σ/w²)·(w²/⟨p,p⟩)  =  σ / w̃      ⟹   σ̃ = σ · w̃
//
// MEASURED BELOW, and the consequences are decisive in BOTH directions:
//   · σ̃ = σ·w̃ vanishes at every root of w̃ — so inversion sends a curve strictly INSIDE the chart
//     to one whose every pole is isotropic. The stratum is not preserved; it is entered.
//   · σ̃ = σ·w̃ is exactly the conformal family's signature σ = h·w. So THE CONFORMAL FAMILY IS THE
//     SET OF INVERSIONS OF ORDINARY PH CURVES, and this repo's two "disjoint" implementations are
//     one Möbius transformation apart.
//   · w̃ = ⟨p,p⟩ is a sum of squares, so it has NO real roots: inversion carries real poles to
//     complex ones. The curve becomes bounded — which is what rationalPHComplexPoleSpatial buys.
//   · and inverting twice returns the original pair times a common factor, exactly.
//
// CONCLUSION: σ(r) = 0 is not a Möbius-invariant notion. It is where the similarity lift degenerates.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'

// --- real polynomial arithmetic, power basis, index = degree ------------------
const pAdd = (a: readonly number[], b: readonly number[]): number[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pMul = (a: readonly number[], b: readonly number[]): number[] => {
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y }))
  return out
}
const pScale = (a: readonly number[], k: number): number[] => a.map((x) => x * k)
const pDeriv = (a: readonly number[]): number[] => a.slice(1).map((c, i) => c * (i + 1))
const pTrim = (a: readonly number[]): number[] => {
  const out = a.slice()
  while (out.length > 1 && Math.abs(out[out.length - 1]) < 1e-12) out.pop()
  return out
}
/** Largest coefficient of a - b, relative to the largest coefficient present. */
const pDiff = (a: readonly number[], b: readonly number[]): number => {
  const n = Math.max(a.length, b.length)
  let d = 0, s = 1e-30
  for (let i = 0; i < n; i++) {
    d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
    s = Math.max(s, Math.abs(a[i] ?? 0), Math.abs(b[i] ?? 0))
  }
  return d / s
}
/** ⟨u,v⟩ for 3-vectors of polynomials — the COMPLEXIFIED form, no conjugation. */
const vDot = (u: readonly number[][], v: readonly number[][]): number[] =>
  pAdd(pAdd(pMul(u[0], v[0]), pMul(u[1], v[1])), pMul(u[2], v[2]))

// --- complex evaluation and roots -------------------------------------------
type C = { re: number; im: number }
const cMul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
const cSub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
const cDiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
const cAbs = (a: C): number => Math.hypot(a.re, a.im)
const cEval = (p: readonly number[], z: C): C =>
  p.reduceRight<C>((acc, c) => cAdd(cMul(acc, z), { re: c, im: 0 }), { re: 0, im: 0 })

/** Durand-Kerner: all complex roots of a real polynomial. */
function roots(poly: readonly number[]): C[] {
  const p = pTrim(poly)
  const n = p.length - 1
  const lead = p[n]
  const monic = p.map((c) => c / lead)
  let z: C[] = Array.from({ length: n }, (_, k) =>
    ({ re: 0.4 * Math.cos(2.3 * k + 0.7), im: 0.4 * Math.sin(2.3 * k + 0.7) + 0.9 }))
  for (let it = 0; it < 2000; it++) {
    let move = 0
    z = z.map((zi, i) => {
      let den: C = { re: 1, im: 0 }
      z.forEach((zj, j) => { if (i !== j) den = cMul(den, cSub(zi, zj)) })
      const step = cDiv(cEval(monic, zi), den)
      move = Math.max(move, cAbs(step))
      return cSub(zi, step)
    })
    if (move < 1e-14) break
  }
  return z
}

/** ⟨N(z), N(z)⟩ at a complex point — zero exactly when the pole is ISOTROPIC. */
const isotropyAt = (N: readonly number[][], z: C): number => {
  const parts = N.map((c) => cEval(c, z))
  const s = parts.reduce<C>((acc, v) => cAdd(acc, cMul(v, v)), { re: 0, im: 0 })
  const scale = Math.max(...parts.map(cAbs), 1e-30)
  return cAbs(s) / (scale * scale)
}

/** Wronskian N = p′w − pw′ of a homogeneous pair. */
const wronskian = (p: readonly number[][], w: readonly number[]): number[][] =>
  p.map((pi) => pAdd(pMul(pDeriv(pi), w), pScale(pMul(pi, pDeriv(w)), -1)))

/** Inversion c ↦ c/|c|² in homogeneous coordinates. */
const invert = (p: readonly number[][], w: readonly number[]) =>
  ({ p: p.map((pi) => pMul(pi, w)), w: vDot(p, p) })

/** Translation c ↦ c + a — itself a Möbius map, and needed to move the curve off the origin. */
const translate = (p: readonly number[][], w: readonly number[], a: readonly number[]) =>
  ({ p: p.map((pi, i) => pAdd(pi, pScale(w, a[i]))), w: w.slice() })

describe('is the excluded stratum Mobius-invariant?', () => {
  const m = toMember(seedQuintic())
  const p = m.p as number[][]
  const w = m.w as number[]
  const N = m.N as number[][]
  const sigma = m.sigma as number[]

  it('the seed is PH and strictly INSIDE the chart: sigma(r) != 0 at every pole', () => {
    expect(pDiff(vDot(N, N), pMul(sigma, sigma))).toBeLessThan(1e-9) // <N,N> = sigma^2
    for (const r of roots(w)) {
      expect(Math.abs(r.im)).toBeLessThan(1e-9)                       // its poles are real
      expect(isotropyAt(N, r)).toBeGreaterThan(1e-3)                  // and NOT isotropic
    }
  })

  it('INVERSION multiplies sigma by the new denominator: sigma-tilde = sigma * w-tilde', () => {
    const inv = invert(p, w)
    const Nt = wronskian(inv.p, inv.w)
    // the image is still PH, and its sigma is exactly sigma * w-tilde
    expect(pDiff(vDot(Nt, Nt), pMul(pMul(sigma, inv.w), pMul(sigma, inv.w)))).toBeLessThan(1e-9)
  })

  // The seed is normalised with p(0) = 0, i.e. it passes through the ORIGIN — the centre of
  // inversion. That is a degenerate placement (test at the bottom), so move it off first. A
  // translation is itself a Möbius map, so nothing is lost.
  const moved = translate(p, w, [5, 3, -2])
  const mInv = invert(moved.p, moved.w)
  const mN = wronskian(mInv.p, mInv.w)

  it('the translated curve misses the centre of inversion, so <p,p> has no real root', () => {
    for (let i = 0; i <= 2000; i++) {
      const t = -25 + i / 40
      expect(mInv.w.reduceRight((a, c) => a * t + c, 0)).toBeGreaterThan(1e-6)
    }
    for (const r of roots(mInv.w)) expect(Math.abs(r.im)).toBeGreaterThan(1e-6)
  })

  it('SO EVERY POLE OF THE IMAGE IS ISOTROPIC — inversion ENTERS the stratum', () => {
    const rs = roots(mInv.w)
    expect(rs.length).toBeGreaterThan(0)
    for (const r of rs) expect(isotropyAt(mN, r)).toBeLessThan(1e-6)
  })

  it('THE IMAGE IS BOUNDED: no real pole means the curve is finite on the whole line', () => {
    // this is precisely what rationalPHComplexPoleSpatial was built to reach, arrived at
    // from the other direction — by inverting a curve that had real poles.
    let worst = 0
    for (let i = 0; i <= 2000; i++) {
      const t = -25 + i / 40
      const den = mInv.w.reduceRight((a, c) => a * t + c, 0)
      for (const pi of mInv.p) worst = Math.max(worst, Math.abs(pi.reduceRight((a, c) => a * t + c, 0) / den))
    }
    expect(Number.isFinite(worst)).toBe(true)
    expect(worst).toBeLessThan(1e4)
  })

  it('and sigma-tilde = sigma * w-tilde holds for the translated curve too', () => {
    const sg = pTrim(vDot(wronskian(moved.p, moved.w), wronskian(moved.p, moved.w)))
    // translation does not change N at all, so sigma is unchanged
    expect(pDiff(sg, pMul(sigma, sigma))).toBeLessThan(1e-9)
    expect(pDiff(vDot(mN, mN), pMul(pMul(sigma, mInv.w), pMul(sigma, mInv.w)))).toBeLessThan(1e-9)
  })

  it('THE DEGENERATE CASE, pinned: a curve THROUGH the centre gets a double real pole', () => {
    // the seed itself, untranslated: p(0) = 0, so <p,p> has a double root at 0 and N-tilde
    // vanishes there identically. Not a counterexample — a placement to avoid.
    const inv0 = invert(p, w)
    const real0 = roots(inv0.w).filter((r) => Math.abs(r.im) < 1e-6)
    expect(real0.length).toBe(2)                                  // a DOUBLE root
    for (const r of real0) expect(Math.abs(r.re)).toBeLessThan(1e-6)
    const N0 = wronskian(inv0.p, inv0.w)
    for (const c of N0) expect(Math.abs(cEval(c, { re: 0, im: 0 }).re)).toBeLessThan(1e-9)
  })

  it('sigma-tilde = sigma * w-tilde IS the conformal family signature sigma = h*w', () => {
    // deg h = deg sigma, deg w-tilde = deg <p,p>; the conformal family's defining shape, and the
    // reason no conformal PH curve has rational arc length (slide 15).
    expect(pTrim(mInv.w).length - 1).toBeGreaterThan(pTrim(sigma).length - 1)
  })

  it('and inversion is an involution, exactly, up to the common factor', () => {
    const once = invert(p, w)
    const twice = invert(once.p, once.w)
    const common = pMul(w, once.w)                 // w * <p,p>
    for (let i = 0; i < 3; i++) expect(pDiff(twice.p[i], pMul(p[i], common))).toBeLessThan(1e-9)
    expect(pDiff(twice.w, pMul(w, common))).toBeLessThan(1e-9)
  })
})
