import { describe, it, expect } from 'vitest'
import {
  slideCurve,
  cyclicSignChanges,
  assignSignsNeighbor,
  curvatureExtremaNumeratorPlanar,
  curvatureExtremaNumeratorPlanarPeriodic,
} from '../index'

// ============================================================================
// RUST-PARITY (drags) — ports the faithful-drag contract tests from ne-core
// (optimizer.rs / interior_point.rs) into TypeScript, run through the PRODUCTION
// drag (slideCurve with the editor's options: ipopt, banded, 20 iters, no BFGS).
//
// Two kinds of assertion (CLAUDE.md Laws 1–2):
//   • BOUND   — S⁻ never rises across the drag (the law). Rust asserts only this.
//   • PROGRESS — the dragged point actually tracks the cursor. Rust asserts only
//     the weak `along > 0`; we make it QUANTITATIVE, because a "bound never rises"
//     test is trivially satisfied by a BLOCKED drag (a point that won't move keeps
//     the bound). Progress is what catches blocking — the regression bound-tests
//     are blind to (docs/CURVATURE_FOUNDATIONS.md F1).
// ============================================================================

const boundOf = (x: number[], y: number[], knots: number[], d: number, closed: boolean) =>
  cyclicSignChanges(
    assignSignsNeighbor(
      (closed
        ? curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, d)
        : curvatureExtremaNumeratorPlanar(x, y, knots, d)
      ).flatCoeffs(),
    ),
    closed,
  )

// One production drag step (the exact options sceneStore.moveControlPoint uses).
const dragStep = (x: number[], y: number[], knots: number[], d: number, k: number, tx: number, ty: number, closed: boolean) => {
  const r = slideCurve(x, y, knots, d, k, tx, ty, {
    method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false, ...(closed ? { closed: true } : {}),
  })
  return { x: r.x, y: r.y }
}

const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

describe('rust-parity drags: OPEN (optimizer.rs)', () => {
  // ports `sliding_never_increases_the_bound`
  const knots = [0, 0, 0, 0, 1, 2, 3, 4, 4, 4, 4]
  const X = [0, 1, 3, 2.5, 4, 6, 7]
  const Y = [0, 2, 1, -1, 0.5, 2, -0.5]
  const drags: [number, number, number][] = [[1, 1.5, -1], [3, -2, 2.5], [4, 2, 1.5], [5, -1.5, -2]]

  it('sliding never increases the bound — and the point tracks (single step)', () => {
    const before = boundOf(X, Y, knots, 3, false)
    for (const [k, dx, dy] of drags) {
      const r = dragStep(X, Y, knots, 3, k, X[k] + dx, Y[k] + dy, false)
      expect(boundOf(r.x, r.y, knots, 3, false), `drag k=${k}: bound rose`).toBeLessThanOrEqual(before)
      // PROGRESS (quantitative): a small, bound-feasible drag should mostly reach the cursor.
      const want = Math.hypot(dx, dy)
      const got = (r.x[k] - X[k]) * (dx / want) + (r.y[k] - Y[k]) * (dy / want) // signed projection onto the drag dir
      expect(got, `drag k=${k}: tracked ${got.toFixed(2)} of ${want.toFixed(2)}`).toBeGreaterThan(0.5 * want)
    }
  })

  // ports `simulated_drag_never_increases_the_bound` (80 warm-started steps, drag far + wiggle)
  it('simulated drag (80 warm-started steps) never increases the bound', () => {
    const before = boundOf(X, Y, knots, 3, false)
    for (const k of [1, 3, 4]) {
      let cx = X.slice(), cy = Y.slice()
      const x0 = cx[k], y0 = cy[k]
      for (let step = 1; step <= 80; step++) {
        const s = step / 80
        const r = dragStep(cx, cy, knots, 3, k, x0 + 3 * s, y0 + 2.5 * Math.sin(s * 7), false)
        cx = r.x; cy = r.y
        expect(boundOf(cx, cy, knots, 3, false), `k=${k} step ${step}: bound rose`).toBeLessThanOrEqual(before)
      }
    }
  }, 30000)

  // ports `user_reported_nonuniform_drag_never_increases_bound` (clustered knots, 40 steps)
  it('user-reported NON-UNIFORM drag (40 steps) never increases the bound', () => {
    const knotsNU = [0, 0, 0, 0, 0.25, 0.5, 0.75, 0.863667348329925, 0.9372869802317655, 1, 1, 1, 1]
    const x0 = [77.016, -143.411, -299.703, -415.656, -436.108, -259.825, -110.932, -0.185, 58.897]
    const y0 = [16.679, -5.457, -22.222, -43.772, -147.224, -189.072, -119.153, -91.088, -88.836]
    const start = boundOf(x0, y0, knotsNU, 3, false)
    const k = 6, sx = x0[k], sy = y0[k], tx = -60.879, ty = -214.324
    let x = x0.slice(), y = y0.slice()
    for (let s = 1; s <= 40; s++) {
      const f = s / 40
      const r = dragStep(x, y, knotsNU, 3, k, sx + (tx - sx) * f, sy + (ty - sy) * f, false)
      x = r.x; y = r.y
      expect(boundOf(x, y, knotsNU, 3, false), `step ${s}: bound rose`).toBeLessThanOrEqual(start)
    }
  }, 30000)
})

