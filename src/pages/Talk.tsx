import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import RevealPresentation from '../talks/framework/RevealPresentation'
import { findTalk } from '../talks/registry'
import { isPhone } from '../lib/device'

// Canonical presentations URL — used for the PDF export's back-link (see below).
const PRESENTATIONS_URL = 'https://numericelements.com/talks'
const BACK_LINK_CLASS = 'fixed top-3 left-4 z-[60] text-slate-400 hover:text-slate-700 text-sm tracking-wide'

/**
 * A presentation, rendered with reveal.js (white theme) — the exact deck look.
 * The deck is looked up by :slug in src/talks/registry.ts; an unknown slug falls
 * back to the index.
 */
export default function Talk() {
  const { slug } = useParams<{ slug: string }>()
  const talk = findTalk(slug)

  // ?interactive marks the PDF export (decktape) and the phone live-deck demo.
  // In that mode the page is served from a throwaway origin (localhost while the
  // PDF is generated), so a react-router relative link would bake a localhost URL
  // into the PDF. Use the canonical absolute URL there; keep the SPA link live.
  const interactive = new URLSearchParams(window.location.search).has('interactive')
  const pdfUrl = talk?.pdfUrl

  useEffect(() => {
    if (interactive) return // bypass the phone→PDF redirect
    // Only redirect when the deck actually HAS a PDF export; otherwise phones get
    // the live deck (better than a 404).
    if (pdfUrl && isPhone()) window.location.replace(pdfUrl)
  }, [interactive, pdfUrl])

  if (!talk) return <Navigate to="/talks" replace />

  return (
    <>
      {interactive ? (
        <a href={PRESENTATIONS_URL} className={BACK_LINK_CLASS}>← Presentations</a>
      ) : (
        <Link to="/talks" className={BACK_LINK_CLASS}>← Presentations</Link>
      )}
      <RevealPresentation slides={talk.slides} />
    </>
  )
}
