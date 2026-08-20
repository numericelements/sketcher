// ============================================================================
// SPATIAL PH SEPTICS THROUGH SIX PRESCRIBED CONTROL POINTS — every real one.
//
// The rung where space finally gives a COUNT. 𝒜 is a cubic, the family is 4k+2 = 18, and six
// control points at three apiece is 18 exactly — so nothing is left over, unlike the spatial cubic
// (one dimension) and quintic (two). It is the only spatial degree below 9 where that happens,
// because 3 divides 4k+2 only when k ≡ 1 (mod 3).
//
// AND THE COUNT IS REAL, NOT COMPLEX, WHICH IS THE WHOLE DIFFERENCE FROM THE PLANE. In the plane
// the unknowns are complex, every Bézout root is a genuine curve, and the answer is 2^{K−1} exactly.
// Here the unknowns are quaternionic and the closing system is real: the resultant has degree 8,
// but only its REAL roots are curves. Measured: 0, 2, 4 or 6 — always even, because non-real roots
// of a real polynomial pair up — and over forty arbitrary six-point polygons, HALF carried no real
// septic at all. A figure built on this must expect the empty answer.
//
// THE CASCADE. The six points fix the first five hodograph legs N₀…N₄, and each stage is the SAME
// operator B ↦ polar(𝒜₀,B), whose kernel is ℝ·(𝒜₀i) — constant across stages, which is what makes
// the whole thing tractable:
//
//   N₀  a sandwich in 𝒜₀ alone   →  𝒜₀ = quatFromSandwich(N₀), and the Hopf gauge is spent here
//   N₁  linear in 𝒜₁ given 𝒜₀    →  𝒜₁ = a₁ + t₁·k
//   N₂  linear in 𝒜₂             →  𝒜₂ = a₂(t₁) + t₂·k
//   N₃  linear in 𝒜₃             →  𝒜₃ = a₃(t₁,t₂) + t₃·k
//   N₄  no new unknowns          →  three closing equations in (t₁,t₂,t₃)
//
// Each stage leaves a free parameter because polar(𝒜₀,·): ℍ → ℝ³ has a one-dimensional kernel.
// The planar analogue is multiplication by w₀ on ℂ, which is invertible — which is why the plane's
// consecutive grip is unique and this one branches. The branching is manufactured by the gauge.
//
// SOLVED BY ELIMINATION, NOT BY MULTISTART. t₃ enters linearly and t₂ quadratically, so eliminating
// both leaves one resultant in t₁ — measured to be degree 8, the honest ceiling (the earlier claim
// of a quadratic closing system, and hence a Bézout of 8 by a wrong route, is retracted in
// septicCascadeDegree.test.ts). Sweeping that resultant over ALL of ℝ through t₁ = tan(πs/2) and
// bisecting every sign change is exhaustive in a way random-start Newton is not, which matters
// because this repository has already published one under-sampled count.
//
// The cascade, the elimination and the sweep were established in septicCascadeDegree.test.ts,
// which measures the substitution degrees and the resultant's degree directly; this module is that
// work made callable.
// ============================================================================
import {
  type Quat, type Vec3, QUAT_I, qmul, qadd, qscale, qnormSq,
  sandwich, polarSandwich, quatFromSandwich, vadd, vsub, vscale, vdot, vnorm,
} from './quaternion'
import { luFactor, luSolve } from './linalg'

export type SepticSpinor = [Quat, Quat, Quat, Quat]

const QBASIS: Quat[] = [
  { u: 1, v: 0, p: 0, q: 0 }, { u: 0, v: 1, p: 0, q: 0 },
  { u: 0, v: 0, p: 1, q: 0 }, { u: 0, v: 0, p: 0, q: 1 },
]
const qfrom = (c: number[]): Quat => ({ u: c[0], v: c[1], p: c[2], q: c[3] })

