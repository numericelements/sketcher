// ============================================================================
// SOFT IS ABSORBING — a soft pole cannot be made hard by any continuation, and the
// "mixed → AllHard" walk that appeared to do it was jumping branches.
//
// THE MEASUREMENT. On the residue variety, take the two rows d(Re σ(r_k), Im σ(r_k)) and
// ask how much of them lies OFF the row space of the residue conditions. That residual is
// how far σ(r_k) can be moved while staying on the variety:
//
//     pole SOFT (σ(r) = 0)     residual 1e-10      σ(r) CANNOT be moved — RIGID
//     pole HARD (σ(r) ≠ 0)     residual 0.6 … 0.9  σ(r) moves freely
//
// measured at (n,m) = (4,4), (5,4) and (7,6), on AllSoft, Mixed and AllHard members alike.
// It is not configuration-specific and it is not about the (4,4) emptiness below: wherever
// a pole is soft, the residue conditions PIN it soft.
//
// SO THE ATLAS IS ONE-WAY. hard → soft is a targeting problem and works (the ε-drive,
// mixedCellExists.test.ts). soft → hard is not merely ill-conditioned — it is blocked to
// first order, because dσ has no component off the constraint's row space. Everything
// flows toward AllSoft and nothing flows back.
//
// WHAT THIS RETRACTS. `mixedCellExists.test.ts` used to assert "mixed → AllHard, and the
// atlas closes — 12 of 12 escape directions arrive". They do not. Measured here:
//
//   · all twelve endpoints have hodographRank ONE — straight lines, N₁ N₂ N₃ proportional,
//     second singular value at machine zero (1e-8 against 1.9) while the mixed witness they
//     started from is solidly rank 3 (1.374, 1.132, 0.482)
//   · the FIRST step already lands 0.467 away from the witness, on a unit-norm spinor, and
//     already at rank 1. That is a branch jump, not a continuation step
//   · with jumps rejected — a step must move the solution by O(Δε) — the continuation does
//     not leave ε = 0 AT ALL, in any of the twelve directions
//
// The old test's own note said arrival at small ε was "guaranteed by the submersion". The
// submersion argument is about σ(r) as a map on ITS OWN; what matters is σ(r) restricted to
// the residue variety, and that differential is zero. The escape-direction circle, ρ(φ),
// and everything THE_MAP §6c built on ρ were measured on the straight-line branch.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul } from '../complex'
import {
  type PoleSet, toSpinor, poleDiagnostics, newtonToResidue, residueConditions, spinorAt,
  hodographRank,
} from '../rationalPHResidue'
import { sandwichPolynomial } from '../conformalPHHopf'

const C = (re: number, im = 0): Complex => ({ re, im })

const M4_POLES: PoleSet = [
  { re: 0.6, im: 0.9 }, { re: 0.6, im: -0.9 },
  { re: -0.5, im: 0.7 }, { re: -0.5, im: -0.7 },
]
const REPS = [0, 2]
const M4_WITNESS: number[] = [
  -2.61410954817405838e-1, -1.02794345890687866e-1, 1.44160147739611499e-1, 3.57770603829519918e-1,
  -3.11332839155708141e-1, 3.37978328087302549e-1, -3.77569614167863332e-1, 3.63845224869703776e-1,
  -2.79058887177438597e-1, -1.18446869927122875e-1, -3.73720961521592926e-2, -2.49469201630884457e-1,
  -1.42605895681224559e-2, 6.86705384466648333e-2, -1.08209948793829780e-1, 7.03363487622871292e-2,
  1.52346407979708637e-1, -4.08096667306168184e-2, -3.18282588727410998e-2, -2.88474360955877418e-1,
]

function jac(F: (x: number[]) => number[], x0: readonly number[], h: number): number[][] {
  const rows = F([...x0]).length
  const J = Array.from({ length: rows }, () => new Array(x0.length).fill(0))
  for (let j = 0; j < x0.length; j++) {
    const st = h * Math.max(1, Math.abs(x0[j]))
    const up = [...x0]; up[j] += st
    const dn = [...x0]; dn[j] -= st
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * st)
  }
  return J
}

