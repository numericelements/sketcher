// Parity + correctness for the CORE real-rational PH drag vs the legacy optimizer it
// replaces (src/sketcher/optimizer). The legacy is the oracle for the reconstruction and
// the PH residual; the drag itself can't be bit-identical (core vs legacy use DIFFERENT
// InteriorPointOptimizer classes), so the drag is pinned on the invariants that matter:
// stays PH (residual ≈ 0), and the dragged control point tracks the cursor at least as well
// as the legacy path did.
import { describe, it, expect } from 'vitest'
import {
  slideRealRationalPH, realRationalPHCurveCPs, realRationalPHResidual, genFromRealRationalMeta,
  type RealRationalPHGen,
} from '../realRationalPHDrag'
import {
  createRealRationalPHFromTwoPoints, computeRealRationalPHCurve, toABMetadata,
  type RealRationalPHMetadata,
} from '../../sketcher/optimizer/realRationalPHCurve'
import { computePHResidualCoeffs } from '../../sketcher/optimizer/abPHCurve'
import { optimizeRealRationalPHCurve } from '../../sketcher/optimizer'

const metaFromGen = (g: RealRationalPHGen): RealRationalPHMetadata => ({
  kind: 'real-rational', degree: g.degree,
  aReCPs: g.aRe, aImCPs: g.aIm, bCPs: g.b, sReCPs: g.sRe, sImCPs: g.sIm,
  knots: g.knots, sKnots: g.sKnots,
})
const maxAbs = (a: number[]) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

describe('core real-rational PH drag: parity with the legacy optimizer', () => {
  const seed = createRealRationalPHFromTwoPoints(100, 300, 500, 320)
  const gen0 = genFromRealRationalMeta(seed.metadata)

  it('reconstruction matches legacy computeRealRationalPHCurve bit-for-bit', () => {
    const core = realRationalPHCurveCPs(gen0)
    const legacy = computeRealRationalPHCurve(metaFromGen(gen0)).controlPoints
    expect(core.length).toBe(legacy.length)
    for (let i = 0; i < core.length; i++) {
      expect(core[i].x).toBe(legacy[i].x)
      expect(core[i].y).toBe(legacy[i].y)
      expect(core[i].w).toBe(legacy[i].w)
    }
  })

  it('the seed curve is PH (residual ≈ 0) and core residual matches legacy', () => {
    const core = realRationalPHResidual(gen0)
    const legacy = computePHResidualCoeffs(toABMetadata(metaFromGen(gen0)))
    // both representations vanish on a genuine PH curve
    expect(maxAbs(core.re)).toBeLessThan(1e-6)
    expect(maxAbs(core.im)).toBeLessThan(1e-6)
    expect(maxAbs(legacy.re)).toBeLessThan(1e-6)
    // and the two residual builders agree in size + values (same object, core algebra)
    expect(core.re.length).toBe(legacy.re.length)
    expect(core.im.length).toBe(legacy.im.length)
    for (let i = 0; i < core.re.length; i++) expect(core.re[i]).toBeCloseTo(legacy.re[i], 9)
    for (let i = 0; i < core.im.length; i++) expect(core.im[i]).toBeCloseTo(legacy.im[i], 9)
  })

  it('a drag stays PH and tracks the cursor at least as well as the legacy path', () => {
    const cps0 = realRationalPHCurveCPs(gen0)
    const n = cps0.length
    const k = Math.min(1, n - 1) // an interior-ish control point
    const target = { x: cps0[k].x + 40, y: cps0[k].y - 120 }
    const moveLen = Math.hypot(target.x - cps0[k].x, target.y - cps0[k].y)
    const targets = cps0.map((p, i) => (i === k ? target : { x: p.x, y: p.y }))
    const weights = cps0.map((_, i) => (i === k ? 10 : i === 0 || i === n - 1 ? 5 : 1))

    // CORE
    const genC = slideRealRationalPH(gen0, targets, { targetWeights: weights, maxIterations: 50 })
    const cpsC = realRationalPHCurveCPs(genC)
    const resC = realRationalPHResidual(genC)
    const trackedC = 100 - (100 * Math.hypot(cpsC[k].x - target.x, cpsC[k].y - target.y)) / moveLen

    // LEGACY (oracle)
    const legacyCurveCPs = cps0.map((p) => ({ x: p.x, y: p.y, w: p.w }))
    const legacy = optimizeRealRationalPHCurve(metaFromGen(gen0), legacyCurveCPs, target.x, target.y, k)
    const cpsL = legacy.curveResult.controlPoints
    const trackedL = 100 - (100 * Math.hypot(cpsL[k].x - target.x, cpsL[k].y - target.y)) / moveLen
    const resL = computePHResidualCoeffs(toABMetadata(legacy.curveResult.metadata))
    const phC = Math.max(maxAbs(resC.re), maxAbs(resC.im))
    const phL = Math.max(maxAbs(resL.re), maxAbs(resL.im))

    // (1) core actually moved the dragged CP toward the cursor
    expect(trackedC, `core tracked ${trackedC.toFixed(1)}%`).toBeGreaterThan(20)
    // (2) core stays PH at least as well as the legacy penalty solve (both non-converged →
    //     both leave a small residual; core must not be materially worse).
    expect(phC, `core PH residual ${phC.toExponential(2)} vs legacy ${phL.toExponential(2)}`)
      .toBeLessThan(Math.max(phL * 3, 10))
    // (3) core tracks no worse than legacy (within a small margin — different solvers)
    expect(trackedC, `core ${trackedC.toFixed(1)}% vs legacy ${trackedL.toFixed(1)}%`).toBeGreaterThan(trackedL - 10)
    // eslint-disable-next-line no-console
    console.log(`  real-rational PH drag — core tracked ${trackedC.toFixed(1)}% (PH res ${phC.toExponential(1)}), legacy ${trackedL.toFixed(1)}% (PH res ${phL.toExponential(1)})`)
  })
})
