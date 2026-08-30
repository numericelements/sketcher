// ============================================================================
// The spatial PH cubic, and the claim slide 6 will rest on:
//
//   pin both ends and prescribe P₁, and in the PLANE you get two discrete answers,
//   but in SPACE you get a one-parameter FAMILY — P₂ sweeps a curve.
//
// Everything here is checked headlessly, because the figure will be r3f and r3f
// cannot be. The rendering layer is meant to be thin enough that if these pass, only
// the look is left to eyeball.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat,
  type Vec3,
  QUAT_I,
  QUAT_ONE,
  gaugeRotate,
  polarSandwich,
  qconj,
  qmul,
  qnorm,
  qnormSq,
  quatFromSandwich,
  qvec,
  sandwich,
  vcross,
  vdot,
  vnorm,
  vscale,
  vsub,
} from '../quaternion'
import {
  type SpatialPHCubic,
  arcLength,
  controlPoints,
  curveAt,
  fiberArcLength,
  fiberEllipseRadiusSq,
  fiberTraceIsClosed,
  hodographAt,
  legs,
  nullDirection4,
  planarMembers,
  planarity,
  reductionJacobian,
  reductionLHS,
  reductionRHS,
  shapeQuat,
  solveReduction,
  spatialCubicFiber,
  spatialCubicFiberAtAngle,
  spatialCubicFiberClosedForm,
  speedAt,
} from '../phSpatialCubic'

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const REF: SpatialPHCubic = { A0: Q(1.1, 0.3, -0.4, 0.2), A1: Q(0.6, -0.5, 0.7, 0.9), p0: V(0.2, -0.3, 0.1) }

