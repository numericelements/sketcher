// ============================================================================
// PLANAR PH CURVES THROUGH A CHOSEN SUBSET OF CONTROL POINTS — every solution, for any degree.
//
// THE PROBLEM. A planar PH curve of degree 2K−1 is r′ = w², w a complex polynomial with K
// Bernstein coefficients. Its legs are quadratic forms in w,
//
//     N_j = Σ_{a+b=j} [C(K−1,a)C(K−1,b)/C(2K−2,j)] · w_a w_b ,     leg_j = N_j /(2K−1)
//
// so prescribing control points prescribes partial sums of those forms. The family has
// dim = 2K+2 and each planar condition costs 2, so the maximal prescribable set is K+1 control
// points and the fibre over it is a COUNT — never a positive-dimensional family, unlike space.
// Differencing away p₀ leaves exactly K quadratic equations in K complex unknowns.
//
// WHY A HOMOTOPY. Random-start Newton gives a LOWER bound on the count: you know what you found,
// not what you missed, and this repository has published an under-sampled count once already.
// A total-degree homotopy is exhaustive by a theorem: K quadrics have Bézout number 2^K; the
// start system w_c² = 1 has exactly those 2^K roots, known; and for generic complex γ the paths
// of H = (1−s)γG + sF are smooth and non-crossing for s < 1. So every isolated solution of F is
// the endpoint of one of the 2^K paths, and following all of them finds everything.
//
// The completeness is algebra — only the tracking is floating point. The certificate is
// therefore the PATH ACCOUNTING (`finitePaths + diverged + failed = 2^K`, with `failed = 0`),
// which every caller gets back and should check. It is not decoration: a corrector allowed to
// wander lands on a NEIGHBOURING path's root and reports a finite solution where the true path
// ran to infinity — a first version of this tracker had all 16 paths land on 2 roots with
// nothing diverging, which is arithmetically fine and logically worthless. Hence `LEASH`.
//
// THE COUNT DEPENDS ON THE SUBSET, NOT ON THE DATA. Measured across degrees and reference
// curves, and certified in planarPHSubsetCounts.test.ts:
//
//     degree 1: 1→1                  degree 5: 1→4 2→3 3→4 4→4
//     degree 3: 1→2 2→2              degree 7: 1→6 2→8 3→4 4→10 5→8 6→8 7→4 8→8
//
// with the maximum 2^{K−1} attained only when both endpoints are prescribed, pinning both
// endpoints forcing an EVEN count (degree 1 excepted), and the count-1 grips being exactly
// "K consecutive from one end plus one further point that is not the far endpoint".
//
// THE CERTIFICATE IS THE PATH ACCOUNTING, AND IT IS TIGHT. Ideally each of the 2^K paths ends at
// its own root or at infinity, i.e. `finitePaths === distinctRoots`. That holds on all 76 subsets
// across degrees 1…7 — but only once the endgame is deep enough; see DEFAULT_ENDGAME, where the
// four subsets that used to violate it, and the two explanations that turned out to be wrong,
// are recorded. A caller that ever sees `finitePaths > distinctRoots` is looking at a path that
// was pulled back off a route to infinity, and should retry with a smaller `endgame`.
//
// FOR DRAGGING, DO NOT RE-SOLVE. `trackSolutions` carries each branch by Newton from its own
// previous position, so branch identity is preserved BY CONSTRUCTION and no permutation
// matching is needed. Run `solveSubset` when the subset or the degree changes; track otherwise.
// ============================================================================
import { type Complex, cadd, csub, cmul, cscale, cnorm } from './complex'
import { csolveLinear } from './phSubsetInterp'

const C0: Complex = { re: 0, im: 0 }
const C1: Complex = { re: 1, im: 0 }

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** The weight of w_a·w_b inside N_j, for a generator with K coefficients. */
export const legWeight = (K: number, j: number, a: number): number =>
  (binom(K - 1, a) * binom(K - 1, j - a)) / binom(2 * K - 2, j)

/** The curve degree carried by a generator of K coefficients — always ODD. */
export const degreeOf = (K: number): number => 2 * K - 1

