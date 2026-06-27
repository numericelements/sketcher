import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitClosedPHSpline } from '../optimizer/phClosedSplineFit'
import { createBSpline } from '../utils/bspline/utilities'
import { curvatureExtremaNumeratorPlanarPeriodic, assignSignsNeighbor, cyclicSignChanges } from '../../core'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

// The closed-PH editor paths ARE unit-testable: build a closed PH curve, seed the store
// with its phMetadata, drive the store actions, assert the invariants. (Earlier I claimed
// these weren't testable — they are.)

function injectClosedPH(id = 'cph'): string {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) { const a = (2 * Math.PI * i) / 16; pts.push({ x: 170 * Math.cos(a) + 14 * Math.sin(3 * a), y: 95 * Math.sin(a) }) }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
  const curve: Curve = { id, kind: 'bspline', degree: ph.degree, knots: ph.knots, controlPoints: ph.controlPoints, closed: true }
  useSceneStore.setState({ curves: [curve], phMetadata: new Map<string, PHMetadataAny>([[id, ph.metadata]]), selectedCurveId: id, generate: null, preserveCurvatureExtrema: true })
  return id
}

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)!
const boundOf = (c: Curve) => {
  const X = (c.controlPoints as Point2D[]).map((p) => p.x), Y = (c.controlPoints as Point2D[]).map((p) => p.y)
  return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(X, Y, c.knots, c.degree).flatCoeffs()), true)
}
const maxKnotMultiplicity = (knots: number[]) => {
  let max = 1, run = 1
  for (let i = 1; i < knots.length; i++) { if (Math.abs(knots[i] - knots[i - 1]) < 1e-9) { run++; max = Math.max(max, run) } else run = 1 }
  return max
}

describe('closed PH editing: knot insertion stays closed', () => {
  it('inserting a knot does NOT clamp the seam (no degree+1 multiplicity)', () => {
    const id = injectClosedPH()
    const c0 = cur(id)
    expect(c0.closed).toBe(true)
    const b0 = boundOf(c0)
    // clamped bug = multiplicity degree+1 (=6) stacks at both ends; periodic stays ≤ degree.
    expect(maxKnotMultiplicity(c0.knots)).toBeLessThanOrEqual(c0.degree)

    useSceneStore.getState().insertKnotAtCurve(id, 0.4)
    const c1 = cur(id)
    expect(c1.closed, 'curve must stay closed after knot insert').toBe(true)
    expect(maxKnotMultiplicity(c1.knots), `seam clamped to mult ${maxKnotMultiplicity(c1.knots)} (degree ${c1.degree}) — closed curve must not clamp`).toBeLessThanOrEqual(c1.degree)
    // knot insertion is shape-preserving → the curvature-extrema bound is unchanged.
    expect(boundOf(c1)).toBe(b0)
    expect(c1.controlPoints.length).toBeGreaterThan(c0.controlPoints.length)
  })
})

describe('closed PH editing: drag holds the bound (the guard)', () => {
  it('a chained control-point drag never raises S⁻', () => {
    const id = injectClosedPH()
    const start = boundOf(cur(id))
    const k = 3
    const p0 = (cur(id).controlPoints as Point2D[])[k]
    const sx = p0.x, sy = p0.y
    for (let s = 1; s <= 12; s++) {
      const t = s / 12
      useSceneStore.getState().moveControlPoint(id, k, { x: sx - 120 * t, y: sy + 90 * t })
      expect(boundOf(cur(id)), `step ${s}: closed PH bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBe(true)
    }
    // Reshape, don't block: the dragged point must TRACK the cursor — not stall at its start.
    // (Now on core slideClosedPHTracking: direct objective + closure equalities + curve-span guard.)
    const cps = cur(id).controlPoints as Point2D[]
    const target = { x: sx - 120, y: sy + 90 }
    const nearest = cps.reduce((best, p) => Math.hypot(p.x - target.x, p.y - target.y) < Math.hypot(best.x - target.x, best.y - target.y) ? p : best, cps[0])
    const traveled = Math.hypot(nearest.x - sx, nearest.y - sy)
    expect(traveled, 'closed PH drag stalled — the curve did not track the cursor').toBeGreaterThan(30)
  }, 30000)

  it('a BIG single-tick jump tracks, holds the bound, stays closed (the original stall case)', () => {
    const id = injectClosedPH('cph-big')
    const start = boundOf(cur(id))
    const k = 3
    const p0 = (cur(id).controlPoints as Point2D[])[k]
    const sx = p0.x, sy = p0.y
    // one large jump — this is exactly what stalled with the generator-bound core path
    useSceneStore.getState().moveControlPoint(id, k, { x: sx - 160, y: sy + 120 })
    expect(boundOf(cur(id)), 'big-jump closed PH bound rose').toBeLessThanOrEqual(start)
    expect(cur(id).closed).toBe(true)
    const cps = cur(id).controlPoints as Point2D[]
    const target = { x: sx - 160, y: sy + 120 }
    const nearest = cps.reduce((b, p) => Math.hypot(p.x - target.x, p.y - target.y) < Math.hypot(b.x - target.x, b.y - target.y) ? p : b, cps[0])
    const traveled = Math.hypot(nearest.x - sx, nearest.y - sy)
    expect(traveled, `closed PH big-jump stalled (traveled ${traveled.toFixed(1)})`).toBeGreaterThan(40)
  }, 30000)
})
