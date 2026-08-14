// ============================================================================
// THE TANGENT INDICATRIX — the unit tangent traced on the unit sphere.
//
// For any rational PH curve in this codebase c′ = N/w² and ‖c′‖ = σ/w², so the w² CANCELS:
//
//     T = c′/‖c′‖ = N/σ
//
// and that cancellation is the PH property seen on the sphere. PH ⟺ the unit tangent is rational ⟺ the
// indicatrix is a rational spherical curve. Two consequences the figures rest on:
//
//   • T HAS NO DENOMINATOR w. It is finite and smooth at the pole, where the curve itself runs off to
//     infinity. The pole is invisible in the curve's shape and visible here.
//   • T IS CLOSED, including the direction at t = ±∞. Both ends approach N_top/σ_top, and that vector is
//     already unit: leading N = 𝒜_top i 𝒜̄_top has norm |𝒜_top|² = leading σ. So the indicatrix is a
//     closed curve on S² over the projective line, not an arc with loose ends.
//
// AND IT CUSPS AT EVERY POLE. T′ = (N′σ − Nσ′)/σ², so T′ = 0 exactly when {N, N′} are dependent — which
// is what the no-log condition says. One pole (Σ = 0) kills N′(r) and σ′(r) outright; m poles make them
// both 2Σ_k times themselves so the two terms cancel. Either way the indicatrix stops dead. Measured in
// __tests__/tangentIndicatrix.test.ts; the geometry is Kalkan–Scharler–Schröcker–Šír Rem 4.7 in our chart.
//
// This module takes any member exposing {N, sigma} — one-pole and multi-pole both do — so the sphere
// picture is written once for every family that has a Hopf square.
// ============================================================================
import type { Vec3 } from './quaternion'

/** Everything the sphere needs: the Wronskian and the speed numerator, in the power basis. */
export interface HasHodograph {
  readonly N: readonly number[][]
  readonly sigma: readonly number[]
}

const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const derivative = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

/** T(t) = N/σ. Unit by construction, not by normalising — see the header. */
export const indicatrixAt = (m: HasHodograph, t: number): Vec3 => {
  const s = evalPoly(m.sigma, t)
  return { x: evalPoly(m.N[0], t) / s, y: evalPoly(m.N[1], t) / s, z: evalPoly(m.N[2], t) / s }
}

/**
 * T at t = ±∞: the ratio of leading coefficients, which both ends of the real line approach. Taken from
 * the highest coefficient that is not numerically dead, so a member whose top spinor coefficient happens
 * to vanish still gets an honest answer rather than 0/0.
 */
export function indicatrixAtInfinity(m: HasHodograph): Vec3 {
  const scale = Math.max(...m.sigma.map(Math.abs), 1e-300)
  let top = m.sigma.length - 1
  while (top > 0 && Math.abs(m.sigma[top]) < 1e-13 * scale) top--
  const s = m.sigma[top]
  return { x: m.N[0][top] / s, y: m.N[1][top] / s, z: m.N[2][top] / s }
}

/** ‖T′(t)‖ — zero exactly at the cusps, so this is the number a figure should show at a pole. */
export function indicatrixSpeedAt(m: HasHodograph, t: number): number {
  const s = evalPoly(m.sigma, t)
  const ds = evalPoly(derivative(m.sigma), t)
  const v = [0, 1, 2].map((c) => {
    const n = evalPoly(m.N[c], t)
    const dn = evalPoly(derivative(m.N[c]), t)
    return (dn * s - n * ds) / (s * s)
  })
  return Math.hypot(v[0], v[1], v[2])
}

/** Worst |‖T‖ − 1| over a sample — the identity a figure can display instead of asserting it. */
export function sphereResidual(m: HasHodograph, count = 121): number {
  let worst = 0
  for (let i = 0; i < count; i++) {
    const t = Math.tan(Math.PI * ((i + 0.5) / count - 0.5))
    const T = indicatrixAt(m, t)
    worst = Math.max(worst, Math.abs(Math.hypot(T.x, T.y, T.z) - 1))
  }
  return worst
}

/** A sub-arc of the indicatrix, t running over [t0, t1] — used to pick out the part [0,1] the curve uses. */
export const indicatrixArc = (m: HasHodograph, t0: number, t1: number, count = 160): Vec3[] =>
  Array.from({ length: count + 1 }, (_, i) => indicatrixAt(m, t0 + ((t1 - t0) * i) / count))

