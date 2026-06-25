import { describe, it, expect } from 'vitest'
import { slideCurve, openCurvatureExtremaParameters, closedCurvatureExtremaParameters } from '../../core'

// Regression for the curves the user reported as misbehaving (open "blocks a lot",
// closed odd-count / extrema growth). Guards the core drag path the editor uses:
//   - OPEN: full-Newton exact Hessian (enableExactHessian), maxIter 12
//   - CLOSED: Gauss-Newton arrowhead, maxIter 20
// Asserts a chained drag stays finite, tracks the cursor (no freeze), and NEVER grows
// the actual curvature-extrema count (the geometric bound — the editor's invariant).

const OPEN = {"degree":3,"knots":[0,0,0,0,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666,1,1,1,1],"controlPoints":[{"x":285.7293786375989,"y":-128.66778168827554},{"x":-29.937281991294256,"y":-231.71047358927788},{"x":-132.53987318265357,"y":-273.7353196692132},{"x":-152.12427369153662,"y":-177.50998750973355},{"x":163.74408884600362,"y":-118.39267934895692},{"x":109.66258354292115,"y":-27.369092066794572},{"x":-137.84008801115849,"y":-79.77257604150623},{"x":-246.042849447722,"y":-114.50746892528916},{"x":-394.968336300836,"y":-98.7952470335869},{"x":-439.457756146949,"y":24.313839646482},{"x":-348.62137405107353,"y":139.0769433004184},{"x":-169.61778119399838,"y":121.9819428621646},{"x":-102.21405737898564,"y":94.32056223190035},{"x":237.86000552877556,"y":163.8192367161131},{"x":305.6756348467119,"y":-86.7682457526641}]}

const CLOSED = {"degree":3,"knots":[0,0.03195261465838927,0.05961366133256392,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666],"controlPoints":[{"x":-29.84119169744258,"y":-231.62149781966724},{"x":-132.8509515528238,"y":-274.0367602934904},{"x":-152.20884171453955,"y":-177.40943870437195},{"x":164.51935397491175,"y":-122.67180578253836},{"x":111.5139035724089,"y":-62.81665995645677},{"x":-63.6132790509079,"y":-110.034568471879},{"x":-312.1743225190742,"y":-103.87436181677005},{"x":-493.31139622788294,"y":27.296728374172172},{"x":-419.4455246049175,"y":172.56415176882697},{"x":-200.6205431400972,"y":99.53840082323558},{"x":-135.9159733683034,"y":86.39810293116612},{"x":-101.53068088978974,"y":92.12075580154459},{"x":206.61949194098025,"y":117.26806285673604},{"x":285.9159588872296,"y":-128.71036077385614}]}

describe('drag regression: user-reported curves', () => {
  it('OPEN (exact Hessian): finite, tracks the cursor, actual extrema never grow', () => {
    const cpX = OPEN.controlPoints.map((p) => p.x), cpY = OPEN.controlPoints.map((p) => p.y)
    const ext = (X: number[], Y: number[]) => openCurvatureExtremaParameters(X, Y, OPEN.knots, OPEN.degree).length
    const di = 7, x0 = cpX[di], y0 = cpY[di], tx = x0 + 120, ty = y0 + 90, TICKS = 30
    const startE = ext(cpX, cpY)
    let X = cpX.slice(), Y = cpY.slice()
    for (let t = 1; t <= TICKS; t++) {
      const gx = x0 + (tx - x0) * (t / TICKS), gy = y0 + (ty - y0) * (t / TICKS)
      const r = slideCurve(X, Y, OPEN.knots, OPEN.degree, di, gx, gy, {
        method: 'ipopt', bandedSolve: true, maxIterations: 12, enableBFGS: false, enableExactHessian: true,
      })
      X = r.x; Y = r.y
      expect(X.every(Number.isFinite) && Y.every(Number.isFinite)).toBe(true)
      expect(ext(X, Y), `tick ${t}: actual extrema must not exceed start ${startE}`).toBeLessThanOrEqual(startE)
    }
    // Made real progress toward the cursor (didn't freeze): the bound resists a full
    // reach, but the point must move a meaningful fraction of the way.
    const startDist = Math.hypot(tx - x0, ty - y0)
    const endDist = Math.hypot(tx - X[di], ty - Y[di])
    expect(startDist - endDist).toBeGreaterThan(0.15 * startDist)
  })

  it('CLOSED: finite, counts kept, actual extrema never grow', () => {
    const cpX = CLOSED.controlPoints.map((p) => p.x), cpY = CLOSED.controlPoints.map((p) => p.y)
    const ext = (X: number[], Y: number[]) => closedCurvatureExtremaParameters(X, Y, CLOSED.knots, CLOSED.degree).length
    const startE = ext(cpX, cpY)
    expect(startE % 2, 'closed curve actual extrema count is even').toBe(0)
    let X = cpX.slice(), Y = cpY.slice()
    for (const di of [4, 9]) {
      const x0 = X[di], y0 = Y[di], tx = x0 + 90, ty = y0 + 70, TICKS = 24
      for (let t = 1; t <= TICKS; t++) {
        const gx = x0 + (tx - x0) * (t / TICKS), gy = y0 + (ty - y0) * (t / TICKS)
        const r = slideCurve(X, Y, CLOSED.knots, CLOSED.degree, di, gx, gy, {
          method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false, closed: true,
        })
        X = r.x; Y = r.y
        expect(X.length).toBe(cpX.length)
        expect(X.every(Number.isFinite) && Y.every(Number.isFinite)).toBe(true)
        const e = ext(X, Y)
        expect(e % 2, 'closed extrema count stays even').toBe(0)
        expect(e, `actual extrema must not exceed start ${startE}`).toBeLessThanOrEqual(startE)
      }
    }
  })
})
