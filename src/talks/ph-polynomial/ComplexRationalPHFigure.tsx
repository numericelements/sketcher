// ============================================================================
// THE PLANE FIRST — the complex-rational PH cubic, manipulated directly.
//
// The chart is the natural one: a complex-rational cubic IS its four control points plus
// its three Farin points, 8 + 6 = 14 real numbers, bijective because each edge's Farin
// point hands back that edge's weight ratio. PH costs 4, so the family is 10-dimensional
// and exactly FIVE of the seven points can be prescribed:
//
//     the four control points   free — NO condition falls on them        8
//     one Farin point          the handle                               2
//     the other two            DETERMINED, in exactly two ways          —
//
// Square, and it covers the whole family: the polygon is unconstrained and the handle
// sweeps the entire fibre above it. That is what the earlier version of this figure could
// not claim — it drew a polynomial cubic and a Möbius image of it, which is 9 of the 10.
//
// ONE CURVE, and that took measuring. Bézout allows 32 roots, the algebra gives 2 — but Eric
// watched an earlier version of this figure and saw that dragging Z₂ left the second branch
// dead still. A curve that will not move while its weights do has SLACK in its
// representation, and for z = P/Q that means P and Q share a factor: measured, the second
// root's P vanishes at TWO of Q's three roots, so it collapses to degree ONE — a circular
// arc, trivially PH, whose cubic representations form a 4-parameter family. So the genuine
// count is ONE, the polygon and one bead DETERMINE the curve, and the second root is filtered
// out in the core rather than drawn as a peer of the first.
//
// THE POLYGON IS DRAWN AS CIRCULAR ARCS, through (Zₖ, qₖ, Zₖ₊₁), and that is not decoration.
// Möbius maps send lines to circles, so a straight-edge polygon is not Möbius-covariant
// while an arc polygon is — and the Farin point is exactly the Möbius image of the straight
// edge's MIDPOINT, so the arc through the three is exactly the image of the edge. Eric saw
// this before the algebra did.
//
// NOT DRAWN any more: the polynomial curve it could have come from. Most of these curves
// did not come from one — that is the whole point of the slide.
// ============================================================================
import { useMemo, useState } from 'react'
import { type Complex, cnorm } from '../../core/complex'
import {
  type ComplexRationalPHCubic,
  type FarinHandle,
  curveAt,
  denominatorFloor,
  farinPoints,
  reducibility,
  solveIrreducibleFromFarin,
  speedAt,
  trackFromFarin,
} from '../../core/complexRationalPHCubic'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, DataPoint, DerivedPoint } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const START_Z: Complex[] = [
  { re: -1.9, im: -0.6 },
  { re: -1.2, im: 1.0 },
  { re: 0.4, im: 1.1 },
  { re: 1.1, im: -0.6 },
]
const START_FARIN: Complex = { re: -1.55, im: 0.2 }

const WORLD = { x0: -3.0, x1: 2.6, y0: -1.6, y1: 2.0 }
const BASE = { width: 900, height: 420 }

const pathOf = (vp: Viewport, at: (t: number) => Complex | null, n = 240): string => {
  let d = ''
  let broke = true
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    if (!p || !Number.isFinite(p.re) || !Number.isFinite(p.im) || cnorm(p) > 1e4) { broke = true; continue }
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${broke ? 'M' : 'L'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
    broke = false
  }
  return d
}

/**
 * The circular arc through three points, sampled. Sampling rather than an SVG `A` command on
 * purpose: the flag arithmetic for large-arc and sweep is easy to get subtly wrong, and a
 * near-collinear triple has to degrade to a straight line, which sampling does for free.
 */
