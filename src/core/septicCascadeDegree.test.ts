// ============================================================================
// The degree-7 six-control-point cascade: what degree does the closing system
// really have?
//
// docs/SEPTIC_SIX_POINTS.md records a Bézout ceiling of 8, inherited from the Lean
// companion on the assumption that the cascade's substitutions stay QUADRATIC. This
// file measures the assumption instead of trusting it: it builds the cascade, fits
// the closing residual in the monomial basis, and reads the multidegree off the fit.
//
// The cascade (𝒜 cubic, coefficients A₀…A₃; legs N_r are the Bernstein coefficients
// of N = 𝒜i𝒜*, and the six prescribed control points fix N₀…N₄):
//
//   N₀  sandwich in A₀ alone          →  A₀ = quatFromSandwich(N₀), gauge spent here
//   N₁  LINEAR in A₁ given A₀         →  A₁ = a₁      + t₁·k
//   N₂  LINEAR in A₂                  →  A₂ = a₂(t₁)  + t₂·k
//   N₃  LINEAR in A₃                  →  A₃ = a₃(t₁,t₂) + t₃·k
//   N₄  no new unknowns               →  3 closing equations in (t₁,t₂,t₃)
//
// EVERY linear stage is the SAME operator B ↦ polar(A₀,B), so the kernel vector
// k = A₀i is a CONSTANT — it does not move from stage to stage. That is what makes
// the substitution degrees computable at all.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat, type Vec3, QUAT_I, qmul, qconj, qadd, qscale, qnormSq, qsub,
  sandwich, polarSandwich, quatFromSandwich,
  vadd, vsub, vscale, vdot, vnorm,
} from './quaternion'
import { luFactor, luSolve } from './linalg'

type Cubic = [Quat, Quat, Quat, Quat]

const QBASIS: Quat[] = [
  { u: 1, v: 0, p: 0, q: 0 },
  { u: 0, v: 1, p: 0, q: 0 },
  { u: 0, v: 0, p: 1, q: 0 },
  { u: 0, v: 0, p: 0, q: 1 },
]

const qfrom = (c: number[]): Quat => ({ u: c[0], v: c[1], p: c[2], q: c[3] })

/** The seven legs N₀…N₆ — Bernstein coefficients of the degree-6 hodograph 𝒜i𝒜*. */
function legs(A: Cubic): Vec3[] {
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

/**
 * The minimum-norm solution of polar(A₀, X) = b — a 3×4 system, always rank 3, so
 * always solvable with a one-dimensional kernel. Returned as X = pinv(b); the kernel
 * direction A₀i is added by the caller as the free parameter.
 */
function makeSolver(A0: Quat): (b: Vec3) => Quat {
  const M: number[][] = [[], [], []]
  for (const e of QBASIS) {
    const col = polarSandwich(A0, e)
    M[0].push(col.x); M[1].push(col.y); M[2].push(col.z)
  }
  // Normal equations of the TRANSPOSE: x = Mᵀ(MMᵀ)⁻¹b gives the minimum-norm solution.
  const MMt: number[][] = [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
    M[i].reduce((s, _, c) => s + M[i][c] * M[j][c], 0)))
  const fact = luFactor(MMt)
  if (!fact) throw new Error('polar(A₀,·) is rank deficient — impossible for A₀ ≠ 0')
  return (b: Vec3): Quat => {
    const y = luSolve(fact, [b.x, b.y, b.z])
    return qfrom([0, 1, 2, 3].map((c) => M[0][c] * y[0] + M[1][c] * y[1] + M[2][c] * y[2]))
  }
}

