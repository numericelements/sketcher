// ============================================================================
// RATIONAL PH CURVES BUILT DIRECTLY IN R^{4,1} — any degree — and their editing.
//
// A degree-n curve P(t) = Σ Cₖ Bₖ(t) with Cₖ ∈ R^{4,1}, NULL so that it is a curve of points,
// and PH so that ⟨P′,P′⟩ = h². No polynomial source curve and no Möbius image: the conformal
// lift doubles the degree, so a Möbius image always has EVEN conformal degree, and the odd
// degrees are unreachable by bending anything.
//
// HOW MUCH ROOM. Measured at verified non-planar members: dimension 2n+5, of which 9 are
// Möbius MOTIONS, leaving 2n−4 genuine shape moduli.
//
//     degree      3      5      7          Möbius orbit of a polynomial PH cubic: 13
//     dimension  11     15     19          (degree 6, where the two constructions meet:
//     moduli      2      6     10           direct 17 against 13 — 8 moduli against 4)
//
// Read that table with the PARITY THEOREM in hand (block near the bottom of this file): the ODD
// columns count representations of LOWER-degree curves, because an odd-degree member always
// carries a common linear factor. The honest columns are the even ones.
//
// WHY NOT DEGREE 3, AND THIS IS A RESULT RATHER THAN A LIMITATION. Four coefficients span at
// most a 4-dimensional subspace V of R⁵, so V^⊥ contains a vector S, and ⟨P(x),S⟩ = 0 says
// every point of the curve lies on the single sphere S. Degree 3 is confined to a sphere by
// counting alone — and measured, the span collapses further to rank 3 (σ = 2.2, 1.5, 1.1,
// 6e-9), which meets the null cone in a CIRCLE: out-of-plane 1e-9, curvature spread 0.000.
//
// That happens with the PH conditions REMOVED too, so it is the null condition doing it, not
// PH. The count closes on the reading: dim 13 for null-only degree 3 = 6 for the circle in R³
// plus 7 for the degree-3 rational maps onto it; PH then cuts 13 → 11, so PH does not choose
// the shape at all, only how the circle is traversed. Degree ≥ 4 has no such confinement —
// the coefficients can span all of R⁵ — which is why the figure is degree 5.
//
// WHAT THE CONTROL POINTS ARE, and why nothing five-dimensional need be drawn. A conformal
// vector's five coordinates are exactly weight + centre + radius, because the ∞-component is
// fixed by the null condition. So each Cₖ is a WEIGHTED SPHERE whose centre is the ordinary
// rational-Bézier control point, and the null conditions read as plain geometry:
//
//     ρ₀ = ρₙ = 0                        the ends are POINT-spheres        (b₀, b_{2n})
//     ρ₁ = ‖P₁−P₀‖   ρₙ₋₁ = ‖Pₙ₋₁−Pₙ‖    the outer spheres TOUCH the ends  (b₁, b_{2n−1})
//
// Those two follow from b₁ = ⟨C₀,C₁⟩ and b_{2n−1} = ⟨Cₙ₋₁,Cₙ⟩ at every degree, so only the
// OUTER spheres are determined by the polygon. At degree 3 that is all of them, and drawing
// the spheres adds no handles; from degree 5 on, the MIDDLE radii (C₂ … Cₙ₋₂) are genuine
// freedom that has to be grabbable. That is the real reason to prefer degree 5, beyond having
// more moduli.
//
// At degree 3 the remaining conditions also read geometrically, all verified to 1e-11:
//     w₀w₂·pow(P₀,S₂) = 3w₁²ρ₁²   and mirrored
//     w₀w₃‖P₀−P₃‖² + 9w₁w₂(‖P₁−P₂‖² − ρ₁² − ρ₂²) = 0
//
// WEIGHTS AS FARIN BEADS. Degree n has n legs and, after the overall scale, n weight ratios:
// an exact match, so a bead per leg carries the weights completely.
// Fᵢ = (wᵢPᵢ + wᵢ₊₁Pᵢ₊₁)/(wᵢ + wᵢ₊₁), so every bead at its leg's midpoint means all weights
// equal means POLYNOMIAL, and a bead leaving its segment means that ratio went negative. The
// rationality is visible as how far off-centre the beads sit.
//
// THE SOLVER IS THE USUAL ONE. Hard constraints (null, PH, the pinned ends, the cursor),
// minimum norm for the rest, warm-started. h is kept as n unknowns rather than eliminated;
// its leading power coefficient is pinned to zero by the geometry (see
// conformalPHFamily.test.ts), which makes the Jacobian rank-deficient by one — harmless,
// since the least-squares step is regularised, and cheaper than reparametrising.
//
// AND THE GUARDS ARE THE POINT OF findMember, not decoration. See its comment: the family has
// a large degenerate stratum and an unguarded solve lands on it every time.
// ============================================================================
import { type Vec3, vadd, vcross, vdot, vnorm, vscale, vsub } from './quaternion'
import {
  type Conformal,
  type RationalBezier,
  derivativeCoefficients,
  innerProduct,
  metricApply,
  minDenominator,
  nullCurveResidual,
  phSquareResidual,
  project,
} from './conformal'
import { leastSquares } from './linalg'

/** A rational PH curve in the conformal model: n+1 5-vectors and the speed numerator. */
export interface ConformalPHCurve {
  readonly C: readonly Conformal[]
  /** h, Bernstein coefficients of degree n−1, with ‖p′‖ = h/w. */
  readonly h: readonly number[]
}

export const degreeOf = (s: ConformalPHCurve): number => s.C.length - 1
/** 5(n+1) coefficients plus n for h. */
export const unknownCount = (n: number): number => 5 * (n + 1) + n

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

export const pack = (s: ConformalPHCurve): number[] => [...s.C.flatMap((c) => [...c]), ...s.h]
/** n is recovered from the length, since 5(n+1) + n = 6n + 5. */
export function unpack(x: readonly number[]): ConformalPHCurve {
  const n = (x.length - 5) / 6
  return {
    C: Array.from({ length: n + 1 }, (_, k) => x.slice(5 * k, 5 * k + 5) as unknown as Conformal),
    h: x.slice(5 * (n + 1)),
  }
}

/** The 12 defining conditions: 7 for null, 5 for PH. Zero exactly on the family. */
export function residual(s: ConformalPHCurve): number[] {
  return [...nullCurveResidual(s.C), ...phSquareResidual(s.C, s.h)]
}

/** de Casteljau on the conformal coefficients. */
export function evaluateConformal(C: readonly Conformal[], t: number): Conformal {
  let p = C.map((c) => [...c])
  while (p.length > 1) {
    const next: number[][] = []
    for (let i = 0; i < p.length - 1; i++) next.push(p[i].map((v, k) => (1 - t) * v + t * p[i + 1][k]))
    p = next
  }
  return p[0] as unknown as Conformal
}

