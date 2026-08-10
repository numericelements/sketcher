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
// real count has to be measured. IT IS TWO ALGEBRAICALLY, ONE GEOMETRICALLY.
//
// Two roots — stable across three unrelated polygons, across 1500/3000/6000 Newton starts and
// across three seeds, with every root PH to 1e-10 and pole-free. So Bézout is loose by 16 and
// this system is nothing like generic. (I predicted MORE than two and wrote the assertion that
// way; it failed, which is how the prediction got corrected instead of shipped.)
//
// BUT ONE OF THE TWO IS REDUCIBLE, and Eric found it by watching the figure: moving Z₂ moved
// the selected curve and left the other branch dead still. A curve that does not move while
// its weights do can only mean the degree-3 representation has SLACK, and for z = P/Q that
// means P and Q share a factor. Measured: branch B's P vanishes at TWO of Q's three roots
// (1.2e-16 and 8.0e-16), so they share a QUADRATIC factor and z = P/Q collapses to degree ONE
// — a Möbius image of a line, i.e. a circular arc, which is trivially a rational PH curve. The
// cubic representations of one such arc form a 4-real-parameter family, which is exactly the
// insensitivity on screen: moving Z₂ spends 2 of those 4 and the curve does not care.
//
// So the genuine count of IRREDUCIBLE complex-rational PH cubics over a polygon and a bead is
// ONE. The second solution is the degenerate stratum the 3D work calls reducible, met here in
// its smallest form. Consequence for the figure: the grey curve is not a peer of the dark one
// and should not be drawn as though it were — it is always a circle.
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
import * as core from '../complexRationalPHCubic'
import { rootsOf } from '../conformalPHHopf'

/** A complex polynomial evaluated at a COMPLEX argument — Horner. */
const evalAt = (p: readonly Complex[], z: Complex): Complex =>
  p.reduceRight((acc, c) => cadd(cmul(acc, z), c), C(0))

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
    // TWO ALGEBRAIC roots — but see the reducibility test below: only ONE is irreducible, so
    // this equality is about the algebra, not about how many curves the figure should draw.
    expect(counts[0], 'two algebraic solutions (one of them reducible)').toBe(2)
  }, 300_000)

  it('the count does not depend on how hard we look', () => {
    const [, Z, q0] = POLYGONS[0]
    const runs = [1500, 3000, 6000].map((n) => solveAll(Z, q0, n, 999).length)
    const seeds = [111, 222, 333].map((s) => solveAll(Z, q0, 6000, s).length)
    console.log(`  by start count ${runs.join(', ')};  by seed ${seeds.join(', ')}`)
    expect(new Set([...runs.slice(1), ...seeds]).size, 'saturated: more starts find no more roots').toBe(1)
  }, 300_000)
})

// ---------------------------------------------------------------------------
// The core module, against the same count — the figure depends on these three.
// ---------------------------------------------------------------------------
describe('the core module the figure drives', () => {
  const Z: Complex[] = [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)]
  const Q0 = C(-1.55, 0.2)

  it('solveFromFarin finds BOTH branches on the figure\'s starting data', () => {
    const both = core.solveFromFarin(Z, 0, Q0)
    console.log(
      `  branches ${both.length}, residuals ` +
        both.map((b) => b.residual.toExponential(1)).join(' ') +
        `, min|Q| ` + both.map((b) => core.denominatorFloor(b).toFixed(3)).join(' '),
    )
    expect(both.length, 'two, as measured above').toBe(2)
    expect(Math.max(...both.map((b) => b.residual)), 'both solved to machine zero').toBeLessThan(1e-12)
    expect(Math.min(...both.map((b) => core.denominatorFloor(b))), 'both pole-free').toBeGreaterThan(0.01)
  })

  it('the prescribed bead comes back as the handle bead — the chart round-trips', () => {
    for (const handle of [0, 1, 2] as const) {
      const both = core.solveFromFarin(Z, handle, Q0)
      expect(both.length, `handle ${handle}: two branches`).toBe(2)
      for (const b of both) {
        const q = core.farinPoints(b)[handle]
        expect(q, `handle ${handle}: the bead exists`).not.toBeNull()
        expect(cnorm(csub(q as Complex, Q0)), `handle ${handle}: it IS the one prescribed`).toBeLessThan(1e-9)
      }
    }
  })

  it('trackFromFarin follows a branch instead of re-deciding it', () => {
    const both = core.solveFromFarin(Z, 0, Q0)
    // Walk the bead a long way in small steps; the branch must stay the branch, which is
    // what makes the drag continuous rather than snapping between the two curves.
    let a = both[0], b = both[1]
    for (let i = 1; i <= 40; i++) {
      const q = C(Q0.re + 0.008 * i, Q0.im + 0.004 * i)
      const na = core.trackFromFarin(Z, 0, q, a)
      const nb = core.trackFromFarin(Z, 0, q, b)
      expect(na, `step ${i}: branch A survives`).not.toBeNull()
      expect(nb, `step ${i}: branch B survives`).not.toBeNull()
      a = na as core.ComplexRationalPHCubic
      b = nb as core.ComplexRationalPHCubic
    }
    const apart = Math.max(...a.w.map((wv, i) => cnorm(csub(wv, b.w[i]))))
    console.log(`  after 40 steps the two branches are ${apart.toExponential(1)} apart in w`)
    expect(a.residual, 'A still exact').toBeLessThan(1e-12)
    expect(b.residual, 'B still exact').toBeLessThan(1e-12)
    expect(apart, 'and they never collapsed onto each other').toBeGreaterThan(1e-3)
  })
})

