// ============================================================================
// Rational PH curves in R^{4,1}: the geometric dictionary, the degree-3 circle, and the drag.
//
// The figure draws spheres and Farin beads and nothing else, so every one of those marks has
// to be a measured consequence of the defining conditions rather than a decoration.
//
// AND THE FIRST BLOCK EXISTS BECAUSE THE FIGURE SHIPPED WRONG ONCE. Its first version used
// degree 3 with guards for radii, weights, span and the denominator — and none for planarity.
// Eric looked at it and asked whether the curve was staying in a plane. It was: flat to 1e-9
// with curvature spread 0.000, a circular arc drawn under a caption about general rational PH
// cubics. So degree 3's confinement is now pinned as a FACT rather than left as a hazard, and
// the figure is degree 5.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import {
  controlPoints,
  curveAt,
  denominatorFloor,
  dragControlPoint,
  dragFarin,
  farinParameters,
  farinPoints,
  findMember,
  measuredSpeed,
  powerOfPoint,
  radii,
  residual,
  speedAt,
  weights,
  shapeMeasures,
  dragRadius,
  freeRadiusIndices,
  mobiusImage,
  farinVectors,
} from '../conformalPHCurve'
import { inversiveBendGenerator, matrixExp5, pointMap, project } from '../conformal'

// Degree 3 is confined to a CIRCLE by the null condition alone, so its guards must not ask
// for spatiality; degree 5 is the first degree where the family is genuinely spatial.
const CIRCLE = findMember(3)
const MEMBER = findMember(5)
const d2 = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b)) ** 2

describe('a non-degenerate member exists, and the guards are not cosmetic', () => {
  it('found one, on the family to machine zero', () => {
    expect(MEMBER).not.toBeNull()
    expect(Math.max(...residual(MEMBER!).map(Math.abs))).toBeLessThan(1e-11)
  })

  it('and it is genuinely non-degenerate: positive weights, real radii, a curve with extent', () => {
    const s = MEMBER!
    const w = weights(s)
    expect(Math.min(...w)).toBeGreaterThan(0)
    const P = controlPoints(s)
    const chord = vnorm(vsub(P[3], P[0]))
    const r = radii(s)
    expect(r[1] / chord).toBeGreaterThan(0.1)
    expect(r[2] / chord).toBeGreaterThan(0.1)
    // and the denominator never vanishes, so the pole is off the curve
    expect(denominatorFloor(s)).toBeGreaterThan(0)
  })

  it('IS a PH curve: h/w reproduces the measured speed', () => {
    for (const t of [0.15, 0.35, 0.5, 0.72, 0.9]) {
      const predicted = Math.abs(speedAt(MEMBER!, t))
      const actual = measuredSpeed(MEMBER!, t)
      expect(Math.abs(predicted - actual) / actual, `t=${t}`).toBeLessThan(1e-6)
    }
  })

  it('and its speed numerator is LINEAR at n=3 — the (n−2)/n law', () => {
    // h has degree n−2 = 1 at degree 3, so second differences of h vanish. At degree 5 it is
    // cubic instead, which is why this one is pinned on the degree-3 member.
    const s = CIRCLE!
    const ys = Array.from({ length: 7 }, (_, k) => {
      const t = k / 6
      const w = controlPointsWeightAt(s, t)
      return speedAt(s, t) * w
    })
    let d = ys.slice()
    for (let round = 0; round < 2; round++) d = d.slice(1).map((v, i) => v - d[i])
    expect(Math.max(...d.map(Math.abs)) / Math.max(...ys.map(Math.abs))).toBeLessThan(1e-9)
  })
})

/** w(t), needed only to strip the denominator off the speed. */
function controlPointsWeightAt(s: Parameters<typeof speedAt>[0], t: number): number {
  const w = weights(s)
  let p = [...w]
  while (p.length > 1) {
    const next: number[] = []
    for (let i = 0; i < p.length - 1; i++) next.push((1 - t) * p[i] + t * p[i + 1])
    p = next
  }
  return p[0]
}

