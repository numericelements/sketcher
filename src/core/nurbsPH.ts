// ============================================================================
// PH IMPOSED DIRECTLY ON A RATIONAL BÉZIER — the projective model, with no conformal lift.
//
// The unknowns are exactly what a NURBS editor already has, plus one polynomial:
//
//     P₀ … P_d ∈ ℝ³     control points          3(d+1)
//     w₀ … w_d          weights                   d+1
//     ρ                 the SPEED numerator, degree 2d−1        2d
//
// Write q = w·P for the homogeneous numerator and W = Σ wₖBₖ for the weight polynomial. Then
// x = q/W and x′ = N/W² with N = q′W − qW′, so PH says ‖N‖ is a polynomial — and ρ IS that
// polynomial. One condition, matched coefficient by coefficient:
//
//     ‖q′W − qW′‖²  =  ρ²          4d−1 Bernstein equations, at every degree
//
// deg N = 2d−1 on both sides, so the system is dimensionally consistent for EVERY d. Whether an
// odd degree actually has honest solutions is a different question and is measured separately
// (nurbsPHOddDegree.test.ts) — the conformal model provably cannot hold one, by its parity theorem.
//
// WHAT THE MODEL BUYS. Hard poles are generic: nothing here forces the numerator isotropic at a
// root of W, unlike ⟨C,C⟩ ≡ 0 in the conformal model, which forces it always. And weights of one
// sign give W > 0 on [0,1], so "no pole on the curve" is a BOX CONSTRAINT rather than a sampled
// guard — the one part of manipulation this model makes strictly easier.
//
// WHAT IT COSTS. The constraint Jacobian has no rank gap: its row-normalised spectrum decays
// smoothly over eight orders and then hits exactly three machine zeros, so a Gauss–Newton step has
// no principled truncation level. The conformal defining Jacobian has 23 clean values and then a
// twelve-order cliff. The reason is structural — ⟨P′,P′⟩ = h² is QUADRATIC in the conformal
// unknowns, ‖q′W − qW′‖² = ρ² is QUARTIC in (P, w). Measured in nurbsPHConditioning.test.ts.
//
// THE GAUGE is (q, w, ρ) ↦ (λq, λw, λ²ρ), with P untouched: ρ scales by λ² because N is quadratic.
// ============================================================================
import { bernsteinMultiply } from './bernstein'
import { leastSquares } from './linalg'

