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
  return curvatureExtremaMarkersOfNumerator(curvatureExtremaNumeratorPH(u, v, knots, degree, closed), closed)
}

/**
 * Exact analytic Jacobian of the PH numerator g w.r.t. the GENERATOR control points,
 * via the differential of g = Im(ā²·inner), a = w², inner = a·a″ − 3/2·a′².
 * δa = 2·w·δw with δw = Nᵢ for uᵢ and δw = i·Nᵢ for vᵢ (Nᵢ the real Dirac basis). The
 * value terms (a, a′, a″, ā², inner) are computed ONCE and reused per column.
 * du[i] = ∂g/∂u_i, dv[i] = ∂g/∂v_i.
 */
export function phCurvatureGradient(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): { g: BernsteinDecomposition; du: BernsteinDecomposition[]; dv: BernsteinDecomposition[] } {
  const dec = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const w = new ComplexBD(dec(u, knots, degree), dec(v, knots, degree))
  const a = w.mul(w), a1 = a.derivative(), a2 = a1.derivative()
  const abar = a.conj(), abar2 = abar.mul(abar)
  const inner = a.mul(a2).sub(a1.mul(a1).scale(1.5))
  const g = abar2.mul(inner).im

  const n = u.length
  const du: BernsteinDecomposition[] = [], dv: BernsteinDecomposition[] = []
  // δg from a generator perturbation δw: δa = 2·w·δw; product rule through g.
  const dgFromDw = (dw: ComplexBD): BernsteinDecomposition => {
    const da = w.mul(dw).scale(2)
    const da1 = da.derivative(), da2 = da1.derivative()
    // δinner = δa·a″ + a·δa″ − 3·a′·δa′
    const dInner = da.mul(a2).add(a.mul(da2)).sub(a1.mul(da1).scale(3))
    // δ(ā²) = 2·ā·conj(δa)
    const dAbar2 = abar.mul(da.conj()).scale(2)
    return dAbar2.mul(inner).add(abar2.mul(dInner)).im
  }
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Nre = dec(e, knots, degree)
    const zero = Nre.scale(0)
    du.push(dgFromDw(new ComplexBD(Nre, zero)))      // δw = Nᵢ
    dv.push(dgFromDw(new ComplexBD(zero, Nre)))      // δw = i·Nᵢ
  }
  return { g, du, dv }
}

// ============================================================================
// REDUCED PH curvature-extrema numerator R (FOUNDATIONS F7 / docs/PH_CURVATURE_REDUCTION.md).
//
// PH speed σ = u²+v² is polynomial, so g = 2·R·σ² with R = P′σ − 2Pσ', P = uv′−vu'.
// σ² > 0 (a square), so R has the SAME sign changes (curvature extrema) as g, at degree
// 4m−2 instead of 8m−2 and ~10³–10¹⁸× better conditioning. R is the honest minimal object:
// sign(R) = sign(dκ/dt). Same real B-spline algebra as g, but real (not complex).
// ============================================================================

/** Reduced PH curvature-extrema numerator R = P′σ − 2Pσ', P = uv′−vu', σ = u²+v². */
export function curvatureExtremaReducedNumeratorPH(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): BernsteinDecomposition {
  const dec = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const U = dec(u, knots, degree), V = dec(v, knots, degree)
  const P = U.multiply(V.derivative()).subtract(V.multiply(U.derivative())) // uv'−vu'
  const sigma = U.multiply(U).add(V.multiply(V))                            // u²+v²
  return P.derivative().multiply(sigma).subtract(P.multiply(sigma.derivative()).scale(2)) // P'σ−2Pσ'
}

/** Forward-AD dual over the real B-spline algebra: (value, tangent) BernsteinDecompositions. */
class RDual {
  readonly val: BernsteinDecomposition
  readonly tan: BernsteinDecomposition
  constructor(val: BernsteinDecomposition, tan: BernsteinDecomposition) {
    this.val = val
    this.tan = tan
  }
  add(o: RDual) { return new RDual(this.val.add(o.val), this.tan.add(o.tan)) }
  sub(o: RDual) { return new RDual(this.val.subtract(o.val), this.tan.subtract(o.tan)) }
  mul(o: RDual) { return new RDual(this.val.multiply(o.val), this.val.multiply(o.tan).add(this.tan.multiply(o.val))) }
  scale(s: number) { return new RDual(this.val.scale(s), this.tan.scale(s)) }
  derivative() { return new RDual(this.val.derivative(), this.tan.derivative()) }
}

/**
 * Exact analytic Jacobian of the REDUCED numerator R w.r.t. the generator control points,
 * by forward-AD over the B-spline algebra (seed the perturbed coordinate's tangent with the
 * Dirac basis Nᵢ). du[i] = ∂R/∂u_i, dv[i] = ∂R/∂v_i.
 */
export function reducedPHGradient(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
): { R: BernsteinDecomposition; du: BernsteinDecomposition[]; dv: BernsteinDecomposition[] } {
  const dec = closed ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const Uv = dec(u, knots, degree), Vv = dec(v, knots, degree)
  const zero = Uv.scale(0)
  const computeR = (Ud: RDual, Vd: RDual): RDual => {
    const P = Ud.mul(Vd.derivative()).sub(Vd.mul(Ud.derivative()))
    const sigma = Ud.mul(Ud).add(Vd.mul(Vd))
    return P.derivative().mul(sigma).sub(P.mul(sigma.derivative()).scale(2))
  }
  const R = computeR(new RDual(Uv, zero), new RDual(Vv, zero)).val
  const n = u.length
  const du: BernsteinDecomposition[] = [], dv: BernsteinDecomposition[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Ni = dec(e, knots, degree)
    du.push(computeR(new RDual(Uv, Ni), new RDual(Vv, zero)).tan) // ∂R/∂u_i
    dv.push(computeR(new RDual(Uv, zero), new RDual(Vv, Ni)).tan) // ∂R/∂v_i
  }
  return { R, du, dv }
}

export type PHJacobianBackend = 'fd' | 'analytic'

/**
 * ∂g/∂(generator coords) for a PH curve. Columns are 2·m (m = generator control points):
 *   M[k][2i] = ∂g_k/∂u_i,  M[k][2i+1] = ∂g_k/∂v_i.
 * 'analytic' — the exact differential (phCurvatureGradient); 'fd' — the numerical oracle.
 */
export function phJacobian(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, closed = false,
  backend: PHJacobianBackend = 'fd',
): number[][] {
  if (backend === 'analytic') {
    const { g, du, dv } = phCurvatureGradient(u, v, knots, degree, closed)
    const nG = g.flatCoeffs().length, m = u.length
    const M = Array.from({ length: nG }, () => new Array<number>(2 * m).fill(0))
    for (let i = 0; i < m; i++) {
      const cu = du[i].flatCoeffs(), cv = dv[i].flatCoeffs()
      for (let k = 0; k < nG; k++) { M[k][2 * i] = cu[k]; M[k][2 * i + 1] = cv[k] }
    }
    return M
  }
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
