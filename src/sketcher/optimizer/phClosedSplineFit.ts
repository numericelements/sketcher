// Closure-projection helpers for closed polynomial PH splines — the generator-space Newton
// projections that drive the closure gap ∮w² → 0 (and re-impose the seam wrap). The fit and
// construction math now lives in core (core/phFit.ts fitClosedPHSpline, core/phCurveConstruction.ts
// buildPeriodicPHCurve / periodicGenKnots / clampedFromPeriodicGenKnots); the sketcher fit wrapper
// lives in phCurve.ts. These two helpers are the remaining un-ported sketcher pieces (task #10).

import { computePHCurveFromUV, type PHCurveResult, type PHMetadata } from './phCurve'
import { phControlPointJacobian } from './phCurveAnalytic'
import { buildPeriodicPHCurve } from '../../core'

/** Closed PH generator degree (a quadratic generator ⇒ a quintic curve). */
export const GEN_DEGREE = 2

/**
 * Project a generator (u,v) EXACTLY onto the closed-curve manifold: re-impose the
 * seam wrap (anti-periodic, sign s; nWrap derivative matches) and Newton-project
 * the closure gap ∮w² → 0, holding the free interior control points' shape. Used
 * after the curvature-extrema optimizer, whose equality constraints are only
 * penalty-soft — this cleans the seam so the periodic re-fit is exact (no spurious
 * seam curvature wiggle). The correction is tiny, so the extrema count is kept.
 */
export function projectClosedPHGenerator(
  u: number[],
  v: number[],
  uvKnots: number[],
  originX: number,
  originY: number,
  s: number,
  seamContinuity: number,
): { uControlPoints: number[]; vControlPoints: number[] } {
  const degree = GEN_DEGREE
  const n = u.length
  const nWrap = Math.max(0, Math.min(2, seamContinuity))
  const K = n - nWrap
  const hFirst = uvKnots[degree + 1] - uvKnots[degree]
  const hLast = uvKnots[n] - uvKnots[n - 1]
  const ratio = hFirst > 1e-12 ? hLast / hFirst : 1
  const expand = (f: number[]): number[] => {
    const c = f.slice(0, K)
    if (nWrap >= 2) c.push(s * ((1 + ratio) * f[0] - ratio * f[1]))
    if (nWrap >= 1) c.push(s * f[0])
    return c
  }
  const foldRow = (bRow: number[]): number[] => {
    const row = new Array(K).fill(0)
    for (let i = 0; i < K; i++) row[i] = bRow[i]
    if (nWrap >= 1) row[0] += bRow[n - 1] * s
    if (nWrap >= 2) { row[0] += bRow[n - 2] * s * (1 + ratio); row[1] += bRow[n - 2] * s * (-ratio) }
    return row
  }
  const uFree = u.slice(0, K), vFree = v.slice(0, K)
  const build = () => computePHCurveFromUV(expand(uFree), expand(vFree), uvKnots, degree, originX, originY)
  let curve = build()
  for (let iter = 0; iter < 8; iter++) {
    const cps = curve.controlPoints, last = cps.length - 1
    const gapX = cps[last].x - cps[0].x, gapY = cps[last].y - cps[0].y
    if (Math.hypot(gapX, gapY) < 1e-9) break
    const jac = phControlPointJacobian(expand(uFree), expand(vFree), uvKnots, degree)
    const dUx: number[] = [], dUy: number[] = [], dVx: number[] = [], dVy: number[] = []
    for (let i = 0; i < n; i++) {
      dUx.push(jac[2 + i].dx[last] - jac[2 + i].dx[0])
      dUy.push(jac[2 + i].dy[last] - jac[2 + i].dy[0])
      dVx.push(jac[2 + n + i].dx[last] - jac[2 + n + i].dx[0])
      dVy.push(jac[2 + n + i].dy[last] - jac[2 + n + i].dy[0])
    }
    const fUx = foldRow(dUx), fUy = foldRow(dUy), fVx = foldRow(dVx), fVy = foldRow(dVy)
    const Jx = [...fUx, ...fVx], Jy = [...fUy, ...fVy]
    const a = Jx.reduce((t, x) => t + x * x, 0)
    const b = Jx.reduce((t, x, i) => t + x * Jy[i], 0)
    const c2 = Jy.reduce((t, x) => t + x * x, 0)
    const det = a * c2 - b * b
    if (Math.abs(det) < 1e-20) break
    const l0 = (c2 * gapX - b * gapY) / det, l1 = (-b * gapX + a * gapY) / det
    for (let j = 0; j < 2 * K; j++) {
      const step = -(Jx[j] * l0 + Jy[j] * l1)
      if (j < K) uFree[j] += step; else vFree[j - K] += step
    }
    curve = build()
  }
  return { uControlPoints: expand(uFree), vControlPoints: expand(vFree) }
}

