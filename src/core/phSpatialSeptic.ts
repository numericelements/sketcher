// ============================================================================
// DEGREE-7 SPATIAL PH CURVES WHOSE EULER–RODRIGUES FRAME IS ALREADY
// ROTATION-MINIMIZING — the RM-ERF class.
//
// WHY THIS CLASS AND NOT RRMF QUINTICS. A rational rotation-minimizing frame can be
// reached two ways:
//
//   quintic RRMF   the ERF twists, but the compensating normal-plane rotation
//                  θ = −2·arctan(b/a) happens to be RATIONAL. Frame = rotation ∘ ERF:
//                  two pieces, so the FRAME is high degree even though the curve is low.
//
//   degree-7       the ERF does not twist at all. Frame = ERF: one piece. The survey's
//   RM-ERF         words — "although the curves are of higher degree than the RRMF
//                  quintics, their rational RMFs are actually of LOWER degree, since
//                  the rational normal-plane rotation is not required."
//
// So you pay in curve degree or in frame degree, and for an editor the second is much
// the better bargain — measured: local C² editing needs a 3-segment window for degree-7
// RM-ERF against 6 for quintic RRMF, because a degree-7 segment has 16 unknowns to
// spend and five constraints barely dent it, where a quintic has 12 and three hurt.
//
// THE TWO EQUATIONS, AND THAT THEY ARE THE SAME EQUATION
//
// The ERF's angular velocity about the tangent is (2019 survey, eq. 13)
//
//     ω₁ = (de₂/ds)·e₃ = 2(u v′ − u′v − p q′ + p′q) / σ²
//
// and that numerator is exactly scal(A i A′*) — expand it and the terms match. So
// "the ERF is rotation-minimizing" means the degree-5 polynomial scal(A i A′*)
// vanishes identically, which in Bernstein coefficients is the survey's eq. (14):
//
//     scal(A₀ i A₁*) = scal(A₀ i A₂*) = 0
//     3·scal(A₁ i A₂*) + scal(A₀ i A₃*) = 0
//     scal(A₁ i A₃*) = scal(A₂ i A₃*) = 0
//
// FIVE conditions, not six, although the polynomial has six coefficients: s(0,3) and
// s(1,2) appear only through the combination 3s(1,2) + s(0,3), so their individual
// values are free. Measured: the five are independent (rank 5) and all six s(a,b) are
// independent functions (rank 6) — so the structure is confirmed, not assumed.
//
// scal(a i b*) is ANTISYMMETRIC in (a,b), which is why scal(A i A*) ≡ 0 (the Hopf map
// is pure) and why the diagonal terms are absent above.
//
// THE GATE. Everything here rests on my reading of those two equations, so the first
// test imposes (14) and then samples ω₁ densely, requiring machine zero. If either
// reading were wrong, that test fails and the figure would never have been drawn.
//
// EVERY PLANAR PH CURVE IS AUTOMATICALLY RM-ERF, and this is a trap. For A in a
// 2-plane such as span{1,k} we have v = p = 0, and
//
//     scal(a i b*) = a.u·b.v − a.v·b.u − a.p·b.q + a.q·b.p  =  0
//
// identically. So the whole planar family lies inside the constraint set as a large,
// easily reached component — and minimum-norm projection FALLS INTO IT: measured, four
// of five seeds converge to residual 1e-16 with planarity exactly 0. The frame story is
// then vacuous, because a planar curve has nothing to twist about. Any construction here
// must therefore CHECK that the member it found is genuinely spatial; `findClassMember`
// does, and `projectToClass` refuses rather than returning a flat curve.
//
// MEASURED DIMENSIONS: the class is 16 − 5 + 3 (origin) − 1 (gauge) = 13. (The survey
// says the class "incorporates 16 free parameters"; I cannot reconcile that with a
// measured constraint rank of 5, and would rather record the discrepancy than fudge it.
// Nothing here depends on the absolute number.)
// ============================================================================
import { leastSquares } from './linalg'
import {
  QUAT_I,
  type Quat,
  type Vec3,
  polarSandwich,
  qadd,
  qconj,
  qmul,
  qnormSq,
  qscale,
  qvec,
  sandwich,
  vadd,
  vdot,
  vnorm,
  vscale,
  vsub,
} from './quaternion'

