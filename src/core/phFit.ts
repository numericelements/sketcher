// ============================================================================
// PH spline FITTING (Generate) — core port of the sketcher's hodograph-matching fits.
//
// The PH constraint lives on the hodograph: r'(t) must be a perfect square w(t)². Given a
// freehand stroke C(t), match its hodograph h = C' with w², then integrate r = C(t₀) + ∫w².
// The fit is made LINEAR by the pointwise complex square root: g(t) = √|h|·exp(i·½·arg h)
// (arg continuously unwrapped) → an ordinary least-squares fit of the complex generator w to g.
//
// Core port of src/sketcher/optimizer/phSplineFit.ts (open) — closed in 8b. Returns a plain
// core result (generator + curve); the sketcher layer maps it to PHMetadata (layer boundary —
// core must not import sketcher types).
// ============================================================================
import { decomposeToBernstein } from './bernstein'
import { leastSquares } from './linalg'
import { computePHCurveFromUV, phControlPointJacobian, buildPeriodicPHCurve } from './phCurveConstruction'
import { findOpenSpan, openBasis } from './basis'
import { evaluate } from './evaluate'
import { plainCoeffs } from './coeffs'

/** Core PH-fit result: the generator (the PH source of truth) + the built curve. */
export interface PHFitResult {
  uControlPoints: number[]
  vControlPoints: number[]
  uvKnots: number[]
  uvDegree: number
  origin: { x: number; y: number }
  controlPoints: { x: number; y: number }[]
  knots: number[]
  degree: number
  closed?: boolean
  wrapSign?: number
  seamContinuity?: number
}

export interface PHSplineFitOptions {
  /** Generator degree: 2 → quintic PH, C² joins (default). */
  generatorDegree?: number
  /** Samples per stroke span for the √h least-squares fit (default 12). */
  samplesPerSpan?: number
}

/**
 * Fit a polynomial PH spline to an OPEN B-spline `{controlPoints, knots, degree}` by hodograph
 * matching. The generator inherits the stroke's segmentation (one generator span per stroke
 * span). Returns null if the input is too small or the linear solve fails. Faithful port of
 * `fitPHSplineToBSpline`.
 */
export function fitOpenPHSpline(
  controlPoints: { x: number; y: number }[],
  knots: number[],
  degree: number,
  options: PHSplineFitOptions = {},
): PHFitResult | null {
  const genDegree = options.generatorDegree ?? 2
  const samplesPerSpan = options.samplesPerSpan ?? 12
  if (controlPoints.length < 2) return null

  try {
    // 1. Target hodograph h = C' (per coordinate).
    const xs = controlPoints.map((p) => p.x)
    const ys = controlPoints.map((p) => p.y)
    const hx = decomposeToBernstein(xs, knots, degree).derivative()
    const hy = decomposeToBernstein(ys, knots, degree).derivative()

    const breaks = hx.breaks
    const numSpans = breaks.length - 1
    if (numSpans < 1) return null

    // 2. Generator knot vector: clamped, single interior knots at the stroke breakpoints.
    const genKnots: number[] = []
    for (let i = 0; i <= genDegree; i++) genKnots.push(breaks[0])
    for (let i = 1; i < numSpans; i++) genKnots.push(breaks[i])
    for (let i = 0; i <= genDegree; i++) genKnots.push(breaks[numSpans])
    const numGenCPs = genKnots.length - genDegree - 1

    // 3. Sample g = √h with a continuously unwrapped half-angle.
    const tHi = breaks[numSpans]
    const ts: number[] = [], reTarget: number[] = [], imTarget: number[] = []
    let prevAngle = 0, started = false
    for (let s = 0; s < numSpans; s++) {
      const a = breaks[s], b = breaks[s + 1]
      for (let kk = 0; kk < samplesPerSpan; kk++) {
        const t = a + ((kk + 0.5) / samplesPerSpan) * (b - a)
        const re = hx.evaluate(t), im = hy.evaluate(t)
        const mag = Math.hypot(re, im)
        let angle: number
        if (mag < 1e-9) { angle = prevAngle } else {
          angle = Math.atan2(im, re)
          if (started) {
            while (angle - prevAngle > Math.PI) angle -= 2 * Math.PI
            while (angle - prevAngle < -Math.PI) angle += 2 * Math.PI
          }
        }
        prevAngle = angle; started = true
        const r = Math.sqrt(mag), half = angle / 2
        ts.push(t); reTarget.push(r * Math.cos(half)); imTarget.push(r * Math.sin(half))
      }
    }

    // 4. Linear least-squares fit of w = u + iv to √h on the generator basis.
    const A: number[][] = []
    for (const t of ts) {
      const tc = Math.min(t, tHi - 1e-9)
      const span = findOpenSpan(genDegree, genKnots, tc)
      const N = openBasis(span, tc, genDegree, genKnots)
      const row = new Array<number>(numGenCPs).fill(0)
      for (let j = 0; j <= genDegree; j++) row[span - genDegree + j] = N[j]
      A.push(row)
    }
    const solU = leastSquares(A, reTarget)
    const solV = leastSquares(A, imTarget)

    // 5. Integrate w² from the stroke's start → the PH spline.
    const o = { x: controlPoints[0].x, y: controlPoints[0].y }
    const curve = computePHCurveFromUV(solU, solV, genKnots, genDegree, o.x, o.y)
    return {
      uControlPoints: solU, vControlPoints: solV, uvKnots: genKnots, uvDegree: genDegree, origin: o,
      controlPoints: curve.controlPoints, knots: curve.knots, degree: curve.degree,
    }
  } catch {
    return null
  }
}

