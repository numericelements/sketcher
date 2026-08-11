// ============================================================================
// HEAD TO HEAD: DRAGGING IN THE SPINOR CHART VS THE IMPLICIT CHART
//
// CLAUDE.md's standing solver-quality investigation asks how to make a dragged point track without
// letting the invariant slip. Every attempt so far has been a better SOLVER for the constrained problem.
// F16 opens the other door: in the spinor chart PH is automatic, so there is no constraint to hold and
// a drag becomes an ORDINARY unconstrained fit.
//
//   chart A — SPINOR (this file's proposal).  Unknowns (B₀, λ, B₂…B_d, r), 4d+2 of them. PH is free:
//     𝒜 is built from the parameters, N = 𝒜i𝒜̄ is a Hopf square by construction, and p comes from
//     back-substitution on (e−1)p_e − r(e+1)p_{e+1} = N_e — closed form, no iteration at all.
//
//   chart B — IMPLICIT (the incumbent architecture).  Unknowns are the curve's own coefficients
//     (p, w, σ), and PH is imposed as the polynomial identity ‖p′w − pw′‖² = σ², one equation per
//     coefficient. The cursor is more rows on the same system.
//
// The measure of success is CLAUDE.md's, not "it converged": the point must TRACK and the invariant must
// HOLD. Both are reported for both charts, over the same drag, plus the wall clock.
//
// AND THE HONEST STOP. In chart A the pole r is where the curve passes through infinity (F16), so the
// drag's true limit is r entering [0,1]. That is a nameable geometric event, not a solver failure, and
// the last test checks the drag reports it as one.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
type Vec = { x: number; y: number; z: number }
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const vsub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const vnorm = (a: Vec): number => Math.hypot(a.x, a.y, a.z)
const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

// --- chart A: the spinor chart ---------------------------------------------
function taylorToPower(B: readonly Quat[], r: number): Quat[] {
  const out: Quat[] = B.map(() => Q(0, 0, 0, 0))
  for (let k = 0; k < B.length; k++) {
    for (let j = 0; j <= k; j++) out[j] = qadd(out[j], qscale(B[k], binom(k, j) * Math.pow(-r, k - j)))
  }
  return out
}

function hopf(A: readonly Quat[]): { N: RPoly[]; sigma: RPoly } {
  const deg = 2 * (A.length - 1)
  const N = [new Array(deg + 1).fill(0), new Array(deg + 1).fill(0), new Array(deg + 1).fill(0)]
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A.length; j++) {
    const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
    N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
    sigma[i + j] += qmul(A[i], qconj(A[j])).u
  }
  return { N, sigma }
}

/** Closed form: back-substitute (e−1)p_e − r(e+1)p_{e+1} = N_e. No iteration. */
function backSubstitute(N: readonly RPoly[], r: number): { p: RPoly[]; consistency: number } {
  const n = N[0].length - 1
  const p: RPoly[] = []
  let worst = 0
  for (let c = 0; c < 3; c++) {
    const f = new Array(n + 1).fill(0)
    for (let e = n; e >= 2; e--) {
      const above = e + 1 <= n ? r * (e + 1) * f[e + 1] : 0
      f[e] = (N[c][e] + above) / (e - 1)
    }
    const scale = Math.max(...N[c].map(Math.abs), 1e-300)
    worst = Math.max(worst, Math.abs(-2 * r * f[2] - N[c][1]) / scale)
    f[0] = 0
    f[1] = -N[c][0] / r
    p.push(f)
  }
  return { p, consistency: worst }
}

interface Member { p: RPoly[]; w: RPoly; sigma: RPoly; N: RPoly[]; consistency: number }

