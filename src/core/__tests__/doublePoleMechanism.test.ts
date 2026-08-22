// ============================================================================
// WHAT A DOUBLE POLE DOES TO THE EQUATIONS — and what it is NOT.
//
// AN EARLIER VERSION OF THIS FILE HAD THE WRONG MECHANISM. It argued: ρ(r) = 0 at a double pole,
// so the PH relation reads 0 = 0 there, so it constrains nothing, so rank is lost. The middle step
// does not follow, and a SOFT SIMPLE POLE refutes it — softness IS ⟨N(r),N(r)⟩ = 0, hence
// ρ(r) = 0, and a soft simple pole costs no rank at all once the lift is minimal:
//
//     soft simple pole     ρ(r) = 0     N(r) ≠ 0 (isotropic)     δ contribution 0
//     DOUBLE pole          ρ(r) = 0     N(r) = 0                 δ contribution 1
//
// Measured on the mixed cubic: at its soft poles |ρ| = 3.9e-11 while |N| = 9.7e-1. **ρ(r) = 0 is
// not the discriminator. N(r) = 0 is** — the vector vanishing, not its square. Same bilinear-versus-
// Hermitian family of error as the four before it: a squared quantity standing in for a vector one.
//
// THE MECHANISM THAT WORKS, one line longer, and it names the dependent row:
//
//   1.  double pole:  w(r) = 0 AND w′(r) = 0
//   2.  N = q′w − qw′, so N(r) = 0 for EVERY q — forced, not incidental
//   3.  in the lift C = (2w², 2wq, ‖q‖²), both C(r) AND C′(r) are pure ∞      ← the separating step
//   4.  ∞ is null, so ⟨C′(r),C′(r)⟩ = 0 is FORCED BY NULL rather than imposed
//   5.  PH says ⟨C′,C′⟩ = h², so h(r) = 0 is forced
//   6.  that PH coefficient relation is therefore implied by NULL — a dependent row
//
// Step 3 is what a soft simple pole cannot do: there w′(r) ≠ 0, so C′(r) keeps its q-component and
// is not pure ∞. Measured at the same parameter of two cubics differing only in a repeated root:
//
//     (t−1.5)(t−3)(t−4.5)   C(r) pure ∞ (1e-15)   C′(r) NOT (5.6e-1)   ⟨C′,C′⟩ = 3.5e-1
//     (t−1.5)²(t−3)         C(r) pure ∞ (8e-16)   C′(r) PURE ∞ (4e-16) ⟨C′,C′⟩ = 2.3e-14
//
// And unlike "the relation constrains nothing", this version hands over the deflation: h(r) = 0, a
// LINEAR equation, with r already known as a root of w.
//
// TWO THINGS THE EARLIER VERSION ALSO OVERSTATED:
//
//   · "the speed reads 0/0". The limit exists. ρ vanishes to order 1 and w² to order 4, so ‖x′‖ has
//     a pole of order THREE rather than four — measured below. What is undefined at a multiple pole
//     is SOFTNESS, not the speed.
//   · "damping cannot rescue it". Levenberg does regularise a zero singular value, to λ. What it
//     cannot restore is QUADRATIC convergence, so the expected behaviour is "converges linearly, to
//     reduced accuracy", not "fails".
//
// WHICH CHANGES WHAT TO MEASURE, and the measurement is not yet run. Iteration counts depend on step
// size, tolerance and damping schedule — which is why an earlier drag comparison stalled on both
// specimens and was retracted. The decisive quantity is the CONVERGENCE RATE: 1e-3 → 1e-6 → 1e-12
// is quadratic and means δ = 0; 1e-3 → 3e-4 → 1e-4 is linear and means δ ≥ 1. That is immune to
// tolerances and needs a handful of iterations rather than nine hundred. It needs a control that is
// verified δ = 0 first — properly hard simple poles at isotropy O(1), not the 1e-4 one that spoiled
// the last attempt.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { rootsOf } from '../conformalPHHopf'
import { normSquared } from '../conformalLift'

const pmul = (a: readonly number[], b: readonly number[]): number[] => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const padd = (...ps: readonly (readonly number[])[]): number[] =>
  Array.from({ length: Math.max(...ps.map((q) => q.length)) }, (_, i) => ps.reduce((s, q) => s + (q[i] ?? 0), 0))
const psub = (a: readonly number[], b: readonly number[]): number[] => padd(a, b.map((v) => -v))
const pderiv = (a: readonly number[]): number[] => a.slice(1).map((v, i) => v * (i + 1))
const at = (p: readonly number[], t: number): number => p.reduceRight((s, c) => s * t + c, 0)

