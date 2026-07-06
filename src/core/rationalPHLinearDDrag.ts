// Drag for the exactly-PH rational family with a LINEAR denominator (rationalPHLinearD.ts).
//
// Unlike the AB drag, this family is PH BY CONSTRUCTION — the curve is reconstructed exactly
// from the free params (s0, s2, d1, origin) with s1 = −2·s2·r forced. So there are NO PH
// equality constraints to fight: the drag is a PURE inequality problem (the Ñ sliding
// mechanism), exactly like the frozen-D (S,D) problem — but with D genuinely varying (linear),
// so the curve is truly rational and Ñ is honest (sign-identical to the drawn curve's g).
//
// Variables are the 8 real family params, not spline coefficients:
//     [ s0Re, s0Im, s2Re, s2Im, d1Re, d1Im, originX, originY ]
// Objective = weighted Σ½‖CPᵢ(θ) − targetᵢ‖² over the reconstructed control points.
// Constraints = the active Ñ coefficients holding their drag-start sign (Law 2). The param
// space is tiny, so all derivatives are finite-differenced (robust; analytic is a later swap).
import { assignSignsNeighbor } from './bernstein'
import { computeInactiveSetBySign, structuralMargins } from './curvatureProblem'
import { curvatureExtremaReducedNumeratorRationalPH } from './rationalPHCurvature'
import { rationalPHLinearDFromParams, type RationalPHLinearDCurve, type RationalPHLinearDParams } from './rationalPHLinearD'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import type { OptimizationProblem } from './ipopt/types'
import type { Matrix } from './ipopt/linearAlgebra'

export interface RationalPHLinearDDragOptions {
  maxIterations?: number
  targetWeights?: number[]
  /** Hold the curvature-extrema S⁻ bound via the Ñ sliding mechanism (default false). */
  preserveCurvatureExtrema?: boolean
}

const NV = 8 // s0(2) + s2(2) + d1(2) + origin(2)

function paramsToVars(p: RationalPHLinearDParams): number[] {
  return [p.s0.re, p.s0.im, p.s2.re, p.s2.im, p.d1.re, p.d1.im, p.origin.x, p.origin.y]
}
function varsToParams(x: number[]): RationalPHLinearDParams {
  return {
    s0: { re: x[0], im: x[1] },
    s2: { re: x[2], im: x[3] },
    d1: { re: x[4], im: x[5] },
    origin: { x: x[6], y: x[7] },
  }
}

/** Reduced curvature-extrema numerator Ñ's flat coefficients for a reconstructed curve. */
function reducedNumeratorCoeffs(c: RationalPHLinearDCurve): number[] {
  const sDeg = c.sReCPs.length - 1
  return curvatureExtremaReducedNumeratorRationalPH(
    c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1,
  ).flatCoeffs()
}

class RationalPHLinearDDragProblem implements OptimizationProblem {
  private vars: number[]
  private readonly targets: { x: number; y: number }[]
  private readonly weights: number[]

  private constrainCurvature: boolean
  private readonly activeIdx: number[] = []
  private readonly activeSigns: number[] = []
  private readonly margins: number[] = []

  constructor(
    start: RationalPHLinearDParams,
    targets: { x: number; y: number }[],
    weights: number[],
    constrainCurvature: boolean,
  ) {
    this.vars = paramsToVars(start)
    this.targets = targets
    this.weights = weights
    this.constrainCurvature = constrainCurvature

    if (constrainCurvature) {
      // Snapshot Ñ's sign pattern + active (non-sliding) set from the INITIAL params (re-deriving
      // mid-solve would let the bound drift). Robust IPOPT regime: neighbour signs, structural
      // margins, raw (unscaled) constraints — identical to the AB and closed problems.
      const Nc = reducedNumeratorCoeffs(this.curve())
      const signs = assignSignsNeighbor(Nc)
      const inactive = computeInactiveSetBySign(signs, Nc.map(Math.abs))
      for (let i = 0; i < signs.length; i++) if (!inactive.has(i)) { this.activeIdx.push(i); this.activeSigns.push(signs[i]) }
      this.margins = structuralMargins(Nc, this.activeIdx)
    }
  }

