// ============================================================================
// PINNED ENDS IN SPATIAL FREE MODE — how far a heavy weight is from a hard constraint.
//
// The free-mode editor's contract is "the ends stay where they are unless you grab one". That is a
// least-squares weight, not a constraint, so the honest question is not whether it holds but by how
// much it misses — over a long drag, where the misses accumulate. The planar twin is
// phFreeDragPinned.test.ts and this is the same measurement one geometry up.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Quat, Vec3 } from '../quaternion'
import { vnorm, vsub } from '../quaternion'
import { type SpatialPHCurve, controlPoints, dragSpatialFree } from '../phSpatialFreeDragN'

function seedOfDegree(m: number): SpatialPHCurve {
  let a = (m * 131 + 7) >>> 0
  const rng = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const A: Quat[] = Array.from({ length: m + 1 }, (_, k) => ({
    u: 2 * rng() - 1 + (k === 0 ? 1.6 : 0), v: 2 * rng() - 1,
    p: 2 * rng() - 1, q: 2 * rng() - 1,
  }))
  return { A, p0: { x: 0, y: 0, z: 0 } }
}

describe('spatial free drag with pinned ends', () => {
  it('the ends stay put over a long drag, and the drag still tracks', () => {
    for (const m of [1, 2, 3]) {
      const n = 2 * m + 1
      let curve = seedOfDegree(m)
      const start = controlPoints(curve)
      const chord = vnorm(vsub(start[n], start[0]))
      const grabbed = Math.min(2, n - 1)          // an interior point, never an end
      const from = start[grabbed]

      let worstEnd = 0
      let tracking = 0
      for (let s = 1; s <= 100; s++) {
        const u = s / 100
        const target: Vec3 = {
          x: from.x + 1.2 * chord * u, y: from.y + 0.6 * chord * u, z: from.z - 0.4 * chord * u,
        }
        const step = dragSpatialFree(curve, grabbed, target, { pinned: [0, n] })
        curve = step.state
        const now = controlPoints(curve)
        worstEnd = Math.max(worstEnd, vnorm(vsub(now[0], start[0])), vnorm(vsub(now[n], start[n])))
        tracking = vnorm(vsub(now[grabbed], target))
      }
      const drift = worstEnd / chord
      console.log(`    degree ${n}: 100 steps over ${(1.4).toFixed(1)}x the chord —` +
        ` ends drifted ${worstEnd.toExponential(2)} (${(100 * drift).toFixed(4)}% of the chord),` +
        ` cursor error ${tracking.toFixed(4)}`)
      expect(drift, 'the ends hold to well under a pixel').toBeLessThan(0.01)
      expect(tracking, 'and the dragged point still reaches the cursor').toBeLessThan(0.05 * chord)
    }
  }, 300_000)

  it('grabbing a pinned end MOVES it — the drag always wins over the pin', () => {
    for (const m of [1, 2, 3]) {
      const n = 2 * m + 1
      const curve = seedOfDegree(m)
      const start = controlPoints(curve)
      const chord = vnorm(vsub(start[n], start[0]))
      const target: Vec3 = { x: start[0].x + 0.3 * chord, y: start[0].y + 0.2 * chord, z: start[0].z }
      const step = dragSpatialFree(curve, 0, target, { pinned: [0, n] })
      const now = controlPoints(step.state)
      const moved = vnorm(vsub(now[0], start[0]))
      const other = vnorm(vsub(now[n], start[n]))
      console.log(`    degree ${n}: the grabbed end moved ${moved.toFixed(3)},` +
        ` the other held to ${other.toExponential(1)}`)
      expect(moved, 'the grabbed end follows the cursor').toBeGreaterThan(0.1 * chord)
      expect(other / chord, 'the other end still holds').toBeLessThan(0.01)
    }
  }, 300_000)

  it('without the pin the ends DO move — so the option is doing the work', () => {
    const m = 2
    const n = 5
    let free = seedOfDegree(m)
    let held = free
    const start = controlPoints(free)
    const chord = vnorm(vsub(start[n], start[0]))
    for (let s = 1; s <= 40; s++) {
      const target: Vec3 = {
        x: start[2].x + chord * (s / 40), y: start[2].y + 0.5 * chord * (s / 40), z: start[2].z,
      }
      free = dragSpatialFree(free, 2, target).state
      held = dragSpatialFree(held, 2, target, { pinned: [0, n] }).state
    }
    const a = controlPoints(free)
    const b = controlPoints(held)
    const unpinned = Math.max(vnorm(vsub(a[0], start[0])), vnorm(vsub(a[n], start[n])))
    const pinned = Math.max(vnorm(vsub(b[0], start[0])), vnorm(vsub(b[n], start[n])))
    console.log(`    degree 5, same 40-step drag: ends move ${unpinned.toFixed(4)} unpinned,` +
      ` ${pinned.toExponential(2)} pinned — a factor of ${(unpinned / pinned).toExponential(1)}`)
    expect(unpinned).toBeGreaterThan(50 * pinned)
  }, 300_000)
})
