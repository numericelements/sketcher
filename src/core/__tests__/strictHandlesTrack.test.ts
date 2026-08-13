// ============================================================================
// STRICT MODE'S THREE HANDLES, AND WHY IT IS THREE.
//
// The held data is c′(0) and c(1) — six numbers. In Bézier form c′(0) = 4(w₁/w₀)(P₁ − P₀) and P₀ = 0
// inside the family (p(0) = 0 pins it), so
//
//     P₁  carries the start tangent, LINEARLY
//     Pₙ  carries the endpoint
//     P₀  cannot move inside the family at all — dragging it moves the ORIGIN, and the other two
//         handles hold their screen places while it does, so the curve RESHAPES
//
// which is three draggable points, and the count then closes exactly against the family:
//
//     P₀(3) + P₁(3) + Pₙ(3) + pole + twist + fibre phase        = 12
//     8 fibre (mod the Hopf gauge) + 1 dial + 1 pole + 3 shifts = 12
//
// So the handle set is DERIVED. Offering P₂ or P₃ as well would be offering motions the family does
// not have. This file pins the two claims that makes rest on: that P₁ really is linear in c′(0) at
// fixed pole, and that both handles TRACK — the cursor gets what it asked for, rather than the solver
// finding some nearby member and calling it done.
//
// AND P₀ HAS ITS OWN GESTURE, which took three attempts. Asking the solver to move control point 0 is
// asking for a motion the family cannot make — it spends the whole admissible subspace failing, and
// on screen the control points fly apart. The correct call moves nothing by index: P₀ goes to the
// cursor as a change of ORIGIN while the family re-solves to leave the OTHER handles where they were
// on screen. Free holds c(1) alone; strict holds both P₁ and c(1), which is six conditions against
// the fibre's seven effective dimensions — underdetermined, so it lands, and the curve reshapes
// instead of sliding. A rigid slide was attempt two and is the less interesting gesture: it moves the
// picture without moving the curve.
//
// All of it is pinned below, because a handle that silently does nothing looks exactly like a handle
// that is working.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  controlStructure, curveAt, dataOf, derivativeAt, dragWithEndHeld, familyBasis, phDefect,
  projectToData, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat, Vec3 } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

