import { describe, it, expect } from 'vitest'
import { buildPeriodicPHCurve, computePHCurveFromUV } from '../phCurveConstruction'
import { buildPeriodicPHCurve as legacyBuild } from '../../sketcher/optimizer/phClosedSplineFit'
import { fitClosedPHSpline } from '../../sketcher/optimizer/phClosedSplineFit'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// Core closed-PH construction (buildPeriodicPHCurve) must match the legacy clamped→periodic
// conversion control-point-for-control-point. Open construction (computePHCurveFromUV) is
// already core; this completes construction parity (open + closed) in core.

function closedPHMeta(shape: 'wobble' | 'ellipse') {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    if (shape === 'wobble') pts.push({ x: 170 * Math.cos(a) + 14 * Math.sin(3 * a), y: 95 * Math.sin(a) })
    else pts.push({ x: 180 * Math.cos(a), y: 90 * Math.sin(a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!.metadata as Extract<ReturnType<typeof fitClosedPHSpline>, NonNullable<unknown>>['metadata'] & { kind: 'polynomial' }
}

describe('core buildPeriodicPHCurve matches legacy (closed PH construction)', () => {
  for (const shape of ['wobble', 'ellipse'] as const) {
    it(`clamped→periodic conversion is control-point-identical: ${shape}`, () => {
      const m = closedPHMeta(shape) as Extract<{ kind: 'polynomial'; uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number }; seamContinuity?: number }, { kind: 'polynomial' }>
      const clamped = computePHCurveFromUV(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, m.origin.x, m.origin.y)
      const seamC = m.seamContinuity ?? 2
      const core = buildPeriodicPHCurve(clamped.controlPoints, clamped.knots, seamC)
      const leg = legacyBuild(clamped.controlPoints, clamped.knots, seamC)

      expect(core.degree).toBe(leg.degree)
      expect(core.knots.length).toBe(leg.knots.length)
      expect(core.controlPoints.length).toBe(leg.controlPoints.length)
      for (let i = 0; i < leg.knots.length; i++) expect(core.knots[i]).toBeCloseTo(leg.knots[i], 12)
      let maxDiff = 0
      for (let i = 0; i < leg.controlPoints.length; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(core.controlPoints[i].x - leg.controlPoints[i].x), Math.abs(core.controlPoints[i].y - leg.controlPoints[i].y))
      }
      expect(maxDiff).toBeLessThan(1e-7)
    })
  }
})
