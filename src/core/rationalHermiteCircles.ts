// ============================================================================
// THE HERMITE FIBRE OF A RATIONAL PH SEXTIC, IN CLOSED FORM — the rational completed square.
//
// The degree-6 one-pole family holding full C¹ Hermite data has a 2-dimensional fibre. This module
// gives the second of its two circles explicitly, with no solver: the analogue of the polynomial
// quintic's third Hopf circle (`spatialQuinticTorus.test.ts`), which is what makes that family a torus
// of angles rather than a set of solutions.
//
// THE DERIVATION, in full, because it is short and the code below is unreadable without it.
//
// Hold 𝒜(0) and 𝒜(1). Holding the SPINOR at both ends is stronger than holding the two tangents: it
// also spends the Hopf gauge (𝒜 ↦ 𝒜e^{iθ} moves 𝒜(0)) and fixes the other fibre coordinate, the
// relative phase ψ. A variation δ𝒜 that stays in the family and holds them must satisfy
//
//     δ𝒜(0) = 0 ,    δ𝒜(1) = 0 ,    δ𝒜′(r) = δ𝒜(r)·λi
//
// the last being the no-log residue condition at the single pole (F17, with Σ = 0 because there is
// only one). Now try
//
//     δ𝒜 = X·u(t) ,   X ∈ ℍ free ,   u a COMPLEX cubic
//
// where complex means valued in span{1, i} — the subfield that commutes with i. The residue condition
// becomes X·u′(r) = X·u(r)λi for EVERY X, so it is a condition on u alone:
//
//     u(0) = u(1) = 0 ,    u′(r) = λi·u(r)
//
// With u = t(t−1)(αt + β) that solves outright: writing P = αr + β for the free complex scale,
//
//     α = [λi − (2r−1)/(r²−r)]·P ,     β = P − αr
//
// so u is unique up to complex scale, and {X·u : X ∈ ℍ} is four real dimensions — exactly the
// 12 − 4 − 4 the count predicts.
//
// AND THE QUADRATIC TERM IS A HOPF MAP. That is the whole reason this works, and it is where the
// complex-valuedness of u earns its place: u i ū = i|u|², so
//
//     (Xu) i (Xu)*  =  X (u i ū) X̄  =  |u|² · X i X̄
//
// The cross term against a particular solution 𝒜₀ is 2·vec(𝒜₀ i ū X̄), so with
//
//     μ = ∫₀¹ |u|²/w² dt ,    G = ∫₀¹ 𝒜₀ i ū /w² dt ,    X₀ = −G i/μ
//
// completing the square in X turns the displacement condition into ONE MORE HOPF EQUATION:
//
//     Y i Ȳ = T ,    Y = X + X₀ ,    T = (Δc_wanted − Δc₀)/μ + X₀ i X₀*
//
// Y therefore runs a Hopf circle, and 𝒜 = 𝒜₀ + (Y − X₀)·u. When 𝒜₀ is already a member of the fibre
// the displacement is already right, T = X₀ i X₀*, and the whole thing collapses to
//
//     𝒜(θ) = 𝒜₀ + (X₀ e^{iθ} − X₀) · u(t)
//
// which closes at 2π because e^{2πi} = 1 — not because a solver came back to where it started.
//
// SCOPE, stated rather than silently assumed. Exactly ONE pole and spinor degree exactly 3. At other
// spinor degrees u is not unique (v = u/(t²−t) has n−1 complex coefficients against one complex
// condition, so n−2 complex dimensions of solutions) and "the circle" is not a circle; at more poles
// there is a residue condition per pole and Σ ≠ 0. `middleCircle` returns null rather than pretending.
//
// Everything here is pinned in `rationalMiddleCircle.test.ts`, including the control that matters: the
// 2180-step continuation walk that found this loop the slow way lies ON it, to 1.4e-14.
// ============================================================================
import { leastSquares } from './linalg'
import {
  QUAT_I, qadd, qconj, qmul, qnormSq, qscale, quatFromSandwich, type Quat, type Vec3,
} from './quaternion'
import type { MultiPoleParams } from './rationalPHMultiPoleSpatial'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }

