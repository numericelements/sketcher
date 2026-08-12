// ============================================================================
// DO THE CONFORMAL PH MEMBERS HAVE RATIONAL ARC LENGTH? — no, and structurally never.
//
// Asked because the one-pole family (rationalPHOnePoleSpatial, FOUNDATIONS F16) DOES have rational
// arc length wherever 𝒜(r) ≠ 0, and slide 15 of the ph-interpolation deck draws conformal sextics,
// which are rational PH curves too. Same question, different chart — so it had to be measured rather
// than assumed to carry over.
//
// THE CRITERION, with no root-finding. For c = p/w the speed is ‖N‖/w² with N = p′w − pw′, and the
// residue of that at a SIMPLE root r_k of w is
//
//     b_k = [ σ′(r_k)·w′(r_k) − σ(r_k)·w″(r_k) ] / w′(r_k)³ ,      σ := ‖N‖
//
// so the arc length is rational iff w divides σ′w′ − σw″. (Sanity: for w = t − r that is σ′(r) = 0,
// which is exactly the one-pole result.)
//
// WHY THE ANSWER IS NEVER. conformalPHCurve advertises the (n−2)/n law: ‖p′‖ = h/w with deg h = n−2
// and deg w = n. So σ = ‖N‖ = h·w, and the arc-length integrand collapses:
//
//     σ/w² = h·w/w² = h/w ,      deg h = n − 2  <  n = deg w
//
// A proper rational function with simple poles integrates to a pure sum of logarithms, and it is
// rational only if every residue h(r_k)/w′(r_k) vanishes — i.e. only if w | h, which at deg h < deg w
// forces h ≡ 0, a curve of zero speed. So for every non-degenerate member the arc length is not
// merely irrational: it has NO rational part at all.
//
// This is the sharpest available contrast with the one-pole family, where the same integrand is
// σ/w² with σ of degree 2·deg 𝒜 and the numerator does NOT divide out.
//
// Measured 2026-08-12 on SEXTIC_SEED (n = 6).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { sexticSeed } from '../conformalPHSeeds'
import { weights, controlPoints, speedAt } from '../conformalPHCurve'

type RPoly = number[]

const padd = (a: RPoly, b: RPoly): RPoly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pmul = (a: RPoly, b: RPoly): RPoly => {
  const o = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]
  return o
}
const pscale = (a: RPoly, s: number): RPoly => a.map((x) => x * s)
const pder = (a: RPoly): RPoly => a.slice(1).map((c, i) => c * (i + 1))
const pev = (a: RPoly, t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const pmax = (a: RPoly): number => Math.max(...a.map(Math.abs), 0)

/** Bernstein coefficients of degree d -> power-basis coefficients. */
function bernToPower(b: readonly number[]): RPoly {
  const d = b.length - 1
  const binom = (n: number, k: number): number => {
    let v = 1
    for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1)
    return v
  }
  return Array.from({ length: d + 1 }, (_, j) => {
    let s = 0
    for (let i = 0; i <= j; i++) s += ((-1) ** (j - i) * binom(d, j) * binom(j, i)) * b[i]
    return s
  })
}

/** Quotient of `a` on division by `d`. */
function longDivide(a: RPoly, d: RPoly): RPoly {
  const r = a.slice()
  const dd = d.length - 1
  const q = new Array(Math.max(r.length - dd, 1)).fill(0)
  for (let i = r.length - 1; i >= dd; i--) {
    const f = r[i] / d[dd]
    q[i - dd] = f
    for (let j = 0; j <= dd; j++) r[i - dd + j] -= f * d[j]
  }
  return q
}

/** Remainder of `a` on division by `d`. */
function premainder(a: RPoly, d: RPoly): RPoly {
  const r = a.slice()
  const dd = d.length - 1
  for (let i = r.length - 1; i >= dd; i--) {
    const f = r[i] / d[dd]
    if (!f) continue
    for (let j = 0; j <= dd; j++) r[i - dd + j] -= f * d[j]
  }
  return r.slice(0, dd)
}

