import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import {
  curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorComplexPeriodic,
} from '../../core'
import { evaluateCurve } from '../utils/bspline/core'
import { uniformPeriodicKnots, periodicKnotsWithJunction } from '../utils/bspline'
import type { Curve, ComplexPoint, PHMetadataAny, WeightedPoint2D } from '../types/curve'

// Guards the store-level routing in moveControlPoint: with preserveCurvatureExtrema on
// and NO PH metadata, a CLEAN periodic closed curve (n knots in [0,1), strictly
// increasing, last < 1) must take the fast core/ path (slideCurve / slideComplexRational),
// while a JUNCTION-knot closed curve (the C⁰-cusp convention) must fall through to the
// legacy optimizer. Both paths must keep the curve well-formed (counts consistent, finite
// samples) and never grow the curvature-extrema count S⁻ — the editor's signature bound.

const curveOf = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)!

function setOne(curve: Curve) {
  useSceneStore.setState({
    curves: [curve],
    selectedCurveId: curve.id,
    preserveCurvatureExtrema: true,
    phMetadata: new Map<string, PHMetadataAny>(),
    symmetryMaps: null,
  })
}

// A clean periodic oval (the core/ smooth-periodic model): n knots i/n in [0,1).
function ovalXY(n: number): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return { x: 170 * Math.cos(a), y: 90 * Math.sin(a) }
  })
}

const scBspline = (c: Curve) =>
  curvatureExtremaNumeratorPlanarPeriodic(
    (c.controlPoints as { x: number; y: number }[]).map((p) => p.x),
    (c.controlPoints as { x: number; y: number }[]).map((p) => p.y),
    c.knots, c.degree,
  ).signChanges()

const scRational = (c: Curve) => {
  const cps = c.controlPoints as WeightedPoint2D[]
  return curvatureExtremaNumeratorComplexPeriodic(
    cps.map((p) => p.x), cps.map((p) => p.y),
    cps.map((p) => p.w), cps.map(() => 0), c.knots, c.degree,
  ).signChanges()
}

const scComplex = (c: Curve) => {
  const cps = c.controlPoints as ComplexPoint[]
  return curvatureExtremaNumeratorComplexPeriodic(
    cps.map((p) => p.re), cps.map((p) => p.im),
    cps.map((p) => p.w_re), cps.map((p) => p.w_im), c.knots, c.degree,
  ).signChanges()
}

function finitePoints(c: Curve): boolean {
  return c.controlPoints.every((p) => {
    if (c.kind === 'complex-rational') {
      const q = p as ComplexPoint
      return Number.isFinite(q.re) && Number.isFinite(q.im)
    }
    const q = p as { x: number; y: number }
    return Number.isFinite(q.x) && Number.isFinite(q.y)
  })
}

function assertWellFormed(c: Curve, nCP: number) {
  expect(c.controlPoints.length).toBe(nCP) // count unchanged (no stale extension)
  expect(c.knots.length).toBe(c.controlPoints.length) // periodic: 1 knot/CP
  expect(finitePoints(c)).toBe(true)
  for (const t of [0, 0.2, 0.5, 0.8, 0.999]) {
    const p = evaluateCurve(c, t)
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
  }
}

describe('moveControlPoint routing (core fast path vs legacy fallback)', () => {
  it('clean-periodic closed B-spline → core slideCurve: finite, counts kept, bound never grows', () => {
    const n = 12
    const id = 'b'
    const curve: Curve = {
      id, kind: 'bspline', degree: 3, closed: true,
      knots: uniformPeriodicKnots(n), controlPoints: ovalXY(n),
    }
    setOne(curve)
    const start = scBspline(curveOf(id))
    // Drag an interior point well inward — a real edit, not a no-op.
    useSceneStore.getState().moveControlPoint(id, 3, { x: ovalXY(n)[3].x - 60, y: ovalXY(n)[3].y + 40 })
    const c = curveOf(id)
    assertWellFormed(c, n)
    expect(scBspline(c)).toBeLessThanOrEqual(start)
  })

  it('clean-periodic closed real-rational → core slideComplexRational: finite, counts kept, bound never grows', () => {
    const n = 12
    const id = 'rr'
    const curve: Curve = {
      id, kind: 'rational', degree: 3, closed: true,
      knots: uniformPeriodicKnots(n),
      controlPoints: ovalXY(n).map((p) => ({ ...p, w: 1 })) as WeightedPoint2D[],
    }
    setOne(curve)
    const start = scRational(curveOf(id))
    useSceneStore.getState().moveControlPoint(id, 6, { x: ovalXY(n)[6].x + 55, y: ovalXY(n)[6].y - 35 })
    const c = curveOf(id)
    assertWellFormed(c, n)
    // Weights ride fixed (Farin t-values are weight ratios, position-independent).
    expect((c.controlPoints as WeightedPoint2D[]).every((p) => p.w === 1)).toBe(true)
    expect(scRational(c)).toBeLessThanOrEqual(start)
  })

  it('clean-periodic closed complex-rational → core slideComplexRational: finite, counts kept, bound never grows', () => {
    const n = 12
    const id = 'cr'
    const curve: Curve = {
      id, kind: 'complex-rational', degree: 3, closed: true,
      knots: uniformPeriodicKnots(n),
      controlPoints: ovalXY(n).map((p) => ({ re: p.x, im: p.y, w_re: 1, w_im: 0 })) as ComplexPoint[],
    }
    setOne(curve)
    const start = scComplex(curveOf(id))
    const cp4 = (curve.controlPoints as ComplexPoint[])[4]
    useSceneStore.getState().moveControlPoint(id, 4, { x: cp4.re - 45, y: cp4.im + 50 })
    assertWellFormed(curveOf(id), n)
    expect(scComplex(curveOf(id))).toBeLessThanOrEqual(start)
  })

  it('junction-knot closed B-spline → legacy optimizer fallback: still well-formed', () => {
    // periodicKnotsWithJunction places coincident knots at 0 (a C⁰ cusp), so the vector
    // is NOT strictly increasing → the cleanPeriodic gate is FALSE and the move must fall
    // through to the legacy optimizer rather than the core periodic path.
    const n = 12
    const id = 'j'
    const knots = periodicKnotsWithJunction(n, 3)
    const strictlyIncreasing = knots.every((v, i) => (i === 0 ? v >= 0 : v > knots[i - 1]))
    expect(strictlyIncreasing).toBe(false) // precondition: NOT a clean periodic vector
    const curve: Curve = { id, kind: 'bspline', degree: 3, closed: true, knots, controlPoints: ovalXY(n) }
    setOne(curve)
    const before = curveOf(id)
    const nCP = before.controlPoints.length
    const nKnots = before.knots.length
    useSceneStore.getState().moveControlPoint(id, 3, { x: ovalXY(n)[3].x - 40, y: ovalXY(n)[3].y + 30 })
    const c = curveOf(id)
    expect(c.controlPoints.length).toBe(nCP)
    expect(c.knots.length).toBe(nKnots)
    expect(finitePoints(c)).toBe(true)
    for (const t of [0, 0.25, 0.5, 0.75, 0.999]) {
      const p = evaluateCurve(c, t)
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
    }
  })
})
