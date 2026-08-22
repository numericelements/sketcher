// ============================================================================
// DRAGGING A LIFTED HARD CURVE — it works, and that is exactly the problem.
//
// The rate test (singularDirectionScaling.test.ts) showed that the uniform lift of an all-hard
// curve is a SINGULAR point of the conformal variety, and that Moré's augmented QR converges onto
// it where the normal equations stall. The obvious next question is whether that gives an editor a
// solver for the hard case. It does not, and the reason is worth having in a test rather than in a
// memory:
//
//   1. THE ALL-HARD LIFT ALREADY DRAGS, with the solver we have had all along — 100% tracking,
//      defect 2e-13, eleven iterations, 3 ms. Nothing was ever stuck.
//
//   2. IT DRAGS BY LEAVING THE STRATUM. Poles hhhhhh before, ssssss after. The singular locus has
//      positive codimension, so a generic step leaves it, and hardness is not preserved by any
//      unconstrained solve. The lab preset note for lift8g already said this in words — "touch it
//      and the doubled pole SPLITS into eight genuine poles, every one soft, with no way back" —
//      and here it is as a number.
//
//   3. THE QR STEP DOES NOT HELP A DRAG. It fixed an unconstrained convergence-RATE measurement,
//      where the whole difficulty was resolving a 1e-8 singular direction. A drag adds pinned rows
//      by central difference and is limited by those long before κ matters. Measured on the one
//      specimen that genuinely fails, the awkward lift8: 62.7% tracking with the normal equations,
//      44.5% with QR. Slightly WORSE, and neither reaches the variety (defect 1e-2).
//
//   4. AND lift8 FAILS FOR THE OTHER REASON ENTIRELY — the degree SHORTFALL. Its denominator is
//      genuinely degree 1 inside a degree-4 basis, so δ = 2 comes from solving in the elevated
//      space, which §12 of the document already identified as an artifact with a construction fix:
//      solve in the true degree profile. Not something a linear solver can repair.
//
// SO WHAT WOULD A SOLVER FOR THE HARD CASE HAVE TO DO? Hold the curve ON the singular stratum,
// which means carrying the hardness condition as an explicit constraint (W′(r) = 0 at each pole),
// not navigating better. And the alternative worth weighing first: in the PROJECTIVE model hard
// poles are GENERIC — nothing there forces the numerator isotropic — so the same curve is a smooth
// point. The practical reading is not "build a singular-point solver" but "do not lift a hard curve
// to edit it."
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  definingJacobian, residual, pack, unpack, unknownCount, degreeOf, normalize,
  controlPoints, type ConformalPHCurve,
} from '../conformalPHCurve'
import { leastSquares } from '../linalg'
import { readPoles } from '../poleReadout'
import { conformalAsRat, PRESETS, randomHardRat } from '../../talks/ph-interpolation/poleLabPresets'
import { liftToConformal } from '../conformalLift'
import { bernsteinToPower } from '../conformalPHHopf'
import { type Rat } from '../nurbsPH'
import { vnorm, vsub, type Vec3 } from '../quaternion'


function qrSolve(A: readonly (readonly number[])[], b: readonly number[]): number[] {
  const m = A.length, n = A[0].length
  const R = A.map((row) => [...row])
  const y = [...b]
  for (let k = 0; k < n; k++) {
    let norm = 0
    for (let i = k; i < m; i++) norm += R[i][k] ** 2
    norm = Math.sqrt(norm)
    if (norm === 0) continue
    const alpha = R[k][k] > 0 ? -norm : norm
    const v = new Array<number>(m).fill(0)
    for (let i = k; i < m; i++) v[i] = R[i][k]
    v[k] -= alpha
    const vn = Math.hypot(...v)
    if (vn === 0) continue
    for (let i = k; i < m; i++) v[i] /= vn
    for (let j = k; j < n; j++) {
      let d = 0
      for (let i = k; i < m; i++) d += v[i] * R[i][j]
      for (let i = k; i < m; i++) R[i][j] -= 2 * d * v[i]
    }
    let d = 0
    for (let i = k; i < m; i++) d += v[i] * y[i]
    for (let i = k; i < m; i++) y[i] -= 2 * d * v[i]
  }
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let acc = y[i]
    for (let j = i + 1; j < n; j++) acc -= R[i][j] * x[j]
    x[i] = R[i][i] === 0 ? 0 : acc / R[i][i]
  }
  return x
}
const lmQR = (J: number[][], r: readonly number[], lambda: number): number[] => {
  const n = J[0].length
  const sq = Math.sqrt(lambda)
  return qrSolve(
    [...J.map((row) => [...row]),
      ...Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? sq : 0)))],
    [...r.map((v) => -v), ...new Array<number>(n).fill(0)])
}

