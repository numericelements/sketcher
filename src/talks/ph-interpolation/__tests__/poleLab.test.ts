// ============================================================================
// THE POLE LAB's state machine and framing, checked headlessly.
//
// r3f cannot be rendered here, so what is pinned is what the readout would SAY: that framing a
// specimen does not stop it being PH or change any verdict, that every preset yields a readable
// pole, and that the Möbius side reads the same curve whichever model holds it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { phRelativeResidual } from '../../../core/nurbsPH'
import { poleLines, readPoles } from '../../../core/poleReadout'
import { BOUNDS, frame, freshState, sampleRational } from '../PoleLab'
import { PRESETS, conformalAsRat } from '../poleLabPresets'

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
})
