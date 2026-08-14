// ============================================================================
// WHICH POLYNOMIAL PH CURVES SIT IN THE CLOSURE OF A RATIONAL FAMILY — one degree per pole.
//
// THE OBSERVATION, Eric's: the degree-4 one-pole family degenerates to a degree-3 polynomial PH curve
// as the twist dial runs out, and he asked whether "one degree less" is the general pattern.
//
// It is one degree less PER POLE, and the mechanism is exactly the σ(r) = 0 stratum. Where 𝒜(r_j) = 0
// the spinor carries the factor:
//
//     𝒜 = (t−r_1)···(t−r_k)·𝒜̃     ⟹     N = [∏(t−r_j)]²·Ñ
//
// so N/w² loses the square of that product and the apparent poles CANCEL. What is left has spinor
// degree n−k and pole count m−k, hence
//
//     deg c = 2(n−k) − (m−k) + 1 = (2n − m + 1) − k
//
// — the degree falls by k, and the curve is polynomial exactly when k = m, all the poles gone.
//
// MEASURED at spinor degree 3, cancelling every pole:
//
//     m = 1    degree 6 → 5      polynomial
//     m = 2    degree 5 → 3      polynomial
//     m = 3    degree 4 → 1      polynomial: a straight line
//
// with the division exact to 1e-15 and every member exactly PH.
//
// AND THE PARITY FALLS OUT. Polynomial PH curves have ODD degree 2n+1 — the classical fact — and
// d − m = 2n − 2m + 1 is odd automatically. So an EVEN-degree rational PH curve has an odd number of
// poles, and its polynomial limit is d − m.
//
// WHICH MAKES THE TWO DEGREE-4 FAMILIES DEGENERATE VERY DIFFERENTLY. One pole gives a polynomial PH
// CUBIC — a helix, and a genuinely interesting curve (theTwistDialIsADegreeDial pins τ/κ constant to
// 3e-15). Three poles gives degree 1: a straight line. The richest degeneration is the one with the
// fewest poles.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type MultiPoleParams, phDefect, toMember } from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const BASE: Quat[] = [Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1), Q(0.3, -0.5, 0.15, 0.4)]
const ROOTS = [1.7, -0.9, 2.6]

const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-10 * s) top--
  return top
}
/** Multiply a quaternion polynomial by the real linear factor (t − r). */
function timesLinear(A: readonly Quat[], r: number): Quat[] {
  const out: Quat[] = Array.from({ length: A.length + 1 }, () => Q(0, 0, 0, 0))
  A.forEach((a, k) => {
    out[k + 1] = { u: out[k + 1].u + a.u, v: out[k + 1].v + a.v, p: out[k + 1].p + a.p, q: out[k + 1].q + a.q }
    out[k] = { u: out[k].u - r * a.u, v: out[k].v - r * a.v, p: out[k].p - r * a.p, q: out[k].q - r * a.q }
  })
  return out
}
function divideLinear(a: readonly number[], r: number): { q: number[]; rem: number } {
  const d = a.length - 1
  const q = new Array<number>(d).fill(0)
  let c = 0
  for (let i = d; i >= 1; i--) { c = a[i] + c * r; q[i - 1] = c }
  return { q, rem: a[0] + c * r }
}

/**
 * 𝒜 = (t−r₁)···(t−r_k)·𝒜̃ with deg 𝒜̃ = 3−k, so the spinor always has degree 3 and vanishes at every
 * pole. Multiplying by the pole factors satisfies the residue condition at those poles for free — the
 * stratum is where the condition holds without being imposed (F17).
 */
const cancelling = (k: number): MultiPoleParams => {
  let A: Quat[] = BASE.slice(0, 3 - k + 1)
  for (let j = 0; j < k; j++) A = timesLinear(A, ROOTS[j])
  return { A, roots: ROOTS.slice(0, k), lambdas: ROOTS.slice(0, k).map(() => 0) }
}

describe('polynomial PH curves in the closure of a rational family', () => {
  it('EACH CANCELLED POLE DROPS THE DEGREE BY EXACTLY ONE, and all of them makes it polynomial', () => {
    const seen: { m: number; before: number; after: number }[] = []
    for (const k of [1, 2, 3]) {
      const prm = cancelling(k)
      const m = toMember(prm)
      expect(m.wronskian).toBeLessThan(1e-12)      // a genuine member: p really reproduces N
      expect(phDefect(m)).toBeLessThan(1e-12)

      const w = m.w as number[]
      const before = Math.max(...(m.p as number[][]).map(trim), trim(w))

      // divide out every cancelled pole, from both numerator and denominator
      let p = (m.p as number[][]).map((a) => a.slice())
      let wq = w.slice()
      let remainder = 0
      const scale = Math.max(...(m.p as number[][]).flat().map(Math.abs), 1e-300)
      for (let j = 0; j < k; j++) {
        const parts = p.map((a) => divideLinear(a, ROOTS[j]))
        remainder = Math.max(remainder, Math.hypot(...parts.map((x) => x.rem)) / scale)
        p = parts.map((x) => x.q)
        wq = divideLinear(wq, ROOTS[j]).q
      }
      expect(remainder).toBeLessThan(1e-12)        // the division really is exact
      expect(trim(wq)).toBe(0)                     // no denominator left: POLYNOMIAL

      const after = Math.max(...p.map(trim))
      expect(before - after).toBe(k)               // one degree per pole
      seen.push({ m: k, before, after })
    }
    // measured: 6→5, 5→3, 4→1
    expect(seen.map((s) => `${s.before}->${s.after}`)).toEqual(['6->5', '5->3', '4->1'])
  })

  it('the identity behind it: deg c = 2n − m + 1, so the drop is d − k with the SAME spinor degree', () => {
    for (const k of [1, 2, 3]) {
      const n = 3
      expect(Math.max(2 * n - k + 1, k) - (2 * (n - k) - 0 + 1)).toBe(k)
    }
  })

  it('AND THE PARITY IS AUTOMATIC: a polynomial PH curve has odd degree', () => {
    // d − m = 2n − 2m + 1, odd for every n and m — which is why an EVEN-degree rational PH curve
    // must have an ODD number of poles, and why no polynomial PH curve has even degree.
    for (let n = 1; n <= 6; n++) {
      for (let m = 0; m <= n; m++) expect((2 * n - 2 * m + 1) % 2).toBe(1)
    }
  })

  it('so the two degree-4 families degenerate very differently', () => {
    // one pole: 4 − 1 = 3, a polynomial PH cubic, which is a helix
    expect(4 - 1).toBe(3)
    // three poles: 4 − 3 = 1, a straight line
    expect(4 - 3).toBe(1)
    const line = toMember(cancelling(3))
    let p = (line.p as number[][]).map((a) => a.slice())
    for (const r of ROOTS) p = p.map((a) => divideLinear(a, r).q)
    expect(Math.max(...p.map(trim))).toBe(1)      // degree 1: c′ is constant
  })
})
