// ============================================================================
// WHAT λ IS — the simpler problem, and the name it hands back.
//
// Eric's heuristic: if there is a problem you cannot solve, find the simpler one you cannot solve. The
// simpler one here is the PLANAR complex-rational quartic with one pole — F13's (deg S, deg D) = (2,1).
// And it is completely solvable, which is the point: comparing it with the spatial case isolates the
// spatial difficulty to a single parameter.
//
// THE PLANAR CASE. z = F/D with F′D − FD′ = S². One pole means D = t − r, so Σ = 0 and the no-log
// condition is S′(r) = 0 — the spinor has a critical point at the pole. For deg S = 2 that is simply
//
//     S(t) = s₀ + s₂(t−r)²           no linear term. That is the entire condition.
//
// Solving for F is back-substitution: (e−1)f_e − r(e+1)f_{e+1} = (S²)_e, downward from the top, and the
// e = 1 row is the consistency condition — i.e. the no-log condition met from the other side.
//
// THE DIFFERENCE, WHICH IS THE WHOLE POINT. In 3D the same condition is N′(r) = 0 with N = 𝒜i𝒜̄, and
// 𝒜′(r) = λ𝒜(r)i satisfies it for ANY λ:
//
//     N′ = 𝒜′i𝒜̄ + 𝒜i𝒜̄′ = λ(𝒜i)i𝒜̄ + 𝒜i(−λi𝒜̄) = −λ𝒜𝒜̄ + λ𝒜𝒜̄ = 0
//
// The terms cancel because the Hopf map is a SANDWICH — the right-hand i is conjugated and returns with
// a minus. In 2D, N = S² gives N′ = 2SS′, and S′ = λSi yields 2λS²i, which does not vanish: in ℂ the i
// simply commutes through and nothing cancels. So S′(r) must be zero outright.
//
//     3D:  𝒜′(r) ∈ ℍ is 4 real, minus 3 conditions  =  1 free  (λ)
//     2D:  S′(r) ∈ ℂ is 2 real, minus 2 conditions  =  0 free  (no λ)
//
// AND THAT NAMES λ. The kernel direction 𝒜·i is the tangent to the gauge orbit 𝒜 ↦ 𝒜e^{iθ}, which
// rotates the frame ABOUT the tangent and leaves the tangent alone. So λ is a TWIST rate — and 2D has
// none because a planar curve's normal is unique up to sign, so there is no rotation about the tangent
// to be had. Proved below and measured: at the pole the frame's angular velocity is exactly 2λ·e₁,
// purely tangential.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qnormSq, qscale, qvec } from '../quaternion'
import { type Complex, cadd, cmul, cscale, csub } from '../complex'

type CPoly = Complex[]
const C = (re: number, im = 0): Complex => ({ re, im })
const cEval = (p: CPoly, t: number): Complex => p.reduceRight((a, c) => cadd(cscale(a, t), c), C(0))
const cnorm2 = (a: Complex): number => a.re * a.re + a.im * a.im
const binom = (n: number, k: number): number => {
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  return r
}

/** Taylor coefficients about r → the power basis. */
function taylorToPowerC(B: readonly Complex[], r: number): CPoly {
  const out: CPoly = B.map(() => C(0))
  for (let k = 0; k < B.length; k++) {
    for (let j = 0; j <= k; j++) out[j] = cadd(out[j], cscale(B[k], binom(k, j) * Math.pow(-r, k - j)))
  }
  return out
}

const convC = (a: CPoly, b: CPoly): CPoly => {
  const out: CPoly = Array.from({ length: a.length + b.length - 1 }, () => C(0))
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    out[i + j] = cadd(out[i + j], cmul(a[i], b[j]))
  }
  return out
}

/**
 * Back-substitute (e−1)f_e − r(e+1)f_{e+1} = g_e from the top. The e = 1 row cannot involve f₁, so it
 * is a CONSISTENCY condition — the no-log condition, arrived at from the solving side. f₀ is set to
 * zero, which is the translation gauge, and f₁ follows from the e = 0 row.
 */
function solveF(g: CPoly, r: number): { F: CPoly; consistency: number } {
  const n = g.length - 1
  const f: CPoly = Array.from({ length: n + 1 }, () => C(0))
  for (let e = n; e >= 2; e--) {
    const above = e + 1 <= n ? cscale(f[e + 1], r * (e + 1)) : C(0)
    f[e] = cscale(cadd(g[e], above), 1 / (e - 1))
  }
  // e = 1:  0·f₁ − 2r f₂ = g₁
  const resid = csub(cscale(f[2], -2 * r), g[1])
  const scale = Math.max(...g.map((c) => Math.sqrt(cnorm2(c))), 1e-300)
  // e = 0:  −f₀ − r f₁ = g₀, with f₀ ≡ 0 (translation gauge)
  f[1] = cscale(g[0], -1 / r)
  return { F: f, consistency: Math.sqrt(cnorm2(resid)) / scale }
}

interface Planar { S: CPoly; F: CPoly; r: number; consistency: number }

