import { describe, it, expect } from 'vitest'
import { curvatureExtremaNumeratorComplexPeriodic } from '../curvature'
import { familyJacobian, type WeightedCP } from '../curvatureFamilies'
import { slideComplexRational } from '../complexRational'
import type { ComplexPoint } from '../types'
import { assignSignsNeighbor, cyclicSignChanges } from '../bernstein'
import { computeGCPsFromFixedWeightClosed } from '../../sketcher/optimizer/complexAlgebra'

// Migration fork 2, sub-step #3: closed complex-rational drags with JUNCTION/CUSP (repeated)
// knots now route to the core slideComplexRational path (the crCleanPeriodic guard was relaxed
// from strictly-increasing to non-decreasing in sceneStore.moveControlPoint). This pins that
// core's periodic numerator + analytic gradient + drag are correct for repeated knots — so the
// relaxation is safe and the legacy fixed-weight-closed path is no longer needed for them.

const DEG = 3
const N = 8
const RHO = { re: 1, im: 0 }

function oval(n: number): WeightedCP[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return { re: 170 * Math.cos(a), im: 90 * Math.sin(a), wRe: 1, wIm: 0 }
  })
}

// All N knots / N CPs, period-1 domain in [0,1), but NON-strictly-increasing (repeated knot).
const cases: [string, number[]][] = [
  ['clean', Array.from({ length: N }, (_, i) => i / N)],
  ['junction-m2', [0, 1 / 8, 2 / 8, 2 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8]],
  ['cusp-m3', [0, 1 / 8, 2 / 8, 2 / 8, 2 / 8, 5 / 8, 6 / 8, 7 / 8]],
  ['seam-m2', [0, 0, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8]],
]

const coreCoeffs = (cps: WeightedCP[], knots: number[]) =>
  curvatureExtremaNumeratorComplexPeriodic(
    cps.map(p => p.re), cps.map(p => p.im), cps.map(p => p.wRe), cps.map(p => p.wIm), knots, DEG, RHO,
  ).flatCoeffs()

const legacyCoeffs = (cps: WeightedCP[], knots: number[]) =>
  computeGCPsFromFixedWeightClosed(
    DEG, knots,
    cps.map(p => ({ re: p.re, im: p.im })),
    cps.map(p => ({ re: p.wRe, im: p.wIm })),
    { re: 1, im: 0 }, 1,
  )

const sc = (cps: ComplexPoint[], knots: number[]) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplexPeriodic(
    cps.map(p => p.re), cps.map(p => p.im), cps.map(p => p.w_re), cps.map(p => p.w_im), knots, DEG, RHO,
  ).flatCoeffs()), true)

describe('closed complex-rational junction/cusp on core (migration fork 2 #3)', () => {
  it.each(cases)('numerator g matches legacy fixed-weight-closed to machine-ε: %s', (_label, knots) => {
    const cps = oval(N)
    const c = coreCoeffs(cps, knots), l = legacyCoeffs(cps, knots)
    expect(c.length).toBe(l.length)
    const maxAbs = Math.max(1e-9, ...l.map(Math.abs))
    const maxDiff = Math.max(0, ...c.map((v, i) => Math.abs(v - l[i])))
    expect(maxDiff / maxAbs).toBeLessThan(1e-9)
  })

  it.each(cases)('analytic Jacobian matches central-difference: %s', (_label, knots) => {
    const cps = oval(N)
    const A = familyJacobian('complex', cps, knots, DEG, 'closed', 'analytic', RHO)
    const F = familyJacobian('complex', cps, knots, DEG, 'closed', 'fd', RHO)
    let maxAbs = 1e-9, maxDiff = 0
    for (let i = 0; i < F.length; i++) for (let j = 0; j < F[i].length; j++) {
      maxAbs = Math.max(maxAbs, Math.abs(F[i][j])); maxDiff = Math.max(maxDiff, Math.abs(A[i][j] - F[i][j]))
    }
    expect(maxDiff / maxAbs).toBeLessThan(1e-6)
  })

  it.each(cases)('slideComplexRational holds the S⁻ bound over a chained drag: %s', (_label, knots) => {
    const pts: ComplexPoint[] = oval(N).map(c => ({ re: c.re, im: c.im, w_re: c.wRe, w_im: c.wIm }))
    const start = sc(pts, knots)
    let cur = pts
    const di = 2
    for (let f = 1; f <= 4; f++) {
      cur = slideComplexRational(cur, knots, DEG, di, pts[di].re + 30 * f / 4, pts[di].im - 40 * f / 4, { maxIterations: 20, enableBFGS: false }).points
      expect(cur.every(p => Number.isFinite(p.re) && Number.isFinite(p.im))).toBe(true)
    }
    expect(sc(cur, knots)).toBeLessThanOrEqual(start)
  })
})
