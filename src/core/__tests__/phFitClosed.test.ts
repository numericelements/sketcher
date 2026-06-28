import { describe, it, expect } from 'vitest'
import { fitClosedPHSpline } from '../phFit'
import { fitClosedPHSpline as legacyFitClosed } from '../../sketcher/optimizer/phClosedSplineFit'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// Core closed-PH fit must match the legacy fitClosedPHSpline: same wrap sign, same generator
// (u,v), and same periodic curve control points.

function closedStroke(shape: 'wobble' | 'ellipse'): { controlPoints: Point2D[]; knots: number[]; degree: number } {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    if (shape === 'wobble') pts.push({ x: 170 * Math.cos(a) + 14 * Math.sin(3 * a), y: 95 * Math.sin(a) })
    else pts.push({ x: 180 * Math.cos(a), y: 90 * Math.sin(a) })
  }
  return createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
}

describe('core fitClosedPHSpline matches legacy', () => {
  for (const shape of ['wobble', 'ellipse'] as const) {
    it(`wrap sign + generator + periodic curve identical: ${shape}`, () => {
      const bs = closedStroke(shape)
      const core = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
      const leg = legacyFitClosed(bs.controlPoints, bs.degree, bs.knots)!
      const lm = leg.metadata as { uControlPoints: number[]; vControlPoints: number[]; wrapSign: number; seamContinuity: number }

      expect(core.wrapSign).toBe(lm.wrapSign)
      expect(core.seamContinuity).toBe(lm.seamContinuity)

      // generator (clamped) identical
      expect(core.uControlPoints.length).toBe(lm.uControlPoints.length)
      let gdiff = 0
      for (let i = 0; i < lm.uControlPoints.length; i++) {
        gdiff = Math.max(gdiff, Math.abs(core.uControlPoints[i] - lm.uControlPoints[i]), Math.abs(core.vControlPoints[i] - lm.vControlPoints[i]))
      }
      expect(gdiff).toBeLessThan(1e-6)

      // periodic curve control points identical
      expect(core.controlPoints.length).toBe(leg.controlPoints.length)
      let cdiff = 0
      for (let i = 0; i < leg.controlPoints.length; i++) {
        cdiff = Math.max(cdiff, Math.abs(core.controlPoints[i].x - leg.controlPoints[i].x), Math.abs(core.controlPoints[i].y - leg.controlPoints[i].y))
      }
      expect(cdiff).toBeLessThan(1e-6)
    })
  }
})
