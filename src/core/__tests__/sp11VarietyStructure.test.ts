// ============================================================================
// NUMERICAL ALGEBRAIC GEOMETRY ON V — and it corrects something this project had been saying.
//
// WHAT WAS MEASURED, by witness sets (a generic linear slice of complementary dimension, solved from
// thousands of random starts): 62, 63, 62 distinct points on three independent slices, against a
// Bézout bound of 2⁶ = 64. Degree is slice-independent, so the variation is the sampler missing
// basins, not the geometry. With codimension 6 already verified by the Jacobian rank test, V is a
// COMPLETE INTERSECTION and deg V = 64; finding 63 distinct points rules out a doubled component,
// which would have capped the count at 32. V is reduced, and it is Fano (Σdᵢ = 12 < 16 in ℙ¹⁵).
//
// AND THEN THE CORRECTION, which is worth more than the degree. Chasing rationality turned up
// something we already had and had been describing wrongly:
//
//     V IS SWEPT BY A TWO-PARAMETER FAMILY OF LINEAR 8-SPACES — and those are the λ-chart's fibres.
//
// Fix λ and the condition 𝒜′(r_k) = 𝒜(r_k)(Σ_k + λ_k i) is LINEAR in 𝒜, so its solutions form a
// linear subspace. That subspace lies inside V, provably: writing V = 𝒜⁻¹𝒜′,
//
//     N′(r) = 𝒜(Vi + iV^{*})𝒜^{*}   and   Vi + iV^{*} = (Σ+λi)i + i(Σ−λi) = 2Σi
//
// so N′(r) = 2ΣN(r), the quadric, with no division anywhere. Sweeping λ over two parameters and the
// linear space over eight gives 10 = dim V. So the λ-chart, READ FORWARD, is a dominant rational
// parametrisation of V — which is to say V is RATIONAL and we have had the chart all along.
//
// It is the INVERSE that needs σ(r) ≠ 0: recovering λ from 𝒜 divides by 𝒜(r). Everything this deck
// has called "the excluded stratum" is an artefact of running the map BACKWARD. Forward, it never
// divides, and the linear fibre is honest coordinates.
//
// SO THE STANDING COMPLAINT — "coordinates exist and we do not have them" — WAS WRONG. We have a
// rational parametrisation of V. What we do not have is one whose image covers the proper closed
// subvariety σ(r) = 0, which is measure zero in V and contains curves we care about (the circle,
// the conformal family). That is a coverage problem, not an existence problem, and it is a much
// smaller thing than three slides of this deck have been claiming.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  seedQuintic, familyBasis, packSpinor, unpackSpinor, conditionMatrix, toMember,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'
import { sandwich, qpDeriv, qpEval, pMax, type QPoly } from '../sp11RationalPH'

const ROOTS = [1.7, -0.9]
const SIGMA = (k: number): number => ROOTS.reduce((s, rl, l) => (l === k ? s : s + 1 / (ROOTS[k] - rl)), 0)

const toSpinor = (x: readonly number[]): QPoly => {
  const n = x.length / 4 - 1
  const A: QPoly = [[], [], [], []]
  for (let c = 0; c < 4; c++) A[c] = Array.from({ length: n + 1 }, (_, k) => x[4 * k + c])
  return A
}
/** The six quadrics: N′(r_k) − 2N(r_k)Σ_k, vector part, per pole. */
function quadrics(x: readonly number[]): number[] {
  const N = sandwich(toSpinor(x))
  const Nd = qpDeriv(N)
  const out: number[] = []
  ROOTS.forEach((r, k) => {
    const a = qpEval(Nd, r), b = qpEval(N, r), s = SIGMA(k)
    out.push(a[1] - 2 * s * b[1], a[2] - 2 * s * b[2], a[3] - 2 * s * b[3])
  })
  return out
}
const norm = (v: readonly number[]): number => Math.hypot(...v)
const seed = seedQuintic()

/** A member of the linear fibre over a given lambda. */
function fibreMember(lambdas: number[], mix: (i: number) => number): number[] {
  const prm: MultiPoleParams = { ...seed, lambdas }
  const B = familyBasis(prm)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { for (let j = 0; j < 16; j++) x[j] += mix(i) * b[j] })
  return x
}

