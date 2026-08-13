// ============================================================================
// THE CONSTRUCTIVE HALF: solving for the unknown column U.
//
// sp11ChartCondition.test.ts showed the covariant condition ACCEPTS the specimen that every λ-chart
// refuses. That is verification. This file solves for U instead, from prescribed data, and the whole
// point is the last two tests: the SAME spinor and the SAME linear machinery produce the ordinary
// curve when A is real and the specimen — in its own low degree, with no poles — when A is not.
//
//     C̄A′ + ĀC′ = 𝒜i𝒜*        and        Re(ĀC) = 0
//
// Linear in C once 𝒜 and A are prescribed. Kalkan et al.'s αB′ − α′B = μ𝒜i𝒜* is the case A = α REAL;
// letting A be a full quaternion is exactly the freedom the real-denominator gauge discards.
//
// DEGREES. deg A + deg C − 1 = deg(𝒜i𝒜*) = 2·deg 𝒜. With deg 𝒜 = 3 that is deg A + deg C = 7, and
// the two solutions below sit at opposite ends of it: (2, 5) is the ordinary curve, (5, 2) is the
// specimen. One equation, one spinor, two curves that no single λ-chart holds at once.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import {
  qpReal, qpImag, qpConst, qpMul, qpConj, qpNorm, qpAdd, qpDegree, qpMax,
  sandwich, covariantWronskian, speedSquared, nullPart, solveForC, curveAt,
  phDefect, polySqrt, pMul, pMax, pEval,
  type QPoly, type Poly, type Column,
} from '../sp11RationalPH'

const relGap = (a: Poly, b: Poly): number => {
  const n = Math.max(a.length, b.length)
  let d = 0
  for (let i = 0; i < n; i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
  return d / (Math.max(pMax(a), pMax(b)) || 1)
}
/** How far U is from representing a curve, scaled by the inputs — NOT by itself (comparing a
 *  tiny-but-nonzero quantity against exact zero relatively always yields 1). */
const nullDefect = (U: Column): number =>
  pMax(nullPart(U)) / ((qpMax(U.A) * qpMax(U.C)) || 1)
const qpGap = (A: QPoly, B: QPoly): number => {
  const s = Math.max(qpMax(A), qpMax(B)) || 1
  return Math.max(...[0, 1, 2, 3].map((i) => {
    const n = Math.max(A[i].length, B[i].length)
    let d = 0
    for (let k = 0; k < n; k++) d = Math.max(d, Math.abs((A[i][k] ?? 0) - (B[i][k] ?? 0)))
    return d
  })) / s
}

// --- the data: one seed, one spinor -----------------------------------------
const seed = seedQuintic()
const m = toMember(seed)
const wSeed = m.w as Poly
// translated off the origin, as in mobiusMovesTheStratum. Translation leaves N unchanged.
const pSeed = (m.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]
  return Array.from({ length: Math.max(pi.length, wSeed.length) },
    (_, k) => (pi[k] ?? 0) + a * (wSeed[k] ?? 0))
})
/** The spinor: 𝒜 from the multi-pole family. Translation does not change N, so it is unchanged. */
const SPINOR: QPoly = [
  seed.A.map((q) => q.u), seed.A.map((q) => q.v), seed.A.map((q) => q.p), seed.A.map((q) => q.q),
]
const N_TARGET = sandwich(SPINOR)                       // 𝒜i𝒜*

const U_ordinary: Column = { A: qpReal(wSeed), C: qpImag(pSeed) }
const NEG_P: QPoly = qpMul(qpConst(-1), qpImag(pSeed))
const U_specimen: Column = { A: NEG_P, C: qpReal(wSeed) }

