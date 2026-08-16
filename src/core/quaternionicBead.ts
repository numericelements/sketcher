// ============================================================================
// THE FARIN BEAD WITH A QUATERNION WEIGHT — where degree ONE already has a circle.
//
// Slide 13's pencil ends on a hard statement: the only null curve of degree 1 is a single
// stationary point, and its Farin bead is pure gauge — a scalar weight is a convex combination,
// so the bead cannot leave the leg. This module is what happens when the weight stops being a
// scalar. The whole object is degree one, and it is a CIRCLE.
//
// THE COLUMN. Take the Sp(1,1) column of sp11RationalPH at degree 1, gauge-fixed by A₀ = 1
// (right multiplication U ↦ Uq is the only gauge, so this costs nothing and fixes it completely):
//
//     A(t) = (1−t)·1 + t·W          C(t) = (1−t)·p₀ + t·(p₁W)          x = C·A⁻¹
//
// so x(0) = p₀ and x(1) = p₁ for ANY quaternion W. W is the weight of the second control point,
// four real numbers where slide 13 had one.
//
// THE FOUR THINGS THIS FILE ESTABLISHES (all pinned in quaternionicBead.test.ts):
//
//  1. THE CURVE IS THE CIRCLE THROUGH THREE POINTS, literally. The bead — the curve point at
//     t = ½, which for real W is exactly (p₀ + λp₁)/(1 + λ), slide 13's bead — determines W in
//     closed form by inverting x(½) = (p₀ + p₁W)(1 + W)⁻¹:
//
//         W  =  (q − p₁)⁻¹ (p₀ − q)
//
//     so the bead is ON the curve by construction, and the curve then passes through p₀, q, p₁ —
//     three points, one circle. Measured: samples lie on that circle to 4e-16.
//
//  2. THE COUNT. W is 4 real numbers, and one direction is FORBIDDEN, not gauge: writing
//     W = w₀ + **w**, the curve lands in ℝ³ (Re(ĀC) ≡ 0) exactly when
//
//         **w** · (p₁ − p₀)  =  0 ,
//
//     the vector part is orthogonal to the leg. That leaves 3, and the bead handle has 3 — the
//     map q ↦ W is a bijection, with no dead direction, because W = (q−p₁)⁻¹(p₀−q) satisfies the
//     constraint automatically ((a×b) ⊥ (a+b)). The remaining scale |W| is the reparametrisation
//     gauge: it slides the bead ALONG the circle and leaves the circle alone. 3 − 1 = 2 = the
//     dimension of the family of circles through two fixed points. Nothing left over.
//
//     THE GAUGE DIRECTION IS THE CURVE ITSELF. In slide 13 that direction was the whole leg,
//     because there the curve WAS the leg.
//
//  3. THE LINE IS THE DEGENERATE CASE, and it has two halves. W real ⟺ the bead sits on the line
//     through p₀p₁ ⟺ the curve is straight. Inside the segment (W > 0) it is the classical
//     positive weight; outside (W < 0) the curve passes through INFINITY at t = 1/(1−W), which is
//     the classical negative weight and the only pole this family has.
//
//  4. NULL AND PH COINCIDE HERE. The covariant Wronskian is Ñ = (1−t)(p₁−p₀)W + t·W̄(p₁−p₀),
//     i.e. Ñ = (1−2t)·Re((p₁−p₀)W) + vec-part, so the SAME condition **w**·(p₁−p₀) = 0 that puts
//     the curve in ℝ³ also kills the t-dependence: Ñ is a nonzero CONSTANT of modulus |p₁−p₀||W|,
//     which is trivially a perfect square. Every degree-1 null column is PH.
//
// AND THE SPHERE-SIDE PUNCHLINE, which is why this belongs after the pencil. conformalLift squares
// the column, so this degree-1 curve is a degree-TWO null curve in ℝ^{4,1} — coefficient rank 3, a
// genuine conic, not a pencil. Slide 13 was one degree short. Degree 1 in the spinor, degree 2 in
// the vector: same circle, and the two representations disagree about its degree because one is the
// square of the other.
// ============================================================================
import {
  type Quat, type Vec3,
  qconj, qmul, qnormSq, qscale, qvec, vquat,
  vadd, vcross, vdot, vnorm, vscale, vsub,
} from './quaternion'
import {
  type Column, type QPoly,
  conformalLift, covariantWronskian, curveAt, orthonormalise, qpMax,
} from './sp11RationalPH'

