// ============================================================================
// METAMORPHIC TESTS — checking a construction that has no oracle, by how it must respond to its input.
//
// WHY THIS FILE EXISTS, and it is a gap in how this project was being tested. Nobody can say what curve
// the fibre slider "should" produce at θ = 2.2, so there is nothing to compare against. Every test here
// until now has therefore been a PINNING test: today's numbers match today's numbers. That catches
// regressions and cannot catch a formulation that was always wrong.
//
// What CAN be checked without an oracle is how the answer must change when the INPUT changes in a known
// way. Mirror the data and the family must mirror; rotate it and the family must rotate; apply the Hopf
// gauge and NOTHING must move. These are metamorphic relations, and they fail in ways pinning tests
// structurally cannot.
//
// EQUIVARIANCE, NOT INVARIANCE — the distinction that made this hard for four exchanges. Hunting for a
// configuration that is its own mirror is difficult and here impossible: reversal sends r to 1−r, so a
// one-pole rational curve is never its own mirror (that needs r = 1/2, inside the drawn piece). But
// "mirroring the input mirrors the output" needs no special configuration, applies to every seed, and
// is far more sensitive because it can fail everywhere rather than at one contrived point.
//
// AND CHECK IT ALGEBRAICALLY, NOT BY SEARCHING. Comparing two circles by sampling curves and hunting
// for the nearest angle floored at 2.2e-4 and stayed there under refinement, which read as a real
// disagreement and was not — it was the search. The circle is the Hopf fibre over T, so the exact
// question is whether the mirrored member's Y satisfies Y i Ȳ = T. That is 1.7e-13, and it needed no
// grid at all. A sharper criterion beat a finer grid, which is the general lesson.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, derivativeAt, familyBasis, phDefect, spinorEndsAndSpan, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { affineReparam, gauge, reverseParam, rotate, scaleBy } from '../rationalSymmetries'
import { middleCircle, shapePolynomial } from '../rationalHermiteCircles'
import {
  QUAT_I, qadd, qconj, qmul, qnormSq, qscale, vnorm, vsub, type Quat, type Vec3,
} from '../quaternion'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
const seedAt = (r: number, thDeg: number, ph = 0.6): MultiPoleParams => {
  const base: MultiPoleParams = {
    A: Array.from({ length: 4 }, () => ZQ), roots: [r], lambdas: [Math.tan((thDeg * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + ph); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}
const SEEDS: [number, number][] = [[1.7, 35], [1.7, 89.9], [1.2, 5], [4, -35], [2.6, 0]]
const samp = (q: MultiPoleParams, n = 33): Vec3[] =>
  Array.from({ length: n }, (_, i) => curveAt(toMember(q), i / (n - 1)))
const sandwich = (q: Quat): Quat => qmul(qmul(q, QUAT_I), qconj(q))

describe('the group actions are exact rewrites', () => {
  it('REVERSAL: c̃(t) = c(1−t) − c(1), the pole reflects, λ is unchanged, PH survives', () => {
    for (const [r, th] of SEEDS) {
      const m = seedAt(r, th)
      const rv = reverseParam(m)!
      const a = samp(m), b = samp(rv)
      const end = curveAt(toMember(m), 1)
      let worst = 0
      for (let i = 0; i < a.length; i++) {
        const src = a[a.length - 1 - i]
        worst = Math.max(worst, vnorm(vsub(b[i], { x: src.x - end.x, y: src.y - end.y, z: src.z - end.z })))
      }
      expect(worst / Math.max(...a.map(vnorm)), `r=${r} θ=${th}: the curve identity`).toBeLessThan(1e-12)
      expect(rv.roots[0]).toBeCloseTo(1 - r, 12)
      expect(rv.lambdas[0]).toBeCloseTo(m.lambdas[0], 12)
      expect(phDefect(toMember(rv)), 'still exactly PH').toBeLessThan(1e-12)
      expect(toMember(rv).noLog, 'and still in the family — the residue condition survives').toBeLessThan(1e-12)

      // the C¹ Hermite data goes (d₀, d₁, Δc) ↦ (−d₁, −d₀, −Δc)
      const d0 = derivativeAt(toMember(m), 0), d1 = derivativeAt(toMember(m), 1)
      const e0 = derivativeAt(toMember(rv), 0), e1 = derivativeAt(toMember(rv), 1)
      expect(vnorm(vsub(e0, { x: -d1.x, y: -d1.y, z: -d1.z })) / vnorm(d1)).toBeLessThan(1e-12)
      expect(vnorm(vsub(e1, { x: -d0.x, y: -d0.y, z: -d0.z })) / vnorm(d0)).toBeLessThan(1e-12)

      // and it is an involution
      const back = samp(reverseParam(rv)!)
      expect(Math.max(...back.map((p, i) => vnorm(vsub(p, a[i])))) / Math.max(...a.map(vnorm)))
        .toBeLessThan(1e-12)
    }
  })

  it('ROTATION, SCALE, GAUGE — and the gauge is the null test everything else is read against', () => {
    const m = seedAt(1.7, 35)
    const s = Math.sin(0.6)
    const q: Quat = { u: Math.cos(0.6), v: s * 0.4, p: s * 0.8, q: s * Math.sqrt(1 - 0.16 - 0.64) }
    for (const out of [rotate(m, q), scaleBy(m, 2.5), gauge(m, 1.1), affineReparam(m, 1.4, -0.2)!]) {
      expect(phDefect(toMember(out))).toBeLessThan(1e-12)
      expect(toMember(out).noLog, 'every action lands back in the family').toBeLessThan(1e-11)
    }
    // the gauge moves NO curve — if this ever fails, something has leaked the gauge into the answer
    const g = samp(gauge(m, 1.1)), base = samp(m)
    expect(Math.max(...g.map((p, i) => vnorm(vsub(p, base[i])))) / Math.max(...base.map(vnorm)))
      .toBeLessThan(1e-13)
    // scale really scales
    expect(Math.max(...samp(scaleBy(m, 2.5)).map(vnorm)) / Math.max(...base.map(vnorm)))
      .toBeCloseTo(2.5, 10)
    // affine reparametrisation: λ ↦ aλ and r ↦ (r−b)/a
    const ar = affineReparam(m, 1.4, -0.2)!
    expect(ar.lambdas[0]).toBeCloseTo(1.4 * m.lambdas[0], 10)
    expect(ar.roots[0]).toBeCloseTo((m.roots[0] + 0.2) / 1.4, 10)
  })
})

describe('THE EQUIVARIANCE TEST: mirror the circle == circle of the mirror', () => {
  it('every mirrored member lands on the mirrored circle, exactly', () => {
    for (const [r, th] of SEEDS) {
      const m = seedAt(r, th)
      const cm = middleCircle(m)!
      const rm = reverseParam(m)!
      const cr = middleCircle(rm)!
      expect(cr.radius / cm.radius, `r=${r} θ=${th}: the two circles have the same radius`)
        .toBeCloseTo(1, 10)

      // The circle IS the Hopf fibre over T, so the exact question is whether the mirrored member's
      // Y = X + X₀ satisfies Y i Ȳ = T. Recover X from 𝒜 − 𝒜(mirror base) = X·u, and X₀ from the
      // half-turn: cr.at(π) has X = X₀(e^{iπ} − 1) = −2X₀.
      const u = shapePolynomial(rm.roots[0], rm.lambdas[0])
      let bi = 0, best = 0
      u.forEach((c, k) => { const n = qnormSq(c); if (n > best) { best = n; bi = k } })
      const Xof = (q: MultiPoleParams): Quat => {
        const d = qadd((q.A as Quat[])[bi], qscale((rm.A as Quat[])[bi], -1))
        return qscale(qmul(d, qconj(u[bi])), 1 / qnormSq(u[bi]))
      }
      const X0 = qscale(Xof(cr.at(Math.PI)), -0.5)
      const T = sandwich(X0)
      const nT = Math.hypot(T.v, T.p, T.q)

      let worstShape = 0, worstFibre = 0, worstRadius = 0
      for (const t of [0, 1.2, 2.4, 3.6, 5.0]) {
        const rv = reverseParam(cm.at(t))!
        const X = Xof(rv)
        // it lies in the {X·u} space of the mirrored circle
        let scale = 0
        for (let k = 0; k < u.length; k++) {
          const d = qadd((rv.A as Quat[])[k], qscale((rm.A as Quat[])[k], -1))
          scale = Math.max(scale, Math.sqrt(qnormSq(d)))
          worstShape = Math.max(worstShape, Math.sqrt(qnormSq(qadd(d, qscale(qmul(X, u[k]), -1)))))
        }
        worstShape /= Math.max(scale, 1e-300)
        // and on the Hopf fibre over the SAME T
        const Y = qadd(X, X0)
        const S = sandwich(Y)
        worstFibre = Math.max(worstFibre, Math.hypot(S.v - T.v, S.p - T.p, S.q - T.q) / nT)
        worstRadius = Math.max(worstRadius,
          Math.abs(Math.sqrt(qnormSq(Y)) - Math.sqrt(qnormSq(X0))) / Math.sqrt(qnormSq(X0)))
      }
      console.log(
        `    r=${String(r).padStart(4)} θ=${String(th).padStart(5)}:  in {X·u} to ${worstShape.toExponential(1)},` +
          `  Y i Ȳ = T to ${worstFibre.toExponential(1)},  |Y| = |X₀| to ${worstRadius.toExponential(1)}`,
      )
      // Measured 2e-16 … 6e-16 for the shape and 2e-14 … 7e-12 for the fibre. The spread is
      // conditioning in the exact integrals, not looseness in the claim: the mirrored pole is 1 − r, so
      // the two sides integrate over differently-conditioned denominators and cannot agree to the last
      // bit. The tolerance is set above the worst measured value and well below anything the figure
      // could show.
      expect(worstShape, 'the mirrored member is in the mirrored circle s own affine space').toBeLessThan(1e-12)
      expect(worstFibre, 'and on its Hopf fibre — so it IS the same circle').toBeLessThan(1e-10)
      expect(worstRadius).toBeLessThan(1e-10)
    }
  })

  it('and the mirrored circle holds the mirrored data — the conditions transform as derived', () => {
    const m = seedAt(1.7, 35)
    const cm = middleCircle(m)!
    const rm = reverseParam(m)!
    const want = spinorEndsAndSpan(toMember(rm), rm)
    let worst = 0
    for (const t of [0, 1.2, 2.4, 3.6, 5.0]) {
      const rv = reverseParam(cm.at(t))!
      const got = spinorEndsAndSpan(toMember(rv), rv)
      worst = Math.max(worst, Math.hypot(...got.map((v, i) => v - want[i])))
    }
    console.log(`    mirrored members hold the mirrored 𝒜(0), 𝒜(1), Δc to ${worst.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-10)
  })
})
