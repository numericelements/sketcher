// ============================================================================
// CHECKING A CLAIM FROM ELSEWHERE: is the multi-pole no-log condition BILINEAR, hence linear per λ?
//
// The claim, which arrived from another session and is therefore checked here before anything is written
// on its strength: the condition 𝒜′(rₖ) = 𝒜(rₖ)(Σₖ + λₖ i) is bilinear in (𝒜, λ), so FIXING the λₖ
// leaves it LINEAR in 𝒜 — and that generalises past one pole. If true, the recipe is
//
//     choose the roots  →  choose one slider λₖ per root  →  LINEAR solve for 𝒜  →  LINEAR solve for p
//
// with no elimination anywhere, and this repository's standing caveat ("one pole; two or more and the
// conditions couple") is too conservative and must be corrected in F14, F16 and three slides.
//
// THE COUNT TO EXPECT, and it is a good consistency check on the whole story. With λ FREE the condition
// is 3 real conditions per root (F14: the residue is a vector). With λ FIXED it is 4 — the quaternion
// equation outright — because the λ-direction stops being free. So the admissible 𝒜 should form a linear
// subspace of dimension
//
//     4(n+1) − 4m          deg 𝒜 = n,  m simple roots
//
// and for n = 2, m = 1 that is 8, which is exactly the (B₀, B₂) parametrisation the one-pole module uses.
// If the measured nullity matches at m = 2 and m = 3, the claim holds.
//
// ALSO CHECKED: the 𝒜(rₖ) = 0 stratum, which the derivation silently divided away. There the condition
// should hold for FREE — N = 𝒜i𝒜̄ acquires a double zero, so N′(r) = 0 — and the apparent pole should
// CANCEL, meaning the curve does not pass through infinity there at all.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const rDeriv = (p: RPoly): RPoly => p.slice(1).map((c, i) => c * (i + 1))
const parts = (a: Quat): number[] => [a.u, a.v, a.p, a.q]
const UNITS: Quat[] = [Q(1, 0, 0, 0), Q(0, 1, 0, 0), Q(0, 0, 1, 0), Q(0, 0, 0, 1)]

const polyFromRoots = (roots: readonly number[]): RPoly =>
  roots.reduce<RPoly>((acc, r) => {
    const out = new Array(acc.length + 1).fill(0)
    for (let i = 0; i < acc.length; i++) { out[i + 1] += acc[i]; out[i] += -r * acc[i] }
    return out
  }, [1])

const sigmaOf = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

/**
 * The condition rows for FIXED λ: 𝒜′(rₖ) − 𝒜(rₖ)(Σₖ + λₖ i) = 0, four real rows per root, assembled
 * against the power-basis coefficients of 𝒜. Building it column by column from the quaternion units is
 * what makes the LINEARITY claim testable rather than asserted.
 */
function conditionMatrix(n: number, roots: readonly number[], lambdas: readonly number[]): number[][] {
  const cols = 4 * (n + 1)
  const rows: number[][] = []
  for (let k = 0; k < roots.length; k++) {
    const r = roots[k]
    const rhs = Q(sigmaOf(roots, k), lambdas[k], 0, 0)
    const block: number[][] = [[], [], [], []]
    for (let j = 0; j <= n; j++) {
      for (const e of UNITS) {
        // contribution of the coefficient (e at power j): j·r^{j−1}·e − r^j·e·(Σ + λi)
        const dTerm = qscale(e, j === 0 ? 0 : j * Math.pow(r, j - 1))
        const vTerm = qscale(qmul(e, rhs), Math.pow(r, j))
        const col = parts(qadd(dTerm, qscale(vTerm, -1)))
        for (let c = 0; c < 4; c++) block[c].push(col[c])
      }
    }
    rows.push(...block)
  }
  expect(rows.every((row) => row.length === cols)).toBe(true)
  return rows
}

/** Nullspace basis by projecting probes and orthogonalising. */
function nullspace(M: number[][], cols: number): number[][] {
  const basis: number[][] = []
  for (let seed = 0; seed < cols; seed++) {
    const probe = Array.from({ length: cols }, (_, i) => Math.cos(1.7 * seed + 0.37 * i) + 0.3 * Math.sin(2.1 * i - seed))
    const Mp = M.map((row) => row.reduce((s, v, i) => s + v * probe[i], 0))
    let n: number[]
    try { const c = leastSquares(M, Mp, 1e-13); n = probe.map((v, i) => v - c[i]) } catch { continue }
    for (const b of basis) {
      const d = n.reduce((s, v, i) => s + v * b[i], 0)
      n = n.map((v, i) => v - d * b[i])
    }
    const len = Math.hypot(...n)
    if (len > 1e-6) basis.push(n.map((v) => v / len))
  }
  return basis
}

