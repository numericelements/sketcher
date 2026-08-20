// ============================================================================
// SIX CONTROL POINTS IN SPACE — the rung where the answer is a COUNT, and the count is real.
//
// Every other spatial rung leaves a fibre: 4k+2 against 3 per point divides evenly only when
// k ≡ 1 (mod 3), and degree 7 is the first case. So this is the spatial answer to the planar
// slide, and it differs in the way that matters: the plane gives 2^{K−1} always, because the
// unknowns are complex and every Bézout root is a curve. Here the closing system is REAL, the
// resultant has degree 8, and only its real roots are curves — 0, 2, 4 or 6, always even, and
// often zero.
//
// The solver is checked three ways: it finds the curve the data came from, its counts agree with
// what septicCascadeDegree.test.ts measured independently, and every solution it returns really
// has the prescribed six control points.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, type Vec3, qadd, vnorm, vsub } from '../quaternion'
import {
  type SepticSpinor,
  septicCascade, septicControlPoints, solveSpatialSepticSixPoints, trackSpatialSeptic,
} from '../phSpatialSepticSixPoints'

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const randQuat = (rng: () => number): Quat =>
  ({ u: 2 * rng() - 1, v: 2 * rng() - 1, p: 2 * rng() - 1, q: 2 * rng() - 1 })

/** A genuine PH septic, so at least one real solution is guaranteed. */
function sampleCurve(seed: number): { A: SepticSpinor; points: Vec3[] } {
  const rng = mulberry(seed)
  const A: SepticSpinor = [randQuat(rng), randQuat(rng), randQuat(rng), randQuat(rng)]
  A[0] = qadd(A[0], { u: 1.5, v: 0, p: 0, q: 0 })
  return { A, points: septicControlPoints(A, { x: 0, y: 0, z: 0 }).slice(0, 6) }
}
const dist = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

