// ============================================================================
// THE PLANE INSIDE SPACE — the 2D count, cross-checked against the 3D fibre.
//
// Two independent pieces of machinery are supposed to be describing the same curves. The planar
// solver runs a total-degree homotopy and returns a COUNT of interpolants; the spatial one charts
// a FAMILY over the same held points. If they agree, each validates the other; if they disagree,
// one is wrong and it matters which.
//
// THE BRIDGE, and it is an identity rather than an approximation:
//
//     w = a + bi        ↦        𝒜 = a·i + b·j
//     𝒜 i 𝒜* = (a²−b², 2ab, 0) = w², in z = 0
//
// The degrees line up because a planar curve of degree 2K−1 has K complex coefficients and a
// spatial curve of degree 2m+1 has m+1 quaternion ones, and 2K−1 = 2m+1 gives K = m+1. The
// Bernstein weights are the same numbers on both sides, C(K−1,a)C(K−1,b)/C(2K−2,j) against
// C(m,a)C(m,b)/C(2m,j). So the embedded control points are not close — they are equal.
//
// WHAT THE CROSS-CHECK BUYS. At degree 7 a maximal grip has EIGHT planar interpolants and a
// 3-dimensional spatial fibre. All eight must be members of that one fibre. And then the question
// dimension cannot answer: are they eight separate answers in space too, or eight points of one
// connected family? A path decides it, and connectInFibre goes looking for one.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../complex'
import type { Quat } from '../quaternion'
import { vnorm, vsub } from '../quaternion'
import { controlPointsFrom, solveSubset } from '../planarPHSubset'
import { type SpatialPHCurve, controlPoints } from '../phSpatialFreeDragN'
import { bridgeInFibre, fibreDimension, maximalGrips, retractionChart } from '../spatialFibre'

/** The bridge. */
const embed = (w: readonly Complex[], p0: Complex): SpatialPHCurve => ({
  A: w.map((z) => ({ u: 0, v: z.re, p: z.im, q: 0 }) as Quat),
  p0: { x: p0.re, y: p0.im, z: 0 },
})

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A planar PH curve of degree 2K−1, and its control points. */
function planarSeed(K: number, seed: number): { w: Complex[]; cps: Complex[] } {
  const r = rng(seed)
  const w: Complex[] = Array.from({ length: K }, (_, k) => ({
    re: 2 * r() - 1 + (k === 0 ? 1.1 : 0), im: 2 * r() - 1,
  }))
  return { w, cps: controlPointsFrom(K, w, { re: 0, im: 0 }) }
}

describe('a planar PH curve IS a spatial one', () => {
  it('the embedding is exact, at every degree the deck uses', () => {
    for (const K of [2, 3, 4]) {
      const { w, cps } = planarSeed(K, 900 + K)
      const sp = controlPoints(embed(w, { re: 0, im: 0 }))
      expect(sp.length).toBe(cps.length)
      let worst = 0
      let worstZ = 0
      for (let i = 0; i < cps.length; i++) {
        worst = Math.max(worst, Math.hypot(sp[i].x - cps[i].re, sp[i].y - cps[i].im))
        worstZ = Math.max(worstZ, Math.abs(sp[i].z))
      }
      console.log(`    degree ${2 * K - 1}: ${cps.length} control points,` +
        ` xy mismatch ${worst.toExponential(1)}, |z| ${worstZ.toExponential(1)}`)
      expect(worst).toBe(0)
      expect(worstZ).toBe(0)
    }
  })
})

