// ============================================================================
// TARGETED DEFLATION — it helps, it is not enough, and the control says why.
//
// A singular point costs Newton its quadratic convergence. The generic repair (Leykin–Verschelde–
// Zhao) discovers the null direction by doubling the unknowns; here we can skip that, because §13
// NAMES the degeneracy: at a pole of multiplicity e the speed numerator must vanish to order e−2,
//
//     h(r) = h′(r) = … = h^(e−2)(r) = 0          e − 1 linear conditions
//
// with r already known as a root of W. Confirmed before using it — on the double-pole lift
// h(1.5) = 1.3e-10 against 2.1e+1 for the all-hard control at the same parameter.
//
// WHAT THE MEASUREMENT SAYS, at a starting residual of 1e-4:
//
//     double-pole lift, no deflation        ratios  residual 0.40, step 0.49    linear at ½
//     double-pole lift, + h(1.5) = 0        ratios  residual 0.21, step 0.43    still linear
//     double-pole lift, + h AND h′          ratios  residual 0.54, step 1.23    WORSE
//     all-hard control, + h(1.5) = 0        1e-4 → 7.9e-5 → 7.6e-5 → stalls     WRECKED
//
// Three things, and the third is the one to keep.
//
//   1. Deflation HELPS. The first step improves fourfold and the whole sequence sits a decade
//      lower. So the condition is right and it is doing work.
//   2. It does NOT restore quadratic convergence. The step ratio stays at ½.
//   3. It DESTROYS a specimen that was not degenerate. At the control t = 1.5 is a simple pole and
//      h(1.5) ≠ 0, so the extra equation is inconsistent and the solve stalls at 7.9e-5. Deflation
//      is not a setting to leave on: it restricts the solve to the sublocus {W has a repeated root
//      at r}, which is correct exactly while the degeneracy is intended and wrong the moment the
//      drag should leave it. Anything built on this has to switch it with the degeneracy.
//
// WHY ONE CONDITION IS NOT ENOUGH, and it is not the count. The double-pole lift has MORE THAN ONE
// degeneracy: the all-hard cubic lift, whose poles are all simple and which has no multiple pole
// anywhere, is itself linear at ½ (singularDirectionScaling.test.ts). Deflating the multiplicity
// removes the source we can name and leaves the one we cannot. Which puts the open question of
// §16 — is the singular locus the discriminant of W? — directly in the path: you cannot deflate a
// degeneracy you have not identified.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  definingJacobian, residual, pack, unpack, degreeOf, unknownCount, type ConformalPHCurve,
} from '../conformalPHCurve'
import { settleToPH, layout, type Rat } from '../nurbsPH'
import { bernsteinToPower } from '../conformalPHHopf'
import { liftToConformal, toBernstein } from '../conformalLift'
import { randomHardRat } from '../../talks/ph-rational/poleLabPresets'
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
const bernAt = (n: number, t: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => binom(n, k) * (1 - t) ** (n - k) * t ** k)
const relRes = (s: ConformalPHCurve): number =>
  Math.max(...residual(s).map(Math.abs)) / Math.max(...s.C.flat().map(Math.abs)) ** 2
const liftOf = (rat: Rat): ConformalPHCurve => liftToConformal(
  bernsteinToPower(rat.w),
  [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i]))),
  bernsteinToPower(rat.rho),
).state


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
const lmStep = (J: number[][], r: readonly number[], lambda = 1e-20): number[] => {
  const n = J[0].length
  const sq = Math.sqrt(lambda)
  return qrSolve(
    [...J.map((row) => [...row]),
      ...Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? sq : 0)))],
    [...r.map((v) => -v), ...new Array<number>(n).fill(0)])
}

/**
 * DEFLATION conditions for a pole of multiplicity e at parameter r: h vanishes there to order e−2.
 * §13 gives the first (h(r) = 0); the Lean companion's count gives the rest.
 */
function deflationRows(s: ConformalPHCurve, r: number, e: number): { value: number; row: number[] }[] {
  const n = degreeOf(s)
  const cols = unknownCount(n)
  const hOff = 5 * (n + 1)
  const out: { value: number; row: number[] }[] = []
  // h as a power-basis polynomial, so derivatives at r are easy
  let hp = bernsteinToPower([...s.h])
  for (let k = 0; k <= e - 2; k++) {
    // the k-th derivative of h at r, and its gradient in the Bernstein coefficients
    const row = new Array<number>(cols).fill(0)
    for (let j = 0; j < s.h.length; j++) {
      const unit = new Array<number>(s.h.length).fill(0)
      unit[j] = 1
      let up = bernsteinToPower(unit)
      for (let d = 0; d < k; d++) up = up.slice(1).map((v, i2) => v * (i2 + 1))
      row[hOff + j] = up.reduceRight((acc, c) => acc * r + c, 0)
    }
    out.push({ value: hp.reduceRight((acc, c) => acc * r + c, 0), row })
    hp = hp.slice(1).map((v, i2) => v * (i2 + 1))
  }
  return out
}

