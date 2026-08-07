// ============================================================================
// Degree-7 PH curves with a rotation-minimizing Euler–Rodrigues frame.
//
// THE GATE, and it comes first because everything else rests on it: the whole module
// is a reading of two equations off the 2019 survey — ω₁ = 2·scal(A i A′*)/σ² (13) and
// the five scal(...) constraints (14). If either reading is wrong, imposing (14) will
// NOT drive ω₁ to zero, and the figure would be showing a false claim. So that is
// checked before anything else is trusted.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, type Vec3, vnorm, vsub } from '../quaternion'
import {
  type SpatialPHSeptic,
  allScalIQ,
  classHermiteFamily,
  controlPoints,
  curveAt,
  dragInClass,
  erfAt,
  erfTwistRate,
  frameDefect,
  hermiteDataOf,
  hodographAt,
  minSpeed,
  planarity,
  findClassMember,
  projectToClass,
  rmErfResidual,
  scalIQ,
  speedAt,
  totalErfTwist,
} from '../phSpatialSeptic'

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const SEED: Quat[] = [
  Q(1.0, 0.15, -0.25, 0.1),
  Q(0.85, -0.3, 0.4, 0.5),
  Q(1.1, 0.3, 0.15, -0.2),
  Q(0.9, -0.2, 0.3, 0.25),
]
const IN_CLASS = findClassMember()
const CURVE: SpatialPHSeptic = { A: IN_CLASS ?? SEED, p0: V(-1, -0.3, 0.15) }

// ---------------------------------------------------------------------------
describe('THE GATE — do the five constraints really kill the ERF twist?', () => {
  it('a member of the class exists, and is neither flat nor cusped', () => {
    expect(IN_CLASS).not.toBeNull()
    expect(Math.max(...rmErfResidual(IN_CLASS as Quat[]).map(Math.abs))).toBeLessThan(1e-10)
    expect(minSpeed(IN_CLASS as Quat[])).toBeGreaterThan(0.05)
    // A nearly planar member would have no frame story to tell.
    expect(planarity(IN_CLASS as Quat[])).toBeGreaterThan(0.05)
  })

  it('ω₁ VANISHES along the whole curve — the reading of (13) and (14) is right', () => {
    const A = IN_CLASS as Quat[]
    let worst = 0
    for (let k = 0; k <= 200; k++) worst = Math.max(worst, Math.abs(erfTwistRate(A, k / 200)))
    expect(worst).toBeLessThan(1e-10)
  })

  it('and the integrated twist ∫|ω₁|ds is zero too', () => {
    expect(totalErfTwist(IN_CLASS as Quat[])).toBeLessThan(1e-10)
  })

  it('a curve NOT in the class twists — so the gate is not vacuous', () => {
    expect(Math.max(...rmErfResidual(SEED).map(Math.abs))).toBeGreaterThan(0.01)
    expect(totalErfTwist(SEED)).toBeGreaterThan(0.1)
  })
})

// ---------------------------------------------------------------------------
describe('THE PLANAR TRAP — why finding a member needs care', () => {
  it('every planar PH curve satisfies the constraints FOR FREE', () => {
    // For A in span{1,k}: v = p = 0, and scal(a i b*) = a.u·b.v − a.v·b.u − a.p·b.q
    // + a.q·b.p vanishes term by term. So the planar family sits inside the class.
    const planarA: Quat[] = [Q(1, 0, 0, 0.3), Q(0.8, 0, 0, -0.5), Q(1.2, 0, 0, 0.4), Q(0.9, 0, 0, -0.2)]
    expect(Math.max(...rmErfResidual(planarA).map(Math.abs))).toBeLessThan(1e-15)
    expect(planarity(planarA)).toBeLessThan(1e-8)
  })

  it('so a naive projection lands FLAT, and must be rejected', () => {
    // Measured: this seed converges to residual 1e-16 with planarity exactly zero.
    const flat = projectToClass(SEED, { minPlanarity: 0.05 })
    expect(flat).toBeNull()
    // With the guard off it converges — the constraints are satisfied, just uselessly.
    const unguarded = projectToClass(SEED, { minPlanarity: 0 })
    expect(unguarded).not.toBeNull()
    expect(Math.max(...rmErfResidual(unguarded as Quat[]).map(Math.abs))).toBeLessThan(1e-10)
    expect(planarity(unguarded as Quat[])).toBeLessThan(1e-6)
  })

  it('findClassMember returns a genuinely spatial member, reproducibly', () => {
    const a = findClassMember()
    const b = findClassMember()
    expect(a).not.toBeNull()
    expect(planarity(a as Quat[])).toBeGreaterThan(0.1)
    expect(a).toEqual(b)
  })
})