/** N_j for j = 0 … 2K−2, the hodograph's Bernstein coefficients. */
export function hodographCoefficients(K: number, w: readonly Complex[]): Complex[] {
  return Array.from({ length: 2 * K - 1 }, (_, j) => {
    let acc: Complex = C0
    for (let a = Math.max(0, j - (K - 1)); a <= Math.min(K - 1, j); a++) {
      acc = cadd(acc, cscale(cmul(w[a], w[j - a]), legWeight(K, j, a)))
    }
    return acc
  })
}

/** The 2K control points of the curve with generator w starting at p₀. */
export function controlPointsFrom(K: number, w: readonly Complex[], p0: Complex): Complex[] {
  const n = degreeOf(K)
  const N = hodographCoefficients(K, w)
  const out: Complex[] = [p0]
  let acc = p0
  for (let j = 0; j < n; j++) {
    acc = cadd(acc, cscale(N[j], 1 / n))
    out.push(acc)
  }
  return out
}

/** w(t) by de Casteljau on the Bernstein coefficients. */
export function generatorAt(w: readonly Complex[], t: number): Complex {
  let p = w.map((z) => ({ ...z }))
  while (p.length > 1) {
    p = p.slice(0, -1).map((z, i) => ({
      re: (1 - t) * z.re + t * p[i + 1].re,
      im: (1 - t) * z.im + t * p[i + 1].im,
    }))
  }
  return p[0]
}

/** Every maximal subset: K+1 of the 2K control points. */
export function maximalSubsets(K: number): number[][] {
  const n = 2 * K
  const out: number[][] = []
  const rec = (start: number, cur: number[]): void => {
    if (cur.length === K + 1) { out.push([...cur]); return }
    for (let i = start; i < n; i++) rec(i + 1, [...cur, i])
  }
  rec(0, [])
  return out
}

// ---------------------------------------------------------------------------
// The residual: K difference equations, one per prescribed point after the first
// ---------------------------------------------------------------------------
interface System {
  F: (w: readonly Complex[]) => Complex[]
  J: (w: readonly Complex[]) => Complex[][]
}
/**
 * EVERY CONDITION IN THIS MODULE HAS ONE SHAPE: Σ_i weights[i]·N_i(w), a quadratic form in w.
 *
 * A prescribed CONTROL POINT sums whole legs — weight 1/n on the legs between two indices. A
 * prescribed POINT ON THE CURVE sums them with real weights, because
 *
 *     c(T) − c(0) = ∫₀^T w² dt = Σ_i N_i · G_i(T),   G_i(T) = (1/n)·Σ_{j>i} B_j^n(T)
 *
 * and B_aB_b is a multiple of a single Bernstein polynomial, so the integral is exact rather than
 * quadrature. The two problems therefore share a solver and differ only in this weight table —
 * which is also the precise sense in which they are NOT the same problem: whole-leg weights can be
 * triangular and lose roots to infinity, real weights generically cannot.
 */
function formValue(K: number, w: readonly Complex[], weights: readonly number[]): Complex {
  let acc: Complex = C0
  for (let j = 0; j < weights.length; j++) {
    if (weights[j] === 0) continue
    for (let a = Math.max(0, j - (K - 1)); a <= Math.min(K - 1, j); a++) {
      acc = cadd(acc, cscale(cmul(w[a], w[j - a]), legWeight(K, j, a) * weights[j]))
    }
  }
  return acc
}
function formDeriv(K: number, w: readonly Complex[], weights: readonly number[], c: number): Complex {
  let acc: Complex = C0
  for (let j = 0; j < weights.length; j++) {
    const b = j - c
    if (weights[j] === 0 || b < 0 || b > K - 1) continue
    acc = cadd(acc, cscale(w[b], 2 * legWeight(K, j, c) * weights[j]))
  }
  return acc
}
function makeSystemFromWeights(K: number, weights: number[][], rhs: Complex[]): System {
  return {
    F: (w) => weights.map((row, m) => csub(formValue(K, w, row), rhs[m])),
    J: (w) => weights.map((row) => Array.from({ length: K }, (_, c) => formDeriv(K, w, row, c))),
  }
}

/** G_i(T) = (1/n)·Σ_{j>i} B_j^n(T) — the exact integral of the i-th hodograph coefficient. */
export function integralWeight(K: number, i: number, T: number): number {
  const n = degreeOf(K)
  let s2 = 0
  for (let j = i + 1; j <= n; j++) s2 += binom(n, j) * T ** j * (1 - T) ** (n - j)
  return s2 / n
}

