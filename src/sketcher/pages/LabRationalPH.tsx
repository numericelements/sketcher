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
import type { Curve } from '../types/curve'
import { createABPHFromTwoPoints, computeABPHCurve, type ABPHMetadata } from '../optimizer/abPHCurve'
import {
  rationalPHBound, rationalPHMarkers, complexCurvatureConstraintState,
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

// A rational PH curve with COMPLEX weights B: start from createABPHFromTwoPoints (which gives
// B ≡ 1) and apply a det-1 Möbius A→A, B→γ·A+1 (γ complex) — this keeps it PH with the SAME S
// (the Wronskian scales by αδ−βγ = 1) but makes B genuinely complex. |γ·A| < 1 so B ≠ 0.
function rationalPHMeta(): ABPHMetadata {
  const m = createABPHFromTwoPoints(-180, 60, 180, 60).metadata
  const gRe = 0.0016, gIm = 0.0009
  return {
    ...m,
    bReCPs: m.aReCPs.map((ar, i) => 1 + gRe * ar - gIm * m.aImCPs[i]),
    bImCPs: m.aReCPs.map((ar, i) => gRe * m.aImCPs[i] + gIm * ar),
  }
}

/** (Re)create the rational PH curve in the scene store. */
function installCurve() {
  const meta = rationalPHMeta()
  const built = computeABPHCurve(meta)
  const curve: Curve = {
    id: CURVE_ID,
    kind: 'complex-rational',
    degree: meta.degree,
    knots: meta.knots,
    controlPoints: built.controlPoints,
    closed: false,
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

// The two upper bounds on the curvature-extrema count, from the live (A,B,S) metadata:
//   Ñ  — the generating-function reduced numerator (degree 16), and
//   Chen g — the general complex-rational numerator (degree 44).
// Both satisfy Law 1 (S⁻ ≥ #markers); Ñ is the tighter one.
interface Stats { markers: number; sReduced: number; sGeneral: number; degReduced: number }
function computeStats(meta: ABPHMetadata): Stats {
  const sDeg = meta.sKnots.length - meta.sReCPs.length - 1
  const sReduced = rationalPHBound(meta.sReCPs, meta.sImCPs, meta.sKnots, sDeg, meta.bReCPs, meta.bImCPs, meta.knots, meta.degree)
  const markers = rationalPHMarkers(meta.sReCPs, meta.sImCPs, meta.sKnots, sDeg, meta.bReCPs, meta.bImCPs, meta.knots, meta.degree).length
  // general bound: g of the drawable complex-rational curve (positions P = A/B, weights B).
  const n = meta.aReCPs.length
  const Pre: number[] = [], Pim: number[] = []
  for (let i = 0; i < n; i++) {
    const b2 = meta.bReCPs[i] ** 2 + meta.bImCPs[i] ** 2
    Pre.push((meta.aReCPs[i] * meta.bReCPs[i] + meta.aImCPs[i] * meta.bImCPs[i]) / b2)
    Pim.push((meta.aImCPs[i] * meta.bReCPs[i] - meta.aReCPs[i] * meta.bImCPs[i]) / b2)
  }
  const gen = complexCurvatureConstraintState(Pre, Pim, meta.bReCPs, meta.bImCPs, meta.knots, meta.degree, false)
  const sGeneral = cyclicSignChanges(assignSignsNeighbor(gen.gCPs), false)
  return { markers, sReduced, sGeneral, degReduced: 4 * sDeg + 2 * meta.degree - 2 }
}

export default function LabRationalPH() {
  const preserve = useSceneStore((s) => s.preserveCurvatureExtrema)
  const setPreserve = useSceneStore((s) => s.setPreserveCurvatureExtrema)
  const [stats, setStats] = useState<Stats>({ markers: 0, sReduced: 0, sGeneral: 0, degReduced: 16 })

  // Create the curve on mount (bound on by default); recompute the panel readouts from the
  // live metadata on every store change; clean up on unmount.
  useEffect(() => {
    installCurve()
    setPreserve(true)
    const update = () => {
      const meta = useSceneStore.getState().phMetadata.get(CURVE_ID)
      if (meta && meta.kind === 'ab-complex-rational') setStats(computeStats(meta))
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
            Ñ has degree {stats.degReduced} vs the general g’s 44 — fewer coefficients, a tighter honest bound.
            Both obey S⁻ ≥ markers (Law 1).
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
            <p className="font-mono">z = A/B,  A′B − AB′ = S²  ⟹  z′ = S²/B² = σ²,  σ = S/B.</p>
            <p className="font-mono mt-0.5">Ñ = Im(S̄²·B̄·K′),  K′ = S·W₁′ − 2·S′·W₁,  W₁ = S′B − SB′.</p>
            <p className="mt-1 text-gray-500">
              Drag the control points — the curve re-solves to stay a true PH curve. Turn on{' '}
              <span className="font-semibold">Bounding curvature extrema</span> and the number of extrema can only hold or drop.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
