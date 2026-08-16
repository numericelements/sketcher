// ============================================================================
// WHAT THE CENTRES DETERMINE, AND WHAT THEY ARE ALLOWED TO BE — the counting behind every
// sphere-polygon editor in this deck, measured rather than argued.
//
// THE QUESTION THAT PRODUCED THIS FILE. "Can I move all the control-sphere centres freely?"
// The answer is nearly yes, and the shortfall is one equation:
//
//     a curve of POINTS       the centres satisfy exactly ONE relation, at every degree
//     a curve of points + PH  they satisfy n−1
//
// and at degree 2 that single relation is visible and famous — the middle sphere's centre must be
// equidistant from the two ends (the bisector plane of spherePolygonDegreeTwo.test.ts). Dragging it
// off that plane is precisely leaving the family, which is why slide 14's fourth null coefficient
// lights up alone when you do.
//
// AND THE OTHER HALF: THE CENTRES DETERMINE THE SPHERES. Fix every centre and the freedom left is
// exactly 2, both of it gauge — the overall projective scale and the Bézier reparametrisation
// Cₖ ↦ μᵏCₖ. Neither moves a centre, neither changes the curve. So radii and weights are NOT
// independent handles: they are computed from where the centres are. (This cost an afternoon to
// learn the hard way: an unguarded solve with the centres held looked like it was collapsing onto a
// degenerate stratum, weights decaying 1, 0.19, 0.027, 0.002…, when it was sliding along μᵏ with
// μ ≈ 0.513 — the reparametrisation, unpinned. The radii never moved, which was the tell.)
//
// DEGREE 3 IS EXCLUDED ON PURPOSE. Its rank is not stable across members — the null-only family
// measured 13 dimensions at one member found by findMember and 14 at another. That is what the
// degenerate stratum means in practice, and it is one more reason the deck's honest degrees are the
// even ones.
//
// MEMBERS ARE BUILT, NOT SOLVED. `conformalLiftBezier` of a polynomial curve is null identically and
// exact to 1e-16, so every measurement below is at a genuine member with no solver in the loop.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  conformalLiftBezier, nullCurveResidual, type Conformal,
} from '../conformal'
import { definingJacobian } from '../conformalPHCurve'
import { sexticSeed } from '../conformalPHSeeds'
import { nullspaceBasis, orthonormalise } from '../sp11RationalPH'
import { type Vec3 } from '../quaternion'

const rank = (rows: readonly number[][]): number => orthonormalise(rows, 1e-7).length

/** Central-difference Jacobian of the null rows in the 5(n+1) sphere coordinates. */
function nullJacobian(C: readonly Conformal[]): number[][] {
  const N = 5 * C.length
  const base = nullCurveResidual(C)
  const cols: number[][] = []
  for (let j = 0; j < N; j++) {
    const i = Math.floor(j / 5), c = j % 5
    const h = 1e-6 * Math.max(1, Math.abs(C[i][c]))
    const up = C.map((v) => [...v]); up[i][c] += h
    const dn = C.map((v) => [...v]); dn[i][c] -= h
    const ru = nullCurveResidual(up as unknown as Conformal[])
    const rd = nullCurveResidual(dn as unknown as Conformal[])
    cols.push(ru.map((v, k) => (v - rd[k]) / (2 * h)))
  }
  return base.map((_, k) => cols.map((col) => col[k]))
}

/** A variation of the 5-vectors, read as a motion of the centres (centre = (v₁,v₂,v₃)/v₀). */
const centreMotion = (C: readonly Conformal[], d: readonly number[], which?: readonly number[]): number[] => {
  const out: number[] = []
  for (const i of which ?? C.map((_, k) => k)) {
    const w = C[i][0]
    for (let c = 0; c < 3; c++) out.push((d[5 * i + 1 + c] - (C[i][1 + c] / w) * d[5 * i]) / w)
  }
  return out
}

/** dim of the null-only family at this member, and the rank of its shadow on the centres. */
function survey(C: readonly Conformal[]): { dim: number; centreRank: number; endRank: number } {
  const tangent = nullspaceBasis(nullJacobian(C), 5 * C.length)
  return {
    dim: tangent.length,
    centreRank: rank(tangent.map((d) => centreMotion(C, d))),
    endRank: rank(tangent.map((d) => centreMotion(C, d, [0, C.length - 1]))),
  }
}

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
/** Exact null members of conformal degree 2n: the lift of a polynomial of degree n. */
const LIFT_2 = conformalLiftBezier([V(-1, 0.2, 0), V(1.1, -0.3, 0.4)])
const LIFT_4 = conformalLiftBezier([V(-1.2, 0, 0), V(-0.1, 0.9, 0.3), V(1.3, 0.1, -0.2)])
const LIFT_6 = conformalLiftBezier([V(-1.2, 0, 0), V(-0.4, 0.9, 0.3), V(0.5, -0.4, 0.8), V(1.3, 0.1, -0.2)])
/** A second quadratic, chosen because its middle control sphere comes out IMAGINARY. */
const LIFT_4B = conformalLiftBezier([V(-1.2, 0, 0), V(-0.5, 0.9, 0.2), V(0.1, 0.3, -0.7)])

const radiiSquared = (C: readonly Conformal[]): number[] =>
  C.map((v) => {
    const c = [v[1] / v[0], v[2] / v[0], v[3] / v[0]]
    return c[0] * c[0] + c[1] * c[1] + c[2] * c[2] - (2 * v[4]) / v[0]
  })

