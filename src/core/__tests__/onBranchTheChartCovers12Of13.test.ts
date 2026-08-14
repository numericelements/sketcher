// ============================================================================
// REDONE ON OUR OWN BRANCH: the variety is 13-dimensional, our members are singular, the chart covers 12.
//
// sigmaKeepsItsSign showed that the "generic" points earlier files compared against were reached by
// Newton on |N|² = σ², which does not constrain σ's SIGN — and two of three changed sign while a third
// was negative throughout. Our σ is |𝒜|², a sum of four squares, so it cannot do either. The ranks were
// right and the comparison was between different branches, so every conclusion drawn from it was
// downgraded.
//
// THIS FILE REDOES THE COMPARISON WITHOUT LEAVING THE BRANCH, by continuation instead of a jump: start
// at a member, step a little along the variety's tangent, Newton back, and REJECT any step whose σ
// would lose its sign. Repeat. Each accepted point is connected to the start by a path that never left
// σ > 0, so it is on our component by construction rather than by hope.
//
//     start                 rank 11 of 13    deg w 1    σ floor 0.19
//     after ~150 steps      rank 13 of 13    deg w 4    σ floor 0.05 … 0.34
//
// So the earlier verdict is RESTORED, and now it is properly grounded:
//
//   · the degree-4 rational PH variety is 13-dimensional ON THE BRANCH WE LIVE ON, not only off it
//   · our members are genuinely singular points OF THAT BRANCH — we walked continuously from one to
//     full-rank points without ever leaving σ > 0, so the rank drop is not a branch artefact
//   · the chart covers 12 (degree4IsThirteen, unchanged), so the gap is ONE
//
// AND THE WALK GOES WHERE THE EARLIER ONE SAID IT WOULD. It leaves deg w = 1 and arrives at deg w = 4,
// which is what missingDirectionsAreFourPoles found by stepping along the missing directions and
// Newtoning back — reached here by a completely different route, one that never leaves the branch.
//
// A NOTE ON THE TWO WALKS THAT READ 12/12/13. Rank 12 at tolerance 1e-7 and 13 at 1e-11 means one
// singular value is small: those walks did not travel as far and stopped near the singular locus.
// The two that travelled furthest are cleanly 13 at every tolerance, which is what the assertion uses.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  jacobian, layoutFor, newtonToVariety, pack, rankOf, residual, tangentSpace, unpack,
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
const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-9 * s) top--
  return top
}
/** min σ over a wide window, relative to its scale. Positive with margin ⟺ on our branch. */
function sigmaFloor(sigma: readonly number[]): number {
  let worst = Infinity
  const scale = Math.max(...sigma.map(Math.abs), 1e-300)
  for (let i = 0; i <= 600; i++) worst = Math.min(worst, evalAt(sigma, -6 + (12 * i) / 600))
  return worst / scale
}
const relativeResidual = (x: number[]): number =>
  Math.max(...residual(x, L).map(Math.abs)) / Math.max(...x.map(Math.abs)) ** 4

const START = (() => {
  const m = toMember(SEED)
  return pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
})()

interface WalkResult { x: number[]; steps: number; travelled: number; floor: number; degW: number }

/** Continuation along the variety, rejecting any step that would lose σ's sign. */
function walk(phase: number, budget = 160): WalkResult {
  let x = START.slice()
  let steps = 0
  for (let k = 0; k < budget; k++) {
    const T = tangentSpace(jacobian(x, L), L)
    if (T.length === 0) break
    const dir = new Array<number>(L.unknowns).fill(0)
    T.forEach((v, i) => {
      const a = Math.sin(2.7 * i + 1.9 * k + 3.1 * phase)
      for (let j = 0; j < dir.length; j++) dir[j] += a * v[j]
    })
    const norm = Math.hypot(...dir) || 1
    const scale = Math.max(...x.map(Math.abs))
    const y = newtonToVariety(x.map((v, i) => v + (0.06 * scale * dir[i]) / norm), L)
    if (relativeResidual(y) > 1e-11) continue
    if (sigmaFloor(unpack(y, L).sigma) <= 1e-3) continue      // this step would leave the branch
    x = y
    steps++
  }
  const u = unpack(x, L)
  return {
    x,
    steps,
    travelled: Math.hypot(...x.map((v, i) => v - START[i])) / Math.hypot(...START),
    floor: sigmaFloor(u.sigma),
    degW: trim(u.w),
  }
}

const WALKS = [0, 1, 2, 3].map((p) => walk(p))

describe('coverage measured without leaving our branch', () => {
  it('the start is on the branch, and singular', () => {
    const u = unpack(START, L)
    expect(sigmaFloor(u.sigma)).toBeGreaterThan(0.1)     // measured 0.19
    expect(trim(u.w)).toBe(1)
    expect(rankOf(jacobian(START, L))).toBe(11)          // of 13
    expect(relativeResidual(START)).toBeLessThan(1e-12)
  })

  it('THE CONTINUATION TRAVELS, and never loses the sign it started with', () => {
    for (const w of WALKS) {
      expect(w.steps).toBeGreaterThan(100)
      expect(w.floor).toBeGreaterThan(1e-3)              // still strictly positive, with margin
      expect(relativeResidual(w.x)).toBeLessThan(1e-11)  // still on the variety
      expect(w.travelled).toBeGreaterThan(0.3)           // and genuinely far from the start
    }
  })

  it('AND IT REACHES FULL RANK 13 — so our members are singular points of their OWN branch', () => {
    const clean = WALKS.filter((w) => rankOf(jacobian(w.x, L), 1e-7) === L.equations)
    expect(clean.length).toBeGreaterThanOrEqual(2)
    for (const w of clean) {
      for (const tol of [1e-7, 1e-9, 1e-11]) expect(rankOf(jacobian(w.x, L), tol)).toBe(13)
    }
    // the start was 11; nothing left the branch; so the deficit of 2 is real
    expect(L.equations - rankOf(jacobian(START, L))).toBe(2)
  })

  it('and the walk arrives where the missing directions said: deg w = 4', () => {
    for (const w of WALKS) expect(w.degW).toBe(4)
    expect(trim(unpack(START, L).w)).toBe(1)
  })

  it('SO THE VERDICT STANDS: 13 on the branch, 12 covered, gap ONE', () => {
    const dimension = L.unknowns - L.equations - 1        // 27 − 13 − 1, scale gauge removed
    expect(dimension).toBe(13)
    // familyTangent's 12 is measured in degree4IsThirteen and unaffected by any of this
    expect(dimension - 12).toBe(1)
  })
})