/** Curve degree; the cubic generator gives a degree-6 hodograph. */
const DEGREE = 7
const QUAT_J: Quat = { u: 0, v: 0, p: 1, q: 0 }
const QUAT_K: Quat = { u: 0, v: 0, p: 0, q: 1 }

/** A degree-7 spatial PH curve: cubic quaternion generator plus a starting point. */
export interface SpatialPHSeptic {
  /** A(t) in the cubic Bernstein basis — four coefficients. */
  readonly A: readonly Quat[]
  readonly p0: Vec3
}

/** scal(a i b*) — the building block of BOTH survey eq. (13) and (14). Antisymmetric. */
export function scalIQ(a: Quat, b: Quat): number {
  return qmul(qmul(a, QUAT_I), qconj(b)).u
}

/** A x A* for an arbitrary axis — the ERF is this for x = i, j, k. */
function sandwichAxis(a: Quat, axis: Quat): Vec3 {
  return qvec(qmul(qmul(a, axis), qconj(a)))
}

const binom3 = [1, 3, 3, 1]
const binom2 = [1, 2, 1]

export function generatorAt(A: readonly Quat[], t: number): Quat {
  const s = 1 - t
  let acc: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = 0; k <= 3; k++) acc = qadd(acc, qscale(A[k], binom3[k] * s ** (3 - k) * t ** k))
  return acc
}

/** A′(t) — a quadratic, with coefficients 3·ΔA. */
export function generatorDerivAt(A: readonly Quat[], t: number): Quat {
  const s = 1 - t
  let acc: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = 0; k <= 2; k++) {
    const d = qscale(qadd(A[k + 1], qscale(A[k], -1)), 3)
    acc = qadd(acc, qscale(d, binom2[k] * s ** (2 - k) * t ** k))
  }
  return acc
}

/** σ = |A|² = |r′|, a polynomial — the reason a PH frame can be rational at all. */
export const speedAt = (A: readonly Quat[], t: number): number => qnormSq(generatorAt(A, t))

/**
 * THE FIVE RM-ERF CONSTRAINTS, survey eq. (14). Zero exactly when the ERF is
 * rotation-minimizing, i.e. when the frame needs no normal-plane correction.
 */
export function rmErfResidual(A: readonly Quat[]): number[] {
  return [
    scalIQ(A[0], A[1]),
    scalIQ(A[0], A[2]),
    3 * scalIQ(A[1], A[2]) + scalIQ(A[0], A[3]),
    scalIQ(A[1], A[3]),
    scalIQ(A[2], A[3]),
  ]
}

/** All six independent s(a,b) — exposed because "five, not six" is a measured claim. */
export function allScalIQ(A: readonly Quat[]): number[] {
  return [
    scalIQ(A[0], A[1]), scalIQ(A[0], A[2]), scalIQ(A[0], A[3]),
    scalIQ(A[1], A[2]), scalIQ(A[1], A[3]), scalIQ(A[2], A[3]),
  ]
}

/** ω₁ — the ERF's angular velocity ABOUT THE TANGENT. Survey eq. (13). */
export function erfTwistRate(A: readonly Quat[], t: number): number {
  const a = generatorAt(A, t)
  const s = qnormSq(a)
  if (s === 0) return NaN
  return (2 * scalIQ(a, generatorDerivAt(A, t))) / (s * s)
}

/**
 * Total twist about the tangent, ∫|ω₁| ds. Zero for an RM-ERF curve; this is the
 * number the figure shows, so it is measured from the frame rather than inferred from
 * the constraints. (ds = σ dt, and ω₁ carries σ², so the integrand is 2|scal|/σ.)
 */
export function totalErfTwist(A: readonly Quat[], steps = 400): number {
  let acc = 0
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps
    acc += Math.abs(erfTwistRate(A, t)) * speedAt(A, t) / steps
  }
  return acc
}