export const layout = (d: number) => ({ nP: 3 * (d + 1), nW: d + 1, nR: 2 * d, total: 3 * (d + 1) + (d + 1) + 2 * d })
export interface Rat { P: number[][]; w: number[]; rho: number[] }
export const packRat = (r: Rat): number[] => [...r.P.flat(), ...r.w, ...r.rho]
export const unpackRat = (x: readonly number[], d: number): Rat => {
  const L = layout(d)
  return {
    P: Array.from({ length: d + 1 }, (_, k) => [x[3 * k], x[3 * k + 1], x[3 * k + 2]]),
    w: Array.from({ length: d + 1 }, (_, k) => x[L.nP + k]),
    rho: Array.from({ length: L.nR }, (_, k) => x[L.nP + L.nW + k]),
  }
}
export const deriv = (c: readonly number[]): number[] => {
  const n = c.length - 1
  return Array.from({ length: n }, (_, k) => n * (c[k + 1] - c[k]))
}
/** N = q′w − qw′ in Bernstein at degree 2d−1, with q = w·P. */
export function hodographN(r: Rat): number[][] {
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const dw = deriv(r.w)
  return [0, 1, 2].map((i) => {
    const a = bernsteinMultiply(deriv(q[i]), r.w)
    const b = bernsteinMultiply(q[i], dw)
    return a.map((v, k) => v - b[k])
  })
}
/** ‖N‖² − ρ², the 4d−1 Bernstein coefficients — zero exactly on the variety. */
export function phResidual(r: Rat): number[] {
  const N = hodographN(r)
  const sq = N.map((Ni) => bernsteinMultiply(Ni, Ni))
  const rr = bernsteinMultiply(r.rho, r.rho)
  return sq[0].map((_, k) => sq[0][k] + sq[1][k] + sq[2][k] - rr[k])
}
/** dR = 2·Σᵢ Nᵢ * dNᵢ − 2·ρ * dρ — every derivative is itself a Bernstein product. */
export function analyticJacobian(r: Rat): number[][] {
  const d = r.P.length - 1
  const L = layout(d)
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const dq = q.map(deriv)
  const dw = deriv(r.w)
  const N = hodographN(r)
  const rows = 4 * d - 1
  const J = Array.from({ length: rows }, () => new Array<number>(L.total).fill(0))
  const unit = (k: number, n: number): number[] => Array.from({ length: n + 1 }, (_, j) => (j === k ? 1 : 0))
  const addCol = (col: number, dN: number[][]): void => {
    const contrib = [0, 1, 2]
      .map((i) => bernsteinMultiply(N[i], dN[i]).map((v) => 2 * v))
      .reduce((a, b) => a.map((v, k) => v + b[k]))
    for (let m = 0; m < rows; m++) J[m][col] = contrib[m]
  }
  for (let k = 0; k <= d; k++) {
    const ek = unit(k, d)
    const dek = deriv(ek)
    for (let i = 0; i < 3; i++) {
      const u = ek.map((v) => v * r.w[k])
      const uw = bernsteinMultiply(u, dw)
      const dNi = bernsteinMultiply(deriv(u), r.w).map((v, m) => v - uw[m])
      addCol(3 * k + i, [0, 1, 2].map((j) => (j === i ? dNi : new Array<number>(dNi.length).fill(0))))
    }
    const ekw = bernsteinMultiply(ek, dw)
    const common = bernsteinMultiply(dek, r.w).map((v, m) => v - ekw[m])
    addCol(L.nP + k, [0, 1, 2].map((i) => {
      const qd = bernsteinMultiply(q[i], dek)
      const extra = bernsteinMultiply(dq[i], ek).map((v, m) => v - qd[m])
      return common.map((v, m) => r.P[k][i] * v + extra[m])
    }))
  }
  for (let m2 = 0; m2 < L.nR; m2++) {
    const contrib = bernsteinMultiply(r.rho, unit(m2, L.nR - 1)).map((v) => -2 * v)
    for (let m = 0; m < rows; m++) J[m][L.nP + L.nW + m2] = contrib[m]
  }
  return J
}
export function numericJacobian(F: (x: number[]) => number[], x0: readonly number[]): number[][] {
  const h = 1e-7
  const rows = F([...x0]).length
  const J = Array.from({ length: rows }, () => new Array<number>(x0.length).fill(0))
  for (let j = 0; j < x0.length; j++) {
    const st = h * Math.max(1, Math.abs(x0[j]))
    const up = [...x0]; up[j] += st
    const dn = [...x0]; dn[j] -= st
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * st)
  }
  return J
}
export function singularValues(A: readonly (readonly number[])[]): number[] {
  const M = A.length >= A[0].length ? A.map((r) => [...r]) : A[0].map((_, j) => A.map((r) => r[j]))
  const m = M.length, n = M[0].length
  const U = M
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let app = 0, aqq = 0, apq = 0
      for (let i = 0; i < m; i++) { app += U[i][p] ** 2; aqq += U[i][q] ** 2; apq += U[i][p] * U[i][q] }
      if (app * aqq === 0 || Math.abs(apq) < 1e-300) continue
      off = Math.max(off, Math.abs(apq) / Math.sqrt(app * aqq))
      const tau = (aqq - app) / (2 * apq)
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let i = 0; i < m; i++) { const a = U[i][p], b = U[i][q]; U[i][p] = c * a - s * b; U[i][q] = s * a + c * b }
    }
    if (off < 1e-15) break
  }
  return Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j]))).sort((a, b) => b - a)
}
export const rowNormalise = (J: number[][]): number[][] =>
  J.map((row) => { const n = Math.hypot(...row); return n > 0 ? row.map((v) => v / n) : row })
