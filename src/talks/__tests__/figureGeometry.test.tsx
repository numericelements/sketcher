// ============================================================================
// Figure geometry sanity — the test that would have caught the first bug.
//
// useViewport has TWO coordinate systems (world units, and "base" = nominal
// pixels for the viewBox), and the first version confused them: `px(7)` for a
// point radius returned seven WORLD units instead of seven pixels, so every
// figure rendered as one giant filled circle. Nothing in tsc or the build noticed,
// and the figures are SVG, so this is cheap to catch: render to static markup and
// look at the numbers.
//
// `toScreen` is pure arithmetic (only `toWorld` needs the live SVG's CTM), so
// server rendering produces the real geometry. This is a reason to keep figures in
// SVG wherever the picture allows — an r3f figure cannot be checked this way at
// all, headlessly.
//
// These are shape-independent invariants, not pinned pixel values, so they do not
// obstruct redesigning a figure.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ThreePointsFigure from '../ph-interpolation/ThreePointsFigure'
import PinnedEndsFigure from '../ph-interpolation/PinnedEndsFigure'

interface Geometry {
  viewBoxes: { x: number; y: number; w: number; h: number }[]
  radii: number[]
  strokeWidths: number[]
  pathCount: number
  pathCoords: number[]
}

function geometryOf(html: string): Geometry {
  const viewBoxes = [...html.matchAll(/viewBox="([^"]+)"/g)].map((m) => {
    const [x, y, w, h] = m[1].split(/\s+/).map(Number)
    return { x, y, w, h }
  })
  const radii = [...html.matchAll(/<circle[^>]*\sr="([\d.eE+-]+)"/g)].map((m) => Number(m[1]))
  const strokeWidths = [...html.matchAll(/stroke-width="([\d.eE+-]+)"/g)].map((m) => Number(m[1]))
  const paths = [...html.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  const pathCoords = paths.flatMap((d) => d.match(/-?[\d.]+/g)?.map(Number) ?? [])
  return { viewBoxes, radii, strokeWidths, pathCount: paths.length, pathCoords }
}

/**
 * The invariants. `dim` is the smaller viewBox dimension; anything sized as a
 * fraction of it that exceeds ~15% means the pixel/world confusion is back.
 */
function expectSaneGeometry(g: Geometry, label: string) {
  expect(g.viewBoxes.length, `${label}: has a viewBox`).toBeGreaterThan(0)
  for (const vb of g.viewBoxes) {
    // Nominal-pixel sized, not world sized: hundreds of units, not single digits.
    expect(vb.w, `${label}: viewBox width is nominal pixels`).toBeGreaterThan(100)
    expect(vb.h, `${label}: viewBox height is nominal pixels`).toBeGreaterThan(100)
  }
  const dim = Math.min(...g.viewBoxes.flatMap((vb) => [vb.w, vb.h]))

  expect(g.radii.length, `${label}: draws some handles`).toBeGreaterThan(0)
  for (const r of g.radii) {
    expect(r, `${label}: handle radius is positive`).toBeGreaterThan(0)
    // A handle must be a handle, not a backdrop.
    expect(r, `${label}: handle radius ${r} is small vs viewBox ${dim}`).toBeLessThan(0.15 * dim)
  }
  for (const s of g.strokeWidths) {
    expect(s, `${label}: stroke width ${s} is small vs viewBox ${dim}`).toBeLessThan(0.05 * dim)
  }

  expect(g.pathCoords.length, `${label}: draws some curves`).toBeGreaterThan(0)
  const maxAbs = Math.max(...g.pathCoords.map(Math.abs))
  const span = Math.max(...g.viewBoxes.flatMap((vb) => [vb.w, vb.h]))
  // Curves live near the viewBox, not many multiples away from it.
  expect(maxAbs, `${label}: path coords near the viewBox`).toBeLessThan(6 * span)
}

describe('talk figures render with sane geometry', () => {
  it('slide 3 — three points: two panels, 1 + 2 curves', () => {
    const g = geometryOf(renderToStaticMarkup(<ThreePointsFigure />))
    expectSaneGeometry(g, 'ThreePointsFigure')
    // Two panels, each with its own viewBox, both the same declared base size.
    expect(g.viewBoxes).toHaveLength(2)
    expect(g.viewBoxes[0]).toEqual(g.viewBoxes[1])
    // One quadratic on the left, TWO PH branches on the right — the slide's point.
    expect(g.pathCount).toBe(3)
    // Three shared data points, each with a hit circle plus a visible dot, twice.
    expect(g.radii).toHaveLength(12)
  })

  it('slide 4 — pinned ends: one panel, the branch point and both ends drawn', () => {
    const g = geometryOf(renderToStaticMarkup(<PinnedEndsFigure />))
    expectSaneGeometry(g, 'PinnedEndsFigure')
    expect(g.viewBoxes).toHaveLength(1)
    // Selected branch + the other branch.
    expect(g.pathCount).toBe(2)
    // branch point, P₂, P₀, P₃, P₁ hit area, P₁.
    expect(g.radii).toHaveLength(6)
  })

  it('handles are ~7px and strokes ~1–3px at zoom 1 (the units are pixels)', () => {
    for (const [label, html] of [
      ['ThreePointsFigure', renderToStaticMarkup(<ThreePointsFigure />)],
      ['PinnedEndsFigure', renderToStaticMarkup(<PinnedEndsFigure />)],
    ] as const) {
      const g = geometryOf(html)
      const visible = g.radii.filter((r) => r < 12) // exclude the invisible hit areas
      for (const r of visible) {
        expect(r, `${label}: visible handle radius`).toBeGreaterThanOrEqual(4)
        expect(r, `${label}: visible handle radius`).toBeLessThanOrEqual(10)
      }
      for (const s of g.strokeWidths) {
        expect(s, `${label}: stroke width`).toBeGreaterThan(0.5)
        expect(s, `${label}: stroke width`).toBeLessThan(8)
      }
    }
  })
})