const scalarAt = (b: readonly number[], t: number): number => {
  let p = [...b]
  while (p.length > 1) {
    const next: number[] = []
    for (let i = 0; i < p.length - 1; i++) next.push((1 - t) * p[i] + t * p[i + 1])
    p = next
  }
  return p[0]
}

// ---------------------------------------------------------------------------
// Reading the geometry off the coefficients
// ---------------------------------------------------------------------------

/** The weights — the o-components. Also the rational Bézier's weights, unchanged. */
export const weights = (s: ConformalPHCurve): number[] => s.C.map((c) => c[0])

/** The ordinary rational-Bézier control points, which are the spheres' CENTRES. */
export function controlPoints(s: ConformalPHCurve): Vec3[] {
  return s.C.map((c) => project(c) ?? { x: NaN, y: NaN, z: NaN })
}

/**
 * The radii. ⟨C,C⟩ = w²ρ², so ρ = √⟨C,C⟩/|w| — zero at the ends (they are points), and
 * for the interior two equal to the distance to the near endpoint (verified in the tests).
 * Negative ⟨C,C⟩ would mean an imaginary sphere; reported as a negative radius so a caller
 * can show it rather than hide it.
 */
export function radii(s: ConformalPHCurve): number[] {
  return s.C.map((c) => {
    const w = c[0]
    if (w === 0) return NaN
    const q = innerProduct(c, c) / (w * w)
    return q >= 0 ? Math.sqrt(q) : -Math.sqrt(-q)
  })
}

/** Fᵢ = (wᵢPᵢ + wᵢ₊₁Pᵢ₊₁)/(wᵢ + wᵢ₊₁) — one bead per leg, n in all. */
export function farinPoints(s: ConformalPHCurve): Vec3[] {
  const P = controlPoints(s)
  const w = weights(s)
  return Array.from({ length: degreeOf(s) }, (_, i) => {
    const sum = w[i] + w[i + 1]
    if (sum === 0) return { x: NaN, y: NaN, z: NaN }
    return vscale(vadd(vscale(P[i], w[i]), vscale(P[i + 1], w[i + 1])), 1 / sum)
  })
}

/** Where the bead sits along its leg, in [0,1]: 0 at Pᵢ, ½ when the weights are equal. */
export function farinParameters(s: ConformalPHCurve): number[] {
  const w = weights(s)
  return Array.from({ length: degreeOf(s) }, (_, i) => {
    const sum = w[i] + w[i + 1]
    return sum === 0 ? NaN : w[i + 1] / sum
  })
}

export const curveAt = (s: ConformalPHCurve, t: number): Vec3 | null =>
  project(evaluateConformal(s.C, t))

/** ‖p′‖ = h/w — rational, with h of degree n−2 and w of degree n (the (n−2)/n law). */
export function speedAt(s: ConformalPHCurve, t: number): number {
  const w = evaluateConformal(s.C, t)[0]
  return w === 0 ? NaN : scalarAt(s.h, t) / w
}

/** The image's rational Bézier data, for drawing the curve from the same source as the polygon. */
export function rationalBezier(s: ConformalPHCurve): RationalBezier {
  return { points: controlPoints(s), weights: weights(s) }
}

/** min over t of the denominator — positive means the pole is off the curve. */
export const denominatorFloor = (s: ConformalPHCurve): number => minDenominator(rationalBezier(s))

/** ‖p′‖ measured from the CURVE by central difference — so the PH claim can be checked. */
export function measuredSpeed(s: ConformalPHCurve, t: number, step = 1e-5): number {
  const a = curveAt(s, Math.min(1, t + step))
  const b = curveAt(s, Math.max(0, t - step))
  if (!a || !b) return NaN
  return vnorm(vsub(a, b)) / (Math.min(1, t + step) - Math.max(0, t - step))
}

// ---------------------------------------------------------------------------
// The Jacobian of the 12 defining conditions — analytic, since they are quadratic
// ---------------------------------------------------------------------------

export function definingJacobian(s: ConformalPHCurve): number[][] {
  const n = degreeOf(s)
  const NC = 5 * (n + 1)
  const UNKNOWNS = unknownCount(n)
  const D = derivativeCoefficients(s.C)
  const EN = 2 * n + 1
  const J = Array.from({ length: EN + 2 * n - 1 }, () => new Array(UNKNOWNS).fill(0))
  for (let m = 0; m < EN; m++) {
    for (let i = 0; i <= n; i++) {
      const k = m - i
      if (k < 0 || k > n) continue
      const coef = (2 * binom(n, i) * binom(n, k)) / binom(2 * n, m)
      const g = metricApply(s.C[k])
      for (let c = 0; c < 5; c++) J[m][5 * i + c] += coef * g[c]
    }
  }
  for (let m = 0; m <= 2 * n - 2; m++) {
    const row = EN + m
    for (let i = 0; i <= n; i++) {
      for (const [jj, sign] of [[i - 1, 1], [i, -1]] as const) {
        if (jj < 0 || jj > n - 1) continue
        const k = m - jj
        if (k < 0 || k > n - 1) continue
        const v = (binom(n - 1, jj) * binom(n - 1, k)) / binom(2 * n - 2, m)
        const g = metricApply(D[k])
        for (let c = 0; c < 5; c++) J[row][5 * i + c] += 2 * n * sign * v * g[c]
      }
    }
    for (let i = 0; i <= n - 1; i++) {
      const k = m - i
      if (k < 0 || k > n - 1) continue
      J[row][NC + i] += -2 * ((binom(n - 1, i) * binom(n - 1, k)) / binom(2 * n - 2, m)) * s.h[k]
    }
  }
  return J
}

// ---------------------------------------------------------------------------
// Finding a member — GUARDED, because the family has a large degenerate stratum
// ---------------------------------------------------------------------------

export interface MemberGuards {
  /** Smallest interior radius, as a fraction of the chord ‖P₀−Pₙ‖. */
  readonly minRadiusRatio?: number
  /** All weights must exceed this fraction of the largest, and share its sign. */
  readonly minWeightRatio?: number

  /**
   * The curve's extent as a fraction of its chord — SCALE-FREE, deliberately. An absolute
   * span guard is meaningless here because a dilation is itself a Möbius transformation, so
   * the family is closed under it and the seed's accidental size says nothing. Measured sizes
   * ranged over two orders (chord 0.02 to 2.35) among otherwise equally good members.
   */
  readonly minSpanRatio?: number
  /**
   * Worst distance from the plane through three spread curve points, as a fraction of the
   * curve's extent. THE GUARD THAT WAS MISSING, and the one Eric caught: the first version of
   * this module shipped guards for radii, weights, span and the denominator, and none for
   * planarity — so it returned a flat curve, and at degree 3 a circular arc. Zero disables it,
   * which is the honest setting for degree 3, where flatness is forced rather than accidental.
   */
  readonly minOutOfPlane?: number
  /**
   * Spread of curvature across the curve, relative to its maximum. A circle has spread 0, so
   * this is what separates "a genuine spatial curve" from "an arc with a fancy
   * parametrization" — the degree-3 members read 0.000 and every guard above passed them.
   */
  readonly minCurvatureSpread?: number
}

