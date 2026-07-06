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

const conjBD = (z: ComplexBD): ComplexBD => new ComplexBD(z.re, z.im.scale(-1))

/**
 * Analytic Jacobian of the reduced numerator Ñ w.r.t. the generator/denominator
 * control points: for every variable (sRe[j], sIm[j], bRe[j], bIm[j]) the vector of
 * ∂(Ñ Bernstein coefficient)/∂variable, i.e. one δÑ column per variable. This is the
 * speed win over the legacy AB drag: a degree-(4degS+2degB−2) column instead of the
 * general Chen g's degree-44 one, and it is EXACT (product rule, not finite difference).
 *
 * δÑ = Im( 2·S̄·conj(δS)·(B̄K′) + (S̄²B̄)·δK′ + (S̄²K′)·conj(δB) ),
 *   δK′  = δS·W₁′ + S·δW₁′ − 2·δS′·W₁ − 2·S′·δW₁,
 *   δW₁  = δS′·B + S′·δB − δS·B′ − S·δB′,   δW₁′ = δS″·B + S″·δB − δS·B″ − S·δB″,
 * with δS = Nⱼ (or i·Nⱼ) for an sRe (sIm) bump and δB likewise for B. Same
 * shared-breakpoint requirement as the numerator (throws otherwise).
 */
export interface ReducedNumeratorJacobianRationalPH {
  dSre: number[][]; dSim: number[][]; dBre: number[][]; dBim: number[][]
}
export function reducedNumeratorJacobianRationalPH(
  sRe: readonly number[], sIm: readonly number[], sKnots: readonly number[], sDegree: number,
  bRe: readonly number[], bIm: readonly number[], bKnots: readonly number[], bDegree: number,
): ReducedNumeratorJacobianRationalPH {
  const bs = distinct(bKnots), ss = distinct(sKnots)
  if (bs.length !== ss.length || bs.some((v, i) => Math.abs(v - ss[i]) > 1e-10)) {
    throw new Error(
      `rational-PH Jacobian: S and B must share breakpoints (S ${JSON.stringify(ss)} vs B ${JSON.stringify(bs)}); ` +
      'common-breakpoint refinement is not yet implemented.',
    )
  }
  const S = new ComplexBD(dec(sRe, sKnots, sDegree), dec(sIm, sKnots, sDegree))
  const B = new ComplexBD(dec(bRe, bKnots, bDegree), dec(bIm, bKnots, bDegree))
  const Sd = S.derivative(), Sdd = Sd.derivative()
  const Bd = B.derivative(), Bdd = Bd.derivative()
  const Sbar = conjBD(S), Bbar = conjBD(B)
  const W1 = Sd.mul(B).sub(S.mul(Bd))
  const W1p = Sdd.mul(B).sub(S.mul(Bdd))
  const Kp = S.mul(W1p).sub(Sd.mul(W1).scale(2))
  const S2bar = Sbar.mul(Sbar)
  const BbarKp = Bbar.mul(Kp)       // B̄K′
  const S2barBbar = S2bar.mul(Bbar) // S̄²B̄
  const S2barKp = S2bar.mul(Kp)     // S̄²K′

  // δÑ from a generator/denominator perturbation (δB=0 for an S bump, δS=0 for a B bump).
  const dN = (dS: ComplexBD, dB: ComplexBD): number[] => {
    const dSd = dS.derivative(), dSdd = dSd.derivative()
    const dBd = dB.derivative(), dBdd = dBd.derivative()
    const dW1 = dSd.mul(B).add(Sd.mul(dB)).sub(dS.mul(Bd)).sub(S.mul(dBd))
    const dW1p = dSdd.mul(B).add(Sdd.mul(dB)).sub(dS.mul(Bdd)).sub(S.mul(dBdd))
    const dKp = dS.mul(W1p).add(S.mul(dW1p)).sub(dSd.mul(W1).scale(2)).sub(Sd.mul(dW1).scale(2))
    const t1 = Sbar.mul(conjBD(dS)).scale(2).mul(BbarKp) // 2·S̄·conj(δS)·B̄K′
    const t2 = S2barBbar.mul(dKp)                         // S̄²B̄·δK′
    const t3 = S2barKp.mul(conjBD(dB))                    // S̄²K′·conj(δB)
    return t1.add(t2).add(t3).im.flatCoeffs()
  }

  const nS = sRe.length, nB = bRe.length
  const zeroS = dec(new Array<number>(nS).fill(0), sKnots, sDegree)
  const zeroB = dec(new Array<number>(nB).fill(0), bKnots, bDegree)
  const zeroSc = new ComplexBD(zeroS, zeroS), zeroBc = new ComplexBD(zeroB, zeroB)
  const basisS = (j: number) => { const e = new Array<number>(nS).fill(0); e[j] = 1; return dec(e, sKnots, sDegree) }
  const basisB = (j: number) => { const e = new Array<number>(nB).fill(0); e[j] = 1; return dec(e, bKnots, bDegree) }

  const dSre: number[][] = [], dSim: number[][] = []
  for (let j = 0; j < nS; j++) {
    const Nj = basisS(j)
    dSre.push(dN(new ComplexBD(Nj, zeroS), zeroBc)) // δS = Nⱼ
    dSim.push(dN(new ComplexBD(zeroS, Nj), zeroBc)) // δS = i·Nⱼ
  }
  const dBre: number[][] = [], dBim: number[][] = []
  for (let j = 0; j < nB; j++) {
    const Nj = basisB(j)
    dBre.push(dN(zeroSc, new ComplexBD(Nj, zeroB))) // δB = Nⱼ
    dBim.push(dN(zeroSc, new ComplexBD(zeroB, Nj))) // δB = i·Nⱼ
  }
  return { dSre, dSim, dBre, dBim }
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
