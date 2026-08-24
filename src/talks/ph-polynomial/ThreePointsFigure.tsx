// ============================================================================
// SLIDE 4 — the price of PH, in one comparison, at any degree.
//
// An ordinary Bézier of degree K and a planar PH curve of degree 2K−1 have the SAME 2K+2 real
// degrees of freedom, and K+1 interpolation points impose the SAME 2K+2 real conditions. Both
// systems are square. The ordinary one is LINEAR and gives one curve; the PH one is QUADRATIC and
// gives 2^(K−1).
//
//     PH degree   3    5    7          left panel degree   2   3   4
//     answers     2    4    8          answers             1   1   1
//
// THE LEFT DEGREE IS FORCED, not chosen. Holding it at 2 while the right climbed would leave the
// panels with different degrees of freedom and the slide's title would stop being true.
//
// The points are shared: drag one in either panel and both update.
//
// BRANCH IDENTITY. The PH solutions are roots of one system, so their order is not canonical and
// re-solving reshuffles it. Each frame carries every branch by Newton from its own previous
// position (core/planarPHSubset.trackThroughPoints), so colours never jump and no permutation
// matching is needed. A full solve runs only when the degree changes or a branch is lost.
//
// The left panel is one complex linear solve. The right is a total-degree homotopy, cross-checked
// against phCubic's closed form at K=2 and phPlanarSepticInterp's Cayley octad at K=4
// (planarPHThroughPoints.test.ts).
// ============================================================================
import { useState } from 'react'
import type { Complex } from '../../core/complex'
import {
  type PlanarPHSubsetSolution, degreeOf, solveThroughPoints, trackThroughPoints,
} from '../../core/planarPHSubset'
import { csolveLinear } from '../../core/phSubsetInterp'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, DerivedPoint, DataPoint, ControlPolygon } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const KS = [2, 3, 4] as const          // PH degrees 3, 5, 7

/** Nominal pixels: each panel is half the slide. */
const BASE = { width: 430, height: 330 }

/** K+1 points, evenly spaced in parameter. */
export const paramsFor = (K: number): number[] => Array.from({ length: K + 1 }, (_, m) => m / K)

/**
 * The starting points, on a gentle arc rather than a zig-zag.
 *
 * Interpolating equally spaced parameters is where Bernstein overshoot lives, and zig-zag data is
 * its worst case: measured, alternating points made the ORDINARY Bézier's control polygon 24 units
 * tall at degree 7 while its curve spanned 3.6. A smooth arc keeps both panels' polygons near
 * their curves (2.1 tall at degree 7) without hiding anything — the wild PH branches still fly,
 * because that is a fact about those branches and not about the data.
 */
export const START: Record<number, Complex[]> = Object.fromEntries(
  [2, 3, 4].map((K) => [
    K,
    Array.from({ length: K + 1 }, (_, m) => ({
      re: -2.3 + (4.6 * m) / K + 0.14 * Math.sin(2.1 * m),
      im: 1.25 * Math.sin((Math.PI * m) / K) - 0.35 + 0.1 * Math.cos(1.7 * m),
    })),
  ]),
)

const binom = (n: number, k: number): number => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
const bern = (n: number, j: number, t: number): number => binom(n, j) * t ** j * (1 - t) ** (n - j)

/** The unique degree-K Bézier through K+1 points: one complex linear solve. */
export function bezierThrough(K: number, ts: readonly number[], q: readonly Complex[]): Complex[] {
  const M = ts.map((t) => Array.from({ length: K + 1 }, (_, j) => ({ re: bern(K, j, t), im: 0 })))
  return csolveLinear(M, [...q]) ?? []
}

export function deCasteljau(cps: readonly Complex[], t: number): Complex {
  let p = cps.map((z) => ({ ...z }))
  while (p.length > 1) {
    p = p.slice(0, -1).map((z, i) => ({
      re: (1 - t) * z.re + t * p[i + 1].re,
      im: (1 - t) * z.im + t * p[i + 1].im,
    }))
  }
  return p[0]
}

const pathOf = (vp: Viewport, cps: readonly Complex[], n = 180): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = deCasteljau(cps, i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
  }
  return d
}

/**
 * The world box, from the ACTUAL control polygons at this degree's start data.
 *
 * Hand-written before, and the PH polygon reached past it — one control point sat off the top of
 * the left panel. Computed once per degree, never during a drag, so the view does not lurch.
 */
export function worldFor(K: number): { x0: number; x1: number; y0: number; y1: number } {
  const ts = paramsFor(K)
  const q = START[K]
  const sols = solveThroughPoints(K, ts, q).solutions
  const all: Complex[] = [
    ...q,
    ...bezierThrough(K, ts, q),
    // every curve that gets drawn ...
    ...sols.flatMap((s) => Array.from({ length: 80 }, (_, i) => deCasteljau(s.controlPoints, i / 79))),
    // ... and the polygon of the branch that is selected on load, which is the only one drawn.
    ...sols[0].controlPoints,
  ]
  const xs = all.map((p) => p.re), ys = all.map((p) => p.im)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const mx = (x1 - x0) * 0.09, my = (y1 - y0) * 0.14
  const box = { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }

  // Match the panel's aspect by GROWING the deficient side, never shrinking either, so nothing can
  // be clipped whichever way the viewport chooses to fit. Interpolation data is wide and flat — the
  // raw box reaches 3.2:1 at degree 7 against a 1.3:1 panel — and without this the curve sits in a
  // thin band with the frame empty above and below.
  const want = BASE.width / BASE.height
  const w = box.x1 - box.x0, h = box.y1 - box.y0
  if (w / h > want) {
    const grow = (w / want - h) / 2
    box.y0 -= grow
    box.y1 += grow
  } else {
    const grow = (h * want - w) / 2
    box.x0 -= grow
    box.x1 += grow
  }
  return box
}

