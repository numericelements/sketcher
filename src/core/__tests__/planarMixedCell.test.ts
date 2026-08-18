// ============================================================================
// THE PLANAR MIXED CELL EXISTS — one pole pair soft, the other hard, and it is a LINEAR
// SUBSPACE. No continuation, no solver, no witness-hunting: a nullspace.
//
// This is the planar shadow of the spatial mixed-cell work (docs/THE_MAP.md §6,
// __tests__/mixedCellExists.test.ts), and it was thought impossible. The reasoning that
// forbade it — planarSoftForcesFake.test.ts — was that σ = A·A† is a PRODUCT on ℂ ⊕ ℂ, so
// a soft pair drags a generator root onto one of its members, and that member's pole was
// believed to CANCEL, leaving a curve with fewer poles wearing a bigger pole set. The
// cancellation claim was wrong (corrected in that file: only the holomorphic half x′ + iy′
// cancels; the real components keep the double pole). With it goes the obstruction.
//
// WHAT IS MEASURED HERE, on POLES = {0.6±0.9i, −0.5±0.7i} with deg A = 6:
//
//     pair {r₀,r₁}   σ(r) = 228          V·V = 223        HARD
//     pair {r₂,r₃}   σ(r) = 2.9e-14      V·V = 3.8e-14    SOFT — residues ISOTROPIC
//     every pole     |V| = 8.5 … 12.3                     a GENUINE pole, all four
//
// The soft pair is soft in the residue-cone sense of §2d — V·V = 0, V on the null cone —
// at BOTH members, even though the generator vanishes at only one of them. That asymmetry
// (A(r₂) = 2e-15, A(r₃) = 12.3) is the plane's substitute for the spatial rank-one floor,
// and it is invisible from the curve: the two poles look alike.
//
// AND THE CELL IS LINEAR. The no-log condition A′(r) = Σ_k A(r) is linear in A and so is
// the softness condition A(r₂) = 0, so the mixed cell is the nullspace of 5 rows on 7
// coefficients: complex dimension 2, reached by Gaussian elimination. In space the same
// cell took a Newton solve on a quadratic system and three weeks of chart trouble. THE
// PLANE IS WHERE THIS IS EASY, not where it is impossible.
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
const padd = (a: CP, b: CP): CP =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => cadd(a[i] ?? C(0), b[i] ?? C(0)))
const psc = (a: CP, k: number): CP => a.map((z) => cscale(z, k))
const dagger = (p: CP): CP => p.map(cconj)

const bigSigma = (R: readonly Complex[], k: number): Complex => {
  let s: Complex = C(0)
  for (let l = 0; l < R.length; l++) if (l !== k) s = cadd(s, cdiv(C(1), csub(R[k], R[l])))
  return s
}

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

const POLES: readonly Complex[] = [C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7)]
const DEG = 6
const SOFT = 2                                        // the pair {r₂, r₃}

/** Rows for A′(r_k) − Σ_k A(r_k) = 0 at every pole, plus A(r_SOFT) = 0. */
const mixedCellRows = (): Complex[][] => {
  const mono = (j: number): CP => Array.from({ length: DEG + 1 }, (_, i) => (i === j ? C(1) : C(0)))
  return [
    ...POLES.map((r, k) => {
      const S = bigSigma(POLES, k)
      return Array.from({ length: DEG + 1 }, (_, j) =>
        csub(evalAt(deriv(mono(j)), r), cmul(S, evalAt(mono(j), r))))
    }),
    Array.from({ length: DEG + 1 }, (_, j) => evalAt(mono(j), POLES[SOFT])),
  ]
}

/** A member of the cell, from a fixed complex combination of the basis. */
function member(cs: readonly Complex[]): CP {
  const B = nullspace(mixedCellRows(), DEG + 1)
  const A: CP = Array.from({ length: DEG + 1 }, () => C(0))
  B.forEach((b, i) => b.forEach((v, j) => { A[j] = cadd(A[j], cmul(cs[i % cs.length], v)) }))
  return A
}

/** v_k = w/(t − r_k). */
const vAt = (k: number): CP => {
  let v: CP = [C(1)]
  POLES.forEach((r, l) => { if (l !== k) v = mul(v, [cscale(r, -1), C(1)]) })
  return v
}

/** The real hodograph numerators: x′ = X/w², y′ = Y/w², both REAL polynomials. */
const numerators = (A: CP): { X: CP; Y: CP; sigma: CP } => {
  const Ad = dagger(A)
  const N = mul(A, A), Nd = mul(Ad, Ad)
  return {
    X: psc(padd(N, Nd), 0.5),
    Y: psc(padd(N, psc(Nd, -1)), 0.5).map((z) => cdiv(z, C(0, 1))),
    sigma: mul(A, Ad),
  }
}

/** Res_{r_k}[P/w²] = [P′v − 2Pv′]/v³ at r_k — exact, no differencing. */
const logResidue = (P: CP, k: number): Complex => {
  const r = POLES[k], v = vAt(k)
  const vr = evalAt(v, r)
  return cdiv(
    csub(cmul(evalAt(deriv(P), r), vr), cscale(cmul(evalAt(P, r), evalAt(deriv(v), r)), 2)),
    cmul(cmul(vr, vr), vr))
}

