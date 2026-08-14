// ============================================================================
// THE GROUP ACTIONS, AS EXACT REWRITES — the infrastructure metamorphic testing needs.
//
// WHY THIS EXISTS. Checking a construction against a known answer is easy when there IS one. Here
// there is none: nobody can say what curve the fibre slider "should" produce at θ = 2.2. What CAN be
// said is how the answer must change when the INPUT is changed in a known way — mirror the data and
// the family must mirror; rotate the data and the family must rotate. That is metamorphic testing,
// and it is the strongest check available to code without an oracle. It also fails in ways a pinning
// test structurally cannot: a pinning test only says today's numbers match today's numbers, so it
// passes happily on a formulation that is wrong in the same way it was yesterday.
//
// EQUIVARIANCE, NOT INVARIANCE, and the distinction cost this project four exchanges. Looking for a
// configuration that is its own mirror is hard and here often impossible — reversal sends the pole r to
// 1−r, so a ONE-pole rational curve is never its own mirror (that would need r = 1/2, inside the drawn
// piece). But asking "does mirroring the input mirror the output" needs no special configuration at
// all. It applies to every seed we already have, which makes it both cheaper and far more sensitive.
//
// AND EVERY ACTION HERE IS AN EXACT REWRITE OF THE COEFFICIENTS. No solver, no target, no residual —
// which matters, because a test whose two sides each carry 1e-14 of solver error cannot detect an
// error of 1e-14.
//
// THE REVERSAL, derived rather than guessed, since it is the one with content:
//
//     𝒜̃(t) = 𝒜(1−t)·j ,    r̃ = 1 − r ,    λ̃ = λ
//
//   · j i j̄ = −i, so 𝒜̃ i 𝒜̃* = −N(1−t) — the reversed hodograph, sign and all
//   · w(1−t) = −(t − (1−r)), so w(1−t)² = w̃(t)² and the denominator follows
//   · the residue condition 𝒜′(r) = 𝒜(r)λi becomes −𝒜(r)λij = 𝒜(r)jλ̃i, and ij = k, ji = −k, so λ̃ = λ
//   · integrating, c̃(t) = c(1−t) − c(1): it starts at the origin, as p(0) = 0 requires. The C¹ Hermite
//     data goes (d₀, d₁, Δc) ↦ (−d₁, −d₀, −Δc) — the DISPLACEMENT FLIPS TOO. An earlier version of this
//     comment said c(1) − c(1−t) with Δc unchanged; the test caught it immediately, at 15.3 on a curve
//     of span 7.66.
//
// That last line is why this is equivariance and not invariance: the data MOVES, and the claim is that
// the construction moves with it.
// ============================================================================
import { QUAT_I, qadd, qmul, qscale, type Quat } from './quaternion'
import type { MultiPoleParams } from './rationalPHMultiPoleSpatial'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
const QUAT_J: Quat = { u: 0, v: 0, p: 1, q: 0 }

const binom = (n: number, k: number): number => {
  let v = 1
  for (let i = 0; i < k; i++) v = (v * (n - i)) / (i + 1)
  return v
}

/**
 * t ↦ 1 − t. The drawn piece [0,1] maps to itself reversed, so the result is a member of the same
 * chart with its pole reflected — and 1 − r is still outside [0,1] whenever r is, so the mirrored
 * curve is always legitimate.
 *
 * Only ONE pole is handled: with several, Σₖ = Σ_{l≠k} 1/(rₖ − rₗ) picks up signs that this has not
 * been derived for. Null rather than a plausible-looking wrong answer.
 */
export function reverseParam(prm: MultiPoleParams): MultiPoleParams | null {
  if (prm.roots.length !== 1) return null
  const A = prm.A as Quat[]
  const n = A.length - 1
  // 𝒜(1−t) = Σⱼ tʲ (−1)ʲ Σ_{k≥j} C(k,j) Aₖ
  const shifted: Quat[] = Array.from({ length: n + 1 }, (_, j) => {
    let acc: Quat = ZQ
    for (let k = j; k <= n; k++) acc = qadd(acc, qscale(A[k], binom(k, j)))
    return qscale(acc, j % 2 === 0 ? 1 : -1)
  })
  return {
    A: shifted.map((c) => qmul(c, QUAT_J)),
    roots: [1 - prm.roots[0]],
    lambdas: [prm.lambdas[0]],
  }
}