const WORLDS: Record<number, ReturnType<typeof worldFor>> = { 2: worldFor(2), 3: worldFor(3), 4: worldFor(4) }

interface State {
  K: number
  points: Complex[]
  solutions: PlanarPHSubsetSolution[]
  selected: number
}
const freshState = (K: number): State => ({
  K,
  points: START[K],
  solutions: solveThroughPoints(K, paramsFor(K), START[K]).solutions,
  selected: 0,
})

export default function ThreePointsFigure() {
  const [st, setSt] = useState<State>(() => freshState(2))
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const { K, points, solutions, selected } = st
  const ts = paramsFor(K)
  const bezierCps = bezierThrough(K, ts, points)
  const sel = solutions[Math.min(selected, Math.max(0, solutions.length - 1))]

  const moveTo = (i: number, p: Complex) =>
    setSt((prev) => {
      const next = prev.points.map((q, k) => (k === i ? p : q))
      const carried = trackThroughPoints(prev.K, paramsFor(prev.K), next, prev.solutions)
      if (carried.every((s): s is PlanarPHSubsetSolution => s !== null)) {
        return { ...prev, points: next, solutions: carried }
      }
      const r = solveThroughPoints(prev.K, paramsFor(prev.K), next)
      if (!r.solutions.length) return prev
      return { ...prev, points: next, solutions: r.solutions, selected: 0 }
    })

  const handlers = (vp: Viewport) => ({
    onDown: (i: number) => (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      setDragIdx(i)
    },
    onMove: (e: React.PointerEvent) => {
      if (dragIdx === null) return
      const w = vp.toWorld(e)
      moveTo(dragIdx, { re: w.x, im: w.y })
    },
    onUp: () => setDragIdx(null),
  })

  const DataPoints = ({ vp, onDown }: { vp: Viewport; onDown: (i: number) => (e: React.PointerEvent) => void }) => (
    <>
      {points.map((p, i) => (
        <DataPoint key={i} vp={vp} p={p} dragging={dragIdx === i} onPointerDown={onDown(i)} />
      ))}
    </>
  )

  const dof = 2 * K + 2
  const world = WORLDS[K]

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      <FigureFrame
        world={world}
        base={BASE}
        notation={[`degree ${K} Bézier`, `${dof} DOF, ${dof} conditions`, 'LINEAR ⇒ 1']}
        readouts={[{ label: 'solutions', value: '1' }]}
        caption={<><b>Ordinary Bézier.</b> One curve, at every degree.</>}
      >
        {(vp) => {
          const h = handlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />
              <ControlPolygon vp={vp} cps={bezierCps} />
              {bezierCps.slice(1, -1).map((p, k) => <DerivedPoint key={k} vp={vp} p={p} />)}
              <path d={pathOf(vp, bezierCps)} {...curveStroke(vp, true)} />
              <DataPoints vp={vp} onDown={h.onDown} />
            </g>
          )
        }}
      </FigureFrame>

      <FigureFrame
        world={world}
        base={BASE}
        notation={[
          `planar PH degree ${degreeOf(K)}`,
          `${dof} DOF, ${dof} conditions`,
          `QUADRATIC ⇒ ${2 ** (K - 1)}`,
        ]}
        readouts={[
          { label: 'solutions', value: String(solutions.length) },
          { label: 'arc len', value: sel ? sel.arcLength.toFixed(3) : '—' },
        ]}
        controls={
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            {KS.map((k) => (
              <button
                key={k}
                onClick={() => { setSt(freshState(k)); setDragIdx(null) }}
                className={`px-2 py-[0.15em] ${k === K ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
              >
                {degreeOf(k)}
              </button>
            ))}
          </span>
        }
        caption={
          <>
            <b>Planar PH.</b> {2 ** (K - 1)} curves through the same {K + 1} points, with the same{' '}
            {dof} degrees of freedom. The equations are quadratic.{' '}
            <span className="text-slate-400">Click a curve to select it.</span>
          </>
        }
      >
        {(vp) => {
          const h = handlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

              {solutions.map((s, i) =>
                i === selected ? null : (
                  <g key={`u${i}`}>
                    <path d={pathOf(vp, s.controlPoints)} {...curveStroke(vp, false)} />
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

              {sel && (
                <>
                  <ControlPolygon vp={vp} cps={sel.controlPoints} />
                  {sel.controlPoints.slice(1, -1).map((p, k) => <DerivedPoint key={k} vp={vp} p={p} />)}
                  <path d={pathOf(vp, sel.controlPoints)} {...curveStroke(vp, true)} />
                </>
              )}

              <DataPoints vp={vp} onDown={h.onDown} />
            </g>
          )
        }}
      </FigureFrame>
    </div>
  )
}
