// ============================================================================
// FREE-MODE drag for a planar PH curve of ANY degree — grab any control point.
//
// The generalisation of phCubicDrag: same idea, one implementation, generator of
// any degree m (curve degree 2m+1). The cubic module now delegates here, so its
// eight tests validate this code.
//
//   STRICT mode prescribes as many control points as the manifold has room for —
//   a SQUARE system, solved in closed form, with a solution COUNT and no choice.
//
//   FREE mode prescribes ONE control point: 2 conditions against 2m+4 real DOF, so
//   2m+2 are spare and something must choose. The choice is minimum-norm — move the
//   dragged point to the cursor and everything else as little as possible — which is
//   a horizontal lift on the constraint manifold, the same object as the
//   pseudoinverse solution in redundant-manipulator inverse kinematics.
//
// PH holds BY CONSTRUCTION: the unknowns are the generator coefficients plus the
// integration constant, so no PH constraint is enforced and the solve cannot leave
// the manifold however it behaves.
//
// The algebra, once, for every degree. With w = Σ wₖ Bₖᵐ, the hodograph
// coefficients of w² are the bilinear form
//
//     [w²]ⱼ = Σ_{a+b=j} C(m,a)C(m,b)/C(2m,j) · w_a w_b
//
// and the curve's control-point legs are ΔPⱼ = [w²]ⱼ/(2m+1). Differentiating,
//
//     ∂[w²]ⱼ/∂wₖ = 2 · C(m,k)C(m,j−k)/C(2m,j) · w_{j−k}      (0 ≤ j−k ≤ m)
//
// complex-linear, so each entry is a real 2×2 block. Every control point is the
// origin plus the legs before it, so the Jacobian is a cumulative sum.
//
// Consequences (both real, neither a bug):
//   * the other control points always move — prescribing one alone leaves the PH
//     variety, which has codimension 2m;
//   * the motion is PATH-DEPENDENT: a closed loop does not return the curve.
//     HOLONOMY, the continuous sibling of strict mode's monodromy.
// ============================================================================
import { type Complex, cadd, cmul, cscale, csub } from './complex'
import { type Matrix, leastSquares } from './linalg'

/** Generator coefficients (Bernstein, degree m = length−1) plus the start point. */
export interface PHFreeState {
  readonly generator: readonly Complex[]
  readonly p0: Complex
}

const ZERO: Complex = { re: 0, im: 0 }

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return Math.round(r)
}

/** The Bernstein coefficients of w², degree 2m. */
export function bernsteinSquare(w: readonly Complex[]): Complex[] {
  const m = w.length - 1
  const out: Complex[] = Array.from({ length: 2 * m + 1 }, () => ({ ...ZERO }))
  for (let a = 0; a <= m; a++) {
    for (let b = 0; b <= m; b++) {
      const j = a + b
      const c = (binom(m, a) * binom(m, b)) / binom(2 * m, j)
      out[j] = cadd(out[j], cscale(cmul(w[a], w[b]), c))
    }
  }
  return out
}

/** ΔPⱼ = [w²]ⱼ/(2m+1) — the control-point legs. */
export function generatorLegs(w: readonly Complex[]): Complex[] {
  const m = w.length - 1
  return bernsteinSquare(w).map((z) => cscale(z, 1 / (2 * m + 1)))
}

/** The 2m+2 control points. */
export function freeControlPoints(s: PHFreeState): Complex[] {
  const out = [s.p0]
  let acc = s.p0
  for (const leg of generatorLegs(s.generator)) {
    acc = cadd(acc, leg)
    out.push(acc)
  }
  return out
}

/** Multiplication by z, as a real 2×2 block. */
const mulBlock = (z: Complex): number[][] => [
  [z.re, -z.im],
  [z.im, z.re],
]

/**
 * ∂(control points)/∂(generator, origin) — exact, size 2(2m+2) × (2(m+1)+2).
 * Columns are [w₀.re, w₀.im, …, wₘ.re, wₘ.im, p₀.re, p₀.im].
 */
