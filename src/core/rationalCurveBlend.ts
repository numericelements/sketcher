// ============================================================================
// STRAIGHT LINES IN TWO DIFFERENT COORDINATES — and only one of them stays PH.
//
// WHY THIS MODULE EXISTS. Fix a pole placement and a twist rate and the admissible spinors form a
// LINEAR SUBSPACE (FOUNDATIONS F17): 𝒜′(r_k) = 𝒜(r_k)(Σ_k + λ_k i) is linear in 𝒜 at fixed λ. So
// (1−s)𝒜₀ + s𝒜₁ is admissible whenever the ends are, for every real s, inside the segment and well
// outside it. That is the whole reason a chart costs nothing.
//
// BUT THE CURVE IS QUADRATIC IN THE SPINOR — N = 𝒜i𝒜* — so linear in the spinor is NOT linear in the
// curve. Two members of one chart share a denominator w, hence the pointwise blend
//
//     c_s = (1−s)·c₀ + s·c₁ = [(1−s)p₀ + s p₁] / w
//
// is a perfectly good rational curve with the SAME poles, sitting in the same ambient space. It is
// simply not PH. Same two endpoints, two different straight lines, one of them straight in the right
// coordinates. This module supplies the number that tells them apart.
//
// THE MEASURE, and it has to work on a curve with no spinor behind it. c is PH exactly when
// ‖c′‖ = √(|N|²)/w² is rational, i.e. when √(|N|²) is a POLYNOMIAL — of degree exactly half that of
// |N|², since |N|² is its square.
//
// AND IT HAS TO BE AN ALGEBRAIC TEST, not an approximation one. The obvious version — sample √q, fit
// a polynomial of half the degree, report the residual — was built first and is USELESS, by a factor
// of ten thousand. q is positive and smooth on [0,1], so √q is too, and a degree-4 polynomial
// approximates any such function well on an interval that short: curves separated by 94 units, nothing
// like PH, still fit to 8e-6. "Well approximated by a polynomial" and "IS a polynomial" are simply
// different questions, and only the second one is the Pythagorean condition.
//
// So the square root is taken FORMALLY. Normalise q to q(t₀) = 1 at the sample point where it is
// largest — being a square is translation-invariant, and the shift keeps the series away from any
// place q nearly vanishes — then run the recurrence s_k = (q̂_k − Σ s_i s_{k−i})/2. That fixes the
// first n+1 coefficients of s exactly; the top n coefficients of s² are then FORCED, and how far they
// miss q̂ is the defect. Zero exactly when q is a square, O(1) when it is not, and smooth in between,
// which is what a slider needs. Same construction as sp11RationalPH.polySqrt, graded instead of
// yes/no.
//
// Nothing here knows about spinors, poles or admissibility on purpose: the point of the measure is
// that it applies to a curve that was never built from a chart at all.
// ============================================================================
import type { Vec3 } from './quaternion'

/** A spatial rational curve in power-basis coefficients: c = p/w, with p = [px, py, pz]. */
export interface RationalCurve {
  readonly p: readonly (readonly number[])[]
  readonly w: readonly number[]
}

const evalPoly = (a: readonly number[], t: number): number => a.reduceRight((acc, c) => acc * t + c, 0)
const derivPoly = (a: readonly number[]): number[] => a.slice(1).map((c, i) => c * (i + 1))
const pAdd = (a: readonly number[], b: readonly number[]): number[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pMul = (a: readonly number[], b: readonly number[]): number[] => {
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}

export const pointOn = (c: RationalCurve, t: number): Vec3 => {
  const wv = evalPoly(c.w, t)
  return { x: evalPoly(c.p[0], t) / wv, y: evalPoly(c.p[1], t) / wv, z: evalPoly(c.p[2], t) / wv }
}

/**
 * The POINTWISE blend, which is the naive thing to try. Both curves must share a denominator — two
 * members of one chart always do, since w is determined by the poles alone — so the blend is again a
 * rational curve over that same w rather than something of twice the degree.
 */
export function blendCurves(a: RationalCurve, b: RationalCurve, s: number): RationalCurve {
  return {
    p: [0, 1, 2].map((k) => pAdd(a.p[k].map((v) => (1 - s) * v), b.p[k].map((v) => s * v))),
    w: a.w,
  }
}

/** N = p′w − p w′, the hodograph numerator: c′ = N/w². */
export function hodographNumerator(c: RationalCurve): number[][] {
  const wD = derivPoly(c.w)
  return c.p.map((pk) => {
    const a = pMul(derivPoly(pk), c.w)
    const b = pMul(pk, wD)
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0))
  })
}

