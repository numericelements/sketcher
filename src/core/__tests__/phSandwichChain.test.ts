// ============================================================================
// THE SANDWICH CHAIN — pinning the structural fact behind slide 6, and the
// template for slide 7. Full write-up: docs/PH_SANDWICH_CHAIN.md
//
// The reduced spatial-cubic equation
//
//     i z* + z i + 2 z i z* = F
//
// looks like it needs continuation because of the linear part. It does not:
//
//     2(z + ½) i (z + ½)* = 2 z i z* + (z i + i z*) + ½i
//
// so with Z = z + ½ the whole thing is ONE SANDWICH EQUATION,
//
//     Z i Z* = G,        G = (F + i/2)/2
//
// whose solution set is a CIRCLE, Z = √|G|·n·exp(φi). Hence:
//
//   · the fiber is a closed curve, by periodicity in φ — not by luck in a tracer;
//   · arc length is constant on it, because a sandwich FORCES |Z|² = |G|
//     (and |Z|² = T + ¼) — the isometry, in one line;
//   · the fiber's image is an ELLIPSE, because the middle leg is linear in z and
//     a linear image of a circle is an ellipse.
//
// Slide 6 still runs on predictor-corrector continuation, deliberately (it works,
// and the retrofit waits until the later slides are built). These tests are the
// record that the closed form is correct, so that option stays open.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat,
  type Vec3,
  gaugeRotate,
  qinv,
  qmul,
  qnormSq,
  quatFromSandwich,
  sandwich,
  vnorm,
  vsub,
} from '../quaternion'
import { reductionLHS, reductionRHS, spatialCubicFiberAt } from '../phSpatialCubic'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const rel = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b)) / (1 + vnorm(b))

// Slide 6's own configuration, so this pins the shipped figure's mathematics.
const P0 = V(-0.9, 0, -0.35)
const P3 = V(0.9, 0, -0.35)
const HANDLE = V(-0.45, 0.35, 0.5)

/** Z = z + ½ — the shift that turns the reduction into a sandwich. */
const shift = (z: Quat): Quat => ({ u: z.u + 0.5, v: z.v, p: z.p, q: z.q })

/** G = (F + i/2)/2 — the sandwich's right-hand side. */
const sandwichRHS = (F: Vec3): Vec3 => V((F.x + 0.5) / 2, F.y / 2, F.z / 2)

describe('the shift identity', () => {
  const fiber = spatialCubicFiberAt(P0, P3, HANDLE, 1, { samples: 120 })
  const F = reductionRHS(fiber[0].curve.A0, P0, P3)

  it('2·Z i Z* = F + i/2 holds along the whole traced fiber', () => {
    expect(fiber.length).toBeGreaterThan(20)
    const target = V(F.x + 0.5, F.y, F.z)
    for (const s of fiber) {
      const lhs = sandwich(shift(s.z))
      expect(rel(V(2 * lhs.x, 2 * lhs.y, 2 * lhs.z), target)).toBeLessThan(1e-12)
    }
  })

  it('|Z|² is constant, and equals |G| — THE ISOMETRY, forced by the sandwich', () => {
    const predicted = vnorm(sandwichRHS(F))
    for (const s of fiber) {
      expect(Math.abs(qnormSq(shift(s.z)) - predicted) / predicted).toBeLessThan(1e-12)
    }
    // And |Z|² = |z|² + z₀ + ¼ = T + ¼, which is what the hand-derived proof called T.
    const s0 = fiber[0].z
    const T = s0.u + qnormSq(s0)
    expect(Math.abs(qnormSq(shift(s0)) - (T + 0.25))).toBeLessThan(1e-12)
  })
})

describe('the closed form GENERATES the fiber (no continuation needed)', () => {
  const fiber = spatialCubicFiberAt(P0, P3, HANDLE, 1, { samples: 120 })
  const F = reductionRHS(fiber[0].curve.A0, P0, P3)
  const Z0 = quatFromSandwich(sandwichRHS(F))

  it('every angle φ yields an exact solution of the reduction equation', () => {
    expect(Z0).not.toBeNull()
    for (let k = 0; k < 24; k++) {
      const phi = (2 * Math.PI * k) / 24
      const Z = gaugeRotate(Z0 as Quat, phi)
      const z: Quat = { u: Z.u - 0.5, v: Z.v, p: Z.p, q: Z.q }
      expect(rel(reductionLHS(z), F), `φ = ${phi.toFixed(3)}`).toBeLessThan(1e-12)
    }
  })

  it('it is closed by periodicity: φ and φ + 2π give the same member', () => {
    const a = gaugeRotate(Z0 as Quat, 0.7)
    const b = gaugeRotate(Z0 as Quat, 0.7 + 2 * Math.PI)
    expect(Math.hypot(a.u - b.u, a.v - b.v, a.p - b.p, a.q - b.q)).toBeLessThan(1e-12)
  })

  it('the CIRCLE IS THE WHOLE FIBER: every traced point is Z₀·exp(φi)', () => {
    // Z₀⁻¹Z must be a unit quaternion in the {1, i} plane — no p, q parts. That is
    // what makes the solution set exactly one circle, so a single angle is a
    // complete parameterisation and the tracer finds nothing the formula misses.
    const inv = qinv(Z0 as Quat)
    expect(inv).not.toBeNull()
    for (const s of fiber) {
      const g = qmul(inv as Quat, shift(s.z))
      expect(Math.hypot(g.p, g.q)).toBeLessThan(1e-9)
      expect(Math.abs(Math.hypot(g.u, g.v) - 1)).toBeLessThan(1e-9)
    }
  })
})