const DOUBLE_W = [-6.75, 11.25, -6, 1]     // (t−1.5)²(t−3)
const SEEDS = [101, 202, 303, 404, 505, 606, 707, 808, 909]
function memberWithDenominator(wPower: number[], d: number) {
  const L = layout(d)
  const frozen = Array.from({ length: L.nW }, (_, k) => L.nP + k)
  let best: { residual: number; rat: Rat } | null = null
  for (const seed of SEEDS) {
    const r = rng(seed)
    const P = Array.from({ length: d + 1 }, () => [2 * r() - 1, 2 * r() - 1, 2 * r() - 1])
    const got = settleToPH({ P, w: toBernstein(wPower, d), rho: Array.from({ length: 2 * d }, () => 1) },
      d, { frozen, steps: 4000, tolerance: 1e-16 })
    if (!best || got.residual < best.residual) best = got
  }
  if (!best) throw new Error('no member')
  return best
}


/** Newton with `e − 1` deflation conditions at r; e = 0 means none. */
function rate(s0: ConformalPHCurve, seed: number, target: number, r: number, e: number, iters = 7) {
  const x0 = pack(s0)
  const rr = rng(seed)
  const u = x0.map(() => 2 * rr() - 1)
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
    const J = definingJacobian(st).map((row) => [...row])
    const R = [...residual(st)]
    if (e >= 2) for (const d of deflationRows(st, r, e)) { J.push(d.row); R.push(d.value) }
    const rowScale = J.map((row) => Math.hypot(...row) || 1)
    const A0 = J.map((row, i) => row.map((v) => v / rowScale[i]))
    const dcol = A0[0].map((_, j) => Math.hypot(...A0.map((row) => row[j])) || 1)
    const step = lmStep(A0.map((row) => row.map((v, j) => v / dcol[j])),
      R.map((v, i) => v / rowScale[i])).map((v, j) => v / dcol[j])
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
  const mean = (a: number[], from: number): number => {
    const rs = a.slice(from + 1).map((v, i) => v / Math.max(a[from + i], 1e-300))
    return rs.reduce((s, v) => s + v, 0) / Math.max(rs.length, 1)
  }
  return { res, resRatio: mean(res, 1), stepRatio: mean(steps, 0) }
}

describe('deflating a multiple pole', () => {
  it('confirms h(r) = 0 before using it', () => {
    const dbl = liftOf(memberWithDenominator([...DOUBLE_W], 3).rat)
    const ctl = liftOf(randomHardRat(3, 9004)!)
    const at = (s: ConformalPHCurve, r: number): number => {
      const n = degreeOf(s)
      const B = bernAt(n - 1, r)
      return Math.abs(s.h.reduce((acc, v, k) => acc + v * B[k], 0)) / Math.max(...s.h.map(Math.abs))
    }
    console.log(`    double-pole lift: |h(1.5)| relative ${at(dbl, 1.5).toExponential(1)}` +
      `   all-hard control: ${at(ctl, 1.5).toExponential(1)}`)
    expect(at(dbl, 1.5), 'a multiple pole forces h to vanish there').toBeLessThan(1e-8)
    expect(at(ctl, 1.5), 'a simple pole does not').toBeGreaterThan(1)
  }, 300_000)

  it('helps, does not restore quadratic, and must never be left switched on', () => {
    const dbl = liftOf(memberWithDenominator([...DOUBLE_W], 3).rat)
    const ctl = liftOf(randomHardRat(3, 9004)!)
    const plain = rate(dbl, 77, 1e-4, 1.5, 0)
    const one = rate(dbl, 77, 1e-4, 1.5, 2)
    const two = rate(dbl, 77, 1e-4, 1.5, 3)
    const wrong = rate(ctl, 77, 1e-4, 1.5, 2)
    for (const [label, g] of [['no deflation', plain], ['+ h(1.5) = 0', one],
      ['+ h AND h′ (one too many)', two], ['CONTROL + h(1.5) = 0', wrong]] as const) {
      console.log(`    ${label.padEnd(26)} ${g.res.map((v) => v.toExponential(1)).join(' → ')}`)
      console.log(`    ${''.padEnd(26)} residual ratio ${g.resRatio.toFixed(3)}, step ratio ${g.stepRatio.toFixed(3)}`)
    }
    // 1. it helps
    expect(one.res[1], 'the first step improves severalfold').toBeLessThan(0.5 * plain.res[1])
    // 2. and is not enough — still halving
    expect(one.stepRatio, 'the step still halves: another degeneracy is left').toBeGreaterThan(0.3)
    expect(one.stepRatio, 'the step still halves: another degeneracy is left').toBeLessThan(0.7)
    // 3. one condition too many is worse than none
    expect(two.resRatio, 'over-deflating costs more than it buys').toBeGreaterThan(plain.resRatio)
    // 4. and on a specimen with nothing to deflate it is destructive
    expect(wrong.resRatio, 'the control stalls: the extra equation is inconsistent there')
      .toBeGreaterThan(0.9)
  }, 300_000)
})
