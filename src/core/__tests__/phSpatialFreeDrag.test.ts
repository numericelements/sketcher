// ============================================================================
// Spatial free drag, the reversal, and the both-handles fiber — the three pieces
// slide 6 needs to behave like slide 4 one dimension up.
//
// All headless, because the figure is r3f and cannot be checked that way.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import {
  type SpatialPHCubic,
  arcLength,
  controlPoints,
  curveAt,
  hodographAt,
  reverseSpatialCubic,
  spatialCubicFiber,
  spatialCubicFiberAt,
  speedAt,
} from '../phSpatialCubic'
import {
  dragSpatialCubicFree,
  spatialControlPointJacobian,
  spatialPHPolygonResidual,
} from '../phSpatialFreeDrag'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const REF: SpatialPHCubic = {
  A0: { u: 1.1, v: 0.3, p: -0.4, q: 0.2 },
  A1: { u: 0.6, v: -0.5, p: 0.7, q: 0.9 },
  p0: V(0.2, -0.3, 0.1),
}

// ---------------------------------------------------------------------------
describe('reversal', () => {
  it('reverses the control points exactly', () => {
    const cps = controlPoints(REF)
    const rev = controlPoints(reverseSpatialCubic(REF))
    for (let i = 0; i < 4; i++) expect(vd(rev[i], cps[3 - i]), `cp ${i}`).toBeLessThan(1e-12)
  })

  it('traces the same curve backwards, and is still exactly PH', () => {
    const rev = reverseSpatialCubic(REF)
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      expect(vd(curveAt(rev, t), curveAt(REF, 1 - t))).toBeLessThan(1e-11)
      // |r′| = σ survives the j-twist that negates the hodograph.
      expect(Math.abs(vnorm(hodographAt(rev, t)) - speedAt(rev, t))).toBeLessThan(1e-12)
    }
    // Same length, naturally.
    expect(Math.abs(arcLength(rev) - arcLength(REF))).toBeLessThan(1e-12)
  })

  it('is an involution', () => {
    const back = reverseSpatialCubic(reverseSpatialCubic(REF))
    const a = controlPoints(back)
    const b = controlPoints(REF)
    for (let i = 0; i < 4; i++) expect(vd(a[i], b[i])).toBeLessThan(1e-11)
  })
})

// ---------------------------------------------------------------------------
describe('the fiber with either interior point as the handle', () => {
  const cps = controlPoints(REF)
  const [P0, P1, P2, P3] = cps

  it('holding P₁ pins P₀,P₁,P₃ and lets P₂ ride', () => {
    const fiber = spatialCubicFiberAt(P0, P3, P1, 1, { samples: 80 })
    expect(fiber.length).toBeGreaterThan(20)
    for (const f of fiber) {
      const c = controlPoints(f.curve)
      expect(vd(c[0], P0)).toBeLessThan(1e-9)
      expect(vd(c[1], P1)).toBeLessThan(1e-7)
      expect(vd(c[3], P3)).toBeLessThan(1e-6)
      expect(vd(f.derived, c[2])).toBeLessThan(1e-12)
    }
  })

  it('holding P₂ pins P₀,P₂,P₃ and lets P₁ ride — the mirror', () => {
    const fiber = spatialCubicFiberAt(P0, P3, P2, 2, { samples: 80 })
    expect(fiber.length).toBeGreaterThan(20)
    for (const f of fiber) {
      const c = controlPoints(f.curve)
      expect(vd(c[0], P0)).toBeLessThan(1e-6)
      expect(vd(c[2], P2)).toBeLessThan(1e-7)
      expect(vd(c[3], P3)).toBeLessThan(1e-9)
      expect(vd(f.derived, c[1])).toBeLessThan(1e-12)
    }
  })

  it('THE SWAP IS CONTINUOUS: the reference curve is on BOTH fibers', () => {
    // Which is what makes clicking to change the handle seamless — the curve on
    // screen solves either problem, so only your grip changes.
    for (const [handle, which, target] of [[P1, 1, P2], [P2, 2, P1]] as const) {
      const fiber = spatialCubicFiberAt(P0, P3, handle, which, { samples: 200 })
      const nearest = Math.min(...fiber.map((f) => vd(f.derived, target)))
      expect(nearest, `handle ${which}`).toBeLessThan(0.03)
    }
  })

  it('seeding the continuation keeps the trace continuous under a moving handle', () => {
    // Walk P₁ a little at a time, carrying the previous shape as the seed, and
    // require the chosen member to move smoothly rather than jump.
    let seed = spatialCubicFiber(P0, P1, P3, { samples: 60 })[0].z
    let previous: Vec3 | null = null
    for (let k = 0; k <= 12; k++) {
      const moved = V(P1.x + 0.02 * k, P1.y + 0.015 * k, P1.z - 0.01 * k)
      const fiber = spatialCubicFiber(P0, moved, P3, { samples: 60, seed })
      expect(fiber.length).toBeGreaterThan(5)
      // Track by nearest shape, as the figure does.
      let best = fiber[0]
      let bestD = Infinity
      for (const f of fiber) {
        const d = Math.hypot(f.z.u - seed.u, f.z.v - seed.v, f.z.p - seed.p, f.z.q - seed.q)
        if (d < bestD) { bestD = d; best = f }
      }
      seed = best.z
      if (previous) expect(vd(best.derived, previous), `step ${k}`).toBeLessThan(0.25)
      previous = best.derived
    }
  })
})