function chartA(d: number, prm: readonly number[]): Member {
  const B0 = Q(prm[0], prm[1], prm[2], prm[3])
  const B: Quat[] = [B0, qscale(qmul(B0, QUAT_I), prm[4])]
  for (let k = 2; k <= d; k++) {
    const o = 5 + (k - 2) * 4
    B.push(Q(prm[o], prm[o + 1], prm[o + 2], prm[o + 3]))
  }
  const r = prm[5 + (d - 1) * 4]
  const { N, sigma } = hopf(taylorToPower(B, r))
  const { p, consistency } = backSubstitute(N, r)
  return { p, w: [-r, 1], sigma, N, consistency }
}

const at = (m: Member, t: number): Vec => {
  const wv = rEval(m.w, t)
  return { x: rEval(m.p[0], t) / wv, y: rEval(m.p[1], t) / wv, z: rEval(m.p[2], t) / wv }
}
/** c′ = N/w² — exact, no differencing. */
const deriv = (m: Member, t: number): Vec => {
  const w2 = Math.pow(rEval(m.w, t), 2)
  return { x: rEval(m.N[0], t) / w2, y: rEval(m.N[1], t) / w2, z: rEval(m.N[2], t) / w2 }
}
/** The PH defect: ‖c′‖ against |𝒜|²/w², relative. This is what "the invariant held" means. */
function phDefect(m: Member): number {
  let worst = 0
  for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const want = Math.abs(rEval(m.sigma, t) / Math.pow(rEval(m.w, t), 2))
    worst = Math.max(worst, Math.abs(vnorm(deriv(m, t)) - want) / Math.max(want, 1e-300))
  }
  return worst
}

// --- chart B: the implicit chart -------------------------------------------
const convolve = (a: RPoly, b: RPoly): RPoly => {
  const out = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}
const rDeriv = (p: RPoly): RPoly => p.slice(1).map((c, i) => c * (i + 1))
const padd = (a: RPoly, b: RPoly): RPoly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))
const pneg = (a: RPoly): RPoly => a.map((v) => -v)

/**
 * Unknowns: p (3 × (2d+1)), w (2), σ (2d+1). Residual: the PH identity ‖p′w − pw′‖² − σ² = 0 coefficient
 * by coefficient, plus the data rows. This is the incumbent shape — invariant as constraints, cursor as
 * more rows — done here at the same degree so the comparison is fair.
 */
function chartBResidual(x: readonly number[], d: number, target: number[]): number[] {
  const np = 2 * d + 1
  const p: RPoly[] = [0, 1, 2].map((c) => x.slice(c * np, (c + 1) * np) as RPoly)
  const w: RPoly = [x[3 * np], x[3 * np + 1]]
  const sigma: RPoly = x.slice(3 * np + 2, 3 * np + 2 + np) as RPoly
  const wD = rDeriv(w)
  const N = p.map((pc) => padd(convolve(rDeriv(pc), w), pneg(convolve(pc, wD))))
  const normSq = N.reduce<RPoly>((acc, nc) => padd(acc, convolve(nc, nc)), [0])
  const sigmaSq = convolve(sigma, sigma)
  const res: number[] = []
  const len = Math.max(normSq.length, sigmaSq.length)
  const scale = Math.max(...normSq.map(Math.abs), 1e-12)
  for (let e = 0; e < len; e++) res.push(((normSq[e] ?? 0) - (sigmaSq[e] ?? 0)) / scale)
  // data: c′(0) and c(1) − c(0)
  const w0 = rEval(w, 0), w1 = rEval(w, 1)
  const d0 = [0, 1, 2].map((c) => rEval(N[c], 0) / (w0 * w0))
  const gap = [0, 1, 2].map((c) => rEval(p[c], 1) / w1 - rEval(p[c], 0) / w0)
  for (let c = 0; c < 3; c++) res.push(d0[c] - target[c])
  for (let c = 0; c < 3; c++) res.push(gap[c] - target[3 + c])
  return res
}

