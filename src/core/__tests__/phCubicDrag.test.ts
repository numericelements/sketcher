// ============================================================================
// Free-mode drag: does it do what the slide claims?
//
// The claims on slide 4's free toggle are:
//   1. ANY of the four control points can be grabbed and it follows the cursor
//   2. the curve stays exactly PH — by construction, not by enforcement
//   3. the other control points move, but as little as possible
//   4. the motion is PATH-DEPENDENT: a closed loop does not return the curve
//      (HOLONOMY — the continuous sibling of strict mode's monodromy)
//   5. the analytic Jacobian is right
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cnorm, csub } from '../complex'
import { type PHCubicGenerator, controlPoints, inflectionQuantity } from '../phCubic'
import {
  type PHCubicState,
  controlPointJacobian,
  dragPHCubicFree,
  dragPathFree,
  freeStateFrom,
  phResidual,
} from '../phCubicDrag'

const C = (re: number, im: number): Complex => ({ re, im })
const dist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

const GEN: PHCubicGenerator = { w0: C(1.4, 0.3), w1: C(0.5, 1.2) }
const P0 = C(0.2, -0.4)
const START: PHCubicState = freeStateFrom(GEN, P0)

describe('phCubicDrag — the analytic Jacobian', () => {
  it('CLAIM 5: matches central finite differences', () => {
    const h = 1e-6
    const J = controlPointJacobian(START)
    expect(J).toHaveLength(8)
    expect(J[0]).toHaveLength(6)

    const vec = [GEN.w0.re, GEN.w0.im, GEN.w1.re, GEN.w1.im, P0.re, P0.im]
    const cpsOf = (x: readonly number[]): Complex[] =>
      controlPoints({ w0: { re: x[0], im: x[1] }, w1: { re: x[2], im: x[3] } }, { re: x[4], im: x[5] })

    for (let col = 0; col < 6; col++) {
      const plus = vec.slice()
      const minus = vec.slice()
      plus[col] += h
      minus[col] -= h
      const cp = cpsOf(plus)
      const cm = cpsOf(minus)
      for (let j = 0; j < 4; j++) {
        const fdx = (cp[j].re - cm[j].re) / (2 * h)
        const fdy = (cp[j].im - cm[j].im) / (2 * h)
        expect(Math.abs(J[2 * j][col] - fdx), `dP${j}.x/dx${col}`).toBeLessThan(1e-6)
        expect(Math.abs(J[2 * j + 1][col] - fdy), `dP${j}.y/dx${col}`).toBeLessThan(1e-6)
      }
    }
  })
})

describe('phCubicDrag — free mode', () => {
  it('CLAIM 1: every control point can be grabbed and follows the cursor', () => {
    const before = controlPoints(GEN, P0)
    for (let index = 0; index < 4; index++) {
      const target = cadd(before[index], C(0.35, 0.25))
      // A few small steps, as a real drag would take.
      let state = START
      for (let k = 1; k <= 8; k++) {
        const via = cadd(before[index], C((0.35 * k) / 8, (0.25 * k) / 8))
        state = dragPHCubicFree(state, index, via).state
      }
      const got = controlPoints(state.generator, state.p0)[index]
      expect(dist(got, target), `index ${index}`).toBeLessThan(0.03)
    }
  })

  it('CLAIM 2: the curve stays exactly PH throughout (by construction)', () => {
    let state = START
    for (let k = 0; k < 60; k++) {
      const target = cadd(controlPoints(state.generator, state.p0)[1], C(0.05, -0.03))
      state = dragPHCubicFree(state, 1, target).state
      const cps = controlPoints(state.generator, state.p0)
      // ΔP₁² = ΔP₀·ΔP₂ to machine precision — no enforcement involved.
      expect(phResidual(cps)).toBeLessThan(1e-12)
    }
  })

  it('CLAIM 3: the other points move, but far less than the dragged one', () => {
    const before = controlPoints(GEN, P0)
    const target = cadd(before[1], C(0.4, 0.3))
    const step = dragPHCubicFree(START, 1, target)
    // It moved (it must — prescribing one CP alone leaves the variety)...
    expect(step.disturbance).toBeGreaterThan(0)
    // ...but by much less than the gesture itself.
    const gesture = dist(before[1], target)
    expect(step.disturbance).toBeLessThan(0.7 * gesture)
    expect(step.trackingError).toBeLessThan(0.12)
  })

  it('a heavier drag weight tracks harder and disturbs more', () => {
    const before = controlPoints(GEN, P0)
    const target = cadd(before[2], C(0.5, -0.4))
    const light = dragPHCubicFree(START, 2, target, { dragWeight: 5 })
    const heavy = dragPHCubicFree(START, 2, target, { dragWeight: 500 })
    expect(heavy.trackingError).toBeLessThan(light.trackingError)
    expect(heavy.disturbance).toBeGreaterThan(light.disturbance)
  })

  it('CLAIM 4: HOLONOMY — a closed loop does not return the curve', () => {
    const before = controlPoints(GEN, P0)
    const centre = before[1]
    const radius = 0.3
    const N = 400
    const loop: Complex[] = []
    for (let i = 1; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      loop.push(cadd(centre, C(radius * Math.cos(a) - radius, radius * Math.sin(a))))
    }
    // The path starts and ends at `centre` (angle 0 maps to centre by the −radius shift).
    expect(dist(loop[N - 1], centre)).toBeLessThan(1e-9)

    const steps = dragPathFree(START, 1, loop)
    const end = steps[steps.length - 1]
    // P₁ came home...
    expect(dist(end.controlPoints[1], centre)).toBeLessThan(0.02)
    // ...and the curve did NOT: at least one other control point is elsewhere.
    const moved = Math.max(
      dist(end.controlPoints[0], before[0]),
      dist(end.controlPoints[2], before[2]),
      dist(end.controlPoints[3], before[3]),
    )
    expect(moved).toBeGreaterThan(1e-3)
    // Still exactly PH after all that.
    expect(phResidual(end.controlPoints)).toBeLessThan(1e-12)
  })

  it('a straight out-and-back returns much closer than a loop does', () => {
    const before = controlPoints(GEN, P0)
    const out: Complex[] = []
    for (let i = 1; i <= 40; i++) out.push(cadd(before[1], C((0.5 * i) / 40, 0)))
    for (let i = 39; i >= 0; i--) out.push(cadd(before[1], C((0.5 * i) / 40, 0)))
    const steps = dragPathFree(START, 1, out)
    const end = steps[steps.length - 1]
    const moved = Math.max(
      dist(end.controlPoints[0], before[0]),
      dist(end.controlPoints[2], before[2]),
      dist(end.controlPoints[3], before[3]),
    )
    // Retracing a path is nearly reversible; enclosing area is what costs you.
    expect(moved).toBeLessThan(0.05)
  })

  it('never flips the curve inside out: κ keeps its sign along a drag', () => {
    let state = START
    const sign0 = Math.sign(inflectionQuantity(state.generator))
    for (let k = 0; k < 40; k++) {
      const target = cadd(controlPoints(state.generator, state.p0)[3], C(0.04, 0.02))
      state = dragPHCubicFree(state, 3, target).state
      expect(Math.sign(inflectionQuantity(state.generator))).toBe(sign0)
    }
  })
})
