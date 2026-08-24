// ============================================================================
// CHOOSE YOUR GRIP — and the number of curves changes.
//
// Every other interpolation figure in this deck fixes WHICH data is prescribed and asks how many
// curves fit it. This one makes the choice itself the gesture: you select which control points you
// hold, and the count moves. It is the same family of curves throughout — what changes is the
// coordinate system you put on it.
//
// THE RULE THE SELECTION ENFORCES. A planar PH curve of degree 2K−1 has dim = 2K+2 and each
// control point costs 2, so exactly K+1 of them can be prescribed. Select one more and the oldest
// non-endpoint is released (FIFO), so the count of held points is always K+1 and the fibre is
// always a COUNT rather than a family. That is the dimension rule made into an interaction: you
// cannot construct an over- or under-determined state by clicking.
//
// WHAT THE NUMBER MEANS. The total is a property of the GRIP alone — it does not move while you
// drag, only when you change which points you hold — and it runs over the whole range 1…2^{K−1}:
//
//     degree 3   1→2 2→2                 degree 7   1→6 2→8 3→4 4→10 5→8 6→8 7→4 8→8
//     degree 5   1→4 2→3 3→4 4→4
//
// certified path-by-path in planarPHSubsetCounts.test.ts.
//
// NOTHING ABOUT CUSPS IS SHOWN, and that is a decision rather than an omission. A cusp is a
// legitimate curve, so the question was only ever how to MARK one, and neither available test is
// good enough to put on a slide: the sampled minimum has an arbitrary cutoff that means nothing at
// degree 7 (see SHOW_CUSP_DASH), and the hull certificate is honest but fails to certify half the
// degree-7 branches. Deferred until the rational slides, where the question genuinely changes:
// there the speed is σ/w², so a vanishing speed and a POLE are two different ways for the drawing
// to break and a single "is it cusped" flag would conflate them. Whatever criterion serves that
// case should come back and serve this one. `isCusped` and `hullMargin` stay in place meanwhile.
//
// TWO FACTS THE FIGURE IS BUILT TO SHOW.
//   · Hold the K consecutive points from one end plus one more that is not the far endpoint, and
//     the answer is UNIQUE — the equations cascade (√ then divisions), nothing branches, and
//     dragging is single-valued. Those are the only grips where a curve editor never jumps.
//   · Pin both endpoints and the count is always EVEN, and the maximum 2^{K−1} is reachable ONLY
//     that way. So the endpoints toggle is not a convenience: it selects between always-branching
//     and possibly-unique editing.
//
// STRICT AND FREE, and why both are here from the first counting slide. Strict holds K+1 points,
// which is all the family has room for, so the answer is a COUNT and nothing is chosen. Free holds
// ONE, leaving 2K spare, so a solver must choose and minimum-norm is the choice: move what you
// grabbed, disturb everything else as little as possible. The spare room grows with degree — 2, 4,
// 6, 8 — so the two modes diverge further the higher you go, which is the honest reason to teach
// them together rather than treating free mode as a later convenience.
//
// The ends stay put in free mode unless you grab one (phFreeDrag's `pinned`). That is a heavy
// least-squares weight rather than a hard constraint, so it is worth knowing what it costs:
// measured over a 100-step drag covering more than a chord, the ends move by two hundredths of a
// pixel (phFreeDragPinned.test.ts).
//
// SOLVE vs TRACK. Changing the grip or the degree runs the full homotopy (every branch, from
// scratch). Dragging does NOT: each branch is carried by Newton from its own previous position,
// so the branch you clicked stays the branch you clicked, with no permutation matching. If a
// branch dies (the data crossed the discriminant) the figure falls back to a full solve and
// re-selects the fairest, which is visible as the selection jumping — honest, and rare.
// ============================================================================
import { useState } from 'react'
import type { Complex } from '../../core/complex'
import {
  type PlanarPHSubsetSolution,
  controlPointsFrom, degreeOf, solveSubset, trackSolutions,
} from '../../core/planarPHSubset'
import { type PHFreeState, dragPHFree, freeControlPoints, phPolygonResidual } from '../../core/phFreeDrag'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, ControlPolygon, DataPoint, DerivedPoint } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const SUB = '₀₁₂₃₄₅₆₇'
const DEGREES = [1, 2, 3, 4] as const          // K; the curve degrees are 1, 3, 5, 7