/** (q,w) ↦ (λq, λw) is the same curve; ρ ↦ λ²ρ since N is quadratic. P is untouched. */
export function projectiveNormalise(r: Rat): Rat {
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const lam = 1 / Math.max(...q.flat().map(Math.abs), ...r.w.map(Math.abs))
  return { P: r.P, w: r.w.map((v) => v * lam), rho: r.rho.map((v) => v * lam * lam) }
}

// ---------------------------------------------------------------------------
// SETTLING ONTO THE VARIETY
// ---------------------------------------------------------------------------

/** ‖N‖² at its largest — the scale the residual is relative to. */
export const phScale = (r: Rat): number =>
  Math.max(1e-12, Math.max(...hodographN(r).flat().map(Math.abs)) ** 2)

/** Worst coefficient of ‖N‖² − ρ², relative to that scale. */
export const phRelativeResidual = (r: Rat): number =>
  Math.max(...phResidual(r).map(Math.abs)) / phScale(r)

export interface SettleOptions {
  readonly steps?: number
  readonly tolerance?: number
  /**
   * Unknowns the solver may NOT change, as indices into the packed vector.
   *
   * Pinning is how a drag is posed here: put the grabbed control point exactly on the cursor,
   * forbid the solver to move it back, and see whether the PH condition can still be met with what
   * is left. Then "did it track" is not a question about the solver's willingness — tracking is
   * exact by construction — and becomes the question worth asking, which is whether the curve can
   * follow at all. A residual that stops falling IS the feasible limit.
   */
  readonly frozen?: readonly number[]
}

/**
 * Damped minimum-norm Gauss–Newton onto ‖q′W − qW′‖² = ρ².
 *
 * Levenberg damping with backtracking, because this Jacobian has NO RANK GAP — its spectrum decays
 * smoothly over eight orders — so an undamped step has no principled truncation level and can be
 * arbitrarily wrong. The damping is what stands in for the rank decision that cannot be made.
 */
export function settleToPH(
  rat: Rat, d: number, options: SettleOptions = {},
): { rat: Rat; residual: number } {
  const steps = options.steps ?? 400
  const tolerance = options.tolerance ?? 1e-13
  const frozen = new Set(options.frozen ?? [])
  let cur = projectiveNormalise(rat)
  let best = phRelativeResidual(cur)
  let lambda = 1e-6
  for (let it = 0; it < steps && best > tolerance; it++) {
    const s = phScale(cur)
    const R = phResidual(cur)
    const J = analyticJacobian(cur).map((row) => row.map((v, i) => (frozen.has(i) ? 0 : v)))
    let step: number[]
    try { step = leastSquares(J, R.map((v) => -v), lambda * s) } catch { break }
    if (step.some((v) => !Number.isFinite(v))) break
    let h = 1
    let moved = false
    for (let k = 0; k < 24; k++) {
      const x = packRat(cur).map((v, i) => (frozen.has(i) ? v : v + h * step[i]))
      // renormalised EVERY candidate, not once at the start: the gauge rescale changes the
      // Jacobian's row scaling, so where it is applied changes the iteration path and therefore
      // the numbers the sweeps record
      const cand = projectiveNormalise(unpackRat(x, d))
      const cr = phRelativeResidual(cand)
      if (Number.isFinite(cr) && cr < best) {
        cur = cand
        best = cr
        lambda = Math.max(1e-12, lambda * 0.5)
        moved = true
        break
      }
      h *= 0.5
    }
    if (!moved) {
      lambda *= 8
      if (lambda > 1e4) break
    }
  }
  return { rat: cur, residual: best }
}