/** How much of d lies OFF the row space of M, relative to ‖d‖. */
function projResidual(M: number[][], d: readonly number[]): number {
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
  const proj = Array.from({ length: d.length }, (_, j) => M.reduce((s, row, i) => s + co[i] * row[j], 0))
  return Math.hypot(...d.map((v, k) => v - proj[k])) / Math.hypot(...d)
}

/** The freedom in σ(r_k) along the residue variety, per representative. */
function sigmaFreedom(x: readonly number[], poles: PoleSet, reps: readonly number[]): number[] {
  const JR = jac((y) => residueConditions(toSpinor(y), poles, reps), x, 1e-6)
  return reps.map((k) => {
    const JS = jac((y) => {
      let a: Complex = C(0)
      for (const z of spinorAt(toSpinor(y), poles[k])) a = cadd(a, cmul(z, z))
      return [a.re, a.im]
    }, x, 1e-6)
    return Math.max(...JS.map((row) => projResidual(JR, row)))
  })
}

/** Deterministic starts, filtered to a stratum and hodograph rank. */
function sampleMember(
  poles: PoleSet, n: number, want: (label: string, rank: number) => boolean,
): number[] | null {
  const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
  for (let t = 0; t < 160; t++) {
    const raw = Array.from({ length: 4 * (n + 1) }, (_, i) => (t % 3 === 0
      ? Math.sin(1.7 * i + 2.3 * t + 0.4)
      : t % 3 === 1 ? Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t)
      : Math.sin(0.9 * i - 1.1 * t) * Math.cos(0.5 * i * i + t)))
    const nn = Math.hypot(...raw) || 1
    const x = newtonToResidue(raw.map((v) => v / nn), poles, reps, undefined, 200)
    if (!x) continue
    const A = toSpinor(x)
    const nonReal = poleDiagnostics(A, poles).filter((q) => !q.real)
    const soft = nonReal.map((q) => q.softness < 1e-8)
    const label = soft.every(Boolean) ? 'AllSoft' : soft.some(Boolean) ? 'Mixed' : 'AllHard'
    if (want(label, hodographRank(A))) return x
  }
  return null
}

const P6: PoleSet = [
  C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7), C(1.3, 0.4), C(1.3, -0.4),
]

