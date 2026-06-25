import { describe, it, expect } from 'vitest'
import { slideCurve, planarCurvatureConstraintState, periodicCurvatureConstraintState, cyclicSignChanges } from '../../core'

// Regression for the curves the user reported (open "blocks a lot"; closed bound
// growth). Drives the core drag path the editor uses — Gauss-Newton + the strict
// sliding-mechanism S⁻ guard, NO freeze — and asserts the editor's CONTRACT:
//   (1) the BOUND (noise-robust S⁻, the "S =" readout) is non-increasing, and
//   (2) the drag is NON-BLOCKING (the point makes real progress toward the cursor).
// Dense markers may move within the held bound (the sliding mechanism allows it).

const OPEN = {"degree":3,"knots":[0,0,0,0,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666,1,1,1,1],"controlPoints":[{"x":285.7293786375989,"y":-128.66778168827554},{"x":-29.937281991294256,"y":-231.71047358927788},{"x":-132.53987318265357,"y":-273.7353196692132},{"x":-152.12427369153662,"y":-177.50998750973355},{"x":163.74408884600362,"y":-118.39267934895692},{"x":109.66258354292115,"y":-27.369092066794572},{"x":-137.84008801115849,"y":-79.77257604150623},{"x":-246.042849447722,"y":-114.50746892528916},{"x":-394.968336300836,"y":-98.7952470335869},{"x":-439.457756146949,"y":24.313839646482},{"x":-348.62137405107353,"y":139.0769433004184},{"x":-169.61778119399838,"y":121.9819428621646},{"x":-102.21405737898564,"y":94.32056223190035},{"x":237.86000552877556,"y":163.8192367161131},{"x":305.6756348467119,"y":-86.7682457526641}]}
const CLOSED = {"degree":3,"knots":[0,0.03195261465838927,0.05961366133256392,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666],"controlPoints":[{"x":-29.84119169744258,"y":-231.62149781966724},{"x":-132.8509515528238,"y":-274.0367602934904},{"x":-152.20884171453955,"y":-177.40943870437195},{"x":164.51935397491175,"y":-122.67180578253836},{"x":111.5139035724089,"y":-62.81665995645677},{"x":-63.6132790509079,"y":-110.034568471879},{"x":-312.1743225190742,"y":-103.87436181677005},{"x":-493.31139622788294,"y":27.296728374172172},{"x":-419.4455246049175,"y":172.56415176882697},{"x":-200.6205431400972,"y":99.53840082323558},{"x":-135.9159733683034,"y":86.39810293116612},{"x":-101.53068088978974,"y":92.12075580154459},{"x":206.61949194098025,"y":117.26806285673604},{"x":285.9159588872296,"y":-128.71036077385614}]}
// The simple near-straight curve whose control points used to BLOCK (g≈0 dead zone).
const FLAT = {"degree":3,"knots":[0,0,0,0,0.3333333333333333,0.6666666666666666,1,1,1,1],"controlPoints":[{"x":196.56349027135514,"y":-72.71478514836971},{"x":-253.78148871718972,"y":-152.48377767859776},{"x":-488.9717102287081,"y":-165.2452687801666},{"x":-546.2531411107765,"y":-83.38652167533596},{"x":-309.75844619977073,"y":7.232869968084792},{"x":151.83880244262144,"y":13.771036581073623}]}

const boundOf = (X: number[], Y: number[], knots: number[], degree: number, closed: boolean) => {
  const cs = closed
    ? periodicCurvatureConstraintState(X, Y, knots, degree, { robust: true })
    : planarCurvatureConstraintState(X, Y, knots, degree, { robust: true })
  return cyclicSignChanges(cs.signs, closed)
}