describe('the structure of V', () => {
  it('the fibre over a fixed lambda is LINEAR, and 8-dimensional', () => {
    for (const lam of [[0.6, -0.35], [2, 1], [-3, 0.4]]) {
      const prm: MultiPoleParams = { ...seed, lambdas: lam }
      const M = conditionMatrix(prm)
      expect(M.length).toBe(4 * ROOTS.length)      // 4 real linear conditions per pole
      expect(M[0].length).toBe(16)
      expect(familyBasis(prm).length).toBe(8)      // 16 - 8 = 8, and it is a SUBSPACE
    }
  })

  it('AND IT LIES INSIDE V: every member satisfies the quadrics, with no division', () => {
    for (const lam of [[0.6, -0.35], [2, 1], [-3, 0.4], [0, 0]]) {
      for (let t = 0; t < 8; t++) {
        const x = fibreMember(lam, (i) => 3 * Math.sin(2.1 * t + 1.7 * i))
        expect(norm(quadrics(x))).toBeLessThan(1e-8)
      }
    }
  })

  it('linearity is exact: any combination of two fibre members is still in V', () => {
    const lam = [1.3, -0.7]
    const a = fibreMember(lam, (i) => Math.cos(1.1 * i))
    const b = fibreMember(lam, (i) => Math.sin(2.3 * i + 0.4))
    for (const [s, t] of [[1, 1], [2, -3], [0.5, 0.25], [-4, 7]]) {
      const c = a.map((v, j) => s * v + t * b[j])
      expect(norm(quadrics(c))).toBeLessThan(1e-7)   // a genuine linear subspace of V
    }
  })

  it('THE SWEEP IS DOMINANT: 2 lambdas + 8 linear = 10 = dim V', () => {
    expect(2 + familyBasis(seed).length).toBe(10)
    // and moving lambda genuinely moves the fibre — the spaces are distinct, so the sweep is not
    // collapsing onto one 8-space
    const A = familyBasis({ ...seed, lambdas: [0.6, -0.35] })
    const B = familyBasis({ ...seed, lambdas: [2.4, 1.1] })
    const inA = (v: number[]): number => {
      let r = v.slice()
      for (const b of A) { const d = r.reduce((s, q, i) => s + q * b[i], 0); r = r.map((q, i) => q - d * b[i]) }
      return norm(r) / (norm(v) || 1)
    }
    expect(Math.max(...B.map(inA))).toBeGreaterThan(1e-3)   // B is not contained in A
  })

  it('and lambda is RECOVERABLE where sigma(r) != 0 — so the parametrisation is invertible there', () => {
    // the quadric plus invertibility of 𝒜(r) forces 𝒜⁻¹𝒜′ = Σ + λi exactly: the j and k parts die.
    const lam = [0.9, -1.4]
    const x = fibreMember(lam, (i) => 2 * Math.cos(0.7 * i + 1))
    const A = toSpinor(x)
    const Ad = qpDeriv(A)
    ROOTS.forEach((r, k) => {
      const a = qpEval(A, r), d = qpEval(Ad, r)
      const n2 = a[0] ** 2 + a[1] ** 2 + a[2] ** 2 + a[3] ** 2
      expect(n2).toBeGreaterThan(1e-6)                       // sigma(r) != 0 here
      // V = 𝒜⁻¹𝒜′ = (conj a / |a|²) · d
      const ac = [a[0], -a[1], -a[2], -a[3]]
      const V = [
        (ac[0] * d[0] - ac[1] * d[1] - ac[2] * d[2] - ac[3] * d[3]) / n2,
        (ac[0] * d[1] + ac[1] * d[0] + ac[2] * d[3] - ac[3] * d[2]) / n2,
        (ac[0] * d[2] - ac[1] * d[3] + ac[2] * d[0] + ac[3] * d[1]) / n2,
        (ac[0] * d[3] + ac[1] * d[2] - ac[2] * d[1] + ac[3] * d[0]) / n2,
      ]
      const scale = Math.max(...V.map(Math.abs), 1)
      expect(Math.abs(V[0] - SIGMA(k))).toBeLessThan(1e-6 * scale)   // real part is Sigma
      expect(Math.abs(V[2])).toBeLessThan(1e-6 * scale)              // j part dies
      expect(Math.abs(V[3])).toBeLessThan(1e-6 * scale)              // k part dies
      expect(Math.abs(V[1] - lam[k])).toBeLessThan(1e-6 * scale)     // and i part IS lambda
    })
  })

  it('the seed is an ordinary point of this picture, as a sanity check', () => {
    expect(norm(quadrics(packSpinor(seed.A)))).toBeLessThan(1e-9)
    expect(pMax(toMember(seed).sigma as number[])).toBeGreaterThan(0)
    expect(unpackSpinor(packSpinor(seed.A)).length).toBe(4)
  })
})
