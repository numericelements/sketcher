// ============================================================================
// FREE MODE AT DEGREE 6 — the same gate as the strict handles, for the other mode.
//
// §9.2: free mode makes every control point a handle, one at a time, with the endpoints holding each
// other. Move an interior point and both ends stay put; move one end and the other stays put. A sextic
// has SEVEN control points, so that is seven gestures and none of them is pinned yet — and a free
// handle that silently fails to track looks exactly like one that works, which is why this is measured
// before the figure exists rather than judged by eye afterwards.
//
// WHAT HOLDS WHAT, and the asymmetry is not a design choice. c(0) is immovable inside the family —
// p(0) = 0 pins the translation — so it needs no condition and gets none. Only c(1) is added. Against
// a 12-dimensional fibre that is 3 conditions for an end drag and 6 for an interior one, both wildly
// underdetermined, so minimum norm spends the rest and the curve reshapes around the gesture.
//
// P₀ IS NOT IN THIS FILE, and that is the same trap the degree-4 pair paid for once. Asking the solver
// to move control point 0 is asking for a motion the family cannot make: it spends the whole admissible
// subspace failing, and on screen the control points fly apart. P₀'s gesture is a change of ORIGIN,
// owned by the figure, and it is pinned in degree6HandlesTrack.
//
// MEASURED — every interior point, four drags each, and the far endpoint:
//
//     P₁ … P₅ land to 1e-9 of the cursor, c(1) held to 1e-9, c(0) exactly 0
//     P₆ lands to 1e-9, c(0) exactly 0
//     every member exactly PH (defect < 1e-12)
//
// The drag is capped per call (`maxStep`, a fraction of the control-polygon scale), so "lands" means
// lands on the CAPPED target — that is what the figure asks for each frame, and the cap is what keeps
// a fast mouse from throwing the solve. Asserted against the capped point, not the raw cursor, because
// asserting against the cursor would silently pass whenever the cap did nothing.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  controlStructure, curveAt, dragWithEndHeld, familyBasis, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat, Vec3 } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z)
const DRAGS: [number, number, number][] = [
  [0.2, 0, 0], [0, -0.25, 0.12], [-0.3, 0.15, -0.2], [0.08, 0.08, 0.35],
]
/** The cap `dragWithEndHeld` applies: maxStep × the largest distance from the dragged point. */
const capped = (points: readonly Vec3[], index: number, to: Vec3, maxStep = 0.12): Vec3 => {
  const scale = Math.max(...points.map((q, i) => (i === index ? 0 : dist(q, points[index]))), 1e-9)
  const off = { x: to.x - points[index].x, y: to.y - points[index].y, z: to.z - points[index].z }
  const reach = norm(off)
  const k = reach > 1e-12 ? Math.min(reach, maxStep * scale) / reach : 0
  return { x: points[index].x + off.x * k, y: points[index].y + off.y * k, z: points[index].z + off.z * k }
}

describe('free mode at degree 6', () => {
  it('a sextic has seven control points, so free mode owes seven gestures', () => {
    expect(controlStructure(toMember(SEED)).points.length).toBe(7)
    expect(familyBasis(SEED).length).toBe(12)
  })

  it('EVERY INTERIOR POINT TRACKS, with both ends held', () => {
    const m0 = toMember(SEED)
    const P = controlStructure(m0).points
    const end0 = curveAt(m0, 1)

    let worst = 0, worstEnd = 0, worstStart = 0, worstPH = 0, count = 0
    for (let index = 1; index <= 5; index++) {
      for (const [dx, dy, dz] of DRAGS) {
        const to: Vec3 = { x: P[index].x + dx, y: P[index].y + dy, z: P[index].z + dz }
        const solved = dragWithEndHeld(SEED, index, to, end0)
        expect(solved, `P${index} produced a member`).not.toBeNull()
        const m = toMember(solved!)
        count++
        worst = Math.max(worst, dist(controlStructure(m).points[index], capped(P, index, to)))
        worstEnd = Math.max(worstEnd, dist(curveAt(m, 1), end0))
        worstStart = Math.max(worstStart, norm(curveAt(m, 0)))
        worstPH = Math.max(worstPH, phDefect(m))
      }
    }
    console.log(
      `    ${count} interior drags:  lands to ${worst.toExponential(1)},` +
        `  c(1) held to ${worstEnd.toExponential(1)},  c(0) at ${worstStart.toExponential(1)}`,
    )
    expect(worst, 'the handle goes where it was dragged').toBeLessThan(1e-8)
    expect(worstEnd, 'and the far end does not follow it').toBeLessThan(1e-8)
    expect(worstStart, 'nor the near one — p(0) = 0 pins it without a condition').toBeLessThan(1e-12)
    expect(worstPH, 'every member is exactly PH').toBeLessThan(1e-12)
  })

  it('AND THE FAR ENDPOINT TRACKS, with the near one staying put', () => {
    const m0 = toMember(SEED)
    const end0 = curveAt(m0, 1)
    let worst = 0, worstStart = 0
    for (const [dx, dy, dz] of DRAGS) {
      const to: Vec3 = { x: end0.x + dx, y: end0.y + dy, z: end0.z + dz }
      const solved = dragWithEndHeld(SEED, null, null, to)
      expect(solved).not.toBeNull()
      const m = toMember(solved!)
      worst = Math.max(worst, dist(curveAt(m, 1), to))
      worstStart = Math.max(worstStart, norm(curveAt(m, 0)))
      expect(phDefect(m)).toBeLessThan(1e-12)
    }
    console.log(`    endpoint drags: lands to ${worst.toExponential(1)}, c(0) at ${worstStart.toExponential(1)}`)
    // The endpoint gesture is NOT capped — it asks for c(1) directly rather than for a control point,
    // so it lands on the raw cursor.
    expect(worst).toBeLessThan(1e-8)
    expect(worstStart).toBeLessThan(1e-12)
  })

  it('the interior really moves — a free drag is not a rigid slide in disguise', () => {
    const m0 = toMember(SEED)
    const P = controlStructure(m0).points
    const end0 = curveAt(m0, 1)
    const to: Vec3 = { x: P[3].x - 0.3, y: P[3].y + 0.15, z: P[3].z - 0.2 }
    const m = toMember(dragWithEndHeld(SEED, 3, to, end0)!)
    const Q = controlStructure(m).points
    const moved = P.map((p, i) => dist(p, Q[i]))
    console.log(`    per-point motion: ${moved.map((v) => v.toFixed(3)).join('  ')}`)
    expect(moved[0], 'P₀ is the origin and does not move').toBeLessThan(1e-12)
    expect(moved[3], 'the dragged point moves').toBeGreaterThan(1e-3)
    expect(Math.max(...[1, 2, 4, 5].map((i) => moved[i])),
      'and the family reshapes around it rather than translating').toBeGreaterThan(1e-3)
  })
})
