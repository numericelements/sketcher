import { describe, it, expect } from 'vitest'
import { leastSquares } from '../linalg'
import { leastSquares as legacyLeastSquares } from '../../sketcher/optimizer/linearAlgebra'

describe('core leastSquares', () => {
  it('recovers the exact solution of a consistent overdetermined system', () => {
    // A (6×3), b = A·xTrue → least-squares must recover xTrue.
    const A = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [1, 1, 0], [1, 0, 1], [1, 2, 3],
    ]
    const xTrue = [2, -1, 0.5]
    const b = A.map((row) => row[0] * xTrue[0] + row[1] * xTrue[1] + row[2] * xTrue[2])
    const x = leastSquares(A, b)
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xTrue[i], 6)
  })

  it('matches the legacy leastSquares (the buildPeriodicPHCurve oracle) on an inconsistent system', () => {
    // deterministic, mildly inconsistent overdetermined system
    const A: number[][] = []
    const b: number[] = []
    for (let k = 0; k < 12; k++) {
      const t = k / 11
      A.push([1, t, t * t, Math.sin(3 * t)])
      b.push(t * t * 0.7 - 0.3 * t + 0.2 + 0.05 * Math.cos(5 * t)) // not exactly in range
    }
    const core = leastSquares(A, b)
    const leg = legacyLeastSquares(A, b)
    expect(leg.success).toBe(true)
    for (let i = 0; i < 4; i++) expect(core[i]).toBeCloseTo(leg.x[i], 6)
  })
})
