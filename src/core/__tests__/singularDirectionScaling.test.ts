// ============================================================================
// HOW TO READ A RANK — three instruments, and the one that decides.
//
// Built because the readings we had were confounded, and because the first two disagreed.
//
// 1. THE DEPENDENT ROW, IN THE PROJECTIVE MODEL. The conformal argument for why a multiple pole
//    costs rank takes six steps and a lift. In the projective model it takes two lines. The
//    residual is F = ‖N‖² − ρ², held coefficient by coefficient; EVALUATE it at a root r of w:
//
//        ∂F(r)/∂(P,w) = 2·N(r)·∂N(r)        ∂F(r)/∂ρ = −2·ρ(r)·B(r)
//
//    At a DOUBLE root N(r) = 0 for every q, and ρ(r)² = ‖N(r)‖² = 0, so BOTH vanish: the row
//    combination Σ_m B_m(r)·J[m,:] is identically zero — a dependent row, named, with no conformal
//    model in it. At a SIMPLE pole N(r) = −q(r)w′(r) ≠ 0 and it does not vanish. And a SOFT simple
//    pole is the case that matters: there ρ(r) = 0 as well, so a ρ-based reading would call it
//    dependent — and it is not, because N(r) ≠ 0. Third time the same discriminator settles it:
//    **the vector N(r), never its square.**
//
// 2. RANK BY PERTURBATION, and ITS RESOLUTION LIMIT. Push a member off the variety by t and watch
//    which singular values move. Four signatures, and they separate four different things:
//
//        σ FLAT, nonzero      ill-conditioning — NOT a deficiency
//        σ ∝ t                zero ON the variety only — this is what δ counts
//        σ ∝ t²               zero on the variety AND to first order off it — stronger than δ
//        σ FLAT at ~1e-16     zero IDENTICALLY, at every point of the ambient space
//
//    σ_min(J₀ + tJ₁) ≈ |uᵀJ₁v|·t for a left-null u of J₀, so ∝ t is generic and ∝ t² means
//    uᵀJ₁ = 0 as well. The fourth row is not decoration: measured at a state NOWHERE NEAR the
//    variety, this Jacobian's spectrum bottoms out at 1e-4 with no zero at all, so the redundancy
//    we had been calling "structural" is not identical — it holds on the variety and to first
//    order off it. (An earlier version of this file had three rows and put "structural" on the t²
//    one. The Lean companion caught it: identical means it cannot grow at ANY order.)
//
//    AND THE TEST HAS A FLOOR, which cost a wrong conclusion here before it was found. A settled
//    state is itself an offset ε from the exact variety point, and along the degenerate direction
//    the residual grows quadratically, so ε ≈ √(residual/c). A true zero then READS ≈ ε and stays
//    flat for every t < ε — indistinguishable from a genuine small singular value. On the all-hard
//    cubic lift, residual 2.4e-12 with residual ≈ 7.6e5·t² gives ε ≈ 2e-9, the same order as the
//    4e-8 and 7e-9 it was being used to judge. **The test cannot see a zero smaller than the
//    state's own offset.** Use it only where the values in question are well above √(residual).
//
// 3. THE CONVERGENCE RATE, which decides what the perturbation test could not. Newton at a simple
//    singular root converges LINEARLY with the error ratio 1/2 (Reddien; Decker–Kelley), hence the
//    residual ratio 1/4; at a smooth point it converges quadratically. The measurement was blocked
//    while the damped step went through the normal equations, which square the condition number —
//    the Lean companion's fix is Moré's augmented QR, min ‖[J ; √λ·I]δ − [r ; 0]‖, and it works:
//
//        soft6    native, degree 6, κ 7.4e3     1e-4 → 2.0e-9 → 3.5e-15      QUADRATIC
//        soft4    native, degree 4, κ 3.2e3     1e-4 → 1.2e-7 → 1.0e-12      QUADRATIC
//        mixedMin minimal lift,     κ 2.8e2     1e-4 → 2.4e-10 → 1.0e-15     QUADRATIC
//        ALL-HARD cubic lift,       κ 1.4e8     ratios 0.29 0.22 0.22 0.25   LINEAR, step 1/2
//        DOUBLE-pole lift,          κ 4.7e12    ratios 0.26 0.25 0.26 0.28   LINEAR, step 1/2
//
//    Quadratic convergence exists in this system — three members show it — so the linear tail is a
//    property of the specimen and not of the solver.
//
// WHICH RETRACTS A CLAIM THIS FILE MADE ONE COMMIT AGO. It read the all-hard cubic lift as δ = 0
// with two genuinely small singular values. The rate says otherwise: it converges linearly at
// exactly 1/2 across two and a half decades, which is the singular signature, so 4e-8 and 7e-9 are
// ZEROS and the uniform lift of an all-hard curve is a SINGULAR point of the variety. The
// perturbation test was applied below its own resolution. What δ is there — 2 by counting, 3 if
// one per hard pole — is left open rather than guessed, because counting is the reading that just
// failed. The formula δ = Σ(m_p − 1) predicts 0 for this member and does not survive it.
//
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  analyticJacobian, layout, settleToPH, singularValues, hodographN, type Rat,
} from '../nurbsPH'
import { bernsteinToPower } from '../conformalPHHopf'
import { liftToConformal, toBernstein } from '../conformalLift'
import { definingJacobian, pack, unpack, residual, type ConformalPHCurve } from '../conformalPHCurve'
import { readPoles } from '../poleReadout'
import { randomHardRat } from '../../talks/ph-interpolation/poleLabPresets'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import { PRESETS } from '../../talks/ph-interpolation/poleLabPresets'
import type { Conformal } from '../conformal'