/** The Euler–Rodrigues frame: three sandwiches, one per axis, all rational. */
export interface Frame {
  readonly e1: Vec3
  readonly e2: Vec3
  readonly e3: Vec3
}
export function erfAt(A: readonly Quat[], t: number): Frame | null {
  const a = generatorAt(A, t)
  const s = qnormSq(a)
  if (s === 0) return null
  return {
    e1: vscale(sandwichAxis(a, QUAT_I), 1 / s),
    e2: vscale(sandwichAxis(a, QUAT_J), 1 / s),
    e3: vscale(sandwichAxis(a, QUAT_K), 1 / s),
  }
}

/** Bernstein weights of the square for a CUBIC generator: C(3,a)C(3,b)/C(6,j). */
const SQUARE_W: readonly (readonly number[])[] = (() => {
  const c = (n: number, k: number): number => {
    let r = 1
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
    return r
  }
  const rows: number[][] = []
  for (let j = 0; j <= 6; j++) {
    const row = new Array(4).fill(0)
    for (let a = Math.max(0, j - 3); a <= Math.min(3, j); a++) row[a] = (c(3, a) * c(3, j - a)) / c(6, j)
    rows.push(row)
  }
  return rows
})()

/** The seven degree-6 Bernstein coefficients of r′ = A i A*. */
export function hodographCoefficients(A: readonly Quat[]): Vec3[] {
  const out: Vec3[] = []
  for (let j = 0; j <= 6; j++) {
    let acc: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = Math.max(0, j - 3); a <= Math.min(3, j); a++) {
      const b = j - a
      if (a > b) continue
      const w = SQUARE_W[j][a]
      if (w === 0) continue
      acc = vadd(acc, vscale(a === b ? sandwich(A[a]) : polarSandwich(A[a], A[b]), w))
    }
    out.push(acc)
  }
  return out
}

/** The eight control points. */
export function controlPoints(s: SpatialPHSeptic): Vec3[] {
  const pts: Vec3[] = [s.p0]
  let cur = s.p0
  for (const d of hodographCoefficients(s.A)) {
    cur = vadd(cur, vscale(d, 1 / DEGREE))
    pts.push(cur)
  }
  return pts
}

export function curveAt(s: SpatialPHSeptic, t: number): Vec3 {
  const work = controlPoints(s).map((p) => ({ ...p }))
  for (let r = 1; r <= DEGREE; r++) {
    for (let j = 0; j <= DEGREE - r; j++) {
      work[j] = vadd(vscale(work[j], 1 - t), vscale(work[j + 1], t))
    }
  }
  return work[0]
}

export function hodographAt(A: readonly Quat[], t: number): Vec3 {
  return sandwich(generatorAt(A, t))
}

/** Smallest σ over the curve. Zero means a cusp. */
export function minSpeed(A: readonly Quat[], steps = 60): number {
  let m = Infinity
  for (let k = 0; k <= steps; k++) m = Math.min(m, speedAt(A, k / steps))
  return m
}

/**
 * How far from planar, in [0,1] — the ratio of smallest to largest singular value of
 * the hodograph coefficients. A near-planar member would make the frame story trivial
 * (nothing to twist about), so the figure must start from a genuinely spatial one.
 */
export function planarity(A: readonly Quat[]): number {
  const g = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const d of hodographCoefficients(A)) {
    const v = [d.x, d.y, d.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g[i][j] += v[i] * v[j]
  }
  const p1 = g[0][1] ** 2 + g[0][2] ** 2 + g[1][2] ** 2
  const tr = g[0][0] + g[1][1] + g[2][2]
  if (p1 === 0) {
    const d = [g[0][0], g[1][1], g[2][2]].sort((a, b) => b - a)
    return d[0] <= 0 ? 0 : Math.sqrt(Math.max(0, d[2]) / d[0])
  }
  const q = tr / 3
  const p2 = (g[0][0] - q) ** 2 + (g[1][1] - q) ** 2 + (g[2][2] - q) ** 2 + 2 * p1
  const p = Math.sqrt(p2 / 6)
  const b = g.map((row, i) => row.map((v, j) => (v - (i === j ? q : 0)) / p))
  const det =
    b[0][0] * (b[1][1] * b[2][2] - b[1][2] * b[2][1]) -
    b[0][1] * (b[1][0] * b[2][2] - b[1][2] * b[2][0]) +
    b[0][2] * (b[1][0] * b[2][1] - b[1][1] * b[2][0])
  const phi = Math.acos(Math.min(1, Math.max(-1, det / 2))) / 3
  const hi = q + 2 * p * Math.cos(phi)
  const lo = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3)
  return hi <= 0 ? 0 : Math.sqrt(Math.max(0, lo) / hi)
}

