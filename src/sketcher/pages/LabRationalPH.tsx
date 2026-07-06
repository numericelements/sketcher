// Rational PH Curvature Lab — the 2D PH Curvature Workbench (LabPH2D), extended from the
// polynomial PH quintic to a RATIONAL PH curve (z = A/B, complex weights B). Same editor
// (SketcherCanvas), same control-point style and manipulation feel; the only differences are
// the curve it edits and the bound it reads.
//
// The bound here is on the NUMBER OF CURVATURE EXTREMA, via the generating function. A
// rational PH curve's PH condition A′B − AB′ = S² is exactly the numerator of (A/B)′, so the
// hodograph is a perfect square z′ = S²/B². Feeding σ = S/B into the honest curvature-extrema
// numerator collapses it to the reduced Ñ = Im(S̄²·B̄·K′) — degree 4·degS+2·degB−2 = 16 for a
// degree-5 curve, versus the general complex-rational numerator's 44. Fewer coefficients ⇒ a
// tighter S⁻ bound; the panel shows both so the reduction is visible. Dragging preserves the
// PH structure (the sketcher engine) and, with the bound on, holds the curvature-extrema count.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../i18n' // SketcherCanvas uses react-i18next
import { useSceneStore } from '../store/sceneStore'
import SketcherCanvas from '../components/SketcherCanvas'
import type { CanvasConfig } from '../types/canvas'
import type { Curve, RationalPHLinearDMetadata } from '../types/curve'
import {
  rationalPHLinearDFromParams, type RationalPHLinearDParams,
  rationalPHBound, rationalPHMarkers,
  curvatureExtremaNumeratorComplex, curvatureExtremaMarkers,
  assignSignsNeighbor, cyclicSignChanges,
} from '../../core'

const CURVE_ID = 'rational-ph-curve'

// Sketcher chrome stripped: control points + PH-preserving dragging only (we render our own
// panel). Curvature-extrema markers always shown; open curve that must not close.
const config: CanvasConfig = {
  mode: 'demo',
  showHamburger: false,
  showPencilTool: false,
  showRightMenu: false,
  showBottomBar: false,
  showBottomPanel: false,
  allowDrawing: false,
  allowSelection: true,
  alwaysSelected: true,
  showControlPolygon: true,
  hidePolygonOnDeselect: true,
  alwaysShowCurvatureExtrema: true,
  disableClosing: true,
}

// The exactly-PH linear-D family: free params (s0, s2, d1, origin); D = 1·(1−t) + d1·t genuinely
// varies (root 1/(1−d1) safely off [0,1]), and s1 = −2·s2·(root) is derived so S′(root)=0 ⇒ the
// Wronskian F′D−FD'=S² holds EXACTLY. Chosen for a contained, centered curve with one curvature
// extremum. Unlike the earlier AB seed, this is a TRUE PH curve to machine precision, so Ñ is honest.
const START_PARAMS: RationalPHLinearDParams = {
  s0: { re: 14, im: 3 }, s2: { re: -6, im: 11 }, d1: { re: 1.8, im: 0.6 }, origin: { x: -40, y: -110 },
}

/** (Re)create the exactly-PH rational curve in the scene store. */
function installCurve() {
  const c = rationalPHLinearDFromParams(START_PARAMS)
  const curve: Curve = {
    id: CURVE_ID,
    kind: 'complex-rational',
    degree: c.degree,
    knots: c.knots,
    controlPoints: c.controlPoints,
    closed: false,
  }
  const meta: RationalPHLinearDMetadata = {
    kind: 'rational-ph-linear-d', degree: c.degree, knots: c.knots, params: START_PARAMS,
  }
  useSceneStore.setState((state) => {
    const phMetadata = new Map(state.phMetadata)
    phMetadata.set(CURVE_ID, meta)
    return {
      curves: [curve],
      selectedCurveId: CURVE_ID,
      selectedControlPointIndex: null,
      phMetadata,
      showHint: false,
      panelView: null,
    }
  })
}

// The panel readouts, all from the live params. Because the curve is EXACTLY PH here, the
// reduced Ñ and the general Chen g are the same dκ/dt up to a positive factor, so their sign
// changes — and the canvas markers — AGREE. We show both bounds to make the reduction visible
// (Ñ is the tighter, lower-degree one) and the drawn-curve markers to prove the agreement.
interface Stats { markers: number; genMarkers: number; sReduced: number; sGeneral: number; degReduced: number; degGeneral: number }
function computeStats(meta: RationalPHLinearDMetadata): Stats {
  const c = rationalPHLinearDFromParams(meta.params)
  const sDeg = c.sReCPs.length - 1
  const sReduced = rationalPHBound(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1)
  const markers = rationalPHMarkers(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, 1).length
  // general bound + markers: g of the drawable complex-rational curve (positions P, weights D).
  const Pre = c.controlPoints.map((p) => p.re), Pim = c.controlPoints.map((p) => p.im)
  const wre = c.controlPoints.map((p) => p.w_re), wim = c.controlPoints.map((p) => p.w_im)
  const gGen = curvatureExtremaNumeratorComplex(Pre, Pim, wre, wim, c.knots, c.degree)
  const sGeneral = cyclicSignChanges(assignSignsNeighbor(gGen.flatCoeffs()), false)
  const genMarkers = curvatureExtremaMarkers('complex-rational', Pre, Pim, wre, wim, c.knots, c.degree, false).length
  return { markers, genMarkers, sReduced, sGeneral, degReduced: 4 * sDeg + 2 * 1 - 2, degGeneral: 4 * c.degree - 6 }
}

