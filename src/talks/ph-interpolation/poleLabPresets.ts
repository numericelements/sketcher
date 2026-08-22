// ============================================================================
// THE SPECIMENS THE POLE LAB OPENS ON — cached, because finding them is not instant.
//
// Every preset here has a REASON to exist: it is a curve whose pole character is settled by
// algebra, so the lab can be checked against it rather than only explored with it.
//
//     all soft, conformal       degree 4 and 6      ⟨C,C⟩ ≡ 0 forces it (POLE_ALGEBRA §7)
//     hard, real simple pole    degree 4            the λ-chart quartic, σ(1.7) = 8.21
//     hard, complex poles       degree 3, 4, 5      hard without a real pole
//     MIXED                     degree 3            two soft poles and one hard, in one curve
//     DOUBLE real pole          degree 2            §6's counterexample — softness undefined
//     a pole that CANCELS       degree 2            not a pole at all, and it should say so
//
// AND THE ODD DEGREES CARRY A THEOREM. A real polynomial of odd degree has a real root, so an
// odd-degree curve always has a real pole — and by §6 a genuine simple real pole is always HARD.
// So no odd-degree curve with genuine simple poles can be all-soft. That is §8's parity theorem
// arrived at from the projective side, with no conformal model in it, and the lab shows it by
// simply not having an odd-degree soft preset to offer.
//
// THE CONFORMAL ONES ARE LITERAL COEFFICIENTS, and that is the whole reason this file exists.
// `findMember(6)` takes EIGHTEEN SECONDS, and degree 4 finds nothing at all under its default
// guards — they are tuned for degree 5 — so it needs relaxed ones and about a second. Solving at
// load would make the lab unusable for the thing it is for, which is switching specimens while
// thinking. Found once, pasted here, and checked on every run against what they are supposed to be
// (poleLabPresets.test.ts) so a stale paste cannot survive.
//
// The rest are constructed, because they are exact and cost nothing.
// ============================================================================
import { bernsteinMultiply } from '../../core/bernstein'
import type { Conformal } from '../../core/conformal'
import type { ConformalPHCurve } from '../../core/conformalPHCurve'
import {
  hardQuarticMember, liftHardQuarticToConformal, liftRatToConformal, toBern,
} from '../../core/hardQuarticWitness'
import { type Rat, settleToPH, hodographN } from '../../core/nurbsPH'
import { bernsteinToPower } from '../../core/conformalPHHopf'
import { liftToConformal } from '../../core/conformalLift'

/** A conformal member as it comes out of findMember: five coefficients per control sphere, plus h. */
interface CachedConformal { readonly C: number[][]; readonly h: number[] }

/** findMember(4, relaxed guards) — 1.0s to find, so cached. */
const CONFORMAL_4: CachedConformal = {
  C: [
    [1, 0.6419776081866826, 1.6441522490259481, 2.8562951870119337, 5.6368970313688544],
    [0.9608941302587094, 0.4604547554010337, 1.5146689931801856, 2.5863760025680587, 4.756940131840843],
    [1.0847765772133933, 0.14525519252673438, 1.7150409365226715, 2.813515826662382, 4.906163328484571],
    [0.4919886133723731, -1.0440084017474163, 0.8696100131556226, 1.110767301702651, 1.560282251767473],
    [4.259552684267157, 0.009455414918705411, 7.22676930099981, 15.43269999481809, 34.08744234311125],
  ],
  h: [-0.9273606933824254, -1.4632223874924557, -2.8112466419305826, -4.971433456697644],
}

/** findMember(6) — EIGHTEEN seconds to find, so very much cached. */
const CONFORMAL_6: CachedConformal = {
  C: [
    [1, -4.641980153888502, 0.3561634755541206, 2.8581467846072357, 14.921917606387098],
    [1.0440184584389132, -4.459732902000092, 1.1145373764184732, 2.871676717811623, 13.727865289420189],
    [0.8104895760427508, -2.8607945041111056, 1.1483527205555004, 1.9495969481407056, 8.023306716217673],
    [0.5969389128429657, -1.9753510726269143, 0.3193330255254909, 0.7631794592169128, 3.1605378168749367],
    [1.1716541583245539, -5.46281265082081, 1.1401200768355209, 1.7135667385283888, 14.31650148018738],
    [1.180951103040127, -5.893713671782037, 1.3528930126698582, 2.4443302858926192, 17.785832837838278],
    [0.818817807673248, -4.173486559530831, 1.004858675100967, 2.188717107217005, 14.177887545528225],
  ],
  h: [-5.068664124607113, -1.9661840771846917, -1.924517673175696, -2.193633412993149,
    -2.3663811006925703, -4.378491843973815],
}

