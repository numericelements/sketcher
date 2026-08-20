// ============================================================================
// PRESCRIBING POINTS ON THE CURVE — the other half of the pair, and it counts differently.
//
// Same family, same K quadrics in K unknowns, same homotopy. What differs is the weights: a
// prescribed CONTROL POINT sums whole legs, a prescribed POINT ON THE CURVE integrates the
// hodograph,
//
//     c(T) − c(0) = ∫₀^T w² dt = Σ_i N_i·G_i(T),   G_i(T) = (1/n)·Σ_{j>i} B_j^n(T)
//
// exact rather than quadrature, because B_aB_b is a multiple of a single Bernstein polynomial.
//
// AND THE ANSWERS DIFFER. Points on the curve give exactly 2^{K−1}, every time — the count does
// NOT depend on which parameters are chosen. Control points give 1 … 2^{K−1}, depending on which
// are held (planarPHSubsetCounts). That is the distinction the deck's section divider carries, and
// the reason is visible in the weights: whole-leg weights can be triangular and throw roots to
// infinity, real integral weights generically cannot.
//
// THE SOLVER IS CROSS-CHECKED against two independent implementations already in the repo, both
// written from different algebra: phCubic's closed form at K=2 (one complex quadratic in r = w₁/w₀)
// and phPlanarSepticInterp's Cayley-octad homotopy at K=4. K=3 — the quintic through four points —
// did not exist anywhere before and is the reason this entry point was written.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../complex'
import { solveThroughPoints, degreeOf } from '../planarPHSubset'
import { phCubicThroughThreePoints } from '../phCubic'
import { septicInterpolants } from '../phPlanarSepticInterp'

const C = (re: number, im: number): Complex => ({ re, im })
const dist = (a: Complex, b: Complex): number => Math.hypot(a.re - b.re, a.im - b.im)
/** worst control-point gap, after matching each of ours to its nearest reference */
function worstMatch(mine: Complex[][], theirs: Complex[][]): number {
  let worst = 0
  for (const m of mine) {
    let best = Infinity
    for (const t of theirs) best = Math.min(best, Math.max(...m.map((p, i) => dist(p, t[i]))))
    worst = Math.max(worst, best)
  }
  return worst
}

describe('planar PH curves through prescribed points on the curve', () => {
  it('K=2 (cubic, three points): agrees with phCubic’s closed form', () => {
    const q = [C(-2.1, -0.7), C(0.3, 1.5), C(2.4, -0.4)]
    const ts = [0, 0.5, 1]
    const mine = solveThroughPoints(2, ts, q)
    const theirs = phCubicThroughThreePoints(q[0], q[1], q[2], 0.5)

    expect(mine.failed, 'every path accounted for').toBe(0)
    expect(mine.finitePaths + mine.diverged + mine.failed).toBe(mine.paths)
    expect(theirs.length, 'the closed form finds two').toBe(2)
    expect(mine.solutions.length, 'and so does the homotopy — 2^{K−1} = 2').toBe(2)

    const gap = worstMatch(mine.solutions.map((s) => s.controlPoints), theirs.map((s) => s.controlPoints))
    console.log(`    K=2: ${mine.solutions.length} curves, worst control-point gap vs phCubic ${gap.toExponential(1)}`)
    expect(gap, 'the same two curves, not merely the same count').toBeLessThan(1e-9)
  }, 120_000)

  it('K=4 (septic, five points): agrees with phPlanarSepticInterp’s Cayley-octad homotopy', () => {
    const q = [C(-2.4, -0.6), C(-1.0, 1.1), C(0.4, -0.9), C(1.6, 1.2), C(2.6, -0.2)]
    const ts = [0, 0.25, 0.5, 0.75, 1]
    const mine = solveThroughPoints(4, ts, q)
    const theirs = septicInterpolants(q, ts)

    expect(mine.failed, 'every path accounted for').toBe(0)
    expect(theirs.length, 'the octad gives eight').toBe(8)
    expect(mine.solutions.length, 'and so does the homotopy — 2^{K−1} = 8').toBe(8)

    const gap = worstMatch(
      mine.solutions.map((s) => s.controlPoints),
      theirs.map((b) => b.solution.controlPoints),
    )
    console.log(`    K=4: ${mine.solutions.length} curves, worst control-point gap vs the octad ${gap.toExponential(1)}`)
    expect(gap, 'the same eight curves').toBeLessThan(1e-7)
  }, 300_000)

  it('K=3 (quintic, four points): four curves, and nothing to compare against', () => {
    // The rung that did not exist. Nothing in the repo solved it before, so it is checked against
    // the theory (2^{K−1} = 4) and against itself: every solution must actually pass through the
    // prescribed points.
    const q = [C(-2.2, -0.5), C(-0.6, 1.3), C(1.1, -1.0), C(2.4, 0.4)]
    const ts = [0, 1 / 3, 2 / 3, 1]
    const r = solveThroughPoints(3, ts, q)
    expect(r.failed).toBe(0)
    expect(r.finitePaths + r.diverged + r.failed).toBe(r.paths)
    expect(r.solutions.length, '2^{K−1} = 4').toBe(4)

    // de Casteljau the control polygon at each prescribed parameter and check it lands
    let worst = 0
    for (const s of r.solutions) {
      for (let m = 0; m < ts.length; m++) {
        let p = s.controlPoints.map((z) => ({ ...z }))
        while (p.length > 1) {
          p = p.slice(0, -1).map((z, i) => ({
            re: (1 - ts[m]) * z.re + ts[m] * p[i + 1].re,
            im: (1 - ts[m]) * z.im + ts[m] * p[i + 1].im,
          }))
        }
        worst = Math.max(worst, dist(p[0], q[m]))
      }
    }
    console.log(`    K=3: degree ${degreeOf(3)}, ${r.solutions.length} curves,` +
      ` worst interpolation error ${worst.toExponential(1)};` +
      ` R = ${r.solutions.map((s) => s.rotationIndex.toFixed(2)).join(' ')}`)
    expect(worst, 'each curve really passes through all four points').toBeLessThan(1e-9)
  }, 120_000)

  it('the count does NOT depend on the parameters, unlike the control-point problem', () => {
    // Control points: 1 … 2^{K−1} depending on which are held. Points on the curve: always 2^{K−1}.
    const q = [C(-2.2, -0.5), C(-0.6, 1.3), C(1.1, -1.0), C(2.4, 0.4)]
    for (const ts of [[0, 1 / 3, 2 / 3, 1], [0, 0.2, 0.55, 1], [0.1, 0.4, 0.7, 0.95]]) {
      const r = solveThroughPoints(3, ts, q)
      expect(r.failed).toBe(0)
      expect(r.solutions.length, `parameters ${ts.join(',')} still give four`).toBe(4)
    }
  }, 300_000)
})
