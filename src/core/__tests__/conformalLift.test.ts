// ============================================================================
// THE MINIMAL LIFT — same curve, lower degree, and the over-doubling term gone.
//
// δ = max(0, |deg q − deg w| − 1) + deg gcd(w, ‖q‖²). The second term is self-inflicted: doubling
// every pole overpays at the soft ones, where (t−r) already divides ‖q‖² and so divides all three
// components at once. Dividing it out gives a genuine member of lower degree at the generic rank.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinToPower } from '../conformalPHHopf'
import { definingJacobian, degreeOf, residual } from '../conformalPHCurve'
import { liftToConformal, normSquared, sharedFactor } from '../conformalLift'
import { singularValues } from '../nurbsPH'
import { readPoles } from '../poleReadout'
import { PRESETS } from '../../talks/ph-interpolation/poleLabPresets'

const trueDeg = (p: readonly number[], rel = 1e-11): number => {
  const s = Math.max(...p.map(Math.abs), 1e-300)
  let n = p.length - 1
  while (n > 0 && Math.abs(p[n]) < rel * s) n--
  return n
}
function rankOf(s: Parameters<typeof definingJacobian>[0]): { live: number; gap: number } {
  const sv = singularValues(definingJacobian(s).map((r) => {
    const m = Math.hypot(...r)
    return m > 0 ? r.map((v) => v / m) : r
  }))
  const rel = sv.map((v) => v / sv[0])
  let gap = 0
  let at = -1
  for (let i = 1; i < rel.length; i++) {
    const g = rel[i - 1] / Math.max(rel[i], 1e-300)
    if (g > gap) { gap = g; at = i }
  }
  return { live: at, gap }
}
const partsOf = (p: (typeof PRESETS)[number]) => {
  const rat = p.rat()
  return {
    w: bernsteinToPower(rat.w),
    q: [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((pt, k) => rat.w[k] * pt[i]))),
    rho: bernsteinToPower(rat.rho),
    verdicts: readPoles(rat).map((x) => x.verdict),
  }
}

describe('the minimal conformal lift', () => {
  it('divides out exactly the SOFT poles, and nothing else', () => {
    for (const p of PRESETS) {
      const { w, q, verdicts } = partsOf(p)
      const g = sharedFactor(w, q)
      const soft = verdicts.filter((v) => v === 'soft').length
      console.log(`    ${p.label.padEnd(38)} poles ${verdicts.map((v) => v[0]).join('')}` +
        `  gcd(w,‖q‖²) degree ${trueDeg(g)}  (soft poles: ${soft})`)
      expect(trueDeg(g), `${p.id}: one factor per soft pole`).toBe(soft)
      // and the factor really divides ‖q‖²
      if (trueDeg(g) > 0) {
        const nq = normSquared(q)
        const lifted = liftToConformal(w, q, partsOf(p).rho)
        expect(lifted.remainder, `${p.id}: the division is exact`).toBeLessThan(1e-8)
        expect(nq.length).toBeGreaterThan(trueDeg(g))
      }
    }
  }, 300_000)

  it('the MIXED specimen: conformal degree 6 → 4, and δ = 2 → 0', () => {
    const p = PRESETS.find((x) => x.id === 'mixed3')
    if (!p) throw new Error('missing specimen')
    const { w, q, rho, verdicts } = partsOf(p)
    expect(verdicts.filter((v) => v === 'soft').length, 'two soft').toBe(2)
    expect(verdicts.filter((v) => v === 'hard').length, 'and one hard').toBe(1)

    const uniform = liftToConformal(w, q, rho, { uniform: true })
    const minimal = liftToConformal(w, q, rho)
    for (const [label, L] of [['uniform', uniform], ['MINIMAL', minimal]] as const) {
      const n = degreeOf(L.state)
      const { live, gap } = rankOf(L.state)
      const res = Math.max(...residual(L.state).map(Math.abs)) /
        Math.max(...L.state.C.flat().map(Math.abs)) ** 2
      console.log(`      ${label}: conformal degree ${n}, divided ${L.divided},` +
        ` rank ${live} of ${4 * n}, δ = ${4 * n - 1 - live},` +
        ` gap ${gap.toExponential(0)}, residual ${res.toExponential(0)}`)
      expect(res, `${label} is ON the variety`).toBeLessThan(1e-9)
    }
    expect(uniform.degree, 'the uniform lift doubles the degree').toBe(6)
    expect(minimal.degree, 'the minimal one stops at 4').toBe(4)
    expect(minimal.divided, 'having divided out the soft conjugate pair').toBe(2)
    expect(4 * 6 - 1 - rankOf(uniform.state).live, 'uniform is singular').toBe(2)
    expect(4 * 4 - 1 - rankOf(minimal.state).live, 'MINIMAL is at the generic rank').toBe(0)
  }, 300_000)

  it('an ALL-SOFT curve lifts to ITSELF — the other face of "all soft ⟺ w ∣ ρ"', () => {
    for (const id of ['soft4', 'soft6']) {
      const p = PRESETS.find((x) => x.id === id)
      if (!p) continue
      const { w, q, rho } = partsOf(p)
      const minimal = liftToConformal(w, q, rho)
      const uniform = liftToConformal(w, q, rho, { uniform: true })
      console.log(`    ${p.label}: source degree ${trueDeg(w)},` +
        ` uniform lift ${uniform.degree}, MINIMAL ${minimal.degree}` +
        ` (divided ${minimal.divided})`)
      expect(minimal.degree, 'the minimal lift is the curve itself').toBe(trueDeg(w))
      expect(minimal.divided, 'every pole was soft, so the whole denominator came out').toBe(trueDeg(w))
      expect(4 * minimal.degree - 1 - rankOf(minimal.state).live, 'and it is smooth').toBe(0)
    }
  }, 300_000)

  it('a curve with NO soft pole lifts uniformly — the minimal lift changes nothing', () => {
    // and this is why the λ-chart specimen is unaffected: its δ is pure degree shortfall
    const p = PRESETS.find((x) => x.id === 'hard4')
    if (!p) throw new Error('missing specimen')
    const { w, q, rho } = partsOf(p)
    const minimal = liftToConformal(w, q, rho)
    const uniform = liftToConformal(w, q, rho, { uniform: true })
    console.log(`    ${p.label}: no soft pole, so gcd = 1 and both lifts land at` +
      ` conformal degree ${minimal.degree} (uniform ${uniform.degree})`)
    expect(minimal.divided, 'nothing to divide out').toBe(0)
    expect(minimal.degree).toBe(uniform.degree)
  }, 300_000)
})
