/**
 * LEGACY optimizer entry points — what remains after the core migration
 * (2026-07-04). ALL control-point curvature-extrema drags (every algebraic
 * family, open + closed PH) run on core/'s trust-region engine; the
 * `optimizeCurve` plumbing, the periodic polynomial problem, and the
 * symmetry/fixed-variable wrappers were DELETED with their editor routes.
 *
 * Still live here (2026-07-05): ONLY the PH variant families —
 * optimizeABPHCurve / optimizeComplexRationalPHCurve /
 * optimizeRealRationalPHCurve (no core ports; a contained legacy island) —
 * plus optimizePHCurve, kept for the fit tests (the editor no longer calls
 * it). The Farin drags migrated to core (E26 complex, E27 rational — the
 * pure-weight count-guarded walks); the rational/complex problem classes
 * were deleted with them.
 */

import { InteriorPointOptimizer } from './InteriorPointOptimizer'
import type { OptimizerConfig } from './types'
import type { ComplexPoint, Point2D } from '../types/curve'
import { PHCurveProblem, type PHCurvatureBoundOptions } from './PHCurveProblem'
import { ComplexRationalPHCurveProblem } from './ComplexRationalPHCurveProblem'
import { computePHCurveFromUV, type PHMetadata, type PHCurveResult, type ComplexRationalPHMetadata, type ComplexRationalPHCurveResult } from './phCurve'
import { computeComplexRationalPHFromSD } from './complexRationalPHCurve'
import { computeABPHCurve, type ABPHMetadata, type ABPHCurveResult } from './abPHCurve'
import { ABPHCurveProblem } from './ABPHCurveProblem'
import { computeRealRationalPHCurve, type RealRationalPHMetadata, type RealRationalPHCurveResult } from './realRationalPHCurve'
import { RealRationalPHCurveProblem } from './RealRationalPHCurveProblem'

// ============================================================================
// Types
// ============================================================================

export interface OptimizeResult {
  /** Optimized X control points */
  controlPointsX: number[]
  /** Optimized Y control points */
  controlPointsY: number[]
  /** Number of optimizer iterations */
  iterations: number
  /** Whether optimization converged */
  converged: boolean
  /** Final objective value (distance from target) */
  objective: number
  /** Final constraint violation */
  constraintViolation: number
}

export interface OptimizeRationalResult extends OptimizeResult {
  /** Optimized weight control points */
  controlPointsW: number[]
}

export interface OptimizeOptions {
  /** Maximum iterations (default: 100) */
  maxIterations?: number
  /** Cap on the inner Newton iterations per barrier subproblem (default: 50).
   *  Lowering to ~5 makes each outer iteration much cheaper for interactive
   *  dragging at a small cost to the exact feasible point reached. */
  maxInnerIterations?: number
  /** Print debug info (default: false) */
  verbose?: boolean
  /** Enable Second-Order Correction (default: true) */
  enableSOC?: boolean
  /** Enable Feasibility Restoration (default: true) */
  enableFeasibilityRestoration?: boolean
  /** Enable Filter method (default: true) */
  enableFilter?: boolean
  /** Enable Watchdog (default: true) */
  enableWatchdog?: boolean
  /** Enable BFGS Lagrangian-Hessian approximation (default: true). Set false
   *  for a Gauss-Newton solve: the drag objective Σ½‖cp−t‖² has an exactly
   *  identity Hessian, so disabling BFGS uses that (no dense quasi-Newton
   *  matrix) and typically converges in far fewer iterations. */
  enableBFGS?: boolean
  /** Preserve inflection count (zeros of curvature numerator) */
  preserveInflections?: boolean
  /** AB-PH only: also bound the curvature-extrema count (sign changes of g)
   *  while editing, stacked on top of the PH equality constraints. */
  preserveCurvatureExtrema?: boolean
  /** Polynomial PH only: bound the curvature VALUE |κ| ≤ curvatureBound live
   *  during the drag (the degree-8 P± = curvatureBound·σ² ± 2(uv'−vu') ≥ 0). */
  constrainCurvatureValue?: boolean
  /** κ_max for constrainCurvatureValue (the inverse minimum turning radius). */
  curvatureBound?: number
  /** Subdivision depth for the curvature-value certificate (default 2). */
  curvatureSubdivisions?: number
  /** Closed polynomial PH only: hold the curve closed (∮w²=0) and the seam wrap
   *  continuous as equality constraints, and use the seam-aware inactive set for
   *  extrema preservation. Absent ⇒ open curve. */
  closed?: { wrapSign: number; seamContinuity: number }
  /** Force the constrained optimizer's inactive set to ∅ — every sign anchor
   * stays active, so the sign-change boundary cannot slide. Default false. */
  disableSliding?: boolean
}

