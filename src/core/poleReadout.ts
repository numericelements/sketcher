// ============================================================================
// WHAT A POLE IS, AS FOUR LINES YOU CAN READ ALOUD — docs/POLE_ALGEBRA.md, made computational.
//
// The whole decision is one number. For x = q/W, at a root r of W the hodograph numerator is
// N(r) = −q(r)·W′(r), so with ‖N‖² = ρ² the PH condition gives
//
//     ρ(r)²  =  ⟨q(r), q(r)⟩ · W′(r)²
//
// and at a SIMPLE pole the pole is soft exactly when ⟨q(r),q(r)⟩ = 0. That is what this module
// computes, and it reports the number alongside the verdict rather than only the verdict — the
// threshold between them is ours, not the mathematics'.
//
// AND IT REPORTS THE TWO CASES WHERE THE QUESTION IS MALFORMED, because both are easy to walk past:
//
//   · a MULTIPLE root. There W′(r) = 0 and N(r) = 0 whatever q does, so ⟨N,N⟩ = 0 holds
//     vacuously. "Soft" carries no information; the reading says so instead of answering.
//     (This is the case that made §6 of the document false in its first form.)
//   · a pole whose NUMERATOR CANCELS, q(r) = 0. The fraction reduces and there is no pole at all.
//
// WHY THE COMPLEX CASE IS SHOWN AS TWO REAL VECTORS. Writing q(r) = a + i·b gives
//
//     ⟨q,q⟩ = (|a|² − |b|²) + 2i⟨a,b⟩          so    SOFT ⟺ |a| = |b| and a ⊥ b
//
// which is three real numbers — two lengths and an angle — instead of six with i in them. It is
// the same statement and it can be read off a slide. A genuine simple REAL pole has b = 0, hence
// ⟨q,q⟩ = |a|² ≠ 0, hence hard: the readable case is always the boring one, which is exactly why
// the a/b form is worth having.
//
// NO APPROXIMATE GCD ANYWHERE. Deciding "is this pole genuine" by reducing q/W would need a
// numerical gcd, which is unstable precisely at the near-degenerate configurations that make the
// question interesting. |q(r)| relative to the coefficient scale answers the same question and is
// a plain evaluation.
// ============================================================================
import { bernsteinToPower, rootsOf, type Poly } from './conformalPHHopf'
import { type Complex, cadd, cmul, cnorm, csub } from './complex'
import type { Rat } from './nurbsPH'
import type { ConformalPHCurve } from './conformalPHCurve'
import { nullCurveResidual, nullCurveResidualScale } from './conformal'

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}

/** Drop trailing coefficients that are machine zero, or their junk roots pollute everything. */
export function trueDegreePoly(p: Poly, relative = 1e-12): Poly {
  const s = Math.max(...p.map(Math.abs), 1e-300)
  const c = [...p]
  while (c.length > 1 && Math.abs(c[c.length - 1]) < relative * s) c.pop()
  return c
}

/** |f(z)| over Σ|aₖ||z|ᵏ — a genuine root reads zero; no cancellation reads O(1). */
export function relativeValue(p: Poly, z: Complex): number {
  const r = Math.hypot(z.re, z.im)
  let terms = 0
  for (let k = 0; k < p.length; k++) terms += Math.abs(p[k]) * r ** k
  return cnorm(cpeval(p, z)) / Math.max(terms, 1e-300)
}

export type PoleVerdict =
  | 'soft' | 'hard' | 'not a pole' | 'multiple — undefined' | 'below resolution'

export interface PoleReading {
  /** Where it is. */
  readonly at: Complex
  readonly real: boolean
  /** Distance to the nearest OTHER root, so a near-double root is visible rather than assumed. */
  readonly separation: number
  /** True when another root sits on top of this one: the question is then malformed. */
  readonly multiple: boolean
  /** |q(r)| relative to the coefficient scale. Near zero ⟹ the fraction reduces. */
  readonly numerator: number
  /** q(r) = a + i·b, the two real vectors softness is a statement about. */
  readonly a: readonly number[]
  readonly b: readonly number[]
  readonly lengthA: number
  readonly lengthB: number
  /** Angle between a and b in degrees; null at a real pole, where b = 0. */
  readonly angle: number | null
  /** ⟨q(r),q(r)⟩ = (|a|²−|b|²) + 2i⟨a,b⟩ — the number the verdict is read from. */
  readonly form: Complex
  /** |⟨q,q⟩| ÷ (|a|²+|b|²): 0 is soft, 1 is as hard as a pole gets. */
  readonly isotropy: number
  /** The error ⟨q,q⟩ carries at this root, given the state's residual. Zero if none was supplied. */
  readonly formNoise: number
  readonly verdict: PoleVerdict
}