describe('soft is absorbing', () => {
  it('a SOFT pole is rigid and a HARD pole is free — at the mixed witness, both at once', () => {
    const d = poleDiagnostics(toSpinor(M4_WITNESS), M4_POLES)
    expect(d[0].softness).toBeGreaterThan(0.5)             // r₀ hard
    expect(d[2].softness).toBeLessThan(1e-12)              // r₂ soft
    expect(hodographRank(toSpinor(M4_WITNESS))).toBe(3)

    const [f0, f2] = sigmaFreedom(M4_WITNESS, M4_POLES, REPS)
    expect(f0).toBeGreaterThan(0.3)                        // 0.81 — movable
    expect(f2).toBeLessThan(1e-6)                          // 2.8e-10 — PINNED
  })

  it('and it holds wherever a pole is soft, at three configurations', { timeout: 120000 }, () => {
    const cases: [string, PoleSet, number, (l: string, r: number) => boolean][] = [
      ['(4,4) AllSoft', M4_POLES, 4, (l, r) => l === 'AllSoft' && r === 3],
      ['(4,4) Mixed', M4_POLES, 4, (l, r) => l === 'Mixed' && r === 3],
      ['(5,4) Mixed', M4_POLES, 5, (l, r) => l === 'Mixed' && r === 3],
      ['(6,6) Mixed', P6, 6, (l, r) => l === 'Mixed' && r === 3],
    ]
    for (const [label, poles, n, want] of cases) {
      const x = sampleMember(poles, n, want)
      expect(x, label).not.toBeNull()
      const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
      const d = poleDiagnostics(toSpinor(x!), poles)
      const free = sigmaFreedom(x!, poles, reps)
      reps.forEach((k, i) => {
        if (d[k].softness < 1e-8) expect(free[i], `${label} r${k} soft`).toBeLessThan(1e-6)
        else expect(free[i], `${label} r${k} hard`).toBeGreaterThan(0.3)
      })
    }
  })

  it('CONTROL: where every pole is hard, every σ is free — the rigidity is about SOFT',
    { timeout: 120000 }, () => {
    // (5,4) and (7,6) both have genuine all-hard members. If the residual were small there
    // too, it would be an artifact of the residue system rather than a fact about softness.
    for (const [label, poles, n] of [['(5,4)', M4_POLES, 5], ['(7,6)', P6, 7]] as const) {
      const x = sampleMember(poles, n, (l, r) => l === 'AllHard' && r === 3)
      expect(x, label).not.toBeNull()
      const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
      for (const f of sigmaFreedom(x!, poles, reps)) expect(f).toBeGreaterThan(0.3)
    }
  })

  it('so the mixed → AllHard walk JUMPED: its endpoints are straight lines',
    { timeout: 180000 }, () => {
    const spec = (A: ReturnType<typeof toSpinor>) => {
      const N = sandwichPolynomial(A)
      const sc = Math.max(...N.flat().map(Math.abs))
      return N.map((r) => r.map((v) => v / sc))
    }
    expect(spec(toSpinor(M4_WITNESS))).toBeTruthy()

    for (let p = 0; p < 12; p++) {
      const phi = (2 * Math.PI * p) / 12
      const dir = { re: Math.cos(phi), im: Math.sin(phi) }
      let x = [...M4_WITNESS]
      let eps = 0, step = 0.02
      for (let it = 0; it < 600 && eps < 1; it++) {
        const next = Math.min(eps + step, 1)
        const y = newtonToResidue(x, M4_POLES, REPS,
          { pole: 2, value: { re: dir.re * next, im: dir.im * next } }, 80)
        if (y) {
          if (eps === 0) {
            // the very first step, and it is a LEAP: 0.467 on a unit-norm spinor
            expect(Math.hypot(...y.map((v, k) => v - M4_WITNESS[k]))).toBeGreaterThan(0.3)
            expect(hodographRank(toSpinor(y))).toBe(1)     // already degenerate
          }
          x = y; eps = next; step = Math.min(step * 1.4, 0.1)
        } else { step /= 2; if (step < 1e-9) break }
      }
      const d = poleDiagnostics(toSpinor(x), M4_POLES)
      expect(d[0].softness).toBeGreaterThan(0.5)           // it DOES read all-hard…
      expect(d[2].softness).toBeGreaterThan(0.5)
      expect(hodographRank(toSpinor(x))).toBe(1)           // …and it IS a straight line
    }
  })

  it('and with jumps rejected the continuation cannot leave ε = 0 at all',
    { timeout: 180000 }, () => {
    // A step is rejected when the solution moves more than 50× the ε increment. That is the
    // difference between a continuation and a re-solve, and it is the whole disagreement.
    for (const p of [0, 3, 7]) {
      const phi = (2 * Math.PI * p) / 12
      const dir = { re: Math.cos(phi), im: Math.sin(phi) }
      let x = [...M4_WITNESS]
      let eps = 0, step = 1e-5
      for (let it = 0; it < 3000 && eps < 1; it++) {
        const next = Math.min(eps + step, 1)
        const y = newtonToResidue(x, M4_POLES, REPS,
          { pole: 2, value: { re: dir.re * next, im: dir.im * next } }, 120)
        if (y && Math.hypot(...y.map((v, k) => v - x[k])) <= Math.max(50 * (next - eps), 1e-3)) {
          x = y; eps = next; step = Math.min(step * 1.3, 0.01)
        } else { step /= 2; if (step < 1e-12) break }
      }
      expect(eps).toBeLessThan(1e-3)                       // measured 0.00000
      expect(hodographRank(toSpinor(x))).toBe(3)           // never left the witness's branch
      expect(poleDiagnostics(toSpinor(x), M4_POLES)[2].softness).toBeLessThan(1e-8)
    }
  })
})
