import { it } from 'vitest'
import { complexCurvatureConstraintState, cyclicSignChanges } from '../index'
import '../../../../../../numericelements/git/closed-curve/src/models/CurveModel3d'
import { RationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/bsplines/R1toR2/RationalBSplineR1toR2'
import { Vector3d } from '../../../../../../numericelements/git/closed-curve/src/mathVector/Vector3d'
import { OpRationalBSplineR1toR2 } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/OpRationalBSplineR1toR2'
import { ActiveControl } from '../../../../../../numericelements/git/closed-curve/src/optimizationProblems/BaseOpBSplineR1toR2'
import { Optimizer } from '../../../../../../numericelements/git/closed-curve/src/optimizers/Optimizer'

// E15b: Eric's own optimizer on the SIZE column (open rational n=8/16/32).
// If his stack also collapses at n=32, the low number is the TRUE feasible wall
// of the (loose) bound at that size — not a core defect.
const d = 3
const openKnots = (nn: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = nn - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const dispBound = (x: number[], y: number[], w: number[], knots: number[]) => {
  const { signs } = complexCurvatureConstraintState(x, y, w, w.map(() => 0), knots, d, false, { re: 1, im: 0 })
  return cyclicSignChanges(signs, false)
}

// lab bench (minutes) — remove .skip to rerun
it.skip('E15b: Eric stack on the size column', () => {
  for (const nn of [8, 16, 32]) {
    const knots = openKnots(nn)
    const X: number[] = [], Y: number[] = [], W: number[] = []
    for (let i = 0; i < nn; i++) {
      const a = (2 * Math.PI * i) / nn
      X.push(180 * Math.cos(a) + 12 * Math.sin(3 * a))
      Y.push(95 * Math.sin(a) + 9 * Math.cos(2 * a))
      W.push(1 + 0.15 * Math.cos(2 * a))
    }
    const k = Math.floor(nn / 3)
    const target = { x: X[k] + 55, y: Y[k] + 200 }
    let spline = new RationalBSplineR1toR2(X.map((x, i) => new Vector3d(x * W[i], Y[i] * W[i], W[i])), knots)
    const start = dispBound(X, Y, W, knots)
    let maxB = start, throws = 0
    const t0 = performance.now()
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const tick = { x: X[k] + (target.x - X[k]) * t, y: Y[k] + (target.y - Y[k]) * t }
      try {
        const cps = spline.controlPoints
        const w = cps[k].z
        const targetCps = cps.map((p, i) => i === k ? new Vector3d(tick.x * w, tick.y * w, w) : p)
        const problem = new OpRationalBSplineR1toR2(new RationalBSplineR1toR2(targetCps, knots), spline.clone(), ActiveControl.curvatureExtrema)
        new Optimizer(problem).optimize_using_trust_region(1e-8, 10, 50)
        spline = problem.spline
      } catch { throws++ }
      const cur = spline.controlPoints
      maxB = Math.max(maxB, dispBound(cur.map(p => p.x / p.z), cur.map(p => p.y / p.z), cur.map(p => p.z), knots))
    }
    const ms = (performance.now() - t0) / 15
    const cur = spline.controlPoints
    const err = Math.hypot(cur[k].x / cur[k].z - target.x, cur[k].y / cur[k].z - target.y)
    console.log(`E15b ERIC n=${String(nn).padStart(2)} @50steps: tracked ${(100 - 100 * err / Math.hypot(55, 200)).toFixed(0).padStart(4)}%  bound ${start}->${maxB}  throws ${throws}/15  ${ms.toFixed(0)}ms/tick`)
  }
}, 600000)