/**
 * A rotation of space, given as a unit quaternion: 𝒜 ↦ q𝒜, so N = 𝒜i𝒜* ↦ qNq̄. Left multiplication
 * commutes with the right multiplication in the residue condition, so the family is preserved and the
 * pole and twist are untouched.
 */
export function rotate(prm: MultiPoleParams, q: Quat): MultiPoleParams {
  return { ...prm, A: (prm.A as Quat[]).map((c) => qmul(q, c)) }
}

/** Uniform scaling by s > 0: 𝒜 ↦ √s·𝒜 gives N ↦ sN and c ↦ sc. Linear, so the family is preserved. */
export function scaleBy(prm: MultiPoleParams, s: number): MultiPoleParams {
  const k = Math.sqrt(s)
  return { ...prm, A: (prm.A as Quat[]).map((c) => qscale(c, k)) }
}

/** The Hopf gauge 𝒜 ↦ 𝒜e^{iθ}. Moves no curve at all — the null test every other action is read against. */
export function gauge(prm: MultiPoleParams, theta: number): MultiPoleParams {
  const c = Math.cos(theta), s = Math.sin(theta)
  return { ...prm, A: (prm.A as Quat[]).map((a) => qadd(qscale(a, c), qscale(qmul(a, QUAT_I), s))) }
}

/**
 * t ↦ at + b, with a ≠ 0. Preserves degree and PH-ness (RATIONAL_PH_STATE §4: shift and scale are IN
 * the chart, the projective part is not).
 *
 *     𝒜̃(t) = 𝒜(at + b)/√a ,    r̃ = (r − b)/a ,    λ̃ = a·λ
 *
 * NOTE it moves the DRAWN WINDOW: the piece t ∈ [0,1] of the result is the piece [b, a+b] of the
 * original. Only (a, b) = (1, 0) and (−1, 1) — the identity and the reversal — keep the window, and
 * the reversal has its own function above because its spinor picks up the factor j.
 */
export function affineReparam(prm: MultiPoleParams, a: number, b: number): MultiPoleParams | null {
  if (prm.roots.length !== 1 || !(a > 0)) return null
  const A = prm.A as Quat[]
  const n = A.length - 1
  // 𝒜(at+b) = Σⱼ tʲ aʲ Σ_{k≥j} C(k,j) b^{k−j} Aₖ
  const out: Quat[] = Array.from({ length: n + 1 }, (_, j) => {
    let acc: Quat = ZQ
    for (let k = j; k <= n; k++) acc = qadd(acc, qscale(A[k], binom(k, j) * Math.pow(b, k - j)))
    return qscale(acc, Math.pow(a, j) / Math.sqrt(a))
  })
  return { A: out, roots: [(prm.roots[0] - b) / a], lambdas: [a * prm.lambdas[0]] }
}


/**
 * How far a set of C¹ Hermite numbers is from being REVERSAL-SYMMETRIC — 0 when the mirror exists.
 *
 * Symmetric means there is a rotation R by π about some axis n̂ with d₁ = −R d₀ and R·Δc = −Δc. Writing
 * R v = 2(v·n̂)n̂ − v, the first condition gives d₀ − d₁ = 2(d₀·n̂)n̂, so **n̂ is along d₀ − d₁** — the axis
 * is not free, it is determined by the data. The second then says Δc ⊥ n̂. So the whole condition is two
 * scalars, with no optimisation over R at all:
 *
 *     |d₀| = |d₁|            a rotation preserves length
 *     Δc · (d₀ − d₁) = 0     the displacement is perpendicular to the mirror axis
 *
 * Reported relative, so it can be shown beside a curve of any size. The figure needs this because the
 * mirrored slider pair is only exchanged where this is zero: without it, a user sees two sliders
 * labelled as a mirror pair and no way to tell when the label applies.
 */
export function symmetryDefect(hermite: readonly number[]): number {
  const d0 = [hermite[0], hermite[1], hermite[2]]
  const d1 = [hermite[3], hermite[4], hermite[5]]
  const dc = [hermite[6], hermite[7], hermite[8]]
  const n0 = Math.hypot(...d0), n1 = Math.hypot(...d1)
  const lengths = Math.abs(n0 - n1) / Math.max(n0, n1, 1e-300)
  const axis = d0.map((v, i) => v - d1[i])
  const na = Math.hypot(...axis), nc = Math.hypot(...dc)
  const perp = na > 1e-12 && nc > 1e-12
    ? Math.abs(dc.reduce((s, v, i) => s + v * axis[i], 0)) / (na * nc)
    : 0
  return Math.max(lengths, perp)
}
