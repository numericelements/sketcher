// ============================================================================
// Degree 7 in the plane, asked twice — and the two answers are 1 and 8.
//
// Both panels prescribe FIVE planar points on the same curve type, so both impose ten
// real conditions on ten real degrees of freedom. Both systems are square. The only
// difference is WHICH functionals are prescribed, and the counts differ by eight:
//
//   LEFT   five CONTROL points   →  ONE curve, for every polygon you can draw.
//          The cascade never solves an equation: w₀ = √N₀ (the ± is the whole gauge),
//          then w₁, w₂, w₃ each by a division. Nothing is left over to branch.
//
//   RIGHT  five points ON the curve  →  EIGHT curves, always.
//          Substituting wⱼ = w₀rⱼ cancels w₀² and leaves three quadrics in ℙ³ — a
//          Cayley octad, 2³ = 8. The unknowns are COMPLEX, so every Bézout root is a
//          genuine real curve: the eight never vanish, they can only collide.
//
// That is the pitfall this deck keeps meeting, made visible: for an ordinary Bézier
// these two problems are linearly equivalent, and for a PH curve they are not, because
// the unknown is the GENERATOR and only the control-point conditions factor through it
// by division.
//
// THE PANELS DO NOT SHARE THEIR POINTS, unlike slide 3's figure, and that is forced by
// the mathematics rather than chosen: the cascade has gain ≈ 10 (a drag of a tenth of a
// leg length doubles w₃ — the factor is C(6,3)/2, and it is 1 for the cubic, 3 for the
// quintic, 10 here). Feeding the right panel's spread-out interpolation points into the
// left panel as a control polygon gives a curve of arc length ~400 on data spanning 5.
// So each panel gets its own seed, and the left panel's caption states the gain rather
// than hiding it — drag it and the curve leaves the frame almost at once, which is the
// honest behaviour of that map and worth seeing.
// ============================================================================
import { useState } from 'react'
import type { Complex } from '../../core/complex'
import {
  type Spinor4,
  type PlanarSepticSolution,
  planarSepticFromControlPoints,
  controlPointsOf,
  bezierAt,
} from '../../core/phPlanarSeptic'
import {
  type SepticBranch,
  septicInterpolants,
  trackSepticInterpolants,
} from '../../core/phPlanarSepticInterp'
import FigureFrame from '../framework/FigureFrame'
import { FIG, curveStroke, ControlPolygon, DataPoint, DerivedPoint } from '../framework/figureStyle'
import { trackOrder } from '../framework/branchTracking'
import type { Viewport } from '../framework/useViewport'

const BASE = { width: 430, height: 330 }
const SUB = '₀₁₂₃₄₅₆₇'

/** The left seed: the first five control points of a pleasant PH septic. */
const LEFT_START: Complex[] = (() => {
  const w: Spinor4 = [
    { re: 1.5, im: 0 }, { re: 1.2, im: 1.0 }, { re: 1.3, im: -0.9 }, { re: 1.5, im: 0.2 },
  ]
  return controlPointsOf(w, { re: -2.6, im: -0.15 }).slice(0, 5)
})()

/** The right seed: five points along a shallow arch, slightly asymmetric so the eight
 *  branches do not come in visually coincident mirror pairs. */
const RIGHT_START: Complex[] = [
  { re: -2.4, im: -0.6 },
  { re: -1.35, im: 0.72 },
  { re: 0.05, im: 1.12 },
  { re: 1.3, im: 0.62 },
  { re: 2.4, im: -0.7 },
]

const sampleCurve = (cps: readonly Complex[], n: number): Complex[] =>
  Array.from({ length: n + 1 }, (_, i) => bezierAt(cps, i / n))

/** A world box around a set of points, with margin. */
function boxOf(pts: readonly Complex[], pad = 0.16) {
  const xs = pts.map((p) => p.re)
  const ys = pts.map((p) => p.im)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const mx = Math.max((x1 - x0) * pad, 0.2)
  const my = Math.max((y1 - y0) * pad, 0.2)
  return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }
}

