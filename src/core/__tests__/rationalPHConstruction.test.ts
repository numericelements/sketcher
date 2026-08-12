// ============================================================================
// RATIONAL SPATIAL PH CURVES: TWO THINGS MEASURED, AND WHY THEY MATTER.
//
// Context. FOUNDATIONS F14 established the spatial no-log condition on the spinor:
//
//     A'(r) = A(r) * (Sigma + lambda i),     Sigma = sum over the OTHER roots of 1/(r_k - r_l)
//
// The 2022 literature (Kalkan, Scharler, Schrocker, Sir, "Rational Framing Motions and Spatial
// Rational Pythagorean Hodograph Curves", CAGD; arXiv 2111.04600) states the same obstruction more
// generally as Thm 4.6 -- a truly rational PH curve exists iff the Taylor coefficients of A i A* at
// a root of the denominator are LINEARLY DEPENDENT -- and observes that for a GENERIC pair (A,
// alpha) only polynomial solutions exist. This file pins two facts that sit either side of that.
//
// (1) MOBIUS IMAGES ARE A SYSTEMATIC WAY INTO THE EXCEPTIONAL SET, and they overshoot.
//     Invert a polynomial PH curve about a centre c: p = r - c and w = p.p. Thm 4.6 needs the
//     dependence at ONE root of w. Measured here: it holds at EVERY root, for every specimen. The
//     mechanism is structural -- w is the squared distance to c, so its roots are exactly where the
//     complexified curve meets the isotropic cone at c. Tested as a polynomial divisibility so no
//     root-finder is needed: N x N' vanishes at every root of w, hence w divides it.
//     A CONTROL is included; without one the assertion would be vacuous.
//
// (2) THE ARC LENGTH IS RATIONAL -- AT ANY NUMBER OF POLES, which sharpens the usual reading of
//     "rational PH curves typically have no rational arc-length function". The speed is sigma/w^2
//     with sigma = |A|^2. At a pole, w = (t-r_k)*phi, so the Laurent NUMERATOR is sigma/phi^2 and
//     the coefficient of the logarithm is
//
//         B_k = [ sigma'(r_k) - 2*sigma(r_k)*Sigma_k ] / phi(r_k)^2
//
//     F14's solved form gives sigma' = 2*Sigma*sigma, so the bracket vanishes IDENTICALLY. The
//     condition that makes the CURVE rational is the same one that makes its LENGTH rational.
//
//     ⚠ AN EARLIER VERSION OF THIS FILE GOT THAT WRONG and the error is instructive. It claimed the
//     log coefficient was sigma'(r) alone -- forgetting that differentiating phi^-2 contributes the
//     second term. At m = 1, phi is identically 1 AND Sigma = 0, so both terms vanish separately and
//     the wrong reasoning yields the right number. The assertion below therefore passed while the
//     argument behind it did not generalise. Corrected by another session, which measured the true
//     coefficients at two poles as 4.6e-13 and -6.3e-13 where the old formula predicted 1.92 and
//     -1.48, and confirmed rationality constructively at m = 2 (rational antiderivative fitting to
//     2.4e-14). The single-pole assertion below is kept because it is true; the general claim now
//     lives with the multi-pole work rather than here.
//
//     Related: arc length is also CONSTANT along the closed one-pole fiber (spread 5.7e-8), so
//     length is a blind selector here exactly as it is for the polynomial cubic.
//
// Measured 2026-08-11, for the deck src/talks/two-points-or-a-circle.
//
// ⚠ OVERLAP, DELIBERATELY LEFT FOR NOW. core/rationalPHOnePoleSpatial.ts already builds this family,
// and better: FOUNDATIONS F16 solves the one-pole condition by SUBSTITUTION rather than a null-space
// computation (A = B0 + lambda(B0 i)(t-r) + B2(t-r)^2), at 0.016 ms per member. The second describe
// block below rebuilds it from scratch because it was written before that module was found. It is
// kept only because the two facts it pins -- the weight progression and the RATIONAL ARC LENGTH --
// are not covered elsewhere. WHOEVER TOUCHES THIS NEXT: re-express the second block on top of
// rationalPHOnePoleSpatial and delete the local reconstruction; keep the assertions.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qconj, qmul, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
type Vec3Poly = [RPoly, RPoly, RPoly]