/** The cascade: data N₀…N₄ ↦ the closing residual R(t₁,t₂,t₃) ∈ ℝ³, plus the pieces. */
function makeCascade(N: Vec3[]) {
  const A0 = quatFromSandwich(N[0])
  if (!A0) throw new Error('N₀ = 0')
  const k = qmul(A0, QUAT_I)          // the kernel direction, CONSTANT across stages
  const solve = makeSolver(A0)

  const build = (t1: number, t2: number, t3: number): Cubic => {
    const A1 = qadd(solve(vscale(N[1], 2)), qscale(k, t1))
    const tgt2 = vsub(vscale(N[2], 5), vscale(sandwich(A1), 3))
    const A2 = qadd(solve(tgt2), qscale(k, t2))
    const tgt3 = vsub(vscale(N[3], 20), vscale(polarSandwich(A1, A2), 9))
    const A3 = qadd(solve(tgt3), qscale(k, t3))
    return [A0, A1, A2, A3]
  }

  const residual = (t: number[]): Vec3 => {
    const A = build(t[0], t[1], t[2])
    return vsub(legs(A)[4], N[4])
  }

  return { A0, k, build, residual }
}

// ---------------------------------------------------------------------------
// Degree detection: Chebyshev coefficients. Sampling a polynomial of degree d at
// Chebyshev–Gauss nodes and projecting onto T_m gives coefficients that are EXACTLY
// zero for m > d, so the degree reads off the coefficient magnitudes. Far more
// robust than finite differences, which amplify rounding at high order.
// ---------------------------------------------------------------------------
function chebDegree(f: (s: number) => number, span = 1, N = 24): number {
  const xs: number[] = [], fs: number[] = []
  for (let j = 0; j < N; j++) {
    const x = Math.cos((Math.PI * (j + 0.5)) / N)
    xs.push(x); fs.push(f(x * span))
  }
  const c: number[] = []
  for (let m = 0; m < N; m++) {
    let s = 0
    for (let j = 0; j < N; j++) s += fs[j] * Math.cos(m * Math.acos(xs[j]))
    c.push((2 / N) * s)
  }
  const scale = Math.max(...c.map(Math.abs))
  if (scale === 0) return -1
  for (let m = N - 1; m >= 0; m--) if (Math.abs(c[m]) > 1e-9 * scale) return m
  return -1
}

const randQuat = (rng: () => number): Quat =>
  qfrom([0, 1, 2, 3].map(() => 2 * rng() - 1))

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A random cubic generator, well away from the degenerate A₀ ≈ 0. */
function sampleData(seed: number) {
  const rng = mulberry(seed)
  const A: Cubic = [randQuat(rng), randQuat(rng), randQuat(rng), randQuat(rng)]
  A[0] = qadd(A[0], { u: 1.5, v: 0, p: 0, q: 0 })
  return { A, N: legs(A) }
}

describe('the septic cascade — structure', () => {
  it('the kernel of polar(A₀,·) is exactly ℝ·A₀i, at every stage', () => {
    const { A } = sampleData(11)
    const A0 = A[0]
    const k = qmul(A0, QUAT_I)
    // A₀i is annihilated…
    expect(vnorm(polarSandwich(A0, k))).toBeLessThan(1e-12 * qnormSq(A0))
    // …and nothing else is: the 3×4 matrix has rank 3, so the kernel is 1-dimensional.
    const M = [0, 1, 2].map(() => [] as number[])
    for (const e of QBASIS) {
      const col = polarSandwich(A0, e)
      M[0].push(col.x); M[1].push(col.y); M[2].push(col.z)
    }
    const MMt = [0, 1, 2].map((i) => [0, 1, 2].map((j) =>
      M[i].reduce((s, _, c) => s + M[i][c] * M[j][c], 0)))
    expect(luFactor(MMt)).not.toBeNull()
  })

  it('the cascade contains the curve the data came from', () => {
    const { A, N } = sampleData(7)
    const { A0, k, residual } = makeCascade(N)
    // The recovered A₀ differs from the true one by a gauge factor c = A₀⁻¹A₀ᵗʳᵘᵉ;
    // undo it so the true coefficients live in the cascade's gauge.
    const inv = qscale(qconj(A0), 1 / qnormSq(A0))
    const c = qmul(inv, A[0])
    const cInv = qscale(qconj(c), 1 / qnormSq(c))
    const gauged: Quat[] = A.map((a) => qmul(a, cInv))
    expect(vnorm(vsub(sandwich(gauged[0]), N[0]))).toBeLessThan(1e-10)

    // Read off (t₁,t₂,t₃) as the components of the true coefficients along k.
    const { build } = makeCascade(N)
    const kk = qnormSq(k)
    const t: number[] = []
    let cur = build(0, 0, 0)
    for (let j = 1; j <= 3; j++) {
      const diff = qsub(gauged[j], cur[j])
      const tj = (diff.u * k.u + diff.v * k.v + diff.p * k.p + diff.q * k.q) / kk
      t.push(tj)
      cur = build(t[0] ?? 0, t[1] ?? 0, t[2] ?? 0)
    }
    expect(vnorm(residual(t))).toBeLessThan(1e-8)
  })
})