/** Whole legs from subset[0] up to each later index — the CONTROL-POINT problem. */
function subsetWeights(K: number, subset: readonly number[]): number[][] {
  const n = degreeOf(K)
  return subset.slice(1).map((i) =>
    Array.from({ length: n }, (_, j) => (j >= subset[0] && j < i ? 1 / n : 0)))
}
/** G_i(t_m) − G_i(t_0) — the POINT-ON-THE-CURVE problem. */
function pointWeights(K: number, ts: readonly number[]): number[][] {
  const n = degreeOf(K)
  return ts.slice(1).map((t) =>
    Array.from({ length: n }, (_, i) => integralWeight(K, i, t) - integralWeight(K, i, ts[0])))
}

export interface PlanarPHSubsetSolution {
  /** The generator's K Bernstein coefficients. */
  readonly w: Complex[]
  /** The curve's start point, recovered from the prescribed data. */
  readonly p0: Complex
  /** All 2K control points. */
  readonly controlPoints: Complex[]
  /** ∫|w|² — the arc length, exact for a PH curve. */
  readonly arcLength: number
  /**
   * R = ∫|κ| ds, the ABSOLUTE rotation index — the deck's fairness selector, and the survey's
   * recommended one for picking the "good" interpolant out of a branch set.
   *
   * Absolute, not signed, and the difference is not cosmetic: an S-shaped curve turns one way and
   * then the other, so its SIGNED turning can be near zero while it is visibly the least fair
   * branch on screen. Computed as the total variation of the tangent angle, which is exactly
   * ∫|κ| ds since dθ/ds = κ; the hodograph is w², so its angle turns twice as fast as w's.
   */
  readonly rotationIndex: number
  /** min|w(t)|² over [0,1], SAMPLED. Zero means a cusp — a legitimate curve, not a failure. */
  readonly minSpeed: number
  /**
   * A CERTIFICATE of cusp-freeness, where minSpeed is only evidence.
   *
   * w(t) lies in the convex hull of its Bernstein coefficients, so if the origin is outside that
   * hull then w never vanishes on [0,1] and the curve provably has no cusp. The margin is the
   * largest r with a half-plane {⟨·,u⟩ ≥ r} containing every coefficient — computed by sampling
   * directions, so it UNDER-estimates, which keeps `> 0` a genuine proof rather than a guess.
   *
   * One-sided: margin ≤ 0 does NOT prove a cusp, it only fails to rule one out. Anything that
   * reports "cusp" from this number alone is over-claiming.
   */
  readonly hullMargin: number
}

export interface SubsetSolveReport {
  readonly solutions: PlanarPHSubsetSolution[]
  /** How many of the 2^K paths ended at a finite point — the accounting bucket. */
  readonly finitePaths: number
  /** Distinct finite roots among them. Each ±pair is ONE curve. */
  readonly distinctRoots: number
  /** Paths that ran to infinity — the solutions this subset throws away. */
  readonly diverged: number
  /** Paths the tracker could not classify. MUST be zero for the count to be trusted. */
  readonly failed: number
  /** 2^K — every path must land in exactly one of the three buckets above. */
  readonly paths: number
}

function measure(K: number, w: Complex[], p0: Complex): PlanarPHSubsetSolution {
  const S = 400
  let arc = 0, minSpeed = Infinity, turning = 0
  let prev = generatorAt(w, 0)
  for (let i = 0; i <= S; i++) {
    const t = i / S
    const g = generatorAt(w, t)
    const sp = g.re * g.re + g.im * g.im
    minSpeed = Math.min(minSpeed, sp)
    arc += (i === 0 || i === S ? 0.5 : 1) * sp / S
    if (i > 0) {
      // the hodograph is w², so its angle turns twice as fast as the generator's
      const d = Math.atan2(g.im * prev.re - g.re * prev.im, g.re * prev.re + g.im * prev.im)
      turning += 2 * Math.abs(d)
    }
    prev = g
  }
  // the certificate: the best half-plane through the origin that holds every coefficient
  let hullMargin = -Infinity
  const DIRS = 1440
  for (let d = 0; d < DIRS; d++) {
    const a = (2 * Math.PI * d) / DIRS
    const ux = Math.cos(a), uy = Math.sin(a)
    let worst = Infinity
    for (const z of w) worst = Math.min(worst, z.re * ux + z.im * uy)
    hullMargin = Math.max(hullMargin, worst)
  }
  const scale = Math.max(...w.map((z) => Math.hypot(z.re, z.im)), 1e-300)

  return {
    w, p0,
    controlPoints: controlPointsFrom(K, w, p0),
    arcLength: arc,
    rotationIndex: turning,
    minSpeed,
    hullMargin: hullMargin / scale,
  }
}

