import { describe, it, expect } from 'vitest'
import { slideCurve, curvatureExtremaNumeratorPlanarPeriodic, assignSignsNeighbor, cyclicSignChanges } from '../index'
import { periodicKnotsWithJunction } from '../../sketcher/utils/bspline/utilities'

// A C⁰-junction (corner-seam) closed b-spline is the SAME periodic representation as a smooth
// one, with the seam knot at multiplicity = degree (F8). Core's slideCurve handles it — the
// cleanPeriodic guard's strict-increasing clause excluded it only conservatively. This pins:
// the drag holds the (core, displayed) bound and tracks, across shapes — the gate for routing
// junction curves to core instead of the legacy optimizer.

const bound = (x: number[], y: number[], k: number[], d: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(x, y, k, d).flatCoeffs()), true)

function ring(n: number, shape: string): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    if (shape === 'oval') return { x: 170 * Math.cos(a), y: 90 * Math.sin(a) }
    if (shape === 'peanut') return { x: 140 * Math.cos(a), y: 70 * Math.sin(a) * (1 + 0.4 * Math.cos(2 * a)) }
    return { x: 150 * Math.cos(a) + 14 * Math.sin(3 * a), y: 95 * Math.sin(a) } // wobble
  })
}

describe('C⁰-junction closed b-spline drag on core (slideCurve)', () => {
  for (const shape of ['oval', 'wobble', 'peanut'] as const) {
    it(`holds the bound and tracks: ${shape}`, () => {
      const n = 12, d = 3
      const cps = ring(n, shape)
      const knots = periodicKnotsWithJunction(n, d)
      let X = cps.map((p) => p.x), Y = cps.map((p) => p.y)
      const idx = 4
      const sx = X[idx], sy = Y[idx]
      const startBound = bound(X, Y, knots, d)
      const move = { x: 70, y: -55 }
      for (let s = 1; s <= 6; s++) {
        const f = s / 6
        const r = slideCurve(X, Y, knots, d, idx, sx + move.x * f, sy + move.y * f, {
          method: 'ipopt', bandedSolve: true, maxIterations: 24, enableBFGS: true, closed: true,
        })
        X = r.x; Y = r.y
        // bound never grows (Law 2, per-tick fixed knots)
        expect(bound(X, Y, knots, d), `${shape} step ${s}: bound grew past ${startBound}`).toBeLessThanOrEqual(startBound)
      }
      const moved = Math.hypot(X[idx] - sx, Y[idx] - sy)
      expect(moved, `${shape}: dragged point stalled (moved ${moved.toFixed(1)})`).toBeGreaterThan(20)
    }, 30000)
  }
})