// ---------------------------------------------------------------------------
describe('the structure of the constraints', () => {
  it('scal(a i b*) is ANTISYMMETRIC, hence scal(A i A*) = 0', () => {
    const a = Q(0.7, -0.2, 0.5, 0.3), b = Q(1.1, 0.4, -0.3, 0.8)
    expect(Math.abs(scalIQ(a, b) + scalIQ(b, a))).toBeLessThan(1e-14)
    expect(Math.abs(scalIQ(a, a))).toBeLessThan(1e-14)
  })

  it('the numerator of ω₁ IS scal(A i A′*) — not merely proportional', () => {
    // ω₁ = 2·scal(A i A′*)/σ². Checked against the survey's explicit
    // u v′ − u′v − p q′ + p′q form, expanded by hand.
    const A = IN_CLASS as Quat[]
    for (const t of [0.17, 0.5, 0.83]) {
      const h = 1e-6
      const at = (s: number): Quat => {
        const u = 1 - s
        return {
          u: A[0].u * u ** 3 + 3 * A[1].u * u * u * s + 3 * A[2].u * u * s * s + A[3].u * s ** 3,
          v: A[0].v * u ** 3 + 3 * A[1].v * u * u * s + 3 * A[2].v * u * s * s + A[3].v * s ** 3,
          p: A[0].p * u ** 3 + 3 * A[1].p * u * u * s + 3 * A[2].p * u * s * s + A[3].p * s ** 3,
          q: A[0].q * u ** 3 + 3 * A[1].q * u * u * s + 3 * A[2].q * u * s * s + A[3].q * s ** 3,
        }
      }
      const a = at(t), ap = at(t + h), am = at(t - h)
      const d = { u: (ap.u - am.u) / (2 * h), v: (ap.v - am.v) / (2 * h), p: (ap.p - am.p) / (2 * h), q: (ap.q - am.q) / (2 * h) }
      const explicit = a.u * d.v - d.u * a.v - a.p * d.q + d.p * a.q
      expect(Math.abs(explicit - scalIQ(a, d))).toBeLessThan(1e-7)
    }
  })

  it('only FIVE conditions, though six s(a,b) exist and all six are independent', () => {
    // In the class, s(0,1), s(0,2), s(1,3), s(2,3) vanish and 3s(1,2) + s(0,3) = 0 —
    // but s(1,2) and s(0,3) are individually NONZERO. That is why the polynomial's six
    // coefficients impose only five conditions.
    const s = allScalIQ(IN_CLASS as Quat[])
    const [s01, s02, s03, s12, s13, s23] = s
    for (const [name, v] of [['s01', s01], ['s02', s02], ['s13', s13], ['s23', s23]] as const) {
      expect(Math.abs(v), name).toBeLessThan(1e-10)
    }
    expect(Math.abs(3 * s12 + s03)).toBeLessThan(1e-10)
    expect(Math.abs(s12)).toBeGreaterThan(1e-4)
    expect(Math.abs(s03)).toBeGreaterThan(1e-4)
  })
})

// ---------------------------------------------------------------------------
describe('the frame and the curve', () => {
  it('the ERF is an orthonormal frame everywhere', () => {
    expect(frameDefect(IN_CLASS as Quat[])).toBeLessThan(1e-13)
  })

  it('e₁ is the unit tangent — the frame really is adapted to the curve', () => {
    const A = IN_CLASS as Quat[]
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      const f = erfAt(A, t)
      expect(f).not.toBeNull()
      const h = hodographAt(A, t)
      const s = vnorm(h)
      expect(vd(f!.e1, { x: h.x / s, y: h.y / s, z: h.z / s })).toBeLessThan(1e-12)
    }
  })

  it('IS a PH curve: |r′| = |A|², a polynomial', () => {
    const A = IN_CLASS as Quat[]
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      expect(Math.abs(vnorm(hodographAt(A, t)) - speedAt(A, t))).toBeLessThan(1e-12)
    }
  })

  it('has eight control points, and the curve meets the outer two', () => {
    const cps = controlPoints(CURVE)
    expect(cps).toHaveLength(8)
    expect(vd(curveAt(CURVE, 0), cps[0])).toBeLessThan(1e-12)
    expect(vd(curveAt(CURVE, 1), cps[7])).toBeLessThan(1e-12)
  })

  it('dᵢ = 7(P₁ − P₀) — so the outer control points ARE the Hermite data', () => {
    const cps = controlPoints(CURVE)
    const A = CURVE.A
    const di = hodographAt(A, 0), df = hodographAt(A, 1)
    expect(vd(vscale7(vsub(cps[1], cps[0])), di)).toBeLessThan(1e-11)
    expect(vd(vscale7(vsub(cps[7], cps[6])), df)).toBeLessThan(1e-11)
  })
})
const vscale7 = (v: Vec3): Vec3 => ({ x: 7 * v.x, y: 7 * v.y, z: 7 * v.z })

