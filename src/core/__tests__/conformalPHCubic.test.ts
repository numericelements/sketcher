// ============================================================================
// The rational PH cubic in R^{4,1}: the geometric dictionary, and the drag.
//
// The figure draws spheres and Farin beads and nothing else, so every one of those marks
// has to be a measured consequence of the defining conditions rather than a decoration.
// That is what this file checks, in the order the figure needs them.
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
} from '../conformalPHCubic'

const MEMBER = findMember()
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

  it('and its speed numerator is LINEAR — the (n−2)/n law at n=3', () => {
    // h has degree 1, so second differences of h vanish.
    const s = MEMBER!
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

describe('THE GEOMETRIC DICTIONARY — every mark the figure draws', () => {
  const s = MEMBER!
  const P = controlPoints(s)
  const w = weights(s)
  const r = radii(s)

  it('the two END control points are POINT-spheres: ρ₀ = ρ₃ = 0', () => {
    const chord = vnorm(vsub(P[3], P[0]))
    expect(Math.abs(r[0]) / chord).toBeLessThan(1e-7)
    expect(Math.abs(r[3]) / chord).toBeLessThan(1e-7)
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

describe('editing', () => {
  it('dragging an interior control point tracks the cursor and stays on the family', () => {
    const s = MEMBER!
    const P = controlPoints(s)
    const chord = vnorm(vsub(P[3], P[0]))
    for (const index of [1, 2]) {
      let state = s
      let worstTrack = 0
      // a short sweep, warm-started, as an interactive drag would be
      for (let k = 1; k <= 6; k++) {
        const target = {
          x: P[index].x + 0.05 * k * chord,
          y: P[index].y + 0.03 * k * chord,
          z: P[index].z - 0.02 * k * chord,
        }
        const step = dragControlPoint(state, index, target)
        expect(step.converged, `index ${index} step ${k}`).toBe(true)
        expect(step.defect, `index ${index} defect ${k}`).toBeLessThan(1e-9)
        state = step.state
        worstTrack = Math.max(worstTrack, step.trackingError / chord)
      }
      // THE test that matters: the constraint held AND the point went where asked.
      expect(worstTrack, `index ${index} tracking`).toBeLessThan(0.02)
      // the ends were held
      const after = controlPoints(state)
      expect(vnorm(vsub(after[0], P[0])) / chord).toBeLessThan(1e-6)
      expect(vnorm(vsub(after[3], P[3])) / chord).toBeLessThan(1e-6)
    }
  })

  it('sliding a Farin bead moves the WEIGHTS and leaves the polygon alone', () => {
    const s = MEMBER!
    const P = controlPoints(s)
    const before = farinParameters(s)
    const target = before[1] > 0.5 ? before[1] - 0.12 : before[1] + 0.12
    const step = dragFarin(s, 1, target)
    expect(step.converged).toBe(true)
    expect(step.defect).toBeLessThan(1e-9)
    expect(Math.abs(farinParameters(step.state)[1] - target)).toBeLessThan(1e-6)
    // the control points did NOT move — it is a pure weight edit
    const after = controlPoints(step.state)
    const chord = vnorm(vsub(P[3], P[0]))
    for (let k = 0; k < 4; k++) {
      expect(vnorm(vsub(after[k], P[k])) / chord, `point ${k}`).toBeLessThan(1e-6)
    }
    // and the curve really did change
    let moved = 0
    for (let k = 1; k < 20; k++) {
      const a = curveAt(s, k / 20), b = curveAt(step.state, k / 20)
      if (a && b) moved = Math.max(moved, vnorm(vsub(a, b)) / chord)
    }
    expect(moved).toBeGreaterThan(1e-3)
  })
})
