import { it } from 'vitest'
import { CurvatureDragProblem, familyBound, rational, complexCurvatureConstraintState, cyclicSignChanges, type WeightedCP } from '../index'
import '../../../../../../numericelements/git/closed-curve/src/models/CurveModel3d'
import { Optimizer } from '../../../../../../numericelements/git/closed-curve/src/optimizers/Optimizer'
import { DenseMatrix } from '../../../../../../numericelements/git/closed-curve/src/linearAlgebra/DenseMatrix'
import { identityMatrix } from '../../../../../../numericelements/git/closed-curve/src/linearAlgebra/DiagonalMatrix'

// E15c: Eric's solver on CORE'S problem at n=8/16/32 (E7 at scale).
// ~100% -> core solver internals are the scale defect. ~6% -> the formulation
// (fixed weights / constraint set) is what breaks at scale, and E1(n=7) doesn't generalize.
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

class CoreProblemForEric {
  constructor(private core: CurvatureDragProblem) {}
  get numberOfIndependentVariables() { return this.core.numVariables }
  get f0() { return this.core.computeObjective() }
  get gradient_f0() { return this.core.computeObjectiveGradient() }
  get hessian_f0() { return identityMatrix(this.core.numVariables) }
  get numberOfConstraints() { return this.core.numConstraints }
  get f() {
    const sg = this.core.getConstraintSigns()
    return this.core.computeConstraints().map((v, i) => sg[i] * v)
  }
  get gradient_f() {
    const sg = this.core.getConstraintSigns()
    const J = this.core.computeConstraintJacobian()
    const m = new DenseMatrix(J.length, this.core.numVariables)
    for (let r = 0; r < J.length; r++) for (let c = 0; c < J[r].length; c++) m.set(r, c, sg[r] * J[r][c])
    return m
  }
  hessian_f = undefined
  step(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    this.core.updateConstraintState()
  }
  fStep(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    const sg = this.core.getConstraintSigns()
    const out = this.core.computeConstraints().map((v, i) => sg[i] * v)
    this.core.setVariables(x)
    return out
  }
  f0Step(dx: number[]) {
    const x = this.core.getVariables()
    this.core.setVariables(x.map((v, i) => v + dx[i]))
    const out = this.core.computeObjective()
    this.core.setVariables(x)
    return out
  }
}

// lab bench (minutes) — remove .skip to rerun
it.skip('E15c: Eric solver + core problem, size column', () => {
  for (const nn of [8, 16, 32]) {
    const knots = openKnots(nn)
    let cps = mk(nn)
    const k = Math.floor(nn / 3)
    const sx = cps[k].re, sy = cps[k].im
    const target = { x: sx + 55, y: sy + 200 }
    const start = familyBound('rational', cps, knots, d, 'open')
    let maxB = start, throws = 0
    const t0 = performance.now()
    for (let s = 1; s <= 15; s++) {
      const t = s / 15
      const tick = { x: sx + (target.x - sx) * t, y: sy + (target.y - sy) * t }
      try {
        const core = new CurvatureDragProblem('rational', cps, knots, d, 'open', k, tick,
          cps.map(p => p.wRe), cps.map(p => p.wIm), 'analytic', { re: 1, im: 0 }, {})
        new Optimizer(new CoreProblemForEric(core) as never).optimize_using_trust_region(1e-8, 10, 50)
        cps = core.result()
      } catch { throws++ }
      maxB = Math.max(maxB, familyBound('rational', cps, knots, d, 'open'))
    }
    const ms = (performance.now() - t0) / 15
    const err = Math.hypot(cps[k].re - target.x, cps[k].im - target.y)
    console.log(`E15c ERIC-SOLVER/CORE-PROBLEM n=${String(nn).padStart(2)}: tracked ${(100 - 100 * err / Math.hypot(55, 200)).toFixed(0).padStart(4)}%  bound ${start}->${maxB}  throws ${throws}/15  ${ms.toFixed(0)}ms/tick`)
  }
}, 600000)
