// ============================================================================
// RATIONAL PH SPACE CURVES WITH m POLES — the general form of rationalPHOnePoleSpatial.
//
// FOUNDATIONS F17: the no-log condition 𝒜′(rₖ) = 𝒜(rₖ)(Σₖ + λₖ i) is BILINEAR in (𝒜, λ), so fixing one
// twist rate per root leaves it LINEAR in 𝒜 — at any number of poles. The recipe is four steps and two
// of them are linear solves:
//
//     1. choose the roots of w                       (where the curve meets infinity)
//     2. choose one slider λₖ per root                (the frame twist there)
//     3. LINEAR solve for 𝒜                          (4m conditions, subspace 4(n+1) − 4m)
//     4. LINEAR solve p′w − pw′ = 𝒜i𝒜̄ for p          (the Wronskian)
//
// PH is a substitution throughout, exactly as in the one-pole module: 𝒜i𝒜̄ IS the Wronskian, so every
// admissible 𝒜 gives an exactly-PH curve and there is no invariant to hold.
//
// AND THE SWEEPABLE LOOP SURVIVES, which is the reason this module exists (multiPoleLoop.test.ts). With
// the λ's and roots held, prescribing c′(0) and c(1) leaves
//
//     fiber = 4(n+1) − 4m − 6 − 1 = 4n − 4m − 3
//
// which is ONE exactly when n = m + 1 — so each extra pole buys one more degree of curve AND one more
// twist dial while keeping the loop one-dimensional. Measured at m = 1, 2, 3 (curve degrees 4, 5, 6), and
// the two-pole loop closes after travelling 0.666 with a gap of 1.2e-3.
//
// ONE TRAP, PAID FOR ONCE (multiPoleLoop.test.ts): p is only determined up to p ↦ p + c₀w, so a
// least-squares solve leaves the translation to min-norm and c(1) stops being geometry. Here the
// translation is fixed EXPLICITLY by requiring p(0) = 0 — the curve starts at the origin — which is
// legitimate because w(0) ≠ 0 for roots outside the domain, so that row kills the kernel exactly.
//
// WHAT THIS MODULE DOES NOT COVER: the stratum 𝒜(rₖ) = 0. The condition was divided through by 𝒜(rₖ), and
// there the apparent pole CANCELS — the curve never reaches infinity — so the λ chart says nothing. F17.
// ============================================================================
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec, type Vec3 } from './quaternion'
import { leastSquares } from './linalg'

export interface MultiPoleParams {
  /** 𝒜's coefficients in the power basis, length n+1. */
  readonly A: readonly Quat[]
  /** The simple roots of w — where the curve passes through infinity. Must lie outside [0,1]. */
  readonly roots: readonly number[]
  /** One frame twist rate per root. */
  readonly lambdas: readonly number[]
}

export interface MultiPoleMember {
  readonly p: readonly number[][]
  readonly w: readonly number[]
  readonly N: readonly number[][]
  readonly sigma: readonly number[]
  /** Residual of the Wronskian solve — machine zero when 𝒜 is admissible. */
  readonly wronskian: number
  /** How far 𝒜 is from satisfying the no-log conditions, relative. */
  readonly noLog: number
}

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const UNITS: Quat[] = [Q(1, 0, 0, 0), Q(0, 1, 0, 0), Q(0, 0, 1, 0), Q(0, 0, 0, 1)]
const parts = (a: Quat): number[] => [a.u, a.v, a.p, a.q]
const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)
const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const derivPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

export const denominatorOf = (roots: readonly number[]): number[] =>
  roots.reduce<number[]>((acc, r) => {
    const out = new Array<number>(acc.length + 1).fill(0)
    for (let i = 0; i < acc.length; i++) { out[i + 1] += acc[i]; out[i] += -r * acc[i] }
    return out
  }, [1])

const sigmaAt = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

export const packSpinor = (A: readonly Quat[]): number[] => A.flatMap(parts)
export const unpackSpinor = (x: readonly number[]): Quat[] =>
  Array.from({ length: x.length / 4 }, (_, j) => Q(x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]))

/**
 * The no-log conditions as a matrix: four real rows per root, LINEAR in 𝒜 because the λ's are given.
 * That linearity is F17's content and it is what makes every step below a solve rather than a search.
 */
export function conditionMatrix(prm: MultiPoleParams): number[][] {
  const n = prm.A.length - 1
  const rows: number[][] = []
  for (let k = 0; k < prm.roots.length; k++) {
    const r = prm.roots[k]
    const rhs = Q(sigmaAt(prm.roots, k), prm.lambdas[k], 0, 0)
    const block: number[][] = [[], [], [], []]
    for (let j = 0; j <= n; j++) {
      for (const e of UNITS) {
        const col = parts(qadd(
          qscale(e, j === 0 ? 0 : j * Math.pow(r, j - 1)),
          qscale(qmul(e, rhs), -Math.pow(r, j)),
        ))
        for (let c = 0; c < 4; c++) block[c].push(col[c])
      }
    }
    rows.push(...block)
  }
  return rows
}

