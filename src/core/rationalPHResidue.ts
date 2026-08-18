// ============================================================================
// THE CHART-FREE CONSTRUCTION OF RATIONAL PH CURVES — the N-form residue conditions,
// solved directly, at ANY pole configuration.
//
// WHY THIS EXISTS. The three modules that came before it each build rational PH curves
// through a chart, and each chart excludes configurations the others need:
//
//     rationalPHMultiPoleSpatial / rationalPHComplexPoleSpatial   need σ(r) ≠ 0, and only
//                                                                 reach m = 2 pairs
//     rationalPHFreeLambda                                        takes REAL roots only
//     conformalPHCurve                                            lands on σ = h·w, i.e.
//                                                                 EVERY pole singular
//
// So none of them builds, say, a HARD member with a COMPLEX pole at m ≥ 3, or anything
// with a mixed real/complex pole set. This module does, because it never divides.
//
// THE CONDITION, and it is the primitive one. A rational curve is ∫N/w² with no
// logarithms. Writing w = (t−r_k)·v, partial fractions give the 1/(t−r_k) coefficient as
//
//     b_k = [ N′(r_k) − 2Σ_k N(r_k) ] / v(r_k)² ,      Σ_k = Σ_{l≠k} 1/(r_k − r_l)
//
// so "no logarithm at r_k" is exactly
//
//     N′(r_k) = 2Σ_k N(r_k)                            N = 𝒜i𝒜*        ← THE N-FORM
//
// a statement about N, indifferent to whether 𝒜(r_k) is invertible, real or complex.
//
// THE λ-FORM IS THIS PLUS AN ASSUMPTION. Set X = 𝒜(r)⁻¹𝒜′(r); the N-form forces
// X = Σ_k + λi, so λ is not a modelling choice but the unique solution — and every step
// of that argument needs 𝒜(r)⁻¹, i.e. σ(r) ≠ 0.
//
//     N-form   N′(r_k) = 2Σ_k N(r_k)              primitive, indifferent to pole type
//     λ-form   𝒜′(r_k) = 𝒜(r_k)(Σ_k + λi)         the same thing PLUS invertibility
//
// The λ-chart is therefore the N-form with an assumption bolted on, and dropping the
// assumption reaches everything the chart cannot — which is how the MIXED cell was
// constructed (docs/THE_MAP.md §6, __tests__/mixedCellExists.test.ts). The chart's hole
// is a hole in the COORDINATES, not in the curves.
//
// CONDITION COUNT. Three real per real pole; three COMPLEX — six real — per conjugate
// pair, whose partner contributes nothing new because N has real coefficients. Pass one
// representative per pair in `representatives`.
//
// DO NOT HAND-EXPAND d/dt(𝒜i𝒜*). A hand-derived polarisation gave residual O(1) at a
// complex pole and read exactly like the condition failing there. N is computed as a
// polynomial with the tested `sandwichPolynomial` and THAT is differentiated; the same
// check then reads 2e-16.
// ============================================================================
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm } from './complex'
import { type Quat } from './quaternion'
import { sandwichPolynomial } from './conformalPHHopf'
import { leastSquares } from './linalg'

const C = (re: number, im = 0): Complex => ({ re, im })

/** Every pole, conjugates included. */
export type PoleSet = readonly Complex[]

export const toSpinor = (x: readonly number[]): Quat[] =>
  Array.from({ length: x.length / 4 }, (_, k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] }))
export const fromSpinor = (A: readonly Quat[]): number[] => A.flatMap((q) => [q.u, q.v, q.p, q.q])

const pevC = (p: readonly number[], z: Complex): Complex => {
  let a: Complex = C(0)
  for (let k = p.length - 1; k >= 0; k--) a = cadd(cmul(z, a), C(p[k]))
  return a
}
const pderiv = (p: readonly number[]): number[] =>
  p.length <= 1 ? [0] : p.slice(1).map((c, i) => c * (i + 1))

/** 𝒜 evaluated at a COMPLEX argument — four complex components. */
export function spinorAt(A: readonly Quat[], z: Complex): Complex[] {
  let a: Complex[] = [C(0), C(0), C(0), C(0)]
  for (let k = A.length - 1; k >= 0; k--) {
    const c = [A[k].u, A[k].v, A[k].p, A[k].q]
    a = a.map((x, i) => cadd(cmul(z, x), C(c[i])))
  }
  return a
}

/** Σ_k = Σ_{l≠k} 1/(r_k − r_l), over EVERY other pole including the conjugate. */
export function bigSigma(poles: PoleSet, k: number): Complex {
  let s: Complex = C(0)
  for (let l = 0; l < poles.length; l++) if (l !== k) s = cadd(s, cdiv(C(1), csub(poles[k], poles[l])))
  return s
}