describe('the septic cascade — the degree of the closing system', () => {
  const { N } = sampleData(7)
  const { residual } = makeCascade(N)
  const comp = (i: number) => (t: number[]) => [residual(t).x, residual(t).y, residual(t).z][i]

  it('is degree 4 in t₁ — NOT quadratic, so Bézout 8 is wrong', () => {
    const degs = [0, 1, 2].map((i) => chebDegree((s) => comp(i)([s, 0.3, -0.4]), 2))
    expect(Math.max(...degs)).toBe(4)
  })

  it('is degree 2 in t₂', () => {
    const degs = [0, 1, 2].map((i) => chebDegree((s) => comp(i)([0.3, s, -0.4]), 2))
    expect(Math.max(...degs)).toBe(2)
  })

  it('is degree 1 in t₃ — t₃ enters LINEARLY, so it can be eliminated', () => {
    const degs = [0, 1, 2].map((i) => chebDegree((s) => comp(i)([0.3, -0.4, s]), 2))
    expect(Math.max(...degs)).toBe(1)
  })

  it('has total degree 4 along a generic line', () => {
    const degs = [0, 1, 2].map((i) => chebDegree((s) => comp(i)([0.7 * s, -1.1 * s, 0.9 * s]), 2))
    expect(Math.max(...degs)).toBe(4)
  })

  it('the t₃ coefficient is AFFINE in t₁ and free of t₂', () => {
    // R = F(t₁,t₂) + t₃·v(t₁,t₂); v is the t₃-derivative, constant in t₃.
    const dv = (t1: number, t2: number): Vec3 => {
      const a = residual([t1, t2, 0]), b = residual([t1, t2, 1])
      return vsub(b, a)
    }
    const degT1 = [0, 1, 2].map((i) => chebDegree((s) => [dv(s, 0.3).x, dv(s, 0.3).y, dv(s, 0.3).z][i], 2))
    expect(Math.max(...degT1)).toBe(1)
    const degT2 = [0, 1, 2].map((i) => chebDegree((s) => [dv(0.3, s).x, dv(0.3, s).y, dv(0.3, s).z][i], 2))
    expect(Math.max(...degT2)).toBe(0) // constant in t₂ (degree 0, and nonzero)
  })
})

// ---------------------------------------------------------------------------
// EXHAUSTIVE root count. Random-start Newton in three unknowns can miss a basin, so
// the count is settled by elimination instead, which the sparsity makes exact:
//
//   R(t₁,t₂,t₃) = P_{t₁}(t₂) + t₃·w(t₁)     P quadratic in t₂, w AFFINE in t₁ (measured)
//
// so R = 0 forces P(t₂) ∥ w, i.e. P(t₂) × w = 0 — two independent quadratics in t₂
// whose resultant is a single function of t₁. Every solution is a real zero of that
// one function, and t₁ is swept over ALL of ℝ by t₁ = tan(πs/2).
// ---------------------------------------------------------------------------
const E_DIR: Vec3 = { x: 0.3123, y: -0.8412, z: 0.4401 }
const F_DIR: Vec3 = { x: -0.7712, y: -0.2214, z: 0.5967 }

