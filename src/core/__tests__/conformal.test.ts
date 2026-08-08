// ============================================================================
// The conformal model of R³ — the space in which Möbius transformations are LINEAR.
//
// Every claim in the module header is checked here, because the model's whole value is
// that a handful of identities hold exactly, and if any of them is off by a sign the
// linearity is worthless.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import { controlPoints as septicControlPoints, curveAt, findClassMember } from '../phSpatialSeptic'
import { type Sphere, invert } from '../phMobius'
import {
  type Conformal,
  type Mat5,
  POINT_AT_INFINITY,
  conformalLiftBezier,
  evaluateRationalBezier,
  matrixOf,
  applyMatrix,
  inversiveBendGenerator,
  isometryDefect,
  matrixExp5,
  minAbsWeight,
  mobiusImageRationalBezier,
  multiply5,
  pointMap,
  reflectionMatrix,
  distanceFromInnerProduct,
  euclideanDistance,
  infinityDisplacement,
  innerProduct,
  lift,
  liftHomogeneous,
  nullDefect,
  project,
  reflectIn,
  sphereVector,
  translate,
} from '../conformal'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const CURVE = { A: findClassMember()!, p0: V(-1.1, -0.35, 0.1) }
const TS = [0.1, 0.3, 0.5, 0.7, 0.9]
const PTS = TS.map((t) => curveAt(CURVE, t))
const SPHERES: Sphere[] = [
  { centre: V(0.9, 1.3, -1.1), radius: 1 },
  { centre: V(0.9, 1.3, -1.1), radius: 1.7 },
  { centre: V(-2.2, 0.4, 0.8), radius: 0.6 },
  { centre: V(0, 0, 0), radius: 1 },
]