/**
 * An orthonormal basis for the admissible spinors — dimension 4(n+1) − 4m when the conditions are
 * independent.
 *
 * BY EXPLICIT COMPLEMENT, not by random probes, and the difference is a real bug rather than taste.
 * The previous version drew probe vectors and projected each off the row space with `leastSquares`.
 * At large |λ| the condition matrix is badly scaled — some rows carry λ and others do not — and that
 * solve then either threw (returning a basis of length ZERO) or returned no correction at all
 * (returning the whole 4(n+1)-dimensional space). Measured on the one-pole degree-2 family: length 0
 * at λ = 57.3, 80, 573 and length 12 at λ ≈ tan 88.8°, against a true dimension of 8 everywhere. That
 * is what made `withDial` fail at scattered angles with a data residual pinned at |target|: the solve
 * had no directions to move in.
 *
 * Orthonormalising the ROWS first makes the scaling irrelevant (each row is normalised), and
 * projecting the standard basis off that complement is deterministic and always returns exactly
 * cols − rank vectors.
 */
export function familyBasis(prm: MultiPoleParams): number[][] {
  const cols = 4 * prm.A.length
  const M = conditionMatrix(prm)
  // COLLIDED POLES make Σ infinite and the matrix non-finite. There is no admissible family there,
  // and returning a basis would be worse than returning none: the old probe code happened to throw,
  // which is why `withDial` refused a pole collision. Refuse it explicitly instead of by accident.
  if (!M.every((row) => row.every(Number.isFinite))) return []
  const scale = Math.max(...M.flatMap((row) => row.map(Math.abs)), 1e-300)

  // orthonormal basis of the ROW space
  const rows: number[][] = []
  for (const raw of M) {
    let v = raw.slice()
    for (const b of rows) { const d = dot(v, b); v = v.map((q, i) => q - d * b[i]) }
    const len = Math.hypot(...v)
    if (len > 1e-9 * scale) rows.push(v.map((q) => q / len))
  }

  // its orthogonal complement, from the standard basis
  const basis: number[][] = []
  for (let i = 0; i < cols && basis.length < cols - rows.length; i++) {
    let v: number[] = Array.from({ length: cols }, (_, j) => (i === j ? 1 : 0))
    for (const b of rows) { const d = dot(v, b); v = v.map((q, k) => q - d * b[k]) }
    for (const b of basis) { const d = dot(v, b); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > 1e-7) basis.push(v.map((q) => q / len))
  }
  return basis
}

/** Project 𝒜 onto the admissible subspace — used whenever a dial moves the conditions under it. */
export function projectToFamily(prm: MultiPoleParams): MultiPoleParams {
  const basis = familyBasis(prm)
  const x = packSpinor(prm.A)
  const y = new Array<number>(x.length).fill(0)
  for (const b of basis) { const d = dot(x, b); for (let i = 0; i < y.length; i++) y[i] += d * b[i] }
  return { ...prm, A: unpackSpinor(y) }
}

/** Build the member. Both solves are linear; the translation is fixed by p(0) = 0. */
export function toMember(prm: MultiPoleParams): MultiPoleMember {
  const A = prm.A
  const deg = 2 * (A.length - 1)
  const N = [0, 1, 2].map(() => new Array<number>(deg + 1).fill(0))
  const sigma = new Array<number>(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      N[0][i + j] += v.x
      N[1][i + j] += v.y
      N[2][i + j] += v.z
      sigma[i + j] += qmul(A[i], qconj(A[j])).u
    }
  }
  const w = denominatorOf(prm.roots)
  const wD = derivPoly(w)
  /**
   * deg p = 2n − m + 1 from integrating N/w²… UNLESS the denominator outranks it. ∫N/w² = q/w with
   * deg q ≤ m − 1, and the integration constant then makes p = q + Cw, of degree m. So the numerator
   * has degree max(2n − m + 1, m), and pinning p(0) = 0 with the smaller of the two is an inconsistent
   * system — measured: the Wronskian solve residual was 1.9e-2 at (n,m) = (3,4) where it is 1e-15
   * everywhere else. Unchanged for m ≤ n, where 2n − m + 1 ≥ m already.
   */
  const degP = Math.max(deg - (w.length - 1) + 1, w.length - 1)
  // The Wronskian rows, plus one row pinning the translation: p(0) = 0.
  const rows: number[][] = []
  for (let e = 0; e <= deg; e++) {
    const row = new Array<number>(degP + 1).fill(0)
    for (let k = 0; k <= degP; k++) {
      let acc = 0
      for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
      for (let a = 0; a < wD.length; a++) if (k + a === e) acc -= wD[a]
      row[k] = acc
    }
    rows.push(row)
  }
  const pinRow = new Array<number>(degP + 1).fill(0)
  pinRow[0] = 1
  const p: number[][] = []
  let wronskian = 0
  for (let c = 0; c < 3; c++) {
    const rhs = [...N[c], 0]
    const sol = leastSquares([...rows, pinRow], rhs, 1e-14)
    const scale = Math.max(...N[c].map(Math.abs), 1e-300)
    for (let e = 0; e <= deg; e++) {
      wronskian = Math.max(wronskian, Math.abs(dot(rows[e], sol) - N[c][e]) / scale)
    }
    p.push(sol)
  }
  // How far 𝒜 is from admissible, reported rather than assumed.
  const M = conditionMatrix(prm)
  const x = packSpinor(A)
  const xs = Math.max(Math.hypot(...x), 1e-300)
  const noLog = M.length === 0 ? 0 : Math.max(...M.map((row) => Math.abs(dot(row, x)))) / xs
  return { p, w, N, sigma, wronskian, noLog }
}