/** The seven legs N₀…N₆ — Bernstein coefficients of the degree-6 hodograph 𝒜i𝒜*. */
export function septicLegs(A: SepticSpinor): Vec3[] {
  const [A0, A1, A2, A3] = A
  return [
    sandwich(A0),
    vscale(polarSandwich(A0, A1), 1 / 2),
    vadd(vscale(polarSandwich(A0, A2), 1 / 5), vscale(sandwich(A1), 3 / 5)),
    vadd(vscale(polarSandwich(A0, A3), 1 / 20), vscale(polarSandwich(A1, A2), 9 / 20)),
    vadd(vscale(polarSandwich(A1, A3), 1 / 5), vscale(sandwich(A2), 3 / 5)),
    vscale(polarSandwich(A2, A3), 1 / 2),
    sandwich(A3),
  ]
}

/** The eight control points, P₀ = p0 and P_{j+1} = P_j + N_j/7. */
export function septicControlPoints(A: SepticSpinor, p0: Vec3): Vec3[] {
  const N = septicLegs(A)
  const out: Vec3[] = [p0]
  for (let j = 0; j < 7; j++) out.push(vadd(out[j], vscale(N[j], 1 / 7)))
  return out
}

/** ∫₀¹|𝒜|²dt for a cubic spinor — the mean of σ's Bernstein coefficients. */
export function septicArcLength(A: SepticSpinor): number {
  const d = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q
  const s = [
    qnormSq(A[0]),
    d(A[0], A[1]),
    (2 * d(A[0], A[2]) + 3 * qnormSq(A[1])) / 5,
    (d(A[0], A[3]) + 9 * d(A[1], A[2])) / 10,
    (2 * d(A[1], A[3]) + 3 * qnormSq(A[2])) / 5,
    d(A[2], A[3]),
    qnormSq(A[3]),
  ]
  return s.reduce((a, b) => a + b, 0) / 7
}

/** Minimum-norm solution of polar(𝒜₀, X) = b — 3×4, rank 3, one-dimensional kernel. */
function makeSolver(A0: Quat): (b: Vec3) => Quat {
  const M: number[][] = [[], [], []]
  for (const e of QBASIS) {
    const col = polarSandwich(A0, e)
    M[0].push(col.x); M[1].push(col.y); M[2].push(col.z)
  }
  const MMt: number[][] = [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
    M[i].reduce((s, _, c) => s + M[i][c] * M[j][c], 0)))
  const fact = luFactor(MMt)
  if (!fact) throw new Error('polar(𝒜₀,·) is rank deficient — impossible for 𝒜₀ ≠ 0')
  return (b: Vec3): Quat => {
    const y = luSolve(fact, [b.x, b.y, b.z])
    return qfrom([0, 1, 2, 3].map((c) => M[0][c] * y[0] + M[1][c] * y[1] + M[2][c] * y[2]))
  }
}

interface Cascade {
  readonly A0: Quat
  readonly build: (t1: number, t2: number, t3: number) => SepticSpinor
  readonly residual: (t: readonly number[]) => Vec3
}
/** Data N₀…N₄ ↦ the closing residual R(t₁,t₂,t₃) ∈ ℝ³, and the spinor it came from. */
export function septicCascade(N: readonly Vec3[]): Cascade | null {
  const A0 = quatFromSandwich(N[0])
  if (!A0) return null
  const k = qmul(A0, QUAT_I)
  const solve = makeSolver(A0)
  const build = (t1: number, t2: number, t3: number): SepticSpinor => {
    const A1 = qadd(solve(vscale(N[1], 2)), qscale(k, t1))
    const A2 = qadd(solve(vsub(vscale(N[2], 5), vscale(sandwich(A1), 3))), qscale(k, t2))
    const A3 = qadd(solve(vsub(vscale(N[3], 20), vscale(polarSandwich(A1, A2), 9))), qscale(k, t3))
    return [A0, A1, A2, A3]
  }
  return {
    A0, build,
    residual: (t) => vsub(septicLegs(build(t[0], t[1], t[2]))[4], N[4]),
  }
}

