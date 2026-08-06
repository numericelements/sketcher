// ============================================================================
// SLIDE 5 — C¹ Hermite data, and FOUR interpolants.
//
// The classical result, made draggable: "in general four distinct planar PH quintic
// interpolants to given C¹ Hermite data always exist" (Farouki–Neff; 2019 survey
// §21). Unlike the cubic, existence is UNCONDITIONAL — the unknowns are complex, so
// w₀ = ±√d₀ and w₂ = ±√d₁ always exist and the closure equation is a complex
// quadratic in w₁ with two roots. Two relative signs × two roots = four, always.
//
// You drag control points, not abstract "Hermite data", because for a quintic they
// are the same thing: P₁ = P₀ + d₀/5 and P₄ = P₅ − d₁/5, so prescribing
// {P₀,P₁,P₄,P₅} IS prescribing position and tangent at both ends. Eight real
// conditions on eight real degrees of freedom — square, and the whole content of the
// slide is that a square nonlinear system has a solution COUNT rather than a
// solution.
//
// Which sets up the next slide: in SPACE the same problem has a two-parameter
// FAMILY, not four points. Finite choice becomes a continuum.
//
// Four branches need tracking (framework/branchTracking) or the colours jump as the
// data moves; the initial pick is the fairest by absolute rotation index R = ∫|κ|ds,
// which is the survey's recommended selector for the "good" interpolant.
//
// The strict/free toggle is the same contrast as slide 4, one degree up — and the
// numbers grow the way the trichotomy predicts:
//
//   STRICT  prescribe {P₀,P₁,P₄,P₅}   8 DOF vs 8 conditions — square, FOUR branches
//   FREE    prescribe one point       8 DOF vs 2 conditions — SIX spare, so
//                                     minimum-norm chooses; one continuous solution
//
// Six spare degrees of freedom against the cubic's four: the more room the manifold
// has, the more an optimizer has to decide, and the further "strict" and "free" are
// from each other. Same core solver (core/phFreeDrag is degree-generic).
// ============================================================================
import { useState } from 'react'
import { type Complex, cscale, csub } from '../../core/complex'
import {
  phQuinticHermite,
  curveAt,
  type PHQuinticSolution,
} from '../../core/phQuinticHermite'
import { type PHFreeState, dragPHFree, freeControlPoints, phPolygonResidual } from '../../core/phFreeDrag'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, ControlPolygon, DataPoint, DerivedPoint } from '../framework/figureStyle'
import { trackOrder, controlPolygonDistance } from '../framework/branchTracking'
import type { Viewport } from '../framework/useViewport'

/** The prescribed control points: position + tangent leg at each end. */
const PRESCRIBED = [0, 1, 4, 5] as const

const START: Complex[] = [
  { re: -2.4, im: -0.8 }, // P₀
  { re: -1.4, im: 0.9 }, //  P₁  ⇒ d₀ = 5(P₁−P₀)
  { re: 1.2, im: 1.0 }, //   P₄  ⇒ d₁ = 5(P₅−P₄)
  { re: 2.4, im: -0.7 }, //  P₅
]

const BASE = { width: 900, height: 420 }

/** Hermite data from the four prescribed control points. */
const dataOf = (pts: readonly Complex[]) => ({
  p0: pts[0],
  d0: cscale(csub(pts[1], pts[0]), 5),
  p1: pts[3],
  d1: cscale(csub(pts[3], pts[2]), 5),
})

/** Fairest first — the survey's selector, and deterministic on load. */
const canonical = (sols: PHQuinticSolution[]): PHQuinticSolution[] =>
  [...sols].sort((a, b) => {
    const va = Number.isFinite(a.rotationIndex) ? a.rotationIndex : Infinity
    const vb = Number.isFinite(b.rotationIndex) ? b.rotationIndex : Infinity
    return va - vb
  })

const solveAt = (pts: readonly Complex[]): PHQuinticSolution[] => phQuinticHermite(dataOf(pts))

/**
 * The world box, computed ONCE from the starting data so all four interpolants fit.
 * Fixed thereafter — recomputing it during a drag would make the view lurch — and
 * the viewport allows zoom and pan from here. Some branches are much larger than
 * others, so hand-guessing this box gets it wrong.
 */