function eliminate(residual: (t: number[]) => Vec3) {
  /** R at fixed t₁, as (quadratic-in-t₂ coefficients c₀,c₁,c₂ ; the t₃ direction w). */
  const slice = (t1: number) => {
    const f0 = residual([t1, 0, 0]), fp = residual([t1, 1, 0]), fm = residual([t1, -1, 0])
    const c0 = f0
    const c1 = vscale(vsub(fp, fm), 0.5)
    const c2 = vsub(vscale(vadd(fp, fm), 0.5), f0)
    const w = vsub(residual([t1, 0, 1]), f0)
    return { c0, c1, c2, w }
  }
  /** The two quadratics in t₂ whose common root is a solution. */
  const quads = (t1: number) => {
    const { c0, c1, c2, w } = slice(t1)
    const cross = (c: Vec3): Vec3 => ({
      x: c.y * w.z - c.z * w.y, y: c.z * w.x - c.x * w.z, z: c.x * w.y - c.y * w.x,
    })
    const [q0, q1, q2] = [cross(c0), cross(c1), cross(c2)]
    return {
      a: [vdot(q0, E_DIR), vdot(q1, E_DIR), vdot(q2, E_DIR)],
      b: [vdot(q0, F_DIR), vdot(q1, F_DIR), vdot(q2, F_DIR)],
      slice: { c0, c1, c2, w },
    }
  }
  /** Resultant of the two quadratics — zero exactly where they share a root. */
  const resultant = (t1: number): number => {
    const { a, b } = quads(t1)
    const d = (a[2] * b[0] - a[0] * b[2])
    return d * d - (a[1] * b[2] - a[2] * b[1]) * (a[0] * b[1] - a[1] * b[0])
  }
  /** The common root t₂ and the t₃ it forces, at a t₁ where the resultant vanishes. */
  const complete = (t1: number): number[] | null => {
    const { a, b, slice: s } = quads(t1)
    const den = a[1] * b[2] - a[2] * b[1]
    if (Math.abs(den) < 1e-14) return null
    const t2 = (a[2] * b[0] - a[0] * b[2]) / den
    const P = vadd(s.c0, vadd(vscale(s.c1, t2), vscale(s.c2, t2 * t2)))
    const ww = vdot(s.w, s.w)
    if (ww < 1e-20) return null
    return [t1, t2, -vdot(P, s.w) / ww]
  }
  return { resultant, complete }
}