describe('THE GEOMETRIC DICTIONARY at degree 3 — where every radius is determined', () => {
  const s = CIRCLE!
  const P = controlPoints(s)
  const w = weights(s)
  const r = radii(s)

  it('the two END control points are POINT-spheres: ρ₀ = ρ₃ = 0', () => {
    const chord = vnorm(vsub(P[3], P[0]))
    // 1e-5 rather than 1e-7: which seed the guards accept changes how tightly the solve
    // converged, and against a chord of 1 either reading is zero. The claim is ρ = 0, not a
    // particular residual.
    expect(Math.abs(r[0]) / chord).toBeLessThan(1e-5)
    expect(Math.abs(r[3]) / chord).toBeLessThan(1e-5)
  })

  it('THE LOAD-BEARING ONE: ρ₁ = ‖P₁−P₀‖ and ρ₂ = ‖P₂−P₃‖', () => {
    // So the spheres are drawn from the ordinary control polygon, with nothing stored.
    expect(Math.abs(r[1] - vnorm(vsub(P[1], P[0]))) / r[1]).toBeLessThan(1e-9)
    expect(Math.abs(r[2] - vnorm(vsub(P[2], P[3]))) / r[2]).toBeLessThan(1e-9)
  })

  it('each end sphere passes through its endpoint — the same fact, as a power', () => {
    expect(Math.abs(powerOfPoint(P[0], P[1], r[1])) / d2(P[0], P[3])).toBeLessThan(1e-9)
    expect(Math.abs(powerOfPoint(P[3], P[2], r[2])) / d2(P[0], P[3])).toBeLessThan(1e-9)
  })

  it('and the CROSS conditions: w₀w₂·pow(P₀,S₂) = 3w₁²ρ₁², mirrored', () => {
    const a = w[0] * w[2] * powerOfPoint(P[0], P[2], r[2])
    const b = 3 * w[1] * w[1] * r[1] * r[1]
    expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(1e-8)
    const c = w[1] * w[3] * powerOfPoint(P[3], P[1], r[1])
    const e = 3 * w[2] * w[2] * r[2] * r[2]
    expect(Math.abs(c - e) / Math.abs(e)).toBeLessThan(1e-8)
  })

  it('the spheres against the CHORD: w₀w₃‖P₀−P₃‖² + 9w₁w₂(‖P₁−P₂‖² − ρ₁² − ρ₂²) = 0', () => {
    const lhs = w[0] * w[3] * d2(P[0], P[3])
      + 9 * w[1] * w[2] * (d2(P[1], P[2]) - r[1] * r[1] - r[2] * r[2])
    const scale = Math.abs(w[0] * w[3] * d2(P[0], P[3])) + Math.abs(9 * w[1] * w[2] * d2(P[1], P[2]))
    expect(Math.abs(lhs) / scale).toBeLessThan(1e-9)
  })

  it('the Farin beads lie ON their legs, and encode the weights exactly', () => {
    const F = farinPoints(s)
    const lam = farinParameters(s)
    for (let i = 0; i < 3; i++) {
      // on the leg: F = (1−λ)Pᵢ + λPᵢ₊₁ with λ = wᵢ₊₁/(wᵢ+wᵢ₊₁)
      const onLeg = {
        x: (1 - lam[i]) * P[i].x + lam[i] * P[i + 1].x,
        y: (1 - lam[i]) * P[i].y + lam[i] * P[i + 1].y,
        z: (1 - lam[i]) * P[i].z + lam[i] * P[i + 1].z,
      }
      expect(vnorm(vsub(F[i], onLeg)), `leg ${i}`).toBeLessThan(1e-12)
      // strictly inside, since the weights all share a sign
      expect(lam[i], `leg ${i} inside`).toBeGreaterThan(0)
      expect(lam[i], `leg ${i} inside`).toBeLessThan(1)
    }
  })

  it('and a bead at ½ would mean equal weights — so off-centre IS the rationality', () => {
    const lam = farinParameters(s)
    // this member is genuinely rational, so at least one bead is visibly off centre
    expect(Math.max(...lam.map((v) => Math.abs(v - 0.5)))).toBeGreaterThan(0.02)
  })
})

