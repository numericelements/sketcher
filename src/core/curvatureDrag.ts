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
import { PrimalDualOptimizer } from './optimize'
import {
  computeInactiveSetBySign, computeInactiveSetBySignCyclic,
  scaleForRobust, structuralMarginsScaled, enforceBoundNonincreasing,
} from './curvatureProblem'
import {
  familyNumerator, familyJacobian, familyBound,
  familyInflectionNumerator, familyInflectionBound, familyInflectionJacobianFD,
  type AlgebraicFamily, type Topology, type WeightedCP, type JacobianBackend,
} from './curvatureFamilies'
import {
  curvatureExtremaGradientComplexFixedWeightCols,
  curvatureExtremaGradientComplexPeriodicFixedWeightCols,
} from './curvature'
import type { Complex } from './complex'
import {
  TrustRegionBarrierOptimizer, TRDiagonalMatrix,
  type TrustRegionProblem, type TRMatrix,
} from './trustRegionOptimizer'
import { TrustRegionBarrierOptimizerBanded, type BandedTrustRegionProblem } from './trustRegionBanded'

/** Which solver navigates the constrained step. 'best' runs ipopt AND primal-dual,
 *  guards each, and keeps the one that tracks the cursor furthest — F4: no single
 *  solver wins every control point, but the furthest bound-holding result never
 *  regresses ("reshape, don't block"). 'trust-region' is the ported closed-curve
 *  optimizer (CGT near-exact subproblem + strict feasibility — lab notebook E15:
 *  95/91/80% on the size column where ipopt/primal-dual reach 46/17/6). */
export type DragSolver = 'ipopt' | 'primal-dual' | 'trust-region' | 'best'

export interface CurvatureDragOptions {
  jacobian?: JacobianBackend // 'fd' | 'analytic' | 'ad' (default 'fd' — universal)
  solver?: DragSolver // default 'best'
  maxIterations?: number
  enableBFGS?: boolean
  disableSliding?: boolean
  dragWeight?: number
  rho?: Complex
  /** Anchoring (drift resistance): adds a uniform ½·anchorWeight·Σ‖Pᵢ−anchorᵢ‖²
   *  Tikhonov term pulling every point toward its drag-START position (the
   *  targets already pull toward the tick-start positions). Identical semantics
   *  to PlanarCurvatureProblem's anchors — on the dragged point it is damping,
   *  so keep anchorWeight below the drag weight or the cursor loses the
   *  tug-of-war. anchorX/anchorY are the affine (re/im) coordinates; weights
   *  stay fixed. */
  anchorX?: number[]
  anchorY?: number[]
  anchorWeight?: number
  /** Also hold the INFLECTION-count bound: sign constraints on the active
   *  coefficients of f (polynomial: c′×c″; rational: det[H,H′,H″]) via the same
   *  sliding mechanism as g. Throws for complex weights (no defined f — see
   *  familyInflectionNumerator). */
  preserveInflections?: boolean
  /** Collect per-solve stall forensics (F11) in the result's `diag` field.
   *  Costs a few extra numerator evaluations — leave off in production drags. */
  diagnostics?: boolean
}

/**
 * Per-solve stall forensics (FOUNDATIONS F11). The two validated alarms:
 * `guardAlpha` ≈ 0 — the solver's whole step violated the true bound and the
 * Law-2 guard kept nothing (primal-dual's failure mode: a dead tick);
 * `finalDelta` collapsing (e.g. 3e2 → 2e-2) with `terminationReason:
 * 'max_iterations'` — the trust region shrank against model error near a
 * near-zero coefficient (ipopt's failure mode: a crawl). `translationDescent`
 * is the universal check: the objective's directional derivative along the
 * exactly-feasible translation toward the cursor, measured at the RETURNED
 * point — significantly negative means the result is provably not a KKT point
 * (rigid motions are never blocked by the bound).
 */
