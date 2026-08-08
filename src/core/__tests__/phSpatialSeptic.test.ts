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
  type SepticHermiteData,
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
  moveToData,
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

// ---------------------------------------------------------------------------
describe('SLIDER BEHAVIOUR — the two things that made it feel wrong', () => {
  const DATA = hermiteDataOf(CURVE)

  it('moveToData reaches new data smoothly, without leaving the class', () => {
    // What dragging a data point should do: correct the CURRENT curve, rather than
    // re-tracing the family (slow, and the trace length varies so a slider jumps).
    let state = CURVE
    let moved = 0
    for (let k = 1; k <= 12; k++) {
      const shifted: SepticHermiteData = {
        ...hermiteDataOf(state),
        pf: V(DATA.pf.x + 0.04 * k, DATA.pf.y + 0.03 * k, DATA.pf.z - 0.02 * k),
      }
      const next = moveToData(state, shifted)
      expect(next, `step ${k}`).not.toBeNull()
      const got = hermiteDataOf(next as SpatialPHSeptic)
      expect(vd(got.pf, shifted.pf), `step ${k} data`).toBeLessThan(1e-8)
      expect(Math.max(...rmErfResidual((next as SpatialPHSeptic).A).map(Math.abs))).toBeLessThan(1e-8)
      expect(totalErfTwist((next as SpatialPHSeptic).A)).toBeLessThan(1e-7)
      moved = Math.max(moved, vd(controlPoints(next as SpatialPHSeptic)[7], controlPoints(state)[7]))
      state = next as SpatialPHSeptic
    }
    expect(moved).toBeGreaterThan(0)
  })

  it('and each step is SMALL — that is what makes the drag feel continuous', () => {
    const shifted: SepticHermiteData = { ...DATA, pf: V(DATA.pf.x + 0.05, DATA.pf.y, DATA.pf.z) }
    const next = moveToData(CURVE, shifted) as SpatialPHSeptic
    const a = controlPoints(CURVE), b = controlPoints(next)
    let worst = 0
    for (let i = 0; i < 8; i++) worst = Math.max(worst, vd(a[i], b[i]))
    expect(worst).toBeLessThan(0.5)
  })

  it('the trace does NOT double back — the tangent stays oriented', () => {
    // The bug this pins: nullVector's SIGN depends on which pivot succeeded, so an
    // unoriented continuation reverses mid-walk. Measured before the fix: 23 reversals
    // in a 49-member trace, its tail oscillating between two states — which is exactly
    // what made the slider jump between two curves.
    const family = classHermiteFamily(DATA, CURVE.A, { samples: 40, step: 0.05 })
    expect(family.length).toBeGreaterThan(20)
    const first = controlPoints(family[0]).slice(2, 6)
    const away = family.map((m) => {
      const sh = controlPoints(m).slice(2, 6)
      let d = 0
      for (let i = 0; i < 4; i++) d = Math.max(d, vd(sh[i], first[i]))
      return d
    })
    let reversals = 0
    for (let i = 2; i < away.length; i++) {
      if ((away[i] - away[i - 1]) * (away[i - 1] - away[i - 2]) < 0) reversals++
    }
    expect(reversals).toBeLessThanOrEqual(1)
  })

  it('and no two non-adjacent members are near-duplicates', () => {
    // Ambiguity here is what made the slider THUMB oscillate: selection tracks by
    // shape, so duplicates in the list make "nearest" jump around.
    const family = classHermiteFamily(DATA, CURVE.A, { samples: 40, step: 0.05 })
    const shapes = family.map((m) => controlPoints(m).slice(2, 6))
    const gap = (a: Vec3[], b: Vec3[]): number => {
      let d = 0
      for (let i = 0; i < 4; i++) d = Math.max(d, vd(a[i], b[i]))
      return d
    }
    let typical = 0
    for (let i = 1; i < shapes.length; i++) typical = Math.max(typical, gap(shapes[i - 1], shapes[i]))
    let duplicates = 0
    for (let i = 0; i < shapes.length; i++) {
      for (let j = 0; j < shapes.length; j++) {
        if (Math.abs(i - j) > 2 && gap(shapes[i], shapes[j]) < typical) duplicates++
      }
    }
    expect(duplicates).toBe(0)
  })

  it('the spacing is already EVEN — so no resampling is warranted', () => {
    // Pinned so the resampling idea is not revived: the tracer steps in generator
    // space, yet the geometric gaps come out within a factor of two.
    const family = classHermiteFamily(DATA, CURVE.A, { samples: 40, step: 0.05 })
    const gaps: number[] = []
    for (let i = 1; i < family.length; i++) {
      const p = controlPoints(family[i - 1]), q = controlPoints(family[i])
      let d = 0
      for (let j = 0; j < 8; j++) d = Math.max(d, vd(p[j], q[j]))
      gaps.push(d)
    }
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2.5)
  })
})