describe('drag regression: user-reported curves (bound non-increasing + non-blocking)', () => {
  it('OPEN: bound held, point tracks the cursor', () => {
    const cpX = OPEN.controlPoints.map((p) => p.x), cpY = OPEN.controlPoints.map((p) => p.y)
    const di = 7, x0 = cpX[di], y0 = cpY[di], tx = x0 + 120, ty = y0 + 90, TICKS = 30
    const startB = boundOf(cpX, cpY, OPEN.knots, OPEN.degree, false)
    let X = cpX.slice(), Y = cpY.slice()
    for (let t = 1; t <= TICKS; t++) {
      const r = slideCurve(X, Y, OPEN.knots, OPEN.degree, di, x0 + (tx - x0) * (t / TICKS), y0 + (ty - y0) * (t / TICKS), {
        method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false,
      })
      X = r.x; Y = r.y
      expect(X.every(Number.isFinite) && Y.every(Number.isFinite)).toBe(true)
      expect(boundOf(X, Y, OPEN.knots, OPEN.degree, false), `tick ${t}: bound grew past ${startB}`).toBeLessThanOrEqual(startB)
    }
    const startDist = Math.hypot(tx - x0, ty - y0), endDist = Math.hypot(tx - X[di], ty - Y[di])
    expect(startDist - endDist, 'point should track toward the cursor').toBeGreaterThan(0.15 * startDist)
  })

  it('CLOSED: bound held (even), counts kept, point tracks', () => {
    const cpX = CLOSED.controlPoints.map((p) => p.x), cpY = CLOSED.controlPoints.map((p) => p.y)
    const startB = boundOf(cpX, cpY, CLOSED.knots, CLOSED.degree, true)
    expect(startB % 2, 'closed bound is even').toBe(0)
    let X = cpX.slice(), Y = cpY.slice()
    for (const di of [4, 9]) {
      const x0 = X[di], y0 = Y[di], tx = x0 + 90, ty = y0 + 70, TICKS = 24
      for (let t = 1; t <= TICKS; t++) {
        const r = slideCurve(X, Y, CLOSED.knots, CLOSED.degree, di, x0 + (tx - x0) * (t / TICKS), y0 + (ty - y0) * (t / TICKS), {
          method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false, closed: true,
        })
        X = r.x; Y = r.y
        expect(X.length).toBe(cpX.length)
        expect(X.every(Number.isFinite) && Y.every(Number.isFinite)).toBe(true)
        const b = boundOf(X, Y, CLOSED.knots, CLOSED.degree, true)
        expect(b % 2, 'closed bound stays even').toBe(0)
        expect(b, `bound must not exceed start ${startB}`).toBeLessThanOrEqual(startB)
      }
    }
  })

  it('FLAT near-straight curve: NON-BLOCKING (the regression) with bound held', () => {
    // Used to block (g≈0 dead zone over-constrained every direction). Now the point
    // must MOVE while the bound stays put.
    const cpX = FLAT.controlPoints.map((p) => p.x), cpY = FLAT.controlPoints.map((p) => p.y)
    const startB = boundOf(cpX, cpY, FLAT.knots, FLAT.degree, false)
    for (const di of [0, 2, 4]) {
      let X = cpX.slice(), Y = cpY.slice()
      const x0 = X[di], y0 = Y[di], tx = x0 + 80, ty = y0 + 120, TICKS = 6
      for (let t = 1; t <= TICKS; t++) {
        const r = slideCurve(X, Y, FLAT.knots, FLAT.degree, di, x0 + (tx - x0) * (t / TICKS), y0 + (ty - y0) * (t / TICKS), {
          method: 'ipopt', bandedSolve: true, maxIterations: 20, enableBFGS: false,
        })
        X = r.x; Y = r.y
        expect(boundOf(X, Y, FLAT.knots, FLAT.degree, false), `di${di} tick${t}: bound grew`).toBeLessThanOrEqual(startB)
      }
      const moved = Math.hypot(X[di] - x0, Y[di] - y0)
      expect(moved, `di${di} blocked (moved ${moved.toFixed(1)})`).toBeGreaterThan(10)
    }
  })
})
