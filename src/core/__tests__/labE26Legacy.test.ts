import { it } from 'vitest'
import { optimizeComplexRationalCurve } from '../../sketcher/optimizer'
import { curvatureExtremaNumeratorComplex, assignSignsNeighbor, cyclicSignChanges } from '../index'
import type { ComplexRationalBSplineCurve } from '../../sketcher/types/curve'

const n = 10, degree = 3
const knots: number[] = []
for (let i = 0; i < 4; i++) knots.push(0)
for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
for (let i = 0; i < 4; i++) knots.push(1)
const mk = () => ({
  id: 'lf', kind: 'complex-rational' as const, degree, closed: false, knots: [...knots],
  controlPoints: Array.from({ length: n }, (_, i) => ({
    re: 40 + 28 * i, im: 120 + 70 * Math.sin((Math.PI * i) / 5),
    w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1),
  })),
}) as unknown as ComplexRationalBSplineCurve
const boundOf = (c: ComplexRationalBSplineCurve) => cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplex(
  c.controlPoints.map(p => p.re), c.controlPoints.map(p => p.im),
  c.controlPoints.map(p => p.w_re), c.controlPoints.map(p => p.w_im), knots, degree).flatCoeffs()), false)
const qOf = (c: ComplexRationalBSplineCurve, e: number) => {
  const a = c.controlPoints[e], b = c.controlPoints[e + 1]
  const nre = a.w_re * a.re - a.w_im * a.im + b.w_re * b.re - b.w_im * b.im
  const nim = a.w_re * a.im + a.w_im * a.re + b.w_re * b.im + b.w_im * b.re
  const dre = a.w_re + b.w_re, dim = a.w_im + b.w_im
  const dd = dre * dre + dim * dim
  return { x: (nre * dre + nim * dim) / dd, y: (nim * dre - nre * dim) / dd }
}

it('LEGACY-DIRECT: constrained farin solver only (no store fallback)', () => {
  for (const fi of [2, 4, 6]) {
    let curve = mk()
    const start = qOf(curve, fi)
    const move = { x: 25, y: -35 }
    const startB = boundOf(curve)
    const others0 = [0, 1, 3, 5, 7, 8].filter(e => e !== fi).map(e => qOf(curve, e))
    let held = true, applied = 0
    for (let s = 1; s <= 8; s++) {
      const t = s / 8
      const res = optimizeComplexRationalCurve(curve, start.x + move.x * t, start.y + move.y * t, fi, 'farinPoint')
      if (res.converged || res.iterations > 0) {
        curve = { ...curve, controlPoints: res.controlPoints, farinPositions: res.farinPositions, wrapWeight: res.wrapWeight } as never
        applied++
      }
      if (boundOf(curve) > startB) held = false
    }
    const q = qOf(curve, fi)
    const err = Math.hypot(q.x - (start.x + move.x), q.y - (start.y + move.y))
    const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
    let worstOther = 0
    ;[0, 1, 3, 5, 7, 8].filter(e => e !== fi).forEach((e, j) => {
      const qq = qOf(curve, e)
      worstOther = Math.max(worstOther, Math.hypot(qq.x - others0[j].x, qq.y - others0[j].y))
    })
    // do the CONTROL POINTS move? (farin drag should move weights only)
    const cpMoved = Math.max(...curve.controlPoints.map((p, i2) => Math.hypot(p.re - (40 + 28 * i2), p.im - (120 + 70 * Math.sin((Math.PI * i2) / 5)))))
    console.log(`LEGACY-DIRECT farin ${fi}: tracked ${tracked.toFixed(0)}%  held=${held}  other-farin drift ${worstOther.toFixed(1)}px  CP drift ${cpMoved.toFixed(1)}px`)
  }
}, 240000)
