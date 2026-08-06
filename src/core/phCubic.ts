// ============================================================================
// The planar PH cubic — the minimal object where every PH phenomenon appears.
//
// Every planar PH cubic is a Tschirnhausen cubic. It has a LINEAR complex
// generator w(t) = w₀(1−t) + w₁t, and c′ = w², so c is a cubic:
//
//     ΔP₀ = w₀²/3 ,   ΔP₁ = w₀w₁/3 ,   ΔP₂ = w₁²/3
//
// so the legs are a GEOMETRIC PROGRESSION  q, qr, qr²  with q = w₀²/3 and the
// shape parameter r = w₁/w₀ — equal turning angle between legs, constant length
// ratio. Equivalently ΔP₁² = ΔP₀·ΔP₂: one complex condition, so PH cubics are
// codimension 2 in the 8-real-dimensional space of planar cubics.
//
//     DOF: w₀,w₁ (4 real) + the integration constant c(0) (2 real) = 6 real.
//
// THE UNIFYING FACT (why this file is short). Integrating c′ = w² gives
//
//     c(t) − c(0) = A(t)·w₀² + B(t)·w₀w₁ + C(t)·w₁²                        (1)
//     A(t) = (1−(1−t)³)/3 ,   B(t) = t² − (2/3)t³ ,   C(t) = t³/3
//
// a quadratic form in (w₀,w₁) with REAL coefficients. Substituting w₁ = r·w₀
// factors out w₀², so every square problem on this manifold collapses to ONE
// COMPLEX QUADRATIC IN r, then w₀² by division. Two roots ⇒ two curves (the
// gauge w → −w leaves both q and r fixed, so it does not merge them):
//
//   * pin both ends, drag P₁       →   r² + r + (1 − D/q) = 0
//   * interpolate three points     →   (3C₁−k)r² + (3B₁−k)r + (3A₁−k) = 0
//   * G¹ Hermite (two angles)      →   a REAL quadratic in |r| (see below)
//
// TWO FACTS THAT DRIVE THE REST
//
// (a) NO INFLECTION, EVER. With w = w₀ + tδ and δ = w₁−w₀, w′ = δ, so
//     w̄w′ = w̄₀δ + t|δ|² and the t-term is real. Hence
//
//         Im(w̄w′) = Im(w̄₀w₁)  is CONSTANT
//
//     and κ = 2·Im(w̄w′)/σ² never changes sign. A planar PH cubic cannot
//     inflect. This is *why* G¹ data needing an inflection has no PH cubic
//     interpolant, and why the field moved to quintics (where w is quadratic, so
//     Im(w̄w′) is non-constant). It is also the inflection numerator f of the
//     curvature machinery, degenerating to a constant.
//
// (b) CUSPS. w(t) = w₀[(1−t) + rt] vanishes at t* = 1/(1−r), which lies in [0,1]
//     iff r is REAL and ≤ 0. So the cusp locus is a condition on r alone.
//
// Everything here is closed form. There is no optimizer in this file.
// ============================================================================
import { type Complex, cadd, cmul, csub, cscale, cnorm, cdiv } from './complex'
import { csqrtBoth, csolveQuadratic } from './phQuinticHermite'

/** The linear complex generator of a planar PH cubic. */
export interface PHCubicGenerator {
  readonly w0: Complex
  readonly w1: Complex
}

const ZERO: Complex = { re: 0, im: 0 }
const ONE: Complex = { re: 1, im: 0 }

// ---------------------------------------------------------------------------
// Generator → curve
// ---------------------------------------------------------------------------

/** w(t) = w₀(1−t) + w₁t. */
export function generatorAt(g: PHCubicGenerator, t: number): Complex {
  return cadd(cscale(g.w0, 1 - t), cscale(g.w1, t))
}

/** c′(t) = w(t)². */
export function hodographAt(g: PHCubicGenerator, t: number): Complex {
  const w = generatorAt(g, t)
  return cmul(w, w)
}

/** The three legs ΔP₀, ΔP₁, ΔP₂ = (w₀², w₀w₁, w₁²)/3 — a geometric progression. */
export function legs(g: PHCubicGenerator): [Complex, Complex, Complex] {
  return [
    cscale(cmul(g.w0, g.w0), 1 / 3),
    cscale(cmul(g.w0, g.w1), 1 / 3),
    cscale(cmul(g.w1, g.w1), 1 / 3),
  ]
}

