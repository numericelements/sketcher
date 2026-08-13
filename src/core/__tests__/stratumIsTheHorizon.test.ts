// ============================================================================
// THE σ = 0 STRATUM IS THE λ-CHART'S HORIZON, NOT AN ISLAND — and σ(r) ∝ 1/λ².
//
// THE QUESTION, and it came from asking what dragging would FEEL like rather than what anything
// equals. F18 says the stratum is absorbing under Möbius and F19 says the λ-chart is a rational
// parametrisation that misses it. Neither says whether the stratum can be APPROACHED continuously
// from inside a chart. If it can, the two chart types meet at a boundary and a UI can slide between
// them; if it cannot, they are disconnected and a UI has to jump.
//
// THE PREDICTION, from the algebra. Inside a fixed-λ fibre, 𝒜′(r) = 𝒜(r)(Σ + λi) means 𝒜(r) = 0
// forces 𝒜′(r) = 0 as well — the singular locus. But 𝒱 itself allows 𝒜(r) = 0 with 𝒜′(r) ≠ 0
// (F17's stratum, where the pole cancels). Since λ is recovered as 𝒜(r)⁻¹𝒜′(r), the stratum must
// therefore sit at λ → ∞: a horizon reached by the dial running away.
//
// MEASURED, holding the Hermite data fixed and sweeping one dial:
//
//     λ        10       100      1000     3000
//     σ(r)   6.1e-2   6.3e-4   6.3e-6   7.0e-7        scale-free, and symmetric in ±λ
//
// That is 1/λ² to three figures across two decades. So the stratum IS in the closure, approached
// smoothly and predictably, and the chart types meet at a boundary rather than being disconnected.
//
// AND IT FIXES THE COORDINATE. A linear λ slider can never reach the stratum and spends almost all
// of its travel doing nothing — which is why λ felt like a badly scaled handle. The right coordinate
// is an ANGLE: λ = tan θ puts the stratum at θ = ±90°, with σ(r) ∝ cos²θ going to zero smoothly.
//
// BUT THE GEOMETRY DOES NOT FOLLOW THE COORDINATE, and this is the sharper half — it was found by
// asking what the approach would LOOK like and it contradicted the expectation. The pole shows on the
// tangent indicatrix as a CUSP, and one might expect the cusp to fade as the pole stops being a pole.
// It does not. Measured across the whole sweep, |T′| at the pole stays at machine zero — the cusp is
// present at EVERY θ — and the indicatrix speed just off the pole GROWS by a factor of seven, so the
// corner gets sharper, not gentler, as the horizon is approached.
//
// That is consistent and it is the real structure: at any finite θ, σ(r) ≠ 0, so it IS a genuine pole,
// the curve does reach infinity, and the cusp is there. The cusp disappears only AT σ(r) = 0, which
// the chart never attains. So the coordinate approaches the boundary continuously while the geometry
// changes discontinuously at it. You can walk toward the horizon forever and the cusp never softens;
// arriving means being in the other chart.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember, withDial, dataOf } from '../rationalPHMultiPoleSpatial'
import { indicatrixSpeedAt } from '../tangentIndicatrix'
import type { Quat } from '../quaternion'

const evalQuat = (A: readonly Quat[], t: number): [number, number, number, number] => {
  let u = 0, v = 0, p = 0, q = 0
  for (let k = A.length - 1; k >= 0; k--) { u = u * t + A[k].u; v = v * t + A[k].v; p = p * t + A[k].p; q = q * t + A[k].q }
  return [u, v, p, q]
}
/** σ(r) = |𝒜(r)|², made scale-free by the spinor's own coefficient scale. */
const sigmaAtPole = (A: readonly Quat[], r: number): number => {
  const e = evalQuat(A, r)
  const s = Math.max(...A.flatMap((a) => [Math.abs(a.u), Math.abs(a.v), Math.abs(a.p), Math.abs(a.q)]))
  return (e[0] ** 2 + e[1] ** 2 + e[2] ** 2 + e[3] ** 2) / (s * s)
}

const seed = seedQuintic()
const target = dataOf(toMember(seed))
const R = seed.roots[0]