/** W's vector part carries the bend; its real part is the classical weight. */
export const beadIsReal = (W: Quat, tol = 1e-12): boolean =>
  Math.hypot(W.v, W.p, W.q) <= tol * Math.max(Math.abs(W.u), Math.hypot(W.v, W.p, W.q), 1e-30)

/**
 * The quaternion weight that puts the bead at q: W = (q − p₁)⁻¹(p₀ − q), from inverting
 * x(½) = (p₀ + p₁W)(1 + W)⁻¹. Null by construction — see the header, point 2. Returns null only
 * when q coincides with p₁, where the weight runs off to infinity.
 */
export function beadWeight(p0: Vec3, p1: Vec3, q: Vec3): Quat | null {
  const a = vquat(vsub(q, p1))
  const b = vquat(vsub(p0, q))
  const n = qnormSq(a)
  if (n < 1e-18) return null
  return qmul(qscale(qconj(a), 1 / n), b)
}

/** The degree-1 column A = (1−t) + tW, C = (1−t)p₀ + t(p₁W), gauge-fixed by A₀ = 1. */
export function beadColumn(p0: Vec3, p1: Vec3, W: Quat): Column {
  const c1 = qmul(vquat(p1), W)
  const A: QPoly = [[1, W.u - 1], [0, W.v], [0, W.p], [0, W.q]]
  const C: QPoly = [
    [0, c1.u],
    [p0.x, c1.v - p0.x],
    [p0.y, c1.p - p0.y],
    [p0.z, c1.q - p0.z],
  ]
  return { A, C }
}

/** x(t) = C·A⁻¹, or null at the pole (and null too if W breaks the null condition). */
export const beadCurveAt = (U: Column, t: number): Vec3 | null => curveAt(U, t)

/**
 * **w**·(p₁−p₀)/(|W||p₁−p₀|) — zero exactly when the column represents a curve in ℝ³.
 * This is the ONE forbidden direction of the four; it is not gauge, it leaves ℝ³ altogether.
 */
export function beadNullDefect(p0: Vec3, p1: Vec3, W: Quat): number {
  const leg = vsub(p1, p0)
  const scale = vnorm(leg) * Math.sqrt(qnormSq(W))
  return scale < 1e-30 ? 0 : vdot(qvec(W), leg) / scale
}

/**
 * Where on [0,1] the curve comes CLOSEST to infinity, and how close: |A(t)|² is the quadratic
 * (1−t)² + 2t(1−t)w₀ + t²|W|², minimised at t = (1 − w₀)/|W−1|². The residual is that minimum,
 * scaled — reported rather than thresholded, so the figure can clip a far excursion without any
 * threshold deciding whether a pole "counts".
 */
export function beadInfinity(W: Quat): { t: number; residual: number } {
  const d = (W.u - 1) ** 2 + W.v * W.v + W.p * W.p + W.q * W.q       // |W − 1|²
  if (d < 1e-30) return { t: 0.5, residual: 1 }                       // W = 1: |A| ≡ 1
  const t = Math.min(1, Math.max(0, (1 - W.u) / d))
  const a = (1 - t) ** 2 + 2 * t * (1 - t) * W.u + t * t * qnormSq(W)
  return { t, residual: a / Math.max(1, qnormSq(W)) }
}

/**
 * The parameter where the curve passes through infinity, or null when it stays finite. |A(t)| = 0
 * needs 1 + t(W−1) = 0, hence W REAL: only the straight-line members have a pole, and only when the
 * bead lies on the line OUTSIDE the segment (W < 0). The tolerance separates a machine zero from a
 * nonzero minimum — the only kind of threshold this codebase allows.
 */
