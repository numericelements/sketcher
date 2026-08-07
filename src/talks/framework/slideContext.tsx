// ============================================================================
// Which slide am I, and which slide is showing — so heavy content can be mounted
// only when it is needed.
//
// WHY THIS EXISTS. RevealPresentation renders EVERY slide into the DOM at once and
// lets reveal show/hide them with CSS. That is fine for SVG, which is why the
// cs2026 deck never needed this. It is NOT fine for WebGL: browsers cap live
// contexts at roughly 8–16 and silently kill the oldest past that, so a deck with
// many 3D figures shows blank canvases — and it works with two figures in
// development and breaks later, which is the worst way for a bug to behave.
//
// So `WhenActive` mounts its children only near the showing slide. Note the
// deliberate asymmetry: the SVG figures are NOT wrapped, because unmounting them
// would throw away a viewer's dragging for no benefit. Only the WebGL ones are.
// ============================================================================
import { createContext, useContext, type ReactNode } from 'react'

/** The index of the slide this subtree belongs to. */
const SlideIndexContext = createContext<number | null>(null)
/** The index reveal is currently showing; null when not inside a deck. */
const ActiveSlideContext = createContext<number | null>(null)

export function SlideIndexProvider({ index, children }: { index: number; children: ReactNode }) {
  return <SlideIndexContext.Provider value={index}>{children}</SlideIndexContext.Provider>
}

export function ActiveSlideProvider({ index, children }: { index: number | null; children: ReactNode }) {
  return <ActiveSlideContext.Provider value={index}>{children}</ActiveSlideContext.Provider>
}

export interface WhenActiveProps {
  /**
   * How many slides either side also count as "active". 1 by default, so a figure
   * is already mounted while reveal transitions onto it rather than popping in.
   */
  neighbours?: number
  /** Shown while unmounted — a caption or a still, if the gap would be jarring. */
  placeholder?: ReactNode
  children: ReactNode
}

/**
 * Mount `children` only when this slide is showing (or within `neighbours` of it).
 *
 * Outside a deck — a standalone lab page, a server render in a test — there is no
 * active index and the children always render, so wrapping a figure never makes it
 * untestable.
 */
export default function WhenActive({ neighbours = 1, placeholder, children }: WhenActiveProps) {
  const mine = useContext(SlideIndexContext)
  const active = useContext(ActiveSlideContext)
  if (mine === null || active === null) return <>{children}</>
  return Math.abs(mine - active) <= neighbours ? <>{children}</> : <>{placeholder ?? null}</>
}
