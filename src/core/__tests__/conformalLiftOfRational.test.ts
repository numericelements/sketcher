// ============================================================================
// THE CONFORMAL MODEL REPRESENTS EVERY RATIONAL CURVE — and PH is layered on top.
//
// THE QUESTION, Eric's: can the O(4,1) representation express what the spinor chart expresses, and
// the other way round? The first half turns out to be a FORMULA rather than an existence proof.
// For any rational curve x = q/w, the homogeneous lift
//
//     P̃ = ( 2w² , 2w·q , ‖q‖² )
//
// is null by ring — ⟨P̃,P̃⟩ = ‖2wq‖² − 2·(2w²)·‖q‖² = 4w²‖q‖² − 4w²‖q‖² = 0 — with NO hypothesis on
// q or w, no spinor, and no PH assumption. So nullity is free and the conformal model is a model of
// rational curves, not of PH curves. PH is a second, independent condition:
//
//     ⟨P̃′,P̃′⟩ = W²·‖x′‖²  with W = 2w²  =  4‖q′w − qw′‖²
//
// which is a perfect square exactly when the curve is PH. Then h = 2σ.
//
// SO THE ANSWER TO THE FIRST HALF IS YES, AT TWICE THE DEGREE, and it needs neither
// Dietz–Hoschek–Jüttler nor the spinor form. (The Lean companion carries it as `liftOfRational`,
// null proved by `ring` with no hypotheses, and `lift_isPH_iff` for the second clause.)
//
// THE SECOND HALF IS THE ASYMMETRY. Going the other way, matching σ_spinor/w² = h/w forces
// σ_spinor = h·w, i.e. 𝒜(r) = 0 at each pole. The spinor REPRESENTATION reaches those (DHJ, up to
// a common factor); the λ-CHART cannot, because 𝒜(r)⁻¹ is what it divides by. Representation and
// chart are different questions and here they get different answers — RATIONAL_PH_STATE §13.
//
// AND THE LIFT BROKE A PROOF. The parity theorem's step "at every real root of w the member factors"
// is FALSE at a root of even multiplicity, and the lift of a simple-pole curve is the witness: its
// denominator is 2w², a DOUBLE root, with c∞(r) = ‖q(r)‖² ≠ 0 since gcd(q,w) = 1. The repair is a
// multiplicity count and the theorem survives; the corrected argument is in conformalPHCurve.ts.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt as ratCurveAt, familyBasis, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  type ConformalPHCurve,
  curveAt as confCurveAt, degreeOf, denominatorRealRoots, residual,
} from '../conformalPHCurve'
import { type Conformal, innerProduct } from '../conformal'
import type { Quat } from '../quaternion'

// --- power-basis helpers, and Bernstein conversion -------------------------
const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
/** power basis → Bernstein of degree n:  b_k = Σ_{j≤k} [C(k,j)/C(n,j)] a_j */
const toBern = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let s = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) s += (binom(k, j) / binom(n, j)) * a[j]
    return s
  })
