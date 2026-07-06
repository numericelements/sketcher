// Rational PH Curvature Lab — a SELF-CONTAINED workbench for rational and complex-rational
// Pythagorean-hodograph curves and their curvature-extrema bound. It owns its own 2D editor,
// its display, and its drag (core slideABComplexRationalPH); it touches NO shared sketcher
// code, so the /sketcher product stays the clean polynomial-PH introduction.
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
type Pt = { x: number; y: number }
function sampleCurve(g: ABComplexRationalPHGen, n = 200): Pt[] {
  const A = new ComplexBD(dec(g.aRe, g.knots, g.degree), dec(g.aIm, g.knots, g.degree))
  const B = new ComplexBD(dec(g.bRe, g.knots, g.degree), dec(g.bIm, g.knots, g.degree))
  const at = (t: number): Pt => {
    const ar = A.re.evaluate(t), ai = A.im.evaluate(t), br = B.re.evaluate(t), bi = B.im.evaluate(t)
    const d = br * br + bi * bi
    return { x: (ar * br + ai * bi) / d, y: (ai * br - ar * bi) / d }
  }
  return Array.from({ length: n + 1 }, (_, i) => at(i / n))
}
const markerPoints = (g: ABComplexRationalPHGen): Pt[] => {
  const A = new ComplexBD(dec(g.aRe, g.knots, g.degree), dec(g.aIm, g.knots, g.degree))
  const B = new ComplexBD(dec(g.bRe, g.knots, g.degree), dec(g.bIm, g.knots, g.degree))
  return rationalPHMarkers(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree).map((t) => {
    const ar = A.re.evaluate(t), ai = A.im.evaluate(t), br = B.re.evaluate(t), bi = B.im.evaluate(t)
    const d = br * br + bi * bi
    return { x: (ar * br + ai * bi) / d, y: (ai * br - ar * bi) / d }
  })
}
const reducedCoeffs = (g: ABComplexRationalPHGen) =>
  curvatureExtremaReducedNumeratorRationalPH(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree).flatCoeffs()
const sMinus = (g: ABComplexRationalPHGen) =>
  rationalPHBound(g.sRe, g.sIm, g.sKnots, sDegOf(g), g.bRe, g.bIm, g.knots, g.degree)

// ---- view transform (curve space → SVG), fit once per family -------------
const VB = { w: 640, h: 420 }
function fitTransform(cps: { x: number; y: number }[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of cps) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) }
  const pad = 70
  const s = Math.min((VB.w - 2 * pad) / Math.max(maxX - minX, 1), (VB.h - 2 * pad) / Math.max(maxY - minY, 1))
  const ox = pad - s * minX, oy = VB.h - pad + s * minY // y-flip
  return {
    toView: (p: Pt) => ({ X: ox + s * p.x, Y: oy - s * p.y }),
    toCurve: (X: number, Y: number) => ({ x: (X - ox) / s, y: (oy - Y) / s }),
  }
}

const GEN_FN: Record<Family, { title: string; lines: string[] }> = {
  real: {
    title: 'Real-rational PH — z = A/B, B real',
    lines: [
      'weights B are real, so the tangent is not rotated: an ordinary rational B-spline.',
      "PH condition  A′B − AB′ = S²   ⟹   hodograph  z′ = S²/B² = σ²,  σ = S/B.",
      'reduced curvature-extrema numerator  Ñ = Im(S̄²·B̄·K′),  K′ = S·W₁′ − 2·S′·W₁,  W₁ = S′B − SB′.',
    ],
  },
  ab: {
    title: 'AB-complex-rational PH — z = A/B, B complex',
    lines: [
      'complex weights B rotate the tangent: the general complex-rational PH family.',
      "same PH condition  A′B − AB′ = S²   ⟹   z′ = S²/B² = σ²,  σ = S/B (now fully complex).",
      'same reduced numerator  Ñ = Im(S̄²·B̄·K′)  — degree 4·degS + 2·degB − 2 = 16, vs the general Chen g at 44.',
    ],
  },
}

