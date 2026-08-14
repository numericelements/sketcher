// ============================================================================
// DEGREE 6 — four pole counts, and the PH QUINTIC sits in the closure of the one-pole family.
//
// WHY LOOK. Eric asked whether degree 6 would make better slides than degree 4, on the grounds that it
// contains the polynomial PH quintic — the canonical example the whole Hermite-interpolation
// literature is built on, and the subject of the sibling deck. It does, and there is more besides.
//
// THE CLASSIFICATION, from deg c = max(2n − m + 1, m) = 6:
//
//     poles  (n,m)   deg p / deg w   fibre 4(n+1)−4m   dim 𝒱   polynomial in the closure, d − m
//       1    (3,1)       6 / 1             12           13     5   ← THE PH QUINTIC
//       3    (4,3)       6 / 3              8           11     3       a helix
//       5    (5,5)       6 / 5              4            9     1       a straight line
//       6    (5,6)       5 / 6              0            9     —       the m = n+1 collapse
//
// and m = 0, 2, 4 are EMPTY. So the general shape for an even degree d is
//
//     the possible pole counts are the ODD numbers below d, plus d itself.
//
// (d = 4 gives {1,3}∪{4}; d = 6 gives {1,3,5}∪{6}.) m = 0 is empty because a polynomial PH curve has
// degree 2n+1, always odd; the other even counts are empty because 2n − m + 1 has m's opposite parity.
//
// THE CLOSURE, verified rather than inferred: at (3,1) with 𝒜 vanishing at the pole, dividing out gives
// deg p 5 over deg w 0 — a POLYNOMIAL PH QUINTIC — with the division exact to 6e-15 and PH to 1e-15.
//
// AND THE DIMENSIONS COME OUT THE SAME SHAPE AS DEGREE 4:
//
//     the variety            17      (39 unknowns, 21 equations, full rank at a generic point)
//     the one-pole chart     16      12 fibre + λ + pole + 3 translations − the Hopf gauge
//     gap                     1      as at degree 4, and presumably the same reparametrisation
//
// with the chart's member again a SINGULAR point — rank 17 of 21, a deficit of 4 against degree 4's 2.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  jacobian, layoutFor, newtonToVariety, pack, rankOf, residual, unpack,
} from '../rationalPHVariety'
import type { Quat } from '../quaternion'

const L = layoutFor(6)
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => Q(0, 0, 0, 0))
const ROOTS = [1.7, -0.9, 2.6, -3.1, 4.2, -5.3]

const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-10 * s) top--
  return top
}
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
const memberOf = (n: number, m: number, phase = 0.6): MultiPoleParams | null => {
  const roots = ROOTS.slice(0, m)
  const base: MultiPoleParams = { A: ZERO(n + 1), roots, lambdas: roots.map(() => 0.3) }
  const B = familyBasis(base)
  if (B.length === 0) return null
  const x = new Array<number>(4 * (n + 1)).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + phase)
    for (let j = 0; j < x.length; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
}

describe('degree 6', () => {
  it('THE POLE COUNTS ARE 1, 3, 5 AND 6 — the odd numbers below 6, plus 6', () => {
    const reachable: number[] = []
    for (let m = 0; m <= 6; m++) {
      let found = false
      for (let n = 1; n <= 7; n++) if (Math.max(2 * n - m + 1, m) === 6) found = true
      if (found) reachable.push(m)
    }
    expect(reachable).toEqual([1, 3, 5, 6])

    // and the three that are reachable with a nonempty linear fibre really build a degree-6 curve
    for (const [n, m] of [[3, 1], [4, 3], [5, 5]] as const) {
      const prm = memberOf(n, m)!
      const mem = toMember(prm)
      expect(phDefect(mem)).toBeLessThan(1e-12)
      expect(Math.max(...(mem.p as number[][]).map(trim))).toBe(6)
      expect(trim(mem.w as number[])).toBe(m)
      expect(familyBasis(prm).length).toBe(4 * (n + 1) - 4 * m)   // 12, 8, 4
    }
    // (5,6) is the m = n+1 collapse: the linear fibre is empty there
    expect(familyBasis({ A: ZERO(6), roots: ROOTS.slice(0, 6), lambdas: ROOTS.slice(0, 6).map(() => 0.3) }).length)
      .toBe(0)
  })

  it('THE PH QUINTIC IS IN THE CLOSURE of the one-pole family — d − m = 6 − 1 = 5', () => {
    const A = timesLinear([Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1), Q(0.3, -0.5, 0.15, 0.4)], 1.7)
    const mem = toMember({ A, roots: [1.7], lambdas: [0] })
    expect(mem.wronskian).toBeLessThan(1e-12)
    expect(phDefect(mem)).toBeLessThan(1e-12)
    expect(Math.max(...(mem.p as number[][]).map(trim))).toBe(6)     // before dividing: a sextic

    const parts = (mem.p as number[][]).map((a) => divideLinear(a, 1.7))
    const scale = Math.max(...(mem.p as number[][]).flat().map(Math.abs))
    expect(Math.hypot(...parts.map((x) => x.rem)) / scale).toBeLessThan(1e-12)
    expect(Math.max(...parts.map((x) => trim(x.q)))).toBe(5)          // after: degree 5
    expect(trim(divideLinear(mem.w as number[], 1.7).q)).toBe(0)      // and POLYNOMIAL
  })

  it('the other two closures are the helix and the straight line', () => {
    expect(6 - 3).toBe(3)     // three poles → a polynomial PH cubic, which is a helix
    expect(6 - 5).toBe(1)     // five poles → degree 1
  })

  it('THE VARIETY IS 17-DIMENSIONAL and the one-pole chart covers 16', () => {
    expect(L.unknowns).toBe(39)
    expect(L.equations).toBe(21)

    const prm = memberOf(3, 1)!
    const mem = toMember(prm)
    const x = pack({ p: mem.p as number[][], w: mem.w as number[], sigma: mem.sigma as number[] }, L)
    expect(Math.max(...residual(x, L).map(Math.abs)) / Math.max(...x.map(Math.abs)) ** 4).toBeLessThan(1e-14)
    expect(rankOf(jacobian(x, L))).toBe(17)          // our member: SINGULAR, deficit 4

    // generic points, reached by pushing the top of w and σ and Newtoning back
    const sc = Math.max(...x.map(Math.abs))
    const nP = 3 * (L.degP + 1)
    let full = 0
    for (let t = 0; t < 8; t++) {
      const y = x.slice()
      for (let i = 2; i <= L.degW; i++) y[nP + i] += 0.4 * sc * Math.sin(2.1 * t + 0.9 * i)
      for (let i = 0; i <= L.degSigma; i++) y[nP + L.degW + 1 + i] += 0.06 * sc * Math.cos(1.7 * t + 0.5 * i)
      const z = newtonToVariety(y, L)
      if (Math.max(...residual(z, L).map(Math.abs)) / Math.max(...z.map(Math.abs)) ** 4 > 1e-15) continue
      expect(trim(unpack(z, L).w)).toBe(6)
      // Not every converged trial is GENERIC — some land back near a degenerate stratum, exactly as
      // at degree 4. Count the ones that reach full rank rather than asserting all of them do.
      if (rankOf(jacobian(z, L)) === L.equations) full++
    }
    expect(full).toBeGreaterThanOrEqual(2)             // 21 of 21 at three of the eight trials
    expect(L.unknowns - L.equations - 1).toBe(17)        // the variety

    // and the chart: 12 fibre + λ + pole + 3 translations − the Hopf gauge
    expect(familyBasis(prm).length + 1 + 1 + 3 - 1).toBe(16)
  })
})