const isReal = (z: Complex): boolean => Math.abs(z.im) < 1e-12

/**
 * The no-log residuals at the given representatives: three reals per real pole, six per
 * complex one. Zero exactly when the curve ∫N/w² is rational.
 */
export function residueConditions(
  A: readonly Quat[], poles: PoleSet, representatives: readonly number[],
): number[] {
  const N = sandwichPolynomial(A)
  const dN = N.map(pderiv)
  const out: number[] = []
  for (const k of representatives) {
    const twoSigma = cscale(bigSigma(poles, k), 2)
    for (let i = 0; i < 3; i++) {
      const d = csub(pevC(dN[i], poles[k]), cmul(twoSigma, pevC(N[i], poles[k])))
      if (isReal(poles[k])) out.push(d.re)
      else out.push(d.re, d.im)
    }
  }
  return out
}

/** Worst residual, relative to the scale of N and N′ at the poles. */
export function residueDefect(
  A: readonly Quat[], poles: PoleSet, representatives: readonly number[],
): number {
  const N = sandwichPolynomial(A)
  const dN = N.map(pderiv)
  let scale = 1
  for (const k of representatives) {
    for (let i = 0; i < 3; i++) {
      scale = Math.max(scale, cnorm(pevC(N[i], poles[k])), cnorm(pevC(dN[i], poles[k])))
    }
  }
  return Math.max(...residueConditions(A, poles, representatives).map(Math.abs)) / scale
}

export interface PoleDiagnostic {
  readonly pole: Complex
  /** σ(r) = det 𝒜(r) = a²+b²+c²+d² over ℂ. Zero ⇒ 𝒜(r) singular. */
  readonly sigma: number
  /** ‖𝒜(r)‖² = |a|²+|b|²+|c|²+|d|². Zero ⇒ 𝒜(r) = 0, a DEGREE DROP (a fake pole). */
  readonly hermitian: number
  /**
   * |σ(r)|/‖𝒜(r)‖² ∈ [0,1] — and it is the COSINE OF AN ANGLE, not merely a ratio.
   *
   * 𝒜 has REAL quaternion coefficients, so 𝒜(z̄) = conj 𝒜(z) componentwise and therefore
   *
   *     σ(z) = ⟨𝒜(z), 𝒜(z̄)⟩          the Hermitian inner product   (exact, bit for bit)
   *     ‖𝒜(z̄)‖ = ‖𝒜(z)‖              identically
   *
   * so this quantity is |⟨𝒜(p),𝒜(p̄)⟩| / (‖𝒜(p)‖·‖𝒜(p̄)‖): the alignment of the spinor at
   * the pole with the spinor at its conjugate. Cauchy–Schwarz is exactly why it lies in
   * [0,1] — there is no separate bound to prove.
   *
   *     0   ORTHOGONAL — σ(r) = 0, rank one, the λ-chart's hole
   *     1   PARALLEL   — as hard as a pole can be
   *
   * At a REAL pole 𝒜(t̄) = 𝒜(t), so the two vectors are the same vector and the value is 1
   * identically: it carries no information there, and `hermitian` is the only degeneracy
   * signal. That single identity also says why real poles cannot be rotated soft.
   */
  readonly softness: number
  readonly real: boolean
}

/** Both numbers at every pole. Report PER POLE — a norm over poles hides mixing. */
export function poleDiagnostics(A: readonly Quat[], poles: PoleSet): PoleDiagnostic[] {
  return poles.map((r) => {
    const q = spinorAt(A, r)
    let s: Complex = C(0)
    for (const x of q) s = cadd(s, cmul(x, x))
    const hermitian = q.reduce((t, x) => t + x.re * x.re + x.im * x.im, 0)
    const sigma = cnorm(s)
    return { pole: r, sigma, hermitian, softness: sigma / Math.max(hermitian, 1e-300), real: isReal(r) }
  })
}

export interface ResidueSolveOptions {
  /** One index per conjugate pair (and every real pole). Defaults to Im(r) ≥ 0. */
  readonly representatives?: readonly number[]
  /** Fix σ at one pole — the ε-drive's extra equation. */
  readonly sigmaTarget?: { readonly pole: number; readonly value: Complex }
  readonly starts?: number
  readonly tolerance?: number
  /**
   * Which solution to return when several starts converge. 'bestConditioned' (the default)
   * maximises the SMALLEST ‖𝒜(r)‖² over the poles, and that default is the whole lesson of
   * the mixed-cell work: a member whose ‖𝒜(r)‖² has collapsed to ~1e-5 at some pole is
   * sitting on the rank-0 seam, so that pole is nearly FAKE and any claim about it is
   * worthless. `softness` cannot warn you — it is identically 1 at a real pole. Taking the
   * first success instead produced exactly such a member here.
   */
  readonly select?: 'first' | 'bestConditioned'
}

