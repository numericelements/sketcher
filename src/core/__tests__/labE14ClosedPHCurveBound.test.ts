import { it } from 'vitest'
import {
  computePHCurveFromUV as corePHCurve, buildPeriodicPHCurve, projectClosurePH,
  generatorBasisGram, closureGap,
  curvatureExtremaNumeratorPlanarPeriodic, assignSignsNeighbor, cyclicSignChanges,
  computeInactiveSetBySignCyclic,
  TrustRegionBarrierOptimizer, TRDiagonalMatrix, type TrustRegionProblem, type TRMatrix,
} from '../index'
import { fitClosedPHSpline, computePHCurveFromUV } from '../../sketcher/optimizer/phCurve'
import { createBSpline } from '../../sketcher/utils/bspline/utilities'
import type { Point2D } from '../../sketcher/types/curve'

// E14a (lab notebook): does putting the CURVE-SPAN (periodic-rep, editor-identical)
// bound INSIDE the closed-PH tracking solve fix the census pathology (nCP=51:
// tracking −30%, raw curve bound 8→26)? Trust-region engine over generator vars
// [x0,y0,u,v]; constraints = RAW Eric-regime rows of the periodic curve numerator
// (pure signs, cyclic anchor active set, no scale/margins); closure DECOUPLED
// (Eric's design): solve → projectClosurePH, two passes. FD Jacobians (bench-only).

function census16gon() {
  const pts: Point2D[] = []
  for (let i = 0; i < 16; i++) {
    const a = (2 * Math.PI * i) / 16
    pts.push({ x: 170 * Math.cos(a) + 16 * Math.sin(3 * a), y: 95 * Math.sin(a) - 10 * Math.cos(2 * a) })
  }
  const bs = createBSpline(pts, 3, true) as { controlPoints: Point2D[]; degree: number; knots: number[] }
  return fitClosedPHSpline(bs.controlPoints, bs.degree, bs.knots)!
}

