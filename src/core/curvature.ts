import { BernsteinDecomposition, decomposeToBernstein, decomposeToBernsteinPeriodic, decomposeBsplineGeneric } from './bernstein'
import { ComplexBD, decomposeComplexCurvePeriodic } from './complexBernstein'
import { complexScalarCoeffs } from './coeffs'
import type { Complex } from './complex'

/**
 * Curvature numerators for a planar polynomial B-spline curve c(t) = (x(t), y(t)),
 * assembled purely from the B-spline-function algebra (add / multiply / derivative
 * on Bernstein decompositions). Both results are themselves B-spline functions;
 * the sign changes of their Bernstein coefficients bound the number of
 * inflections (f) and curvature extrema (g).
 */

/** Per-curve intermediate functions, decomposed once. */
function derivatives(x: readonly number[], y: readonly number[], knots: readonly number[], degree: number) {
  const x1 = decomposeToBernstein(x, knots, degree).derivative()
  const y1 = decomposeToBernstein(y, knots, degree).derivative()
  return {
    x1,
    y1,
    x2: x1.derivative(),
    y2: y1.derivative(),
    x3: x1.derivative().derivative(),
    y3: y1.derivative().derivative(),
  }
}

/**
 * Inflection numerator f(t) = c′ × c″ = x′y″ − y′x″ (degree 2d−3).
 * Its zeros are the inflection points; sign changes of its Bernstein
 * coefficients bound their number.
 */
export function inflectionNumeratorPlanar(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  const { x1, y1, x2, y2 } = derivatives(x, y, knots, degree)
  return x1.multiply(y2).subtract(y1.multiply(x2))
}

/**
 * Curvature-derivative numerator g(t) = ‖c′‖²(c′ × c‴) − 3(c′ · c″)(c′ × c″)
 * (degree 4d−6). Its zeros are the curvature extrema; sign changes of its
 * Bernstein coefficients bound their number (the anchor theorem).
 */
export function curvatureExtremaNumeratorPlanar(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  const { x1, y1, x2, y2, x3, y3 } = derivatives(x, y, knots, degree)
  const crossPrime2 = x1.multiply(y2).subtract(y1.multiply(x2)) // c′ × c″
  const dot = x1.multiply(x2).add(y1.multiply(y2)) // c′ · c″
  const crossPrime3 = x1.multiply(y3).subtract(y1.multiply(x3)) // c′ × c‴
  const normSq = x1.multiply(x1).add(y1.multiply(y1)) // ‖c′‖²
  return normSq.multiply(crossPrime3).subtract(dot.multiply(crossPrime2).scale(3))
}

/**
 * Curvature-extrema numerator g(t) for a CLOSED (periodic) planar B-spline
 * curve — same formula as above, on the periodic Bernstein decomposition.
 * For a closed curve the Bernstein coefficients form a cycle (the bound is the
 * cyclic sign-change count).
 */
export function curvatureExtremaNumeratorPlanarPeriodic(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  const x1 = decomposeToBernsteinPeriodic(x, knots, degree).derivative()
  const y1 = decomposeToBernsteinPeriodic(y, knots, degree).derivative()
  const x2 = x1.derivative()
  const y2 = y1.derivative()
  const x3 = x2.derivative()
  const y3 = y2.derivative()
  const crossPrime2 = x1.multiply(y2).subtract(y1.multiply(x2))
  const dot = x1.multiply(x2).add(y1.multiply(y2))
  const crossPrime3 = x1.multiply(y3).subtract(y1.multiply(x3))
  const normSq = x1.multiply(x1).add(y1.multiply(y1))
  return normSq.multiply(crossPrime3).subtract(dot.multiply(crossPrime2).scale(3))
}

