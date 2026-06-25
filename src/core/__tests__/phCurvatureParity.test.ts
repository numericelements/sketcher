import { describe, it, expect } from 'vitest'
import { curvatureExtremaNumeratorPH, phBound, phMarkers, phJacobian, cyclicSignChanges, assignSignsNeighbor } from '../index'
import { phCurvatureExtremaNumerator } from '../../sketcher/optimizer/phCurvatureExtrema'

// PARITY: the core PH numerator must match the sketcher's working one (the oracle)
// coefficient-for-coefficient. Ports ne-core ph_curvature_matches_generic_g_of_hodograph
// at the implementation level — same formula g = Im(ā²·(a·a″ − 3/2·a′²)), a = w².

// A degree-m=2 generator (quintic PH curve). Open clamped knots.
const genU = [40, 90, 120, 150, 70]
const genV = [10, 80, 30, 100, 20]
const m = 2
const knots = [0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1] // n=5, degree 2 → length 5+2+1 = 8

describe('PH numerator: core matches the sketcher oracle (open)', () => {
  it('coefficient-for-coefficient', () => {
    const core = curvatureExtremaNumeratorPH(genU, genV, knots, m, false).flatCoeffs()
    const sketch = phCurvatureExtremaNumerator(genU, genV, knots).flattenControlPoints()
    expect(core.length).toBe(sketch.length)
    const scale = Math.max(1e-300, ...sketch.map(Math.abs))
    let worst = 0
    core.forEach((c, i) => { worst = Math.max(worst, Math.abs(c - sketch[i]) / scale) })
    expect(worst, `max rel coeff diff ${worst.toExponential(2)}`).toBeLessThan(1e-9)
  })

  it('same bound S⁻ as the oracle', () => {
    const core = curvatureExtremaNumeratorPH(genU, genV, knots, m, false).flatCoeffs()
    const sketch = phCurvatureExtremaNumerator(genU, genV, knots).flattenControlPoints()
    expect(cyclicSignChanges(assignSignsNeighbor(core), false)).toBe(cyclicSignChanges(assignSignsNeighbor(sketch), false))
  })
})

describe('PH in the set: Law 1 + FD Jacobian', () => {
  it('OPEN PH: S⁻ ≥ markers, and FD Jacobian has the right shape + is finite', () => {
    const S = phBound(genU, genV, knots, m, false)
    const Z = phMarkers(genU, genV, knots, m, false).length
    expect(S).toBeGreaterThanOrEqual(Z)
    const J = phJacobian(genU, genV, knots, m, false)
    expect(J[0].length).toBe(2 * genU.length) // cols = 2·(generator CPs)
    expect(J.every((row) => row.every(Number.isFinite))).toBe(true)
  })

  it('CLOSED PH: S⁻ ≥ markers and the closed bound is even', () => {
    const n = 8, pk = Array.from({ length: n }, (_, i) => i / n)
    const u = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 60 + 30 * Math.cos(a) + 6 * Math.sin(2 * a) })
    const v = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 40 * Math.sin(a) + 5 * Math.cos(3 * a) })
    const S = phBound(u, v, pk, m, true)
    const Z = phMarkers(u, v, pk, m, true).length
    expect(S).toBeGreaterThanOrEqual(Z)
    expect(S % 2, `closed PH bound ${S} must be even`).toBe(0)
  })
})
