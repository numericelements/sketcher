// ============================================================================
// LINEAR FACTORS IN Sp(1,1) — the joint (A, C) problem, attacked by factorisation.
//
// WHY. sp11RationalPH solves for C with A PRESCRIBED: a slice, not a parametrisation. For a chart
// you need to generate solutions of the joint system, which is quadratic in (A, C). The route
// Schröcker & Šír use for the classical case is quaternion polynomial FACTORISATION, so this module
// transplants it: build the motion as a product of LINEAR factors and read the curve off the first
// column.
//
// THE ALGEBRA. sp(1,1) = {X : X†J + JX = 0} = J·{anti-Hermitian}, dimension 10 = dim SO(4,1). A
// linear factor F(t) = tI − H stays in the group up to a REAL scalar exactly when
//
//     H ∈ sp(1,1)     and     H² = −d·I  for real d,
//
// because then F†JF = t²J − t(H†J + JH) + H†JH = (t² + d)J. So a product of k such factors satisfies
// M†JM = ρJ with ρ = Π(t² + dⱼ) — REAL, and with NO REAL ROOTS when every dⱼ > 0, which is the
// bounded case. Degrees grow by one per factor and nothing has to be enforced along the way.
//
// GENERATING THE FACTORS. H² = −dI is preserved under conjugation by the group — (GHG⁻¹)² = GH²G⁻¹ —
// so instead of solving a variety we conjugate the three known solutions:
//     H = h·I           h imaginary quaternion   d = |h|²   (rotation)
//     H = [[0,0],[a,0]] a imaginary quaternion   d = 0      (translation, parabolic)
//     H = c·diag(1,−1)  c real                   d = −c²    (scaling, hyperbolic)
//
// WHAT THIS MODULE DOES NOT CLAIM. Whether the resulting curve is PH is a MEASUREMENT, not a
// theorem — see sp11Factorisation.test.ts. Kalkan et al. already report that a framing motion's
// spherical part is free while the translation part must solve a linear system, so PH being
// automatic here would be surprising.
// ============================================================================
import {
  type QPoly, type Poly, type Column,
  qpAdd, qpMul, qpConj, qpNorm, qpReal, qpConst, QP_ZERO, pMax, pMul, pAdd,
} from './sp11RationalPH'

/** A 2×2 matrix of quaternion polynomials. */
export type Mat2 = [[QPoly, QPoly], [QPoly, QPoly]]

export const J: Mat2 = [[QP_ZERO, qpConst(1)], [qpConst(1), QP_ZERO]]
export const IDENT: Mat2 = [[qpConst(1), QP_ZERO], [QP_ZERO, qpConst(1)]]

export const mat = (a: QPoly, b: QPoly, c: QPoly, d: QPoly): Mat2 => [[a, b], [c, d]]
export const mMul = (X: Mat2, Y: Mat2): Mat2 => [
  [qpAdd(qpMul(X[0][0], Y[0][0]), qpMul(X[0][1], Y[1][0])),
   qpAdd(qpMul(X[0][0], Y[0][1]), qpMul(X[0][1], Y[1][1]))],
  [qpAdd(qpMul(X[1][0], Y[0][0]), qpMul(X[1][1], Y[1][0])),
   qpAdd(qpMul(X[1][0], Y[0][1]), qpMul(X[1][1], Y[1][1]))],
]
export const mAdd = (X: Mat2, Y: Mat2): Mat2 => [
  [qpAdd(X[0][0], Y[0][0]), qpAdd(X[0][1], Y[0][1])],
  [qpAdd(X[1][0], Y[1][0]), qpAdd(X[1][1], Y[1][1])],
]
export const mScale = (X: Mat2, s: QPoly): Mat2 => [
  [qpMul(s, X[0][0]), qpMul(s, X[0][1])], [qpMul(s, X[1][0]), qpMul(s, X[1][1])],
]
/** Conjugate transpose. */
export const dagger = (X: Mat2): Mat2 =>
  [[qpConj(X[0][0]), qpConj(X[1][0])], [qpConj(X[0][1]), qpConj(X[1][1])]]
