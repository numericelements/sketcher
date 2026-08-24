// ============================================================================
// A VERDICT NEEDS AN ERROR BAR — and without one the readout points the wrong way.
//
// The Möbius slide's claim is that ⟨C,C⟩ ≡ 0 forces every pole soft. The readout can contradict it
// on a state that satisfies ⟨C,C⟩ perfectly well, and this file is the reading that shows why.
//
// Drag lift8 with a solver accurate enough to stay near the family (conformalPHCurve's corrector),
// and poles appear that read HARD while ⟨C,C⟩ measures 9.5e-10. Evaluate the identity
// ‖q‖² = 2·W·c∞ AT each offending root, in complex arithmetic:
//
//     |z|    |⟨q,q⟩|    identity violation at z    Σ|terms| at z
//     2.12    5.9e-4           5.9e-4                  5.1e+7
//     3.32    3.0e-1           3.0e-1                  1.2e+10
//
// ⟨q,q⟩ IS the violation, to every digit. There is no signal in it. A residual measured on
// COEFFICIENTS controls nothing at |z| = 3.3, where z^16 is 1e8 — the same 1e-10 arrives as an
// absolute error of order one. So the soft/hard line cannot be a fixed ratio on the isotropy; it
// has to be |⟨q,q⟩| against the error ⟨q,q⟩ carries at that z.
//
// TWO THINGS THIS IS NOT. It is not a floor that reshapes a count: it only ever moves a reading
// from hard to soft, never the reverse, and `softBelow` still stands on its own. And it is not
// tuned — the number is the state's own residual, the one the figure already prints.
//
// The second mechanism, in the same option: a near-doubled root of W is LOCATED to about √residual,
// so a numerator below that cannot be told from a cancelling one. Measured on the same drag, two
// real roots with numerators 3.5e-6 and 2.0e-7 against √⟨C,C⟩ ≈ 6e-6 were being called hard —
// at a real root b = 0 exactly, so ⟨q,q⟩ = |a|² and the isotropy is 1 for ANY nonzero a, however
// tiny. No threshold on the isotropy could have caught those.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS, conformalAsRat } from '../../talks/ph-interpolation/poleLabPresets'
import { readPoles, conformalNullResidual } from '../poleReadout'
import { phRelativeResidual } from '../nurbsPH'

describe('the pole verdict carries the state’s error bar', () => {
  it('changes NOTHING on a specimen that is on its family', () => {
    // Every lab preset, both slides. The error bar is inert where the state is exact, which is the
    // whole of the lab at rest — so this cannot be quietly reshaping what the slides show.
    for (const p of PRESETS) {
      const rat = p.rat()
      const withBar = readPoles(rat, { residual: phRelativeResidual(rat) }).map((x) => x.verdict)
      expect(withBar, `${p.id}, projective`).toEqual(readPoles(rat).map((x) => x.verdict))
      if (p.conformal) {
        const cr = conformalAsRat(p.conformal)
        const cb = readPoles(cr, { residual: conformalNullResidual(p.conformal) }).map((x) => x.verdict)
        expect(cb, `${p.id}, Möbius`).toEqual(readPoles(cr).map((x) => x.verdict))
      }
    }
  })

  it('still calls a genuinely hard pole hard', () => {
    // The projective slide's whole point. A real error bar must not erase it.
    for (const id of ['hard4', 'hard3r', 'hard5r']) {
      const rat = PRESETS.find((p) => p.id === id)!.rat()
      const v = readPoles(rat, { residual: phRelativeResidual(rat) })
      expect(v.every((x) => x.verdict === 'hard'), `${id} is hard, error bar or not`).toBe(true)
      // and it is hard by MARGIN, not by luck: ⟨q,q⟩ is orders above its own noise.
      for (const x of v) {
        expect(Math.hypot(x.form.re, x.form.im), `${id}: ⟨q,q⟩ clears its noise`)
          .toBeGreaterThan(1e3 * Math.max(x.formNoise, 1e-300))
      }
    }
  })

  it('withholds where ⟨q,q⟩ is entirely the residual — the reading that motivated it', () => {
    // The mechanism, on a constructed state rather than a solver run so it cannot drift: take a
    // soft conformal member and read it as if the state were only known to 1e-9. Its poles sit
    // near the domain, so the bar is small and nothing changes; inflate the claimed residual and
    // the verdicts must go soft, never hard.
    const p = PRESETS.find((x) => x.id === 'soft6')!
    const rat = conformalAsRat(p.conformal!)
    const exact = readPoles(rat).map((x) => x.verdict)
    expect(exact.every((v) => v === 'soft')).toBe(true)
    const crude = readPoles(rat, { residual: 1e-2 })
    expect(crude.every((x) => x.verdict === 'soft' || x.verdict === 'below resolution'),
      'a crude state can only lose confidence, never gain a HARD reading').toBe(true)
  })

  it('loses confidence MONOTONELY as the claimed residual grows', () => {
    // The direction is the whole safety argument: a wider bar may only take a reading from hard to
    // soft, never the other way. Swept on the λ-chart quartic, whose ⟨q,q⟩ = 6.7e+1 at its one
    // real pole, against a bar that grows exactly linearly with the residual:
    //
    //     residual   1e-12    1e-8    1e-4    1e-2      1      1e+2
    //     bar        2.1e-10  2.1e-6  2.1e-2  2.1e+0   2.1e+2  2.1e+4
    //     verdict    hard     hard    hard    hard     soft    below resolution
    const rat = PRESETS.find((p) => p.id === 'hard4')!.rat()
    const rank: Record<string, number> = { hard: 3, soft: 2, 'below resolution': 1 }
    let previous = 4
    for (const r of [0, 1e-12, 1e-8, 1e-4, 1e-2, 1, 1e2, 1e4]) {
      const x = readPoles(rat, { residual: r })[0]
      const now = rank[x.verdict] ?? 0
      expect(now, `residual ${r}: confidence never goes back up`).toBeLessThanOrEqual(previous)
      previous = now
      if (r > 0) expect(x.formNoise, 'and the bar it was judged against is reported').toBeGreaterThan(0)
    }
    expect(readPoles(rat)[0].verdict, 'exact: hard').toBe('hard')
    expect(readPoles(rat, { residual: 1e-2 })[0].verdict, 'a bar of 2.1 against 67: still hard').toBe('hard')
    expect(readPoles(rat, { residual: 1 })[0].verdict, 'a bar of 210 against 67: no longer hard')
      .not.toBe('hard')
  })
})
