import { describe, it, expect } from 'vitest'
import { fitOpenPHSpline } from '../phFit'
import { fitPHSplineToBSpline } from '../../sketcher/optimizer/phSplineFit'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// Core open-PH fit (hodograph matching) must match the legacy fitPHSplineToBSpline:
// same generator (u,v) and same fitted curve control points.

function openStroke(seed: number): { controlPoints: Point2D[]; knots: number[]; degree: number } {
  const pts: Point2D[] = []
  for (let i = 0; i < 8; i++) {
    pts.push({ x: 40 * i + 10 * Math.sin(seed + i), y: 30 * Math.sin(seed * 0.7 + i * 1.3) + 5 * i })
  }
  return createBSpline(pts, 3) as { controlPoints: Point2D[]; degree: number; knots: number[] }
}

describe('core fitOpenPHSpline matches legacy fitPHSplineToBSpline', () => {
  for (const seed of [0.3, 1.1, 2.4]) {
    it(`generator + curve control points identical: seed ${seed}`, () => {
      const bs = openStroke(seed)
      const core = fitOpenPHSpline(bs.controlPoints, bs.knots, bs.degree)!
      const leg = fitPHSplineToBSpline(bs.controlPoints, bs.knots)!
      const lm = leg.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[] }

      expect(core.uControlPoints.length).toBe(lm.uControlPoints.length)
      let gdiff = 0
      for (let i = 0; i < lm.uControlPoints.length; i++) {
        gdiff = Math.max(gdiff, Math.abs(core.uControlPoints[i] - lm.uControlPoints[i]), Math.abs(core.vControlPoints[i] - lm.vControlPoints[i]))
      }
      expect(gdiff).toBeLessThan(1e-7)

      expect(core.controlPoints.length).toBe(leg.controlPoints.length)
      let cdiff = 0
      for (let i = 0; i < leg.controlPoints.length; i++) {
        cdiff = Math.max(cdiff, Math.abs(core.controlPoints[i].x - leg.controlPoints[i].x), Math.abs(core.controlPoints[i].y - leg.controlPoints[i].y))
      }
      expect(cdiff).toBeLessThan(1e-7)
    })
  }
})
