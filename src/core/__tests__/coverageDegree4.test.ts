// ============================================================================
// SUPERSEDED by degree4IsThirteen.test.ts. Kept because the METHOD is right and the walk built on it
// still stands; the numbers are not. The instrument here differentiates a normalised formal square
// root, and its rank moves with the seed. Read this file for the shape of the question and that one
// for the answer: the variety is 13-dimensional, the chart covers 12, and the "ambient 15" below is
// an inflated tangent space at a singular point rather than a dimension.
//
// HOW MUCH OF THE RATIONAL PH QUARTICS DOES THE ONE-POLE CHART REACH? — measured, not counted.
//
// THE METHOD. At a member of the chart, compare two tangent spaces: that of ALL parametrised rational
// PH curves of degree 4, and that of what the chart reaches from there. T_family ⊆ T_ambient always,
// so the difference in dimension is the number of directions the chart cannot move in — and the
// directions themselves come out as vectors, which is the part worth having.
//
// PARAMETRISED CURVES, by decision. PH is a property of the parametrisation, not of the point set
// (Kalkan et al. §2: the parabola is not PH and a rational reparametrisation of it is), so
// reparametrisation is a genuine motion here and is counted. The only gauge divided out is the
// projective scale (p,w) ↦ (cp,cw), which really is one curve.
//
// THE HEADLINE, at a one-pole member — and read the PROVISIONAL note at the bottom before quoting it:
//
//     ambient 15     family 12     GAP 3     codimension 4
//
// and all three missing directions are dominated by the DENOMINATOR — motions of w, i.e. of the pole
// structure, which is exactly the one thing the chart holds fixed up to a single real parameter.
//
// THE COUNTING ANSWER WOULD HAVE BEEN WRONG IN BOTH COLUMNS. It says 20 coefficients − 1 scale − 6
// conditions = 13 ambient, against 11 for the chart, gap 2. The measured codimension is 4, not 6: two
// of the six conditions vanish to first order here, robustly — rank 4 at every finite-difference step
// from 1e-6 to 1e-3 and at every tolerance from 1e-5 to 1e-9 once the step is small enough to
// resolve them. And the family is 12, not 11, because translations are three real motions and the
// count above quietly dropped one somewhere. This is why the file measures.
//
// WHAT IT DOES NOT SHOW. Full rank would prove coverage of an OPEN NEIGHBOURHOOD, never of the whole
// variety. Degree 4 has a second component — deg c = 2n − m + 1 = 4 forces m odd, so m = 1 (n = 2)
// and m = 3 (n = 3) — and a tangent test says nothing about the component it is not standing on.
//
// AND THE WHOLE THING IS SEED-DEPENDENT, WHICH MAKES IT PROVISIONAL. The numbers above hold at the
// seed below and do not hold everywhere. Sweeping the seed phase and the λ's:
//
//     (2,1)   codim 4 4 4        ambient 15 15 16       family 12
//     (3,3)   codim 6 6 5 5 5    ambient 14 14 15 15 15 family 12 or 9
//
// A codimension that reads 5 at one seed and 6 at another is not a measurement, and the three-pole
// containment still fails at 1.6e-2 to 1.6e-1 after the metric was corrected. The cause is the
// instrument: phEquations divides by q(t₀) and works in a shifted basis, so its finite-difference
// Jacobian carries the scale of both, and the rank is being decided by a tolerance rather than by the
// geometry. The fix is to write the condition as EXACT polynomial equations — introduce σ as unknowns
// and use |N|² − σ² = 0, thirteen equations in twenty-seven unknowns with an analytic Jacobian.
//
// Until that exists, treat every number in this file as "measured at this seed", not as the
// dimension of anything.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  coverageAt, describeDirection, jacobianOf, packCurve, phEquations,
} from '../rationalPHCoverage'
import { hodographNumerator, squareRootDefect } from '../rationalCurveBlend'
import { orthonormalise } from '../sp11RationalPH'
import type { Quat } from '../quaternion'

const DEG_P = 4
const DEG_W = 4
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

const memberOf = (roots: number[], lambdas: number[], n: number, phase = 0.6): MultiPoleParams => {
  const base: MultiPoleParams = { A: ZERO(n + 1), roots, lambdas }
  const B = familyBasis(base)
  const x = new Array<number>(4 * (n + 1)).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + phase)
    for (let j = 0; j < x.length; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
}

const ONE_POLE = memberOf([1.7], [Math.tan((35 * Math.PI) / 180)], 2)
const THREE_POLE = memberOf([1.7, -0.9, 2.6], [0.4, -0.3, 0.8], 3)
const coeffs = (prm: MultiPoleParams): number[] => {
  const m = toMember(prm)
  return packCurve({ p: m.p as number[][], w: m.w as number[] }, DEG_P, DEG_W)
}

