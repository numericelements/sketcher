import { describe, it, expect } from 'vitest'
import { periodicGenKnots, clampedFromPeriodicGenKnots } from '../phCurveConstruction'
import { periodicGenKnots as legacyPeriodic, clampedFromPeriodicGenKnots as legacyClamped } from '../../sketcher/optimizer/phClosedSplineFit'

const CLAMPED = [0, 0, 0, 0.25, 0.5, 0.75, 1, 1, 1] // quadratic generator, 3 interior knots

describe('closed-PH generator knot helpers (clamped ⇄ periodic)', () => {
  for (const seamC of [0, 1, 2]) {
    it(`matches legacy + round-trips: seamContinuity ${seamC}`, () => {
      const corePer = periodicGenKnots(CLAMPED, seamC)
      const legPer = legacyPeriodic(CLAMPED, seamC)
      expect(corePer).toEqual(legPer)

      const back = clampedFromPeriodicGenKnots(corePer)
      const legBack = legacyClamped(corePer)
      expect(back.seamContinuity).toBe(seamC)
      expect(back.seamContinuity).toBe(legBack.seamContinuity)
      expect(back.genKnots).toEqual(legBack.genKnots)
    })
  }
})
