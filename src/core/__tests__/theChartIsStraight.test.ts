// ============================================================================
// THE CHART'S COORDINATES ARE STRAIGHT. THE CURVE'S ARE NOT.
//
// Fix the poles and the twist rates and the admissible spinors are a LINEAR SUBSPACE (F17). So a
// straight line in SPINOR space stays inside the chart: every point of it is exactly PH, with no
// solve, no projection and no residual to drift. That is what "inside a chart, PH costs nothing"
// means, and it is measured here along all eight fibre directions and well past the segment ends.
//
// THE COMPARISON IS THE POINT. Two members of one chart share a denominator — w depends on the poles
// alone — so the POINTWISE blend
//
//     c_s = (1−s)c₀ + s c₁ = [(1−s)p₀ + s p₁] / w
//
// is a rational curve of the SAME degree with the SAME poles, agreeing with the spinor blend at both
// ends. Same two endpoints, two straight lines, and only one of them is straight in the coordinates
// that matter.
//
// AND THE SIZE OF THE MISS IS THE HONEST PART. The pointwise blend is not wildly non-PH; it is
// CLOSE — a few parts in a thousand — and it is never PH. Twelve orders above the measure's own
// floor, which is why the floor is pinned here first. You cannot land on this set by interpolating
// between points of it; you land on it by using the chart's coordinates.
//
// THE NINTH NUMBER THAT ISN'T ONE. The Hopf gauge 𝒜 ↦ 𝒜e^{iθ} lies in the same linear subspace and
// moves no curve at all (F16 identified the direction 𝒜i; here it is walked as a full circle). So of
// the eight fibre directions, one combination is invisible: eight coordinates, seven curves, at fixed
// dial.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  blendCurves, pointOn, rationalPHResidual, squareRootDefect, type RationalCurve,
} from '../rationalCurveBlend'
import {
  familyBasis, packSpinor, unpackSpinor, phDefect, toMember, denominatorOf,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'
import { qmul, type Quat } from '../quaternion'

const POLE = 1.7
const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const BASE: MultiPoleParams = { A: ZERO, roots: [POLE], lambdas: [0.5] }
const BASIS = familyBasis(BASE)

const combine = (amps: readonly number[]): MultiPoleParams => {
  const x = new Array<number>(12).fill(0)
  BASIS.forEach((b, i) => { for (let j = 0; j < 12; j++) x[j] += (amps[i] ?? 0) * b[j] })
  return { ...BASE, A: unpackSpinor(x) }
}

const AMPS = BASIS.map((_, i) => 1.3 * Math.sin(1.7 * i + 0.6))
const SEED = combine(AMPS)

const asCurve = (prm: MultiPoleParams): RationalCurve => {
  const m = toMember(prm)
  return { p: m.p, w: m.w }
}
const spinorBlend = (a: MultiPoleParams, b: MultiPoleParams, s: number): MultiPoleParams => {
  const xa = packSpinor(a.A), xb = packSpinor(b.A)
  return { ...a, A: unpackSpinor(xa.map((v, i) => (1 - s) * v + s * xb[i])) }
}
const maxGap = (a: RationalCurve, b: RationalCurve): number => {
  let d = 0
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const u = pointOn(a, t), v = pointOn(b, t)
    d = Math.max(d, Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z))
  }
  return d
}

/** One step along fibre direction k — the walk the figure's slider takes. */
const along = (k: number, s: number): MultiPoleParams =>
  combine(AMPS.map((v, i) => (i === k ? v + s : v)))

const SWEEP = [-1.5, -0.6, 0, 0.17, 0.35, 0.5, 0.62, 0.83, 1, 1.4, 2.6]
const INSIDE = [0.1, 0.25, 0.5, 0.75, 0.9]

