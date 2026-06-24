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

import { type SymBand, symBandZero, symBandMatVec, ldlSolveBand } from './banded'

/** Block variable index → interleaved index (x_v→2v, y_v→2(v−nCP)+1). */
const toInterleaved = (v: number, nCP: number) => (v < nCP ? 2 * v : 2 * (v - nCP) + 1)
/** Interleaved index → block variable index (inverse). */
const toBlock = (q: number, nCP: number) => (q % 2 === 0 ? q / 2 : nCP + (q - 1) / 2)

export interface Arrowhead {
  band: SymBand
  seam: number[]
  eSS: number[][]
}

/**
 * Extract the arrowhead (narrow band + low-rank seam block) from a dense
 * BLOCK-ordered Hessian, in interleaved ordering. Entries within interleaved
 * distance `b` go to the band; the (few) longer-range seam-crossing entries — the
 * periodic n−1↔0 wrap — go to the dense s×s seam block on the variables they touch.
 * O(n·b) for the band + O(n²) lower-triangle scan for the seam (the dense H already
 * cost O(n²) to build, so this doesn't change the order).
 */
export function denseToArrowhead(H: readonly number[][], nCP: number, b: number): Arrowhead {
  const n = 2 * nCP
  const band = symBandZero(n, b)
  const corner = new Map<number, number>() // packed key I*n+J (I>J) → value
  const seamSet = new Set<number>()
  for (let I = 0; I < n; I++) {
    const vI = toBlock(I, nCP)
    const rowI = H[vI]
    for (let J = 0; J <= I; J++) {
      const v = rowI[toBlock(J, nCP)]
      if (v === 0) continue
      if (I - J <= b) {
        band.low[I][I - J] = v
      } else {
        corner.set(I * n + J, v)
        seamSet.add(I)
        seamSet.add(J)
      }
    }
  }
  const seam = [...seamSet].sort((p, q) => p - q)
  const idx = new Map<number, number>(seam.map((v, k) => [v, k]))
  const s = seam.length
  const eSS: number[][] = Array.from({ length: s }, () => new Array<number>(s).fill(0))
  for (const [key, v] of corner) {
    const I = Math.floor(key / n)
    const J = key - I * n
    const ia = idx.get(I)!
    const ib = idx.get(J)!
    eSS[ia][ib] += v
    eSS[ib][ia] += v
  }
  return { band, seam, eSS }
}

/** vᵀ M v for an arrowhead M = band + P·E_SS·Pᵀ (band UNFACTORED). v is block-order;
 *  permute to interleaved for the band matvec, add the seam quadratic. */
export function arrowheadQuadForm(ah: Arrowhead, v: readonly number[], nCP: number): number {
  const n = v.length
  const vP = new Array<number>(n)
  for (let k = 0; k < n; k++) vP[toInterleaved(k, nCP)] = v[k]
  let q = 0
  const mv = symBandMatVec(ah.band, vP)
  for (let i = 0; i < n; i++) q += vP[i] * mv[i]
  const s = ah.seam.length
  for (let i = 0; i < s; i++) {
    const vi = vP[ah.seam[i]]
    for (let j = 0; j < s; j++) q += ah.eSS[i][j] * vi * vP[ah.seam[j]]
  }
  return q
}

/** M·v for an arrowhead M = band + P·E_SS·Pᵀ, all in interleaved order (band UNFACTORED). */
export function arrowheadApply(
  band: SymBand,
  seam: readonly number[],
  eSS: readonly number[][],
  v: readonly number[],
): number[] {
  const out = symBandMatVec(band, v)
  const s = seam.length
  for (let i = 0; i < s; i++) {
    let acc = 0
    for (let j = 0; j < s; j++) acc += eSS[i][j] * v[seam[j]]
    out[seam[i]] += acc
  }
  return out
}

export { toInterleaved, toBlock }

/** Solve A·x = b for a small DENSE matrix via partial-pivot Gaussian elimination.
 *  Returns null when A is (numerically) singular — a pivot drops below 1e-12·‖A‖∞.
 *  The caller (solveArrowhead) propagates that as a clean failure rather than
 *  dividing by ~0, so a near-singular closed seam falls back to the Cauchy step
 *  instead of producing a NaN/huge Newton step (and a NaN Newton decrement). */
export function denseSolve(A: readonly number[][], b: readonly number[]): number[] | null {
  const n = b.length
  const M = A.map((r) => r.slice())
  const x = b.slice()
  let maxAbs = 0
  for (const row of M) for (const v of row) { const a = Math.abs(v); if (a > maxAbs) maxAbs = a }
  const tol = 1e-12 * (maxAbs || 1)
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (piv !== col) {
      const tm = M[col]; M[col] = M[piv]; M[piv] = tm
      const tx = x[col]; x[col] = x[piv]; x[piv] = tx
    }
    const d = M[col][col]
    if (!Number.isFinite(d) || Math.abs(d) <= tol) return null // singular
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
    const d = M[col][col]
    if (!Number.isFinite(d) || Math.abs(d) <= tol) return null
    x[col] = sum / d
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
): number[] | null {
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

  // 5. tvec = K⁻¹ rc  (null ⇒ K singular: a near-singular seam — signal failure)
  const tvec = denseSolve(k, rc)
  if (!tvec) return null

  // 6. x = y − A⁻¹ (P·tvec)
  const pt = new Array<number>(nv).fill(0)
  for (let i = 0; i < s; i++) pt[seam[i]] = tvec[i]
  const corr = ldlSolveBand(a, pt)
  return y.map((yi, i) => yi - corr[i])
}