// ---------------------------------------------------------------------------
describe('EDITING inside the class', () => {
  it('every movable control point drags, and the twist stays at machine zero', () => {
    const before = controlPoints(CURVE)
    for (let index = 0; index < 8; index++) {
      const target = V(before[index].x + 0.18, before[index].y + 0.14, before[index].z - 0.11)
      const r = dragInClass(CURVE, index, target)
      expect(r.converged, `cp ${index}`).toBe(true)
      expect(r.classResidual, `cp ${index} class`).toBeLessThan(1e-9)
      expect(r.trackingError, `cp ${index} tracks`).toBeLessThan(1e-7)
      expect(totalErfTwist(r.state.A), `cp ${index} twist`).toBeLessThan(1e-8)
    }
  })

  it('a long incremental drag stays in the class, untwisted and uncusped', () => {
    const before = controlPoints(CURVE)
    const index = 3
    let state = CURVE
    let reached = 0
    for (let d = 0.2; d <= 4; d += 0.2) {
      const target = V(before[index].x + 0.6 * d, before[index].y + 0.5 * d, before[index].z - 0.4 * d)
      const r = dragInClass(state, index, target)
      if (!r.converged) break
      state = r.state
      reached = d
    }
    expect(reached).toBeGreaterThanOrEqual(2)
    expect(totalErfTwist(state.A)).toBeLessThan(1e-8)
    expect(minSpeed(state.A)).toBeGreaterThan(0.01)
    expect(frameDefect(state.A)).toBeLessThan(1e-12)
  })

  it('the others move, but the dragged point is the one that tracks', () => {
    const before = controlPoints(CURVE)
    const target = V(before[4].x + 0.3, before[4].y + 0.2, before[4].z + 0.15)
    const r = dragInClass(CURVE, 4, target)
    expect(r.trackingError).toBeLessThan(1e-8)
    expect(r.disturbance).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
describe('C¹ HERMITE inside the class — a one-parameter family', () => {
  const DATA = hermiteDataOf(CURVE)
  const FAMILY = classHermiteFamily(DATA, CURVE.A, { samples: 40, step: 0.05 })

  it('the family is traced, and is more than a point', () => {
    expect(FAMILY.length).toBeGreaterThan(20)
  })

  it('EVERY member interpolates the same data', () => {
    for (const m of FAMILY) {
      const got = hermiteDataOf(m)
      expect(vd(got.pi, DATA.pi)).toBeLessThan(1e-9)
      expect(vd(got.pf, DATA.pf)).toBeLessThan(1e-8)
      expect(vd(got.di, DATA.di)).toBeLessThan(1e-8)
      expect(vd(got.df, DATA.df)).toBeLessThan(1e-8)
    }
  })

  it('and EVERY member is still in the class, untwisted — the point of the slide', () => {
    for (const m of FAMILY) {
      expect(Math.max(...rmErfResidual(m.A).map(Math.abs))).toBeLessThan(1e-8)
      expect(totalErfTwist(m.A)).toBeLessThan(1e-7)
      expect(frameDefect(m.A)).toBeLessThan(1e-12)
    }
  })

  it('the family genuinely MOVES the curve — so the slider is not decorative', () => {
    const mid = controlPoints(FAMILY[Math.floor(FAMILY.length / 2)])
    let spread = 0
    for (const m of FAMILY) {
      const c = controlPoints(m)
      for (let i = 0; i < 8; i++) spread = Math.max(spread, vd(c[i], mid[i]))
    }
    expect(spread).toBeGreaterThan(0.1)
  })

  it('it is ordered along the family — consecutive members are close', () => {
    for (let i = 1; i < FAMILY.length; i++) {
      const a = controlPoints(FAMILY[i - 1]), b = controlPoints(FAMILY[i])
      let d = 0
      for (let j = 0; j < 8; j++) d = Math.max(d, vd(a[j], b[j]))
      expect(d, `step ${i}`).toBeLessThan(0.35)
    }
  })

  it('the outer four control points do not move — they ARE the data', () => {
    const ref = controlPoints(FAMILY[0])
    for (const m of FAMILY) {
      const c = controlPoints(m)
      for (const i of [0, 1, 6, 7]) expect(vd(c[i], ref[i]), `cp ${i}`).toBeLessThan(1e-7)
    }
  })

  it('refuses rather than inventing a family for unreachable data', () => {
    const absurd = { ...DATA, df: V(0, 0, 0) }
    expect(classHermiteFamily(absurd, CURVE.A, { samples: 5 })).toHaveLength(0)
  })
})
