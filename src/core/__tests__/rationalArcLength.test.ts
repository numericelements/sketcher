// ============================================================================
// CHECKING A CROSS-SESSION CLAIM: is the rational arc length elementary only at ONE pole?
//
// The claim (relayed 2026-08-11): the log coefficient in ∫|𝒜|²/w² is (|𝒜|²)′(r) = 2Σ|𝒜(r)|², so with one
// pole Σ is an empty sum and the arc length is rational — while in general
//
//     arc length = (rational) + Σₖ 2Σₖ|𝒜(rₖ)|² log|t − rₖ|
//
// The conclusion "elementary always, a quadrature never" is right either way. But the log coefficient
// looks incomplete: for f = g/(t−r)² with g = σ/φ² and φ = w/(t−r), the 1/(t−r) coefficient is g′(r), and
// differentiating 1/φ² contributes a second term:
//
//     Bₖ = [σ′(rₖ) − 2σ(rₖ)Σₖ] / φₖ(rₖ)²
//
// And the no-log condition on 𝒜 forces σ′(rₖ) = 2Σₖσ(rₖ): with 𝒜′(r) = 𝒜(r)(Σ + λi),
// σ′ = 2Re(𝒜′𝒜̄) = 2Σ Re(𝒜𝒜̄) + 2λ Re(𝒜i𝒜̄) = 2Σ|𝒜|² + 0. So Bₖ = 0 at EVERY root, and the arc length
// should be rational at any m — a stronger statement than the claim, and one that matters: exact
// arc-length parametrisation would then be available on the two-pole figure too, not only the one-pole one.
//
// Measured here rather than argued, since the two derivations disagree only for m ≥ 2.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams, fiberLoop, seedQuintic, speedAt as mSpeed, toMember as mMember,
} from '../rationalPHMultiPoleSpatial'

const dEval = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dDeriv = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))
const sigmaSum = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

/** ∫₀¹ σ/w² by fine midpoint — the integrand is smooth because the roots are outside [0,1]. */
const arcLength = (prm: MultiPoleParams, n = 20000): number => {
  const m = mMember(prm)
  let acc = 0
  for (let i = 0; i < n; i++) acc += mSpeed(m, (i + 0.5) / n) / n
  return acc
}

