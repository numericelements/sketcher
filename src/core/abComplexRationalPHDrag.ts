// AB-complex-rational Pythagorean-hodograph (PH) curve drag — CORE port of the legacy
// src/sketcher/optimizer/{abPHCurve,ABPHCurveProblem}.ts + optimizer.
//
// z = A/B with A, B complex B-splines of degree d and the PH condition A′B − AB′ = S².
// The drawable curve is an ordinary complex-rational B-spline (Pᵢ = Aᵢ/Bᵢ, weight Bᵢ).
// This module owns the DRAG: PH-preserving cursor tracking, optionally holding the
// curvature-extrema S⁻ bound (the sliding mechanism).
//
// The bound is enforced on the GENERATING-FUNCTION reduced numerator Ñ (rationalPHCurvature.ts),
// NOT the general complex-rational Chen g. Ñ = Im(S̄²·B̄·K′) is sign-identical to g but
// degree 4·degS + 2·degB − 2 (16 for a degree-5 curve) instead of 44 — a tighter S⁻ AND
// an EXACT analytic Jacobian in the drag variables (S, B). Because the enforced bound is
// Ñ's S⁻, the editor's DISPLAY for this family must read Ñ too (Law 3, displayed ==
// enforced) — that display switch is wired alongside the sceneStore routing, not here.
//
// Faithful to the legacy solver otherwise: same variables [aRe,aIm,bRe(B₀ pinned),
// bIm(B₀ pinned),sRe,sIm], same weighted complex CP-tracking objective, PH-residual
// equality constraints, the sliding-mechanism inequalities snapshotted at drag start,
// core InteriorPointOptimizer.
import { decomposeToBernstein, assignSignsNeighbor } from './bernstein'
import { ComplexBD } from './complexBernstein'
import type { ComplexPoint } from './types'
import { computeInactiveSetBySign, structuralMargins } from './curvatureProblem'
import { curvatureExtremaReducedNumeratorRationalPH, reducedNumeratorJacobianRationalPH } from './rationalPHCurvature'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import type { OptimizationProblem, Matrix } from './ipopt/types'

export interface ABComplexRationalPHGen {
  degree: number
  aRe: number[]; aIm: number[]
  bRe: number[]; bIm: number[]
  sRe: number[]; sIm: number[]
  knots: number[]; sKnots: number[]
}

const dec = decomposeToBernstein
const clone = (g: ABComplexRationalPHGen): ABComplexRationalPHGen => ({
  degree: g.degree,
  aRe: [...g.aRe], aIm: [...g.aIm], bRe: [...g.bRe], bIm: [...g.bIm], sRe: [...g.sRe], sIm: [...g.sIm],
  knots: [...g.knots], sKnots: [...g.sKnots],
})

/** Drawable complex-rational control points: Pᵢ = Aᵢ/Bᵢ = Aᵢ·conj(Bᵢ)/|Bᵢ|², weight Bᵢ. */
export function abComplexRationalPHCurveCPs(g: ABComplexRationalPHGen): ComplexPoint[] {
  return g.aRe.map((are, i) => {
    const aim = g.aIm[i], bre = g.bRe[i], bim = g.bIm[i]
    const b2 = bre * bre + bim * bim
    if (b2 < 1e-20) return { re: 0, im: 0, w_re: bre, w_im: bim } // degenerate weight (matches legacy)
    return { re: (are * bre + aim * bim) / b2, im: (aim * bre - are * bim) / b2, w_re: bre, w_im: bim }
  })
}

const sDegOf = (g: ABComplexRationalPHGen) => g.sKnots.length - g.sRe.length - 1

/** PH residual R = A′B − AB′ − S² in Bernstein form (real + imaginary flat coefficients). */
export function abComplexRationalPHResidual(g: ABComplexRationalPHGen): { re: number[]; im: number[] } {
  const A = new ComplexBD(dec(g.aRe, g.knots, g.degree), dec(g.aIm, g.knots, g.degree))
  const B = new ComplexBD(dec(g.bRe, g.knots, g.degree), dec(g.bIm, g.knots, g.degree))
  const sDeg = sDegOf(g)
  const S = new ComplexBD(dec(g.sRe, g.sKnots, sDeg), dec(g.sIm, g.sKnots, sDeg))
  const W = A.derivative().mul(B).sub(A.mul(B.derivative())) // A′B − AB′
  const R = W.sub(S.mul(S))
  return { re: R.re.flatCoeffs(), im: R.im.flatCoeffs() }
}

/** The reduced curvature-extrema numerator Ñ's flat coefficients for the current (S, B). */
function reducedNumeratorCoeffs(g: ABComplexRationalPHGen): number[] {
  return curvatureExtremaReducedNumeratorRationalPH(
    g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree,
  ).flatCoeffs()
}

export interface ABComplexRationalPHDragOptions {
  maxIterations?: number
  targetWeights?: number[]
  /** Hold the curvature-extrema S⁻ bound via the Ñ sliding mechanism (default false). */
  preserveCurvatureExtrema?: boolean
}

