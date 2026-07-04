// ============================================================================
// E21 — the STRUCTURAL SCALE investigation (F1's open task, the E12 fix).
//
// Hypothesis: the magnitude ENVELOPE s (structuralScale.ts — the numerator
// pipeline in absolute-value arithmetic) gives the principled per-coefficient
// machine-zero floor ε·s_i, replacing the global 1e-12·max|g| that E12-3
// proved misclassifies genuine small coefficients at scale.
//
//   E21-1 (live): soundness s_i ≥ |g_i| on every family/fixture; tightness.
//   E21-2a (live): the E13a specimen — is #225-class re-classified correctly?
//   E21-2b (skip; run once, numbers recorded in the notebook): exact-oracle
//          per-coefficient errors err_i vs ε·s_i — the constant C, and the
//          separation between true structural zeros and real coefficients.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  slide, familyBound, familyNumerator, assignSignsNeighbor, computeInactiveSetBySign,
  rational, type WeightedCP, CurvatureDragProblem,
  curvatureExtremaNumeratorPlanar, curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorComplex,
} from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'
import { planarNumeratorEnvelope, complexNumeratorEnvelope } from '../structuralScale'

const EPS = 2 ** -52

// ---------- fixtures ----------
const d = 3
const openKnots = (nn: number, cluster = false) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) {
    let t = i / (inner - 1)
    if (cluster) t = t ** 2.5 // clustered toward 0 — the F1 regime
    k.push(t)
  }
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (nn: number) => Array.from({ length: nn }, (_, i) => i / nn)
const wave = (nn: number) => ({
  x: Array.from({ length: nn }, (_, i) => 180 * Math.cos((2 * Math.PI * i) / nn) + 12 * Math.sin((6 * Math.PI * i) / nn)),
  y: Array.from({ length: nn }, (_, i) => 95 * Math.sin((2 * Math.PI * i) / nn) + 9 * Math.cos((4 * Math.PI * i) / nn)),
})

describe('E21-1: the envelope is SOUND (s ≥ |g|) and reports honest tightness', () => {
  it('planar open (uniform + clustered), planar closed, complex open', () => {
    const report: string[] = []
    const check = (label: string, g: number[], s: number[]) => {
      expect(g.length).toBe(s.length)
      let worst = 0
      const ratios: number[] = []
      for (let i = 0; i < g.length; i++) {
        expect(Math.abs(g[i]), `${label} #${i}: envelope violated`).toBeLessThanOrEqual(s[i] * (1 + 1e-12) + 1e-300)
        worst = Math.max(worst, Math.abs(g[i]) / (s[i] || 1e-300))
        if (s[i] > 0) ratios.push(Math.abs(g[i]) / s[i])
      }
      ratios.sort((a, b) => a - b)
      const pct = (p: number) => ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))]
      const sRange = Math.max(...s) / Math.max(1e-300, Math.min(...s.filter((v) => v > 0)))
      report.push(`${label}: |g|/s max ${worst.toExponential(1)} p50 ${pct(0.5).toExponential(1)} p10 ${pct(0.1).toExponential(1)}  env-range ${sRange.toExponential(1)}`)
    }
    const n = 24
    const { x, y } = wave(n)
    check('planar open uniform  ',
      curvatureExtremaNumeratorPlanar(x, y, openKnots(n), d).flatCoeffs(),
      planarNumeratorEnvelope(x, y, openKnots(n), d))
    check('planar open clustered',
      curvatureExtremaNumeratorPlanar(x, y, openKnots(n, true), d).flatCoeffs(),
      planarNumeratorEnvelope(x, y, openKnots(n, true), d))
    check('planar closed        ',
      curvatureExtremaNumeratorPlanarPeriodic(x, y, periodicKnots(n), d).flatCoeffs(),
      planarNumeratorEnvelope(x, y, periodicKnots(n), d, true))
    const w = x.map((_, i) => 1 + 0.15 * Math.cos((4 * Math.PI * i) / n))
    check('complex open (w_im=0)',
      curvatureExtremaNumeratorComplex(x, y, w, w.map(() => 0), openKnots(n), d).flatCoeffs(),
      complexNumeratorEnvelope(x, y, w, w.map(() => 0), openKnots(n), d))
    console.log(report.join('\n'))
  })
})

