// ============================================================================
// LIFTING A RATIONAL PH CURVE INTO ℝ^{4,1} — uniformly, or MINIMALLY.
//
// A rational PH curve x = q/w with ‖x′‖ = ρ/w² lifts to a conformal member. The obvious lift
// squares the denominator:
//
//     UNIFORM   (2w², 2wq, ‖q‖²),   h = 2ρ,   conformal degree 2·max(deg w, deg q)
//
// It is null identically, since ‖2wq‖² = 4w²‖q‖² = 2·(2w²)·‖q‖². Every pole is doubled, which is
// the only room ⟨C,C⟩ ≡ 0 leaves for a HARD pole — at a simple root the null condition forces the
// numerator isotropic, so hardness needs W′(r) = 0.
//
// BUT DOUBLING EVERY POLE OVERPAYS AT THE SOFT ONES, and the overpayment is measurable as lost
// rank. If a pole r is soft then ⟨q(r),q(r)⟩ = 0, so (t−r) divides ‖q‖². It already divides w,
// hence 2wq, and (t−r)² divides 2w² — ALL THREE components share the factor. The defining
// Jacobian loses one direction per shared root:
//
//     δ  =  max(0, |deg q − deg w| − 1)  +  deg gcd(w, ‖q‖²)
//           └──── degree shortfall ────┘    └── over-doubling ──┘
//
// measured on ten specimens (docs/CONFORMAL_SINGULAR_LOCUS.md). The second term is always EVEN:
// w and ‖q‖² are real so their gcd is real, and a real common root would force q(r) = 0 by three
// real squares, which primitivity excludes — only conjugate pairs survive.
//
// SO DIVIDE THE SHARED FACTOR OUT. With g = gcd(w, ‖q‖²):
//
//     MINIMAL   (2w²/g, 2wq/g, ‖q‖²/g),   h = 2ρ/g
//
// same nullity (every component scaled by 1/g), lower degree, and the over-doubling term gone. It
// reduces to the uniform lift when no pole is soft (g = 1) and to the curve ITSELF when every pole
// is soft (g = w), which is the other face of "all poles soft ⟺ w ∣ ρ ⟺ the curve is already a
// conformal member".
//
// Measured, on a quartic with one soft conjugate pair:
//
//     UNIFORM   n = 8   rank 29 of 32   δ = 2
//     MINIMAL   n = 6   rank 23 of 24   δ = 0
//
// WHY g ∣ ρ, so that h stays a polynomial: N(r) = −q(r)w′(r) gives ⟨N,N⟩(r) = ⟨q,q⟩(r)·w′(r)² = 0
// at a soft root, and ρ² = ‖N‖², so ρ(r) = 0 there too.
// ============================================================================
import type { Conformal } from './conformal'
import type { ConformalPHCurve } from './conformalPHCurve'
import { type Complex, cadd, cmul, cnorm } from './complex'
import { rootsOf, type Poly } from './conformalPHHopf'

const pmul = (a: readonly number[], b: readonly number[]): number[] => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const padd = (...ps: readonly (readonly number[])[]): number[] =>
  Array.from({ length: Math.max(...ps.map((q) => q.length)) },
    (_, i) => ps.reduce((s, q) => s + (q[i] ?? 0), 0))
const trueDeg = (p: readonly number[], rel = 1e-11): number => {
  const s = Math.max(...p.map(Math.abs), 1e-300)
  let n = p.length - 1
  while (n > 0 && Math.abs(p[n]) < rel * s) n--
  return n
}
const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
/** Power basis to Bernstein of degree n. */
export const toBernstein = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) acc += (binom(k, j) / binom(n, j)) * a[j]
    return acc
  })
const cpeval = (p: readonly number[], z: Complex): Complex => {
  let acc: Complex = { re: 0, im: 0 }
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}
/** Quotient of a ÷ b, with the remainder returned relative to a so a caller can check exactness. */
function pdiv(a: readonly number[], b: readonly number[]): { q: number[]; remainder: number } {
  const A = [...a]
  const db = trueDeg(b)
  const dq = trueDeg(A) - db
  if (dq < 0) return { q: [0], remainder: Math.max(...A.map(Math.abs)) }
  const Q = new Array<number>(dq + 1).fill(0)
  for (let k = dq; k >= 0; k--) {
    const c = A[k + db] / b[db]
    Q[k] = c
    for (let j = 0; j <= db; j++) A[k + j] -= c * b[j]
  }
  const scale = Math.max(...a.map(Math.abs), 1e-300)
  return { q: Q, remainder: Math.max(...A.slice(0, db).map(Math.abs), 0) / scale }
}

