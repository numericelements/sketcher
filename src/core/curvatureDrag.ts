// ============================================================================
// GENERIC curvature-preserving drag — one solver path for every family.
//
// The capstone of the set: instead of slideCurve (poly) / slideComplexRational
// (rational, complex) / a PH drag each re-deriving the same thing, ONE problem
// (CurvatureDragProblem) is built from the family contract — numerator + swappable
// Jacobian — and run through the same interior-point solver + the same strict-S⁻
// guard. Family, Jacobian backend, and solver are all knobs (CLAUDE.md: "reshape,
// don't block" + the standing solver-quality investigation live here).
//
// The constraint regime mirrors the editor's (robust-scaled): neighbour-aware signs
// keep a structural-zero coefficient active, scaleForRobust conditions the rows, and
// structuralMarginsScaled holds g=0 a hair off its wall — the SAME helpers
// PlanarCurvatureProblem uses, so this is bound-faithful and parity-close by
// construction (the parity gate proves it before any editor migration).
// ============================================================================
import type { BernsteinDecomposition } from './bernstein'
import { assignSignsNeighbor } from './bernstein'
import type { OptimizationProblem } from './ipopt/types'
import type { Matrix } from './ipopt/linearAlgebra'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import {
  computeInactiveSetBySign, computeInactiveSetBySignCyclic,
  scaleForRobust, structuralMarginsScaled, enforceBoundNonincreasing,
} from './curvatureProblem'
import {
  familyNumerator, familyJacobian, familyBound,
  type AlgebraicFamily, type Topology, type WeightedCP, type JacobianBackend,
} from './curvatureFamilies'
import type { Complex } from './complex'

export interface CurvatureDragOptions {
  jacobian?: JacobianBackend // 'fd' | 'analytic' | 'ad' (default 'fd' — universal)
  maxIterations?: number
  enableBFGS?: boolean
  disableSliding?: boolean
  dragWeight?: number
  rho?: Complex
}

/**
 * The family-generic curvature drag as an OptimizationProblem. Variables are the 2n
 * affine coordinates in block order [re₀…re_{n-1}, im₀…im_{n-1}] (weights held fixed);
 * the objective is ½·Σ‖Pᵢ−targetᵢ‖² with the dragged point's target at the cursor; the
 * constraints keep the sign of every active g coefficient. g and ∂g come from the family.
 */
export class CurvatureDragProblem implements OptimizationProblem {
  private re: number[]
  private im: number[]
  private readonly targetRe: number[]
  private readonly targetIm: number[]
  private readonly weights: number[]
  private readonly activeIdx: number[]
  private signs: number[]
  private readonly gScale: number[]
  private readonly margins: number[]
  private cachedCons: number[] | null = null
  private cachedJac: Matrix | null = null
  private readonly kind: AlgebraicFamily
  private readonly knots: readonly number[]
  private readonly degree: number
  private readonly topology: Topology
  private readonly wRe: number[]
  private readonly wIm: number[]
  private readonly backend: JacobianBackend
  private readonly rho: Complex

