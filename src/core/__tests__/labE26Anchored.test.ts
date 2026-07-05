// ============================================================================
// E26-C — the ANCHORED ratio+CP Farin solve: one TR problem where the edge
// ratio is the cheap variable and the control points are Tikhonov-anchored.
// The anchor weight is a CONTINUOUS knob between the two Farin semantics, and
// the measured front (8-tick 43px pulls, edges 2/4/6, drag weight 10, raw
// bound held at EVERY cell) is:
//
//   anchor      f2          f4          f6          CP drift
//   A (pure)    12%         28%         12%         0 px      (farinDrag.ts)
//   10000       11%         21%         11%         0.2–2.8
//   2500         7%         42%         14%         0.9–6.3
//   500         13%         50%         39%         5.9–11.3
//   100         17%         64%         64%         8.9–15.3
//   20          53%         77%         72%         12–21
//   legacy B    59%         69%         58%         ~20       (labE26Legacy)
//
// anchor≈20 REPRODUCES legacy's reshape semantics on the core engine (bound
// held by the TR machinery + raw-count guard); anchor→∞ degenerates to the
// pure-weight drag; anchor≈100 is a balanced middle (≈64% tracking at half of
// legacy's drift on two of three edges; f2 is the hard edge and noisier —
// lab-grade FD Jacobian). Production would use exact CBDual/analytic columns.
// Kept SKIPPED (≈2–3 min); numbers above are the record. Eric picks the point.
// ============================================================================
import { it } from 'vitest'
import {
  curvatureExtremaNumeratorComplex, assignSignsNeighbor, cyclicSignChanges,
  computeInactiveSetBySign,
} from '../index'
import { TrustRegionBarrierOptimizer, TRSymmetricMatrix, type TrustRegionProblem, type TRMatrix } from '../trustRegionOptimizer'

const n = 10, degree = 3
const knots: number[] = []
for (let i = 0; i < 4; i++) knots.push(0)
for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
for (let i = 0; i < 4; i++) knots.push(1)
type CP = { re: number; im: number; w_re: number; w_im: number }
const mk = (): CP[] => Array.from({ length: n }, (_, i) => ({
  re: 40 + 28 * i, im: 120 + 70 * Math.sin((Math.PI * i) / 5),
  w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1),
}))
const cdiv2 = (a: {re:number;im:number}, b: {re:number;im:number}) => { const d = b.re*b.re+b.im*b.im; return { re:(a.re*b.re+a.im*b.im)/d, im:(a.im*b.re-a.re*b.im)/d } }

function qOfState(re: number[], im: number[], wRe: number[], wIm: number[], e: number) {
  const nre = wRe[e]*re[e] - wIm[e]*im[e] + wRe[e+1]*re[e+1] - wIm[e+1]*im[e+1]
  const nim = wRe[e]*im[e] + wIm[e]*re[e] + wRe[e+1]*im[e+1] + wIm[e+1]*re[e+1]
  return cdiv2({ re: nre, im: nim }, { re: wRe[e]+wRe[e+1], im: wIm[e]+wIm[e+1] })
}

