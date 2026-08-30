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
    // Generous timeout: this is 6000 random Newton starts by design — a deliberately
    // INDEPENDENT method from core/phPlanarSepticInterp's homotopy, which finds the same
    // eight in ~12ms. Two algorithms agreeing is the point, so the slow one stays; it
    // just must not flake under full-suite parallel load, where it timed out at 5s.
    it(`k = ${k} (degree ${degree}): ${2 ** (k - 1)} distinct curves`, { timeout: 120000 }, () => {
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

// ============================================================================
// k = 5 BY HOMOTOPY — because the random-Newton sweep above cannot reach it.
//
// WHY A SECOND METHOD. The sweep draws starts from a box and follows them downhill, so a
// solution whose basin the box misses is simply never seen. At k = 5 that is not
// hypothetical: one of the sixteen sits at |r| ≈ 34 while the starts are drawn from
// [−3,3], and the sweep returns 13. That is a LOWER bound and no evidence about the count.
//
// A total-degree homotopy has no basins. Deform the start system gⱼ(r) = rⱼ² − 1, whose
// 2^{k−1} roots are the sign patterns and are known in closed form, into the real system
// through H(r,τ) = (1−τ)·γ·g(r) + τ·f(r), and track every start. Each root of f is the
// endpoint of some path, so nothing can hide.
//
// WHAT THE ASSERTION IS ALLOWED TO BE. Bézout caps the reduced system at 2^{k−1}, so
// finding that many distinct roots PROVES the count; finding fewer proves nothing either
// way. Tracking is the fragile part — paths can cross and two starts then land on the same
// endpoint, which shows up as a deficit with every path still "tracked". Measured on this
// data, the distinct count runs 13, 14, 15 or 16 depending on γ alone. So the test sweeps γ
// and asserts that some γ ATTAINS the bound, which is the honest form of the claim. Pinning
// one γ would be pinning a coin flip: the first one tried here returned 14.
// ============================================================================

/** Eⱼ[a][b] = ∫₀^{tⱼ} Bₐ B_b dt over the degree-n Bernstein basis. */
function gram(n: number, T: number): number[][] {
  const bern = (a: number): number[] => {
    const out = new Array(n + 1).fill(0)
    for (let i = 0; i <= n - a; i++) out[a + i] = binom(n, a) * binom(n - a, i) * (-1) ** i
    return out
  }
  return Array.from({ length: n + 1 }, (_, a) => Array.from({ length: n + 1 }, (_, b) => {
    const pa = bern(a), pb = bern(b)
    let s = 0
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) s += (pa[i] * pb[j] * T ** (i + j + 1)) / (i + j + 1)
    return s
  }))
}

const cscale = (a: C, s: number): C => [a[0] * s, a[1] * s]
const cabs = (a: C): number => Math.hypot(a[0], a[1])
const cdiv = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1]
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]
}
/** Complex Gauss–Jordan with partial pivoting; null when the matrix is singular. */
function csolve(A: C[][], b: C[]): C[] | null {
  const N = b.length
  const M = A.map((row, i) => [...row.map((z) => z.slice() as C), b[i].slice() as C])
  for (let c = 0; c < N; c++) {
    let p = c
    for (let r = c + 1; r < N; r++) if (cabs(M[r][c]) > cabs(M[p][c])) p = r
    if (cabs(M[p][c]) < 1e-30) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < N; r++) {
      if (r === c) continue
      const f = cdiv(M[r][c], M[c][c])
      for (let j = c; j <= N; j++) M[r][j] = csub(M[r][j], cmul(f, M[c][j]))
    }
  }
  return M.map((row, i) => cdiv(row[N], row[i]))
}

