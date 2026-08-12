// ============================================================================
// THE FAMILY OVER ONE INDICATRIX — the numbers the figure puts on screen.
//
// One claim, and it is the whole figure: dialling `s` changes the CURVE and leaves the SPHERE alone. So the
// test measures both halves — the curve has to move a lot, and the indicatrix must not move at all.
// ============================================================================
import { describe, expect, it } from 'vitest'
import {
  curveAt,
  indicatrixDrift,
  mix,
  muFloorOn01,
  phDefect,
  speedAt,
  stationaryOn01,
} from '../rationalPHCubicFamily'
import { curveAt as publishedAt } from '../rationalPHCubic'

describe('the family over one indicatrix', () => {
  it('s = 0 is exactly the published rational PH cubic', () => {
    const m = mix(0)
    let worst = 0
    for (let i = 0; i <= 40; i++) {
      const t = -2 + (4 * i) / 40
      const a = curveAt(m, t)
      const b = publishedAt(t)
      worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z))
    }
    console.log(`    degree ${m.degree};  worst |mix(0) − published| over t ∈ [−2, 2] = ${worst.toExponential(1)}`)
    expect(m.degree).toBe(3)
    expect(worst).toBeLessThan(1e-15)
  })

  it('the curve MOVES and stays PH, while the indicatrix does not move at all', () => {
    const base = mix(0)
    for (const s of [-0.15, 0, 0.25, 0.6, 1.5]) {
      const m = mix(s)
      let moved = 0
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const a = curveAt(base, t)
        const b = curveAt(m, t)
        moved = Math.max(moved, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z))
      }
      const { drift, skipped } = indicatrixDrift(m)
      console.log(
        `    s = ${String(s).padStart(5)}:  degree ${m.degree}` +
          `   curve moves ${moved.toExponential(2)}   indicatrix drift ${drift.toExponential(1)}` +
          `   PH defect ${phDefect(m).toExponential(1)}` +
          `   μ floor on [0,1] ${muFloorOn01(m).toFixed(4)}` +
          `${skipped ? `  (${skipped} samples near μ = 0)` : ''}`,
      )
      expect(drift, 'the sphere picture is frozen').toBeLessThan(1e-6)
      expect(phDefect(m), 'and every member is still PH').toBeLessThan(1e-6)
      if (s !== 0) {
        expect(m.degree, 'any nonzero mix is a genuine sextic').toBe(6)
        expect(moved, 'and the curve genuinely changes').toBeGreaterThan(1e-3)
      }
    }
  })

  it('a stationary point enters [0,1] at s = −1/2, MEASURED not derived, and is reported not hidden', () => {
    // μ(t) = 1/120 + s(0.0125·t + 0.0041667·t³) after the normalisations, so μ first vanishes at t = 1 when
    // s = −(1/120)/(0.0125 + 0.0041667) = −1/2, and the zero walks inward as s drops further. The tidy
    // "−1/4" the raw basis suggests is wrong because pinning r(0) = 0 and matching the published scale both
    // rescale μ — which is exactly why this threshold is measured here rather than reasoned about.
    for (const s of [-0.45, -0.55, -1, -10]) {
      const m = mix(s)
      const stops = stationaryOn01(m)
      console.log(
        `    s = ${String(s).padStart(5)}:  μ floor ${muFloorOn01(m).toFixed(5)},` +
          ` stationary points in [0,1]: ${stops.length ? stops.map((t) => t.toFixed(4)).join(', ') : 'none'}` +
          `${stops.length ? `   ‖r′‖ there = ${speedAt(m, stops[0]).toExponential(1)}` : ''}`,
      )
      if (s > -0.5) expect(stops.length, 'above the threshold the curve is regular on [0,1]').toBe(0)
      if (s < -0.5) {
        expect(stops.length).toBeGreaterThan(0)
        expect(speedAt(m, stops[0]), 'the curve really does stop there').toBeLessThan(1e-9)
      }
    }
  })
})
