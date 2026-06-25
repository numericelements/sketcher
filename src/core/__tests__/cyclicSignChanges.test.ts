import { describe, it, expect } from 'vitest'
import { cyclicSignChanges, curvatureExtremaNumeratorPlanarPeriodic, curvatureExtremaNumeratorPlanar } from '../index'

// Regression for the closed-curve ODD extrema-count display bug: on a CLOSED (periodic)
// curve the curvature-extrema count must be EVEN, but the "S =" readout used a
// non-wrapping linear sign-change walk and showed odd numbers (the user saw 9, then 13).
// cyclicSignChanges(signs, true) counts the seam crossing → always even.

describe('cyclicSignChanges (closed-curve parity)', () => {
  it('cyclic count is ALWAYS even for any periodic sign sequence', () => {
    const cases: number[][] = [
      [1, -1, 1, -1],
      [1, 1, -1, -1, 1],
      [1, -1, -1, 1, -1, 1, 1],
      [-1, 1, -1, 1, -1, 1, -1, 1, -1], // 9 elements, alternating → linear 8, but wrap closes it even
      [1],
      [1, -1],
      [0, 1, 0, -1, 0, 1], // zeros skipped
    ]
    for (const s of cases) {
      const c = cyclicSignChanges(s, true)
      expect(c % 2, `cyclic count of ${JSON.stringify(s)} = ${c} must be even`).toBe(0)
    }
  })

  it('cyclic adds exactly the seam crossing vs the linear walk', () => {
    expect(cyclicSignChanges([1, 1, -1], false)).toBe(1) // linear: one change
    expect(cyclicSignChanges([1, 1, -1], true)).toBe(2) // + seam (-1 → 1)
    expect(cyclicSignChanges([1, -1, 1, -1], false)).toBe(3) // linear
    expect(cyclicSignChanges([1, -1, 1, -1], true)).toBe(4) // + seam (-1 → 1)
    // No seam crossing when last == first.
    expect(cyclicSignChanges([1, -1, 1], true)).toBe(cyclicSignChanges([1, -1, 1], false))
  })

  it("open curves stay non-wrapping (cyclic=false unchanged)", () => {
    const s = [1, -1, 1, -1, 1]
    expect(cyclicSignChanges(s, false)).toBe(4)
  })

  // The user's actual closed curve: the cyclic g count is even; the legacy linear walk
  // was odd. The matching OPEN curve (its source) stays a correct linear count.
  it("the user's closed curve reports an EVEN cyclic extrema bound", () => {
    const cps = [{"x":-29.84119169744258,"y":-231.62149781966724},{"x":-132.8509515528238,"y":-274.0367602934904},{"x":-152.20884171453955,"y":-177.40943870437195},{"x":164.51935397491175,"y":-122.67180578253836},{"x":111.5139035724089,"y":-62.81665995645677},{"x":-63.6132790509079,"y":-110.034568471879},{"x":-312.1743225190742,"y":-103.87436181677005},{"x":-493.31139622788294,"y":27.296728374172172},{"x":-419.4455246049175,"y":172.56415176882697},{"x":-200.6205431400972,"y":99.53840082323558},{"x":-135.9159733683034,"y":86.39810293116612},{"x":-101.53068088978974,"y":92.12075580154459},{"x":206.61949194098025,"y":117.26806285673604},{"x":285.9159588872296,"y":-128.71036077385614}]
    const knots = [0,0.03195261465838927,0.05961366133256392,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666]
    const g = curvatureExtremaNumeratorPlanarPeriodic(cps.map((p) => p.x), cps.map((p) => p.y), knots, 3)
    expect(g.signChanges(true) % 2, 'closed cyclic count must be even').toBe(0)
  })

  it("an OPEN curve's count is unaffected (non-cyclic)", () => {
    const cps = [{"x":285.7293786375989,"y":-128.66778168827554},{"x":-29.937281991294256,"y":-231.71047358927788},{"x":-132.53987318265357,"y":-273.7353196692132},{"x":-152.12427369153662,"y":-177.50998750973355},{"x":163.74408884600362,"y":-118.39267934895692},{"x":109.66258354292115,"y":-27.369092066794572},{"x":-137.84008801115849,"y":-79.77257604150623},{"x":-246.042849447722,"y":-114.50746892528916},{"x":-394.968336300836,"y":-98.7952470335869},{"x":-439.457756146949,"y":24.313839646482},{"x":-348.62137405107353,"y":139.0769433004184},{"x":-169.61778119399838,"y":121.9819428621646},{"x":-102.21405737898564,"y":94.32056223190035},{"x":237.86000552877556,"y":163.8192367161131},{"x":305.6756348467119,"y":-86.7682457526641}]
    const knots = [0,0,0,0,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666,1,1,1,1]
    const g = curvatureExtremaNumeratorPlanar(cps.map((p) => p.x), cps.map((p) => p.y), knots, 3)
    expect(g.signChanges()).toBe(g.signChanges(false)) // default is non-cyclic
  })
})
