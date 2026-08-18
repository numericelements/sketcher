// ============================================================================
// WHY THE σ = 0 STRATUM IS A SPATIAL PHENOMENON: in the PLANE it is not an honest
// stratum at all, it is the locus of LOWER-DEGREE curves.
//
// The planar case was worth running because it is the one place where the continuous
// gauge does not exist — A ↦ −A is discrete — so nothing there can be blamed on a gauge
// orbit. What it shows is stronger than a clean experiment: the analogue of the mixed cell
// cannot exist in the plane, for an algebraic reason.
//
// THE ALGEBRA. A planar rational PH curve has N = A² for a complex polynomial A, and
// σ = A·A†, where † conjugates COEFFICIENTS. Since A†(r) = conj(A(r̄)),
//
//     σ(r) = A(r) · conj(A(r̄))                    verified below to 1e-15
//
// a PRODUCT. So σ(r) = 0 forces A(r) = 0 or A(r̄) = 0 — one of the two conjugate poles has
// the generator vanishing on it, which is a DEGREE DROP, not rank one.
//
// THE STRUCTURAL REASON, which is the whole point. In space 𝒜(r) lives in ℍ ⊗ ℂ ≅ M₂(ℂ),
// where σ = det, and M₂(ℂ) HAS NONZERO SINGULAR MATRICES — rank one. In the plane A(r)
// lives in ℂ ⊗ ℂ ≅ ℂ ⊕ ℂ, where the "determinant" is the PRODUCT of the two components, so
// singular means a component VANISHES. There is no rank-one floor to stand on:
//
//     space   ℍ ⊗ ℂ ≅ M₂(ℂ)    rank 1 = nonzero singular    both poles SOFT and nonzero
//     plane   ℂ ⊗ ℂ ≅ ℂ ⊕ ℂ    "rank 1" = a factor is 0     the pair is {soft, FAKE}
//
// AND THE FAKE POLE CANCELS. A(r) = 0 makes N = A² have a double root at r while w² has a
// double root there, so c′ = N/w² is regular and r is not a pole of the curve at all. The
// planar σ = 0 configuration is therefore a curve with fewer poles wearing a larger pole
// set — which is exactly why the plane never needed a chart for it, and why the λ-chart's
// hole is a genuinely spatial difficulty.
//
// A second difference falls out of the same algebra: the planar no-log condition
// A′(r_k) = Σ_k A(r_k) is LINEAR in A, so the family is a linear subspace of complex
// dimension (n+1) − m. In space it is quadratic and needs the N-form (rationalPHResidue).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm, cconj } from '../complex'

const C = (re: number, im = 0): Complex => ({ re, im })
type CP = Complex[]

const evalAt = (p: CP, z: Complex): Complex => {
  let a: Complex = C(0)
  for (let k = p.length - 1; k >= 0; k--) a = cadd(cmul(z, a), p[k])
  return a
}
const deriv = (p: CP): CP => (p.length <= 1 ? [C(0)] : p.slice(1).map((c, i) => cscale(c, i + 1)))
const mul = (a: CP, b: CP): CP => {
  const o: CP = Array.from({ length: a.length + b.length - 1 }, () => C(0))
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] = cadd(o[i + j], cmul(a[i], b[j]))
  return o
}
/** A†: conjugate the COEFFICIENTS. A†(r) = conj(A(r̄)). */
const dagger = (p: CP): CP => p.map(cconj)

const bigSigma = (R: readonly Complex[], k: number): Complex => {
  let s: Complex = C(0)
  for (let l = 0; l < R.length; l++) if (l !== k) s = cadd(s, cdiv(C(1), csub(R[k], R[l])))
  return s
}

/** Complex nullspace by Gauss–Jordan. */
function nullspace(M: Complex[][], n: number): CP[] {
  const A = M.map((r) => [...r])
  const piv: number[] = []
  let row = 0
  for (let col = 0; col < n && row < A.length; col++) {
    let b = row
    for (let r = row; r < A.length; r++) if (cnorm(A[r][col]) > cnorm(A[b][col])) b = r
    if (cnorm(A[b][col]) < 1e-12) continue
    ;[A[row], A[b]] = [A[b], A[row]]
    const p = A[row][col]
    for (let c = 0; c < n; c++) A[row][c] = cdiv(A[row][c], p)
    for (let r = 0; r < A.length; r++) {
      if (r === row) continue
      const f = A[r][col]
      if (cnorm(f) > 0) for (let c = 0; c < n; c++) A[r][c] = csub(A[r][c], cmul(f, A[row][c]))
    }
    piv.push(col)
    row++
  }
  const free = [...Array(n).keys()].filter((c) => !piv.includes(c))
  return free.map((f) => {
    const v: CP = Array.from({ length: n }, () => C(0))
    v[f] = C(1)
    piv.forEach((pc, i) => { v[pc] = cscale(A[i][f], -1) })
    return v
  })
}

