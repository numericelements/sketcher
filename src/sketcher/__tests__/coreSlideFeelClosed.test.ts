import { describe, it, expect } from 'vitest'
import { slideCurve, curvatureExtremaNumeratorPlanarPeriodic, closedCurvatureExtremaParameters } from '../../core'
import { uniformPeriodicKnots } from '../utils/bspline'

/**
 * Editing-feel + bound guard for the LIVE closed-B-spline drag, which now also runs
 * on core slideCurve (closed → band + low-rank seam "arrowhead" solve) — see
 * sceneStore.moveControlPoint, where a closed b-spline with a CLEAN periodic knot
 * vector (n strictly-increasing knots in [0,1), period 1 — what uniformPeriodicKnots
 * produces) routes to core.
 *
 * What this locks: over a chained drag the result is finite (no NaN) and the
 * curvature-extrema count never grows — the two hard guarantees, on BOTH gentle and
 * hard drags. Plus, for GENTLE drags (room under the bound), the per-frame motion
 * stays proportional to the cursor and the point tracks. Hard drags that drive into
 * the closed curvature bound legitimately produce a coordinated multi-point snap
 * (true of the dense/legacy solver too — the closed KKT system is near-singular at
 * the limit), so feel/tracking are asserted only on the gentle family.
 */

const DEG = 3
const FRAMES = 15

// A smooth closed curve (squashed ellipse) in the store's periodic convention:
// n control points, knots = uniformPeriodicKnots(n) = [0, 1/n, …, (n-1)/n].
function oval(n: number) {
  const x: number[] = [], y: number[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    x.push(170 * Math.cos(a))
    y.push(90 * Math.sin(a))
  }
  return { x, y, knots: uniformPeriodicKnots(n) }
}

const sc = (x: number[], y: number[], k: number[]) =>
  curvatureExtremaNumeratorPlanarPeriodic(x, y, k, DEG).signChanges()
const ex = (x: number[], y: number[], k: number[]) =>
  closedCurvatureExtremaParameters(x, y, k, DEG).length

function chainedDrag(n: number, di: number, dx: number, dy: number) {
  const { x: X0, y: Y0, knots } = oval(n)
  let x = X0.slice(), y = Y0.slice()
  const sx = X0[di], sy = Y0[di], tx = sx + dx, ty = sy + dy
  let maxJump = 0, anyNaN = false
  for (let i = 0; i < FRAMES; i++) {
    const f = (i + 1) / FRAMES
    const px = x.slice(), py = y.slice()
    const r = slideCurve(x, y, knots, DEG, di, sx + (tx - sx) * f, sy + (ty - sy) * f, {
      method: 'ipopt', bandedSolve: true, closed: true, maxIterations: 20, enableBFGS: false,
    })
    x = r.x; y = r.y
    for (let k = 0; k < x.length; k++) {
      maxJump = Math.max(maxJump, Math.hypot(x[k] - px[k], y[k] - py[k]))
      if (!isFinite(x[k]) || !isFinite(y[k])) anyNaN = true
    }
  }
  return {
    x, y, knots, maxJump, step: Math.hypot(dx, dy) / FRAMES, anyNaN,
    trackMiss: Math.hypot(x[di] - tx, y[di] - ty),
  }
}

// GENTLE drags with room under the bound; HARD drags that drive into it.
const GENTLE: [number, number, number][] = [[5, 12, 8], [10, -10, 8], [3, 10, 10]]
const HARD: [number, number, number][] = [[0, 0, -120], [8, 90, 0], [3, 60, 60], [8, 120, 0]]

describe('core slideCurve closed-B-spline editing feel (live path)', () => {
  it('GUARANTEES: finite + curvature-extrema count never grows (gentle AND hard)', () => {
    for (const n of [12, 24]) {
      const { x: X0, y: Y0, knots } = oval(n)
      const startSc = sc(X0, Y0, knots), startEx = ex(X0, Y0, knots)
      for (const [di, dx, dy] of [...GENTLE, ...HARD]) {
        const m = chainedDrag(n, di, dx, dy)
        expect(m.anyNaN).toBe(false)
        expect(sc(m.x, m.y, m.knots)).toBeLessThanOrEqual(startSc)
        expect(ex(m.x, m.y, m.knots)).toBeLessThanOrEqual(startEx)
      }
    }
  })

  it('GENTLE FEEL: per-frame deformation stays proportional to the cursor step', () => {
    for (const n of [12, 24]) {
      for (const [di, dx, dy] of GENTLE) {
        const m = chainedDrag(n, di, dx, dy)
        expect(m.maxJump / m.step).toBeLessThan(2.2)
      }
    }
  })

  it('GENTLE TRACKING: a gentle drag substantially reaches the cursor', () => {
    for (const [di, dx, dy] of GENTLE) {
      const m = chainedDrag(24, di, dx, dy)
      // Bound may hold the last pixel or two; require it covers most of the pull.
      expect(m.trackMiss).toBeLessThan(0.5 * Math.hypot(dx, dy))
    }
  })
})
