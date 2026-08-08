// ============================================================================
// THE RATIONAL PH CUBIC, BUILT DIRECTLY IN R^{4,1} — and its editing.
//
// A degree-3 curve P(t) = Σ Cₖ Bₖ(t) with Cₖ ∈ R^{4,1}, NULL so that it is a curve of
// points, and PH so that ⟨P′,P′⟩ = h². No polynomial source curve and no Möbius image:
// this is the smallest genuinely rational PH curve there is, and no bending of a polynomial
// one can produce it, because the conformal lift doubles the degree and so a Möbius image
// always has EVEN conformal degree.
//
// HOW MUCH ROOM. Measured (see conformalPHFamily.test.ts): the degree-n family has
// dimension 2n+5, so 11 here, of which 9 are Möbius motions and 2 change the shape. An
// ordinary rational cubic has 15, so PH is CODIMENSION 4 — a rational cubic you build by
// placing points and weights is essentially never PH.
//
// WHAT THE CONTROL POINTS ARE, and this is the whole reason the figure can be drawn without
// mentioning five dimensions. A conformal vector's five coordinates are exactly
// weight + centre + radius, because the ∞-component is fixed by the null condition. So each
// Cₖ is a WEIGHTED SPHERE, its centre is the ordinary rational-Bézier control point, and the
// null conditions read off as plain geometry — all five verified to 1e-11 or better:
//
//     ρ₀ = ρ₃ = 0                                     the ends are POINT-spheres
//     ρ₁ = ‖P₁ − P₀‖   ρ₂ = ‖P₂ − P₃‖                 each end sphere TOUCHES its endpoint
//     w₀w₂ · pow(P₀,S₂) = 3w₁²ρ₁²                     and mirrored,
//     w₁w₃ · pow(P₃,S₁) = 3w₂²ρ₂²
//     w₀w₃‖P₀−P₃‖² + 9w₁w₂(‖P₁−P₂‖² − ρ₁² − ρ₂²) = 0  spheres against the chord
//
// The second line is the useful one: THE RADII ARE NOT EXTRA DATA. S₁ is the sphere centred
// at P₁ through P₀, S₂ the sphere centred at P₂ through P₃ — both drawn from the ordinary
// control polygon, nothing stored. So the sphere picture and the projected picture carry the
// same information, and a figure can show both at once.
//
// The count closes on that reading: 4 centres + 4 weights = 16, less the overall scale = 15;
// the ρ conditions are spent naming the radii; what remains is the last three rows plus the
// two PH conditions, 5 equations of rank 4 — giving 15 − 4 = 11, the measured dimension and
// the elementary codimension 4. Two independent routes to the same number.
//
// WEIGHTS AS FARIN POINTS. Degree 3 has three legs and, after the overall scale, three
// weight ratios: an exact match, so a bead per leg carries the weights completely.
// Fᵢ = (wᵢPᵢ + wᵢ₊₁Pᵢ₊₁)/(wᵢ + wᵢ₊₁), so all beads at leg midpoints means all weights equal
// means POLYNOMIAL, and a bead leaving its segment means that weight ratio went negative.
// The rationality is visible as how far off-centre the beads sit.
//
// THE SOLVER IS THE USUAL ONE. Hard constraints (null, PH, the pinned ends, the cursor),
// minimum norm for the rest, warm-started. h is kept as three unknowns rather than
// eliminated; its leading power coefficient is pinned to zero by the geometry (see
// conformalPHFamily.test.ts), which makes the Jacobian rank-deficient by one — harmless,
// since the least-squares step is regularised, and cheaper than reparametrising.
// ============================================================================
import { type Vec3, vadd, vdot, vnorm, vscale, vsub } from './quaternion'
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

const DEGREE = 3
const NC = 5 * (DEGREE + 1) // 20 conformal coordinates
const NH = DEGREE // h as a degree-2 Bernstein polynomial: 3 coefficients
export const UNKNOWNS = NC + NH

/** A rational PH cubic in the conformal model: four 5-vectors and the speed numerator. */
export interface ConformalPHCubic {
  readonly C: readonly Conformal[]
  /** h, Bernstein coefficients of degree 2, with ‖p′‖ = h/w. */
  readonly h: readonly number[]
}

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

export const pack = (s: ConformalPHCubic): number[] => [...s.C.flatMap((c) => [...c]), ...s.h]
export const unpack = (x: readonly number[]): ConformalPHCubic => ({
  C: Array.from({ length: DEGREE + 1 }, (_, k) => x.slice(5 * k, 5 * k + 5) as unknown as Conformal),
  h: x.slice(NC),
})

