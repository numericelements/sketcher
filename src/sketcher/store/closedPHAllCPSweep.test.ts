// ============================================================================
// ALL control points follow the mouse — the closed-PH drag's direction contract.
//
// Born from a feel report ("one control point moves in the opposite direction")
// and an all-48-CP sweep that measured it: seam-region CPs moved BACKWARD
// (k=41–44, down to −5.8px on a 50px pull) and the seam CP overshot wildly
// (k=45: 92px). Two causes, both fixed in slideClosedPHCurveBound:
//   1. The solve ran over the FULL generator, so projectClosurePH's expand()
//      snap discarded the solved wrap tail — 60–170px collateral per tick.
//      Now the solve lives in phSeamMaps' free coordinates (seam continuity
//      exact throughout; the projection is only the small ∮w²=0 Newton).
//   2. Targets were mapped onto the CLAMPED chart, whose end CPs are clamping
//      BLENDS of the seam CPs (not copies) — the map pulled the wrong points.
//      Now the objective tracks the PERIODIC CPs (the user's actual handles)
//      through the fit operator P.
// Reference sweep after the fix (2026-07-04): every CP +6.6 to +35.2px along
// the pull, none backward, none flying. This test pins that contract on the
// seam region (all of k=40..47) plus a spread of interior CPs.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitClosedPHSpline } from '../optimizer/phCurve'
import { createBSpline } from '../utils/bspline/utilities'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

function freshPH(id: string) {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
  const curve: Curve = { id, kind: 'bspline', degree: ph.degree, closed: true, controlPoints: ph.controlPoints as Point2D[], knots: ph.knots }
  useSceneStore.setState({
    curves: [curve], phMetadata: new Map<string, PHMetadataAny>([[id, ph.metadata as PHMetadataAny]]),
    selectedCurveId: id, generate: null, preserveCurvatureExtrema: true,
  })
  return ph
}

describe('closed-PH drag: every CP follows the mouse', () => {
  it('seam region + interior spread: forward along the pull, never flying', () => {
    const probe = freshPH('probe')
    const nPer = probe.controlPoints.length
    // All seam-region indices (the historical failures) + every 4th interior CP.
    const ks = new Set<number>()
    for (let k = Math.max(0, nPer - 8); k < nPer; k++) ks.add(k)
    for (let k = 0; k < nPer - 8; k += 4) ks.add(k)

    const pull = { x: 40, y: -30 }
    const pl = Math.hypot(pull.x, pull.y)
    const alongs: number[] = []
    for (const k of ks) {
      const id = `sweep-${k}`
      freshPH(id)
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
      // The contract: forward motion, no flying. (Reference: min +6.6, max 35.2.)
      expect(along, `CP ${k} must move WITH the pull (got ${along.toFixed(1)}px)`).toBeGreaterThan(0)
      expect(mag, `CP ${k} must not overshoot (|disp| ${mag.toFixed(1)}px on a ${pl.toFixed(0)}px pull)`).toBeLessThan(1.2 * pl)
      alongs.push(along)
    }
    // Median tracking floor — the sweep's central tendency, loose to stay robust.
    const med = alongs.slice().sort((a, b) => a - b)[Math.floor(alongs.length / 2)]
    expect(med, `median along-pull ${med.toFixed(1)}px`).toBeGreaterThanOrEqual(10)
  }, 240000)
})