export const mMax = (X: Mat2): number =>
  Math.max(...X.flat().map((q) => Math.max(...q.map(pMax))))
export const mGap = (X: Mat2, Y: Mat2): number => {
  const s = Math.max(mMax(X), mMax(Y)) || 1
  let d = 0
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) for (let q = 0; q < 4; q++) {
    const a = X[r][c][q], b = Y[r][c][q]
    for (let k = 0; k < Math.max(a.length, b.length); k++) {
      d = Math.max(d, Math.abs((a[k] ?? 0) - (b[k] ?? 0)))
    }
  }
  return d / s
}

/** How far X is from the Lie algebra: |X†J + JX|, relative. */
export const algebraDefect = (X: Mat2): number => {
  const s = mMax(X) || 1
  const D = mAdd(mMul(dagger(X), J), mMul(J, X))
  return mMax(D) / s
}

/** M†JM − ρJ, relative — zero when M is Sp(1,1)-valued up to the real scalar ρ. */
export function groupDefect(M: Mat2): { defect: number; rho: Poly } {
  const G = mMul(mMul(dagger(M), J), M)
  const rho = G[0][1][0].slice()                 // the (1,2) entry's real part IS ρ
  const target: Mat2 = mScale(J, qpReal(rho))
  return { defect: mGap(G, target), rho }
}

// --- the three seed solutions of H ∈ sp(1,1), H² = −dI ------------------------
/** Rotation type: H = h·I with h imaginary. d = |h|². */
export const rotationSeed = (h: [number, number, number]): Mat2 =>
  mat(qpConst(0, h[0], h[1], h[2]), QP_ZERO, QP_ZERO, qpConst(0, h[0], h[1], h[2]))
/** Translation type (parabolic): d = 0. */
export const translationSeed = (a: [number, number, number]): Mat2 =>
  mat(QP_ZERO, QP_ZERO, qpConst(0, a[0], a[1], a[2]), QP_ZERO)
/** Scaling type (hyperbolic): H = c·diag(1,−1), d = −c². */
export const scalingSeed = (c: number): Mat2 =>
  mat(qpConst(c), QP_ZERO, QP_ZERO, qpConst(-c))

/** The d in H² = −dI, read off the (1,1) entry. Returns null if H² is not a real scalar. */
export function scalarSquare(H: Mat2): number | null {
  const S = mMul(H, H)
  const d = -(S[0][0][0][0] ?? 0) || 0   // `|| 0` normalises -0, which trips strict equality
  const target = mScale(IDENT, qpConst(-d))
  return mGap(S, target) < 1e-10 ? d : null
}

// --- constant group elements, for conjugating the seeds -----------------------
export const gTranslate = (a: [number, number, number]): Mat2 =>
  mat(qpConst(1), QP_ZERO, qpConst(0, a[0], a[1], a[2]), qpConst(1))
export const gRotate = (q: [number, number, number, number]): Mat2 => {
  const n = Math.hypot(...q) || 1
  const u = qpConst(q[0] / n, q[1] / n, q[2] / n, q[3] / n)
  return mat(u, QP_ZERO, QP_ZERO, u)
}
export const gScale = (s: number): Mat2 => mat(qpConst(1 / s), QP_ZERO, QP_ZERO, qpConst(s))
export const G_INVERT: Mat2 = mat(QP_ZERO, qpConst(-1), qpConst(1), QP_ZERO)

/** Inverse of a CONSTANT group element: G⁻¹ = ρ⁻¹ J G† J, no adjugate needed. */
export function groupInverse(G: Mat2): Mat2 {
  const { rho } = groupDefect(G)
  const r = rho[0] || 1
  const K = mMul(mMul(J, dagger(G)), J)
  return mScale(K, qpConst(1 / r))
}

