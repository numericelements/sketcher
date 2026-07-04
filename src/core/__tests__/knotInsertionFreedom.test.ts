import { describe, it, expect } from 'vitest'
import {
  slide, familyBound, insertKnotOpen, rationalCoeffs, rational, type WeightedCP,
} from '../index'
import type { WeightedPoint2D } from '../types'

// FOUNDATIONS F10: knot insertion is Law-2-safe (the refined polygon of g is a
// subdivision — S⁻ can only stay or drop) and, WELL-PLACED, buys large tracking
// freedom. On the F9 stall drag (core honestly stalls at ~47% of the pull at
// bound 2), inserting ONE knot at t=0.375 measured 83% tracked at the same
// bound. Placement is non-monotone and can also HURT (0.625 → 17%), so the
// editor design is probe-and-keep, never blind refinement — see F10.
// Pins: (1) insertion itself never changes the bound; (2) the good placement
// keeps ≥70% tracking (canary against solver/regime regressions); (3) the
// bound holds through the refined drag; (4) weights ride insertion exactly.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

describe('knot insertion: legality (theorem) + freedom (measured, F10)', () => {
  it('one knot at 0.375: bound unchanged by insertion, held through the drag, ≥63% tracked', () => {
    const before: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
    const boundBefore = familyBound('rational', before, KNOTS, DEGREE, 'open')

    const wp: WeightedPoint2D[] = X0.map((x, i) => ({ x, y: Y0[i], w: W0[i] }))
    const ins = insertKnotOpen(rationalCoeffs, wp, DEGREE, KNOTS, 0.375)
    let cps: WeightedCP[] = ins.controlPoints.map((p) => rational(p.x, p.y, p.w))

    // (1) Insertion is representation-only: the bound may not rise (VD subdivision).
    const boundAfter = familyBound('rational', cps, ins.knots, DEGREE, 'open')
    expect(boundAfter).toBeLessThanOrEqual(boundBefore)

    // Drag the CP nearest the original CP 3 through the F9 pull.
    let k = 0, dm = Infinity
    cps.forEach((p, i) => {
      const dist = Math.hypot(p.re - X0[3], p.im - Y0[3])
      if (dist < dm) { dm = dist; k = i }
    })
    const sx = cps[k].re, sy = cps[k].im
    const target = { x: X0[3] + 55, y: Y0[3] + 200 }
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const r = slide('rational', cps, ins.knots, DEGREE, 'open', k,
        { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
        { solver: 'primal-dual', jacobian: 'analytic', maxIterations: 20 })
      cps = r.points
      // (3) Law 2 on the refined curve.
      expect(familyBound('rational', cps, ins.knots, DEGREE, 'open'), `step ${s}`).toBeLessThanOrEqual(boundAfter)
    }
    // (2) The freedom canary: measured 83% at pin time; alert below 70%.
    // RECALIBRATED (E21, floor 1e-12→1e-14 + margin 1e-9→1e-13): 67% measured.
    // Cause: coefficients that were phantom "structural zeros" under the fat
    // floor are now REAL constraints — the honest cage is slightly tighter.
    // The bound checks above are unchanged; alert below 63%.
    const moveLen = Math.hypot(target.x - sx, target.y - sy)
    const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    expect(err, `tracked only ${(100 - 100 * err / moveLen).toFixed(0)}%`).toBeLessThan(0.37 * moveLen)

    // (4) Weights rode insertion + drag untouched (homogeneous Boehm; drag freezes them).
    ins.controlPoints.forEach((p, i) => expect(cps[i].wRe).toBe(p.w))
  }, 30000)
})