export function beadPole(W: Quat, tol = 1e-12): number | null {
  const { t, residual } = beadInfinity(W)
  return residual <= tol ? t : null
}

export interface Circle3 {
  readonly centre: Vec3
  readonly radius: number
  /** Unit normal of the circle's plane. */
  readonly normal: Vec3
}

/** The circle through three points, or null when they are collinear (the line case). */
export function circleThrough(a: Vec3, b: Vec3, c: Vec3): Circle3 | null {
  const u = vsub(b, a)
  const v = vsub(c, a)
  const n = vcross(u, v)
  const nn = vdot(n, n)
  const scale = vdot(u, u) * vdot(v, v)
  if (nn <= 1e-24 * Math.max(scale, 1e-30)) return null
  // centre = a + (|u|²(v×n) + |v|²(n×u)) / (2|n|²) — the standard circumcentre in 3-D
  const centre = vadd(
    a,
    vscale(vadd(vscale(vcross(v, n), vdot(u, u)), vscale(vcross(n, u), vdot(v, v))), 1 / (2 * nn)),
  )
  return { centre, radius: vnorm(vsub(a, centre)), normal: vscale(n, 1 / Math.sqrt(nn)) }
}

/** Points of the full circle, closed — what the arc t ∈ [0,1] is a piece of. */
export function circlePolyline(circle: Circle3, samples = 96): Vec3[] {
  const { centre, radius, normal } = circle
  const seed: Vec3 = Math.abs(normal.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
  const e1 = vscale(vcross(normal, seed), 1 / vnorm(vcross(normal, seed)))
  const e2 = vcross(normal, e1)
  return Array.from({ length: samples + 1 }, (_, k) => {
    const a = (2 * Math.PI * k) / samples
    return vadd(centre, vadd(vscale(e1, radius * Math.cos(a)), vscale(e2, radius * Math.sin(a))))
  })
}

/**
 * |Ñ| and how far it moves over t ∈ [0,1]. On the null locus the spread is machine zero: Ñ is
 * constant, so the member is PH with parametric speed |Ñ|/|A|². Off it, Ñ acquires a (1−2t) real
 * part and the constancy dies with the curve's residence in ℝ³ — the same condition, both facts.
 */
export function wronskianSpread(U: Column): { value: number; spread: number } {
  const N = covariantWronskian(U)
  const at = (t: number): number =>
    Math.hypot(...N.map((p) => p.reduce((s, c, i) => s + c * t ** i, 0)))
  const vals = Array.from({ length: 21 }, (_, k) => at(k / 20))
  const value = vals.reduce((s, v) => s + v, 0) / vals.length
  return { value, spread: Math.max(...vals) - Math.min(...vals) }
}

/**
 * The ℝ^{4,1} lift's degree and coefficient rank. Rank 3 at degree 2 says the lift is a genuine
 * CONIC on the null quadric — not the degree-1 pencil of slide 13, which is what the extra degree
 * buys and why a curve of points exists at all here.
 */
export function conformalConic(U: Column): { degree: number; rank: number } {
  const { h11, h12, h22 } = conformalLift(U)
  const rows = [h11, ...h12, h22]
  const scale = Math.max(...rows.map((p) => Math.max(...p.map(Math.abs), 0)), 1e-30)
  let degree = 0
  rows.forEach((p) => p.forEach((c, i) => { if (Math.abs(c) > 1e-12 * scale) degree = Math.max(degree, i) }))
  const coeffs = Array.from({ length: degree + 1 }, (_, k) => rows.map((p) => (p[k] ?? 0) / scale))
  return { degree, rank: orthonormalise(coeffs, 1e-9).length }
}

/** How far the column is from the gauge fix A₀ = 1 — used only to assert the fix in tests. */
export const columnScale = (U: Column): number => qpMax(U.A)