/** The no-log conditions A′(r_k) − Σ_k A(r_k) = 0, as a complex matrix on A's coefficients. */
const conditionRows = (R: readonly Complex[], n: number, extra: Complex[][] = []): Complex[][] => [
  ...R.map((r, k) => {
    const S = bigSigma(R, k)
    return Array.from({ length: n + 1 }, (_, j) => {
      const mono: CP = Array.from({ length: n + 1 }, (_, i) => (i === j ? C(1) : C(0)))
      return csub(evalAt(deriv(mono), r), cmul(S, evalAt(mono, r)))
    })
  }),
  ...extra,
]

const POLES: readonly Complex[] = [C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7)]
const DEG = 6

const combine = (B: CP[], cs: Complex[], n: number): CP => {
  const A: CP = Array.from({ length: n + 1 }, () => C(0))
  B.forEach((b, i) => b.forEach((v, j) => { A[j] = cadd(A[j], cmul(cs[i % cs.length], v)) }))
  return A
}

describe('planar rational PH: the σ = 0 stratum is degenerate', () => {
  it('the no-log condition is LINEAR, so the family is a subspace of dim (n+1) − m', () => {
    const B = nullspace(conditionRows(POLES, DEG), DEG + 1)
    expect(B.length).toBe(DEG + 1 - POLES.length)
    const A = combine(B, [C(1, 0.3), C(-0.4, 0.8), C(0.7, -0.2)], DEG)
    const defect = Math.max(...POLES.map((r, k) =>
      cnorm(csub(evalAt(deriv(A), r), cmul(bigSigma(POLES, k), evalAt(A, r))))))
    expect(defect).toBeLessThan(1e-12)
  })

  it('σ = A·A† is real, and σ(r) = A(r)·conj(A(r̄)) — a PRODUCT', () => {
    const B = nullspace(conditionRows(POLES, DEG), DEG + 1)
    const A = combine(B, [C(1, 0.3), C(-0.4, 0.8), C(0.7, -0.2)], DEG)
    const sigma = mul(A, dagger(A))
    expect(Math.max(...sigma.map((c) => Math.abs(c.im)))).toBeLessThan(1e-12)
    for (const r of POLES) {
      const lhs = evalAt(sigma, r)
      const rhs = cmul(evalAt(A, r), cconj(evalAt(A, cconj(r))))
      expect(cnorm(csub(lhs, rhs))).toBeLessThan(1e-12)
    }
  })

  it('so a SOFT pole forces a FAKE one — the pair is never {soft, soft}', () => {
    // Force σ(r₂) = 0 the only way the product allows, and watch a generator root land ON a
    // pole. In space both members of the pair are soft with 𝒜(r) ≠ 0; here one must vanish.
    const extra = [Array.from({ length: DEG + 1 }, (_, j) => {
      const mono: CP = Array.from({ length: DEG + 1 }, (_, i) => (i === j ? C(1) : C(0)))
      return evalAt(mono, POLES[2])
    })]
    const B = nullspace(conditionRows(POLES, DEG, extra), DEG + 1)
    expect(B.length).toBeGreaterThan(0)
    const A = combine(B, [C(1, 0.2), C(-0.5, 0.9)], DEG)
    const sigma = mul(A, dagger(A))

    // Both members of the pair are σ = 0 — as the real coefficients require…
    expect(cnorm(evalAt(sigma, POLES[2]))).toBeLessThan(1e-10)
    expect(cnorm(evalAt(sigma, POLES[3]))).toBeLessThan(1e-10)
    // …but one of them has the GENERATOR vanishing: a degree drop, not rank one.
    const a2 = cnorm(evalAt(A, POLES[2]))
    const a3 = cnorm(evalAt(A, POLES[3]))
    expect(Math.min(a2, a3)).toBeLessThan(1e-10)
    expect(Math.max(a2, a3)).toBeGreaterThan(1)      // the partner is healthy, and soft
    // The other pair is untouched and hard.
    expect(cnorm(evalAt(sigma, POLES[0]))).toBeGreaterThan(1)
  })

  it('and the fake pole CANCELS — the curve has fewer poles than its pole set', () => {
    // A(r) = 0 makes N = A² have a double root at r, and w² has a double root there, so
    // c′ = N/w² is regular: r is not a pole of the curve at all.
    const extra = [Array.from({ length: DEG + 1 }, (_, j) => {
      const mono: CP = Array.from({ length: DEG + 1 }, (_, i) => (i === j ? C(1) : C(0)))
      return evalAt(mono, POLES[2])
    })]
    const B = nullspace(conditionRows(POLES, DEG, extra), DEG + 1)
    const A = combine(B, [C(1, 0.2), C(-0.5, 0.9)], DEG)
    const N = mul(A, A)
    const r = POLES[2]
    // N/(t−r)² stays finite as t → r: sample the quotient on a small circle.
    let worst = 0
    for (let j = 0; j < 32; j++) {
      const th = (2 * Math.PI * j) / 32
      const z = cadd(r, C(1e-4 * Math.cos(th), 1e-4 * Math.sin(th)))
      const d = csub(z, r)
      worst = Math.max(worst, cnorm(cdiv(evalAt(N, z), cmul(d, d))))
    }
    expect(Number.isFinite(worst)).toBe(true)
    expect(worst).toBeLessThan(1e6)          // bounded: the double root really is there
  })
})