describe('is the rational arc length elementary only at one pole?', () => {
  const seed = seedQuintic()          // n = 3, m = 2

  it('the log coefficient vanishes at EVERY root, not only when Sigma is empty', () => {
    const m = mMember(seed)
    const sigma = m.sigma
    const sigmaD = dDeriv(sigma)
    const roots = seed.roots
    for (let k = 0; k < roots.length; k++) {
      const r = roots[k]
      const S = sigmaSum(roots, k)
      const theirs = dEval(sigmaD, r)                        // claimed coefficient: sigma'(r) = 2*S*sigma(r)
      const mine = dEval(sigmaD, r) - 2 * dEval(sigma, r) * S  // with the 1/phi^2 term included
      const scale = Math.max(Math.abs(dEval(sigma, r)), 1e-300)
      console.log(
        `    root ${r}:  Sigma = ${S.toFixed(4)}   sigma(r) = ${dEval(sigma, r).toFixed(4)}` +
          `   sigma'(r) = ${theirs.toFixed(4)}  (2*Sigma*sigma = ${(2 * S * dEval(sigma, r)).toFixed(4)})` +
          `   FULL coefficient = ${(mine / scale).toExponential(1)}`,
      )
      // their identity sigma'(r) = 2*Sigma*sigma(r) holds -- that part is right
      expect(Math.abs(theirs - 2 * S * dEval(sigma, r)) / scale, "sigma'(r) = 2*Sigma*sigma(r)")
        .toBeLessThan(1e-9)
      // ...and it is exactly why the FULL coefficient cancels
      expect(Math.abs(mine) / scale, 'so the log coefficient is zero at this root too').toBeLessThan(1e-9)
      // at m = 2 the claimed coefficient is NOT zero, so the two predictions genuinely differ
      if (Math.abs(S) > 1e-6) {
        expect(Math.abs(theirs) / scale, 'and the claimed coefficient is nonzero here').toBeGreaterThan(1e-3)
      }
    }
  })

  it('so the two-pole arc length is rational too: a rational antiderivative fits it', () => {
    // If there is no log, sigma/w^2 has a rational antiderivative R with R' = sigma/w^2. Fit R as
    // (numerator)/w over [0,1] by least squares on many samples and see whether the fit is exact.
    // R = u/w + v: deg sigma = 2n = 6 exceeds deg w^2 = 2m = 4, so the integrand has a POLYNOMIAL part
    // and u/w alone cannot fit it. Requiring R' = sigma/w^2 gives u'w - u w' + v'w^2 = sigma.
    const m = mMember(seed)
    const w = m.w
    const wD = dDeriv(w)
    const w2: number[] = []
    for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) w2[i + j] = (w2[i + j] ?? 0) + w[i] * w[j]
    const degU = 4, degV = 4
    const nU = degU + 1, nV = degV + 1, n = nU + nV
    const maxE = Math.max(m.sigma.length - 1, degU + w.length - 1, degV - 1 + w2.length - 1)
    const rows: number[][] = []
    const rhs: number[] = []
    for (let e = 0; e <= maxE; e++) {
      const row = new Array(n).fill(0)
      for (let k = 0; k <= degU; k++) {
        let acc = 0
        for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
        for (let a = 0; a < wD.length; a++) if (k + a === e) acc -= wD[a]
        row[k] = acc
      }
      for (let k = 0; k <= degV; k++) {
        let acc = 0
        for (let a = 0; a < w2.length; a++) if (k - 1 + a === e) acc += k * w2[a]
        row[nU + k] = acc
      }
      rows.push(row)
      rhs.push(m.sigma[e] ?? 0)
    }
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) =>
      j < n ? rows.reduce((s2, r2) => s2 + r2[i] * r2[j], 0) : rows.reduce((s2, r2, e) => s2 + r2[i] * rhs[e], 0)))
    for (let c = 0; c < n; c++) {
      let piv = c
      for (let r2 = c + 1; r2 < n; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2
      ;[A[c], A[piv]] = [A[piv], A[c]]
      if (Math.abs(A[c][c]) < 1e-12) continue
      for (let r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue
        const f = A[r2][c] / A[c][c]
        for (let cc = c; cc <= n; cc++) A[r2][cc] -= f * A[c][cc]
      }
    }
    const sol = Array.from({ length: n }, (_, i) => (Math.abs(A[i][i]) > 1e-12 ? A[i][n] / A[i][i] : 0))
    const u = sol.slice(0, nU), v = sol.slice(nU)
    let worst = 0
    for (let i = 0; i <= 400; i++) {
      const t = i / 400
      const lhs = dEval(dDeriv(u), t) * dEval(w, t) - dEval(u, t) * dEval(wD, t)
        + dEval(dDeriv(v), t) * dEval(w2, t)
      worst = Math.max(worst, Math.abs(lhs - dEval(m.sigma, t)) / Math.max(Math.abs(dEval(m.sigma, t)), 1e-12))
    }
    const R = (t: number): number => dEval(u, t) / dEval(w, t) + dEval(v, t)
    const exact = R(1) - R(0)
    const quad = arcLength(seed)
    console.log(
      `    rational antiderivative u/w + v fits sigma/w^2 to ${worst.toExponential(1)};` +
        `  exact ${exact.toFixed(6)} vs quadrature ${quad.toFixed(6)}`,
    )
    expect(worst, 'a rational antiderivative exists at TWO poles').toBeLessThan(1e-9)
    expect(Math.abs(exact - quad) / quad, 'and it gives the arc length').toBeLessThan(1e-6)
  })

  it('and the relayed question: is arc length CONSTANT along the closed loop?', () => {
    const loop = fiberLoop(seed, { stride: 0.09, maxSteps: 400 })
    const lengths = loop.filter((_, i) => i % Math.max(1, Math.floor(loop.length / 12)) === 0).map((q) => arcLength(q, 4000))
    const spread = (Math.max(...lengths) - Math.min(...lengths)) / Math.max(...lengths)
    console.log(
      `    ${lengths.length} samples of the loop: arc length ${Math.min(...lengths).toFixed(4)} … ` +
        `${Math.max(...lengths).toFixed(4)}   relative spread ${spread.toExponential(1)}`,
    )
    // Reported either way -- this is the question, not a claim.
    if (spread < 1e-6) console.log('    -> CONSTANT: the rational fiber has the polynomial fiber punchline')
    else console.log('    -> it VARIES, so arc length does select along the rational loop')
    expect(lengths.length).toBeGreaterThan(4)
  }, 300_000)
})
