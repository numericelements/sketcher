// ============================================================================
// Curvature-VALUE bound for a planar (polynomial) PH curve — in core.
//
// κ(t) = 2P/σ² with P = uv′−vu′ and σ = u²+v² (the same objects the reduced
// extrema numerator R = P′σ − 2Pσ′ is built from — F7). |κ| ≤ κ_max is the
// pair of polynomial NONNEGATIVITY CERTIFICATES
//     P± = κ_max·σ² ± 2P ≥ 0        (degree 8 for a quintic)
// certified by their Bernstein coefficients being ≥ 0 (variation diminishing —
// Law 1's machinery pointed at nonnegativity instead of sign changes). Loose is
// true: subdivision (a LINEAR map, applied identically to values and tangents)
// tightens the certificate without ever faking it.
//
// This is the pattern a SPATIAL PH curve joins later with its own polynomial
// (κ²σ⁶ = |r′×r″|² → one row b²σ⁶ − |r′×r″|² ≥ 0): certificate rows as
// trust-region inequality constraints, exact AD Jacobians over the B-spline
// algebra. Keep this file generic over "rows of a polynomial certificate".
// ============================================================================
import { BernsteinDecomposition, decomposeToBernstein, subBezierOn } from './bernstein'
import { RDual } from './phCurvature'

/** Flatten a decomposition's coefficients, subdividing each span into k pieces via the
 *  shared de Casteljau sub-Bézier extractor (bernstein.subBezierOn — the ONE split). */
export function flattenSubdivided(bd: BernsteinDecomposition, k: number): number[] {
  const out: number[] = []
  for (const span of bd.coeffs) {
    if (k <= 1) out.push(...span)
    else for (let i = 0; i < k; i++) out.push(...subBezierOn(span, i / k, (i + 1) / k))
  }
  return out
}

/** P± = κ_max·σ² ± 2P as a dual computation (value + tangent share the algebra). */
function certificateDual(U: RDual, V: RDual, kappaMax: number): { plus: RDual; minus: RDual } {
  const P = U.mul(V.derivative()).sub(V.mul(U.derivative()))           // uv′−vu′
  const sigma = U.mul(U).add(V.mul(V))                                  // u²+v²
  const bound = sigma.mul(sigma).scale(kappaMax)                        // κ_max·σ²... ·(u²+v²)²
  const twoP = P.scale(2)
  return { plus: bound.sub(twoP), minus: bound.add(twoP) }
}

/**
 * Bernstein coefficients of P₊ then P₋ (each span subdivided `subdivisions`
 * times). All ≥ 0 certifies |κ| ≤ κ_max on the whole domain.
 */
export function phValueBoundCertificate(
  u: readonly number[], v: readonly number[], uvKnots: readonly number[], uvDegree: number,
  kappaMax: number, subdivisions = 1,
): number[] {
  const U = decomposeToBernstein(u, uvKnots, uvDegree)
  return certificateFlat(U, decomposeToBernstein(v, uvKnots, uvDegree), kappaMax, subdivisions)
}

function certificateFlat(U: BernsteinDecomposition, V: BernsteinDecomposition, kappaMax: number, subdivisions: number): number[] {
  const zero = U.scale(0)
  const { plus, minus } = certificateDual(new RDual(U, zero), new RDual(V, zero), kappaMax)
  return [...flattenSubdivided(plus.val, subdivisions), ...flattenSubdivided(minus.val, subdivisions)]
}

/** Smallest certificate coefficient; ≥ 0 ⇒ |κ| ≤ κ_max is certified. */
export function phValueBoundMargin(
  u: readonly number[], v: readonly number[], uvKnots: readonly number[], uvDegree: number,
  kappaMax: number, subdivisions = 1,
): number {
  return phValueBoundCertificate(u, v, uvKnots, uvDegree, kappaMax, subdivisions)
    .reduce((m, c) => Math.min(m, c), Infinity)
}

/**
 * Certificate rows + exact Jacobian w.r.t. the generator coordinates, by
 * forward AD (seed each coordinate's tangent with its Dirac basis — the same
 * scheme as reducedPHGradient). du/dv columns are per generator coefficient.
 */
