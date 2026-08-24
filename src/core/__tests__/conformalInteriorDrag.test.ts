// ============================================================================
// THE INTERIOR-POINT STAGE, MEASURED ON THE SAME GESTURE AS mobiusDragCoverage.
//
// The question that file left open — can lift8's control point 4 be moved ON the model — is
// answered here by routing the Möbius drag through the interior-point solver as an escalation
// stage (dragControlPointStaged): Newton 80 → 300 → interior → Newton 900, best state by the
// displayed ⟨C,C⟩. Measured on the twenty-tick gesture, every control point of lift8:
//
//         today (plain escalation)             staged
//     pt  on model HARD      time          on model HARD      time
//      0    20/20   6/20    0.54s           20/20   6/20    0.53s     (identical route)
//      1    20/20   0/20    0.62s           20/20   0/20    0.51s
//      2    20/20   0/20    0.23s           20/20   0/20    0.23s     (identical route)
//      3    20/20   0/20    0.60s           20/20   0/20    0.60s     (identical route)
//      4     0/20   0/20    6.8s            20/20   0/20    0.65s     ← the point of all this
//
// The interior stage is what plain Gauss-Newton is not: a solver whose acceptance sees the
// constraint violation as its own axis. Its exact constraint Hessian (the defining rows are
// quadratic, so it is closed-form) is what makes it converge; BFGS alone plateaued at 1e-3.
// Neither route alone serves every point — interior-only loses point 3 to 1/20 — which is why
// the stage sits INSIDE the escalation rather than replacing it.
//
// Point 0's six HARD readings are the standing readout question (poles at modulus ~0.5, both
// routes identical there) — not made worse, not resolved here.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { PRESETS, conformalAsRat } from '../../talks/ph-rational/poleLabPresets'
import { frameConformal } from '../specimenFraming'
import { controlPoints, degreeOf, dragControlPoint, type ConformalPHCurve } from '../conformalPHCurve'
import { dragControlPointStaged } from '../conformalMobiusDrag'
import { conformalCoefficientResidual, conformalNullResidual, readPoles } from '../poleReadout'
import { nullCurveResidual } from '../conformal'
import { vnorm, vsub } from '../quaternion'

type Row = {
  route: string; index: number
  onModel: number; hard: number; withheld: number; tracked: number; worst: number; ms: number
}

function gesture(st0: ConformalPHCurve, index: number, route: 'today' | 'staged'): Row {
  const n = degreeOf(st0)
  const Q = controlPoints(st0)
  const chord = vnorm(vsub(Q[n], Q[0]))
  let cur = st0
  let onModel = 0, hard = 0, withheld = 0, want = 0, short = 0, worst = 0
  const t0 = Date.now()
  for (let s = 1; s <= 20; s++) {
    const s0 = Q[index]
    const f = 0.03 * s
    const to = { x: s0.x + f * chord * 0.6, y: s0.y + f * chord * 0.6, z: s0.z - f * chord * 0.5 }
    want += vnorm(vsub(to, controlPoints(cur)[index]))
    let best = cur, bestNull = Infinity, track = 0
    if (route === 'today') {
      for (const it of [80, 300, 900]) {
        const r = dragControlPoint(cur, index, to, { pinEnds: true, iterations: it })
        const off = conformalNullResidual(r.state)
        if (off < bestNull) { bestNull = off; best = r.state; track = r.trackingError }
        if (off <= 1e-9) break
      }
    } else {
      const r = dragControlPointStaged(cur, index, to, { pinEnds: true })
      best = r.state; bestNull = conformalNullResidual(r.state); track = r.trackingError
    }
    cur = best; short += track; worst = Math.max(worst, bestNull)
    if (bestNull <= 1e-9) {
      onModel++
      const poles = readPoles(conformalAsRat(cur), {
        residual: conformalCoefficientResidual(cur), nullPolynomial: nullCurveResidual(cur.C),
      }).filter((x) => x.numerator > 1e-7)
      if (poles.some((x) => x.verdict === 'hard')) hard++
      if (poles.some((x) => x.verdict === 'below resolution')) withheld++
    }
  }
  return { route, index, onModel, hard, withheld, tracked: 100 * (1 - short / want), worst, ms: Date.now() - t0 }
}

const print = (r: Row) =>
  console.log(`  ${r.route.padEnd(8)} point ${r.index}:` +
    ` on the model ${String(r.onModel).padStart(2)}/20   reads HARD ${String(r.hard).padStart(2)}/20` +
    `   withheld ${String(r.withheld).padStart(2)}/20` +
    `   tracked ${r.tracked.toFixed(1).padStart(6)}%` +
    `   worst ⟨C,C⟩ ${r.worst.toExponential(1)}   ${r.ms}ms`)

describe('the staged Möbius drag', () => {
  it('lift8: twenty small steps, every control point, on the model', () => {
    const st0 = frameConformal(PRESETS.find((p) => p.id === 'lift8')!.conformal!)
    const rows: Row[] = []
    for (const index of [0, 1, 2, 3, 4]) {
      for (const route of ['today', 'staged'] as const) {
        const r = gesture(st0, index, route)
        rows.push(r)
        print(r)
      }
    }
    const staged = (i: number) => rows.find((r) => r.route === 'staged' && r.index === i)!
    const today = (i: number) => rows.find((r) => r.route === 'today' && r.index === i)!
    for (const r of rows) {
      expect(r.tracked, `${r.route} point ${r.index}: the cursor is followed`).toBeGreaterThan(99.9)
    }
    for (const i of [0, 1, 2, 3, 4]) {
      // The claim of this change: EVERY control point of the awkward lift moves ON the model.
      expect(staged(i).onModel, `staged point ${i}: every tick lands on the model`).toBe(20)
      // And no point's verdicts get worse than the plain escalation's.
      expect(staged(i).hard, `staged point ${i}: no new hard readings`)
        .toBeLessThanOrEqual(today(i).hard)
    }
    // The row that motivated the route: plain Newton never lands point 4 at all.
    expect(today(4).onModel).toBe(0)
  }, 900_000)

  it('lift8g, the clean specimen: the staged route is the plain one (stage 80 lands)', () => {
    const st0 = frameConformal(PRESETS.find((p) => p.id === 'lift8g')!.conformal!)
    const r = gesture(st0, 2, 'staged')
    print(r)
    expect(r.onModel).toBe(20)
    expect(r.hard).toBe(0)
    expect(r.tracked).toBeGreaterThan(99.9)
  }, 300_000)
})
