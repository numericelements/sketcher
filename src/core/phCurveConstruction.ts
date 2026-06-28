// ============================================================================
// Polynomial PH (Pythagorean Hodograph) curve-construction primitives — the
// SELF-CONTAINED core port of the sketcher originals.
//
// A PH curve has hodograph r'(t) = (u²−v², 2uv) where u,v are B-splines. The PH
// property is maintained by parameterization: the variables are the u,v control
// points and the curve is always PH by construction.
//
// This module is a FAITHFUL port of:
//   - integrateBD, recomposeBD (+ helpers) from src/sketcher/optimizer/algebra.ts
//   - curveBreakpointContinuities, computePHCurveFromUV from src/sketcher/optimizer/phCurve.ts
//   - phControlPointJacobian from src/sketcher/optimizer/phCurveAnalytic.ts
// translated onto core's own BernsteinDecomposition (`.coeffs`/`.breaks`,
// `.scale`, `.derivative`) — it does NOT import from src/sketcher (layer boundary).
//
// API-translation map (sketcher → core), preserved verbatim below:
//   bd.controlPointsArray  → bd.coeffs
//   bd.distinctKnots       → bd.breaks
//   bd.multiplyByScalar(s) → bd.scale(s)
//   decomposeToBernstein({knots, controlPoints})
//                          → decomposeToBernstein(controlPoints, knots, degree)
//                            (core wants degree explicitly: knots.length−cps−1)
// ============================================================================

import { BernsteinDecomposition, decomposeToBernstein } from './bernstein'
import { leastSquares } from './linalg'
import { evaluate } from './evaluate'
import { plainCoeffs } from './coeffs'
import { findPeriodicSpan, periodicBasis, mod } from './basis'

/** A scalar B-spline (the result of recomposing a Bernstein decomposition). */
export interface SimpleBSpline {
  knots: number[]
  controlPoints: number[]
}

/** Per-variable derivative of the curve's control points. */
export interface CPDerivative {
  dx: number[]
  dy: number[]
}

export interface PHCurveResult {
  controlPoints: { x: number; y: number }[]
  knots: number[]
  degree: number
}

// ----------------------------------------------------------------------------
// Bernstein-decomposition calculus (ported from algebra.ts)
// ----------------------------------------------------------------------------

/**
 * Derivative of a Bernstein decomposition. Faithful port of algebra.ts
 * `derivativeBD` (core's BernsteinDecomposition.derivative() is the same math;
 * kept private here so the module is self-contained and matches the original).
 */
function derivativeBD(bd: BernsteinDecomposition): BernsteinDecomposition {
  const p = bd.degree
  if (p === 0) {
    const zeroSpans = bd.coeffs.map(() => [0])
    return new BernsteinDecomposition(zeroSpans, bd.breaks)
  }

  const newSpans: number[][] = []

  for (let spanIdx = 0; spanIdx < bd.coeffs.length; spanIdx++) {
    const coeffs = bd.coeffs[spanIdx]
    const tA = bd.breaks[spanIdx]
    const tB = bd.breaks[spanIdx + 1]
    const interval = tB - tA

    const derivCoeffs: number[] = []
    for (let i = 0; i < p; i++) {
      derivCoeffs.push((p * (coeffs[i + 1] - coeffs[i])) / interval)
    }
    newSpans.push(derivCoeffs)
  }

  return new BernsteinDecomposition(newSpans, bd.breaks)
}

/**
 * Integrate a Bernstein decomposition (inverse of derivativeBD).
 *
 * For each Bézier segment on [tA, tB] with CPs c₀..cₚ:
 *   New degree: p+1
 *   C₀ = cumulative (integration constant carried from previous segment)
 *   Cₖ = cumulative + ((tB-tA)/(p+1)) * Σᵢ₌₀ᵏ⁻¹ cᵢ   for k = 1..p+1
 *
 * The cumulative value chains across segments: cumulative = C_{p+1} of previous segment.
 */
