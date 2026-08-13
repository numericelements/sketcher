// ============================================================================
// THE Sp(1,1) CONSTRUCTION OF SPATIAL RATIONAL PH CURVES — Möbius-covariant, and linear.
//
// THE OBJECT. A point of ℝ³ ∪ {∞} is a null line in ℍ² for J = [[0,1],[1,0]]: the column
// U = (A, C)ᵀ with Re(ĀC) = 0 represents x = C A⁻¹. Sp(1,1) = {G : G†JG = J} acts by U ↦ GU,
// LINEARLY, so Möbius transformations never raise a degree. (See sp11ChartCondition.test.ts.)
//
// THE CONDITION. Because M†JM = ρJ gives M⁻¹ = ρ⁻¹[[D̄,B̄],[C̄,Ā]], the body-frame velocity
// Ω = M⁻¹M′ has lower-left entry ρ⁻¹(C̄A′ + ĀC′) — depending on the FIRST COLUMN ALONE. So define
//
//     Ñ  :=  C̄A′ + ĀC′                        (the covariant Wronskian)
//
// and −det((UU†)′) = |Ñ|². The curve is PH exactly when |Ñ|² is a perfect square, i.e. when Ñ is a
// sandwich 𝒜i𝒜*. In the real-denominator gauge (A = w real, C = p imaginary) Ñ collapses to the
// classical wp′ − w′p, so this is the same condition seen without a gauge choice. Under U ↦ Uq it
// transforms as Ñ ↦ q̄Ñq — a conjugation, because the C̄A + ĀC term dies on the null condition.
//
// THE CONSTRUCTION, and it is Kalkan's made covariant. Prescribe the spinor 𝒜 and the first entry A;
// then
//
//     C̄A′ + ĀC′ = 𝒜i𝒜*        and        Re(ĀC) = 0
//
// are LINEAR in C. Kalkan et al.'s αB′ − α′B = μ𝒜i𝒜* is precisely the case A = α REAL. Letting A be
// a full quaternion polynomial is the freedom the real-denominator gauge throws away — and it is
// what reaches curves that no real A produces, in their own low degree and with no poles.
//
// WHAT IS OURS AND WHAT IS NOT. The complete construction of spatial rational PH curves is Kalkan,
// Scharler, Schröcker & Šír, CAGD 99 (2022); the arc-length refinement is Schröcker & Šír,
// arXiv:2310.08047. This module re-expresses their system covariantly. It solves no open problem;
// it removes a gauge singularity, which is what a chart needs to be draggable everywhere.
// ============================================================================
import { leastSquares } from './linalg'

