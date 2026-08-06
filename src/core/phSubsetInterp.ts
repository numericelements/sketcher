// ============================================================================
// PH quintic SUBSET interpolation — prescribe any 4 of the 6 control points.
//
// This is RUNG 2, and it GENERALISES rung 1. The dimension count:
//
//   unknowns : the generator w₀,w₁,w₂ (3 complex) + the start point p₀ (1 complex)
//              = 8 real DOF                                    [= 2n+2 with n=3]
//   equations: each prescribed control point pᵢ = target is 2 real
//
//   4 prescribed CPs → 8 equations, 8 unknowns → SQUARE, finitely many solutions
//   fewer           → a positive-dimensional family (the design freedom)
//   more            → generically no solution   (this is the codimension of the
//                     PH variety: you cannot prescribe all 6 control points)
//
// C¹ Hermite data is the SPECIAL CASE S = {0,1,4,5} (position + tangent leg at
// each end), where the count is the classical 4 — which is why rung 1 is the
// oracle for this solver (see the cross-check test).
//
// Structure. All six control points are pᵢ = p₀ + Lᵢ(w) with Lᵢ a partial sum of
// the legs (phQuinticHermite eq. 3), so Lᵢ is a QUADRATIC form in w. Taking
// DIFFERENCES against the subset's first index eliminates p₀ and leaves
//
//     F_j(w) = [ L_{iⱼ}(w) − L_{i₀}(w) ] − [ target_{iⱼ} − target_{i₀} ] = 0
//                                                              for j = 1,2,3
//
// three complex equations in three complex unknowns. Every Lᵢ is a HOLOMORPHIC
// (polynomial) function of w, so F is holomorphic and Newton runs natively in
// ℂ³ with a 3×3 complex Jacobian — no 6×6 real system, no finite differences.
// p₀ is then recovered as target_{i₀} − L_{i₀}(w).
//
// HONESTY NOTE (Law 3). The solution counts this module reports are found by
// NUMERICAL ENUMERATION (Newton from many random starts, deduped modulo the
// w → −w gauge). That is a lower bound on the true count, not a certified
// count — `SubsetSolveResult.starts` records how hard we looked so the number is
// never mistaken for a theorem. Only rung 1's count of 4 is backed by algebra.
// ============================================================================
import { type Complex, cadd, cmul, csub, cscale, cnorm } from './complex'
import { type PHQuinticGenerator, controlPointLegs, controlPoints, speedLowerBound, minSpeedSampled, arcLength, absoluteRotationIndex } from './phQuinticHermite'

/** A PH quintic has six Bézier control points. */
export const PH_QUINTIC_NUM_CPS = 6

// ---------------------------------------------------------------------------
// Offsets Lᵢ(w) and their exact (holomorphic) derivatives
// ---------------------------------------------------------------------------

/** Lᵢ(w) = pᵢ − p₀ for i = 0..5 — partial sums of the legs. L₀ = 0. */
export function cpOffsets(g: PHQuinticGenerator): Complex[] {
  const legs = controlPointLegs(g)
  const out: Complex[] = [{ re: 0, im: 0 }]
  let acc: Complex = { re: 0, im: 0 }
  for (const leg of legs) {
    acc = cadd(acc, leg)
    out.push(acc)
  }
  return out
}

/**
 * ∂[w²]ₖ/∂(w₀,w₁,w₂) for k = 0..4 — the exact complex-linear derivatives of the
 * hodograph coefficients (phQuinticHermite eq. 2). Holomorphic, so one complex
 * number per (k, variable) rather than a real 2×2 block.
 */
