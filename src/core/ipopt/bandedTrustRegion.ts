// ============================================================================
// Banded trust-region Newton solve for the IPOPT inner loop.
//
// The barrier Hessian H = t·∇²L + Σ μ/f² ∇c∇cᵀ is structurally BANDED — each
// curvature constraint touches only the d+1 control points supporting its span —
// but ONLY in the control-point-INTERLEAVED ordering [x₀,y₀,x₁,y₁,…]. The IPOPT
// problem stores variables BLOCK-ordered [x₀..x_{m-1}, y₀..y_{m-1}], so we permute
// to interleaved, factor the band in O(n·b²) (vs the dense Cholesky's O(n³)), and
// permute the step back. The dogleg geometry is shared with the dense path
// (`doglegFromParts`), so the robust solver's behaviour is unchanged — only the
// linear-algebra cost drops. Same `(robust solver, banded Hessian)` architecture
// as Rust ne-core's interior_point.rs.
// ============================================================================

import type { Matrix, TrustRegionResult } from './linearAlgebra'
import { doglegFromParts, dot } from './linearAlgebra'
import { type SymBand, symBandZero, symBandClone, ldlFactorBand, ldlSolveBand, symBandMatVec } from '../banded'
import { type Arrowhead, denseToArrowhead, arrowheadQuadForm, solveArrowhead, arrowheadApply } from '../cyclic'

/**
 * One step of iterative refinement for the arrowhead solve x ≈ M⁻¹ rhs. The
 * Woodbury formula loses a few digits when the seam block is stiff (a seam-adjacent
 * drag), enough to lag the cursor by a couple of pixels at the seam point. One
 * refinement against the regularized matrix M_reg = (band+reg·I) + seam recovers
 * them. `bandUnfac` is the UNfactored band, `aFac` the same band LDLᵀ-factored.
 */
function refineArrowhead(
  bandUnfac: SymBand,
  reg: number,
  aFac: SymBand,
  seam: readonly number[],
  eSS: readonly number[][],
  rhs: readonly number[],
  x: number[],
): number[] {
  // M_reg = (bandUnfac + reg·I) + seam; residual r = rhs − M_reg·x.
  const Mx = arrowheadApply(bandUnfac, seam, eSS, x)
  for (let i = 0; i < x.length; i++) Mx[i] += reg * x[i]
  const r = rhs.map((ri, i) => ri - Mx[i])
  const dx = solveArrowhead(aFac, seam, eSS, r)
  if (!dx) return x // singular refinement system — keep the unrefined solve
  return x.map((xi, i) => xi + dx[i])
}

/** Block variable index → interleaved index. v<nCP is xᵥ → 2v; v≥nCP is y_{v−nCP} → 2(v−nCP)+1. */
function toInterleaved(v: number, nCP: number): number {
  return v < nCP ? 2 * v : 2 * (v - nCP) + 1
}
/** Interleaved index → block variable index (inverse of toInterleaved). */
function toBlock(q: number, nCP: number): number {
  return q % 2 === 0 ? q / 2 : nCP + (q - 1) / 2
}

/**
 * Extract the symmetric band (half-width b, interleaved ordering) from a dense
 * BLOCK-ordered Hessian. Reads only the band entries — O(n·b), not O(n²). Entries
 * of H outside the interleaved band are dropped, so the caller must pass a b that
 * covers the constraint Jacobian's true footprint.
 */
export function denseToSymBandInterleaved(H: Matrix, nCP: number, b: number): SymBand {
  const n = 2 * nCP
  const M = symBandZero(n, b)
  for (let I = 0; I < n; I++) {
    const vI = toBlock(I, nCP)
    const pMax = Math.min(b, I)
    for (let p = 0; p <= pMax; p++) {
      const vJ = toBlock(I - p, nCP)
      M.low[I][p] = H[vI][vJ]
    }
  }
  return M
}

/**
 * Trust-region step using a banded factorization, a drop-in for `solveTrustRegion`
 * when the Hessian is banded in interleaved order (open planar drags). `nCP` is the
 * number of control points (n = 2·nCP variables); `b` is the interleaved band
 * half-width. Returns the SAME dogleg step as the dense solver, computed in O(n·b²).
 */
export function solveTrustRegionBanded(
  gradient: number[],
  hessian: Matrix,
  delta: number,
  regularization: number,
  nCP: number,
  b: number,
): TrustRegionResult {
  return doglegFromBand(gradient, denseToSymBandInterleaved(hessian, nCP, b), delta, regularization, nCP)
}

/**
 * Dogleg trust-region step from a PRE-BUILT interleaved band `M` (the barrier can
 * assemble it directly from the sparse rank-1 updates, skipping the dense O(n²)
 * matrix). `M` is left UNFACTORED (a clone is factored), so the same band can also
 * feed the Newton-decrement solve. Same step as the dense path.
 */
export function doglegFromBand(
  gradient: number[],
  M: SymBand,
  delta: number,
  regularization: number,
  nCP: number,
): TrustRegionResult {
  const n = gradient.length
  // Permute the gradient to interleaved order.
  const gP = new Array<number>(n)
  for (let v = 0; v < n; v++) gP[toInterleaved(v, nCP)] = gradient[v]

  // gᵀHg from the UNFACTORED band (the dense Cholesky adds reg only inside the
  // factorization, not to the matrix).
  const gHg = dot(gP, symBandMatVec(M, gP))

  // Factor a CLONE (preserve M for any other solve on the same barrier) with
  // PER-PIVOT regularization (matches the dense Cholesky's stabilization).
  let newtonStep: number[] | null = null
  const fac = symBandClone(M)
  if (ldlFactorBand(fac, 1e-300, regularization)) {
    const negGP = gP.map((v) => -v)
    const stepP = ldlSolveBand(fac, negGP)
    newtonStep = new Array<number>(n)
    for (let v = 0; v < n; v++) newtonStep[v] = stepP[toInterleaved(v, nCP)]
  }

  return doglegFromParts(gradient, newtonStep, gHg, delta)
}

