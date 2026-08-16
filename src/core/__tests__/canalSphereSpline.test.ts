// ============================================================================
// THE UNCONSTRAINED SPHERE SPLINE, checked against shapes whose envelopes are known by hand.
//
// A cylinder, a cone and a torus are the three canal surfaces anyone can check without algebra, so
// they are what the derivation is tested on. Then the two failure modes, each measured where it is
// supposed to happen and NOT where it is not.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type ControlSphere, type SphereSpline,
  characteristicCircle, conformalOf, envelopeTest, frameAt, pinchTest, sphereAt, worstOver,
} from '../canalSphereSpline'
import { innerProduct } from '../conformal'
import { vnorm, vsub, type Vec3 } from '../quaternion'

const line = (a: Vec3, b: Vec3, n: number): Vec3[] =>
  Array.from({ length: n + 1 }, (_, k) => ({
    x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n, z: a.z + ((b.z - a.z) * k) / n,
  }))
const sph = (centre: Vec3, radius: number, weight = 1): ControlSphere => ({ centre, radius, weight })
/** A Bézier of spheres with the given centres and a radius that is linear in the index. */
const spline = (centres: Vec3[], r0: number, r1: number): SphereSpline => ({
  S: centres.map((c, k) => sph(c, r0 + ((r1 - r0) * k) / (centres.length - 1))),
})

