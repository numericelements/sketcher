// ============================================================================
// THE RATIONAL PH CUBIC — the lowest-degree rational PH space curve there is, and it is NOT in our family.
//
// From Kozak–Krajnc–Vitrih, "Dual representation of spatial rational Pythagorean-hodograph curves", CAGD
// 31(1):43–56, 2014, Thm 7; reconstructed as Example 5.4 of Kalkan–Scharler–Schröcker–Šír, CAGD 99, 2022
// (arXiv 2111.04600):
//
//     c(t) = −1/(60(t² + 1)) · ( t(t² − 4),  2t(3t − 1),  t(3t + 4) )
//
// Verified here rather than trusted: ‖N‖ IS a polynomial (degree 4), and N = −(1/60)·𝒜i𝒜̄ exactly, to the
// last coefficient, for the spinor the paper supplies — 𝒜 = (t² − 1) + 3t·i + 2·j + k.
//
// WHY IT IS A SPECIMEN AND NOT A DIAL. This curve lives on the stratum our own chart is documented as
// missing (see slide 16's notes: "the stratum 𝒜(r) = 0, where the apparent pole CANCELS"). Two facts make
// that concrete:
//
//   • THE SPINOR IS NULL AT THE POLE. 𝒜 has real quaternion coefficients but the pole is at the COMPLEX
//     parameter t = ι, and there 𝒜(ι) = −2 + 3ι·i + 2j + k gives 𝒜𝒜̄ = 4 − 9 + 4 + 1 = 0. So 𝒜(ι) is
//     isotropic — nonzero, but on the null cone of the complexified quaternions. Our one-pole and
//     multi-pole modules both assume σ(r) ≠ 0 (measured σ(1.7) = 1.29 there), and every step that divides
//     by 𝒜(r) or by σ(r) fails here.
//   • CONSEQUENTLY w DIVIDES σ: σ = |𝒜|² = t⁴ + 7t² + 6 = (t² + 1)(t² + 6). That is the conformal family's
//     signature, not the one-pole family's, and it is why the arc length picks up an arctangent:
//     ‖c′‖ = (1/60)(t² + 6)/(t² + 1) = (1/60)(1 + 5/(t² + 1)), so s(T) = (1/60)(T + 5·arctan T).
//
// AND NULLITY ALONE IS NOT THE CONDITION — measured, and it is why this file exposes no family. Holding the
// shape of 𝒜 and moving the pole to ι·ρ while keeping 𝒜(ιρ) null (which fixes one coefficient) leaves the
// spinor null to 1e-16 and yet the back-substitution for p FAILS, residuals 5e-2 to 1e-1 for ρ = 0.8, 1.2,
// 1.4, 2.0 against 0.0e+0 at ρ = 1. So the rationality condition is strictly stronger than σ(pole) = 0, and
// producing a genuine one-parameter family here is open work, not a port.
//
// COUNT THE POLES PROJECTIVELY — two claims about this curve were wrong until measured, and both were wrong
// for the same reason: reading the poles off w alone. w = t² + 1 gives the complex conjugate pair ±ι, but
// deg p = 3 EXCEEDS deg w = 2, so t = ∞ is a pole as well. Homogenised, the degree-3 denominator is
// s(t² + s²): three roots, ±ι and s = 0. Consequences, measured:
//
//   • THE CURVE IS NOT BOUNDED. |c| ~ t/60, so it grows — slowly enough that sampling t ∈ [−8, 8] reads
//     0.165 and looks bounded, which is exactly the trap. At t = 1e5, |c| = 1.7e3.
//   • ITS INDICATRIX IS NOT SMOOTH. It has ONE cusp, at the parameter ∞ — which is a perfectly ordinary
//     point of the projective line and sits precisely where the drawn loop closes up.
//
// SO IT IS NOT A COUNTEREXAMPLE TO "one cusp per real pole"; it is a demonstration that the pole at infinity
// counts. What it DOES show is the other half: its two COMPLEX poles contribute no visible cusp at all.
//
// HOW THE CUSP AT INFINITY IS DETECTED, since |T′| in the t chart is a bad instrument there (it vanishes at
// infinity for ANY rational indicatrix, t simply being a bad chart). The indicatrix is a closed loop over the
// projective line, naturally parametrised by t = tan θ, so the invariant speed is |dT/dθ| = |T′|·(1 + t²).
// Measured limits: the one-pole member → 0.790 and the two-pole member → 3.78, both finite, so slides 17 and
// 19 have no cusp at infinity and their counts of one and two stand. This cubic → 0 like 1/t. The algebraic
// tell is deg W against 2·deg σ − 2 for W = N′σ − Nσ′: maximal (6, 10) for those two, but 5 against 6 here.
// ============================================================================
import type { Vec3 } from './quaternion'

const evalPoly = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const dPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))

const SCALE = -1 / 60

