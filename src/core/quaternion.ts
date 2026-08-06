// ============================================================================
// Quaternion algebra — the spatial analogue of core/complex.ts.
//
// A planar PH curve writes its hodograph as a complex SQUARE, c′ = w². The spatial
// one cannot: a Pythagorean quadruple is not a square in any commutative algebra.
// The right object is the quaternion SANDWICH
//
//     r′ = A i A*
//
// (Farouki–Sakkalis 1994; the spin-representation view is Choi–Lee–Moon 2002), and
// the reason it works is one identity, proved in the test suite:
//
//     |A i A*| = |A|²
//
// so the parametric speed σ = |A|² is a polynomial — which is the whole point.
//
// Naming follows the literature and the existing ph3d lab: A = u + v·i + p·j + q·k.
//
// TWO THINGS THAT DIFFER FROM THE PLANAR CASE, and both matter downstream:
//
//   * THE GAUGE IS CONTINUOUS. In the plane, w and −w give the same w² — a discrete
//     two-fold ambiguity. Here A and A·(cos θ + i sin θ) give the same A i A* for
//     EVERY θ, because that factor commutes with i and is unit: a whole circle of
//     preimages per curve. So a spatial PH curve of generator degree m has
//     4(m+1) + 3 − 1 real degrees of freedom, and the −1 is this gauge.
//
//   * THE PRODUCT DOES NOT COMMUTE, so A i B* is not B i A*. Their SUM is what
//     appears in the middle control-point leg, and it is the polarization of the
//     sandwich — pure, and linear in each argument.
// ============================================================================

/** A = u + v·i + p·j + q·k. */
export interface Quat {
  readonly u: number
  readonly v: number
  readonly p: number
  readonly q: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const QUAT_ONE: Quat = { u: 1, v: 0, p: 0, q: 0 }
/** The axis the sandwich rotates onto: r′ = A i A*. */
export const QUAT_I: Quat = { u: 0, v: 1, p: 0, q: 0 }

export const qadd = (a: Quat, b: Quat): Quat => ({
  u: a.u + b.u, v: a.v + b.v, p: a.p + b.p, q: a.q + b.q,
})
export const qsub = (a: Quat, b: Quat): Quat => ({
  u: a.u - b.u, v: a.v - b.v, p: a.p - b.p, q: a.q - b.q,
})
export const qscale = (a: Quat, k: number): Quat => ({
  u: a.u * k, v: a.v * k, p: a.p * k, q: a.q * k,
})
/** A* — the conjugate. */
export const qconj = (a: Quat): Quat => ({ u: a.u, v: -a.v, p: -a.p, q: -a.q })
export const qnormSq = (a: Quat): number => a.u * a.u + a.v * a.v + a.p * a.p + a.q * a.q
export const qnorm = (a: Quat): number => Math.sqrt(qnormSq(a))

/** Hamilton product. i·j = k, j·k = i, k·i = j — and it does NOT commute. */
export function qmul(a: Quat, b: Quat): Quat {
  return {
    u: a.u * b.u - a.v * b.v - a.p * b.p - a.q * b.q,
    v: a.u * b.v + a.v * b.u + a.p * b.q - a.q * b.p,
    p: a.u * b.p - a.v * b.q + a.p * b.u + a.q * b.v,
    q: a.u * b.q + a.v * b.p - a.p * b.v + a.q * b.u,
  }
}

/** The inverse: A conjugate, divided by |A|². Returns null for the zero quaternion. */
export function qinv(a: Quat): Quat | null {
  const n = qnormSq(a)
  return n === 0 ? null : qscale(qconj(a), 1 / n)
}

/** A pure quaternion as a vector, and back. */
export const qvec = (a: Quat): Vec3 => ({ x: a.v, y: a.p, z: a.q })
export const vquat = (v: Vec3): Quat => ({ u: 0, v: v.x, p: v.y, q: v.z })

export const vadd = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
export const vsub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
export const vscale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
export const vdot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z
export const vnorm = (a: Vec3): number => Math.sqrt(vdot(a, a))
export const vcross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

/**
 * The sandwich A i A*, expanded — always a PURE quaternion, returned as a vector:
 *
 *     x = u² + v² − p² − q²,   y = 2(uq + vp),   z = 2(vq − up)
 *
 * and |A i A*| = |A|² exactly (the identity the whole spatial construction rests
 * on; pinned in the tests).
 */
export function sandwich(a: Quat): Vec3 {
  return {
    x: a.u * a.u + a.v * a.v - a.p * a.p - a.q * a.q,
    y: 2 * (a.u * a.q + a.v * a.p),
    z: 2 * (a.v * a.q - a.u * a.p),
  }
}

/**
 * A i B* + B i A* — the POLARIZATION of the sandwich, which is what the middle
 * control-point legs are made of. Pure (a quaternion equal to minus its own
 * conjugate), symmetric, and linear in each argument. Computed from the product so
 * it is obviously right rather than a second hand-expansion to get wrong.
 */
export function polarSandwich(a: Quat, b: Quat): Vec3 {
  const ab = qmul(qmul(a, QUAT_I), qconj(b))
  const ba = qmul(qmul(b, QUAT_I), qconj(a))
  return qvec(qadd(ab, ba))
}

/**
 * Some A with A i A* = v — inverting the Hopf map, which is only ever possible up
 * to the gauge circle (see the header), so this returns ONE representative.
 *
 * Construction: |A|² = |v|, and the unit part must rotate the x-axis onto v̂. The
 * half-way trick gives that rotation without trigonometry — a 180° turn about
 * h = normalise(x̂ + v̂) carries x̂ to v̂, and a 180° turn about a unit axis is the
 * PURE unit quaternion h itself. The antipodal case v̂ = −x̂ has no half-way vector,
 * and is handled with any perpendicular axis.
 *
 * Returns null for v = 0.
 */
export function quatFromSandwich(v: Vec3): Quat | null {
  const len = vnorm(v)
  if (len === 0) return null
  const n = vscale(v, 1 / len)
  const s = Math.sqrt(len)
  // h = normalise(x̂ + n), as a pure quaternion.
  const hx = 1 + n.x
  const h: Vec3 = { x: hx, y: n.y, z: n.z }
  const hl = vnorm(h)
  if (hl < 1e-12) {
    // v̂ = −x̂: a 180° turn about any axis perpendicular to x̂ works; take ĵ.
    return { u: 0, v: 0, p: s, q: 0 }
  }
  const hu = vscale(h, 1 / hl)
  return { u: 0, v: s * hu.x, p: s * hu.y, q: s * hu.z }
}

/**
 * The gauge action: A ↦ A·(cos θ + i·sin θ), which leaves A i A* fixed because that
 * factor commutes with i and has unit norm. A continuous one-parameter redundancy,
 * unlike the plane's discrete w ↦ −w.
 */
export function gaugeRotate(a: Quat, theta: number): Quat {
  return qmul(a, { u: Math.cos(theta), v: Math.sin(theta), p: 0, q: 0 })
}