function arcPath(vp: Viewport, p0: Complex, p1: Complex, p2: Complex): string {
  const ax = p1.re - p0.re, ay = p1.im - p0.im
  const bx = p2.re - p0.re, by = p2.im - p0.im
  const cross = ax * by - ay * bx
  const la = ax * ax + ay * ay, lb = bx * bx + by * by
  const straight = (): string => {
    const a = vp.toScreen({ x: p0.re, y: p0.im })
    const b = vp.toScreen({ x: p2.re, y: p2.im })
    return `M ${a.x.toFixed(3)} ${a.y.toFixed(3)} L ${b.x.toFixed(3)} ${b.y.toFixed(3)}`
  }
  if (Math.abs(cross) < 1e-9 * Math.max(la, lb, 1e-12)) return straight()
  const ox = p0.re + (by * la - ay * lb) / (2 * cross)
  const oy = p0.im + (ax * lb - bx * la) / (2 * cross)
  const r = Math.hypot(p0.re - ox, p0.im - oy)
  if (!Number.isFinite(r) || r > 1e5) return straight()
  const ang = (p: Complex): number => Math.atan2(p.im - oy, p.re - ox)
  const t0 = ang(p0)
  // Unwrap so the sweep passes THROUGH p1 on its way to p2 — the arc the Farin point selects.
  const unwrap = (a: number, ref: number, dir: number): number => {
    let x = a
    while (dir > 0 && x < ref) x += 2 * Math.PI
    while (dir < 0 && x > ref) x -= 2 * Math.PI
    return x
  }
  const dir = cross > 0 ? 1 : -1
  const t1 = unwrap(ang(p1), t0, dir)
  const t2 = unwrap(ang(p2), t1, dir)
  let d = ''
  const n = 48
  for (let i = 0; i <= n; i++) {
    const th = t0 + ((t2 - t0) * i) / n
    const s = vp.toScreen({ x: ox + r * Math.cos(th), y: oy + r * Math.sin(th) })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
  }
  return d
}

