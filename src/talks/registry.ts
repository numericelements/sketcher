// ============================================================================
// The presentations registry — the one place a talk is declared.
//
// `/talks/:slug` (src/pages/Talk.tsx) and the index (src/pages/Talks.tsx) both
// read from here, so adding a deck means adding one entry and nothing else.
//
// SLIDES ARE LOADED ON DEMAND, and that is a performance fix rather than a style. Importing the six
// decks statically put every figure, three.js/drei and the core mathematics into one chunk that the
// INDEX page had to parse before painting — measured at 1.15 MB. Each entry now carries a `load()`
// instead, so the index costs titles and a deck costs itself.
// Before this existed, Talk.tsx imported the cs2026 slides directly and ignored
// the :slug segment entirely.
// ============================================================================
import type { TalkDefinition } from './framework/types'

export const talks: TalkDefinition[] = [
  {
    slug: 'cs2026',
    title: 'Interactive Control of Curvature Extrema and Inflections on B-Spline Curves',
    subtitle: 'Curves & Surfaces 2026 — St-Malo, France',
    pdfUrl: '/talks/cs2026.pdf',
    load: () => import('./cs2026/slides').then((m) => m.slides),
  },
  {
    // One deck per act (2026-08-24): ph-interpolation split into this and ph-rational.
    slug: 'ph-polynomial',
    title: 'Pythagorean–Hodograph Curves — Polynomial',
    subtitle: 'Solution structure and interactive control',
    load: () => import('./ph-polynomial/slides').then((m) => m.slides),
  },
  {
    slug: 'ph-rational',
    unlisted: true,
    title: 'Pythagorean–Hodograph Curves — Rational',
    subtitle: 'Two representations, and the pole between them',
    load: () => import('./ph-rational/slides').then((m) => m.slides),
  },
  {
    // The parking lot from the original ph-interpolation deck — slides graduate into
    // ph-polynomial or ph-rational, whichever owns them. Figures import from ph-polynomial/.
    slug: 'ph-interpolation-wip',
    title: 'Pythagorean–Hodograph Curves — work in progress',
    subtitle: 'The parked slides: rational twice, the gap, what is open',
    unlisted: true,
    load: () => import('./ph-interpolation-wip/slides').then((m) => m.slides),
  },
  {
    slug: 'hodograph-light-cone',
    unlisted: true,
    title: 'The Hodograph Lies on the Light Cone',
    subtitle: 'Speed as a coordinate — the theory behind the figures',
    load: () => import('./hodograph-light-cone/slides').then((m) => m.slides),
  },
  {
    slug: 'two-points-or-a-circle',
    unlisted: true,
    title: 'Two Points or a Circle',
    subtitle: 'What changes when a Pythagorean-hodograph curve leaves the plane',
    load: () => import('./two-points-or-a-circle/slides').then((m) => m.slides),
  },
  {
    slug: 'price-of-a-circle',
    unlisted: true,
    title: 'The Price of a Circle',
    subtitle: 'What rationality buys in Pythagorean-hodograph curves, and what it charges',
    load: () => import('./price-of-a-circle/slides').then((m) => m.slides),
  },
  {
    slug: 'inside-the-chart',
    unlisted: true,
    title: 'Inside the Chart',
    subtitle: 'What the space of rational Pythagorean-hodograph curves feels like from within',
    load: () => import('./inside-the-chart/slides').then((m) => m.slides),
  },
]

export const findTalk = (slug: string | undefined): TalkDefinition | undefined =>
  talks.find((t) => t.slug === slug)
