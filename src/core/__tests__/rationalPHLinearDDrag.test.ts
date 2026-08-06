import { describe, it, expect } from 'vitest'
import { rationalPHExactFromParams, type RationalPHExactParams } from '../rationalPHLinearD'
import { slideRationalPHExact } from '../rationalPHLinearDDrag'
import { rationalPHBound } from '../rationalPHCurvature'

// The drag on the exactly-PH family. The defining property: because the curve is reconstructed
// exactly from the params on every step, the drag CANNOT leave the PH manifold — no soft residual,
// no drift. Pins: (1) PH stays exact, (2) tracking, (3) bound non-increasing, (4) stability (no
// control point flung to infinity), (5) realD keeps the denominator exactly real.

// degree-2 S / linear D via d1 (root r = 1/(1−d1)) — the original default, kept for stable pins.
const C = (re: number, im = 0) => ({ re, im })
const fromD1 = (s0: {re:number;im:number}, s2: {re:number;im:number}, d1: {re:number;im:number}, origin: {x:number;y:number}): RationalPHExactParams => {
  const zr = 1 - d1.re, zi = -d1.im, n = zr * zr + zi * zi
  return { degS: 2, degD: 1, sFree: [s0, s2], roots: [{ re: zr / n, im: zi / n }], origin }
}
const START = fromD1(C(0.9, 0.1), C(0.6, 0.7), C(1.15, 0.2), { x: -1, y: 0 })

const sDegOf = (c: { sReCPs: number[] }) => c.sReCPs.length - 1
const dDegOf = (c: { dReCPs: number[] }) => c.dReCPs.length - 1
const boundOf = (c: ReturnType<typeof rationalPHExactFromParams>) =>
  rationalPHBound(c.sReCPs, c.sImCPs, c.sKnots, sDegOf(c), c.dReCPs, c.dImCPs, c.dKnots, dDegOf(c))

