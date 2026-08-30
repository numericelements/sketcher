// ============================================================================
// THE SPATIAL TWIN OF THE GRIP SLIDE — hold control points, and travel what is left.
//
// Same gesture as the planar figure, same degree selector, and the answer changes in KIND. In the
// plane, holding all the family allows leaves a COUNT. In space it leaves a FAMILY:
//
//     dim = 4m+6,  each held point costs 3,  and you can always hold (n+3)/2 = m+2 of them
//
//     degree 3   hold 3 of 4    →  a 1-parameter family
//     degree 5   hold 4 of 6    →  a 2-parameter family
//     degree 7   hold 5 of 8    →  a 3-parameter family
//
// (n+3)/2 is the SAME number as in the plane — just over half the control points, both geometries.
// What differs is what is left over: nothing there, m dimensions here.
//
// ONE DIAL PER DIMENSION, AT EVERY GRIP. The count of dials is m and does not depend on WHICH
// points are held — it is 4m+6−3(m+2), which cannot see the choice. This figure used to show one
// slider on most grips anyway, because coordinates existed only over the first m+2 control points
// and everything else fell back to walking a single path: at degree 5 over {P₀,P₁,P₄,P₅} that
// meant a curve inside a surface, presented as the family. core/spatialFibre.retractionChart
// closes that gap, so every grip now gets its m dials.
//
// WHAT THE GRIP DOES DECIDE IS THE SHAPE, and there is a rule for it (spatialFibre.maximalGrips,
// swept exhaustively at degrees 3, 5, 7 — 75 grips):
//
//     hold both ends and ONE point out of each consecutive pair (P₁,P₂), (P₃,P₄), …
//         → the planar problem attains its full 2^m interpolants, and the spatial family is BOUNDED
//     anything else
//         → the plane loses branches, and the spatial family runs to infinity
//
// So the readout says bounded or runs away, and "ends held" opens on one of the 2^m good grips at
// every degree. That is the honest headline of the slide: the grip does not change how much
// freedom is left, it changes whether that freedom is a torus or a road.
//
// THREE CHARTS, ONE INTERFACE. All three answer build/tOf/residual, so the figure has a single
// code path and `samples[at]` — the read that crashed it — is gone:
//
//   {P₀,P₁,P₄,P₅} at degree 5   ANGLES. φ₀ and φ₂ from inverting a sandwich in closed form; the
//                               fibre is the quintic Hermite torus, the sliders WRAP, and the loci
//                               of the free control points are exact circles. Slide 9's grip.
//   the first m+2               the cascade chart: m global coordinates, nothing solved.
//   everything else             the retraction chart: normal coordinates at the curve on screen.
//
// Only the first has a PERIOD, so only there is a locus drawn closed. Elsewhere the loci are the
// arcs the dials actually reach, and nothing claims a circle where there is not one.
//
// FREE MODE HOLDS NOTHING, SO IT DRAWS NOTHING. Release the grip and there is no fibre: no dials,
// no loci, no ghosts. Drawing a family there would be a claim about a set that does not exist. What
// remains is 4m+6 degrees of freedom against the 3 conditions one dragged point imposes, spent by
// minimum-norm — except the ENDS, which stay put unless one of them is the point being dragged
// (dragSpatialFree's `pinned`, the planar figure's option one geometry up). That is a heavy
// least-squares weight rather than a hard constraint, so it is worth knowing what it costs: over a
// 100-step drag covering 1.4× the chord the ends move by 0.009–0.017% of it
// (phSpatialFreeDragPinned.test.ts). Coming back to strict re-reads the grip off wherever the curve
// ended up, so the handoff is continuous both ways.
//
// SOLVE ON GRIP CHANGE, CORRECT ON DRAG. Taking hold of a free point needs no solve at all — its
// target is read off the curve already on screen. Dragging corrects by minimum-norm Gauss–Newton
// (core/spatialFibre.correctToGrip) and re-charts around the result.
// ============================================================================
import { useMemo, useState } from 'react'
import { type Quat, type Vec3, vnorm, vsub } from '../../core/quaternion'
import { type SpatialPHCurve, controlPoints, dragSpatialFree } from '../../core/phSpatialFreeDragN'
import {
  type FibreChart,
  cascadeChart, correctToGrip, cubicTourChart, fibreDimension, isCubicTourGrip, isMaximalGrip,
  isQuinticHermiteGrip, quinticHermiteChart, retractionChart,
} from '../../core/spatialFibre'
import {
  type SpatialPHCubic, controlPoints as cubicControlPoints, planarity, spatialCubicFiberAt,
} from '../../core/phSpatialCubic'
import Figure3D, { type Bounds3D, Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const MS = [1, 2, 3] as const               // generator degrees → curve degrees 3, 5, 7
export const degreeOf = (m: number): number => 2 * m + 1
export const gripSize = (m: number): number => m + 2          // (n+3)/2, and always solvable
const tri = (p: Vec3): [number, number, number] => [p.x, p.y, p.z]

/**
 * DEGREE 3 OPENS ON THE CUBIC SLIDE'S OWN CONFIGURATION, framed to this figure's box.
 *
 * The random seed gave a cubic close to a straight line, which is the worst possible opening for a
 * slide whose subject is the family: a nearly-flat curve has a nearly-flat ellipse, and the loop
 * that is the whole point reads as a smudge. The cubic slide already solved this — it picks the
 * MOST SPATIAL member of the fibre, since arc length cannot choose (it is the same for every
 * member) and the gentlest member is planar. So take its three points and its rule.
 *
 * Framed from the FAMILY rather than the curve: the fibre is traced once, its bounding box is
 * measured over every member, and the configuration is scaled and centred so all of it lands
 * inside. Scaling the held points scales the fibre with them, so one trace calibrates and a second
 * builds.
 */
const CUBIC_P0: Vec3 = { x: -0.9, y: 0, z: -0.35 }
const CUBIC_P3: Vec3 = { x: 0.9, y: 0, z: -0.35 }
const CUBIC_P1: Vec3 = { x: -0.45, y: 0.35, z: 0.5 }
const CUBIC_FIT = 2.05

/** The most spatial member of the fibre through these three points — the cubic slide's rule. */
function mostSpatial(p0: Vec3, p1: Vec3, p3: Vec3, samples: number): SpatialPHCubic | null {
  const fibre = spatialCubicFiberAt(p0, p3, p1, 1, { samples })
  if (fibre.length === 0) return null
  let best = fibre[0]
  let bestD = -1
  for (const f of fibre) {
    const d = Math.abs(planarity(f.curve))
    if (d > bestD) { bestD = d; best = f }
  }
  return best.curve
}

const CUBIC_SEED: SpatialPHCurve | null = (() => {
  // 1. trace once at the slide's own scale and measure what the whole family occupies
  const fibre = spatialCubicFiberAt(CUBIC_P0, CUBIC_P3, CUBIC_P1, 1, { samples: 120 })
  if (fibre.length === 0) return null
  const all: Vec3[] = fibre.flatMap((f) => cubicControlPoints(f.curve))
  const lo = { x: Infinity, y: Infinity, z: Infinity }
  const hi = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const p of all) {
    lo.x = Math.min(lo.x, p.x); lo.y = Math.min(lo.y, p.y); lo.z = Math.min(lo.z, p.z)
    hi.x = Math.max(hi.x, p.x); hi.y = Math.max(hi.y, p.y); hi.z = Math.max(hi.z, p.z)
  }
  const c = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 }
  const half = Math.max(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) / 2
  const k = half > 0 ? CUBIC_FIT / half : 1
  // 2. rebuild at that scale — the fibre of the scaled points IS the scaled fibre
  const put = (p: Vec3): Vec3 => ({ x: (p.x - c.x) * k, y: (p.y - c.y) * k, z: (p.z - c.z) * k })
  const cubic = mostSpatial(put(CUBIC_P0), put(CUBIC_P1), put(CUBIC_P3), 320)
  return cubic ? { A: [cubic.A0, cubic.A1], p0: cubic.p0 } : null
})()

