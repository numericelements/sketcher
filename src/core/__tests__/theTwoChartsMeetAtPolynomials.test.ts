// ============================================================================
// THE TWO CHART TYPES MEET AT THE POLYNOMIALS — the D = 4 pairing, measured end to end.
//
// THE QUESTION, Eric's. The λ-chart's twist dial runs out at a POLYNOMIAL: 𝒜(r) → 0, the apparent
// pole divides out, and the degree drops by one (polynomialLimitOfTheCircle.test.ts, on the degree-6
// pair). Separately, a polynomial PH curve lifts EXACTLY into the conformal family at twice its
// degree (conformalPHStructure.test.ts). Both were measured; nobody had checked that the two
// endpoints are the SAME CURVE. If they are, the two chart types F18 calls disjoint have closures
// that MEET, and the polynomial locus is the meeting place.
//
// THE DEGREES HAVE TO BE MATCHED, and this is where an inference would have gone wrong. The pole
// cancelling drops the degree by one; the conformal lift doubles it. So
//
//     λ-chart degree D, one pole   →   polynomial degree D−1   ←   conformal degree 2(D−1)
//
//     D = 4:  polynomial CUBIC,   conformal 6      ← this file, and slide 11's family
//     D = 6:  polynomial QUINTIC, conformal 10
//
// So the space that meets slide 11 at the polynomials is the degree-FOUR λ-chart, not the degree-six
// one. Pairing slide 11 with the degree-6 chart would have been off by exactly one rung.
//
// MEASURED HERE:
//
//     θ        90−θ     |𝒜(r)|/scale
//     0        90.0       1.77e+0
//     80       10.0       3.25e-1
//     89        1.0       3.28e-2
//     89.9      0.1       3.28e-3      a decade of angle for a decade of cancellation — LINEAR
//
//   · the deflated 𝒜₁ is a DEGREE-1 spinor, hence a polynomial PH CUBIC;
//   · that cubic's conformal lift is a degree-6 member to 1.8e-14 — an exact member;
//   · and the curves AGREE POINTWISE to 6.3e-4 of the extent. That is the load-bearing measurement:
//     |𝒜(r)| alone only says the spinor is small at the pole, and synthetic division's remainder IS
//     𝒜(r), so the deflation defect is the same number rather than a second opinion. Only the curve
//     comparison says the pole DIVIDES OUT rather than merely shrinking.
//
// AND THE MEETING POINT IS SINGULAR IN BOTH CHARTS, which is the part worth keeping. On the conformal
// side the defining Jacobian drops to rank 21 of 24 there, against 23 of 24 at a generic member. On
// the λ side the meeting point is 𝒜(r) = 0 — precisely the quantity the whole chart construction
// divides by. So the two spaces are connected THROUGH A POINT NEITHER CAN PARAMETRISE. That is a
// sharper statement than "one chart is not enough": the bridge itself has no coordinates.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt as rationalCurveAt, familyBasis, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { controlPoints as phControlPoints, squareWeights, type SpatialPHCurve } from '../phSpatialFreeDragN'
import { conformalLiftBezier } from '../conformal'
import {
  type ConformalPHCurve, curveAt as conformalCurveAt, definingJacobian, degreeOf, residual, unknownCount,
} from '../conformalPHCurve'
import { rankOf } from '../rationalPHVariety'
import type { Quat, Vec3 } from '../quaternion'

const POLE = 1.7
const ZERO3: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

