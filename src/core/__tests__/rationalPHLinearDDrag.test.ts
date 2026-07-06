import { describe, it, expect } from 'vitest'
import {
  rationalPHLinearDFromParams,
  type RationalPHLinearDParams,
} from '../rationalPHLinearD'
import { slideRationalPHLinearD } from '../rationalPHLinearDDrag'
import { rationalPHBound } from '../rationalPHCurvature'

// The drag on the exactly-PH linear-D family. The defining property: because the curve is
// reconstructed exactly from the params on every step, the drag CANNOT leave the PH manifold —
// no soft residual, no drift. So we pin (1) PH stays exact through a drag, (2) an unconstrained
// drag actually tracks the cursor, (3) a bound-on drag holds S⁻(Ñ) non-increasing (Law 2).

const START: RationalPHLinearDParams = {
  s0: { re: 0.9, im: 0.1 }, s2: { re: 0.6, im: 0.7 }, d1: { re: 1.15, im: 0.2 }, origin: { x: -1, y: 0 },
}
const sDegOf = (c: { sReCPs: number[] }) => c.sReCPs.length - 1
const boundOf = (c: ReturnType<typeof rationalPHLinearDFromParams>) =>
  rationalPHBound(c.sReCPs, c.sImCPs, c.sKnots, sDegOf(c), c.dReCPs, c.dImCPs, c.dKnots, 1)

describe('exactly-PH linear-D drag', () => {
  it('stays EXACTLY PH through a drag (reconstruction never leaves the manifold)', () => {
    const c0 = rationalPHLinearDFromParams(START)
    // Nudge the middle control point toward a new location; others hold their positions.
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    targets[mid] = { x: targets[mid].x + 0.6, y: targets[mid].y + 0.5 }
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))

    const moved = slideRationalPHLinearD(START, targets, { targetWeights: weights, maxIterations: 60 })
    const c1 = rationalPHLinearDFromParams(moved)
    expect(c1.wronskianResidual).toBeLessThan(1e-9) // still a true PH curve
  })

  it('tracks the cursor (unconstrained) — the dragged point gets closer to its target', () => {
    const c0 = rationalPHLinearDFromParams(START)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    const target = { x: targets[mid].x + 0.6, y: targets[mid].y + 0.5 }
    targets[mid] = target
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))

    const before = Math.hypot(c0.controlPoints[mid].re - target.x, c0.controlPoints[mid].im - target.y)
    const moved = slideRationalPHLinearD(START, targets, { targetWeights: weights, maxIterations: 80 })
    const c1 = rationalPHLinearDFromParams(moved)
    const after = Math.hypot(c1.controlPoints[mid].re - target.x, c1.controlPoints[mid].im - target.y)
    expect(after).toBeLessThan(before * 0.7) // meaningfully closer
  })

  it('tracks ~fully over an INCREMENTAL bound-on drag (the real interactive case)', () => {
    // A single giant jump under the bound only tracks partially, but real dragging is many small
    // steps that accumulate — each tick starts near-feasible and the sequence converges. Pin that.
    const c0 = rationalPHLinearDFromParams(START)
    const sp = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = 2
    const goal = { x: sp[mid].x + 90, y: sp[mid].y - 70 }
    let params = START
    for (let step = 1; step <= 25; step++) {
      const frac = step / 25
      const cps = rationalPHLinearDFromParams(params).controlPoints.map((p) => ({ x: p.re, y: p.im }))
      const targets = cps.map((p, i) => (i === mid ? { x: sp[mid].x + (goal.x - sp[mid].x) * frac, y: sp[mid].y + (goal.y - sp[mid].y) * frac } : p))
      const w = targets.map((_, i) => (i === mid ? 50 : i === 0 || i === cps.length - 1 ? 5 : 1))
      params = slideRationalPHLinearD(params, targets, { targetWeights: w, maxIterations: 50, preserveCurvatureExtrema: true })
    }
    const end = rationalPHLinearDFromParams(params)
    const err = Math.hypot(end.controlPoints[mid].re - goal.x, end.controlPoints[mid].im - goal.y)
    const total = Math.hypot(goal.x - sp[mid].x, goal.y - sp[mid].y)
    expect(1 - err / total).toBeGreaterThan(0.95) // reached the cursor
  })

  it('stays STABLE over a long bound-on drag — no control point flung to infinity', () => {
    // Regression for the divergence blow-up: without PH equality constraints the solve can
    // diverge and return a garbage iterate (control points at ~1e5) while curve+bound stay valid.
    // returnBestFeasible (in slideRationalPHLinearD) hands back the best feasible iterate instead.
    const c0 = rationalPHLinearDFromParams(START)
    const startPos = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    let params = START
    let worstMax = 0
    for (let step = 1; step <= 40; step++) {
      const cps = rationalPHLinearDFromParams(params).controlPoints.map((p) => ({ x: p.re, y: p.im }))
      const ang = step * 0.5
      const targets = cps.map((p, i) => (i === 3 ? { x: startPos[3].x + 120 * Math.cos(ang), y: startPos[3].y + 120 * Math.sin(ang) } : p))
      const w = targets.map((_, i) => (i === 3 ? 10 : i === 0 || i === cps.length - 1 ? 5 : 1))
      params = slideRationalPHLinearD(params, targets, { targetWeights: w, maxIterations: 50, preserveCurvatureExtrema: true })
      const c1 = rationalPHLinearDFromParams(params)
      worstMax = Math.max(worstMax, ...c1.controlPoints.flatMap((p) => [Math.abs(p.re), Math.abs(p.im)]))
      expect(c1.wronskianResidual).toBeLessThan(1e-8)
    }
    expect(worstMax).toBeLessThan(2000) // control points stay in a sane range (blow-up was ~2e5)
  })

  it('holds the curvature-extrema bound S⁻(Ñ) non-increasing when preserving (Law 2)', () => {
    const c0 = rationalPHLinearDFromParams(START)
    const b0 = boundOf(c0)
    const targets = c0.controlPoints.map((p) => ({ x: p.re, y: p.im }))
    const mid = Math.floor(targets.length / 2)
    // A large, curvature-provoking pull.
    targets[mid] = { x: targets[mid].x + 1.4, y: targets[mid].y - 1.2 }
    const weights = targets.map((_, i) => (i === mid ? 10 : 1))

    const moved = slideRationalPHLinearD(START, targets, {
      targetWeights: weights, maxIterations: 80, preserveCurvatureExtrema: true,
    })
    const c1 = rationalPHLinearDFromParams(moved)
    expect(c1.wronskianResidual).toBeLessThan(1e-9)
    expect(boundOf(c1)).toBeLessThanOrEqual(b0) // bound never climbs
  })
})