/** One reference generator per K, normalised so every degree fills the same box. */
const W_REF: Complex[] = [
  { re: 1, im: 0.2 }, { re: 0.4, im: 0.9 }, { re: -0.3, im: 0.7 }, { re: 0.8, im: -0.2 },
]
const CHORD = 4.2

export function reference(K: number): { w: Complex[]; p0: Complex } {
  const raw = W_REF.slice(0, K)
  const cps = controlPointsFrom(K, raw, { re: 0, im: 0 })
  const last = cps[cps.length - 1]
  const chord = Math.hypot(last.re, last.im) || 1
  // legs are quadratic in w, so scaling w by λ scales the curve by λ²
  const lambda = Math.sqrt(CHORD / chord)
  const w = raw.map((z) => ({ re: z.re * lambda, im: z.im * lambda }))
  const scaled = controlPointsFrom(K, w, { re: 0, im: 0 })
  const cx = (scaled[0].re + scaled[scaled.length - 1].re) / 2
  const cy = (scaled[0].im + scaled[scaled.length - 1].im) / 2
  return { w, p0: { re: -cx, im: -cy } }
}

/** Ends plus the first K−1 interior points — a valid grip at every degree. */
export const defaultSubset = (K: number): number[] => {
  const n = degreeOf(K)
  const out = [0]
  for (let i = 1; i <= K - 1; i++) out.push(i)
  out.push(n)
  return out.slice(0, K + 1).sort((a, b) => a - b)
}

type Mode = 'strict' | 'free'

interface State {
  K: number
  mode: Mode
  /** Non-null exactly in free mode — the generator being edited directly. */
  free: PHFreeState | null
  /** Held indices in SELECTION ORDER — the FIFO queue, not sorted. */
  order: number[]
  /** Targets, aligned with `order`. */
  targets: Complex[]
  solutions: PlanarPHSubsetSolution[]
  selected: number
  pinEnds: boolean
}

function freshState(K: number, pinEnds: boolean): State {
  const { w, p0 } = reference(K)
  const cps = controlPointsFrom(K, w, p0)
  const order = defaultSubset(K)
  const targets = order.map((i) => cps[i])
  const sorted = [...order].sort((a, b) => a - b)
  const r = solveSubset(K, sorted, sorted.map((i) => cps[i]))
  return { K, mode: 'strict', free: null, order, targets, solutions: r.solutions, selected: 0, pinEnds }
}

/** Control-polygon distance, for rejoining the branch you were looking at. */
const polygonDistance = (a: readonly Complex[], b: readonly Complex[]): number =>
  a.reduce((acc, p, i) => Math.max(acc, Math.hypot(p.re - b[i].re, p.im - b[i].im)), 0)

/**
 * THE FIFO RULE, pure so it can be tested without rendering. Adding a hold when the grip is
 * already full releases the OLDEST releasable one — the endpoints being exempt while they are
 * pinned. The grip therefore always has exactly K+1 members, which is the dimension rule turned
 * into an interaction: no click can produce an over- or under-determined state.
 */
export function nextGrip(
  order: readonly number[],
  targets: readonly Complex[],
  cps: readonly Complex[],
  idx: number,
  K: number,
  pinEnds: boolean,
): { order: number[]; targets: Complex[] } {
  const n = degreeOf(K)
  if (order.includes(idx)) return { order: [...order], targets: [...targets] }
  const evictable = order.filter((i) => !(pinEnds && (i === 0 || i === n)))
  const nextOrder = [...order, idx]
  const nextTargets = [...targets, cps[idx]]
  if (nextOrder.length > K + 1 && evictable.length) {
    const at = nextOrder.indexOf(evictable[0])
    nextOrder.splice(at, 1)
    nextTargets.splice(at, 1)
  }
  return { order: nextOrder, targets: nextTargets }
}

/** The homotopy wants ascending indices; the UI wants selection order. */
const alignSorted = (order: readonly number[], targets: readonly Complex[]) => {
  const pairs = order.map((i, k) => ({ i, t: targets[k] })).sort((a, b) => a.i - b.i)
  return { subset: pairs.map((p) => p.i), targets: pairs.map((p) => p.t) }
}