/** The four Bézier control points. */
export function controlPoints(g: PHCubicGenerator, p0: Complex): Complex[] {
  const out = [p0]
  let acc = p0
  for (const leg of legs(g)) {
    acc = cadd(acc, leg)
    out.push(acc)
  }
  return out
}

/** The shape parameter r = w₁/w₀ (the geometric progression's ratio). */
export function shapeRatio(g: PHCubicGenerator): Complex {
  return cdiv(g.w1, g.w0)
}

/** The real coefficients A(t), B(t), C(t) of the integral form (1). */
export function integralBasis(t: number): [number, number, number] {
  const s = 1 - t
  return [(1 - s * s * s) / 3, t * t - (2 / 3) * t * t * t, (t * t * t) / 3]
}

/** c(t) via the closed form (1) — exact, no de Casteljau. */
export function curveAt(g: PHCubicGenerator, p0: Complex, t: number): Complex {
  const [A, B, C] = integralBasis(t)
  return cadd(
    p0,
    cadd(
      cadd(cscale(cmul(g.w0, g.w0), A), cscale(cmul(g.w0, g.w1), B)),
      cscale(cmul(g.w1, g.w1), C),
    ),
  )
}

// ---------------------------------------------------------------------------
// Intrinsic quantities
// ---------------------------------------------------------------------------

/** Parametric speed σ(t) = |w(t)|² — a quadratic polynomial. */
export function speedAt(g: PHCubicGenerator, t: number): number {
  const w = generatorAt(g, t)
  return w.re * w.re + w.im * w.im
}

/** The three Bernstein coefficients of σ = |w|² (degree 2, real). */
export function sigmaBernstein(g: PHCubicGenerator): [number, number, number] {
  const dot = (a: Complex, b: Complex): number => a.re * b.re + a.im * b.im
  return [dot(g.w0, g.w0), dot(g.w0, g.w1), dot(g.w1, g.w1)]
}

/**
 * The inflection quantity Im(w̄w′), which for a CUBIC is the constant Im(w̄₀w₁)
 * — see fact (a) in the header. Its sign is the sign of κ everywhere; zero means
 * a straight line.
 */
export function inflectionQuantity(g: PHCubicGenerator): number {
  return g.w0.re * g.w1.im - g.w0.im * g.w1.re
}

/** Signed curvature κ(t) = 2·Im(w̄w′)/σ² — constant sign, by (a). */
export function curvatureAt(g: PHCubicGenerator, t: number): number {
  const sigma = speedAt(g, t)
  if (sigma === 0) return 0
  return (2 * inflectionQuantity(g)) / (sigma * sigma)
}

/** Exact arc length ∫₀¹ σ dt = (σ₀ + σ₁ + σ₂)/3 (mean of the Bernstein coefficients). */
export function arcLength(g: PHCubicGenerator): number {
  const c = sigmaBernstein(g)
  return (c[0] + c[1] + c[2]) / 3
}

/**
 * Signed distance from the origin to the generator's convex hull — here the
 * SEGMENT [w₀, w₁]. Positive always (a segment has no interior), and
 *
 *     margin > 0  ⟹  w ≠ 0 on [0,1]  ⟹  NO CUSP,  and σ ≥ margin².
 *
 * Zero exactly when the segment passes through the origin, i.e. at a cusp.
 */
export function generatorHullMargin(g: PHCubicGenerator): number {
  const dx = g.w1.re - g.w0.re
  const dy = g.w1.im - g.w0.im
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.min(1, Math.max(0, -(g.w0.re * dx + g.w0.im * dy) / len2)) : 0
  return Math.hypot(g.w0.re + t * dx, g.w0.im + t * dy)
}

/** Best lower bound on σ: margin² (the hull certificate) vs the Bernstein minimum. */
export function speedLowerBound(g: PHCubicGenerator): number {
  const m = generatorHullMargin(g)
  return Math.max(Math.min(...sigmaBernstein(g)), m * m)
}

// ---------------------------------------------------------------------------
// Cusps — a condition on r alone (fact (b))
// ---------------------------------------------------------------------------

/** Tolerance for "r is real". Machine-scale only; it never reshapes a result. */
const REAL_TOL = 1e-12

/**
 * Is the shape ratio r cusped? w vanishes at t* = 1/(1−r), which is in [0,1]
 * exactly when r is real and ≤ 0. Returns the cusp parameter too.
 */
