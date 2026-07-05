// O(n) regression pin for the curvature-drag unit cost. The banded trust-region engine is
// O(n·b²), but the drag was superlinear because the LOCAL Jacobian's seed precompute
// (precomputeOpenSeeds) was O(n² (a full-width Dirac decompose per control point), recomputed
// on every g-build. localDiracSeeds made it O(n). This times, in isolation (no solver):
//   • the numerator build (already O(n)),
//   • the local-Jacobian build with FRESH seeds — the production path,
//   • the same with CACHED seeds, and
//   • the seed precompute alone,
// each as a function of n, and ASSERTS the growth is linear, not quadratic. Per-doubling
// growth: O(n) ≈ ×2, O(n²) ≈ ×4 — a threshold of 3.0 separates them with wide margin.
import { describe, it, expect } from 'vitest'
import { curvatureExtremaNumeratorPlanar } from '../curvature'
import { curvatureExtremaGradientPlanarLocal, precomputeOpenSeeds } from '../gradient'

const DEGREE = 3
const knotsFor = (n: number) => {
  const k: number[] = []
  for (let i = 0; i < DEGREE + 1; i++) k.push(0)
  for (let i = 1; i < n - DEGREE; i++) k.push(i / (n - DEGREE))
  for (let i = 0; i < DEGREE + 1; i++) k.push(1)
  return k
}
const mkXY = (n: number) => ({
  x: Array.from({ length: n }, (_, i) => 20 + 22 * i),
  y: Array.from({ length: n }, (_, i) => 120 + 95 * Math.sin((Math.PI * i) / 3)),
})

const timeIt = (reps: number, f: () => void): number => {
  f() // warm
  let best = Infinity
  for (let r = 0; r < 3; r++) {
    const t0 = performance.now()
    for (let i = 0; i < reps; i++) f()
    const ms = (performance.now() - t0) / reps
    if (ms < best) best = ms
  }
  return best
}

describe('curvature-drag g-build cost is O(n), not O(n²)', () => {
  it('numerator, local-Jacobian (fresh + cached seeds), and seed precompute all scale linearly', () => {
    const sizes = [40, 80, 160, 320, 640]
    const num: number[] = [], jacFresh: number[] = [], jacCached: number[] = [], seedsOnly: number[] = []
    // eslint-disable-next-line no-console
    console.log('\n   n   numerator ms    Jac(fresh) ms   Jac(cached) ms   seeds ms   (per call; min of 3)')
    for (const n of sizes) {
      const { x, y } = mkXY(n)
      const knots = knotsFor(n)
      const reps = Math.max(3, Math.round(2000 / n))
      const nm = timeIt(reps, () => { curvatureExtremaNumeratorPlanar(x, y, knots, DEGREE).flatCoeffs() })
      const jf = timeIt(reps, () => { curvatureExtremaGradientPlanarLocal(x, y, knots, DEGREE) }) // default seeds → fresh precompute
      const seeds = precomputeOpenSeeds(knots, DEGREE, n)
      const jc = timeIt(reps, () => { curvatureExtremaGradientPlanarLocal(x, y, knots, DEGREE, seeds) })
      const sd = timeIt(reps, () => { precomputeOpenSeeds(knots, DEGREE, n) })
      num.push(nm); jacFresh.push(jf); jacCached.push(jc); seedsOnly.push(sd)
      // eslint-disable-next-line no-console
      console.log(`  ${String(n).padStart(3)}  ${nm.toFixed(4).padStart(8)}     ${jf.toFixed(4).padStart(8)}      ${jc.toFixed(4).padStart(8)}     ${sd.toFixed(4).padStart(7)}`)
    }
    // Per-doubling growth over the two largest steps (least noise-sensitive), averaged.
    const meanTailGrowth = (t: number[]) => {
      const g1 = t[t.length - 1] / t[t.length - 2] // 320→640
      const g2 = t[t.length - 2] / t[t.length - 3] // 160→320
      return (g1 + g2) / 2
    }
    // O(n) ≈ 2.0, O(n²) ≈ 4.0. Assert well below 3.0 for every quantity.
    expect(meanTailGrowth(num), 'numerator growth/doubling').toBeLessThan(3.0)
    expect(meanTailGrowth(seedsOnly), 'seed precompute growth/doubling (was ~4.1 = O(n²))').toBeLessThan(3.0)
    expect(meanTailGrowth(jacFresh), 'fresh-seed Jacobian growth/doubling (the production path)').toBeLessThan(3.0)
    // And fresh ≈ cached at the largest n: the precompute is no longer the bottleneck
    // (before the fix this ratio was ~15×).
    const n2 = sizes.length - 1
    expect(jacFresh[n2] / jacCached[n2], 'fresh/cached seed Jacobian at largest n').toBeLessThan(3.0)
  }, 120000)
})
