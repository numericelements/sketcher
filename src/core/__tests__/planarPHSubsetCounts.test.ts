// ============================================================================
// HOW MANY PLANAR PH CURVES PASS THROUGH A CHOSEN SET OF CONTROL POINTS — certified.
//
// THE PROBLEM IS ALGEBRAIC, AND QUADRATIC. The unknowns are the generator coefficients
// w₀…w_{K−1} ∈ ℂ, and every leg is a quadratic form in them (N₀ = w₀², N₁ = w₀w₁,
// N₂ = (2/5)w₀w₂ + (3/5)w₁², …). A prescribed control point is a partial sum of legs, so
// prescribing the maximal K+1 of them and differencing away p₀ leaves exactly K quadratic
// equations in K complex unknowns. dim = 2K+2 and each planar condition costs 2, so K+1 is
// v_max and the fibre is a COUNT, never a positive-dimensional family — unlike space.
//
// WHY A HOMOTOPY AND NOT RANDOM-START NEWTON. Newton from many starts gives a LOWER BOUND:
// you know what you found, not what you missed, and this repository has already published an
// under-sampled count once (SEPTIC_SIX_POINTS §"The count: 0, 2, 4 or 6"). A total-degree
// homotopy is exhaustive by a theorem instead:
//
//   · K quadrics ⟹ Bézout bound 2^K on isolated solutions;
//   · start from G_c(w) = w_c² − 1, whose 2^K roots are the sign vectors, known exactly;
//   · track H(w,s) = (1−s)·γ·G(w) + s·F(w) with γ generic complex — the gamma trick makes the
//     paths smooth and non-crossing for s < 1, so EVERY isolated solution of F is the endpoint
//     of one of the 2^K paths.
//
// The completeness is algebra; only the tracking is floating point. So the certificate is the
// PATH ACCOUNTING — finite + diverged = 2^K with zero failures — not the plausibility of the
// answer. A first version of this tracker had all 16 paths land on 2 roots with nothing
// diverging: arithmetically fine, logically worthless. The corrector needs a LEASH (a
// correction bounded by a fraction of the predictor step) or it walks onto a neighbouring
// path's root and reports a finite solution where the true path ran to infinity.
//
// WHAT IS CERTIFIED HERE, and it corrects a claim in phPlanarSeptic.ts:
//
//   degree  K  dim  v_max  subsets  max   histogram
//      1    1   4     2       1      1    1→1
//      3    2   6     3       4      2    1→2 2→2
//      5    3   8     4      15      4    1→4 2→3 3→4 4→4
//      7    4  10     5      56      8    1→6 2→8 3→4 4→10 5→8 6→8 7→4 8→8
//
//   · the maximum 2^{K−1} is attained ONLY by subsets pinning both endpoints;
//   · pinning both endpoints forces an EVEN count (degree 1 excepted, where the only subset
//     IS the two endpoints) — so the endpoint toggle in the editor is the switch between
//     always-multivalued and unique-valued editing;
//   · the count-1 grips are exactly "K consecutive from one end, plus one further point that
//     is not the far endpoint" — 2(K−1) of them, and they are the grips where dragging is
//     single-valued and needs no branch tracking.
//
// Cross-checked three ways: against the two counts phPlanarSeptic PROVES in closed form (the
// cascade's 1 and the split's 4), against an independent random-start sweep on all 56, and by
// the accounting itself. The tracker lives in core/planarPHSubset.ts; this file is its pin.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../complex'
import {
  controlPointsFrom, degreeOf, maximalSubsets, solveSubset, trackSolutions,
} from '../planarPHSubset'
import { absoluteRotationIndex } from '../phQuinticHermite'

const W4: Complex[] = [
  { re: 1, im: 0.2 }, { re: 0.4, im: 0.9 }, { re: -0.3, im: 0.7 }, { re: 0.8, im: -0.2 },
]
const ORIGIN: Complex = { re: 0, im: 0 }

