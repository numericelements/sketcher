// ============================================================================
// SLIDE 4 — grab one control point and two move.
//
// Pin P₀ and P₃. Six DOF minus four conditions leaves exactly TWO — one point's
// worth of freedom, forced by the dimension count rather than chosen. So P₁ is
// draggable and P₂ is DETERMINED: closure q(1+r+r²) = D gives
//
//     r² + r + (1 − D/q) = 0
//
// two branches. Three things are drawn that are usually only asserted:
//
//   * the CUSP-FORCED segment (P₃ → P₀+(4/3)D): the only placements of P₁ where
//     every branch is cusped. Existence is unrestricted; regularity is not.
//   * the BRANCH POINT P₀+(4/3)D, where the two solutions merge at r = −1/2.
//   * MONODROMY: "run loop" walks P₁ once around the branch point and returns it
//     to exactly where it started — and P₂ does not come home. The branch
//     structure is a two-sheeted cover of the P₁-plane branched at one point.
//
// Note there is nothing here for an optimizer to choose: the system is SQUARE, so
// the only freedom is which branch. Minimum-norm transport has room to act only
// once there is spare freedom — which in the plane with both ends pinned there
// is not. That is the honest answer to "what does the optimizer add", and it is
// why this comparison belongs in 2D.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { type Complex, cadd, csub, cnorm } from '../../core/complex'
import {
  phCubicFromP1,
  discriminantPoint,
  cuspForcedSegment,
  curveAt,
  type PHCubicSolution,
} from '../../core/phCubic'
import FigureFrame from '../framework/FigureFrame'
import type { Viewport } from '../framework/useViewport'

const P0: Complex = { re: -2.2, im: -0.9 }
const P3: Complex = { re: 1.4, im: -0.9 }
const START_P1: Complex = { re: -1.5, im: 1.1 }

// Sized (by hand-computing the default configuration) to contain BOTH branches
// plus the monodromy loop's excursion. The second branch is systematically the
// larger one: the roots satisfy r₁ + r₂ = −1, so when one is small the other sits
// near −1 and its legs q, qr, qr² grow. Framing is worth a browser check.
const WORLD = { x0: -5.0, x1: 3.6, y0: -2.2, y1: 2.4 }

const COLORS = {
  pinned: '#475569',
  active: '#dc2626',
  derived: '#0d9488',
  selected: '#2563eb',
  other: '#94a3b8',
  polygon: '#cbd5e1',
  cusp: '#f59e0b',
  branch: '#a855f7',
  trail: '#dc2626',
}

const LOOP_STEPS = 240
const LOOP_RADIUS = 0.55

