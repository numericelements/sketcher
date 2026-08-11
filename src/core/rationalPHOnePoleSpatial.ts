// ============================================================================
// THE ONE-POLE RATIONAL PH SPACE CURVE — the family where PH cannot fail.
//
// Everywhere else in this repository a PH curve is found by a solver and its residual is a measurement.
// Here it is a SUBSTITUTION. The reason is FOUNDATIONS F14/F16: for a rational curve c = p/w the spinor
// squares to the WRONSKIAN,
//
//     𝒜 i 𝒜̄ = N = p′w − pw′,          ‖c′‖ = |𝒜|²/w²
//
// and with a single pole (w = t − r) the no-log condition is N′(r) = 0 — the Wronskian is stationary at
// the pole — which is solved EXPLICITLY by
//
//     𝒜(t) = B₀ + λ(B₀ i)(t − r) + B₂(t − r)² + …          λ ∈ ℝ free
//
// Choose the base point, choose λ, and 𝒜′(r) is determined. Then p follows by back-substitution on
// (e−1)pₑ − r(e+1)pₑ₊₁ = Nₑ — closed form, no iteration — and the curve is exactly PH by construction.
// Measured: 0.016 ms per member, PH defect 2e-15, over 200 members (spinorChartDrag.test.ts).
//
// WHAT THE TWO EXTRA PARAMETERS MEAN, which is why this family is worth an editor (F16):
//
//   λ  is the frame TWIST RATE at the pole. The kernel direction 𝒜·i is the tangent to the gauge orbit
//      𝒜 ↦ 𝒜e^{iθ}, which rotates the frame about the tangent and leaves the tangent alone; with
//      q = 𝒜/|𝒜| the angular velocity there is exactly ω = 2λ·e₁, purely tangential.
//   r  is where the curve passes through INFINITY, since w(r) = 0. So r is the weight handle, and the
//      family's honest limit is r entering [0,1] — a geometric event, not a solver failure.
//
// AND THE FIBER CLOSES when λ and r are HELD (onePoleLoop.test.ts): 8 parameters − 6 data conditions −
// 1 gauge = 1 dimension, and walking it returns to the starting curve after travelling 0.61 of the
// signature's scale. That compact direction is the Hopf phase — the same thing that closes the
// polynomial cubic's fiber. So this family has both kinds of freedom at once: a loop you can sweep, and
// two named dials that deform it.
// ============================================================================
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec, type Vec3 } from './quaternion'
import { leastSquares } from './linalg'

/** The free parameters: B₀ (4), B₂ (4), then λ and r. Ten reals, and every one of them is effective. */
export interface OnePoleParams {
  readonly b0: Quat
  readonly b2: Quat
  /** The frame twist rate at the pole. */
  readonly lambda: number
  /** Where the curve passes through infinity. Must stay outside [0,1]. */
  readonly pole: number
}

export interface OnePoleMember {
  /** Numerator, per coordinate, in the power basis (degree 4). */
  readonly p: readonly number[][]
  /** Denominator w = t − r, power basis. */
  readonly w: readonly number[]
  /** The Wronskian N = 𝒜i𝒜̄, so c′ = N/w² exactly. */
  readonly N: readonly number[][]
  /** |𝒜|², the speed numerator: ‖c′‖ = σ/w². */
  readonly sigma: readonly number[]
  /** max |consistency residual| of the back-substitution — machine zero when the family is respected. */
  readonly consistency: number
}

const DEG = 4
const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)

/** 𝒜 in the power basis, from the Taylor data at the pole. */
function spinor(prm: OnePoleParams): Quat[] {
  const b1 = qscale(qmul(prm.b0, QUAT_I), prm.lambda)
  const r = prm.pole
  return [
    qadd(qadd(prm.b0, qscale(b1, -r)), qscale(prm.b2, r * r)),
    qadd(b1, qscale(prm.b2, -2 * r)),
    prm.b2,
  ]
}

/**
 * Build the member. No solver: the Hopf square gives N, and p comes from back-substitution downward,
 * whose one inconsistent row IS the no-log condition — reported rather than assumed.
 */
