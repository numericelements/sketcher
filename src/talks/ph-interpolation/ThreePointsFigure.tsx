// ============================================================================
// SLIDE 3 — the price of PH, in one comparison.
//
// A quadratic Bézier and a planar PH cubic have the SAME 6 real degrees of
// freedom, and three interpolation points impose the SAME 6 real conditions. Both
// systems are square. The only difference is that the quadratic's equations are
// LINEAR and the PH cubic's are QUADRATIC — so one gives a unique curve and the
// other gives two.
//
// The three points are shared: drag one in either panel and both panels update,
// so the comparison is immediate.
//
// Nothing here is approximate or optimised — both sides are closed form
// (Lagrange on the left, one complex quadratic in r = w₁/w₀ on the right).
// ============================================================================
import { useState } from 'react'
import { type Complex, cadd, csub, cscale } from '../../core/complex'
import { phCubicThroughThreePoints, curveAt, type PHCubicSolution } from '../../core/phCubic'
import FigureFrame from '../framework/FigureFrame'
import type { Viewport } from '../framework/useViewport'

const T1 = 0.5 // the interior point's parameter

const START: Complex[] = [
  { re: -2.1, im: -0.7 },
  { re: 0.3, im: 1.5 },
  { re: 2.4, im: -0.4 },
]

const WORLD = { x0: -3.4, x1: 3.4, y0: -2.4, y1: 2.6 }

const COLORS = {
  point: '#dc2626',
  bezier: '#2563eb',
  ph: '#0d9488',
  phAlt: '#f59e0b',
  polygon: '#cbd5e1',
}

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

interface PanelProps {
  vp: Viewport
  points: Complex[]
  onDown: (i: number) => (e: React.PointerEvent) => void
}

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 160): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
  }
  return d
}

function Polygon({ vp, cps }: { vp: Viewport; cps: readonly Complex[] }) {
  return (
    <polyline
      points={cps.map((p) => {
        const s = vp.toScreen({ x: p.re, y: p.im })
        return `${s.x},${s.y}`
      }).join(' ')}
      fill="none"
      stroke={COLORS.polygon}
      strokeWidth={vp.px(1.2)}
      strokeDasharray={`${vp.px(4)} ${vp.px(4)}`}
    />
  )
}

function DataPoints({ vp, points, onDown }: PanelProps) {
  return (
    <>
      {points.map((p, i) => {
        const s = vp.toScreen({ x: p.re, y: p.im })
        return (
          <g key={i} onPointerDown={onDown(i)} style={{ cursor: 'grab' }}>
            <circle cx={s.x} cy={s.y} r={vp.px(16)} fill="transparent" />
            <circle cx={s.x} cy={s.y} r={vp.px(7)} fill={COLORS.point} />
          </g>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------

export default function ThreePointsFigure() {
  const [points, setPoints] = useState<Complex[]>(START)
  const drag = useState<number | null>(null)
  const [dragIdx, setDragIdx] = drag

  const [q0, q1, q2] = points
  const bezierCps = [q0, quadraticMiddle(q0, q1, q2, T1), q2]
  const phSolutions: PHCubicSolution[] = phCubicThroughThreePoints(q0, q1, q2, T1)

  const makeHandlers = (vp: Viewport) => ({
    onDown: (i: number) => (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      setDragIdx(i)
    },
    onMove: (e: React.PointerEvent) => {
      if (dragIdx === null) return
      const w = vp.toWorld(e)
      setPoints((ps) => ps.map((p, i) => (i === dragIdx ? { re: w.x, im: w.y } : p)))
    },
    onUp: () => setDragIdx(null),
  })

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* ---- left: quadratic Bézier, one solution ---- */}
      <FigureFrame
        world={WORLD}
        notation={['deg 2 Bézier', '6 DOF, 6 conditions', 'LINEAR ⇒ 1']}
        readouts={[{ label: 'solutions', value: '1', tone: 'plain' }]}
        caption={<><b>Quadratic Bézier.</b> Unique, always.</>}
      >
        {(vp) => {
          const h = makeHandlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />
              <Polygon vp={vp} cps={bezierCps} />
              <path
                d={pathOf(vp, (t) => quadraticAt(bezierCps, t))}
                fill="none"
                stroke={COLORS.bezier}
                strokeWidth={vp.px(2.6)}
              />
              <DataPoints vp={vp} points={points} onDown={h.onDown} />
            </g>
          )
        }}
      </FigureFrame>

      {/* ---- right: planar PH cubic, two solutions ---- */}
      <FigureFrame
        world={WORLD}
        notation={['planar PH cubic', '6 DOF, 6 conditions', 'QUADRATIC ⇒ 2']}
        readouts={[
          { label: 'solutions', value: String(phSolutions.length), tone: 'plain' },
          ...phSolutions.map((s, i) => ({
            label: `r${i + 1}`,
            value: `${s.r.re.toFixed(2)}${s.r.im < 0 ? '−' : '+'}${Math.abs(s.r.im).toFixed(2)}i`,
            tone: (s.cusped ? 'warn' : 'ok') as 'warn' | 'ok',
          })),
        ]}
        caption={<><b>Planar PH cubic.</b> Two, always — same count, quadratic equations.</>}
      >
        {(vp) => {
          const h = makeHandlers(vp)
          return (
            <g onPointerMove={h.onMove} onPointerUp={h.onUp}>
              <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />
              {phSolutions.map((s, i) => (
                <Polygon key={`g${i}`} vp={vp} cps={s.controlPoints} />
              ))}
              {phSolutions.map((s, i) => (
                <path
                  key={i}
                  d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))}
                  fill="none"
                  stroke={i === 0 ? COLORS.ph : COLORS.phAlt}
                  strokeWidth={vp.px(2.6)}
                  strokeDasharray={i === 0 ? undefined : `${vp.px(7)} ${vp.px(5)}`}
                />
              ))}
              <DataPoints vp={vp} points={points} onDown={h.onDown} />
            </g>
          )
        }}
      </FigureFrame>
    </div>
  )
}
