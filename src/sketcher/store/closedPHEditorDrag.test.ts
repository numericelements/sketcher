import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitClosedPHSpline } from '../optimizer/phCurve'
import { createBSpline } from '../utils/bspline/utilities'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

// STORE-LEVEL closed-PH drag pin — the test whose absence let the E14 wiring
// regression (periodic CPs passed where CLAMPED targets are required → NaN
// objective → silently frozen control points) reach the editor. Drives
// moveControlPoint end-to-end with extrema preservation ON and asserts the
// dragged periodic CP actually MOVES toward the cursor, the curve stays
// closed-PH-shaped (finite CPs, same count), across several ticks.

function injectClosedPH(id = 'ph-editor-drag') {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
  const curve: Curve = {
    id, kind: 'bspline', degree: ph.degree, closed: true,
    controlPoints: ph.controlPoints as Point2D[], knots: ph.knots,
  }
  const phMetadata = new Map<string, PHMetadataAny>([[id, ph.metadata as PHMetadataAny]])
  useSceneStore.setState({
    curves: [curve], phMetadata, selectedCurveId: id, generate: null,
    preserveCurvatureExtrema: true,
  })
  return id
}

describe('closed-PH drag through the editor store (E14 wiring)', () => {
  it('the dragged control point moves toward the cursor; curve stays sane', () => {
    const id = injectClosedPH()
    const get = () => useSceneStore.getState().curves.find((c) => c.id === id)! as Curve & { controlPoints: Point2D[] }
    const k = 4
    const start = { ...get().controlPoints[k] }
    const nCP0 = get().controlPoints.length
    const move = { x: 55, y: -45 }
    for (let s = 1; s <= 6; s++) {
      const t = s / 6
      useSceneStore.getState().moveControlPoint(id, k, { x: start.x + move.x * t, y: start.y + move.y * t })
      const c = get()
      expect(c.controlPoints.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), `step ${s}: NaN CPs`).toBe(true)
      expect(c.closed, `step ${s}: lost closed flag`).toBeTruthy()
    }
    const after = get().controlPoints
    // count can shift slightly if the periodic refit changes representation; must stay close
    expect(Math.abs(after.length - nCP0)).toBeLessThanOrEqual(2)
    // the essential regression assertion: the dragged point MOVED meaningfully
    // toward the cursor (the frozen-points bug had it at ~0)
    const nearest = after.reduce((m, p) => Math.min(m, Math.hypot(p.x - (start.x + move.x), p.y - (start.y + move.y))), Infinity)
    const moved = Math.hypot(move.x, move.y) - nearest
    expect(moved, `dragged CP moved only ${moved.toFixed(1)}px of ${Math.hypot(move.x, move.y).toFixed(0)}`).toBeGreaterThan(10)
  }, 120000)
})