// ============================================================================
// Main API
// ============================================================================

// ============================================================================
// PH Curve Optimization
// ============================================================================

export interface OptimizePHResult {
  /** Optimized curve result (CPs, knots, degree) */
  curveResult: PHCurveResult
  /** Number of optimizer iterations */
  iterations: number
  /** Whether optimization converged */
  converged: boolean
  /** Final objective value */
  objective: number
}

/**
 * Optimize a PH curve by moving a control point to a target position.
 * The optimizer adjusts u,v generating functions to match the target while
 * keeping the curve PH by construction.
 */
export function optimizePHCurve(
  metadata: PHMetadata,
  curveCPs: Point2D[],
  targetX: number,
  targetY: number,
  cpIndex: number,
  options: OptimizeOptions = {}
): OptimizePHResult {
  const config: Partial<OptimizerConfig> = {
    maxIterations: options.maxIterations ?? 50,
    verbose: options.verbose ?? false,
    enableSOC: options.enableSOC ?? true,
    enableFeasibilityRestoration: false,
    enableFilter: options.enableFilter ?? true,
    enableWatchdog: options.enableWatchdog ?? true,
    enableBFGS: options.enableBFGS ?? true,
  }

  // Optional curvature-value bound |κ| ≤ κ_max and/or curvature-extrema-count
  // preservation, enforced live during the drag.
  const bound: PHCurvatureBoundOptions = {
    ...(options.constrainCurvatureValue && Number.isFinite(options.curvatureBound ?? Infinity)
      ? {
          curvatureBound: options.curvatureBound,
          subdivisions: options.curvatureSubdivisions ?? 2,
          constrained: true,
        }
      : {}),
    ...(options.preserveCurvatureExtrema ? { preserveCurvatureExtrema: true } : {}),
    ...(options.closed ? { closed: options.closed } : {}),
  }

  const problem = new PHCurveProblem(metadata, curveCPs, targetX, targetY, cpIndex, bound)
  const optimizer = new InteriorPointOptimizer(problem, config)
  const result = optimizer.optimize()

  // Extract optimized u,v and rebuild curve
  problem.setVariables(result.variables)
  const vars = result.variables
  const numU = metadata.uControlPoints.length
  const numV = metadata.vControlPoints.length
  const x0 = vars[0]
  const y0 = vars[1]
  const uCPs = vars.slice(2, 2 + numU)
  const vCPs = vars.slice(2 + numU, 2 + numU + numV)

  const curveResult = computePHCurveFromUV(
    uCPs, vCPs, metadata.uvKnots, metadata.uvDegree, x0, y0
  )

  return {
    curveResult,
    iterations: result.iterations,
    converged: result.converged,
    objective: result.objective,
  }
}

// ============================================================================
// Complex Rational PH Curve Optimization
// ============================================================================

export interface OptimizeComplexRationalPHResult {
  /** Optimized curve result */
  curveResult: ComplexRationalPHCurveResult
  /** Number of optimizer iterations */
  iterations: number
  /** Whether optimization converged */
  converged: boolean
  /** Final objective value */
  objective: number
}

/**
 * Optimize a complex rational PH curve by moving a control point to a target.
 * The optimizer adjusts S (generating function) and origin to match the target
 * while keeping the curve PH by construction via S². D is kept fixed.
 */
export function optimizeComplexRationalPHCurve(
  metadata: ComplexRationalPHMetadata,
  curveCPs: ComplexPoint[],
  targetX: number,
  targetY: number,
  cpIndex: number,
  options: OptimizeOptions = {}
): OptimizeComplexRationalPHResult {
  const config: Partial<OptimizerConfig> = {
    maxIterations: options.maxIterations ?? 50,
    verbose: options.verbose ?? false,
    enableSOC: options.enableSOC ?? true,
    enableFeasibilityRestoration: false,
    enableFilter: options.enableFilter ?? true,
    enableWatchdog: options.enableWatchdog ?? true,
  }

  const problem = new ComplexRationalPHCurveProblem(
    metadata, curveCPs, targetX, targetY, cpIndex,
    options.preserveCurvatureExtrema ?? false,
  )
  const optimizer = new InteriorPointOptimizer(problem, config)
  const result = optimizer.optimize()

  // Extract optimized origin + S variables; D stays fixed from metadata
  problem.setVariables(result.variables)
  const vars = result.variables
  const x0 = vars[0]
  const y0 = vars[1]
  const numU = metadata.sUControlPoints.length
  const numV = metadata.sVControlPoints.length
  const uCPs = vars.slice(2, 2 + numU)
  const vCPs = vars.slice(2 + numU, 2 + numU + numV)

  const curveResult = computeComplexRationalPHFromSD(
    uCPs, vCPs, metadata.sKnots, metadata.sDegree,
    metadata.dReControlPoints, metadata.dImControlPoints, metadata.dKnots, metadata.dDegree,
    x0, y0,
  )

  return {
    curveResult,
    iterations: result.iterations,
    converged: result.converged,
    objective: result.objective,
  }
}

