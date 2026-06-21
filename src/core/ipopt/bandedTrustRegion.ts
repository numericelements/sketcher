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
import { type SymBand, symBandZero, ldlFactorBand, ldlSolveBand, symBandMatVec } from '../banded'

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
  const n = gradient.length
  // Permute the gradient to interleaved order.
  const gP = new Array<number>(n)
  for (let v = 0; v < n; v++) gP[toInterleaved(v, nCP)] = gradient[v]

  // Band WITHOUT regularization first, so gᵀHg matches the dense quadraticForm
  // (the dense Cholesky adds reg only inside the factorization, not to the matrix).
  const M = denseToSymBandInterleaved(hessian, nCP, b)
  const gHg = dot(gP, symBandMatVec(M, gP)) // before factoring (matvec needs the raw band)

  // Factor with PER-PIVOT regularization (matches the dense Cholesky's stabilization).
  let newtonStep: number[] | null = null
  if (ldlFactorBand(M, 1e-300, regularization)) {
    const negGP = gP.map((v) => -v)
    const stepP = ldlSolveBand(M, negGP)
    newtonStep = new Array<number>(n)
    for (let v = 0; v < n; v++) newtonStep[v] = stepP[toInterleaved(v, nCP)]
  }

  return doglegFromParts(gradient, newtonStep, gHg, delta)
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
  const n = rhs.length
  const M = denseToSymBandInterleaved(hessian, nCP, b)
  if (!ldlFactorBand(M, 1e-300, regularization)) return null
  const rP = new Array<number>(n)
  for (let v = 0; v < n; v++) rP[toInterleaved(v, nCP)] = rhs[v]
  const xP = ldlSolveBand(M, rP)
  const x = new Array<number>(n)
  for (let v = 0; v < n; v++) x[v] = xP[toInterleaved(v, nCP)]
  return x
}
