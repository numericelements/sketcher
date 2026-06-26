// ============================================================================
// Closed polynomial-PH drag, in core — on a PERIODIC preimage (Rust's design).
//
// A closed PH curve is a PERIODIC preimage w = u + i·v (periodic knots): the periodic
// basis makes seam continuity automatic, so there is NO clamped chart, no expand/fold,
// no closure projection gymnastics. The drag optimizes the periodic generator toward a
// target holding the curvature-extrema bound (sign of g, g = curvatureExtremaNumeratorPH
// with periodic decomposition) AND closure ∮w² = 0 (two equality constraints), then a
// final exact closure projection + strict-S⁻ guard. Mirrors ne-core optimizer.rs
// `slide_ph_closed`. Everything in GENERATOR space — no curve↔generator round-trip.
//
// The editor stores its closed PH generator CLAMPED; it converts clamped↔periodic at the
// boundary (FOUNDATIONS F5). This core drag is the clean periodic form.
// ============================================================================
import type { OptimizationProblem } from './ipopt/types'
import type { Matrix } from './ipopt/linearAlgebra'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import { PrimalDualOptimizer } from './optimize'
import { assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { computeInactiveSetBySign, computeInactiveSetBySignCyclic } from './curvatureProblem'
import { curvatureExtremaNumeratorPH, phJacobian } from './phCurvature'
import { generatorBasisGram, closureGap, closureJacobian, projectClosurePHPeriodic } from './phClosure'

const phBound = (u: readonly number[], v: readonly number[], knots: readonly number[], degree: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPH(u, v, knots, degree, true).flatCoeffs()), true)
const phBoundOpen = (u: readonly number[], v: readonly number[], knots: readonly number[], degree: number) =>
  cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPH(u, v, knots, degree, false).flatCoeffs()), false)

/**
 * Closed-PH drag over the PERIODIC preimage, variables in block order [u…, v…]. Objective
 * ½‖(u,v) − target‖²; constraint 0,1 = closure ∮w² = 0 (equalities); the rest = the
 * curvature bound (sign of each active g coefficient). g and ∂g via curvatureExtremaNumeratorPH
 * / phJacobian (closed = periodic decomposition — correct for the periodic preimage).
 */
class ClosedPHDragProblem implements OptimizationProblem {
  readonly numEqualityConstraints = 2 // closure (Re, Im)
  private u: number[]
  private v: number[]
  private readonly target: number[]
  private readonly n: number
  private readonly G: number[][]
  private readonly activeIdx: number[]
  private signs: number[]
  private readonly gScale: number[]
  private readonly margins: number[]
  private readonly knots: readonly number[]
  private readonly degree: number

  constructor(
    genU: readonly number[], genV: readonly number[],
    targetU: readonly number[], targetV: readonly number[],
    knots: readonly number[],
    degree: number,
    G: number[][],
  ) {
    this.knots = knots
    this.degree = degree
    this.n = genU.length
    this.u = genU.slice()
    this.v = genV.slice()
    this.target = [...targetU, ...targetV]
    this.G = G
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    const scaleAbs = gc.map((x) => Math.max(Math.abs(x), 1e-12))
    const inactive = computeInactiveSetBySignCyclic(s, gc.map(Math.abs))
    // Hold only ACTIVE coefficients that are STRICTLY FEASIBLE at the start (slack > tol) —
    // ne-core slide_ph_closed. A coefficient at its sign boundary (slack ≈ 0) held rigid
    // pins the drag; the sliding mechanism (anchors + runs) already permits it to merge.
    this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i) && s[i] * gc[i] / scaleAbs[i] < -1e-12)
    this.signs = this.activeIdx.map((i) => s[i])
    this.gScale = this.activeIdx.map((i) => scaleAbs[i]) // normalized constraint (|g|), like Rust
    this.margins = this.activeIdx.map(() => 0)
  }

  private numerator() { return curvatureExtremaNumeratorPH(this.u, this.v, this.knots, this.degree, true) }

  get numVariables(): number { return 2 * this.n }
  get numConstraints(): number { return 2 + this.activeIdx.length }
  getVariables(): number[] { return [...this.u, ...this.v] }
  setVariables(x: number[]): void { this.u = x.slice(0, this.n); this.v = x.slice(this.n) }

  computeObjective(): number {
    const x = this.getVariables()
    let s = 0
    for (let i = 0; i < x.length; i++) { const d = x[i] - this.target[i]; s += 0.5 * d * d }
    return s
  }
  computeObjectiveGradient(): number[] { return this.getVariables().map((xi, i) => xi - this.target[i]) }
  computeObjectiveHessianDiagonal(): number[] { return new Array<number>(2 * this.n).fill(1) }
  computeObjectiveHessian(): Matrix {
    const m = 2 * this.n
    const H: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    for (let i = 0; i < m; i++) H[i][i] = 1
    return H
  }

  computeConstraints(): number[] {
    const gap = closureGap(this.u, this.v, this.G)
    const gc = this.numerator().flatCoeffs()
    const bound = this.activeIdx.map((i, k) => gc[i] / this.gScale[k] - this.signs[k] * this.margins[k])
    return [gap.re, gap.im, ...bound]
  }
  computeConstraintJacobian(): Matrix {
    const cj = closureJacobian(this.u, this.v, this.G)
    const rows: number[][] = [[...cj.reDu, ...cj.reDv], [...cj.imDu, ...cj.imDv]]
    const J = phJacobian(this.u, this.v, this.knots, this.degree, true, 'analytic') // [nG][2n] interleaved
    for (let k = 0; k < this.activeIdx.length; k++) {
      const row = J[this.activeIdx[k]]
      const block = new Array<number>(2 * this.n)
      for (let i = 0; i < this.n; i++) { block[i] = row[2 * i] / this.gScale[k]; block[this.n + i] = row[2 * i + 1] / this.gScale[k] }
      rows.push(block)
    }
    return rows
  }

  getConstraintSigns(): number[] { return [1, 1, ...this.signs] } // first two (equalities) ignored
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void {
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    this.signs = this.activeIdx.map((i) => s[i])
  }

  result(): { u: number[]; v: number[] } { return { u: [...this.u], v: [...this.v] } }
}

