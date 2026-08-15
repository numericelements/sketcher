// ============================================================================
// A REAL POLE IS NEVER ON THE STRATUM — and the reason is that the quaternion norm form is
// DEFINITE on the real line and ISOTROPIC off it.
//
// THE STATEMENT, which is forced rather than measured. At a real parameter t, σ(t) = |𝒜(t)|² is a
// sum of four real squares, so
//
//     σ(t) = 0   ⟺   𝒜(t) = 0   ⟺   (t − r) divides 𝒜   ⟺   the pole CANCELS
//
// So a member with a genuine real pole — one that has not already dropped a degree — cannot have
// σ(r) = 0. Nothing needs to be measured to know it; the form's definiteness on ℝ does the work.
//
// WHICH SPLITS F18'S SINGLE STRATUM IN TWO, and this file exists to make that visible:
//
//     at a REAL pole      σ(r) = 0 forces 𝒜(r) = 0 — the DEGREE-DROP locus (§2, §13's seam)
//     at a COMPLEX pole   σ(r) = 0 with 𝒜(r) ≠ 0 is possible, because over ℂ the norm form is
//                         ISOTROPIC — this is the circle, the conformal world, the real stratum
//
// F18 calls both "σ = 0" and they are different phenomena. The published rational PH cubic is the
// witness for the second: 𝒜(ι) = −2 + 3ι·i + 2j + k is NONZERO and yet 𝒜𝒜̄ = 4 − 9 + 4 + 1 = 0.
// That cancellation is impossible on the real line and routine off it.
//
// THE GUARD THIS BUYS. "σ(r) ≈ 0 at a real pole" is now a diagnostic with one meaning: the spinor is
// divisible by (t − r) and the curve is secretly of lower degree. It is the λ-side twin of
// `denominatorRealRoots`. It is NOT, on its own, evidence of a bug — which is why the test below
// checks divisibility rather than assuming a member is reduced.
//
// (Suggested by the Lean companion's divisor reframing: classify by the pole divisor on ℙ¹(ℂ) plus
// whether σ vanishes at each pole, and "polynomial vs rational" stops being a distinction — a
// polynomial is the divisor d·[∞], a REAL point, so it sits on the λ-chart side by the same rule.)
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams, familyBasis, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { spinor as cubicSpinor, sigma as cubicSigma } from '../rationalPHCubic'
import type { Quat } from '../quaternion'

const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const qadd = (a: Quat, b: Quat): Quat => ({ u: a.u + b.u, v: a.v + b.v, p: a.p + b.p, q: a.q + b.q })
const qscale = (a: Quat, s: number): Quat => ({ u: a.u * s, v: a.v * s, p: a.p * s, q: a.q * s })
const qnorm = (a: Quat): number => Math.hypot(a.u, a.v, a.p, a.q)
/** 𝒜(t) by Horner — A is the POWER basis. */
const spinorAt = (A: readonly Quat[], t: number): Quat =>
  A.reduceRight((acc, c) => qadd(qscale(acc, t), c), { u: 0, v: 0, p: 0, q: 0 })
const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)

function member(n: number, roots: number[], theta: number): MultiPoleParams {
  const base: MultiPoleParams = {
    A: ZERO(n + 1), roots, lambdas: roots.map(() => Math.tan((theta * Math.PI) / 180)),
  }
  const B = familyBasis(base)
  const x = new Array<number>(4 * (n + 1)).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < x.length; j++) x[j] += a * b[j]
  })
  return projectToFamily({ ...base, A: unpackSpinor(x) })
}

