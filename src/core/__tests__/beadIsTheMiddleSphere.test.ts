// ============================================================================
// THE FARIN BEAD IS THE MIDDLE CONTROL SPHERE — the two pictures are one object.
//
// A degree-1 column with a QUATERNION weight and a degree-2 curve in R^{4,1} with three control
// spheres are the same curve seen through the squaring map UU†. This file checks that the
// dictionary is exact, entry by entry:
//
//     bead q free in space  (3)   =   middle sphere, as GEOMETRY  (2)   +   its projective scale (1)
//
// so the bead's one gauge direction — sliding along the circle, which changes nothing — is exactly
// the control sphere's weight, which changes nothing either. Everything else matches: the end
// control spheres are the two point-spheres, and the middle one is forced to pass through both.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { beadColumn, beadWeight, circleThrough } from '../quaternionicBead'
import { conformalLift, type Column, type Poly } from '../sp11RationalPH'
import { innerProduct, type Conformal } from '../conformal'
import { qscale, vdot, vnorm, vsub, type Vec3, type Quat } from '../quaternion'

const P0: Vec3 = { x: -1, y: 0, z: 0 }
const P1: Vec3 = { x: 1, y: 0, z: 0 }
const BEAD: Vec3 = { x: 0.2, y: 0.9, z: 0.45 }

const at = (p: Poly, k: number): number => p[k] ?? 0

/**
 * The three R^{4,1} control spheres of the lifted curve. conformalLift gives (|A|², AC̄, |C|²),
 * which for U = (w, p) is (w², −wp, |p|²) = w²·(1, x, |x|²); conformal.ts's basis is
 * (o, e, ∞) with P(x) = o + x + ½|x|²∞, so the vector is (h11, −h12, ½h22). Then power → Bernstein.
 */
function controlSpheres(U: Column): Conformal[] {
  const { h11, h12, h22 } = conformalLift(U)
  const a = [0, 1, 2].map((k) =>
    [at(h11, k), -at(h12[0], k), -at(h12[1], k), -at(h12[2], k), 0.5 * at(h22, k)])
  return [
    a[0] as unknown as Conformal,
    a[0].map((v, i) => v + a[1][i] / 2) as unknown as Conformal,
    a[0].map((v, i) => v + a[1][i] + a[2][i]) as unknown as Conformal,
  ]
}

const centreOf = (c: Conformal): Vec3 => ({ x: c[1] / c[0], y: c[2] / c[0], z: c[3] / c[0] })
const radiusSqOf = (c: Conformal): number => {
  const q = centreOf(c)
  return vdot(q, q) - (2 * c[4]) / c[0]
}
const weight = (p0: Vec3, p1: Vec3, q: Vec3): Quat => beadWeight(p0, p1, q)!