export function phValueBoundRows(
  u: readonly number[], v: readonly number[], uvKnots: readonly number[], uvDegree: number,
  kappaMax: number, subdivisions = 1,
): { rows: number[]; du: number[][]; dv: number[][] } {
  const dec = (c: readonly number[]) => decomposeToBernstein(c, uvKnots, uvDegree)
  const Uv = dec(u)
  const Vv = dec(v)
  const zero = Uv.scale(0)
  const flat = (d: { plus: RDual; minus: RDual }, pick: 'val' | 'tan') =>
    [...flattenSubdivided(d.plus[pick], subdivisions), ...flattenSubdivided(d.minus[pick], subdivisions)]
  const rows = flat(certificateDual(new RDual(Uv, zero), new RDual(Vv, zero), kappaMax), 'val')
  const n = u.length
  const du: number[][] = []
  const dv: number[][] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Ni = dec(e)
    du.push(flat(certificateDual(new RDual(Uv, Ni), new RDual(Vv, zero), kappaMax), 'tan'))
    dv.push(flat(certificateDual(new RDual(Uv, zero), new RDual(Vv, Ni), kappaMax), 'tan'))
  }
  return { rows, du, dv }
}

/**
 * Project a violating generator onto |κ| ≤ κ_max: damped Gauss-Newton on the
 * hinge residuals r_i = min(0, cert_i) with an escalating penalty against a
 * generator-L2 anchor (stay close; the certificate does the work). The core
 * port of the legacy snapPHCurveToCurvatureBound (which drove the IP barrier
 * with a penalty for the same reason: the barrier needs a feasible START —
 * this IS the feasibility restoration, so it cannot assume feasibility).
 */
export function snapPHToValueBound(
  u0: readonly number[], v0: readonly number[], uvKnots: readonly number[], uvDegree: number,
  kappaMax: number, subdivisions = 1,
): { u: number[]; v: number[]; certified: boolean } {
  const n = u0.length
  let u = u0.slice()
  let v = v0.slice()
  let lambda = 1
  for (let outer = 0; outer < 18; outer++) {
    for (let it = 0; it < 40; it++) {
      const { rows, du, dv } = phValueBoundRows(u, v, uvKnots, uvDegree, kappaMax, subdivisions)
      const viol = rows.map((r, i) => ({ r, i })).filter((e) => e.r < 0)
      if (viol.length === 0) break
      // GN normal equations on √λ·hinge rows + unit anchor rows (2n vars).
      const dim = 2 * n
      const A = Array.from({ length: dim }, () => new Array<number>(dim).fill(0))
      const b = new Array<number>(dim).fill(0)
      for (let k = 0; k < dim; k++) A[k][k] = 1 // anchor: keep step small
      for (const { r, i } of viol) {
        const g = new Array<number>(dim)
        for (let j = 0; j < n; j++) {
          g[j] = du[j][i]
          g[n + j] = dv[j][i]
        }
        for (let a = 0; a < dim; a++) {
          b[a] += -lambda * r * g[a]
          for (let c = 0; c <= a; c++) A[a][c] += lambda * g[a] * g[c]
        }
      }
      // dense Cholesky solve (small: dim = 2n)
      const L = Array.from({ length: dim }, () => new Array<number>(dim).fill(0))
      let ok = true
      for (let j = 0; j < dim && ok; j++) {
        let piv = A[j][j]
        for (let k = 0; k < j; k++) piv -= L[j][k] * L[j][k]
        if (piv <= 0) { ok = false; break }
        L[j][j] = Math.sqrt(piv)
        for (let i2 = j + 1; i2 < dim; i2++) {
          let val = i2 >= j ? A[i2][j] : A[j][i2]
          for (let k = 0; k < j; k++) val -= L[i2][k] * L[j][k]
          L[i2][j] = val / L[j][j]
        }
      }
      if (!ok) break
      const x = b.slice()
      for (let i2 = 0; i2 < dim; i2++) {
        let sm = x[i2]
        for (let k = 0; k < i2; k++) sm -= L[i2][k] * x[k]
        x[i2] = sm / L[i2][i2]
      }
      for (let i2 = dim - 1; i2 >= 0; i2--) {
        let sm = x[i2]
        for (let k = i2 + 1; k < dim; k++) sm -= L[k][i2] * x[k]
        x[i2] = sm / L[i2][i2]
      }
      for (let j = 0; j < n; j++) {
        u[j] += x[j]
        v[j] += x[n + j]
      }
    }
    if (phValueBoundMargin(u, v, uvKnots, uvDegree, kappaMax, subdivisions) > 1e-7) {
      return { u, v, certified: true }
    }
    lambda *= 2.5
  }
  return { u, v, certified: phValueBoundMargin(u, v, uvKnots, uvDegree, kappaMax, subdivisions) >= 0 }
}