export interface SlideDiagnostics {
  solver: 'ipopt' | 'primal-dual'
  iterations: number
  converged: boolean
  terminationReason?: string
  /** ipopt only: trust-region radius at termination (Eric's stall gauge). */
  finalDelta?: number
  /** ‖raw solver output − start‖ over all affine coordinates. */
  rawStepNorm: number
  startBound: number
  /** S⁻ of the UNGUARDED solver output — above startBound = feasibility failure. */
  rawBound: number
  finalBound: number
  /** Step fraction the Law-2 guard kept: 1 clean, ~0 dead tick. */
  guardAlpha: number
  translationDescent: number
  /** When the guard pulled back: g coefficients whose robust sign flips within an
   *  ε step along the solver's direction — the knife edge itself. */
  knifeEdge?: { index: number; coeff: number }[]
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
  private cachedLocalJac: { vars: number[]; vals: number[] }[] | null = null
  // g's flat coefficients at the current state — THE expensive evaluation; every
  // consumer (constraints, sliding-sign refresh) reads through this cache so one
  // state costs one numerator build (measured 4-5 redundant builds per inner
  // trust-region iteration before this).
  private cachedGc: number[] | null = null
  private readonly kind: AlgebraicFamily
  private readonly knots: readonly number[]
  private readonly degree: number
  private readonly topology: Topology
  private readonly wRe: number[]
  private readonly wIm: number[]
  private readonly backend: JacobianBackend
  private readonly rho: Complex
  private readonly anchorRe: number[]
  private readonly anchorIm: number[]
  private readonly anchorWeight: number
  // Inflection constraint block (preserveInflections): the same sliding
  // mechanism applied to f's control polygon, appended after the g rows.
  private readonly preserveInflections: boolean
  private readonly fActiveIdx: number[] = []
  private fSigns: number[] = []
  private readonly fScale: number[] = []
  private readonly fMargins: number[] = []

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
    this.anchorRe = opts.anchorX ?? [...this.re]
    this.anchorIm = opts.anchorY ?? [...this.im]
    this.anchorWeight = opts.anchorWeight ?? 0

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

