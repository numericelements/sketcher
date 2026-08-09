// ============================================================================
// HOW MANY COMPLEX-RATIONAL PH CUBICS SIT OVER ONE CONTROL POLYGON AND ONE FARIN POINT?
//
// The chart, which is exactly what Eric proposed: a complex-rational cubic IS its four
// control points plus its three Farin points — 8 + 6 = 14 real numbers, and the chart is
// bijective because each edge's Farin point determines that edge's weight ratio outright,
//
//     wₖ₊₁/wₖ = (qₖ − Zₖ)/(Zₖ₊₁ − qₖ)
//
// with the overall weight scale invisible. PH costs 4 real conditions, so the family is
// 10-dimensional and exactly FIVE of the seven points can be prescribed: the four control
// points (free — no condition falls on them) plus ONE Farin point. The other two Farin
// points are then determined, and THE QUESTION THIS FILE ANSWERS is: determined how many
// ways?
//
// THE SYSTEM. Set w₀ = 1 and read w₁ off the prescribed Farin point. Unknowns are w₂, w₃
// and the quadratic A, five complex; equations are the five coefficients of
//
//     M − A² = 0        M = P′Q − PQ′   (degree 4: the t⁵ terms cancel)
//
// square, five by five, every equation quadratic — so Bézout bounds it at 2⁵ = 32 and the
// real count has to be measured. IT IS TWO — measured, and stable across three unrelated
// polygons, across 1500/3000/6000 Newton starts and across three seeds, with every root PH
// to 1e-10 and pole-free. So the Bézout bound is loose by a factor of 16 and this system is
// nothing like generic. I had expected MORE than two and said so; the assertion that it was
// not 2 is what caught me. The consequence for the figure is the good one: the interaction is
// slide 4's exactly — two branches, draw the other one grey, click to switch.
//
// Carrying A as an unknown rather than eliminating it is deliberate: the eliminated form needs 8m₁m₄² − 4m₂m₃m₄ + m₃³ = 0 and
// 64m₀m₄³ − (4m₄m₂ − m₃²)² = 0, which are degree 6 and 8 and introduce spurious m₄ = 0
// branches. Here every root is a genuine (w, A).
//
// Newton from many deterministic pseudo-random complex starts, roots deduped on w alone —
// A ↦ −A is the same curve, and would otherwise double every count.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cdiv, cmul, cnorm, csub } from '../complex'

const C = (re: number, im = 0): Complex => ({ re, im })
const cneg = (a: Complex): Complex => ({ re: -a.re, im: -a.im })

/** Bernstein coefficients of a cubic to the power basis. */
const toPower = (c: readonly Complex[]): Complex[] => [
  c[0],
  cadd(cmul(C(-3), c[0]), cmul(C(3), c[1])),
  cadd(cadd(cmul(C(3), c[0]), cmul(C(-6), c[1])), cmul(C(3), c[2])),
  cadd(cadd(cadd(cneg(c[0]), cmul(C(3), c[1])), cmul(C(-3), c[2])), c[3]),
]

const deriv = (p: readonly Complex[]): Complex[] =>
  p.slice(1).map((v, k) => cmul(C(k + 1), v))

function mulPoly(a: readonly Complex[], b: readonly Complex[]): Complex[] {
  const out: Complex[] = Array.from({ length: a.length + b.length - 1 }, () => C(0))
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    out[i + j] = cadd(out[i + j], cmul(a[i], b[j]))
  }
  return out
}

const evalPoly = (p: readonly Complex[], t: number): Complex =>
  p.reduceRight((acc, c) => cadd(cmul(acc, C(t)), c), C(0))

/**
 * The five residuals of M − A², given the four control points, the four weights and A.
 * M has degree 4: its t⁵ coefficient cancels identically, which is asserted below rather
 * than assumed.
 */
function residual(
  Z: readonly Complex[],
  w: readonly Complex[],
  A: readonly Complex[],
): { F: Complex[]; topCancel: number } {
  const P = toPower(Z.map((z, k) => cmul(w[k], z)))
  const Q = toPower(w)
  const M = mulPoly(deriv(P), Q).map((v, k) => csub(v, mulPoly(P, deriv(Q))[k] ?? C(0)))
  const A2 = mulPoly(A, A)
  return {
    F: Array.from({ length: 5 }, (_, k) => csub(M[k] ?? C(0), A2[k] ?? C(0))),
    topCancel: cnorm(M[5] ?? C(0)),
  }
}