export function freeControlPointJacobian(s: PHFreeState): Matrix {
  const w = s.generator
  const m = w.length - 1
  const nLegs = 2 * m + 1
  const scale = 1 / (2 * m + 1)

  // dLeg[j][k]: the 2×2 block ∂ΔPⱼ/∂wₖ.
  const dLeg: number[][][][] = []
  for (let j = 0; j < nLegs; j++) {
    const row: number[][][] = []
    for (let k = 0; k <= m; k++) {
      const other = j - k
      if (other < 0 || other > m) {
        row.push([[0, 0], [0, 0]])
      } else {
        const c = (2 * binom(m, k) * binom(m, other)) / binom(2 * m, j)
        row.push(mulBlock(cscale(w[other], c * scale)))
      }
    }
    dLeg.push(row)
  }

  // Cumulative: control point i depends on legs 0..i−1.
  const acc: number[][][] = Array.from({ length: m + 1 }, () => [[0, 0], [0, 0]])
  const J: Matrix = []
  for (let i = 0; i <= nLegs; i++) {
    if (i > 0) {
      for (let k = 0; k <= m; k++) {
        const d = dLeg[i - 1][k]
        acc[k] = [
          [acc[k][0][0] + d[0][0], acc[k][0][1] + d[0][1]],
          [acc[k][1][0] + d[1][0], acc[k][1][1] + d[1][1]],
        ]
      }
    }
    for (let row = 0; row < 2; row++) {
      const line: number[] = []
      for (let k = 0; k <= m; k++) line.push(acc[k][row][0], acc[k][row][1])
      line.push(row === 0 ? 1 : 0, row === 1 ? 1 : 0) // ∂/∂p₀
      J.push(line)
    }
  }
  return J
}

export interface FreeDragOptions {
  /** Weight on the dragged control point (default 60). Higher tracks harder. */
  readonly dragWeight?: number
  /** Weight holding each untouched control point where it was (default 1). */
  readonly holdWeight?: number
  /** Gauss–Newton iterations per call (default 3). */
  readonly iterations?: number
  /** Levenberg damping on the normal equations (default 1e-9). */
  readonly regularization?: number
}

export interface FreeDragResult {
  readonly state: PHFreeState
  readonly controlPoints: Complex[]
  /** |dragged point − cursor|. */
  readonly trackingError: number
  /** max |Pⱼ − Pⱼ_before| over the untouched points. */
  readonly disturbance: number
  readonly iterations: number
}

const toVector = (s: PHFreeState): number[] => [
  ...s.generator.flatMap((z) => [z.re, z.im]),
  s.p0.re,
  s.p0.im,
]

const fromVector = (x: readonly number[], m: number): PHFreeState => ({
  generator: Array.from({ length: m + 1 }, (_, k) => ({ re: x[2 * k], im: x[2 * k + 1] })),
  p0: { re: x[2 * (m + 1)], im: x[2 * (m + 1) + 1] },
})

/**
 * One free-mode drag step: move control point `index` toward `target`, keeping the
 * others as close as possible to where they are now. Warm-started from `from`, so a
 * drag is a sequence of these — which is what makes the motion a path, and what
 * makes it path-dependent.
 */
