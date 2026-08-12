// ============================================================================
// THE WORKED ONE-POLE EXAMPLE — every number that goes on a slide, pinned.
//
// Built for the deck src/talks/price-of-a-circle, as the partner to the circle. The circle is the
// COMPLEX-pole regime: bounded, sigma = 2w, arc length 2*arctan(t). This one is the REAL-pole
// regime, where the lambda and r dials actually live, and it is the exact opposite on every axis.
//
//     pole at t = -1,   u := t + 1,   w = u
//     A(t) = 1 + lambda*i*u + j*u^2
//
// The no-log condition A'(r) = lambda * A(r) * i is satisfied BY CONSTRUCTION here, since A(r) = 1
// and A'(r) = lambda*i. So lambda is free and it IS the dial -- no solve, no search.
//
// Claims pinned below, all hand-derived first and every one checked here:
//   1. the condition holds identically in lambda
//   2. lambda = 0 gives a PLANAR curve (the j-component of N vanishes); lambda = 1 does not
//   3. N = (1 + u^2 - u^4, 2u^3, -2u^2) at lambda = 1, and ||N|| = |A|^2 = 1 + u^2 + u^4
//   4. p recovered by the recurrence (k-1)p_k = N_k gives
//          c(t) = ( -1/u + u - u^3/3,  u^2,  -2u )
//      with speed exactly sigma/w^2
//   5. the Bezier weights, after elevating w to the curve degree, are 1, 1.25, 1.5, 1.75, 2
//   6. THE ARC LENGTH IS RATIONAL: -1/u + u + u^3/3, agreeing with quadrature
//
// Contrast with the circle, made exact in the second describe block. The circle is INSIDE the
// literature's characterisation but OUTSIDE this chart: sigma vanishes at its (complex) pole, so the
// spinor is isotropic there and the two-sided strip has nothing to divide by. See the retraction
// note above that block -- an earlier claim that the circle sits on the stratum A(r) = 0 was a
// packing artefact and is wrong.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qconj, qmul, qvec } from '../quaternion'

type RPoly = number[]
type Vec3Poly = [RPoly, RPoly, RPoly]

const padd = (a: RPoly, b: RPoly): RPoly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pmul = (a: RPoly, b: RPoly): RPoly => {
  const o = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]
  return o
}
const pder = (a: RPoly): RPoly => a.slice(1).map((c, i) => c * (i + 1))
const pev = (a: RPoly, t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const pmax = (a: RPoly): number => Math.max(...a.map(Math.abs), 0)
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })

/** A i A* as three real polynomials, in the variable the spinor is written in. */
function sandwich(A: Quat[]): Vec3Poly {
  const deg = 2 * (A.length - 1)
  const o: Vec3Poly = [
    new Array(deg + 1).fill(0),
    new Array(deg + 1).fill(0),
    new Array(deg + 1).fill(0),
  ]
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      o[0][i + j] += v.x
      o[1][i + j] += v.y
      o[2][i + j] += v.z
    }
  }
  return o
}
function speedNumerator(A: Quat[]): RPoly {
  const o = new Array(2 * (A.length - 1) + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) o[i + j] += qmul(A[i], qconj(A[j])).u
  }
  return o
}

/** A(u) = 1 + lambda*i*u + j*u^2, written in the shifted variable u = t - r. */
const spinor = (lambda: number): Quat[] => [Q(1, 0, 0, 0), Q(0, lambda, 0, 0), Q(0, 0, 1, 0)]

