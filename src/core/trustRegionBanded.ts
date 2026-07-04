// ============================================================================
// BANDED trust-region barrier optimizer — the O(n·b²) form of the ported
// closed-curve solver (trustRegionOptimizer.ts), for OPEN drags whose barrier
// Hessian is a narrow band in the INTERLEAVED variable order [x₀,y₀,x₁,y₁,…].
//
// Same mathematics as the dense port: CGT 7.3.4 λ-iteration, log-barrier path
// following, strict per-step feasibility, ρ for the step taken, identical
// constants. Only the linear algebra changes: banded Cholesky (with the same
// 1e-7 pivot gate and failure index the CGT algorithm consumes) replaces the
// dense factorization, and the barrier Hessian is assembled directly from each
// constraint's LOCAL support (O(active·d²)) instead of a dense outer-product
// sweep (O(active·n²)). This is the O(n) milestone for 30–50 CP interactivity.
// Closed curves (seam-crossing rows) fall back to the dense path for now.
// ============================================================================

// ---------------------------------------------------------------------------
// Band-stored symmetric matrix: low[i][p] = M(i, i−p), p = 0..min(b, i).
// ---------------------------------------------------------------------------
export class SymBandMatrix {
  readonly n: number
  readonly b: number
  low: number[][]
  constructor(n: number, b: number) {
    this.n = n
    this.b = b
    this.low = Array.from({ length: n }, (_, i) => new Array<number>(Math.min(b, i) + 1).fill(0))
  }
  get(i: number, j: number): number {
    const I = i >= j ? i : j
    const J = i >= j ? j : i
    const p = I - J
    return p > this.b ? 0 : this.low[I][p] ?? 0
  }
  add(i: number, j: number, v: number): void {
    const I = i >= j ? i : j
    const J = i >= j ? j : i
    this.low[I][I - J] += v
  }
  clone(): SymBandMatrix {
    const out = new SymBandMatrix(this.n, this.b)
    out.low = this.low.map((r) => r.slice())
    return out
  }
  addValueOnDiagonalInPlace(v: number): void {
    for (let i = 0; i < this.n; i++) this.low[i][0] += v
  }
  matVec(v: number[]): number[] {
    const out = new Array<number>(this.n).fill(0)
    for (let i = 0; i < this.n; i++) {
      const row = this.low[i]
      out[i] += row[0] * v[i]
      for (let p = 1; p < row.length; p++) {
        const j = i - p
        out[i] += row[p] * v[j]
        out[j] += row[p] * v[i]
      }
    }
    return out
  }
  quadraticForm(v: number[]): number {
    let s = 0
    for (let i = 0; i < this.n; i++) {
      const row = this.low[i]
      s += row[0] * v[i] * v[i]
      for (let p = 1; p < row.length; p++) s += 2 * row[p] * v[i] * v[i - p]
    }
    return s
  }
  containsNaN(): boolean {
    for (const row of this.low) for (const x of row) if (Number.isNaN(x)) return true
    return false
  }
}

/** Banded Cholesky with the CGT pivot gate: pivot (pre-sqrt) < 1e-7 fails at
 *  index j and records firstNonPositiveDefiniteLeadingSubmatrixSize = j+1 —
 *  the same semantics the dense port's TRCholesky provides to steps 3c/LINPACK. */
export class BandedCholesky {
  readonly n: number
  readonly b: number
  /** L stored banded: lo[i][p] = L(i, i−p); diagonal at p=0. */
  lo: number[][]
  success = false
  firstNonPositiveDefiniteLeadingSubmatrixSize = -1
  private static readonly CLOSE_TO_ZERO = 10e-8

