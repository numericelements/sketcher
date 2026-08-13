// ============================================================================
// THE TWIST DIAL IS A DEGREE DIAL — one end a rational quartic with a genuine pole, the other a
// polynomial CUBIC, and the cubics are helices.
//
// This started as Eric asking whether θ = 0 gives a polynomial curve. It does not — θ = 0 is where the
// pole is most genuine. It is the ENDS of the dial, both of them, and what happens there is a degree
// drop of exactly one.
//
// THE MECHANISM. The dial's ends approach σ(r) = 0, where 𝒜(r) = 0, so 𝒜 = (t−r)·𝒜̃ and N = 𝒜i𝒜*
// picks up a DOUBLE zero at r. Then p is divisible by w and the apparent pole CANCELS:
//
//     deg p 4 → 3      w = (t−r) → 1      deg c = 2n − m + 1 = 2·1 − 0 + 1 = 3
//
// so the rational quartic becomes a polynomial cubic. The chart never reaches the end — σ(r) = 0 is
// exactly the stratum it excludes — so what the slider shows is a curve approaching one, and the
// approach is measurable: |p(r)| relative to the coefficient scale runs 4.35 at θ = 0, 0.26 at 80°,
// 2.7e-3 at 89°, 2.7e-5 at 89.9°.
//
// AND THE LIMIT OBJECTS ARE HELICES, which is the classical fact about spatial polynomial PH cubics
// (Farouki & Sakkalis 1994) arriving here from the other direction. τ/κ is constant to machine zero
// on the exact members, and the approximation's spread tracks the pole remainder order for order —
// 3.7e-3 at θ = 89, 3.7e-5 at 89.9 — which is the right way for an approximation to behave.
//
// THE CONTROL MATTERS AS MUCH AS THE RESULT. Divide p by (t−r) at a GENERIC angle and you still get a
// cubic-shaped thing; what says it is not a helix is that τ/κ spreads by 2. Without that the test
// would pass on any curve at all.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  dataOf, familyBasis, phDefect, toMember, unpackSpinor, withDial,
} from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const R = 1.7
const ZERO: Quat[] = Array.from({ length: 3 }, () => Q(0, 0, 0, 0))

const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [R], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()
const TARGET = dataOf(toMember(SEED))

const at = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const dP = (a: readonly number[]): number[] => a.slice(1).map((c, i) => c * (i + 1))
const cross = (a: number[], b: number[]): number[] =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Synthetic division by (t − r): the quotient, and the remainder that says whether it was exact. */
function divide(a: readonly number[], r: number): { q: number[]; rem: number } {
  const d = a.length - 1
  const q = new Array<number>(d).fill(0)
  let c = 0
  for (let i = d; i >= 1; i--) { c = a[i] + c * r; q[i - 1] = c }
  return { q, rem: a[0] + c * r }
}

/** τ/κ sampled along a polynomial curve. Constant exactly when the curve is a helix. */
function helicity(p: number[][]): { mean: number; spread: number } {
  const vals: number[] = []
  for (let i = 1; i <= 7; i++) {
    const t = i / 8
    const d1 = p.map((c) => at(dP(c), t))
    const d2 = p.map((c) => at(dP(dP(c)), t))
    const d3 = p.map((c) => at(dP(dP(dP(c))), t))
    const c12 = cross(d1, d2)
    const n = Math.hypot(...c12)
    vals.push((dot(c12, d3) * Math.hypot(...d1) ** 3) / n ** 3)
  }
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  return { mean, spread: (Math.max(...vals) - Math.min(...vals)) / Math.max(Math.abs(mean), 1e-300) }
}

/** 𝒜 = (t − r)(b₀ + b₁t): on the stratum exactly, so the pole cancels exactly. */
const onStratum = (b0: Quat, b1: Quat): MultiPoleParams => ({
  A: [
    Q(-R * b0.u, -R * b0.v, -R * b0.p, -R * b0.q),
    Q(b0.u - R * b1.u, b0.v - R * b1.v, b0.p - R * b1.p, b0.q - R * b1.q),
    b1,
  ],
  roots: [R],
  lambdas: [0],
})