// Editing is exercised at degree 5, where the figure lives. Degree 3 is a circular arc that
// must still pass through both pinned endpoints, so an interior drag there is far more
// constrained than the dimension count suggests — another way of saying the same confinement.

// ---------------------------------------------------------------------------
// DEGREE 3 IS A CIRCLE — pinned, because a figure was built on not knowing it
//
// Four coefficients span at most a 4-dimensional subspace V of R⁵, so V^⊥ holds a vector S
// and ⟨P(x),S⟩ = 0 confines every point of the curve to the single sphere S. Measured, the
// span collapses further to rank 3, which meets the null cone in a circle. This happens with
// the PH conditions REMOVED too, so it is the null condition doing it — PH only restricts how
// the circle is traversed.
// ---------------------------------------------------------------------------
describe('degree 3 is confined to a circle', () => {
  it('flat, and of constant curvature', () => {
    const m = shapeMeasures(CIRCLE!)
    expect(m.outOfPlane, 'out-of-plane / extent').toBeLessThan(1e-6)
    expect(m.curvatureSpread, 'curvature spread').toBeLessThan(1e-4)
  })

  it('and the coefficient span is RANK 3, which is why', () => {
    // Read from the gap, not a tolerance: σ = 2.3, 0.46, 0.17, 1.5e-8 on the found member.
    const rows = CIRCLE!.C.map((c) => [...c])
    const sv = columnNorms(rows)
    expect(sv[2] / sv[0], 'third σ is real').toBeGreaterThan(1e-3)
    expect(sv[3] / sv[2], 'fourth σ is not').toBeLessThan(1e-6)
  })

  it('all its radii are determined, so the spheres add no handles there', () => {
    expect(freeRadiusIndices(CIRCLE!)).toEqual([])
  })
})

/** Column norms after one-sided Jacobi — the singular values, accurate for the small ones. */
function columnNorms(Min: number[][]): number[] {
  const E = Min.length, U = Min[0].length
  const A = Min.map((r) => [...r])
  for (let sweep = 0; sweep < 120; sweep++) {
    let rotated = 0
    for (let p = 0; p < U; p++) {
      for (let q = p + 1; q < U; q++) {
        let app = 0, aqq = 0, apq = 0
        for (let i = 0; i < E; i++) { app += A[i][p] ** 2; aqq += A[i][q] ** 2; apq += A[i][p] * A[i][q] }
        if (app === 0 || aqq === 0 || Math.abs(apq) <= 1e-18 * Math.sqrt(app * aqq)) continue
        const z = (aqq - app) / (2 * apq)
        const t = Math.sign(z) / (Math.abs(z) + Math.sqrt(1 + z * z))
        const cs = 1 / Math.sqrt(1 + t * t), sn = cs * t
        for (let i = 0; i < E; i++) { const a = A[i][p], b = A[i][q]; A[i][p] = cs*a-sn*b; A[i][q] = sn*a+cs*b }
        rotated++
      }
    }
    if (rotated === 0) break
  }
  return Array.from({ length: U }, (_, k) => Math.hypot(...A.map((r) => r[k]))).sort((a, b) => b - a)
}