  constructor(M: SymBandMatrix) {
    this.n = M.n
    this.b = M.b
    this.lo = M.low.map((r) => r.slice())
    const n = this.n
    const b = this.b
    for (let j = 0; j < n; j++) {
      // pivot = M(j,j) − Σ_k L(j,k)²   (k within band of j)
      let pivot = this.lo[j][0]
      for (let p = 1; p < this.lo[j].length; p++) pivot -= this.lo[j][p] * this.lo[j][p]
      if (pivot < BandedCholesky.CLOSE_TO_ZERO) {
        this.firstNonPositiveDefiniteLeadingSubmatrixSize = j + 1
        return
      }
      const Ljj = Math.sqrt(pivot)
      this.lo[j][0] = Ljj
      for (let i = j + 1; i <= Math.min(j + b, n - 1); i++) {
        // L(i,j) = (M(i,j) − Σ_k L(i,k)·L(j,k)) / Ljj, k ∈ (band of both)
        let v = this.lo[i][i - j]
        const kLo = Math.max(0, i - b, j - b)
        for (let k = kLo; k < j; k++) {
          const pi = i - k
          const pj = j - k
          if (pi <= b && pj <= b) v -= this.lo[i][pi] * this.lo[j][pj]
        }
        this.lo[i][i - j] = v / Ljj
      }
    }
    this.success = true
  }

  getL(i: number, k: number): number {
    if (k > i) return 0
    const p = i - k
    return p > this.b ? 0 : this.lo[i][p]
  }

  /** Solve L y = rhs (forward, banded). */
  solveLower(rhs: number[]): number[] {
    const x = rhs.slice()
    for (let i = 0; i < this.n; i++) {
      let sum = rhs[i]
      for (let p = 1; p <= Math.min(this.b, i); p++) sum -= this.lo[i][p] * x[i - p]
      x[i] = sum / this.lo[i][0]
    }
    return x
  }

  /** Solve Lᵀ x = y (backward, banded). */
  solveUpper(y: number[]): number[] {
    const x = y.slice()
    for (let i = this.n - 1; i >= 0; i--) {
      let sum = x[i]
      for (let p = 1; p <= Math.min(this.b, this.n - 1 - i); p++) sum -= this.lo[i + p][p] * x[i + p]
      x[i] = sum / this.lo[i][0]
    }
    return x
  }

  /** Solve (L·Lᵀ) x = rhs. */
  solve(rhs: number[]): number[] {
    if (!this.success) throw new Error('BandedCholesky.success === false')
    return this.solveUpper(this.solveLower(rhs))
  }
}

// ---------------------------------------------------------------------------
// Small vector helpers (local copies; keep this module self-contained).
// ---------------------------------------------------------------------------
const zeroVector = (n: number): number[] => new Array<number>(n).fill(0)
const dot = (a: number[], b: number[]): number => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}
const scale = (v: number[], s: number): number[] => v.map((x) => x * s)
const sqNorm = (v: number[]): number => dot(v, v)
const norm = (v: number[]): number => Math.sqrt(sqNorm(v))
const saxpyInPlace = (a: number, x: number[], y: number[]): void => {
  for (let i = 0; i < x.length; i++) y[i] += a * x[i]
}
const signOf = (x: number): number => (x === 0 ? 0 : x < 0 ? -1 : 1)

function getBoundariesIntersections(z: number[], d: number[], radius: number): { tmin: number; tmax: number } {
  const a = sqNorm(d)
  const b = 2 * dot(z, d)
  const c = sqNorm(z) - radius * radius
  const sqrtDisc = Math.sqrt(b * b - 4 * a * c)
  let sb = signOf(b)
  if (sb === 0) sb = 1
  const aux = b + sqrtDisc * sb
  return { tmin: Math.min(-aux / (2 * a), (-2 * c) / aux), tmax: Math.max(-aux / (2 * a), (-2 * c) / aux) }
}

function updateLambda_7_3_14(lowerBound: number, upperBound: number, theta = 0.01): number {
  return Math.max(Math.sqrt(upperBound * lowerBound), lowerBound + theta * (upperBound - lowerBound))
}

// ---------------------------------------------------------------------------
// CGT 7.3.4 subproblem over the band (mirror of the dense port; the LINPACK
// smallest-singular-value estimate and the singular-leading-submatrix step
// read L through banded getL — zero outside the band).
// ---------------------------------------------------------------------------
const LambdaRange = { N: 0, L: 1, G: 2, F: 3 } as const
type LambdaRange = (typeof LambdaRange)[keyof typeof LambdaRange]

export class BandedTrustRegionSubproblem {
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
  private hessian: SymBandMatrix
  private k_easy: number
  private k_hard: number

