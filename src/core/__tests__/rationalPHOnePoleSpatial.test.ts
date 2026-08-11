// Pins the core module the figure draws from: PH exact, the loop closes, the dials re-solve, and the
// pole margin reports the honest limit. The figure itself holds no mathematics, so this is where the
// figure's claims live.
import { describe, it, expect } from 'vitest'
import {
  type OnePoleParams, controlStructure, curveAt, dataOf, fiberLoop, phDefect, poleMargin,
  speedAt, toMember, withDial,
} from '../rationalPHOnePoleSpatial'

const SEED: OnePoleParams = {
  b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
  b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
  lambda: 0.6,
  pole: 1.7,
}

describe('rationalPHOnePoleSpatial', () => {
  it('is exactly PH, by construction, and builds in microseconds', () => {
    const t0 = performance.now()
    let worst = 0
    for (let k = 0; k < 300; k++) {
      const m = toMember({ ...SEED, lambda: SEED.lambda + 0.004 * k, pole: 1.7 + 0.001 * k })
      worst = Math.max(worst, phDefect(m), m.consistency)
    }
    const ms = (performance.now() - t0) / 300
    console.log(`    300 members: ${ms.toFixed(3)} ms each, worst PH defect ${worst.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-9)
  })

  it('the control structure is a genuine rational Bezier (weights vary, no pole in [0,1])', () => {
    const { points, weights } = controlStructure(toMember(SEED))
    const spread = Math.max(...weights) / Math.min(...weights)
    console.log(
      `    ${points.length} control points, weights ${weights.map((w) => w.toFixed(2)).join(', ')}` +
        `  (ratio ${spread.toFixed(2)})`,
    )
    expect(points).toHaveLength(5)
    expect(Math.min(...weights), 'no sign change, so no pole in the domain').toBeGreaterThan(0)
    expect(spread, 'genuinely rational — the weights are not all equal').toBeGreaterThan(1.05)
  })

  it('the fiber loop closes, and the shape varies around it', () => {
    const loop = fiberLoop(SEED, { steps: 96, stride: 0.02 })
    const sig = (q: OnePoleParams) => curveAt(toMember(q), 0.5)
    const start = sig(loop[0]), end = sig(loop[loop.length - 1])
    const gap = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z)
    const mids = loop.map(sig)
    const spread = Math.max(...mids.map((v) => Math.hypot(v.x - start.x, v.y - start.y, v.z - start.z)))
    console.log(
      `    ${loop.length} samples; midpoint wandered ${spread.toFixed(3)} and returned to ${gap.toExponential(1)}`,
    )
    expect(loop.length, 'the walk got somewhere').toBeGreaterThan(40)
    expect(spread, 'the curve really changes around the loop').toBeGreaterThan(0.05)
    expect(gap / Math.max(spread, 1e-9), 'and it closes').toBeLessThan(0.1)
  }, 120_000)

  it('both dials re-solve the same data, and the pole margin names the limit', () => {
    const target = dataOf(toMember(SEED))
    for (const lambda of [0.2, 1.4, -0.5]) {
      const q = withDial(SEED, target, { lambda })
      expect(q, `twist ${lambda} re-solves`).not.toBeNull()
      const m = toMember(q as OnePoleParams)
      expect(phDefect(m), 'and stays exactly PH').toBeLessThan(1e-9)
    }
    const margins: string[] = []
    for (const pole of [1.5, 1.2, 1.05, 1.01]) {
      const q = withDial(SEED, target, { pole })
      if (!q) { margins.push(`${pole}: no`); continue }
      const m = toMember(q)
      margins.push(`${pole} → margin ${poleMargin(q).toFixed(3)}, |c'(1)| ${speedAt(m, 1).toFixed(1)}`)
      expect(phDefect(m), 'PH holds all the way to the limit').toBeLessThan(1e-9)
    }
    console.log(`    pole dial: ${margins.join('; ')}`)
    expect(poleMargin({ ...SEED, pole: 1.01 })).toBeCloseTo(0.01, 6)
  }, 120_000)
})