// ---------------------------------------------------------------------------
// Staying inside the class while editing
// ---------------------------------------------------------------------------

const pack = (s: SpatialPHSeptic): number[] => [
  ...s.A.flatMap((a) => [a.u, a.v, a.p, a.q]),
  s.p0.x, s.p0.y, s.p0.z,
]
const unpack = (x: readonly number[]): SpatialPHSeptic => ({
  A: [0, 1, 2, 3].map((k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] })),
  p0: { x: x[16], y: x[17], z: x[18] },
})

export interface ClassDragResult {
  readonly state: SpatialPHSeptic
  readonly converged: boolean
  /** Worst RM-ERF constraint residual — the class membership, measured. */
  readonly classResidual: number
  readonly trackingError: number
  readonly disturbance: number
}

/**
 * Drag control point `index` while STAYING IN THE CLASS.
 *
 * The constraints are hard (the five RM-ERF conditions plus the cursor), and the
 * remaining freedom is spent by the minimum-norm step — so the rest of the polygon
 * moves as little as the solve can manage. Deliberately NOT a soft-penalty
 * formulation: with soft constraints the achievable class residual would be capped by
 * the weighting, and the whole claim of this figure is that ω₁ is at machine zero.
 *
 * Warm-started, so an interactive drag is a sequence of these.
 */