function slideFarinAnchored(cps: CP[], edge: number, target: {x:number;y:number}, anchorW: number) {
  const nv = 2 * n + 2 // [re..., im..., sRe, sIm]
  const w0Re = cps.map(p => p.w_re), w0Im = cps.map(p => p.w_im)
  const weightsOf = (sRe: number, sIm: number) => {
    const wRe = w0Re.slice(), wIm = w0Im.slice()
    for (let j = edge + 1; j < n; j++) {
      const a = w0Re[j], b = w0Im[j]
      wRe[j] = a * sRe - b * sIm
      wIm[j] = a * sIm + b * sRe
    }
    return { wRe, wIm }
  }
  const gOf = (z: number[]) => {
    const { wRe, wIm } = weightsOf(z[2*n], z[2*n+1])
    return curvatureExtremaNumeratorComplex(z.slice(0, n), z.slice(n, 2*n), wRe, wIm, knots, degree).flatCoeffs()
  }
  const z0v = [...cps.map(p => p.re), ...cps.map(p => p.im), 1, 0]
  const gc0 = gOf(z0v)
  const rawCount = (gc: number[]) => cyclicSignChanges(assignSignsNeighbor(gc), false)
  const startBound = rawCount(gc0)
  const signsAll = assignSignsNeighbor(gc0)
  const inactive = computeInactiveSetBySign(signsAll, gc0.map(Math.abs))
  const active = gc0.map((_, i) => i).filter(i => !inactive.has(i) && gc0[i] !== 0)

  let z = z0v.slice()
  const DRAGW = 10
  const f0Of = (zz: number[]) => {
    const { wRe, wIm } = weightsOf(zz[2*n], zz[2*n+1])
    const q = qOfState(zz.slice(0, n), zz.slice(n, 2*n), wRe, wIm, edge)
    let sm = 0.5 * DRAGW * ((q.re - target.x)**2 + (q.im - target.y)**2)
    for (let i = 0; i < 2*n; i++) sm += 0.5 * anchorW * (zz[i] - z0v[i])**2
    return sm
  }
  const fOf = (zz: number[]) => {
    const gc = gOf(zz)
    return active.map(i => signsAll[i] * gc[i])
  }
  let atZ: { f: number[]; f0: number; g0: number[]; J: number[][] | null; JtJ: TRSymmetricMatrix | null } | null = null
  let cand: { dx: number[]; f: number[]; f0: number } | null = null
  const ensure = () => { if (!atZ) atZ = { f: fOf(z), f0: f0Of(z), g0: [], J: null, JtJ: null }; return atZ }
  const buildJ = () => {
    const a = ensure()
    if (a.J) return
    // constraint Jacobian: central FD per variable (lab-grade; production would use exact duals)
    const J: number[][] = active.map(() => new Array<number>(nv).fill(0))
    for (let c = 0; c < nv; c++) {
      const h = 1e-5 * (Math.abs(z[c]) + 1)
      const zp = z.slice(); zp[c] += h
      const zm = z.slice(); zm[c] -= h
      const gp = gOf(zp), gm = gOf(zm)
      for (let k = 0; k < active.length; k++) J[k][c] = signsAll[active[k]] * (gp[active[k]] - gm[active[k]]) / (2*h)
    }
    // objective gradient + GN Hessian: FD gradient of q part + analytic anchors
    const g0 = new Array<number>(nv).fill(0)
    const JtJ = new TRSymmetricMatrix(nv)
    // q residual Jacobian by FD on q (cheap function)
    const { wRe, wIm } = weightsOf(z[2*n], z[2*n+1])
    const q = qOfState(z.slice(0, n), z.slice(n, 2*n), wRe, wIm, edge)
    const rx = q.re - target.x, ry = q.im - target.y
    const qCols: { x: number; y: number }[] = []
    for (let c = 0; c < nv; c++) {
      const h = 1e-6 * (Math.abs(z[c]) + 1)
      const zp = z.slice(); zp[c] += h
      const wp = weightsOf(zp[2*n], zp[2*n+1])
      const qp = qOfState(zp.slice(0, n), zp.slice(n, 2*n), wp.wRe, wp.wIm, edge)
      qCols.push({ x: (qp.re - q.re) / h, y: (qp.im - q.im) / h })
    }
    for (let c = 0; c < nv; c++) {
      g0[c] = DRAGW * (rx * qCols[c].x + ry * qCols[c].y) + (c < 2*n ? anchorW * (z[c] - z0v[c]) : 0)
      for (let l = 0; l <= c; l++) {
        let v = DRAGW * (qCols[c].x * qCols[l].x + qCols[c].y * qCols[l].y)
        if (c === l && c < 2*n) v += anchorW
        JtJ.set(c, l, v)
      }
    }
    a.J = J; a.g0 = g0; a.JtJ = JtJ
  }
  const visit = (dx: number[]) => {
    if (cand && cand.dx === dx) return cand
    const zc = z.map((v, i) => v + dx[i])
    cand = { dx, f: fOf(zc), f0: f0Of(zc) }
    return cand
  }
  const problem: TrustRegionProblem = {
    get numberOfIndependentVariables() { return nv },
    get f0() { return ensure().f0 },
    get gradient_f0() { buildJ(); return ensure().g0 },
    get hessian_f0(): TRMatrix { buildJ(); return ensure().JtJ! },
    get numberOfConstraints() { return active.length },
    get f() { return ensure().f },
    get gradient_f(): TRMatrix { buildJ(); const J = ensure().J!; return { shape: [active.length, nv], get: (r, c) => J[r][c] } },
    step(dx: number[]) { z = z.map((v, i) => v + dx[i]); atZ = null; cand = null },
    fStep(dx: number[]) { return visit(dx).f },
    f0Step(dx: number[]) { return visit(dx).f0 },
  }
  try { new TrustRegionBarrierOptimizer(problem).optimize(10e-8, 10, 25) } catch { /* guard below */ }
  // strict raw-count guard along the straight z path
  const countAt = (zz: number[]) => rawCount(gOf(zz))
  if (countAt(z) > startBound) {
    let lo = 0, hi = 1
    for (let it = 0; it < 22; it++) {
      const mid = (lo + hi) / 2
      const zm = z0v.map((v, i) => v + mid * (z[i] - v))
      if (countAt(zm) <= startBound) lo = mid
      else hi = mid
    }
    z = z0v.map((v, i) => v + lo * (z[i] - v))
  }
  const { wRe, wIm } = weightsOf(z[2*n], z[2*n+1])
  return {
    cps: cps.map((_p, j) => ({ re: z[j], im: z[n + j], w_re: wRe[j], w_im: wIm[j] })),
    bound: countAt(z), startBound,
  }
}

