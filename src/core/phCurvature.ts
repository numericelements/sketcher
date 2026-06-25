// ============================================================================
// Pythagorean-hodograph (PH) curvature-extrema numerator — the fourth family.
//
// A planar PH curve has hodograph c′(t) = w(t)², where w = u + i·v is the complex
// preimage (a degree-m generator with control coefficients uᵢ + i·vᵢ). Because c′
// is a perfect square in w, the curvature-extrema numerator collapses to the cheap
// POLYNOMIAL complex form applied to a = w² (NOT the complex-RATIONAL Chen machinery
// — that would inflate g to ~degree 44 for the same curve):
//
//     g = Im( ā²·(a·a″ − 3/2·a′²) ),   a = w² (the hodograph = c′; a′ = c″, a″ = c‴).
//
// g is a real polynomial of degree 8m−2 (14 for the default m=2 quintic). Its zeros
// are the curvature extrema; the sign changes of its control polygon bound them
// (Law 1), exactly as for the other families. Ported from ne-core ph.rs / the
// sketcher's phCurvatureExtremaNumerator — same formula, core types.
// ============================================================================
import { BernsteinDecomposition, decomposeToBernstein, decomposeToBernsteinPeriodic, assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { ComplexBD } from './complexBernstein'
import { curvatureExtremaMarkersOfNumerator } from './curvature'

/** The complex hodograph a = w² = c′ from the (u, v) generator control points. */
function phHodograph(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed: boolean,
): ComplexBD {
  const dec = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const w = new ComplexBD(dec(u, knots, degree), dec(v, knots, degree))
  return w.mul(w)
}

/**
 * g(t) = Im( ā²·(a·a″ − 3/2·a′²) ), a = w² — the PH curvature-extrema numerator's
 * control polygon, the same single-scalar-B-spline object the other families return.
 * `u`, `v`, `knots`, `degree` describe the GENERATOR w (not the curve); `closed`
 * selects the periodic generator decomposition.
 */
export function curvatureExtremaNumeratorPH(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): BernsteinDecomposition {
  const a = phHodograph(u, v, knots, degree, closed) // c′
  const a1 = a.derivative() // c″
  const a2 = a1.derivative() // c‴
  // inner = a·a″ − 3/2·a′²
  const inner = a.mul(a2).sub(a1.mul(a1).scale(1.5))
  // g = Im(ā²·inner)
  const abar = a.conj()
  return abar.mul(abar).mul(inner).im
}

/** S⁻ — the PH curvature-extrema bound (Law 1), the same sign-change count every family uses. */
export function phBound(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): number {
  return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPH(u, v, knots, degree, closed).flatCoeffs()), closed)
}

/** Z(g) — the PH curvature-extrema markers (sign-change crossings), via the shared finder. */
export function phMarkers(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): number[] {
  return curvatureExtremaMarkersOfNumerator(curvatureExtremaNumeratorPH(u, v, knots, degree, closed), knots, degree, closed)
}

export type PHJacobianBackend = 'fd'

/**
 * ∂g/∂(generator coords) for a PH curve. Columns are 2·m (m = generator control points):
 *   M[k][2i] = ∂g_k/∂u_i,  M[k][2i+1] = ∂g_k/∂v_i.
 * Only the FD oracle so far; an exact PH Jacobian (the sketcher's PHCurveProblem path) is
 * the next slice — FD validates it when it lands.
 */
export function phJacobian(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
  backend: PHJacobianBackend = 'fd',
): number[][] {
  if (backend !== 'fd') throw new Error(`PH Jacobian backend '${backend}' not in the set yet (have: fd)`)
  const base = curvatureExtremaNumeratorPH(u, v, knots, degree, closed).flatCoeffs()
  const nG = base.length, m = u.length
  const M = Array.from({ length: nG }, () => new Array<number>(2 * m).fill(0))
  const wu = u.slice(), wv = v.slice()
  const diff = (arr: number[], i: number, col: number) => {
    const c0 = arr[i]
    const h = 1e-6 * (Math.abs(c0) + 1)
    arr[i] = c0 + h
    const gp = curvatureExtremaNumeratorPH(wu, wv, knots, degree, closed).flatCoeffs()
    arr[i] = c0 - h
    const gm = curvatureExtremaNumeratorPH(wu, wv, knots, degree, closed).flatCoeffs()
    arr[i] = c0
    for (let k = 0; k < nG; k++) M[k][col] = (gp[k] - gm[k]) / (2 * h)
  }
  for (let i = 0; i < m; i++) { diff(wu, i, 2 * i); diff(wv, i, 2 * i + 1) }
  return M
}
