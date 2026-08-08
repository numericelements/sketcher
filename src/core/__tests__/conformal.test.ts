// ============================================================================
// The conformal model of R³ — the space in which Möbius transformations are LINEAR.
//
// Every claim in the module header is checked here, because the model's whole value is
// that a handful of identities hold exactly, and if any of them is off by a sign the
// linearity is worthless.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import { curveAt, findClassMember } from '../phSpatialSeptic'
import { type Sphere, invert } from '../phMobius'
import {
  type Conformal,
  POINT_AT_INFINITY,
  distanceFromInnerProduct,
  euclideanDistance,
  infinityDisplacement,
  innerProduct,
  lift,
  liftHomogeneous,
  nullDefect,
  project,
  reflectIn,
  sphereVector,
  translate,
} from '../conformal'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const CURVE = { A: findClassMember()!, p0: V(-1.1, -0.35, 0.1) }
const TS = [0.1, 0.3, 0.5, 0.7, 0.9]
const PTS = TS.map((t) => curveAt(CURVE, t))
const SPHERES: Sphere[] = [
  { centre: V(0.9, 1.3, -1.1), radius: 1 },
  { centre: V(0.9, 1.3, -1.1), radius: 1.7 },
  { centre: V(-2.2, 0.4, 0.8), radius: 0.6 },
  { centre: V(0, 0, 0), radius: 1 },
]

// ---------------------------------------------------------------------------
describe('the embedding', () => {
  it('lift then project is the identity — EXACTLY', () => {
    for (const x of PTS) {
      const back = project(lift(x)) as Vec3
      expect(vnorm(vsub(back, x))).toBe(0)
    }
  })

  it('lifted points are null — EXACTLY', () => {
    for (const x of PTS) expect(innerProduct(lift(x), lift(x))).toBe(0)
  })

  it('DISTANCE IS AN INNER PRODUCT: ⟨P(x),P(y)⟩ = −½‖x−y‖²', () => {
    // The identity the whole model rests on: it is why O(4,1) is the Möbius group.
    for (const x of PTS) {
      for (const y of PTS) {
        expect(Math.abs(distanceFromInnerProduct(lift(x), lift(y)) - euclideanDistance(x, y)))
          .toBeLessThan(1e-8)
      }
    }
  })

  it('the rational lift is null too, and doubles the degree structurally', () => {
    // P̃ = (2p_o², 2p_o·p, ‖p‖²): the ‖p‖² component is what doubles the degree.
    for (const x of PTS) {
      for (const w of [1, 0.4, 2.5]) {
        const p = { x: x.x * w, y: x.y * w, z: x.z * w }
        const P = liftHomogeneous(p, w)
        expect(nullDefect(P)).toBeLessThan(1e-15)
        // and it projects to the same point as the plain lift
        expect(vnorm(vsub(project(P) as Vec3, x))).toBeLessThan(1e-12)
      }
    }
  })

  it('∞ is the vector with no weight, and does not project', () => {
    expect(project(POINT_AT_INFINITY)).toBeNull()
    expect(innerProduct(POINT_AT_INFINITY, POINT_AT_INFINITY)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
describe('spheres, and inversion as a LINEAR reflection', () => {
  it('⟨S,S⟩ = ρ²', () => {
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      expect(Math.abs(innerProduct(S, S) - s.radius * s.radius)).toBeLessThan(1e-14)
    }
  })

  it('THE CLAIM: a constant 5×5 reflection reproduces the inversion of core/phMobius', () => {
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      for (const x of PTS) {
        const got = project(reflectIn(lift(x), S) as Conformal) as Vec3
        const want = invert(x, s) as Vec3
        expect(vnorm(vsub(got, want)) / (1 + vnorm(want)), `ρ=${s.radius}`).toBeLessThan(1e-12)
      }
    }
  })

  it('and the reflection is in O(4,1) — it preserves the inner product', () => {
    // Which is the same as saying it is a Möbius transformation, so this is the
    // structural claim rather than a numerical nicety.
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      for (const x of PTS) {
        const rx = reflectIn(lift(x), S) as Conformal
        expect(nullDefect(rx)).toBeLessThan(1e-12)
        for (const y of PTS) {
          const ry = reflectIn(lift(y), S) as Conformal
          expect(Math.abs(innerProduct(rx, ry) - innerProduct(lift(x), lift(y)))).toBeLessThan(1e-11)
        }
      }
    }
  })

  it('reflecting twice is the identity', () => {
    const S = sphereVector(SPHERES[0].centre, SPHERES[0].radius)
    for (const x of PTS) {
      const twice = reflectIn(reflectIn(lift(x), S) as Conformal, S) as Conformal
      expect(vnorm(vsub(project(twice) as Vec3, x))).toBeLessThan(1e-12)
    }
  })
})

// ---------------------------------------------------------------------------
describe('THE DEGREE CRITERION — does the map move ∞?', () => {
  it('a translation fixes ∞ exactly, so the projected degree is unchanged', () => {
    for (const t of [V(0.7, -1.2, 0.4), V(-3, 0, 2.5), V(0, 0, 0)]) {
      expect(infinityDisplacement((X) => translate(X, t))).toBe(0)
    }
  })

  it('every inversion MOVES ∞, so the degree doubles', () => {
    // Measured displacements 0.9 … 12.2 across these spheres — not a marginal effect.
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      expect(infinityDisplacement((X) => reflectIn(X, S)), `ρ=${s.radius}`).toBeGreaterThan(0.1)
    }
  })

  it('and a translation really is a Möbius transformation too', () => {
    for (const t of [V(0.7, -1.2, 0.4)]) {
      for (const x of PTS) {
        const moved = translate(lift(x), t)
        expect(nullDefect(moved)).toBeLessThan(1e-15)
        const back = project(moved) as Vec3
        expect(vnorm(vsub(back, V(x.x + t.x, x.y + t.y, x.z + t.z)))).toBeLessThan(1e-12)
      }
    }
  })
})