// ---------------------------------------------------------------------------
describe('spatial free drag', () => {
  it('the 12×11 Jacobian matches central finite differences', () => {
    const h = 1e-6
    const J = spatialControlPointJacobian(REF)
    expect(J).toHaveLength(12)
    expect(J[0]).toHaveLength(11)

    const vec = [
      REF.A0.u, REF.A0.v, REF.A0.p, REF.A0.q,
      REF.A1.u, REF.A1.v, REF.A1.p, REF.A1.q,
      REF.p0.x, REF.p0.y, REF.p0.z,
    ]
    const cpsOf = (x: readonly number[]): Vec3[] =>
      controlPoints({
        A0: { u: x[0], v: x[1], p: x[2], q: x[3] },
        A1: { u: x[4], v: x[5], p: x[6], q: x[7] },
        p0: { x: x[8], y: x[9], z: x[10] },
      })

    for (let col = 0; col < 11; col++) {
      const plus = vec.slice(); plus[col] += h
      const minus = vec.slice(); minus[col] -= h
      const cp = cpsOf(plus), cm = cpsOf(minus)
      for (let j = 0; j < 4; j++) {
        expect(Math.abs(J[3 * j][col] - (cp[j].x - cm[j].x) / (2 * h)), `dP${j}.x/d${col}`).toBeLessThan(1e-6)
        expect(Math.abs(J[3 * j + 1][col] - (cp[j].y - cm[j].y) / (2 * h))).toBeLessThan(1e-6)
        expect(Math.abs(J[3 * j + 2][col] - (cp[j].z - cm[j].z) / (2 * h))).toBeLessThan(1e-6)
      }
    }
  })

  it('THE GAUGE makes the Jacobian rank-deficient by one — and the solve survives it', () => {
    // A ↦ A(cos θ + i sin θ) moves the unknowns and nothing else, so there is always
    // a null direction. The derivative at θ = 0 is A·i, per generator.
    const J = spatialControlPointJacobian(REF)
    const g = [
      -REF.A0.v, REF.A0.u, REF.A0.q, -REF.A0.p,
      -REF.A1.v, REF.A1.u, REF.A1.q, -REF.A1.p,
      0, 0, 0,
    ]
    for (const row of J) {
      const dot = row.reduce((s, c, k) => s + c * g[k], 0)
      expect(Math.abs(dot)).toBeLessThan(1e-10)
    }
    // ...and dragging still works, because the ridge picks the min-norm step.
    const before = controlPoints(REF)
    const step = dragSpatialCubicFree(REF, 1, V(before[1].x + 0.2, before[1].y + 0.1, before[1].z))
    expect(Number.isFinite(step.trackingError)).toBe(true)
    expect(step.trackingError).toBeLessThan(0.1)
  })

  it('every control point can be grabbed and tracks the cursor', () => {
    const before = controlPoints(REF)
    for (let index = 0; index < 4; index++) {
      let state = REF
      for (let k = 1; k <= 8; k++) {
        state = dragSpatialCubicFree(state, index, V(
          before[index].x + (0.3 * k) / 8,
          before[index].y + (0.2 * k) / 8,
          before[index].z + (0.15 * k) / 8,
        )).state
      }
      const got = controlPoints(state)[index]
      const want = V(before[index].x + 0.3, before[index].y + 0.2, before[index].z + 0.15)
      expect(vd(got, want), `index ${index}`).toBeLessThan(0.04)
    }
  })

  it('stays exactly PH throughout, judged from the polygon', () => {
    let state = REF
    for (let k = 0; k < 40; k++) {
      const c = controlPoints(state)
      state = dragSpatialCubicFree(state, 2, V(c[2].x + 0.03, c[2].y - 0.02, c[2].z + 0.01)).state
      expect(spatialPHPolygonResidual(controlPoints(state))).toBeLessThan(1e-9)
      // And the invariant itself, sampled.
      for (let i = 0; i <= 4; i++) {
        const t = i / 4
        expect(Math.abs(vnorm(hodographAt(state, t)) - speedAt(state, t))).toBeLessThan(1e-10)
      }
    }
  })

  it('the others move, but less than the gesture', () => {
    const before = controlPoints(REF)
    const target = V(before[1].x + 0.4, before[1].y + 0.3, before[1].z + 0.2)
    const step = dragSpatialCubicFree(REF, 1, target)
    expect(step.disturbance).toBeGreaterThan(0)
    expect(step.disturbance).toBeLessThan(vd(before[1], target))
  })

  it('HOLONOMY in space too: a closed loop does not return the curve', () => {
    const before = controlPoints(REF)
    const centre = before[1]
    const radius = 0.22
    const N = 300
    let state = REF
    for (let i = 1; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      state = dragSpatialCubicFree(state, 1, V(
        centre.x + radius * Math.cos(a) - radius,
        centre.y + radius * Math.sin(a),
        centre.z,
      )).state
    }
    const after = controlPoints(state)
    expect(vd(after[1], centre)).toBeLessThan(0.03)
    const moved = Math.max(vd(after[0], before[0]), vd(after[2], before[2]), vd(after[3], before[3]))
    expect(moved).toBeGreaterThan(1e-3)
    expect(spatialPHPolygonResidual(after)).toBeLessThan(1e-9)
  })
})