export interface PoleReadoutOptions {
  /**
   * Below this isotropy the reading is called soft.
   *
   * It is a DISPLAY convention and nothing is computed from it — every reading carries its own
   * `isotropy`, and a caller that wants to judge differently has the number. A soft pole measures
   * 1e-15 and a hard one 1e-1 to 1, so anything in this range separates them by ten orders; the
   * value is chosen to sit in the empty middle rather than near either.
   */
  readonly softBelow?: number
  /** Below this relative numerator the pole is reported as cancelling rather than genuine. */
  readonly genuineAbove?: number
  /**
   * THE STATE'S OWN RELATIVE DEFINING RESIDUAL — how far it sits off the family it claims to be on
   * (⟨C,C⟩ for a conformal member, the PH residual for a projective one). Supply it and every
   * verdict gets an error bar; omit it and the readout behaves exactly as it did.
   *
   * WHY A VERDICT NEEDS ONE, measured rather than argued. A pole at z = 1.44 ± 1.6i on a state
   * whose ⟨C,C⟩ read 9.5e-10 was reported HARD, pointing exactly opposite to the theorem the
   * Möbius slide states. Evaluating the identity ‖q‖² = 2·W·c∞ AT that root:
   *
   *     |z|    |⟨q,q⟩|    identity violation at z    Σ|terms| at z
   *     2.12    5.9e-4           5.9e-4                  5.1e+7
   *     3.32    3.0e-1           3.0e-1                  1.2e+10
   *
   * ⟨q,q⟩ IS the violation, to every digit printed — there is no signal in it at all. A residual
   * measured on COEFFICIENTS says nothing about a value at |z| = 3.3, where z^16 is 1e8: the same
   * 1e-10 becomes an absolute error of order one. So the honest test is |⟨q,q⟩| against the size
   * of that error at z, and NOT a fixed ratio.
   *
   * The two mechanisms it covers, both real:
   *   · the value: q(z) is assembled from coefficients good to `residual`, so ⟨q,q⟩ carries an
   *     error of about 2·residual·Σᵢ Sᵢ(z)², with Sᵢ(z) = Σₖ |qᵢₖ| |z|ᵏ.
   *   · the place: a near-doubled root of W is located to about √residual, so a numerator smaller
   *     than that cannot be told from a cancelling one — see `below resolution`.
   *
   * It can only ever turn a hard reading soft, never the reverse: `softBelow` still stands on its
   * own, and this widens it by what the state cannot resolve.
   */
  readonly residual?: number
  /**
   * The Bernstein coefficients of ⟨P,P⟩ = ‖q‖² − 2·W·c∞ — the null residual AS A POLYNOMIAL.
   * Möbius states only; the projective model has no such identity and passes nothing.
   *
   * WHY THIS AND NOT A THRESHOLD. At a root r of W the identity gives Σqᵢ(r)² = 2W(r)c∞(r) = 0, so
   * for a true member ⟨q,q⟩ vanishes at every pole exactly. What we actually compute is
   * ⟨q,q⟩ = E(r) + 2W(r)c∞(r): the model residual evaluated there, and nothing else. Measured, the
   * two agree to every digit printed.
   *
   * That is why no threshold on the isotropy could ever work. A degree-16 polynomial that is 1e-16
   * across [0,1] is NOT small at |z| = 4.17 — measured, a state on the model to 9.1e-16 produced an
   * isotropy of 5.4e-8 at a pole out there, three orders above the bar its coefficients earn and six
   * above what root-location error explains. The isotropy at a far pole is extrapolated residual.
   *
   * So the honest test is whether ⟨q,q⟩ is ACCOUNTED FOR by the residual at that z. It is not
   * circular: ⟨q,q⟩ comes from q, E comes from the conformal state including c∞, and a genuinely
   * hard pole would leave a remainder. In this model there are none — which is the theorem the
   * slide states, now visible in the numbers rather than asserted over them.
   */
  readonly nullPolynomial?: readonly number[]
  /** Roots closer than this (relative) are treated as one multiple root. */
  readonly mergeWithin?: number
}

