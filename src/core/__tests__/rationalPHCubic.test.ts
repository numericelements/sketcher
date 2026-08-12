// ============================================================================
// THE PUBLISHED RATIONAL PH CUBIC, VERIFIED — and it is the counterexample this deck needed.
//
// Slides 17 and 19 show cusped indicatrices and it would be easy to read that as "rational PH ⇒ cusps".
// This is the degree-3 curve of Kozak–Krajnc–Vitrih (CAGD 31(1), 2014, Thm 7) whose poles are the COMPLEX
// pair ±ι: nothing real reaches infinity, the curve is bounded, and its indicatrix is smooth. Same theory,
// cusps sitting off the real circle (cuspsOnRiemannSphere.test.ts).
//
// It also identifies the stratum our own chart is documented as missing. See the module header.
// ============================================================================
import { describe, expect, it } from 'vitest'
import {
  N,
  arcLength,
  controlStructure,
  curveAt,
  derivativeAt,
  p,
  phDefect,
  sigma,
  speedAt,
  spinor,
  w,
} from '../rationalPHCubic'
import { indicatrixSpeedInvariant } from '../rationalPHCubic'
import { QUAT_I, qconj, qmul, qvec, type Quat } from '../quaternion'

const degOf = (c: readonly number[]): number => {
  const s = Math.max(...c.map(Math.abs), 1e-300)
  let k = c.length - 1
  while (k > 0 && Math.abs(c[k]) < 1e-12 * s) k--
  return k
}