export default function LabRationalPH() {
  const preserve = useSceneStore((s) => s.preserveCurvatureExtrema)
  const setPreserve = useSceneStore((s) => s.setPreserveCurvatureExtrema)
  const [stats, setStats] = useState<Stats>({ markers: 0, genMarkers: 0, sReduced: 0, sGeneral: 0, degReduced: 8, degGeneral: 10 })

  // Create the curve on mount (bound on by default); recompute the panel readouts from the
  // live metadata on every store change; clean up on unmount.
  useEffect(() => {
    installCurve()
    setPreserve(true)
    const update = () => {
      const meta = useSceneStore.getState().phMetadata.get(CURVE_ID)
      if (meta && meta.kind === 'rational-ph-linear-d') setStats(computeStats(meta))
    }
    update()
    const unsub = useSceneStore.subscribe(update)
    return () => {
      unsub()
      useSceneStore.setState({
        curves: [], selectedCurveId: null, selectedControlPointIndex: null,
        phMetadata: new Map(), showHint: true, panelView: null, preserveCurvatureExtrema: false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stat = (label: string, value: string, accent?: string) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`font-mono ${accent ?? 'text-gray-800 dark:text-gray-200'}`}>{value}</span>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-steelblue-900 bg-gradient-to-br from-steelblue-900 to-steelblue-200">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <Link to="/lab" className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400">Lab</Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rational PH Curvature Lab</h1>
        <span className="text-xs text-gray-500 italic">
          complex-rational Pythagorean-hodograph curve · bound on the number of curvature extrema, via the generating function
        </span>
      </header>

      <div className="flex-1 relative min-h-0">
        <SketcherCanvas config={config} />

        <div className="absolute top-3 left-3 w-80 flex flex-col gap-3 bg-white/90 dark:bg-gray-950/90 px-4 py-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 backdrop-blur shadow-lg">
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={preserve} onChange={(e) => setPreserve(e.target.checked)} />
              <span className="font-semibold">{preserve ? 'Bounding' : 'Free'} curvature extrema</span>
            </label>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {preserve ? 'live — dragging holds the extrema count; the curve reshapes.' : 'off — drag freely; watch the count change.'}
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-2 border-t border-gray-200 dark:border-gray-800">
            {stat('Curvature-extrema markers', String(stats.markers))}
            {stat(`Generating-function bound  S⁻(Ñ)`, String(stats.sReduced), 'text-emerald-600 dark:text-emerald-400')}
            {stat('General bound  S⁻(g)', String(stats.sGeneral), 'text-gray-500')}
          </div>
          <div className="text-[10px] text-gray-400 -mt-1">
            Ñ has degree {stats.degReduced} vs the general g’s {stats.degGeneral} — fewer coefficients, a
            tighter honest bound. Both obey S⁻ ≥ markers (Law 1).
            {stats.markers === stats.genMarkers
              ? ' The markers equal the drawn curve’s own extrema — the curve is exactly PH, so Ñ is honest.'
              : ' ⚠︎ marker mismatch — the curve has left the PH manifold.'}
          </div>

          <div className="flex">
            <button
              type="button"
              onClick={() => { installCurve(); }}
              className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Reset</button>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-[10px] leading-relaxed">
            <div className="font-semibold text-gray-700 dark:text-gray-200 mb-0.5">The generating function</div>
            <p className="font-mono">z = F/D,  F′D − FD′ = S²  ⟹  z′ = S²/D² = σ²,  σ = S/D.</p>
            <p className="font-mono mt-0.5">Ñ = Im(S̄²·D̄·K′),  K′ = S·W₁′ − 2·S′·W₁,  W₁ = S′D − SD′.</p>
            <p className="mt-1 text-gray-500">
              D is <span className="font-semibold">linear</span>, so F is reconstructed <span className="font-semibold">exactly</span>{' '}
              from (S, D) — the curve is a true PH curve to machine precision, and Ñ’s sign changes ARE the
              curvature extrema. Drag any control point; the curve re-solves on the PH manifold. Turn on{' '}
              <span className="font-semibold">Bounding curvature extrema</span> and the count can only hold or drop.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
