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

  it('WHAT THE SPHERE FORGETS is μ — the speed profile, and it is not a small thing', () => {
    // The lesson of the figure, and the reason "the sphere does not move" is the weak way to say it. Every
    // member points in the SAME direction at every parameter, yet these are different curves in space with
    // different speed distributions. ‖r′‖ = 2|μ|σ/α², so μ is exactly the information the indicatrix drops.
    for (const s of [0, 0.5, 1.5]) {
      const m = mix(s)
      const profile = Array.from({ length: 11 }, (_, i) => speedAt(m, i / 10))
      let arc = 0
      const M = 20000
      for (let i = 0; i < M; i++) arc += speedAt(m, (i + 0.5) / M) / M
      console.log(
        `    s = ${String(s).padStart(4)}:  ‖r′‖ across [0,1] ${profile.map((v) => v.toFixed(3)).join(' ')}` +
          `\n              max/min ${(Math.max(...profile) / Math.min(...profile)).toFixed(2)},` +
          ` arc length ${arc.toFixed(5)}`,
      )
    }
    // s = 0 slows down (0.100 → 0.058), s = 0.5 is nearly uniform, s = 1.5 speeds up (0.100 → 0.233).
    expect(speedAt(mix(0), 1)).toBeLessThan(speedAt(mix(0), 0))
    expect(speedAt(mix(1.5), 1)).toBeGreaterThan(speedAt(mix(1.5), 0))

    // And they are genuinely different PATHS, not one path reparametrised: if they were the same point set,
    // every point of one would lie ON the other.
    const a = mix(0)
    const b = mix(1.5)
    let worst = 0
    for (let i = 0; i <= 40; i++) {
      const p = curveAt(a, i / 40)
      let best = Infinity
      for (let j = 0; j <= 2000; j++) {
        const q = curveAt(b, j / 2000)
        best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z))
      }
      worst = Math.max(worst, best)
    }
    console.log(
      `    worst distance from a point of mix(0) to the WHOLE image of mix(1.5) = ${worst.toExponential(2)}` +
        `\n    → different paths in space, not a reparametrisation. Same directions, different curves.`,
    )
    expect(worst, 'not the same point set').toBeGreaterThan(1e-3)
  })
})