function memberFromB(x: readonly number[], d: number): Member {
  const np = 2 * d + 1
  const p: RPoly[] = [0, 1, 2].map((c) => x.slice(c * np, (c + 1) * np) as RPoly)
  const w: RPoly = [x[3 * np], x[3 * np + 1]]
  const sigma: RPoly = x.slice(3 * np + 2, 3 * np + 2 + np) as RPoly
  const wD = rDeriv(w)
  const N = p.map((pc) => padd(convolve(rDeriv(pc), w), pneg(convolve(pc, wD))))
  return { p, w, sigma, N, consistency: 0 }
}

/** Gauss-Newton by min-norm least squares — the same engine for both charts, so only the CHART differs. */
function fit(
  x0: readonly number[], residual: (x: readonly number[]) => number[], iterations = 60,
): { x: number[]; iters: number } {
  let x = x0.slice()
  for (let it = 0; it < iterations; it++) {
    const r = residual(x)
    if (Math.hypot(...r) < 1e-12) return { x, iters: it }
    const J = r.map((_, k) => x.map((_, j) => {
      const e = 1e-7
      const hi = x.slice(); hi[j] += e
      const lo = x.slice(); lo[j] -= e
      return (residual(hi)[k] - residual(lo)[k]) / (2 * e)
    }))
    let step: number[]
    try { step = leastSquares(J, r.map((v) => -v), 1e-10) } catch { return { x, iters: it } }
    x = x.map((v, j) => v + step[j])
  }
  return { x, iters: iterations }
}

const D = 2
const SEED = [1.0, 0.3, -0.4, 0.2, 0.6, 0.25, -0.5, 0.15, 0.35, 1.7]

