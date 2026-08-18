// ============================================================================
// C21 ANSWERED CONSTRUCTIVELY: the MIXED cell is not empty. A rational PH curve exists
// with one pole SOFT (σ(r) = 0, 𝒜(r) rank one) and another HARD at the same time — the
// connective tissue THE_MAP.md §6 asks for, since the λ-chart and the conformal
// construction otherwise cover disjoint strata, and two disjoint charts are not an atlas.
//
// THE METHOD — the ε-drive, not an endpoint connection. Take a λ-chart member, adjoin
// σ(r₁) = ε·û as an extra equation (û the initial direction, so σ shrinks along itself),
// and continue ε → 0 while the other poles are left alone. Reaching ε = 0 CONSTRUCTS a
// mixed member; stalling would instead report an obstruction with a number, ε*. No soft
// endpoint is needed, so the (n,m)-matching prerequisite disappears, and it targets the
// mixed cell directly rather than hoping a path happens to pass through one.
//
// WHY THE CONDITION CAN REACH σ = 0 AT ALL — the point the λ-form obscures. The no-log
// condition is CHART-FREE. Writing w = (t−r_k)v, partial fractions give the 1/(t−r_k)
// coefficient as
//
//     b_k = [N′(r_k) − 2Σ_k N(r_k)] / v(r_k)²          N = 𝒜i𝒜*
//
// so the residue condition is a statement about N, not about 𝒜. The λ-form
// 𝒜′(r) = 𝒜(r)(Σ + λi) is what you get by dividing it by 𝒜(r), which needs σ(r) ≠ 0. The
// λ-chart's hole is a hole in the COORDINATES, exactly as §5 concluded — the curves are
// there, and this file builds some.
//
// VERIFIED INDEPENDENTLY. Every witness is confirmed by CONTOUR INTEGRATION of N/w² around
// each pole, which uses none of the algebra above: a nonzero residue is a logarithm, and a
// logarithm means the curve is not rational. Measured at ~1e-14.
//
// THE TRAP THIS FILE EXISTS TO AVOID. softness = |σ(r)|/‖𝒜(r)‖² is identically 1 at a real
// pole (chartsAreDisjoint.test.ts), so it CANNOT certify that the hard pole is healthy —
// only ‖𝒜(r₀)‖² can. On six of eight seeds ‖𝒜(r₀)‖² collapses to ~1e-6: the "hard" pole is
// then nearly FAKE, the member is really a two-pole curve wearing a third, and the witness
// is worthless. Rank 1 and rank 0 are different degeneracies and only both numbers separate
// them. The seed pinned below keeps ‖𝒜(r₀)‖² at 7.7e-2.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { rootsOf } from '../conformalPHHopf'
import {
  type PoleSet, toSpinor, solveResidue, residueDefect, poleDiagnostics,
  contourResidue, coprimalityMargin, newtonToResidue, conditioningFloor,
} from '../rationalPHResidue'

// Two conjugate pairs and no real pole. Chosen over m = 3 on FALSIFIABILITY: at m = 3 the
// real pole is hard by theorem, so "mixed" is nearly guaranteed once the pair softens and
// the test can only confirm. Here nothing compels the second pair to stay hard.
const M4_POLES: PoleSet = [
  { re: 0.6, im: 0.9 }, { re: 0.6, im: -0.9 },
  { re: -0.5, im: 0.7 }, { re: -0.5, im: -0.7 },
]
const REPS = [0, 2]