const pathOf = (vp: Viewport, at: (t: number) => Complex, n = 160): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = at(i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(4)} ${s.y.toFixed(4)} `
  }
  return d
}

export default function PinnedEndsFigure() {
  const [p1, setP1] = useState<Complex>(START_P1)
  const [branch, setBranch] = useState(0)
  const [dragging, setDragging] = useState(false)
  /** P₂ at the moment the loop started, so the audience can see it not return. */
  const [loopMark, setLoopMark] = useState<Complex | null>(null)
  const [loopStep, setLoopStep] = useState<number | null>(null)
  const raf = useRef<number | null>(null)

  const branchPoint = discriminantPoint(P0, P3)
  const cuspSeg = cuspForcedSegment(P0, P3)
  const solutions = phCubicFromP1(P0, P3, p1)
  const selected: PHCubicSolution | undefined = solutions[Math.min(branch, Math.max(0, solutions.length - 1))]

  // --- the monodromy walk -------------------------------------------------
  // Step P₁ around a circle enclosing the branch point, keeping the branch whose
  // r is nearest the previous one — exactly what a drag does. After one turn the
  // nearest root is the SIBLING, so P₂ lands somewhere else.
  useEffect(() => {
    if (loopStep === null) return
    if (loopStep > LOOP_STEPS) {
      setLoopStep(null)
      return
    }
    const angle = (2 * Math.PI * loopStep) / LOOP_STEPS
    const next = cadd(branchPoint, { re: LOOP_RADIUS * Math.cos(angle), im: LOOP_RADIUS * Math.sin(angle) })
    const prevR = selected?.r
    const sols = phCubicFromP1(P0, P3, next)
    if (sols.length > 0 && prevR) {
      let bestIdx = 0
      let bestD = Infinity
      sols.forEach((s, i) => {
        const d = cnorm(csub(s.r, prevR))
        if (d < bestD) {
          bestD = d
          bestIdx = i
        }
      })
      setBranch(bestIdx)
    }
    setP1(next)
    raf.current = requestAnimationFrame(() => setLoopStep((s) => (s === null ? null : s + 1)))
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
    // selected is intentionally read fresh each step (it depends on p1/branch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopStep])

  const runLoop = () => {
    // Start from a point on the circle so the loop closes exactly.
    const start = cadd(branchPoint, { re: LOOP_RADIUS, im: 0 })
    setP1(start)
    const sols = phCubicFromP1(P0, P3, start)
    setBranch(0)
    setLoopMark(sols[0]?.controlPoints[2] ?? null)
    setLoopStep(1)
  }

  const running = loopStep !== null
  const cusped = selected?.cusped ?? false

  return (
    <FigureFrame
      world={WORLD}
      notation={['r² + r + (1 − D/q) = 0', 'q = P₁−P₀,  D = P₃−P₀', 'cusp ⟺ r ∈ ℝ, r ≤ 0']}
      readouts={[
        { label: 'solutions', value: String(solutions.length) },
        {
          label: 'r',
          value: selected
            ? `${selected.r.re.toFixed(3)}${selected.r.im < 0 ? '−' : '+'}${Math.abs(selected.r.im).toFixed(3)}i`
            : '—',
          tone: cusped ? 'warn' : 'ok',
        },
        {
          label: 'σ ≥',
          value: selected ? selected.speedLowerBound.toFixed(3) : '—',
          tone: cusped ? 'warn' : 'ok',
        },
        { label: 'arc len', value: selected ? selected.arcLength.toFixed(3) : '—' },
      ]}
      controls={
        <span className="flex items-center gap-2">
          <button
            onClick={() => setBranch((b) => (b + 1) % Math.max(1, solutions.length))}
            disabled={running || solutions.length < 2}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
          >
            branch {solutions.length ? branch + 1 : 0}/{solutions.length}
          </button>
          <button
            onClick={runLoop}
            disabled={running}
            className="px-2 py-[0.15em] rounded border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-40"
          >
            {running ? 'looping…' : 'run loop'}
          </button>
          {loopMark && !running && (
            <button
              onClick={() => {
                setLoopMark(null)
                setP1(START_P1)
                setBranch(0)
              }}
              className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
            >
              reset
            </button>
          )}
        </span>
      }
      caption={
        <>
          <b>Pin both ends and drag P₁: P₂ moves on its own.</b> Six DOF minus four conditions leaves
          exactly one point of freedom, so P₂ is determined — and there are two ways to determine it.
          Orange = the only placements where <i>every</i> branch is cusped. Purple = where the two
          branches merge; walk P₁ once around it and P₂ does not come home.
        </>
      }
    >
      {(vp) => {
        const S = (p: Complex) => vp.toScreen({ x: p.re, y: p.im })
        const onMove = (e: React.PointerEvent) => {
          if (!dragging || running) return
          const w = vp.toWorld(e)
          setP1({ re: w.x, im: w.y })
        }
        return (
          <g onPointerMove={onMove} onPointerUp={() => setDragging(false)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {/* the chord, and the segment where both branches are cusped */}
            <line
              x1={S(P0).x} y1={S(P0).y}
              x2={S(cuspSeg.to).x} y2={S(cuspSeg.to).y}
              stroke={COLORS.polygon} strokeWidth={vp.px(1)}
              strokeDasharray={`${vp.px(3)} ${vp.px(3)}`}
            />
            <line
              x1={S(cuspSeg.from).x} y1={S(cuspSeg.from).y}
              x2={S(cuspSeg.to).x} y2={S(cuspSeg.to).y}
              stroke={COLORS.cusp} strokeWidth={vp.px(5)} strokeLinecap="round" opacity={0.75}
            />
            {/* the branch point */}
            <circle
              cx={S(branchPoint).x} cy={S(branchPoint).y} r={vp.px(7)}
              fill="none" stroke={COLORS.branch} strokeWidth={vp.px(2)}
            />
            {running && (
              <circle
                cx={S(branchPoint).x} cy={S(branchPoint).y} r={vp.px(1) * 0 + LOOP_RADIUS}
                fill="none" stroke={COLORS.branch} strokeWidth={vp.px(1)}
                strokeDasharray={`${vp.px(4)} ${vp.px(4)}`} opacity={0.6}
              />
            )}

            {/* the non-selected branch, faint */}
            {solutions.map((s, i) =>
              i === branch ? null : (
                <path
                  key={`o${i}`}
                  d={pathOf(vp, (t) => curveAt(s.generator, s.p0, t))}
                  fill="none" stroke={COLORS.other} strokeWidth={vp.px(1.6)}
                  strokeDasharray={`${vp.px(6)} ${vp.px(5)}`} opacity={0.8}
                />
              ),
            )}

            {selected && (
              <>
                <polyline
                  points={selected.controlPoints.map((p) => `${S(p).x},${S(p).y}`).join(' ')}
                  fill="none" stroke={COLORS.polygon} strokeWidth={vp.px(1.3)}
                  strokeDasharray={`${vp.px(4)} ${vp.px(4)}`}
                />
                <path
                  d={pathOf(vp, (t) => curveAt(selected.generator, selected.p0, t))}
                  fill="none" stroke={cusped ? COLORS.cusp : COLORS.selected} strokeWidth={vp.px(3)}
                />
                {/* P₂ — the point that moves without being touched */}
                <circle
                  cx={S(selected.controlPoints[2]).x} cy={S(selected.controlPoints[2]).y}
                  r={vp.px(7)} fill="white" stroke={COLORS.derived} strokeWidth={vp.px(2.4)}
                />
                <text
                  x={S(selected.controlPoints[2]).x + vp.px(11)}
                  y={S(selected.controlPoints[2]).y - vp.px(9)}
                  fontSize={vp.px(15)} fill={COLORS.derived}
                >
                  P₂
                </text>
              </>
            )}

            {/* where P₂ was when the loop started */}
            {loopMark && (
              <>
                <circle
                  cx={S(loopMark).x} cy={S(loopMark).y} r={vp.px(7)}
                  fill="none" stroke={COLORS.trail} strokeWidth={vp.px(2)}
                  strokeDasharray={`${vp.px(3)} ${vp.px(3)}`}
                />
                <text
                  x={S(loopMark).x + vp.px(11)} y={S(loopMark).y + vp.px(18)}
                  fontSize={vp.px(13)} fill={COLORS.trail}
                >
                  P₂ before the loop
                </text>
              </>
            )}

            {/* the pinned ends */}
            {[P0, P3].map((p, i) => (
              <g key={i}>
                <circle cx={S(p).x} cy={S(p).y} r={vp.px(6)} fill={COLORS.pinned} />
                <text x={S(p).x + vp.px(11)} y={S(p).y + vp.px(20)} fontSize={vp.px(15)} fill={COLORS.pinned}>
                  {i === 0 ? 'P₀' : 'P₃'}
                </text>
              </g>
            ))}

            {/* P₁ — the one you drag */}
            <g
              onPointerDown={(e) => {
                if (running) return
                e.stopPropagation()
                ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                setDragging(true)
              }}
              style={{ cursor: running ? 'default' : 'grab' }}
            >
              <circle cx={S(p1).x} cy={S(p1).y} r={vp.px(16)} fill="transparent" />
              <circle cx={S(p1).x} cy={S(p1).y} r={vp.px(7.5)} fill={COLORS.active} />
              <text x={S(p1).x + vp.px(11)} y={S(p1).y - vp.px(9)} fontSize={vp.px(15)} fill={COLORS.active}>
                P₁
              </text>
            </g>
          </g>
        )
      }}
    </FigureFrame>
  )
}
