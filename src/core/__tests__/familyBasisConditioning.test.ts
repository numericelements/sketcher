// ============================================================================
// familyBasis MUST RETURN THE RIGHT DIMENSION AT EVERY λ — a regression, found through a figure.
//
// HOW IT SURFACED. Designing an interactive dial for "Inside the Chart" needed λ = tan θ so the
// σ = 0 horizon sits at θ = ±90°. Sweeping that dial, `withDial` failed at scattered angles with a
// data residual pinned at exactly |target| — a constant, not a degradation, which is the signature
// of a solve with no directions to move in rather than one converging badly.
//
// THE CAUSE. familyBasis drew random probe vectors and projected each off the row space with
// `leastSquares`. At large |λ| the condition matrix is badly scaled — some rows carry λ, others do
// not — and that solve then either threw, returning a basis of length ZERO, or returned no
// correction at all, returning the whole space. Measured before the fix on the one-pole degree-2
// family: length 0 at λ = 57.3, 80, 573, and length 12 at λ ≈ tan 88.8°, against a true dimension of
// 8 everywhere. Eight failing angles in a 0–89.9° scan.
//
// THE FIX is the same one that had to be applied to wronskianImage the same week, which is why it is
// worth a named test rather than a quiet patch: orthonormalise the ROWS first (making the scaling
// irrelevant, since each row is normalised), then project the standard basis off that complement.
// Deterministic, and it returns exactly cols − rank vectors by construction.
//
// This matters beyond the figure. rationalPHMultiPoleSpatial backs the editor's rational drags, and
// a silently short basis is a chart that has quietly lost degrees of freedom — the curve stops
// moving and nothing reports why. That is CLAUDE.md's Law 2 failure mode exactly: a point that will
// not move is a solver failure, not the mathematics.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  familyBasis, withDial, dataOf, toMember, unpackSpinor, seedQuintic, conditionMatrix,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const zeroSpinor = (n: number): Quat[] => Array.from({ length: n }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

describe('familyBasis conditioning', () => {
  it('one pole, spinor degree 2: dimension is 8 at EVERY angle of the dial', () => {
    const short: string[] = []
    for (let deg = 0; deg <= 89.9; deg += 0.1) {
      const lam = Math.tan((deg * Math.PI) / 180)
      const n = familyBasis({ A: zeroSpinor(3), roots: [1.7], lambdas: [lam] }).length
      if (n !== 8) short.push(`${deg.toFixed(1)}→${n}`)
    }
    expect(short).toEqual([])          // before the fix: 8 angles, giving 0 or 12
  })

  it('and it survives dials far past anything a slider reaches', () => {
    for (const lam of [1e3, 1e5, 1e8, -1e5]) {
      expect(familyBasis({ A: zeroSpinor(3), roots: [1.7], lambdas: [lam] }).length).toBe(8)
    }
  })

  it('the basis really is in the nullspace, not merely the right size', () => {
    for (const lam of [0.5, 57.29, 573, 1e5]) {
      const prm: MultiPoleParams = { A: zeroSpinor(3), roots: [1.7], lambdas: [lam] }
      const M = conditionMatrix(prm)
      const scale = Math.max(...M.flatMap((r) => r.map(Math.abs)))
      for (const b of familyBasis(prm)) {
        expect(Math.hypot(...b)).toBeCloseTo(1, 9)                       // unit
        for (const row of M) {
          expect(Math.abs(row.reduce((s, v, i) => s + v * b[i], 0)) / scale).toBeLessThan(1e-12)
        }
      }
    }
  })

  it('THE SYMPTOM IS GONE: withDial no longer fails anywhere on the dial', () => {
    const base: MultiPoleParams = { A: zeroSpinor(3), roots: [1.7], lambdas: [0.5] }
    const B = familyBasis(base)
    const x = new Array<number>(12).fill(0)
    B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 12; j++) x[j] += a * b[j] })
    const start: MultiPoleParams = { ...base, A: unpackSpinor(x) }
    const target = dataOf(toMember(start))

    const failed: number[] = []
    for (let deg = 0; deg <= 89.9; deg += 0.5) {
      if (!withDial(start, target, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })) failed.push(deg)
    }
    expect(failed).toEqual([])          // before the fix: failures at scattered angles
  })

  it('and the two-pole quintic is unchanged — 8, as F17 says', () => {
    expect(familyBasis(seedQuintic()).length).toBe(8)
    for (const lam of [0.6, 50, 500]) {
      expect(familyBasis({ ...seedQuintic(), lambdas: [lam, -0.35] }).length).toBe(8)
    }
  })
})
