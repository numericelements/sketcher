// E27: rational Farin drag under preserve rides the core 1-D count-guarded
// walk (no lateral directions — no substitution, no ratchet, by construction).
import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import { curvatureExtremaNumeratorComplex, curvatureExtremaNumeratorComplexPeriodic, assignSignsNeighbor, cyclicSignChanges } from '../../core'
import type { Curve, Point2D } from '../types/curve'

type RCP = { x: number; y: number; w: number }

function inject(id: string, closed: boolean): Curve {
  const n = closed ? 12 : 10
  const pts: Point2D[] = []
  for (let i = 0; i < n; i++) {
    if (closed) {
      const a = (2 * Math.PI * i) / n
      pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
    } else pts.push({ x: 40 + 28 * i, y: 120 + 70 * Math.sin((Math.PI * i) / 5) })
  }
  const knots: number[] = []
  if (closed) for (let i = 0; i < n; i++) knots.push(i / n)
  else {
    for (let i = 0; i < 4; i++) knots.push(0)
    for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
    for (let i = 0; i < 4; i++) knots.push(1)
  }
  const curve = {
    id, kind: 'rational', degree: 3, closed, knots,
    controlPoints: pts.map((p, i) => ({ x: p.x, y: p.y, w: 1 + 0.1 * Math.sin(i * 1.7) })),
  } as unknown as Curve
  useSceneStore.setState({ curves: [curve], selectedCurveId: id, generate: null, preserveCurvatureExtrema: true, phMetadata: new Map() })
  return curve
}
const boundOf = (c: Curve) => {
  const cps = c.controlPoints as unknown as RCP[]
  const X = cps.map((p) => p.x), Y = cps.map((p) => p.y), W = cps.map((p) => p.w), Z = cps.map(() => 0)
  if (!c.closed) return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplex(X, Y, W, Z, c.knots, c.degree ?? 3).flatCoeffs()), false)
  const wrap = (c as unknown as { wrapWeight?: number }).wrapWeight ?? W[0]
  return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplexPeriodic(X, Y, W, Z, c.knots, c.degree ?? 3, { re: wrap / W[0], im: 0 }).flatCoeffs()), true)
}
const tOf = (c: Curve, e: number) => {
  const cps = c.controlPoints as unknown as RCP[]
  const n = cps.length
  const w0 = cps[e].w
  const w1 = c.closed && e === n - 1 ? ((c as unknown as { wrapWeight?: number }).wrapWeight ?? cps[0].w) : cps[(e + 1) % n].w
  return w1 / (w0 + w1)
}

describe('rational Farin drag (core 1-D walk, preserve ON)', () => {
  it('open + closed (incl. wrap edge): t moves toward the pull, bound held every tick', () => {
    for (const [closed, fi] of [[false, 4], [true, 3], [true, 11]] as const) {
      const id = `rf-${closed}-${fi}`
      inject(id, closed)
      const get = () => useSceneStore.getState().curves.find((c) => c.id === id)!
      const cps = get().controlPoints as unknown as RCP[]
      const n = cps.length
      const A = cps[fi], B = cps[(fi + 1) % n]
      const t0 = tOf(get(), fi)
      // pull the handle along its edge toward B (t → larger)
      const startB = boundOf(get())
      for (let s = 1; s <= 5; s++) {
        const tt = t0 + (0.75 - t0) * (s / 5)
        useSceneStore.getState().moveFarinPoint(id, fi, { x: A.x + tt * (B.x - A.x), y: A.y + tt * (B.y - A.y) })
        expect(boundOf(get()), `${closed ? 'closed' : 'open'} edge ${fi} tick ${s}: bound rose`).toBeLessThanOrEqual(startB)
      }
      const tEnd = tOf(get(), fi)
      expect(tEnd, `${closed ? 'closed' : 'open'} edge ${fi}: t did not advance (t0 ${t0.toFixed(3)} → ${tEnd.toFixed(3)})`).toBeGreaterThan(t0 + 0.03)
    }
  }, 120000)
})
