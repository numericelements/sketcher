// ============================================================================
// THREE SPHERES — everything slide 14 says, measured. Nothing here is a control point, a control
// polygon or a Farin point: there are only SPHERES, and a point is a sphere of radius zero.
//
// THE LADDER THE SLIDE WALKS DOWN. Three spheres, fourteen handles (3×5 numbers less the overall
// scale), nothing imposed. Generically the curve is a family of spheres — a TUBE. Pinch the ends to
// points and it becomes a spindle, or a GAP where the members are imaginary. Land on the five null
// coefficients and the tube collapses to a CURVE, and at this degree that curve is always an arc of
// a circle.
//
//     free                          a tube of varying radius
//     ends pinched to points        a spindle — or nothing at all, if the middle sphere is too small
//     the five numbers at zero      a curve: the arc
//
// AND THE CONNECTING SPHERE IS THE WHOLE STORY. Once the ends are points, the spheres that can
// connect them are exactly those orthogonal to both, and that set is a ROUND 2-SPHERE — measured
// below, its Gram matrix is the identity. One pole is the straight segment, the equator is the half
// circles (which are PLANES, and a plane is an ordinary sphere here), the other pole is the line
// through infinity. Nothing in that family degenerates; only the words "centre and radius" do.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type ControlSphere, conformalOf, conformalSphereAt, nullCoefficients,
} from '../canalSphereSpline'
import {
  evaluateRationalBezier, innerProduct, lift, nullCurveResidual, type Conformal,
} from '../conformal'
import { orthonormalise, pAdd, pDeriv, pMax, pMul, pSub, polySqrt } from '../sp11RationalPH'
import { vnorm, vsub, type Vec3 } from '../quaternion'

const P0: Vec3 = { x: -1, y: 0, z: 0 }
const P2: Vec3 = { x: 1, y: 0, z: 0 }
const sphere = (centre: Vec3, radius: number, weight = 1): ControlSphere => ({ centre, radius, weight })
const centreOf = (c: Conformal): Vec3 => ({ x: c[1] / c[0], y: c[2] / c[0], z: c[3] / c[0] })
const radiiAlong = (S: ControlSphere[]): number[] =>
  [0, 0.25, 0.5, 0.75, 1].map((t) => conformalSphereAt({ S }, t).radius)
const worst = (v: readonly number[]): number => Math.max(...v.map(Math.abs))

describe('the straight line, as three spheres', () => {
  it('is two point-spheres and the sphere on the segment as DIAMETER', () => {
    const mid: Vec3 = { x: 0, y: 0, z: 0 }
    const S = [sphere(P0, 0), sphere(mid, vnorm(vsub(P2, P0)) / 2), sphere(P2, 0)]
    expect(worst(nullCoefficients({ S }))).toBeLessThan(1e-14)
    for (const r of radiiAlong(S)) expect(Math.abs(r)).toBeLessThan(1e-14)

    // and it draws the segment, at constant speed
    const rb = { points: S.map((s) => s.centre), weights: S.map((s) => s.weight) }
    for (let k = 0; k <= 10; k++) {
      const x = evaluateRationalBezier(rb, k / 10)!
      expect(vnorm(vsub(x, { x: -1 + 0.2 * k, y: 0, z: 0 }))).toBeLessThan(1e-14)
    }
  })
})

