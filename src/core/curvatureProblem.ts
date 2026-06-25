import type { Matrix } from './linalg'
import type { OptimizationProblem, OptimizerConfig } from './optimize'
import { PrimalDualOptimizer } from './optimize'
import { BarrierOptimizer } from './barrierOptimizer'
import { BandedPrimalDualOptimizer } from './bandedPrimalDual'
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import { buildSymmetryReduction, SymmetryReducedProblem } from './symmetryReduction'
import {
  curvatureExtremaNumeratorPlanar,
  curvatureExtremaNumeratorPlanarPeriodic,
  inflectionNumeratorPlanar,
  inflectionNumeratorPlanarPeriodic,
  openCurvatureExtremaParameters,
  closedCurvatureExtremaParameters,
} from './curvature'
import {
  curvatureExtremaGradientPlanar,
  curvatureExtremaGradientPlanarPeriodicLocal,
  curvatureExtremaGradientPlanarPeriodicLocalCols,
  curvatureExtremaGradientPlanarLocal,
  inflectionGradientPlanar,
  inflectionGradientPlanarPeriodicLocal,
  precomputePeriodicSeeds,
  precomputeOpenSeeds,
} from './gradient'
import type { PeriodicSeeds, OpenSeeds } from './gradient'
import { curvatureExtremaHessianPlanarWeighted } from './curvatureHessian'
import type { BernsteinDecomposition } from './bernstein'
import { cyclicSignChanges } from './bernstein'
import type { PlanarCurvatureGradient } from './gradient'

/** Per coefficient: −1 if g>0 (keep ≥0), +1 if g≤0 (keep ≤0). Exact-0 → +1. */
function assignSigns(gc: number[]): number[] {
  return gc.map((v) => (v > 0 ? -1 : 1))
}

const SIGN_NOISE_REL = 1e-9
/**
 * Neighbour-aware sign assignment for the robust (unscaled) regime. A
 * coefficient above the noise floor takes the sign of its own value; a near-zero
 * one — the STRUCTURALLY ZERO clamped-boundary coefficient our core computes as
 * exactly 0 — takes its nearest determined neighbour's sign. That mirrors what
 * the sketcher gets for free from its tiny roundoff residual (g[0] ≈ +7.8e-3):
 * the boundary coefficient joins its run, stays ACTIVE, and is enforced, so the
 * solve coordinates the neighbours to keep it feasible instead of letting it
 * slide across zero (a real extremum).
 */
export function assignSignsNeighbor(gc: number[]): number[] {
  const maxAbs = Math.max(1e-300, ...gc.map(Math.abs))
  const noise = SIGN_NOISE_REL * maxAbs
  const det = gc.map((v) => (Math.abs(v) <= noise ? 0 : v > 0 ? -1 : 1))
  const out = det.slice()
  const n = det.length
  for (let i = 0; i < n; i++) {
    if (det[i] !== 0) continue
    let l = i - 1
    while (l >= 0 && det[l] === 0) l--
    let r = i + 1
    while (r < n && det[r] === 0) r++
    const dl = l >= 0 ? i - l : Infinity
    const dr = r < n ? r - i : Infinity
    out[i] = dl <= dr ? (l >= 0 ? det[l] : 1) : r < n ? det[r] : 1
    if (out[i] === 0) out[i] = 1
  }
  return out
}

/** Sliding active set driven by the ASSIGNED signs (robust regime): a near-zero
 *  coefficient that took its run's sign shares its neighbour's sign and so stays
 *  active. Within each alternating-sign run keep the largest-|g| anchor active. */
function computeInactiveSetBySign(signs: number[], absVal: number[]): Set<number> {
  const inactive = new Set<number>()
  const n = signs.length
  let i = 0
  while (i < n - 1) {
    if (signs[i] !== signs[i + 1]) {
      const seq = [
        { idx: i, abs: absVal[i] },
        { idx: i + 1, abs: absVal[i + 1] },
      ]
      let j = i + 1
      while (j < n - 1 && signs[j] !== signs[j + 1]) {
        j++
        seq.push({ idx: j, abs: absVal[j] })
      }
      const anchor = seq.reduce((m, e) => (e.abs > m.abs ? e : m))
      for (const e of seq) if (e.idx !== anchor.idx) inactive.add(e.idx)
      i = j + 1
    } else {
      i++
    }
  }
  return inactive
}

/** Tiny feasible-side margin (in raw g units) for structurally-zero ACTIVE
 *  coefficients, so g=0 starts at a small POSITIVE slack — the analogue of the
 *  sketcher's roundoff residual — instead of exactly 0 (a barrier wall). The
 *  excursion it permits is MARGIN_REL·max|g| ≈ noise, never a real extremum. */
const MARGIN_REL = 1e-9
export function structuralMargins(gcAll: number[], activeIdx: number[]): number[] {
  const maxAbs = Math.max(1e-300, ...gcAll.map(Math.abs))
  const noise = SIGN_NOISE_REL * maxAbs
  const margin = MARGIN_REL * maxAbs
  return activeIdx.map((i) => (Math.abs(gcAll[i]) <= noise ? margin : 0))
}

/**
 * Anchor-based sliding active set (the talk's mechanism). Walk the g Bernstein
 * coefficients: within each maximal alternating-sign run (consecutive products
 * ≤ 0, so a zero joins the run on either side) keep only the anchor (largest
 * |g|) active and let the rest slide; positions with same-sign neighbours stay
 * active. Inactive constraints are dropped from the barrier but the active
 * anchors still bound S⁻ by the variation-diminishing property. This matches the
 * sketcher's proven setup; a structurally-zero boundary coefficient lands in the
 * inactive set (so it does not wall the solve), and the robust IPOPT solver
 * keeps the bound via the neighbouring active anchor.
 */
