// ============================================================================
// HOW MUCH OF THE RATIONAL PH CURVES OF A GIVEN DEGREE DOES OUR CHART REACH?
//
// THE QUESTION, made answerable. "Navigate the entire space" is an aspiration until it is a number.
// This module turns it into one, LOCALLY and honestly, by comparing two tangent spaces at a point we
// actually occupy:
//
//     T_ambient   the tangent space of ALL parametrised rational PH curves of degree d
//     T_family    the tangent space of what the λ-chart reaches from there
//
// T_family ⊆ T_ambient always. The gap between their dimensions is the number of directions the
// chart cannot move in, and — this is the part worth having — the missing directions come out as
// VECTORS, so we can look at them and ask what they do.
//
// WHY TANGENT SPACES RATHER THAN COUNTING. The obvious count at degree 4 is 20 coefficients, minus
// the projective scale, minus 6 conditions = 13, against 11 for the chart. That subtraction assumes
// the six conditions are independent, and independence is exactly what this project keeps finding is
// not automatic (F17 corrected one such count; the Bézout bound corrected another). A Jacobian rank
// at the point of interest assumes nothing.
//
// THE AMBIENT, and the convention matters. A parametrised rational Bézier of degree d is c = p/w with
// deg p, deg w ≤ d — 4(d+1) real coefficients — and (p,w) ↦ (cp,cw) is the same curve, so the radial
// direction is a gauge and is quotiented out of both sides. PARAMETRISED is deliberate: PH is a
// property of the parametrisation, not of the point set (Kalkan et al. §2 — the parabola is not PH
// and a rational reparametrisation of it is), so reparametrisations are genuine motions here and are
// counted, not divided out.
//
// THE CONDITION. N = p′w − pw′ has degree ≤ 2d − 2, so q = |N|² has degree ≤ 4d − 4 and PH says q is
// the square of a polynomial of degree 2d − 2. The series root fixes that polynomial's coefficients
// and leaves 2d − 2 forced ones: those are the equations. Their shift point is FIXED across a
// Jacobian, since the argmax choice `squareRootDefect` makes would jump under differencing.
//
// THE FAMILY'S TANGENT is assembled directly rather than by parametrising, because the admissible
// subspace itself moves when λ or the pole moves. Its columns are, at a member (𝒜, λ, r):
//
//     8   the fibre — familyBasis at the CURRENT λ and r, which is already tangent to the family
//     m   one per dial: project 𝒜 onto the admissible subspace at λ ± ε and difference
//     m   one per pole: the same, with w changing too
//     3   translations, p ↦ p + τ·w
//
// The Hopf gauge 𝒜 ↦ 𝒜e^{iθ} lies inside the fibre span and maps to zero motion, so the rank comes
// out one below the column count — which is a check on the assembly rather than a nuisance.
//
// WHAT THIS DOES AND DOES NOT PROVE. Full rank means the chart covers an OPEN NEIGHBOURHOOD of that
// point — not the whole variety. Other components can exist that it never touches; at degree 4 the
// three-pole family is exactly such a component. So the honest deliverable is a table by component,
// not a single verdict.
// ============================================================================
import { hodographNumerator, squareRootMismatch, type RationalCurve } from './rationalCurveBlend'
import { orthonormalise } from './sp11RationalPH'
import {
  type MultiPoleParams,
  denominatorOf,
  familyBasis,
  packSpinor,
  toMember,
  unpackSpinor,
} from './rationalPHMultiPoleSpatial'

/** (p, w) flattened at FIXED degrees, so every member of an ambient lives in one ℝⁿ. */
export function packCurve(c: RationalCurve, degP: number, degW: number): number[] {
  const out: number[] = []
  for (let k = 0; k < 3; k++) for (let i = 0; i <= degP; i++) out.push(c.p[k][i] ?? 0)
  for (let i = 0; i <= degW; i++) out.push(c.w[i] ?? 0)
  return out
}

export function unpackCurve(x: readonly number[], degP: number, degW: number): RationalCurve {
  const p = [0, 1, 2].map((k) => Array.from({ length: degP + 1 }, (_, i) => x[k * (degP + 1) + i]))
  const w = Array.from({ length: degW + 1 }, (_, i) => x[3 * (degP + 1) + i])
  return { p, w }
}

