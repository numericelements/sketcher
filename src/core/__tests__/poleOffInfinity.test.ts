// ============================================================================
// MOVING THE POLE OFF INFINITY — Eric's suggestion, and it works. My prediction did not.
//
// The λ-chart curve has a denominator of degree 1 against a numerator of degree 4, so it runs to
// infinity like t³: a SIMPLE pole at t = 1.7 and a TRIPLE pole at ∞. Lifted, that becomes a
// degree-2 denominator inside a degree-8 box, and the drag costs 200 iterations where the same
// curve at its own degree costs 5.
//
// Eric asked whether a Möbius reparametrisation that brings ∞ to a finite parameter would help.
// I predicted it would NOT — that the triple pole is intrinsic, so relocating it changes nothing,
// and the drag would still need ≳150 iterations. That prediction is WRONG, and the measurement
// splits the cost in two.
//
//     t = 1.5s/(s+0.5)  sends 0→0, 1→1, ∞ → s = −0.5, outside the domain.
//     The curve becomes deg W 4 against deg Q 4 — BALANCED, the same shape lift8g has — and the
//     triple pole arrives at s = −0.5, still triple ("multiple — undefined" three times over).
//
//     specimen                       box       poles                    100% track   rel. defect
//     the curve itself, degree 4     —         simple + triple at ∞          5         1e-10
//     lift8g, degree 8               (8,8,8)   four simple                  40         1.4e-14
//     lift8, degree 8                (2,5,8)   simple + triple at ∞        200         3.4e-8
//     REPARAMETRISED, degree 8       (8,8,8)   simple + triple at −0.5      80         4.8e-7
//
// So the cost was two things, and only now can they be told apart:
//
//   · THE BOX is most of it, and it is representational. Balancing the degrees took 200 → 80,
//     with nothing but a change of parameter. Eric's suggestion, and it is worth a factor of 2.5.
//   · THE TRIPLE POLE is the rest, and it does not move. 80 against lift8g's 40, and a relative
//     defect that stalls at 5e-7 where lift8g reaches 1.4e-14 — seven orders. Same box, same
//     degree, same construction; the only difference left is one pole of multiplicity three.
//
// ONE TRAP PAID FOR HERE: deg(Q′W − QW′) ≤ deg Q + deg W − 2 because the leading terms cancel, so
// ‖N‖² must be trimmed to its TRUE degree before its polynomial square root. Taking the formal
// degree divides by a rounding artifact, and the first run of this file produced a "PH residual"
// of 4.4e+23 and a drag table of pure noise that looked like a confirmation of my prediction.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { hardQuarticRat } from '../../talks/ph-rational/poleLabPresets'
import { bernsteinToPower } from '../conformalPHHopf'
import { liftToConformal, toBernstein } from '../conformalLift'
import { dragControlPoint, controlPoints, degreeOf, residual } from '../conformalPHCurve'
import { phRelativeResidual, type Rat } from '../nurbsPH'
import { readPoles, trueDegreePoly } from '../poleReadout'
import { vnorm, vsub } from '../quaternion'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }
type P = number[]
const pmul = (a: P, b: P): P => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}
const padd = (...ps: P[]): P =>
  Array.from({ length: Math.max(...ps.map((q) => q.length)) },
    (_, i) => ps.reduce((s, q) => s + (q[i] ?? 0), 0))
const psub = (a: P, b: P): P => padd(a, b.map((v) => -v))
const pderiv = (a: P): P => a.slice(1).map((v, i) => v * (i + 1))
const trueDeg = (p: P): number => trueDegreePoly([...p], 1e-11).length - 1
const ppow = (a: P, n: number): P => {
  let o: P = [1]
  for (let i = 0; i < n; i++) o = pmul(o, a)
  return o
}
/** Substitute t = (α s)/(s + β) and clear the denominator: returns p(t)·(s+β)^n. */
const substitute = (p: P, n: number, alpha: number, beta: number): P => {
  let acc: P = [0]
  for (let k = 0; k < p.length; k++) {
    acc = padd(acc, pmul([p[k]], pmul(ppow([0, alpha], k), ppow([beta, 1], n - k))))
  }
  return acc
}
/**
 * The polynomial square root of a perfect square, by coefficient matching.
 *
 * a = r², deg a = 2n. Then a_{n+k} = Σ_{i+j=n+k} rᵢrⱼ, and the two pairs (n,k) and (k,n) supply
 * 2·r_n·r_k, so every other coefficient is already known when we work downward from k = n−1.
 */
