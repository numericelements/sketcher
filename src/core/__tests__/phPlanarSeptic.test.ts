// ============================================================================
// The planar septic, both ways round: five CONTROL points give one curve, five points
// ON the curve give eight. Same degree, same ten conditions, counts differing by eight.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, csub, cmul, cdiv, cscale, cnorm } from '../complex'
import {
  type Spinor4,
  planarSepticFromControlPoints,
  controlPointsOf,
  bezierAt,
  arcLengthOf,
  hodographCoefficients,
} from '../phPlanarSeptic'
import {
  DEFAULT_TS,
  septicInterpolants,
  trackSepticInterpolants,
  gramMatrix,
} from '../phPlanarSepticInterp'

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const randSpinor = (rng: () => number): Spinor4 =>
  [0, 1, 2, 3].map(() => ({ re: 2 * rng() - 1, im: 2 * rng() - 1 })) as unknown as Spinor4

const dist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

describe('planar septic — the control-point cascade', () => {
  it('recovers the generating curve, and the ± is the only ambiguity', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const w = randSpinor(mulberry(seed * 7717 + 1))
      const p0: Complex = { re: 0.3, im: -0.2 }
      const cps = controlPointsOf(w, p0)
      const got = planarSepticFromControlPoints(cps.slice(0, 5))
      expect(got).not.toBeNull()
      // The curve is identical — all eight control points, not just the five given.
      for (let j = 0; j < 8; j++) expect(dist(got!.controlPoints[j], cps[j])).toBeLessThan(1e-9)
      // The generator matches up to the discrete gauge w ↦ −w, and nothing finer.
      const same = got!.generator.every((g, j) => dist(g, w[j]) < 1e-9)
      const flipped = got!.generator.every((g, j) => dist(g, cscale(w[j], -1)) < 1e-9)
      expect(same || flipped).toBe(true)
    }
  })

  it('every five control points work — there is no empty region', () => {
    // The spatial septic finds no real curve for half of all arbitrary polygons
    // (septicCascadeDegree.test.ts). The plane has no such region at all.
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry(seed * 104729 + 7)
      const P: Complex[] = [0, 1, 2, 3, 4].map(() => ({ re: 6 * rng() - 3, im: 6 * rng() - 3 }))
      const sol = planarSepticFromControlPoints(P)
      expect(sol).not.toBeNull()
      // …and it really does pass through the five prescribed points.
      for (let j = 0; j < 5; j++) expect(dist(sol!.controlPoints[j], P[j])).toBeLessThan(1e-7)
      expect(Number.isFinite(sol!.arcLength)).toBe(true)
    }
  })

  it('the only failure is a first leg of length zero', () => {
    const P: Complex[] = [
      { re: 0, im: 0 }, { re: 0, im: 0 },
      { re: 1, im: 0 }, { re: 2, im: 1 }, { re: 3, im: 0 },
    ]
    expect(planarSepticFromControlPoints(P)).toBeNull()
  })

  it('the arc length is exact, matching a fine numerical integral', () => {
    const w = randSpinor(mulberry(999))
    const cps = controlPointsOf(w, { re: 0, im: 0 })
    let num = 0
    const n = 20000
    for (let i = 0; i < n; i++) {
      num += dist(bezierAt(cps, (i + 1) / n), bezierAt(cps, i / n))
    }
    expect(Math.abs(arcLengthOf(w) - num) / num).toBeLessThan
      (1e-6)
  })

  it('the septic cascade at degree 3 is the classical condition N₁² = N₀N₂', () => {
    // The oldest planar PH fact — the three legs of a PH cubic are in geometric
    // progression as complex numbers — is this same uniqueness at k = 2: given the
    // first two legs the third is DETERMINED, by exactly the division the cascade does.
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry(seed * 31337 + 11)
      const w0: Complex = { re: 2 * rng() - 1, im: 2 * rng() - 1 }
      const w1: Complex = { re: 2 * rng() - 1, im: 2 * rng() - 1 }
      const [N0, N1, N2] = [cmul(w0, w0), cmul(w0, w1), cmul(w1, w1)]
      expect(dist(cmul(N1, N1), cmul(N0, N2))).toBeLessThan(1e-12)
      expect(dist(cdiv(cmul(N1, N1), N0), N2)).toBeLessThan(1e-12)
    }
  })

  it('a constant generator gives a straight line — every leg equal', () => {
    const w: Spinor4 = [
      { re: 1, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 }, { re: 1, im: 0 },
    ]
    for (const n of hodographCoefficients(w)) expect(dist(n, { re: 1, im: 0 })).toBeLessThan(1e-12)
  })
})

