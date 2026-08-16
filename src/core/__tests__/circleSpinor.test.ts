// ============================================================================
// THE CIRCLE'S SPINOR IS DEGREE ONE — 𝒜(t) = (1−t) + (1+t)k, and everything the deck says about the
// circle can be read off it.
//
// THE DERIVATION, which needs no theorem and is three lines. Take the standard parametrisation
// c = ((1−t²)/(1+t²), 2t/(1+t²), 0), differentiate, and read off w = 1+t², N = (−4t, 2−2t², 0),
// σ = 2(1+t²). The sandwich then SPLITS BY ADDING AND SUBTRACTING, since σ = αᾱ + ββ̄ and
// n₁ = αᾱ − ββ̄:
//
//     αᾱ = (σ + n₁)/2 = (1 − t)²          ββ̄ = (σ − n₁)/2 = (1 + t)²
//
// Perfect squares on sight. Take roots, fix the phase against 2αβ = 2i(1−t²), and α = 1−t,
// β = i(1+t) — i.e. 𝒜 = (1−t) + (1+t)k.
//
// WHY IT MATTERS THAT IT IS DEGREE ONE. The circle is not a pathological member of the spinor form;
// it is nearly the simplest one there is. What fails for it is not the representation.
//
// WHAT THIS FILE PINS, all of it visible on price-of-a-circle 26A:
//
//   · the spinor reproduces the circle's N and σ exactly;
//   · σ = 2w — SOFT at both poles, σ dying exactly where w does;
//   · σ(±i) = 0, so the λ-chart has nothing to divide by;
//   · 𝒜(±i) ≠ 0 — ISOTROPY in the hand: a nonzero quaternion whose size is zero;
//   · and the curve really is the unit circle.
//
// representable ✓   chartable ✗ — the object is ordinary, only the coordinates fail.
//
// WHERE THE DIFFICULTY ACTUALLY LIVES, since this makes it look easy. Splitting σ and n₁ never
// fails, and neither does taking the roots — every non-negative real polynomial in one variable is
// a sum of two squares, which is p(ℝ[t]) = 2 doing its real job as an ENABLING theorem (slide 21
// used to cite it as an obstruction; retracted). The step that can fail is MATCHING THE PHASES:
// α and β each come out only up to a phase and their product must hit n₂/2 exactly. That is where
// Dietz–Hoschek–Jüttler's common factor h comes from. The circle is easy because its phase is one i.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { QUAT_I, qconj, qmul, qvec, type Quat } from '../quaternion'

/** 𝒜(t) = (1−t) + (1+t)k, in the power basis: A₀ + A₁t. */
const A: Quat[] = [
  { u: 1, v: 0, p: 0, q: 1 },   // 1 + k
  { u: -1, v: 0, p: 0, q: 1 },  // −t + tk
]

/** N = 𝒜i𝒜* and σ = |𝒜|², both in the power basis — the same convolution `toMember` uses. */
function hodograph(S: readonly Quat[]): { N: number[][]; sigma: number[] } {
  const deg = 2 * (S.length - 1)
  const N = [0, 1, 2].map(() => new Array<number>(deg + 1).fill(0))
  const sigma = new Array<number>(deg + 1).fill(0)
  for (let i = 0; i < S.length; i++) {
    for (let j = 0; j < S.length; j++) {
      const v = qvec(qmul(qmul(S[i], QUAT_I), qconj(S[j])))
      N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
      sigma[i + j] += qmul(S[i], qconj(S[j])).u
    }
  }
  return { N, sigma }
}
const ev = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
/** A real-coefficient polynomial at a complex point. */
const evC = (p: readonly number[], re: number, im: number): { re: number; im: number } =>
  p.reduceRight((a, c) => ({ re: a.re * re - a.im * im + c, im: a.re * im + a.im * re }), { re: 0, im: 0 })

describe("the circle's spinor", () => {
  const { N, sigma } = hodograph(A)

  it('reproduces the circle exactly: w = 1+t², N = (−4t, 2−2t², 0), σ = 2(1+t²)', () => {
    // the deck writes these three, so all three are checked coefficient by coefficient
    for (let k = 0; k <= 2; k++) {
      expect(N[0][k], `N₁ coefficient ${k}`).toBeCloseTo([0, -4, 0][k], 12)
      expect(N[1][k], `N₂ coefficient ${k}`).toBeCloseTo([2, 0, -2][k], 12)
      expect(N[2][k], `N₃ coefficient ${k}`).toBeCloseTo(0, 12)
      expect(sigma[k], `σ coefficient ${k}`).toBeCloseTo([2, 0, 2][k], 12)
    }
    // and it is Pythagorean, as every spinor is
    for (const t of [-2, -0.5, 0, 0.7, 3]) {
      const n = Math.hypot(ev(N[0], t), ev(N[1], t), ev(N[2], t))
      expect(n).toBeCloseTo(Math.abs(ev(sigma, t)), 10)
    }
  })

  it('SOFT AT BOTH POLES: σ = 2w, so σ dies exactly where w does', () => {
    const w = [1, 0, 1]                              // 1 + t²
    for (let k = 0; k <= 2; k++) expect(sigma[k]).toBeCloseTo(2 * w[k], 12)
    const at = evC(sigma, 0, 1)                      // σ(i)
    console.log(`    σ(i) = ${at.re.toExponential(1)} + ${at.im.toExponential(1)}i`)
    expect(Math.hypot(at.re, at.im), 'σ vanishes at the pole').toBeLessThan(1e-12)
  })

  it('AND YET THE SPINOR DOES NOT VANISH THERE — isotropy, in the hand', () => {
    // 𝒜(i) = (1−i) + (1+i)k, componentwise: real part (1,0,0,1), imaginary part (−1,0,0,1)
    const re = { u: 1, v: 0, p: 0, q: 1 }
    const im = { u: -1, v: 0, p: 0, q: 1 }
    const size = Math.hypot(re.u, re.v, re.p, re.q, im.u, im.v, im.p, im.q)
    console.log(`    |𝒜(i)| = ${size.toFixed(4)} — NONZERO, while σ(i) = 0`)
    expect(size, 'the spinor is not zero at the pole').toBeGreaterThan(1)

    // the norm FORM (not the modulus) is what vanishes: Σ (re_c + i·im_c)²
    const comps: [number, number][] = [[re.u, im.u], [re.v, im.v], [re.p, im.p], [re.q, im.q]]
    const formRe = comps.reduce((s, [a, b]) => s + a * a - b * b, 0)
    const formIm = comps.reduce((s, [a, b]) => s + 2 * a * b, 0)
    expect(Math.hypot(formRe, formIm), 'but its SIZE is').toBeLessThan(1e-12)
  })

  it('and the curve really is the unit circle', () => {
    for (const t of [-3, -1, -0.2, 0, 0.5, 2, 10]) {
      const w = 1 + t * t
      const x = (1 - t * t) / w, y = (2 * t) / w
      expect(Math.hypot(x, y), `|c(${t})|`).toBeCloseTo(1, 12)
      // and the drawn speed matches σ/w²
      expect(ev(sigma, t) / (w * w)).toBeCloseTo(2 / w, 12)
    }
  })
})