/** ‖q‖² = Σ qᵢ² — the BILINEAR form, which is what softness is about. Not Σ|qᵢ|². */
export const normSquared = (q: readonly Poly[]): number[] =>
  q.map((c) => pmul(c, c)).reduce((A, B) => padd(A, B))

/**
 * gcd(w, ‖q‖²), built from the roots of w at which the numerator is ISOTROPIC.
 *
 * The test is ⟨q(r),q(r)⟩ = 0 and NOT |q(r)| = 0 — the second asks whether the pole is fake, which
 * is a different question and the one that has been answered by mistake five times in this project.
 * A root where q genuinely vanishes is excluded here: it contributes to the reduction of the curve,
 * not to the over-doubling of its lift.
 */
export function sharedFactor(w: readonly number[], q: readonly Poly[], tolerance = 1e-7): number[] {
  const nq = normSquared(q)
  const qScale = Math.max(...q.flat().map(Math.abs), 1e-300)
  const roots = rootsOf(w.slice(0, trueDeg(w) + 1).map((v) => ({ re: v, im: 0 })))
  const used = new Set<number>()
  let g: number[] = [1]
  roots.forEach((z, i) => {
    if (used.has(i)) return
    const qv = q.map((c) => cpeval(c, z))
    const herm = Math.hypot(...qv.map(cnorm))
    if (herm / qScale < tolerance) return                    // fake pole, not a soft one
    if (cnorm(cpeval(nq, z)) / Math.max(herm * herm, 1e-300) >= tolerance) return
    used.add(i)
    if (Math.abs(z.im) < 1e-9) { g = pmul(g, [-z.re, 1]); return }
    // real coefficients, so soft roots arrive in conjugate pairs — take the real quadratic
    const j = roots.findIndex((o, k) =>
      k !== i && !used.has(k) && Math.abs(o.re - z.re) < 1e-7 && Math.abs(o.im + z.im) < 1e-7)
    if (j >= 0) used.add(j)
    g = pmul(g, [z.re * z.re + z.im * z.im, -2 * z.re, 1])
  })
  return g
}

export interface Lifted {
  readonly state: ConformalPHCurve
  /** Conformal degree of the result. */
  readonly degree: number
  /** Degree of the factor divided out — 0 for the uniform lift. */
  readonly divided: number
  /** Worst relative remainder from the divisions; a nonzero one means the lift is not exact. */
  readonly remainder: number
}

/**
 * Lift q/w with speed ρ into ℝ^{4,1}, dividing out the shared factor unless `uniform` is asked for.
 *
 * The factors of two are load-bearing. ‖2qw/g‖² = 4w²‖q‖²/g² has to equal 2·(2w²/g)·(‖q‖²/g), and
 * it does; dropping them gives a null residual of 7e-2 instead of 2e-14, which is how the first
 * attempt at this failed.
 */
export function liftToConformal(
  w: readonly number[],
  q: readonly Poly[],
  rho: readonly number[],
  options: { uniform?: boolean } = {},
): Lifted {
  const g = options.uniform ? [1] : sharedFactor(w, q)
  const dg = trueDeg(g)
  const nq = normSquared(q)
  const W = pdiv(pmul(w, w).map((v) => 2 * v), g)
  const Q = q.map((c) => pdiv(pmul(w, c).map((v) => 2 * v), g))
  const inf = pdiv(nq, g)
  const h = pdiv(rho.map((v) => 2 * v), g)
  const n = Math.max(trueDeg(W.q), ...Q.map((x) => trueDeg(x.q)), trueDeg(inf.q))
  const cols = [toBernstein(W.q, n), ...Q.map((x) => toBernstein(x.q, n)), toBernstein(inf.q, n)]
  return {
    state: {
      C: Array.from({ length: n + 1 }, (_, k) =>
        [cols[0][k], cols[1][k], cols[2][k], cols[3][k], cols[4][k]] as unknown as Conformal),
      h: toBernstein(h.q, n - 1),
    },
    degree: n,
    divided: dg,
    remainder: Math.max(W.remainder, ...Q.map((x) => x.remainder), inf.remainder, h.remainder),
  }
}
