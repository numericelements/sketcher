import { describe, it, expect } from 'vitest'
import {
  slide, familyBound, poly, rational, complex, type WeightedCP,
  slideOpenPHTracking, slideClosedPHTracking,
  curvatureExtremaNumeratorPH, curvatureExtremaNumeratorPlanarPeriodic,
  assignSignsNeighbor, cyclicSignChanges,
  generatorBasisGram, closureGap,
} from '../index'
import { computePHCurveFromUV as corePHCurve } from '../phCurveConstruction'
import { fitClosedPHSpline, computePHCurveFromUV } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// THE STALL CENSUS (lab notebook; feeds E13 + E12). A systematic map of drag
// tracking across family × topology × size × solver, on one standardized hard
// pull, with the bound asserted (Law 2) in every cell. Purpose: name WHERE the
// post-E10 solvers still stall, so E13 can ask WHY with specimens, and E12 can
// check the stall cells for precision-flipped signs. Results table lives in
// LAB_NOTEBOOK_DRAG.md. Slowish (~minutes) — run explicitly:
//   npx vitest run src/core/__tests__/stallCensus.test.ts

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)
const d = 3

function makeCurve(family: 'polynomial' | 'rational' | 'complex', n: number): WeightedCP[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    const x = 180 * Math.cos(a) + 12 * Math.sin(3 * a)
    const y = 95 * Math.sin(a) + 9 * Math.cos(2 * a)
    if (family === 'polynomial') return poly(x, y)
    if (family === 'rational') return rational(x, y, 1 + 0.15 * Math.cos(2 * a))
    return complex(x, y, 1 + 0.1 * Math.cos(a), 0.06 * Math.sin(a))
  })
}

function censusDrag(
  family: 'polynomial' | 'rational' | 'complex',
  topo: 'open' | 'closed',
  n: number,
  solver: 'ipopt' | 'primal-dual',
): string {
  const knots = topo === 'open' ? openKnots(n, d) : periodicKnots(n)
  let cps = makeCurve(family, n)
  const k = Math.floor(n / 3)
  const sx = cps[k].re, sy = cps[k].im
  const target = { x: sx + 55, y: sy + 200 }
  const moveLen = Math.hypot(55, 200)
  const start = familyBound(family, cps, knots, d, topo)
  let maxB = start
  const t0 = performance.now()
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    cps = slide(family, cps, knots, d, topo, k,
      { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t },
      { solver, jacobian: family === 'polynomial' ? 'ad' : 'analytic', maxIterations: 20 }).points
    maxB = Math.max(maxB, familyBound(family, cps, knots, d, topo))
  }
  const ms = (performance.now() - t0) / 15
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  const tracked = 100 - (100 * err) / moveLen
  expect(maxB, `${family}/${topo}/n${n}/${solver}: bound rose`).toBeLessThanOrEqual(start)
  return `CENSUS ${family.padEnd(10)} ${topo.padEnd(6)} n=${String(n).padStart(2)} ${solver.padEnd(11)} tracked ${tracked.toFixed(0).padStart(4)}%  bound ${start}->${maxB}  ${ms.toFixed(0).padStart(4)}ms/tick`
}