/** Recover p₀ so that control point `subset[0]` lands on `targets[0]`. */
function recoverP0(K: number, w: Complex[], subset: readonly number[], targets: readonly Complex[]): Complex {
  const cps = controlPointsFrom(K, w, C0)
  return csub(targets[0], cps[subset[0]])
}
/** Recover p₀ so that the curve passes through `targets[0]` at parameter `ts[0]`. */
function recoverP0AtParameter(K: number, w: Complex[], t0: number, target: Complex): Complex {
  const n = degreeOf(K)
  return csub(target, formValue(K, w, Array.from({ length: n }, (_, i) => integralWeight(K, i, t0))))
}

const LEASH = 0.5
const BIG = 1e5
/**
 * HOW CLOSE TO s = 1 THE PATHS ARE FOLLOWED, and it is not a free parameter.
 *
 * A path running to infinity grows only as s → 1, so if tracking stops too early the iterate is
 * still small, the final Newton polish onto F pulls it back onto a genuine root, and the tracker
 * reports a finite solution where the truth is a solution at infinity. At 1e-9 that happened on
 * exactly four of the 76 subsets — every one of them a count-1 grip, where almost all Bézout
 * roots ARE at infinity and so the effect has the most chances to bite. At 1e-12 all four resolve
 * to "2 finite, the rest diverged", matching the grips that were always clean.
 *
 * Two wrong readings were measured out of the way first. It is not the CHOICE of γ: four
 * different γ give the identical offender set, because γ changes a path's route and not the
 * endgame asymptotics, which belong to the target system alone. And it is not a left/right
 * asymmetry of the cascade: {2,3,4,5} and {3,4,5,6,7} are mirrored cascades that were always
 * clean, so "the mirror does not track" — an earlier claim in this header — was pattern-matching
 * on four data points and was wrong.
 */
const DEFAULT_ENDGAME = 1e-12

/**
 * Track all 2^K paths of the total-degree homotopy for a square system of K quadrics, and return
 * the finite roots modulo w ↦ −w together with the accounting. Shared by both problems, because
 * they differ only in the weight table that built F and J.
 */