const defaultReps = (poles: PoleSet): number[] =>
  poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)

function residualVector(
  x: readonly number[], poles: PoleSet, reps: readonly number[],
  target: ResidueSolveOptions['sigmaTarget'],
): number[] {
  const A = toSpinor(x)
  const out = residueConditions(A, poles, reps)
  out.push(x.reduce((t, v) => t + v * v, 0) - 1)          // fix the projective scale
  if (target) {
    const q = spinorAt(A, poles[target.pole])
    let s: Complex = C(0)
    for (const v of q) s = cadd(s, cmul(v, v))
    out.push(s.re - target.value.re, s.im - target.value.im)
  }
  return out
}

/**
 * Newton with a minimum-norm step. The map is QUADRATIC in 𝒜 — N = 𝒜i𝒜* is, σ(r) is, the
 * normalisation is — so central differences carry NO truncation error and the step should
 * be LARGE: the only error left is round-off ~ε/h. Measured on this system, h = 1e-7 and
 * h = 1e-3 disagree at 2.9e-9 (that is the 1e-7 column being wrong) while h = 1e-2 and
 * h = 1e-1 agree at 2.5e-14.
 *
 * THE BOUNDARY: quadratic only while the POLES ARE FIXED. Σ_k is a rational function of
 * the pole locations, so a continuation that moves poles makes the map non-quadratic, the
 * truncation term returns, and this step size stops being right.
 */
const DIFF_STEP = 1e-2

export function newtonToResidue(
  x0: readonly number[], poles: PoleSet, reps: readonly number[],
  target: ResidueSolveOptions['sigmaTarget'], iterations = 200, tolerance = 1e-13,
): number[] | null {
  let x = [...x0]
  for (let it = 0; it < iterations; it++) {
    const f = residualVector(x, poles, reps, target)
    if (Math.max(...f.map(Math.abs)) < tolerance) return x
    const J = f.map(() => new Array(x.length).fill(0))
    for (let j = 0; j < x.length; j++) {
      const h = DIFF_STEP * Math.max(1, Math.abs(x[j]))
      const up = [...x]; up[j] += h
      const dn = [...x]; dn[j] -= h
      const fu = residualVector(up, poles, reps, target)
      const fd = residualVector(dn, poles, reps, target)
      for (let i = 0; i < f.length; i++) J[i][j] = (fu[i] - fd[i]) / (2 * h)
    }
    let step: number[]
    try { step = leastSquares(J, f.map((v) => -v), 1e-12) } catch { return null }
    const n = Math.hypot(...step)
    x = x.map((v, i) => v + (n > 0.5 ? 0.5 / n : 1) * step[i])
    if (!x.every(Number.isFinite)) return null
  }
  return Math.max(...residualVector(x, poles, reps, target).map(Math.abs)) < 1e-10 ? x : null
}

export interface ResidueSolution {
  readonly A: Quat[]
  readonly defect: number
  readonly diagnostics: PoleDiagnostic[]
}

/** The closest any pole comes to the rank-0 seam — the number to check before trusting a member. */
export const conditioningFloor = (s: ResidueSolution): number =>
  Math.min(...s.diagnostics.map((d) => d.hermitian))

/**
 * A rational PH curve with the given poles — at ANY configuration, real, complex or mixed,
 * and landing wherever the variety allows rather than where a chart permits.
 *
 * Starts are DETERMINISTIC (no Math.random), so a failure is reproducible.
 */
export function solveResidue(
  poles: PoleSet, spinorDegree: number, options: ResidueSolveOptions = {},
): ResidueSolution | null {
  const reps = options.representatives ?? defaultReps(poles)
  const size = 4 * (spinorDegree + 1)
  const starts = options.starts ?? 40
  const select = options.select ?? 'bestConditioned'
  let best: ResidueSolution | null = null
  let bestFloor = -Infinity
  for (let t = 0; t < starts; t++) {
    const raw = Array.from({ length: size }, (_, i) => (t % 2 === 0
      ? Math.sin(1.7 * i + 2.3 * t + 0.4)
      : Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t)))
    const n = Math.hypot(...raw) || 1
    const x = newtonToResidue(raw.map((v) => v / n), poles, reps, options.sigmaTarget)
    if (!x) continue
    const A = toSpinor(x)
    const diagnostics = poleDiagnostics(A, poles)
    const candidate: ResidueSolution = { A, defect: residueDefect(A, poles, reps), diagnostics }
    if (select === 'first') return candidate
    // The conditioning floor: the closest any pole comes to the rank-0 seam.
    const floor = Math.min(...diagnostics.map((d) => d.hermitian))
    if (floor > bestFloor) { bestFloor = floor; best = candidate }
  }
  return best
}

