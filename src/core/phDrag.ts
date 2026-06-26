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
import { computePHCurveFromUV, phControlPointJacobian, type CPDerivative } from './phCurveConstruction'

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

// ============================================================================
// OPEN polynomial-PH drag with the DIRECT cursor-tracking objective — the faithful
// port of the sketcher's PHCurveProblem (the working legacy path), in core.
//
// The earlier slideOpenPH used a generator-space L2 objective (½‖gen − target_gen‖²),
// which does NOT pin the dragged CURVE control point to the cursor → the curve "comes
// alive" and ignores the hand. This problem instead tracks the dragged CURVE control
// point straight to the cursor (objective on the BUILT curve's control points, via the
// core computePHCurveFromUV + phControlPointJacobian), exactly like the legacy. Variables
// are [x0, y0, u…, v…] (origin + generator); the constraint is the curvature-extrema
// bound (generator-side g — for OPEN this equals the displayed curve-span bound, proven).
// ============================================================================

/**
 * Open-PH drag tracking the dragged CURVE control point to the cursor. Variables
 * [x0, y0, u…, v…]; objective ½·Σ wᵢ‖curveCPᵢ − targetᵢ‖² (target = current curve except
 * the dragged CP → cursor; weights dragged=10, endpoints=5, else 1 — the legacy weights);
 * constraints = the active curvature-extrema g coefficients (sign held). g and ∂g via the
 * low-degree PH numerator / analytic phJacobian; the curve value + ∂curveCP/∂var via the
 * core PH construction (g is translation-invariant, so the x0,y0 constraint columns are 0).
 */
class OpenPHTrackingDragProblem implements OptimizationProblem {
  readonly numEqualityConstraints = 0
  private x0: number
  private y0: number
  private u: number[]
  private v: number[]
  private readonly n: number
  private readonly knots: readonly number[]
  private readonly degree: number
  private readonly targetX: number[]
  private readonly targetY: number[]
  private readonly cpWeights: number[]
  private readonly activeIdx: number[]
  private signs: number[]
  private readonly gScale: number[]
  private _cpJac: CPDerivative[] | null = null