export const curveAt = (m: MultiPoleMember, t: number): Vec3 => {
  const wv = evalPoly(m.w, t)
  return { x: evalPoly(m.p[0], t) / wv, y: evalPoly(m.p[1], t) / wv, z: evalPoly(m.p[2], t) / wv }
}
export const derivativeAt = (m: MultiPoleMember, t: number): Vec3 => {
  const w2 = Math.pow(evalPoly(m.w, t), 2)
  return { x: evalPoly(m.N[0], t) / w2, y: evalPoly(m.N[1], t) / w2, z: evalPoly(m.N[2], t) / w2 }
}
export const speedAt = (m: MultiPoleMember, t: number): number =>
  Math.abs(evalPoly(m.sigma, t) / Math.pow(evalPoly(m.w, t), 2))

/** ‖c′‖ against σ/w². It cannot move: both sides are built from the same 𝒜. */
export function phDefect(m: MultiPoleMember): number {
  let worst = 0
  for (let k = 0; k <= 8; k++) {
    const t = k / 8
    const want = speedAt(m, t)
    const d = derivativeAt(m, t)
    worst = Math.max(worst, Math.abs(Math.hypot(d.x, d.y, d.z) - want) / Math.max(want, 1e-300))
  }
  return worst
}

const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}
const toBernstein = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let s = 0
    for (let j = 0; j <= k; j++) s += (binom(k, j) / binom(n, j)) * (a[j] ?? 0)
    return s
  })

/**
 * The rational Bézier control points and weights, for display. The projective sign gauge is fixed so the
 * weights read positive — (p, w) ↦ (−p, −w) is the same curve and leaves N and σ alone, but negative
 * weights would look like a pole the curve does not have.
 */
export function controlStructure(m: MultiPoleMember): { points: Vec3[]; weights: number[] } {
  const deg = Math.max(m.p[0].length, m.w.length) - 1
  const sign = evalPoly(m.w, 0) < 0 ? -1 : 1
  const wB = toBernstein(m.w.map((v) => v * sign), deg)
  const pB = m.p.map((c) => toBernstein(c.map((v) => v * sign), deg))
  return {
    weights: wB,
    points: wB.map((wk, k) => ({ x: pB[0][k] / wk, y: pB[1][k] / wk, z: pB[2][k] / wk })),
  }
}

/** The data the fiber is taken over: c′(0) and c(1). c(0) is the origin because p(0) = 0. */
export function dataOf(m: MultiPoleMember): number[] {
  const d0 = derivativeAt(m, 0)
  const e1 = curveAt(m, 1)
  return [d0.x, d0.y, d0.z, e1.x, e1.y, e1.z]
}

/**
 * The nine C¹ Hermite numbers: c′(0), c′(1), c(1) − c(0). Posable only where the fiber can supply them
 * — 4(n+1) − 4m must exceed 9 after the gauge, which at one pole first happens at DEGREE 6. The quartic
 * family has fiber 8 and the map has rank 7 of 9, which is why slides 3–4 hold `dataOf`'s six instead.
 */
export function hermiteOf(m: MultiPoleMember): number[] {
  const d0 = derivativeAt(m, 0), d1 = derivativeAt(m, 1)
  const s = curveAt(m, 0), e = curveAt(m, 1)
  return [d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, e.x - s.x, e.y - s.y, e.z - s.z]
}

/**
 * Any smooth readout a handle can be asked to hold. It gets the params as well as the member because
 * 𝒜 is NOT recoverable from a member — and the two fiber circles below are conditions on 𝒜 itself.
 */
