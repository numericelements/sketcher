// ============================================================================
// ALL control points follow the mouse — open-PH edition of the direction
// contract (the E16 testing lesson: a single-index drag test shipped a closed-PH
// seam region where points moved BACKWARD; sweep EVERY CP through the real
// store route). Open PH has no seam, but the clamped endpoints and the
// generator least-squares coupling are its own risk zones.
// Reference sweep at landing (2026-07-04, TR engine on R, 3 ticks, 50px pull):
// all CPs forward; endpoints strongest (weight 5), interiors +10..+45px.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitPHSplineToBSpline } from '../optimizer/phCurve'
import { createBSpline } from '../utils/bspline/utilities'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

function freshOpenPH(id: string) {
  const pts: Point2D[] = []
  for (let i = 0; i < 10; i++) pts.push({ x: 40 + 22 * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) + 18 * Math.cos((Math.PI * i) / 3) })
  const bs = createBSpline(pts, 3, false) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitPHSplineToBSpline(bs.controlPoints, bs.knots)!
  const curve: Curve = { id, kind: 'bspline', degree: ph.degree, knots: ph.knots, controlPoints: ph.controlPoints, closed: false }
  useSceneStore.setState({
    curves: [curve], phMetadata: new Map<string, PHMetadataAny>([[id, ph.metadata]]),
    selectedCurveId: id, generate: null, preserveCurvatureExtrema: true,
  })
  return ph
}

describe('open-PH drag: every CP follows the mouse', () => {
  it('all CPs: forward along the pull, never flying', () => {
    const probe = freshOpenPH('probe')
    const n = probe.controlPoints.length
    const pull = { x: 40, y: -30 }
    const pl = Math.hypot(pull.x, pull.y)
    const alongs: number[] = []
    for (let k = 0; k < n; k++) {
      const id = `sweep-${k}`
      freshOpenPH(id)
      const get = () => useSceneStore.getState().curves.find((c) => c.id === id)! as Curve & { controlPoints: Point2D[] }
      const start = { ...get().controlPoints[k] }
      for (let s = 1; s <= 3; s++) {
        const t = s / 3
        useSceneStore.getState().moveControlPoint(id, k, { x: start.x + pull.x * t, y: start.y + pull.y * t })
      }
      const after = get().controlPoints[k]
      const disp = { x: after.x - start.x, y: after.y - start.y }
      const along = (disp.x * pull.x + disp.y * pull.y) / pl
      const mag = Math.hypot(disp.x, disp.y)
      expect(along, `CP ${k} must move WITH the pull (got ${along.toFixed(1)}px)`).toBeGreaterThan(0)
      expect(mag, `CP ${k} must not overshoot (|disp| ${mag.toFixed(1)}px on a ${pl.toFixed(0)}px pull)`).toBeLessThan(1.2 * pl)
      alongs.push(along)
    }
    const med = alongs.slice().sort((a, b) => a - b)[Math.floor(alongs.length / 2)]
    expect(med, `median along-pull ${med.toFixed(1)}px`).toBeGreaterThanOrEqual(10)
  }, 240000)
})