describe('planar septic — five points ON the curve', () => {
  const START: Complex[] = [
    { re: -2.4, im: -0.9 },
    { re: -1.1, im: 0.8 },
    { re: 0.2, im: -0.4 },
    { re: 1.3, im: 0.9 },
    { re: 2.5, im: -0.6 },
  ]

  it('finds eight branches, and each really interpolates the five points', () => {
    const branches = septicInterpolants(START)
    expect(branches.length).toBe(8)
    for (const b of branches) {
      for (let i = 0; i < 5; i++) {
        const on = bezierAt(b.solution.controlPoints, DEFAULT_TS[i])
        expect(dist(on, START[i])).toBeLessThan(1e-7)
      }
    }
  })

  it('the eight are genuinely distinct curves', () => {
    const branches = septicInterpolants(START)
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const a = branches[i].solution.controlPoints
        const b = branches[j].solution.controlPoints
        const sep = Math.max(...a.map((p, k) => dist(p, b[k])))
        expect(sep).toBeGreaterThan(1e-4)
      }
    }
  })

  it('eight for many data sets — the count never drops, unlike in space', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const rng = mulberry(seed * 31337 + 5)
      const pts: Complex[] = [0, 1, 2, 3, 4].map(() => ({ re: 6 * rng() - 3, im: 4 * rng() - 2 }))
      expect(septicInterpolants(pts).length).toBe(8)
    }
  })

  it('tracking carries every branch through a drag, keeping its identity', () => {
    let branches = septicInterpolants(START)
    let roots = branches.map((b) => b.root)
    // Walk the last point around a small circle, one degree at a time.
    for (let step = 1; step <= 60; step++) {
      const th = (2 * Math.PI * step) / 60
      const pts = START.map((p, i) =>
        i === 4 ? { re: p.re + 0.35 * Math.cos(th) - 0.35, im: p.im + 0.35 * Math.sin(th) } : p,
      )
      const next = trackSepticInterpolants(pts, roots)
      expect(next.every(Boolean)).toBe(true)
      // Continuity: no branch teleports between adjacent frames.
      next.forEach((b, i) => {
        const moved = Math.max(
          ...b!.solution.controlPoints.map((p, k) => dist(p, branches[i].solution.controlPoints[k])),
        )
        expect(moved).toBeLessThan(2)
      })
      branches = next as NonNullable<(typeof next)[number]>[]
      roots = branches.map((b) => b.root)
    }
    // A closed loop in data space returns to the same eight curves as a set.
    const fresh = septicInterpolants(START)
    for (const b of branches) {
      const near = fresh.some(
        (f) => Math.max(...f.solution.controlPoints.map((p, k) => dist(p, b.solution.controlPoints[k]))) < 1e-5,
      )
      expect(near).toBe(true)
    }
  })

  it('the Gram matrix integrates the Bernstein basis correctly', () => {
    const M = gramMatrix(1)
    // ∫₀¹ B_a³B_b³ = C(3,a)C(3,b) / ((2·3+1)·C(6,a+b))
    const exact = (a: number, b: number) => {
      const c = (n: number, k: number) => { let v = 1; for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1); return v }
      return (c(3, a) * c(3, b)) / (7 * c(6, a + b))
    }
    for (let a = 0; a <= 3; a++) {
      for (let b = 0; b <= 3; b++) expect(Math.abs(M[a][b] - exact(a, b))).toBeLessThan(1e-12)
    }
  })
})
