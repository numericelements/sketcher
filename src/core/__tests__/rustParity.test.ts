import { describe, it, expect } from 'vitest'
import {
  cyclicSignChanges, assignSignsNeighbor, computeInactiveSetBySign,
  curvatureExtremaNumeratorPlanar, curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorRational, curvatureExtremaNumeratorComplex, curvatureExtremaNumeratorComplexPeriodic,
  openCurvatureExtremaParameters, closedCurvatureExtremaParameters,
} from '../index'

// ============================================================================
// RUST-PARITY SPEC — ports ne-core's contract tests (crates/ne-core/src/{optimizer,
// interior_point,rational,complex,…}.rs) into TypeScript. The Rust suite is the
// executable definition of "done" for curvature-extrema control across ALL families
// (docs/CURVATURE_ARCHITECTURE.md §7). Each test mirrors a named Rust test.
//
// GREEN here = a guarantee we already meet. `it.todo` = a Rust guarantee pending a
// convergence step (the finish line: every todo becomes green). Per-family drag
// bound-preservation lives in the diagnostic matrix (diagnosticMatrix.test.ts); this
// file holds the unit-level properties, the sliding mechanism, and the equivalences.
// ============================================================================

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)
const squiggle = (n: number) => ({
  x: Array.from({ length: n }, (_, i) => 40 * i + 13 * Math.sin(i * 1.7) - 2.5 * i * i),
  y: Array.from({ length: n }, (_, i) => 28 * Math.cos(i * 0.9) + 6 * i + 1.8 * i * i),
})

describe('rust-parity: the sliding mechanism (optimizer.rs)', () => {
  // ports `active_set_keeps_one_anchor_per_alternating_run`
  it('active set keeps one anchor (largest |g|) per alternating run', () => {
    // run of alternating signs at indices 1..5; same-sign neighbours at 0 and 6.
    const signs = [1, 1, -1, 1, -1, 1, 1]
    const abs = [9, 2, 5, 8, 3, 4, 9] // largest within the run (1..5) is index 3 (8)
    const inactive = computeInactiveSetBySign(signs, abs)
    expect([...inactive].sort((a, b) => a - b)).toEqual([1, 2, 4, 5]) // run minus the anchor
    expect(inactive.has(3)).toBe(false) // anchor stays active
    expect(inactive.has(0)).toBe(false) // same-sign neighbour stays active
    expect(inactive.has(6)).toBe(false)
  })

  // ports `sign_changes_counts_runs_skipping_zeros`
  it('sign_changes counts runs, skipping zeros; cyclic adds the seam', () => {
    expect(cyclicSignChanges([1, 0, 1, -1, 0, -1, 1], false)).toBe(2)
    expect(cyclicSignChanges([1, -1, 1, -1], false)).toBe(3)
    expect(cyclicSignChanges([1, -1, 1, -1], true)).toBe(4) // + seam wrap
  })

  // ports `closed_curve_count_is_even_and_at_least_four` (the four-vertex flavour)
  it('a closed curve bound is EVEN (cyclic sign-change parity)', () => {
    const n = 14, knots = periodicKnots(n)
    const cps = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n
      return { x: 170 * Math.cos(a) + 18 * Math.cos(3 * a), y: 95 * Math.sin(a) }
    })
    const g = curvatureExtremaNumeratorPlanarPeriodic(cps.map((p) => p.x), cps.map((p) => p.y), knots, 3)
    const bound = cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), true)
    expect(bound % 2, `closed bound ${bound} must be even`).toBe(0)
    expect(bound).toBeGreaterThanOrEqual(4)
  })
})

