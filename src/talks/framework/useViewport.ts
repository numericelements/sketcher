// ============================================================================
// A zoom/pan viewport for SVG figures.
//
// COORDINATE SYSTEMS — the thing to get right, and the thing I got wrong first:
//
//   world  — the figure's own units (a PH curve living in a box a few units wide)
//   base   — NOMINAL PIXELS. The viewBox lives here, so `base` is what stroke
//            widths, radii and font sizes are expressed in. Same convention as the
//            existing cs2026 / LabTHB figures (viewBox ~900×380).
//
// `toScreen` maps world → base with a single uniform scale that fits the world box
// (letterboxed, y flipped since world y is up and SVG y is down). Zoom and pan then
// move the viewBox around inside base coordinates, so:
//
//   * `px(n)` = n / zoom is CORRECT — one base unit is one nominal pixel, so a
//     radius of px(7) is ~7 screen pixels and stays that size as you zoom.
//   * screen → world is just the inverse CTM followed by the inverse fit.
//
// The first version made the viewBox *world*-sized, which made px(7) mean seven
// WORLD units — a point handle covering the entire figure.
//
// DEBT, recorded rather than hidden: src/sketcher/components/SketcherCanvas.tsx
// (~:249–370) already has an equivalent implementation — exponential wheel zoom
// toward the cursor, pan, screenToCanvas, hit radii divided by zoom. This hook is
// a second one, written standalone so the deck could start; SketcherCanvas should
// be migrated onto it, at which point the sketcher itself validates the hook.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface WorldBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** The nominal pixel size of the viewBox — the units radii and strokes are in. */
export interface BaseSize {
  width: number
  height: number
}

export interface Viewport {
  svgRef: React.RefObject<SVGSVGElement | null>
  viewBox: string
  /** Nominal pixel size of the viewBox (before zoom). */
  base: BaseSize
  zoom: number
  /** World → base (nominal pixel) coordinates. */
  toScreen: (p: { x: number; y: number }) => { x: number; y: number }
  /** Pointer event → world coordinates. */
  toWorld: (e: { clientX: number; clientY: number }) => { x: number; y: number }
  /** A size in nominal pixels, held constant on screen as zoom changes. */
  px: (n: number) => number
  onPanStart: (e: React.PointerEvent) => void
  onPanMove: (e: React.PointerEvent) => void
  onPanEnd: () => void
  reset: () => void
  panning: boolean
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 40

export function useViewport(world: WorldBox, base: BaseSize): Viewport {
  // Uniform fit of the world box into base, letterboxed.
  const fit = useMemo(() => {
    const ww = world.x1 - world.x0
    const wh = world.y1 - world.y0
    const k = Math.min(base.width / ww, base.height / wh)
    return { k, wcx: (world.x0 + world.x1) / 2, wcy: (world.y0 + world.y1) / 2 }
  }, [world.x0, world.x1, world.y0, world.y1, base.width, base.height])

  const initial = useMemo(
    () => ({ cx: base.width / 2, cy: base.height / 2, zoom: 1 }),
    [base.width, base.height],
  )
  const [view, setView] = useState(initial)
  const [panning, setPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panFrom = useRef<{ x: number; y: number } | null>(null)

  const w = base.width / view.zoom
  const h = base.height / view.zoom
  const viewBox = `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`

  const toScreen = useCallback(
    (p: { x: number; y: number }) => ({
      x: base.width / 2 + (p.x - fit.wcx) * fit.k,
      y: base.height / 2 - (p.y - fit.wcy) * fit.k,
    }),
    [base.width, base.height, fit],
  )

  /** Pointer → base coordinates, via the SVG's inverse CTM. */
  const toBase = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }, [])

  const toWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const b = toBase(e)
      return {
        x: fit.wcx + (b.x - base.width / 2) / fit.k,
        y: fit.wcy - (b.y - base.height / 2) / fit.k,
      }
    },
    [toBase, fit, base.width, base.height],
  )

  const px = useCallback((n: number) => n / view.zoom, [view.zoom])

  // Wheel zoom toward the cursor. Registered natively because React's onWheel is
  // passive, so preventDefault there would not stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const u = toBase(e)
      setView((v) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.exp(-e.deltaY * 0.0015)))
        if (next === v.zoom) return v
        const k = v.zoom / next // keep u fixed
        return { cx: u.x - (u.x - v.cx) * k, cy: u.y - (u.y - v.cy) * k, zoom: next }
      })
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [toBase])

  const onPanStart = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      panFrom.current = toBase(e)
      setPanning(true)
    },
    [toBase],
  )
  const onPanMove = useCallback(
    (e: React.PointerEvent) => {
      const from = panFrom.current
      if (!from) return
      const now = toBase(e)
      setView((v) => ({ ...v, cx: v.cx - (now.x - from.x), cy: v.cy - (now.y - from.y) }))
    },
    [toBase],
  )
  const onPanEnd = useCallback(() => {
    panFrom.current = null
    setPanning(false)
  }, [])

  const reset = useCallback(() => setView(initial), [initial])

  return {
    svgRef,
    viewBox,
    base,
    zoom: view.zoom,
    toScreen,
    toWorld,
    px,
    onPanStart,
    onPanMove,
    onPanEnd,
    reset,
    panning,
  }
}