export function integrateBD(
  bd: BernsteinDecomposition,
  integrationConstant: number = 0,
): BernsteinDecomposition {
  const p = bd.degree
  const newSpans: number[][] = []
  let cumulative = integrationConstant

  for (let spanIdx = 0; spanIdx < bd.coeffs.length; spanIdx++) {
    const coeffs = bd.coeffs[spanIdx]
    const tA = bd.breaks[spanIdx]
    const tB = bd.breaks[spanIdx + 1]
    const interval = tB - tA
    const scale = interval / (p + 1)

    const intCoeffs: number[] = new Array(p + 2)
    intCoeffs[0] = cumulative
    let partialSum = 0
    for (let k = 1; k <= p + 1; k++) {
      partialSum += coeffs[k - 1]
      intCoeffs[k] = cumulative + scale * partialSum
    }
    newSpans.push(intCoeffs)

    // Carry the last value to the next segment
    cumulative = intCoeffs[p + 1]
  }

  return new BernsteinDecomposition(newSpans, bd.breaks)
}

/**
 * Compute the actual continuity order at an interior breakpoint between two
 * adjacent Bézier segments of degree p.
 *
 * Returns the highest k such that the k-th derivatives match (C^k continuity).
 */
function computeContinuityAtBreakpoint(
  bd: BernsteinDecomposition,
  breakpointIndex: number,
  tol: number = 1e-10,
): number {
  // Take successive derivatives and compare boundary values
  let current = bd
  let continuity = -1

  for (let k = 0; k < bd.degree; k++) {
    const leftSegment = current.coeffs[breakpointIndex]
    const rightSegment = current.coeffs[breakpointIndex + 1]
    const leftVal = leftSegment[leftSegment.length - 1]
    const rightVal = rightSegment[0]

    // Use a relative tolerance: compare against the magnitude of the values
    const scale = Math.max(Math.abs(leftVal), Math.abs(rightVal), 1)
    if (Math.abs(leftVal - rightVal) > tol * scale) {
      break
    }
    continuity = k
    current = derivativeBD(current)
  }

  return continuity
}

/**
 * Remove a single knot from a 1D B-spline.
 * Uses the same Tiller-Hanson algorithm as bspline.ts removeKnot, adapted for 1D.
 * Returns new CPs and knots, or null if removal error exceeds tolerance.
 */
function removeKnot1DSimple(
  P: number[],
  knots: number[],
  degree: number,
  knotIndex: number,
  tolerance: number,
): { controlPoints: number[]; knots: number[] } | null {
  const n = P.length
  const u = knots[knotIndex]
  const ord = degree + 1

  // Find rightmost index r of this knot value
  let r = knotIndex
  while (r < knots.length - 1 && Math.abs(knots[r + 1] - u) < 1e-10) {
    r++
  }

  // Count multiplicity s
  let s = 0
  for (let i = 0; i < knots.length; i++) {
    if (Math.abs(knots[i] - u) < 1e-10) s++
  }

  const first = r - degree
  const last = r - s

  if (first < 0 || last >= n - 1) return null

  const temp: number[] = new Array(last - first + 3)
  temp[0] = P[first - 1 >= 0 ? first - 1 : 0]
  temp[last - first + 2] = P[last + 1 < n ? last + 1 : n - 1]

  let i = first
  let j = last
  let ii = 1
  let jj = last - first + 1

  while (j - i > 0) {
    const alphaI = (u - knots[i]) / (knots[i + ord] - knots[i])
    if (Math.abs(alphaI) < 1e-14) {
      temp[ii] = P[i]
    } else if (Math.abs(alphaI - 1) < 1e-14) {
      temp[ii] = temp[ii - 1]
    } else {
      temp[ii] = (P[i] - (1 - alphaI) * temp[ii - 1]) / alphaI
    }

    const alphaJ = (u - knots[j]) / (knots[j + ord] - knots[j])
    if (Math.abs(1 - alphaJ) < 1e-14) {
      temp[jj] = P[j]
    } else if (Math.abs(alphaJ) < 1e-14) {
      temp[jj] = temp[jj + 1]
    } else {
      temp[jj] = (P[j] - alphaJ * temp[jj + 1]) / (1 - alphaJ)
    }

    i++
    ii++
    j--
    jj--
  }

  let removable = false
  if (j - i < 0) {
    const removalError = Math.abs(temp[ii - 1] - temp[jj + 1])
    if (removalError <= tolerance) removable = true
  } else {
    const alphaI = (u - knots[i]) / (knots[i + ord] - knots[i])
    const interpPt = (1 - alphaI) * temp[ii - 1] + alphaI * temp[jj + 1]
    const removalError = Math.abs(P[i] - interpPt)
    if (removalError <= tolerance) {
      removable = true
      temp[ii] = interpPt
    }
  }

  if (!removable) return null

  const newP: number[] = []
  const tempEnd = last - first + 2

  for (let idx = 0; idx < first; idx++) newP.push(P[idx])
  for (let tempIdx = 1; tempIdx < ii; tempIdx++) newP.push(temp[tempIdx])

  const rightStart = j === i ? jj + 1 : jj + 2
  for (let tempIdx = rightStart; tempIdx < tempEnd; tempIdx++) newP.push(temp[tempIdx])

  for (let idx = last + 1; idx < n; idx++) newP.push(P[idx])

  const newKnots = [...knots.slice(0, knotIndex), ...knots.slice(knotIndex + 1)]
  return { controlPoints: newP, knots: newKnots }
}