// lab bench (FD Jacobians, ~10s) — remove .skip to rerun
it.skip('E14a: curve-span bound inside the closed-PH tracking solve', () => {
  const ph = census16gon()
  const m0 = ph.metadata as { uControlPoints: number[]; vControlPoints: number[]; uvKnots: number[]; uvDegree: number; origin: { x: number; y: number }; seamContinuity?: number; wrapSign?: number }
  const seamContinuity = m0.seamContinuity ?? 2
  const wrapSign = m0.wrapSign ?? 1
  const uvKnots = m0.uvKnots, uvDeg = m0.uvDegree
  const N = m0.uControlPoints.length
  const G = generatorBasisGram(uvKnots, uvDeg, N)

  // ---- precompute the LINEAR clamped→periodic operator P (fixed knots) ----
  const probe = corePHCurve(m0.uControlPoints, m0.vControlPoints, uvKnots, uvDeg, m0.origin.x, m0.origin.y)
  const M = probe.controlPoints.length
  const per0 = buildPeriodicPHCurve(probe.controlPoints as Point2D[], probe.knots, seamContinuity)
  const nPer = per0.controlPoints.length
  const P: number[][] = [] // nPer × M, same operator for x and y (affine: subtract base)
  {
    const zero = probe.controlPoints.map(() => ({ x: 0, y: 0 }))
    const base = buildPeriodicPHCurve(zero as Point2D[], probe.knots, seamContinuity)
    for (let j = 0; j < M; j++) {
      const e = probe.controlPoints.map((_, i) => ({ x: i === j ? 1 : 0, y: 0 }))
      const out = buildPeriodicPHCurve(e as Point2D[], probe.knots, seamContinuity)
      P.push(out.controlPoints.map((p, r) => p.x - base.controlPoints[r].x))
    }
  }
  const perOf = (clamped: { x: number; y: number }[]) => {
    const xs = new Array<number>(nPer).fill(0)
    const ys = new Array<number>(nPer).fill(0)
    for (let j = 0; j < M; j++) {
      const col = P[j]
      for (let r = 0; r < nPer; r++) { xs[r] += col[r] * clamped[j].x; ys[r] += col[r] * clamped[j].y }
    }
    return { xs, ys }
  }
  const perBound = (clamped: { x: number; y: number }[]) => {
    const { xs, ys } = perOf(clamped)
    return cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorPlanarPeriodic(xs, ys, per0.knots, per0.degree).flatCoeffs()), true)
  }

  // ---- state ----
  let u = m0.uControlPoints.slice(), v = m0.vControlPoints.slice()
  let x0 = m0.origin.x, y0 = m0.origin.y
  const dragIdx = Math.min(4, M - 1)
  const start0 = probe.controlPoints[dragIdx]
  const move = { x: 70, y: -55 }
  const startBound = perBound(probe.controlPoints)
  let maxRawBound = startBound
  const t0all = performance.now()

  for (let s = 1; s <= 10; s++) {
    const f = s / 10
    const cursor = { x: start0.x + move.x * f, y: start0.y + move.y * f }
    // editor-faithful target: refit with dragged CP at cursor
    const curNow = corePHCurve(u, v, uvKnots, uvDeg, x0, y0)
    const edited = curNow.controlPoints.map((p, i) => (i === dragIdx ? cursor : { x: p.x, y: p.y }))
    const tickU = u.slice(), tickV = v.slice()
    const tickStartBound = perBound(curNow.controlPoints)
    // REFIT-FREE target policy: the generic drag's objective — dragged curve CP to
    // the cursor, every other CP anchored at its tick-start position. (The refit
    // target measured bound 10 vs start 8 from tick 1: it MANUFACTURES extrema,
    // making full tracking infeasible under the start bound by construction.)
    const target = { controlPoints: edited }

    const margins = new Map<number, number>()
    for (let pass = 0; pass < 2; pass++) {
      // ---- TR problem over z = [x0,y0,u,v] with curve-span RAW constraints ----
      let z = [x0, y0, ...u, ...v]
      const buildClamped = (zz: number[]) => corePHCurve(zz.slice(2, 2 + N), zz.slice(2 + N), uvKnots, uvDeg, zz[0], zz[1]).controlPoints
      const gPer = (zz: number[]) => {
        const { xs, ys } = perOf(buildClamped(zz))
        return curvatureExtremaNumeratorPlanarPeriodic(xs, ys, per0.knots, per0.degree).flatCoeffs()
      }
      const gc0 = gPer(z)
      const signsAll = gc0.map((val) => (val > 0 ? -1 : 1))
      const inactive = computeInactiveSetBySignCyclic(assignSignsNeighbor(gc0), gc0.map(Math.abs))
      const active = gc0.map((_, i) => i).filter((i) => !inactive.has(i) && gc0[i] !== 0)
      // Safety margin against the bound-blind closure projection: require
      // s*g <= -marginRow so the projection's small perturbation stays inside.
      const fOf = (zz: number[]) => {
        const gc = gPer(zz)
        return active.map((i) => signsAll[i] * gc[i] + (margins.get(i) ?? 0))
      }
      const f0Of = (zz: number[]) => {
        const c = buildClamped(zz)
        let ssum = 0
        for (let i = 0; i < M; i++) {
          const dx = c[i].x - target.controlPoints[i].x
          const dy = c[i].y - target.controlPoints[i].y
          ssum += 0.5 * (dx * dx + dy * dy)
        }
        return ssum
      }
      const nz = z.length
      const fdVec = (fn: (zz: number[]) => number, zz: number[]) => {
        const g = new Array<number>(nz)
        for (let j = 0; j < nz; j++) {
          const h = 1e-6 * (Math.abs(zz[j]) + 1)
          const zp = zz.slice(); zp[j] += h
          const zm = zz.slice(); zm[j] -= h
          g[j] = (fn(zp) - fn(zm)) / (2 * h)
        }
        return g
      }
      let cachedF: number[] | null = null
      let cachedJ: number[][] | null = null
      const problem: TrustRegionProblem = {
        get numberOfIndependentVariables() { return nz },
        get f0() { return f0Of(z) },
        get gradient_f0() { return fdVec(f0Of, z) },
        get hessian_f0() { return new TRDiagonalMatrix(new Array<number>(nz).fill(1)) },
        get numberOfConstraints() { return active.length },
        get f() { if (!cachedF) cachedF = fOf(z); return cachedF },
        get gradient_f(): TRMatrix {
          if (!cachedJ) {
            const J: number[][] = active.map(() => new Array<number>(nz).fill(0))
            for (let j = 0; j < nz; j++) {
              const h = 1e-6 * (Math.abs(z[j]) + 1)
              const zp = z.slice(); zp[j] += h
              const zm = z.slice(); zm[j] -= h
              const fp = fOf(zp), fm = fOf(zm)
              for (let r = 0; r < active.length; r++) J[r][j] = (fp[r] - fm[r]) / (2 * h)
            }
            cachedJ = J
          }
          const J = cachedJ
          return { shape: [active.length, nz], get: (r, c) => J[r][c] }
        },
        step(dx: number[]) { z = z.map((val, i) => val + dx[i]); cachedF = null; cachedJ = null },
        fStep(dx: number[]) { return fOf(z.map((val, i) => val + dx[i])) },
        f0Step(dx: number[]) { return f0Of(z.map((val, i) => val + dx[i])) },
      }
      try {
        new TrustRegionBarrierOptimizer(problem).optimize(10e-8, 10, 30)
      } catch { /* keep committed steps */ }
      x0 = z[0]; y0 = z[1]; u = z.slice(2, 2 + N); v = z.slice(2 + N)
      // decoupled closure (Eric's design)
      const gBefore = gPer([x0, y0, ...u, ...v])
      const pr = projectClosurePH(u, v, uvKnots, uvDeg, seamContinuity, wrapSign, G)
      u = pr.u; v = pr.v
      // measure the projection's per-row perturbation of g; next pass keeps
      // 2x that as slack on rows that are anywhere near their walls
      const gAfter = gPer([x0, y0, ...u, ...v])
      for (const i of active) {
        const d = Math.abs(gAfter[i] - gBefore[i])
        margins.set(i, Math.max(margins.get(i) ?? 0, 1.2 * d))
      }
    }
    // EDITOR GUARD (faithful): if the raw result's curve bound rose vs tick start,
    // bisect the GENERATOR path from tick start, re-projecting closure per trial.
    {
      const rawBuilt = corePHCurve(u, v, uvKnots, uvDeg, x0, y0)
      if (perBound(rawBuilt.controlPoints) > tickStartBound) {
        const buildAt = (a: number) => {
          const ua = tickU.map((val, i) => val + a * (u[i] - val))
          const va = tickV.map((val, i) => val + a * (v[i] - val))
          const pra = projectClosurePH(ua, va, uvKnots, uvDeg, seamContinuity, wrapSign, G)
          return { u: pra.u, v: pra.v, x: x0, y: y0 }
        }
        let lo = 0, hi = 1
        for (let it = 0; it < 20; it++) {
          const mid = (lo + hi) / 2
          const cand = buildAt(mid)
          const bb = perBound(corePHCurve(cand.u, cand.v, uvKnots, uvDeg, cand.x, cand.y).controlPoints)
          if (bb <= tickStartBound) lo = mid
          else hi = mid
        }
        const kept = buildAt(lo)
        u = kept.u; v = kept.v
      }
    }
    const built = corePHCurve(u, v, uvKnots, uvDeg, x0, y0)
    const rawB = perBound(built.controlPoints)
    maxRawBound = Math.max(maxRawBound, rawB)
    const gap = closureGap(u, v, G)
    if (s === 10 || rawB > startBound) {
      console.log(`E14a tick ${s}: rawCurveBound ${rawB}/${startBound}  closureGap ${Math.hypot(gap.re, gap.im).toExponential(1)}`)
    }
  }
  const fin = corePHCurve(u, v, uvKnots, uvDeg, x0, y0)
  const err = Math.hypot(fin.controlPoints[dragIdx].x - (start0.x + move.x), fin.controlPoints[dragIdx].y - (start0.y + move.y))
  const tracked = 100 - 100 * err / Math.hypot(move.x, move.y)
  console.log(`E14a RESULT nCP=${M}: tracked ${tracked.toFixed(0)}%  maxRawCurveBound ${maxRawBound}/${startBound}  ${(((performance.now() - t0all)) / 10).toFixed(0)}ms/tick   (E14a first pass: 39%, raw bound 8->10; census: -30%, 8->12)`)
}, 600000)
