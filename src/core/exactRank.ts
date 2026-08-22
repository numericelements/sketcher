// ============================================================================
// THE RANK OF THE DEFINING JACOBIAN, IN EXACT RATIONAL ARITHMETIC.
//
// Every δ in docs/CONFORMAL_SINGULAR_LOCUS.md was fought at a resolution limit: counted below a
// floor, read at √residual, or classified from a convergence ratio that turned out to be a
// transient. Three instruments, each of which returned a number on inputs it could not actually
// measure. This module removes the floor instead of arguing about it.
//
// A rational PH space curve can be built with RATIONAL COEFFICIENTS end to end:
//
//   1. pick rational roots r₁…r_m of w and rational twist rates λ₁…λ_m
//   2. the no-log condition 𝒜′(rₖ) = 𝒜(rₖ)(Σₖ + λₖ i) is LINEAR in 𝒜 (F17) — solve over ℚ
//   3. N = 𝒜i𝒜̄ and σ = |𝒜|² are then rational, and PH holds by SUBSTITUTION, not by solving
//   4. p from p′w − pw′ = N, again a rational linear solve
//   5. lift: C = (2w², 2wq, ‖q‖²), h = 2σ — rational
//   6. the defining Jacobian's entries are binomial RATIOS times those coefficients — rational
//
// so the rank comes back as an INTEGER, with no threshold anywhere in the chain. δ = 4n − 1 − rank.
//
// The cost is bigint arithmetic, which is why this is a measuring instrument and not a solver.
// ============================================================================

// ---------------------------------------------------------------------------
// ℚ
// ---------------------------------------------------------------------------
export interface Q { readonly n: bigint; readonly d: bigint }

const gcdBig = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y) { const t = x % y; x = y; y = t }
  return x
}
export function q(n: bigint | number, d: bigint | number = 1n): Q {
  let nn = typeof n === 'number' ? BigInt(n) : n
  let dd = typeof d === 'number' ? BigInt(d) : d
  if (dd === 0n) throw new Error('exactRank: zero denominator')
  if (dd < 0n) { nn = -nn; dd = -dd }
  const g = gcdBig(nn, dd) || 1n
  return { n: nn / g, d: dd / g }
}
export const Q0 = q(0n)
export const Q1 = q(1n)
export const qAdd = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d)
export const qSub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d)
export const qMul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d)
export const qDiv = (a: Q, b: Q): Q => q(a.n * b.d, a.d * b.n)
export const qNeg = (a: Q): Q => ({ n: -a.n, d: a.d })
export const qIsZero = (a: Q): boolean => a.n === 0n
export const qNum = (a: Q): number => Number(a.n) / Number(a.d)

// ---------------------------------------------------------------------------
// polynomials over ℚ, power basis
// ---------------------------------------------------------------------------
export type QPoly = Q[]
export const pAdd = (a: QPoly, b: QPoly): QPoly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => qAdd(a[i] ?? Q0, b[i] ?? Q0))
export const pSub = (a: QPoly, b: QPoly): QPoly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => qSub(a[i] ?? Q0, b[i] ?? Q0))
export function pMul(a: QPoly, b: QPoly): QPoly {
  const out: QPoly = Array.from({ length: a.length + b.length - 1 }, () => Q0)
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qAdd(out[i + j], qMul(x, y)) }))
  return out
}
export const pDeriv = (a: QPoly): QPoly => a.slice(1).map((v, i) => qMul(v, q(i + 1)))
export const pEval = (a: QPoly, t: Q): Q => a.reduceRight((acc, c) => qAdd(qMul(acc, t), c), Q0)

/** Exact binomial. */
export function binomQ(n: number, k: number): Q {
  if (k < 0 || k > n) return Q0
  let num = 1n
  let den = 1n
  for (let i = 0; i < k; i++) { num *= BigInt(n - i); den *= BigInt(i + 1) }
  return q(num, den)
}
/** Power basis → Bernstein of degree n, exactly. */
export function toBernsteinQ(a: QPoly, n: number): QPoly {
  return Array.from({ length: n + 1 }, (_, k) => {
    let acc = Q0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) {
      acc = qAdd(acc, qMul(qDiv(binomQ(k, j), binomQ(n, j)), a[j]))
    }
    return acc
  })
}