/**
 * One seed curve per degree, scaled so the WHOLE FAMILY fits the box — not just the curve.
 *
 * A periodic dial has to span its full period or the wrap is a lie, so on those grips the figure
 * cannot trim the family to fit: it must start small enough that all of it is already inside. The
 * degree-5 torus reaches 1.35 × the chord in every direction (measured over a 48×48 sweep of
 * (φ₀,φ₂)), so a chord of 2.6 would put it at 3.51 against a box of 2.4, and 1.6 puts it at 2.16.
 *
 * Degree 7 keeps 2.6 and has no period, so `dialRanges` bisects its travel against the box instead.
 */
export function seedFor(m: number): SpatialPHCurve {
  if (m === 1 && CUBIC_SEED) return CUBIC_SEED
  let a = (m * 977 + 41) >>> 0
  const rng = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const A: Quat[] = Array.from({ length: m + 1 }, (_, k) => ({
    u: 2 * rng() - 1 + (k === 0 ? 1.5 : 0), v: 2 * rng() - 1,
    p: 2 * rng() - 1, q: 2 * rng() - 1,
  }))
  const raw: SpatialPHCurve = { A, p0: { x: 0, y: 0, z: 0 } }
  // normalise the chord, then centre — legs are quadratic in 𝒜, so 𝒜 scales by the square root
  const cps = controlPoints(raw)
  const last = cps[cps.length - 1]
  const chord = Math.hypot(last.x, last.y, last.z) || 1
  const lam = Math.sqrt((m === 2 ? 1.6 : 2.6) / chord)
  const scaled: SpatialPHCurve = {
    A: A.map((q) => ({ u: q.u * lam, v: q.v * lam, p: q.p * lam, q: q.q * lam })),
    p0: { x: 0, y: 0, z: 0 },
  }
  const s = controlPoints(scaled)
  const mid = s[s.length - 1]
  return { A: scaled.A, p0: { x: -mid.x / 2, y: -mid.y / 2, z: -mid.z / 2 } }
}

