// ============================================================================
// CAN THE CONTROL POINTS OF THE LIFTED HARD CURVE BE MOVED? Every one of them, measured.
//
// A real gesture — twenty small steps, the way a mouse delivers one — on each control point of
// lift8, with the figure's own escalation and the figure's own readout rule.
//
//         today                          corrector          gesture time
//     pt  on model HARD withheld     on model HARD withheld   today -> corrector
//      0    20/20   6/20   0/20        20/20   0/20   0/20    0.59s -> 9.9s
//      1    20/20   0/20   0/20        20/20   0/20   0/20    0.62s -> 1.2s
//      2    20/20   0/20   0/20        20/20   0/20   0/20    0.24s -> 3.0s
//      3    20/20   0/20   0/20        20/20   0/20   0/20    0.62s -> 0.15s
//      4     0/20   0/20   0/20        20/20   1/20   0/20    7.0s  -> 0.88s
//
// TRACKING IS 100% IN EVERY ROW. Moving the points was never the difficulty; the difficulty was
// that the state left the model, and that the readout could not say so honestly.
//
// "withheld" is `below resolution` — the numerator sitting at the root-location noise floor, an
// honest refusal to answer rather than a wrong answer. Only a HARD reading contradicts the theorem
// this slide states, which is why the two are counted apart.
//
// Point 4 is the standing argument for the corrector: without it the gesture never once lands on
// the model; with it, 20/20 at 1.2e-14 and eight times faster. Point 0's hard readings vanish.
//
// AND IT IS STILL NOT SWITCHED ON, which this file is also the record of. What the table above does
// not cover is every OTHER conformal gesture in the deck, which shares the same solver: turning it
// on globally shortened the locus road on the sextic slide by a fifth. Scoping it to the pole lab
// instead moved that lab's own control-point-2 gesture from ONE step reading hard to THREE, at
// complex poles of modulus ~0.5 — near the domain, where neither the far-pole account nor
// real-axis sampling explains them. Two points get better, a third gets worse, and control point 0
// costs 0.59s -> 9.9s. Not a decision the lift8 column alone can carry.
//
// RESOLVED WITHOUT THE CORRECTOR: the interior-point ROUTE (conformalMobiusDrag.ts) as an
// escalation stage lands every point 20/20 on the model — point 4 at 1e-10 in a tenth of the
// time — while the points Newton already served are routed exactly as before. The pole lab now
// drags through dragControlPointStaged; conformalInteriorDrag.test.ts is the measurement. This
// file keeps pinning the plain escalation underneath it, corrector on and off.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS, conformalAsRat } from '../../talks/ph-rational/poleLabPresets'
import { frameConformal } from '../specimenFraming'
import { dragControlPoint, controlPoints, degreeOf, type ConformalPHCurve } from '../conformalPHCurve'
import { conformalCoefficientResidual, conformalNullResidual, readPoles } from '../poleReadout'
import { nullCurveResidual } from '../conformal'
import { vnorm, vsub } from '../quaternion'

describe('can the control points be moved', () => {
  it('a real gesture: twenty small steps, every control point', () => {
    const st0 = frameConformal(PRESETS.find((p) => p.id === 'lift8')!.conformal!)
    const n = degreeOf(st0)
    const Q = controlPoints(st0)
    const chord = vnorm(vsub(Q[n], Q[0]))
    const rows: { guard: boolean; index: number; onModel: number; hard: number; tracked: number }[] = []
    for (const guard of [false, true]) {
      for (const index of [0, 1, 2, 3, 4]) {
        let cur: ConformalPHCurve = st0
        let onModel = 0, notSoft = 0, withheld = 0, iters = 0, want = 0, short = 0, worst = 0
        const t0 = Date.now()
        for (let s = 1; s <= 20; s++) {
          const s0 = Q[index]
          const f = 0.03 * s
          const to = { x: s0.x + f * chord * 0.6, y: s0.y + f * chord * 0.6, z: s0.z - f * chord * 0.5 }
          want += vnorm(vsub(to, controlPoints(cur)[index]))
          let best = cur, bestNull = Infinity, track = 0
          for (const it of [80, 300, 900]) {
            const r = dragControlPoint(cur, index, to, { pinEnds: true, iterations: it, constraintGuard: guard })
            iters += r.iterationsUsed ?? it
            const off = conformalNullResidual(r.state)
            if (off < bestNull) { bestNull = off; best = r.state; track = r.trackingError }
            if (off <= 1e-9) break
          }
          cur = best; short += track; worst = Math.max(worst, bestNull)
          if (bestNull <= 1e-9) {
            onModel++
            const poles = readPoles(conformalAsRat(cur), {
              residual: conformalCoefficientResidual(cur), nullPolynomial: nullCurveResidual(cur.C),
            })
              .filter((x) => x.numerator > 1e-7)
            if (poles.some((x) => x.verdict === 'hard')) notSoft++
            if (poles.some((x) => x.verdict === 'below resolution')) withheld++
          }
        }
        rows.push({ guard, index, onModel, hard: notSoft, tracked: 100 * (1 - short / want) })
        console.log(`  ${guard ? 'corrector' : 'today    '} point ${index}:` +
          ` on the model ${String(onModel).padStart(2)}/20   reads HARD ${String(notSoft).padStart(2)}/20` +
          `   withheld ${String(withheld).padStart(2)}/20` +
          `   tracked ${(100 * (1 - short / want)).toFixed(1).padStart(6)}%` +
          `   worst ⟨C,C⟩ ${worst.toExponential(1)}   ${String(iters).padStart(4)} iters  ${Date.now() - t0}ms`)
      }
    }

    for (const r of rows) {
      expect(r.tracked, `point ${r.index}: the cursor is followed, corrector or not`).toBeGreaterThan(99.9)
    }
    const today = (i: number) => rows.find((r) => !r.guard && r.index === i)!
    const fixed = (i: number) => rows.find((r) => r.guard && r.index === i)!
    // Point 4 is the case that only the corrector rescues — the whole argument for turning it on.
    expect(today(4).onModel, 'point 4 today never lands on the model').toBe(0)
    expect(fixed(4).onModel, 'and with the corrector it always does').toBe(20)
    // No control point is made worse by it, and the one that reads hard is made better.
    for (const i of [0, 1, 2, 3, 4]) {
      expect(fixed(i).onModel, `point ${i}: the corrector never loses feasibility`)
        .toBeGreaterThanOrEqual(today(i).onModel)
    }
    expect(fixed(0).hard, 'and it clears the one point that reads hard').toBeLessThan(today(0).hard)
  }, 900_000)
})
