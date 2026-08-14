// ============================================================================
// THE MIRRORED SLIDER PAIR (ψ, ψ+s) ON THE RATIONAL SIDE — exact in the limit, and how far off before it.
//
// `mirroredSliderPair.test.ts` establishes the pair for the POLYNOMIAL case, where σ acts on the fibre
// exactly and slider2 := σ(slider1) is exchanged to 0.00e+0. This file asks the question that decides
// whether it can ship: what happens at a GENUINE pole, where σ does not quite act?
//
// THE TWO SLIDERS, in the chart's own names:
//
//     ψ        the END-phase circle    — turn 𝒜(1) on its Hopf fibre against 𝒜(0)
//     s        the MIDDLE circle       — both end spinors fixed, the completed square
//
// and the mirrored pair is (ψ, ψ+s): slider1 = at(a, 0), slider2 = at(a, a). That combination is not a
// guess — reversal acts on (ψ, s) as M = [1 0; 1 −1], and e₂ = M e₁ = (1,1).
//
// WHY IT CAN ONLY BE APPROXIMATE HERE. σ sends the pole r to 1−r, so it maps the chart at r to the chart
// at 1−r — a DIFFERENT chart. The data half of the symmetry is exact regardless (below, 1e-15 at every
// pole), because (d₀,d₁,Δc) ↦ (−d₁,−d₀,−Δc) composed with the rotation is the identity on symmetric
// data, algebraically and independent of r. It is only the POLE half that is approximate, and the error
// is precisely the gap between the chart at r and the chart at 1−r.
//
// SO THE ERROR IS CONTROLLED BY A KNOB THE USER ALREADY HAS:
//
//     r        σ keeps the data    σ(slider1) vs the ψ+s LOOP    control: vs the ψ loop
//     1.7      3.7e-14             6.5e-2  (rel 4.0e-2)          3.2e-1
//     5        4.3e-15             2.7e-2  (rel 1.7e-2)          4.0e-1
//     20       1.3e-15             6.1e-3  (rel 3.7e-3)          4.0e-1
//     100      2.0e-15             5.4e-3  (rel 3.3e-3)          4.0e-1
//
// A 12× improvement as the pole goes out, with the control flat throughout — at r = 100 the correct
// partner is 74× closer than the wrong one, so which loop σ lands on is never in doubt.
//
// AND THE USABLE RANGE HAS BOTH ENDS. Below r ≈ 20 the pole asymmetry is visible; above r ≈ 100 the
// CHART degenerates — A₃ → 0 like 1/r, because the r → ∞ limit of a degree-6 one-pole family is the
// polynomial QUINTIC (a degree-6 polynomial PH curve cannot exist, PH polynomials having odd degree).
// Past that the solve stops holding the handles. Sweet spot r ∈ [20, 100].
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, familyBasis, hermiteOf, projectOnto, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { reverseParam, rotate } from '../rationalSymmetries'
import { hermiteChart } from '../rationalHermiteCircles'
import { QUAT_I, qnormSq, vnorm, vsub, type Quat, type Vec3 } from '../quaternion'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
/** SYMMETRIC C¹ Hermite data: d₁ = −R d₀ with R the rotation by π about x̂, and Δc ⊥ x̂. */
const TARGET = [1.0, 0.5, 0.2, -1.0, 0.5, 0.2, 0.0, 1.6, 0.4]

