/* eslint-disable no-restricted-imports -- parity test: the legacy optimizer is the oracle */
// Parity + correctness for the CORE AB-complex-rational PH drag vs the legacy optimizer it
// replaces (src/sketcher/optimizer). The legacy is the oracle for the reconstruction and
// the PH residual. The drag can't be bit-identical (core vs legacy use DIFFERENT
// InteriorPointOptimizer classes and — for the bound — DIFFERENT numerators: core enforces
// the reduced Ñ, legacy the general Chen g), so the drag is pinned on the invariants that
// matter: stays PH, tracks the cursor at least as well as legacy, and — with the bound on —
// holds S⁻(Ñ) non-increasing (the sliding mechanism).
import { describe, it, expect } from 'vitest'
import {
  slideABComplexRationalPH, abComplexRationalPHCurveCPs, abComplexRationalPHResidual,
  genFromABMeta, type ABComplexRationalPHGen,
} from '../abComplexRationalPHDrag'
import { rationalPHBound } from '../rationalPHCurvature'
import {
  createABPHFromTwoPoints, computeABPHCurve, computePHResidualCoeffs, type ABPHMetadata,
} from '../../sketcher/optimizer/abPHCurve'
import { optimizeABPHCurve } from '../../sketcher/optimizer'

const metaFromGen = (g: ABComplexRationalPHGen): ABPHMetadata => ({
  kind: 'ab-complex-rational', degree: g.degree,
  aReCPs: g.aRe, aImCPs: g.aIm, bReCPs: g.bRe, bImCPs: g.bIm, sReCPs: g.sRe, sImCPs: g.sIm,
  knots: g.knots, sKnots: g.sKnots,
})
const maxAbs = (a: number[]) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
const sMinus = (g: ABComplexRationalPHGen) =>
  rationalPHBound(g.sRe, g.sIm, g.sKnots, g.sKnots.length - g.sRe.length - 1, g.bRe, g.bIm, g.knots, g.degree)