/** Inflection numerator f = c′×c″ for a CLOSED (periodic) planar B-spline curve. */
export function inflectionNumeratorPlanarPeriodic(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  const x1 = decomposeToBernsteinPeriodic(x, knots, degree).derivative()
  const y1 = decomposeToBernsteinPeriodic(y, knots, degree).derivative()
  const x2 = x1.derivative()
  const y2 = y1.derivative()
  return x1.multiply(y2).subtract(y1.multiply(x2))
}

/** Parameters t ∈ [0,1) of the curvature extrema of a closed curve (zeros of periodic g). */
export function closedCurvatureExtremaParameters(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
  samples = 600,
): number[] {
  const g = curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, degree)
  const f = (t: number) => g.evaluate(((t % 1) + 1) % 1)
  const zeros: number[] = []
  let prevT = 0
  let prevV = f(0)
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const v = f(t)
    if (prevV === 0) zeros.push(prevT)
    else if (prevV * v < 0) {
      let a = prevT
      let b = t
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2
        if (f(a) * f(m) <= 0) b = m
        else a = m
      }
      zeros.push((a + b) / 2)
    }
    prevT = t
    prevV = v
  }
  return zeros
}

/**
 * Parameters t of the curvature extrema of an OPEN (clamped) planar B-spline —
 * the zeros of g on the curve's parameter domain [knots[degree], knots[n]].
 * Accurate (dense scan + bisection), unlike a coefficient-root finder that can
 * report spurious zeros on fine-knotted curves.
 */
export function openCurvatureExtremaParameters(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
  samples = 800,
): number[] {
  const g = curvatureExtremaNumeratorPlanar(x, y, knots, degree)
  const tMin = knots[degree]
  const tMax = knots[knots.length - 1 - degree]
  const span = tMax - tMin
  if (!(span > 0)) return []
  const f = (t: number) => g.evaluate(t)
  const zeros: number[] = []
  let prevT = tMin
  let prevV = f(tMin)
  for (let i = 1; i <= samples; i++) {
    const t = tMin + (i / samples) * span
    const v = f(t)
    if (prevV === 0) zeros.push(prevT)
    else if (prevV * v < 0) {
      let a = prevT
      let b = t
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2
        if (f(a) * f(m) <= 0) b = m
        else a = m
      }
      zeros.push((a + b) / 2)
    }
    prevT = t
    prevV = v
  }
  return zeros
}

/** Parameters t ∈ [0,1) of the inflections of a closed curve (zeros of periodic f = c′×c″). */
export function closedInflectionParameters(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
  samples = 600,
): number[] {
  const f = inflectionNumeratorPlanarPeriodic(x, y, knots, degree)
  const fn = (t: number) => f.evaluate(((t % 1) + 1) % 1)
  const zeros: number[] = []
  let prevT = 0
  let prevV = fn(0)
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const v = fn(t)
    if (prevV === 0) zeros.push(prevT)
    else if (prevV * v < 0) {
      let a = prevT
      let b = t
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2
        if (fn(a) * fn(m) <= 0) b = m
        else a = m
      }
      zeros.push((a + b) / 2)
    }
    prevT = t
    prevV = v
  }
  return zeros
}

// ============================================================================
// Rational and complex-rational curvature numerators (Chen complexity
// reduction). Both work on the homogeneous coordinate functions and produce a
// B-spline FUNCTION whose sign changes still bound the curvature extrema — the
// extra factor relative to the κ′ numerator is a positive power of the weight,
// so the zeros (the extrema) are unchanged. With unit weights both reduce
// exactly to the polynomial g above.
//
// Ref: Xianming Chen, "Complexity Reduction for Symbolic Computation with
// Rational B-Splines."
// ============================================================================

/**
 * Curvature-extrema numerator for a planar RATIONAL B-spline curve
 * c = (X/w, Y/w). Inputs are the Euclidean control points (x, y) and weights w;
 * the homogeneous functions X = w·x, Y = w·y are formed internally.
 */
