// ============================================================================
// THE PLANAR DUAL IS A REAL CHART — and this file locates exactly what fails in space.
//
// Pottmann's dual describes a curve by its TANGENT LINES: a rational unit normal n and a rational
// support function h, with the curve recovered as the envelope. Two free rational functions, no
// solving, no residue conditions — coordinates, which is the thing our Sp(1,1) work still lacks.
//
// WHY IT WORKS, and it is one polynomial identity. Take n = (1−u², 2u)/δ with δ = 1+u². Then
//
//     n′ = 2u′·(−2u, 1−u²)/δ²        and        |(−2u, 1−u²)|² = (1+u²)² = δ²
//
// so |n′|² = 4u′²/δ² is a PERFECT SQUARE for EVERY u — an identity, not a condition. Hence |n′| is
// rational, the unit tangent n⊥ is rational, and PH is automatic. That is the whole of it.
//
// AND WHY IT DOES NOT SURVIVE TO SPACE. In the plane n′ is forced PARALLEL to the unit vector n⊥,
// because the orthogonal complement of n inside ℝ² is one-dimensional. In ℝ³ the derivative of a
// rational unit vector is only forced PERPENDICULAR to it — a two-dimensional space of directions —
// and there is no identity making its norm a square. Measured at the bottom of this file: for a
// rational unit vector b = N/σ built from a spinor,
//
//     |b′|² = (|N′|² − σ′²) / σ²
//
// and |N′|² − σ′² is NOT a perfect square for generic spinors. The Pythagorean condition does not
// disappear in the dual, it relocates to the tangent indicatrix — free on S¹, not free on S².
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  sandwich, qpDeriv, qpNorm, qpMul, qpConj, pAdd, pSub, pMul, pDeriv, pMax, type Poly, type QPoly,
} from '../sp11RationalPH'

const pScale = (a: Poly, k: number): Poly => a.map((c) => c * k)
const relGap = (a: Poly, b: Poly): number => {
  let d = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
  return d / (Math.max(pMax(a), pMax(b)) || 1)
}
/** Residual of the square-root recursion — a NEGATIVE claim needs this, not a guard. */
function squareResidual(q: Poly): number {
  const trimmed = q.slice()
  const s0 = pMax(trimmed) || 1
  while (trimmed.length > 1 && Math.abs(trimmed[trimmed.length - 1]) < 1e-12 * s0) trimmed.pop()
  // a square may vanish at 0, and must do so to EVEN order
  let z = 0
  while (z < trimmed.length && Math.abs(trimmed[z]) < 1e-12 * s0) z++
  if (z >= trimmed.length) return 0            // identically zero
  if (z % 2 !== 0) return 1                    // odd order of vanishing: not a square
  q = trimmed.slice(z)
  if ((q[0] ?? 0) <= 0) return NaN
  const n = Math.floor((q.length - 1) / 2)
  const hat = q.map((c) => c / q[0])
  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  const sq = pMul(s, s)
  let d = 0
  for (let i = 0; i < Math.max(sq.length, hat.length); i++) d = Math.max(d, Math.abs((sq[i] ?? 0) - (hat[i] ?? 0)))
  return d / (pMax(hat) || 1)
}

// --- the dual datum, homogeneously -------------------------------------------
/** ν = (1 − u², 2u) and δ = 1 + u², so n = ν/δ is a RATIONAL UNIT normal. */
const nu = (u: Poly): [Poly, Poly] => [pSub([1], pMul(u, u)), pScale(u, 2)]
const delta = (u: Poly): Poly => pAdd([1], pMul(u, u))
/** μ = (−2u, 1 − u²) — that is δ·n⊥, the rotation of ν by a quarter turn. */
const mu = (u: Poly): [Poly, Poly] => [pScale(u, -2), pSub([1], pMul(u, u))]

/**
 * The envelope, cleared to a common denominator. From c = h·n + (h′/|n′|²)·n′ with
 * n′/|n′|² = μ/(2u′), the common denominator is w = 2u′δ and
 *     p = 2u′h·ν + δh′·μ .
 * Everything here is polynomial: no solve, no condition, no integration.
 */
