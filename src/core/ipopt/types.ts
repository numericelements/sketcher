/**
 * Types and Interfaces for Interior Point Optimizer
 *
 * Based on IPOPT's problem formulation:
 *   minimize f(x)
 *   subject to c(x) <= 0  (inequality constraints)
 *
 * We use the barrier formulation:
 *   minimize t * f(x) - sum(log(-c_i(x)))
 */

import type { Matrix } from './linearAlgebra'

// ============================================================================
// Optimization Problem Interface
// ============================================================================

/**
 * Interface for optimization problems.
 * The optimizer calls these methods to get objective, constraints, and gradients.
 */
export interface OptimizationProblem {
  /** Number of variables */
  readonly numVariables: number

  /** Current variable values */
  getVariables(): number[]

  /** Set variable values */
  setVariables(x: number[]): void

  // ----- Objective Function -----

  /** Compute objective value f(x) */
  computeObjective(): number

  /** Compute gradient of objective ∇f(x) */
  computeObjectiveGradient(): number[]

  // ----- Constraints -----

  /** Number of constraints */
  readonly numConstraints: number

  /**
   * Number of equality constraints (default 0).
   * Convention: the first numEqualityConstraints entries of computeConstraints()
   * are equalities h(x) = 0; the rest are inequalities c(x) ≤ 0.
   */
  readonly numEqualityConstraints: number

  /**
   * Compute constraint values c(x).
   * Convention: c(x) < 0 is feasible, c(x) >= 0 is violated.
   */
  computeConstraints(): number[]

  /**
   * Compute Jacobian of constraints.
   * Returns m × n matrix where J[i][j] = ∂c_i/∂x_j
   */
  computeConstraintJacobian(): Matrix

  // ----- Constraint Management (Sliding Support) -----

  /**
   * Get signs of constraints from initial configuration.
   * sign[i] = -1 if c_i was positive, +1 if negative.
   * Used to maintain constraint direction during optimization.
   */
  getConstraintSigns(): number[]

  /**
   * Get indices of inactive constraints.
   * Inactive constraints are not enforced (allowed to slide).
   */
  getInactiveConstraints(): Set<number>

  /**
   * Recompute signs and inactive set from current state.
   * Called after accepting a step.
   */
  updateConstraintState(): void

  // ----- Optional: Hessian -----

  /**
   * Compute Hessian of objective ∇²f(x).
   * If not provided, identity matrix is used.
   */
  computeObjectiveHessian?(): Matrix

  /**
   * Diagonal of the objective Hessian in variable order — O(n), no dense matrix.
   * Only meaningful when the objective Hessian is diagonal (the least-squares drag).
   * Lets the banded barrier assemble the band directly without materialising the
   * dense n×n. If absent, the banded direct-build path falls back to the dense one.
   */
  computeObjectiveHessianDiagonal?(): number[]

  /**
   * Compute the weighted sum of constraint Hessians: Σ wᵢ·∇²cᵢ(x).
   * weights[i] corresponds to constraint i (same order as computeConstraints).
   * If not provided, constraint Hessians are assumed zero (Gauss-Newton only).
   */
  computeConstraintHessianWeightedSum?(weights: number[]): Matrix
}

// ============================================================================
// Optimizer Configuration
// ============================================================================

export interface OptimizerConfig {
  // ----- Convergence Tolerances -----

  /** Barrier convergence tolerance (default: 1e-6) */
  barrierTolerance: number

  /** Newton decrement tolerance for inner loop (default: 1e-8) */
  newtonTolerance: number

  /** Constraint violation tolerance (default: 1e-8) */
  constraintTolerance: number

  // ----- Iteration Limits -----

  /** Maximum total iterations (default: 500) */
  maxIterations: number

  /** Maximum inner loop iterations per barrier parameter (default: 50) */
  maxInnerIterations: number

  // ----- Trust Region -----

  /** Initial trust region radius (default: 1.0) */
  initialTrustRadius: number

  /** Maximum trust region radius (default: 10.0) */
  maxTrustRadius: number

  /** Minimum trust region radius (default: 1e-15) */
  minTrustRadius: number

  // ----- Barrier Method -----

  /** Barrier parameter multiplier μ (default: 10) */
  barrierMu: number

  // ----- Step Acceptance (Trust Region) -----

  /** Step acceptance threshold η (default: 0.1) */
  acceptanceThreshold: number

  // ----- IPOPT Features -----

  /** Enable Second-Order Correction (default: true) */
  enableSOC: boolean