function hodographCoeffDerivs(g: PHQuinticGenerator): Complex[][] {
  const { w0, w1, w2 } = g
  const Z: Complex = { re: 0, im: 0 }
  return [
    [cscale(w0, 2), Z, Z], //                       w₀²
    [w1, w0, Z], //                                 w₀w₁
    [cscale(w2, 1 / 3), cscale(w1, 4 / 3), cscale(w0, 1 / 3)], // (2w₁²+w₀w₂)/3
    [Z, w2, w1], //                                 w₁w₂
    [Z, Z, cscale(w2, 2)], //                       w₂²
  ]
}

/** ∂Lᵢ/∂(w₀,w₁,w₂) for i = 0..5 — partial sums of the leg derivatives (legs = coeffs/5). */
export function cpOffsetDerivs(g: PHQuinticGenerator): Complex[][] {
  const dq = hodographCoeffDerivs(g)
  const Z: Complex = { re: 0, im: 0 }
  const out: Complex[][] = [[Z, Z, Z]]
  const acc: Complex[] = [Z, Z, Z]
  for (let k = 0; k < 5; k++) {
    for (let v = 0; v < 3; v++) acc[v] = cadd(acc[v], cscale(dq[k][v], 1 / 5))
    out.push([acc[0], acc[1], acc[2]])
  }
  return out
}

// ---------------------------------------------------------------------------
// A 3×3 complex linear solver (Gaussian elimination, partial pivoting)
// ---------------------------------------------------------------------------

function cdivSafe(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im
  if (d === 0) return { re: 0, im: 0 }
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

/** Solve A·x = b for complex A (n×n) and b (n). Returns null if A is singular. */
export function csolveLinear(A: Complex[][], b: Complex[]): Complex[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row.map((z) => ({ ...z })), { ...b[i] }])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (cnorm(M[r][col]) > cnorm(M[piv][col])) piv = r
    if (cnorm(M[piv][col]) < 1e-300) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]
    for (let r = col + 1; r < n; r++) {
      const f = cdivSafe(M[r][col], M[col][col])
      for (let c = col; c <= n; c++) M[r][c] = csub(M[r][c], cmul(f, M[col][c]))
    }
  }
  const x: Complex[] = new Array(n).fill(null).map(() => ({ re: 0, im: 0 }))
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n]
    for (let c = r + 1; c < n; c++) s = csub(s, cmul(M[r][c], x[c]))
    x[r] = cdivSafe(s, M[r][r])
  }
  return x
}

/** Invert a small complex matrix (for the conditioning proxy). Null if singular. */
function cinvert(A: Complex[][]): Complex[][] | null {
  const n = A.length
  const cols: Complex[][] = []
  for (let j = 0; j < n; j++) {
    const e: Complex[] = new Array(n).fill(null).map((_, i) => ({ re: i === j ? 1 : 0, im: 0 }))
    const x = csolveLinear(A, e)
    if (!x) return null
    cols.push(x)
  }
  return A.map((_, i) => cols.map((col) => col[i]))
}

const frobenius = (A: Complex[][]): number => {
  let s = 0
  for (const row of A) for (const z of row) s += z.re * z.re + z.im * z.im
  return Math.sqrt(s)
}

// ---------------------------------------------------------------------------
// The subset solver
// ---------------------------------------------------------------------------

/** One solution of a subset interpolation problem. */
export interface SubsetSolution {
  readonly generator: PHQuinticGenerator
  /** Recovered start point p₀ = target_{i₀} − L_{i₀}(w). */
  readonly p0: Complex
  /** All six control points; the prescribed ones match their targets. */
  readonly controlPoints: Complex[]
  /** max |pᵢ − targetᵢ| over the prescribed subset — the honest residual. */
  readonly residual: number
  /** Newton iterations used. */
  readonly iterations: number
  /**
   * ‖J‖_F·‖J⁻¹‖_F at the solution — a Frobenius PROXY for the condition number,
   * not σ_max/σ_min. Comparable across subsets, which is all the table needs.
   */
  readonly conditionProxy: number
  /** Best lower bound on σ (hull margin² when available); > 0 CERTIFIES no cusp. */
  readonly speedLowerBound: number
  /** Sampled min σ; ≈ 0 means a cusp. */
  readonly minSpeed: number
  readonly arcLength: number
  readonly rotationIndex: number
}