/**
 * Read every pole of a rational curve given as (P, w, ρ) in the Bernstein basis.
 *
 * ρ is not consulted: the verdict comes from ⟨q(r),q(r)⟩, which needs only q and W. That is
 * deliberate — on a conformal member ρ = h·W by construction, so ρ(r) = 0 at every root whatever
 * the curve does, and a readout built on it would report the parameterisation instead of the pole.
 */
export function readPoles(rat: Rat, options: PoleReadoutOptions = {}): PoleReading[] {
  const softBelow = options.softBelow ?? 1e-8
  const genuineAbove = options.genuineAbove ?? 1e-7
  const mergeWithin = options.mergeWithin ?? 1e-5
  const residual = options.residual ?? 0
  const nullPoly = options.nullPolynomial
  /** de Casteljau at a COMPLEX parameter — poles live off the real axis and outside [0,1]. */
  const bernAt = (c: readonly number[], z: Complex): Complex => {
    const p: Complex[] = c.map((v) => ({ re: v, im: 0 }))
    const one: Complex = { re: 1, im: 0 }
    for (let n = p.length - 1; n > 0; n--) {
      for (let i = 0; i < n; i++) p[i] = cadd(cmul(csub(one, z), p[i]), cmul(z, p[i + 1]))
    }
    return p[0] ?? C0
  }
  // A near-doubled root is located to half precision, so this is the smallest numerator that can
  // still be told apart from a cancelling one.
  const rootNoise = Math.sqrt(residual)

  const W = trueDegreePoly(bernsteinToPower(rat.w))
  const q = [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i])))
  const qScale = Math.max(...q.flat().map(Math.abs), 1e-300)
  const roots = rootsOf(W.map((v) => ({ re: v, im: 0 })))

  return roots.map((z) => {
    let separation = Infinity
    for (const other of roots) {
      if (other === z) continue
      separation = Math.min(separation, Math.hypot(z.re - other.re, z.im - other.im))
    }
    const scale = Math.max(1, Math.hypot(z.re, z.im))
    const multiple = separation < mergeWithin * scale
    const qv = q.map((c) => cpeval(c, z))
    const a = qv.map((c) => c.re)
    const b = qv.map((c) => c.im)
    const lengthA = Math.hypot(...a)
    const lengthB = Math.hypot(...b)
    const numerator = Math.hypot(lengthA, lengthB) / qScale
    const form = qv.reduce((acc, c) => cadd(acc, cmul(c, c)), C0)
    const isotropy = cnorm(form) / Math.max(lengthA ** 2 + lengthB ** 2, 1e-300)
    // The error ⟨q,q⟩ carries at THIS z, from coefficients known to `residual`. Zero when the
    // caller supplied no residual, which leaves `softBelow` as the only test, as before.
    const az = Math.hypot(z.re, z.im)
    let terms = 0
    for (const c of q) {
      let si = 0, pw = 1
      for (const ck of c) { si += Math.abs(ck) * pw; pw *= az }
      terms += si * si
    }
    // Two mechanisms, and the larger wins: the coefficients' own accuracy propagated to z, and —
    // when the caller supplied it — the model residual actually evaluated at z, which is what
    // ⟨q,q⟩ equals at a pole.
    const nullAtZ = nullPoly ? bernAt(nullPoly, z) : null
    const formNoise = Math.max(2 * residual * terms, nullAtZ ? cnorm(nullAtZ) : 0)
    /**
     * IS ⟨q,q⟩ ACCOUNTED FOR BY THE RESIDUAL? Compared as a REMAINDER, not as a magnitude.
     *
     * The two are computed from different data — ⟨q,q⟩ from q, E from the conformal state including
     * c∞ — so they agree to about seven digits, never to the last bit. Testing |⟨q,q⟩| ≤ |E(z)|
     * therefore fails on the final ulp roughly half the time, which is exactly what it did: poles
     * whose |⟨q,q⟩| and |E(z)| both printed 8.80e+0 came back HARD.
     *
     * Measured across every pole of a twenty-step gesture, the remainder is 1.2e-8 to 1.3e-7 of the
     * scale — accumulated rounding from a degree-16 evaluation at |z| up to 4.75, where the terms
     * reach 1e11. A genuinely hard pole leaves a remainder of order ONE, since nothing would
     * explain ⟨q,q⟩ at all. Seven orders of empty middle, and the cut is placed in it.
     */
    const explained = nullAtZ !== null
      && cnorm(csub(form, nullAtZ)) <= 1e-4 * Math.max(cnorm(form) + cnorm(nullAtZ), 1e-300)
    const real = Math.abs(z.im) < 1e-9 * scale
    // Soft either by the display convention or because ⟨q,q⟩ is zero to within what this state can
    // resolve. The second can only ADD soft readings — it never makes a soft one hard.
    const soft = isotropy < softBelow || cnorm(form) <= formNoise || explained
    const verdict: PoleVerdict = numerator < genuineAbove ? 'not a pole'
      : numerator < rootNoise ? 'below resolution'
        : multiple ? 'multiple — undefined'
          : soft ? 'soft' : 'hard'
    return {
      at: z,
      real,
      separation,
      multiple,
      numerator,
      a,
      b,
      lengthA,
      lengthB,
      angle: lengthB < 1e-12 * Math.max(lengthA, 1e-300)
        ? null
        : (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1,
          a.reduce((s, v, i) => s + v * b[i], 0) / (lengthA * lengthB)))),
      form,
      isotropy,
      formNoise,
      verdict,
    }
  })
}