export function toMember(prm: OnePoleParams): OnePoleMember {
  const A = spinor(prm)
  const N = [0, 1, 2].map(() => new Array<number>(DEG + 1).fill(0))
  const sigma = new Array<number>(DEG + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      N[0][i + j] += v.x
      N[1][i + j] += v.y
      N[2][i + j] += v.z
      sigma[i + j] += qmul(A[i], qconj(A[j])).u
    }
  }
  const r = prm.pole
  const p: number[][] = []
  let consistency = 0
  for (let c = 0; c < 3; c++) {
    const f = new Array<number>(DEG + 1).fill(0)
    for (let e = DEG; e >= 2; e--) {
      f[e] = (N[c][e] + (e + 1 <= DEG ? r * (e + 1) * f[e + 1] : 0)) / (e - 1)
    }
    const scale = Math.max(...N[c].map(Math.abs), 1e-300)
    consistency = Math.max(consistency, Math.abs(-2 * r * f[2] - N[c][1]) / scale)
    // f₀ = 0 fixes the translation, so the curve starts at the origin; f₁ follows from the e = 0 row.
    f[0] = 0
    f[1] = -N[c][0] / r
    p.push(f)
  }
  // Fix the projective sign gauge so the weights read POSITIVE: (p, w) ↦ (−p, −w) is the same curve,
  // and it leaves N = p′w − pw′ and σ untouched (both are even in the scaling). A display showing
  // negative weights would look like a pole it does not have.
  const w: number[] = [-r, 1]
  if (evalPoly(w, 0) < 0) {
    for (let c = 0; c < 3; c++) for (let e = 0; e < p[c].length; e++) p[c][e] = -p[c][e]
    w[0] = -w[0]
    w[1] = -w[1]
  }
  return { p, w, N, sigma, consistency }
}

export const curveAt = (m: OnePoleMember, t: number): Vec3 => {
  const wv = evalPoly(m.w, t)
  return { x: evalPoly(m.p[0], t) / wv, y: evalPoly(m.p[1], t) / wv, z: evalPoly(m.p[2], t) / wv }
}

/** c′ = N/w², evaluated exactly — no differencing anywhere in this file. */
export const derivativeAt = (m: OnePoleMember, t: number): Vec3 => {
  const w2 = Math.pow(evalPoly(m.w, t), 2)
  return { x: evalPoly(m.N[0], t) / w2, y: evalPoly(m.N[1], t) / w2, z: evalPoly(m.N[2], t) / w2 }
}

/** ‖c′‖ from the closed form σ/w². The PH property IS this identity. */
export const speedAt = (m: OnePoleMember, t: number): number =>
  Math.abs(evalPoly(m.sigma, t) / Math.pow(evalPoly(m.w, t), 2))

/**
 * The PH defect: ‖c′‖ against σ/w², relative and worst-case. It is reported, not asserted — but unlike
 * every other family here it cannot move, because both sides are built from the same 𝒜.
 */
export function phDefect(m: OnePoleMember): number {
  let worst = 0
  for (let k = 0; k <= 8; k++) {
    const t = k / 8
    const want = speedAt(m, t)
    const got = Math.hypot(...Object.values(derivativeAt(m, t)))
    worst = Math.max(worst, Math.abs(got - want) / Math.max(want, 1e-300))
  }
  return worst
}

const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}
/** Power basis → Bernstein of the same degree: bₖ = Σ_{j≤k} [C(k,j)/C(n,j)] aⱼ. */
function toBernstein(a: readonly number[], n: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => {
    let s = 0
    for (let j = 0; j <= k; j++) s += ((binom(k, j) / binom(n, j)) * (a[j] ?? 0))
    return s
  })
}

/** The rational Bézier control points and weights — for display only; nothing is solved from them. */
export function controlStructure(m: OnePoleMember): { points: Vec3[]; weights: number[] } {
  const wB = toBernstein(m.w, DEG)
  const pB = m.p.map((c) => toBernstein(c, DEG))
  return {
    weights: wB,
    points: wB.map((wk, k) => ({ x: pB[0][k] / wk, y: pB[1][k] / wk, z: pB[2][k] / wk })),
  }
}

/** The data this family's fiber is taken over: c′(0) and c(1). (c(0) is the origin by construction.) */
export function dataOf(m: OnePoleMember): number[] {
  const d0 = derivativeAt(m, 0)
  const e1 = curveAt(m, 1)
  return [d0.x, d0.y, d0.z, e1.x, e1.y, e1.z]
}

// --- the fiber ---------------------------------------------------------------
const PACK = (prm: OnePoleParams): number[] => [
  prm.b0.u, prm.b0.v, prm.b0.p, prm.b0.q, prm.b2.u, prm.b2.v, prm.b2.p, prm.b2.q,
]
const UNPACK = (x: readonly number[], lambda: number, pole: number): OnePoleParams => ({
  b0: { u: x[0], v: x[1], p: x[2], q: x[3] },
  b2: { u: x[4], v: x[5], p: x[6], q: x[7] },
  lambda,
  pole,
})
const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)

