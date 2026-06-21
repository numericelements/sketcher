import { describe, it, expect } from 'vitest'
import { slideCurve } from '../../core'

/**
 * Editing-feel guard for the LIVE open-B-spline drag, which now runs on core
 * slideCurve (banded, scaled-robust) — see sceneStore.moveControlPoint. The
 * companion editingFeel.test.ts guards the legacy optimizeCurve path; this guards
 * the core path the editor actually uses for open b-splines.
 *
 * History: core slideCurve was once kept OUT of the live drag because its
 * post-solve bisect-back guard made the dragged point LURCH (2.5–3× the cursor
 * step) when pushing against the bound. With the robust scaled-robust solver the
 * bound is preserved by the solve itself, so the bisect-back never fires and the
 * motion stays proportional to the cursor. This locks that: no lurch, reaches
 * reachable cursors, no NaN.
 */

const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const DEG = 3
const FRAMES = 15

function chainedDrag(di: number, dx: number, dy: number) {
  let x = X0.slice(), y = Y0.slice()
  const sx = X0[di], sy = Y0[di], tx = sx + dx, ty = sy + dy
  let maxJump = 0, anyNaN = false
  for (let i = 0; i < FRAMES; i++) {
    const f = (i + 1) / FRAMES
    const px = x.slice(), py = y.slice()
    const r = slideCurve(x, y, KNOTS, DEG, di, sx + (tx - sx) * f, sy + (ty - sy) * f, {
      method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false,
    })
    x = r.x; y = r.y
    for (let k = 0; k < x.length; k++) {
      maxJump = Math.max(maxJump, Math.hypot(x[k] - px[k], y[k] - py[k]))
      if (!isFinite(x[k]) || !isFinite(y[k])) anyNaN = true
    }
  }
  return { x, y, maxJump, step: Math.hypot(dx, dy) / FRAMES, anyNaN, trackMiss: Math.hypot(x[di] - tx, y[di] - ty) }
}

// Reachable (don't engage the bound) and STRONG (drive against it) — same families
// as editingFeel.
const REACHABLE: [number, number, number][] = [[2, -50, -30], [4, 50, 30]]
const STRONG: [number, number, number][] = [[3, 0, 200], [2, 0, 250], [1, 0, 180], [3, 150, 150]]

describe('core slideCurve open-B-spline editing feel (live path)', () => {
  it('CONTINUITY: per-frame deformation stays proportional to the cursor step (no lurch)', () => {
    for (const [di, dx, dy] of [...REACHABLE, ...STRONG]) {
      const m = chainedDrag(di, dx, dy)
      expect(m.anyNaN).toBe(false)
      // ≈1.0× ideal; ~1.24× measured pushing hard against the bound; 1.8× has margin
      // yet would catch a bisect-back lurch (2.5–3×).
      expect(m.maxJump / m.step).toBeLessThan(1.8)
    }
  })

  it('TRACKING: a reachable drag reaches the cursor (not stuck)', () => {
    for (const [di, dx, dy] of REACHABLE) {
      const m = chainedDrag(di, dx, dy)
      expect(m.trackMiss).toBeLessThan(2)
    }
  })
})