/**
 * Convert a BernsteinDecomposition back to a B-spline with minimal knot multiplicity.
 *
 * @param bd - The Bernstein decomposition
 * @param maxContinuity - Maximum continuity to detect at interior breakpoints.
 *   Limits how many knots are removed. Use this when the structural continuity
 *   is known to be lower than what the actual values might suggest.
 *   Default: p-1 (detect up to C^(p-1), maximum possible).
 *
 *   May also be a PER-BREAKPOINT array (one continuity per interior breakpoint,
 *   ascending) — used by PH curves whose generator knots have mixed multiplicity,
 *   so each breakpoint is reduced to its own structural continuity (forced).
 */
export function recomposeBD(
  bd: BernsteinDecomposition,
  maxContinuity?: number | number[],
): SimpleBSpline {
  const p = bd.degree
  if (bd.numSpans === 0) {
    return { knots: [], controlPoints: [] }
  }

  if (bd.numSpans === 1) {
    // Single span: just clamped knots
    const knots: number[] = []
    for (let i = 0; i <= p; i++) knots.push(bd.breaks[0])
    for (let i = 0; i <= p; i++) knots.push(bd.breaks[1])
    return { knots, controlPoints: [...bd.coeffs[0]] }
  }

  // Step 1: Build piecewise Bézier form (full multiplicity = C0)
  let knots: number[] = []
  for (let i = 0; i <= p; i++) knots.push(bd.breaks[0])
  for (let s = 1; s < bd.breaks.length - 1; s++) {
    for (let i = 0; i < p; i++) knots.push(bd.breaks[s])
  }
  for (let i = 0; i <= p; i++) knots.push(bd.breaks[bd.breaks.length - 1])

  let controlPoints: number[] = [...bd.coeffs[0]]
  for (let s = 1; s < bd.numSpans; s++) {
    for (let i = 1; i <= p; i++) {
      controlPoints.push(bd.coeffs[s][i])
    }
  }

  // Step 2: At each interior breakpoint, remove excess knots via Boehm removal.
  const perBreak = Array.isArray(maxContinuity)
  const forced = maxContinuity !== undefined
  const cpScale = controlPoints.reduce((m, c) => Math.max(m, Math.abs(c)), 1)
  const removalTol = forced ? Infinity : 1e-8 * cpScale
  const maxK = typeof maxContinuity === 'number' ? maxContinuity : p - 1
  for (let s = bd.numSpans - 2; s >= 0; s--) {
    const continuity = perBreak
      ? ((maxContinuity as number[])[s] ?? 0)
      : forced
        ? maxK
        : Math.min(computeContinuityAtBreakpoint(bd, s), maxK)
    if (continuity < 1) continue // Already minimal (C0 needs multiplicity p)

    // Current multiplicity is p, target is p - continuity
    // Remove (continuity) knots at this breakpoint
    const breakpointValue = bd.breaks[s + 1]

    // Find the first occurrence of this knot in the current knot vector
    const knotIdx = knots.indexOf(breakpointValue)

    for (let rr = 0; rr < continuity; rr++) {
      // Find the last occurrence (remove from the "middle" for stability)
      let lastIdx = knotIdx
      while (lastIdx + 1 < knots.length && knots[lastIdx + 1] === breakpointValue) {
        lastIdx++
      }
      const removeIdx = Math.floor((knotIdx + lastIdx) / 2)

      const result = removeKnot1DSimple(controlPoints, knots, p, removeIdx, removalTol)
      if (!result) break // Can't remove more knots
      controlPoints = result.controlPoints
      knots = result.knots
    }
  }

  return { knots, controlPoints }
}