const padd = (a: RPoly, b: RPoly): RPoly => {
  const n = Math.max(a.length, b.length)
  return Array.from({ length: n }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
}
const pmul = (a: RPoly, b: RPoly): RPoly => {
  const o = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]
  return o
}
const pscale = (a: RPoly, s: number): RPoly => a.map((x) => x * s)
const pder = (a: RPoly): RPoly => a.slice(1).map((c, i) => c * (i + 1))
const pint = (a: RPoly): RPoly => [0, ...a.map((c, i) => c / (i + 1))]
const pev = (a: RPoly, t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const pmax = (a: RPoly): number => Math.max(...a.map(Math.abs), 0)

/** Remainder of `a` on division by `d` (both real polynomials, `d` monic-ised internally). */
function premainder(a: RPoly, d: RPoly): RPoly {
  const r = a.slice()
  const dd = d.length - 1
  const lead = d[dd]
  for (let i = r.length - 1; i >= dd; i--) {
    const f = r[i] / lead
    if (!f) continue
    for (let j = 0; j <= dd; j++) r[i - dd + j] -= f * d[j]
  }
  return r.slice(0, dd)
}

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })

/** The Hopf sandwich A i A* as three real polynomials. */
function sandwich(A: Quat[]): Vec3Poly {
  const deg = 2 * (A.length - 1)
  const out: Vec3Poly = [
    new Array(deg + 1).fill(0),
    new Array(deg + 1).fill(0),
    new Array(deg + 1).fill(0),
  ]
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      out[0][i + j] += v.x
      out[1][i + j] += v.y
      out[2][i + j] += v.z
    }
  }
  return out
}

/** |A|^2 as a real polynomial — the speed numerator. */
function speedNumerator(A: Quat[]): RPoly {
  const out = new Array(2 * (A.length - 1) + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) out[i + j] += qmul(A[i], qconj(A[j])).u
  }
  return out
}

const cross = (a: Vec3Poly, b: Vec3Poly): Vec3Poly => [
  padd(pmul(a[1], b[2]), pscale(pmul(a[2], b[1]), -1)),
  padd(pmul(a[2], b[0]), pscale(pmul(a[0], b[2]), -1)),
  padd(pmul(a[0], b[1]), pscale(pmul(a[1], b[0]), -1)),
]

/** N = p'w - p w', the Wronskian numerator of (p/w)'. */
const wronskian = (p: Vec3Poly, w: RPoly): Vec3Poly =>
  p.map((pk) => padd(pmul(pder(pk), w), pscale(pmul(pk, pder(w)), -1))) as Vec3Poly

// ---------------------------------------------------------------------------

describe('Mobius images of polynomial PH curves land in the exceptional set', () => {
  const SPINORS: Quat[][] = [
    [Q(1, 0, 0, 0), Q(0.3, 0.5, -0.2, 0.4), Q(-0.1, 0.2, 0.6, 0.1)],
    [Q(0.7, -0.4, 0.9, 0.2), Q(1.1, 0.3, -0.6, 0.5), Q(0.2, 0.8, 0.1, -0.3)],
    [Q(1, 0.2, 0.1, 0), Q(0, 1, 0, 0), Q(0.4, -0.5, 0.3, 0.7)],
  ]
  const CENTRES: [number, number, number][] = [
    [3, 3, 3],
    [-2, 1.5, 4],
    [0.3, -5, 2.2],
  ]

  /**
   * Relative size of the remainder of N x N' on division by w. Zero => dependent at every root.
   *
   * TOLERANCE, and why it is 1e-10 rather than machine zero. N x N' has degree 27 and w degree 10,
   * with roots at |z| ~ 2..3, so synthetic division runs through powers of order 3^27 and costs
   * roughly three digits. The SAME claim, measured by evaluating N x N' directly at the ten roots
   * (Durand-Kerner) rather than dividing, comes out at 6.2e-15 -- machine precision. The looser
   * bound here is the division's arithmetic, not the mathematics, and the control below sits nine
   * orders of magnitude away, so nothing is being smuggled through.
   */
  function dependenceDefect(N: Vec3Poly, w: RPoly): number {
    const c = cross(N, N.map(pder) as Vec3Poly)
    const scale = Math.max(...c.map(pmax), 1e-300)
    return Math.max(...c.map((ck) => pmax(premainder(ck, w)))) / scale
  }

  it('satisfies the dependence condition at EVERY root of the denominator', () => {
    for (const A of SPINORS) {
      const r = sandwich(A).map(pint) as Vec3Poly
      for (const c of CENTRES) {
        const p = r.map((rk, k) => padd(rk, [-c[k]])) as Vec3Poly
        const w = padd(padd(pmul(p[0], p[0]), pmul(p[1], p[1])), pmul(p[2], p[2]))
        expect(w.length - 1).toBe(10)
        // it really is PH: ||N|| = |A|^2 * w
        const N = wronskian(p, w)
        const NN = padd(padd(pmul(N[0], N[0]), pmul(N[1], N[1])), pmul(N[2], N[2]))
        const pred = pmul(speedNumerator(A), w)
        const predSq = pmul(pred, pred)
        expect(pmax(padd(NN, pscale(predSq, -1))) / pmax(predSq)).toBeLessThan(1e-12)
        // and the dependence holds at every root
        expect(dependenceDefect(N, w)).toBeLessThan(1e-10)
      }
    }
  })

  it('CONTROL: a generic (spinor, denominator) pair does not', () => {
    const WS: RPoly[] = [
      [1, 0.4, -1.2, 0.3, 0.9, 0.2, -0.5, 0.1, 0.7, -0.3, 1],
      [2, -1, 0.5, 1.3, -0.2, 0.8],
    ]
    for (const A of SPINORS) {
      for (const w of WS) {
        // N is the sandwich itself here — a generic rational hodograph N/w^2
        expect(dependenceDefect(sandwich(A), w)).toBeGreaterThan(1e-3)
      }
    }
  })
})