const WORLD = (() => {
  const all = canonical(solveAt(START)).flatMap((s) => s.controlPoints)
  const xs = all.map((p) => p.re)
  const ys = all.map((p) => p.im)
  const pad = 0.18
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const mx = (x1 - x0) * pad
  const my = (y1 - y0) * pad
  return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }
})()

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 200): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
  }
  return d
}

type Mode = 'strict' | 'free'

export default function QuinticHermiteFigure() {
  const [mode, setMode] = useState<Mode>('strict')
  const [state, setState] = useState(() => ({ points: START, solutions: canonical(solveAt(START)) }))
  const [selected, setSelected] = useState(0)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [freeState, setFreeState] = useState<PHFreeState | null>(null)
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })

  const { points, solutions } = state
  const sel = solutions[Math.min(selected, Math.max(0, solutions.length - 1))]

  /** All six control points, from whichever mode is driving. */
  const cps: Complex[] =
    mode === 'free' && freeState ? freeControlPoints(freeState) : (sel?.controlPoints ?? [])
  /** The origin the selected curve is drawn from. */
  const origin = mode === 'free' && freeState ? freeState.p0 : points[0]
  const generator =
    mode === 'free' && freeState
      ? { w0: freeState.generator[0], w1: freeState.generator[1], w2: freeState.generator[2] }
      : sel?.generator

  // --- mode handoff, continuous in both directions -----------------------------
  const toFree = () => {
    if (sel) {
      setFreeState({ generator: [sel.generator.w0, sel.generator.w1, sel.generator.w2], p0: points[0] })
    }
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('free')
  }
  const toStrict = () => {
    if (freeState) {
      const c = freeControlPoints(freeState)
      // The Hermite data is whatever the free curve now has at its ends.
      const nextPoints = [c[0], c[1], c[4], c[5]]
      const solved = solveAt(nextPoints)
      const ordered = solved.length === solutions.length
        ? trackOrder(solved, solutions, controlPolygonDistance)
        : canonical(solved)
      setState({ points: nextPoints, solutions: ordered })
      // Stay on whichever branch is the curve we were just looking at.
      let best = 0
      let bestD = Infinity
      ordered.forEach((s, i) => {
        const d = controlPolygonDistance(s, { controlPoints: c })
        if (d < bestD) { bestD = d; best = i }
      })
      setSelected(best)
    }
    setMode('strict')
  }

  // Fairest branch by R, so the readout can say whether you are on it.
  const fairest = solutions.reduce(
    (best, s, i) => (s.rotationIndex < (solutions[best]?.rotationIndex ?? Infinity) ? i : best),
    0,
  )

  const moveTo = (k: number, p: Complex) =>
    setState((prev) => {
      const next = prev.points.map((q, j) => (j === k ? p : q))
      const solved = solveAt(next)
      return {
        points: next,
        solutions:
          solved.length === prev.solutions.length
            ? trackOrder(solved, prev.solutions, controlPolygonDistance)
            : canonical(solved),
      }
    })

  return (
    <FigureFrame
      world={WORLD}
      base={BASE}
      notation={
        mode === 'strict'
          ? [
              '8 DOF, 8 conditions',
              'w₀,w₂ = ±√d',
              '2w₁² + 3(w₀+w₂)w₁ + (3w₀²+w₀w₂+3w₂²−15Δp) = 0',
              '2 signs × 2 roots ⇒ 4',
            ]
          : ['8 DOF − 2 dragged = 6 spare', 'min Σ |Pⱼ − Pⱼᵒˡᵈ|²', 'underdetermined ⇒ a choice']
      }
      readouts={
        mode === 'strict'
          ? [
              { label: 'solutions', value: String(solutions.length) },
              { label: 'R = ∫|κ|ds', value: sel ? sel.rotationIndex.toFixed(3) : '—' },
              { label: 'arc len', value: sel ? sel.arcLength.toFixed(3) : '—' },
              selected === fairest
                ? { label: '', value: 'fairest ✓', tone: 'ok' as const }
                : { label: '', value: 'fairest is another', tone: 'plain' as const },
            ]
          : [
              { label: 'spare DOF', value: '6' },
              { label: 'cursor error', value: freeInfo.tracking.toFixed(4) },
              { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
              {
                label: 'PH residual',
                value: cps.length === 6 ? phPolygonResidual(cps).toExponential(1) : '—',
                tone: 'ok' as const,
              },
            ]
      }
      controls={
        <span className="flex items-center gap-2">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            <button
              onClick={toStrict}
              className={`px-2 py-[0.15em] ${mode === 'strict' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              strict
            </button>
            <button
              onClick={toFree}
              className={`px-2 py-[0.15em] ${mode === 'free' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              free
            </button>
          </span>
          <button
            onClick={() => {
              setState({ points: START, solutions: canonical(solveAt(START)) })
              setSelected(0)
              setFreeState(null)
              setFreeInfo({ tracking: 0, disturbance: 0 })
              setMode('strict')
            }}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={
        mode === 'free' ? (
          <>
            <b>Free.</b> Nothing prescribed, so grab <i>any</i> of the six. Eight degrees of freedom
            against two conditions leaves <b>six</b> spare — half again what the cubic had — so
            minimum-norm has more to decide and the rest of the polygon drifts more. One continuous
            solution instead of four branches, and the polygon stays exactly PH.
          </>
        ) : (
        <>
          <b>C¹ Hermite data has exactly four PH quintic interpolants — always.</b> The unknowns are
          complex, so unlike the cubic there is no existence condition to fail. Eight real degrees of
          freedom, eight real conditions: a square <i>nonlinear</i> system has a solution <i>count</i>.
          Which one is the good one is a real problem, and R = ∫|κ|ds is the classical answer.{' '}
          <span className="text-slate-400">Drag an end or its tangent leg; click a curve to select it.</span>
        </>
        )
      }
    >
      {(vp) => {
        const onMove = (e: React.PointerEvent) => {
          if (dragIdx === null) return
          const w = vp.toWorld(e)
          const target: Complex = { re: w.x, im: w.y }
          if (mode === 'strict') {
            moveTo(dragIdx, target)
          } else if (freeState) {
            const step = dragPHFree(freeState, dragIdx, target)
            setFreeState(step.state)
            setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
          }
        }
        const grab = (k: number) => (e: React.PointerEvent) => {
          e.stopPropagation()
          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
          setDragIdx(k)
        }
        return (
          <g onPointerMove={onMove} onPointerUp={() => setDragIdx(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {/* strict: the three you are not on — grey, thin, clickable */}
            {mode === 'strict' &&
              solutions.map((s, i) =>
                i === selected ? null : (
                  <g key={`u${i}`}>
                    <path d={pathOf(vp, (t) => curveAt(s.generator, points[0], t))} {...curveStroke(vp, false)} />
                    <path
                      d={pathOf(vp, (t) => curveAt(s.generator, points[0], t))}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={vp.px(FIG.size.curveHit)}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => { e.stopPropagation(); setSelected(i) }}
                    />
                  </g>
                ),
              )}

            {cps.length === 6 && generator && (
              <>
                <ControlPolygon vp={vp} cps={cps} />
                <path d={pathOf(vp, (t) => curveAt(generator, origin, t))} {...curveStroke(vp, true)} />
              </>
            )}

            {mode === 'strict' ? (
              <>
                {/* P₂ and P₃ are DERIVED — the two the Hermite data does not fix */}
                {cps.length === 6 &&
                  [2, 3].map((k) => (
                    <DerivedPoint key={k} vp={vp} p={cps[k]} label={`P${'₀₁₂₃₄₅'[k]}`} />
                  ))}
                {points.map((p, k) => (
                  <DataPoint
                    key={k}
                    vp={vp}
                    p={p}
                    label={`P${'₀₁₂₃₄₅'[PRESCRIBED[k]]}`}
                    dragging={dragIdx === k}
                    onPointerDown={grab(k)}
                  />
                ))}
              </>
            ) : (
              // free: all six are handles
              cps.map((p, k) => (
                <DataPoint
                  key={k}
                  vp={vp}
                  p={p}
                  label={`P${'₀₁₂₃₄₅'[k]}`}
                  dragging={dragIdx === k}
                  onPointerDown={grab(k)}
                />
              ))
            )}
          </g>
        )
      }}
    </FigureFrame>
  )
}
