import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { curvatureExtremaNumeratorPlanar, curvatureExtremaNumeratorPlanarPeriodic } from '../../core'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

// Migration (fable branch): bspline drags with symmetryMaps now ride core slideCurve,
// which enforces symmetry by variable REDUCTION inside the solve (the same mechanism
// the talks demos drive directly; core capability pinned in symmetryInflection.test.ts).
// This pins the EDITOR contract through moveControlPoint: symmetry stays exact to
// machine precision, the curvature-extrema bound never rises, and the drag tracks.

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)! as Curve & { controlPoints: Point2D[] }

describe('bspline drags with symmetryMaps route to core (editor contract)', () => {
  it('closed oval, two axes: symmetry exact, bound non-increasing, tracks', () => {
    const a = 200, b = 120, s = 1 / Math.SQRT2
    const cpX = [a, a * s, 0, -a * s, -a, -a * s, 0, a * s]
    const cpY = [0, b * s, b, b * s, 0, -b * s, -b, -b * s]
    const knots = [0, 1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8]
    const mapX = [0, 7, 6, 5, 4, 3, 2, 1]
    const mapY = [4, 3, 2, 1, 0, 7, 6, 5]
    const id = 'sym-oval'
    const curve: Curve = {
      id, kind: 'bspline', degree: 3, closed: true,
      controlPoints: cpX.map((x, i) => ({ x, y: cpY[i] })), knots,
    }
    useSceneStore.setState({
      curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id,
      generate: null, preserveCurvatureExtrema: true, symmetryMaps: { mapX, mapY },
    })
    const bound = (c: Curve & { controlPoints: Point2D[] }) =>
      curvatureExtremaNumeratorPlanarPeriodic(
        c.controlPoints.map((p) => p.x), c.controlPoints.map((p) => p.y), c.knots, c.degree,
      ).signChanges()
    const start = bound(cur(id))
    const k = 1, sx = cpX[k], sy = cpY[k], move = { x: 45, y: 30 }
    for (let step = 1; step <= 10; step++) {
      const t = step / 10
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      const c = cur(id)
      expect(bound(c), `step ${step}: bound rose past ${start}`).toBeLessThanOrEqual(start)
      const x = c.controlPoints.map((p) => p.x), y = c.controlPoints.map((p) => p.y)
      for (let i = 0; i < x.length; i++) {
        expect(Math.abs(x[mapX[i]] - x[i]), `step ${step}: x-mirror broken at ${i}`).toBeLessThan(1e-6)
        expect(Math.abs(y[mapX[i]] + y[i]), `step ${step}: x-mirror broken at ${i}`).toBeLessThan(1e-6)
        expect(Math.abs(x[mapY[i]] + x[i]), `step ${step}: y-mirror broken at ${i}`).toBeLessThan(1e-6)
        expect(Math.abs(y[mapY[i]] - y[i]), `step ${step}: y-mirror broken at ${i}`).toBeLessThan(1e-6)
      }
    }
    const c = cur(id)
    const dAfter = Math.hypot(c.controlPoints[k].x - (sx + move.x), c.controlPoints[k].y - (sy + move.y))
    expect(dAfter, 'dragged CP did not follow').toBeLessThan(Math.hypot(move.x, move.y))
  }, 30000)

  it('open arch, y-axis mirror: symmetry exact, bound non-increasing, tracks', () => {
    const n = 8, d = 3
    const cpX = [-210, -150, -90, -30, 30, 90, 150, 210]
    const cpY = [0, 120, 180, 200, 200, 180, 120, 0]
    const knots = [0, 0, 0, 0, 0.2, 0.4, 0.6, 0.8, 1, 1, 1, 1]
    const mapY = Array.from({ length: n }, (_, i) => n - 1 - i)
    const id = 'sym-arch'
    const curve: Curve = {
      id, kind: 'bspline', degree: d, closed: false,
      controlPoints: cpX.map((x, i) => ({ x, y: cpY[i] })), knots,
    }
    useSceneStore.setState({
      curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id,
      generate: null, preserveCurvatureExtrema: true, symmetryMaps: { mapX: null, mapY },
    })
    const bound = (c: Curve & { controlPoints: Point2D[] }) =>
      curvatureExtremaNumeratorPlanar(
        c.controlPoints.map((p) => p.x), c.controlPoints.map((p) => p.y), c.knots, c.degree,
      ).signChanges()
    const start = bound(cur(id))
    const k = 2, sx = cpX[k], sy = cpY[k], move = { x: -25, y: 35 }
    for (let step = 1; step <= 10; step++) {
      const t = step / 10
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      const c = cur(id)
      expect(bound(c), `step ${step}: bound rose past ${start}`).toBeLessThanOrEqual(start)
      const x = c.controlPoints.map((p) => p.x), y = c.controlPoints.map((p) => p.y)
      for (let i = 0; i < n; i++) {
        expect(Math.abs(x[mapY[i]] + x[i]), `step ${step}: y-mirror broken at ${i}`).toBeLessThan(1e-6)
        expect(Math.abs(y[mapY[i]] - y[i]), `step ${step}: y-mirror broken at ${i}`).toBeLessThan(1e-6)
      }
    }
    const c = cur(id)
    const dAfter = Math.hypot(c.controlPoints[k].x - (sx + move.x), c.controlPoints[k].y - (sy + move.y))
    expect(dAfter, 'dragged CP did not follow').toBeLessThan(Math.hypot(move.x, move.y))
  }, 30000)
})
