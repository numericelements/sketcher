import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitPHSplineToBSpline } from '../optimizer/phSplineFit'
import { createBSpline } from '../utils/bspline/utilities'
import { curvatureExtremaNumeratorPlanar } from '../../core'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

// The OPEN-PH editor drag must hold the displayed bound (S⁻ never rises), stay OPEN, and
// TRACK the cursor. (Pins the legacy open-PH solve; the core slideOpenPH path was reverted —
// F6: it holds g's gen-span bound while the editor displays/guards the curve-span bound.)

function injectOpenPH(id = 'oph'): string {
  const pts: Point2D[] = []
  for (let i = 0; i < 10; i++) pts.push({ x: 40 + 22 * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) + 18 * Math.cos((Math.PI * i) / 3) })
  const bs = createBSpline(pts, 3, false) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitPHSplineToBSpline(bs.controlPoints, bs.knots)!
  const curve: Curve = { id, kind: 'bspline', degree: ph.degree, knots: ph.knots, controlPoints: ph.controlPoints, closed: false }
  useSceneStore.setState({ curves: [curve], phMetadata: new Map<string, PHMetadataAny>([[id, ph.metadata]]), selectedCurveId: id, generate: null, preserveCurvatureExtrema: true })
  return id
}

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)!
const boundOf = (c: Curve) => {
  const X = (c.controlPoints as Point2D[]).map((p) => p.x), Y = (c.controlPoints as Point2D[]).map((p) => p.y)
  return curvatureExtremaNumeratorPlanar(X, Y, c.knots, c.degree).signChanges()
}

describe('open PH editing: drag holds the bound and tracks (core slideOpenPH)', () => {
  it('a chained control-point drag never raises S⁻ and stays open', () => {
    const id = injectOpenPH()
    const start = boundOf(cur(id))
    const k = 5
    const p0 = (cur(id).controlPoints as Point2D[])[k]
    const sx = p0.x, sy = p0.y
    for (let s = 1; s <= 12; s++) {
      const t = s / 12
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + 70 * t, y: sy - 120 * t })
      expect(boundOf(cur(id)), `step ${s}: open PH bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBeFalsy()
    }
    // reshape, don't block: a nearby curve CP should track the cursor a meaningful distance.
    const cps = cur(id).controlPoints as Point2D[]
    const target = { x: sx + 70, y: sy - 120 }
    const nearest = cps.reduce((best, p) => Math.hypot(p.x - target.x, p.y - target.y) < Math.hypot(best.x - target.x, best.y - target.y) ? p : best, cps[0])
    const traveled = Math.hypot(nearest.x - sx, nearest.y - sy)
    expect(traveled, 'open PH drag stalled — the curve did not track the cursor').toBeGreaterThan(25)
  }, 30000)
})