/** One pole as the four lines a slide shows. `fixed` is the decimal places for the magnitudes. */
export function poleLines(p: PoleReading, fixed = 4): string[] {
  const t = p.real
    ? `t = ${p.at.re.toFixed(fixed)}`
    : `t = ${p.at.re.toFixed(fixed)} ${p.at.im >= 0 ? '+' : '−'} ${Math.abs(p.at.im).toFixed(fixed)}i`
  const kind = [
    p.real ? 'real' : 'complex',
    p.multiple ? `DOUBLE (separation ${p.separation.toExponential(1)})` : 'simple',
    p.numerator < 1e-7 ? 'numerator CANCELS' : 'genuine',
  ].join(', ')

  if (p.verdict === 'not a pole') {
    return [`pole   ${t}`, `       ${kind}`,
      `|q(r)| = ${p.numerator.toExponential(2)} — the fraction reduces`,
      'NOT A POLE']
  }
  if (p.verdict === 'below resolution') {
    return [`pole   ${t}`, `       ${kind}`,
      `|q(r)| = ${p.numerator.toExponential(2)} — inside what this state can resolve`,
      'NO VERDICT: cannot tell a genuine pole from a cancelling one here']
  }
  if (p.verdict === 'multiple — undefined') {
    return [`pole   ${t}`, `       ${kind}`,
      'W′(r) = 0, so N(r) = 0 whatever q does',
      'SOFTNESS UNDEFINED HERE  (POLE_ALGEBRA §6)']
  }
  if (p.real) {
    return [`pole   ${t}`, `       ${kind}`,
      `q(r) = (${p.a.map((v) => v.toFixed(fixed)).join(', ')})   b = 0, since r is real`,
      `⟨q,q⟩ = |a|² = ${p.form.re.toFixed(fixed)}${
        p.formNoise > 0 ? `  ± ${p.formNoise.toExponential(1)}` : ''
      }   →   ${p.verdict.toUpperCase()}`]
  }
  return [`pole   ${t}`, `       ${kind}`,
    `|a| = ${p.lengthA.toFixed(fixed)}   |b| = ${p.lengthB.toFixed(fixed)}` +
      `   angle = ${(p.angle ?? 0).toFixed(2)}°`,
    `⟨q,q⟩ = (|a|²−|b|²) + 2i⟨a,b⟩ = ${p.isotropy.toExponential(2)}${
      p.formNoise > 0 ? `  ± ${(p.formNoise / Math.max(p.lengthA ** 2 + p.lengthB ** 2, 1e-300)).toExponential(1)}` : ''
    }` + `   →   ${p.verdict.toUpperCase()}`]
}

// ---------------------------------------------------------------------------
// HAS THE CURVE LEFT THE MODEL?
// ---------------------------------------------------------------------------


/**
 * THE COEFFICIENT-LEVEL accuracy of ⟨C,C⟩ ≡ 0 — a DIFFERENT number from the one below, for a
 * different question, and the two must not be swapped.
 *
 * `conformalNullResidual` answers "is the curve on the model", which is a question about [0,1]. It
 * cannot answer "how wrong can this be at z = 4.17", because a polynomial can be machine-small on
 * [0,1] and enormous outside it — measured, a state reading 9.1e-16 there produced an isotropy of
 * 5.4e-8 at a pole of modulus 4.17, six orders above what the [0,1] number predicted.
 *
 * Poles live wherever W's roots are, so the error bar in `readPoles` needs the accuracy of the
 * COEFFICIENTS, which is what propagates outward. This is that: the worst Bernstein coefficient of
 * ⟨P,P⟩ against the size of the terms it cancels. No basis is changed, so nothing manufactures the
 * cancellation the retired power-basis version did.
 */
