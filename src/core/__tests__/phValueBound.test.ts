// ============================================================================
// PH curvature-VALUE bound in core: the P± certificate (rows of a polynomial
// nonnegativity certificate as trust-region inequality constraints — the
// pattern the spatial PH lab instantiates later with b²σ⁶ − |r′×r″|² ≥ 0).
// Parity vs the legacy phCurvatureBound implementation, snap restoration, and
// the drag contract: certificate never violated, cursor tracked.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { fitPHSplineToBSpline } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import { computePHCurveFromUV } from '../phCurveConstruction'
import { phValueBoundCertificate, phValueBoundMargin, phValueBoundRows, snapPHToValueBound } from '../phValueBound'
import { slideOpenPHCurveBound, openPHReducedBound } from '../phCurveBoundDrag'
import { phCurvatureBoundCoeffs } from '../../sketcher/optimizer/phCurvatureBound'
import type { Point2D } from '../../sketcher/types/curve'

function fixture(nPts = 10) {
  const pts: Point2D[] = []
  for (let i = 0; i < nPts; i++) {
    pts.push({ x: 40 + (280 / nPts) * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) + 18 * Math.cos((Math.PI * i) / 3) })
  }
  const bs = createBSpline(pts, 3, false) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitPHSplineToBSpline(bs.controlPoints, bs.knots)!
}
type Meta = { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number } }

describe('PH value bound (core)', () => {
  it('certificate matches the legacy implementation to machine precision', () => {
    const m = fixture().metadata as Meta
    for (const sub of [1, 2, 3]) {
      const core = phValueBoundCertificate(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, 0.05, sub)
      const legacy = phCurvatureBoundCoeffs(m.uControlPoints, m.vControlPoints, m.uvKnots, 0.05, sub)
      expect(core.length).toBe(legacy.length)
      const scale = Math.max(...legacy.map(Math.abs))
      let worst = 0
      for (let i = 0; i < core.length; i++) worst = Math.max(worst, Math.abs(core[i] - legacy[i]))
      expect(worst, `sub=${sub}: worst |Δ| ${worst.toExponential(2)} vs scale ${scale.toExponential(2)}`).toBeLessThan(1e-12 * scale)
    }
  })

  it('AD Jacobian matches finite differences', () => {
    const m = fixture().metadata as Meta
    const km = 0.05
    const { rows, du, dv } = phValueBoundRows(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2)
    const scale = Math.max(...rows.map(Math.abs))
    for (const j of [0, 3, m.uControlPoints.length - 1]) {
      const h = 1e-6 * (Math.abs(m.uControlPoints[j]) + 1)
      const up = m.uControlPoints.slice()
      up[j] += h
      const um = m.uControlPoints.slice()
      um[j] -= h
      const rp = phValueBoundCertificate(up, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2)
      const rm = phValueBoundCertificate(um, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2)
      for (let i = 0; i < rows.length; i += 7) {
        const fd = (rp[i] - rm[i]) / (2 * h)
        expect(Math.abs(du[j][i] - fd), `du[${j}][${i}]`).toBeLessThan(1e-4 * scale + 1e-3 * Math.abs(fd))
      }
    }
    void dv
  })

  it('snap: a violating curve is projected onto the bound (certified)', () => {
    const m = fixture().metadata as Meta
    // pick κ_max below the curve's current max curvature so it violates
    let km = 0.5
    while (phValueBoundMargin(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2) >= 0) km /= 2
    const snapped = snapPHToValueBound(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2)
    expect(snapped.certified).toBe(true)
    expect(phValueBoundMargin(snapped.u, snapped.v, m.uvKnots, m.uvDegree, km, 2)).toBeGreaterThanOrEqual(0)
  })

  it('drag under the value bound: certificate held every tick, cursor tracked', () => {
    const ph = fixture()
    const m = ph.metadata as Meta
    // a comfortably feasible bound: 2× the current max curvature need
    let km = 0.5
    while (phValueBoundMargin(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2) < 0) km *= 2
    km *= 2
    let u = m.uControlPoints.slice(), v = m.vControlPoints.slice()
    let x0 = m.origin.x, y0 = m.origin.y
    const kDrag = Math.floor(ph.controlPoints.length / 2)
    const start0 = ph.controlPoints[kDrag] as Point2D
    const move = { x: 60, y: -90 }
    const startR = openPHReducedBound(u, v, m.uvKnots, m.uvDegree)
    for (let s = 1; s <= 8; s++) {
      const f = s / 8
      const cursor = { x: start0.x + move.x * f, y: start0.y + move.y * f }
      const cur = computePHCurveFromUV(u, v, m.uvKnots, m.uvDegree, x0, y0)
      const targets = cur.controlPoints.map((p, i) => (i === kDrag ? cursor : { x: p.x, y: p.y }))
      const M = targets.length
      const targetWeights = targets.map((_, i) => (i === kDrag ? 10 : i === 0 || i === M - 1 ? 5 : 1))
      // BOTH modes each tick: value bound + extrema (the workbench's combined toggle)
      const r = slideOpenPHCurveBound(u, v, x0, y0, m.uvKnots, m.uvDegree, targets,
        { maxNumSteps: 30, targetWeights, valueBound: { kappaMax: km, subdivisions: 2 } })
      u = r.u; v = r.v; x0 = r.x0; y0 = r.y0
      expect(phValueBoundMargin(u, v, m.uvKnots, m.uvDegree, km, 2), `tick ${s}: |κ| ≤ κ_max violated`).toBeGreaterThanOrEqual(0)
      expect(openPHReducedBound(u, v, m.uvKnots, m.uvDegree), `tick ${s}: R rose`).toBeLessThanOrEqual(startR)
    }
    const fin = computePHCurveFromUV(u, v, m.uvKnots, m.uvDegree, x0, y0)
    const p = fin.controlPoints[kDrag]
    const err = Math.hypot(p.x - (start0.x + move.x), p.y - (start0.y + move.y))
    const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
    console.log(`VALUE-BOUND drag: tracked ${tracked.toFixed(0)}% under |κ|≤${km.toFixed(3)} + extrema`)
    expect(tracked, `tracked ${tracked.toFixed(0)}%`).toBeGreaterThanOrEqual(50)
  }, 120000)

  it('value-bound-only drag (constrainExtrema false): certificate held, R free to change', () => {
    const ph = fixture()
    const m = ph.metadata as Meta
    let km = 0.5
    while (phValueBoundMargin(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree, km, 2) < 0) km *= 2
    km *= 2
    let u = m.uControlPoints.slice(), v = m.vControlPoints.slice()
    let x0 = m.origin.x, y0 = m.origin.y
    const kDrag = 3
    const start0 = ph.controlPoints[kDrag] as Point2D
    for (let s = 1; s <= 5; s++) {
      const cur = computePHCurveFromUV(u, v, m.uvKnots, m.uvDegree, x0, y0)
      const cursor = { x: start0.x + 10 * s, y: start0.y - 12 * s }
      const targets = cur.controlPoints.map((p, i) => (i === kDrag ? cursor : { x: p.x, y: p.y }))
      const r = slideOpenPHCurveBound(u, v, x0, y0, m.uvKnots, m.uvDegree, targets,
        { maxNumSteps: 30, constrainExtrema: false, valueBound: { kappaMax: km, subdivisions: 2 } })
      u = r.u; v = r.v; x0 = r.x0; y0 = r.y0
      expect(phValueBoundMargin(u, v, m.uvKnots, m.uvDegree, km, 2), `tick ${s}`).toBeGreaterThanOrEqual(0)
    }
  }, 120000)
})
