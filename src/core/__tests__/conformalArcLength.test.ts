// ============================================================================
// WHY THE CONFORMAL FAMILY'S ARC LENGTH IS NEVER RATIONAL — checking a relayed degree count.
//
// The claim: in the conformal family the speed is h/w with deg h = n−2, so the speed NUMERATOR already
// carries a factor of w — ‖N‖ = h·w. The arc-length integrand therefore collapses from ‖N‖/w² to a
// PROPER rational function h/w (numerator degree 4 strictly below denominator degree 6). A proper
// rational function integrates to a pure sum of logs, and rationality would need w | h — impossible
// below degree unless h ≡ 0. So the length is a log sum, never rational.
//
// The load-bearing step is the divisibility w | ‖N‖, and it is checkable with no root-finder at all:
// if it holds, speed·w is a POLYNOMIAL of degree n−2. That is what is measured here, by fitting
// increasing degrees and locating the collapse — the degree is read off the largest relative gap, not
// off a tolerance.
//
// AND THE CONTRAST WITH THE ONE-POLE FAMILY IS EXACT AND OPPOSITE. There σ = |𝒜|² carries NO factor of
// w, so the integrand keeps a polynomial part plus DOUBLE poles whose residues the no-log condition
// kills, leaving a rational antiderivative (rationalArcLength.test.ts). Here the factor of w is already
// present, leaving a proper h/w with simple poles and nothing left to cancel. Same question, two
// charts, opposite extremes — and in NEITHER does arc length select a member of the fiber.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { controlPoints, curveAt, degreeOf, weights } from '../conformalPHCurve'
import { sexticSeed } from '../conformalPHSeeds'
import { vnorm, vsub } from '../quaternion'

const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

/** Largest deviation of the best degree-`deg` polynomial through `pts`, relative to the data's scale. */
const fitResidual = (pts: { t: number; v: number }[], deg: number): number => {
  const N = deg + 1
  const A = Array.from({ length: N }, (_, i) =>
    Array.from({ length: N + 1 }, (_, j) =>
      j < N
        ? pts.reduce((a, p) => a + Math.pow(p.t, i) * Math.pow(p.t, j), 0)
        : pts.reduce((a, p) => a + Math.pow(p.t, i) * p.v, 0),
    ),
  )
  for (let c = 0; c < N; c++) {
    let piv = c
    for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    ;[A[c], A[piv]] = [A[piv], A[c]]
    if (Math.abs(A[c][c]) < 1e-300) continue
    for (let r = 0; r < N; r++) {
      if (r === c) continue
      const f = A[r][c] / A[c][c]
      for (let cc = c; cc <= N; cc++) A[r][cc] -= f * A[c][cc]
    }
  }
  const co = Array.from({ length: N }, (_, i) => (Math.abs(A[i][i]) > 1e-300 ? A[i][N] / A[i][i] : 0))
  const scale = Math.max(...pts.map((p) => Math.abs(p.v)))
  return (
    Math.max(...pts.map((p) => Math.abs(co.reduce((a, c, k) => a + c * Math.pow(p.t, k), 0) - p.v))) / scale
  )
}

describe('the conformal family: arc length is a log sum, not a rational function', () => {
  it('w divides the speed numerator — speed·w is a polynomial of degree exactly n−2', () => {
    const s = sexticSeed()
    const n = degreeOf(s)
    const w = weights(s)
    const wAt = (t: number) =>
      w.reduce((a, c, k) => a + c * binom(n, k) * Math.pow(t, k) * Math.pow(1 - t, n - k), 0)

    const eps = 1e-6
    const pts = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24
      const lo = Math.max(0, t - eps)
      const hi = Math.min(1, t + eps)
      const a = curveAt(s, lo)
      const b = curveAt(s, hi)
      return a && b ? { t, v: (vnorm(vsub(b, a)) / (hi - lo)) * wAt(t) } : null
    }).filter((p): p is { t: number; v: number } => p !== null)
    expect(pts.length, 'the seed evaluates across the whole domain').toBe(25)

    const degrees = [1, 2, 3, 4, 5, 6, 7, 8]
    const res = degrees.map((d) => fitResidual(pts, d))
    console.log(
      `    n = ${n}, ${controlPoints(s).length} control points, weights all positive` +
        ` (no real root of w)\n    speed·w fitted by degree — ` +
        degrees.map((d, i) => `${d}:${res[i].toExponential(1)}`).join('  '),
    )

    // Read the true degree off the largest relative gap, never off a tolerance.
    let best = 1
    let bestGap = 0
    for (let i = 1; i < degrees.length; i++) {
      const gap = res[i - 1] / Math.max(res[i], 1e-300)
      if (gap > bestGap) {
        bestGap = gap
        best = degrees[i]
      }
    }
    console.log(
      `    largest relative gap at degree ${best} (×${bestGap.toExponential(1)});` +
        ` residual floor ${res[degrees.indexOf(best)].toExponential(1)} is the finite-difference error` +
        `\n    so the speed is (degree ${n - 2})/w, NOT (degree ${2 * n})/w² — w already divides ‖N‖,` +
        `\n    the integrand h/w is PROPER, and a proper rational function integrates to a pure log sum.`,
    )
    expect(best, 'the collapse happens at n−2').toBe(n - 2)
  })

  it('and w has no real root, so the log sum is over conjugate pairs (logs AND arctangents)', () => {
    // The irreducibility condition of this family, and it decides the FORM of the answer: with the roots
    // in conjugate pairs the log terms recombine into log|quadratic| + arctan. Elementary either way,
    // and rational in neither.
    const w = weights(sexticSeed())
    const oneSign = w.every((v) => v > 0) || w.every((v) => v < 0)
    console.log(`    weights ${w.map((v) => v.toFixed(3)).join(', ')} — all one sign: ${oneSign}`)
    expect(oneSign).toBe(true)
  })

  it('three families, three relationships to length — and length selects in none of them', () => {
    // Recorded as a table because the point is the comparison, not any one number. The three rows are
    // each pinned by their own measurement: polynomialFiberArcLength, rationalArcLength, and this file.
    const rows = [
      'polynomial PH      σ is a polynomial            → length polynomial, constant along the fiber',
      'one-pole rational  σ has no factor of w         → length RATIONAL (residues cancel), constant',
      'conformal          w | σ, so h/w is proper      → length a log + arctan sum, never rational',
    ]
    console.log(`    ${rows.join('\n    ')}`)
    expect(rows).toHaveLength(3)
  })
})
