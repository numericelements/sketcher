// ============================================================================
// HOW BIG IS ALL-SOFT, HOW BIG IS ALL-HARD, AND WHY THE POLYNOMIAL IS NOT A PLACE TO EDIT FROM.
//
// THE QUESTION, Eric's: "from an engineer's point of view more general is better — so is all-soft
// more general?" It is, but by how much depends entirely on which yardstick, and the two answers
// differ by a factor of seven.
//
//   AT THE SAME CONFORMAL DEGREE            all-soft 17   vs   lifted polynomial cubics 10
//   AT THE SAME CURVE DEGREE                all-soft 17   vs   λ-chart all-hard        16
//
// The first comparison is the one that makes all-soft look enormous, and it is an artefact of
// degree bookkeeping: a hard curve of degree d lives at conformal degree 2d, so inside conformal 6
// the only hard objects are lifts of degree-THREE curves. At equal CURVE degree the gap is one
// dimension — 2d+5 against 2d+4, and 2d+4 is independent of the pole count m, since each extra
// pole costs four spinor conditions and returns a λ and a pole position.
//
// EVERY DIMENSION HERE IS COUNTED THE SAME WAY: take the tangent space, push it through the map
// "state ↦ the curve sampled at 25 parameters", and take the rank. That quotients every gauge
// automatically — the projective scale, the Hopf circle — instead of subtracting them by hand.
//
// AND THE POLYNOMIAL IS A FOLD, WHICH IS WHY IT IS NOT AN EDITING SEAT. The defining Jacobian
// drops to rank 21 of 24 at a lifted polynomial against 23 of 24 generic (already pinned in
// conformalPHStructure). What this file adds is the CONSEQUENCE: the production drag, which
// converges to 1e-13 in a handful of Newton steps from a generic member, does not reach its own
// threshold at all from the polynomial — measured defect 1e-9…1e-6 on a 5%-of-chord step, with the
// point still tracking the cursor to 1e-15. The bound is not blocking; the membership is slipping.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinElevate } from '../bernstein'
import { conformalLiftBezier, type Conformal } from '../conformal'
import {
  type ConformalPHCurve, controlPoints, curveAt, definingJacobian, dragControlPoint, findMember,
  normalize, unknownCount,
} from '../conformalPHCurve'
import { controlPoints as phControlPoints, squareWeights, type SpatialPHCurve } from '../phSpatialFreeDragN'
import {
  type MultiPoleParams, curveAt as ratCurveAt, familyBasis, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat, Vec3 } from '../quaternion'

// --- Jacobi SVD, always on the tall orientation so it converges -----------------------------
function svdJacobi(A: readonly (readonly number[])[]): { sig: number[]; V: number[][] } {
  const m = A.length, n = A[0].length
  const U = A.map((r) => [...r])
  const V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let app = 0, aqq = 0, apq = 0
      for (let i = 0; i < m; i++) { app += U[i][p] ** 2; aqq += U[i][q] ** 2; apq += U[i][p] * U[i][q] }
      if (app * aqq === 0 || Math.abs(apq) < 1e-300) continue
      off = Math.max(off, Math.abs(apq) / Math.sqrt(app * aqq))
      const tau = (aqq - app) / (2 * apq)
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let i = 0; i < m; i++) { const a = U[i][p], b = U[i][q]; U[i][p] = c * a - s * b; U[i][q] = s * a + c * b }
      for (let i = 0; i < n; i++) { const a = V[i][p], b = V[i][q]; V[i][p] = c * a - s * b; V[i][q] = s * a + c * b }
    }
    if (off < 1e-15) break
  }
  return { sig: Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j]))), V }
}
const rankOfCols = (cols: number[][]): number => {
  if (!cols.length || !cols[0].length) return 0
  const M = cols[0].map((_, i) => cols.map((c) => c[i]))
  const tall = M.length >= M[0].length ? M : M[0].map((_, j) => M.map((r) => r[j]))
  const sv = svdJacobi(tall).sig.slice().sort((a, b) => b - a)
  return sv.filter((v) => v > 1e-7 * sv[0]).length
}
const SAMPLES = 24
const derivativeColumns = (params: number[], sample: (p: number[]) => number[]): number[][] =>
  params.map((_, c) => {
    const eps = 1e-6
    const up = params.slice(); up[c] += eps
    const dn = params.slice(); dn[c] -= eps
    const a = sample(up), b = sample(dn)
    return a.map((v, i) => (v - b[i]) / (2 * eps))
  })

