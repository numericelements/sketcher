import { describe, it, expect } from 'vitest'
import {
  curvatureExtremaNumeratorPlanar,
  curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorComplex,
  curvatureExtremaNumeratorComplexPeriodic,
  assignSignsNeighbor,
  cyclicSignChanges,
  curvatureExtremaMarkers,
} from '../index'

type Cplx = { re: number; im: number }

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

  // REGRESSION: this exact curve once read S⁻ = 4 with 6 markers (a 1e-9·max|g| relative
  // floor deleting genuine coefficients on a g with ~1e10 dynamic range). S⁻ must stay ≥ Z.
  //
  // Z is 8, not 6: the marker finder is now variation-diminishing SUBDIVISION (not an 800-
  // sample grid), which resolves TWO real sign changes the grid stepped over near the
  // clamped end. Inside span 0 g descends smoothly −3.1e14 → … → +1.2e9 (a crossing ~5e-8
  // before the knot 1/12), then JUMPS back negative at the knot (g discontinuous at knots,
  // FOUNDATIONS F1; "jumps count"). Both confirmed against a 2e6-sample grid and direct
  // evaluation; the positive sliver is ~5e-8 wide, narrower than any practical grid step.
  // S⁻ = 10 ≥ Z = 8, so the bound is still honest.
  it('the false-bound curve reads an honest bound (≥ its 8 markers)', () => {
    const d = 3
    const knots = [0, 0, 0, 0, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666, 1, 1, 1, 1]
    const cps = [[474.60628552551975, 33.7758328385152], [304.0932994418825, -320.09725965788573], [113.8899071963915, -357.14564319355077], [187.82605665798425, -267.80281271613717], [38.64906018050243, -232.67646381486583], [12.135113786368223, -226.43234631580773], [-109.88549495911165, -197.69573010049223], [-257.9971504525222, -121.83856860922164], [-352.3959987733299, 1.944900868343821], [-289.25062541348944, 94.6368801082222], [-161.54765674524504, 174.67654976486182], [21.758174886640372, 198.99100068702552], [186.5260077662114, 195.10570436592315], [295.07431169672003, 152.27930557736883], [321.8514919589602, 108.32000152425707]]
    const x = cps.map((p) => p[0]), y = cps.map((p) => p[1])
    const S = sMinusOpen(x, y, knots, d)
    const Z = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, false).length
    expect(Z).toBe(8)
    expect(S, `S⁻=${S} must be ≥ markers=${Z}`).toBeGreaterThanOrEqual(Z)
  })
})

// Law 1 holds for EVERY family, not just polynomial. For rational/complex, g's control
// polygon is the complex numerator's per-span Bernstein coefficients (rational = complex
// with imaginary weight 0). Ports ne-core's rational_/complex_rational_closed_bound_is_a_
// proper_upper_bound (and their open analogues).
const sMinusCplx = (
  zre: number[], zim: number[], wre: number[], wim: number[], knots: number[], d: number, closed: boolean, rho: Cplx,
) =>
  cyclicSignChanges(
    assignSignsNeighbor(
      (closed
        ? curvatureExtremaNumeratorComplexPeriodic(zre, zim, wre, wim, knots, d, rho)
        : curvatureExtremaNumeratorComplex(zre, zim, wre, wim, knots, d)
      ).flatCoeffs(),
    ),
    closed,
  )

describe('Law 1 across families: rational + complex-rational (S⁻ ≥ markers)', () => {
  const d = 3

  it('OPEN rational (real positive weights)', () => {
    for (let s = 0; s < 25; s++) {
      const n = 8 + (s % 5), knots = openKnots(n, d)
      const x = Array.from({ length: n }, (_, i) => 45 * i + 20 * Math.sin(i + s))
      const y = Array.from({ length: n }, (_, i) => 30 * Math.cos(i * 1.2 + s) + 3 * i)
      const w = Array.from({ length: n }, (_, i) => 0.5 + 0.4 * (1 + Math.sin(i * 1.7 + s))) // > 0
      const w0 = w.map(() => 0)
      const S = sMinusCplx(x, y, w, w0, knots, d, false, { re: 1, im: 0 })
      const Z = curvatureExtremaMarkers('rational', x, y, w, w0, knots, d, false).length
      expect(S, `open rational seed ${s}: S⁻=${S} < markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })

  it('CLOSED rational (ρ = 1)', () => {
    for (let s = 0; s < 20; s++) {
      const n = 10 + (s % 4), knots = periodicKnots(n)
      const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 14 * Math.sin((2 + s) * a) })
      const y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 95 * Math.sin(a) + 11 * Math.cos((3 + s) * a) })
      const w = Array.from({ length: n }, (_, i) => 0.6 + 0.3 * (1 + Math.cos(i * 1.3 + s)))
      const w0 = w.map(() => 0)
      const S = sMinusCplx(x, y, w, w0, knots, d, true, { re: 1, im: 0 })
      const Z = curvatureExtremaMarkers('rational', x, y, w, w0, knots, d, true, { re: 1, im: 0 }).length
      expect(S, `closed rational seed ${s}: S⁻=${S} < markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })

  it('OPEN complex-rational (complex weights)', () => {
    for (let s = 0; s < 25; s++) {
      const n = 8 + (s % 5), knots = openKnots(n, d)
      const zre = Array.from({ length: n }, (_, i) => 40 * i + 18 * Math.sin(i + s))
      const zim = Array.from({ length: n }, (_, i) => 26 * Math.cos(i * 1.1 + s) + 2 * i)
      const wre = Array.from({ length: n }, (_, i) => 0.7 + 0.3 * Math.sin(i * 0.9 + s))
      const wim = Array.from({ length: n }, (_, i) => 0.15 * Math.cos(i * 1.4 + s))
      const S = sMinusCplx(zre, zim, wre, wim, knots, d, false, { re: 1, im: 0 })
      const Z = curvatureExtremaMarkers('complex-rational', zre, zim, wre, wim, knots, d, false).length
      expect(S, `open complex seed ${s}: S⁻=${S} < markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })

  it('CLOSED complex-rational (ρ = 1)', () => {
    for (let s = 0; s < 20; s++) {
      const n = 10 + (s % 4), knots = periodicKnots(n)
      const zre = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 13 * Math.sin((2 + s) * a) })
      const zim = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 95 * Math.sin(a) + 10 * Math.cos((3 + s) * a) })
      const wre = Array.from({ length: n }, (_, i) => 0.8 + 0.2 * Math.cos(i + s))
      const wim = Array.from({ length: n }, (_, i) => 0.1 * Math.sin(i * 1.2 + s))
      const S = sMinusCplx(zre, zim, wre, wim, knots, d, true, { re: 1, im: 0 })
      const Z = curvatureExtremaMarkers('complex-rational', zre, zim, wre, wim, knots, d, true, { re: 1, im: 0 }).length
      expect(S, `closed complex seed ${s}: S⁻=${S} < markers=${Z}`).toBeGreaterThanOrEqual(Z)
    }
  })
})
