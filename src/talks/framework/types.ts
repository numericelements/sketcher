import type { ReactNode } from 'react'

/**
 * A presentation slide. The cs2026 deck embeds its interactive demos directly
 * inside `content` (no separate sketcher-canvas overlay), so we only need
 * 'title' and 'content' here.
 */
export interface SlideDefinition {
  type: 'title' | 'content'
  content: ReactNode
  notes?: string
}

export interface TalkDefinition {
  /** URL segment: /talks/<slug>. */
  slug: string
  title: string
  /** Venue, or a one-line descriptor for decks without one. Shown on the index. */
  subtitle?: string
  /** Static PDF export, if one exists — phones are redirected to it. */
  pdfUrl?: string
  /**
   * The deck's slides, fetched ON DEMAND. Deliberately a loader and not an array: the registry is
   * imported by the presentations INDEX, and a static `slides` field made that page pull in every
   * deck — hence every figure, three.js, drei and the core mathematics behind them — into one 1.15 MB
   * chunk before anything could paint. With a loader the index carries titles only and opening a deck
   * fetches that deck alone.
   */
  load: () => Promise<SlideDefinition[]>
}