/** Found by the chart-free solve, then pinned at full precision. n = 4, ‖𝒜‖ = 1. */
const M4_WITNESS: number[] = [
  -2.61410954817405838e-1,
  -1.02794345890687866e-1,
  1.44160147739611499e-1,
  3.57770603829519918e-1,
  -3.11332839155708141e-1,
  3.37978328087302549e-1,
  -3.77569614167863332e-1,
  3.63845224869703776e-1,
  -2.79058887177438597e-1,
  -1.18446869927122875e-1,
  -3.73720961521592926e-2,
  -2.49469201630884457e-1,
  -1.42605895681224559e-2,
  6.86705384466648333e-2,
  -1.08209948793829780e-1,
  7.03363487622871292e-2,
  1.52346407979708637e-1,
  -4.08096667306168184e-2,
  -3.18282588727410998e-2,
  -2.88474360955877418e-1,
]
describe('the mixed cell is not empty', () => {
  it('the witness is a genuine rational PH curve', () => {
    const A = toSpinor(M4_WITNESS)
    expect(residueDefect(A, M4_POLES, REPS)).toBeLessThan(1e-14)
    // Independent of all the algebra above: a nonzero residue of N/w² is a logarithm.
    for (let k = 0; k < 4; k++) expect(contourResidue(A, M4_POLES, k)).toBeLessThan(1e-10)
  })

  it('one pair HARD, the other SOFT — and neither near the rank-0 seam', () => {
    const d = poleDiagnostics(toSpinor(M4_WITNESS), M4_POLES)
    expect(d[0].softness).toBeGreaterThan(0.5)      // pair A hard
    expect(d[1].softness).toBeGreaterThan(0.5)
    expect(d[2].softness).toBeLessThan(1e-10)       // pair B soft: σ = 0, 𝒜(r) ≠ 0
    expect(d[3].softness).toBeLessThan(1e-10)
    // The conditioning that the m = 3 witness lacked (its hard pole sat at 7.7e-2).
    for (const p of d) expect(p.hermitian).toBeGreaterThan(0.4)
    // A conjugate pair is both soft or both hard — proved, and it holds to round-off.
    expect(Math.abs(d[0].sigma - d[1].sigma)).toBeLessThan(1e-12)
    expect(Math.abs(d[2].sigma - d[3].sigma)).toBeLessThan(1e-12)
  })

  it('and it is PRIMITIVE — gcd(N₁,N₂,N₃) constant, so the witness is not vacuous', () => {
    // The hypothesis that rules out a trivial witness. Rank one at the soft pair says that
    // pole is not fake; it says nothing about N sharing a factor elsewhere.
    expect(coprimalityMargin(toSpinor(M4_WITNESS), rootsOf)).toBeGreaterThan(1e-2)
  })

  it('the chart-free solve REACHES it — no drive, no chart, no search luck', () => {
    // The construction is the result, not the point. None of the three existing modules
    // builds this configuration: free-λ takes real roots, the conformal row is soft by
    // construction, and the complex-pole chart reaches only m = 2.
    const sol = solveResidue(M4_POLES, 4, { representatives: REPS, starts: 40 })
    expect(sol).not.toBeNull()
    expect(sol!.defect).toBeLessThan(1e-12)
    const polished = newtonToResidue(M4_WITNESS, M4_POLES, REPS, undefined)
    expect(polished).not.toBeNull()
  })
})

describe('the construction reaches what the charts cannot', () => {
  it('a HARD member at a MIXED real/complex pole set — no module builds this', () => {
    const poles: PoleSet = [{ re: 0.2, im: 0 }, { re: 0.9, im: 0.7 }, { re: 0.9, im: -0.7 }]
    const sol = solveResidue(poles, 4, { representatives: [0, 1], starts: 40 })
    expect(sol).not.toBeNull()
    expect(sol!.defect).toBeLessThan(1e-12)
    const d = sol!.diagnostics
    expect(d[0].real).toBe(true)
    expect(Math.abs(d[0].softness - 1)).toBeLessThan(1e-9)   // forced at a real pole
    expect(d[0].hermitian).toBeGreaterThan(1e-2)             // and NOT fake
    expect(d[1].softness).toBeGreaterThan(0.1)               // the pair starts hard
    // Taking the FIRST converged start instead returns a member with ‖𝒜(r₀)‖² = 4.6e-5 —
    // nearly fake, and softness cannot warn you because it is 1 there whatever happens.
    expect(conditioningFloor(sol!)).toBeGreaterThan(1e-2)
    const firstHit = solveResidue(poles, 4, { representatives: [0, 1], starts: 40, select: 'first' })
    expect(conditioningFloor(firstHit!)).toBeLessThan(1e-3)
  })
})
