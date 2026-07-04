// ============================================================================
// Open-PH drag on the trust-region engine, constrained on the REDUCED numerator
// R (F7). Bench vs the old interior-point engine on g (2026-07-04, 10-tick
// drags, mid-CP, 3 sizes):
//   nGen  7: old 87% @ 95ms   new 98% @ 21ms
//   nGen 13: old 92% @265ms   new 96% @ 80ms
//   nGen 25: old 85% @923ms   new 95% @342ms
// The objective weights are load-bearing: uniform weights let the anchors fight
// the drag (42–56% tracked); the legacy weights (dragged 10, endpoints 5, else
// 1) recover it. R is the ENFORCED and DISPLAYED metric (Law 3); the loose
// degree-14 g polygon may register knife-edge pairs R does not — Z(g) ≡ Z(R)
// exactly, so no real extremum can appear while R holds.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { fitPHSplineToBSpline } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import { computePHCurveFromUV } from '../phCurveConstruction'
import { slideOpenPHCurveBound, openPHReducedBound, openPHConstraintState, openPHExtremaMarkers } from '../phCurveBoundDrag'
import { cyclicSignChanges } from '../index'
import type { Point2D } from '../../sketcher/types/curve'

function fixture(nPts: number) {
  const pts: Point2D[] = []
  for (let i = 0; i < nPts; i++) {
    pts.push({ x: 40 + (280 / nPts) * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) + 18 * Math.cos((Math.PI * i) / 3) })
  }
  const bs = createBSpline(pts, 3, false) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitPHSplineToBSpline(bs.controlPoints, bs.knots)!
}

describe('open-PH trust-region drag on R', () => {
  it('tracks (≥80% floor), holds R, editor-grade cost — three sizes', () => {
    for (const nPts of [8, 14, 26]) {
      const ph = fixture(nPts)
      const m = ph.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number } }
      let u = m.uControlPoints.slice(), v = m.vControlPoints.slice()
      let x0 = m.origin.x, y0 = m.origin.y
      const kDrag = Math.floor(ph.controlPoints.length / 2)
      const start0 = ph.controlPoints[kDrag] as Point2D
      const move = { x: 70, y: -120 }
      const startR = openPHReducedBound(u, v, m.uvKnots, m.uvDegree)
      const t0 = performance.now()
      for (let s = 1; s <= 10; s++) {
        const f = s / 10
        const cursor = { x: start0.x + move.x * f, y: start0.y + move.y * f }
        const cur = computePHCurveFromUV(u, v, m.uvKnots, m.uvDegree, x0, y0)
        const targets = cur.controlPoints.map((p, i) => (i === kDrag ? cursor : { x: p.x, y: p.y }))
        const M = targets.length
        const targetWeights = targets.map((_, i) => (i === kDrag ? 10 : i === 0 || i === M - 1 ? 5 : 1))
        const r = slideOpenPHCurveBound(u, v, x0, y0, m.uvKnots, m.uvDegree, targets, { maxNumSteps: 30, targetWeights })
        u = r.u; v = r.v; x0 = r.x0; y0 = r.y0
        expect(openPHReducedBound(u, v, m.uvKnots, m.uvDegree), `nPts=${nPts} tick ${s}: R rose`).toBeLessThanOrEqual(startR)
      }
      const ms = (performance.now() - t0) / 10
      const fin = computePHCurveFromUV(u, v, m.uvKnots, m.uvDegree, x0, y0)
      const p = fin.controlPoints[kDrag]
      const err = Math.hypot(p.x - (start0.x + move.x), p.y - (start0.y + move.y))
      const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
      console.log(`OPEN-PH-TR nGen=${m.uControlPoints.length}: tracked ${tracked.toFixed(0)}%  ${ms.toFixed(0)}ms/tick`)
      expect(tracked, `nPts=${nPts}: tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(80)
      expect(ms, `nPts=${nPts}: ${ms.toFixed(0)}ms/tick`).toBeLessThan(1500)
    }
  }, 240000)

  it('display coherence: S= from state == enforced R bound; markers ≤ S; domain [0,1]', () => {
    const ph = fixture(14)
    const m = ph.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number }
    const st = openPHConstraintState(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)
    const displayed = cyclicSignChanges(st.signs, false)
    expect(displayed).toBe(openPHReducedBound(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree))
    const markers = openPHExtremaMarkers(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)
    expect(displayed).toBeGreaterThanOrEqual(markers.length)
    expect(st.grevilleAbscissae[0]).toBeCloseTo(0, 12)
    expect(st.grevilleAbscissae[st.grevilleAbscissae.length - 1]).toBeCloseTo(1, 12)
  })
})