const spinorFrom = (x: readonly number[], n: number): Quat[] =>
  Array.from({ length: n + 1 }, (_, j) => Q(x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]))

function hopf(A: readonly Quat[]): { N: RPoly[]; sigma: RPoly } {
  const deg = 2 * (A.length - 1)
  const N = [0, 1, 2].map(() => new Array(deg + 1).fill(0))
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A.length; j++) {
    const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
    N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
    sigma[i + j] += qmul(A[i], qconj(A[j])).u
  }
  return { N, sigma }
}

/** Residues of N/w² at each simple root: N′(rₖ) − 2N(rₖ)Σₖ, relative. */
function residues(N: readonly RPoly[], roots: readonly number[]): number {
  let worst = 0
  for (let k = 0; k < roots.length; k++) {
    const r = roots[k], sg = sigmaOf(roots, k)
    for (const c of N) {
      const scale = Math.max(...c.map(Math.abs), 1e-300)
      worst = Math.max(worst, Math.abs(rEval(rDeriv(c), r) - 2 * rEval(c, r) * sg) / scale)
    }
  }
  return worst
}

/** Solve p′w − pw′ = N for p; the residual IS the no-log obstruction. */
function solveP(N: readonly RPoly[], w: RPoly): number {
  const degN = N[0].length - 1
  const degP = degN - (w.length - 1) + 1
  const wD = rDeriv(w)
  const rows: number[][] = []
  const rhs: number[] = []
  for (let c = 0; c < 3; c++) {
    for (let e = 0; e <= degN; e++) {
      const row = new Array(3 * (degP + 1)).fill(0)
      for (let k = 0; k <= degP; k++) {
        let acc = 0
        for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
        for (let a = 0; a < wD.length; a++) if (k + a === e) acc -= wD[a]
        row[c * (degP + 1) + k] = acc
      }
      rows.push(row)
      rhs.push(N[c][e] ?? 0)
    }
  }
  const x = leastSquares(rows, rhs, 1e-14)
  const scale = Math.max(...rhs.map(Math.abs), 1e-300)
  let worst = 0
  for (let i = 0; i < rows.length; i++) {
    worst = Math.max(worst, Math.abs(rows[i].reduce((s, a, j) => s + a * x[j], 0) - rhs[i]) / scale)
  }
  return worst
}

