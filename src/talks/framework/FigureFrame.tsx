// ============================================================================
// The chrome around an interactive figure — and nothing else.
//
// The deck's editorial rule is one gesture, one lesson, one number per figure, so
// this frame deliberately offers only: a zoom/pan SVG, a NOTATION strip (bare
// formulas, no prose — an expert reads notation faster than a sentence), a
// readout row, and a caption. There is no configuration UI here on purpose; the
// research bench with all the knobs lives at /lab/ph-interpolation.
//
// The viewport is passed to `children` as a render prop so a figure can draw in
// world coordinates and size its handles in pixels.
// ============================================================================
import type { ReactNode } from 'react'
import { useViewport, type BaseSize, type Viewport, type WorldBox } from './useViewport'
import { FIG } from './figureStyle'

/** Nominal viewBox size in pixels — radii, strokes and fonts are in these units. */
const DEFAULT_BASE: BaseSize = { width: 900, height: 380 }

export interface FigureFrameProps {
  /** Initial world box; wheel/drag zoom and pan from there. */
  world: WorldBox
  /**
   * Nominal pixel size of the drawing area. Sets the figure's aspect ratio AND
   * the units for stroke widths / radii / font sizes (see useViewport). Keep it in
   * the few-hundreds, like the existing cs2026 figures.
   */
  base?: BaseSize
  /** Bare formulas, shown in a monospace strip. No explanations. */
  notation?: readonly string[]
  /** Live numbers: [label, value]. Keep it to a handful. */
  readouts?: readonly { label: string; value: string; tone?: 'ok' | 'warn' | 'plain' }[]
  /** One sentence. The figure must prove it. */
  caption?: ReactNode
  /** Extra controls (a branch toggle, a run button) — used sparingly. */
  controls?: ReactNode
  className?: string
  children: (vp: Viewport) => ReactNode
}

const TONE: Record<string, string> = {
  ok: 'text-emerald-600',
  warn: 'text-amber-600',
  plain: 'text-slate-600',
}

export default function FigureFrame({
  world,
  base = DEFAULT_BASE,
  notation,
  readouts,
  caption,
  controls,
  className = '',
  children,
}: FigureFrameProps) {
  const vp = useViewport(world, base)

  return (
    <div className={`flex flex-col items-stretch gap-1 ${className}`}>
      {notation && notation.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[0.42em] text-slate-500">
          {notation.map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>
      )}

      <svg
        ref={vp.svgRef}
        viewBox={vp.viewBox}
        style={{ background: FIG.color.background, border: `1px solid ${FIG.color.border}` }}
        className={`w-full rounded touch-none ${vp.panning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={vp.onPanStart}
        onPointerMove={vp.onPanMove}
        onPointerUp={vp.onPanEnd}
        onPointerLeave={vp.onPanEnd}
      >
        {children(vp)}
      </svg>

      {(readouts?.length || controls) && (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[0.42em]">
          {readouts?.map((r, i) => (
            <span key={i} className={TONE[r.tone ?? 'plain']}>
              <span className="text-slate-400">{r.label} </span>
              {r.value}
            </span>
          ))}
          {controls}
        </div>
      )}

      {caption && (
        <div className="text-center text-[0.5em] leading-snug text-slate-600 max-w-[46em] mx-auto">
          {caption}
        </div>
      )}
    </div>
  )
}