describe('Sp(1,1): the covariant Wronskian', () => {
  it('reduces to the classical wp - w p in the real-denominator gauge', () => {
    const N = (m.N as Poly[])
    expect(qpGap(covariantWronskian(U_ordinary), qpImag(N))).toBeLessThan(1e-9)
  })

  it('and |N-tilde|^2 IS -det((UU+)-prime), so both readings of PH agree', () => {
    for (const U of [U_ordinary, U_specimen]) {
      expect(relGap(qpNorm(covariantWronskian(U)), speedSquared(U))).toBeLessThan(1e-9)
    }
  })

  it('is gauge-covariant: U -> Uq conjugates it, N-tilde -> q-bar N-tilde q', () => {
    const q = qpConst(0.6, -0.3, 0.5, 0.2)
    const gauged: Column = { A: qpMul(U_ordinary.A, q), C: qpMul(U_ordinary.C, q) }
    expect(nullDefect(gauged)).toBeLessThan(1e-12)   // still a curve
    const expected = qpMul(qpMul(qpConj(q), covariantWronskian(U_ordinary)), q)
    expect(qpGap(covariantWronskian(gauged), expected)).toBeLessThan(1e-9)
  })

  it('the specimen IS the ordinary curve inverted, and its N-tilde is -N', () => {
    const N = (m.N as Poly[])
    expect(qpGap(covariantWronskian(U_specimen), qpMul(qpConst(-1), qpImag(N)))).toBeLessThan(1e-9)
    // -N is also a sandwich: (Aj) i (Aj)* = -A i A*, so the SAME spinor up to its gauge
    const negTarget = sandwich(qpMul(SPINOR, qpConst(0, 0, 1, 0)))
    expect(qpGap(negTarget, qpMul(qpConst(-1), N_TARGET))).toBeLessThan(1e-9)
  })
})

