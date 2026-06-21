import { describe, it, expect } from 'vitest'
import { curvatureExtremaGradientPlanar, curvatureExtremaGradientPlanarLocal, precomputeOpenSeeds } from '../gradient'

/**
 * The O(n) rewrite of the OPEN local curvature-extrema gradient (cached seeds +
 * hoisted analytic partials) must stay numerically identical to the authoritative
 * DENSE gradient `curvatureExtremaGradientPlanar`: same g, and each local column's
 * support-span ∂g/∂x,∂g/∂y must match the dense full-width column (whose non-support
 * spans are structurally zero). This guards the rewrite that makes the banded drag
 * linear — the curve's bound depends on g's exact sign pattern.
 */

function wavy(n: number) {
  const x: number[] = [], y: number[] = []
  for (let i = 0; i < n; i++) { x.push(-300 + (600 * i) / (n - 1)); y.push(120 * Math.sin((i / (n - 1)) * Math.PI * 4)) }
  return { x, y }
}
function clampedKnots(n: number, degree = 3) {
  const k: number[] = []
  for (let i = 0; i <= degree; i++) k.push(0)
  const internal = n - degree - 1
  for (let i = 1; i <= internal; i++) k.push(i / (internal + 1))
  for (let i = 0; i <= degree; i++) k.push(1)
  return k
}

describe('open local curvature gradient (O(n) rewrite) matches the dense gradient', () => {
  for (const n of [9, 20, 40]) {
    it(`n=${n}: g and all columns match`, () => {
      const { x, y } = wavy(n)
      const knots = clampedKnots(n)
      const dense = curvatureExtremaGradientPlanar(x, y, knots, 3)
      const seeds = precomputeOpenSeeds(knots, 3, n)
      const local = curvatureExtremaGradientPlanarLocal(x, y, knots, 3, seeds)

      // g matches.
      const gd = dense.g.flatCoeffs(), gl = local.g.flatCoeffs()
      let scale = 1e-9
      for (const v of gd) scale = Math.max(scale, Math.abs(v))
      let gErr = 0
      for (let i = 0; i < gd.length; i++) gErr = Math.max(gErr, Math.abs(gd[i] - gl[i]))
      expect(gErr / scale).toBeLessThan(1e-9)

      // Each column: dense full-width dx/dy must match the local support-span gx/gy,
      // and be ~0 outside the local support.
      for (let i = 0; i < n; i++) {
        const col = local.cols[i]
        const dxc = dense.dx[i].coeffs, dyc = dense.dy[i].coeffs
        for (let s = 0; s < dxc.length; s++) {
          const inSupport = col.s0 >= 0 && s >= col.s0 && s < col.s0 + col.gx.coeffs.length
          for (let c = 0; c < dxc[s].length; c++) {
            const lx = inSupport ? col.gx.coeffs[s - col.s0][c] : 0
            const ly = inSupport ? col.gy.coeffs[s - col.s0][c] : 0
            expect(Math.abs(dxc[s][c] - lx) / scale).toBeLessThan(1e-9)
            expect(Math.abs(dyc[s][c] - ly) / scale).toBeLessThan(1e-9)
          }
        }
      }
    })
  }
})
