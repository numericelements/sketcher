import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../../core'
import type { Curve, WeightedPoint2D, PHMetadataAny } from '../types/curve'

// The OPEN real-rational editor drag now runs on the core generic slide(). It must hold the
// DISPLAYED bound (S⁻ via complexCurvatureConstraintState, w_im=0 — BottomPanel's recipe),
// keep weights fixed, and — the FEEL contract — the DRAGGED control point follows the cursor.

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]

function injectOpenRational(id = 'r'): string {
  const curve: Curve = {
    id, kind: 'rational', degree: DEGREE, closed: false,
    controlPoints: X0.map((x, i) => ({ x, y: Y0[i], w: 1 })), knots: KNOTS,
  }
  useSceneStore.setState({ curves: [curve], phMetadata: new Map<string, PHMetadataAny>(), selectedCurveId: id, generate: null, preserveCurvatureExtrema: true })
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

describe('open rational editing: core slide() holds the bound and FEELS right', () => {
  it('dragged CP follows the cursor; weights fixed; bound never rises; stays open', () => {
    const id = injectOpenRational()
    const start = boundOf(cur(id))
    const k = 3
    const w0 = cur(id).controlPoints.map((p) => p.w)
    const sx = cur(id).controlPoints[k].x, sy = cur(id).controlPoints[k].y
    const move = { x: 60, y: 220 }
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      useSceneStore.getState().moveControlPoint(id, k, { x: sx + move.x * t, y: sy + move.y * t })
      expect(boundOf(cur(id)), `step ${s}: open rational bound rose past ${start}`).toBeLessThanOrEqual(start)
      expect(cur(id).closed).toBeFalsy()
    }
    const cps = cur(id).controlPoints
    // weights untouched (fixed-weight drag)
    cps.forEach((p, i) => expect(p.w, `weight ${i} changed`).toBeCloseTo(w0[i], 9))
    // FEEL — the dragged CP follows the cursor.
    const target = { x: sx + move.x, y: sy + move.y }
    const moveLen = Math.hypot(move.x, move.y)
    const draggedErr = Math.hypot(cps[k].x - target.x, cps[k].y - target.y)
    expect(draggedErr, `dragged CP did not follow cursor (err ${draggedErr.toFixed(1)} of move ${moveLen.toFixed(0)})`).toBeLessThan(0.5 * moveLen)
  }, 30000)
})