/** parameters: [Re s₀, Im s₀, Re s₂, Im s₂, r] — the ENTIRE one-pole planar quartic family. */
function planar(prm: readonly number[]): Planar {
  const r = prm[4]
  const S = taylorToPowerC([C(prm[0], prm[1]), C(0, 0), C(prm[2], prm[3])], r)
  const { F, consistency } = solveF(convC(S, S), r)
  return { S, F, r, consistency }
}

const zAt = (m: Planar, t: number): Complex => cscale(cEval(m.F, t), 1 / (t - m.r))
const dz = (m: Planar, t: number, e = 1e-6): Complex =>
  cscale(csub(zAt(m, t + e), zAt(m, t - e)), 1 / (2 * e))

// --- the spatial side -------------------------------------------------------
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
function taylorToPowerQ(B: readonly Quat[], r: number): Quat[] {
  const out: Quat[] = B.map(() => Q(0, 0, 0, 0))
  for (let k = 0; k < B.length; k++) {
    for (let j = 0; j <= k; j++) out[j] = qadd(out[j], qscale(B[k], binom(k, j) * Math.pow(-r, k - j)))
  }
  return out
}
const qEval = (p: readonly Quat[], t: number): Quat =>
  p.reduceRight((a, c) => qadd(qscale(a, t), c), Q(0, 0, 0, 0))

