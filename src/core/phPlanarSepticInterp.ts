// ============================================================================
// Five points ON a planar PH septic — and there are EIGHT of them.
//
// The same curve and the same ten conditions as phPlanarSeptic's control-point problem,
// asked the other way round, and the count goes from one to eight. That contrast is the
// whole point: prescribing control points and prescribing points on the curve are NOT
// the same problem for a PH curve, even though they are linearly equivalent for an
// ordinary Bézier. The unknown is the generator, and only the control-point conditions
// factor through it by division.
//
// THE REDUCTION. Substitute wⱼ = w₀·rⱼ with r₀ = 1. Every condition
//
//     ∫₀^{tᵢ} w² dt = qᵢ − q₀ =: Dᵢ            i = 1…4
//
// is w₀²·Qᵢ(r) = Dᵢ with Qᵢ(r) = rᵀMᵢr, and Mᵢ the Gram matrix of the cubic Bernstein
// basis over [0,tᵢ]. Divide each by the first and w₀² cancels:
//
//     rᵀ(D₁Mᵢ − DᵢM₁)r = 0                     i = 2,3,4
//
// Three quadratic forms in the 4-vector r — i.e. three QUADRICS IN ℙ³, whose base locus
// is a Cayley octad: 2·2·2 = 8 points. Bézout is attained exactly here, unlike in space,
// because the unknowns are COMPLEX; every one of the eight is a genuine real planar
// curve, since w's coefficients are free complex numbers and ∫w² is a plane curve
// whatever they are. So there are always eight, they never vanish, and they can only
// collide — which is monodromy, and the figure should show it rather than hide it.
//
// (2^{k−1} at k = 4. Measured independently in __tests__/planarPHInterpolantCount.test.ts
// by random-start Newton; this module computes them completely and fast enough to drag.)
//
// HOW THEY ARE FOUND. A total-degree homotopy from x_i² = c_i, whose 8 roots are known,
// tracked to the target system. Homotopy rather than random multistart because a figure
// cannot afford to find only seven — and rather than a resultant because eliminating two
// of three quadrics gives a degree-12 univariate with four extraneous roots to filter.
// During a drag nothing is re-solved globally: each branch is carried by Newton from its
// own previous position, so branch identity is preserved BY CONSTRUCTION and no
// permutation matching is needed (contrast framework/branchTracking, which the figures
// with fewer branches use).
// ============================================================================
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm } from './complex'
import { type Spinor4, type PlanarSepticSolution, csqrt, solutionFrom } from './phPlanarSeptic'

const C0: Complex = { re: 0, im: 0 }
const C1: Complex = { re: 1, im: 0 }

/** Where the five prescribed points sit in parameter. */
export const DEFAULT_TS: readonly number[] = [0, 0.25, 0.5, 0.75, 1]

export type Root3 = readonly [Complex, Complex, Complex]

export interface SepticBranch {
  /** (r₁,r₂,r₃) — the generator's coefficients relative to w₀. Identifies the branch. */
  root: Root3
  solution: PlanarSepticSolution
}

// ---------------------------------------------------------------------------
// The quadratic forms
// ---------------------------------------------------------------------------

const binom = (n: number, k: number): number => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** ∫₀^T B_m^6(t) dt = (1/7) Σ_{j=m+1}^{7} B_j^7(T). */
function integralOfBernstein6(m: number, T: number): number {
  let s = 0
  for (let j = m + 1; j <= 7; j++) s += binom(7, j) * T ** j * (1 - T) ** (7 - j)
  return s / 7
}

/**
 * M(T)[a][b] = ∫₀^T B_a³ B_b³ dt, so that ∫₀^T w² dt = wᵀ M(T) w. Real and symmetric;
 * exact, because B_aB_b is a multiple of a single degree-6 Bernstein polynomial.
 */
export function gramMatrix(T: number): number[][] {
  const M: number[][] = [0, 1, 2, 3].map(() => [0, 0, 0, 0])
  for (let a = 0; a <= 3; a++) {
    for (let b = 0; b <= 3; b++) {
      M[a][b] =
        ((binom(3, a) * binom(3, b)) / binom(6, a + b)) * integralOfBernstein6(a + b, T)
    }
  }
  return M
}

/** rᵀ A r for a complex symmetric 4×4 A and r = (1, x₀, x₁, x₂). */
function quadForm(A: Complex[][], x: Root3): Complex {
  const r: Complex[] = [C1, x[0], x[1], x[2]]
  let s: Complex = C0
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) s = cadd(s, cmul(A[a][b], cmul(r[a], r[b])))
  }
  return s
}