type Cx = [number, number]
const cMul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
const cSub = (a: Cx, b: Cx): Cx => [a[0] - b[0], a[1] - b[1]]
const cScale = (a: Cx, k: number): Cx => [a[0] * k, a[1] * k]

/**
 * u = t(t−1)(αt + β): the cubic with u(0) = u(1) = 0 and u′(r) = λi·u(r), unique up to complex scale.
 * Returned as quaternion coefficients lying in span{1, i}.
 */
export function shapePolynomial(r: number, lambda: number): Quat[] {
  const P: Cx = [1, 0]
  const alpha = cMul(cSub([0, lambda], [(2 * r - 1) / (r * r - r), 0]), P)
  const beta = cSub(P, cScale(alpha, r))
  // (t² − t)(αt + β) = α t³ + (β − α) t² − β t
  const c: Cx[] = [[0, 0], cScale(beta, -1), cSub(beta, alpha), alpha]
  return c.map(([a, b]) => ({ u: a, v: b, p: 0, q: 0 }))
}

const polyMul = (a: readonly Quat[], b: readonly Quat[]): Quat[] => {
  const out: Quat[] = Array.from({ length: a.length + b.length - 1 }, () => ZQ)
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qadd(out[i + j], qmul(x, y)) }))
  return out
}

/**
 * ∫₀¹ p(t)/(t−r)² dt EXACTLY — no quadrature. Re-expand p about r: with s = t − r and p = Σ cₖ sᵏ,
 * ∫ Σ cₖ s^{k−2} ds = −c₀/s + c₁ ln|s| + Σ_{k≥2} cₖ s^{k−1}/(k−1). The log term is harmless here: it
 * is a number, not a branch, because r lies outside [0,1] so s never crosses zero.
 */
export function integralOverW2(p: readonly number[], r: number): number {
  const c = p.slice()
  const taylor: number[] = []
  for (let d = 0; d < p.length; d++) {
    let acc = 0
    for (let k = c.length - 1; k >= d; k--) { acc = acc * r + c[k]; c[k] = acc }
    taylor.push(c[d])
  }
  const at = (s: number): number => {
    let v = -taylor[0] / s + (taylor[1] ?? 0) * Math.log(Math.abs(s))
    for (let k = 2; k < taylor.length; k++) v += (taylor[k] * Math.pow(s, k - 1)) / (k - 1)
    return v
  }
  return at(1 - r) - at(-r)
}

export interface MiddleCircle {
  /** The member at angle θ. θ = 0 is the member passed in, and 2π returns to it exactly. */
  at: (theta: number) => MultiPoleParams
  /** The circle's radius in ℍ. Zero would mean a degenerate fibre; `middleCircle` refuses that. */
  radius: number
}

/**
 * The circle through `base` at FIXED 𝒜(0) and 𝒜(1) — the second fibre coordinate, in closed form.
 * Null when the derivation does not apply (see SCOPE above) or when the circle degenerates.
 */
export function middleCircle(base: MultiPoleParams): MiddleCircle | null {
  if (base.roots.length !== 1 || base.A.length !== 4) return null
  const r = base.roots[0]
  const lambda = base.lambdas[0]
  if (!Number.isFinite(r) || !Number.isFinite(lambda) || Math.abs(r * r - r) < 1e-12) return null

  const u = shapePolynomial(r, lambda)
  const uBar = u.map(qconj)
  const mu = integralOverW2(polyMul(u, uBar).map((q) => q.u), r)
  if (!Number.isFinite(mu) || Math.abs(mu) < 1e-300) return null

  const gPoly = polyMul(polyMul(base.A as Quat[], [QUAT_I]), uBar)
  const g = [
    integralOverW2(gPoly.map((q) => q.u), r),
    integralOverW2(gPoly.map((q) => q.v), r),
    integralOverW2(gPoly.map((q) => q.p), r),
    integralOverW2(gPoly.map((q) => q.q), r),
  ]
  if (!g.every(Number.isFinite)) return null
  const X0 = qscale(qmul({ u: g[0], v: g[1], p: g[2], q: g[3] }, QUAT_I), -1 / mu)
  const radius = Math.sqrt(qnormSq(X0))
  if (!(radius > 1e-12)) return null

  return {
    radius,
    at: (theta: number): MultiPoleParams => {
      // Y = X₀e^{iθ}, and the displacement is already met, so X = Y − X₀.
      const Y = qadd(qscale(X0, Math.cos(theta)), qscale(qmul(X0, QUAT_I), Math.sin(theta)))
      const X = qadd(Y, qscale(X0, -1))
      return { ...base, A: (base.A as Quat[]).map((c, k) => qadd(c, qmul(X, u[k] ?? ZQ))) }
    },
  }
}


