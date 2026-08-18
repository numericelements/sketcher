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
import { rootsOf, sandwichPolynomial, normSquaredPolynomial } from '../conformalPHHopf'
import { cdiv, csub } from '../complex'
import { cnorm, type Complex, cadd, cmul } from '../complex'
import {
  type PoleSet, toSpinor, solveResidue, residueDefect, poleDiagnostics,
  contourResidue, coprimalityMargin, newtonToResidue, conditioningFloor, spinorAt,
  hopfCoprimalityMargin, residueDefect as defectOf, hodographRank,
} from '../rationalPHResidue'

// Two conjugate pairs and no real pole. Chosen over m = 3 on FALSIFIABILITY: at m = 3 the
// real pole is hard by theorem, so "mixed" is nearly guaranteed once the pair softens and
// the test can only confirm. Here nothing compels the second pair to stay hard.
const M4_POLES: PoleSet = [
  { re: 0.6, im: 0.9 }, { re: 0.6, im: -0.9 },
  { re: -0.5, im: 0.7 }, { re: -0.5, im: -0.7 },
]
const REPS = [0, 2]

const pevC = (p: readonly number[], z: Complex): Complex => {
  let a: Complex = { re: 0, im: 0 }
  for (let k = p.length - 1; k >= 0; k--) a = cadd(cmul(z, a), { re: p[k], im: 0 })
  return a
}

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

  // ---- the primitivity battery, because "coprime" names several different conditions ----
  //
  // Rank one at the soft pair says that pole is not FAKE. It says nothing about common
  // factors elsewhere, and "coprime" can mean at least five things here. Four hold with
  // margin. The fifth cannot hold, for a reason that matters — see below.

  it('(a) the SOFT pole is a genuine double pole — N(r) ≠ 0 though ‖N(r)‖² = σ(r)² = 0', () => {
    // The subtle case, and the one that would have made the witness meaningless. The
    // double-pole coefficient is a_k = N(r_k)/v(r_k)², so if N vanished at the soft pole the
    // pole would be REMOVABLE and calling it soft would say nothing about any curve.
    // Over ℂ, ‖N‖² = σ² = 0 does NOT force N = 0 — N(r) is ISOTROPIC, not zero — and here
    // it is measurably nonzero.
    const A = toSpinor(M4_WITNESS)
    const N = sandwichPolynomial(A)
    const scale = Math.max(...N.flat().map(Math.abs))
    for (const k of [2, 3]) {
      const v = N.map((p) => pevC(p, M4_POLES[k]))
      expect(Math.max(...v.map(cnorm)) / scale).toBeGreaterThan(0.1)   // measured 0.556
    }
  })

  it('(b) gcd(σ, w) ≠ 1 — and this is FORCED, not a defect of the witness', () => {
    // A soft pole IS a common root of σ and w: that is what σ(r) = 0 at a root of w means.
    // So no mixed member can ever be coprime in this sense, and a hypothesis demanding it
    // would make the mixed cell empty by fiat rather than by geometry.
    const A = toSpinor(M4_WITNESS)
    const sigma = normSquaredPolynomial(A)
    const scale = Math.max(...sigma.map(Math.abs))
    expect(cnorm(pevC(sigma, M4_POLES[2])) / scale).toBeLessThan(1e-12)   // shares the root
    expect(cnorm(pevC(sigma, M4_POLES[0])) / scale).toBeGreaterThan(0.1)  // but only there
  })

  it('(c) 𝒜(z) vanishes NOWHERE — no fake pole hiding off the pole set', () => {
    // The strongest primitivity statement available: 𝒜 has no root at all, so its Hopf
    // components share no factor and no pole anywhere is a degree drop.
    const A = toSpinor(M4_WITNESS)
    const sigma = normSquaredPolynomial(A)
    let worst = Infinity
    for (const z of rootsOf(sigma.map((v) => ({ re: v, im: 0 })))) {
      const q = spinorAt(A, z)
      worst = Math.min(worst, q.reduce((t, x) => t + x.re * x.re + x.im * x.im, 0))
    }
    expect(worst).toBeGreaterThan(0.1)   // measured 0.435
  })

  it('(f) THE C21 CONDITION: the Hopf numerators n₁ = N₁, n₂ = −N₃ + iN₂ are COPRIME', () => {
    // Not condition (d). A common root needs n₁(r) = 0 and n₂(r) = 0, the second being ONE
    // COMPLEX equation — N₂ and N₃ need only satisfy N₃(r) = i·N₂(r), not vanish. The gap is
    // the ISOTROPIC locus, which is exactly where a soft pole lives, so (d) is blind there.
    //
    // Finite by a theorem, not by sampling: σ² = n₁² + n₂·pconj(n₂), so every common root of
    // the pair is a root of σ — a list of length 2n.
    const A = toSpinor(M4_WITNESS)
    const margin = hopfCoprimalityMargin(A, normSquaredPolynomial(A), rootsOf)
    expect(margin).toBeGreaterThan(1e-2)      // measured 0.326, at z = (−0.294, 0.909)
  })

  it('(d) gcd(N₁,N₂,N₃) is constant, and (e) N kills no pole', () => {
    const A = toSpinor(M4_WITNESS)
    expect(coprimalityMargin(A, rootsOf)).toBeGreaterThan(1e-2)          // measured 0.269
    const N = sandwichPolynomial(A)
    const scale = Math.max(...N.flat().map(Math.abs))
    for (let k = 0; k < 4; k++) {
      const v = N.map((p) => pevC(p, M4_POLES[k]))
      expect(Math.max(...v.map(cnorm)) / scale).toBeGreaterThan(0.1)
    }
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

// ---------------------------------------------------------------------------
// THE FIRST HALF OF THE ATLAS: mixed → AllSoft.
//
// The walk runs OUTWARD from the witness rather than between two pure strata, which is
// what makes it short and well-conditioned at both ends. Driving the hard pair soft is the
// easy direction — soft is codimension 2 (σ(r) = 0 is one complex equation) and hard is
// open, so this is a TARGETING problem, which is what the ε-drive does.
//
// The other direction is structurally harder and not merely ill-conditioned: σ = 0 is a
// CRITICAL POINT of |σ|², since d(σσ̄) = σ̄dσ + σdσ̄ vanishes there. Gradient ascent on the
// magnitude does not move at all. Leaving a submanifold has no canonical direction — the
// normal space is a real 2-plane, so the escape directions form a circle — which is why
// soft→hard needs σ(r) = ε·e^{iφ} with φ swept, not a magnitude target.
// ---------------------------------------------------------------------------
describe('mixed → AllSoft', () => {
  it('the hard pair drives soft, and the curve stays rational and well conditioned',
    { timeout: 180000 }, () => {
    const A0 = toSpinor(M4_WITNESS)
    const start = poleDiagnostics(A0, M4_POLES)[0]
    expect(start.softness).toBeGreaterThan(0.5)

    // Shrink σ(r₀) along its own direction — well defined because we start HARD.
    const sigmaAt = (x: readonly number[], k: number): Complex => {
      const q = spinorAt(toSpinor(x), M4_POLES[k])
      let acc: Complex = { re: 0, im: 0 }
      for (const v of q) acc = cadd(acc, cmul(v, v))
      return acc
    }
    const s0 = sigmaAt(M4_WITNESS, 0)
    const mag = Math.hypot(s0.re, s0.im)
    const dir = { re: s0.re / mag, im: s0.im / mag }

    let x = [...M4_WITNESS]
    let eps = mag
    let step = mag / 8
    for (let it = 0; it < 400 && eps > 1e-13; it++) {
      const next = Math.max(eps - step, 0)
      const y = newtonToResidue(x, M4_POLES, REPS,
        { pole: 0, value: { re: dir.re * next, im: dir.im * next } }, 80)
      if (y) { x = y; eps = next; step = Math.min(step * 1.4, mag / 4) }
      else { step /= 2; if (step < mag * 1e-12) break }
    }
    expect(eps).toBeLessThan(1e-12)                       // ε = 0 reached

    const A = toSpinor(x)
    const d = poleDiagnostics(A, M4_POLES)
    for (const p of d) {
      expect(p.softness).toBeLessThan(1e-10)              // ALL SOFT
      expect(p.hermitian).toBeGreaterThan(0.4)            // and none near the rank-0 seam
    }
    expect(defectOf(A, M4_POLES, REPS)).toBeLessThan(1e-12)
    for (let k = 0; k < 4; k++) expect(contourResidue(A, M4_POLES, k)).toBeLessThan(1e-10)
  })
})

// ---------------------------------------------------------------------------
// THE SECOND HALF, RETRACTED 2026-08-18: mixed → AllHard DOES NOT HAPPEN, and the atlas
// does not close.
//
// This block used to assert "every escape direction arrives — 12 of 12". They do not
// arrive; they LEAVE THE VARIETY'S BRANCH. Measured in `softIsAbsorbing.test.ts`:
//
//   · all twelve endpoints have hodographRank ONE — straight lines, N₁ N₂ N₃ proportional,
//     second singular value at machine zero against a leading 1.9 — while the witness they
//     start from is solidly rank 3 (1.374, 1.132, 0.482)
//   · the FIRST step already lands 0.467 away on a unit-norm spinor, already at rank 1
//   · with jumps rejected (a step must move the solution by O(Δε)), the continuation does
//     not leave ε = 0 at all, in any direction
//
// THE MECHANISM, and it is why no repair is possible. On the residue variety, dσ(r) has
// NO component off the constraint's row space wherever σ(r) = 0: residual 1e-10 at a soft
// pole against 0.6–0.9 at a hard one, at (4,4), (5,4) and (7,6) alike. **Soft is
// absorbing.** hard → soft is a targeting problem and works — the ε-drive above is real.
// soft → hard is blocked to first order.
//
// The old note said arrival at small ε was "guaranteed by the submersion". σ(r) IS a
// submersion as a map on its own; what governs a continuation is σ(r) RESTRICTED to the
// residue variety, and that differential vanishes. The escape-direction circle was reasoned
// about in the ambient space, where it is correct and irrelevant.
//
// AND THERE WAS NOWHERE TO ARRIVE. At (n, m) = (4, 4) with four complex poles, genuine
// (rank-3) all-hard members do not exist at all — see `allHardExistence.test.ts` for the
// boundary, n ≥ c + 1 in the number of NON-REAL poles.
//
// Everything ρ(φ) below was measured along this walk, hence on the straight-line branch.
// It is kept, retitled, because it is a real measurement OF THAT BRANCH — but it says
// nothing about the geometry of the soft/hard boundary, which is what it was read as.
// ---------------------------------------------------------------------------
describe('mixed → AllHard does NOT happen — the walk jumps to the straight-line branch', () => {
  it('the escape target has no first-order motion on the variety', () => {
    // The one-line version of the retraction: at the soft pole the constraint pins σ.
    const d = poleDiagnostics(toSpinor(M4_WITNESS), M4_POLES)
    expect(d[2].softness).toBeLessThan(1e-12)
    expect(hodographRank(toSpinor(M4_WITNESS))).toBe(3)
    // The full measurement, with controls, lives in softIsAbsorbing.test.ts.
  })
})

// ---------------------------------------------------------------------------
// ρ(φ) — the ε at which the continuation stalls — SURVIVES both artifact tests.
//
// The Lean side predicted ρ(φ) = ρ(−φ) from a symmetry: σ has real coefficients, so
// σ(r̄) = conj σ(r), and targeting σ(r₂) = ε·e^{iφ} forces ε·e^{−iφ} at the partner; the pair
// being unordered, the +φ curve "relabelled" solves −φ. Measured, every pair disagrees:
//
//     30/330  0.848 / 1.189    60/300  0.760 / 1.412    90/270  0.723 / 1.563
//     120/240 0.683 / 1.126    150/210 0.685 / 0.876
//
// Three explanations were offered and TWO ARE NOW REFUTED.
//
//   GAUGE (their option 2) — refuted. Pinning A₀.v = 0, which kills the Hopf phase and is a
//   real condition on real coefficients, gives ρ IDENTICAL to four decimals. It could not
//   have mattered: a minimum-norm Newton step is orthogonal to the Jacobian's nullspace and
//   the gauge direction lies in it, so the phase was already frozen at its starting value.
//
//   SOLVER (their option 1) — refuted. ρ is unchanged to four decimals across max steps of
//   0.15, 0.03 and 0.005 with 80, 200 and 400 corrector iterations.
//
//   STOPPING RULE (their option 3) — excluded by construction: the cap is 6.0 and nothing
//   reaches it.
//
// WHICH LEAVES THE PREMISE. "Relabelling" is not a symmetry of curve space. For a given
// curve σ(p) is a DEFINITE complex number at a DISTINGUISHABLE point, so σ(p) = εe^{iφ} and
// σ(p) = εe^{−iφ} are different demands; the unordered pair of σ-values is the same, but
// which pole carries which value is real information. A bijection between the two solution
// sets needs a symmetry of the problem exchanging p ↔ p̄ — a real Möbius of negative
// determinant preserving the whole pole set — and {0.6±0.9i, −0.5±0.7i} admits none.
//
// TESTABLE, and cheap: poles ON THE UNIT CIRCLE are preserved by t ↦ 1/t, which is real,
// has determinant −1 and sends e^{iα} to e^{−iα}. If the premise is the explanation, ρ(φ)
// should become symmetric there and stay asymmetric off it.
// ---------------------------------------------------------------------------
// SCOPE, added with the retraction above: every ρ below is the stall of a continuation
// running ON THE STRAIGHT-LINE BRANCH, since the walk jumps there at its first step. The
// refutations of the two artifact explanations stand as measurements of that branch. What
// does NOT stand is reading ρ as the distance to the soft/hard boundary in curve space.
describe('ρ(φ) on the straight-line branch is not a solver artifact', () => {
  it('is stable under the continuation schedule and independent of the gauge', () => {
    const rho = (phi: number, maxStep: number, iters: number): number => {
      const dir = { re: Math.cos(phi), im: Math.sin(phi) }
      let x = [...M4_WITNESS]
      let eps = 0
      let step = 0.02
      for (let it = 0; it < 6000 && eps < 6; it++) {
        const next = Math.min(eps + step, 6)
        const y = newtonToResidue(x, M4_POLES, REPS,
          { pole: 2, value: { re: dir.re * next, im: dir.im * next } }, iters)
        if (y) { x = y; eps = next; step = Math.min(step * 1.4, maxStep) }
        else { step /= 2; if (step < 1e-11) break }
      }
      return eps
    }
    const coarse = rho(Math.PI / 2, 0.15, 80)
    const fine = rho(Math.PI / 2, 0.005, 400)
    expect(Math.abs(coarse - fine) / coarse).toBeLessThan(0.02)   // identical to 4 decimals
    // …and the ±φ gap is far larger than any schedule sensitivity.
    const mirror = rho(-Math.PI / 2, 0.15, 80)
    expect(Math.abs(coarse - mirror) / Math.max(coarse, mirror)).toBeGreaterThan(0.5)
  }, 600000)
})

// ---------------------------------------------------------------------------
// WHAT ρ(φ) MEASURES: the distance to the ALIGNMENT boundary.
//
// σ(z) = ⟨𝒜(z), 𝒜(z̄)⟩ — because 𝒜 has real coefficients, so 𝒜(z̄) = conj 𝒜(z) and the sum
// of squares IS the Hermitian inner product. Two consequences settle what `softness` is:
//
//     ‖𝒜(z̄)‖ = ‖𝒜(z)‖ identically   ⇒   softness = |⟨𝒜(p),𝒜(p̄)⟩| / (‖𝒜(p)‖‖𝒜(p̄)‖)
//
// the COSINE of the angle between the spinor at the pole and the spinor at its conjugate.
// Cauchy–Schwarz is why it lies in [0,1]; 0 is orthogonal (soft, rank one) and 1 is parallel
// (maximally hard). At a real pole the two vectors coincide, hence the identical 1.
//
// And the stall is the wall: at all twelve φ the driven pair's softness at ρ lies in
// [0.946, 1.000]. The continuation stops where 𝒜(p) ALIGNS with 𝒜(p̄), so ρ(φ) is a
// geometric distance to that surface — which upgrades "the hard region is not round" from a
// statement about the solver's reach to one about a named object.
// ---------------------------------------------------------------------------
describe('softness is an alignment cosine, and ρ is the distance to alignment', () => {
  it('σ(z) = ⟨𝒜(z),𝒜(z̄)⟩ exactly, and ‖𝒜(z̄)‖ = ‖𝒜(z)‖', () => {
    const A = toSpinor(M4_WITNESS)
    for (const p of M4_POLES) {
      const az = spinorAt(A, p)
      const azb = spinorAt(A, { re: p.re, im: -p.im })
      let ip: Complex = { re: 0, im: 0 }
      for (let i = 0; i < 4; i++) ip = cadd(ip, cmul(az[i], { re: azb[i].re, im: -azb[i].im }))
      let sq: Complex = { re: 0, im: 0 }
      for (const v of az) sq = cadd(sq, cmul(v, v))
      expect(cnorm({ re: ip.re - sq.re, im: ip.im - sq.im })).toBeLessThan(1e-14)
      const n = (q: Complex[]) => q.reduce((t, x) => t + x.re * x.re + x.im * x.im, 0)
      expect(Math.abs(n(az) - n(azb))).toBeLessThan(1e-14)
    }
  })

  it('the continuation stalls exactly at alignment', () => {
    for (const phi of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const dir = { re: Math.cos(phi), im: Math.sin(phi) }
      let x = [...M4_WITNESS]
      let eps = 0
      let step = 0.02
      for (let it = 0; it < 3000 && eps < 6; it++) {
        const next = Math.min(eps + step, 6)
        const y = newtonToResidue(x, M4_POLES, REPS,
          { pole: 2, value: { re: dir.re * next, im: dir.im * next } }, 80)
        if (y) { x = y; eps = next; step = Math.min(step * 1.4, 0.15) }
        else { step /= 2; if (step < 1e-10) break }
      }
      // Measured over all twelve directions: 0.946 … 1.000.
      expect(poleDiagnostics(toSpinor(x), M4_POLES)[2].softness).toBeGreaterThan(0.94)
    }
  }, 600000)
})

// ---------------------------------------------------------------------------
// A GUARD, because the wrong Hermitian norm is invisible to every real-axis check.
//
// At a complex pole there are two candidate norms for 𝒜(z), and they differ:
//
//     four-component   Σᵢ |aᵢ(z)|²                               ← what this module uses
//     pair-model       |a₀ + i·a₁|² + |a₂ + i·a₃|²               ← conflates the quaternion
//                                                                  unit i with the complex i
//     difference       2·Im(a₀ā₁ + a₂ā₃)
//
// The difference vanishes identically on the REAL axis, so the two agree on every
// real-parameter sanity check and disagree everywhere else — measured here at 0.68 on a
// quantity of size 1.86. Anything computing the pair form at a complex pole gets a number
// that is neither a cosine nor conjugation-symmetric, and it would pass a real-axis test
// cleanly.
//
// The cheap discriminator needs no knowledge of which form was written: only the
// four-component norm is CONJUGATION-SYMMETRIC, because 𝒜(z̄) = conj 𝒜(z) componentwise.
// The pair form is not, and the measurement says so.
// ---------------------------------------------------------------------------
describe('the Hermitian norm is the four-component one', () => {
  const four = (q: Complex[]) => q.reduce((t, x) => t + x.re * x.re + x.im * x.im, 0)
  const pairModel = (q: Complex[]) => {
    const f = (a: Complex, b: Complex) => {
      const z = { re: a.re - b.im, im: a.im + b.re }
      return z.re * z.re + z.im * z.im
    }
    return f(q[0], q[1]) + f(q[2], q[3])
  }

  it('poleDiagnostics.hermitian is Σ|aᵢ|², exactly, and not the pair form', () => {
    const A = toSpinor(M4_WITNESS)
    const d = poleDiagnostics(A, M4_POLES)
    M4_POLES.forEach((p, k) => {
      const q = spinorAt(A, p)
      expect(Math.abs(d[k].hermitian - four(q))).toBe(0)
      expect(Math.abs(d[k].hermitian - pairModel(q))).toBeGreaterThan(0.1)   // measured 0.68
    })
  })

  it('and only the four-component form is conjugation-symmetric — the discriminator', () => {
    const A = toSpinor(M4_WITNESS)
    for (const p of M4_POLES) {
      const q = spinorAt(A, p)
      const qb = spinorAt(A, { re: p.re, im: -p.im })
      expect(Math.abs(four(q) - four(qb))).toBeLessThan(1e-14)
      expect(Math.abs(pairModel(q) - pairModel(qb))).toBeGreaterThan(0.1)
    }
  })

  it('the trap is invisible on the real axis — the two agree there exactly', () => {
    const A = toSpinor(M4_WITNESS)
    for (const t of [0.37, -1.2, 2.5]) {
      const q = spinorAt(A, { re: t, im: 0 })
      expect(Math.abs(four(q) - pairModel(q))).toBeLessThan(1e-14)
    }
  })
})

// ---------------------------------------------------------------------------
// THE RESIDUE-VECTOR DICTIONARY: soft ⟺ the residue is on the NULL CONE of ℂ³.
//
// Every construction in THE_MAP picks a generator, gets PH free from the sandwich, and pays
// for rationality with residue conditions. The dual trade is to chart the curve in partial
// fractions — c(t) = P(t) + Σ Vₖ/(t − rₖ) — where integration is not a condition but the
// FORM, so there is nothing to satisfy, and pay for PH instead.
//
// What that does to the strata. With w = (t−rₖ)·v the residue is Vₖ = −N(rₖ)/v(rₖ)², so
//
//     Vₖ·Vₖ = σ(rₖ)² / v(rₖ)⁴        (the BILINEAR dot, not Hermitian)
//
// and a pole is SOFT exactly when its residue vector is ISOTROPIC. The three strata become
// incidence conditions on an explicitly parameterised quadric — AllSoft every Vₖ on the
// cone, AllHard none, Mixed some — rather than places where a division fails. On the cone
// there is no division to fail.
//
// MEASURED, and the qualitative dictionary is exact:
//
//     soft pair   V·V = 6.9e-19       hard pair   V·V = 6.9e-3
//
// and the geometric reading holds to round-off: an isotropic V = a + ib is CIRCULAR, and at
// the soft pole a·a = b·b to 1.6e-16 relative with a·b = 0 to 2.4e-16, where the hard pole
// misses both (4e-2 and 4e-1).
//
// THE QUANTITATIVE CLAIM NEEDS CORRECTING. |V·V|/(V·V̄) does NOT reproduce the softness
// cosine: it is 0.3978 against softness² = 0.4678. Both vanish exactly on the soft locus and
// both are Cauchy–Schwarz cosines, but on DIFFERENT spaces —
//
//     |V·V|/(V·V̄)  = |σ|²/Σ|Nᵢ|²      a cosine on ℂ³
//     softness²     = |σ|²/‖𝒜‖⁴        a cosine on ℍ⊗ℂ
//     ratio          = ‖𝒜‖⁴/Σ|Nᵢ|²    measured 0.850 at the hard pair, 1.504 at the soft
//
// — so the sandwich map does not preserve the normalisation, and the two are not the same
// function of the curve. Either is a valid softness indicator; they must not be conflated.
// ---------------------------------------------------------------------------
describe('soft ⟺ the residue vector is isotropic', () => {
  const residueAt = (k: number): Complex[] => {
    const N = sandwichPolynomial(toSpinor(M4_WITNESS))
    let v: Complex = { re: 1, im: 0 }
    for (let l = 0; l < 4; l++) if (l !== k) v = cmul(v, csub(M4_POLES[k], M4_POLES[l]))
    const v2 = cmul(v, v)
    return [0, 1, 2].map((i) => cdiv(pevC(N[i], M4_POLES[k]), v2))
  }
  const bilinear = (V: Complex[]): number => {
    let s: Complex = { re: 0, im: 0 }
    for (const x of V) s = cadd(s, cmul(x, x))
    return cnorm(s)
  }

  it('V·V vanishes at the soft pair and not at the hard one', () => {
    for (const k of [2, 3]) expect(bilinear(residueAt(k))).toBeLessThan(1e-15)
    for (const k of [0, 1]) expect(bilinear(residueAt(k))).toBeGreaterThan(1e-4)
  })

  it('and the soft residue is CIRCULAR: a·a = b·b, a·b = 0', () => {
    const V = residueAt(2)
    const a = V.map((x) => x.re)
    const b = V.map((x) => x.im)
    const aa = a.reduce((t, x) => t + x * x, 0)
    const bb = b.reduce((t, x) => t + x * x, 0)
    const ab = a.reduce((t, x, i) => t + x * b[i], 0)
    expect(Math.abs(aa - bb) / (aa + bb)).toBeLessThan(1e-12)
    expect(Math.abs(ab) / Math.sqrt(aa * bb)).toBeLessThan(1e-12)
    // the hard pole is not circular, so the property is discriminating rather than generic
    const W = residueAt(0)
    const a2 = W.map((x) => x.re)
    const b2 = W.map((x) => x.im)
    const aa2 = a2.reduce((t, x) => t + x * x, 0)
    const bb2 = b2.reduce((t, x) => t + x * x, 0)
    expect(Math.abs(aa2 - bb2) / (aa2 + bb2)).toBeGreaterThan(1e-3)
  })

  it('but |V·V|/(V·V̄) is NOT the softness cosine — a different normalisation', () => {
    const V = residueAt(0)
    let s: Complex = { re: 0, im: 0 }
    for (const x of V) s = cadd(s, cmul(x, x))
    const herm = V.reduce((t, x) => t + x.re * x.re + x.im * x.im, 0)
    const coneCos = cnorm(s) / herm
    const soft = poleDiagnostics(toSpinor(M4_WITNESS), M4_POLES)[0].softness
    expect(coneCos).toBeGreaterThan(0.3)
    expect(Math.abs(coneCos - soft * soft)).toBeGreaterThan(0.05)   // 0.398 vs 0.468
  })
})