describe('the worked one-pole example: A = 1 + lambda i u + j u^2', () => {
  it('satisfies the no-log condition identically in lambda — no solve required', () => {
    for (const lambda of [0, 1, -2.5, 0.37]) {
      const A = spinor(lambda)
      // at u = 0 (i.e. t = r): A(r) = 1, A'(r) = lambda*i
      const Ar = A[0]
      const dAr = A[1]
      const want = qmul(Ar, QUAT_I) // A(r) * i
      expect(Math.abs(dAr.u - lambda * want.u)).toBeLessThan(1e-15)
      expect(Math.abs(dAr.v - lambda * want.v)).toBeLessThan(1e-15)
      expect(Math.abs(dAr.p - lambda * want.p)).toBeLessThan(1e-15)
      expect(Math.abs(dAr.q - lambda * want.q)).toBeLessThan(1e-15)
      // and equivalently N'(r) = 0, since Sigma is an empty sum at a single pole
      const N = sandwich(A)
      for (const k of [0, 1, 2]) expect(Math.abs(pev(pder(N[k]), 0))).toBeLessThan(1e-15)
    }
  })

  it('lambda = 0 is PLANAR and lambda = 1 is not — the dial is visible', () => {
    const flat = sandwich(spinor(0))
    expect(pmax(flat[1])).toBeLessThan(1e-15) // the j-component vanishes identically
    expect(flat[0]).toEqual([1, 0, 0, 0, -1]) //  1 - u^4
    expect(flat[2]).toEqual([0, 0, -2, 0, 0]) // -2u^2

    const lifted = sandwich(spinor(1))
    expect(pmax(lifted[1])).toBeGreaterThan(0.5) // genuinely out of plane
    expect(lifted[0]).toEqual([1, 0, 1, 0, -1]) //  1 + u^2 - u^4
    expect(lifted[1]).toEqual([0, 0, 0, 2, 0]) //  2u^3
    expect(lifted[2]).toEqual([0, 0, -2, 0, 0]) // -2u^2
  })

  it('has ||N|| = |A|^2 = 1 + u^2 + u^4 exactly', () => {
    const A = spinor(1)
    const N = sandwich(A)
    const sigma = speedNumerator(A)
    expect(sigma).toEqual([1, 0, 1, 0, 1])
    const NN = padd(padd(pmul(N[0], N[0]), pmul(N[1], N[1])), pmul(N[2], N[2]))
    const s2 = pmul(sigma, sigma)
    expect(pmax(padd(NN, s2.map((x) => -x))) / pmax(s2)).toBeLessThan(1e-14)
  })

  it('recovers c(t) = (-1/u + u - u^3/3, u^2, -2u) by the recurrence', () => {
    const N = sandwich(spinor(1))
    // (k-1) p_k = N_k , with p_1 free (the translation) — take p_1 = 0
    const degP = 4
    const p: Vec3Poly = [
      new Array(degP + 1).fill(0),
      new Array(degP + 1).fill(0),
      new Array(degP + 1).fill(0),
    ]
    for (const comp of [0, 1, 2]) {
      for (let k = 0; k <= degP; k++) {
        if (k === 1) {
          expect(Math.abs(N[comp][1] ?? 0)).toBeLessThan(1e-15) // the consistency row
          continue
        }
        p[comp][k] = (N[comp][k] ?? 0) / (k - 1) + 0 // '+ 0' normalises -0 to 0
      }
    }
    expect(p[0]).toEqual([-1, 0, 1, 0, -1 / 3])
    expect(p[1]).toEqual([0, 0, 0, 1, 0])
    expect(p[2]).toEqual([0, 0, -2, 0, 0])

    // and the speed is exactly sigma / w^2 with w = u
    const w: RPoly = [0, 1]
    const sigma = speedNumerator(spinor(1))
    const Nn = p.map((pk) => padd(pmul(pder(pk), w), pmul(pk, pder(w)).map((x) => -x))) as Vec3Poly
    for (let i = 1; i <= 10; i++) {
      const u = 1 + i / 10 // t in [0,1] means u in [1,2]
      const wt = pev(w, u)
      const speed = Math.hypot(pev(Nn[0], u), pev(Nn[1], u), pev(Nn[2], u)) / (wt * wt)
      expect(Math.abs(speed - pev(sigma, u) / (wt * wt)) / speed).toBeLessThan(1e-13)
    }
  })

  it('gives Bezier weights 1, 1.25, 1.5, 1.75, 2 — an arithmetic progression', () => {
    // w = u = t + 1, so on t in [0,1] the end weights are 1 and 2; elevate a LINEAR w to degree 4
    const [b0, b1] = [1, 2] // Bernstein coefficients of w = 1 + t on [0,1]
    // elevating a DEGREE-1 Bernstein polynomial to degree n just interpolates its two ends
    const n = 4
    const elevated = Array.from({ length: n + 1 }, (_, i) => ((n - i) / n) * b0 + (i / n) * b1)
    expect(elevated).toEqual([1, 1.25, 1.5, 1.75, 2])
    expect(elevated.every((x) => x > 0)).toBe(true)
  })

  it('HAS RATIONAL ARC LENGTH — the exact opposite of the circle', () => {
    const sigma = speedNumerator(spinor(1)) // 1 + u^2 + u^4
    // the log coefficient at the pole is sigma'(r); here r is u = 0
    expect(Math.abs(pev(pder(sigma), 0))).toBeLessThan(1e-15)
    // closed form: integral of (u^-2 + 1 + u^2) du = -1/u + u + u^3/3
    const F = (u: number): number => -1 / u + u + (u * u * u) / 3
    const closed = F(2) - F(1) // t from 0 to 1 is u from 1 to 2
    let quad = 0
    const M = 400000
    for (let i = 0; i < M; i++) {
      const u = 1 + (i + 0.5) / M
      quad += (pev(sigma, u) / (u * u)) / M
    }
    expect(Math.abs(closed - quad) / closed).toBeLessThan(1e-9)
    // and for contrast, the circle: sigma = 2w vanishes at its pole, so the logarithm survives
    const circleSigma: RPoly = [2, 0, 2] // 2(1 + t^2) = 2w
    const circleW: RPoly = [1, 0, 1]
    expect(pmax(padd(circleSigma, pmul(circleW, [-2])))).toBeLessThan(1e-15) // sigma = 2w exactly
  })
})