export function cuspOfRatio(r: Complex): { cusped: boolean; t: number | null } {
  const isReal = Math.abs(r.im) <= REAL_TOL * Math.max(1, cnorm(r))
  if (!isReal || r.re > 0) return { cusped: false, t: null }
  const t = 1 / (1 - r.re)
  return { cusped: true, t }
}

// ---------------------------------------------------------------------------
// A solution, with its diagnostics
// ---------------------------------------------------------------------------

export interface PHCubicSolution {
  readonly generator: PHCubicGenerator
  readonly p0: Complex
  readonly controlPoints: Complex[]
  /** The shape parameter r = w₁/w₀. */
  readonly r: Complex
  /** Cusped (r real ≤ 0), and where. */
  readonly cusped: boolean
  readonly cuspT: number | null
  /** > 0 certifies cusp-free (the hull certificate). */
  readonly speedLowerBound: number
  readonly arcLength: number
  /** Constant Im(w̄₀w₁): the sign of κ; 0 ⇒ a straight line. */
  readonly inflectionQuantity: number
}

/** Assemble a solution from (r, w₀², origin) — the form every solver produces. */
function solutionFrom(rr: Complex, w0sq: Complex, p0: Complex): PHCubicSolution {
  const [w0] = csqrtBoth(w0sq)
  const w1 = cmul(rr, w0)
  const generator: PHCubicGenerator = { w0, w1 }
  const { cusped, t } = cuspOfRatio(rr)
  return {
    generator,
    p0,
    controlPoints: controlPoints(generator, p0),
    r: rr,
    cusped,
    cuspT: t,
    speedLowerBound: speedLowerBound(generator),
    arcLength: arcLength(generator),
    inflectionQuantity: inflectionQuantity(generator),
  }
}

// ---------------------------------------------------------------------------
// Problem 1 — pin both ends, prescribe P₁
// ---------------------------------------------------------------------------

/**
 * Pin P₀ and P₃, place P₁ anywhere: q = P₁ − P₀ is prescribed, and closure
 * q(1 + r + r²) = D (with D = P₃ − P₀) gives
 *
 *     r² + r + (1 − D/q) = 0        ⇒  r = ( −1 ± √(4D/q − 3) ) / 2
 *
 * TWO solutions, always (over ℂ). P₂ = P₁ + q·r then follows. Returns [] only
 * for the degenerate q = 0 (P₁ on top of P₀).
 */
export function phCubicFromP1(p0: Complex, p3: Complex, p1: Complex): PHCubicSolution[] {
  const q = csub(p1, p0)
  if (cnorm(q) === 0) return []
  const D = csub(p3, p0)
  const roots = csolveQuadratic(ONE, ONE, csub(ONE, cdiv(D, q)))
  // w₀² = 3q, directly from ΔP₀ = w₀²/3 = q.
  const w0sq = cscale(q, 3)
  return roots.map((r) => solutionFrom(r, w0sq, p0))
}

/**
 * The branch point of `phCubicFromP1`: where 4D/q = 3, i.e. the two solutions
 * merge at the double root r = −1/2. A SINGLE point of the plane,
 *
 *     P₁ = P₀ + (4/3)·(P₃ − P₀)
 *
 * so the branch structure is a two-sheeted cover of the P₁-plane branched at one
 * point — encircling it exchanges the sheets (monodromy).
 */
export function discriminantPoint(p0: Complex, p3: Complex): Complex {
  return cadd(p0, cscale(csub(p3, p0), 4 / 3))
}

/**
 * The segment of the P₁-plane on which BOTH branches are cusped: from P₃ to the
 * discriminant point P₀ + (4/3)D along the chord.
 *
 * Derivation: both roots are real and ≤ 0 iff s = D/q is real with 3/4 ≤ s < 1
 * (sum of roots = −1, product = 1 − s). Then q = D/s with 1/s ∈ (1, 4/3].
 * Off that segment at least one branch is regular.
 */
export function cuspForcedSegment(p0: Complex, p3: Complex): { from: Complex; to: Complex } {
  const D = csub(p3, p0)
  return { from: cadd(p0, D), to: cadd(p0, cscale(D, 4 / 3)) }
}

/**
 * Follow ONE branch continuously along a path of P₁ positions — the path-lifting
 * that a drag performs. At each step the root nearest the previous one is kept,
 * so a loop that encircles `discriminantPoint` returns the OTHER branch.
 * Returns one solution per path point (null where q = 0).
 */