describe('the members are exact', () => {
  it('every lift is null to machine zero', () => {
    for (const C of [LIFT_2, LIFT_4, LIFT_6]) {
      const scale = Math.max(...C.flatMap((v) => v.map(Math.abs))) ** 2
      expect(Math.max(...nullCurveResidual(C).map(Math.abs)) / scale).toBeLessThan(1e-14)
    }
    expect(LIFT_2.length).toBe(3)
    expect(LIFT_4.length).toBe(5)
    expect(LIFT_6.length).toBe(7)
  })
})

describe('a curve of points imposes exactly ONE relation on the centres', () => {
  it('at conformal degrees 2, 4 and 6', () => {
    for (const C of [LIFT_2, LIFT_4, LIFT_6]) {
      const n = C.length - 1
      const s = survey(C)
      const centreCoords = 3 * (n + 1)
      console.log(
        `degree ${n}:  family ${s.dim} (3n+4 = ${3 * n + 4})   centres ${centreCoords}` +
        `   rank ${s.centreRank}   relations ${centreCoords - s.centreRank}` +
        `   fibre ${s.dim - s.centreRank}`,
      )
      expect(s.dim).toBe(3 * n + 4)                      // the null-only dimension
      expect(centreCoords - s.centreRank).toBe(1)        // ONE relation, at every degree
      expect(s.dim - s.centreRank).toBe(2)               // and the fibre over the centres is gauge
    }
  })

  it('and the two fibre directions are the scale and the reparametrisation', () => {
    for (const C of [LIFT_2, LIFT_4, LIFT_6]) {
      const J = nullJacobian(C)
      const apply = (d: number[]): number => Math.max(...J.map((row) => Math.abs(
        row.reduce((s, v, i) => s + v * d[i], 0))))
      const scaleOf = Math.max(...C.flatMap((v) => v.map(Math.abs)))
      // Cₖ ↦ Cₖ (overall scale) and Cₖ ↦ k·Cₖ (the Bézier reparametrisation)
      const gaugeScale = C.flatMap((v) => [...v])
      const gaugeRepar = C.flatMap((v, k) => v.map((x) => k * x))
      for (const g of [gaugeScale, gaugeRepar]) {
        expect(apply(g) / (scaleOf * scaleOf)).toBeLessThan(1e-8)   // stays on the family
        expect(Math.max(...centreMotion(C, g).map(Math.abs)) / scaleOf).toBeLessThan(1e-9)  // no centre moves
      }
    }
  })
})

describe('with PH as well, the centres are tied n−1 times', () => {
  it('measured at slide 16 own member (degree 6)', () => {
    const s = sexticSeed()
    const n = s.C.length - 1
    const N = 5 * (n + 1)
    const both = nullspaceBasis(definingJacobian(s), definingJacobian(s)[0].length)
    const centreCoords = 3 * (n + 1)
    const centreRank = rank(both.map((d) => centreMotion(s.C, d.slice(0, N))))
    const nullOnly = survey(s.C)
    console.log(
      `degree ${n}:  null-only ${nullOnly.dim}, centres tied ${centreCoords - nullOnly.centreRank}` +
      `   |   null+PH ${both.length}, centres tied ${centreCoords - centreRank}` +
      `   |   PH costs ${nullOnly.dim - both.length}`,
    )
    expect(nullOnly.dim).toBe(3 * n + 4)                 // 22
    expect(both.length).toBe(2 * n + 6)                  // 18
    expect(nullOnly.dim - both.length).toBe(n - 2)       // PH costs n−2 = 4
    expect(centreCoords - centreRank).toBe(n - 1)        // 5 relations on the centres
    expect(both.length - centreRank).toBe(2)             // the same gauge fibre, still 2
  })
})

describe('degree 4 with both ends pinned — the editing budget', () => {
  it('leaves eight, and they are the three interior centres less the one relation', () => {
    const C = LIFT_4
    const s = survey(C)
    const interiorCoords = 3 * (C.length - 2)            // three interior spheres
    console.log(
      `family ${s.dim}   ends reachable ${s.endRank}/6   pinned leaves ${s.dim - s.endRank}` +
      `   gauge 2   interior freedom ${s.dim - s.endRank - 2}` +
      `   (interior centres ${interiorCoords} − 1 relation)`,
    )
    expect(s.endRank).toBe(6)                            // both ends are freely placeable
    expect(s.dim - s.endRank - 2).toBe(8)                // eight, after the gauge is removed
    expect(s.dim - s.endRank - 2).toBe(interiorCoords - 1)
  })

  it('and a legitimate member CAN carry an imaginary control sphere — depending on the polygon', () => {
    // Both of these are ordinary parabola arcs, exactly on the family. The ends are point-spheres
    // in each; whether an INTERIOR sphere is real depends on the control polygon, so a degree-4
    // figure has to be ready to draw nothing at one of its own control objects. Not a degeneracy:
    // an imaginary control vector is a perfectly good ⟨C,C⟩ < 0, it just has no picture.
    const a = radiiSquared(LIFT_4), b = radiiSquared(LIFT_4B)
    console.log('radii² of parabola A:', a.map((v) => v.toFixed(4).padStart(8)).join(' '))
    console.log('radii² of parabola B:', b.map((v) => v.toFixed(4).padStart(8)).join(' '))
    for (const r of [a, b]) {
      expect(Math.abs(r[0])).toBeLessThan(1e-12)         // the ends are POINT-spheres, always
      expect(Math.abs(r[4])).toBeLessThan(1e-12)
    }
    expect(Math.min(...a.slice(1, 4))).toBeGreaterThan(0)   // A: every interior sphere is real
    expect(Math.min(...b.slice(1, 4))).toBeLessThan(0)      // B: one of them is not
  })
})