const sampleCurve = (c: SpatialPHCurve, n = 90): [number, number, number][] => {
  const cps = controlPoints(c)
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    let p = cps.map((q) => ({ ...q }))
    while (p.length > 1) {
      p = p.slice(0, -1).map((q, k) => ({
        x: (1 - t) * q.x + t * p[k + 1].x,
        y: (1 - t) * q.y + t * p[k + 1].y,
        z: (1 - t) * q.z + t * p[k + 1].z,
      }))
    }
    return tri(p[0])
  })
}

/**
 * ENDS HELD — both ends, plus one point out of each consecutive pair, hugging the ends.
 *
 * Every grip this returns is one of the 2^m whose family is bounded, at every degree; the pairs
 * near the start give up their earlier point and those near the end their later one, which is what
 * makes it read as "held at the ends":
 *
 *     degree 3   {0,1,3}        degree 5   {0,1,4,5}        degree 7   {0,1,3,6,7}
 *
 * The degree-5 answer is exactly slide 9's grip, so the two slides hold the same four points.
 */
export function endsGrip(m: number): number[] {
  const n = degreeOf(m)
  const half = Math.ceil(m / 2)
  const picks = Array.from({ length: m }, (_, k) => (k < half ? 2 * k + 1 : 2 * k + 2))
  return [0, ...picks, n]
}

/** With the ends free, open on the cascade grip instead — the one with global coordinates. */
export const cascadeGrip = (m: number): number[] => Array.from({ length: gripSize(m) }, (_, i) => i)

const isCascadeGrip = (m: number, order: readonly number[]): boolean => {
  const s = [...order].sort((a, b) => a - b)
  return s.length === gripSize(m) && s.every((v, i) => v === i)
}

export type ChartKind = 'angles' | 'tour' | 'cascade' | 'retraction'

/**
 * The best chart available over this grip — angles if they exist, else global, else local.
 *
 * The order is not arbitrary: each option knows strictly more than the next. Angles carry a
 * period, so the slider wraps and a locus closes. The cascade chart carries no period but is exact
 * and global. The retraction chart is neither, and is what every remaining grip gets.
 */
export function chartFor(
  m: number, order: readonly number[], cur: SpatialPHCurve,
): { chart: FibreChart; kind: ChartKind } | null {
  const cps = controlPoints(cur)
  if (isCubicTourGrip(m, order)) {
    const c = cubicTourChart(cps, order)
    if (c) return { chart: c, kind: 'tour' }
  }
  if (isQuinticHermiteGrip(m, order)) {
    const c = quinticHermiteChart(cps)
    if (c) return { chart: c, kind: 'angles' }
  }
  if (isCascadeGrip(m, order)) {
    const c = cascadeChart(m, cps)
    if (c) return { chart: c, kind: 'cascade' }
  }
  const c = retractionChart(cur, order)
  return c ? { chart: c, kind: 'retraction' } : null
}

export type Mode = 'strict' | 'free'

export interface State {
  m: number
  pinEnds: boolean
  /** Free mode holds NOTHING, so there is no fibre — no dials, no loci, no ghosts. */
  mode: Mode
  /** The curve being edited directly; non-null exactly in free mode. */
  free: SpatialPHCurve | null
  /** Held indices in SELECTION ORDER — the FIFO queue, not sorted. */
  order: number[]
  targets: Vec3[]
  chart: FibreChart | null
  kind: ChartKind
  t: number[]
  /** Where the dials open — the coordinates of the curve on screen. */
  t0: number[]
  /** Slider half-widths about t0: half a period where there is one, else calibrated to the box. */
  ranges: DialRange[]
  /** Kept so there is always a curve to show, even if no chart could be built. */
  base: SpatialPHCurve
  dim: number
}

/**
 * How far each dial should travel — found by bisection, because the motion is QUADRATIC.
 *
 * The curve's dependence on a coordinate is quadratic, not linear, so calibrating from the rate at
 * t = 0 overshoots badly: it gave ±3.62 at degree 3 and the family left the box by twenty-one
 * units. Bisect for the largest range that keeps every control point in frame instead, then shrink
 * for the fact that the dials are used together.
 *
 * IT ALSO ASKS WHETHER THE GRIP IS STILL HELD. A retraction chart corrects onto the held points
 * iteratively and can be pushed past where that corrector converges — a dial calibrated on the box
 * alone would offer travel that silently stops holding the points the figure says it holds.
 */
