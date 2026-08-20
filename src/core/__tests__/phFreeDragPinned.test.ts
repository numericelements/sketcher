// ============================================================================
// FREE MODE WITH THE ENDS HELD — and how honest the word "held" is.
//
// The editing story the deck teaches: STRICT prescribes as many control points as the family has
// room for, so the answer is a COUNT and there is nothing to choose; FREE prescribes one, leaving
// 2K spare, so a solver chooses and the choice is minimum-norm. Free mode is the one you would
// actually edit with — but only if "the ends stay put unless you grab one" really holds, or the
// curve creeps away from its boundary conditions over a long drag.
//
// The pin is a heavy least-squares weight, not a hard constraint, so the drift is not zero by
// construction — it is measured here, over a drag long enough to accumulate, and compared with
// what a pixel is worth on the figure's own scale.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../complex'
import { type PHFreeState, dragPHFree, freeControlPoints } from '../phFreeDrag'

const W: Complex[] = [
  { re: 1, im: 0.2 }, { re: 0.4, im: 0.9 }, { re: -0.3, im: 0.7 }, { re: 0.8, im: -0.2 },
]

const stateFor = (K: number): PHFreeState => ({
  generator: W.slice(0, K),
  p0: { re: 0, im: 0 },
})

describe('free-mode drag with the ends pinned', () => {
  it('an interior drag leaves the ends where they were, to well under a pixel', () => {
    for (const K of [2, 3, 4]) {
      let st = stateFor(K)
      const start = freeControlPoints(st)
      const n = start.length - 1
      const chord = Math.hypot(start[n].re - start[0].re, start[n].im - start[0].im)
      const grab = Math.max(1, Math.floor(n / 2))
      // a hundred-step drag, so any creep accumulates
      let drift = 0
      for (let i = 1; i <= 100; i++) {
        const base = freeControlPoints(st)[grab]
        const target: Complex = { re: base.re + 0.01 * chord, im: base.im + 0.006 * chord }
        const r = dragPHFree(st, grab, target, { pinned: [0, n] })
        st = r.state
        const cps = r.controlPoints
        drift = Math.max(
          drift,
          Math.hypot(cps[0].re - start[0].re, cps[0].im - start[0].im),
          Math.hypot(cps[n].re - start[n].re, cps[n].im - start[n].im),
        )
      }
      const moved = Math.hypot(
        freeControlPoints(st)[grab].re - start[grab].re,
        freeControlPoints(st)[grab].im - start[grab].im,
      )
      // the figure is ~900 nominal px across a world box of ~5 units, so a pixel ≈ chord/190
      const pixel = chord / 190
      console.log(`    K=${K}: dragged ${(moved / chord).toFixed(2)} chords over 100 steps;` +
        ` end drift ${drift.toExponential(1)} = ${(drift / pixel).toExponential(1)} px`)
      expect(moved / chord, 'the drag actually went somewhere').toBeGreaterThan(0.3)
      expect(drift / pixel, 'and the ends stayed put, sub-pixel').toBeLessThan(0.2)
    }
  })

  it('but grabbing a pinned end still moves it — the drag always wins over the pin', () => {
    const K = 3
    let st = stateFor(K)
    const start = freeControlPoints(st)
    const n = start.length - 1
    const chord = Math.hypot(start[n].re - start[0].re, start[n].im - start[0].im)
    for (let i = 1; i <= 40; i++) {
      const base = freeControlPoints(st)[n]
      const r = dragPHFree(st, n, { re: base.re + 0.01 * chord, im: base.im + 0.01 * chord },
        { pinned: [0, n] })
      st = r.state
    }
    const end = freeControlPoints(st)
    const movedEnd = Math.hypot(end[n].re - start[n].re, end[n].im - start[n].im)
    const movedStart = Math.hypot(end[0].re - start[0].re, end[0].im - start[0].im)
    console.log(`    grabbed the pinned end: it moved ${(movedEnd / chord).toFixed(3)} chords` +
      ` while the other end held to ${(movedStart / chord).toExponential(1)}`)
    expect(movedEnd / chord, 'the grabbed end follows the cursor').toBeGreaterThan(0.2)
    expect(movedStart / chord, 'the OTHER end still holds').toBeLessThan(1e-3)
  })
})