export default function ComplexRationalPHFigure() {
  const [Z, setZ] = useState<Complex[]>(START_Z)
  const [handle, setHandle] = useState<FarinHandle>(0)
  const [farin, setFarin] = useState<Complex>(START_FARIN)
  const [sel, setSel] = useState<ComplexRationalPHCubic | null>(() =>
    solveIrreducibleFromFarin(START_Z, 0, START_FARIN),
  )
  const [drag, setDrag] = useState<{ kind: 'cp'; i: number } | { kind: 'farin' } | null>(null)

  const beads = useMemo(() => (sel ? farinPoints(sel) : []), [sel])

  /** Follow the curve from where it was — continuity, not re-deciding it each frame. */
  const advance = (nextZ: Complex[], nextFarin: Complex, h: FarinHandle) => {
    const tracked = sel ? trackFromFarin(nextZ, h, nextFarin, sel) : null
    if (tracked) { setSel(tracked); return }
    // Lost it (a fold, or the data jumped): re-solve rather than freeze on a stale curve.
    const fresh = solveIrreducibleFromFarin(nextZ, h, nextFarin, 800)
    if (fresh) setSel(fresh)
  }

  const onMove = (vp: Viewport) => (e: React.PointerEvent) => {
    if (!drag) return
    const w = vp.toWorld(e)
    const target: Complex = { re: w.x, im: w.y }
    if (drag.kind === 'farin') {
      setFarin(target)
      advance(Z, target, handle)
    } else {
      const nextZ = Z.map((z, i) => (i === drag.i ? target : z))
      setZ(nextZ)
      advance(nextZ, farin, handle)
    }
  }

  /** Take hold of a derived bead instead. The curve does not change; only your grip. */
  const swapTo = (k: FarinHandle) => {
    const q = beads[k]
    if (!q) return
    setHandle(k)
    setFarin(q)
  }

  const reset = () => {
    setZ(START_Z)
    setHandle(0)
    setFarin(START_FARIN)
    setSel(solveIrreducibleFromFarin(START_Z, 0, START_FARIN))
  }

  const floor = sel ? denominatorFloor(sel) : 0
  const speeds = sel ? [0.1, 0.3, 0.5, 0.7, 0.9].map((t) => speedAt(sel, t)) : []

  return (
    <FigureFrame
      world={WORLD}
      base={BASE}
      notation={[
        'M = P′Q − PQ′ = A²',
        '‖z′‖ = |A|²/|Q|²',
        '4 points + 1 bead ⇒ ONE curve',
      ]}
      readouts={[
        { label: 'M − A²', value: sel ? sel.residual.toExponential(1) : '—', tone: 'ok' as const },
        {
          label: 'P, Q coprime',
          value: sel ? reducibility(sel).toExponential(1) : '—',
          tone: 'ok' as const,
        },
        {
          label: 'min |Q|',
          value: sel ? floor.toFixed(3) : '—',
          tone: floor < 0.05 ? ('warn' as const) : ('plain' as const),
        },
        {
          label: '‖z′‖ range',
          value: speeds.length ? `${Math.min(...speeds).toFixed(2)}–${Math.max(...speeds).toFixed(2)}` : '—',
        },
      ]}
      controls={
        <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
          reset
        </button>
      }
      caption={
        <>
          <b>The plane, first.</b> A complex-rational cubic <i>is</i> its four control points and its three
          Farin beads — and the beads carry complex weights, so they sit off their edges. Every polygon
          admits PH weights, so all four points are free; then one bead is yours and the other two are
          determined — and the polygon plus that one bead <i>determine the curve</i>. The arcs are the honest
          control structure: Möbius sends lines to circles, and each bead is the image of its edge's
          midpoint.{' '}
          <span className="text-slate-400">
            Drag anything solid; click a hollow bead to hold it instead.
          </span>
        </>
      }
    >
      {(vp) => (
        <g onPointerMove={onMove(vp)} onPointerUp={() => setDrag(null)}>
          <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

          {sel && (
            <>
              {/* the arc polygon: each arc passes through its bead */}
              {[0, 1, 2].map((k) => {
                const q = beads[k]
                return (
                  <path
                    key={k}
                    d={q ? arcPath(vp, Z[k], q, Z[k + 1]) : ''}
                    fill="none"
                    stroke={FIG.color.controlPolygon}
                    strokeWidth={vp.px(FIG.size.polygon)}
                  />
                )
              })}

              <path d={pathOf(vp, (t) => curveAt(sel, t))} {...curveStroke(vp, true)} />

              {/* the two derived beads — hollow, and pressing one takes hold of it */}
              {[0, 1, 2].map((k) => {
                const q = beads[k]
                if (!q || k === handle) return null
                const s = vp.toScreen({ x: q.re, y: q.im })
                return (
                  <g
                    key={`d${k}`}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                      swapTo(k as FarinHandle)
                      setDrag({ kind: 'farin' })
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <circle cx={s.x} cy={s.y} r={vp.px(FIG.size.hit)} fill="transparent" />
                    <DerivedPoint vp={vp} p={q} label={`q${'₀₁₂'[k]}`} />
                  </g>
                )
              })}

              {Z.map((p, i) => (
                <DataPoint
                  key={i}
                  vp={vp}
                  p={p}
                  label={`Z${'₀₁₂₃'[i]}`}
                  dragging={drag?.kind === 'cp' && drag.i === i}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                    setDrag({ kind: 'cp', i })
                  }}
                />
              ))}

              {beads[handle] && (
                <DataPoint
                  vp={vp}
                  p={beads[handle] as Complex}
                  label={`q${'₀₁₂'[handle]}`}
                  dragging={drag?.kind === 'farin'}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                    setDrag({ kind: 'farin' })
                  }}
                />
              )}
            </>
          )}

          {!sel && (
            <text
              x={vp.base.width / 2} y={vp.base.height / 2}
              textAnchor="middle" fontSize={vp.px(FIG.size.label)} fill={FIG.color.label}
            >
              no PH weights for this bead — move it
            </text>
          )}
        </g>
      )}
    </FigureFrame>
  )
}