export type Readout = (m: MultiPoleMember, prm: MultiPoleParams) => number[]

/** 𝒜 evaluated at t, in this module's monomial basis. */
export const spinorAt = (A: readonly Quat[], t: number): Quat =>
  A.reduce((s, a, k) => qadd(s, qscale(a, Math.pow(t, k))), Q(0, 0, 0, 0))

/** q ↦ q e^{iψ}. The Hopf gauge, applied to one quaternion. */
export const phaseRotate = (q: Quat, psi: number): Quat =>
  qadd(qscale(q, Math.cos(psi)), qscale(qmul(q, QUAT_I), Math.sin(psi)))

/**
 * ELEVEN numbers: 𝒜(0), 𝒜(1) and c(1) − c(0). This is the readout that makes the degree-6 fiber
 * SLIDERS honest, and the reason is worth stating because it took a wrong turn to find.
 *
 * The Hermite fiber at degree 6 is 2-dimensional, and a slider defined as "walk along a tangent
 * direction" is WRONG there: on a 2-torus a generic direction winds forever without closing, so the
 * handle would never come home. Measured — and measured on the polynomial quintic too, whose fiber is
 * a PROVABLE torus, where the same walk also failed to close. That is the geometry, not a bug.
 *
 * The way out is to take the circles the Hopf map already gives:
 *
 *     c′(0) = 𝒜(0) i 𝒜(0)* / w(0)²     ⟹ 𝒜(0) is free on a circle over c′(0)
 *     c′(1) = 𝒜(1) i 𝒜(1)* / w(1)²     ⟹ so is 𝒜(1)
 *
 * Pinning 𝒜(0) EXACTLY uses up the global gauge (𝒜 ↦ 𝒜e^{iθ} moves 𝒜(0)), and then the phase of 𝒜(1)
 * against it is a genuine circle coordinate: at ψ = 2π the target is identical, so the slider returns
 * to the same member by construction rather than by luck. Eleven conditions against a 12-dimensional
 * fiber leave ONE dimension — and one-dimensional fibers are what `fiberClosure` is verified to close.
 *
 * So the two sliders are: the phase ψ, and the leftover loop. Which is exactly the polynomial quintic's
 * three Hopf circles mod the diagonal gauge (`spatialQuinticTorus.test.ts`), rediscovered in the form
 * this chart can actually drive.
 */
export const spinorEndsAndSpan: Readout = (m, prm) => {
  const a0 = spinorAt(prm.A, 0), a1 = spinorAt(prm.A, 1)
  const s = curveAt(m, 0), e = curveAt(m, 1)
  return [a0.u, a0.v, a0.p, a0.q, a1.u, a1.v, a1.p, a1.q, e.x - s.x, e.y - s.y, e.z - s.z]
}

/** The `spinorEndsAndSpan` target with 𝒜(1) turned by ψ — the first fiber slider's whole definition. */
export function phaseTarget(prm: MultiPoleParams, psi: number): number[] {
  const base = spinorEndsAndSpan(toMember(prm), prm)
  const a1 = phaseRotate(spinorAt(prm.A, 1), psi)
  return [base[0], base[1], base[2], base[3], a1.u, a1.v, a1.p, a1.q, base[8], base[9], base[10]]
}

/** How close the nearest pole is to the drawn piece. Zero means infinity has reached the curve. */
export const poleMargin = (prm: MultiPoleParams): number =>
  Math.min(...prm.roots.map((r) => (r > 1 ? r - 1 : r < 0 ? -r : 0)))

// --- moving within the family ------------------------------------------------
const withSpinor = (prm: MultiPoleParams, x: readonly number[]): MultiPoleParams =>
  ({ ...prm, A: unpackSpinor(x) })

function readoutJacobian(
  prm: MultiPoleParams, basis: readonly number[][], coord: readonly number[], readout: Readout,
): number[][] {
  const at = (c: readonly number[]): number[] => {
    const x = new Array<number>(4 * prm.A.length).fill(0)
    basis.forEach((b, i) => { for (let j = 0; j < x.length; j++) x[j] += c[i] * b[j] })
    const q = withSpinor(prm, x)
    return readout(toMember(q), q)
  }
  return at(coord).map((_, k) => coord.map((_, j) => {
    const e = 1e-6
    const hi = coord.slice(); hi[j] += e
    const lo = coord.slice(); lo[j] -= e
    return (at(hi)[k] - at(lo)[k]) / (2 * e)
  }))
}

const coordsOf = (prm: MultiPoleParams, basis: readonly number[][]): number[] => {
  const x = packSpinor(prm.A)
  return basis.map((b) => dot(x, b))
}
const fromCoords = (prm: MultiPoleParams, basis: readonly number[][], c: readonly number[]): MultiPoleParams => {
  const x = new Array<number>(4 * prm.A.length).fill(0)
  basis.forEach((b, i) => { for (let j = 0; j < x.length; j++) x[j] += c[i] * b[j] })
  return withSpinor(prm, x)
}

