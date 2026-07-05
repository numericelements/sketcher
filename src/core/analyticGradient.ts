// ============================================================================
// Hand-ANALYTIC ∂g/∂(control point) for the polynomial planar curvature-extrema
// numerator, open AND closed. A faithful port of the Rust reference
// `ne-core/src/analytic_gradient.rs` (`polynomial_partials` / `polynomial_analytic_columns`).
//
//   g = ‖c′‖²·(c′×c‴) − 3·(c′·c″)·(c′×c″)                    (degree 4d−6)
//
// TWO independent references agree on this differential to the term — the Rust core
// above, and Eric's closed-curve TS stack (`compute_curvatureDerivativeNumerator_gradient`
// in OpBSplineR1toR2 / OpPeriodicBSplineR1toR2Scaled). Open vs closed differ ONLY in how
// the coordinate splines decompose to per-span Béziers (clamped vs periodic); everything
// after is the topology-agnostic per-span algebra.
//
// This is the hand-derived sibling of the forward-AD gradient in `gradient.ts` (same
// result, different derivation). It is pinned against that AD gradient — and hence against
// the FD oracle it already matches — to machine precision (`analyticGradient.test.ts`).
// Not wired into any drag yet; it exists as the analytic reference/oracle.
// ============================================================================

import {
  BernsteinDecomposition,
  decomposeToBernstein,
  decomposeToBernsteinPeriodic,
} from './bernstein'

/** The six differential coefficient blocks: ∂g/∂xᵢ = px1·Nᵢ′ + px2·Nᵢ″ + px3·Nᵢ‴, and the
 *  y-analogue. These are the value terms (built from c′,c″,c‴) common to every control point;
 *  each column just multiplies them by that control point's basis derivatives. */
interface Partials {
  px1: BernsteinDecomposition; py1: BernsteinDecomposition
  px2: BernsteinDecomposition; py2: BernsteinDecomposition
  px3: BernsteinDecomposition; py3: BernsteinDecomposition
}

/** g plus the shared differential blocks (Rust `polynomial_partials`). g is reconstructed
 *  from the SAME c′,c″,c‴ products the partials need — not a separate g pipeline. */
function polynomialPartials(
  x: readonly number[], y: readonly number[],
  knots: readonly number[], degree: number, closed: boolean,
): { g: BernsteinDecomposition; p: Partials } {
  const decompose = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const bx = decompose(x, knots, degree)
  const by = decompose(y, knots, degree)
  const bx1 = bx.derivative(), by1 = by.derivative()   // c′
  const bx2 = bx1.derivative(), by2 = by1.derivative() // c″
  const bx3 = bx2.derivative(), by3 = by2.derivative() // c‴

  const cross1 = bx1.multiply(by2).subtract(by1.multiply(bx2)) // c′ × c″
  const dot = bx1.multiply(bx2).add(by1.multiply(by2))         // c′ · c″
  const cross2 = bx1.multiply(by3).subtract(by1.multiply(bx3)) // c′ × c‴
  const normSq = bx1.multiply(bx1).add(by1.multiply(by1))      // ‖c′‖²

  const g = normSq.multiply(cross2).subtract(dot.multiply(cross1).scale(3))

  // ∂g/∂xᵢ = px1·Nᵢ′ + px2·Nᵢ″ + px3·Nᵢ‴  (product rule on g; Nᵢ seeds one coordinate).
  const px1 = bx1.scale(2).multiply(cross2)
    .add(normSq.multiply(by3))
    .subtract(bx2.multiply(cross1).add(dot.multiply(by2)).scale(3))
  const py1 = by1.scale(2).multiply(cross2)
    .subtract(normSq.multiply(bx3))
    .subtract(by2.multiply(cross1).subtract(dot.multiply(bx2)).scale(3))
  const px2 = bx1.multiply(cross1).subtract(dot.multiply(by1)).scale(-3)
  const py2 = by1.multiply(cross1).add(dot.multiply(bx1)).scale(-3)
  const px3 = normSq.multiply(by1).scale(-1)
  const py3 = normSq.multiply(bx1)

  return { g, p: { px1, py1, px2, py2, px3, py3 } }
}

/**
 * g plus the FULL per-control-point Jacobian columns ∂g/∂xᵢ, ∂g/∂yᵢ (each a B-spline
 * function that is zero outside control point i's support). O(n²) — the analytic sibling of
 * `gradient.ts`'s AD columns and the validator for a future local/seeded O(n·d²) path.
 * Open + closed (topology enters only through the decomposition). Rust:
 * `polynomial_analytic_columns`. Return shape matches `curvatureExtremaGradientPlanar`.
 */
export function polynomialCurvatureJacobianColumns(
  x: readonly number[], y: readonly number[],
  knots: readonly number[], degree: number, closed = false,
): { g: BernsteinDecomposition; dx: BernsteinDecomposition[]; dy: BernsteinDecomposition[] } {
  const decompose = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const { g, p } = polynomialPartials(x, y, knots, degree, closed)
  const n = x.length
  const dx: BernsteinDecomposition[] = []
  const dy: BernsteinDecomposition[] = []
  for (let k = 0; k < n; k++) {
    const e = new Array<number>(n).fill(0)
    e[k] = 1
    const bnk = decompose(e, knots, degree) // Dirac basis Nₖ
    const b1 = bnk.derivative()             // Nₖ′
    const b2 = b1.derivative()              // Nₖ″
    const b3 = b2.derivative()              // Nₖ‴
    dx.push(p.px1.multiply(b1).add(p.px2.multiply(b2)).add(p.px3.multiply(b3)))
    dy.push(p.py1.multiply(b1).add(p.py2.multiply(b2)).add(p.py3.multiply(b3)))
  }
  return { g, dx, dy }
}
