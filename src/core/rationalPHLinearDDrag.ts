// Drag for the exactly-PH rational family (rationalPHLinearD.ts), any generator degree and
// linear/quadratic denominator.
//
// The family is PH BY CONSTRUCTION — the curve is reconstructed exactly from the free params
// (the non-derived S coefficients, D's roots, and the origin), with the remaining S coefficients
// fixed so the residues of S²/D² vanish. So there are NO PH equality constraints to fight: the
// drag is a PURE inequality problem (the Ñ sliding mechanism), and Ñ is honest (sign-identical to
// the drawn curve's g) because the curve is genuinely PH.
//
// Variables are the real family params, flattened:
//     [ sFree(re,im)…, roots(re,im)…, originX, originY ]
// Objective = weighted Σ½‖CPᵢ(θ) − targetᵢ‖² over the reconstructed control points; constraints =
// the active Ñ coefficients holding their drag-start sign (Law 2). The param space is tiny, so all
// derivatives are finite-differenced (robust; analytic is a later swap).
import { assignSignsNeighbor } from './bernstein'
import { computeInactiveSetBySign, structuralMargins } from './curvatureProblem'
import { curvatureExtremaReducedNumeratorRationalPH } from './rationalPHCurvature'
import { rationalPHExactFromParams, type RationalPHLinearDCurve, type RationalPHExactParams } from './rationalPHLinearD'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import type { OptimizationProblem } from './ipopt/types'
import type { Matrix } from './ipopt/linearAlgebra'

export interface RationalPHExactDragOptions {
  maxIterations?: number
  targetWeights?: number[]
  /** Hold the curvature-extrema S⁻ bound via the Ñ sliding mechanism (default false). */
  preserveCurvatureExtrema?: boolean
  /**
   * Keep the denominator D REAL (freeze every root's imaginary part) — the real-rational family,
   * i.e. ordinary real NURBS weights. Real roots ⇒ real D. The roots' imaginary parts drop out of
   * the variable set. Same exact-PH construction and Ñ bound. Default false (complex D). Mirrors
   * the AB drag's `realB`.
   */
  realD?: boolean
}

function paramsToVars(p: RationalPHExactParams): number[] {
  const v: number[] = []
  for (const s of p.sFree) v.push(s.re, s.im)
  for (const r of p.roots) v.push(r.re, r.im)
  v.push(p.origin.x, p.origin.y)
  return v
}

/** Reduced curvature-extrema numerator Ñ's flat coefficients for a reconstructed curve. */
function reducedNumeratorCoeffs(c: RationalPHLinearDCurve): number[] {
  const sDeg = c.sReCPs.length - 1, dDeg = c.dReCPs.length - 1
  return curvatureExtremaReducedNumeratorRationalPH(
    c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, dDeg,
  ).flatCoeffs()
}

class RationalPHExactDragProblem implements OptimizationProblem {
  private vars: number[]
  private readonly degS: number
  private readonly degD: 0 | 1 | 2
  private readonly nSFree: number
  private readonly nRoots: number
  private readonly targets: { x: number; y: number }[]
  private readonly weights: number[]

  private constrainCurvature: boolean
  private readonly activeIdx: number[] = []
  private readonly activeSigns: number[] = []
  private readonly margins: number[] = []
  // Indices of `vars` the optimizer may move; realD drops every root's imaginary part, pinning D real.
  private readonly freeIdx: number[]