/**
 * Min-norm Gauss-Newton back onto prescribed values of ANY readout, within the admissible subspace.
 * The λ's and roots are held, so this only ever moves 𝒜 — every iterate is exactly PH by construction.
 */
export function projectOnto(
  prm: MultiPoleParams, readout: Readout, target: readonly number[], iterations = 30,
): MultiPoleParams {
  const basis = familyBasis(prm)
  let c = coordsOf(prm, basis)
  for (let it = 0; it < iterations; it++) {
    const q = fromCoords(prm, basis, c)
    const r = readout(toMember(q), q).map((v, i) => v - target[i])
    if (Math.hypot(...r) < 1e-13) break
    try {
      const step = leastSquares(readoutJacobian(prm, basis, c, readout), r.map((v) => -v), 1e-12)
      c = c.map((v, j) => v + step[j])
    } catch { break }
  }
  return fromCoords(prm, basis, c)
}

/** Min-norm Gauss-Newton back onto prescribed `dataOf` — c′(0) and c(1). */
export function projectToData(
  prm: MultiPoleParams, target: readonly number[], iterations = 30,
): MultiPoleParams {
  return projectOnto(prm, dataOf, target, iterations)
}

/**
 * The fiber's tangent inside the admissible subspace, with the gauge stripped. The gauge 𝒜 ↦ 𝒜i
 * preserves the subspace (i commutes with Σ + λi), moves no curve, and would otherwise make the walk
 * drift invisibly. A single probe can land inside gauge-plus-rowspace, so each coordinate is tried.
 */
export function fiberTangent(
  prm: MultiPoleParams, orient?: readonly number[], readout: Readout = dataOf,
): number[] | null {
  const basis = familyBasis(prm)
  const coord = coordsOf(prm, basis)
  const J = readoutJacobian(prm, basis, coord, readout)
  const gi = prm.A.flatMap((q) => parts(qmul(q, QUAT_I)))
  const g = basis.map((b) => dot(gi, b))
  // STRIP THE GAUGE ONLY WHERE IT IS IN THE KERNEL. It always is for readouts of the CURVE (the gauge
  // moves no curve), but `spinorEndsAndSpan` pins 𝒜(0) itself, which the gauge does move — there the
  // gauge is not a kernel direction, and subtracting it would push the tangent OUT of the kernel.
  const jScale = Math.max(...J.map((row) => Math.hypot(...row)), 1e-300)
  const gDir = Math.hypot(...g) > 0 ? g.map((v) => v / Math.hypot(...g)) : g
  const gn = Math.hypot(...J.map((row) => dot(row, gDir))) < 1e-7 * jScale ? Math.hypot(...g) : 0
  const probes = orient ? [orient, ...basis.map((_, i) => basis.map((__, j) => (i === j ? 1 : 0)))]
    : basis.map((_, i) => basis.map((__, j) => (i === j ? 1 : 0)))
  for (const probe of probes) {
    let v: number[]
    try {
      const corr = leastSquares(J, J.map((row) => dot(row, probe)), 1e-12)
      v = probe.map((q, i) => q - corr[i])
    } catch { continue }
    if (gn > 0) { const gh = g.map((q) => q / gn); const d = dot(v, gh); v = v.map((q, i) => q - d * gh[i]) }
    const len = Math.hypot(...v)
    if (len > 1e-8) {
      const unit = v.map((q) => q / len)
      return orient && dot(unit, orient) < 0 ? unit.map((q) => -q) : unit
    }
  }
  return null
}

/**
 * How far apart two spinors are AS CURVES: the Euclidean gap modulo the Hopf gauge 𝒜 ↦ 𝒜e^{iθ}, which
 * moves no curve. Exact and complete — same 𝒜 mod gauge ⟺ the same curve at every t, so this needs no
 * sampling and has no window to hide outside of. Relative to |𝒜|.
 *
 * `x` and `xi = 𝒜i` are orthogonal and of equal length (⟨q, qi⟩ = Re(−q i q̄) = 0, and right
 * multiplication by a unit quaternion is an isometry), so the best θ is a projection onto their span:
 * θ = atan2(⟨y, xi⟩, ⟨y, x⟩).
 *
 * The residual is then formed as a VECTOR and normed, not as √(|x|² + |y|² − 2⟨·⟩). The closed form is
 * the same number in exact arithmetic, but it subtracts two nearly-equal quantities and so floors out
 * near √ε: it reported an exact 0 at a return whose true gap was 1e-9.
 */