/**
 * OFF, deliberately, and kept because the machinery is sound even though the marking was not.
 *
 * Dashing a branch to say "this one has a cusp" needs a test, and the sampled one below has an
 * arbitrary cutoff. Measured across every branch of every grip: degrees 3 and 5 have nothing
 * anywhere near the threshold, so the marking was unambiguous there — but at degree 7, 29 of 254
 * branches sit in a continuum from 1e-6 to 1e-2 straddling it, so one branch at 8.6e-5 dashed and
 * its neighbour at 1.5e-4 did not, with nothing meaningful between them.
 *
 * The honest alternative is `PlanarPHSubsetSolution.hullMargin`, a real certificate (origin
 * outside the convex hull of w's coefficients ⟹ provably no cusp). It never contradicts the
 * sampled test, but it is conservative: 6/6 proven at degree 3, 34/38 at degree 5, only 128/254
 * at degree 7 — so dashing everything it cannot certify would smother the degree-7 slide.
 *
 * Neither is good enough to put on screen yet, so nothing is dashed. Flip this to true to get the
 * sampled marking back.
 */
const SHOW_CUSP_DASH = false

const isCusped = (s: PlanarPHSubsetSolution): boolean => s.minSpeed < 1e-4 * s.arcLength

const WORLD = (() => {
  const all = DEGREES.flatMap((K) => {
    const { w, p0 } = reference(K)
    return controlPointsFrom(K, w, p0)
  })
  const xs = all.map((p) => p.re), ys = all.map((p) => p.im)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const mx = (x1 - x0) * 0.14, my = (y1 - y0) * 0.3
  return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }
})()

const BASE = { width: 900, height: 430 }

const pathOf = (vp: Viewport, cps: readonly Complex[], n = 220): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const t = i / n
    let p = cps.map((z) => ({ ...z }))
    while (p.length > 1) {
      p = p.slice(0, -1).map((z, k) => ({
        re: (1 - t) * z.re + t * p[k + 1].re,
        im: (1 - t) * z.im + t * p[k + 1].im,
      }))
    }
    const s = vp.toScreen({ x: p[0].re, y: p[0].im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
  }
  return d
}

