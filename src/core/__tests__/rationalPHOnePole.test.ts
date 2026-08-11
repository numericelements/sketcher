// ============================================================================
// THE ONE-POLE RATIONAL PH SPACE CURVE — the rational twin of the cubic walkthrough, measured.
//
// F14 says the spatial no-log condition is quadratic in the spinor. With a SINGLE pole it is also
// EXPLICITLY SOLVABLE, which is what makes a walkthrough possible: for w = t − r there are no other
// roots, so Σ = 0 and the condition collapses to
//
//     𝒜′(r) = λ·𝒜(r)·i,        λ ∈ ℝ free
//
// an incidence with a MOVING PLANE — so parametrize it by choosing the base point first:
//
//     𝒜(t) = B₀ + λ(B₀ i)(t−r) + B₂(t−r)² + … + B_d(t−r)^d
//              free: B₀ (4), λ (1), B₂…B_d (4 each), r (1)   ⟹   4d + 2 parameters
//
// Then p comes from the Wronskian p′w − pw′ = 𝒜i𝒜̄, which with w = t − r reads, coefficient by
// coefficient, (e−1)p_e − r(e+1)p_{e+1} = N_e — LINEAR in p, square, with the translations
// p ↦ p + c₀w in its kernel. So p is unique up to a translation that prescribing c(0) then fixes.
//
// WHAT THIS FILE MEASURES, since paper counts in this project have a record of being wrong:
//
//   1. the construction really produces rational PH curves — ‖c′‖ = |𝒜|²/w², exactly;
//   2. the residue condition is NECESSARY: drop it and the Wronskian stops being solvable;
//   3. the FIBER DIMENSION for degree 4 and degree 6, under two data sets — endpoints-plus-first-leg
//      (the cubic walkthrough's data) and full C¹ Hermite (the quintic's);
//   4. whether the leftover is COMPACT like the polynomial fiber, or an open road. Act III predicts
//      open, because λ and r are non-compact parameters where the polynomial case had only angles;
//   5. whether degree 2 (d = 1) is too degenerate to be worth a slide.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
type Vec = { x: number; y: number; z: number }
const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })

const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

/** Taylor coefficients about r → the power basis. */
function taylorToPower(B: readonly Quat[], r: number): Quat[] {
  const out: Quat[] = Array.from({ length: B.length }, () => Q(0, 0, 0, 0))
  for (let k = 0; k < B.length; k++) {
    for (let j = 0; j <= k; j++) {
      const c = binom(k, j) * Math.pow(-r, k - j)
      out[j] = qadd(out[j], qscale(B[k], c))
    }
  }
  return out
}

/** N = 𝒜 i 𝒜̄ and σ = |𝒜|², both as polynomials. */
function hopf(A: readonly Quat[]): { N: [RPoly, RPoly, RPoly]; sigma: RPoly } {
  const deg = 2 * (A.length - 1)
  const N: [RPoly, RPoly, RPoly] = [
    new Array(deg + 1).fill(0), new Array(deg + 1).fill(0), new Array(deg + 1).fill(0),
  ]
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
      sigma[i + j] += qmul(A[i], qconj(A[j])).u
    }
  }
  return { N, sigma }
}

/**
 * Solve (e−1)p_e − r(e+1)p_{e+1} = N_e for each component. Square and rank-deficient by one per
 * component (the translation), so the reported residual IS the no-log obstruction.
 */
function solveP(N: readonly RPoly[], r: number): { p: RPoly[]; residual: number } {
  const degN = N[0].length - 1
  const rows: number[][] = []
  for (let e = 0; e <= degN; e++) {
    const row = new Array(degN + 1).fill(0)
    row[e] = e - 1
    if (e + 1 <= degN) row[e + 1] = -r * (e + 1)
    rows.push(row)
  }
  const p: RPoly[] = []
  let worst = 0
  for (let c = 0; c < 3; c++) {
    const rhs = N[c].slice()
    const x = leastSquares(rows, rhs, 1e-14)
    const scale = Math.max(...rhs.map(Math.abs), 1e-300)
    for (let e = 0; e < rows.length; e++) {
      worst = Math.max(worst, Math.abs(rows[e].reduce((s, a, j) => s + a * x[j], 0) - rhs[e]) / scale)
    }
    p.push(x)
  }
  return { p, residual: worst }
}