function runHomotopy(
  K: number,
  F: (w: readonly Complex[]) => Complex[],
  J: (w: readonly Complex[]) => Complex[][],
  options: { gamma?: Complex; endgame?: number; big?: number },
): { curves: Complex[][]; finitePaths: number; distinctRoots: number; diverged: number; failed: number } {
    // γ must be off the real axis and is otherwise arbitrary — the gamma trick only needs it
    // generic. A caller that hits duplicate landings can retry with a different one.
    const gamma: Complex = options.gamma ?? { re: 0.6132, im: 0.7899 }
    const G = (w: readonly Complex[]): Complex[] => w.map((z) => csub(cmul(z, z), C1))
    const H = (w: readonly Complex[], s: number): Complex[] => {
      const g = G(w), f = F(w)
      return g.map((gc, i) => cadd(cscale(cmul(gamma, gc), 1 - s), cscale(f[i], s)))
    }
    const HW = (w: readonly Complex[], s: number): Complex[][] => {
      const jf = J(w)
      return Array.from({ length: K }, (_, r) =>
        Array.from({ length: K }, (_, c) =>
          cadd(cscale(r === c ? cmul(gamma, cscale(w[c], 2)) : C0, 1 - s), cscale(jf[r][c], s))))
    }
    const HS = (w: readonly Complex[]): Complex[] => {
      const g = G(w), f = F(w)
      return g.map((gc, i) => csub(f[i], cmul(gamma, gc)))
    }

    const sEnd = 1 - (options.endgame ?? DEFAULT_ENDGAME)
    const big = options.big ?? BIG
    const finite: Complex[][] = []
    const endNorms: number[] = []
    let diverged = 0, failed = 0
    for (let m = 0; m < 1 << K; m++) {
      let w: Complex[] = Array.from({ length: K }, (_, c) => ({ re: (m >> c) & 1 ? -1 : 1, im: 0 }))
      let s = 0, ds = 0.005
      let dead = false
      while (s < sEnd && !dead) {
        const step = Math.min(ds, sEnd - s)
        const dir = csolveLinear(HW(w, s), HS(w).map((z) => cscale(z, -1)))
        if (!dir) { ds /= 2; if (ds < 1e-12) { failed++; dead = true } continue }
        const leash = LEASH * Math.max(...dir.map(cnorm)) * step + 1e-12
        let trial = w.map((z, i) => cadd(z, cscale(dir[i], step)))
        let moved = 0, ok = false
        for (let it = 0; it < 6; it++) {
          const h = H(trial, s + step)
          if (Math.max(...h.map(cnorm)) < 1e-11) { ok = true; break }
          const d = csolveLinear(HW(trial, s + step), h.map((z) => cscale(z, -1)))
          if (!d) break
          moved += Math.max(...d.map(cnorm))
          if (moved > leash) break
          trial = trial.map((z, i) => cadd(z, d[i]))
          if (!trial.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) break
        }
        if (!ok || moved > leash) {
          ds /= 2
          if (ds < 1e-12) {
            if (Math.max(...w.map(cnorm)) > 20) diverged++     // the endgame choking on a path to ∞
            else failed++
            dead = true
          }
          continue
        }
        w = trial
        s += step
        ds = Math.min(ds * 1.25, 0.01)
        if (Math.max(...w.map(cnorm)) > big) { diverged++; dead = true }
      }
      if (dead) continue
      if (Math.max(...w.map(cnorm)) > big) { diverged++; continue }
      for (let it = 0; it < 40; it++) {
        const f = F(w)
        if (Math.max(...f.map(cnorm)) < 1e-13) break
        const d = csolveLinear(J(w), f.map((z) => cscale(z, -1)))
        if (!d) break
        w = w.map((z, i) => cadd(z, d[i]))
      }
      if (!w.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) { diverged++; continue }
      if (Math.max(...w.map(cnorm)) > big) { diverged++; continue }
      if (Math.max(...F(w).map(cnorm)) > 1e-8) { failed++; continue }
      endNorms.push(Math.max(...w.map(cnorm)))
      finite.push(w)
    }

    const same = (a: readonly Complex[], b: readonly Complex[]): boolean =>
      a.every((z, k) => cnorm(csub(z, b[k])) < 1e-6 * (1 + cnorm(z)))
    const uniq: Complex[][] = []
    for (const w of finite) if (!uniq.some((v) => same(v, w))) uniq.push(w)
    // w and −w are the SAME curve: the planar gauge is discrete and costs no dimension
    const curves: Complex[][] = []
    for (const w of uniq) {
      if (!curves.some((v) => same(v, w) || same(v, w.map((z) => cscale(z, -1))))) curves.push(w)
    }

  return { curves, finitePaths: finite.length, distinctRoots: uniq.length, diverged, failed }
}

/**
 * EVERY planar PH curve of degree 2K−1 whose control points at `subset` equal `targets`.
 *
 * `subset` must have exactly K+1 distinct indices in 0…2K−1 — the square case. Anything else
 * throws rather than silently solving a different problem: fewer leaves a positive-dimensional
 * family, more is generically empty.
 */
export function solveSubset(
  K: number,
  subset: readonly number[],
  targets: readonly Complex[],
  options: { gamma?: Complex; endgame?: number; big?: number } = {},
): SubsetSolveReport {
  if (subset.length !== K + 1) {
    throw new Error(`solveSubset: need exactly ${K + 1} indices for K=${K}, got ${subset.length}`)
  }
  if (targets.length !== subset.length) throw new Error('solveSubset: one target per index')
  const rhs = subset.slice(1).map((_, m) => csub(targets[m + 1], targets[0]))
  const { F, J } = makeSystemFromWeights(K, subsetWeights(K, subset), rhs)
  const { curves, finitePaths, distinctRoots, diverged, failed } = runHomotopy(K, F, J, options)

  const solutions = curves
    .map((w) => measure(K, w, recoverP0(K, w, subset, targets)))
    .sort((a, b) => a.rotationIndex - b.rotationIndex)   // fairest first, so [0] is the default
  return { solutions, finitePaths, distinctRoots, diverged, failed, paths: 1 << K }
}