/** Conjugate a seed: (GHG⁻¹)² = GH²G⁻¹, so the H² = −dI property survives exactly. */
export const conjugate = (G: Mat2, H: Mat2): Mat2 => mMul(mMul(G, H), groupInverse(G))

// --- the product, and the curve it carries ------------------------------------
const T_ID: Mat2 = mat(qpReal([0, 1]), QP_ZERO, QP_ZERO, qpReal([0, 1]))   // t·I

/** F(t) = tI − H. */
export const linearFactor = (H: Mat2): Mat2 =>
  mAdd(T_ID, mScale(H, qpConst(-1)))

/** M(t) = Π (tI − Hⱼ). Degrees grow by exactly one per factor. */
export const factorProduct = (Hs: readonly Mat2[]): Mat2 =>
  Hs.reduce<Mat2>((acc, H) => mMul(acc, linearFactor(H)), IDENT)

/** The curve's column: U = M·(1,0)ᵀ, i.e. the first column of M. Null automatically. */
export const columnOf = (M: Mat2): Column => ({ A: M[0][0], C: M[1][0] })

/** ρ predicted from the factors alone: Π(t² + dⱼ). */
export function predictedRho(Hs: readonly Mat2[]): Poly | null {
  let out: Poly = [1]
  for (const H of Hs) {
    const d = scalarSquare(H)
    if (d === null) return null
    out = pMul(out, [d, 0, 1])
  }
  return out
}

/** Does ρ vanish anywhere on the real line? If not, the curve is bounded. */
export const rhoFloor = (rho: Poly, lo = -50, hi = 50, n = 4000): number => {
  let m = Infinity
  for (let i = 0; i <= n; i++) {
    const t = lo + ((hi - lo) * i) / n
    m = Math.min(m, Math.abs(rho.reduceRight((s, c) => s * t + c, 0)))
  }
  return m
}

export { pAdd, qpNorm }

// --- applying a Möbius transformation ----------------------------------------

/** U ↦ GU. A constant matrix times a polynomial column: LINEAR, so no degree ever grows. */
export const applyMobius = (G: Mat2, U: Column): Column => ({
  A: qpAdd(qpMul(G[0][0], U.A), qpMul(G[0][1], U.C)),
  C: qpAdd(qpMul(G[1][0], U.A), qpMul(G[1][1], U.C)),
})

/**
 * The same map applied POINTWISE, x ↦ (g₂₁ + g₂₂x)(g₁₁ + g₁₂x)⁻¹ — used to check that the column
 * form really does transport the geometry, rather than merely staying self-consistent.
 */
export function mobiusPoint(G: Mat2, x: readonly [number, number, number]): [number, number, number] | null {
  const at0 = (q: QPoly): [number, number, number, number] => [q[0][0] ?? 0, q[1][0] ?? 0, q[2][0] ?? 0, q[3][0] ?? 0]
  const mul = (a: readonly number[], b: readonly number[]): [number, number, number, number] => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ]
  const add = (a: readonly number[], b: readonly number[]): [number, number, number, number] =>
    [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]]
  const X: [number, number, number, number] = [0, x[0], x[1], x[2]]
  const num = add(at0(G[1][0]), mul(at0(G[1][1]), X))
  const den = add(at0(G[0][0]), mul(at0(G[0][1]), X))
  const n2 = den[0] ** 2 + den[1] ** 2 + den[2] ** 2 + den[3] ** 2
  if (n2 < 1e-14) return null                                   // the point went to infinity
  const inv: [number, number, number, number] = [den[0] / n2, -den[1] / n2, -den[2] / n2, -den[3] / n2]
  const r = mul(num, inv)
  return Math.abs(r[0]) > 1e-6 * (1 + Math.hypot(r[1], r[2], r[3])) ? null : [r[1], r[2], r[3]]
}