function dataJacobian(x: readonly number[], lambda: number, pole: number): number[][] {
  const base = dataOf(toMember(UNPACK(x, lambda, pole)))
  return base.map((_, k) =>
    x.map((_, j) => {
      const e = 1e-7
      const hi = x.slice(); hi[j] += e
      const lo = x.slice(); lo[j] -= e
      return (dataOf(toMember(UNPACK(hi, lambda, pole)))[k]
        - dataOf(toMember(UNPACK(lo, lambda, pole)))[k]) / (2 * e)
    }),
  )
}

/**
 * The fiber's tangent: a probe projected onto the nullspace of the data Jacobian, with the GAUGE
 * direction stripped. The gauge is 𝒜 ↦ 𝒜(1 + εi), which in these coordinates is (B₀i, B₂i) — it moves
 * the parameters and no curve, so leaving it in would make the walk drift invisibly.
 */
export function fiberTangent(
  prm: OnePoleParams, probe: readonly number[],
): number[] | null {
  const x = PACK(prm)
  const J = dataJacobian(x, prm.lambda, prm.pole)
  let corr: number[]
  try { corr = leastSquares(J, J.map((row) => dot(row, probe)), 1e-12) } catch { return null }
  let n = probe.map((v, i) => v - corr[i])
  const b0i = qmul(prm.b0, QUAT_I)
  const b2i = qmul(prm.b2, QUAT_I)
  const g = [b0i.u, b0i.v, b0i.p, b0i.q, b2i.u, b2i.v, b2i.p, b2i.q]
  const gn = Math.hypot(...g)
  if (gn > 0) {
    const gh = g.map((v) => v / gn)
    const c = dot(n, gh)
    n = n.map((v, i) => v - c * gh[i])
  }
  const len = Math.hypot(...n)
  return len > 1e-9 ? n.map((v) => v / len) : null
}

/** Min-norm Gauss-Newton back onto prescribed data, with λ and r held. */
export function projectToData(
  prm: OnePoleParams, target: readonly number[], iterations = 40,
): OnePoleParams {
  let x = PACK(prm)
  for (let it = 0; it < iterations; it++) {
    const r = dataOf(toMember(UNPACK(x, prm.lambda, prm.pole))).map((v, i) => v - target[i])
    if (Math.hypot(...r) < 1e-13) break
    let step: number[]
    try { step = leastSquares(dataJacobian(x, prm.lambda, prm.pole), r.map((v) => -v), 1e-12) } catch { break }
    x = x.map((v, j) => v + step[j])
  }
  return UNPACK(x, prm.lambda, prm.pole)
}

/**
 * Walk the fiber all the way round, with λ and r held. Returns members in order, the last one closing
 * back on the first. Measured to close after travelling 0.61 of the signature scale (onePoleLoop).
 *
 * Each step is a projection, so this is for a settled state rather than a frame — but at ~0.5 ms a
 * sample it is still two orders faster than the conformal family's solver.
 */
export function fiberLoop(
  prm: OnePoleParams, options: { steps?: number; stride?: number } = {},
): OnePoleParams[] {
  const steps = options.steps ?? 96
  const stride = options.stride ?? 0.02
  const target = dataOf(toMember(prm))
  const out: OnePoleParams[] = [prm]
  let cur = prm
  let tangent = fiberTangent(cur, [0, 0, 0, 0, 1, 0, 0, 0]) ?? fiberTangent(cur, [1, 0, 0, 0, 0, 0, 0, 0])
  const signature = (q: OnePoleParams): number[] => {
    const m = toMember(q)
    return [0.2, 0.4, 0.6, 0.8].flatMap((t) => { const v = curveAt(m, t); return [v.x, v.y, v.z] })
  }
  const sig0 = signature(prm)
  const scale = Math.hypot(...sig0) || 1
  for (let k = 0; k < steps * 12 && tangent; k++) {
    const stepped = UNPACK(PACK(cur).map((v, i) => v + stride * tangent![i]), prm.lambda, prm.pole)
    const fixed = projectToData(stepped, target)
    if (Math.hypot(...dataOf(toMember(fixed)).map((v, i) => v - target[i])) > 1e-8) break
    cur = fixed
    const next = fiberTangent(cur, tangent)
    tangent = next && dot(next, tangent) < 0 ? next.map((v) => -v) : next
    out.push(cur)
    const gap = Math.hypot(...signature(cur).map((v, i) => v - sig0[i])) / scale
    if (out.length > 40 && gap < 3e-3) break
  }
  return out
}

