import { describe, it, expect } from 'vitest'
import { CurvatureDragProblem } from '../curvatureDrag'
import type { WeightedCP, AlgebraicFamily, Topology } from '../index'

// #32: the sparse/local constraint Jacobian must reconstruct EXACTLY to the dense one —
// the solver consumes the local rows instead of the dense matrix, so any divergence
// silently optimizes the wrong gradient.
function build(kind: AlgebraicFamily, topo: Topology, n: number) {
  const deg = 3
  let knots: number[]
  if (topo === 'closed') knots = Array.from({ length: n }, (_, i) => i / n)
  else { knots = []; for (let i=0;i<=deg;i++) knots.push(0); for (let i=1;i<n-deg;i++) knots.push(i/(n-deg)); for (let i=0;i<=deg;i++) knots.push(1) }
  const cps: WeightedCP[] = Array.from({ length: n }, (_, i) => ({
    re: -150 + 40 * i + 10 * Math.cos(i), im: 20 * Math.sin(0.8 * i),
    wRe: kind === 'complex' ? 1 + 0.1 * Math.cos(i) : 1, wIm: kind === 'complex' ? 0.05 * Math.sin(i) : 0,
  }))
  return new CurvatureDragProblem(kind, cps, knots, deg, topo, 2, { x: cps[2].re - 30, y: cps[2].im + 80 },
    cps.map((p) => p.wRe), cps.map((p) => p.wIm), 'analytic', { re: 1, im: 0 }, {})
}

describe('#32 local constraint Jacobian == dense', () => {
  for (const kind of ['rational', 'complex'] as const) {
    for (const topo of ['open', 'closed'] as const) {
      it(`${kind}/${topo}`, () => {
        const p = build(kind, topo, topo === 'closed' ? 12 : 10)
        const dense = p.computeConstraintJacobian()
        const local = p.computeConstraintJacobianLocal()
        expect(local, 'local Jacobian should not be null for complex/rational').not.toBeNull()
        expect(local!.length).toBe(dense.length)
        const nVars = p.numVariables
        let maxDiff = 0
        for (let k = 0; k < dense.length; k++) {
          const recon = new Array<number>(nVars).fill(0)
          const r = local![k]
          for (let a = 0; a < r.vars.length; a++) recon[r.vars[a]] += r.vals[a]
          for (let j = 0; j < nVars; j++) maxDiff = Math.max(maxDiff, Math.abs(recon[j] - dense[k][j]))
        }
        const scale = Math.max(...dense.flat().map(Math.abs), 1)
        expect(maxDiff / scale, `maxRelDiff ${maxDiff/scale}`).toBeLessThan(1e-9)
      })
    }
  }
})