  constructor(gradient: number[], hessian: SymBandMatrix, k_easy = 0.1, k_hard = 0.2) {
    this.gradient = gradient
    this.hessian = hessian
    this.k_easy = k_easy
    this.k_hard = k_hard
    this.gNorm = norm(gradient)
    if (gradient.some(Number.isNaN)) throw new Error('BandedTrustRegionSubproblem: gradient contains NaN')
    if (hessian.containsNaN()) throw new Error('BandedTrustRegionSubproblem: hessian contains NaN')
    this.cauchyPoint = zeroVector(gradient.length)
  }

  solve(radius: number, lambdaHint?: number): { step: number[]; hitsBoundary: boolean; hardCase: boolean } {
    this.cauchyPoint = this.computeCauchyPoint(radius)
    this.lambda = this.initialLambdas(radius)
    // Warm start: a caller-provided lambda from the previous (nearby) solve is a far
    // better initial guess than 7.3.14's — CLAMPED into the freshly computed CGT
    // bounds, so correctness and termination are untouched (only the path shortens).
    if (lambdaHint !== undefined && lambdaHint > this.lambda.lowerBound && lambdaHint < this.lambda.upperBound) {
      this.lambda.current = lambdaHint
    }
    this.numberOfIterations = 0
    const maxIter = 300
    for (;;) {
      this.numberOfIterations += 1
      let HpL = this.hessian.clone()
      HpL.addValueOnDiagonalInPlace(this.lambda.current)
      let chol = new BandedCholesky(HpL)
      if (this.lambda.upperBound === this.lambda.lowerBound && !chol.success) {
        const EPSILON = 10e-6
        this.lambda.upperBound += EPSILON
        this.lambda.current += EPSILON
        HpL = this.hessian.clone()
        HpL.addValueOnDiagonalInPlace(this.lambda.current)
        chol = new BandedCholesky(HpL)
        this.range = LambdaRange.G
      }
      this.update_step_and_range(radius, chol)
      if (this.lambda.current === 0 && this.range === LambdaRange.G) {
        this.hitsBoundary = false
        break
      }
      if (this.range === LambdaRange.G) this.lambda.upperBound = this.lambda.current
      else this.lambda.lowerBound = this.lambda.current
      this.update_lambda_step(radius, HpL, chol)
      if (this.terminate(radius, HpL, chol)) break
      this.update_lambda()
      if (this.numberOfIterations > maxIter) throw new Error('BandedTrustRegionSubproblem: max iterations exceeded')
    }
    return { step: this.step, hitsBoundary: this.hitsBoundary, hardCase: this.hardCase }
  }

  private update_step_and_range(radius: number, chol: BandedCholesky): void {
    if (chol.success) {
      this.step = chol.solve(scale(this.gradient, -1))
      this.stepSquaredNorm = sqNorm(this.step)
      this.stepNorm = Math.sqrt(this.stepSquaredNorm)
      this.range = this.stepNorm < radius ? LambdaRange.G : LambdaRange.L
    } else {
      this.range = LambdaRange.N
    }
  }

