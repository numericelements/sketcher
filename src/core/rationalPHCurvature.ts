// ============================================================================
// Rational-PH curvature-extrema numerator — the generating-function reduction.
//
// A rational PH curve is z = A/B (A, B complex B-splines of degree d) whose PH
// condition is the Wronskian identity  A′B − AB′ = S²  for a generator S. That
// identity is exactly the numerator of the quotient derivative, so the hodograph
// is a PERFECT SQUARE:
//
//     z′ = (A′B − AB′)/B² = S²/B² = σ²,   σ = S/B.
//
// This is the polynomial-PH structure (c′ = w²) one rung up: the preimage σ is a
// *rational* function S/B instead of a polynomial. Substituting σ into the honest
//   g = ‖c′‖²(c′×c‴) − 3(c′·c″)(c′×c″)
// and using g = |σ|²·Im(σ̄σ″) − 2·Im((σ̄σ′)²), every positive factor (|σ|², |B|²)
// drops out and the numerator collapses to a single scalar B-spline:
//
//     Ñ = Im( S̄²·B̄·K′ ),   K′ = S·W₁′ − 2·S′·W₁,   W₁ = S′B − SB′
//                                                     (so W₁′ = S″B − SB″).
//
// K′ = P′σ − 2Pσ′ in disguise (P = the (S,B) Wronskian W₁, "σ" = S): the SAME
// reduced skeleton as the polynomial-PH F7 numerator R. Its degree is
//     deg Ñ = 4·deg S + 2·deg B − 2,
// which for deg B = 0 (a polynomial PH curve, B ≡ 1) is 4·deg S − 2 = the F7 4m−2.
// For a degree-5 rational PH curve (deg S = 2, deg B = 5) that is 16 — versus the
// general complex-rational Chen g at degree 44 for the same curve (phCurvature.ts
// warns of exactly this inflation). Fewer coefficients ⇒ a TIGHTER S⁻ bound, and
// Ñ is expressed directly in the drag variables (S, B), so its Jacobian is direct.
//
// sign(Ñ) = sign(dκ/dt) pointwise (verified against dκ/dt and the general Chen g).
// Everything below the numerator — the S⁻ bound (Law 1), the sliding mechanism
// (Law 2), the markers (Law 3) — is the shared machinery, instantiated on Ñ.
// ============================================================================
import { BernsteinDecomposition, decomposeToBernstein, assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { ComplexBD } from './complexBernstein'
import { curvatureExtremaMarkersOfNumerator } from './curvature'

const dec = decomposeToBernstein
const distinct = (k: readonly number[]): number[] => {
  const out: number[] = []
  for (const v of k) if (out.length === 0 || Math.abs(v - out[out.length - 1]) > 1e-10) out.push(v)
  return out
}

/**
 * The reduced rational-PH curvature-extrema numerator Ñ = Im(S̄²·B̄·K′) as a scalar
 * (real) B-spline in Bernstein form. `sRe/sIm` on `sKnots` at `sDegree` describe the
 * generator S; `bRe/bIm` on `bKnots` at `bDegree` describe the denominator B. Open
 * (clamped) curves only for now. Requires S and B to share breakpoints (they do for
 * every editor curve today — both clamped on the same distinct-knot partition); a
 * mismatch throws rather than silently misalign the per-span product (the honest gap:
 * common-breakpoint refinement is a separate follow-up).
 */
export function curvatureExtremaReducedNumeratorRationalPH(
  sRe: readonly number[], sIm: readonly number[], sKnots: readonly number[], sDegree: number,
  bRe: readonly number[], bIm: readonly number[], bKnots: readonly number[], bDegree: number,
): BernsteinDecomposition {
  const bs = distinct(bKnots), ss = distinct(sKnots)
  if (bs.length !== ss.length || bs.some((v, i) => Math.abs(v - ss[i]) > 1e-10)) {
    throw new Error(
      `rational-PH numerator: S and B must share breakpoints (S ${JSON.stringify(ss)} vs B ${JSON.stringify(bs)}); ` +
      'common-breakpoint refinement is not yet implemented.',
    )
  }
  const S = new ComplexBD(dec(sRe, sKnots, sDegree), dec(sIm, sKnots, sDegree))
  const B = new ComplexBD(dec(bRe, bKnots, bDegree), dec(bIm, bKnots, bDegree))
  const Sd = S.derivative(), Sdd = Sd.derivative()
  const Bd = B.derivative(), Bdd = Bd.derivative()
  const Sbar = new ComplexBD(S.re, S.im.scale(-1))
  const Bbar = new ComplexBD(B.re, B.im.scale(-1))
  const W1 = Sd.mul(B).sub(S.mul(Bd))            // W₁ = S′B − SB′
  const W1p = Sdd.mul(B).sub(S.mul(Bdd))         // W₁′ = S″B − SB″
  const Kp = S.mul(W1p).sub(Sd.mul(W1).scale(2)) // K′ = S·W₁′ − 2·S′·W₁
  return Sbar.mul(Sbar).mul(Bbar).mul(Kp).im     // Ñ = Im(S̄²·B̄·K′)
}

/** S⁻ bound (Law 1): sign changes of Ñ's control polygon. Open curve. */
export function rationalPHBound(
  sRe: readonly number[], sIm: readonly number[], sKnots: readonly number[], sDegree: number,
  bRe: readonly number[], bIm: readonly number[], bKnots: readonly number[], bDegree: number,
): number {
  const N = curvatureExtremaReducedNumeratorRationalPH(sRe, sIm, sKnots, sDegree, bRe, bIm, bKnots, bDegree)
  return cyclicSignChanges(assignSignsNeighbor(N.flatCoeffs()), false)
}

/** Curvature-extrema markers (Law 3): the actual sign changes (crossings) of Ñ. */
export function rationalPHMarkers(
  sRe: readonly number[], sIm: readonly number[], sKnots: readonly number[], sDegree: number,
  bRe: readonly number[], bIm: readonly number[], bKnots: readonly number[], bDegree: number,
): number[] {
  const N = curvatureExtremaReducedNumeratorRationalPH(sRe, sIm, sKnots, sDegree, bRe, bIm, bKnots, bDegree)
  return curvatureExtremaMarkersOfNumerator(N, false)
}
