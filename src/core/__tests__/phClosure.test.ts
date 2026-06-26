import { describe, it, expect } from 'vitest'
import { generatorBasisGram, closureGap, closureJacobian } from '../index'
import { computePHCurveFromUV } from '../../sketcher/optimizer/phCurve'

// The core closure gap ∮w² must equal the sketcher's curve-endpoint gap r(1)−r(0)
// (the oracle), and its analytic Jacobian must match finite differences. This is the
// closure constraint the core PH drag will hold — parity-validated, no curve construction.

// A clamped quadratic generator (degree 2): n control points, knots length n+3.
const m = 2
function genKnots(n: number): number[] {
  const k: number[] = []
  for (let i = 0; i <= m; i++) k.push(0)
  const inner = n - m - 1
  for (let i = 1; i <= inner; i++) k.push(i / (inner + 1))
  for (let i = 0; i <= m; i++) k.push(1)
  return k
}

describe('PH closure: core ∮w² matches the sketcher curve gap', () => {
  it('gap parity across random generators', () => {
    for (let s = 0; s < 8; s++) {
      const n = 6 + (s % 4)
      const knots = genKnots(n)
      const u = Array.from({ length: n }, (_, i) => 30 + 20 * Math.sin(i * 1.3 + s) + 4 * i)
      const v = Array.from({ length: n }, (_, i) => 15 * Math.cos(i * 0.9 + s) - 2 * i)
      const G = generatorBasisGram(knots, m, n)
      const gap = closureGap(u, v, G)
      const curve = computePHCurveFromUV(u, v, knots, m, 0, 0)
      const cps = curve.controlPoints
      const oracleX = cps[cps.length - 1].x - cps[0].x
      const oracleY = cps[cps.length - 1].y - cps[0].y
      const scale = Math.max(1, Math.abs(oracleX), Math.abs(oracleY))
      expect(Math.abs(gap.re - oracleX) / scale, `seed ${s}: re ${gap.re} vs ${oracleX}`).toBeLessThan(1e-6)
      expect(Math.abs(gap.im - oracleY) / scale, `seed ${s}: im ${gap.im} vs ${oracleY}`).toBeLessThan(1e-6)
    }
  })

  it('closure Jacobian matches finite differences', () => {
    const n = 7, knots = genKnots(n)
    const u = Array.from({ length: n }, (_, i) => 25 + 10 * Math.sin(i + 1))
    const v = Array.from({ length: n }, (_, i) => 8 * Math.cos(i * 1.1))
    const G = generatorBasisGram(knots, m, n)
    const J = closureJacobian(u, v, G)
    const h = 1e-5
    for (let k = 0; k < n; k++) {
      const up = u.slice(); up[k] += h; const um = u.slice(); um[k] -= h
      const dReDu = (closureGap(up, v, G).re - closureGap(um, v, G).re) / (2 * h)
      const dImDu = (closureGap(up, v, G).im - closureGap(um, v, G).im) / (2 * h)
      expect(Math.abs(J.reDu[k] - dReDu)).toBeLessThan(1e-4 * (Math.abs(dReDu) + 1))
      expect(Math.abs(J.imDu[k] - dImDu)).toBeLessThan(1e-4 * (Math.abs(dImDu) + 1))
      const vp = v.slice(); vp[k] += h; const vm = v.slice(); vm[k] -= h
      const dReDv = (closureGap(u, vp, G).re - closureGap(u, vm, G).re) / (2 * h)
      const dImDv = (closureGap(u, vp, G).im - closureGap(u, vm, G).im) / (2 * h)
      expect(Math.abs(J.reDv[k] - dReDv)).toBeLessThan(1e-4 * (Math.abs(dReDv) + 1))
      expect(Math.abs(J.imDv[k] - dImDv)).toBeLessThan(1e-4 * (Math.abs(dImDv) + 1))
    }
  })
})
