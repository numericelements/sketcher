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

const CANDIDATES: { grip: number[]; targets: Vec3[] }[] = [
  { grip: [0, 1, 2, 3, 4, 5, 6], targets: [{ x: -0.23985239001922309, y: 0.095523713389411569, z: 0.6947724677156657 }, { x: -0.68958438606932759, y: -0.093424898805096745, z: 0.64233045838773251 }, { x: 1.4407262122258544, y: -0.60943740466609597, z: -1.4864546202588826 }, { x: -1.0246859053149819, y: 1.4948339466936886, z: -0.66032533021643758 }, { x: -1.3113835221156478, y: 0.28299120417796075, z: 0.41513528139330447 }, { x: 1.4452129304409027, y: -0.0867874959949404, z: 1.3557600877247751 }, { x: 1.1492117119487375, y: 0.075257861288264394, z: -0.31993092061020434 }] },
  { grip: [0, 1, 2, 3, 4, 7, 9], targets: [{ x: 0.4773963934276253, y: 0.6649005941580981, z: -0.72464255732484162 }, { x: -1.1627221740782261, y: -0.37978282500989735, z: -0.55716873379424214 }, { x: -0.78306855540722609, y: 0.040235528256744146, z: 0.31893099937587976 }, { x: 1.3019408653490245, y: -1.0881211068481207, z: -0.57337699458003044 }, { x: 0.75572333112359047, y: -0.24469293421134353, z: -1.453483147546649 }, { x: 0.87748706806451082, y: 0.1196527979336679, z: -0.94489129143767059 }, { x: 0.61997058894485235, y: -0.81524650496430695, z: -1.3636352741159499 }] },
  { grip: [0, 1, 2, 3, 6, 7, 8], targets: [{ x: -0.86299241753295064, y: -0.6398326987400651, z: -1.4289480624720454 }, { x: -0.99365122010931373, y: -0.40447606332600117, z: -1.3332211975939572 }, { x: 0.27760967938229442, y: 0.0055336919613182545, z: 0.69807674456387758 }, { x: 0.23541274177841842, y: 0.75554596306756139, z: 0.1954731463920325 }, { x: -0.70920771081000566, y: 0.15752264158800244, z: 0.012526363832876086 }, { x: -0.99806888750754297, y: -0.90257559274323285, z: -0.12024558358825743 }, { x: -0.57916657417081296, y: 0.98796420707367361, z: -1.1954998467117548 }] },
]

function* choose(n: number, k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) { yield [...acc]; return }
  for (let i = start; i <= n - (k - acc.length); i++) {
    acc.push(i); yield* choose(n, k, i + 1, acc); acc.pop()
  }
}

function multi(m: number, grip: readonly number[], targets: readonly Vec3[], starts: number): boolean {
  for (let s = 0; s < starts; s++) {
    const A = Array.from({ length: m + 1 }, () => rq(s % 2 ? 0.6 : 1.5))
    const pts = controlPoints({ A, p0: targets[0] })
    const seed: SpatialPHCurve = { A, p0: { x: 2 * targets[0].x - pts[grip[0]].x, y: 2 * targets[0].y - pts[grip[0]].y, z: 2 * targets[0].z - pts[grip[0]].z } }
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
    // three candidates from three different grips, inlined verbatim from
    // docs/surjectivity-candidates.json (the app tsconfig has no node types, so no fs here)
    for (const c of CANDIDATES) {
      const solved = ladder(4, c.grip, c.targets)
      expect(solved, `candidate {${c.grip}} still resists — if this fails, it is a DISCOVERY: see docs/SURJECTIVITY.md`).toBe(false)
    }
  }, 600_000)
})