describe('rust-parity: the bound is a proper upper bound (optimizer.rs / grad.rs)', () => {
  // ports `extrema_bound_is_a_proper_upper_bound` (open)
  it('OPEN: S⁻ ≥ actual curvature extrema, random cubics', () => {
    for (let s = 0; s < 8; s++) {
      const n = 8 + (s % 4), knots = openKnots(n, 3)
      const x = Array.from({ length: n }, (_, i) => 50 * i + 20 * Math.sin(i + s) - i * i)
      const y = Array.from({ length: n }, (_, i) => 35 * Math.cos(i * 1.3 + s) + 4 * i)
      const bound = cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanar(x, y, knots, 3).flatCoeffs()), false)
      const actual = openCurvatureExtremaParameters(x, y, knots, 3).length
      expect(bound, `seed ${s}: bound ${bound} must be ≥ extrema ${actual}`).toBeGreaterThanOrEqual(actual)
    }
  })

  // ports `closed_bound_is_a_proper_upper_bound`
  it('CLOSED: S⁻ ≥ actual curvature extrema, random periodic cubics', () => {
    for (let s = 0; s < 8; s++) {
      const n = 10 + (s % 4), knots = periodicKnots(n)
      const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 160 * Math.cos(a) + 15 * Math.sin((2 + s) * a) })
      const y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 100 * Math.sin(a) + 12 * Math.cos((3 + s) * a) })
      const bound = cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, 3).flatCoeffs()), true)
      const actual = closedCurvatureExtremaParameters(x, y, knots, 3).length
      expect(bound, `seed ${s}: bound ${bound} must be ≥ extrema ${actual}`).toBeGreaterThanOrEqual(actual)
    }
  })
})

describe('rust-parity: numerator equivalences (rational.rs / complex.rs)', () => {
  // ports `rational_g_equals_generic_g_times_w10` (zeros coincide; here: w=1 reduces exactly)
  it('rational g reduces to the polynomial g when all weights = 1', () => {
    const { x, y } = squiggle(9), knots = openKnots(9, 3), w = x.map(() => 1)
    const rg = curvatureExtremaNumeratorRational(x, y, w, knots, 3).flatCoeffs()
    const pg = curvatureExtremaNumeratorPlanar(x, y, knots, 3).flatCoeffs()
    // proportional / equal up to the leading scale — compare sign-change counts (the bound)
    expect(cyclicSignChanges(rg.map(Math.sign), false)).toBe(cyclicSignChanges(pg.map(Math.sign), false))
  })

  // ports `complex_curvature_equals_real_polynomial_g` (closed, w=1)
  it('complex-rational g reduces to the polynomial g when weights = (1,0) (closed)', () => {
    const n = 12, knots = periodicKnots(n)
    const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 170 * Math.cos(a) }), y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 90 * Math.sin(a) })
    const cg = curvatureExtremaNumeratorComplexPeriodic(x, y, x.map(() => 1), x.map(() => 0), knots, 3, { re: 1, im: 0 })
    const pg = curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, 3)
    expect(cyclicSignChanges(assignSignsNeighbor(cg.flatCoeffs()), true)).toBe(cyclicSignChanges(assignSignsNeighbor(pg.flatCoeffs()), true))
  })

  // ports `complex_curvature_equals_real_polynomial_g` (OPEN, w=1) — the open analogue
  it('complex-rational g reduces to the polynomial g when weights = (1,0) (open)', () => {
    const { x, y } = squiggle(10), knots = openKnots(10, 3)
    const cg = curvatureExtremaNumeratorComplex(x, y, x.map(() => 1), x.map(() => 0), knots, 3)
    const pg = curvatureExtremaNumeratorPlanar(x, y, knots, 3)
    expect(cyclicSignChanges(assignSignsNeighbor(cg.flatCoeffs()), false)).toBe(cyclicSignChanges(assignSignsNeighbor(pg.flatCoeffs()), false))
  })
})

