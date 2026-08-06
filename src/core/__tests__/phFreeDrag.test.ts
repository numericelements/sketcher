// ============================================================================
// The any-degree free drag, exercised at QUINTIC degree (m = 2).
//
// The cubic case is already covered by phCubicDrag.test.ts, which now runs through
// this same implementation — so those eight tests plus these are the validation.
// What is new here is that the general Bernstein-square algebra reproduces the
// hand-derived quintic formulas, and that the drag behaves at 8 DOF the way it did
// at 6.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul, cnorm, cscale, csub } from '../complex'
import { controlPoints as quinticControlPoints, type PHQuinticGenerator } from '../phQuinticHermite'
import {
  type PHFreeState,
  bernsteinSquare,
  dragPHFree,
  dragPathPHFree,
  freeControlPointJacobian,
  freeControlPoints,
  generatorLegs,
  phPolygonResidual,
} from '../phFreeDrag'

const C = (re: number, im: number): Complex => ({ re, im })
const dist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

const GEN: PHQuinticGenerator = { w0: C(1.3, 0.4), w1: C(-0.2, 1.1), w2: C(0.9, -0.7) }
const W = [GEN.w0, GEN.w1, GEN.w2]
const P0 = C(0.15, -0.35)
const START: PHFreeState = { generator: W, p0: P0 }

describe('phFreeDrag — the general algebra reproduces the hand-derived formulas', () => {
  it('bernsteinSquare at m=2 gives (w₀², w₀w₁, (2w₁²+w₀w₂)/3, w₁w₂, w₂²)', () => {
    const got = bernsteinSquare(W)
    const expected = [
      cmul(GEN.w0, GEN.w0),
      cmul(GEN.w0, GEN.w1),
      cscale(cadd(cscale(cmul(GEN.w1, GEN.w1), 2), cmul(GEN.w0, GEN.w2)), 1 / 3),
      cmul(GEN.w1, GEN.w2),
      cmul(GEN.w2, GEN.w2),
    ]
    expect(got).toHaveLength(5)
    for (let i = 0; i < 5; i++) expect(dist(got[i], expected[i])).toBeLessThan(1e-13)
  })

  it('bernsteinSquare at m=1 gives (w₀², w₀w₁, w₁²)', () => {
    const w = [C(1.7, -0.4), C(0.3, 1.1)]
    const got = bernsteinSquare(w)
    expect(got).toHaveLength(3)
    expect(dist(got[0], cmul(w[0], w[0]))).toBeLessThan(1e-13)
    expect(dist(got[1], cmul(w[0], w[1]))).toBeLessThan(1e-13)
    expect(dist(got[2], cmul(w[1], w[1]))).toBeLessThan(1e-13)
  })

  it('freeControlPoints agrees with the quintic module', () => {
    const general = freeControlPoints(START)
    const specific = quinticControlPoints(GEN, P0)
    expect(general).toHaveLength(6)
    for (let i = 0; i < 6; i++) expect(dist(general[i], specific[i])).toBeLessThan(1e-13)
  })

  it('legs sum to the end-to-end displacement', () => {
    const cps = freeControlPoints(START)
    const summed = generatorLegs(W).reduce((a, b) => cadd(a, b), C(0, 0))
    expect(dist(cadd(P0, summed), cps[5])).toBeLessThan(1e-13)
  })

  it('the 12×8 Jacobian matches central finite differences', () => {
    const h = 1e-6
    const J = freeControlPointJacobian(START)
    expect(J).toHaveLength(12)
    expect(J[0]).toHaveLength(8)

    const vec = [...W.flatMap((z) => [z.re, z.im]), P0.re, P0.im]
    const cpsOf = (x: readonly number[]): Complex[] =>
      freeControlPoints({
        generator: [0, 1, 2].map((k) => ({ re: x[2 * k], im: x[2 * k + 1] })),
        p0: { re: x[6], im: x[7] },
      })

    for (let col = 0; col < 8; col++) {
      const plus = vec.slice()
      const minus = vec.slice()
      plus[col] += h
      minus[col] -= h
      const cp = cpsOf(plus)
      const cm = cpsOf(minus)
      for (let j = 0; j < 6; j++) {
        expect(Math.abs(J[2 * j][col] - (cp[j].re - cm[j].re) / (2 * h)), `dP${j}.x/dx${col}`).toBeLessThan(1e-6)
        expect(Math.abs(J[2 * j + 1][col] - (cp[j].im - cm[j].im) / (2 * h)), `dP${j}.y/dx${col}`).toBeLessThan(1e-6)
      }
    }
  })
})

describe('phFreeDrag — dragging a quintic', () => {
  it('every one of the six control points can be grabbed and tracks the cursor', () => {
    const before = freeControlPoints(START)
    for (let index = 0; index < 6; index++) {
      let state = START
      for (let k = 1; k <= 8; k++) {
        state = dragPHFree(state, index, cadd(before[index], C((0.3 * k) / 8, (0.22 * k) / 8))).state
      }
      const got = freeControlPoints(state)[index]
      expect(dist(got, cadd(before[index], C(0.3, 0.22))), `index ${index}`).toBeLessThan(0.03)
    }
  })

  it('stays exactly PH throughout — judged from the polygon alone', () => {
    let state = START
    for (let k = 0; k < 50; k++) {
      const target = cadd(freeControlPoints(state)[2], C(0.04, -0.02))
      state = dragPHFree(state, 2, target).state
      expect(phPolygonResidual(freeControlPoints(state))).toBeLessThan(1e-9)
    }
  })

  it('phPolygonResidual detects a NON-PH polygon (it is not vacuous)', () => {
    const cps = freeControlPoints(START)
    expect(phPolygonResidual(cps)).toBeLessThan(1e-10)
    // Nudge one derived control point off the manifold.
    const broken = cps.map((p, i) => (i === 3 ? cadd(p, C(0.2, 0.1)) : p))
    expect(phPolygonResidual(broken)).toBeGreaterThan(1e-3)
  })

  it('the others move, but less than the gesture', () => {
    const before = freeControlPoints(START)
    const target = cadd(before[2], C(0.4, 0.3))
    const step = dragPHFree(START, 2, target)
    expect(step.disturbance).toBeGreaterThan(0)
    expect(step.disturbance).toBeLessThan(dist(before[2], target))
    expect(step.trackingError).toBeLessThan(0.12)
  })

  it('HOLONOMY at quintic degree too: a closed loop does not return the curve', () => {
    const before = freeControlPoints(START)
    const centre = before[2]
    const radius = 0.25
    const N = 400
    const loop: Complex[] = []
    for (let i = 1; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      loop.push(cadd(centre, C(radius * Math.cos(a) - radius, radius * Math.sin(a))))
    }
    expect(dist(loop[N - 1], centre)).toBeLessThan(1e-9)

    const end = dragPathPHFree(START, 2, loop).at(-1)!
    expect(dist(end.controlPoints[2], centre)).toBeLessThan(0.02)
    const moved = Math.max(
      ...[0, 1, 3, 4, 5].map((j) => dist(end.controlPoints[j], before[j])),
    )
    expect(moved).toBeGreaterThan(1e-3)
    expect(phPolygonResidual(end.controlPoints)).toBeLessThan(1e-9)
  })
})