export function gaugeDistance(a: readonly Quat[], b: readonly Quat[]): number {
  const x = packSpinor(a)
  const xi = a.flatMap((q) => parts(qmul(q, QUAT_I)))
  const y = packSpinor(b)
  const nx = Math.hypot(...x)
  const theta = Math.atan2(dot(y, xi), dot(y, x))
  const c = Math.cos(theta), s = Math.sin(theta)
  return Math.hypot(...y.map((v, i) => v - c * x[i] - s * xi[i])) / Math.max(nx, 1e-300)
}

/**
 * The largest gap between two members' tangent indicatrices, over a range that deliberately runs
 * OUTSIDE the drawn piece. T = c′/‖c′‖ is a unit vector everywhere, so no sample can dominate the
 * measure the way a curve point near a pole would — this is the one quantity that is safe to sample
 * past the pole. It is also the picture the closure argument is made in: the indicatrix back where it
 * started after a full turn.
 */
export function indicatrixDistance(
  a: MultiPoleParams, b: MultiPoleParams, span: readonly [number, number] = [-2, 2], samples = 120,
): number {
  const ma = toMember(a), mb = toMember(b)
  let worst = 0
  for (let i = 0; i <= samples; i++) {
    const t = span[0] + ((span[1] - span[0]) * i) / samples
    const u = derivativeAt(ma, t), v = derivativeAt(mb, t)
    const nu = Math.hypot(u.x, u.y, u.z), nv = Math.hypot(v.x, v.y, v.z)
    if (!(nu > 0) || !(nv > 0)) continue
    worst = Math.max(worst, Math.hypot(u.x / nu - v.x / nv, u.y / nu - v.y / nv, u.z / nu - v.z / nv))
  }
  return worst
}

/**
 * Walk the fiber all the way round with the λ's and roots held, and report how far it is from closing.
 *
 * THE STOPPING RULE IS THE WHOLE POINT, and the old one was the bug. It stopped when three curve points
 * on t ∈ [0,1] came within 4e-3 — a coarse trigger on the drawn piece. Measured: the closest approach
 * to the start was ALWAYS the last step taken, i.e. the walk was still coming back when the rule fired,
 * and at that moment the full indicatrix over t ∈ [−2,2] was still 0.49 away on a unit sphere. The
 * drawn piece had returned; the curve had not.
 *
 * This rule measures the gap modulo the Hopf gauge (exact, no window), waits for the walk to LEAVE
 * before a return can mean anything, detects the closest approach instead of a threshold crossing, and
 * then refines the final step onto it by golden section. The distance is V-shaped at a true return, so
 * a bracketing search is the right tool and a smooth one would not be.
 *
 * THE CONTROL is the polynomial PH CUBIC. There the six numbers held here — c′(0) and c(1) — cut out a
 * provable Hopf circle (`spatialQuinticTorus.test.ts` completes the square for it), so the walk MUST
 * close. Note which control: on the polynomial QUINTIC the same six numbers leave a FIVE-dimensional
 * fiber with no loop in it at all, which is what the earlier "|𝒜| grows 5 → 34 and never closes" was
 * actually measuring. → `fiberClosure.test.ts`
 */
export function fiberClosure(
  prm: MultiPoleParams,
  options: {
    stride?: number; maxSteps?: number; readout?: Readout
    /**
     * Which way to set off. Only meaningful when the fiber has more than one dimension — there
     * `fiberTangent` picks whichever probe survives first, which is arbitrary, and the two degree-6
     * fiber sliders each need a road of their OWN. The walk then transports this direction: each step
     * projects the previous one onto the new fiber tangent space.
     */
    direction?: readonly number[]
  } = {},
): { loop: MultiPoleParams[]; gap: number; closed: boolean } {
  const stride = options.stride ?? 0.05
  const maxSteps = options.maxSteps ?? 900
  const readout = options.readout ?? dataOf
  const target = readout(toMember(prm), prm)
  const holds = (q: MultiPoleParams): boolean =>
    Math.hypot(...readout(toMember(q), q).map((v, i) => v - target[i])) <= 1e-8

  /** One step of size h along t, then back onto the data. h may be negative or fractional. */
  const advance = (cur: MultiPoleParams, t: readonly number[], h: number): MultiPoleParams => {
    const basis = familyBasis(cur)
    return projectOnto(fromCoords(cur, basis, coordsOf(cur, basis).map((v, i) => v + h * t[i])), readout, target)
  }

  const out: MultiPoleParams[] = [prm]
  const tans: (readonly number[])[] = []
  const dist: number[] = [0]
  let cur = prm
  let t = fiberTangent(cur, options.direction, readout)
  let far = 0
  let closed = false
  for (let step = 1; step <= maxSteps && t; step++) {
    tans.push(t)
    const next = advance(cur, t, stride)
    if (!holds(next)) break
    const d = gaugeDistance(prm.A, next.A)
    // A return is a turn taken NEAR THE START, after the walk has genuinely left. Both halves are
    // needed: the distance-to-start is not monotone along the loop, so "it turned" alone fires on the
    // first local dip — measured, at step 7 of 136 — and "it is close" alone fires before departure.
    const left = far > 10 * dist[1]
    const turned = left && d < 0.2 * far && d > dist[dist.length - 1]
    far = Math.max(far, d)
    out.push(next)
    dist.push(d)
    cur = next
    t = fiberTangent(cur, t, readout)
    if (turned) { closed = true; break }
  }

  if (closed) {
    // out[j] is the closest sample; the true return lies within one stride either side of it.
    const j = out.length - 2
    const tj = tans[j]
    const f = (h: number): number => gaugeDistance(prm.A, advance(out[j], tj, h).A)
    const phi = (Math.sqrt(5) - 1) / 2
    let lo = -stride, hi = stride
    let x1 = hi - phi * (hi - lo), x2 = lo + phi * (hi - lo)
    let f1 = f(x1), f2 = f(x2)
    for (let i = 0; i < 32 && hi - lo > 1e-10 * stride; i++) {
      if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - phi * (hi - lo); f1 = f(x1) }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + phi * (hi - lo); f2 = f(x2) }
    }
    const landing = advance(out[j], tj, f1 < f2 ? x1 : x2)
    out.length = j + 1
    if (holds(landing)) out.push(landing)
  }
  return { loop: out, gap: gaugeDistance(prm.A, out[out.length - 1].A), closed }
}

