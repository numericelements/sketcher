import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../../core'
import type { Curve, ComplexPoint, PHMetadataAny } from '../types/curve'

// Migration (fork 2, sub-step #1): open complex-rational drags with `preserveInflections`
// (and `symmetryMaps`) used to divert to the LEGACY optimizer — but legacy ignores those
// flags for complex-rational (OptimizeOptions wires them only for the polynomial path), so
// the guard was widened to route ALL open complex-rational (anchorWeight===0) to core slide().
// This pins that the flagged case now takes the CORE path: weights stay frozen to 9 dp (core's
// signature — legacy's open complex solve does not freeze them this way) and the CP tracks.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const RE0 = [-152, -180, -263, -152, 20, 180, 207]
const IM0 = [17, -79, -184, -235, -212, -278, -346]

function injectOpenComplex(id = 'cr-flags'): string {
  const curve: Curve = {
    id, kind: 'complex-rational', degree: DEGREE, closed: false,
    controlPoints: RE0.map((re, i) => ({ re, im: IM0[i], w_re: 1, w_im: 0 })), knots: KNOTS,
  }
  // preserveInflections:true — the flag that previously forced this drag onto legacy.
  useSceneStore.setState({ curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id, generate: null, preserveCurvatureExtrema: true, preserveInflections: true })
  return id
}

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)! as Curve & { controlPoints: ComplexPoint[] }
const boundOf = (c: Curve & { controlPoints: ComplexPoint[] }) => {
  const cps = c.controlPoints
  const { signs } = complexCurvatureConstraintState(
    cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.w_re), cps.map((p) => p.w_im),
    c.knots, c.degree, false, { re: 1, im: 0 },
  )
  return cyclicSignChanges(signs, false)
}

describe('open complex-rational with preserveInflections: now on core (migration fork 2 #1)', () => {
  it('bound never rises, weights frozen to 9 dp (core signature), CP tracks the cursor', () => {
    const id = injectOpenComplex()
    const start = boundOf(cur(id))
    const k = 3
    const w0 = cur(id).controlPoints.map((p) => ({ wr: p.w_re, wi: p.w_im }))
    const sx = cur(id).controlPoints[k].re, sy = cur(id).controlPoints[k].im
    const move = { x: 60, y: 220 }
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      expect(boundOf(cur(id)), `step ${s}: bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBeFalsy()
    }
    const cps = cur(id).controlPoints
    cps.forEach((p, i) => {
      expect(p.w_re, `w_re ${i} changed (would mean legacy path)`).toBeCloseTo(w0[i].wr, 9)
      expect(p.w_im, `w_im ${i} changed (would mean legacy path)`).toBeCloseTo(w0[i].wi, 9)
    })
    const target = { x: sx + move.x, y: sy + move.y }
    const moveLen = Math.hypot(move.x, move.y)
    const draggedErr = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    expect(draggedErr, `CP did not follow cursor (err ${draggedErr.toFixed(1)} of ${moveLen.toFixed(0)})`).toBeLessThan(0.5 * moveLen)
  }, 30000)
})