  constructor(
    kind: AlgebraicFamily,
    cps: readonly WeightedCP[],
    knots: readonly number[],
    degree: number,
    topology: Topology,
    dragIndex: number,
    target: { x: number; y: number },
    wRe: number[] = cps.map((p) => p.wRe),
    wIm: number[] = cps.map((p) => p.wIm),
    backend: JacobianBackend = 'fd',
    rho: Complex = { re: 1, im: 0 },
    opts: CurvatureDragOptions = {},
  ) {
    this.kind = kind
    this.knots = knots
    this.degree = degree
    this.topology = topology
    this.wRe = wRe
    this.wIm = wIm
    this.backend = backend
    this.rho = rho
    this.re = cps.map((p) => p.re)
    this.im = cps.map((p) => p.im)
    this.targetRe = [...this.re]
    this.targetIm = [...this.im]
    this.targetRe[dragIndex] = target.x
    this.targetIm[dragIndex] = target.y
    this.weights = this.re.map(() => 1)
    if (opts.dragWeight !== undefined) this.weights[dragIndex] = opts.dragWeight

    // Robust-scaled constraint state (the editor's regime), fixed at drag start.
    const gc = this.numerator().flatCoeffs()
    const signs = assignSignsNeighbor(gc)
    const abs = gc.map(Math.abs)
    const closed = topology === 'closed'
    const inactive = opts.disableSliding
      ? new Set<number>()
      : (closed ? computeInactiveSetBySignCyclic(signs, abs) : computeInactiveSetBySign(signs, abs))
    this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i))
    this.signs = this.activeIdx.map((i) => signs[i])
    this.gScale = scaleForRobust(gc, this.activeIdx)
    this.margins = structuralMarginsScaled(gc, this.activeIdx)
  }

  private cps(): WeightedCP[] {
    return this.re.map((re, i) => ({ re, im: this.im[i], wRe: this.wRe[i], wIm: this.wIm[i] }))
  }
  private numerator(): BernsteinDecomposition {
    return familyNumerator(this.kind, this.cps(), this.knots, this.degree, this.topology, this.rho)
  }
  /** g's Jacobian, remapped from familyJacobian's interleaved cols to block order. */
  private jacobianBlock(): number[][] {
    const J = familyJacobian(this.kind, this.cps(), this.knots, this.degree, this.topology, this.backend, this.rho)
    const n = this.re.length
    return J.map((row) => {
      const out = new Array<number>(2 * n)
      for (let i = 0; i < n; i++) { out[i] = row[2 * i]; out[n + i] = row[2 * i + 1] }
      return out
    })
  }

  readonly numEqualityConstraints = 0
  get numVariables(): number { return this.re.length * 2 }
  get numConstraints(): number { return this.activeIdx.length }

  getVariables(): number[] { return [...this.re, ...this.im] }
  setVariables(x: number[]): void {
    const n = this.re.length
    this.re = x.slice(0, n)
    this.im = x.slice(n)
    this.cachedCons = null
    this.cachedJac = null
  }

  computeObjective(): number {
    let s = 0
    for (let i = 0; i < this.re.length; i++) {
      const dx = this.re[i] - this.targetRe[i]
      const dy = this.im[i] - this.targetIm[i]
      s += 0.5 * this.weights[i] * (dx * dx + dy * dy)
    }
    return s
  }
  computeObjectiveGradient(): number[] {
    const gx = this.re.map((x, i) => this.weights[i] * (x - this.targetRe[i]))
    const gy = this.im.map((y, i) => this.weights[i] * (y - this.targetIm[i]))
    return [...gx, ...gy]
  }
  computeObjectiveHessianDiagonal(): number[] {
    return [...this.weights, ...this.weights]
  }

  computeConstraints(): number[] {
    if (!this.cachedCons) {
      const gc = this.numerator().flatCoeffs()
      this.cachedCons = this.activeIdx.map((i, k) => gc[i] / this.gScale[k] - this.signs[k] * this.margins[k])
    }
    return this.cachedCons
  }
  computeConstraintJacobian(): Matrix {
    if (!this.cachedJac) {
      const J = this.jacobianBlock()
      this.cachedJac = this.activeIdx.map((i, k) => J[i].map((v) => v / this.gScale[k]))
    }
    return this.cachedJac
  }

  getConstraintSigns(): number[] { return this.signs }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void {
    // Re-derive signs on the FIXED active set (the sliding mechanism: anchors + same-sign
    // stay active, signs follow the current g), matching PlanarCurvatureProblem.
    const gc = this.numerator().flatCoeffs()
    const signs = assignSignsNeighbor(gc)
    this.signs = this.activeIdx.map((i) => signs[i])
    this.cachedCons = null
    this.cachedJac = null
  }

  /** The current affine control points (weights unchanged). */
  result(): WeightedCP[] { return this.cps() }
}

/**
 * Run ONE generic curvature-preserving drag: build the family problem, solve, then apply
 * the strict-S⁻ guard (Law 2 — pull back along the straight path only if numerical slip let
 * the bound grow). Returns the new affine control points (weights fixed). The same entry
 * point for every family — pass the family kind and, optionally, the Jacobian backend.
 */
export function slide(
  kind: AlgebraicFamily,
  cps: readonly WeightedCP[],
  knots: readonly number[],
  degree: number,
  topology: Topology,
  dragIndex: number,
  target: { x: number; y: number },
  opts: CurvatureDragOptions = {},
): { points: WeightedCP[]; converged: boolean } {
  const rho = opts.rho ?? { re: 1, im: 0 }
  const wRe = cps.map((p) => p.wRe)
  const wIm = cps.map((p) => p.wIm)
  const problem = new CurvatureDragProblem(
    kind, cps, knots, degree, topology, dragIndex, target,
    wRe, wIm, opts.jacobian ?? 'fd', rho, opts,
  )
  const ip = new InteriorPointOptimizer(problem, {
    maxIterations: opts.maxIterations ?? 40,
    enableBFGS: opts.enableBFGS ?? false,
    returnBestFeasible: true,
  })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  let points = problem.result()

  // Strict sliding-mechanism enforcement (the shared guard) — S⁻ must not rise.
  const boundOf = (p: readonly WeightedCP[]) => familyBound(kind, p, knots, degree, topology, rho)
  points = enforceBoundNonincreasing(
    cps as WeightedCP[],
    points,
    boundOf,
    (a) => cps.map((p, i) => ({ re: p.re + a * (points[i].re - p.re), im: p.im + a * (points[i].im - p.im), wRe: p.wRe, wIm: p.wIm })),
  )
  return { points, converged: r.converged }
}
