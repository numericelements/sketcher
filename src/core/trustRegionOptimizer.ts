// ============================================================================
// THE TRUST-REGION BARRIER OPTIMIZER — a faithful port of Eric's closed-curve
// solver (../../numericelements/git/closed-curve: optimizers/Optimizer.ts +
// optimizers/TrustRegionSubproblem.ts + their linear algebra), selected by
// MEASUREMENT, not sentiment (lab notebook E7/E15): on core's own drag problems
// it tracks 95/91/80% at n=8/16/32 where core's IP solvers reach 46/17/6, and
// Eric's full stack tracks 100% at every size — there is no feasible wall.
//
// Design (all his): log-barrier path following (t·f0 − Σlog(−fᵢ)) with the
// Conn–Gould–Toint 7.3.4 NEAR-EXACT trust-region subproblem (λ-iteration on
// H+λI — sound for indefinite/near-singular Hessians where a dogleg's Newton
// point is garbage), ρ measured for the step actually taken, and the
// shrink-until-strictly-feasible inner loop: no iterate ever violates a
// constraint, so no outer pull-back is ever needed for the surrogate.
//
// Port rules: algorithms and constants are IDENTICAL to the original (t₀ =
// m/f0, Δ₀ = 0.1, η = 0.1, μ = 10, ×0.25 shrink, CGT k_easy/k_hard 0.1/0.2).
// Changes: TS strictness, no console logging, errors preserved as throws.
// Acceptance: trustRegionParity.test.ts reproduces the E15c column.
// ============================================================================

// ---------------------------------------------------------------------------
// Vector helpers (port of MathVectorBasicOperations — only what's used).
// ---------------------------------------------------------------------------
const zeroVector = (n: number): number[] => new Array<number>(n).fill(0)
const dotProduct = (a: number[], b: number[]): number => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}
const multiplyVectorByScalar = (v: number[], s: number): number[] => v.map((x) => x * s)
const divideVectorByScalar = (v: number[], s: number): number[] => v.map((x) => x / s)
const squaredNorm = (v: number[]): number => dotProduct(v, v)
const norm = (v: number[]): number => Math.sqrt(squaredNorm(v))
const norm1 = (v: number[]): number => v.reduce((s, x) => s + Math.abs(x), 0)
const containsNaN = (v: number[]): boolean => v.some((x) => Number.isNaN(x))
const isZeroVector = (v: number[]): boolean => v.every((x) => x === 0)
const signOf = (x: number): number => (x === 0 ? 0 : x < 0 ? -1 : 1)
/** y ← y + a·x (in place). */
const saxpy = (a: number, x: number[], y: number[]): void => {
  for (let i = 0; i < x.length; i++) y[i] += a * x[i]
}
/** returns a·x + y (new vector). */
const saxpy2 = (a: number, x: number[], y: number[]): number[] => {
  const out = new Array<number>(x.length)
  for (let i = 0; i < x.length; i++) out[i] = a * x[i] + y[i]
  return out
}

// ---------------------------------------------------------------------------
// Minimal dense containers (ports of SquareMatrix / SymmetricMatrix).
// ---------------------------------------------------------------------------
export interface TRMatrix {
  readonly shape: readonly number[]
  get(row: number, column: number): number
}

class TRSquareMatrix implements TRMatrix {
  readonly shape: readonly number[]
  private data: number[]
  constructor(size: number) {
    this.shape = [size, size]
    this.data = new Array<number>(size * size).fill(0)
  }
  private idx(r: number, c: number): number { return r * this.shape[1] + c }
  get(r: number, c: number): number { return this.data[this.idx(r, c)] }
  set(r: number, c: number, v: number): void { this.data[this.idx(r, c)] = v }
  divideAt(r: number, c: number, d: number): void { this.data[this.idx(r, c)] /= d }
  substractAt(r: number, c: number, s: number): void { this.data[this.idx(r, c)] -= s }
}