describe('coverage of the rational PH quartics', () => {
  it('both members are PH quartics, of the only two pole counts degree 4 admits', () => {
    const trim = (a: readonly number[]): number => {
      const s = Math.max(...a.map(Math.abs), 1e-300)
      let top = a.length - 1
      while (top > 0 && Math.abs(a[top]) < 1e-11 * s) top--
      return top
    }
    for (const [prm, m] of [[ONE_POLE, 1], [THREE_POLE, 3]] as const) {
      const mem = toMember(prm)
      expect(prm.roots.length).toBe(m)
      expect(phDefect(mem)).toBeLessThan(1e-12)
      expect(Math.max(...mem.p.map(trim), trim(mem.w))).toBe(4)   // deg c = 2n − m + 1 = 4
      expect(trim(mem.w)).toBe(m)
    }
  })

  it('THE EQUATIONS ARE THE PH CONDITION: zero on a member, nonzero one step off it', () => {
    const x = coeffs(ONE_POLE)
    expect(Math.max(...phEquations(x, DEG_P, DEG_W, 0.5).map(Math.abs))).toBeLessThan(1e-12)

    const off = x.slice()
    off[2] += 0.05
    expect(Math.max(...phEquations(off, DEG_P, DEG_W, 0.5).map(Math.abs))).toBeGreaterThan(1e-5)
    // and an independent measure agrees about which of the two is PH
    const c = { p: [off.slice(0, 5), off.slice(5, 10), off.slice(10, 15)], w: off.slice(15, 20) }
    const q = hodographNumerator(c).reduce<number[]>((acc, n) => {
      const out = acc.slice()
      for (let i = 0; i < n.length; i++) for (let j = 0; j < n.length; j++) out[i + j] = (out[i + j] ?? 0) + n[i] * n[j]
      return out
    }, [0])
    expect(squareRootDefect(q)).toBeGreaterThan(1e-6)
  })

  it('THE CODIMENSION IS 4, NOT THE 6 THE CONDITIONS SUGGEST — and it is step-stable', () => {
    const x = coeffs(ONE_POLE)
    for (const step of [1e-6, 1e-5]) {
      const J = jacobianOf((y) => phEquations(y, DEG_P, DEG_W, 0.5), x, step)
      for (const tol of [1e-5, 1e-7, 1e-9]) expect(orthonormalise(J, tol).length).toBe(4)
    }
    // there ARE six equations; two of them just vanish to first order here
    expect(phEquations(x, DEG_P, DEG_W, 0.5).length).toBe(6)
    // and it is not special to this seed or this pole
    for (const [phase, pole] of [[2.2, 1.7], [4.1, 1.7], [0.6, 1.2], [0.6, 2.5]] as const) {
      const J = jacobianOf(
        (y) => phEquations(y, DEG_P, DEG_W, 0.5), coeffs(memberOf([pole], [0.7], 2, phase)), 1e-5,
      )
      expect(orthonormalise(J, 1e-7).length).toBe(4)
    }
  })

  it('AT THIS SEED the one-pole chart reaches 12 of 15, and the 3 it misses are the denominator', () => {
    const r = coverageAt(ONE_POLE, DEG_P, DEG_W)
    expect(r.residual).toBeLessThan(1e-10)        // standing on the variety
    expect(r.containment).toBeLessThan(1e-8)      // and the family's tangent really is inside it

    expect(r.codimension).toBe(4)
    expect(r.ambient).toBe(15)
    expect(r.family).toBe(12)
    expect(r.gap).toBe(3)
    expect(r.missing.length).toBe(r.gap)          // coherent: as many directions as the gap claims

    // the family's 12 is the editor's own handle count: 8 fibre − 1 gauge + dial + pole + 3 shifts
    expect(familyBasis(ONE_POLE).length - 1 + 1 + 1 + 3).toBe(12)

    // every missing direction moves w — the pole structure, which is what the chart holds
    const den = r.missing.map((v) => describeDirection(v, DEG_P).denominator)
    expect(Math.min(...den)).toBeGreaterThan(0.5)   // measured 0.53, 0.98, 0.99
  })

  it('THE THREE-POLE COMPONENT IS STILL NOT MEASURABLE, and the check says so rather than guessing', () => {
    const r = coverageAt(THREE_POLE, DEG_P, DEG_W)
    expect(r.residual).toBeLessThan(1e-10)          // the member is fine; the TANGENT assembly is not
    expect(r.containment).toBeGreaterThan(1e-3)     // measured 3.0e-2 after the metric was corrected
    // and the symptom of that is the incoherence the containment check exists to catch
    expect(r.missing.length).toBeGreaterThan(r.gap)
  })

  it('AND THE ONE-POLE NUMBERS ARE SEED-DEPENDENT, so they are provisional', () => {
    // Same family, same pole, same twist — only the fibre member differs. The ambient dimension
    // should not care, and it does. Recorded rather than hidden: a rank decided by a tolerance is
    // not a measurement, and this is the file's own warning label.
    const seen = new Set<number>()
    for (const phase of [0.6, 2.2, 4.1]) {
      const r = coverageAt(memberOf([1.7], [Math.tan((35 * Math.PI) / 180)], 2, phase), DEG_P, DEG_W)
      expect(r.containment).toBeLessThan(1e-8)      // these columns ARE in the tangent, 2e-10
      expect(r.codimension).toBe(4)                 // this part is stable
      expect(r.family).toBe(12)                     // and so is this
      seen.add(r.ambient)                           // this is not: 15, 15, 16
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})