  private update_lambda_step(radius: number, HpL: SymBandMatrix, chol: BandedCholesky): void {
    if (this.range === LambdaRange.L || this.range === LambdaRange.G) {
      const w = chol.solveLower(this.step)
      const wSq = sqNorm(w)
      this.lambdaPlus = this.lambda.current + (this.stepNorm / radius - 1) * (this.stepSquaredNorm / wSq)
      if (this.range === LambdaRange.G) {
        const s_min = this.estimateSmallestSingularValue(chol)
        this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambda.current - s_min.value * s_min.value)
        const inter = getBoundariesIntersections(this.step, s_min.vector, radius)
        const t = Math.abs(inter.tmin) < Math.abs(inter.tmax) ? inter.tmin : inter.tmax
        saxpyInPlace(t, s_min.vector, this.step)
        this.stepSquaredNorm = sqNorm(this.step)
        this.stepNorm = Math.sqrt(this.stepSquaredNorm)
      }
    } else {
      const sls = this.singularLeadingSubmatrix(HpL, chol, chol.firstNonPositiveDefiniteLeadingSubmatrixSize)
      const vSq = sqNorm(sls.vector)
      this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambda.current + sls.delta / vSq)
    }
  }

  private terminate(radius: number, HpL: SymBandMatrix, chol: BandedCholesky): boolean {
    let stop = false
    if (
      (this.range === LambdaRange.L || this.range === LambdaRange.G) &&
      Math.abs(this.stepNorm - radius) <= this.k_easy * radius
    ) {
      const evalResult = dot(this.gradient, this.step) + 0.5 * this.hessian.quadraticForm(this.step)
      const evalCauchy = dot(this.gradient, this.cauchyPoint) + 0.5 * this.hessian.quadraticForm(this.cauchyPoint)
      if (evalResult > evalCauchy) return false
      this.hitsBoundary = true
      stop = true
    }
    if (this.range === LambdaRange.G) {
      if (this.lambda.current === 0) {
        this.hitsBoundary = false
        return true
      }
      const s_min = this.estimateSmallestSingularValue(chol)
      const inter = getBoundariesIntersections(this.step, s_min.vector, radius)
      const t_abs_max = Math.abs(inter.tmin) > Math.abs(inter.tmax) ? inter.tmin : inter.tmax
      const quad = HpL.quadraticForm(this.step)
      const relErr = (t_abs_max * s_min.value) ** 2 / (quad + this.lambda.current * radius * radius)
      if (relErr <= this.k_hard) {
        this.hitsBoundary = true
        this.hardCase = true
        stop = true
      }
    }
    return stop
  }

  private update_lambda(): void {
    if (this.range === LambdaRange.L && this.gNorm !== 0) {
      this.lambda.current = this.lambdaPlus
    } else if (this.range === LambdaRange.G) {
      const HpL = this.hessian.clone()
      HpL.addValueOnDiagonalInPlace(this.lambdaPlus)
      const chol = new BandedCholesky(HpL)
      if (chol.success) this.lambda.current = this.lambdaPlus
      else {
        this.lambda.lowerBound = Math.max(this.lambda.lowerBound, this.lambdaPlus)
        this.lambda.current = updateLambda_7_3_14(this.lambda.lowerBound, this.lambda.upperBound)
      }
    } else {
      this.lambda.current = updateLambda_7_3_14(this.lambda.lowerBound, this.lambda.upperBound)
    }
  }

  private computeCauchyPoint(radius: number): number[] {
    const gHg = this.hessian.quadraticForm(this.gradient)
    const gN = norm(this.gradient)
    if (gN === 0) return zeroVector(this.gradient.length)
    const result = scale(this.gradient, -radius / gN)
    if (gHg <= 0) return result
    const tau = gN ** 3 / radius / gHg
    return tau < 1 ? scale(result, tau) : result
  }

  private initialLambdas(radius: number): { current: number; lowerBound: number; upperBound: number } {
    const n = this.hessian.n
    let fro = 0
    let infNorm = 0
    let minDiag = this.hessian.get(0, 0)
    let gershLo = Infinity
    let gershHi = -Infinity
    for (let i = 0; i < n; i++) {
      let rowSum = 0
      const lo = Math.max(0, i - this.hessian.b)
      const hi = Math.min(n - 1, i + this.hessian.b)
      for (let j = lo; j <= hi; j++) {
        const v = this.hessian.get(i, j)
        rowSum += Math.abs(v)
        fro += v * v
      }
      infNorm = Math.max(infNorm, rowSum)
      const diag = this.hessian.get(i, i)
      minDiag = Math.min(minDiag, diag)
      gershLo = Math.min(gershLo, diag + Math.abs(diag) - rowSum)
      gershHi = Math.max(gershHi, diag - Math.abs(diag) + rowSum)
    }
    fro = Math.sqrt(fro)
    const gN = norm(this.gradient)
    const lowerBound = Math.max(0, Math.max(-minDiag, gN / radius - Math.min(gershHi, Math.min(fro, infNorm))))
    const upperBound = Math.max(0, gN / radius + Math.min(-gershLo, Math.min(fro, infNorm)))
    const current = lowerBound === 0 ? 0 : updateLambda_7_3_14(lowerBound, upperBound)
    return { current, lowerBound, upperBound }
  }

  private estimateSmallestSingularValue(chol: BandedCholesky): { value: number; vector: number[] } {
    const n = chol.n
    const p = zeroVector(n)
    const y = zeroVector(n)
    for (let k = 0; k < n; k++) {
      const Lkk = chol.getL(k, k)
      const y_plus = (1 - p[k]) / Lkk
      const y_minus = (-1 - p[k]) / Lkk
      // banded: only i ≤ k+b have L(i,k) ≠ 0; beyond that p is unchanged.
      let n1p = 0
      let n1m = 0
      const hi = Math.min(n - 1, k + chol.b)
      for (let i = k + 1; i <= hi; i++) {
        n1p += Math.abs(p[i] + chol.getL(i, k) * y_plus)
        n1m += Math.abs(p[i] + chol.getL(i, k) * y_minus)
      }
      for (let i = hi + 1; i < n; i++) {
        const a = Math.abs(p[i])
        n1p += a
        n1m += a
      }
      if (Math.abs(y_plus) + n1p >= Math.abs(y_minus) + n1m) {
        y[k] = y_plus
        for (let i = k + 1; i <= hi; i++) p[i] += chol.getL(i, k) * y_plus
      } else {
        y[k] = y_minus
        for (let i = k + 1; i <= hi; i++) p[i] += chol.getL(i, k) * y_minus
      }
    }
    const v = chol.solveUpper(y)
    const vN = norm(v)
    const yN = norm1AsNorm(y)
    if (vN === 0) throw new Error('estimateSmallestSingularValue: division by zero')
    return { value: yN / vN, vector: scale(v, 1 / vN) }
  }

  private singularLeadingSubmatrix(
    A: SymBandMatrix,
    chol: BandedCholesky,
    k: number,
  ): { delta: number; vector: number[] } {
    if (k < 0) throw new Error('singularLeadingSubmatrix: negative k')
    let delta = 0
    for (let j = Math.max(0, k - 1 - chol.b); j < k - 1; j++) delta += chol.getL(k - 1, j) ** 2
    delta -= A.get(k - 1, k - 1)
    const v = zeroVector(A.n)
    v[k - 1] = 1
    if (k !== 1) {
      // solve leading (k−1)×(k−1) lower-triangular system L·vtemp = u, u_i = L(k−1, i)
      const u = new Array<number>(k - 1).fill(0)
      for (let i = 0; i < k - 1; i++) u[i] = chol.getL(k - 1, i)
      const vtemp = u.slice()
      for (let i = 0; i < k - 1; i++) {
        let sum = u[i]
        for (let p = 1; p <= Math.min(chol.b, i); p++) sum -= chol.getL(i, i - p) * vtemp[i - p]
        vtemp[i] = sum / chol.getL(i, i)
      }
      for (let i = 0; i < k - 1; i++) v[i] = vtemp[i]
    }
    return { delta, vector: v }
  }
}