describe('rust-parity drags: CLOSED (optimizer.rs / interior_point.rs)', () => {
  // closed_polynomial_curve(): n=10, period-1 form (curvature bound is parameter-invariant)
  const n = 10, knots = periodicKnots(n), tau = Math.PI * 2
  const X = Array.from({ length: n }, (_, i) => Math.cos((tau * i) / n) * 2 + 0.3 * Math.sin(i))
  const Y = Array.from({ length: n }, (_, i) => Math.sin((tau * i) / n) * 2)

  // ports `closed_sliding_never_increases_the_bound`
  it('closed sliding never increases the bound', () => {
    const before = boundOf(X, Y, knots, 3, true)
    for (const [k, dx, dy] of [[2, 1.2, 1], [5, -1.5, 0.8], [7, 1, -1.2]] as [number, number, number][]) {
      const r = dragStep(X, Y, knots, 3, k, X[k] + dx, Y[k] + dy, true)
      expect(boundOf(r.x, r.y, knots, 3, true), `closed drag k=${k}: bound rose`).toBeLessThanOrEqual(before)
    }
  })

  // ports `faithful_closed_drag_tracks_and_preserves_bound` (bound + the point tracks)
  it('faithful closed drag — bound held AND the point tracks the cursor', () => {
    const before = boundOf(X, Y, knots, 3, true)
    for (const [k, dx, dy] of [[0, 1, 0.5], [3, -0.8, 0.6], [6, 0.5, -0.9]] as [number, number, number][]) {
      let x = X.slice(), y = Y.slice()
      const sx0 = x[k], sy0 = y[k]
      for (let s = 1; s <= 30; s++) {
        const f = s / 30
        const r = dragStep(x, y, knots, 3, k, sx0 + dx * f, sy0 + dy * f, true)
        x = r.x; y = r.y
        expect(boundOf(x, y, knots, 3, true), `closed CP${k} step ${s}: bound rose`).toBeLessThanOrEqual(before)
      }
      const along = (x[k] - sx0) * dx + (y[k] - sy0) * dy
      expect(along, `closed CP${k} moved opposite to / not along the drag`).toBeGreaterThan(0)
    }
  }, 30000)
})

// ============================================================================
// THE CONDITIONING TARGET (docs/CURVATURE_FOUNDATIONS.md F1, task #29).
//
// On a clustered-knot closed curve, dragging certain control points "left" stalls.
// PART of that is correct — moving those points really does want more extrema, and
// the bound must resist (Law 2). What is NOT correct is the SOLVER RETREATING: with
// MORE iterations the dragged point tracks LESS (CP6: 5 units at 20 iters → 0 at
// 400), the signature of the 1e12 span-driven ill-conditioning. A well-conditioned
// optimizer converges toward the constrained optimum monotonically — never away.
//
// We pin MONOTONICITY (oracle-free, provably-correct): more iterations must not
// reduce progress. It fails today; un-skip it when the closed conditioning is fixed.
// (How FAR a point *should* travel is a separate question that needs the reference
// oracle — Rust / the online sketcher — to answer; not asserted here.)
// ============================================================================
describe.skip('rust-parity drags: closed conditioning (F1 / task #29) — definition of done', () => {
  it('more iterations must not REDUCE how far a point tracks (no retreat)', () => {
    const knots = [0, 0.023081634004237288, 0.04742121292372881, 0.08333333333333333, 0.16666666666666666, 0.25, 0.3333333333333333, 0.4166666666666667, 0.5, 0.5833333333333334, 0.6666666666666666, 0.75, 0.8333333333333334, 0.9166666666666666]
    const X = [-187.00198190273798, -249.6703230845378, 0.5806739245545225, 85.40649647491095, 86.83270580269814, 16.832237425253325, -225.06304436692486, -288.91145532595976, -279.43656886655765, -237.34226748128268, -180.61524404942742, -163.78604715091004, -137.05594239668747, 217.69911126172948]
    const Y = [-269.03372027333927, -220.22767599669288, -168.5007373795089, -154.95022212166538, -132.61208880507218, -139.4074857944229, -136.3449242065748, -67.70681283896701, -18.52274285415564, 6.499129543721467, -12.727628117762599, 9.396818039121975, 35.30768181326447, -149.82903188444914]
    const before = boundOf(X, Y, knots, 3, true)
    const reach = (k: number, iters: number) => {
      const sx0 = X[k]
      let x = X.slice(), y = Y.slice()
      for (let s = 1; s <= 40; s++) {
        const f = s / 40
        const r = slideCurve(x, y, knots, 3, k, sx0 - 80 * f, Y[k], { method: 'ipopt', bandedSolve: true, maxIterations: iters, enableBFGS: false, closed: true })
        x = r.x; y = r.y
      }
      expect(boundOf(x, y, knots, 3, true)).toBeLessThanOrEqual(before) // bound always held
      return sx0 - x[k] // leftward distance reached
    }
    for (const k of [6, 9, 3, 7]) {
      const lo = reach(k, 20), hi = reach(k, 400)
      expect(hi, `CP${k}: 400 iters tracked ${hi.toFixed(0)} < 20 iters ${lo.toFixed(0)} (retreat)`).toBeGreaterThanOrEqual(lo - 0.5)
    }
  }, 60000)
})