describe('the three strict handles', () => {
  it('P₀ is the curve start, and it cannot move inside the family', () => {
    const m = toMember(SEED)
    const P = controlStructure(m).points
    expect(dist(P[0], curveAt(m, 0))).toBeLessThan(1e-12)
    expect(Math.hypot(P[0].x, P[0].y, P[0].z)).toBeLessThan(1e-12)   // p(0) = 0, the gauge
    expect(P.length).toBe(5)                                          // a quartic: five control points
  })

  it('P₁ CARRIES c′(0) LINEARLY at fixed pole — the relation the tangent handle assumes', () => {
    const m = toMember(SEED)
    const P1 = controlStructure(m).points[1]
    const d0 = derivativeAt(m, 0)
    const n2 = P1.x * P1.x + P1.y * P1.y + P1.z * P1.z
    const k = (d0.x * P1.x + d0.y * P1.y + d0.z * P1.z) / n2
    // c′(0) = k·P₁ exactly, not merely in projection
    expect(dist(d0, { x: k * P1.x, y: k * P1.y, z: k * P1.z })).toBeLessThan(1e-10 * Math.hypot(d0.x, d0.y, d0.z))
    expect(k).toBeGreaterThan(0)
  })

  it('and the tangent handle TRACKS: P₁ lands where it was dragged', () => {
    const m0 = toMember(SEED)
    const P1 = controlStructure(m0).points[1]
    const d0 = derivativeAt(m0, 0)
    const n2 = P1.x * P1.x + P1.y * P1.y + P1.z * P1.z
    const k = (d0.x * P1.x + d0.y * P1.y + d0.z * P1.z) / n2
    const base = dataOf(m0)

    let worst = 0
    let worstPH = 0
    for (const [dx, dy, dz] of [[0.15, 0, 0], [0, -0.2, 0.1], [-0.25, 0.1, -0.15], [0.05, 0.05, 0.3]]) {
      const want: Vec3 = { x: P1.x + dx, y: P1.y + dy, z: P1.z + dz }
      const target = [k * want.x, k * want.y, k * want.z, base[3], base[4], base[5]]
      const solved = projectToData(SEED, target)
      const m = toMember(solved)
      worst = Math.max(worst, dist(controlStructure(m).points[1], want) / Math.hypot(dx, dy, dz))
      worstPH = Math.max(worstPH, phDefect(m))
      // and the OTHER data item did not drift while this one moved
      expect(dist(curveAt(m, 1), { x: base[3], y: base[4], z: base[5] })).toBeLessThan(1e-6)
    }
    expect(worst).toBeLessThan(1e-6)     // tracks the cursor, not merely near it
    expect(worstPH).toBeLessThan(1e-12)  // and every member on the way is exactly PH
  })

  it('the endpoint handle tracks too, and leaves the start tangent alone', () => {
    const base = dataOf(toMember(SEED))
    for (const [dx, dy, dz] of [[0.3, 0, 0], [0, 0.25, -0.2], [-0.4, -0.1, 0.15]]) {
      const want: Vec3 = { x: base[3] + dx, y: base[4] + dy, z: base[5] + dz }
      const target = [base[0], base[1], base[2], want.x, want.y, want.z]
      const m = toMember(projectToData(SEED, target))
      expect(dist(curveAt(m, 1), want)).toBeLessThan(1e-7)
      expect(dist(derivativeAt(m, 0), { x: base[0], y: base[1], z: base[2] })).toBeLessThan(1e-6)
      expect(phDefect(m)).toBeLessThan(1e-12)
    }
  })

  it('SLIDING P₀ IN FREE MODE: the far end can be held anywhere the picture asks for', () => {
    // The gesture: P₀ goes to the cursor and the family re-solves so c(1) stays put ON SCREEN. In the
    // family's own coordinates that means moving c(1) BY THE OPPOSITE of the drag, which is the call
    // the figure makes. It has to actually land, or the handle silently does nothing.
    const m0 = toMember(SEED)
    const end0 = curveAt(m0, 1)
    for (const [dx, dy, dz] of [[0.2, 0, 0], [0, -0.3, 0.1], [-0.15, 0.2, 0.25]]) {
      const held: Vec3 = { x: end0.x - dx, y: end0.y - dy, z: end0.z - dz }
      const solved = dragWithEndHeld(SEED, null, null, held)
      expect(solved).not.toBeNull()
      const m = toMember(solved!)
      expect(dist(curveAt(m, 1), held)).toBeLessThan(1e-6)     // it lands where asked
      expect(phDefect(m)).toBeLessThan(1e-12)                  // and is still exactly PH
      expect(Math.hypot(...[curveAt(m, 0)].flatMap((v) => [v.x, v.y, v.z]))).toBeLessThan(1e-12)
    }
  })

  it('DRAGGING P₀ IN STRICT RESHAPES: P₁ and c(1) hold their SCREEN places, and the curve changes', () => {
    // Moving the origin by δ while both other handles stay put on screen means, in the family's own
    // coordinates, moving BOTH data items by −δ. Six conditions against the fibre's seven effective
    // dimensions, so it is underdetermined and lands. The alternative — a rigid slide — moves the
    // picture without moving the curve, and is the gesture this replaced.
    const m0 = toMember(SEED)
    const P1 = controlStructure(m0).points[1]
    const d0 = derivativeAt(m0, 0)
    const n2 = P1.x * P1.x + P1.y * P1.y + P1.z * P1.z
    const k = (d0.x * P1.x + d0.y * P1.y + d0.z * P1.z) / n2
    const end0 = curveAt(m0, 1)

    for (const [dx, dy, dz] of [[0.12, 0, 0], [0, -0.18, 0.08], [-0.1, 0.14, 0.16]]) {
      const target = [
        k * (P1.x - dx), k * (P1.y - dy), k * (P1.z - dz),
        end0.x - dx, end0.y - dy, end0.z - dz,
      ]
      const solved = projectToData(SEED, target)
      const m = toMember(solved)
      // both other handles are where they were ON SCREEN: local position + the new origin δ
      const P1n = controlStructure(m).points[1]
      expect(dist({ x: P1n.x + dx, y: P1n.y + dy, z: P1n.z + dz }, P1)).toBeLessThan(1e-6)
      const endN = curveAt(m, 1)
      expect(dist({ x: endN.x + dx, y: endN.y + dy, z: endN.z + dz }, end0)).toBeLessThan(1e-6)
      expect(phDefect(m)).toBeLessThan(1e-12)

      // AND IT IS NOT A RIGID MOTION, by a wide margin: the interior control points depart from the
      // rigid prediction by ABOUT THE SIZE OF THE DRAG (measured 0.117 against δ = 0.120, 0.245
      // against 0.197, 0.212 against 0.235). A slide would leave them exactly on it.
      const step = Math.hypot(dx, dy, dz)
      for (const i of [2, 3]) {
        const before = controlStructure(m0).points[i]
        const after = controlStructure(m).points[i]
        const rigid = { x: before.x - dx, y: before.y - dy, z: before.z - dz }
        expect(dist(after, rigid)).toBeGreaterThan(0.8 * step)
      }
    }
  })

  it('THE COUNT CLOSES: three points and three sliders against the family s dimension', () => {
    const fibre = familyBasis(SEED).length
    const dials = SEED.lambdas.length
    const poles = SEED.roots.length
    const gauge = 1                        // 𝒜 ↦ 𝒜e^{iθ} moves no curve
    const shifts = 3
    const family = fibre - gauge + dials + poles + shifts
    const handles = 3 * 3 + dials + poles + 1   // P₀,P₁,Pₙ, twist, pole, one fibre dimension
    expect(fibre).toBe(8)
    expect(family).toBe(12)
    expect(handles).toBe(12)
  })
})
