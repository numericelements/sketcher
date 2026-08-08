// ============================================================================
// Möbius transformations of spatial PH curves.
//
// Everything here was measured before it was believed, and one of the claims began life
// WRONG — see "the refuted form" below. The gate is Theorem 1 of Bartoň–Jüttler–Wang: a
// Möbius transformation commutes with computing the rotation-minimizing frame.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat,
  type Vec3,
  QUAT_I,
  qconj,
  qmul,
  qnormSq,
  sandwich,
  vdot,
  vnorm,
  vscale,
  vsub,
} from '../quaternion'
import { curveAt, erfAt, findClassMember, speedAt } from '../phSpatialSeptic'
import {
  type Sphere,
  determinant3,
  imageSpeed,
  invert,
  invertGenerator,
  normalizedDifferential,
  normalizedDifferentialOf,
  orthogonalityDefect,
  transportFrame,
  transportedTwist,
} from '../phMobius'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const A0 = findClassMember() as Quat[]
const CURVE = { A: A0, p0: V(-1.1, -0.35, 0.1) }
/** Several spheres, so no result rests on one lucky configuration. */
const SPHERES: Sphere[] = [
  { centre: V(0.9, 1.3, -1.1), radius: 1 },
  { centre: V(0.9, 1.3, -1.1), radius: 1.7 },
  { centre: V(-2.2, 0.4, 0.8), radius: 0.6 },
  { centre: V(0.2, -1.8, 1.4), radius: 2.3 },
]
const STATIONS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95]

const generatorAt = (t: number): Quat => {
  const s = 1 - t
  const b = [s ** 3, 3 * s * s * t, 3 * s * t * t, t ** 3]
  let a: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = 0; k < 4; k++) {
    a = {
      u: a.u + A0[k].u * b[k], v: a.v + A0[k].v * b[k],
      p: a.p + A0[k].p * b[k], q: a.q + A0[k].q * b[k],
    }
  }
  return a
}
/** Numerical derivative of a vector-valued function of t. */
const ddt = (f: (t: number) => Vec3, t: number, h = 1e-6): Vec3 =>
  vscale(vsub(f(t + h), f(t - h)), 1 / (2 * h))

// ---------------------------------------------------------------------------
describe('the normalized differential is a REFLECTION', () => {
  it('an isometry, an involution, and orientation-REVERSING', () => {
    for (const s of SPHERES) {
      for (const t of STATIONS) {
        const y = curveAt(CURVE, t)
        for (const v of [V(1, 0, 0), V(0.3, -0.7, 0.5), V(-0.2, 0.4, 0.9)]) {
          const d = normalizedDifferential(v, y, s) as Vec3
          expect(Math.abs(vnorm(d) - vnorm(v))).toBeLessThan(1e-14)
          const back = normalizedDifferential(d, y, s) as Vec3
          expect(vnorm(vsub(back, v))).toBeLessThan(1e-14)
        }
        const m = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)].map((v) => normalizedDifferential(v, y, s) as Vec3)
        const rows = [
          [m[0].x, m[1].x, m[2].x],
          [m[0].y, m[1].y, m[2].y],
          [m[0].z, m[1].z, m[2].z],
        ]
        expect(Math.abs(determinant3(rows) + 1)).toBeLessThan(1e-13)
      }
    }
  })

  it('and does not depend on the radius', () => {
    const y = curveAt(CURVE, 0.4)
    const a = normalizedDifferential(V(0.3, -0.7, 0.5), y, SPHERES[0]) as Vec3
    const b = normalizedDifferential(V(0.3, -0.7, 0.5), y, SPHERES[1]) as Vec3
    expect(vnorm(vsub(a, b))).toBeLessThan(1e-15)
  })

  it('THE REFUTED FORM: v ↦ −n v n is a ROTATION by π, not a reflection', () => {
    // This sign error cost a wrong derivation of the generator law. −n v n FIXES the
    // n-direction and negates the perpendicular plane, so det = +1; the reflection
    // v ↦ n v n does the opposite. Pinned so it cannot come back.
    const n: Quat = { u: 0, v: 0.6, p: -0.48, q: 0.64 } // unit pure
    expect(Math.abs(qnormSq(n) - 1)).toBeLessThan(1e-12)
    const apply = (sign: number, v: Vec3): Vec3 => {
      const r = qmul(qmul(n, { u: 0, v: v.x, p: v.y, q: v.z }), n)
      return { x: sign * r.v, y: sign * r.p, z: sign * r.q }
    }
    const det = (sign: number): number => {
      const m = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)].map((v) => apply(sign, v))
      return determinant3([
        [m[0].x, m[1].x, m[2].x],
        [m[0].y, m[1].y, m[2].y],
        [m[0].z, m[1].z, m[2].z],
      ])
    }
    expect(det(-1)).toBeCloseTo(1, 10)  // −n v n : a rotation
    expect(det(+1)).toBeCloseTo(-1, 10) // +n v n : the reflection
    // and concretely: −n v n fixes n, the reflection negates it
    const nv = V(n.v, n.p, n.q)
    expect(vnorm(vsub(apply(-1, nv), nv))).toBeLessThan(1e-12)
    expect(vnorm(vsub(apply(+1, nv), vscale(nv, -1)))).toBeLessThan(1e-12)
  })
})