export function curvatureExtremaNumeratorRational(
  x: readonly number[],
  y: readonly number[],
  w: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  const X = decomposeToBernstein(x.map((xi, i) => xi * w[i]), knots, degree)
  const Y = decomposeToBernstein(y.map((yi, i) => yi * w[i]), knots, degree)
  const W = decomposeToBernstein([...w], knots, degree)
  const Xu = X.derivative(), Xuu = Xu.derivative(), Xuuu = Xuu.derivative()
  const Yu = Y.derivative(), Yuu = Yu.derivative(), Yuuu = Yuu.derivative()
  const Wu = W.derivative(), Wuu = Wu.derivative(), Wuuu = Wuu.derivative()

  // Chen terms Dk = (homogeneous k-th derivative)·w − (homogeneous)·w^(k).
  const D1x = Xu.multiply(W).subtract(X.multiply(Wu))
  const D1y = Yu.multiply(W).subtract(Y.multiply(Wu))
  const D2x = Xuu.multiply(W).subtract(X.multiply(Wuu))
  const D2y = Yuu.multiply(W).subtract(Y.multiply(Wuu))
  const D3x = Xuuu.multiply(W).subtract(X.multiply(Wuuu))
  const D3y = Yuuu.multiply(W).subtract(Y.multiply(Wuuu))
  const D21x = Xuu.multiply(Wu).subtract(Xu.multiply(Wuu))
  const D21y = Yuu.multiply(Wu).subtract(Yu.multiply(Wuu))

  const D1dotD1 = D1x.multiply(D1x).add(D1y.multiply(D1y))
  const D1xD3 = D1x.multiply(D3y).subtract(D1y.multiply(D3x))
  const D1xD21 = D1x.multiply(D21y).subtract(D1y.multiply(D21x))
  const D1xD2 = D1x.multiply(D2y).subtract(D1y.multiply(D2x))
  const D1dotD2 = D1x.multiply(D2x).add(D1y.multiply(D2y))

  const term1 = D1xD3.add(D1xD21).multiply(D1dotD1).multiply(W)
  const term2 = Wu.scale(2).multiply(D1xD2).multiply(D1dotD1)
  const term3 = D1dotD2.scale(3).multiply(D1xD2).multiply(W)
  return term1.add(term2).subtract(term3)
}

/**
 * Curvature-extrema numerator for a planar COMPLEX-RATIONAL B-spline curve
 * z = Z/W (Z, W complex). Inputs are the Euclidean complex control points
 * (zre, zim) and complex weights (wre, wim); Z = w·z is formed internally.
 * Returns g = Im((D1*)²·T·w̄), a real B-spline function.
 */
export function curvatureExtremaNumeratorComplex(
  zre: readonly number[],
  zim: readonly number[],
  wre: readonly number[],
  wim: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  // Homogeneous Z = w · z (complex multiply).
  const Zre = zre.map((zr, i) => zr * wre[i] - zim[i] * wim[i])
  const Zim = zre.map((zr, i) => zr * wim[i] + zim[i] * wre[i])
  const Z = new ComplexBD(
    decomposeToBernstein(Zre, knots, degree),
    decomposeToBernstein(Zim, knots, degree),
  )
  const W = new ComplexBD(
    decomposeToBernstein([...wre], knots, degree),
    decomposeToBernstein([...wim], knots, degree),
  )
  return complexChenG(Z, W)
}

/** The Chen-reduced complex curvature-derivative numerator g = Im((D1*)²·T·w̄). */
function complexChenG(Z: ComplexBD, W: ComplexBD): BernsteinDecomposition {
  const Zu = Z.derivative(), Zuu = Zu.derivative(), Zuuu = Zuu.derivative()
  const Wu = W.derivative(), Wuu = Wu.derivative(), Wuuu = Wuu.derivative()

  const D1 = Zu.mul(W).sub(Z.mul(Wu))
  const D2 = Zuu.mul(W).sub(Z.mul(Wuu))
  const D3 = Zuuu.mul(W).sub(Z.mul(Wuuu))
  const D21 = Zuu.mul(Wu).sub(Zu.mul(Wuu))

  const D1conjSq = D1.conj().mul(D1.conj())
  const bracket = D3.mul(D1).add(D1.mul(D21)).sub(D2.mul(D2).scale(1.5))
  const T = W.mul(bracket).add(D1.mul(Wu.mul(D2).sub(Wuu.mul(D1))).scale(2))
  return D1conjSq.mul(T).mul(W.conj()).im
}

