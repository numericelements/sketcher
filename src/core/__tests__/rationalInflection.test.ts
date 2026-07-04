import { describe, it, expect } from 'vitest'
import {
  inflectionNumeratorRational,
  inflectionNumeratorRationalPeriodic,
  inflectionNumeratorPlanar,
  inflectionNumeratorPlanarPeriodic,
  decomposeToBernstein,
  slide,
  familyBound,
  familyInflectionBound,
  rational,
  type WeightedCP,
} from '../index'

// RATIONAL INFLECTIONS (fable branch): f = det[H, H′, H″] over the homogeneous
// coordinates H = (w·x, w·y, w), degree 3d−3. r′×r″ = f/W³, so for positive
// weights the inflections of the drawn NURBS are exactly the sign changes of f
// and S⁻ of f's control polygon bounds their count (Law 1). Pins:
//   1. w ≡ 1 collapses f to the polynomial numerator x′y″ − y′x″ (exactly).
//   2. w ≡ c scales f by c³ (determinant is trilinear in its rows) — exactly.
//   3. Independent oracle: sign of f(t) agrees with a numeric r′×r″ obtained by
//      central differences on the EVALUATED curve (de Casteljau path, no product
//      algebra shared with f's construction), at non-unit weights.
//   4. The drag: slide('rational', {preserveInflections}) holds BOTH S⁻(g) and
//      S⁻(f) non-increasing while still tracking (Law 2 for both counts).

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

// An S-shaped open polygon (has a genuine inflection) with room to wiggle.
const d = 3, n = 9
const knots = openKnots(n, d)
const SX = [-200, -150, -90, -40, 0, 40, 90, 150, 200]
const SY = [-120, -80, -110, -40, 0, 40, 110, 80, 120]

describe('rational inflection numerator f = det[H,H′,H″]', () => {
  it('w ≡ 1: equals the polynomial inflection numerator as a FUNCTION (open + periodic)', () => {
    // f(rational) lives at degree 3d−3 — a degree-ELEVATED representation of the
    // degree-(2d−3) polynomial numerator when W ≡ 1 (elevation preserves the function
    // and, by variation diminishing, its polygon still gives a valid Law-1 bound).
    // So compare VALUES, not coefficient arrays.
    const w1 = SX.map(() => 1)
    const fRat = inflectionNumeratorRational(SX, SY, w1, knots, d)
    const fPoly = inflectionNumeratorPlanar(SX, SY, knots, d)
    const scale = Math.max(...fPoly.flatCoeffs().map(Math.abs))
    for (let j = 0; j <= 60; j++) {
      const t = j / 60
      expect(Math.abs(fRat.evaluate(t) - fPoly.evaluate(t)), `t=${t}`).toBeLessThan(1e-9 * scale)
    }
    const pk = periodicKnots(n)
    const fRatP = inflectionNumeratorRationalPeriodic(SX, SY, w1, pk, d)
    const fPolyP = inflectionNumeratorPlanarPeriodic(SX, SY, pk, d)
    const scaleP = Math.max(...fPolyP.flatCoeffs().map(Math.abs))
    for (let j = 0; j < 60; j++) {
      const t = j / 60
      expect(Math.abs(fRatP.evaluate(t) - fPolyP.evaluate(t)), `periodic t=${t}`).toBeLessThan(1e-9 * scaleP)
    }
  })

  it('w ≡ c: scales f by c³ (trilinearity of the determinant)', () => {
    const c = 2.5
    const fBase = inflectionNumeratorRational(SX, SY, SX.map(() => 1), knots, d).flatCoeffs()
    const fScaled = inflectionNumeratorRational(SX, SY, SX.map(() => c), knots, d).flatCoeffs()
    // Same degree/representation on both sides here, so coefficients ARE comparable —
    // and a trivially-zero f would pass this vacuously, so pin that it is nonzero.
    expect(Math.max(...fBase.map(Math.abs))).toBeGreaterThan(1)
    fScaled.forEach((v, i) => expect(v).toBeCloseTo(c ** 3 * fBase[i], 6))
  })

  it('non-unit weights: sign of f(t) matches numeric r′×r″ from the evaluated curve', () => {
    const w = [1, 0.7, 1.3, 0.9, 1.15, 0.8, 1.25, 0.95, 1.1]
    const f = inflectionNumeratorRational(SX, SY, w, knots, d)
    const X = decomposeToBernstein(SX.map((x, i) => x * w[i]), knots, d)
    const Y = decomposeToBernstein(SY.map((y, i) => y * w[i]), knots, d)
    const W = decomposeToBernstein([...w], knots, d)
    const r = (t: number) => ({ x: X.evaluate(t) / W.evaluate(t), y: Y.evaluate(t) / W.evaluate(t) })
    const h = 1e-4
    const samples = Array.from({ length: 19 }, (_, j) => {
      const t = (j + 1) / 20
      const p0 = r(t - h), p1 = r(t), p2 = r(t + h)
      const r1 = { x: (p2.x - p0.x) / (2 * h), y: (p2.y - p0.y) / (2 * h) }
      const r2 = { x: (p2.x - 2 * p1.x + p0.x) / (h * h), y: (p2.y - 2 * p1.y + p0.y) / (h * h) }
      return { t, cross: r1.x * r2.y - r1.y * r2.x, ft: f.evaluate(t) }
    })
    // Scale-aware zero gate: near an inflection both quantities pass through zero and
    // FD noise owns the signs, so compare only where |cross| is significant RELATIVE
    // to its own magnitude over the curve (an absolute gate is meaningless when the
    // values span 1e5 — that blindness was a test bug once).
    const crossScale = Math.max(...samples.map((s) => Math.abs(s.cross)))
    let compared = 0
    for (const s of samples) {
      if (Math.abs(s.cross) < 1e-4 * crossScale) continue
      compared++
      expect(Math.sign(s.ft), `t=${s.t}: f=${s.ft.toExponential(2)} vs r′×r″=${s.cross.toExponential(2)}`).toBe(Math.sign(s.cross))
    }
    expect(compared).toBeGreaterThan(12) // the gate must not hollow the test out
  })
})