export function dragPHFree(
  from: PHFreeState,
  index: number,
  target: Complex,
  options: FreeDragOptions = {},
): FreeDragResult {
  const dragWeight = options.dragWeight ?? 60
  const holdWeight = options.holdWeight ?? 1
  const iterations = options.iterations ?? 3
  const reg = options.regularization ?? 1e-9
  const m = from.generator.length - 1

  const before = freeControlPoints(from)
  const targets = before.map((p, j) => (j === index ? target : p))
  const weights = before.map((_, j) => (j === index ? dragWeight : holdWeight))

  let x = toVector(from)
  let used = 0
  for (let it = 0; it < iterations; it++) {
    used = it + 1
    const s = fromVector(x, m)
    const cps = freeControlPoints(s)
    const J = freeControlPointJacobian(s)

    const A: Matrix = []
    const b: number[] = []
    for (let j = 0; j < cps.length; j++) {
      const sw = Math.sqrt(weights[j])
      A.push(J[2 * j].map((v) => v * sw), J[2 * j + 1].map((v) => v * sw))
      b.push(-(cps[j].re - targets[j].re) * sw, -(cps[j].im - targets[j].im) * sw)
    }
    const step = leastSquares(A, b, reg)
    if (!step.every(Number.isFinite)) break
    const next = x.map((v, i) => v + step[i])
    if (!next.every(Number.isFinite)) break
    x = next
    if (Math.max(...step.map(Math.abs)) < 1e-12) break
  }

  const state = fromVector(x, m)
  const after = freeControlPoints(state)
  const trackingError = Math.hypot(after[index].re - target.re, after[index].im - target.im)
  let disturbance = 0
  for (let j = 0; j < after.length; j++) {
    if (j === index) continue
    disturbance = Math.max(disturbance, Math.hypot(after[j].re - before[j].re, after[j].im - before[j].im))
  }
  return { state, controlPoints: after, trackingError, disturbance, iterations: used }
}

/** Run a whole drag path, returning every intermediate step. */
export function dragPathPHFree(
  from: PHFreeState,
  index: number,
  path: readonly Complex[],
  options: FreeDragOptions = {},
): FreeDragResult[] {
  const out: FreeDragResult[] = []
  let state = from
  for (const target of path) {
    const step = dragPHFree(state, index, target, options)
    out.push(step)
    state = step.state
  }
  return out
}

/**
 * Is this control polygon PH, judged from the polygon ALONE?
 *
 * Reconstruct the generator from the first m+1 legs — w₀ from ΔP₀ = w₀²/(2m+1),
 * then each wₖ from ΔPₖ, whose only new unknown is wₖ (its coefficient is
 * 2·C(m,0)C(m,k)/C(2m,k)·w₀, nonzero when w₀ ≠ 0) — then check the remaining m legs
 * agree. Those m complex checks are the PH conditions: 2m real, exactly the
 * codimension.
 *
 * Free mode parameterises by the generator, so this is ~machine zero by
 * construction; it is the readout that says so from the drawn polygon rather than
 * from the code path.
 */
export function phPolygonResidual(cps: readonly Complex[]): number {
  const nLegs = cps.length - 1
  if (nLegs < 1 || nLegs % 2 === 0) return NaN // needs an odd leg count, i.e. degree 2m+1
  const m = (nLegs - 1) / 2
  const legs = cps.slice(1).map((p, i) => csub(p, cps[i]))
  const scale = 2 * m + 1

  // w₀ from ΔP₀ = w₀²/(2m+1).
  const l0 = cscale(legs[0], scale)
  const mag = Math.hypot(l0.re, l0.im)
  if (mag === 0) return NaN
  const w: Complex[] = [{ re: Math.sqrt((mag + l0.re) / 2), im: Math.sign(l0.im || 1) * Math.sqrt((mag - l0.re) / 2) }]

  for (let k = 1; k <= m; k++) {
    // ΔPₖ = [w²]ₖ/(2m+1); the only unknown is wₖ, with coefficient 2c·w₀.
    const known = bernsteinSquare([...w, ...Array.from({ length: m + 1 - w.length }, () => ({ ...ZERO }))])[k]
    const c = (2 * binom(m, 0) * binom(m, k)) / binom(2 * m, k)
    const denom = cscale(w[0], c)
    const d2 = denom.re * denom.re + denom.im * denom.im
    if (d2 === 0) return NaN
    const rhs = csub(cscale(legs[k], scale), known)
    w.push({
      re: (rhs.re * denom.re + rhs.im * denom.im) / d2,
      im: (rhs.im * denom.re - rhs.re * denom.im) / d2,
    })
  }

  const predicted = generatorLegs(w)
  let worst = 0
  let norm = 0
  for (let j = 0; j < legs.length; j++) {
    worst = Math.max(worst, Math.hypot(predicted[j].re - legs[j].re, predicted[j].im - legs[j].im))
    norm = Math.max(norm, Math.hypot(legs[j].re, legs[j].im))
  }
  return norm > 0 ? worst / norm : worst
}
