// ============================================================================
// THE DEGREE OF A RATIONAL PH CURVE, AND WHY THE "IT SHOULD BE EVEN" INSTINCT IS RIGHT.
//
// The construction here is: pick a quaternion spinor 𝒜 of degree n, pick m poles, set the hodograph to
// 𝒜i𝒜̄/w² with w of degree m, and integrate. The curve that comes out has degree
//
//     deg c = 2n − m + 1
//
// because 𝒜i𝒜̄ has degree 2n, dividing by w² and integrating nets +1 against the −m already spent. Since
// 2n is always even, THE PARITY IS DECIDED BY m ALONE:
//
//     m = 0  (polynomial)   deg = 2n + 1     ODD   — the classical fact: PH cubics, quintics, septics
//     m = 1  (one pole)     deg = 2n         EVEN  — 4, 6, 8 …  ← the instinct, and it is correct
//     m = 2  (two poles)    deg = 2n − 1     ODD   — 5, 7 …     ← slide 18 lives here
//     m = 3                 deg = 2n − 2     EVEN
//
// So "rational PH wants to be even degree" is TRUE of the standard one-pole construction — and degree 6 in
// particular is m = 1, n = 3, which is exactly the conformal sextic family this codebase already carries.
// Odd rational degrees are not forbidden; they need an EVEN number of poles, and slide 18's degree 5 is
// the smallest of them.
//
// A SEPARATE ROUTE TO THE SAME PLACE, worth naming because it is probably where the instinct comes from:
// a Möbius transformation of a POLYNOMIAL PH curve is a rational PH curve, and inversion doubles degree.
// The PH cubic maps to degree 6, the PH quintic to degree 10 — even, every time, because 2 × odd is even.
// Not measured here (this file tests the spinor-with-poles construction), so it is stated as literature.
//
// THE SWEEPABLE SUBFAMILY. Asking for the fiber to be exactly one-dimensional forces n = m + 1 (from
// fiber = 4n − 4m − 3), which collapses the table to deg c = m + 3: one pole degree 4, two poles degree 5,
// three poles degree 6. That is why the slides march 4, 5, 6 — each pole buys a degree AND a twist dial
// without spending the loop.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { QUAT_I, QUAT_ONE, qadd, qscale, type Quat } from '../quaternion'
import { toMember as oneToMember, type OnePoleParams } from '../rationalPHOnePoleSpatial'
import {
  projectToFamily,
  toMember as multiToMember,
  seedQuintic,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'

const degreeOf = (c: readonly number[]): number => {
  const scale = Math.max(...c.map(Math.abs), 1e-300)
  let d = c.length - 1
  while (d > 0 && Math.abs(c[d]) < 1e-12 * scale) d--
  return d
}
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })

describe('rational PH degree and its parity', () => {
  it('one pole gives EVEN degree — slide 17 is a rational quartic', () => {
    const prm: OnePoleParams = {
      b0: qadd(QUAT_ONE, qscale(QUAT_I, 0.4)),
      b2: { u: 0.3, v: -0.7, p: 1.1, q: 0.2 },
      lambda: 0.6,
      pole: 1.7,
    }
    const m = oneToMember(prm)
    const dp = Math.max(...m.p.map(degreeOf))
    const dw = degreeOf(m.w)
    const dInd = degreeOf(m.sigma)
    console.log(
      `    m = 1, spinor degree n = 2:  deg p = ${dp}, deg w = ${dw}  →  curve degree ${Math.max(dp, dw)}` +
        ` (EVEN),  indicatrix degree ${dInd}`,
    )
    expect(Math.max(dp, dw)).toBe(4)
    expect(Math.max(dp, dw) % 2).toBe(0)
  })

  it('two poles give ODD degree — slide 18 really is a rational QUINTIC', () => {
    const prm = seedQuintic()
    const m = multiToMember(prm)
    const dp = Math.max(...m.p.map(degreeOf))
    const dw = degreeOf(m.w)
    console.log(
      `    m = 2, spinor degree n = ${prm.A.length - 1}:  deg p = ${dp}, deg w = ${dw}` +
        `  →  curve degree ${Math.max(dp, dw)} (ODD),  indicatrix degree ${degreeOf(m.sigma)}` +
        `\n    no-log residual ${m.noLog.toExponential(1)}, Wronskian residual ${m.wronskian.toExponential(1)}` +
        ` — it is a genuine member, not a degenerate one`,
    )
    expect(Math.max(dp, dw), 'degree 5, so odd rational PH degrees exist').toBe(5)
    expect(m.noLog, 'and it satisfies the no-log condition').toBeLessThan(1e-9)
  })

  it('three poles give EVEN degree again — parity tracks m, nothing else', () => {
    // n = m + 1 = 4, so five spinor coefficients and three roots.
    const prm = projectToFamily({
      A: [Q(1.0, 0.3, -0.4, 0.2), Q(0.25, -0.5, 0.15, 0.35), Q(-0.2, 0.4, 0.1, -0.3), Q(0.15, 0.1, -0.25, 0.2), Q(0.1, -0.2, 0.3, 0.05)],
      roots: [1.7, -0.9, 2.6],
      lambdas: [0.6, -0.35, 0.2],
    } as MultiPoleParams)
    const m = multiToMember(prm)
    const dp = Math.max(...m.p.map(degreeOf))
    const dw = degreeOf(m.w)
    console.log(
      `    m = 3, spinor degree n = ${prm.A.length - 1}:  deg p = ${dp}, deg w = ${dw}` +
        `  →  curve degree ${Math.max(dp, dw)} (EVEN),  indicatrix degree ${degreeOf(m.sigma)}` +
        `\n    no-log residual ${m.noLog.toExponential(1)}`,
    )
    expect(Math.max(dp, dw)).toBe(6)
    expect(m.noLog).toBeLessThan(1e-8)
  })

  it('the formula: deg c = 2n − m + 1, and the sweepable line n = m + 1 gives deg c = m + 3', () => {
    const rows = [
      { m: 0, n: 2, deg: 5, note: 'polynomial PH quintic — the classical workhorse, ODD' },
      { m: 1, n: 2, deg: 4, note: 'slide 17, rational quartic, EVEN' },
      { m: 1, n: 3, deg: 6, note: 'the conformal sextic family, EVEN — where "degree 6" comes from' },
      { m: 2, n: 3, deg: 5, note: 'slide 18, rational QUINTIC, ODD' },
      { m: 3, n: 4, deg: 6, note: 'three poles, EVEN' },
    ]
    for (const r of rows) {
      expect(2 * r.n - r.m + 1, `m=${r.m}, n=${r.n}`).toBe(r.deg)
      console.log(`    m = ${r.m}, n = ${r.n}  →  2n − m + 1 = ${r.deg}   ${r.note}`)
    }
    console.log(
      `    parity = parity of (m + 1), since 2n is even: odd m ⇒ EVEN degree, even m ⇒ ODD degree`,
    )
  })
})
