import { describe, it, expect } from 'vitest'
import { decomposeToBernstein, type BernsteinDecomposition } from '../bernstein'
import { curvatureExtremaNumeratorPH } from '../phCurvature'

// PH-SPECIFIC curvature-extrema numerator reduction (the "PH removes the square root" payoff).
// κ = 2P/σ²,  P = uv'−vu' (deg 2m−1),  σ = u²+v² (deg 2m).  The dκ/ds numerator therefore
// reduces to R = P'σ − 2Pσ' (deg 4m−2), and the general g carries a redundant σ²:
//
//     g  =  2 · R · σ²        (verified to machine precision here)
//
// Since σ² > 0, R has the SAME sign changes (curvature extrema) as g, at HALF the degree
// (6 vs 14 for a quintic) and dramatically better conditioning (g's coefficient dynamic range
// reaches ~1e15–1e21; R's stays ~1e1–1e3). This is the candidate for a better-conditioned,
// less-stiff PH curvature-extrema constraint (#23 / FOUNDATIONS F1). Open PH only (closed needs
// the periodic reduction); for open, gen-span g ≡ curve-span g (F6).

const M = 2
const KNOTS = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1]
const CASES: [string, number[], number[]][] = [
  ['wiggle-1', [0, 40, -30, 60, -20, 50], [10, -50, 40, -60, 30, -10]],
  ['wiggle-2', [5, -20, 35, -10, 45, 15], [-30, 25, -40, 50, -15, 35]],
  ['wiggle-3', [10, 10, -25, 25, -25, 25], [0, 30, -30, 30, -30, 30]],
  ['gentle', [0, 20, 40, 60, 80, 100], [0, 5, -5, 5, -5, 0]],
]
const deg = (b: BernsteinDecomposition) => b.coeffs[0].length - 1
const dyn = (b: BernsteinDecomposition) => {
  const a = b.flatCoeffs().map(Math.abs).filter((x) => x > 0)
  return Math.max(...a) / Math.min(...a)
}

describe('PH reduced curvature-extrema numerator: g = 2·R·σ²', () => {
  it.each(CASES)('reduction holds + lower degree + better conditioned: %s', (_l, U, V) => {
    const u = decomposeToBernstein(U, KNOTS, M), v = decomposeToBernstein(V, KNOTS, M)
    const P = u.multiply(v.derivative()).subtract(v.multiply(u.derivative())) // uv'−vu'
    const sigma = u.multiply(u).add(v.multiply(v))                            // u²+v²
    const R = P.derivative().multiply(sigma).subtract(P.multiply(sigma.derivative()).scale(2)) // P'σ−2Pσ'
    const g = curvatureExtremaNumeratorPH(U, V, KNOTS, M, false)

    // g(t) / (R(t)·σ(t)²) is the constant 2 — proves identical real zeros (same extrema).
    const ratios: number[] = []
    for (const t of [0.12, 0.31, 0.52, 0.68, 0.83]) {
      const d = R.evaluate(t) * sigma.evaluate(t) ** 2
      if (Math.abs(d) > 1e-6) ratios.push(g.evaluate(t) / d)
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length
    const spread = Math.max(...ratios.map((r) => Math.abs(r - mean))) / Math.abs(mean)
    expect(mean).toBeCloseTo(2, 6)
    expect(spread).toBeLessThan(1e-9)

    expect(deg(R)).toBe(6)
    expect(deg(g)).toBe(14)
    expect(dyn(R)).toBeLessThan(dyn(g)) // R far better conditioned
  })
})