// ---------------------------------------------------------------------------
// quaternions over ℚ — the same Hamilton convention as core/quaternion
// ---------------------------------------------------------------------------
export type QQuat = readonly [Q, Q, Q, Q]      // u, v, p, q
export const qqMul = (a: QQuat, b: QQuat): QQuat => [
  qSub(qSub(qSub(qMul(a[0], b[0]), qMul(a[1], b[1])), qMul(a[2], b[2])), qMul(a[3], b[3])),
  qAdd(qSub(qAdd(qMul(a[0], b[1]), qMul(a[1], b[0])), qMul(a[3], b[2])), qMul(a[2], b[3])),
  qAdd(qAdd(qSub(qMul(a[0], b[2]), qMul(a[1], b[3])), qMul(a[2], b[0])), qMul(a[3], b[1])),
  qAdd(qSub(qAdd(qMul(a[0], b[3]), qMul(a[1], b[2])), qMul(a[2], b[1])), qMul(a[3], b[0])),
]
export const qqConj = (a: QQuat): QQuat => [a[0], qNeg(a[1]), qNeg(a[2]), qNeg(a[3])]

// ---------------------------------------------------------------------------
// exact linear algebra over ℚ
// ---------------------------------------------------------------------------
/** Rank by Gaussian elimination over ℚ. No tolerance: a pivot is zero or it is not. */
export function rankQ(M: readonly (readonly Q[])[]): number {
  if (M.length === 0) return 0
  const A = M.map((row) => [...row])
  const rows = A.length, cols = A[0].length
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = -1
    for (let i = r; i < rows; i++) if (!qIsZero(A[i][c])) { piv = i; break }
    if (piv < 0) continue
    ;[A[r], A[piv]] = [A[piv], A[r]]
    const inv = A[r][c]
    for (let i = r + 1; i < rows; i++) {
      if (qIsZero(A[i][c])) continue
      const f = qDiv(A[i][c], inv)
      for (let j = c; j < cols; j++) A[i][j] = qSub(A[i][j], qMul(f, A[r][j]))
    }
    r++
  }
  return r
}
/** A basis of the kernel of M, exactly. */
export function kernelQ(M: readonly (readonly Q[])[]): Q[][] {
  const rows = M.length
  const cols = rows > 0 ? M[0].length : 0
  const A = M.map((row) => [...row])
  const pivotOf: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = -1
    for (let i = r; i < rows; i++) if (!qIsZero(A[i][c])) { piv = i; break }
    if (piv < 0) continue
    ;[A[r], A[piv]] = [A[piv], A[r]]
    const lead = A[r][c]
    for (let j = 0; j < cols; j++) A[r][j] = qDiv(A[r][j], lead)
    for (let i = 0; i < rows; i++) {
      if (i === r || qIsZero(A[i][c])) continue
      const f = A[i][c]
      for (let j = 0; j < cols; j++) A[i][j] = qSub(A[i][j], qMul(f, A[r][j]))
    }
    pivotOf.push(c)
    r++
  }
  const free = Array.from({ length: cols }, (_, j) => j).filter((j) => !pivotOf.includes(j))
  return free.map((f) => {
    const v: Q[] = Array.from({ length: cols }, () => Q0)
    v[f] = Q1
    pivotOf.forEach((c, i) => { v[c] = qNeg(A[i][f]) })
    return v
  })
}
/** Solve M x = b exactly, taking the first solution when the system is underdetermined. */
export function solveQ(M: readonly (readonly Q[])[], b: readonly Q[]): Q[] | null {
  const rows = M.length
  const cols = rows > 0 ? M[0].length : 0
  const A = M.map((row, i) => [...row, b[i]])
  const pivotOf: number[] = []
  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = -1
    for (let i = r; i < rows; i++) if (!qIsZero(A[i][c])) { piv = i; break }
    if (piv < 0) continue
    ;[A[r], A[piv]] = [A[piv], A[r]]
    const lead = A[r][c]
    for (let j = 0; j <= cols; j++) A[r][j] = qDiv(A[r][j], lead)
    for (let i = 0; i < rows; i++) {
      if (i === r || qIsZero(A[i][c])) continue
      const f = A[i][c]
      for (let j = 0; j <= cols; j++) A[i][j] = qSub(A[i][j], qMul(f, A[r][j]))
    }
    pivotOf.push(c)
    r++
  }
  for (let i = r; i < rows; i++) if (!qIsZero(A[i][cols])) return null      // inconsistent
  const x: Q[] = Array.from({ length: cols }, () => Q0)
  pivotOf.forEach((c, i) => { x[c] = A[i][cols] })
  return x
}

