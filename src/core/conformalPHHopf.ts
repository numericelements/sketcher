// ============================================================================
// THE HOPF FORM OF A RATIONAL PH CURVE — EXTRACTED, NOT ASSUMED.
//
// conformalPHCurve's header derives the bridge: with p = q/w the hodograph numerator is
// N = q′w − qw′, the identity ‖N‖ = h·w holds, and therefore N = A i A* for a quaternion
// polynomial A of degree n−1. This module CONSTRUCTS that A and then checks it, because a
// derivation that ends in "therefore A exists" is not an implementation.
//
// THE CONSTRUCTION. Write A = u + vj with u, v complex polynomials. Expanding A i A* in the
// real coordinates A = a + bi + cj + dk gives the classical Hopf triple
//
//     N₁ = a²+b²−c²−d² = u u† − v v†      N₂ = 2(bc+ad) = 2 Im(uv)
//     N₃ = 2(bd−ac)    = −2 Re(uv)        ‖N‖ = |A|² = u u† + v v†
//
// (u† is u with its COEFFICIENTS conjugated, which is what |u(t)|² means for real t.) So
//
//     U := (‖N‖ + N₁)/2 = u u†     V := (‖N‖ − N₁)/2 = v v†     G := (−N₃ + iN₂)/2 = u·v
//
// U and V are non-negative real polynomials, and extracting u from U is a SUM OF TWO SQUARES
// factorisation: take the 2(n−1) roots of U, keep one from each conjugate pair, and u is their
// monic product times √lead(U). Which one to keep is not free — u divides G, so a kept root must
// be a root of G — and rather than decide that with a tolerance we simply try ALL 2^(n−1)
// selections (16 at degree 5) and keep the one whose reconstruction is best. v then comes from
// the exact division v = G/u.
//
// AND THE ANSWER IS VERIFIED, INDEPENDENTLY OF THE ALGEBRA ABOVE. The returned defects come
// from multiplying the quaternion polynomial out — A i A* coefficient by coefficient against N,
// and |A|² against h·w. If the root selection were wrong those numbers would be O(1), so the
// verification, not the selection heuristic, is what makes the result trustworthy. Measured at
// EVEN degree on members sitting at 1e-15: sandwich and norm 1e-11…1e-12, division remainder the
// same, and the selection gap between best and runner-up 1e7…1e10 — the pairing is decisive.
//
// IT ONLY WORKS AT EVEN DEGREE, and that is a theorem rather than a weakness of the code. Odd
// conformal degree is always REDUCIBLE (conformalPHHopf.test.ts): nullity gives ‖q‖² = 2w·c∞, an
// odd-degree w must have a real root r, so q(r) = 0 and (t−r) divides q, w and h alike. Then
// ‖N‖ = |h·w| = (t−r)²|h̃w̃| has a DOUBLE root, U inherits it, and a member 1e-9 from the variety
// splits that double root into two simple ones ~√1e-9 apart with U dipping NEGATIVE between them
// — no longer a sum of two squares, so no selection is right and the gap reads 1.0. The failure
// is REPORTED through the defects, never thrown or papered over: read them before trusting A.
//
// THE GAUGE, which is the reason any of this was wanted. u ↦ u·e^{iθ}, v ↦ v·e^{−iθ} leaves
// U, V and G alone — and that substitution is A ↦ A·e^{iθ}, so it leaves the CURVE alone. The
// extraction therefore has to make a choice, and it makes the continuous one: lead(u) real and
// positive. Everything a caller reads off A is then single-valued, and the phase that was
// quotiented is exactly the sandwich chain's gauge (phSpatialQuintic).
// ============================================================================
import { type Complex, cadd, cconj, cmul, cnorm, csub } from './complex'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale } from './quaternion'
import { type ConformalPHCurve, degreeOf } from './conformalPHCurve'

/** A real polynomial in the POWER basis: p(t) = Σ p[k] tᵏ. */
export type Poly = number[]
/** A complex polynomial in the power basis. */
export type CPoly = Complex[]

const C0: Complex = { re: 0, im: 0 }
const C1: Complex = { re: 1, im: 0 }

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** Bernstein coefficients to power basis: coeff of tᵏ is Σⱼ bⱼ C(m,j) C(m−j,k−j) (−1)^{k−j}. */
export function bernsteinToPower(b: readonly number[]): Poly {
  const m = b.length - 1
  return Array.from({ length: m + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= k; j++) {
      acc += b[j] * binom(m, j) * binom(m - j, k - j) * ((k - j) % 2 === 0 ? 1 : -1)
    }
    return acc
  })
}