/** The curve's own residue: coefficient of 1/(t−r_k) in ∫P/w². */
const curveResidue = (P: CP, k: number): Complex => {
  const vr = evalAt(vAt(k), POLES[k])
  return cscale(cdiv(evalAt(P, POLES[k]), cmul(vr, vr)), -1)
}

const CS = [C(1, 0.2), C(-0.5, 0.9)]

describe('the planar mixed cell', () => {
  it('is a LINEAR subspace of complex dimension 2 — a nullspace, not a solve', () => {
    const B = nullspace(mixedCellRows(), DEG + 1)
    expect(B.length).toBe(DEG + 1 - POLES.length - 1)     // 7 − 4 − 1 = 2
    // every basis element already satisfies both kinds of condition
    for (const b of B) {
      expect(cnorm(evalAt(b, POLES[SOFT]))).toBeLessThan(1e-12)
      for (let k = 0; k < POLES.length; k++) {
        expect(cnorm(csub(evalAt(deriv(b), POLES[k]),
          cmul(bigSigma(POLES, k), evalAt(b, POLES[k]))))).toBeLessThan(1e-12)
      }
    }
  })

  it('one pair is SOFT and the other HARD — the mixed configuration itself', () => {
    const A = member(CS)
    const { sigma } = numerators(A)
    const s = POLES.map((r) => cnorm(evalAt(sigma, r)))

    expect(s[0]).toBeGreaterThan(1)                       // hard pair
    expect(s[1]).toBeGreaterThan(1)
    expect(s[2]).toBeLessThan(1e-10)                      // soft pair
    expect(s[3]).toBeLessThan(1e-10)
    expect(s[0] / s[2]).toBeGreaterThan(1e12)             // no tolerance-picking

    // The plane's substitute for the rank-one floor: the generator vanishes at ONE member.
    expect(cnorm(evalAt(A, POLES[2]))).toBeLessThan(1e-10)
    expect(cnorm(evalAt(A, POLES[3]))).toBeGreaterThan(1)
  })

  it('and it is soft in the RESIDUE-CONE sense: V·V = 0 at both members of the pair', () => {
    // The §2d dictionary, in the plane. V = (Vx, Vy) ∈ ℂ², bilinear dot.
    const A = member(CS)
    const { X, Y } = numerators(A)
    const VV = POLES.map((_, k) => {
      const vx = curveResidue(X, k), vy = curveResidue(Y, k)
      return cnorm(cadd(cmul(vx, vx), cmul(vy, vy)))
    })
    expect(VV[0]).toBeGreaterThan(1)
    expect(VV[1]).toBeGreaterThan(1)
    expect(VV[2]).toBeLessThan(1e-10)                     // isotropic
    expect(VV[3]).toBeLessThan(1e-10)
  })

  it('ALL FOUR poles are genuine — including the one where the generator vanishes', () => {
    // This is the step the old "the fake pole cancels" claim denied, and the whole reason
    // the cell exists. A pole with zero residue would be no pole, and the cell would be a
    // three-pole curve in disguise.
    const A = member(CS)
    const { X, Y } = numerators(A)
    for (let k = 0; k < POLES.length; k++) {
      const r = Math.hypot(cnorm(curveResidue(X, k)), cnorm(curveResidue(Y, k)))
      expect(r).toBeGreaterThan(1)
    }
    // Primitivity: no pole is a common root of the real numerators, so nothing reduces.
    for (const r of POLES) {
      expect(Math.max(cnorm(evalAt(X, r)), cnorm(evalAt(Y, r)))).toBeGreaterThan(1)
    }
  })

  it('is RATIONAL: no logarithm at any pole, in the real components', () => {
    // Exact residues of x′ and y′ — not of the holomorphic combination, which is the
    // object the superseded claim was measuring.
    const A = member(CS)
    const { X, Y } = numerators(A)
    for (let k = 0; k < POLES.length; k++) {
      expect(cnorm(logResidue(X, k))).toBeLessThan(1e-9)
      expect(cnorm(logResidue(Y, k))).toBeLessThan(1e-9)
    }
  })

  it('is PH: X² + Y² = σ², with σ the REAL polynomial A·A†', () => {
    const A = member(CS)
    const { X, Y, sigma } = numerators(A)
    for (const p of [X, Y, sigma]) expect(Math.max(...p.map((z) => Math.abs(z.im)))).toBeLessThan(1e-10)
    const d = padd(padd(mul(X, X), mul(Y, Y)), psc(mul(sigma, sigma), -1))
    const scale = Math.max(...mul(sigma, sigma).map(cnorm))
    expect(Math.max(...d.map(cnorm)) / scale).toBeLessThan(1e-12)
  })

  it('and it is not one lucky point — a second, independent member does the same', () => {
    const A = member([C(-0.3, 1.1), C(0.8, 0.25)])
    const { sigma } = numerators(A)
    expect(cnorm(evalAt(sigma, POLES[0]))).toBeGreaterThan(1)
    expect(cnorm(evalAt(sigma, POLES[2]))).toBeLessThan(1e-10)
    for (let k = 0; k < POLES.length; k++) {
      const { X, Y } = numerators(A)
      expect(cnorm(logResidue(X, k))).toBeLessThan(1e-9)
      expect(Math.hypot(cnorm(curveResidue(X, k)), cnorm(curveResidue(Y, k)))).toBeGreaterThan(0.5)
    }
  })
})
