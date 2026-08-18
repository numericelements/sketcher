// ============================================================================
// THE COLUMN B COUNT — how many of the null cone's free (a, b) survive imposing PH.
//
// docs/THE_MAP.md §2d proposes charting the CURVE instead of the generator:
//
//     COLUMN A  generator first    c′ = 𝒜i𝒜*/w²     PH free, PAY residue conditions
//     COLUMN B  curve first        c = P + ΣVₖ/(t−rₖ)  rationality free, PAY PH
//
// and observes that soft ⟺ Vₖ·Vₖ = 0, a quadric with the rational parameterisation
// Vₖ = (a²−b², i(a²+b²), 2ab). So soft RESIDUES are dialable with no solving. Soft PH
// CURVES are a different claim: PH is entirely unpaid, and this file pays it and counts
// what is left. Measured at the AllSoft point the ε-drive reaches from the m = 4 mixed
// witness (softness ≤ 2.6e-16, ‖𝒜(rₖ)‖² = 1.193 and 0.771 — rank one, nothing cancelling).
//
// THE TWO COLUMNS, at m = 4 poles and deg 𝒜 = 4:
//
//     A   20 spinor reals − rank(residue conditions) − 1 gauge          → dim 7
//     B   20 params (3 P′ + 8 cone + 9 σ) − rank(M·M − σ²)              → dim 7
//     B   24 params (3 P′ + 12 free V + 9 σ), same equations            → dim 7
//
// THE ANSWER TO THE COUNT. Of the eight dialable cone reals, PH pins SEVEN; one survives.
// And the three dimensions above agree, so **Column B reaches exactly what Column A does
// and nothing more** — the trade buys a construction (no solving on the residue side), not
// new curves. Every rank below is stable across h = 1e-4, 1e-5, 1e-6.
//
// TWO THINGS FOUND ON THE WAY, both bigger than the count itself:
//
//   · SOFTNESS COSTS NOTHING HERE. The four rows d(σ(r₀), σ(r₂)) lie INSIDE the row space
//     of the twelve residue conditions (residual 1e-8), and a finite walk — 0.27 in a
//     unit-norm spinor, three independent kernel directions — stays soft to 1e-13. AllSoft
//     is not a codimension-4 stratum at (n, m) = (4, 4); it is full-dimensional.
//     Sampling agrees: 113 AllSoft, 79 Mixed out of 240 Newton starts.
//
//   · EVERY ALL-HARD SOLUTION IS A STRAIGHT LINE. All 48 all-hard hits have hodograph rank
//     ONE — N₁, N₂, N₃ proportional, so c′ ∥ a fixed vector. Not one genuine spatial
//     all-hard curve appears in 240 starts. Since the λ-chart needs σ(r) ≠ 0 at EVERY pole,
//     this says the λ-chart's home stratum is (as far as sampling reaches) EMPTY at this
//     configuration — which is a far better explanation of three weeks of chart trouble
//     than ill-conditioning was. Sampling is not a proof; it is 240 deterministic starts.
//
// THE GUARD THAT MADE IT VISIBLE: `hodographRank`. A degenerate member wears a σ pattern —
// this one read "AllHard, softness 0.59 and 1.00" — and its PH Jacobian collapses from
// rank 17 to 9. Check the rank of N as a 3 × (2n+1) matrix before believing any stratum
// label. THE_MAP §3 warns about the scalar factor μ; this is a different degeneracy and
// the μ check does not catch it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm } from '../complex'
import { QUAT_I, qmul, qscale } from '../quaternion'
import {
  type PoleSet, toSpinor, fromSpinor, poleDiagnostics, residueConditions, spinorAt,
  newtonToResidue,
} from '../rationalPHResidue'
import { sandwichPolynomial } from '../conformalPHHopf'

const C = (re: number, im = 0): Complex => ({ re, im })

const M4_POLES: PoleSet = [
  { re: 0.6, im: 0.9 }, { re: 0.6, im: -0.9 },
  { re: -0.5, im: 0.7 }, { re: -0.5, im: -0.7 },
]
const REPS = [0, 2]