const pscale = (p: Poly, k: number): Poly => p.map((v) => v * k)
const padd = (a: Poly, b: Poly): Poly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, k) => (a[k] ?? 0) + (b[k] ?? 0))
const psub = (a: Poly, b: Poly): Poly => padd(a, pscale(b, -1))

function pmul(a: Poly, b: Poly): Poly {
  const out = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}
const pderiv = (a: Poly): Poly =>
  a.length <= 1 ? [0] : Array.from({ length: a.length - 1 }, (_, k) => (k + 1) * a[k + 1])
export const pmax = (a: Poly): number => Math.max(...a.map(Math.abs))

const cpmul = (a: CPoly, b: CPoly): CPoly => {
  const out: Complex[] = new Array(a.length + b.length - 1).fill(C0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] = cadd(out[i + j], cmul(a[i], b[j]))
  return out
}
const cpeval = (a: CPoly, z: Complex): Complex => a.reduceRight((acc, c) => cadd(cmul(acc, z), c), C0)
const cpmax = (a: CPoly): number => Math.max(...a.map(cnorm))

/** a/b with the remainder reported — used where the division is exact in exact arithmetic. */
function cpdivide(a: CPoly, b: CPoly): { quotient: CPoly; remainder: number } {
  const db = b.length - 1
  const lead = b[db]
  const r = a.map((c) => ({ ...c }))
  const q: Complex[] = new Array(Math.max(0, a.length - db)).fill(C0)
  for (let k = a.length - 1 - db; k >= 0; k--) {
    const factor = cdivSafe(r[k + db], lead)
    q[k] = factor
    for (let j = 0; j <= db; j++) r[k + j] = csub(r[k + j], cmul(factor, b[j]))
  }
  return { quotient: q, remainder: Math.max(...r.slice(0, db).map(cnorm), 0) }
}