/** κ from central differences — used only to tell a circle from a curve. */
function curvatureAt(s: ConformalPHCurve, t: number, step = 1e-4): number {
  const a = curveAt(s, t - step), b = curveAt(s, t), c = curveAt(s, t + step)
  if (!a || !b || !c) return NaN
  const d1 = vscale(vsub(c, a), 1 / (2 * step))
  const d2 = vscale(vadd(vsub(c, vscale(b, 2)), a), 1 / (step * step))
  const speed = vnorm(d1)
  return speed === 0 ? NaN : vnorm(vcross(d1, d2)) / (speed * speed * speed)
}

/** Worst |curvature spread| and out-of-plane distance, both relative — the shape guards. */
export function shapeMeasures(s: ConformalPHCurve): { outOfPlane: number; curvatureSpread: number } {
  const pts: Vec3[] = []
  for (let k = 0; k <= 40; k++) {
    const p = curveAt(s, k / 40)
    if (!p) return { outOfPlane: 0, curvatureSpread: 0 }
    pts.push(p)
  }
  const extent = Math.max(...pts.map((p) => vnorm(vsub(p, pts[0]))))
  if (!(extent > 0)) return { outOfPlane: 0, curvatureSpread: 0 }
  const normal = vcross(vsub(pts[20], pts[0]), vsub(pts[40], pts[0]))
  const nn = vnorm(normal)
  const outOfPlane = nn > 0
    ? Math.max(...pts.map((p) => Math.abs(vdot(vsub(p, pts[0]), vscale(normal, 1 / nn))))) / extent
    : 0
  const ks = [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => curvatureAt(s, t)).filter(Number.isFinite)
  const top = Math.max(...ks)
  const curvatureSpread = ks.length && top > 0 ? (top - Math.min(...ks)) / top : 0
  return { outOfPlane, curvatureSpread }
}

/**
 * A non-degenerate member of the degree-`degree` family.
 *
 * THE GUARDS ARE THE WHOLE FUNCTION. Measured: unguarded solves from random seeds land on a
 * large degenerate stratum every time — interior radii collapsing to 1e-3, weights going
 * negative, the curve spanning a hundredth of its own polygon. The mechanism is visible in the
 * dictionary: as ρ₁ → 0 the point P₁ falls onto P₀ and the cross condition drags P₀ onto S₂.
 * Same shape of trap as the septic's planar locus, which is why findClassMember there needs
 * its own guard.
 *
 * And two of the guards exist because the first version LACKED them: it checked radii,
 * weights, span and the denominator, passed a curve that was flat to 1e-9 with curvature
 * spread 0.000, and shipped it into a figure. Being feasible is not being useful.
 *
 * Deterministic: the seed sequence is fixed, so a figure gets the same curve every time.
 */
export function findMember(degree = 5, guards: MemberGuards = {}): ConformalPHCurve | null {
  // Every default below is read off a survey of what the solver actually produces at degree 5
  // (see the commit message), not guessed: the first attempt guessed and found nothing in 600
  // seeds. The accepted member has weights 0.52 of the largest, interior radii 0.35–0.90 of the
  // chord, out-of-plane 0.067 and curvature spread 0.33.
  const minRadiusRatio = guards.minRadiusRatio ?? 0.15
  const minWeightRatio = guards.minWeightRatio ?? 0.3
  const minSpanRatio = guards.minSpanRatio ?? 0.5
  // Degree 3 is confined to a circle by the null condition alone, so demanding otherwise
  // there would loop forever. The default asks for a genuinely spatial curve.
  const minOutOfPlane = guards.minOutOfPlane ?? (degree <= 3 ? 0 : 0.05)
  const minCurvatureSpread = guards.minCurvatureSpread ?? (degree <= 3 ? 0 : 0.05)
  const n = degree
  const NC = 5 * (n + 1)
  const U = unknownCount(n)
  for (let seed = 0; seed < 600; seed++) {
    const rnd = (k: number): number => {
      const v = Math.sin(seed * 53.7 + k * 11.3 + n * 7.1) * 43758.5453
      return (v - Math.floor(v)) * 2 - 1
    }
    let x = Array.from({ length: U }, (_, k) =>
      k < NC ? (k % 5 === 0 ? 1 + 0.4 * rnd(k) : 1.4 * rnd(k)) : rnd(k))
    for (let it = 0; it < 600; it++) {
      const r = residual(unpack(x))
      const nr = Math.hypot(...r)
      if (nr < 1e-14) break
      let step: number[]
      try { step = leastSquares(definingJacobian(unpack(x)), r.map((v) => -v), 1e-12) } catch { break }
      let lam = 1, moved = false
      for (let bt = 0; bt < 40; bt++) {
        const trial = x.map((v, i) => v + lam * step[i])
        if (Math.hypot(...residual(unpack(trial))) < nr) { x = trial; moved = true; break }
        lam *= 0.5
      }
      if (!moved) break
    }
    const s = unpack(x)
    if (Math.hypot(...residual(s)) > 1e-11) continue
    const w = weights(s)
    const biggest = Math.max(...w.map(Math.abs))
    if (biggest === 0) continue
    const sign = Math.sign(w[0])
    if (w.some((v) => Math.sign(v) !== sign || Math.abs(v) < minWeightRatio * biggest)) continue
    const P = controlPoints(s)
    if (P.some((p) => !Number.isFinite(p.x))) continue
    const chord = vnorm(vsub(P[n], P[0]))
    if (chord < 1e-6) continue
    const r = radii(s)
    if (r.slice(1, n).some((v) => v < minRadiusRatio * chord)) continue
    let span = 0
    for (let k = 0; k <= 20; k++) {
      const p = curveAt(s, k / 20)
      if (!p) { span = 0; break }
      span = Math.max(span, vnorm(vsub(p, P[0])))
    }
    if (span < minSpanRatio * chord) continue
    if (denominatorFloor(s) <= 0) continue
    const shape = shapeMeasures(s)
    if (shape.outOfPlane < minOutOfPlane) continue
    if (shape.curvatureSpread < minCurvatureSpread) continue
    // Rescale to a chord of 1 so a figure never inherits the seed's accidental size. A
    // dilation is a Möbius transformation, so this stays inside the family by construction.
    return normalize(rescale(s, 1 / chord))
  }
  return null
}

