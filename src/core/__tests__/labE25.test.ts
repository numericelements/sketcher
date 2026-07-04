// ============================================================================
// E25 — the false-bound specimen and its cure (raw strict counting).
//
// HISTORY: with floor-based sign smoothing (assignSignsNeighbor pre-E25), this
// clustered-knot fixture displayed and enforced S⁻ = 14 while the EXACT polygon
// has 25 sign changes — a FALSE bound (Law 1's one test failed), verified by the
// BigInt oracle below: all 525 double signs correct, 0 exact zeros, and the 296
// sub-floor coefficients carry errors ELEVEN ORDERS below their own magnitudes
// (structurally tiny ≠ unresolvable — F1's wide spans). E25 removed the floor
// from sign assignment (raw strict signs; the floor survives as margin slack
// only). The live test pins the cure: the displayed count reads the true 25 and
// dominates the markers.
// ============================================================================
import { it, expect } from 'vitest'
import {
  rational, familyNumerator, assignSignsNeighbor, cyclicSignChanges,
  curvatureExtremaMarkersOfNumerator,
  type WeightedCP,
} from '../index'

const d = 3
const openKnots = (nn: number, cluster = false) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) {
    let t = i / (inner - 1)
    if (cluster) t = t ** 2.5
    k.push(t)
  }
  for (let i = 0; i < d; i++) k.push(1)
  return k
}

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


it('LIVE PIN: the clustered fixture reads the true count (25) and S⁻ ≥ markers', () => {
  const n = 24
  const knots = openKnots(n, true)
  const cps: WeightedCP[] = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
  })
  const g = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 })
  const S = cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), false)
  const Z = curvatureExtremaMarkersOfNumerator(g, false).length
  // The exact polygon count is 25 (oracle below). Raw counting reads it; the
  // pre-E25 smoothing read 14 — a false bound.
  expect(S).toBe(25)
  expect(S).toBeGreaterThanOrEqual(Z)
})

it.skip('ORACLE (record; ~20s): exact signs on the clustered fixture', () => {
  const n = 24
  const knots = openKnots(n, true)
  const cps: WeightedCP[] = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
  })
  const gD = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
  const { vals: gE } = exactG(cps, knots, d)
  const exactSigns = gE.map(rSign)
  // strict exact polygon sign changes (zeros skipped)
  let sExact = 0
  let prev = 0
  for (const sg of exactSigns) {
    if (sg === 0) continue
    if (prev !== 0 && sg !== prev) sExact++
    prev = sg
  }
  const sRobust = cyclicSignChanges(assignSignsNeighbor(gD), false)
  // where do double and exact SIGNS disagree, and at what magnitude class?
  let disagree = 0
  const mx = Math.max(...gD.map(Math.abs))
  const dis: string[] = []
  for (let i = 0; i < gD.length; i++) {
    const sd = Math.sign(gD[i])
    if (sd !== exactSigns[i] && exactSigns[i] !== 0) {
      disagree++
      if (dis.length < 6) dis.push(`#${i} |g|/max=${(Math.abs(gD[i]) / mx).toExponential(1)}`)
    }
  }
  console.log(`LAW1 clustered n=24: S⁻(exact polygon) = ${sExact}   S⁻(robust double) = ${sRobust}`)
  console.log(`LAW1 raw-double sign disagreements vs exact: ${disagree} of ${gD.length}  [${dis.join(', ')}]`)
  const nz = gE.filter((r) => r.n === 0n).length
  console.log(`LAW1 exact zeros: ${nz}`)
  // THE ERROR-LAW CHECK on the clustered fixture: is err_i really ~ eps*max here?
  const EPS = 2 ** -52
  const err = gD.map((v, i) => Math.abs(v - rToNum(gE[i])))
  const maxErr = Math.max(...err)
  console.log(`LAW1 error law here: max err = ${maxErr.toExponential(2)} = ${(maxErr / (EPS * mx)).toExponential(2)}·ε·max`)
  // errors of the SUB-FLOOR coefficients (the ones the robust assignment erases)
  const floor = 1e-14 * mx
  const sub = gD.map((v, i) => ({ v: Math.abs(v), e: err[i], i })).filter((x) => x.v <= floor && x.v > 0)
  const worstRel = Math.max(...sub.map((x) => x.e / x.v))
  console.log(`LAW1 sub-floor coefficients: ${sub.length}; worst err/|g| among them = ${worstRel.toExponential(2)} (signs reliable iff ≪ 1)`)
}, 600000)
