// ============================================================================
// SLIDE 4 — grab one control point and two move, and what an optimizer adds.
//
// On the PH variety, "move one control point and freeze the others" is not a motion
// at all: it leaves the variety. Codimension, not solver weakness. The toggle makes
// the two honest responses to that fact comparable side by side — and they are
// exactly two rows of the deck's trichotomy:
//
//   STRICT  pin P₀ and P₃, drag P₁            6 DOF vs 6 conditions — SQUARE
//           P₂ is DETERMINED, in closed form: r² + r + (1 − D/q) = 0, two branches.
//           Nothing is chosen; there is nothing for an optimizer to do.
//
//   FREE    nothing pinned, drag ANY point    6 DOF vs 2 conditions — 4 SPARE
//           So something must choose. The choice is minimum-norm: move the dragged
//           point to the cursor and everything else as little as possible. One
//           continuous solution rather than discrete branches.
//
// The handoff between modes is continuous — switching adopts the current curve — so
// the comparison is about behaviour, not about jumping to a different curve.
//
// WHICH interior point is the handle is itself a choice, and it is exposed: click P₁
// or P₂ to make it the one you hold, and the other becomes derived. Exactly one of
// them can be prescribed (6 DOF − 4 pinned = 2 = one point's worth), so this is a
// SWAP, not a toggle. The handoff is seamless because the curve on screen solves
// BOTH problems with the same shape parameter r — only your grip changes. (The two
// are mirror images under t → 1−t, which sends r ↦ 1/r, so neither is preferred.)
//
// Branch switching is by CLICKING the other curve, as on slide 3 — no button.
//
// Deliberately NOT drawn here: the cusp-forced segment and the branch point. Both
// are real (and verified in phCubic.test.ts) but they are a second and third lesson
// crowding the first. Monodromy earns its own slide later.
// ============================================================================
import { useState } from 'react'
import { type Complex, cnorm, csub } from '../../core/complex'
import { phCubicFromP1, phCubicFromP2, curveAt, type PHCubicSolution } from '../../core/phCubic'
import {
  type PHCubicState,
  dragPHCubicFree,
  freeStateFrom,
  phResidual,
} from '../../core/phCubicDrag'
import { controlPoints } from '../../core/phCubic'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, ControlPolygon, DataPoint, DerivedPoint, PinnedPoint } from '../framework/figureStyle'
import type { Viewport } from '../framework/useViewport'

const P0: Complex = { re: -2.2, im: -0.9 }
const P3: Complex = { re: 1.4, im: -0.9 }
const START_P1: Complex = { re: -1.5, im: 1.1 }

// Wide enough for both strict branches; the second is systematically the larger
// one, since the roots satisfy r₁ + r₂ = −1, so when one is small the other sits
// near −1 and its legs q, qr, qr² grow.
const WORLD = { x0: -5.0, x1: 3.6, y0: -2.2, y1: 2.4 }
const BASE = { width: 900, height: 400 }

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 160): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
  }
  return d
}

