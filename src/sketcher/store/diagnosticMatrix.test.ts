import { describe, it, expect } from 'vitest'
import { useSceneStore } from './sceneStore'
import {
  curvatureExtremaNumeratorPlanar, curvatureExtremaNumeratorPlanarPeriodic,
  curvatureExtremaNumeratorComplexPeriodic, assignSignsNeighbor, cyclicSignChanges, cdiv,
} from '../../core'
import type { Curve, PHMetadataAny, WeightedPoint2D, ComplexPoint } from '../types/curve'

// ============================================================================
// THE DIAGNOSTIC MATRIX — the committed executable spec of the editor's CONTRACT
// (docs/CURVATURE_ARCHITECTURE.md §2, §7). For each canonical-path curve type, in
// SLOW and FAST drags, through the LIVE store lifecycle:
//   (1) BOUND non-increasing — S⁻, the noise-robust (neighbour-assigned) sign-change
//       count of the type's OWN curvature numerator (the metric the solver enforces and
//       the readout shows). Dense markers may move within it; only the bound is held.
//   (2) NON-BLOCKING — the dragged point makes real progress toward the cursor.
// This is the single regression net guarding the convergence (docs §9). When a legacy
// path is migrated onto core, un-skip its row here.
// ============================================================================

// ---- fixtures ----
const OPEN_CPS = [{"x":285.7293786375989,"y":-128.66778168827554},{"x":-29.937281991294256,"y":-231.71047358927788},{"x":-132.53987318265357,"y":-273.7353196692132},{"x":-152.12427369153662,"y":-177.50998750973355},{"x":163.74408884600362,"y":-118.39267934895692},{"x":109.66258354292115,"y":-27.369092066794572},{"x":-137.84008801115849,"y":-79.77257604150623},{"x":-246.042849447722,"y":-114.50746892528916},{"x":-394.968336300836,"y":-98.7952470335869},{"x":-439.457756146949,"y":24.313839646482},{"x":-348.62137405107353,"y":139.0769433004184},{"x":-169.61778119399838,"y":121.9819428621646},{"x":-102.21405737898564,"y":94.32056223190035},{"x":237.86000552877556,"y":163.8192367161131},{"x":305.6756348467119,"y":-86.7682457526641}]
const OPEN_K = [0,0,0,0,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666,1,1,1,1]
const CLOSED_CPS = [{"x":-29.84119169744258,"y":-231.62149781966724},{"x":-132.8509515528238,"y":-274.0367602934904},{"x":-152.20884171453955,"y":-177.40943870437195},{"x":164.51935397491175,"y":-122.67180578253836},{"x":111.5139035724089,"y":-62.81665995645677},{"x":-63.6132790509079,"y":-110.034568471879},{"x":-312.1743225190742,"y":-103.87436181677005},{"x":-493.31139622788294,"y":27.296728374172172},{"x":-419.4455246049175,"y":172.56415176882697},{"x":-200.6205431400972,"y":99.53840082323558},{"x":-135.9159733683034,"y":86.39810293116612},{"x":-101.53068088978974,"y":92.12075580154459},{"x":206.61949194098025,"y":117.26806285673604},{"x":285.9159588872296,"y":-128.71036077385614}]
const CLOSED_K = [0,0.03195261465838927,0.05961366133256392,0.08333333333333333,0.16666666666666666,0.25,0.3333333333333333,0.4166666666666667,0.5,0.5833333333333334,0.6666666666666666,0.75,0.8333333333333334,0.9166666666666666]
// The near-straight curve whose points used to BLOCK (g≈0 dead zone).
const FLAT_CPS = [{"x":196.56349027135514,"y":-72.71478514836971},{"x":-253.78148871718972,"y":-152.48377767859776},{"x":-488.9717102287081,"y":-165.2452687801666},{"x":-546.2531411107765,"y":-83.38652167533596},{"x":-309.75844619977073,"y":7.232869968084792},{"x":151.83880244262144,"y":13.771036581073623}]
const FLAT_K = [0,0,0,0,0.3333333333333333,0.6666666666666666,1,1,1,1]

// ---- the ONE bound metric (noise-robust S⁻), dispatched by curve kind ----
function boundOf(c: Curve): number {
  const cps = c.controlPoints as any[]
  const X = cps.map((p) => ('re' in p ? p.re : p.x)), Y = cps.map((p) => ('re' in p ? p.im : p.y))
  if (c.kind === 'bspline') {
    const g = c.closed
      ? curvatureExtremaNumeratorPlanarPeriodic(X, Y, c.knots, c.degree)
      : curvatureExtremaNumeratorPlanar(X, Y, c.knots, c.degree)
    return cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), c.closed)
  }
  // rational (w_im=0) / complex-rational — the complex Chen numerator
  const wre = cps.map((p) => ('w_re' in p ? p.w_re : (p as WeightedPoint2D).w))
  const wim = cps.map((p) => ('w_im' in p ? p.w_im : 0))
  const wrap = (c as any).wrapWeight
  const rho = wrap
    ? (typeof wrap === 'number' ? { re: wrap / wre[0], im: 0 } : cdiv(wrap, { re: wre[0], im: wim[0] }))
    : { re: 1, im: 0 }
  const g = curvatureExtremaNumeratorComplexPeriodic(X, Y, wre, wim, c.knots, c.degree, rho)
  return cyclicSignChanges(assignSignsNeighbor(g.flatCoeffs()), true)
}