describe('E21-2a: the E13a specimen — HEALED under the honest constants', () => {
  // HISTORY (measured before the E21 constants landed, floor 1e-12/margin 1e-9):
  //   violating tick 3, flip at #225: |g| 3.43e3, |g|/globalFloor 1.3e-1
  //   (misclassified as noise), |g|/(ε·envelope) 7.7e-5 (the envelope classifier
  //   refutation — it called the exact-verified sign carrier noise even harder).
  // Under floor 1e-14 + margin 1e-13 the phantom corridor is GONE and the raw
  // ipopt walk produces NO violating tick on this fixture — the E12-3 causal
  // chain closed at its root. This test now PINS the heal.
  it('the raw ipopt walk produces no violating tick (the corridor is gone)', () => {
    const n = 32
    const knots = openKnots(n)
    let cps: WeightedCP[] = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n
      return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
    })
    const k = Math.floor(n / 3)
    const sx = cps[k].re, sy = cps[k].im
    const target = { x: sx + 55, y: sy + 200 }
    const env = (cc: WeightedCP[]) => complexNumeratorEnvelope(
      cc.map((p) => p.re), cc.map((p) => p.im), cc.map((p) => p.wRe), cc.map((p) => p.wIm), knots, d)
    const gOf = (cc: WeightedCP[]) => familyNumerator('rational', cc, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()

    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
      const startB = familyBound('rational', cps, knots, d, 'open')
      // RAW solver step (pre-guard), exactly like the E12-3 oracle: the violation
      // happens INSIDE the solve; slide()'s guard would trim it before returning.
      const problem = new CurvatureDragProblem('rational', cps, knots, d, 'open', k, tick,
        cps.map((p) => p.wRe), cps.map((p) => p.wIm), 'analytic', { re: 1, im: 0 }, {})
      const r = new InteriorPointOptimizer(problem, { maxIterations: 20, enableBFGS: false, returnBestFeasible: true }).optimize()
      problem.setVariables(r.variables)
      const moved = problem.result()
      const rawB = familyBound('rational', moved, knots, d, 'open')
      expect(rawB, `tick ${s}: raw step violated the bound — the corridor is BACK (regression)`).toBeLessThanOrEqual(startB)
      cps = slide('rational', cps, knots, d, 'open', k, tick, { solver: 'ipopt', jacobian: 'analytic', maxIterations: 20 }).points
    }
    // (env/gOf kept as helpers for future forensics on this fixture)
    void env
    void gOf
    void assignSignsNeighbor
    void computeInactiveSetBySign
  }, 240000)
})


