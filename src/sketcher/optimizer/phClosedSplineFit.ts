// Being migrated to core/ incrementally; remove this once a file is on core.
/**
 * Fit a CLOSED polynomial PH spline to a closed (periodic) B-spline stroke, by
 * the same hodograph-matching idea as the open case (see phSplineFit.ts) plus
 * the two extra conditions a closed PH curve needs:
 *
 *   1. SMOOTH SEAM — the generator must wrap continuously. For a closed loop the
 *      tangent turns by 2π·k (turning number k), so w = √(w²) picks up e^{iπk}:
 *      w(1) = s·w(0) with s = (−1)^k (anti-periodic for a simple loop, k odd).
 *      Either way w² is periodic, so the curve is smooth. For a uniform clamped
 *      QUADRATIC generator, C¹ wrap (⇒ C² curve at the seam) is two linear
 *      conditions on the boundary control points:
 *          c_{n-1} = s·c_0,     c_{n-2} = s·(2 c_0 − c_1).
 *      Baking these in leaves the interior control points free for a plain
 *      linear least-squares fit to √h.
 *
 *   2. CLOSURE — a periodic generator does NOT close the curve on its own;
 *      r(1) − r(0) = ∮ w² must vanish (two real, nonlinear conditions). The √h
 *      fit of a closed stroke already nearly closes (∮ h = 0), so a short
 *      Newton projection on the gap r(1)−r(0) finishes the job. The gap and its
 *      Jacobian come for free: gap = lastCP − firstCP, ∂gap/∂generator from
 *      phControlPointJacobian.
 *
 * Result: a clamped degree-5 B-spline marked closed (evaluated on [0,1], drawn
 * with a closing segment), C² at the seam and interior, carrying 'polynomial' PH
 * metadata for later editing.
 */

import { computePHCurveFromUV, type PHCurveResult, type PHMetadata } from './phCurve'
import { phControlPointJacobian } from './phCurveAnalytic'
import {
  buildPeriodicPHCurve as coreBuildPeriodicPHCurve,
  periodicGenKnots as corePeriodicGenKnots,
  clampedFromPeriodicGenKnots as coreClampedFromPeriodicGenKnots,
  fitClosedPHSpline as coreFitClosedPHSpline,
} from '../../core'
import type { Point2D } from '../types/curve'

/**
 * Re-express an exact clamped closed PH curve in the PERIODIC representation
 * (closed, knots in [0,1) with a real seam junction), so it behaves like every
 * other closed B-spline — movable junction knots and all. The clamped curve
 * already lives in the periodic spline space (same interior breakpoints, the
 * seam differs only in representation), so a linear least-squares fit on the
 * periodic basis recovers it essentially exactly; this avoids fragile
 * clamped→periodic knot surgery.
 *
 * seamContinuity c sets the seam-junction multiplicity = degree − c (C⁰→5,
 * C¹→4, C²→3). Interior joins keep multiplicity 3 (C², from single generator
 * knots).
 */
export function buildPeriodicPHCurve(
  clampedCPs: Point2D[],
  clampedKnots: number[],
  seamContinuity: number,
): { controlPoints: Point2D[]; knots: number[]; degree: number } {
  return coreBuildPeriodicPHCurve(clampedCPs, clampedKnots, seamContinuity)
}

/** Closed PH generator degree (a quadratic generator ⇒ a quintic curve). */
export const GEN_DEGREE = 2

/**
 * Reconstruct the generator's PERIODIC knot vector (knots in [0,1)) from the
 * clamped chart + seam continuity. This is the representation in which the seam
 * is an ORDINARY knot: it sits at value 0 with multiplicity
 *   μ_seam = (degree+1) − seamContinuity   (C⁰→3, C¹→2, C²→1),
 * and the interior generator knots keep their value & multiplicity. The clamped
 * storage and this periodic view describe the same closed generator — this is
 * just the chart in which knot editing is natural.
 */
export function periodicGenKnots(clampedKnots: number[], seamContinuity: number): number[] {
  return corePeriodicGenKnots(clampedKnots, seamContinuity, GEN_DEGREE)
}

/**
 * Inverse of {@link periodicGenKnots}: derive the clamped chart (genKnots) and
 * seam continuity from a periodic generator knot vector. μ_seam = number of
 * knots at the seam value 0 ⇒ seamContinuity = (degree+1) − μ_seam; the interior
 * knots become the clamped interior (boundary always clamped to degree+1).
 */
export function clampedFromPeriodicGenKnots(periodic: number[]): { genKnots: number[]; seamContinuity: number } {
  return coreClampedFromPeriodicGenKnots(periodic, GEN_DEGREE)
}

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

export interface ClosedPHSplineFitOptions {
  /** Generator segments around the loop (defaults to the stroke's CP count). */
  segments?: number
  /** Samples per generator segment for the √h fit (default 8). */
  samplesPerSegment?: number
  /** Seam continuity of the resulting curve: 0 = C⁰ corner, 1 = G¹, 2 = G²
   *  (default 2). It equals the number of generator wrap-derivative matches. */
  seamContinuity?: number
  /** Explicit clamped generator knot vector (overrides `segments`). Used by knot
   *  moving, which preserves the moved — possibly non-uniform — knots. */
  genKnots?: number[]
}

/**
 * Fit a closed polynomial PH spline to a closed periodic B-spline stroke.
 * Returns a clamped, closed PHCurveResult, or null if the input is too small.
 */
export function fitClosedPHSpline(
  strokeCPs: Point2D[],
  strokeDegree: number,
  strokeKnots: number[],
  options: ClosedPHSplineFitOptions = {},
): PHCurveResult | null {
  const f = coreFitClosedPHSpline(strokeCPs, strokeDegree, strokeKnots, options)
  if (!f) return null
  return {
    controlPoints: f.controlPoints,
    knots: f.knots,
    degree: f.degree,
    metadata: {
      kind: 'polynomial',
      uvDegree: f.uvDegree,
      uControlPoints: f.uControlPoints,
      vControlPoints: f.vControlPoints,
      uvKnots: f.uvKnots,
      origin: f.origin,
      closed: true,
      wrapSign: f.wrapSign,
      seamContinuity: f.seamContinuity,
    },
  }
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