describe('the single-pole family: a rational PH Bezier, and its arc length', () => {
  const r = -1 // the pole, outside [0,1]
  const lambda = 0.8
  const w: RPoly = [1, 1] // w = 1 + t, root at -1; Bernstein weights stay positive on [0,1]

  /**
   * Build an admissible spinor. With ONE pole Sigma = 0, so the condition is A'(r) = lambda A(r) i.
   * Choosing A0 and A2 freely leaves a 2x2 block system for A1 with determinant 1 + (lambda r)^2,
   * so A1 is available in closed form — no null-space computation needed.
   */
  function admissibleSpinor(A0: Quat, A2: Quat): Quat[] {
    const lr = lambda * r
    const rhsQ = (x: Quat, s: number): Quat => {
      const xi = qmul(x, QUAT_I) // right-multiplication by i
      return { u: xi.u * s, v: xi.v * s, p: xi.p * s, q: xi.q * s }
    }
    // RHS = lambda*A0*i + lambda*r^2*A2*i - 2r*A2
    const t1 = rhsQ(A0, lambda)
    const t2 = rhsQ(A2, lambda * r * r)
    const R = {
      u: t1.u + t2.u - 2 * r * A2.u,
      v: t1.v + t2.v - 2 * r * A2.v,
      p: t1.p + t2.p - 2 * r * A2.p,
      q: t1.q + t2.q - 2 * r * A2.q,
    }
    const det = 1 + lr * lr
    return [
      A0,
      {
        u: (R.u - lr * R.v) / det,
        v: (R.v + lr * R.u) / det,
        p: (R.p + lr * R.q) / det,
        q: (R.q - lr * R.p) / det,
      },
      A2,
    ]
  }

  const A = admissibleSpinor(Q(0.9, -0.4, 0.6, 0.2), Q(-0.7, 0.3, 0.5, -0.15))

  it('the spinor satisfies the no-log condition to machine precision', () => {
    const at = (t: number): Quat => ({
      u: A[0].u + A[1].u * t + A[2].u * t * t,
      v: A[0].v + A[1].v * t + A[2].v * t * t,
      p: A[0].p + A[1].p * t + A[2].p * t * t,
      q: A[0].q + A[1].q * t + A[2].q * t * t,
    })
    const dAt = (t: number): Quat => ({
      u: A[1].u + 2 * A[2].u * t,
      v: A[1].v + 2 * A[2].v * t,
      p: A[1].p + 2 * A[2].p * t,
      q: A[1].q + 2 * A[2].q * t,
    })
    const lhs = dAt(r)
    const rhs = qmul(at(r), QUAT_I)
    const worst = Math.max(
      Math.abs(lhs.u - lambda * rhs.u),
      Math.abs(lhs.v - lambda * rhs.v),
      Math.abs(lhs.p - lambda * rhs.p),
      Math.abs(lhs.q - lambda * rhs.q),
    )
    const scale = Math.max(Math.abs(lhs.u), Math.abs(lhs.v), Math.abs(lhs.p), Math.abs(lhs.q))
    expect(worst / scale).toBeLessThan(1e-12)
  })

  /** Recover p from p'w - p w' = N. Consistent exactly because the residue condition holds. */
  function recoverP(): { p: Vec3Poly; residual: number } {
    const N = sandwich(A)
    const degP = 4
    const wp = pder(w)
    const rows: number[][] = []
    const rhs: number[] = []
    for (let comp = 0; comp < 3; comp++) {
      for (let e = 0; e <= degP + w.length - 1; e++) {
        const row = new Array(3 * (degP + 1)).fill(0)
        for (let k = 0; k <= degP; k++) {
          let acc = 0
          for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
          for (let a = 0; a < wp.length; a++) if (k + a === e) acc -= wp[a]
          row[comp * (degP + 1) + k] = acc
        }
        rows.push(row)
        rhs.push(N[comp][e] ?? 0)
      }
    }
    const x = leastSquares(rows, rhs, 1e-14)
    let worst = 0
    for (let i = 0; i < rows.length; i++) {
      worst = Math.max(worst, Math.abs(rows[i].reduce((s, a, j) => s + a * x[j], 0) - rhs[i]))
    }
    const p = [0, 1, 2].map((c) =>
      Array.from({ length: degP + 1 }, (_, k) => x[c * (degP + 1) + k]),
    ) as Vec3Poly
    return { p, residual: worst / Math.max(...rhs.map(Math.abs)) }
  }

  it('recovers a rational curve whose speed is exactly |A|^2 / w^2', () => {
    const { p, residual } = recoverP()
    expect(residual).toBeLessThan(1e-12)
    const N = wronskian(p, w)
    const sigma = speedNumerator(A)
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const wt = pev(w, t)
      const speed = Math.hypot(pev(N[0], t), pev(N[1], t), pev(N[2], t)) / (wt * wt)
      const predicted = pev(sigma, t) / (wt * wt)
      expect(Math.abs(speed - predicted) / predicted).toBeLessThan(1e-12)
    }
  })

  it('has Bezier weights in arithmetic progression, all positive', () => {
    // degree-elevating a LINEAR w to the curve degree 4 interpolates the two end weights
    const binom = (n: number, k: number): number => {
      let v = 1
      for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1)
      return v
    }
    const wB = Array.from({ length: 5 }, (_, j) => {
      let s = 0
      for (let i = 0; i <= j; i++) s += (binom(j, i) / binom(4, i)) * (w[i] ?? 0)
      return s
    })
    expect(wB.every((x) => x > 0)).toBe(true)
    const d = wB.slice(1).map((x, i) => x - wB[i])
    expect(Math.max(...d) - Math.min(...d)).toBeLessThan(1e-12)
  })

  it('has RATIONAL arc length, because one pole means Sigma = 0', () => {
    // The logarithm's coefficient in the integral of |A|^2/w^2 is (|A|^2)'(r).
    // F14's solved form gives V + V* = 2*Sigma, hence (|A|^2)' = 2*Sigma*|A|^2 — and with a single
    // pole Sigma is an EMPTY SUM. So this must vanish, and the arc length is rational.
    const sigma = speedNumerator(A)
    const logCoefficient = pev(pder(sigma), r)
    expect(Math.abs(logCoefficient) / pmax(sigma)).toBeLessThan(1e-12)

    // end to end: the closed form (no log term) against high-resolution quadrature
    const shifted = (() => {
      const binom = (n: number, k: number): number => {
        let v = 1
        for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1)
        return v
      }
      const out = new Array(sigma.length).fill(0)
      for (let i = 0; i < sigma.length; i++) {
        for (let k = 0; k <= i; k++) out[k] += sigma[i] * binom(i, k) * Math.pow(r, i - k)
      }
      return out
    })()
    const b = shifted[0]
    const polyPart = shifted.slice(2)
    const F = (t: number): number => {
      const u = t - r
      let s = 0
      for (let i = 0; i < polyPart.length; i++) s += (polyPart[i] * Math.pow(u, i + 1)) / (i + 1)
      return s - b / u
    }
    const closed = F(1) - F(0)
    let quad = 0
    const M = 200000
    for (let i = 0; i < M; i++) {
      const t = (i + 0.5) / M
      quad += pev(sigma, t) / Math.pow(pev(w, t), 2) / M
    }
    expect(Math.abs(closed - quad) / Math.abs(closed)).toBeLessThan(1e-9)
  })
})
