// Rational PH Curvature Lab — a SELF-CONTAINED workbench for rational and complex-rational
// Pythagorean-hodograph curves and their curvature-extrema bound. It owns its own 2D editor
// (pan/zoom/drag), its display, and its drag (core slideABComplexRationalPH); it touches NO
// shared sketcher code, so the /sketcher product stays the clean polynomial-PH introduction.
//
// The point of the page is the GENERATING FUNCTION. A rational PH curve z = A/B has PH
// condition A′B − AB′ = S², which is exactly the numerator of (A/B)′, so the hodograph is a
// perfect square z′ = S²/B². Feeding σ = S/B into the honest curvature-extrema numerator
// collapses it to the reduced Ñ = Im(S̄²·B̄·K′) (degree 4·degS+2·degB−2 = 16, versus the
// general complex-rational Chen g at 44). The curvature-extrema BOUND is S⁻(Ñ), the sign
// changes of Ñ's control polygon — drawn below with its true signs. Turn the bound on and
// dragging holds it (the sliding mechanism); the curve reshapes rather than blocking.
import { useMemo, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  slideABComplexRationalPH, abComplexRationalPHCurveCPs,
  curvatureExtremaReducedNumeratorRationalPH, rationalPHBound, rationalPHMarkers,
  assignSignsNeighbor, ComplexBD, decomposeToBernstein,
  type ABComplexRationalPHGen,
} from '../../core'
import { createABPHFromTwoPoints } from '../optimizer/abPHCurve'

type Family = 'real' | 'ab'
type Pt = { x: number; y: number }
type Box = { x: number; y: number; w: number; h: number }

const dec = decomposeToBernstein
const sDegOf = (g: ABComplexRationalPHGen) => g.sKnots.length - g.sRe.length - 1

// ---- seeds ---------------------------------------------------------------
// Real-rational: createABPHFromTwoPoints yields B ≡ 1 (real).
const realSeed = (): ABComplexRationalPHGen => {
  const m = createABPHFromTwoPoints(140, 250, 500, 250).metadata
  return {
    degree: m.degree, aRe: m.aReCPs, aIm: m.aImCPs, bRe: m.bReCPs, bIm: m.bImCPs,
    sRe: m.sReCPs, sIm: m.sImCPs, knots: m.knots, sKnots: m.sKnots,
  }
}
// AB-complex-rational: a det-1 Möbius A→A, B→γ·A+1 (γ complex) keeps it PH with the SAME S
// but makes B genuinely complex (|γ·A| < 1 so B ≠ 0). Same curve family, non-real weights.
const abSeed = (): ABComplexRationalPHGen => {
  const g = realSeed()
  const gRe = 0.0016, gIm = 0.0009
  const bRe = g.aRe.map((ar, i) => 1 + gRe * ar - gIm * g.aIm[i])
  const bIm = g.aRe.map((ar, i) => gRe * g.aIm[i] + gIm * ar)
  return { ...g, bRe, bIm }
}
const seedFor = (f: Family) => (f === 'ab' ? abSeed() : realSeed())

// ---- sampling z = A/B ----------------------------------------------------
const evalAB = (g: ABComplexRationalPHGen) => {
  const A = new ComplexBD(dec(g.aRe, g.knots, g.degree), dec(g.aIm, g.knots, g.degree))
  const B = new ComplexBD(dec(g.bRe, g.knots, g.degree), dec(g.bIm, g.knots, g.degree))
  return (t: number): Pt => {
    const ar = A.re.evaluate(t), ai = A.im.evaluate(t), br = B.re.evaluate(t), bi = B.im.evaluate(t)
    const d = br * br + bi * bi
    return { x: (ar * br + ai * bi) / d, y: (ai * br - ar * bi) / d }
  }
}
const sampleCurve = (g: ABComplexRationalPHGen, n = 220): Pt[] => {
  const at = evalAB(g)
  return Array.from({ length: n + 1 }, (_, i) => at(i / n))
}
const markerPoints = (g: ABComplexRationalPHGen): Pt[] => {
  const at = evalAB(g)
  return rationalPHMarkers(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree).map(at)
}
const reducedCoeffs = (g: ABComplexRationalPHGen) =>
  curvatureExtremaReducedNumeratorRationalPH(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree).flatCoeffs()
const sMinus = (g: ABComplexRationalPHGen) =>
  rationalPHBound(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree)

// ---- view: render in SCREEN coords (x, −y); the viewBox lives in screen coords too, so
// pan = translate it and zoom = scale it. preserveAspectRatio "meet" keeps the content
// centred and fully contained regardless of the container shape. ------------------------
const sx = (p: Pt) => p.x
const sy = (p: Pt) => -p.y
function fitBox(g: ABComplexRationalPHGen): Box {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of [...sampleCurve(g), ...abComplexRationalPHCurveCPs(g).map((c) => ({ x: c.re, y: c.im }))]) {
    const X = sx(p), Y = sy(p)
    minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y)
  }
  const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1)
  const pad = 0.14 * Math.max(w, h)
  return { x: minX - pad, y: minY - pad, w: w + 2 * pad, h: h + 2 * pad }
}