/** Symmetric matrix in packed upper-triangular row-wise storage (his layout). */
export class TRSymmetricMatrix implements TRMatrix {
  readonly shape: readonly number[]
  private data: number[]
  constructor(size: number, data?: number[]) {
    this.shape = [size, size]
    if (data) {
      if (data.length !== (size * (size + 1)) / 2) throw new Error('TRSymmetricMatrix: bad packed data length')
      this.data = data.slice()
    } else {
      this.data = new Array<number>((size * (size + 1)) / 2).fill(0)
    }
  }
  private idx(row: number, column: number): number {
    if (row <= column) return row * this.shape[1] - ((row - 1) * row) / 2 + column - row
    return column * this.shape[0] - ((column - 1) * column) / 2 + row - column
  }
  get(r: number, c: number): number { return this.data[this.idx(r, c)] }
  set(r: number, c: number, v: number): void { this.data[this.idx(r, c)] = v }
  addAt(r: number, c: number, v: number): void { this.data[this.idx(r, c)] += v }
  clone(): TRSymmetricMatrix { return new TRSymmetricMatrix(this.shape[0], this.data) }
  containsNaN(): boolean { return containsNaN(this.data) }
  quadraticForm(v: number[]): number {
    let result = 0
    for (let i = 1; i < this.shape[1]; i++) for (let j = 0; j < i; j++) result += this.get(i, j) * v[i] * v[j]
    result *= 2
    for (let i = 0; i < this.shape[1]; i++) result += this.get(i, i) * v[i] * v[i]
    return result
  }
  addValueOnDiagonalInPlace(value: number): void {
    for (let i = 0; i < this.shape[0]; i++) this.data[this.idx(i, i)] += value
  }
  addValueOnDiagonal(value: number): TRSymmetricMatrix {
    const out = this.clone()
    out.addValueOnDiagonalInPlace(value)
    return out
  }
  squareMatrix(): TRSquareMatrix {
    const n = this.shape[0]
    const out = new TRSquareMatrix(n)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.set(i, j, this.get(i, j))
    return out
  }
  /** this + value · M (M symmetric, read through get). */
  plusSymmetricMatrixMultipliedByValue(matrix: TRMatrix, value: number): TRSymmetricMatrix {
    if (this.shape[0] !== matrix.shape[0]) throw new Error('TRSymmetricMatrix: shape mismatch')
    const out = this.clone()
    const n = out.shape[0]
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) out.addAt(i, j, matrix.get(i, j) * value)
    return out
  }
}

/** Diagonal symmetric matrix (for the objective Hessian of a least-squares drag). */
export class TRDiagonalMatrix implements TRMatrix {
  readonly shape: readonly number[]
  private diag: number[]
  constructor(diag: number[]) {
    this.diag = diag
    this.shape = [diag.length, diag.length]
  }
  get(r: number, c: number): number { return r === c ? this.diag[r] : 0 }
}

// ---------------------------------------------------------------------------
// Cholesky (port; the CLOSE_TO_ZERO pivot gate is part of the CGT algorithm —
// firstNonPositiveDefiniteLeadingSubmatrixSize feeds step 3c).
// ---------------------------------------------------------------------------
class TRCholesky {
  g: TRSquareMatrix
  success = false
  readonly CLOSE_TO_ZERO = 10e-8
  firstNonPositiveDefiniteLeadingSubmatrixSize = -1
  constructor(matrix: TRSymmetricMatrix) {
    this.g = matrix.squareMatrix()
    const n = this.g.shape[0]
    if (this.g.get(0, 0) < this.CLOSE_TO_ZERO) return
    let sqrtGjj = Math.sqrt(this.g.get(0, 0))
    for (let i = 0; i < n; i++) this.g.divideAt(i, 0, sqrtGjj)
    for (let j = 1; j < n; j++) {
      for (let i = j; i < n; i++) {
        let sum = 0
        for (let k = 0; k < j; k++) sum += this.g.get(i, k) * this.g.get(j, k)
        this.g.substractAt(i, j, sum)
      }
      if (this.g.get(j, j) < this.CLOSE_TO_ZERO) {
        this.firstNonPositiveDefiniteLeadingSubmatrixSize = j + 1
        return
      }
      sqrtGjj = Math.sqrt(this.g.get(j, j))
      for (let i = j; i < n; i++) this.g.divideAt(i, j, sqrtGjj)
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < j; i++) this.g.set(i, j, 0)
    this.success = true
  }
  solve(b: number[]): number[] {
    if (!this.success) throw new Error('TRCholesky.success === false')
    const n = this.g.shape[0]
    const x = b.slice()
    for (let i = 0; i < n; i++) {
      let sum = b[i]
      for (let k = i - 1; k >= 0; k--) sum -= this.g.get(i, k) * x[k]
      x[i] = sum / this.g.get(i, i)
    }
    for (let i = n - 1; i >= 0; i--) {
      let sum = x[i]
      for (let k = i + 1; k < n; k++) sum -= this.g.get(k, i) * x[k]
      x[i] = sum / this.g.get(i, i)
    }
    return x
  }
}

