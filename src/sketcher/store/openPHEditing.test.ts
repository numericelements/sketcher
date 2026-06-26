import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitPHSplineToBSpline } from '../optimizer/phSplineFit'
import { createBSpline } from '../utils/bspline/utilities'
import { curvatureExtremaNumeratorPlanar } from '../../core'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

// The OPEN-PH editor drag (legacy optimizePHCurve). It must hold the displayed bound (S⁻ never
// rises), stay OPEN, and — the FEEL contract — the DRAGGED control point FOLLOWS THE CURSOR. (A
// PH curve is global: the generator is a least-squares fit, so moving one CP reshapes the whole
// curve — that is normal, NOT the bug. The bug the core slideOpenPH wiring had was that the
// DRAGGED point did NOT track: its objective drove the generator toward an L2 re-fit, not the
// dragged point toward the cursor, so the curve "came alive" and ignored the hand.)

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

describe('open PH editing: drag holds the bound and FEELS right', () => {
  it('the dragged CP follows the cursor; bound held; stays open', () => {
    const id = injectOpenPH()
    const start = boundOf(cur(id))
    const k = 5
    const cps0 = cur(id).controlPoints as Point2D[]
    const sx = cps0[k].x, sy = cps0[k].y
    const move = { x: 70, y: -120 }
    for (let s = 1; s <= 12; s++) {
      const t = s / 12
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      expect(boundOf(cur(id)), `step ${s}: open PH bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBeFalsy()
    }
    const cps = cur(id).controlPoints as Point2D[]
    const target = { x: sx + move.x, y: sy + move.y }
    const moveLen = Math.hypot(move.x, move.y)
    // FEEL — the DRAGGED CP follows the cursor (ends near the target, well within the move). This
    // is what the core refit→L2 wiring broke ("came alive"); legacy tracks the hand.
    const draggedErr = Math.hypot(cps[k].x - target.x, cps[k].y - target.y)
    expect(draggedErr, `dragged CP did not follow cursor (err ${draggedErr.toFixed(1)} of move ${moveLen.toFixed(0)})`).toBeLessThan(0.5 * moveLen)
  }, 30000)
})
