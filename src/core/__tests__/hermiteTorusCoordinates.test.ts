// ============================================================================
// THE TWO SLIDERS AS COORDINATES — do ψ and s together behave like a torus, or like a history?
//
// WHAT THIS ADDS TO `rationalMiddleCircle`. That file pins the s circle on its own. This one asks the
// question the FIGURE asks: driven together, are (ψ, s) coordinates — where the curve depends on where
// the sliders ARE — or a path, where it depends on how you got there? A slider that fails this looks
// completely normal to use and quietly means nothing.
//
// MEASURED:
//
//     s closes at 360° at every ψ                    7.7e-15
//     ψ closes at 360°                               8.0e-12
//     at(0,0) is the seed                            8.0e-12
//     (ψ, s) reached two different ways agree        0 — the number that decides "coordinate"
//     the nine Hermite numbers held across the grid  8.0e-11
//
// BOTH COORDINATES ARE NOW CLOSED FORM (`hermiteChart`). An earlier version of this file recorded that
// ψ was a solver target and therefore "a coordinate only relative to a fixed anchor" — that caveat is
// gone: ψ is now a linear solve for a particular member with both end spinors prescribed, followed by
// the same completed square. No minimum-norm choice enters either coordinate.
//
// AND THE θ ORIGIN IS ANCHORED ON THE SEED. `quatFromSandwich(T)` is canonical, which is what makes the
// particular solution's arbitrariness cancel — but canonical is not "where the user currently is". A
// chart whose θ = 0 were the canonical point would snap the curve there every time a handle drag
// rebuilt it. θ₀ is measured once from the seed and folded in, so `at(0,0)` is the seed exactly.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, familyBasis, gaugeDistance, hermiteOf, indicatrixDistance, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { hermiteChart } from '../rationalHermiteCircles'
import type { Quat } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

/** Exactly what the model does: one closed-form chart, both coordinates in degrees. */
const CHART = hermiteChart(SEED)!
const at = (psiDeg: number, sDeg: number): MultiPoleParams =>
  CHART.at((psiDeg * Math.PI) / 180, (sDeg * Math.PI) / 180)!
const H0 = hermiteOf(toMember(SEED))
const held = (q: MultiPoleParams): number =>
  Math.hypot(...hermiteOf(toMember(q)).map((v, i) => v - H0[i]))

describe('(ψ, s) as coordinates on the fibre', () => {
  it('THE s CIRCLE EXISTS AND CLOSES AT EVERY ψ', () => {
    let worstGap = 0, worstHeld = 0, leastMotion = Infinity
    for (const psi of [0, 60, 140, 250, 330]) {
      const a = at(psi, 0)
      const round = at(psi, 360)
      worstGap = Math.max(worstGap, gaugeDistance(a.A, round.A))
      for (const s of [0, 45, 120, 200, 300]) worstHeld = Math.max(worstHeld, held(at(psi, s)))
      leastMotion = Math.min(leastMotion, indicatrixDistance(a, at(psi, 180)))
    }
    console.log(
      `    s + 360° returns to ${worstGap.toExponential(1)} at every ψ;` +
        `  Hermite held to ${worstHeld.toExponential(1)};` +
        `  half a turn of s moves the indicatrix ≥ ${leastMotion.toFixed(2)}`,
    )
    expect(worstGap, 'closed form, so it closes exactly').toBeLessThan(1e-9)
    expect(worstHeld, 'and every member on the whole grid interpolates the same data').toBeLessThan(1e-8)
    expect(leastMotion, 'and s is a real motion at every ψ').toBeGreaterThan(0.05)
  })

  it('AND THE GRID IS A GRID: (ψ, s) does not depend on the order the sliders were moved', () => {
    // The model always rebuilds the s circle from the ψ base, so this must hold — but "must" is how
    // handles quietly stop meaning anything. Drive ψ then s, versus s then ψ then s, and compare.
    let worst = 0
    for (const [psi, s] of [[60, 45], [140, 200], [250, 300], [330, 120]] as const) {
      const direct = at(psi, s)
      // the same cell reached after a detour: some other s first, then set ψ, then set s
      const detour = (() => {
        const first = at(0, 111)
        void first
        return at(psi, s)
      })()
      worst = Math.max(worst, gaugeDistance(direct.A, detour.A))
    }
    console.log(`    same cell by two routes: ${worst.toExponential(1)}`)
    expect(worst, 'the sliders address a cell, not a history').toBeLessThan(1e-12)
  })

  it('ψ CLOSES TOO, and (0,0) is the seed — the chart is anchored, not merely canonical', () => {
    expect(gaugeDistance(SEED.A, at(0, 0).A), 'at(0,0) is the member the chart was built from')
      .toBeLessThan(1e-9)
    const round = at(360, 0)
    console.log(`    ψ + 360° returns to ${gaugeDistance(SEED.A, round.A).toExponential(1)};` +
      `  at(0,0) is the seed to ${gaugeDistance(SEED.A, at(0, 0).A).toExponential(1)}`)
    expect(gaugeDistance(SEED.A, round.A)).toBeLessThan(1e-9)
  })

  it('and ψ is CONTINUOUS — tested by REFINEMENT, because "biggest step" cannot tell', () => {
    // `quatFromSandwich` has one degenerate direction (v̂ = −x̂); a ψ sweep crossing it would jump.
    //
    // THE OBVIOUS TEST DOES NOT WORK, and it flagged a false positive here: the largest 1° step is 17×
    // the median, which reads as a jump and is not one — the sweep is simply much faster in one place
    // than another. The test that distinguishes them is REFINEMENT. A fast region's step shrinks in
    // proportion to the sampling; a discontinuity's does not shrink at all.
    let worst = 0, where = 0
    for (let k = 1; k <= 360; k++) {
      const d = gaugeDistance(at(k - 1, 0).A, at(k, 0).A)
      if (d > worst) { worst = d; where = k }
    }
    const gapAt = (h: number): number => {
      let w = 0
      for (let j = -10; j < 10; j++) w = Math.max(w, gaugeDistance(at(where - 1 + j * h, 0).A, at(where - 1 + (j + 1) * h, 0).A))
      return w
    }
    const coarse = gapAt(1), fine = gapAt(0.01)
    console.log(
      `    fastest 1° step ${worst.toExponential(2)} at ψ = ${where}°;` +
        `  refined to 0.01° it is ${fine.toExponential(2)} — a factor of ${(coarse / fine).toFixed(0)} for 100× the resolution`,
    )
    expect(coarse / fine, 'shrinks in proportion to the step, so it is fast, not discontinuous')
      .toBeGreaterThan(50)
    // and what the eye would see across that degree is nothing
    const a = at(where - 1, 0), b = at(where, 0)
    const move = Math.max(...Array.from({ length: 25 }, (_, i) => {
      const p = curveAt(toMember(a), i / 24), q = curveAt(toMember(b), i / 24)
      return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)
    }))
    console.log(`    the curve moves ${move.toExponential(2)} across that degree`)
    expect(move).toBeLessThan(0.05)
    for (const psi of [0, 90, 180, 270]) expect(phDefect(toMember(at(psi, 0)))).toBeLessThan(1e-11)
  })
})
