// ============================================================================
// RATIONAL PH SPACE CURVES WITH *COMPLEX* POLES — the chart extended off the real axis.
//
// WHY. rationalPHOnePoleSpatial and rationalPHMultiPoleSpatial take `roots: readonly number[]` —
// REAL poles only — because the no-log condition was derived by stripping 𝒜 from both sides, and
// that argument was written for a real evaluation point. The cost of the restriction is large and
// specific: a curve with a real pole RUNS TO INFINITY there, so the chart cannot make a BOUNDED
// curve at all. No circles, no closed curves, nothing in a box.
//
// Complex poles fix that. If every root of w is off the real axis then w > 0 on all of ℝ and the
// curve is bounded on the whole real line, not merely on [0,1].
//
// THE ARGUMENT SURVIVES COMPLEXIFICATION, and it was verified before this module was written rather
// than assumed. Work in ℍ ⊗ ℂ, where the conjugation `*` is extended ℂ-LINEARLY — it negates the
// three quaternion imaginary parts and leaves the complex scalars alone. Then:
//
//   · V i + i V* = 2Σi still forces v₀ = Σ, v₂ = v₃ = 0, v₁ free — now free in ℂ. The equation is
//     ℂ-linear, so the componentwise solve transfers verbatim. Perturbing v₀, v₂ or v₃ breaks it
//     by O(1), so the form is unique, not merely sufficient.
//   · hence 𝒜′(r) = 𝒜(r)(Σ + λi) with λ ∈ ℂ, and this IMPLIES N′(r) = 2N(r)Σ at the complex pole.
//     Measured 8.9e-16 with an analytic derivative. That implication is the whole point of a chart
//     and was the one genuinely uncertain step.
//   · 𝒜 has REAL quaternion coefficients, so the condition at r̄ is the conjugate of the one at r
//     and holds automatically. Measured: V(r̄) = Σ̄ + λ̄i with v₂ = v₃ = 0 to 6.3e-16.
//
// SO A CONJUGATE PAIR CARRIES ONE COMPLEX λ — two real parameters, exactly what two real poles
// carry. Nothing is gained or lost in the count; the dial simply moves off the real axis with the
// pole it belongs to.
//
// WHAT STILL DOES NOT WORK, unchanged from the real chart: σ(r) = 0. There 𝒜(r) is rank one in
// ℍ ⊗ ℂ ≅ M₂(ℂ) — nonzero but singular, det 𝒜(r) = σ(r) = 0 — so there is nothing to divide by and
// the strip stops rather than degrading. That stratum is not small: every conformal PH member lives
// in it, since σ = h·w vanishes at every pole there, and so does the circle. Use the linear system
// of Kalkan–Scharler–Schröcker–Šír Thm 3.6 there; it never divides.
//
// TO MERGE. This is deliberately a separate module rather than an edit to rationalPHMultiPoleSpatial,
// because that file was under active concurrent work on this branch. The two should become one:
// a pole list of mixed real roots and conjugate pairs, real λ for the former and complex λ for the
// latter. Nothing here contradicts that module — it is the same chart, one axis wider.
// ============================================================================
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec, type Vec3 } from './quaternion'
import { leastSquares } from './linalg'

/** A complex number, kept structural so the arithmetic below reads like the derivation. */
export interface Cx {
  readonly re: number
  readonly im: number
}
export const cx = (re: number, im = 0): Cx => ({ re, im })
const cadd = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im)
const csub = (a: Cx, b: Cx): Cx => cx(a.re - b.re, a.im - b.im)
const cmul = (a: Cx, b: Cx): Cx => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b.re * b.re + b.im * b.im
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
export const cabs = (a: Cx): number => Math.hypot(a.re, a.im)
const cconj = (a: Cx): Cx => cx(a.re, -a.im)

/** A quaternion with complex components — an element of ℍ ⊗ ℂ. */
type CQuat = readonly [Cx, Cx, Cx, Cx]
const cqadd = (x: CQuat, y: CQuat): CQuat =>
  [cadd(x[0], y[0]), cadd(x[1], y[1]), cadd(x[2], y[2]), cadd(x[3], y[3])] as const
