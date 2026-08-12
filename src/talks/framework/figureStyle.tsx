// ============================================================================
// Shared figure style — the deck's palette and the handful of marks every figure
// draws, so consistency is structural rather than a matter of me matching hex
// codes by hand.
//
// The palette is the cs2026 deck's, which currently lives copy-pasted in all five
// of its demos (ExtremumSlidingDemo, OvalDemo, ComplexRationalDemo,
// ExtremaFusionDemo, WithoutSlidingDemo). Those are NOT migrated onto this module
// yet — that touches a finished deck and is Eric's call. When they are, five copies
// become one and the cs2026 deck itself validates the tokens.
//
// HUES ALREADY CARRY MEANING in cs2026, so this deck must not spend them twice:
//     #1f2937  the curve (near-black)          #3b82f6  a control point you drag
//     #cbd5e1  the control polygon             #1e40af  ...while you hold it
//     #f59e0b  a CURVATURE EXTREMUM            #16a34a / #dc2626  sign of g
// This deck needs distinctions cs2026 never had — draggable vs DERIVED points,
// solution branch vs branch, pinned ends — so those are expressed by FORM
// (fill, weight, dash) rather than by inventing new hues:
//     draggable  solid blue with a white ring
//     derived    HOLLOW: white fill, grey stroke — same family, not yours to move
//     pinned     small solid slate
//     unselected curve  grey and thinner — distinguished by weight, not colour
//
// SIZES ARE IN NOMINAL PIXELS (useViewport's "base" units) and are divided by zoom
// via `vp.px`, so a control point is the same size on every figure — provided each
// figure's base width is close to its rendered width (half-slide ≈ 430,
// full-slide ≈ 900).
// ============================================================================
import type { Complex } from '../../core/complex'
import type { Viewport } from './useViewport'

export const FIG = {
  color: {
    background: '#fafafa',
    border: '#e5e7eb',
    /** The curve. Near-black, as in cs2026 — NOT blue; blue means "control point". */
    curve: '#1f2937',
    /** An alternative solution you have not selected. */
    curveMuted: '#9ca3af',
    controlPolygon: '#cbd5e1',
    /** A point you can drag. */
    dataPoint: '#3b82f6',
    dataPointDrag: '#1e40af',
    /** A point that is DETERMINED — it moves, but not by you. */
    derived: '#9ca3af',
    /** A point held fixed. */
    pinned: '#475569',
    label: '#475569',
    /** Reserved: curvature extrema (cs2026). Do not reuse for anything else. */
    extrema: '#f59e0b',
    /**
     * Where the curve passes through infinity. It has no position in space — the pole is a PARAMETER —
     * so nothing wore this colour until the tangent indicatrix gave it one: on the sphere the pole is a
     * visible cusp. Reserved for that, so the eye learns "violet = the pole showing itself".
     */
    pole: '#a855f7',
  },
  size: {
    curve: 2.5,
    curveMuted: 1.8,
    /** Invisible fat stroke that makes a curve clickable. */
    curveHit: 14,
    polygon: 1.5,
    point: 9,
    pointRing: 1.5,
    derivedRing: 2,
    pinned: 6.5,
    /** Invisible hit radius around a draggable point. */
    hit: 18,
    label: 15,
  },
} as const

/** Stroke props for a curve — selected (near-black, heavy) or not (grey, light). */
export function curveStroke(vp: Viewport, selected: boolean) {
  return {
    fill: 'none' as const,
    stroke: selected ? FIG.color.curve : FIG.color.curveMuted,
    strokeWidth: vp.px(selected ? FIG.size.curve : FIG.size.curveMuted),
  }
}

const S = (vp: Viewport, p: Complex) => vp.toScreen({ x: p.re, y: p.im })

/** The dashed grey control polygon. */
export function ControlPolygon({ vp, cps }: { vp: Viewport; cps: readonly Complex[] }) {
  return (
    <polyline
      points={cps.map((p) => { const s = S(vp, p); return `${s.x},${s.y}` }).join(' ')}
      fill="none"
      stroke={FIG.color.controlPolygon}
      strokeWidth={vp.px(FIG.size.polygon)}
      strokeDasharray={`${vp.px(4)} ${vp.px(4)}`}
    />
  )
}

interface PointProps {
  vp: Viewport
  p: Complex
  label?: string
  onPointerDown?: (e: React.PointerEvent) => void
}

/** A point you drag: solid blue, white ring, generous invisible hit area. */
export function DataPoint({ vp, p, label, dragging, onPointerDown }: PointProps & { dragging?: boolean }) {
  const s = S(vp, p)
  return (
    <g onPointerDown={onPointerDown} style={{ cursor: onPointerDown ? 'grab' : 'default' }}>
      <circle cx={s.x} cy={s.y} r={vp.px(FIG.size.hit)} fill="transparent" />
      <circle
        cx={s.x} cy={s.y} r={vp.px(FIG.size.point)}
        fill={dragging ? FIG.color.dataPointDrag : FIG.color.dataPoint}
        stroke="white" strokeWidth={vp.px(FIG.size.pointRing)}
      />
      {label && (
        <text
          x={s.x + vp.px(13)} y={s.y - vp.px(11)}
          fontSize={vp.px(FIG.size.label)} fill={FIG.color.dataPoint} fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
}

/** A point that is DETERMINED: hollow, so it reads as not-yours-to-move. */
export function DerivedPoint({ vp, p, label }: PointProps) {
  const s = S(vp, p)
  return (
    <g>
      <circle
        cx={s.x} cy={s.y} r={vp.px(FIG.size.point)}
        fill="white" stroke={FIG.color.derived} strokeWidth={vp.px(FIG.size.derivedRing)}
      />
      {label && (
        <text
          x={s.x + vp.px(13)} y={s.y - vp.px(11)}
          fontSize={vp.px(FIG.size.label)} fill={FIG.color.derived}
        >
          {label}
        </text>
      )}
    </g>
  )
}

/** A point held fixed: small and slate. */
export function PinnedPoint({ vp, p, label }: PointProps) {
  const s = S(vp, p)
  return (
    <g>
      <circle cx={s.x} cy={s.y} r={vp.px(FIG.size.pinned)} fill={FIG.color.pinned} />
      {label && (
        <text
          x={s.x + vp.px(12)} y={s.y + vp.px(22)}
          fontSize={vp.px(FIG.size.label)} fill={FIG.color.pinned}
        >
          {label}
        </text>
      )}
    </g>
  )
}