/** One dial's travel, per direction: the slider runs [centre − down, centre + up]. */
export interface DialRange { down: number; up: number }

export function dialRanges(
  chart: FibreChart, m: number, centre: readonly number[], limit = 2.1,
  reachAlso?: readonly (readonly number[])[],
): DialRange[] {
  if (chart.period) return chart.period.map((p) => ({ down: p / 2, up: p / 2 }))
  const ok = (t: readonly number[]): boolean =>
    chart.residual(t) < 1e-7 &&
    controlPoints(chart.build(t)).every((p) =>
      Math.abs(p.x) < limit && Math.abs(p.y) < limit && Math.abs(p.z) < limit)
  /**
   * EACH DIRECTION IS CALIBRATED ON ITS OWN. The first version required BOTH directions to fit
   * the box and took one symmetric range — and on the degree-3 grip {P₀,P₁,P₂} that killed the
   * slider outright (±0.014): the opening curve was framed to 2.05 of the 2.1 box for the TOUR
   * fibre, one direction of this family exits immediately, and the symmetric rule silenced the
   * other, which had almost a unit of honest travel. Measured in spatialCascadeMirror.test.ts.
   */
  const bisect = (k: number, sign: 1 | -1): number => {
    const probe = (r: number): boolean => {
      const at = [...centre]
      at[k] = centre[k] + sign * r
      return ok(at)
    }
    if (!probe(1e-6)) return 0
    let lo = 1e-6
    let hi = 64
    for (let i = 0; i < 40; i++) {
      const mid = 0.5 * (lo + hi)
      if (probe(mid)) lo = mid
      else hi = mid
    }
    return lo
  }
  const solo = Array.from({ length: m }, (_, k) => ({ down: bisect(k, -1), up: bisect(k, 1) }))
  // Used together the dials compound, so leave room — measured to hold at every corner of the box.
  // A NON-PERIODIC dial is deliberately shorter than the box would allow. Its path is an arc with
  // no natural end, and a long arc drawn at any affordable resolution reads as a polyline; the same
  // budget over a short one reads as a curve. Three long arcs per free control point at degree 7
  // also filled the frame with strokes that said nothing. Short and crisp beats long and coarse:
  // the readout still says the family is bounded, so nothing pretends this is all of it.
  const share = m === 1 ? 1 : m >= 3 ? 0.075 : 0.11
  const out = solo.map((r) => ({ down: r.down * share, up: r.up * share }))
  /**
   * REACH-THE-MIRROR (Eric, 2026-08-24): a caller may name dial coordinates the travel MUST
   * include when they are legal — the cascade grip's mirror member −t₀, whose midpoint t = 0 is
   * the PLANAR curve, the one point where the runaway family crosses the plane of the held
   * points. The extension is travel only: nothing is drawn for the mirror and nothing reframes.
   */
  for (const target of reachAlso ?? []) {
    if (!ok(target)) continue
    for (let k = 0; k < m; k++) {
      const d = target[k] - centre[k]
      if (d > out[k].up) out[k].up = d
      if (-d > out[k].down) out[k].down = -d
    }
  }
  /**
   * TRUNCATE AT A DISCONTINUITY. The retraction chart projects iteratively, and pushed far enough
   * along a runaway family its corrector can hop to another branch — the held points are still
   * held, but a free point JUMPS, and a slider that carries the viewer across the hop shows the
   * curve teleporting (measured: a 7.6%-of-frame jump on the degree-3 grip {P₁,P₂,P₃} once the
   * dials went asymmetric). Walk each direction and end the offered travel at the last step
   * before any control point moves discontinuously. The cascade and angle charts are closed-form
   * and continuous, so the walk never shortens them.
   */
  const WALK = 48
  const JUMP = 0.15
  for (let k = 0; k < m; k++) {
    for (const sign of [1, -1] as const) {
      const r = sign > 0 ? out[k].up : out[k].down
      if (!(r > 0)) continue
      let prev = controlPoints(chart.build([...centre]))
      for (let i = 1; i <= WALK; i++) {
        const at = [...centre]
        at[k] = centre[k] + sign * (r * i) / WALK
        const cur = controlPoints(chart.build(at))
        const step = Math.max(...cur.map((q, j) => vnorm(vsub(q, prev[j]))))
        if (step > JUMP) {
          const keep = (r * (i - 1)) / WALK
          if (sign > 0) out[k].up = keep
          else out[k].down = keep
          break
        }
        prev = cur
      }
    }
  }
  return out
}