describe('exactly-PH rational drag', () => {
  it('stays EXACTLY PH through a drag (reconstruction never leaves the manifold)', () => {
    const c0 = rationalPHExactFromParams(START)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    targets[mid] = { x: targets[mid].x + 0.6, y: targets[mid].y + 0.5 }
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))
    const moved = slideRationalPHExact(START, targets, { targetWeights: weights, maxIterations: 60 })
    expect(rationalPHExactFromParams(moved).wronskianResidual).toBeLessThan(1e-9)
  })

  it('tracks the cursor (unconstrained) — the dragged point gets closer to its target', () => {
    const c0 = rationalPHExactFromParams(START)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    const target = { x: targets[mid].x + 0.6, y: targets[mid].y + 0.5 }
    targets[mid] = target
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))
    const before = Math.hypot(c0.controlPoints[mid].re - target.x, c0.controlPoints[mid].im - target.y)
    const c1 = rationalPHExactFromParams(slideRationalPHExact(START, targets, { targetWeights: weights, maxIterations: 80 }))
    const after = Math.hypot(c1.controlPoints[mid].re - target.x, c1.controlPoints[mid].im - target.y)
    expect(after).toBeLessThan(before * 0.7)
  })

  it('tracks ~fully over an INCREMENTAL bound-on drag (the real interactive case)', () => {
    const c0 = rationalPHExactFromParams(START)
    const sp = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = 2
    const goal = { x: sp[mid].x + 90, y: sp[mid].y - 70 }
    let params = START
    for (let step = 1; step <= 25; step++) {
      const frac = step / 25
      const cps = rationalPHExactFromParams(params).controlPoints.map((p) => ({ x: p.re, y: p.im }))
      const targets = cps.map((p, i) => (i === mid ? { x: sp[mid].x + (goal.x - sp[mid].x) * frac, y: sp[mid].y + (goal.y - sp[mid].y) * frac } : p))
      const w = targets.map((_, i) => (i === mid ? 50 : i === 0 || i === cps.length - 1 ? 5 : 1))
      params = slideRationalPHExact(params, targets, { targetWeights: w, maxIterations: 50, preserveCurvatureExtrema: true })
    }
    const end = rationalPHExactFromParams(params)
    const err = Math.hypot(end.controlPoints[mid].re - goal.x, end.controlPoints[mid].im - goal.y)
    expect(1 - err / Math.hypot(goal.x - sp[mid].x, goal.y - sp[mid].y)).toBeGreaterThan(0.95)
  })

  it('realD keeps the denominator EXACTLY real through a bound-on drag (real-rational family)', () => {
    const REAL_START = fromD1(C(14, 3), C(-6, 11), C(1.8, 0), { x: 70, y: -50 })
    const c0 = rationalPHExactFromParams(REAL_START)
    const sp = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const goal = { x: sp[2].x + 90, y: sp[2].y - 70 }
    let params = REAL_START
    let maxImW = 0
    for (let step = 1; step <= 25; step++) {
      const frac = step / 25
      const cps = rationalPHExactFromParams(params).controlPoints.map((p) => ({ x: p.re, y: p.im }))
      const targets = cps.map((p, i) => (i === 2 ? { x: sp[2].x + (goal.x - sp[2].x) * frac, y: sp[2].y + (goal.y - sp[2].y) * frac } : p))
      const w = targets.map((_, i) => (i === 2 ? 50 : i === 0 || i === cps.length - 1 ? 5 : 1))
      params = slideRationalPHExact(params, targets, { targetWeights: w, maxIterations: 50, preserveCurvatureExtrema: true, realD: true })
      maxImW = Math.max(maxImW, ...rationalPHExactFromParams(params).controlPoints.map((p) => Math.abs(p.w_im)))
    }
    expect(maxImW).toBe(0) // weights never gain an imaginary part
    expect(Math.abs(params.roots[0].im)).toBe(0) // root imaginary part pinned (±0)
  })

  it('stays STABLE over a long bound-on drag — no control point flung to infinity', () => {
    const STAB = fromD1(C(0.9, 0.1), C(0.6, 0.7), C(1.15, 0.2), { x: -1, y: 0 })
    const c0 = rationalPHExactFromParams(STAB)
    const startPos = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    let params = STAB
    let worstMax = 0
    for (let step = 1; step <= 40; step++) {
      const cps = rationalPHExactFromParams(params).controlPoints.map((p) => ({ x: p.re, y: p.im }))
      const ang = step * 0.5
      const targets = cps.map((p, i) => (i === 3 ? { x: startPos[3].x + 120 * Math.cos(ang), y: startPos[3].y + 120 * Math.sin(ang) } : p))
      const w = targets.map((_, i) => (i === 3 ? 10 : i === 0 || i === cps.length - 1 ? 5 : 1))
      params = slideRationalPHExact(params, targets, { targetWeights: w, maxIterations: 50, preserveCurvatureExtrema: true })
      const c1 = rationalPHExactFromParams(params)
      worstMax = Math.max(worstMax, ...c1.controlPoints.flatMap((p) => [Math.abs(p.re), Math.abs(p.im)]))
      expect(c1.wronskianResidual).toBeLessThan(1e-8)
    }
    expect(worstMax).toBeLessThan(2000)
  })

  it('holds the curvature-extrema bound S⁻(Ñ) non-increasing when preserving (Law 2)', () => {
    const c0 = rationalPHExactFromParams(START)
    const b0 = boundOf(c0)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    targets[mid] = { x: targets[mid].x + 1.4, y: targets[mid].y - 1.2 }
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))
    const c1 = rationalPHExactFromParams(slideRationalPHExact(START, targets, { targetWeights: weights, maxIterations: 80, preserveCurvatureExtrema: true }))
    expect(c1.wronskianResidual).toBeLessThan(1e-9)
    expect(boundOf(c1)).toBeLessThanOrEqual(b0)
  })

  it('drags a QUADRATIC-D quintic (degS 3, degD 2) — degree 5, stays exactly PH', () => {
    const quintic: RationalPHExactParams = {
      degS: 3, degD: 2, sFree: [C(-5, 8), C(3, -4)], roots: [C(1.7, 0.2), C(-0.6, 0.4)], origin: { x: 0, y: 0 },
    }
    const c0 = rationalPHExactFromParams(quintic)
    expect(c0.degree).toBe(5)
    expect(c0.controlPoints.length).toBe(6)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    targets[3] = { x: targets[3].x + 0.4, y: targets[3].y + 0.3 }
    const w = targets.map((_, i) => (i === 3 ? 10 : 1))
    const c1 = rationalPHExactFromParams(slideRationalPHExact(quintic, targets, { targetWeights: w, maxIterations: 60, preserveCurvatureExtrema: true }))
    expect(c1.degree).toBe(5)
    expect(c1.wronskianResidual).toBeLessThan(1e-7)
  })
})