// ---------------------------------------------------------------------------
describe('the point map', () => {
  it('is an involution off the centre', () => {
    for (const s of SPHERES) {
      for (const t of STATIONS) {
        const y = curveAt(CURVE, t)
        const back = invert(invert(y, s) as Vec3, s) as Vec3
        expect(vnorm(vsub(back, y))).toBeLessThan(1e-12)
      }
    }
  })

  it('is undefined exactly at the centre', () => {
    const s = SPHERES[0]
    expect(invert(s.centre, s)).toBeNull()
    expect(normalizedDifferential(V(1, 0, 0), s.centre, s)).toBeNull()
    expect(invertGenerator(A0[0], s.centre, s)).toBeNull()
  })

  it('is CONFORMAL — its normalized Jacobian is orthogonal', () => {
    // Self-checking: this comes out orthogonal only if the map really is conformal, so
    // it is the tool for a COMPOSED Möbius transformation where per-inversion
    // bookkeeping would be tedious.
    for (const s of SPHERES) {
      for (const t of STATIONS) {
        const y = curveAt(CURVE, t)
        const m = normalizedDifferentialOf((p) => invert(p, s), y) as number[][]
        expect(orthogonalityDefect(m)).toBeLessThan(1e-7)
        expect(determinant3(m)).toBeLessThan(0) // still orientation-reversing
      }
    }
  })
})

// ---------------------------------------------------------------------------
describe('THE IMAGE IS A RATIONAL PH CURVE', () => {
  it('‖s′‖ = ρ²σ/‖u‖², so the speed is rational when σ is polynomial', () => {
    for (const s of SPHERES) {
      for (const t of STATIONS) {
        const speed = vnorm(ddt((x) => invert(curveAt(CURVE, x), s) as Vec3, t))
        const predicted = imageSpeed(speedAt(A0, t), curveAt(CURVE, t), s)
        expect(Math.abs(speed - predicted) / speed, `ρ=${s.radius} t=${t}`).toBeLessThan(1e-7)
      }
    }
  })

  it('THE GENERATOR LAW: A ↦ ρ·u·A·j/‖u‖² reproduces the image hodograph', () => {
    for (const s of SPHERES) {
      for (const t of STATIONS) {
        const y = curveAt(CURVE, t)
        const B = invertGenerator(generatorAt(t), y, s) as Quat
        const got = sandwich(B)
        const want = ddt((x) => invert(curveAt(CURVE, x), s) as Vec3, t)
        expect(vnorm(vsub(got, want)) / (1 + vnorm(want)), `ρ=${s.radius} t=${t}`).toBeLessThan(1e-7)
      }
    }
  })

  it('and the generator needs the CURVE POINT — not the generator alone', () => {
    // The structural fact behind the whole Farin/covariance discussion: the same A at
    // two different curve points gives different images, so no map on generators alone
    // can reproduce this.
    const s = SPHERES[0]
    const A = generatorAt(0.5)
    const a = invertGenerator(A, curveAt(CURVE, 0.3), s) as Quat
    const b = invertGenerator(A, curveAt(CURVE, 0.7), s) as Quat
    expect(Math.hypot(a.u - b.u, a.v - b.v, a.p - b.p, a.q - b.q)).toBeGreaterThan(0.05)
  })
})