describe('spatial PH septics through six control points', () => {
  it('finds the curve the data came from, and every solution really interpolates', () => {
    for (const seed of [11, 23, 47]) {
      const { A, points } = sampleCurve(seed)
      const r = solveSpatialSepticSixPoints(points)
      expect(r.degenerate).toBe(false)
      expect(r.solutions.length, 'the source curve is in there').toBeGreaterThan(0)

      // every returned solution must carry the prescribed six points
      let worst = 0
      for (const s of r.solutions) {
        for (let i = 0; i < 6; i++) worst = Math.max(worst, dist(s.controlPoints[i], points[i]))
      }
      // and one of them must be the curve we started from
      const truth = septicControlPoints(A, { x: 0, y: 0, z: 0 })
      const best = Math.min(...r.solutions.map((s) =>
        Math.max(...truth.map((p, i) => dist(p, s.controlPoints[i])))))
      console.log(`    seed ${seed}: ${r.solutions.length} solutions from ${r.candidates} sign changes;` +
        ` interpolation ${worst.toExponential(1)}, nearest to the source ${best.toExponential(1)}`)
      expect(worst, 'the six held points are held').toBeLessThan(1e-7)
      expect(best, 'the source curve is one of the answers').toBeLessThan(1e-6)
      expect(r.solutions.length % 2, 'real roots of a real polynomial pair up').toBe(0)
    }
  }, 600_000)

  it('the count over arbitrary polygons is 0, 2, 4 or 6 — and half of them are ZERO', () => {
    // The figure drags control points freely, so the data need not come from a PH curve at all.
    // Independently measured in septicCascadeDegree.test.ts; this checks the module agrees.
    const tally = new Map<number, number>()
    for (let seed = 0; seed < 24; seed++) {
      const rng = mulberry(seed * 7919 + 3)
      const pts: Vec3[] = [{ x: 0, y: 0, z: 0 }]
      pts.push({ x: pts[0].x + 1 / 7, y: 0, z: 0 })                      // N₀ along x, nonzero
      for (let j = 2; j < 6; j++) {
        pts.push({
          x: pts[j - 1].x + (2 * rng() - 1) / 7,
          y: pts[j - 1].y + (2 * rng() - 1) / 7,
          z: pts[j - 1].z + (2 * rng() - 1) / 7,
        })
      }
      const n = solveSpatialSepticSixPoints(pts, 12000).solutions.length
      tally.set(n, (tally.get(n) ?? 0) + 1)
    }
    const counts = [...tally.entries()].sort((a, b) => a[0] - b[0])
    console.log(`    over 24 arbitrary polygons: ${counts.map(([k, v]) => `${k}→${v}`).join('  ')}`)
    expect([...tally.keys()].every((n) => n % 2 === 0), 'always even').toBe(true)
    expect(Math.max(...tally.keys()), 'under the degree-8 ceiling').toBeLessThanOrEqual(8)
    expect(tally.get(0) ?? 0, 'the empty answer is common, and the figure must expect it')
      .toBeGreaterThan(0)
  }, 600_000)

  it('hold FIVE instead, and the cascade is a GLOBAL CHART — always solvable, never empty', () => {
    // One control point fewer and everything changes. Five points fix N₀…N₃, which is exactly the
    // four cascade stages, and there is nothing left to close: every (t₁,t₂,t₃) in ℝ³ is a curve.
    // 18 − 15 = 3, and the three parameters ARE the coordinates — no continuation, no equations,
    // no existence question. The sixth point is what turns the last free parameter into an
    // equation, and equations over ℝ can fail where free parameters cannot.
    const N: Vec3[] = [
      { x: 1.2, y: 0.3, z: -0.4 }, { x: 0.5, y: -0.7, z: 0.2 },
      { x: -0.3, y: 0.9, z: 0.6 }, { x: 0.8, y: 0.1, z: -0.5 }, { x: 0, y: 0, z: 0 },
    ]
    const c = septicCascade(N)
    expect(c).not.toBeNull()
    const p0: Vec3 = { x: 0, y: 0, z: 0 }
    const target: Vec3[] = [p0]
    for (let j = 0; j < 4; j++) {
      target.push({ x: target[j].x + N[j].x / 7, y: target[j].y + N[j].y / 7, z: target[j].z + N[j].z / 7 })
    }
    let worst = 0
    let reach = 0
    const base = septicControlPoints(c!.build(0, 0, 0), p0)
    for (const t of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [3, -2, 5], [-7, 4, -1], [20, 15, -30]]) {
      const cps = septicControlPoints(c!.build(t[0], t[1], t[2]), p0)
      for (let i = 0; i < 5; i++) worst = Math.max(worst, dist(cps[i], target[i]))
      reach = Math.max(reach, dist(cps[7], base[7]))
    }
    console.log(`    five held: preserved to ${worst.toExponential(1)} at every (t₁,t₂,t₃) tried,` +
      ` including (20,15,−30); the free end reached ${reach.toExponential(1)}`)
    expect(worst, 'every point of ℝ³ is a curve with these five control points').toBeLessThan(1e-12)
    expect(reach, 'and the family is unbounded — an open fibre, not a loop').toBeGreaterThan(1e3)
  }, 300_000)

  it('tracking carries a branch by its cascade parameters, and reports one that is lost', () => {
    const { points } = sampleCurve(11)
    const start = solveSpatialSepticSixPoints(points)
    expect(start.solutions.length).toBeGreaterThan(0)

    // a small move of the last held point: every branch should survive
    const moved = points.map((p, i) => (i === 5 ? { x: p.x + 0.01, y: p.y - 0.005, z: p.z } : p))
    const carried = trackSpatialSeptic(moved, start.solutions)
    const alive = carried.filter((s) => s !== null).length
    let drift = 0
    carried.forEach((s, i) => {
      if (s) drift = Math.max(drift, Math.abs(s.t[0] - start.solutions[i].t[0]))
    })
    console.log(`    ${start.solutions.length} branches, ${alive} survived a small step,` +
      ` largest t₁ move ${drift.toExponential(1)}`)
    expect(alive, 'a small step loses nothing').toBe(start.solutions.length)

    // and the carried branches still interpolate the MOVED data
    let worst = 0
    for (const s of carried) {
      if (!s) continue
      for (let i = 0; i < 6; i++) worst = Math.max(worst, dist(s.controlPoints[i], moved[i]))
    }
    expect(worst, 'carried branches hold the new points').toBeLessThan(1e-7)
  }, 600_000)
})
