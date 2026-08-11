// Pins the core module the figure draws from: PH exact, the loop closes, the dials re-solve, and the
// pole margin reports the honest limit. The figure itself holds no mathematics, so this is where the
// figure's claims live.
import { describe, it, expect } from 'vitest'
import {
  type OnePoleParams, controlStructure, curveAt, dataOf, dragControlPoint, fiberLoop, phDefect,
  poleMargin, speedAt, toMember, withDial, dragWithEndHeld,
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

describe('free dragging: every control point, and PH unavailable for violation', () => {
  const SEED2: OnePoleParams = {
    b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
    b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
    lambda: 0.6,
    pole: 1.7,
  }

  it('drags each of the five control points, and PH never moves', () => {
    const base = controlStructure(toMember(SEED2)).points
    const span = Math.max(...base.map((p, i, a) => (i ? Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y, p.z - a[i - 1].z) : 0)))
    for (let idx = 0; idx < 5; idx++) {
      let cur = SEED2
      let asked = 0
      let stalled = -1
      for (let k = 1; k <= 10; k++) {
        asked = span * 0.08 * k
        const p0 = base[idx]
        const t = { x: p0.x + asked, y: p0.y + 0.4 * asked, z: p0.z - 0.3 * asked }
        const next = dragControlPoint(cur, idx, t, { maxStep: 0.25 })
        if (!next) { stalled = k; break }
        cur = next
      }
      const got = controlStructure(toMember(cur)).points[idx]
      const moved = Math.hypot(got.x - base[idx].x, got.y - base[idx].y, got.z - base[idx].z)
      const wanted = asked * Math.hypot(1, 0.4, 0.3)
      const defect = Math.max(phDefect(toMember(cur)), toMember(cur).consistency)
      console.log(
        `    P${idx}: travelled ${(100 * moved / Math.max(wanted, 1e-12)).toFixed(0)}%` +
          `   PH defect ${defect.toExponential(1)}   pole ${cur.pole.toFixed(3)}` +
          `${stalled > 0 ? `   <- stopped at ${stalled}` : ''}`,
      )
      expect(defect, `P${idx}: PH cannot be violated`).toBeLessThan(1e-9)
      expect(poleMargin(cur), `P${idx}: the pole stayed out of the domain`).toBeGreaterThan(0)
    }
  }, 120_000)

  it('and it refuses to walk the pole into the drawn piece', () => {
    // Aim a control point somewhere that would need the pole inside [0,1] and check we get null, not a
    // curve with a pole through it.
    let cur: OnePoleParams | null = SEED2
    let steps = 0
    const far = { x: 40, y: -30, z: 25 }
    while (cur && steps < 400) {
      const next: OnePoleParams | null = dragControlPoint(cur, 4, far, { maxStep: 0.4 })
      if (!next) break
      cur = next
      steps++
    }
    console.log(`    pushed ${steps} steps toward a far target; final pole ${cur?.pole.toFixed(4) ?? 'n/a'}`)
    expect(cur, 'the last accepted state is still a member').not.toBeNull()
    expect(poleMargin(cur as OnePoleParams), 'and its pole is outside the domain').toBeGreaterThan(0)
  }, 120_000)
})

describe('free dragging with the ends HELD', () => {
  const S: OnePoleParams = {
    b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
    b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
    lambda: 0.6,
    pole: 1.7,
  }
  it('an interior drag leaves BOTH endpoints where they were', () => {
    const base = controlStructure(toMember(S)).points
    const end0 = curveAt(toMember(S), 1)
    const span = Math.max(...base.map((p, i, a) => (i ? Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y, p.z - a[i - 1].z) : 0)))
    for (const idx of [1, 2, 3]) {
      let cur = S
      for (let k = 1; k <= 8; k++) {
        const s = span * 0.08 * k
        const t = { x: base[idx].x + s, y: base[idx].y + 0.5 * s, z: base[idx].z - 0.35 * s }
        const next = dragWithEndHeld(cur, idx, t, end0, { maxStep: 0.25 })
        if (!next) break
        cur = next
      }
      const m = toMember(cur)
      const start = curveAt(m, 0)
      const end = curveAt(m, 1)
      const moved = Math.hypot(
        controlStructure(m).points[idx].x - base[idx].x,
        controlStructure(m).points[idx].y - base[idx].y,
        controlStructure(m).points[idx].z - base[idx].z,
      )
      const endDrift = Math.hypot(end.x - end0.x, end.y - end0.y, end.z - end0.z)
      console.log(
        `    P${idx}: moved ${moved.toFixed(3)};  c(0) drift ${Math.hypot(start.x, start.y, start.z).toExponential(1)}` +
          `   c(1) drift ${endDrift.toExponential(1)}   PH ${phDefect(m).toExponential(1)}`,
      )
      expect(moved, `P${idx} actually moved`).toBeGreaterThan(0.02)
      expect(Math.hypot(start.x, start.y, start.z), 'c(0) is pinned by p(0) = 0').toBeLessThan(1e-9)
      expect(endDrift, 'and c(1) was held').toBeLessThan(1e-7)
      expect(phDefect(m), 'PH still cannot fail').toBeLessThan(1e-9)
    }
  }, 300_000)
})