  private curve(): RationalPHLinearDCurve {
    return rationalPHLinearDFromParams(varsToParams(this.vars))
  }

  get numVariables(): number { return NV }
  get numConstraints(): number { return this.constrainCurvature ? this.activeIdx.length : 0 }
  get numEqualityConstraints(): number { return 0 } // PH is by construction — no equalities

  getVariables(): number[] { return [...this.vars] }
  setVariables(x: number[]): void { this.vars = [...x] }

  computeObjective(): number {
    const cps = this.curve().controlPoints
    let f = 0
    const n = Math.min(cps.length, this.targets.length)
    for (let i = 0; i < n; i++) {
      const dx = cps[i].re - this.targets[i].x, dy = cps[i].im - this.targets[i].y
      f += this.weights[i] * 0.5 * (dx * dx + dy * dy)
    }
    return f
  }

  computeObjectiveGradient(): number[] {
    const eps = 1e-6
    const grad = new Array<number>(NV).fill(0)
    const f0 = this.computeObjective()
    for (let j = 0; j < NV; j++) {
      const saved = this.vars[j]
      this.vars[j] = saved + eps
      grad[j] = (this.computeObjective() - f0) / eps
      this.vars[j] = saved
    }
    return grad
  }

  computeConstraints(): number[] {
    if (!this.constrainCurvature) return []
    const Nc = reducedNumeratorCoeffs(this.curve())
    return this.activeIdx.map((idx, k) => (Nc[idx] ?? 0) - this.activeSigns[k] * this.margins[k])
  }

  computeConstraintJacobian(): Matrix {
    const J: Matrix = Array.from({ length: this.numConstraints }, () => new Array<number>(NV).fill(0))
    if (!this.constrainCurvature) return J
    const eps = 1e-6
    const c0 = this.computeConstraints()
    for (let j = 0; j < NV; j++) {
      const saved = this.vars[j]
      this.vars[j] = saved + eps
      const cPlus = this.computeConstraints()
      this.vars[j] = saved
      for (let i = 0; i < this.numConstraints; i++) J[i][j] = (cPlus[i] - c0[i]) / eps
    }
    return J
  }

  getConstraintSigns(): number[] { return [...this.activeSigns] }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void { /* signs/active-set fixed at drag start */ }

  result(): RationalPHLinearDParams { return varsToParams(this.vars) }
}

/**
 * Slide an exactly-PH linear-D rational curve's params so the reconstructed control points track
 * `targets` (weighted by `opts.targetWeights`); with `opts.preserveCurvatureExtrema`, hold the
 * curvature-extrema S⁻ bound via the Ñ sliding mechanism. Returns the moved params; rebuild the
 * drawable curve with `rationalPHLinearDFromParams(result)`.
 */
export function slideRationalPHLinearD(
  start: RationalPHLinearDParams,
  targets: { x: number; y: number }[],
  opts: RationalPHLinearDDragOptions = {},
): RationalPHLinearDParams {
  const weights = opts.targetWeights ?? targets.map(() => 1)
  const problem = new RationalPHLinearDDragProblem(start, targets, weights, opts.preserveCurvatureExtrema ?? false)
  // returnBestFeasible: without PH equality constraints the solve has extra freedom and can
  // DIVERGE on this rational objective, returning a garbage final iterate (control points
  // flung to ~1e5 while the curve/bound stay valid). Best-feasible hands back the lowest-
  // objective feasible iterate it passed through instead — the diverged point has a huge
  // objective (CPs far from targets), so it's never chosen. This is what keeps the drag stable.
  const ip = new InteriorPointOptimizer(problem, { maxIterations: opts.maxIterations ?? 50, enableBFGS: true, returnBestFeasible: true })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  return problem.result()
}
