// ============================================================================
// THE CURVATURE-FAMILY SET — one uniform face over every B-spline family.
//
// The goal (CLAUDE.md): {polynomial, rational, complex, PH} × {open, closed},
// one interface, easy to swap and test. A family's ONLY job is to produce
//   • g          — the curvature-extrema numerator's control polygon, and
//   • ∂g/∂CP     — its Jacobian (FD / analytic / AD — cross-validated, see below).
// Everything generic — the bound S⁻ (Law 1), the markers Z(g), the drag — is
// computed the SAME way for every family, here, from g and ∂g/∂CP. No family
// re-implements the bound or the sign machinery.
//
// This file is the algebraic set (polynomial / rational / complex) unified over
// ONE control-point representation. PH carries a hodograph generator, not a
// weighted point, so it joins the laws via its own numerator elsewhere in core
// (phCurvature.ts: g and the reduced R; phCurveBoundDrag.ts: the drags).
// ============================================================================
import { BernsteinDecomposition, assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import {
  curvatureExtremaNumeratorPlanar,
  curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorComplex,
  curvatureExtremaNumeratorComplexPeriodic,
  curvatureExtremaGradientComplexPeriodicFixedWeightCols,
  curvatureExtremaGradientComplexFixedWeightCols,
  curvatureExtremaMarkers,
  inflectionNumeratorPlanar,
  inflectionNumeratorPlanarPeriodic,
  inflectionNumeratorRational,
  inflectionNumeratorRationalPeriodic,
} from './curvature'
import { curvatureExtremaGradientPlanar, curvatureExtremaGradientPlanarPeriodic } from './gradient'
import type { Complex } from './complex'

export type Topology = 'open' | 'closed'
/** The families unified here. 'ph' is reserved — pending the core port. */
export type AlgebraicFamily = 'polynomial' | 'rational' | 'complex'

/**
 * One control-point representation for the whole algebraic set: an affine point
 * z = (re, im) carrying a weight w = (wRe, wIm).
 *   polynomial → w = (1, 0)   rational → w = (w, 0)   complex → full (wRe, wIm)
 * Each family is the previous one with the weight specialized, so a single
 * representation (and a single numerator dispatch) covers all three.
 */
export interface WeightedCP {
  re: number
  im: number
  wRe: number
  wIm: number
}

export const ALGEBRAIC_FAMILIES: readonly AlgebraicFamily[] = ['polynomial', 'rational', 'complex']
export const TOPOLOGIES: readonly Topology[] = ['open', 'closed']

/** Convenience constructors so callers don't hand-fill weights. */
export const poly = (x: number, y: number): WeightedCP => ({ re: x, im: y, wRe: 1, wIm: 0 })
export const rational = (x: number, y: number, w: number): WeightedCP => ({ re: x, im: y, wRe: w, wIm: 0 })
export const complex = (re: number, im: number, wRe: number, wIm: number): WeightedCP => ({ re, im, wRe, wIm })

/**
 * g's control polygon for any algebraic family and topology — THE single
 * numerator entry point. Polynomial uses the planar numerator directly;
 * rational and complex share the complex numerator (rational is wIm ≡ 0).
 * `rho` is the closed monodromy (period ratio); ignored when open.
 */
export function familyNumerator(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
  rho: Complex = { re: 1, im: 0 },
): BernsteinDecomposition {
  const closed = topology === 'closed'
  const re = cps.map((p) => p.re)
  const im = cps.map((p) => p.im)
  if (kind === 'polynomial') {
    return closed
      ? curvatureExtremaNumeratorPlanarPeriodic(re, im, knots, degree)
      : curvatureExtremaNumeratorPlanar(re, im, knots, degree)
  }
  const wRe = cps.map((p) => p.wRe)
  const wIm = cps.map((p) => p.wIm)
  return closed
    ? curvatureExtremaNumeratorComplexPeriodic(re, im, wRe, wIm, knots, degree, rho)
    : curvatureExtremaNumeratorComplex(re, im, wRe, wIm, knots, degree)
}

/**
 * S⁻ — the curvature-extrema upper bound (CLAUDE.md Law 1), computed the SAME
 * way for every family: the noise-robust sign-change count of g's control
 * polygon (cyclic at the seam for closed curves).
 */
export function familyBound(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
  rho?: Complex,
): number {
  const closed = topology === 'closed'
  return cyclicSignChanges(assignSignsNeighbor(familyNumerator(kind, cps, knots, degree, topology, rho).flatCoeffs()), closed)
}

/**
 * Z(g) made visible — the curvature-extrema marker parameters (sign-change
 * crossings of g), for every family. Delegates to the canonical marker finder.
 */
export function familyMarkers(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
  rho: Complex = { re: 1, im: 0 },
): number[] {
  const closed = topology === 'closed'
  const markerKind = kind === 'polynomial' ? 'bspline' : kind === 'rational' ? 'rational' : 'complex-rational'
  return curvatureExtremaMarkers(
    markerKind,
    cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.wRe), cps.map((p) => p.wIm),
    knots, degree, closed, rho,
  )
}

