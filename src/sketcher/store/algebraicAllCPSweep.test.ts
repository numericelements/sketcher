// ============================================================================
// ALL control points follow the mouse — the algebraic families' edition of the
// direction contract (the E16 lesson: the closed-PH seam bug shipped because no
// test dragged EVERY control point through the real store route; single-index
// drag tests missed it). Six routes: polynomial / rational / complex-rational
// × open / closed, each on core's trust-region engine.
//
// Contract per CP (3 ticks, 50px pull, fresh curve per drag):
//   - moves WITH the pull (along > 0): no backward movers
//   - never flies (|disp| < 1.2·pull)
//   - median along ≥ 10px across the route's CPs
// A CP that cannot move at all (along ≈ 0) also fails — that is the warn+drop
// path firing, i.e. a routing regression, exactly what this pin is for.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { createBSpline } from '../utils/bspline/utilities'
import type { Curve, Point2D } from '../types/curve'

function basePoints(n: number, closed: boolean): Point2D[] {
  const pts: Point2D[] = []
  if (closed) {
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n
      pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
    }
  } else {
    for (let i = 0; i < n; i++) {
      pts.push({ x: 40 + (280 / n) * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) + 18 * Math.cos((Math.PI * i) / 3) })
    }
  }
  return pts
}

type Kind = 'bspline' | 'rational' | 'complex-rational'

function freshCurve(id: string, kind: Kind, closed: boolean): Curve {
  const bs = createBSpline(basePoints(closed ? 12 : 10, closed), 3, closed) as {
    controlPoints: Point2D[]; degree: number; knots: number[]
  }
  let curve: Curve
  if (kind === 'bspline') {
    curve = { id, kind, degree: bs.degree, closed, controlPoints: bs.controlPoints, knots: bs.knots }
  } else if (kind === 'rational') {
    const w = bs.controlPoints.map((_, i) => 1 + 0.1 * Math.sin(i * 1.7))
    curve = {
      id, kind, degree: bs.degree, closed, knots: bs.knots,
      controlPoints: bs.controlPoints.map((p, i) => ({ x: p.x, y: p.y, w: w[i] })),
    } as Curve
  } else {
    curve = {
      id, kind, degree: bs.degree, closed, knots: bs.knots,
      controlPoints: bs.controlPoints.map((p, i) => ({
        re: p.x, im: p.y, w_re: 1 + 0.08 * Math.cos(i * 1.3), w_im: 0.05 * Math.sin(i * 2.1),
      })),
    } as Curve
  }
  useSceneStore.setState({
    curves: [curve], selectedCurveId: id, generate: null,
    preserveCurvatureExtrema: true, phMetadata: new Map(),
  })
  return curve
}

const cpXY = (c: Curve, k: number): Point2D => {
  const p = c.controlPoints[k] as { x?: number; y?: number; re?: number; im?: number }
  return { x: p.x ?? p.re ?? 0, y: p.y ?? p.im ?? 0 }
}

function sweep(kind: Kind, closed: boolean) {
  const probe = freshCurve('probe', kind, closed)
  const n = probe.controlPoints.length
  const pull = { x: 40, y: -30 }
  const pl = Math.hypot(pull.x, pull.y)
  const alongs: number[] = []
  for (let k = 0; k < n; k++) {
    const id = `sweep-${kind}-${closed}-${k}`
    freshCurve(id, kind, closed)
    const get = () => useSceneStore.getState().curves.find((c) => c.id === id)!
    const start = cpXY(get(), k)
    for (let s = 1; s <= 3; s++) {
      const t = s / 3
      useSceneStore.getState().moveControlPoint(id, k, { x: start.x + pull.x * t, y: start.y + pull.y * t })
    }
    const after = cpXY(get(), k)
    const disp = { x: after.x - start.x, y: after.y - start.y }
    const along = (disp.x * pull.x + disp.y * pull.y) / pl
    const mag = Math.hypot(disp.x, disp.y)
    expect(along, `${kind} ${closed ? 'closed' : 'open'} CP ${k}: must move WITH the pull (got ${along.toFixed(1)}px)`).toBeGreaterThan(0)
    expect(mag, `${kind} ${closed ? 'closed' : 'open'} CP ${k}: must not overshoot (|disp| ${mag.toFixed(1)})`).toBeLessThan(1.2 * pl)
    alongs.push(along)
  }
  const med = alongs.slice().sort((a, b) => a - b)[Math.floor(alongs.length / 2)]
  console.log(`${kind} ${closed ? 'closed' : 'open'}: median along ${med.toFixed(1)}px  min ${Math.min(...alongs).toFixed(1)}  max ${Math.max(...alongs).toFixed(1)}`)
  expect(med, `${kind} ${closed ? 'closed' : 'open'}: median along ${med.toFixed(1)}px`).toBeGreaterThanOrEqual(10)
}

describe('algebraic drags: every CP follows the mouse (all six routes)', () => {
  it('polynomial open', () => sweep('bspline', false), 120000)
  it('polynomial closed', () => sweep('bspline', true), 120000)
  it('rational open', () => sweep('rational', false), 120000)
  it('rational closed', () => sweep('rational', true), 240000)
  it('complex-rational open', () => sweep('complex-rational', false), 120000)
  it('complex-rational closed', () => sweep('complex-rational', true), 240000)
})
