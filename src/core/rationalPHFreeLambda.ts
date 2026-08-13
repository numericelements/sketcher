// ============================================================================
// SOLVING FOR THE TWIST RATES INSTEAD OF HOLDING THEM — reaching the families the λ-chart cannot build.
//
// WHAT IS WRONG WITH HOLDING THEM. Fix λ and the residue condition 𝒜′(r_k) = 𝒜(r_k)(Σ_k + λ_k i) is
// LINEAR in 𝒜 — four real conditions per pole — so admissible spinors form a subspace of dimension
// 4(n+1) − 4m, and `familyBasis` builds members by combining its basis. That is the whole reason a
// chart member costs a nullspace and a linear combination.
//
// But the subspace COLLAPSES when n + 1 = m: dimension zero, only 𝒜 = 0, nothing to combine. Measured
// at (n,m) = (3,4), (4,5), (5,6). And yet the variety is not empty there —
//
//     dim 𝒱 = 4(n+1) − 3m         (3,4) → 4
//
// because with λ FREE the condition costs only three real conditions per pole rather than four: the
// residue is a vector, and the λ direction stops being a constraint. All four dimensions live in the
// λ's, which the linear construction treats as dials handed to it rather than as unknowns to find.
//
// At degree 4 this is exactly the one dimension the chart is short of. degree4IsThirteen measures the
// rational PH quartics at 13 and the chart at 12, and the walk in missingDirectionsAreFourPoles shows
// the missing motion lands at (n,m) = (3,4) — precisely where the fibre is a point.
//
// SO SOLVE THE QUADRICS DIRECTLY. Eliminating λ leaves the residue conditions as pure quadrics in the
// spinor, three per real pole:
//
//     F_k(𝒜) = vec[ N′(r_k) − 2 Σ_k N(r_k) ] = 0 ,      N = 𝒜i𝒜*
//
// plus |𝒜|² = 1 to fix the projective scale and, more practically, to keep Newton away from 𝒜 = 0,
// which is a solution of every one of them and an attractor for anything that does not exclude it.
//
// The map is QUADRATIC, so central differences give its Jacobian exactly rather than approximately —
// the same fact sp11VarietyRank leans on. There is no step size to tune here.
//
// AND λ IS READ BACK, NOT ASSUMED. Once 𝒜 is found, Ω = 𝒜(r)⁻¹𝒜′(r) must have real part Σ_k, vanishing
// j and k parts, and its i part IS λ_k. All three are returned as a residual rather than trusted,
// because the quadrics are what was solved and the λ-form is what is claimed.
// ============================================================================
import { leastSquares } from './linalg'
import { orthonormalise } from './sp11RationalPH'
import { QUAT_I, qconj, qmul, qvec, type Quat, type Vec3 } from './quaternion'
import { type MultiPoleParams, unpackSpinor } from './rationalPHMultiPoleSpatial'

const bigSigma = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

const toQuats = (x: readonly number[]): Quat[] =>
  Array.from({ length: x.length / 4 }, (_, k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] }))

/** 𝒜(t) and 𝒜′(t) at one parameter, by Horner. */
function evalSpinor(A: readonly Quat[], t: number): { at: Quat; d: Quat } {
  let at: Quat = { u: 0, v: 0, p: 0, q: 0 }
  let d: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = A.length - 1; k >= 0; k--) {
    d = { u: d.u * t + at.u, v: d.v * t + at.v, p: d.p * t + at.p, q: d.q * t + at.q }
    at = { u: at.u * t + A[k].u, v: at.v * t + A[k].v, p: at.p * t + A[k].p, q: at.q * t + A[k].q }
  }
  return { at, d }
}

const sandwichAt = (a: Quat, b: Quat): Vec3 => qvec(qmul(qmul(a, QUAT_I), qconj(b)))
/** N(r) and N′(r) from 𝒜(r), 𝒜′(r): N = 𝒜i𝒜*, so N′ = 𝒜′i𝒜* + 𝒜i𝒜′*. */
function hodographAt(at: Quat, d: Quat): { N: Vec3; Nd: Vec3 } {
  const N = sandwichAt(at, at)
  const a = sandwichAt(d, at)
  const b = sandwichAt(at, d)
  return { N, Nd: { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } }
}

/**
 * The residue quadrics with λ eliminated, plus the unit-norm equation. 3m + 1 real equations in
 * 4(n+1) unknowns — so a solution set of dimension 4(n+1) − 3m − 1, which is dim 𝒱 minus the scale.
 */
export function residueQuadrics(x: readonly number[], roots: readonly number[]): number[] {
  const A = toQuats(x)
  const out: number[] = []
  roots.forEach((r, k) => {
    const { at, d } = evalSpinor(A, r)
    const { N, Nd } = hodographAt(at, d)
    const s = 2 * bigSigma(roots, k)
    out.push(Nd.x - s * N.x, Nd.y - s * N.y, Nd.z - s * N.z)
  })
  out.push(x.reduce((s, v) => s + v * v, 0) - 1)
  return out
}

