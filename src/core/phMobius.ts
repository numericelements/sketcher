// ============================================================================
// MÖBIUS TRANSFORMATIONS OF SPATIAL PH CURVES — and what they do to the generator.
//
// Source: C. Bartoň, B. Jüttler, W. Wang, "Construction of rational curves with
// rational rotation-minimizing frames via Möbius transformations" (2008). Its Theorem 1:
// Möbius transformations COMMUTE with computing the rotation-minimizing frame,
//
//     R_{μ∘x}(u) = d⋆μ_{x(u)} ( R_x(u) )
//
// where d⋆μ is the NORMALIZED differential. Verified numerically here rather than taken
// on trust, because a claim that reaches a slide should be the computer's, not a
// paraphrase of a paper.
//
// THE PIECES, for inversion in the sphere of centre c and radius ρ, writing u = y − c:
//
//     φ(y)      = c + ρ²u/‖u‖²                                      the point map
//     dφ_y(v)   = ρ²(‖u‖²v − 2(v·u)u)/‖u‖⁴                          the differential
//     ‖dφ_y(v)‖ = ρ²‖v‖/‖u‖²                                        conformal: a pure scale
//     d⋆φ_y(v)  = v − 2(v·u)u/‖u‖²                                  the normalized one
//
// That last is a HOUSEHOLDER REFLECTION — the reflection of v in the plane through the
// origin perpendicular to u. So it is an exact isometry at every point, an involution,
// and ORIENTATION-REVERSING (det = −1), which is why a single inversion mirrors a frame's
// handedness. Note it does not depend on ρ at all.
//
// WHY THE IMAGE IS A *RATIONAL PH* CURVE. ‖s′‖ = ρ²σ/‖u‖², and for a polynomial PH curve
// σ = |A|² is a POLYNOMIAL — so the image has rational parametric speed. That is the whole
// construction: polynomial PH + Möbius = rational PH, and by Theorem 1 it keeps a rational
// rotation-minimizing frame.
//
// HOW INVERSION ACTS ON THE GENERATOR — measured, after a wrong first derivation:
//
//     A  ↦  ρ · u · A · j / ‖u‖²
//
// The RIGHT multiplication by j is the orientation reversal, the same det = −1 the
// differential shows: û(A i A*)û = −(ûA) i (ûA)*, and −B i B* = (Bj) i (Bj)* because
// j i j = i. Right-multiplying by k instead is equally valid — j and k differ by a right
// multiplication by i, which is exactly the gauge, and the gauge leaves the sandwich alone.
//
// AND THIS IS THE FACT THAT DECIDES A DESIGN QUESTION. The law factors into two pieces of
// completely different character:
//
//     × j            CONSTANT      harmless, a gauge-like reorientation
//     × u/‖u‖²       t-DEPENDENT   and u = r − c depends on r = ∫A i A*, the INTEGRAL
//
// A constant multiplier is covariant — control points map one for one, which is why
// rotations are easy. A varying one is a B-spline PRODUCT: the degree rises and the
// control-point correspondence is destroyed. So the Hopf/spinor representation is
// affine-covariant but NOT Möbius-covariant, and Farin points of the spinor do not commute
// with Möbius in 3D. In 2D they do, because there Möbius acts by a CONSTANT 2×2 matrix on
// the homogeneous pair (N : D) and the Farin point is a projective sum, which any linear map
// commutes with. The 3D analogue of that is the CONFORMAL model, where Möbius is again
// linear — not the Hopf model.
// ============================================================================
import {
  type Quat,
  type Vec3,
  qmul,
  qscale,
  vadd,
  vdot,
  vnorm,
  vscale,
  vsub,
} from './quaternion'

const QUAT_J: Quat = { u: 0, v: 0, p: 1, q: 0 }

/** An inversion sphere. */
export interface Sphere {
  readonly centre: Vec3
  readonly radius: number
}

const pureOf = (v: Vec3): Quat => ({ u: 0, v: v.x, p: v.y, q: v.z })