/**
 * The same sub-arc, but with segments bounded in SPHERICAL ARC instead of in the parameter — so it
 * renders as a curve rather than as a polygon.
 *
 * This is `indicatrixNear`'s lesson applied to the drawn piece: |T′| varies by orders of magnitude
 * along the indicatrix, so a uniform sampling in t spends most of its points where the curve is barely
 * moving and leaves the fast stretch as three long chords. Raising the count fixes the symptom at the
 * cost of thousands of points almost all of which land where nothing is happening — and it fails again
 * the moment a dial makes some stretch faster.
 *
 * The step is sized from the speed here and then HALVED until the chord it actually buys is under
 * `chord`; measuring the chord rather than trusting the local speed is what bounds the segment, since
 * |T′| can climb steeply inside a single step. `maxPoints` is a hard stop so a pathological member
 * cannot hang the render; when it bites, the arc is still complete but coarser, never truncated.
 */
export function indicatrixArcSmooth(
  m: HasHodograph, t0: number, t1: number, chord = 0.004, maxPoints = 6000,
): Vec3[] {
  const span = t1 - t0
  const sign = Math.sign(span) || 1
  const out: Vec3[] = [indicatrixAt(m, t0)]
  let t = t0
  for (let i = 0; i < maxPoints && sign * (t1 - t) > 0; i++) {
    let dt = Math.min(
      Math.abs(span) / 8,
      Math.max(Math.abs(span) * 1e-6, chord / Math.max(indicatrixSpeedAt(m, t), 1e-9)),
    )
    const a = out[out.length - 1]
    let next = t + sign * dt
    if (sign * (next - t1) > 0) next = t1
    let b = indicatrixAt(m, next)
    for (let k = 0; k < 40 && Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 2 * chord; k++) {
      dt /= 2
      next = t + sign * dt
      b = indicatrixAt(m, next)
    }
    t = next
    out.push(b)
  }
  // The hard stop can leave the last point short of t1; end exactly where asked either way.
  const end = indicatrixAt(m, t1)
  const last = out[out.length - 1]
  if (Math.hypot(last.x - end.x, last.y - end.y, last.z - end.z) > 1e-12) out.push(end)
  return out
}

/**
 * The WHOLE indicatrix, as a closed polyline over the projective line.
 *
 * Sampling uniformly in t cannot do this — the interesting structure sits wherever σ is small and the
 * tails run to infinity. Sampling uniformly in θ with t = tan θ covers all of ℝ in a bounded parameter
 * and spends its points evenly along the curve's own sweep. The two open ends are then joined through
 * the exact point at infinity, so the returned polyline closes.
 */
export function indicatrixLoop(m: HasHodograph, count = 480): Vec3[] {
  const pts: Vec3[] = []
  for (let i = 0; i <= count; i++) {
    const theta = Math.PI * (i / count - 0.5)
    // Skip the two endpoints: tan(±π/2) is infinite. The exact limit closes the loop instead.
    if (i === 0 || i === count) continue
    pts.push(indicatrixAt(m, Math.tan(theta)))
  }
  const inf = indicatrixAtInfinity(m)
  return [inf, ...pts, inf]
}

/**
 * The whole closed indicatrix with its segments bounded in SPHERICAL ARC — the version to draw.
 *
 * `indicatrixLoop`'s uniform sampling in θ = arctan t is already far better than uniform in t, but it
 * is still not uniform on the sphere, and the residue is large: measured at the degree-6 seed with the
 * pole close in (r = 1.06), the worst single chord at 900 points is **0.166** on a unit sphere — a
 * sixth of the radius, drawn as one straight line. Tripling to 3000 points only gets it to 0.050. It
 * renders as a polygon and no affordable uniform count fixes it, because the ratio being fought is not
 * a constant: it grows as the pole approaches the drawn piece.
 *
 * Stepping in θ with dT/dθ = T′(t)·(1 + t²) as the speed, then halving until the measured chord is
 * under target, bounds every segment for a few hundred points. The two open ends are joined through
 * the exact point at infinity, so the polyline still closes.
 */