/**
 * A BOUNDED road through the fiber: `steps` strides each way along the one transported direction the
 * readout leaves free, centred on `prm`. Used where a loop is not available or not affordable — at
 * degree 6 the leftover fiber at fixed 𝒜(0), 𝒜(1) has not been walked round (`degree6TwoCircles`), so
 * the second slider is a road with no full-turn claim rather than a circle pretending to be one.
 *
 * Returns the members in order, so index 0 is one end and the last is the other; `steps` is the index
 * of the member passed in.
 */
export function fiberRoad(
  prm: MultiPoleParams,
  options: { stride?: number; steps?: number; readout?: Readout } = {},
): MultiPoleParams[] {
  const stride = options.stride ?? 0.08
  const steps = options.steps ?? 30
  const readout = options.readout ?? dataOf
  const target = readout(toMember(prm), prm)
  const holds = (q: MultiPoleParams): boolean =>
    Math.hypot(...readout(toMember(q), q).map((v, i) => v - target[i])) <= 1e-7

  const half = (sign: number): MultiPoleParams[] => {
    const out: MultiPoleParams[] = []
    let cur = prm
    let t = fiberTangent(cur, undefined, readout)
    if (t && sign < 0) t = t.map((v) => -v)
    for (let k = 0; k < steps && t; k++) {
      const basis = familyBasis(cur)
      const next = projectOnto(
        fromCoords(cur, basis, coordsOf(cur, basis).map((v, i) => v + stride * t![i])), readout, target)
      if (!holds(next)) break
      out.push(next)
      cur = next
      t = fiberTangent(cur, t, readout)
    }
    return out
  }
  return [...half(-1).reverse(), prm, ...half(1)]
}

/** Walk the fiber all the way round with the λ's and roots held. See `fiberClosure` for the rule. */
export function fiberLoop(
  prm: MultiPoleParams,
  options: { stride?: number; maxSteps?: number; readout?: Readout } = {},
): MultiPoleParams[] {
  return fiberClosure(prm, options).loop
}

/** Re-solve the same data after moving one twist rate or one pole. */
export function withDial(
  prm: MultiPoleParams,
  target: readonly number[],
  dial: { lambda?: { index: number; value: number }; pole?: { index: number; value: number } },
): MultiPoleParams | null {
  const lambdas = prm.lambdas.slice()
  const roots = prm.roots.slice()
  if (dial.lambda) lambdas[dial.lambda.index] = dial.lambda.value
  if (dial.pole) roots[dial.pole.index] = dial.pole.value
  const moved = projectToFamily({ ...prm, lambdas, roots })
  const solved = projectToData(moved, target)
  const err = Math.hypot(...dataOf(toMember(solved)).map((v, i) => v - target[i]))
  return err < 1e-6 && poleMargin(solved) > 1e-3 ? solved : null
}

/**
 * FREE drag: control point `index` toward `target`, spending the whole admissible subspace by minimum
 * norm. Nothing is held, and PH is still unavailable for violation.
 */