/**
 * Apply the dilation x ↦ λx, which acts on a conformal vector as diag(1, λ, λ, λ, λ²) — a
 * Möbius transformation, so the result is still in the family. ‖p′‖ scales by λ and w does
 * not, so h scales by λ too.
 */
export function rescale(s: ConformalPHCurve, lambda: number): ConformalPHCurve {
  return {
    C: s.C.map((c) => [c[0], lambda * c[1], lambda * c[2], lambda * c[3], lambda * lambda * c[4]] as unknown as Conformal),
    h: s.h.map((v) => lambda * v),
  }
}

/** Fix the projective scale so successive states are comparable: w₀ = 1. */
export function normalize(s: ConformalPHCurve): ConformalPHCurve {
  const w0 = s.C[0][0]
  if (w0 === 0 || !Number.isFinite(w0)) return s
  return {
    C: s.C.map((c) => c.map((v) => v / w0) as unknown as Conformal),
    h: s.h.map((v) => v / w0),
  }
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export interface DragResult {
  readonly state: ConformalPHCurve
  readonly converged: boolean
  /** Worst defining-condition residual — the family membership, measured. */
  readonly defect: number
  readonly trackingError: number
}

interface Extra {
  /** Extra hard conditions beyond the 12, as functions of the state. */
  readonly rows: (s: ConformalPHCurve) => number[]
  readonly track?: (s: ConformalPHCurve) => number
}

/**
 * One constrained Newton step set. The 12 defining conditions and the caller's extra rows
 * are HARD; the remaining freedom is spent by the minimum-norm step, so the rest of the
 * polygon moves as little as the solve can manage.
 *
 * Budget, for a pinned-end drag: 11 dimensions less 6 for the pinned ends less 3 for the
 * cursor leaves 2 spare. Thin on paper — but MEASURED, the cursor is tracked to 1e-16 and
 * the defect falls to 1e-13, so the thinness costs iterations rather than accuracy. The
 * default of 60 comes from that measurement: 20 left the defect at 1e-9 on a step of a
 * tenth of the chord, and 80 converged everywhere tried. `trackingError` is reported anyway,
 * because "the constraint held" is not the test — "the constraint held AND the point went
 * where asked" is.
 */
function solveWith(from: ConformalPHCurve, extra: Extra, iterations: number): DragResult {
  const UNKNOWNS = unknownCount(degreeOf(from))
  const full = (x: readonly number[]): number[] => {
    const s = unpack(x)
    return [...residual(s), ...extra.rows(s)]
  }
  let x = pack(from)
  const E = full(x).length
  for (let it = 0; it < iterations; it++) {
    const r = full(x)
    const nr = Math.hypot(...r)
    if (nr < 1e-13) break
    // the 12 defining rows analytically, the extra rows by central difference
    const base = definingJacobian(unpack(x))
    const J: number[][] = Array.from({ length: E }, (_, e) =>
      e < base.length ? base[e].slice() : new Array(UNKNOWNS).fill(0))
    const h = 1e-7
    for (let c = 0; c < UNKNOWNS; c++) {
      const xp = x.slice(); xp[c] += h
      const xm = x.slice(); xm[c] -= h
      const rp = extra.rows(unpack(xp))
      const rm = extra.rows(unpack(xm))
      for (let e = 0; e < rp.length; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    try { step = leastSquares(J, r.map((v) => -v), 1e-11) } catch { break }
    let lam = 1, moved = false
    for (let bt = 0; bt < 24; bt++) {
      const trial = x.map((v, i) => v + lam * step[i])
      if (Math.hypot(...full(trial)) < nr) { x = trial; moved = true; break }
      lam *= 0.5
    }
    if (!moved) break
  }
  const s = normalize(unpack(x))
  const defect = Math.max(...residual(s).map(Math.abs))
  return {
    state: s,
    converged: defect < 1e-9 && Number.isFinite(defect),
    defect,
    trackingError: extra.track ? extra.track(s) : 0,
  }
}

/**
 * Drag control point `index` — the centre of its sphere, and an ordinary rational-Bézier
 * control point. The two END points are held unless one of them is the handle: without that
 * the minimum-norm step slides the whole curve instead of reshaping it.
 */
export function dragControlPoint(
  from: ConformalPHCurve,
  index: number,
  target: Vec3,
  options: { pinEnds?: boolean; pin?: readonly number[]; iterations?: number } = {},
): DragResult {
  const pinEnds = options.pinEnds ?? true
  const before = controlPoints(from)
  const last = degreeOf(from)
  // `pin` names the control points to hold explicitly, which is what strict mode needs: dragging
  // one of the four outer points of a quartic while the other three stay put. Without it the
  // default is the two ends, which is the free-mode gesture.
  const held = (options.pin ?? (pinEnds ? [0, last] : [])).filter((i) => i !== index)
  return solveWith(from, {
    rows: (s) => {
      const P = controlPoints(s)
      const out = [P[index].x - target.x, P[index].y - target.y, P[index].z - target.z]
      for (const i of held) out.push(P[i].x - before[i].x, P[i].y - before[i].y, P[i].z - before[i].z)
      return out
    },
    track: (s) => vnorm(vsub(controlPoints(s)[index], target)),
  }, options.iterations ?? 60)
}

/**
 * Drag control point `index` when the pinned set leaves it only a CURVE to move on — the quartic's
 * middle point with all four outer points held.
 *
 * PREDICTOR ALONG THE TANGENT, THEN CORRECTOR, and the three failed attempts before it are why.
 * Twelve pinned coordinates plus three cursor coordinates is 15 conditions against a
 * 13-dimensional family, so the cursor cannot be prescribed outright. Two things that do not work:
 *
 *   · Replace the cursor by ONE condition (its component along the drag direction) and the count is
 *     exact, 13 for 13 — but an exactly determined solve has nothing spare to repair the defining
 *     rows with. Measured: it met its target row to 5e-13 with the defining residual at 7e-4, which
 *     is "satisfy what is displayed by abandoning what is enforced". Damping the cursor row turned
 *     the failure the right way round (the point stops short instead of leaving the family) and
 *     still left a defect of 1e-4. Not a member either.
 *
 *   · Aim the middle point at the cursor and project back with the pins as the only extra rows.
 *     That converges beautifully — to where it started. A minimum-norm projection returns to the
 *     NEAREST family point, and an aim direction chosen without regard to the locus is essentially
 *     orthogonal to it, so the whole predictor is undone. Measured motion: 6e-15.
 *
 * What a one-dimensional family needs is its DIRECTION. The wanted ambient motion d (move the
 * middle conformal point at the cursor, everything else still) is projected onto the nullspace of
 * the constraint Jacobian by δ = d − J⁺(J d), and leastSquares IS J⁺, so this costs one extra
 * solve and no new machinery. Stepping along δ stays on the family to first order; the corrector
 * then cleans up the second order with the twelve pins as its only extra rows — a projection with a
 * spare dimension, which is the shape of every drag here that behaves.
 *
 * Where the locus cannot reach the cursor the point stops closer than asked and `trackingError`
 * reports the shortfall, rather than the curve being taken off the family to please the mouse.
 */
export function dragAlongLocus(
  from: ConformalPHCurve,
  index: number,
  target: Vec3,
  options: { pin: readonly number[]; iterations?: number; maxStep?: number } = { pin: [] },
): DragResult {
  const before = controlPoints(from)
  const held = options.pin.filter((i) => i !== index)
  const offset = vsub(target, before[index])
  const reach = vnorm(offset)
  const still: DragResult = {
    state: from, converged: true, defect: Math.max(...residual(from).map(Math.abs)), trackingError: reach,
  }
  if (!(reach > 1e-12)) return { ...still, trackingError: 0 }

  const n = degreeOf(from)
  const U = unknownCount(n)
  const pinRows = (s: ConformalPHCurve): number[] => {
    const P = controlPoints(s)
    return held.flatMap((i) => [P[i].x - before[i].x, P[i].y - before[i].y, P[i].z - before[i].z])
  }
  // The constraint Jacobian: defining rows analytically, pin rows by central difference.
  const x = pack(from)
  const base = definingJacobian(from)
  const J = base.map((r) => r.slice())
  const rowCount = pinRows(from).length
  for (let e = 0; e < rowCount; e++) J.push(new Array(U).fill(0))
  const eps = 1e-7
  for (let c = 0; c < U; c++) {
    const xp = x.slice(); xp[c] += eps
    const xm = x.slice(); xm[c] -= eps
    const rp = pinRows(unpack(xp)), rm = pinRows(unpack(xm))
    for (let e = 0; e < rowCount; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * eps)
  }

  const w = from.C[index][0]
  const dir = vscale(offset, 1 / reach)
  const wanted = new Array(U).fill(0)
  wanted[5 * index + 1] = w * dir.x
  wanted[5 * index + 2] = w * dir.y
  wanted[5 * index + 3] = w * dir.z
  let delta: number[]
  try {
    const Jd = J.map((row) => row.reduce((acc, v, i) => acc + v * wanted[i], 0))
    const correction = leastSquares(J, Jd, 1e-11)
    delta = wanted.map((v, i) => v - correction[i])
  } catch { return still }

  // How far the middle point actually travels per unit of δ: P = C[1..3]/C[0], so
  // δP = (δC[1..3] − P·δC[0]) / w.
  const dw = delta[5 * index]
  const move: Vec3 = {
    x: (delta[5 * index + 1] - before[index].x * dw) / w,
    y: (delta[5 * index + 2] - before[index].y * dw) / w,
    z: (delta[5 * index + 3] - before[index].z * dw) / w,
  }
  // Relative, because "the point cannot move" is a REAL ANSWER here, not a numerical accident:
  // with the quartic's four outer points pinned the whole one-dimensional family is a weight
  // direction and the middle point is stationary (measured: ‖δP‖ = 1e-6 against ‖δ‖ = 1). Without
  // this guard the step scales as travel/rate and asks for a jump of 1e4.
  const rate = vnorm(move)
  if (!(rate > 1e-5 * Math.hypot(...delta))) return still
  const scale = Math.max(...before.map((p, i) => (i === index ? 0 : vnorm(vsub(p, before[index])))), 1e-9)
  const travel = Math.min(reach, (options.maxStep ?? 0.06) * scale)
  const s = (travel / rate) * Math.sign(vdot(move, dir) || 1)
  const predicted = unpack(x.map((v, i) => v + s * delta[i]))

  return solveWith(predicted, {
    rows: pinRows,
    track: (t) => vnorm(vsub(controlPoints(t)[index], target)),
  }, options.iterations ?? 80)
}

/**
 * Slide the Farin bead on leg `leg` to parameter `s` ∈ (0,1) — a weight edit, imposed as
 * (1−s)·w_{leg+1} − s·w_leg = 0, with the two ENDS held.
 *
 * A first version held ALL the control points, to make it a *pure* weight edit. That works at
 * degree 3 and over-constrains from degree 5 on: holding six centres is 18 conditions against
 * a 15-dimensional family, and the solve simply fails. So the ends are held and the interior
 * centres are allowed to answer — which is the honest arrangement anyway, since the weights and
 * the geometry are coupled by the defining conditions and pretending otherwise would be the
 * same error as freezing a control point to hold a bound.
 */
export function dragFarin(
  from: ConformalPHCurve,
  leg: number,
  s: number,
  options: { iterations?: number; maxStep?: number; range?: [number, number] } = {},
): DragResult {
  const before = controlPoints(from)
  const last = degreeOf(from)
  // TWO limits, both because the first version without them made the curve appear to explode.
  // A weight RATIO near 0 or 1 is a weight near zero, which sends a control point to infinity
  // and swells the curve; and a cursor projected onto a leg can jump most of the way along it
  // in a single event, so an unlimited step asks the solve for a huge reshape at once. The
  // range keeps the ratio sane and maxStep makes a drag a sequence of small warm-started steps,
  // which is what the control-point drags already were and why they felt fine.
  const [lo, hi] = options.range ?? [0.12, 0.88]
  const maxStep = options.maxStep ?? 0.03
  const current = farinParameters(from)[leg]
  const wanted = Math.min(hi, Math.max(lo, s))
  const clamped = Number.isFinite(current)
    ? Math.min(current + maxStep, Math.max(current - maxStep, wanted))
    : wanted
  return solveWith(from, {
    rows: (st) => {
      const w = weights(st)
      const P = controlPoints(st)
      const out = [(1 - clamped) * w[leg + 1] - clamped * w[leg]]
      for (const end of [0, last]) {
        out.push(P[end].x - before[end].x, P[end].y - before[end].y, P[end].z - before[end].z)
      }
      return out
    },
    track: (st) => Math.abs(farinParameters(st)[leg] - clamped),
  }, options.iterations ?? 60)
}

/**
 * Set the radius of sphere `index` — real freedom from degree 5 on, where the MIDDLE spheres
 * are not pinned to an endpoint. Imposed as ⟨Cᵢ,Cᵢ⟩ = (wᵢρ)², one condition, with the two
 * ends held so the curve reshapes rather than slides.
 *
 * Pointless at degree 3 and at the outer spheres of any degree, where ρ is determined by the
 * polygon (ρ₁ = ‖P₁−P₀‖); a caller should not offer the handle there.
 */
export function dragRadius(
  from: ConformalPHCurve,
  index: number,
  radius: number,
  options: { iterations?: number } = {},
): DragResult {
  const before = controlPoints(from)
  const last = degreeOf(from)
  const want = Math.max(1e-4, radius)
  return solveWith(from, {
    rows: (s) => {
      const w = weights(s)[index]
      const out = [innerProduct(s.C[index], s.C[index]) - w * w * want * want]
      for (const end of [0, last]) {
        out.push(
          controlPoints(s)[end].x - before[end].x,
          controlPoints(s)[end].y - before[end].y,
          controlPoints(s)[end].z - before[end].z,
        )
      }
      return out
    },
    track: (s) => Math.abs(radii(s)[index] - want),
  }, options.iterations ?? 60)
}

/** Which spheres carry FREE radii: the middle ones. Empty at degree 3. */
export function freeRadiusIndices(s: ConformalPHCurve): number[] {
  const n = degreeOf(s)
  return Array.from({ length: Math.max(0, n - 3) }, (_, i) => i + 2)
}

/**
 * A Möbius transformation of the whole curve — and the reason this representation was worth
 * the extra coordinate.
 *
 * M is a constant 5×5 matrix, so it acts on each conformal control point INDEPENDENTLY:
 * Cₖ ↦ M Cₖ. Nothing is recomputed and no degree rises. Measured (see the tests):
 *
 *   · the image is still in the family, to 5e-13 — with h COMPLETELY UNTOUCHED, because
 *     ⟨P′,P′⟩ = h² and M preserves the inner product. So the speed NUMERATOR is a Möbius
 *     invariant, and ‖p′‖ = h/w changes only through the weight, which is the conformal factor;
 *   · spheres stay spheres and the ends stay point-spheres;
 *   · the Farin beads map to the Farin beads, since Fᵢ = project(Cᵢ + Cᵢ₊₁) and M is linear;
 *   · the image curve is μ∘(the original curve), pointwise, to 3e-15.
 *
 * Contrast slide 10, where a Möbius map turned 8 control points into 15 and the polygon had to
 * be rebuilt from the lift: here the control structure maps one for one. In the Hopf/spinor
 * representation it cannot (core/phMobius), which is what sent this work into the conformal
 * model in the first place — and it settles the 3D version of Eric's Farin question: Farin
 * points DO commute with Möbius transformations, once they are read in the right model.
 */
export function mobiusImage(s: ConformalPHCurve, m: readonly (readonly number[])[]): ConformalPHCurve {
  return {
    C: s.C.map((c) => [0, 1, 2, 3, 4].map((i) =>
      m[i].reduce((acc, mij, j) => acc + mij * c[j], 0)) as unknown as Conformal),
    h: [...s.h],
  }
}

/** Fᵢ = project(Cᵢ + Cᵢ₊₁) — the Farin bead, as one addition in the conformal model. */
export function farinVectors(s: ConformalPHCurve): Conformal[] {
  return Array.from({ length: degreeOf(s) }, (_, i) =>
    (s.C[i] as unknown as number[]).map((v, k) => v + (s.C[i + 1] as unknown as number[])[k]) as unknown as Conformal)
}

// ---------------------------------------------------------------------------
// STRICT MODE — pin the C¹ Hermite data and ride what is left
//
// Pinning r(0), r′(0), r(1), r′(1) is 12 conditions; the degree-5 family has 15, so THREE
// remain. Measured, rank 31 of 32 with a gap of 2.5e8. The polynomial PH quintic of slide 7
// has 14 before its data and 2 after, so RATIONALITY BUYS EXACTLY ONE MORE DIMENSION at the
// same degree and the same data — slide 7's torus becomes a 3-fold.
//
// EXCEPT THAT THE CURVE IS A QUARTIC. See the parity theorem below: a degree-5 member always
// carries a common linear factor, so this whole block is a true statement about the QUARTIC
// family in a quintic polygon, and "the same degree as slide 7" is not what it looks like.
// The same measurement at degree 6 — genuinely irreducible — leaves FIVE dimensions, not three.
// Everything below (the coordinates, the one-at-a-time reformulation, the rate limits) is sound
// and carries over; the DEGREE it is applied at is what has to change.
//
// WHAT COORDINATIZES IT, measured rather than guessed by adding candidate rows and watching the
// rank: {ρ₂, ρ₃, arc length} is complete — rank 34, freedom 0. So are {ρ₂, ρ₃, ⟨C₂,C₃⟩} and
// {L, λ₁, λ₂}. And {ρ₂, ρ₃, λ₁} is NOT: it leaves freedom 1, because λ₁ is dependent on the two
// radii once the data is pinned. The two radii are already handles on the figure, and arc length
// echoes slide 7, where L turns out to depend on one coordinate alone.
//
// ONE COORDINATE AT A TIME, and this is the reformulation that made it work. Prescribing all
// three leaves the system exactly determined with a projective kernel, and Newton then stalls at
// a defect of 1e-6…1e-7 — the coordinates were hit exactly but the defining conditions were not.
// (Pinning w₀ = 1 to remove the kernel made it worse, so that diagnosis was wrong.) Prescribing
// only the coordinate being moved leaves 2 spare dimensions, which is the shape of every drag in
// this codebase that behaves, and the spare directions absorb the arc-length quadrature error
// instead of feeding it into the defining rows.
//
// The cost is that the OTHER two readouts drift while you move one. They are genuinely coupled,
// so that is honest; hiding it would mean displaying one quantity while enforcing another.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// THE BRIDGE TO THE QUATERNION FORM — derived, half-verified, and wanted twice
//
// These curves also have a Hopf/quaternion representation, and finding it connects this module
// to everything on slides 4–8. With p = q/w:
//
//     p′ = N/w²           N = q′w − qw′,  the hodograph NUMERATOR, degree ≤ 2n−2
//     ‖N‖ = h·w           verified to 9.3e-10 — this is the load-bearing identity
//
// CAREFUL WITH THAT STEP, because the first version of this block got it wrong. ‖N‖ = |h·w|, and
// |hw| is a polynomial only if hw never CHANGES SIGN — the pointwise check above ran on [0,1],
// where it cannot. What the defining equations give as an identity is ΣNᵢ² = h²w², and taking a
// square root of that needs the non-negative branch to be polynomial. It is (see the parity
// theorem below: at odd degree hw's real root is DOUBLE), so the conclusion stands — but it
// stands for a reason, not by inspection.
//
// Then, by the classical Pythagorean-quadruple theorem, N = A i A* for a quaternion polynomial A,
// with |A|² = ‖N‖ = hw and
//
//     p′ = A i A* / w²     so W = w EXACTLY: the conformal weight IS the PH denominator
//
// Degrees: |A|² = hw has degree (n−2) + n = 2n−2, so deg A = n−1 — five quaternion coefficients
// at n = 5. Built and verified in core/conformalPHHopf: A i A* reproduces N to 1e-11…1e-12 at
// even degree, with the root selection decisive by 1e7…1e10.
//
// AND THE GAUGE SURVIVES, which is the point. Write A = u + vj with u, v complex. Expanding
// A i A* and separating gives
//
//     |u|² = (‖N‖ + N₁)/2      |v|² = (‖N‖ − N₁)/2      u·v = (iN₂ − N₃)/2
//
// The product u·v is DETERMINED by N; the split between u and v is not, because
// u ↦ u·e^{iθ}, v ↦ v·e^{−iθ} leaves it alone — and that substitution is exactly A ↦ A·e^{iθ},
// the gauge, since e^{iθ} commutes with i and the denominator does not see it. So the phase
// ambiguity in splitting u from v IS the sandwich chain's circle, now in the rational setting.
//
// WHAT THAT PREDICTS, and it is a prediction rather than a measurement: prescribing p′ at each
// end fixes N there, hence u·v there, leaving one phase per end; quotient the single global
// gauge and you get a 2-TORUS — slide 7's torus — plus one direction from the denominator.
// That would make the measured 3 into 2 + 1 and turn the "+1 dimension" result into a sentence:
// rationality adds a radial direction to slide 7's torus. It would also give the figure two
// dials that WRAP instead of three scalars with feasibility walls.
//
// The extraction that was missing is now core/conformalPHHopf. The 2 + 1 split is STILL
// unverified and must not be stated as fact: it has to be measured at degree 6, for the reason
// immediately below.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// THE PARITY THEOREM — ODD CONFORMAL DEGREE IS NEVER GENUINELY ODD
//
// Found while testing the extraction above, and it is the sharper of the two results. The null
// condition is an identity between POLYNOMIALS:
//
//     ⟨C,C⟩ = ‖q‖² − 2·w·c∞ = 0     so     ‖q‖² = 2·w·c∞
//
// At every real root r of w that forces ‖q(r)‖² = 0, and q is REAL, so q(r) = 0 — hence (t−r)
// divides q, w, c∞ and h alike, and the member is (t−r) × a member of degree n−1. A real
// polynomial of odd degree always has a real root, and deg w = n. Therefore
//
//     n odd   →  every member is a degree-(n−1) rational curve in disguise
//     n even  →  w may avoid the real axis, and generically does → genuinely degree n
//
// Measured (conformalPHHopf.test.ts) and the pattern is total: degrees 3, 5, 7 give exactly ONE
// real root of w every time with q vanishing there to 1e-7…1e-8; degree 6 gives NONE, five
// members out of five; degree 4 gives none in three of five and TWO in the other two — reducible
// by two degrees, which is what an even degree allows.
//
// THE DEGREE-3 CIRCLE IS A COROLLARY. A degree-3 member is (t−r) × a degree-2 member, a rational
// quadratic is a conic, and PH makes it a circle. The "WHY NOT DEGREE 3" note at the top of this
// file reached the same fact by counting the span of the coefficients; this says why.
//
// WHAT IT COSTS US. The degree-5 figures (slides 11 and 12) draw a genuine rational PH curve —
// but a QUARTIC one, carried in a quintic polygon whose sixth control point is redundant
// parametrisation. Everything measured on that family (dimension 15, the strict 3-fold, the
// {ρ₂, ρ₃, L} coordinates) is a true statement about a quartic. The dimension table at the top of
// this file is honest at 4 and 6 and describes reducible curves at 3, 5 and 7.
//
// DOES DEGREE 4'S SINGLE DIMENSION WRAP? Best evidence says NO — it is an open arc with two
// ends, not the circle that the polynomial cubic's single angle gives. Stated with its strength,
// because continuation is the weakest kind of evidence and this rests partly on it:
//
//   · MEASURED, on the one member the walker could trace: arc-length continuation along the
//     dial (tangent step, Newton projection back onto the 12 defining rows and the 12 Hermite
//     rows, w₀ = 1 each step) runs away in BOTH directions — 11.7k steps and a path length of
//     5e3 one way, 13.0k steps and 4e4 the other, with max|weight| reaching 3.4e3 and 2.8e4.
//     The two ends are DIFFERENT curves, 1.26 extents apart, so it is not a circle closing
//     through a degenerate seam either.
//
//   · AND THERE IS A MECHANISM, which is what makes the traced result believable. At the far end
//     the sandwich equation is A(1) i A(1)* = w(1)²·d₁ — and w(1) is a FREE POSITIVE SCALE.
//     The polynomial case has no such scale: its endpoint condition is A₂ i A₂* = d_f exactly,
//     whose solution set is a circle, hence compact, hence slide 7's torus. Rationality adds the
//     denominator's endpoint value, and a positive scale is not compact. That is the difference
//     between a dial that wraps and a slider with two walls.
//
//   · AND THE PROJECTIVE ESCAPE HATCH IS CLOSED, which was the obvious objection: weights running
//     to infinity is a statement about the w₀ = 1 CHART, and a parabola escaping to infinity does
//     close up projectively. So the walk was redone on the unit sphere ‖(C,h)‖ = 1, where the whole
//     system is homogeneous and blowing up is impossible by construction. The path still converges
//     to a boundary instead of passing through it: w₀, w₁ and w₄ all go to zero together while w₂
//     takes 0.72 of the norm, the spherical arc length asymptotes near 3.0, and the step size
//     collapses. The middle control point stays bounded throughout (‖P₂‖ ≈ 0.88) and w₂ never
//     changes sign, so it does not pass through ∞ either: its locus is a bounded open arc.
//
//     AND WHAT DEGENERATES IS THE WEIGHTS, NOT THE DRAWN POLYGON — worth saying precisely, because
//     "three control points collapse" invites the obvious objection that four of them are PINNED.
//     They are pinned as 3D positions, which are RATIOS: Cₖ = wₖ·(1, Pₖ, ½(‖Pₖ‖²−ρₖ²)), so the
//     vector can shrink to zero with Pₖ = Cₖ[1..3]/Cₖ[0] fixed the whole way. At the four outer
//     points the radii are forced by the polygon already (ρ₀ = ρ₄ = 0, ρ₁ = ‖P₁−P₀‖,
//     ρ₃ = ‖P₃−P₄‖), so what is free there is EXACTLY their weights — and it is those going to
//     zero relative to w₂. On screen the four points do not move at all; the FARIN BEADS run to
//     the ends of their legs. The curve keeps interpolating P₀ and P₄ throughout, since
//     p(0) = C₀[1..3]/C₀[0] = P₀ for every w₀ ≠ 0; the wall is only the limit, and it is
//     asymptotic — 16000 steps and still crawling towards it.
//
//   · AND THE ONE DIMENSION IS A WEIGHT DIRECTION: THE MIDDLE POINT DOES NOT MOVE. Measured by
//     projecting each of the three "push P₂ this way" ambient directions onto the nullspace of the
//     defining rows plus the four pinned points: all three give the same tangent (as a 1-dimensional
//     family must), and it carries ‖δP₂‖ = 1e-6 against ‖δ‖ = 1 while every WEIGHT moves by 0.1–0.5.
//     So with the four outer control points held there is nowhere for the middle point to go — which
//     is also why the projective walk showed ‖P₂‖ = 0.88 unchanged over 16000 steps, a constancy
//     first misread as mere boundedness.
//
//     That is the sharpest form of the whole point: nail down the ENTIRE 3D control polygon and a
//     one-parameter family of distinct rational PH curves still runs through it, differing only in
//     the weights — visible as the Farin beads sliding, and ending where those weights degenerate.
//
//   · WHAT IS NOT ESTABLISHED: on two of three members the walker could not take a single step —
//     the tangent extraction breaks on the pinned Jacobian's two-plateau spectrum — so this is
//     one traced member plus a mechanism, NOT a theorem. A figure built on it should say
//     "one-parameter family with two ends" and must not say "circle".
//
// SO A GENUINELY SPATIAL, GENUINELY IRREDUCIBLE FIGURE IS DEGREE 6 — which is also the degree
// where working directly in R^{4,1} first beats bending a polynomial (17 dimensions against the
// Möbius orbit's 13). Measured there: pinning the C¹ Hermite data leaves FIVE dimensions, not
// three, with a decisive rank gap.
// ---------------------------------------------------------------------------

/** C¹ Hermite data: the two end points and the two end derivative VECTORS. */
export interface HermiteData {
  readonly p0: Vec3
  readonly p1: Vec3
  readonly d0: Vec3
  readonly d1: Vec3
}

/** r′(0) = n(w₁/w₀)(P₁−P₀) — note it depends on the WEIGHTS, unlike the polynomial case. */
export function hermiteDataOf(s: ConformalPHCurve): HermiteData {
  const n = degreeOf(s)
  const P = controlPoints(s)
  const w = weights(s)
  return {
    p0: P[0],
    p1: P[n],
    d0: vscale(vsub(P[1], P[0]), (n * w[1]) / w[0]),
    d1: vscale(vsub(P[n], P[n - 1]), (n * w[n - 1]) / w[n]),
  }
}

/**
 * ∫₀¹ |h/w| dt by the midpoint rule. 24 points by default because this sits inside a
 * finite-difference Jacobian and h/w is smooth; the solve converges to the root of THIS
 * discretisation, which is why the spare dimensions matter (see the block comment).
 */
export function arcLength(s: ConformalPHCurve, samples = 24): number {
  let acc = 0
  for (let k = 0; k < samples; k++) acc += Math.abs(speedAt(s, (k + 0.5) / samples)) / samples
  return acc
}

/** The three coordinates on the strict family: the free radii, then the arc length. */
export function strictCoordinates(s: ConformalPHCurve): { radii: number[]; length: number } {
  const r = radii(s)
  return { radii: freeRadiusIndices(s).map((i) => r[i]), length: arcLength(s) }
}

/** Which coordinate a strict-mode slider is prescribing. */
export type StrictCoordinate =
  | { readonly kind: 'radius'; readonly index: number }
  | { readonly kind: 'length' }

/**
 * Move along the strict family by prescribing ONE coordinate, with the C¹ Hermite data held.
 *
 * Rate-limited for the same reason dragFarin is: a slider event can jump, and asking for a
 * large reshape in one solve is what made the bead appear to explode.
 */
export function dragStrict(
  from: ConformalPHCurve,
  coordinate: StrictCoordinate,
  target: number,
  options: { data?: HermiteData; iterations?: number; maxStepRatio?: number; lengthSamples?: number } = {},
): DragResult {
  const data = options.data ?? hermiteDataOf(from)
  // The arc-length row is the expensive one: solveWith finite-differences the extra rows over
  // all 35 unknowns every Newton iteration, so the cost is linear in the sample count. 8 points
  // instead of 24 makes the length slider roughly three times faster; the solve converges to the
  // root of whichever quadrature it is given, and the spare dimensions absorb the difference.
  // Measured: 80 Newton iterations ARE needed — at 40 the first step already fails to converge —
  // so iterations is not the lever, sample count is.
  const samples = options.lengthSamples ?? 8
  const maxStepRatio = options.maxStepRatio ?? 0.04
  const current = coordinate.kind === 'length' ? arcLength(from, samples) : radii(from)[coordinate.index]
  const limit = Math.abs(current) * maxStepRatio
  const wanted = Number.isFinite(current)
    ? Math.min(current + limit, Math.max(current - limit, target))
    : target
  const measure = (s: ConformalPHCurve): number =>
    coordinate.kind === 'length' ? arcLength(s, samples) : radii(s)[coordinate.index]
  return solveWith(from, {
    rows: (s) => {
      const d = hermiteDataOf(s)
      return [
        d.p0.x - data.p0.x, d.p0.y - data.p0.y, d.p0.z - data.p0.z,
        d.p1.x - data.p1.x, d.p1.y - data.p1.y, d.p1.z - data.p1.z,
        d.d0.x - data.d0.x, d.d0.y - data.d0.y, d.d0.z - data.d0.z,
        d.d1.x - data.d1.x, d.d1.y - data.d1.y, d.d1.z - data.d1.z,
        measure(s) - wanted,
      ]
    },
    track: (s) => Math.abs(measure(s) - wanted),
  }, options.iterations ?? 80)
}

/**
 * Re-prescribe the Hermite data itself — strict mode's other gesture, so the DATA can be
 * dragged as well as the family ridden. Nothing else is pinned, so the leftover 3 dimensions
 * are spent by minimum norm.
 */
export function moveToData(
  from: ConformalPHCurve,
  data: HermiteData,
  options: { iterations?: number } = {},
): DragResult {
  return solveWith(from, {
    rows: (s) => {
      const d = hermiteDataOf(s)
      return [
        d.p0.x - data.p0.x, d.p0.y - data.p0.y, d.p0.z - data.p0.z,
        d.p1.x - data.p1.x, d.p1.y - data.p1.y, d.p1.z - data.p1.z,
        d.d0.x - data.d0.x, d.d0.y - data.d0.y, d.d0.z - data.d0.z,
        d.d1.x - data.d1.x, d.d1.y - data.d1.y, d.d1.z - data.d1.z,
      ]
    },
    track: (s) => {
      const d = hermiteDataOf(s)
      return Math.max(
        vnorm(vsub(d.p0, data.p0)), vnorm(vsub(d.p1, data.p1)),
        vnorm(vsub(d.d0, data.d0)), vnorm(vsub(d.d1, data.d1)),
      )
    },
  }, options.iterations ?? 80)
}

/** Power of a point with respect to a sphere: ‖x−c‖² − ρ², the quantity the tests pin. */
export function powerOfPoint(x: Vec3, centre: Vec3, radius: number): number {
  const d = vsub(x, centre)
  return vdot(d, d) - radius * radius
}
