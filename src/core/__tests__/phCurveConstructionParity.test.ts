import { describe, it, expect } from 'vitest'

// CORE (the port under test)
import {
  computePHCurveFromUV as coreComputePHCurveFromUV,
  phControlPointJacobian as coreJacobian,
  recomposeBD as coreRecomposeBD,
  integrateBD as coreIntegrateBD,
  curveBreakpointContinuities as coreContinuities,
} from '../phCurveConstruction'
import { decomposeToBernstein as coreDecompose } from '../bernstein'

// SKETCHER (the spec — tests may cross the layer boundary)
import {
  computePHCurveFromUV as skComputePHCurveFromUV,
} from '../../sketcher/optimizer/phCurve'
import { phControlPointJacobian as skJacobian } from '../../sketcher/optimizer/phCurveAnalytic'
import {
  recomposeBD as skRecomposeBD,
  integrateBD as skIntegrateBD,
  decomposeToBernstein as skDecompose,
} from '../../sketcher/optimizer/algebra'
import { curveBreakpointContinuities as skContinuities } from '../../sketcher/optimizer/phCurve'

// ── relative-diff helper ────────────────────────────────────────────────────
function relDiff(a: number, b: number): number {
  const d = Math.abs(a - b)
  const s = Math.max(Math.abs(a), Math.abs(b), 1e-12)
  return d / s
}
function maxRelDiffArr(a: number[], b: number[]): number {
  expect(a.length).toBe(b.length)
  let m = 0
  for (let i = 0; i < a.length; i++) m = Math.max(m, relDiff(a[i], b[i]))
  return m
}

const TOL = 1e-9

// ── generators ──────────────────────────────────────────────────────────────
interface Gen {
  name: string
  uCPs: number[]
  vCPs: number[]
  uvKnots: number[]
  uvDegree: number
  x0: number
  y0: number
}

const generators: Gen[] = [
  {
    // clamped degree-2, 5 CPs, uniform interior knots
    name: 'deg2 / 5CP uniform',
    uCPs: [1.0, 0.8, 0.3, -0.2, 0.5],
    vCPs: [0.1, 0.4, 0.9, 0.6, 0.2],
    uvKnots: [0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1],
    uvDegree: 2,
    x0: 2,
    y0: -1,
  },
  {
    // clamped degree-2, 7 CPs, uniform interior knots
    name: 'deg2 / 7CP uniform',
    uCPs: [1.0, 0.7, 0.2, -0.3, 0.4, 0.9, 0.5],
    vCPs: [0.0, 0.5, 0.8, 0.6, -0.1, 0.3, 0.7],
    uvKnots: [0, 0, 0, 0.2, 0.4, 0.6, 0.8, 1, 1, 1],
    uvDegree: 2,
    x0: -3,
    y0: 4,
  },
  {
    // clamped degree-2, 6 CPs, NON-uniform interior knots
    name: 'deg2 / 6CP non-uniform',
    uCPs: [0.9, 0.6, 0.1, -0.4, 0.7, 0.3],
    vCPs: [0.2, 0.55, 0.85, 0.5, 0.0, 0.45],
    uvKnots: [0, 0, 0, 0.15, 0.5, 0.85, 1, 1, 1],
    uvDegree: 2,
    x0: 0.5,
    y0: 0.25,
  },
]

describe('phCurveConstruction parity: core vs sketcher', () => {
  for (const g of generators) {
    it(`computePHCurveFromUV — ${g.name}`, () => {
      const core = coreComputePHCurveFromUV(g.uCPs, g.vCPs, g.uvKnots, g.uvDegree, g.x0, g.y0)
      const sk = skComputePHCurveFromUV(g.uCPs, g.vCPs, g.uvKnots, g.uvDegree, g.x0, g.y0)

      expect(core.degree).toBe(sk.degree)
      expect(core.controlPoints.length).toBe(sk.controlPoints.length)

      const dKnots = maxRelDiffArr(core.knots, sk.knots)
      const cx = core.controlPoints.map((p) => p.x)
      const cy = core.controlPoints.map((p) => p.y)
      const sx = sk.controlPoints.map((p) => p.x)
      const sy = sk.controlPoints.map((p) => p.y)
      const dCPs = Math.max(maxRelDiffArr(cx, sx), maxRelDiffArr(cy, sy))

      // eslint-disable-next-line no-console
      console.log(`  [${g.name}] computePHCurveFromUV maxRelDiff CPs=${dCPs.toExponential(2)} knots=${dKnots.toExponential(2)}`)
      expect(dCPs).toBeLessThan(TOL)
      expect(dKnots).toBeLessThan(TOL)
    })

    it(`phControlPointJacobian — ${g.name}`, () => {
      const core = coreJacobian(g.uCPs, g.vCPs, g.uvKnots, g.uvDegree)
      const sk = skJacobian(g.uCPs, g.vCPs, g.uvKnots, g.uvDegree)

      expect(core.length).toBe(sk.length)
      let m = 0
      for (let v = 0; v < core.length; v++) {
        m = Math.max(m, maxRelDiffArr(core[v].dx, sk[v].dx))
        m = Math.max(m, maxRelDiffArr(core[v].dy, sk[v].dy))
      }
      // eslint-disable-next-line no-console
      console.log(`  [${g.name}] phControlPointJacobian maxRelDiff=${m.toExponential(2)}`)
      expect(m).toBeLessThan(TOL)
    })

    it(`curveBreakpointContinuities — ${g.name}`, () => {
      const distinct = Array.from(new Set(g.uvKnots))
      const core = coreContinuities(distinct, g.uvKnots, g.uvDegree)
      const sk = skContinuities(distinct, g.uvKnots, g.uvDegree)
      expect(core).toEqual(sk)
    })
  }

  it('recomposeBD + integrateBD on a sample BernsteinDecomposition', () => {
    const g = generators[0]
    const cps = g.uCPs
    const knots = g.uvKnots
    const degree = g.uvDegree

    // core BD via core decompose (cps, knots, degree); sketcher BD via its own.
    const coreBD = coreDecompose(cps, knots, degree)
    const skBD = skDecompose({ knots, controlPoints: cps })

    // integrateBD parity
    const coreInt = coreIntegrateBD(coreBD, 1.5)
    const skInt = skIntegrateBD(skBD, 1.5)
    const dInt = maxRelDiffArr(coreInt.flatCoeffs(), skInt.flattenControlPoints())
    expect(dInt).toBeLessThan(TOL)

    // recomposeBD parity (default — numeric continuity detection)
    const coreRec = coreRecomposeBD(coreInt)
    const skRec = skRecomposeBD(skInt)
    expect(coreRec.controlPoints.length).toBe(skRec.controlPoints.length)
    expect(maxRelDiffArr(coreRec.controlPoints, skRec.controlPoints)).toBeLessThan(TOL)
    expect(maxRelDiffArr(coreRec.knots, skRec.knots)).toBeLessThan(TOL)

    // recomposeBD parity (per-breakpoint forced continuity)
    const conts = coreContinuities(coreInt.breaks, knots, degree + 1)
    const coreRec2 = coreRecomposeBD(coreInt, conts)
    const skRec2 = skRecomposeBD(skInt, conts)
    expect(coreRec2.controlPoints.length).toBe(skRec2.controlPoints.length)
    expect(maxRelDiffArr(coreRec2.controlPoints, skRec2.controlPoints)).toBeLessThan(TOL)
    expect(maxRelDiffArr(coreRec2.knots, skRec2.knots)).toBeLessThan(TOL)
  })
})
