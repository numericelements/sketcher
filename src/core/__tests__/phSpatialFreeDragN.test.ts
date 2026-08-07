// ============================================================================
// The degree-general spatial free drag. Two obligations:
//   1. it must AGREE with the cubic module on cubic inputs, so the two cannot drift
//      apart while both exist;
//   2. it must work at m = 2, which is what slide 8's free mode rides on.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, type Vec3, vnorm, vsub } from '../quaternion'
import {
  type SpatialPHCurve,
  controlPoints,
  dragSpatialFree,
  generatorAt,
  spatialControlPointJacobian,
  squareWeights,
} from '../phSpatialFreeDragN'
import {
  type SpatialPHCubic,
  controlPoints as cubicControlPoints,
} from '../phSpatialCubic'
import {
  dragSpatialCubicFree,
  spatialControlPointJacobian as cubicJacobian,
} from '../phSpatialFreeDrag'
import {
  type SpatialPHQuintic,
  controlPoints as quinticControlPoints,
  hodographAt as quinticHodographAt,
  interpolateSpatialQuintic,
  speedAt as quinticSpeedAt,
} from '../phSpatialQuintic'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const CUBIC: SpatialPHCubic = {
  A0: { u: 1.1, v: 0.3, p: -0.4, q: 0.2 },
  A1: { u: 0.6, v: -0.5, p: 0.7, q: 0.9 },
  p0: V(0.2, -0.3, 0.1),
}
const AS_GENERAL: SpatialPHCurve = { A: [CUBIC.A0, CUBIC.A1], p0: CUBIC.p0 }

const QUINTIC_DATA = {
  pi: V(-1, -0.25, 0.1),
  pf: V(1, 0.3, -0.15),
  di: V(1.5, 1.4, 0.4),
  df: V(1.3, -1.1, 0.6),
}
const asGeneral = (q: SpatialPHQuintic): SpatialPHCurve => ({ A: [q.A0, q.A1, q.A2], p0: q.p0 })

// ---------------------------------------------------------------------------
describe('the square weights', () => {
  it('m = 1 gives (1), (½,½), (1)', () => {
    expect(squareWeights(1)).toEqual([[1, 0], [0.5, 0.5], [0, 1]])
  })

  it('m = 2 gives the quintic row ⅙, 4/6, ⅙', () => {
    const w = squareWeights(2)
    expect(w[2][0]).toBeCloseTo(1 / 6, 12)
    expect(w[2][1]).toBeCloseTo(4 / 6, 12)
    expect(w[2][2]).toBeCloseTo(1 / 6, 12)
  })

  it('each row sums to 1 — it is a Bernstein product, not an arbitrary table', () => {
    for (const m of [1, 2, 3, 4]) {
      for (const row of squareWeights(m)) {
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      }
    }
  })
})

// ---------------------------------------------------------------------------
describe('it agrees with the cubic module', () => {
  it('same control points', () => {
    const a = controlPoints(AS_GENERAL)
    const b = cubicControlPoints(CUBIC)
    expect(a).toHaveLength(4)
    for (let i = 0; i < 4; i++) expect(vd(a[i], b[i])).toBeLessThan(1e-14)
  })

  it('same Jacobian, entry for entry', () => {
    const a = spatialControlPointJacobian(AS_GENERAL)
    const b = cubicJacobian(CUBIC)
    expect(a).toHaveLength(12)
    expect(a[0]).toHaveLength(11)
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 11; j++) expect(Math.abs(a[i][j] - b[i][j]), `${i},${j}`).toBeLessThan(1e-14)
    }
  })

  it('same drag step', () => {
    const before = cubicControlPoints(CUBIC)
    const target = V(before[1].x + 0.25, before[1].y + 0.15, before[1].z - 0.1)
    const g = dragSpatialFree(AS_GENERAL, 1, target)
    const c = dragSpatialCubicFree(CUBIC, 1, target)
    for (let i = 0; i < 4; i++) expect(vd(g.controlPoints[i], c.controlPoints[i])).toBeLessThan(1e-12)
    expect(Math.abs(g.trackingError - c.trackingError)).toBeLessThan(1e-12)
  })
})

