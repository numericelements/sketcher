// ============================================================================
// THE TWO FIBRE SLIDERS, EXCHANGED BY THE MIRROR — symmetry used to DEFINE a coordinate, not to test one.
//
// WHAT ERIC ASKED FOR, and it took several wrong turns to hear correctly: not two sliders that are each
// individually symmetric, but a PAIR that the mirror EXCHANGES. Turn slider 1, mirror the picture, and
// it should look like you turned slider 2.
//
// WHY THE OBVIOUS ROUTE FAILS. Our chart's coordinates are ψ (the phase of 𝒜(1) against 𝒜(0)) and s (the
// middle circle). Working out how reversal acts on the three Hopf phases — ends swapped, each phase
// negated — predicts
//
//     σ: (ψ, s) ↦ (ψ, ψ − s)       M = [1 0; 1 −1],  M² = I,  eigenvalues ±1
//
// and that matrix IS conjugate to the swap over ℤ, with e₁ = (1,0) = ψ and e₂ = M e₁ = (1,1) = ψ + s.
// So "ψ and ψ + s" is the exchanged pair, and the linear part checks out: each phase picks up exactly
// −0.70 for a +0.70 input. But the EXACT exchange came out only to ~2.3e-3 and stayed there under
// refinement — because s is measured from a base Y₀ = quatFromSandwich(T) whose T depends on ψ, so the
// s-origin DRIFTS as ψ turns and the chart is not quite affine.
//
// THE FIX IS TO STOP COORDINATISING AND LET THE SYMMETRY DEFINE THE SECOND SLIDER:
//
//     slider 1 = the ψ loop            slider 2 := σ(slider 1)
//
// Exchanged by construction, because σ² = I. There is no coordinate left to drift. And it is a
// legitimate PAIR — the two loops are independent (σ moves the loop by 8.2e-2 against a curve span of
// 1.65), which is the homology statement (1,0) and (1,1) span ℤ².
//
// MEASURED:
//
//     σ² = identity                       0.00e+0        exactly, not nearly
//     σ(s₁) = s₂ and σ(s₂) = s₁           0.00e+0        by construction
//     both loops close at 2π              5.4e-16, 6.8e-16
//     C¹ Hermite data held on both        7.6e-15
//     the loops are distinct              never within 8.2e-2 of each other
//
// AND THE PICTURE IS THE POINT. Orbit radius of each control point over a full turn:
//
//     slider 1:   0.000  0.000  0.151  0.579  0.000  0.000
//     slider 2:   0.000  0.000  0.579  0.151  0.000  0.000
//
// Exact mirror images. "It turns around one control point, and then around the other" — which is what
// the polynomial deck does and ours did not, and the thing Eric kept reporting and I kept explaining
// away (§10.3).
//
// SCOPE. σ must act on the FIBRE, which needs reverse(m) to land in the same fibre: symmetric C¹ data
// (d₁ = −R d₀ with Δc ⊥ the axis) AND no pole to move. So this is exact for the polynomial case. For a
// rational member at a genuine pole, σ maps one fibre to a neighbouring one and the exchange is
// approximate, degrading with pole distance the way the polygon asymmetry does.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { controlStructure, curveAt, toMember, type MultiPoleParams } from '../rationalPHMultiPoleSpatial'
import {
  QUAT_I, gaugeRotate, polarSandwich, qadd, qmul, qscale, qsub, quatFromSandwich, sandwich,
  vadd, vnorm, vscale, vsub, type Quat, type Vec3,
} from '../quaternion'

const QUAT_J: Quat = { u: 0, v: 0, p: 1, q: 0 }

/**
 * REVERSAL-SYMMETRIC C¹ Hermite data. c(1−t) = R c(t) + k with R the rotation by π about x̂ forces
 * k = Δc, R·Δc = −Δc (so Δc ⊥ x̂) and c′(1) = −R c′(0) (so d₁ = (−d₀ₓ, d₀ᵧ, d₀_z)).
 *
 * The condition d₁ = R d₀ is a DIFFERENT one and is not this; using it cost a round of measuring the
 * wrong configuration and reporting a real number about it.
 */