// ---------------------------------------------------------------------------
// The Conn–Gould–Toint near-exact trust-region subproblem (Algorithm 7.3.4;
// faithful port, structure and constants preserved).
// ---------------------------------------------------------------------------
const LambdaRange = { N: 0, L: 1, G: 2, F: 3 } as const
type LambdaRange = (typeof LambdaRange)[keyof typeof LambdaRange]

export class TrustRegionSubproblem {
  numberOfIterations = 0
  lambda = { current: 0, lowerBound: 0, upperBound: 0 }
  private cauchyPoint: number[]
  private hitsBoundary = true
  private step: number[] = []
  private stepSquaredNorm = 0
  private stepNorm = 0
  private range: LambdaRange = LambdaRange.F
  private lambdaPlus = 0
  private gNorm: number
  private hardCase = false

  private gradient: number[]
  private hessian: TRSymmetricMatrix
  private k_easy: number
  private k_hard: number

  constructor(gradient: number[], hessian: TRSymmetricMatrix, k_easy: number = 0.1, k_hard: number = 0.2) {
    this.gradient = gradient
    this.hessian = hessian
    this.k_easy = k_easy
    this.k_hard = k_hard
    this.gNorm = norm(this.gradient)
    if (containsNaN(gradient)) throw new Error('TrustRegionSubproblem: gradient contains NaN')
    if (hessian.containsNaN()) throw new Error('TrustRegionSubproblem: hessian contains NaN')
    this.cauchyPoint = zeroVector(this.gradient.length)
  }

  solve(trustRegionRadius: number): { step: number[]; hitsBoundary: boolean; hardCase: boolean } {
    this.cauchyPoint = this.computeCauchyPoint(trustRegionRadius)
    this.lambda = this.initialLambdas(trustRegionRadius)
    this.numberOfIterations = 0
    const maxNumberOfIterations = 300
    for (;;) {
      this.numberOfIterations += 1
      let hessianPlusLambda = this.hessian.addValueOnDiagonal(this.lambda.current)
      let cholesky = new TRCholesky(hessianPlusLambda)
      // exact lambda found but the hessian is indefinite: nudge lambda by EPSILON
      if (this.lambda.upperBound === this.lambda.lowerBound && !cholesky.success) {
        const EPSILON = 10e-6
        this.lambda.upperBound += EPSILON
        this.lambda.current += EPSILON
        hessianPlusLambda = this.hessian.addValueOnDiagonal(this.lambda.current)
        cholesky = new TRCholesky(hessianPlusLambda)
        this.range = LambdaRange.G
      }
      this.update_step_and_range(trustRegionRadius, cholesky)
      if (this.interiorConvergence()) break
      this.update_lower_and_upper_bounds()
      this.update_lambda_lambdaPlus_lowerBound_and_step(trustRegionRadius, hessianPlusLambda, cholesky)
      if (this.check_for_termination_and_update_step(trustRegionRadius, hessianPlusLambda, cholesky)) break
      this.update_lambda()
      if (this.numberOfIterations > maxNumberOfIterations) {
        throw new Error('TrustRegionSubproblem: maximum number of iterations exceeded')
      }
    }
    return { step: this.step, hitsBoundary: this.hitsBoundary, hardCase: this.hardCase }
  }

  private interiorConvergence(): boolean {
    if (this.lambda.current === 0 && this.range === LambdaRange.G) {
      this.hitsBoundary = false
      return true
    }
    return false
  }

  private update_step_and_range(trustRegionRadius: number, cholesky: TRCholesky): void {
    if (cholesky.success) {
      this.step = cholesky.solve(multiplyVectorByScalar(this.gradient, -1))
      this.stepSquaredNorm = squaredNorm(this.step)
      this.stepNorm = Math.sqrt(this.stepSquaredNorm)
      this.range = this.stepNorm < trustRegionRadius ? LambdaRange.G : LambdaRange.L
    } else {
      this.range = LambdaRange.N
    }
  }