  /** Enable Feasibility Restoration (default: true) */
  enableFeasibilityRestoration: boolean

  /** Enable Filter method (default: true) */
  enableFilter: boolean

  /** Enable Watchdog (default: true) */
  enableWatchdog: boolean

  /**
   * E10 fix, DEFAULT ON (lab notebook E10e): compute ρ's predicted reduction
   * from the model decrease OF THE STEP ACTUALLY TAKEN, −(gᵀp + ½pᵀHp), instead
   * of the full-Newton decrement supplied by computeBarrier. With the
   * Newton-decrement prediction, a δ-limited step always looks bad (actual ≪
   * predicted-for-Newton), ρ never clears the 0.75 expansion gate, and the trust
   * region becomes a ratchet: it shrinks but can never re-expand. Works on the
   * dense, banded, and arrowhead paths. OFF — experiments only.
   */
  consistentPredictedReduction?: boolean

  /**
   * EXPERIMENTAL (lab notebook E10d): replace the DENSE dogleg trust-region solve
   * with a caller-supplied near-exact solver (e.g. Moré–Sorensen / Conn–Gould–Toint
   * 7.3.4 from Eric's closed-curve TrustRegionSubproblem). Dogleg quality depends
   * on its Newton point, which is garbage when the barrier Hessian is
   * near-singular at a knife-edge coefficient; the λ-iteration solve is not.
   * Dense (non-banded) path only. Default undefined (unchanged behavior).
   */
  trustRegionSolverOverride?: (
    gradient: number[],
    hessian: number[][],
    delta: number,
  ) => { step: number[]; hitsBoundary: boolean; lambda: number }

  /**
   * E10 fix, DEFAULT ON (lab notebook E10c): a TRUE-constraint-violation
   * rejection does not consume iteration budget (δ still shrinks ×0.25, bounded
   * by minTrustRadius → restoration). This is the budget-accounting half of the
   * closed-curve discipline: the shrink-until-feasible search is an inner
   * sub-procedure; iterations are only spent on feasible candidates. OFF
   * reproduces the pre-fix stall (F9: 7/15 dead ticks) — experiments only.
   */
  freeFeasibilityShrinks?: boolean

  /**
   * EXPERIMENTAL (lab notebook E10): skip the fraction-to-boundary step scaling.
   * The rule scales the whole step by αMax from the LINEARIZED constraints; at a
   * knife-edge coefficient it measured as wrong in both directions at once —
   * throttling accepted steps ~6× while the scaled step still violated the true
   * nonlinear constraints. With this flag the step goes to evaluateStep unscaled
   * and feasibility is enforced solely by true-evaluation reject + TR shrink
   * (Eric's closed-curve discipline). Default false (unchanged behavior).
   */
  skipFractionToBoundary?: boolean

  /** Watchdog trial limit (default: 3) */
  watchdogTrialLimit: number

  /** Enable BFGS approximation of Lagrangian Hessian (default: true) */
  enableBFGS: boolean

  /**
   * Return the best feasible iterate visited rather than the final one
   * (default: false). The watchdog/filter may accept temporarily-worse steps,
   * so the final iterate is not guaranteed to be the lowest-objective feasible
   * point. Enable this when the caller wants the optimizer's best result, not
   * its stopping point.
   */
  returnBestFeasible?: boolean

  /**
   * Recompute the constraint signs + inactive ("sliding") set from the current
   * curve at each OUTER barrier iteration (default: false). Lets the sliding
   * set re-anchor to the evolving curve mid-optimization instead of being
   * frozen at the start of the solve. Requires the problem to implement
   * `updateConstraintState`; the caller is responsible for verifying the
   * extrema count afterwards (refreshing signs can let the count drift; the
   * per-solve barrier no longer guarantees it).
   */
  dynamicConstraints?: boolean

  // ----- Regularization -----

  /** Hessian regularization (default: 1e-8) */
  hessianRegularization: number

  // ----- Warm Starting -----

  /** Warm-start barrier parameter (skip early outer iterations) */
  warmStartT?: number

  /** Warm-start trust region radius */
  warmStartDelta?: number

  // ----- Linear solve -----

  /**
   * Solve the inner Newton/trust-region system with a BANDED LDLᵀ factorization
   * (O(n·b²)) instead of dense Cholesky (O(n³)). Valid ONLY when the barrier
   * Hessian is banded in the interleaved [x₀,y₀,…] ordering — an OPEN planar drag,
   * no equality constraints — AND well-conditioned (the scaled-robust regime). The
   * solver's behaviour is unchanged; only the linear-algebra cost drops. Default false.
   */
  bandedSolve?: boolean