    // Inflection block — identical regime on f's control polygon.
    this.preserveInflections = opts.preserveInflections ?? false
    if (this.preserveInflections) {
      const fc = this.inflectionNumerator().flatCoeffs()
      const fSignsAll = assignSignsNeighbor(fc)
      const fInactive = opts.disableSliding
        ? new Set<number>()
        : (closed ? computeInactiveSetBySignCyclic(fSignsAll, fc.map(Math.abs)) : computeInactiveSetBySign(fSignsAll, fc.map(Math.abs)))
      this.fActiveIdx = fc.map((_, i) => i).filter((i) => !fInactive.has(i))
      this.fSigns = this.fActiveIdx.map((i) => fSignsAll[i])
      this.fScale = scaleForRobust(fc, this.fActiveIdx)
      this.fMargins = structuralMarginsScaled(fc, this.fActiveIdx)
    }
  }

  private cps(): WeightedCP[] {
    return this.re.map((re, i) => ({ re, im: this.im[i], wRe: this.wRe[i], wIm: this.wIm[i] }))
  }
  private numerator(): BernsteinDecomposition {
    return familyNumerator(this.kind, this.cps(), this.knots, this.degree, this.topology, this.rho)
  }
  private numeratorCoeffs(): number[] {
    if (!this.cachedGc) this.cachedGc = this.numerator().flatCoeffs()
    return this.cachedGc
  }
  private inflectionNumerator(): BernsteinDecomposition {
    return familyInflectionNumerator(this.kind, this.cps(), this.knots, this.degree, this.topology)
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
  get numConstraints(): number { return this.activeIdx.length + this.fActiveIdx.length }

  getVariables(): number[] { return [...this.re, ...this.im] }
  setVariables(x: number[]): void {
    const n = this.re.length
    this.re = x.slice(0, n)
    this.im = x.slice(n)
    this.cachedCons = null
    this.cachedJac = null
    this.cachedLocalJac = null
    this.cachedGc = null
  }

  computeObjective(): number {
    let s = 0
    const aw = this.anchorWeight
    for (let i = 0; i < this.re.length; i++) {
      const dx = this.re[i] - this.targetRe[i]
      const dy = this.im[i] - this.targetIm[i]
      s += 0.5 * this.weights[i] * (dx * dx + dy * dy)
      if (aw > 0) {
        const ax = this.re[i] - this.anchorRe[i]
        const ay = this.im[i] - this.anchorIm[i]
        s += 0.5 * aw * (ax * ax + ay * ay)
      }
    }
    return s
  }
  computeObjectiveGradient(): number[] {
    const aw = this.anchorWeight
    const gx = this.re.map((x, i) => this.weights[i] * (x - this.targetRe[i]) + aw * (x - this.anchorRe[i]))
    const gy = this.im.map((y, i) => this.weights[i] * (y - this.targetIm[i]) + aw * (y - this.anchorIm[i]))
    return [...gx, ...gy]
  }
  computeObjectiveHessianDiagonal(): number[] {
    const aw = this.anchorWeight
    return [...this.weights.map((w) => w + aw), ...this.weights.map((w) => w + aw)]
  }

  computeConstraints(): number[] {
    if (!this.cachedCons) {
      const gc = this.numeratorCoeffs()
      this.cachedCons = this.activeIdx.map((i, k) => gc[i] / this.gScale[k] - this.signs[k] * this.margins[k])
      if (this.preserveInflections) {
        const fc = this.inflectionNumerator().flatCoeffs()
        this.cachedCons.push(...this.fActiveIdx.map((i, k) => fc[i] / this.fScale[k] - this.fSigns[k] * this.fMargins[k]))
      }
    }
    return this.cachedCons
  }
  computeConstraintJacobian(): Matrix {
    if (!this.cachedJac) {
      const J = this.jacobianBlock()
      this.cachedJac = this.activeIdx.map((i, k) => J[i].map((v) => v / this.gScale[k]))
      if (this.preserveInflections) {
        // f rows: FD Jacobian (exact for f — linear in each affine coordinate),
        // remapped from interleaved to block order like the g rows.
        const n = this.re.length
        const JF = familyInflectionJacobianFD(this.kind, this.cps(), this.knots, this.degree, this.topology)
        this.cachedJac.push(...this.fActiveIdx.map((i, k) => {
          const row = JF[i]
          const out = new Array<number>(2 * n)
          for (let c = 0; c < n; c++) { out[c] = row[2 * c] / this.fScale[k]; out[n + c] = row[2 * c + 1] / this.fScale[k] }
          return out
        }))
      }
    }
    return this.cachedJac
  }

  /**
   * LOCAL (sparse) constraint Jacobian — the interior-point solver consumes this instead of
   * the dense one (O(active·d²) vs O(active·n²)), the #32 fast path. Each active g coefficient
   * lives on one span and depends only on the control points supporting it, so its row has
   * just ~2(degree+1) nonzeros. Computed from the per-control-point local-cols gradient
   * (same value terms + differential as the dense path → bit-identical), in BLOCK var order
   * (re_i → i, im_i → n+i), each row divided by gScale[k] exactly like the dense Jacobian.
   * Returns null for the polynomial family (the editor drives polynomial through the banded
   * `slideCurve`, not this generic problem) → the solver falls back to dense there.
   */
  computeConstraintJacobianLocal(): { vars: number[]; vals: number[] }[] | null {
    if (this.kind === 'polynomial') return null
    // Inflection rows have no local-cols path yet — fall back to the dense
    // Jacobian (PlanarCurvatureProblem does the same for its inflection rows).
    if (this.preserveInflections) return null
    if (this.cachedLocalJac) return this.cachedLocalJac
    const closed = this.topology === 'closed'
    const grad = closed
      ? curvatureExtremaGradientComplexPeriodicFixedWeightCols(this.re, this.im, this.wRe, this.wIm, this.knots, this.degree, undefined, this.rho)
      : curvatureExtremaGradientComplexFixedWeightCols(this.re, this.im, this.wRe, this.wIm, this.knots, this.degree)
    const gDeg1 = grad.gDeg + 1
    const n = this.re.length
    const activePos = new Map<number, number>()
    this.activeIdx.forEach((flat, k) => activePos.set(flat, k))
    const rows = this.activeIdx.map(() => ({ vars: [] as number[], vals: [] as number[] }))
    for (let i = 0; i < n; i++) {
      const col = grad.cols[i]
      const gxc = col.gx.coeffs, gyc = col.gy.coeffs
      for (let ls = 0; ls < col.spans.length; ls++) {
        const s = col.spans[ls]
        for (let c = 0; c <= grad.gDeg; c++) {
          const k = activePos.get(s * gDeg1 + c)
          if (k === undefined) continue // this g coefficient is not an active constraint
          const inv = 1 / this.gScale[k]
          const vx = gxc[ls][c] * inv, vy = gyc[ls][c] * inv
          if (vx !== 0) { rows[k].vars.push(i); rows[k].vals.push(vx) }
          if (vy !== 0) { rows[k].vars.push(n + i); rows[k].vals.push(vy) }
        }
      }
    }
    // sort each row's vars ascending so the solver's Jᵢ·step sum matches the dense scan order
    for (const r of rows) {
      const ord = r.vars.map((_, idx) => idx).sort((a, b) => r.vars[a] - r.vars[b])
      r.vars = ord.map((idx) => r.vars[idx])
      r.vals = ord.map((idx) => r.vals[idx])
    }
    this.cachedLocalJac = rows
    return rows
  }

  getConstraintSigns(): number[] {
    return this.preserveInflections ? [...this.signs, ...this.fSigns] : this.signs
  }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void {
    // Re-derive signs on the FIXED active set (the sliding mechanism: anchors + same-sign
    // stay active, signs follow the current g), matching PlanarCurvatureProblem.
    const gc = this.numeratorCoeffs()
    const signs = assignSignsNeighbor(gc)
    this.signs = this.activeIdx.map((i) => signs[i])
    if (this.preserveInflections) {
      const fc = this.inflectionNumerator().flatCoeffs()
      const fSignsAll = assignSignsNeighbor(fc)
      this.fSigns = this.fActiveIdx.map((i) => fSignsAll[i])
    }
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
): { points: WeightedCP[]; converged: boolean; diag?: SlideDiagnostics } {
  const rho = opts.rho ?? { re: 1, im: 0 }
  const wRe = cps.map((p) => p.wRe)
  const wIm = cps.map((p) => p.wIm)
  // Strict-guard metric: g's bound alone, or — with preserveInflections — the worst
  // EXCESS of either bound over its start value (0 at the start point, ≤ 0 iff both
  // bounds held), so one bisection enforces both Law-2 monotonicities at once.
  const gStart = familyBound(kind, cps, knots, degree, topology, rho)
  const fStart = opts.preserveInflections ? familyInflectionBound(kind, cps, knots, degree, topology) : 0
  const boundOf = opts.preserveInflections
    ? (p: readonly WeightedCP[]) => Math.max(
        familyBound(kind, p, knots, degree, topology, rho) - gStart,
        familyInflectionBound(kind, p, knots, degree, topology) - fStart,
      )
    : (p: readonly WeightedCP[]) => familyBound(kind, p, knots, degree, topology, rho)

  // The ported closed-curve trust-region solver over the SAME problem: f_i ≤ 0
  // orientation via core's constraint signs (E7/E15c-verified adapter semantics,
  // including the sliding-sign refresh on every ACCEPTED step). OPEN drags with a
  // local Jacobian take the BANDED O(n·b²) form (same mathematics, banded Cholesky
  // inside the CGT λ-iteration); everything else runs the dense port.
  const runTrustRegion = () => {
    const problem = new CurvatureDragProblem(
      kind, cps, knots, degree, topology, dragIndex, target,
      wRe, wIm, opts.jacobian ?? 'fd', rho, opts,
    )
    const finishTrustRegion = (converged: boolean) => {
      const raw = problem.result()
      const points = enforceBoundNonincreasing(
        cps as WeightedCP[], raw, boundOf,
        (a) => cps.map((p, i) => ({ re: p.re + a * (raw[i].re - p.re), im: p.im + a * (raw[i].im - p.im), wRe: p.wRe, wIm: p.wIm })),
      )
      return { points, converged }
    }
    // Open AND closed both ride the banded engine: closed curves get the seam
    // permutation + bordered Cholesky (band+border = the arrowhead with a true
    // triangular L). Dense fallback remains for inflections/polynomial/no-local.
    const localAvailable = !opts.preserveInflections
      && problem.computeConstraintJacobianLocal() !== null
    if (localAvailable) {
      // Constant-factor discipline: the numerator build is the drag's unit cost, so
      // (a) all AT-STATE values are cached per accepted step (the restore after a
      // candidate visit would otherwise force a full recomputation at x), and
      // (b) a candidate visit computes constraints AND objective in ONE evaluation
      // (the optimizer always asks fStep then f0Step for the same dx).
      let atX: { f: number[]; rows: { vars: number[]; vals: number[] }[]; f0: number; g0: number[] } | null = null
      let candidate: { dx: number[]; f: number[]; f0: number } | null = null
      const hessDiag = problem.computeObjectiveHessianDiagonal() // constant for the drag objective
      const ensureAtX = () => {
        if (atX) return atX
        const sg = problem.getConstraintSigns()
        const rows = problem.computeConstraintJacobianLocal()!
        atX = {
          f: problem.computeConstraints().map((v, i) => sg[i] * v),
          rows: rows.map((r, i) => ({ vars: r.vars, vals: r.vals.map((v) => sg[i] * v) })),
          f0: problem.computeObjective(),
          g0: problem.computeObjectiveGradient(),
        }
        return atX
      }
      const visitCandidate = (dx: number[]) => {
        if (candidate && candidate.dx === dx) return candidate
        const x = problem.getVariables()
        problem.setVariables(x.map((v, i) => v + dx[i]))
        const sg = problem.getConstraintSigns()
        candidate = {
          dx,
          f: problem.computeConstraints().map((v, i) => sg[i] * v),
          f0: problem.computeObjective(),
        }
        problem.setVariables(x)
        return candidate
      }
      const banded: BandedTrustRegionProblem = {
        get numberOfIndependentVariables() { return problem.numVariables },
        nCP: cps.length,
        get f0() { return ensureAtX().f0 },
        get gradient_f0() { return ensureAtX().g0 },
        get objectiveHessianDiagonal() { return hessDiag },
        get numberOfConstraints() { return problem.numConstraints },
        get f() { return ensureAtX().f },
        localRows() { return ensureAtX().rows },
        step(dx: number[]) {
          const x = problem.getVariables()
          problem.setVariables(x.map((v, i) => v + dx[i]))
          problem.updateConstraintState()
          atX = null
          candidate = null
        },
        fStep(dx: number[]) { return visitCandidate(dx).f },
        f0Step(dx: number[]) { return visitCandidate(dx).f0 },
      }
      const optimizer = new TrustRegionBarrierOptimizerBanded(banded)
      let converged = false
      try {
        optimizer.optimize(10e-8, 10, opts.maxIterations ?? 50)
        converged = optimizer.success
      } catch { /* keep committed feasible steps; guard below */ }
      return finishTrustRegion(converged)
    }
    const adapter: TrustRegionProblem = {
      get numberOfIndependentVariables() { return problem.numVariables },
      get f0() { return problem.computeObjective() },
      get gradient_f0() { return problem.computeObjectiveGradient() },
      get hessian_f0() { return new TRDiagonalMatrix(problem.computeObjectiveHessianDiagonal()) },
      get numberOfConstraints() { return problem.numConstraints },
      get f() {
        const sg = problem.getConstraintSigns()
        return problem.computeConstraints().map((v, i) => sg[i] * v)
      },
      get gradient_f(): TRMatrix {
        const sg = problem.getConstraintSigns()
        const J = problem.computeConstraintJacobian()
        return {
          shape: [J.length, problem.numVariables],
          get: (r: number, c: number) => sg[r] * J[r][c],
        }
      },
      step(dx: number[]) {
        const x = problem.getVariables()
        problem.setVariables(x.map((v, i) => v + dx[i]))
        problem.updateConstraintState()
      },
      fStep(dx: number[]) {
        const x = problem.getVariables()
        problem.setVariables(x.map((v, i) => v + dx[i]))
        const sg = problem.getConstraintSigns()
        const out = problem.computeConstraints().map((v, i) => sg[i] * v)
        problem.setVariables(x)
        return out
      },
      f0Step(dx: number[]) {
        const x = problem.getVariables()
        problem.setVariables(x.map((v, i) => v + dx[i]))
        const out = problem.computeObjective()
        problem.setVariables(x)
        return out
      },
    }
    const optimizer = new TrustRegionBarrierOptimizer(adapter)
    let converged = false
    try {
      optimizer.optimize(10e-8, 10, opts.maxIterations ?? 50)
      converged = optimizer.success
    } catch {
      // A solver failure keeps whatever steps were already committed (each was
      // strictly feasible); the guard below still enforces Law 2 on the result.
    }
    return finishTrustRegion(converged)
  }

  // One solve with the given method, then the strict-S⁻ guard (the result holds the bound).
  const runOne = (method: 'ipopt' | 'primal-dual') => {
    const problem = new CurvatureDragProblem(
      kind, cps, knots, degree, topology, dragIndex, target,
      wRe, wIm, opts.jacobian ?? 'fd', rho, opts,
    )
    const optimizer = method === 'primal-dual'
      ? new PrimalDualOptimizer(problem, { maxIterations: opts.maxIterations ?? 80, returnBestFeasible: true })
      : new InteriorPointOptimizer(problem, { maxIterations: opts.maxIterations ?? 40, enableBFGS: opts.enableBFGS ?? false, returnBestFeasible: true })
    const r = optimizer.optimize()
    problem.setVariables(r.variables)
    const raw = problem.result()
    let guardAlpha = 1
    let points = enforceBoundNonincreasing(
      cps as WeightedCP[], raw, boundOf,
      (a) => cps.map((p, i) => ({ re: p.re + a * (raw[i].re - p.re), im: p.im + a * (raw[i].im - p.im), wRe: p.wRe, wIm: p.wIm })),
      26,
      opts.diagnostics ? (a) => { guardAlpha = a } : undefined,
    )
    if (!opts.diagnostics) return { points, converged: r.converged }

    // Stall forensics (F11). Kept off the hot path — every field below is only
    // computed under the flag.
    const rawStepNorm = Math.sqrt(cps.reduce((s, p, i) => s + (raw[i].re - p.re) ** 2 + (raw[i].im - p.im) ** 2, 0))
    const rawBound = familyBound(kind, raw, knots, degree, topology, rho)
    const finalBound = familyBound(kind, points, knots, degree, topology, rho)
    // Translation-descent D: objective slope along the exactly-feasible translation
    // toward the cursor, at the RETURNED point. Targets are the tick-start positions
    // except the dragged one (the objective slide() actually minimized).
    const pull = { x: target.x - points[dragIndex].re, y: target.y - points[dragIndex].im }
    const pl = Math.hypot(pull.x, pull.y)
    let translationDescent = 0
    if (pl > 1e-12) {
      const u = { x: pull.x / pl, y: pull.y / pl }
      for (let i = 0; i < cps.length; i++) {
        const tx = i === dragIndex ? target.x : cps[i].re
        const ty = i === dragIndex ? target.y : cps[i].im
        translationDescent += (points[i].re - tx) * u.x + (points[i].im - ty) * u.y
      }
    }
    // Knife edge: when the guard pulled back, which g coefficients flip their robust
    // sign within an ε step along the solver's direction (the discontinuity F11 named).
    let knifeEdge: { index: number; coeff: number }[] | undefined
    if (guardAlpha < 1) {
      const eps = 1e-6
      const g0 = familyNumerator(kind, cps, knots, degree, topology, rho).flatCoeffs()
      const s0 = assignSignsNeighbor(g0)
      const nudged = cps.map((p, i) => ({
        re: p.re + eps * (raw[i].re - p.re), im: p.im + eps * (raw[i].im - p.im), wRe: p.wRe, wIm: p.wIm,
      }))
      const s1 = assignSignsNeighbor(familyNumerator(kind, nudged, knots, degree, topology, rho).flatCoeffs())
      knifeEdge = s0.flatMap((sv, i) => (sv !== s1[i] ? [{ index: i, coeff: g0[i] }] : []))
    }
    const diag: SlideDiagnostics = {
      solver: method,
      iterations: r.iterations,
      converged: r.converged,
      ...('terminationReason' in r ? { terminationReason: (r as { terminationReason?: string }).terminationReason } : {}),
      ...('finalDelta' in r ? { finalDelta: (r as { finalDelta?: number }).finalDelta } : {}),
      rawStepNorm,
      startBound: gStart,
      rawBound,
      finalBound,
      guardAlpha,
      translationDescent,
      ...(knifeEdge ? { knifeEdge } : {}),
    }
    return { points, converged: r.converged, diag }
  }

  const solver = opts.solver ?? 'best'
  if (solver === 'trust-region') return runTrustRegion()
  if (solver !== 'best') return runOne(solver)

  // best-of-solvers: both hold the bound (guarded); keep the one that tracks the cursor
  // furthest (its dragged point closest to the target). Never regresses — Law 2.
  const distToTarget = (r: { points: WeightedCP[] }) =>
    Math.hypot(r.points[dragIndex].re - target.x, r.points[dragIndex].im - target.y)
  const a = runOne('ipopt'), b = runOne('primal-dual')
  return distToTarget(b) < distToTarget(a) ? b : a
}