/**
 * Re-derive the chart and the dials for a grip and the curve currently on screen.
 *
 * `keep` reuses the dial travel instead of recalibrating it, which is what a DRAG wants. The
 * bisection is 40 probes per dial and each probe builds a curve: measured at 71ms per frame at
 * degree 7, against 16ms for a frame at 60fps. Re-charting alone is a fraction of that, so a drag
 * re-charts every frame and recalibrates once, when the pointer comes up.
 */
export type Reframed = Omit<State, 'm' | 'pinEnds' | 'mode' | 'free' | 'order' | 'targets'>

export function reframe(
  m: number, order: readonly number[], cur: SpatialPHCurve, keep?: readonly DialRange[],
): Reframed {
  const dim = fibreDimension(cur, order).dimension
  const got = chartFor(m, order, cur)
  if (!got) return { chart: null, kind: 'retraction', t: [], t0: [], ranges: [], base: cur, dim }
  const t0 = got.chart.tOf(cur)
  // The cascade grip's held points are coplanar exactly when there is ONE dial (three points), and
  // reflection through their plane is t ↦ −t on that dial — so −t₀ is the mirror member and t = 0
  // the planar curve, the one point where this runaway family crosses the held plane. Name three
  // must-reach targets in decreasing ambition — the mirror, a 15% overshoot past the crossing, the
  // crossing itself — and dialRanges extends travel to every one that is LEGAL (in the box). The
  // mirror can genuinely be out of frame (reflection does not respect the box); the crossing is the
  // guarantee that matters, with margin so the slider passes THROUGH the plane, not up to it.
  const mirror = got.kind === 'cascade' && got.chart.dimension === 1
    ? [t0.map((v) => -v), t0.map((v) => -0.15 * v), t0.map(() => 0)]
    : undefined
  const ranges = keep && keep.length === got.chart.dimension
    ? [...keep]
    : dialRanges(got.chart, got.chart.dimension, t0, 2.1, mirror)
  return { chart: got.chart, kind: got.kind, t: t0, t0, ranges, base: cur, dim }
}

export function freshState(m: number, pinEnds = true): State {
  const seed = seedFor(m)
  const cps = controlPoints(seed)
  const order = pinEnds ? endsGrip(m) : cascadeGrip(m)
  return {
    m, pinEnds, mode: 'strict', free: null, order,
    targets: order.map((i) => cps[i]), ...reframe(m, order, seed),
  }
}

/**
 * THE CURVE ON SCREEN — one read, from one place.
 *
 * This used to be a choice between two halves of the state, and reading the wrong one is how the
 * figure crashed: on a chart the sample list is empty, so `samples[at]` was undefined. There is
 * now only ever a chart, and `base` is what is shown if even that could not be built.
 */
export const currentCurve = (s: Pick<State, 'mode' | 'free' | 'chart' | 't' | 'base'>): SpatialPHCurve =>
  s.mode === 'free' && s.free ? s.free : s.chart ? s.chart.build(s.t) : s.base

export const BOUNDS: Bounds3D = { min: [-2.4, -2.4, -2.4], max: [2.4, 2.4, 2.4] }
/** Ghost curves along the last dial. Fewer at degree 7, where the frame is already busy. */
const ghostCount = (m: number): number => (m >= 3 ? 4 : 7)
/**
 * Samples per locus, and both numbers are set by what the eye sees rather than by what is cheap.
 *
 * A path drawn coarsely reads as a polyline, and a polyline reads as a rough calculation. The
 * closed loops come from charts with a closed form, so samples there cost almost nothing and the
 * count is simply generous. The arcs come from the retraction chart, which solves per sample — but
 * it now sweeps warm-started, so a finer path costs a fraction of what it used to, and the arcs
 * themselves were shortened (see `dialRanges`), which buys resolution a second time.
 */
const LOCUS_STEPS_CLOSED = 240
/** Crispness budget for a drawn arc: no chord longer than ~1.25% of the 4.4-unit frame. */
const LOCUS_MAX_SEG = 0.055
const LOCUS_SAMPLE_CAP = 480
const LOCUS_STEPS_OPEN = 112
/** Degree 7 has three dials to sweep instead of one, so it spends fewer samples on each. */
const locusStepsOpen = (m: number): number => (m >= 3 ? 56 : LOCUS_STEPS_OPEN)

/**
 * Where each free control point goes as one dial is turned — the family, drawn.
 *
 * The other dials stay where the user left them, so every locus passes through the curve on
 * screen. On a periodic dial the sweep is a whole period and the locus closes; otherwise it is the
 * arc the dial reaches, which is a smaller claim and the only one available.
 *
 * EACH LOCUS IS CENTRED WHERE ITS SLIDER IS, NOT WHERE THE DIAL CURRENTLY SITS. Centring on the
 * moving value would drag the arc along under the point, so turning a dial would slide the curve
 * and the drawing of the family together and neither would read as motion. Centred on the
 * slider's own origin, the arc holds still and the point travels along it — and it is then exactly
 * the set the slider can reach, which is the honest thing for it to be.
 */