export default function PlanarSubsetFigure() {
  const [st, setSt] = useState<State>(() => freshState(2, true))   // opens on degree 3, the simplest rung
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const { K, mode, free, order, targets, solutions, selected, pinEnds } = st
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })
  const n = degreeOf(K)
  const sel = solutions[Math.min(selected, Math.max(0, solutions.length - 1))]

  /** strict → free: keep editing the very curve you were looking at. */
  const toFree = () => {
    if (!sel) return
    setSt((p) => ({ ...p, mode: 'free', free: { generator: sel.w, p0: sel.p0 } }))
    setFreeInfo({ tracking: 0, disturbance: 0 })
  }
  /** free → strict: read the grip off the curve you now have, and rejoin the nearest branch. */
  const toStrict = () => {
    setSt((p) => {
      if (!p.free) return { ...p, mode: 'strict' }
      const cps = freeControlPoints(p.free)
      const nextTargets = p.order.map((i) => cps[i])
      const { subset, targets: sortedT } = alignSorted(p.order, nextTargets)
      const r = solveSubset(p.K, subset, sortedT)
      if (!r.solutions.length) return { ...p, mode: 'strict' }
      let best = 0
      let bestD = Infinity
      r.solutions.forEach((s2, i) => {
        const d = polygonDistance(s2.controlPoints, cps)
        if (d < bestD) { bestD = d; best = i }
      })
      return { ...p, mode: 'strict', free: null, targets: nextTargets, solutions: r.solutions, selected: best }
    })
  }

  /** Drag: carry every branch from where it already is, so identity survives. */
  const moveTo = (slot: number, p: Complex) =>
    setSt((prev) => {
      const nextTargets = prev.targets.map((q, j) => (j === slot ? p : q))
      const { subset, targets: sortedT } = alignSorted(prev.order, nextTargets)
      const carried = trackSolutions(prev.K, subset, sortedT, prev.solutions)
      if (carried.every((s): s is PlanarPHSubsetSolution => s !== null)) {
        return { ...prev, targets: nextTargets, solutions: carried }
      }
      const r = solveSubset(prev.K, subset, sortedT)
      if (!r.solutions.length) return prev
      return { ...prev, targets: nextTargets, solutions: r.solutions, selected: 0 }
    })

  /**
   * Select an unheld point: it joins the grip and becomes draggable in the SAME gesture.
   *
   * Computed from the current state rather than inside a setState updater, because an updater
   * does not run synchronously — reading a slot index out of one would always read the stale
   * value, and the point would need a second click to move.
   */
  const takeHold = (idx: number): number => {
    const cps = sel?.controlPoints
    if (!cps) return -1
    const { order: nextOrder, targets: nextTargets } = nextGrip(order, targets, cps, idx, K, pinEnds)
    const { subset, targets: sortedT } = alignSorted(nextOrder, nextTargets)
    const r = solveSubset(K, subset, sortedT)
    if (!r.solutions.length) return -1
    setSt((p) => ({
      ...p, order: nextOrder, targets: nextTargets, solutions: r.solutions, selected: 0,
    }))
    return nextOrder.indexOf(idx)
  }

  /**
   * solveSubset returns branches sorted by R, so index 0 IS the fairest — which is what a fresh
   * grip, a fresh degree and a newly taken hold all select. After a drag the order is branch
   * IDENTITY rather than fairness (trackSolutions preserves position), so the fairest can move,
   * and the readout says which one it is instead of silently reordering under the cursor.
   */
  const fairest = solutions.reduce(
    (best, s2, i) => (s2.rotationIndex < (solutions[best]?.rotationIndex ?? Infinity) ? i : best),
    0,
  )
  const sortedSubset = [...order].sort((a, b) => a - b)
  const cps0 = mode === 'free' && free ? freeControlPoints(free) : (sel?.controlPoints ?? [])

  return (
    <FigureFrame
      world={WORLD}
      base={BASE}
      notation={
        mode === 'strict'
          ? [
              `deg ${n} = 2K−1, K = ${K}`,
              `dim = 2K+2 = ${2 * K + 2}`,
              `hold K+1 = ${K + 1}`,
              `max 2^(K−1) = ${2 ** (K - 1)}`,
              `{${sortedSubset.join(',')}}`,
            ]
          : [
              `deg ${n}, dim = ${2 * K + 2}`,
              'hold 1 ⇒ 2 conditions',
              `${2 * K} spare`,
              'min Σ|Pⱼ − Pⱼᵒˡᵈ|²',
            ]
      }
      readouts={
        mode === 'strict'
          ? [
              { label: 'solutions', value: String(solutions.length) },
              { label: 'R = ∫|κ|ds', value: sel ? sel.rotationIndex.toFixed(3) : '—' },
              { label: 'arc len', value: sel ? sel.arcLength.toFixed(3) : '—' },
              solutions.length === 1
                ? { label: '', value: 'unique grip ✓', tone: 'ok' as const }
                : selected === fairest
                  ? { label: '', value: `branch ${selected + 1}/${solutions.length} · fairest ✓`, tone: 'ok' as const }
                  : { label: '', value: `branch ${selected + 1}/${solutions.length} · fairest is ${fairest + 1}`, tone: 'plain' as const },
            ]
          : [
              { label: 'spare DOF', value: String(2 * K) },
              { label: 'cursor error', value: freeInfo.tracking.toExponential(1) },
              { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
              {
                label: 'PH residual',
                value: cps0.length ? phPolygonResidual(cps0).toExponential(1) : '—',
                tone: 'ok' as const,
              },
            ]
      }
      controls={
        <span className="flex items-center gap-2">
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
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            {DEGREES.map((k) => (
              <button
                key={k}
                onClick={() => setSt(freshState(k, pinEnds))}
                className={`px-2 py-[0.15em] ${k === K ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
              >
                {degreeOf(k)}
              </button>
            ))}
          </span>
          <button
            onClick={() => setSt((p) => freshState(p.K, !p.pinEnds))}
            className={`px-2 py-[0.15em] rounded border border-slate-300 ${
              pinEnds ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'
            }`}
          >
            ends held
          </button>
          <button
            onClick={() => setSt(freshState(K, pinEnds))}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={
        mode === 'free' ? (
          <>
            <b>Free.</b> Nothing is prescribed, so any point can be dragged. {2 * K + 2} degrees of
            freedom against 2 conditions leaves <b>{2 * K}</b> spare, and minimum-norm spends them:
            the rest of the polygon moves as little as it can. One continuous solution instead of
            branches, and the polygon stays PH. The ends hold unless one of them is dragged.
          </>
        ) : (
        <>
          <b>The number of solutions depends on which control points are held.</b> Blue points are
          held, {K + 1} of them, which is what {2 * K + 2} degrees of freedom allow. Hollow points
          are computed. Click a hollow point to hold it; the oldest hold is released.{' '}
          {pinEnds
            ? 'With both ends held the count is even, and 2^(K−1) is reachable.'
            : 'With the ends free, the single-solution grips appear: K in a row from one end plus one more.'}{' '}
          <span className="text-slate-400">Drag a blue point; click a grey curve to select it.</span>
        </>
        )
      }
    >
      {(vp) => {
        const onMove = (e: React.PointerEvent) => {
          if (dragIdx === null) return
          const w = vp.toWorld(e)
          if (mode === 'free') {
            if (!free) return
            // the ends hold unless the end IS what you grabbed
            const pinned = dragIdx === 0 || dragIdx === n ? [] : [0, n]
            const step = dragPHFree(free, dragIdx, { re: w.x, im: w.y }, { pinned })
            setSt((p) => ({ ...p, free: step.state }))
            setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
            return
          }
          moveTo(dragIdx, { re: w.x, im: w.y })
        }
        const grabFree = (i: number) => (e: React.PointerEvent) => {
          e.stopPropagation()
          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          setDragIdx(i)
        }
        const grab = (slot: number) => (e: React.PointerEvent) => {
          e.stopPropagation()
          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          setDragIdx(slot)
        }
        const cps = mode === 'free' && free ? freeControlPoints(free) : (sel?.controlPoints ?? [])
        return (
          <g onPointerMove={onMove} onPointerUp={() => setDragIdx(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {/* the branches you are not on — thin, dashed if cusped, clickable. Free mode has
                no branches at all: one continuous solution, chosen by minimum-norm. */}
            {mode === 'strict' && solutions.map((s, i) =>
              i === selected ? null : (
                <g key={`b${i}`}>
                  <path
                    d={pathOf(vp, s.controlPoints)}
                    {...curveStroke(vp, false)}
                    strokeDasharray={SHOW_CUSP_DASH && isCusped(s) ? `${vp.px(6)} ${vp.px(5)}` : undefined}
                  />
                  <path
                    d={pathOf(vp, s.controlPoints, 90)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={vp.px(FIG.size.curveHit)}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => { e.stopPropagation(); setSt((p) => ({ ...p, selected: i })) }}
                  />
                </g>
              ),
            )}

            {cps.length > 0 && (
              <>
                <ControlPolygon vp={vp} cps={cps} />
                <path
                  d={pathOf(vp, cps)}
                  {...curveStroke(vp, true)}
                  strokeDasharray={SHOW_CUSP_DASH && mode === 'strict' && sel && isCusped(sel)
                    ? `${vp.px(7)} ${vp.px(5)}` : undefined}
                />
              </>
            )}

            {/* strict: held = blue and draggable, computed = hollow and clickable.
                free: every point is a handle, because nothing is prescribed. */}
            {mode === 'free'
              ? cps.map((p, i) => (
                  <DataPoint
                    key={i}
                    vp={vp}
                    p={p}
                    label={`P${SUB[i]}`}
                    dragging={dragIdx === i}
                    onPointerDown={grabFree(i)}
                  />
                ))
              : cps.map((p, i) => {
              const slot = order.indexOf(i)
              if (slot >= 0) {
                return (
                  <DataPoint
                    key={i}
                    vp={vp}
                    p={targets[slot]}
                    label={`P${SUB[i]}`}
                    dragging={dragIdx === slot}
                    onPointerDown={grab(slot)}
                  />
                )
              }
              return (
                <g
                  key={i}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                    const s = takeHold(i)
                    if (s >= 0) setDragIdx(s)
                  }}
                >
                  <circle
                    cx={vp.toScreen({ x: p.re, y: p.im }).x}
                    cy={vp.toScreen({ x: p.re, y: p.im }).y}
                    r={vp.px(FIG.size.hit)}
                    fill="transparent"
                  />
                  <DerivedPoint vp={vp} p={p} label={`P${SUB[i]}`} />
                </g>
              )
            })}
          </g>
        )
      }}
    </FigureFrame>
  )
}
