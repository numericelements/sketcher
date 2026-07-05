// Pins the hand-analytic polynomial Jacobian (analyticGradient.ts, ported from Rust
// ne-core analytic_gradient.rs) against the forward-AD gradient (gradient.ts), which is
// itself FD-validated (curvatureFamiliesJacobian.test.ts). So this one test cross-checks
// the port against BOTH the AD path AND, transitively, finite differences — and hence
// against the two independent source references (Rust + Eric's closed-curve TS stack).
import { describe, it, expect } from 'vitest'
import { polynomialCurvatureJacobianColumns } from '../analyticGradient'
import { curvatureExtremaGradientPlanar, curvatureExtremaGradientPlanarPeriodic } from '../gradient'

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d + 1; i++) k.push(0)
  for (let i = 1; i < n - d; i++) k.push(i / (n - d))
  for (let i = 0; i < d + 1; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

const wavy = (n: number, closed: boolean, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    if (closed) {
      const a = (2 * Math.PI * i) / n
      return { x: 150 * Math.cos(a) + 14 * Math.sin(3 * a + seed), y: 90 * Math.sin(a) - 11 * Math.cos(2 * a + seed) }
    }
    return { x: 30 + 26 * i, y: 120 + 65 * Math.sin((Math.PI * i) / 5 + seed) }
  })

const maxColDiff = (a: { flatCoeffs(): number[] }[], b: { flatCoeffs(): number[] }[]) => {
  let m = 0
  for (let i = 0; i < a.length; i++) {
    const ca = a[i].flatCoeffs(), cb = b[i].flatCoeffs()
    for (let k = 0; k < ca.length; k++) m = Math.max(m, Math.abs(ca[k] - cb[k]))
  }
  return m
}

describe('analyticGradient — hand-analytic ∂g/∂CP == forward-AD gradient (open + closed)', () => {
  const d = 3
  for (const [n, closed] of [[10, false], [14, false], [12, true], [16, true]] as const) {
    it(`${closed ? 'closed' : 'open'} n=${n}: analytic columns match the AD oracle`, () => {
      for (let seed = 0; seed < 3; seed++) {
        const pts = wavy(n, closed, seed)
        const x = pts.map((p) => p.x), y = pts.map((p) => p.y)
        const knots = closed ? periodicKnots(n) : openKnots(n, d)

        const analytic = polynomialCurvatureJacobianColumns(x, y, knots, d, closed)
        const ad = closed
          ? curvatureExtremaGradientPlanarPeriodic(x, y, knots, d)
          : curvatureExtremaGradientPlanar(x, y, knots, d)

        // g itself matches (the analytic file reconstructs g from the same c′,c″,c‴ blocks).
        const gA = analytic.g.flatCoeffs(), gAD = ad.g.flatCoeffs()
        const gScale = Math.max(...gAD.map(Math.abs), 1)
        let gDiff = 0
        for (let k = 0; k < gA.length; k++) gDiff = Math.max(gDiff, Math.abs(gA[k] - gAD[k]))
        expect(gDiff / gScale, `g rel diff (seed ${seed})`).toBeLessThan(1e-10)

        // and every Jacobian column matches to machine precision.
        const scale = Math.max(
          ...ad.dx.flatMap((c) => c.flatCoeffs().map(Math.abs)),
          ...ad.dy.flatMap((c) => c.flatCoeffs().map(Math.abs)),
          1,
        )
        const dxDiff = maxColDiff(analytic.dx, ad.dx)
        const dyDiff = maxColDiff(analytic.dy, ad.dy)
        expect(dxDiff / scale, `∂g/∂x rel diff (seed ${seed})`).toBeLessThan(1e-9)
        expect(dyDiff / scale, `∂g/∂y rel diff (seed ${seed})`).toBeLessThan(1e-9)
      }
    })
  }
})