export function lociOf(
  s: Pick<State, 'mode' | 'chart' | 't' | 't0' | 'ranges' | 'order'>,
): { dial: number; point: number; pts: [number, number, number][] }[] {
  const { chart, t, t0, ranges, order } = s
  // nothing is held in free mode, so there is no fibre to trace and drawing one would be a claim
  if (s.mode === 'free' || !chart) return []
  const held = new Set(order)
  const out: { dial: number; point: number; pts: [number, number, number][] }[] = []
  for (let k = 0; k < chart.dimension; k++) {
    const period = chart.period?.[k]
    const down = period ? period / 2 : (ranges[k]?.down ?? 0)
    const up = period ? period / 2 : (ranges[k]?.up ?? 0)
    if (!(down + up > 0)) continue
    // never fewer than the chart can distinguish: a quantised one throws resolution away below it
    const steps = Math.max(
      period ? LOCUS_STEPS_CLOSED : locusStepsOpen(chart.dimension),
      chart.naturalSteps ?? 0)
    const centre = period ? t[k] : (t0[k] ?? t[k])
    // built from the base, one sample at a time — see retractionChart on why marching is wrong
    const at = (v: number): Vec3[] => {
      const tt = [...t]
      tt[k] = v
      return controlPoints(chart.build(tt))
    }
    let vs = Array.from({ length: steps + 1 }, (_, i) => centre - down + ((down + up) * i) / steps)
    let built = vs.map(at)
    /**
     * CHORD-ADAPTIVE REFINEMENT, added with the asymmetric dials: a dial's travel is no longer
     * capped by its weaker direction, so a fixed step count can leave segments long enough to
     * read as a polyline (measured 10% of the frame on the degree-3 cascade grip). Subdivide any
     * segment whose worst free-point chord exceeds the crispness budget, up to a sample cap.
     */
    for (let round = 0; round < 6 && built.length < LOCUS_SAMPLE_CAP; round++) {
      const nextVs: number[] = []
      const nextB: Vec3[][] = []
      let split = false
      for (let i = 0; i < built.length; i++) {
        nextVs.push(vs[i]); nextB.push(built[i])
        if (i === built.length - 1) break
        let worst = 0
        for (let j = 0; j < built[i].length; j++) {
          if (held.has(j)) continue
          worst = Math.max(worst, vnorm(vsub(built[i + 1][j], built[i][j])))
        }
        if (worst > LOCUS_MAX_SEG && nextB.length + (built.length - i) < LOCUS_SAMPLE_CAP) {
          const mid = 0.5 * (vs[i] + vs[i + 1])
          nextVs.push(mid); nextB.push(at(mid))
          split = true
        }
      }
      vs = nextVs; built = nextB
      if (!split) break
    }
    const paths = new Map<number, [number, number, number][]>()
    for (const pts of built) {
      for (let j = 0; j < pts.length; j++) {
        if (held.has(j)) continue
        if (!paths.has(j)) paths.set(j, [])
        paths.get(j)?.push(tri(pts[j]))
      }
    }
    for (const [point, pts] of paths) out.push({ dial: k, point, pts })
  }
  return out
}