  private update_lower_and_upper_bounds(): void {
    if (this.range === LambdaRange.G) this.lambda.upperBound = this.lambda.current
    else this.lambda.lowerBound = this.lambda.current
  }

  private update_lambda_lambdaPlus_lowerBound_and_step(
    trustRegionRadius: number,
    hessianPlusLambda: TRSymmetricMatrix,
    cholesky: TRCholesky,
  ): void {
    if (this.range === LambdaRange.L || this.range === LambdaRange.G) {
      const w = solveLowerTriangular(cholesky.g, this.step)
      const wSquaredNorm = squaredNorm(w)
      this.lambdaPlus = this.lambda.current + (this.stepNorm / trustRegionRadius - 1) * (this.stepSquaredNorm / wSquaredNorm)
      if (this.range === LambdaRange.G) {
        const s_min = estimateSmallestSingularValue(cholesky.g)
        this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambda.current - s_min.value * s_min.value)
        const intersection = getBoundariesIntersections(this.step, s_min.vector, trustRegionRadius)
        const t = Math.abs(intersection.tmin) < Math.abs(intersection.tmax) ? intersection.tmin : intersection.tmax
        saxpy(t, s_min.vector, this.step)
        this.stepSquaredNorm = squaredNorm(this.step)
        this.stepNorm = Math.sqrt(this.stepSquaredNorm)
      }
    } else {
      const sls = singularLeadingSubmatrix(hessianPlusLambda, cholesky.g, cholesky.firstNonPositiveDefiniteLeadingSubmatrixSize)
      const vSquaredNorm = squaredNorm(sls.vector)
      this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambda.current + sls.delta / vSquaredNorm)
    }
  }

  private check_for_termination_and_update_step(
    trustRegionRadius: number,
    hessianPlusLambda: TRSymmetricMatrix,
    cholesky: TRCholesky,
  ): boolean {
    let terminate = false
    if (
      (this.range === LambdaRange.L || this.range === LambdaRange.G) &&
      Math.abs(this.stepNorm - trustRegionRadius) <= this.k_easy * trustRegionRadius
    ) {
      // must be at least as good as the Cauchy point
      const evalResult = dotProduct(this.gradient, this.step) + 0.5 * this.hessian.quadraticForm(this.step)
      const evalCauchy = dotProduct(this.gradient, this.cauchyPoint) + 0.5 * this.hessian.quadraticForm(this.cauchyPoint)
      if (evalResult > evalCauchy) return false
      this.hitsBoundary = true
      terminate = true
    }
    if (this.range === LambdaRange.G) {
      if (this.lambda.current === 0) {
        this.hitsBoundary = false
        return true
      }
      const s_min = estimateSmallestSingularValue(cholesky.g)
      const intersection = getBoundariesIntersections(this.step, s_min.vector, trustRegionRadius)
      const t_abs_max = Math.abs(intersection.tmin) > Math.abs(intersection.tmax) ? intersection.tmin : intersection.tmax
      const quadraticTerm = hessianPlusLambda.quadraticForm(this.step)
      const relative_error = (t_abs_max * s_min.value) ** 2 / (quadraticTerm + this.lambda.current * trustRegionRadius * trustRegionRadius)
      if (relative_error <= this.k_hard) {
        this.hitsBoundary = true
        this.hardCase = true
        terminate = true
      }
    }
    return terminate
  }

  private update_lambda(): void {
    if (this.range === LambdaRange.L && this.gNorm !== 0) {
      this.lambda.current = this.lambdaPlus
    } else if (this.range === LambdaRange.G) {
      const hessianPlusLambda = this.hessian.clone()
      hessianPlusLambda.addValueOnDiagonalInPlace(this.lambdaPlus)
      const cholesky = new TRCholesky(hessianPlusLambda)
      if (cholesky.success) {
        this.lambda.current = this.lambdaPlus
      } else {
        this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambdaPlus)
        this.lambda.current = updateLambda_7_3_14(this.lambda.lowerBound, this.lambda.upperBound)
      }
    } else {
      this.lambda.current = updateLambda_7_3_14(this.lambda.lowerBound, this.lambda.upperBound)
    }
  }

  private computeCauchyPoint(trustRegionRadius: number): number[] {
    const gHg = this.hessian.quadraticForm(this.gradient)
    const gNorm = norm(this.gradient)
    if (gNorm === 0) return zeroVector(this.gradient.length)
    const result = multiplyVectorByScalar(this.gradient, -trustRegionRadius / gNorm)
    if (gHg <= 0) return result
    const tau = gNorm ** 3 / trustRegionRadius / gHg
    if (tau < 1) return multiplyVectorByScalar(result, tau)
    return result
  }

  private initialLambdas(trustRegionRadius: number): { current: number; lowerBound: number; upperBound: number } {
    const gershgorin = gershgorinBounds(this.hessian)
    const fro = frobeniusNorm(this.hessian)
    let infNorm = 0
    let minDiag = this.hessian.get(0, 0)
    for (let i = 0; i < this.hessian.shape[0]; i++) {
      let rowSum = 0
      for (let j = 0; j < this.hessian.shape[0]; j++) rowSum += Math.abs(this.hessian.get(i, j))
      infNorm = Math.max(infNorm, rowSum)
      minDiag = Math.min(minDiag, this.hessian.get(i, i))
    }
    const lowerBound = Math.max(0, Math.max(-minDiag, norm(this.gradient) / trustRegionRadius - Math.min(gershgorin.upperBound, Math.min(fro, infNorm))))
    const upperBound = Math.max(0, norm(this.gradient) / trustRegionRadius + Math.min(-gershgorin.lowerBound, Math.min(fro, infNorm)))
    const current = lowerBound === 0 ? 0 : updateLambda_7_3_14(lowerBound, upperBound)
    return { current, lowerBound, upperBound }
  }
}