/**
 * Geometry-independent seeds for the complex-rational gradient: the periodic
 * Dirac B-splines Nᵢ and their derivatives (real). Depend only on (knots, degree,
 * n), so precompute ONCE per problem and reuse across every Jacobian build.
 */
export interface ComplexPeriodicSeeds {
  // Per control point, the periodic basis Nᵢ and its derivatives, decomposed WITH the
  // weight spiral ρ: a seam-crossing column's wrap span picks up ρ^(wraps), so these
  // are COMPLEX (for ρ=1 the imaginary part is 0 and they reduce to the real basis).
  // This is what makes the ρ≠1 gradient seed consistent with the ρ-aware value terms.
  N: ComplexBD[]
  N1: ComplexBD[]
  N2: ComplexBD[]
  N3: ComplexBD[]
  /** Per control point: the (wrap-around) spans where its basis function is nonzero.
   *  Lets the local Jacobian keep each column on its d+1 support spans. */
  spans: number[][]
  /** Total number of spans (period length) — for scattering a local column to width. */
  numSpans: number
}
export function precomputeComplexPeriodicSeeds(
  knots: readonly number[],
  degree: number,
  n: number,
  rho: Complex = { re: 1, im: 0 },
): ComplexPeriodicSeeds {
  const N: ComplexBD[] = []
  const N1: ComplexBD[] = []
  const N2: ComplexBD[] = []
  const N3: ComplexBD[] = []
  const spans: number[][] = []
  let numSpans = 0
  for (let i = 0; i < n; i++) {
    const e: Complex[] = Array.from({ length: n }, () => ({ re: 0, im: 0 }))
    e[i] = { re: 1, im: 0 }
    // Decompose the unit perturbation WITH the spiral ρ (complex on the wrap span).
    const { coeffs, breaks } = decomposeBsplineGeneric(complexScalarCoeffs, e, knots, degree, true, rho)
    const re = coeffs.map((seg) => seg.map((h) => h.re))
    const im = coeffs.map((seg) => seg.map((h) => h.im))
    const Ni = new ComplexBD(new BernsteinDecomposition(re, breaks), new BernsteinDecomposition(im, breaks))
    const d1 = Ni.derivative()
    const d2 = d1.derivative()
    N.push(Ni)
    N1.push(d1)
    N2.push(d2)
    N3.push(d2.derivative())
    numSpans = coeffs.length
    const sp: number[] = []
    for (let s = 0; s < coeffs.length; s++) {
      if (coeffs[s].some((h) => Math.abs(h.re) > 1e-14 || Math.abs(h.im) > 1e-14)) sp.push(s)
    }
    spans.push(sp)
  }
  return { N, N1, N2, N3, spans, numSpans }
}

/**
 * Exact analytic Jacobian of the closed complex-rational curvature numerator g
 * w.r.t. the control points, with the WEIGHTS HELD FIXED (the editor's bound
 * mode). Replaces the finite-difference Jacobian: instead of 2·2n full-numerator
 * re-evaluations, the Chen value terms (D1, D2, …, T) are computed ONCE and each
 * column is a per-control-point differential reusing them — the same hoisted-
 * forward structure as the planar gradient and as the reference sketcher's
 * computeFixedWeightClosedJacobian. Verified against a central-difference
 * Jacobian (to FD truncation) by complexJacobianOracle.test.ts.
 *
 * Returns g and dx[i]=∂g/∂Re(zᵢ), dy[i]=∂g/∂Im(zᵢ) (real Bernstein functions).
 * Exact for any monodromy ρ — the value terms AND the seeds carry the spiral, so the
 * gradient matches a finite-difference of the ρ-aware numerator at every control point
 * (seam-crossing ones included). Pass `seeds` precomputed with the SAME ρ.
 */