/** The ε-drive's AllSoft endpoint from the m = 4 mixed witness, pinned at full precision. */
const ALL_SOFT: number[] = [
  -1.34401181579331175e-1, -1.95620802540370203e-1, 1.45988577551010940e-1, 3.04277580191092967e-1,
  -2.05476907708698669e-1, 3.68800820152866748e-1, -3.32372283881334885e-1, 2.29073013439802631e-1,
  -3.99658297176502975e-1, -1.81891397971933821e-1, -8.45113703231095276e-2, -4.04008504203267504e-1,
  -1.79582358326706090e-2, 4.65517089431909947e-2, -1.87784872769634847e-1, 1.28490228435481468e-1,
  5.65991848385315952e-2, 7.80919271234360376e-3, -9.39768869841775406e-2, -2.43014169068432567e-1,
]

// --- real and complex polynomial helpers -----------------------------------
type R = number[]
const rmul = (a: R, b: R): R => {
  const o = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j]
  return o
}
const cev = (p: Complex[], z: Complex): Complex => {
  let a = C(0)
  for (let k = p.length - 1; k >= 0; k--) a = cadd(cmul(z, a), p[k])
  return a
}
const cmulP = (a: Complex[], b: Complex[]): Complex[] => {
  const o: Complex[] = Array.from({ length: a.length + b.length - 1 }, () => C(0))
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) o[i + j] = cadd(o[i + j], cmul(a[i], b[j]))
  return o
}

/** w = Π(t − r_k), real; and v_k = w/(t − r_k) as a complex polynomial. */
const W: R = (() => {
  let w: Complex[] = [C(1)]
  for (const r of M4_POLES) w = cmulP(w, [cscale(r, -1), C(1)])
  return w.map((z) => z.re)
})()
const W2 = rmul(W, W)
const vOf = (k: number): Complex[] => {
  let v: Complex[] = [C(1)]
  M4_POLES.forEach((r, l) => { if (l !== k) v = cmulP(v, [cscale(r, -1), C(1)]) })
  return v
}
const V0SQ = cmulP(vOf(0), vOf(0))
const V2SQ = cmulP(vOf(2), vOf(2))

/** The null-cone parameterisation of ℂ³: V·V = 0 identically. */
const cone = (a: Complex, b: Complex): [Complex, Complex, Complex] => {
  const a2 = cmul(a, a), b2 = cmul(b, b)
  return [csub(a2, b2), cmul(C(0, 1), cadd(a2, b2)), cscale(cmul(a, b), 2)]
}
/** Its inverse: a² = (V₁ − iV₂)/2, b² = −(V₁ + iV₂)/2, sign of b fixed by 2ab = V₃. */
const uncone = (V: readonly Complex[]): [Complex, Complex] => {
  const csqrt = (z: Complex): Complex => {
    const m = Math.sqrt(cnorm(z)), th = Math.atan2(z.im, z.re) / 2
    return C(m * Math.cos(th), m * Math.sin(th))
  }
  const a = csqrt(cscale(csub(V[0], cmul(C(0, 1), V[1])), 0.5))
  let b = csqrt(cscale(cadd(V[0], cmul(C(0, 1), V[1])), -0.5))
  if (cnorm(csub(cscale(cmul(a, b), 2), V[2])) > cnorm(cadd(cscale(cmul(a, b), 2), V[2]))) b = cscale(b, -1)
  return [a, b]
}