interface Member { A: Quat[]; w: RPoly; p: RPoly[]; sigma: RPoly; residual: number }

/** The construction: parameters in, member out. No solver on the spinor side. */
function member(d: number, prm: readonly number[]): Member {
  const B0 = Q(prm[0], prm[1], prm[2], prm[3])
  const lambda = prm[4]
  const B: Quat[] = [B0, qscale(qmul(B0, QUAT_I), lambda)]
  for (let k = 2; k <= d; k++) {
    const o = 5 + (k - 2) * 4
    B.push(Q(prm[o], prm[o + 1], prm[o + 2], prm[o + 3]))
  }
  const r = prm[5 + (d - 1) * 4]
  const A = taylorToPower(B, r)
  const { N, sigma } = hopf(A)
  const { p, residual } = solveP(N, r)
  return { A, w: [-r, 1], p, sigma, residual }
}

const paramCount = (d: number): number => 4 * d + 2

const curveAt = (m: Member, t: number): Vec => {
  const wv = rEval(m.w, t)
  return { x: rEval(m.p[0], t) / wv, y: rEval(m.p[1], t) / wv, z: rEval(m.p[2], t) / wv }
}
const dCurve = (m: Member, t: number, e = 1e-6): Vec => {
  const a = curveAt(m, t - e), b = curveAt(m, t + e)
  return { x: (b.x - a.x) / (2 * e), y: (b.y - a.y) / (2 * e), z: (b.z - a.z) / (2 * e) }
}
const vn = (a: Vec): number => Math.hypot(a.x, a.y, a.z)
const vd = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

/** Rank from the largest relative gap, truncated to min(m,n). */
function rankOf(rows: number[][]): number {
  const m = rows.length, n = rows[0]?.length ?? 0
  if (!m || !n) return 0
  const G: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => rows.reduce((s, row) => s + row[i] * row[j], 0)))
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += G[i][j] ** 2
    if (off < 1e-28) break
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.abs(G[i][j]) < 1e-300) continue
      const th = 0.5 * Math.atan2(2 * G[i][j], G[i][i] - G[j][j])
      const c = Math.cos(th), s = Math.sin(th)
      for (let k = 0; k < n; k++) {
        const a = G[i][k], b = G[j][k]; G[i][k] = c * a + s * b; G[j][k] = -s * a + c * b
      }
      for (let k = 0; k < n; k++) {
        const a = G[k][i], b = G[k][j]; G[k][i] = c * a + s * b; G[k][j] = -s * a + c * b
      }
    }
  }
  const sv = Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, G[i][i])))
    .sort((a, b) => b - a).slice(0, Math.min(m, n))
  let best = 0, at = sv.length
  for (let i = 0; i + 1 < sv.length; i++) {
    const ratio = sv[i] / Math.max(sv[i + 1], 1e-300)
    if (ratio > best) { best = ratio; at = i + 1 }
  }
  return best > 1e7 ? at : sv.length
}

// A seed with r outside [0,1] so the curve has no pole in the domain.
const SEED: Record<number, number[]> = {
  1: [1.0, 0.3, -0.4, 0.2, 0.6, /* r */ 1.7],
  2: [1.0, 0.3, -0.4, 0.2, 0.6, 0.25, -0.5, 0.15, 0.35, /* r */ 1.7],
  3: [1.0, 0.3, -0.4, 0.2, 0.6, 0.25, -0.5, 0.15, 0.35, -0.2, 0.4, 0.1, -0.3, /* r */ 1.7],
}

