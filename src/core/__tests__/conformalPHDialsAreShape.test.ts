// ============================================================================
// ARE THE FIVE DIALS GENUINELY FIVE SHAPES? Eric asked whether one of the degrees of freedom is
// really just a reparametrisation — the same suspicion that turned out to be RIGHT for slide 13's
// dial, so it deserves the same test rather than an argument.
//
// The measurement has to be the IMAGE distance: one-sided nearest point against a fine reference,
// not curveAt(t) against curveAt(t). A reparametrisation moves same-parameter samples a long way
// while leaving the point set alone — on slide 13's gauge dial the image drifted 2.6e-3 (the
// sampling floor) while same-parameter points moved 0.56, and reading the second number as motion is
// exactly how that dial fooled us. The dial test in conformalPHStructure.test.ts uses the
// same-parameter distance, so it could not have caught this; that is why this file exists.
//
// A second, independent tell: a reparametrisation preserves TOTAL arc length while shifting it
// between the halves. So L₁ and L₂ are precisely where a gauge direction could hide, and the total
// is the thing to watch.
//
// Measured, riding each dial to 1.25× its value with the C¹ Hermite data held:
//
//   rho_2      IMAGE 2.6e-1   same-parameter 2.6e-1   total length 3.1468 -> 3.3929
//   rho_3      IMAGE 1.6e-1   same-parameter 1.6e-1   total length 3.1468 -> 3.2948
//   rho_4      IMAGE 2.8e-1   same-parameter 2.9e-1   total length 3.1468 -> 3.3933
//   L(0,1/2)   IMAGE 2.3e-1   same-parameter 2.5e-1   total length 3.1468 -> 3.6422
//   L(1/2,1)   IMAGE 4.7e-1   same-parameter 4.7e-1   total length 3.1468 -> 3.6832
//
// Image drift equals same-parameter drift for every dial, so the motion is shape and not sliding;
// and every dial changes the TOTAL length, which a reparametrisation cannot. None of the five is a
// gauge direction. (Pinning the data is what makes this so: d₀ = n(w₁/w₀)(P₁−P₀) scales by λ under
// wₖ ↦ λᵏwₖ, so holding d₀ fixes λ = 1 and the reparametrisation is not available inside the slice.)
// ============================================================================
import { it, expect } from 'vitest'
import {
  type ConformalPHCurve, type StrictCoordinate, arcLength, curveAt, dragStrict,
  farinParameters, freeRadiusIndices, hermiteDataOf, radii,
} from '../conformalPHCurve'
import { sexticSeed } from '../conformalPHSeeds'
it('is any of the five dials a reparametrisation?', () => {
  const s = sexticSeed()
  const REF = Array.from({ length: 801 }, (_, k) => curveAt(s, k / 800)!)
  const extent = Math.max(...REF.flatMap((p, i) => i ? [Math.hypot(p.x-REF[0].x,p.y-REF[0].y,p.z-REF[0].z)] : [0]))
  const dials: StrictCoordinate[] = [
    ...freeRadiusIndices(s).map((index) => ({ kind: 'radius', index }) as StrictCoordinate),
    { kind: 'length', from: 0, to: 0.5 }, { kind: 'length', from: 0.5, to: 1 },
  ]
  const val = (c: ConformalPHCurve, d: StrictCoordinate) =>
    d.kind === 'radius' ? radii(c)[d.index] : arcLength(c, 8, d.from ?? 0, d.to ?? 1)
  const data = hermiteDataOf(s)
  for (const d of dials) {
    const goal = val(s, d) * 1.25
    let cur = s
    for (let k = 0; k < 8; k++) {
      const step = dragStrict(cur, d, goal, { data, lengthSamples: 8 })
      if (!step.converged) break
      cur = step.state
    }
    let img = 0, same = 0
    for (let k = 0; k <= 200; k++) {
      const p = curveAt(cur, k / 200)!, q = curveAt(s, k / 200)!
      same = Math.max(same, Math.hypot(p.x-q.x, p.y-q.y, p.z-q.z))
      let near = Infinity
      for (const r of REF) near = Math.min(near, Math.hypot(p.x-r.x, p.y-r.y, p.z-r.z))
      img = Math.max(img, near)
    }
    const total = arcLength(cur, 256)
    const label = d.kind === 'radius' ? `rho_${d.index}` : `L(${d.from},${d.to})`
    console.log(
      `${label.padEnd(10)} IMAGE drift ${(img/extent).toExponential(1)}` +
      `   same-parameter ${(same/extent).toExponential(1)}` +
      `   total length ${arcLength(s,256).toFixed(4)} -> ${total.toFixed(4)}` +
      `   beads ${farinParameters(cur).map(v=>v.toFixed(2)).join(' ')}`)
    expect(img/extent, `${label} genuinely changes the IMAGE`).toBeGreaterThan(1e-2)
  }
})