/**
 * The PH equations at a fixed shift: 2d − 2 numbers, zero exactly on the variety. Scaled by q(t₀) so
 * the rows of a Jacobian built from them are comparable in size.
 */
export function phEquations(x: readonly number[], degP: number, degW: number, t0: number): number[] {
  const c = unpackCurve(x, degP, degW)
  const N = hodographNumerator(c)
  const len = Math.max(...N.map((n) => n.length))
  const q = new Array<number>(2 * len).fill(0)
  for (const n of N) {
    for (let i = 0; i < n.length; i++) for (let j = 0; j < n.length; j++) q[i + j] += n[i] * n[j]
  }
  const half = Math.max(degP, degW) * 2 - 2
  return squareRootMismatch(q, half, t0)
}

const rankOf = (rows: readonly number[][], tol = 1e-7): number => orthonormalise(rows, tol).length

/** Central differences. The map is polynomial in x, so this is the true Jacobian up to round-off. */
export function jacobianOf(
  f: (x: readonly number[]) => number[], x: readonly number[], step = 1e-5,
): number[][] {
  const m = f(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = step * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = f(hi), fl = f(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}

/** An orthonormal basis of the nullspace of `rows` — the tangent space the equations cut out. */
export function nullspaceOf(rows: readonly number[][], cols: number, tol = 1e-7): number[][] {
  const basis = orthonormalise(rows, tol)
  const out: number[][] = []
  for (let i = 0; i < cols; i++) {
    let v: number[] = Array.from({ length: cols }, (_, j) => (i === j ? 1 : 0))
    for (const b of basis) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    for (const b of out) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > 1e-7) out.push(v.map((q) => q / len))
  }
  return out
}

/** The orthogonal projection of 𝒜's coefficient vector onto the admissible subspace at (λ, roots). */
function projectOntoFibre(x: readonly number[], roots: readonly number[], lambdas: readonly number[]): number[] {
  const n = x.length / 4 - 1
  const prm: MultiPoleParams = {
    A: unpackSpinor(new Array<number>(4 * (n + 1)).fill(0)), roots, lambdas,
  }
  const B = familyBasis(prm)
  const out = new Array<number>(x.length).fill(0)
  for (const b of B) {
    const d = x.reduce((s, v, i) => s + v * b[i], 0)
    for (let i = 0; i < out.length; i++) out[i] += d * b[i]
  }
  return out
}

const curveOf = (prm: MultiPoleParams): RationalCurve => {
  const m = toMember(prm)
  return { p: m.p as number[][], w: m.w as number[] }
}

/**
 * The columns of T_family at a member, in the ambient's coordinates. See the header for what each
 * block is; the assembly is direct because the admissible subspace itself moves with λ and r.
 */
export function familyTangent(prm: MultiPoleParams, degP: number, degW: number, eps = 1e-4): number[][] {
  const x0 = packSpinor(prm.A)
  const cols: number[][] = []
  /**
   * CENTRAL differences throughout, and that is not a refinement. Every column is a SECANT between
   * two points that both lie on the variety, so a one-sided difference carries O(ε) error — about
   * 1e-4 here, which is far above the 1e-7 tolerance the rank tests use. The first version of this
   * file used one-sided differences for the fibre block and the result was incoherent: it reported a
   * gap of 2 while producing 4 missing directions, which is impossible if T_family ⊆ T_ambient.
   * Central differences are O(ε²) and the contradiction goes away.
   */
  const central = (bump: (d: number) => number[]): void => {
    const hi = bump(eps), lo = bump(-eps)
    cols.push(hi.map((v, i) => (v - lo[i]) / (2 * eps)))
  }

  for (const b of familyBasis(prm)) {
    central((d) => packCurve(curveOf({ ...prm, A: unpackSpinor(x0.map((v, i) => v + d * b[i])) }), degP, degW))
  }
  for (let k = 0; k < prm.lambdas.length; k++) {
    central((d) => {
      const lam = prm.lambdas.slice(); lam[k] += d
      const A = unpackSpinor(projectOntoFibre(x0, prm.roots, lam))
      return packCurve(curveOf({ ...prm, A, lambdas: lam }), degP, degW)
    })
  }
  for (let k = 0; k < prm.roots.length; k++) {
    central((d) => {
      const rt = prm.roots.slice(); rt[k] += d
      const A = unpackSpinor(projectOntoFibre(x0, rt, prm.lambdas))
      return packCurve(curveOf({ ...prm, A, roots: rt }), degP, degW)
    })
  }
  // translations: c ↦ c + τ means p ↦ p + τ·w, exactly and with no difference at all
  const w = denominatorOf(prm.roots)
  for (let axis = 0; axis < 3; axis++) {
    const v = new Array<number>(3 * (degP + 1) + (degW + 1)).fill(0)
    for (let i = 0; i < w.length && i <= degP; i++) v[axis * (degP + 1) + i] = w[i]
    cols.push(v)
  }
  return cols
}

export interface CoverageReport {
  /** Dimension of the ambient PH variety at this point, curves counted (radial gauge removed). */
  ambient: number
  /** Dimension of what the chart reaches, same convention. */
  family: number
  /** ambient − family: the number of directions the chart cannot move in. */
  gap: number
  /** An orthonormal basis of those directions, in (p, w) coordinates. */
  missing: number[][]
  /** Rank of the PH equations here — the honest codimension, not the counted one. */
  codimension: number
  /** Worst |PH equation| at the point, so a report on a member that is not actually PH is visible. */
  residual: number
  /**
   * How far the family's own tangent columns lie OUT of the ambient tangent space, relative. It must
   * be ~0: the family is inside the variety, so its tangent is inside the variety's tangent. Anything
   * else means the columns are bad numerics rather than geometry, and every number above is then
   * meaningless. Reported rather than assumed, because the first version of this file failed it
   * silently and produced a self-contradictory answer.
   */
  containment: number
}

/** The whole comparison at one member. */
export function coverageAt(prm: MultiPoleParams, degP: number, degW: number): CoverageReport {
  const base = packCurve(curveOf(prm), degP, degW)
  const dim = base.length
  const t0 = 0.5
  const f = (x: readonly number[]): number[] => phEquations(x, degP, degW, t0)

  const J = jacobianOf(f, base)
  const codimension = rankOf(J)
  const tangent = nullspaceOf(J, dim)

  // The radial direction is a gauge — (p,w) and (cp,cw) are one curve — so it is removed from both.
  const radial = base.map((v) => v / (Math.hypot(...base) || 1))
  const strip = (cols: readonly number[][]): number[][] => {
    const rows = cols.map((c) => {
      const d = c.reduce((s, v, i) => s + v * radial[i], 0)
      return c.map((v, i) => v - d * radial[i])
    })
    return orthonormalise(rows, 1e-7)
  }

  const rawFamily = familyTangent(prm, degP, degW)
  // Does each family column actually satisfy the linearised PH conditions?
  const jScale = Math.max(...J.flatMap((row) => row.map(Math.abs)), 1e-300)
  let containment = 0
  for (const c of rawFamily) {
    const n = Math.hypot(...c) || 1
    for (const row of J) {
      containment = Math.max(containment, Math.abs(row.reduce((s, v, i) => s + v * c[i], 0)) / (jScale * n))
    }
  }

  const ambientBasis = strip(tangent)
  const familyBasisCols = strip(rawFamily)

  // What is in the ambient tangent but not in the family's span.
  const missing: number[][] = []
  for (const a of ambientBasis) {
    let v = a.slice()
    for (const b of familyBasisCols) { const d = v.reduce((s, q, i) => s + q * b[i], 0); v = v.map((q, i) => q - d * b[i]) }
    for (const b of missing) { const d = v.reduce((s, q, i) => s + q * b[i], 0); v = v.map((q, i) => q - d * b[i]) }
    const len = Math.hypot(...v)
    if (len > 1e-5) missing.push(v.map((q) => q / len))
  }

  return {
    ambient: ambientBasis.length,
    family: familyBasisCols.length,
    gap: ambientBasis.length - familyBasisCols.length,
    missing,
    codimension,
    residual: Math.max(...f(base).map(Math.abs)),
    containment,
  }
}

/**
 * What a missing direction DOES, reported in terms a reader can act on: how much of it is a change of
 * the denominator (hence of the pole structure) against a change of the numerator alone.
 */
export function describeDirection(v: readonly number[], degP: number): {
  numerator: number; denominator: number
} {
  const nP = 3 * (degP + 1)
  const num = Math.hypot(...v.slice(0, nP))
  const den = Math.hypot(...v.slice(nP))
  const total = Math.hypot(num, den) || 1
  return { numerator: num / total, denominator: den / total }
}
