import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { evaluateCurve } from '../utils/bspline/core'
import type { Curve, PHMetadataAny, WeightedPoint2D } from '../types/curve'

// Regression: closing a curve by merging endpoints reduces the control-point count
// (n → n−1). A drag's rAF-coalesced move can fire AFTER the close with the captured
// (now out-of-bounds) draggedPointIndex. Writing newPoints[oldLast] there used to
// EXTEND the array — a weightless {x,y} CP for rational + a CP/knot count mismatch —
// degenerating the curve (straight line for polynomial, NaN/vanishing for rational).
// moveControlPoint must drop such a stale move.
function openRational(): string {
  const id = 'r'
  const curve: Curve = {
    id,
    kind: 'rational',
    degree: 3,
    closed: false,
    knots: [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1],
    controlPoints: [
      { x: 68.36, y: 132.11, w: 1 },
      { x: -12.77, y: 116.5, w: 1 },
      { x: -58.36, y: 77.39, w: 1 },
      { x: -54.04, y: 32.33, w: 1 },
      { x: 14.26, y: 8.42, w: 1 },
      { x: 94.82, y: 49.61, w: 1 },
    ] as WeightedPoint2D[],
  }
  useSceneStore.setState({ curves: [curve], selectedCurveId: id, preserveCurvatureExtrema: false, phMetadata: new Map<string, PHMetadataAny>() })
  return id
}

const curveOf = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)!

describe('close-then-stale-move race (the vanishing rational bug)', () => {
  it('drops a moveControlPoint whose index is out of bounds after closing', () => {
    const id = openRational()
    const n = curveOf(id).controlPoints.length // 6

    // Close by dragging the LAST point onto the first (the user's gesture).
    useSceneStore.getState().closeCurveByMergingEndpoints(id, n - 1)
    const afterClose = curveOf(id)
    expect(afterClose.closed).toBe(true)
    expect(afterClose.controlPoints.length).toBe(n - 1) // 5
    expect(afterClose.knots.length).toBe(afterClose.controlPoints.length) // periodic: 1 knot/CP

    // The queued rAF move fires AFTER the close with the STALE index (old last = 5),
    // now out of bounds on the 5-CP closed curve.
    useSceneStore.getState().moveControlPoint(id, n - 1, { x: 52.89, y: 178.56 })

    const c = curveOf(id)
    // Not extended, no malformed (weightless) CP, counts still consistent.
    expect(c.controlPoints.length).toBe(n - 1)
    expect(c.controlPoints.every((p) => typeof (p as WeightedPoint2D).w === 'number' && Number.isFinite((p as WeightedPoint2D).w))).toBe(true)
    expect(c.knots.length).toBe(c.controlPoints.length)
    // And the curve still renders (finite samples) rather than vanishing.
    for (const t of [0, 0.25, 0.5, 0.75, 0.999]) {
      const p = evaluateCurve(c, t)
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
    }
  })
})
