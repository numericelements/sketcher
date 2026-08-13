// ============================================================================
// TORUS × ROADS — what rationalising does to the answer set of an interpolation problem.
//
// The polynomial answer set is a torus: compact, and arc length is constant on it (the sandwich pins
// |X|² = |v| at every link). This file measures what the rational family adds, and the shape of the
// answer is that NOTHING WAS DEFORMED — the old object survives untouched and new directions are
// bolted on:
//
//   · poles and dials HELD  →  arc length is EXACTLY constant on the whole fiber. Not "barely
//     varies": every probe returns the same digits. The torus kept its incapacity.
//   · poles and dials MOVED →  a factor of 510 in length on the same six numbers of data, from 0.3%
//     above the chord to five hundred times it. That is where the freedom lives.
//   · ONE dial alone is nearly inert (0.3% across eighty units of range). The freedom is in the
//     COUPLING, which is why "the dial controls length" would be the wrong summary.
//
// AND WHERE THE ROADS END, which corrected a wrong guess. Pole collisions and a pole reaching the
// drawn piece — both to the last solvable step. NOT cusps: σ = |𝒜|² is a sum of four squares, so a
// cusp is four simultaneous conditions against a one-parameter walk. The classical PH hazard is not
// the rational one.
//
// These are the numbers on the "Torus × roads" slide of the price-of-a-circle deck.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  seedQuintic, toMember, speedAt, curveAt, fiberLoop, withDial, dataOf, poleMargin,
  familyBasis, projectToFamily, projectToData, packSpinor, unpackSpinor,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'

const arcLength = (prm: MultiPoleParams, n = 1200): number => {
  const m = toMember(prm)
  let s = 0
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n
    s += ((b - a) / 6) * (speedAt(m, a) + 4 * speedAt(m, (a + b) / 2) + speedAt(m, b))
  }
  return s
}
const solves = (prm: MultiPoleParams, target: readonly number[]): boolean => {
  const err = Math.hypot(...dataOf(toMember(prm)).map((v, i) => v - target[i]))
  return err < 1e-7 && poleMargin(prm) > 1e-3
}

const seed = seedQuintic()
const target = dataOf(toMember(seed))
const L0 = arcLength(seed)

describe('torus x roads', () => {
  it('the seed is what the slide says it is', () => {
    expect(seed.roots).toEqual([1.7, -0.9])
    expect(seed.lambdas).toEqual([0.6, -0.35])
    expect(familyBasis(seed).length).toBe(8) // 4(n+1) - 4m = 16 - 8
    expect(L0).toBeCloseTo(0.555996, 5)
  })

  it('THE TORUS SURVIVES: with poles and dials held, arc length is EXACTLY constant', () => {
    const basis = familyBasis(seed)
    let landed = 0
    for (let trial = 0; trial < 40; trial++) {
      const x = packSpinor(seed.A).slice()
      basis.forEach((b, i) => {
        const amp = 3 * Math.sin(2.1 * trial + 1.7 * i) * Math.cos(0.9 * trial - 0.4 * i)
        for (let j = 0; j < x.length; j++) x[j] += amp * b[j]
      })
      const cand = projectToData({ ...seed, A: unpackSpinor(x) }, target)
      if (!solves(cand, target)) continue
      landed++
      // every digit, not a tolerance: relative deviation below 1e-9
      expect(Math.abs(arcLength(cand) - L0) / L0).toBeLessThan(1e-9)
    }
    expect(landed).toBe(40)
  }, 30_000)

  it('and a walk around the fiber closes, so the fiber really is compact', () => {
    const loop = fiberLoop(seed, { stride: 0.05, maxSteps: 400 })
    expect(loop.length).toBeGreaterThan(40)   // it closed rather than running out of steps
    expect(loop.length).toBeLessThan(400)
    for (const q of loop) expect(Math.abs(arcLength(q) - L0) / L0).toBeLessThan(1e-9)
  }, 30_000)

  it('ONE dial alone is nearly inert: 80 units of range, 0.3% of length', () => {
    const Ls: number[] = []
    for (let k = -39; k <= 40; k += 4) {
      const out = withDial(seed, target, { lambda: { index: 0, value: k } })
      expect(out).not.toBeNull() // the lambda road does not end anywhere in here
      Ls.push(arcLength(out!))
    }
    expect(Math.max(...Ls) / Math.min(...Ls)).toBeLessThan(1.005)
  })

  it('THE ROADS ARE WHERE LENGTH LIVES: poles and dials together give a factor of 510', () => {
    const chord = Math.hypot(...(() => { const c = curveAt(toMember(seed), 1); return [c.x, c.y, c.z] })())
    expect(chord).toBeCloseTo(0.5455, 3)

    const Ls: number[] = []
    for (const r0 of [1.05, 4, 60]) {
      for (const r1 of [-0.05, -3, -50]) {
        for (const l0 of [-30, 0, 30]) {
          for (const l1 of [-30, 0, 30]) {
            const solved = projectToData(
              projectToFamily({ ...seed, roots: [r0, r1], lambdas: [l0, l1] }), target)
            if (solves(solved, target)) Ls.push(arcLength(solved))
          }
        }
      }
    }
    expect(Ls.length).toBeGreaterThan(60)
    expect(Math.min(...Ls) / chord).toBeLessThan(1.01)      // the short end is essentially the chord
    expect(Math.max(...Ls) / Math.min(...Ls)).toBeGreaterThan(400)
  }, 30_000)

  it('A ROAD ENDS when a pole reaches the drawn piece', () => {
    expect(withDial(seed, target, { pole: { index: 0, value: 1.005 } })).not.toBeNull()
    expect(withDial(seed, target, { pole: { index: 0, value: 1.0 } })).toBeNull()
  })

  it('A ROAD ENDS when two poles collide — Sigma blows up', () => {
    const same = projectToFamily({ ...seed, roots: [1.7, 2.6] })
    const tgt = dataOf(toMember(same))
    expect(withDial(same, tgt, { pole: { index: 0, value: 2.5995 } })).not.toBeNull()
    expect(withDial(same, tgt, { pole: { index: 0, value: 2.6 } })).toBeNull()
  })

  it('A ROAD NEVER ENDS AT A CUSP: sigma is a sum of four squares', () => {
    let worst = Infinity
    for (let k = -30; k <= 30; k += 2) {
      const out = withDial(seed, target, { lambda: { index: 0, value: k } })
      if (!out) continue
      const m = toMember(out)
      for (let i = 0; i <= 200; i++) worst = Math.min(worst, speedAt(m, i / 200))
    }
    expect(worst).toBeGreaterThan(0.4) // measured 0.445 — nowhere near a vanishing speed
  })
})
