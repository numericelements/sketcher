// ============================================================================
// THE DEGREE-6 HERMITE FIBRE IS FIBRED IN CIRCLES OVER A CIRCLE — both coordinates close.
//
// THE PROBLEM THE SLIDE RAN INTO. The degree-6 C¹ Hermite fibre is 2-dimensional, and the obvious
// slider — "walk along a fibre tangent direction, holding the data" — DOES NOT COME HOME. Measured at
// stride 0.05, 0.12 and 0.25: 400 steps, no return, gauge gap running to 6–16.
//
// AND THAT IS THE GEOMETRY, NOT A BUG, which the control settles. Run the same walk on the POLYNOMIAL
// QUINTIC, whose Hermite fibre is a provable torus (three Hopf circles mod the diagonal gauge,
// `spatialQuinticTorus.test.ts`), and it behaves identically — 400 steps, no return. On a 2-torus a
// generic direction winds forever without closing. There was never a full turn to find.
//
// A WRONG ALARM ALONG THE WAY, recorded because it nearly cost a day. |𝒜| grows 3.12 → 18.65 along that
// walk, which looked like an escape from a compact fibre. It is not: the walk holds all nine Hermite
// numbers to 6e-14 and the closed form's own invariant |Y|² = |T| EXACTLY at every step. |T| is not
// constant — it depends on the phase difference of the two end spinors, which is precisely one of the
// torus coordinates — and the monomial coefficients amplify what the Bernstein ones do (|B₁| only goes
// 2.52 → 5.61). The norm of the monomial spinor is a bad proxy for position on the torus.
//
// THE WAY OUT IS TO USE THE CIRCLES THE HOPF MAP ALREADY GIVES.
//
//     c′(0) = 𝒜(0) i 𝒜(0)*/w(0)²    ⟹  𝒜(0) is free on a circle over c′(0)
//     c′(1) = 𝒜(1) i 𝒜(1)*/w(1)²    ⟹  so is 𝒜(1)
//
// Pin 𝒜(0) EXACTLY — that spends the global gauge, since 𝒜 ↦ 𝒜e^{iθ} moves 𝒜(0) — and the phase of
// 𝒜(1) against it becomes a genuine circle coordinate. Eleven conditions (𝒜(0), 𝒜(1), the span) against
// a 12-dimensional fibre leave ONE dimension, and one-dimensional fibres are what `fiberClosure` is
// verified to close (`fiberClosure.test.ts`).
//
// MEASURED:
//
//     slider ψ    the phase of 𝒜(1)     returns to 2.4e-16 at 2π — BY CONSTRUCTION, not by luck: the
//                 target at 2π is literally the target at 0. The nine Hermite numbers are held to
//                 5.6e-13 all the way round, and the indicatrix moves at least 1.74 on a unit sphere,
//                 so it is a real motion and not a re-labelling of the same curve.
//
//     slider s    the leftover loop     CLOSES. On the polynomial-quintic control — its third Hopf
//                 circle — 648 steps at stride 0.2, gap 2.0e-10. AND ON THE RATIONAL SEXTIC:
//                 2180 steps at stride 0.1, gap 1.7e-9, travel 218. It is simply a LONG loop, which
//                 is why 900 steps looked like a failure to close (it was reported as "longer than we
//                 have walked" before the longer walk was run — the honest hedge, and it paid).
//
// SO THE FIBRE IS A CIRCLE BUNDLE OVER A CIRCLE: ψ closes, and the fibre of ψ closes. That is a torus
// or a Klein bottle, and on the polynomial control the same structure IS the classical torus (three
// Hopf circles mod the diagonal gauge). Orientability is not measured here, so this file says "fibred
// in circles over a circle" and stops there — §8's torus question is answered as far as the numbers go
// and no further.
//
// WHAT THE FIGURE CAN AFFORD IS A SEPARATE MATTER. The s loop takes 109 s to walk, so the slide
// precomputes a bounded ROAD along it rather than the whole circle. The loop is real; driving all of
// it live is not affordable.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, fiberClosure, gaugeDistance, hermiteOf, indicatrixDistance, phaseRotate, phaseTarget,
  projectOnto, spinorAt, spinorEndsAndSpan, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const BASE: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
