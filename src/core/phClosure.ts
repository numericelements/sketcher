// ============================================================================
// Closed-PH closure constraint, in core — the gap a closed PH curve must vanish.
//
// A planar PH curve has hodograph c′ = w², w = u + i·v the generator. For the
// curve to CLOSE, r(1) − r(0) = ∮ w² dt must be zero (two real conditions). With
// w = Σ(uᵢ + i·vᵢ)·Nᵢ over the generator's B-spline basis Nᵢ, and the Gram matrix
//   G_ij = ∫ Nᵢ(t)·Nⱼ(t) dt,
// the closure gap is computed directly from the generator coefficients:
//   ∮ w² = ( uᵀG u − vᵀG v ,  2·uᵀG v ).
// No curve construction (integrate/recompose) is needed — this is exact and
// self-contained, the constraint the core PH drag will hold (∮w² = 0).
// ============================================================================
import { decomposeToBernstein, decomposeToBernsteinPeriodic, type BernsteinDecomposition } from './bernstein'

/** ∫ over a Bernstein decomposition's whole domain (∫₀ʰ of a degree-n Bézier = h/(n+1)·Σcoeffs). */
function integrateBernstein(bd: BernsteinDecomposition): number {
  let s = 0
  for (let span = 0; span < bd.coeffs.length; span++) {
    const c = bd.coeffs[span]
    const h = bd.breaks[span + 1] - bd.breaks[span]
    let sum = 0
    for (const v of c) sum += v
    s += (h / c.length) * sum // c.length = degree + 1
  }
  return s
}

/**
 * Gram matrix G_ij = ∫ Nᵢ·Nⱼ dt of the generator's (clamped) B-spline basis. Geometry-
 * independent — depends only on (knots, degree, n) — so precompute once per generator.
 */
export function generatorBasisGram(knots: readonly number[], degree: number, n: number, periodic = false): number[][] {
  const decompose = periodic ? decomposeToBernsteinPeriodic : decomposeToBernstein
  const N: BernsteinDecomposition[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    N.push(decompose(e, knots, degree))
  }
  const G = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const g = integrateBernstein(N[i].multiply(N[j]))
      G[i][j] = g
      G[j][i] = g
    }
  }
  return G
}

const matVec = (G: number[][], a: readonly number[]): number[] =>
  a.map((_, k) => { let s = 0; for (let j = 0; j < a.length; j++) s += G[k][j] * a[j]; return s })
const dot = (a: readonly number[], b: readonly number[]): number => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

/** The closure gap ∮w² = (uᵀGu − vᵀGv, 2·uᵀGv) — zero ⇔ the PH curve closes. */
export function closureGap(u: readonly number[], v: readonly number[], G: number[][]): { re: number; im: number } {
  const Gu = matVec(G, u), Gv = matVec(G, v)
  return { re: dot(u, Gu) - dot(v, Gv), im: 2 * dot(u, Gv) }
}

/**
 * Jacobian of the closure gap w.r.t. the generator coordinates (G symmetric):
 *   ∂re/∂u = 2·Gu,  ∂re/∂v = −2·Gv,  ∂im/∂u = 2·Gv,  ∂im/∂v = 2·Gu.
 */
export function closureJacobian(
  u: readonly number[], v: readonly number[], G: number[][],
): { reDu: number[]; reDv: number[]; imDu: number[]; imDv: number[] } {
  const Gu = matVec(G, u), Gv = matVec(G, v)
  return {
    reDu: Gu.map((x) => 2 * x),
    reDv: Gv.map((x) => -2 * x),
    imDu: Gv.map((x) => 2 * x),
    imDv: Gu.map((x) => 2 * x),
  }
}

/**
 * The seam parameterization of a CLOSED PH generator: the last `nWrap` control points are
 * determined (anti-periodically, sign s) by the first ones so the generator wraps C^nWrap.
 * `expand` maps the K free coordinates to the full n; `fold` is its transpose (chains a
 * full-coordinate gradient back to the free coordinates). nWrap = seamContinuity ∈ {0,1,2}.
 */