// ============================================================================
// E21-2b — WHAT PREDICTS THE TRUE PER-COEFFICIENT ERROR? (BigInt oracle; run
// once, numbers in the notebook; keep skipped — ~30 s.) Candidates:
//   (a) ε·max|g|            — the global model (today's implicit assumption)
//   (b) ε·s_i               — the abs-arithmetic envelope (refuted as classifier)
//   (c) ε·max|g| over the coefficient's SPAN — a locality probe
// For each: C = max_i err_i / predictor_i (soundness constant, want small and
// uniform) and the floor it implies at #225.
// ============================================================================
type Rat = { n: bigint; d: bigint }
const gcdE = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t } return a }
const rat = (n: bigint, d: bigint): Rat => {
  if (d < 0n) { n = -n; d = -d }
  const g = gcdE(n, d) || 1n
  return { n: n / g, d: d / g }
}
const rFrom = (x: number): Rat => {
  if (!Number.isFinite(x)) throw new Error('nonfinite')
  let dd = 1n
  while (!Number.isInteger(x)) { x *= 2; dd *= 2n; if (dd > 10n ** 40n) throw new Error('not dyadic?') }
  return rat(BigInt(x), dd)
}
const rAdd = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d)
const rSubE = (a: Rat, b: Rat): Rat => rat(a.n * b.d - b.n * a.d, a.d * b.d)
const rMul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d)
const rDivE = (a: Rat, b: Rat): Rat => { if (b.n === 0n) throw new Error('div0'); return rat(a.n * b.d, a.d * b.n) }
const rSign = (a: Rat): number => (a.n === 0n ? 0 : a.n > 0n ? 1 : -1)
const R0: Rat = { n: 0n, d: 1n }
const rInt = (k: number | bigint): Rat => ({ n: BigInt(k), d: 1n })
const rToNum = (a: Rat): number => {
  if (a.n === 0n) return 0
  const sign = a.n < 0n ? -1 : 1
  const n = a.n < 0n ? -a.n : a.n
  const d = a.d
  const e = n.toString(2).length - d.toString(2).length
  const SHIFT = 64n
  const q = e >= 0 ? (n << SHIFT) / (d << BigInt(e)) : (n << (SHIFT + BigInt(-e))) / d
  return sign * Number(q) * 2 ** (e - 64)
}
type Cx = { re: Rat; im: Rat }
const cAdd = (a: Cx, b: Cx): Cx => ({ re: rAdd(a.re, b.re), im: rAdd(a.im, b.im) })
const cSubE = (a: Cx, b: Cx): Cx => ({ re: rSubE(a.re, b.re), im: rSubE(a.im, b.im) })
const cMul = (a: Cx, b: Cx): Cx => ({ re: rSubE(rMul(a.re, b.re), rMul(a.im, b.im)), im: rAdd(rMul(a.re, b.im), rMul(a.im, b.re)) })
const cConj = (a: Cx): Cx => ({ re: a.re, im: rSubE(R0, a.im) })
const cScaleE = (a: Cx, s: Rat): Cx => ({ re: rMul(a.re, s), im: rMul(a.im, s) })
const C0: Cx = { re: R0, im: R0 }
function insertKnotOpenExact(cps: Cx[], degree: number, knots: Rat[], tBar: Rat): { cps: Cx[]; knots: Rat[] } {
  const cmp = (a: Rat, b: Rat) => rSign(rSubE(a, b))
  let k = degree
  while (k + 1 < knots.length - degree && cmp(knots[k + 1], tBar) <= 0) k++
  const nn = cps.length
  const q: Cx[] = new Array(nn + 1)
  for (let i = 0; i <= k - degree; i++) q[i] = cps[i]
  for (let i = k + 1; i <= nn; i++) q[i] = cps[i - 1]
  for (let i = k - degree + 1; i <= k; i++) {
    const denom = rSubE(knots[i + degree], knots[i])
    const a = rSign(denom) === 0 ? R0 : rDivE(rSubE(tBar, knots[i]), denom)
    q[i] = cAdd(cScaleE(cps[i - 1], rSubE(rInt(1), a)), cScaleE(cps[i], a))
  }
  const newKnots = [...knots.slice(0, k + 1), tBar, ...knots.slice(k + 1)]
  return { cps: q, knots: newKnots }
}
function bezierizeExact(cps0: Cx[], degree: number, knots0: Rat[]): { spans: Cx[][]; breaks: Rat[] } {
  let cps = cps0.slice(), knots = knots0.slice()
  const key = (r: Rat) => `${r.n}/${r.d}`
  const distinct: Rat[] = []
  for (const kn of knots) if (!distinct.some((x) => key(x) === key(kn))) distinct.push(kn)
  for (const t of distinct) {
    const isEnd = key(t) === key(knots[0]) || key(t) === key(knots[knots.length - 1])
    if (isEnd) continue
    let mult = knots.filter((x) => key(x) === key(t)).length
    while (mult < degree) { const r = insertKnotOpenExact(cps, degree, knots, t); cps = r.cps; knots = r.knots; mult++ }
  }
  const numSpans = distinct.length - 1
  const spans: Cx[][] = []
  for (let sp = 0; sp < numSpans; sp++) spans.push(cps.slice(sp * degree, sp * degree + degree + 1))
  return { spans, breaks: distinct }
}
type XBD = { spans: Cx[][]; breaks: Rat[] }
const bigBinom = (() => {
  const memo = new Map<string, bigint>()
  return (nn: number, kk: number): bigint => {
    const key2 = `${nn},${kk}`
    if (memo.has(key2)) return memo.get(key2)!
    let r = 1n
    for (let i = 0; i < kk; i++) r = (r * BigInt(nn - i)) / BigInt(i + 1)
    memo.set(key2, r)
    return r
  }
})()
const bdMul = (f: XBD, g: XBD): XBD => ({
  breaks: f.breaks,
  spans: f.spans.map((fc, sp) => {
    const gc = g.spans[sp]
    const p = fc.length - 1, q = gc.length - 1
    const fs = fc.map((v, i) => cScaleE(v, rInt(bigBinom(p, i))))
    const gs = gc.map((v, j) => cScaleE(v, rInt(bigBinom(q, j))))
    const out: Cx[] = []
    for (let kk = 0; kk <= p + q; kk++) {
      let c = C0
      for (let i = Math.max(0, kk - q); i <= Math.min(p, kk); i++) c = cAdd(c, cMul(fs[i], gs[kk - i]))
      out.push(cScaleE(c, rDivE(rInt(1), rInt(bigBinom(p + q, kk)))))
    }
    return out
  }),
})
const bdSubE = (f: XBD, g: XBD): XBD => ({ breaks: f.breaks, spans: f.spans.map((fc, sp) => fc.map((v, i) => cSubE(v, g.spans[sp][i]))) })
const bdAddE = (f: XBD, g: XBD): XBD => ({ breaks: f.breaks, spans: f.spans.map((fc, sp) => fc.map((v, i) => cAdd(v, g.spans[sp][i]))) })
const bdScaleE = (f: XBD, s: Rat): XBD => ({ breaks: f.breaks, spans: f.spans.map((fc) => fc.map((v) => cScaleE(v, s))) })
const bdConjE = (f: XBD): XBD => ({ breaks: f.breaks, spans: f.spans.map((fc) => fc.map(cConj)) })
const bdDerivE = (f: XBD): XBD => ({
  breaks: f.breaks,
  spans: f.spans.map((c, sp) => {
    const p = c.length - 1
    if (p === 0) return [C0]
    const interval = rSubE(f.breaks[sp + 1], f.breaks[sp])
    const out: Cx[] = []
    for (let i = 0; i < p; i++) out.push(cScaleE(cSubE(c[i + 1], c[i]), rDivE(rInt(p), interval)))
    return out
  }),
})
function exactG(cps: WeightedCP[], knots: number[], degree: number): { vals: Rat[]; spanOf: number[] } {
  const rk = knots.map(rFrom)
  const Zcp: Cx[] = cps.map((p) => cMul({ re: rFrom(p.re), im: rFrom(p.im) }, { re: rFrom(p.wRe), im: rFrom(p.wIm) }))
  const Wcp: Cx[] = cps.map((p) => ({ re: rFrom(p.wRe), im: rFrom(p.wIm) }))
  const Z: XBD = bezierizeExact(Zcp, degree, rk)
  const W: XBD = bezierizeExact(Wcp, degree, rk)
  const Zu = bdDerivE(Z), Zuu = bdDerivE(Zu), Zuuu = bdDerivE(Zuu)
  const Wu = bdDerivE(W), Wuu = bdDerivE(Wu), Wuuu = bdDerivE(Wuu)
  const D1 = bdSubE(bdMul(Zu, W), bdMul(Z, Wu))
  const D2 = bdSubE(bdMul(Zuu, W), bdMul(Z, Wuu))
  const D3 = bdSubE(bdMul(Zuuu, W), bdMul(Z, Wuuu))
  const D21 = bdSubE(bdMul(Zuu, Wu), bdMul(Zu, Wuu))
  const D1c = bdConjE(D1)
  const D1conjSq = bdMul(D1c, D1c)
  const bracket = bdSubE(bdAddE(bdMul(D3, D1), bdMul(D1, D21)), bdScaleE(bdMul(D2, D2), rat(3n, 2n)))
  const T = bdAddE(bdMul(W, bracket), bdScaleE(bdMul(D1, bdSubE(bdMul(Wu, D2), bdMul(Wuu, D1))), rInt(2)))
  const G = bdMul(bdMul(D1conjSq, T), bdConjE(W))
  const vals: Rat[] = []
  const spanOf: number[] = []
  G.spans.forEach((sp, sIdx) => sp.forEach((c) => { vals.push(c.im); spanOf.push(sIdx) }))
  return { vals, spanOf }
}

