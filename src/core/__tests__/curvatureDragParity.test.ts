import { describe, it, expect } from 'vitest'
import {
  slide, slideCurve, slideComplexRational,
  familyBound, poly, rational, complex, type WeightedCP,
} from '../index'

// PARITY GATE for the generic drag (CLAUDE.md): the family-generic slide() must be
// bound-faithful (Law 1) AND track the cursor comparably to the existing bespoke drags
// (slideCurve / slideComplexRational) — proven here BEFORE any editor migration.

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

describe('generic drag: parity with slideCurve (polynomial)', () => {
  const d = 3
  for (const topology of ['open', 'closed'] as const) {
    it(`polynomial / ${topology}: generic slide tracks like slideCurve, bound held`, () => {
      const n = 12
      const knots = topology === 'open' ? openKnots(n, d) : periodicKnots(n)
      const X = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 18 * Math.sin(3 * a) })
      const Y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 100 * Math.sin(a) + 14 * Math.cos(4 * a) })
      const cps: WeightedCP[] = X.map((x, i) => poly(x, Y[i]))
      const k = 3, tx = X[k] + 18, ty = Y[k] - 14
      const start = familyBound('polynomial', cps, knots, d, topology)

      const g = slide('polynomial', cps, knots, d, topology, k, { x: tx, y: ty }, { jacobian: 'ad', maxIterations: 40 })
      const legacy = slideCurve(X, Y, knots, d, k, tx, ty, { method: 'ipopt', bandedSolve: true, maxIterations: 40, enableBFGS: false, ...(topology === 'closed' ? { closed: true } : {}) })

      // bound held by the generic drag (the law)
      expect(familyBound('polynomial', g.points, knots, d, topology)).toBeLessThanOrEqual(start)
      // tracks comparably to the legacy path (same regime + solver, dense vs banded)
      const gd = Math.hypot(g.points[k].re - X[k], g.points[k].im - Y[k])
      const ld = Math.hypot(legacy.x[k] - X[k], legacy.y[k] - Y[k])
      expect(gd, `generic tracked ${gd.toFixed(1)} vs legacy ${ld.toFixed(1)}`).toBeGreaterThan(0.8 * ld)
    })
  }
})

describe('generic drag: parity with slideComplexRational (rational + complex)', () => {
  const d = 3, n = 11, knots = periodicKnots(n)
  const Z = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return { x: 150 * Math.cos(a) + 12 * Math.sin(3 * a), y: 95 * Math.sin(a) } })

  it('rational / closed: bound held and tracks', () => {
    const w = Array.from({ length: n }, (_, i) => 0.7 + 0.25 * Math.cos(i))
    const cps: WeightedCP[] = Z.map((p, i) => rational(p.x, p.y, w[i]))
    const k = 2, tx = Z[k].x + 14, ty = Z[k].y + 10
    const start = familyBound('rational', cps, knots, d, 'closed')
    const g = slide('rational', cps, knots, d, 'closed', k, { x: tx, y: ty }, { jacobian: 'analytic', maxIterations: 40 })
    expect(familyBound('rational', g.points, knots, d, 'closed')).toBeLessThanOrEqual(start)
    const legacy = slideComplexRational(
      Z.map((p, i) => ({ re: p.x, im: p.y, w_re: w[i], w_im: 0 })), knots, d, k, tx, ty, {},
    )
    const gd = Math.hypot(g.points[k].re - Z[k].x, g.points[k].im - Z[k].y)
    const ld = Math.hypot(legacy.points[k].re - Z[k].x, legacy.points[k].im - Z[k].y)
    expect(gd, `generic ${gd.toFixed(1)} vs legacy ${ld.toFixed(1)}`).toBeGreaterThan(0.6 * ld)
  })
})

describe('generic drag: Law 1 across all families (chained, bound never rises)', () => {
  const d = 3, n = 11
  const families = [
    { kind: 'polynomial' as const, knots: openKnots(n, d), topo: 'open' as const, mk: (x: number, y: number) => poly(x, y) },
    { kind: 'rational' as const, knots: periodicKnots(n), topo: 'closed' as const, mk: (x: number, y: number) => rational(x, y, 0.8) },
    { kind: 'complex' as const, knots: periodicKnots(n), topo: 'closed' as const, mk: (x: number, y: number) => complex(x, y, 0.9, 0.05) },
  ]
  for (const f of families) {
    it(`${f.kind}/${f.topo}: chained generic drag never raises the bound`, () => {
      const base = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return { x: 140 * Math.cos(a) + 12 * Math.sin(3 * a), y: 90 * Math.sin(a) + 9 * Math.cos(2 * a) } })
      let cps: WeightedCP[] = base.map((p) => f.mk(p.x, p.y))
      const start = familyBound(f.kind, cps, f.knots, d, f.topo)
      const k = 3, sx0 = cps[k].re, sy0 = cps[k].im
      for (let s = 1; s <= 20; s++) {
        const t = s / 20
        const g = slide(f.kind, cps, f.knots, d, f.topo, k, { x: sx0 + 30 * t, y: sy0 - 24 * t }, { jacobian: f.kind === 'polynomial' ? 'ad' : 'analytic', maxIterations: 30 })
        cps = g.points
        expect(familyBound(f.kind, cps, f.knots, d, f.topo), `${f.kind} step ${s}: bound rose`).toBeLessThanOrEqual(start)
      }
    }, 30000) // generic rational/complex drag is slow (dense + heavy numerator) — Step 7 perf, not a bound issue
  }
})