/** Numerator per coordinate in the power basis, degree 3, with the paper's −1/60 folded in. */
export const p: readonly number[][] = [
  [0, -4, 0, 1].map((c) => c * SCALE), // t³ − 4t
  [0, -2, 6, 0].map((c) => c * SCALE), // 6t² − 2t
  [0, 4, 3, 0].map((c) => c * SCALE), // 3t² + 4t
]

/**
 * w = t² + 1. Its roots are ±ι — COMPLEX, so no FINITE real parameter reaches infinity. The projective
 * third pole is at t = ∞, which w does not show; see the header.
 */
export const w: readonly number[] = [1, 0, 1]

/** N = p′w − pw′, the Wronskian. Equals −(1/60)·𝒜i𝒜̄ exactly. */
export const N: readonly number[][] = p.map((pc) => {
  const a = dPoly(pc)
  const b = dPoly(w)
  const out = new Array<number>(Math.max(a.length + w.length, pc.length + b.length) - 1).fill(0)
  a.forEach((x, i) => w.forEach((y, j) => { out[i + j] += x * y }))
  pc.forEach((x, i) => b.forEach((y, j) => { out[i + j] -= x * y }))
  return out
})

/** σ = ‖N‖ = (1/60)(t²+1)(t²+6) — a polynomial, which IS the PH property. */
export const sigma: readonly number[] = [6, 0, 7, 0, 1].map((c) => c * Math.abs(SCALE))

/** The spinor the paper supplies, in the power basis: 𝒜 = (t² − 1) + 3t·i + 2·j + k. */
export const spinor = [
  { u: -1, v: 0, p: 2, q: 1 },
  { u: 0, v: 3, p: 0, q: 0 },
  { u: 1, v: 0, p: 0, q: 0 },
] as const

export const curveAt = (t: number): Vec3 => {
  const wv = evalPoly(w, t)
  return { x: evalPoly(p[0], t) / wv, y: evalPoly(p[1], t) / wv, z: evalPoly(p[2], t) / wv }
}

/** c′ = N/w², exact — no differencing. */
export const derivativeAt = (t: number): Vec3 => {
  const w2 = Math.pow(evalPoly(w, t), 2)
  return { x: evalPoly(N[0], t) / w2, y: evalPoly(N[1], t) / w2, z: evalPoly(N[2], t) / w2 }
}

/** ‖c′‖ from the closed form σ/w². */
export const speedAt = (t: number): number => Math.abs(evalPoly(sigma, t) / Math.pow(evalPoly(w, t), 2))

/**
 * The invariant speed of the indicatrix, |dT/dθ| with t = tan θ. Use THIS to look for cusps rather than
 * |T′|: it is finite through t = ∞, so a zero of it is a genuine cusp rather than a chart artifact.
 */
export const indicatrixSpeedInvariant = (t: number): number => {
  const s2 = evalPoly(sigma, t)
  const ds = evalPoly(dPoly(sigma), t)
  const v = [0, 1, 2].map((c) => {
    const n = evalPoly(N[c], t)
    const dn = evalPoly(dPoly(N[c]), t)
    return (dn * s2 - n * ds) / (s2 * s2)
  })
  return Math.hypot(v[0], v[1], v[2]) * (1 + t * t)
}

/** The PH defect: the measured speed against σ/w², relative and worst-case over [0,1]. */
export function phDefect(): number {
  let worst = 0
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const d = derivativeAt(t)
    const measured = Math.hypot(d.x, d.y, d.z)
    worst = Math.max(worst, Math.abs(measured - speedAt(t)) / Math.max(measured, 1e-300))
  }
  return worst
}

/**
 * EXACT arc length from 0 to T. Because w divides σ the integrand collapses to (1/60)(1 + 5/(t²+1)), whose
 * antiderivative is elementary but NOT rational — the arctangent is the visible cost of the complex pole.
 */
export const arcLength = (T: number): number => (T + 5 * Math.atan(T)) / 60

/** Power basis to Bernstein of degree `n`, so the curve can be shown as a rational Bézier. */
function toBernstein(c: readonly number[], n: number): number[] {
  const binom = (a: number, b: number): number => {
    let r = 1
    for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1)
    return r
  }
  return Array.from({ length: n + 1 }, (_, i) => {
    let s = 0
    for (let k = 0; k <= i; k++) s += (binom(i, k) / binom(n, k)) * (c[k] ?? 0)
    return s
  })
}

/**
 * The degree-3 rational Bézier form on [0,1]: four control points and four weights. w is only quadratic, so
 * it is degree-elevated to 3 first — the curve is a cubic whose weight function happens to be quadratic.
 */
export function controlStructure(): { points: Vec3[]; weights: number[] } {
  const weights = toBernstein(w, 3)
  const px = p.map((pc) => toBernstein(pc, 3))
  return {
    points: weights.map((wt, i) => ({ x: px[0][i] / wt, y: px[1][i] / wt, z: px[2][i] / wt })),
    weights,
  }
}
