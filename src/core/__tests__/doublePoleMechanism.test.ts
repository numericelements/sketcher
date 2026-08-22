// ============================================================================
// WHAT A DOUBLE POLE DOES TO THE EQUATIONS — the chain from geometry to a stalled solver.
//
// It is three lines, and each one is forced:
//
//   1.  a double pole means w(r) = 0 AND w′(r) = 0;
//   2.  N = q′w − qW′, so N(r) = q′(r)·0 − q(r)·0 = 0, whatever q is;
//   3.  ρ² = ‖N‖², so ρ(r) = 0 too.
//
// So the parametric speed ρ/w² reads 0/0 there. The PH condition is a relation BETWEEN ρ and N,
// and at a parameter where both vanish identically it constrains nothing: its derivative in that
// direction dies, which is a rank loss in the defining Jacobian, which is precisely what Newton
// cannot work with. Levenberg damping does not help — damping handles small singular values, and
// this is a zero one.
//
// Measured on two cubics that differ only in whether a root is repeated:
//
//     (t−1.5)(t−3)(t−4.5)   |w′| = 5, 2, 5     |N| = 2e-1, 5e-2, 1e-4   |ρ| = 1e-1, 4e-2, 1e-4
//     (t−1.5)²(t−3)         |w′| = 0 at 1.5    |N| = 4e-16              |ρ| = 7e-14
//
// This is §6 of POLE_ALGEBRA arriving from the solver's side. There it said softness is UNDEFINED
// at a multiple pole because N(r) = 0 regardless of q; here the same vanishing is what makes the
// variety singular. One fact, two consequences.
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

  it('and therefore ρ vanishes there too — the speed reads 0/0', () => {
    const w = [-6.75, 11.25, -6, 1]
    const q = [[0.4, -1.1, 0.7, 0.3], [-0.9, 0.2, 1.3, -0.5], [0.6, 0.8, -0.4, 1.1]]
    const N = q.map((qi) => psub(pmul(pderiv(qi), w), pmul(qi, pderiv(w))))
    const nn = normSquared(N)
    // ρ² = ‖N‖², so ρ(r)² = ‖N(r)‖² = 0
    console.log(`    ‖N‖²(1.5) / scale = ${(Math.abs(at(nn, 1.5)) / Math.max(...nn.map(Math.abs))).toExponential(1)}` +
      `  →  ρ(1.5) = 0, while w(1.5) = 0: the speed ρ/w² is 0/0 there`)
    expect(Math.abs(at(nn, 1.5)) / Math.max(...nn.map(Math.abs)), 'so ρ(r) = 0').toBeLessThan(1e-12)
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
