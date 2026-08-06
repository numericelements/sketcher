// ============================================================================
// Planar PH quintic C¹ Hermite interpolation — the literature's exact scheme.
//
// This is RUNG 1 of the interpolation ladder: the classical, closed-form problem
// that has a KNOWN answer, so it serves as an ORACLE for everything built on top
// (the subset solver in phSubsetInterp.ts, and later the optimizer).
//
// The object. A planar PH curve has hodograph c′ = w², w the complex "generator"
// (preimage). For a QUINTIC c, w is a complex QUADRATIC in Bernstein form
//
//     w(t) = w₀·(1−t)² + 2·w₁·t(1−t) + w₂·t²                                (1)
//
// so c′ = w² is degree 4 and c is degree 5. The Bernstein coefficients of a
// product are  [w·w]_k = Σ_{i+j=k} C(2,i)C(2,j)/C(4,k) · wᵢwⱼ, giving
//
//     [w²]₀ = w₀²,  [w²]₁ = w₀w₁,  [w²]₂ = (2w₁² + w₀w₂)/3,
//     [w²]₃ = w₁w₂, [w²]₄ = w₂²                                             (2)
//
// A quintic Bézier has c′ = 5·Σ Δpₖ·Bₖ⁴, so Δpₖ = [w²]ₖ/5 — the control-point
// LEGS of the curve, read straight off the generator:
//
//     p₁−p₀ = w₀²/5           p₂−p₁ = w₀w₁/5      p₃−p₂ = (2w₁²+w₀w₂)/15
//     p₄−p₃ = w₁w₂/5          p₅−p₄ = w₂²/5                                 (3)
//
// The Hermite problem. Given p₀, d₀ = c′(0), p₅, d₁ = c′(1):
//   * (1) at the ends gives w(0) = w₀ and w(1) = w₂, so d₀ = w₀², d₁ = w₂².
//     Hence w₀ = ±√d₀ and w₂ = ±√d₁. The generator's overall sign is a gauge
//     (w → −w leaves w² fixed), so only the RELATIVE sign matters: 2 cases.
//   * Summing (3) and writing Δp = p₅ − p₀ gives, after ×15,
//
//     2·w₁² + 3(w₀+w₂)·w₁ + (3w₀² + w₀w₂ + 3w₂² − 15·Δp) = 0                (4)
//
//     a complex QUADRATIC in w₁ — two roots.
//
// 2 relative signs × 2 roots = **four** interpolants, which is exactly the
// classical count: "in general four distinct planar PH quintic interpolants to
// given C¹ Hermite data always exist" (Farouki–Neff; see the 2019 survey
// "New developments in theory, algorithms, and applications for PH curves", §21).
//
// Selecting the good one. The survey's eq. (25) gives two closed-form fairness
// measures — the absolute rotation index R = ∫|κ| ds and the elastic energy
// E = ∫κ² ds — and reports R as "a robust, closed-form measure for
// identification of the good solution". Both are provided here; R is the default.
//
// HONESTY NOTE (Law 3). Formulas (2)–(4) are derived here, not copied from the
// paper. They are verified numerically in phQuinticHermite.test.ts against the
// definition (sampled c′ vs w², exact interpolation of the data), and the
// solution COUNT is verified to be the literature's 4. Nothing is tuned.
// ============================================================================
import { type Complex, cadd, cmul, csub, cscale, cnorm, cdiv } from './complex'

// ---------------------------------------------------------------------------
// Complex helpers this module needs beyond core/complex.ts
// ---------------------------------------------------------------------------

/**
 * Both complex square roots of z, as [root, −root]. Uses the numerically stable
 * form (no cancellation when re < 0): r = |z|, then
 *   √z = ( √((r+re)/2),  sign(im)·√((r−re)/2) ).
 */
export function csqrtBoth(z: Complex): [Complex, Complex] {
  const r = cnorm(z)
  if (r === 0) return [{ re: 0, im: 0 }, { re: 0, im: 0 }]
  const a = Math.sqrt(Math.max(0, (r + z.re) / 2))
  const b = Math.sqrt(Math.max(0, (r - z.re) / 2)) * (z.im < 0 ? -1 : 1)
  return [{ re: a, im: b }, { re: -a, im: -b }]
}

/**
 * Both roots of the complex quadratic a·x² + b·x + c = 0 (a ≠ 0). Uses the
 * cancellation-free pairing: take the root with the larger |−b ± √disc|, then
 * get the other from the product of roots (x₁·x₂ = c/a).
 */