// ----------------------------------------------------------------------------
// PH curve construction (ported from phCurve.ts)
// ----------------------------------------------------------------------------

/** Degree of a clamped scalar B-spline: knots.length − cps − 1. */
function uvDegreeOf(knots: number[], numCPs: number): number {
  return knots.length - numCPs - 1
}

/**
 * Per-interior-breakpoint CURVE continuity for a polynomial PH curve, aligned
 * with `recomposeBD`'s breakpoint iteration (the BD's interior distinct knots,
 * ascending). At a generator knot of multiplicity m the curve is
 * C^(uvDegree − m + 1).
 */
export function curveBreakpointContinuities(
  distinctKnots: number[],
  uvKnots: number[],
  uvDegree: number,
): number[] {
  const conts: number[] = []
  for (let i = 1; i < distinctKnots.length - 1; i++) {
    const v = distinctKnots[i]
    let mult = 0
    for (const k of uvKnots) if (Math.abs(k - v) < 1e-9) mult++
    conts.push(Math.max(0, uvDegree - mult + 1))
  }
  return conts
}

/**
 * Compute a PH B-spline curve from u,v generating functions.
 *
 *   x'(t) = u(t)² - v(t)²
 *   y'(t) = 2·u(t)·v(t)
 *
 * The curve has degree 2n+1 (product doubles degree, integration adds 1).
 *
 * Core version — returns only { controlPoints, knots, degree } (no metadata).
 */
export function computePHCurveFromUV(
  uCPs: number[],
  vCPs: number[],
  uvKnots: number[],
  uvDegree: number,
  x0: number,
  y0: number,
): PHCurveResult {
  // Step 1: Decompose u and v to Bernstein form
  const uBD = decomposeToBernstein(uCPs, uvKnots, uvDegreeOf(uvKnots, uCPs.length))
  const vBD = decomposeToBernstein(vCPs, uvKnots, uvDegreeOf(uvKnots, vCPs.length))

  // Step 2: Compute hodograph components
  // x' = u² - v²
  const u2 = uBD.multiply(uBD)
  const v2 = vBD.multiply(vBD)
  const xPrime = u2.subtract(v2)

  // y' = 2uv
  const uv = uBD.multiply(vBD)
  const yPrime = uv.scale(2)

  // Step 3: Integrate to get curve coordinates
  const xBD = integrateBD(xPrime, x0)
  const yBD = integrateBD(yPrime, y0)

  // Step 4: Recompose to B-spline form, per-breakpoint continuity.
  const conts =
    uBD.numSpans > 1 ? curveBreakpointContinuities(xBD.breaks, uvKnots, uvDegree) : undefined
  const xSpline = recomposeBD(xBD, conts)
  const ySpline = recomposeBD(yBD, conts)

  // Build control points
  const controlPoints: { x: number; y: number }[] = []
  for (let i = 0; i < xSpline.controlPoints.length; i++) {
    controlPoints.push({ x: xSpline.controlPoints[i], y: ySpline.controlPoints[i] })
  }

  // Curve degree = 2*uvDegree + 1
  const degree = 2 * uvDegree + 1

  return {
    controlPoints,
    knots: xSpline.knots,
    degree,
  }
}