describe('Sp(1,1): solving for the unknown column', () => {
  it('A REAL recovers the ordinary curve — this is Kalkan, in covariant clothing', () => {
    const r = solveForC(qpReal(wSeed), N_TARGET, 5)
    expect(r.residual).toBeLessThan(1e-9)
    expect(qpDegree(r.U.C)).toBe(5)
    expect(nullDefect(r.U)).toBeLessThan(1e-12)
    expect(phDefect(r.U)).toBeLessThan(1e-9)
    // it reproduces the seed's Wronskian exactly, hence the same curve up to translation
    expect(qpGap(covariantWronskian(r.U), N_TARGET)).toBeLessThan(1e-9)
  })

  it('and the homogeneous solutions are the TRANSLATIONS — three of them', () => {
    const r = solveForC(qpReal(wSeed), N_TARGET, 5)
    expect(r.familyDimension).toBe(3)
    // check it directly: C + a*w is another solution for any imaginary constant a
    const shifted: Column = {
      A: r.U.A,
      C: qpAdd(r.U.C, qpMul(qpConst(0, 1.7, -0.4, 2.2), qpReal(wSeed))),
    }
    expect(qpGap(covariantWronskian(shifted), N_TARGET)).toBeLessThan(1e-9)
    expect(nullDefect(shifted)).toBeLessThan(1e-12)
  })

  it('THE POINT: A QUATERNIONIC recovers the SPECIMEN, at degree 2 instead of 10', () => {
    // same spinor, same machinery, A = -p instead of a real polynomial
    const r = solveForC(NEG_P, qpMul(qpConst(-1), N_TARGET), 2)
    expect(r.residual).toBeLessThan(1e-9)
    expect(nullDefect(r.U)).toBeLessThan(1e-12)
    expect(phDefect(r.U)).toBeLessThan(1e-9)
    // C came back REAL and proportional to w — the specimen, in its own representation
    expect(pMax(r.U.C[1]) + pMax(r.U.C[2]) + pMax(r.U.C[3])).toBeLessThan(1e-8 * pMax(r.U.C[0]))
    const k = r.U.C[0][0] / wSeed[0]
    expect(relGap(r.U.C[0], wSeed.map((c) => c * k))).toBeLessThan(1e-8)
    // and the real-denominator reading of the SAME curve has degree 10 (mobiusMovesTheStratum)
    expect(qpDegree(r.U.C)).toBe(2)
    expect(qpDegree(qpMul(r.U.A, qpConj(r.U.A)))).toBe(10)
  })

  it('and THAT solution has NO POLES: |A| never vanishes, so the curve is bounded', () => {
    const r = solveForC(NEG_P, qpMul(qpConst(-1), N_TARGET), 2)
    const h11 = qpNorm(r.U.A)
    let worst = 0
    for (let i = 0; i <= 2000; i++) {
      const t = -25 + i / 40
      expect(pEval(h11, t)).toBeGreaterThan(1e-6)
      const x = curveAt(r.U, t)
      expect(x).not.toBeNull()
      worst = Math.max(worst, Math.hypot(x!.x, x!.y, x!.z))
    }
    expect(worst).toBeLessThan(1e4)
    // the ordinary solution, by contrast, DOES reach infinity — at the seed's real poles
    const o = solveForC(qpReal(wSeed), N_TARGET, 5)
    expect(pEval(qpNorm(o.U.A), 1.7)).toBeLessThan(1e-9)
  })

  it('the two solutions are the same GEOMETRY: one is the inversion of the other', () => {
    const o = solveForC(qpReal(wSeed), N_TARGET, 5).U
    const s = solveForC(NEG_P, qpMul(qpConst(-1), N_TARGET), 2).U
    // pick t away from poles; inversion of the ordinary point must be the specimen point (up to
    // the translation freedom, so compare the ordinary curve rebuilt with the specimen's own C)
    for (const t of [0.2, 0.55, 0.9, -3, 7]) {
      const a = curveAt({ A: qpReal(wSeed), C: qpImag(pSeed) }, t)!
      const b = curveAt(s, t)!
      const n2 = a.x * a.x + a.y * a.y + a.z * a.z
      expect(Math.hypot(b.x - a.x / n2, b.y - a.y / n2, b.z - a.z / n2)).toBeLessThan(1e-6)
    }
  })

  it('an INCONSISTENT degree pairing is reported, not silently fudged', () => {
    // deg A + deg C - 1 must equal deg(A i A*) = 6; ask for deg C = 3 with deg A = 2
    const r = solveForC(qpReal(wSeed), N_TARGET, 3)
    expect(r.residual).toBeGreaterThan(1e-3)
  })

  it('the target is CONSTRAINED: Re(N-tilde) is identically zero, for any column at all', () => {
    // (ĀC)′ = Ā′C + ĀC′ and Re(ĀC) ≡ 0, so Re(N-tilde) = Re(Ā′C + ĀC′) ≡ 0. A target with a real
    // part is not a Wronskian of anything, and the system rejects it rather than fudging.
    for (const U of [U_ordinary, U_specimen]) {
      expect(pMax(covariantWronskian(U)[0])).toBeLessThan(1e-9 * qpMax(covariantWronskian(U)))
    }
    const withRealPart: QPoly = qpAdd(N_TARGET, [[0.4, -0.2], [0], [0], [0]])
    expect(solveForC(qpReal(wSeed), withRealPart, 5).residual).toBeGreaterThan(1e-3)
  })

  it('and NOT every imaginary target is reachable either — the system is genuinely overdetermined', () => {
    // 32 equations, 24 unknowns, rank 21: the image is a proper subspace. This DIFFERS from the
    // trap Kalkan et al. flag in their own system, where trivial solutions always exist and a zero
    // residual therefore proves nothing. Here a zero residual does mean something.
    const perturbed: QPoly = qpAdd(N_TARGET, [[0], [0.3, 0, 1.1], [0], [0, -0.7]])
    expect(pMax(perturbed[0])).toBeLessThan(1e-12 * qpMax(perturbed))   // it IS imaginary
    expect(solveForC(qpReal(wSeed), perturbed, 5).residual).toBeGreaterThan(1e-3)
  })

  it('BUT a reachable target that is not a SANDWICH solves fine and is not PH — check PH separately', () => {
    // build a target that is a genuine Wronskian by construction: perturb C in a direction that
    // keeps the null condition (C + A·v·t with v imaginary), then feed back its own N-tilde.
    const bad: Column = {
      A: qpReal(wSeed),
      C: qpAdd(qpImag(pSeed), qpMul(qpMul(qpReal(wSeed), qpConst(0, 0.9, -0.4, 0.6)), qpReal([0, 1]))),
    }
    expect(nullDefect(bad)).toBeLessThan(1e-12)
    const reachable = covariantWronskian(bad)
    const r = solveForC(qpReal(wSeed), reachable, 6)
    expect(r.residual).toBeLessThan(1e-9)                    // it solved
    expect(polySqrt(qpNorm(reachable))).toBeNull()           // and the curve is NOT PH
    expect(phDefect(r.U)).toBe(Infinity)
  })
})