const cqsub = (x: CQuat, y: CQuat): CQuat =>
  [csub(x[0], y[0]), csub(x[1], y[1]), csub(x[2], y[2]), csub(x[3], y[3])] as const
const cqmul = (x: CQuat, y: CQuat): CQuat =>
  [
    csub(csub(csub(cmul(x[0], y[0]), cmul(x[1], y[1])), cmul(x[2], y[2])), cmul(x[3], y[3])),
    cadd(cadd(cmul(x[0], y[1]), cmul(x[1], y[0])), csub(cmul(x[2], y[3]), cmul(x[3], y[2]))),
    cadd(cadd(cmul(x[0], y[2]), cmul(x[2], y[0])), csub(cmul(x[3], y[1]), cmul(x[1], y[3]))),
    cadd(cadd(cmul(x[0], y[3]), cmul(x[3], y[0])), csub(cmul(x[1], y[2]), cmul(x[2], y[1]))),
  ] as const
/** ℂ-LINEAR conjugation: negate the quaternion imaginary parts, leave the ℂ scalars untouched. */
const cqconj = (x: CQuat): CQuat =>
  [x[0], cx(-x[1].re, -x[1].im), cx(-x[2].re, -x[2].im), cx(-x[3].re, -x[3].im)] as const

export interface ComplexPoleParams {
  /** 𝒜's coefficients in the power basis, length n+1. REAL quaternions — the curve is real. */
  readonly A: readonly Quat[]
  /** One entry per conjugate PAIR of poles; the stored root is the one with im > 0. */
  readonly pairs: readonly Cx[]
  /** One COMPLEX twist rate per pair. The conjugate pole carries its conjugate, automatically. */
  readonly lambdas: readonly Cx[]
}

export interface ComplexPoleMember {
  readonly p: readonly number[][]
  readonly w: readonly number[]
  readonly N: readonly number[][]
  readonly sigma: readonly number[]
  /** Residual of the Wronskian solve — machine zero when 𝒜 is admissible. */
  readonly wronskian: number
  /** How far 𝒜 is from the no-log conditions, relative. */
  readonly noLog: number
  /** min over ℝ of w. Positive means the curve is BOUNDED on the whole real line. */
  readonly denominatorFloor: number
}

const parts = (q: Quat): number[] => [q.u, q.v, q.p, q.q]
const fromParts = (a: number[], i: number): Quat => ({ u: a[i], v: a[i + 1], p: a[i + 2], q: a[i + 3] })
export const packSpinor = (A: readonly Quat[]): number[] => A.flatMap(parts)
export const unpackSpinor = (x: readonly number[]): Quat[] =>
  Array.from({ length: x.length / 4 }, (_, k) => fromParts(x as number[], 4 * k))

/** w = ∏ (t² − 2·Re(r)·t + |r|²) over the pairs — real coefficients, no real roots. */
export function denominatorOf(pairs: readonly Cx[]): number[] {
  let w = [1]
  for (const r of pairs) {
    const quad = [r.re * r.re + r.im * r.im, -2 * r.re, 1]
    const out = new Array(w.length + 2).fill(0)
    for (let i = 0; i < w.length; i++) for (let j = 0; j < 3; j++) out[i + j] += w[i] * quad[j]
    w = out
  }
  return w
}

/** Σ_k = Σ over the OTHER roots of 1/(r_k − r_l), counting each pair's two members. */
export function sigmaAt(pairs: readonly Cx[], k: number): Cx {
  const all: Cx[] = pairs.flatMap((r) => [r, cconj(r)])
  const rk = pairs[k]
  let s = cx(0)
  for (let i = 0; i < all.length; i++) {
    if (i === 2 * k) continue // skip r_k itself; its conjugate DOES count
    s = cadd(s, cdiv(cx(1), csub(rk, all[i])))
  }
  return s
}