// The original uses the 2-norm of y here; keep the same.
const norm1AsNorm = (v: number[]): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0))

// ---------------------------------------------------------------------------
// The banded optimizer loop (same outer logic and constants as the dense port).
// ---------------------------------------------------------------------------

/** A problem exposing LOCAL constraint rows so the barrier Hessian assembles
 *  directly into the band (interleaved order). All values f_i ≤ 0 feasible. */
export interface BandedTrustRegionProblem {
  numberOfIndependentVariables: number
  /** control-point count (variables = 2·nCP, interleaved [x₀,y₀,…]). */
  nCP: number
  f0: number
  gradient_f0: number[] // BLOCK order [re…, im…] (converted internally)
  objectiveHessianDiagonal: number[] // BLOCK order
  numberOfConstraints: number
  f: number[]
  /** Signed local rows: vars in BLOCK order, vals already sign-oriented. */
  localRows(): { vars: number[]; vals: number[] }[]
  step(deltaX: number[]): void // BLOCK order
  fStep(deltaX: number[]): number[]
  f0Step(deltaX: number[]): number
}

const toInterleaved = (v: number, nCP: number): number => (v < nCP ? 2 * v : 2 * (v - nCP) + 1)

export class TrustRegionBarrierOptimizerBanded {
  success = false
  private lastLambda: number | undefined
  private o: BandedTrustRegionProblem
  constructor(o: BandedTrustRegionProblem) {
    this.o = o
  }

  /** Interleaved band half-width of the current local rows (constraint support). */
  static bandwidthOf(rows: { vars: number[] }[], nCP: number): number {
    let b = 1
    for (const r of rows) {
      let lo = Infinity
      let hi = -Infinity
      for (const v of r.vars) {
        const q = toInterleaved(v, nCP)
        if (q < lo) lo = q
        if (q > hi) hi = q
      }
      if (hi - lo > b) b = hi - lo
    }
    return b
  }