/**
 * INDEPENDENT verification, sharing none of the algebra above: the residue of N/w² around
 * a pole, by contour integration. A nonzero residue IS a logarithm, and a logarithm means
 * the curve is not rational.
 */
export function contourResidue(
  A: readonly Quat[], poles: PoleSet, k: number, radius = 0.15, samples = 4000,
): number {
  const N = sandwichPolynomial(A)
  const w = (z: Complex): Complex => {
    let p = C(1)
    for (const r of poles) p = cmul(p, csub(z, r))
    return p
  }
  const acc = [C(0), C(0), C(0)]
  for (let j = 0; j < samples; j++) {
    const th = (2 * Math.PI * (j + 0.5)) / samples
    const z = cadd(poles[k], C(radius * Math.cos(th), radius * Math.sin(th)))
    const dz = C(
      (-radius * Math.sin(th) * 2 * Math.PI) / samples,
      (radius * Math.cos(th) * 2 * Math.PI) / samples,
    )
    const wz = w(z)
    const w2 = cmul(wz, wz)
    for (let i = 0; i < 3; i++) acc[i] = cadd(acc[i], cmul(cdiv(pevC(N[i], z), w2), dz))
  }
  const scale = Math.max(...N.map((p) => cnorm(pevC(p, poles[k]))), 1e-30)
  return Math.max(...acc.map(cnorm)) / (2 * Math.PI) / scale
}

/**
 * gcd(N₁,N₂,N₃) — the WEAKER condition, and NOT the one C21 asks for. Kept because it is a
 * meaningful primitivity statement in its own right, but see `hopfCoprimalityMargin` below:
 * requiring all three components to vanish is three equations where the Hopf pair needs two,
 * and the gap is exactly the isotropic locus where a mixed witness lives.
 */
export function coprimalityMargin(A: readonly Quat[], rootsOf: (p: Complex[]) => Complex[]): number {
  const N = sandwichPolynomial(A)
  const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
  let worst = Infinity
  for (let c = 0; c < 3; c++) {
    for (const r of rootsOf(N[c].map((v) => C(v)))) {
      worst = Math.min(worst, Math.max(...[0, 1, 2].map((i) => cnorm(pevC(N[i], r)))) / scale)
    }
  }
  return worst
}


/**
 * THE C21 CONDITION: are the Hopf numerators coprime?
 *
 *     n₁ = N₁              n₂ = −N₃ + i·N₂          (n₂ COMPLEX; it is 2uv in the Hopf form)
 *
 * A common root needs n₁(r) = 0 AND n₂(r) = 0 — the latter being ONE COMPLEX equation, so
 * N₂ and N₃ need not vanish, only satisfy N₃(r) = i·N₂(r). That is strictly weaker than all
 * three components vanishing, and the gap is precisely the ISOTROPIC locus — which is where
 * a soft pole lives, so `coprimalityMargin` is blind on exactly the set that matters.
 *
 * THE CHECK IS FINITE, and by a theorem rather than by sampling. Since
 * σ² = n₁² + n₂·pconj(n₂), any common root of (n₁,n₂) is a root of σ. So evaluating the pair
 * at the roots of σ — a list of length 2n — decides it outright: no gcd, no root-distance
 * heuristic, no false negatives.
 *
 * Returns the smallest max(|n₁|,|n₂|) over those roots, relative to the scale of N. Far from
 * zero means coprime. A ZERO would not be a bad witness: it would mean C22′ fails there, so
 * the fibre over that curve is strictly larger than the Hopf gauge and no chart is faithful
 * at that point — a more interesting object than a clean mixed member.
 */
export function hopfCoprimalityMargin(
  A: readonly Quat[], sigma: readonly number[], rootsOf: (p: Complex[]) => Complex[],
): number {
  const N = sandwichPolynomial(A)
  const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
  let worst = Infinity
  for (const z of rootsOf(sigma.map((v) => C(v)))) {
    const n1 = pevC(N[0], z)
    const n2 = cadd(cscale(pevC(N[2], z), -1), cmul(C(0, 1), pevC(N[1], z)))
    worst = Math.min(worst, Math.max(cnorm(n1), cnorm(n2)) / scale)
  }
  return worst
}
