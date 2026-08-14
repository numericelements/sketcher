// ============================================================================
// WALKING OFF THE CHART — one path, two views, one slider.
//
// WHAT THE WALK IS. Start at the member slides 3 and 4 steer: one real pole, spinor degree 2. Step a
// little along the tangent to the PH variety, Newton back onto it, and refuse any step that would let
// σ change sign. Repeat. The PH condition holds exactly at every point, and every point is joined to
// the start by a path that never left σ > 0 — so this is one continuous family of curves, not a jump
// to somewhere else.
//
// WHAT HAPPENS, and it is not what the walk was built to show. Within ten steps the denominator goes
// from ONE REAL ROOT to TWO COMPLEX CONJUGATE PAIRS. Three consequences arrive together:
//
//   · the curve stops reaching infinity — w has no real root, so w > 0 on the whole line and the
//     curve is BOUNDED, which is the thing complex poles exist to buy
//   · the cusp on the indicatrix goes with it. Slide 3's theorem is an if-and-only-if about a pole at
//     a REAL parameter; move the pole off the real axis and there is no corner to have
//   · the λ-chart loses it. Its construction takes `roots: number[]` — real poles — so nothing in it
//     can describe these curves at all, and the Jacobian rank climbs 11 → 13 as we leave
//
// SO THIS IS THE EDGE OF THE CHART, approached from the inside and crossed, with PH never once giving
// way. Slides 3 and 4 showed a coordinate running out at a boundary the geometry could not reach.
// This shows the geometry walking calmly across a boundary the coordinates cannot follow.
//
// THE PATH IS PRECOMPUTED, ~120 ms for 61 points, because each step is a Newton solve. The slider
// indexes into it — the same split the sibling deck's fibre loop uses, and for the same reason.
//
// No mathematics lives here. `continuationPath` is core/rationalPHVariety; the walk's properties are
// pinned in core/__tests__/onBranchTheChartCovers12Of13.test.ts.
// ============================================================================
import { useSyncExternalStore } from 'react'
import type { Quat, Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  familyBasis, toMember, unpackSpinor,
} from '../../core/rationalPHMultiPoleSpatial'
import { continuationPath, jacobian, layoutFor, pack, rankOf, unpack } from '../../core/rationalPHVariety'
import { hodographNumerator, pointOn, type RationalCurve } from '../../core/rationalCurveBlend'
import type { HasHodograph } from '../../core/tangentIndicatrix'

const L = layoutFor(4)
const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

/** The same seed slides 3 and 4 open on, at the same twist. */
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

export interface Station {
  readonly curve: RationalCurve
  readonly hodograph: HasHodograph
  /** How many roots of w are REAL — the count that decides whether the curve reaches infinity. */
  readonly realPoles: number
  /** Rank of the PH system here: 11 at the start, 13 once we are off the chart. */
  readonly rank: number
  /** Largest |c| over the drawn piece, so "bounded" can be shown rather than asserted. */
  readonly extent: number
}

const evalAt = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const trim = (a: readonly number[]): number => {
  const s = Math.max(...a.map(Math.abs), 1e-300)
  let top = a.length - 1
  while (top > 0 && Math.abs(a[top]) < 1e-9 * s) top--
  return top
}

/** Durand–Kerner, only to count how many roots are real. */
function realRootCount(a: readonly number[]): number {
  const top = trim(a)
  if (top < 1) return 0
  const c = a.slice(0, top + 1).map((v) => v / a[top])
  let z = Array.from({ length: top }, (_, i) => ({ re: 0.4 * Math.cos(0.9 + 2.3 * i), im: 0.4 * Math.sin(0.9 + 2.3 * i) }))
  const at = (p: { re: number; im: number }): { re: number; im: number } => {
    let re = 0, im = 0
    for (let i = c.length - 1; i >= 0; i--) { const nr = re * p.re - im * p.im + c[i]; im = re * p.im + im * p.re; re = nr }
    return { re, im }
  }
  for (let it = 0; it < 500; it++) {
    z = z.map((zi, i) => {
      const num = at(zi)
      let dr = 1, di = 0
      for (let j = 0; j < z.length; j++) {
        if (j === i) continue
        const ar = zi.re - z[j].re, ai = zi.im - z[j].im
        const nr = dr * ar - di * ai; di = dr * ai + di * ar; dr = nr
      }
      const m = dr * dr + di * di || 1e-300
      return { re: zi.re - (num.re * dr + num.im * di) / m, im: zi.im - (num.im * dr - num.re * di) / m }
    })
  }
  return z.filter((q) => Math.abs(q.im) < 1e-6 * Math.max(1, Math.abs(q.re))).length
}

/** Built once at module load: ~120 ms of Newton, so the slider costs nothing. */
export const PATH: Station[] = (() => {
  const m = toMember(SEED)
  const start = pack({ p: m.p as number[][], w: m.w as number[], sigma: m.sigma as number[] }, L)
  return continuationPath(start, L, { steps: 60 }).map((x) => {
    const u = unpack(x, L)
    const curve: RationalCurve = { p: u.p, w: u.w }
    let extent = 0
    for (let i = 0; i <= 60; i++) {
      const v = pointOn(curve, i / 60)
      extent = Math.max(extent, Math.hypot(v.x, v.y, v.z))
    }
    return {
      curve,
      hodograph: { N: hodographNumerator(curve), sigma: u.sigma },
      realPoles: realRootCount(u.w),
      rank: rankOf(jacobian(x, L)),
      extent,
    }
  })
})()

/** Where the walk stops being describable by the λ-chart — the first station with no real pole. */
export const LEAVES_AT = Math.max(0, PATH.findIndex((s) => s.realPoles === 0))

export const sampleCurve = (c: RationalCurve, count = 160): Vec3[] =>
  Array.from({ length: count + 1 }, (_, i) => pointOn(c, i / count))

export const denominatorAt = (s: Station, t: number): number => evalAt(s.curve.w, t)

// --- the shared slider ------------------------------------------------------
let index = 0
const listeners = new Set<() => void>()

export function useStation(): { index: number; station: Station } {
  const i = useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => index,
  )
  return { index: i, station: PATH[Math.min(i, PATH.length - 1)] }
}

export const walk = {
  to(i: number): void {
    index = Math.max(0, Math.min(PATH.length - 1, Math.round(i)))
    listeners.forEach((fn) => fn())
  },
}
