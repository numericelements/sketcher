// ============================================================================
// THE POLE SLIDER MUST WORK AT EVERY POSITION — and the run-out must be a geometric event.
//
// WHY THIS EXISTS. The pole is the handle two slides of "Inside the Chart" share, so a position where
// `withDial` returns null is a hole the viewer falls into: the picture freezes and the readout says
// nothing useful. That has happened before on exactly this seed — familyBasisConditioning.test.ts
// records eight dead angles on the twist dial, caused by a nullspace basis that was sometimes the
// wrong size. This file is the same guard for the other slider, swept at the figure's own step.
//
// AND THE SECOND HALF IS THE POINT OF THE FIGURE. Walking the pole toward the drawn piece must make
// the curve run out, not make the solver quit. Those look identical on screen unless the numbers are
// pinned: `poleMargin` falls smoothly to the slider's floor while ‖c′(1)‖ climbs monotonically, and
// every member along the way is still exactly PH with the data still held. A solver giving up would
// break one of those three.
//
// AND THE CLIMB IS SMALLER THAN ANYONE EXPECTS, which is a caption-level fact. Naively ‖c′(1)‖ should
// grow ~1340× across this slider. It grows 6.6×, because holding the data lets the solve shrink σ(1)
// to compensate. The curve reshapes instead of blowing up, and a caption promising a divergence over
// the DRAWN piece would be overstating it — the blow-up lives past t = 1, on the run-out.
//
// The cusp itself — that T′(r) = 0 at every pole, and N(r) = −p(r) — is pinned in
// tangentIndicatrix.test.ts and is not repeated here.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  dataOf, familyBasis, phDefect, poleMargin, speedAt, toMember, unpackSpinor, withDial,
} from '../rationalPHMultiPoleSpatial'
import { indicatrixSpeedAt } from '../tangentIndicatrix'
import type { Quat } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

/** The seed both figures open on — chartModel.ts builds exactly this. */
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [0] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()
const TARGET = dataOf(toMember(SEED))

/** The figure's own slider range and step (RANGE.pole in chartModel.ts). */
const POLE = { min: 1.06, max: 3.2, step: 0.005 }

describe('the shared pole slider', () => {
  it('has no holes: every position in the figure\'s range returns a member', () => {
    const dead: string[] = []
    for (let r = POLE.min; r <= POLE.max + 1e-9; r += POLE.step) {
      if (!withDial(SEED, TARGET, { pole: { index: 0, value: r } })) dead.push(r.toFixed(3))
    }
    expect(dead).toEqual([])
  })

  it('and every member on it is exactly PH with the data still held', () => {
    let worstPH = 0
    let worstData = 0
    for (const r of [1.06, 1.2, 1.5, 1.7, 2.1, 2.6, 3.2]) {
      const prm = withDial(SEED, TARGET, { pole: { index: 0, value: r } })
      expect(prm).not.toBeNull()
      const m = toMember(prm!)
      worstPH = Math.max(worstPH, phDefect(m))
      worstData = Math.max(worstData, Math.hypot(...dataOf(m).map((v, i) => v - TARGET[i])))
      expect(prm!.roots[0]).toBeCloseTo(r, 9)      // the dial really moved the pole
    }
    expect(worstPH).toBeLessThan(1e-12)
    expect(worstData).toBeLessThan(1e-6)
  })

  it('THE RUN-OUT IS GEOMETRY, NOT A STALL: the margin closes and the curve RESHAPES', () => {
    const at = (r: number) => {
      const prm = withDial(SEED, TARGET, { pole: { index: 0, value: r } })!
      return { margin: poleMargin(prm), speed: speedAt(toMember(prm), 1) }
    }
    const far = at(3.2)
    const near = at(1.06)
    expect(far.margin).toBeCloseTo(2.2, 6)          // r - 1, by definition
    expect(near.margin).toBeCloseTo(0.06, 6)
    // AND THE SIZE OF THE CLIMB IS THE HONEST SURPRISE. Naively ‖c′(1)‖ = σ(1)/(1−r)² should grow by
    // 1/(0.06)² ÷ 1/(2.2)² ≈ 1340 across this range. It grows by 6.6, because the data is HELD: the
    // solve shrinks σ(1) to compensate, so the curve RESHAPES rather than simply blowing up. Any
    // caption promising a divergence over the drawn piece is overstating it.
    expect(near.speed / far.speed).toBeGreaterThan(6)
    expect(near.speed / far.speed).toBeLessThan(8)      // measured 6.56
    // monotone in between, so the slider reads as one continuous event
    const speeds = [3.2, 2.6, 2.1, 1.7, 1.4, 1.2, 1.06].map((r) => at(r).speed)
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1])
  })

  it('the cusp travels WITH the pole — T′ vanishes at wherever the slider left it', () => {
    for (const r of [1.06, 1.4, 1.9, 2.7, 3.2]) {
      const m = toMember(withDial(SEED, TARGET, { pole: { index: 0, value: r } })!)
      const atCusp = indicatrixSpeedAt(m, r)
      const offCusp = indicatrixSpeedAt(m, r + 0.08)
      expect(atCusp).toBeLessThan(1e-9)
      expect(offCusp).toBeGreaterThan(1e-3)        // and it is a genuine corner, not a dead curve
    }
  })
})