// ---------------------------------------------------------------------------
// AN EXACT RATIONAL PH SPACE CURVE, and its lift
// ---------------------------------------------------------------------------

export interface ExactSource {
  /** w in the power basis. */
  readonly w: QPoly
  /** q = the numerator, per coordinate, power basis. */
  readonly q: QPoly[]
  /** ρ = |𝒜|², with ‖q′w − qw′‖ = ρ exactly. */
  readonly rho: QPoly
  /** The spinor it came from, so the construction can be checked rather than trusted. */
  readonly spinor: QQuat[]
}

const Σ = (roots: readonly Q[], k: number): Q =>
  roots.reduce((s, rl, l) => (l === k ? s : qAdd(s, qDiv(Q1, qSub(roots[k], rl)))), Q0)

/**
 * The no-log conditions as an exact matrix: 4m rows, 4(n+1) columns.
 * 𝒜′(rₖ) = 𝒜(rₖ)·(Σₖ + λₖ i), which is LINEAR in 𝒜 once the λ's are fixed (F17).
 */
export function conditionMatrixQ(roots: readonly Q[], lambdas: readonly Q[], n: number): Q[][] {
  const rows: Q[][] = []
  const units: QQuat[] = [
    [Q1, Q0, Q0, Q0], [Q0, Q1, Q0, Q0], [Q0, Q0, Q1, Q0], [Q0, Q0, Q0, Q1],
  ]
  for (let k = 0; k < roots.length; k++) {
    const r = roots[k]
    const rhs: QQuat = [Σ(roots, k), lambdas[k], Q0, Q0]
    const block: Q[][] = [[], [], [], []]
    for (let j = 0; j <= n; j++) {
      // powers of r
      let rPow = Q1
      for (let i = 0; i < j; i++) rPow = qMul(rPow, r)
      let rPowM1 = Q1
      for (let i = 0; i < j - 1; i++) rPowM1 = qMul(rPowM1, r)
      for (const e of units) {
        const dTerm: QQuat = j === 0
          ? [Q0, Q0, Q0, Q0]
          : (e.map((v) => qMul(v, qMul(q(j), rPowM1))) as unknown as QQuat)
        const prod = qqMul(e, rhs)
        const col: QQuat = [0, 1, 2, 3].map((c) =>
          qSub(dTerm[c], qMul(prod[c], rPow))) as unknown as QQuat
        for (let c = 0; c < 4; c++) block[c].push(col[c])
      }
    }
    rows.push(...block)
  }
  return rows
}

/**
 * Build an exact member: choose the roots and twists, take a rational point of the admissible
 * spinor space, and back-substitute. PH is a substitution throughout — nothing is solved for it.
 */
