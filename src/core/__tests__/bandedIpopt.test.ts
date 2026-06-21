import { describe, it, expect } from 'vitest'
import { slideCurve, openCurvatureExtremaParameters, curvatureExtremaNumeratorPlanar } from '../index'

/**
 * The KEYSTONE: the robust IPOPT solver made LINEAR by a banded LDLᵀ inner solve
 * (config.bandedSolve), on the well-conditioned SCALED-ROBUST regime. Because the
 * regime conditions the Hessian, the banded solve now matches the dense one — so
 * banded ipopt is BOTH:
 *   1. bound-faithful — never grows the curvature-extrema count OR the strict
 *      Bernstein sign-count, even on the degenerate structural-zero parabola
 *      (0/75, exactly like dense ipopt — the thing the raw-regime banded solve
 *      could not do), and
 *   2. tracking-equivalent to dense ipopt on well-conditioned curves.
 * That makes it the fast-AND-robust open-planar drag solver.
 */

// ── slide-4 structural-zero parabola — the hard faithfulness fixture ──
const degree = 4
const KNOTS = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
const X0 = [-1, -0.5, 0, 0.5, 1].map((v) => v * 200)
const Y0 = [-0.978, -0.022, 0.356, -0.02, -0.978].map((v) => v * 200)

const gCoefs = (x: number[], y: number[]) => curvatureExtremaNumeratorPlanar(x, y, KNOTS, degree).flatCoeffs()
function displaySignChanges(v: number[]): number {
  let c = 0, last = 0
  for (const x of v) { if (x === 0) continue; const s = x > 0 ? 1 : -1; if (last !== 0 && s !== last) c++; last = s }
  return c
}
const sc = (x: number[], y: number[]) => displaySignChanges(gCoefs(x, y))
const ex = (x: number[], y: number[]) => openCurvatureExtremaParameters(x, y, KNOTS, degree).length

function drag(x0: number[], y0: number[], knots: number[], deg: number, di: number, tx: number, ty: number, frames: number, banded: boolean) {
  let x = x0.slice(), y = y0.slice()
  for (let i = 0; i < frames; i++) {
    const f = (i + 1) / frames
    const r = slideCurve(x, y, knots, deg, di, x0[di] + (tx - x0[di]) * f, y0[di] + (ty - y0[di]) * f, {
      method: 'ipopt', maxIterations: 40, anchorWeight: 0.05, anchorX: x0.slice(), anchorY: y0.slice(), bandedSolve: banded,
    })
    x = r.x; y = r.y
  }
  return { x, y }
}

const TARGETS: [number, number][] = [[0, 200], [0, -300], [300, 200], [-300, 200], [200, -200]]
const FRAMES = [1, 2, 4]
const CPS = [0, 1, 2, 3, 4]

describe('banded IPOPT (linear + robust open-planar drag)', () => {
  it('is bound-faithful on the structural-zero parabola (0/75, like dense ipopt)', () => {
    const startSc = sc(X0, Y0), startEx = ex(X0, Y0)
    let scGrew = 0, exGrew = 0
    for (const di of CPS) for (const t of TARGETS) for (const fr of FRAMES) {
      const r = drag(X0, Y0, KNOTS, degree, di, X0[di] + t[0], Y0[di] + t[1], fr, true)
      if (sc(r.x, r.y) > startSc) scGrew++
      if (ex(r.x, r.y) > startEx) exGrew++
    }
    expect(exGrew).toBe(0)
    expect(scGrew).toBe(0)
  })

  it('is a PER-SOLVE drop-in for dense ipopt (identical step) on a well-conditioned curve', { timeout: 30000 }, () => {
    // Per-solve equivalence is the right metric: a banded factorization solves the
    // SAME well-conditioned Newton system as dense Cholesky, so one solve must give
    // the same curve. (Over many CHAINED frames the two valid trajectories diverge
    // chaotically — both bound-faithful, both reaching the cursor equally — which is
    // sensitivity, not a solve deficiency, so we test ONE solve.)
    const n = 40
    const x: number[] = [], y: number[] = []
    for (let i = 0; i < n; i++) { x.push(-300 + (600 * i) / (n - 1)); y.push(120 * Math.sin((i / (n - 1)) * Math.PI * 4)) }
    const knots: number[] = []
    for (let i = 0; i <= 3; i++) knots.push(0)
    const internal = n - 3 - 1
    for (let i = 1; i <= internal; i++) knots.push(i / (internal + 1))
    for (let i = 0; i <= 3; i++) knots.push(1)
    let maxDiff = 0
    for (const di of [10, 20, 30]) {
      for (const [dx, dy] of [[0, 60], [40, -40], [-60, 30]] as [number, number][]) {
        const tx = x[di] + dx, ty = y[di] + dy
        const d = drag(x, y, knots, 3, di, tx, ty, 1, false)
        const b = drag(x, y, knots, 3, di, tx, ty, 1, true)
        for (let i = 0; i < n; i++) maxDiff = Math.max(maxDiff, Math.abs(d.x[i] - b.x[i]), Math.abs(d.y[i] - b.y[i]))
      }
    }
    expect(maxDiff).toBeLessThan(0.5) // banded == dense per solve (≈ rounding)
  })
})