describe('rational PH space curves with ONE pole', () => {
  it('the construction produces exactly-PH rational curves, with no solve on the spinor', () => {
    for (const d of [1, 2, 3]) {
      const m = member(d, SEED[d])
      let worst = 0
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const predicted = rEval(m.sigma, t) / Math.pow(rEval(m.w, t), 2)
        worst = Math.max(worst, Math.abs(vn(dCurve(m, t)) - Math.abs(predicted)) / Math.abs(predicted))
      }
      console.log(
        `    d = ${d} (curve degree ${2 * d}):  Wronskian residual ${m.residual.toExponential(1)}` +
          `   ‖c′‖ vs |𝒜|²/w²  ${worst.toExponential(1)}`,
      )
      expect(m.residual, `d=${d}: the residue condition makes the Wronskian solvable`).toBeLessThan(1e-9)
      expect(worst, `d=${d}: and the result is exactly PH`).toBeLessThan(1e-6)
    }
  })

  it('the residue condition is NECESSARY: break it and the Wronskian is unsolvable', () => {
    const d = 2
    const prm = SEED[d].slice()
    const good = member(d, prm)
    // Perturb B₁ off the plane 𝒜(r)·span{1,i} by hand — the one thing the parametrization forbids.
    const B0 = Q(prm[0], prm[1], prm[2], prm[3])
    const r = prm[5 + (d - 1) * 4]
    const B: Quat[] = [B0, qadd(qscale(qmul(B0, QUAT_I), prm[4]), Q(0, 0, 0.3, 0)), Q(prm[5], prm[6], prm[7], prm[8])]
    const A = taylorToPower(B, r)
    const bad = solveP(hopf(A).N, r)
    console.log(
      `    on the plane: ${good.residual.toExponential(1)}    off the plane: ${bad.residual.toExponential(1)}`,
    )
    expect(bad.residual, 'off the gauge plane there is no rational antiderivative').toBeGreaterThan(1e-3)
  })

  it('THE FIBER DIMENSIONS, for the cubic walkthrough data and for C1 Hermite', () => {
    // Data map A: c′(0) and c(1)−c(0)      — the cubic walkthrough's data, 6 conditions
    // Data map B: adds c′(1)               — full C¹ Hermite, 9 conditions
    // Fiber = parameters − rank − gauge, with gauge 1 (the spinor phase 𝒜 ↦ 𝒜e^{iθ};
    // the (p,w) scaling is already spent making w monic, and the translation on prescribing c(0)).
    for (const d of [2, 3]) {
      const prm = SEED[d]
      const readout = (q: readonly number[], full: boolean): number[] => {
        const mm = member(d, q)
        const d0 = dCurve(mm, 0), gap = vd(curveAt(mm, 1), curveAt(mm, 0))
        const out = [d0.x, d0.y, d0.z, gap.x, gap.y, gap.z]
        if (full) { const d1 = dCurve(mm, 1); out.push(d1.x, d1.y, d1.z) }
        return out
      }
      for (const full of [false, true]) {
        const n = paramCount(d)
        const rows: number[][] = []
        const base = readout(prm, full)
        for (let k = 0; k < base.length; k++) {
          rows.push(Array.from({ length: n }, (_, j) => {
            const e = 1e-5
            const hi = prm.slice(); hi[j] += e
            const lo = prm.slice(); lo[j] -= e
            return (readout(hi, full)[k] - readout(lo, full)[k]) / (2 * e)
          }))
        }
        const rk = rankOf(rows)
        const fiber = n - rk - 1
        console.log(
          `    d = ${d} (degree ${2 * d}), ${full ? 'C¹ Hermite  ' : 'ends+first leg'}:` +
            `  ${n} params − rank ${rk} − 1 gauge = fiber ${fiber}` +
            `   (${base.length} conditions offered)`,
        )
        expect(rk, `d=${d}: the conditions are independent`).toBe(base.length)
        expect(fiber, `d=${d}: a non-negative fiber`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('and the fiber is NOT compact: lambda runs away with the data held', () => {
    // The polynomial fiber was a product of ANGLES, so it closed. Here two parameters are genuinely
    // non-compact — λ and the pole location r — so Act III predicts an open road. Test the prediction
    // by pushing λ far and asking whether the data can be held.
    const d = 3
    const prm = SEED[d].slice()
    const readout = (q: readonly number[]): number[] => {
      const mm = member(d, q)
      const d0 = dCurve(mm, 0), gap = vd(curveAt(mm, 1), curveAt(mm, 0))
      return [d0.x, d0.y, d0.z, gap.x, gap.y, gap.z]
    }
    const target = readout(prm)
    const n = paramCount(d)
    let cur = prm.slice()
    let reached = 0
    for (const push of [1, 2, 4, 8, 16]) {
      const want = cur.slice()
      want[4] = prm[4] + push                       // drive λ
      // project back onto the data by Gauss-Newton on the other parameters
      let q = want.slice()
      for (let it = 0; it < 40; it++) {
        const res = readout(q).map((v, i) => v - target[i])
        if (Math.hypot(...res) < 1e-11) break
        const J: number[][] = res.map((_, k) =>
          Array.from({ length: n }, (_, j) => {
            if (j === 4) return 0                   // hold λ at the pushed value
            const e = 1e-6
            const hi = q.slice(); hi[j] += e
            const lo = q.slice(); lo[j] -= e
            return (readout(hi)[k] - readout(lo)[k]) / (2 * e)
          }))
        const step = leastSquares(J, res.map((v) => -v), 1e-10)
        q = q.map((v, j) => v + step[j])
      }
      const err = Math.hypot(...readout(q).map((v, i) => v - target[i]))
      if (err < 1e-7) { reached = push; cur = q }
      console.log(`    λ pushed by ${String(push).padStart(2)}:  data held to ${err.toExponential(1)}`)
    }
    console.log(`    λ reached ${prm[4]} + ${reached} with the data fixed  <- the fiber runs, it does not close`)
    expect(reached, 'the fiber extends far in λ — a road, not a loop').toBeGreaterThanOrEqual(4)
  })

  it('degree 2 (d = 1) is degenerate: it is a straight LINE, and provably so', () => {
    // Worth knowing before it is offered as the minimal example -- and the reason is one line of
    // quaternion algebra. The residue condition says B₁ = λ·B₀·i, so
    //
    //     𝒜(t) = B₀ + λB₀i(t−r) = B₀·(1 + λi(t−r))
    //
    // and the scalar-plus-i factor COMMUTES with i, so
    //
    //     N = 𝒜i𝒜̄ = B₀(1+λi s)·i·(1−λi s)B̄₀ = (1 + λ²s²)·(B₀ i B̄₀),      s = t−r
    //
    // a FIXED vector times a scalar polynomial. The hodograph direction never changes, so the curve is
    // a straight line. Degree 2 is not merely "too limited" — with one pole it is degenerate by force,
    // and the minimal non-degenerate case is d = 2, curve degree 4.
    const m = member(1, SEED[1])
    const dirs = [0.1, 0.35, 0.6, 0.9].map((t) => {
      const v = dCurve(m, t)
      const n = vn(v)
      return { x: v.x / n, y: v.y / n, z: v.z / n }
    })
    const spread = Math.max(...dirs.slice(1).map((v) => vn(vd(v, dirs[0]))))
    // and the curvature, for the record
    const kappa = [0.25, 0.5, 0.75].map((t) => {
      const e = 1e-4
      const a = curveAt(m, t - e), b = curveAt(m, t), c = curveAt(m, t + e)
      const d1 = { x: (c.x - a.x) / (2 * e), y: (c.y - a.y) / (2 * e), z: (c.z - a.z) / (2 * e) }
      const d2 = { x: (c.x - 2 * b.x + a.x) / (e * e), y: (c.y - 2 * b.y + a.y) / (e * e), z: (c.z - 2 * b.z + a.z) / (e * e) }
      const cr = { x: d1.y * d2.z - d1.z * d2.y, y: d1.z * d2.x - d1.x * d2.z, z: d1.x * d2.y - d1.y * d2.x }
      return vn(cr) / Math.pow(vn(d1), 3)
    })
    console.log(
      `    tangent direction spread over t: ${spread.toExponential(1)}` +
        `   κ ≤ ${Math.max(...kappa).toExponential(1)}   <- a straight LINE`,
    )
    expect(spread, 'the hodograph direction is constant').toBeLessThan(1e-9)
    expect(Math.max(...kappa), 'so the curvature vanishes').toBeLessThan(1e-6)

    // Contrast: d = 2 curves, and they are genuinely curved.
    const m2 = member(2, SEED[2])
    const dirs2 = [0.1, 0.5, 0.9].map((t) => {
      const v = dCurve(m2, t); const n = vn(v)
      return { x: v.x / n, y: v.y / n, z: v.z / n }
    })
    const spread2 = Math.max(...dirs2.slice(1).map((v) => vn(vd(v, dirs2[0]))))
    console.log(`    d = 2 for contrast: direction spread ${spread2.toFixed(3)}  <- genuinely curved`)
    expect(spread2, 'degree 4 is the minimal non-degenerate case').toBeGreaterThan(1e-2)
  })
})