// ---------------------------------------------------------------------------
describe('the embedding', () => {
  it('lift then project is the identity — EXACTLY', () => {
    for (const x of PTS) {
      const back = project(lift(x)) as Vec3
      expect(vnorm(vsub(back, x))).toBe(0)
    }
  })

  it('lifted points are null — EXACTLY', () => {
    for (const x of PTS) expect(innerProduct(lift(x), lift(x))).toBe(0)
  })

  it('DISTANCE IS AN INNER PRODUCT: ⟨P(x),P(y)⟩ = −½‖x−y‖²', () => {
    // The identity the whole model rests on: it is why O(4,1) is the Möbius group.
    for (const x of PTS) {
      for (const y of PTS) {
        expect(Math.abs(distanceFromInnerProduct(lift(x), lift(y)) - euclideanDistance(x, y)))
          .toBeLessThan(1e-8)
      }
    }
  })

  it('the rational lift is null too, and doubles the degree structurally', () => {
    // P̃ = (2p_o², 2p_o·p, ‖p‖²): the ‖p‖² component is what doubles the degree.
    for (const x of PTS) {
      for (const w of [1, 0.4, 2.5]) {
        const p = { x: x.x * w, y: x.y * w, z: x.z * w }
        const P = liftHomogeneous(p, w)
        expect(nullDefect(P)).toBeLessThan(1e-15)
        // and it projects to the same point as the plain lift
        expect(vnorm(vsub(project(P) as Vec3, x))).toBeLessThan(1e-12)
      }
    }
  })

  it('∞ is the vector with no weight, and does not project', () => {
    expect(project(POINT_AT_INFINITY)).toBeNull()
    expect(innerProduct(POINT_AT_INFINITY, POINT_AT_INFINITY)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
describe('spheres, and inversion as a LINEAR reflection', () => {
  it('⟨S,S⟩ = ρ²', () => {
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      expect(Math.abs(innerProduct(S, S) - s.radius * s.radius)).toBeLessThan(1e-14)
    }
  })

  it('THE CLAIM: a constant 5×5 reflection reproduces the inversion of core/phMobius', () => {
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      for (const x of PTS) {
        const got = project(reflectIn(lift(x), S) as Conformal) as Vec3
        const want = invert(x, s) as Vec3
        expect(vnorm(vsub(got, want)) / (1 + vnorm(want)), `ρ=${s.radius}`).toBeLessThan(1e-12)
      }
    }
  })

  it('and the reflection is in O(4,1) — it preserves the inner product', () => {
    // Which is the same as saying it is a Möbius transformation, so this is the
    // structural claim rather than a numerical nicety.
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      for (const x of PTS) {
        const rx = reflectIn(lift(x), S) as Conformal
        expect(nullDefect(rx)).toBeLessThan(1e-12)
        for (const y of PTS) {
          const ry = reflectIn(lift(y), S) as Conformal
          expect(Math.abs(innerProduct(rx, ry) - innerProduct(lift(x), lift(y)))).toBeLessThan(1e-11)
        }
      }
    }
  })

  it('reflecting twice is the identity', () => {
    const S = sphereVector(SPHERES[0].centre, SPHERES[0].radius)
    for (const x of PTS) {
      const twice = reflectIn(reflectIn(lift(x), S) as Conformal, S) as Conformal
      expect(vnorm(vsub(project(twice) as Vec3, x))).toBeLessThan(1e-12)
    }
  })
})

// ---------------------------------------------------------------------------
describe('THE DEGREE CRITERION — does the map move ∞?', () => {
  it('a translation fixes ∞ exactly, so the projected degree is unchanged', () => {
    for (const t of [V(0.7, -1.2, 0.4), V(-3, 0, 2.5), V(0, 0, 0)]) {
      expect(infinityDisplacement((X) => translate(X, t))).toBe(0)
    }
  })

  it('every inversion MOVES ∞, so the degree doubles', () => {
    // Measured displacements 0.9 … 12.2 across these spheres — not a marginal effect.
    for (const s of SPHERES) {
      const S = sphereVector(s.centre, s.radius)
      expect(infinityDisplacement((X) => reflectIn(X, S)), `ρ=${s.radius}`).toBeGreaterThan(0.1)
    }
  })

  it('and a translation really is a Möbius transformation too', () => {
    for (const t of [V(0.7, -1.2, 0.4)]) {
      for (const x of PTS) {
        const moved = translate(lift(x), t)
        expect(nullDefect(moved)).toBeLessThan(1e-15)
        const back = project(moved) as Vec3
        expect(vnorm(vsub(back, V(x.x + t.x, x.y + t.y, x.z + t.z)))).toBeLessThan(1e-12)
      }
    }
  })
})

// ---------------------------------------------------------------------------
describe('THE IMAGE\'S RATIONAL BÉZIER, two ways', () => {
  const CPS = septicControlPoints(CURVE)

  it('the lift\'s Bernstein coefficients reproduce the lift, and are 2n+1 of them', () => {
    const coeffs = conformalLiftBezier(CPS)
    expect(CPS).toHaveLength(8)
    expect(coeffs).toHaveLength(15) // degree 14 for a degree-7 source
    for (const t of [0, 0.17, 0.5, 0.83, 1]) {
      const got = evalConformal(coeffs, t)
      const want = lift(curveAt(CURVE, t))
      for (let i = 0; i < 5; i++) {
        expect(Math.abs(got[i] - want[i]), `component ${i} at t=${t}`).toBeLessThan(1e-12)
      }
    }
  })

  it('and it is null identically, not merely at the ends', () => {
    const coeffs = conformalLiftBezier(CPS)
    for (let k = 0; k <= 40; k++) {
      expect(nullDefect(evalConformal(coeffs, k / 40))).toBeLessThan(1e-14)
    }
  })

  it('THE TWO WAYS AGREE: matrix on coefficients vs direct inversion of the curve', () => {
    // The claim the figure will rest on. One route pushes 15 Bernstein coefficients
    // through a constant 5×5 matrix; the other inverts sampled curve points. They must
    // give the same curve.
    const coeffs = conformalLiftBezier(CPS)
    for (const s of SPHERES) {
      const M = reflectionMatrix(sphereVector(s.centre, s.radius)) as Mat5
      const rb = mobiusImageRationalBezier(coeffs, M)
      expect(rb.points).toHaveLength(15)
      for (let k = 0; k <= 20; k++) {
        const t = k / 20
        const viaMatrix = evaluateRationalBezier(rb, t) as Vec3
        const direct = invert(curveAt(CURVE, t), s) as Vec3
        expect(vnorm(vsub(viaMatrix, direct)) / (1 + vnorm(direct)), `ρ=${s.radius} t=${t}`)
          .toBeLessThan(1e-9)
      }
    }
  })

  it('WEIGHTS ARE THE DEGREE CRITERION: constant for a similarity, varying for an inversion', () => {
    const coeffs = conformalLiftBezier(CPS)
    // A polynomial curve lifts with o-component ≡ 1, so all weights are 1.
    const identity: Mat5 = [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => (i === j ? 1 : 0)))
    const plain = mobiusImageRationalBezier(coeffs, identity)
    for (const w of plain.weights) expect(Math.abs(w - 1)).toBeLessThan(1e-12)

    // A translation leaves that component alone — still polynomial.
    const T = matrixOf((x) => translate(x, V(0.7, -1.2, 0.4))) as Mat5
    const translated = mobiusImageRationalBezier(coeffs, T)
    for (const w of translated.weights) expect(Math.abs(w - 1)).toBeLessThan(1e-12)

    // An inversion does not: the weights genuinely vary, so the image is rational. The
    // claim is that they VARY, not that they vary by any particular amount — and the
    // contrast is ten orders wide, since the polynomial cases above sit at 1e-12.
    for (const s of SPHERES) {
      const M = reflectionMatrix(sphereVector(s.centre, s.radius)) as Mat5
      const inverted = mobiusImageRationalBezier(coeffs, M)
      const spread = Math.max(...inverted.weights) / Math.min(...inverted.weights)
      expect(spread, `ρ=${s.radius} weights did not vary`).toBeGreaterThan(1.05)
      expect(minAbsWeight(inverted)).toBeGreaterThan(0)
    }
  })

  it('a translated image is the translated curve — the plumbing is not just self-consistent', () => {
    const coeffs = conformalLiftBezier(CPS)
    const t0 = V(0.7, -1.2, 0.4)
    const T = matrixOf((x) => translate(x, t0)) as Mat5
    const rb = mobiusImageRationalBezier(coeffs, T)
    for (let k = 0; k <= 10; k++) {
      const t = k / 10
      const got = evaluateRationalBezier(rb, t) as Vec3
      const p = curveAt(CURVE, t)
      expect(vnorm(vsub(got, V(p.x + t0.x, p.y + t0.y, p.z + t0.z)))).toBeLessThan(1e-11)
    }
  })
})

/** de Casteljau on conformal coefficients — test-side, to check the plumbing. */
function evalConformal(coeffs: readonly Conformal[], t: number): Conformal {
  const h = coeffs.map((c) => [...c])
  const n = h.length - 1
  for (let r = 1; r <= n; r++) {
    for (let i = 0; i <= n - r; i++) {
      for (let c = 0; c < 5; c++) h[i][c] = (1 - t) * h[i][c] + t * h[i + 1][c]
    }
  }
  return h[0] as unknown as Conformal
}

// ---------------------------------------------------------------------------
describe('GENERATORS — exp(Σ sᵢXᵢ) so a slider starts at the identity', () => {
  it('exp of a generator is in O(4,1) — a genuine Möbius transformation', () => {
    for (const b of [V(0.2, 0, 0), V(0, -0.15, 0.1), V(0.08, 0.12, -0.2)]) {
      for (const s of [0.2, 1, 3]) {
        const G = inversiveBendGenerator({ x: b.x * s, y: b.y * s, z: b.z * s })
        expect(isometryDefect(matrixExp5(G)), `b=${b.x},${b.y},${b.z} s=${s}`).toBeLessThan(1e-10)
      }
    }
  })

  it('at zero it IS the identity, so the slider home position is no transformation', () => {
    const M = matrixExp5(inversiveBendGenerator(V(0, 0, 0)))
    for (const x of PTS) {
      expect(vnorm(vsub(pointMap(M)(x) as Vec3, x))).toBeLessThan(1e-12)
    }
  })

  it('the inversive bend generator is NILPOTENT, so exp = I + G + G²/2 exactly', () => {
    const G = inversiveBendGenerator(V(0.3, -0.2, 0.15))
    const G3 = multiply5(multiply5(G, G), G)
    let worst = 0
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) worst = Math.max(worst, Math.abs(G3[i][j]))
    expect(worst).toBeLessThan(1e-14)
    // and the closed form agrees with scaling-and-squaring
    const G2 = multiply5(G, G)
    const closed = [0, 1, 2, 3, 4].map((i) =>
      [0, 1, 2, 3, 4].map((j) => (i === j ? 1 : 0) + G[i][j] + G2[i][j] / 2))
    const viaExp = matrixExp5(G)
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) expect(Math.abs(closed[i][j] - viaExp[i][j])).toBeLessThan(1e-12)
    }
  })

  it('exp(−G) inverts exp(G) — which is what makes the drag invertible', () => {
    const b = V(0.25, -0.18, 0.12)
    const M = matrixExp5(inversiveBendGenerator(b))
    const Minv = matrixExp5(inversiveBendGenerator(V(-b.x, -b.y, -b.z)))
    for (const x of PTS) {
      const there = pointMap(M)(x) as Vec3
      const back = pointMap(Minv)(there) as Vec3
      expect(vnorm(vsub(back, x))).toBeLessThan(1e-9)
    }
  })

  it('it MOVES ∞ — so it genuinely bends, and doubles the degree', () => {
    const M = matrixExp5(inversiveBendGenerator(V(0.2, -0.1, 0.15)))
    expect(infinityDisplacement((X) => applyMatrix(M, X))).toBeGreaterThan(0.05)
    // and the image's weights vary, the coefficient-level version of the same fact
    const rb = mobiusImageRationalBezier(conformalLiftBezier(septicControlPoints(CURVE)), M)
    expect(Math.max(...rb.weights) / Math.min(...rb.weights)).toBeGreaterThan(1.02)
  })
})
