// ============================================================================
// THE SPATIAL GRIP FIGURE — what it must show, checked headlessly.
//
// r3f cannot be rendered here, so what is pinned is the state machine and the numbers it feeds to
// the marks: how many dials there are, that they hold the grip, that the curve on screen exists in
// every state the interaction can reach, and that the degree-5 Hermite grip really does close.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { controlPoints } from '../../../core/phSpatialFreeDragN'
import { vnorm, vsub } from '../../../core/quaternion'
import { fibreDimension, isMaximalGrip, maximalGrips } from '../../../core/spatialFibre'
import {
  BOUNDS, chartFor, currentCurve, degreeOf, dialRanges, endsGrip, freshState, gripSize,
  lociOf, reframe, seedFor,
} from '../SpatialSubsetFigure'
import { dragSpatialFree } from '../../../core/phSpatialFreeDragN'

const MS = [1, 2, 3]

/** Every grip of the guaranteed size, so nothing is checked on a lucky one. */
function allGrips(m: number): number[][] {
  const n = degreeOf(m)
  const out: number[][] = []
  const rec = (start: number, acc: number[]): void => {
    if (acc.length === gripSize(m)) { out.push([...acc]); return }
    for (let i = start; i <= n; i++) rec(i + 1, [...acc, i])
  }
  rec(0, [])
  return out
}