// ---------------------------------------------------------------------------------------------
// THE WHOLE FIBRE IN CLOSED FORM — both coordinates, no solver anywhere.
//
// `middleCircle` above gives the second coordinate at a member you already have. This gives the first
// one too, and the reason to want it is not speed.
//
// ψ USED TO BE A SOLVER TARGET. Rotating 𝒜(1) by e^{iψ} and chasing the displacement with minimum-norm
// Gauss–Newton returns a member, and it returns the SAME member at 2π, so as a handle it was honest.
// But minimum norm is taken in the monomial coefficient basis {1, t, t², t³}, which is violently
// asymmetric under t ↦ 1−t, and that choice drags ψ's landing point along the s circle. Measured
// consequence: driving ψ alone moved the three interior control points by 0.554, 3.785, 3.590 —
// lopsided by a factor of seven — while the combination ψ + s moved them 0.589, 0.532, 0.503. The
// shear was the solver's, not the geometry's.
//
// Here every step is algebra:
//
//   1. 𝒜(0) = a and 𝒜(1) = b together with the residue condition are LINEAR in 𝒜 — twelve real
//      equations on sixteen unknowns, leaving exactly the {X·u} space. Any particular solution will do,
//      because step 3 re-anchors on the circle itself.
//   2. μ, G and X₀ as above, and Δc of the particular solution, all by exact integration.
//   3. T = (Δc_wanted − Δc_particular)/μ + X₀ i X₀*, and Y = quatFromSandwich(T)·e^{iθ}. That
//      representative depends only on T — which depends only on the DATA — so θ = 0 is canonical and
//      the arbitrariness of step 1 cancels.
//
// SO (ψ, θ) IS A CHART ON THE TORUS, not a pair of trails. → hermiteClosedChart.test.ts
// ---------------------------------------------------------------------------------------------

/** Right multiplication by i, as a 4×4 real matrix: (u,v,p,q) ↦ (−v, u, q, −p). */
const R_I: number[][] = [
  [0, -1, 0, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 1],
  [0, 0, -1, 0],
]

/**
 * A particular 𝒜 with 𝒜(0) = a, 𝒜(1) = b and the residue condition 𝒜′(r) = 𝒜(r)λi. Twelve real
 * equations on sixteen unknowns; min-norm least squares picks one, and which one does not matter —
 * the solution set is 𝒜_p + {X·u} and `hermiteChart` re-anchors on the circle.
 */
function particularWithEnds(
  r: number, lambda: number, a: Quat, b: Quat,
): Quat[] | null {
  const rows: number[][] = []
  const rhs: number[] = []
  const push = (row: number[], v: number): void => { rows.push(row); rhs.push(v) }
  const zero = (): number[] => new Array<number>(16).fill(0)

  // 𝒜(0) = a
  const av = [a.u, a.v, a.p, a.q]
  for (let c = 0; c < 4; c++) { const row = zero(); row[c] = 1; push(row, av[c]) }
  // 𝒜(1) = b
  const bv = [b.u, b.v, b.p, b.q]
  for (let c = 0; c < 4; c++) {
    const row = zero()
    for (let k = 0; k < 4; k++) row[4 * k + c] = 1
    push(row, bv[c])
  }
  // 𝒜′(r) − 𝒜(r)λi = 0 : block for A_k is k·r^{k−1}·I − λ·r^k·R_i
  for (let c = 0; c < 4; c++) {
    const row = zero()
    for (let k = 0; k < 4; k++) {
      const d = k === 0 ? 0 : k * Math.pow(r, k - 1)
      const m = lambda * Math.pow(r, k)
      for (let j = 0; j < 4; j++) row[4 * k + j] = (c === j ? d : 0) - m * R_I[c][j]
    }
    push(row, 0)
  }
  try {
    const x = leastSquares(rows, rhs, 1e-12)
    if (!x.every(Number.isFinite)) return null
    return Array.from({ length: 4 }, (_, k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] }))
  } catch { return null }
}

