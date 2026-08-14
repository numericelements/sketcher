// ============================================================================
// DEGREE 6, ONE POLE: DO THE FOUR STRICT HANDLES TRACK? — the gate §9.6 puts before any figure code.
//
// WHY THIS TEST AND NOT AN EYE. Everything else on the coming slide pair can be checked by looking at
// it. Tracking cannot: a handle that silently fails to track looks EXACTLY like one that works — the
// curve moves, the picture responds, and what is actually happening is that the solver is spending the
// fibre on something other than the cursor. `strictHandlesTrack.test.ts` exists because of that at
// degree 4, six conditions against a fibre of 8. This is nine against 12, a harder solve.
//
// THE HANDLES, and why exactly these four. c(0) = 0 inside the family (p(0) = 0 pins it), and for a
// rational Bézier of degree 6
//
//     P₀ = c(0)                          the ORIGIN — dragging it reshapes, it cannot move in-family
//     c′(0) = 6(w₁/w₀)(P₁ − P₀)          so P₁ carries the start tangent
//     c′(1) = 6(w₅/w₆)(P₆ − P₅)          so P₅ carries the end tangent
//     P₆ = c(1)                          the endpoint, exactly
//
// 12 numbers, against 3 translation + 9 C¹ Hermite = 12. P₂ P₃ P₄ are outputs and are drawn grey.
//
// AND THE WEIGHT RATIOS ARE CONSTANT, which is what makes these handles honest rather than approximate.
// w = ∏(t − r_k) depends only on the POLES, and the poles are held during a fibre motion — so w₁/w₀ and
// w₅/w₆ do not move while a handle is dragged, and "P₁ carries c′(0)" is an EXACT linear relation, not
// a linearisation. Measured across the drags: the ratios move by exactly 0.
//
// MEASURED:
//
//     P₁ drag        lands to 5.0e-14 of the cursor, the other six Hermite numbers held to 2.8e-14
//     P₅ drag        lands to 9.3e-14, c′(0) and c(1) held to 5.0e-14
//     P₆ drag        lands to 5.1e-14, both end tangents held to 7.1e-15
//     P₀ drag        RESHAPES: the other three hold their SCREEN places to 1e-8, and the interior
//                    points depart from a rigid slide by about the size of the drag
//     every member exactly PH (defect < 1e-12)
//
// So all four handles track, and the harder solve — nine conditions instead of six — costs nothing in
// accuracy.
//
// TIMING, because a handle that is correct and takes 200 ms is still a bad handle: one projection is
// **9 ms** here, against a 16.7 ms frame at 60 fps. It fits, but not with room to spare, and it is
// roughly three times the degree-4 cost. The lever if it ever needs one: `readoutJacobian` rebuilds a
// 9×12 finite-difference Jacobian every Gauss–Newton iteration — 24 member evaluations each — and the
// readout is smooth enough to reuse it across iterations. Not done now; recorded so the cause is known
// before anyone goes looking for it elsewhere. Reported rather than asserted: a timing assertion in CI
// is a flake.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  controlStructure, curveAt, derivativeAt, familyBasis, hermiteOf, phDefect, projectOnto,
  toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat, Vec3 } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const BASE: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
const SEED: MultiPoleParams = (() => {
  const B = familyBasis(BASE)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...BASE, A: unpackSpinor(x) }
})()

const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z)
/** The scalar k with c′(0) = k·(P₁ − P₀), i.e. 6·w₁/w₀. Constant while the poles are held. */
const startK = (m: ReturnType<typeof toMember>): number => {
  const { points, weights } = controlStructure(m)
  void points
  return (6 * weights[1]) / weights[0]
}
const endK = (m: ReturnType<typeof toMember>): number => {
  const { weights } = controlStructure(m)
  return (6 * weights[5]) / weights[6]
}
const DRAGS: [number, number, number][] = [
  [0.15, 0, 0], [0, -0.2, 0.1], [-0.25, 0.1, -0.15], [0.05, 0.05, 0.3],
]

