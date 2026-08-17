// ============================================================================
// A spatial PH cubic with its FIRST THREE control points prescribed — and the fibre is
// a PARABOLA, open and unbounded, where the deck's other cubic fibre is a closed ellipse.
//
// The dimension is forced and identical in both cases: 𝒜 is linear (k = 2), the family is
// 4k + 2 = 10, three control points cost 3 apiece, so dim = 10 − 9 = 1 either way. What
// differs is everything else about the fibre, and the difference is the PRESCRIBED SET:
//
//   P₀ P₁ P₃  (core/phSpatialCubic, the deck's spatial-cubic slide)
//       a CLOSED fibre — an ellipse — and ISOMETRIC: every member has the same arc
//       length, so the classical fairness selector is blind on it. It contains exactly
//       two planar members, which are the planar problem's two discrete answers.
//
//   P₀ P₁ P₂  (here)
//       an OPEN fibre. The conditions are N₀ = A₀iA₀* and N₁ = ½polar(A₀,A₁); the first
//       pins A₀ up to the gauge, and the second is 3 equations in 4 unknowns whose kernel
//       is ℝ·(A₀i). So the fibre is an affine LINE in the spinor,
//
//           A₁(t) = A₁ + t·(A₀i)
//
//       and since sandwich(A₀i) = N₀ exactly, the free control point traces
//
//           P₃(t) = P₃(0) + t·polar(A₁,A₀i)/3 + t²·N₀/3
//
//       an exact parabola whose AXIS IS THE FIRST LEG, N₀/3 = P₁ − P₀. Arc length grows
//       quadratically along it, so unlike the ellipse this family is not isometric and
//       fairness does discriminate.
//
// In the PLANE the same prescription is UNIQUE (N₁ = w₀w₁ is a division on ℂ). The whole
// fibre is manufactured by the one stage where ℍ → ℝ³ has a kernel and ℂ → ℂ does not.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat, type Vec3, QUAT_I, qmul, qadd, qscale, qnormSq,
  sandwich, polarSandwich, vadd, vsub, vscale, vnorm, vcross,
} from '../quaternion'

const qf = (c: number[]): Quat => ({ u: c[0], v: c[1], p: c[2], q: c[3] })

/** The three legs of the degree-2 hodograph 𝒜i𝒜*; P_{j+1} = P_j + N_j/3. */
const legs = (A0: Quat, A1: Quat): Vec3[] => [
  sandwich(A0),
  vscale(polarSandwich(A0, A1), 1 / 2),
  sandwich(A1),
]

/** ∫₀¹|𝒜|²dt — σ is a quadratic, so the mean of its Bernstein coefficients. */
const arcLength = (A0: Quat, A1: Quat): number =>
  (qnormSq(A0) + (A0.u * A1.u + A0.v * A1.v + A0.p * A1.p + A0.q * A1.q) + qnormSq(A1)) / 3

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sample = (seed: number): [Quat, Quat] => {
  const rng = mulberry(seed)
  return [
    qadd(qf([0, 1, 2, 3].map(() => 2 * rng() - 1)), { u: 1.3, v: 0, p: 0, q: 0 }),
    qf([0, 1, 2, 3].map(() => 2 * rng() - 1)),
  ]
}

describe('spatial PH cubic, first three control points prescribed', () => {
  it('the fibre is the affine line A₁ + t·(A₀i), holding both legs exactly', () => {
    for (const seed of [9, 44, 130]) {
      const [A0, A1] = sample(seed)
      const N = legs(A0, A1)
      const k = qmul(A0, QUAT_I)

      // A₀i spans the kernel of polar(A₀,·), and its own sandwich is N₀ — both exact.
      expect(vnorm(polarSandwich(A0, k))).toBeLessThan(1e-14 * qnormSq(A0))
      expect(vnorm(vsub(sandwich(k), N[0]))).toBeLessThan(1e-14 * vnorm(N[0]))

      for (const t of [-3, -1, 0, 0.7, 2, 5]) {
        const M = legs(A0, qadd(A1, qscale(k, t)))
        expect(vnorm(vsub(M[0], N[0]))).toBeLessThan(1e-12)
        expect(vnorm(vsub(M[1], N[1]))).toBeLessThan(1e-12)
      }
    }
  })

  it('the free control point traces an EXACT parabola whose axis is the first leg', () => {
    for (const seed of [9, 44, 130]) {
      const [A0, A1] = sample(seed)
      const N = legs(A0, A1)
      const k = qmul(A0, QUAT_I)
      const P3 = (t: number): Vec3 => {
        const M = legs(A0, qadd(A1, qscale(k, t)))
        return vscale(vadd(vadd(M[0], M[1]), M[2]), 1 / 3)
      }

      const c0 = P3(0)
      const c1 = vscale(vsub(P3(1), P3(-1)), 0.5)
      const c2 = vsub(vscale(vadd(P3(1), P3(-1)), 0.5), c0)

      // Quadratic to machine precision over a wide span — not a local approximation.
      let worst = 0
      for (let i = 0; i <= 40; i++) {
        const t = -5 + i * 0.25
        const pred = vadd(c0, vadd(vscale(c1, t), vscale(c2, t * t)))
        worst = Math.max(worst, vnorm(vsub(P3(t), pred)))
      }
      expect(worst).toBeLessThan(1e-12)

      // The t² coefficient IS the first leg: N₀/3 = P₁ − P₀.
      expect(vnorm(vsub(c2, vscale(N[0], 1 / 3)))).toBeLessThan(1e-12)
      // A genuine parabola, not a degenerate ray.
      expect(vnorm(vcross(c1, c2))).toBeGreaterThan(1e-3)
    }
  })

  it('is NOT isometric — arc length grows along the fibre', () => {
    // The contrast with the P₀P₁P₃ fibre, which is closed and has constant arc length,
    // so fairness cannot choose there and can here.
    const [A0, A1] = sample(9)
    const k = qmul(A0, QUAT_I)
    const at = (t: number) => arcLength(A0, qadd(A1, qscale(k, t)))
    const lengths = [-2, 0, 2, 4].map(at)
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeGreaterThan(3)
    // Quadratic growth, since |A₁ + tk|² is.
    const quad = (t: number) => at(t) - (at(0) + t * (at(1) - at(-1)) / 2)
    expect(Math.abs(quad(4) / quad(2) - 4)).toBeLessThan(1e-9)
  })
})