/**
 * Trust-region step for a CLOSED curve via the arrowhead solve: the Hessian is a
 * narrow band PLUS a low-rank seam block (the periodic wrap). Same dogleg geometry
 * as the banded path; the Newton solve is Sherman-Morrison-Woodbury (O(n·b²) for
 * fixed degree). `b` is the LOCAL band half-width.
 */
export function solveTrustRegionArrowhead(
  gradient: number[],
  hessian: Matrix,
  delta: number,
  regularization: number,
  nCP: number,
  b: number,
): TrustRegionResult {
  return doglegFromArrowhead(gradient, denseToArrowhead(hessian, nCP, b), delta, regularization, nCP)
}

/**
 * Dogleg trust-region step from a PRE-BUILT arrowhead `ah` (band + seam), assembled
 * directly from the sparse rank-1 updates without a dense O(n²) matrix. `ah.band` is
 * left UNFACTORED (a clone is factored), so the same arrowhead also feeds the
 * Newton-decrement solve. Same step as the dense path.
 */
export function doglegFromArrowhead(
  gradient: number[],
  ah: Arrowhead,
  delta: number,
  regularization: number,
  nCP: number,
): TrustRegionResult {
  const n = gradient.length
  const gHg = arrowheadQuadForm(ah, gradient, nCP) // band unfactored
  const fac = symBandClone(ah.band) // factor a clone; preserve ah.band for refinement + reuse
  let newtonStep: number[] | null = null
  if (ldlFactorBand(fac, 1e-300, regularization)) {
    const negGP = new Array<number>(n)
    for (let v = 0; v < n; v++) negGP[toInterleaved(v, nCP)] = -gradient[v]
    let stepP = solveArrowhead(fac, ah.seam, ah.eSS, negGP)
    if (stepP) {
      // Singular seam (stepP === null) ⇒ leave newtonStep null ⇒ dogleg uses Cauchy.
      stepP = refineArrowhead(ah.band, regularization, fac, ah.seam, ah.eSS, negGP, stepP)
      newtonStep = new Array<number>(n)
      for (let v = 0; v < n; v++) newtonStep[v] = stepP[toInterleaved(v, nCP)]
    }
  }
  return doglegFromParts(gradient, newtonStep, gHg, delta)
}

/** Newton-decrement solve H·x = rhs for the closed (arrowhead) Hessian (dense in). */
export function solveArrowheadSPD(
  hessian: Matrix,
  rhs: number[],
  regularization: number,
  nCP: number,
  b: number,
): number[] | null {
  return spdFromArrowhead(denseToArrowhead(hessian, nCP, b), rhs, regularization, nCP)
}

/** Newton-decrement solve from a PRE-BUILT arrowhead (ah.band preserved). */
export function spdFromArrowhead(
  ah: Arrowhead,
  rhs: number[],
  regularization: number,
  nCP: number,
): number[] | null {
  const n = rhs.length
  const fac = symBandClone(ah.band)
  if (!ldlFactorBand(fac, 1e-300, regularization)) return null
  const rP = new Array<number>(n)
  for (let v = 0; v < n; v++) rP[toInterleaved(v, nCP)] = rhs[v]
  let xP = solveArrowhead(fac, ah.seam, ah.eSS, rP)
  if (!xP) return null // singular seam ⇒ no Newton decrement (matches spdFromBand's null contract)
  xP = refineArrowhead(ah.band, regularization, fac, ah.seam, ah.eSS, rP, xP)
  const x = new Array<number>(n)
  for (let v = 0; v < n; v++) x[v] = xP[toInterleaved(v, nCP)]
  return x
}

/**
 * Solve H·x = rhs for a Hessian banded in interleaved order, via banded LDLᵀ
 * (O(n·b²)). Returns null if the (regularized) band is not positive-definite — the
 * banded analogue of a failed dense Cholesky. Used for the IPOPT Newton-decrement.
 */
export function solveBandedSPD(
  hessian: Matrix,
  rhs: number[],
  regularization: number,
  nCP: number,
  b: number,
): number[] | null {
  return spdFromBand(denseToSymBandInterleaved(hessian, nCP, b), rhs, regularization, nCP)
}

/** Newton-decrement solve from a PRE-BUILT interleaved band (M preserved). */
export function spdFromBand(
  M: SymBand,
  rhs: number[],
  regularization: number,
  nCP: number,
): number[] | null {
  const n = rhs.length
  const fac = symBandClone(M)
  if (!ldlFactorBand(fac, 1e-300, regularization)) return null
  const rP = new Array<number>(n)
  for (let v = 0; v < n; v++) rP[toInterleaved(v, nCP)] = rhs[v]
  const xP = ldlSolveBand(fac, rP)
  const x = new Array<number>(n)
  for (let v = 0; v < n; v++) x[v] = xP[toInterleaved(v, nCP)]
  return x
}