describe('the four degree-6 strict handles', () => {
  it('the family is the one §9.6 designs for: fibre 12, and 12 + 4 = 16', () => {
    expect(familyBasis(SEED).length).toBe(12)                  // 4(n+1) − 4m = 16 − 4
    const chart = 12 - 1 + SEED.lambdas.length + SEED.roots.length + 3   // − the Hopf gauge
    expect(chart).toBe(16)
    // 12 handle numbers + 2 fibre + λ + r
    expect(4 * 3 + 2 + 1 + 1).toBe(16)
    expect(controlStructure(toMember(SEED)).points.length).toBe(7)       // a sextic
  })

  it('THE FOUR HANDLES CARRY THE DATA, exactly, and the weight ratios do not move', () => {
    const m = toMember(SEED)
    const { points } = controlStructure(m)
    expect(norm(points[0])).toBeLessThan(1e-12)                          // P₀ = c(0) = 0
    expect(dist(points[6], curveAt(m, 1))).toBeLessThan(1e-12)           // P₆ = c(1)

    // c′(0) = k₀·(P₁ − P₀) and c′(1) = k₁·(P₆ − P₅), as identities not projections
    const k0 = startK(m), k1 = endK(m)
    const d0 = derivativeAt(m, 0), d1 = derivativeAt(m, 1)
    expect(dist(d0, { x: k0 * points[1].x, y: k0 * points[1].y, z: k0 * points[1].z }))
      .toBeLessThan(1e-10 * norm(d0))
    expect(dist(d1, {
      x: k1 * (points[6].x - points[5].x),
      y: k1 * (points[6].y - points[5].y),
      z: k1 * (points[6].z - points[5].z),
    })).toBeLessThan(1e-10 * norm(d1))

    // and they are CONSTANT across the fibre, because w = ∏(t − r) and the poles are held
    let worst = 0
    for (const drag of DRAGS) {
      const h = hermiteOf(m).slice()
      h[0] += drag[0] * k0; h[1] += drag[1] * k0; h[2] += drag[2] * k0
      const m2 = toMember(projectOnto(SEED, hermiteOf, h))
      worst = Math.max(worst, Math.abs(startK(m2) - k0) / k0, Math.abs(endK(m2) - k1) / k1)
    }
    console.log(`    weight ratios move by ${worst.toExponential(1)} across the drags`)
    expect(worst, 'so "P₁ carries c′(0)" is exact, not a linearisation').toBeLessThan(1e-12)
  })

  it('P₁ TRACKS: the start-tangent handle lands where it was dragged', () => {
    const m0 = toMember(SEED)
    const P = controlStructure(m0).points
    const k0 = startK(m0)
    const h0 = hermiteOf(m0)

    let worst = 0, worstHeld = 0, worstPH = 0
    for (const [dx, dy, dz] of DRAGS) {
      const want: Vec3 = { x: P[1].x + dx, y: P[1].y + dy, z: P[1].z + dz }
      const target = h0.slice()
      target[0] = k0 * want.x; target[1] = k0 * want.y; target[2] = k0 * want.z
      const m = toMember(projectOnto(SEED, hermiteOf, target))
      worst = Math.max(worst, dist(controlStructure(m).points[1], want) / Math.hypot(dx, dy, dz))
      worstPH = Math.max(worstPH, phDefect(m))
      // the OTHER eight numbers did not drift while this one moved
      const h = hermiteOf(m)
      for (let i = 3; i < 9; i++) worstHeld = Math.max(worstHeld, Math.abs(h[i] - h0[i]))
    }
    console.log(`    P₁ lands to ${worst.toExponential(1)} of the cursor; the rest held to ${worstHeld.toExponential(1)}`)
    expect(worst, 'tracks the cursor, not merely near it').toBeLessThan(1e-8)
    expect(worstHeld).toBeLessThan(1e-9)
    expect(worstPH).toBeLessThan(1e-12)
  })

  it('P₅ TRACKS: the end-tangent handle, which degree 4 could not offer at all', () => {
    const m0 = toMember(SEED)
    const P = controlStructure(m0).points
    const k1 = endK(m0)
    const h0 = hermiteOf(m0)

    let worst = 0, worstHeld = 0, worstPH = 0
    for (const [dx, dy, dz] of DRAGS) {
      const want: Vec3 = { x: P[5].x + dx, y: P[5].y + dy, z: P[5].z + dz }
      const target = h0.slice()
      target[3] = k1 * (P[6].x - want.x)
      target[4] = k1 * (P[6].y - want.y)
      target[5] = k1 * (P[6].z - want.z)
      const m = toMember(projectOnto(SEED, hermiteOf, target))
      worst = Math.max(worst, dist(controlStructure(m).points[5], want) / Math.hypot(dx, dy, dz))
      worstPH = Math.max(worstPH, phDefect(m))
      const h = hermiteOf(m)
      for (const i of [0, 1, 2, 6, 7, 8]) worstHeld = Math.max(worstHeld, Math.abs(h[i] - h0[i]))
    }
    console.log(`    P₅ lands to ${worst.toExponential(1)}; c′(0) and c(1) held to ${worstHeld.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-8)
    expect(worstHeld).toBeLessThan(1e-9)
    expect(worstPH).toBeLessThan(1e-12)
  })

  it('P₆ TRACKS: the endpoint moves and BOTH end tangents stay put', () => {
    const m0 = toMember(SEED)
    const end0 = curveAt(m0, 1)
    const h0 = hermiteOf(m0)

    let worst = 0, worstHeld = 0
    for (const [dx, dy, dz] of DRAGS) {
      const want: Vec3 = { x: end0.x + dx, y: end0.y + dy, z: end0.z + dz }
      const target = h0.slice()
      target[6] = want.x; target[7] = want.y; target[8] = want.z
      const m = toMember(projectOnto(SEED, hermiteOf, target))
      worst = Math.max(worst, dist(curveAt(m, 1), want) / Math.hypot(dx, dy, dz))
      expect(phDefect(m)).toBeLessThan(1e-12)
      const h = hermiteOf(m)
      for (let i = 0; i < 6; i++) worstHeld = Math.max(worstHeld, Math.abs(h[i] - h0[i]))
    }
    console.log(`    P₆ lands to ${worst.toExponential(1)}; both tangents held to ${worstHeld.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-8)
    expect(worstHeld).toBeLessThan(1e-9)
  })

  it('P₀ RESHAPES: the other three hold their SCREEN places, and it is not a rigid slide', () => {
    // p(0) = 0 pins c(0), so P₀ cannot move inside the family — dragging it is a change of ORIGIN.
    // The other handles staying put ON SCREEN means, in the family's own coordinates, moving c′(0),
    // c′(1) not at all (they are directions) and c(1) − c(0) not at all either... which would be a
    // rigid slide. The gesture that reshapes holds the OTHER HANDLES' POSITIONS: P₁, P₅, P₆ each shift
    // by −δ in family coordinates, which moves the tangents' magnitudes and the span.
    const m0 = toMember(SEED)
    const P = controlStructure(m0).points
    const k0 = startK(m0), k1 = endK(m0)

    for (const [dx, dy, dz] of [[0.12, 0, 0], [0, -0.18, 0.08], [-0.1, 0.14, 0.16]] as const) {
      const target = [
        k0 * (P[1].x - dx), k0 * (P[1].y - dy), k0 * (P[1].z - dz),
        k1 * ((P[6].x - dx) - (P[5].x - dx)), k1 * ((P[6].y - dy) - (P[5].y - dy)), k1 * ((P[6].z - dz) - (P[5].z - dz)),
        P[6].x - dx, P[6].y - dy, P[6].z - dz,
      ]
      const m = toMember(projectOnto(SEED, hermiteOf, target))
      const Q = controlStructure(m).points
      // each other handle is where it was ON SCREEN: local position plus the new origin δ
      for (const i of [1, 5, 6]) {
        expect(dist({ x: Q[i].x + dx, y: Q[i].y + dy, z: Q[i].z + dz }, P[i]),
          `P${i} holds its screen place`).toBeLessThan(1e-8)
      }
      expect(phDefect(m)).toBeLessThan(1e-12)

      // and the interior is NOT rigidly translated — a slide would leave it exactly on the prediction
      const step = Math.hypot(dx, dy, dz)
      let moved = 0
      for (const i of [2, 3, 4]) {
        moved = Math.max(moved, dist(Q[i], { x: P[i].x - dx, y: P[i].y - dy, z: P[i].z - dz }))
      }
      expect(moved, 'the curve reshapes between the handles').toBeGreaterThan(0.2 * step)
    }
  })

  it('and one projection is fast enough to feel live', () => {
    const h0 = hermiteOf(toMember(SEED))
    const t0 = performance.now()
    const N = 40
    for (let i = 0; i < N; i++) {
      const target = h0.slice()
      target[6] += 0.002 * (i - N / 2)
      projectOnto(SEED, hermiteOf, target)
    }
    const ms = (performance.now() - t0) / N
    console.log(`    ${ms.toFixed(2)} ms per projection (9 conditions, 12-dimensional fibre)`)
    // Reported, not asserted: a timing assertion in CI is a flake. What matters is that it is
    // milliseconds and not hundreds of them.
    expect(ms).toBeLessThan(200)
  })
})
