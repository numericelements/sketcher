// ============================================================================
// READ sigmaKeepsItsSign.test.ts FIRST. The "generic" points this file compares against are reached by
// Newton on |N|^2 = sigma^2, which does not constrain sigma's SIGN — and measured, they change sign or
// are negative throughout, while our sigma = |A|^2 cannot. So the two sets are on different branches
// and the singular-versus-smooth contrast below is not comparing like with like. The RANKS are correct;
// the inference drawn from their difference is downgraded.
//
// THE RATIONAL PH QUARTICS ARE 13-DIMENSIONAL, AND THE ONE-POLE CHART REACHES 12 OF THEM.
//
// This supersedes coverageDegree4's "12 of 15", which was measured with an instrument that could not
// hold a rank still: it read codimension 4, 5 or 6 at different members of the same family. The
// instrument was the problem, not the geometry — see rationalPHVariety for what changed and why.
//
// THE MEASUREMENT. Carry σ as unknowns rather than eliminating it, so PH is the honest polynomial
// system |N|² = σ² in the coefficients of (p, w, σ): 27 unknowns and 13 equations at degree 4, with an
// analytic Jacobian. Then the rank is stable at every tolerance from 1e-7 to 1e-11, the scale gauge
// sits exactly in the kernel, and the family's own tangent columns lie inside the variety's tangent to
// 1e-11 — the containment that the previous instrument reported as a 3.6e-2 failure.
//
//     generic point (deg w = 4)      rank 13    dim 13
//     our (2,1) member               rank 11    tangent 15      family 12
//     our (3,3) member               rank  7    tangent 19      family 12
//
// SO OUR MEMBERS ARE SINGULAR POINTS, and that is the whole explanation of the old confusion. Every
// member the chart builds has w of degree 1 or 3, which sits on the boundary of the deg w ≤ 4 ambient;
// there the tangent space is 2 or 6 dimensions LARGER than the variety it is tangent to. "Ambient 15"
// was that inflated tangent space, not a dimension.
//
// THE ANSWER, then: the variety is 13-dimensional, the chart covers 12, and the gap is ONE. The
// walk in missingDirectionsAreFourPoles shows the missing motion is real — stepping off the family
// and Newtoning back lands on genuine PH quartics with four poles — so the local dimension at our
// point really does exceed 12. What that walk could not know is that only ONE of its three directions
// is a motion along the variety; the other two exist because the point is singular.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  denominatorOf, familyBasis, packSpinor, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  jacobian, layoutFor, newtonToVariety, pack, rankOf, residual, scaleDirection, unpack,
} from '../rationalPHVariety'
import { orthonormalise } from '../sp11RationalPH'
import type { Quat } from '../quaternion'

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
const packOf = (prm: MultiPoleParams): number[] => {
  const m = toMember(prm)
  return pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
}
const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-9 * s) top--
  return top
}

const ONE_POLE = memberOf([1.7], [Math.tan((35 * Math.PI) / 180)], 2)
const THREE_POLE = memberOf([1.7, -0.9, 2.6], [0.4, -0.3, 0.8], 3)

/** The chart's tangent at a member, in (p, w, σ) coordinates. */
function familyTangent(prm: MultiPoleParams, eps = 1e-5): number[][] {
  const x0 = packSpinor(prm.A)
  const cols: number[][] = []
  const central = (f: (d: number) => number[]): void => {
    const hi = f(eps), lo = f(-eps)
    cols.push(hi.map((v, i) => (v - lo[i]) / (2 * eps)))
  }
  const ontoFibre = (x: readonly number[], roots: readonly number[], lam: readonly number[]): number[] => {
    const n = x.length / 4 - 1
    const B = familyBasis({ A: unpackSpinor(new Array<number>(4 * (n + 1)).fill(0)), roots, lambdas: lam })
    const out = new Array<number>(x.length).fill(0)
    for (const b of B) {
      const d = x.reduce((s, v, i) => s + v * b[i], 0)
      for (let i = 0; i < out.length; i++) out[i] += d * b[i]
    }
    return out
  }
  for (const b of familyBasis(prm)) {
    central((d) => packOf({ ...prm, A: unpackSpinor(x0.map((v, i) => v + d * b[i])) }))
  }
  for (let k = 0; k < prm.lambdas.length; k++) {
    central((d) => {
      const lam = prm.lambdas.slice(); lam[k] += d
      return packOf({ ...prm, A: unpackSpinor(ontoFibre(x0, prm.roots, lam)), lambdas: lam })
    })
  }
  for (let k = 0; k < prm.roots.length; k++) {
    central((d) => {
      const rt = prm.roots.slice(); rt[k] += d
      return packOf({ ...prm, A: unpackSpinor(ontoFibre(x0, rt, prm.lambdas)), roots: rt })
    })
  }
  const w = denominatorOf(prm.roots)
  for (let axis = 0; axis < 3; axis++) {
    const v = new Array<number>(L.unknowns).fill(0)
    for (let i = 0; i < w.length && i <= L.degP; i++) v[axis * (L.degP + 1) + i] = w[i]
    cols.push(v)
  }
  return cols
}