export interface SubsetSolveOptions {
  /** Random starts to attempt (default 200). More starts → higher confidence in the count. */
  readonly starts?: number
  /** Newton iteration cap per start (default 60). */
  readonly maxIterations?: number
  /** Residual below which a Newton run is accepted, relative to the data scale (default 1e-11). */
  readonly tolerance?: number
  /** Seed for the deterministic PRNG (default 12345) — reproducible enumeration. */
  readonly seed?: number
}

export interface SubsetSolveResult {
  /** The prescribed indices, ascending. */
  readonly subset: number[]
  readonly solutions: SubsetSolution[]
  /** How many random starts were tried — the count above is only as good as this. */
  readonly starts: number
  /** How many starts converged (before dedupe). */
  readonly converged: number
}

/** Deterministic PRNG (mulberry32) so enumeration is reproducible. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Solve for a PH quintic whose control points at `subset` equal `targets`.
 *
 * `subset` must have exactly 4 distinct indices in 0..5 (a square system, per the
 * dimension count above); anything else throws rather than silently solving a
 * different problem.
 *
 * Method: eliminate p₀ by differencing, then Newton in ℂ³ on the three
 * holomorphic quadratic residuals, from `starts` random starts, deduped modulo
 * the w → −w gauge. Solutions are returned sorted by rotation index (the
 * survey's fairness selector), so `solutions[0]` is the "good" one.
 */