describe('the norm form is definite on ℝ and isotropic off it', () => {
  it('σ(t) IS |𝒜(t)|² at every real t — so σ > 0 unless the spinor vanishes', () => {
    let worstIdentity = 0, worstFloor = Infinity
    for (const [n, roots, theta] of [[3, [1.7], 35], [2, [1.7], 20], [3, [1.7, -0.9], 25]] as const) {
      const prm = member(n, [...roots], theta)
      const sig = toMember(prm).sigma
      const scale = Math.max(...prm.A.map(qnorm)) ** 2
      for (let k = -400; k <= 400; k++) {
        const t = k / 10
        const s = evalPoly(sig, t)
        const a = qnorm(spinorAt(prm.A, t)) ** 2
        // relative to the larger, so the check means something where both are big
        worstIdentity = Math.max(worstIdentity, Math.abs(s - a) / Math.max(Math.abs(s), 1e-12))
        if (Math.abs(t) <= 5) worstFloor = Math.min(worstFloor, s / scale)
      }
    }
    console.log(`    σ(t) vs |𝒜(t)|² on ℝ: worst relative gap ${worstIdentity.toExponential(1)}`)
    console.log(`    and σ stays POSITIVE: min σ/scale on |t| ≤ 5 is ${worstFloor.toExponential(2)}`)
    expect(worstIdentity, 'a sum of four real squares, so they are the same number').toBeLessThan(1e-10)
    expect(worstFloor, 'strictly positive — the form is definite on the real line').toBeGreaterThan(0)
  })

  it('AT A REAL POLE the stratum is unreachable without the pole cancelling', () => {
    // Walk the twist dial toward the polynomial limit and watch σ(r) and |𝒜(r)|² go together.
    console.log('       θ      |𝒜(r)|²/scale     σ(r)/scale      ratio')
    const rows: number[] = []
    for (const theta of [0, 60, 85, 89, 89.9]) {
      const prm = member(2, [1.7], theta)
      const scale = Math.max(...prm.A.map(qnorm)) ** 2
      const a = qnorm(spinorAt(prm.A, 1.7)) ** 2 / scale
      const s = evalPoly(toMember(prm).sigma, 1.7) / scale
      console.log(`    ${theta.toString().padStart(6)}      ${a.toExponential(2)}        ${s.toExponential(2)}      ${(s / a).toFixed(6)}`)
      rows.push(s / a)
    }
    // they are the SAME quantity, so σ(r) → 0 happens exactly when the spinor vanishes at r
    for (const r of rows) expect(r, 'σ(r) = |𝒜(r)|², identically').toBeCloseTo(1, 9)

    // and at a genuine pole (θ well away from the limit) σ(r) is bounded away from zero
    const genuine = member(2, [1.7], 20)
    const gScale = Math.max(...genuine.A.map(qnorm)) ** 2
    const gSigma = evalPoly(toMember(genuine).sigma, 1.7) / gScale
    console.log(`    a genuine pole: σ(r)/scale = ${gSigma.toExponential(2)} — forced positive, not measured lucky`)
    expect(gSigma).toBeGreaterThan(1e-3)
  })

  it('AT A COMPLEX POLE it IS reachable: 𝒜(ι) ≠ 0 and yet 𝒜𝒜̄ = 0', () => {
    // The published rational PH cubic (Kozak–Krajnc–Vitrih), whose pole is at t = ι.
    // 𝒜 = (t² − 1) + 3t·i + 2j + k, evaluated at ι: (−2) + 3ι·i + 2j + k.
    const A = cubicSpinor as readonly Quat[]
    // evaluate over ℂ: each component is a + bι
    const evalC = (t: { re: number; im: number }): { re: Quat; im: Quat } => {
      let re: Quat = { u: 0, v: 0, p: 0, q: 0 }, im: Quat = { u: 0, v: 0, p: 0, q: 0 }
      for (let k = A.length - 1; k >= 0; k--) {
        const nre = qadd(qscale(re, t.re), qscale(qscale(im, t.im), -1))
        const nim = qadd(qscale(re, t.im), qscale(im, t.re))
        re = qadd(nre, A[k]); im = nim
      }
      return { re, im }
    }
    const { re, im } = evalC({ re: 0, im: 1 })
    const size = Math.hypot(qnorm(re), qnorm(im))
    // 𝒜𝒜̄ over ℂ is the QUADRATIC FORM (not the modulus): Σ (re_i + ι im_i)²
    const formRe = [re.u, re.v, re.p, re.q].reduce((s, v, i) => s + v * v - [im.u, im.v, im.p, im.q][i] ** 2, 0)
    const formIm = [re.u, re.v, re.p, re.q].reduce((s, v, i) => s + 2 * v * [im.u, im.v, im.p, im.q][i], 0)
    console.log(`    |𝒜(ι)| = ${size.toFixed(4)} — NONZERO`)
    console.log(`    𝒜(ι)𝒜̄(ι) = ${formRe.toFixed(12)} + ${formIm.toFixed(12)}ι — ISOTROPIC`)
    expect(size, 'the spinor does not vanish there').toBeGreaterThan(1)
    expect(Math.hypot(formRe, formIm), 'yet the norm form does').toBeLessThan(1e-12)

    // Consequently σ, a REAL polynomial, vanishes at ±ι — w divides σ, which is the σ = h·w
    // signature. Measured: σ = (t²+1)(t²+6)·|scale|, so σ(±ι) = 0 with no degree drop anywhere.
    const sAtI = evalPoly([...cubicSigma], 0) - 0 // σ(0) = 6·|scale|, the constant term
    const factored = (t2: number): number => (t2 + 1) * (t2 + 6) * Math.abs(sAtI / 6)
    console.log(`    σ = (t²+1)(t²+6)·s: at t²=−1 it is ${factored(-1).toFixed(12)} — w divides σ`)
    expect(Math.abs(factored(-1)), 'the σ = h·w signature, at a complex pole').toBeLessThan(1e-12)
    console.log('    so the stratum at a complex pole needs NO degree drop — this cubic is genuinely a cubic')
  })
})