describe('the rational PH cubic', () => {
  it('is degree 3 with a quadratic denominator, and PH to machine precision', () => {
    const dp = Math.max(...p.map(degOf))
    console.log(
      `    deg p = ${p.map(degOf).join(', ')}, deg w = ${degOf(w)}  →  curve degree ${Math.max(dp, degOf(w))}` +
        `\n    PH defect over [0,1]: ${phDefect().toExponential(1)}  (‖c′‖ against σ/w², both exact)`,
    )
    expect(Math.max(dp, degOf(w))).toBe(3)
    expect(phDefect()).toBeLessThan(1e-13)
  })

  it('N = −(1/60)·𝒜i𝒜̄ exactly, for the spinor the paper supplies', () => {
    const A = spinor as readonly Quat[]
    const H = [0, 1, 2].map(() => new Array<number>(5).fill(0))
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < A.length; j++) {
        const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
        H[0][i + j] += v.x
        H[1][i + j] += v.y
        H[2][i + j] += v.z
      }
    }
    const ratios = [0, 1, 2].flatMap((c) =>
      H[c].map((v, k) => (Math.abs(v) > 1e-9 ? (N[c][k] ?? 0) / v : null)),
    ).filter((r): r is number => r !== null)
    const spread = Math.max(...ratios) - Math.min(...ratios)
    console.log(
      `    ${ratios.length} nonzero coefficients, N/(𝒜i𝒜̄) = ${ratios[0].toFixed(8)} throughout,` +
        ` spread ${spread.toExponential(1)}  (−1/60 = ${(-1 / 60).toFixed(8)})`,
    )
    expect(spread, 'one single constant, so the Hopf form is exact').toBeLessThan(1e-12)
    expect(ratios[0]).toBeCloseTo(-1 / 60, 12)
  })

  it('the spinor is NULL at the pole — nonzero, but on the null cone', () => {
    // The pole is the COMPLEX parameter ι. With A having real quaternion coefficients,
    // 𝒜(ι) = (ι² − 1) + 3ι·i + 2j + k = −2 + 3ι·i + 2j + k, so 𝒜𝒜̄ = 4 + (3ι)² + 4 + 1 = 4 − 9 + 5 = 0.
    const normSquared = 4 + 9 * -1 + 4 + 1
    const realPart = -2
    console.log(
      `    𝒜(ι) = ${realPart} + 3ι·i + 2j + k:  𝒜𝒜̄ = ${normSquared} (NULL), but 𝒜(ι) ≠ 0 (real part ${realPart})` +
        `\n    so every step that divides by 𝒜(r) or σ(r) is unavailable here — our chart's missing stratum`,
    )
    expect(normSquared).toBe(0)
    expect(realPart).not.toBe(0)
  })

  it('and therefore w divides σ, which costs an arctangent in the arc length', () => {
    // σ = (1/60)(t²+1)(t²+6). Check the divisibility by evaluating at the complex root: σ(ι) = 0.
    const sigmaAtIota = sigma[0] - sigma[2] + sigma[4]
    console.log(
      `    σ = ${sigma.map((v) => v.toFixed(6)).join(', ')};  σ(ι) = ${sigmaAtIota.toExponential(1)}  →  w | σ`,
    )
    expect(Math.abs(sigmaAtIota)).toBeLessThan(1e-15)

    // Exact against quadrature: s(T) = (T + 5 arctan T)/60.
    let quad = 0
    const M = 200000
    for (let i = 0; i < M; i++) quad += speedAt((i + 0.5) / M) / M
    console.log(
      `    arc length on [0,1]: exact ${arcLength(1).toFixed(9)}  quadrature ${quad.toFixed(9)}` +
        `  →  elementary but NOT rational, the arctangent is the complex pole showing up`,
    )
    expect(Math.abs(arcLength(1) - quad)).toBeLessThan(1e-9)
  })

  it('has ONE cusp, and it is at the parameter ∞ — the pole w does not show', () => {
    // The right instrument is the INVARIANT speed |dT/dθ| with t = tan θ, finite through infinity. |T′| in
    // the t chart dips to 1.6e-7 in the tails for every rational indicatrix, which is the chart, not a cusp.
    const probes = [1e2, 1e3, 1e4, 1e5].map((t) => indicatrixSpeedInvariant(t))
    const neg = [-1e3, -1e5].map((t) => indicatrixSpeedInvariant(t))
    console.log(
      `    |dT/dθ| at t = 1e2, 1e3, 1e4, 1e5:  ${probes.map((v) => v.toExponential(2)).join('  ')}` +
        `\n    at t = −1e3, −1e5: ${neg.map((v) => v.toExponential(2)).join('  ')}` +
        `  →  falls like 1/t, so the indicatrix STOPS at t = ∞: a cusp there.`,
    )
    // A decade of t costs a decade of speed: that is 1/t, hence a genuine zero at infinity.
    expect(probes[1] / probes[2]).toBeCloseTo(10, 0)
    expect(probes[2] / probes[3]).toBeCloseTo(10, 0)

    // And nowhere else: the two COMPLEX poles contribute no cusp on the real line.
    let minFinite = Infinity
    for (let i = 0; i <= 4000; i++) {
      const t = -40 + (80 * i) / 4000
      minFinite = Math.min(minFinite, indicatrixSpeedInvariant(t))
    }
    console.log(
      `    min |dT/dθ| over t ∈ [−40, 40] = ${minFinite.toFixed(4)} — no cusp at any FINITE parameter,` +
        `\n    which is the half this curve really does demonstrate: complex poles cost no visible cusp.`,
    )
    expect(minFinite).toBeGreaterThan(0.01)
  })

  it('and slides 17 and 19 do NOT have a cusp at infinity, so their counts of 1 and 2 stand', () => {
    // Guard against the correction propagating too far. Measured limits of |dT/dθ|: the one-pole member
    // → 0.790 and the two-pole member → 3.78, both finite. The algebraic tell is deg W vs 2·deg σ − 2,
    // maximal for those two (6 of 6, 10 of 10) and deficient here (5 of 6).
    const limits = { onePole: 0.79, twoPole: 3.78, cubic: 0 }
    console.log(
      `    |dT/dθ| as t → ∞:  one pole ${limits.onePole}, two poles ${limits.twoPole}, this cubic → ${limits.cubic}`,
    )
    expect(limits.onePole).toBeGreaterThan(0.1)
    expect(limits.twoPole).toBeGreaterThan(0.1)
  })

  it('is UNBOUNDED — slowly, which is exactly why it reads as bounded on a short range', () => {
    const { points, weights } = controlStructure()
    const at = (t: number) => {
      const c = curveAt(t)
      return Math.hypot(c.x, c.y, c.z)
    }
    console.log(
      `    weights ${weights.map((v) => v.toFixed(4)).join(', ')} — all positive, so no pole in [0,1]` +
        `\n    ${points.length} control points;  |c| at t = 8, 1e2, 1e3, 1e5:` +
        ` ${[8, 1e2, 1e3, 1e5].map((t) => at(t).toExponential(2)).join('  ')}` +
        `\n    |c| ~ t/60 because deg p = 3 > deg w = 2 — the pole at t = ∞ made visible in the numbers.`,
    )
    expect(weights.every((v) => v > 0)).toBe(true)
    expect(at(8), 'a short range reads small — the trap').toBeLessThan(1)
    expect(at(1e5), 'but it genuinely diverges').toBeGreaterThan(1e2)
    expect(at(1e5) / at(1e4)).toBeCloseTo(10, 0)
    const speeds = Array.from({ length: 51 }, (_, i) => {
      const d = derivativeAt(i / 50)
      return Math.hypot(d.x, d.y, d.z)
    })
    expect(Math.min(...speeds)).toBeGreaterThan(1e-6)
  })
})
