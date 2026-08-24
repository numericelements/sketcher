// ============================================================================
// THE MÖBIUS DRAG, ROUTED THROUGH THE INTERIOR-POINT SOLVER.
//
// conformalPHCurve.solveWith is the ONE drag path in core that does not use a real solver —
// hand-rolled Gauss-Newton with a mixed-norm acceptance that cannot see constraint drift. The
// two repairs built for it by hand turned out to be re-inventions: the feasibility corrector IS
// IPOPT's restoration phase, and the per-block acceptance it needed IS the filter. So instead of
// finishing that re-invention, the drag is posed to InteriorPointOptimizer the way every other
// drag in core already is:
//
//     minimize   ½‖P_index − cursor‖²                    (the gesture is the objective)
//     subject to residual(s) = 0                         (the defining rows, HARD)
//                P_i = P_i(before)  for each pinned i    (the pins, HARD)
//
// The cursor is the objective rather than a constraint, so an unreachable cursor stops the point
// short and reports the shortfall — never takes the curve off the family to please the mouse.
// Equalities are enforced by the optimizer's escalating quadratic penalty (t²/2)·Σh² with filter,
// SOC and feasibility restoration; the penalty plateaus near machine level as t → 10/barrierTol,
// and a short warm-started Newton polish (the existing dragControlPoint) lands the last digits.
//
// Everything analytic: the defining Jacobian is closed-form (quadratic conditions), and the
// cursor/pin rows are pointConstraintRows — no finite differences anywhere on this path.
// ============================================================================
import { InteriorPointOptimizer } from './ipopt/InteriorPointOptimizer'
import type { OptimizationProblem } from './ipopt/types'
import type { Matrix } from './ipopt/linearAlgebra'
import {
  type ConformalPHCurve,
  type DragResult,
  controlPoints,
  definingJacobian,
  degreeOf,
  dragControlPoint,
  pack,
  pointConstraintRows,
  residual,
  unknownCount,
  unpack,
} from './conformalPHCurve'
import { type Conformal, innerProduct } from './conformal'
import { conformalNullResidual } from './poleReadout'
import type { Vec3 } from './quaternion'

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** The 5×5 metric of ℝ^{4,1}, read off innerProduct so it is never written down twice. */
const METRIC: number[][] = (() => {
  const e = (k: number): Conformal => {
    const v = [0, 0, 0, 0, 0]
    v[k] = 1
    return v as unknown as Conformal
  }
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => innerProduct(e(r), e(c))))
})()

/**
 * Σ wᵢ·∇²cᵢ over the DEFINING rows, in closed form — they are quadratic in the unknowns, so
 * every ∇²cᵢ is a constant matrix and the sum is exact, not approximated.
 *
 * The blocks mirror definingJacobian exactly: the null row m contributes 2A·η at block (i, m−i);
 * the PH row m contributes ±2n²·v·η between C-blocks through D_k = n(C_{k+1}−C_k), and −2v on the
 * (h_i, h_{m−i}) entries. Anything wrong here shows up against the finite difference of the
 * analytic Jacobian, which is what the pinning test checks.
 */
export function definingHessianWeightedSum(n: number, weights: readonly number[]): number[][] {
  const U = unknownCount(n)
  const NC = 5 * (n + 1)
  const H = Array.from({ length: U }, () => new Array<number>(U).fill(0))
  const addBlock = (bi: number, bj: number, f: number): void => {
    if (f === 0) return
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const m = METRIC[r][c]
        if (m !== 0) H[5 * bi + r][5 * bj + c] += f * m
      }
    }
  }
  const EN = 2 * n + 1
  for (let m = 0; m < EN; m++) {
    const w = weights[m]
    if (!w) continue
    for (let i = 0; i <= n; i++) {
      const k = m - i
      if (k < 0 || k > n) continue
      addBlock(i, k, w * (2 * binom(n, i) * binom(n, k)) / binom(2 * n, m))
    }
  }
  for (let m = 0; m <= 2 * n - 2; m++) {
    const w = weights[EN + m]
    if (!w) continue
    for (let i = 0; i <= n; i++) {
      for (const [jj, sign] of [[i - 1, 1], [i, -1]] as const) {
        if (jj < 0 || jj > n - 1) continue
        const k = m - jj
        if (k < 0 || k > n - 1) continue
        const v = (binom(n - 1, jj) * binom(n - 1, k)) / binom(2 * n - 2, m)
        const f = w * 2 * n * n * sign * v
        if (k + 1 <= n) addBlock(i, k + 1, f)
        addBlock(i, k, -f)
      }
    }
    for (let i = 0; i <= n - 1; i++) {
      const k = m - i
      if (k < 0 || k > n - 1) continue
      H[NC + i][NC + k] += -2 * w * ((binom(n - 1, i) * binom(n - 1, k)) / binom(2 * n - 2, m))
    }
  }
  return H
}

