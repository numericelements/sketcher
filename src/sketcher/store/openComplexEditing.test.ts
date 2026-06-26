import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../../core'
import type { Curve, ComplexPoint, PHMetadataAny } from '../types/curve'

// The OPEN complex-rational editor drag now runs on the core generic slide(). It must hold the
// DISPLAYED bound (S⁻ via complexCurvatureConstraintState — BottomPanel's recipe), keep the
// complex weights fixed, and — the FEEL contract — the DRAGGED control point follows the cursor.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const RE0 = [-152, -180, -263, -152, 20, 180, 207]
const IM0 = [17, -79, -184, -235, -212, -278, -346]

function injectOpenComplex(id = 'cr'): string {
  const curve: Curve = {
    id, kind: 'complex-rational', degree: DEGREE, closed: false,
    controlPoints: RE0.map((re, i) => ({ re, im: IM0[i], w_re: 1, w_im: 0 })), knots: KNOTS,
  }
  useSceneStore.setState({ curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id, generate: null, preserveCurvatureExtrema: true })
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

describe('open complex-rational editing: core slide() holds the bound and FEELS right', () => {
  it('dragged CP follows the cursor; weights fixed; bound never rises; stays open', () => {
    const id = injectOpenComplex()
    const start = boundOf(cur(id))
    const k = 3
    const w0 = cur(id).controlPoints.map((p) => ({ wr: p.w_re, wi: p.w_im }))
    const sx = cur(id).controlPoints[k].re, sy = cur(id).controlPoints[k].im
    const move = { x: 60, y: 220 }
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      expect(boundOf(cur(id)), `step ${s}: open complex bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBeFalsy()
    }
    const cps = cur(id).controlPoints
    cps.forEach((p, i) => {
      expect(p.w_re, `w_re ${i} changed`).toBeCloseTo(w0[i].wr, 9)
      expect(p.w_im, `w_im ${i} changed`).toBeCloseTo(w0[i].wi, 9)
    })
    const target = { x: sx + move.x, y: sy + move.y }
    const moveLen = Math.hypot(move.x, move.y)
    const draggedErr = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    expect(draggedErr, `dragged CP did not follow cursor (err ${draggedErr.toFixed(1)} of move ${moveLen.toFixed(0)})`).toBeLessThan(0.5 * moveLen)
  }, 30000)
})