// ---------------------------------------------------------------------------
// Eric watched the figure and reported that moving Z₂ moves the selected curve but
// leaves the OTHER branch apparently still, while moving Z₁ or Z₃ moves both. Is that
// real, or is the figure failing to re-track? Measure the sensitivity of each branch to
// each control point and let the table say.
// ---------------------------------------------------------------------------
describe('how each branch responds to each control point', () => {
  const Z: Complex[] = [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)]
  const Q0 = C(-1.55, 0.2)

  it('measures the sensitivity of BOTH branches to each Zₖ', () => {
    const both = core.solveFromFarin(Z, 0, Q0)
    expect(both.length).toBe(2)
    const sample = (c: core.ComplexRationalPHCubic): Complex[] =>
      Array.from({ length: 21 }, (_, i) => core.curveAt(c, i / 20) ?? C(0))
    const base = both.map(sample)
    const D = 0.06

    const rows: string[] = []
    for (let k = 0; k < 4; k++) {
      const moved = Z.map((z, i) => (i === k ? C(z.re + D, z.im) : z))
      const cells = both.map((b, j) => {
        const next = core.trackFromFarin(moved, 0, Q0, b)
        if (!next) return 'LOST'
        const s = sample(next)
        const move = Math.max(...s.map((p, i) => cnorm(csub(p, base[j][i]))))
        const dw = Math.max(...next.w.map((wv, i) => cnorm(csub(wv, b.w[i]))))
        return `curve ${move.toFixed(4)} / w ${dw.toFixed(4)}`
      })
      rows.push(`    Z${k} moved ${D}:   A: ${cells[0]}      B: ${cells[1]}`)
    }
    console.log(`sensitivity of each branch to each control point:\n${rows.join('\n')}`)
    console.log(
      `    branch weights   A: ` + both[0].w.map((w) => `${w.re.toFixed(2)}${w.im < 0 ? '' : '+'}${w.im.toFixed(2)}i`).join(' ') +
      `\n                     B: ` + both[1].w.map((w) => `${w.re.toFixed(2)}${w.im < 0 ? '' : '+'}${w.im.toFixed(2)}i`).join(' '),
    )

    // Neither branch may be insensitive to a control point it genuinely depends on, and
    // neither may be LOST for a step this small. Whichever way the table falls, it is a
    // fact about the family or a fact about the tracker, and the message says which.
    for (let k = 0; k < 4; k++) {
      const moved = Z.map((z, i) => (i === k ? C(z.re + D, z.im) : z))
      for (const [j, b] of both.entries()) {
        const next = core.trackFromFarin(moved, 0, Q0, b)
        expect(next, `Z${k}, branch ${j}: tracking must not lose the branch`).not.toBeNull()
      }
    }
  }, 120_000)

  it('solveIrreducibleFromFarin returns the genuine one, for every handle', () => {
    // What the figure now calls. It must never hand back the circular arc.
    //
    // The same bead POSITION is reused for all three handles, which is a strange thing to ask
    // of edges 1 and 2 — that point sits near edge 0 — so their coprimality reads 2.5e-3 and
    // 6.2e-3 against handle 0's 1.2. Still five orders above the 1e-8 filter, so these are
    // genuine cubics, but the small numbers are the odd request and not a near-degeneracy of
    // the family. A figure moves the bead WITH the handle when swapping, so it never asks this.
    const Z: Complex[] = [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)]
    for (const handle of [0, 1, 2] as const) {
      const c = core.solveIrreducibleFromFarin(Z, handle, C(-1.55, 0.2))
      expect(c, `handle ${handle}: one exists`).not.toBeNull()
      const got = c as core.ComplexRationalPHCubic
      const red = core.reducibility(got)
      console.log(`    handle ${handle}: coprime ${red.toExponential(1)}, residual ${got.residual.toExponential(1)}`)
      expect(red, `handle ${handle}: P and Q are coprime`).toBeGreaterThan(1e-3)
      expect(got.residual, `handle ${handle}: still exact`).toBeLessThan(1e-12)
    }
  }, 120_000)

  it('and the explanation: one branch is REDUCIBLE', () => {
    // A curve unchanged while its weights move can only mean the degree-3 representation has
    // slack, and for z = P/Q that means P and Q SHARE A FACTOR. Then z is really a degree-2
    // rational curve wearing a cubic coat, and the family of cubic representations of it is
    // positive-dimensional — which is exactly the insensitivity Eric saw.
    const Z: Complex[] = [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)]
    const both = core.solveFromFarin(Z, 0, C(-1.55, 0.2))
    for (const [j, b] of both.entries()) {
      const P = core.toPower(b.Z.map((z, k) => cmul(b.w[k], z)))
      const Q = core.toPower(b.w)
      const qRoots = rootsOf(Q)
      const scaleP = Math.max(...P.map(cnorm))
      const hits = qRoots.map((r) => cnorm(evalAt(P, r)) / scaleP)
      console.log(
        `    branch ${'AB'[j]}: |P| at Q's roots = ${hits.map((h) => h.toExponential(1)).join('  ')}` +
          `   ${Math.min(...hits) < 1e-8 ? '<- COMMON FACTOR: reducible' : '<- irreducible'}`,
      )
    }
    const reducible = both.filter((b) => {
      const P = core.toPower(b.Z.map((z, k) => cmul(b.w[k], z)))
      const scaleP = Math.max(...P.map(cnorm))
      return rootsOf(core.toPower(b.w)).some((r) => cnorm(evalAt(P, r)) / scaleP < 1e-8)
    })
    console.log(`    so ${reducible.length} of ${both.length} is reducible: the GENUINE count is ${both.length - reducible.length}`)
    expect(reducible.length, 'exactly one of the two is a lower-degree curve in disguise').toBe(1)
  }, 120_000)
  it('MOBIUS PRESERVES PH, and the only thing used is that C has square roots', () => {
    // Act II's headline, made executable. Mobius acts linearly on the homogeneous pair, the Wronskian
    // is bilinear and alternating so M -> (ad-bc)M, and a constant multiple of a square is a square:
    // lambda*A^2 = (sqrt(lambda)*A)^2. Nothing geometric is used, only that the scalars have square
    // roots -- which is exactly what fails one signature up, where the isotropic cone stops factoring.
    const Z = [C(-1.9, -0.6), C(-1.2, 1.0), C(0.4, 1.1), C(1.1, -0.6)]
    const q0 = C(-1.55, 0.2)
    const start = core.solveIrreducibleFromFarin(Z, 0, q0)
    expect(start, 'a genuine cubic to transform').not.toBeNull()
    const before = start as core.ComplexRationalPHCubic
    const MAPS: [string, core.MobiusMap][] = [
      ['a rotation-scaling  z -> (1+i)z', { a: C(1, 1), b: C(0), c: C(0), d: C(1) }],
      ['a translation       z -> z + (0.4-0.3i)', { a: C(1), b: C(0.4, -0.3), c: C(0), d: C(1) }],
      ['an inversion        z -> 1/z', { a: C(0), b: C(1), c: C(1), d: C(0) }],
      ['a generic Mobius', { a: C(0.7, -0.2), b: C(-0.35, 0.9), c: C(0.15, 0.4), d: C(1.1, 0.25) }],
    ]
    for (const [name, m] of MAPS) {
      const after = core.mobiusImage(before, m)
      expect(after, `${name}: the image exists`).not.toBeNull()
      const img = after as core.ComplexRationalPHCubic
      // The image is still exactly PH -- and A was not re-solved, only multiplied by sqrt(det)/w0-tilde.
      console.log(
        `    ${name.padEnd(40)} M - A^2: ${core.phResidual(before).toExponential(1)}` +
          ` -> ${img.residual.toExponential(1)}   coprime ${core.reducibility(img).toExponential(1)}`,
      )
      expect(img.residual, `${name}: still exactly PH, with A only rescaled`).toBeLessThan(1e-9)
      // And it is still a genuine cubic, not a lower-degree curve in a cubic coat.
      expect(core.reducibility(img), `${name}: irreducibility survives`).toBeGreaterThan(1e-6)
    }

    // The image really is the pointwise Mobius image of the curve, so nothing above is vacuous.
    const m = MAPS[3][1]
    const img = core.mobiusImage(before, m) as core.ComplexRationalPHCubic
    let worst = 0
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const z = core.curveAt(before, t)
      const got = core.curveAt(img, t)
      if (!z || !got) continue
      const want = cdiv(cadd(cmul(m.a, z), m.b), cadd(cmul(m.c, z), m.d))
      worst = Math.max(worst, cnorm(csub(got, want)) / Math.max(cnorm(want), 1e-12))
    }
    console.log(`    and image(t) = mu(curve(t)) pointwise to ${worst.toExponential(1)}`)
    expect(worst, 'the transformed cubic IS the Mobius image, pointwise').toBeLessThan(1e-12)
  }, 120_000)
})