// Two fixed generic directions used to turn the 3-vector closing system into two scalars. Any
// pair off the degenerate locus works; these are arbitrary and fixed so results are reproducible.
const E_DIR: Vec3 = { x: 0.3123, y: -0.8412, z: 0.4401 }
const F_DIR: Vec3 = { x: -0.7712, y: -0.2214, z: 0.5967 }

/** Eliminate t₃ (linear) and t₂ (quadratic), leaving one resultant in t₁. */
function eliminate(residual: (t: readonly number[]) => Vec3) {
  const slice = (t1: number) => {
    const f0 = residual([t1, 0, 0]), fp = residual([t1, 1, 0]), fm = residual([t1, -1, 0])
    return {
      c0: f0,
      c1: vscale(vsub(fp, fm), 0.5),
      c2: vsub(vscale(vadd(fp, fm), 0.5), f0),
      w: vsub(residual([t1, 0, 1]), f0),
    }
  }
  const quads = (t1: number) => {
    const s = slice(t1)
    const cross = (c: Vec3): Vec3 => ({
      x: c.y * s.w.z - c.z * s.w.y, y: c.z * s.w.x - c.x * s.w.z, z: c.x * s.w.y - c.y * s.w.x,
    })
    const [q0, q1, q2] = [cross(s.c0), cross(s.c1), cross(s.c2)]
    return {
      a: [vdot(q0, E_DIR), vdot(q1, E_DIR), vdot(q2, E_DIR)],
      b: [vdot(q0, F_DIR), vdot(q1, F_DIR), vdot(q2, F_DIR)],
      slice: s,
    }
  }
  return {
    resultant: (t1: number): number => {
      const { a, b } = quads(t1)
      const d = a[2] * b[0] - a[0] * b[2]
      return d * d - (a[1] * b[2] - a[2] * b[1]) * (a[0] * b[1] - a[1] * b[0])
    },
    complete: (t1: number): number[] | null => {
      const { a, b, slice: s } = quads(t1)
      const den = a[1] * b[2] - a[2] * b[1]
      if (Math.abs(den) < 1e-14) return null
      const t2 = (a[2] * b[0] - a[0] * b[2]) / den
      const P = vadd(s.c0, vadd(vscale(s.c1, t2), vscale(s.c2, t2 * t2)))
      const ww = vdot(s.w, s.w)
      if (ww < 1e-20) return null
      return [t1, t2, -vdot(P, s.w) / ww]
    },
  }
}

/** Newton on the 3×3 closing system, damped. */
function newton(residual: (t: readonly number[]) => Vec3, start: readonly number[]): number[] | null {
  let t = [...start]
  for (let it = 0; it < 200; it++) {
    const r = residual(t)
    if (vnorm(r) < 1e-12) return t
    const J: number[][] = [[], [], []]
    const h = 1e-6
    for (let c = 0; c < 3; c++) {
      const tp = [...t]; tp[c] += h
      const rp = residual(tp)
      J[0].push((rp.x - r.x) / h); J[1].push((rp.y - r.y) / h); J[2].push((rp.z - r.z) / h)
    }
    const fact = luFactor(J)
    if (!fact) return null
    const d = luSolve(fact, [r.x, r.y, r.z])
    const damp = Math.max(1, vnorm({ x: d[0], y: d[1], z: d[2] }) / 4)
    t = t.map((v, c) => v - d[c] / damp)
    if (!t.every(Number.isFinite) || Math.max(...t.map(Math.abs)) > 1e6) return null
  }
  return vnorm(residual(t)) < 1e-10 ? t : null
}

export interface SpatialSepticSolution {
  readonly A: SepticSpinor
  readonly p0: Vec3
  readonly controlPoints: Vec3[]
  readonly arcLength: number
  /** The cascade parameters — the branch's identity, and what a drag carries. */
  readonly t: [number, number, number]
}