export function csolveQuadratic(a: Complex, b: Complex, c: Complex): [Complex, Complex] {
  const disc = csub(cmul(b, b), cscale(cmul(a, c), 4))
  const [s] = csqrtBoth(disc)
  const nb = cscale(b, -1)
  const plus = cadd(nb, s)
  const minus = csub(nb, s)
  const big = cnorm(plus) >= cnorm(minus) ? plus : minus
  const x1 = cdiv(big, cscale(a, 2))
  // x₂ = c/(a·x₁) when x₁ ≠ 0, else fall back to the other branch directly.
  const denom = cmul(a, x1)
  const x2 = cnorm(denom) > 0 ? cdiv(c, denom) : cdiv(cnorm(plus) >= cnorm(minus) ? minus : plus, cscale(a, 2))
  return [x1, x2]
}

// ---------------------------------------------------------------------------
// Generator → curve
// ---------------------------------------------------------------------------

/** The complex quadratic generator of a planar PH quintic, in Bernstein form (1). */
export interface PHQuinticGenerator {
  readonly w0: Complex
  readonly w1: Complex
  readonly w2: Complex
}

/** Evaluate the generator w(t) — Bernstein degree 2, eq. (1). */
export function generatorAt(g: PHQuinticGenerator, t: number): Complex {
  const s = 1 - t
  return cadd(cadd(cscale(g.w0, s * s), cscale(g.w1, 2 * t * s)), cscale(g.w2, t * t))
}

/** Derivative w′(t) = 2[(w₁−w₀)(1−t) + (w₂−w₁)t]. */
export function generatorDerivAt(g: PHQuinticGenerator, t: number): Complex {
  const s = 1 - t
  return cscale(cadd(cscale(csub(g.w1, g.w0), s), cscale(csub(g.w2, g.w1), t)), 2)
}

/** The five Bernstein coefficients of c′ = w², eq. (2) — degree 4. */
export function hodographCoeffs(g: PHQuinticGenerator): [Complex, Complex, Complex, Complex, Complex] {
  const { w0, w1, w2 } = g
  return [
    cmul(w0, w0),
    cmul(w0, w1),
    cscale(cadd(cscale(cmul(w1, w1), 2), cmul(w0, w2)), 1 / 3),
    cmul(w1, w2),
    cmul(w2, w2),
  ]
}

/** The five control-point legs Δpₖ = [w²]ₖ/5, eq. (3). */
export function controlPointLegs(g: PHQuinticGenerator): Complex[] {
  return hodographCoeffs(g).map((q) => cscale(q, 1 / 5))
}

/** The six Bézier control points p₀..p₅ of the PH quintic with the given start point. */
export function controlPoints(g: PHQuinticGenerator, p0: Complex): Complex[] {
  const cps: Complex[] = [p0]
  let acc = p0
  for (const leg of controlPointLegs(g)) {
    acc = cadd(acc, leg)
    cps.push(acc)
  }
  return cps
}

/** c′(t) = w(t)² — the hodograph, directly from the generator. */
export function hodographAt(g: PHQuinticGenerator, t: number): Complex {
  const w = generatorAt(g, t)
  return cmul(w, w)
}

/** Evaluate the curve c(t) by de Casteljau on its six control points. */
export function curveAt(g: PHQuinticGenerator, p0: Complex, t: number): Complex {
  const pts = controlPoints(g, p0).slice()
  for (let r = 1; r < pts.length; r++) {
    for (let i = 0; i < pts.length - r; i++) {
      pts[i] = cadd(cscale(pts[i], 1 - t), cscale(pts[i + 1], t))
    }
  }
  return pts[0]
}

// ---------------------------------------------------------------------------
// Intrinsic quantities — all exact, none carrying a square root
// ---------------------------------------------------------------------------

/** Parametric speed σ(t) = |w(t)|² — a POLYNOMIAL (this is what PH buys). */
export function speedAt(g: PHQuinticGenerator, t: number): number {
  const w = generatorAt(g, t)
  return w.re * w.re + w.im * w.im
}

/**
 * Signed curvature κ(t) = 2·Im(w̄·w′)/σ² — rational, no radical. Returns 0 at a
 * cusp (σ = 0), where κ genuinely does not exist; callers check `minSpeed` for
 * regularity rather than reading a number here.
 */
export function curvatureAt(g: PHQuinticGenerator, t: number): number {
  const w = generatorAt(g, t)
  const wp = generatorDerivAt(g, t)
  const sigma = w.re * w.re + w.im * w.im
  if (sigma === 0) return 0
  const imConjWtimesWp = w.re * wp.im - w.im * wp.re
  return (2 * imConjWtimesWp) / (sigma * sigma)
}

/**
 * Arc length ∫₀¹ σ dt, EXACT: σ = |w|² is a degree-4 polynomial, so its integral
 * is the mean of its five Bernstein coefficients (∫₀¹ Bₖⁿ = 1/(n+1)).
 */