/**
 * EVERY planar PH curve of degree 2K−1 passing through `targets` at parameters `ts`.
 *
 * The other half of the pair. Same family, same K quadrics in K unknowns, same homotopy — only the
 * weights differ, because a point ON the curve integrates the hodograph while a control point sums
 * whole legs. That is why the answers differ too: this problem gives exactly 2^{K−1} curves, while
 * `solveSubset` gives anything from 1 to 2^{K−1} depending on which points are held.
 *
 * `ts` and `targets` must both have K+1 entries — the square case.
 */
export function solveThroughPoints(
  K: number,
  ts: readonly number[],
  targets: readonly Complex[],
  options: { gamma?: Complex; endgame?: number; big?: number } = {},
): SubsetSolveReport {
  if (ts.length !== K + 1) {
    throw new Error(`solveThroughPoints: need exactly ${K + 1} parameters for K=${K}, got ${ts.length}`)
  }
  if (targets.length !== ts.length) throw new Error('solveThroughPoints: one target per parameter')
  const rhs = ts.slice(1).map((_, m) => csub(targets[m + 1], targets[0]))
  const { F, J } = makeSystemFromWeights(K, pointWeights(K, ts), rhs)
  const { curves, finitePaths, distinctRoots, diverged, failed } = runHomotopy(K, F, J, options)
  const solutions = curves
    .map((w) => measure(K, w, recoverP0AtParameter(K, w, ts[0], targets[0])))
    .sort((a, b) => a.rotationIndex - b.rotationIndex)
  return { solutions, finitePaths, distinctRoots, diverged, failed, paths: 1 << K }
}

/**
 * Carry known branches to new data by Newton from each one's own previous position.
 *
 * This is what a DRAG should call. Branch identity is preserved by construction — no
 * permutation matching, no colour swapping — and a branch that fails to converge is dropped
 * rather than replaced by whatever Newton happened to find, so the caller can tell that a
 * branch was lost instead of silently seeing a different curve under the same colour.
 */
export function trackSolutions(
  K: number,
  subset: readonly number[],
  targets: readonly Complex[],
  previous: readonly PlanarPHSubsetSolution[],
): (PlanarPHSubsetSolution | null)[] {
  const rhs = subset.slice(1).map((_, m) => csub(targets[m + 1], targets[0]))
  return carry(K, makeSystemFromWeights(K, subsetWeights(K, subset), rhs), previous,
    (w) => recoverP0(K, w, subset, targets))
}

/** The same, for points ON the curve. */
export function trackThroughPoints(
  K: number,
  ts: readonly number[],
  targets: readonly Complex[],
  previous: readonly PlanarPHSubsetSolution[],
): (PlanarPHSubsetSolution | null)[] {
  const rhs = ts.slice(1).map((_, m) => csub(targets[m + 1], targets[0]))
  return carry(K, makeSystemFromWeights(K, pointWeights(K, ts), rhs), previous,
    (w) => recoverP0AtParameter(K, w, ts[0], targets[0]))
}

function carry(
  K: number,
  system: System,
  previous: readonly PlanarPHSubsetSolution[],
  p0Of: (w: Complex[]) => Complex,
): (PlanarPHSubsetSolution | null)[] {
  const { F, J } = system
  return previous.map((prev) => {
    let w = prev.w.map((z) => ({ ...z }))
    let ok = false
    for (let it = 0; it < 40; it++) {
      const f = F(w)
      if (Math.max(...f.map(cnorm)) < 1e-12) { ok = true; break }
      const d = csolveLinear(J(w), f.map((z) => cscale(z, -1)))
      if (!d) break
      w = w.map((z, i) => cadd(z, d[i]))
      if (!w.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) break
    }
    if (!ok) return null
    return measure(K, w, p0Of(w))
  })
}