/**
 * The curvature of one point row Pᵢ,c = Cᵢ,c₊₁/Wᵢ, folded into H with weight f: the only nonzero
 * second derivatives are ∂²/∂u∂w = −1/W² and ∂²/∂w² = 2Pc/W² (u the coordinate, w the weight).
 */
function addPointRowCurvature(
  H: number[][], s: ConformalPHCurve, i: number, c: number, f: number,
): void {
  if (f === 0) return
  const W = (s.C[i] as unknown as number[])[0]
  const u = (s.C[i] as unknown as number[])[1 + c]
  const iw = 5 * i
  const iu = 5 * i + 1 + c
  H[iu][iw] += -f / (W * W)
  H[iw][iu] += -f / (W * W)
  H[iw][iw] += (2 * f * u) / (W * W * W)
}

class ConformalDragProblem implements OptimizationProblem {
  readonly numVariables: number
  private x: number[]
  private readonly nEq: number
  private readonly before: readonly Vec3[]
  private readonly index: number
  private readonly target: Vec3
  private readonly held: readonly number[]

  constructor(from: ConformalPHCurve, index: number, target: Vec3, held: readonly number[]) {
    this.x = pack(from)
    this.numVariables = unknownCount(degreeOf(from))
    this.before = controlPoints(from)
    this.index = index
    this.target = target
    this.held = held
    this.nEq = residual(from).length + 3 * held.length
  }

  private s(): ConformalPHCurve { return unpack(this.x) }
  getVariables(): number[] { return [...this.x] }
  setVariables(x: number[]): void { this.x = [...x] }
  get numConstraints(): number { return this.nEq }
  get numEqualityConstraints(): number { return this.nEq }

  computeObjective(): number {
    const p = controlPoints(this.s())[this.index]
    const d = [p.x - this.target.x, p.y - this.target.y, p.z - this.target.z]
    return 0.5 * (d[0] * d[0] + d[1] * d[1] + d[2] * d[2])
  }

  computeObjectiveGradient(): number[] {
    const s = this.s()
    const p = controlPoints(s)[this.index]
    const rows = pointConstraintRows(s, [this.index])
    const d = [p.x - this.target.x, p.y - this.target.y, p.z - this.target.z]
    const grad = new Array<number>(this.numVariables).fill(0)
    for (let c = 0; c < 3; c++) {
      const row = rows[c]
      for (let j = 0; j < this.numVariables; j++) grad[j] += d[c] * row[j]
    }
    return grad
  }

  computeConstraints(): number[] {
    const s = this.s()
    const out = residual(s)
    const P = controlPoints(s)
    for (const i of this.held) {
      out.push(P[i].x - this.before[i].x, P[i].y - this.before[i].y, P[i].z - this.before[i].z)
    }
    return out
  }

  computeConstraintJacobian(): Matrix {
    const s = this.s()
    return [...definingJacobian(s), ...pointConstraintRows(s, this.held)]
  }

  getConstraintSigns(): number[] { return new Array<number>(this.nEq).fill(1) }
  getInactiveConstraints(): Set<number> { return new Set<number>() }
  updateConstraintState(): void { /* equality-only: nothing slides */ }

  /**
   * Exact Lagrangian curvature Σ wᵢ·∇²cᵢ: the defining rows in closed form (they are quadratic,
   * so their Hessians are constant), the pin rows through the C/W curvature. Nothing approximated.
   */
  computeConstraintHessianWeightedSum(weights: number[]): Matrix {
    const s = this.s()
    const n = degreeOf(s)
    const H = definingHessianWeightedSum(n, weights)
    const nDef = 4 * n
    for (let k = 0; k < this.held.length; k++) {
      for (let c = 0; c < 3; c++) addPointRowCurvature(H, s, this.held[k], c, weights[nDef + 3 * k + c])
    }
    return H
  }

  /** ∇²f exactly: the Gauss-Newton part RᵀR plus the C/W curvature weighted by the miss. */
  computeObjectiveHessian(): Matrix {
    const s = this.s()
    const p = controlPoints(s)[this.index]
    const rows = pointConstraintRows(s, [this.index])
    const d = [p.x - this.target.x, p.y - this.target.y, p.z - this.target.z]
    const U = this.numVariables
    const H = Array.from({ length: U }, () => new Array<number>(U).fill(0))
    for (let c = 0; c < 3; c++) {
      const r = rows[c]
      for (let i = 0; i < U; i++) {
        if (r[i] === 0) continue
        for (let j = 0; j < U; j++) if (r[j] !== 0) H[i][j] += r[i] * r[j]
      }
      addPointRowCurvature(H, s, this.index, c, d[c])
    }
    return H
  }
}

