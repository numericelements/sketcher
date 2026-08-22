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
import { type Complex, cadd, cmul, cnorm } from './complex'
import type { Rat } from './nurbsPH'
import type { ConformalPHCurve } from './conformalPHCurve'

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

export type PoleVerdict = 'soft' | 'hard' | 'not a pole' | 'multiple — undefined'

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
    const real = Math.abs(z.im) < 1e-9 * scale
    const verdict: PoleVerdict = numerator < genuineAbove ? 'not a pole'
      : multiple ? 'multiple — undefined'
        : isotropy < softBelow ? 'soft' : 'hard'
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
  if (p.verdict === 'multiple — undefined') {
    return [`pole   ${t}`, `       ${kind}`,
      'W′(r) = 0, so N(r) = 0 whatever q does',
      'SOFTNESS UNDEFINED HERE  (POLE_ALGEBRA §6)']
  }
  if (p.real) {
    return [`pole   ${t}`, `       ${kind}`,
      `q(r) = (${p.a.map((v) => v.toFixed(fixed)).join(', ')})   b = 0, since r is real`,
      `⟨q,q⟩ = |a|² = ${p.form.re.toFixed(fixed)}   →   ${p.verdict.toUpperCase()}`]
  }
  return [`pole   ${t}`, `       ${kind}`,
    `|a| = ${p.lengthA.toFixed(fixed)}   |b| = ${p.lengthB.toFixed(fixed)}` +
      `   angle = ${(p.angle ?? 0).toFixed(2)}°`,
    `⟨q,q⟩ = (|a|²−|b|²) + 2i⟨a,b⟩ = ${p.isotropy.toExponential(2)}` +
      `   →   ${p.verdict.toUpperCase()}`]
}

// ---------------------------------------------------------------------------
// HAS THE CURVE LEFT THE MODEL?
// ---------------------------------------------------------------------------

const pmul = (a: readonly number[], b: readonly number[]): number[] => {
  const o = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => { o[i + j] += x * y }))
  return o
}

/**
 * ‖q‖² − 2·W·c∞ as a POLYNOMIAL identity, relative to its own largest term.
 *
 * This is ⟨C,C⟩ ≡ 0 itself, and it has to be measured separately because the conformal drag's own
 * `defect` does not track it: measured on the same state, defect 6.7e-12 against a null residual
 * of 3.4e-5. That gap matters on a slide. Softness is FORCED in this model by exactly this
 * identity, so a state that has drifted off it can show poles reading hard — and they would be an
 * artifact of the solver rather than anything about the curve.
 *
 * Any figure claiming "the Möbius model cannot make a pole hard" must show this number, or it is
 * claiming something its own state may not satisfy.
 */
export function conformalNullResidual(s: ConformalPHCurve): number {
  const W = bernsteinToPower(s.C.map((c) => c[0]))
  const q = [1, 2, 3].map((i) => bernsteinToPower(s.C.map((c) => c[i])))
  const inf = bernsteinToPower(s.C.map((c) => c[4]))
  const lhs = q.map((qi) => pmul(qi, qi)).reduce((a, b) =>
    Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)))
  const rhs = pmul(W, inf).map((v) => 2 * v)
  let worst = 0
  let scale = 0
  for (let i = 0; i < Math.max(lhs.length, rhs.length); i++) {
    worst = Math.max(worst, Math.abs((lhs[i] ?? 0) - (rhs[i] ?? 0)))
    scale = Math.max(scale, Math.abs(lhs[i] ?? 0), Math.abs(rhs[i] ?? 0))
  }
  return worst / Math.max(scale, 1e-300)
}
