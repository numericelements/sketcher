import { describe, it, expect } from 'vitest'
import {
  slideClosedPHCurveBound, closedPHReducedBound, periodicFitOperator, projectClosurePH, buildPeriodicPHViaOperator,
  computePHCurveFromUV as corePHCurve, buildPeriodicPHCurve, generatorBasisGram, closureGap,
} from '../index'
import { fitClosedPHSpline } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// E14 PRODUCTION ACCEPTANCE (see phCurveBoundDrag.ts + lab notebook E14).
// Census baseline at nCP=51: tracking −30%, raw curve bound 8→12, editor ≈0%.
// FD bench measured ~20% with the bound STRICTLY held. The production function
// (analytic chain) must reproduce that with editor-grade cost.

function census16gon() {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
}

describe('closed-PH curve-span drag (E14 production)', () => {
  const ph = census16gon()
  const m0 = ph.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number }; seamContinuity?: number; wrapSign?: number }
  const seamContinuity = m0.seamContinuity ?? 2
  const wrapSign = m0.wrapSign ?? 1

  it('the linear fit operator P reproduces buildPeriodicPHCurve', () => {
    const clamped = corePHCurve(m0.uControlPoints, m0.vControlPoints, m0.uvKnots, m0.uvDegree, m0.origin.x, m0.origin.y)
    const ref = buildPeriodicPHCurve(clamped.controlPoints as Point2D[], clamped.knots, seamContinuity)
    const op = periodicFitOperator(clamped.knots, seamContinuity, clamped.controlPoints.length)
    expect(op.P.length).toBe(ref.controlPoints.length)
    let worst = 0
    for (let r = 0; r < op.P.length; r++) {
      let x = 0, y = 0
      for (let j = 0; j < clamped.controlPoints.length; j++) {
        x += op.P[r][j] * clamped.controlPoints[j].x
        y += op.P[r][j] * clamped.controlPoints[j].y
      }
      worst = Math.max(worst, Math.abs(x - ref.controlPoints[r].x), Math.abs(y - ref.controlPoints[r].y))
    }
    expect(worst, `operator vs buildPeriodicPHCurve: ${worst.toExponential(2)}`).toBeLessThan(1e-6)
  })

  it('drag at nCP=51: bound STRICTLY held via the editor guard, real tracking, editor-grade cost', () => {
    const uvKnots = m0.uvKnots, uvDeg = m0.uvDegree
    const N = m0.uControlPoints.length
    const G = generatorBasisGram(uvKnots, uvDeg, N)
    let u = m0.uControlPoints.slice(), v = m0.vControlPoints.slice()
    let x0 = m0.origin.x, y0 = m0.origin.y
    const probe = buildPeriodicPHViaOperator(u, v, uvKnots, uvDeg, x0, y0, seamContinuity)
    const dragIdx = Math.min(4, probe.controlPoints.length - 1)
    const start0 = probe.controlPoints[dragIdx]
    const move = { x: 70, y: -55 }
    const t0 = performance.now()
    for (let s = 1; s <= 10; s++) {
      const f = s / 10
      const cursor = { x: start0.x + move.x * f, y: start0.y + move.y * f }
      const tickU = u.slice(), tickV = v.slice()
      const tickStartBound = closedPHReducedBound(u, v, uvKnots, uvDeg)
      const cur = buildPeriodicPHViaOperator(u, v, uvKnots, uvDeg, x0, y0, seamContinuity)
      const targets = cur.controlPoints.map((p, i) => (i === dragIdx ? cursor : { x: p.x, y: p.y }))
      const r = slideClosedPHCurveBound(u, v, x0, y0, uvKnots, uvDeg, targets,
        { seamContinuity, wrapSign }, { maxNumSteps: 30, passes: 2 })
      u = r.u; v = r.v; x0 = r.x0; y0 = r.y0
      // EDITOR GUARD (faithful): bisect the generator path w/ re-projection on violation
      if (closedPHReducedBound(u, v, uvKnots, uvDeg) > tickStartBound) {
        const at = (a: number) => {
          const ua = tickU.map((val, i) => val + a * (u[i] - val))
          const va = tickV.map((val, i) => val + a * (v[i] - val))
          return projectClosurePH(ua, va, uvKnots, uvDeg, seamContinuity, wrapSign, G)
        }
        let lo = 0, hi = 1
        for (let it2 = 0; it2 < 20; it2++) {
          const mid = (lo + hi) / 2
          const cand = at(mid)
          if (closedPHReducedBound(cand.u, cand.v, uvKnots, uvDeg) <= tickStartBound) lo = mid
          else hi = mid
        }
        const kept = at(lo)
        u = kept.u; v = kept.v
      }
      const bNow = closedPHReducedBound(u, v, uvKnots, uvDeg)
      expect(bNow, `tick ${s}: bound rose`).toBeLessThanOrEqual(tickStartBound)
      const gap = closureGap(u, v, G)
      expect(Math.hypot(gap.re, gap.im), `tick ${s}: not closed`).toBeLessThan(1e-5)
    }
    const ms = (performance.now() - t0) / 10
    const fin = buildPeriodicPHViaOperator(u, v, uvKnots, uvDeg, x0, y0, seamContinuity)
    const err = Math.hypot(fin.controlPoints[dragIdx].x - (start0.x + move.x), fin.controlPoints[dragIdx].y - (start0.y + move.y))
    const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
    console.log(`E14-PROD nCP=${probe.controlPoints.length}: tracked ${tracked.toFixed(0)}%  ${ms.toFixed(0)}ms/tick  (R metric; g_per metric read 49% @306ms — see notebook: the tight cage registers merges)`)
    expect(tracked, `tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(12)
    expect(ms, `ms/tick ${ms.toFixed(0)}`).toBeLessThan(2000)
  }, 240000)
})
