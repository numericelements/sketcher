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