/** φ(y) = c + ρ²(y−c)/‖y−c‖². Null at the centre, where inversion is undefined. */
export function invert(y: Vec3, s: Sphere): Vec3 | null {
  const u = vsub(y, s.centre)
  const d = vdot(u, u)
  if (d === 0) return null
  return vadd(s.centre, vscale(u, (s.radius * s.radius) / d))
}

/**
 * The NORMALIZED differential d⋆φ — a Householder reflection, and the map that carries
 * frames (Theorem 1). Independent of the sphere's radius.
 */
export function normalizedDifferential(v: Vec3, y: Vec3, s: Sphere): Vec3 | null {
  const u = vsub(y, s.centre)
  const d = vdot(u, u)
  if (d === 0) return null
  return vsub(v, vscale(u, (2 * vdot(v, u)) / d))
}

/**
 * How inversion acts on a PH generator: A ↦ ρ·u·A·j/‖u‖², with u = y − c.
 *
 * `y` is the CURVE POINT r(t), not merely the generator — and that is the whole finding.
 * The transformed hodograph is not a function of the old hodograph alone; it needs the
 * integral. The signature is deliberately shaped to make that impossible to forget.
 */
export function invertGenerator(A: Quat, y: Vec3, s: Sphere): Quat | null {
  const u = vsub(y, s.centre)
  const d = vdot(u, u)
  if (d === 0) return null
  return qscale(qmul(qmul(pureOf(u), A), QUAT_J), s.radius / d)
}

/** ‖s′‖ = ρ²σ/‖u‖² — rational when σ is a polynomial, which is the point. */
export function imageSpeed(sigma: number, y: Vec3, s: Sphere): number {
  const u = vsub(y, s.centre)
  return (s.radius * s.radius * sigma) / vdot(u, u)
}

/** Carry a frame through the inversion, per Theorem 1. Handedness flips. */
export function transportFrame(
  frame: { readonly e1: Vec3; readonly e2: Vec3; readonly e3: Vec3 },
  y: Vec3,
  s: Sphere,
): { e1: Vec3; e2: Vec3; e3: Vec3 } | null {
  const e1 = normalizedDifferential(frame.e1, y, s)
  const e2 = normalizedDifferential(frame.e2, y, s)
  const e3 = normalizedDifferential(frame.e3, y, s)
  if (!e1 || !e2 || !e3) return null
  return { e1, e2, e3 }
}

/**
 * d⋆μ for ANY conformal point map, read off its Jacobian: since dμ = λR with R
 * orthogonal, dividing by the common column length leaves the rotation (or reflection).
 *
 * Useful for a COMPOSED Möbius transformation, where tracking the inversions
 * individually is bookkeeping — and it is self-checking, because the result comes out
 * orthogonal only if the map really is conformal.
 *
 * Returns the 3×3 matrix as rows.
 */
export function normalizedDifferentialOf(
  map: (y: Vec3) => Vec3 | null,
  y: Vec3,
  h = 1e-6,
): number[][] | null {
  const cols: Vec3[] = []
  for (const axis of [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]) {
    const plus = map(vadd(y, vscale(axis, h)))
    const minus = map(vsub(y, vscale(axis, h)))
    if (!plus || !minus) return null
    cols.push(vscale(vsub(plus, minus), 1 / (2 * h)))
  }
  const scale = vnorm(cols[0])
  if (scale === 0) return null
  const c = cols.map((v) => vscale(v, 1 / scale))
  return [
    [c[0].x, c[1].x, c[2].x],
    [c[0].y, c[1].y, c[2].y],
    [c[0].z, c[1].z, c[2].z],
  ]
}

/** How far a 3×3 matrix is from orthogonal — the conformality check. */
export function orthogonalityDefect(m: readonly (readonly number[])[]): number {
  let worst = 0
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let dot = 0
      for (let k = 0; k < 3; k++) dot += m[k][i] * m[k][j]
      worst = Math.max(worst, Math.abs(dot - (i === j ? 1 : 0)))
    }
  }
  return worst
}

export function determinant3(m: readonly (readonly number[])[]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  )
}