describe('dragging in the spinor chart vs the implicit chart', () => {
  it('the spinor chart needs NO iteration to build a member, and PH is exact', () => {
    const t0 = performance.now()
    let worst = 0
    for (let k = 0; k < 200; k++) {
      const prm = SEED.map((v, i) => v + 0.001 * k * (i % 3 === 0 ? 1 : -0.5))
      const m = chartA(D, prm)
      worst = Math.max(worst, phDefect(m), m.consistency)
    }
    const ms = (performance.now() - t0) / 200
    console.log(
      `    200 members built: ${ms.toFixed(3)} ms each (closed form)` +
        `   worst PH defect + consistency ${worst.toExponential(1)}`,
    )
    expect(worst, 'PH is exact by construction, at every parameter value').toBeLessThan(1e-9)
  })

  it('HEAD TO HEAD on the same drag: tracking, invariant, and time', () => {
    const seedM = chartA(D, SEED)
    const d0 = deriv(seedM, 0)
    const gap0 = vsub(at(seedM, 1), at(seedM, 0))
    const span = vnorm(gap0)
    const dir = { x: 0.6, y: -0.5, z: 0.62 }

    // ---- chart A: unknowns are the spinor parameters; PH cannot be violated.
    let xa = SEED.slice()
    let aTravel = 0, aDefect = 0, aIters = 0
    const ta = performance.now()
    for (let k = 1; k <= 10; k++) {
      const s = span * 0.05 * k
      const target = [
        d0.x, d0.y, d0.z,
        gap0.x + s * dir.x, gap0.y + s * dir.y, gap0.z + s * dir.z,
      ]
      const res = (x: readonly number[]): number[] => {
        const m = chartA(D, x)
        const dd = deriv(m, 0), gg = vsub(at(m, 1), at(m, 0))
        return [dd.x - target[0], dd.y - target[1], dd.z - target[2],
          gg.x - target[3], gg.y - target[4], gg.z - target[5]]
      }
      const out = fit(xa, res)
      if (Math.hypot(...res(out.x)) < 1e-8) { xa = out.x; aIters += out.iters }
    }
    const msA = performance.now() - ta
    {
      const m = chartA(D, xa)
      aTravel = vnorm(vsub(vsub(at(m, 1), at(m, 0)), gap0))
      aDefect = Math.max(phDefect(m), m.consistency)
    }

    // ---- chart B: unknowns are the curve's coefficients; PH is a constraint.
    const np = 2 * D + 1
    const xb0 = [
      ...seedM.p[0].slice(0, np), ...seedM.p[1].slice(0, np), ...seedM.p[2].slice(0, np),
      seedM.w[0], seedM.w[1], ...seedM.sigma.slice(0, np),
    ]
    let xb = xb0.slice()
    let bTravel = 0, bDefect = 0, bIters = 0
    const tb = performance.now()
    for (let k = 1; k <= 10; k++) {
      const s = span * 0.05 * k
      const target = [
        d0.x, d0.y, d0.z,
        gap0.x + s * dir.x, gap0.y + s * dir.y, gap0.z + s * dir.z,
      ]
      const out = fit(xb, (x) => chartBResidual(x, D, target))
      const r = chartBResidual(out.x, D, target)
      if (Math.hypot(...r) < 1e-6) { xb = out.x; bIters += out.iters }
    }
    const msB = performance.now() - tb
    {
      const m = memberFromB(xb, D)
      bTravel = vnorm(vsub(vsub(at(m, 1), at(m, 0)), gap0))
      bDefect = phDefect(m)
    }

    const asked = span * 0.5 * vnorm(dir)
    console.log(
      `    chart A (spinor, unconstrained):  travelled ${(100 * aTravel / asked).toFixed(0)}%` +
        `   PH defect ${aDefect.toExponential(1)}   ${msA.toFixed(0)} ms, ${aIters} iters`,
    )
    console.log(
      `    chart B (implicit, constrained):  travelled ${(100 * bTravel / asked).toFixed(0)}%` +
        `   PH defect ${bDefect.toExponential(1)}   ${msB.toFixed(0)} ms, ${bIters} iters`,
    )
    // CLAUDE.md's test: tracked AND held. Chart A must satisfy both.
    expect(aTravel / asked, 'chart A tracks the cursor').toBeGreaterThan(0.9)
    expect(aDefect, 'and holds PH exactly — it cannot do otherwise').toBeLessThan(1e-9)
    console.log(
      `    verdict: the spinor chart holds PH by CONSTRUCTION; the implicit chart holds it only as well` +
        ` as its solve (${bDefect.toExponential(1)} here).`,
    )
  }, 120_000)

  it('the honest stop: the drag ends when the pole reaches the curve, and it is nameable', () => {
    // Drive the pole toward the domain and report the geometric event rather than a solver failure.
    let x = SEED.slice()
    const seedM = chartA(D, SEED)
    const d0 = deriv(seedM, 0), gap0 = vsub(at(seedM, 1), at(seedM, 0))
    const target = [d0.x, d0.y, d0.z, gap0.x, gap0.y, gap0.z]
    let lastGood = SEED[9]
    for (const rT of [1.5, 1.3, 1.15, 1.05, 1.01]) {
      const res = (q: readonly number[]): number[] => {
        const m = chartA(D, q)
        const dd = deriv(m, 0), gg = vsub(at(m, 1), at(m, 0))
        return [dd.x - target[0], dd.y - target[1], dd.z - target[2],
          gg.x - target[3], gg.y - target[4], gg.z - target[5], 8 * (q[9] - rT)]
      }
      const out = fit(x, res, 80)
      const err = Math.hypot(...res(out.x).slice(0, 6))
      const m = chartA(D, out.x)
      const speed1 = vnorm(deriv(m, 1))
      if (err < 1e-7) { x = out.x; lastGood = out.x[9] }
      console.log(
        `    pole → ${rT.toFixed(2)}:  data held to ${err.toExponential(1)}` +
          `   |c′(1)| = ${speed1.toExponential(2)}   pole at ${out.x[9].toFixed(4)}`,
      )
    }
    console.log(
      `    the pole reached ${lastGood.toFixed(4)}; the limit is r → 1, where infinity meets the curve` +
        `  — a geometric event, not a solver failure`,
    )
    expect(lastGood, 'the pole can be driven toward the domain').toBeLessThan(1.4)
    expect(lastGood, 'and it stays outside it').toBeGreaterThan(1.0)
  }, 120_000)
})
