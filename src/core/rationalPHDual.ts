// ============================================================================
// THE DUAL / MOTION-POLYNOMIAL CONSTRUCTION — the chart that works on the null-spinor stratum.
//
// Ported from Kalkan–Scharler–Schröcker–Šír, "Rational framing motions and spatial rational Pythagorean
// hodograph curves", CAGD 99 (2022), arXiv 2111.04600, Theorem 3.6 form (9). Their result:
//
//     rational PH curves ARE exactly  r = −2·b/α   subject to   α·b′ − α′·b = μ·(𝒜i𝒜*)
//
// with α ∈ ℝ[t], 𝒜 ∈ ℍ[t] reduced with respect to i, b a VECTORIAL quaternion polynomial and μ ∈ ℝ[t].
//
// WHY THIS AND NOT OUR OWN CHART. Ours picks the spinor and integrates the hodograph, so every step divides
// by 𝒜(r) or σ(r) — and on the stratum where 𝒜 is NULL at the pole (the published rational PH cubic, see
// rationalPHCubic.ts) both are zero and the whole construction is unavailable. This system divides by
// nothing. It is one homogeneous LINEAR system in the coefficients of (b, μ), so the solution set is a
// nullspace, computed the same way whether the spinor is null there or not. That is the entire reason to
// port it: it reaches the case we could not.
//
// AND IT GIVES A FAMILY WHERE WE HAD A SPECIMEN. The nullspace grows as deg b is raised — the nested tower
// of their Remark 5.2 — so members can be dialled instead of quoted.
//
// DEGREE BOOKKEEPING. With a = deg α, d = deg b and deg 𝒜i𝒜* = 2n, the left side has degree ≤ a + d − 1 and
// the right μ·F has degree deg μ + 2n, so deg μ = a + d − 1 − 2n. The system is 3(a + d) equations in
// 3(d + 1) + (a + d − 2n) unknowns — OVERDETERMINED, which is the paper's "rather surprisingly, the desired
// rational solutions only occur in exceptional cases".
//
// WHICH SOLUTIONS ARE THE INTERESTING ONES. Their Lemma 4.1: a solution is a POLYNOMIAL PH curve iff α
// divides b, and the trivial ones are b = α·b₀ for constant vectorial b₀ (those are just translations). So
// the truly rational members are the nullspace vectors on which α ∤ b, and `isTrulyRational` tests that.
// ============================================================================
import { QUAT_I, qconj, qmul, qvec, type Quat, type Vec3 } from './quaternion'

const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

export const degreeOf = (c: readonly number[]): number => {
  const s = Math.max(...c.map(Math.abs), 1e-300)
  let k = c.length - 1
  while (k > 0 && Math.abs(c[k]) < 1e-11 * s) k--
  return k
}

/** F = 𝒜i𝒜*, the Hopf image, per coordinate in the power basis. */
export function hopfImage(A: readonly Quat[]): number[][] {
  const F = [0, 1, 2].map(() => new Array<number>(2 * A.length - 1).fill(0))
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      F[0][i + j] += v.x
      F[1][i + j] += v.y
      F[2][i + j] += v.z
    }
  }
  return F
}

export interface DualSolution {
  /** b, vectorial, per coordinate in the power basis. */
  readonly b: readonly number[][]
  /** μ, the scalar multiplier. */
  readonly mu: readonly number[]
}

/**
 * The homogeneous system α·b′ − α′·b − μ·F = 0, laid out row per (coordinate, power).
 *
 * Unknown order is [b₀ˣ b₀ʸ b₀ᶻ b₁ˣ … b_dᶻ, μ₀ … μ_M] so a nullspace vector unpacks positionally.
 */
export function systemMatrix(
  alpha: readonly number[],
  F: readonly number[][],
  degB: number,
): { rows: number[][]; degMu: number } {
  const a = degreeOf(alpha)
  const twoN = Math.max(...F.map(degreeOf))
  const degMu = a + degB - 1 - twoN
  const nB = 3 * (degB + 1)
  const nMu = Math.max(0, degMu + 1)
  const alphaD = dPoly(alpha)
  const rows: number[][] = []
  for (let c = 0; c < 3; c++) {
    for (let k = 0; k <= a + degB; k++) {
      const row = new Array<number>(nB + nMu).fill(0)
      for (let e = 0; e <= degB; e++) {
        // (α b′)_k gets e·b_e·α_{k−e+1};  (α′ b)_k gets b_e·α′_{k−e}
        if (k - e + 1 >= 0 && k - e + 1 < alpha.length) row[3 * e + c] += e * alpha[k - e + 1]
        if (k - e >= 0 && k - e < alphaD.length) row[3 * e + c] -= alphaD[k - e]
      }
      for (let m = 0; m < nMu; m++) {
        if (k - m >= 0 && k - m < F[c].length) row[nB + m] -= F[c][k - m]
      }
      rows.push(row)
    }
  }
  return { rows, degMu }
}

