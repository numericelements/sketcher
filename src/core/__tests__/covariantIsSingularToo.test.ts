// ============================================================================
// RESOLVED — onBranchTheChartCovers12Of13.test.ts confirms by on-branch continuation that our members
// really are singular points of their own component, so the contrast drawn here holds after all.
//
// READ sigmaKeepsItsSign.test.ts FIRST — the "generic" baseline used here is on a different branch of
// the variety (its sigma changes sign; ours cannot). What survives unshaken is the EQUALITY of the two
// deficits, which is a comparison of our members against themselves in two formulations and does not
// depend on the baseline at all.
//
// THE SINGULARITY IS NOT A COORDINATE ARTEFACT — the covariant form has exactly the same one.
//
// THE HYPOTHESIS THIS FILE KILLS. degree4IsThirteen measures every member our machinery builds as a
// SINGULAR point of the degree-4 PH variety in (p, w, σ) coordinates: rank 11 at (2,1) and 7 at (3,3)
// and (3,4), against 13 at a generic point. The natural reading — and the one I proposed — was that
// this is the p/w gauge's fault. Everything awkward in that picture is: the σ = 0 stratum exists
// because a real denominator was chosen (F18), the absorbing theorem follows from it, and the whole
// Sp(1,1) line was adopted to stop paying for that choice. So the covariant condition, where Möbius
// acts linearly and no denominator is privileged, ought to see a smooth space.
//
// IT DOES NOT. Writing the same question covariantly — unknowns (A, C, σ) with
//
//     Re(ĀC) = 0                  the column is a curve of POINTS
//     |Ñ|² = σ² ,  Ñ = C̄A′ + ĀC′   the PH condition, = −det(Ĥ′) with Ĥ = UU†
//
// gives 48 unknowns and 24 equations, and the rank deficits come out the same, member for member:
//
//                         p/w rank        covariant rank      deficit
//     generic             13 of 13         23 of 24            —
//     (2,1)               11               21                  2   in both
//     (3,3)                7               17                  6   in both
//     (3,4)                7               17                  6   in both
//
// Two and six, in both formulations. A coordinate artefact does not survive a change of coordinates
// that thorough, so whatever makes these curves special is a property of the CURVES.
//
// AND A HYPOTHESIS TO REPLACE IT, visible in the same run and not yet tested. Every member our
// machinery builds has poles at REAL parameters, because `roots: number[]` is what the construction
// takes. The generic points found by Newton have four poles too — but two real and one complex
// conjugate pair. Same pole count, different reality, opposite verdict. That the singular locus is
// the all-real-poles locus is the obvious next thing to check, and this file does not check it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { solveWithFreeLambda } from '../rationalPHFreeLambda'
import {
  type Poly, type QPoly,
  orthonormalise, pMul, pSub, qpAdd, qpConj, qpDeriv, qpMul, qpNorm,
} from '../sp11RationalPH'
import {
  jacobian as jacobianPW, layoutFor, newtonToVariety, pack as packPW,
  rankOf as rankPW, residual as residualPW, unpack as unpackPW,
} from '../rationalPHVariety'
import type { Quat } from '../quaternion'

const DA = 4, DC = 4, DS = 7
const NA = 4 * (DA + 1), NC = 4 * (DC + 1)
const UNKNOWNS = NA + NC + DS + 1
const pad = (a: readonly number[], n: number): number[] => Array.from({ length: n }, (_, i) => a[i] ?? 0)

const packColumn = (A: QPoly, C: QPoly, s: Poly): number[] =>
  [...A.flatMap((a) => pad(a, DA + 1)), ...C.flatMap((c) => pad(c, DC + 1)), ...pad(s, DS + 1)]

/** Re(ĀC) = 0 (9 coefficients) and |Ñ|² − σ² = 0 (15). Zero exactly on the covariant variety. */
function covariantResidual(x: readonly number[]): number[] {
  const A = [0, 1, 2, 3].map((k) => x.slice(k * (DA + 1), (k + 1) * (DA + 1))) as unknown as QPoly
  const C = [0, 1, 2, 3].map((k) => x.slice(NA + k * (DC + 1), NA + (k + 1) * (DC + 1))) as unknown as QPoly
  const s = x.slice(NA + NC)
  const nullPart = qpMul(qpConj(A), C)[0]
  const wronskian = qpAdd(qpMul(qpConj(C), qpDeriv(A)), qpMul(qpConj(A), qpDeriv(C)))
  return [...pad(nullPart, 9), ...pad(pSub(qpNorm(wronskian), pMul(s, s)), 15)]
}

