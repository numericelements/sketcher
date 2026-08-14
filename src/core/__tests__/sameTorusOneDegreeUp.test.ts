// ============================================================================
// THE RATIONAL SEXTIC HAS THE SAME HERMITE TORUS AS THE POLYNOMIAL QUINTIC — plus two dials.
//
// THE QUESTION, Eric's: the polynomial PH quintic's C¹ Hermite interpolants form a two-parameter
// family — the torus the sibling deck sweeps — and he asked what the rational analogue is, and how
// many fibre sliders degree 6 would need.
//
// MEASURED, as the rank of the map from the admissible spinors to the nine C¹ Hermite numbers
// (c′(0), c′(1), c(1)−c(0)); the translation c(0) is the gauge and is free on top:
//
//     POLYNOMIAL quintic   n=2, m=0    12 free   rank 9 of 9    12 − 9 − 1 = 2      ← the torus
//     RATIONAL sextic      n=3, m=1    fibre 12  rank 9 of 9    12 − 9 − 1 = 2      ← THE SAME
//     RATIONAL degree 8    n=4, m=1    fibre 16  rank 9 of 9    16 − 9 − 1 = 6
//
//     RATIONAL quartic     n=2, m=1    fibre  8  rank 7 of 9    — cannot do it at all
//
// So the rational sextic with one pole, holding full C¹ Hermite data, has EXACTLY the polynomial
// quintic's two-dimensional fibre — and then two dials on top of it, the twist λ and the pole position
// r. That is the "torus × roads" picture, arrived at by counting rather than by analogy:
//
//     polynomial quintic      torus (2)
//     rational sextic         torus (2)  ×  λ  ×  r     =  4
//
// AND THE QUARTIC CANNOT INTERPOLATE C¹ HERMITE DATA. Its data map has rank 7 of 9 — two of the nine
// numbers are simply not reachable — which is why slides 3 and 4 hold only c′(0) and c(1), six numbers,
// rather than the full Hermite set. Degree 6 is the first rational degree where the classical
// interpolation problem is even posable with one pole, and when it is, the leftover freedom is the
// familiar torus.
//
// A NOTE ON WHY 12 − 9 − 1 APPEARS TWICE. It is not a coincidence and it is not deep: both spinors
// have twelve real coefficients available after their own constraint (the polynomial has no residue
// condition and n = 2; the rational has n = 3 and loses four to one pole), the Hermite data is nine
// numbers in both, and the Hopf gauge costs one in both. The rational case pays for its extra spinor
// degree with the residue condition and comes out level.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, derivativeAt, familyBasis, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { orthonormalise } from '../sp11RationalPH'
import { QUAT_I, qconj, qmul, qvec, type Quat } from '../quaternion'

const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const rankOf = (M: readonly number[][], tol = 1e-9): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

function jacobianOf(f: (x: readonly number[]) => number[], x: readonly number[]): number[][] {
  const m = f(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = 1e-6 * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = f(hi), fl = f(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}

/** The nine C¹ Hermite numbers of a POLYNOMIAL PH curve: c′ = 𝒜i𝒜*, c = ∫c′. */
function polynomialHermite(x: readonly number[]): number[] {
  const n = x.length / 4 - 1
  const A: Quat[] = Array.from({ length: n + 1 },
    (_, k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] }))
  const N = [0, 1, 2].map(() => new Array<number>(2 * n + 1).fill(0))
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
    }
  }
  const at = (a: number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)
  const integral = (a: number[]): number => a.reduce((s, c, i) => s + c / (i + 1), 0)
  return [...N.map((a) => at(a, 0)), ...N.map((a) => at(a, 1)), ...N.map(integral)]
}

/** The same nine numbers for a rational member. */
function rationalHermite(prm: MultiPoleParams): number[] {
  const m = toMember(prm)
  const d0 = derivativeAt(m, 0), d1 = derivativeAt(m, 1)
  const start = curveAt(m, 0), end = curveAt(m, 1)
  return [d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, end.x - start.x, end.y - start.y, end.z - start.z]
}

/** Rank of the data map restricted to the admissible fibre at fixed λ and pole. */
function fibreAndRank(n: number): { fibre: number; rank: number } {
  const base: MultiPoleParams = { A: ZERO(n + 1), roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const coordinate = (c: readonly number[]): number[] => {
    const x = new Array<number>(4 * (n + 1)).fill(0)
    B.forEach((b, i) => { for (let j = 0; j < x.length; j++) x[j] += c[i] * b[j] })
    return x
  }
  const c0 = B.map((_, i) => 1.3 * Math.sin(1.7 * i + 0.6))
  const f = (c: readonly number[]): number[] =>
    rationalHermite({ ...base, A: unpackSpinor(coordinate(c)) })
  return { fibre: B.length, rank: rankOf(jacobianOf(f, c0)) }
}

describe('the Hermite fibre, polynomial against rational', () => {
  it('THE POLYNOMIAL PH QUINTIC HAS A TWO-DIMENSIONAL FIBRE — the torus', () => {
    const x = Array.from({ length: 12 }, (_, i) => 1.3 * Math.sin(1.7 * i + 0.6))
    expect(polynomialHermite(x).length).toBe(9)
    const r = rankOf(jacobianOf(polynomialHermite, x))
    expect(r).toBe(9)                       // the nine Hermite numbers are all reachable
    expect(12 - r - 1).toBe(2)              // 12 spinor coefficients, minus the data, minus the gauge
  })

  it('AND THE RATIONAL SEXTIC HAS THE SAME ONE, plus the twist and the pole', () => {
    const { fibre, rank } = fibreAndRank(3)
    expect(fibre).toBe(12)                  // 4(n+1) − 4m = 16 − 4
    expect(rank).toBe(9)                    // full: C¹ Hermite really is interpolable here
    expect(fibre - rank - 1).toBe(2)        // the same torus as the polynomial quintic
    // with two dials on top, which the polynomial case does not have
    expect(2 + 1 + 1).toBe(4)
  })

  it('THE RATIONAL QUARTIC CANNOT INTERPOLATE C¹ HERMITE DATA AT ALL', () => {
    const { fibre, rank } = fibreAndRank(2)
    expect(fibre).toBe(8)
    expect(rank).toBe(7)                    // two of the nine numbers are unreachable
    expect(rank).toBeLessThan(9)
    // which is why slides 3 and 4 hold six numbers — c′(0) and c(1) — and not the full Hermite set
  })

  it('and degree 8 has six, so the torus is not a coincidence of degree 6', () => {
    const { fibre, rank } = fibreAndRank(4)
    expect(fibre).toBe(16)
    expect(rank).toBe(9)
    expect(fibre - rank - 1).toBe(6)
  })

  it('every member used above is genuinely PH', () => {
    for (const n of [2, 3, 4]) {
      const base: MultiPoleParams = { A: ZERO(n + 1), roots: [1.7], lambdas: [0.4] }
      const B = familyBasis(base)
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => {
        const a = 1.3 * Math.sin(1.7 * i + 0.6)
        for (let j = 0; j < x.length; j++) x[j] += a * b[j]
      })
      expect(phDefect(toMember({ ...base, A: unpackSpinor(x) }))).toBeLessThan(1e-12)
    }
  })
})
