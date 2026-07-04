import { it } from 'vitest'
import {
  familyBound, familyNumerator, rational, type WeightedCP,
  CurvatureDragProblem, assignSignsNeighbor, computeInactiveSetBySign,
  enforceBoundNonincreasing,
} from '../index'
import { InteriorPointOptimizer } from '../ipopt/InteriorPointOptimizer'

// E15 (subtraction experiment): replace the scaled/margin/noise-floor regime in the
// generic drag with ERIC'S RAW FORMULATION — signs = pure sign(g) (his
// computeConstraintsSign), scale = 1, margins = 0; the ONLY exclusion is
// coefficients EXACTLY === 0 (an honest test, not a threshold). Same sliding
// active-set rule (his and core's are identical). If raw >= scaled, the regime
// introduced in the assistant era is deletable.

const d = 3
const openKnots = (nn: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const mk = (nn: number): WeightedCP[] => Array.from({ length: nn }, (_, i) => {
  const a = (2 * Math.PI * i) / nn
  return rational(180 * Math.cos(a) + 12 * Math.sin(3 * a), 95 * Math.sin(a) + 9 * Math.cos(2 * a), 1 + 0.15 * Math.cos(2 * a))
})

// Raw-regime state override (test-local; production untouched).
function makeRawProblem(cps: WeightedCP[], knots: number[], k: number, tick: { x: number; y: number }) {
  const p = new CurvatureDragProblem('rational', cps, knots, d, 'open', k, tick,
    cps.map(q => q.wRe), cps.map(q => q.wIm), 'analytic', { re: 1, im: 0 }, {})
  const gc = familyNumerator('rational', cps, knots, d, 'open', { re: 1, im: 0 }).flatCoeffs()
  // Eric's sign rule: g>0 -> -1 else +1; exclusion ONLY for exact zeros.
  const signsAll = gc.map(v => (v > 0 ? -1 : 1))
  // same sliding active-set construction as both codebases (largest-|g| anchor per run)
  const inactive = computeInactiveSetBySign(assignSignsNeighbor(gc), gc.map(Math.abs))
  const active = gc.map((_, i) => i).filter(i => !inactive.has(i) && gc[i] !== 0)
  const anyP = p as unknown as { activeIdx: number[]; signs: number[]; gScale: number[]; margins: number[] }
  anyP.activeIdx = active
  anyP.signs = active.map(i => signsAll[i])
  anyP.gScale = active.map(() => 1)
  anyP.margins = active.map(() => 0)
  return p
}

function runRaw(nn: number, iters: number) {
  const knots = openKnots(nn)
  let cps = mk(nn)
  const k = Math.floor(nn / 3)
  const sx = cps[k].re, sy = cps[k].im
  const target = { x: sx + 55, y: sy + 200 }
  const start = familyBound('rational', cps, knots, d, 'open')
  let maxB = start
  const t0 = performance.now()
  for (let s = 1; s <= 15; s++) {
    const t = s / 15
    const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
    const p = makeRawProblem(cps, knots, k, tick)
    const r = new InteriorPointOptimizer(p, { maxIterations: iters, enableBFGS: false, returnBestFeasible: true }).optimize()
    p.setVariables(r.variables)
    const raw = p.result()
    const before = cps
    cps = enforceBoundNonincreasing(
      before, raw,
      (q: readonly WeightedCP[]) => familyBound('rational', q, knots, d, 'open'),
      (a: number) => before.map((q, i) => ({ re: q.re + a * (raw[i].re - q.re), im: q.im + a * (raw[i].im - q.im), wRe: q.wRe, wIm: q.wIm })),
    )
    maxB = Math.max(maxB, familyBound('rational', cps, knots, d, 'open'))
  }
  const ms = (performance.now() - t0) / 15
  const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
  return { tracked: 100 - 100 * err / Math.hypot(55, 200), maxB, start, ms }
}

// lab bench (minutes) — remove .skip to rerun
it.skip('E15: raw (Eric) regime vs scaled regime, open rational column', () => {
  for (const nn of [8, 16, 32]) {
    for (const iters of [20, 200]) {
      const r = runRaw(nn, iters)
      console.log(`E15 RAW n=${String(nn).padStart(2)} @${String(iters).padStart(3)}: tracked ${r.tracked.toFixed(0).padStart(4)}%  bound ${r.start}->${r.maxB}  ${r.ms.toFixed(0)}ms/tick   (scaled baseline @20: ${nn === 8 ? '46' : nn === 16 ? '17' : '6'}%)`)
    }
  }
}, 600000)