const SEED: MultiPoleParams = (() => {
  const B = familyBasis(BASE)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...BASE, A: unpackSpinor(x) }
})()

/** The polynomial PH quintic seed — the control whose Hermite fibre is a provable torus. */
function polynomialQuintic(): MultiPoleParams {
  const base: MultiPoleParams = {
    A: Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 })), roots: [], lambdas: [],
  }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 12; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}

const atPhase = (psi: number): MultiPoleParams =>
  projectOnto(SEED, spinorEndsAndSpan, phaseTarget(SEED, psi), 40)
const held = (q: MultiPoleParams): number => {
  const h0 = hermiteOf(toMember(SEED))
  return Math.hypot(...hermiteOf(toMember(q)).map((v, i) => v - h0[i]))
}

describe('the two degree-6 fibre circles', () => {
  it('THE READOUT: eleven conditions against a fibre of twelve leaves ONE dimension', () => {
    expect(familyBasis(SEED).length).toBe(12)
    expect(spinorEndsAndSpan(toMember(SEED), SEED).length).toBe(11)
    expect(12 - 11).toBe(1)
    // and the gauge is SPENT by pinning 𝒜(0): rotating 𝒜 changes the readout, so it is not a
    // leftover dimension the way it is for a readout of the curve alone.
    const rotated: MultiPoleParams = { ...SEED, A: SEED.A.map((q) => phaseRotate(q, 0.7)) }
    const a = spinorEndsAndSpan(toMember(SEED), SEED)
    const b = spinorEndsAndSpan(toMember(rotated), rotated)
    expect(Math.hypot(...a.map((v, i) => v - b[i]))).toBeGreaterThan(0.1)
    // while the CURVE is untouched by it — that is what makes it a gauge in the first place
    expect(gaugeDistance(SEED.A, rotated.A)).toBeLessThan(1e-12)
  })

  it('SLIDER ψ IS A CIRCLE: it returns exactly at 2π, and holds the Hermite data all the way', () => {
    const start = atPhase(0)
    expect(gaugeDistance(SEED.A, start.A)).toBeLessThan(1e-10)

    let worstHeld = 0, leastMotion = Infinity
    for (let k = 1; k < 8; k++) {
      const psi = (2 * Math.PI * k) / 8
      const q = atPhase(psi)
      worstHeld = Math.max(worstHeld, held(q))
      leastMotion = Math.min(leastMotion, indicatrixDistance(SEED, q))
    }
    const round = atPhase(2 * Math.PI)
    const gap = gaugeDistance(SEED.A, round.A)
    console.log(
      `    ψ + 2π returns to ${gap.toExponential(1)};  Hermite held to ${worstHeld.toExponential(1)};` +
        `  smallest indicatrix motion en route ${leastMotion.toFixed(2)} on a unit sphere`,
    )
    expect(gap, 'the slider comes home — by construction, since the target at 2π is the target at 0')
      .toBeLessThan(1e-10)
    expect(worstHeld, 'and every member on it interpolates the same C¹ Hermite data').toBeLessThan(1e-9)
    expect(leastMotion, 'it is a real motion, not a re-labelling of the same curve').toBeGreaterThan(0.5)
  }, 60_000)

  it('SLIDER s CLOSES on the control — the polynomial quintic third Hopf circle', () => {
    // The rational sextic's own loop closes too, but it takes 2180 steps and 109 s, which is too slow
    // for the suite. It is pinned in the skipped test below, verbatim, so the recipe is not lost.
    const quintic = polynomialQuintic()
    const control = fiberClosure(quintic, { stride: 0.2, maxSteps: 900, readout: spinorEndsAndSpan })
    console.log(
      `    CONTROL, polynomial quintic: ${control.loop.length} steps, closed=${control.closed},` +
        ` gap ${control.gap.toExponential(1)}`,
    )
    expect(control.closed, 'the known torus third circle closes').toBe(true)
    expect(control.gap).toBeLessThan(1e-8)

    // A SHORT walk on the rational side, purely to pin that the road stays in the Hermite fibre. It
    // does not close within 600 steps and is not expected to — the loop is 2180 steps long.
    const rational = fiberClosure(SEED, { stride: 0.05, maxSteps: 600, readout: spinorEndsAndSpan })
    console.log(
      `    rational sextic: ${rational.loop.length} steps, closed=${rational.closed},` +
        ` gap ${rational.gap.toExponential(1)},` +
        ` indicatrix ${indicatrixDistance(rational.loop[0], rational.loop[rational.loop.length - 1]).toExponential(1)}`,
    )
    // whatever it does, every member on it interpolates the same C¹ Hermite data — that much is pinned
    let worst = 0
    for (const q of rational.loop) worst = Math.max(worst, held(q))
    expect(worst, 'the whole road stays in the Hermite fibre').toBeLessThan(1e-8)
  }, 300_000)

  it('CONTROL: the raw 9-condition walk does NOT close — and neither does it on the known torus', () => {
    // Kept as a test rather than a comment because it is the reason the sliders are defined the way
    // they are. If some future change made this walk close, the two-circle construction would be
    // unnecessary and someone should find out from a green test rather than by guessing.
    const rational = fiberClosure(SEED, { stride: 0.05, maxSteps: 300, readout: hermiteOf })
    expect(rational.closed).toBe(false)

    const quintic = polynomialQuintic()
    const polynomial = fiberClosure(quintic, { stride: 0.05, maxSteps: 300, readout: hermiteOf })
    console.log(
      `    rational sextic: closed=${rational.closed}, gap ${rational.gap.toExponential(1)};` +
        `  polynomial quintic (KNOWN TORUS): closed=${polynomial.closed}, gap ${polynomial.gap.toExponential(1)}`,
    )
    expect(polynomial.closed, 'a generic direction on a 2-torus winds forever — the control agrees')
      .toBe(false)
  }, 120_000)

  it('and 𝒜(1) really does stay on its Hopf circle: |𝒜(1)| is fixed around the ψ slider', () => {
    const n0 = (() => { const a = spinorAt(SEED.A, 1); return Math.hypot(a.u, a.v, a.p, a.q) })()
    let worst = 0
    for (let k = 0; k <= 8; k++) {
      const a = spinorAt(atPhase((2 * Math.PI * k) / 8).A, 1)
      worst = Math.max(worst, Math.abs(Math.hypot(a.u, a.v, a.p, a.q) - n0) / n0)
    }
    expect(worst).toBeLessThan(1e-10)
  }, 60_000)
})

// ---------------------------------------------------------------------------------------------
// THE LONG ONE. 109 s, so it does not run in the suite — but it is the measurement that answered
// §8, and a comment is not a recipe. Un-skip to re-check:
//
//     stride 0.1: 2180 steps  closed=true  gap 1.7e-9  travel 218
//
// Nothing about it is delicate: the same walk, the same readout, just enough steps to get round.
// ---------------------------------------------------------------------------------------------
describe('the rational leftover, walked all the way round', () => {
  it.skip('closes after 2180 steps', () => {
    const { loop, gap, closed } = fiberClosure(SEED, {
      stride: 0.1, maxSteps: 3000, readout: spinorEndsAndSpan,
    })
    expect(closed).toBe(true)
    expect(gap).toBeLessThan(1e-8)
    expect(loop.length).toBeGreaterThan(2000)
    expect(indicatrixDistance(loop[0], loop[loop.length - 1])).toBeLessThan(1e-8)
  }, 900_000)
})