/**
 * The INFLECTION numerator f for the families that have one. Polynomial:
 * f = c′×c″; rational: f = det[H, H′, H″] (same sign changes as r′×r″ for
 * positive weights). Complex weights THROW — under a complex weight the curve
 * carries a Möbius structure and "inflection of the drawn curve" is not this
 * determinant; the slot stays an explicit gap, not a silent wrong answer.
 */
export function familyInflectionNumerator(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
): BernsteinDecomposition {
  const closed = topology === 'closed'
  const re = cps.map((p) => p.re)
  const im = cps.map((p) => p.im)
  if (kind === 'polynomial') {
    return closed
      ? inflectionNumeratorPlanarPeriodic(re, im, knots, degree)
      : inflectionNumeratorPlanar(re, im, knots, degree)
  }
  if (kind === 'rational') {
    const w = cps.map((p) => p.wRe)
    return closed
      ? inflectionNumeratorRationalPeriodic(re, im, w, knots, degree)
      : inflectionNumeratorRational(re, im, w, knots, degree)
  }
  throw new Error('inflection numerator for complex weights is not defined (Möbius geometry) — explicit gap')
}

/** S⁻ of f — the inflection-count upper bound, same sign machinery as familyBound. */
export function familyInflectionBound(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
): number {
  const closed = topology === 'closed'
  return cyclicSignChanges(assignSignsNeighbor(familyInflectionNumerator(kind, cps, knots, degree, topology).flatCoeffs()), closed)
}

/** ∂f/∂(affine coords), weights fixed — FD (the universal oracle backend), same
 *  matrix shape as familyJacobian: rows = f coefficients, cols = [reᵢ, imᵢ] interleaved.
 *  f = det[H,H′,H″] takes ONE entry per determinant row, so it is LINEAR in each
 *  affine coordinate — central differences are exact here up to roundoff. */
export function familyInflectionJacobianFD(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
): number[][] {
  const nF = familyInflectionNumerator(kind, cps, knots, degree, topology).flatCoeffs().length
  const n = cps.length
  const M = Array.from({ length: nF }, () => new Array<number>(2 * n).fill(0))
  const work = cps.map((p) => ({ ...p }))
  const diff = (i: number, key: 're' | 'im', col: number) => {
    const c0 = work[i][key]
    const h = 1e-6 * (Math.abs(c0) + 1)
    work[i][key] = c0 + h
    const fp = familyInflectionNumerator(kind, work, knots, degree, topology).flatCoeffs()
    work[i][key] = c0 - h
    const fm = familyInflectionNumerator(kind, work, knots, degree, topology).flatCoeffs()
    work[i][key] = c0
    for (let k = 0; k < nF; k++) M[k][col] = (fp[k] - fm[k]) / (2 * h)
  }
  for (let i = 0; i < n; i++) { diff(i, 're', 2 * i); diff(i, 'im', 2 * i + 1) }
  return M
}

// ============================================================================
// ∂g/∂CP — the constraint Jacobian, with swappable backends (the Rust shape:
// FD / analytic / AD, cross-validated against each other). The drag holds the
// weights fixed, so the Jacobian is taken w.r.t. the AFFINE coordinates only:
//   M[k][2i]   = ∂g_k / ∂re_i      M[k][2i+1] = ∂g_k / ∂im_i
// (rows k = g's control-polygon coefficients, cols = 2n affine coordinates).
//
// FD is universal — the numerical ORACLE every other backend is validated against.
// The exact backends are what core has today, and they are uneven on purpose
// (this is the gap the set is closing): polynomial has a forward-AD ('ad') path;
// closed rational/complex have a seeded-analytic ('analytic') path; open
// rational/complex and PH have only FD so far. A backend that isn't filled yet
// THROWS — the slot exists so it's swappable and the gap is explicit.
// ============================================================================
export type JacobianBackend = 'fd' | 'analytic' | 'ad'

