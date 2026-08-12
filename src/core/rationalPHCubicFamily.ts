// ============================================================================
// THE FAMILY OVER ONE INDICATRIX — the null-stratum curve, now dial-able.
//
// Wraps core/rationalPHDual for the published input (α = t² + 1 and the spinor of Kozak–Krajnc–Vitrih's
// rational PH cubic) and exposes exactly what a figure needs: a one-parameter mix of the two truly rational
// members of the solution space at deg b = 6.
//
// THE INVARIANT THE FIGURE IS ABOUT. r = −2b/α gives r′ = −2μF/α² with F = 𝒜i𝒜*, so the unit tangent is
// ±F/|F| for EVERY member, whatever b and μ are: the tangent indicatrix is a function of the SPINOR ALONE.
// Hold 𝒜 and the sphere picture is frozen while a whole vector space of curves remains free. That is the
// exact converse of the fiber loop on slide 17, where sweeping moves 𝒜 and therefore moves the indicatrix by
// up to 1.94 — measured in indicatrixDegree.test.ts. Here `indicatrixDrift` reads machine zero.
//
// WHAT THE SPACE CONTAINS, measured in rationalPHDual.test.ts: at deg b = 6 the validated nullspace is
// 5-dimensional with nothing discarded — three translations, the rational CUBIC, and a second truly rational
// member of degree SIX. The mix parameter runs between those last two, so `s = 0` reproduces the published
// cubic exactly and any `s ≠ 0` is a genuine rational PH sextic. The degree really does jump; `degreeOf`
// reports it rather than hiding it.
//
// AND WHERE μ VANISHES THE CURVE STOPS. ‖r′‖ = 2|μ|σ/α², so a real zero of μ is a genuine STATIONARY POINT,
// not a numerical artifact. `stationaryOn01` finds them so a figure can mark them instead of pretending they
// are not there, and `muFloorOn01` warns before one arrives. The threshold in s is MEASURED rather than
// derived — the normalisations above rescale μ, so the tidy "s ≤ −1/4" that the raw basis suggests is wrong.
// ============================================================================
import type { Quat, Vec3 } from './quaternion'
import {
  type DualSolution,
  curveOf,
  degreeOf,
  hopfImage,
  isTrulyRational,
  nullspaceOf,
} from './rationalPHDual'

/** α and 𝒜 exactly as published; the paper's factor of 60 is only a scale and is dropped. */
export const ALPHA: readonly number[] = [1, 0, 1]
export const SPINOR: readonly Quat[] = [
  { u: -1, v: 0, p: 2, q: 1 },
  { u: 0, v: 3, p: 0, q: 0 },
  { u: 1, v: 0, p: 0, q: 0 },
]

const F = hopfImage(SPINOR)
const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)

/** σ = |𝒜|² = ‖F‖, the speed numerator. */
const SIGMA: readonly number[] = [6, 0, 7, 0, 1]

const scaleSol = (sol: DualSolution, k: number): DualSolution => ({
  b: sol.b.map((bc) => bc.map((v) => v * k)),
  mu: sol.mu.map((v) => v * k),
})

/**
 * The two truly rational members, normalised so that `s = 0` is the published curve.
 *
 * The cubic is scaled to b = (1/120)(t³ − 4t, 6t² − 2t, 3t² + 4t), which is exactly the published r via
 * r = −2b/α. The sextic is then scaled to the same largest-coefficient size, so the mix parameter is
 * dimensionally sensible rather than needing a wildly different range.
 */
function members(): { cubic: DualSolution; sextic: DualSolution } {
  const { members: found } = nullspaceOf(ALPHA, F, 6)
  const rational = found.filter((sol) => isTrulyRational(ALPHA, sol).rational)
  const degree = (sol: DualSolution) => Math.max(...curveOf(ALPHA, sol).p.map(degreeOf))
  const rawCubic = rational.find((sol) => degree(sol) === 3)
  const rawSextic = rational.find((sol) => degree(sol) === 6)
  if (!rawCubic || !rawSextic) throw new Error('rationalPHCubicFamily: expected a cubic and a sextic member')

  // TWO NORMALISATIONS, and the second one is not optional. A nullspace basis vector is only defined up to
  // scale AND up to adding a translation, so scaling alone does not reproduce the published curve — it was
  // off by 0.11 until the translation was removed. Translations are b = α·v for constant vectorial v, giving
  // r = −2v, so pinning r(0) = 0 (the same gauge the rest of this codebase uses) fixes them: subtract α·v
  // with v = −r(0)/2.
  const pinStart = (sol: DualSolution): DualSolution => {
    const a0 = ALPHA[0]
    const r0 = sol.b.map((bc) => (-2 * bc[0]) / a0)
    return {
      b: sol.b.map((bc, c) =>
        bc.map((v, e) => v + (e < ALPHA.length ? (ALPHA[e] * r0[c]) / 2 : 0)),
      ),
      mu: sol.mu,
    }
  }
  const cubic = pinStart(scaleSol(rawCubic, 1 / 120 / rawCubic.b[0][3]))
  const big = (sol: DualSolution) => Math.max(...sol.b.flat().map(Math.abs))
  const sextic = pinStart(scaleSol(rawSextic, big(cubic) / big(rawSextic)))
  return { cubic, sextic }
}

