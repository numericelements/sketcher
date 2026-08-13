// ============================================================================
// WHERE THE THREE MISSING DIRECTIONS GO — walked, not guessed. All three land in the same place.
//
// coverageDegree4 measured that the one-pole chart reaches 12 of the 15 dimensions of the degree-4
// rational PH curves, and that all three directions it misses are dominated by the DENOMINATOR. This
// file steps along each one, Newtons back onto the variety, and reads off what it arrived at:
//
//     deg w = 4        four poles
//     deg N = 6        so the spinor has degree n = 3
//     deg p = 3        after normalising the translation, and 2n − m + 1 = 6 − 4 + 1 = 3 ✓
//
// So the missing curves are (n, m) = (3, 4), and the identity that governs everything else in this
// project governs them too.
//
// AND THE REASON THE CHART CANNOT REACH THEM IS STRUCTURAL, not an oversight:
//
//     at (n, m) = (3, 4)    fibre at fixed λ = 4(n+1) − 4m = 0        dim V = 4(n+1) − 3m = 4
//
// The variety is four-dimensional there and the FIXED-λ FIBRE IS A POINT. Our construction builds a
// member by taking the nullspace at fixed λ and forming a linear combination of its basis, so at this
// (n, m) it produces literally nothing — the four dimensions live entirely in the λ's, which the
// construction treats as dials rather than as coordinates to solve in. The condition still makes
// perfect sense there; the method does not.
//
// IT IS ALSO NOT THE μ STORY, which is the hypothesis this walk was expected to confirm. If these
// curves needed Kalkan's non-constant μ, their hodograph N = μ·(𝒜i𝒜*) would carry μ as a common
// factor of all three components. Measured: the three components of N share NO roots at all. N is
// primitive, so μ = constant is fine and the worry was misdirected.
//
// AND IT CORRECTS THE CLASSIFICATION THIS PROJECT WAS USING. "deg c = 2n − m + 1 = 4 forces m odd, so
// m ∈ {1,3}" equates the curve's degree with deg p. As a rational Bézier the degree is
// max(deg p, deg w), so when m exceeds deg p the DENOMINATOR sets it. Degree 4 therefore has three
// families, not two — and the third is exactly the one the chart cannot construct:
//
//     (n,m) = (2,1)   deg p 4, deg w 1    fibre 8    dim V 9
//     (n,m) = (3,3)   deg p 4, deg w 3    fibre 4    dim V 7
//     (n,m) = (3,4)   deg p 3, deg w 4    fibre 0    dim V 4      ← the missing one
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { coverageAt, packCurve, projectToVariety, unpackCurve } from '../rationalPHCoverage'
import { hodographNumerator } from '../rationalCurveBlend'
import type { Quat } from '../quaternion'

const DEG_P = 4
const DEG_W = 4
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

const ONE_POLE: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO(3), roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-10 * s) top--
  return top
}

/** Durand–Kerner. Only used to ask whether three polynomials share a root. */
function rootsOf(a: readonly number[]): { re: number; im: number }[] {
  const top = trim(a)
  if (top < 1) return []
  const c = a.slice(0, top + 1).map((v) => v / a[top])
  let z = Array.from({ length: top }, (_, i) => ({ re: 0.4 * Math.cos(0.9 + 2.3 * i), im: 0.4 * Math.sin(0.9 + 2.3 * i) }))
  const ev = (p: { re: number; im: number }): { re: number; im: number } => {
    let re = 0, im = 0
    for (let i = c.length - 1; i >= 0; i--) { const nr = re * p.re - im * p.im + c[i]; im = re * p.im + im * p.re; re = nr }
    return { re, im }
  }
  for (let it = 0; it < 600; it++) {
    z = z.map((zi, i) => {
      const num = ev(zi)
      let dr = 1, di = 0
      for (let j = 0; j < z.length; j++) {
        if (j === i) continue
        const ar = zi.re - z[j].re, ai = zi.im - z[j].im
        const nr = dr * ar - di * ai; di = dr * ai + di * ar; dr = nr
      }
      const m = dr * dr + di * di || 1e-300
      return { re: zi.re - (num.re * dr + num.im * di) / m, im: zi.im - (num.im * dr - num.re * di) / m }
    })
  }
  return z
}
const magnitudeAt = (a: readonly number[], z: { re: number; im: number }): number => {
  let re = 0, im = 0
  for (let i = a.length - 1; i >= 0; i--) { const nr = re * z.re - im * z.im + a[i]; im = re * z.im + im * z.re; re = nr }
  return Math.hypot(re, im)
}