/** Dense ∂g/∂(affine coords), weights fixed — see the matrix shape above. */
export function familyJacobian(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
  backend: JacobianBackend = 'fd',
  rho: Complex = { re: 1, im: 0 },
): number[][] {
  if (backend === 'fd') return familyJacobianFD(kind, cps, knots, degree, topology, rho)

  const closed = topology === 'closed'
  const re = cps.map((p) => p.re), im = cps.map((p) => p.im)
  if (kind === 'polynomial') {
    if (backend !== 'ad') throw new Error(`polynomial Jacobian backend '${backend}' not in the set yet (have: fd, ad)`)
    const grad = closed ? curvatureExtremaGradientPlanarPeriodic(re, im, knots, degree) : curvatureExtremaGradientPlanar(re, im, knots, degree)
    return assembleFromColumns(grad.g.flatCoeffs().length, grad.dx, grad.dy)
  }
  if (backend !== 'analytic') throw new Error(`${kind}/${topology} Jacobian backend '${backend}' not in the set yet (have: fd, analytic)`)
  // complex/rational analytic: build from the LOCAL per-control-point cols gradient (compact
  // support, ~2.5× cheaper than full-width columns) and scatter to the dense [nG][2n] matrix.
  // Bit-identical to the old full-width path (localJacobianParity + the FD oracle pin it).
  const wRe = cps.map((p) => p.wRe), wIm = cps.map((p) => p.wIm)
  const cg = closed
    ? curvatureExtremaGradientComplexPeriodicFixedWeightCols(re, im, wRe, wIm, knots, degree, undefined, rho)
    : curvatureExtremaGradientComplexFixedWeightCols(re, im, wRe, wIm, knots, degree)
  return assembleFromCols(cg)
}

function assembleFromColumns(nG: number, dx: BernsteinDecomposition[], dy: BernsteinDecomposition[]): number[][] {
  const n = dx.length
  const M = Array.from({ length: nG }, () => new Array<number>(2 * n).fill(0))
  for (let i = 0; i < n; i++) {
    const cx = dx[i].flatCoeffs(), cy = dy[i].flatCoeffs()
    for (let k = 0; k < nG; k++) { M[k][2 * i] = cx[k]; M[k][2 * i + 1] = cy[k] }
  }
  return M
}

/** Scatter a per-control-point local-cols gradient into the dense [nG][2n] Jacobian (g
 *  coefficient rows × interleaved [reᵢ, imᵢ] columns). */
function assembleFromCols(
  cg: { gDeg: number; numSpans: number; cols: { spans: number[]; gx: BernsteinDecomposition; gy: BernsteinDecomposition }[] },
): number[][] {
  const gDeg1 = cg.gDeg + 1
  const nG = cg.numSpans * gDeg1
  const n = cg.cols.length
  const M = Array.from({ length: nG }, () => new Array<number>(2 * n).fill(0))
  for (let i = 0; i < n; i++) {
    const col = cg.cols[i]
    for (let ls = 0; ls < col.spans.length; ls++) {
      const s = col.spans[ls], gxc = col.gx.coeffs[ls], gyc = col.gy.coeffs[ls]
      for (let c = 0; c <= cg.gDeg; c++) { M[s * gDeg1 + c][2 * i] = gxc[c]; M[s * gDeg1 + c][2 * i + 1] = gyc[c] }
    }
  }
  return M
}

/** Universal numerical Jacobian (central difference) — the oracle. */
function familyJacobianFD(
  kind: AlgebraicFamily, cps: readonly WeightedCP[], knots: readonly number[], degree: number, topology: Topology, rho: Complex,
): number[][] {
  const base = familyNumerator(kind, cps, knots, degree, topology, rho).flatCoeffs()
  const nG = base.length, n = cps.length
  const M = Array.from({ length: nG }, () => new Array<number>(2 * n).fill(0))
  const work = cps.map((p) => ({ ...p }))
  const diff = (i: number, key: 're' | 'im', col: number) => {
    const c0 = work[i][key]
    const h = 1e-6 * (Math.abs(c0) + 1)
    work[i][key] = c0 + h
    const gp = familyNumerator(kind, work, knots, degree, topology, rho).flatCoeffs()
    work[i][key] = c0 - h
    const gm = familyNumerator(kind, work, knots, degree, topology, rho).flatCoeffs()
    work[i][key] = c0
    for (let k = 0; k < nG; k++) M[k][col] = (gp[k] - gm[k]) / (2 * h)
  }
  for (let i = 0; i < n; i++) { diff(i, 're', 2 * i); diff(i, 'im', 2 * i + 1) }
  return M
}
