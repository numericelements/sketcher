/**
 * THE TWO-ENDS CONSTRUCTION — hold a PREFIX and a SUFFIX of control points, p + q = m + 2,
 * at arbitrary positions, and complete to a genuine spatial PH curve. Constructive proof of
 * surjectivity for every prefix+suffix split (m+3 grips per degree), extending the one-sided
 * cascade (docs/SURJECTIVITY.md). Origin: the lean-companion's two-ends jet theorem, verified
 * numerically by `twoEndsConstruction.test.ts`.
 *
 * Mechanism, in the Bernstein basis: the left cascade determines 𝒜₀…𝒜_{p−2} from the prefix
 * legs, the mirrored right cascade determines 𝒜_p…𝒜_m from the suffix legs, and exactly ONE
 * coefficient — λ = 𝒜_{p−1}, the Bernstein shadow of t^{p−1}(1−t)^{q−1} — is left free. The one
 * remaining condition (total displacement P_n − P₀) is quadratic in λ:
 *
 *     c·(λiλ*) + polar(B, λ) = V,        c = C(m,p−1)²/C(2m,2p−2) > 0
 *
 * and COMPLETING THE SQUARE ON THE SANDWICH turns it into c·(λ+B/c)i(λ+B/c)* = V + (BiB*)·(1/c)
 * — one Hopf-map inversion, solvable for every right-hand side. This is why p+q = m+2 works and
 * p+q = m+3 cannot: one more held point and λ is gone, the system is square, and realness can
 * refuse (the measured wall, `surjectivity-candidates.json`).
 *
 * Nondegeneracy: the first prescribed leg at each end must be nonzero (P₁ ≠ P₀ when p ≥ 2,
 * P_{n−1} ≠ P_n when q ≥ 2) — otherwise the cascade's first sandwich inversion has nothing to
 * invert and this returns null.
 */
import {
  type Quat, type Vec3,
  qadd, qsub, qscale, qconj, qmul, qnormSq,
  vadd, vsub, vscale, vnorm, vquat,
  sandwich, polarSandwich, quatFromSandwich,
} from './quaternion'
import type { SpatialPHCurve } from './phSpatialFreeDragN'

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** The held indices for the split p at spinor degree m: [0..p−1] ∪ [n−q+1..n], p+q = m+2. */
export function twoEndsGrip(m: number, p: number): number[] {
  const n = 2 * m + 1
  const q = m + 2 - p
  return [
    ...Array.from({ length: p }, (_, i) => i),
    ...Array.from({ length: q }, (_, i) => n - q + 1 + i),
  ]
}

/**
 * Exact minimum-norm solve of polar(A₀, λ) = b, closed form. Writing λ = A₀μ,
 * polar(A₀, λ) = A₀·(μi − (μi)*)·A₀* — a sandwich of the pure quaternion 2·Im(μi) — so
 * X = A₀*·b·A₀ / |A₀|⁴ recovers 2·Im(μi) and μ reads off componentwise (its i-component
 * is the gauge kernel; set to zero).
 */
function solvePolar(a0: Quat, b: Vec3): Quat {
  const s = 1 / (qnormSq(a0) * qnormSq(a0))
  const x = qscale(qmul(qmul(qconj(a0), vquat(b)), a0), s)
  const mu: Quat = { u: x.v / 2, v: 0, p: -x.q / 2, q: x.p / 2 }
  return qmul(a0, mu)
}

/** One hodograph Bernstein pair term: weight·(𝒜ₐi𝒜_b* + 𝒜_b i𝒜ₐ*), halved on the diagonal. */
function pairTerm(m: number, A: readonly Quat[], a: number, b: number): Vec3 {
  const w = (binom(m, a) * binom(m, b)) / binom(2 * m, a + b)
  return a === b ? vscale(sandwich(A[a]), w) : vscale(polarSandwich(A[a], A[b]), w)
}

/**
 * Left cascade: from hodograph coefficients N₀…N_{k−1}, the spinor coefficients 𝒜₀…𝒜_{k−1}
 * (k ≤ m+1). Null when N₀ = 0 — the nondegenerate first leg is the cascade's one hypothesis.
 */
