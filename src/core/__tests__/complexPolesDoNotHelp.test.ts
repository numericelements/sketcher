// ============================================================================
// COMPLEX POLES DO NOT MOVE US OFF THE SINGULAR LOCUS — the second hypothesis, also dead.
//
// covariantIsSingularToo established that every member our machinery builds is a singular point of the
// degree-4 PH variety, in BOTH the p/w and the covariant formulations, with identical deficits. The
// hypothesis it left behind: our members all have poles at REAL parameters, while the generic points
// Newton finds have a complex conjugate pair, so perhaps the singular locus is the all-real-poles
// locus.
//
// THE CLEAN TEST is at degree 5, where the two constructions can be compared at the SAME (n, m) with
// nothing else changed. n = 3 with m = 2 gives deg p = 2n−m+1 = 5 and deg w = 2 either way — two real
// poles from rationalPHMultiPoleSpatial, or one conjugate pair from rationalPHComplexPoleSpatial. Same
// degrees, same fibre dimension (8 both times), only the reality of the roots differs.
//
//                              deg w    p/w rank (of 17)    covariant rank (of 30)
//     generic                    5           17  FULL            30  FULL
//     two REAL poles             2           15–16               27
//     one CONJUGATE PAIR         2           16                  27
//
// Identical. The conjugate pair is bounded on the whole real line — denominator floor 1.69, which is
// the thing complex poles were adopted for — and it is exactly as singular as the real one.
//
// SO IT IS NOT THE REALITY OF THE POLES, and it is not their number or the degree of w either: the
// (3,4) member measured in covariantIsSingularToo has deg w = 4, full for degree 4, and is still
// deficient by 6.
//
// WHAT SURVIVES BOTH HYPOTHESES is a plainer statement, and it is the one to carry forward:
//
//     every member the spinor construction builds is a singular point of the PH variety,
//     and every generic point Newton finds is a smooth one.
//
// Which says the image of 𝒜i𝒜*/w² — with real quaternion coefficients and our degree bookkeeping —
// lies inside the singular locus. Why that should be is not established here.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis as realBasis, phDefect as realPH, toMember as realMember, unpackSpinor as realUnpack,
} from '../rationalPHMultiPoleSpatial'
import {
  type ComplexPoleParams,
  cx, familyBasis as cxBasis, phDefect as cxPH, toMember as cxMember, unpackSpinor as cxUnpack,
} from '../rationalPHComplexPoleSpatial'
import {
  jacobian as jacobianPW, layoutFor, newtonToVariety, pack as packPW,
  rankOf as rankPW, residual as residualPW, unpack as unpackPW,
} from '../rationalPHVariety'
import {
  type Poly, type QPoly,
  orthonormalise, pMul, pSub, qpAdd, qpConj, qpDeriv, qpMul, qpNorm,
} from '../sp11RationalPH'
import type { Quat } from '../quaternion'

const DEGREE = 5
const L = layoutFor(DEGREE)
const DA = DEGREE, DC = DEGREE, DS = 2 * DEGREE - 1
const NA = 4 * (DA + 1), NC = 4 * (DC + 1)
const UNKNOWNS = NA + NC + DS + 1
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const pad = (a: readonly number[], n: number): number[] => Array.from({ length: n }, (_, i) => a[i] ?? 0)

/** Re(ĀC) = 0 and |Ñ|² − σ² = 0, at degree 5. Same system as covariantIsSingularToo, resized. */
function covariantResidual(x: readonly number[]): number[] {
  const A = [0, 1, 2, 3].map((k) => x.slice(k * (DA + 1), (k + 1) * (DA + 1))) as unknown as QPoly
  const C = [0, 1, 2, 3].map((k) => x.slice(NA + k * (DC + 1), NA + (k + 1) * (DC + 1))) as unknown as QPoly
  const s = x.slice(NA + NC)
  const wronskian = qpAdd(qpMul(qpConj(C), qpDeriv(A)), qpMul(qpConj(A), qpDeriv(C)))
  return [
    ...pad(qpMul(qpConj(A), C)[0], DA + DC + 1),
    ...pad(pSub(qpNorm(wronskian), pMul(s, s)), 2 * (DA + DC - 1) + 1),
  ]
}
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
const rankOf = (M: readonly number[][], tol = 1e-7): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