// ---------------------------------------------------------------------------
describe('PINNED ENDS in free mode — an anchor for a segment with no local support', () => {
  const before = controlPoints(CURVE)

  it('the far end points do not move, while the dragged one still tracks', () => {
    for (const index of [1, 2, 3, 4, 5, 6]) {
      const target = V(before[index].x + 0.22, before[index].y + 0.17, before[index].z - 0.13)
      const r = dragInClass(CURVE, index, target, { pinEnds: true })
      expect(r.converged, `cp ${index}`).toBe(true)
      const after = controlPoints(r.state)
      expect(vd(after[index], target), `cp ${index} tracks`).toBeLessThan(1e-7)
      expect(vd(after[0], before[0]), `cp ${index} moved P₀`).toBeLessThan(1e-8)
      expect(vd(after[7], before[7]), `cp ${index} moved P₇`).toBeLessThan(1e-8)
      expect(Math.max(...rmErfResidual(r.state.A).map(Math.abs))).toBeLessThan(1e-9)
      expect(totalErfTwist(r.state.A), `cp ${index} twist`).toBeLessThan(1e-8)
    }
  })

  it('and dragging an END pins only the OTHER one', () => {
    for (const [index, other] of [[0, 7], [7, 0]] as const) {
      const target = V(before[index].x + 0.2, before[index].y + 0.15, before[index].z - 0.1)
      const r = dragInClass(CURVE, index, target, { pinEnds: true })
      expect(r.converged, `end ${index}`).toBe(true)
      const after = controlPoints(r.state)
      expect(vd(after[index], target), `end ${index} tracks`).toBeLessThan(1e-7)
      expect(vd(after[other], before[other]), `end ${index} moved ${other}`).toBeLessThan(1e-8)
      expect(totalErfTwist(r.state.A)).toBeLessThan(1e-8)
    }
  })

  it('IT REALLY IS LESS STIFF — the ends move without the pin, and not with it', () => {
    // The observation this exists to answer: with only the class and the cursor
    // constrained, minimum norm slides the whole curve, because one Bézier segment has
    // no local support at all.
    const target = V(before[3].x + 0.25, before[3].y + 0.2, before[3].z - 0.15)
    const loose = dragInClass(CURVE, 3, target)
    const pinned = dragInClass(CURVE, 3, target, { pinEnds: true })
    expect(loose.converged).toBe(true)
    expect(pinned.converged).toBe(true)
    const a = controlPoints(loose.state), b = controlPoints(pinned.state)
    const endsMoved = (c: Vec3[]): number => Math.max(vd(c[0], before[0]), vd(c[7], before[7]))
    expect(endsMoved(a)).toBeGreaterThan(1e-3)
    expect(endsMoved(b)).toBeLessThan(1e-8)
  })

  it('a long incremental drag keeps the ends and the class', () => {
    let state = CURVE
    let reached = 0
    for (let d = 0.15; d <= 2; d += 0.15) {
      const target = V(before[4].x + 0.5 * d, before[4].y + 0.4 * d, before[4].z - 0.3 * d)
      const r = dragInClass(state, 4, target, { pinEnds: true })
      if (!r.converged) break
      state = r.state
      reached = d
    }
    expect(reached).toBeGreaterThanOrEqual(0.9)
    const after = controlPoints(state)
    expect(vd(after[0], before[0])).toBeLessThan(1e-7)
    expect(vd(after[7], before[7])).toBeLessThan(1e-7)
    expect(totalErfTwist(state.A)).toBeLessThan(1e-7)
    expect(minSpeed(state.A)).toBeGreaterThan(0.01)
  })
})