function cdivSafe(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im
  if (d === 0) return C0
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

/**
 * All roots of a complex polynomial by Durand–Kerner.
 *
 * Degree 8 at the curve degree we care about, and the iteration is only ever a GUESS here: the
 * caller verifies the factorisation it feeds, so a bad root costs accuracy in a reported defect
 * rather than producing a wrong answer silently.
 */
export function rootsOf(coefficients: CPoly): Complex[] {
  let c = coefficients.slice()
  while (c.length > 1 && cnorm(c[c.length - 1]) <= 1e-300) c = c.slice(0, -1)
  const m = c.length - 1
  if (m <= 0) return []
  const monic = c.map((z) => cdivSafe(z, c[m]))
  const seed: Complex = { re: 0.4, im: 0.9 }
  const z: Complex[] = []
  let p = C1
  for (let k = 0; k < m; k++) { p = cmul(p, seed); z.push(p) }
  for (let it = 0; it < 4000; it++) {
    let move = 0
    for (let k = 0; k < m; k++) {
      let denominator = C1
      for (let j = 0; j < m; j++) if (j !== k) denominator = cmul(denominator, csub(z[k], z[j]))
      if (cnorm(denominator) === 0) continue
      const step = cdivSafe(cpeval(monic, z[k]), denominator)
      z[k] = csub(z[k], step)
      move = Math.max(move, cnorm(step))
    }
    if (move < 1e-15) break
  }
  return z
}

// ---------------------------------------------------------------------------
// The hodograph numerator, in the power basis
// ---------------------------------------------------------------------------

export interface Hodograph {
  /** The denominator w, degree n — literally the o-components of the conformal polygon. */
  readonly w: Poly
  /** The homogeneous numerator q = w·p, degree n. */
  readonly q: readonly [Poly, Poly, Poly]
  /** N = q′w − qw′, degree 2n−2, with p′ = N/w². */
  readonly N: readonly [Poly, Poly, Poly]
  /** h·w, which the identity says is ‖N‖. The sign of h is chosen to make it non-negative. */
  readonly H: Poly
  /** max |coeff(N₁²+N₂²+N₃² − H²)|, relative — the identity ‖N‖ = h·w, as polynomials. */
  readonly squareDefect: number
  /**
   * What was thrown away by cutting N and H down to degree 2n−2, relative.
   *
   * Both products come out of the multiplication one or two degrees too high and the top
   * coefficients cancel — in N because the q′w and qw′ leading terms are equal, in H because h's
   * own leading power coefficient is pinned to zero (the family's one rank relation, see
   * conformalPHFamily.test.ts). The degree is therefore KNOWN, so it is imposed rather than
   * discovered by thresholding, and what the cancellation left behind is reported instead of
   * being quietly trimmed.
   */
  readonly truncationDefect: number
}

/** Everything the extraction needs, read off the conformal control points. */
export function hodograph(s: ConformalPHCurve): Hodograph {
  const n = degreeOf(s)
  const w = bernsteinToPower(s.C.map((c) => c[0]))
  const q: [Poly, Poly, Poly] = [
    bernsteinToPower(s.C.map((c) => c[1])),
    bernsteinToPower(s.C.map((c) => c[2])),
    bernsteinToPower(s.C.map((c) => c[3])),
  ]
  const dw = pderiv(w)
  const raw = q.map((qi) => psub(pmul(pderiv(qi), w), pmul(qi, dw)))
  let rawH = pmul(bernsteinToPower(s.h), w)
  // h is only defined up to sign by ⟨P′,P′⟩ = h², and ‖N‖ ≥ 0 picks the sign. Both signs are
  // members of the family, so this is a choice of representative, not a correction.
  if (rawH.reduce((acc, v, k) => acc + v / (k + 1), 0) < 0) rawH = pscale(rawH, -1)

  const keep = 2 * n - 1
  const scale = Math.max(...raw.map(pmax), pmax(rawH))
  const cut = (p: Poly): number => Math.max(0, ...p.slice(keep).map(Math.abs))
  const truncationDefect = Math.max(...raw.map(cut), cut(rawH)) / Math.max(scale, 1e-300)
  const N = raw.map((p) => p.slice(0, keep)) as unknown as [Poly, Poly, Poly]
  const H = rawH.slice(0, keep)

  const normSquared = N.reduce((acc, Ni) => padd(acc, pmul(Ni, Ni)), [0] as Poly)
  const gap = psub(normSquared, pmul(H, H))
  return {
    w, q, N, H, truncationDefect,
    squareDefect: pmax(gap) / Math.max(pmax(normSquared), 1e-300),
  }
}

// ---------------------------------------------------------------------------
// The extraction
// ---------------------------------------------------------------------------

export interface HopfForm {
  /** A in the power basis, degree n−1: A(t) = Σ Aₖ tᵏ, and w² p′ = A i A*. */
  readonly A: Quat[]
  readonly u: CPoly
  readonly v: CPoly
  readonly w: Poly
  /** max |coeff(A i A* − N)| relative — the quaternion polynomial multiplied out. */
  readonly sandwichDefect: number
  /** max |coeff(|A|² − h·w)| relative. */
  readonly normDefect: number
  /** The remainder of G/u, relative. Exact division in exact arithmetic. */
  readonly divisionDefect: number
  /** best defect ÷ second-best over the 2^{n−1} root selections. Large means the pairing is decisive. */
  readonly selectionGap: number
}

/** A i A* as three power-basis polynomials, by multiplying the quaternion polynomial out. */
export function sandwichPolynomial(A: readonly Quat[]): [Poly, Poly, Poly] {
  const m = A.length - 1
  const out: [Poly, Poly, Poly] = [
    new Array(2 * m + 1).fill(0), new Array(2 * m + 1).fill(0), new Array(2 * m + 1).fill(0),
  ]
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= m; j++) {
      const t = qmul(qmul(A[i], QUAT_I), qconj(A[j]))
      out[0][i + j] += t.v
      out[1][i + j] += t.p
      out[2][i + j] += t.q
    }
  }
  return out
}

/** |A(t)|² as a power-basis polynomial. */
export function normSquaredPolynomial(A: readonly Quat[]): Poly {
  const m = A.length - 1
  const out: Poly = new Array(2 * m + 1).fill(0)
  for (let i = 0; i <= m; i++) {
    for (let j = 0; j <= m; j++) {
      out[i + j] += A[i].u * A[j].u + A[i].v * A[j].v + A[i].p * A[j].p + A[i].q * A[j].q
    }
  }
  return out
}

const quatsOf = (u: CPoly, v: CPoly): Quat[] =>
  Array.from({ length: Math.max(u.length, v.length) }, (_, k) => ({
    u: u[k]?.re ?? 0, v: u[k]?.im ?? 0, p: v[k]?.re ?? 0, q: v[k]?.im ?? 0,
  }))

/** Group the roots of a real polynomial into conjugate pairs — nearest-to-the-conjugate, greedily. */
function conjugatePairs(z: readonly Complex[]): [Complex, Complex][] {
  const left = z.map((_, i) => i)
  const pairs: [Complex, Complex][] = []
  while (left.length > 1) {
    const i = left.shift() as number
    const target = cconj(z[i])
    let best = 0
    for (let k = 1; k < left.length; k++) {
      if (cnorm(csub(z[left[k]], target)) < cnorm(csub(z[left[best]], target))) best = k
    }
    const j = left.splice(best, 1)[0]
    pairs.push([z[i], z[j]])
  }
  return pairs
}

