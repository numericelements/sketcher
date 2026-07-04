import { it } from 'vitest'
import {
  slide, familyBound, familyNumerator, assignSignsNeighbor, computeInactiveSetBySign,
  rational, type WeightedCP, CurvatureDragProblem,
} from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'

// E12-3: THE EXACT ORACLE. Recompute g's polygon in exact rational arithmetic
// (BigInt fractions — doubles are dyadic rationals, the whole pipeline is
// rational ops) at the pre/post states of a violating step from E13a, and
// compare exact signs vs double signs of the flagged coefficient.
//   double==exact at both states, sign changes  -> GENUINE crossing (regime problem)
//   double!=exact at either state              -> EVALUATION NOISE (arithmetic problem)

// ---------- exact rationals ----------
type Rat = { n: bigint; d: bigint } // d > 0, gcd-reduced
const gcd = (a: bigint, b: bigint): bigint => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t } return a }
const rat = (n: bigint, d: bigint): Rat => {
  if (d < 0n) { n = -n; d = -d }
  const g = gcd(n, d) || 1n
  return { n: n / g, d: d / g }
}
const rFrom = (x: number): Rat => {
  if (!Number.isFinite(x)) throw new Error('nonfinite')
  let d = 1n
  while (!Number.isInteger(x)) { x *= 2; d *= 2n; if (d > 10n ** 40n) throw new Error('not dyadic?') }
  return rat(BigInt(x), d)
}
const rAdd = (a: Rat, b: Rat): Rat => rat(a.n * b.d + b.n * a.d, a.d * b.d)
const rSub = (a: Rat, b: Rat): Rat => rat(a.n * b.d - b.n * a.d, a.d * b.d)
const rMul = (a: Rat, b: Rat): Rat => rat(a.n * b.n, a.d * b.d)
const rDiv = (a: Rat, b: Rat): Rat => { if (b.n === 0n) throw new Error('div0'); return rat(a.n * b.d, a.d * b.n) }
const rSign = (a: Rat): number => (a.n === 0n ? 0 : a.n > 0n ? 1 : -1)
const R0: Rat = { n: 0n, d: 1n }
const rInt = (k: number | bigint): Rat => ({ n: BigInt(k), d: 1n })

// ---------- exact complex ----------
type Cx = { re: Rat; im: Rat }
const cAdd = (a: Cx, b: Cx): Cx => ({ re: rAdd(a.re, b.re), im: rAdd(a.im, b.im) })
const cSub = (a: Cx, b: Cx): Cx => ({ re: rSub(a.re, b.re), im: rSub(a.im, b.im) })
const cMul = (a: Cx, b: Cx): Cx => ({ re: rSub(rMul(a.re, b.re), rMul(a.im, b.im)), im: rAdd(rMul(a.re, b.im), rMul(a.im, b.re)) })
const cConj = (a: Cx): Cx => ({ re: a.re, im: rSub(R0, a.im) })
const cScale = (a: Cx, s: Rat): Cx => ({ re: rMul(a.re, s), im: rMul(a.im, s) })
const C0: Cx = { re: R0, im: R0 }

// ---------- exact Boehm insertion (port of insertKnotOpen) ----------
function insertKnotOpenExact(cps: Cx[], degree: number, knots: Rat[], tBar: Rat): { cps: Cx[]; knots: Rat[] } {
  const cmp = (a: Rat, b: Rat) => rSign(rSub(a, b))
  // findOpenSpan: largest k with knots[k] <= tBar < knots[k+1] (clamped interior)
  let k = degree
  while (k + 1 < knots.length - degree && cmp(knots[k + 1], tBar) <= 0) k++
  const n = cps.length
  const q: Cx[] = new Array(n + 1)
  for (let i = 0; i <= k - degree; i++) q[i] = cps[i]
  for (let i = k + 1; i <= n; i++) q[i] = cps[i - 1]
  for (let i = k - degree + 1; i <= k; i++) {
    const denom = rSub(knots[i + degree], knots[i])
    const a = rSign(denom) === 0 ? R0 : rDiv(rSub(tBar, knots[i]), denom)
    q[i] = cAdd(cScale(cps[i - 1], rSub(rInt(1), a)), cScale(cps[i], a))
  }
  const newKnots = [...knots.slice(0, k + 1), tBar, ...knots.slice(k + 1)]
  return { cps: q, knots: newKnots }
}

