/**
 * THE MINIMAL SCATTERED GRIP, REDUCED — degree 5, hold {0,1,3,5}: the first case beyond the
 * two-ends theorem (prefix 2, one interior point, suffix 1). Start of the scattered program
 * (docs/SURJECTIVITY.md).
 *
 * The reduction, verified here against the production control-point code:
 *   𝒜₀ from the first leg: S(𝒜₀) = 5(P₁−P₀); free λ₁ = 𝒜₁, λ₂ = 𝒜₂; and the blocks are
 *   (1)  ½·polar(𝒜₀,λ₁) + ⅔·S(λ₁) + ⅙·polar(𝒜₀,λ₂) = U := 5(P₃−P₁)
 *   (2)  ½·polar(λ₁,λ₂)  +  S(λ₂)                    = V := 5(P₅−P₃)
 *
 * The INNER square completes exactly as in the two-ends theorem:
 *   (2) ⟺ S(λ₂ + λ₁/2) = V + S(λ₁)/4 — a Hopf inversion for every λ₁, gauge circle θ free.
 * Substituting λ₂(λ₁, θ) into (1) leaves 3 equations in 5 unknowns (λ₁, θ) — the OUTER
 * problem, not yet closed in closed form; here it is solved by Gauss–Newton and pinned.
 *
 * Also pinned: the properness scaling. The homogeneous parts vanish TRIANGULARLY
 * (S(λ₁) = 0 ⟹ λ₁ = 0 ⟹ S(λ₂) = 0 ⟹ λ₂ = 0), so |targets| ≳ |λ|² and solutions must scale
 * like √(target scale). The kill uses only anisotropy of the square, so the SAME grip is
 * proper in the plane too — where the square homogeneous system upgrades to full surjectivity
 * (lean companion's correction; the 2D blow-up specimens live at genuinely NON-proper grips).
 * The test measures max|λ|/√s bounded across target scales 1 → 1000.
 */
import { describe, expect, it } from 'vitest'
import {
  type Quat, type Vec3,
  qsub, qscale, qnorm,
  vadd, vsub, vscale, vnorm,
  sandwich, polarSandwich, quatFromSandwich, gaugeRotate,
} from '../quaternion'
import { controlPoints } from '../phSpatialFreeDragN'
import { leastSquares } from '../linalg'