// ----------------------------------------------------------------------------
// Analytic Jacobian (ported from phCurveAnalytic.ts)
// ----------------------------------------------------------------------------

function unitBD(n: number, j: number, knots: number[]): BernsteinDecomposition {
  const e = new Array(n).fill(0)
  e[j] = 1
  return decomposeToBernstein(e, knots, uvDegreeOf(knots, n))
}

/**
 * Jacobian of the control points w.r.t. [x₀, y₀, u₀…, v₀…] (same variable order
 * as the sketcher's PHCurveProblem.getVariables). Returns one {dx,dy} per
 * variable. Exact via Bernstein algebra — no finite differences.
 */
export function phControlPointJacobian(
  uCPs: number[],
  vCPs: number[],
  uvKnots: number[],
  uvDegree: number,
): CPDerivative[] {
  const uBD = decomposeToBernstein(uCPs, uvKnots, uvDegreeOf(uvKnots, uCPs.length))
  const vBD = decomposeToBernstein(vCPs, uvKnots, uvDegreeOf(uvKnots, vCPs.length))
  // Per-breakpoint curve continuity (same rule as computePHCurveFromUV).
  const mc =
    uBD.numSpans > 1 ? curveBreakpointContinuities(uBD.breaks, uvKnots, uvDegree) : undefined
  const recomp = (bd: BernsteinDecomposition) => recomposeBD(bd, mc).controlPoints

  // Number of control points (from the actual hodograph integration).
  const nCP = recomp(integrateBD(uBD.multiply(uBD).subtract(vBD.multiply(vBD)), 0)).length
  const nu = uCPs.length
  const nv = vCPs.length

  const out: CPDerivative[] = []
  // x₀, y₀ shift every control point uniformly.
  out.push({ dx: new Array(nCP).fill(1), dy: new Array(nCP).fill(0) })
  out.push({ dx: new Array(nCP).fill(0), dy: new Array(nCP).fill(1) })

  for (let j = 0; j < nu; j++) {
    const B = unitBD(nu, j, uvKnots)
    const dxPrime = uBD.multiply(B).scale(2) // ∂(u²−v²)/∂u_j = 2 u B_j
    const dyPrime = B.multiply(vBD).scale(2) // ∂(2uv)/∂u_j   = 2 v B_j
    out.push({ dx: recomp(integrateBD(dxPrime, 0)), dy: recomp(integrateBD(dyPrime, 0)) })
  }
  for (let j = 0; j < nv; j++) {
    const B = unitBD(nv, j, uvKnots)
    const dxPrime = vBD.multiply(B).scale(-2) // ∂(−v²)/∂v_j = −2 v B_j
    const dyPrime = uBD.multiply(B).scale(2) //  ∂(2uv)/∂v_j =  2 u B_j
    out.push({ dx: recomp(integrateBD(dxPrime, 0)), dy: recomp(integrateBD(dyPrime, 0)) })
  }
  return out
}

// ----------------------------------------------------------------------------
// Closed PH curve: clamped → periodic conversion (port of the sketcher's
// buildPeriodicPHCurve, src/sketcher/optimizer/phClosedSplineFit.ts).
// ----------------------------------------------------------------------------

/**
 * Build the PERIODIC (closed) PH curve from the CLAMPED PH curve. The clamped curve already
 * lives in the periodic spline space (same interior breakpoints; the seam differs only in
 * representation), so a linear least-squares fit on the periodic basis recovers it essentially
 * exactly — avoiding fragile clamped→periodic knot surgery. seamContinuity c sets the seam
 * junction multiplicity = degree − c (C⁰→5, C¹→4, C²→3); interior joins keep their own
 * multiplicity. Core port: core periodic basis + core leastSquares. (FOUNDATIONS F5.)
 */
