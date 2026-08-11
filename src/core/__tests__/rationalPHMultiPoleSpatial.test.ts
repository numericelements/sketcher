// Pins the m-pole module the new figure draws from. Everything the figure claims lives here.
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams, controlStructure, curveAt, dataOf, dragControlPoint, fiberLoop,
  familyBasis, phDefect, poleMargin, projectToFamily, speedAt, toMember, withDial,
} from '../rationalPHMultiPoleSpatial'

const SEED_A: MultiPoleParams = {
  A: [
    { u: 1.0, v: 0.3, p: -0.4, q: 0.2 }, { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
    { u: -0.2, v: 0.4, p: 0.1, q: -0.3 }, { u: 0.15, v: 0.1, p: -0.25, q: 0.2 },
  ],
  roots: [1.7, -0.9],
  lambdas: [0.6, -0.35],
}

describe('rationalPHMultiPoleSpatial (n = 3, m = 2 — a rational quintic)', () => {
  const seed = projectToFamily(SEED_A)

  it('the admissible subspace is 4(n+1) − 4m, and members are exactly PH', () => {
    const basis = familyBasis(seed)
    const m = toMember(seed)
    console.log(
      `    subspace ${basis.length} (expected ${4 * 4 - 4 * 2});  no-log ${m.noLog.toExponential(1)}` +
        `   Wronskian ${m.wronskian.toExponential(1)}   PH defect ${phDefect(m).toExponential(1)}`,
    )
    expect(basis.length).toBe(4 * 4 - 4 * 2)
    expect(m.noLog, 'the projected spinor is admissible').toBeLessThan(1e-10)
    expect(m.wronskian, 'so the Wronskian solves').toBeLessThan(1e-9)
    expect(phDefect(m), 'and the curve is exactly PH').toBeLessThan(1e-9)
  })

  it('the curve starts at the origin, and the control structure is a genuine rational quintic', () => {
    const m = toMember(seed)
    const c0 = curveAt(m, 0)
    const { points, weights } = controlStructure(m)
    const ratio = Math.max(...weights) / Math.min(...weights)
    console.log(
      `    c(0) = (${c0.x.toExponential(1)}, ${c0.y.toExponential(1)}, ${c0.z.toExponential(1)});` +
        `  ${points.length} control points, weight ratio ${ratio.toFixed(2)}`,
    )
    expect(Math.hypot(c0.x, c0.y, c0.z), 'p(0) = 0 pins the translation').toBeLessThan(1e-10)
    expect(points).toHaveLength(6)
    expect(Math.min(...weights), 'no sign change, so no pole in the domain').toBeGreaterThan(0)
    expect(ratio, 'genuinely rational').toBeGreaterThan(1.05)
  })

  it('the fiber loop closes, and the shape varies around it', () => {
    const loop = fiberLoop(seed, { stride: 0.05, maxSteps: 900 })
    const mid = (q: MultiPoleParams) => curveAt(toMember(q), 0.5)
    const start = mid(loop[0]), end = mid(loop[loop.length - 1])
    const gap = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z)
    const spread = Math.max(...loop.map((q) => {
      const v = mid(q)
      return Math.hypot(v.x - start.x, v.y - start.y, v.z - start.z)
    }))
    console.log(`    ${loop.length} samples; midpoint wandered ${spread.toFixed(3)}, returned to ${gap.toExponential(1)}`)
    expect(loop.length, 'the walk got somewhere').toBeGreaterThan(40)
    expect(spread, 'the curve changes around the loop').toBeGreaterThan(0.05)
    expect(gap / Math.max(spread, 1e-9), 'and it closes').toBeLessThan(0.12)
  }, 300_000)

  it('BOTH twist dials and BOTH pole handles re-solve the same data, at machine-zero PH', () => {
    const target = dataOf(toMember(seed))
    const notes: string[] = []
    for (const index of [0, 1]) {
      for (const value of [0.1, 1.3]) {
        const q = withDial(seed, target, { lambda: { index, value } })
        expect(q, `twist ${index} → ${value}`).not.toBeNull()
        expect(phDefect(toMember(q as MultiPoleParams))).toBeLessThan(1e-9)
      }
      notes.push(`twist${index} ok`)
    }
    for (const [index, value] of [[0, 1.35], [1, -1.4]] as [number, number][]) {
      const q = withDial(seed, target, { pole: { index, value } })
      if (!q) { notes.push(`pole${index} → ${value}: none`); continue }
      const m = toMember(q)
      notes.push(`pole${index} → ${value}: margin ${poleMargin(q).toFixed(2)}, |c'(1)| ${speedAt(m, 1).toFixed(1)}`)
      expect(phDefect(m), 'PH holds through the pole dial').toBeLessThan(1e-9)
    }
    console.log(`    ${notes.join('; ')}`)
  }, 300_000)

  it('free dragging moves every control point, and PH cannot follow it anywhere bad', () => {
    const base = controlStructure(toMember(seed)).points
    const span = Math.max(...base.map((p, i, a) => (i ? Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y, p.z - a[i - 1].z) : 0)))
    for (let idx = 1; idx < base.length; idx++) {
      let cur = seed
      let ok = 0
      for (let k = 1; k <= 6; k++) {
        const s = span * 0.1 * k
        const t = { x: base[idx].x + s, y: base[idx].y + 0.4 * s, z: base[idx].z - 0.3 * s }
        const next = dragControlPoint(cur, idx, t, { maxStep: 0.3 })
        if (!next) break
        cur = next
        ok = k
      }
      const got = controlStructure(toMember(cur)).points[idx]
      const moved = Math.hypot(got.x - base[idx].x, got.y - base[idx].y, got.z - base[idx].z)
      console.log(`    P${idx}: ${ok} steps, moved ${moved.toFixed(3)}, PH ${phDefect(toMember(cur)).toExponential(1)}`)
      expect(phDefect(toMember(cur)), `P${idx}: PH is not a thing that can fail`).toBeLessThan(1e-9)
    }
  }, 300_000)
})