const GEN_FN: Record<Family, { title: string; lines: string[] }> = {
  real: {
    title: 'Real-rational PH — z = A/B, B real',
    lines: [
      'B real ⇒ the tangent is not rotated: an ordinary rational B-spline.',
      'PH:  A′B − AB′ = S²   ⟹   z′ = S²/B² = σ²,  σ = S/B.',
      'Ñ = Im(S̄²·B̄·K′),  K′ = S·W₁′ − 2·S′·W₁,  W₁ = S′B − SB′.',
    ],
  },
  ab: {
    title: 'AB-complex-rational PH — z = A/B, B complex',
    lines: [
      'B complex ⇒ rotates the tangent: the general complex-rational family.',
      'same PH:  A′B − AB′ = S²   ⟹   z′ = S²/B² = σ²,  σ = S/B (complex).',
      'same Ñ = Im(S̄²·B̄·K′) — degree 16, vs the general Chen g at 44.',
    ],
  },
}

export default function LabRationalPH() {
  const [family, setFamily] = useState<Family>('real')
  const [gen, setGen] = useState<ABComplexRationalPHGen>(() => realSeed())
  const [boundOn, setBoundOn] = useState(true)
  const [drag, setDrag] = useState<number | null>(null)
  const [vb, setVb] = useState<Box>(() => fitBox(realSeed()))
  const svgRef = useRef<SVGSVGElement>(null)
  const panRef = useRef<{ px: number; py: number; vb0: Box } | null>(null)

  const cps = abComplexRationalPHCurveCPs(gen)
  const samples = useMemo(() => sampleCurve(gen), [gen])
  const markers = useMemo(() => markerPoints(gen), [gen])
  const nCoeffs = useMemo(() => reducedCoeffs(gen), [gen])
  const nSigns = useMemo(() => assignSignsNeighbor(nCoeffs), [nCoeffs])
  const bound = useMemo(() => sMinus(gen), [gen])

  const reset = useCallback((f: Family) => {
    const s = seedFor(f); setFamily(f); setGen(s); setVb(fitBox(s)); setDrag(null); panRef.current = null
  }, [])

  // client (pixel) → screen (viewBox) coords — exact under preserveAspectRatio via the CTM.
  const toScreen = (e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current!
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    const l = p.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: l.x, y: l.y }
  }

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (drag !== null) return
    svgRef.current!.setPointerCapture(e.pointerId)
    panRef.current = { px: e.clientX, py: e.clientY, vb0: vb }
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag !== null) {
      const s = toScreen(e)
      const t = { x: s.x, y: -s.y } // screen → curve
      const cur = abComplexRationalPHCurveCPs(gen)
      const targets = cur.map((p, i) => (i === drag ? t : { x: p.re, y: p.im }))
      const weights = cur.map((_, i) => (i === drag ? 10 : i === 0 || i === cur.length - 1 ? 5 : 1))
      setGen(slideABComplexRationalPH(gen, targets, {
        targetWeights: weights, maxIterations: 30, preserveCurvatureExtrema: boundOn, realB: family === 'real',
      }))
      return
    }
    if (panRef.current) {
      const r = svgRef.current!.getBoundingClientRect()
      const { px, py, vb0 } = panRef.current
      const spp = Math.max(vb0.w / r.width, vb0.h / r.height) // screen-units per pixel (meet)
      setVb({ ...vb0, x: vb0.x - (e.clientX - px) * spp, y: vb0.y - (e.clientY - py) * spp })
    }
  }
  const endPointer = () => { setDrag(null); panRef.current = null }
  const zoom = (f: number, center?: Pt) => setVb((b) => {
    const c = center ?? { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    return { x: c.x - (c.x - b.x) * f, y: c.y - (c.y - b.y) * f, w: b.w * f, h: b.h * f }
  })
  const onWheel = (e: React.WheelEvent) => zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, toScreen(e))

  const RP = (p: Pt) => `${sx(p).toFixed(2)},${sy(p).toFixed(2)}`
  const curvePath = 'M ' + samples.map(RP).join(' L ')
  const polyPath = 'M ' + cps.map((c) => RP({ x: c.re, y: c.im })).join(' L ')
  const uu = Math.min(vb.w, vb.h)          // for zoom-invariant marker sizes
  const cpR = 0.016 * uu, mkR = 0.014 * uu

  // Ñ control-polygon mini-plot geometry.
  const NW = 620, NH = 96, npad = 20
  const nMax = Math.max(...nCoeffs.map(Math.abs), 1e-30)
  const nx = (i: number) => npad + (i / Math.max(nCoeffs.length - 1, 1)) * (NW - 2 * npad)
  const ny = (v: number) => NH / 2 - (v / nMax) * (NH / 2 - 10)

  return (
    <div className="h-screen flex flex-col bg-steelblue-900 bg-gradient-to-br from-steelblue-900 to-steelblue-200">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <Link to="/lab" className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400">Lab</Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rational PH Curvature Lab</h1>
        <span className="text-xs text-gray-500 italic">
          curvature-extrema bound on rational &amp; complex-rational PH curves, via their generating function
        </span>
      </header>

      <div className="flex-1 relative min-h-0">
        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full touch-none select-none"
          onPointerDown={onPointerDownBg}
          onPointerMove={onMove}
          onPointerUp={endPointer}
          onPointerLeave={endPointer}
          onWheel={onWheel}
        >
          <path d={polyPath} fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          {markers.map((m, i) => (
            <circle key={`mk${i}`} cx={sx(m)} cy={sy(m)} r={mkR} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          ))}
          {cps.map((c, i) => (
            <circle
              key={`cp${i}`} cx={sx({ x: c.re, y: c.im })} cy={sy({ x: c.re, y: c.im })} r={drag === i ? cpR * 1.3 : cpR}
              fill={drag === i ? '#2563eb' : '#fff'} stroke="#2563eb" strokeWidth={2} vectorEffect="non-scaling-stroke"
              className="cursor-grab"
              onPointerDown={(e) => { e.stopPropagation(); (e.target as Element).setPointerCapture(e.pointerId); setDrag(i) }}
            />
          ))}
        </svg>

        {/* floating controls (LabPH2D style) */}
        <div className="absolute top-3 left-3 w-72 flex flex-col gap-3 bg-white/90 dark:bg-gray-950/90 px-4 py-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 backdrop-blur shadow-lg">
          <div>
            <div className="font-semibold mb-1">Family</div>
            <div className="flex flex-col gap-1">
              {(['real', 'ab'] as Family[]).map((f) => (
                <button
                  key={f} type="button" onClick={() => reset(f)}
                  className={`px-2.5 py-1 rounded border text-left text-[11px] ${family === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  {f === 'real' ? 'real-rational — B real' : 'complex-rational — B complex'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-gray-200 dark:border-gray-800">
            <input type="checkbox" checked={boundOn} onChange={(e) => setBoundOn(e.target.checked)} />
            <span className="font-semibold">{boundOn ? 'Bounding' : 'Free'} curvature extrema</span>
          </label>
          <div className="text-[10px] text-gray-400 -mt-1.5">
            {boundOn ? 'live — dragging holds S⁻(Ñ); the curve reshapes, never blocks.' : 'off — drag freely; watch S⁻ and the markers change.'}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">Bound  S⁻(Ñ)</span>
            <span className="font-mono text-lg text-gray-900 dark:text-gray-100">{bound}</span>
          </div>
          <div className="flex items-center justify-between -mt-1">
            <span className="text-gray-500 dark:text-gray-400">Curvature-extrema markers</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">{markers.length}</span>
          </div>
          <div className="text-[10px] text-gray-400 -mt-1">Law 1: S⁻(Ñ) ≥ markers, always.</div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={() => zoom(1 / 1.25)} className="w-7 h-7 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-mono">+</button>
            <button type="button" onClick={() => zoom(1.25)} className="w-7 h-7 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-mono">−</button>
            <button type="button" onClick={() => setVb(fitBox(gen))} className="px-2 h-7 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Fit</button>
            <button type="button" onClick={() => reset(family)} className="px-2 h-7 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 ml-auto">Reset</button>
          </div>
          <div className="text-[10px] text-gray-400 -mt-1">Drag control points · scroll or +/− to zoom · drag background to pan.</div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{GEN_FN[family].title}</div>
            {GEN_FN[family].lines.map((l, i) => <p key={i} className="mb-0.5 font-mono text-[10px] leading-snug">{l}</p>)}
          </div>
        </div>
      </div>

      {/* Ñ control polygon (the honest bound: sign changes of these coefficients) */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70">
        <div className="text-[11px] text-gray-600 dark:text-gray-300 mb-0.5">
          Reduced numerator Ñ control polygon — <span className="text-emerald-600">positive</span> /{' '}
          <span className="text-rose-600">negative</span> coefficients; sign changes (S⁻ = {bound}) bound the curvature extrema.
        </div>
        <svg viewBox={`0 0 ${NW} ${NH}`} preserveAspectRatio="none" className="w-full h-20">
          <line x1={npad} y1={NH / 2} x2={NW - npad} y2={NH / 2} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
          <path d={'M ' + nCoeffs.map((c, i) => `${nx(i).toFixed(1)},${ny(c).toFixed(1)}`).join(' L ')} fill="none" stroke="#94a3b8" strokeWidth={1.5} />
          {/* assignSignsNeighbor maps v>0 → −1, so a POSITIVE coeff (green) is sign −1;
              using it (not raw Math.sign) fills structural-zeros to match the S⁻ count. */}
          {nCoeffs.map((c, i) => (
            <circle key={i} cx={nx(i)} cy={ny(c)} r={4} fill={nSigns[i] < 0 ? '#059669' : '#e11d48'} />
          ))}
        </svg>
      </div>
    </div>
  )
}