export function arcLength(g: PHQuinticGenerator): number {
  const c = sigmaBernstein(g)
  let s = 0
  for (const v of c) s += v
  return s / c.length
}

/**
 * The five Bernstein coefficients of σ = |w|² = w·w̄ (degree 4, real). Same
 * product rule as (2) but with a conjugate, so every term is real.
 */
export function sigmaBernstein(g: PHQuinticGenerator): number[] {
  const { w0, w1, w2 } = g
  const dot = (a: Complex, b: Complex): number => a.re * b.re + a.im * b.im
  return [
    dot(w0, w0),
    dot(w0, w1),
    (2 * dot(w1, w1) + dot(w0, w2)) / 3,
    dot(w1, w2),
    dot(w2, w2),
  ]
}

/**
 * σ ≥ min(Bernstein coefficients of σ) — valid, but LOOSE: the coefficients of
 * σ = |w|² can be negative (the middle one is w₁·w₂, an inner product) even
 * though σ ≥ 0 everywhere. So this alone rarely certifies regularity. Kept
 * because it is a genuine bound and the tighter one below falls back to it.
 */
export function speedBernsteinLowerBound(g: PHQuinticGenerator): number {
  return Math.min(...sigmaBernstein(g))
}

/**
 * Signed distance from the ORIGIN to the convex hull of {w₀,w₁,w₂} — positive
 * outside, negative inside. This is the sharp certificate:
 *
 *   w(t) is a Bézier curve with control points w₀,w₁,w₂, so w(t) ∈ hull for all
 *   t ∈ [0,1]. Hence margin > 0  ⟹  w ≠ 0  ⟹  NO CUSP, and moreover
 *   |w(t)| ≥ margin, i.e.  σ ≥ margin².
 *
 * "The curve is regular iff the generator polygon does not enclose the origin"
 * — a convex-hull property statement, not a sampled guess. (Sufficient, not
 * necessary: a hull containing the origin may still carry a regular curve.)
 */
export function generatorHullMargin(g: PHQuinticGenerator): number {
  const v = [g.w0, g.w1, g.w2]
  // Point-to-segment distances (the hull boundary of ≤3 points).
  let minEdge = Infinity
  for (let i = 0; i < 3; i++) {
    const a = v[i]
    const b = v[(i + 1) % 3]
    const dx = b.re - a.re
    const dy = b.im - a.im
    const len2 = dx * dx + dy * dy
    const t = len2 > 0 ? Math.min(1, Math.max(0, -(a.re * dx + a.im * dy) / len2)) : 0
    const px = a.re + t * dx
    const py = a.im + t * dy
    minEdge = Math.min(minEdge, Math.hypot(px, py))
  }
  // Inside test: the origin is inside the triangle iff all three edge cross
  // products share a sign (degenerate/collinear hulls fall through as outside,
  // where minEdge is already the correct distance).
  const cross = (a: Complex, b: Complex): number => (b.re - a.re) * (0 - a.im) - (b.im - a.im) * (0 - a.re)
  const s0 = cross(v[0], v[1])
  const s1 = cross(v[1], v[2])
  const s2 = cross(v[2], v[0])
  const inside = (s0 > 0 && s1 > 0 && s2 > 0) || (s0 < 0 && s1 < 0 && s2 < 0)
  return inside ? -minEdge : minEdge
}

/**
 * The best available lower bound on σ: the hull certificate margin² when the
 * origin is outside the generator polygon, else the (loose) Bernstein bound.
 * Both are valid lower bounds, so the max of them is valid and tighter.
 * > 0 certifies the curve is cusp-free.
 */
export function speedLowerBound(g: PHQuinticGenerator): number {
  const margin = generatorHullMargin(g)
  const bern = speedBernsteinLowerBound(g)
  return margin > 0 ? Math.max(bern, margin * margin) : bern
}

/** Sampled min of σ — the honest complement to the (conservative) bound above. */
export function minSpeedSampled(g: PHQuinticGenerator, samples = 200): number {
  let m = Infinity
  for (let i = 0; i <= samples; i++) m = Math.min(m, speedAt(g, i / samples))
  return m
}

// ---------------------------------------------------------------------------
// The two fairness measures — survey eq. (25)
// ---------------------------------------------------------------------------

/**
 * Absolute rotation index R = ∫|κ| ds = ∫₀¹ |κ(t)|·σ(t) dt. Note ds = σ dt, and
 * κ·σ = 2·Im(w̄w′)/σ, so the integrand needs no square root. Composite Simpson.
 * The survey (§21) reports R as the robust closed-form selector for the "good"
 * one of the four interpolants.
 */
export function absoluteRotationIndex(g: PHQuinticGenerator, samples = 400): number {
  return simpson((t) => Math.abs(curvatureAt(g, t)) * speedAt(g, t), samples)
}

