// ============================================================================
// The spatial PH cubic — where finite choice becomes a continuum.
//
// This is slide 4's object one dimension up, and the count is the whole point:
//
//                        DOF   pin both ends   drag one interior point
//   planar PH cubic       6    → 2 left        2 conditions — SQUARE, two branches
//   spatial PH cubic     10    → 4 left        3 conditions — ONE SPARE, a curve
//
// In the plane, pinning the ends leaves exactly one point's worth of freedom, so
// prescribing an interior point is square and there are two discrete answers. In
// space it leaves FOUR, a point costs only three, and one degree of freedom
// survives: P₂ is not determined, it SWEEPS A CURVE of admissible positions. Same
// gesture, and the answer changes from "pick one of two" to "pick a point on a
// curve". That is the deck's central jump, at minimal degree.
//
// (10 = 8 for A₀,A₁ − 1 for the continuous gauge + 3 for the origin. The gauge is
// the difference from the plane: there w ↦ −w is discrete and costs no dimension.)
//
// THE ALGEBRA. A(t) = A₀(1−t) + A₁t, so r′ = A i A* is quadratic and r is a cubic
// with legs read off the Bernstein coefficients of the sandwich:
//
//     ΔP₀ = A₀iA₀*/3 ,   ΔP₁ = (A₀iA₁* + A₁iA₀*)/6 ,   ΔP₂ = A₁iA₁*/3
//
// THE REDUCTION (the spatial echo of the planar r² + r + (1 − D/q) = 0). Substitute
// A₁ = A₀·z — legitimate whenever A₀ ≠ 0 — and every A₀ factors out of the closure
// condition ΔP₀+ΔP₁+ΔP₂ = D:
//
//     i z* + z i + 2 z i z*  =  F ,        F = 6·A₀* E A₀ / |A₀|⁴ ,  E = D − v₁/3
//
// with v₁ = 3(P₁−P₀). Just as r = w₁/w₀ is the planar shape parameter, z = A₀⁻¹A₁
// is the spatial one, and the data enters only through F. Componentwise, using
// z i + i z* = 2z₀i + 2z₃j − 2z₂k (linear!) and the sandwich expansion:
//
//     F.x = 2z₀ + 2(z₀² + z₁² − z₂² − z₃²)
//     F.y = 2z₃ + 4(z₀z₃ + z₁z₂)
//     F.z = −2z₂ + 4(z₁z₃ − z₀z₂)
//
// Three quadratics in four unknowns — hence the curve. Sanity anchor, checked in
// the tests: the straight line is z = 1, F = (4,0,0).
//
// Tracing it is numerical continuation, not a formula: find one solution, then walk
// the null direction of the 3×4 Jacobian (exact, via the 4-D generalised cross
// product of its rows) with a predictor–corrector step. That is honest about what
// the object is — a curve with no closed form — and it is the same machinery the
// spatial QUINTIC's two-parameter family will need.
// ============================================================================
import type { Complex } from './complex'
import { leastSquares, type Matrix } from './linalg'
import { phCubicFromP1 } from './phCubic'
import {
  type Quat,
  type Vec3,
  QUAT_ONE,
  polarSandwich,
  qconj,
  qinv,
  qmul,
  qnormSq,
  quatFromSandwich,
  qvec,
  sandwich,
  vadd,
  vcross,
  vdot,
  vnorm,
  vquat,
  vscale,
  vsub,
} from './quaternion'

/** A spatial PH cubic: a linear quaternion generator plus a start point. */
export interface SpatialPHCubic {
  readonly A0: Quat
  readonly A1: Quat
  readonly p0: Vec3
}

// ---------------------------------------------------------------------------
// Generator → curve
// ---------------------------------------------------------------------------

/** A(t) = A₀(1−t) + A₁t. */
export function generatorAt(c: SpatialPHCubic, t: number): Quat {
  const s = 1 - t
  return {
    u: c.A0.u * s + c.A1.u * t,
    v: c.A0.v * s + c.A1.v * t,
    p: c.A0.p * s + c.A1.p * t,
    q: c.A0.q * s + c.A1.q * t,
  }
}

/** r′(t) = A(t) i A(t)*. */
export const hodographAt = (c: SpatialPHCubic, t: number): Vec3 => sandwich(generatorAt(c, t))

/** σ(t) = |A(t)|² — a polynomial, and equal to |r′(t)|. */
export const speedAt = (c: SpatialPHCubic, t: number): number => qnormSq(generatorAt(c, t))