export function dragInClass(
  from: SpatialPHSeptic,
  index: number,
  target: Vec3,
  iterations = 24,
): ClassDragResult {
  const before = controlPoints(from)
  const residual = (x: readonly number[]): number[] => {
    const s = unpack(x)
    const p = controlPoints(s)[index]
    const d = vsub(p, target)
    return [...rmErfResidual(s.A), d.x, d.y, d.z]
  }

  let x = pack(from)
  const E = residual(x).length
  const U = x.length
  const h = 1e-6
  for (let it = 0; it < iterations; it++) {
    const r = residual(x)
    const J: number[][] = Array.from({ length: E }, () => new Array(U).fill(0))
    for (let c = 0; c < U; c++) {
      const plus = x.slice(); plus[c] += h
      const minus = x.slice(); minus[c] -= h
      const rp = residual(plus)
      const rm = residual(minus)
      for (let e = 0; e < E; e++) J[e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    try {
      step = leastSquares(J, r.map((v) => -v), 1e-11)
    } catch {
      break
    }
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
    if (Math.max(...step.map(Math.abs)) < 1e-14) break
  }

  const state = unpack(x)
  const after = controlPoints(state)
  const classResidual = Math.max(...rmErfResidual(state.A).map(Math.abs))
  let disturbance = 0
  for (let j = 0; j < after.length; j++) {
    if (j !== index) disturbance = Math.max(disturbance, vnorm(vsub(after[j], before[j])))
  }
  return {
    state,
    converged: classResidual < 1e-9 && vnorm(vsub(after[index], target)) < 1e-7,
    classResidual,
    trackingError: vnorm(vsub(after[index], target)),
    disturbance,
  }
}

/**
 * Pull an arbitrary generator onto the class — used once, to build a starting curve.
 * `prefer` biases which member is reached (min-norm from the seed), and the result is
 * rejected rather than returned if it lands somewhere degenerate or nearly planar,
 * because a flat member has no frame story to tell.
 */
export function projectToClass(
  seed: readonly Quat[],
  options: { minPlanarity?: number; minSpeed?: number; iterations?: number } = {},
): Quat[] | null {
  const wantPlanar = options.minPlanarity ?? 0.05
  const wantSpeed = options.minSpeed ?? 0.05
  const iterations = options.iterations ?? 60

  let x = seed.flatMap((a) => [a.u, a.v, a.p, a.q])
  const toA = (v: readonly number[]): Quat[] =>
    [0, 1, 2, 3].map((k) => ({ u: v[4 * k], v: v[4 * k + 1], p: v[4 * k + 2], q: v[4 * k + 3] }))
  const h = 1e-6
  for (let it = 0; it < iterations; it++) {
    const r = rmErfResidual(toA(x))
    if (Math.max(...r.map(Math.abs)) < 1e-14) break
    const J: number[][] = Array.from({ length: 5 }, () => new Array(16).fill(0))
    for (let c = 0; c < 16; c++) {
      const plus = x.slice(); plus[c] += h
      const minus = x.slice(); minus[c] -= h
      const rp = rmErfResidual(toA(plus))
      const rm = rmErfResidual(toA(minus))
      for (let e = 0; e < 5; e++) J[e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    try {
      step = leastSquares(J, r.map((v) => -v), 1e-10)
    } catch {
      return null
    }
    if (!step.every(Number.isFinite)) return null
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) return null
    x = next
  }
  const A = toA(x)
  if (Math.max(...rmErfResidual(A).map(Math.abs)) > 1e-10) return null
  if (minSpeed(A) < wantSpeed) return null
  if (planarity(A) < wantPlanar) return null
  return A
}

/**
 * A deterministic search for a genuinely SPATIAL member of the class.
 *
 * Needed because the planar curves satisfy the constraints for free (see the header),
 * so a single projection usually lands flat. Sweeps a fixed seed list and keeps the
 * most spatial member, so the result is reproducible rather than lucky.
 */
export function findClassMember(options: { minPlanarity?: number } = {}): Quat[] | null {
  const seeds: number[][] = [
    [1, 0.3, 0.3, 0.3, 1, -0.3, 0.3, -0.3, 1, 0.3, -0.3, -0.3, 1, -0.3, -0.3, 0.3],
    [1, 0.4, 0.2, 0.35, 1, -0.35, 0.4, -0.2, 1, 0.2, -0.35, -0.4, 1, -0.4, -0.2, 0.35],
    [1.1, 0.25, 0.45, 0.2, 0.9, -0.4, 0.25, -0.35, 1.05, 0.35, -0.2, -0.45, 0.95, -0.25, -0.4, 0.3],
    [1, 0.15, -0.25, 0.1, 0.85, -0.3, 0.4, 0.5, 1.1, 0.3, 0.15, -0.2, 0.9, -0.2, 0.3, 0.25],
  ]
  const want = options.minPlanarity ?? 0.05
  let best: Quat[] | null = null
  let bestPlanarity = -1
  for (const seed of seeds) {
    const A = projectToClass(
      [0, 1, 2, 3].map((k) => ({ u: seed[4 * k], v: seed[4 * k + 1], p: seed[4 * k + 2], q: seed[4 * k + 3] })),
      { minPlanarity: want },
    )
    if (!A) continue
    const p = planarity(A)
    if (p > bestPlanarity) { bestPlanarity = p; best = A }
  }
  return best
}

/** The frame's normal, sampled along the curve — what the figure combs. */
export function frameComb(
  s: SpatialPHSeptic,
  stations: number,
  length: number,
): { at: Vec3; tip: Vec3 }[] {
  const out: { at: Vec3; tip: Vec3 }[] = []
  for (let k = 0; k <= stations; k++) {
    const t = k / stations
    const f = erfAt(s.A, t)
    if (!f) continue
    const at = curveAt(s, t)
    out.push({ at, tip: vadd(at, vscale(f.e2, length)) })
  }
  return out
}

/** Orthonormality of the ERF, worst case — the frame is a rotation or it is nothing. */
export function frameDefect(A: readonly Quat[], steps = 40): number {
  let worst = 0
  for (let k = 0; k <= steps; k++) {
    const f = erfAt(A, k / steps)
    if (!f) return NaN
    const checks = [
      vdot(f.e1, f.e1) - 1, vdot(f.e2, f.e2) - 1, vdot(f.e3, f.e3) - 1,
      vdot(f.e1, f.e2), vdot(f.e1, f.e3), vdot(f.e2, f.e3),
    ]
    worst = Math.max(worst, ...checks.map(Math.abs))
  }
  return worst
}