export interface SepticSixPointReport {
  readonly solutions: SpatialSepticSolution[]
  /** Sign changes of the resultant that were followed. */
  readonly candidates: number
  /** Null when N₀ = 0 — the first leg has no length, so 𝒜₀ does not exist. */
  readonly degenerate: boolean
}

/**
 * EVERY real spatial PH septic whose first six control points are `points`.
 *
 * Exhaustive by sweeping the resultant over all of ℝ (through t₁ = tan(πs/2)) and bisecting each
 * sign change, rather than by multistart. The count is 0, 2, 4 or 6 — always even, and often ZERO:
 * a caller drawing this must handle the empty answer as a normal state, not an error.
 */
export function solveSpatialSepticSixPoints(
  points: readonly Vec3[],
  samples = 20000,
): SepticSixPointReport {
  if (points.length < 6) throw new Error('solveSpatialSepticSixPoints: need six control points')
  const N = Array.from({ length: 5 }, (_, j) => vscale(vsub(points[j + 1], points[j]), 7))
  const cascade = septicCascade(N)
  if (!cascade) return { solutions: [], candidates: 0, degenerate: true }

  const { resultant, complete } = eliminate(cascade.residual)
  const at = (s: number): number => Math.tan((Math.PI / 2) * s)
  const roots: number[][] = []
  let candidates = 0
  let prevS = -0.9995, prevR = resultant(at(prevS))
  for (let i = 1; i <= samples; i++) {
    const s = -0.9995 + (1.999 / samples) * i
    const r = resultant(at(s))
    if (Number.isFinite(r) && Number.isFinite(prevR) && r !== 0 && prevR !== 0 &&
        Math.sign(r) !== Math.sign(prevR)) {
      candidates++
      let lo = prevS, hi = s, flo = prevR
      for (let k = 0; k < 80; k++) {
        const mid = 0.5 * (lo + hi)
        const fm = resultant(at(mid))
        if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm } else hi = mid
      }
      const guess = complete(at(0.5 * (lo + hi)))
      const root = guess && newton(cascade.residual, guess)
      if (root && root.every(Number.isFinite) &&
          !roots.some((f) => Math.max(...f.map((v, j) => Math.abs(v - root[j]))) < 1e-5)) {
        roots.push(root)
      }
    }
    prevS = s; prevR = r
  }

  const solutions = roots
    .map((t) => {
      const A = cascade.build(t[0], t[1], t[2])
      return {
        A, p0: points[0],
        controlPoints: septicControlPoints(A, points[0]),
        arcLength: septicArcLength(A),
        t: [t[0], t[1], t[2]] as [number, number, number],
      }
    })
    .sort((a, b) => a.arcLength - b.arcLength)
  return { solutions, candidates, degenerate: false }
}

/**
 * Carry known branches to new data by Newton from each one's own cascade parameters.
 *
 * What a drag calls. A branch that cannot be carried returns null rather than being replaced by
 * whatever Newton found, so the caller can tell a branch was LOST — which here is a real event,
 * not a glitch: real roots of the resultant genuinely collide and disappear in pairs.
 */
export function trackSpatialSeptic(
  points: readonly Vec3[],
  previous: readonly SpatialSepticSolution[],
): (SpatialSepticSolution | null)[] {
  const N = Array.from({ length: 5 }, (_, j) => vscale(vsub(points[j + 1], points[j]), 7))
  const cascade = septicCascade(N)
  if (!cascade) return previous.map(() => null)
  return previous.map((prev) => {
    const t = newton(cascade.residual, prev.t)
    if (!t) return null
    const A = cascade.build(t[0], t[1], t[2])
    return {
      A, p0: points[0],
      controlPoints: septicControlPoints(A, points[0]),
      arcLength: septicArcLength(A),
      t: [t[0], t[1], t[2]] as [number, number, number],
    }
  })
}