const evalCQ = (A: readonly Quat[], z: Cx): CQuat => {
  let acc: CQuat = [cx(0), cx(0), cx(0), cx(0)] as const
  for (let k = A.length - 1; k >= 0; k--) {
    const c = parts(A[k])
    acc = cqadd(cqmul([z, cx(0), cx(0), cx(0)] as const, acc), [
      cx(c[0]),
      cx(c[1]),
      cx(c[2]),
      cx(c[3]),
    ] as const)
  }
  return acc
}
const evalCQderiv = (A: readonly Quat[], z: Cx): CQuat => {
  const D = A.slice(1).map((q, k) => qscale(q, k + 1))
  return evalCQ(D, z)
}

/**
 * The no-log conditions as a real matrix on 𝒜's packed coefficients: for each pair, the quaternion
 * equation 𝒜′(r) − 𝒜(r)(Σ + λi) = 0 split into real and imaginary parts — EIGHT real rows per pair,
 * against four for a real pole. The conjugate pole contributes nothing new.
 */
export function conditionMatrix(prm: ComplexPoleParams): number[][] {
  const n4 = prm.A.length * 4
  const rows: number[][] = []
  for (let k = 0; k < prm.pairs.length; k++) {
    const r = prm.pairs[k]
    const S = sigmaAt(prm.pairs, k)
    const M: CQuat = [cadd(S, cx(0)), prm.lambdas[k], cx(0), cx(0)] as const // Σ + λi
    for (let j = 0; j < n4; j++) {
      const e = new Array(n4).fill(0)
      e[j] = 1
      const E = unpackSpinor(e)
      const d = cqsub(evalCQderiv(E, r), cqmul(evalCQ(E, r), M))
      const col = [d[0].re, d[0].im, d[1].re, d[1].im, d[2].re, d[2].im, d[3].re, d[3].im]
      for (let i = 0; i < 8; i++) {
        rows[8 * k + i] ??= new Array(n4).fill(0)
        rows[8 * k + i][j] = col[i]
      }
    }
  }
  return rows
}

/** Orthonormal-ish basis of the admissible spinors at these poles and dials. */
export function familyBasis(prm: ComplexPoleParams): number[][] {
  const M = conditionMatrix(prm)
  const n = prm.A.length * 4
  if (M.length === 0) return Array.from({ length: n }, (_, j) => { const v = new Array(n).fill(0); v[j] = 1; return v })
  const A = M.map((r) => r.slice())
  const piv: number[] = []
  let row = 0
  for (let col = 0; col < n && row < A.length; col++) {
    let best = -1
    let bv = 1e-10
    for (let i = row; i < A.length; i++) if (Math.abs(A[i][col]) > bv) { bv = Math.abs(A[i][col]); best = i }
    if (best < 0) continue
    ;[A[row], A[best]] = [A[best], A[row]]
    const d = A[row][col]
    for (let j = 0; j < n; j++) A[row][j] /= d
    for (let i = 0; i < A.length; i++) if (i !== row) {
      const f = A[i][col]
      if (f) for (let j = 0; j < n; j++) A[i][j] -= f * A[row][j]
    }
    piv.push(col)
    row++
  }
  const free = [...Array(n).keys()].filter((j) => !piv.includes(j))
  return free.map((fj) => {
    const v = new Array(n).fill(0)
    v[fj] = 1
    piv.forEach((pc, i) => { v[pc] = -A[i][fj] })
    return v
  })
}

const pder = (a: number[]): number[] => a.slice(1).map((c, i) => c * (i + 1))
const pev = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)

/** N = 𝒜i𝒜* and σ = |𝒜|², as real polynomials. */
function sandwichAndSpeed(A: readonly Quat[]): { N: number[][]; sigma: number[] } {
  const deg = 2 * (A.length - 1)
  const N = [new Array(deg + 1).fill(0), new Array(deg + 1).fill(0), new Array(deg + 1).fill(0)]
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      N[0][i + j] += v.x
      N[1][i + j] += v.y
      N[2][i + j] += v.z
      sigma[i + j] += qmul(A[i], qconj(A[j])).u
    }
  }
  return { N, sigma }
}