const rng = (seed: number) => {
  let a = seed >>> 0
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const binom = (n: number, k: number): number => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
/** The Bernstein basis of degree n at a COMPLEX parameter — poles are complex more often than not. */
const bernAt = (n: number, z: Complex): Complex[] => {
  const one: Complex = { re: 1 - z.re, im: -z.im }
  const pow = (c: Complex, k: number): Complex => {
    let acc: Complex = { re: 1, im: 0 }
    for (let i = 0; i < k; i++) acc = cmul(acc, c)
    return acc
  }
  return Array.from({ length: n + 1 }, (_, k) => {
    const v = cmul(pow(one, n - k), pow(z, k))
    return { re: binom(n, k) * v.re, im: binom(n, k) * v.im }
  })
}
/** ‖Σ_m B_m(r)·J[m,:]‖ against the scale of the terms summed. Zero means a dependent row. */
function dependentRow(rat: Rat, z: Complex, d: number): number {
  const J = analyticJacobian(rat)
  const B = bernAt(4 * d - 2, z)
  const acc: Complex[] = J[0].map(() => ({ re: 0, im: 0 }))
  let scale = 0
  J.forEach((row, m) => {
    const rowNorm = Math.hypot(...row)
    scale = Math.max(scale, cnorm(B[m]) * rowNorm)
    row.forEach((v, j) => { acc[j] = cadd(acc[j], cmul(B[m], { re: v, im: 0 })) })
  })
  return Math.hypot(...acc.map(cnorm)) / Math.max(scale, 1e-300)
}
/** |N(r)| relative to N's coefficient scale — the discriminator itself. */
function numeratorAt(rat: Rat, z: Complex, d: number): number {
  const N = hodographN(rat)
  const B = bernAt(2 * d - 1, z)
  const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
  return Math.hypot(...N.map((c) => cnorm(c.reduce<Complex>(
    (s, v, k) => cadd(s, cmul(B[k], { re: v, im: 0 })), { re: 0, im: 0 })))) / scale
}
const powerW = (rat: Rat): number[] => bernsteinToPower(rat.w)

/** A member with w PINNED to the given roots: the pole structure is a hypothesis, not an outcome. */
function memberWithDenominator(wPower: number[], d: number, seeds: readonly number[]) {
  const L = layout(d)
  const frozen = Array.from({ length: L.nW }, (_, k) => L.nP + k)
  let best: { residual: number; rat: Rat } | null = null
  for (const seed of seeds) {
    const r = rng(seed)
    const P = Array.from({ length: d + 1 }, () => [2 * r() - 1, 2 * r() - 1, 2 * r() - 1])
    const got = settleToPH({ P, w: toBernstein(wPower, d), rho: Array.from({ length: 2 * d }, () => 1) },
      d, { frozen, steps: 4000, tolerance: 1e-16 })
    if (!best || got.residual < best.residual) best = got
  }
  if (!best) throw new Error('no member')
  return best
}

const DOUBLE_W = [-6.75, 11.25, -6, 1]        // (t−1.5)²(t−3)
const SIMPLE_W = [-20.25, 24.75, -9, 1]       // (t−1.5)(t−3)(t−4.5)
const SEEDS = [101, 202, 303, 404, 505, 606, 707, 808, 909]

describe('the dependent row, in the projective model', () => {
  it('vanishes at a DOUBLE root and at nothing else — including a soft pole', () => {
    const d = 3
    const dbl = memberWithDenominator([...DOUBLE_W], d, SEEDS)
    const smp = memberWithDenominator([...SIMPLE_W], d, SEEDS)
    const at = (t: number): Complex => ({ re: t, im: 0 })

    for (const [label, got] of [['DOUBLE root at 1.5', dbl], ['SIMPLE roots 1.5, 3, 4.5', smp]] as const) {
      console.log(`    ${label}: settle residual ${got.residual.toExponential(1)},` +
        ` |N(1.5)| ${numeratorAt(got.rat, at(1.5), d).toExponential(1)},` +
        ` dependent row ${dependentRow(got.rat, at(1.5), d).toExponential(1)}`)
      expect(got.residual, `${label} is ON the variety`).toBeLessThan(1e-10)
    }
    expect(numeratorAt(dbl.rat, at(1.5), d), 'N(r) = 0 at the double root').toBeLessThan(1e-12)
    expect(dependentRow(dbl.rat, at(1.5), d), 'so that row combination is dependent').toBeLessThan(1e-8)
    expect(numeratorAt(smp.rat, at(1.5), d), 'N(r) ≠ 0 at a simple root').toBeGreaterThan(1e-2)
    expect(dependentRow(smp.rat, at(1.5), d), 'and the row is independent there').toBeGreaterThan(1e-3)

    // THE CASE THAT KILLS THE ρ-BASED READING: a soft pole has ρ(r) = 0 and N(r) ≠ 0.
    const mixed = randomHardRat(3, 9002)
    if (!mixed) throw new Error('the mixed specimen no longer converges')
    const poles = readPoles(mixed)
    const soft = poles.filter((p) => p.verdict === 'soft')
    expect(soft.length, 'the mixed cubic has two soft poles').toBe(2)
    for (const p of soft) {
      const n = numeratorAt(mixed, p.at, 3)
      const dep = dependentRow(mixed, p.at, 3)
      console.log(`    SOFT pole at ${p.at.re.toFixed(3)}${p.at.im >= 0 ? '+' : ''}${p.at.im.toFixed(3)}i:` +
        ` isotropy ${p.isotropy.toExponential(1)} (soft), |N(r)| ${n.toExponential(1)},` +
        ` dependent row ${dep.toExponential(1)} — INDEPENDENT`)
      expect(n, 'a soft pole has N(r) ≠ 0 — it is isotropic, not zero').toBeGreaterThan(1e-2)
      expect(dep, 'so it costs no row, even though ρ(r) = 0 there').toBeGreaterThan(1e-3)
    }
  }, 300_000)
})

// ---------------------------------------------------------------------------
// RANK BY PERTURBATION
// ---------------------------------------------------------------------------

const rowNormalise = (J: number[][]): number[][] =>
  J.map((r) => { const m = Math.hypot(...r); return m > 0 ? r.map((v) => v / m) : r })
const spectrumOf = (s: ConformalPHCurve): number[] => {
  const sv = singularValues(rowNormalise(definingJacobian(s)))
  return sv.map((v) => v / sv[0])
}
const relRes = (s: ConformalPHCurve): number =>
  Math.max(...residual(s).map(Math.abs)) / Math.max(...s.C.flat().map(Math.abs)) ** 2
const liftOf = (rat: Rat): ConformalPHCurve => liftToConformal(
  powerW(rat),
  [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i]))),
  bernsteinToPower(rat.rho),
).state