export function liftBranchAlongPath(
  p0: Complex,
  p3: Complex,
  path: readonly Complex[],
  startBranch = 0,
): (PHCubicSolution | null)[] {
  let previousR: Complex | null = null
  return path.map((p1, i) => {
    const sols = phCubicFromP1(p0, p3, p1)
    if (sols.length === 0) return null
    if (i === 0 || previousR === null) {
      const chosen = sols[Math.min(startBranch, sols.length - 1)]
      previousR = chosen.r
      return chosen
    }
    const prev = previousR
    let best = sols[0]
    let bestD = Infinity
    for (const s of sols) {
      const d = cnorm(csub(s.r, prev))
      if (d < bestD) {
        bestD = d
        best = s
      }
    }
    previousR = best.r
    return best
  })
}

// ---------------------------------------------------------------------------
// Problem 2 — interpolate three points
// ---------------------------------------------------------------------------

/**
 * A planar PH cubic through Q₀ at t=0, Q₁ at t=t₁, Q₂ at t=1.
 *
 * Dimension check: 6 real DOF, 6 real conditions — SQUARE. So this is the PH
 * analogue of the quadratic Bézier (also 6 DOF, also 3 points) — except that the
 * equations are quadratic rather than linear, so there are TWO solutions instead
 * of one. That is the whole price of PH, in one comparison.
 *
 * Method (closed form): c(0) = Q₀ fixes the origin. With w₁ = r·w₀ the form (1)
 * factors as w₀²·(A + B·r + C·r²), so dividing the t₁ equation by the t=1
 * equation (whose coefficients are all 1/3) eliminates w₀² and leaves
 *
 *     (3C₁ − k)·r² + (3B₁ − k)·r + (3A₁ − k) = 0 ,      k = (Q₁−Q₀)/(Q₂−Q₀)
 *
 * one complex quadratic. Then w₀² = 3(Q₂−Q₀)/(1 + r + r²).
 */
export function phCubicThroughThreePoints(
  q0: Complex,
  q1: Complex,
  q2: Complex,
  t1 = 0.5,
): PHCubicSolution[] {
  const D2 = csub(q2, q0)
  const D1 = csub(q1, q0)
  if (cnorm(D2) === 0) return []
  const k = cdiv(D1, D2)
  const [A1, B1, C1] = integralBasis(t1)
  const a = csub(cscale(ONE, 3 * C1), k)
  const b = csub(cscale(ONE, 3 * B1), k)
  const c = csub(cscale(ONE, 3 * A1), k)

  const roots: Complex[] =
    cnorm(a) > 1e-14 * (cnorm(b) + cnorm(c))
      ? [...csolveQuadratic(a, b, c)]
      : cnorm(b) > 0
        ? [cscale(cdiv(c, b), -1)] // degenerate: the quadratic collapsed to linear
        : []

  const out: PHCubicSolution[] = []
  for (const r of roots) {
    const denom = cadd(cadd(ONE, r), cmul(r, r)) // 1 + r + r²
    if (cnorm(denom) === 0) continue
    out.push(solutionFrom(r, cdiv(cscale(D2, 3), denom), q0))
  }
  return out
}

// ---------------------------------------------------------------------------
// Problem 3 — G¹ Hermite (two angles), where existence can FAIL
// ---------------------------------------------------------------------------

/**
 * G¹ Hermite data reduced to similarity invariants: the two end tangent angles
 * measured from the chord P₀→P₃.
 */
export interface G1Angles {
  readonly theta0: number
  readonly theta1: number
}

/**
 * The real quadratic whose POSITIVE roots are the G¹ Hermite solutions:
 *
 *     sin θ₀  +  ρ·sin((θ₀+θ₁)/2)  +  ρ²·sin θ₁  =  0
 *
 * (Bartoň–Jüttler–Wang's "single quadratic equation".) Derivation: arg q = θ₀ and
 * arg q + 2·arg r = θ₁ fix arg r = (θ₁−θ₀)/2 =: φ, so r = ρ·e^{iφ} with ρ > 0 the
 * only unknown; closure's modulus merely defines |q|, and its argument is the
 * equation above.
 *
 * THIS is where existence fails, and it fails because ρ must be REAL and
 * POSITIVE — not because a generator is complex. Returned as [a, b, c] for
 * a·ρ² + b·ρ + c.
 */