describe('the septic cascade — how many real solutions', () => {
  /** Newton on the 3×3 closing system, from a random start. */
  function newton(residual: (t: number[]) => Vec3, start: number[]): number[] | null {
    let t = [...start]
    for (let it = 0; it < 200; it++) {
      const r = residual(t)
      const rv = [r.x, r.y, r.z]
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
      const d = luSolve(fact, rv)
      const step = Math.max(1, vnorm({ x: d[0], y: d[1], z: d[2] }) / 4)
      t = t.map((v, c) => v - d[c] / step)
      if (!t.every(Number.isFinite) || Math.max(...t.map(Math.abs)) > 1e6) return null
    }
    return vnorm(residual(t)) < 1e-10 ? t : null
  }

  /** Every real solution, by sweeping the resultant over ALL of ℝ in t₁. */
  function allRoots(residual: (t: number[]) => Vec3, samples = 40000): number[][] {
    const { resultant, complete } = eliminate(residual)
    const at = (s: number) => Math.tan((Math.PI / 2) * s)
    const found: number[][] = []
    let prevS = -0.9995, prevR = resultant(at(prevS))
    for (let i = 1; i <= samples; i++) {
      const s = -0.9995 + (1.999 / samples) * i
      const r = resultant(at(s))
      if (Number.isFinite(r) && Number.isFinite(prevR) && r !== 0 && prevR !== 0 &&
          Math.sign(r) !== Math.sign(prevR)) {
        // Bisect the sign change, then complete and polish in the full 3×3 system.
        let lo = prevS, hi = s, flo = prevR
        for (let k = 0; k < 80; k++) {
          const mid = 0.5 * (lo + hi)
          const fm = resultant(at(mid))
          if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm } else hi = mid
        }
        const guess = complete(at(0.5 * (lo + hi)))
        const root = guess && newton(residual, guess)
        if (root && root.every(Number.isFinite) &&
            !found.some((f) => Math.max(...f.map((v, j) => Math.abs(v - root[j]))) < 1e-5)) {
          found.push(root)
        }
      }
      prevS = s; prevR = r
    }
    return found
  }

  it('the resultant is a degree-8 polynomial in t₁ — the honest ceiling', () => {
    for (const seed of [7, 23, 41]) {
      const { N } = sampleData(seed)
      const { residual } = makeCascade(N)
      const { resultant } = eliminate(residual)
      expect(chebDegree((s) => resultant(s), 1.5, 48)).toBe(8)
    }
  })

  // Data generated FROM a curve, so at least one real solution is guaranteed. The count
  // is not the constant 4 that docs/SEPTIC_SIX_POINTS.md recorded from a two-sample
  // brute force: it is 2, 4 or 6 depending on the data, with 4 merely the most common.
  it('the real count varies — 2, 4 or 6 — and always agrees with random-start Newton',
    { timeout: 120000 }, () => {
    const counts: number[] = []
    for (const seed of [7, 23, 41, 99, 5, 13, 61, 77]) {
      const { A, N } = sampleData(seed)
      const { residual } = makeCascade(N)

      const swept = allRoots(residual)
      // Cross-check with dense random-start Newton over a wide box.
      const rng = mulberry(seed * 31 + 5)
      const multistart: number[][] = []
      for (let trial = 0; trial < 6000; trial++) {
        const start = [0, 1, 2].map(() => 60 * (rng() - 0.5))
        const root = newton(residual, start)
        if (root && !multistart.some((f) =>
          Math.max(...f.map((v, i) => Math.abs(v - root[i]))) < 1e-5)) multistart.push(root)
      }

      // Every swept root is a genuine curve: it reproduces the five prescribed legs.
      const { build } = makeCascade(N)
      for (const t of swept) {
        const L = legs(build(t[0], t[1], t[2]))
        for (let r = 0; r <= 4; r++) expect(vnorm(vsub(L[r], N[r]))).toBeLessThan(1e-7)
      }
      // The exhaustive sweep never misses what random starts find.
      expect(swept.length).toBeGreaterThanOrEqual(multistart.length)
      // Even in every case measured: the degree-8 resultant is real, so its complex
      // roots come in conjugate pairs and the real count moves by twos.
      expect(swept.length % 2).toBe(0)
      counts.push(swept.length)
      void A
    }
    expect(counts).toEqual([4, 2, 4, 6, 4, 6, 4, 4])
  })

  // The figure drags control points FREELY, so the data need not come from a PH curve
  // at all. Everything above was generated from one, which guarantees at least one real
  // solution — the easy side. This is the other side.
  it('arbitrary control points: the count can be zero, and the figure must expect it', () => {
    const tally = new Map<number, number>()
    for (let seed = 0; seed < 40; seed++) {
      const rng = mulberry(seed * 7919 + 3)
      const N: Vec3[] = [{ x: 1, y: 0, z: 0 }]
      for (let r = 1; r <= 4; r++) {
        N.push({ x: 2 * rng() - 1, y: 2 * rng() - 1, z: 2 * rng() - 1 })
      }
      const { residual } = makeCascade(N)
      const n = allRoots(residual, 20000).length
      tally.set(n, (tally.get(n) ?? 0) + 1)
    }
    // Measured over 40 random polygons: 0×20, 2×4, 4×14, 6×2. HALF have no real curve.
    expect([...tally.keys()].every((n) => n % 2 === 0)).toBe(true)
    expect(tally.get(0)).toBeGreaterThan(10)
    expect(Math.max(...tally.keys())).toBeLessThanOrEqual(8)
    // 40 resultant sweeps: about 5s alone, which is vitest's default, so it flaked under a busy
    // suite while passing every time on its own. The timeout is the fix; the numbers are untouched.
  }, 120_000)
})