describe('the chart is straight in the spinor and curved in the curve', () => {
  it('CONTROL: the measure reads zero on a real square and O(1) on a near-miss', () => {
    const root = [2, 1, -3]
    const square = [4, 4, -11, -6, 9]           // (2 + t − 3t²)², expanded by hand
    const rebuilt = [0, 1, 2, 3, 4].map((e) => {
      let s = 0
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i + j === e) s += root[i] * root[j]
      return s
    })
    expect(rebuilt).toEqual(square)             // the specimen really is the square it claims to be
    expect(squareRootDefect(square)).toBeLessThan(1e-14)          // measured 1.5e-16

    // one coefficient off by a percent, and the algebraic test sees it
    const nudged = square.slice()
    nudged[2] *= 1.01
    expect(squareRootDefect(nudged)).toBeGreaterThan(1e-3)        // measured 1.5e-2
    // an odd top degree cannot be a square at all
    expect(squareRootDefect([...square, 0.4])).toBe(Infinity)
  })

  it('a straight line in SPINOR space is PH at every s, far outside the segment', () => {
    const other = combine(AMPS.map((v, i) => v + 0.8 * Math.cos(2.3 * i - 1.1)))
    let worstPH = 0
    let worstLog = 0
    for (const s of SWEEP) {
      const m = toMember(spinorBlend(SEED, other, s))
      worstPH = Math.max(worstPH, phDefect(m), rationalPHResidual({ p: m.p, w: m.w }))
      worstLog = Math.max(worstLog, m.noLog)
    }
    expect(worstPH).toBeLessThan(1e-12)   // measured 2.4e-15
    expect(worstLog).toBeLessThan(1e-14)  // still admissible: the subspace is linear
  })

  it('and so is every one of the eight fibre directions, walked to ±4', () => {
    expect(BASIS.length).toBe(8)
    let worst = 0
    for (let k = 0; k < BASIS.length; k++) {
      for (const s of [-4, -1, 1, 4]) {
        const m = toMember(along(k, s))
        worst = Math.max(worst, phDefect(m), m.noLog, rationalPHResidual({ p: m.p, w: m.w }))
      }
    }
    expect(worst).toBeLessThan(1e-12)     // measured 1.5e-15
  })

  it('THE POINTWISE BLEND IS CLOSE AND NEVER LANDS — twelve orders above the floor', () => {
    const a = asCurve(SEED)
    expect(a.w).toEqual(denominatorOf([POLE]))   // one denominator, so the blend is same-degree
    const floor = rationalPHResidual(a)
    expect(floor).toBeLessThan(1e-14)

    for (let k = 0; k < BASIS.length; k++) {
      const b = asCurve(along(k, 1))
      // exact at both ends, because there the two blends are the same curve
      expect(rationalPHResidual(blendCurves(a, b, 0))).toBeLessThan(1e-14)
      expect(rationalPHResidual(blendCurves(a, b, 1))).toBeLessThan(1e-14)

      const worst = Math.max(...INSIDE.map((s) => rationalPHResidual(blendCurves(a, b, s))))
      expect(worst).toBeGreaterThan(2e-5)        // measured 1.0e-4 … 1.4e-3 over the eight
      expect(worst / Math.max(floor, 1e-300)).toBeGreaterThan(1e9)
    }
  })

  it('the two blends agree at both ends and part in between — same line, different coordinates', () => {
    const a = asCurve(SEED)
    const b = asCurve(along(2, 1))
    const between = (s: number): number => maxGap(asCurve(spinorBlend(SEED, along(2, 1), s)), blendCurves(a, b, s))
    expect(between(0)).toBeLessThan(1e-12)
    expect(between(1)).toBeLessThan(1e-12)
    expect(between(0.5)).toBeGreaterThan(0.1)    // measured 0.19, against a separation of 3.1
    expect(maxGap(a, b)).toBeGreaterThan(3)
  })

  it('THE HOPF PHASE IS A HANDLE THAT MOVES NOTHING — eight coordinates, seven curves', () => {
    const before = asCurve(SEED)
    let moved = 0
    let offFibre = 0
    let spinorMoved = 0
    for (const th of [0.3, 1.1, 2.0, 3.0, 5.5]) {
      const rot: Quat = { u: Math.cos(th), v: Math.sin(th), p: 0, q: 0 }
      const turned: MultiPoleParams = { ...SEED, A: SEED.A.map((q) => qmul(q, rot)) }
      const m = toMember(turned)
      offFibre = Math.max(offFibre, m.noLog)     // the gauge orbit stays inside the fibre
      moved = Math.max(moved, maxGap(before, { p: m.p, w: m.w }))
      const xa = packSpinor(SEED.A), xb = packSpinor(turned.A)
      spinorMoved = Math.max(spinorMoved, Math.hypot(...xa.map((v, i) => v - xb[i])))
    }
    expect(offFibre).toBeLessThan(1e-14)
    expect(moved).toBeLessThan(1e-12)            // measured 1.4e-15
    expect(spinorMoved).toBeGreaterThan(1)       // measured 2.2 — the spinor really did move
  })
})
