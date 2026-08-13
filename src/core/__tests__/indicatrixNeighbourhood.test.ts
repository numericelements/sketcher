// ============================================================================
// THE CUSP NEIGHBOURHOOD MUST LOOK THE SAME AT EVERY DIAL SETTING — a resolution guard.
//
// TWO FIGURES GOT THIS WRONG BEFORE THIS FILE EXISTED, in opposite directions, and both times the
// cause was drawing a fixed window in the PARAMETER:
//
//   too small   the corner rendered as a few points and read as a polygon — "low resolution"
//   too large   the window swallowed most of the indicatrix and read as a SECOND curve drawn on
//               top of the first — "why do we see multiple curves"
//
// Neither is fixable with a better constant. |T′| near a pole changes by roughly sevenfold as the
// twist dial turns (stratumIsTheHorizon.test.ts) and again as the pole moves, so any constant window
// is right at one setting and wrong at the rest.
//
// `indicatrixNear` spends a budget of spherical ARC instead, and the figure sizes that budget as a
// FRACTION of the whole indicatrix — because an absolute budget is modest on a long curve and half of
// a short one, and this seed's indicatrix ranges from 1.5 to 11.7 across the two sliders.
//
// What this file pins is the two properties a figure actually needs, over the whole range of both:
// the drawn span stays a small share of the curve, and no single segment is long enough to look like
// a straight line. NOT that the span is constant — one side can reach the point at infinity with arc
// left over, so it is bounded above, not fixed.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  dataOf, familyBasis, toMember, unpackSpinor, withDial,
} from '../rationalPHMultiPoleSpatial'
import { indicatrixAt, indicatrixLength, indicatrixNear, indicatrixSpeedAt } from '../tangentIndicatrix'
import type { Quat } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [0] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()
const TARGET = dataOf(toMember(SEED))

/** What the figure passes: a fixed FRACTION of the curve's own length, capped. */
const budgetFor = (len: number): number => Math.min(0.45, 0.1 * len)
const lengthOf = (pts: readonly { x: number; y: number; z: number }[]): number => {
  let s = 0
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z)
  }
  return s
}
const longestSegment = (pts: readonly { x: number; y: number; z: number }[]): number => {
  let w = 0
  for (let i = 1; i < pts.length; i++) {
    w = Math.max(w, Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z))
  }
  return w
}

/** Every configuration the two sliders can reach, sampled coarsely but across the whole range. */
const CONFIGS: { pole: number; theta: number }[] = []
for (const pole of [1.06, 1.3, 1.7, 2.4, 3.2]) {
  for (const theta of [-89, -45, 0, 45, 89]) CONFIGS.push({ pole, theta })
}

describe('the cusp neighbourhood', () => {
  it('the guard has teeth: |T′| near the pole really does vary by orders across these settings', () => {
    const speeds = CONFIGS.map(({ pole, theta }) => {
      const prm = withDial(SEED, TARGET, { pole: { index: 0, value: pole } })!
      const m = toMember(withDial(prm, TARGET, {
        lambda: { index: 0, value: Math.tan((theta * Math.PI) / 180) },
      })!)
      return indicatrixSpeedAt(m, pole + 0.05)
    })
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeGreaterThan(50)
  })

  it('STAYS A SMALL FRACTION OF THE CURVE — the "second curve on top" failure, guarded', () => {
    for (const { pole, theta } of CONFIGS) {
      const prm = withDial(SEED, TARGET, { pole: { index: 0, value: pole } })!
      const m = toMember(withDial(prm, TARGET, {
        lambda: { index: 0, value: Math.tan((theta * Math.PI) / 180) },
      })!)
      const whole = indicatrixLength(m)
      const arc = indicatrixNear(m, pole, budgetFor(whole))
      const drawn = lengthOf(arc)
      expect(drawn).toBeGreaterThan(0)
      // never more than a fifth of the indicatrix, at any pole and any twist
      expect(drawn / whole).toBeLessThan(0.21)
      // and never so little that there is nothing to see
      expect(drawn / whole).toBeGreaterThan(0.01)
    }
  })

  it('AND NO SEGMENT IS LONG ENOUGH TO READ AS A STRAIGHT LINE', () => {
    for (const { pole, theta } of CONFIGS) {
      const prm = withDial(SEED, TARGET, { pole: { index: 0, value: pole } })!
      const m = toMember(withDial(prm, TARGET, {
        lambda: { index: 0, value: Math.tan((theta * Math.PI) / 180) },
      })!)
      const arc = indicatrixNear(m, pole, budgetFor(indicatrixLength(m)))
      expect(arc.length).toBeGreaterThan(80)
      expect(longestSegment(arc)).toBeLessThan(0.02)   // ≈ 1° of sphere
    }
  })

  it('and it passes through the cusp itself, which is the point it is drawn around', () => {
    const m = toMember(SEED)
    const cusp = indicatrixAt(m, 1.7)
    const arc = indicatrixNear(m, 1.7, budgetFor(indicatrixLength(m)))
    const near = Math.min(...arc.map((p) => Math.hypot(p.x - cusp.x, p.y - cusp.y, p.z - cusp.z)))
    expect(near).toBeLessThan(1e-12)
    // and it lies ON the sphere the whole way, so it is the indicatrix and not an approximation to it
    expect(Math.max(...arc.map((p) => Math.abs(Math.hypot(p.x, p.y, p.z) - 1)))).toBeLessThan(1e-9)
  })
})