/**
 * Both boxes are computed ONCE from the seed and fixed thereafter — recomputing during
 * a drag would make the view lurch. The left box is deliberately generous (2.2× the
 * seed curve), because that map's output grows fast; past that the curve simply leaves
 * the frame and the readout says so.
 */
const LEFT_WORLD = (() => {
  const sol = planarSepticFromControlPoints(LEFT_START)
  const pts = sol ? sampleCurve(sol.controlPoints, 200) : LEFT_START
  const b = boxOf([...pts, ...LEFT_START])
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2
  const k = 2.2
  return {
    x0: cx + (b.x0 - cx) * k, x1: cx + (b.x1 - cx) * k,
    y0: cy + (b.y0 - cy) * k, y1: cy + (b.y1 - cy) * k,
  }
})()

const RIGHT_SEED = septicInterpolants(RIGHT_START)
const RIGHT_WORLD = boxOf(
  RIGHT_SEED.flatMap((b) => sampleCurve(b.solution.controlPoints, 120)),
)

const pathOf = (vp: Viewport, cps: readonly Complex[], n = 220): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = bezierAt(cps, i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
  }
  return d
}

const inside = (w: typeof LEFT_WORLD, p: Complex) =>
  p.re >= w.x0 && p.re <= w.x1 && p.im >= w.y0 && p.im <= w.y1

/** R diverges at a cusp (w vanishes, so |κ| is not integrable there). Say so. */
const showR = (sol: PlanarSepticSolution): string =>
  Number.isFinite(sol.rotationIndex) && sol.rotationIndex < 1e3
    ? sol.rotationIndex.toFixed(2)
    : 'cusp'

const branchCost = (a: SepticBranch, b: SepticBranch): number => {
  let total = 0
  for (let i = 0; i < 8; i++) {
    total += Math.hypot(
      a.solution.controlPoints[i].re - b.solution.controlPoints[i].re,
      a.solution.controlPoints[i].im - b.solution.controlPoints[i].im,
    )
  }
  return total
}

// ---------------------------------------------------------------------------