/** ∂/∂x_j of rᵀAr — namely 2(Ar)_{j+1}, exact. */
function quadGrad(A: Complex[][], x: Root3): Complex[] {
  const r: Complex[] = [C1, x[0], x[1], x[2]]
  const Ar: Complex[] = [0, 1, 2, 3].map((a) => {
    let s: Complex = C0
    for (let b = 0; b < 4; b++) s = cadd(s, cmul(A[a][b], r[b]))
    return s
  })
  return [1, 2, 3].map((j) => cscale(Ar[j], 2))
}

// ---------------------------------------------------------------------------
// A 3×3 complex linear solve, with partial pivoting
// ---------------------------------------------------------------------------

function solve3(A: Complex[][], b: Complex[]): Complex[] | null {
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < 3; col++) {
    let piv = col
    for (let r = col + 1; r < 3; r++) if (cnorm(M[r][col]) > cnorm(M[piv][col])) piv = r
    if (cnorm(M[piv][col]) < 1e-300) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]
    for (let r = col + 1; r < 3; r++) {
      const f = cdiv(M[r][col], M[col][col])
      for (let c = col; c <= 3; c++) M[r][c] = csub(M[r][c], cmul(f, M[col][c]))
    }
  }
  const x: Complex[] = [C0, C0, C0]
  for (let r = 2; r >= 0; r--) {
    let s = M[r][3]
    for (let c = r + 1; c < 3; c++) s = csub(s, cmul(M[r][c], x[c]))
    x[r] = cdiv(s, M[r][r])
  }
  return x
}

// ---------------------------------------------------------------------------
// The target system
// ---------------------------------------------------------------------------

interface Target {
  /** The three complex-symmetric matrices A₂,A₃,A₄, each scaled to O(1). */
  A: Complex[][][]
  /** M(t₁) and D₁, for recovering w₀ once a root is known. */
  M1: number[][]
  D1: Complex
}

function buildTarget(points: readonly Complex[], ts: readonly number[]): Target | null {
  if (points.length < 5 || ts.length < 5) return null
  const D = [1, 2, 3, 4].map((i) => csub(points[i], points[0]))
  const M = [1, 2, 3, 4].map((i) => gramMatrix(ts[i]))
  const A: Complex[][][] = []
  for (let i = 1; i <= 3; i++) {
    const raw: Complex[][] = [0, 1, 2, 3].map((a) =>
      [0, 1, 2, 3].map((b) => csub(cscale(D[0], M[i][a][b]), cscale(D[i], M[0][a][b]))),
    )
    let scale = 0
    for (const row of raw) for (const z of row) scale = Math.max(scale, cnorm(z))
    if (scale < 1e-300) return null
    A.push(raw.map((row) => row.map((z) => cscale(z, 1 / scale))))
  }
  return { A, M1: M[0], D1: D[0] }
}

const evalF = (T: Target, x: Root3): Complex[] => T.A.map((A) => quadForm(A, x))
const jacF = (T: Target, x: Root3): Complex[][] => T.A.map((A) => quadGrad(A, x))

/** Newton on the target system alone — the drag's workhorse. */
function polish(T: Target, start: Root3, iterations = 40): Root3 | null {
  let x: Root3 = start
  for (let it = 0; it < iterations; it++) {
    const f = evalF(T, x)
    if (Math.max(...f.map(cnorm)) < 1e-14) return x
    const d = solve3(jacF(T, x), f.map((z) => cscale(z, -1)))
    if (!d) return null
    x = [cadd(x[0], d[0]), cadd(x[1], d[1]), cadd(x[2], d[2])] as Root3
    if (!x.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) return null
    if (Math.max(...x.map(cnorm)) > 1e10) return null
  }
  return Math.max(...evalF(T, x).map(cnorm)) < 1e-10 ? x : null
}

// ---------------------------------------------------------------------------
// The total-degree homotopy
// ---------------------------------------------------------------------------

/** Start system x_i² = c_i. Generic constants, so its 8 roots are distinct and finite. */
const START_C: Complex[] = [
  { re: 0.7314, im: 0.4127 },
  { re: -0.5233, im: 0.8419 },
  { re: 0.9142, im: -0.3358 },
]
/** The standard random rotation that keeps paths off the discriminant. Fixed, so runs repeat. */
const GAMMA: Complex = { re: 0.6157, im: 0.7881 }

const evalG = (x: Root3): Complex[] => [0, 1, 2].map((i) => csub(cmul(x[i], x[i]), START_C[i]))
const jacG = (x: Root3): Complex[][] =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? cscale(x[i], 2) : C0)))

function startRoots(): Root3[] {
  const roots: Root3[] = []
  const s = START_C.map(csqrt)
  for (let m = 0; m < 8; m++) {
    roots.push([
      m & 1 ? cscale(s[0], -1) : s[0],
      m & 2 ? cscale(s[1], -1) : s[1],
      m & 4 ? cscale(s[2], -1) : s[2],
    ] as Root3)
  }
  return roots
}

