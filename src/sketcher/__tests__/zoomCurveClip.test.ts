import { describe, it, expect } from 'vitest'
import { sampleCurveAdaptiveSegments } from '../utils/bspline/utilities'
import { evaluateCurve } from '../utils/bspline/core'
import type { BSplineCurve } from '../types/curve'

/**
 * Regression: when zoomed in a lot, the curve vanished while the control polygon and
 * curvature-extrema stayed. Cause: the adaptive sampler starts with the WHOLE curve as
 * one segment; at high zoom its straight chord misses the tiny viewport even though the
 * curve bulges through it, and culling on the chord alone dropped the whole curve. A
 * coarse segment whose chord still spans more than the viewport must keep subdividing.
 */

// A bendy open cubic so a small window over an interior point excludes the endpoints
// and the parametric midpoint.
const curve: BSplineCurve = {
  id: 'c', kind: 'bspline', degree: 3, closed: false,
  knots: [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1],
  controlPoints: [
    { x: -300, y: 0 }, { x: -200, y: 220 }, { x: -80, y: -220 }, { x: 60, y: 220 },
    { x: 180, y: -220 }, { x: 280, y: 120 }, { x: 360, y: -40 },
  ],
}

describe('high-zoom curve clipping', () => {
  it('still samples the curve when a tiny viewport sits over an interior point', () => {
    // A point well away from t=0, 0.5, 1 (the coarse sample points).
    const p = evaluateCurve(curve, 0.2)
    const r = 2 // tiny world window ⇒ very high zoom
    const viewport = { minX: p.x - r, maxX: p.x + r, minY: p.y - r, maxY: p.y + r }

    const segs = sampleCurveAdaptiveSegments(curve, { tolerance: 0.5 / 80, viewport })
    const pts = segs.flat()
    expect(pts.length).toBeGreaterThan(0) // curve not dropped
    expect(pts.length).toBeLessThan(5000) // bounded (maxDepth) — high zoom doesn't sample unboundedly

    // At least one sampled point lands inside the window (the curve is drawn there).
    const inside = pts.some((q) => Math.abs(q.x - p.x) <= r * 1.5 && Math.abs(q.y - p.y) <= r * 1.5)
    expect(inside).toBe(true)
  })

  it('still culls genuinely off-screen curves (bounded work, no points)', () => {
    // Viewport far from the entire curve ⇒ nothing should be sampled, and the cull must
    // terminate (subdivision is maxDepth-bounded) rather than run away.
    const viewport = { minX: 100000, maxX: 100002, minY: 100000, maxY: 100002 }
    const segs = sampleCurveAdaptiveSegments(curve, { tolerance: 0.5 / 80, viewport })
    expect(segs.flat().length).toBe(0)
  })
})