// --- real polynomials, power basis, index = degree ---------------------------
export type Poly = number[]
export const pAdd = (a: Poly, b: Poly): Poly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
export const pSub = (a: Poly, b: Poly): Poly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0))
export const pMul = (a: Poly, b: Poly): Poly => {
  const o = new Array<number>(Math.max(a.length + b.length - 1, 1)).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
export const pDeriv = (a: Poly): Poly => (a.length < 2 ? [0] : a.slice(1).map((c, i) => c * (i + 1)))
export const pEval = (a: Poly, t: number): number => a.reduceRight((s, c) => s * t + c, 0)
export const pMax = (a: Poly): number => Math.max(...a.map(Math.abs), 0)

// --- quaternion polynomials: [real, i, j, k] ---------------------------------
export type QPoly = [Poly, Poly, Poly, Poly]
export const QP_ZERO: QPoly = [[0], [0], [0], [0]]
export const qpReal = (a: Poly): QPoly => [a, [0], [0], [0]]
export const qpImag = (v: readonly Poly[]): QPoly => [[0], v[0], v[1], v[2]]
export const qpConst = (u: number, i = 0, j = 0, k = 0): QPoly => [[u], [i], [j], [k]]
export const qpAdd = (A: QPoly, B: QPoly): QPoly =>
  [pAdd(A[0], B[0]), pAdd(A[1], B[1]), pAdd(A[2], B[2]), pAdd(A[3], B[3])]
export const qpMul = (A: QPoly, B: QPoly): QPoly => [
  pSub(pSub(pSub(pMul(A[0], B[0]), pMul(A[1], B[1])), pMul(A[2], B[2])), pMul(A[3], B[3])),
  pAdd(pSub(pAdd(pMul(A[0], B[1]), pMul(A[1], B[0])), pMul(A[3], B[2])), pMul(A[2], B[3])),
  pAdd(pAdd(pSub(pMul(A[0], B[2]), pMul(A[1], B[3])), pMul(A[2], B[0])), pMul(A[3], B[1])),
  pAdd(pSub(pAdd(pMul(A[0], B[3]), pMul(A[1], B[2])), pMul(A[2], B[1])), pMul(A[3], B[0])),
]
export const qpConj = (A: QPoly): QPoly =>
  [A[0], A[1].map((c) => -c), A[2].map((c) => -c), A[3].map((c) => -c)]
export const qpDeriv = (A: QPoly): QPoly => [pDeriv(A[0]), pDeriv(A[1]), pDeriv(A[2]), pDeriv(A[3])]
/** |A|² = A·Ā — real, because the cross terms cancel (polynomial multiplication commutes). */
export const qpNorm = (A: QPoly): Poly =>
  pAdd(pAdd(pMul(A[0], A[0]), pMul(A[1], A[1])), pAdd(pMul(A[2], A[2]), pMul(A[3], A[3])))
export const qpMax = (A: QPoly): number => Math.max(...A.map(pMax))
export const qpDegree = (A: QPoly): number => {
  const s = qpMax(A) || 1
  let d = 0
  A.forEach((c) => c.forEach((v, i) => { if (Math.abs(v) > 1e-12 * s) d = Math.max(d, i) }))
  return d
}
export const qpEval = (A: QPoly, t: number): [number, number, number, number] =>
  [pEval(A[0], t), pEval(A[1], t), pEval(A[2], t), pEval(A[3], t)]

/** The sandwich 𝒜v𝒜* with v a constant unit quaternion — a quaternion polynomial of square norm. */
export const sandwich = (A: QPoly, v: QPoly = qpConst(0, 1)): QPoly =>
  qpMul(qpMul(A, v), qpConj(A))

// --- the column ---------------------------------------------------------------
/** U = (A, C)ᵀ, a null column: the curve is x = C·A⁻¹. */
export interface Column { readonly A: QPoly; readonly C: QPoly }

/** Re(ĀC) — identically zero exactly when U represents a curve in ℝ³ ∪ {∞}. */
export const nullPart = (U: Column): Poly => qpMul(qpConj(U.A), U.C)[0]

/** The covariant Wronskian Ñ = C̄A′ + ĀC′. Reduces to wp′ − w′p in the real-denominator gauge. */
export const covariantWronskian = (U: Column): QPoly =>
  qpAdd(qpMul(qpConj(U.C), qpDeriv(U.A)), qpMul(qpConj(U.A), qpDeriv(U.C)))

/** −det((UU†)′). Equals |Ñ|², so the PH condition can be read either way. */
export function speedSquared(U: Column): Poly {
  const h11 = qpNorm(U.A)
  const h22 = qpNorm(U.C)
  const h12 = qpMul(U.A, qpConj(U.C))
  return pSub(qpNorm(qpDeriv(h12)), pMul(pDeriv(h11), pDeriv(h22)))
}

/** The point x = C·A⁻¹ at parameter t, or null where A vanishes (the curve reaches infinity). */
export function curveAt(U: Column, t: number): { x: number; y: number; z: number } | null {
  const [a0, a1, a2, a3] = qpEval(U.A, t)
  const n = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3
  if (n < 1e-14) return null
  const [c0, c1, c2, c3] = qpEval(U.C, t)
  // C·Ā/|A|²
  const x = (-c0 * a1 + c1 * a0 - c2 * a3 + c3 * a2) / n
  const y = (-c0 * a2 + c1 * a3 + c2 * a0 - c3 * a1) / n
  const z = (-c0 * a3 - c1 * a2 + c2 * a1 + c3 * a0) / n
  const re = (c0 * a0 + c1 * a1 + c2 * a2 + c3 * a3) / n
  return Math.abs(re) > 1e-6 * (1 + Math.hypot(x, y, z)) ? null : { x, y, z }
}

// --- the linear solve ---------------------------------------------------------
const coeff = (p: Poly, i: number): number => p[i] ?? 0

/**
 * The system {C̄A′ + ĀC′ = target, Re(ĀC) = 0} as a real matrix acting on C's coefficients,
 * together with its right-hand side. FOUR rows per power for the Wronskian, ONE per power for the
 * null condition — and every entry is linear in C because A and the target are prescribed.
 */
export function conditionSystem(
  A: QPoly, target: QPoly, degC: number,
): { M: number[][]; rhs: number[]; unknowns: number; degW: number; degN: number } {
  const unknowns = 4 * (degC + 1)
  const cols: { w: QPoly; n: Poly }[] = []
  for (let k = 0; k <= degC; k++) {
    for (let c = 0; c < 4; c++) {
      const basis: QPoly = [[0], [0], [0], [0]]
      basis[c] = new Array<number>(k + 1).fill(0)
      basis[c][k] = 1
      cols.push({
        w: qpAdd(qpMul(qpConj(basis), qpDeriv(A)), qpMul(qpConj(A), qpDeriv(basis))),
        n: qpMul(qpConj(A), basis)[0],
      })
    }
  }
  const degW = Math.max(...cols.map((c) => c.w.reduce((d, p) => Math.max(d, p.length - 1), 0)),
    target.reduce((d, p) => Math.max(d, p.length - 1), 0))
  const degN = Math.max(...cols.map((c) => c.n.length - 1), 0)

  const M: number[][] = []
  const rhs: number[] = []
  for (let e = 0; e <= degW; e++) {
    for (let q = 0; q < 4; q++) {
      M.push(cols.map((c) => coeff(c.w[q], e)))
      rhs.push(coeff(target[q], e))
    }
  }
  for (let e = 0; e <= degN; e++) {
    M.push(cols.map((c) => coeff(c.n, e)))
    rhs.push(0)
  }
  return { M, rhs, unknowns, degW, degN }
}

const unpackC = (x: readonly number[], degC: number): QPoly => {
  const out: QPoly = [[], [], [], []]
  for (let c = 0; c < 4; c++) out[c] = Array.from({ length: degC + 1 }, (_, k) => x[4 * k + c])
  return out
}

export interface SolveResult {
  readonly U: Column
  /** Relative residual of the whole system — machine zero when the data is consistent. */
  readonly residual: number
  /** Dimension of the homogeneous solution space (the family through this solution). */
  readonly familyDimension: number
}

/**
 * Solve C̄A′ + ĀC′ = target, Re(ĀC) = 0 for C. Prescribing A and the target (a sandwich 𝒜i𝒜*)
 * makes this LINEAR — no Newton, no seed hunt. Degrees must satisfy deg A + deg C − 1 = deg target.
 */
export function solveForC(A: QPoly, target: QPoly, degC: number, tol = 1e-12): SolveResult {
  const { M, rhs, unknowns } = conditionSystem(A, target, degC)
  const x = leastSquares(M, rhs, tol)
  const scale = Math.max(...rhs.map(Math.abs), 1e-30)
  let res = 0
  M.forEach((row, i) => {
    res = Math.max(res, Math.abs(row.reduce((s, v, j) => s + v * x[j], 0) - rhs[i]))
  })
  // the homogeneous solutions: probe the nullspace by projecting random vectors off the row space
  const basis: number[][] = []
  for (let seed = 0; seed < 3 * unknowns && basis.length < unknowns; seed++) {
    const probe = Array.from({ length: unknowns }, (_, i) =>
      Math.cos(1.7 * seed + 0.53 * i) + 0.4 * Math.sin(2.3 * i - 0.9 * seed))
    let v: number[]
    try {
      const corr = leastSquares(M, M.map((row) => row.reduce((s, w, j) => s + w * probe[j], 0)), tol)
      v = probe.map((q, i) => q - corr[i])
    } catch { continue }
    for (const b of basis) {
      const d = v.reduce((s, q, i) => s + q * b[i], 0)
      v = v.map((q, i) => q - d * b[i])
    }
    const len = Math.hypot(...v)
    if (len > 1e-6) basis.push(v.map((q) => q / len))
  }
  return {
    U: { A, C: unpackC(x, degC) },
    residual: res / scale,
    familyDimension: basis.length,
  }
}

/** Polynomial square root by coefficient recursion; null when the input is not a perfect square. */
export function polySqrt(poly: Poly, tol = 1e-7): Poly | null {
  const a = poly.slice()
  const s0 = pMax(a) || 1
  while (a.length > 1 && Math.abs(a[a.length - 1]) < 1e-12 * s0) a.pop()
  // a square may vanish at 0 — strip t^{2z}, which must come in an EVEN power for a square
  let z = 0
  while (z < a.length && Math.abs(a[z]) < 1e-12 * s0) z++
  if (z > 0) {
    if (z >= a.length || z % 2 !== 0) return null
    const inner = polySqrt(a.slice(z), tol)
    return inner === null ? null : [...new Array<number>(z / 2).fill(0), ...inner]
  }
  if (a.length % 2 === 0 || a[0] <= 0) return null
  const n = (a.length - 1) / 2
  const hat = a.map((c) => c / a[0])
  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  const check = pMul(s, s)
  const gap = Math.max(...Array.from({ length: Math.max(check.length, hat.length) },
    (_, i) => Math.abs(coeff(check, i) - coeff(hat, i))))
  if (gap > tol) return null
  const r = Math.sqrt(a[0])
  return s.map((c) => c * r)
}

/** How far U is from being PH: relative gap between |Ñ|² and the square of its square root. */
export function phDefect(U: Column): number {
  const q = qpNorm(covariantWronskian(U))
  const s = polySqrt(q)
  if (!s) return Infinity
  const sq = pMul(s, s)
  const scale = pMax(q) || 1
  return Math.max(...Array.from({ length: Math.max(sq.length, q.length) },
    (_, i) => Math.abs(coeff(sq, i) - coeff(q, i)))) / scale
}

// --- the joint problem: which spinors are COMPATIBLE with a prescribed A? -----
//
// The system M·c = rhs(𝒜) has M depending ONLY on A and deg C — fixed. So it is solvable exactly
// when rhs(𝒜) lands in col(M), and rhs is QUADRATIC in the spinor with an analytic derivative
// ∂(𝒜i𝒜*)/∂e = e i 𝒜* + 𝒜 i e*. That makes this a genuine least-squares problem, not a search.
//
// AND A COUNT PREDICTS THE ANSWER BEFORE ANY SOLVING. Let V be the space of achievable Wronskians
// (the image of {C : Re(ĀC) = 0} under C ↦ C̄A′ + ĀC′), of dimension D, and let n = deg Ñ. Being a
// perfect square costs n conditions on a degree-2n polynomial, and the whole problem is homogeneous
// so one dimension scales out. Solutions should exist generically when
//
//     D − 1  ≥  n .
//
// The count is checked below against a case known to have solutions before it is trusted anywhere.

const dotv = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)

