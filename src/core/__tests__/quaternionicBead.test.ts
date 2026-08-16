// ============================================================================
// DEGREE ONE, WITH A QUATERNION WEIGHT — the four questions the slide had to settle first.
//
// The slide after the pencil claims: let the Farin bead leave the leg and the degree-1 member is
// the CIRCLE through the three handles. Everything asserted on that slide is measured here, and
// two of the four answers are sharper than the guesses in SPHERE_REPRESENTATION_SLIDES §2:
//
//   Q1 the curve IS literally the circle through p₀, bead, p₁ — because the bead is DEFINED as the
//      curve point at t = ½ and inverted in closed form, not fitted.
//   Q2 no dead direction: 4 weight numbers − 1 forbidden (leaves ℝ³) = 3 = the handle's dimension,
//      and the leftover scale is gauge that slides the bead ALONG the circle.
//   Q3 the line is W REAL, in two halves — inside the segment (no pole) and outside (a pole).
//   Q4 does not arise: this figure draws no spheres, so no copy of greatCircles is made.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  beadColumn, beadCurveAt, beadIsReal, beadNullDefect, beadPole, beadWeight,
  circleThrough, conformalConic, wronskianSpread,
} from '../quaternionicBead'
import { nullPart, phDefect, pMax, qpDegree, qpMax } from '../sp11RationalPH'
import { qscale, qnorm, vnorm, vsub, vscale, vdot, vcross, type Vec3, type Quat } from '../quaternion'

const P0: Vec3 = { x: -1, y: 0, z: 0 }
const P1: Vec3 = { x: 1, y: 0, z: 0 }
/** Off the leg, and out of the xy-plane, so nothing accidental can hold. */
const Q: Vec3 = { x: 0.2, y: 0.9, z: 0.45 }

const weight = (p0: Vec3, p1: Vec3, q: Vec3): Quat => beadWeight(p0, p1, q)!
const column = (p0: Vec3, p1: Vec3, q: Vec3) => beadColumn(p0, p1, weight(p0, p1, q))
const dist = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

describe('Q1 — the curve is the circle through the three handles', () => {
  it('the bead is the curve point at t = ½, and the ends are the ends', () => {
    const U = column(P0, P1, Q)
    expect(dist(beadCurveAt(U, 0)!, P0)).toBeLessThan(1e-14)
    expect(dist(beadCurveAt(U, 0.5)!, Q)).toBeLessThan(1e-14)
    expect(dist(beadCurveAt(U, 1)!, P1)).toBeLessThan(1e-14)
  })

  it('and every sample lies on the circle through p₀, bead, p₁', () => {
    const U = column(P0, P1, Q)
    const circle = circleThrough(P0, Q, P1)!
    let worst = 0
    for (let k = 0; k <= 200; k++) {
      const x = beadCurveAt(U, k / 200)!
      const d = vsub(x, circle.centre)
      worst = Math.max(worst,
        Math.abs(vnorm(d) - circle.radius) + Math.abs(vdot(d, circle.normal)))
    }
    console.log('worst off-circle deviation over 201 samples:', worst.toExponential(1))
    expect(worst).toBeLessThan(1e-13)
  })

  it('the arc t ∈ [0,1] runs from p₀ through the bead to p₁ without doubling back', () => {
    const U = column(P0, P1, Q)
    const c = circleThrough(P0, Q, P1)!
    const e1 = vscale(vsub(P0, c.centre), 1 / c.radius)
    const e2 = vcross(c.normal, e1)
    const angle = (x: Vec3): number => {
      const d = vsub(x, c.centre)
      return Math.atan2(vdot(d, e2), vdot(d, e1))
    }
    const a = Array.from({ length: 101 }, (_, k) => angle(beadCurveAt(U, k / 100)!))
    // unwrapped: atan2 jumps at ±π, and the arc is free to cross that branch
    const steps = a.slice(1).map((v, i) => {
      let d = v - a[i]
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      return d
    })
    expect(Math.min(...steps)).toBeGreaterThan(0)          // monotone, one direction
    expect(steps.reduce((s, d) => s + d, 0)).toBeLessThan(2 * Math.PI)   // one arc, not a loop
  })

  it('and the bead ↦ weight ↦ bead round trip is a bijection', () => {
    for (const q of [Q, { x: 0, y: 0.3, z: 0 }, { x: -2, y: 1.5, z: -0.6 }] as Vec3[]) {
      const W = weight(P0, P1, q)
      const back = beadCurveAt(beadColumn(P0, P1, W), 0.5)!
      expect(dist(back, q)).toBeLessThan(1e-13)
    }
  })
})