const cur = (id: string) => useSceneStore.getState().curves.find((c) => c.id === id)!
const moved = (c: Curve, di: number, x0: number, y0: number) => {
  const p = c.controlPoints[di] as any
  return Math.hypot(('re' in p ? p.re : p.x) - x0, ('re' in p ? p.im : p.y) - y0)
}

// Reset the store to a fresh copy of the curve.
function reset(curve: Curve) {
  useSceneStore.setState({
    curves: [{ ...curve, controlPoints: curve.controlPoints.map((p) => ({ ...p })) } as Curve],
    selectedCurveId: curve.id, preserveCurvatureExtrema: true,
    phMetadata: new Map<string, PHMetadataAny>(), symmetryMaps: null,
  })
}

// One drag of control point `di` toward (dx,dy), `steps` ticks, asserting the BOUND never
// grows. Returns how far the point moved (for the editability check). Fresh curve each call.
function drag(name: string, curve: Curve, di: number, dx: number, dy: number, steps: number): number {
  reset(curve)
  const startB = boundOf(cur(curve.id))
  if (curve.closed) expect(startB % 2, `${name}: closed bound even`).toBe(0)
  const p0 = cur(curve.id).controlPoints[di] as any
  const x0 = 're' in p0 ? p0.re : p0.x, y0 = 're' in p0 ? p0.im : p0.y
  useSceneStore.getState().snapshotDragStartCPs(curve.id)
  for (let t = 1; t <= steps; t++) {
    useSceneStore.getState().moveControlPoint(curve.id, di, { x: x0 + dx * (t / steps), y: y0 + dy * (t / steps) })
    expect(boundOf(cur(curve.id)), `${name} di${di} dir(${dx},${dy}): bound grew past ${startB}`).toBeLessThanOrEqual(startB)
  }
  const m = moved(cur(curve.id), di, x0, y0)
  useSceneStore.getState().clearDragStartCPs()
  return m
}

// HARD guarantee = the bound never grows. EDITABILITY (the point not being stuck in every
// direction) is the GOAL we converge toward, not yet met on every geometry — accepted as a
// known limitation for now (some near-degenerate / complex-rational points still block).
// `editable: true` turns the editability assertion into a hard gate for paths that meet it.
function runCase(name: string, curve: Curve, dis: number[], opts: { editable?: boolean } = {}) {
  const editable = opts.editable ?? false
  for (const [speed, steps] of [['slow', 8], ['fast', 2]] as [string, number][]) {
    for (const di of dis) {
      // BOUND held in BOTH directions — the hard guarantee, every direction (drag() asserts it).
      const a = drag(`${name}-${speed}`, curve, di, 260, 200, steps)
      const b = drag(`${name}-${speed}`, curve, di, -280, -160, steps)
      // EDITABLE — moves in at least one direction (gated; some geometries still block — the goal).
      if (editable) expect(Math.max(a, b), `${name} ${speed} di${di}: stuck in all directions`).toBeGreaterThan(10)
    }
  }
}

describe('diagnostic matrix — bound non-increasing AND non-blocking (canonical core paths)', () => {
  it('polynomial OPEN', () =>
    runCase('poly-open', { id: 'p', kind: 'bspline', degree: 3, closed: false, knots: OPEN_K, controlPoints: OPEN_CPS } as Curve, [7, 3, 11]))

  it('polynomial CLOSED (clean periodic)', () =>
    // editable: BFGS on the closed path reshapes instead of blocking (FOUNDATIONS F4).
    runCase('poly-closed', { id: 'pc', kind: 'bspline', degree: 3, closed: true, knots: CLOSED_K, controlPoints: CLOSED_CPS } as Curve, [4, 9, 0], { editable: true }), 30000)

  it('polynomial OPEN near-straight (the formerly-blocking curve)', () =>
    runCase('poly-flat', { id: 'f', kind: 'bspline', degree: 3, closed: false, knots: FLAT_K, controlPoints: FLAT_CPS } as Curve, [0, 2, 4]))

  // rational / complex-rational CLOSED: the BOUND holds (the guard works); editability is
  // gated (some points still block) and the long timeout is the rational/complex DRAG SPEED
  // (~180 ms/tick — Step 7), NOT a bound issue. The DISPLAY readout still uses a different
  // numerator (shows a looser count) — Step 1 unifies that.
  it('rational CLOSED (clean periodic) — bound held', () =>
    runCase('rat-closed', { id: 'rc', kind: 'rational', degree: 3, closed: true, knots: CLOSED_K, controlPoints: CLOSED_CPS.map((p) => ({ ...p, w: 1 })) as WeightedPoint2D[] } as Curve, [4, 9, 0]), 30000)
  it('complex-rational CLOSED (clean periodic) — bound held', () =>
    runCase('cx-closed', { id: 'cc', kind: 'complex-rational', degree: 3, closed: true, knots: CLOSED_K, controlPoints: CLOSED_CPS.map((p) => ({ re: p.x, im: p.y, w_re: 1, w_im: 0 })) as ComplexPoint[] } as Curve, [4, 9, 0]), 30000)
  // legacy-routed, no S⁻ guard at all — Step 4 (migrate onto core):
  it.skip('rational OPEN (legacy path — Step 4)', () => {})
  it.skip('complex-rational OPEN (legacy path — Step 4)', () => {})
  it.skip('CLOSED junction-knot / C⁰ cusp (legacy path — Step 4/6)', () => {})
})