const pmul = (a: readonly number[], b: readonly number[]): number[] => {
  const o = new Array(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const padd = (...ps: number[][]): number[] =>
  Array.from({ length: Math.max(...ps.map((p) => p.length)) }, (_, i) =>
    ps.reduce((s, p) => s + (p[i] ?? 0), 0))
const pscale = (a: readonly number[], s: number): number[] => a.map((v) => v * s)
const pev = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)

/** The lift, from a rational curve given in the power basis as q/w. */
function liftOfRational(q: readonly number[][], w: readonly number[]): {
  lift: (h: readonly number[]) => ConformalPHCurve
  o: number[]; xyz: number[][]; inf: number[]; degree: number
} {
  const o = pscale(pmul(w, w), 2)
  const xyz = q.map((c) => pscale(pmul(w, c), 2))
  const inf = padd(pmul(q[0], q[0]), pmul(q[1], q[1]), pmul(q[2], q[2]))
  const degree = Math.max(o.length, ...xyz.map((c) => c.length), inf.length) - 1
  return {
    o, xyz, inf, degree,
    lift: (h) => {
      const cols = [toBern(o, degree), ...xyz.map((c) => toBern(c, degree)), toBern(inf, degree)]
      return {
        C: Array.from({ length: degree + 1 }, (_, k) =>
          [cols[0][k], cols[1][k], cols[2][k], cols[3][k], cols[4][k]] as unknown as Conformal),
        h: toBern(h, degree - 1),
      }
    },
  }
}

const ZERO3: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const POLE = 1.7
/** A degree-4 λ-chart member: spinor degree 2, ONE GENUINE REAL POLE with σ(r) ≠ 0. */
function quarticWithGenuinePole(theta: number): MultiPoleParams {
  const base: MultiPoleParams = {
    A: ZERO3, roots: [POLE], lambdas: [Math.tan((theta * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return projectToFamily({ ...base, A: unpackSpinor(x) })
}

describe('the conformal lift of a rational curve', () => {
  it('NULLITY IS FREE: the lift is null for an arbitrary rational curve, PH or not', () => {
    // deliberately not a PH curve, and not spinor-generated — just three numerators over a weight
    const q = [[0.4, -1.1, 0.7, 0.2], [1, 0.3, -0.5, 0.9], [-0.2, 0.8, 0.1, -0.6]]
    const w = [2, -0.7, 0.4]
    const { lift, degree } = liftOfRational(q, w)
    const s = lift([1])                                   // h is irrelevant to nullity
    let worst = 0
    for (let k = 0; k <= 40; k++) {
      const t = k / 40
      // evaluate the conformal curve by de Casteljau and take ⟨P,P⟩
      const P = s.C.reduce<number[][]>((acc) => acc, [])
      void P
      const at = (i: number): number => {
        let p = s.C.map((c) => c[i])
        while (p.length > 1) p = p.slice(0, -1).map((v, j) => (1 - t) * v + t * p[j + 1])
        return p[0]
      }
      const v = [0, 1, 2, 3, 4].map(at) as unknown as Conformal
      worst = Math.max(worst, Math.abs(innerProduct(v, v)))
    }
    console.log(`    lift degree ${degree}, ⟨P,P⟩ worst ${worst.toExponential(1)} on a NON-PH curve`)
    expect(worst, 'null by ring, no hypotheses').toBeLessThan(1e-12)
  })

  it('A GENUINE-POLE λ-CHART CURVE lifts to an exact conformal PH member at twice the degree', () => {
    const prm = quarticWithGenuinePole(20)
    const m = toMember(prm)
    expect(Math.abs(pev([...m.sigma], POLE)), 'σ(r) ≠ 0 — off the stratum, a real pole').toBeGreaterThan(1)

    const { lift, degree } = liftOfRational(m.p.map((c) => [...c]), [...m.w])
    const s = lift(pscale([...m.sigma], 2))               // h = 2σ
    const res = Math.max(...residual(s).map(Math.abs))
    console.log(`    curve degree 4 → conformal degree ${degreeOf(s)}, residual ${res.toExponential(1)}`)
    expect(degree, 'the lift doubles the degree').toBe(8)
    expect(res, 'null AND PH, with h = 2σ').toBeLessThan(1e-10)

    let worst = 0, ext = 0
    for (let k = 0; k <= 40; k++) {
      const t = k / 40
      const a = ratCurveAt(m, t), b = confCurveAt(s, t)
      expect(b).not.toBeNull()
      worst = Math.max(worst, Math.hypot(a.x - b!.x, a.y - b!.y, a.z - b!.z))
      ext = Math.max(ext, Math.hypot(a.x, a.y, a.z))
    }
    console.log(`    same curve, to ${(worst / ext).toExponential(1)} of the extent`)
    expect(worst / ext, 'the same curve, not merely a nearby one').toBeLessThan(1e-12)
  })

  it('AND IT REFUTES THE PARITY THEOREM’S OLD STEP: a double root that does NOT factor', () => {
    const prm = quarticWithGenuinePole(20)
    const m = toMember(prm)
    const { lift, o, xyz, inf } = liftOfRational(m.p.map((c) => [...c]), [...m.w])
    const s = lift(pscale([...m.sigma], 2))

    // the lift's denominator is 2w², so r is a DOUBLE root
    const W = pev(o, POLE)
    const Q2 = xyz.reduce((acc, c) => acc + pev(c, POLE) ** 2, 0)
    const cinf = pev(inf, POLE)
    console.log(`    at r=${POLE}:  W = ${W.toExponential(1)},  ‖Q‖² = ${Q2.toExponential(1)},  c∞ = ${cinf.toFixed(2)}`)
    expect(Math.abs(W), 'r is a root of the lift’s denominator').toBeLessThan(1e-12)
    expect(Q2, 'and the numerator vanishes there, as nullity forces').toBeLessThan(1e-20)
    expect(cinf, 'but c∞ does NOT vanish — so (t−r) does not divide it').toBeGreaterThan(1)

    // hence nothing factors: it is a genuine degree-8 member
    expect(degreeOf(s)).toBe(8)
    expect(Math.max(...residual(s).map(Math.abs))).toBeLessThan(1e-10)

    // and the sign-change counter reports 0, CORRECTLY: a double root is not where factoring happens
    console.log(`    denominatorRealRoots = ${denominatorRealRoots(s)} — sign changes, i.e. ODD-multiplicity roots`)
    expect(denominatorRealRoots(s), 'even multiplicity is invisible to it, and should be').toBe(0)
  })
})
