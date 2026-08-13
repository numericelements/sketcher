// ============================================================================
// THE Sp(1,1) CHART CONDITION, AND THE SPECIMEN THAT DEFEATS EVERY λ-CHART.
//
// mobiusMovesTheStratum.test.ts produced a specimen: the inversion of a curve that sits strictly
// inside the λ-chart. It is a perfectly good rational PH curve, and σ(r) = 0 at EVERY one of its
// poles — so every chart in this repo, which divides by 𝒜(r), refuses it. This file asks whether a
// Möbius-covariant formulation refuses it too.
//
// THE COVARIANT SETUP. A point of ℝ³ ∪ {∞} is a null line in ℍ² for the form J = [[0,1],[1,0]]:
// the column U = (a, b)ᵀ with Re(āb) = 0 represents x = b a⁻¹. Sp(1,1) = {G : G†JG = J} acts by
// U ↦ GU — LINEARLY, so degrees are preserved. Then Ĥ = UU† is rank-one Hermitian, hence
// det Ĥ ≡ 0: the curve is on the light cone for free, with no condition imposed.
//
//     THE CONDITION:      −det(Ĥ′)  is a perfect square.
//
// For U = (w, p) this unpacks to −det(Ĥ′) = |wp′ − w′p|² = σ², so it IS the PH condition. It is
// lift-independent (Ĥ → fĤ sends it to f²σ², still a square), mentions no pole, needs no spinor,
// and never divides by anything.
//
// WHAT THE TESTS SHOW, and the last two are the point:
//   · the seed and the specimen both satisfy it, and Möbius images keep satisfying it while KEEPING
//     THEIR DEGREE — because U ↦ GU is linear.
//   · in the covariant representation the specimen has NO POLES AT ALL. Its first entry is a = −p,
//     which never vanishes, so the curve never reaches infinity. There is nothing to impose a
//     condition at. The λ-chart's entire condition set is EMPTY for it.
//   · and the degeneracy is manufactured by the GAUGE FIXING. Demanding a real denominator means
//     U ↦ U·ā, and ā is a zero divisor exactly where ⟨a,a⟩ = 0. That step, and only that step,
//     produces the blown-up degree and σ = 0 at every pole.
//
// CONCLUSION: σ(r) = 0 is an artefact of the real-denominator gauge, not a feature of the curve.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'

// --- real polynomials --------------------------------------------------------
type P = number[]
const pAdd = (a: P, b: P): P => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pSub = (a: P, b: P): P => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0))
const pMul = (a: P, b: P): P => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const pD = (a: P): P => (a.length < 2 ? [0] : a.slice(1).map((c, i) => c * (i + 1)))
const pMax = (a: P): number => Math.max(...a.map(Math.abs), 0)
const pTrim = (a: P): P => {
  const o = a.slice(); const s = pMax(o) || 1
  while (o.length > 1 && Math.abs(o[o.length - 1]) < 1e-12 * s) o.pop()
  return o
}
const pDeg = (a: P): number => pTrim(a).length - 1
const pEval = (a: P, t: number): number => a.reduceRight((s, c) => s * t + c, 0)
/** Worst coefficient gap, normalised by a scale SHARED across the comparison (not per-entry — a
 *  component that is exactly zero on one side and numerical dust on the other must not score 1). */
const pGap = (a: P, b: P): number => {
  const n = Math.max(a.length, b.length)
  let d = 0
  for (let i = 0; i < n; i++) d = Math.max(d, Math.abs((a[i] ?? 0) - (b[i] ?? 0)))
  return d
}
const pRel = (a: P, b: P): number => pGap(a, b) / (Math.max(pMax(a), pMax(b)) || 1)