const liftCovariant = (p: number[][], w: number[], sigma: number[]): number[] => [
  ...[w as Poly, [0], [0], [0]].flatMap((a) => pad(a, DA + 1)),
  ...[[0], p[0] as Poly, p[1] as Poly, p[2] as Poly].flatMap((c) => pad(c, DC + 1)),
  ...pad(sigma, DS + 1),
]
const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-9 * s) top--
  return top
}
const mix = (basis: readonly number[][], size: number, phase: number): number[] => {
  const x = new Array<number>(size).fill(0)
  basis.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + phase)
    for (let j = 0; j < size; j++) x[j] += a * b[j]
  })
  return x
}

const realCase = (phase: number) => {
  const base: MultiPoleParams = { A: ZERO(4), roots: [1.7, -0.9], lambdas: [0.4, -0.3] }
  const B = realBasis(base)
  const prm = { ...base, A: realUnpack(mix(B, 16, phase)) }
  return { member: realMember(prm), fibre: B.length, ph: realPH(realMember(prm)) }
}
const complexCase = (phase: number) => {
  const base: ComplexPoleParams = { A: ZERO(4), pairs: [cx(0.6, 1.3)], lambdas: [cx(0.4, -0.3)] }
  const B = cxBasis(base)
  const prm = { ...base, A: cxUnpack(mix(B, 16, phase)) }
  return { member: cxMember(prm), fibre: B.length, ph: cxPH(cxMember(prm)) }
}
const ranksOf = (p: number[][], w: number[], sigma: number[]) => {
  const xp = packPW({ p, w, sigma }, L)
  const xc = liftCovariant(p, w, sigma)
  return { pw: rankPW(jacobianPW(xp, L)), cov: rankOf(covariantJacobian(xc, 1e-5)) }
}

describe('complex poles and the singular locus', () => {
  it('the two constructions really are at the same (n, m) and the same degrees', () => {
    for (const phase of [0.6, 2.2]) {
      const r = realCase(phase), c = complexCase(phase)
      expect(r.fibre).toBe(8)
      expect(c.fibre).toBe(8)
      expect(r.ph).toBeLessThan(1e-12)
      expect(c.ph).toBeLessThan(1e-12)
      expect(trim(r.member.w as number[])).toBe(2)
      expect(trim(c.member.w as number[])).toBe(2)
      expect(Math.max(...(r.member.p as number[][]).map(trim))).toBe(5)
      expect(Math.max(...(c.member.p as number[][]).map(trim))).toBe(5)
    }
    // and the conjugate pair delivers what complex poles are FOR: bounded on the whole real line
    expect(complexCase(0.6).member.denominatorFloor).toBeGreaterThan(1)
  })

  it('a GENERIC degree-5 PH curve is smooth in both systems — full rank, 17 and 30', () => {
    const m0 = realCase(0.6).member
    const base = packPW({ p: m0.p as number[][], w: m0.w as number[], sigma: m0.sigma as number[] }, L)
    const sc = Math.max(...base.map(Math.abs))
    const nP = 3 * (L.degP + 1)
    let found = 0
    for (let t = 0; t < 8; t++) {
      const y = base.slice()
      for (let i = 2; i <= L.degW; i++) y[nP + i] += 0.4 * sc * Math.sin(2.1 * t + 0.9 * i)
      for (let i = 0; i <= L.degSigma; i++) y[nP + L.degW + 1 + i] += 0.06 * sc * Math.cos(1.7 * t + 0.5 * i)
      const z = newtonToVariety(y, L)
      if (Math.max(...residualPW(z, L).map(Math.abs)) / Math.max(...z.map(Math.abs)) ** 4 > 1e-15) continue
      const u = unpackPW(z, L)
      expect(trim(u.w)).toBe(5)
      expect(rankPW(jacobianPW(z, L))).toBe(L.equations)                      // 17 of 17
      expect(rankOf(covariantJacobian(liftCovariant(u.p, u.w, u.sigma), 1e-5))).toBe(30)
      found++
    }
    expect(found).toBeGreaterThanOrEqual(3)
    expect(L.equations).toBe(17)
  })

  it('AND THE CONJUGATE PAIR IS EXACTLY AS SINGULAR AS THE REAL POLES — 27 of 30, both', () => {
    for (const phase of [0.6, 2.2]) {
      const r = realCase(phase).member
      const c = complexCase(phase).member
      const rr = ranksOf(r.p as number[][], r.w as number[], r.sigma as number[])
      const cc = ranksOf(c.p as number[][], c.w as number[], c.sigma as number[])
      expect(rr.cov).toBe(27)
      expect(cc.cov).toBe(27)
      expect(rr.pw).toBeLessThan(17)
      expect(cc.pw).toBeLessThan(17)
    }
  })
})
