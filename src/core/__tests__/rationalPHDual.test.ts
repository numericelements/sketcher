// ============================================================================
// THE DUAL CONSTRUCTION, VERIFIED AGAINST THE PUBLISHED CURVE — the chart that reaches the null stratum.
//
// Acceptance gate first: feed the paper's own α and 𝒜 into the ported system and the published rational PH
// cubic has to come back out. If it does not, nothing downstream is worth reading.
// ============================================================================
import { describe, expect, it } from 'vitest'
import {
  curveOf,
  degreeOf,
  evaluate,
  hopfImage,
  isTrulyRational,
  nullspace,
  residual,
  systemMatrix,
  unpack,
} from '../rationalPHDual'
import { curveAt as publishedAt } from '../rationalPHCubic'
import type { Quat } from '../quaternion'

/** The paper's Example 5.4 input: 𝒜 = (t² − 1) + 3t·i + 2j + k, α = t² + 1 (their 60 is just a scale). */
const A: Quat[] = [
  { u: -1, v: 0, p: 2, q: 1 },
  { u: 0, v: 3, p: 0, q: 0 },
  { u: 1, v: 0, p: 0, q: 0 },
]
const ALPHA = [1, 0, 1]

describe('the ported dual construction', () => {
  const F = hopfImage(A)

  it('the published rational PH cubic SATISFIES the ported system — the acceptance gate', () => {
    // r = −2b/α with α = t² + 1, and the published r = −(1/60)(t³−4t, 6t²−2t, 3t²+4t)/(t²+1),
    // so b = (1/120)(t³−4t, 6t²−2t, 3t²+4t). deg μ = 0, so μ is one constant: solve it from the
    // largest coefficient and then check EVERY other coefficient against it.
    const b = [
      [0, -4, 0, 1],
      [0, -2, 6, 0],
      [0, 4, 3, 0],
    ].map((c) => c.map((v) => v / 120))
    const { rows, degMu } = systemMatrix(ALPHA, F, 3)
    expect(degMu).toBe(0)

    // Build the unknown vector with μ left as 1, then read off what μ must be from the system rows.
    const pack = (mu: number) => {
      const v = new Array<number>(rows[0].length).fill(0)
      for (let c = 0; c < 3; c++) for (let e = 0; e < 4; e++) v[3 * e + c] = b[c][e]
      v[12] = mu
      return v
    }
    // Each row is linear in μ: row·pack(μ) = A + μ·B. Pick the row with the largest |B| to solve.
    const A0 = rows.map((r) => r.reduce((a, x, i2) => a + x * pack(0)[i2], 0))
    const B0 = rows.map((r) => r[12])
    let pick = 0
    for (let i2 = 1; i2 < rows.length; i2++) if (Math.abs(B0[i2]) > Math.abs(B0[pick])) pick = i2
    const mu = -A0[pick] / B0[pick]
    const worst = Math.max(...rows.map((_, i2) => Math.abs(A0[i2] + mu * B0[i2])))
    const scale = Math.max(...A0.map(Math.abs), ...B0.map(Math.abs))
    console.log(
      `    deg α = ${degreeOf(ALPHA)}, deg 𝒜i𝒜* = ${Math.max(...F.map(degreeOf))}, deg b = 3 ⇒ deg μ = ${degMu}` +
        `\n    system ${rows.length} × ${rows[0].length} (overdetermined)` +
        `\n    solving ONE row for μ gives μ = ${mu.toFixed(9)};  worst residual over ALL ${rows.length} rows` +
        ` = ${(worst / scale).toExponential(1)} (relative)`,
    )
    expect(worst / scale, 'the published curve satisfies every equation of the ported system').toBeLessThan(1e-12)

    // And it is truly rational by Lemma 4.1, not secretly polynomial.
    const sol = { b, mu: [mu] }
    const { rational, remainder } = isTrulyRational(ALPHA, sol)
    const { p, w } = curveOf(ALPHA, sol)
    const probe = evaluate(p, w, 0.37)
    const theirs = publishedAt(0.37)
    console.log(
      `    α ∤ b remainder ${remainder.toExponential(1)} → ${rational ? 'TRULY RATIONAL' : 'polynomial'};` +
        `  r(0.37) ours (${probe.x.toFixed(9)}, ${probe.y.toFixed(9)}, ${probe.z.toFixed(9)})` +
        `\n    published (${theirs.x.toFixed(9)}, ${theirs.y.toFixed(9)}, ${theirs.z.toFixed(9)}) — same curve, no scale factor`,
    )
    expect(rational).toBe(true)
    expect(Math.hypot(probe.x - theirs.x, probe.y - theirs.y, probe.z - theirs.z)).toBeLessThan(1e-15)
  })

  it('every basis member solves (9), and Lemma 4.1 separates polynomial from rational', () => {
    const { rows, degMu } = systemMatrix(ALPHA, F, 3)
    const basis = nullspace(rows)
    const report = basis.map((v, i) => {
      const sol = unpack(v, 3, degMu)
      const r = residual(ALPHA, F, sol)
      const { rational, remainder } = isTrulyRational(ALPHA, sol)
      return { i, r, rational, remainder }
    })
    for (const x of report) {
      console.log(
        `    basis ${x.i}: residual of (9) ${x.r.toExponential(1)}` +
          `   α ∤ b remainder ${x.remainder.toExponential(1)}  →  ${x.rational ? 'TRULY RATIONAL' : 'polynomial (α | b)'}`,
      )
    }
    expect(Math.max(...report.map((x) => x.r)), 'all of them actually solve the system').toBeLessThan(1e-9)
    expect(report.some((x) => x.rational), 'and at least one is non-polynomial').toBe(true)
  })

  it('raising deg b grows the solution space — the nested tower of their Remark 5.2', () => {
    const rowsFor = (d: number) => {
      const { rows, degMu } = systemMatrix(ALPHA, F, d)
      const basis = nullspace(rows)
      const rational = basis.filter((v) => {
        const sol = unpack(v, d, degMu)
        return residual(ALPHA, F, sol) < 1e-9 && isTrulyRational(ALPHA, sol).rational
      }).length
      return { d, degMu, dim: basis.length, rational, size: `${rows.length}×${rows[0].length}` }
    }
    const tower = [2, 3, 4, 5, 6].map(rowsFor)
    for (const x of tower) {
      console.log(
        `    deg b = ${x.d}  (deg μ = ${x.degMu}, system ${x.size}):  nullspace ${x.dim},` +
          ` of which truly rational ${x.rational}`,
      )
    }
    expect(tower[tower.length - 1].dim, 'the space grows').toBeGreaterThan(tower[0].dim)
  })
})