export function buildPeriodicPHCurve(
  clampedCPs: { x: number; y: number }[],
  clampedKnots: number[],
  seamContinuity: number,
): { controlPoints: { x: number; y: number }[]; knots: number[]; degree: number } {
  const degree = 5
  // Distinct interior breakpoints in (0,1) WITH the curve's knot multiplicity there.
  const interior: { v: number; mult: number }[] = []
  for (const k of clampedKnots) {
    if (k > 1e-9 && k < 1 - 1e-9) {
      const e = interior.find((x) => Math.abs(x.v - k) < 1e-9)
      if (e) e.mult++; else interior.push({ v: k, mult: 1 })
    }
  }
  interior.sort((a, b) => a.v - b.v)

  // Periodic knot vector (length n = #control points): seam at 0 carries degree−seamContinuity
  // knots; each interior join keeps its own multiplicity (capped at degree).
  const seamMult = degree - seamContinuity
  const Kp: number[] = []
  for (let r = 0; r < seamMult; r++) Kp.push(0)
  for (const b of interior) { const cm = Math.min(degree, b.mult); for (let r = 0; r < cm; r++) Kp.push(b.v) }
  const n = Kp.length

  // Sample the exact clamped curve over [0,1) and least-squares fit the periodic control points.
  const lo = clampedKnots[degree], hi = clampedKnots[clampedKnots.length - degree - 1]
  const m = Math.max(4 * n, 240)
  const A: number[][] = []
  const bx: number[] = [], by: number[] = []
  for (let i = 0; i < m; i++) {
    const tt = i / m
    const p = evaluate(plainCoeffs, clampedCPs, degree, clampedKnots, Math.min(lo + tt * (hi - lo), hi - 1e-9), false)
    const span = findPeriodicSpan(Kp, tt)
    const N = periodicBasis(span, tt, degree, Kp)
    const row = new Array<number>(n).fill(0)
    for (let j = 0; j <= degree; j++) row[mod(span - degree + j, n)] += N[j]
    A.push(row); bx.push(p.x); by.push(p.y)
  }
  const sx = leastSquares(A, bx), sy = leastSquares(A, by)
  const controlPoints = sx.map((x, i) => ({ x, y: sy[i] }))
  return { controlPoints, knots: Kp, degree }
}

// ----------------------------------------------------------------------------
// Closed-PH generator knot helpers (clamped ⇄ periodic chart). Port of
// periodicGenKnots / clampedFromPeriodicGenKnots (phClosedSplineFit.ts). FOUNDATIONS F5.
// ----------------------------------------------------------------------------

/**
 * Periodic generator knot vector (knots in [0,1)) from the clamped chart + seam continuity:
 * the seam sits at 0 with multiplicity μ = (genDegree+1) − seamContinuity (C⁰→3, C¹→2, C²→1);
 * interior knots keep their value & multiplicity.
 */
export function periodicGenKnots(clampedKnots: number[], seamContinuity: number, genDegree = 2): number[] {
  const muSeam = (genDegree + 1) - Math.max(0, Math.min(genDegree, seamContinuity))
  const interior = clampedKnots.filter((k) => k > 1e-9 && k < 1 - 1e-9)
  const out: number[] = []
  for (let i = 0; i < muSeam; i++) out.push(0)
  out.push(...interior)
  out.sort((a, b) => a - b)
  return out
}

/** Inverse of periodicGenKnots: clamped chart (genKnots) + seamContinuity from a periodic vector. */
export function clampedFromPeriodicGenKnots(periodic: number[], genDegree = 2): { genKnots: number[]; seamContinuity: number } {
  const muSeam = periodic.filter((k) => Math.abs(k) < 1e-9).length
  const interior = periodic.filter((k) => k > 1e-9 && k < 1 - 1e-9).sort((a, b) => a - b)
  const seamContinuity = Math.max(0, Math.min(genDegree, (genDegree + 1) - muSeam))
  const genKnots: number[] = []
  for (let i = 0; i <= genDegree; i++) genKnots.push(0)
  genKnots.push(...interior)
  for (let i = 0; i <= genDegree; i++) genKnots.push(1)
  return { genKnots, seamContinuity }
}
