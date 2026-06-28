import { describe, it, expect } from 'vitest'
import { slideClosedPHTracking } from '../phDrag'
import { computePHCurveFromUV, generatorBasisGram, closureGap } from '../index'
import { fitClosedPHSpline } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// #23 — the closed-PH drag on core. The stiff in-solver closure equalities (∮w²=0 couples every
// generator var) stall core's interior-point solver, curve- and solver-dependently (measured:
// core-ipopt and core-pd each stall 0% on different curves). The FIX (slideClosedPHTracking with
// decoupleClosure): track open-style (bound only — which core handles), then restore closure with
// the exact Gram-based projectClosurePH, iterated. It tracks every curve (no stall) and stays
// closed. (Matches legacy tracking + holds the bound better — see the diagnosis.)

function closedPH(shape: 'ellipse' | 'wobble' | 'peanut' | 'flower') {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    if (shape === 'ellipse') pts.push({ x: 180 * Math.cos(a), y: 95 * Math.sin(a) })
    else if (shape === 'wobble') pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
    else if (shape === 'peanut') pts.push({ x: 150 * Math.cos(a), y: 70 * Math.sin(a) * (1 + 0.4 * Math.cos(2 * a)) })
    else pts.push({ x: 140 * Math.cos(a) + 30 * Math.cos(5 * a), y: 110 * Math.sin(a) + 20 * Math.sin(4 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
}

describe('#23 closed-PH drag on core (decoupled closure) tracks without stalling', () => {
  for (const shape of ['ellipse', 'wobble', 'peanut', 'flower'] as const) {
    it(`tracks the cursor and stays closed: ${shape}`, () => {
      const ph = closedPH(shape)
      const m: any = ph.metadata
      const seamContinuity = m.seamContinuity ?? 2, wrapSign = m.wrapSign ?? 1
      const dragIdx = Math.min(4, ph.controlPoints.length - 1)
      const start = ph.controlPoints[dragIdx]
      const move = { x: 70, y: -55 }
      const cursor = { x: start.x + move.x, y: start.y + move.y }

      // target = the re-fit of the curve with the dragged CP at the cursor (editor-faithful)
      const edited = ph.controlPoints.map((p, i) => (i === dragIdx ? cursor : { x: p.x, y: p.y }))
      const refit = fitClosedPHSpline(edited, ph.degree, ph.knots, { genKnots: m.uvKnots, seamContinuity })!
      const rm: any = refit.metadata
      const target = computePHCurveFromUV(rm.uControlPoints, rm.vControlPoints, rm.uvKnots, rm.uvDegree, rm.origin.x, rm.origin.y)

      const r = slideClosedPHTracking(
        m.uControlPoints, m.vControlPoints, m.origin.x, m.origin.y, m.uvKnots, m.uvDegree,
        target.controlPoints, { wrapSign, seamContinuity }, { maxIterations: 24, decoupleClosure: true },
      )

      // 1. NO STALL: the dragged curve point moved meaningfully toward the cursor.
      const built = computePHCurveFromUV(r.u, r.v, m.uvKnots, m.uvDegree, r.x0, r.y0)
      const moved = Math.hypot(built.controlPoints[dragIdx].x - start.x, built.controlPoints[dragIdx].y - start.y)
      expect(moved, `${shape}: dragged point stalled (moved ${moved.toFixed(1)})`).toBeGreaterThan(8)

      // 2. STAYS CLOSED: the generator still satisfies ∮w² ≈ 0 after the projection.
      const G = generatorBasisGram(m.uvKnots, m.uvDegree, r.u.length)
      const gap = closureGap(r.u, r.v, G)
      expect(Math.hypot(gap.re, gap.im), `${shape}: not closed`).toBeLessThan(1e-5)
    }, 30000)
  }
})