/** Elastic bending energy E = ∫κ² ds = ∫₀¹ κ²·σ dt — survey eq. (25). */
export function elasticEnergy(g: PHQuinticGenerator, samples = 400): number {
  return simpson((t) => {
    const k = curvatureAt(g, t)
    return k * k * speedAt(g, t)
  }, samples)
}

/** Composite Simpson on [0,1] with an even number of intervals. */
function simpson(f: (t: number) => number, n: number): number {
  const m = n % 2 === 0 ? n : n + 1
  const h = 1 / m
  let s = f(0) + f(1)
  for (let i = 1; i < m; i++) s += f(i * h) * (i % 2 === 1 ? 4 : 2)
  return (s * h) / 3
}

// ---------------------------------------------------------------------------
// The Hermite solver (rung 1)
// ---------------------------------------------------------------------------

/** C¹ Hermite data: endpoints and end derivatives of the curve. */
export interface HermiteData {
  readonly p0: Complex
  readonly d0: Complex
  readonly p1: Complex
  readonly d1: Complex
}

/** One of the four interpolants, with its fairness measures already computed. */
export interface PHQuinticSolution {
  readonly generator: PHQuinticGenerator
  readonly controlPoints: Complex[]
  /** Which (relative sign of w₂, quadratic root) branch produced it: 0..3. */
  readonly branch: number
  /** Absolute rotation index R = ∫|κ| ds — survey eq. (25). */
  readonly rotationIndex: number
  /** Elastic bending energy E = ∫κ² ds — survey eq. (25). */
  readonly elasticEnergy: number
  /** Exact arc length ∫σ dt. */
  readonly arcLength: number
  /** Bernstein lower bound on σ; > 0 certifies no cusp. */
  readonly speedLowerBound: number
  /** Sampled min σ — 0 (or near) means a cusp. */
  readonly minSpeed: number
}

/**
 * Solve planar PH quintic C¹ Hermite interpolation. Returns the FOUR solutions
 * of eq. (4) crossed with the relative sign of w₂ — the classical count. Each
 * satisfies the data exactly (up to roundoff); nothing here is approximate.
 *
 * Degenerate data (d₀ = 0 or d₁ = 0) makes w₀ or w₂ vanish; the quadratic (4)
 * still solves, but the resulting curve has a cusp at that end. Such solutions
 * are returned with `speedLowerBound ≤ 0` rather than filtered — the caller
 * decides, and nothing is silently dropped.
 */
export function phQuinticHermite(data: HermiteData): PHQuinticSolution[] {
  const { p0, d0, p1, d1 } = data
  const [r0] = csqrtBoth(d0)
  const [r2a, r2b] = csqrtBoth(d1)
  const dp = csub(p1, p0)

  const out: PHQuinticSolution[] = []
  for (const [signIdx, w2] of [r2a, r2b].entries()) {
    const w0 = r0
    // 2·w₁² + 3(w₀+w₂)·w₁ + (3w₀² + w₀w₂ + 3w₂² − 15Δp) = 0        (4)
    const A: Complex = { re: 2, im: 0 }
    const B = cscale(cadd(w0, w2), 3)
    const C = csub(
      cadd(cadd(cscale(cmul(w0, w0), 3), cmul(w0, w2)), cscale(cmul(w2, w2), 3)),
      cscale(dp, 15),
    )
    const roots = csolveQuadratic(A, B, C)
    for (const [rootIdx, w1] of roots.entries()) {
      const generator: PHQuinticGenerator = { w0, w1, w2 }
      out.push({
        generator,
        controlPoints: controlPoints(generator, p0),
        branch: signIdx * 2 + rootIdx,
        rotationIndex: absoluteRotationIndex(generator),
        elasticEnergy: elasticEnergy(generator),
        arcLength: arcLength(generator),
        speedLowerBound: speedLowerBound(generator),
        minSpeed: minSpeedSampled(generator),
      })
    }
  }
  return out
}

/**
 * Index of the "good" solution among the four: smallest absolute rotation index
 * R, the survey's recommended selector (eq. 25, §21). `criterion: 'elastic'`
 * switches to ∫κ² ds instead. Returns 0 for an empty list.
 */
export function selectGoodSolution(
  solutions: readonly PHQuinticSolution[],
  criterion: 'rotation' | 'elastic' = 'rotation',
): number {
  let best = 0
  let bestVal = Infinity
  for (let i = 0; i < solutions.length; i++) {
    const v = criterion === 'rotation' ? solutions[i].rotationIndex : solutions[i].elasticEnergy
    if (v < bestVal) {
      bestVal = v
      best = i
    }
  }
  return best
}
