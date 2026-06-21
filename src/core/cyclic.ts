// ============================================================================
// Closed-curve arrowhead solve (port of ne-core's cyclic.rs).
//
// A closed curve's curvature-bound KKT Hessian is a banded matrix PLUS a low-rank
// "seam" correction: the periodic wrap (variable n−1 couples to variable 0) creates
// long-range entries that would balloon a plain band to half-width ~n (→ O(n³)).
// Instead we keep a NARROW band A (the local entries) and carry the few seam-
// crossing entries as a dense s×s block E_SS on the seam variable set S (s ≈ 2·degree).
// The full matrix is  M = A + P·E_SS·Pᵀ  where P selects the seam variables.
//
// Solve via Sherman–Morrison–Woodbury:
//   M⁻¹ rhs = A⁻¹ rhs − A⁻¹ P (I + E_SS·Pᵀ A⁻¹ P)⁻¹ E_SS·(Pᵀ A⁻¹ rhs)
// = (s+2) banded solves + one s×s dense solve → O(n·b²) for fixed degree, vs O(n³).
// ============================================================================

import { type SymBand, ldlSolveBand } from './banded'

/** Solve A·x = b for a small DENSE matrix via partial-pivot Gaussian elimination.
 *  Used for the s×s inner system (and the equality Schur complement). */
export function denseSolve(A: readonly number[][], b: readonly number[]): number[] {
  const n = b.length
  const M = A.map((r) => r.slice())
  const x = b.slice()
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (piv !== col) {
      const tm = M[col]; M[col] = M[piv]; M[piv] = tm
      const tx = x[col]; x[col] = x[piv]; x[piv] = tx
    }
    const d = M[col][col] || 1e-300
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / d
      if (f === 0) continue
      for (let c = col; c < n; c++) M[r][c] -= f * M[col][c]
      x[r] -= f * x[col]
    }
  }
  for (let col = n - 1; col >= 0; col--) {
    let sum = x[col]
    for (let c = col + 1; c < n; c++) sum -= M[col][c] * x[c]
    x[col] = sum / (M[col][col] || 1e-300)
  }
  return x
}

/**
 * Solve M·x = rhs for the arrowhead M = A + P·E_SS·Pᵀ. `a` must already be
 * LDLᵀ-factored (the caller factors it, with any regularization on A's diagonal).
 * `seam` lists the s seam variable indices; `eSS` is the dense s×s seam block
 * (already symmetrized). O((s+2)·n·b² + s³).
 */
export function solveArrowhead(
  a: SymBand,
  seam: readonly number[],
  eSS: readonly number[][],
  rhs: readonly number[],
): number[] {
  const nv = rhs.length
  const s = seam.length
  // 1. y = A⁻¹ rhs
  const y = ldlSolveBand(a, rhs.slice())
  if (s === 0) return y

  // 2. W = Pᵀ A⁻¹ P  (s×s): column c = (A⁻¹ e_{seam[c]}) gathered on seam rows.
  const w: number[][] = Array.from({ length: s }, () => new Array<number>(s).fill(0))
  for (let c = 0; c < s; c++) {
    const e = new Array<number>(nv).fill(0)
    e[seam[c]] = 1
    const z = ldlSolveBand(a, e)
    for (let r = 0; r < s; r++) w[r][c] = z[seam[r]]
  }

  // 3. K = I + E_SS·W   (asymmetric — do NOT symmetrize)
  const k: number[][] = Array.from({ length: s }, () => new Array<number>(s).fill(0))
  for (let i = 0; i < s; i++) {
    for (let j = 0; j < s; j++) {
      let acc = i === j ? 1 : 0
      for (let t = 0; t < s; t++) acc += eSS[i][t] * w[t][j]
      k[i][j] = acc
    }
  }

  // 4. rc = E_SS·(Pᵀ y)
  const ys = seam.map((sv) => y[sv])
  const rc = new Array<number>(s).fill(0)
  for (let i = 0; i < s; i++) {
    let acc = 0
    for (let t = 0; t < s; t++) acc += eSS[i][t] * ys[t]
    rc[i] = acc
  }

  // 5. tvec = K⁻¹ rc
  const tvec = denseSolve(k, rc)

  // 6. x = y − A⁻¹ (P·tvec)
  const pt = new Array<number>(nv).fill(0)
  for (let i = 0; i < s; i++) pt[seam[i]] = tvec[i]
  const corr = ldlSolveBand(a, pt)
  return y.map((yi, i) => yi - corr[i])
}