// ---------------------------------------------------------------------------
// DEGREE 5 — genuinely spatial, and the middle radii are real freedom
// ---------------------------------------------------------------------------
describe('degree 5 is what the figure uses', () => {
  it('a member exists, on the family, and is NOT flat or circular', () => {
    expect(MEMBER).not.toBeNull()
    expect(Math.max(...residual(MEMBER!).map(Math.abs))).toBeLessThan(1e-11)
    const m = shapeMeasures(MEMBER!)
    expect(m.outOfPlane, 'out-of-plane / extent').toBeGreaterThan(0.05)
    expect(m.curvatureSpread, 'curvature spread').toBeGreaterThan(0.05)
  })

  it('the OUTER spheres still touch the ends — the identity holds at every degree', () => {
    const P = controlPoints(MEMBER!)
    const r = radii(MEMBER!)
    const chord = vnorm(vsub(P[5], P[0]))
    expect(Math.abs(r[0]) / chord).toBeLessThan(1e-5)
    expect(Math.abs(r[5]) / chord).toBeLessThan(1e-5)
    expect(Math.abs(r[1] - vnorm(vsub(P[1], P[0]))) / r[1]).toBeLessThan(1e-8)
    expect(Math.abs(r[4] - vnorm(vsub(P[4], P[5]))) / r[4]).toBeLessThan(1e-8)
  })

  it('but the MIDDLE radii are NOT determined by the polygon — that is the new freedom', () => {
    expect(freeRadiusIndices(MEMBER!)).toEqual([2, 3])
    const P = controlPoints(MEMBER!)
    const r = radii(MEMBER!)
    // if they were pinned to a neighbour the way the outer ones are, these would match
    const chord = vnorm(vsub(P[5], P[0]))
    for (const i of [2, 3]) {
      const nearest = Math.min(
        ...[0, 1, 4, 5].map((k) => Math.abs(r[i] - vnorm(vsub(P[i], P[k])))),
      )
      expect(nearest / chord, `sphere ${i} is not pinned to a neighbour`).toBeGreaterThan(1e-3)
    }
  })

  it('and a middle radius can be DRAGGED, with the ends held', () => {
    const s = MEMBER!
    const r0 = radii(s)[2]
    const step = dragRadius(s, 2, r0 * 1.25)
    expect(step.converged).toBe(true)
    expect(step.defect).toBeLessThan(1e-9)
    expect(Math.abs(radii(step.state)[2] - r0 * 1.25) / r0).toBeLessThan(1e-5)
    const P = controlPoints(s), after = controlPoints(step.state)
    const chord = vnorm(vsub(P[5], P[0]))
    expect(vnorm(vsub(after[0], P[0])) / chord).toBeLessThan(1e-6)
    expect(vnorm(vsub(after[5], P[5])) / chord).toBeLessThan(1e-6)
  })

  it('five legs, five beads', () => {
    expect(farinPoints(MEMBER!)).toHaveLength(5)
    expect(farinParameters(MEMBER!)).toHaveLength(5)
  })

  it('dragging an interior control point tracks the cursor', () => {
    const s = MEMBER!
    const P = controlPoints(s)
    const chord = vnorm(vsub(P[5], P[0]))
    let state = s
    let worst = 0
    for (let k = 1; k <= 5; k++) {
      const target = {
        x: P[2].x + 0.05 * k * chord,
        y: P[2].y + 0.03 * k * chord,
        z: P[2].z - 0.02 * k * chord,
      }
      const step = dragControlPoint(state, 2, target)
      expect(step.converged, `step ${k}`).toBe(true)
      state = step.state
      worst = Math.max(worst, step.trackingError / chord)
    }
    expect(worst, 'tracking').toBeLessThan(0.02)
  })
})

describe('degree 5 editing: the Farin beads', () => {
  it('sliding a bead is a weight edit, with the ends held and the curve changing', () => {
    const s = MEMBER!
    const P = controlPoints(s)
    const before = farinParameters(s)
    // A drag is a SEQUENCE of small warm-started steps, because dragFarin rate-limits each
    // call to 0.03 — without that the curve appeared to explode when the cursor's projection
    // onto the leg jumped most of the way along it in one event.
    const target = before[2] > 0.5 ? before[2] - 0.09 : before[2] + 0.09
    let step = dragFarin(s, 2, target)
    for (let k = 0; k < 6; k++) {
      expect(step.converged, `tick ${k}`).toBe(true)
      expect(step.defect, `tick ${k}`).toBeLessThan(1e-9)
      step = dragFarin(step.state, 2, target)
    }
    expect(Math.abs(farinParameters(step.state)[2] - target)).toBeLessThan(1e-6)
    const chord = vnorm(vsub(P[5], P[0]))
    for (const k of [0, 5]) {
      expect(vnorm(vsub(controlPoints(step.state)[k], P[k])) / chord, `end ${k}`).toBeLessThan(1e-6)
    }
    let moved = 0
    for (let k = 1; k < 20; k++) {
      const a = curveAt(s, k / 20), b = curveAt(step.state, k / 20)
      if (a && b) moved = Math.max(moved, vnorm(vsub(a, b)) / chord)
    }
    expect(moved, 'the curve responded').toBeGreaterThan(1e-3)
  })

  it('and the beads are strictly inside their legs, so every weight ratio is positive', () => {
    for (const lam of farinParameters(MEMBER!)) {
      expect(lam).toBeGreaterThan(0)
      expect(lam).toBeLessThan(1)
    }
  })
})