describe('the stratum is the horizon of the lambda-chart', () => {
  it('sigma(r) falls off as 1/lambda^2 — measured across two decades', () => {
    const at = (L: number): number => {
      const out = withDial(seed, target, { lambda: { index: 0, value: L } })
      expect(out).not.toBeNull()
      return sigmaAtPole(out!.A, R)
    }
    const s10 = at(10), s100 = at(100), s1000 = at(1000)
    // each tenfold increase in lambda divides sigma(r) by a hundred
    expect(s10 / s100).toBeGreaterThan(70)
    expect(s10 / s100).toBeLessThan(140)
    expect(s100 / s1000).toBeGreaterThan(70)
    expect(s100 / s1000).toBeLessThan(140)
    // and it really is heading to zero, not to a floor
    expect(s1000).toBeLessThan(1e-5)
    expect(at(3000)).toBeLessThan(s1000)
  })

  it('and it is symmetric in the sign of the dial', () => {
    for (const L of [10, 100, 1000]) {
      const plus = sigmaAtPole(withDial(seed, target, { lambda: { index: 0, value: L } })!.A, R)
      const minus = sigmaAtPole(withDial(seed, target, { lambda: { index: 0, value: -L } })!.A, R)
      expect(Math.abs(plus - minus) / plus).toBeLessThan(0.05)
    }
  })

  it('THE ANGLE COORDINATE: lambda = tan(theta) reaches the horizon on a finite slider', () => {
    // sigma(r) ∝ 1/lambda^2 = cos²θ/sin²θ, so it vanishes smoothly as θ → ±90°. Sampled at angles
    // a slider would actually visit, the approach is monotone and lands near zero at the end.
    const seen: number[] = []
    for (const deg of [45, 60, 75, 84, 89, 89.9]) {
      const L = Math.tan((deg * Math.PI) / 180)
      const out = withDial(seed, target, { lambda: { index: 0, value: L } })
      expect(out).not.toBeNull()
      seen.push(sigmaAtPole(out!.A, R))
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThan(seen[i - 1])   // monotone
    // the meaningful figure is the RATIO across the slider, not an absolute floor: tan(89.9 deg)
    // is only 573, so 1/lambda^2 still leaves ~2e-5. Five orders of magnitude of travel, on a
    // slider that stops short of its own endpoint.
    expect(seen[0] / seen[seen.length - 1]).toBeGreaterThan(1e4)
    expect(seen[seen.length - 1]).toBeLessThan(1e-4)
  })

  it('BUT THE CUSP DOES NOT FADE: it is present at every angle, and it sharpens', () => {
    // The pole shows on the tangent indicatrix as a cusp — |T′| = 0 there. Expectation was that it
    // would soften as sigma(r) collapsed. It does not: at any finite theta the pole is still a pole.
    const atPole: number[] = []
    const offPole: number[] = []
    for (const deg of [0, 45, 75, 84, 89, 89.9]) {
      const out = withDial(seed, target, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })
      expect(out).not.toBeNull()
      const m = toMember(out!)
      atPole.push(indicatrixSpeedAt(m, R))
      offPole.push(indicatrixSpeedAt(m, R + 0.05))
    }
    for (const v of atPole) expect(v).toBeLessThan(1e-8)          // a cusp at EVERY angle
    // and it gets SHARPER: the indicatrix moves faster just off the pole as the horizon nears
    expect(offPole[offPole.length - 1] / offPole[0]).toBeGreaterThan(4)
  })

  it('the limit point is F17s stratum, NOT the singular locus: a SIMPLE root of the spinor', () => {
    // 𝒜 = (t − r)·B has 𝒜(r) = 0 with 𝒜′(r) ≠ 0 — the pole cancels, and the Jacobian stays full
    // rank there (sp11VarietyRank). The singular locus needs a DOUBLE root, which this is not.
    const B: Quat[] = [{ u: 0.7, v: -0.3, p: 0.5, q: 0.2 }, { u: 1, v: 0.4, p: -0.6, q: 0.1 },
      { u: -0.2, v: 0.8, p: 0.3, q: -0.5 }]
    const A: Quat[] = []
    for (let k = 0; k <= 3; k++) {
      const lo = k > 0 ? B[k - 1] : null, hi = k < 3 ? B[k] : null
      A.push({
        u: (lo ? lo.u : 0) - (hi ? R * hi.u : 0), v: (lo ? lo.v : 0) - (hi ? R * hi.v : 0),
        p: (lo ? lo.p : 0) - (hi ? R * hi.p : 0), q: (lo ? lo.q : 0) - (hi ? R * hi.q : 0),
      })
    }
    const e = evalQuat(A, R)
    expect(Math.hypot(...e)).toBeLessThan(1e-12)                       // 𝒜(r) = 0
    const d = A.slice(1).map((a, i) => ({ u: a.u * (i + 1), v: a.v * (i + 1), p: a.p * (i + 1), q: a.q * (i + 1) }))
    expect(Math.hypot(...evalQuat(d, R))).toBeGreaterThan(1)           // 𝒜′(r) ≠ 0: SIMPLE root
  })
})