// ---------------------------------------------------------------------------
// WHY THE CIRCLE IS OUTSIDE *THIS* CHART — and why it is NOT outside the literature's.
//
// ⚠ RETRACTION. An earlier version of this block claimed the circle sits on the excluded stratum
// A(r) = 0, on the strength of S(i) = 0 for the planar spinor S(t) = (1-t) + (1+t)i. That was a
// packing artefact: S is the COMPLEX packing of the hodograph, in which the second component is
// carried by a factor of i. As a VECTOR the circle's numerator does not vanish at the pole --
//
//     f_0 = N(i) = (-4i, 4, 0),   |f_0| = 5.66
//
// -- so Kalkan et al.'s standing hypothesis ("reduced with respect to i", which is f_0 nonzero) is
// SATISFIED, and their Lemma 4.2 applies: f_1 = N'(i) = -i * f_0, linearly dependent, residual 0.
// The circle is squarely inside their characterisation, as any rational PH curve must be. The
// consequential claims that fell with it: "N has a double zero", "the poles cancel", and "that is
// why the circle is bounded". None of those hold. c' does blow up at t = +/- i; the circle is
// bounded because those poles are off the REAL axis, which is all slide 5 ever claimed.
//
// WHAT IS ACTUALLY TRUE, and it is a statement about OUR chart rather than about the curve:
//
//     sigma(i) = 0
//
// The spinor is ISOTROPIC at the complexified pole -- not zero, but of vanishing norm. So A(r) is
// not invertible in the complexified quaternions, and the two-sided strip that produces
// A'(r) = A(r)(Sigma + lambda i) has nothing to divide by. The lambda chart is a REAL-pole chart
// and this is one reason why. Nothing is wrong with the circle; the chart simply does not reach it.
//
// Measured 2026-08-12.
// ---------------------------------------------------------------------------
type Cx = { re: number; im: number }
const cx = (re: number, im = 0): Cx => ({ re, im })
const cadd = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im)
const cmul = (a: Cx, b: Cx): Cx => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const cabs = (a: Cx): number => Math.hypot(a.re, a.im)
/** evaluate a REAL-coefficient polynomial at a complex argument */
const rev = (p: RPoly, z: Cx): Cx => p.reduceRight((s, c) => cadd(cmul(s, z), cx(c)), cx(0, 0))

describe('the circle: inside the literature, outside this chart', () => {
  // planar PH in the xy-plane has quaternion spinor A = a + d k, and A i A* = (a^2-d^2, 2ad, 0).
  // For the circle a = 1 - t, d = 1 + t.
  const N: [RPoly, RPoly, RPoly] = [
    [0, -4], // -4t
    [2, 0, -2], // 2 - 2t^2
    [0],
  ]
  const sigma: RPoly = [2, 0, 2] // (1-t)^2 + (1+t)^2 = 2 + 2t^2 = 2w
  const pole = cx(0, 1)

  it('f_0 = N(i) is NONZERO — the literature hypothesis holds', () => {
    const f0 = N.map((k) => rev(k, pole))
    expect(Math.hypot(...f0.map(cabs))).toBeGreaterThan(1)
  })

  it('and {f_0, f_1} are linearly dependent — Lemma 4.2 is satisfied, as it must be', () => {
    const f0 = N.map((k) => rev(k, pole))
    const f1 = N.map((k) => rev(pder(k), pole))
    // f1 = c * f0 with c = f1[0] / f0[0]
    const d = f0[0].re * f0[0].re + f0[0].im * f0[0].im
    const c = cx(
      (f1[0].re * f0[0].re + f1[0].im * f0[0].im) / d,
      (f1[0].im * f0[0].re - f1[0].re * f0[0].im) / d,
    )
    const resid = Math.hypot(
      ...f0.map((v, k) => cabs(cadd(cmul(v, c), cx(-f1[k].re, -f1[k].im)))),
    )
    expect(resid).toBeLessThan(1e-14)
  })

  it('but sigma(i) = 0 — the spinor is ISOTROPIC there, so this chart cannot divide by it', () => {
    expect(sigma).toEqual([2, 0, 2]) // = 2w exactly
    expect(cabs(rev(sigma, pole))).toBeLessThan(1e-15)
    // consistently, N(i) is an isotropic vector: N . N = 0 while N itself is not
    const f0 = N.map((k) => rev(k, pole))
    const NN = f0.reduce((s, v) => cadd(s, cmul(v, v)), cx(0, 0))
    expect(cabs(NN)).toBeLessThan(1e-14)
  })

  it('CONTRAST: the one-pole example has sigma(r) = 1, so the strip is available', () => {
    expect(pev(speedNumerator(spinor(1)), 0)).toBe(1)
  })
})
