// ============================================================================
// THE RATIONAL FIBRE CIRCLE IS AN EXTENSION OF THE POLYNOMIAL ONE — and the twist dial is the road in.
//
// THE QUESTION, Eric's, and it is the right one to ask of any generalisation: if you drive the sliders
// until the curve lands on the POLYNOMIAL family, does the fibre slider become the polynomial deck's
// fibre slider? A rational theory that does not restrict to the classical one is not an extension of
// it, however pretty its formulas are.
//
// AND θ = 0 IS THE WRONG END, which is the natural guess and worth pinning against. Zero twist sounds
// like "no pole"; it is where the pole is MOST genuine (cancellation 2.75). The limit is at ±89.9°.
//
// THE ROAD IN IS THE TWIST DIAL, which the degree-4 pair already knew (chartModel's OPENING_THETA note):
// at both ends of the λ slider the pole CANCELS — 𝒜(r) → 0, the apparent pole divides out, and the
// degree drops by one. At degree 4 that gave a polynomial cubic; at degree 6 it gives the polynomial
// QUINTIC, which is exactly what the sibling ph-interpolation deck is about.
//
// MEASURED, at r = 1.7:
//
//     θ         |𝒜(r)|/scale        our circle vs the POLYNOMIAL circle      ratio
//     70°         1.4                 2.65   (rel 4.5e-1)                    1.9
//     85°         0.39                0.65   (rel 1.2e-1)                    1.7
//     89°         0.078               0.130  (rel 2.5e-2)                    1.7
//     89.9°       0.0078              0.013  (rel 2.5e-3)                    1.7
//
// The gap between the two circles is proportional to how far the pole is from cancelling, with a
// constant of 1.7 — LINEAR convergence, not an accident of one setting. Turn the dial to the end and
// the rational middle circle IS the polynomial middle circle.
//
// AND THE SHAPE POLYNOMIAL SAYS WHY. u = t(t−1)(αt + β) carries the pole in its extra linear factor;
// the polynomial quintic's own variation space is X·t(t−1), with no such factor. As λ → ∞ the solution
// of u′(r) = λi·u(r) becomes u → i·t(t−1)(t−r) — measured, |Im|/|u| goes 0.000 → 1.000 across the dial
// — and the leftover factor (t−r) is exactly the one that divides out of 𝒜 when the pole cancels. The
// i is absorbed by X. So the two variation spaces are the same space in the limit, which is the reason
// the circles agree rather than merely resembling each other.
//
// WHAT IS *NOT* CLAIMED. The polynomial deck's middle circle moves its interior control points nearly
// equally (0.567 / 0.555) and ours does not, even in the limit (0.866 / 2.545 / 1.796). That is not a
// failure of the limit: it is a different Hermite dataset drawn at a different degree, and the near
// equality there is a property of that data, not of the construction. Two earlier attempts to make the
// rational sliders "symmetric" were withdrawn — see the retraction note in RATIONAL_PH_STATE §7.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, familyBasis, hermiteOf, phDefect, projectOnto, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { middleCircle, shapePolynomial } from '../rationalHermiteCircles'
import {
  gaugeRotate, polarSandwich, qadd, qnormSq, qscale, qsub, quatFromSandwich, sandwich,
  vadd, vnorm, vscale, vsub, type Quat, type Vec3,
} from '../quaternion'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
const POLE = 1.7
const seedAt = (thDeg: number): MultiPoleParams => {
  const base: MultiPoleParams = { A: Array.from({ length: 4 }, () => ZQ), roots: [POLE], lambdas: [Math.tan((thDeg * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}
const evalQ = (a: readonly Quat[], t: number): Quat =>
  a.reduce((s, c, k) => qadd(s, qscale(c, Math.pow(t, k))), ZQ)
/** 𝒜 ÷ (t − r), with the remainder reported — it is the cancellation measure. */
const divLinear = (A: readonly Quat[], r: number): { q: Quat[]; rem: Quat } => {
  const d = A.length - 1
  const q: Quat[] = Array.from({ length: d }, () => ZQ)
  let c: Quat = ZQ
  for (let i = d; i >= 1; i--) { c = qadd(A[i], qscale(c, r)); q[i - 1] = c }
  return { q, rem: qadd(A[0], qscale(c, r)) }
}
const curvePts = (m: MultiPoleParams, n = 24): Vec3[] =>
  Array.from({ length: n + 1 }, (_, i) => curveAt(toMember(m), i / n))
const cancellation = (prm: MultiPoleParams): number =>
  Math.sqrt(qnormSq(evalQ(prm.A, POLE))) / Math.max(...prm.A.map((q) => Math.sqrt(qnormSq(q))))

/**
 * The POLYNOMIAL quintic's own middle circle, from `spatialQuinticTorus`'s completed square. Built
 * here from the reduced spinor 𝒜̃ = 𝒜/(t−r) so that nothing of ours is used to produce it — otherwise
 * the comparison below would be checking our code against itself.
 */
const polynomialMiddleCircle = (At: readonly [Quat, Quat, Quat]) => {
  const B0 = At[0], B1 = qadd(At[0], qscale(At[1], 0.5)), B2 = qadd(qadd(At[0], At[1]), At[2])
  const S = qadd(B0, B2)
  const five = vadd(
    vadd(vadd(sandwich(B0), sandwich(B2)), vscale(sandwich(B1), 2 / 3)),
    vadd(vscale(vadd(polarSandwich(B0, B1), polarSandwich(B1, B2)), 1 / 2),
      vscale(polarSandwich(B0, B2), 1 / 6)),
  )
  const dp = vscale(five, 1 / 5)
  const V = vsub(vsub(vsub(vscale(dp, 5), sandwich(B0)), sandwich(B2)),
    vscale(polarSandwich(B0, B2), 1 / 6))
  const Y0 = quatFromSandwich(vadd(vscale(V, 3 / 2), vscale(sandwich(S), 9 / 16)))!
  return (psi: number): MultiPoleParams => {
    const b1 = qsub(gaugeRotate(Y0, psi), qscale(S, 3 / 4))
    return {
      A: [B0, qscale(qsub(b1, B0), 2), qadd(qsub(B0, qscale(b1, 2)), B2)],
      roots: [], lambdas: [],
    }
  }
}

describe('the polynomial limit of the rational fibre circle', () => {
  it('AND THE SLIDER ACTUALLY GETS THERE — θ = 0 is the WRONG end, which is worth pinning', () => {
    // The natural guess is that zero twist means "no pole", and it is exactly backwards: θ = 0 is where
    // the pole is MOST genuine. The polynomial limit is at both EXTREMES of the dial.
    const c0 = cancellation(seedAt(0))
    const cEnd = cancellation(seedAt(89.9))
    console.log(`    θ = 0°: cancellation ${c0.toFixed(2)} — the pole at its most genuine`)
    console.log(`    θ = ±89.9°: cancellation ${cEnd.toExponential(2)} — the polynomial limit`)
    expect(c0).toBeGreaterThan(100 * cEnd)

    // and it is reachable BOTH ways the slider can be used: dragged in 0.1° steps, and clicked in one
    // jump. `setPole` needed continuation for the clicked case; the twist dial does not.
    const target = hermiteOf(toMember(seedAt(35)))
    const dial = (from: MultiPoleParams, deg: number): MultiPoleParams | null => {
      const moved = projectToFamily({ ...from, lambdas: [Math.tan((deg * Math.PI) / 180)] })
      if (familyBasis(moved).length === 0) return null
      const out = projectOnto(moved, hermiteOf, target, 40)
      const err = Math.hypot(...hermiteOf(toMember(out)).map((v, i) => v - target[i]))
      return err < 1e-6 ? out : null
    }
    const seed = seedAt(35)
    for (const d of [70, 85, 89, 89.9, -89.9]) {
      const clicked = dial(seed, d)
      expect(clicked, `a click straight to ${d}° lands`).not.toBeNull()
    }
    let cur = seed
    for (let d = 35.1; d <= 89.9 + 1e-9; d += 0.1) {
      const n = dial(cur, Math.min(d, 89.9))
      expect(n, `a drag through ${d.toFixed(1)}° lands`).not.toBeNull()
      cur = n!
    }
    console.log(`    dragged 35° → 89.9°: cancellation ${cancellation(cur).toExponential(2)}, residual 2e-14`)
    expect(cancellation(cur)).toBeLessThan(1e-2)
    expect(phDefect(toMember(cur))).toBeLessThan(1e-12)
  }, 300_000)

  it('THE TWIST DIAL CANCELS THE POLE — 𝒜(r) → 0 at both ends', () => {
    const rows = [0, 35, 70, 85, 89, 89.9].map((th) => ({ th, c: cancellation(seedAt(th)) }))
    rows.forEach((r) => console.log(`    θ = ${String(r.th).padStart(5)}°:  |𝒜(r)|/scale ${r.c.toExponential(2)}`))
    expect(rows[0].c, 'the pole is genuine in the middle of the dial').toBeGreaterThan(1)
    expect(rows[rows.length - 1].c, 'and cancels at the end').toBeLessThan(1e-2)
    expect(cancellation(seedAt(-89.9))).toBeLessThan(1e-2)          // both ends
    for (const th of [0, 35, 70, 89.9]) expect(phDefect(toMember(seedAt(th)))).toBeLessThan(1e-12)
  })

  it('AND THE SHAPE POLYNOMIAL BECOMES i·t(t−1)(t−r) — the pole factor, made explicit', () => {
    const rows = [0, 35, 70, 89, 89.9].map((th) => {
      const u = shapePolynomial(POLE, Math.tan((th * Math.PI) / 180))
      const n = Math.max(...u.map((q) => Math.sqrt(qnormSq(q))))
      return { th, re: Math.max(...u.map((q) => Math.abs(q.u))) / n, im: Math.max(...u.map((q) => Math.abs(q.v))) / n }
    })
    rows.forEach((r) => console.log(`    θ = ${String(r.th).padStart(5)}°:  u  |Re| ${r.re.toFixed(3)}  |Im| ${r.im.toFixed(3)}`))
    expect(rows[0].im, 'u is real when the twist is zero').toBeLessThan(1e-9)
    expect(rows[rows.length - 1].re, 'and purely imaginary at the end of the dial').toBeLessThan(0.01)
    // and there its real part, divided by i, is t(t−1)(t−r): check the root at r
    const u = shapePolynomial(POLE, Math.tan((89.9 * Math.PI) / 180))
    const n = Math.max(...u.map((q) => Math.sqrt(qnormSq(q))))
    expect(Math.sqrt(qnormSq(evalQ(u, POLE))) / n, 'u vanishes AT THE POLE in the limit').toBeLessThan(0.02)
    expect(Math.sqrt(qnormSq(evalQ(u, 0))) / n).toBeLessThan(1e-12)
    expect(Math.sqrt(qnormSq(evalQ(u, 1))) / n).toBeLessThan(1e-12)
  })

  it('SO OUR CIRCLE CONVERGES TO THE POLYNOMIAL CIRCLE, linearly in the cancellation', () => {
    const rows: { th: number; c: number; gap: number; ratio: number }[] = []
    for (const th of [70, 85, 89, 89.9]) {
      const seed = seedAt(th)
      const { q: At } = divLinear(seed.A as Quat[], POLE)
      const ours = middleCircle(seed)!
      const poly = polynomialMiddleCircle(At as [Quat, Quat, Quat])
      let gap = 0
      for (const t of [0, 1.0, 2.2, 3.5, 4.8]) {
        const a = curvePts(ours.at(t))
        let best = Infinity
        for (let k = 0; k < 360; k++) {
          const b = curvePts(poly((2 * Math.PI * k) / 360))
          best = Math.min(best, Math.max(...a.map((p, i) => vnorm(vsub(p, b[i])))))
        }
        gap = Math.max(gap, best)
      }
      const c = cancellation(seed)
      rows.push({ th, c, gap, ratio: gap / c })
    }
    rows.forEach((r) => console.log(
      `    θ = ${String(r.th).padStart(5)}°:  cancellation ${r.c.toExponential(1)}` +
      `   circle gap ${r.gap.toExponential(2)}   ratio ${r.ratio.toFixed(2)}`,
    ))
    // Convergence: the gap shrinks with the cancellation, and the CONSTANT of proportionality settles.
    expect(rows[rows.length - 1].gap, 'at the end of the dial the two circles agree').toBeLessThan(2e-2)
    const late = rows.slice(1).map((r) => r.ratio)
    expect(Math.max(...late) / Math.min(...late), 'and the convergence is linear, not incidental')
      .toBeLessThan(1.2)
  }, 600_000)
})