export default function PlanarSepticFigure() {
  const [left, setLeft] = useState<Complex[]>(LEFT_START)
  const [right, setRight] = useState({ points: RIGHT_START, branches: RIGHT_SEED })
  const [selected, setSelected] = useState(0)
  const [drag, setDrag] = useState<{ side: 'L' | 'R'; i: number } | null>(null)

  const leftSol = planarSepticFromControlPoints(left)
  const leftCurve = leftSol ? sampleCurve(leftSol.controlPoints, 120) : []
  const leftOffFrame = leftCurve.some((p) => !inside(LEFT_WORLD, p))

  const branches = right.branches
  const sel = branches[Math.min(selected, Math.max(0, branches.length - 1))]
  const fairest = branches.reduce(
    (best, b, i) => (b.solution.rotationIndex < (branches[best]?.solution.rotationIndex ?? Infinity) ? i : best),
    0,
  )

  const moveLeft = (i: number, p: Complex) =>
    setLeft((prev) => prev.map((q, k) => (k === i ? p : q)))

  const moveRight = (i: number, p: Complex) =>
    setRight((prev) => {
      const points = prev.points.map((q, k) => (k === i ? p : q))
      // Continuation first: each branch is carried from its own previous root, so branch
      // identity is preserved by construction and no permutation matching is needed.
      const carried = trackSepticInterpolants(points, prev.branches.map((b) => b.root))
      if (carried.every(Boolean) && carried.length === prev.branches.length) {
        return { points, branches: carried as SepticBranch[] }
      }
      // A branch fell off the continuation — solve globally and re-label by matching.
      const fresh = septicInterpolants(points)
      return {
        points,
        branches:
          fresh.length === prev.branches.length
            ? trackOrder(fresh, prev.branches, branchCost)
            : fresh,
      }
    })

  const grab = (side: 'L' | 'R', i: number) => (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDrag({ side, i })
  }

  const onMove = (side: 'L' | 'R', vp: Viewport) => (e: React.PointerEvent) => {
    if (!drag || drag.side !== side) return
    const w = vp.toWorld(e)
    const p: Complex = { re: w.x, im: w.y }
    if (side === 'L') moveLeft(drag.i, p)
    else moveRight(drag.i, p)
  }

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* ---- left: five CONTROL points, one curve ---- */}
      <FigureFrame
        world={LEFT_WORLD}
        base={BASE}
        notation={['five CONTROL points', '10 DOF, 10 conditions', 'w₀ = √N₀, then ÷ ⇒ 1']}
        readouts={[
          { label: 'solutions', value: leftSol ? '1' : '0' },
          { label: 'arc len', value: leftSol ? leftSol.arcLength.toFixed(2) : '—' },
          leftOffFrame
            ? { label: '', value: 'off frame', tone: 'warn' as const }
            : { label: '', value: 'in frame', tone: 'ok' as const },
        ]}
        controls={
          <button
            onClick={() => setLeft(LEFT_START)}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        }
        caption={
          <>
            <b>As control points: exactly one curve, for every polygon.</b> A square root, then three
            divisions — no equation is ever solved, so nothing can branch and nothing can fail.{' '}
            <span className="text-slate-400">
              Drag gently: the map has gain ≈ 10, so a tenth of a leg doubles the curve.
            </span>
          </>
        }
      >
        {(vp) => (
          <g onPointerMove={onMove('L', vp)} onPointerUp={() => setDrag(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />
            {leftSol && (
              <>
                <ControlPolygon vp={vp} cps={leftSol.controlPoints} />
                <path d={pathOf(vp, leftSol.controlPoints)} {...curveStroke(vp, true)} />
                {[5, 6, 7].map((k) => (
                  <DerivedPoint key={k} vp={vp} p={leftSol.controlPoints[k]} label={`P${SUB[k]}`} />
                ))}
              </>
            )}
            {left.map((p, i) => (
              <DataPoint
                key={i}
                vp={vp}
                p={p}
                label={`P${SUB[i]}`}
                dragging={drag?.side === 'L' && drag.i === i}
                onPointerDown={grab('L', i)}
              />
            ))}
          </g>
        )}
      </FigureFrame>

      {/* ---- right: five points ON the curve, eight curves ---- */}
      <FigureFrame
        world={RIGHT_WORLD}
        base={BASE}
        notation={['five points ON the curve', '10 DOF, 10 conditions', 'rᵀQⱼr = 0 ⇒ 2³ = 8']}
        readouts={[
          { label: 'solutions', value: String(branches.length) },
          { label: 'R = ∫|κ|ds', value: sel ? showR(sel.solution) : '—' },
          selected === fairest
            ? { label: '', value: 'fairest ✓', tone: 'ok' as const }
            : { label: '', value: 'fairest is another', tone: 'plain' as const },
        ]}
        controls={
          <button
            onClick={() => {
              setRight({ points: RIGHT_START, branches: RIGHT_SEED })
              setSelected(0)
            }}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        }
        caption={
          <>
            <b>As points on the curve: eight, always.</b> The same ten conditions become three
            quadrics in ℙ³. The unknowns are complex, so all eight Bézout roots are real curves —
            they never vanish, they only collide.{' '}
            <span className="text-slate-400">Click a curve to select it.</span>
          </>
        }
      >
        {(vp) => (
          <g onPointerMove={onMove('R', vp)} onPointerUp={() => setDrag(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {branches.map((b, i) =>
              i === selected ? null : (
                <g key={`u${i}`}>
                  <path d={pathOf(vp, b.solution.controlPoints)} {...curveStroke(vp, false)} />
                  <path
                    d={pathOf(vp, b.solution.controlPoints)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={vp.px(FIG.size.curveHit)}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => { e.stopPropagation(); setSelected(i) }}
                  />
                </g>
              ),
            )}

            {sel && (
              <>
                <ControlPolygon vp={vp} cps={sel.solution.controlPoints} />
                <path d={pathOf(vp, sel.solution.controlPoints)} {...curveStroke(vp, true)} />
              </>
            )}

            {right.points.map((p, i) => (
              <DataPoint
                key={i}
                vp={vp}
                p={p}
                dragging={drag?.side === 'R' && drag.i === i}
                onPointerDown={grab('R', i)}
              />
            ))}
          </g>
        )}
      </FigureFrame>
    </div>
  )
}