function computeInactiveSet(gc: number[]): Set<number> {
  const inactive = new Set<number>()
  const n = gc.length
  let i = 0
  while (i < n - 1) {
    if (gc[i] * gc[i + 1] <= 0) {
      const seq = [
        { idx: i, abs: Math.abs(gc[i]) },
        { idx: i + 1, abs: Math.abs(gc[i + 1]) },
      ]
      let j = i + 1
      while (j < n - 1 && gc[j] * gc[j + 1] <= 0) {
        j++
        seq.push({ idx: j, abs: Math.abs(gc[j]) })
      }
      const anchor = seq.reduce((m, e) => (e.abs > m.abs ? e : m))
      for (const e of seq) if (e.idx !== anchor.idx) inactive.add(e.idx)
      i = j + 1
    } else {
      i++
    }
  }
  return inactive
}

/**
 * Per-constraint scale = |coeff|, but floored at `SCALE_FLOOR_REL · max|coeff|`.
 *
 * Dividing each active constraint by |coeff| normalizes the slacks to ≈1 and
 * collapses g's huge dynamic range (the conditioning fix). But a coefficient
 * that is NOISE — |coeff| far below machine epsilon relative to the largest
 * (e.g. 7.6e-6 next to 3.5e14, ratio 2e-20, from catastrophic cancellation in
 * the Bernstein products) — must NOT become the divisor: that would blow its
 * Jacobian row up by ~1/noise and let the optimizer flip a meaningless sign,
 * spuriously raising the bound S⁻. The floor caps how small a divisor can be,
 * so genuinely small-but-meaningful coefficients still get per-constraint
 * scaling while noise-level ones are treated as ≈the floor.
 */
const SCALE_FLOOR_REL = 1e-12
function scaleFor(coeffs: number[], activeIdx: number[]): number[] {
  const maxAbs = Math.max(1e-300, ...coeffs.map(Math.abs))
  const floor = SCALE_FLOOR_REL * maxAbs
  return activeIdx.map((i) => Math.max(Math.abs(coeffs[i]), floor))
}

/**
 * Per-constraint scale for the SCALED-ROBUST regime — well-conditioned for the
 * banded solver AND faithful for the structural zero, the reconciliation the plain
 * scaled (`scaleFor`) and raw (`noScale`) regimes each got half-right.
 *
 * A normal coefficient is scaled by |g_i| (→ slack ≈ 1, as in `scaleFor`). A
 * STRUCTURALLY-ZERO active coefficient (|g_i| ≤ noise) is scaled by **max|g|**, NOT
 * the `1e-12` floor: the floor would blow its Jacobian row up by ~1/floor and wreck
 * the conditioning, whereas max|g| gives a normal-magnitude row (∇g_i / max|g|). Its
 * feasible-side margin then lives in those same scaled units — see
 * `structuralMarginsScaled` — so g=0 starts a hair off its wall and cannot cross.
 */
function scaleForRobust(coeffs: number[], activeIdx: number[]): number[] {
  const maxAbs = Math.max(1e-300, ...coeffs.map(Math.abs))
  const noise = SIGN_NOISE_REL * maxAbs
  const floor = SCALE_FLOOR_REL * maxAbs
  return activeIdx.map((i) => (Math.abs(coeffs[i]) <= noise ? maxAbs : Math.max(Math.abs(coeffs[i]), floor)))
}

/** Scaled-units margin for `scaleForRobust`: a structural-zero active coefficient
 *  (scaled by max|g|) gets MARGIN_REL, so its slack = margin − sign·(g/max) ≈
 *  MARGIN_REL > 0 — off its wall yet unable to cross (it can drift at most
 *  MARGIN_REL·max|g| in raw g, i.e. noise). Normal coefficients get 0. */
function structuralMarginsScaled(gcAll: number[], activeIdx: number[]): number[] {
  const maxAbs = Math.max(1e-300, ...gcAll.map(Math.abs))
  const noise = SIGN_NOISE_REL * maxAbs
  return activeIdx.map((i) => (Math.abs(gcAll[i]) <= noise ? MARGIN_REL : 0))
}

/**
 * The sliding mechanism's state, fixed ONCE at the start of a drag. Every g
 * Bernstein coefficient is assigned a definite sign here (even a near-zero one)
 * — the mechanism then PRESERVES those assigned signs for the whole drag, never
 * re-deriving a sign from a noise-level value mid-drag. Recomputing per frame let
 * a near-zero coefficient flicker sign, which destabilized the bound S⁻ and the
 * constraint coloring. Carry this across the drag's frames (optimizer + display).
 */
export interface CurvatureConstraintState {
  /** g Bernstein coefficients at the start (for the display; values are fixed). */
  gCPs: number[]
  /** Per coefficient: −1 if g>0, +1 if g<0 (assigned once at the start). */
  signs: number[]
  /** Non-anchor members of alternating runs — allowed to slide. */
  inactiveIndices: number[]
  /** Per coefficient scale (floored), for conditioning. */
  gScale: number[]
  /** Per coefficient parameter position, for the constraint-bar display. */
  grevilleAbscissae: number[]
}