describe('Q2 — the count: 4 = 1 forbidden + 1 gauge + 2 essential', () => {
  it('the bead-derived weight satisfies the null condition automatically', () => {
    const W = weight(P0, P1, Q)
    expect(Math.abs(beadNullDefect(P0, P1, W))).toBeLessThan(1e-15)
    const U = beadColumn(P0, P1, W)
    expect(pMax(nullPart(U)) / (qpMax(U.A) * qpMax(U.C))).toBeLessThan(1e-15)
  })

  it('the ONE forbidden direction is the leg component of the vector part', () => {
    const W = weight(P0, P1, Q)
    const leg = vsub(P1, P0)
    const unit = vscale(leg, 1 / vnorm(leg))
    // push W's vector part along the leg: the defect grows linearly and the curve leaves ℝ³
    for (const s of [0.05, 0.2, 1]) {
      const bad: Quat = { u: W.u, v: W.v + s * unit.x, p: W.p + s * unit.y, q: W.q + s * unit.z }
      expect(Math.abs(beadNullDefect(P0, P1, bad))).toBeGreaterThan(0.01 * s)
      expect(pMax(nullPart(beadColumn(P0, P1, bad)))).toBeGreaterThan(1e-3 * s)
      expect(beadCurveAt(beadColumn(P0, P1, bad), 0.5)).toBeNull()   // not a point of ℝ³ at all
    }
    // while pushing PERPENDICULAR to the leg stays legal — that is where the circles live
    const perp: Vec3 = { x: 0, y: 0, z: 1 }
    const good: Quat = { u: W.u, v: W.v + 0.7 * perp.x, p: W.p + 0.7 * perp.y, q: W.q + 0.7 * perp.z }
    expect(Math.abs(beadNullDefect(P0, P1, good))).toBeLessThan(1e-15)
    expect(beadCurveAt(beadColumn(P0, P1, good), 0.5)).not.toBeNull()
  })

  it('the leftover scale is GAUGE: it slides the bead along the circle, and nothing else moves', () => {
    const W = weight(P0, P1, Q)
    const ref = circleThrough(P0, Q, P1)!
    const beads: string[] = []
    for (const lambda of [0.5, 1, 2, 4]) {
      const U = beadColumn(P0, P1, qscale(W, lambda))
      const bead = beadCurveAt(U, 0.5)!
      beads.push(`${lambda}: ${bead.x.toFixed(3)},${bead.y.toFixed(3)},${bead.z.toFixed(3)}`)
      // the bead moved, but stayed on the SAME circle
      expect(Math.abs(vnorm(vsub(bead, ref.centre)) - ref.radius)).toBeLessThan(1e-13)
      const c = circleThrough(beadCurveAt(U, 0.25)!, bead, beadCurveAt(U, 0.75)!)!
      expect(dist(c.centre, ref.centre)).toBeLessThan(1e-12)
      expect(Math.abs(c.radius - ref.radius)).toBeLessThan(1e-12)
      expect(Math.abs(Math.abs(vdot(c.normal, ref.normal)) - 1)).toBeLessThan(1e-12)
    }
    // and the beads really are four DIFFERENT points — the samples slide, the family does not
    expect(new Set(beads).size).toBe(4)
    console.log('gauge λ → bead:', beads.join('   '))
  })

  it('two essential parameters: the plane through the leg, and the arc within it', () => {
    // circles through two fixed points form a 2-parameter family; the bead reaches all of them.
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      for (let j = 1; j <= 5; j++) {
        const theta = (Math.PI * i) / 6, h = 0.3 * j
        const q: Vec3 = { x: 0, y: h * Math.cos(theta), z: h * Math.sin(theta) }
        const c = circleThrough(P0, q, P1)!
        const U = column(P0, P1, q)
        expect(Math.abs(vnorm(vsub(beadCurveAt(U, 0.3)!, c.centre)) - c.radius)).toBeLessThan(1e-12)
        // the plane, keyed by the normal with a canonical sign (its overall sign is orientation)
        const s = c.normal.y >= 0 ? 1 : -1
        seen.add(`${c.radius.toFixed(4)}|${(s * c.normal.y).toFixed(4)}|${(s * c.normal.z).toFixed(4)}`)
      }
    }
    expect(seen.size).toBe(30)     // 6 planes × 5 arcs, all distinct
  })
})