const START = (() => {
  const m = toMember(ONE_POLE)
  return packCurve({ p: m.p as number[][], w: m.w as number[] }, DEG_P, DEG_W)
})()
const SCALE = Math.hypot(...START)

/** Step along a missing direction and come back down onto the variety. */
const walk = (v: readonly number[], s: number) =>
  projectToVariety(START.map((q, i) => q + s * SCALE * v[i]), DEG_P, DEG_W)

describe('the three directions the one-pole chart misses', () => {
  const report = coverageAt(ONE_POLE, DEG_P, DEG_W)

  it('the starting point is what it claims: one pole, spinor degree 2', () => {
    const m = toMember(ONE_POLE)
    expect(trim(m.w as number[])).toBe(1)
    expect(Math.max(...(m.p as number[][]).map(trim))).toBe(4)
    expect(Math.max(...(m.N as number[][]).map(trim))).toBe(4)     // deg N = 2n
    expect(report.missing.length).toBe(3)
  })

  it('ALL THREE LAND AT (n, m) = (3, 4) — four poles, spinor degree 3', () => {
    for (const v of report.missing) {
      const { x, residual } = walk(v, 0.5)
      expect(residual).toBeLessThan(1e-8)               // we really are back on the variety
      const c = unpackCurve(x, DEG_P, DEG_W)
      const w = c.w as number[]
      const m = trim(w)
      expect(m).toBe(4)                                  // four poles, against our one

      const N = hodographNumerator(c)
      const degN = Math.max(...N.map(trim))
      expect(degN).toBe(6)                               // = 2n, so n = 3
      const n = degN / 2

      // the translation is free; take the one that lowers deg p, then the identity must hold
      const p = (c.p as number[][]).map((pk) => {
        const C = pk[m] / w[m]
        return pk.map((val, i) => val - C * (w[i] ?? 0))
      })
      expect(Math.max(...p.map(trim))).toBe(2 * n - m + 1)   // 3, and deg c = max(3,4) = 4
    }
  })

  it('IT IS NOT THE μ STORY: N is primitive, so there is no common factor to be μ', () => {
    for (const v of report.missing) {
      const c = unpackCurve(walk(v, 0.5).x, DEG_P, DEG_W)
      const N = hodographNumerator(c)
      const scales = [1, 2].map((i) => Math.max(...N[i].map(Math.abs), 1e-300))
      const shared = rootsOf(N[0]).filter((z) =>
        [1, 2].every((i) => magnitudeAt(N[i], z) / scales[i - 1] < 1e-7))
      expect(shared.length).toBe(0)
    }
  })

  it('AND THE CHART CANNOT CONSTRUCT THERE: the fixed-λ fibre is a POINT while dim V is 4', () => {
    const fibreAt = (n: number, m: number): number =>
      familyBasis({
        A: ZERO(n + 1),
        // enough distinct poles for every (n, m) asked below — a short list silently caps m
        // and the "collapse at n + 1 = m" check then passes for the wrong reason
        roots: [1.7, -0.9, 2.6, -3.1, 4.2, -5.3].slice(0, m),
        lambdas: Array.from({ length: m }, () => 0.3),
      }).length

    // the three families that reach degree 4, and the formulae they obey
    expect(fibreAt(2, 1)).toBe(8)     // 4(n+1) − 4m = 8,  dim V = 9
    expect(fibreAt(3, 3)).toBe(4)     // 4(n+1) − 4m = 4,  dim V = 7
    expect(fibreAt(3, 4)).toBe(0)     // 4(n+1) − 4m = 0,  dim V = 4  ← nothing to combine
    expect(4 * (3 + 1) - 4 * 4).toBe(0)
    expect(4 * (3 + 1) - 3 * 4).toBe(4)

    // and the collapse is exactly n + 1 = m, not an accident of these numbers
    for (const n of [2, 3, 4, 5]) expect(fibreAt(n, n + 1)).toBe(0)
  })
})
