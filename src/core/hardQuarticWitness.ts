// ============================================================================
// THE λ-CHART QUARTIC WITH A GENUINE HARD REAL POLE — the witness three files need.
//
// σ(1.7) ≈ 8.2, so this curve is as far from soft as a pole gets, and it is the specimen that
// pins the two halves of the pole story:
//
//   · in the PROJECTIVE model (P, w, ρ) it is an ordinary member at its own degree 4, isotropy
//     1.0 at the pole — hard poles are representable there (nurbsPHConditioning);
//   · lifted to ℝ^{4,1} it can only appear as a DOUBLED pole with a cancelling numerator, because
//     ⟨C,C⟩ ≡ 0 forces every pole isotropic (conformalPolesAreSoft).
//
// It lives here rather than in either test because it had drifted into two byte-identical copies
// and was about to acquire a third. Two copies of a numerical fixture is two curves the day one of
// them is edited, and the tests would go on agreeing about a specimen they no longer share.
//
// It lives in core rather than under __tests__ because the pole lab reads from it too:
// a talk figure must not import out of a test directory.
// ============================================================================
import type { Conformal } from './conformal'
import type { ConformalPHCurve } from './conformalPHCurve'
import type { Quat } from './quaternion'
import {
  type MultiPoleParams, familyBasis, projectToFamily, toMember, unpackSpinor,
} from './rationalPHMultiPoleSpatial'

/** The real pole. */
export const HARD_POLE = 1.7

/**
 * The member itself: power-basis w, p and σ, exactly as the two original copies built it.
 *
 * The coefficients of the combination are arbitrary but FIXED — this is a specimen, and every
 * number recorded anywhere about it is a number about this one curve.
 */
export function hardQuarticMember(): ReturnType<typeof toMember> {
  const ZERO3: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
  const base: MultiPoleParams = {
    A: ZERO3, roots: [HARD_POLE], lambdas: [Math.tan((20 * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return toMember(projectToFamily({ ...base, A: unpackSpinor(x) }))
}

/** σ at the pole — the number that says it is hard. */
export const sigmaAtHardPole = (m: ReturnType<typeof toMember>): number =>
  [...m.sigma].reduceRight((s, c) => s * HARD_POLE + c, 0)

// ---------------------------------------------------------------------------
// AND ITS CONFORMAL LIFT — the only shape a hard pole can take in ℝ^{4,1}
// ---------------------------------------------------------------------------

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
/** Power basis to Bernstein of degree n. */
export const toBern = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) acc += (binom(k, j) / binom(n, j)) * a[j]
    return acc
  })
const pmul = (a: readonly number[], b: readonly number[]): number[] => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const padd = (...ps: number[][]): number[] =>
  Array.from({ length: Math.max(...ps.map((q) => q.length)) },
    (_, i) => ps.reduce((s, q) => s + (q[i] ?? 0), 0))

/**
 * (w, q) ↦ (2w², 2wq, ‖q‖²) — the lift, which DOUBLES the degree and every pole with it.
 *
 * That doubling is the whole point. ⟨C,C⟩ ≡ 0 forces the numerator isotropic at every root of the
 * denominator, so a hard pole cannot appear in this model at a simple root. It can only appear
 * where the numerator cancels too, and a squared denominator is the only room a null curve has.
 * Degree 4 lifts to degree 8, the simple pole at 1.7 becomes a double root of 2w², and 2wq vanishes
 * there — a member of the variety that is not a reduced curve.
 */
export function liftHardQuarticToConformal(): { state: ConformalPHCurve; sigmaAtPole: number } {
  const m = hardQuarticMember()
  const w = [...m.w]
  const q = m.p.map((c) => [...c])
  const o = pmul(w, w).map((v) => 2 * v)
  const xyz = q.map((c) => pmul(w, c).map((v) => 2 * v))
  const inf = padd(pmul(q[0], q[0]), pmul(q[1], q[1]), pmul(q[2], q[2]))
  const degree = Math.max(o.length, ...xyz.map((c) => c.length), inf.length) - 1
  const cols = [toBern(o, degree), ...xyz.map((c) => toBern(c, degree)), toBern(inf, degree)]
  return {
    state: {
      C: Array.from({ length: degree + 1 }, (_, k) =>
        [cols[0][k], cols[1][k], cols[2][k], cols[3][k], cols[4][k]] as unknown as Conformal),
      h: toBern([...m.sigma].map((v) => 2 * v), degree - 1),
    },
    sigmaAtPole: sigmaAtHardPole(m),
  }
}