/** Compute the constraint state from a curve — call ONCE at drag start, then reuse. */
export function planarCurvatureConstraintState(
  cpX: readonly number[],
  cpY: readonly number[],
  knots: readonly number[],
  degree: number,
  opts: { disableSliding?: boolean; robust?: boolean } = {},
): CurvatureConstraintState {
  const g = curvatureExtremaNumeratorPlanar(cpX, cpY, knots, degree)
  const gc = g.flatCoeffs()
  // The robust regime (IPOPT path) keeps the structurally-zero boundary
  // coefficient active via its neighbour's sign; the banded regime uses the
  // raw sign rule and value-based sliding. Match whichever solver will run so
  // the fixed drag-start signs agree with the optimizer's constraint set.
  const signs = opts.robust ? assignSignsNeighbor(gc) : assignSigns(gc)
  const inactive = opts.disableSliding
    ? new Set<number>()
    : opts.robust
      ? computeInactiveSetBySign(signs, gc.map(Math.abs))
      : computeInactiveSet(gc)
  const gScale = scaleFor(
    gc,
    gc.map((_, i) => i),
  )
  const grevilleAbscissae: number[] = []
  for (let s = 0; s < g.coeffs.length; s++) {
    const a = g.breaks[s]
    const b = g.breaks[s + 1]
    const m = g.coeffs[s].length
    for (let j = 0; j < m; j++) grevilleAbscissae.push(a + (m > 1 ? j / (m - 1) : 0) * (b - a))
  }
  return { gCPs: gc, signs, inactiveIndices: [...inactive], gScale, grevilleAbscissae }
}

/** Cyclic version of computeInactiveSetBySign for CLOSED curves: the g coefficient
 *  sequence is a loop, so an alternating-sign run can wrap the seam (coeff n−1 ↔ 0).
 *  Start the scan at a same-sign boundary so runs don't split across the seam; a fully
 *  alternating cycle is one run keeping the single global anchor. Freeing only run-
 *  interior coefficients means a freed flip can merge two extrema, never create one —
 *  the closed analogue of the variation-diminishing argument. */
function computeInactiveSetBySignCyclic(signs: number[], absVal: number[]): Set<number> {
  const n = signs.length
  const inactive = new Set<number>()
  if (n < 2) return inactive
  let start = -1
  for (let i = 0; i < n; i++) if (signs[i] === signs[(i + 1) % n]) { start = (i + 1) % n; break }
  if (start === -1) {
    // Fully alternating cycle: one run around the loop, keep the global anchor.
    let anchor = 0
    for (let i = 1; i < n; i++) if (absVal[i] > absVal[anchor]) anchor = i
    for (let i = 0; i < n; i++) if (i !== anchor) inactive.add(i)
    return inactive
  }
  // Linear scan over the rotation starting at the boundary — no run wraps the seam now.
  let p = 0
  while (p < n - 1) {
    const i = (start + p) % n, iN = (start + p + 1) % n
    if (signs[i] !== signs[iN]) {
      const seq = [{ idx: i, abs: absVal[i] }, { idx: iN, abs: absVal[iN] }]
      let q = p + 1
      while (q < n - 1) {
        const j = (start + q) % n, jN = (start + q + 1) % n
        if (signs[j] !== signs[jN]) { q++; seq.push({ idx: jN, abs: absVal[jN] }) } else break
      }
      const anchor = seq.reduce((m, e) => (e.abs > m.abs ? e : m))
      for (const e of seq) if (e.idx !== anchor.idx) inactive.add(e.idx)
      p = q + 1
    } else {
      p++
    }
  }
  return inactive
}

/** CLOSED-curve constraint state — call ONCE at drag start, reuse every tick. Uses the
 *  PERIODIC numerator (the layout the closed solver constrains) and the CYCLIC inactive
 *  set, so freezing it holds S⁻ non-increasing across a fast closed drag (signs can't
 *  flicker tick-to-tick). Mirrors planarCurvatureConstraintState for the open case. */
export function periodicCurvatureConstraintState(
  cpX: readonly number[],
  cpY: readonly number[],
  knots: readonly number[],
  degree: number,
  opts: { disableSliding?: boolean; robust?: boolean } = {},
): CurvatureConstraintState {
  const g = curvatureExtremaNumeratorPlanarPeriodic(cpX, cpY, knots, degree)
  const gc = g.flatCoeffs()
  const signs = opts.robust ? assignSignsNeighbor(gc) : assignSigns(gc)
  const inactive = opts.disableSliding ? new Set<number>() : computeInactiveSetBySignCyclic(signs, gc.map(Math.abs))
  const gScale = scaleFor(gc, gc.map((_, i) => i))
  const grevilleAbscissae: number[] = []
  for (let s = 0; s < g.coeffs.length; s++) {
    const a = g.breaks[s], b = g.breaks[s + 1], m = g.coeffs[s].length
    for (let j = 0; j < m; j++) grevilleAbscissae.push(a + (m > 1 ? j / (m - 1) : 0) * (b - a))
  }
  return { gCPs: gc, signs, inactiveIndices: [...inactive], gScale, grevilleAbscissae }
}

/**
 * The "sliding mechanism" as an optimization problem: drag one control point to
 * a target while keeping the curvature-extrema bound. Objective is weighted
 * least-squares to the targets; constraints keep the sign of every ACTIVE
 * Bernstein coefficient of g (anchors + same-sign positions), so S⁻(g) — the
 * bound on curvature extrema — is monotone non-increasing.
 */
export class PlanarCurvatureProblem implements OptimizationProblem {
  cpX: number[]
  cpY: number[]
  readonly numEqualityConstraints = 0