/** The three legs ΔP₀, ΔP₁, ΔP₂. */
export function legs(A0: Quat, A1: Quat): [Vec3, Vec3, Vec3] {
  return [
    vscale(sandwich(A0), 1 / 3),
    vscale(polarSandwich(A0, A1), 1 / 6),
    vscale(sandwich(A1), 1 / 3),
  ]
}

/** The four Bézier control points. */
export function controlPoints(c: SpatialPHCubic): Vec3[] {
  const out = [c.p0]
  let acc = c.p0
  for (const leg of legs(c.A0, c.A1)) {
    acc = vadd(acc, leg)
    out.push(acc)
  }
  return out
}

/** r(t) by de Casteljau on the control points. */
export function curveAt(c: SpatialPHCubic, t: number): Vec3 {
  let pts = controlPoints(c)
  while (pts.length > 1) {
    const next: Vec3[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(vadd(vscale(pts[i], 1 - t), vscale(pts[i + 1], t)))
    }
    pts = next
  }
  return pts[0]
}

/** Exact arc length ∫₀¹ σ dt — σ is a quadratic, so the mean of its Bernstein coefficients. */
export function arcLength(c: SpatialPHCubic): number {
  const dot = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q
  return (dot(c.A0, c.A0) + dot(c.A0, c.A1) + dot(c.A1, c.A1)) / 3
}

// ---------------------------------------------------------------------------
// The z-reduction
// ---------------------------------------------------------------------------

/** The shape parameter z = A₀⁻¹A₁, the spatial analogue of the planar r = w₁/w₀. */
export function shapeQuat(c: SpatialPHCubic): Quat | null {
  const inv = qinv(c.A0)
  return inv ? qmul(inv, c.A1) : null
}

/** The left-hand side i z* + z i + 2 z i z*, as a vector. */
export function reductionLHS(z: Quat): Vec3 {
  const lin: Vec3 = { x: 2 * z.u, y: 2 * z.q, z: -2 * z.p } // z i + i z*
  return vadd(lin, vscale(sandwich(z), 2))
}

/** The data side F = 6·A₀* E A₀ / |A₀|⁴, with E = D − v₁/3. */
export function reductionRHS(A0: Quat, p0: Vec3, p3: Vec3): Vec3 {
  const v1 = vscale(sandwich(A0), 1) // = 3·ΔP₀, i.e. the prescribed 3(P₁−P₀)
  const D = vsub(p3, p0)
  const E = vsub(D, vscale(v1, 1 / 3))
  const conj = qconj(A0)
  const inner = qmul(qmul(conj, vquat(E)), A0)
  return vscale(qvec(inner), 6 / (qnormSq(A0) * qnormSq(A0)))
}

/**
 * THE FIBER IS ISOMETRIC — every spatial PH cubic through the same P₀, P₁, P₃ has
 * the SAME ARC LENGTH. The curve reshapes, P₂ sweeps an arc wider than the chord,
 * and the length never moves. (Found by measuring while building the figure, then
 * proved; verified to ~1e-16 across random data.)
 *
 * Proof. With A₁ = A₀z, the inner product ⟨A₀,A₁⟩ = Re(A₀z*A₀*) = |A₀|²z₀ and
 * |A₁|² = |A₀|²|z|², so
 *
 *     3L = |A₀|²·(1 + T)        where  T = z₀ + |z|².
 *
 * Now take the squared length of the reduction F = u + w, with u = iz* + zi
 * (components 2z₀, 2z₃, −2z₂) and w = 2·z i z* (so |w| = 2|z|²). The cross term
 * collapses — expanding gives u·(z i z*) = 2z₀|z|² exactly, the z₁z₂z₃ terms
 * cancelling — and everything reorganises into
 *
 *     |F|² + F.x  =  4T² + 2T .
 *
 * The right-hand side depends on the DATA only, so T solves a fixed quadratic and
 * takes at most two values; T ≥ −1/4 always (since z₀ + |z|² ≥ z₀ + z₀²) while the
 * lower root is ≤ −1/2, so the upper root is the only admissible one. Hence T is
 * determined by the data, and so is L. ∎
 *
 * Two consequences worth stating on the slide:
 *   * arc length is USELESS as a selector here — the classical fairness measure
 *     that would distinguish planar interpolants is blind on this family;
 *   * L has a closed form even though the family it describes does not.
 *
 * Since |A₀|² = |3(P₁−P₀)|, the formula reduces to L = |P₁−P₀|·(1 + T).
 * Returns null when the data admits no real T.
 */
