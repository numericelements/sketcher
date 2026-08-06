// ============================================================================
// SLIDE 3 — the price of PH, in one comparison.
//
// A quadratic Bézier and a planar PH cubic have the SAME 6 real degrees of
// freedom, and three interpolation points impose the SAME 6 real conditions. Both
// systems are square. The only difference is that the quadratic's equations are
// LINEAR and the PH cubic's are QUADRATIC — so one gives a unique curve and the
// other gives two.
//
// The three points are shared: drag one in either panel and both update.
//
// BRANCH IDENTITY. The two PH solutions are two roots of one equation, so their
// order is not canonical — and `csolveQuadratic` returns them in whichever order is
// numerically stable, which FLIPS as the data moves. That made the colours jump
// mid-drag. Fixed by CONTINUOUS TRACKING: each frame, the new roots are matched to
// the previous pair by nearest r (two pairings, take the cheaper), so both curves
// and all their control points move continuously. The initial pick is the shorter
// curve, by arc length — deterministic, and the visually sensible one.
//
// Both sides are closed form (Lagrange on the left, one complex quadratic in
// r = w₁/w₀ on the right). No optimizer.
// ============================================================================
import { useState } from 'react'
import { type Complex, cadd, csub, cscale, cnorm } from '../../core/complex'
import { phCubicThroughThreePoints, curveAt, type PHCubicSolution } from '../../core/phCubic'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, DerivedPoint, DataPoint, ControlPolygon } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const T1 = 0.5 // the interior point's parameter

const START: Complex[] = [
  { re: -2.1, im: -0.7 },
  { re: 0.3, im: 1.5 },
  { re: 2.4, im: -0.4 },
]

const WORLD = { x0: -3.4, x1: 3.4, y0: -2.4, y1: 2.6 }
/** Nominal pixels: each panel is half the slide, so a squarish box. */
const BASE = { width: 430, height: 330 }

// ---------------------------------------------------------------------------
// Left panel: the unique quadratic Bézier through the three points
// ---------------------------------------------------------------------------

/** The middle control point forced by interpolating q1 at t = T1 (Lagrange). */
function quadraticMiddle(q0: Complex, q1: Complex, q2: Complex, t1: number): Complex {
  const b = (1 - t1) * (1 - t1)
  const m = 2 * t1 * (1 - t1)
  const e = t1 * t1
  return cscale(csub(q1, cadd(cscale(q0, b), cscale(q2, e))), 1 / m)
}

const quadraticAt = (cps: readonly Complex[], t: number): Complex =>
  cadd(
    cadd(cscale(cps[0], (1 - t) * (1 - t)), cscale(cps[1], 2 * t * (1 - t))),
    cscale(cps[2], t * t),
  )

// ---------------------------------------------------------------------------
// Branch identity: continuous tracking
// ---------------------------------------------------------------------------

/** Deterministic first pick: shorter curve first. */
const canonical = (sols: PHCubicSolution[]): PHCubicSolution[] =>
  [...sols].sort((a, b) => a.arcLength - b.arcLength)

/**
 * Match this frame's roots to the previous frame's so labels (and colours) never
 * jump. With two roots there are only two pairings; take the cheaper.
 */
function tracked(sols: PHCubicSolution[], prev: readonly PHCubicSolution[]): PHCubicSolution[] {
  if (sols.length !== 2 || prev.length !== 2) return canonical(sols)
  const d = (a: PHCubicSolution, b: PHCubicSolution): number => cnorm(csub(a.r, b.r))
  const keep = d(sols[0], prev[0]) + d(sols[1], prev[1])
  const swap = d(sols[0], prev[1]) + d(sols[1], prev[0])
  return swap < keep ? [sols[1], sols[0]] : sols
}

const solveAt = (pts: readonly Complex[]): PHCubicSolution[] =>
  phCubicThroughThreePoints(pts[0], pts[1], pts[2], T1)

// ---------------------------------------------------------------------------

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 160): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
  }
  return d
}

export default function ThreePointsFigure() {
  const [state, setState] = useState(() => {
    const solutions = canonical(solveAt(START))
    return { points: START, solutions }
  })
  const [selected, setSelected] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const { points, solutions } = state
  const [q0, q1, q2] = points
  const bezierCps = [q0, quadraticMiddle(q0, q1, q2, T1), q2]

  const moveTo = (i: number, p: Complex) =>
    setState((prev) => {
      const next = prev.points.map((q, k) => (k === i ? p : q))
      return { points: next, solutions: tracked(solveAt(next), prev.solutions) }
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

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* ---- left: quadratic Bézier, one solution ---- */}
      <FigureFrame
        world={WORLD}
        base={BASE}
        notation={['degree 2 Bézier', '6 DOF, 6 conditions', 'LINEAR ⇒ 1']}
        readouts={[{ label: 'solutions', value: '1' }]}
        caption={<><b>Quadratic Bézier.</b> Unique, always.</>}
      >
        {(vp) => {
          const h = handlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />
              <ControlPolygon vp={vp} cps={bezierCps} />
              {/* the derived middle control point */}
              <DerivedPoint vp={vp} p={bezierCps[1]} />
              <path d={pathOf(vp, (t) => quadraticAt(bezierCps, t))} {...curveStroke(vp, true)} />
              <DataPoints vp={vp} onDown={h.onDown} />
            </g>
          )
        }}
      </FigureFrame>

      {/* ---- right: planar PH cubic, two solutions ---- */}
      <FigureFrame
        world={WORLD}
        base={BASE}
        notation={['planar PH cubic', '6 DOF, 6 conditions', 'QUADRATIC ⇒ 2']}
        readouts={[
          { label: 'solutions', value: String(solutions.length) },
          {
            label: 'arc len',
            value: solutions[selected] ? solutions[selected].arcLength.toFixed(3) : '—',
          },
        ]}
        caption={
          <>
            <b>Planar PH cubic.</b> Two, always — same degrees of freedom, quadratic equations.{' '}
            <span className="text-slate-400">Click a curve to select it.</span>
          </>
        }
      >
        {(vp) => {
          const h = handlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

              {/* unselected: plain grey curve, no polygon, no points */}
              {solutions.map((s, i) =>
                i === selected ? null : (
                  <g key={`u${i}`}>
                    <path d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))} {...curveStroke(vp, false)} />
                    {/* a fat invisible stroke so it is easy to click */}
                    <path
                      d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={vp.px(FIG.size.curveHit)}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setSelected(i)
                      }}
                    />
                  </g>
                ),
              )}

              {/* selected: polygon with its derived control points, then the curve */}
              {solutions[selected] && (
                <>
                  <ControlPolygon vp={vp} cps={solutions[selected].controlPoints} />
                  {solutions[selected].controlPoints.slice(1, 3).map((p, k) => (
                    <DerivedPoint key={k} vp={vp} p={p} />
                  ))}
                  <path
                    d={pathOf(vp, (t) => curveAt(solutions[selected].generator, solutions[selected].p0, t))}
                    {...curveStroke(vp, true)}
                  />
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