// ---------------------------------------------------------------------------
// MÖBIUS COVARIANCE — the whole control structure maps, one point for one point
//
// This is what the conformal model was for. On slide 10 a Möbius transformation turned 8
// control points into 15 and the polygon had to be rebuilt from the lift, because the Hopf
// representation is affine- but not Möbius-covariant. Here M is a constant matrix acting on
// each Cₖ independently, and everything drawn survives it.
// ---------------------------------------------------------------------------
describe('Möbius covariance of the conformal control structure', () => {
  const BEND = { x: 0.7, y: -0.4, z: 0.3 }
  const M = matrixExp5(inversiveBendGenerator(BEND))
  const IMAGE = mobiusImage(MEMBER!, M)

  it('Fᵢ = project(Cᵢ + Cᵢ₊₁) — the Farin bead is ONE ADDITION in the model', () => {
    const F = farinPoints(MEMBER!)
    const V = farinVectors(MEMBER!)
    for (let i = 0; i < F.length; i++) {
      expect(vnorm(vsub(project(V[i]) as Vec3, F[i])), `bead ${i}`).toBeLessThan(1e-12)
    }
  })

  it('the image is still in the family — and h is UNTOUCHED', () => {
    // ⟨P′,P′⟩ = h² and M preserves the inner product, so the speed NUMERATOR is a Möbius
    // invariant. Only the weight changes, and that is the conformal factor.
    expect(Math.max(...residual(IMAGE).map(Math.abs))).toBeLessThan(1e-11)
    expect(IMAGE.h).toEqual(MEMBER!.h)
  })

  it('spheres stay spheres, and the ends stay POINT-spheres', () => {
    const r = radii(IMAGE)
    const P = controlPoints(IMAGE)
    const chord = vnorm(vsub(P[5], P[0]))
    expect(Math.abs(r[0]) / chord).toBeLessThan(1e-6)
    expect(Math.abs(r[5]) / chord).toBeLessThan(1e-6)
    for (const i of [1, 2, 3, 4]) expect(r[i], `sphere ${i} is real`).toBeGreaterThan(0)
    // and the outer ones still grip their endpoints — the identity is Möbius-invariant too
    expect(Math.abs(r[1] - vnorm(vsub(P[1], P[0]))) / r[1]).toBeLessThan(1e-7)
    expect(Math.abs(r[4] - vnorm(vsub(P[4], P[5]))) / r[4]).toBeLessThan(1e-7)
  })

  it('the beads of the image ARE the images of the beads', () => {
    const V = farinVectors(IMAGE)
    const F = farinPoints(IMAGE)
    for (let i = 0; i < F.length; i++) {
      expect(vnorm(vsub(project(V[i]) as Vec3, F[i])), `bead ${i}`).toBeLessThan(1e-12)
    }
  })

  it('and the image curve is μ∘(the original curve), pointwise', () => {
    const mu = pointMap(M)
    for (let k = 1; k < 20; k++) {
      const a = mu(curveAt(MEMBER!, k / 20) as Vec3) as Vec3
      const b = curveAt(IMAGE, k / 20) as Vec3
      expect(vnorm(vsub(a, b)), `t=${k / 20}`).toBeLessThan(1e-12)
    }
  })

  it('exp(−G) undoes exp(G), so a slider is reversible', () => {
    const back = mobiusImage(IMAGE, matrixExp5(inversiveBendGenerator({ x: -BEND.x, y: -BEND.y, z: -BEND.z })))
    const P = controlPoints(MEMBER!), Q = controlPoints(back)
    for (let k = 0; k < P.length; k++) {
      expect(vnorm(vsub(P[k], Q[k])), `point ${k}`).toBeLessThan(1e-9)
    }
  })
})