/** solveWith, parameterised by the linear solver — the ONLY difference between the two runs. */
function drag(
  from: ConformalPHCurve, index: number, target: Vec3,
  solver: 'normal' | 'qr', iterations: number,
) {
  const UNKNOWNS = unknownCount(degreeOf(from))
  const last = degreeOf(from)
  const before = controlPoints(from)
  const held = [0, last].filter((i) => i !== index)
  const extra = (s: ConformalPHCurve): number[] => {
    const P = controlPoints(s)
    const out = [P[index].x - target.x, P[index].y - target.y, P[index].z - target.z]
    for (const i of held) out.push(P[i].x - before[i].x, P[i].y - before[i].y, P[i].z - before[i].z)
    return out
  }
  const full = (x: readonly number[]): number[] => {
    const s = unpack(x)
    return [...residual(s), ...extra(s)]
  }
  let x = pack(from)
  const E = full(x).length
  let its = 0
  for (let it = 0; it < iterations; it++) {
    const r = full(x)
    const nr = Math.hypot(...r)
    if (nr < 1e-13) break
    const base = definingJacobian(unpack(x))
    const J: number[][] = Array.from({ length: E }, (_, e) =>
      e < base.length ? base[e].slice() : new Array<number>(UNKNOWNS).fill(0))
    const h = 1e-7
    for (let c = 0; c < UNKNOWNS; c++) {
      const xp = x.slice(); xp[c] += h
      const xm = x.slice(); xm[c] -= h
      const rp = extra(unpack(xp)), rm = extra(unpack(xm))
      for (let e = 0; e < rp.length; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * h)
    }
    let step: number[]
    if (solver === 'normal') {
      try { step = leastSquares(J, r.map((v) => -v), 1e-11) } catch { break }
    } else {
      // row- and column-equilibrated, then the augmented QR
      const rowScale = J.map((row) => Math.hypot(...row) || 1)
      const A0 = J.map((row, i) => row.map((v) => v / rowScale[i]))
      const dcol = A0[0].map((_, j) => Math.hypot(...A0.map((row) => row[j])) || 1)
      step = lmQR(A0.map((row) => row.map((v, j) => v / dcol[j])),
        r.map((v, i) => v / rowScale[i]), 1e-20).map((v, j) => v / dcol[j])
    }
    let lam = 1, moved = false
    for (let bt = 0; bt < 24; bt++) {
      const trial = x.map((v, i) => v + lam * step[i])
      if (trial.every(Number.isFinite) && Math.hypot(...full(trial)) < nr) { x = trial; moved = true; break }
      lam *= 0.5
    }
    if (!moved) break
    its = it + 1
  }
  const s = normalize(unpack(x))
  return {
    state: s, iterations: its,
    defect: Math.max(...residual(s).map(Math.abs)),
    tracking: vnorm(vsub(controlPoints(s)[index], target)),
  }
}

const liftOf = (rat: Rat): ConformalPHCurve => liftToConformal(
  bernsteinToPower(rat.w),
  [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i]))),
  bernsteinToPower(rat.rho),
).state
const verdicts = (s: ConformalPHCurve): string =>
  readPoles(conformalAsRat(s)).map((p) => p.verdict[0]).join('')

describe('dragging a lifted hard curve', () => {
  it('tracks the cursor perfectly, and leaves the hard stratum doing it', () => {
    const ctlRat = randomHardRat(3, 9004)
    if (!ctlRat) throw new Error('the control seed no longer converges')
    const st = liftOf(ctlRat)
    expect(verdicts(st), 'every pole of the lift is hard to begin with').toBe('hhhhhh')

    const P = controlPoints(st)
    const n = degreeOf(st)
    const idx = Math.floor(n / 2)
    const chord = vnorm(vsub(P[n], P[0]))
    const target: Vec3 = { x: P[idx].x + 0.2 * chord, y: P[idx].y + 0.1 * chord, z: P[idx].z - 0.1 * chord }
    const want = vnorm(vsub(target, P[idx]))

    for (const solver of ['normal', 'qr'] as const) {
      const got = drag(st, idx, target, solver, 60)
      console.log(`    ${solver === 'normal' ? 'normal equations' : 'augmented QR    '}` +
        ` tracked ${(100 * (1 - got.tracking / want)).toFixed(1)}%  defect ${got.defect.toExponential(1)}` +
        `  its ${got.iterations}  poles ${verdicts(got.state)}`)
      expect(got.tracking / want, `${solver}: the point reaches the cursor`).toBeLessThan(1e-6)
      expect(got.defect, `${solver}: and the curve is still a member`).toBeLessThan(1e-9)
      expect(verdicts(got.state), `${solver}: but every pole went SOFT — the stratum was left`).toBe('ssssss')
    }
  }, 300_000)

  it('and the QR step does not rescue the one drag that genuinely fails', () => {
    // lift8: the λ-chart quartic in the Möbius model. Its denominator is degree 1 inside a degree-4
    // basis, so its δ is degree SHORTFALL, which §12 fixes by solving in the true degree profile —
    // not by better linear algebra. Both solvers stop far from the cursor and far from the variety.
    const st = PRESETS.find((p) => p.id === 'lift8')?.conformal
    if (!st) throw new Error('missing lift8')
    const P = controlPoints(st)
    const n = degreeOf(st)
    const idx = Math.floor(n / 2)
    const chord = vnorm(vsub(P[n], P[0]))
    const target: Vec3 = { x: P[idx].x + 0.2 * chord, y: P[idx].y + 0.1 * chord, z: P[idx].z - 0.1 * chord }
    const want = vnorm(vsub(target, P[idx]))
    const results: Record<string, number> = {}
    for (const solver of ['normal', 'qr'] as const) {
      const got = drag(st, idx, target, solver, 60)
      results[solver] = got.defect
      console.log(`    ${solver === 'normal' ? 'normal equations' : 'augmented QR    '}` +
        ` tracked ${(100 * (1 - got.tracking / want)).toFixed(1)}%  defect ${got.defect.toExponential(1)}` +
        `  its ${got.iterations}  poles ${verdicts(got.state)}`)
      expect(got.defect, `${solver}: never reaches the variety`).toBeGreaterThan(1e-4)
    }
    expect(results.qr, 'QR is no better here — this failure is not about conditioning')
      .toBeGreaterThan(0.3 * results.normal)
  }, 300_000)
})