/** The 12 defining conditions: 7 for null, 5 for PH. Zero exactly on the family. */
export function residual(s: ConformalPHCubic): number[] {
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
export const weights = (s: ConformalPHCubic): number[] => s.C.map((c) => c[0])

/** The ordinary rational-Bézier control points, which are the spheres' CENTRES. */
export function controlPoints(s: ConformalPHCubic): Vec3[] {
  return s.C.map((c) => project(c) ?? { x: NaN, y: NaN, z: NaN })
}

/**
 * The radii. ⟨C,C⟩ = w²ρ², so ρ = √⟨C,C⟩/|w| — zero at the ends (they are points), and
 * for the interior two equal to the distance to the near endpoint (verified in the tests).
 * Negative ⟨C,C⟩ would mean an imaginary sphere; reported as a negative radius so a caller
 * can show it rather than hide it.
 */
export function radii(s: ConformalPHCubic): number[] {
  return s.C.map((c) => {
    const w = c[0]
    if (w === 0) return NaN
    const q = innerProduct(c, c) / (w * w)
    return q >= 0 ? Math.sqrt(q) : -Math.sqrt(-q)
  })
}

/** Fᵢ = (wᵢPᵢ + wᵢ₊₁Pᵢ₊₁)/(wᵢ + wᵢ₊₁) — one bead per leg, three in all. */
export function farinPoints(s: ConformalPHCubic): Vec3[] {
  const P = controlPoints(s)
  const w = weights(s)
  return Array.from({ length: DEGREE }, (_, i) => {
    const sum = w[i] + w[i + 1]
    if (sum === 0) return { x: NaN, y: NaN, z: NaN }
    return vscale(vadd(vscale(P[i], w[i]), vscale(P[i + 1], w[i + 1])), 1 / sum)
  })
}

/** Where the bead sits along its leg, in [0,1]: 0 at Pᵢ, ½ when the weights are equal. */
export function farinParameters(s: ConformalPHCubic): number[] {
  const w = weights(s)
  return Array.from({ length: DEGREE }, (_, i) => {
    const sum = w[i] + w[i + 1]
    return sum === 0 ? NaN : w[i + 1] / sum
  })
}

export const curveAt = (s: ConformalPHCubic, t: number): Vec3 | null =>
  project(evaluateConformal(s.C, t))

/** ‖p′‖ = h/w — rational, with h of degree 1 and w of degree 3 (the (n−2)/n law). */
export function speedAt(s: ConformalPHCubic, t: number): number {
  const w = evaluateConformal(s.C, t)[0]
  return w === 0 ? NaN : scalarAt(s.h, t) / w
}

/** The image's rational Bézier data, for drawing the curve from the same source as the polygon. */
export function rationalBezier(s: ConformalPHCubic): RationalBezier {
  return { points: controlPoints(s), weights: weights(s) }
}

/** min over t of the denominator — positive means the pole is off the curve. */
export const denominatorFloor = (s: ConformalPHCubic): number => minDenominator(rationalBezier(s))

/** ‖p′‖ measured from the CURVE by central difference — so the PH claim can be checked. */
export function measuredSpeed(s: ConformalPHCubic, t: number, step = 1e-5): number {
  const a = curveAt(s, Math.min(1, t + step))
  const b = curveAt(s, Math.max(0, t - step))
  if (!a || !b) return NaN
  return vnorm(vsub(a, b)) / (Math.min(1, t + step) - Math.max(0, t - step))
}

// ---------------------------------------------------------------------------
// The Jacobian of the 12 defining conditions — analytic, since they are quadratic
// ---------------------------------------------------------------------------

export function definingJacobian(s: ConformalPHCubic): number[][] {
  const n = DEGREE
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
  /** Smallest interior radius, as a fraction of the chord ‖P₀−P₃‖. */
  readonly minRadiusRatio?: number
  /** All weights must exceed this fraction of the largest, and share its sign. */
  readonly minWeightRatio?: number
  /** The curve must span at least this much. */
  readonly minSpan?: number
}

/**
 * A non-degenerate member.
 *
 * The guards are not tidiness. Measured: unguarded solves from random seeds land on members
 * whose interior radii collapse to 1e-3 and whose weights go negative, with the curve
 * spanning a hundredth of its own polygon — feasible and useless. The mechanism is visible
 * in the dictionary above: as ρ₁ → 0 the point P₁ falls onto P₀ and the third condition
 * drags P₀ onto S₂. It is the same shape of trap as the septic's planar locus, which is why
 * findClassMember there needs its own guard.
 *
 * Deterministic: the seed sequence is fixed, so a figure gets the same curve every time.
 */
export function findMember(guards: MemberGuards = {}): ConformalPHCubic | null {
  const minRadiusRatio = guards.minRadiusRatio ?? 0.12
  const minWeightRatio = guards.minWeightRatio ?? 0.25
  const minSpan = guards.minSpan ?? 0.5
  for (let seed = 0; seed < 400; seed++) {
    const rnd = (k: number): number => {
      const v = Math.sin(seed * 53.7 + k * 11.3 + 7.1) * 43758.5453
      return (v - Math.floor(v)) * 2 - 1
    }
    let x = Array.from({ length: UNKNOWNS }, (_, k) =>
      k < NC ? (k % 5 === 0 ? 1 + 0.3 * rnd(k) : 1.4 * rnd(k)) : rnd(k))
    for (let it = 0; it < 400; it++) {
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
    const chord = vnorm(vsub(P[3], P[0]))
    if (chord < 1e-6) continue
    const r = radii(s)
    if (r[1] < minRadiusRatio * chord || r[2] < minRadiusRatio * chord) continue
    let span = 0
    for (let k = 0; k <= 20; k++) {
      const p = curveAt(s, k / 20)
      if (!p) { span = 0; break }
      span = Math.max(span, vnorm(vsub(p, P[0])))
    }
    if (span < minSpan) continue
    if (denominatorFloor(s) <= 0) continue
    return normalize(s)
  }
  return null
}

/** Fix the projective scale so successive states are comparable: w₀ = 1. */
export function normalize(s: ConformalPHCubic): ConformalPHCubic {
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
  readonly state: ConformalPHCubic
  readonly converged: boolean
  /** Worst defining-condition residual — the family membership, measured. */
  readonly defect: number
  readonly trackingError: number
}

interface Extra {
  /** Extra hard conditions beyond the 12, as functions of the state. */
  readonly rows: (s: ConformalPHCubic) => number[]
  readonly track?: (s: ConformalPHCubic) => number
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
function solveWith(from: ConformalPHCubic, extra: Extra, iterations: number): DragResult {
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
  from: ConformalPHCubic,
  index: number,
  target: Vec3,
  options: { pinEnds?: boolean; iterations?: number } = {},
): DragResult {
  const pinEnds = options.pinEnds ?? true
  const before = controlPoints(from)
  return solveWith(from, {
    rows: (s) => {
      const P = controlPoints(s)
      const out = [P[index].x - target.x, P[index].y - target.y, P[index].z - target.z]
      if (pinEnds) {
        for (const end of [0, DEGREE]) {
          if (end === index) continue
          out.push(P[end].x - before[end].x, P[end].y - before[end].y, P[end].z - before[end].z)
        }
      }
      return out
    },
    track: (s) => vnorm(vsub(controlPoints(s)[index], target)),
  }, options.iterations ?? 60)
}

/**
 * Slide the Farin bead on leg `leg` to parameter `s` ∈ (0,1) — a pure weight edit,
 * imposed as (1−s)·w_{leg+1} − s·w_leg = 0. All four control points are held, so the
 * weights alone answer; ½ puts the bead at the midpoint, which is the polynomial case.
 */
export function dragFarin(
  from: ConformalPHCubic,
  leg: number,
  s: number,
  options: { iterations?: number } = {},
): DragResult {
  const before = controlPoints(from)
  const clamped = Math.min(0.98, Math.max(0.02, s))
  return solveWith(from, {
    rows: (st) => {
      const w = weights(st)
      const P = controlPoints(st)
      const out = [(1 - clamped) * w[leg + 1] - clamped * w[leg]]
      for (let k = 0; k <= DEGREE; k++) {
        out.push(P[k].x - before[k].x, P[k].y - before[k].y, P[k].z - before[k].z)
      }
      return out
    },
    track: (st) => Math.abs(farinParameters(st)[leg] - clamped),
  }, options.iterations ?? 60)
}

/** Power of a point with respect to a sphere: ‖x−c‖² − ρ², the quantity the tests pin. */
export function powerOfPoint(x: Vec3, centre: Vec3, radius: number): number {
  const d = vsub(x, centre)
  return vdot(d, d) - radius * radius
}
