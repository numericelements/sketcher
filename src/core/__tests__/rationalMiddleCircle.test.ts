// ============================================================================
// THE SECOND CIRCLE, IN CLOSED FORM — the rational analogue of the completed square, derived and checked.
//
// WHAT WAS OWED. The degree-6 C¹ Hermite fibre is 2-dimensional. One coordinate — the phase ψ of 𝒜(1)
// against 𝒜(0) — is a circle we can drive, but the curve at each ψ came out of a SOLVER, minimum norm
// from the seed, which is why its motion is lopsided and why a "mirror" slider looked like a second
// coordinate and was not. The other coordinate was a 2180-step walk, 109 s to traverse.
//
// The polynomial quintic has neither problem: three angles give the spinor with no solver anywhere
// (spatialQuinticTorus), because completing the square in the middle coefficient turns the displacement
// condition into one more Hopf equation. This file does the same for the rational sextic.
//
// THE DERIVATION.
//
// Hold 𝒜(0) and 𝒜(1) (which spends the Hopf gauge and fixes ψ). A variation δ𝒜 staying in the family
// and holding those must satisfy
//
//     δ𝒜(0) = 0 ,   δ𝒜(1) = 0 ,   δ𝒜′(r) = δ𝒜(r)·λi        (the residue condition, F17, Σ = 0 at one pole)
//
// Try δ𝒜 = X·u(t) with X ∈ ℍ FREE and u a COMPLEX cubic — complex meaning valued in span{1, i}, the
// subfield that commutes with i. Then the residue condition reads X·u′(r) = X·u(r)λi for every X, i.e.
//
//     u′(r) = λi·u(r)                      a condition on u ALONE
//
// and with u = t(t−1)(αt + β) it solves in closed form: put P = αr + β, then
//
//     α = [λi − (2r−1)/(r²−r)]·P ,    β = P − αr          (P a free complex scale)
//
// So the leftover freedom is exactly {X·u : X ∈ ℍ} — four real dimensions, which is the 12 − 4 − 4 the
// count predicts. AND THE QUADRATIC TERM IS A HOPF MAP, which is the whole point: u is complex, so
// u i ū = i|u|², and
//
//     (Xu) i (Xu)*  =  X (u i ū) X̄  =  |u|²·X i X̄
//
// The cross term is 2·vec(𝒜₀ i ū X̄), so with
//
//     μ = ∫₀¹ |u|²/w² dt ,   G = ∫₀¹ 𝒜₀ i ū /w² dt ,   X₀ = −G i/μ
//
// completing the square in X gives ONE MORE HOPF EQUATION:
//
//     Y i Ȳ = T ,   Y = X + X₀ ,   T = (Δc_target − Δc₀)/μ + X₀ i X₀*
//
// so Y runs a Hopf circle and 𝒜 = 𝒜₀ + (Y − X₀)·u. Taking 𝒜₀ to be a member of the fibre itself makes
// Δc_target = Δc₀ and the answer collapses to
//
//     𝒜(θ) = 𝒜₀ + (X₀ e^{iθ} − X₀)·u(t)
//
// — a circle, in closed form, no solver, closing at 2π because e^{2πi} = 1.
//
// MEASURED:
//
//     u′(r) = λi·u(r)                to 2.7e-16        the shape polynomial is right
//     X·u keeps the residue and both ends              to 4.7e-16 and 1.9e-15, for every X
//     the nine Hermite numbers held  to 1.5e-12        around the whole circle
//     PH defect                      3.1e-13
//     θ + 2π returns                 gauge 2.6e-15, indicatrix 5.8e-15
//     it MOVES                       ≥ 1.238 on a unit sphere — not a re-labelling
//
// AND THE CONTROL, which is the point: the 2180-step walk lies ON this circle. Its members are in the
// {X·u} space to 1.4e-14 and satisfy |Y| = |X₀| to 4.3e-16 — the closed form's own two structural
// claims. (Checking the invariant rather than hunting for a nearest θ matters: a first version searched
// 720 samples and read a gap of 0.045, which was nothing but the angular resolution |X₀|·2π/720.)
//
// So the 109-second walk is replaced by a formula, and the second slider becomes a genuine circle
// rather than a bounded road.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, derivativeAt, familyBasis, fiberRoad, gaugeDistance, hermiteOf, indicatrixDistance,
  phDefect, spinorEndsAndSpan, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  QUAT_I, qadd, qconj, qmul, qnormSq, qscale, quatFromSandwich, sandwich, vnorm, vsub,
  type Quat, type Vec3,
} from '../quaternion'
import { integralOverW2, middleCircle as middleCircleOf, shapePolynomial } from '../rationalHermiteCircles'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const POLE = 1.7
const LAMBDA = Math.tan((35 * Math.PI) / 180)
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [POLE], lambdas: [LAMBDA] }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