export function conformalCoefficientResidual(s: ConformalPHCurve): number {
  const r = nullCurveResidual(s.C)
  const sc = nullCurveResidualScale(s.C)
  return Math.max(...r.map(Math.abs)) / Math.max(...sc.map(Math.abs), 1e-300)
}

/**
 * HOW FAR OFF ⟨C,C⟩ ≡ 0 THE STATE IS — the worst relative violation of ‖q‖² = 2·W·c∞ across the
 * curve's own parameter range, sampled.
 *
 * Any figure claiming "the Möbius model cannot make a pole hard" must show this number, or it is
 * claiming something its own state may not satisfy.
 *
 * WHY IT IS SAMPLED RATHER THAN READ OFF THE COEFFICIENTS, which is what it used to be. The old
 * version converted to the POWER basis, took the worst coefficient of ‖q‖² − 2·W·c∞, and divided by
 * the largest power coefficient of either side. That conversion is alternating sums with binomial
 * weights: it manufactures cancellation in the very quantity it then divides by, so the ratio
 * inflates. Measured against the pointwise truth on [0,1] (whichNullMeasure.test.ts):
 *
 *     lift8, 20% grab        true worst on [0,1]    old POWER number     Bernstein coefficients
 *     point 0, corrected           1.3e-13            1.2e-6  (×1e7)        4.9e-11  (×4e2)
 *     point 2, corrected           5.1e-12            2.2e-7  (×4e4)        7.8e-10  (×2e2)
 *     point 0, plain               7.1e-8             3.6e-6  (×5e1)        3.6e-8   (×0.5)
 *     point 2, plain               1.3e-4             2.6e-4  (×2)          1.3e-5   (×0.1)
 *
 * The old number never read BELOW the truth — it was safe — but it overstated by seven orders
 * exactly when the solver was doing well, which is how a curve sitting on the model to 1e-13 got
 * labelled "off the model". The Bernstein-coefficient measure is far tighter and reads BELOW the
 * truth, which is the forbidden direction. Neither proxy is good enough, so this computes the
 * quantity itself. A sampled maximum is a slight LOWER bound on the true one — 200 samples land
 * within a percent of a 2001-sample reference, at 0.25 ms against the old 0.015 ms, which is
 * nothing for a readout — and there is no normalisation left to argue about. The shortfall is a
 * percent of the value, not the orders of magnitude the old normaliser was worth.
 *
 * ONLY [0,1], DELIBERATELY. Outside it the identity can be violated by O(1) even when it is machine
 * perfect on the domain — measured, 1.5e-1 at |t| up to 3.3 on a state reading 1.3e-13 here. That is
 * not this number's business: "is the curve on the model" is a question about where the curve is.
 * Whether a POLE out at |z| = 3.3 can be judged is a different question, and it is answered where it
 * belongs, by the per-root error bar in `readPoles` (see PoleReadoutOptions.residual).
 */
export function conformalNullResidual(s: ConformalPHCurve, samples = 200): number {
  const at = (c: readonly number[], t: number): number => {
    const p = [...c]
    for (let n = p.length - 1; n > 0; n--) {
      for (let i = 0; i < n; i++) p[i] = (1 - t) * p[i] + t * p[i + 1]
    }
    return p[0]
  }
  const col = (i: number): number[] => s.C.map((c) => (c as unknown as number[])[i])
  // The Bernstein coefficients of ⟨P,P⟩ = ‖q‖² − 2·W·c∞ itself, so no basis is changed anywhere.
  const E = nullCurveResidual(s.C)
  const W = col(0), inf = col(4)
  const q = [1, 2, 3].map(col)
  let worst = 0
  for (let k = 0; k <= samples; k++) {
    const t = k / samples
    const qq = q.reduce((a, c) => a + at(c, t) ** 2, 0)
    const wc = 2 * at(W, t) * at(inf, t)
    const scale = Math.abs(qq) + Math.abs(wc)
    if (scale > 0) worst = Math.max(worst, Math.abs(at(E, t)) / scale)
  }
  return worst
}