/** Orthonormal basis of the span of the given vectors, by modified Gram-Schmidt. */
export function orthonormalise(vectors: readonly (readonly number[])[], tol = 1e-9): number[][] {
  const basis: number[][] = []
  const scale = Math.max(...vectors.map((v) => Math.hypot(...v)), 1e-30)
  for (const raw of vectors) {
    let v = raw.slice()
    for (const b of basis) { const d = dotv(v, b); v = v.map((q, i) => q - d * b[i]) }
    const len = Math.hypot(...v)
    if (len > tol * scale) basis.push(v.map((q) => q / len))
  }
  return basis
}

/**
 * Orthonormal basis of the nullspace of `rows`, by explicit complement: orthonormalise the row
 * space, then project the STANDARD basis off it. Deterministic, and it returns exactly
 * dim − rank vectors — random probes silently under-collect, which cost a calibration failure here.
 */
export function nullspaceBasis(rows: readonly (readonly number[])[], dim: number, tol = 1e-9): number[][] {
  const R = orthonormalise(rows, tol)
  const out: number[][] = []
  for (let i = 0; i < dim; i++) {
    let v: number[] = Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0))
    for (const b of R) { const d = dotv(v, b); v = v.map((q, k) => q - d * b[k]) }
    for (const b of out) { const d = dotv(v, b); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > tol) out.push(v.map((q) => q / len))
  }
  return out
}