describe('a double pole kills the hodograph numerator, whatever the curve is', () => {
  it('N(r) = 0 at a repeated root, for ANY q — the step that needs no solving', () => {
    // (t−1.5)²(t−3) — the point is that q is arbitrary here, so this is an identity and not a
    // property of some particular curve.
    const w = [-6.75, 11.25, -6, 1]
    const dw = pderiv(w)
    expect(Math.abs(at(w, 1.5)), 'w vanishes at the double root').toBeLessThan(1e-12)
    expect(Math.abs(at(dw, 1.5)), 'and so does w′ — that is what "double" means').toBeLessThan(1e-12)

    let seed = 20250822 >>> 0
    const rnd = (): number => {
      seed = (seed + 0x6d2b79f5) >>> 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    let worst = 0
    for (let trial = 0; trial < 200; trial++) {
      const q = [0, 1, 2].map(() => Array.from({ length: 4 }, () => 2 * rnd() - 1))
      const N = q.map((qi) => psub(pmul(pderiv(qi), w), pmul(qi, dw)))
      const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
      worst = Math.max(worst, Math.hypot(...N.map((c) => at(c, 1.5))) / scale)
    }
    console.log(`    200 arbitrary numerators: worst |N(1.5)| / scale = ${worst.toExponential(1)}`)
    expect(worst, 'N vanishes at the double root for every q').toBeLessThan(1e-12)
  })

  it('C′(r) is PURE ∞ at a double pole and not at a simple one — the separating step', () => {
    const q = [[0.4, -1.1, 0.7, 0.3], [-0.9, 0.2, 1.3, -0.5], [0.6, 0.8, -0.4, 1.1]]
    const r = 1.5
    const ev = (p: readonly number[]): number => p.reduceRight((s, c) => s * r + c, 0)
    const read = (wPow: number[]) => {
      const W = pmul(wPow, wPow).map((v) => 2 * v)
      const Q = q.map((c) => pmul(wPow, c).map((v) => 2 * v))
      const INF = normSquared(q)
      const dW = pderiv(W)
      const dQ = Q.map(pderiv)
      const dINF = pderiv(INF)
      const scaleD = Math.max(Math.abs(ev(dW)), ...dQ.map((c) => Math.abs(ev(c))), Math.abs(ev(dINF)), 1e-300)
      return {
        // the non-∞ part of C′(r): its W and q components
        dFinite: Math.max(Math.abs(ev(dW)), ...dQ.map((c) => Math.abs(ev(c)))) / scaleD,
        inner: Math.abs(normSquared(dQ).reduceRight((s, c) => s * r + c, 0) - 2 * ev(dW) * ev(dINF))
          / (scaleD * scaleD),
      }
    }
    const simple = read([-20.25, 24.75, -9, 1])          // (t−1.5)(t−3)(t−4.5)
    const dbl = read([-6.75, 11.25, -6, 1])              // (t−1.5)²(t−3)
    console.log(`    simple root: C′(r) non-∞ part ${simple.dFinite.toExponential(1)},` +
      ` ⟨C′,C′⟩ ${simple.inner.toExponential(1)}  — nothing forced`)
    console.log(`    DOUBLE root: C′(r) non-∞ part ${dbl.dFinite.toExponential(1)},` +
      ` ⟨C′,C′⟩ ${dbl.inner.toExponential(1)}  — pure ∞, so ⟨C′,C′⟩ = 0 by NULL and h(r) = 0 is forced`)
    expect(simple.dFinite, 'at a simple root C′ keeps its q-component').toBeGreaterThan(0.1)
    expect(simple.inner, 'so ⟨C′,C′⟩ is unconstrained there').toBeGreaterThan(0.1)
    expect(dbl.dFinite, 'at a DOUBLE root C′ is pure ∞').toBeLessThan(1e-12)
    expect(dbl.inner, 'and ∞ is null, so this vanishes without being imposed').toBeLessThan(1e-12)
  })

  it('the speed has a pole of order THREE there, not an indeterminate 0/0', () => {
    const w = [-6.75, 11.25, -6, 1]
    const q = [[0.4, -1.1, 0.7, 0.3], [-0.9, 0.2, 1.3, -0.5], [0.6, 0.8, -0.4, 1.1]]
    const N = q.map((qi) => psub(pmul(pderiv(qi), w), pmul(qi, pderiv(w))))
    const ratios: number[] = []
    for (const eps of [1e-2, 1e-3, 1e-4]) {
      const t = 1.5 + eps
      const speed = Math.hypot(...N.map((c) => at(c, t))) / at(w, t) ** 2
      ratios.push(speed * eps ** 3)
    }
    console.log(`    ‖x′‖·ε³ at ε = 1e-2, 1e-3, 1e-4: ${ratios.map((v) => v.toFixed(3)).join(', ')}` +
      '  — settling, so the pole is order 3')
    expect(Math.abs(ratios[2] - ratios[1]) / ratios[2], 'a third-order pole, converging').toBeLessThan(0.02)
    expect(ratios[2], 'and to a finite nonzero limit').toBeGreaterThan(1)
  })

  it('a SIMPLE pole does none of this — nothing is forced to vanish', () => {
    const w = [-20.25, 24.75, -9, 1]          // (t−1.5)(t−3)(t−4.5), three simple roots
    const roots = rootsOf(w.map((v) => ({ re: v, im: 0 })))
    expect(roots.length).toBe(3)
    const dw = pderiv(w)
    const smallest = Math.min(...roots.map((z) => Math.abs(at(dw, z.re))))
    console.log(`    three simple roots ${roots.map((z) => z.re.toFixed(1)).join(', ')};` +
      `  smallest |w′| there is ${smallest.toFixed(2)} — nowhere near zero`)
    expect(smallest, 'w′ is nonzero at every simple root, so N is unconstrained').toBeGreaterThan(1)
  })
})
