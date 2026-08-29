// ============================================================================
// THE SURJECTIVITY BOUNDARY — Eric's (n+3)/2 rule, pinned on both sides.
//
// The conjecture and its campaign live in docs/SURJECTIVITY.md. This test pins the two halves:
//
//   · at the SAFE count (n+3)/2, every choice of held points accepts arbitrary positions —
//     reduced sweeps at degrees 5, 7, 9 (the full campaign ran ~3,700 instances) with the
//     rescue ladder the campaign earned: multi-start, constructive cascade, the reversal trick,
//     and cascade-manifold seeding;
//   · ONE point beyond (degree 9, hold 7), infeasibility is real: three of the campaign's 40
//     surviving candidates (docs/surjectivity-candidates.json) must RESIST the bounded ladder.
//     If a future solver ever solves one, that is a DISCOVERY, not a regression — update the
//     document, do not silence the test.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type SpatialPHCurve, controlPoints } from '../phSpatialFreeDragN'
import { cascadeChart, correctToGrip } from '../spatialFibre'
import type { Quat, Vec3 } from '../quaternion'

let a = 20260829
const rng = (): number => {
  a = (a + 0x6d2b79f5) >>> 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rq = (s: number): Quat => ({ u: s * (2 * rng() - 1), v: s * (2 * rng() - 1), p: s * (2 * rng() - 1), q: s * (2 * rng() - 1) })
const rv = (s: number): Vec3 => ({ x: s * (2 * rng() - 1), y: s * (2 * rng() - 1), z: s * (2 * rng() - 1) })

function* choose(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) { yield [...acc]; return }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i); yield* choose(n, k, i + 1, acc); acc.pop()
  }
}

function multi(m: number, grip: readonly number[], targets: readonly Vec3[], starts: number): boolean {
  for (let s = 0; s < starts; s++) {
    const seed: SpatialPHCurve = { A: Array.from({ length: m + 1 }, () => rq(s % 2 ? 0.6 : 1.5)), p0: targets[0] }
    const pts = controlPoints(seed)
    seed.p0 = { x: 2 * targets[0].x - pts[grip[0]].x, y: 2 * targets[0].y - pts[grip[0]].y, z: 2 * targets[0].z - pts[grip[0]].z }
    if (correctToGrip(seed, grip, targets, 120).residual < 1e-9) return true
  }
  return false
}

/** Cascade-manifold seeding — the strongest rescue the campaign found (12/12 at the safe count). */
function manifold(m: number, grip: readonly number[], targets: readonly Vec3[], tries: number): boolean {
  const n = 2 * m + 1
  for (const [G, T] of [[grip, targets], [[...grip].map((g) => n - g).reverse(), [...targets].reverse()]] as const) {
    for (let k = 0; k < tries; k++) {
      const six: Vec3[] = []
      for (let i = 0; i <= m + 1; i++) {
        const at = G.indexOf(i)
        six.push(at >= 0 ? T[at] : rv(1.8))
      }
      const chart = cascadeChart(m, six)
      if (!chart) continue
      const dials = Array.from({ length: m }, () => 0.4 * (2 * rng() - 1))
      if (correctToGrip(chart.build(dials), G, T, 200).residual < 1e-9) return true
    }
  }
  return false
}

const ladder = (m: number, grip: readonly number[], targets: readonly Vec3[]): boolean =>
  multi(m, grip, targets, 40) || manifold(m, grip, targets, 60) || multi(m, grip, targets, 160)

describe('the surjectivity boundary', () => {
  it('at the safe count, every sampled choice of held points accepts arbitrary positions', () => {
    const cases: [number, number[][]][] = [
      [2, [...choose(6, 4)]],                                        // degree 5: all 15
      [3, [...choose(8, 5)].filter((_, i) => i % 4 === 0)],          // degree 7: every 4th of 56
      [4, [...choose(10, 6)].filter((_, i) => i % 15 === 0)],        // degree 9: every 15th of 210
    ]
    for (const [m, grips] of cases) {
      for (const grip of grips) {
        for (let c = 0; c < 2; c++) {
          const targets = grip.map(() => rv(1.5))
          expect(ladder(m, grip, targets), `degree ${2 * m + 1} {${grip}} c${c} solves`).toBe(true)
        }
      }
    }
  }, 600_000)

  it('one point beyond, the campaign candidates resist the same ladder', () => {
    const data = JSON.parse(readFileSync(join(__dirname, '../../../docs/surjectivity-candidates.json'), 'utf8'))
    // three candidates from three different grips
    const seen = new Set<string>()
    const picked = data.candidates.filter((c: { grip: number[] }) => {
      const k = c.grip.join(',')
      if (seen.has(k) || seen.size >= 3) return false
      seen.add(k)
      return true
    })
    expect(picked.length).toBe(3)
    for (const c of picked) {
      const solved = ladder(4, c.grip, c.targets)
      expect(solved, `candidate {${c.grip}} still resists — if this fails, it is a DISCOVERY: see docs/SURJECTIVITY.md`).toBe(false)
    }
  }, 600_000)
})