it.skip('E26-C: anchored ratio+CP solve — the Pareto sweep (record above)', () => {
  for (const anchorW of [20, 100, 500, 2500, 10000]) {
    const lines: string[] = []
    for (const fi of [2, 4, 6]) {
      let cps = mk()
      const cps0 = mk()
      const q0 = qOfState(cps.map(p=>p.re), cps.map(p=>p.im), cps.map(p=>p.w_re), cps.map(p=>p.w_im), fi)
      const start = { x: q0.re, y: q0.im }
      const move = { x: 25, y: -35 }
      const startB0 = cyclicSignChanges(assignSignsNeighbor(curvatureExtremaNumeratorComplex(
        cps.map(p=>p.re), cps.map(p=>p.im), cps.map(p=>p.w_re), cps.map(p=>p.w_im), knots, degree).flatCoeffs()), false)
      let held = true
      for (let s = 1; s <= 8; s++) {
        const t = s / 8
        const r = slideFarinAnchored(cps, fi, { x: start.x + move.x * t, y: start.y + move.y * t }, anchorW)
        cps = r.cps
        if (r.bound > startB0) held = false
      }
      const q = qOfState(cps.map(p=>p.re), cps.map(p=>p.im), cps.map(p=>p.w_re), cps.map(p=>p.w_im), fi)
      const err = Math.hypot(q.re - (start.x + move.x), q.im - (start.y + move.y))
      const tracked = 100 - (100 * err) / Math.hypot(move.x, move.y)
      const cpDrift = Math.max(...cps.map((_p, j) => Math.hypot(cps[j].re - cps0[j].re, cps[j].im - cps0[j].im)))
      lines.push(`f${fi}: ${tracked.toFixed(0).padStart(3)}% drift ${cpDrift.toFixed(1).padStart(5)}px held=${held}`)
    }
    console.log(`E26-C anchor=${String(anchorW).padStart(5)}:  ${lines.join('   ')}`)
  }
}, 600000)
