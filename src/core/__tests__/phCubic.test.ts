// ============================================================================
// Every claim in phCubic.ts that was DERIVED rather than read, pinned here.
//
// These derivations came out of a design conversation and were used to design a
// slide before any of them was checked. That is the wrong order, so this file is
// the correction: each one is now either confirmed or caught.
//
// The claims:
//   1. legs are a geometric progression, ΔP₁² = ΔP₀·ΔP₂
//   2. a planar PH cubic through 3 points has TWO solutions (vs one for a
//      quadratic Bézier — same 6 DOF, quadratic instead of linear equations)
//   3. pinning both ends and prescribing P₁ gives TWO branches
//   4. cusp ⟺ r real and ≤ 0
//   5. BOTH branches are cusped exactly on the chord segment from P₃ to
//      P₀ + (4/3)(P₃−P₀)
//   6. the branch point is the single point P₀ + (4/3)(P₃−P₀)
//   7. MONODROMY: a loop around it exchanges the two branches
//   8. no inflection ever — Im(w̄w′) = Im(w̄₀w₁) is constant
//   9. r = 1 (P₁ = P₀ + D/3) is the straight line
//  10. G¹ Hermite reduces to sin θ₀ + ρ sin((θ₀+θ₁)/2) + ρ² sin θ₁ = 0, ρ > 0,
//      always solvable for opposite-side tangents and often NOT for same-side
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul, csub, cscale, cnorm, cdiv } from '../complex'
import {
  type PHCubicGenerator,
  generatorAt,
  hodographAt,
  legs,
  controlPoints,
  curveAt,
  speedAt,
  arcLength,
  curvatureAt,
  inflectionQuantity,
  generatorHullMargin,
  speedLowerBound,
  shapeRatio,
  cuspOfRatio,
  phCubicFromP1,
  phCubicFromP2,
  discriminantPoint,
  cuspForcedSegment,
  liftBranchAlongPath,
  phCubicThroughThreePoints,
  phCubicG1Hermite,
  g1Quadratic,
  g1PositiveRoots,
  g1AnglesOf,
} from '../phCubic'

const C = (re: number, im: number): Complex => ({ re, im })
const dist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

const REF: PHCubicGenerator = { w0: C(1.4, 0.3), w1: C(0.5, 1.2) }
const REF_P0 = C(0.2, -0.4)

/** Cubic Bézier derivative by de Casteljau, for checking c′ = w². */
function bezierDerivAt(cps: readonly Complex[], t: number): Complex {
  const n = cps.length - 1
  let pts = cps.slice(1).map((p, i) => cscale(csub(p, cps[i]), n))
  while (pts.length > 1) {
    const next: Complex[] = []
    for (let i = 0; i < pts.length - 1; i++) next.push(cadd(cscale(pts[i], 1 - t), cscale(pts[i + 1], t)))
    pts = next
  }
  return pts[0]
}