// ---------------------------------------------------------------------------
describe('quaternion algebra', () => {
  it('the product is Hamilton: ij = k, jk = i, ki = j, and it does NOT commute', () => {
    const i = Q(0, 1, 0, 0), j = Q(0, 0, 1, 0), k = Q(0, 0, 0, 1)
    expect(qmul(i, j)).toEqual(k)
    expect(qmul(j, k)).toEqual(i)
    expect(qmul(k, i)).toEqual(j)
    // Compare numerically: the product legitimately produces signed zeros.
    const near = (a: Quat, b: Quat): number =>
      Math.max(Math.abs(a.u - b.u), Math.abs(a.v - b.v), Math.abs(a.p - b.p), Math.abs(a.q - b.q))
    expect(near(qmul(j, i), Q(0, 0, 0, -1))).toBe(0) // ji = −k, the non-commuting half
    expect(near(qmul(i, i), Q(-1, 0, 0, 0))).toBe(0)
  })

  it('THE IDENTITY the whole construction rests on: |A i A*| = |A|²', () => {
    const quats = [REF.A0, REF.A1, QUAT_ONE, Q(0, 0, 1, 0), Q(-2, 1.5, 0.2, -3), Q(0.01, 0, 0, 0)]
    for (const a of quats) {
      expect(Math.abs(vnorm(sandwich(a)) - qnormSq(a))).toBeLessThan(1e-12 * (1 + qnormSq(a)))
    }
  })

  it('sandwich agrees with the quaternion product A·i·A*', () => {
    for (const a of [REF.A0, REF.A1, Q(-1, 2, -3, 4)]) {
      const viaProduct = qvec(qmul(qmul(a, QUAT_I), qconj(a)))
      expect(vd(sandwich(a), viaProduct)).toBeLessThan(1e-12)
    }
  })

  it('THE GAUGE IS CONTINUOUS: A·(cos θ + i sin θ) leaves A i A* fixed for every θ', () => {
    for (const theta of [0.1, 0.7, 1.9, -2.4, Math.PI]) {
      const rotated = gaugeRotate(REF.A0, theta)
      expect(vd(sandwich(rotated), sandwich(REF.A0))).toBeLessThan(1e-12)
      expect(Math.abs(qnorm(rotated) - qnorm(REF.A0))).toBeLessThan(1e-12)
      // ...and it really did move A, so this is a redundancy and not a no-op.
      const moved = Math.hypot(
        rotated.u - REF.A0.u, rotated.v - REF.A0.v, rotated.p - REF.A0.p, rotated.q - REF.A0.q,
      )
      if (Math.abs(theta % (2 * Math.PI)) > 1e-9) expect(moved).toBeGreaterThan(1e-6)
    }
  })

  it('polarSandwich is pure, symmetric, and the polarization of the sandwich', () => {
    const a = REF.A0, b = REF.A1
    const s = polarSandwich(a, b)
    expect(vd(s, polarSandwich(b, a))).toBeLessThan(1e-12)
    // Q(a+b) − Q(a) − Q(b), the defining identity.
    const sum = Q(a.u + b.u, a.v + b.v, a.p + b.p, a.q + b.q)
    const expected = {
      x: sandwich(sum).x - sandwich(a).x - sandwich(b).x,
      y: sandwich(sum).y - sandwich(a).y - sandwich(b).y,
      z: sandwich(sum).z - sandwich(a).z - sandwich(b).z,
    }
    expect(vd(s, expected)).toBeLessThan(1e-12)
  })

  it('quatFromSandwich inverts the Hopf map, including the antipodal case', () => {
    const targets = [V(1, 0, 0), V(-1, 0, 0), V(0, 2, 0), V(0, 0, -3), V(1.2, -0.7, 0.4), V(-5, 0.001, 0)]
    for (const v of targets) {
      const a = quatFromSandwich(v)!
      expect(a).not.toBeNull()
      expect(vd(sandwich(a), v), `v = ${JSON.stringify(v)}`).toBeLessThan(1e-11 * (1 + vnorm(v)))
    }
    expect(quatFromSandwich(V(0, 0, 0))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
describe('spatial PH cubic — generator to curve', () => {
  it('has four control points and r′ = A i A* at sampled t', () => {
    const cps = controlPoints(REF)
    expect(cps).toHaveLength(4)
    // Cubic Bézier derivative from the legs.
    const deriv = (t: number): Vec3 => {
      const l = [vsub(cps[1], cps[0]), vsub(cps[2], cps[1]), vsub(cps[3], cps[2])]
      const b = [(1 - t) * (1 - t), 2 * t * (1 - t), t * t]
      return {
        x: 3 * (l[0].x * b[0] + l[1].x * b[1] + l[2].x * b[2]),
        y: 3 * (l[0].y * b[0] + l[1].y * b[1] + l[2].y * b[2]),
        z: 3 * (l[0].z * b[0] + l[1].z * b[1] + l[2].z * b[2]),
      }
    }
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(vd(deriv(t), hodographAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('|r′| = σ = |A|², so the speed is a POLYNOMIAL', () => {
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(Math.abs(vnorm(hodographAt(REF, t)) - speedAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('arc length is exact', () => {
    const n = 20000
    let num = 0
    for (let i = 0; i < n; i++) num += speedAt(REF, (i + 0.5) / n) / n
    expect(Math.abs(arcLength(REF) - num)).toBeLessThan(1e-8 * num)
  })

  it('curveAt endpoints are the first and last control points', () => {
    const cps = controlPoints(REF)
    expect(vd(curveAt(REF, 0), cps[0])).toBeLessThan(1e-14)
    expect(vd(curveAt(REF, 1), cps[3])).toBeLessThan(1e-13)
  })

  it('spatial PH cubics are NOT all planar — the figure would collapse if they were', () => {
    // A₀ = 1 + j, A₁ = 1 + k. If some fixed n had n·r′ ≡ 0 the curve would be planar.
    const c: SpatialPHCubic = { A0: Q(1, 0, 1, 0), A1: Q(1, 0, 0, 1), p0: V(0, 0, 0) }
    const [l0, l1, l2] = legs(c.A0, c.A1)
    // Three legs spanning a 3-D volume ⇒ no plane contains the hodograph.
    const det =
      l0.x * (l1.y * l2.z - l1.z * l2.y) -
      l0.y * (l1.x * l2.z - l1.z * l2.x) +
      l0.z * (l1.x * l2.y - l1.y * l2.x)
    expect(Math.abs(det)).toBeGreaterThan(1e-6)
  })
})

// ---------------------------------------------------------------------------
describe('the z-reduction', () => {
  it('SANITY ANCHOR: the straight line is z = 1 with F = (4,0,0)', () => {
    expect(vd(reductionLHS(QUAT_ONE), V(4, 0, 0))).toBeLessThan(1e-14)
    // And it really is the straight line: A₀ = A₁ = 1 gives three equal legs.
    const c: SpatialPHCubic = { A0: QUAT_ONE, A1: QUAT_ONE, p0: V(0, 0, 0) }
    const [l0, l1, l2] = legs(c.A0, c.A1)
    expect(vd(l0, V(1 / 3, 0, 0))).toBeLessThan(1e-14)
    expect(vd(l1, V(1 / 3, 0, 0))).toBeLessThan(1e-14)
    expect(vd(l2, V(1 / 3, 0, 0))).toBeLessThan(1e-14)
  })

  it('a curve satisfies its OWN reduction: LHS(z) = F built from its control points', () => {
    const cps = controlPoints(REF)
    const z = shapeQuat(REF)!
    const F = reductionRHS(REF.A0, cps[0], cps[3])
    expect(vd(reductionLHS(z), F)).toBeLessThan(1e-10 * (1 + vnorm(F)))
  })

  it('the 3×4 Jacobian matches central finite differences', () => {
    const h = 1e-6
    for (const z of [QUAT_ONE, Q(0.4, -0.7, 1.1, 0.2), Q(-1.3, 0.5, 0.1, -0.9)]) {
      const J = reductionJacobian(z)
      const base = [z.u, z.v, z.p, z.q]
      for (let col = 0; col < 4; col++) {
        const plus = base.slice(); plus[col] += h
        const minus = base.slice(); minus[col] -= h
        const lp = reductionLHS(Q(plus[0], plus[1], plus[2], plus[3]))
        const lm = reductionLHS(Q(minus[0], minus[1], minus[2], minus[3]))
        expect(Math.abs(J[0][col] - (lp.x - lm.x) / (2 * h))).toBeLessThan(1e-6)
        expect(Math.abs(J[1][col] - (lp.y - lm.y) / (2 * h))).toBeLessThan(1e-6)
        expect(Math.abs(J[2][col] - (lp.z - lm.z) / (2 * h))).toBeLessThan(1e-6)
      }
    }
  })

  it('THE COUNT: the Jacobian has rank 3, so the fiber is ONE-dimensional', () => {
    for (const z of [QUAT_ONE, Q(0.4, -0.7, 1.1, 0.2), Q(-1.3, 0.5, 0.1, -0.9)]) {
      const J = reductionJacobian(z)
      const n = nullDirection4(J)
      expect(Math.hypot(...n), `z = ${JSON.stringify(z)}`).toBeGreaterThan(1e-8)
      // It really is a null vector of all three rows.
      for (const row of J) {
        expect(Math.abs(row.reduce((s, c, k) => s + c * n[k], 0))).toBeLessThan(1e-9 * Math.hypot(...n))
      }
    }
  })

  it('solveReduction finds a solution for data taken from a real curve', () => {
    const cps = controlPoints(REF)
    const F = reductionRHS(REF.A0, cps[0], cps[3])
    const z = solveReduction(F)
    expect(z).not.toBeNull()
    expect(vd(reductionLHS(z!), F)).toBeLessThan(1e-9 * (1 + vnorm(F)))
  })
})

// ---------------------------------------------------------------------------
describe('the fiber — the slide’s claim', () => {
  const cps = controlPoints(REF)
  const [P0, P1, , P3] = cps

  it('is a genuine ONE-PARAMETER family: many distinct curves, all fitting the data', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 120 })
    expect(fiber.length).toBeGreaterThan(20)
    for (const f of fiber) {
      const c = controlPoints(f.curve)
      expect(vd(c[0], P0)).toBeLessThan(1e-10)
      expect(vd(c[1], P1)).toBeLessThan(1e-7)
      expect(vd(c[3], P3)).toBeLessThan(1e-6)
    }
  })

  it('P₂ genuinely SWEEPS — it is not determined, unlike the planar case', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 120 })
    const spread = Math.max(...fiber.map((f) => vd(f.derived, fiber[0].derived)))
    expect(spread).toBeGreaterThan(0.05)
    // ...and it moves continuously, with no jumps between samples.
    for (let i = 1; i < fiber.length; i++) {
      expect(vd(fiber[i].derived, fiber[i - 1].derived), `gap at ${i}`).toBeLessThan(0.5)
    }
  })

  it('every fiber point is exactly PH: |r′| = σ along each curve', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 60 })
    for (const f of fiber) {
      for (let i = 0; i <= 6; i++) {
        const t = i / 6
        expect(Math.abs(vnorm(hodographAt(f.curve, t)) - speedAt(f.curve, t))).toBeLessThan(1e-10)
      }
    }
  })

  it('the reference curve itself lies on its own fiber', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const best = Math.min(...fiber.map((f) => vd(f.derived, cps[2])))
    expect(best).toBeLessThan(0.02)
  })

  it('returns nothing, rather than something invented, for degenerate data', () => {
    expect(spatialCubicFiber(P0, P0, P3)).toHaveLength(0) // P₁ = P₀: the first leg vanishes
  })

  it('IS ISOMETRIC: every curve on the fiber has the SAME arc length', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const lens = fiber.map((f) => arcLength(f.curve))
    const rel = (Math.max(...lens) - Math.min(...lens)) / Math.max(...lens)
    expect(rel).toBeLessThan(1e-12)
  })

  it('...on every fiber, not just this one', () => {
    // Deterministic pseudo-random configurations.
    let x = 7
    const r = (): number => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 2
    for (let trial = 0; trial < 10; trial++) {
      const a = V(r(), r(), r()), b = V(r(), r(), r()), c = V(r(), r(), r())
      const fiber = spatialCubicFiber(a, b, c, { samples: 60 })
      if (fiber.length < 10) continue
      const lens = fiber.map((f) => arcLength(f.curve))
      const rel = (Math.max(...lens) - Math.min(...lens)) / Math.max(...lens)
      expect(rel, `trial ${trial}`).toBeLessThan(1e-12)
    }
  })

  it('THE IDENTITY behind it: |F|² + F.x = 4T² + 2T with T = z₀ + |z|²', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 80 })
    const F = reductionRHS(fiber[0].curve.A0, P0, P3)
    const rhs = vnorm(F) ** 2 + F.x
    for (const f of fiber) {
      const T = f.z.u + qnormSq(f.z)
      expect(Math.abs(4 * T * T + 2 * T - rhs) / (1 + Math.abs(rhs))).toBeLessThan(1e-12)
    }
  })

  it('fiberArcLength gives it in CLOSED FORM, without tracing anything', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 80 })
    const traced = arcLength(fiber[0].curve)
    const closed = fiberArcLength(P0, P1, P3)
    expect(closed).not.toBeNull()
    expect(Math.abs(closed! - traced) / traced).toBeLessThan(1e-12)

    // And on random data, against the traced value.
    let x = 23
    const r = (): number => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 2
    for (let trial = 0; trial < 8; trial++) {
      const a = V(r(), r(), r()), b = V(r(), r(), r()), c = V(r(), r(), r())
      const f = spatialCubicFiber(a, b, c, { samples: 40 })
      if (f.length < 5) continue
      const got = fiberArcLength(a, b, c)
      expect(got).not.toBeNull()
      expect(Math.abs(got! - arcLength(f[0].curve)) / arcLength(f[0].curve), `trial ${trial}`).toBeLessThan(1e-11)
    }
  })

  it('but the SHAPE does vary a lot — so arc length is a blind selector here', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 140 })
    // Peak curvature over the family, as a stand-in for "how different are these".
    const peak = (c: (typeof fiber)[number]['curve']): number => {
      let m = 0
      for (let i = 0; i <= 30; i++) {
        const t = i / 30
        const h = hodographAt(c, t)
        const eps = 1e-5
        const h2 = hodographAt(c, Math.min(1, t + eps))
        const d = V((h2.x - h.x) / eps, (h2.y - h.y) / eps, (h2.z - h.z) / eps)
        const s = speedAt(c, t)
        m = Math.max(m, vnorm(vcross(h, d)) / (s * s * s))
      }
      return m
    }
    const ks = fiber.map((f) => peak(f.curve))
    // Same length throughout, wildly different shapes.
    expect(Math.max(...ks) / Math.min(...ks)).toBeGreaterThan(5)
  })

  it('CONTAINS SLIDE 4: exactly TWO planar members, and they LIE ON the fiber', () => {
    // The plane problem's two discrete solutions must appear on the spatial family,
    // because a planar PH cubic is a spatial one. This is the embedding, checked.
    const planar = planarMembers(P0, P3, P1)
    expect(planar).toHaveLength(2)

    for (const cps of planar) {
      // Interpolates the same data...
      expect(vd(cps[0], P0)).toBeLessThan(1e-10)
      expect(vd(cps[1], P1)).toBeLessThan(1e-9)
      expect(vd(cps[3], P3)).toBeLessThan(1e-9)
      // ...and is genuinely coplanar with it.
      const [a, b, c] = [1, 2, 3].map((i) => vsub(cps[i], cps[0]))
      const det = a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x)
      expect(Math.abs(det)).toBeLessThan(1e-9)
    }

    // THE POINT: each planar solution's P₂ sits on the traced spatial fiber.
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 240 })
    for (const cps of planar) {
      const nearest = Math.min(...fiber.map((f) => vd(f.derived, cps[2])))
      expect(nearest, 'planar member is on the fiber').toBeLessThan(0.05)
    }
  })

  it('...two on other data too, always, since the plane problem always has two', () => {
    let x = 31
    const r = (): number => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 2
    for (let trial = 0; trial < 10; trial++) {
      const a = V(r(), r(), r()), b = V(r(), r(), r()), c = V(r(), r(), r())
      expect(planarMembers(a, c, b), `trial ${trial}`).toHaveLength(2)
    }
    // Collinear data has no unique plane, and says so rather than guessing.
    expect(planarMembers(V(0, 0, 0), V(2, 0, 0), V(1, 0, 0))).toHaveLength(0)
  })

  it('but the family as a whole is NOT planar — most of it leaves the plane', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 160 })
    const worst = Math.max(...fiber.map((f) => Math.abs(planarity(f.curve))))
    expect(worst).toBeGreaterThan(0.1)
  })

  it('IS AN ELLIPSE, step 1: z₂² + z₃² is CONSTANT along the fiber', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const predicted = fiberEllipseRadiusSq(fiber[0].curve.A0, P0, P3, fiber[0].z)
    expect(predicted).toBeGreaterThan(0)
    for (const f of fiber) {
      expect(Math.abs(f.z.p * f.z.p + f.z.q * f.z.q - predicted)).toBeLessThan(1e-12)
    }
  })

  it('IS AN ELLIPSE, step 2: z₀ is AFFINE in (z₂, z₃)', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const F = reductionRHS(fiber[0].curve.A0, P0, P3)
    const rho2 = fiberEllipseRadiusSq(fiber[0].curve.A0, P0, P3, fiber[0].z)
    for (const f of fiber) {
      const predicted = (F.y * f.z.q - F.z * f.z.p) / (4 * rho2) - 0.5
      expect(Math.abs(predicted - f.z.u)).toBeLessThan(1e-12)
    }
  })

  it('IS AN ELLIPSE, step 3: the traced positions are exactly PLANAR, and eccentric', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const pts = fiber.map((f) => f.derived)
    const n = pts.length
    const c = pts.reduce((a, q) => V(a.x + q.x / n, a.y + q.y / n, a.z + q.z / n), V(0, 0, 0))
    // Smallest-variance direction, by power iteration on (trace·I − covariance).
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    for (const q of pts) {
      const d = [q.x - c.x, q.y - c.y, q.z - c.z]
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += (d[i] * d[j]) / n
    }
    const tr = C[0][0] + C[1][1] + C[2][2]
    let v = [0.3, 0.7, 0.6]
    for (let k = 0; k < 400; k++) {
      const w = [0, 1, 2].map((i) => tr * v[i] - (C[i][0] * v[0] + C[i][1] * v[1] + C[i][2] * v[2]))
      const L = Math.hypot(...w)
      v = w.map((x) => x / L)
    }
    const normal = V(v[0], v[1], v[2])
    const extent = Math.max(...pts.map((q) => vnorm(vsub(q, c))))
    const worst = Math.max(...pts.map((q) => Math.abs(vdot(vsub(q, c), normal))))
    expect(worst / extent, 'planar').toBeLessThan(1e-9)
    // Eccentric, so an ellipse rather than a circle.
    const radii = pts.map((q) => vnorm(vsub(q, c)))
    expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.05)

    // AND ACTUALLY A CONIC, which "planar + eccentric" does not test — any planar
    // non-circular closed curve passes that. Fit the general conic in the plane and
    // check both that the fit is exact and that it is the ELLIPSE branch.
    const e1raw = Math.abs(normal.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0)
    const t1 = vsub(e1raw, vscale(normal, vdot(e1raw, normal)))
    const e1 = vscale(t1, 1 / vnorm(t1))
    const e2 = vcross(normal, e1)
    const uv = pts.map((q) => {
      const d = vsub(q, c)
      return [vdot(d, e1) / extent, vdot(d, e2) / extent]
    })
    // rows of the design matrix for A u² + B uv + C v² + D u + E v + F = 0
    const rows = uv.map(([u, v]) => [u * u, u * v, v * v, u, v, 1])
    const G = Array.from({ length: 6 }, () => new Array(6).fill(0))
    for (const r of rows) for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) G[i][j] += r[i] * r[j]
    // Smallest eigenvector, by power iteration on (trace·I − G) — the same trick the
    // plane normal above uses, so the test needs no new linear algebra.
    const trG = G.reduce((a, r, i) => a + r[i], 0)
    let x = [0.31, 0.71, 0.13, 0.47, 0.23, 0.59]
    for (let k = 0; k < 2000; k++) {
      const y = Array.from({ length: 6 }, (_, i) =>
        trG * x[i] - G[i].reduce((a, g, j) => a + g * x[j], 0))
      const L = Math.hypot(...y)
      x = y.map((v) => v / L)
    }
    const worstConic = Math.max(...rows.map((r) => Math.abs(r.reduce((a, v, i) => a + v * x[i], 0))))
    expect(worstConic, 'lies on a conic').toBeLessThan(1e-9)
    // B² − 4AC < 0 is the ellipse branch (= 0 parabola, > 0 hyperbola)
    expect(x[1] * x[1] - 4 * x[0] * x[2], 'the ellipse branch').toBeLessThan(0)
  })

  it('CLOSED FORM: θ ↦ z solves the reduction exactly, with no continuation', () => {
    const F = reductionRHS(spatialCubicFiber(P0, P1, P3, { samples: 8 })[0].curve.A0, P0, P3)
    for (let i = 0; i < 64; i++) {
      const f = spatialCubicFiberAtAngle(P0, P1, P3, (2 * Math.PI * i) / 64)
      expect(f).not.toBeNull()
      // the reduction is the whole constraint, so satisfying it IS holding the grip
      expect(vnorm(vsub(reductionLHS(f!.z), F))).toBeLessThan(1e-12)
    }
  })

  it('CLOSED FORM: it is the SAME fiber the tracer walks, point for point', () => {
    const traced = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    expect(traced.length).toBeGreaterThan(50)
    for (const t of traced) {
      // recover the tracer point's own angle, then ask the formula for that angle
      const f = spatialCubicFiberAtAngle(P0, P1, P3, Math.atan2(t.z.q, t.z.p))
      expect(f).not.toBeNull()
      expect(Math.abs(f!.z.u - t.z.u)).toBeLessThan(1e-9)
      expect(Math.abs(f!.z.v - t.z.v)).toBeLessThan(1e-9)
      expect(vnorm(vsub(f!.derived, t.derived))).toBeLessThan(1e-9)
    }
  })

  it('CLOSED FORM: the loop closes by construction, no end-gap test needed', () => {
    const loop = spatialCubicFiberClosedForm(P0, P1, P3, 120)
    expect(loop).toHaveLength(120)
    const wrapped = spatialCubicFiberAtAngle(P0, P1, P3, 2 * Math.PI)!
    expect(vnorm(vsub(wrapped.derived, loop[0].derived))).toBeLessThan(1e-12)
    // and it covers the same ground as the tracer: every traced point is on it
    const traced = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    for (const t of traced) {
      const near = Math.min(...loop.map((f) => vnorm(vsub(f.derived, t.derived))))
      expect(near).toBeLessThan(0.05)
    }
  })

  it('IS CLOSED — so the slider is an angle, and the drawn fiber should loop', () => {
    expect(fiberTraceIsClosed(spatialCubicFiber(P0, P1, P3, { samples: 200 }))).toBe(true)
    // A truncated trace is NOT reported closed — the figure must leave that one open.
    const partial = spatialCubicFiber(P0, P1, P3, { samples: 200 }).slice(0, 40)
    expect(fiberTraceIsClosed(partial)).toBe(false)
    expect(fiberTraceIsClosed([])).toBe(false)
  })

  it('MEASUREMENT: how far P₂ actually roams', () => {
    const fiber = spatialCubicFiber(P0, P1, P3, { samples: 200 })
    const spread = Math.max(...fiber.map((a) => Math.max(...fiber.map((b) => vd(a.derived, b.derived)))))
    const chord = vd(P3, P0)
    console.log(
      `\nspatial PH cubic fiber: ${fiber.length} samples, ` +
        `P₂ roams ${spread.toFixed(3)} across a chord of ${chord.toFixed(3)} ` +
        `(${((100 * spread) / chord).toFixed(0)}% of it)`,
    )
    expect(fiber.length).toBeGreaterThan(20)
  })
})