export function solvePHSubset(
  subset: readonly number[],
  targets: readonly Complex[],
  options: SubsetSolveOptions = {},
): SubsetSolveResult {
  if (subset.length !== 4) {
    throw new Error(`solvePHSubset: need exactly 4 prescribed control points (a square system), got ${subset.length}`)
  }
  if (targets.length !== subset.length) {
    throw new Error(`solvePHSubset: ${subset.length} indices but ${targets.length} targets`)
  }
  const idx = [...subset]
  if (new Set(idx).size !== idx.length || idx.some((i) => i < 0 || i >= PH_QUINTIC_NUM_CPS || !Number.isInteger(i))) {
    throw new Error(`solvePHSubset: subset must be 4 distinct integers in 0..${PH_QUINTIC_NUM_CPS - 1}, got ${subset}`)
  }
  const order = idx.map((_, k) => k).sort((a, b) => idx[a] - idx[b])
  const I = order.map((k) => idx[k])
  const T = order.map((k) => targets[k])

  const starts = options.starts ?? 200
  const maxIterations = options.maxIterations ?? 60
  const tolRel = options.tolerance ?? 1e-11
  const rng = makeRng(options.seed ?? 12345)

  // Data scale: the spread of the prescribed targets. Sets both the Newton start
  // magnitude (|w|² ~ legs ~ spread, so |w| ~ √spread) and the residual tolerance.
  let spread = 0
  for (const a of T) for (const b of T) spread = Math.max(spread, cnorm(csub(a, b)))
  const scale = spread > 0 ? spread : 1
  const wScale = Math.sqrt(scale)
  const tol = tolRel * scale

  // Right-hand side: target_{iⱼ} − target_{i₀}, j = 1..3.
  const rhs = [1, 2, 3].map((j) => csub(T[j], T[0]))

  const residualAt = (g: PHQuinticGenerator): Complex[] => {
    const L = cpOffsets(g)
    return [1, 2, 3].map((j) => csub(csub(L[I[j]], L[I[0]]), rhs[j - 1]))
  }
  const jacobianAt = (g: PHQuinticGenerator): Complex[][] => {
    const dL = cpOffsetDerivs(g)
    return [1, 2, 3].map((j) => [0, 1, 2].map((v) => csub(dL[I[j]][v], dL[I[0]][v])))
  }

  const found: SubsetSolution[] = []
  let converged = 0

  for (let s = 0; s < starts; s++) {
    // Random complex start, magnitudes O(wScale).
    let g: PHQuinticGenerator = {
      w0: { re: (rng() * 2 - 1) * wScale, im: (rng() * 2 - 1) * wScale },
      w1: { re: (rng() * 2 - 1) * wScale, im: (rng() * 2 - 1) * wScale },
      w2: { re: (rng() * 2 - 1) * wScale, im: (rng() * 2 - 1) * wScale },
    }
    let iterations = 0
    let ok = false
    for (let it = 0; it < maxIterations; it++) {
      iterations = it + 1
      const F = residualAt(g)
      const err = Math.max(...F.map(cnorm))
      if (err < tol) {
        ok = true
        break
      }
      const J = jacobianAt(g)
      const step = csolveLinear(J, F.map((z) => cscale(z, -1)))
      if (!step) break
      const stepNorm = Math.max(...step.map(cnorm))
      // Damp wild Newton steps (quadratic map ⇒ far-from-root steps can overshoot).
      const damp = stepNorm > 10 * wScale ? (10 * wScale) / stepNorm : 1
      g = {
        w0: cadd(g.w0, cscale(step[0], damp)),
        w1: cadd(g.w1, cscale(step[1], damp)),
        w2: cadd(g.w2, cscale(step[2], damp)),
      }
      if (!Number.isFinite(cnorm(g.w0) + cnorm(g.w1) + cnorm(g.w2))) break
    }
    if (!ok) continue
    converged++

    // Dedupe modulo the gauge w → −w (which leaves w² and hence the curve fixed).
    const dist = (a: PHQuinticGenerator, b: PHQuinticGenerator): number => {
      const d = (x: PHQuinticGenerator, y: PHQuinticGenerator): number =>
        Math.max(cnorm(csub(x.w0, y.w0)), cnorm(csub(x.w1, y.w1)), cnorm(csub(x.w2, y.w2)))
      const neg: PHQuinticGenerator = { w0: cscale(b.w0, -1), w1: cscale(b.w1, -1), w2: cscale(b.w2, -1) }
      return Math.min(d(a, b), d(a, neg))
    }
    if (found.some((f) => dist(g, f.generator) < 1e-6 * wScale)) continue

    const L = cpOffsets(g)
    const p0 = csub(T[0], L[I[0]])
    const cps = controlPoints(g, p0)
    const residual = Math.max(...I.map((i, j) => cnorm(csub(cps[i], T[j]))))
    const J = jacobianAt(g)
    const Jinv = cinvert(J)
    found.push({
      generator: g,
      p0,
      controlPoints: cps,
      residual,
      iterations,
      conditionProxy: Jinv ? frobenius(J) * frobenius(Jinv) : Infinity,
      speedLowerBound: speedLowerBound(g),
      minSpeed: minSpeedSampled(g),
      arcLength: arcLength(g),
      rotationIndex: absoluteRotationIndex(g),
    })
  }

  found.sort((a, b) => a.rotationIndex - b.rotationIndex)
  return { subset: I, solutions: found, starts, converged }
}

// ---------------------------------------------------------------------------
// The C(6,4) = 15 subset table
// ---------------------------------------------------------------------------

/** All 15 four-element subsets of {0..5}, lexicographic. */
export function allFourSubsets(): number[][] {
  const out: number[][] = []
  for (let a = 0; a < 6; a++)
    for (let b = a + 1; b < 6; b++)
      for (let c = b + 1; c < 6; c++)
        for (let d = c + 1; d < 6; d++) out.push([a, b, c, d])
  return out
}

