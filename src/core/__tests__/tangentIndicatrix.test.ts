// ============================================================================
// THE NO-LOG CONDITION IS A CUSP OF THE TANGENT INDICATRIX.
//
// The tangent indicatrix is the unit tangent traced on the unit sphere: T = c′/‖c′‖. For a PH curve
// c′ = N/w² and ‖c′‖ = σ/w², so the w² cancels and
//
//     T = N/σ            (N = 𝒜i𝒜̄ the Wronskian, σ = |𝒜|²)
//
// — a RATIONAL curve on S², defined at every real t including the pole. That cancellation IS the PH
// property seen on the sphere: PH ⟺ the unit tangent is rational ⟺ the indicatrix is a rational
// spherical curve. The pole r is nowhere special for T even though the curve itself runs to infinity
// there, so T stays finite and drawable across the pole.
//
// AND AT THE POLE T STOPS. From the solved form 𝒜′(r) = 𝒜(r)(Σ + λi), a single pole has Σ = 0, so
//     N′(r) = 𝒜′i𝒜̄ + 𝒜i𝒜̄′ = λ𝒜i𝒜̄·(i-conjugation cancelling) = 0
//     σ′(r) = 𝒜′𝒜̄ + 𝒜𝒜̄′ = λN − λN = 0
// Both numerator and denominator are stationary, so T′(r) = 0: the indicatrix has a CUSP at the pole.
// This is Kalkan–Scharler–Schröcker–Šír's Rem 4.7 read in our chart — the dependence of {N, N′} that
// their Thm 4.6 asks for is exactly T′ = 0.
//
// WHY IT MATTERS BEYOND BEING TRUE: the residue/no-log condition is, on every slide so far, a formula.
// This says it is a VISIBLE feature — a corner on a spherical curve — and the pole dial r moves that
// corner around the sphere. It is the first geometric picture of the condition we have.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { toMember, type OnePoleParams } from '../rationalPHOnePoleSpatial'
import { QUAT_I, QUAT_ONE, qadd, qscale } from '../quaternion'
import {
  indicatrixAt,
  indicatrixAtInfinity,
  indicatrixLoop,
  indicatrixSpeedAt,
  sphereResidual,
} from '../tangentIndicatrix'

const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

// The indicatrix itself lives in core/tangentIndicatrix — imported rather than re-derived here, so the
// figures and this test measure literally the same function.

const seed = (lambda: number, pole: number): OnePoleParams => ({
  b0: qadd(QUAT_ONE, qscale(QUAT_I, 0.4)),
  b2: { u: 0.3, v: -0.7, p: 1.1, q: 0.2 },
  lambda,
  pole,
})