export function curvatureExtremaGradientComplexPeriodicFixedWeight(
  zre: readonly number[],
  zim: readonly number[],
  wre: readonly number[],
  wim: readonly number[],
  knots: readonly number[],
  degree: number,
  seeds?: ComplexPeriodicSeeds,
  rho: Complex = { re: 1, im: 0 },
): { g: BernsteinDecomposition; dx: BernsteinDecomposition[]; dy: BernsteinDecomposition[] } {
  const sds = seeds ?? precomputeComplexPeriodicSeeds(knots, degree, zre.length, rho)
  const { g, V } = complexFixedWeightValueTerms(zre, zim, wre, wim, knots, degree, rho)

  // ── Per-column differential. δW = 0 (weights fixed). For Re(zᵢ): δZ = wᵢ·Nᵢ;
  //    for Im(zᵢ): δZ = i·wᵢ·Nᵢ. δZ⁽ᵏ⁾ = (complex const)·Nᵢ⁽ᵏ⁾. ──
  const n = zre.length
  const dx: BernsteinDecomposition[] = []
  const dy: BernsteinDecomposition[] = []
  const column = (i: number, cr: number, ci: number): BernsteinDecomposition =>
    complexDifferential(sds.N[i], sds.N1[i], sds.N2[i], sds.N3[i], cr, ci, V)
  for (let i = 0; i < n; i++) {
    dx.push(column(i, wre[i], wim[i])) // δZ = wᵢ·Nᵢ
    dy.push(column(i, -wim[i], wre[i])) // δZ = i·wᵢ·Nᵢ
  }
  return { g, dx, dy }
}

/** The complex-rational fixed-weight curvature value terms (Chen reduction),
 *  computed ONCE per build and reused by every per-control-point differential. */
interface ComplexFixedWeightTerms {
  W: ComplexBD; Wu: ComplexBD; Wuu: ComplexBD; Wuuu: ComplexBD
  D1: ComplexBD; D2: ComplexBD; D3: ComplexBD; D21: ComplexBD; D1c: ComplexBD
  T_Wbar: ComplexBD; D1c2_Wbar: ComplexBD; WuD2_WuuD1: ComplexBD
}
function complexFixedWeightValueTerms(
  zre: readonly number[], zim: readonly number[], wre: readonly number[], wim: readonly number[],
  knots: readonly number[], degree: number, rho: Complex = { re: 1, im: 0 },
): { g: BernsteinDecomposition; V: ComplexFixedWeightTerms } {
  const cps = zre.map((zr, i) => ({ re: zr, im: zim[i], w_re: wre[i], w_im: wim[i] }))
  const { Z, W } = decomposeComplexCurvePeriodic(cps, knots, degree, rho)
  const Zu = Z.derivative(), Zuu = Zu.derivative(), Zuuu = Zuu.derivative()
  const Wu = W.derivative(), Wuu = Wu.derivative(), Wuuu = Wuu.derivative()
  const D1 = Zu.mul(W).sub(Z.mul(Wu))
  const D2 = Zuu.mul(W).sub(Z.mul(Wuu))
  const D3 = Zuuu.mul(W).sub(Z.mul(Wuuu))
  const D21 = Zuu.mul(Wu).sub(Zu.mul(Wuu))
  const D1c = D1.conj()
  const D1c2 = D1c.mul(D1c)
  const bracket = D3.mul(D1).add(D1.mul(D21)).sub(D2.mul(D2).scale(1.5))
  const T = W.mul(bracket).add(D1.mul(Wu.mul(D2).sub(Wuu.mul(D1))).scale(2))
  const Wbar = W.conj()
  const g = D1c2.mul(T).mul(Wbar).im
  const T_Wbar = T.mul(Wbar) // for d(D1c²)·T·W̄
  const D1c2_Wbar = D1c2.mul(Wbar) // for D1c²·dT·W̄
  const WuD2_WuuD1 = Wu.mul(D2).sub(Wuu.mul(D1)) // value part of the T tail
  return { g, V: { W, Wu, Wuu, Wuuu, D1, D2, D3, D21, D1c, T_Wbar, D1c2_Wbar, WuD2_WuuD1 } }
}

