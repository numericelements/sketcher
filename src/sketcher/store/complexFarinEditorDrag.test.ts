// E26-C trial wiring: the OPEN complex Farin drag under preserve rides the core
// ANCHORED ratio+CP solve (anchor 100). Store-level contract: the Farin point
// follows the pull, the raw bound never rises, and the drag actually applies
// (a dead handle = routing regression).
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { curvatureExtremaNumeratorComplex, curvatureExtremaNumeratorComplexPeriodic, assignSignsNeighbor, cyclicSignChanges, computeComplexFarinPoints } from '../../core'
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

function injectClosed(id: string): Curve {
  const n = 12
  const pts: Point2D[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const knots = Array.from({ length: n }, (_, i) => i / n)
  const curve = {
    id, kind: 'complex-rational', degree: 3, closed: true, knots,
    controlPoints: pts.map((p, i) => ({ re: p.x, im: p.y, w_re: 1 + 0.08 * Math.cos(i * 1.3), w_im: 0.05 * Math.sin(i * 2.1) })),
  } as unknown as Curve
  useSceneStore.setState({ curves: [curve], selectedCurveId: id, generate: null, preserveCurvatureExtrema: true, phMetadata: new Map() })
  return curve
}
const boundClosed = (c: Curve) => {
  const cps = c.controlPoints as unknown as CP[]
  const w0 = { re: cps[0].w_re, im: cps[0].w_im }
  const W = (c as unknown as { wrapWeight?: { re: number; im: number } }).wrapWeight ?? w0
  const d = w0.re * w0.re + w0.im * w0.im
  const rho = { re: (W.re * w0.re + W.im * w0.im) / d, im: (W.im * w0.re - W.re * w0.im) / d }
  return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplexPeriodic(
    cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.w_re), cps.map((p) => p.w_im),
    c.knots, c.degree ?? 3, rho).flatCoeffs()), true)
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

describe('CLOSED complex Farin drag (core walk, monodromy-aware, preserve ON)', () => {
  it('follows the pull, cyclic raw bound held, wrap edge included', () => {
    for (const fi of [3, 11]) { // interior edge + the WRAP edge
      injectClosed('cfc')
      const id = 'cfc'
      const get = () => useSceneStore.getState().curves.find((c) => c.id === id)!
      const f0 = computeComplexFarinPoints(get() as never)[fi]
      const start = { ...f0.position }
      // pull ALONG the edge — the classic weight-ratio edit direction (a
      // perpendicular pull may legitimately park early; the along direction
      // is the one that must feel alive)
      const eA = f0.controlPointBefore
      const eB = f0.controlPointAfter
      const eLen = Math.hypot(eB.x - eA.x, eB.y - eA.y)
      const move = { x: (20 * (eB.x - eA.x)) / eLen, y: (20 * (eB.y - eA.y)) / eLen }
      const startB = boundClosed(get())
      for (let s = 1; s <= 5; s++) {
        const t = s / 5
        useSceneStore.getState().moveFarinPoint(id, fi, { x: start.x + move.x * t, y: start.y + move.y * t })
        expect(boundClosed(get()), `edge ${fi} tick ${s}: cyclic bound rose`).toBeLessThanOrEqual(startB)
      }
      const fEnd = computeComplexFarinPoints(get() as never)[fi]
      const along = ((fEnd.position.x - start.x) * move.x + (fEnd.position.y - start.y) * move.y) / 20
      expect(along, `edge ${fi}: farin moved ${along.toFixed(1)}px along a 20px edge-pull`).toBeGreaterThan(5)
    }
  }, 120000)
})