// ---------------------------------------------------------------------------
describe('at m = 2 — the quintic, which slide 8 rides on', () => {
  const START = asGeneral(interpolateSpatialQuintic(QUINTIC_DATA, 0.8, 1.6) as SpatialPHQuintic)

  it('reproduces the quintic module’s control points', () => {
    const q = interpolateSpatialQuintic(QUINTIC_DATA, 0.8, 1.6) as SpatialPHQuintic
    const a = controlPoints(asGeneral(q))
    const b = quinticControlPoints(q)
    expect(a).toHaveLength(6)
    for (let i = 0; i < 6; i++) expect(vd(a[i], b[i])).toBeLessThan(1e-14)
  })

  it('the 18×15 Jacobian matches central differences', () => {
    const h = 1e-6
    const J = spatialControlPointJacobian(START)
    expect(J).toHaveLength(18)
    expect(J[0]).toHaveLength(15)

    const vec = [...START.A.flatMap((a) => [a.u, a.v, a.p, a.q]), START.p0.x, START.p0.y, START.p0.z]
    const cpsOf = (x: readonly number[]): Vec3[] => {
      const A: Quat[] = []
      for (let k = 0; k < 3; k++) A.push({ u: x[4 * k], v: x[4 * k + 1], p: x[4 * k + 2], q: x[4 * k + 3] })
      return controlPoints({ A, p0: { x: x[12], y: x[13], z: x[14] } })
    }
    for (let col = 0; col < 15; col++) {
      const plus = vec.slice(); plus[col] += h
      const minus = vec.slice(); minus[col] -= h
      const cp = cpsOf(plus), cm = cpsOf(minus)
      for (let j = 0; j < 6; j++) {
        expect(Math.abs(J[3 * j][col] - (cp[j].x - cm[j].x) / (2 * h)), `P${j}.x/${col}`).toBeLessThan(1e-6)
        expect(Math.abs(J[3 * j + 1][col] - (cp[j].y - cm[j].y) / (2 * h))).toBeLessThan(1e-6)
        expect(Math.abs(J[3 * j + 2][col] - (cp[j].z - cm[j].z) / (2 * h))).toBeLessThan(1e-6)
      }
    }
  })

  it('THE GAUGE is a null direction here too, and the solve survives it', () => {
    const J = spatialControlPointJacobian(START)
    const g = [...START.A.flatMap((a) => [-a.v, a.u, a.q, -a.p]), 0, 0, 0]
    for (const row of J) {
      expect(Math.abs(row.reduce((s, c, k) => s + c * g[k], 0))).toBeLessThan(1e-10)
    }
    const before = controlPoints(START)
    const step = dragSpatialFree(START, 2, V(before[2].x + 0.2, before[2].y + 0.1, before[2].z))
    expect(step.trackingError).toBeLessThan(0.1)
  })

  it('every one of the six can be grabbed and tracks the cursor', () => {
    const before = controlPoints(START)
    for (let index = 0; index < 6; index++) {
      let state = START
      for (let k = 1; k <= 8; k++) {
        state = dragSpatialFree(state, index, V(
          before[index].x + (0.3 * k) / 8,
          before[index].y + (0.2 * k) / 8,
          before[index].z + (0.15 * k) / 8,
        )).state
      }
      const got = controlPoints(state)[index]
      const want = V(before[index].x + 0.3, before[index].y + 0.2, before[index].z + 0.15)
      expect(vd(got, want), `index ${index}`).toBeLessThan(0.05)
    }
  })

  it('stays exactly PH throughout — |r′| = |A|², sampled', () => {
    let state = START
    for (let k = 0; k < 30; k++) {
      const c = controlPoints(state)
      state = dragSpatialFree(state, 3, V(c[3].x + 0.03, c[3].y - 0.02, c[3].z + 0.015)).state
      for (let i = 0; i <= 4; i++) {
        const t = i / 4
        const q: SpatialPHQuintic = { A0: state.A[0], A1: state.A[1], A2: state.A[2], p0: state.p0 }
        expect(Math.abs(vnorm(quinticHodographAt(q, t)) - quinticSpeedAt(q, t))).toBeLessThan(1e-10)
      }
    }
  })

  it('the others move, but less than the gesture', () => {
    const before = controlPoints(START)
    const target = V(before[2].x + 0.4, before[2].y + 0.3, before[2].z + 0.2)
    const step = dragSpatialFree(START, 2, target)
    expect(step.disturbance).toBeGreaterThan(0)
    expect(step.disturbance).toBeLessThan(vd(before[2], target))
  })

  it('the generator evaluates as a Bernstein quadratic', () => {
    expect(generatorAt(START, 0)).toEqual(START.A[0])
    expect(generatorAt(START, 1)).toEqual(START.A[2])
    const mid = generatorAt(START, 0.5)
    expect(mid.u).toBeCloseTo((START.A[0].u + 2 * START.A[1].u + START.A[2].u) / 4, 12)
  })
})
