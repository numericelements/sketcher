// ============================================================================
// Closed-PH display reads the SOLVED object (Law 3: displayed == enforced).
//
// The "S =" readout, the extrema markers, and the constraint bar for closed PH
// come from R of the generator (closedPHConstraintState / closedPHExtremaMarkers)
// — the same quantity slideClosedPHCurveBound enforces — NOT from the periodic
// view's curve-span g. Reason (measured in the editor): the view is a ~1e-6 LS
// fit; at a graze of g that hair turns a touch into two crossings and the view's
// count flickered 4→6→4 while the enforced count held 4.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { fitClosedPHSpline } from '../optimizer/phCurve'
import { createBSpline } from '../utils/bspline/utilities'
import {
  closedPHConstraintState, closedPHExtremaMarkers, closedPHReducedBound,
  curvatureExtremaMarkers, cyclicSignChanges,
} from '../../core'
import type { Curve, Point2D, PHMetadataAny } from '../types/curve'

type PHMeta = {
  uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number
  origin: { x: number; y: number }; seamContinuity?: number; wrapSign?: number
}

function freshPH(id: string) {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  const ph = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
  const curve: Curve = { id, kind: 'bspline', degree: ph.degree, closed: true, controlPoints: ph.controlPoints as Point2D[], knots: ph.knots }
  useSceneStore.setState({
    curves: [curve], phMetadata: new Map<string, PHMetadataAny>([[id, ph.metadata as PHMetadataAny]]),
    selectedCurveId: id, generate: null, preserveCurvatureExtrema: true,
  })
  return ph
}

describe('closed-PH display metric = the solved object', () => {
  it('state is coherent: domain, bound, markers all from ONE R', () => {
    const ph = freshPH('coherence')
    const m = ph.metadata as PHMeta
    const st = closedPHConstraintState(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)

    // R lives on the curve's display domain [0,1] — bar positions plot directly.
    expect(st.grevilleAbscissae[0]).toBeCloseTo(0, 12)
    expect(st.grevilleAbscissae[st.grevilleAbscissae.length - 1]).toBeCloseTo(1, 12)

    // The displayed bound (cyclic count of the state's signs — what BottomPanel
    // renders) IS the enforced bound.
    const displayed = cyclicSignChanges(st.signs, true)
    const enforced = closedPHReducedBound(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)
    expect(displayed).toBe(enforced)

    // Law 1 on screen: S⁻ ≥ number of markers drawn.
    const markers = closedPHExtremaMarkers(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)
    expect(displayed).toBeGreaterThanOrEqual(markers.length)

    // Away from a knife edge, R's crossings and the periodic VIEW's g crossings
    // are the same physical extrema (sign(R) = sign(g_curve); the view is a
    // ~1e-6 fit): same count here, positions within 1e-3 in t.
    const cur = useSceneStore.getState().curves[0] as Curve & { controlPoints: Point2D[] }
    const viewMarkers = curvatureExtremaMarkers(
      'bspline',
      cur.controlPoints.map((p) => p.x), cur.controlPoints.map((p) => p.y), [], [],
      cur.knots, cur.degree ?? 5, true,
    )
    expect(markers.length).toBe(viewMarkers.length)
    const near = (t: number) => viewMarkers.some((tv) => Math.min(Math.abs(tv - t), 1 - Math.abs(tv - t)) < 1e-3)
    for (const t of markers) expect(near(t), `R marker at t=${t} has no view counterpart`).toBe(true)
  })

  it('drag: the DISPLAYED bound never rises tick-to-tick (the 4→6→4 flicker is gone)', () => {
    const id = 'no-flicker'
    freshPH(id)
    const get = () => useSceneStore.getState()
    const meta = () => get().phMetadata.get(id)! as unknown as PHMeta
    const displayedBound = () => {
      const m = meta()
      const st = closedPHConstraintState(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree)
      return cyclicSignChanges(st.signs, true)
    }
    const markersDrawn = () => {
      const m = meta()
      return closedPHExtremaMarkers(m.uControlPoints, m.vControlPoints, m.uvKnots, m.uvDegree).length
    }
    const curve = () => get().curves.find((c) => c.id === id)! as Curve & { controlPoints: Point2D[] }
    // Two dragged points (an interior and a near-seam CP), many small ticks —
    // the regime where the view's count flickered.
    for (const k of [7, 45]) {
      const start = { ...curve().controlPoints[k] }
      let prev = displayedBound()
      for (let s = 1; s <= 8; s++) {
        const t = s / 8
        get().moveControlPoint(id, k, { x: start.x + 55 * t, y: start.y - 40 * t })
        const now = displayedBound()
        expect(now, `CP ${k} tick ${s}: displayed bound rose ${prev}→${now}`).toBeLessThanOrEqual(prev)
        // The one test, on screen, every tick: S⁻ ≥ markers drawn. The RAW
        // finder broke this (S=8 with 10 dots at a near-merge noise dip) —
        // markers must come from the count's own robust sign assignment.
        const nm = markersDrawn()
        expect(nm, `CP ${k} tick ${s}: ${nm} markers drawn under S=${now}`).toBeLessThanOrEqual(now)
        prev = now
      }
    }
  }, 240000)
})