/** The spectrum tail at a sequence of distances t off the variety, along one fixed direction. */
function scalingProfile(s0: ConformalPHCurve, seed: number, ts: readonly number[]) {
  const x0 = pack(s0)
  const r = rng(seed)
  const u = x0.map(() => 2 * r() - 1)
  const un = Math.hypot(...u)
  const sc = Math.hypot(...x0)
  return ts.map((t) => {
    const cur = unpack(x0.map((v, j) => v + (t * sc / un) * u[j]))
    return { t, res: relRes(cur), tail: spectrumOf(cur).slice(-6) }
  })
}

describe('rank by perturbation, and where it stops working', () => {
  it('shows the four signatures, including the one that is NOT identical', () => {
    // A state nowhere near the variety: if the redundancy were identical it would show a zero here.
    const r = rng(7)
    const n = 6
    const C = Array.from({ length: n + 1 }, () => Array.from({ length: 5 }, () => 2 * r() - 1)) as unknown as Conformal[]
    const wild: ConformalPHCurve = { C, h: Array.from({ length: n }, () => 2 * r() - 1) }
    const wildTail = spectrumOf(wild)
    console.log(`    a state nowhere near the variety: residual ${relRes(wild).toExponential(1)},` +
      ` spectrum bottoms out at ${wildTail[wildTail.length - 1].toExponential(1)} — NO zero`)
    expect(relRes(wild), 'genuinely off the variety').toBeGreaterThan(1);
    expect(wildTail[wildTail.length - 1], 'so no relation here is identical').toBeGreaterThan(1e-6)

    const ctlRat = randomHardRat(3, 9004)
    if (!ctlRat) throw new Error('the control seed no longer converges')
    expect(readPoles(ctlRat).every((p) => p.verdict === 'hard'), 'all hard').toBe(true)
    const dbl = memberWithDenominator([...DOUBLE_W], 3, SEEDS)
    const TS = [0, 1e-9, 1e-8, 1e-7, 1e-6]
    const control = scalingProfile(liftOf(ctlRat), 9090, TS)
    const specimen = scalingProfile(liftOf(dbl.rat), 9090, TS)
    for (const [label, prof] of [['ALL-HARD cubic lift', control], ['DOUBLE-pole lift', specimen]] as const) {
      console.log(`    ${label}`)
      for (const row of prof) {
        console.log(`      t ${row.t.toExponential(0).padEnd(6)} residual ${row.res.toExponential(1)}` +
          `   tail ${row.tail.map((v) => v.toExponential(0)).join(' ')}`)
      }
    }
    const last = (i: number, k: number, p: typeof control): number => p[i].tail[p[i].tail.length - k]

    // The signature that IS readable here: the specimen's extra value moves by four orders under a
    // 1e-9 push, so it is a zero of the variety.
    expect(last(0, 2, specimen), 'the specimen carries an extra near-zero').toBeLessThan(1e-11)
    expect(last(1, 2, specimen) / last(0, 2, specimen), 'and it MOVES — δ ≥ 1 here').toBeGreaterThan(100)

    // The signature that is NOT readable here, and the floor that says so. The control's smallest
    // values sit at the same order as the state's own offset from the variety, so "flat" proves
    // nothing about them — see the rate test below, which finds them to be zeros.
    const offset = Math.sqrt(control[0].res / 7.6e5)
    console.log(`    control: state offset √(residual/c) ≈ ${offset.toExponential(1)},` +
      ` against values ${last(0, 3, control).toExponential(1)} and ${last(0, 2, control).toExponential(1)}` +
      ' — BELOW the test\'s resolution, so no verdict from this instrument')
    expect(last(0, 2, control) / offset, 'the control sits at the resolution floor').toBeLessThan(100)

    // The universal redundancy grows like t² — so it is not identical either, only first-order.
    const q0 = last(3, 1, control), q1 = last(4, 1, control)
    console.log(`    universal redundancy: ${q0.toExponential(1)} at t = 1e-7 →` +
      ` ${q1.toExponential(1)} at t = 1e-6 — a factor ${(q1 / q0).toExponential(0)}, so ∝ t²`)
    expect(q1 / q0, 'a decade of t multiplies it by ~100, not ~10').toBeGreaterThan(20)
  }, 300_000)
})