/**
 * The PH-preserving cursor-tracking problem. Variables [aRe, aIm, bRe(B₀ pinned),
 * bIm(B₀ pinned), sRe, sIm]; objective = weighted Σ½‖Pᵢ − targetᵢ‖²; equality
 * constraints = the PH residual; optional inequality constraints = the active Ñ
 * coefficients keeping their drag-start sign (the sliding mechanism, Law 2). The Ñ
 * constraint rows use the EXACT analytic Jacobian ∂Ñ/∂(S,B); the PH-residual rows and
 * the objective gradient are finite-differenced (the faithful port — analytic residual
 * is a later swap).
 */
class ABComplexRationalPHDragProblem implements OptimizationProblem {
  private readonly degree: number
  private readonly knots: number[]
  private readonly sKnots: number[]
  private readonly sDeg: number
  private readonly nAB: number
  private readonly nS: number
  private readonly b0Re: number
  private readonly b0Im: number
  private aRe: number[]; private aIm: number[]
  private bRe: number[]; private bIm: number[]
  private sRe: number[]; private sIm: number[]
  private readonly targets: { x: number; y: number }[]
  private readonly weights: number[]
  private readonly nEq: number

  // Sliding-mechanism state (snapshotted at drag start; held fixed for the solve).
  private readonly constrainCurvature: boolean
  private readonly activeIdx: number[] = []
  private readonly activeSigns: number[] = []
  private readonly margins: number[] = []

  constructor(gen: ABComplexRationalPHGen, targets: { x: number; y: number }[], weights: number[], constrainCurvature: boolean) {
    this.degree = gen.degree
    this.knots = [...gen.knots]
    this.sKnots = [...gen.sKnots]
    this.sDeg = sDegOf(gen)
    this.aRe = [...gen.aRe]; this.aIm = [...gen.aIm]
    this.bRe = [...gen.bRe]; this.bIm = [...gen.bIm]
    this.sRe = [...gen.sRe]; this.sIm = [...gen.sIm]
    this.nAB = this.aRe.length
    this.nS = this.sRe.length
    this.b0Re = this.bRe[0]; this.b0Im = this.bIm[0]
    this.targets = targets
    this.weights = weights
    const r = abComplexRationalPHResidual(this.gen())
    this.nEq = r.re.length + r.im.length

    this.constrainCurvature = constrainCurvature
    if (constrainCurvature) {
      // Snapshot Ñ's sign pattern + active (non-sliding) set from the INITIAL S, B —
      // exactly like the closed complex-rational / legacy AB problems (re-deriving
      // mid-solve would let the bound drift). Robust IPOPT regime: neighbour signs,
      // structural margins, raw (unscaled) constraints.
      try {
        const Nc = reducedNumeratorCoeffs(this.gen())
        const signs = assignSignsNeighbor(Nc)
        const inactive = computeInactiveSetBySign(signs, Nc.map(Math.abs))
        for (let i = 0; i < signs.length; i++) if (!inactive.has(i)) { this.activeIdx.push(i); this.activeSigns.push(signs[i]) }
        this.margins = structuralMargins(Nc, this.activeIdx)
      } catch {
        // Ñ unavailable (e.g. mismatched breakpoints) → PH-only, no curvature bound.
        this.constrainCurvature = false
      }
    }
  }

  private gen(): ABComplexRationalPHGen {
    return {
      degree: this.degree,
      aRe: [...this.aRe], aIm: [...this.aIm], bRe: [...this.bRe], bIm: [...this.bIm], sRe: [...this.sRe], sIm: [...this.sIm],
      knots: [...this.knots], sKnots: [...this.sKnots],
    }
  }

  get numVariables(): number { return 2 * this.nAB + 2 * (this.nAB - 1) + 2 * this.nS }
  get numConstraints(): number { return this.nEq + (this.constrainCurvature ? this.activeIdx.length : 0) }
  get numEqualityConstraints(): number { return this.nEq }

  getVariables(): number[] {
    return [...this.aRe, ...this.aIm, ...this.bRe.slice(1), ...this.bIm.slice(1), ...this.sRe, ...this.sIm]
  }

  setVariables(x: number[]): void {
    let o = 0
    const { nAB, nS } = this
    this.aRe = x.slice(o, o + nAB); o += nAB
    this.aIm = x.slice(o, o + nAB); o += nAB
    this.bRe = [this.b0Re, ...x.slice(o, o + nAB - 1)]; o += nAB - 1
    this.bIm = [this.b0Im, ...x.slice(o, o + nAB - 1)]; o += nAB - 1
    this.sRe = x.slice(o, o + nS); o += nS
    this.sIm = x.slice(o, o + nS)
  }

  computeObjective(): number {
    const cps = abComplexRationalPHCurveCPs(this.gen())
    let f0 = 0
    const n = Math.min(cps.length, this.targets.length)
    for (let i = 0; i < n; i++) {
      const dx = cps[i].re - this.targets[i].x, dy = cps[i].im - this.targets[i].y
      f0 += this.weights[i] * 0.5 * (dx * dx + dy * dy)
    }
    return f0
  }