export function fiberArcLength(p0: Vec3, p1: Vec3, p3: Vec3): number | null {
  const v1 = vscale(vsub(p1, p0), 3)
  const A0 = quatFromSandwich(v1)
  if (!A0) return null
  const F = reductionRHS(A0, p0, p3)
  const disc = 1 + 4 * (vnorm(F) ** 2 + F.x)
  if (disc < 0) return null
  const T = (-1 + Math.sqrt(disc)) / 4
  return vnorm(vsub(p1, p0)) * (1 + T)
}

/** ∂(reductionLHS)/∂z — an exact 3×4 Jacobian, columns [z.u, z.v, z.p, z.q]. */
export function reductionJacobian(z: Quat): Matrix {
  const { u, v, p, q } = z
  return [
    [2 + 4 * u, 4 * v, -4 * p, -4 * q],
    [4 * q, 4 * p, 4 * v, 2 + 4 * u],
    [-4 * p, 4 * q, -2 - 4 * u, 4 * v],
  ]
}

/**
 * A vector orthogonal to all three rows — the 4-D generalised cross product, whose
 * components are the signed 3×3 minors. Exactly the null direction of the fiber's
 * Jacobian when it has full rank 3, with no SVD needed.
 */
export function nullDirection4(rows: Matrix): number[] {
  const det3 = (m: number[][]): number =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const out: number[] = []
  for (let k = 0; k < 4; k++) {
    const minor = rows.map((r) => r.filter((_, j) => j !== k))
    out.push((k % 2 === 0 ? 1 : -1) * det3(minor))
  }
  return out
}

const asQuat = (a: readonly number[]): Quat => ({ u: a[0], v: a[1], p: a[2], q: a[3] })
const asArray = (z: Quat): number[] => [z.u, z.v, z.p, z.q]

/** One least-norm Newton correction of z back onto reductionLHS(z) = F. */
function correct(z: Quat, F: Vec3, steps = 3): Quat {
  let cur = z
  for (let i = 0; i < steps; i++) {
    const r = vsub(reductionLHS(cur), F)
    if (vnorm(r) < 1e-14) break
    const step = leastSquares(reductionJacobian(cur), [-r.x, -r.y, -r.z], 1e-12)
    cur = asQuat(asArray(cur).map((c, k) => c + step[k]))
  }
  return cur
}

/**
 * Find one z with reductionLHS(z) = F, from a deterministic spread of starts.
 * Returns null if none converges (the caller should treat the data as degenerate
 * rather than pretend).
 */
export function solveReduction(F: Vec3, tolerance = 1e-10): Quat | null {
  const seeds: Quat[] = [
    QUAT_ONE,
    { u: 1, v: 0.3, p: 0.2, q: -0.1 },
    { u: -0.5, v: 0.4, p: -0.3, q: 0.6 },
    { u: 0.2, v: -0.8, p: 0.5, q: 0.1 },
    { u: 0, v: 0, p: 1, q: 0 },
    { u: 0, v: 0, p: 0, q: 1 },
    { u: -1, v: 0.1, p: 0.1, q: 0.1 },
  ]
  for (const seed of seeds) {
    const z = correct(seed, F, 40)
    if (vnorm(vsub(reductionLHS(z), F)) < tolerance) return z
  }
  return null
}

// ---------------------------------------------------------------------------
// The fiber: all spatial PH cubics with the ends pinned and P₁ prescribed
// ---------------------------------------------------------------------------

export interface FiberPoint {
  readonly curve: SpatialPHCubic
  readonly z: Quat
  /** The one control point the data does NOT determine. */
  readonly p2: Vec3
}

/**
 * How far from planar a cubic is: the signed volume spanned by its three legs.
 * Zero exactly when the four control points are coplanar.
 */
export function planarity(c: SpatialPHCubic): number {
  const [a, b, d] = legs(c.A0, c.A1)
  return a.x * (b.y * d.z - b.z * d.y) - a.y * (b.x * d.z - b.z * d.x) + a.z * (b.x * d.y - b.y * d.x)
}