// --- the lifted polynomial PH cubic ----------------------------------------------------------
const dot4 = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q
function speedPolynomial(A: readonly Quat[]): number[] {
  const m = A.length - 1
  const W = squareWeights(m)
  return Array.from({ length: 2 * m + 1 }, (_, j) => {
    let acc = 0
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) acc += W[j][a] * dot4(A[a], A[j - a])
    return acc
  })
}
const A_CUBIC: Quat[] = [
  { u: 1, v: 0.2, p: -0.1, q: 0.3 },
  { u: 0.6, v: -0.4, p: 0.5, q: 0.2 },
]
function liftPolynomialPH(A: readonly Quat[]): ConformalPHCurve {
  const C = conformalLiftBezier(phControlPoints({ A, p0: { x: 0, y: 0, z: 0 } } as SpatialPHCurve))
  return normalize({ C, h: bernsteinElevate(speedPolynomial(A), C.length - 2) })
}

const generic = findMember(6)

describe('the size of the families, counted the same way', () => {
  it('ALL-SOFT at conformal degree 6 is 17-dimensional as a family of CURVES', () => {
    expect(generic).not.toBeNull()
    const s = generic as ConformalPHCurve
    const x0 = [...s.C.flatMap((c) => [...c]), ...s.h]
    expect(x0.length).toBe(unknownCount(6))
    const { sig, V } = svdJacobi(definingJacobian(s))
    const smax = Math.max(...sig)
    const kernel = V[0].map((_, j) => j).filter((j) => sig[j] <= 1e-9 * smax).map((j) => V.map((row) => row[j]))

    const unpack = (x: number[]): ConformalPHCurve => ({
      C: Array.from({ length: 7 }, (_, k) => x.slice(5 * k, 5 * k + 5) as unknown as Conformal),
      h: x.slice(35),
    })
    const sample = (x: number[]): number[] => {
      const out: number[] = []
      for (let i = 0; i <= SAMPLES; i++) {
        const p = curveAt(unpack(x), i / SAMPLES)
        if (!p) return []
        out.push(p.x, p.y, p.z)
      }
      return out
    }
    const S = derivativeColumns(x0, sample)
    const moved = kernel.map((k) => S[0].map((_, i) => k.reduce((acc, kc, c) => acc + kc * S[c][i], 0)))
    const dim = rankOfCols(moved)
    console.log(`    tangent space ${kernel.length}, of which ${dim} MOVE the curve   [2N+5 = 17;` +
      ` the one that does not is the projective scale]`)
    expect(kernel.length, 'the variety is 2N+6 = 18').toBe(18)
    expect(dim, 'and 2N+5 = 17 of those move the curve').toBe(17)
  }, 180_000)

  it('the POLYNOMIAL cubics inside it are only 10-dimensional — codimension 7', () => {
    const params = [...A_CUBIC.flatMap((q) => [q.u, q.v, q.p, q.q]), 0, 0, 0]  // 8 spinor + 3 translation
    const sample = (pr: number[]): number[] => {
      const A: Quat[] = [0, 1].map((i) => ({ u: pr[4 * i], v: pr[4 * i + 1], p: pr[4 * i + 2], q: pr[4 * i + 3] }))
      const P = phControlPoints({ A, p0: { x: pr[8], y: pr[9], z: pr[10] } } as SpatialPHCurve)
      const out: number[] = []
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES
        let cur = P.map((v: Vec3) => [v.x, v.y, v.z])
        while (cur.length > 1) cur = cur.slice(0, -1).map((v, j) => v.map((c, k) => (1 - t) * c + t * cur[j + 1][k]))
        out.push(...cur[0])
      }
      return out
    }
    const dim = rankOfCols(derivativeColumns(params, sample))
    console.log(`    ${params.length} parameters, ${dim} move the curve   [8 spinor − 1 Hopf gauge + 3 translation = 10]`)
    expect(dim, 'the Hopf circle moves no curve, so 11 parameters give 10 dimensions').toBe(10)
    // and they lift to conformal degree 6, where the ambient family is 17-dimensional
    expect(liftPolynomialPH(A_CUBIC).C.length - 1, 'a cubic lifts to conformal 6').toBe(6)
  }, 180_000)

  it('ALL-HARD at the same CURVE degree 6 is 16 — one dimension less, not seven', () => {
    const n = 3, ROOT = 1.7
    const base: MultiPoleParams = {
      A: Array.from({ length: n + 1 }, () => ({ u: 0, v: 0, p: 0, q: 0 })), roots: [ROOT], lambdas: [Math.tan(0.35)],
    }
    const B = familyBasis(base)
    const x = new Array<number>(4 * (n + 1)).fill(0)
    B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < x.length; j++) x[j] += a * b[j] })
    const prm0 = projectToFamily({ ...base, A: unpackSpinor(x) })
    const m0 = toMember(prm0)
    const degree = Math.max(...m0.p.map((c) => c.length), m0.w.length) - 1
    expect(degree, 'spinor 3 with one pole gives an EVEN curve degree: 2n − m + 1 = 6').toBe(6)

    // parameters: the spinor itself, the twist λ, and the pole position. Each perturbation is
    // projected back onto the family, so the derivative is the tangent one.
    const v0 = [...prm0.A.flatMap((q) => [q.u, q.v, q.p, q.q]), prm0.lambdas[0], prm0.roots[0]]
    const sample = (v: number[]): number[] => {
      const pr = projectToFamily({
        A: unpackSpinor(v.slice(0, 4 * (n + 1))), lambdas: [v[4 * (n + 1)]], roots: [v[4 * (n + 1) + 1]],
      })
      const m = toMember(pr)
      const out: number[] = []
      for (let i = 0; i <= SAMPLES; i++) { const c = ratCurveAt(m, i / SAMPLES); out.push(c.x, c.y, c.z) }
      return out
    }
    const dim = rankOfCols(derivativeColumns(v0, sample))
    console.log(`    ${v0.length} parameters, ${dim} move the curve, + 3 translation = ${dim + 3}   [2d+4 = 16]`)
    expect(dim + 3, 'all-hard at curve degree d is 2d+4, independent of the pole count').toBe(16)
  }, 180_000)
})