// --- quaternion polynomials: [real, i, j, k] ---------------------------------
type QP = [P, P, P, P]
const ZERO: QP = [[0], [0], [0], [0]]
const qpAdd = (A: QP, B: QP): QP => [pAdd(A[0], B[0]), pAdd(A[1], B[1]), pAdd(A[2], B[2]), pAdd(A[3], B[3])]
const qpMul = (A: QP, B: QP): QP => [
  pSub(pSub(pSub(pMul(A[0], B[0]), pMul(A[1], B[1])), pMul(A[2], B[2])), pMul(A[3], B[3])),
  pAdd(pSub(pAdd(pMul(A[0], B[1]), pMul(A[1], B[0])), pMul(A[3], B[2])), pMul(A[2], B[3])),
  pAdd(pAdd(pSub(pMul(A[0], B[2]), pMul(A[1], B[3])), pMul(A[2], B[0])), pMul(A[3], B[1])),
  pAdd(pSub(pAdd(pMul(A[0], B[3]), pMul(A[1], B[2])), pMul(A[2], B[1])), pMul(A[3], B[0])),
]
const qpConj = (A: QP): QP => [A[0], A[1].map((c) => -c), A[2].map((c) => -c), A[3].map((c) => -c)]
const qpD = (A: QP): QP => [pD(A[0]), pD(A[1]), pD(A[2]), pD(A[3])]
/** |A|² = A Ā — real. */
const qpNorm = (A: QP): P => pAdd(pAdd(pMul(A[0], A[0]), pMul(A[1], A[1])), pAdd(pMul(A[2], A[2]), pMul(A[3], A[3])))
const qpDeg = (A: QP): number => Math.max(...A.map(pDeg))
const qpMax = (A: QP): number => Math.max(...A.map(pMax))
const qpRel = (A: QP, B: QP): number => {
  const scale = Math.max(qpMax(A), qpMax(B)) || 1
  return Math.max(...[0, 1, 2, 3].map((i) => pGap(A[i], B[i]))) / scale
}
const realQP = (a: P): QP => [a, [0], [0], [0]]
const imagQP = (v: P[]): QP => [[0], v[0], v[1], v[2]]
const constQP = (u: number, i = 0, j = 0, k = 0): QP => [[u], [i], [j], [k]]

// --- columns and the Sp(1,1) action -----------------------------------------
type Col = [QP, QP]
type Mat = [[QP, QP], [QP, QP]]
const act = (G: Mat, U: Col): Col =>
  [qpAdd(qpMul(G[0][0], U[0]), qpMul(G[0][1], U[1])), qpAdd(qpMul(G[1][0], U[0]), qpMul(G[1][1], U[1]))]
const matMul = (G: Mat, H: Mat): Mat => [
  [qpAdd(qpMul(G[0][0], H[0][0]), qpMul(G[0][1], H[1][0])), qpAdd(qpMul(G[0][0], H[0][1]), qpMul(G[0][1], H[1][1]))],
  [qpAdd(qpMul(G[1][0], H[0][0]), qpMul(G[1][1], H[1][0])), qpAdd(qpMul(G[1][0], H[0][1]), qpMul(G[1][1], H[1][1]))],
]

/** ⟨U,U⟩ = 2 Re(āb) — zero exactly when the column represents a point of ℝ³ ∪ {∞}. */
const nullDefect = (U: Col): P => pTrim(qpMul(qpConj(U[0]), U[1])[0])

/** −det(Ĥ′) where Ĥ = UU†. The PH quantity: for U = (w,p) it is σ². */
function speedSquared(U: Col): P {
  const h11 = qpNorm(U[0])                          // |a|²
  const h22 = qpNorm(U[1])                          // |b|²
  const h12 = qpMul(U[0], qpConj(U[1]))             // a b̄
  const d11 = pD(h11), d22 = pD(h22), d12 = qpD(h12)
  return pSub(qpNorm(d12), pMul(d11, d22))          // |h12′|² − h11′h22′  =  −det(Ĥ′)
}

/**
 * Polynomial square root by coefficient recursion; null if the input is not a perfect square.
 * Normalised by a[0] before recursing — these polynomials reach degree 20 with a wide coefficient
 * range, and the un-normalised recursion loses the verification to round-off, not to non-squareness.
 */
function polySqrt(poly: P, tol = 1e-7): P | null {
  const a = pTrim(poly)
  if (a.length % 2 === 0 || a[0] <= 0) return null
  const n = (a.length - 1) / 2
  const c0 = a[0]
  const hat = a.map((c) => c / c0)                 // hat[0] = 1
  const s = new Array<number>(n + 1).fill(0)
  s[0] = 1
  for (let k = 1; k <= n; k++) {
    let acc = 0
    for (let i = 1; i < k; i++) acc += s[i] * s[k - i]
    s[k] = ((hat[k] ?? 0) - acc) / 2
  }
  if (pRel(pMul(s, s), hat) > tol) return null
  const r = Math.sqrt(c0)
  return s.map((c) => c * r)
}

// --- the specimens -----------------------------------------------------------
const m = toMember(seedQuintic())
const wSeed = m.w as P
// translated off the origin, exactly as in mobiusMovesTheStratum
const pSeed = (m.p as P[]).map((pi, i) => pAdd(pi, pMul(wSeed, [[5, 3, -2][i]])))
const sigmaSeed = m.sigma as P

const U_seed: Col = [realQP(wSeed), imagQP(pSeed)]
const G_INV: Mat = [[ZERO, constQP(-1)], [constQP(1), ZERO]]           // x ↦ x/|x|²
const T = (a: number[]): Mat => [[constQP(1), ZERO], [constQP(0, a[0], a[1], a[2]), constQP(1)]]
const R = (q: number[]): Mat => [[constQP(q[0], q[1], q[2], q[3]), ZERO], [ZERO, constQP(q[0], q[1], q[2], q[3])]]
const S = (s: number): Mat => [[constQP(1 / s), ZERO], [ZERO, constQP(s)]]

