// ============================================================================
// THE INDICATRIX RENDERS AS A CURVE, NOT A POLYGON — and it was the PALE LOOP, not the drawn arc.
//
// SEEN ON THE DEGREE-6 SPHERE SLIDE: parts of the indicatrix showed as a visible polyline wherever the
// curve stretched. That is the third time this fact has cost a figure (`indicatrixNear`'s header
// records the other two): |T′| varies by ORDERS OF MAGNITUDE along the indicatrix, so a sampling
// uniform in the parameter is not uniform on the sphere.
//
// AND THE MEASUREMENT SAID WHICH CURVE, which was not the one first suspected:
//
//     worst single chord on a unit sphere, at the deck's seed
//                                   r = 1.06      r = 1.7, θ = 35°
//     indicatrixLoop, 900 points      0.166           0.019       ← the pale whole indicatrix
//     indicatrixLoop, 3000 points     0.050           0.006
//     indicatrixArc, 240 points       0.0048          0.0051      ← the heavy drawn piece: fine
//
// A sixth of the sphere's radius drawn as one straight line. The drawn piece over t ∈ [0,1] was never
// the problem — its speed varies mildly, and the adaptive sampler only beats a uniform one of the same
// size there by 1.2–1.5×. The whole loop runs over ALL of ℝ ∪ {∞}, and no affordable uniform count
// fixes it, because the ratio being fought grows as the pole approaches the drawn piece.
//
// WHAT IS PINNED HERE: both samplers bound their longest segment by the requested chord at every pole
// and twist the slide can reach, the arc still starts and ends exactly where asked, and the modest
// size of the gain on the drawn piece is recorded rather than dressed up.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams, familyBasis, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  indicatrixArc, indicatrixArcSmooth, indicatrixAt, indicatrixLoop, indicatrixLoopSmooth,
} from '../tangentIndicatrix'
import type { Quat, Vec3 } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const seedAt = (poleR: number, thetaDeg: number): MultiPoleParams => {
  const base: MultiPoleParams = {
    A: ZERO, roots: [poleR], lambdas: [Math.tan((thetaDeg * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}
const worstSegment = (pts: readonly Vec3[]): number => {
  let w = 0
  for (let i = 1; i < pts.length; i++) {
    w = Math.max(w, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z))
  }
  return w
}
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('the drawn indicatrix arc', () => {
  it('EVERY SEGMENT IS SHORT, at every pole and twist the slide can reach', () => {
    const CHORD = 0.004
    let worst = 0, most = 0, where = ''
    for (const r of [1.06, 1.7, 4]) {
      for (const theta of [-89, -35, 0, 35, 89]) {
        const m = toMember(seedAt(r, theta))
        const pts = indicatrixArcSmooth(m, 0, 1, CHORD)
        const seg = worstSegment(pts)
        if (seg > worst) { worst = seg; where = `r ${r}, θ ${theta}°` }
        most = Math.max(most, pts.length)
        expect(dist(pts[0], indicatrixAt(m, 0))).toBeLessThan(1e-12)
        expect(dist(pts[pts.length - 1], indicatrixAt(m, 1))).toBeLessThan(1e-12)
      }
    }
    console.log(`    worst segment ${worst.toExponential(2)} (asked ${CHORD}) at ${where}; at most ${most} points`)
    // 2× the chord is the halving loop's own acceptance test, so that is the honest bound to assert.
    expect(worst, 'bounded on a unit sphere, so it reads as a curve').toBeLessThan(2 * CHORD)
    expect(most, 'and it does not run away').toBeLessThan(6000)
  })

  it('THE PALE LOOP IS WHERE IT MATTERED: 0.166 becomes bounded', () => {
    const CHORD = 0.004
    const rows: string[] = []
    let worstSmooth = 0, leastGain = Infinity, worstWasDrawn = 0, most = 0
    for (const [r, theta] of [[1.06, 0], [1.7, 35], [1.7, 89], [4, -35]] as const) {
      const m = toMember(seedAt(r, theta))
      const smooth = indicatrixLoopSmooth(m, CHORD)
      const a = worstSegment(smooth)
      const sameSize = worstSegment(indicatrixLoop(m, smooth.length - 1))
      const asDrawn = worstSegment(indicatrixLoop(m, 900))   // what the figure used before
      worstSmooth = Math.max(worstSmooth, a)
      leastGain = Math.min(leastGain, sameSize / a)
      worstWasDrawn = Math.max(worstWasDrawn, asDrawn)
      most = Math.max(most, smooth.length)
      rows.push(
        `    r ${String(r).padStart(4)} θ ${String(theta).padStart(3)}°:` +
          ` ${smooth.length} points — worst chord ${a.toExponential(2)};` +
          ` uniform same size ${sameSize.toExponential(2)} (${(sameSize / a).toFixed(0)}×),` +
          ` uniform at the figure's old 900: ${asDrawn.toExponential(2)}`,
      )
    }
    rows.forEach((x) => console.log(x))
    expect(worstSmooth, 'bounded everywhere the slide can go').toBeLessThan(2 * CHORD)
    // 2x to 10x on the same budget — the big number is at the close pole, which is exactly where the
    // polygon was visible. Asserted at the SMALLEST measured gain, not the headline one.
    expect(leastGain).toBeGreaterThan(1.8)
    expect(worstWasDrawn, 'and what it replaces really was a polygon').toBeGreaterThan(0.1)
    expect(most, 'without a runaway point count').toBeLessThan(8000)
  })

  it('the drawn piece was NEVER the problem, and the gain there is modest — recorded, not dressed up', () => {
    const rows: string[] = []
    let best = Infinity
    for (const [r, theta] of [[1.06, 0], [1.7, 35], [1.7, 89], [4, -35]] as const) {
      const m = toMember(seedAt(r, theta))
      const smooth = indicatrixArcSmooth(m, 0, 1, 0.004)
      const uniform = indicatrixArc(m, 0, 1, smooth.length - 1)
      const a = worstSegment(smooth), b = worstSegment(uniform)
      best = Math.min(best, b / a)
      rows.push(
        `    r ${String(r).padStart(4)} θ ${String(theta).padStart(3)}°:` +
          ` ${smooth.length} points — adaptive ${a.toExponential(2)}, uniform ${b.toExponential(2)}` +
          `  (${(b / a).toFixed(1)}× worse)`,
      )
    }
    rows.forEach((x) => console.log(x))
    // 1.2-1.5x. Worth having for the guarantee at any dial setting, NOT for a saving. Asserted low so
    // the file does not quietly start claiming more than it measured.
    expect(best).toBeGreaterThan(1.1)
    expect(best).toBeLessThan(3)
  })
})