// ---------------------------------------------------------------------------
describe('phCubic — generator to curve', () => {
  it('has four control points and c′ = w² at sampled t', () => {
    const cps = controlPoints(REF, REF_P0)
    expect(cps).toHaveLength(4)
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(dist(bezierDerivAt(cps, t), hodographAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('CLAIM 1: the legs are a geometric progression, ΔP₁² = ΔP₀·ΔP₂', () => {
    const [l0, l1, l2] = legs(REF)
    expect(dist(cmul(l1, l1), cmul(l0, l2))).toBeLessThan(1e-12)
    // ...and the ratio between consecutive legs is r = w₁/w₀ both times.
    const r = shapeRatio(REF)
    expect(dist(cdiv(l1, l0), r)).toBeLessThan(1e-12)
    expect(dist(cdiv(l2, l1), r)).toBeLessThan(1e-12)
  })

  it('the closed-form curveAt agrees with de Casteljau', () => {
    const cps = controlPoints(REF, REF_P0)
    const deCasteljau = (t: number): Complex => {
      let pts = cps.slice()
      while (pts.length > 1) {
        const next: Complex[] = []
        for (let i = 0; i < pts.length - 1; i++) next.push(cadd(cscale(pts[i], 1 - t), cscale(pts[i + 1], t)))
        pts = next
      }
      return pts[0]
    }
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(dist(curveAt(REF, REF_P0, t), deCasteljau(t))).toBeLessThan(1e-12)
    }
  })

  it('arc length is exact and |c′| = σ (the PH property)', () => {
    const n = 20000
    let num = 0
    for (let i = 0; i < n; i++) num += speedAt(REF, (i + 0.5) / n) / n
    expect(Math.abs(arcLength(REF) - num)).toBeLessThan(1e-8 * num)
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(Math.abs(cnorm(hodographAt(REF, t)) - speedAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('CLAIM 8: no inflection — Im(w̄w′) is constant, so κ never changes sign', () => {
    const constant = inflectionQuantity(REF)
    for (let i = 0; i <= 100; i++) {
      const t = i / 100
      const w = generatorAt(REF, t)
      const wp = csub(REF.w1, REF.w0) // w′ is constant for a linear generator
      const sampled = w.re * wp.im - w.im * wp.re
      expect(Math.abs(sampled - constant)).toBeLessThan(1e-12)
    }
    // κ has one sign throughout.
    const signs = new Set<number>()
    for (let i = 0; i <= 200; i++) signs.add(Math.sign(curvatureAt(REF, i / 200)))
    expect(signs.size).toBe(1)
  })

  it('the hull margin certifies regularity and bounds σ below', () => {
    const m = generatorHullMargin(REF)
    expect(m).toBeGreaterThan(0)
    const lb = speedLowerBound(REF)
    for (let i = 0; i <= 200; i++) expect(speedAt(REF, i / 200)).toBeGreaterThanOrEqual(lb - 1e-12)
    // A generator segment through the origin is exactly the cusp case.
    const cusped: PHCubicGenerator = { w0: C(1, 0), w1: C(-1, 0) }
    expect(generatorHullMargin(cusped)).toBeLessThan(1e-12)
  })
})

// ---------------------------------------------------------------------------
describe('phCubic — problem 1: pin both ends, prescribe P₁', () => {
  const p0 = C(0, 0)
  const p3 = C(3, 0)
  const D = csub(p3, p0)

  it('CLAIM 3: two branches, and both hit P₀, P₁, P₃ exactly', () => {
    const p1 = C(0.7, 1.6)
    const sols = phCubicFromP1(p0, p3, p1)
    expect(sols).toHaveLength(2)
    for (const s of sols) {
      expect(dist(s.controlPoints[0], p0)).toBeLessThan(1e-12)
      expect(dist(s.controlPoints[1], p1)).toBeLessThan(1e-12)
      expect(dist(s.controlPoints[3], p3)).toBeLessThan(1e-10)
    }
    // The two branches differ (different P₂).
    expect(dist(sols[0].controlPoints[2], sols[1].controlPoints[2])).toBeGreaterThan(1e-6)
  })

  it('CLAIM 6: the two branches merge exactly at P₀ + (4/3)D, where r = −1/2', () => {
    const bp = discriminantPoint(p0, p3)
    expect(dist(bp, C(4, 0))).toBeLessThan(1e-12)
    const sols = phCubicFromP1(p0, p3, bp)
    expect(sols).toHaveLength(2)
    for (const s of sols) expect(dist(s.r, C(-0.5, 0))).toBeLessThan(1e-7)
  })

  it('CLAIM 9: P₁ = P₀ + D/3 with r = 1 is the straight line', () => {
    const p1 = cadd(p0, cscale(D, 1 / 3))
    const sols = phCubicFromP1(p0, p3, p1)
    const straight = sols.find((s) => dist(s.r, C(1, 0)) < 1e-9)
    expect(straight).toBeDefined()
    // A straight line: zero curvature and collinear control points.
    expect(Math.abs(straight!.inflectionQuantity)).toBeLessThan(1e-9)
    for (const p of straight!.controlPoints) expect(Math.abs(p.im)).toBeLessThan(1e-9)
  })

  it('CLAIM 4: cusp ⟺ r real and ≤ 0', () => {
    expect(cuspOfRatio(C(-2, 0)).cusped).toBe(true)
    expect(cuspOfRatio(C(-2, 0)).t).toBeCloseTo(1 / 3, 12)
    expect(cuspOfRatio(C(0, 0)).cusped).toBe(true) // t* = 1, the endpoint
    expect(cuspOfRatio(C(1, 0)).cusped).toBe(false)
    expect(cuspOfRatio(C(-2, 0.3)).cusped).toBe(false) // not real
    // And the certificate agrees: a cusped r means margin 0.
    const sols = phCubicFromP1(p0, p3, C(3.5, 0)) // on the chord, past P₃
    for (const s of sols) {
      if (s.cusped) expect(s.speedLowerBound).toBeLessThan(1e-9)
    }
  })

  it('CLAIM 5: both branches are cusped EXACTLY on the segment P₃ → P₀+(4/3)D', () => {
    const seg = cuspForcedSegment(p0, p3)
    expect(dist(seg.from, C(3, 0))).toBeLessThan(1e-12)
    expect(dist(seg.to, C(4, 0))).toBeLessThan(1e-12)

    // Inside the segment: every branch cusped.
    for (const lambda of [1.02, 1.1, 1.25, 1.333]) {
      const p1 = cadd(p0, cscale(D, lambda))
      const sols = phCubicFromP1(p0, p3, p1)
      expect(sols.length).toBeGreaterThan(0)
      expect(sols.every((s) => s.cusped), `λ=${lambda}`).toBe(true)
    }
    // Elsewhere on the chord line: at least one branch regular.
    for (const lambda of [-1, -0.3, 0.2, 0.5, 0.9, 1.4, 2, 5]) {
      const p1 = cadd(p0, cscale(D, lambda))
      const sols = phCubicFromP1(p0, p3, p1)
      expect(sols.some((s) => !s.cusped), `λ=${lambda}`).toBe(true)
    }
    // Off the chord line: NO branch is cusped (r cannot be real).
    for (const p1 of [C(1, 0.5), C(0.5, -1), C(4, 0.2), C(-1, 2)]) {
      const sols = phCubicFromP1(p0, p3, p1)
      expect(sols.every((s) => !s.cusped)).toBe(true)
    }
  })

  it('existence is unrestricted off the degenerate point (put P₁ anywhere)', () => {
    for (const p1 of [C(-3, 4), C(9, -7), C(0.01, 0.01), C(1.5, 0), C(100, 100)]) {
      expect(phCubicFromP1(p0, p3, p1).length).toBeGreaterThan(0)
    }
    expect(phCubicFromP1(p0, p3, p0)).toHaveLength(0) // q = 0
  })

  it('CLAIM 7: MONODROMY — a loop around the branch point exchanges the branches', () => {
    const bp = discriminantPoint(p0, p3)
    const radius = 0.6
    const N = 720
    const loop: Complex[] = []
    for (let i = 0; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      loop.push(cadd(bp, C(radius * Math.cos(a), radius * Math.sin(a))))
    }
    const lifted = liftBranchAlongPath(p0, p3, loop, 0)
    const first = lifted[0]!
    const last = lifted[N]!
    expect(first).not.toBeNull()
    expect(last).not.toBeNull()

    // Same P₁ (the loop closed exactly)...
    expect(dist(loop[0], loop[N])).toBeLessThan(1e-12)
    // ...but the OTHER root: r came back to the sibling, not to itself.
    const startSols = phCubicFromP1(p0, p3, loop[0])
    const sibling = startSols.find((s) => dist(s.r, first.r) > 1e-6)!
    expect(sibling).toBeDefined()
    expect(dist(last.r, sibling.r)).toBeLessThan(1e-6)
    expect(dist(last.r, first.r)).toBeGreaterThan(1e-3)
    // Visible where it matters: P₂ did NOT come home.
    expect(dist(last.controlPoints[2], first.controlPoints[2])).toBeGreaterThan(1e-3)
  })

  it('a loop NOT enclosing the branch point comes home unchanged', () => {
    const bp = discriminantPoint(p0, p3)
    const centre = cadd(bp, C(3, 3)) // far away
    const N = 360
    const loop: Complex[] = []
    for (let i = 0; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      loop.push(cadd(centre, C(0.5 * Math.cos(a), 0.5 * Math.sin(a))))
    }
    const lifted = liftBranchAlongPath(p0, p3, loop, 0)
    expect(dist(lifted[N]!.r, lifted[0]!.r)).toBeLessThan(1e-6)
  })
})

// ---------------------------------------------------------------------------
describe('phCubic — the mirror problem: prescribe P₂ instead of P₁', () => {
  const p0 = C(0, 0)
  const p3 = C(3, 0)

  it('two branches, all hitting P₀, P₂, P₃ exactly', () => {
    const p2 = C(2.1, 1.3)
    const sols = phCubicFromP2(p0, p3, p2)
    expect(sols).toHaveLength(2)
    for (const s of sols) {
      expect(dist(s.controlPoints[0], p0)).toBeLessThan(1e-12)
      expect(dist(s.controlPoints[2], p2)).toBeLessThan(1e-10)
      expect(dist(s.controlPoints[3], p3)).toBeLessThan(1e-10)
    }
    expect(dist(sols[0].r, sols[1].r)).toBeGreaterThan(1e-6)
  })

  it('THE SWAP IS CONTINUOUS: the same curve solves both problems, with the same r', () => {
    // This is what makes clicking P₂ to make it the handle feel seamless — the
    // curve on screen does not change, only which point you are holding.
    const p1 = C(0.7, 1.6)
    for (const s of phCubicFromP1(p0, p3, p1)) {
      const viaP2 = phCubicFromP2(p0, p3, s.controlPoints[2])
      const match = viaP2.find((t) => dist(t.r, s.r) < 1e-8)
      expect(match, `r = ${s.r.re},${s.r.im}`).toBeDefined()
      // Same curve, control point for control point.
      for (let i = 0; i < 4; i++) {
        expect(dist(match!.controlPoints[i], s.controlPoints[i])).toBeLessThan(1e-8)
      }
    }
  })

  it('is the reversal of the P₁ problem: r ↦ 1/r seen from the other end', () => {
    // Reversing t → 1−t reverses the control points and sends r to 1/r, so
    // prescribing P₂ with ends (P₀,P₃) is prescribing P₁ with ends (P₃,P₀).
    const p2 = C(1.9, -1.1)
    const direct = phCubicFromP2(p0, p3, p2)
    const reversed = phCubicFromP1(p3, p0, p2)
    expect(direct).toHaveLength(reversed.length)
    for (const s of direct) {
      const inv = cdiv(C(1, 0), s.r)
      const match = reversed.find((t) => dist(t.r, inv) < 1e-7)
      expect(match, `no reciprocal for r = ${s.r.re},${s.r.im}`).toBeDefined()
    }
  })

  it('P₂ can be placed anywhere except on top of P₀', () => {
    for (const p2 of [C(-2, 3), C(7, -4), C(0.02, 0.01), C(2, 0)]) {
      expect(phCubicFromP2(p0, p3, p2).length).toBeGreaterThan(0)
    }
    expect(phCubicFromP2(p0, p3, p0)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
describe('phCubic — problem 2: through three points', () => {
  it('CLAIM 2: TWO solutions, both interpolating exactly', () => {
    const q0 = C(0, 0)
    const q1 = C(1.2, 1.0)
    const q2 = C(3, 0.2)
    const t1 = 0.5
    const sols = phCubicThroughThreePoints(q0, q1, q2, t1)
    expect(sols).toHaveLength(2)
    for (const s of sols) {
      expect(dist(curveAt(s.generator, s.p0, 0), q0)).toBeLessThan(1e-10)
      expect(dist(curveAt(s.generator, s.p0, t1), q1)).toBeLessThan(1e-9)
      expect(dist(curveAt(s.generator, s.p0, 1), q2)).toBeLessThan(1e-9)
    }
    expect(dist(sols[0].r, sols[1].r)).toBeGreaterThan(1e-6)
  })

  it('two solutions for many data sets and several t₁ values', () => {
    const data: [Complex, Complex, Complex][] = [
      [C(0, 0), C(1, 2), C(4, 1)],
      [C(-1, -1), C(0.5, 0.2), C(2, -3)],
      [C(0, 0), C(2, 0.1), C(4, 0)],
      [C(0, 0), C(-1, 1.5), C(1, 3)],
    ]
    for (const [q0, q1, q2] of data) {
      for (const t1 of [0.25, 0.4, 0.5, 0.75]) {
        const sols = phCubicThroughThreePoints(q0, q1, q2, t1)
        expect(sols.length, `${JSON.stringify([q0, q1, q2])} t1=${t1}`).toBe(2)
        for (const s of sols) {
          expect(dist(curveAt(s.generator, s.p0, t1), q1)).toBeLessThan(1e-8)
          expect(dist(curveAt(s.generator, s.p0, 1), q2)).toBeLessThan(1e-8)
        }
      }
    }
  })

  it('the comparison that makes the point: a quadratic Bézier gives ONE', () => {
    // Lagrange through 3 points at t=0, t1, 1 is a unique quadratic — one curve,
    // where the PH cubic on the same 6 DOF gives two.
    const q0 = C(0, 0), q1 = C(1.2, 1.0), q2 = C(3, 0.2), t1 = 0.5
    // Quadratic Bézier control point from the interpolation condition at t1.
    const b = (1 - t1) * (1 - t1)
    const m = 2 * t1 * (1 - t1)
    const e = t1 * t1
    const p1 = cscale(csub(q1, cadd(cscale(q0, b), cscale(q2, e))), 1 / m)
    const at = (t: number): Complex =>
      cadd(cadd(cscale(q0, (1 - t) * (1 - t)), cscale(p1, 2 * t * (1 - t))), cscale(q2, t * t))
    expect(dist(at(0), q0)).toBeLessThan(1e-12)
    expect(dist(at(t1), q1)).toBeLessThan(1e-12)
    expect(dist(at(1), q2)).toBeLessThan(1e-12)
    // ...and it is the only one: the system is linear.
    expect(phCubicThroughThreePoints(q0, q1, q2, t1)).toHaveLength(2)
  })

  it('recovers a curve it was sampled from', () => {
    const t1 = 0.4
    const q0 = curveAt(REF, REF_P0, 0)
    const q1 = curveAt(REF, REF_P0, t1)
    const q2 = curveAt(REF, REF_P0, 1)
    const sols = phCubicThroughThreePoints(q0, q1, q2, t1)
    const best = Math.min(
      ...sols.map((s) => Math.max(...s.controlPoints.map((p, i) => dist(p, controlPoints(REF, REF_P0)[i])))),
    )
    expect(best).toBeLessThan(1e-8)
  })
})

// ---------------------------------------------------------------------------
describe('phCubic — problem 3: G¹ Hermite, where existence FAILS', () => {
  it('CLAIM 10: round-trips — the angles of a curve recover that curve', () => {
    const angles = g1AnglesOf(REF, REF_P0)
    const cps = controlPoints(REF, REF_P0)
    const sols = phCubicG1Hermite(cps[0], cps[3], angles)
    expect(sols.length).toBeGreaterThan(0)
    const best = Math.min(...sols.map((s) => Math.max(...s.controlPoints.map((p, i) => dist(p, cps[i])))))
    expect(best).toBeLessThan(1e-7)
  })

  it('arc-like data (opposite sides) is always solvable, with ρ = 1 when symmetric', () => {
    for (const alpha of [0.1, 0.4, 0.8, 1.2]) {
      const roots = g1PositiveRoots({ theta0: -alpha, theta1: alpha })
      expect(roots, `alpha=${alpha}`).toHaveLength(1)
      expect(roots[0]).toBeCloseTo(1, 9) // the symmetric generator
    }
  })

  it('opposite-side tangents ⇒ EXACTLY ONE solution, always', () => {
    for (let i = 1; i <= 12; i++) {
      for (let j = 1; j <= 12; j++) {
        const theta0 = -(i * Math.PI) / 26
        const theta1 = (j * Math.PI) / 26
        const [a, , c] = g1Quadratic({ theta0, theta1 })
        expect(Math.sign(a) * Math.sign(c)).toBe(-1) // opposite signs
        expect(g1PositiveRoots({ theta0, theta1 }), `${i},${j}`).toHaveLength(1)
      }
    }
  })

  it('same-side equal tangents have NO solution (ρ² + ρ + 1 = 0)', () => {
    for (const eps of [0.05, 0.2, 0.5, 1.0, -0.3]) {
      const [a, b, c] = g1Quadratic({ theta0: eps, theta1: eps })
      expect(a).toBeCloseTo(b, 12)
      expect(b).toBeCloseTo(c, 12)
      expect(g1PositiveRoots({ theta0: eps, theta1: eps }), `eps=${eps}`).toHaveLength(0)
      expect(phCubicG1Hermite(C(0, 0), C(1, 0), { theta0: eps, theta1: eps })).toHaveLength(0)
    }
  })

  it('θ₀ = 0, θ₁ = π/2 has no solution', () => {
    expect(g1PositiveRoots({ theta0: 0, theta1: Math.PI / 2 })).toHaveLength(0)
  })

  it('same-side data is NEVER solvable, and the sign argument proves it', () => {
    // If θ₀ and θ₁ both lie in (0,π), so does their mean, hence
    // sin θ₀, sin((θ₀+θ₁)/2), sin θ₁ ALL share a sign. A quadratic whose three
    // coefficients share a sign takes only same-sign values for ρ > 0, so it has
    // no positive root. Same for both in (−π,0). Never solvable — because a PH
    // cubic cannot inflect and same-side data demands an inflection.
    for (let i = 1; i <= 20; i++) {
      for (let j = 1; j <= 20; j++) {
        for (const sign of [1, -1]) {
          const theta0 = (sign * i * Math.PI) / 21
          const theta1 = (sign * j * Math.PI) / 21
          const [a, b, c] = g1Quadratic({ theta0, theta1 })
          // all three coefficients share a sign...
          expect(Math.sign(a)).toBe(Math.sign(c))
          expect(Math.sign(b)).toBe(Math.sign(a))
          // ...hence no positive root.
          expect(g1PositiveRoots({ theta0, theta1 }), `${theta0},${theta1}`).toHaveLength(0)
        }
      }
    }
  })

  it('MEASUREMENT: the solvable region of the (θ₀,θ₁) square', () => {
    const N = 24
    let oppositeSolvable = 0, oppositeTotal = 0
    let sameSolvable = 0, sameTotal = 0
    for (let i = -N; i <= N; i++) {
      for (let j = -N; j <= N; j++) {
        if (i === 0 || j === 0) continue
        const theta0 = (i * Math.PI) / (N + 1) / 2
        const theta1 = (j * Math.PI) / (N + 1) / 2
        const solvable = g1PositiveRoots({ theta0, theta1 }).length > 0
        const opposite = Math.sign(Math.sin(theta0)) !== Math.sign(Math.sin(theta1))
        if (opposite) {
          oppositeTotal++
          if (solvable) oppositeSolvable++
        } else {
          sameTotal++
          if (solvable) sameSolvable++
        }
      }
    }
    console.log(
      `\nG1 PH cubic solvability over the (theta0,theta1) square:\n` +
        `  opposite sides: ${oppositeSolvable}/${oppositeTotal} solvable\n` +
        `  same side:      ${sameSolvable}/${sameTotal} solvable`,
    )
    // Opposite sides: unconditional. Same side: never — see the proof above.
    expect(oppositeSolvable).toBe(oppositeTotal)
    expect(sameSolvable).toBe(0)
  })
})