describe('stall census', () => {
  it('algebraic families × topology × size × solver', () => {
    const rows: string[] = []
    for (const family of ['polynomial', 'rational', 'complex'] as const) {
      for (const topo of ['open', 'closed'] as const) {
        for (const n of [8, 16, 32]) {
          for (const solver of ['ipopt', 'primal-dual'] as const) {
            rows.push(censusDrag(family, topo, n, solver))
          }
        }
      }
    }
    console.log('\n' + rows.join('\n'))
  }, 600000)

  it('spot check n=56 (ipopt only — cost)', () => {
    const rows: string[] = []
    for (const family of ['rational'] as const) {
      for (const topo of ['open', 'closed'] as const) {
        rows.push(censusDrag(family, topo, 56, 'ipopt'))
      }
    }
    console.log('\n' + rows.join('\n'))
  }, 600000)

  it('open PH (editor pipeline)', () => {
    const rows: string[] = []
    for (const segs of [6, 12, 24]) {
      const dg = 2
      const knots: number[] = []
      for (let i = 0; i <= dg; i++) knots.push(0)
      for (let i = 1; i < segs; i++) knots.push(i / segs)
      for (let i = 0; i <= dg; i++) knots.push(1)
      const nGen = segs + dg
      let u = Array.from({ length: nGen }, (_, i) => 20 + 4 * Math.cos(0.7 * i) + 0.5 * i)
      let v = Array.from({ length: nGen }, (_, i) => 3 * Math.sin(0.9 * i) - 0.3 * i)
      let x0 = 0, y0 = 0
      const boundOf = (uu: number[], vv: number[]) =>
        cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPH(uu, vv, knots, dg, false).flatCoeffs()), false)
      const start = boundOf(u, v)
      let maxB = start
      const curve0 = corePHCurve(u, v, knots, dg, x0, y0)
      const k = Math.min(4, curve0.controlPoints.length - 2)
      const sx = curve0.controlPoints[k].x, sy = curve0.controlPoints[k].y
      const move = { x: 90, y: -70 }
      const t0 = performance.now()
      for (let s = 1; s <= 10; s++) {
        const f = s / 10
        const cur = corePHCurve(u, v, knots, dg, x0, y0)
        const r = slideOpenPHTracking(u, v, x0, y0, knots, dg, cur.controlPoints, k, sx + move.x * f, sy + move.y * f, { maxIterations: 30 })
        u = r.u; v = r.v; x0 = r.x0; y0 = r.y0
        maxB = Math.max(maxB, boundOf(u, v))
      }
      const ms = (performance.now() - t0) / 10
      const fin = corePHCurve(u, v, knots, dg, x0, y0)
      const err = Math.hypot(fin.controlPoints[k].x - (sx + move.x), fin.controlPoints[k].y - (sy + move.y))
      const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
      expect(maxB, `openPH segs=${segs}: bound rose`).toBeLessThanOrEqual(start)
      rows.push(`CENSUS ph-open    nGen=${String(nGen).padStart(2)} (curveCP≈${fin.controlPoints.length})      tracked ${tracked.toFixed(0).padStart(4)}%  bound ${start}->${maxB}  ${ms.toFixed(0).padStart(4)}ms/tick`)
    }
    console.log('\n' + rows.join('\n'))
  }, 600000)

  it('closed PH (editor pipeline: refit target + decoupled closure)', () => {
    const rows: string[] = []
    for (const nPts of [16, 24, 32]) {
      const pts: Point2D[] = []
      for (let i = 0; i < nPts; i++) {
        const a = (2 * Math.PI * i) / nPts
        pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
      }
      const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
      let ph = fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
      let m = ph.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number }; seamContinuity?: number; wrapSign?: number }
      const seamContinuity = m.seamContinuity ?? 2
      const wrapSign = m.wrapSign ?? 1
      const dragIdx = Math.min(4, ph.controlPoints.length - 1)
      const sx = ph.controlPoints[dragIdx].x, sy = ph.controlPoints[dragIdx].y
      const move = { x: 70, y: -55 }
      const curveBound = (cp: Point2D[], kn: number[], dg: number) =>
        cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(cp.map(p => p.x), cp.map(p => p.y), kn, dg).flatCoeffs()), true)
      const start = curveBound(ph.controlPoints as Point2D[], ph.knots, ph.degree)
      let maxB = start
      const t0 = performance.now()
      let ok = true
      for (let s = 1; s <= 10; s++) {
        const f = s / 10
        const cursor = { x: sx + move.x * f, y: sy + move.y * f }
        const edited = (ph.controlPoints as Point2D[]).map((p, i) => (i === dragIdx ? cursor : { x: p.x, y: p.y }))
        const refit = fitClosedPHSpline(edited, ph.degree, ph.knots, { genKnots: m.uvKnots, seamContinuity })
        if (!refit) { ok = false; break }
        const rm = refit.metadata as typeof m
        const target = computePHCurveFromUV(rm.uControlPoints, rm.vControlPoints, rm.uvKnots, rm.uvDegree, rm.origin.x, rm.origin.y)
        const r = slideClosedPHTracking(
          m.uControlPoints, m.vControlPoints, m.origin.x, m.origin.y, m.uvKnots, m.uvDegree,
          target.controlPoints, { wrapSign, seamContinuity }, { maxIterations: 24, decoupleClosure: true },
        )
        const G = generatorBasisGram(m.uvKnots, m.uvDegree, r.u.length)
        const gap = closureGap(r.u, r.v, G)
        expect(Math.hypot(gap.re, gap.im), `closedPH n=${nPts} step ${s}: not closed`).toBeLessThan(1e-5)
        const built = corePHCurve(r.u, r.v, m.uvKnots, m.uvDegree, r.x0, r.y0)
        // carry the generator forward (metadata origin/uv updated)
        m = { ...m, uControlPoints: r.u, vControlPoints: r.v, origin: { x: r.x0, y: r.y0 } }
        ph = { ...ph, controlPoints: built.controlPoints } as typeof ph
        maxB = Math.max(maxB, curveBound(built.controlPoints as Point2D[], built.knots, built.degree))
      }
      const ms = (performance.now() - t0) / 10
      const fin = ph.controlPoints[dragIdx] as Point2D
      const err = Math.hypot(fin.x - (sx + move.x), fin.y - (sy + move.y))
      const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
      rows.push(`CENSUS ph-closed  nCP=${String(ph.controlPoints.length).padStart(2)} ${ok ? '' : '(refit failed)'}      tracked ${tracked.toFixed(0).padStart(4)}%  curveBound ${start}->${maxB}(raw, pre-editor-guard)  ${ms.toFixed(0).padStart(4)}ms/tick`)
    }
    console.log('\n' + rows.join('\n'))
  }, 600000)
})