describe('the connecting spheres form a round 2-sphere', () => {
  const C0 = lift(P0), C2 = lift(P2)
  /** Orthogonal to both ends: a₄ = −a₀/2 and no e₁ component. */
  const connecting = (a0: number, a2: number, a3: number): Conformal =>
    [a0, 0, a2, a3, -a0 / 2] as unknown as Conformal

  it('orthogonal to both ends, and the form on that 3-space is the IDENTITY', () => {
    const basis = [connecting(1, 0, 0), connecting(0, 1, 0), connecting(0, 0, 1)]
    for (const b of basis) {
      expect(innerProduct(b, C0)).toBeCloseTo(0, 12)
      expect(innerProduct(b, C2)).toBeCloseTo(0, 12)
    }
    const gram = basis.map((a) => basis.map((b) => innerProduct(a, b)))
    expect(gram).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]])
    expect(orthonormalise(gram, 1e-9).length).toBe(3)     // positive definite, hence S²
  })

  it('and one turn of it sweeps segment → arcs → half circle → the line through infinity', () => {
    const seen: string[] = []
    for (let k = 0; k <= 8; k++) {
      const phi = (Math.PI * k) / 8
      const C: Conformal[] = [C0, connecting(Math.cos(phi), Math.sin(phi), 0), C2]
      expect(worst(nullCurveResidual(C))).toBeLessThan(1e-12)          // a curve of points throughout
      const apex = evaluateRationalBezier(
        { points: C.map(centreOf), weights: C.map((c) => c[0]) }, 0.5,
      )
      seen.push(Math.abs(C[1][0]) < 1e-12 ? 'plane' : apex ? apex.y.toFixed(3) : 'infinity')
    }
    // the o-component crosses zero at 90°: that member is a PLANE and nothing degenerates
    expect(seen[0]).toBe('0.000')          // the diameter sphere — the straight segment
    expect(seen[2]).toBe('0.414')          // the quarter circle
    expect(seen[4]).toBe('plane')          // the HALF circle
    // the antipode of the segment is the REST of the line: at t = ½ the curve is at infinity
    expect(seen[8]).toBe('infinity')
    console.log('apex heights around the trackball:', seen.join('  '))
  })

  it('the arc family, read as centre and radius, blows up where the sphere does not', () => {
    console.log(' apex b   centre y     radius     weight')
    for (const b of [0, 0.2, 0.4142, 0.95, 2, 3]) {
      const y = b === 0 ? 0 : (2 * b) / (1 - b * b)
      const rho = Math.hypot(1, y)
      const w = (1 - b * b >= 0 ? 1 : -1) / rho
      const S = [sphere(P0, 0), sphere({ x: 0, y, z: 0 }, rho, w), sphere(P2, 0)]
      expect(worst(nullCoefficients({ S }))).toBeLessThan(1e-12)
      const apex = conformalSphereAt({ S }, 0.5).centre
      expect(apex.y).toBeCloseTo(b, 9)
      console.log(`${b.toFixed(4).padStart(7)} ${y.toFixed(4).padStart(10)} ${rho.toFixed(4).padStart(10)} ${w.toFixed(4).padStart(10)}`)
    }
  })
})

describe('the ladder: tube → spindle → gap → curve', () => {
  it('free spheres give a tube of varying radius, and the five numbers are all wrong', () => {
    const S = [
      sphere(P0, 0.6), sphere({ x: 0.3, y: 0.8, z: 0.2 }, 1.1, 1.4), sphere(P2, 0.25),
    ]
    const b = nullCoefficients({ S })
    console.log('free:    radii', radiiAlong(S).map((v) => v.toFixed(4)).join(' '),
      '   ⟨P,P⟩', b.map((v) => v.toFixed(4)).join(' '))
    expect(worst(b)).toBeGreaterThan(0.1)
    expect(Math.min(...radiiAlong(S))).toBeGreaterThan(0)      // a real tube all the way
  })

  it('equal ends and the middle by PYTHAGORAS give a constant tube', () => {
    for (const r of [0.3, 0.5, 0.9]) {
      const S = [sphere(P0, r), sphere({ x: 0, y: 0, z: 0 }, Math.hypot(1, r)), sphere(P2, r)]
      for (const v of radiiAlong(S)) expect(v).toBeCloseTo(r, 10)
    }
    // leave the diameter sphere alone instead and the tube has a WAIST: r·√((1−t)²+t²)
    const S = [sphere(P0, 0.5), sphere({ x: 0, y: 0, z: 0 }, 1), sphere(P2, 0.5)]
    expect(conformalSphereAt({ S }, 0.5).radius).toBeCloseTo(0.5 / Math.SQRT2, 10)
  })

  it('ends as points: too big is a spindle, too small is a GAP, exactly right is the curve', () => {
    const withMiddle = (rho: number): ControlSphere[] =>
      [sphere(P0, 0), sphere({ x: 0, y: 0, z: 0 }, rho), sphere(P2, 0)]
    const spindle = radiiAlong(withMiddle(1.6))
    const gap = radiiAlong(withMiddle(0.7))
    const curve = radiiAlong(withMiddle(1))
    console.log('spindle', spindle.map((v) => v.toFixed(4)).join(' '))
    console.log('gap    ', gap.map((v) => v.toFixed(4)).join(' '))
    console.log('curve  ', curve.map((v) => v.toFixed(4)).join(' '))
    expect(spindle[2]).toBeGreaterThan(0.8)                   // fat in the middle
    expect(gap[2]).toBeLessThan(0)                            // imaginary — nothing is there
    expect(worst(curve)).toBeLessThan(1e-14)                  // collapsed
    for (const set of [spindle, gap]) {
      expect(Math.abs(set[0])).toBeLessThan(1e-14)            // still points at the ends
      expect(Math.abs(set[4])).toBeLessThan(1e-14)
    }
  })

  it('and the five numbers respond to five different things', () => {
    const on = [sphere(P0, 0), sphere({ x: 0, y: 0, z: 0 }, 1), sphere(P2, 0)]
    // push the middle centre OFF the bisector plane, keeping it through the NEAR end and keeping
    // its weight in balance — so only the far end's condition, b₃, can be wrong
    const c: Vec3 = { x: 0.35, y: 0.6, z: 0.3 }
    const rho = vnorm(vsub(c, P0))
    const off = [sphere(P0, 0), sphere(c, rho, 1 / rho), sphere(P2, 0)]
    const b = nullCoefficients({ S: off })
    console.log('off the bisector plane:', b.map((v) => v.toExponential(1)).join('  '))
    expect(worst(nullCoefficients({ S: on }))).toBeLessThan(1e-14)
    expect(Math.abs(b[3])).toBeGreaterThan(0.1)               // b₃ alone
    for (const k of [0, 1, 2, 4]) expect(Math.abs(b[k])).toBeLessThan(1e-14)
  })
})