export default function LabRationalPH() {
  const [family, setFamily] = useState<Family>('real')
  const [gen, setGen] = useState<ABComplexRationalPHGen>(() => realSeed())
  const [boundOn, setBoundOn] = useState(true)
  const [drag, setDrag] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Fit is stable per family (recomputed only on switch/reset), so the frame doesn't jump.
  const view = useMemo(() => fitTransform(abComplexRationalPHCurveCPs(seedFor(family))), [family])

  const cps = abComplexRationalPHCurveCPs(gen)
  const samples = useMemo(() => sampleCurve(gen), [gen])
  const markers = useMemo(() => markerPoints(gen), [gen])
  const nCoeffs = useMemo(() => reducedCoeffs(gen), [gen])
  const nSigns = useMemo(() => assignSignsNeighbor(nCoeffs), [nCoeffs])
  const bound = useMemo(() => sMinus(gen), [gen])

  const reset = useCallback((f: Family) => { setFamily(f); setGen(seedFor(f)) }, [])

  const evToCurve = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const r = svg.getBoundingClientRect()
    const X = ((e.clientX - r.left) / r.width) * VB.w
    const Y = ((e.clientY - r.top) / r.height) * VB.h
    return view.toCurve(X, Y)
  }

  const onMove = (e: React.PointerEvent) => {
    if (drag === null) return
    const t = evToCurve(e)
    const cur = abComplexRationalPHCurveCPs(gen)
    const targets = cur.map((p, i) => (i === drag ? { x: t.x, y: t.y } : { x: p.re, y: p.im }))
    const weights = cur.map((_, i) => (i === drag ? 10 : i === 0 || i === cur.length - 1 ? 5 : 1))
    setGen(slideABComplexRationalPH(gen, targets, {
      targetWeights: weights, maxIterations: 30, preserveCurvatureExtrema: boundOn, realB: family === 'real',
    }))
  }

  const P = (p: Pt) => { const v = view.toView(p); return `${v.X.toFixed(1)},${v.Y.toFixed(1)}` }
  const curvePath = 'M ' + samples.map(P).join(' L ')
  const polyPath = 'M ' + cps.map((c) => P({ x: c.re, y: c.im })).join(' L ')

  // Ñ control-polygon mini-plot geometry.
  const NW = 620, NH = 120, npad = 22
  const nMax = Math.max(...nCoeffs.map(Math.abs), 1e-30)
  const nx = (i: number) => npad + (i / Math.max(nCoeffs.length - 1, 1)) * (NW - 2 * npad)
  const ny = (v: number) => NH / 2 - (v / nMax) * (NH / 2 - 12)

  return (
    <div className="min-h-screen flex flex-col bg-steelblue-900 bg-gradient-to-br from-steelblue-900 to-steelblue-200">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-white/10">
        <Link to="/lab" className="text-sm text-blue-200 hover:text-white">Lab</Link>
        <h1 className="text-lg font-semibold text-white">Rational PH Curvature Lab</h1>
        <span className="text-xs text-white/60 italic">
          curvature-extrema bound on rational &amp; complex-rational PH curves, via their generating function
        </span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* editor */}
        <div className="flex-1 relative min-h-0 flex items-center justify-center p-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            className="w-full h-full max-h-[70vh] touch-none select-none rounded-lg bg-white/90 dark:bg-gray-950/90 shadow-lg"
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
            onPointerLeave={() => setDrag(null)}
          >
            <path d={polyPath} fill="none" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 3" />
            <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth={2.5} />
            {markers.map((m, i) => { const v = view.toView(m); return <circle key={`mk${i}`} cx={v.X} cy={v.Y} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} /> })}
            {cps.map((c, i) => {
              const v = view.toView({ x: c.re, y: c.im })
              return (
                <circle
                  key={`cp${i}`} cx={v.X} cy={v.Y} r={drag === i ? 8 : 6}
                  fill={drag === i ? '#2563eb' : '#fff'} stroke="#2563eb" strokeWidth={2}
                  className="cursor-grab" style={{ touchAction: 'none' }}
                  onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); setDrag(i) }}
                />
              )
            })}
          </svg>
        </div>

        {/* controls */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-3 p-3">
          <div className="bg-white/90 dark:bg-gray-950/90 rounded-lg px-4 py-3 text-xs text-gray-700 dark:text-gray-300 shadow-lg flex flex-col gap-3">
            <div>
              <div className="font-semibold mb-1">Family</div>
              <div className="flex gap-2">
                {(['real', 'ab'] as Family[]).map((f) => (
                  <button
                    key={f} type="button" onClick={() => reset(f)}
                    className={`px-2.5 py-1 rounded border text-[11px] ${family === f ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    {f === 'real' ? 'real-rational (B real)' : 'complex-rational (B complex)'}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-gray-200 dark:border-gray-800">
              <input type="checkbox" checked={boundOn} onChange={(e) => setBoundOn(e.target.checked)} />
              <span className="font-semibold">{boundOn ? 'Bounding' : 'Free'} curvature extrema</span>
            </label>
            <div className="text-[10px] text-gray-400 -mt-1">
              {boundOn ? 'live — dragging holds S⁻(Ñ); the curve reshapes, never blocks.' : 'off — drag freely; watch S⁻ and the markers change.'}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Bound  S⁻(Ñ)</span>
              <span className="font-mono text-lg text-gray-900 dark:text-gray-100">{bound}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Curvature-extrema markers</span>
              <span className="font-mono text-gray-800 dark:text-gray-200">{markers.length}</span>
            </div>
            <div className="text-[10px] text-gray-400">Law 1: S⁻(Ñ) ≥ markers, always.</div>

            <button
              type="button" onClick={() => reset(family)}
              className="mt-1 self-start px-2.5 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >Reset</button>
          </div>

          <div className="bg-white/90 dark:bg-gray-950/90 rounded-lg px-4 py-3 text-[11px] text-gray-600 dark:text-gray-300 shadow-lg leading-relaxed">
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{GEN_FN[family].title}</div>
            {GEN_FN[family].lines.map((l, i) => <p key={i} className="mb-1 font-mono text-[10.5px]">{l}</p>)}
          </div>
        </div>
      </div>

      {/* Ñ control polygon (the honest bound: sign changes of these coefficients) */}
      <div className="px-4 pb-3">
        <div className="bg-white/90 dark:bg-gray-950/90 rounded-lg px-3 py-2 shadow-lg">
          <div className="text-[11px] text-gray-600 dark:text-gray-300 mb-1">
            Reduced numerator Ñ control polygon — <span className="text-emerald-600">positive</span> /{' '}
            <span className="text-rose-600">negative</span> coefficients; sign changes (S⁻ = {bound}) bound the curvature extrema.
          </div>
          <svg viewBox={`0 0 ${NW} ${NH}`} className="w-full h-24">
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
    </div>
  )
}
