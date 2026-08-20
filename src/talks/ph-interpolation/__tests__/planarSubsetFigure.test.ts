// ============================================================================
// The figure's GRIP BOOKKEEPING, tested without rendering.
//
// The interaction encodes the dimension rule: exactly K+1 control points are ever held, so the
// fibre is always a count. Everything that could break that is here — the default grip at each
// degree, the FIFO eviction, the endpoint exemption — plus the property that actually matters to
// a user, that every grip reachable by clicking is one the solver can answer.
// ============================================================================
import { describe, it, expect } from 'vitest'
import type { Complex } from '../../../core/complex'
import { controlPointsFrom, degreeOf, solveSubset } from '../../../core/planarPHSubset'
import { defaultSubset, nextGrip, reference } from '../PlanarSubsetFigure'

const KS = [1, 2, 3, 4]

describe('the subset figure keeps a legal grip', () => {
  it('the default grip is legal at every degree, and holds both ends', () => {
    for (const K of KS) {
      const sub = defaultSubset(K)
      expect(sub.length, `K=${K} holds K+1`).toBe(K + 1)
      expect(new Set(sub).size, 'distinct').toBe(K + 1)
      expect(Math.min(...sub)).toBe(0)
      expect(Math.max(...sub)).toBe(degreeOf(K))
    }
  })

  it('every reference curve is a genuine PH curve of its degree', () => {
    for (const K of KS) {
      const { w, p0 } = reference(K)
      const cps = controlPointsFrom(K, w, p0)
      expect(cps.length, `degree ${degreeOf(K)} has 2K control points`).toBe(2 * K)
      const chord = Math.hypot(cps[cps.length - 1].re - cps[0].re, cps[cps.length - 1].im - cps[0].im)
      expect(chord).toBeGreaterThan(3.5)
      expect(chord).toBeLessThan(5)
    }
  })

  it('FIFO never lets the grip leave size K+1, and honours the endpoint exemption', () => {
    for (const K of KS) {
      const n = degreeOf(K)
      const { w, p0 } = reference(K)
      const cps = controlPointsFrom(K, w, p0)
      for (const pinEnds of [true, false]) {
        let order = defaultSubset(K)
        let targets: Complex[] = order.map((i) => cps[i])
        for (let pass = 0; pass < 2; pass++) {
          for (let idx = 0; idx <= n; idx++) {
            const g = nextGrip(order, targets, cps, idx, K, pinEnds)
            order = g.order
            targets = g.targets
            expect(order.length, `K=${K} pinEnds=${pinEnds}: grip stays K+1`).toBe(K + 1)
            expect(new Set(order).size, 'no duplicate holds').toBe(K + 1)
            expect(targets.length).toBe(order.length)
            if (pinEnds) {
              expect(order.includes(0) && order.includes(n), 'pinned ends survive').toBe(true)
            }
          }
        }
      }
    }
  })

  it('and every grip reachable by clicking is one the solver can answer', () => {
    for (const K of [2, 3, 4]) {
      const n = degreeOf(K)
      const { w, p0 } = reference(K)
      const cps = controlPointsFrom(K, w, p0)
      let order = defaultSubset(K)
      let targets: Complex[] = order.map((i) => cps[i])
      const seen: number[] = []
      for (let idx = 0; idx <= n; idx++) {
        const g = nextGrip(order, targets, cps, idx, K, true)
        order = g.order
        targets = g.targets
        const pairs = order.map((i, k) => ({ i, t: targets[k] })).sort((a, b) => a.i - b.i)
        const r = solveSubset(K, pairs.map((q) => q.i), pairs.map((q) => q.t))
        expect(r.failed, `no failed path on {${pairs.map((q) => q.i)}}`).toBe(0)
        expect(r.finitePaths + r.diverged + r.failed).toBe(r.paths)
        expect(r.solutions.length, `{${pairs.map((q) => q.i)}} must be answerable`).toBeGreaterThan(0)
        seen.push(r.solutions.length)
      }
      console.log(`    degree ${n}: counts along a click-through — ${seen.join(' ')}`)
    }
  }, 300_000)
})
