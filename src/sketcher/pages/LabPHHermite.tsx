// ============================================================================
// PH Quintic Interpolation Workbench — rungs 1 and 2 of the interpolation ladder.
//
// You drag FOUR prescribed control points; the other two are DETERMINED, because
// a PH quintic has 8 real DOF (generator w₀,w₁,w₂ + start point) and each
// prescribed control point costs 2. Four is therefore the square system — you
// cannot prescribe more, and that is the codimension of the PH variety, not a
// solver limitation.
//
// C¹ Hermite data is the SPECIAL CASE subset {0,1,4,5}: p₁ = p₀ + d₀/5 and
// p₄ = p₅ − d₁/5, so dragging those four control points IS prescribing position
// and tangent at both ends. That subset has the classical FOUR solutions and a
// closed form (core/phQuinticHermite.ts). Every other subset goes through the
// general Newton solver (core/phSubsetInterp.ts) — and on {0,1,4,5} you can flip
// to the general solver and watch it find the same four curves. That agreement
// is the oracle relationship the whole ladder rests on.
//
// Nothing here is constrained or optimised: no curvature bound, no extrema
// count. This lab is about exact interpolation and understanding the solution
// structure.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { type Complex, csub, cscale } from '../../core/complex'
import {
  type PHQuinticGenerator,
  phQuinticHermite,
  controlPoints as cpsOf,
  curveAt,
  speedAt,
  curvatureAt,
  elasticEnergy,
  generatorHullMargin,
} from '../../core/phQuinticHermite'
import {
  solvePHSubset,
  allFourSubsets,
  subsetTable,
  countDirectSquares,
  isTriangularSubset,
} from '../../core/phSubsetInterp'

// ---------------------------------------------------------------------------
// A display-normalised solution (the two solvers return different shapes)
// ---------------------------------------------------------------------------
interface Sol {
  generator: PHQuinticGenerator
  cps: Complex[]
  p0: Complex
  rotationIndex: number
  elasticEnergy: number
  arcLength: number
  speedLowerBound: number
  hullMargin: number
  minSpeed: number
}

const HERMITE_SUBSET = [0, 1, 4, 5]
const sameSubset = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i])

/** Sort by fairness (absolute rotation index), pushing non-finite values last. */
const byFairness = (a: Sol, b: Sol): number => {
  const va = Number.isFinite(a.rotationIndex) ? a.rotationIndex : Infinity
  const vb = Number.isFinite(b.rotationIndex) ? b.rotationIndex : Infinity
  return va - vb
}

// A reference curve to start from — a regular PH quintic with some real shape.
const START_GEN: PHQuinticGenerator = {
  w0: { re: 2.6, im: 0.4 },
  w1: { re: 0.2, im: 2.4 },
  w2: { re: 2.2, im: -1.0 },
}
const START_P0: Complex = { re: 0.6, im: 1.0 }

// SVG geometry — a fixed world box so dragging never rescales under the cursor.
const W = 640
const H = 470
const WORLD = { x0: -0.6, x1: 4.0, y0: -0.4, y1: 4.4 }
const sx = (x: number): number => ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * W
const sy = (y: number): number => H - ((y - WORLD.y0) / (WORLD.y1 - WORLD.y0)) * H
const wx = (px: number): number => WORLD.x0 + (px / W) * (WORLD.x1 - WORLD.x0)
const wy = (py: number): number => WORLD.y0 + ((H - py) / H) * (WORLD.y1 - WORLD.y0)

// Small plot box for σ(t) and κ(t)
const PW = 640
const PH_ = 130
const PPAD = { l: 46, r: 10, t: 12, b: 22 }

const COLORS = {
  selected: '#2563eb',
  other: '#94a3b8',
  prescribed: '#dc2626',
  determined: '#0d9488',
  polygon: '#64748b',
  generator: '#a855f7',
  sigma: '#0ea5e9',
  kappa: '#f59e0b',
}