// ---------------------------------------------------------------------------
// THE CONVERGENCE RATE — the instrument that decides, once the step is computed properly
// ---------------------------------------------------------------------------

/** Householder QR least squares, rows ≥ cols. */
function qrSolve(A: readonly (readonly number[])[], b: readonly number[]): number[] {
  const m = A.length, n = A[0].length
  const R = A.map((row) => [...row])
  const y = [...b]
  for (let k = 0; k < n; k++) {
    let norm = 0
    for (let i = k; i < m; i++) norm += R[i][k] ** 2
    norm = Math.sqrt(norm)
    if (norm === 0) continue
    const alpha = R[k][k] > 0 ? -norm : norm
    const v = new Array<number>(m).fill(0)
    for (let i = k; i < m; i++) v[i] = R[i][k]
    v[k] -= alpha
    const vn = Math.hypot(...v)
    if (vn === 0) continue
    for (let i = k; i < m; i++) v[i] /= vn
    for (let j = k; j < n; j++) {
      let d = 0
      for (let i = k; i < m; i++) d += v[i] * R[i][j]
      for (let i = k; i < m; i++) R[i][j] -= 2 * d * v[i]
    }
    let d = 0
    for (let i = k; i < m; i++) d += v[i] * y[i]
    for (let i = k; i < m; i++) y[i] -= 2 * d * v[i]
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let acc = y[i]
    for (let j = i + 1; j < n; j++) acc -= R[i][j] * x[j]
    x[i] = R[i][i] === 0 ? 0 : acc / R[i][i]
  }
  return x
}