/**
 * Nullspace basis by Gauss–Jordan with a rank cut taken from the LARGEST RELATIVE GAP in the pivot
 * magnitudes, never from a fixed tolerance — the same discipline the rest of this codebase uses for rank.
 */
export function nullspace(rows: readonly number[][]): number[][] {
  const m = rows.length
  const n = rows[0]?.length ?? 0
  const A = rows.map((r) => [...r])
  const pivotCols: number[] = []
  const pivots: number[] = []
  let r = 0
  for (let c = 0; c < n && r < m; c++) {
    let best = r
    for (let i = r + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[best][c])) best = i
    if (Math.abs(A[best][c]) < 1e-300) continue
    pivots.push(Math.abs(A[best][c]))
    ;[A[r], A[best]] = [A[best], A[r]]
    const p = A[r][c]
    for (let j = 0; j < n; j++) A[r][j] /= p
    for (let i = 0; i < m; i++) {
      if (i === r) continue
      const f = A[i][c]
      if (f === 0) continue
      for (let j = 0; j < n; j++) A[i][j] -= f * A[r][j]
    }
    pivotCols.push(c)
    r++
  }
  // Drop pivots below the largest relative gap: everything after the gap is numerical noise, not rank.
  let cut = pivots.length
  if (pivots.length > 1) {
    const scale = pivots[0]
    let bestGap = 1
    for (let i = 1; i < pivots.length; i++) {
      const gap = pivots[i - 1] / Math.max(pivots[i], 1e-300)
      if (gap > bestGap && pivots[i] < 1e-6 * scale) {
        bestGap = gap
        cut = i
      }
    }
  }
  const usedCols = pivotCols.slice(0, cut)
  const free = Array.from({ length: n }, (_, i) => i).filter((i) => !usedCols.includes(i))
  return free.map((fc) => {
    const v = new Array<number>(n).fill(0)
    v[fc] = 1
    usedCols.forEach((pc, i) => { v[pc] = -A[i][fc] })
    return v
  })
}

/** Unpack a nullspace vector into (b, μ). */
export function unpack(v: readonly number[], degB: number, degMu: number): DualSolution {
  const b = [0, 1, 2].map((c) => Array.from({ length: degB + 1 }, (_, e) => v[3 * e + c]))
  const nB = 3 * (degB + 1)
  const mu = Array.from({ length: Math.max(0, degMu + 1) }, (_, m) => v[nB + m])
  return { b, mu }
}

/** Worst residual of α·b′ − α′·b = μ·F, relative — the check that a solution really solves (9). */
export function residual(
  alpha: readonly number[],
  F: readonly number[][],
  sol: DualSolution,
): number {
  const alphaD = dPoly(alpha)
  let worst = 0
  let scale = 1e-300
  for (let c = 0; c < 3; c++) {
    const bd = dPoly(sol.b[c])
    const len = alpha.length + Math.max(sol.b[c].length, bd.length) + sol.mu.length
    for (let k = 0; k < len; k++) {
      let v = 0
      alpha.forEach((av, i) => { if (k - i >= 0 && k - i < bd.length) v += av * bd[k - i] })
      alphaD.forEach((av, i) => { if (k - i >= 0 && k - i < sol.b[c].length) v -= av * sol.b[c][k - i] })
      sol.mu.forEach((mv, i) => { if (k - i >= 0 && k - i < F[c].length) v -= mv * F[c][k - i] })
      worst = Math.max(worst, Math.abs(v))
      scale = Math.max(scale, Math.abs(evalPoly(F[c], 1) * (sol.mu[0] ?? 1)))
    }
  }
  return worst / scale
}

/**
 * Is this solution a TRULY RATIONAL curve, or secretly polynomial? Lemma 4.1: polynomial exactly when α
 * divides b. Measured by the remainder of the division, relative to b's own scale.
 */
export function isTrulyRational(alpha: readonly number[], sol: DualSolution): { rational: boolean; remainder: number } {
  const a = degreeOf(alpha)
  let worst = 0
  for (let c = 0; c < 3; c++) {
    const rem = [...sol.b[c]]
    const scale = Math.max(...rem.map(Math.abs), 1e-300)
    for (let s = degreeOf(rem) - a; s >= 0; s--) {
      const f = rem[s + a] / alpha[a]
      for (let k = 0; k <= a; k++) rem[s + k] -= f * alpha[k]
    }
    worst = Math.max(worst, Math.max(...rem.slice(0, a).map(Math.abs)) / scale)
  }
  return { rational: worst > 1e-8, remainder: worst }
}

/** The curve: r = −2·b/α. Numerator and denominator, so it reads like every other member here. */
export const curveOf = (alpha: readonly number[], sol: DualSolution): { p: number[][]; w: number[] } => ({
  p: sol.b.map((bc) => bc.map((v) => -2 * v)),
  w: [...alpha],
})

export const evaluate = (p: readonly number[][], w: readonly number[], t: number): Vec3 => {
  const wv = evalPoly(w, t)
  return { x: evalPoly(p[0], t) / wv, y: evalPoly(p[1], t) / wv, z: evalPoly(p[2], t) / wv }
}