function leftCascade(m: number, N: readonly Vec3[], k: number): Quat[] | null {
  if (k <= 0) return []
  const a0 = quatFromSandwich(N[0])
  if (!a0) return null
  const A: Quat[] = [a0]
  for (let j = 1; j < k; j++) {
    let rest: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = 1; a <= j - 1; a++) {
      const b = j - a
      if (b < a) continue
      rest = vadd(rest, pairTerm(m, A, a, b))
    }
    const cj = binom(m, j) / binom(2 * m, j)
    A.push(solvePolar(a0, vscale(vsub(N[j], rest), 1 / cj)))
  }
  return A
}

const QUAT_J: Quat = { u: 0, v: 0, p: 1, q: 0 }

/**
 * Build the PH curve of degree n = 2m+1 whose control points at `twoEndsGrip(m, p)` equal
 * `targets` (length m+2: the p prefix positions, then the q suffix positions, in index order).
 * Returns null only on a degenerate first leg at a prescribed end.
 */
export function twoEndsCurve(m: number, p: number, targets: readonly Vec3[]): SpatialPHCurve | null {
  const n = 2 * m + 1
  const q = m + 2 - p
  if (p < 0 || q < 0 || targets.length !== m + 2) return null

  const prefix = targets.slice(0, p)
  const suffix = targets.slice(p)

  // Prefix legs → N₀…N_{p−2} → 𝒜₀…𝒜_{p−2}.
  const NL = prefix.slice(1).map((t, j) => vscale(vsub(t, prefix[j]), n))
  const left = leftCascade(m, NL, p - 1)
  if (!left) return null

  // Suffix legs, REVERSED: the reversed curve r(1−t) has spinor 𝒜(1−t)·j (j·i·j* = −i absorbs
  // the hodograph's sign flip), so its left cascade returns 𝒜̃_k with 𝒜_{m−k} = 𝒜̃_k·j.
  const rev = [...suffix].reverse()
  const NR = rev.slice(1).map((t, j) => vscale(vsub(t, rev[j]), n))
  const rightRev = leftCascade(m, NR, q - 1)
  if (!rightRev) return null

  const A: Quat[] = Array.from({ length: m + 1 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
  left.forEach((a, i) => { A[i] = a })
  rightRev.forEach((a, k) => { A[m - k] = qmul(a, QUAT_J) })

  if (p === 0 || q === 0) {
    // Pure one-sided cascade: all m+1 coefficients determined, no λ, no closing equation.
    const legs = hodograph(m, A).map((v) => vscale(v, 1 / n))
    const p0 = p === 0
      ? vsub(targets[m + 1], legs.reduce((s, l) => vadd(s, l), { x: 0, y: 0, z: 0 }))
      : targets[0]
    return { A, p0 }
  }

  // The closing equation in λ = 𝒜_{p−1}: total displacement n·(P_n − P₀) = Σⱼ Nⱼ, which splits
  // as S_known + polar(B, λ) + c·λiλ*. Complete the square on the sandwich and invert Hopf once.
  const free = p - 1
  const c = (binom(m, free) * binom(m, free)) / binom(2 * m, 2 * free)
  let B: Quat = { u: 0, v: 0, p: 0, q: 0 }
  let sKnown: Vec3 = { x: 0, y: 0, z: 0 }
  for (let a = 0; a <= m; a++) {
    if (a === free) continue
    B = qadd(B, qscale(A[a], (binom(m, a) * binom(m, free)) / binom(2 * m, a + free)))
    for (let b = a; b <= m; b++) {
      if (b === free) continue
      sKnown = vadd(sKnown, pairTerm(m, A, a, b))
    }
  }
  const V = vsub(vscale(vsub(targets[m + 1], targets[0]), n), sKnown)
  const rhs = vscale(vadd(V, vscale(sandwich(B), 1 / c)), 1 / c)
  const mu = vnorm(rhs) === 0 ? { u: 0, v: 0, p: 0, q: 0 } : quatFromSandwich(rhs)
  if (!mu) return null
  A[free] = qsub(mu, qscale(B, 1 / c))

  return { A, p0: targets[0] }
}

/** All 2m+1 hodograph Bernstein coefficients Nⱼ = Σ_{a+b=j} C(m,a)C(m,b)/C(2m,j)·𝒜ₐi𝒜_b*. */
function hodograph(m: number, A: readonly Quat[]): Vec3[] {
  return Array.from({ length: 2 * m + 1 }, (_, j) => {
    let s: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) {
      const b = j - a
      if (b < a) continue
      s = vadd(s, pairTerm(m, A, a, b))
    }
    return s
  })
}
