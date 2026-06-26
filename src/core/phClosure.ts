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
import { decomposeToBernstein, type BernsteinDecomposition } from './bernstein'

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
export function generatorBasisGram(knots: readonly number[], degree: number, n: number): number[][] {
  const N: BernsteinDecomposition[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    N.push(decomposeToBernstein(e, knots, degree))
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