const D0: Vec3 = { x: 1.0, y: 0.5, z: 0.2 }
const D1: Vec3 = { x: -1.0, y: 0.5, z: 0.2 }
const DP: Vec3 = { x: 0.0, y: 1.6, z: 0.4 }
const A0 = quatFromSandwich(D0)!
const A2 = quatFromSandwich(D1)!

type Tri = [Quat, Quat, Quat]

/** T of the completed square, from spatialQuinticTorus. */
const Tof = (B0: Quat, B2: Quat): Vec3 => {
  const S = qadd(B0, B2)
  const V = vsub(vsub(vsub(vscale(DP, 5), sandwich(B0)), sandwich(B2)),
    vscale(polarSandwich(B0, B2), 1 / 6))
  return vadd(vscale(V, 3 / 2), vscale(sandwich(S), 9 / 16))
}
/** The chart: φ₀ = 0 fixes the gauge, ψ turns 𝒜(1), θ runs the middle circle. */
const chart = (psi: number, theta: number): Tri => {
  const B2 = gaugeRotate(A2, psi)
  const Y = gaugeRotate(quatFromSandwich(Tof(A0, B2))!, theta)
  return [A0, qsub(Y, qscale(qadd(A0, B2), 3 / 4)), B2]
}
/**
 * The symmetry: reverse the Bernstein coefficients (t ↦ 1−t), right-multiply by j (which flips the
 * hodograph's sign, since j i j̄ = −i), left-multiply by i (the rotation R, since R is conjugation by i
 * and spinors transform by LEFT multiplication).
 */
const sym = (B: Tri): Tri => [
  qmul(QUAT_I, qmul(B[2], QUAT_J)),
  qmul(QUAT_I, qmul(B[1], QUAT_J)),
  qmul(QUAT_I, qmul(B[0], QUAT_J)),
]

const asParams = (B: Tri): MultiPoleParams => ({
  A: [B[0], qscale(qsub(B[1], B[0]), 2), qadd(qsub(B[0], qscale(B[1], 2)), B[2])],
  roots: [], lambdas: [],
})
const samp = (B: Tri): Vec3[] => {
  const m = toMember(asParams(B))
  return Array.from({ length: 33 }, (_, i) => curveAt(m, i / 32))
}
const gap = (a: Vec3[], b: Vec3[]): number => Math.max(...a.map((p, i) => vnorm(vsub(p, b[i]))))
const hermiteOfTri = (B: Tri): number[] => {
  const m = toMember(asParams(B))
  const p = curveAt(m, 0), q = curveAt(m, 1)
  const d0 = sandwich(B[0]), d1 = sandwich(B[2])
  return [d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, q.x - p.x, q.y - p.y, q.z - p.z]
}
const orbit = (f: (a: number) => Tri, N = 48): number[] => {
  const fr = Array.from({ length: N }, (_, i) => controlStructure(toMember(asParams(f((2 * Math.PI * i) / N)))).points)
  return Array.from({ length: fr[0].length }, (_, j) => {
    const c = [0, 1, 2].map((k) => fr.reduce((s, x) => s + [x[j].x, x[j].y, x[j].z][k], 0) / N)
    return Math.max(...fr.map((x) => Math.hypot(x[j].x - c[0], x[j].y - c[1], x[j].z - c[2])))
  })
}

/** THE PAIR. */
const slider1 = (a: number): Tri => chart(a, 0)
const slider2 = (a: number): Tri => sym(chart(a, 0))

