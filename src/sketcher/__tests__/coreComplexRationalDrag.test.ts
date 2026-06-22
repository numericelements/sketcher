import { describe, it, expect } from 'vitest'
import { slideComplexRational, curvatureExtremaNumeratorComplexPeriodic, type ComplexPoint } from '../../core'
import { initializeFarinPositionsFromComplexWeights } from '../utils/farinPoints'
import { uniformPeriodicKnots } from '../utils/bspline'

/**
 * Guards the LIVE closed complex-rational drag, which now routes through core
 * slideComplexRational (banded arrowhead, weights held fixed) — see
 * sceneStore.moveControlPoint. Mirrors that flow: drag a control point, then
 * recompute the Farin handles from the moved points (initializeFarinPositionsFrom
 * ComplexWeights, the same derivation the store uses). Asserts the result is finite,
 * the curvature-extrema bound never grows, and the Farin recompute is finite.
 */

const DEG = 3

// Unit-weight closed complex-rational (ρ = 1) — what the editor's circle-arc / Möbius
// curves are, in the store's clean periodic knot convention.
function oval(n: number): { cps: ComplexPoint[]; knots: number[] } {
  const cps: ComplexPoint[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    cps.push({ re: 170 * Math.cos(a), im: 90 * Math.sin(a), w_re: 1, w_im: 0 })
  }
  return { cps, knots: uniformPeriodicKnots(n) }
}

const sc = (cps: ComplexPoint[], knots: number[]) =>
  curvatureExtremaNumeratorComplexPeriodic(
    cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.w_re), cps.map((p) => p.w_im), knots, DEG,
  ).signChanges()

describe('core complex-rational drag (live sketcher path)', () => {
  it('finite + curvature-extrema bound never grows over a chained drag, Farin recomputable', () => {
    for (const n of [12, 24]) {
      const { cps, knots } = oval(n)
      const start = sc(cps, knots)
      for (const di of [0, Math.floor(n / 2)]) {
        let pts = cps
        const tx = pts[di].re + 35, ty = pts[di].im - 50
        for (let f = 1; f <= 4; f++) {
          const r = slideComplexRational(
            pts, knots, DEG, di,
            cps[di].re + (tx - cps[di].re) * (f / 4), cps[di].im + (ty - cps[di].im) * (f / 4),
            { maxIterations: 20, enableBFGS: false },
          )
          pts = r.points
          expect(pts.every((p) => Number.isFinite(p.re) && Number.isFinite(p.im))).toBe(true)
          // Farin handles must be recomputable from the moved points (store does this).
          const farin = initializeFarinPositionsFromComplexWeights(pts, true)
          expect(farin.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
        }
        expect(sc(pts, knots)).toBeLessThanOrEqual(start)
      }
    }
  })

  // Closed REAL-rational drag rides the SAME core path with w_im = 0 (a real-rational
  // NURBS is a complex-rational with imaginary weight 0 — identical curve). Mirrors
  // the store: (x,y,w) → (re,im,w_re=w,w_im=0), slide, write (x,y) back; t-values fixed.
  it('real-rational (w_im=0, non-unit weights): bound never grows, weights ride fixed', () => {
    for (const n of [12, 24]) {
      const knots = uniformPeriodicKnots(n)
      // WeightedPoint2D-style closed curve with non-unit real weights.
      const wp = Array.from({ length: n }, (_, i) => {
        const a = (2 * Math.PI * i) / n
        return { x: 170 * Math.cos(a), y: 90 * Math.sin(a), w: 1 + 0.4 * Math.cos(2 * a) }
      })
      const toCR = (q: typeof wp): ComplexPoint[] => q.map((p) => ({ re: p.x, im: p.y, w_re: p.w, w_im: 0 }))
      const start = sc(toCR(wp), knots)
      for (const di of [0, Math.floor(n / 2)]) {
        let cur = wp.map((p) => ({ ...p }))
        const tx = cur[di].x + 30, ty = cur[di].y - 45
        for (let f = 1; f <= 4; f++) {
          const r = slideComplexRational(
            toCR(cur), knots, DEG, di, wp[di].x + (tx - wp[di].x) * (f / 4), wp[di].y + (ty - wp[di].y) * (f / 4),
            { maxIterations: 20, enableBFGS: false },
          )
          cur = r.points.map((p, i) => ({ x: p.re, y: p.im, w: cur[i].w })) // weights ride fixed
          expect(cur.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
        }
        expect(sc(toCR(cur), knots)).toBeLessThanOrEqual(start)
      }
    }
  })
})