export interface ClosedPHSplineFitOptions {
  /** Generator segments around the loop (defaults to the stroke's CP count). */
  segments?: number
  /** Samples per generator segment for the √h fit (default 8). */
  samplesPerSegment?: number
  /** Seam continuity: 0 = C⁰ corner, 1 = G¹, 2 = G² (default 2). */
  seamContinuity?: number
  /** Explicit clamped generator knot vector (overrides `segments`) — knot moving. */
  genKnots?: number[]
}

/**
 * Fit a closed polynomial PH spline to a closed periodic B-spline stroke. Faithful core port
 * of `fitClosedPHSpline`: periodic hodograph by central differences → wrap sign from the turning
 * number → √h half-angle samples → linear fit with the seam wrap folded in → Newton closure
 * projection → periodic representation. Returns a core PHFitResult (closed) or null.
 */
export function fitClosedPHSpline(
  strokeCPs: { x: number; y: number }[],
  strokeDegree: number,
  strokeKnots: number[],
  options: ClosedPHSplineFitOptions = {},
): PHFitResult | null {
  if (strokeCPs.length < 3) return null
  const genDegree = 2
  const customKnots = options.genKnots
  const m = customKnots ? customKnots.length - 2 * genDegree - 1 : Math.max(4, options.segments ?? strokeCPs.length)
  const n = m + genDegree
  const NS = Math.max(8 * m, options.samplesPerSegment ? options.samplesPerSegment * m : 8 * m)

  try {
    const evalStroke = (t: number) => evaluate(plainCoeffs, strokeCPs, strokeDegree, strokeKnots, ((t % 1) + 1) % 1, true)
    const eps = 1e-4
    const hAt = (t: number): { re: number; im: number } => {
      const a = evalStroke(t - eps), b = evalStroke(t + eps)
      return { re: (b.x - a.x) / (2 * eps), im: (b.y - a.y) / (2 * eps) }
    }

    // Turning number parity → wrap sign s.
    let winding = 0
    const h0 = hAt(0)
    let prevAng = Math.atan2(h0.im, h0.re)
    for (let kk = 1; kk <= NS; kk++) {
      const h = hAt((kk / NS) % 1)
      const ang = Math.atan2(h.im, h.re)
      let d = ang - prevAng
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      winding += d; prevAng += d
    }
    const s = (Math.round(winding / (2 * Math.PI)) % 2 === 0) ? 1 : -1

    // √h samples (continuously unwrapped half-angle).
    const ts: number[] = [], gRe: number[] = [], gIm: number[] = []
    {
      let ang = Math.atan2(hAt(0).im, hAt(0).re)
      let prevA = ang
      for (let i = 0; i < NS; i++) {
        const t = (i + 0.5) / NS
        const h = hAt(t)
        const a = Math.atan2(h.im, h.re)
        let d = a - prevA
        while (d > Math.PI) d -= 2 * Math.PI
        while (d < -Math.PI) d += 2 * Math.PI
        ang += d; prevA = a
        const r = Math.sqrt(Math.hypot(h.re, h.im)), half = ang / 2
        ts.push(t); gRe.push(r * Math.cos(half)); gIm.push(r * Math.sin(half))
      }
    }

    // Clamped quadratic generator knots.
    let uvKnots: number[]
    if (customKnots) uvKnots = [...customKnots]
    else {
      uvKnots = []
      for (let i = 0; i <= genDegree; i++) uvKnots.push(0)
      for (let i = 1; i < m; i++) uvKnots.push(i / m)
      for (let i = 0; i <= genDegree; i++) uvKnots.push(1)
    }

    // Wrap substitution by seam continuity.
    const nWrap = Math.max(0, Math.min(2, options.seamContinuity ?? 2))
    const K = n - nWrap
    const hFirst = uvKnots[genDegree + 1] - uvKnots[genDegree]
    const hLast = uvKnots[n] - uvKnots[n - 1]
    const ratio = hFirst > 1e-12 ? hLast / hFirst : 1
    const expand = (f: number[]): number[] => {
      const c = f.slice(0, K)
      if (nWrap >= 2) c.push(s * ((1 + ratio) * f[0] - ratio * f[1]))
      if (nWrap >= 1) c.push(s * f[0])
      return c
    }
    const foldRow = (bRow: number[]): number[] => {
      const row = new Array<number>(K).fill(0)
      for (let i = 0; i < K; i++) row[i] = bRow[i]
      if (nWrap >= 1) row[0] += bRow[n - 1] * s
      if (nWrap >= 2) { row[0] += bRow[n - 2] * s * (1 + ratio); row[1] += bRow[n - 2] * s * (-ratio) }
      return row
    }

    // Basis matrix folded onto the K free vars.
    const tHi = 1 - 1e-9
    const M: number[][] = []
    for (const t of ts) {
      const tc = Math.min(t, tHi)
      const span = findOpenSpan(genDegree, uvKnots, tc)
      const N = openBasis(span, tc, genDegree, uvKnots)
      const bRow = new Array<number>(n).fill(0)
      for (let j = 0; j <= genDegree; j++) bRow[span - genDegree + j] = N[j]
      M.push(foldRow(bRow))
    }

    const uFree = leastSquares(M, gRe), vFree = leastSquares(M, gIm)
    const o = evalStroke(0)

    // Newton projection to close the gap r(1) − r(0) = ∮ w².
    const buildCurve = () => computePHCurveFromUV(expand(uFree), expand(vFree), uvKnots, genDegree, o.x, o.y)
    let curve = buildCurve()
    for (let iter = 0; iter < 8; iter++) {
      const cps = curve.controlPoints, last = cps.length - 1
      const gapX = cps[last].x - cps[0].x, gapY = cps[last].y - cps[0].y
      if (Math.hypot(gapX, gapY) < 1e-7) break
      const jac = phControlPointJacobian(expand(uFree), expand(vFree), uvKnots, genDegree)
      const dUx: number[] = [], dUy: number[] = [], dVx: number[] = [], dVy: number[] = []
      for (let i = 0; i < n; i++) {
        dUx.push(jac[2 + i].dx[last] - jac[2 + i].dx[0]); dUy.push(jac[2 + i].dy[last] - jac[2 + i].dy[0])
        dVx.push(jac[2 + n + i].dx[last] - jac[2 + n + i].dx[0]); dVy.push(jac[2 + n + i].dy[last] - jac[2 + n + i].dy[0])
      }
      const fUx = foldRow(dUx), fUy = foldRow(dUy), fVx = foldRow(dVx), fVy = foldRow(dVy)
      const Jx = [...fUx, ...fVx], Jy = [...fUy, ...fVy]
      const a = Jx.reduce((t2, x) => t2 + x * x, 0)
      const b = Jx.reduce((t2, x, i) => t2 + x * Jy[i], 0)
      const c2 = Jy.reduce((t2, x) => t2 + x * x, 0)
      const det = a * c2 - b * b
      if (Math.abs(det) < 1e-20) break
      const l0 = (c2 * gapX - b * gapY) / det, l1 = (-b * gapX + a * gapY) / det
      for (let j = 0; j < 2 * K; j++) {
        const step = -(Jx[j] * l0 + Jy[j] * l1)
        if (j < K) uFree[j] += step; else vFree[j - K] += step
      }
      curve = buildCurve()
    }

    // Periodic representation (display geometry); generator stays clamped (PH source of truth).
    const periodic = buildPeriodicPHCurve(curve.controlPoints, curve.knots, nWrap)
    return {
      uControlPoints: expand(uFree), vControlPoints: expand(vFree), uvKnots, uvDegree: genDegree, origin: { x: o.x, y: o.y },
      controlPoints: periodic.controlPoints, knots: periodic.knots, degree: periodic.degree,
      closed: true, wrapSign: s, seamContinuity: nWrap,
    }
  } catch {
    return null
  }
}