describe('the polynomial locus is a fold, and the drag feels it', () => {
  it('rank 21 of 24 at the lifted polynomial, against 23 of 24 generic', () => {
    const lifted = liftPolynomialPH(A_CUBIC)
    const here = svdJacobi(definingJacobian(lifted)).sig.slice().sort((a, b) => b - a)
    const there = svdJacobi(definingJacobian(generic as ConformalPHCurve)).sig.slice().sort((a, b) => b - a)
    const rank = (sv: number[]): number => sv.filter((v) => v > 1e-9 * sv[0]).length
    console.log(`    lifted polynomial: rank ${rank(here)} of 24, tail ` +
      here.slice(0, 24).slice(-4).map((v) => (v / here[0]).toExponential(1)).join(' '))
    console.log(`    generic member:    rank ${rank(there)} of 24, tail ` +
      there.slice(0, 24).slice(-4).map((v) => (v / there[0]).toExponential(1)).join(' '))
    expect(rank(here), 'THREE conditions go dependent at the polynomial').toBe(21)
    expect(rank(there), 'against the one structurally dependent row generic').toBe(23)
  }, 180_000)

  it('so the production drag slips off the family there, while tracking perfectly', () => {
    const run = (s: ConformalPHCurve, index: number) => {
      const P = controlPoints(s)
      const chord = Math.hypot(P[6].x - P[0].x, P[6].y - P[0].y, P[6].z - P[0].z)
      const b = P[index]
      const w = 0.05 * chord
      return {
        chord,
        r: dragControlPoint(s, index, {
          x: b.x + 0.3038 * w, y: b.y + 0.8101 * w, z: b.z + 0.5063 * w,
        }, { pinEnds: true, iterations: 80 }),
      }
    }
    const poly = run(liftPolynomialPH(A_CUBIC), 3)
    const gen = run(generic as ConformalPHCurve, 3)
    console.log(`    from the polynomial: defect ${poly.r.defect.toExponential(1)},` +
      ` tracking ${(poly.r.trackingError / poly.chord).toExponential(1)}, converged ${poly.r.converged}`)
    console.log(`    from a generic member: defect ${gen.r.defect.toExponential(1)},` +
      ` tracking ${(gen.r.trackingError / gen.chord).toExponential(1)}, converged ${gen.r.converged}`)

    expect(gen.r.converged, 'the generic drag converges').toBe(true)
    expect(gen.r.defect, 'to 1e-12 or better').toBeLessThan(1e-12)
    expect(poly.r.defect, 'the polynomial drag does NOT — it slips off the family')
      .toBeGreaterThan(1e2 * gen.r.defect)
    // and the point still goes exactly where it was asked, in BOTH cases: this is not blocking
    expect(poly.r.trackingError / poly.chord, 'tracking is perfect either way').toBeLessThan(1e-12)
    expect(gen.r.trackingError / gen.chord).toBeLessThan(1e-12)
  }, 180_000)
})