/** ∂g/∂(one coordinate of one control point): the differential at the seed basis
 *  function N (and its derivatives), reusing the precomputed value terms `V`.
 *  Operands may be full-width OR gathered on a support-span list — the formula is
 *  identical, so the dense and local-cols gradients share it (bit-for-bit). */
function complexDifferential(
  N: ComplexBD, N1: ComplexBD, N2: ComplexBD, N3: ComplexBD,
  cr: number, ci: number, V: ComplexFixedWeightTerms,
): BernsteinDecomposition {
  // δZ = (cr + i·ci)·Nᵢ, where Nᵢ is the (possibly ρ-scaled) complex seed.
  // (cr+i·ci)(a+i·b) = (cr·a − ci·b) + i(cr·b + ci·a). For a real seed (ρ=1, b=0)
  // this reduces to the old ComplexBD(a·cr, a·ci) — bit-identical.
  const cplx = (s: ComplexBD) =>
    new ComplexBD(s.re.scale(cr).subtract(s.im.scale(ci)), s.re.scale(ci).add(s.im.scale(cr)))
  const dZ = cplx(N), dZu = cplx(N1), dZuu = cplx(N2), dZuuu = cplx(N3)
  const dD1 = dZu.mul(V.W).sub(dZ.mul(V.Wu))
  const dD2 = dZuu.mul(V.W).sub(dZ.mul(V.Wuu))
  const dD3 = dZuuu.mul(V.W).sub(dZ.mul(V.Wuuu))
  const dD21 = dZuu.mul(V.Wu).sub(dZu.mul(V.Wuu))
  const dbracket = dD3.mul(V.D1).add(V.D3.mul(dD1)).add(dD1.mul(V.D21)).add(V.D1.mul(dD21)).sub(V.D2.mul(dD2).scale(3))
  const dD1c2 = V.D1c.mul(dD1.conj()).scale(2) // d(D1c²) = 2·D1c·conj(dD1)
  const dT = V.W.mul(dbracket).add(dD1.mul(V.WuD2_WuuD1).add(V.D1.mul(V.Wu.mul(dD2).sub(V.Wuu.mul(dD1)))).scale(2))
  const dP = dD1c2.mul(V.T_Wbar).add(V.D1c2_Wbar.mul(dT))
  return dP.im
}

/** Local (sparse) form of curvatureExtremaGradientComplexPeriodicFixedWeight: each
 *  column kept on its control point's (wrapping) support spans — O(n·d²), no
 *  full-width column. The primitive the complex-rational drag uses to build a sparse
 *  constraint Jacobian (→ banded/arrowhead barrier). Bit-identical to the dense
 *  gradient (same value terms + differential, just gathered on the support). */