  optimize(epsilon: number = 10e-8, maxTrustRadius = 10, maxNumSteps: number = 800): void {
    this.success = false
    const nCP = this.o.nCP
    const N = this.o.numberOfIndependentVariables
    let numSteps = 0
    let t = this.o.numberOfConstraints / this.o.f0
    let trustRadius = 0.1
    const eta = 0.1
    const mu = 10
    while (10 / t > epsilon) {
      for (;;) {
        numSteps += 1
        const f = this.o.f
        const rows = this.o.localRows()
        const b = TrustRegionBarrierOptimizerBanded.bandwidthOf(rows, nCP)
        // barrier gradient (interleaved) and band Hessian from local rows
        const gradI = new Array<number>(N).fill(0)
        const H = new SymBandMatrix(N, b)
        for (let r = 0; r < rows.length; r++) {
          const { vars, vals } = rows[r]
          const fi = f[r]
          const invF = 1 / fi
          const invF2 = invF * invF
          for (let a = 0; a < vars.length; a++) {
            const I = toInterleaved(vars[a], nCP)
            gradI[I] += -vals[a] * invF
            for (let c = 0; c <= a; c++) {
              const J = toInterleaved(vars[c], nCP)
              H.add(I, J, vals[a] * vals[c] * invF2)
            }
          }
        }
        const barrierValue = this.barrierValue(f)
        // + t·(objective gradient, diagonal Hessian), block → interleaved
        const g0 = this.o.gradient_f0
        const d0 = this.o.objectiveHessianDiagonal
        for (let v = 0; v < N; v++) {
          const I = toInterleaved(v, nCP)
          gradI[I] += t * g0[v]
          H.add(I, I, t * d0[v])
        }
        const sub = new BandedTrustRegionSubproblem(gradI, H)
        let tr = sub.solve(trustRadius, this.lastLambda)
        this.lastLambda = sub.lambda.current
        let stepBlock = this.toBlock(tr.step, nCP)
        let fStep = this.o.fStep(stepBlock)
        let numSteps2 = 0
        while (Math.max(...fStep) >= 0) {
          numSteps2 += 1
          trustRadius *= 0.25
          tr = sub.solve(trustRadius, this.lastLambda)
          this.lastLambda = sub.lambda.current
          stepBlock = this.toBlock(tr.step, nCP)
          fStep = this.o.fStep(stepBlock)
          if (numSteps2 > 100) throw new Error('TrustRegionBarrierOptimizerBanded: feasibility shrink exceeded 100')
        }
        const barrierValueStep = this.barrierValue(fStep)
        const actualReduction = t * (this.o.f0 - this.o.f0Step(stepBlock)) + (barrierValue - barrierValueStep)
        const predictedReduction = -dot(gradI, tr.step) - 0.5 * H.quadraticForm(tr.step)
        const rho = actualReduction / predictedReduction
        if (rho < 0.25) trustRadius *= 0.25
        else if (rho > 0.75 && tr.hitsBoundary) trustRadius = Math.min(2 * trustRadius, maxTrustRadius)
        if (rho > eta) this.o.step(stepBlock)
        if (numSteps > maxNumSteps) return
        {
          const HpT = H.clone() // H already includes t·diag: convergence test mirrors the dense port
          const chol = new BandedCholesky(HpT)
          if (chol.success) {
            const newtonDecrementSquared = -dot(gradI, tr.step)
            if (newtonDecrementSquared < 0) throw new Error('TrustRegionBarrierOptimizerBanded: negative Newton decrement')
            if (newtonDecrementSquared < epsilon) break
          }
        }
        if (trustRadius < 10e-18) throw new Error('TrustRegionBarrierOptimizerBanded: trust radius < 10e-18')
      }
      if (trustRadius > 0.001) t *= mu
      else t *= 100 * mu
    }
    this.success = true
  }

  private toBlock(stepI: number[], nCP: number): number[] {
    const out = new Array<number>(stepI.length)
    for (let v = 0; v < stepI.length; v++) out[v] = stepI[toInterleaved(v, nCP)]
    return out
  }

  private barrierValue(f: number[]): number {
    let s = 0
    for (const fi of f) s -= Math.log(-fi)
    return s
  }
}
