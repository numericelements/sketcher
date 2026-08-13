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
): { M: number[][]; rhs: number[]; unknowns: number } {
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
  return { M, rhs, unknowns }
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
/**
 * The least-squares residual of {C̄A′ + ĀC′ = 𝒜i𝒜*, Re(ĀC) = 0} with C eliminated. A function of the
 * spinor alone, because C enters LINEARLY and can be projected out — which is what makes the joint
 * problem tractable at all: 4(m+1) unknowns instead of the full quadratic system.
 */
export function spinorResidual(A: QPoly, spinor: QPoly, degC: number): number {
  const { M, rhs } = conditionSystem(A, sandwich(spinor), degC)
  const x = leastSquares(M, rhs, 1e-12)
  const scale = Math.max(...rhs.map(Math.abs), 1e-12)
  let res = 0
  M.forEach((row, i) => {
    res = Math.max(res, Math.abs(row.reduce((s, v, j) => s + v * x[j], 0) - rhs[i]))
  })
  return res / scale
}

const unpackSpinorVec = (x: readonly number[], m: number): QPoly => {
  const S: QPoly = [[], [], [], []]
  for (let c = 0; c < 4; c++) S[c] = Array.from({ length: m + 1 }, (_, k) => x[4 * k + c])
  return S
}

export interface JointResult {
  readonly spinor: QPoly
  readonly U: Column
  readonly residual: number
  readonly restarts: number
}

/**
 * Given A, SEARCH for a compatible spinor — the pair (A, 𝒜) has to satisfy a condition for the
 * linear system to have a non-trivial solution at all (Kalkan et al., Thm 4.6). C is eliminated by
 * least squares, so this is a small descent on the spinor coefficients only.
 */
export function findCompatibleSpinor(
  A: QPoly, m: number, degC: number, restarts = 24, iterations = 220,
): JointResult | null {
  let best: { x: number[]; r: number } | null = null
  for (let s = 0; s < restarts; s++) {
    let x = Array.from({ length: 4 * (m + 1) }, (_, i) =>
      Math.sin(3.1 * s + 1.7 * i) + 0.6 * Math.cos(2.3 * i - 0.9 * s))
    let r = spinorResidual(A, unpackSpinorVec(x, m), degC)
    let step = 0.25
    for (let it = 0; it < iterations && r > 1e-13; it++) {
      const grad = x.map((_, j) => {
        const e = 1e-6 * (Math.abs(x[j]) + 1)
        const hi = x.slice(); hi[j] += e
        const lo = x.slice(); lo[j] -= e
        return (spinorResidual(A, unpackSpinorVec(hi, m), degC)
          - spinorResidual(A, unpackSpinorVec(lo, m), degC)) / (2 * e)
      })
      const g = Math.hypot(...grad) || 1
      const trial = x.map((v, j) => v - (step * grad[j]) / g)
      const rt = spinorResidual(A, unpackSpinorVec(trial, m), degC)
      if (rt < r) { x = trial; r = rt; step *= 1.3 } else { step *= 0.5 }
      if (step < 1e-12) break
    }
    if (!best || r < best.r) best = { x, r }
  }
  if (!best) return null
  const spinor = unpackSpinorVec(best.x, m)
  return {
    spinor,
    U: solveForC(A, sandwich(spinor), degC).U,
    residual: best.r,
    restarts,
  }
}
