// ============================================================================
// THE LAB'S SPECIMENS ARE WHAT THEY SAY THEY ARE — and the cached ones are not stale.
//
// Two of the presets are literal coefficients pasted in from a search that takes 18 seconds. A
// paste can go stale in ways nothing else notices: a curve that is no longer PH, or no longer
// soft, would still render and still look like a curve. So every preset is checked against the
// claim its own label makes, and the cached ones are additionally checked for still being PH.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { phRelativeResidual } from '../../../core/nurbsPH'
import { readPoles } from '../../../core/poleReadout'
import { PRESETS } from '../poleLabPresets'

describe('the pole lab presets', () => {
  it('every preset is a PH curve of the degree it claims', () => {
    for (const p of PRESETS) {
      const rat = p.rat()
      const residual = phRelativeResidual(rat)
      console.log(`    ${p.label.padEnd(32)} degree ${rat.P.length - 1},` +
        ` PH residual ${residual.toExponential(1)}`)
      expect(rat.P.length - 1, `${p.id} has the degree it advertises`).toBe(p.degree)
      expect(residual, `${p.id} satisfies ‖q′W − qW′‖² = ρ²`).toBeLessThan(1e-10)
    }
  }, 120_000)

  it('the SOFT presets are soft at every pole, and the hard ones are hard', () => {
    for (const p of PRESETS) {
      const poles = readPoles(p.rat())
      const verdicts = poles.map((x) => x.verdict)
      console.log(`    ${p.label.padEnd(32)} ${poles.length} pole(s): ${verdicts.join(', ')}`)
      if (p.id.startsWith('soft')) {
        expect(verdicts.every((v) => v === 'soft'), `${p.id} is soft everywhere`).toBe(true)
        // and the alignment, which is what the readout shows
        for (const x of poles) {
          expect(x.lengthA / x.lengthB, '|a| = |b|').toBeCloseTo(1, 7)
          expect(x.angle ?? 0, 'a ⊥ b').toBeCloseTo(90, 5)
        }
      }
      if (p.id.startsWith('hard')) {
        expect(verdicts.every((v) => v === 'hard'), `${p.id} is hard at every pole`).toBe(true)
      }
      if (p.id === 'mixed3') {
        expect(verdicts.filter((v) => v === 'soft').length, 'two soft').toBe(2)
        expect(verdicts.filter((v) => v === 'hard').length, 'and one hard').toBe(1)
        expect(poles.find((x) => x.verdict === 'hard')?.real,
          'and the hard one is the REAL pole').toBe(true)
      }
      if (p.id === 'lift8') {
        // the non-reduced locus: the doubled pole cancels, so the readout must not call it a pole
        expect(verdicts.every((v) => v === 'not a pole' || v === 'multiple — undefined'),
          'a lifted hard curve has no pole the readout will judge').toBe(true)
      }
      // ODD DEGREE FORCES A REAL POLE, and a genuine simple real pole is hard (§6). So no
      // odd-degree preset can be soft everywhere — the parity theorem, from this side.
      if (p.degree % 2 === 1) {
        expect(poles.some((x) => x.real), `degree ${p.degree} must have a real pole`).toBe(true)
        expect(verdicts.every((v) => v === 'soft'), 'so it cannot be all soft').toBe(false)
      }
    }
  }, 120_000)

  it('the two awkward presets stay awkward — that is what they are for', () => {
    const dbl = readPoles(PRESETS.find((p) => p.id === 'double')?.rat() ?? PRESETS[0].rat())
    expect(dbl.every((x) => x.verdict === 'multiple — undefined'),
      'the double real pole gets no verdict').toBe(true)
    expect(dbl.every((x) => x.numerator > 0.1), 'and it is genuine, not a cancellation').toBe(true)

    const can = readPoles(PRESETS.find((p) => p.id === 'cancel')?.rat() ?? PRESETS[0].rat())
    expect(can.filter((x) => x.verdict === 'not a pole').length,
      'exactly one root cancels').toBe(1)
    expect(can.filter((x) => x.verdict === 'hard').length,
      'and exactly one survives as a genuine pole').toBe(1)
  })

  it('a conformal preset converts to (P, w, ρ) EXACTLY — so the models share a starting point', () => {
    for (const p of PRESETS.filter((x) => x.conformal)) {
      const residual = phRelativeResidual(p.rat())
      console.log(`    ${p.label}: as a projective member, PH residual ${residual.toExponential(1)}`)
      // the point: flipping model must not move the curve
      expect(residual, 'the same curve satisfies both models').toBeLessThan(1e-9)
      expect(p.degree % 2, 'and a conformal member must have EVEN degree — §8').toBe(0)
    }
  }, 120_000)

  it('loads fast enough to switch specimens while thinking', () => {
    const t0 = performance.now()
    for (const p of PRESETS) readPoles(p.rat())
    const ms = performance.now() - t0
    console.log(`    all ${PRESETS.length} presets built and read in ${ms.toFixed(0)}ms` +
      `  (findMember(6) alone takes 18000ms, which is why they are cached)`)
    expect(ms, 'the whole set is well under a second').toBeLessThan(900)
  }, 120_000)
})
