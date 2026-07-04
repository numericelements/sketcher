// ============================================================================
// CLOSED-PH drag with the CURVE-SPAN bound inside the tracking solve (E14).
//
// The census measured the old pipeline at size (nCP=51): tracking −30%, raw
// curve bound 8→12 — the F6 gap (the solve held only the GENERATOR-span bound
// while the editor displays/guards the PERIODIC-REP curve bound). This module
// closes the gap at the solve level: the trust-region engine runs over the
// generator variables z = [x₀, y₀, u, v] with RAW constraint rows (pure signs,
// cyclic anchors, exact-zero exclusion) of the PERIODIC-REP curve numerator —
// the editor's displayed metric, Law 3 exact. Closure stays DECOUPLED (Eric's
// design): solve → projectClosurePH, iterated; pass 2 gives the solve margins
// sized to the projection's measured per-row perturbation so the (bound-blind)
// projection lands inside. E14 also showed the legacy REFIT target manufactures
// extrema (bound 10 vs start 8 from tick 1) — this formulation needs no refit:
// the objective is the generic drag's (dragged CP → cursor, rest anchored).
//
// The Law-2 guard stays where it always was: the EDITOR bisects the generator
// path (with re-projection) if the returned raw result's bound rose.
//
// Analytic constraint Jacobian (the E14 production chain):
//   ∂g_per/∂z = G_per · P · J_ph
//     G_per — planar periodic g-gradient wrt periodic CPs (existing local cols)
//     P     — the LINEAR clamped→periodic LS operator (fixed per knot vector;
//             cached per drag session)
//     J_ph  — ∂(clamped CPs)/∂[x₀,y₀,u,v] (existing phControlPointJacobian)
// FD-verified by closedPHCurveBound.test.ts.
// ============================================================================
import {
  computePHCurveFromUV, phControlPointJacobian,
} from './phCurveConstruction'
import { projectClosurePH, generatorBasisGram, phSeamMaps } from './phClosure'
import {
  curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaMarkersOfNumerator,
} from './curvature'
import { curvatureExtremaReducedNumeratorPH, reducedPHGradient } from './phCurvature'
import { assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { computeInactiveSetBySignCyclic, type CurvatureConstraintState } from './curvatureProblem'
import { findPeriodicSpan, periodicBasis, findOpenSpan, openBasis, mod } from './basis'
import {
  TrustRegionBarrierOptimizer, TRSymmetricMatrix,
  type TrustRegionProblem, type TRMatrix,
} from './trustRegionOptimizer'

// ----------------------------------------------------------------------------
// The linear clamped→periodic operator P (n_per × M), fixed per knot vector +
// seam continuity. Mirrors buildPeriodicPHCurve's LS fit exactly, but solves for
// the OPERATOR (P = argmin ‖A·P − E‖ column-wise) instead of one curve. Cached
// per drag session — knots do not change during a drag.
// ----------------------------------------------------------------------------
export interface PeriodicFitOperator {
  P: number[][] // n_per × M
  knots: number[]
  degree: number
}

const fitOpCache = new Map<string, PeriodicFitOperator>()

export function periodicFitOperator(
  clampedKnots: readonly number[],
  seamContinuity: number,
  M: number, // clamped control-point count
): PeriodicFitOperator {
  const key = `${seamContinuity}|${M}|${clampedKnots.join(',')}`
  const hit = fitOpCache.get(key)
  if (hit) return hit
  const degree = 5
  // periodic knot vector (same rule as buildPeriodicPHCurve)
  const interior: { v: number; mult: number }[] = []
  for (const k of clampedKnots) {
    if (k > 1e-9 && k < 1 - 1e-9) {
      const e = interior.find((x) => Math.abs(x.v - k) < 1e-9)
      if (e) e.mult++
      else interior.push({ v: k, mult: 1 })
    }
  }
  interior.sort((a, b) => a.v - b.v)
  const seamMult = degree - seamContinuity
  const Kp: number[] = []
  for (let r = 0; r < seamMult; r++) Kp.push(0)
  for (const b of interior) {
    const cm = Math.min(degree, b.mult)
    for (let r = 0; r < cm; r++) Kp.push(b.v)
  }
  const n = Kp.length
  const lo = clampedKnots[degree]
  const hi = clampedKnots[clampedKnots.length - degree - 1]
  const m = Math.max(4 * n, 240)
  // A (m×n): periodic basis rows.  E (m×M): clamped basis rows.
  const A: number[][] = []
  const E: number[][] = []
  for (let i = 0; i < m; i++) {
    const tt = i / m
    const rowA = new Array<number>(n).fill(0)
    const span = findPeriodicSpan(Kp, tt)
    const N = periodicBasis(span, tt, degree, Kp)
    for (let j = 0; j <= degree; j++) rowA[mod(span - degree + j, n)] += N[j]
    A.push(rowA)
    const tc = Math.min(lo + tt * (hi - lo), hi - 1e-9)
    const rowE = new Array<number>(M).fill(0)
    const spanC = findOpenSpan(degree, clampedKnots, tc)
    const Nc = openBasis(spanC, tc, degree, clampedKnots)
    for (let j = 0; j <= degree; j++) rowE[spanC - degree + j] += Nc[j]
    E.push(rowE)
  }
  // Normal equations, one factorization, M right-hand sides.
  const AtA = new TRSymmetricMatrix(n)
  for (let i = 0; i < m; i++) {
    const r = A[i]
    for (let a = 0; a < n; a++) {
      if (r[a] === 0) continue
      for (let b2 = 0; b2 <= a; b2++) if (r[b2] !== 0) AtA.addAt(a, b2, r[a] * r[b2])
    }
  }
  // tiny ridge for the (near-exact) fit — same spirit as leastSquares
  for (let a = 0; a < n; a++) AtA.addAt(a, a, 1e-12)
  const chol = new TRCholeskyLike(AtA)
  const P: number[][] = Array.from({ length: n }, () => new Array<number>(M).fill(0))
  const rhs = new Array<number>(n)
  for (let c = 0; c < M; c++) {
    rhs.fill(0)
    for (let i = 0; i < m; i++) {
      const e = E[i][c]
      if (e === 0) continue
      const r = A[i]
      for (let a = 0; a < n; a++) if (r[a] !== 0) rhs[a] += r[a] * e
    }
    const x = chol.solve(rhs)
    for (let a = 0; a < n; a++) P[a][c] = x[a]
  }
  const out: PeriodicFitOperator = { P, knots: Kp, degree }
  fitOpCache.set(key, out)
  return out
}

/** Small dense Cholesky over TRSymmetricMatrix (packed) — local helper. */
class TRCholeskyLike {
  private L: number[][]
  private n: number
  constructor(Mx: TRSymmetricMatrix) {
    const n = Mx.shape[0]
    this.n = n
    this.L = Array.from({ length: n }, () => new Array<number>(n).fill(0))
    for (let j = 0; j < n; j++) {
      let pivot = Mx.get(j, j)
      for (let k = 0; k < j; k++) pivot -= this.L[j][k] * this.L[j][k]
      if (pivot <= 0) throw new Error('periodicFitOperator: normal equations not SPD')
      const Ljj = Math.sqrt(pivot)
      this.L[j][j] = Ljj
      for (let i = j + 1; i < n; i++) {
        let v = Mx.get(i, j)
        for (let k = 0; k < j; k++) v -= this.L[i][k] * this.L[j][k]
        this.L[i][j] = v / Ljj
      }
    }
  }
  solve(b: number[]): number[] {
    const n = this.n
    const x = b.slice()
    for (let i = 0; i < n; i++) {
      let s = x[i]
      for (let k = 0; k < i; k++) s -= this.L[i][k] * x[k]
      x[i] = s / this.L[i][i]
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = x[i]
      for (let k = i + 1; k < n; k++) s -= this.L[k][i] * x[k]
      x[i] = s / this.L[i][i]
    }
    return x
  }
}

// ----------------------------------------------------------------------------
// The drag itself.
// ----------------------------------------------------------------------------
export interface ClosedPHCurveBoundOptions {
  /** Trust-region step budget per pass (default 30). */
  maxNumSteps?: number
  /** solve→project rounds (default 2; pass 2 carries projection-sized margins). */
  passes?: number
  /** Optional per-PERIODIC-CP objective weights (default all 1). */
  targetWeights?: readonly number[]
  /** Diagnostic hook: called after each pass's solve and after its projection. */
  onStage?: (stage: 'solve' | 'project', pass: number, u: readonly number[], v: readonly number[], x0: number, y0: number) => void
}

export function slideClosedPHCurveBound(
  u0: readonly number[],
  v0: readonly number[],
  x0in: number,
  y0in: number,
  uvKnots: readonly number[],
  uvDegree: number,
  /** PERIODIC curve-CP targets: tick-start periodic CPs with the dragged one at
   *  the cursor. The periodic handles ARE what the user drags — tracking them
   *  through the fit operator P kills the whole clamped-correspondence problem
   *  (clamped end CPs are clamping BLENDS, not copies of periodic CPs; mapping
   *  targets onto them pulled the wrong points near the seam). */
  targetCPs: readonly { x: number; y: number }[],
  seam: { seamContinuity: number; wrapSign: number },
  opts: ClosedPHCurveBoundOptions = {},
): { u: number[]; v: number[]; x0: number; y0: number; converged: boolean } {
  const N = u0.length
  // FREE seam coordinates: the wrap tail of the generator is expand()-dependent
  // (phSeamMaps). Solving over the full generator let the tail drift off its wrap
  // values, and projectClosurePH's expand SNAP then threw the seam region 60-170px
  // per tick (the all-CP sweep's backward/flying points). In free coordinates the
  // seam continuity holds EXACTLY throughout the solve and the projection is back
  // to the small min-norm Newton on the two closure conditions.
  const { K, expand, fold } = phSeamMaps(uvKnots as number[], uvDegree, N, seam.seamContinuity, seam.wrapSign)
  const nz = 2 + 2 * K
  const G = generatorBasisGram(uvKnots as number[], uvDegree, N)
  let uF = u0.slice(0, K)
  let vF = v0.slice(0, K)
  let x0 = x0in
  let y0 = y0in

  const clamped0 = computePHCurveFromUV(u0.slice(), v0.slice(), uvKnots as number[], uvDegree, x0, y0)
  const M0 = clamped0.controlPoints.length
  const fitOp = periodicFitOperator(clamped0.knots, seam.seamContinuity, M0)
  const P = fitOp.P
  const nPer = P.length
  if (targetCPs.length !== nPer) throw new Error(`slideClosedPHCurveBound: ${targetCPs.length} targets for ${nPer} periodic CPs`)

  // expand's matrix columns (identity + the wrap tail rows; ≤3 nonzeros each) —
  // used to fold full-generator Jacobian columns to the free coordinates.
  const expandCols: { i: number; c: number }[][] = []
  for (let j = 0; j < K; j++) {
    const e = new Array<number>(K).fill(0)
    e[j] = 1
    const col = expand(e)
    const entries: { i: number; c: number }[] = []
    for (let i = 0; i < N; i++) if (col[i] !== 0) entries.push({ i, c: col[i] })
    expandCols.push(entries)
  }

  // Constraints: the REDUCED PH numerator R (F7: g_curve = 2·R·σ², σ² > 0 → same
  // sign changes as the curve-span g — verified pointwise 400/400), computed on
  // the CLAMPED generator chart and counted CYCLICALLY (R is continuous across
  // the seam: all its ingredients are quadratic in w). Degree 4m−2 on generator
  // spans — the PH structure exploited to its fullest; no curve build needed for
  // constraint evaluation, and the Jacobian is the exact AD reduced gradient.
  const Rof = (uu: readonly number[], vv: readonly number[]) =>
    curvatureExtremaReducedNumeratorPH(uu, vv, uvKnots as number[], uvDegree, false).flatCoeffs()

  const uvOf = (z: number[]) => ({ u: expand(z.slice(2, 2 + K)), v: expand(z.slice(2 + K)) })
  const periodicOf = (z: number[]) => {
    const { u: uu, v: vv } = uvOf(z)
    const cl = computePHCurveFromUV(uu, vv, uvKnots as number[], uvDegree, z[0], z[1]).controlPoints
    const per: { x: number; y: number }[] = []
    for (let r = 0; r < nPer; r++) {
      const row = P[r]
      let x = 0
      let y = 0
      for (let j = 0; j < M0; j++) {
        x += row[j] * cl[j].x
        y += row[j] * cl[j].y
      }
      per.push({ x, y })
    }
    return per
  }

  const margins = new Map<number, number>()
  const passes = Math.max(1, opts.passes ?? 2)
  let converged = false

  for (let pass = 0; pass < passes; pass++) {
    let z = [x0, y0, ...uF, ...vF]
    // --- RAW constraint state at pass start (pure signs, cyclic anchors) ---
    const rc0 = Rof(expand(uF), expand(vF))
    const signsAll = rc0.map((val) => (val > 0 ? -1 : 1))
    const inactive = computeInactiveSetBySignCyclic(assignSignsNeighbor(rc0), rc0.map(Math.abs))
    const active = rc0.map((_, i) => i).filter((i) => !inactive.has(i) && rc0[i] !== 0)

    // --- per-state caches (bumped on committed steps) ---
    let atZ: {
      f: number[]
      f0: number
      g0: number[]
      J: number[][] | null
      JtJ: TRSymmetricMatrix | null
    } | null = null
    let candidate: { dx: number[]; f: number[]; f0: number } | null = null

    const fFrom = (z2: number[]) => {
      const { u: uu, v: vv } = uvOf(z2)
      const rc = Rof(uu, vv)
      return active.map((i) => signsAll[i] * rc[i] + (margins.get(i) ?? 0))
    }
    const wCP = opts.targetWeights ?? new Array<number>(nPer).fill(1)
    const f0From = (per: { x: number; y: number }[]) => {
      let sm = 0
      for (let i = 0; i < nPer; i++) {
        const dx = per[i].x - targetCPs[i].x
        const dy = per[i].y - targetCPs[i].y
        sm += 0.5 * wCP[i] * (dx * dx + dy * dy)
      }
      return sm
    }
    const ensure = () => {
      if (atZ) return atZ
      atZ = {
        f: fFrom(z),
        f0: f0From(periodicOf(z)),
        g0: [],
        J: null,
        JtJ: null,
      }
      return atZ
    }
    /** Analytic Jacobians — one build per state: R rows via the exact AD reduced
     *  gradient folded to the free coordinates; objective gradient/GN Hessian via
     *  phControlPointJacobian folded, then pushed through P to the periodic CPs. */
    const buildJ = () => {
      const a = ensure()
      if (a.J) return
      const { u: uu, v: vv } = uvOf(z)
      const rg = reducedPHGradient(uu, vv, uvKnots as number[], uvDegree, false)
      const duFlat = rg.du.map((bd) => bd.flatCoeffs())
      const dvFlat = rg.dv.map((bd) => bd.flatCoeffs())
      const J: number[][] = active.map(() => new Array<number>(nz).fill(0))
      const fullU = new Array<number>(N)
      const fullV = new Array<number>(N)
      for (let rI = 0; rI < active.length; rI++) {
        const flat = active[rI]
        const sgn = signsAll[flat]
        for (let i = 0; i < N; i++) {
          fullU[i] = duFlat[i][flat]
          fullV[i] = dvFlat[i][flat]
        }
        const fu = fold(fullU)
        const fv = fold(fullV)
        for (let j = 0; j < K; j++) {
          J[rI][2 + j] = sgn * fu[j]
          J[rI][2 + K + j] = sgn * fv[j]
        }
      }
      // Clamped-CP Jacobian columns (full generator) → free columns → periodic CPs.
      const Jph = phControlPointJacobian(uu, vv, uvKnots as number[], uvDegree)
      const perD: { dx: number[]; dy: number[] }[] = []
      const foldClampedCol = (base: number, entries: { i: number; c: number }[]) => {
        const dx = new Array<number>(M0).fill(0)
        const dy = new Array<number>(M0).fill(0)
        for (const { i, c } of entries) {
          const col = Jph[base + i]
          for (let j = 0; j < M0; j++) {
            dx[j] += c * col.dx[j]
            dy[j] += c * col.dy[j]
          }
        }
        return { dx, dy }
      }
      const toPeriodic = (cl: { dx: number[]; dy: number[] }) => {
        const dx = new Array<number>(nPer).fill(0)
        const dy = new Array<number>(nPer).fill(0)
        for (let r = 0; r < nPer; r++) {
          const row = P[r]
          for (let j = 0; j < M0; j++) {
            dx[r] += row[j] * cl.dx[j]
            dy[r] += row[j] * cl.dy[j]
          }
        }
        return { dx, dy }
      }
      perD.push(toPeriodic({ dx: Jph[0].dx.slice(), dy: Jph[0].dy.slice() }))
      perD.push(toPeriodic({ dx: Jph[1].dx.slice(), dy: Jph[1].dy.slice() }))
      for (let j = 0; j < K; j++) perD.push(toPeriodic(foldClampedCol(2, expandCols[j])))
      for (let j = 0; j < K; j++) perD.push(toPeriodic(foldClampedCol(2 + N, expandCols[j])))
      const per = periodicOf(z)
      const res = per.map((pt, i) => ({ x: wCP[i] * (pt.x - targetCPs[i].x), y: wCP[i] * (pt.y - targetCPs[i].y) }))
      const g0v = new Array<number>(nz).fill(0)
      for (let c = 0; c < nz; c++) {
        const d = perD[c]
        let gs = 0
        for (let r = 0; r < nPer; r++) gs += res[r].x * d.dx[r] + res[r].y * d.dy[r]
        g0v[c] = gs
      }
      const JtJ = new TRSymmetricMatrix(nz)
      for (let c = 0; c < nz; c++) {
        for (let l = 0; l <= c; l++) {
          let sm = 0
          const dc = perD[c]
          const dl = perD[l]
          for (let r = 0; r < nPer; r++) sm += wCP[r] * (dc.dx[r] * dl.dx[r] + dc.dy[r] * dl.dy[r])
          JtJ.set(c, l, sm)
        }
      }
      a.J = J
      a.g0 = g0v
      a.JtJ = JtJ
    }
    const visit = (dx: number[]) => {
      if (candidate && candidate.dx === dx) return candidate
      const zc = z.map((val, i) => val + dx[i])
      candidate = {
        dx,
        f: fFrom(zc),
        f0: f0From(periodicOf(zc)),
      }
      return candidate
    }
    const problem: TrustRegionProblem = {
      get numberOfIndependentVariables() { return nz },
      get f0() { return ensure().f0 },
      get gradient_f0() { buildJ(); return ensure().g0 },
      get hessian_f0(): TRMatrix { buildJ(); return ensure().JtJ! },
      get numberOfConstraints() { return active.length },
      get f() { return ensure().f },
      get gradient_f(): TRMatrix {
        buildJ()
        const J = ensure().J!
        return { shape: [active.length, nz], get: (r, c) => J[r][c] }
      },
      step(dx: number[]) {
        z = z.map((val, i) => val + dx[i])
        atZ = null
        candidate = null
      },
      fStep(dx: number[]) { return visit(dx).f },
      f0Step(dx: number[]) { return visit(dx).f0 },
    }
    try {
      const opt = new TrustRegionBarrierOptimizer(problem)
      opt.optimize(10e-8, 10, opts.maxNumSteps ?? 30)
      converged = opt.success
    } catch { /* committed steps are strictly feasible; the editor guard closes Law 2 */ }
    x0 = z[0]
    y0 = z[1]
    uF = z.slice(2, 2 + K)
    vF = z.slice(2 + K)
    opts.onStage?.('solve', pass, expand(uF), expand(vF), x0, y0)

    // --- decoupled closure (Eric's design) + projection-sized margins next pass.
    // In free coordinates the projection only enforces the two ∮w²=0 conditions
    // (min-norm Newton) — the seam wrap is already exact. ---
    const rBefore = Rof(expand(uF), expand(vF))
    const pr = projectClosurePH(expand(uF), expand(vF), uvKnots as number[], uvDegree, seam.seamContinuity, seam.wrapSign, G)
    uF = pr.u.slice(0, K)
    vF = pr.v.slice(0, K)
    opts.onStage?.('project', pass, pr.u, pr.v, x0, y0)
    const rAfter = Rof(pr.u, pr.v)
    for (const i of active) {
      const dRi = Math.abs(rAfter[i] - rBefore[i])
      margins.set(i, Math.max(margins.get(i) ?? 0, 1.2 * dRi))
    }
  }
  return { u: expand(uF), v: expand(vF), x0, y0, converged }
}

/** The ENFORCED closed-PH bound: cyclic robust count of the REDUCED numerator R
 *  on the clamped generator chart (same sign changes as the curve-span g — F7;
 *  the drag, the guard, and — eventually — the display must all read THIS). */
export function closedPHReducedBound(
  u: readonly number[],
  v: readonly number[],
  uvKnots: readonly number[],
  uvDegree: number,
): number {
  return cyclicSignChanges(
    assignSignsNeighbor(curvatureExtremaReducedNumeratorPH(u as number[], v as number[], uvKnots as number[], uvDegree, false).flatCoeffs()),
    true,
  )
}

// ----------------------------------------------------------------------------
// The closed-PH DISPLAY of the solved object (Law 3: displayed == enforced).
//
// The curve on screen is a second representation (the periodic LS view of the
// clamped PH curve), faithful to ~1e-6 — but counts are integers with knife
// edges: measured in the editor, a graze of g (a touch, not a crossing) read
// 4→6→4 on the VIEW's curve-span polygon while the enforced R count held 4.
// So the readout, the extrema markers, and the constraint bar must all read
// the SOLVED object: R of the generator (g = 2·R·σ², σ² > 0 — the PH curve
// defined by (u, v, origin) is the exact object; the periodic CPs are its
// view). These two functions return exactly what slideClosedPHCurveBound
// computes internally — one computation for solve, guard, and screen.
// ----------------------------------------------------------------------------

/** Constraint-bar state of the SOLVED closed-PH object: R's coefficients on the
 *  clamped generator chart, robust signs, and the CYCLIC sliding active set —
 *  the same quantities the drag constrains. Drop-in CurvatureConstraintState. */
export function closedPHConstraintState(
  u: readonly number[],
  v: readonly number[],
  uvKnots: readonly number[],
  uvDegree: number,
): CurvatureConstraintState {
  const R = curvatureExtremaReducedNumeratorPH(u, v, uvKnots as number[], uvDegree, false)
  const rc = R.flatCoeffs()
  const signs = assignSignsNeighbor(rc)
  const inactive = computeInactiveSetBySignCyclic(signs, rc.map(Math.abs))
  const grevilleAbscissae: number[] = []
  for (let sp = 0; sp < R.coeffs.length; sp++) {
    const a = R.breaks[sp]
    const b = R.breaks[sp + 1]
    const m = R.coeffs[sp].length
    for (let j = 0; j < m; j++) grevilleAbscissae.push(a + (m > 1 ? j / (m - 1) : 0) * (b - a))
  }
  return {
    gCPs: rc,
    signs,
    inactiveIndices: [...inactive],
    gScale: rc.map((c) => Math.max(Math.abs(c), 1e-12)),
    grevilleAbscissae,
  }
}

/** Curvature-extrema marker parameters of the SOLVED closed-PH object: the sign-
 *  change crossings of R, counted cyclically (seam wrap). R lives on the same
 *  parameter domain as the curve, so these t feed the displayed curve directly. */
export function closedPHExtremaMarkers(
  u: readonly number[],
  v: readonly number[],
  uvKnots: readonly number[],
  uvDegree: number,
): number[] {
  return curvatureExtremaMarkersOfNumerator(
    curvatureExtremaReducedNumeratorPH(u, v, uvKnots as number[], uvDegree, false),
    true,
  )
}

/** Build the PERIODIC representation via the cached linear operator — the SAME
 *  numbers slideClosedPHCurveBound constrains. Editors must build/display/guard
 *  through THIS (not an independent LS refit): near a merge the robust count is
 *  knife-edge sensitive, and two 1e-6-apart representations can honestly read
 *  8 vs 10 — display, enforcement, and guard must be ONE computation (Law 3). */
export function buildPeriodicPHViaOperator(
  u: readonly number[],
  v: readonly number[],
  uvKnots: readonly number[],
  uvDegree: number,
  x0: number,
  y0: number,
  seamContinuity: number,
): { controlPoints: { x: number; y: number }[]; knots: number[]; degree: number } {
  const clamped = computePHCurveFromUV(u as number[], v as number[], uvKnots as number[], uvDegree, x0, y0)
  const fitOp = periodicFitOperator(clamped.knots, seamContinuity, clamped.controlPoints.length)
  const nPer = fitOp.P.length
  const controlPoints: { x: number; y: number }[] = []
  for (let r = 0; r < nPer; r++) {
    const row = fitOp.P[r]
    let x = 0
    let y = 0
    for (let j = 0; j < clamped.controlPoints.length; j++) {
      x += row[j] * clamped.controlPoints[j].x
      y += row[j] * clamped.controlPoints[j].y
    }
    controlPoints.push({ x, y })
  }
  return { controlPoints, knots: fitOp.knots.slice(), degree: fitOp.degree }
}

/** The editor's displayed CURVE-span bound of a clamped closed-PH state — the
 *  metric this drag holds (periodic rep, robust cyclic count). */
export function closedPHCurveBoundOf(
  u: readonly number[],
  v: readonly number[],
  uvKnots: readonly number[],
  uvDegree: number,
  x0: number,
  y0: number,
  seamContinuity: number,
): number {
  const clamped = computePHCurveFromUV(u as number[], v as number[], uvKnots as number[], uvDegree, x0, y0)
  const fitOp = periodicFitOperator(clamped.knots, seamContinuity, clamped.controlPoints.length)
  const xs = new Array<number>(fitOp.P.length).fill(0)
  const ys = new Array<number>(fitOp.P.length).fill(0)
  for (let r = 0; r < fitOp.P.length; r++) {
    const row = fitOp.P[r]
    for (let j = 0; j < clamped.controlPoints.length; j++) {
      xs[r] += row[j] * clamped.controlPoints[j].x
      ys[r] += row[j] * clamped.controlPoints[j].y
    }
  }
  return cyclicSignChanges(
    assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(xs, ys, fitOp.knots, fitOp.degree).flatCoeffs()),
    true,
  )
}
