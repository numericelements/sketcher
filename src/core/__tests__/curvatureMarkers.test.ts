import { describe, it, expect } from 'vitest'
import {
  curvatureExtremaMarkers,
  openCurvatureExtremaParameters,
  closedCurvatureExtremaParameters,
} from '../index'

// REGRESSION: the editor's curvature-extrema dots (curvatureExtremaMarkers) must equal the
// proven dense root-finder for planar B-splines — open and closed. The Step-1c deadband
// regressed this: a global-coefficient amplitude threshold erased every genuine extremum
// whose |g| was dwarfed by the large g-coefficients near a clamped endpoint (4–8 real
// extrema collapsed to 1). The markers now scan g's value with no amplitude band, with a
// noise-robust flat-curve screen, so they track the dense finder exactly.

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

describe('curvatureExtremaMarkers tracks the proven dense finder (bspline)', () => {
  it('OPEN cubics, including a strong feature near a clamped endpoint', () => {
    const d = 3
    for (let s = 0; s < 40; s++) {
      const n = 7 + (s % 8)
      const knots = openKnots(n, d)
      // gentle interior wave + a strong kink at index 1 → huge endpoint |g|, small interior |g|
      const x = Array.from({ length: n }, (_, i) => 30 * i + (i === 1 ? 4 * s : 0))
      const y = Array.from({ length: n }, (_, i) => 8 * Math.sin(i * 0.9 + s) + (i === 1 ? 90 : 0))
      const dense = openCurvatureExtremaParameters(x, y, knots, d)
      const markers = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, false)
      expect(markers.length, `open seed ${s}`).toBe(dense.length)
      markers.forEach((t, i) => expect(Math.abs(t - dense[i]), `open seed ${s} pos ${i}`).toBeLessThan(1e-4))
    }
  })

  it('CLOSED cubics', () => {
    const d = 3
    for (let s = 0; s < 12; s++) {
      const n = 10 + (s % 4)
      const knots = periodicKnots(n)
      const x = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 150 * Math.cos(a) + 12 * Math.sin((2 + s) * a) })
      const y = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return 95 * Math.sin(a) + 10 * Math.cos((3 + s) * a) })
      const dense = closedCurvatureExtremaParameters(x, y, knots, d)
      const markers = curvatureExtremaMarkers('bspline', x, y, [], [], knots, d, true)
      expect(markers.length, `closed seed ${s}`).toBe(dense.length)
    }
  })
})
