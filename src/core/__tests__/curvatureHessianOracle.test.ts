import { describe, it, expect } from 'vitest'
import { curvatureExtremaHessianPlanarWeighted, curvatureExtremaHessianPlanarWeightedAD, curvatureExtremaGradientPlanar } from '../index'

// Oracle: the analytic weighted Hessian H = Σ_flat w[flat]·∇²g_flat must equal the
// finite difference of the analytic weighted GRADIENT ∇G_w = Σ_flat w[flat]·∇g_flat
// (which gradient.ts already provides, FD-validated). G_w(cp) = Σ_flat w[flat]·g_flat(cp);
// H is its exact Hessian. This is the authoritative gate for the Jet2 second-order AD.

// Weighted gradient ∇G_w in block order [x₀..,y₀..] from the analytic Jacobian.
function weightedGradient(x: number[], y: number[], knots: number[], degree: number, wFlat: number[]): number[] {
  const { dx, dy } = curvatureExtremaGradientPlanar(x, y, knots, degree)
  const n = x.length
  const g = new Array<number>(2 * n).fill(0)
  for (let i = 0; i < n; i++) {
    const dxf = dx[i].flatCoeffs()
    const dyf = dy[i].flatCoeffs()
    for (let f = 0; f < wFlat.length; f++) {
      const w = wFlat[f]
      if (w === 0) continue
      g[i] += w * (dxf[f] ?? 0)
      g[n + i] += w * (dyf[f] ?? 0)
    }
  }
  return g
}

function openKnots(n: number, degree: number): number[] {
  const k: number[] = []
  for (let i = 0; i < degree; i++) k.push(0)
  const inner = n - degree + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < degree; i++) k.push(1)
  return k
}

describe('curvature Hessian (Jet2 second-order AD) vs finite differences', () => {
  it('H[a][b] == central difference of the weighted gradient, all variables', () => {
    const degree = 3
    const n = 8
    const knots = openKnots(n, degree)
    // A non-degenerate squiggle.
    const x = Array.from({ length: n }, (_, i) => 40 * i + 12 * Math.sin(i * 1.7) - 3 * i * i)
    const y = Array.from({ length: n }, (_, i) => 30 * Math.cos(i * 0.9) + 5 * i + 2 * i * i)

    // Determine the flat g length from one gradient, build random-ish weights.
    const { dx } = curvatureExtremaGradientPlanar(x, y, knots, degree)
    const numFlat = dx[0].flatCoeffs().length
    const wFlat = Array.from({ length: numFlat }, (_, f) => Math.sin(0.7 * f + 1) * (1 + (f % 3)))

    const H = curvatureExtremaHessianPlanarWeighted(x, y, knots, degree, wFlat)

    const nv = 2 * n
    const vars = [...x, ...y]
    const eps = 1e-3
    const setCurve = (v: number[]) => ({ x: v.slice(0, n), y: v.slice(n) })
    let maxAbsErr = 0
    let maxAbsH = 0
    for (let b = 0; b < nv; b++) {
      const vp = vars.slice(); vp[b] += eps
      const vm = vars.slice(); vm[b] -= eps
      const cp = setCurve(vp), cm = setCurve(vm)
      const gp = weightedGradient(cp.x, cp.y, knots, degree, wFlat)
      const gm = weightedGradient(cm.x, cm.y, knots, degree, wFlat)
      for (let a = 0; a < nv; a++) {
        const fd = (gp[a] - gm[a]) / (2 * eps)
        maxAbsErr = Math.max(maxAbsErr, Math.abs(fd - H[a][b]))
        maxAbsH = Math.max(maxAbsH, Math.abs(H[a][b]))
      }
    }
    // Relative agreement: FD truncation ~eps² · scale.
    expect(maxAbsErr / (maxAbsH || 1), `maxAbsErr=${maxAbsErr} maxAbsH=${maxAbsH}`).toBeLessThan(1e-5)
  })

  it('fast explicit Hessian matches the Jet2 AD oracle (machine precision)', () => {
    const degree = 3
    for (const n of [6, 8, 11]) {
      const knots = openKnots(n, degree)
      const x = Array.from({ length: n }, (_, i) => 40 * i + 12 * Math.sin(i * 1.7) - 3 * i * i)
      const y = Array.from({ length: n }, (_, i) => 30 * Math.cos(i * 0.9) + 5 * i + 2 * i * i)
      const { dx } = curvatureExtremaGradientPlanar(x, y, knots, degree)
      const wFlat = Array.from({ length: dx[0].flatCoeffs().length }, (_, f) => Math.sin(0.7 * f + 1) * (1 + (f % 3)))
      const Hfast = curvatureExtremaHessianPlanarWeighted(x, y, knots, degree, wFlat)
      const Had = curvatureExtremaHessianPlanarWeightedAD(x, y, knots, degree, wFlat)
      let maxErr = 0, maxAbs = 0
      for (let a = 0; a < 2 * n; a++) for (let b = 0; b < 2 * n; b++) {
        maxErr = Math.max(maxErr, Math.abs(Hfast[a][b] - Had[a][b]))
        maxAbs = Math.max(maxAbs, Math.abs(Had[a][b]))
      }
      expect(maxErr / (maxAbs || 1), `n=${n} maxErr=${maxErr} maxAbs=${maxAbs}`).toBeLessThan(1e-10)
    }
  })

  it('H is symmetric', () => {
    const degree = 3
    const n = 7
    const knots = openKnots(n, degree)
    const x = Array.from({ length: n }, (_, i) => 25 * i - 4 * i * i + 7 * Math.sin(i))
    const y = Array.from({ length: n }, (_, i) => 18 * Math.cos(i * 1.3) + 6 * i)
    const { dx } = curvatureExtremaGradientPlanar(x, y, knots, degree)
    const wFlat = Array.from({ length: dx[0].flatCoeffs().length }, (_, f) => 1 + Math.cos(f))
    const H = curvatureExtremaHessianPlanarWeighted(x, y, knots, degree, wFlat)
    let maxAsym = 0
    for (let a = 0; a < 2 * n; a++) for (let b = 0; b < 2 * n; b++) maxAsym = Math.max(maxAsym, Math.abs(H[a][b] - H[b][a]))
    expect(maxAsym).toBeLessThan(1e-9)
  })
})