/** Coefficients of a(t + t0), by repeated synthetic division: each remainder is the next one. */
function shiftPoly(a: readonly number[], t0: number): number[] {
  let c = a.slice()
  const out: number[] = []
  while (c.length > 0) {
    const deg = c.length - 1
    const quot = new Array<number>(deg).fill(0)
    let carry = 0
    for (let i = deg; i >= 1; i--) { carry = c[i] + carry * t0; quot[i - 1] = carry }
    out.push(c[0] + carry * t0)
    c = quot
  }
  return out
}

/**
 * THE CONDITION AS A VECTOR, with the shift supplied rather than chosen — which is what a Jacobian
 * needs. `squareRootDefect` below picks t₀ where q is largest, and that choice JUMPS as q varies, so
 * the defect is not differentiable and finite-differencing it silently measures the jump. Callers
 * doing calculus must pick one t₀ and hold it across the whole difference.
 *
 * Given q of degree 2n, the series root fixes s's coefficients 0…n exactly; the top n coefficients of
 * s² are then FORCED, and the n numbers returned are how far they miss q. Zero ⟺ q is a square ⟺ the
 * curve is PH. Returned in the SHIFTED basis, which is a linear change of coordinates and so does not
 * change the rank of anything computed from them.
 */
export function squareRootMismatch(q: readonly number[], n: number, t0: number): number[] {
  const shifted = shiftPoly(q.slice(0, 2 * n + 1), t0)
  const q0 = shifted[0]
  if (!(q0 > 0)) return new Array<number>(n).fill(Infinity)
  const hat = shifted.map((c) => c / q0)
  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  const sq = pMul(s, s)
  return Array.from({ length: n }, (_, i) => (sq[n + 1 + i] ?? 0) - (hat[n + 1 + i] ?? 0))
}

/**
 * How far q is from being the SQUARE of a polynomial of half its degree — relative, and zero exactly
 * when it is one. That is the Pythagorean condition itself, written on |c′|²·w⁴.
 */
export function squareRootDefect(q: readonly number[]): number {
  let top = q.length - 1
  const scale = Math.max(...q.map(Math.abs), 1e-300)
  while (top > 0 && Math.abs(q[top]) < 1e-14 * scale) top--
  // An odd-degree polynomial cannot be a square at all; report it rather than halving a degree.
  if (top % 2 !== 0) return Infinity
  const n = top / 2
  if (n === 0) return q[0] >= 0 ? 0 : Infinity

  // Recentre where q is largest: the series needs q(t₀) ≠ 0, and being a square survives a shift.
  let t0 = 0
  let best = -Infinity
  for (let i = 0; i <= 32; i++) {
    const t = i / 32
    const v = Math.abs(evalPoly(q, t))
    if (v > best) { best = v; t0 = t }
  }
  const shifted = shiftPoly(q.slice(0, top + 1), t0)
  const q0 = shifted[0]
  if (!(q0 > 0)) return Infinity          // a real square is nonnegative; q ≡ 0 was excluded above
  const hat = shifted.map((c) => c / q0)

  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  const sq = pMul(s, s)
  const hScale = Math.max(...hat.map(Math.abs), 1)
  let worst = 0
  for (let i = 0; i <= top; i++) worst = Math.max(worst, Math.abs((sq[i] ?? 0) - (hat[i] ?? 0)))
  return worst / hScale
}

/**
 * The Pythagorean defect of an ARBITRARY spatial rational curve: zero exactly when ‖c′‖ is rational.
 * On a curve produced by a spinor this is machine zero by construction; on the pointwise blend of two
 * such curves it is not, and that gap is the thing worth seeing.
 */
export function rationalPHResidual(c: RationalCurve): number {
  const N = hodographNumerator(c)
  const q = N.reduce<number[]>((acc, Nk) => pAdd(acc, pMul(Nk, Nk)), [0])
  return squareRootDefect(q)
}