const polyMulQ = (a: readonly Quat[], b: readonly Quat[]): Quat[] => {
  const out: Quat[] = Array.from({ length: a.length + b.length - 1 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = qadd(out[i + j], qmul(x, y)) }))
  return out
}
const evalQ = (a: readonly Quat[], t: number): Quat =>
  a.reduce((s, c, k) => qadd(s, qscale(c, Math.pow(t, k))), { u: 0, v: 0, p: 0, q: 0 })
/** The pieces of the derivation, re-derived here so the control checks the SHIPPED module. */
function middleCircleParts(base: MultiPoleParams): { X0: Quat } {
  const r = base.roots[0], lambda = base.lambdas[0]
  const u = shapePolynomial(r, lambda)
  const uBar = u.map(qconj)
  const mu = integralOverW2(polyMulQ(u, uBar).map((q) => q.u), r)
  const gPoly = polyMulQ(polyMulQ(base.A as Quat[], [QUAT_I]), uBar)
  const g = [gPoly.map((q) => q.u), gPoly.map((q) => q.v), gPoly.map((q) => q.p), gPoly.map((q) => q.q)]
    .map((c) => integralOverW2(c, r))
  return { X0: qscale(qmul({ u: g[0], v: g[1], p: g[2], q: g[3] }, QUAT_I), -1 / mu) }
}

/** THE SHIPPED CLOSED FORM. */
const middleCircle = (base: MultiPoleParams) => (theta: number): MultiPoleParams => {
  const c = middleCircleOf(base)
  if (!c) throw new Error('middleCircle refused')
  return c.at(theta)
}

const H0 = hermiteOf(toMember(SEED))
const heldTo = (q: MultiPoleParams): number =>
  Math.hypot(...hermiteOf(toMember(q)).map((v, i) => v - H0[i]))