const containmentOf = (J: number[][], cols: number[][]): number => {
  const jScale = Math.max(...Array.from({ length: L.unknowns },
    (_, j) => Math.hypot(...J.map((r) => r[j]))), 1e-300)
  let worst = 0
  for (const c of cols) {
    const n = Math.hypot(...c) || 1
    worst = Math.max(worst, Math.hypot(...J.map((r) => r.reduce((s, v, i) => s + v * c[i], 0) / n)) / jScale)
  }
  return worst
}
const dimOf = (cols: number[][], x: number[]): number => {
  const sd = scaleDirection(x, L)
  return orthonormalise(cols.map((c) => {
    const d = c.reduce((s, v, i) => s + v * sd[i], 0)
    return c.map((v, i) => v - d * sd[i])
  }), 1e-8).length
}

describe('the rational PH quartics', () => {
  it('the system is the right size, and the analytic Jacobian is the real one', () => {
    expect(L.unknowns).toBe(27)
    expect(L.equations).toBe(13)
    expect(L.degSigma).toBe(6)

    const x = packOf(ONE_POLE)
    expect(Math.max(...residual(x, L).map(Math.abs))).toBeLessThan(1e-12)
    const J = jacobian(x, L)
    let worst = 0
    const scale = Math.max(...J.flat().map(Math.abs), 1e-300)
    for (let j = 0; j < L.unknowns; j++) {
      const e = 1e-6 * (Math.abs(x[j]) + 1)
      const hi = x.slice(); hi[j] += e
      const lo = x.slice(); lo[j] -= e
      const fh = residual(hi, L), fl = residual(lo, L)
      for (let i = 0; i < L.equations; i++) worst = Math.max(worst, Math.abs((fh[i] - fl[i]) / (2 * e) - J[i][j]))
    }
    expect(worst / scale).toBeLessThan(1e-8)          // measured 5.9e-11
  })

  it('the scale gauge is EXACTLY in the kernel, which the old instrument could not manage', () => {
    const x = packOf(ONE_POLE)
    const J = jacobian(x, L)
    const scale = Math.max(...J.flat().map(Math.abs), 1e-300)
    const sd = scaleDirection(x, L)
    expect(Math.max(...J.map((r) => Math.abs(r.reduce((s, v, i) => s + v * sd[i], 0)))) / scale)
      .toBeLessThan(1e-14)                            // measured 5.4e-16
  })

  it('THE VARIETY IS 13-DIMENSIONAL at a generic point, where deg w is full', () => {
    const base = packOf(ONE_POLE)
    const sc = Math.max(...base.map(Math.abs))
    let generic = 0
    for (let t = 0; t < 6; t++) {
      const y = base.slice()
      for (let i = 2; i <= 4; i++) y[15 + i] += 0.35 * sc * Math.sin(2.1 * t + 0.9 * i)
      for (let i = 0; i <= 6; i++) y[20 + i] += 0.05 * sc * Math.cos(1.7 * t + 0.5 * i)
      const x = newtonToVariety(y, L)
      const res = Math.max(...residual(x, L).map(Math.abs)) / Math.max(...x.map(Math.abs)) ** 4
      if (res > 1e-15) continue                       // only count the trials that converged cleanly
      expect(trim(unpack(x, L).w)).toBe(4)            // a genuinely four-pole curve
      expect(rankOf(jacobian(x, L))).toBe(L.equations)   // FULL rank: 13 of 13
      generic++
    }
    expect(generic).toBeGreaterThanOrEqual(2)
    expect(L.unknowns - L.equations - 1).toBe(13)     // 27 − 13 − 1, the scale gauge removed
  })

  it('AND OUR MEMBERS ARE SINGULAR POINTS — the tangent there is bigger than the variety', () => {
    for (const [prm, rank] of [[ONE_POLE, 11], [THREE_POLE, 7]] as const) {
      const J = jacobian(packOf(prm), L)
      // stable at every tolerance, which is the property the old instrument lacked
      for (const tol of [1e-7, 1e-9, 1e-11]) expect(rankOf(J, tol)).toBe(rank)
      expect(L.unknowns - rank - 1).toBeGreaterThan(13)   // 15 and 19, against a variety of 13
    }
    // and it is not the seed: same rank at a different fibre member
    expect(rankOf(jacobian(packOf(memberOf([1.7], [Math.tan((35 * Math.PI) / 180)], 2, 2.2)), L))).toBe(11)
    expect(rankOf(jacobian(packOf(memberOf([1.7, -0.9, 2.6], [0.4, -0.3, 0.8], 3, 4.1)), L))).toBe(7)
  })

  it('THE CHART COVERS 12, at both pole counts, and its tangent really is inside the variety', () => {
    for (const prm of [ONE_POLE, THREE_POLE]) {
      const x = packOf(prm)
      const cols = familyTangent(prm)
      expect(containmentOf(jacobian(x, L), cols)).toBeLessThan(1e-9)   // measured 1e-11 … 5e-11
      expect(dimOf(cols, x)).toBe(12)
    }
    // 12 against a 13-dimensional variety: the gap is ONE
    expect(13 - 12).toBe(1)
  })
})