  private knots: number[]
  private degree: number
  private closed: boolean
  private targetX: number[]
  private targetY: number[]
  private weights: number[]
  private anchorX: number[]
  private anchorY: number[]
  private anchorWeight: number
  private signs: number[] // per ACTIVE g constraint
  private activeIdx: number[] // indices into g.flatCoeffs()
  // Per-constraint scale = |g_i| at the start (floored). Dividing each
  // constraint (and its Jacobian row) by this normalizes every active slack to
  // ≈1 at the start, collapsing g's huge dynamic range (its Bernstein coeffs
  // can span >10 orders of magnitude on real curves — e.g. 0.4 next to 1e12 —
  // which otherwise makes the KKT system hopelessly ill-conditioned and the
  // optimizer give up). Sign-invariant (scale > 0), so the feasible set and the
  // bound are unchanged; only the numerics improve.
  private gScale: number[] = []
  private margins: number[] = []
  private preserveInflections: boolean
  private fActiveIdx: number[] = []
  private fSigns: number[] = []
  private fScale: number[] = []
  private fMargins: number[] = []
  private cachedCons: number[] | null = null
  private cachedJac: Matrix | null = null
  private cachedLocalJac: { vars: number[]; vals: number[] }[] | null = null
  // Geometry-independent seeds for the periodic local gradient — depend only on
  // (knots, degree, n), so precompute ONCE here and reuse across every Jacobian
  // build of the drag (the curve moves ~50×/frame; the seeds never change).
  private periodicSeeds: PeriodicSeeds | null = null
  // Geometry-independent seeds for the OPEN local gradient — same idea as
  // periodicSeeds, precomputed once so each Jacobian build is O(n·d²) not O(n²).
  private openSeeds: OpenSeeds | null = null

