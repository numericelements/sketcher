// Rational PH Curvature Lab — the 2D PH Curvature Workbench (LabPH2D), extended from the
// polynomial PH quintic to an EXACTLY-PH RATIONAL curve (z = F/D, generator S, complex weights).
// Same editor (SketcherCanvas), same control-point style and manipulation feel; the only
// differences are the curve it edits and the bound it reads. Two knobs generalize the family:
// the generator degree deg S (2–4) and a constant / linear / quadratic denominator deg D, giving
// curve degree 2·degS − degD + 1. degD=0 (constant D) is the POLYNOMIAL PH corner — all weights
// equal, so degS=2 recovers the familiar degree-5 polynomial PH quintic; degS=3, degD=2 is a
// genuinely rational quintic. So degree 5 appears twice, as a polynomial and as a rational curve.
//
// The bound here is on the NUMBER OF CURVATURE EXTREMA, via the generating function. A
// rational PH curve's PH condition F′D − FD′ = S² is exactly the numerator of (F/D)′, so the
// hodograph is a perfect square z′ = S²/D². Feeding σ = S/D into the honest curvature-extrema
// numerator collapses it to the reduced Ñ = Im(S̄²·D̄·K′) — degree 4·degS+2·degD−2, well below
// the general numerator's 4·(curve degree)−6. Fewer coefficients ⇒ a tighter S⁻ bound; the
// panel shows both so the reduction is visible. Dragging preserves the PH structure exactly (the
// curve is reconstructed from the params each step) and, with the bound on, holds the count.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../i18n' // SketcherCanvas uses react-i18next
import { useSceneStore } from '../store/sceneStore'
import SketcherCanvas from '../components/SketcherCanvas'
import type { CanvasConfig } from '../types/canvas'
import type { Curve, RationalPHLinearDMetadata } from '../types/curve'
import {
  rationalPHExactFromParams, type RationalPHExactParams,
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

// The exactly-PH rational family, parameterized to arbitrary generator degree (deg S) and a
// constant / linear / quadratic denominator (deg D). Curve degree = 2·degS − degD + 1. The
// compatibility conditions (residues of S²/D² vanish) fix some S coefficients, so the curve is a
// TRUE PH curve to machine precision for any free params — and Ñ is honest. degD=0 (constant D) is
// the POLYNOMIAL PH corner: no roots, no conditions, all of S free, all weights equal (degS=2 → the
// familiar degree-5 polynomial PH quintic). `realD` keeps D's roots real ⇒ real weights (moot at degD=0).
type C2 = { re: number; im: number }
const C = (re: number, im = 0): C2 => ({ re, im })
// Enough free S coefficients for degS ≤ 4 at any degD (degD=0 needs degS+1 = 5 free); roots off [0,1].
const S_POOL: C2[] = [C(14, 3), C(-6, 11), C(4, -5), C(3, 4), C(1, -9), C(-8, -2)]
const rootsFor = (degD: 0 | 1 | 2, realD: boolean): C2[] =>
  degD === 0 ? []
    : degD === 1 ? [realD ? C(-1.25, 0) : C(-0.8, 0.6)]
      : (realD ? [C(2.2, 0), C(-1.2, 0)] : [C(2.2, 0.5), C(-1.2, 0.4)])

const extentCenter = (cps: { re: number; im: number }[]) => {
  const xs = cps.map((p) => p.re), ys = cps.map((p) => p.im)
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
  return { E: Math.max(w, h, 1), cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 }
}
/** Default params for (degS, degD, realD), scaled + centered so the curve fills ~300px. Scaling
 *  sFree by k scales the curve by k² and origin is a uniform translation — both exact. */
function normalizedParams(degS: number, degD: 0 | 1 | 2, realD: boolean): RationalPHExactParams {
  const nFree = degD === 0 ? degS + 1 : degD === 1 ? degS : degS - 1
  const base: RationalPHExactParams = { degS, degD, sFree: S_POOL.slice(0, nFree), roots: rootsFor(degD, realD), origin: { x: 0, y: 0 } }
  const k = Math.sqrt(300 / extentCenter(rationalPHExactFromParams(base).controlPoints).E)
  const scaled: RationalPHExactParams = { ...base, sFree: base.sFree.map((s) => ({ re: s.re * k, im: s.im * k })) }
  const { cx, cy } = extentCenter(rationalPHExactFromParams(scaled).controlPoints)
  return { ...scaled, origin: { x: -cx, y: -cy } }
}

/** (Re)create the exactly-PH rational curve in the scene store for the chosen degrees/family. */
function installCurve(degS: number, degD: 0 | 1 | 2, realD: boolean) {
  const params = normalizedParams(degS, degD, realD)
  const c = rationalPHExactFromParams(params)
  const curve: Curve = {
    id: CURVE_ID,
    kind: 'complex-rational',
    degree: c.degree,
    knots: c.knots,
    controlPoints: c.controlPoints,
    closed: false,
  }
  const meta: RationalPHLinearDMetadata = {
    kind: 'rational-ph-linear-d', degree: c.degree, knots: c.knots, params, realD,
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
interface Stats { markers: number; genMarkers: number; sReduced: number; sGeneral: number; degReduced: number; degGeneral: number; curveDeg: number; cps: number }
function computeStats(meta: RationalPHLinearDMetadata): Stats {
  const c = rationalPHExactFromParams(meta.params)
  const sDeg = c.sReCPs.length - 1, dDeg = c.dReCPs.length - 1
  const sReduced = rationalPHBound(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, dDeg)
  const markers = rationalPHMarkers(c.sReCPs, c.sImCPs, c.sKnots, sDeg, c.dReCPs, c.dImCPs, c.dKnots, dDeg).length
  // general bound + markers: g of the drawable complex-rational curve (positions P, weights D).
  const Pre = c.controlPoints.map((p) => p.re), Pim = c.controlPoints.map((p) => p.im)
  const wre = c.controlPoints.map((p) => p.w_re), wim = c.controlPoints.map((p) => p.w_im)
  const gGen = curvatureExtremaNumeratorComplex(Pre, Pim, wre, wim, c.knots, c.degree)
  const sGeneral = cyclicSignChanges(assignSignsNeighbor(gGen.flatCoeffs()), false)
  const genMarkers = curvatureExtremaMarkers('complex-rational', Pre, Pim, wre, wim, c.knots, c.degree, false).length
  return {
    markers, genMarkers, sReduced, sGeneral,
    degReduced: 4 * sDeg + 2 * dDeg - 2, degGeneral: 4 * c.degree - 6,
    curveDeg: c.degree, cps: c.controlPoints.length,
  }
}

export default function LabRationalPH() {
  const preserve = useSceneStore((s) => s.preserveCurvatureExtrema)
  const setPreserve = useSceneStore((s) => s.setPreserveCurvatureExtrema)
  const [realD, setRealD] = useState(false)
  const [degS, setDegS] = useState(2)
  const [degD, setDegD] = useState<0 | 1 | 2>(1)
  const [stats, setStats] = useState<Stats>({ markers: 0, genMarkers: 0, sReduced: 0, sGeneral: 0, degReduced: 8, degGeneral: 10, curveDeg: 4, cps: 5 })

  // Subscribe to the store for panel readouts (once); bound on by default; clean up on unmount.
  useEffect(() => {
    setPreserve(true)
    const update = () => {
      const meta = useSceneStore.getState().phMetadata.get(CURVE_ID)
      if (meta && meta.kind === 'rational-ph-linear-d') setStats(computeStats(meta))
    }
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

  // (Re)install the curve whenever the family or degrees change.
  useEffect(() => { installCurve(degS, degD, realD) }, [degS, degD, realD])

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
          {degD === 0 ? 'polynomial' : realD ? 'real-rational' : 'complex-rational'} Pythagorean-hodograph curve · a bound on the number of curvature extrema, via the generating function
        </span>
      </header>

      <div className="flex-1 relative min-h-0">
        <SketcherCanvas config={config} />

        <div className="absolute top-3 left-3 w-80 flex flex-col gap-3 bg-white/90 dark:bg-gray-950/90 px-4 py-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 backdrop-blur shadow-lg">
          {/* ── Define z, F, D, S up front so the controls below make sense reading top-to-bottom. ── */}
          <div className="text-[10px] leading-relaxed border-b border-gray-200 dark:border-gray-800 pb-2">
            <p className="font-mono text-[11px] text-gray-700 dark:text-gray-200">z = F/D</p>
            <p className="font-mono mt-0.5 text-gray-600 dark:text-gray-300">F′D − FD′ = S²  ⟹  z′ = (S/D)²</p>
            <p className="mt-1 text-gray-500">
              <span className="font-mono">z</span> is the curve; <span className="font-mono">S</span> the generator you
              shape, <span className="font-mono">D</span> the denominator (its weights). Set the degrees of{' '}
              <span className="font-mono">S</span> and <span className="font-mono">D</span> below —{' '}
              <span className="font-mono">F</span> is then solved exactly, so <span className="font-mono">z</span> is a
              Pythagorean-hodograph curve to machine precision — and the lab bounds its number of curvature extrema.
            </p>
          </div>

          {/* The family is defined by (deg S, deg D); Real/Complex is a refinement of D below. */}
          {/* Generator degree deg S. */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500 dark:text-gray-400">Generator degree <span className="font-mono">deg S</span></span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setDegS((d) => Math.max(2, d - 1))} disabled={degS <= 2}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800">−</button>
              <span className="w-5 text-center font-mono">{degS}</span>
              <button type="button" onClick={() => setDegS((d) => Math.min(4, d + 1))} disabled={degS >= 4}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800">+</button>
            </div>
          </div>
          {/* Denominator degree: constant / linear / quadratic D. */}
          <div className="flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
            {([['Constant D', 0], ['Linear D', 1], ['Quadratic D', 2]] as const).map(([label, d]) => (
              <button key={label} type="button" onClick={() => setDegD(d)}
                className={`flex-1 px-2 py-1.5 transition-colors ${
                  degD === d ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >{label}</button>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 -mt-1.5">
            Curve degree = 2·degS − degD + 1 = <span className="font-mono text-gray-600 dark:text-gray-300">{stats.curveDeg}</span> ({stats.cps} control points).
            {degD === 0 ? ' — polynomial PH (all weights equal); degS=2 is the classic quintic.'
              : stats.curveDeg === 5 ? ' — a rational quintic.' : ''}
          </div>

          {/* Denominator family: D real (real weights) vs D complex (complex weights). Moot at degD=0. */}
          <div className="flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
            {([['Real-rational', true], ['Complex-rational', false]] as const).map(([label, r]) => (
              <button
                key={label}
                type="button"
                disabled={degD === 0}
                onClick={() => setRealD(r)}
                className={`flex-1 px-2 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  realD === r && degD !== 0
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >{label}</button>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 -mt-1.5">
            {degD === 0 ? 'D constant ⇒ all weights equal (a polynomial curve — real/complex is moot).'
              : realD ? 'D real ⇒ real weights (ordinary NURBS).' : 'D complex ⇒ complex weights.'} Same exact-PH construction and Ñ bound.
          </div>

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
            <span className="font-mono">Ñ = Im(S̄²·D̄·K′)</span> — the reduced curvature-extrema numerator, degree{' '}
            {stats.degReduced} vs the general g’s {stats.degGeneral}, so a tighter honest bound. Both obey S⁻ ≥ markers (Law 1).
            {stats.markers === stats.genMarkers
              ? ' The markers equal the drawn curve’s own extrema — the curve is exactly PH, so Ñ is honest.'
              : ' ⚠︎ marker mismatch — the curve has left the PH manifold.'}
          </div>

          <div className="flex">
            <button
              type="button"
              onClick={() => { installCurve(degS, degD, realD); }}
              className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Reset</button>
          </div>
        </div>
      </div>
    </div>
  )
}