describe('the spatial grip figure', () => {
  it('holds (n+3)/2 points and leaves an m-parameter family, at every degree', () => {
    for (const m of MS) {
      const seed = seedFor(m)
      const grip = endsGrip(m)
      expect(grip.length).toBe(gripSize(m))
      expect(fibreDimension(seed, grip).dimension).toBe(m)
      expect(4 * m + 6 - 3 * gripSize(m)).toBe(m)
      console.log(`    degree ${degreeOf(m)}: ${controlPoints(seed).length} control points,` +
        ` hold ${gripSize(m)}, ${m}-parameter family`)
    }
  })

  it('OPENS ends-held, on a grip whose family is bounded, at every degree', () => {
    const want: Record<number, string> = { 1: '0,1,3', 2: '0,1,4,5', 3: '0,1,3,6,7' }
    for (const m of MS) {
      const st = freshState(m)
      expect(st.pinEnds).toBe(true)
      expect(st.order.join(',')).toBe(want[m])
      expect(isMaximalGrip(m, st.order), 'the default grip is one of the bounded ones').toBe(true)
      // the ends really are in it
      expect(st.order).toContain(0)
      expect(st.order).toContain(degreeOf(m))
      console.log(`    degree ${degreeOf(m)}: opens on {${st.order}} — bounded, ${st.kind}`)
    }
    // the two degrees with a closed form open on it: a toured ellipse and slide 9's own torus
    expect(freshState(1).kind).toBe('tour')
    expect(freshState(2).kind).toBe('angles')
    // ends free opens on the cascade grip instead
    expect(freshState(2, false).order.join(',')).toBe('0,1,2,3')
    expect(freshState(2, false).kind).toBe('cascade')
  })

  it('gives m DIALS AT EVERY GRIP — the whole point of the rebuild', () => {
    // This is the regression that mattered: {0,1,4,5} at degree 5 is a 2-parameter family and the
    // figure used to offer one slider on it, because coordinates existed only over the first m+2
    // control points. Every grip, every degree, now.
    for (const m of MS) {
      const seed = seedFor(m)
      let worstResidual = 0
      for (const grip of allGrips(m)) {
        const st = { m, pinEnds: false, mode: 'strict' as const, free: null, order: grip,
          targets: grip.map((i) => controlPoints(seed)[i]), ...reframe(m, grip, seed) }
        expect(st.chart, `a chart exists over {${grip}}`).not.toBeNull()
        expect(st.t.length, `{${grip}} gets ${m} dials`).toBe(m)
        expect(st.ranges.length).toBe(m)
        expect(st.dim).toBe(m)
        for (const r of st.ranges) expect(r, `{${grip}} dial has travel`).toBeGreaterThan(0)
        // and every dial position still holds the points it says it holds
        for (let k = 0; k < m; k++) {
          for (const s of [-1, 1]) {
            const tt = [...st.t]
            tt[k] = st.t[k] + s * st.ranges[k]
            const pts = controlPoints(st.chart?.build(tt) ?? seed)
            grip.forEach((i, j) => {
              worstResidual = Math.max(worstResidual, vnorm(vsub(pts[i], st.targets[j])))
            })
          }
        }
      }
      console.log(`    degree ${degreeOf(m)}: ${allGrips(m).length} grips, all with ${m} dials,` +
        ` grip held to ${worstResidual.toExponential(1)} at every dial end`)
      expect(worstResidual).toBeLessThan(1e-7)
    }
  }, 600_000)

  it('the WHOLE opening family stays inside the view box, periodic dials included', () => {
    const limit = Math.max(...BOUNDS.max.map(Math.abs))
    for (const m of MS) {
      const st = freshState(m)
      let worst = -Infinity     // NOT 0: every overflow is negative when it fits, and 0 would win
      // A periodic dial spans its whole period, so the corners are not enough — sweep it. A
      // non-periodic one was bisected against the box, so its corners are the extreme case.
      const steps = st.chart?.period ? 12 : 1
      const grid = (steps + 1) ** m
      for (let c = 0; c < grid; c++) {
        const tt = st.t.map((v, k) => {
          const idx = Math.floor(c / (steps + 1) ** k) % (steps + 1)
          return v + (steps === 1 ? (idx ? 1 : -1) : (2 * idx) / steps - 1) * st.ranges[k]
        })
        for (const p of controlPoints(st.chart?.build(tt) ?? st.base)) {
          worst = Math.max(worst, Math.abs(p.x) - limit, Math.abs(p.y) - limit, Math.abs(p.z) - limit)
        }
      }
      console.log(`    degree ${degreeOf(m)}: worst overflow past the box ${worst.toFixed(3)}` +
        ` over ${grid} positions${st.chart?.period ? ' (a full sweep of the period)' : ''}`)
      expect(worst).toBeLessThan(0)
    }
  }, 300_000)

  it('the curve on screen is never undefined, in any state the interaction reaches', () => {
    // The figure crashed once by reading the half of the state that was not driving. There is one
    // chart now, and `base` behind it, so every state must yield a curve.
    for (const m of MS) {
      const fresh = freshState(m)
      expect(currentCurve(fresh)).toBeDefined()
      expect(currentCurve(fresh).A.length).toBe(m + 1)

      // walk through a sequence of grips, the way clicking hollow points does
      let st = fresh
      for (const grip of [...maximalGrips(m).slice(0, 2), allGrips(m)[0], allGrips(m).at(-1) ?? []]) {
        const cur = currentCurve(st)
        st = { ...st, order: [...grip], targets: grip.map((i) => controlPoints(cur)[i]),
          ...reframe(m, grip, cur) }
        expect(currentCurve(st), `{${grip}} yields a curve`).toBeDefined()
        expect(currentCurve(st).A.length).toBe(m + 1)
      }
      console.log(`    degree ${degreeOf(m)}: four grip changes, a curve at every step`)
    }
  }, 300_000)

  it('degree 3 opens on a SPATIAL cubic, not a near-straight one', () => {
    // The random seed opened almost flat, and a flat cubic has a flat ellipse — the loop that is
    // the subject of the slide read as a smudge. This is the cubic slide's own configuration and
    // its own rule: of the members with the same three held points, the most spatial one.
    const seed = seedFor(1)
    const cps = controlPoints(seed)
    // how far from the chord the interior points sit, and how far from planar the polygon is
    const chord = vsub(cps[3], cps[0])
    const cl = vnorm(chord)
    let bend = 0
    for (const p of [cps[1], cps[2]]) {
      const d = vsub(p, cps[0])
      const along = (d.x * chord.x + d.y * chord.y + d.z * chord.z) / (cl * cl)
      bend = Math.max(bend, vnorm(vsub(d, { x: chord.x * along, y: chord.y * along, z: chord.z * along })))
    }
    const legs = [vsub(cps[1], cps[0]), vsub(cps[2], cps[1]), vsub(cps[3], cps[2])]
    const vol = Math.abs(
      legs[0].x * (legs[1].y * legs[2].z - legs[1].z * legs[2].y) -
      legs[0].y * (legs[1].x * legs[2].z - legs[1].z * legs[2].x) +
      legs[0].z * (legs[1].x * legs[2].y - legs[1].y * legs[2].x))
    console.log(`    degree 3 opens with chord ${cl.toFixed(2)}, bend ${bend.toFixed(2)}` +
      ` (${(100 * bend / cl).toFixed(0)}% of the chord), out-of-plane volume ${vol.toFixed(3)}`)
    expect(bend / cl, 'not a near-straight line').toBeGreaterThan(0.2)
    expect(vol, 'and not a planar one either').toBeGreaterThan(0.05)
  })

  it('degree 3 ends-held tours the whole ellipse, and the dial wraps', () => {
    const st = freshState(1)
    expect(st.chart?.period).toEqual([2 * Math.PI])
    const loci = lociOf(st)
    expect(loci.length, 'one dial times the one free control point').toBe(1)
    const pts = loci[0].pts
    const gap = Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1],
      pts[0][2] - pts[pts.length - 1][2])
    let spread = 0
    for (const p of pts) {
      spread = Math.max(spread, Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1], p[2] - pts[0][2]))
    }
    console.log(`    degree 3 {0,1,3}: P${loci[0].point} traces a loop closing to ${gap.toFixed(4)},` +
      ` across ${spread.toFixed(3)}`)
    // quantised to the trace, so "closed" is one sample's worth, not machine zero
    expect(gap).toBeLessThan(0.05 * spread)
    expect(spread).toBeGreaterThan(0.1)
    // every curve the dial reaches is an exact fibre member, holding all three points
    const targets = st.order.map((i) => controlPoints(st.base)[i])
    let worst = 0
    for (let i = 0; i <= 40; i++) {
      const c = controlPoints(st.chart?.build([(2 * Math.PI * i) / 40]) ?? st.base)
      st.order.forEach((idx, j) => { worst = Math.max(worst, vnorm(vsub(c[idx], targets[j]))) })
    }
    console.log(`    and holds its three points to ${worst.toExponential(1)} all the way round`)
    expect(worst).toBeLessThan(1e-7)
  }, 300_000)

  it('degree 5 ends-held draws CLOSED loci; the same grip charted does not claim to', () => {
    const st = freshState(2)
    expect(st.chart?.period).toEqual([2 * Math.PI, 2 * Math.PI])
    const loci = lociOf(st)
    // two dials times the two free control points P₂, P₃
    expect(loci.length).toBe(4)
    for (const l of loci) {
      expect([2, 3]).toContain(l.point)
      const a = l.pts[0]
      const b = l.pts[l.pts.length - 1]
      const gap = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      let spread = 0
      for (const p of l.pts) spread = Math.max(spread, Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]))
      console.log(`    dial ${l.dial + 1}, P${l.point}: closes to ${gap.toExponential(1)},` +
        ` having travelled ${spread.toFixed(3)}`)
      expect(gap, 'a periodic dial comes home').toBeLessThan(1e-9)
      expect(spread).toBeGreaterThan(1e-3)
    }
    // the retraction chart over a NON-periodic grip draws arcs, and says so by having no period
    const seed = seedFor(2)
    const other = chartFor(2, [0, 1, 2, 5], seed)
    expect(other?.kind).toBe('retraction')
    expect(other?.chart.period).toBeUndefined()
  }, 300_000)

  it('dialRanges gives a full period where there is one, and a calibrated range where there is not', () => {
    const st = freshState(2)
    if (!st.chart) throw new Error('no chart')
    expect(dialRanges(st.chart, 2, st.t0)).toEqual([Math.PI, Math.PI])
    const seed = seedFor(3)
    const got = chartFor(3, [0, 1, 2, 5, 7], seed)
    if (!got) throw new Error('no chart')
    const r = dialRanges(got.chart, 3, got.chart.tOf(seed))
    console.log(`    degree 7 {0,1,2,5,7}: dials calibrated to ±${r.map((v) => v.toFixed(3)).join(', ±')}`)
    for (const v of r) expect(v).toBeGreaterThan(0)
  }, 300_000)

  it('FREE mode holds nothing, so it draws no fibre — and coming back re-grips the curve', () => {
    for (const m of MS) {
      const st = freshState(m)
      expect(lociOf(st).length, 'strict draws the family').toBeGreaterThan(0)

      // free: the whole curve is the state, and there is no fibre to draw
      const free = { ...st, mode: 'free' as const, free: currentCurve(st) }
      expect(currentCurve(free)).toBeDefined()
      expect(lociOf(free), 'nothing held, so nothing traced').toEqual([])

      // drag a point that was NOT held — in strict it could not have moved at all
      const loose = controlPoints(currentCurve(free)).findIndex((_, i) => !st.order.includes(i))
      const before = controlPoints(currentCurve(free))
      const to = { x: before[loose].x + 0.25, y: before[loose].y + 0.15, z: before[loose].z }
      const step = dragSpatialFree(free.free, loose, to)
      const after = controlPoints(step.state)
      const moved = vnorm(vsub(after[loose], before[loose]))
      expect(moved, `P${loose} moved in free mode`).toBeGreaterThan(0.05)

      // strict again: the grip is re-read off wherever the curve ended up, so it is satisfied
      const back = { ...free, mode: 'strict' as const, free: null,
        targets: st.order.map((i) => after[i]), ...reframe(m, st.order, step.state) }
      expect(lociOf(back).length, 'and the family is drawn again').toBeGreaterThan(0)
      let worst = 0
      const now = controlPoints(currentCurve(back))
      st.order.forEach((i, j) => { worst = Math.max(worst, vnorm(vsub(now[i], back.targets[j]))) })
      console.log(`    degree ${degreeOf(m)}: free drag moved P${loose} by ${moved.toFixed(3)},` +
        ` re-grip holds to ${worst.toExponential(1)}`)
      expect(worst).toBeLessThan(1e-7)
    }
  }, 300_000)

  it('no drawn fibre path reads as a POLYLINE, at any grip of any degree', () => {
    // A coarse path looks like a rough calculation, so this is a look requirement with a number on
    // it: the longest single segment of any drawn path, as a fraction of the frame. It was 5.6% at
    // degree 3 and 7.0% at degree 5 on a scattered grip before the sweep was warm-started, the
    // closed loops refined, and the open arcs shortened.
    const frame = BOUNDS.max[0] - BOUNDS.min[0]
    let overall = 0
    for (const m of MS) {
      const seed = seedFor(m)
      let worstOfDegree = 0
      let where = ''
      for (const grip of allGrips(m)) {
        const st = {
          m, pinEnds: false, mode: 'strict' as const, free: null, order: grip,
          targets: grip.map((i) => controlPoints(seed)[i]), ...reframe(m, grip, seed),
        }
        for (const l of lociOf(st)) {
          for (let i = 1; i < l.pts.length; i++) {
            const d = Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1],
              l.pts[i][2] - l.pts[i - 1][2]) / frame
            if (d > worstOfDegree) { worstOfDegree = d; where = `{${grip}} P${l.point} dial ${l.dial + 1}` }
          }
        }
      }
      console.log(`    degree ${degreeOf(m)}: worst segment ${(100 * worstOfDegree).toFixed(2)}%` +
        ` of the frame, at ${where}`)
      overall = Math.max(overall, worstOfDegree)
    }
    expect(overall, 'the coarsest drawn path is still smooth').toBeLessThan(0.018)
  }, 900_000)
})