/** Central differences. The map is quartic, so this is checked for step-stability below. */
function covariantJacobian(x: readonly number[], step: number): number[][] {
  const m = covariantResidual(x).length
  const J = Array.from({ length: m }, () => new Array<number>(UNKNOWNS).fill(0))
  for (let j = 0; j < UNKNOWNS; j++) {
    const e = step * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = covariantResidual(hi), fl = covariantResidual(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}
/**
 * TOLERANCE 1e-7 HERE, NOT 1e-9, and the reason is recorded rather than tuned away. The covariant
 * residual is QUARTIC in (A, C) — |Ñ|² with Ñ bilinear — so central differences are not exact for it
 * the way they are for the quadratic spinor map, and one singular value at the (3,4) member sits near
 * the noise: at step 1e-6 and tolerance 1e-9 the rank reads 18 instead of 17. At 1e-7 every member is
 * stable across steps 1e-4, 1e-5 and 1e-6, which is the stability this file asserts. Writing the
 * analytic Jacobian would settle it outright, as it did for the (p,w,σ) system.
 */
const rankOf = (M: readonly number[][], tol = 1e-7): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

const L = layoutFor(4)
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
/** A = w (real), C = (0, p): the real-denominator gauge, lifted into the column. */
const liftFrom = (p: number[][], w: number[], sigma: number[]): number[] =>
  packColumn([w as Poly, [0], [0], [0]], [[0], p[0] as Poly, p[1] as Poly, p[2] as Poly], sigma as Poly)
const liftMember = (prm: MultiPoleParams): number[] => {
  const m = toMember(prm)
  return liftFrom(m.p as number[][], m.w as number[], m.sigma as number[])
}

const ONE_POLE = memberOf([1.7], [Math.tan((35 * Math.PI) / 180)], 2)
const THREE_POLE = memberOf([1.7, -0.9, 2.6], [0.4, -0.3, 0.8], 3)
const FOUR_POLE = solveWithFreeLambda([1.7, -0.9, 2.6, -3.1], 3)!.params

/** Generic degree-4 PH curves, found in (p,w,σ) and lifted. */
function genericLifts(): { pw: number[]; covariant: number[] }[] {
  const m = toMember(ONE_POLE)
  const base = packPW({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
  const sc = Math.max(...base.map(Math.abs))
  const out: { pw: number[]; covariant: number[] }[] = []
  for (let t = 0; t < 6; t++) {
    const y = base.slice()
    for (let i = 2; i <= 4; i++) y[15 + i] += 0.35 * sc * Math.sin(2.1 * t + 0.9 * i)
    for (let i = 0; i <= 6; i++) y[20 + i] += 0.05 * sc * Math.cos(1.7 * t + 0.5 * i)
    const z = newtonToVariety(y, L)
    if (Math.max(...residualPW(z, L).map(Math.abs)) / Math.max(...z.map(Math.abs)) ** 4 > 1e-15) continue
    const u = unpackPW(z, L)
    out.push({ pw: z, covariant: liftFrom(u.p, u.w, u.sigma) })
  }
  return out
}

describe('the covariant form has the same singularity', () => {
  it('the lifts are genuinely on the covariant variety', () => {
    for (const prm of [ONE_POLE, THREE_POLE, FOUR_POLE]) {
      const x = liftMember(prm)
      const scale = Math.max(...x.map(Math.abs)) ** 4
      expect(Math.max(...covariantResidual(x).map(Math.abs)) / scale).toBeLessThan(1e-14)
    }
    expect(UNKNOWNS).toBe(48)
    expect(covariantResidual(new Array<number>(UNKNOWNS).fill(0)).length).toBe(24)
  })

  it('and the covariant ranks are step-stable, so they are measurements', () => {
    for (const prm of [ONE_POLE, THREE_POLE, FOUR_POLE]) {
      const x = liftMember(prm)
      const ranks = [1e-4, 1e-5, 1e-6].map((h) => rankOf(covariantJacobian(x, h)))
      expect(new Set(ranks).size).toBe(1)
      // and the wobble the tolerance is chosen to avoid is real, not imagined
      if (prm === FOUR_POLE) {
        expect(rankOf(covariantJacobian(x, 1e-6), 1e-9)).toBe(18)
        expect(rankOf(covariantJacobian(x, 1e-4), 1e-9)).toBe(17)
      }
    }
  })

  it('THE DEFICITS ARE IDENTICAL IN BOTH FORMULATIONS — 2 and 6', () => {
    const generics = genericLifts()
    expect(generics.length).toBeGreaterThanOrEqual(2)
    for (const g of generics) {
      expect(rankPW(jacobianPW(g.pw, L))).toBe(13)        // full, of 13
      expect(rankOf(covariantJacobian(g.covariant, 1e-5))).toBe(23)
    }

    const cases: [MultiPoleParams, number, number][] = [
      [ONE_POLE, 11, 21],
      [THREE_POLE, 7, 17],
      [FOUR_POLE, 7, 17],
    ]
    for (const [prm, pwRank, covRank] of cases) {
      const m = toMember(prm)
      const pw = packPW({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
      expect(rankPW(jacobianPW(pw, L))).toBe(pwRank)
      expect(rankOf(covariantJacobian(liftMember(prm), 1e-5))).toBe(covRank)
      // the deficit against generic is the SAME number in both
      expect(13 - pwRank).toBe(23 - covRank)
    }
  })

  it('so the singularity is a property of the CURVES, not of the gauge', () => {
    // Stated as an assertion so it cannot quietly rot: if a future change makes the covariant
    // deficits differ from the p/w ones, this is the test that should go red first.
    const deficit = (prm: MultiPoleParams): [number, number] => {
      const m = toMember(prm)
      const pw = packPW({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
      return [13 - rankPW(jacobianPW(pw, L)), 23 - rankOf(covariantJacobian(liftMember(prm), 1e-5))]
    }
    for (const prm of [ONE_POLE, THREE_POLE, FOUR_POLE]) {
      const [a, b] = deficit(prm)
      expect(a).toBe(b)
      expect(a).toBeGreaterThan(0)
    }
  })
})