/** Re-solve the same data after changing λ or r — the two named dials. */
export function withDial(
  prm: OnePoleParams, target: readonly number[], dial: { lambda?: number; pole?: number },
): OnePoleParams | null {
  const moved: OnePoleParams = {
    ...prm,
    lambda: dial.lambda ?? prm.lambda,
    pole: dial.pole ?? prm.pole,
  }
  const fixed = projectToData(moved, target)
  const err = Math.hypot(...dataOf(toMember(fixed)).map((v, i) => v - target[i]))
  return err < 1e-7 ? fixed : null
}

/** How close the pole is to the drawn piece — 0 means infinity has reached the curve. */
export const poleMargin = (prm: OnePoleParams): number =>
  prm.pole > 1 ? prm.pole - 1 : prm.pole < 0 ? -prm.pole : 0

// --- free dragging: all ten parameters, and PH still cannot fail --------------
const PACK_FULL = (prm: OnePoleParams): number[] => [
  prm.b0.u, prm.b0.v, prm.b0.p, prm.b0.q,
  prm.b2.u, prm.b2.v, prm.b2.p, prm.b2.q,
  prm.lambda, prm.pole,
]
const UNPACK_FULL = (x: readonly number[]): OnePoleParams => ({
  b0: { u: x[0], v: x[1], p: x[2], q: x[3] },
  b2: { u: x[4], v: x[5], p: x[6], q: x[7] },
  lambda: x[8],
  pole: x[9],
})

/**
 * Drag control point `index` toward `target`, spending all TEN parameters by minimum norm.
 *
 * The control points are OUTPUTS of this family — five of them, fifteen coordinates, over a
 * ten-parameter space — so no control point can be prescribed exactly and none needs to be. What the
 * fit gives is the nearest member, and the thing worth noticing is what it does NOT have to do: there
 * is no constraint to satisfy, because 𝒜 i 𝒜̄ IS the Wronskian. PH is not held here; it is unavailable
 * for violation.
 *
 * Rate-limited for the reason every dragger in this repository is: a cursor can jump, and asking for a
 * large reshape in one solve is what makes a handle appear to explode.
 *
 * The pole guard is the honest limit rather than a numerical one. r may not cross into [0,1], because
 * that is where the curve passes through the drawn piece — so a step that would take it there is
 * refused and the caller reports the geometry instead of a failure.
 */
export function dragControlPoint(
  prm: OnePoleParams,
  index: number,
  target: Vec3,
  options: { iterations?: number; maxStep?: number } = {},
): OnePoleParams | null {
  const startSide = prm.pole > 1 ? 1 : -1
  const points = controlStructure(toMember(prm)).points
  const scale = Math.max(
    ...points.map((q, i) => (i === index ? 0 : Math.hypot(q.x - points[index].x, q.y - points[index].y, q.z - points[index].z))),
    1e-9,
  )
  const offset = { x: target.x - points[index].x, y: target.y - points[index].y, z: target.z - points[index].z }
  const reach = Math.hypot(offset.x, offset.y, offset.z)
  if (!(reach > 1e-12)) return prm
  const travel = Math.min(reach, (options.maxStep ?? 0.12) * scale) / reach
  const want: Vec3 = {
    x: points[index].x + offset.x * travel,
    y: points[index].y + offset.y * travel,
    z: points[index].z + offset.z * travel,
  }

  let x = PACK_FULL(prm)
  const residual = (q: readonly number[]): number[] => {
    const pt = controlStructure(toMember(UNPACK_FULL(q))).points[index]
    return [pt.x - want.x, pt.y - want.y, pt.z - want.z]
  }
  for (let it = 0; it < (options.iterations ?? 24); it++) {
    const r = residual(x)
    if (Math.hypot(...r) < 1e-12) break
    const J = r.map((_, k) => x.map((_, j) => {
      const e = 1e-7
      const hi = x.slice(); hi[j] += e
      const lo = x.slice(); lo[j] -= e
      return (residual(hi)[k] - residual(lo)[k]) / (2 * e)
    }))
    let step: number[]
    try { step = leastSquares(J, r.map((v) => -v), 1e-10) } catch { return null }
    const next = x.map((v, j) => v + step[j])
    // Refuse to walk the pole into the drawn piece: that is the family's real edge.
    const side = next[9] > 1 ? 1 : next[9] < 0 ? -1 : 0
    if (side !== startSide) return null
    x = next
  }
  const out = UNPACK_FULL(x)
  return poleMargin(out) > 1e-3 ? out : null
}