/** Central differences, which are EXACT for this map: every equation is quadratic in x. */
function jacobianOf(f: (x: readonly number[]) => number[], x: readonly number[]): number[][] {
  const m = f(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = 1e-5
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = f(hi), fl = f(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}

/**
 * The tangent to the solved variety at 𝒜 — the directions a slider can walk. Includes the unit-norm
 * equation, so the scale is already quotiented out: at (n,m) = (3,4) that is 16 − 12 − 1 = 3.
 *
 * The Hopf gauge 𝒜 ↦ 𝒜i lies inside this space and moves no curve, so one of the directions is
 * invisible; it is left in rather than projected out, because which combination is gauge depends on 𝒜
 * and stripping it here would make the returned basis mean something different at every point.
 */
export function freeLambdaTangent(x: readonly number[], roots: readonly number[]): number[][] {
  const J = jacobianOf((y) => residueQuadrics(y, roots), x)
  const rows = J.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  })
  const basis = orthonormalise(rows, 1e-9)
  const out: number[][] = []
  for (let i = 0; i < x.length; i++) {
    let v: number[] = Array.from({ length: x.length }, (_, j) => (i === j ? 1 : 0))
    for (const b of basis) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    for (const b of out) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > 1e-7) out.push(v.map((q) => q / len))
  }
  return out
}

/**
 * Predictor–corrector: step along a tangent direction, then Newton back onto the quadrics. This is
 * what a slider does at (n, m) where there is no linear fibre to combine — the family is curved, so
 * moving along it costs a solve per step rather than a dot product.
 */
export function stepAlong(
  x: readonly number[], roots: readonly number[], direction: readonly number[], distance: number,
): number[] | null {
  const f = (y: readonly number[]): number[] => residueQuadrics(y, roots)
  let y = x.map((v, i) => v + distance * direction[i])
  for (let it = 0; it < 60; it++) {
    const F = f(y)
    if (Math.max(...F.map(Math.abs)) < 1e-14) return y
    try {
      const step = leastSquares(jacobianOf(f, y), F.map((v) => -v), 1e-12)
      y = y.map((v, j) => v + step[j])
    } catch { return null }
  }
  return Math.max(...f(y).map(Math.abs)) < 1e-10 ? y : null
}

export interface FreeLambdaSolution {
  readonly params: MultiPoleParams
  /** Worst |F| on the quadrics — how well the residue conditions actually hold. */
  readonly residual: number
  /**
   * How far Ω = 𝒜(r)⁻¹𝒜′(r) is from the λ-form: worst over the poles of the j and k parts and of
   * (Re Ω − Σ_k). Reported rather than assumed — the quadrics are what was solved.
   */
  readonly lambdaFormResidual: number
}

/**
 * A spinor satisfying the residue conditions at the given poles, with the twist rates SOLVED FOR.
 * Works where `familyBasis` returns nothing, which is every (n, m) with n + 1 ≤ m.
 */
export function solveWithFreeLambda(
  roots: readonly number[], degree: number, trials = 120,
): FreeLambdaSolution | null {
  const size = 4 * (degree + 1)
  const f = (x: readonly number[]): number[] => residueQuadrics(x, roots)
  let best: { x: number[]; res: number } | null = null

  for (let t = 0; t < trials; t++) {
    // Deterministic starts: no Math.random, so a failure is reproducible.
    // Two interleaved families of starts. A single sinusoidal pattern converged for one pole set out
    // of three; the quadrics have several basins and a start that misses them all just fails silently.
    let x = Array.from({ length: size }, (_, i) => (t % 2 === 0
      ? Math.sin(1.7 * i + 2.3 * t) + 0.6 * Math.cos(0.9 * i - 1.1 * t)
      : Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t)))
    const n0 = Math.hypot(...x) || 1
    x = x.map((v) => v / n0)

    for (let it = 0; it < 200; it++) {
      const F = f(x)
      if (Math.max(...F.map(Math.abs)) < 1e-14) break
      try {
        const step = leastSquares(jacobianOf(f, x), F.map((v) => -v), 1e-12)
        x = x.map((v, j) => v + step[j])
      } catch { break }
      const n = Math.hypot(...x)
      if (!Number.isFinite(n) || n < 1e-8) break
    }
    const res = Math.max(...f(x).map(Math.abs))
    if (Number.isFinite(res) && (best === null || res < best.res)) best = { x, res }
    if (best !== null && best.res < 1e-14) break
  }
  if (!best || best.res > 1e-10) return null

  // Read λ back out of the solved spinor, and measure how well the λ-form holds.
  const A = toQuats(best.x)
  const lambdas: number[] = []
  let formResidual = 0
  for (let k = 0; k < roots.length; k++) {
    const { at, d } = evalSpinor(A, roots[k])
    const n2 = at.u * at.u + at.v * at.v + at.p * at.p + at.q * at.q
    if (!(n2 > 1e-12)) return null                  // σ(r) = 0: the λ-form does not exist there
    const inv: Quat = { u: at.u / n2, v: -at.v / n2, p: -at.p / n2, q: -at.q / n2 }
    const omega = qmul(inv, d)
    const scale = Math.max(Math.hypot(omega.u, omega.v, omega.p, omega.q), 1)
    formResidual = Math.max(
      formResidual,
      Math.abs(omega.u - bigSigma(roots, k)) / scale,
      Math.abs(omega.p) / scale,
      Math.abs(omega.q) / scale,
    )
    lambdas.push(omega.v)
  }

  return {
    params: { A: unpackSpinor(best.x), roots: roots.slice(), lambdas },
    residual: best.res,
    lambdaFormResidual: formResidual,
  }
}