export interface ClosedPHDragOptions { maxIterations?: number }

/**
 * One closed-PH drag (periodic preimage): optimize toward (targetU, targetV) holding the
 * curvature bound + closure, then project closure exactly and strict-S⁻-guard (bisect the
 * generator back toward the start if numerical slip raised S⁻; hard backstop keeps the
 * start). Returns the new periodic preimage. Bound-faithful AND closed, in generator space.
 */
export function slideClosedPH(
  genU: readonly number[], genV: readonly number[],
  targetU: readonly number[], targetV: readonly number[],
  knots: readonly number[], degree: number,
  opts: ClosedPHDragOptions = {},
): { u: number[]; v: number[]; converged: boolean } {
  const n = genU.length
  const G = generatorBasisGram(knots, degree, n, true)
  const startBound = phBound(genU, genV, knots, degree)

  const problem = new ClosedPHDragProblem(genU, genV, targetU, targetV, knots, degree, G)
  // Primal-dual with the closure equality as the KKT border (ne-core primal_dual_eq_solve).
  const ip = new PrimalDualOptimizer(problem, {
    maxIterations: opts.maxIterations ?? 60,
    returnBestFeasible: true,
  })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  const res = problem.result()

  // exact closure projection
  let out = projectClosurePHPeriodic(res.u, res.v, knots, degree, G)
  // strict-S⁻ guard: if the bound grew, bisect back toward the start (projecting each step).
  if (phBound(out.u, out.v, knots, degree) > startBound) {
    let lo = 0, hi = 1
    for (let it = 0; it < 26; it++) {
      const a = (lo + hi) / 2
      const u = genU.map((g, i) => g + a * (res.u[i] - g))
      const v = genV.map((g, i) => g + a * (res.v[i] - g))
      const p = projectClosurePHPeriodic(u, v, knots, degree, G)
      if (phBound(p.u, p.v, knots, degree) <= startBound) lo = a
      else hi = a
    }
    const u = genU.map((g, i) => g + lo * (res.u[i] - g))
    const v = genV.map((g, i) => g + lo * (res.v[i] - g))
    out = projectClosurePHPeriodic(u, v, knots, degree, G)
    if (phBound(out.u, out.v, knots, degree) > startBound) out = { u: [...genU], v: [...genV] } // backstop
  }
  return { u: out.u, v: out.v, converged: r.converged }
}

// ============================================================================
// OPEN polynomial-PH drag, in core — on a CLAMPED preimage. The open case is the
// closed one minus closure: no ∮w² constraint, no Gram, no seam, no periodic
// projection. The generator is already the clamped chart the editor stores, so
// there is no curve↔generator round-trip and no expand/fold. We optimize the
// generator toward a target holding the curvature-extrema bound (sign of g, the
// OPEN numerator), through the interior-point solver (no equality border), then a
// strict-S⁻ guard. The editor keeps its CURVE-span guard on top (FOUNDATIONS F6).
// ============================================================================

/**
 * Open-PH drag over the CLAMPED preimage, variables in block order [u…, v…]. Objective
 * ½‖(u,v) − target‖²; constraints = the curvature bound only (sign of each active g
 * coefficient — the OPEN numerator, no closure). g and ∂g via curvatureExtremaNumeratorPH
 * (closed = false) / phJacobian (open).
 */
class OpenPHDragProblem implements OptimizationProblem {
  readonly numEqualityConstraints = 0
  private u: number[]
  private v: number[]
  private readonly target: number[]
  private readonly n: number
  private readonly activeIdx: number[]
  private signs: number[]
  private readonly gScale: number[]
  private readonly margins: number[]
  private readonly knots: readonly number[]
  private readonly degree: number