describe('E21-2b: what predicts the true per-coefficient error (BigInt oracle)', () => {
  it.skip('errors vs predictors at the E13a violating pre-state', () => {
    const n = 32
    const knots = openKnots(n)
    let cps: WeightedCP[] = Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n
      return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
    })
    const k = Math.floor(n / 3)
    const sx = cps[k].re, sy = cps[k].im
    const target = { x: sx + 55, y: sy + 200 }
    // walk to the violating tick (same recipe as E21-2a: tick 3 on this fixture)
    for (let s = 1; s <= 2; s++) {
      const t = s / 15
      const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
      cps = slide('rational', cps, knots, d, 'open', k, tick, { solver: 'ipopt', jacobian: 'analytic', maxIterations: 20 }).points
    }
    const gD = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
    const { vals: gE, spanOf } = exactG(cps, knots, d)
    expect(gD.length).toBe(gE.length)
    const err = gD.map((v, i) => Math.abs(v - rToNum(gE[i]))) // exact fits doubles' range here
    const mx = Math.max(...gD.map(Math.abs))
    const sEnv = complexNumeratorEnvelope(
      cps.map((p) => p.re), cps.map((p) => p.im), cps.map((p) => p.wRe), cps.map((p) => p.wIm), knots, d)
    // span-local max|g|
    const nSpans = Math.max(...spanOf) + 1
    const spanMax = new Array<number>(nSpans).fill(0)
    gD.forEach((v, i) => { spanMax[spanOf[i]] = Math.max(spanMax[spanOf[i]], Math.abs(v)) })
    const predictors: [string, (i: number) => number][] = [
      ['(a) eps*max|g| global ', () => EPS * mx],
      ['(b) eps*envelope s_i  ', (i) => EPS * sEnv[i]],
      ['(c) eps*spanMax|g|    ', (i) => EPS * spanMax[spanOf[i]]],
    ]
    for (const [name, pred] of predictors) {
      let C = 0, cAt = -1
      const margins: number[] = []
      for (let i = 0; i < gD.length; i++) {
        const p = pred(i)
        if (p > 0) {
          const r = err[i] / p
          if (r > C) { C = r; cAt = i }
          margins.push(r)
        }
      }
      margins.sort((a, b) => a - b)
      const p50 = margins[Math.floor(margins.length / 2)]
      console.log(`E21-2b ${name}: C = max err/pred = ${C.toExponential(2)} (at #${cAt})  median ${p50.toExponential(2)}`)
    }
    // the specimen's true error vs its magnitude
    const i225 = 225
    console.log(`E21-2b specimen #225: |g| ${Math.abs(gD[i225]).toExponential(2)}  TRUE err ${err[i225].toExponential(2)}  err/(eps*max) ${(err[i225] / (EPS * mx)).toExponential(2)}  spanMax ${spanMax[spanOf[i225]].toExponential(2)}`)
    // exact structural zeros?
    const nExactZero = gE.filter((r) => r.n === 0n).length
    console.log(`E21-2b exact zeros among ${gE.length} coefficients: ${nExactZero}`)
  }, 600000)
})