export function dragControlPoint(
  prm: MultiPoleParams, index: number, target: Vec3, options: { maxStep?: number } = {},
): MultiPoleParams | null {
  const basis = familyBasis(prm)
  const points = controlStructure(toMember(prm)).points
  const scale = Math.max(
    ...points.map((q, i) => (i === index ? 0 : Math.hypot(q.x - points[index].x, q.y - points[index].y, q.z - points[index].z))),
    1e-9,
  )
  const off = { x: target.x - points[index].x, y: target.y - points[index].y, z: target.z - points[index].z }
  const reach = Math.hypot(off.x, off.y, off.z)
  if (!(reach > 1e-12)) return prm
  const k = Math.min(reach, (options.maxStep ?? 0.12) * scale) / reach
  const want = [points[index].x + off.x * k, points[index].y + off.y * k, points[index].z + off.z * k]

  let c = coordsOf(prm, basis)
  const residual = (q: readonly number[]): number[] => {
    const pt = controlStructure(toMember(fromCoords(prm, basis, q))).points[index]
    return [pt.x - want[0], pt.y - want[1], pt.z - want[2]]
  }
  for (let it = 0; it < 20; it++) {
    const r = residual(c)
    if (Math.hypot(...r) < 1e-12) break
    const J = r.map((_, row) => c.map((_, j) => {
      const e = 1e-7
      const hi = c.slice(); hi[j] += e
      const lo = c.slice(); lo[j] -= e
      return (residual(hi)[row] - residual(lo)[row]) / (2 * e)
    }))
    try { const st = leastSquares(J, r.map((v) => -v), 1e-10); c = c.map((v, j) => v + st[j]) } catch { return null }
  }
  return fromCoords(prm, basis, c)
}

/** A degree-5 two-pole seed: n = 3, m = 2, so the fiber is 4n − 4m − 3 = 1 and the loop closes. */
export function seedQuintic(): MultiPoleParams {
  const prm: MultiPoleParams = {
    A: [Q(1.0, 0.3, -0.4, 0.2), Q(0.25, -0.5, 0.15, 0.35), Q(-0.2, 0.4, 0.1, -0.3), Q(0.15, 0.1, -0.25, 0.2)],
    roots: [1.7, -0.9],
    lambdas: [0.6, -0.35],
  }
  return projectToFamily(prm)
}

/**
 * FREE drag with the FAR END HELD — the m-pole twin of the one-pole function of the same name.
 *
 * c(0) is already immovable (p(0) = 0 pins the translation), so only c(1) is added: 6 conditions against
 * the 8-dimensional admissible subspace, hence underdetermined and spent by minimum norm. The twist rates
 * and the poles are held, as they are for the plain free drag — those are dials, not drag slack.
 *
 * `index` may be null for the "move only the endpoint" case.
 */
export function dragWithEndHeld(
  prm: MultiPoleParams,
  index: number | null,
  target: Vec3 | null,
  endTarget: Vec3,
  options: { maxStep?: number; iterations?: number } = {},
): MultiPoleParams | null {
  const basis = familyBasis(prm)
  const points = controlStructure(toMember(prm)).points
  let want: Vec3 | null = null
  if (index !== null && target !== null) {
    const scale = Math.max(
      ...points.map((q, i) => (i === index
        ? 0
        : Math.hypot(q.x - points[index].x, q.y - points[index].y, q.z - points[index].z))),
      1e-9,
    )
    const off = {
      x: target.x - points[index].x, y: target.y - points[index].y, z: target.z - points[index].z,
    }
    const reach = Math.hypot(off.x, off.y, off.z)
    const k = reach > 1e-12 ? Math.min(reach, (options.maxStep ?? 0.12) * scale) / reach : 0
    want = { x: points[index].x + off.x * k, y: points[index].y + off.y * k, z: points[index].z + off.z * k }
  }

  let c = coordsOf(prm, basis)
  const residual = (q: readonly number[]): number[] => {
    const mem = toMember(fromCoords(prm, basis, q))
    const end = curveAt(mem, 1)
    const rows = [end.x - endTarget.x, end.y - endTarget.y, end.z - endTarget.z]
    if (index !== null && want) {
      const pt = controlStructure(mem).points[index]
      rows.push(pt.x - want.x, pt.y - want.y, pt.z - want.z)
    }
    return rows
  }
  for (let it = 0; it < (options.iterations ?? 20); it++) {
    const r = residual(c)
    if (Math.hypot(...r) < 1e-12) break
    const J = r.map((_, k) => c.map((_, j) => {
      const e = 1e-7
      const hi = c.slice(); hi[j] += e
      const lo = c.slice(); lo[j] -= e
      return (residual(hi)[k] - residual(lo)[k]) / (2 * e)
    }))
    try { const st = leastSquares(J, r.map((v) => -v), 1e-10); c = c.map((v, j) => v + st[j]) } catch { return null }
  }
  const out = fromCoords(prm, basis, c)
  return poleMargin(out) > 1e-3 ? out : null
}
