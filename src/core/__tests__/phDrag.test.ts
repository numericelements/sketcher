import { describe, it, expect } from 'vitest'
import {
  slideClosedPH, projectClosurePHPeriodic, generatorBasisGram, closureGap,
  curvatureExtremaNumeratorPH, assignSignsNeighbor, cyclicSignChanges,
} from '../index'

// Slice 2b: the core closed-PH drag on a PERIODIC preimage (Rust's design — F5). It must
// hold the curvature bound, keep the curve closed (∮w² ≈ 0), and track the generator.

const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)
const bound = (u: number[], v: number[], k: number[], d: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPH(u, v, k, d, true).flatCoeffs()), true)

describe('core closed-PH drag (periodic preimage, slice 2b)', () => {
  it('holds the bound, stays closed, and tracks', () => {
    const n = 10, d = 2, knots = periodicKnots(n)
    const u0 = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 30 * Math.cos(a) + 5 * Math.sin(2 * a) })
    const v0 = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 30 * Math.sin(a) + 4 * Math.cos(3 * a) })
    const G = generatorBasisGram(knots, d, n, true)

    // a genuine closed periodic preimage
    let { u, v } = projectClosurePHPeriodic(u0, v0, knots, d, G)
    const gap0 = closureGap(u, v, G)
    expect(Math.hypot(gap0.re, gap0.im), 'start not closed').toBeLessThan(1e-6)
    const startBound = bound(u, v, knots, d)
    expect(startBound).toBeGreaterThan(0)

    // drag a couple of preimage coordinates toward a target, in chained ticks
    const tu = u.slice(), tv = v.slice(); tu[1] += 15; tv[2] -= 12
    const sU1 = u[1]
    for (let s = 1; s <= 8; s++) {
      const f = s / 8
      const r = slideClosedPH(u, v, u.map((x, i) => x + (tu[i] - x) * f), v.map((x, i) => x + (tv[i] - x) * f), knots, d, { maxIterations: 24 })
      u = r.u; v = r.v
      expect(bound(u, v, knots, d), `step ${s}: bound rose past ${startBound}`).toBeLessThanOrEqual(startBound)
      const g = closureGap(u, v, G)
      expect(Math.hypot(g.re, g.im), `step ${s}: closure gap`).toBeLessThan(1e-4)
    }
    expect(Math.abs(u[1] - sU1), 'the dragged coordinate did not track').toBeGreaterThan(3)
  }, 30000)
})
