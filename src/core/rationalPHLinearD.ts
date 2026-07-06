// Exactly-PH rational curves with a LINEAR denominator — the genuinely-rational realization
// of the generating-function bound.
//
// Background (why this file exists). A rational PH curve z = F/D has hodograph z' = S²/D² = σ²
// (σ = S/D the rational preimage). The legacy (S,D) reconstruction (complexRationalPHCurve.ts)
// is EXACT only when D is constant — there the curve is just a rotated polynomial-PH curve
// (constant weights, not genuinely rational). For any non-constant D it falls back to forward
// Euler, so the drawn curve is only APPROXIMATELY PH; the reduced numerator Ñ (built from S,D)
// then disagrees with the drawn curve's true curvature numerator near bifurcations. That broke
// the honesty the whole bound rests on (CLAUDE.md Law 3).
//
// This file does the exact reconstruction for D LINEAR — the first genuinely-rational case.
// The Wronskian F'D − FD' = H = S² is, in the power basis with D = p + q·t, one coefficient
// recurrence per power of t:
//
//     (k+1)·p·f_{k+1} + (k−1)·q·f_k = h_k      ⇒     f_{k+1} = [ h_k − (k−1)·q·f_k ] / [ (k+1)·p ]
//
// forward from a free f_0 (the integration constant = start position × D(0)). The top coefficient
// is a CONSISTENCY condition — the 1-dim kernel of L(F)=F'D−FD' is D itself, so H must lie in the
// image. That condition is exactly the "no logarithmic term" / residue-vanishes condition for
// ∫σ² to be rational: residue of S²/D² at D's root r is 2·S(r)·S'(r)/q², so exact-PH ⇔ S'(r)=0
// (the genuinely-rational branch). For degree-2 S that is a single linear constraint that we
// PARAMETERIZE AWAY: S'(r)=0 ⇔ s1 = −2·s2·r. So the family is freely editable in (s0, s2, D)
// with PH exact BY CONSTRUCTION — no equality constraint to fight, D genuinely varying.
//
// Verified before writing (scratchpad exactRecurrence.mjs / exactHonesty.mjs): reconstruction
// residual 3.6e-15; sign(Ñ) ≡ sign(g_drawn) 396/396. Pinned in rationalPHLinearD.test.ts.

import { BernsteinDecomposition } from './bernstein'
import { ComplexBD } from './complexBernstein'
import type { Complex } from './complex'
import type { ComplexPoint } from './types'

// ── tiny complex helpers (local; the core `Complex` type has no arithmetic) ──────────────────
const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im })
const cmul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const cscale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s })
const cdiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

// ── single-span Bernstein ↔ power basis on [0,1] (complex, component-wise linear) ────────────
function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}
/** Bernstein coeffs b[0..n] → power coeffs c[0..n]:  c_k = C(n,k)·Σ_{i≤k} (−1)^{k−i} C(k,i) b_i. */
function bernToPower(b: readonly Complex[]): Complex[] {
  const n = b.length - 1
  const c: Complex[] = []
  for (let k = 0; k <= n; k++) {
    let acc: Complex = { re: 0, im: 0 }
    for (let i = 0; i <= k; i++) {
      const s = ((k - i) % 2 === 0 ? 1 : -1) * binom(k, i)
      acc = cadd(acc, cscale(b[i], s))
    }
    c.push(cscale(acc, binom(n, k)))
  }
  return c
}
/** Power coeffs c[0..n] → Bernstein coeffs b[0..n]:  b_j = Σ_{k≤j} [C(j,k)/C(n,k)]·c_k. */
function powerToBern(c: readonly Complex[], n: number): Complex[] {
  const b: Complex[] = []
  for (let j = 0; j <= n; j++) {
    let acc: Complex = { re: 0, im: 0 }
    for (let k = 0; k <= j; k++) acc = cadd(acc, cscale(c[k], binom(j, k) / binom(n, k)))
    b.push(acc)
  }
  return b
}
/** Power-basis polynomial product (convolution). */
function polyMulC(A: readonly Complex[], B: readonly Complex[]): Complex[] {
  const R: Complex[] = Array.from({ length: A.length + B.length - 1 }, () => ({ re: 0, im: 0 }))
  for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) R[i + j] = cadd(R[i + j], cmul(A[i], B[j]))
  return R
}
/** Degree-elevate single-span Bernstein coeffs from degree n to N (N ≥ n), complex. */
function elevateBern(b: readonly Complex[], N: number): Complex[] {
  const n = b.length - 1
  const out: Complex[] = []
  for (let j = 0; j <= N; j++) {
    let acc: Complex = { re: 0, im: 0 }
    const lo = Math.max(0, j - (N - n))
    const hi = Math.min(n, j)
    for (let i = lo; i <= hi; i++) {
      const w = (binom(n, i) * binom(N - n, j - i)) / binom(N, j)
      acc = cadd(acc, cscale(b[i], w))
    }
    out.push(acc)
  }
  return out
}

const complexArrayToCBD = (arr: readonly Complex[]): ComplexBD =>
  new ComplexBD(
    new BernsteinDecomposition([arr.map((z) => z.re)], [0, 1]),
    new BernsteinDecomposition([arr.map((z) => z.im)], [0, 1]),
  )