export const conformalPreset = (c: CachedConformal): ConformalPHCurve => ({
  C: c.C.map((row) => [...row] as unknown as Conformal),
  h: [...c.h],
})

/**
 * A conformal member as (P, w, ρ) — the SAME curve, in the projective model's unknowns.
 *
 * P = q/W and ρ = h·W, and the conversion is exact rather than a fit: it is why one lab can hold
 * both models. It also means the Möbius preset is a legal starting point for the projective slide,
 * so flipping model does not move the curve.
 */
export function conformalAsRat(s: ConformalPHCurve): Rat {
  const d = s.C.length - 1
  const w = s.C.map((c) => (c as unknown as number[])[0])
  const q = [1, 2, 3].map((i) => s.C.map((c) => (c as unknown as number[])[i]))
  return {
    P: Array.from({ length: d + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w: [...w],
    rho: bernsteinMultiply([...s.h], w),
  }
}

/** The λ-chart quartic: one real SIMPLE pole at t = 1.7, and it is hard. */
export function hardQuarticRat(): Rat {
  const m = hardQuarticMember()
  const d = 4
  const w = toBern([...m.w], d)
  const q = [0, 1, 2].map((i) => toBern([...m.p[i]], d))
  return {
    P: Array.from({ length: d + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w,
    rho: toBern([...m.sigma], 2 * d - 1),
  }
}

/** x(t) = (1/(t+1)², 0, 0) — a DOUBLE real pole, genuine, where softness is undefined (§6). */
export function doublePoleRat(): Rat {
  const w = toBern([1, 2, 1], 2)
  const q = [toBern([1], 2), toBern([0], 2), toBern([0], 2)]
  return {
    P: Array.from({ length: 3 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w,
    rho: toBern([2, 2], 3),
  }
}

/**
 * q and W sharing (t − ½): the root at ½ is not a pole at all, and the readout must say so.
 *
 * q = ((t−½), 0, 0) and W = (t−½)(t−2), so N = q′W − qW′ = −(t−½)² and ρ = (t−½)². It reduces to
 * x = 1/(t−2), which is a degree-1 curve with one genuine simple real pole at t = 2 — hard, as §6
 * says every genuine simple real pole must be. So the readout should report ONE pole and one
 * non-pole, which is the whole point of having this specimen.
 *
 * ρ has to be COMPUTED, not invented: the first version set ρ = 1 and the preset test caught it as
 * a residual of 16.3 rather than 1e-15. A specimen that is not PH teaches nothing about PH curves.
 */
export function cancellingPoleRat(): Rat {
  const w = toBern([1, -2.5, 1], 2)
  const q = [toBern([-0.5, 1], 2), toBern([0], 2), toBern([0], 2)]
  return {
    P: Array.from({ length: 3 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w,
    rho: toBern([0.25, -1, 1], 3),
  }
}

const bern = (n: number, t: number): number[] => {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let k = 1; k <= n; k++) {
    for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
    out[0] *= 1 - t
  }
  return out
}

/**
 * A projective member from a deterministic random start — HARD, and generically at complex poles.
 *
 * Fast enough to solve at load (about 0.15s), and left that way on purpose: it is the one preset
 * whose point is that nothing was arranged. The seeds are fixed so the lab opens the same way twice.
 */
export function randomHardRat(d: number, seed: number): Rat | null {
  let a = seed >>> 0
  const rnd = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const P = Array.from({ length: d + 1 }, () => [2 * rnd() - 1, 2 * rnd() - 1, 2 * rnd() - 1])
  const w = Array.from({ length: d + 1 }, () => 0.5 + rnd())
  const N = hodographN({ P, w, rho: new Array<number>(2 * d).fill(0) })
  const rho = Array.from({ length: 2 * d }, (_, k) => {
    const t = k / (2 * d - 1)
    const b = bern(N[0].length - 1, t)
    return Math.hypot(...[0, 1, 2].map((i) => N[i].reduce((s, v, j) => s + v * b[j], 0)))
  })
  const got = settleToPH({ P, w, rho }, d)
  return got.residual < 1e-11 ? got.rat : null
}

/**
 * A preset that fails to build is a BUG, not something to paper over.
 *
 * The first version fell back to a different curve when the solve missed, and the preset test
 * caught it immediately: seed 9001 does not converge at degree 3, so the "degree 3" specimen was
 * silently a degree-4 one. On a lab slide that is a lie told quietly. Throwing is the honest
 * failure, and the seeds below are ones that converge.
 */
function mustBuild(rat: Rat | null, id: string): Rat {
  if (!rat) throw new Error(`pole lab preset '${id}' failed to build — its seed no longer converges`)
  return rat
}

/**
 * The lift of a GENERIC hard quartic — the specimen where the split is crisp.
 *
 * Degree turned out not to be what makes the lift hard to move, which was the obvious guess and
 * the wrong one. Measured, grabbing each lift the same way at 80 iterations:
 *
 *     λ-chart quartic (W true degree 1)  → conformal 8   900 iters, 295ms, never clean
 *     random hard degree 2               → conformal 4   900 iters,  87ms
 *     random hard degree 3               → conformal 6   900 iters, 180ms, never reaches 1e-9
 *     random hard degree 4               → conformal 8    80 iters,   3ms, ALL SOFT
 *     random hard degree 5               → conformal 10   80 iters,   9ms, ALL SOFT
 *
 * The two HIGHEST degrees are the fastest, so the conformal degree is not the difficulty — the
 * specimen is. The λ-chart quartic is awkward because its denominator is genuinely degree 1 inside
 * a degree-4 basis, so the lift is a degree-8 member carrying a degree-2 denominator, and that
 * imbalance costs two directions of rank in the defining Jacobian. The low conformal degrees are
 * awkward for the opposite reason: degree 4 has very little room (degree 3 is confined to a circle
 * by the null condition alone), so there is nowhere for a corrector to go.
 *
 * AND IT IS NOT ABOUT BEING NON-REDUCED, which was the first explanation given here and is wrong.
 * This clean lift is non-reduced too — doubled poles, cancelling numerator — and sits at the
 * GENERIC rank 4n−1. docs/CONFORMAL_SINGULAR_LOCUS.md has the measurements.
 */
function liftGenericHard(): ConformalPHCurve {
  const rat = mustBuild(randomHardRat(4, 9000), 'lift8g')
  const w = bernsteinToPower(rat.w)
  const q = [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i])))
  return liftRatToConformal(w, q, bernsteinToPower(rat.rho))
}

/**
 * The MIXED cubic, lifted both ways — the pair that shows what the minimal lift is for.
 *
 * Two of its three poles are soft, so (t−r) already divides ‖q‖² there and the uniform lift doubles
 * a factor all three components share. Dividing it out costs nothing and buys two things:
 *
 *     uniform   conformal degree 6,  rank 21 of 24,  δ = 2   — a singular point
 *     MINIMAL   conformal degree 4,  rank 15 of 16,  δ = 0   — the generic rank
 *
 * The λ-chart specimen gains nothing from this, and that is worth seeing too: its δ is pure degree
 * SHORTFALL (deg w = 1 against deg q = 4), which no lift can fix — only a better-balanced source.
 */
const liftMixed = (uniform: boolean): ConformalPHCurve => {
  const rat = mustBuild(randomHardRat(3, 9002), 'mixed lift')
  return liftToConformal(
    bernsteinToPower(rat.w),
    [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i]))),
    bernsteinToPower(rat.rho),
    { uniform },
  ).state
}

export interface Preset {
  readonly id: string
  readonly label: string
  /** What it is FOR — shown under the readout, so the lab explains its own specimens. */
  readonly note: string
  readonly degree: number
  /** Present only where the curve is a member of the conformal model too. */
  readonly conformal?: ConformalPHCurve
  readonly rat: () => Rat
}

export const PRESETS: Preset[] = [
  {
    id: 'soft4',
    label: 'all soft (conformal, 4)',
    note: '⟨C,C⟩ ≡ 0 forces every pole isotropic — the Möbius model cannot express anything else.',
    degree: 4,
    conformal: conformalPreset(CONFORMAL_4),
    rat: () => conformalAsRat(conformalPreset(CONFORMAL_4)),
  },
  {
    id: 'soft6',
    label: 'all soft (conformal, 6)',
    note: 'Six complex poles, every one at |a| = |b| and 90°. Degree is even, and by §8 it must be.',
    degree: 6,
    conformal: conformalPreset(CONFORMAL_6),
    rat: () => conformalAsRat(conformalPreset(CONFORMAL_6)),
  },
  {
    id: 'hard4',
    label: 'hard, real pole (λ-chart, 4)',
    note: 'One real SIMPLE pole at t = 1.7 with σ = 8.21. A genuine simple real pole is always hard (§6).',
    degree: 4,
    rat: hardQuarticRat,
  },
  {
    id: 'mixed3',
    label: 'MIXED — two soft, one hard (3)',
    note: 'One curve, both kinds. The hard one is the REAL pole, and at odd degree a real pole is unavoidable.',
    degree: 3,
    rat: () => mustBuild(randomHardRat(3, 9002), 'mixed3'),
  },
  {
    id: 'hard3r',
    label: 'all hard (3)',
    note: 'A deterministic random solve. Odd degree, so one pole is real, and a real pole is hard.',
    degree: 3,
    rat: () => mustBuild(randomHardRat(3, 9003), 'hard3r'),
  },
  {
    id: 'hard5r',
    label: 'all hard (5)',
    note: 'The same, one degree up. Odd degree again — which the Möbius model cannot hold at all (§8).',
    degree: 5,
    rat: () => mustBuild(randomHardRat(5, 9014), 'hard5r'),
  },
  {
    id: 'mixedMin',
    label: 'MIXED, lifted MINIMALLY (4)',
    note: 'Two of its three poles are soft, so the factor they share is divided out instead of doubled. Conformal degree 4 rather than 6, and at the GENERIC rank — a smooth point, where the uniform lift of the same curve is singular.',
    degree: 4,
    conformal: liftMixed(false),
    rat: () => conformalAsRat(liftMixed(false)),
  },
  {
    id: 'mixedUni',
    label: 'MIXED, lifted uniformly (6)',
    note: 'The same curve, doubling every pole including the soft ones. Two extra directions of rank are lost to a factor all three components already shared — δ = 2, and the drag feels it.',
    degree: 6,
    conformal: liftMixed(true),
    rat: () => conformalAsRat(liftMixed(true)),
  },
  {
    id: 'lift8g',
    label: 'a hard curve, LIFTED — the clean one (8)',
    note: 'A generic hard quartic in the Möbius model. Touch it and the doubled pole SPLITS into eight genuine poles, every one soft — in 80 iterations and 3ms. Hard to soft, once, with no way back.',
    degree: 8,
    conformal: liftGenericHard(),
    rat: () => conformalAsRat(liftGenericHard()),
  },
  {
    id: 'lift8',
    label: 'a hard curve, LIFTED (8)',
    note: 'The λ-chart quartic in the Möbius model — and the AWKWARD one. Its denominator is genuinely degree 1 inside a degree-4 basis, so its lift is a degree-8 member with a degree-2 denominator, and the solver needs 900 iterations where the clean specimen needs 80. Nothing is hidden: when ⟨C,C⟩ drifts the verdict is withheld and the number shown.',
    degree: 8,
    conformal: liftHardQuarticToConformal().state,
    rat: () => conformalAsRat(liftHardQuarticToConformal().state),
  },
  {
    id: 'double',
    label: 'DOUBLE real pole (2)',
    note: 'x = (1/(t+1)², 0, 0). Genuine, real, and softness is UNDEFINED there — W′(r) = 0 so N(r) = 0 whatever q does.',
    degree: 2,
    rat: doublePoleRat,
  },
  {
    id: 'cancel',
    label: 'a pole that cancels (2)',
    note: 'q and W share (t − ½), so it reduces to 1/(t − 2). The readout should refuse to call ½ a pole, because it is not one.',
    degree: 2,
    rat: cancellingPoleRat,
  },
]