/** Exact per-span Bézier coefficients of an open clamped spline (full Boehm insertion). */
function bezierizeExact(cps0: Cx[], degree: number, knots0: Rat[]): { spans: Cx[][]; breaks: Rat[] } {
  let cps = cps0.slice(), knots = knots0.slice()
  // distinct interior knots + current multiplicities
  const key = (r: Rat) => `${r.n}/${r.d}`
  const distinct: Rat[] = []
  for (const kn of knots) if (!distinct.some(x => key(x) === key(kn))) distinct.push(kn)
  for (const t of distinct) {
    const isEnd = key(t) === key(knots[0]) || key(t) === key(knots[knots.length - 1])
    if (isEnd) continue
    let mult = knots.filter(x => key(x) === key(t)).length
    while (mult < degree) { const r = insertKnotOpenExact(cps, degree, knots, t); cps = r.cps; knots = r.knots; mult++ }
  }
  const breaks = distinct // sorted already (input knots sorted)
  const numSpans = breaks.length - 1
  const spans: Cx[][] = []
  for (let s = 0; s < numSpans; s++) spans.push(cps.slice(s * degree, s * degree + degree + 1))
  return { spans, breaks }
}

// ---------- exact Bernstein-decomposition ops ----------
type BD = { spans: Cx[][]; breaks: Rat[] } // per-span Bézier coeffs, any degree
const bigBinom = (() => {
  const memo = new Map<string, bigint>()
  return (n: number, k: number): bigint => {
    const kk = `${n},${k}`
    if (memo.has(kk)) return memo.get(kk)!
    let r = 1n
    for (let i = 0; i < k; i++) r = (r * BigInt(n - i)) / BigInt(i + 1)
    memo.set(kk, r)
    return r
  }
})()
const bdMul = (f: BD, g: BD): BD => ({
  breaks: f.breaks,
  spans: f.spans.map((fc, s) => {
    const gc = g.spans[s]
    const p = fc.length - 1, q = gc.length - 1
    const fs = fc.map((v, i) => cScale(v, rInt(bigBinom(p, i))))
    const gs = gc.map((v, j) => cScale(v, rInt(bigBinom(q, j))))
    const out: Cx[] = []
    for (let k = 0; k <= p + q; k++) {
      let c = C0
      for (let i = Math.max(0, k - q); i <= Math.min(p, k); i++) c = cAdd(c, cMul(fs[i], gs[k - i]))
      out.push(cScale(c, rDiv(rInt(1), rInt(bigBinom(p + q, k)))))
    }
    return out
  }),
})
const bdSub = (f: BD, g: BD): BD => ({ breaks: f.breaks, spans: f.spans.map((fc, s) => fc.map((v, i) => cSub(v, g.spans[s][i]))) })
const bdAdd = (f: BD, g: BD): BD => ({ breaks: f.breaks, spans: f.spans.map((fc, s) => fc.map((v, i) => cAdd(v, g.spans[s][i]))) })
const bdScale = (f: BD, s: Rat): BD => ({ breaks: f.breaks, spans: f.spans.map((fc) => fc.map((v) => cScale(v, s))) })
const bdConj = (f: BD): BD => ({ breaks: f.breaks, spans: f.spans.map((fc) => fc.map(cConj)) })
const bdDeriv = (f: BD): BD => ({
  breaks: f.breaks,
  spans: f.spans.map((c, s) => {
    const p = c.length - 1
    if (p === 0) return [C0]
    const interval = rSub(f.breaks[s + 1], f.breaks[s])
    const out: Cx[] = []
    for (let i = 0; i < p; i++) out.push(cScale(cSub(c[i + 1], c[i]), rDiv(rInt(p), interval)))
    return out
  }),
})

