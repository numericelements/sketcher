// ============================================================================
// TWO NUMBERS FOR ⟨C,C⟩ ≡ 0, FOUR ORDERS APART — which one is honest?
//
// The figure prints conformalNullResidual: convert to the POWER basis, take the worst coefficient
// of ‖q‖² − 2·W·c∞, divide by the largest power coefficient of either side. The drag's own
// membership test (definingRelative) stays in the BERNSTEIN basis and divides by the size of the
// terms actually being cancelled. On a corrected drag of lift8 they read 2.2e-7 and 8e-10.
//
// Both claim to measure the same identity, so at most one can be steering a solver. The arbiter is
// not taste: it is the POINTWISE violation |‖q(t)‖² − 2W(t)c∞(t)| relative to the size of the terms
// at t. That is the quantity the identity is about; a coefficient-space number is only a proxy, and
// the honest proxy is the one that tracks it.
//
// AND THE TWO USES ARE DIFFERENT, which is half the answer:
//   · "is the curve on the model" is a question about [0,1], where the curve is;
//   · "can I judge this pole" is a question about z, which for lift8 runs out to |z| = 3.3.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS, conformalAsRat } from '../../talks/ph-rational/poleLabPresets'
import { frameConformal } from '../specimenFraming'
import {
  dragControlPoint, controlPoints, degreeOf, type ConformalPHCurve,
} from '../conformalPHCurve'
import { nullCurveResidual, nullCurveResidualScale } from '../conformal'
import { conformalNullResidual } from '../poleReadout'
import { bernsteinToPower } from '../conformalPHHopf'
import { vnorm, vsub } from '../quaternion'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }

/** de Casteljau, for a Bernstein polynomial given by its coefficients. */
const bern = (c: readonly number[], t: number): number => {
  let p = [...c]
  while (p.length > 1) {
    const next: number[] = []
    for (let i = 0; i < p.length - 1; i++) next.push((1 - t) * p[i] + t * p[i + 1])
    p = next
  }
  return p[0]
}
/** Degree elevation is not needed: each component is read at its own degree with de Casteljau. */
const comp = (s: ConformalPHCurve, i: number): number[] => s.C.map((c) => (c as unknown as number[])[i])

/**
 * THE RETIRED MEASURE, kept here so the comparison that retired it stays runnable: convert to the
 * POWER basis, worst coefficient of ‖q‖² − 2·W·c∞, over the largest power coefficient of either
 * side. This was what the figure printed until it was measured against the pointwise truth.
 */
function powerBasisNull(s: ConformalPHCurve): number {
  const pmul = (a: readonly number[], b: readonly number[]): number[] => {
    const o = new Array<number>(a.length + b.length - 1).fill(0)
    a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
    return o
  }
  const W = bernsteinToPower(comp(s, 0))
  const q = [1, 2, 3].map((i) => bernsteinToPower(comp(s, i)))
  const inf = bernsteinToPower(comp(s, 4))
  const lhs = q.map((qi) => pmul(qi, qi)).reduce((a, b) =>
    Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)))
  const rhs = pmul(W, inf).map((v) => 2 * v)
  let worst = 0, scale = 0
  for (let i = 0; i < Math.max(lhs.length, rhs.length); i++) {
    worst = Math.max(worst, Math.abs((lhs[i] ?? 0) - (rhs[i] ?? 0)))
    scale = Math.max(scale, Math.abs(lhs[i] ?? 0), Math.abs(rhs[i] ?? 0))
  }
  return worst / Math.max(scale, 1e-300)
}

/** The Bernstein-basis relative null residual — the drag's own measure, null block only. */
function nullBernstein(s: ConformalPHCurve): number {
  const r = nullCurveResidual(s.C)
  const sc = nullCurveResidualScale(s.C)
  return Math.max(...r.map(Math.abs)) / Math.max(...sc.map(Math.abs), 1e-300)
}

/**
 * THE TRUTH: the worst relative violation of ‖q‖² = 2·W·c∞ over a sampled range.
 * Relative to |‖q(t)‖²| + |2W(t)c∞(t)| — the two magnitudes being differenced.
 */
function pointwise(s: ConformalPHCurve, lo: number, hi: number, n = 2001): number {
  const E = nullCurveResidual(s.C)          // Bernstein coefficients of ⟨P,P⟩ = ‖q‖² − 2Wc∞
  const W = comp(s, 0), inf = comp(s, 4)
  const q = [1, 2, 3].map((i) => comp(s, i))
  let worst = 0
  for (let k = 0; k <= n; k++) {
    const t = lo + ((hi - lo) * k) / n
    const qq = q.reduce((a, c) => a + bern(c, t) ** 2, 0)
    const wc = 2 * bern(W, t) * bern(inf, t)
    const scale = Math.abs(qq) + Math.abs(wc)
    if (scale > 0) worst = Math.max(worst, Math.abs(bern(E, t)) / scale)
  }
  return worst
}