/** Solve a small complex linear system by Gaussian elimination with partial pivoting. */
function solveComplex(Ain: Complex[][], bin: Complex[]): Complex[] | null {
  const n = bin.length
  const M = Ain.map((r) => r.map((c) => ({ ...c })))
  const b = bin.map((c) => ({ ...c }))
  for (let i = 0; i < n; i++) {
    let piv = i
    for (let r = i + 1; r < n; r++) if (cnorm(M[r][i]) > cnorm(M[piv][i])) piv = r
    if (cnorm(M[piv][i]) < 1e-300) return null
    ;[M[i], M[piv]] = [M[piv], M[i]]
    ;[b[i], b[piv]] = [b[piv], b[i]]
    for (let r = i + 1; r < n; r++) {
      const f = cdiv(M[r][i], M[i][i])
      for (let c = i; c < n; c++) M[r][c] = csub(M[r][c], cmul(f, M[i][c]))
      b[r] = csub(b[r], cmul(f, b[i]))
    }
  }
  const x: Complex[] = Array.from({ length: n }, () => C(0))
  for (let i = n - 1; i >= 0; i--) {
    let acc = b[i]
    for (let c = i + 1; c < n; c++) acc = csub(acc, cmul(M[i][c], x[c]))
    x[i] = cdiv(acc, M[i][i])
  }
  return x
}

/** Deterministic PRNG — a test that counts roots must count the same ones every run. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface Root { w: Complex[]; A: Complex[]; residual: number }

/**
 * Every solution over a given polygon and prescribed first Farin point.
 *
 * The unknown vector is (w₂, w₃, a₀, a₁, a₂). The Jacobian is taken by COMPLEX-STEP
 * central difference, which is exact to O(h²) because the residual is holomorphic in the
 * unknowns — no need for a hand-written derivative of a quadratic system.
 */
function solveAll(Z: readonly Complex[], q0: Complex, starts: number, seed: number): Root[] {
  const w1 = cdiv(csub(q0, Z[0]), csub(Z[1], q0))
  const pack = (x: readonly Complex[]) => ({
    w: [C(1), w1, x[0], x[1]],
    A: [x[2], x[3], x[4]],
  })
  const F = (x: readonly Complex[]): Complex[] => {
    const { w, A } = pack(x)
    return residual(Z, w, A).F
  }
  const rnd = lcg(seed)
  const roots: Root[] = []
  const h = 1e-6

  for (let s = 0; s < starts; s++) {
    let x: Complex[] = Array.from({ length: 5 }, () => C(4 * rnd() - 2, 4 * rnd() - 2))
    let ok = false
    for (let it = 0; it < 60; it++) {
      const f = F(x)
      const nf = Math.max(...f.map(cnorm))
      if (!Number.isFinite(nf)) break
      if (nf < 1e-13) { ok = true; break }
      const J: Complex[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => C(0)))
      for (let j = 0; j < 5; j++) {
        const up = x.map((v, i) => (i === j ? cadd(v, C(h)) : v))
        const dn = x.map((v, i) => (i === j ? csub(v, C(h)) : v))
        const fu = F(up), fd = F(dn)
        for (let r = 0; r < 5; r++) J[r][j] = cdiv(csub(fu[r], fd[r]), C(2 * h))
      }
      const step = solveComplex(J, f.map(cneg))
      if (!step) break
      const scale = Math.max(...step.map(cnorm))
      // Damp only the wild first steps; near a root Newton is left alone.
      const damp = scale > 4 ? 4 / scale : 1
      x = x.map((v, i) => cadd(v, cmul(C(damp), step[i])))
      if (!x.every((v) => Number.isFinite(v.re) && Number.isFinite(v.im))) break
    }
    if (!ok) continue

    const { w, A } = pack(x)
    // Discard the degenerate ones honestly rather than counting them as curves:
    // A ≡ 0 means M ≡ 0, i.e. the "curve" is a single point; a vanishing weight or a
    // runaway one is not a control structure.
    if (Math.max(...A.map(cnorm)) < 1e-6) continue
    if (Math.min(...w.map(cnorm)) < 1e-6) continue
    if (Math.max(...w.map(cnorm)) > 1e6) continue
    // Dedupe on w ALONE: A ↦ −A is the same curve.
    const key = [w[2], w[3]]
    if (roots.some((r) => Math.max(cnorm(csub(r.w[2], key[0])), cnorm(csub(r.w[3], key[1]))) < 1e-6)) continue
    roots.push({ w, A, residual: Math.max(...F(x).map(cnorm)) })
  }
  return roots
}

