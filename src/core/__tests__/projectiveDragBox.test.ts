// ============================================================================
// THE WEIGHT-SIGN BOX ON THE PROJECTIVE DRAG — the blow-up, and the wall that stops it.
//
// nurbsPH's header always said it: "weights of one sign give W > 0 on [0,1], so 'no pole on the
// curve' is a BOX CONSTRAINT". settleToPH did not enforce the box, and Eric caught the symptom
// in the figure: dragging slide 8's control points sometimes sent the curve to infinity.
// Measured, the lab's own 30-tick gesture on the degree-5 specimen:
//
//     hard5r pt3, today          extent 2.5e+2 (view box ±2.2)   min|W| on [0,1] = 7.1e-6, signs FLIP
//     hard5r pt3, sign box       extent 1.6e+0                   min|W| = 2.2e-2, no flip
//
// The mechanism is a weight crossing zero: a root of W enters [0,1], and the DRAWN arc acquires
// a genuine pole. The box is a WALL at w = 0, not a floor — |w| may shrink, so a pole approaching
// the domain from outside is still shown honestly; only the crossing is barred. The cost is
// honest too: ticks the wall refuses leave the point where it was (13–18 of 30 accepted on the
// two affected gestures), which is the feasible limit of the specimen, not a solver mood.
//
// The cancelling-pole specimen keeps its MIXED signs — the guard preserves each weight's own
// sign, it does not force positivity — and its behaviour is unchanged: its in-domain W-root is
// the specimen's design, and a drag that breaks the cancellation making ½ a genuine pole is
// real geometry (extent ~12, pre-existing in both modes, structural).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS } from '../../talks/ph-interpolation/poleLabPresets'
import { frame, sampleRational } from '../../talks/ph-interpolation/PoleLab'
import { type Rat, settleToPH } from '../nurbsPH'

const bern = (n: number, t: number): number[] => {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let k = 1; k <= n; k++) {
    for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
    out[0] *= 1 - t
  }
  return out
}
const minWOn01 = (r: Rat): number => {
  let mn = Infinity
  const d = r.w.length - 1
  for (let k = 0; k <= 200; k++) {
    const b = bern(d, k / 200)
    let W = 0
    for (let j = 0; j <= d; j++) W += r.w[j] * b[j]
    mn = Math.min(mn, Math.abs(W))
  }
  return mn
}
const extent = (r: Rat): number => Math.max(...sampleRational(r, 120).flat().map(Math.abs))

/** The lab's own drag recipe, 30 diagonal ticks; returns the worst of everything seen. */
function gesture(rat0: Rat, index: number, keepWeightSigns: boolean) {
  const d = rat0.P.length - 1
  const held = d >= 3 ? [index, ...[0, d].filter((i) => i !== index)] : [index]
  const frozen = held.flatMap((i) => [3 * i, 3 * i + 1, 3 * i + 2])
  const signs0 = rat0.w.map(Math.sign)
  let cur: Rat = { P: rat0.P.map((p) => [...p]), w: [...rat0.w], rho: [...rat0.rho] }
  let worstExtent = extent(cur)
  let minW = minWOn01(cur)
  let crossed = false
  let accepted = 0
  for (let s = 1; s <= 30; s++) {
    const to = [
      rat0.P[index][0] + 0.02 * s * 1.9,
      rat0.P[index][1] + 0.02 * s * 1.9,
      rat0.P[index][2] - 0.02 * s * 1.6,
    ]
    const moved: Rat = {
      P: cur.P.map((p, k) => (k === index ? [...to] : [...p])),
      w: [...cur.w], rho: [...cur.rho],
    }
    const got = settleToPH(moved, d, { frozen, steps: 160, keepWeightSigns })
    if (got.residual > 1e-5) continue // the lab refuses these
    accepted++
    cur = got.rat
    worstExtent = Math.max(worstExtent, extent(cur))
    minW = Math.min(minW, minWOn01(cur))
    if (cur.w.some((w, k) => signs0[k] !== 0 && Math.sign(w) !== signs0[k])) crossed = true
  }
  return { worstExtent, minW, crossed, accepted }
}

describe('the projective drag stays in its weight orthant', () => {
  it('the blow-up is real without the box: hard5r flips a weight and leaves the screen', () => {
    const rat0 = frame(PRESETS.find((p) => p.id === 'hard5r')!.rat())
    const r = gesture(rat0, 3, false)
    console.log(`hard5r pt3, no box: extent ${r.worstExtent.toExponential(1)}  min|W| ${r.minW.toExponential(1)}  crossed ${r.crossed}`)
    expect(r.crossed, 'a weight crosses zero').toBe(true)
    expect(r.worstExtent, 'and the drawn curve leaves the view box by an order of magnitude')
      .toBeGreaterThan(50)
  }, 300_000)

  it('with the box, every projective gesture keeps the curve bounded and its orthant', () => {
    for (const preset of PRESETS) {
      const rat0 = frame(preset.rat())
      const d = rat0.P.length - 1
      const startsOneSigned = minWOn01(rat0) > 1e-6
      for (let index = 0; index <= d; index++) {
        const r = gesture(rat0, index, true)
        expect(r.crossed, `${preset.id} pt${index}: no weight ever crosses zero`).toBe(false)
        if (startsOneSigned) {
          // One-signed specimens: W ≠ 0 on [0,1] throughout, so the drawn arc never has a pole
          // and stays near the box. The cancelling specimen is exempt by construction — its
          // W-root sits IN the domain from the start.
          expect(r.minW, `${preset.id} pt${index}: no pole enters the drawn arc`)
            .toBeGreaterThan(1e-4)
          expect(r.worstExtent, `${preset.id} pt${index}: the curve stays on screen`)
            .toBeLessThan(10)
        }
      }
    }
  }, 600_000)
})