/** Column B: parameters → the hodograph numerator M, three real polynomials of degree 8. */
function numeratorFromB(p: readonly number[], freeResidues = false): [R, R, R] {
  const V: [Complex, Complex, Complex][] = []
  if (freeResidues) {
    for (let j = 0; j < 2; j++) {
      const o = 3 + 6 * j
      V.push([C(p[o], p[o + 1]), C(p[o + 2], p[o + 3]), C(p[o + 4], p[o + 5])])
    }
  } else {
    for (let j = 0; j < 2; j++) {
      const o = 3 + 4 * j
      V.push(cone(C(p[o], p[o + 1]), C(p[o + 2], p[o + 3])))
    }
  }
  const out: [R, R, R] = [[], [], []]
  for (let i = 0; i < 3; i++) {
    const m = W2.map((c) => c * p[i])
    // V_k v_k² + conj(V_k) conj(v_k)² = 2·Re(V_k v_k²) — the conjugate pole contributes it
    for (const [Vk, vsq] of [[V[0][i], V0SQ], [V[1][i], V2SQ]] as [Complex, Complex[]][]) {
      vsq.forEach((c, j) => { m[j] -= 2 * (Vk.re * c.re - Vk.im * c.im) })
    }
    out[i] = m
  }
  return out
}

/** Coefficients of M·M − σ², the PH condition. Degree 16 ⇒ 17 real equations. */
function phResidual(p: readonly number[], nS: number, freeResidues = false): number[] {
  const M = numeratorFromB(p, freeResidues)
  const s = p.slice(p.length - nS)
  const mm = M.reduce<R>((acc, m) => {
    const q = rmul(m, m)
    return q.map((c, i) => c + (acc[i] ?? 0))
  }, [])
  const ss = rmul(s, s)
  return Array.from({ length: Math.max(mm.length, ss.length) }, (_, i) => (mm[i] ?? 0) - (ss[i] ?? 0))
}

/** Column A: the residue conditions plus σ(r) = 0 at one representative per pair. */
function columnAResidual(x: readonly number[]): number[] {
  const A = toSpinor(x)
  const out = [...residueConditions(A, M4_POLES, REPS)]
  for (const k of REPS) {
    const q = spinorAt(A, M4_POLES[k])
    let s = C(0)
    for (const z of q) s = cadd(s, cmul(z, z))
    out.push(s.re, s.im)
  }
  return out
}

function jacobian(F: (x: number[]) => number[], x0: readonly number[], h: number): number[][] {
  const rows = F([...x0]).length
  const J = Array.from({ length: rows }, () => new Array(x0.length).fill(0))
  for (let j = 0; j < x0.length; j++) {
    const step = h * Math.max(1, Math.abs(x0[j]))
    const up = [...x0]; up[j] += step
    const dn = [...x0]; dn[j] -= step
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * step)
  }
  return J
}

/** Singular values by Jacobi on JᵀJ. */
function singularValues(J: number[][]): number[] {
  const m = J.length, n = J[0].length
  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0
      for (let k = 0; k < m; k++) s += J[k][i] * J[k][j]
      return s
    }))
  for (let sweep = 0; sweep < 300; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j]
    if (off < 1e-30) break
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-20) continue
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
      const c = 1 / Math.sqrt(t * t + 1), s = t * c
      for (let k = 0; k < n; k++) {
        const a1 = A[k][p], a2 = A[k][q]
        A[k][p] = c * a1 - s * a2; A[k][q] = s * a1 + c * a2
      }
      for (let k = 0; k < n; k++) {
        const a1 = A[p][k], a2 = A[q][k]
        A[p][k] = c * a1 - s * a2; A[q][k] = s * a1 + c * a2
      }
    }
  }
  return Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, A[i][i]))).sort((a, b) => b - a)
}

const rankOf = (sv: number[], tol = 1e-7): number => sv.filter((v) => v > sv[0] * tol).length

