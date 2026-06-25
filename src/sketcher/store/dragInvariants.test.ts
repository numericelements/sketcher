import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import {
  curvatureExtremaNumeratorPlanar, curvatureExtremaNumeratorPlanarPeriodic,
  openCurvatureExtremaParameters, closedCurvatureExtremaParameters,
} from '../../core'
import type { Curve, PHMetadataAny } from '../types/curve'

// The two invariants the editor must never break on a control-point drag, asserted
// through the LIVE store path (snapshotDragStartCPs → moveControlPoint×N →
// clearDragStartCPs — the exact lifecycle the canvas uses), for SLOW and FAST drags:
//   (1) BOUND   S⁻ (sign changes of g) is non-increasing.
//   (2) EXTREMA the actual (dense-sampled) curvature-extrema count never increases.
// Covers the paths we guarantee today: polynomial OPEN + polynomial CLEAN-PERIODIC
// CLOSED. (Junction-knot closed and rational/complex are tracked separately —
// junction routes to the legacy path, rational/complex are correct but slow.)

const OPEN_CPS = [{"x":285.7293786375989,"y":-128.66778168827554},{"x":-29.937281991294256,"y":-231.71047358927788},{"x":-132.53987318265357,"y":-273.7353196692132},{"x":-152.12427369153662,"y":-177.50998750973355},{"x":163.74408884600362,"y":-118.39267934895692},{"x":109.66258354292115,"y":-27.369092066794572},{"x":-137.84008801115849,"y":-79.77257604150623},{"x":-246.042849447722,"y":-114.50746892528916},{"x":-394.968336300836,"y":-98.7952470335869},{"x":-439.457756146949,"y":24.313839646482},{"x":-348.62137405107353,"y":139.0769433004184},{"x":-169.61778119399838,"y":121.9819428621646},{"x":-102.21405737898564,"y":94.32056223190035},{"x":237.86000552877556,"y":163.8192367161131},{"x":305.6756348467119,"y":-86.7682457526641}]
const OPEN_KNOTS = [0,0,0,0,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666,1,1,1,1]
const CLOSED_CPS = [{"x":-29.84119169744258,"y":-231.62149781966724},{"x":-132.8509515528238,"y":-274.0367602934904},{"x":-152.20884171453955,"y":-177.40943870437195},{"x":164.51935397491175,"y":-122.67180578253836},{"x":111.5139035724089,"y":-62.81665995645677},{"x":-63.6132790509079,"y":-110.034568471879},{"x":-312.1743225190742,"y":-103.87436181677005},{"x":-493.31139622788294,"y":27.296728374172172},{"x":-419.4455246049175,"y":172.56415176882697},{"x":-200.6205431400972,"y":99.53840082323558},{"x":-135.9159733683034,"y":86.39810293116612},{"x":-101.53068088978974,"y":92.12075580154459},{"x":206.61949194098025,"y":117.26806285673604},{"x":285.9159588872296,"y":-128.71036077385614}]
const CLOSED_KNOTS = [0,0.03195261465838927,0.05961366133256392,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666]

const X = (c: Curve) => (c.controlPoints as any[]).map((p) => p.x)
const Y = (c: Curve) => (c.controlPoints as any[]).map((p) => p.y)
const cur = () => useSceneStore.getState().curves.find((c) => c.id === 'd')!

function run(closed: boolean, cps: any[], knots: number[]) {
  const bound = (c: Curve) => closed
    ? curvatureExtremaNumeratorPlanarPeriodic(X(c), Y(c), c.knots, c.degree).signChanges(true)
    : curvatureExtremaNumeratorPlanar(X(c), Y(c), c.knots, c.degree).signChanges()
  const extrema = (c: Curve) => (closed
    ? closedCurvatureExtremaParameters(X(c), Y(c), c.knots, c.degree)
    : openCurvatureExtremaParameters(X(c), Y(c), c.knots, c.degree)).length

  for (const [speed, steps] of [['slow', 8], ['fast', 2]] as [string, number][]) {
    useSceneStore.setState({
      curves: [{ id: 'd', kind: 'bspline', degree: 3, closed, knots: [...knots], controlPoints: cps.map((p) => ({ ...p })) } as Curve],
      selectedCurveId: 'd', preserveCurvatureExtrema: true, phMetadata: new Map<string, PHMetadataAny>(), symmetryMaps: null,
    })
    const startB = bound(cur()), startE = extrema(cur())
    if (closed) expect(startE % 2, 'closed extrema count even').toBe(0)
    for (const di of [4, 9, 0]) {
      const x0 = X(cur())[di], y0 = Y(cur())[di]
      const [dx, dy] = di % 2 ? [-300, 150] : [260, 200]
      useSceneStore.getState().snapshotDragStartCPs('d') // pointer-down freezes signs
      for (let t = 1; t <= steps; t++) {
        useSceneStore.getState().moveControlPoint('d', di, { x: x0 + dx * (t / steps), y: y0 + dy * (t / steps) })
        expect(bound(cur()), `${speed} di${di}: bound S⁻ grew past ${startB}`).toBeLessThanOrEqual(startB)
        expect(extrema(cur()), `${speed} di${di}: actual extrema grew past ${startE}`).toBeLessThanOrEqual(startE)
      }
      useSceneStore.getState().clearDragStartCPs() // pointer-up
    }
  }
}

describe('drag invariants (live path): bound + extrema never increase', () => {
  it('polynomial OPEN — slow & fast', () => run(false, OPEN_CPS, OPEN_KNOTS))
  it('polynomial CLOSED (clean periodic) — slow & fast', () => run(true, CLOSED_CPS, CLOSED_KNOTS))
})
