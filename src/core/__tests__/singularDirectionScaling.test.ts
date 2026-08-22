// ============================================================================
// HOW TO READ A RANK WITHOUT A THRESHOLD — and the projective form of the dependent row.
//
// Two instruments, built because the ones we had were confounded.
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
// 2. RANK BY PERTURBATION, not by threshold. Push a member off the variety by t and watch which
//    singular values move. Three signatures, and they separate three different things:
//
//        σ FLAT in t          a genuine small singular value — ill-conditioning, NOT deficiency
//        σ ∝ t                zero ON the variety only — this is what δ counts
//        σ ∝ t² (or 1e-16)    zero EVERYWHERE — the universal redundancy, structural
//
//    This matters because a settled state is never exactly on the variety, so every "count the
//    values below 1e-12" reading is a guess about what the accuracy floor hides. The scaling test
//    needs no floor at all, and it CONFIRMS both earlier readings: the all-hard cubic lift is δ = 0
//    with two genuinely small (1e-8) singular values, and the double-pole lift is δ = 1.
//
// WHY THE CONVERGENCE-RATE TEST IS NOT HERE. It was the measurement asked for, and it is blocked in
// double precision at these degrees: the δ = 0 control has condition number 1.4e8, so any Levenberg
// λ small enough to preserve its quadratic convergence is below what the normal equations can carry
// (they square the condition number), while the exact pseudo-inverse chases the 1e-8 direction and
// overshoots a quartic residual. Every variant we ran made the CONTROL converge linearly at ratio
// 1/2 — the singular signature — which is a statement about the regularisation, not about the
// curve. Reported as blocked rather than as a result. The perturbation test answers the underlying
// question (is a double pole a singular point of the variety?) directly, and with no solver in it.
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

describe('rank by perturbation, with no threshold in it', () => {
  it('separates a genuine small singular value from a zero, in both specimens', () => {
    const ctlRat = randomHardRat(3, 9004)
    if (!ctlRat) throw new Error('the control seed no longer converges')
    expect(readPoles(ctlRat).every((p) => p.verdict === 'hard'), 'the control is all hard').toBe(true)
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

    // THE CONTROL: its two smallest LIVE values are flat in t — genuine, not zeros.
    const cAt = (i: number, k: number): number => control[i].tail[control[i].tail.length - k]
    console.log(`    control: smallest live σ ${cAt(0, 2).toExponential(1)} at t = 0,` +
      ` ${cAt(2, 2).toExponential(1)} at t = 1e-8 — FLAT, so genuine`)
    expect(cAt(0, 2), 'the control has a small live singular value').toBeLessThan(1e-7)
    expect(cAt(2, 2) / cAt(0, 2), 'and it does NOT move with the perturbation').toBeLessThan(3)
    expect(cAt(0, 1), 'below it sits ONE zero — the universal redundancy').toBeLessThan(1e-15)

    // THE SPECIMEN: one more value, and it DOES move — a zero on the variety only.
    const sAt = (i: number, k: number): number => specimen[i].tail[specimen[i].tail.length - k]
    console.log(`    specimen: the extra σ ${sAt(0, 2).toExponential(1)} at t = 0 →` +
      ` ${sAt(1, 2).toExponential(1)} at t = 1e-9 — MOVES, so it is a zero of the variety`)
    expect(sAt(0, 2), 'the specimen carries an extra near-zero').toBeLessThan(1e-11)
    expect(sAt(1, 2) / sAt(0, 2), 'and it grows with the perturbation — δ = 1').toBeGreaterThan(100)
    expect(sAt(0, 1), 'with the universal redundancy still below it').toBeLessThan(1e-15)
  }, 300_000)
})