interface Rung {
  degree: number; K: number; subsets: number; max: number
  hist: Record<number, number>; ends: Record<number, number>; ones: string[]; failed: number
}
function ladder(K: number): Rung {
  const degree = degreeOf(K)
  const cps = controlPointsFrom(K, W4.slice(0, K), ORIGIN)
  const hist: Record<number, number> = {}
  const ends: Record<number, number> = {}
  const ones: string[] = []
  let failed = 0
  const subs = maximalSubsets(K)
  for (const subset of subs) {
    const r = solveSubset(K, subset, subset.map((i) => cps[i]))
    failed += r.failed
    // THE ACCOUNTING IS THE CERTIFICATE: no path may be lost, or the count means nothing.
    expect(r.finitePaths + r.diverged + r.failed, `all 2^K paths accounted for on {${subset}}`)
      .toBe(r.paths)
    const n = r.solutions.length
    hist[n] = (hist[n] ?? 0) + 1
    if (subset.includes(0) && subset.includes(degree)) ends[n] = (ends[n] ?? 0) + 1
    if (n === 1) ones.push(`{${subset.join(',')}}`)
  }
  return { degree, K, subsets: subs.length, max: 2 ** (K - 1), hist, ends, ones, failed }
}
const fmt = (h: Record<number, number>): string =>
  Object.keys(h).map(Number).sort((a, b) => a - b).map((k) => `${k}→${h[k]}`).join(' ')