/**
 * The Levenberg step by AUGMENTED QR — min ‖[J ; √λ·I]δ − [r ; 0]‖, Moré's formulation.
 *
 * NOT the normal equations, and that is the whole difference: JᵀJ carries κ², so at κ = 1.4e8 every
 * λ small enough to keep the smallest direction alive is below what double precision can represent,
 * and the measurement dies. The augmented form carries κ. This is why the rate test, reported as
 * blocked one commit ago, is runnable.
 */
function lmStep(J: number[][], r: readonly number[], lambda: number): number[] {
  const n = J[0].length
  const sq = Math.sqrt(lambda)
  return qrSolve(
    [...J.map((row) => [...row]),
      ...Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? sq : 0)))],
    [...r.map((v) => -v), ...new Array<number>(n).fill(0)],
  )
}

/** Newton from a perturbation that starts at `target`, recording the residual and step sequences. */
function rateOf(s0: ConformalPHCurve, seed: number, target: number, iters = 6, lambda = 1e-20) {
  const x0 = pack(s0)
  const r = rng(seed)
  const u = x0.map(() => 2 * r() - 1)
  const un = Math.hypot(...u)
  const sc = Math.hypot(...x0)
  let lo = 1e-10, hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi)
    if (relRes(unpack(x0.map((v, k) => v + (mid * sc / un) * u[k]))) < target) lo = mid; else hi = mid
  }
  let x = x0.map((v, k) => v + (Math.sqrt(lo * hi) * sc / un) * u[k])
  const res = [relRes(unpack(x))]
  const steps: number[] = []
  for (let it = 0; it < iters; it++) {
    const st = unpack(x)
    const J = definingJacobian(st)
    const R = residual(st)
    const rowScale = J.map((row) => Math.hypot(...row) || 1)
    const A0 = J.map((row, i) => row.map((v) => v / rowScale[i]))
    const dcol = A0[0].map((_, j) => Math.hypot(...A0.map((row) => row[j])) || 1)
    const step = lmStep(A0.map((row) => row.map((v, j) => v / dcol[j])),
      R.map((v, i) => v / rowScale[i]), lambda).map((v, j) => v / dcol[j])
    const before = relRes(st)
    let h = 1, taken: number[] | null = null
    for (let cuts = 0; cuts < 25; cuts++) {
      const cand = x.map((v, j) => v + h * step[j])
      if (cand.every(Number.isFinite) && relRes(unpack(cand)) < before) { taken = cand; break }
      h /= 2
    }
    if (!taken) break
    steps.push(h * Math.hypot(...step) / sc)
    x = taken
    res.push(relRes(unpack(x)))
  }
  return { res, steps }
}
/** The tail ratios, skipping the first step — asymptotics, not the approach. */
const tailRatio = (a: number[], from: number): number => {
  const rs = a.slice(from + 1).map((v, i) => v / Math.max(a[from + i], 1e-300))
  return rs.reduce((s, v) => s + v, 0) / Math.max(rs.length, 1)
}

