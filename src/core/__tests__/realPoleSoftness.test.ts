// ============================================================================
// A GENUINE REAL POLE CAN BE SOFT — if it is not simple. The guard on POLE_ALGEBRA §6.
//
// §6 of docs/POLE_ALGEBRA.md first read "every GENUINE real pole is HARD", with no hypothesis. It
// is false, and the Lean companion produced the counterexample. This file is here because it is
// the statement that was wrong, and a doc without a guard drifts back.
//
// THE MECHANISM, which §2 of that document already contained. At a real pole r with q(r) ≠ 0 and
// mult_r(W) = m, we have mult_r(q′W) ≥ m while mult_r(qW′) = m−1 exactly, so
//
//     mult_r(N) = m − 1        hence   N(r) = 0  ⟺  m ≥ 2
//
// and N(r) is REAL, so ⟨N(r),N(r)⟩ = |N(r)|². Therefore at a genuine real pole
//
//     soft  ⟺  mult_r(W) ≥ 2
//
// A multiple real pole is soft with NO condition on q at all. The definition of softness carries
// information at a simple pole and stops carrying it at a multiple one — which is exactly why §7
// of that document can hide a hard pole on the non-reduced locus.
//
// AND IT BREAKS §4's CHAIN TOO. Every pole of this curve is soft, and yet W ∤ ρ, because ρ
// vanishes to first order where W vanishes to second. So "all soft ⟺ W ∣ ρ ⟺ conformal" needs
// the squarefree hypothesis it is stated under, and the conclusion must carry it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinToPower } from '../conformalPHHopf'
import { type Rat, hodographN, phRelativeResidual } from '../nurbsPH'

const binom = (m: number, k: number): number => {
  if (k < 0 || k > m) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (m - i)) / (i + 1)
  return c
}
/** Power basis to Bernstein of degree n. */
const toBern = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) acc += (binom(k, j) / binom(n, j)) * a[j]
    return acc
  })
const evalPow = (p: readonly number[], t: number): number => p.reduceRight((s, c) => s * t + c, 0)

/** x(t) = ( 1/(t+1)², 0, 0 ) — a rational Bézier quadratic with weights 1, 2, 4. */
function doublePoleWitness(): Rat {
  const w = toBern([1, 2, 1], 2)                     // W = (t+1)²
  const q = [toBern([1], 2), toBern([0], 2), toBern([0], 2)]
  return {
    P: Array.from({ length: 3 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w,
    rho: toBern([2, 2], 3),                          // ρ = 2(t+1)
  }
}

describe('POLE_ALGEBRA §6 — a genuine real pole is hard only when it is SIMPLE', () => {
  const R = -1

  it('the witness is a real PH curve, and an unremarkable one', () => {
    const rat = doublePoleWitness()
    console.log(`    weights ${rat.w.join(', ')} — all positive, so W > 0 on [0,1]` +
      ` and the pole sits at t = ${R}, outside it`)
    console.log(`    PH residual ‖N‖² − ρ² = ${phRelativeResidual(rat).toExponential(1)}`)
    expect(phRelativeResidual(rat), 'it satisfies the projective PH equation exactly').toBe(0)
    expect(new Set(rat.w.map(Math.sign)).size, 'positive weights').toBe(1)
  })

  it('the pole is GENUINE — the numerator does not cancel', () => {
    const rat = doublePoleWitness()
    const W = bernsteinToPower(rat.w)
    const q = [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i])))
    const qAt = q.map((c) => evalPow(c, R))
    console.log(`    W(${R}) = ${evalPow(W, R).toExponential(1)},` +
      `  q(${R}) = (${qAt.map((v) => v.toFixed(3)).join(', ')})`)
    expect(Math.abs(evalPow(W, R)), 'W vanishes').toBeLessThan(1e-14)
    expect(Math.hypot(...qAt), 'and q does NOT — so the fraction does not reduce').toBeGreaterThan(0.5)
  })

  it('and it is SOFT, because the root is double: N(r) = 0 whatever q does', () => {
    const rat = doublePoleWitness()
    const N = hodographN(rat).map((c) => bernsteinToPower(c))
    const nAt = N.map((c) => evalPow(c, R))
    const rhoAt = evalPow(bernsteinToPower(rat.rho), R)
    console.log(`    N(${R}) = (${nAt.map((v) => v.toExponential(1)).join(', ')}),` +
      `  ρ(${R}) = ${rhoAt.toExponential(1)}`)
    expect(Math.hypot(...nAt), 'the hodograph numerator vanishes at the pole').toBeLessThan(1e-14)
    // and that is softness by the definition the document uses
    const iso = nAt.reduce((s, v) => s + v * v, 0)
    expect(Math.abs(iso), '⟨N(r),N(r)⟩ = 0 — soft, at a REAL pole').toBeLessThan(1e-28)
  })

  it('so §4’s chain needs its hypothesis: all poles soft, yet W does NOT divide ρ', () => {
    const rat = doublePoleWitness()
    const W = bernsteinToPower(rat.w)
    const rho = bernsteinToPower(rat.rho)
    // long division of ρ by W, remainder relative to ρ
    const a = [...rho]
    const n = 2
    for (let k = a.length - 1; k >= n; k--) {
      const c = a[k] / W[n]
      for (let j = 0; j <= n; j++) a[k - n + j] -= c * W[j]
    }
    const remainder = Math.max(...a.slice(0, n).map(Math.abs)) / Math.max(...rho.map(Math.abs))
    console.log(`    ρ ÷ W remainder ${remainder.toExponential(1)}` +
      `  — (t+1)² does not divide 2(t+1)`)
    expect(remainder, 'W does NOT divide ρ, though every pole is soft').toBeGreaterThan(0.1)
    // and it is not conformal either: that would need W ∣ ‖q‖², i.e. (t+1)² ∣ 1
    console.log('    nor is it conformal: W ∣ ‖q‖² would need (t+1)² ∣ 1')
  })
})
