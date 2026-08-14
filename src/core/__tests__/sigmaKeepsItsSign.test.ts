// ============================================================================
// THE "GENERIC" POINTS WERE ON A DIFFERENT BRANCH — so the smooth-versus-singular comparison was not
// comparing like with like.
//
// ANSWERED — onBranchTheChartCovers12Of13.test.ts does the comparison by continuation that never
// leaves σ > 0, and gets the same verdict the off-branch baseline had suggested. The objection this
// file raises was correct and the conclusion it downgraded turned out to survive it.
//
// TWO FILES BUILT ON A COMPARISON that this one shows was mis-posed. degree4IsThirteen and
// covariantIsSingularToo both contrast members of our construction (rank-deficient) against "generic"
// points reached by Newton on |N|² = σ² (full rank), and conclude that the spinor construction lands
// inside the singular locus. The conclusion may still be true. The evidence for it is not, because the
// two sets are not on the same branch of the variety.
//
// WHAT SEPARATES THEM. Our σ is |𝒜|², a SUM OF FOUR SQUARES, so it is ≥ 0 everywhere and can never
// change sign. Newton only enforces σ² = |N|², which is satisfied by σ = +|N| and by σ = −|N| and by
// anything that switches between them at a root of N. Measured over t ∈ [−4,4] at 401 samples:
//
//     our member          401 positive,   0 negative
//     Newton point 4      344 positive,  57 negative      changes sign
//     Newton point 5        2 positive, 399 negative      the other branch entirely
//     Newton point 7      194 positive, 207 negative      changes sign
//
// So the points being called "generic" are not generic members of the set our chart parametrises —
// two of the three are not even on the branch it lives on. A rank measured there says nothing about
// whether our members are special within their own component.
//
// AND THE HOPF FIT, which is what prompted looking. A Levenberg–Marquardt fit of 𝒜i𝒜* to N now passes
// its control — our own N, which is a Hopf square of spinor degree 2 by construction, fits to 2.0e-16
// and fails at degree 1 (3.8e-1), so the fitter works this time. It fails on the Newton points at
// O(1). That is consistent with them being on the wrong branch and is NOT evidence that a generic PH
// hodograph fails to be a Hopf square — the dimension count says it should not fail: the Hopf image is
// 16 − 1 = 15-dimensional and the set {|N|² = σ²} in (N, σ) is 28 − 13 = 15 as well.
//
// WHAT WOULD FIX THE COMPARISON: reach generic points ON our branch, by adding σ > 0 to the Newton
// target or by starting from a member and staying in its component. Not done here.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  jacobian, layoutFor, newtonToVariety, pack, rankOf, residual, unpack,
} from '../rationalPHVariety'
import type { Quat } from '../quaternion'

const L = layoutFor(4)
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO(3), roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

const evalAt = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)
/** Sign census of σ over a wide window — the property a sum of four squares cannot fail. */
function signCensus(sigma: readonly number[]): { positive: number; negative: number } {
  let positive = 0, negative = 0
  for (let i = 0; i <= 400; i++) {
    const v = evalAt(sigma, -4 + (8 * i) / 400)
    if (v < 0) negative++
    else positive++
  }
  return { positive, negative }
}

/** The points the two earlier files called "generic". */
function newtonPoints(): { x: number[]; sigma: number[] }[] {
  const m = toMember(SEED)
  const base = pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
  const sc = Math.max(...base.map(Math.abs))
  const out: { x: number[]; sigma: number[] }[] = []
  for (let t = 0; t < 8; t++) {
    const y = base.slice()
    for (let i = 2; i <= 4; i++) y[15 + i] += 0.35 * sc * Math.sin(2.1 * t + 0.9 * i)
    for (let i = 0; i <= 6; i++) y[20 + i] += 0.05 * sc * Math.cos(1.7 * t + 0.5 * i)
    const z = newtonToVariety(y, L)
    if (Math.max(...residual(z, L).map(Math.abs)) / Math.max(...z.map(Math.abs)) ** 4 > 1e-15) continue
    out.push({ x: z, sigma: unpack(z, L).sigma })
  }
  return out
}

describe('sigma and which branch a point is on', () => {
  it('OUR σ CANNOT CHANGE SIGN — it is a sum of four squares', () => {
    const m = toMember(SEED)
    const census = signCensus(m.sigma as number[])
    expect(census.negative).toBe(0)
    expect(census.positive).toBe(401)
    // and it is not merely nonneg by luck: it is bounded away from zero on the window
    let worst = Infinity
    for (let i = 0; i <= 400; i++) worst = Math.min(worst, evalAt(m.sigma as number[], -4 + (8 * i) / 400))
    expect(worst).toBeGreaterThan(0)
  })

  it('THE NEWTON POINTS DO NOT KEEP THEIR SIGN, so they are on other branches', () => {
    const points = newtonPoints()
    expect(points.length).toBeGreaterThanOrEqual(3)
    const offBranch = points.filter((p) => {
      const c = signCensus(p.sigma)
      return c.negative > 0
    })
    // every one of them: two change sign, one is negative throughout
    expect(offBranch.length).toBe(points.length)
  })

  it('and they really are on the variety and full rank — the measurement was right, the COMPARISON was not', () => {
    for (const p of newtonPoints()) {
      expect(Math.max(...residual(p.x, L).map(Math.abs)) / Math.max(...p.x.map(Math.abs)) ** 4)
        .toBeLessThan(1e-15)
      expect(rankOf(jacobian(p.x, L))).toBe(L.equations)
    }
  })

  it('SO THE EARLIER CONCLUSION IS DOWNGRADED, and this test is where that is recorded', () => {
    // "the spinor construction lands inside the singular locus" was inferred by comparing rank at our
    // members against rank at these points. Same variety, different components. The inference needs
    // generic points ON our branch, which nothing here produces.
    const ours = signCensus(toMember(SEED).sigma as number[])
    const theirs = newtonPoints().map((p) => signCensus(p.sigma))
    expect(ours.negative).toBe(0)
    expect(Math.max(...theirs.map((c) => c.negative))).toBeGreaterThan(0)
  })
})
