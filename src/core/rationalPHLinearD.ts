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

const cpow = (z: Complex, n: number): Complex => { let r: Complex = { re: 1, im: 0 }; for (let i = 0; i < n; i++) r = cmul(r, z); return r }
/** Solve [[a,b],[c,d]]·(x,y) = (e,f) over ℂ. */
function solve2C(a: Complex, b: Complex, c: Complex, d: Complex, e: Complex, f: Complex): [Complex, Complex] {
  const det = csub(cmul(a, d), cmul(b, c))
  return [cdiv(csub(cmul(e, d), cmul(b, f)), det), cdiv(csub(cmul(a, f), cmul(e, c)), det)]
}
/** Clamped single-span knot vector of a given degree: [0×(deg+1), 1×(deg+1)]. */
const clampedKnots = (deg: number): number[] => [...Array(deg + 1).fill(0), ...Array(deg + 1).fill(1)]

/** Denominator power coefficients from its roots, gauge D(0)=1: D(t) = Π_k (1 − t/r_k). */
function dPowerFromRoots(roots: readonly Complex[]): Complex[] {
  let D: Complex[] = [{ re: 1, im: 0 }]
  for (const r of roots) D = polyMulC(D, [{ re: 1, im: 0 }, cscale(cdiv({ re: 1, im: 0 }, r), -1)])
  return D
}

/**
 * Fill in the DERIVED S coefficients so that ∫S²/D² is rational (exact PH) — the residue of
 * S²/D² vanishes at every root of D, i.e. S'(rₖ) = S(rₖ)·Σ_{l≠k} 1/(rₖ−r_l). Linear in S's
 * coefficients: degD=0 (D constant) has NO roots ⇒ no conditions, all of S free (the polynomial
 * PH corner); degD=1 derives s1 (one condition, S'(r)=0); degD=2 derives (s0,s1) from a 2×2
 * solve. `sFree` are the remaining coefficients in increasing power index.
 */
function deriveFullSPower(degS: number, degD: number, sFree: readonly Complex[], roots: readonly Complex[]): Complex[] {
  const s: Complex[] = new Array(degS + 1).fill(null).map(() => ({ re: 0, im: 0 }))
  if (degD === 0) {
    // D constant ⇒ ∫S²/D² is always rational ⇒ no residue conditions: S is fully free.
    // The curve is the polynomial PH curve of degree 2·degS+1 (all weights equal). free=[s0,…,s_degS].
    for (let i = 0; i <= degS; i++) s[i] = sFree[i]
  } else if (degD === 1) {
    // free = [s0, s2, s3, …, s_degS]; derived s1 = −Σ_{i≥2} i·s_i·r^{i−1}  (⇒ S'(r)=0)
    s[0] = sFree[0]
    for (let i = 2; i <= degS; i++) s[i] = sFree[i - 1]
    const r = roots[0]
    let s1: Complex = { re: 0, im: 0 }
    for (let i = 2; i <= degS; i++) s1 = csub(s1, cscale(cmul(s[i], cpow(r, i - 1)), i))
    s[1] = s1
  } else {
    // degD=2: free = [s2, …, s_degS]; derive (s0,s1) from S'(rₖ) − S(rₖ)/(rₖ−r_other) = 0.
    for (let i = 2; i <= degS; i++) s[i] = sFree[i - 2]
    const [r1, r2] = roots
    const build = (rk: Complex, ro: Complex) => {
      const g = cdiv({ re: 1, im: 0 }, csub(rk, ro)) // Σ_{l≠k} 1/(rk−r_l) = 1/(rk−ro)
      const cS0 = cscale(g, -1)
      const cS1 = csub({ re: 1, im: 0 }, cmul(g, rk))
      let rhs: Complex = { re: 0, im: 0 }
      for (let i = 2; i <= degS; i++) {
        const sp = cscale(cpow(rk, i - 1), i) // i·rk^{i−1}  (from S')
        const sv = cmul(g, cpow(rk, i)) //       g·rk^i      (from −g·S)
        rhs = csub(rhs, cmul(s[i], csub(sp, sv)))
      }
      return { cS0, cS1, rhs }
    }
    const A = build(r1, r2), B = build(r2, r1)
    const [s0, s1] = solve2C(A.cS0, A.cS1, B.cS0, B.cS1, A.rhs, B.rhs)
    s[0] = s0; s[1] = s1
  }
  return s
}

/** The reconstructed exactly-PH linear-D rational curve plus the (S, D) generating data. */
export interface RationalPHLinearDCurve {
  /** ComplexPoint control points (position = F_i/D_i, complex weight = D_i), degree 4, single span. */
  controlPoints: ComplexPoint[]
  knots: number[]
  degree: number
  /** Generating function S = u + i·v, Bernstein on [0,1]. */
  sReCPs: number[]
  sImCPs: number[]
  sKnots: number[]
  /** Denominator D, Bernstein on [0,1]. */
  dReCPs: number[]
  dImCPs: number[]
  dKnots: number[]
  /** max |F'D − FD' − S²| over Bernstein coeffs — the honest PH residual (≈ 0 when compatible). */
  wronskianResidual: number
}

/**
 * Exact reconstruction for GIVEN S and D given in the POWER basis (any generator degree, any
 * denominator degree). Runs the general recurrence f_{k+1} = [h_k − Σ_{j≥1}(k+1−2j)·d_j·f_{k+1−j}]
 * / [(k+1)·d_0] and returns the curve plus the honest Wronskian residual (≈0 iff (S,D) is
 * compatible — see `deriveFullSPower`). `rationalPHExactFromParams` builds compatible (S,D).
 */
