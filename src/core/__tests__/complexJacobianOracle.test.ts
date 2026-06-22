import { describe, it, expect } from 'vitest'
import {
  curvatureExtremaGradientComplexPeriodicFixedWeight,
  curvatureExtremaNumeratorComplexPeriodic,
  precomputeComplexPeriodicSeeds,
} from '../curvature'
import type { BernsteinDecomposition } from '../bernstein'

/**
 * Oracle test for the complex-rational analytic Jacobian — the one its docstring
 * (and ARCHITECTURE.md) claimed was "verified bit-equal against the
 * finite-difference Jacobian" but which did not actually exist. This is the most
 * error-prone hand-derived artifact in core/ (a complex Wirtinger differential
 * with conj()/scale(1.5)/×2/×3 terms), and the one place the codebase's own
 * "readable oracle + fast impl, equivalence-tested" pattern had promised
 * protection. Now it has it.
 *
 * curvatureExtremaGradientComplexPeriodicFixedWeight returns { g, dx, dy } where
 * dx[i] = ∂g/∂Re(zᵢ) and dy[i] = ∂g/∂Im(zᵢ) (weights fixed). We central-difference
 * its own g output and compare. A correct gradient matches to FD truncation error
 * (~1e-5 here); a sign flip or dropped term would be off by O(1).
 */

const flat = (bd: BernsteinDecomposition): number[] => bd.coeffs.flat()

describe('complex-rational analytic Jacobian matches finite differences (oracle)', () => {
  it('dx/dy equal central differences of g (closed deg-3 complex-rational curve)', () => {
    const n = 6
    const degree = 3
    const knots = Array.from({ length: n }, (_, i) => i / n) // uniform periodic
    // A generic closed curve with genuinely complex (rational) weights so the
    // W-dependent terms of g are exercised.
    const zre = [200, 120, -100, -200, -90, 110]
    const zim = [0, 170, 150, 0, -160, -140]
    const wre = [1, 0.95, 1.1, 1, 0.9, 1.05]
    const wim = [0, 0.05, -0.04, 0, 0.03, -0.02]

    const g = (zr: number[], zi: number[]) =>
      flat(curvatureExtremaGradientComplexPeriodicFixedWeight(zr, zi, wre, wim, knots, degree).g)

    const analytic = curvatureExtremaGradientComplexPeriodicFixedWeight(zre, zim, wre, wim, knots, degree)
    const h = 1e-2

    let maxRel = 0
    const compare = (an: BernsteinDecomposition, fd: number[]) => {
      const a = flat(an)
      let scale = 0
      for (let k = 0; k < a.length; k++) scale = Math.max(scale, Math.abs(a[k]), Math.abs(fd[k]))
      if (scale === 0) return
      for (let k = 0; k < a.length; k++) maxRel = Math.max(maxRel, Math.abs(a[k] - fd[k]) / scale)
    }

    for (let i = 0; i < n; i++) {
      const zreP = [...zre]; zreP[i] += h
      const zreM = [...zre]; zreM[i] -= h
      const gpx = g(zreP, zim), gmx = g(zreM, zim)
      compare(analytic.dx[i], gpx.map((v, k) => (v - gmx[k]) / (2 * h)))

      const zimP = [...zim]; zimP[i] += h
      const zimM = [...zim]; zimM[i] -= h
      const gpy = g(zre, zimP), gmy = g(zre, zimM)
      compare(analytic.dy[i], gpy.map((v, k) => (v - gmy[k]) / (2 * h)))
    }

    expect(maxRel).toBeLessThan(1e-3) // FD truncation ~1e-5; a wrong gradient would be O(1)
  })

  // ρ≠1 (spiral monodromy) guard: the seam-crossing columns are only correct if the
  // gradient SEEDS carry the same ρ-scaling as the value terms. With ρ=1 seeds those
  // columns were off by O(1e-2…1e-1) — invisible to the bound (a flattened curve has
  // fewer extrema) but it flattened segments in the editor. This catches that.
  it('dx/dy equal central differences of the ρ-aware g (spiral, real + complex ρ)', () => {
    const n = 8
    const degree = 3
    const knots = Array.from({ length: n }, (_, i) => i / n)
    const zre = [200, 120, -100, -200, -90, 110, 150, 60]
    const zim = [0, 170, 150, 0, -160, -140, 80, -90]
    const wre = [1, 0.95, 1.1, 1, 0.9, 1.05, 1.02, 0.97]
    const wim = [0, 0.05, -0.04, 0, 0.03, -0.02, 0.04, -0.03]

    for (const rho of [{ re: 1.5, im: 0 }, { re: 0.6, im: 0 }, { re: 1.2, im: 0.3 }]) {
      const seeds = precomputeComplexPeriodicSeeds(knots, degree, n, rho)
      // FD uses the cheap numerator (one decompose), not the full gradient.
      const g = (zr: number[], zi: number[]) =>
        curvatureExtremaNumeratorComplexPeriodic(zr, zi, wre, wim, knots, degree, rho).flatCoeffs()
      const analytic = curvatureExtremaGradientComplexPeriodicFixedWeight(zre, zim, wre, wim, knots, degree, seeds, rho)
      const h = 1e-2
      let maxRel = 0
      const compare = (an: BernsteinDecomposition, fd: number[]) => {
        const a = flat(an)
        let scale = 0
        for (let k = 0; k < a.length; k++) scale = Math.max(scale, Math.abs(a[k]), Math.abs(fd[k]))
        if (scale === 0) return
        for (let k = 0; k < a.length; k++) maxRel = Math.max(maxRel, Math.abs(a[k] - fd[k]) / scale)
      }
      for (let i = 0; i < n; i++) {
        const zreP = [...zre]; zreP[i] += h
        const zreM = [...zre]; zreM[i] -= h
        compare(analytic.dx[i], g(zreP, zim).map((v, k) => (v - g(zreM, zim)[k]) / (2 * h)))
        const zimP = [...zim]; zimP[i] += h
        const zimM = [...zim]; zimM[i] -= h
        compare(analytic.dy[i], g(zre, zimP).map((v, k) => (v - g(zre, zimM)[k]) / (2 * h)))
      }
      expect(maxRel, `ρ=${rho.re}+${rho.im}i`).toBeLessThan(1e-3)
    }
  })
})