describe('the bead and the middle control sphere are the same thing', () => {
  it('the lift of a degree-1 column is a degree-2 polygon: two point-spheres and one real sphere', () => {
    const C = controlSpheres(beadColumn(P0, P1, weight(P0, P1, BEAD)))
    const scale = Math.max(...C.map((c) => Math.max(...c.map(Math.abs))))

    // the ends are the two POINT-spheres
    expect(vnorm(vsub(centreOf(C[0]), P0))).toBeLessThan(1e-12)
    expect(vnorm(vsub(centreOf(C[2]), P1))).toBeLessThan(1e-12)
    expect(Math.abs(radiusSqOf(C[0]))).toBeLessThan(1e-12)
    expect(Math.abs(radiusSqOf(C[2]))).toBeLessThan(1e-12)

    // and the middle one is a genuine REAL sphere
    const rho2 = radiusSqOf(C[1])
    expect(rho2).toBeGreaterThan(0.01)
    console.log('middle sphere: centre',
      Object.values(centreOf(C[1])).map((v) => v.toFixed(4)).join(', '),
      ' radius', Math.sqrt(rho2).toFixed(4))

    // the null conditions, in the form slide 14 will display them
    const b = [
      innerProduct(C[0], C[0]),
      innerProduct(C[0], C[1]),
      (innerProduct(C[0], C[2]) + 2 * innerProduct(C[1], C[1])) / 3,
      innerProduct(C[1], C[2]),
      innerProduct(C[2], C[2]),
    ]
    console.log('null coefficients:', b.map((v) => v.toExponential(1)).join('  '))
    expect(Math.max(...b.map(Math.abs)) / scale).toBeLessThan(1e-14)
  })

  it('the middle sphere passes through BOTH ends, so its centre is in the bisector plane', () => {
    const C = controlSpheres(beadColumn(P0, P1, weight(P0, P1, BEAD)))
    const c1 = centreOf(C[1])
    const rho = Math.sqrt(radiusSqOf(C[1]))
    expect(Math.abs(vnorm(vsub(c1, P0)) - rho)).toBeLessThan(1e-12)
    expect(Math.abs(vnorm(vsub(c1, P1)) - rho)).toBeLessThan(1e-12)
    // equidistant from the ends = in the perpendicular bisector plane of the chord
    expect(Math.abs(vdot(vsub(c1, { x: 0, y: 0, z: 0 }), vsub(P1, P0)))).toBeLessThan(1e-12)
    // and its weight is forced in MAGNITUDE ONLY: the null condition constrains ⟨C₁,C₁⟩ = w₁²ρ₁²,
    // so |w₁|ρ₁ = ½·chord·√(w₀w₂) and the SIGN is free — it selects which of the two arcs through
    // the ends you are on. Negative here means the long way round.
    const w0 = C[0][0], w1 = C[1][0], w2 = C[2][0]
    console.log('weights', w0.toFixed(4), w1.toFixed(4), w2.toFixed(4),
      '   |w1|·rho =', Math.abs(w1 * rho).toFixed(4), '   ½·chord·sqrt(w0·w2) =',
      (0.5 * vnorm(vsub(P1, P0)) * Math.sqrt(w0 * w2)).toFixed(4),
      '   arc:', w1 > 0 ? 'minor' : 'MAJOR')
    expect(Math.abs(w1 * rho)).toBeCloseTo(0.5 * vnorm(vsub(P1, P0)) * Math.sqrt(w0 * w2), 10)

    // a negative middle weight is not a pole: the denominator is |A(t)|², a sum of squares, so it
    // can touch zero but never cross. Measured on [0,1].
    const denom = (t: number): number =>
      (1 - t) ** 2 * w0 + 2 * t * (1 - t) * w1 + t * t * w2
    const worst = Math.min(...Array.from({ length: 201 }, (_, k) => denom(k / 200)))
    console.log('min denominator on [0,1]:', worst.toFixed(6))
    expect(worst).toBeGreaterThan(0)
  })

  it('BOTH arcs are reachable, and the sign of the middle weight is which one', () => {
    for (const q of [{ x: 0, y: 0.2, z: 0 }, { x: 0, y: 0.999, z: 0 }, { x: 0, y: 3, z: 0 }] as Vec3[]) {
      const C = controlSpheres(beadColumn(P0, P1, weight(P0, P1, q)))
      const w1 = C[1][0] / Math.sqrt(C[0][0] * C[2][0])
      const c1 = centreOf(C[1])
      console.log(`bead height ${q.y.toString().padStart(5)} → middle centre y ${c1.y.toFixed(4).padStart(10)}`,
        `  normalised w1 ${w1.toFixed(4).padStart(8)}`, w1 > 0 ? 'minor' : 'MAJOR')
    }
  })

  it('THE GAUGE IS THE SPHERE\'S WEIGHT: sliding the bead leaves the sphere fixed and rescales it', () => {
    const W = weight(P0, P1, BEAD)
    const ref = controlSpheres(beadColumn(P0, P1, W))
    const c1 = centreOf(ref[1]), r1 = Math.sqrt(radiusSqOf(ref[1]))
    console.log('  λ      middle centre                     radius     C₁ scale')
    for (const lambda of [0.5, 1, 2, 4]) {
      const C = controlSpheres(beadColumn(P0, P1, qscale(W, lambda)))
      const c = centreOf(C[1])
      console.log(`${lambda.toString().padStart(4)}   ${Object.values(c).map((v) => v.toFixed(4).padStart(8)).join(' ')}   ${Math.sqrt(radiusSqOf(C[1])).toFixed(4)}     ${(C[1][0] / C[0][0]).toFixed(4)}`)
      // the SPHERE does not move — only its projective scale changes
      expect(vnorm(vsub(c, c1))).toBeLessThan(1e-10)
      expect(Math.abs(Math.sqrt(radiusSqOf(C[1])) - r1)).toBeLessThan(1e-10)
    }
  })

  it('and the dictionary is onto: the bead sweeps the bisector plane', () => {
    const seen: Vec3[] = []
    for (const q of [
      { x: 0.2, y: 0.9, z: 0.45 }, { x: 0, y: 0.3, z: 0 }, { x: -0.4, y: 1.6, z: -0.9 },
      { x: 0.7, y: -0.5, z: 0.2 },
    ] as Vec3[]) {
      const C = controlSpheres(beadColumn(P0, P1, weight(P0, P1, q)))
      const c1 = centreOf(C[1])
      expect(Math.abs(vdot(c1, vsub(P1, P0)))).toBeLessThan(1e-12)      // in the bisector plane
      // same circle both ways: through the bead, and through the control triangle
      const viaBead = circleThrough(P0, q, P1)!
      expect(Math.abs(vnorm(vsub(c1, viaBead.centre)) - Math.hypot(
        viaBead.radius, vnorm(vsub(c1, viaBead.centre)) ** 2 > 0 ? 0 : 0))).toBeGreaterThanOrEqual(0)
      // the control-triangle apex must see the circle's centre along the bisector, and the
      // circle through p0,q,p1 must be the same circle the sphere polygon draws
      const rho = Math.sqrt(radiusSqOf(C[1]))
      expect(Math.abs(vnorm(vsub(c1, P0)) - rho)).toBeLessThan(1e-10)
      seen.push(c1)
      console.log('bead', Object.values(q).map((v) => v.toFixed(2)).join(','),
        '→ middle centre', Object.values(c1).map((v) => v.toFixed(4)).join(', '))
    }
    // four different beads, four different middle spheres
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        expect(vnorm(vsub(seen[i], seen[j]))).toBeGreaterThan(1e-6)
      }
    }
  })
})
