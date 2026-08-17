// ============================================================================
// 2^{k−1} PLANAR PH INTERPOLANTS — and it is a derivation, not a pattern.
//
// THE CLAIM. A planar PH curve of degree 2k−1 has a generator w with k coefficients. Prescribe k
// conditions, each a quadratic form in w (points on the curve, end tangents, whatever), so the system
// is square. Then the number of DISTINCT CURVES is
//
//     2^{k−1}
//
// THE DERIVATION, which is the deck's own cubic argument run at general k. Substitute wⱼ = w₀·rⱼ with
// r₀ = 1. Every condition is quadratic in w, so it becomes w₀²·Qⱼ(r) = bⱼ. Divide each condition by
// the first and w₀² cancels:
//
//     b₀·Qⱼ(r) − bⱼ·Q₀(r) = 0 ,    j = 1 … k−1
//
// which is k−1 quadratics in the k−1 unknowns r₁ … r_{k−1}. Bézout: 2^{k−1}. Then w₀² is recovered
// from any single condition, giving w₀ up to SIGN — and that sign is exactly the gauge w ~ −w, since
// r′ = w². So the ± does not double anything; it is already quotiented. That is where the −1 lives.
//
// WHY THIS FILE EXISTS RATHER THAN A CITATION. The formula went onto the section I divider after
// being seen at k = 2 and k = 3 only, which is a pattern with two points. Bézout is an UPPER bound,
// so finding 2^{k−1} distinct roots PROVES the count for that instance. Measured below at k = 2, 3
// and 4 — the last being the septic, where nothing in this repo had been before.
//
// THE SCOPE, and it matters: this is the count for a SQUARE system — k quadratic conditions on a
// k-coefficient generator — so the PROBLEM SCALES WITH k (three points for the cubic, four for the
// quintic, five for the septic). For FIXED data the system stops being square: planar C¹ Hermite has
// 8 real conditions whatever k is, so at k = 4 it is already underdetermined and there is no count at
// all.
//
// AND THE SPATIAL ANALOGUE IS NOT k−1. An earlier version of this header claimed 4k − 1 − 3k = k−1
// dimensions in space, which silently assumed the conditions grow as 3k. They only do for the
// point-interpolation family (k+1 points): there the surplus really is k−1. For C¹ Hermite the nine
// conditions do NOT grow with k, so the surplus is 4k − 10. The two agree at k = 3 and nowhere else —
// and `RATIONAL_PH_STATE` §5 already measured the disagreement: the degree-8 row gives 16 free,
// rank 9, hence SIX, where k−1 predicts three. The topology is weaker still: §8 records that at
// degree 6 the family is "a torus OR A KLEIN BOTTLE — orientability was not measured", so the docs
// say "fibred in circles over a circle" and stop.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { leastSquares } from '../linalg'

type C = [number, number]
const cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]]
const csub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]]
const binom = (n: number, k: number): number => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c }

/** Bernstein → power basis, complex coefficients. */
const toPower = (b: readonly C[]): C[] => {
  const n = b.length - 1
  return Array.from({ length: n + 1 }, (_, k) => {
    let re = 0, im = 0
    for (let i = 0; i <= k; i++) { const s = (-1) ** (k - i) * binom(k, i); re += s * b[i][0]; im += s * b[i][1] }
    return [binom(n, k) * re, binom(n, k) * im] as C
  })
}
/** ∫₀^T (Σ aₖtᵏ)² dt. */
const integralOfSquare = (a: readonly C[], T: number): C => {
  const n = a.length - 1
  const sq: C[] = Array.from({ length: 2 * n + 1 }, () => [0, 0] as C)
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) sq[i + j] = cadd(sq[i + j], cmul(a[i], a[j]))
  let out: C = [0, 0]
  for (let m = 0; m < sq.length; m++) { const f = T ** (m + 1) / (m + 1); out = cadd(out, [sq[m][0] * f, sq[m][1] * f]) }
  return out
}