/**
 * Close an EXISTING open polynomial PH spline at C⁰ — preserving its shape and
 * the corner where the two ends meet. The endpoint drag has already brought the
 * last point onto the first, so r(1)−r(0) = ∮w² is already small; a short
 * least-norm Newton projection (moving the generator control points, origin
 * held) drives it to zero. No wrap constraint is imposed, so the seam stays C⁰
 * (a corner) — the "smooth seam" step raises continuity later.
 */
export function closeOpenPHSpline(meta: PHMetadata): PHCurveResult | null {
  const u = [...meta.uControlPoints]
  const v = [...meta.vControlPoints]
  const knots = meta.uvKnots, p = meta.uvDegree, ox = meta.origin.x, oy = meta.origin.y
  const n = u.length
  if (n < 3) return null

  const dot = (a: number[], b: number[]) => a.reduce((s, v2, i) => s + v2 * b[i], 0)
  const build = () => computePHCurveFromUV(u, v, knots, p, ox, oy)
  let curve = build()
  for (let iter = 0; iter < 10; iter++) {
    const cps = curve.controlPoints
    const last = cps.length - 1
    const gapX = cps[last].x - cps[0].x, gapY = cps[last].y - cps[0].y
    if (Math.hypot(gapX, gapY) < 1e-7) break
    const jac = phControlPointJacobian(u, v, knots, p)
    // Variables: u_i = jac[2+i], v_i = jac[2+n+i]; gap rows only (origin held).
    const Jx = new Array(2 * n).fill(0), Jy = new Array(2 * n).fill(0)
    for (let i = 0; i < n; i++) {
      Jx[i] = jac[2 + i].dx[last] - jac[2 + i].dx[0]
      Jy[i] = jac[2 + i].dy[last] - jac[2 + i].dy[0]
      Jx[n + i] = jac[2 + n + i].dx[last] - jac[2 + n + i].dx[0]
      Jy[n + i] = jac[2 + n + i].dy[last] - jac[2 + n + i].dy[0]
    }
    const a = dot(Jx, Jx), b = dot(Jx, Jy), c2 = dot(Jy, Jy)
    const det = a * c2 - b * b
    if (Math.abs(det) < 1e-20) break
    const l0 = (c2 * gapX - b * gapY) / det, l1 = (-b * gapX + a * gapY) / det
    for (let j = 0; j < 2 * n; j++) {
      const step = -(Jx[j] * l0 + Jy[j] * l1)
      if (j < n) u[j] += step; else v[j - n] += step
    }
    curve = build()
  }
  const cps = curve.controlPoints
  cps[cps.length - 1] = { x: cps[0].x, y: cps[0].y }
  // Wrap sign from the generator end tangents (√ of the curve's end tangents).
  const s = u[0] * u[n - 1] + v[0] * v[n - 1] < 0 ? -1 : 1
  // C⁰ closure: express in the periodic representation with a full (degree-mult)
  // seam junction, so the seam is a real movable junction (corner for now).
  const periodic = buildPeriodicPHCurve(cps, curve.knots, 0)
  return {
    controlPoints: periodic.controlPoints,
    knots: periodic.knots,
    degree: periodic.degree,
    metadata: { ...curve.metadata, closed: true, wrapSign: s, seamContinuity: 0 },
  }
}