describe('the tangent indicatrix', () => {
  it('is a rational curve ON the unit sphere — the w² cancels exactly', () => {
    const m = toMember(seed(0.6, 1.7))
    const worst = sphereResidual(m)
    console.log(`    |T| − 1 over the whole projective line: worst ${worst.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-13)
  })

  it('has a CUSP at the pole: T′ vanishes there, and nowhere near it', () => {
    for (const [lam, r] of [[0.6, 1.7], [-1.3, -0.9], [0, 2.4]] as const) {
      const m = toMember(seed(lam, r))
      const atPole = indicatrixSpeedAt(m, r)
      const near = [0.05, 0.1, 0.2].map((d) => Math.min(indicatrixSpeedAt(m, r - d), indicatrixSpeedAt(m, r + d)))
      const typical = Math.min(...near)
      console.log(
        `    λ = ${String(lam).padStart(4)}, r = ${String(r).padStart(4)}:` +
          `  |T′(r)| = ${atPole.toExponential(1)}` +
          `   |T′| at r ± 0.05/0.1/0.2 = ${near.map((v) => v.toFixed(3)).join(' / ')}`,
      )
      expect(atPole, 'the indicatrix stops dead at the pole').toBeLessThan(1e-12)
      expect(typical, 'and is moving on either side — a cusp, not a flat stretch').toBeGreaterThan(1e-3)
    }
  })

  it('and the cusp is where the no-log condition lives: N′(r) = 0 and σ′(r) = 0 both', () => {
    const m = toMember(seed(0.6, 1.7))
    const nPrime = Math.hypot(...[0, 1, 2].map((c) => evalPoly(dPoly(m.N[c]), 1.7)))
    const sPrime = Math.abs(evalPoly(dPoly(m.sigma), 1.7))
    const nScale = Math.hypot(...[0, 1, 2].map((c) => evalPoly(m.N[c], 1.7)))
    const sScale = Math.abs(evalPoly(m.sigma, 1.7))
    console.log(
      `    |N′(r)|/|N(r)| = ${(nPrime / nScale).toExponential(1)}` +
        `   |σ′(r)|/|σ(r)| = ${(sPrime / sScale).toExponential(1)}` +
        `\n    both stationary — so the cusp is not a coincidence of this seed, it is Σ = 0.`,
    )
    expect(nPrime / nScale).toBeLessThan(1e-13)
    expect(sPrime / sScale).toBeLessThan(1e-13)
  })
})

// ============================================================================
// AND IT SURVIVES m POLES — but by a DIFFERENT mechanism, which is the part that matters for a figure.
//
// With one pole Σ = 0 and the cusp comes for free: N′(r) and σ′(r) each vanish outright. With two or
// more, Σ_k = Σ_{l≠k} 1/(r_k − r_l) ≠ 0 and NEITHER vanishes. The solved form 𝒜′(r) = 𝒜(r)(Σ + λi)
// instead makes them PROPORTIONAL by the same factor,
//
//     N′(r_k) = 2Σ_k · N(r_k)        σ′(r_k) = 2Σ_k · σ(r_k)
//
// so T′ = (N′σ − Nσ′)/σ² = (2Σ Nσ − N 2Σ σ)/σ² = 0 by CANCELLATION. The cusp is the same geometric
// event, reached two different ways: one pole kills both terms, many poles balance them. That is why the
// one-pole picture generalises — and why m poles give m cusps, one per root, not one distinguished cusp.
// ============================================================================
import { seedQuintic, toMember as multiToMember } from '../rationalPHMultiPoleSpatial'


describe('the tangent indicatrix with several poles', () => {
  const prm = seedQuintic()
  const m = multiToMember(prm)

  it('cusps at EVERY pole, one per root', () => {
    console.log(`    ${prm.roots.length} poles, no-log residual ${m.noLog.toExponential(1)}`)
    for (const r of prm.roots) {
      const atPole = indicatrixSpeedAt(m, r)
      const near = [0.05, 0.2].map((d) => Math.min(indicatrixSpeedAt(m, r - d), indicatrixSpeedAt(m, r + d)))
      console.log(
        `    r = ${r.toFixed(3).padStart(7)}:  |T′(r)| = ${atPole.toExponential(1)}` +
          `   |T′| at r ± 0.05/0.2 = ${near.map((v) => v.toFixed(3)).join(' / ')}`,
      )
      expect(atPole, 'stops at this pole too').toBeLessThan(1e-9)
      expect(Math.min(...near), 'and moves on either side').toBeGreaterThan(1e-3)
    }
  })

  it('but by cancellation, not by vanishing: N′ and σ′ are both 2Σ times themselves', () => {
    for (const r of prm.roots) {
      const Sigma = prm.roots.reduce((a, other) => (other === r ? a : a + 1 / (r - other)), 0)
      const nAt = [0, 1, 2].map((c) => evalPoly(m.N[c], r))
      const nDot = [0, 1, 2].map((c) => evalPoly(dPoly(m.N[c]), r))
      const sAt = evalPoly(m.sigma, r)
      const sDot = evalPoly(dPoly(m.sigma), r)
      const nErr = Math.hypot(...nDot.map((v, c) => v - 2 * Sigma * nAt[c])) / Math.hypot(...nAt)
      const sErr = Math.abs(sDot - 2 * Sigma * sAt) / Math.abs(sAt)
      console.log(
        `    r = ${r.toFixed(3).padStart(7)}:  Σ = ${Sigma.toFixed(4).padStart(8)}` +
          `   |N′ − 2ΣN|/|N| = ${nErr.toExponential(1)}   |σ′ − 2Σσ|/|σ| = ${sErr.toExponential(1)}` +
          `   (neither term is zero: |N′|/|N| = ${(Math.hypot(...nDot) / Math.hypot(...nAt)).toFixed(3)})`,
      )
      expect(nErr, 'N′ is 2Σ N — parallel, not zero').toBeLessThan(1e-7)
      expect(sErr, 'σ′ is 2Σ σ by the same factor, which is why T′ cancels').toBeLessThan(1e-7)
      expect(Math.abs(Sigma), 'and Σ is genuinely nonzero here, unlike the one-pole case').toBeGreaterThan(0.1)
    }
  })
})


describe('the indicatrix closes over the projective line', () => {
  // The figure draws the WHOLE curve, not just the [0,1] arc, so the closure has to be real rather than a
  // drawing convenience: both tails must reach the SAME point, and that point must already be on the
  // sphere without normalising. It is, because leading N = 𝒜_top i 𝒜̄_top has norm |𝒜_top|² = leading σ.
  it('both tails reach the exact point at infinity, and it is already unit', () => {
    const m = toMember(seed(0.6, 1.7))
    const inf = indicatrixAtInfinity(m)
    const unit = Math.abs(Math.hypot(inf.x, inf.y, inf.z) - 1)
    const gap = (t: number) => {
      const T = indicatrixAt(m, t)
      return Math.hypot(T.x - inf.x, T.y - inf.y, T.z - inf.z)
    }
    console.log(
      `    |T(∞)| − 1 = ${unit.toExponential(1)}` +
        `   distance to T(t) at t = ±1e3: ${gap(1e3).toExponential(1)} / ${gap(-1e3).toExponential(1)}` +
        `   at ±1e6: ${gap(1e6).toExponential(1)} / ${gap(-1e6).toExponential(1)}`,
    )
    expect(unit, 'the point at infinity needs no normalising').toBeLessThan(1e-14)
    expect(gap(1e6), 'the forward tail reaches it').toBeLessThan(1e-5)
    expect(gap(-1e6), 'and so does the backward tail — same point, so the curve closes').toBeLessThan(1e-5)
  })

  it('and the drawn polyline is closed and lies on the sphere', () => {
    const loop = indicatrixLoop(toMember(seed(-1.3, -0.9)))
    const first = loop[0]
    const last = loop[loop.length - 1]
    const off = Math.max(...loop.map((p) => Math.abs(Math.hypot(p.x, p.y, p.z) - 1)))
    console.log(
      `    ${loop.length} points, ends coincide to ` +
        `${Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z).toExponential(1)}` +
        `, worst off-sphere ${off.toExponential(1)}`,
    )
    expect(off).toBeLessThan(1e-13)
    expect(Math.hypot(first.x - last.x, first.y - last.y, first.z - last.z)).toBe(0)
  })
})

// ============================================================================
// WHY THE CUSP IS THERE — and it is NOT the PH condition that puts it there.
//
// Two separate demands are in play, and keeping them apart is the whole explanation.
//
//   PH (rational SPEED) is what gives the sphere a rational curve at all: ‖c′‖ = ‖N‖/w² is rational iff
//   ‖N‖ is a polynomial, iff N = 𝒜i𝒜̄ for a quaternion polynomial 𝒜, and then ‖N‖ = |𝒜|² = σ. That
//   fixes NOTHING about poles. Choose 𝒜 freely and the indicatrix N/σ is smooth.
//
//   RATIONALITY OF THE CURVE ITSELF is the extra demand, and it is what cusps the indicatrix. Having
//   chosen a hodograph N/w², we still need a curve whose derivative it IS — we must integrate. Near a
//   simple root r of w the partial fraction has a 1/(t−r)² term AND a 1/(t−r) term, and the second
//   integrates to a LOGARITHM. A curve with a log in it is not rational. So the residue must vanish, and
//   writing w = (t−r)u it is F′(r) = 0 for F = N/u², i.e.
//
//       N′(r) = 2Σ·N(r),        Σ = Σ_{l≠k} 1/(r_k − r_l)
//
//   — the no-log condition. It says N′(r) is PARALLEL to N(r), with ratio exactly 2Σ.
//
// AND THAT IS THE CUSP, because σ obeys the same relation for free. T′ = (N′σ − Nσ′)/σ² vanishes iff
// N′(r) = N(r)·σ′(r)/σ(r), so the two conditions agree iff σ′(r) = 2Σσ(r). From the solved form
// 𝒜′(r) = 𝒜(r)(Σ + λi), both drop out of one line of quaternion algebra, with the twist λ cancelling in
// each: σ′ = 𝒜(Σ+λi)𝒜̄ + 𝒜(Σ−λi)𝒜̄ = 2Σσ, and N′ = 𝒜[(Σ+λi)i + i(Σ−λi)]𝒜̄ = 𝒜(2Σi)𝒜̄ = 2ΣN.
//
// THE GEOMETRIC VERSION, which needs no algebra at all and is the one to say out loud. c = p/w has a
// SIMPLE pole at r, so c′ has a DOUBLE one — and (t−r)² is POSITIVE on both sides. The tangent therefore
// approaches the SAME direction from the left and from the right. The indicatrix does not pass through
// that point and continue; it arrives and comes back. That is what a cusp is. The order of the pole is
// doing the work, and an exact identity names the direction: N = p′w − pw′ with w = t − r kills its first
// term at t = r, leaving N(r) = ±p(r) — the sign being the projective gauge (toMember may flip (p, w) to
// keep the weights positive), measured here as +1. Gauge-free statement: the curve runs out to infinity
// along the LINE spanned by p(r), one way as t → r⁻ and the other as t → r⁺, and the cusp sits at one of
// that line's two antipodes on the sphere. The cusp is the asymptotic direction.
//
// So the count is one cusp PER POLE, not one per curve: w = t − r gives one, the two-pole member gives
// two, and a POLYNOMIAL PH curve has no pole, no residue to kill, and a smooth indicatrix.
// ============================================================================
describe('why the cusp is there', () => {
  const R = 1.7
  const m = toMember(seed(0.6, R))

  it('N(r) = −p(r) exactly: the cusp is the direction the curve escapes to infinity', () => {
    // N = p′w − pw′ and w = t − r, so at t = r the first term dies and N(r) = −p(r) identically.
    const pAt = [0, 1, 2].map((c) => evalPoly(m.p[c], R))
    const nAt = [0, 1, 2].map((c) => evalPoly(m.N[c], R))
    const pLen = Math.hypot(...pAt)
    const cross = [
      pAt[1] * nAt[2] - pAt[2] * nAt[1],
      pAt[2] * nAt[0] - pAt[0] * nAt[2],
      pAt[0] * nAt[1] - pAt[1] * nAt[0],
    ]
    const dot = pAt.reduce((a, v, i) => a + v * nAt[i], 0) / (pLen * Math.hypot(...nAt))
    console.log(
      `    |p(r) × N(r)| / |p||N| = ${(Math.hypot(...cross) / (pLen * Math.hypot(...nAt))).toExponential(1)}` +
        `   cos angle = ${dot.toFixed(6)}  (±1 either way: N(r) = ±p(r), sign set by the projective gauge)` +
        `\n    and |N(r)| = ${Math.hypot(...nAt).toFixed(6)} = σ(r) = ${evalPoly(m.sigma, R).toFixed(6)},` +
        ` so T(r) is that direction as a UNIT vector with no normalising`,
    )
    expect(Math.hypot(...cross) / (pLen * Math.hypot(...nAt)), 'parallel').toBeLessThan(1e-13)
    expect(Math.abs(dot), 'and exactly antiparallel or parallel — a true identity, not a near miss').toBeCloseTo(1, 12)
    expect(Math.abs(Math.hypot(...nAt) - evalPoly(m.sigma, R)), '|N| = σ at the pole').toBeLessThan(1e-13)
  })

  it('the tangent has the SAME limit from both sides — because the pole of c′ is even order', () => {
    const at = indicatrixAt(m, R)
    for (const eps of [1e-2, 1e-4, 1e-6]) {
      const before = indicatrixAt(m, R - eps)
      const after = indicatrixAt(m, R + eps)
      const dBefore = Math.hypot(before.x - at.x, before.y - at.y, before.z - at.z)
      const dAfter = Math.hypot(after.x - at.x, after.y - at.y, after.z - at.z)
      console.log(
        `    ε = ${eps.toExponential(0)}:  |T(r−ε) − T(r)| = ${dBefore.toExponential(2)}` +
          `   |T(r+ε) − T(r)| = ${dAfter.toExponential(2)}   ratio ${(dBefore / dAfter).toFixed(4)}`,
      )
      // Both sides approach the same point, and quadratically — the signature of arriving and returning
      // rather than passing through (a transversal crossing would be linear in ε).
      expect(dBefore).toBeLessThan(20 * eps * eps)
      expect(dAfter).toBeLessThan(20 * eps * eps)
    }
  })

  it('and it REVERSES there: the two branches leave the cusp antiparallel', () => {
    // A cusp, not merely a stationary point: the incoming and outgoing directions of the SPHERICAL curve
    // are opposite, so the track doubles back on itself.
    const dir = (t: number) => {
      const a = indicatrixAt(m, t - 1e-7)
      const b = indicatrixAt(m, t + 1e-7)
      const v = [b.x - a.x, b.y - a.y, b.z - a.z]
      const n = Math.hypot(...v) || 1
      return v.map((x) => x / n)
    }
    for (const eps of [1e-2, 1e-3]) {
      const before = dir(R - eps)
      const after = dir(R + eps)
      const cos = before.reduce((a, v, i) => a + v * after[i], 0)
      console.log(`    ε = ${eps.toExponential(0)}:  cos(incoming, outgoing) = ${cos.toFixed(6)}`)
      expect(cos, 'antiparallel — the indicatrix doubles back').toBeLessThan(-0.999)
    }
  })
})