/** A degree-4 member (spinor degree 2, one pole) at twist angle θ. */
function quarticAt(thetaDeg: number): MultiPoleParams {
  const base: MultiPoleParams = {
    A: ZERO3, roots: [POLE], lambdas: [Math.tan((thetaDeg * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return projectToFamily({ ...base, A: unpackSpinor(x) })
}

const qadd = (a: Quat, b: Quat): Quat => ({ u: a.u + b.u, v: a.v + b.v, p: a.p + b.p, q: a.q + b.q })
const qscale = (a: Quat, s: number): Quat => ({ u: a.u * s, v: a.v * s, p: a.p * s, q: a.q * s })
const qnorm = (a: Quat): number => Math.hypot(a.u, a.v, a.p, a.q)
/** 𝒜(t) by Horner — A is the POWER basis, as rationalPHMultiPoleSpatial uses it. */
const spinorAt = (A: readonly Quat[], t: number): Quat =>
  A.reduceRight((acc, c) => qadd(qscale(acc, t), c), { u: 0, v: 0, p: 0, q: 0 })

/** Synthetic division of 𝒜 by (t − r): the quotient, and the remainder that says whether it divided. */
function deflate(A: readonly Quat[], r: number): { quotient: Quat[]; remainder: Quat } {
  const q: Quat[] = new Array(A.length - 1)
  let carry: Quat = A[A.length - 1]
  for (let k = A.length - 2; k >= 0; k--) {
    q[k] = carry
    carry = qadd(A[k], qscale(carry, r))
  }
  return { quotient: q, remainder: carry }
}

const dot4 = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q
function speedPolynomial(A: readonly Quat[]): number[] {
  const m = A.length - 1
  const W = squareWeights(m)
  return Array.from({ length: 2 * m + 1 }, (_, j) => {
    let acc = 0
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) acc += W[j][a] * dot4(A[a], A[j - a])
    return acc
  })
}
function elevate(b: readonly number[], to: number): number[] {
  let cur = [...b]
  while (cur.length - 1 < to) {
    const n = cur.length - 1
    cur = Array.from({ length: n + 2 }, (_, i) =>
      (i > 0 ? (i / (n + 1)) * cur[i - 1] : 0) + (i <= n ? (1 - i / (n + 1)) * cur[i] : 0))
  }
  return cur
}
/** The conformal member of degree 2d carrying a polynomial PH curve of degree d. */
function liftPolynomialPH(A: readonly Quat[]): ConformalPHCurve {
  const C = conformalLiftBezier(phControlPoints({ A, p0: { x: 0, y: 0, z: 0 } } as SpatialPHCurve))
  return { C, h: elevate(speedPolynomial(A), C.length - 2) }
}

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('the λ-chart and the conformal chart meet at the polynomial cubic', () => {
  it('driving λ to the limit CANCELS the pole, LINEARLY in the angle left', () => {
    // NOT two independent columns: synthetic division's remainder IS 𝒜(r), so the deflation defect
    // and the cancellation are the same number by construction. The independent check that the pole
    // DIVIDES OUT rather than merely shrinking is the pointwise curve comparison in the next test.
    console.log('       θ      90−θ      |𝒜(r)|/scale')
    const rel: Record<number, number> = {}
    for (const theta of [0, 60, 80, 89, 89.9]) {
      const prm = quarticAt(theta)
      const scale = Math.max(...prm.A.map(qnorm))
      rel[theta] = qnorm(spinorAt(prm.A, POLE)) / scale
      console.log(`    ${theta.toString().padStart(6)}   ${(90 - theta).toFixed(1).padStart(6)}      ${rel[theta].toExponential(2)}`)
    }
    // 3.25e-1, 3.28e-2, 3.28e-3 as 90−θ goes 10, 1, 0.1 — a decade for a decade, so the cancellation
    // is LINEAR in the angle remaining, matching the degree-6 pair's linear convergence.
    expect(rel[89.9], 'all but cancelled at the end of the dial').toBeLessThan(1e-2)
    expect(rel[80] / rel[89], 'a decade of angle buys a decade of cancellation').toBeCloseTo(10, 0)
    expect(rel[89] / rel[89.9], 'and again').toBeCloseTo(10, 0)
  })

  it('THE SAME CURVE: the λ-chart limit IS a conformal degree-6 member', () => {
    const prm = quarticAt(89.9)
    const scale = Math.max(...prm.A.map(qnorm))
    const { quotient, remainder } = deflate(prm.A, POLE)
    const defect = qnorm(remainder) / scale
    expect(quotient.length, 'a degree-1 spinor, hence a polynomial CUBIC').toBe(2)

    // power basis (B₀ + B₁t) → Bernstein degree 1 ([B₀, B₀+B₁])
    const bern: Quat[] = [quotient[0], qadd(quotient[0], quotient[1])]
    const lifted = liftPolynomialPH(bern)
    const res = Math.max(...residual(lifted).map(Math.abs))
    console.log(`    deflation defect ${defect.toExponential(1)}`)
    console.log(`    the lifted cubic: conformal degree ${degreeOf(lifted)}, residual ${res.toExponential(1)}`)
    expect(degreeOf(lifted), 'a polynomial cubic lands at conformal degree 6').toBe(6)
    expect(res, 'and it is an exact member').toBeLessThan(1e-12)

    // THE POINTWISE COMPARISON — the claim the whole file exists for. Both start at the origin
    // (p(0) = 0 in the λ-chart, p0 = 0 in the lift), so no alignment is needed.
    let worst = 0, extent = 0
    for (let k = 0; k <= 40; k++) {
      const t = k / 40
      const a = rationalCurveAt(toMember(prm), t)
      const b = conformalCurveAt(lifted, t)
      expect(b).not.toBeNull()
      worst = Math.max(worst, dist(a, b!))
      extent = Math.max(extent, Math.hypot(a.x, a.y, a.z))
    }
    console.log(`    curves agree to ${(worst / extent).toExponential(1)} of the extent (extent ${extent.toFixed(3)})`)
    expect(worst / extent, 'the two chart types name the same curve').toBeLessThan(20 * defect + 1e-9)
  })

  it('and the meeting point is SINGULAR in the conformal chart', () => {
    const prm = quarticAt(89.9)
    const { quotient } = deflate(prm.A, POLE)
    const lifted = liftPolynomialPH([quotient[0], qadd(quotient[0], quotient[1])])
    const U = unknownCount(degreeOf(lifted))
    const rankHere = rankOf(definingJacobian(lifted))
    console.log(`    rank at the lifted polynomial: ${rankHere} of ${definingJacobian(lifted).length}`)
    // A generic degree-6 member gives 23 of 24; the polynomial stratum drops further.
    expect(rankHere, 'the polynomial locus is a fold, not an ordinary point').toBeLessThan(23)
    console.log(`    nullity there ${U - rankHere}, against 18 at a generic member`)
  })
})