describe('what the collapse hands you for free', () => {
  it('PH: on the condition the speed numerator is a perfect square, off it is not', () => {
    const toPower = (bern: readonly number[]): number[] =>
      [bern[0], 2 * (bern[1] - bern[0]), bern[0] - 2 * bern[1] + bern[2]]
    const isSquare = (S: ControlSphere[]): boolean => {
      const w = toPower(S.map((s) => s.weight))
      const N = (['x', 'y', 'z'] as const).map((c) => {
        const p = toPower(S.map((s) => s.weight * s.centre[c]))
        return pSub(pMul(pDeriv(p), w), pMul(p, pDeriv(w)))
      })
      const N2 = pAdd(pAdd(pMul(N[0], N[0]), pMul(N[1], N[1])), pMul(N[2], N[2]))
      const root = polySqrt(N2)
      return !!root && pMax(pSub(pMul(root, root), N2)) / (pMax(N2) || 1) < 1e-10
    }
    for (const b of [0.2, 0.4142, 0.7]) {
      const y = (2 * b) / (1 - b * b)
      const rho = Math.hypot(1, y)
      expect(isSquare([sphere(P0, 0), sphere({ x: 0, y, z: 0 }, rho, 1 / rho), sphere(P2, 0)])).toBe(true)
    }
    // an arbitrary polygon that is not on the condition is not PH either
    expect(isSquare([sphere(P0, 0), sphere({ x: 0.35, y: 0.6, z: 0.3 }, 1, 0.9), sphere(P2, 0)])).toBe(false)
  })

  it('and every curve of points at this degree is the same one up to Möbius', () => {
    // 3 spheres = 6 Gram entries; the 5 null conditions are equations on exactly those entries,
    // and one overall scale remains — so no invariant survives. All arcs are one arc.
    const gram = (S: ControlSphere[]): number[] => {
      const C = S.map(conformalOf)
      return [
        innerProduct(C[0], C[0]), innerProduct(C[0], C[1]), innerProduct(C[0], C[2]),
        innerProduct(C[1], C[1]), innerProduct(C[1], C[2]), innerProduct(C[2], C[2]),
      ]
    }
    const arc = (b: number): ControlSphere[] => {
      const y = (2 * b) / (1 - b * b)
      const rho = Math.hypot(1, y)
      return [sphere(P0, 0), sphere({ x: 0, y, z: 0 }, rho, 1 / rho), sphere(P2, 0)]
    }
    const g1 = gram(arc(0.3)), g2 = gram(arc(0.8))
    // both Grams are (0, 0, −2, 1, 0, 0) up to scale: identical invariant tables
    const norm = (g: number[]): string =>
      g.map((v) => { const z = v / Math.abs(g[2]); return (Math.abs(z) < 1e-12 ? 0 : z).toFixed(6) }).join(' ')
    console.log('b=0.3 ', norm(g1))
    console.log('b=0.8 ', norm(g2))
    expect(norm(g1)).toBe(norm(g2))
  })
})