const seed0 = (): MultiPoleParams => {
  const base: MultiPoleParams = {
    A: Array.from({ length: 4 }, () => ZQ), roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}
/** The symmetric member at pole r, reached by continuation — a jump does not converge (§ setPole). */
const atPole = (r: number): MultiPoleParams | null => {
  let cur = projectOnto(seed0(), hermiteOf, TARGET, 60)
  if (Math.hypot(...hermiteOf(toMember(cur)).map((v, i) => v - TARGET[i])) > 1e-7) return null
  const n = Math.max(1, Math.ceil(Math.abs(Math.log(r / 1.7)) / 0.05))
  for (let k = 1; k <= n; k++) {
    const rr = 1.7 * Math.exp((Math.log(r / 1.7) * k) / n)
    const moved = projectToFamily({ ...cur, roots: [rr] })
    if (familyBasis(moved).length === 0) return null
    const nx = projectOnto(moved, hermiteOf, TARGET, 40)
    if (Math.hypot(...hermiteOf(toMember(nx)).map((v, i) => v - TARGET[i])) > 1e-6) return null
    cur = nx
  }
  return cur
}
/** σ_R = (rotation by π about x̂) ∘ (reversal). The identity on symmetric data. */
const sigmaR = (m: MultiPoleParams): MultiPoleParams | null => {
  const rv = reverseParam(m)
  return rv ? rotate(rv, QUAT_I) : null
}
const samp = (m: MultiPoleParams): Vec3[] => {
  const mm = toMember(m)
  return Array.from({ length: 33 }, (_, i) => curveAt(mm, i / 32))
}
const gap = (a: Vec3[], b: Vec3[]): number => Math.max(...a.map((p, i) => vnorm(vsub(p, b[i]))))
/** nearest member of a one-parameter loop */
const nearest = (target: Vec3[], loop: (t: number) => MultiPoleParams | null, N = 720): number => {
  let best = Infinity
  for (let k = 0; k < N; k++) {
    const m = loop((2 * Math.PI * k) / N)
    if (m) best = Math.min(best, gap(target, samp(m)))
  }
  return best
}

const POLES = [1.7, 5, 20, 100]

describe('the (ψ, ψ+s) pair at a genuine pole', () => {
  it('THE DATA HALF IS EXACT at every pole — only the pole half is approximate', () => {
    let worst = 0
    for (const r of POLES) {
      const m = atPole(r)
      expect(m, `r = ${r} is reachable`).not.toBeNull()
      const sm = sigmaR(m!)!
      worst = Math.max(worst, Math.hypot(...hermiteOf(toMember(sm)).map((v, i) => v - TARGET[i])))
    }
    console.log(`    σ keeps the symmetric C¹ data to ${worst.toExponential(1)} at every pole`)
    expect(worst, 'algebraic, and independent of r').toBeLessThan(1e-12)
  }, 300_000)

  it('EQUIVARIANCE IMPROVES AS THE POLE GOES OUT, and the control stays flat', () => {
    const rows: { r: number; rel: number; ctrl: number }[] = []
    for (const r of POLES) {
      const m = atPole(r)!
      const ch = hermiteChart(m)!
      const span = Math.max(...samp(m).map(vnorm))
      let worst = 0, control = 0
      for (const a of [0.8, 2.1, 3.9]) {
        const target = samp(sigmaR(ch.at(a, 0)!)!)
        worst = Math.max(worst, nearest(target, (t) => ch.at(t, t)))         // the ψ+s loop
        control = Math.max(control, nearest(target, (t) => ch.at(t, 0)))     // the ψ loop — WRONG partner
      }
      rows.push({ r, rel: worst / span, ctrl: control / span })
      console.log(
        `    r=${String(r).padStart(5)}:  σ(ψ) vs the ψ+s loop ${(worst / span).toExponential(1)} relative` +
          `   |  vs the ψ loop (control) ${(control / span).toExponential(1)}`,
      )
    }
    // it improves — measured 4.0e-2 down to 3.3e-3
    expect(rows[rows.length - 1].rel, 'far out, the pair is nearly exchanged').toBeLessThan(1e-2)
    expect(rows[0].rel / rows[rows.length - 1].rel, 'and the improvement is an order of magnitude')
      .toBeGreaterThan(5)
    // and the identification is never ambiguous
    for (const row of rows) {
      expect(row.ctrl / row.rel, `r = ${row.r}: the right loop is far closer than the wrong one`)
        .toBeGreaterThan(4)
    }
  }, 900_000)

  it('WHY IT STOPS IMPROVING: the chart degenerates, A₃ → 0 like 1/r', () => {
    // The r → ∞ limit of a degree-6 ONE-pole family is the polynomial QUINTIC — a degree-6 polynomial
    // PH curve cannot exist, since PH polynomials have odd degree. So the top spinor coefficient must
    // die, and past r ≈ 100 the solve can no longer hold the handles.
    const rows: string[] = []
    let prev = Infinity
    for (const r of [1.7, 20, 100, 1000]) {
      const m = atPole(r)
      if (!m) { rows.push(`    r=${r}: unreachable`); continue }
      const A = m.A as Quat[]
      const scale = Math.max(...A.map((q) => Math.sqrt(qnormSq(q))))
      const top = Math.sqrt(qnormSq(A[3])) / scale
      rows.push(`    r=${String(r).padStart(5)}:  |A₃|/scale ${top.toExponential(1)}`)
      expect(top, 'monotonically dying').toBeLessThan(prev)
      prev = top
    }
    rows.forEach((x) => console.log(x))
    // an order of magnitude per order of magnitude in r — that is 1/r
    const a = atPole(100)!, b = atPole(1000)!
    const norm = (m: MultiPoleParams) =>
      Math.sqrt(qnormSq((m.A as Quat[])[3])) / Math.max(...(m.A as Quat[]).map((q) => Math.sqrt(qnormSq(q))))
    expect(norm(a) / norm(b)).toBeGreaterThan(5)
    expect(norm(a) / norm(b)).toBeLessThan(20)
  }, 900_000)
})