describe('the mirrored slider pair', () => {
  it('THE GATE: the symmetry acts on the FIBRE — same C¹ Hermite data', () => {
    const base = hermiteOfTri(chart(0, 0))
    let worst = 0
    for (const [p, t] of [[0, 0], [0.7, 1.9], [2.2, 4.1], [5.0, 0.9]] as const) {
      worst = Math.max(worst, Math.hypot(...hermiteOfTri(sym(chart(p, t))).map((v, i) => v - base[i])))
    }
    console.log(`    sym(member) holds the same nine numbers to ${worst.toExponential(2)}`)
    expect(worst, 'without this the rest of the file is meaningless').toBeLessThan(1e-12)
  })

  it('σ IS AN INVOLUTION, exactly', () => {
    let worst = 0
    for (const a of [0, 0.9, 2.3, 4.7]) worst = Math.max(worst, gap(samp(sym(sym(slider1(a)))), samp(slider1(a))))
    console.log(`    σ² = identity to ${worst.toExponential(2)}`)
    expect(worst).toBeLessThan(1e-14)
  })

  it('THE EXCHANGE: σ(slider1) = slider2 and σ(slider2) = slider1', () => {
    let worst = 0
    for (const a of [0, 0.6, 1.5, 2.7, 4.4, 5.8]) {
      worst = Math.max(worst, gap(samp(sym(slider1(a))), samp(slider2(a))))
      worst = Math.max(worst, gap(samp(sym(slider2(a))), samp(slider1(a))))
    }
    console.log(`    exchanged to ${worst.toExponential(2)} — by construction, since slider2 IS σ∘slider1`)
    expect(worst).toBeLessThan(1e-14)
  })

  it('and they are a legitimate PAIR: both close, both hold the data, and they differ', () => {
    const h0 = hermiteOfTri(slider1(0))
    let held = 0
    for (const a of [0, 1.1, 2.6, 4.2, 5.9]) {
      held = Math.max(held,
        Math.hypot(...hermiteOfTri(slider1(a)).map((v, i) => v - h0[i])),
        Math.hypot(...hermiteOfTri(slider2(a)).map((v, i) => v - h0[i])))
    }
    const c1 = gap(samp(slider1(0)), samp(slider1(2 * Math.PI)))
    const c2 = gap(samp(slider2(0)), samp(slider2(2 * Math.PI)))
    // distinct: how close does slider2 ever come to the slider1 LOOP?
    let separation = Infinity
    for (const a of [0.9, 2.3, 4.7]) {
      let best = Infinity
      for (let k = 0; k < 720; k++) best = Math.min(best, gap(samp(slider2(a)), samp(slider1((2 * Math.PI * k) / 720))))
      separation = Math.min(separation, best)
    }
    const span = Math.max(...samp(slider1(0)).map(vnorm))
    console.log(
      `    data held ${held.toExponential(2)};  closures ${c1.toExponential(1)}, ${c2.toExponential(1)};` +
        `  separation ${separation.toExponential(2)} on a span of ${span.toFixed(2)}`,
    )
    expect(held).toBeLessThan(1e-12)
    expect(Math.max(c1, c2), 'both close at 2π').toBeLessThan(1e-12)
    expect(separation / span, 'and they are not the same loop').toBeGreaterThan(1e-2)
  }, 120_000)

  it('THE PICTURE: the two sliders move the control polygon as MIRROR IMAGES', () => {
    const o1 = orbit(slider1), o2 = orbit(slider2)
    console.log(`    slider1: ${o1.map((v) => v.toFixed(3)).join(' ')}`)
    console.log(`    slider2: ${o2.map((v) => v.toFixed(3)).join(' ')}`)
    const n = o1.length - 1
    let worst = 0
    for (let i = 0; i <= n; i++) worst = Math.max(worst, Math.abs(o1[i] - o2[n - i]))
    const scale = Math.max(...o1)
    console.log(`    reversed slider2 vs slider1: ${(worst / scale).toExponential(2)} relative`)
    expect(worst / scale, 'one turns about one control point, the other about its mirror')
      .toBeLessThan(1e-6)
    // and the motion really is lopsided on EACH — that is what makes the mirroring visible
    expect(Math.max(o1[2], o1[3]) / Math.min(o1[2], o1[3])).toBeGreaterThan(2)
  }, 120_000)
})
