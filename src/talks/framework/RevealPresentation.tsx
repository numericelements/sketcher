import { useEffect, useState } from 'react'
import { useReveal } from './useReveal'
import { ActiveSlideProvider, SlideIndexProvider } from './slideContext'
import { setCurrentSlideIndex } from './slideNav'
import './reveal-overrides.css'
import type { SlideDefinition } from './types'

/**
 * Renders a deck with reveal.js and the white theme (exactly the sketcher's
 * look, via reveal-overrides.css). Slim version: title/content slides only —
 * the cs2026 demos are embedded inside `content`, so there's no sketcher-canvas
 * overlay coupling here.
 */
export default function RevealPresentation({ slides }: { slides: SlideDefinition[] }) {
  // Keep the shared slide index current so a slide's WorkbenchLink can build a
  // ?slide=N return URL to the exact slide it launched from.
  // Tracked so `WhenActive` can keep heavy (WebGL) figures unmounted off-slide —
  // reveal renders every slide into the DOM at once, which SVG tolerates and
  // WebGL does not (see framework/slideContext).
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const { containerRef, deckRef } = useReveal({
    onSlideChange: (i) => {
      setCurrentSlideIndex(i)
      setActiveIndex(i)
    },
  })

  // Return-from-workbench: a ?slide=N query (set by the "Back to presentation"
  // button on a linked page) jumps the deck to that slide on load. Reveal has
  // hash/history off, so without this it would always open at slide 0.
  useEffect(() => {
    const n = parseInt(new URLSearchParams(window.location.search).get('slide') ?? '', 10)
    if (!Number.isFinite(n) || n <= 0) return
    let tries = 0
    const id = setInterval(() => {
      const deck = deckRef.current
      if (deck) {
        deck.slide(n)
        clearInterval(id)
      } else if (++tries > 40) {
        clearInterval(id) // give up after ~2s
      }
    }, 50)
    return () => clearInterval(id)
  }, [deckRef])

  return (
    <ActiveSlideProvider index={activeIndex}>
    <div data-theme="light" className="fixed inset-0 z-50 bg-white" style={{ colorScheme: 'light' }}>
      <div ref={containerRef} className="reveal-container">
        <div className="reveal">
          <div className="slides">
            {slides.map((slide, i) => (
              <section key={i} className={slide.type === 'title' ? 'title-slide' : ''}>
                <SlideIndexProvider index={i}>{slide.content}</SlideIndexProvider>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
    </ActiveSlideProvider>
  )
}