/** A spinor solution, translated into Column B coordinates (cone form and free-V form). */
function startB(x: readonly number[] = ALL_SOFT): {
  p: number[]; freeStart: number[]; nS: number
} {
  const A = toSpinor(x)
  const N = sandwichPolynomial(A)
  const p = [N[0][8], N[1][8], N[2][8]]                    // W² is monic of degree 8
  const raw: number[] = []
  for (const k of [0, 2]) {
    const vr = cev(vOf(k), M4_POLES[k]), vr2 = cmul(vr, vr)
    const V = N.map((n) => cscale(cdiv(cev(n.map((c) => C(c)), M4_POLES[k]), vr2), -1))
    const [a, b] = uncone(V)                               // exact only when V·V = 0
    p.push(a.re, a.im, b.re, b.im)
    raw.push(V[0].re, V[0].im, V[1].re, V[1].im, V[2].re, V[2].im)
  }
  // σ = |𝒜|², the real polynomial with N·N = σ²
  const n = A.length - 1
  const s = new Array(2 * n + 1).fill(0)
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    s[i + j] += A[i].u * A[j].u + A[i].v * A[j].v + A[i].p * A[j].p + A[i].q * A[j].q
  }
  return { p: [...p, ...s], freeStart: [...p.slice(0, 3), ...raw, ...s], nS: s.length }
}

/** Rank of N as a 3 × (2n+1) coefficient matrix. 1 = straight line, 2 = planar, 3 = spatial. */
function hodographRank(x: readonly number[]): number {
  const N = sandwichPolynomial(toSpinor(x))
  const scale = Math.max(...N.flat().map(Math.abs))
  const M = N.map((r) => r.map((v) => v / scale))
  const sv = singularValues(M[0].map((_, j) => M.map((r) => r[j])))
  return sv.filter((v) => v > sv[0] * 1e-8).length
}

/** Projection of d onto the row space of M, via the normal equations. */
function projectOntoRows(M: number[][], d: readonly number[]): number[] {
  const m = M.length
  const rhs = M.map((r) => r.reduce((s, v, k) => s + v * d[k], 0))
  const G = Array.from({ length: m }, (_, i) => Array.from({ length: m + 1 }, (_, j) =>
    j === m ? rhs[i] : M[i].reduce((s, v, k) => s + v * M[j][k], 0)))
  for (let c = 0; c < m; c++) {
    let piv = c
    for (let r = c; r < m; r++) if (Math.abs(G[r][c]) > Math.abs(G[piv][c])) piv = r
    ;[G[c], G[piv]] = [G[piv], G[c]]
    if (Math.abs(G[c][c]) < 1e-14) continue
    for (let r = 0; r < m; r++) {
      if (r === c) continue
      const f = G[r][c] / G[c][c]
      for (let k = c; k <= m; k++) G[r][k] -= f * G[c][k]
    }
  }
  const co = G.map((row, i) => (Math.abs(row[i]) < 1e-14 ? 0 : row[m] / row[i]))
  return Array.from({ length: d.length }, (_, j) => M.reduce((s, row, i) => s + co[i] * row[j], 0))
}

const residueJ = (x: readonly number[]) =>
  jacobian((y) => residueConditions(toSpinor(y), M4_POLES, REPS), x, 1e-6)

const softnessRows = (x: readonly number[]) => jacobian((y) => {
  const out: number[] = []
  for (const k of REPS) {
    let a = C(0)
    for (const z of spinorAt(toSpinor(y), M4_POLES[k])) a = cadd(a, cmul(z, z))
    out.push(a.re, a.im)
  }
  return out
}, x, 1e-6)

/** Deterministic Newton starts onto the residue conditions — the sampling used below. */
function* residueSamples(count: number): Generator<number[]> {
  for (let t = 0; t < count; t++) {
    const raw = Array.from({ length: 20 }, (_, i) => (t % 3 === 0
      ? Math.sin(1.7 * i + 2.3 * t + 0.4)
      : t % 3 === 1 ? Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t)
      : Math.sin(0.9 * i - 1.1 * t) * Math.cos(0.5 * i * i + t)))
    const n = Math.hypot(...raw) || 1
    const x = newtonToResidue(raw.map((v) => v / n), M4_POLES, REPS, undefined, 200)
    if (x) yield x
  }
}