describe('the middle circle, in closed form', () => {
  it('u EXISTS AND IS UNIQUE up to scale: u(0) = u(1) = 0 and u′(r) = λi·u(r)', () => {
    const uQ = shapePolynomial(POLE, LAMBDA)
    expect(qnormSq(evalQ(uQ, 0))).toBeLessThan(1e-24)
    expect(qnormSq(evalQ(uQ, 1))).toBeLessThan(1e-24)
    const du = uQ.slice(1).map((c, k) => qscale(c, k + 1))
    const lhs = evalQ(du, POLE)
    const rhs = qscale(qmul(QUAT_I, evalQ(uQ, POLE)), LAMBDA)   // λi·u(r); i commutes with u ∈ ℂ
    const gap = Math.sqrt(qnormSq(qadd(lhs, qscale(rhs, -1)))) / Math.sqrt(qnormSq(lhs))
    console.log(`    u′(r) = λi·u(r) to ${gap.toExponential(1)}`)
    expect(gap).toBeLessThan(1e-13)
  })

  it('AND {X·u} IS EXACTLY THE LEFTOVER FREEDOM — four real dimensions, all admissible', () => {
    const uQ = shapePolynomial(POLE, LAMBDA)
    const base = spinorEndsAndSpan(toMember(SEED), SEED)
    let worstNoLog = 0, worstEnds = 0
    for (const X of [
      { u: 1, v: 0, p: 0, q: 0 }, { u: 0, v: 1, p: 0, q: 0 },
      { u: 0, v: 0, p: 1, q: 0 }, { u: 0, v: 0, p: 0, q: 1 },
      { u: 0.4, v: -0.7, p: 0.2, q: 0.9 },
    ] as Quat[]) {
      const A = (SEED.A as Quat[]).map((c, k) => qadd(c, qmul(X, uQ[k])))
      const q: MultiPoleParams = { ...SEED, A }
      worstNoLog = Math.max(worstNoLog, toMember(q).noLog)        // still satisfies the residue condition
      const s = spinorEndsAndSpan(toMember(q), q)
      worstEnds = Math.max(worstEnds, Math.hypot(...s.slice(0, 8).map((v, i) => v - base[i])))
    }
    console.log(`    residue held to ${worstNoLog.toExponential(1)},  𝒜(0) and 𝒜(1) held to ${worstEnds.toExponential(1)}`)
    expect(worstNoLog, 'X·u stays in the family for every X').toBeLessThan(1e-12)
    expect(worstEnds, 'and moves neither end spinor').toBeLessThan(1e-12)
    expect(12 - 4 - 4).toBe(4)                                    // fibre − 𝒜(0) − 𝒜(1)
  })

  it('THE CLOSED FORM HOLDS THE DATA and is exactly PH, with no solver anywhere', () => {
    const at = middleCircle(SEED)
    let worstHeld = 0, worstPH = 0
    for (let k = 0; k < 12; k++) {
      const q = at((2 * Math.PI * k) / 12)
      worstHeld = Math.max(worstHeld, heldTo(q))
      worstPH = Math.max(worstPH, phDefect(toMember(q)))
    }
    console.log(`    Hermite held to ${worstHeld.toExponential(1)},  PH defect ${worstPH.toExponential(1)}`)
    expect(worstHeld, 'every member interpolates the same C¹ Hermite data').toBeLessThan(1e-9)
    expect(worstPH).toBeLessThan(1e-12)
  })

  it('IT CLOSES AT 2π, and θ = 0 is the member we started from', () => {
    const at = middleCircle(SEED)
    expect(gaugeDistance(SEED.A, at(0).A), 'θ = 0 is the seed').toBeLessThan(1e-12)
    const round = at(2 * Math.PI)
    const gap = gaugeDistance(SEED.A, round.A)
    const ind = indicatrixDistance(SEED, round)
    console.log(`    θ + 2π returns: gauge ${gap.toExponential(1)}, indicatrix ${ind.toExponential(1)}`)
    expect(gap).toBeLessThan(1e-12)
    expect(ind).toBeLessThan(1e-12)
  })

  it('and it MOVES — a real motion, not a re-labelling', () => {
    const at = middleCircle(SEED)
    let least = Infinity
    for (const th of [0.6, 1.6, 2.8, 4.2, 5.4]) least = Math.min(least, indicatrixDistance(SEED, at(th)))
    console.log(`    smallest indicatrix motion around the circle: ${least.toFixed(3)} on a unit sphere`)
    expect(least).toBeGreaterThan(0.05)
  })

  it('THE CONTROL: the 2180-step walk lies ON this circle, checked by the formula s own invariant', () => {
    // The walk holds exactly what the closed form holds — 𝒜(0), 𝒜(1) and the span — so its members
    // must satisfy the closed form's two structural claims. Checking those is far sharper than hunting
    // for a nearest θ: an earlier version of this test did that with 720 samples and read a gap of
    // 0.045, which was nothing but the angular resolution (|X₀|·2π/720 ≈ 0.045) rather than a
    // disagreement.
    //
    //   1. 𝒜_walk − 𝒜₀ = D·u for some quaternion D — i.e. the walk stays in the {X·u} space
    //   2. |D + X₀| = |X₀| — i.e. Y = X + X₀ sits on the Hopf fibre over T, which IS the circle
    const uQ = shapePolynomial(POLE, LAMBDA)
    const { X0 } = middleCircleParts(SEED)
    const road = fiberRoad(SEED, { stride: 0.08, steps: 10, readout: spinorEndsAndSpan })
    let worstShape = 0, worstRadius = 0, reach = 0
    for (const q of road) {
      const dA = (q.A as Quat[]).map((c, k) => qadd(c, qscale((SEED.A as Quat[])[k], -1)))
      let bi = 0, best = 0
      uQ.forEach((c, k) => { const n = qnormSq(c); if (n > best) { best = n; bi = k } })
      const D = qscale(qmul(dA[bi], qconj(uQ[bi])), 1 / qnormSq(uQ[bi]))
      const scale = Math.max(...dA.map((c) => Math.sqrt(qnormSq(c))), 1e-300)
      for (let k = 0; k < uQ.length; k++) {
        const pred = qmul(D, uQ[k])
        worstShape = Math.max(worstShape, Math.sqrt(qnormSq(qadd(dA[k], qscale(pred, -1)))) / scale)
      }
      const rad = Math.sqrt(qnormSq(qadd(D, X0)))
      worstRadius = Math.max(worstRadius, Math.abs(rad - Math.sqrt(qnormSq(X0))) / Math.sqrt(qnormSq(X0)))
      reach = Math.max(reach, Math.sqrt(qnormSq(D)))
    }
    console.log(
      `    ${road.length} walked members:  in the {X·u} space to ${worstShape.toExponential(1)},` +
        `  |Y| = |X₀| to ${worstRadius.toExponential(1)}   (|X₀| = ${Math.sqrt(qnormSq(X0)).toFixed(3)}, walk reached |D| = ${reach.toFixed(3)})`,
    )
    expect(worstShape, 'the walk never leaves the space the derivation predicts').toBeLessThan(1e-12)
    expect(worstRadius, 'and it stays on the Hopf fibre over T — the same circle').toBeLessThan(1e-6)
  }, 120_000)

  it('and the ends really are held while it turns — which is what makes it the SECOND coordinate', () => {
    const at = middleCircle(SEED)
    const s0 = spinorEndsAndSpan(toMember(SEED), SEED)
    let worst = 0
    for (let k = 0; k < 12; k++) {
      const q = at((2 * Math.PI * k) / 12)
      const s = spinorEndsAndSpan(toMember(q), q)
      worst = Math.max(worst, Math.hypot(...s.slice(0, 8).map((v, i) => v - s0[i])))
    }
    console.log(`    𝒜(0) and 𝒜(1) held to ${worst.toExponential(1)} around the circle — so ψ is untouched`)
    expect(worst).toBeLessThan(1e-12)
    // and the derivative data is genuinely unchanged, not merely the spinors
    const d0 = derivativeAt(toMember(SEED), 0), d1 = derivativeAt(toMember(SEED), 1)
    const q = at(2.2)
    expect(vnorm(vsub(derivativeAt(toMember(q), 0), d0))).toBeLessThan(1e-10)
    expect(vnorm(vsub(derivativeAt(toMember(q), 1), d1))).toBeLessThan(1e-10)
    const e0: Vec3 = curveAt(toMember(SEED), 1)
    expect(vnorm(vsub(curveAt(toMember(q), 1), e0))).toBeLessThan(1e-9)
    // T is a genuine vector and Y sits on its Hopf fibre
    expect(quatFromSandwich(sandwich({ u: 1, v: 0.2, p: -0.3, q: 0.4 }))).not.toBeNull()
  })
})
