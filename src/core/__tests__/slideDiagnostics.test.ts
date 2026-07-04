import { describe, it, expect } from 'vitest'
import { slide, rational, type WeightedCP } from '../index'

// The F11 stall forensics, as an opt-in instrument on slide() (task #9).
// Pins that the two validated alarms actually fire on the KNOWN dead tick
// (F9 drag, primal-dual — unchanged by the E10 ipopt fixes): tick 9's solver
// step violates the true bound, the Law-2 guard collapses to α≈0, the knife-
// edge coefficients are identified, and the returned point is provably
// non-stationary along the free translation direction (D ≪ 0). And that a
// clean solve reports a clean bill (α = 1, no knife edge).

const DEGREE = 3
const KNOTS = [0, 0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1, 1]
const X0 = [-152, -180, -263, -152, 20, 180, 207]
const Y0 = [17, -79, -184, -235, -212, -278, -346]
const W0 = [1, 0.9, 1.1, 1, 0.95, 1.05, 1]

describe('slide() diagnostics (F11 stall forensics)', () => {
  it('fires all alarms on the known dead tick; clean bill on a clean tick', () => {
    let cps: WeightedCP[] = X0.map((x, i) => rational(x, Y0[i], W0[i]))
    const k = 3, sx = X0[3], sy = Y0[3]
    const target = { x: sx + 55, y: sy + 200 }
    const recipe = { solver: 'primal-dual' as const, jacobian: 'analytic' as const, maxIterations: 20 }

    // Tick 1 with diagnostics: a clean solve.
    const t1 = slide('rational', cps, KNOTS, DEGREE, 'open', k,
      { x: sx + (target.x - sx) / 15, y: sy + (target.y - sy) / 15 },
      { ...recipe, diagnostics: true })
    expect(t1.diag).toBeDefined()
    expect(t1.diag!.guardAlpha).toBe(1)
    expect(t1.diag!.knifeEdge).toBeUndefined()
    expect(t1.diag!.rawBound).toBeLessThanOrEqual(t1.diag!.startBound)

    // Replay to the stall onset (ticks 1..8), then instrument tick 9.
    cps = X0.map((x, i) => rational(x, Y0[i], W0[i]))
    for (let s = 1; s <= 8; s++) {
      const t = s / 15
      cps = slide('rational', cps, KNOTS, DEGREE, 'open', k,
        { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }, recipe).points
    }
    const t9 = slide('rational', cps, KNOTS, DEGREE, 'open', k,
      { x: sx + (target.x - sx) * (9 / 15), y: sy + (target.y - sy) * (9 / 15) },
      { ...recipe, diagnostics: true })
    const d = t9.diag!
    expect(d, 'diagnostics missing').toBeDefined()
    // The solver left the feasible set (the F11 signature)...
    expect(d.rawBound, 'raw step should violate the bound at the dead tick').toBeGreaterThan(d.startBound)
    // ...the guard kept (almost) nothing...
    expect(d.guardAlpha, 'guard should collapse').toBeLessThan(0.05)
    // ...the knife-edge coefficients are named...
    expect(d.knifeEdge, 'knife edge should be identified').toBeDefined()
    expect(d.knifeEdge!.length).toBeGreaterThan(0)
    // ...and the result is provably non-stationary along the free translation.
    expect(d.translationDescent, 'dead tick should be non-KKT').toBeLessThan(-1)
    // The guarded result still honors Law 2, always.
    expect(d.finalBound).toBeLessThanOrEqual(d.startBound)
  }, 60000)
})
