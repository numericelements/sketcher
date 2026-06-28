// Dense linear algebra for the optimizer's KKT solves. Systems are small
// (a few dozen unknowns for ~15 control points), so a dense LU with partial
// pivoting is both robust (handles the symmetric-indefinite KKT matrix) and
// fast enough for interactive editing.

export type Matrix = number[][]

export interface LU {
  lu: number[][]
  piv: number[]
}

/** LU factorization with partial pivoting. Returns null if (near-)singular. */
export function luFactor(A: Matrix): LU | null {
  const n = A.length
  const lu = A.map((row) => [...row])
  const piv = Array.from({ length: n }, (_, i) => i)

  for (let k = 0; k < n; k++) {
    let p = k
    let max = Math.abs(lu[k][k])
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(lu[i][k])
      if (v > max) {
        max = v
        p = i
      }
    }
    if (max < 1e-300) return null
    if (p !== k) {
      const tmp = lu[k]
      lu[k] = lu[p]
      lu[p] = tmp
      const t = piv[k]
      piv[k] = piv[p]
      piv[p] = t
    }
    const pivot = lu[k][k]
    for (let i = k + 1; i < n; i++) {
      const f = lu[i][k] / pivot
      lu[i][k] = f
      for (let j = k + 1; j < n; j++) lu[i][j] -= f * lu[k][j]
    }
  }
  return { lu, piv }
}

/** Solve A·x = b using a precomputed LU factorization. */
export function luSolve(fact: LU, b: number[]): number[] {
  const { lu, piv } = fact
  const n = lu.length
  const y = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    let s = b[piv[i]]
    for (let j = 0; j < i; j++) s -= lu[i][j] * y[j]
    y[i] = s
  }
  const x = new Array<number>(n)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let j = i + 1; j < n; j++) s -= lu[i][j] * x[j]
    x[i] = s / lu[i][i]
  }
  return x
}

/**
 * Least-squares solution of an overdetermined system A·x ≈ b (A is m×n, m ≥ n), via the
 * regularized normal equations (AᵀA + reg·I)·x = Aᵀb solved with LU. `reg` stabilizes a
 * near-singular AᵀA (matches the legacy leastSquares' Cholesky ridge). Returns x (length n).
 */
export function leastSquares(A: Matrix, b: readonly number[], reg = 1e-8): number[] {
  const m = A.length
  const n = m > 0 ? A[0].length : 0
  const AtA: Matrix = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const Atb = new Array<number>(n).fill(0)
  for (let k = 0; k < m; k++) {
    const row = A[k], bk = b[k]
    for (let i = 0; i < n; i++) {
      const aki = row[i]
      if (aki === 0) continue
      Atb[i] += aki * bk
      for (let j = 0; j < n; j++) AtA[i][j] += aki * row[j]
    }
  }
  for (let i = 0; i < n; i++) AtA[i][i] += reg
  const fact = luFactor(AtA)
  if (!fact) throw new Error('leastSquares: normal equations are singular')
  return luSolve(fact, Atb)
}