/** The reconstructed exactly-PH linear-D rational curve plus the (S, D) generating data. */
export interface RationalPHLinearDCurve {
  /** ComplexPoint control points (position = F_i/D_i, complex weight = D_i), degree 4, single span. */
  controlPoints: ComplexPoint[]
  knots: number[]
  degree: number
  /** Generating function S = u + i·v (degree 2), Bernstein on [0,1]. */
  sReCPs: number[]
  sImCPs: number[]
  sKnots: number[]
  /** Denominator D (linear), Bernstein on [0,1]. */
  dReCPs: number[]
  dImCPs: number[]
  dKnots: number[]
  /** max |F'D − FD' − S²| over Bernstein coeffs — the honest PH residual (≈ 0 when compatible). */
  wronskianResidual: number
}

const S_KNOTS = [0, 0, 0, 1, 1, 1] // degree-2 clamped single span
const D_KNOTS = [0, 0, 1, 1] //       degree-1 clamped single span
const CURVE_KNOTS = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1] // degree-4 clamped single span

/**
 * Exact reconstruction for a GIVEN degree-2 S and linear D. Returns the curve and the honest
 * Wronskian residual (≈0 iff S'(r)=0 at D's root, i.e. the curve is genuinely PH). Use
 * `rationalPHLinearDFromParams` for a construction that is compatible by design.
 */
export function reconstructRationalPHLinearD(
  sReCPs: readonly number[],
  sImCPs: readonly number[],
  dReCPs: readonly number[],
  dImCPs: readonly number[],
  origin: { x: number; y: number },
): RationalPHLinearDCurve {
  const sDeg = sReCPs.length - 1 // expected 2
  const Sb: Complex[] = sReCPs.map((re, i) => ({ re, im: sImCPs[i] }))
  const Db: Complex[] = dReCPs.map((re, i) => ({ re, im: dImCPs[i] }))
  const Sp = bernToPower(Sb) //  power coeffs of S (degree sDeg)
  const Dp = bernToPower(Db) //  power coeffs of D (degree 1): [p, q]
  const p = Dp[0]
  const q = Dp[1]
  const H = polyMulC(Sp, Sp) // degree 2·sDeg
  const nF = 2 * sDeg //        F degree = 2·sDeg − dDeg + 1 = 2·sDeg (dDeg = 1)

  // f_0 = origin × D(0) = origin × p  (so z(0) = F(0)/D(0) = origin)
  const F: Complex[] = new Array(nF + 1)
  F[0] = cmul({ re: origin.x, im: origin.y }, p)
  for (let k = 0; k <= nF - 1; k++) {
    const hk = H[k] ?? { re: 0, im: 0 }
    const rhs = csub(hk, cscale(cmul(q, F[k]), k - 1))
    F[k + 1] = cdiv(rhs, cscale(p, k + 1))
  }

  // Honest Wronskian residual on Bernstein coeffs (uses core algebra, independent of the solve).
  const Fbd = complexArrayToCBD(powerToBern(F, nF))
  const Dbd = complexArrayToCBD(Db)
  const Sbd = complexArrayToCBD(Sb)
  const W = Fbd.derivative().mul(Dbd).sub(Fbd.mul(Dbd.derivative())).sub(Sbd.mul(Sbd))
  let wronskianResidual = 0
  for (let i = 0; i < W.re.coeffs[0].length; i++)
    wronskianResidual = Math.max(wronskianResidual, Math.hypot(W.re.coeffs[0][i], W.im.coeffs[0][i]))

  // Form the degree-4 complex-rational control points: P_i = F_i / D_i, weight = D_i (exact —
  // both are true degree-4 Bernstein reps on the same span, so no Greville sampling).
  const Fbern = powerToBern(F, nF)
  const Dbern = elevateBern(Db, nF)
  const controlPoints: ComplexPoint[] = Fbern.map((fi, i) => {
    const di = Dbern[i]
    const pi = cdiv(fi, di)
    return { re: pi.re, im: pi.im, w_re: di.re, w_im: di.im }
  })

  return {
    controlPoints,
    knots: [...CURVE_KNOTS],
    degree: nF,
    sReCPs: [...sReCPs],
    sImCPs: [...sImCPs],
    sKnots: [...S_KNOTS],
    dReCPs: [...dReCPs],
    dImCPs: [...dImCPs],
    dKnots: [...D_KNOTS],
    wronskianResidual,
  }
}

/** Free parameters of the exactly-PH linear-D family (degree-2 S, gauge d0 = 1). */
export interface RationalPHLinearDParams {
  /** S(0) power coefficient s0 (= S at t=0). */
  s0: Complex
  /** S's leading power coefficient s2 (curvature of the preimage). */
  s2: Complex
  /** Denominator endpoint d1 = D(1); d0 = D(0) is pinned to 1 (scale gauge). */
  d1: Complex
  origin: { x: number; y: number }
}

/**
 * Build a compatible exactly-PH linear-D curve from free params. Enforces S'(r) = 0 (⇒ exact PH)
 * by deriving s1 = −2·s2·r, where r = 1/(1 − d1) is D's root with d0 pinned to 1.
 */
export function rationalPHLinearDFromParams(prm: RationalPHLinearDParams): RationalPHLinearDCurve {
  const d0: Complex = { re: 1, im: 0 }
  const { s0, s2, d1, origin } = prm
  // D = d0·(1−t) + d1·t ⇒ D(t)=0 at t = d0/(d0−d1) = 1/(1−d1).
  const r = cdiv(d0, csub(d0, d1))
  const s1 = cscale(cmul(s2, r), -2) // S'(r) = s1 + 2 s2 r = 0
  // S power basis [s0, s1, s2] → Bernstein (degree 2) for the reconstruction interface.
  const sBern = powerToBern([s0, s1, s2], 2)
  return reconstructRationalPHLinearD(
    sBern.map((z) => z.re),
    sBern.map((z) => z.im),
    [d0.re, d1.re],
    [d0.im, d1.im],
    origin,
  )
}