let a0seed = 20260830
const rng = (): number => {
  a0seed = (a0seed + 0x6d2b79f5) >>> 0
  let t = Math.imul(a0seed ^ (a0seed >>> 15), 1 | a0seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const rq = (s: number): Quat => ({ u: s * (2 * rng() - 1), v: s * (2 * rng() - 1), p: s * (2 * rng() - 1), q: s * (2 * rng() - 1) })
const rv = (s: number): Vec3 => ({ x: s * (2 * rng() - 1), y: s * (2 * rng() - 1), z: s * (2 * rng() - 1) })

const GRIP = [0, 1, 3, 5]

/** The two block conditions of the reduction, straight from the header formulas. */
function blocks(A0: Quat, l1: Quat, l2: Quat): [Vec3, Vec3] {
  const b1 = vadd(
    vadd(vscale(polarSandwich(A0, l1), 1 / 2), vscale(sandwich(l1), 2 / 3)),
    vscale(polarSandwich(A0, l2), 1 / 6))
  const b2 = vadd(vscale(polarSandwich(l1, l2), 1 / 2), sandwich(l2))
  return [b1, b2]
}

/** λ₂ from the inner completed square, given λ₁ and the gauge angle θ. */
function inner(l1: Quat, V: Vec3, theta: number): Quat {
  const W = vadd(V, vscale(sandwich(l1), 1 / 4))
  const mu0 = quatFromSandwich(W)
  const mu = mu0 ? gaugeRotate(mu0, theta) : { u: 0, v: 0, p: 0, q: 0 }
  return qsub(mu, qscale(l1, 1 / 2))
}

/** Solve the outer problem by Gauss–Newton on (λ₁, θ); returns the full spinor or null. */
function solveReduced(targets: readonly Vec3[]): { A: Quat[]; p0: Vec3 } | null {
  const A0 = quatFromSandwich(vscale(vsub(targets[1], targets[0]), 5))
  if (!A0) return null
  const U = vscale(vsub(targets[2], targets[1]), 5)
  const V = vscale(vsub(targets[3], targets[2]), 5)
  const scale = Math.max(vnorm(U), vnorm(V), 1)
  const F = (x: readonly number[]): [number, number, number] => {
    const l1: Quat = { u: x[0], v: x[1], p: x[2], q: x[3] }
    const r = blocks(A0, l1, inner(l1, V, x[4]))[0]
    return [r.x - U.x, r.y - U.y, r.z - U.z]
  }
  for (let start = 0; start < 60; start++) {
    const s0 = [0.5, 1.5, 4][start % 3] * Math.sqrt(scale / 5)
    const l0 = rq(s0)
    let x = [l0.u, l0.v, l0.p, l0.q, 2 * Math.PI * rng()]
    for (let it = 0; it < 90; it++) {
      const f = F(x)
      const res = Math.hypot(...f)
      if (res < 1e-10 * scale) {
        const l1: Quat = { u: x[0], v: x[1], p: x[2], q: x[3] }
        return { A: [A0, l1, inner(l1, V, x[4])], p0: targets[0] }
      }
      const J: number[][] = [[], [], []]
      for (let k = 0; k < 5; k++) {
        const h = 1e-6 * Math.max(1, Math.abs(x[k]))
        const xp = [...x]
        xp[k] += h
        const fp = F(xp)
        for (let r = 0; r < 3; r++) J[r].push((fp[r] - f[r]) / h)
      }
      const step = leastSquares(J, f.map((v) => -v))
      if (!step.every(Number.isFinite)) break
      const len = Math.hypot(...step)
      const cap = 2 * Math.sqrt(scale)
      const damped = len > cap ? step.map((v) => (v * cap) / len) : step
      x = x.map((v, k) => v + damped[k])
    }
  }
  return null
}

const heldError = (c: { A: Quat[]; p0: Vec3 }, targets: readonly Vec3[]): number => {
  const pts = controlPoints(c)
  return Math.max(...GRIP.map((idx, i) => vnorm(vsub(pts[idx], targets[i]))))
}

describe('the scattered quintic reduction — hold {0,1,3,5}', () => {
  it('the reduction formulas match the production control points exactly', () => {
    for (let k = 0; k < 20; k++) {
      const A0 = rq(1.5)
      const l1 = rq(1.5)
      const l2 = rq(1.5)
      const p0: Vec3 = rv(1)
      const pts = controlPoints({ A: [A0, l1, l2], p0 })
      const [b1, b2] = blocks(A0, l1, l2)
      expect(vnorm(vsub(vscale(vsub(pts[1], pts[0]), 5), sandwich(A0)))).toBeLessThan(1e-10)
      expect(vnorm(vsub(vscale(vsub(pts[3], pts[1]), 5), b1))).toBeLessThan(1e-10)
      expect(vnorm(vsub(vscale(vsub(pts[5], pts[3]), 5), b2))).toBeLessThan(1e-10)
    }
  })

  it('the inner completed square satisfies block 2 identically', () => {
    for (let k = 0; k < 20; k++) {
      const l1 = rq(2)
      const V = rv(3)
      const l2 = inner(l1, V, 2 * Math.PI * rng())
      const b2 = blocks(rq(1), l1, l2)[1]
      expect(vnorm(vsub(b2, V))).toBeLessThan(1e-9)
    }
  })

  it('solves random configurations across target scales, with √s solution scaling', () => {
    for (const s of [1, 10, 100, 1000]) {
      let worstRatio = 0
      for (let cfg = 0; cfg < 10; cfg++) {
        const targets = Array.from({ length: 4 }, () => rv(s))
        const c = solveReduced(targets)
        expect(c, `scale ${s} cfg ${cfg}: outer Gauss–Newton failed`).not.toBeNull()
        expect(heldError(c!, targets)).toBeLessThan(1e-7 * s)
        const mag = Math.max(qnorm(c!.A[1]), qnorm(c!.A[2]))
        worstRatio = Math.max(worstRatio, mag / Math.sqrt(5 * s))
      }
      // Properness made visible: |λ| / √(target scale) stays O(1) — no 2D-style blow-up.
      expect(worstRatio, `scale ${s}`).toBeLessThan(12)
    }
  })
})