describe('the planar count, inside the spatial fibre', () => {
  it('EVERY planar interpolant is a member of the spatial fibre over the same grip', () => {
    // degree 7: K = 4 planar coefficients, m = 3 spatial, grip of 5, up to 8 planar answers
    const K = 4
    const m = 3
    for (const grip of maximalGrips(m)) {
      const { cps } = planarSeed(K, 4200 + grip[1] * 13 + grip[2] * 7 + grip[3])
      const targets = grip.map((i) => cps[i])
      const report = solveSubset(K, grip, targets)
      expect(report.solutions.length, `{${grip}} should attain the full count`).toBe(2 ** (K - 1))

      let worstHold = 0
      const dims = new Set<number>()
      for (const sol of report.solutions) {
        const spatial = embed(sol.w, sol.p0)
        const p = controlPoints(spatial)
        grip.forEach((i, k) => {
          worstHold = Math.max(worstHold, vnorm(vsub(p[i], { x: targets[k].re, y: targets[k].im, z: 0 })))
        })
        dims.add(fibreDimension(spatial, grip).dimension)
      }
      console.log(`    {${grip}}: ${report.solutions.length} planar interpolants,` +
        ` all holding the grip to ${worstHold.toExponential(1)},` +
        ` spatial fibre dimension ${[...dims].join('/')}`)
      expect(worstHold, 'each planar answer holds the spatial grip too').toBeLessThan(1e-9)
      expect([...dims], 'and each sits on an m-dimensional spatial fibre').toEqual([m])
    }
  }, 900_000)

  it('at a planar member every dial points OUT of the plane — which is why the plane counts', () => {
    // The planar problem is 0-dimensional: with the grip held there is nothing left to move IN the
    // plane. So all m directions space adds must leave it, and they do.
    const K = 4
    const m = 3
    const grip = maximalGrips(m)[0]
    const { cps } = planarSeed(K, 4711)
    const sols = solveSubset(K, grip, grip.map((i) => cps[i])).solutions
    let worstRatio = 0
    let worstShrink = 0
    for (const sol of sols) {
      const A = embed(sol.w, sol.p0)
      const chart = retractionChart(A, grip)
      if (!chart) throw new Error('no chart at a planar member')
      const base = controlPoints(A)
      for (let k = 0; k < chart.dimension; k++) {
        // measured at two step sizes, because the claim is that the in-plane part is SECOND
        // order: halve the step and the ratio halves with it, which a first-order in-plane
        // component would not do
        const ratio = (h: number): number => {
          const t = new Array<number>(chart.dimension).fill(0)
          t[k] = h
          const p = controlPoints(chart.build(t))
          let inPlane = 0
          let outPlane = 0
          for (let i = 0; i < p.length; i++) {
            inPlane = Math.max(inPlane, Math.hypot(p[i].x - base[i].x, p[i].y - base[i].y))
            outPlane = Math.max(outPlane, Math.abs(p[i].z))
          }
          return inPlane / outPlane
        }
        const coarse = ratio(0.05)
        const fine = ratio(0.0125)
        worstRatio = Math.max(worstRatio, coarse)
        worstShrink = Math.max(worstShrink, fine / coarse)
      }
    }
    console.log(`    8 branches x ${m} dials: the most in-plane any dial ever is` +
      ` ${(100 * worstRatio).toFixed(1)}% of its out-of-plane motion at step 0.05,` +
      ` and quartering the step leaves at most ${(100 * worstShrink).toFixed(0)}% of that`)
    expect(worstRatio, 'the dials are nearly normal to the plane').toBeLessThan(0.2)
    expect(worstShrink, 'and the in-plane part is second order, so it vanishes with the step')
      .toBeLessThan(0.4)
  }, 900_000)

  it('the plane\u2019s separate answers are points of ONE connected family in space', () => {
    // The statement dimension cannot make. Steepest descent cannot even start here (see
    // bridgeInFibre): interpolate in the parameters and project back onto the grip instead.
    const K = 4
    const m = 3
    for (const [gi, grip] of [maximalGrips(m)[0], maximalGrips(m)[5]].entries()) {
    const { cps } = planarSeed(K, 4711 + 31 * gi)
    const sols = solveSubset(K, grip, grip.map((i) => cps[i])).solutions
    expect(sols.length).toBe(8)

    const curves = sols.map((s) => embed(s.w, s.p0))
    let connected = 0
    let worstHeld = 0
    // straight first, to show WHY it cannot work: the line never leaves the plane
    const flat = bridgeInFibre(curves[0], curves[1], grip)
    console.log(`    straight line, branch 1 \u2192 2: arrived ${flat.arrived.toExponential(1)}` +
      ` but median step ${flat.medianGap.toExponential(1)} against a largest of` +
      ` ${flat.maxGap.toFixed(3)} — it JUMPED, it did not travel`)
    expect(flat.connected, 'a straight homotopy stays in the plane and can only snap').toBe(false)

    for (let j = 1; j < curves.length; j++) {
      let best: ReturnType<typeof bridgeInFibre> | null = null
      let usedDetour = 0
      for (const detour of [0.25, 0.5, 1, 2, 4]) {
        const r = bridgeInFibre(curves[0], curves[j], grip, { detour })
        worstHeld = Math.max(worstHeld, r.held)
        if (!best || (r.connected && !best.connected)) { best = r; usedDetour = detour }
        if (r.connected) break
      }
      if (!best) continue
      if (best.connected) connected++
      console.log(`    branch 1 \u2192 ${j + 1}: ${best.connected ? 'CONNECTED' : 'no path   '}` +
        ` span ${best.span.toFixed(3)}, detour ${usedDetour}, arrived ${best.arrived.toExponential(1)},` +
        ` gap max/median ${(best.medianGap > 0 ? best.maxGap / best.medianGap : 0).toFixed(1)}x,` +
        ` grip held ${best.held.toExponential(1)}`)
    }
    console.log(`    {${grip}}: ${connected} of ${curves.length - 1} other branches joined to` +
      ` branch 1 by a path that stayed in the fibre`)
    expect(worstHeld, 'every attempted path stayed on the grip').toBeLessThan(1e-7)
    expect(connected, 'the plane\u2019s eight answers are one connected family in space')
      .toBe(curves.length - 1)
    }
  }, 900_000)
})