/** ∫₀¹ (𝒜 i 𝒜*)/w² dt — the displacement, exactly. */
function displacementOf(A: readonly Quat[], r: number): Vec3 {
  const N = polyMul(polyMul(A, [QUAT_I]), A.map(qconj))
  return {
    x: integralOverW2(N.map((q) => q.v), r),
    y: integralOverW2(N.map((q) => q.p), r),
    z: integralOverW2(N.map((q) => q.q), r),
  }
}

export interface HermiteChart {
  /** The member at end-phase ψ and circle angle θ. Both return exactly at 2π. */
  at: (psi: number, theta: number) => MultiPoleParams | null
}

/**
 * Both fibre coordinates of `seed`'s C¹ Hermite fibre, in closed form. ψ turns 𝒜(1) on its Hopf circle;
 * θ runs the middle circle. Null out of scope (one pole, spinor degree 3) or where T degenerates.
 */
export function hermiteChart(seed: MultiPoleParams): HermiteChart | null {
  if (seed.roots.length !== 1 || seed.A.length !== 4) return null
  const r = seed.roots[0], lambda = seed.lambdas[0]
  if (!Number.isFinite(r) || !Number.isFinite(lambda) || Math.abs(r * r - r) < 1e-12) return null

  const A = seed.A as Quat[]
  const a = A[0]
  const b0 = A.reduce((s, c) => qadd(s, c), ZQ)
  const wanted = displacementOf(A, r)

  const u = shapePolynomial(r, lambda)
  const uBar = u.map(qconj)
  const mu = integralOverW2(polyMul(u, uBar).map((q) => q.u), r)
  if (!Number.isFinite(mu) || Math.abs(mu) < 1e-300) return null

  return {
    at: (psi: number, theta: number): MultiPoleParams | null => {
      const b = qadd(qscale(b0, Math.cos(psi)), qscale(qmul(b0, QUAT_I), Math.sin(psi)))
      const Ap = particularWithEnds(r, lambda, a, b)
      if (!Ap) return null

      const gPoly = polyMul(polyMul(Ap, [QUAT_I]), uBar)
      const G: Quat = {
        u: integralOverW2(gPoly.map((q) => q.u), r),
        v: integralOverW2(gPoly.map((q) => q.v), r),
        p: integralOverW2(gPoly.map((q) => q.p), r),
        q: integralOverW2(gPoly.map((q) => q.q), r),
      }
      if (!Number.isFinite(G.u + G.v + G.p + G.q)) return null
      const X0 = qscale(qmul(G, QUAT_I), -1 / mu)

      const d0 = displacementOf(Ap, r)
      const s0 = qmul(qmul(X0, QUAT_I), qconj(X0))          // X₀ i X₀*, a vector
      const T: Vec3 = {
        x: (wanted.x - d0.x) / mu + s0.v,
        y: (wanted.y - d0.y) / mu + s0.p,
        z: (wanted.z - d0.z) / mu + s0.q,
      }
      const Y0 = quatFromSandwich(T)                        // canonical: depends only on T
      if (!Y0) return null
      const Y = qadd(qscale(Y0, Math.cos(theta)), qscale(qmul(Y0, QUAT_I), Math.sin(theta)))
      const X = qadd(Y, qscale(X0, -1))
      return { ...seed, A: Ap.map((c, k) => qadd(c, qmul(X, u[k] ?? ZQ))) }
    },
  }
}