export interface InteriorDragOptions {
  pinEnds?: boolean
  pin?: readonly number[]
  /** Interior-point iteration budget (default 120). */
  iterations?: number
  /** Newton-polish budget after the interior solve (default 40). */
  polish?: number
  /** Fold the exact constraint curvature into the barrier Hessian (default true — measured). */
  exactHessian?: boolean
  /** BFGS Lagrangian Hessian instead of the exact objective Hessian (default false — measured). */
  bfgs?: boolean
}

/**
 * Drag control point `index` of a conformal PH curve with the interior-point solver, then land
 * the final digits with the warm-started Newton polish. Same signature contract as
 * dragControlPoint, and the same DragResult honesty: defect and trackingError are measured on
 * the returned state, not claimed.
 */
export function dragControlPointInterior(
  from: ConformalPHCurve,
  index: number,
  target: Vec3,
  options: InteriorDragOptions = {},
): DragResult {
  const last = degreeOf(from)
  const pinEnds = options.pinEnds ?? true
  const held = (options.pin ?? (pinEnds ? [0, last] : [])).filter((i) => i !== index)
  const problem = new ConformalDragProblem(from, index, target, held)
  const ip = new InteriorPointOptimizer(problem, {
    maxIterations: options.iterations ?? 120,
    enableBFGS: options.bfgs ?? false,
    enableExactHessian: options.exactHessian ?? true,
    // Equality-only problem: the outer loop runs t up to 10/barrierTolerance, so this sets how
    // hard the quadratic penalty ends up pressing on the defining rows (1e-8 → t ≈ 1e9).
    barrierTolerance: 1e-8,
  })
  const r = ip.optimize()
  const moved = unpack(r.variables)
  // The polish pins the held points where the interior solve left them — the same semantics the
  // escalating Gauss-Newton drag has tick to tick, and the drift is bounded by the penalty floor.
  //
  // NOT constraintGuard — measured here too, in the one scope that looked purpose-built for it
  // (this route only runs after the plain Newton stages have failed, so its cost seemed free):
  // the guarded polish turned point 4's gesture from 19/20 on the model at 0.9s into 0/20 at
  // 16.6s. The corrector and this polish fight; the plain polish stands.
  return dragControlPoint(moved, index, target, {
    pin: held, iterations: options.polish ?? 40,
  })
}

/**
 * The DISPLAYED membership line — the same 1e-9 the pole lab tones ⟨C,C⟩ ok below. The staged
 * drag escalates until the state it returns is under this line or every stage has been heard.
 */
const ON_THE_MODEL = 1e-9

/**
 * The Möbius drag with the interior route as an escalation stage: Newton 80 → 300 → interior →
 * Newton 900, stopping at the first stage that lands on the model, keeping the best state by the
 * same ⟨C,C⟩ number the figures display. Nothing is ever refused — the best state is returned
 * with its honest defect even when no stage lands.
 *
 * WHY THIS SHAPE, measured on lift8's twenty-tick gestures (conformalInteriorDrag.test.ts):
 * plain Newton lands every control point except 4 (0/20 on the model, 6.8s); the interior route
 * alone lands 4 and loses 3 (1/20). Staged, each point is served by the first stage that can
 * land it: points 0–3 identical to the plain escalation, point 4 at 20/20 and 1e-10 in a tenth
 * of the time. The warm RETRY of the interior stage exists for one measured tick that stalled at
 * 3.9e-9 — just over the line — and converges from the first pass's own output; it also makes
 * the gesture faster, because landing here skips the 900-iteration stage.
 */
export function dragControlPointStaged(
  from: ConformalPHCurve,
  index: number,
  target: Vec3,
  options: { pinEnds?: boolean; pin?: readonly number[] } = {},
): DragResult {
  let best: DragResult | null = null
  let bestOff = Infinity
  for (const stage of [80, 300, 'interior', 900] as const) {
    let r = stage === 'interior'
      ? dragControlPointInterior(from, index, target, { ...options, iterations: 300, polish: 300 })
      : dragControlPoint(from, index, target, { ...options, iterations: stage })
    let off = conformalNullResidual(r.state)
    if (stage === 'interior' && off > ON_THE_MODEL && off < 1e-6) {
      r = dragControlPointInterior(r.state, index, target, { ...options, iterations: 300, polish: 300 })
      off = conformalNullResidual(r.state)
    }
    if (off < bestOff) { bestOff = off; best = r }
    if (off <= ON_THE_MODEL) break
  }
  return best ?? {
    state: from, converged: false, defect: Number.NaN, trackingError: Number.NaN,
  }
}