export default function LabPHHermite() {
  // The prescribed indices and their target positions (aligned arrays).
  const [subset, setSubset] = useState<number[]>(HERMITE_SUBSET)
  const [targets, setTargets] = useState<Complex[]>(() => {
    const cps = cpsOf(START_GEN, START_P0)
    return HERMITE_SUBSET.map((i) => cps[i])
  })
  const [rank, setRank] = useState(0)
  const [useGeneral, setUseGeneral] = useState(false)
  const [showAll, setShowAll] = useState(true)
  const [showGenerator, setShowGenerator] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [starts, setStarts] = useState(200)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragIdx = useRef<number | null>(null)

  const isHermite = sameSubset(subset, HERMITE_SUBSET)
  const usingClosedForm = isHermite && !useGeneral

  // ---------------------------------------------------------------------------
  // Solve
  // ---------------------------------------------------------------------------
  const { solutions, converged } = useMemo(() => {
    if (usingClosedForm) {
      // Rung 1: closed form. Recover the C¹ data from the prescribed CPs.
      const [p0, p1cp, p4cp, p5] = targets
      const sols = phQuinticHermite({
        p0,
        d0: cscale(csub(p1cp, p0), 5),
        p1: p5,
        d1: cscale(csub(p5, p4cp), 5),
      }).map<Sol>((s) => ({
        generator: s.generator,
        cps: s.controlPoints,
        p0,
        rotationIndex: s.rotationIndex,
        elasticEnergy: s.elasticEnergy,
        arcLength: s.arcLength,
        speedLowerBound: s.speedLowerBound,
        hullMargin: generatorHullMargin(s.generator),
        minSpeed: s.minSpeed,
      }))
      return { solutions: sols.sort(byFairness), converged: sols.length }
    }
    // Rung 2: general Newton enumeration.
    const res = solvePHSubset(subset, targets, { starts })
    const sols = res.solutions.map<Sol>((s) => ({
      generator: s.generator,
      cps: s.controlPoints,
      p0: s.p0,
      rotationIndex: s.rotationIndex,
      elasticEnergy: elasticEnergy(s.generator),
      arcLength: s.arcLength,
      speedLowerBound: s.speedLowerBound,
      hullMargin: generatorHullMargin(s.generator),
      minSpeed: s.minSpeed,
    }))
    return { solutions: sols.sort(byFairness), converged: res.converged }
  }, [subset, targets, usingClosedForm, starts])

  const selected = solutions[Math.min(rank, Math.max(0, solutions.length - 1))]

  // ---------------------------------------------------------------------------
  // Dragging a prescribed control point
  // ---------------------------------------------------------------------------
  const eventWorld = (e: React.PointerEvent): Complex => {
    const svg = svgRef.current
    if (!svg) return { re: 0, im: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    const p = ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 }
    return { re: wx(p.x), im: wy(p.y) }
  }
  const onPointDown = (k: number) => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragIdx.current = k
  }
  const onMove = (e: React.PointerEvent) => {
    if (dragIdx.current === null) return
    const p = eventWorld(e)
    setTargets((t) => t.map((v, i) => (i === dragIdx.current ? p : v)))
  }
  const onUp = () => {
    dragIdx.current = null
  }

  /** Switch subset, taking the new targets from the currently displayed curve. */
  const chooseSubset = (next: number[]) => {
    const cps = selected?.cps ?? cpsOf(START_GEN, START_P0)
    setSubset(next)
    setTargets(next.map((i) => cps[i]))
    setRank(0)
  }

  const reset = () => {
    const cps = cpsOf(START_GEN, START_P0)
    setSubset(HERMITE_SUBSET)
    setTargets(HERMITE_SUBSET.map((i) => cps[i]))
    setRank(0)
  }

  // ---------------------------------------------------------------------------
  // Sampled geometry
  // ---------------------------------------------------------------------------
  const samplePath = (s: Sol): string => {
    const N = 160
    let d = ''
    for (let i = 0; i <= N; i++) {
      const p = curveAt(s.generator, s.p0, i / N)
      d += `${i ? 'L' : 'M'} ${sx(p.re).toFixed(2)} ${sy(p.im).toFixed(2)} `
    }
    return d
  }

  const plots = useMemo(() => {
    if (!selected) return null
    const N = 200
    const ts: number[] = []
    const sig: number[] = []
    const kap: number[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      ts.push(t)
      sig.push(speedAt(selected.generator, t))
      kap.push(curvatureAt(selected.generator, t))
    }
    return { ts, sig, kap, sigMax: Math.max(...sig, 1e-9), kapAbs: Math.max(...kap.map(Math.abs), 1e-9) }
  }, [selected])

  const plotPath = (vals: number[], scale: number, centred: boolean): string => {
    const iw = PW - PPAD.l - PPAD.r
    const ih = PH_ - PPAD.t - PPAD.b
    return vals
      .map((v, i) => {
        const x = PPAD.l + (i / (vals.length - 1)) * iw
        const y = centred
          ? PPAD.t + ih / 2 - (v / scale) * (ih / 2)
          : PPAD.t + ih - (v / scale) * ih
        return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  const table = useMemo(() => {
    if (!showTable || !selected) return null
    return subsetTable(selected.generator, selected.p0, { starts: 120 })
  }, [showTable, selected])

  const fmt = (v: number, d = 3): string => (Number.isFinite(v) ? v.toFixed(d) : '—')

  return (
    <div className="min-h-screen flex flex-col bg-steelblue-900 bg-gradient-to-br from-steelblue-900 to-steelblue-200">
      <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <Link to="/lab" className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400">Lab</Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">PH Quintic Interpolation Workbench</h1>
        <span className="text-xs text-gray-500 italic">
          prescribe 4 of 6 control points · C¹ Hermite is the subset {'{0,1,4,5}'} · no constraints, no optimiser
        </span>
      </header>

      <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
        {/* ----------------------------------------------------------------- */}
        {/* Controls                                                          */}
        {/* ----------------------------------------------------------------- */}
        <div className="w-full lg:w-80 shrink-0 overflow-auto lg:border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <div className="font-semibold mb-1">Prescribed control points</div>
            <div className="font-mono text-xs mb-1">
              {'{'}{subset.join(', ')}{'}'} — {countDirectSquares(subset)} end square
              {countDirectSquares(subset) === 1 ? '' : 's'}
              {isTriangularSubset(subset) ? ', triangular' : ''}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {allFourSubsets().map((s) => {
                const active = sameSubset(s, subset)
                return (
                  <button
                    key={s.join()}
                    onClick={() => chooseSubset(s)}
                    className={`px-1 py-1 rounded font-mono text-[11px] ${
                      active
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={sameSubset(s, HERMITE_SUBSET) ? 'C¹ Hermite data' : undefined}
                  >
                    {s.join('')}
                    {sameSubset(s, HERMITE_SUBSET) ? '*' : ''}
                  </button>
                )
              })}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              * = C¹ Hermite. 8 real DOF, 2 per point ⇒ 4 is the square system; you cannot prescribe more.
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="font-semibold mb-1">Solver</div>
            {isHermite ? (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={useGeneral} onChange={(e) => setUseGeneral(e.target.checked)} />
                <span>Use the general Newton solver</span>
              </label>
            ) : (
              <div className="text-[11px] text-gray-400">
                general Newton solver (closed form exists only for the Hermite subset)
              </div>
            )}
            <div className="text-[11px] text-gray-400 mt-1">
              {usingClosedForm
                ? 'closed form: w₀,w₂ = ±√d, then one complex quadratic in w₁ ⇒ exactly 4'
                : `Newton in ℂ³ from ${starts} random starts, deduped mod w → −w`}
            </div>
            {isHermite && useGeneral && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                cross-check: this should find the same 4 curves as the closed form.
              </div>
            )}
            {!usingClosedForm && (
              <label className="block mt-2">
                <span className="text-[11px] text-gray-400">random starts: {starts}</span>
                <input
                  type="range"
                  min={50}
                  max={600}
                  step={50}
                  value={starts}
                  onChange={(e) => setStarts(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            )}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="font-semibold mb-1">
              Solutions found: {solutions.length}
              {!usingClosedForm && <span className="text-gray-400 font-normal"> ({converged} starts converged)</span>}
            </div>
            <div className="flex gap-1 flex-wrap">
              {solutions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setRank(i)}
                  className={`px-2 py-1 rounded text-xs ${
                    i === rank
                      ? 'bg-blue-500 text-white'
                      : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title={`R = ${fmt(s.rotationIndex)}`}
                >
                  #{i}
                  {i === 0 ? ' ★' : ''}
                  {s.speedLowerBound > 0 ? '' : ' ⚠'}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              sorted by absolute rotation index R = ∫|κ| ds, so ★ (#0) is the “good” one the literature
              selects. ⚠ = not certified cusp-free.
            </div>
          </div>

          {selected && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 font-mono text-[11px] leading-relaxed">
              <div className="font-sans font-semibold mb-1 text-sm">Selected solution #{rank}</div>
              <div>R = ∫|κ|ds = {fmt(selected.rotationIndex)}</div>
              <div>E = ∫κ²ds&nbsp;&nbsp; = {fmt(selected.elasticEnergy)}</div>
              <div>arc length = {fmt(selected.arcLength)} <span className="font-sans text-gray-400">(exact)</span></div>
              <div>min σ (sampled) = {fmt(selected.minSpeed)}</div>
              <div>hull margin = {fmt(selected.hullMargin)}</div>
              <div className={selected.speedLowerBound > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                σ ≥ {fmt(selected.speedLowerBound)} {selected.speedLowerBound > 0 ? '⇒ certified cusp-free' : '⇒ not certified'}
              </div>
              <div className="font-sans text-gray-400 mt-1">
                the certificate is the convex hull: if the origin is outside the generator polygon
                {' '}{'{w₀,w₁,w₂}'} then w ≠ 0, so no cusp, and σ ≥ margin².
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              <span>Draw all solutions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showGenerator} onChange={(e) => setShowGenerator(e.target.checked)} />
              <span>Show generator polygon w</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showTable} onChange={(e) => setShowTable(e.target.checked)} />
              <span>Show the 4-of-6 table</span>
            </label>
            <button
              onClick={reset}
              className="mt-1 self-start px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Reset
            </button>
          </div>

          {table && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="font-semibold mb-1">Solutions per subset</div>
              <div className="text-[11px] text-gray-400 mb-1">
                for the curve currently selected. Counts are found by enumeration — a lower bound, not a
                theorem.
              </div>
              <table className="font-mono text-[11px] w-full">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left">S</th>
                    <th className="text-right">n</th>
                    <th className="text-right">reg</th>
                    <th className="text-right">cond</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr
                      key={r.subset.join()}
                      className={sameSubset(r.subset, subset) ? 'bg-blue-500/15 font-bold' : ''}
                    >
                      <td className="cursor-pointer hover:underline" onClick={() => chooseSubset([...r.subset])}>
                        {r.subset.join('')}
                        {r.isTriangular ? '△' : ''}
                      </td>
                      <td className="text-right">{r.solutionCount}</td>
                      <td className="text-right">{r.certifiedRegularCount}</td>
                      <td className="text-right">{r.bestConditionProxy.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11px] text-gray-400 mt-1">
                △ = triangular (provably unique). Counts are symmetric under S → 5−S, because t → 1−t
                reverses the curve and swaps w₀ ↔ w₂.
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Canvas                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-1 min-w-0 p-3 flex flex-col items-center gap-2">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full max-w-[680px] bg-white/85 dark:bg-gray-900/70 rounded touch-none"
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {/* the non-selected interpolants, faint */}
            {showAll &&
              solutions.map((s, i) =>
                i === rank ? null : (
                  <path key={`o${i}`} d={samplePath(s)} fill="none" stroke={COLORS.other} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.75} />
                ),
              )}

            {selected && (
              <>
                {/* control polygon of the selected solution */}
                <polyline
                  points={selected.cps.map((p) => `${sx(p.re)},${sy(p.im)}`).join(' ')}
                  fill="none"
                  stroke={COLORS.polygon}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
                {/* the generator polygon, drawn about the origin */}
                {showGenerator && (
                  <>
                    <polyline
                      points={[selected.generator.w0, selected.generator.w1, selected.generator.w2]
                        .map((p) => `${sx(p.re)},${sy(p.im)}`)
                        .join(' ')}
                      fill="none"
                      stroke={COLORS.generator}
                      strokeWidth={1.2}
                      opacity={0.85}
                    />
                    {[selected.generator.w0, selected.generator.w1, selected.generator.w2].map((p, i) => (
                      <circle key={`w${i}`} cx={sx(p.re)} cy={sy(p.im)} r={3} fill={COLORS.generator} opacity={0.9} />
                    ))}
                    {/* the origin — the cusp locus for w */}
                    <circle cx={sx(0)} cy={sy(0)} r={4} fill="none" stroke={COLORS.generator} strokeWidth={1.2} />
                    <text x={sx(0) + 7} y={sy(0) + 4} fontSize={10} fill={COLORS.generator}>
                      0 (cusp ⇔ w = 0)
                    </text>
                  </>
                )}
                {/* the selected curve */}
                <path d={samplePath(selected)} fill="none" stroke={COLORS.selected} strokeWidth={2.4} />
                {/* determined (following) control points */}
                {selected.cps.map((p, i) =>
                  subset.includes(i) ? null : (
                    <g key={`d${i}`}>
                      <circle cx={sx(p.re)} cy={sy(p.im)} r={5} fill="white" stroke={COLORS.determined} strokeWidth={2} />
                      <text x={sx(p.re) + 8} y={sy(p.im) - 6} fontSize={10} fill={COLORS.determined}>
                        p{i}
                      </text>
                    </g>
                  ),
                )}
              </>
            )}

            {/* prescribed (draggable) control points */}
            {targets.map((p, k) => (
              <g key={`t${k}`} className="cursor-grab" onPointerDown={onPointDown(k)}>
                <circle cx={sx(p.re)} cy={sy(p.im)} r={9} fill="transparent" />
                <circle cx={sx(p.re)} cy={sy(p.im)} r={5.5} fill={COLORS.prescribed} />
                <text x={sx(p.re) + 8} y={sy(p.im) - 6} fontSize={10} fill={COLORS.prescribed} fontWeight="bold">
                  p{subset[k]}
                </text>
              </g>
            ))}

            {solutions.length === 0 && (
              <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={14} fill="#dc2626">
                no solution found for this data — try more starts, or move a point
              </text>
            )}
          </svg>

          {/* σ and κ */}
          {plots && (
            <svg viewBox={`0 0 ${PW} ${PH_ * 2}`} className="w-full max-w-[680px] bg-white/85 dark:bg-gray-900/70 rounded">
              {/* sigma */}
              <g>
                <text x={4} y={PPAD.t + 8} fontSize={10} fill={COLORS.sigma}>σ(t)</text>
                <text x={4} y={PPAD.t + 20} fontSize={9} fill="#94a3b8">{plots.sigMax.toFixed(1)}</text>
                <line x1={PPAD.l} y1={PH_ - PPAD.b} x2={PW - PPAD.r} y2={PH_ - PPAD.b} stroke="#cbd5e1" strokeWidth={1} />
                <path d={plotPath(plots.sig, plots.sigMax, false)} fill="none" stroke={COLORS.sigma} strokeWidth={1.8} />
                <text x={PPAD.l} y={PH_ - 6} fontSize={9} fill="#94a3b8">
                  speed σ = |w|² — a polynomial; ∫σ dt is the exact arc length
                </text>
              </g>
              {/* kappa */}
              <g transform={`translate(0 ${PH_})`}>
                <text x={4} y={PPAD.t + 8} fontSize={10} fill={COLORS.kappa}>κ(t)</text>
                <text x={4} y={PPAD.t + 20} fontSize={9} fill="#94a3b8">±{plots.kapAbs.toFixed(1)}</text>
                <line
                  x1={PPAD.l}
                  y1={PPAD.t + (PH_ - PPAD.t - PPAD.b) / 2}
                  x2={PW - PPAD.r}
                  y2={PPAD.t + (PH_ - PPAD.t - PPAD.b) / 2}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <path d={plotPath(plots.kap, plots.kapAbs, true)} fill="none" stroke={COLORS.kappa} strokeWidth={1.8} />
                <text x={PPAD.l} y={PH_ - 6} fontSize={9} fill="#94a3b8">
                  signed curvature κ = 2·Im(w̄w′)/σ² — rational, no square root
                </text>
              </g>
            </svg>
          )}

          <div className="text-[11px] text-gray-600 dark:text-gray-400 max-w-[680px]">
            <span style={{ color: COLORS.prescribed }}>●</span> prescribed (drag me) ·{' '}
            <span style={{ color: COLORS.determined }}>○</span> determined ·{' '}
            <span style={{ color: COLORS.generator }}>●</span> generator w (tangent angle = 2·arg w — the
            spinor double angle) · dashed grey = the other interpolants to the same data
          </div>
        </div>
      </div>
    </div>
  )
}