// ============================================================================
// (A, B, S) PH Curve Optimization
// ============================================================================

export interface OptimizeABPHResult {
  /** Optimized curve result */
  curveResult: ABPHCurveResult
  /** Number of optimizer iterations */
  iterations: number
  /** Whether optimization converged */
  converged: boolean
  /** Final objective value */
  objective: number
  /** Final constraint violation */
  constraintViolation: number
}

/**
 * Optimize an (A, B, S) PH curve by moving a control point to a target.
 * Uses equality constraints W = S² to maintain the PH property.
 */
export function optimizeABPHCurve(
  metadata: ABPHMetadata,
  curveCPs: ComplexPoint[],
  targetX: number,
  targetY: number,
  cpIndex: number,
  options: OptimizeOptions = {}
): OptimizeABPHResult {
  const config: Partial<OptimizerConfig> = {
    maxIterations: options.maxIterations ?? 50,
    verbose: options.verbose ?? false,
    enableSOC: options.enableSOC ?? true,
    enableFeasibilityRestoration: options.enableFeasibilityRestoration ?? true,
    enableFilter: options.enableFilter ?? true,
    enableWatchdog: options.enableWatchdog ?? true,
  }

  const problem = new ABPHCurveProblem(
    metadata, curveCPs, targetX, targetY, cpIndex,
    options.preserveCurvatureExtrema ?? false,
  )
  const optimizer = new InteriorPointOptimizer(problem, config)
  const result = optimizer.optimize()

  // Rebuild curve from optimized variables
  problem.setVariables(result.variables)
  const curveResult = computeABPHCurve(problem.getMetadata())

  return {
    curveResult,
    iterations: result.iterations,
    converged: result.converged,
    objective: result.objective,
    constraintViolation: result.constraintViolation,
  }
}

// ============================================================================
// Real Rational PH Curve Optimization
// ============================================================================

export interface OptimizeRealRationalPHResult {
  curveResult: RealRationalPHCurveResult
  iterations: number
  converged: boolean
  objective: number
  constraintViolation: number
}

/**
 * Optimize a real rational PH curve by moving a control point to a target.
 * Like AB optimization but with fewer variables (no bIm).
 */
export function optimizeRealRationalPHCurve(
  metadata: RealRationalPHMetadata,
  curveCPs: import('../types/curve').WeightedPoint2D[],
  targetX: number,
  targetY: number,
  cpIndex: number,
  options: OptimizeOptions = {}
): OptimizeRealRationalPHResult {
  const config: Partial<OptimizerConfig> = {
    maxIterations: options.maxIterations ?? 50,
    verbose: options.verbose ?? false,
    enableSOC: options.enableSOC ?? true,
    enableFeasibilityRestoration: options.enableFeasibilityRestoration ?? true,
    enableFilter: options.enableFilter ?? true,
    enableWatchdog: options.enableWatchdog ?? true,
  }

  const problem = new RealRationalPHCurveProblem(metadata, curveCPs, targetX, targetY, cpIndex)
  const optimizer = new InteriorPointOptimizer(problem, config)
  const result = optimizer.optimize()

  // Rebuild curve from optimized variables
  problem.setVariables(result.variables)
  const curveResult = computeRealRationalPHCurve(problem.getMetadata())

  return {
    curveResult,
    iterations: result.iterations,
    converged: result.converged,
    objective: result.objective,
    constraintViolation: result.constraintViolation,
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export type { BSpline2D, BSpline, KnotVector, ControlPoints, RationalBSpline2D } from './bsplineTypes'
export { knotAt, cpAt, topology } from './bsplineTypes'
export type { OptimizerConfig, OptimizerResult } from './types'
export { TerminationReason } from './types'
export { computeOpenComplexCurvatureExtremaParameters, computeClosedComplexCurvatureExtremaParameters, computeComplexCurvatureConstraintState, computeOpenComplexCurvatureConstraintState } from './complexAlgebra'
export type { ComplexRationalConstraintState } from './complexAlgebra'
export type { PHMetadata, PHCurveResult, ComplexRationalPHMetadata, ComplexRationalPHCurveResult } from './phCurve'
export { computePHCurveFromUV, createDefaultSpiral } from './phCurve'
export { createComplexRationalPHFromTwoPoints, createStraightComplexRationalPH, computeComplexRationalPHFromSD } from './complexRationalPHCurve'
export type { ABPHMetadata, ABPHCurveResult } from './abPHCurve'
export { createABPHFromTwoPoints, computeABPHCurve } from './abPHCurve'