/**
 * Extract A. Every one of the 2^{n−1} conjugate-pair selections is tried and scored by how well
 * its A reproduces N; the best wins and its margin over the runner-up is reported.
 *
 * Returns null only if the curve has no usable hodograph at all (a constant, or a degenerate
 * denominator) — a poor extraction comes back WITH its defects rather than as a null, so the
 * caller sees the number instead of a silent failure.
 */
export function hopfForm(s: ConformalPHCurve): HopfForm | null {
  const hd = hodograph(s)
  const scaleN = Math.max(...hd.N.map(pmax))
  if (!(scaleN > 0) || !Number.isFinite(scaleN)) return null

  // V = (‖N‖ − N₁)/2 = v v† is not checked separately: |A|² = U + V and N₁ = U − V, so the two
  // reported defects already pin it.
  const U: Poly = padd(hd.H, hd.N[0]).map((v) => v / 2)
  const G: CPoly = Array.from({ length: Math.max(hd.N[1].length, hd.N[2].length) }, (_, k) => ({
    re: -(hd.N[2][k] ?? 0) / 2, im: (hd.N[1][k] ?? 0) / 2,
  }))
  const scaleG = Math.max(cpmax(G), 1e-300)

  // deg U = 2(n−1) exactly — hodograph() has already imposed it — so u has degree n−1 and there
  // are n−1 conjugate pairs to choose from. lead(U) = |lead(u)|² must be positive; if it is not,
  // this curve's U is degenerate and the caller should see a null rather than a rescued guess.
  const lead = U[U.length - 1]
  if (!(lead > 0)) return null
  const pairs = conjugatePairs(rootsOf(U.map((v) => ({ re: v, im: 0 }))))
  const scale = Math.sqrt(lead)

  let best: HopfForm | null = null
  let runnerUp = Infinity
  for (let mask = 0; mask < 1 << pairs.length; mask++) {
    let u: CPoly = [{ re: scale, im: 0 }]
    for (let k = 0; k < pairs.length; k++) {
      const root = pairs[k][(mask >> k) & 1]
      // one more monic factor (t − root)
      u = cpmul(u, [{ re: -root.re, im: -root.im }, C1])
    }
    const { quotient: v, remainder } = cpdivide(G, u)
    const A = quatsOf(u, v)
    const sand = sandwichPolynomial(A)
    const sandwichDefect = Math.max(...[0, 1, 2].map((i) => pmax(psub(sand[i], hd.N[i])))) / scaleN
    const normDefect = pmax(psub(normSquaredPolynomial(A), hd.H)) / Math.max(pmax(hd.H), 1e-300)
    const divisionDefect = remainder / scaleG
    const score = Math.max(sandwichDefect, normDefect, divisionDefect)
    if (best === null || score < Math.max(best.sandwichDefect, best.normDefect, best.divisionDefect)) {
      runnerUp = best === null ? Infinity : Math.max(best.sandwichDefect, best.normDefect, best.divisionDefect)
      best = { A, u, v, w: hd.w, sandwichDefect, normDefect, divisionDefect, selectionGap: 0 }
    } else if (score < runnerUp) runnerUp = score
  }
  if (best === null) return null
  const bestScore = Math.max(best.sandwichDefect, best.normDefect, best.divisionDefect)
  return { ...best, selectionGap: runnerUp / Math.max(bestScore, 1e-300) }
}

// ---------------------------------------------------------------------------
// Reading the gauge angles off A
// ---------------------------------------------------------------------------

/** A(t) — the generating quaternion, evaluated. */
export const generatorAt = (A: readonly Quat[], t: number): Quat =>
  A.reduceRight((acc, c) => qadd(qmul(acc, { u: t, v: 0, p: 0, q: 0 }), c), { u: 0, v: 0, p: 0, q: 0 } as Quat)

/**
 * The tangent direction of the gauge circle at X: d/dθ (X·e^{iθ}) = X·i.
 *
 * Wherever the sandwich X i X* and the norm |X|² are both held, the only motion left to X is
 * along this direction — which is what makes a single number (the component along it) the honest
 * reading of "the phase moved".
 */
export const gaugeDirection = (X: Quat): Quat => qmul(X, QUAT_I)

/** The component of a variation δX along X's gauge circle: δθ, in radians. */
export function phaseComponent(X: Quat, dX: Quat): number {
  const g = gaugeDirection(X)
  const nn = g.u * g.u + g.v * g.v + g.p * g.p + g.q * g.q
  if (nn === 0) return 0
  return (g.u * dX.u + g.v * dX.v + g.p * dX.p + g.q * dX.q) / nn
}

/** X's variation with its gauge component removed — what is left is a genuine shape change. */
export const withoutGauge = (X: Quat, dX: Quat): Quat =>
  qadd(dX, qscale(gaugeDirection(X), -phaseComponent(X, dX)))
