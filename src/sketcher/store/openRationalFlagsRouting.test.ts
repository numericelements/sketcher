import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { complexCurvatureConstraintState, cyclicSignChanges, familyInflectionBound, rational } from '../../core'
import type { Curve, WeightedPoint2D, PHMetadataAny } from '../types/curve'

// Migration (fable branch): open RATIONAL drags with preserveInflections used to divert
// to the legacy optimizer — but legacy ignores that flag for rational curves entirely
// (optimizeRationalCurveInternal reads neither preserveInflections, symmetryMaps, nor
// anchors), so the guard deferred to a no-op. All open rational extrema drags now take
// core slide(), where preserveInflections is REAL: core enforces f = det[H,H′,H″]
// (rationalInflection.test.ts). Pins the core-path signature: weights frozen to 9 dp,
// curvature bound never rises, INFLECTION bound never rises, the CP tracks.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

function injectOpenRational(id = 'rat-flags'): string {
  const curve: Curve = {
    id, kind: 'rational', degree: DEGREE, closed: false,
    controlPoints: X0.map((x, i) => ({ x, y: Y0[i], w: W0[i] })), knots: KNOTS,
  }
  useSceneStore.setState({
    curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id,
    generate: null, preserveCurvatureExtrema: true, preserveInflections: true,
  })
  return id
}

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)! as Curve & { controlPoints: WeightedPoint2D[] }
const boundOf = (c: Curve & { controlPoints: WeightedPoint2D[] }) => {
  const cps = c.controlPoints
  const { signs } = complexCurvatureConstraintState(
    cps.map((p) => p.x), cps.map((p) => p.y), cps.map((p) => p.w), cps.map(() => 0),
    c.knots, c.degree, false, { re: 1, im: 0 },
  )
  return cyclicSignChanges(signs, false)
}

describe('open rational with preserveInflections: now on core (fable migration)', () => {
  it('bound never rises, weights frozen to 9 dp (core signature), CP tracks the cursor', () => {
    const id = injectOpenRational()
    const start = boundOf(cur(id))
    const fBoundOf = (c: Curve & { controlPoints: WeightedPoint2D[] }) =>
      familyInflectionBound('rational', c.controlPoints.map((p) => rational(p.x, p.y, p.w)), c.knots, c.degree, 'open')
    const fStart = fBoundOf(cur(id))
    const k = 3
    const sx = cur(id).controlPoints[k].x, sy = cur(id).controlPoints[k].y
    const move = { x: 55, y: 200 }
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      expect(boundOf(cur(id)), `step ${s}: bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(fBoundOf(cur(id)), `step ${s}: inflection bound rose past ${fStart}`).toBeLessThanOrEqual(fStart)
    }
    const cps = cur(id).controlPoints
    cps.forEach((p, i) => {
      expect(p.w, `weight ${i} changed (would mean a different path)`).toBeCloseTo(W0[i], 9)
    })
    const target = { x: sx + move.x, y: sy + move.y }
    const moveLen = Math.hypot(move.x, move.y)
    const draggedErr = Math.hypot(cps[k].x - target.x, cps[k].y - target.y)
    // Honest level at migration time: ~53% of the pull lands (err ~110/207). Legacy
    // "tracked" ~97% on this drag but ONLY by letting the displayed bound grow 2→10
    // (measured — see legacyVsCoreOpenRationalBound.test.ts). Better tracking must
    // come from solver quality / the tight open bound (#28), never from that.
    expect(draggedErr, `CP did not follow cursor (err ${draggedErr.toFixed(1)} of ${moveLen.toFixed(0)})`).toBeLessThan(0.6 * moveLen)
  }, 30000)
})