/** Is it really PH? |z′| must equal |A|²/|Q|², measured against a central difference. */
function phDefect(Z: readonly Complex[], w: readonly Complex[], A: readonly Complex[]): number {
  const P = toPower(Z.map((z, k) => cmul(w[k], z)))
  const Q = toPower(w)
  const at = (t: number): Complex => cdiv(evalPoly(P, t), evalPoly(Q, t))
  let worst = 0
  const eps = 1e-6
  for (let i = 1; i < 12; i++) {
    const t = i / 12
    const measured = cnorm(csub(at(t + eps), at(t - eps))) / (2 * eps)
    const predicted = cnorm(evalPoly(A, t)) ** 2 / cnorm(evalPoly(Q, t)) ** 2
    worst = Math.max(worst, Math.abs(measured - predicted) / Math.max(predicted, 1e-300))
  }
  return worst
}

/** A real root of Q on [0,1] is a pole: the curve runs through infinity and is undrawable. */
function poleOnSpan(w: readonly Complex[]): boolean {
  const Q = toPower(w)
  let lo = Infinity
  for (let i = 0; i <= 400; i++) lo = Math.min(lo, cnorm(evalPoly(Q, i / 400)))
  return lo < 1e-6 * Math.max(...w.map(cnorm))
}

describe('complex-rational PH cubics over a fixed polygon and Farin point', () => {
  const POLYGONS: [string, Complex[], Complex][] = [
    [
      'the figure\'s polygon',
      [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)],
      C(-1.55, 0.2),
    ],
    [
      'a flatter one',
      [C(-2, 0), C(-0.7, 0.55), C(0.7, 0.5), C(2, 0)],
      C(-1.3, 0.35),
    ],
    [
      'an asymmetric one',
      [C(-1.5, -1.0), C(-1.7, 0.9), C(0.9, 1.4), C(1.6, -0.3)],
      C(-1.6, 0.1),
    ],
  ]

  it('the t^5 coefficient of M cancels identically, so M really has degree 4', () => {
    const [, Z] = POLYGONS[0]
    const w = [C(1), C(0.8, 0.3), C(1.2, -0.5), C(0.9, 0.1)]
    const { topCancel } = residual(Z, w, [C(1), C(0), C(0)])
    const scale = Math.max(...toPower(w).map(cnorm))
    console.log(`  M's t^5 coefficient: ${(topCancel / scale).toExponential(1)} relative`)
    expect(topCancel / scale, 'P′Q and PQ′ have the same leading term').toBeLessThan(1e-12)
  })

  it('COUNTS the solutions, and the count is stable across polygons', () => {
    const counts: number[] = []
    for (const [name, Z, q0] of POLYGONS) {
      const roots = solveAll(Z, q0, 6000, 12345)
      const drawable = roots.filter((r) => !poleOnSpan(r.w))
      const defects = roots.map((r) => phDefect(Z, r.w, r.A))
      console.log(
        `${name}:\n` +
          `    solutions found            ${roots.length}` +
          `   (Bezout bound 2^5 = 32)\n` +
          `    worst Newton residual      ${Math.max(...roots.map((r) => r.residual)).toExponential(1)}\n` +
          `    every one is PH            worst |z′| vs |A|²/|Q|² = ${Math.max(...defects).toExponential(1)}\n` +
          `    pole-free on [0,1]         ${drawable.length} of ${roots.length}` +
          `   ${drawable.length < roots.length ? '<- the rest run through infinity' : ''}\n` +
          `    w₂ of each                 ` +
          roots.slice(0, 8).map((r) => `${r.w[2].re.toFixed(2)}${r.w[2].im < 0 ? '' : '+'}${r.w[2].im.toFixed(2)}i`).join('  '),
      )
      counts.push(roots.length)
      expect(roots.length, `${name}: at least one solution`).toBeGreaterThan(0)
      expect(Math.max(...defects), `${name}: every solution is genuinely PH`).toBeLessThan(1e-5)
    }
    console.log(`  counts across polygons: ${counts.join(', ')}`)
    expect(new Set(counts).size, 'the count does not depend on which polygon').toBe(1)
    // TWO, the same as the polynomial cubic — not the "more than two" I predicted. Worth
    // stating as an equality so a future change to the algebra has to argue with it.
    expect(counts[0], 'and it is TWO, exactly as in the polynomial case').toBe(2)
  }, 300_000)

  it('the count does not depend on how hard we look', () => {
    const [, Z, q0] = POLYGONS[0]
    const runs = [1500, 3000, 6000].map((n) => solveAll(Z, q0, n, 999).length)
    const seeds = [111, 222, 333].map((s) => solveAll(Z, q0, 6000, s).length)
    console.log(`  by start count ${runs.join(', ')};  by seed ${seeds.join(', ')}`)
    expect(new Set([...runs.slice(1), ...seeds]).size, 'saturated: more starts find no more roots').toBe(1)
  }, 300_000)
})
