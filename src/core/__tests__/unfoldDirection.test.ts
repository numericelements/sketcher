// ============================================================================
// THE UNFOLD SLIDER — an analytically available direction, and why it is fast.
//
// Eric's design, and it is better than the constrained-continuation one it replaced: at a stuck
// curve, do not solve a new constrained problem at every slider position. Find a direction the
// GEOMETRY ALLOWS, once, and then every position is a closed-form evaluation. The proof that the
// direction is right is that the slider is fast with nothing precomputed.
//
// WHAT "AVAILABLE" MEANS, exactly. The residual is quadratic, so for v in ker J,
//
//     F(x₀ + v)  =  ½D²F(v,v)        exactly — no differencing
//
// and v is second-order liftable iff that term lies in the image of J. The obstruction
// q(v) = the part a Newton step cannot remove is δ quadratic forms on the kernel, so the available
// set is a CONE OF CODIMENSION δ: a random kernel direction is obstructed, and one has to be
// solved for. The solve is small — q is homogeneous quadratic and its differential is the
// polarisation D²F(v,e) = F(x₀+v+e) − F(x₀+v) − F(x₀+e), three residual evaluations.
//
// THE SLIDER is then  x(u) = x₀ + u·v + u²·w  with  J·w = −½D²F(v,v), which makes F(x(u)) = O(u³),
// followed by ONE corrector step. Measured on an exact degree-4 specimen (δ = 2):
//
//     u        step residual   after ONE corrector    |W(2)|      |W(3)|      time
//     3e-1        1.8e-5            9.9e-10          2.2e-5      1.6e-5      1 ms
//     1e-1        6.8e-7            4.3e-11          2.5e-6      1.8e-6      0 ms
//     3e-2        1.8e-8            1.7e-12          2.2e-7      1.6e-7      1 ms
//     1e-2        6.8e-10           1.6e-13          2.5e-8      1.8e-8      0 ms
//
// The residual falls as u³ before correcting and lands at machine level after one step, in about a
// millisecond. And |W(r)| — zero at the doubled root, EXACTLY zero at u = 0 — grows as u², so the
// slider genuinely leaves the singular stratum. The split is second order because no kernel
// direction splits at first order: dW(r)·v measures 1e-15 for every one of them.
//
// ONE THING THAT HAD TO BE GOT RIGHT, and it is where the exact rank pays for itself operationally
// rather than evidentially: THE CORRECTOR MUST TRUNCATE AT THE RANK. J has 13 independent rows of
// 16 here, so AAᵀ is singular and a regularised min-norm solve blows up along the dependent
// directions — measured, a raw residual of 1.8e-5 became 2.7e-1 after one "correction", four
// orders the wrong way. The truncated pseudo-inverse fixes it, and it needs a rank, which is
// exactly what exactRank supplies.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  q, qNum, qIsZero, exactMember, phDefectQ, liftExact, definingJacobianQ, rankQ, type Q,
} from '../exactRank'
import {
  definingJacobian, residual, pack, unpack, type ConformalPHCurve,
} from '../conformalPHCurve'
import type { Conformal } from '../conformal'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }
const allZero = (p: readonly Q[]): boolean => p.every(qIsZero)

/** One-sided Jacobi SVD with V accumulated: M = U diag(s) Vᵀ, m ≥ n. */
function svd(Ain: readonly (readonly number[])[]): { U: number[][]; s: number[]; V: number[][] } {
  const m = Ain.length, n = Ain[0].length
  const U = Ain.map((r) => [...r])
  const V: number[][] = Array.from({ length: n },
    (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let r = p + 1; r < n; r++) {
      let app = 0, aqq = 0, apq = 0
      for (let i = 0; i < m; i++) { app += U[i][p] ** 2; aqq += U[i][r] ** 2; apq += U[i][p] * U[i][r] }
      if (app * aqq === 0 || Math.abs(apq) < 1e-300) continue
      const o = Math.abs(apq) / Math.sqrt(app * aqq)
      off = Math.max(off, o)
      if (o < 1e-16) continue
      const tau = (aqq - app) / (2 * apq)
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
      const c = 1 / Math.sqrt(1 + t * t), sn = c * t
      for (let i = 0; i < m; i++) { const a = U[i][p], b = U[i][r]; U[i][p] = c * a - sn * b; U[i][r] = sn * a + c * b }
      for (let i = 0; i < n; i++) { const a = V[i][p], b = V[i][r]; V[i][p] = c * a - sn * b; V[i][r] = sn * a + c * b }
    }
    if (off < 1e-15) break
  }
  const s = Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j])))
  for (let j = 0; j < n; j++) if (s[j] > 0) for (let i = 0; i < m; i++) U[i][j] /= s[j]
  return { U, s, V }
}