// ---------------------------------------------------------------------------
describe('THEOREM 1 — Möbius commutes with the rotation-minimizing frame', () => {
  it('the transported frame is adapted, and still rotation-minimizing', () => {
    for (const s of SPHERES) {
      const f2 = (t: number): Vec3 =>
        (transportFrame(erfAt(A0, t)!, curveAt(CURVE, t), s) as { e2: Vec3 }).e2
      for (const t of STATIONS) {
        const y = curveAt(CURVE, t)
        const f = transportFrame(erfAt(A0, t)!, y, s)!
        const tangent = ddt((x) => invert(curveAt(CURVE, x), s) as Vec3, t)
        const speed = vnorm(tangent)
        // adapted: e₁ carries to the image's unit tangent
        expect(vnorm(vsub(f.e1, vscale(tangent, 1 / speed))), `ρ=${s.radius} t=${t}`).toBeLessThan(1e-6)
        // rotation-minimizing: ω₁ = (de₂/ds)·e₃ = 0
        expect(Math.abs(vdot(ddt(f2, t), f.e3) / speed), `ρ=${s.radius} t=${t}`).toBeLessThan(1e-6)
      }
    }
  })

  it('BONUS: the image ERF is ALSO rotation-minimizing — stronger than Theorem 1', () => {
    // Theorem 1 only promises that the TRANSPORTED frame stays rotation-minimizing. This
    // says the image's OWN Euler–Rodrigues frame is too, i.e. the RM-ERF property
    // survives inversion. Measured across four spheres; two RMFs of one curve differ by a
    // constant angle, so the two frames must agree up to that constant.
    const scalIQ = (a: Quat, b: Quat): number => qmul(qmul(a, QUAT_I), qconj(b)).u
    for (const s of SPHERES) {
      const B = (t: number): Quat => invertGenerator(generatorAt(t), curveAt(CURVE, t), s) as Quat
      for (const t of STATIONS) {
        const h = 1e-6
        const b = B(t), bp = B(t + h), bm = B(t - h)
        const d: Quat = {
          u: (bp.u - bm.u) / (2 * h), v: (bp.v - bm.v) / (2 * h),
          p: (bp.p - bm.p) / (2 * h), q: (bp.q - bm.q) / (2 * h),
        }
        const omega1 = (2 * scalIQ(b, d)) / qnormSq(b) ** 2
        expect(Math.abs(omega1), `ρ=${s.radius} t=${t}`).toBeLessThan(1e-5)
      }
    }
  })

  it('and the transported frame is LEFT-handed — a single inversion mirrors it', () => {
    const s = SPHERES[0]
    const t = 0.4
    const before = erfAt(A0, t)!
    const after = transportFrame(before, curveAt(CURVE, t), s)!
    const hand = (f: { e1: Vec3; e2: Vec3; e3: Vec3 }): number =>
      determinant3([
        [f.e1.x, f.e2.x, f.e3.x],
        [f.e1.y, f.e2.y, f.e3.y],
        [f.e1.z, f.e2.z, f.e3.z],
      ])
    expect(hand(before)).toBeGreaterThan(0.99)
    expect(hand(after)).toBeLessThan(-0.99)
  })
})

// ---------------------------------------------------------------------------
describe('the transported twist, measured on the image', () => {
  const frameAt = (t: number): { e2: Vec3; e3: Vec3 } | null => {
    const f = erfAt(A0, t)
    return f ? { e2: f.e2, e3: f.e3 } : null
  }

  it('is ~zero for an RM-ERF source under every sphere', () => {
    for (const s of SPHERES) {
      const differential = (t: number) => {
        const y = curveAt(CURVE, t)
        return (v: Vec3) => normalizedDifferential(v, y, s)
      }
      expect(transportedTwist(frameAt, differential, 200), `ρ=${s.radius}`).toBeLessThan(1e-6)
    }
  })

  it('and is NOT zero for a frame that does twist — so the measure bites', () => {
    // Rotate e₂ steadily about the tangent: a deliberately twisting frame.
    const twisting = (t: number): { e2: Vec3; e3: Vec3 } | null => {
      const f = erfAt(A0, t)
      if (!f) return null
      const a = 3 * t
      return {
        e2: {
          x: Math.cos(a) * f.e2.x + Math.sin(a) * f.e3.x,
          y: Math.cos(a) * f.e2.y + Math.sin(a) * f.e3.y,
          z: Math.cos(a) * f.e2.z + Math.sin(a) * f.e3.z,
        },
        e3: {
          x: -Math.sin(a) * f.e2.x + Math.cos(a) * f.e3.x,
          y: -Math.sin(a) * f.e2.y + Math.cos(a) * f.e3.y,
          z: -Math.sin(a) * f.e2.z + Math.cos(a) * f.e3.z,
        },
      }
    }
    const s = SPHERES[0]
    const differential = (t: number) => {
      const y = curveAt(CURVE, t)
      return (v: Vec3) => normalizedDifferential(v, y, s)
    }
    expect(transportedTwist(twisting, differential, 200)).toBeGreaterThan(1)
  })
})