export function exactMember(
  roots: readonly Q[], lambdas: readonly Q[], n: number, pick: readonly number[],
): ExactSource {
  const basis = kernelQ(conditionMatrixQ(roots, lambdas, n))
  if (basis.length === 0) throw new Error('exactRank: no admissible spinor')
  const x: Q[] = Array.from({ length: 4 * (n + 1) }, () => Q0)
  basis.forEach((b, i) => {
    const c = q(pick[i % pick.length] ?? 1)
    for (let j = 0; j < x.length; j++) x[j] = qAdd(x[j], qMul(c, b[j]))
  })
  const A: QQuat[] = Array.from({ length: n + 1 }, (_, j) =>
    [x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]] as unknown as QQuat)

  // N = 𝒜i𝒜̄ and σ = |𝒜|², both exact
  const deg = 2 * n
  const N: QPoly[] = [0, 1, 2].map(() => Array.from({ length: deg + 1 }, () => Q0))
  const sigma: QPoly = Array.from({ length: deg + 1 }, () => Q0)
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const v = qqMul(qqMul(A[i], [Q0, Q1, Q0, Q0]), qqConj(A[j]))
      N[0][i + j] = qAdd(N[0][i + j], v[1])
      N[1][i + j] = qAdd(N[1][i + j], v[2])
      N[2][i + j] = qAdd(N[2][i + j], v[3])
      sigma[i + j] = qAdd(sigma[i + j], qqMul(A[i], qqConj(A[j]))[0])
    }
  }
  // w from the roots, and p from p′w − pw′ = N with p(0) = 0 fixing the translation
  const w: QPoly = roots.reduce<QPoly>((acc, r) => pMul(acc, [qNeg(r), Q1]), [Q1])
  const wD = pDeriv(w)
  const m = roots.length
  const degP = Math.max(deg - m + 1, m)
  const rows: Q[][] = []
  for (let e = 0; e <= deg; e++) {
    const row: Q[] = Array.from({ length: degP + 1 }, () => Q0)
    for (let k = 0; k <= degP; k++) {
      let acc = Q0
      for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc = qAdd(acc, qMul(q(k), w[a]))
      for (let a = 0; a < wD.length; a++) if (k + a === e) acc = qSub(acc, wD[a])
      row[k] = acc
    }
    rows.push(row)
  }
  const pin: Q[] = Array.from({ length: degP + 1 }, (_, k) => (k === 0 ? Q1 : Q0))
  const p: QPoly[] = []
  for (let c = 0; c < 3; c++) {
    const sol = solveQ([...rows, pin], [...N[c], Q0])
    if (!sol) throw new Error('exactRank: the Wronskian system is inconsistent')
    p.push(sol)
  }
  return { w, q: p, rho: sigma, spinor: A }
}

/** ‖q′w − qw′‖² − ρ², which must be identically zero. Returns the coefficients. */
export function phDefectQ(s: ExactSource): QPoly {
  const wD = pDeriv(s.w)
  const N = s.q.map((qi) => pSub(pMul(pDeriv(qi), s.w), pMul(qi, wD)))
  return pSub(N.reduce<QPoly>((acc, c) => pAdd(acc, pMul(c, c)), [Q0]), pMul(s.rho, s.rho))
}

export interface ExactMember {
  /** C in the Bernstein basis of degree n: n+1 five-vectors. */
  readonly C: Q[][]
  /** h in the Bernstein basis of degree n−1. */
  readonly h: Q[]
  readonly degree: number
}

/** The uniform lift C = (2w², 2wq, ‖q‖²), h = 2ρ — exact, in the Bernstein basis. */
export function liftExact(s: ExactSource): ExactMember {
  const two = q(2)
  const W = pMul([two], pMul(s.w, s.w))
  const Q_ = s.q.map((qi) => pMul([two], pMul(s.w, qi)))
  const CINF = s.q.reduce<QPoly>((acc, c) => pAdd(acc, pMul(c, c)), [Q0])
  const trueDeg = (p: QPoly): number => { let d = p.length - 1; while (d > 0 && qIsZero(p[d])) d--; return d }
  const n = Math.max(trueDeg(W), ...Q_.map(trueDeg), trueDeg(CINF))
  const cols = [W, ...Q_, CINF].map((p) => toBernsteinQ(p, n))
  return {
    C: Array.from({ length: n + 1 }, (_, k) => cols.map((c) => c[k])),
    h: toBernsteinQ(pMul([two], s.rho), n - 1),
    degree: n,
  }
}