describe('Q3 — the line is the degenerate case, in two halves', () => {
  it('bead on the segment: the weight is REAL and positive, the curve is straight, no pole', () => {
    const q: Vec3 = { x: 0.25, y: 0, z: 0 }
    const W = weight(P0, P1, q)
    expect(beadIsReal(W)).toBe(true)
    expect(W.u).toBeGreaterThan(0)
    expect(circleThrough(P0, q, P1)).toBeNull()          // collinear — no circle
    expect(beadPole(W)).toBeNull()
    const U = beadColumn(P0, P1, W)
    for (let k = 0; k <= 20; k++) {
      const x = beadCurveAt(U, k / 20)!
      expect(Math.hypot(x.y, x.z)).toBeLessThan(1e-14)   // on the line
      expect(Math.abs(x.x)).toBeLessThanOrEqual(1 + 1e-12)  // and inside the segment
    }
    console.log('bead at x=0.25 → weight', W.u.toFixed(4))
  })

  it('bead on the line OUTSIDE the segment: the weight is negative and the curve has a pole', () => {
    const q: Vec3 = { x: 3, y: 0, z: 0 }
    const W = weight(P0, P1, q)
    expect(beadIsReal(W)).toBe(true)
    expect(W.u).toBeCloseTo(-2, 12)
    const tStar = beadPole(W)!
    expect(tStar).toBeCloseTo(1 / 3, 12)
    const U = beadColumn(P0, P1, W)
    expect(vnorm(beadCurveAt(U, tStar - 1e-4)!)).toBeGreaterThan(1e3)
    expect(vnorm(beadCurveAt(U, tStar + 1e-4)!)).toBeGreaterThan(1e3)
    // and it is the same straight line, traversed through infinity
    for (const t of [0.1, 0.2, 0.45, 0.8]) {
      expect(Math.hypot(beadCurveAt(U, t)!.y, beadCurveAt(U, t)!.z)).toBeLessThan(1e-12)
    }
  })

  it('and the line is a LIMIT of the circles, not a separate object', () => {
    const radii = [0.4, 0.2, 0.1, 0.05, 0.02].map((h) =>
      circleThrough(P0, { x: 0, y: h, z: 0 }, P1)!.radius)
    expect(radii.every((r, i) => i === 0 || r > radii[i - 1])).toBe(true)
    expect(radii[radii.length - 1]).toBeGreaterThan(20)          // → ∞ as the bead lands
    console.log('bead height → circle radius:', radii.map((r) => r.toFixed(2)).join(', '))
  })
})

describe('the two facts the slide is FOR', () => {
  it('NULL AND PH ARE THE SAME CONDITION at degree 1: Ñ is a nonzero constant', () => {
    const W = weight(P0, P1, Q)
    const U = beadColumn(P0, P1, W)
    const { value, spread } = wronskianSpread(U)
    expect(spread).toBeLessThan(1e-14)                             // constant in t
    expect(value).toBeCloseTo(vnorm(vsub(P1, P0)) * qnorm(W), 12)  // |Ñ| = |p₁−p₀||W|
    expect(phDefect(U)).toBeLessThan(1e-12)                        // hence PH, trivially
    // break the null condition and the constancy dies with it — one condition, both facts
    const bad: Quat = { u: W.u, v: W.v + 0.6, p: W.p, q: W.q }
    expect(wronskianSpread(beadColumn(P0, P1, bad)).spread).toBeGreaterThan(0.1)
    console.log('|Ñ| =', value.toFixed(6), ' spread =', spread.toExponential(1))
  })

  it('DEGREE 1 HERE IS DEGREE 2 THERE: the conformal lift is a genuine conic', () => {
    const U = column(P0, P1, Q)
    expect(qpDegree(U.A)).toBe(1)
    expect(qpDegree(U.C)).toBe(1)
    const conic = conformalConic(U)
    expect(conic.degree).toBe(2)     // the lift SQUARES the column
    expect(conic.rank).toBe(3)       // three independent ℝ^{4,1} coefficients — not a pencil
    // the straight member lifts to degree 2 as well: degree 2 is where curves of points BEGIN
    const line = conformalConic(column(P0, P1, { x: 0.25, y: 0, z: 0 }))
    expect(line.degree).toBe(2)
    console.log('conformal lift: degree', conic.degree, 'rank', conic.rank)
  })
})
