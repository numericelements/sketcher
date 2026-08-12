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

const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

/** T = N/σ on the unit sphere, and its derivative, both exactly from the polynomials. */
const indicatrix = (m: ReturnType<typeof toMember>, t: number) => {
  const s = evalPoly(m.sigma, t)
  return [0, 1, 2].map((c) => evalPoly(m.N[c], t) / s)
}
const indicatrixSpeed = (m: ReturnType<typeof toMember>, t: number): number => {
  const s = evalPoly(m.sigma, t)
  const ds = evalPoly(dPoly(m.sigma), t)
  const v = [0, 1, 2].map((c) => {
    const n = evalPoly(m.N[c], t)
    const dn = evalPoly(dPoly(m.N[c]), t)
    return (dn * s - n * ds) / (s * s)
  })
  return Math.hypot(...v)
}

const seed = (lambda: number, pole: number): OnePoleParams => ({
  b0: qadd(QUAT_ONE, qscale(QUAT_I, 0.4)),
  b2: { u: 0.3, v: -0.7, p: 1.1, q: 0.2 },
  lambda,
  pole,
})

describe('the tangent indicatrix', () => {
  it('is a rational curve ON the unit sphere — the w² cancels exactly', () => {
    const m = toMember(seed(0.6, 1.7))
    const errs = Array.from({ length: 21 }, (_, i) => {
      const t = -2 + (5 * i) / 20
      return Math.abs(Math.hypot(...indicatrix(m, t)) - 1)
    })
    console.log(`    |T| − 1 over t ∈ [−2, 3]: worst ${Math.max(...errs).toExponential(1)}`)
    expect(Math.max(...errs)).toBeLessThan(1e-13)
  })

  it('has a CUSP at the pole: T′ vanishes there, and nowhere near it', () => {
    for (const [lam, r] of [[0.6, 1.7], [-1.3, -0.9], [0, 2.4]] as const) {
      const m = toMember(seed(lam, r))
      const atPole = indicatrixSpeed(m, r)
      const near = [0.05, 0.1, 0.2].map((d) => Math.min(indicatrixSpeed(m, r - d), indicatrixSpeed(m, r + d)))
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