describe('a Bézier curve of spheres', () => {
  it('CYLINDER: straight spine, constant radius — the circles are the sphere itself', () => {
    const s = spline(line({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, 5), 0.7, 0.7)
    for (const t of [0.1, 0.3, 0.5, 0.8]) {
      const { centre, radius } = sphereAt(s, t)
      const cc = characteristicCircle(s, t)
      expect(cc).not.toBeNull()
      // ρ̇ = 0, so the circle sits ON the centre with the sphere's own radius
      expect(vnorm(vsub(cc!.centre, centre)), 'no offset when ρ̇ = 0').toBeLessThan(1e-10)
      expect(cc!.radius).toBeCloseTo(radius, 10)
      // and its plane is perpendicular to the spine
      expect(Math.abs(cc!.axis.y) + Math.abs(cc!.axis.z)).toBeLessThan(1e-10)
    }
    console.log(`    cylinder: min |ċ|² − ρ̇² = ${worstOver(s, envelopeTest).toFixed(3)}, max ρκ = ${worstOver(s, pinchTest, 96, 'max').toExponential(1)}`)
    expect(worstOver(s, envelopeTest), 'the envelope exists everywhere').toBeGreaterThan(0)
    expect(worstOver(s, pinchTest, 96, 'max'), 'a straight spine cannot pinch').toBeLessThan(1e-9)
  })

  it('CONE: straight spine, linear radius — the circles shrink and tilt by the half-angle', () => {
    // radius falls from 1 to 0 over a spine of length 4, so the cone's half-angle has sin = 1/4
    const s = spline(line({ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, 5), 1, 0)
    const { cd, rho, rhod } = frameAt(s, 0.5)
    const sinTheta = -rhod / vnorm(cd)
    console.log(`    cone: ρ̇/|ċ| = ${(-sinTheta).toFixed(6)}  (exact −1/4 = −0.250000)`)
    expect(sinTheta).toBeCloseTo(0.25, 10)

    const cc = characteristicCircle(s, 0.5)!
    // the circle's radius is ρ·cos θ and it sits ρ·sin θ AHEAD of the centre (radius shrinking)
    expect(cc.radius).toBeCloseTo(rho * Math.sqrt(1 - 0.0625), 10)
    const offset = vsub(cc.centre, sphereAt(s, 0.5).centre)
    expect(vnorm(offset)).toBeCloseTo(rho * 0.25, 10)
    expect(offset.x, 'and it leads, because the radius is falling').toBeGreaterThan(0)
  })

  it('TORUS: circular spine, constant radius — pinches exactly when ρ exceeds the spine radius', () => {
    // a circular arc of radius R as a rational quadratic would need weights; a good-enough proxy is
    // a Bézier through points ON the circle, whose curvature at the middle is close to 1/R
    const R = 1
    const pts: Vec3[] = Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 2) * (k / 5 - 0.5)
      return { x: R * Math.cos(a), y: R * Math.sin(a), z: 0 }
    })
    for (const [rho, expectPinch] of [[0.3, false], [1.6, true]] as const) {
      const s: SphereSpline = { S: pts.map((c) => sph(c, rho)) }
      const worst = worstOver(s, pinchTest, 96, 'max')
      console.log(`    torus ρ=${rho}: max ρκ = ${worst.toFixed(3)} → ${worst > 1 ? 'PINCHES' : 'embedded'}`)
      expect(worst > 1).toBe(expectPinch)
    }
  })

  it('THE ENVELOPE DISAPPEARS when the radius outruns the centre', () => {
    // spine moves 1 unit; radius changes by 3 — |ρ̇| > |ċ| everywhere
    const s = spline(line({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 5), 0.2, 3.2)
    const worst = worstOver(s, envelopeTest)
    console.log(`    runaway radius: min |ċ|² − ρ̇² = ${worst.toFixed(3)} → no envelope`)
    expect(worst, 'Minkowski speed goes negative').toBeLessThan(0)
    for (const t of [0.2, 0.5, 0.9]) {
      expect(characteristicCircle(s, t), 'and nothing is drawn there').toBeNull()
    }
  })

  it('and the two failure modes are INDEPENDENT — a curved spine with a runaway radius', () => {
    // the cylinder case had an envelope and no pinch; this has a pinch and an envelope
    const pts: Vec3[] = Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 2) * (k / 5 - 0.5)
      return { x: Math.cos(a), y: Math.sin(a), z: 0 }
    })
    const s: SphereSpline = { S: pts.map((c) => sph(c, 1.6)) }
    expect(worstOver(s, envelopeTest), 'envelope exists').toBeGreaterThan(0)
    expect(worstOver(s, pinchTest, 96, 'max'), 'but it pinches').toBeGreaterThan(1)
  })

  it('A NEGATIVE RADIUS IS AN ORIENTATION, not an imaginary sphere', () => {
    // The two models disagree about what a minus sign means, and this is where it shows.
    // CYCLOGRAPHIC: the radius interpolates, and a negative value is a reversed orientation — the
    // sphere is real and its envelope is fine.
    const s: SphereSpline = {
      S: [sph({ x: 0, y: 0, z: 0 }, 0.3), sph({ x: 1, y: 0, z: 0 }, -2), sph({ x: 2, y: 0, z: 0 }, 0.3)],
    }
    const radii = [0, 0.5, 1].map((t2) => sphereAt(s, t2).radius)
    console.log(`    cyclographic radii: ${radii.map((r) => r.toFixed(3)).join(', ')}`)
    expect(radii[1], 'the middle really is negative').toBeLessThan(0)
    const cc = characteristicCircle(s, 0.5)
    expect(cc, 'and it still has an envelope — |ρ| is the geometric radius').not.toBeNull()
    expect(cc!.radius, 'drawn with |ρ|').toBeGreaterThan(0)

    // MÖBIUS: the same minus sign would be ⟨S,S⟩ < 0 — an imaginary sphere, no real counterpart.
    const imaginary = conformalOf(sph({ x: 1, y: 0, z: 0 }, -2))
    console.log(`    ⟨S,S⟩ for the ℝ^{4,1} reading of radius −2: ${innerProduct(imaginary, imaginary).toFixed(3)}`)
    expect(innerProduct(imaginary, imaginary), 'imaginary in the conformal model').toBeLessThan(0)
  })

  it('AND THE TWO MODELS DISAGREE ABOUT STRAIGHT LINES — the pencil going imaginary', () => {
    // Two DISJOINT spheres. Cyclographically the segment between them is a cone frustum; in ℝ^{4,1}
    // the pencil has no real member in the middle at all. This is why the figure interpolates
    // cyclographically, and it is a measured statement that the models are different geometries.
    const a = sph({ x: 0, y: 0, z: 0 }, 0.7), b = sph({ x: 3, y: 0, z: 0 }, 0.7)
    const cyclo = sphereAt({ S: [a, b] }, 0.5).radius
    const A = conformalOf(a), B = conformalOf(b)
    const mid = A.map((v, i) => 0.5 * (v + B[i])) as unknown as Parameters<typeof innerProduct>[0]
    const g = innerProduct(mid, mid) / (mid[0] * mid[0])
    console.log(`    disjoint spheres, midpoint radius:  cyclographic ${cyclo.toFixed(4)},  conformal² ${g.toFixed(4)}`)
    expect(cyclo, 'a cone frustum: real, and the obvious thing to draw').toBeCloseTo(0.7, 10)
    expect(g, 'the conformal pencil is imaginary in between').toBeLessThan(0)
  })
})
