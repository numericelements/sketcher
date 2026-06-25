import { describe, it, expect } from 'vitest'
import {
  curvatureExtremaNumeratorPlanar,
  curvatureExtremaNumeratorPlanarPeriodic,
  assignSignsNeighbor,
  cyclicSignChanges,
  curvatureExtremaMarkers,
} from '../index'

// ============================================================================
// THE LAW (CLAUDE.md, Law 1 + Law 3):  S⁻ ≥ Z(g)
//
// S⁻  = sign changes of g's control polygon (the displayed/enforced bound)
// Z(g) = sign changes of g itself = the curvature extrema actually drawn (markers)
//
// S⁻ is an UPPER bound. It may be loose (S⁻ > Z(g)) — that is true and fine. It must
// NEVER read below Z(g): a bound smaller than the count it bounds is FAKE. This test is
// the falsifiable guardrail named in CLAUDE.md; if it fails, a law-breaking threshold
// has crept back in (the classic culprit: a "small relative to max|g|" floor that
// deletes genuine low-amplitude coefficients on a high-dynamic-range g).
// ============================================================================

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

const sMinusOpen = (x: number[], y: number[], knots: number[], d: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanar(x, y, knots, d).flatCoeffs()), false)
const sMinusClosed = (x: number[], y: number[], knots: number[], d: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, d).flatCoeffs()), true)

describe('Law 1: S⁻ is a true upper bound (S⁻ ≥ markers)', () => {
  it('OPEN cubics — random, including endpoint-feature dynamic range', () => {
    const d = 3
    for (let s = 0; s < 60; s++) {
      const n = 7 + (s % 9)
      const knots = openKnots(n, d)
      const x = Array.from({ length: n }, (_, i) => 50 * i + 30 * Math.sin(i + s) + (i === 1 ? 6 * s : 0))
      const y = Array.from({ length: n }, (_, i) => 35 * Math.cos(i * 1.3 + s) + (i === 1 ? 120 : 0) - i * i)
      const S = sMinusOpen(x, y, knots, d)
      const Z = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, false).length
      expect(S, `open seed ${s}: S⁻=${S} must be ≥ markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })

  it('CLOSED cubics — random', () => {
    const d = 3
    for (let s = 0; s < 30; s++) {
      const n = 10 + (s % 6)
      const knots = periodicKnots(n)
      const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 160 * Math.cos(a) + 15 * Math.sin((2 + s) * a) })
      const y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 100 * Math.sin(a) + 12 * Math.cos((3 + s) * a) })
      const S = sMinusClosed(x, y, knots, d)
      const Z = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, true).length
      expect(S, `closed seed ${s}: S⁻=${S} must be ≥ markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })

  // REGRESSION: this exact curve read S⁻ = 4 with 6 markers (a 1e-9·max|g| relative floor
  // deleting genuine coefficients on a g with ~1e10 dynamic range). The bound must be ≥ 6.
  it('the false-bound curve now reads an honest bound (≥ its 6 markers)', () => {
    const d = 3
    const knots = [0, 0, 0, 0, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666, 1, 1, 1, 1]
    const cps = [[474.60628552551975, 33.7758328385152], [304.0932994418825, -320.09725965788573], [113.8899071963915, -357.14564319355077], [187.82605665798425, -267.80281271613717], [38.64906018050243, -232.67646381486583], [12.135113786368223, -226.43234631580773], [-109.88549495911165, -197.69573010049223], [-257.9971504525222, -121.83856860922164], [-352.3959987733299, 1.944900868343821], [-289.25062541348944, 94.6368801082222], [-161.54765674524504, 174.67654976486182], [21.758174886640372, 198.99100068702552], [186.5260077662114, 195.10570436592315], [295.07431169672003, 152.27930557736883], [321.8514919589602, 108.32000152425707]]
    const x = cps.map((p) => p[0]), y = cps.map((p) => p[1])
    const S = sMinusOpen(x, y, knots, d)
    const Z = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, false).length
    expect(Z).toBe(6)
    expect(S, `S⁻=${S} must be ≥ markers=${Z}`).toBeGreaterThanOrEqual(Z)
  })
})