function singularLeadingSubmatrix(A: TRSymmetricMatrix, L: TRSquareMatrix, k: number): { delta: number; vector: number[] } {
  if (k < 0) throw new Error('singularLeadingSubmatrix: k should not be negative')
  let delta = 0
  const l = new TRSquareMatrix(k)
  const u = zeroVector(k)
  for (let j = 0; j < k - 1; j++) delta += L.get(k - 1, j) ** 2
  delta -= A.get(k - 1, k - 1)
  for (let i = 0; i < k - 1; i++) {
    for (let j = 0; j <= i; j++) l.set(i, j, L.get(i, j))
    u[i] = L.get(k - 1, i)
  }
  const v = zeroVector(A.shape[0])
  v[k - 1] = 1
  if (k !== 1) {
    const vtemp = solveLowerTriangular(l, u)
    for (let i = 0; i < k - 1; i++) v[i] = vtemp[i]
  }
  return { delta, vector: v }
}

function estimateSmallestSingularValue(lowerTriangular: TRSquareMatrix): { value: number; vector: number[] } {
  const n = lowerTriangular.shape[0]
  const p = zeroVector(n)
  const y = zeroVector(n)
  const p_plus: number[] = []
  const p_minus: number[] = []
  for (let k = 0; k < n; k++) {
    const y_plus = (1 - p[k]) / lowerTriangular.get(k, k)
    const y_minus = (-1 - p[k]) / lowerTriangular.get(k, k)
    p_plus.length = 0
    p_minus.length = 0
    for (let i = k + 1; i < n; i++) {
      p_plus.push(p[i] + lowerTriangular.get(i, k) * y_plus)
      p_minus.push(p[i] + lowerTriangular.get(i, k) * y_minus)
    }
    if (Math.abs(y_plus) + norm1(p_plus) >= Math.abs(y_minus) + norm1(p_minus)) {
      y[k] = y_plus
      for (let i = k + 1; i < n; i++) p[i] = p_plus[i - k - 1]
    } else {
      y[k] = y_minus
      for (let i = k + 1; i < n; i++) p[i] = p_minus[i - k - 1]
    }
  }
  const v = solveUpperTriangular(lowerTriangular, y)
  const vNorm = norm(v)
  const yNorm = norm(y)
  if (vNorm === 0) throw new Error('estimateSmallestSingularValue: division by zero')
  return { value: yNorm / vNorm, vector: divideVectorByScalar(v, vNorm) }
}

function solveUpperTriangular(lowerTriangular: TRSquareMatrix, y: number[]): number[] {
  const x = y.slice()
  const n = lowerTriangular.shape[0]
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i]
    for (let k = i + 1; k < n; k++) sum -= lowerTriangular.get(k, i) * x[k]
    x[i] = sum / lowerTriangular.get(i, i)
  }
  return x
}