/**
 * The PLANAR members of the family — exactly TWO, in closed form.
 *
 * This is what ties this object to the planar one. A planar PH cubic IS a spatial PH
 * cubic, so the plane problem's two discrete solutions (phCubic, r² + r + (1 − D/q)
 * = 0) must appear somewhere on the spatial one-parameter family. They do, as two
 * isolated points on it — so "finite choice becomes a continuum" is not an analogy:
 * the finite set is EMBEDDED in the continuum, and you can slide onto it.
 *
 * Computed by mapping P₀,P₁,P₃ into their own plane, calling the PLANAR solver, and
 * mapping back — which makes the embedding self-evident rather than inferred. An
 * earlier version hunted sign changes of `planarity` along the traced fiber and was
 * unreliable: continuation need not cover the whole fiber (or every component), so
 * it found one member or two depending on the sample count.
 *
 * Returns [] when P₀, P₁, P₃ are collinear and there is no unique plane.
 */
export function planarMembers(p0: Vec3, p1: Vec3, p3: Vec3): { controlPoints: Vec3[]; p2: Vec3 }[] {
  const a = vsub(p1, p0)
  const b = vsub(p3, p0)
  const n = vcross(a, b)
  if (vnorm(n) < 1e-12) return []
  const ex = vscale(b, 1 / vnorm(b))
  const ez = vscale(n, 1 / vnorm(n))
  const ey = vcross(ez, ex)
  const to2D = (v: Vec3): Complex => {
    const d = vsub(v, p0)
    return { re: vdot(d, ex), im: vdot(d, ey) }
  }
  const to3D = (c: Complex): Vec3 => vadd(p0, vadd(vscale(ex, c.re), vscale(ey, c.im)))

  return phCubicFromP1(to2D(p0), to2D(p3), to2D(p1)).map((sol) => {
    const cps = sol.controlPoints.map(to3D)
    return { controlPoints: cps, p2: cps[2] }
  })
}

export interface FiberOptions {
  /** How many samples to walk around the fiber (default 160). */
  readonly samples?: number
  /** Arc-length step in z-space (default 0.06). */
  readonly step?: number
}

/**
 * Trace the one-parameter family of spatial PH cubics with P₀, P₃ pinned and P₁
 * prescribed — the object slide 6 draws.
 *
 * Predictor–corrector continuation: step along the exact null direction of the 3×4
 * Jacobian, then correct back with a least-norm Newton step. Walks both ways from
 * the seed and stops early if the fiber closes on itself, so a loop is returned once
 * rather than repeatedly.
 *
 * Returns [] when the data is degenerate (P₁ = P₀, so the first leg vanishes and A₀
 * is undefined) or when no solution is found — never a fabricated one.
 */
export function spatialCubicFiber(
  p0: Vec3,
  p1: Vec3,
  p3: Vec3,
  options: FiberOptions = {},
): FiberPoint[] {
  const samples = options.samples ?? 160
  const step = options.step ?? 0.06

  const v1 = vscale(vsub(p1, p0), 3)
  const A0 = quatFromSandwich(v1)
  if (!A0) return []
  const F = reductionRHS(A0, p0, p3)
  const seed = solveReduction(F)
  if (!seed) return []

  const build = (z: Quat): FiberPoint => {
    const curve: SpatialPHCubic = { A0, A1: qmul(A0, z), p0 }
    return { curve, z, p2: controlPoints(curve)[2] }
  }

  const walk = (sign: number): FiberPoint[] => {
    const out: FiberPoint[] = []
    let z = seed
    let prevDir: number[] | null = null
    for (let i = 0; i < samples; i++) {
      const raw = nullDirection4(reductionJacobian(z))
      const len = Math.hypot(...raw)
      if (!(len > 1e-12)) break // the Jacobian lost rank: the fiber is singular here
      let dir = raw.map((c) => (c / len) * sign)
      // Keep walking the same way rather than doubling back.
      if (prevDir) {
        const dot = dir.reduce((s, c, k) => s + c * prevDir![k], 0)
        if (dot < 0) dir = dir.map((c) => -c)
      }
      prevDir = dir
      const predicted = asQuat(asArray(z).map((c, k) => c + step * dir[k]))
      const next = correct(predicted, F)
      if (vnorm(vsub(reductionLHS(next), F)) > 1e-8) break
      z = next
      out.push(build(z))
      // Closed the loop?
      if (i > 8) {
        const d = asArray(z).reduce((s, c, k) => s + (c - asArray(seed)[k]) ** 2, 0)
        if (Math.sqrt(d) < step * 0.9) break
      }
    }
    return out
  }

  const forward = walk(+1)
  // If the fiber closed, one direction already covers it.
  const closed =
    forward.length > 8 &&
    Math.hypot(...asArray(forward[forward.length - 1].z).map((c, k) => c - asArray(seed)[k])) < step * 1.2
  const backward = closed ? [] : walk(-1).reverse()
  return [...backward, build(seed), ...forward]
}