export function g1Quadratic({ theta0, theta1 }: G1Angles): [number, number, number] {
  return [Math.sin(theta1), Math.sin((theta0 + theta1) / 2), Math.sin(theta0)]
}

/** The positive roots of `g1Quadratic` — the admissible |r| values. */
export function g1PositiveRoots(angles: G1Angles): number[] {
  const [a, b, c] = g1Quadratic(angles)
  const out: number[] = []
  if (Math.abs(a) < 1e-14) {
    if (Math.abs(b) > 1e-14) out.push(-c / b)
  } else {
    const disc = b * b - 4 * a * c
    if (disc >= 0) {
      const s = Math.sqrt(disc)
      out.push((-b + s) / (2 * a), (-b - s) / (2 * a))
    }
  }
  return out.filter((rho) => rho > 1e-12)
}

/**
 * Solve G¹ Hermite interpolation by a planar PH cubic. Returns one solution per
 * positive root — possibly NONE.
 *
 * The existence rule, from the signs of a = sin θ₁ and c = sin θ₀:
 *
 *   * OPPOSITE signs — tangents on opposite sides of the chord, i.e. arc-like
 *     data. Then c/a < 0, the roots straddle zero, and there is exactly ONE
 *     positive root. ALWAYS SOLVABLE. (Symmetric data θ₀ = −θ₁ gives ρ = 1.)
 *
 *   * SAME signs — both tangents on the same side, i.e. data that demands an
 *     inflection. For angles in the meaningful range (both in (0,π), or both in
 *     (−π,0)) the MEAN angle lies in that same interval, so b shares the sign of
 *     a and c: all three coefficients agree in sign, and a quadratic with
 *     same-sign coefficients has NO positive root. **NEVER SOLVABLE** — not
 *     "sometimes", never. Measured 0/1152 over the sampled square, and the sign
 *     argument proves it.
 *
 * The geometric reason is fact (a): a PH cubic CANNOT inflect, and same-side data
 * requires an inflection. So the correspondence is exact — never solvable, for a
 * shape reason. Non-existence is a SHAPE obstruction wearing algebraic clothing;
 * the positivity constraint on a magnitude is where the geometry surfaces as
 * arithmetic. Refinement (shorter steps ⇒ locally arc-like data) is what pushes
 * data into the always-solvable case, which is why the literature's cubic schemes
 * are all local/biarc.
 */
export function phCubicG1Hermite(p0: Complex, p3: Complex, angles: G1Angles): PHCubicSolution[] {
  const D = csub(p3, p0)
  if (cnorm(D) === 0) return []
  const chord = Math.atan2(D.im, D.re)
  const phi = (angles.theta1 - angles.theta0) / 2
  const out: PHCubicSolution[] = []
  for (const rho of g1PositiveRoots(angles)) {
    // r = ρ·e^{iφ}, then q from closure q(1+r+r²) = D, then w₀² = 3q.
    const r: Complex = { re: rho * Math.cos(phi), im: rho * Math.sin(phi) }
    const denom = cadd(cadd(ONE, r), cmul(r, r))
    if (cnorm(denom) === 0) continue
    const q = cdiv(D, denom)
    // Guard: arg q must be θ₀ measured from the chord (the equation's own claim).
    const argErr = Math.abs(
      Math.atan2(Math.sin(Math.atan2(q.im, q.re) - chord - angles.theta0),
                 Math.cos(Math.atan2(q.im, q.re) - chord - angles.theta0)),
    )
    if (argErr > 1e-7) continue
    out.push(solutionFrom(r, cscale(q, 3), p0))
  }
  return out
}

/**
 * The G¹ Hermite data of an existing cubic: the end tangent angles relative to
 * the chord. Inverse of `phCubicG1Hermite`, for round-trip testing.
 */
export function g1AnglesOf(g: PHCubicGenerator, p0: Complex): G1Angles {
  const cps = controlPoints(g, p0)
  const D = csub(cps[3], cps[0])
  const chord = Math.atan2(D.im, D.re)
  const d0 = hodographAt(g, 0)
  const d1 = hodographAt(g, 1)
  const wrap = (x: number): number => Math.atan2(Math.sin(x), Math.cos(x))
  return {
    theta0: wrap(Math.atan2(d0.im, d0.re) - chord),
    theta1: wrap(Math.atan2(d1.im, d1.re) - chord),
  }
}

export { ZERO as COMPLEX_ZERO }