/** The columns of M, as vectors in equation-space. */
const columnsOf = (M: readonly (readonly number[])[]): number[][] =>
  (M[0] ?? []).map((_, j) => M.map((row) => row[j]))

export interface ImageCount {
  /** dim V — how many distinct Wronskians A can produce. */
  readonly D: number
  /** n = deg Ñ, hence the number of perfect-square conditions. */
  readonly n: number
  /** D − 1 − n. Non-negative predicts that compatible spinors exist. */
  readonly slack: number
}

/**
 * Dimension of the achievable-Wronskian space for a prescribed A, and the resulting prediction.
 * Nothing is solved here — this is a rank computation, so it is exact.
 */
export function wronskianImage(A: QPoly, degC: number): ImageCount {
  const unknowns = 4 * (degC + 1)
  const nullRows: number[][] = []
  const wronskCols: number[][] = []
  const basisFor = (k: number, c: number): QPoly => {
    const b: QPoly = [[0], [0], [0], [0]]
    b[c] = new Array<number>(k + 1).fill(0)
    b[c][k] = 1
    return b
  }
  const wronskOf = (b: QPoly): QPoly =>
    qpAdd(qpMul(qpConj(b), qpDeriv(A)), qpMul(qpConj(A), qpDeriv(b)))
  let degN = 0
  for (let k = 0; k <= degC; k++) for (let c = 0; c < 4; c++) {
    degN = Math.max(degN, ...wronskOf(basisFor(k, c)).map((p) => p.length - 1))
  }
  for (let k = 0; k <= degC; k++) for (let c = 0; c < 4; c++) {
    const b = basisFor(k, c)
    const w = wronskOf(b)
    const flat: number[] = []
    for (let e = 0; e <= degN; e++) for (let q = 0; q < 4; q++) flat.push(w[q][e] ?? 0)
    wronskCols.push(flat)
    nullRows.push([])
  }
  // the null condition Re(ĀC) = 0 as rows over the same unknowns
  const nullMat: number[][] = []
  const degNull = Math.max(...Array.from({ length: unknowns }, (_, idx) => {
    const k = Math.floor(idx / 4), c = idx % 4
    return qpMul(qpConj(A), basisFor(k, c))[0].length - 1
  }), 0)
  for (let e = 0; e <= degNull; e++) {
    const row: number[] = []
    for (let k = 0; k <= degC; k++) for (let c = 0; c < 4; c++) {
      row.push(qpMul(qpConj(A), basisFor(k, c))[0][e] ?? 0)
    }
    nullMat.push(row)
  }
  // basis of {C : Re(ĀC) = 0}, then its image under the Wronskian map
  const kernel = nullspaceBasis(nullMat, unknowns)
  const images = kernel.map((c) =>
    wronskCols[0].map((_, e) => c.reduce((s, w, j) => s + w * wronskCols[j][e], 0)))
  const D = orthonormalise(images, 1e-8).length
  return { D, n: degN, slack: D - 1 - degN }
}