/** Exact complex Chen G — port of complexChenG. Returns Im coefficients as Rats. */
function exactG(cps: WeightedCP[], knots: number[], degree: number): Rat[] {
  const rk = knots.map(rFrom)
  const Zcp: Cx[] = cps.map(p => cMul({ re: rFrom(p.re), im: rFrom(p.im) }, { re: rFrom(p.wRe), im: rFrom(p.wIm) }))
  const Wcp: Cx[] = cps.map(p => ({ re: rFrom(p.wRe), im: rFrom(p.wIm) }))
  const Z: BD = bezierizeExact(Zcp, degree, rk)
  const W: BD = bezierizeExact(Wcp, degree, rk)
  const Zu = bdDeriv(Z), Zuu = bdDeriv(Zu), Zuuu = bdDeriv(Zuu)
  const Wu = bdDeriv(W), Wuu = bdDeriv(Wu), Wuuu = bdDeriv(Wuu)
  const D1 = bdSub(bdMul(Zu, W), bdMul(Z, Wu))
  const D2 = bdSub(bdMul(Zuu, W), bdMul(Z, Wuu))
  const D3 = bdSub(bdMul(Zuuu, W), bdMul(Z, Wuuu))
  const D21 = bdSub(bdMul(Zuu, Wu), bdMul(Zu, Wuu))
  const D1c = bdConj(D1)
  const D1conjSq = bdMul(D1c, D1c)
  const bracket = bdSub(bdAdd(bdMul(D3, D1), bdMul(D1, D21)), bdScale(bdMul(D2, D2), rat(3n, 2n)))
  const T = bdAdd(bdMul(W, bracket), bdScale(bdMul(D1, bdSub(bdMul(Wu, D2), bdMul(Wuu, D1))), rInt(2)))
  const G = bdMul(bdMul(D1conjSq, T), bdConj(W))
  return G.spans.flat().map(c => c.im)
}

// ---------- the experiment ----------
const d = 3, n = 32
const openKnots = (nn: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const mk = (): WeightedCP[] => Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n
  return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
})

// ~25s — a lab oracle, not a suite test; remove .skip to run.
it.skip('E12-3: exact oracle on a violating step', () => {
  const knots = openKnots(n)
  let cps = mk()
  const k = Math.floor(n / 3)
  const sx = cps[k].re, sy = cps[k].im
  const target = { x: sx + 55, y: sy + 200 }
  // sanity: exact pipeline agrees with double pipeline on the START state
  const gD0 = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
  const gE0 = exactG(cps, knots, d)
  if (gD0.length !== gE0.length) throw new Error(`len mismatch ${gD0.length} vs ${gE0.length}`)
  let worstRel = 0
  const mx = Math.max(...gD0.map(Math.abs))
  for (let i = 0; i < gD0.length; i++) {
    const e = Number(gE0[i].n) / Number(gE0[i].d) // approx for magnitude compare only
    if (Number.isFinite(e)) worstRel = Math.max(worstRel, Math.abs(gD0[i] - e) / mx)
  }
  console.log(`E12-3 sanity: ${gD0.length} coeffs, worst |double-exact|/max = ${worstRel.toExponential(1)}`)

  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const startB = familyBound('rational', cps, knots, d, 'open')
    const problem = new CurvatureDragProblem('rational', cps, knots, d, 'open', k, tick,
      cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
    const r = new InteriorPointOptimizer(problem, { maxIterations: 20, enableBFGS: false, returnBestFeasible: true }).optimize()
    problem.setVariables(r.variables)
    const raw = problem.result()
    if (familyBound('rational', raw, knots, d, 'open') > startB) {
      // the flagged ACTIVE flipping coefficient(s)
      const g0 = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
      const g1 = familyNumerator('rational', raw, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
      const s0 = assignSignsNeighbor(g0), s1 = assignSignsNeighbor(g1)
      const inactive = computeInactiveSetBySign(s0, g0.map(Math.abs))
      const flips = g0.map((_, i) => i).filter(i => s0[i] !== s1[i] && !inactive.has(i))
      console.log(`E12-3 violating tick ${s}: active flips at [${flips.join(',')}]`)
      const eg0 = exactG(cps, knots, d)
      const eg1 = exactG(raw, knots, d)
      for (const i of flips) {
        const mxAbs = Math.max(...g0.map(Math.abs))
        console.log(`E12-3   #${i}: PRE  double ${g0[i].toExponential(3)} (sign ${Math.sign(g0[i])})  exact sign ${rSign(eg0[i])}   |g|/max ${(Math.abs(g0[i]) / mxAbs).toExponential(1)}`)
        console.log(`E12-3   #${i}: POST double ${g1[i].toExponential(3)} (sign ${Math.sign(g1[i])})  exact sign ${rSign(eg1[i])}`)
        const preMatch = Math.sign(g0[i]) === rSign(eg0[i]), postMatch = Math.sign(g1[i]) === rSign(eg1[i])
        console.log(`E12-3   VERDICT #${i}: ${preMatch && postMatch ? 'GENUINE CROSSING (regime problem)' : 'EVALUATION NOISE (arithmetic problem)'}`)
      }
      break // one violating tick is the specimen
    }
    cps = slide('rational', cps, knots, d, 'open', k, tick, { solver: 'ipopt', jacobian: 'analytic', maxIterations: 20 }).points
  }
}, 600000)