  constructor(
    genU: readonly number[], genV: readonly number[],
    targetU: readonly number[], targetV: readonly number[],
    knots: readonly number[],
    degree: number,
  ) {
    this.knots = knots
    this.degree = degree
    this.n = genU.length
    this.u = genU.slice()
    this.v = genV.slice()
    this.target = [...targetU, ...targetV]
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    const scaleAbs = gc.map((x) => Math.max(Math.abs(x), 1e-12))
    const inactive = computeInactiveSetBySign(s, gc.map(Math.abs))
    // Hold only ACTIVE coefficients STRICTLY FEASIBLE at the start (slack > tol) — the same
    // sliding-mechanism rule as the closed path (ne-core); a boundary coeff held rigid pins
    // the drag, and the anchors/runs already permit it to merge.
    this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i) && s[i] * gc[i] / scaleAbs[i] < -1e-12)
    this.signs = this.activeIdx.map((i) => s[i])
    this.gScale = this.activeIdx.map((i) => scaleAbs[i])
    this.margins = this.activeIdx.map(() => 0)
  }

  private numerator() { return curvatureExtremaNumeratorPH(this.u, this.v, this.knots, this.degree, false) }

  get numVariables(): number { return 2 * this.n }
  get numConstraints(): number { return this.activeIdx.length }
  getVariables(): number[] { return [...this.u, ...this.v] }
  setVariables(x: number[]): void { this.u = x.slice(0, this.n); this.v = x.slice(this.n) }

  computeObjective(): number {
    const x = this.getVariables()
    let s = 0
    for (let i = 0; i < x.length; i++) { const d = x[i] - this.target[i]; s += 0.5 * d * d }
    return s
  }
  computeObjectiveGradient(): number[] { return this.getVariables().map((xi, i) => xi - this.target[i]) }
  computeObjectiveHessianDiagonal(): number[] { return new Array<number>(2 * this.n).fill(1) }

  computeConstraints(): number[] {
    const gc = this.numerator().flatCoeffs()
    return this.activeIdx.map((i, k) => gc[i] / this.gScale[k] - this.signs[k] * this.margins[k])
  }
  computeConstraintJacobian(): Matrix {
    const J = phJacobian(this.u, this.v, this.knots, this.degree, false, 'analytic') // [nG][2n] interleaved
    return this.activeIdx.map((i, k) => {
      const row = J[i]
      const block = new Array<number>(2 * this.n)
      for (let j = 0; j < this.n; j++) { block[j] = row[2 * j] / this.gScale[k]; block[this.n + j] = row[2 * j + 1] / this.gScale[k] }
      return block
    })
  }

  getConstraintSigns(): number[] { return this.signs }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void {
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    this.signs = this.activeIdx.map((i) => s[i])
  }

  result(): { u: number[]; v: number[] } { return { u: [...this.u], v: [...this.v] } }
}

export interface OpenPHDragOptions { maxIterations?: number; enableBFGS?: boolean }

/**
 * One open-PH drag (clamped preimage): optimize toward (targetU, targetV) holding the
 * curvature bound (open numerator), then strict-S⁻-guard (bisect the generator back toward
 * the start if numerical slip raised S⁻; hard backstop keeps the start). Returns the new
 * clamped preimage. Bound-faithful in generator space — the editor adds its curve-span guard.
 */
export function slideOpenPH(
  genU: readonly number[], genV: readonly number[],
  targetU: readonly number[], targetV: readonly number[],
  knots: readonly number[], degree: number,
  opts: OpenPHDragOptions = {},
): { u: number[]; v: number[]; converged: boolean } {
  const startBound = phBoundOpen(genU, genV, knots, degree)

  const problem = new OpenPHDragProblem(genU, genV, targetU, targetV, knots, degree)
  const ip = new InteriorPointOptimizer(problem, {
    maxIterations: opts.maxIterations ?? 40,
    enableBFGS: opts.enableBFGS ?? false,
    returnBestFeasible: true,
  })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  let res = problem.result()

  // strict-S⁻ guard: if the bound grew, bisect back toward the start (no closure to project).
  if (phBoundOpen(res.u, res.v, knots, degree) > startBound) {
    let lo = 0, hi = 1
    for (let it = 0; it < 26; it++) {
      const a = (lo + hi) / 2
      const u = genU.map((g, i) => g + a * (res.u[i] - g))
      const v = genV.map((g, i) => g + a * (res.v[i] - g))
      if (phBoundOpen(u, v, knots, degree) <= startBound) lo = a
      else hi = a
    }
    const u = genU.map((g, i) => g + lo * (res.u[i] - g))
    const v = genV.map((g, i) => g + lo * (res.v[i] - g))
    res = phBoundOpen(u, v, knots, degree) <= startBound ? { u, v } : { u: [...genU], v: [...genV] } // backstop
  }
  return { u: res.u, v: res.v, converged: r.converged }
}