export default function SpatialSubsetFigure() {
  const [st, setSt] = useState<State>(() => freshState(1))
  const [dragging, setDragging] = useState<number | null>(null)

  const { m, pinEnds, mode, order, targets, chart, kind, t, t0, ranges, dim } = st
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })
  const curve = currentCurve(st)
  const cps = useMemo(() => controlPoints(curve), [curve])
  const n = degreeOf(m)
  const bounded = isMaximalGrip(m, order)

  const loci = useMemo(() => lociOf(st), [mode, chart, t, t0, ranges, order])

  /** Ghosts along the LAST dial, so the family reads as a family even at rest. */
  const ghosts = useMemo(() => {
    if (mode === 'free' || !chart) return []
    const k = chart.dimension - 1
    const period = chart.period?.[k]
    const down = period ? period / 2 : (ranges[k]?.down ?? 0)
    const up = period ? period / 2 : (ranges[k]?.up ?? 0)
    if (!(down + up > 0)) return []
    const n = ghostCount(m)
    return Array.from({ length: n }, (_, g) => {
      const tt = [...t]
      tt[k] = t[k] - down + ((down + up) * (g + 0.5)) / n
      return sampleCurve(chart.build(tt), 50)
    })
  }, [mode, chart, t, ranges, m])

  /** Drag a held point: correct the curve onto the new targets, then re-chart around it. */
  const dragTo = (slot: number, p: [number, number, number]) =>
    setSt((prev) => {
      const nextTargets = prev.targets.map((q, k) => (k === slot ? { x: p[0], y: p[1], z: p[2] } : q))
      const { curve: moved, residual } = correctToGrip(currentCurve(prev), prev.order, nextTargets)
      if (residual > 1e-6) return prev
      // keep the dial travel: recalibrating it is the expensive half, and pointer-up does it
      return { ...prev, targets: nextTargets, ...reframe(prev.m, prev.order, moved, prev.ranges) }
    })

  /** Pointer-up: recalibrate the dials against the box, once, for the curve we ended on. */
  const recalibrate = () =>
    setSt((prev) => ({ ...prev, ...reframe(prev.m, prev.order, currentCurve(prev)) }))

  // --- mode handoff, continuous both ways ---------------------------------------
  /** Release everything: 4m+6 degrees of freedom against 3 conditions, minimum-norm spends them. */
  const toFree = () =>
    setSt((prev) => {
      setFreeInfo({ tracking: 0, disturbance: 0 })
      return { ...prev, mode: 'free', free: currentCurve(prev) }
    })

  /** Take the grip back: read its targets off the curve in front of you and re-chart around it. */
  const toStrict = () =>
    setSt((prev) => {
      const cur = currentCurve(prev)
      const here = controlPoints(cur)
      return {
        ...prev, mode: 'strict', free: null,
        targets: prev.order.map((i) => here[i]),
        ...reframe(prev.m, prev.order, cur),
      }
    })

  /**
   * Free drag: move one control point, let minimum-norm decide what the rest do.
   *
   * The ENDS still stay put unless one of them is the point being dragged — `pinned`, the same
   * option the planar figure uses. It is a heavy least-squares weight and not a hard constraint,
   * so the ends drift; the drift is measured rather than assumed.
   */
  const dragFree = (index: number, p: [number, number, number]) =>
    setSt((prev) => {
      if (!prev.free) return prev
      const ends = [0, degreeOf(prev.m)].filter((i) => i !== index)
      const step = dragSpatialFree(prev.free, index, { x: p[0], y: p[1], z: p[2] }, { pinned: ends })
      setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
      return { ...prev, free: step.state }
    })

  /** Take hold of a free point — its target is read off the curve, so nothing is solved. */
  const takeHold = (idx: number) =>
    setSt((prev) => {
      if (prev.order.includes(idx)) return prev
      const cur = currentCurve(prev)
      const here = controlPoints(cur)
      const nextOrder = [...prev.order, idx]
      const nextTargets = [...prev.targets, here[idx]]
      // FIFO, except that a held END stays held while "ends held" is on
      const evictable = nextOrder.findIndex((i) =>
        !(prev.pinEnds && (i === 0 || i === degreeOf(prev.m))))
      if (nextOrder.length > gripSize(prev.m) && evictable >= 0) {
        nextOrder.splice(evictable, 1)
        nextTargets.splice(evictable, 1)
      }
      return {
        ...prev, order: nextOrder, targets: nextTargets,
        ...reframe(prev.m, nextOrder, cur),
      }
    })

  const held = new Set(order)
  const periodic = !!chart?.period
  const dialLabel = kind === 'angles' ? ['φ₀', 'φ₂']
    : kind === 'tour' ? ['around']
      : t.map((_, k) => `t${k + 1}`)

  return (
    <Figure3D
      bounds={BOUNDS}
      notation={[
        `deg ${n} = 2m+1, m = ${m}`,
        `dim = 4m+6 = ${4 * m + 6}`,
        `hold (n+3)/2 = ${gripSize(m)}`,
        `left over ${4 * m + 6 - 3 * gripSize(m)}`,
      ]}
      readouts={mode === 'free' ? [
        { label: 'held', value: 'nothing' },
        { label: 'free', value: `${4 * m + 6} against 3` },
        { label: 'cursor error', value: freeInfo.tracking.toFixed(4) },
        { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
      ] : [
        { label: 'held', value: `${order.length} of ${n + 1}` },
        { label: 'family', value: `${dim}-parameter` },
        bounded
          ? {
            label: '',
            value: kind === 'angles' ? 'a torus'
              : kind === 'tour' ? 'a closed loop'
                : 'bounded',
            tone: 'ok' as const,
          }
          : { label: '', value: 'runs away', tone: 'plain' as const },
        { label: dialLabel.join(', '), value: t.map((v) => v.toFixed(2)).join(', ') },
      ]}
      controls={
        <span className="flex items-center gap-2">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            {MS.map((k) => (
              <button
                key={k}
                onClick={() => setSt(freshState(k, true))}
                className={`px-2 py-[0.15em] ${k === m ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
              >
                {degreeOf(k)}
              </button>
            ))}
          </span>
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            <button
              onClick={toStrict}
              className={`px-2 py-[0.15em] ${mode === 'strict' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              strict
            </button>
            <button
              onClick={toFree}
              className={`px-2 py-[0.15em] ${mode === 'free' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              free
            </button>
          </span>
          <button
            disabled={mode === 'free'}
            onClick={() => setSt((p) => freshState(p.m, !p.pinEnds))}
            className={`px-2 py-[0.15em] rounded border border-slate-300 ${
              mode === 'free' ? 'opacity-40' : pinEnds ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'
            }`}
          >
            ends held
          </button>
          {/* one dial per dimension — the family has m of them, so the figure does too, and
              none at all in free mode, where there is no family */}
          <span className="inline-flex items-center gap-1">
            {(mode === 'strict' ? t : []).map((v, k) => (
              <input
                key={k}
                type="range"
                min={(t0[k] ?? 0) - (ranges[k]?.down ?? 1)}
                max={(t0[k] ?? 0) + (ranges[k]?.up ?? 1)}
                step={((ranges[k]?.down ?? 1) + (ranges[k]?.up ?? 1)) / 500}
                value={v}
                onChange={(e) => setSt((p) => ({
                  ...p, t: p.t.map((w, j) => (j === k ? Number(e.target.value) : w)),
                }))}
                className={m === 1 ? 'w-40' : 'w-24'}
                aria-label={`dial ${dialLabel[k] ?? k + 1}${periodic ? ' (wraps)' : ''}`}
              />
            ))}
          </span>
          <button
            onClick={() => setSt(freshState(m, pinEnds))}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={mode === 'free' ? (
        <>
          <b>Free.</b> Nothing is prescribed, so grab any of the {n + 1} points. {4 * m + 6} degrees
          of freedom against the 3 conditions that one dragged point imposes leaves{' '}
          {4 * m + 3} spare, and minimum-norm spends them — the curve stays exactly PH throughout,
          because the unknown is the generator and there is no constraint to violate. The ends stay
          where they are unless you grab one. No fibre is drawn, because with nothing held there is
          no fibre.{' '}
          <span className="text-slate-400">Drag the view to rotate.</span>
        </>
      ) : (
        <>
          <b>In space the answer is a family, not a count.</b> {4 * m + 6} degrees of freedom against{' '}
          {gripSize(m)} held control points at three apiece leaves {4 * m + 6 - 3 * gripSize(m)}, so
          there {m > 1 ? 'are' : 'is'} {m} dial{m > 1 ? 's' : ''}.{' '}
          {bounded
            ? kind === 'angles'
              ? 'These four are C¹ Hermite data, and the family is the torus: both dials are angles, so they wrap and the grey loops close.'
              : kind === 'tour'
                ? 'The family is an ellipse, so the dial goes all the way round and the grey loop is the whole of it.'
                : `Both ends and one point out of each consecutive pair — the family stays bounded, and the plane gets all ${2 ** m} of its interpolants on exactly these choices.`
            : 'The family runs away and the planar problem loses branches.'}{' '}
          Blue points are held and can be dragged anywhere; grey ones are computed, and clicking
          one takes hold of it. <span className="text-slate-400">Drag the view to rotate.</span>
        </>
      )}
    >
      {loci.map((l) => (
        <Curve3D
          key={`l${l.dial}-${l.point}`}
          points={l.pts}
          color={FIG.color.derived}
          width={1.5}
          dashed={l.dial % 2 === 1}
        />
      ))}
      {ghosts.map((g, i) => (
        <Curve3D key={`g${i}`} points={g} color={FIG.color.curveMuted} width={1.1} />
      ))}
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
      <Curve3D points={sampleCurve(curve)} color={FIG.color.curve} width={3.5} />

      {mode === 'free'
        ? cps.map((p, i) => (
          <DragPoint3D
            key={i}
            position={tri(p)}
            onDrag={(q) => dragFree(i, q)}
            onDragStart={() => setDragging(i)}
            onDragEnd={() => setDragging(null)}
            color={dragging === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            radius={0.065}
          />
        ))
        : cps.map((p, i) =>
        held.has(i) ? (
          <DragPoint3D
            key={i}
            position={tri(targets[order.indexOf(i)] ?? p)}
            onDrag={(q) => dragTo(order.indexOf(i), q)}
            onDragStart={() => setDragging(i)}
            onDragEnd={() => { setDragging(null); recalibrate() }}
            color={dragging === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            radius={0.075}
          />
        ) : (
          <Point3D
            key={i}
            position={tri(p)}
            derived
            radius={0.05}
            onPointerDown={(e) => { e.stopPropagation(); takeHold(i) }}
          />
        ),
        )}
    </Figure3D>
  )
}