  constructor(
    genU: readonly number[], genV: readonly number[], x0: number, y0: number,
    knots: readonly number[], degree: number,
    curveCPs: readonly { x: number; y: number }[], dragIndex: number, targetX: number, targetY: number,
  ) {
    this.u = genU.slice()
    this.v = genV.slice()
    this.x0 = x0
    this.y0 = y0
    this.n = genU.length
    this.knots = knots
    this.degree = degree
    this.targetX = curveCPs.map((p) => p.x)
    this.targetY = curveCPs.map((p) => p.y)
    this.targetX[dragIndex] = targetX
    this.targetY[dragIndex] = targetY
    const m = curveCPs.length
    this.cpWeights = new Array<number>(m).fill(1)
    this.cpWeights[dragIndex] = 10
    this.cpWeights[0] = 5
    this.cpWeights[m - 1] = 5
    // Active set on the generator g (same sliding-mechanism rule as slideOpenPH): hold only
    // active coefficients strictly feasible at the start.
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    const scaleAbs = gc.map((x) => Math.max(Math.abs(x), 1e-12))
    const inactive = computeInactiveSetBySign(s, gc.map(Math.abs))
    this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i) && s[i] * gc[i] / scaleAbs[i] < -1e-12)
    this.signs = this.activeIdx.map((i) => s[i])
    this.gScale = this.activeIdx.map((i) => scaleAbs[i])
  }

  private numerator() { return curvatureExtremaNumeratorPH(this.u, this.v, this.knots, this.degree, false) }
  private cpJac(): CPDerivative[] {
    if (!this._cpJac) this._cpJac = phControlPointJacobian(this.u, this.v, this.knots as number[], this.degree)
    return this._cpJac
  }
  private curveCPs() { return computePHCurveFromUV(this.u, this.v, this.knots as number[], this.degree, this.x0, this.y0).controlPoints }

  get numVariables(): number { return 2 + 2 * this.n }
  get numConstraints(): number { return this.activeIdx.length }
  getVariables(): number[] { return [this.x0, this.y0, ...this.u, ...this.v] }
  setVariables(x: number[]): void {
    this.x0 = x[0]; this.y0 = x[1]
    this.u = x.slice(2, 2 + this.n); this.v = x.slice(2 + this.n)
    this._cpJac = null
  }

  computeObjective(): number {
    const cps = this.curveCPs()
    let f = 0
    const m = Math.min(cps.length, this.targetX.length)
    for (let i = 0; i < m; i++) {
      const dx = cps[i].x - this.targetX[i], dy = cps[i].y - this.targetY[i]
      f += this.cpWeights[i] * 0.5 * (dx * dx + dy * dy)
    }
    return f
  }
  computeObjectiveGradient(): number[] {
    const nv = this.numVariables
    const grad = new Array<number>(nv).fill(0)
    const cps = this.curveCPs()
    const jac = this.cpJac()
    const m = Math.min(cps.length, this.targetX.length)
    for (let v = 0; v < nv; v++) {
      const { dx, dy } = jac[v]
      let g = 0
      for (let i = 0; i < m; i++) {
        g += this.cpWeights[i] * ((cps[i].x - this.targetX[i]) * dx[i] + (cps[i].y - this.targetY[i]) * dy[i])
      }
      grad[v] = g
    }
    return grad
  }
  computeObjectiveHessianDiagonal(): number[] {
    // Gauss-Newton diagonal Σ wᵢ(dxᵢ² + dyᵢ²) — the curve-CP least-squares curvature.
    const jac = this.cpJac()
    const m = this.targetX.length
    return this.getVariables().map((_, v) => {
      const { dx, dy } = jac[v]
      let h = 0
      for (let i = 0; i < m; i++) h += this.cpWeights[i] * (dx[i] * dx[i] + dy[i] * dy[i])
      return Math.max(h, 1e-9)
    })
  }

  computeConstraints(): number[] {
    const gc = this.numerator().flatCoeffs()
    return this.activeIdx.map((i, k) => gc[i] / this.gScale[k])
  }
  computeConstraintJacobian(): Matrix {
    const J = phJacobian(this.u, this.v, this.knots, this.degree, false, 'analytic') // [nG][2n] interleaved
    const nv = this.numVariables
    return this.activeIdx.map((i, k) => {
      const row = J[i]
      const out = new Array<number>(nv).fill(0) // cols 0,1 = x0,y0 → 0 (g translation-invariant)
      for (let j = 0; j < this.n; j++) { out[2 + j] = row[2 * j] / this.gScale[k]; out[2 + this.n + j] = row[2 * j + 1] / this.gScale[k] }
      return out
    })
  }
  getConstraintSigns(): number[] { return this.signs }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void {
    const gc = this.numerator().flatCoeffs()
    const s = assignSignsNeighbor(gc)
    this.signs = this.activeIdx.map((i) => s[i])
  }

  result(): { x0: number; y0: number; u: number[]; v: number[] } { return { x0: this.x0, y0: this.y0, u: [...this.u], v: [...this.v] } }
}

export interface OpenPHTrackingOptions { maxIterations?: number; enableBFGS?: boolean }

/**
 * One open-PH drag tracking the dragged CURVE control point to (targetX, targetY) — the
 * faithful core analogue of the legacy optimizePHCurve. Optimizes [x0,y0,u,v] holding the
 * curvature bound, then a strict-S⁻ guard (bisect the generator back toward the start if
 * numerical slip raised S⁻; hard backstop keeps the start). Returns the new origin + generator.
 */
export function slideOpenPHTracking(
  genU: readonly number[], genV: readonly number[], x0: number, y0: number,
  knots: readonly number[], degree: number,
  curveCPs: readonly { x: number; y: number }[], dragIndex: number, targetX: number, targetY: number,
  opts: OpenPHTrackingOptions = {},
): { u: number[]; v: number[]; x0: number; y0: number; converged: boolean } {
  const startBound = phBoundOpen(genU, genV, knots, degree)
  const problem = new OpenPHTrackingDragProblem(genU, genV, x0, y0, knots, degree, curveCPs, dragIndex, targetX, targetY)
  const ip = new InteriorPointOptimizer(problem, {
    maxIterations: opts.maxIterations ?? 24,
    enableBFGS: opts.enableBFGS ?? false,
    returnBestFeasible: true,
  })
  const r = ip.optimize()
  problem.setVariables(r.variables)
  let res = problem.result()

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
    res = phBoundOpen(u, v, knots, degree) <= startBound
      ? { x0: x0 + lo * (res.x0 - x0), y0: y0 + lo * (res.y0 - y0), u, v }
      : { x0, y0, u: [...genU], v: [...genV] }
  }
  return { u: res.u, v: res.v, x0: res.x0, y0: res.y0, converged: r.converged }
}
