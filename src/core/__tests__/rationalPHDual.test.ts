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
  nullspaceOf,
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

  it('the whole solution space shares ONE indicatrix — the point of the construction', () => {
    // r = −2b/α gives r′ = −2(αb′ − α′b)/α² = −2μF/α², so the unit tangent is ±F/|F| for EVERY member,
    // whatever b and μ are. The indicatrix is a function of the SPINOR ALONE. That is why holding 𝒜 fixed
    // freezes the sphere picture while leaving a whole vector space of curves free — the exact converse of
    // slide 17's loop, where sweeping the fiber moves 𝒜 and therefore moves the indicatrix.
    const { members, discarded, degMu } = nullspaceOf(ALPHA, F, 6)
    expect(discarded, 'no member is thrown away — the basis is clean').toBe(0)
    const combos = [
      [1, 0.7, -0.4, 0.3, 0.9],
      [1, -1.3, 0.5, -0.8, 0.2],
      [1, 2.1, 1.1, 0.4, -1.7],
    ]
    const Fhat = (t: number) => {
      const v = [0, 1, 2].map((c) => F[c].reduceRight((a, x) => a * t + x, 0))
      const n = Math.hypot(v[0], v[1], v[2]) || 1
      return v.map((x) => x / n)
    }
    for (const ws of combos) {
      const sol = {
        b: [0, 1, 2].map((c) =>
          Array.from({ length: 7 }, (_, e) => ws.reduce((a, wt, k) => a + wt * (members[k].b[c][e] ?? 0), 0)),
        ),
        mu: Array.from({ length: degMu + 1 }, (_, m) =>
          ws.reduce((a, wt, k) => a + wt * (members[k].mu[m] ?? 0), 0),
        ),
      }
      const { p, w } = curveOf(ALPHA, sol)
      const muAt = (t: number) => sol.mu.reduceRight((a, x) => a * t + x, 0)
      const muScale = Math.max(...sol.mu.map(Math.abs), 1e-300)
      let worst = 0
      let skipped = 0
      for (let i = 0; i <= 60; i++) {
        const t = -3 + (6 * i) / 60
        // WHERE μ VANISHES THE TANGENT DOES TOO: r′ = −2μF/α², so a zero of μ is a STATIONARY POINT of the
        // curve and its direction is genuinely undefined there, not merely hard to compute. Those samples are
        // excluded and counted, rather than silently smoothed over.
        if (Math.abs(muAt(t)) < 0.05 * muScale) { skipped++; continue }
        const eps = 1e-6
        const a = evaluate(p, w, t - eps)
        const b2 = evaluate(p, w, t + eps)
        const n = Math.hypot(b2.x - a.x, b2.y - a.y, b2.z - a.z) || 1
        const T = [(b2.x - a.x) / n, (b2.y - a.y) / n, (b2.z - a.z) / n]
        const f = Fhat(t)
        // ± because sign(μ) may flip; the SET traced on the sphere is the same either way.
        worst = Math.max(
          worst,
          Math.min(Math.hypot(T[0] - f[0], T[1] - f[1], T[2] - f[2]), Math.hypot(T[0] + f[0], T[1] + f[1], T[2] + f[2])),
        )
      }
      console.log(
        `    combination ${JSON.stringify(ws)}:  max |T ∓ F/|F|| = ${worst.toExponential(1)}` +
          `${skipped ? `   (${skipped}/61 samples skipped near a zero of μ)` : ''}`,
      )
      expect(worst, 'every member has the same tangent indicatrix wherever μ ≠ 0').toBeLessThan(1e-6)
    }
  })

  it('at deg b = 6 the family has real SHAPE freedom, not only translations', () => {
    // deg b = 3 gives 3 translations plus the cubic — nothing that changes shape. Raising to 6 adds a second
    // truly rational member, of degree 6, with μ = 3t + t³ (whose sign CHANGES, so that member reverses
    // along the shared indicatrix). Two shape parameters, one sphere picture.
    for (const degB of [3, 6]) {
      const { members, discarded, degMu } = nullspaceOf(ALPHA, F, degB)
      const rows = members.map((sol) => {
        const { p, w } = curveOf(ALPHA, sol)
        const rational = isTrulyRational(ALPHA, sol).rational
        return {
          rational,
          degree: rational ? Math.max(...p.map(degreeOf), degreeOf(w)) : 0,
          mu: sol.mu.map((v) => v.toFixed(1)).join(','),
        }
      })
      console.log(
        `    deg b = ${degB} (deg μ = ${degMu}), ${members.length} members, ${discarded} discarded:\n` +
          rows.map((r) => `      ${r.rational ? `RATIONAL degree ${r.degree}` : 'translation  '}  μ = [${r.mu}]`).join('\n'),
      )
      expect(discarded).toBe(0)
    }
    const six = nullspaceOf(ALPHA, F, 6)
    const rationalCount = six.members.filter((s) => isTrulyRational(ALPHA, s).rational).length
    expect(rationalCount, 'two independent rational members at deg b = 6').toBe(2)
  })

  it('a zero of μ is a STATIONARY POINT of the curve — the family is not uniformly regular', () => {
    // r′ = −2μF/α², so ‖r′‖ vanishes exactly where μ does. The degree-6 member has μ = 3t + t³ = t(t² + 3),
    // so it stalls at t = 0. Worth pinning because any figure dialling through this space has to either keep
    // μ away from zero on the drawn interval or show the stationary point honestly.
    const { members, degMu } = nullspaceOf(ALPHA, F, 6)
    const sextic = members.find((sol) => {
      const { p } = curveOf(ALPHA, sol)
      return isTrulyRational(ALPHA, sol).rational && Math.max(...p.map(degreeOf)) === 6
    })
    expect(sextic, 'the degree-6 member').toBeDefined()
    const mu = sextic!.mu
    console.log(`    deg μ = ${degMu};  μ = [${mu.map((v) => v.toFixed(1)).join(', ')}]  →  μ(0) = ${mu[0].toFixed(1)}`)
    const { p, w } = curveOf(ALPHA, sextic!)
    const speed = (t: number) => {
      const eps = 1e-5
      const a = evaluate(p, w, t - eps)
      const b = evaluate(p, w, t + eps)
      return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / (2 * eps)
    }
    const probes = [-0.5, -0.1, -0.01, 0.01, 0.1, 0.5].map((t) => ({ t, v: speed(t) }))
    console.log(
      `    ‖r′‖ near t = 0: ${probes.map((x) => `${x.t}:${x.v.toExponential(1)}`).join('  ')}` +
        `  →  it goes to zero, so the curve STOPS there`,
    )
    expect(mu[0]).toBeCloseTo(0, 12)
    expect(speed(0.01)).toBeLessThan(speed(0.5) / 10)
  })
})