describe('the Column B count', () => {
  it('the AllSoft start really is all soft, rank one, spatial, and rational', () => {
    const A = toSpinor(ALL_SOFT)
    for (const d of poleDiagnostics(A, M4_POLES)) {
      expect(d.softness).toBeLessThan(1e-14)
      expect(d.hermitian).toBeGreaterThan(0.5)             // 1.193 and 0.771: nothing cancels
    }
    expect(hodographRank(ALL_SOFT)).toBe(3)                // not a line, not planar
    expect(Math.max(...columnAResidual(ALL_SOFT).map(Math.abs))).toBeLessThan(1e-12)
  })

  it('the cone parameterisation reproduces the curve exactly — B coordinates are faithful', () => {
    const { p, nS } = startB()
    const M = numeratorFromB(p)
    const N = sandwichPolynomial(toSpinor(ALL_SOFT))
    const scale = Math.max(...N.flat().map(Math.abs))
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < N[i].length; j++) {
        expect(Math.abs(M[i][j] - N[i][j]) / scale).toBeLessThan(1e-9)
      }
    }
    expect(Math.max(...phResidual(p, nS).map(Math.abs)) / (scale * scale)).toBeLessThan(1e-9)
  })

  it('COLUMN A: the residue variety is 7-dimensional — rank 12 of 20, less the gauge', () => {
    const J = residueJ(ALL_SOFT)
    expect(J.length).toBe(12)

    // The symmetry group must be in the kernel before any rank is believed: Spin(3) and
    // scaling act on the whole configuration with the poles fixed, so dim < 4 would be a bug.
    const A = toSpinor(ALL_SOFT)
    const dirs = [
      A.map((q) => qmul(q, QUAT_I)),
      A.map((q) => qmul({ u: 0, v: 1, p: 0, q: 0 }, q)),
      A.map((q) => qmul({ u: 0, v: 0, p: 1, q: 0 }, q)),
      A.map((q) => qmul({ u: 0, v: 0, p: 0, q: 1 }, q)),
      A.map((q) => qscale(q, 1)),
    ].map(fromSpinor)
    for (const g of dirs) {
      const Jg = J.map((row) => row.reduce((s, v, i) => s + v * g[i], 0))
      expect(Math.hypot(...Jg) / Math.hypot(...g)).toBeLessThan(1e-6)
    }

    const sv = singularValues(J)
    expect(sv[11] / sv[0]).toBeGreaterThan(1e-4)
    expect(sv[12] / sv[0]).toBeLessThan(1e-7)
    expect(rankOf(sv)).toBe(12)
    expect(20 - 12 - 1).toBe(7)
  })

  it('SOFTNESS COSTS NOTHING: its rows sit inside the residue row space, and a FINITE walk stays soft',
    () => {
    const JR = residueJ(ALL_SOFT)
    for (const row of softnessRows(ALL_SOFT)) {
      const proj = projectOntoRows(JR, row)
      const res = Math.hypot(...row.map((v, k) => v - proj[k])) / Math.hypot(...row)
      expect(res).toBeLessThan(1e-6)                       // measured 1e-8 … 1e-10
    }

    // Tangency alone would not settle it — walk a finite distance and re-solve.
    for (const seed of [1, 2, 3]) {
      let d = Array.from({ length: 20 }, (_, i) =>
        Math.sin(3.1 * i + 1.7 * seed) + Math.cos(0.9 * i * i + seed))
      const proj = projectOntoRows(JR, d)
      d = d.map((v, k) => v - proj[k])
      const dn = Math.hypot(...d)
      d = d.map((v) => v / dn)
      for (const delta of [1e-2, 1e-1, 3e-1]) {
        const y = newtonToResidue(ALL_SOFT.map((v, k) => v + delta * d[k]), M4_POLES, REPS, undefined, 200)
        expect(y).not.toBeNull()
        expect(Math.hypot(...y!.map((v, k) => v - ALL_SOFT[k]))).toBeGreaterThan(delta * 0.5)
        for (const q of poleDiagnostics(toSpinor(y!), M4_POLES)) expect(q.softness).toBeLessThan(1e-10)
      }
    }
  })

  it('COLUMN B: the cone gives dimension 7 too — the same family, not a bigger one', () => {
    const { p, nS } = startB()
    expect(p.length).toBe(20)                              // 3 P′ + 8 cone + 9 σ
    for (const h of [1e-4, 1e-5, 1e-6]) {
      const sv = singularValues(jacobian((x) => phResidual(x, nS), p, h))
      expect(rankOf(sv)).toBe(13)
      expect(20 - 13).toBe(7)                              // == Column A
    }
  })

  it('THE COUNT: of the eight dialable cone reals, PH pins seven and one survives', () => {
    const { p, nS } = startB()
    const J = jacobian((x) => phResidual(x, nS), p, 1e-5)
    const sub = J.map((row) => [3, 4, 5, 6, 7, 8, 9, 10].map((c) => row[c]))
    const sv = singularValues(sub)
    expect(sv[6] / sv[0]).toBeGreaterThan(1e-4)            // 4.6e-3 against 1.0e+1
    expect(sv[7] / sv[0]).toBeLessThan(1e-12)
    expect(rankOf(sv)).toBe(7)
  })

  it('and FREE residues give 7 as well — the cone costs exactly the four it should', () => {
    // 24 params instead of 20; if the cone did anything beyond imposing V·V = 0, the two
    // dimensions would differ.
    const { p, nS, freeStart } = startB()
    expect(freeStart.length).toBe(24)
    expect(Math.max(...phResidual(freeStart, nS, true).map(Math.abs))).toBeLessThan(1e-9)
    for (const h of [1e-4, 1e-5, 1e-6]) {
      const sv = singularValues(jacobian((x) => phResidual(x, nS, true), freeStart, h))
      expect(rankOf(sv)).toBe(17)
      expect(24 - 17).toBe(7)
    }
    expect(p.length).toBe(20)
  })

  it('EVERY all-hard solution at (n, m) = (4, 4) is a STRAIGHT LINE', { timeout: 60000 }, () => {
    const tally: Record<string, number> = {}
    for (const x of residueSamples(240)) {
      const d = poleDiagnostics(toSpinor(x), M4_POLES)
      const soft = d.map((q) => q.softness < 1e-8)
      const label = soft.every(Boolean) ? 'AllSoft' : soft.some(Boolean) ? 'Mixed' : 'AllHard'
      tally[label + '/' + hodographRank(x)] = (tally[label + '/' + hodographRank(x)] ?? 0) + 1
    }
    // Genuinely spatial members are soft or mixed; every all-hard hit is rank ONE.
    expect(tally['AllSoft/3']).toBeGreaterThan(80)         // 113
    expect(tally['Mixed/3']).toBeGreaterThan(50)           // 79
    expect(tally['AllHard/1']).toBeGreaterThan(20)         // 48
    expect(tally['AllHard/3'] ?? 0).toBe(0)                // NOT ONE genuine all-hard curve
    expect(tally['AllSoft/1'] ?? 0).toBe(0)
    expect(tally['Mixed/1'] ?? 0).toBe(0)
  })

  it('and the degeneracy is what collapses the PH Jacobian — the guard is load-bearing', () => {
    // The straight line reads "AllHard, softness 0.59 and 1.00" and its Column B rank falls
    // from 17 to 9, because M₁, M₂, M₃ proportional makes M·δM nearly one-dimensional.
    let line: number[] | null = null
    for (const x of residueSamples(40)) if (hodographRank(x) === 1) { line = x; break }
    expect(line).not.toBeNull()
    const d = poleDiagnostics(toSpinor(line!), M4_POLES)
    expect(Math.min(...d.map((q) => q.softness))).toBeGreaterThan(0.4)    // wears "AllHard"
    const st = startB(line!)
    const sv = singularValues(jacobian((x) => phResidual(x, st.nS, true), st.freeStart, 1e-5))
    expect(rankOf(sv)).toBeLessThan(12)                    // 9 — nowhere near the generic 17
  })
})