describe('rust-parity: closed bound parity across families (four-vertex even count)', () => {
  // ports `closed_curve_count_is_even_and_at_least_four` for rational + complex: the cyclic
  // bound of a periodic g is EVEN (the seam-wrap makes sign changes come in pairs).
  const evenClosedBound = (
    zre: number[], zim: number[], wre: number[], wim: number[], knots: number[],
  ) => cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplexPeriodic(zre, zim, wre, wim, knots, 3, { re: 1, im: 0 }).flatCoeffs()), true)

  it('CLOSED rational bound is even', () => {
    for (let s = 0; s < 12; s++) {
      const n = 10 + (s % 4), knots = periodicKnots(n)
      const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 14 * Math.sin((2 + s) * a) })
      const y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 95 * Math.sin(a) + 11 * Math.cos((3 + s) * a) })
      const w = Array.from({ length: n }, (_, i) => 0.6 + 0.3 * (1 + Math.cos(i + s)))
      const b = evenClosedBound(x, y, w, w.map(() => 0), knots)
      expect(b % 2, `closed rational seed ${s}: bound ${b} must be even`).toBe(0)
    }
  })

  it('CLOSED complex-rational bound is even', () => {
    for (let s = 0; s < 12; s++) {
      const n = 10 + (s % 4), knots = periodicKnots(n)
      const zre = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 13 * Math.sin((2 + s) * a) })
      const zim = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 95 * Math.sin(a) + 10 * Math.cos((3 + s) * a) })
      const wre = Array.from({ length: n }, (_, i) => 0.8 + 0.2 * Math.cos(i + s))
      const wim = Array.from({ length: n }, (_, i) => 0.1 * Math.sin(i * 1.2 + s))
      const b = evenClosedBound(zre, zim, wre, wim, knots)
      expect(b % 2, `closed complex seed ${s}: bound ${b} must be even`).toBe(0)
    }
  })
})

// ============================================================================
// THE FINISH LINE — Rust guarantees pending a convergence step. Each `todo`
// becomes a real (green) test as its step lands; "done" = no todos remain.
// ============================================================================
describe('rust-parity: pending guarantees (convergence targets)', () => {
  // ✓ DONE — per-family drag bound preservation for rational/complex CLOSED is now GREEN
  // in diagnosticMatrix.test.ts (the guard holds the bound; what remained was test timeout
  // = the rational/complex drag SPEED, a Step 7 concern, not a bound issue):
  //   faithful_rational_closed_drag_tracks_and_preserves_bound
  //   faithful_complex_closed_drag_tracks_and_preserves_bound
  // Legacy-routed open rational/complex (no guard) — Step 4 (migrate onto core):
  it.todo('faithful_rational_open_drag_tracks_and_preserves_bound — Step 4')
  it.todo('faithful_complex_open_drag_tracks_and_preserves_bound — Step 4')
  // PH family bound preservation + closure — Step 5 (port PH onto the spine):
  it.todo('faithful_ph_open_drag_tracks_and_preserves_bound — Step 5')
  it.todo('faithful_ph_closed_drag_holds_bound_and_closure — Step 5')
  it.todo('ph_curvature_matches_generic_g_of_hodograph — Step 5 (have a partial sketcher test)')
  // Cross-family + properties for rational/complex/PH (we have them for polynomial):
  it.todo('sliding_never_increases_bound_across_families — Steps 1–5')
  // ✓ DONE — rational_/complex_rational_(open+closed)_bound_is_a_proper_upper_bound are
  // GREEN in lawBoundIsUpperBound.test.ts ("Law 1 across families": S⁻ ≥ markers).
  it.todo('rational_hessian_backends_agree — needs the rational exact Hessian organ')
  // Tight bound (B-spline g) — needs Spline.product ported (relates to the loose-bound issue):
  it.todo('rational_bernstein_g_matches_spline_g_open — needs B-spline product algebra')
  // The "selective eraser" / fairing direction:
  it.todo('reduce_extrema_lowers_the_count')
  it.todo('target_signs_flattens_smallest_oscillations')
  // Windowed O(window) solve — Step 7:
  it.todo('windowed_drag_matches_full_drag — Step 7')
  it.todo('windowed_matches_full_for_local_rhs — Step 7')
  it.todo('windowed_falls_back_to_full_for_global_rhs — Step 7')
  // Backend-comparison (we have both solvers; assert they agree / PD fewer iters):
  it.todo('primal_dual_matches_barrier_with_fewer_iterations')
})
