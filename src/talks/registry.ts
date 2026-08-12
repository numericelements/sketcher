// ============================================================================
// The presentations registry — the one place a talk is declared.
//
// `/talks/:slug` (src/pages/Talk.tsx) and the index (src/pages/Talks.tsx) both
// read from here, so adding a deck means adding one entry and nothing else.
// Before this existed, Talk.tsx imported the cs2026 slides directly and ignored
// the :slug segment entirely.
// ============================================================================
import type { TalkDefinition } from './framework/types'
import { slides as cs2026Slides } from './cs2026/slides'
import { slides as phInterpolationSlides } from './ph-interpolation/slides'
import { slides as hodographLightConeSlides } from './hodograph-light-cone/slides'
import { slides as twoPointsOrACircleSlides } from './two-points-or-a-circle/slides'

export const talks: TalkDefinition[] = [
  {
    slug: 'cs2026',
    title: 'Interactive Control of Curvature Extrema and Inflections on B-Spline Curves',
    subtitle: 'Curves & Surfaces 2026 — St-Malo, France',
    pdfUrl: '/talks/cs2026.pdf',
    slides: cs2026Slides,
  },
  {
    slug: 'ph-interpolation',
    title: 'Pythagorean–Hodograph Curves and Their Rational Frames',
    subtitle: 'Solution structure, selection, and interactive motion',
    slides: phInterpolationSlides,
  },
  {
    slug: 'hodograph-light-cone',
    title: 'The Hodograph Lies on the Light Cone',
    subtitle: 'Speed as a coordinate — the theory behind the figures',
    slides: hodographLightConeSlides,
  },
  {
    slug: 'two-points-or-a-circle',
    title: 'Two Points or a Circle',
    subtitle: 'What changes when a Pythagorean-hodograph curve leaves the plane',
    slides: twoPointsOrACircleSlides,
  },
]

export const findTalk = (slug: string | undefined): TalkDefinition | undefined =>
  talks.find((t) => t.slug === slug)