export function curvatureExtremaGradientComplexPeriodicFixedWeightCols(
  zre: readonly number[], zim: readonly number[], wre: readonly number[], wim: readonly number[],
  knots: readonly number[], degree: number,
  seeds?: ComplexPeriodicSeeds,
  rho: Complex = { re: 1, im: 0 },
): { g: BernsteinDecomposition; gDeg: number; numSpans: number; cols: { spans: number[]; gx: BernsteinDecomposition; gy: BernsteinDecomposition }[] } {
  const sds = seeds ?? precomputeComplexPeriodicSeeds(knots, degree, zre.length, rho)
  const { g, V } = complexFixedWeightValueTerms(zre, zim, wre, wim, knots, degree, rho)
  const n = zre.length
  const cols: { spans: number[]; gx: BernsteinDecomposition; gy: BernsteinDecomposition }[] = []
  for (let i = 0; i < n; i++) {
    const sp = sds.spans[i]
    // Gather seeds + value terms on this control point's support spans.
    const N = sds.N[i].gather(sp), N1 = sds.N1[i].gather(sp), N2 = sds.N2[i].gather(sp), N3 = sds.N3[i].gather(sp)
    const Vg: ComplexFixedWeightTerms = {
      W: V.W.gather(sp), Wu: V.Wu.gather(sp), Wuu: V.Wuu.gather(sp), Wuuu: V.Wuuu.gather(sp),
      D1: V.D1.gather(sp), D2: V.D2.gather(sp), D3: V.D3.gather(sp), D21: V.D21.gather(sp), D1c: V.D1c.gather(sp),
      T_Wbar: V.T_Wbar.gather(sp), D1c2_Wbar: V.D1c2_Wbar.gather(sp), WuD2_WuuD1: V.WuD2_WuuD1.gather(sp),
    }
    const gx = complexDifferential(N, N1, N2, N3, wre[i], wim[i], Vg)
    const gy = complexDifferential(N, N1, N2, N3, -wim[i], wre[i], Vg)
    cols.push({ spans: sp, gx, gy })
  }
  return { g, gDeg: g.degree, numSpans: sds.numSpans, cols }
}

/**
 * Curvature-extrema numerator for a CLOSED (periodic) planar complex-rational
 * B-spline curve. Same Chen reduction as the open case but with a periodic
 * Bernstein decomposition of the homogeneous functions Z = w·z and W = w.
 *
 * Assumes the periodic monodromy ρ = wrapWeight/w₀ is 1 (the weight chain
 * closes), which holds for the initial all-unit-weight curve and is preserved
 * by Möbius transforms and fixed-weight edits. (A non-trivial spiral would need
 * the wrapped homogeneous coefficients scaled by ρ^period.)
 */
export function curvatureExtremaNumeratorComplexPeriodic(
  zre: readonly number[],
  zim: readonly number[],
  wre: readonly number[],
  wim: readonly number[],
  knots: readonly number[],
  degree: number,
  rho: Complex = { re: 1, im: 0 },
): BernsteinDecomposition {
  const cps = zre.map((zr, i) => ({ re: zr, im: zim[i], w_re: wre[i], w_im: wim[i] }))
  const { Z, W } = decomposeComplexCurvePeriodic(cps, knots, degree, rho)
  return complexChenG(Z, W)
}

/** Parameters t ∈ [0,1) of the curvature extrema of a closed complex-rational curve (zeros of periodic g). */
export function closedComplexCurvatureExtremaParameters(
  zre: readonly number[],
  zim: readonly number[],
  wre: readonly number[],
  wim: readonly number[],
  knots: readonly number[],
  degree: number,
  samples = 600,
  rho: Complex = { re: 1, im: 0 },
): number[] {
  const g = curvatureExtremaNumeratorComplexPeriodic(zre, zim, wre, wim, knots, degree, rho)
  const f = (t: number) => g.evaluate(((t % 1) + 1) % 1)
  const zeros: number[] = []
  let prevT = 0
  let prevV = f(0)
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const v = f(t)
    if (prevV === 0) zeros.push(prevT)
    else if (prevV * v < 0) {
      let a = prevT
      let b = t
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2
        if (f(a) * f(m) <= 0) b = m
        else a = m
      }
      zeros.push((a + b) / 2)
    }
    prevT = t
    prevV = v
  }
  return zeros
}