/** ⟨A,B⟩ = a·b − (a₀b₄ + a₄b₀), exactly. */
const metricQ = (v: readonly Q[]): Q[] => [qNeg(v[4]), v[1], v[2], v[3], qNeg(v[0])]

/** The defining Jacobian, exactly — the same formula as conformalPHCurve.definingJacobian. */
export function definingJacobianQ(s: ExactMember): Q[][] {
  const n = s.degree
  const NC = 5 * (n + 1)
  const cols = 5 * (n + 1) + n
  const D: Q[][] = Array.from({ length: n }, (_, k) =>
    s.C[k + 1].map((v, i) => qMul(q(n), qSub(v, s.C[k][i]))))
  const EN = 2 * n + 1
  const J: Q[][] = Array.from({ length: EN + 2 * n - 1 }, () =>
    Array.from({ length: cols }, () => Q0))
  for (let m = 0; m < EN; m++) {
    for (let i = 0; i <= n; i++) {
      const k = m - i
      if (k < 0 || k > n) continue
      const coef = qDiv(qMul(q(2), qMul(binomQ(n, i), binomQ(n, k))), binomQ(2 * n, m))
      const g = metricQ(s.C[k])
      for (let c = 0; c < 5; c++) J[m][5 * i + c] = qAdd(J[m][5 * i + c], qMul(coef, g[c]))
    }
  }
  for (let m = 0; m <= 2 * n - 2; m++) {
    const row = EN + m
    for (let i = 0; i <= n; i++) {
      for (const [jj, sign] of [[i - 1, 1], [i, -1]] as const) {
        if (jj < 0 || jj > n - 1) continue
        const k = m - jj
        if (k < 0 || k > n - 1) continue
        const v = qDiv(qMul(binomQ(n - 1, jj), binomQ(n - 1, k)), binomQ(2 * n - 2, m))
        const g = metricQ(D[k])
        for (let c = 0; c < 5; c++) {
          J[row][5 * i + c] = qAdd(J[row][5 * i + c], qMul(qMul(q(2 * n * sign), v), g[c]))
        }
      }
    }
    for (let i = 0; i <= n - 1; i++) {
      const k = m - i
      if (k < 0 || k > n - 1) continue
      const v = qDiv(qMul(binomQ(n - 1, i), binomQ(n - 1, k)), binomQ(2 * n - 2, m))
      J[row][NC + i] = qSub(J[row][NC + i], qMul(qMul(q(2), v), s.h[k]))
    }
  }
  return J
}

/** ⟨C,C⟩ and ⟨C′,C′⟩ − h² as exact Bernstein coefficients — both must be identically zero. */
export function definingResidualQ(s: ExactMember): Q[] {
  const n = s.degree
  const out: Q[] = []
  for (let m = 0; m <= 2 * n; m++) {
    let acc = Q0
    for (let i = 0; i <= n; i++) {
      const k = m - i
      if (k < 0 || k > n) continue
      const coef = qDiv(qMul(binomQ(n, i), binomQ(n, k)), binomQ(2 * n, m))
      const g = metricQ(s.C[k])
      const ip = s.C[i].reduce((a, v, c) => qAdd(a, qMul(v, g[c])), Q0)
      acc = qAdd(acc, qMul(coef, ip))
    }
    out.push(acc)
  }
  const D: Q[][] = Array.from({ length: n }, (_, k) =>
    s.C[k + 1].map((v, i) => qMul(q(n), qSub(v, s.C[k][i]))))
  for (let m = 0; m <= 2 * n - 2; m++) {
    let acc = Q0
    for (let i = 0; i <= n - 1; i++) {
      const k = m - i
      if (k < 0 || k > n - 1) continue
      const coef = qDiv(qMul(binomQ(n - 1, i), binomQ(n - 1, k)), binomQ(2 * n - 2, m))
      const g = metricQ(D[k])
      const ip = D[i].reduce((a, v, c) => qAdd(a, qMul(v, g[c])), Q0)
      acc = qAdd(acc, qMul(coef, qSub(ip, qMul(s.h[i], s.h[k]))))
    }
    out.push(acc)
  }
  return out
}
