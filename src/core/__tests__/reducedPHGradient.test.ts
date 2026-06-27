// Validates the analytic reduced-PH gradient ∂R/∂(u,v) against central differences (open + closed).
import { describe, it, expect } from 'vitest'
import { curvatureExtremaReducedNumeratorPH, reducedPHGradient } from '../phCurvature'

const M = 2
const OPEN_KNOTS = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1]
const CLOSED_KNOTS = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6] // periodic, n=6
const U = [0, 40, -30, 60, -20, 50]
const V = [10, -50, 40, -60, 30, -10]

function fdJac(u: number[], v: number[], knots: number[], closed: boolean) {
  const base = curvatureExtremaReducedNumeratorPH(u, v, knots, M, closed).flatCoeffs()
  const nR = base.length, m = u.length
  const du: number[][] = [], dv: number[][] = []
  const col = (arr: number[], i: number) => {
    const c0 = arr[i], h = 1e-6 * (Math.abs(c0) + 1)
    arr[i] = c0 + h; const gp = curvatureExtremaReducedNumeratorPH(u, v, knots, M, closed).flatCoeffs()
    arr[i] = c0 - h; const gm = curvatureExtremaReducedNumeratorPH(u, v, knots, M, closed).flatCoeffs()
    arr[i] = c0
    return Array.from({ length: nR }, (_, k) => (gp[k] - gm[k]) / (2 * h))
  }
  for (let i = 0; i < m; i++) { du.push(col(u, i)); dv.push(col(v, i)) }
  return { du, dv, nR }
}

describe('reduced PH gradient vs FD', () => {
  for (const [label, knots, closed] of [['open', OPEN_KNOTS, false], ['closed', CLOSED_KNOTS, true]] as [string, number[], boolean][]) {
    it(`analytic ∂R/∂(u,v) matches central difference: ${label}`, () => {
      const an = reducedPHGradient([...U], [...V], knots, M, closed)
      const fd = fdJac([...U], [...V], knots, closed)
      let maxAbs = 1e-9, maxDiff = 0
      for (let i = 0; i < U.length; i++) {
        const au = an.du[i].flatCoeffs(), av = an.dv[i].flatCoeffs()
        for (let k = 0; k < fd.nR; k++) {
          maxAbs = Math.max(maxAbs, Math.abs(fd.du[i][k]), Math.abs(fd.dv[i][k]))
          maxDiff = Math.max(maxDiff, Math.abs(au[k] - fd.du[i][k]), Math.abs(av[k] - fd.dv[i][k]))
        }
      }
      console.log(`[${label}] R ncoef=${fd.nR} analyticVsFD relDiff=${(maxDiff / maxAbs).toExponential(2)}`)
      expect(maxDiff / maxAbs).toBeLessThan(1e-6)
    })
  }
})