// ---------------------------------------------------------------------------
// WHY DEGREE 7 — the first degree at which this class contains a non-planar curve
//
// Not a stylistic choice, and not "degree 7 is generic enough". At degree 5 the same
// condition forces the curve to be PLANAR, so the frame story would be vacuous.
//
// THE MECHANISM, and it is entirely about "five, not six". Write s(a,b) = scal(a i b*).
// Since scal(p q*) = ⟨p,q⟩, s(a,b) = ⟨Ja, b⟩ where J is right-multiplication by i — an
// orthogonal map with J² = −1, and antisymmetric, which is why s(a,a) = 0.
//
// Degree 5 means A is QUADRATIC, and expanding scal(A i A′*) ≡ 0 in the Bernstein basis
// gives Bernstein coefficients (σ₀₁, (σ₀₁+σ₀₂)/3, (σ₀₂+σ₁₂)/3, σ₁₂) with σⱼₖ = s(Aⱼ,Aₖ). All four vanish
// only if ALL THREE pairs do. And "all pairs vanish" says V = span{A₀,A₁,A₂} satisfies
// V ⊥ JV; since dim JV = dim V and both sit in R⁴, dim V ≤ 2. A quadratic A confined to
// such a plane has A i A* confined to a plane in R³ — e.g. V = span{1,j} gives
// A i A* = (α²−β²)i − 2αβk. Planar.
//
// Degree 7 escapes because its conditions are FIVE, not six: s(A₀,A₃) is not required to
// vanish on its own, only the combination 3s(A₁,A₂) + s(A₀,A₃). So the coefficients need
// not span a J-isotropic plane, and non-planar members exist — which findClassMember
// finds, and the rest of this file exercises.
//
// One boundary worth stating: this is about OUR class (the ERF itself is the RMF), not
// about RRMF curves in general. Rational-RMF quintics are a studied, non-empty, non-planar
// class in the literature; they satisfy the weaker condition that a rational ROTATION of
// the ERF is rotation-minimizing. That is a different constraint and not what is tested
// here.
// ---------------------------------------------------------------------------
describe('WHY DEGREE 7: at degree 5 the same condition forces planarity', () => {
  const I: Quat = { u: 0, v: 1, p: 0, q: 0 }
  const s = (a: Quat, b: Quat): number => {
    // scal(a i b*), written out so this test depends on nothing under test
    const ai = {
      u: a.u * 0 - a.v * 1, v: a.u * 1 + a.v * 0, p: a.p * 0 + a.q * 1, q: -a.p * 1 + a.q * 0,
    }
    return ai.u * b.u + ai.v * b.v + ai.p * b.p + ai.q * b.q
  }
  const det3 = (m: number[][]): number =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  const vec4 = (q: Quat): number[] => [q.u, q.v, q.p, q.q]
  const gramDet = (V: number[][]): number =>
    det3(V.map((a) => V.map((b) => a.reduce((x, ai, i) => x + ai * b[i], 0))))

  it('s(a,b) = ⟨Ja,b⟩ with J orthogonal, J² = −1 and antisymmetric', () => {
    const P: Quat[] = [
      { u: 0.7, v: -0.3, p: 1.1, q: 0.4 },
      { u: -0.2, v: 0.9, p: 0.5, q: -1.3 },
    ]
    expect(s(P[0], P[0])).toBeCloseTo(0, 15)
    expect(s(P[0], P[1]) + s(P[1], P[0])).toBeCloseTo(0, 15)
    // agrees with the module's own scalIQ, via allScalIQ
    const A = [P[0], P[1], P[0], P[1]] as Quat[]
    expect(allScalIQ(A)[0]).toBeCloseTo(s(P[0], P[1]), 12)
  })

  it('the three degree-5 conditions are FORCED (all pairs), unlike degree 7\'s five', () => {
    // scal(A i A'*) for quadratic A has Bernstein coefficients σ01, σ01+σ02, σ02+σ12, σ12.
    // Sampled directly, so the claim is checked rather than asserted.
    const A: Quat[] = [
      { u: 1.2, v: 0.4, p: -0.7, q: 0.3 },
      { u: 0.6, v: -0.9, p: 0.2, q: 1.1 },
      { u: -0.4, v: 0.5, p: 1.3, q: -0.2 },
    ]
    const at = (t: number): Quat => {
      const b = [(1 - t) ** 2, 2 * (1 - t) * t, t * t]
      return {
        u: A.reduce((x, q, k) => x + b[k] * q.u, 0), v: A.reduce((x, q, k) => x + b[k] * q.v, 0),
        p: A.reduce((x, q, k) => x + b[k] * q.p, 0), q: A.reduce((x, q, k) => x + b[k] * q.q, 0),
      }
    }
    const deriv = (t: number): Quat => {
      const d = [0, 1].map((k) => ({
        u: 2 * (A[k + 1].u - A[k].u), v: 2 * (A[k + 1].v - A[k].v),
        p: 2 * (A[k + 1].p - A[k].p), q: 2 * (A[k + 1].q - A[k].q),
      }))
      const b = [1 - t, t]
      return {
        u: d.reduce((x, q, k) => x + b[k] * q.u, 0), v: d.reduce((x, q, k) => x + b[k] * q.v, 0),
        p: d.reduce((x, q, k) => x + b[k] * q.p, 0), q: d.reduce((x, q, k) => x + b[k] * q.q, 0),
      }
    }
    const s01 = s(A[0], A[1]), s02 = s(A[0], A[2]), s12 = s(A[1], A[2])
    // Bernstein, so the middle two carry the 1/3 that B₁³ = 3s²t and B₂³ = 3st² supply.
    const bern = [s01, (s01 + s02) / 3, (s02 + s12) / 3, s12]
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      const b3 = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3]
      const predicted = bern.reduce((x, c, k) => x + c * b3[k], 0)
      expect(s(at(t), deriv(t)) / 2, `t=${t}`).toBeCloseTo(predicted, 11)
    }
  })

  it('AND EVERY SOLUTION IS PLANAR — measured from 8 independent seeds', () => {
    // Solve s01 = s02 = s12 = 0 from random seeds (12 unknowns, 3 conditions — plenty of
    // room for a non-planar solution to exist if one did), then measure.
    for (let seed = 0; seed < 8; seed++) {
      const rnd = (n: number): number => {
        const x = Math.sin(seed * 97.13 + n * 13.7) * 43758.5453
        return (x - Math.floor(x)) * 2 - 1
      }
      const unpack = (x: number[]): Quat[] =>
        [0, 1, 2].map((k) => ({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] }))
      const res = (X: Quat[]): number[] => [s(X[0], X[1]), s(X[0], X[2]), s(X[1], X[2])]
      let x = [0, 1, 2].flatMap((k) => [1 + 0.5 * rnd(4 * k), rnd(4 * k + 1), rnd(4 * k + 2), rnd(4 * k + 3)])
      for (let it = 0; it < 400; it++) {
        const r = res(unpack(x))
        if (Math.max(...r.map(Math.abs)) < 1e-15) break
        const g = new Array(12).fill(0)
        const h = 1e-7
        for (let c = 0; c < 12; c++) {
          const xp = x.slice(); xp[c] += h
          const rp = res(unpack(xp))
          for (let e = 0; e < 3; e++) g[c] += (2 * r[e] * (rp[e] - r[e])) / h
        }
        const gn = Math.hypot(...g)
        if (gn === 0) break
        for (let c = 0; c < 12; c++) x[c] -= (0.3 / gn) * g[c] * Math.min(1, Math.hypot(...r))
      }
      const A = unpack(x)
      expect(Math.max(...res(A).map(Math.abs)), `seed ${seed} solved`).toBeLessThan(1e-12)

      // rank of span{A₀,A₁,A₂} in R⁴ is at most 2 — the J-isotropy bound
      expect(Math.abs(gramDet(A.map(vec4))), `seed ${seed} A-rank`).toBeLessThan(1e-12)

      // and therefore the HODOGRAPH lies in a plane: the curve is planar
      const H: number[][] = []
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          // A_j i A_k*, R³ part
          const a = A[j], b = A[k]
          const ai = { u: -a.v, v: a.u, p: a.q, q: -a.p }
          H.push([
            ai.u * -b.v + ai.v * b.u + ai.p * -b.q - ai.q * -b.p,
            ai.u * -b.p - ai.v * -b.q + ai.p * b.u + ai.q * -b.v,
            ai.u * -b.q + ai.v * -b.p - ai.p * -b.v + ai.q * b.u,
          ])
        }
      }
      const G = [0, 1, 2].map((a) => [0, 1, 2].map((b) => H.reduce((t, h) => t + h[a] * h[b], 0)))
      const scale = (G[0][0] + G[1][1] + G[2][2]) / 3
      expect(Math.abs(det3(G)) / scale ** 3, `seed ${seed} planar`).toBeLessThan(1e-9)
    }
  })

  it('while degree 7 does NOT force it: the class member found is genuinely non-planar', () => {
    const A = findClassMember()
    expect(A).not.toBeNull()
    // s(A₀,A₃) is free — only 3s(A₁,A₂) + s(A₀,A₃) must vanish — so the coefficients need
    // not span a J-isotropic plane, and they do not.
    expect(Math.abs(gramDet((A as Quat[]).slice(0, 3).map(vec4)))).toBeGreaterThan(1e-6)
    expect(planarity(A as Quat[])).toBeGreaterThan(0.05)
  })
})