describe('the convergence rate, with the step by augmented QR', () => {
  it('separates the smooth members from the lifts — quadratic against linear at one half', () => {
    const ctlRat = randomHardRat(3, 9004)
    if (!ctlRat) throw new Error('control seed')
    const dbl = memberWithDenominator([...DOUBLE_W], 3, SEEDS)
    const soft6 = PRESETS.find((x) => x.id === 'soft6')?.conformal
    const soft4 = PRESETS.find((x) => x.id === 'soft4')?.conformal
    const mixMin = PRESETS.find((x) => x.id === 'mixedMin')?.conformal
    if (!soft6 || !soft4 || !mixMin) throw new Error('missing preset')

    const cases: [string, ConformalPHCurve, 'quadratic' | 'linear'][] = [
      ['soft6   native, degree 6', soft6, 'quadratic'],
      ['soft4   native, degree 4', soft4, 'quadratic'],
      ['mixedMin  minimal lift', mixMin, 'quadratic'],
      ['ALL-HARD cubic LIFT', liftOf(ctlRat), 'linear'],
      ['DOUBLE-pole LIFT', liftOf(dbl.rat), 'linear'],
    ]
    for (const [label, st, expected] of cases) {
      const sv = spectrumOf(st)
      const live = sv.filter((v) => v > 1e-13).length
      const run = rateOf(st, 77, 1e-4)
      const rr = tailRatio(run.res, 1)
      const sr = tailRatio(run.steps, 0)
      console.log(`    ${label.padEnd(26)} κ ≈ ${(1 / sv[live - 1]).toExponential(1)}` +
        `  residual ${run.res.map((v) => v.toExponential(1)).join(' → ')}`)
      console.log(`    ${''.padEnd(26)} mean tail ratio: residual ${rr.toFixed(3)}, step ${sr.toFixed(3)}` +
        `  → ${expected}`)
      if (expected === 'quadratic') {
        expect(run.res[2], `${label} reaches machine level in two steps`).toBeLessThan(1e-11)
      } else {
        expect(rr, `${label} is linear — residual ratio near 1/4`).toBeGreaterThan(0.15)
        expect(rr, `${label} is linear — residual ratio near 1/4`).toBeLessThan(0.45)
        expect(sr, `${label} halves its step — the singular signature`).toBeGreaterThan(0.35)
        expect(sr, `${label} halves its step — the singular signature`).toBeLessThan(0.7)
      }
    }
  }, 300_000)
})