/** H(x,s) = (1−s)γG(x) + sF(x), and its two derivatives. */
function homotopy(T: Target, x: Root3, s: number) {
  const F = evalF(T, x)
  const G = evalG(x)
  const JF = jacF(T, x)
  const JG = jacG(x)
  const gG = G.map((z) => cmul(GAMMA, z))
  const H = [0, 1, 2].map((i) => cadd(cscale(gG[i], 1 - s), cscale(F[i], s)))
  const Hs = [0, 1, 2].map((i) => csub(F[i], gG[i]))
  const Hx = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => cadd(cscale(cmul(GAMMA, JG[i][j]), 1 - s), cscale(JF[i][j], s))),
  )
  return { H, Hs, Hx }
}

/** Track one path from s = 0 to s = 1. Returns null if it diverges or stalls. */
function trackPath(T: Target, start: Root3): Root3 | null {
  let x = start
  let s = 0
  let ds = 0.05
  let wins = 0
  for (let step = 0; step < 4000 && s < 1; step++) {
    const h = Math.min(ds, 1 - s)
    // Euler predictor: dx/ds = −Hx⁻¹ Hs
    const cur = homotopy(T, x, s)
    const dir = solve3(cur.Hx, cur.Hs.map((z) => cscale(z, -1)))
    if (!dir) return null
    let trial: Root3 = [
      cadd(x[0], cscale(dir[0], h)),
      cadd(x[1], cscale(dir[1], h)),
      cadd(x[2], cscale(dir[2], h)),
    ] as Root3
    // Newton corrector at the new s
    const sNew = s + h
    let ok = false
    for (let it = 0; it < 4; it++) {
      const at = homotopy(T, trial, sNew)
      if (Math.max(...at.H.map(cnorm)) < 1e-11) { ok = true; break }
      const d = solve3(at.Hx, at.H.map((z) => cscale(z, -1)))
      if (!d) break
      trial = [cadd(trial[0], d[0]), cadd(trial[1], d[1]), cadd(trial[2], d[2])] as Root3
      if (!trial.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) break
    }
    if (ok && Math.max(...trial.map(cnorm)) < 1e9) {
      x = trial
      s = sNew
      if (++wins >= 3) { ds = Math.min(ds * 2, 0.1); wins = 0 }
    } else {
      ds /= 2
      wins = 0
      if (ds < 1e-11) return null
    }
  }
  return s >= 1 ? polish(T, x) : null
}

// ---------------------------------------------------------------------------
// The public surface
// ---------------------------------------------------------------------------

/** Turn a root into the actual curve: w₀² = D₁/Q₁(r), then wⱼ = w₀rⱼ. */
function branchFrom(T: Target, root: Root3, p0: Complex): SepticBranch | null {
  const Mc: Complex[][] = T.M1.map((row) => row.map((v) => ({ re: v, im: 0 })))
  const q1 = quadForm(Mc, root)
  if (cnorm(q1) < 1e-14) return null
  const w0 = csqrt(cdiv(T.D1, q1))
  if (cnorm(w0) < 1e-14) return null
  const w: Spinor4 = [w0, cmul(w0, root[0]), cmul(w0, root[1]), cmul(w0, root[2])]
  if (!w.every((z) => Number.isFinite(z.re) && Number.isFinite(z.im))) return null
  return { root, solution: solutionFrom(w, p0) }
}

/**
 * Every planar PH septic through the five points — the global solve. Generically eight;
 * fewer only when a path runs to infinity, which means a branch has w₀ = 0 (a cusp at
 * the first point).
 */
export function septicInterpolants(
  points: readonly Complex[],
  ts: readonly number[] = DEFAULT_TS,
): SepticBranch[] {
  const T = buildTarget(points, ts)
  if (!T) return []
  const out: SepticBranch[] = []
  const seen: Root3[] = []
  for (const s0 of startRoots()) {
    const root = trackPath(T, s0)
    if (!root) continue
    if (seen.some((r) => Math.max(...[0, 1, 2].map((i) => cnorm(csub(r[i], root[i])))) < 1e-7)) continue
    const b = branchFrom(T, root, points[0])
    if (b) { seen.push(root); out.push(b) }
  }
  return out
}

/**
 * Carry known branches to new data by Newton — the drag path. Branch identity is the
 * ARRAY POSITION, preserved by construction because each root is continued from its own
 * previous value; a branch that fails to converge comes back null so the caller can
 * decide whether to re-solve globally.
 */
export function trackSepticInterpolants(
  points: readonly Complex[],
  previous: readonly Root3[],
  ts: readonly number[] = DEFAULT_TS,
): (SepticBranch | null)[] {
  const T = buildTarget(points, ts)
  if (!T) return previous.map(() => null)
  return previous.map((prev) => {
    const root = polish(T, prev)
    return root ? branchFrom(T, root, points[0]) : null
  })
}