describe('the unfold slider', () => {
  it('finds an available direction and rides it off the singular stratum', () => {
    // an EXACT specimen, so the rank is known and the kernel can be truncated with confidence
    const src = exactMember([q(2), q(3)], [q(1), q(1)], 2, [1, 0, 0, 0])
    if (!allZero(phDefectQ(src))) throw new Error('not PH')
    const lifted = liftExact(src)
    const exactRank = rankQ(definingJacobianQ(lifted))
    const N = lifted.degree
    const delta = 4 * N - 1 - exactRank
    const st: ConformalPHCurve = {
      C: lifted.C.map((row) => row.map(qNum) as unknown as Conformal),
      h: lifted.h.map(qNum),
    }
    const x0 = pack(st)
    const J = definingJacobian(st)
    const rows = J.length, cols = J[0].length
    say(`  exact specimen: degree ${N}, ${rows} rows, ${cols} unknowns,` +
      ` EXACT rank ${exactRank}, δ = ${delta}`)
    say(`      residual of the float image ${Math.max(...residual(st).map(Math.abs)).toExponential(1)}`)

    // kernel of J, truncated at the rank we KNOW rather than at a threshold
    const { U, s, V } = svd(Array.from({ length: cols }, (_, j) => J.map((r) => r[j])))
    const order = s.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
    say(`      singular values ${order.map(([v]) => (v / order[0][0]).toExponential(0)).join(' ')}`)
    // Jᵀ = U Σ Vᵀ with U (cols × rows). ker J = the U columns beyond the rank, plus the
    // cols − rows directions U never spans.
    const kerFromU = order.slice(exactRank).map(([, i]) => U.map((r) => r[i]))
    // complete to a full kernel basis: project the standard basis off the row space
    const rowSpace = order.slice(0, exactRank).map(([, i]) => U.map((r) => r[i]))
    const ker: number[][] = [...kerFromU]
    for (let j = 0; j < cols && ker.length < cols - exactRank; j++) {
      let v: number[] = Array.from({ length: cols }, (_, k) => (k === j ? 1 : 0))
      for (const b of [...rowSpace, ...ker]) {
        const d = v.reduce((a, x, k) => a + x * b[k], 0)
        const bn = b.reduce((a, x) => a + x * x, 0)
        v = v.map((x, k) => x - (d / bn) * b[k])
      }
      const n2 = Math.hypot(...v)
      if (n2 > 1e-8) ker.push(v.map((x) => x / n2))
    }
    say(`      kernel of J: ${ker.length} directions (expected ${cols - exactRank})`)
    void V

    // F is QUADRATIC, so for v in ker J:   F(x0 + v) = ½D²F(v,v)   exactly.
    const secondOrder = (v: readonly number[]): number[] => residual(unpack(x0.map((c, i) => c + v[i])))
    // the coker projector, from the row space of J
    const imgBasis: number[][] = []
    for (const row of J) {
      let v = [...row]
      for (const b of imgBasis) {
        const d = v.reduce((a, x, k) => a + x * b[k], 0)
        v = v.map((x, k) => x - d * b[k])
      }
      const n2 = Math.hypot(...v)
      if (n2 > 1e-9) imgBasis.push(v.map((x) => x / n2))
    }
    void imgBasis
    // easier and equivalent: the obstruction is what a least-squares Newton step CANNOT remove
    const wOf = (r: readonly number[]): { w: number[]; left: number } => {
      // solve J w = −r in least squares by the normal equations on the small system
      const A = J.map((row) => [...row])
      const b = r.map((v) => -v)
      const AtA = Array.from({ length: cols }, () => new Array<number>(cols).fill(0))
      const Atb = new Array<number>(cols).fill(0)
      for (let i = 0; i < rows; i++) {
        for (let p = 0; p < cols; p++) {
          Atb[p] += A[i][p] * b[i]
          for (let k = 0; k < cols; k++) AtA[p][k] += A[i][p] * A[i][k]
        }
      }
      for (let i = 0; i < cols; i++) AtA[i][i] += 1e-12
      // Gaussian elimination
      const M = AtA.map((row, i) => [...row, Atb[i]])
      for (let c = 0; c < cols; c++) {
        let piv = c
        for (let i = c; i < cols; i++) if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i
        ;[M[c], M[piv]] = [M[piv], M[c]]
        if (Math.abs(M[c][c]) < 1e-300) continue
        for (let i = 0; i < cols; i++) {
          if (i === c) continue
          const f = M[i][c] / M[c][c]
          for (let k = c; k <= cols; k++) M[i][k] -= f * M[c][k]
        }
      }
      const w = M.map((row, i) => (Math.abs(row[i]) < 1e-300 ? 0 : row[cols] / row[i]))
      const left = Math.hypot(...J.map((row, i) => row.reduce((a, x, k) => a + x * w[k], 0) + r[i]))
      return { w, left }
    }

    // ------------------------------------------------------------------
    // THE AVAILABLE CONE. q(v) = the part of ½D²F(v,v) a Newton step cannot remove — δ quadratic
    // forms on the kernel. Available directions are its zero set, of CODIMENSION δ, so a random
    // kernel direction is obstructed and one has to be SOLVED for. The solve is small: q is
    // homogeneous quadratic and its differential is the polarisation
    // D²F(v,e) = F(x0+v+e) − F(x0+v) − F(x0+e), three residual evaluations.
    // ------------------------------------------------------------------
    const K = ker.length
    const combo = (c: readonly number[]): number[] =>
      Array.from({ length: cols }, (_, j) => c.reduce((a, ci, i2) => a + ci * ker[i2][j], 0))
    const obstructionOf = (v: readonly number[]): { value: number[]; norm: number } => {
      const r2 = secondOrder(v)
      const { w } = wOf(r2)
      const left = J.map((row, i) => row.reduce((a, x, k) => a + x * w[k], 0) + r2[i])
      return { value: left, norm: Math.hypot(...left) / Math.max(Math.hypot(...r2), 1e-300) }
    }
    const bern = (n: number, t: number): number[] => {
      const out = new Array<number>(n + 1).fill(0)
      out[0] = 1
      for (let k = 1; k <= n; k++) {
        for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
        out[0] *= 1 - t
      }
      return out
    }
    const dblRoots = [2, 3]
    /** dW(rᵢ)·v — how much a direction moves W off zero at each doubled root, i.e. SPLITS it. */
    const splitOf = (v: readonly number[]): number[] =>
      dblRoots.map((r) => {
        const B = bern(N, r)
        return B.reduce((a, b, k) => a + b * v[5 * k], 0)
      })

    let c = new Array<number>(K).fill(0)
    {
      let best = -1
      for (let i2 = 0; i2 < K; i2++) {
        const sp = Math.hypot(...splitOf(ker[i2]))
        if (sp > best) { best = sp; c = Array.from({ length: K }, (_, k) => (k === i2 ? 1 : 0)) }
      }
    }
    say('')
    say('  Newton onto q(v) = 0, starting from the kernel direction that splits the most:')
    for (let it = 0; it < 40; it++) {
      const v = combo(c)
      const g = obstructionOf(v)
      if (it % 8 === 0 || g.norm < 1e-10) {
        say(`      iteration ${String(it).padStart(2)}: obstruction ${g.norm.toExponential(1)},` +
          ` split ${splitOf(v).map((x) => x.toExponential(1)).join(' ')}`)
      }
      if (g.norm < 1e-10) break
      const base = secondOrder(v)
      const Dq: number[][] = []
      for (let k = 0; k < K; k++) {
        const e = ker[k]
        const mixed = secondOrder(v.map((x, j) => x + e[j]))
        const alone = secondOrder(e)
        const pol = mixed.map((x, j) => x - base[j] - alone[j])
        const { w } = wOf(pol)
        Dq.push(J.map((row, i2) => row.reduce((a, x, j) => a + x * w[j], 0) + pol[i2]))
      }
      const A = g.value.map((_, i2) => Dq.map((col) => col[i2]))
      const AtA = Array.from({ length: K }, () => new Array<number>(K).fill(0))
      const Atb = new Array<number>(K).fill(0)
      for (let i2 = 0; i2 < A.length; i2++) {
        for (let p = 0; p < K; p++) {
          Atb[p] -= A[i2][p] * g.value[i2]
          for (let k = 0; k < K; k++) AtA[p][k] += A[i2][p] * A[i2][k]
        }
      }
      for (let i2 = 0; i2 < K; i2++) AtA[i2][i2] += 1e-10
      const M = AtA.map((row, i2) => [...row, Atb[i2]])
      for (let cc = 0; cc < K; cc++) {
        let piv = cc
        for (let i2 = cc; i2 < K; i2++) if (Math.abs(M[i2][cc]) > Math.abs(M[piv][cc])) piv = i2
        ;[M[cc], M[piv]] = [M[piv], M[cc]]
        if (Math.abs(M[cc][cc]) < 1e-300) continue
        for (let i2 = 0; i2 < K; i2++) {
          if (i2 === cc) continue
          const f = M[i2][cc] / M[cc][cc]
          for (let k = cc; k <= K; k++) M[i2][k] -= f * M[cc][k]
        }
      }
      const dc = M.map((row, i2) => (Math.abs(row[i2]) < 1e-300 ? 0 : row[K] / row[i2]))
      c = c.map((x, i2) => x + dc[i2])
      const cn = Math.hypot(...c)
      c = c.map((x) => x / cn)
    }

    // ------------------------------------------------------------------
    // THE SLIDER: x(u) = x0 + u·v + u²·w with J·w = −½D²F(v,v). One setup, then every position is
    // two vector adds. Along an AVAILABLE direction the residual falls as u³; along an obstructed
    // one it stalls at u².
    // ------------------------------------------------------------------
    const vGood = combo(c)
    const wGood = wOf(secondOrder(vGood)).w
    let worstK = -1
    let worstV: number[] = ker[0]
    {
      let bad = -1
      for (let i2 = 0; i2 < K; i2++) {
        const g = obstructionOf(ker[i2])
        if (g.norm > bad) { bad = g.norm; worstK = i2; worstV = ker[i2] }
      }
    }
    const wBad = wOf(secondOrder(worstV)).w
    say('')
    say(`  the slider, against the most obstructed basis direction (#${worstK})`)
    // W(r) ON THE PATH, not the first-order part of it: the split may be second order.
    const Won = (x: readonly number[], r: number): number => {
      const B = bern(N, r)
      const scale = Math.max(...Array.from({ length: N + 1 }, (_, k) => Math.abs(x[5 * k])), 1e-300)
      return Math.abs(B.reduce((a, b, k) => a + b * x[5 * k], 0)) / (scale * Math.max(...B))
    }
    say('      u         AVAILABLE residual   |W(2)|/scale  |W(3)|/scale     obstructed residual')
    for (const u of [0.3, 0.1, 0.03, 0.01, 0.003]) {
      const xa = x0.map((v0, j) => v0 + u * vGood[j] + u * u * wGood[j])
      const xb = x0.map((v0, j) => v0 + u * worstV[j] + u * u * wBad[j])
      const ra = Math.max(...residual(unpack(xa)).map(Math.abs))
      const rb = Math.max(...residual(unpack(xb)).map(Math.abs))
      say(`      ${u.toExponential(0).padEnd(8)}  ${ra.toExponential(1)}` +
        `             ${Won(xa, 2).toExponential(1)}       ${Won(xa, 3).toExponential(1)}` +
        `        ${rb.toExponential(1)}`)
    }
    say(`      at u = 0 the base reads |W(2)| ${Won(x0, 2).toExponential(1)},` +
      ` |W(3)| ${Won(x0, 3).toExponential(1)}`)
    // and along the obstructed direction, for comparison
    say('')
    say('      the same, along the OBSTRUCTED direction:')
    for (const u of [0.3, 0.1, 0.03, 0.01]) {
      const xb = x0.map((v0, j) => v0 + u * worstV[j] + u * u * wBad[j])
      say(`      ${u.toExponential(0).padEnd(8)}  |W(2)| ${Won(xb, 2).toExponential(1)}` +
        `  |W(3)| ${Won(xb, 3).toExponential(1)}`)
    }
    // ------------------------------------------------------------------
    // THE WHOLE SLIDER: step along the available direction, then ONE least-squares corrector.
    // If that lands on the variety and keeps the split, the slider is a closed-form evaluation
    // plus one cheap solve — no continuation, no precomputed table.
    // ------------------------------------------------------------------
    /**
     * The corrector MUST truncate at the exact rank. J has 13 independent rows of 16 here, so
     * AAᵀ is singular and a regularised solve blows up along the dependent directions — measured:
     * a raw residual of 1.8e-5 became 2.7e-1 after one "correction". The truncated pseudo-inverse
     * is the right instrument, and it needs a rank, which is exactly what the exact computation
     * supplies. This is the first place the symbolic rank pays for itself operationally rather
     * than evidentially.
     */
    const correct = (x: readonly number[], steps: number, rank: number): number[] => {
      let y = [...x]
      for (let it2 = 0; it2 < steps; it2++) {
        const r2 = residual(unpack(y))
        const Jy = definingJacobian(unpack(y))
        const rowScale = Jy.map((row) => Math.hypot(...row) || 1)
        const An = Jy.map((row, k) => row.map((v) => v / rowScale[k]))
        const bn = r2.map((v, k) => -v / rowScale[k])
        const { U: Uc, s: sc, V: Vc } = svd(
          Array.from({ length: cols }, (_, k) => An.map((row) => row[k])))
        const ord = sc.map((v, k) => [v, k] as const).sort((a, b) => b[0] - a[0])
        const step = new Array<number>(cols).fill(0)
        for (let k = 0; k < Math.min(rank, ord.length); k++) {
          const idx = ord[k][1]
          const sv = ord[k][0]
          if (sv <= 0) continue
          let vb = 0
          for (let a = 0; a < rows; a++) vb += Vc[a][idx] * bn[a]
          const coef = vb / sv
          for (let k2 = 0; k2 < cols; k2++) step[k2] += coef * Uc[k2][idx]
        }
        y = y.map((v, k) => v + step[k])
      }
      return y
    }
    say('')
    say('  step along the available direction, then correct:')
    say('      u        raw residual   after 1 step   after 2   |W(2)| after   |W(3)| after   ms')
    for (const u of [0.3, 0.1, 0.03, 0.01]) {
      const xa = x0.map((v0, j) => v0 + u * vGood[j] + u * u * wGood[j])
      const raw = Math.max(...residual(unpack(xa)).map(Math.abs))
      const t0 = Date.now()
      const c1 = correct(xa, 1, exactRank)
      const ms = Date.now() - t0
      const c2 = correct(xa, 2, exactRank)
      say(`      ${u.toExponential(0).padEnd(7)}  ${raw.toExponential(1)}` +
        `        ${Math.max(...residual(unpack(c1)).map(Math.abs)).toExponential(1)}` +
        `      ${Math.max(...residual(unpack(c2)).map(Math.abs)).toExponential(1)}` +
        `    ${Won(c2, 2).toExponential(1)}        ${Won(c2, 3).toExponential(1)}      ${ms}`)
    }
    // --- the three claims, pinned ---
    const at = (u: number) => {
      const xa = x0.map((v0, j) => v0 + u * vGood[j] + u * u * wGood[j])
      return {
        raw: Math.max(...residual(unpack(xa)).map(Math.abs)),
        corrected: Math.max(...residual(unpack(correct(xa, 1, exactRank))).map(Math.abs)),
        split: Won(correct(xa, 1, exactRank), 2),
      }
    }
    const a = at(0.1)
    const b = at(0.03)
    // 1. the raw residual falls as u³ — the signature of an available direction
    expect(a.raw / b.raw, 'residual ∝ u³ along the available direction')
      .toBeGreaterThan(0.6 * 27)
    expect(a.raw / b.raw, 'residual ∝ u³ along the available direction').toBeLessThan(1.6 * 27)
    // 2. one corrector step lands on the variety
    expect(a.corrected, 'one corrector step is enough').toBeLessThan(1e-9)
    // 3. and the doubled root has genuinely split — it was EXACTLY zero at u = 0
    expect(Won(x0, 2), 'the base has a doubled root at t = 2').toBe(0)
    expect(a.split, 'and the slider splits it').toBeGreaterThan(1e-9)
    expect(a.split / b.split, 'the split grows as u², not u').toBeGreaterThan(4)
    for (const line of OUT) console.log(line)
  }, 900_000)
})