  computeObjectiveGradient(): number[] {
    const nv = this.numVariables, eps = 1e-7
    const grad = new Array<number>(nv).fill(0)
    const vars = this.getVariables()
    const f0 = this.computeObjective()
    for (let j = 0; j < nv; j++) {
      const saved = vars[j]
      vars[j] = saved + eps; this.setVariables(vars)
      grad[j] = (this.computeObjective() - f0) / eps
      vars[j] = saved; this.setVariables(vars)
    }
    return grad
  }

  computeConstraints(): number[] {
    const r = abComplexRationalPHResidual(this.gen())
    const cons = [...r.re, ...r.im]
    if (this.constrainCurvature) {
      const Nc = reducedNumeratorCoeffs(this.gen())
      for (let k = 0; k < this.activeIdx.length; k++) {
        cons.push((Nc[this.activeIdx[k]] ?? 0) - this.activeSigns[k] * this.margins[k])
      }
    }
    return cons
  }

  computeConstraintJacobian(): Matrix {
    const nv = this.numVariables, eps = 1e-7
    const vars = this.getVariables()
    // PH-residual rows: finite differences.
    const r0 = abComplexRationalPHResidual(this.gen())
    const c0 = [...r0.re, ...r0.im]
    const J: Matrix = Array.from({ length: this.numConstraints }, () => new Array<number>(nv).fill(0))
    for (let j = 0; j < nv; j++) {
      const saved = vars[j]
      vars[j] = saved + eps; this.setVariables(vars)
      const r = abComplexRationalPHResidual(this.gen())
      const cPlus = [...r.re, ...r.im]
      vars[j] = saved; this.setVariables(vars)
      for (let i = 0; i < this.nEq; i++) J[i][j] = (cPlus[i] - c0[i]) / eps
    }
    // Ñ inequality rows: EXACT analytic ∂Ñ/∂(S,B) (zero w.r.t. A; B₀ pinned).
    if (this.constrainCurvature) {
      const g = this.gen()
      const Jn = reducedNumeratorJacobianRationalPH(g.sRe, g.sIm, g.sKnots, this.sDeg, g.bRe, g.bIm, g.knots, g.degree)
      const { nAB, nS } = this
      const oBre = 2 * nAB, oBim = oBre + (nAB - 1), oSre = oBim + (nAB - 1), oSim = oSre + nS
      for (let k = 0; k < this.activeIdx.length; k++) {
        const idx = this.activeIdx[k], row = J[this.nEq + k]
        for (let j = 1; j < nAB; j++) { row[oBre + (j - 1)] = Jn.dBre[j][idx]; row[oBim + (j - 1)] = Jn.dBim[j][idx] }
        for (let j = 0; j < nS; j++) { row[oSre + j] = Jn.dSre[j][idx]; row[oSim + j] = Jn.dSim[j][idx] }
      }
    }
    return J
  }

  getConstraintSigns(): number[] { return [...new Array<number>(this.nEq).fill(1), ...this.activeSigns] }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void { /* signs/active-set fixed at drag start */ }

  result(): ABComplexRationalPHGen { return this.gen() }
}

/**
 * Slide an AB-complex-rational PH curve's generator so the reconstructed control points
 * track `targets` (weighted by `opts.targetWeights`), preserving the PH structure and,
 * when `opts.preserveCurvatureExtrema`, the curvature-extrema S⁻ bound (via Ñ). Returns
 * the moved generator; the drawable curve is `abComplexRationalPHCurveCPs(result)`.
 */
export function slideABComplexRationalPH(
  gen: ABComplexRationalPHGen,
  targets: { x: number; y: number }[],
  opts: ABComplexRationalPHDragOptions = {},
): ABComplexRationalPHGen {
  const weights = opts.targetWeights ?? targets.map(() => 1)
  const problem = new ABComplexRationalPHDragProblem(gen, targets, weights, opts.preserveCurvatureExtrema ?? false)
  const ip = new InteriorPointOptimizer(problem, { maxIterations: opts.maxIterations ?? 50, enableBFGS: true })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  return problem.result()
}

/** Convenience: the generator carried by the editor's ABPHMetadata shape. */
export const genFromABMeta = (m: {
  degree: number; aReCPs: number[]; aImCPs: number[]; bReCPs: number[]; bImCPs: number[]
  sReCPs: number[]; sImCPs: number[]; knots: number[]; sKnots: number[]
}): ABComplexRationalPHGen => ({
  degree: m.degree, aRe: [...m.aReCPs], aIm: [...m.aImCPs], bRe: [...m.bReCPs], bIm: [...m.bImCPs],
  sRe: [...m.sReCPs], sIm: [...m.sImCPs], knots: [...m.knots], sKnots: [...m.sKnots],
})

export { clone as cloneABComplexRationalPHGen }