describe('the multi-pole claim, checked before it is believed', () => {
  it('IS IT LINEAR? fixing the λ makes the condition map linear in 𝒜, at every m', () => {
    // A linear map doubles when its input doubles. Measured on the assembled matrix against the
    // nonlinear form, so this checks the assembly as well as the claim.
    for (const roots of [[1.7], [1.7, -0.9], [1.7, -0.9, 2.6]]) {
      const n = 3
      const lambdas = roots.map((_, k) => 0.4 + 0.3 * k)
      const M = conditionMatrix(n, roots, lambdas)
      const x = Array.from({ length: 4 * (n + 1) }, (_, i) => Math.cos(0.7 * i) + 0.2 * i)
      const direct = (q: readonly number[]): number[] => {
        const A = spinorFrom(q, n)
        const out: number[] = []
        for (let k = 0; k < roots.length; k++) {
          const r = roots[k]
          const val = A.reduce((acc, c, j) => qadd(acc, qscale(c, Math.pow(r, j))), Q(0, 0, 0, 0))
          const der = A.reduce((acc, c, j) => (j === 0 ? acc : qadd(acc, qscale(c, j * Math.pow(r, j - 1)))), Q(0, 0, 0, 0))
          out.push(...parts(qadd(der, qscale(qmul(val, Q(sigmaOf(roots, k), lambdas[k], 0, 0)), -1))))
        }
        return out
      }
      const viaMatrix = M.map((row) => row.reduce((s, v, i) => s + v * x[i], 0))
      const gapAssembly = Math.max(...direct(x).map((v, i) => Math.abs(v - viaMatrix[i])))
      const doubled = direct(x.map((v) => 2 * v))
      const gapLinear = Math.max(...doubled.map((v, i) => Math.abs(v - 2 * direct(x)[i])))
      console.log(
        `    m = ${roots.length}:  matrix matches the direct form to ${gapAssembly.toExponential(1)};` +
          `  doubling 𝒜 doubles the residual to ${gapLinear.toExponential(1)}  <- LINEAR in 𝒜`,
      )
      expect(gapAssembly, 'the assembled matrix IS the condition').toBeLessThan(1e-10)
      expect(gapLinear, 'and it is linear in 𝒜 once λ is fixed').toBeLessThan(1e-10)
    }
  })

  it('THE COUNT: nullity is 4(n+1) − 4m, so one slider per root is exactly the freedom spent', () => {
    for (const [n, roots] of [[2, [1.7]], [3, [1.7, -0.9]], [3, [1.7, -0.9, 2.6]], [4, [1.7, -0.9]]] as [number, number[]][]) {
      const lambdas = roots.map((_, k) => 0.4 + 0.3 * k)
      const M = conditionMatrix(n, roots, lambdas)
      const cols = 4 * (n + 1)
      const ns = nullspace(M, cols)
      const predicted = cols - 4 * roots.length
      console.log(
        `    n = ${n}, m = ${roots.length}:  ${cols} coefficients, nullity ${ns.length}` +
          `   (4(n+1) − 4m = ${predicted})`,
      )
      expect(ns.length, `n=${n}, m=${roots.length}: the predicted nullity`).toBe(predicted)
    }
  })

  it('AND IT WORKS END TO END at m = 2: residues vanish, p solves, the curve is exactly PH', () => {
    const n = 3
    const roots = [1.7, -0.9]
    const w = polyFromRoots(roots)
    for (const lambdas of [[0, 0], [0.5, -1.2], [2.0, 0.7]]) {
      const M = conditionMatrix(n, roots, lambdas)
      const ns = nullspace(M, 4 * (n + 1))
      // a generic member of the linear solution space
      const x = ns.reduce<number[]>((acc, b, i) => acc.map((v, j) => v + (1 + 0.4 * i) * b[j]), new Array(4 * (n + 1)).fill(0))
      const A = spinorFrom(x, n)
      const { N, sigma } = hopf(A)
      const res = residues(N, roots)
      const pRes = solveP(N, w)
      // and the PH identity ‖N‖ = |𝒜|², which is what makes the curve PH
      let phGap = 0
      for (const t of [-0.3, 0.2, 0.55, 0.9, 1.4]) {
        const nn = Math.hypot(rEval(N[0], t), rEval(N[1], t), rEval(N[2], t))
        phGap = Math.max(phGap, Math.abs(nn - rEval(sigma, t)) / Math.max(rEval(sigma, t), 1e-300))
      }
      console.log(
        `    λ = (${lambdas.join(', ')}):  residues ${res.toExponential(1)}` +
          `   Wronskian solve ${pRes.toExponential(1)}   ‖N‖ vs |𝒜|² ${phGap.toExponential(1)}`,
      )
      expect(res, 'the residues vanish, so there are no logarithms').toBeLessThan(1e-9)
      expect(pRes, 'so p′w − pw′ = N is solvable — a linear solve').toBeLessThan(1e-8)
      expect(phGap, 'and the result is exactly PH').toBeLessThan(1e-12)
    }
  })

  it('THE MISSED STRATUM: 𝒜(r) = 0 satisfies the condition for free, and the pole CANCELS', () => {
    // The derivation divided by 𝒜(r). Where 𝒜(r) = 0, N = 𝒜i𝒜̄ has a DOUBLE zero, so N′(r) = 0 without
    // any condition at all — and N/w² is then regular at r, meaning the curve does not go to infinity
    // there. That stratum is the seam with the polynomial case, not a technicality.
    const r = 1.7
    // 𝒜(t) = (t − r)·B, so 𝒜(r) = 0 by construction
    const B = Q(0.8, -0.3, 0.5, 0.2)
    const A: Quat[] = [qscale(B, -r), B]
    const { N, sigma } = hopf(A)
    // N has a double zero at r: N(r) = 0 and N′(r) = 0
    const atR = N.map((c) => Math.abs(rEval(c, r)))
    const dAtR = N.map((c) => Math.abs(rEval(rDeriv(c), r)))
    // and N/w² is regular: divide out (t−r)² and evaluate
    const nOverW2 = N.map((c) => {
      // synthetic division by (t − r), twice
      let cur = c.slice()
      for (let pass = 0; pass < 2; pass++) {
        const out = new Array(cur.length - 1).fill(0)
        let carry = 0
        for (let i = cur.length - 1; i >= 1; i--) { out[i - 1] = cur[i] + carry; carry = r * out[i - 1] }
        cur = out
      }
      return rEval(cur, r)
    })
    console.log(
      `    𝒜(r) = 0:  |N(r)| ≤ ${Math.max(...atR).toExponential(1)},` +
        ` |N′(r)| ≤ ${Math.max(...dAtR).toExponential(1)}  (condition FREE)`,
    )
    console.log(
      `    and N/w² is regular at r: c′(r) = (${nOverW2.map((v) => v.toFixed(3)).join(', ')})` +
        `   — the curve does NOT pass through infinity`,
    )
    expect(Math.max(...atR), 'N vanishes at r').toBeLessThan(1e-12)
    expect(Math.max(...dAtR), 'and so does its derivative — the condition is automatic').toBeLessThan(1e-12)
    expect(Math.max(...nOverW2.map(Math.abs)), 'c′ is finite there').toBeGreaterThan(1e-6)
    expect(rEval(sigma, r), 'and the speed numerator vanishes too, as it must').toBeLessThan(1e-12)
  })
})