  constructor(
    cpX: readonly number[],
    cpY: readonly number[],
    knots: readonly number[],
    degree: number,
    dragIndex: number,
    targetX: number,
    targetY: number,
    opts: {
      disableSliding?: boolean
      weights?: number[]
      closed?: boolean
      anchorX?: number[]
      anchorY?: number[]
      anchorWeight?: number
      preserveInflections?: boolean
      /** Extra objective weight on the dragged point so it tracks the cursor. */
      dragWeight?: number
      /** Fixed sign/active-set from drag start (preferred over recomputing). */
      constraintState?: CurvatureConstraintState
      /**
       * Use RAW (unscaled) constraints — gScale ≡ 1 — instead of dividing each
       * by |g_i|. The per-constraint scaling conditions the lean Mehrotra/barrier
       * solvers but it floors a structurally-zero coefficient at the noise level,
       * which blows up its Jacobian row and makes that constraint impossible to
       * enforce (the drag stalls or the bound is violated). The robust IPOPT
       * solver handles the raw dynamic range via its trust region, exactly as the
       * sketcher does, so it takes the unscaled form.
       */
      noScale?: boolean
      /**
       * SCALED-ROBUST regime for the BANDED solvers: per-constraint scaling (so the
       * banded factorization is well-conditioned) AND neighbour signs + structural
       * margins (so a structural-zero coefficient can't cross → bound-faithful). The
       * structural zero is scaled by max|g| (a normal-magnitude row), not the noise
       * floor. This is the reconciliation `noScale` (faithful but ill-conditioned)
       * and the plain scaled regime (well-conditioned but not faithful) each missed.
       */
      robustScaled?: boolean
    } = {},
  ) {
    this.cpX = [...cpX]
    this.cpY = [...cpY]
    this.knots = [...knots]
    this.degree = degree
    this.closed = opts.closed ?? false
    if (this.closed) this.periodicSeeds = precomputePeriodicSeeds(this.knots, this.degree, this.cpX.length)
    else this.openSeeds = precomputeOpenSeeds(this.knots, this.degree, this.cpX.length)
    this.targetX = [...cpX]
    this.targetY = [...cpY]
    this.targetX[dragIndex] = targetX
    this.targetY[dragIndex] = targetY
    this.weights = (opts.weights ?? cpX.map(() => 1)).slice()
    if (opts.dragWeight !== undefined) this.weights[dragIndex] = opts.dragWeight
    this.anchorX = opts.anchorX ?? [...this.cpX]
    this.anchorY = opts.anchorY ?? [...this.cpY]
    this.anchorWeight = opts.anchorWeight ?? 0

    this.preserveInflections = opts.preserveInflections ?? false

    // Two regimes. The ROBUST regime (`noScale`, used by the IPOPT solver and
    // the editor) mirrors the sketcher: unscaled (raw) constraints, neighbour-
    // aware signs that keep the structurally-zero clamped-boundary coefficient
    // ACTIVE in its run, and a tiny margin so g=0 starts at positive slack. The
    // BANDED regime (default, for the near-linear slide solvers) keeps the
    // per-constraint scaling and the value-based sliding set the banded
    // solvers were tuned for.
    if (opts.constraintState) {
      // FIXED signs/active-set/scale from drag start — the sliding mechanism
      // follows the initial sign assignment instead of re-deriving each frame.
      const cs = opts.constraintState
      const inactive = new Set(cs.inactiveIndices)
      this.activeIdx = cs.signs.map((_, i) => i).filter((i) => !inactive.has(i))
      this.signs = this.activeIdx.map((i) => cs.signs[i])
      if (opts.noScale) {
        this.gScale = this.activeIdx.map(() => 1)
        this.margins = structuralMargins(cs.gCPs, this.activeIdx)
      } else if (opts.robustScaled) {
        this.gScale = scaleForRobust(cs.gCPs, this.activeIdx)
        this.margins = structuralMarginsScaled(cs.gCPs, this.activeIdx)
      } else {
        this.gScale = this.activeIdx.map((i) => cs.gScale[i])
        this.margins = this.activeIdx.map(() => 0)
      }
    } else if (opts.noScale) {
      const gc = this.numerator().flatCoeffs()
      const allSigns = assignSignsNeighbor(gc)
      const inactive = opts.disableSliding ? new Set<number>() : computeInactiveSetBySign(allSigns, gc.map(Math.abs))
      this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i))
      this.signs = this.activeIdx.map((i) => allSigns[i])
      this.gScale = this.activeIdx.map(() => 1)
      this.margins = structuralMargins(gc, this.activeIdx)
    } else if (opts.robustScaled) {
      // Scaled-robust: well-conditioned (per-constraint scaling) AND bound-faithful
      // (neighbour signs + structural margins), so the banded solvers stay fast yet
      // never let a structural-zero coefficient cross its sign wall.
      const gc = this.numerator().flatCoeffs()
      const allSigns = assignSignsNeighbor(gc)
      const inactive = opts.disableSliding ? new Set<number>() : computeInactiveSetBySign(allSigns, gc.map(Math.abs))
      this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i))
      this.signs = this.activeIdx.map((i) => allSigns[i])
      this.gScale = scaleForRobust(gc, this.activeIdx)
      this.margins = structuralMarginsScaled(gc, this.activeIdx)
    } else {
      const gc = this.numerator().flatCoeffs()
      const allSigns = assignSigns(gc)
      const inactive = opts.disableSliding ? new Set<number>() : computeInactiveSet(gc)
      this.activeIdx = gc.map((_, i) => i).filter((i) => !inactive.has(i))
      this.signs = this.activeIdx.map((i) => allSigns[i])
      this.gScale = scaleFor(gc, this.activeIdx)
      this.margins = this.activeIdx.map(() => 0)
    }

    if (this.preserveInflections) {
      const robust = opts.noScale || opts.robustScaled
      const fc = this.inflectionNumerator().flatCoeffs()
      const fAllSigns = robust ? assignSignsNeighbor(fc) : assignSigns(fc)
      const fInactive = opts.disableSliding
        ? new Set<number>()
        : robust
          ? computeInactiveSetBySign(fAllSigns, fc.map(Math.abs))
          : computeInactiveSet(fc)
      this.fActiveIdx = fc.map((_, i) => i).filter((i) => !fInactive.has(i))
      this.fSigns = this.fActiveIdx.map((i) => fAllSigns[i])
      this.fScale = opts.noScale
        ? this.fActiveIdx.map(() => 1)
        : opts.robustScaled
          ? scaleForRobust(fc, this.fActiveIdx)
          : scaleFor(fc, this.fActiveIdx)
      this.fMargins = opts.noScale
        ? structuralMargins(fc, this.fActiveIdx)
        : opts.robustScaled
          ? structuralMarginsScaled(fc, this.fActiveIdx)
          : this.fActiveIdx.map(() => 0)
    }
  }

  private numerator(): BernsteinDecomposition {
    return this.closed
      ? curvatureExtremaNumeratorPlanarPeriodic(this.cpX, this.cpY, this.knots, this.degree)
      : curvatureExtremaNumeratorPlanar(this.cpX, this.cpY, this.knots, this.degree)
  }
  private gradient(): PlanarCurvatureGradient {
    return this.closed
      ? curvatureExtremaGradientPlanarPeriodicLocal(this.cpX, this.cpY, this.knots, this.degree, this.periodicSeeds!)
      : curvatureExtremaGradientPlanar(this.cpX, this.cpY, this.knots, this.degree)
  }
  private inflectionNumerator(): BernsteinDecomposition {
    return this.closed
      ? inflectionNumeratorPlanarPeriodic(this.cpX, this.cpY, this.knots, this.degree)
      : inflectionNumeratorPlanar(this.cpX, this.cpY, this.knots, this.degree)
  }
  private inflectionGrad(): PlanarCurvatureGradient {
    return this.closed
      ? inflectionGradientPlanarPeriodicLocal(this.cpX, this.cpY, this.knots, this.degree, this.periodicSeeds!)
      : inflectionGradientPlanar(this.cpX, this.cpY, this.knots, this.degree)
  }
  /** Build the variable-space rows (length 2m) for a gradient's coeff index. */
  private jacRows(grad: PlanarCurvatureGradient, activeIdx: number[]): number[][] {
    const m = this.cpX.length
    const dxf = grad.dx.map((b) => b.flatCoeffs())
    const dyf = grad.dy.map((b) => b.flatCoeffs())
    return activeIdx.map((idx) => {
      const row = new Array<number>(2 * m)
      for (let j = 0; j < m; j++) {
        row[j] = dxf[j][idx]
        row[m + j] = dyf[j][idx]
      }
      return row
    })
  }

  get numVariables(): number {
    return this.cpX.length * 2
  }
  getVariables(): number[] {
    return [...this.cpX, ...this.cpY]
  }
  setVariables(x: number[]): void {
    const n = this.cpX.length
    this.cpX = x.slice(0, n)
    this.cpY = x.slice(n)
    this.cachedCons = null
    this.cachedJac = null
    this.cachedLocalJac = null
  }

  computeObjective(): number {
    let s = 0
    const aw = this.anchorWeight
    for (let i = 0; i < this.cpX.length; i++) {
      const dx = this.cpX[i] - this.targetX[i]
      const dy = this.cpY[i] - this.targetY[i]
      s += 0.5 * this.weights[i] * (dx * dx + dy * dy)
      if (aw > 0) {
        const ax = this.cpX[i] - this.anchorX[i]
        const ay = this.cpY[i] - this.anchorY[i]
        s += 0.5 * aw * (ax * ax + ay * ay)
      }
    }
    return s
  }
  computeObjectiveGradient(): number[] {
    const aw = this.anchorWeight
    const gx = this.cpX.map((x, i) => this.weights[i] * (x - this.targetX[i]) + aw * (x - this.anchorX[i]))
    const gy = this.cpY.map((y, i) => this.weights[i] * (y - this.targetY[i]) + aw * (y - this.anchorY[i]))
    return [...gx, ...gy]
  }
  computeObjectiveHessian(): Matrix {
    const n = this.numVariables
    const m = this.cpX.length
    const aw = this.anchorWeight
    const H: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0))
    for (let i = 0; i < m; i++) {
      H[i][i] = this.weights[i] + aw
      H[m + i][m + i] = this.weights[i] + aw
    }
    return H
  }
  /** Diagonal of the (diagonal) objective Hessian, block order [x₀…,y₀…] — O(n).
   *  Lets the banded barrier add the objective term without materialising the dense
   *  n×n matrix that computeObjectiveHessian + matScale would. */
  computeObjectiveHessianDiagonal(): number[] {
    const m = this.cpX.length
    const aw = this.anchorWeight
    const d = new Array<number>(2 * m)
    for (let i = 0; i < m; i++) {
      d[i] = this.weights[i] + aw
      d[m + i] = this.weights[i] + aw
    }
    return d
  }

  get numConstraints(): number {
    return this.activeIdx.length + (this.preserveInflections ? this.fActiveIdx.length : 0)
  }
  computeConstraints(): number[] {
    if (!this.cachedCons) {
      const gc = this.numerator().flatCoeffs()
      const cons = this.activeIdx.map((i, k) => gc[i] / this.gScale[k] - this.signs[k] * this.margins[k])
      if (this.preserveInflections) {
        const fc = this.inflectionNumerator().flatCoeffs()
        this.fActiveIdx.forEach((i, k) => cons.push(fc[i] / this.fScale[k] - this.fSigns[k] * this.fMargins[k]))
      }
      this.cachedCons = cons
    }
    return this.cachedCons
  }
  computeConstraintJacobian(): Matrix {
    // Divide each constraint row by its (floored) scale — matches computeConstraints.
    if (!this.cachedJac) {
      // Fast path (open, no inflection): scatter the O(n) cached-seed LOCAL gradient
      // into full-width rows instead of computing the dense O(n²) gradient. Same
      // numbers (gScale already applied in the local rows), ~15× cheaper at n=180 —
      // the assembly cost that dominated the drag. Closed/inflection keep the dense
      // gradient path below.
      const local = this.computeConstraintJacobianLocal()
      if (local) {
        const w = this.numVariables
        this.cachedJac = local.map((r) => {
          const row = new Array<number>(w).fill(0)
          for (let a = 0; a < r.vars.length; a++) row[r.vars[a]] = r.vals[a]
          return row
        })
      } else {
        const rows = this.jacRows(this.gradient(), this.activeIdx).map((row, k) =>
          row.map((v) => v / this.gScale[k]),
        )
        if (this.preserveInflections) {
          const fRows = this.jacRows(this.inflectionGrad(), this.fActiveIdx).map((row, k) =>
            row.map((v) => v / this.fScale[k]),
          )
          rows.push(...fRows)
        }
        this.cachedJac = rows
      }
    }
    return this.cachedJac
  }
  /**
   * Σ_k weights[k]·∇²c_k — the exact constraint-curvature term for a FULL-Newton
   * barrier step (vs Gauss-Newton, which drops it and tracks the cursor worse +
   * overshoots the bound near a binding constraint). c_k = g[activeIdx[k]]/gScale[k],
   * so ∇²c_k = ∇²g[activeIdx[k]]/gScale[k]; the weighted sum is folded to g's flat
   * coefficient layout and evaluated by the Jet2 second-order AD Hessian. OPEN planar
   * only — closed and the inflection rows stay Gauss-Newton (return their zeros), which
   * is harmless (the barrier still converges, just without the extra curvature term).
   * Returns a dense 2n×2n matrix in block order [x₀..,y₀..]; it is band-sparse
   * (nonzero only for |i−j| ≤ degree), so the banded assembly scatters it cheaply.
   */
  computeConstraintHessianWeightedSum(weights: number[]): Matrix {
    const n = this.cpX.length
    const H: Matrix = Array.from({ length: 2 * n }, () => new Array<number>(2 * n).fill(0))
    if (this.closed) return H // exact Hessian is open-only for now (Jet2 seeds are open)
    const g = this.numerator()
    const numFlat = g.numSpans * (g.degree + 1)
    const wFlat = new Array<number>(numFlat).fill(0)
    // Curvature constraints come first (activeIdx.length of them); inflection rows, if
    // any, follow and are skipped (their ∇²f is not ported → Gauss-Newton for those).
    for (let k = 0; k < this.activeIdx.length; k++) {
      const w = weights[k]
      if (w !== 0) wFlat[this.activeIdx[k]] += w / this.gScale[k]
    }
    return curvatureExtremaHessianPlanarWeighted(this.cpX, this.cpY, this.knots, this.degree, wFlat, this.openSeeds!)
  }
  /**
   * Sparse per-active-constraint Jacobian: row k = {vars, vals} listing only the
   * variables ∂c_k/∂var ≠ 0 (the d+1 control points supporting g_k's span ×
   * x/y). Assembled in O(n·d²) from the LOCAL gradient — no full-width rows — so
   * an interior-point step that uses it (the banded barrier) is linear in the
   * number of control points. Open planar B-splines only (returns null otherwise).
   */
  computeConstraintJacobianLocal(): { vars: number[]; vals: number[] }[] | null {
    if (this.preserveInflections) return null
    if (this.cachedLocalJac) return this.cachedLocalJac
    const n = this.cpX.length
    const activePos = new Map<number, number>()
    this.activeIdx.forEach((flat, k) => activePos.set(flat, k))
    const rows = this.activeIdx.map(() => ({ vars: [] as number[], vals: [] as number[] }))

    if (this.closed) {
      // Closed: support spans WRAP the seam, so iterate the explicit span list of
      // each sparse periodic column. O(n·d²), no full-width column ever built.
      const grad = curvatureExtremaGradientPlanarPeriodicLocalCols(
        this.cpX, this.cpY, this.knots, this.degree, this.periodicSeeds ?? undefined,
      )
      const gDeg1 = grad.gDeg + 1
      for (let i = 0; i < n; i++) {
        const col = grad.cols[i]
        const gxc = col.gx.coeffs, gyc = col.gy.coeffs
        for (let ls = 0; ls < col.spans.length; ls++) {
          const s = col.spans[ls]
          for (let c = 0; c <= grad.gDeg; c++) {
            const k = activePos.get(s * gDeg1 + c)
            if (k === undefined) continue
            // Divide (not multiply by 1/scale) to stay BIT-identical to the dense
            // jacRows path — the closed seam drag is near-singular, so a 1-ULP change
            // reshuffles which valid feasible point is reached.
            const sc = this.gScale[k]
            const vx = gxc[ls][c], vy = gyc[ls][c]
            if (vx !== 0) { rows[k].vars.push(i); rows[k].vals.push(vx / sc) }
            if (vy !== 0) { rows[k].vars.push(n + i); rows[k].vals.push(vy / sc) }
          }
        }
      }
      sortRowsByVar(rows)
      this.cachedLocalJac = rows
      return rows
    }

    const grad = curvatureExtremaGradientPlanarLocal(this.cpX, this.cpY, this.knots, this.degree, this.openSeeds ?? undefined)
    const gDeg1 = grad.gDeg + 1
    for (let i = 0; i < n; i++) {
      const col = grad.cols[i]
      if (col.s0 < 0) continue
      const gxc = col.gx.coeffs
      const gyc = col.gy.coeffs
      for (let ls = 0; ls < gxc.length; ls++) {
        const s = col.s0 + ls
        for (let c = 0; c <= grad.gDeg; c++) {
          const k = activePos.get(s * gDeg1 + c)
          if (k === undefined) continue
          const inv = 1 / this.gScale[k]
          const vx = gxc[ls][c]
          const vy = gyc[ls][c]
          if (vx !== 0) { rows[k].vars.push(i); rows[k].vals.push(vx * inv) }
          if (vy !== 0) { rows[k].vars.push(n + i); rows[k].vals.push(vy * inv) }
        }
      }
    }
    sortRowsByVar(rows)
    this.cachedLocalJac = rows
    return rows
  }
  getConstraintSigns(): number[] {
    return this.preserveInflections ? [...this.signs, ...this.fSigns] : this.signs
  }
  getInactiveConstraints(): Set<number> {
    return new Set<number>()
  }
  updateConstraintState(): void {
    const gc = this.numerator().flatCoeffs()
    const gSigns = assignSigns(gc)
    this.signs = this.activeIdx.map((i) => gSigns[i])
    if (this.preserveInflections) {
      const fc = this.inflectionNumerator().flatCoeffs()
      const fSigns = assignSigns(fc)
      this.fSigns = this.fActiveIdx.map((i) => fSigns[i])
    }
    this.cachedCons = null
    this.cachedJac = null
    this.cachedLocalJac = null
  }
}