function row(tag: string, s: ConformalPHCurve): {
  power: number; bernstein: number; truth: number; shipped: number
} {
  const power = powerBasisNull(s)
  const shipped = conformalNullResidual(s)
  const bernstein = nullBernstein(s)
  const truth = pointwise(s, 0, 1)
  const wide = pointwise(s, -2.5, 3.5)
  say(`  ${tag.padEnd(30)} on [0,1] ${truth.toExponential(1)}   wide ${wide.toExponential(1)}` +
    `   |   POWER ${power.toExponential(1)}  ×${(power / Math.max(truth, 1e-300)).toExponential(0)}` +
    `   BERNSTEIN ${bernstein.toExponential(1)}  ×${(bernstein / Math.max(truth, 1e-300)).toExponential(0)}`)
  return { power, bernstein, truth, shipped }
}

describe('which ⟨C,C⟩ measure is honest', () => {
  it('compares both against the pointwise violation', () => {
    say('  AT REST — every conformal preset:')
    for (const p of PRESETS) if (p.conformal) row(p.id, frameConformal(p.conformal))
    say('')
    say('  DRAGGED — lift8, one 20% grab, per control point:')
    const st0 = frameConformal(PRESETS.find((p) => p.id === 'lift8')!.conformal!)
    const Q = controlPoints(st0)
    const chord = vnorm(vsub(Q[degreeOf(st0)], Q[0]))
    const results: { power: number; bernstein: number; truth: number; shipped: number }[] = []
    for (const guard of [false, true]) {
      for (const index of [0, 1, 2, 3]) {
        const s0 = Q[index]
        const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
        let best = st0; let bestNull = Infinity
        for (const iterations of [80, 300, 900]) {
          const r = dragControlPoint(st0, index, to, { pinEnds: true, iterations, constraintGuard: guard })
          const off = conformalNullResidual(r.state)
          if (off < bestNull) { bestNull = off; best = r.state }
          if (off <= 1e-9) break
        }
        results.push(row(`point ${index}, ${guard ? 'corrector' : 'today    '}`, best))
      }
    }
    for (const line of OUT) console.log(line)

    // WHAT SHIPPED: conformalNullResidual now IS the pointwise violation, so it reproduces the
    // truth column exactly rather than proxying it.
    // A sampled maximum is a lower bound on the true one, so this is a ratio, not an equality —
    // and the gap is a percent, against the orders the old normaliser was worth.
    for (const r of results) {
      const ratio = r.shipped / Math.max(r.truth, 1e-300)
      expect(ratio, 'the shipped number IS the pointwise violation, to a percent').toBeGreaterThan(0.97)
      expect(ratio, 'and never exceeds it — sampling cannot overstate a maximum').toBeLessThan(1.01)
    }

    // THE VERDICT that retired the old one, pinned as three facts rather than a preference.
    //
    // 1. The POWER measure — the one the slide prints — never understates. It is safe, and that is
    //    the only good thing about it.
    for (const r of results) {
      expect(r.power, 'the power measure never reads BELOW the violation').toBeGreaterThan(r.truth / 2)
    }
    // 2. It overstates ENORMOUSLY once the solver is good. On the corrected drags the curve is on
    //    the model to 1e-13 across [0,1] and the printed number still reads 1e-6 — seven orders,
    //    which is the whole of the "off the model" complaint.
    // The exact factor depends on which solver produced the state — it has read 2.6e5 and 1e7 as
    // the corrector's construction changed. What is pinned is the ORDER of the effect, which is the
    // finding: a state on the model to 1e-13 printed as 1e-6.
    expect(Math.max(...results.map((r) => r.power / Math.max(r.truth, 1e-300))),
      'and overstates by orders once the state is actually good').toBeGreaterThan(1e4)
    // 3. The BERNSTEIN measure is far tighter but it can read BELOW the truth — measured at a tenth
    //    of it — so it cannot simply replace the other: understating is the forbidden direction.
    expect(Math.min(...results.map((r) => r.bernstein / Math.max(r.truth, 1e-300))),
      'the Bernstein measure can understate, so it is not the replacement either').toBeLessThan(0.5)
    // Which leaves computing the thing itself: 100 de Casteljau samples reproduce a 20001-sample
    // reference exactly, at 0.12 ms against the printed number's 0.015 ms. There is no reason to
    // carry a proxy at all.
    void conformalAsRat
  }, 900_000)
})