export interface JointResult {
  readonly spinor: QPoly
  readonly U: Column
  /** ‖(I − P)rhs‖ / ‖rhs‖ — scale-free, so the spurious 𝒜 = 0 minimum cannot win. */
  readonly residual: number
  readonly restarts: number
}

/**
 * Find a spinor compatible with a prescribed A: Levenberg-Marquardt on the unit sphere with the
 * ANALYTIC Jacobian, minimising the part of rhs(𝒜) that misses col(M). The spinor is normalised
 * each step because the problem is homogeneous — 𝒜 = 0 is a global minimum and a meaningless one.
 */
export function findCompatibleSpinor(
  A: QPoly, m: number, degC: number, restarts = 16, iterations = 120,
): JointResult | null {
  const ref: QPoly = [Array.from({ length: m + 1 }, () => 1), [0], [0], [0]]
  const probe = conditionSystem(A, sandwich(ref), degC)
  const degW = probe.degW      // NOT rhs.length/4 - 1: rhs also carries the null-condition rows
  const Q = orthonormalise(columnsOf(probe.M), 1e-10)
  const E = probe.M.length
  const rhsOf = (S: QPoly): number[] => {
    const t = sandwich(S)
    const out = new Array<number>(E).fill(0)
    for (let e = 0; e <= degW; e++) for (let q = 0; q < 4; q++) {
      const idx = 4 * e + q
      if (idx < E) out[idx] = t[q][e] ?? 0
    }
    return out
  }
  const project = (v: readonly number[]): number[] => {
    const out = v.slice()
    for (const b of Q) { const d = dotv(out, b); for (let i = 0; i < out.length; i++) out[i] -= d * b[i] }
    return out
  }
  const P = 4 * (m + 1)
  const toSpinor = (x: readonly number[]): QPoly => {
    const S: QPoly = [[], [], [], []]
    for (let c = 0; c < 4; c++) S[c] = Array.from({ length: m + 1 }, (_, k) => x[4 * k + c])
    return S
  }
  const basisVec = (j: number): QPoly => {
    const S: QPoly = [[0], [0], [0], [0]]
    const k = Math.floor(j / 4), c = j % 4
    S[c] = new Array<number>(k + 1).fill(0)
    S[c][k] = 1
    return S
  }
  const relResidual = (x: readonly number[]): { r: number[]; rel: number } => {
    const b = rhsOf(toSpinor(x))
    const nb = Math.hypot(...b) || 1e-30
    const r = project(b)
    return { r, rel: Math.hypot(...r) / nb }
  }

  let best: { x: number[]; rel: number } | null = null
  for (let s = 0; s < restarts; s++) {
    let x = Array.from({ length: P }, (_, i) => Math.sin(2.7 * s + 1.3 * i + 0.4) + 0.5 * Math.cos(1.1 * i - 2.2 * s))
    const norm = (v: number[]): number[] => { const n = Math.hypot(...v) || 1; return v.map((q) => q / n) }
    x = norm(x)
    let { r, rel } = relResidual(x)
    let lambda = 1e-3
    for (let it = 0; it < iterations && rel > 1e-14; it++) {
      const S = toSpinor(x)
      // analytic Jacobian: ∂(𝒜i𝒜*)/∂xⱼ = eⱼ i 𝒜* + 𝒜 i eⱼ*
      const cols = Array.from({ length: P }, (_, j) => {
        const e = basisVec(j)
        const d = qpAdd(qpMul(qpMul(e, qpConst(0, 1)), qpConj(S)), qpMul(qpMul(S, qpConst(0, 1)), qpConj(e)))
        const flat = new Array<number>(E).fill(0)
        for (let k = 0; k <= degW; k++) for (let q = 0; q < 4; q++) {
          const idx = 4 * k + q
          if (idx < E) flat[idx] = d[q][k] ?? 0
        }
        return project(flat)
      })
      const Jm = Array.from({ length: E }, (_, i) => cols.map((c) => c[i]))
      let stepped = false
      for (let attempt = 0; attempt < 8 && !stepped; attempt++) {
        let dx: number[]
        try { dx = leastSquares(Jm, r.map((v) => -v), lambda) } catch { lambda *= 8; continue }
        const dproj = dx.map((v, i) => v - dotv(dx, x) * x[i])      // stay on the sphere
        const cand = norm(x.map((v, i) => v + dproj[i]))
        const got = relResidual(cand)
        if (got.rel < rel) { x = cand; r = got.r; rel = got.rel; lambda = Math.max(lambda / 3, 1e-12); stepped = true }
        else lambda *= 8
      }
      if (!stepped) break
    }
    if (!best || rel < best.rel) best = { x, rel }
  }
  if (!best) return null
  const spinor = toSpinor(best.x)
  return { spinor, U: solveForC(A, sandwich(spinor), degC).U, residual: best.rel, restarts }
}
