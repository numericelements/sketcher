// ============================================================================
// C² splines of degree-7 RM-ERF segments: a rotation-minimizing frame along a whole
// curve, edited with NO window and NO locality guarantee.
//
// The claim under test is not that editing is local — it is that the frame survives
// editing, and that whatever locality emerges is MEASURED rather than promised.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import { hodographAt } from '../phSpatialSeptic'
import {
  type SepticSpline,
  buildRmErfSpline,
  classDefect,
  continuityDefects,
  displacementProfile,
  dragSpline,
  minSpeed,
  planarity,
  reach,
  splineControlPoints,
  totalTwist,
} from '../phSpatialSepticSpline'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const N = 6
const SPLINE = buildRmErfSpline(N, { p0: V(-1.6, -0.4, 0.1) })

// ---------------------------------------------------------------------------
describe('THE GATE — a C² RM-ERF spline exists, and is not flat', () => {
  it('builds', () => {
    expect(SPLINE).not.toBeNull()
    expect((SPLINE as SepticSpline).segments).toHaveLength(N)
    expect(splineControlPoints(SPLINE as SepticSpline)).toHaveLength(7 * N + 1)
  })

  it('is in the class, C², untwisted, and un-cusped', () => {
    const s = SPLINE as SepticSpline
    expect(classDefect(s)).toBeLessThan(1e-9)
    expect(continuityDefects(s).c1).toBeLessThan(1e-9)
    expect(continuityDefects(s).c2).toBeLessThan(1e-7)
    expect(totalTwist(s)).toBeLessThan(1e-7)
    expect(minSpeed(s)).toBeGreaterThan(0.1)
  })

  it('is genuinely SPATIAL — the planar locus is an attractor and must be escaped', () => {
    // Every planar PH curve is in the class for free, so a plain min-norm projection
    // lands flat: measured planarity 0.014 from a smooth seed, no better than 0.121
    // across six seed families. The construction climbs out along the class's tangent
    // space, which is what makes this assertion pass at all.
    expect(planarity(SPLINE as SepticSpline)).toBeGreaterThan(0.12)
  })

  it('THE SPEED DOES NOT COMPOUND — the reason continuity lives in the generator', () => {
    // The rejected segment-by-segment construction measured |r′| at the joints as
    // 2.46 → 1.95 → 8.36 → 17.54 → 72.66 at n = 4, reaching 5066 by n = 7. Putting the
    // continuity in the generator keeps it flat.
    const s = SPLINE as SepticSpline
    const speeds = s.segments.map((A) => vnorm(hodographAt(A, 0)))
    speeds.push(vnorm(hodographAt(s.segments[N - 1], 1)))
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeLessThan(6)
  })

  it('and it scales — the construction works from 3 to 10 segments', () => {
    for (const n of [3, 8, 10]) {
      const s = buildRmErfSpline(n, { p0: V(0, 0, 0) })
      expect(s, `n = ${n}`).not.toBeNull()
      expect(classDefect(s as SepticSpline), `n = ${n} class`).toBeLessThan(1e-9)
      expect(totalTwist(s as SepticSpline), `n = ${n} twist`).toBeLessThan(1e-6)
      expect(planarity(s as SepticSpline), `n = ${n} flat`).toBeGreaterThan(0.05)
    }
  }, 30000)
})

// ---------------------------------------------------------------------------
describe('EDITING with no window', () => {
  const spline = SPLINE as SepticSpline
  const before = splineControlPoints(spline)

  it('every control point drags, and the frame survives every one', () => {
    for (let i = 0; i < before.length; i++) {
      const target = V(before[i].x + 0.2, before[i].y + 0.16, before[i].z - 0.12)
      const r = dragSpline(spline, i, target)
      expect(r.converged, `cp ${i}`).toBe(true)
      expect(r.trackingError, `cp ${i} tracks`).toBeLessThan(1e-6)
      expect(r.classDefect, `cp ${i} class`).toBeLessThan(1e-8)
      expect(r.c2Defect, `cp ${i} C²`).toBeLessThan(1e-7)
      expect(totalTwist(r.state), `cp ${i} twist`).toBeLessThan(1e-6)
    }
  }, 30000)

  it('the END POINTS are held — whichever is not the one dragged', () => {
    const LAST = 7 * N
    for (const i of [4, 15, 30]) {
      const target = V(before[i].x + 0.25, before[i].y + 0.2, before[i].z - 0.15)
      const after = splineControlPoints(dragSpline(spline, i, target).state)
      expect(vd(after[0], before[0]), `cp ${i} moved the start`).toBeLessThan(1e-7)
      expect(vd(after[LAST], before[LAST]), `cp ${i} moved the end`).toBeLessThan(1e-7)
    }
    // and dragging an end pins only the other
    for (const [i, other] of [[0, LAST], [LAST, 0]] as const) {
      const target = V(before[i].x + 0.2, before[i].y + 0.15, before[i].z - 0.1)
      const r = dragSpline(spline, i, target)
      expect(r.converged, `end ${i}`).toBe(true)
      const after = splineControlPoints(r.state)
      expect(vd(after[i], target)).toBeLessThan(1e-6)
      expect(vd(after[other], before[other])).toBeLessThan(1e-7)
    }
  })

  it('HOW LOCAL IS IT? — measured, not promised', () => {
    // No window, so locality is an emergent property. The profile is the answer; the
    // figure ghosts the pre-drag curve so it can also just be seen.
    const LAST = 7 * N
    const profiles: { at: number; profile: number[]; reach: number }[] = []
    for (const seg of [0, Math.floor(N / 2), N - 1]) {
      const i = Math.min(LAST - 1, 7 * seg + 4)
      const target = V(before[i].x + 0.3, before[i].y + 0.24, before[i].z - 0.18)
      const after = splineControlPoints(dragSpline(spline, i, target).state)
      profiles.push({
        at: seg,
        profile: displacementProfile(before, after, N),
        reach: reach(before, after, i, N),
      })
    }
    for (const { at, profile, reach: r } of profiles) {
      const peak = Math.max(...profile)
      expect(peak, `seg ${at} moved nothing`).toBeGreaterThan(0)
      // The disturbance peaks at or beside the segment being dragged, rather than
      // somewhere unrelated — which is what makes the edit feel controllable at all.
      const peakAt = profile.indexOf(peak)
      expect(Math.abs(peakAt - at), `seg ${at} peaked at ${peakAt}`).toBeLessThanOrEqual(1)
      expect(r).toBeGreaterThan(0)
      expect(r).toBeLessThanOrEqual(N)
    }
  })

  it('a long incremental drag holds everything', () => {
    let state = spline
    let reached = 0
    const i = 18
    for (let d = 0.15; d <= 1.5; d += 0.15) {
      const target = V(before[i].x + 0.5 * d, before[i].y + 0.4 * d, before[i].z - 0.3 * d)
      const r = dragSpline(state, i, target)
      if (!r.converged) break
      state = r.state
      reached = d
    }
    expect(reached).toBeGreaterThanOrEqual(0.6)
    expect(classDefect(state)).toBeLessThan(1e-8)
    expect(continuityDefects(state).c2).toBeLessThan(1e-6)
    expect(totalTwist(state)).toBeLessThan(1e-6)
    expect(minSpeed(state)).toBeGreaterThan(0.01)
  })
})