function solveLowerTriangular(lowerTriangular: TRSquareMatrix, b: number[]): number[] {
  if (lowerTriangular.shape[0] !== b.length) throw new Error('solveLowerTriangular: size mismatch')
  const x = b.slice()
  const n = lowerTriangular.shape[0]
  for (let i = 0; i < n; i++) {
    let sum = b[i]
    for (let k = i - 1; k >= 0; k--) sum -= lowerTriangular.get(i, k) * x[k]
    x[i] = sum / lowerTriangular.get(i, i)
  }
  return x
}

function frobeniusNorm(matrix: TRMatrix): number {
  let result = 0
  for (let i = 0; i < matrix.shape[0]; i++) for (let j = 0; j < matrix.shape[1]; j++) result += matrix.get(i, j) ** 2
  return Math.sqrt(result)
}

function gershgorinBounds(matrix: TRSymmetricMatrix): { lowerBound: number; upperBound: number } {
  const m = matrix.shape[0]
  const lb: number[] = []
  const ub: number[] = []
  for (let i = 0; i < m; i++) {
    let rowSum = 0
    for (let j = 0; j < matrix.shape[1]; j++) rowSum += Math.abs(matrix.get(i, j))
    const diag = matrix.get(i, i)
    const absDiag = Math.abs(diag)
    lb.push(diag + absDiag - rowSum)
    ub.push(diag - absDiag + rowSum)
  }
  return { lowerBound: Math.min(...lb), upperBound: Math.max(...ub) }
}

export function getBoundariesIntersections(z: number[], d: number[], trustRegionRadius: number): { tmin: number; tmax: number } {
  if (isZeroVector(d)) throw new Error('getBoundariesIntersections: d cannot be the zero vector')
  const a = squaredNorm(d)
  const b = 2 * dotProduct(z, d)
  const c = squaredNorm(z) - trustRegionRadius * trustRegionRadius
  const sqrtDiscriminant = Math.sqrt(b * b - 4 * a * c)
  let sign_b = signOf(b)
  if (sign_b === 0) sign_b = 1
  const aux = b + sqrtDiscriminant * sign_b
  const ta = -aux / (2 * a)
  const tb = (-2 * c) / aux
  return { tmin: Math.min(ta, tb), tmax: Math.max(ta, tb) }
}

function updateLambda_7_3_14(lowerBound: number, upperBound: number, theta: number = 0.01): number {
  return Math.max(Math.sqrt(upperBound * lowerBound), lowerBound + theta * (upperBound - lowerBound))
}

// ---------------------------------------------------------------------------
// The optimizer (port of Optimizer.optimize_using_trust_region + barrier).
// ---------------------------------------------------------------------------

/** The problem contract this optimizer drives (his IOptimizationProblem, f_i ≤ 0 feasible). */
export interface TrustRegionProblem {
  numberOfIndependentVariables: number
  f0: number
  gradient_f0: number[]
  hessian_f0: TRMatrix
  numberOfConstraints: number
  /** Inequality constraint values, f_i < 0 strictly feasible. */
  f: number[]
  /** Constraint gradients, shape [numberOfConstraints, numberOfIndependentVariables]. */
  gradient_f: TRMatrix
  hessian_f?: TRSymmetricMatrix[]
  /** Commit a step (update all instance properties). */
  step(deltaX: number[]): void
  /** f at x + step, without committing. */
  fStep(deltaX: number[]): number[]
  /** f0 at x + step, without committing. */
  f0Step(deltaX: number[]): number
}

export class TrustRegionBarrierOptimizer {
  success = false
  private o: TrustRegionProblem

  constructor(o: TrustRegionProblem) {
    this.o = o
  }

