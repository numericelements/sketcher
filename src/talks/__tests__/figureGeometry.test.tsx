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
  /** Radii of circles that are actually painted. */
  visibleRadii: number[]
  /** Radii of the invisible generous hit areas around draggable points. */
  hitRadii: number[]
  /** Stroke widths of painted strokes only — NOT the fat invisible click targets. */
  visibleStrokeWidths: number[]
  /** Paths that are actually painted (a curve the viewer sees). */
  visiblePathCount: number
  pathCoords: number[]
}

/**
 * Attribute-aware, because figures deliberately contain INVISIBLE marks: a
 * generous `fill="transparent"` circle so a small handle is easy to grab, and a fat
 * `stroke="transparent"` path so a thin curve is easy to click. Those must not be
 * held to the same size limits as painted marks — the first version of this test
 * lumped them together and flagged the click target as an over-thick stroke.
 */
function geometryOf(html: string): Geometry {
  const viewBoxes = [...html.matchAll(/viewBox="([^"]+)"/g)].map((m) => {
    const [x, y, w, h] = m[1].split(/\s+/).map(Number)
    return { x, y, w, h }
  })
  const tags = (name: string): string[] =>
    [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0])
  const attr = (tag: string, a: string): string | undefined =>
    tag.match(new RegExp(`\\s${a}="([^"]*)"`))?.[1]
  const num = (tag: string, a: string): number | undefined => {
    const v = attr(tag, a)
    return v === undefined ? undefined : Number(v)
  }

  const circles = tags('circle')
  const visibleRadii: number[] = []
  const hitRadii: number[] = []
  for (const c of circles) {
    const r = num(c, 'r')
    if (r === undefined) continue
    ;(attr(c, 'fill') === 'transparent' ? hitRadii : visibleRadii).push(r)
  }

  const visibleStrokeWidths: number[] = []
  for (const t of [...circles, ...tags('path'), ...tags('polyline'), ...tags('line')]) {
    const stroke = attr(t, 'stroke')
    if (stroke === 'transparent' || stroke === 'none' || stroke === undefined) continue
    const w = num(t, 'stroke-width')
    if (w !== undefined) visibleStrokeWidths.push(w)
  }

  const paths = tags('path').filter((t) => attr(t, 'stroke') !== 'transparent')
  const pathCoords = paths.flatMap((t) => attr(t, 'd')?.match(/-?[\d.]+/g)?.map(Number) ?? [])
  return { viewBoxes, visibleRadii, hitRadii, visibleStrokeWidths, visiblePathCount: paths.length, pathCoords }
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

  expect(g.visibleRadii.length, `${label}: draws some handles`).toBeGreaterThan(0)
  for (const r of g.visibleRadii) {
    expect(r, `${label}: handle radius is positive`).toBeGreaterThan(0)
    // A handle must be a handle, not a backdrop.
    expect(r, `${label}: handle radius ${r} is small vs viewBox ${dim}`).toBeLessThan(0.15 * dim)
  }
  // Invisible hit areas may be generous, but not absurd.
  for (const r of g.hitRadii) {
    expect(r, `${label}: hit radius ${r} vs viewBox ${dim}`).toBeLessThan(0.2 * dim)
  }
  for (const s of g.visibleStrokeWidths) {
    expect(s, `${label}: stroke width ${s} is small vs viewBox ${dim}`).toBeLessThan(0.05 * dim)
  }

  expect(g.pathCoords.length, `${label}: draws some curves`).toBeGreaterThan(0)
  const maxAbs = Math.max(...g.pathCoords.map(Math.abs))
  const span = Math.max(...g.viewBoxes.flatMap((vb) => [vb.w, vb.h]))
  // Curves live near the viewBox, not many multiples away from it.
  expect(maxAbs, `${label}: path coords near the viewBox`).toBeLessThan(6 * span)
}

describe('talk figures render with sane geometry', () => {
  it('slide 3 — two panels, 1 + 2 curves, and the derived points shown', () => {
    const g = geometryOf(renderToStaticMarkup(<ThreePointsFigure />))
    expectSaneGeometry(g, 'ThreePointsFigure')
    // Two panels, each with its own viewBox, both the same declared base size.
    expect(g.viewBoxes).toHaveLength(2)
    expect(g.viewBoxes[0]).toEqual(g.viewBoxes[1])
    // One quadratic on the left, TWO PH branches on the right — the slide's point.
    expect(g.visiblePathCount).toBe(3)
    // Left: 1 derived middle point + 3 data points. Right: 2 derived + 3 data.
    expect(g.visibleRadii).toHaveLength(9)
    // Six draggable handles (three shared points, drawn in both panels).
    expect(g.hitRadii).toHaveLength(6)
  })

  it('slide 4 (strict) — two branches, pinned ends, one derived point, one handle', () => {
    const g = geometryOf(renderToStaticMarkup(<PinnedEndsFigure />))
    expectSaneGeometry(g, 'PinnedEndsFigure')
    expect(g.viewBoxes).toHaveLength(1)
    // The branch you are on, plus the one you are not.
    expect(g.visiblePathCount).toBe(2)
    // P₀, P₃ (pinned), plus the two interior points — one held, one derived.
    expect(g.visibleRadii).toHaveLength(4)
    // Two hit targets among the interior points: the one you drag, and the derived
    // one, which is clickable so you can take hold of IT instead (the swap). The
    // pinned ends are not interactive.
    expect(g.hitRadii).toHaveLength(2)
  })

  it('painted marks use the shared pixel sizes (the units really are pixels)', () => {
    for (const [label, html] of [
      ['ThreePointsFigure', renderToStaticMarkup(<ThreePointsFigure />)],
      ['PinnedEndsFigure', renderToStaticMarkup(<PinnedEndsFigure />)],
    ] as const) {
      const g = geometryOf(html)
      for (const r of g.visibleRadii) {
        expect(r, `${label}: visible handle radius`).toBeGreaterThanOrEqual(4)
        expect(r, `${label}: visible handle radius`).toBeLessThanOrEqual(10)
      }
      for (const s of g.visibleStrokeWidths) {
        expect(s, `${label}: painted stroke width`).toBeGreaterThan(0.5)
        expect(s, `${label}: painted stroke width`).toBeLessThan(8)
      }
    }
  })

  it('the curve is near-black and the draggable points are blue, not the reverse', () => {
    // cs2026's convention, and easy to invert by accident: #1f2937 is the CURVE and
    // #3b82f6 is a control point you can drag.
    for (const [label, html] of [
      ['ThreePointsFigure', renderToStaticMarkup(<ThreePointsFigure />)],
      ['PinnedEndsFigure', renderToStaticMarkup(<PinnedEndsFigure />)],
    ] as const) {
      const curvePaths = [...html.matchAll(/<path\b[^>]*>/g)].map((m) => m[0])
      const selected = curvePaths.filter((t) => t.includes('stroke="#1f2937"'))
      expect(selected.length, `${label}: a near-black curve`).toBeGreaterThan(0)
      // No path is painted in the control-point blue.
      expect(curvePaths.some((t) => t.includes('stroke="#3b82f6"')), `${label}: no blue curve`).toBe(false)
      // Draggable points are blue.
      expect(html.includes('fill="#3b82f6"'), `${label}: blue draggable point`).toBe(true)
      // Amber stays reserved for curvature extrema — unused in this deck so far.
      expect(html.includes('#f59e0b'), `${label}: amber not reused`).toBe(false)
    }
  })
})