  /**
   * The problem is a CLOSED (periodic) curve. Only then can a constraint's support
   * wrap the seam, so only then do we split the banded Hessian into band + seam
   * block (arrowhead). For an OPEN curve every constraint is local — even on a tiny
   * curve where one constraint spans more than half the variables — so the band must
   * cover its full spread (no seam). Default false.
   */
  closed?: boolean

  /**
   * Fold the EXACT analytic constraint-curvature Hessian Σ wᵢ·∇²cᵢ into the barrier
   * Hessian (full Newton) instead of dropping it (Gauss-Newton). Requires the problem
   * to implement computeConstraintHessianWeightedSum. Near a binding curvature bound
   * this tracks the cursor closer, holds the bound tighter, and converges in fewer
   * iterations. Open planar drags only (the method returns zeros for closed). Default
   * false (opt-in, matching ne-core's enable_exact_hessian).
   */
  enableExactHessian?: boolean

  // ----- Debug -----

  /** Print debug information (default: false) */
  verbose: boolean
}

export const defaultConfig: OptimizerConfig = {
  barrierTolerance: 1e-6,
  newtonTolerance: 1e-8,
  constraintTolerance: 1e-8,
  maxIterations: 500,
  maxInnerIterations: 50,
  initialTrustRadius: 1.0,
  maxTrustRadius: 10.0,
  minTrustRadius: 1e-15,
  barrierMu: 10,
  acceptanceThreshold: 0.1,
  enableSOC: true,
  enableFeasibilityRestoration: true,
  enableFilter: true,
  enableWatchdog: true,
  watchdogTrialLimit: 3,
  enableBFGS: true,
  hessianRegularization: 1e-8,
  verbose: false,
  // The E10 stall-mechanism fixes (LAB_NOTEBOOK_DRAG; F9 bench 46% → 74% @20
  // iters, 92% @200, budget-monotonicity restored). ON by default — the OFF
  // state reproduces the pre-fix pathology and exists for experiments only.
  consistentPredictedReduction: true,
  freeFeasibilityShrinks: true,
}

// ============================================================================
// Optimizer Result
// ============================================================================

export interface OptimizerResult {
  /** Final variable values */
  variables: number[]

  /** Final objective value */
  objective: number

  /** Final constraint violation (max of positive constraint values) */
  constraintViolation: number

  /** Number of iterations */
  iterations: number

  /** Whether optimization converged */
  converged: boolean

  /** Termination reason */
  terminationReason: TerminationReason

  /** Final barrier parameter (for warm starting) */
  finalT?: number

  /** Final trust region radius (for warm starting) */
  finalDelta?: number
}

export const TerminationReason = {
  Converged: 'converged',
  MaxIterations: 'max_iterations',
  TrustRadiusTooSmall: 'trust_radius_too_small',
  NumericalError: 'numerical_error',
  FeasibilityRestorationFailed: 'feasibility_restoration_failed',
} as const

export type TerminationReason = (typeof TerminationReason)[keyof typeof TerminationReason]

// ============================================================================
// Filter Entry (for IPOPT Filter Method)
// ============================================================================

export interface FilterEntry {
  /** Objective value */
  objective: number

  /** Constraint violation (theta) */
  constraintViolation: number
}

// ============================================================================
// Optimization State (internal)
// ============================================================================

export interface OptimizationState {
  /** Current variables */
  x: number[]

  /** Current objective value */
  f: number

  /** Current constraint values */
  c: number[]

  /** Current constraint violation (theta) */
  theta: number

  /** Current barrier objective value: t*f - Σlog(-f_i) */
  phi: number

  /** Constraint signs */
  signs: number[]

  /** Inactive constraint indices */
  inactiveSet: Set<number>

  /** Barrier parameter t */
  t: number

  /** Trust region radius */
  delta: number

  /** Iteration count */
  iteration: number

  /** Filter entries */
  filter: FilterEntry[]

  /** Watchdog state */
  watchdog: WatchdogState | null

  /** Best feasible iterate visited so far (variables). */
  bestX: number[]
  /** Objective at bestX. */
  bestF: number
  /** Constraint violation at bestX. */
  bestTheta: number
}

export interface WatchdogState {
  /** Saved state before watchdog trials */
  savedX: number[]
  savedF: number
  savedTheta: number
  savedPhi: number

  /** Number of watchdog trials remaining */
  trialsRemaining: number
}