/** Distinct roots found by tracking all 2^{k−1} paths at one γ. */
function homotopyRoots(k: number, ts: number[], wTrue: C[], gammaAngle: number): C[][] {
  const n = k - 1
  const E = ts.map((T) => gram(n, T))
  const Q = (Ej: number[][], w: C[]): C => {
    let s: C = [0, 0]
    for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) s = cadd(s, cscale(cmul(w[a], w[b]), Ej[a][b]))
    return s
  }
  const gradQ = (Ej: number[][], w: C[]): C[] => Array.from({ length: n + 1 }, (_, m) => {
    let s: C = [0, 0]
    for (let b = 0; b <= n; b++) s = cadd(s, cscale(w[b], 2 * Ej[m][b]))
    return s
  })
  const D = E.map((Ej) => Q(Ej, wTrue))
  const sc = Array.from({ length: k - 1 }, (_, i) => cabs(D[0]) * cabs(D[i + 1]))
  const F = (r: C[]): C[] => {
    const w: C[] = [[1, 0], ...r]
    const q0 = Q(E[0], w)
    return Array.from({ length: k - 1 }, (_, i) =>
      cscale(csub(cmul(D[0], Q(E[i + 1], w)), cmul(D[i + 1], q0)), 1 / sc[i]))
  }
  const JF = (r: C[]): C[][] => {
    const w: C[] = [[1, 0], ...r]
    const g0 = gradQ(E[0], w)
    return Array.from({ length: k - 1 }, (_, i) => {
      const gi = gradQ(E[i + 1], w)
      return Array.from({ length: k - 1 }, (_, m) =>
        cscale(csub(cmul(D[0], gi[m + 1]), cmul(D[i + 1], g0[m + 1])), 1 / sc[i]))
    })
  }
  const G = (r: C[]): C[] => r.map((rm) => csub(cmul(rm, rm), [1, 0] as C))
  const JG = (r: C[]): C[][] => r.map((rm, i) => r.map((_, m) => (i === m ? cscale(rm, 2) : [0, 0] as C)))

  const gamma: C = [Math.cos(gammaAngle), Math.sin(gammaAngle)]
  const H = (r: C[], t: number): C[] => {
    const f = F(r), g = G(r)
    return f.map((fi, i) => cadd(cscale(cmul(gamma, g[i]), 1 - t), cscale(fi, t)))
  }
  const JH = (r: C[], t: number): C[][] => {
    const jf = JF(r), jg = JG(r)
    return jf.map((row, i) => row.map((v, m) => cadd(cscale(cmul(gamma, jg[i][m]), 1 - t), cscale(v, t))))
  }
  const dHdt = (r: C[]): C[] => {
    const f = F(r), g = G(r)
    return f.map((fi, i) => csub(fi, cmul(gamma, g[i])))
  }

  const track = (start: C[]): C[] | null => {
    let r = start.map((z) => z.slice() as C), t = 0, dt = 0.004
    while (t < 1) {
      const step = Math.min(dt, 1 - t)
      const dr = csolve(JH(r, t), dHdt(r).map((z) => cscale(z, -step)))
      if (!dr) { dt /= 2; if (dt < 1e-12) return null; continue }
      let rp = r.map((z, i) => cadd(z, dr[i])), ok = false
      const tp = t + step
      for (let it = 0; it < 12; it++) {
        const h = H(rp, tp)
        if (Math.max(...h.map(cabs)) < 1e-13) { ok = true; break }
        const d = csolve(JH(rp, tp), h.map((z) => cscale(z, -1)))
        if (!d) break
        rp = rp.map((z, i) => cadd(z, d[i]))
        if (!rp.every((z) => Number.isFinite(z[0]) && Number.isFinite(z[1]))) break
      }
      if (!ok || Math.max(...rp.map(cabs)) > 1e8) { dt /= 2; if (dt < 1e-12) return null; continue }
      r = rp; t = tp; dt = Math.min(dt * 1.5, 0.004)
    }
    for (let it = 0; it < 60; it++) {
      const f = F(r)
      if (Math.max(...f.map(cabs)) < 1e-13) break
      const d = csolve(JF(r), f.map((z) => cscale(z, -1)))
      if (!d) break
      r = r.map((z, i) => cadd(z, d[i]))
    }
    return Math.max(...F(r).map(cabs)) < 1e-9 ? r : null
  }

  const roots: C[][] = []
  for (let mask = 0; mask < 2 ** (k - 1); mask++) {
    const start: C[] = Array.from({ length: k - 1 }, (_, m) => [((mask >> m) & 1) ? -1 : 1, 0])
    const r = track(start)
    if (!r) continue
    const flat = r.flat()
    if (!roots.some((q) => Math.max(...q.flat().map((v, i) => Math.abs(v - flat[i]))) < 1e-6)) roots.push(r)
  }
  return roots
}

describe('k = 5: the count is attained one degree past the Newton sweep', () => {
  const ts = [0.21, 0.44, 0.63, 0.82, 1.0]
  const w: C[] = [[0.9, 0.3], [0.4, -0.7], [-0.6, 0.5], [1.1, 0.2], [-0.3, 0.9]]

  it('degree 9, six points: 16 distinct interpolants', { timeout: 120000 }, () => {
    // The tracker is validated first on k = 4, where the sweep above already knows the answer.
    expect(homotopyRoots(4, [0.27, 0.53, 0.78, 1.0],
      [[0.9, 0.3], [0.4, -0.7], [-0.6, 0.5], [1.1, 0.2]], 0.4131)).toHaveLength(8)

    // γ decides only how the paths are steered, never how many roots exist, so sweeping it
    // is free of the risk that would come from tuning the problem.
    let best: C[][] = []
    for (const angle of [0.4131, 0.77, 4.61, 5.9, 1.2345, 2.7183]) {
      const roots = homotopyRoots(5, ts, w, angle)
      if (roots.length > best.length) best = roots
      if (best.length === 16) break
    }
    console.log(`k=5  degree 9  →  ${best.length} distinct, predicted 16`)
    expect(best.length, 'Bézout caps this at 16, so 16 found is 16 exactly').toBe(16)

    // every one is a genuine solution, and one of them is the curve the data came from
    const w0 = w[0]
    const truth = w.slice(1).map((wj) => cdiv(wj, w0))
    expect(best.some((r) => Math.max(...r.map((z, i) => cabs(csub(z, truth[i])))) < 1e-6)).toBe(true)
  })
})
