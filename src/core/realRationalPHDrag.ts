// Real-rational Pythagorean-hodograph (PH) curve drag — CORE port of the legacy
// src/sketcher/optimizer/{realRationalPHCurve,RealRationalPHCurveProblem}.ts + optimizer.
//
// A real-rational PH curve is the (A, B, S) parameterization with the denominator B
// REAL (z = A/B, A complex, B real; PH condition A'B − AB' = S²). Real B keeps the
// weights real and does NOT rotate the tangent, so the drawable curve is an ordinary
// rational B-spline whose display (markers, S⁻ bound) the editor already computes in core.
//
// This module owns the DRAG: PH-preserving cursor tracking. It is a FAITHFUL port of the
// legacy behaviour — same decision variables, same weighted control-point objective, same
// PH-residual equality constraints, finite-difference Jacobian, core InteriorPointOptimizer.
// It does NOT (yet) enforce the curvature-extrema S⁻ bound; the legacy path did not either
// (zero inequality constraints). Adding that guard is a deliberate, separate follow-up.
import { decomposeToBernstein } from './bernstein'
import { ComplexBD } from './complexBernstein'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import type { OptimizationProblem, Matrix } from './ipopt/types'

/** The real-rational PH generator (the state the drag optimizes). A, B share `knots` at
 *  `degree`; S is degree `degree−1` on `sKnots`. B is real (one array). */
export interface RealRationalPHGen {
  degree: number
  aRe: number[]
  aIm: number[]
  b: number[]
  sRe: number[]
  sIm: number[]
  knots: number[]
  sKnots: number[]
}

export interface WeightedCP2D { x: number; y: number; w: number }

const clone = (g: RealRationalPHGen): RealRationalPHGen => ({
  degree: g.degree,
  aRe: [...g.aRe], aIm: [...g.aIm], b: [...g.b], sRe: [...g.sRe], sIm: [...g.sIm],
  knots: [...g.knots], sKnots: [...g.sKnots],
})

/**
 * Drawable rational control points from the generator: Pᵢ = Aᵢ/Bᵢ, weight = Bᵢ (B real).
 * Bit-identical to the legacy computeABPHCurve with bIm ≡ 0 (P = A·conj(B)/|B|², w = B).
 */
export function realRationalPHCurveCPs(g: RealRationalPHGen): WeightedCP2D[] {
  return g.aRe.map((are, i) => {
    const b = g.b[i]
    if (b * b < 1e-20) return { x: 0, y: 0, w: b } // degenerate weight (matches legacy)
    return { x: are / b, y: g.aIm[i] / b, w: b }
  })
}

/**
 * PH residual R = A'B − AB' − S² in Bernstein form (real + imaginary flat coefficients).
 * R ≡ 0 iff the curve is PH. Same object as the legacy computePHResidualCoeffs, expressed
 * on core's ComplexBD algebra (A' = per-span derivative; complex products/subtractions).
 */
export function realRationalPHResidual(g: RealRationalPHGen): { re: number[]; im: number[] } {
  const A = new ComplexBD(decomposeToBernstein(g.aRe, g.knots, g.degree), decomposeToBernstein(g.aIm, g.knots, g.degree))
  const bBD = decomposeToBernstein(g.b, g.knots, g.degree)
  const B = new ComplexBD(bBD, bBD.scale(0)) // B is real (imaginary part ≡ 0)
  const sDeg = g.sKnots.length - g.sRe.length - 1 // inferred (not assumed degree−1)
  const S = new ComplexBD(
    decomposeToBernstein(g.sRe, g.sKnots, sDeg),
    decomposeToBernstein(g.sIm, g.sKnots, sDeg),
  )
  const W = A.derivative().mul(B).sub(A.mul(B.derivative())) // Wronskian A'B − AB'
  const R = W.sub(S.mul(S)) // − S²
  return { re: R.re.flatCoeffs(), im: R.im.flatCoeffs() }
}

export interface RealRationalPHDragOptions {
  maxIterations?: number
  /** Per-target objective weights (default: 1 everywhere). The editor passes 10 on the
   *  dragged control point, 5 on the endpoints, 1 elsewhere — the legacy recipe. */
  targetWeights?: number[]
}

/**
 * The PH-preserving cursor-tracking problem. Variables [aRe, aIm, b(B₀ pinned), sRe, sIm];
 * objective = weighted Σ½‖Pᵢ − targetᵢ‖² over the reconstructed control points; equality
 * constraints = the PH residual. Finite-difference gradient/Jacobian (the faithful port);
 * an analytic Jacobian is a later swap. No inequality constraints (no S⁻ guard here).
 */
class RealRationalPHDragProblem implements OptimizationProblem {
  private readonly degree: number
  private readonly knots: number[]
  private readonly sKnots: number[]
  private readonly nAB: number
  private readonly nS: number
  private readonly b0: number
  private aRe: number[]
  private aIm: number[]
  private b: number[]
  private sRe: number[]
  private sIm: number[]
  private readonly targets: { x: number; y: number }[]
  private readonly weights: number[]
  private readonly nEq: number