/** Pick the branch whose r is nearest a reference — continuous tracking. */
function nearestBranch(sols: PHCubicSolution[], toR: Complex | null): number {
  if (!toR || sols.length === 0) return 0
  let best = 0
  let bestD = Infinity
  sols.forEach((s, i) => {
    const d = cnorm(csub(s.r, toR))
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

type Mode = 'strict' | 'free'

export default function PinnedEndsFigure() {
  const [mode, setMode] = useState<Mode>('strict')

  // --- strict state: pinned ends + the dragged P₁, with a tracked branch --------
  const [ends, setEnds] = useState({ p0: P0, p3: P3 })
  /** Which interior control point you hold: 1 or 2. The other is derived. */
  const [active, setActive] = useState<1 | 2>(1)
  const [handle, setHandle] = useState(START_P1)
  const [branchR, setBranchR] = useState<Complex | null>(null)

  // --- free state: the 6 real unknowns ----------------------------------------
  const [freeState, setFreeState] = useState<PHCubicState | null>(null)
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })

  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const solveStrict = (h: Complex, which: 1 | 2): PHCubicSolution[] =>
    which === 1 ? phCubicFromP1(ends.p0, ends.p3, h) : phCubicFromP2(ends.p0, ends.p3, h)
  const strictSolutions = solveStrict(handle, active)
  const derived = active === 1 ? 2 : 1
  const strictIdx = nearestBranch(strictSolutions, branchR)
  const strictSel = strictSolutions[strictIdx]

  const cps =
    mode === 'free' && freeState
      ? controlPoints(freeState.generator, freeState.p0)
      : (strictSel?.controlPoints ?? [])

  // --- mode handoff, continuous in both directions -----------------------------
  const toFree = () => {
    if (strictSel) setFreeState(freeStateFrom(strictSel.generator, strictSel.p0))
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('free')
  }
  const toStrict = () => {
    if (freeState) {
      const c = controlPoints(freeState.generator, freeState.p0)
      setEnds({ p0: c[0], p3: c[3] })
      setHandle(c[active])
      // Adopt the branch closest to the curve we were just looking at: r is a
      // property of the CURVE, so it carries across the mode change unchanged.
      const sols = active === 1 ? phCubicFromP1(c[0], c[3], c[1]) : phCubicFromP2(c[0], c[3], c[2])
      setBranchR(sols[nearestBranch(sols, strictSel?.r ?? null)]?.r ?? null)
    }
    setMode('strict')
  }

  // --- dragging ----------------------------------------------------------------
  const onDown = (i: number) => (e: React.PointerEvent) => {
    // Strict mode: only the active interior point is grabbable. Free: any of four.
    if (mode === 'strict' && i !== active) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragIdx(i)
  }
  const onMove = (vp: Viewport) => (e: React.PointerEvent) => {
    if (dragIdx === null) return
    const w = vp.toWorld(e)
    const target: Complex = { re: w.x, im: w.y }
    if (mode === 'strict') {
      const sols = solveStrict(target, active)
      if (sols.length > 0) setBranchR(sols[nearestBranch(sols, branchR)].r)
      setHandle(target)
    } else if (freeState) {
      const step = dragPHCubicFree(freeState, dragIdx, target)
      setFreeState(step.state)
      setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
    }
  }

  /**
   * Click the derived interior point to take hold of it instead. The curve does not
   * change: it solves both problems with the same r, so only the grip moves.
   */
  const swapActive = () => {
    if (!strictSel) return
    const next: 1 | 2 = derived
    setHandle(strictSel.controlPoints[next])
    setActive(next)
    // branchR is unchanged on purpose — r identifies the curve, not the problem.
  }

  const reset = () => {
    setEnds({ p0: P0, p3: P3 })
    setActive(1)
    setHandle(START_P1)
    setBranchR(null)
    setFreeState(null)
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('strict')
  }

  const readouts =
    mode === 'strict'
      ? [
          { label: 'solutions', value: String(strictSolutions.length) },
          {
            label: 'r',
            value: strictSel
              ? `${strictSel.r.re.toFixed(3)}${strictSel.r.im < 0 ? '−' : '+'}${Math.abs(strictSel.r.im).toFixed(3)}i`
              : '—',
          },
          { label: 'arc len', value: strictSel ? strictSel.arcLength.toFixed(3) : '—' },
        ]
      : [
          { label: 'spare DOF', value: '4' },
          { label: 'cursor error', value: freeInfo.tracking.toFixed(4) },
          { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
          {
            label: 'PH residual',
            value: cps.length === 4 ? phResidual(cps).toExponential(1) : '—',
            tone: 'ok' as const,
          },
        ]

  return (
    <FigureFrame
      world={WORLD}
      base={BASE}
      notation={
        mode === 'strict'
          ? ['6 DOF − 4 pinned = 2', 'r² + r + (1 − D/q) = 0', 'square ⇒ 2 branches']
          : ['6 DOF − 2 dragged = 4 spare', 'min Σ |Pⱼ − Pⱼᵒˡᵈ|²', 'underdetermined ⇒ a choice']
      }
      readouts={readouts}
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
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        mode === 'strict' ? (
          <>
            <b>Strict.</b> Pin both ends and drag the solid point — the hollow one moves on its own. Six
            degrees of freedom minus four conditions leaves exactly one point of freedom, so one interior
            point is <i>determined</i>, and there are two ways to determine it. Nothing here for an
            optimizer to choose.{' '}
            <span className="text-slate-400">
              Click the hollow point to hold it instead; click the grey curve for the other branch.
            </span>
          </>
        ) : (
          <>
            <b>Free.</b> Nothing pinned, so grab <i>any</i> control point. Now four degrees of freedom are
            spare and something must spend them: the others move as little as possible. One continuous
            solution instead of two branches — and the curve stays exactly PH, by construction.
          </>
        )
      }
    >
      {(vp) => (
        <g onPointerMove={onMove(vp)} onPointerUp={() => setDragIdx(null)}>
          <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

          {/* strict: the branch you are not on — grey, thin, and CLICKABLE */}
          {mode === 'strict' &&
            strictSolutions.map((s, i) =>
              i === strictIdx ? null : (
                <g key={`u${i}`}>
                  <path d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))} {...curveStroke(vp, false)} />
                  <path
                    d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={vp.px(FIG.size.curveHit)}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setBranchR(s.r)
                    }}
                  />
                </g>
              ),
            )}

          {cps.length === 4 && (
            <>
              <ControlPolygon vp={vp} cps={cps} />
              <path
                d={pathOf(
                  vp,
                  mode === 'free' && freeState
                    ? (t) => curveAt(freeState.generator, freeState.p0, t)
                    : (t) => curveAt(strictSel!.generator, strictSel!.p0, t),
                )}
                {...curveStroke(vp, true)}
              />

              {mode === 'strict' ? (
                <>
                  <PinnedPoint vp={vp} p={cps[0]} label="P₀" />
                  <PinnedPoint vp={vp} p={cps[3]} label="P₃" />
                  {/*
                    The derived interior point. Pressing it takes hold of it — and
                    STARTS THE DRAG in the same gesture, so you never have to press,
                    release, then press again: capture the pointer, swap, and mark
                    the newly-active index as the one being dragged.
                  */}
                  <g
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                      swapActive()
                      setDragIdx(derived) // `derived` is the point just pressed, i.e. the new active one
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <circle
                      cx={vp.toScreen({ x: cps[derived].re, y: cps[derived].im }).x}
                      cy={vp.toScreen({ x: cps[derived].re, y: cps[derived].im }).y}
                      r={vp.px(FIG.size.hit)}
                      fill="transparent"
                    />
                    <DerivedPoint vp={vp} p={cps[derived]} label={`P${'₀₁₂₃'[derived]}`} />
                  </g>
                  <DataPoint
                    vp={vp}
                    p={cps[active]}
                    label={`P${'₀₁₂₃'[active]}`}
                    dragging={dragIdx === active}
                    onPointerDown={onDown(active)}
                  />
                </>
              ) : (
                cps.map((p, i) => (
                  <DataPoint
                    key={i}
                    vp={vp}
                    p={p}
                    label={`P${'₀₁₂₃'[i]}`}
                    dragging={dragIdx === i}
                    onPointerDown={onDown(i)}
                  />
                ))
              )}
            </>
          )}

          {strictSolutions.length === 0 && mode === 'strict' && (
            <text
              x={vp.base.width / 2} y={vp.base.height / 2}
              textAnchor="middle" fontSize={vp.px(FIG.size.label)} fill={FIG.color.label}
            >
              the handle is on top of P₀ — move it
            </text>
          )}
        </g>
      )}
    </FigureFrame>
  )
}