  constructor(
    start: RationalPHExactParams,
    targets: { x: number; y: number }[],
    weights: number[],
    constrainCurvature: boolean,
    realD: boolean,
  ) {
    this.vars = paramsToVars(start)
    this.degS = start.degS
    this.degD = start.degD
    this.nSFree = start.sFree.length
    this.nRoots = start.roots.length
    this.targets = targets
    this.weights = weights
    this.constrainCurvature = constrainCurvature

    const rootImag = new Set<number>()
    if (realD) for (let k = 0; k < this.nRoots; k++) rootImag.add(2 * this.nSFree + 2 * k + 1)
    this.freeIdx = this.vars.map((_, i) => i).filter((i) => !rootImag.has(i))

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

  private toParams(): RationalPHExactParams {
    const x = this.vars
    const sFree: { re: number; im: number }[] = []
    for (let k = 0; k < this.nSFree; k++) sFree.push({ re: x[2 * k], im: x[2 * k + 1] })
    const base = 2 * this.nSFree
    const roots: { re: number; im: number }[] = []
    for (let k = 0; k < this.nRoots; k++) roots.push({ re: x[base + 2 * k], im: x[base + 2 * k + 1] })
    return { degS: this.degS, degD: this.degD, sFree, roots, origin: { x: x[x.length - 2], y: x[x.length - 1] } }
  }

  private curve(): RationalPHLinearDCurve {
    return rationalPHExactFromParams(this.toParams())
  }

  get numVariables(): number { return this.freeIdx.length }
  get numConstraints(): number { return this.constrainCurvature ? this.activeIdx.length : 0 }
  get numEqualityConstraints(): number { return 0 } // PH is by construction — no equalities

  getVariables(): number[] { return this.freeIdx.map((i) => this.vars[i]) }
  setVariables(x: number[]): void { this.freeIdx.forEach((i, k) => { this.vars[i] = x[k] }) }

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
    const nv = this.numVariables
    const grad = new Array<number>(nv).fill(0)
    const f0 = this.computeObjective()
    for (let j = 0; j < nv; j++) {
      const i = this.freeIdx[j], saved = this.vars[i]
      this.vars[i] = saved + eps
      grad[j] = (this.computeObjective() - f0) / eps
      this.vars[i] = saved
    }
    return grad
  }

  computeConstraints(): number[] {
    if (!this.constrainCurvature) return []
    const Nc = reducedNumeratorCoeffs(this.curve())
    return this.activeIdx.map((idx, k) => (Nc[idx] ?? 0) - this.activeSigns[k] * this.margins[k])
  }

  computeConstraintJacobian(): Matrix {
    const nv = this.numVariables
    const J: Matrix = Array.from({ length: this.numConstraints }, () => new Array<number>(nv).fill(0))
    if (!this.constrainCurvature) return J
    const eps = 1e-6
    const c0 = this.computeConstraints()
    for (let j = 0; j < nv; j++) {
      const i = this.freeIdx[j], saved = this.vars[i]
      this.vars[i] = saved + eps
      const cPlus = this.computeConstraints()
      this.vars[i] = saved
      for (let r = 0; r < this.numConstraints; r++) J[r][j] = (cPlus[r] - c0[r]) / eps
    }
    return J
  }

  getConstraintSigns(): number[] { return [...this.activeSigns] }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void { /* signs/active-set fixed at drag start */ }

  result(): RationalPHExactParams { return this.toParams() }
}

/**
 * Slide an exactly-PH rational curve's params so the reconstructed control points track `targets`
 * (weighted by `opts.targetWeights`); with `opts.preserveCurvatureExtrema`, hold the
 * curvature-extrema S⁻ bound via the Ñ sliding mechanism. Works for any generator degree and
 * linear/quadratic D. Returns the moved params; rebuild with `rationalPHExactFromParams(result)`.
 */
export function slideRationalPHExact(
  start: RationalPHExactParams,
  targets: { x: number; y: number }[],
  opts: RationalPHExactDragOptions = {},
): RationalPHExactParams {
  const weights = opts.targetWeights ?? targets.map(() => 1)
  const problem = new RationalPHExactDragProblem(start, targets, weights, opts.preserveCurvatureExtrema ?? false, opts.realD ?? false)
  // returnBestFeasible: without PH equality constraints the solve has extra freedom and can
  // DIVERGE on this rational objective, returning a garbage final iterate (control points flung
  // to ~1e5 while the curve/bound stay valid). Best-feasible hands back the lowest-objective
  // feasible iterate it passed through — the diverged point has a huge objective, so it's never
  // chosen. This is what keeps the drag stable.
  const ip = new InteriorPointOptimizer(problem, { maxIterations: opts.maxIterations ?? 50, enableBFGS: true, returnBestFeasible: true })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  return problem.result()
}
