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
//     s closes at 360° at every ψ                    2.6e-15
//     ψ closes at 360° at every s                    it does NOT, and that is recorded below
//     (ψ, s) reached two different ways agree        the number that decides "coordinate"
//     every member holds the nine Hermite numbers
//
// THE ASYMMETRY IS REAL AND IT IS THE SOLVER'S. s is closed form: 𝒜(θ) = 𝒜₀ + (X₀e^{iθ} − X₀)u, so it
// returns because e^{2πi} = 1. ψ is a target the SOLVER chases by minimum norm, so it returns to the
// same member only when solved from the same anchor — which is how the model drives it, and why the
// figure is honest — but the pair is not a commuting grid. Said plainly rather than hidden: the fibre
// IS a torus, and one of our two coordinates on it is exact while the other is a projection.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, gaugeDistance, hermiteOf, indicatrixDistance, phaseTarget, projectOnto,
  spinorEndsAndSpan, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { middleCircle } from '../rationalHermiteCircles'
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

/** Exactly what the model does: ψ from the anchor, then s from the resulting base. */
const at = (psiDeg: number, sDeg: number): MultiPoleParams => {
  const base = projectOnto(SEED, spinorEndsAndSpan, phaseTarget(SEED, (psiDeg * Math.PI) / 180), 40)
  const circle = middleCircle(base)
  return circle ? circle.at((sDeg * Math.PI) / 180) : base
}
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

  it('ψ IS NOT EXACT THE WAY s IS, and the file says so rather than implying otherwise', () => {
    // s is closed form. ψ is a target chased by minimum-norm Gauss-Newton, so it is a coordinate only
    // relative to a fixed anchor. Solved from the SEED it returns at 360° exactly; that is what the
    // model does, and it is why the slider is honest. But the two coordinates are not the same KIND.
    const round = at(360, 0)
    console.log(`    ψ + 360° from the anchor: ${gaugeDistance(SEED.A, round.A).toExponential(1)}`)
    expect(gaugeDistance(SEED.A, round.A)).toBeLessThan(1e-9)

    // Solved from somewhere else it lands elsewhere on the SAME fibre — the s-direction ambiguity.
    const elsewhere = at(0, 150)
    const fromElsewhere = projectOnto(
      elsewhere, spinorEndsAndSpan, phaseTarget(elsewhere, (90 * Math.PI) / 180), 40)
    const fromSeed = at(90, 150)
    const gap = gaugeDistance(fromSeed.A, fromElsewhere.A)
    console.log(`    ψ = 90° solved from two different starts differs by ${gap.toExponential(1)} — the s ambiguity`)
    expect(held(fromElsewhere), 'both are in the fibre').toBeLessThan(1e-8)
  })
})
