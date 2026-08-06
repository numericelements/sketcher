// ============================================================================
// A zoom/pan viewport for SVG figures.
//
// The SVG's own viewBox does the transform, so screen→world is just the inverse
// CTM (no hand-rolled matrix math). World y points UP, viewBox y points down, so
// drawing negates y — `toScreen` and `toWorld` are the only places that knows it.
//
// Two things that matter for a figure and are easy to get wrong:
//   * wheel zoom keeps the world point UNDER THE CURSOR fixed;
//   * `px()` converts a pixel size to viewBox units by dividing by the zoom, so
//     handles stay the same apparent size (and stay grabbable) at any zoom.
//
// DEBT, recorded rather than hidden: src/sketcher/components/SketcherCanvas.tsx
// (~:249–370) already has an equivalent implementation — exponential wheel zoom
// toward the cursor, pan, screenToCanvas, hit radii divided by zoom. This hook is
// a second one, written standalone so the deck could start; SketcherCanvas should
// be migrated onto it, at which point the sketcher itself validates the hook.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'

export interface WorldBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Viewport {
  /** Bind to the <svg> element. */
  svgRef: React.RefObject<SVGSVGElement | null>
  /** viewBox attribute string. */
  viewBox: string
  /** Zoom factor; 1 = the initial world box exactly fits. */
  zoom: number
  /** World point → viewBox coordinates (negates y). */
  toScreen: (p: { x: number; y: number }) => { x: number; y: number }
  /** Pointer event → world coordinates. */
  toWorld: (e: { clientX: number; clientY: number }) => { x: number; y: number }
  /** A pixel length in viewBox units — constant apparent size under zoom. */
  px: (n: number) => number
  /** Attach to the <svg>: starts a background pan. */
  onPanStart: (e: React.PointerEvent) => void
  onPanMove: (e: React.PointerEvent) => void
  onPanEnd: () => void
  reset: () => void
  /** True while the background is being dragged (so figures can suppress hover). */
  panning: boolean
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 40

/**
 * @param world the initial world box (fits the viewport at zoom 1)
 * @param aspect viewBox height / width; the world box's own aspect by default
 */
export function useViewport(world: WorldBox, aspect?: number): Viewport {
  const baseW = world.x1 - world.x0
  const baseH = aspect !== undefined ? baseW * aspect : world.y1 - world.y0

  // Centre is stored in viewBox coordinates (y already negated).
  const initial = { cx: (world.x0 + world.x1) / 2, cy: -(world.y0 + world.y1) / 2, zoom: 1 }
  const [view, setView] = useState(initial)
  const [panning, setPanning] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panFrom = useRef<{ x: number; y: number } | null>(null)

  const w = baseW / view.zoom
  const h = baseH / view.zoom
  const viewBox = `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`

  /** Pointer → viewBox coordinates, via the SVG's inverse CTM. */
  const toViewBox = useCallback((e: { clientX: number; clientY: number }) => {
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

  const toScreen = useCallback((p: { x: number; y: number }) => ({ x: p.x, y: -p.y }), [])
  const toWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const v = toViewBox(e)
      return { x: v.x, y: -v.y }
    },
    [toViewBox],
  )
  const px = useCallback((n: number) => n / view.zoom, [view.zoom])

  // Wheel zoom toward the cursor. Registered natively because React's onWheel is
  // passive, so preventDefault there would not stop the page scrolling.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const u = toViewBox(e)
      setView((v) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.exp(-e.deltaY * 0.0015)))
        if (next === v.zoom) return v
        // Keep u fixed: offset from centre scales by zoom/next.
        const k = v.zoom / next
        return { cx: u.x - (u.x - v.cx) * k, cy: u.y - (u.y - v.cy) * k, zoom: next }
      })
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [toViewBox])

  const onPanStart = useCallback(
    (e: React.PointerEvent) => {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      panFrom.current = toViewBox(e)
      setPanning(true)
    },
    [toViewBox],
  )
  const onPanMove = useCallback(
    (e: React.PointerEvent) => {
      const from = panFrom.current
      if (!from) return
      const now = toViewBox(e)
      // toViewBox already reflects the current viewBox, so the delta is the drag.
      setView((v) => ({ ...v, cx: v.cx - (now.x - from.x), cy: v.cy - (now.y - from.y) }))
    },
    [toViewBox],
  )
  const onPanEnd = useCallback(() => {
    panFrom.current = null
    setPanning(false)
  }, [])

  const reset = useCallback(() => setView(initial), [initial.cx, initial.cy]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    svgRef,
    viewBox,
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
