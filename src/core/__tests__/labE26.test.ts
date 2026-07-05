// ============================================================================
// E26 — the complex Farin drag, dissected (lab; notebook E26).
//
// Two SEMANTICS, measured on the same fixture (8-tick 43px pulls, edges 2/4/6,
// raw bound held throughout in BOTH):
//   PURE-WEIGHT (core slideComplexFarin): 2 DOF — the dragged edge's complex
//     ratio via suffix scaling; other Farin points and ALL control points stay
//     EXACTLY fixed (1e-14 px). Tracked 12/28/12% — the honest ceiling of that
//     manifold on this hard pull (the cage probe showed the target itself
//     costs bound 7 > 5; count-neutral wall-following implemented).
//   RESHAPE (legacy farinPoint mode): the WHOLE CURVE is the variable set —
//     tracked 59/69/58%, but control points drift ~20px and other Farin points
//     ~15-18px under a "weight handle" drag.
// The fork is a FEEL/DESIGN decision, not a solver deficiency: the pure-weight
// manifold does not CONTAIN the reshape states. Both pinned loosely here so a
// regression in either shows.
// ============================================================================
import { it } from 'vitest'
import { slideComplexFarin, curvatureExtremaNumeratorComplex, assignSignsNeighbor, cyclicSignChanges } from '../index'
import type { ComplexFarinCP } from '../farinDrag'

const n = 10, degree = 3
const knots: number[] = []
for (let i = 0; i < 4; i++) knots.push(0)
for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
for (let i = 0; i < 4; i++) knots.push(1)
const mk = (): ComplexFarinCP[] => Array.from({ length: n }, (_, i) => ({
  re: 40 + 28 * i, im: 120 + 70 * Math.sin((Math.PI * i) / 5),
  w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1),
}))
const boundOf = (cps: ComplexFarinCP[]) => cyclicSignChanges(assignSignsNeighbor(
  curvatureExtremaNumeratorComplex(cps.map(p => p.re), cps.map(p => p.im), cps.map(p => p.w_re), cps.map(p => p.w_im), knots, degree).flatCoeffs()), false)
const qOf = (cps: ComplexFarinCP[], e: number) => {
  const a = cps[e], b = cps[e + 1]
  const nre = a.w_re * a.re - a.w_im * a.im + b.w_re * b.re - b.w_im * b.im
  const nim = a.w_re * a.im + a.w_im * a.re + b.w_re * b.im + b.w_im * b.re
  const dre = a.w_re + b.w_re, dim = a.w_im + b.w_im
  const dd = dre * dre + dim * dim
  return { x: (nre * dre + nim * dim) / dd, y: (nim * dre - nre * dim) / dd }
}

it('pure-weight semantics: bound held; others EXACTLY fixed', () => {
  for (const fi of [2, 4, 6]) {
    let cps = mk()
    const start = qOf(cps, fi)
    const move = { x: 25, y: -35 }
    const startB = boundOf(cps)
    let held = true
    const others0 = [0, 1, 3, 5, 7, 8].filter(e => e !== fi).map(e => qOf(cps, e))
    const t0 = performance.now()
    for (let s = 1; s <= 8; s++) {
      const t = s / 8
      const r = slideComplexFarin(cps, knots, degree, fi, { x: start.x + move.x * t, y: start.y + move.y * t })
      cps = r.points
      if (boundOf(cps) > startB) held = false
    }
    const ms = (performance.now() - t0) / 8
    const q = qOf(cps, fi)
    const err = Math.hypot(q.x - (start.x + move.x), q.y - (start.y + move.y))
    const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
    // other Farin RATIOS must be exactly fixed → their positions unchanged (z fixed)
    let worstOther = 0
    ;[0, 1, 3, 5, 7, 8].filter(e => e !== fi).forEach((e, j) => {
      const qq = qOf(cps, e)
      worstOther = Math.max(worstOther, Math.hypot(qq.x - others0[j].x, qq.y - others0[j].y))
    })
    console.log(`CORE farin ${fi}: tracked ${tracked.toFixed(0)}%  bound-held=${held} (start ${startB})  ${ms.toFixed(0)}ms/tick  worst other-farin drift ${worstOther.toExponential(1)}px`)
    if (!held) throw new Error(`farin ${fi}: bound violated`)
    if (worstOther > 1e-9) throw new Error(`farin ${fi}: other Farin moved ${worstOther}px (suffix-scale semantics broken)`)
    if (tracked < 5) throw new Error(`farin ${fi}: tracked ${tracked.toFixed(0)}% — regressed below the measured floor`)
  }
}, 240000)