describe('rational drag with preserveInflections (Law 2 for both counts)', () => {
  it('S⁻(g) and S⁻(f) never rise while the drag still tracks', () => {
    const w = [1, 0.9, 1.1, 0.95, 1.05, 0.9, 1.1, 0.95, 1]
    let cps: WeightedCP[] = SX.map((x, i) => rational(x, SY[i], w[i]))
    const gStart = familyBound('rational', cps, knots, d, 'open')
    const fStart = familyInflectionBound('rational', cps, knots, d, 'open')
    expect(fStart).toBeGreaterThan(0) // the S-shape really has inflection sign changes

    const k = 4, sx = cps[k].re, sy = cps[k].im
    const move = { x: 40, y: -60 }
    for (let s = 1; s <= 10; s++) {
      const t = s / 10
      const r = slide('rational', cps, knots, d, 'open', k, { x: sx + move.x * t, y: sy + move.y * t },
        { solver: 'primal-dual', jacobian: 'analytic', maxIterations: 20, preserveInflections: true })
      cps = r.points
      expect(familyBound('rational', cps, knots, d, 'open'), `step ${s}: g bound rose`).toBeLessThanOrEqual(gStart)
      expect(familyInflectionBound('rational', cps, knots, d, 'open'), `step ${s}: f bound rose`).toBeLessThanOrEqual(fStart)
    }
    const err = Math.hypot(cps[k].re - (sx + move.x), cps[k].im - (sy + move.y))
    expect(err, 'drag made no progress').toBeLessThan(Math.hypot(move.x, move.y))
    // Weights ride fixed.
    cps.forEach((p, i) => expect(p.wRe).toBe(w[i]))
  }, 30000)

  it('complex weights: preserveInflections throws (explicit gap, not a silent no-op)', () => {
    const cps: WeightedCP[] = SX.map((x, i) => ({ re: x, im: SY[i], wRe: 1, wIm: 0.1 }))
    expect(() =>
      slide('complex', cps, knots, d, 'open', 4, { x: 0, y: 0 }, { preserveInflections: true, maxIterations: 2 }),
    ).toThrow(/Möbius|not defined/)
  })
})