const quotientOf = (prm: MultiPoleParams): { p: number[][]; remainder: number } => {
  const m = toMember(prm)
  const parts = (m.p as number[][]).map((c) => divide(c, prm.roots[0]))
  const scale = Math.max(...(m.p as number[][]).flat().map(Math.abs), 1e-300)
  return { p: parts.map((x) => x.q), remainder: Math.hypot(...parts.map((x) => x.rem)) / scale }
}

describe('the twist dial is a degree dial', () => {
  it('θ = 0 is where the pole is MOST genuine, and the ends are where it cancels', () => {
    const divisibility = (deg: number): number => {
      const prm = withDial(SEED, TARGET, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })
      expect(prm).not.toBeNull()
      return quotientOf(prm!).remainder
    }
    const middle = divisibility(0)
    expect(middle).toBeGreaterThan(1)                 // measured 4.35 — a genuine pole
    // monotone down to the ends, on both sides, and by five orders
    let prev = middle
    for (const deg of [45, 80, 89, 89.9]) {
      const v = divisibility(deg)
      expect(v).toBeLessThan(prev)
      prev = v
    }
    expect(prev).toBeLessThan(1e-4)                   // measured 2.7e-5
    expect(divisibility(-89.9)).toBeLessThan(1e-4)    // and the other end does the same
  })

  it('THE DEGREE DROPS BY EXACTLY ONE: the quotient is a cubic over the constant 1', () => {
    const prm = onStratum(Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1))
    const m = toMember(prm)
    const { p, remainder } = quotientOf(prm)
    expect(remainder).toBeLessThan(1e-13)             // p really is divisible by w
    expect(phDefect(m)).toBeLessThan(1e-14)           // and the member is exactly PH

    const trim = (a: readonly number[]): number => {
      const s = Math.max(...a.map(Math.abs), 1e-300)
      let top = a.length - 1
      while (top > 0 && Math.abs(a[top]) < 1e-11 * s) top--
      return top
    }
    expect(Math.max(...(m.p as number[][]).map(trim))).toBe(4)   // before dividing: a quartic
    expect(Math.max(...p.map(trim))).toBe(3)                     // after: a cubic
    expect(divide(m.w as number[], R).q).toEqual([1])            // and the denominator is gone
  })

  it('AND THE LIMIT CUBICS ARE HELICES — τ/κ constant to machine zero', () => {
    const seeds: [Quat, Quat][] = [
      [Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1)],
      [Q(1, 0, 0.4, -0.2), Q(0.3, -0.5, 0.1, 0.7)],
      [Q(0.2, 0.9, -0.1, 0.3), Q(-0.6, 0.2, 0.5, -0.4)],
    ]
    const means: number[] = []
    for (const [b0, b1] of seeds) {
      const h = helicity(quotientOf(onStratum(b0, b1)).p)
      expect(h.spread).toBeLessThan(1e-13)            // measured 3.2e-15, 1.3e-15, 3.1e-15
      means.push(h.mean)
    }
    // three genuinely different helices, not one curve measured three times
    expect(Math.max(...means) - Math.min(...means)).toBeGreaterThan(1)   // 3.47, −1.40, 1.30
  })

  it('the dial APPROACHES helicity, and the spread tracks the pole remainder', () => {
    const measure = (deg: number) => {
      const prm = withDial(SEED, TARGET, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })!
      const { p, remainder } = quotientOf(prm)
      return { remainder, spread: helicity(p).spread }
    }
    const near = measure(89)
    const nearer = measure(89.9)
    expect(near.spread).toBeLessThan(1e-2)            // measured 3.7e-3
    expect(nearer.spread).toBeLessThan(1e-4)          // measured 3.7e-5
    // the two fall together by the same two orders — an approximation behaving like one
    expect(near.spread / nearer.spread).toBeGreaterThan(30)
    expect(near.remainder / nearer.remainder).toBeGreaterThan(30)
  })

  it('CONTROL: at a generic angle the same quotient is nothing like a helix', () => {
    for (const deg of [0, 35]) {
      const prm = withDial(SEED, TARGET, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })!
      expect(helicity(quotientOf(prm).p).spread).toBeGreaterThan(1)   // measured 2.26 and 1.96
    }
  })
})