function psqrt(a: P): { root: P; residual: number } {
  const n = Math.floor((a.length - 1) / 2)
  const r = new Array<number>(n + 1).fill(0)
  r[n] = Math.sqrt(Math.abs(a[2 * n]))
  for (let k = n - 1; k >= 0; k--) {
    let acc = a[n + k] ?? 0
    for (let i = 0; i <= n; i++) {
      const j = n + k - i
      if (j < 0 || j > n) continue
      if (i === n || j === n) continue
      acc -= r[i] * r[j]
    }
    r[k] = acc / (2 * r[n])
  }
  const back = pmul(r, r)
  const scale = Math.max(...a.map(Math.abs), 1e-300)
  const res = Math.max(...padd(back, a.map((v) => -v)).map(Math.abs)) / scale
  return { root: r, residual: res }
}

describe('moving the pole off infinity', () => {
  it('balances the box, which helps — and leaves the triple pole, which does not move', () => {
    const rat = hardQuarticRat()
    const w = bernsteinToPower(rat.w)
    const q = [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i])))
    say(`  ORIGINAL: deg w ${trueDeg(w)}, deg q ${Math.max(...q.map(trueDeg))},` +
      ` PH residual ${phRelativeResidual(rat).toExponential(1)}`)
    const liftA = liftToConformal(w, q, bernsteinToPower(rat.rho))
    say(`      lift degree ${liftA.degree}`)

    // t = 1.5 s / (s + 0.5): sends 0→0, 1→1, and ∞ ↦ s = −0.5, outside the domain.
    const alpha = 1.5, beta = 0.5
    const dq = 4, dw = 1
    const Q = q.map((qi) => substitute(qi, dq, alpha, beta))
    const wt = substitute(w, dw, alpha, beta)
    // x = Q/(s+β)^4 ÷ [wt/(s+β)] = Q / [(s+β)^3 · wt]
    const W2 = pmul(ppow([beta, 1], dq - dw), wt)
    say('')
    say(`  REPARAMETRISED (t = ${alpha}s/(s+${beta}), so ∞ lands at s = −${beta}):`)
    say(`      deg W ${trueDeg(W2)}, deg Q ${Math.max(...Q.map(trueDeg))}  — BALANCED`)
    // ρ from the Wronskian, then its polynomial square root
    const N2 = Q.map((Qi) => psub(pmul(pderiv(Qi), W2), pmul(Qi, pderiv(W2))))
    // deg(Q′W − QW′) ≤ deg Q + deg W − 2, because the leading terms CANCEL — so ‖N‖² must be
    // trimmed to its true degree before the square root, or the leading coefficient it divides by
    // is a rounding artifact and everything downstream is noise.
    const nnRaw = N2.reduce<P>((acc, c) => padd(acc, pmul(c, c)), [0])
    const nn = trueDegreePoly([...nnRaw], 1e-12)
    say(`      deg N ${Math.max(...N2.map(trueDeg))}, ‖N‖² formal degree ${nnRaw.length - 1},` +
      ` true degree ${nn.length - 1}`)
    const { root: rho2, residual: sqres } = psqrt(nn)
    say(`      ‖N‖² is a perfect square to ${sqres.toExponential(1)} → ρ of degree ${trueDeg(rho2)}`)
    const dW2 = trueDeg(W2)
    const dQ2 = Math.max(...Q.map(trueDeg))
    const dd = Math.max(dW2, dQ2)
    const ratB: Rat = {
      P: Array.from({ length: dd + 1 }, (_, k) => {
        const wb = toBernstein(W2, dd)
        return [0, 1, 2].map((i) => toBernstein(Q[i], dd)[k] / wb[k])
      }),
      w: toBernstein(W2, dd),
      rho: toBernstein(rho2, 2 * dd - 1),
    }
    say(`      PH residual of the reparametrised source ${phRelativeResidual(ratB).toExponential(1)}`)
    const poles = readPoles(ratB)
    say(`      poles ${poles.map((p) => `${p.at.re.toFixed(3)}${Math.abs(p.at.im) > 1e-9 ? `±${Math.abs(p.at.im).toFixed(3)}i` : ''}`).join('  ')}`)
    say(`      verdicts ${poles.map((p) => p.verdict).join(', ')}`)

    const liftB = liftToConformal(W2, Q, rho2)
    const stB = liftB.state
    say(`      lift degree ${liftB.degree}, defining residual ` +
      `${(Math.max(...residual(stB).map(Math.abs)) / Math.max(...stB.C.flat().map(Math.abs)) ** 2).toExponential(1)}`)

    say('')
    say('  THE TEST: the same 20%-of-chord drag, at matched budgets')
    const n = degreeOf(stB)
    const Pb = controlPoints(stB)
    const chord = vnorm(vsub(Pb[n], Pb[0]))
    say(`      |C| max ${Math.max(...stB.C.flat().map(Math.abs)).toExponential(1)}`)
    say('      budget    tracked   defect')
    for (const it of [5, 10, 20, 40, 80, 150, 200, 400]) {
      const s0 = Pb[3]
      const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
      const want = vnorm(vsub(to, s0))
      const got = dragControlPoint(stB, 3, to, { pinEnds: true, iterations: it })
      const rel = got.defect / Math.max(...got.state.C.flat().map(Math.abs)) ** 2
      say(`      ${String(it).padStart(4)}      ${(100 * (1 - got.trackingError / want)).toFixed(0).padStart(4)}%` +
        `   absolute ${got.defect.toExponential(1)}   RELATIVE ${rel.toExponential(1)}`)
    }
    for (const line of OUT) console.log(line)

    // the reparametrised curve is a genuine member
    expect(phRelativeResidual(ratB), 'the reparametrised source is PH').toBeLessThan(1e-10)
    expect(sqres, '‖N‖² really was a perfect square').toBeLessThan(1e-10)
    // balanced box
    expect(trueDeg(W2), 'denominator fills its box now').toBe(4)
    expect(Math.max(...Q.map(trueDeg)), 'and so does the numerator').toBe(4)
    // the triple pole survived the move
    expect(poles.filter((x) => x.multiple).length, 'the triple pole is still triple').toBe(3)
    // and the cost splits: better than 200, worse than lift8g's 40
    const at40 = (() => {
      const s0 = Pb[3]
      const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
      const g2 = dragControlPoint(stB, 3, to, { pinEnds: true, iterations: 40 })
      return 1 - g2.trackingError / vnorm(vsub(to, s0))
    })()
    const at80 = (() => {
      const s0 = Pb[3]
      const to = { x: s0.x + 0.2 * chord * 0.6, y: s0.y + 0.2 * chord * 0.6, z: s0.z - 0.2 * chord * 0.5 }
      const g2 = dragControlPoint(stB, 3, to, { pinEnds: true, iterations: 80 })
      return { track: 1 - g2.trackingError / vnorm(vsub(to, s0)),
        rel: g2.defect / Math.max(...g2.state.C.flat().map(Math.abs)) ** 2 }
    })()
    expect(at80.track, 'it tracks by eighty — far better than the 67% lift8 manages there')
      .toBeGreaterThan(0.999)
    expect(at40, 'but not yet by forty, where lift8g is already done').toBeLessThan(0.999)
    expect(at80.rel, 'and the accuracy stalls where lift8g reaches 1e-14').toBeGreaterThan(1e-9)
  }, 900_000)
})
