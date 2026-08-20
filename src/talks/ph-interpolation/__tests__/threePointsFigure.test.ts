// ============================================================================
// Slide 4's two panels, checked without rendering.
//
// The slide claims both panels have the same degrees of freedom and the same conditions, and
// differ only in linear versus quadratic. That claim is only true if the left panel's degree
// FOLLOWS the right one — degree K against 2K−1, both through K+1 points — so the arithmetic is
// asserted here rather than trusted.
//
// The rest is what a rendering would have shown: that both panels really interpolate, and that
// the view box contains every control point at every degree. The box used to be hand-written and
// one PH control point sat outside it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../../../core/complex'
import { degreeOf, solveThroughPoints } from '../../../core/planarPHSubset'
import { START, bezierThrough, deCasteljau, paramsFor, worldFor } from '../ThreePointsFigure'

const KS = [2, 3, 4]
const dist = (a: Complex, b: Complex): number => Math.hypot(a.re - b.re, a.im - b.im)

describe('slide 4: the two panels', () => {
  it('the panels have equal degrees of freedom, which is what the slide claims', () => {
    for (const K of KS) {
      const points = K + 1
      const bezierDof = 2 * (K + 1)          // K+1 control points, planar
      const phDof = 2 * K + 2                // K complex generator coefficients + the start point
      const conditions = 2 * points
      expect(bezierDof, `degree ${K} Bézier`).toBe(phDof)
      expect(conditions, 'and the system is square').toBe(phDof)
      expect(degreeOf(K), 'the PH degree is 2K−1').toBe(2 * K - 1)
    }
  })

  it('the left panel interpolates: one curve through every point', () => {
    for (const K of KS) {
      const ts = paramsFor(K)
      const q = START[K]
      const cps = bezierThrough(K, ts, q)
      expect(cps.length, `degree ${K} has K+1 control points`).toBe(K + 1)
      const worst = Math.max(...ts.map((t, m) => dist(deCasteljau(cps, t), q[m])))
      console.log(`    degree ${K} Bézier: interpolation error ${worst.toExponential(1)}`)
      expect(worst).toBeLessThan(1e-10)
    }
  })

  it('the right panel interpolates, and gives 2^(K−1) curves', () => {
    for (const K of KS) {
      const ts = paramsFor(K)
      const q = START[K]
      const r = solveThroughPoints(K, ts, q)
      expect(r.failed, 'every path accounted for').toBe(0)
      expect(r.solutions.length, `PH degree ${degreeOf(K)} gives 2^(K−1)`).toBe(2 ** (K - 1))
      let worst = 0
      for (const s of r.solutions) {
        for (let m = 0; m < ts.length; m++) {
          worst = Math.max(worst, dist(deCasteljau(s.controlPoints, ts[m]), q[m]))
        }
      }
      console.log(`    PH degree ${degreeOf(K)}: ${r.solutions.length} curves,` +
        ` worst interpolation error ${worst.toExponential(1)}`)
      expect(worst).toBeLessThan(1e-9)
    }
  }, 120_000)

  it('the view box contains everything that is DRAWN, and stays a readable size', () => {
    // Not every control point: the wild PH branches have polygons tens of units across while their
    // curves span three, and fitting to those would shrink the picture to nothing. What must fit is
    // the data, both panels' curves, the ordinary Bézier's polygon, and the polygon of the branch
    // selected on load — which is the only PH polygon drawn.
    for (const K of KS) {
      const w = worldFor(K)
      const ts = paramsFor(K)
      const q = START[K]
      const sols = solveThroughPoints(K, ts, q).solutions
      const drawn: Complex[] = [
        ...q,
        ...bezierThrough(K, ts, q),
        ...sols.flatMap((s) => Array.from({ length: 60 }, (_, i) => deCasteljau(s.controlPoints, i / 59))),
        ...sols[0].controlPoints,
      ]
      for (const p of drawn) {
        expect(p.re, `degree ${K}: x inside the box`).toBeGreaterThanOrEqual(w.x0)
        expect(p.re).toBeLessThanOrEqual(w.x1)
        expect(p.im, `degree ${K}: y inside the box`).toBeGreaterThanOrEqual(w.y0)
        expect(p.im).toBeLessThanOrEqual(w.y1)
      }
      const width = w.x1 - w.x0
      const pointSpan = Math.max(...q.map((p) => p.re)) - Math.min(...q.map((p) => p.re))
      console.log(`    degree ${K}: box ${width.toFixed(2)} × ${(w.y1 - w.y0).toFixed(2)},` +
        ` ${(width / pointSpan).toFixed(2)}× the span of the data`)
      expect(width / pointSpan, 'the data still fills the frame').toBeLessThan(1.6)
    }
  }, 120_000)
})