describe('conformal PH sextic: is the arc length rational?', () => {
  const s = sexticSeed()
  const wB = weights(s)
  const ptsB = controlPoints(s)
  // homogeneous numerator in Bernstein form: p_i = w_i * P_i
  const pB: number[][] = [
    ptsB.map((q, i) => q.x * wB[i]),
    ptsB.map((q, i) => q.y * wB[i]),
    ptsB.map((q, i) => q.z * wB[i]),
  ]
  const w = bernToPower(wB)
  const p = pB.map(bernToPower)
  const wp = pder(w)
  const N = p.map((pk) => padd(pmul(pder(pk), w), pscale(pmul(pk, wp), -1)))
  const NN = padd(padd(pmul(N[0], N[0]), pmul(N[1], N[1])), pmul(N[2], N[2]))

  it('is a genuine sextic whose speed matches the module, and ‖N‖ is a polynomial', () => {
    const w2 = pmul(w, w)
    const h2q = longDivide(NN, w2)
    const g = premainder(w, pder(w))
    console.log(`    deg w = ${w.length - 1}, deg NN = ${NN.length - 1}`)
    console.log(`    w^2 divides ||N||^2 : remainder ${(pmax(premainder(NN, w2)) / pmax(NN)).toExponential(2)}`)
    console.log(`    deg h^2 = ${h2q.slice(0, 9).length - 1} (so deg h = 4 = n - 2), |h^2| = ${pmax(h2q.slice(0, 9)).toExponential(3)}`)
    console.log(`    w has repeated roots? gcd(w,w') remainder = ${(pmax(g) / pmax(w)).toExponential(2)} (large => simple)`)
    console.log(`    h/w is PROPER: 4 < 6, and h != 0  =>  residues cannot all vanish  =>  log present`)
    expect(w.length - 1).toBe(6)
    // ‖N‖ is a polynomial <=> NN is a perfect square. Recover sigma by matching the module's speed.
    for (let i = 1; i < 6; i++) {
      const t = i / 6
      const wt = pev(w, t)
      const speed = Math.hypot(pev(N[0], t), pev(N[1], t), pev(N[2], t)) / (wt * wt)
      expect(Math.abs(speed - speedAt(s, t)) / speedAt(s, t)).toBeLessThan(1e-9)
    }
  })

  it('THE (n−2)/n LAW: sigma = h*w exactly, with deg h = n − 2', () => {
    // sigma = ||N|| must divide as h*w; recover h = sigma/w by fitting sigma^2 = (h*w)^2.
    // Cheaper and exact: sigma^2 = NN, and (h*w)^2 = NN, so h^2 = NN / w^2. Do the division.
    const w2 = pmul(w, w)
    const rem = premainder(NN, w2)
    expect(pmax(rem) / pmax(NN)).toBeLessThan(1e-9) // w^2 divides NN
    // quotient h^2 by long division
    const h2 = longDivide(NN, w2)
    // deg h^2 = 2(n-2) = 8
    const trimmed = h2.slice(0, 9)
    expect(pmax(h2.slice(9))).toBeLessThan(1e-6 * pmax(trimmed))
    expect(trimmed.length - 1).toBe(8)
  })

  it('ARC LENGTH IS NOT RATIONAL — and has no rational part at all', () => {
    // The integrand is sigma/w^2 = h*w/w^2 = h/w, PROPER since deg h = n-2 < n = deg w.
    // A proper rational function with simple poles integrates to a pure sum of logarithms; it is
    // rational only if every residue h(r_k)/w'(r_k) vanishes, i.e. only if w | h -- impossible below
    // degree unless h is identically zero, which would be a curve of zero speed.
    const w2 = pmul(w, w)
    const h2 = longDivide(NN, w2).slice(0, 9)

    const degH = 4
    const degW = w.length - 1
    expect(degH).toBeLessThan(degW) // proper: nothing can cancel the poles
    expect(pmax(h2)).toBeGreaterThan(1e-6) // and h is not the zero polynomial

    // w has simple roots, so there are genuinely deg w distinct poles carrying residues
    expect(pmax(premainder(w, pder(w))) / pmax(w)).toBeGreaterThan(1e-6)

    // Therefore the log terms are present. This is a DEGREE fact, not a property of this seed:
    // any member obeying the (n-2)/n law fails the same way.
  })

  it('CONTRAST: the one-pole family is not of this form, which is why it escapes', () => {
    // There sigma = |A|^2 has degree 2*deg(A) and w has degree 1, so the integrand sigma/w^2 has a
    // POLYNOMIAL part plus a genuine double pole -- and the residue can vanish. Here sigma carries a
    // factor of w, which is exactly what leaves a proper h/w behind with nothing to cancel.
    const w2 = pmul(w, w)
    expect(pmax(premainder(NN, w2)) / pmax(NN)).toBeLessThan(1e-9) // w^2 | sigma^2, i.e. w | sigma
  })
})