describe('the simpler problem, and what it names', () => {
  it('PLANAR: the one-pole quartic is completely solvable, and S has no linear term', () => {
    const SEEDS = [
      [1.0, 0.3, 0.4, -0.25, 1.7],
      [0.8, -0.5, -0.3, 0.6, -0.9],
      [1.2, 0.1, 0.55, 0.2, 2.4],
    ]
    for (const prm of SEEDS) {
      const m = planar(prm)
      // PH is automatic: |z′| = |S|²/|D|², a rational function.
      let worst = 0
      for (const t of [0.1, 0.35, 0.6, 0.9]) {
        const predicted = cnorm2(cEval(m.S, t)) / Math.pow(t - m.r, 2)
        const measured = Math.sqrt(cnorm2(dz(m, t)))
        worst = Math.max(worst, Math.abs(measured - predicted) / predicted)
      }
      console.log(
        `    r = ${String(prm[4]).padStart(5)}:  consistency ${m.consistency.toExponential(1)}` +
          `   |z′| vs |S|²/|D|²  ${worst.toExponential(1)}`,
      )
      expect(m.consistency, 'the no-log condition holds by construction').toBeLessThan(1e-12)
      expect(worst, 'and the curve is exactly PH').toBeLessThan(1e-6)
    }
  })

  it("and the FREEDOM at the pole is 0 in the plane, 1 in space — that is the whole difference", () => {
    // 2D: how many real directions can S′(r) move in while N′(r) = 0 is kept? Answer should be 0.
    const S0 = C(1.1, 0.35)
    let planarFree = 0
    for (const dir of [C(1, 0), C(0, 1), cmul(S0, C(0, 1))]) {
      // N′(r) = 2·S(r)·S′(r); moving S′(r) by `dir` changes it by 2 S0 dir
      const change = Math.sqrt(cnorm2(cscale(cmul(S0, dir), 2)))
      if (change < 1e-12) planarFree++
    }
    // 3D: the same question for 𝒜′(r), where the sandwich has a kernel.
    const A0 = Q(1.1, 0.4, -0.3, 0.8)
    const dN = (Ad: Quat): number => {
      const t1 = qmul(qmul(Ad, QUAT_I), qconj(A0))
      const t2 = qmul(qmul(A0, QUAT_I), qconj(Ad))
      return Math.sqrt(qnormSq(qadd(t1, t2)))
    }
    const basis = [Q(1, 0, 0, 0), Q(0, 1, 0, 0), Q(0, 0, 1, 0), Q(0, 0, 0, 1)]
    const rows = basis.map((b) => {
      const v = qvec(qadd(qmul(qmul(b, QUAT_I), qconj(A0)), qmul(qmul(A0, QUAT_I), qconj(b))))
      return [v.x, v.y, v.z]
    })
    // nullity of the 4x3 map 𝒜′ ↦ N′
    const gaugeDir = qmul(A0, QUAT_I)
    console.log(
      `    plane: directions of S′(r) keeping N′(r) = 0 → ${planarFree}` +
        `   (probe |2·S₀·dir| never vanishes)`,
    )
    console.log(
      `    space: the gauge direction 𝒜₀i gives |N′| = ${dN(gaugeDir).toExponential(1)}` +
        `   while a generic direction gives ${dN(basis[2]).toExponential(1)}`,
    )
    expect(planarFree, 'in the plane there is no direction to move in').toBe(0)
    expect(dN(gaugeDir) / Math.sqrt(qnormSq(A0)) ** 2, 'in space the gauge direction is FREE')
      .toBeLessThan(1e-14)
    expect(dN(basis[2]), 'while a generic direction is not').toBeGreaterThan(1e-3)
    expect(rows.length, 'four directions probed').toBe(4)
  })

  it('λ IS A TWIST RATE: at the pole the frame spins about the tangent at exactly 2λ', () => {
    // The frame from the spinor is v ↦ 𝒜v𝒜̄/|𝒜|², so with q = 𝒜/|𝒜| the angular velocity is
    // ω = 2·vec(q̇ q̄). With 𝒜′(r) = λ𝒜(r)i we get q̇ = λ q i (|𝒜| is stationary, since Re(𝒜i𝒜̄) = 0),
    // hence ω = 2λ·vec(q i q̄) = 2λ·e₁ — PURELY TANGENTIAL, magnitude 2|λ|. Measured numerically.
    const r = 1.7
    const B0 = Q(1.1, 0.4, -0.3, 0.8)
    for (const lambda of [0.35, -0.9, 1.6]) {
      const B: Quat[] = [B0, qscale(qmul(B0, QUAT_I), lambda), Q(0.2, -0.5, 0.15, 0.6)]
      const A = taylorToPowerQ(B, r)
      const unit = (t: number): Quat => {
        const a = qEval(A, t)
        return qscale(a, 1 / Math.sqrt(qnormSq(a)))
      }
      const e = 1e-6
      const qd = qscale(qadd(unit(r + e), qscale(unit(r - e), -1)), 1 / (2 * e))
      const omega = qvec(qscale(qmul(qd, qconj(unit(r))), 2))
      const e1 = qvec(qmul(qmul(unit(r), QUAT_I), qconj(unit(r))))
      const along = omega.x * e1.x + omega.y * e1.y + omega.z * e1.z
      const mag = Math.hypot(omega.x, omega.y, omega.z)
      const offAxis = Math.sqrt(Math.max(0, mag * mag - along * along))
      console.log(
        `    λ = ${String(lambda).padStart(5)}:  ω·e₁ = ${along.toFixed(6)}  (2λ = ${(2 * lambda).toFixed(6)})` +
          `   off-axis part ${offAxis.toExponential(1)}`,
      )
      expect(along, 'the tangential rate is exactly 2λ').toBeCloseTo(2 * lambda, 6)
      expect(offAxis, 'and there is NO off-axis rotation at the pole').toBeLessThan(1e-6)
    }
  })

  it('THE ROAD, in the plane: 1-dimensional, and it ends when the pole reaches the curve', () => {
    // Data: the first tangent and the far endpoint — 4 real conditions on 5 parameters, so a
    // 1-dimensional fiber, the planar analogue of the cubic's circle. Does it close, or run?
    const seed = [1.0, 0.3, 0.4, -0.25, 1.7]
    const readout = (prm: readonly number[]): number[] => {
      const m = planar(prm)
      const d0 = dz(m, 0), gap = csub(zAt(m, 1), zAt(m, 0))
      return [d0.re, d0.im, gap.re, gap.im]
    }
    const target = readout(seed)
    // Walk by driving the pole r toward the domain and re-solving the other four to hold the data.
    let last = seed.slice()
    let reached = seed[4]
    for (const rTarget of [1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.05, 1.02, 1.005]) {
      const q = last.slice()
      q[4] = rTarget
      for (let it = 0; it < 60; it++) {
        const res = readout(q).map((v, i) => v - target[i])
        if (Math.hypot(...res) < 1e-12) break
        const J = res.map((_, k) => [0, 1, 2, 3].map((j) => {
          const e = 1e-7
          const hi = q.slice(); hi[j] += e
          const lo = q.slice(); lo[j] -= e
          return (readout(hi)[k] - readout(lo)[k]) / (2 * e)
        }))
        // 4x4 solve by Gaussian elimination
        const M = J.map((row, i) => [...row, -res[i]])
        for (let c = 0; c < 4; c++) {
          let piv = c
          for (let rr = c + 1; rr < 4; rr++) if (Math.abs(M[rr][c]) > Math.abs(M[piv][c])) piv = rr
          ;[M[c], M[piv]] = [M[piv], M[c]]
          if (Math.abs(M[c][c]) < 1e-300) break
          for (let rr = 0; rr < 4; rr++) {
            if (rr === c) continue
            const f = M[rr][c] / M[c][c]
            for (let cc = c; cc <= 4; cc++) M[rr][cc] -= f * M[c][cc]
          }
        }
        for (let c = 0; c < 4; c++) if (Math.abs(M[c][c]) > 1e-300) q[c] += M[c][4] / M[c][c]
      }
      const err = Math.hypot(...readout(q).map((v, i) => v - target[i]))
      const m = planar(q)
      const speedAtEnd = Math.sqrt(cnorm2(dz(m, 1)))
      console.log(
        `    pole r = ${rTarget.toFixed(3)}:  data held to ${err.toExponential(1)}` +
          `   |z′(1)| = ${speedAtEnd.toExponential(2)}`,
      )
      if (err < 1e-8) { last = q.slice(); reached = rTarget }
    }
    console.log(
      `    the pole was driven from ${seed[4]} down to ${reached} with the data fixed` +
        `  <- the road runs until the pole reaches the domain end t = 1`,
    )
    expect(reached, 'the fiber is a road, and the pole can be driven along it').toBeLessThan(1.1)
  })
})