export function reconstructExactRationalPH(
  sPow: readonly Complex[], dPow: readonly Complex[], origin: { x: number; y: number },
): RationalPHLinearDCurve {
  const degS = sPow.length - 1, degD = dPow.length - 1
  const H = polyMulC(sPow, sPow) //  H = S² (degree 2·degS)
  const nF = 2 * degS - degD + 1 //  F degree
  const d0 = dPow[0]
  const F: Complex[] = new Array(nF + 1)
  F[0] = cmul({ re: origin.x, im: origin.y }, d0) // f_0 = origin·D(0) ⇒ z(0)=F(0)/D(0)=origin
  for (let k = 0; k <= nF - 1; k++) {
    let acc: Complex = H[k] ?? { re: 0, im: 0 }
    for (let j = 1; j <= degD; j++) {
      const idx = k + 1 - j
      if (idx >= 0 && idx <= nF) acc = csub(acc, cscale(cmul(dPow[j], F[idx]), k + 1 - 2 * j))
    }
    F[k + 1] = cdiv(acc, cscale(d0, k + 1))
  }

  const Sbern = powerToBern(sPow, degS), Dbern = powerToBern(dPow, degD), Fbern = powerToBern(F, nF)
  // Honest Wronskian residual on Bernstein coeffs (core algebra, independent of the solve).
  const Fbd = complexArrayToCBD(Fbern), Dbd = complexArrayToCBD(Dbern), Sbd = complexArrayToCBD(Sbern)
  const W = Fbd.derivative().mul(Dbd).sub(Fbd.mul(Dbd.derivative())).sub(Sbd.mul(Sbd))
  let wronskianResidual = 0
  for (let i = 0; i < W.re.coeffs[0].length; i++)
    wronskianResidual = Math.max(wronskianResidual, Math.hypot(W.re.coeffs[0][i], W.im.coeffs[0][i]))

  // Complex-rational control points: P_i = F_i/D_i, weight = D_i (exact — both are degree-nF
  // Bernstein reps on the same span after elevating D, so no Greville sampling).
  const Delev = elevateBern(Dbern, nF)
  const controlPoints: ComplexPoint[] = Fbern.map((fi, i) => {
    const di = Delev[i]
    const pi = cdiv(fi, di)
    return { re: pi.re, im: pi.im, w_re: di.re, w_im: di.im }
  })

  return {
    controlPoints, knots: clampedKnots(nF), degree: nF,
    sReCPs: Sbern.map((z) => z.re), sImCPs: Sbern.map((z) => z.im), sKnots: clampedKnots(degS),
    dReCPs: Dbern.map((z) => z.re), dImCPs: Dbern.map((z) => z.im), dKnots: clampedKnots(degD),
    wronskianResidual,
  }
}

/** Exact reconstruction for S, D given in the BERNSTEIN basis (used by the reconstruction pin). */
export function reconstructRationalPHLinearD(
  sReCPs: readonly number[], sImCPs: readonly number[],
  dReCPs: readonly number[], dImCPs: readonly number[],
  origin: { x: number; y: number },
): RationalPHLinearDCurve {
  const Sb: Complex[] = sReCPs.map((re, i) => ({ re, im: sImCPs[i] }))
  const Db: Complex[] = dReCPs.map((re, i) => ({ re, im: dImCPs[i] }))
  return reconstructExactRationalPH(bernToPower(Sb), bernToPower(Db), origin)
}

/**
 * Free parameters of the exactly-PH rational family, any generator degree and constant/linear/
 * quadratic D. `sFree` are the S power coefficients NOT fixed by the compatibility
 * (degD=0 → all [s0,…,s_degS] — the polynomial PH corner; degD=1 → [s0,s2,…,s_degS];
 * degD=2 → [s2,…,s_degS]); `roots` are D's degD roots (off [0,1], empty for degD=0), with
 * D(0)=1 as the scale gauge.
 */
export interface RationalPHExactParams {
  degS: number
  degD: 0 | 1 | 2
  sFree: Complex[]
  roots: Complex[]
  origin: { x: number; y: number }
}

/** Build a compatible (exact-PH) rational curve of arbitrary generator/denominator degree. */
export function rationalPHExactFromParams(p: RationalPHExactParams): RationalPHLinearDCurve {
  const dPow = dPowerFromRoots(p.roots)
  const sPow = deriveFullSPower(p.degS, p.degD, p.sFree, p.roots)
  return reconstructExactRationalPH(sPow, dPow, p.origin)
}

/** Free parameters of the degree-2 S / linear-D special case (s1 = −2·s2·r derived). */
export interface RationalPHLinearDParams {
  s0: Complex
  s2: Complex
  /** Denominator endpoint d1 = D(1); d0 = D(0) pinned to 1. Root r = 1/(1 − d1). */
  d1: Complex
  origin: { x: number; y: number }
}

/** Backward-compatible degree-2 / linear-D constructor (delegates to the general path). */
export function rationalPHLinearDFromParams(prm: RationalPHLinearDParams): RationalPHLinearDCurve {
  const r = cdiv({ re: 1, im: 0 }, csub({ re: 1, im: 0 }, prm.d1)) // D's root, d0=1 gauge
  return rationalPHExactFromParams({ degS: 2, degD: 1, sFree: [prm.s0, prm.s2], roots: [r], origin: prm.origin })
}