describe('core AB-complex-rational PH drag: parity with the legacy optimizer', () => {
  const seed = createABPHFromTwoPoints(100, 300, 500, 320)
  const gen0 = genFromABMeta(seed.metadata)

  it('reconstruction matches legacy computeABPHCurve bit-for-bit', () => {
    const core = abComplexRationalPHCurveCPs(gen0)
    const legacy = computeABPHCurve(metaFromGen(gen0)).controlPoints
    expect(core.length).toBe(legacy.length)
    for (let i = 0; i < core.length; i++) {
      expect(core[i].re).toBe(legacy[i].re)
      expect(core[i].im).toBe(legacy[i].im)
      expect(core[i].w_re).toBe(legacy[i].w_re)
      expect(core[i].w_im).toBe(legacy[i].w_im)
    }
  })

  it('the seed is PH (residual ≈ 0) and core residual matches legacy to 9 digits', () => {
    const core = abComplexRationalPHResidual(gen0)
    const legacy = computePHResidualCoeffs(metaFromGen(gen0))
    expect(maxAbs(core.re)).toBeLessThan(1e-6)
    expect(maxAbs(core.im)).toBeLessThan(1e-6)
    expect(core.re.length).toBe(legacy.re.length)
    for (let i = 0; i < core.re.length; i++) expect(core.re[i]).toBeCloseTo(legacy.re[i], 9)
    for (let i = 0; i < core.im.length; i++) expect(core.im[i]).toBeCloseTo(legacy.im[i], 9)
  })

  it('a PH-only drag stays PH and tracks at least as well as legacy', () => {
    const cps0 = abComplexRationalPHCurveCPs(gen0)
    const n = cps0.length
    const k = Math.min(2, n - 1)
    const target = { x: cps0[k].re + 40, y: cps0[k].im - 120 }
    const moveLen = Math.hypot(target.x - cps0[k].re, target.y - cps0[k].im)
    const targets = cps0.map((p, i) => (i === k ? target : { x: p.re, y: p.im }))
    const weights = cps0.map((_, i) => (i === k ? 10 : i === 0 || i === n - 1 ? 5 : 1))

    const genC = slideABComplexRationalPH(gen0, targets, { targetWeights: weights, maxIterations: 50 })
    const cpsC = abComplexRationalPHCurveCPs(genC)
    const resC = abComplexRationalPHResidual(genC)
    const trackedC = 100 - (100 * Math.hypot(cpsC[k].re - target.x, cpsC[k].im - target.y)) / moveLen

    const legacyCPs = cps0.map((p) => ({ re: p.re, im: p.im, w_re: p.w_re, w_im: p.w_im }))
    const legacy = optimizeABPHCurve(metaFromGen(gen0), legacyCPs, target.x, target.y, k)
    const cpsL = legacy.curveResult.controlPoints
    const trackedL = 100 - (100 * Math.hypot(cpsL[k].re - target.x, cpsL[k].im - target.y)) / moveLen
    const phC = Math.max(maxAbs(resC.re), maxAbs(resC.im))
    const phL = maxAbs(computePHResidualCoeffs(legacy.curveResult.metadata).re)

    expect(trackedC, `core tracked ${trackedC.toFixed(1)}%`).toBeGreaterThan(20)
    expect(phC, `core PH residual ${phC.toExponential(2)} vs legacy ${phL.toExponential(2)}`).toBeLessThan(Math.max(phL * 3, 10))
    expect(trackedC, `core ${trackedC.toFixed(1)}% vs legacy ${trackedL.toFixed(1)}%`).toBeGreaterThan(trackedL - 10)
    console.log(`  AB PH-only drag — core ${trackedC.toFixed(1)}% (PH res ${phC.toExponential(1)}), legacy ${trackedL.toFixed(1)}%`)
  })

  it('with the bound on, the drag holds S⁻(Ñ) non-increasing (the sliding mechanism)', () => {
    const cps0 = abComplexRationalPHCurveCPs(gen0)
    const n = cps0.length
    const k = Math.min(2, n - 1)
    const target = { x: cps0[k].re + 60, y: cps0[k].im + 160 } // a big pull, prone to adding extrema
    const targets = cps0.map((p, i) => (i === k ? target : { x: p.re, y: p.im }))
    const weights = cps0.map((_, i) => (i === k ? 10 : i === 0 || i === n - 1 ? 5 : 1))

    const before = sMinus(gen0)
    const genBound = slideABComplexRationalPH(gen0, targets, { targetWeights: weights, maxIterations: 50, preserveCurvatureExtrema: true })
    const after = sMinus(genBound)
    const res = abComplexRationalPHResidual(genBound)
    const ph = Math.max(maxAbs(res.re), maxAbs(res.im))
    const cpsB = abComplexRationalPHCurveCPs(genBound)
    const tracked = 100 - (100 * Math.hypot(cpsB[k].re - target.x, cpsB[k].im - target.y)) / Math.hypot(target.x - cps0[k].re, target.y - cps0[k].im)

    expect(after, `S⁻(Ñ) ${before} → ${after}`).toBeLessThanOrEqual(before) // Law 2: bound non-increasing
    expect(ph).toBeLessThan(10)      // still (approximately) PH
    expect(tracked).toBeGreaterThan(10) // still reshapes toward the cursor, not frozen
    console.log(`  AB bound drag — S⁻(Ñ) ${before}→${after}, tracked ${tracked.toFixed(1)}%, PH res ${ph.toExponential(1)}`)
  })

  it('realB keeps B real (real-rational family) and still holds the bound + tracks', () => {
    // A real-rational seed: B ≡ 1 (createABPHFromTwoPoints yields a real, in fact constant, B).
    const realSeed = genFromABMeta(createABPHFromTwoPoints(120, 280, 480, 300).metadata)
    expect(Math.max(...realSeed.bIm.map(Math.abs))).toBe(0) // seed B is real
    const cps0 = abComplexRationalPHCurveCPs(realSeed)
    const n = cps0.length
    const k = Math.min(2, n - 1)
    const target = { x: cps0[k].re + 50, y: cps0[k].im + 130 }
    const targets = cps0.map((p, i) => (i === k ? target : { x: p.re, y: p.im }))
    const weights = cps0.map((_, i) => (i === k ? 10 : i === 0 || i === n - 1 ? 5 : 1))

    const before = sMinus(realSeed)
    const gen = slideABComplexRationalPH(realSeed, targets, { targetWeights: weights, maxIterations: 50, preserveCurvatureExtrema: true, realB: true })
    const after = sMinus(gen)
    const cps = abComplexRationalPHCurveCPs(gen)
    const tracked = 100 - (100 * Math.hypot(cps[k].re - target.x, cps[k].im - target.y)) / Math.hypot(target.x - cps0[k].re, target.y - cps0[k].im)

    expect(Math.max(...gen.bIm.map(Math.abs))).toBe(0) // B stayed exactly real
    expect(after).toBeLessThanOrEqual(before) // bound held
    expect(tracked).toBeGreaterThan(10)       // still reshapes
    console.log(`  realB drag — B stayed real, S⁻(Ñ) ${before}→${after}, tracked ${tracked.toFixed(1)}%`)
  })
})
