// ============================================================================
// THE POLE LAB's state machine and framing, checked headlessly.
//
// r3f cannot be rendered here, so what is pinned is what the readout would SAY: that framing a
// specimen does not stop it being PH or change any verdict, that every preset yields a readable
// pole, and that the Möbius side reads the same curve whichever model holds it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Rat, phRelativeResidual, settleToPH } from '../../../core/nurbsPH'
import { poleLines, readPoles } from '../../../core/poleReadout'
import { BOUNDS, frame, frameConformal, freshState, sampleRational } from '../PoleLab'
import { PRESETS, conformalAsRat } from '../poleLabPresets'
import { project } from '../../../core/conformal'
import { radii } from '../../../core/conformalPHCurve'

describe('the pole lab', () => {
  it('FRAMING is exact: it moves the curve into the box and changes no verdict', () => {
    const limit = Math.max(...BOUNDS.max.map(Math.abs))
    for (const p of PRESETS) {
      const raw = p.rat()
      const framed = frame(raw)
      const before = readPoles(raw)
      const after = readPoles(framed)
      const worst = Math.max(...sampleRational(framed, 80).flat().map(Math.abs))
      console.log(`    ${p.label.padEnd(32)} fits to ${worst.toFixed(2)} of ${limit},` +
        ` PH residual ${phRelativeResidual(framed).toExponential(1)},` +
        ` verdicts ${after.map((x) => x.verdict[0]).join('')}`)
      expect(worst, `${p.id} lands inside the view box`).toBeLessThan(limit)
      expect(phRelativeResidual(framed), 'and is still PH — translation and scaling are exact')
        .toBeLessThan(1e-9)
      expect(after.map((x) => x.verdict), 'and every verdict is unchanged')
        .toEqual(before.map((x) => x.verdict))
    }
  }, 120_000)

  it('every preset opens with a pole the button can print', () => {
    for (const model of ['projective', 'mobius'] as const) {
      const available = PRESETS.filter((p) => model !== 'mobius' || p.conformal)
      expect(available.length, `${model} has specimens`).toBeGreaterThan(0)
      for (const p of available) {
        const st = freshState(model, p)
        const poles = readPoles(model === 'mobius' && st.conformal
          ? frame(conformalAsRat(st.conformal))
          : st.rat)
        expect(poles.length, `${p.id} has at least one pole`).toBeGreaterThan(0)
        const lines = poleLines(poles[0])
        expect(lines.length, 'four lines, which is what the slide shows').toBe(4)
        expect(lines.every((l) => l.length < 90), 'and each fits on a slide').toBe(true)
      }
      console.log(`    ${model}: ${available.length} specimens, every one printable`)
    }
  }, 120_000)

  it('the Möbius side reads the SAME curve as the projective side', () => {
    // the point of the pairing: flipping model must not move the curve
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const asProjective = frame(p.rat())
      const asMobius = frame(conformalAsRat(p.conformal!))
      let worst = 0
      for (let i = 0; i <= asProjective.P.length - 1; i++) {
        worst = Math.max(worst, Math.hypot(...asProjective.P[i].map((v, c) => v - asMobius.P[i][c])))
      }
      console.log(`    ${p.label}: the two models' control points differ by ${worst.toExponential(1)}`)
      expect(worst, 'the same curve, held two ways').toBeLessThan(1e-12)
    }
  }, 120_000)

  it('the readout prints its verdict AND the number it came from', () => {
    const hard = PRESETS.find((p) => p.id === 'hard4')
    const soft = PRESETS.find((p) => p.id === 'soft6')
    if (!hard || !soft) throw new Error('missing specimens')
    const h = poleLines(readPoles(frame(hard.rat()))[0])
    const s = poleLines(readPoles(frame(soft.rat()))[0])
    for (const line of [...h, '', ...s]) console.log(`      ${line}`)
    expect(h.join(' ')).toContain('HARD')
    expect(h.join(' '), 'the real case shows ⟨q,q⟩ = |a|² outright').toContain('|a|²')
    expect(s.join(' ')).toContain('SOFT')
    expect(s.join(' '), 'the complex case shows the two lengths').toContain('|a| =')
    expect(s.join(' '), 'and the angle').toContain('angle =')
  }, 120_000)

  it('the SPHERE is centred on its control point, in the SAME coordinates', () => {
    // The bug this guards: the projective form was framed and the conformal state was not, so the
    // sphere was drawn in the specimen's original coordinates while the points were in the box.
    const limit = Math.max(...BOUNDS.max.map(Math.abs))
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const st = freshState('mobius', p)
      expect(st.conformal, `${p.id} loads a conformal state`).not.toBeNull()
      if (!st.conformal) continue
      const shown = conformalAsRat(st.conformal)
      const rs = radii(st.conformal)
      let worst = 0
      let biggest = 0
      for (let k = 0; k < st.conformal.C.length; k++) {
        const centre = project(st.conformal.C[k])
        expect(centre, 'every control sphere has a finite centre').not.toBeNull()
        if (!centre) continue
        worst = Math.max(worst, Math.hypot(centre.x - shown.P[k][0], centre.y - shown.P[k][1],
          centre.z - shown.P[k][2]))
        biggest = Math.max(biggest, Math.abs(rs[k]))
      }
      const extent = Math.max(...shown.P.flat().map(Math.abs))
      console.log(`    ${p.label.padEnd(30)} centres match the drawn points to` +
        ` ${worst.toExponential(1)};  points reach ${extent.toFixed(2)} of ${limit},` +
        ` largest radius ${biggest.toFixed(2)}`)
      expect(worst, 'the sphere centre IS the control point').toBeLessThan(1e-12)
      expect(extent, 'and the framed member is inside the box').toBeLessThan(limit)
    }
  }, 120_000)

  it('framing a conformal member keeps it NULL and keeps every verdict', () => {
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const before = readPoles(conformalAsRat(p.conformal!))
      const framed = frameConformal(p.conformal!)
      const after = readPoles(conformalAsRat(framed))
      const residual = phRelativeResidual(conformalAsRat(framed))
      console.log(`    ${p.label.padEnd(30)} after framing: PH residual ${residual.toExponential(1)},` +
        ` verdicts ${after.map((x) => x.verdict[0]).join('')}`)
      expect(residual, 'a similarity is linear on ℝ⁴ʼ¹, so nullity survives exactly')
        .toBeLessThan(1e-9)
      expect(after.map((x) => x.verdict)).toEqual(before.map((x) => x.verdict))
    }
  }, 120_000)

  it('a projective drag holds the ENDS fixed and still satisfies PH', () => {
    // Freezing the dragged point AND both ends is nine of the 6d+4 unknowns, leaving 6d−5 against
    // 4d−1 equations. At d = 2 that is 7 against 7 — no slack — and pinning both ends of a
    // quadratic pins the whole polygon anyway, so the figure drops the pin below degree 3.
    //
    // HOW FAR EACH SPECIMEN GOES IS RECORDED, NOT TUNED. With the ends held, the λ-chart quartic
    // manages 14 of 30 steps against 30 for the others — it is the one whose W has TRUE DEGREE 1,
    // a degenerate weight polynomial sitting inside a degree-4 basis, and it is the hardest of the
    // set to move. When the corrector cannot hold the constraint the point simply stops and the
    // figure's residual readout turns amber. That is the honest behaviour of a hard problem, not a
    // threshold to loosen until it looks better.
    for (const p of PRESETS) {
      const start = frame(p.rat())
      const last = start.P.length - 1
      const g = Math.min(1, last)
      if (g === 0 || g === last) continue                     // nothing interior to grab
      const ends = [start.P[0].slice(), start.P[last].slice()]
      const chord = Math.hypot(...start.P[last].map((v, i) => v - start.P[0][i]))
      // the figure's own rule: pin the ends only from degree 3 up, where the counting leaves slack
      const pinEnds = last >= 3
      let cur = start
      let worstEnd = 0
      let worstResidual = 0
      let steps = 0
      for (let s = 1; s <= 30; s++) {
        const to = start.P[g].map((v, i) => v + (0.3 * chord * s / 30) * [0.7, 0.5, -0.4][i] / Math.hypot(0.7, 0.5, 0.4))
        const held = pinEnds ? [g, 0, last] : [g]
        const moved: Rat = {
          P: cur.P.map((q, k) => (k === g ? [...to] : [...q])),
          w: [...cur.w],
          rho: [...cur.rho],
        }
        const got = settleToPH(moved, last, {
          frozen: held.flatMap((i) => [3 * i, 3 * i + 1, 3 * i + 2]),
          steps: 160,
        })
        if (got.residual > 1e-5) break
        cur = got.rat
        steps = s
        worstResidual = Math.max(worstResidual, got.residual)
        worstEnd = Math.max(worstEnd,
          Math.hypot(...cur.P[0].map((v, i) => v - ends[0][i])),
          Math.hypot(...cur.P[last].map((v, i) => v - ends[1][i])))
      }
      console.log(`    ${p.label.padEnd(32)} deg ${last}: ${steps}/30 steps,` +
        ` ends ${pinEnds ? 'PINNED' : 'free  '} and moved ${worstEnd.toExponential(1)},` +
        ` worst PH residual ${worstResidual.toExponential(1)}`)
      expect(steps, `${p.id} can be dragged a useful distance`).toBeGreaterThan(10)
      if (pinEnds) {
        expect(worstEnd, 'the ends do not move at all — frozen, not weighted').toBeLessThan(1e-14)
      }
      expect(worstResidual, 'and the curve stays PH').toBeLessThan(1e-5)
      expect(phRelativeResidual(cur), 'including at the end of the drag').toBeLessThan(1e-5)
    }
  }, 300_000)
})
