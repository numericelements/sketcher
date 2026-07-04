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
import { projectClosurePH, generatorBasisGram } from './phClosure'
import {
  curvatureExtremaNumeratorPlanarPeriodic,
} from './curvature'
import { curvatureExtremaReducedNumeratorPH, reducedPHGradient } from './phCurvature'
import { assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { computeInactiveSetBySignCyclic } from './curvatureProblem'
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
}

export function slideClosedPHCurveBound(
  u0: readonly number[],
  v0: readonly number[],
  x0in: number,
  y0in: number,
  uvKnots: readonly number[],
  uvDegree: number,
  /** Curve-CP targets: tick-start CLAMPED CPs with the dragged one at the cursor (NO refit). */
  targetCPs: readonly { x: number; y: number }[],
  seam: { seamContinuity: number; wrapSign: number },
  opts: ClosedPHCurveBoundOptions = {},
): { u: number[]; v: number[]; x0: number; y0: number; converged: boolean } {
  const N = u0.length
  const nz = 2 + 2 * N
  const G = generatorBasisGram(uvKnots as number[], uvDegree, N)
  let u = u0.slice()
  let v = v0.slice()
  let x0 = x0in
  let y0 = y0in
  const M0 = computePHCurveFromUV(u, v, uvKnots as number[], uvDegree, x0, y0).controlPoints.length

  // Constraints: the REDUCED PH numerator R (F7: g_curve = 2·R·σ², σ² > 0 → same
  // sign changes as the curve-span g — verified pointwise 400/400), computed on
  // the CLAMPED generator chart and counted CYCLICALLY (R is continuous across
  // the seam: all its ingredients are quadratic in w). Degree 4m−2 on generator
  // spans — the PH structure exploited to its fullest; no curve build needed for
  // constraint evaluation, and the Jacobian is the exact AD reduced gradient.
  const Rof = (uu: readonly number[], vv: readonly number[]) =>
    curvatureExtremaReducedNumeratorPH(uu, vv, uvKnots as number[], uvDegree, false).flatCoeffs()

  const buildClamped = (z: number[]) =>
    computePHCurveFromUV(z.slice(2, 2 + N), z.slice(2 + N), uvKnots as number[], uvDegree, z[0], z[1]).controlPoints

  const margins = new Map<number, number>()
  const passes = Math.max(1, opts.passes ?? 2)
  let converged = false

  for (let pass = 0; pass < passes; pass++) {
    let z = [x0, y0, ...u, ...v]
    // --- RAW constraint state at pass start (pure signs, cyclic anchors) ---
    const rc0 = Rof(u, v)
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

    const fFrom = (uu: readonly number[], vv: readonly number[]) => {
      const rc = Rof(uu, vv)
      return active.map((i) => signsAll[i] * rc[i] + (margins.get(i) ?? 0))
    }
    const f0From = (clamped: { x: number; y: number }[]) => {
      let sm = 0
      for (let i = 0; i < M0; i++) {
        const dx = clamped[i].x - targetCPs[i].x
        const dy = clamped[i].y - targetCPs[i].y
        sm += 0.5 * (dx * dx + dy * dy)
      }
      return sm
    }
    const ensure = () => {
      if (atZ) return atZ
      atZ = {
        f: fFrom(z.slice(2, 2 + N), z.slice(2 + N)),
        f0: f0From(buildClamped(z)),
        g0: [],
        J: null,
        JtJ: null,
      }
      return atZ
    }
    /** Analytic Jacobians — one build per state: R rows via the exact AD reduced
     *  gradient (x₀,y₀ columns are zero: R depends only on the generator);
     *  objective gradient/GN Hessian via phControlPointJacobian. */
    const buildJ = () => {
      const a = ensure()
      if (a.J) return
      const rg = reducedPHGradient(z.slice(2, 2 + N), z.slice(2 + N), uvKnots as number[], uvDegree, false)
      const duF = rg.du.map((bd) => bd.flatCoeffs())
      const dvF = rg.dv.map((bd) => bd.flatCoeffs())
      const J: number[][] = active.map(() => new Array<number>(nz).fill(0))
      for (let rI = 0; rI < active.length; rI++) {
        const flat = active[rI]
        const sgn = signsAll[flat]
        for (let i = 0; i < N; i++) {
          J[rI][2 + i] = sgn * duF[i][flat]
          J[rI][2 + N + i] = sgn * dvF[i][flat]
        }
      }
      const Jph = phControlPointJacobian(z.slice(2, 2 + N), z.slice(2 + N), uvKnots as number[], uvDegree)
      const clamped = buildClamped(z)
      const res = clamped.map((pt, i) => ({ x: pt.x - targetCPs[i].x, y: pt.y - targetCPs[i].y }))
      const g0v = new Array<number>(nz).fill(0)
      for (let k = 0; k < nz; k++) {
        const d = Jph[k]
        let gs = 0
        for (let j = 0; j < M0; j++) gs += res[j].x * d.dx[j] + res[j].y * d.dy[j]
        g0v[k] = gs
      }
      const JtJ = new TRSymmetricMatrix(nz)
      for (let k = 0; k < nz; k++) {
        for (let l = 0; l <= k; l++) {
          let sm = 0
          const dk = Jph[k]
          const dl = Jph[l]
          for (let j = 0; j < M0; j++) sm += dk.dx[j] * dl.dx[j] + dk.dy[j] * dl.dy[j]
          JtJ.set(k, l, sm)
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
        f: fFrom(zc.slice(2, 2 + N), zc.slice(2 + N)),
        f0: f0From(buildClamped(zc)),
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
    u = z.slice(2, 2 + N)
    v = z.slice(2 + N)

    // --- decoupled closure (Eric's design) + projection-sized margins next pass ---
    const rBefore = Rof(u, v)
    const pr = projectClosurePH(u, v, uvKnots as number[], uvDegree, seam.seamContinuity, seam.wrapSign, G)
    u = pr.u
    v = pr.v
    const rAfter = Rof(u, v)
    for (const i of active) {
      const dRi = Math.abs(rAfter[i] - rBefore[i])
      margins.set(i, Math.max(margins.get(i) ?? 0, 1.2 * dRi))
    }
  }
  return { u, v, x0, y0, converged }
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