  optimize(epsilon: number = 10e-8, maxTrustRadius = 10, maxNumSteps: number = 800): void {
    this.success = false
    // Nocedal & Wright p. 69 (trust region); Boyd & Vandenberghe p. 569 (barrier path).
    let numSteps = 0
    let t = this.o.numberOfConstraints / this.o.f0
    let trustRadius = 0.1
    const eta = 0.1 // [0, 1/4)
    const mu = 10
    while (10 / t > epsilon) {
      for (;;) {
        numSteps += 1
        const b = this.barrier(this.o.f, this.o.gradient_f, this.o.hessian_f)
        const gradient = saxpy2(t, this.o.gradient_f0, b.gradient)
        const hessian = b.hessian.plusSymmetricMatrixMultipliedByValue(this.o.hessian_f0, t)
        const trustRegionSubproblem = new TrustRegionSubproblem(gradient, hessian)
        let tr = trustRegionSubproblem.solve(trustRadius)
        let fStep = this.o.fStep(tr.step)
        // THE feasibility discipline: shrink (re-solving, which REDIRECTS the dogleg-free
        // CGT step) until the candidate is strictly feasible. Budget-free by design.
        let numSteps2 = 0
        while (Math.max(...fStep) >= 0) {
          numSteps2 += 1
          trustRadius *= 0.25
          tr = trustRegionSubproblem.solve(trustRadius)
          fStep = this.o.fStep(tr.step)
          if (numSteps2 > 100) throw new Error('TrustRegionBarrierOptimizer: feasibility shrink exceeded 100 iterations')
        }
        const barrierValueStep = this.barrierValue(fStep)
        const actualReduction = t * (this.o.f0 - this.o.f0Step(tr.step)) + (b.value - barrierValueStep)
        // ρ measured against the model decrease OF THE STEP TAKEN (cf. E10's ρ-ratchet).
        const predictedReduction = -dotProduct(gradient, tr.step) - 0.5 * hessian.quadraticForm(tr.step)
        const rho = actualReduction / predictedReduction
        if (rho < 0.25) {
          trustRadius *= 0.25
        } else if (rho > 0.75 && tr.hitsBoundary) {
          trustRadius = Math.min(2 * trustRadius, maxTrustRadius)
        }
        if (rho > eta) {
          this.o.step(tr.step)
        }
        if (numSteps > maxNumSteps) return
        if (new TRCholesky(hessian).success) {
          const newtonDecrementSquared = -dotProduct(gradient, tr.step)
          if (newtonDecrementSquared < 0) throw new Error('TrustRegionBarrierOptimizer: negative Newton decrement')
          if (newtonDecrementSquared < epsilon) break
        }
        if (trustRadius < 10e-18) throw new Error('TrustRegionBarrierOptimizer: trust radius < 10e-18')
      }
      if (trustRadius > 0.001) t *= mu
      else t *= 100 * mu
    }
    this.success = true
  }

  barrierValue(f: number[]): number {
    let result = 0
    for (const fi of f) result -= Math.log(-fi)
    return result
  }

  barrierGradient(f: number[], gradient_f: TRMatrix): number[] {
    const n = f.length
    const m = gradient_f.shape[1]
    if (n !== gradient_f.shape[0]) throw new Error('barrierGradient: dimensions do not match')
    const result = zeroVector(m)
    for (let i = 0; i < n; i++) {
      if (f[i] === 0) throw new Error('barrierGradient: division by zero')
      for (let j = 0; j < m; j++) result[j] += -gradient_f.get(i, j) / f[i]
    }
    return result
  }

  barrierHessian(f: number[], gradient_f: TRMatrix, hessian_f?: TRSymmetricMatrix[]): TRSymmetricMatrix {
    // Boyd & Vandenberghe p. 564.
    const m = gradient_f.shape[0]
    const n = gradient_f.shape[1]
    const result = new TRSymmetricMatrix(n)
    for (let i = 0; i < m; i++) {
      for (let k = 0; k < n; k++) {
        for (let l = 0; l <= k; l++) {
          result.addAt(k, l, (gradient_f.get(i, k) * gradient_f.get(i, l)) / (f[i] * f[i]))
        }
      }
    }
    if (hessian_f) {
      if (hessian_f.length !== f.length) throw new Error('barrierHessian: hessian_f.length !== f.length')
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          for (let k = 0; k < f.length; k++) result.addAt(i, j, -hessian_f[k].get(i, j) / f[k])
        }
      }
    }
    return result
  }

  barrier(f: number[], gradient_f: TRMatrix, hessian_f?: TRSymmetricMatrix[]) {
    return {
      value: this.barrierValue(f),
      gradient: this.barrierGradient(f, gradient_f),
      hessian: this.barrierHessian(f, gradient_f, hessian_f),
    }
  }
}