const BASIS = members()

export interface Member {
  readonly p: readonly number[][]
  readonly w: readonly number[]
  readonly mu: readonly number[]
  readonly degree: number
}

/** The mix: cubic + s·sextic. `s = 0` is the published rational PH cubic. */
export function mix(s: number): Member {
  const sol: DualSolution = {
    b: [0, 1, 2].map((c) =>
      Array.from({ length: 7 }, (_, e) => (BASIS.cubic.b[c][e] ?? 0) + s * (BASIS.sextic.b[c][e] ?? 0)),
    ),
    mu: Array.from({ length: 4 }, (_, m) => (BASIS.cubic.mu[m] ?? 0) + s * (BASIS.sextic.mu[m] ?? 0)),
  }
  const { p, w } = curveOf(ALPHA, sol)
  return { p, w, mu: sol.mu, degree: Math.max(...p.map(degreeOf), degreeOf(w)) }
}

export const curveAt = (m: Member, t: number): Vec3 => {
  const wv = evalPoly(m.w, t)
  return { x: evalPoly(m.p[0], t) / wv, y: evalPoly(m.p[1], t) / wv, z: evalPoly(m.p[2], t) / wv }
}

/** ‖r′‖ = 2|μ|σ/α², closed form — so the PH property is a substitution here too, not a fit. */
export const speedAt = (m: Member, t: number): number =>
  Math.abs((2 * evalPoly(m.mu, t) * evalPoly(SIGMA, t)) / Math.pow(evalPoly(m.w, t), 2))

/** Measured speed against the closed form, worst relative over [0,1] away from any stationary point. */
export function phDefect(m: Member): number {
  let worst = 0
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const eps = 1e-6
    const a = curveAt(m, t - eps)
    const b = curveAt(m, t + eps)
    const measured = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / (2 * eps)
    const closed = speedAt(m, t)
    if (closed < 1e-3) continue
    worst = Math.max(worst, Math.abs(measured - closed) / closed)
  }
  return worst
}

/** The indicatrix, straight from the spinor: ±F/σ. Independent of the mix — that IS the figure's claim. */
export const indicatrixAt = (t: number): Vec3 => {
  const s = evalPoly(SIGMA, t)
  return { x: evalPoly(F[0], t) / s, y: evalPoly(F[1], t) / s, z: evalPoly(F[2], t) / s }
}

/**
 * How far this member's ACTUAL unit tangent departs from the spinor's ±F/σ. The headline readout: it stays at
 * machine zero while the curve on screen changes shape. Samples where μ is practically zero are skipped and
 * counted, because there the direction is genuinely undefined rather than merely awkward.
 */
export function indicatrixDrift(m: Member): { drift: number; skipped: number } {
  const muScale = Math.max(...m.mu.map(Math.abs), 1e-300)
  let drift = 0
  let skipped = 0
  for (let i = 0; i <= 240; i++) {
    const t = -2 + (4 * i) / 240
    if (Math.abs(evalPoly(m.mu, t)) < 0.02 * muScale) {
      skipped++
      continue
    }
    const eps = 1e-6
    const a = curveAt(m, t - eps)
    const b = curveAt(m, t + eps)
    const n = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1
    const T = [(b.x - a.x) / n, (b.y - a.y) / n, (b.z - a.z) / n]
    const f = indicatrixAt(t)
    const fn = Math.hypot(f.x, f.y, f.z) || 1
    const u = [f.x / fn, f.y / fn, f.z / fn]
    drift = Math.max(
      drift,
      Math.min(
        Math.hypot(T[0] - u[0], T[1] - u[1], T[2] - u[2]),
        Math.hypot(T[0] + u[0], T[1] + u[1], T[2] + u[2]),
      ),
    )
  }
  return { drift, skipped }
}

/** Real zeros of μ inside [0,1] — the stationary points, found by sign change then bisection. */
export function stationaryOn01(m: Member): number[] {
  const out: number[] = []
  const N = 400
  let prev = evalPoly(m.mu, 0)
  for (let i = 1; i <= N; i++) {
    const t = i / N
    const v = evalPoly(m.mu, t)
    if (prev === 0) out.push((i - 1) / N)
    else if (prev * v < 0) {
      let lo = (i - 1) / N
      let hi = t
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2
        if (evalPoly(m.mu, lo) * evalPoly(m.mu, mid) <= 0) hi = mid
        else lo = mid
      }
      out.push((lo + hi) / 2)
    }
    prev = v
  }
  return out
}

/** Smallest |μ| on [0,1], so a figure can warn before a stationary point actually arrives. */
export function muFloorOn01(m: Member): number {
  let lo = Infinity
  for (let i = 0; i <= 400; i++) lo = Math.min(lo, Math.abs(evalPoly(m.mu, i / 400)))
  return lo
}