const U_spec = act(G_INV, U_seed)   // THE SPECIMEN, covariantly

describe('the Sp(1,1) chart condition', () => {
  it('the seed column is null, and the condition reproduces sigma exactly', () => {
    expect(Math.max(...nullDefect(U_seed).map(Math.abs))).toBeLessThan(1e-9)
    const s2 = speedSquared(U_seed)
    expect(pRel(s2, pMul(sigmaSeed, sigmaSeed))).toBeLessThan(1e-9)
    expect(polySqrt(s2)).not.toBeNull()   // and it IS a perfect square
  })

  it('THE SPECIMEN satisfies the condition — and Mobius did not raise its degree', () => {
    expect(Math.max(...nullDefect(U_spec).map(Math.abs))).toBeLessThan(1e-9)
    expect(polySqrt(speedSquared(U_spec))).not.toBeNull()
    // U ↦ GU is LINEAR, so the representation stays the same size
    expect(qpDeg(U_spec[0])).toBe(qpDeg(U_seed[1]))
    expect(qpDeg(U_spec[1])).toBe(qpDeg(U_seed[0]))
  })

  it('THE SPECIMEN HAS NO POLES AT ALL: a = -p never vanishes, so it never reaches infinity', () => {
    const h11 = qpNorm(U_spec[0])                       // |a|² = |p|²
    for (let i = 0; i <= 2000; i++) expect(pEval(h11, -25 + i / 40)).toBeGreaterThan(1e-6)
    // so there is no r at which any condition could even be stated
  })

  it('and a GENERIC Mobius image still satisfies it, still without growing', () => {
    const G = matMul(matMul(T([0.7, -1.3, 0.4]), G_INV), matMul(T([-2, 0.5, 1.1]), matMul(R([0.6, 0.8, 0, 0]), S(1.7))))
    const U = act(G, U_seed)
    expect(Math.max(...nullDefect(U).map(Math.abs))).toBeLessThan(1e-7)
    expect(polySqrt(speedSquared(U))).not.toBeNull()
    expect(Math.max(qpDeg(U[0]), qpDeg(U[1]))).toBeLessThanOrEqual(Math.max(qpDeg(U_seed[0]), qpDeg(U_seed[1])))
  })

  // --- and now where the wall actually comes from ---------------------------
  // The real-denominator gauge is U ↦ U·ā, which makes the first entry |a|² real.
  const gaugeFixed: Col = [qpMul(U_spec[0], qpConj(U_spec[0])), qpMul(U_spec[1], qpConj(U_spec[0]))]

  it('GAUGE FIXING to a real denominator reproduces the degenerate representation exactly', () => {
    // (|p|², w·p) — precisely the (⟨p,p⟩, p·w) pair measured in mobiusMovesTheStratum
    expect(qpRel(gaugeFixed[0], realQP(qpNorm(imagQP(pSeed))))).toBeLessThan(1e-9)
    expect(qpRel(gaugeFixed[1], qpMul(imagQP(pSeed), realQP(wSeed)))).toBeLessThan(1e-9)
    // and the degree JUMPS — this step, not the curve, is what blows it up
    expect(qpDeg(gaugeFixed[0])).toBeGreaterThan(qpDeg(U_spec[0]))
  })

  it('THE DEGENERACY IS MANUFACTURED HERE: sigma picks up <a,a>, so it dies at every pole', () => {
    const before = speedSquared(U_spec)
    const after = speedSquared(gaugeFixed)
    const f = qpNorm(U_spec[0])                       // the gauge factor's norm, ⟨a,a⟩
    // Ĥ → fĤ sends the quantity to f²·(it) — the square is preserved, but sigma now CARRIES f
    expect(pRel(after, pMul(pMul(f, f), before))).toBeLessThan(1e-8)
    const sBefore = polySqrt(before), sAfter = polySqrt(after)
    expect(sBefore).not.toBeNull()
    expect(sAfter).not.toBeNull()
    // 1e-6, not 1e-8: polySqrt's recursion runs over degree 20+ here and accumulates. The SQUARED
    // form of this same identity (the assertion above) holds at 1e-8, so this is round-off in the
    // square root, not disagreement.
    expect(pRel(sAfter!, pMul(f, sBefore!))).toBeLessThan(1e-6)
    // f IS the new denominator, so the new sigma vanishes at every one of its roots — by
    // construction, and only because of the gauge fixing. ā is a zero divisor exactly there.
    expect(pRel(gaugeFixed[0][0], f)).toBeLessThan(1e-12)
  })
})