/** Solve the reduced system for a k-coefficient generator and count DISTINCT roots. */
function countInterpolants(k: number, ts: number[], wTrue: C[], trials = 6000): number[][] {
  const D = ts.map((T) => integralOfSquare(toPower(wTrue), T))
  const Q = (r: C[], i: number): C => integralOfSquare(toPower([[1, 0], ...r]), ts[i])
  const N = 2 * (k - 1)
  const F = (x: number[]): number[] => {
    const r: C[] = Array.from({ length: k - 1 }, (_, m) => [x[2 * m], x[2 * m + 1]] as C)
    const q0 = Q(r, 0)
    const out: number[] = []
    for (let i = 1; i < k; i++) { const v = csub(cmul(D[0], Q(r, i)), cmul(D[i], q0)); out.push(v[0], v[1]) }
    return out
  }
  const newton = (start: number[]): number[] | null => {
    let x = start.slice()
    for (let it = 0; it < 200; it++) {
      const f = F(x)
      if (Math.max(...f.map(Math.abs)) < 1e-13) return x
      const J = f.map(() => new Array(N).fill(0))
      for (let j = 0; j < N; j++) {
        const h = 1e-7 * Math.max(1, Math.abs(x[j]))
        const up = x.slice(); up[j] += h
        const dn = x.slice(); dn[j] -= h
        const fu = F(up), fd = F(dn)
        for (let i = 0; i < f.length; i++) J[i][j] = (fu[i] - fd[i]) / (2 * h)
      }
      let dx: number[]
      try { dx = leastSquares(J, f.map((v) => -v), 1e-12) } catch { return null }
      const step = Math.hypot(...dx)
      x = x.map((v, i) => v + (step > 3 ? 3 / step : 1) * dx[i])
      if (!x.every(Number.isFinite) || Math.hypot(...x) > 1e7) return null
    }
    return Math.max(...F(x).map(Math.abs)) < 1e-10 ? x : null
  }
  const roots: number[][] = []
  let seed = 1
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed / 2147483648) * 6 - 3 }
  for (let t = 0; t < trials && roots.length < 4 * 2 ** (k - 1); t++) {
    const r = newton(Array.from({ length: N }, rnd))
    if (!r || Math.hypot(...r) > 1e4) continue
    const rr: C[] = Array.from({ length: k - 1 }, (_, m) => [r[2 * m], r[2 * m + 1]] as C)
    if (Math.hypot(...Q(rr, 0)) < 1e-8) continue        // Q₀ = 0 gives no w₀
    if (!roots.some((s) => Math.max(...s.map((v, i) => Math.abs(v - r[i]))) < 1e-6)) roots.push(r)
  }
  return roots
}

describe('the number of planar PH interpolants is 2^(k−1)', () => {
  const cases: { k: number; degree: number; ts: number[]; w: C[] }[] = [
    { k: 2, degree: 3, ts: [0.45, 1.0], w: [[0.9, 0.3], [0.4, -0.7]] },
    { k: 3, degree: 5, ts: [0.3, 0.65, 1.0], w: [[0.9, 0.3], [0.4, -0.7], [-0.6, 0.5]] },
    { k: 4, degree: 7, ts: [0.27, 0.53, 0.78, 1.0], w: [[0.9, 0.3], [0.4, -0.7], [-0.6, 0.5], [1.1, 0.2]] },
  ]
  for (const { k, degree, ts, w } of cases) {
    it(`k = ${k} (degree ${degree}): ${2 ** (k - 1)} distinct curves`, () => {
      const roots = countInterpolants(k, ts, w)
      console.log(`k=${k}  degree ${degree}  →  ${roots.length} distinct, predicted ${2 ** (k - 1)}`)
      // Bézout caps k−1 quadratics in k−1 unknowns at 2^{k−1}, so finding that many PROVES the count
      expect(roots.length).toBe(2 ** (k - 1))
      // and the member the data came from is among them
      const w0 = w[0]
      const truth = w.slice(1).flatMap((wj) => {
        const d = w0[0] * w0[0] + w0[1] * w0[1]
        return [(wj[0] * w0[0] + wj[1] * w0[1]) / d, (wj[1] * w0[0] - wj[0] * w0[1]) / d]
      })
      expect(roots.some((r) => Math.max(...r.map((v, i) => Math.abs(v - truth[i]))) < 1e-6)).toBe(true)
    })
  }
})