/**
 * Sort each sparse Jacobian row's (vars, vals) by ascending variable index, in place.
 * The gradient/Hessian accumulation is order-independent (each variable gets one
 * contribution per constraint), but a fraction-to-boundary directional derivative
 * Jᵢ·step is a SUM over the support — summing in ascending index order makes it
 * bit-identical to the dense j=0…n scan (the skipped zeros are exact no-ops), which
 * matters on the near-singular closed seam drag where 1 ULP reshuffles the result.
 */
function sortRowsByVar(rows: { vars: number[]; vals: number[] }[]): void {
  for (const r of rows) {
    const order = r.vars.map((_, k) => k).sort((p, q) => r.vars[p] - r.vars[q])
    r.vars = order.map((k) => r.vars[k])
    r.vals = order.map((k) => r.vals[k])
  }
}

/**
 * Run one "slide": drag control point `dragIndex` toward (targetX, targetY)
 * while preserving the curvature-extrema bound. Returns the new control points.
 */
export function slideCurve(
  cpX: readonly number[],
  cpY: readonly number[],
  knots: readonly number[],
  degree: number,
  dragIndex: number,
  targetX: number,
  targetY: number,
  opts: {
    disableSliding?: boolean
    closed?: boolean
    anchorX?: number[]
    anchorY?: number[]
    anchorWeight?: number
    preserveInflections?: boolean
    symmetryMaps?: { mapX: number[] | null; mapY: number[] | null }
    dragWeight?: number
    constraintState?: CurvatureConstraintState
    /**
     * Which optimizer to use. DEFAULTS to 'ipopt' — the ported robust IPOPT-style
     * solver (trust region, filter, feasibility restoration) that gives reliable,
     * coordinated, never-bound-violating drags. 'primal-dual'/'barrier' are opt-in:
     * the banded (near-linear) solvers, best for large curves and the
     * method-comparison demo, but they can let the bound grow on a quick drag.
     */
    method?: 'primal-dual' | 'barrier' | 'ipopt'
    /**
     * IPOPT only. The drag objective is exactly a weighted least-squares term,
     * so its Hessian IS the (constant) identity-weighted diagonal — there is
     * nothing for BFGS to approximate. Gauss-Newton (the default here) uses that
     * exact Hessian: faster AND more accurate, converging in ~half the iterations
     * (this is what the ../sketcher deck does). Set true only to fall back to the
     * BFGS Lagrangian-Hessian approximation. Feasibility is enforced by the
     * barrier, not the Hessian, so the curvature bound holds either way.
     */
    enableBFGS?: boolean
    /**
     * IPOPT only. Solve the inner Newton/trust-region system with a BANDED LDLᵀ
     * (O(n·b²)) instead of dense Cholesky (O(n³)). Auto-gated to the open planar case
     * (well-conditioned scaled-robust regime). Same solver, faster linear algebra.
     */
    bandedSolve?: boolean
  } & Partial<OptimizerConfig> = {},
): { x: number[]; y: number[]; converged: boolean } {
  // Default to the robust IPOPT solver — it is the curvature-bound invariant
  // keeper. Banded/barrier are opt-in (the method-comparison demo). This used to
  // default to banded: a safe-looking footgun for any caller that omits `method`
  // (it can let the bound grow on a quick drag — see the design review).
  const method = opts.method ?? 'ipopt'
  const problem = new PlanarCurvatureProblem(cpX, cpY, knots, degree, dragIndex, targetX, targetY, {
    disableSliding: opts.disableSliding,
    closed: opts.closed,
    anchorX: opts.anchorX,
    anchorY: opts.anchorY,
    anchorWeight: opts.anchorWeight,
    preserveInflections: opts.preserveInflections,
    dragWeight: opts.dragWeight,
    constraintState: opts.constraintState,
    // Open AND closed planar drags take the SCALED-ROBUST regime: well-conditioned
    // for a banded/arrowhead factorization AND bound-faithful (neighbour signs +
    // structural margins). Closed uses the arrowhead solve (band + seam block); open
    // uses the plain band. Only symmetry-reduced ipopt keeps the raw (noScale) regime
    // (the reduced problem isn't interleaved-bandable).
    noScale: method === 'ipopt' && opts.symmetryMaps != null,
    robustScaled: !opts.symmetryMaps,
  })
  // Symmetry is enforced inside the solve via variable reduction (the result
  // is symmetric AND constraint-feasible — no post-projection).
  const solved: OptimizationProblem = opts.symmetryMaps
    ? new SymmetryReducedProblem(
        problem,
        buildSymmetryReduction(cpX.length, opts.symmetryMaps.mapX, opts.symmetryMaps.mapY),
      )
    : problem
  // The banded solvers assume control-point-interleaved variables with a banded
  // Jacobian, so they run only on the un-reduced, OPEN problem (no symmetry
  // reduction, no periodic wrap). The dense primal-dual handles the
  // closed/symmetric/reduced cases.
  const banded = !opts.symmetryMaps && !opts.closed
  let converged: boolean
  if (method === 'ipopt') {
    // The robust IPOPT-style solver: trust region + filter + feasibility
    // restoration give gradual, coordinated drags. Works on any problem (dense
    // Jacobian), so it also serves the symmetry/closed cases when selected.
    const ip = new InteriorPointOptimizer(solved, {
      maxIterations: opts.maxIterations ?? 80,
      // Gauss-Newton by default (exact Hessian for the least-squares drag
      // objective): full speed without giving up the feasibility guarantee.
      enableBFGS: opts.enableBFGS ?? false,
      returnBestFeasible: true,
      // Banded/arrowhead inner solve — any interleaved-bandable planar drag (open →
      // band, closed → arrowhead). Not symmetry-reduced (not interleaved).
      bandedSolve: (opts.bandedSolve ?? false) && !opts.symmetryMaps,
      // CLOSED → the band splits into band + seam block (arrowhead). Gating the seam
      // detection on this stops a wide constraint on a SMALL open curve from being
      // misread as a periodic wrap.
      closed: opts.closed ?? false,
      // Full-Newton exact constraint Hessian (open planar only; no-op for closed).
      enableExactHessian: opts.enableExactHessian ?? false,
    })
    const r = ip.optimize()
    solved.setVariables(r.variables)
    converged = r.converged
  } else {
    const optimizer =
      method === 'barrier' && banded
        ? new BarrierOptimizer(solved, { maxIterations: opts.maxIterations ?? 40, returnBestFeasible: true })
        : banded
          ? new BandedPrimalDualOptimizer(solved, { maxIterations: opts.maxIterations ?? 80, returnBestFeasible: true })
          : new PrimalDualOptimizer(solved, { maxIterations: opts.maxIterations ?? 80, returnBestFeasible: true })
    const result = optimizer.optimize()
    solved.setVariables(result.variables)
    converged = result.converged
  }

  // Strict sliding-mechanism enforcement (NOT a freeze): the interior-point solve
  // enforces sⱼ·gⱼ ≥ 0 only approximately near g≈0, so numerical slip can let the
  // BOUND S⁻ — the sign changes of g's coefficients, exactly what the St-Malo theorem
  // keeps monotone — tick up. After the solve we recompute S⁻ and, if it grew, pull the
  // result back along the straight path toward THIS tick's start just until S⁻ no longer
  // exceeds the start. The active set is re-evaluated every tick (the sliding mechanism
  // adapts — anchors + same-sign, interiors free to merge), nothing is pinned; this only
  // corrects the solver's numerical slip. S⁻ is counted on the NEIGHBOUR-ASSIGNED signs
  // (assignSignsNeighbor) so a structurally-zero coefficient (|g| below the noise floor)
  // takes its run's sign and does NOT fight the bound — the same noise-robust count the
  // display shows, cyclic for closed curves.
  const sOf = (x: readonly number[], y: readonly number[]) => {
    const gc = (opts.closed
      ? curvatureExtremaNumeratorPlanarPeriodic(x, y, knots, degree)
      : curvatureExtremaNumeratorPlanar(x, y, knots, degree)
    ).flatCoeffs()
    return cyclicSignChanges(assignSignsNeighbor(gc), opts.closed ?? false)
  }
  let rx = problem.cpX
  let ry = problem.cpY
  const startS = sOf(cpX, cpY)
  if (sOf(rx, ry) > startS) {
    let lo = 0
    let hi = 1
    for (let it = 0; it < 26; it++) {
      const mid = (lo + hi) / 2
      const xm = cpX.map((v, i) => v + mid * (rx[i] - v))
      const ym = cpY.map((v, i) => v + mid * (ry[i] - v))
      if (sOf(xm, ym) <= startS) lo = mid
      else hi = mid
    }
    rx = cpX.map((v, i) => v + lo * (rx[i] - v))
    ry = cpY.map((v, i) => v + lo * (ry[i] - v))
  }
  return { x: rx, y: ry, converged }
}