export interface SubsetTableRow {
  readonly subset: number[]
  /** Distinct solutions found (a LOWER bound — see the honesty note at the top). */
  readonly solutionCount: number
  /** Best (smallest) condition proxy among the solutions; Infinity if none. */
  readonly bestConditionProxy: number
  /** How many solutions are CERTIFIED cusp-free by the hull margin (speedLowerBound > 0). */
  readonly certifiedRegularCount: number
  /** Fraction of Newton starts that converged — a robustness signal. */
  readonly convergenceRate: number
  /**
   * How many of the two PERFECT-SQUARE legs the subset isolates in a single
   * equation: leg₀ = w₀²/5 (needs indices 0 and 1 both present) and
   * leg₄ = w₂²/5 (needs 4 and 5). An isolated square pins that end of the
   * generator directly, up to sign.
   *
   * Descriptive only — it does NOT determine the solution count. {0,1,2,3} has
   * one and yields 1; {0,1,3,4} has one and yields more. The count is MEASURED.
   */
  readonly directSquares: number
  /**
   * True for the two FULLY TRIANGULAR subsets, {0,1,2,3} and {2,3,4,5}: the three
   * equations are single legs that peel the generator off one variable at a time
   * (leg₀→w₀, leg₁→w₁, leg₂→w₂ and the mirror), so the solution is unique modulo
   * the w → −w gauge. This is provable, and it is asserted in the tests.
   */
  readonly isTriangular: boolean
}

/**
 * Solve every 4-of-6 subset against control points sampled from a reference PH
 * quintic, so each subset's problem is guaranteed to have at least one exact
 * solution (the reference itself). The interesting output is how many OTHER
 * solutions exist and how well-conditioned each subset is.
 */
export function subsetTable(
  reference: PHQuinticGenerator,
  p0: Complex,
  options: SubsetSolveOptions = {},
): SubsetTableRow[] {
  const cps = controlPoints(reference, p0)
  return allFourSubsets().map((subset) => {
    const res = solvePHSubset(subset, subset.map((i) => cps[i]), options)
    const best = res.solutions.length > 0 ? Math.min(...res.solutions.map((s) => s.conditionProxy)) : Infinity
    return {
      subset,
      solutionCount: res.solutions.length,
      bestConditionProxy: best,
      certifiedRegularCount: res.solutions.filter((s) => s.speedLowerBound > 0).length,
      convergenceRate: res.converged / res.starts,
      directSquares: countDirectSquares(subset),
      isTriangular: isTriangularSubset(subset),
    }
  })
}

const has = (s: readonly number[], ...v: number[]): boolean => v.every((x) => s.includes(x))

/** leg₀ = w₀²/5 is isolated iff {0,1} ⊆ S; leg₄ = w₂²/5 iff {4,5} ⊆ S. */
export function countDirectSquares(subset: readonly number[]): number {
  return (has(subset, 0, 1) ? 1 : 0) + (has(subset, 4, 5) ? 1 : 0)
}

/**
 * The two subsets whose three equations are single legs forming a substitution
 * chain: {0,1,2,3} (leg₀,leg₁,leg₂) and {2,3,4,5} (leg₂,leg₃,leg₄). Unique
 * solution modulo the sign gauge.
 *
 * NOTE {1,2,3,4} is also 4 consecutive indices but is NOT triangular: its
 * equations are leg₁ = w₀w₁/5, leg₂ = (2w₁²+w₀w₂)/15, leg₃ = w₁w₂/5. Neither end
 * square appears, so substituting w₀ = 5a/w₁ and w₂ = 5c/w₁ into leg₂ gives
 * 2w₁⁴ − 15b·w₁² + 25ac = 0 — a quadratic in w₁², hence TWO solutions. That is
 * what the measurement showed, and it is why "consecutive" is not the criterion.
 */
export function isTriangularSubset(subset: readonly number[]): boolean {
  const s = [...subset].sort((a, b) => a - b)
  const consecutive = s.every((v, k) => k === 0 || v === s[k - 1] + 1)
  return consecutive && (s[0] === 0 || s[s.length - 1] === 5)
}