  constructor(gen: RealRationalPHGen, targets: { x: number; y: number }[], weights: number[]) {
    this.degree = gen.degree
    this.knots = [...gen.knots]
    this.sKnots = [...gen.sKnots]
    this.aRe = [...gen.aRe]
    this.aIm = [...gen.aIm]
    this.b = [...gen.b]
    this.sRe = [...gen.sRe]
    this.sIm = [...gen.sIm]
    this.nAB = this.aRe.length
    this.nS = this.sRe.length
    this.b0 = this.b[0] // gauge fix: pin B₀
    this.targets = targets
    this.weights = weights
    const r = realRationalPHResidual(this.gen())
    this.nEq = r.re.length + r.im.length
  }

  private gen(): RealRationalPHGen {
    return {
      degree: this.degree,
      aRe: [...this.aRe], aIm: [...this.aIm], b: [...this.b], sRe: [...this.sRe], sIm: [...this.sIm],
      knots: [...this.knots], sKnots: [...this.sKnots],
    }
  }

  get numVariables(): number { return 2 * this.nAB + (this.nAB - 1) + 2 * this.nS }
  get numConstraints(): number { return this.nEq }
  get numEqualityConstraints(): number { return this.nEq }

  getVariables(): number[] {
    return [...this.aRe, ...this.aIm, ...this.b.slice(1), ...this.sRe, ...this.sIm]
  }

  setVariables(x: number[]): void {
    let o = 0
    const { nAB, nS } = this
    this.aRe = x.slice(o, o + nAB); o += nAB
    this.aIm = x.slice(o, o + nAB); o += nAB
    this.b = [this.b0, ...x.slice(o, o + nAB - 1)]; o += nAB - 1
    this.sRe = x.slice(o, o + nS); o += nS
    this.sIm = x.slice(o, o + nS)
  }

  computeObjective(): number {
    const cps = realRationalPHCurveCPs(this.gen())
    let f0 = 0
    const n = Math.min(cps.length, this.targets.length)
    for (let i = 0; i < n; i++) {
      const dx = cps[i].x - this.targets[i].x
      const dy = cps[i].y - this.targets[i].y
      f0 += this.weights[i] * 0.5 * (dx * dx + dy * dy)
    }
    return f0
  }

  computeObjectiveGradient(): number[] {
    const nv = this.numVariables
    const grad = new Array<number>(nv).fill(0)
    const eps = 1e-7
    const vars = this.getVariables()
    const f0 = this.computeObjective()
    for (let j = 0; j < nv; j++) {
      const saved = vars[j]
      vars[j] = saved + eps
      this.setVariables(vars)
      grad[j] = (this.computeObjective() - f0) / eps
      vars[j] = saved
      this.setVariables(vars)
    }
    return grad
  }

  computeConstraints(): number[] {
    const r = realRationalPHResidual(this.gen())
    return [...r.re, ...r.im]
  }

  computeConstraintJacobian(): Matrix {
    const nv = this.numVariables
    const vars = this.getVariables()
    const c0 = this.computeConstraints()
    const nc = c0.length
    const eps = 1e-7
    const J: Matrix = Array.from({ length: nc }, () => new Array<number>(nv).fill(0))
    for (let j = 0; j < nv; j++) {
      const saved = vars[j]
      vars[j] = saved + eps
      this.setVariables(vars)
      const cPlus = this.computeConstraints()
      vars[j] = saved
      this.setVariables(vars)
      for (let i = 0; i < nc; i++) J[i][j] = (cPlus[i] - c0[i]) / eps
    }
    return J
  }

  getConstraintSigns(): number[] { return new Array<number>(this.nEq).fill(1) }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void { /* equality-only: nothing to slide */ }

  result(): RealRationalPHGen { return this.gen() }
}

/**
 * Slide a real-rational PH curve's generator so the reconstructed control points track
 * `targets` (weighted by `opts.targetWeights`), while the PH structure is preserved. Returns
 * the moved generator; the drawable curve is `realRationalPHCurveCPs(result)`.
 */
export function slideRealRationalPH(
  gen: RealRationalPHGen,
  targets: { x: number; y: number }[],
  opts: RealRationalPHDragOptions = {},
): RealRationalPHGen {
  const weights = opts.targetWeights ?? targets.map(() => 1)
  const problem = new RealRationalPHDragProblem(gen, targets, weights)
  // Equality-only problem (PH residual = 0): the penalty method is transiently infeasible,
  // so returnBestFeasible would snap back to the start (the only residual≈0 point). Take the
  // FINAL iterate instead — the legacy path does the same (accepts a non-converged step).
  // BFGS on: no objective Hessian is supplied, so the identity fallback barely steps.
  const ip = new InteriorPointOptimizer(problem, {
    maxIterations: opts.maxIterations ?? 50,
    enableBFGS: true,
  })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  return problem.result()
}

/** Convenience: the generator carried by the editor's RealRationalPHMetadata shape. */
export const genFromRealRationalMeta = (m: {
  degree: number; aReCPs: number[]; aImCPs: number[]; bCPs: number[]
  sReCPs: number[]; sImCPs: number[]; knots: number[]; sKnots: number[]
}): RealRationalPHGen => ({
  degree: m.degree, aRe: [...m.aReCPs], aIm: [...m.aImCPs], b: [...m.bCPs],
  sRe: [...m.sReCPs], sIm: [...m.sImCPs], knots: [...m.knots], sKnots: [...m.sKnots],
})

export { clone as cloneRealRationalPHGen }