function envelope(u: Poly, h: Poly): { p: [Poly, Poly]; w: Poly } {
  const d = delta(u), ud = pDeriv(u), hd = pDeriv(h)
  const N = nu(u), M = mu(u)
  const A = pMul(pScale(ud, 2), h)
  const B = pMul(d, hd)
  return { p: [pAdd(pMul(A, N[0]), pMul(B, M[0])), pAdd(pMul(A, N[1]), pMul(B, M[1]))], w: pMul(pScale(ud, 2), d) }
}
/** |wp′ − w′p|² for a planar curve — the PH quantity. */
const qOf = (p: [Poly, Poly], w: Poly): Poly => {
  const n0 = pSub(pMul(pDeriv(p[0]), w), pMul(p[0], pDeriv(w)))
  const n1 = pSub(pMul(pDeriv(p[1]), w), pMul(p[1], pDeriv(w)))
  return pAdd(pMul(n0, n0), pMul(n1, n1))
}

describe('the planar dual as a chart', () => {
  const US: Poly[] = [[0, 1], [1, 0, 1], [0.3, -1.2, 0.7], [0, 0, 1, 0.5]]
  const HS: Poly[] = [[1], [0.4, 1.3], [2, -0.5, 0.9], [0.7, 0, 0, 1.1]]

  it('THE IDENTITY that makes it work: |mu|^2 = delta^2, for every u', () => {
    for (const u of US) {
      const M = mu(u)
      expect(relGap(pAdd(pMul(M[0], M[0]), pMul(M[1], M[1])), pMul(delta(u), delta(u)))).toBeLessThan(1e-12)
      // and the normal really is unit: |nu|^2 = delta^2 too
      const N = nu(u)
      expect(relGap(pAdd(pMul(N[0], N[0]), pMul(N[1], N[1])), pMul(delta(u), delta(u)))).toBeLessThan(1e-12)
    }
  })

  it('so |n-prime|^2 is a PERFECT SQUARE identically — no condition, an identity', () => {
    for (const u of US) {
      // |n′|² = 4u′²/δ², and the numerator 4u′² is (2u′)² on the nose
      const num = pScale(pMul(pDeriv(u), pDeriv(u)), 4)
      // no sign guard: squareResidual strips a leading t^{2z} itself, and 4u′² is already psd.
      // (The guard that was here flipped the sign whenever num[0] happened to be zero.)
      expect(squareResidual(num)).toBeLessThan(1e-12)
      expect(relGap(num, pMul(pScale(pDeriv(u), 2), pScale(pDeriv(u), 2)))).toBeLessThan(1e-12)
    }
  })

  it('THE CHART: two free rational functions in, a PH curve out, nothing solved', () => {
    let built = 0, tight = 0
    for (const u of US) {
      for (const h of HS) {
        const { p, w } = envelope(u, h)
        const q = qOf(p, w)
        if (pMax(q) < 1e-9) continue                  // degenerate (h constant with u linear, etc.)
        // PH by construction. The tolerance tracks DEGREE, not doubt: cubic u with cubic h drives
        // q to degree 42 and the square-root recursion accumulates there. The structural proof is
        // the next test (n·c′ ≡ 0), which is degree-independent.
        expect(squareResidual(q)).toBeLessThan(1e-6)
        if (q.length - 1 <= 24) { expect(squareResidual(q)).toBeLessThan(1e-10); tight++ }
        built++
      }
    }
    expect(built).toBeGreaterThanOrEqual(12)
    expect(tight).toBeGreaterThanOrEqual(6)           // most cases still meet the tight bound
  })

  it('and PH is structural, not luck: the tangent is parallel to n-perp, which is rational', () => {
    for (const u of US.slice(1)) {
      const h = HS[2]
      const { p, w } = envelope(u, h)
      const N = nu(u)
      // n·c = h  means  nu . p = h * delta * w  (cleared to the common denominator)
      const lhs = pAdd(pMul(N[0], p[0]), pMul(N[1], p[1]))
      expect(relGap(lhs, pMul(pMul(h, delta(u)), w))).toBeLessThan(1e-10)
      // and n·c′ = 0, i.e. the tangent is along n-perp: nu . (w p′ − w′ p) ≡ 0
      const t0 = pSub(pMul(pDeriv(p[0]), w), pMul(p[0], pDeriv(w)))
      const t1 = pSub(pMul(pDeriv(p[1]), w), pMul(p[1], pDeriv(w)))
      const dot = pAdd(pMul(N[0], t0), pMul(N[1], t1))
      expect(pMax(dot) / (pMax(t0) + pMax(t1) + 1)).toBeLessThan(1e-9)
    }
  })

  it('offsets are rational too — which is what the construction is really named after', () => {
    const { p, w } = envelope(US[2], HS[2])
    const u = US[2], N = nu(u), d = delta(u)
    // c + e·n = (p·δ + e·w·ν) / (w·δ): still a ratio of polynomials, for any distance e
    for (const e of [0.5, -1.3]) {
      const off: [Poly, Poly] = [pAdd(pMul(p[0], d), pScale(pMul(w, N[0]), e)), pAdd(pMul(p[1], d), pScale(pMul(w, N[1]), e))]
      const wo = pMul(w, d)
      expect(pMax(wo)).toBeGreaterThan(0)
      expect(squareResidual(qOf(off, wo))).toBeLessThan(1e-7)   // and the offset is PH as well
    }
  })

  // --- and now what does NOT survive to three dimensions ---------------------
  it('IN SPACE the same quantity is a SUM OF TWO SQUARES, not one', () => {
    // Derived and pinned here: with Q = 𝒜*𝒜′,
    //     |N′|² − σ′²  =  4(Q₂² + Q₃²)
    // In the plane the corresponding numerator was 4u′² — ONE square, hence always a square.
    // In space it is a sum of TWO, and a² + b² is a perfect square only when a and b are
    // proportional. That single step is the whole 2D/3D difference.
    const spinors: QPoly[] = [
      [[0.4, 1, -0.3], [1, 0, 0.2], [-0.6, 0.5], [0.2, -1]],
      [[1, 0, 0.5], [0.2, 1, -0.4], [0.7, -0.3, 0.9], [-0.1, 0.6, 0.2]],
      [[0.3, -0.8, 1, 0.2], [1, 0.4, -0.2, 0.5], [0.6, 1.1, 0.3, -0.7], [-0.4, 0.2, 0.8, 0.1]],
    ]
    for (const A of spinors) {
      expect(Math.max(...A.map((c) => c.length - 1))).toBeGreaterThanOrEqual(2)  // degree 1 degenerates
      const N = sandwich(A), sig = qpNorm(A), Nd = qpDeriv(N)
      const numer = pSub(
        pAdd(pAdd(pMul(Nd[1], Nd[1]), pMul(Nd[2], Nd[2])), pMul(Nd[3], Nd[3])),
        pMul(pDeriv(sig), pDeriv(sig)),
      )
      // the identity |N′σ − Nσ′|² = σ²(|N′|² − σ′²), from N·N′ = σσ′
      const lhs = [1, 2, 3].map((c) => pSub(pMul(Nd[c], sig), pMul(N[c], pDeriv(sig))))
      expect(relGap(lhs.reduce<Poly>((acc, v) => pAdd(acc, pMul(v, v)), [0]),
        pMul(pMul(sig, sig), numer))).toBeLessThan(1e-10)

      // THE STRUCTURE: it is exactly 4(Q₂² + Q₃²)
      const Q = qpMul(qpConj(A), qpDeriv(A))
      const twoSquares = pMul(pAdd(pMul(Q[2], Q[2]), pMul(Q[3], Q[3])), [4])
      expect(relGap(numer, twoSquares)).toBeLessThan(1e-10)

      // and a sum of two squares is generically NOT one: |b′| is irrational
      expect(squareResidual(numer)).toBeGreaterThan(1e-3)
    }
  })

  it('and the degenerate case that nearly fooled this test: a LINEAR spinor', () => {
    // deg 𝒜 = 1 makes 𝒜′ constant, so Q₂ and Q₃ are constants and 4(Q₂²+Q₃²) is a CONSTANT —
    // trivially a perfect square. Those curves are PH for a degenerate reason, and two of the
    // three spinors originally used here were of that kind, which read as "the identity holds".
    const A: QPoly = [[1, 0.3], [0, 1], [0.5, -0.2], [0, 0.7]]
    const Q = qpMul(qpConj(A), qpDeriv(A))
    expect(pMax(Q[2].slice(1))).toBeLessThan(1e-12)      // Q₂ constant
    expect(pMax(Q[3].slice(1))).toBeLessThan(1e-12)      // Q₃ constant
    const numer = pMul(pAdd(pMul(Q[2], Q[2]), pMul(Q[3], Q[3])), [4])
    expect(pMax(numer.slice(1))).toBeLessThan(1e-12)     // hence a constant
    expect(squareResidual(numer)).toBeLessThan(1e-12)    // hence a square, for free
  })
})