export function indicatrixLoopSmooth(m: HasHodograph, chord = 0.004, maxPoints = 8000): Vec3[] {
  const LIMIT = Math.PI / 2
  const EDGE = 1e-9                      // tan(±π/2) is infinite; the exact limit closes the loop
  const inf = indicatrixAtInfinity(m)
  const out: Vec3[] = [inf]
  let theta = -LIMIT + EDGE
  out.push(indicatrixAt(m, Math.tan(theta)))
  for (let i = 0; i < maxPoints && theta < LIMIT - EDGE; i++) {
    const a = out[out.length - 1]
    const t = Math.tan(theta)
    let dth = Math.min(0.2, Math.max(1e-9, chord / Math.max(indicatrixSpeedAt(m, t) * (1 + t * t), 1e-9)))
    let next = Math.min(LIMIT - EDGE, theta + dth)
    let b = indicatrixAt(m, Math.tan(next))
    for (let k = 0; k < 40 && Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 2 * chord; k++) {
      dth /= 2
      next = Math.min(LIMIT - EDGE, theta + dth)
      b = indicatrixAt(m, Math.tan(next))
    }
    theta = next
    out.push(b)
  }
  out.push(inf)
  return out
}

/** Total spherical length of the whole closed indicatrix — the scale any local budget should be read against. */
export function indicatrixLength(m: HasHodograph, count = 480): number {
  const pts = indicatrixLoop(m, count)
  let s = 0
  for (let i = 1; i < pts.length; i++) {
    s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z)
  }
  return s
}

/**
 * A neighbourhood of the indicatrix around t₀, measured in SPHERICAL ARC LENGTH rather than in the
 * parameter — one polyline running in through t₀ and out the other side.
 *
 * WHY NOT A PARAMETER WINDOW. Two figures have now got this wrong in two different ways, and both
 * failures are the same fact: |T′| varies by orders of magnitude along the curve, so a fixed window in
 * t buys an unpredictable amount of arc. Take it too small near a fast stretch and the corner is three
 * points and looks like a polygon; take it big enough for the slow stretch and it swallows the whole
 * indicatrix and reads as a second curve drawn on top of the first. Neither is fixable by choosing a
 * better constant, because the dial changes |T′| by sevenfold while you watch.
 *
 * So the step is adapted: each one advances the same small amount of ARC, dt = target/|T′| clamped, and
 * the walk stops when the budget is spent. The result covers the same visible span of sphere at every
 * pole position and every twist, and its segments are bounded — which is what "resolution" means here.
 *
 * At a cusp |T′| = 0, so the clamp is what carries the walk across it; that is correct rather than a
 * workaround, since the curve is barely moving there and a large parameter step buys little arc.
 *
 * THE BUDGET IS NOT ALWAYS SPENDABLE, and callers must not assume it is. One side can reach the point
 * at infinity — where the indicatrix stops moving — with arc left over, so the returned span is at
 * most 2·arcBudget and sometimes much less. Scale the budget to indicatrixLength if the drawn span
 * needs to stay a fixed FRACTION of the curve; on a short indicatrix a generous absolute budget is
 * half of everything, which is the "second curve drawn on top" failure again.
 */
export function indicatrixNear(
  m: HasHodograph, t0: number, arcBudget = 0.4, steps = 200,
): Vec3[] {
  const target = arcBudget / steps
  // Generous, because it only bites where |T′| is tiny — right at the cusp, where the curve is barely
  // moving and a big parameter step still buys almost no arc. A small cap there stalls the walk: it
  // spends its whole iteration budget without reaching the arc budget, and one side comes out short.
  const DT_MAX = 0.6
  const walk = (sign: 1 | -1): Vec3[] => {
    const out: Vec3[] = []
    let t = t0
    let spent = 0
    for (let i = 0; i < steps * 20 && spent < arcBudget; i++) {
      const a = indicatrixAt(m, t)
      // A first guess from the speed HERE, then rejection: near a cusp |T′| climbs steeply inside a
      // single step, so a step sized from its starting speed can overshoot by an order of magnitude.
      // Measuring the chord and halving is what actually bounds the segment, which is the property
      // the figure needs.
      let dt = Math.min(DT_MAX, Math.max(1e-7, target / Math.max(indicatrixSpeedAt(m, t), 1e-9)))
      let b = indicatrixAt(m, t + sign * dt)
      let d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
      for (let k = 0; k < 40 && d > 2 * target && dt > 1e-7; k++) {
        dt /= 2
        b = indicatrixAt(m, t + sign * dt)
        d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
      }
      spent += d
      t += sign * dt
      out.push(b)
    }
    return out
  }
  return [...walk(-1).reverse(), indicatrixAt(m, t0), ...walk(1)]
}