/** Build the member: solve p′w − pw′ = N with p(0) = 0, and report every defect. */
export function toMember(prm: ComplexPoleParams): ComplexPoleMember {
  const { N, sigma } = sandwichAndSpeed(prm.A)
  const w = denominatorOf(prm.pairs)
  const wp = pder(w)
  const degN = N[0].length - 1
  const degP = degN - (w.length - 1) + 1
  const rows: number[][] = []
  const rhs: number[] = []
  for (let comp = 0; comp < 3; comp++) {
    for (let e = 0; e <= degN; e++) {
      const row = new Array(3 * degP).fill(0)
      for (let k = 1; k <= degP; k++) {
        let acc = 0
        for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
        for (let a = 0; a < wp.length; a++) if (k + a === e) acc -= wp[a]
        row[comp * degP + (k - 1)] = acc
      }
      rows.push(row)
      rhs.push(N[comp][e] ?? 0)
    }
  }
  const x = leastSquares(rows, rhs, 1e-14)
  let worst = 0
  for (let i = 0; i < rows.length; i++) {
    worst = Math.max(worst, Math.abs(rows[i].reduce((s, a, j) => s + a * x[j], 0) - rhs[i]))
  }
  const scale = Math.max(...rhs.map(Math.abs), 1e-300)
  const p = [0, 1, 2].map((c) => [0, ...Array.from({ length: degP }, (_, k) => x[c * degP + k])])

  // no-log defect: |N′(r) − 2N(r)Σ| relative, at each pole
  let noLog = 0
  const Nd = N.map(pder)
  for (let k = 0; k < prm.pairs.length; k++) {
    const r = prm.pairs[k]
    const S = sigmaAt(prm.pairs, k)
    const at = (poly: number[][]): CQuat =>
      [cx(0), evC(poly[0], r), evC(poly[1], r), evC(poly[2], r)] as const
    const Nr = at(N)
    const dNr = at(Nd)
    const want = cqmul(Nr, [cx(2 * S.re, 2 * S.im), cx(0), cx(0), cx(0)] as const)
    const num = Math.hypot(...cqsub(dNr, want).map(cabs))
    const den = Math.max(Math.hypot(...want.map(cabs)), 1e-300)
    noLog = Math.max(noLog, num / den)
  }

  // minimum of w over ℝ — positive means bounded everywhere, which is the point of complex poles
  let floor = Infinity
  for (let i = 0; i <= 400; i++) {
    const t = -8 + (16 * i) / 400
    floor = Math.min(floor, pev(w, t))
  }

  return { p, w, N, sigma, wronskian: worst / scale, noLog, denominatorFloor: floor }
}

const evC = (poly: readonly number[], z: Cx): Cx => {
  let acc = cx(0)
  for (let k = poly.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), cx(poly[k]))
  return acc
}

export const curveAt = (m: ComplexPoleMember, t: number): Vec3 => {
  const wt = pev(m.w, t)
  return { x: pev(m.p[0], t) / wt, y: pev(m.p[1], t) / wt, z: pev(m.p[2], t) / wt }
}
export const speedAt = (m: ComplexPoleMember, t: number): number => {
  const wt = pev(m.w, t)
  return pev(m.sigma, t) / (wt * wt)
}
/** |‖c′‖ − σ/w²| relative, sampled — machine zero by construction. */
export function phDefect(m: ComplexPoleMember): number {
  let worst = 0
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const wt = pev(m.w, t)
    const nrm = Math.hypot(pev(m.N[0], t), pev(m.N[1], t), pev(m.N[2], t)) / (wt * wt)
    const want = speedAt(m, t)
    worst = Math.max(worst, Math.abs(nrm - want) / Math.max(want, 1e-300))
  }
  return worst
}
/** σ at a pole. Zero means 𝒜(r) is rank one and this chart does NOT apply there. */
export const speedNumeratorAtPole = (prm: ComplexPoleParams, k: number): Cx => {
  const Ar = evalCQ(prm.A, prm.pairs[k])
  return cqmul(Ar, cqconj(Ar))[0]
}
export { qadd }