describe('planar PH: how many curves through a chosen set of control points', () => {
  const rungs = [1, 2, 3, 4].map(ladder)

  it('reproduces the two counts phPlanarSeptic proves in closed form', () => {
    const cps = controlPointsFrom(4, W4, ORIGIN)
    const cascade = solveSubset(4, [0, 1, 2, 3, 4], [0, 1, 2, 3, 4].map((i) => cps[i]))
    const split = solveSubset(4, [0, 1, 2, 6, 7], [0, 1, 2, 6, 7].map((i) => cps[i]))
    console.log(`    cascade {0,1,2,3,4}: ${cascade.solutions.length} curve` +
      ` (${cascade.finitePaths} finite paths, ${cascade.diverged} diverged);` +
      `  split {0,1,2,6,7}: ${split.solutions.length} curves` +
      ` (${split.finitePaths} finite, ${split.diverged} diverged)`)
    expect(cascade.solutions.length, 'the cascade is unique — one square root and three divisions').toBe(1)
    expect(split.solutions.length, 'the split branches twice').toBe(4)
    expect(cascade.finitePaths, 'and the ± gauge means one curve is TWO finite roots').toBe(2)
    expect(split.finitePaths).toBe(8)
  }, 300_000)

  it('the ladder: degree 1, 3, 5, 7 — every subset, every path accounted for', () => {
    const expected: Record<number, Record<number, number>> = {
      1: { 1: 1 },
      3: { 1: 2, 2: 2 },
      5: { 1: 4, 2: 3, 3: 4, 4: 4 },
      7: { 1: 6, 2: 8, 3: 4, 4: 10, 5: 8, 6: 8, 7: 4, 8: 8 },
    }
    for (const r of rungs) {
      console.log(`    degree ${r.degree}: dim ${2 * r.K + 2}, v_max ${r.K + 1}, ${r.subsets} subsets,` +
        ` max ${r.max}   ${fmt(r.hist)}`)
      expect(r.failed, 'no path may fail').toBe(0)
      expect(r.hist).toEqual(expected[r.degree])
      expect(Object.values(r.hist).reduce((a, b) => a + b, 0)).toBe(r.subsets)
      expect(Math.max(...Object.keys(r.hist).map(Number)), 'the maximum is 2^{K−1}').toBe(r.max)
    }
  }, 600_000)

  it('the maximum needs both endpoints, and pinning them forces an even count', () => {
    for (const r of rungs) {
      console.log(`    degree ${r.degree}: ends pinned   ${fmt(r.ends)}`)
      expect(r.ends[r.max], 'every maximal-count subset pins both ends').toBe(r.hist[r.max])
      if (r.degree > 1) {
        for (const k of Object.keys(r.ends).map(Number)) {
          expect(k % 2, `degree ${r.degree}: ends pinned gives an EVEN count, got ${k}`).toBe(0)
        }
      }
    }
    // degree 1 is the single exception: the only subset IS the two endpoints
    expect(rungs[0].ends).toEqual({ 1: 1 })
  }, 600_000)

  it('the unique-solution grips: K consecutive from an end, plus one that is not the far end', () => {
    for (const r of rungs) {
      console.log(`    degree ${r.degree}: ${r.ones.join(' ')}`)
      const predicted: string[] = []
      if (r.K === 1) predicted.push('{0,1}')
      else {
        for (let extra = r.K; extra < r.degree; extra++) {
          predicted.push(`{${[...Array(r.K).keys(), extra].join(',')}}`)
          const mirrored = [...Array(r.K).keys()].map((i) => r.degree - i).concat(r.degree - extra)
          predicted.push(`{${mirrored.sort((a, b) => a - b).join(',')}}`)
        }
      }
      expect([...r.ones].sort()).toEqual([...predicted].sort())
      if (r.K > 1) expect(r.ones.length, '2(K−1) of them').toBe(2 * (r.K - 1))
    }
  }, 600_000)

  it('the certificate is TIGHT: every path ends at its own root or at infinity', () => {
    // finitePaths === distinctRoots means no path was pulled back off a route to infinity.
    // It holds everywhere — but ONLY because the endgame is deep enough, which is the point of
    // the second half of this test.
    for (const K of [1, 2, 3, 4]) {
      const cps = controlPointsFrom(K, W4.slice(0, K), ORIGIN)
      for (const subset of maximalSubsets(K)) {
        const r = solveSubset(K, subset, subset.map((i) => cps[i]))
        expect(r.finitePaths, `no duplicate landings on K=${K} {${subset}}`).toBe(r.distinctRoots)
      }
    }
  }, 600_000)

  it('and a SHALLOW endgame breaks it — on count-1 grips, where the roots at infinity are most of them', () => {
    // Pinned because the depth looks like a free tuning parameter and is not. At 1−1e-9 the paths
    // heading to infinity are still small, the final Newton polish drags them onto a genuine root,
    // and the tracker reports finite solutions that do not exist. The COUNT survives (dedupe
    // absorbs it) — which is exactly why this had to be caught by the accounting and not the answer.
    const cps = controlPointsFrom(4, W4, ORIGIN)
    const subset = [2, 4, 5, 6, 7]                         // a count-1 grip: 14 of 16 roots at infinity
    const targets = subset.map((i) => cps[i])
    const shallow = solveSubset(4, subset, targets, { endgame: 1e-9 })
    const deep = solveSubset(4, subset, targets, { endgame: 1e-12 })
    console.log(`    shallow 1−1e-9: ${shallow.finitePaths} finite / ${shallow.diverged} diverged` +
      ` → ${shallow.distinctRoots} roots;   deep 1−1e-12: ${deep.finitePaths} finite /` +
      ` ${deep.diverged} diverged → ${deep.distinctRoots} roots`)
    expect(shallow.finitePaths, 'shallow: paths pulled back off their route to infinity')
      .toBeGreaterThan(shallow.distinctRoots)
    expect(deep.finitePaths, 'deep: every path ends where it belongs').toBe(deep.distinctRoots)
    expect(deep.finitePaths).toBe(2)
    expect(shallow.solutions.length, 'and the COUNT is right either way — dedupe hides the flaw')
      .toBe(deep.solutions.length)
  }, 300_000)

  it('the fairness selector is R = ∫|κ|ds — checked against the deck\'s own oracle', () => {
    // The selector must be the ABSOLUTE rotation index. Signed turning is a different number and a
    // worse one: an S-shaped branch turns one way then the other, so its signed total can be near
    // zero while it is visibly the least fair curve on screen. phQuinticHermite.absoluteRotationIndex
    // computes ∫|κ|·σ dt by Simpson from an entirely different formula, so it is an independent check.
    const K = 3
    const cps = controlPointsFrom(K, W4.slice(0, K), ORIGIN)
    const subset = [0, 1, 4, 5]
    const r = solveSubset(K, subset, subset.map((i) => cps[i]))
    expect(r.solutions.length).toBe(4)
    for (const s of r.solutions) {
      const oracle = absoluteRotationIndex({ w0: s.w[0], w1: s.w[1], w2: s.w[2] })
      const rel = Math.abs(s.rotationIndex - oracle) / Math.max(oracle, 1e-9)
      console.log(`    R ${s.rotationIndex.toFixed(4)}  oracle ${oracle.toFixed(4)}  rel ${rel.toExponential(1)}`)
      expect(s.rotationIndex, 'absolute, so never negative').toBeGreaterThanOrEqual(0)
      expect(rel, 'agrees with ∫|κ|·σ dt computed a different way').toBeLessThan(2e-3)
    }
    // and the branches come back fairest-first, which is what every default selection relies on
    const rs = r.solutions.map((s) => s.rotationIndex)
    expect(rs[0], 'solutions[0] is the fairest').toBe(Math.min(...rs))
    expect([...rs].sort((a, b) => a - b)).toEqual(rs)
  }, 300_000)

  it('the cusp CERTIFICATE is one-sided and never contradicts the sampled minimum', () => {
    // hullMargin > 0 is a proof: w(t) lies in the convex hull of its Bernstein coefficients, so an
    // origin outside that hull means w never vanishes on [0,1]. margin ≤ 0 proves NOTHING — it only
    // fails to rule a cusp out — which is why the figure does not mark cusps from it.
    for (const K of [2, 3, 4]) {
      const cps = controlPointsFrom(K, W4.slice(0, K), ORIGIN)
      let proven = 0, total = 0
      for (const subset of maximalSubsets(K)) {
        for (const s of solveSubset(K, subset, subset.map((i) => cps[i])).solutions) {
          total++
          if (s.hullMargin > 0) {
            proven++
            // a certificate must never be contradicted by the sampled evidence
            expect(s.minSpeed / s.arcLength, 'proven regular ⟹ the sampled speed is not near zero')
              .toBeGreaterThan(1e-4)
          }
        }
      }
      console.log(`    degree ${degreeOf(K)}: ${proven}/${total} branches PROVEN cusp-free`)
      expect(proven, 'the certificate is conservative, not vacuous').toBeGreaterThan(total / 2)
    }
  }, 300_000)

  it('tracking carries a branch without re-solving, and keeps its identity', () => {
    const K = 3
    const cps = controlPointsFrom(K, W4.slice(0, K), ORIGIN)
    const subset = [0, 1, 4, 5]                       // C¹ Hermite: four branches
    const targets = subset.map((i) => cps[i])
    const start = solveSubset(K, subset, targets)
    expect(start.solutions.length).toBe(4)

    // nudge one prescribed point and carry every branch from its own previous position
    const moved = targets.map((z, i) => (i === 2 ? { re: z.re + 0.05, im: z.im - 0.03 } : z))
    const carried = trackSolutions(K, subset, moved, start.solutions)
    expect(carried.every((s) => s !== null), 'every branch survives a small step').toBe(true)

    // each carried branch must be NEAR the one it came from, and they must stay distinct
    const jumps = carried.map((s, i) =>
      Math.max(...s!.w.map((z, k) => Math.hypot(z.re - start.solutions[i].w[k].re,
                                                z.im - start.solutions[i].w[k].im))))
    console.log(`    four branches carried; largest coefficient move ${Math.max(...jumps).toExponential(1)}`)
    expect(Math.max(...jumps), 'a small data step moves each branch a little').toBeLessThan(0.5)
    const full = solveSubset(K, subset, moved)
    expect(full.solutions.length, 'and the count is unchanged after the step').toBe(4)
  }, 300_000)
})
