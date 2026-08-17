// ============================================================================
// The PLANAR degree-7 six... no: FIVE control points. The foil to the spatial septic.
//
// Same dimension bookkeeping, opposite solution structure. Degree 7 → w cubic → k = 4:
//
//     family  = 2k + 2 = 10       four complex coefficients (8) + translation (2),
//                                 minus NOTHING — the planar gauge w ↦ −w is DISCRETE
//     v_max   = 5                 each control point costs 2
//     dim     = 10 − 10 = 0
//
// So five prescribed control points, exactly as six in space. But the cascade behaves
// completely differently, and that difference is the point of this file:
//
//     N₀ = w₀²                    →  w₀ = ±√N₀   — the ± IS the gauge, so ONE choice
//     N₁ = w₀w₁                   →  w₁ = N₁/w₀  — a DIVISION, not a nullspace
//     N₂ = (2/5)w₀w₂ + (3/5)w₁²   →  w₂ uniquely
//     N₃ = (1/10)w₀w₃ + (9/10)w₁w₂ →  w₃ uniquely
//
// No free parameter is ever created, so there is no closing system and nothing to
// branch. In space each linear stage is polar(A₀,·): ℍ → ℝ³, four unknowns for three
// equations, leaving a one-dimensional kernel per stage — three free parameters, three
// closing equations, a degree-8 resultant (septicCascadeDegree.test.ts). In the plane
// the same stage is multiplication by w₀: ℂ → ℂ, invertible. THAT is where the spatial
// branching comes from: the continuous Hopf gauge's kernel, one real dimension a stage.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm } from './complex'

type PlanarCubicSpinor = [Complex, Complex, Complex, Complex]

/** The seven legs — Bernstein coefficients of the degree-6 hodograph w². */
function planarLegs(w: PlanarCubicSpinor): Complex[] {
  const [w0, w1, w2, w3] = w
  const bin = [1, 3, 3, 1]
  const outer = [1, 6, 15, 20, 15, 6, 1]
  const N: Complex[] = []
  for (let r = 0; r <= 6; r++) {
    let s: Complex = { re: 0, im: 0 }
    for (let j = Math.max(0, r - 3); j <= Math.min(3, r); j++) {
      s = cadd(s, cscale(cmul(w[j], w[r - j]), (bin[j] * bin[r - j]) / outer[r]))
    }
    N.push(s)
  }
  return N
}

/** The principal square root — the ± is the whole planar gauge, so either root will do. */
function csqrt(z: Complex): Complex {
  const r = cnorm(z)
  const re = Math.sqrt(Math.max(0, (r + z.re) / 2))
  const im = Math.sign(z.im || 1) * Math.sqrt(Math.max(0, (r - z.re) / 2))
  return { re, im }
}

/**
 * The planar cascade — N₀…N₃ ↦ the ONE spinor. No parameters, no closing system, and
 * no failure mode except N₀ = 0.
 */
function planarCascade(N: Complex[]): PlanarCubicSpinor {
  const w0 = csqrt(N[0])
  const w1 = cdiv(N[1], w0)
  // N₂ = (2/5)w₀w₂ + (3/5)w₁²
  const w2 = cdiv(csub(N[2], cscale(cmul(w1, w1), 3 / 5)), cscale(w0, 2 / 5))
  // N₃ = (1/10)w₀w₃ + (9/10)w₁w₂
  const w3 = cdiv(csub(N[3], cscale(cmul(w1, w2), 9 / 10)), cscale(w0, 1 / 10))
  return [w0, w1, w2, w3]
}

const cdist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const randSpinor = (rng: () => number): PlanarCubicSpinor =>
  [0, 1, 2, 3].map(() => ({ re: 2 * rng() - 1, im: 2 * rng() - 1 })) as PlanarCubicSpinor

describe('planar septic, five prescribed control points', () => {
  it('the cascade recovers the generating curve, up to the discrete gauge only', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = mulberry(seed * 7717 + 1)
      const w = randSpinor(rng)
      const N = planarLegs(w)
      const got = planarCascade(N)
      // Either w or −w, and nothing in between: the gauge is two points, not a circle.
      const same = got.every((g, j) => cdist(g, w[j]) < 1e-9)
      const flipped = got.every((g, j) => cdist(g, cscale(w[j], -1)) < 1e-9)
      expect(same || flipped).toBe(true)
    }
  })

  it('EVERY five control points admit exactly one curve — no empty region', () => {
    // The spatial septic finds no real curve for half of all arbitrary polygons. The
    // plane has no such region: the cascade is a square root then three divisions, and
    // the only thing that can fail is N₀ = 0 (a first leg of length zero).
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry(seed * 104729 + 7)
      // Arbitrary legs — NOT taken from any curve.
      const N: Complex[] = [0, 1, 2, 3].map(() => ({ re: 4 * rng() - 2, im: 4 * rng() - 2 }))
      const w = planarCascade(N)
      expect(w.every((c) => Number.isFinite(c.re) && Number.isFinite(c.im))).toBe(true)
      // It reproduces the four prescribed legs exactly.
      const back = planarLegs(w)
      for (let r = 0; r <= 3; r++) {
        expect(cdist(back[r], N[r])).toBeLessThan(1e-9 * Math.max(1, cnorm(N[r])))
      }
    }
  })

  it('the trailing legs are forced — P₅, P₆, P₇ have no freedom left', () => {
    const rng = mulberry(4242)
    const N: Complex[] = [0, 1, 2, 3].map(() => ({ re: 4 * rng() - 2, im: 4 * rng() - 2 }))
    const A = planarLegs(planarCascade(N))
    // Perturbing only the DISCRETE gauge (w ↦ −w) leaves every leg untouched, so there
    // is genuinely one curve, not a pair.
    const flipped = planarLegs(planarCascade(N).map((c) => cscale(c, -1)) as PlanarCubicSpinor)
    for (let r = 0; r <= 6; r++) expect(cdist(A[r], flipped[r])).toBeLessThan(1e-12)
  })

  it('degree 3 reproduces the classical PH cubic condition N₁² = N₀N₂', () => {
    // The oldest planar PH fact — the three legs of a PH cubic are in geometric
    // progression as complex numbers — is this uniqueness at the smallest degree.
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry(seed * 31337 + 11)
      const w0: Complex = { re: 2 * rng() - 1, im: 2 * rng() - 1 }
      const w1: Complex = { re: 2 * rng() - 1, im: 2 * rng() - 1 }
      const [N0, N1, N2] = [cmul(w0, w0), cmul(w0, w1), cmul(w1, w1)]
      expect(cdist(cmul(N1, N1), cmul(N0, N2))).toBeLessThan(1e-12)
      // …and the third leg is therefore determined by the first two.
      expect(cdist(cdiv(cmul(N1, N1), N0), N2)).toBeLessThan(1e-12)
    }
  })
})
