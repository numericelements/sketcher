// E26-C trial wiring: the OPEN complex Farin drag under preserve rides the core
// ANCHORED ratio+CP solve (anchor 100). Store-level contract: the Farin point
// follows the pull, the raw bound never rises, and the drag actually applies
// (a dead handle = routing regression).
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { curvatureExtremaNumeratorComplex, assignSignsNeighbor, cyclicSignChanges, computeComplexFarinPoints } from '../../core'
import type { Curve, Point2D } from '../types/curve'

type CP = { re: number; im: number; w_re: number; w_im: number }

function inject(id: string): Curve {
  const n = 10
  const pts: Point2D[] = []
  for (let i = 0; i < n; i++) pts.push({ x: 40 + 28 * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) })
  const knots: number[] = []
  for (let i = 0; i < 4; i++) knots.push(0)
  for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
  for (let i = 0; i < 4; i++) knots.push(1)
  const curve = {
    id, kind: 'complex-rational', degree: 3, closed: false, knots,
    controlPoints: pts.map((p, i) => ({ re: p.x, im: p.y, w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1) })),
  } as unknown as Curve
  useSceneStore.setState({ curves: [curve], selectedCurveId: id, generate: null, preserveCurvatureExtrema: true, phMetadata: new Map() })
  return curve
}
const boundOf = (c: Curve) => {
  const cps = c.controlPoints as unknown as CP[]
  return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplex(
    cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.w_re), cps.map((p) => p.w_im),
    c.knots, c.degree ?? 3).flatCoeffs()), false)
}

describe('open complex Farin drag (core anchored, preserve ON)', () => {
  it('follows the pull, bound held, handle alive', () => {
    inject('cf')
    const id = 'cf'
    const get = () => useSceneStore.getState().curves.find((c) => c.id === id)!
    const fi = 4
    const f0 = computeComplexFarinPoints(get() as never)[fi]
    const start = { ...f0.position }
    const move = { x: 20, y: -28 }
    const startB = boundOf(get())
    for (let s = 1; s <= 6; s++) {
      const t = s / 6
      useSceneStore.getState().moveFarinPoint(id, fi, { x: start.x + move.x * t, y: start.y + move.y * t })
      expect(boundOf(get()), `tick ${s}: bound rose`).toBeLessThanOrEqual(startB)
    }
    const fEnd = computeComplexFarinPoints(get() as never)[fi]
    const along = ((fEnd.position.x - start.x) * move.x + (fEnd.position.y - start.y) * move.y) / Math.hypot(move.x, move.y)
    // Alive and forward (anchored solve measured ~50-77% on hard pulls; this
    // is a moderate pull — require meaningful motion, not a exact floor).
    expect(along, `farin moved ${along.toFixed(1)}px along a ${Math.hypot(move.x, move.y).toFixed(0)}px pull`).toBeGreaterThan(5)
  }, 120000)
})