export function phSeamMaps(
  knots: readonly number[], degree: number, n: number, seamContinuity: number, wrapSign: number,
): { K: number; expand: (f: readonly number[]) => number[]; fold: (full: readonly number[]) => number[] } {
  const nWrap = Math.max(0, Math.min(2, seamContinuity))
  const K = n - nWrap
  const s = wrapSign
  const hFirst = knots[degree + 1] - knots[degree]
  const hLast = knots[n] - knots[n - 1]
  const ratio = hFirst > 1e-12 ? hLast / hFirst : 1
  const expand = (f: readonly number[]): number[] => {
    const c = f.slice(0, K)
    if (nWrap >= 2) c.push(s * ((1 + ratio) * f[0] - ratio * f[1]))
    if (nWrap >= 1) c.push(s * f[0])
    return c
  }
  const fold = (full: readonly number[]): number[] => {
    const row = new Array<number>(K).fill(0)
    for (let i = 0; i < K; i++) row[i] = full[i]
    if (nWrap >= 1) row[0] += full[n - 1] * s
    if (nWrap >= 2) { row[0] += full[n - 2] * s * (1 + ratio); row[1] += full[n - 2] * s * (-ratio) }
    return row
  }
  return { K, expand, fold }
}

/**
 * Newton-project a generator onto the closure manifold ∮w² = 0, holding the seam
 * parameterization (the free coordinates move; the wrap coordinates follow). The core
 * analog of the sketcher's projectClosedPHGenerator — same minimum-norm Newton step, but
 * the closure gap/Jacobian come from the Gram matrix (no curve construction).
 */
export function projectClosurePH(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number,
  seamContinuity: number, wrapSign: number, G?: number[][],
): { u: number[]; v: number[] } {
  const n = u.length
  const { K, expand, fold } = phSeamMaps(knots, degree, n, seamContinuity, wrapSign)
  const Gm = G ?? generatorBasisGram(knots, degree, n)
  const uF = u.slice(0, K), vF = v.slice(0, K)
  for (let iter = 0; iter < 8; iter++) {
    const U = expand(uF), V = expand(vF)
    const gap = closureGap(U, V, Gm)
    if (Math.hypot(gap.re, gap.im) < 1e-12) break
    const J = closureJacobian(U, V, Gm)
    const Jx = [...fold(J.reDu), ...fold(J.reDv)] // ∂re/∂[uF,vF]
    const Jy = [...fold(J.imDu), ...fold(J.imDv)] // ∂im/∂[uF,vF]
    const a = dot(Jx, Jx), b = dot(Jx, Jy), c2 = dot(Jy, Jy), det = a * c2 - b * b
    if (Math.abs(det) < 1e-20) break
    const l0 = (c2 * gap.re - b * gap.im) / det, l1 = (-b * gap.re + a * gap.im) / det
    for (let j = 0; j < 2 * K; j++) {
      const step = -(Jx[j] * l0 + Jy[j] * l1)
      if (j < K) uF[j] += step
      else vF[j - K] += step
    }
  }
  return { u: expand(uF), v: expand(vF) }
}

/**
 * Newton-project a PERIODIC preimage onto closure ∮w² = 0 — minimum-norm step over ALL
 * 2n coordinates (no seam parameterization; the periodic basis already makes the seam
 * continuous). The clean closed-PH form Rust uses; for the editor's clamped chart use
 * projectClosurePH instead.
 */
export function projectClosurePHPeriodic(
  u: readonly number[], v: readonly number[], knots: readonly number[], degree: number, G?: number[][],
): { u: number[]; v: number[] } {
  const n = u.length
  const Gm = G ?? generatorBasisGram(knots, degree, n, true)
  const uu = u.slice(), vv = v.slice()
  for (let iter = 0; iter < 8; iter++) {
    const gap = closureGap(uu, vv, Gm)
    if (Math.hypot(gap.re, gap.im) < 1e-12) break
    const J = closureJacobian(uu, vv, Gm)
    const Jx = [...J.reDu, ...J.reDv] // ∂re/∂[u,v]  (length 2n)
    const Jy = [...J.imDu, ...J.imDv]
    const a = dot(Jx, Jx), b = dot(Jx, Jy), c2 = dot(Jy, Jy), det = a * c2 - b * b
    if (Math.abs(det) < 1e-20) break
    const l0 = (c2 * gap.re - b * gap.im) / det, l1 = (-b * gap.re + a * gap.im) / det
    for (let j = 0; j < 2 * n; j++) {
      const step = -(Jx[j] * l0 + Jy[j] * l1)
      if (j < n) uu[j] += step
      else vv[j - n] += step
    }
  }
  return { u: uu, v: vv }
}
