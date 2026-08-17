// ============================================================================
// Degree 7 in the plane, ten conditions either way — and the counts are 4 and 8.
//
// Both panels prescribe FIVE planar points on the same curve type, so both impose ten
// real conditions on ten real degrees of freedom (w cubic = 8, plus the translation = 2;
// the planar gauge w ↦ −w is DISCRETE and costs none). Both systems are square. What
// differs is WHICH functionals are prescribed, and that alone sets the count.
//
//   LEFT   control points P₀P₁P₂ and P₆P₇   →  FOUR curves
//          Three at the start fix legs N₀,N₁; two at the end fix N₆; the gap yields only
//          the SUM N₂+N₃+N₄+N₅. So w₀ = √N₀ (the ± is the gauge), w₁ = N₁/w₀, then
//          w₃ = ±√N₆ — a GENUINE branch, the gauge being already spent — and finally a
//          quadratic in w₂. Two signs × two roots = four.
//
//   RIGHT  five points ON the curve  →  EIGHT curves
//          Substituting wⱼ = w₀rⱼ cancels w₀² and leaves three quadrics in ℙ³ — a Cayley
//          octad, 2³ = 8. The unknowns are COMPLEX, so every Bézout root is a genuine
//          real curve: the eight never vanish, they only collide.
//
// The third data point is not on screen but belongs to the story: the CONSECUTIVE set
// P₀…P₄ gives exactly ONE curve, by a cascade that never solves an equation. Same five
// points, same ten conditions, and the count runs 1, 2, 4 or 8 purely by which five —
// a gap that stops short of N₆ stays linear in w₃, one that swallows N₆ = w₃² turns
// quadratic, and the count is the product.
//
// WHY THE SPLIT SET AND NOT THE CONSECUTIVE ONE, for the panel you can drag: the
// consecutive cascade has gain ≈ 10 (its w₃ comes out of 10·(N₃ − …)/w₀, the factor being
// C(6,3)/2 — 1 for the cubic, 3 for the quintic, 10 here, so stiffness GROWS WITH
// DEGREE). Dragging its last point by five leg-lengths multiplies arc length by 370. The
// split set gets w₃ from a square root of prescribed data instead, never incurs the
// factor, and the same drag changes arc length by 1.5×. Measured in
// core/__tests__/phPlanarSeptic.test.ts.
//
// The panels do not share their points: the two problems want different seeds, and
// feeding interpolation points into a control polygon gives a curve of arc length ~400
// on data spanning 5.
// ============================================================================
import { useState } from 'react'
import type { Complex } from '../../core/complex'
import {
  type Spinor4,
  type PlanarSepticSolution,
  planarSepticFromSplitControlPoints,
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
import { trackOrder, controlPolygonDistance } from '../framework/branchTracking'
import type { Viewport } from '../framework/useViewport'

const BASE = { width: 430, height: 330 }
const SUB = '₀₁₂₃₄₅₆₇'

/** Which control points the left panel prescribes, and which fall out. */
const GIVEN = [0, 1, 2, 6, 7] as const
const DERIVED = [3, 4, 5] as const

/**
 * The left seed: the prescribed control points of a PH septic chosen by search, not by
 * hand. The criteria were the ones the picture needs and hand-picking kept missing — an
 * aspect ratio near the panel's 1.30, four branches separated by ≥ ¼ of the box diagonal
 * so none hides under another, and one visibly smooth member (R ≈ 1.8) against three
 * loopier ones. A near-straight seed makes all four coincide in a sliver.
 */
const LEFT_START: Complex[] = (() => {
  const w: Spinor4 = [
    { re: 1.923, im: 1.403 }, { re: 1.299, im: 1.586 },
    { re: 0.301, im: 2.992 }, { re: 0.173, im: 2.973 },
  ]
  const cps = controlPointsOf(w, { re: 1.903, im: -1.793 })
  return GIVEN.map((k) => cps[k])
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

function boxOf(pts: readonly Complex[], pad = 0.14) {
  const xs = pts.map((p) => p.re)
  const ys = pts.map((p) => p.im)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys), y1 = Math.max(...ys)
  const mx = Math.max((x1 - x0) * pad, 0.2)
  const my = Math.max((y1 - y0) * pad, 0.2)
  return { x0: x0 - mx, x1: x1 + mx, y0: y0 - my, y1: y1 + my }
}

/** Fairest first — R = ∫|κ|ds, the survey's selector, and deterministic on load. */
const byFairness = <T extends { rotationIndex: number }>(a: T, b: T): number => {
  const va = Number.isFinite(a.rotationIndex) ? a.rotationIndex : Infinity
  const vb = Number.isFinite(b.rotationIndex) ? b.rotationIndex : Infinity
  return va - vb
}

const solveLeft = (pts: readonly Complex[]): PlanarSepticSolution[] =>
  [...planarSepticFromSplitControlPoints(pts)].sort(byFairness)

/**
 * Both boxes are computed ONCE from the seed and fixed thereafter — recomputing during a
 * drag would make the view lurch. Each is sized to hold ALL of its panel's branches,
 * which differ in extent, so guessing the box by hand gets it wrong.
 */
const LEFT_SEED = solveLeft(LEFT_START)
const LEFT_WORLD = boxOf([
  ...LEFT_SEED.flatMap((s) => sampleCurve(s.controlPoints, 120)),
  ...LEFT_START,
])

/**
 * Fairest first, so the deck opens on the curve the classical selector would choose
 * rather than on whichever homotopy path happened to finish first. Sorted ONLY here and
 * on a global re-solve: during a drag the branches are carried by continuation, which
 * keeps identity by array position, and re-sorting each frame would make the selection
 * hop between curves whenever two of them traded places in R.
 */
const byFairnessBranch = (a: SepticBranch, b: SepticBranch): number =>
  byFairness(a.solution, b.solution)

const RIGHT_SEED = [...septicInterpolants(RIGHT_START)].sort(byFairnessBranch)
const RIGHT_WORLD = boxOf(RIGHT_SEED.flatMap((b) => sampleCurve(b.solution.controlPoints, 120)))

const pathOf = (vp: Viewport, cps: readonly Complex[], n = 220): string => {
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = bezierAt(cps, i / n)
    const s = vp.toScreen({ x: p.re, y: p.im })
    d += `${i ? 'L' : 'M'} ${s.x.toFixed(3)} ${s.y.toFixed(3)} `
  }
  return d
}

/** R diverges at a cusp (w vanishes, so |κ| is not integrable there). Say so. */
const showR = (sol: PlanarSepticSolution): string =>
  Number.isFinite(sol.rotationIndex) && sol.rotationIndex < 1e3
    ? sol.rotationIndex.toFixed(2)
    : 'cusp'

const branchCost = (a: SepticBranch, b: SepticBranch): number =>
  controlPolygonDistance(a.solution, b.solution)

/** The grey, clickable copy of a curve you are not on. */
function GhostCurve({ vp, cps, onPick }: { vp: Viewport; cps: readonly Complex[]; onPick: () => void }) {
  const d = pathOf(vp, cps)
  return (
    <g>
      <path d={d} {...curveStroke(vp, false)} />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={vp.px(FIG.size.curveHit)}
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => { e.stopPropagation(); onPick() }}
      />
    </g>
  )
}

// ---------------------------------------------------------------------------

export default function PlanarSepticFigure() {
  const [left, setLeft] = useState({ points: LEFT_START, branches: LEFT_SEED })
  const [leftSel, setLeftSel] = useState(0)
  const [right, setRight] = useState({ points: RIGHT_START, branches: RIGHT_SEED })
  const [rightSel, setRightSel] = useState(0)
  const [drag, setDrag] = useState<{ side: 'L' | 'R'; i: number } | null>(null)

  const lSel = left.branches[Math.min(leftSel, Math.max(0, left.branches.length - 1))]
  const rSel = right.branches[Math.min(rightSel, Math.max(0, right.branches.length - 1))]

  const fairest = <T extends { rotationIndex: number }>(xs: readonly T[]): number =>
    xs.reduce((best, s, i) => (byFairness(s, xs[best]) < 0 ? i : best), 0)

  const moveLeft = (i: number, p: Complex) =>
    setLeft((prev) => {
      const points = prev.points.map((q, k) => (k === i ? p : q))
      const solved = solveLeft(points)
      // Four branches: the exact minimum-cost relabelling is cheap to enumerate, so the
      // colours never jump. The ± of a principal square root is not continuous, which is
      // precisely why the raw solver order cannot be trusted across a drag.
      return {
        points,
        branches:
          solved.length === prev.branches.length
            ? trackOrder(solved, prev.branches, controlPolygonDistance)
            : solved,
      }
    })

  const moveRight = (i: number, p: Complex) =>
    setRight((prev) => {
      const points = prev.points.map((q, k) => (k === i ? p : q))
      // Continuation first: each branch is carried from its own previous root, so branch
      // identity is preserved by construction and no permutation matching is needed.
      const carried = trackSepticInterpolants(points, prev.branches.map((b) => b.root))
      if (carried.every(Boolean) && carried.length === prev.branches.length) {
        return { points, branches: carried as SepticBranch[] }
      }
      const fresh = septicInterpolants(points)
      return {
        points,
        branches:
          fresh.length === prev.branches.length
            ? trackOrder(fresh, prev.branches, branchCost)
            : [...fresh].sort(byFairnessBranch),
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

  const resetButton = (onClick: () => void) => (
    <button
      onClick={onClick}
      className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
    >
      reset
    </button>
  )

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* ---- left: five CONTROL points, split — four curves ---- */}
      <FigureFrame
        world={LEFT_WORLD}
        base={BASE}
        notation={['control points P₀P₁P₂ · P₆P₇', '10 DOF, 10 conditions', 'w₃ = ±√N₆, then a quadratic ⇒ 4']}
        readouts={[
          { label: 'solutions', value: String(left.branches.length) },
          { label: 'arc len', value: lSel ? lSel.arcLength.toFixed(3) : '—' },
          leftSel === fairest(left.branches)
            ? { label: '', value: 'fairest ✓', tone: 'ok' as const }
            : { label: '', value: 'fairest is another', tone: 'plain' as const },
        ]}
        controls={resetButton(() => {
          setLeft({ points: LEFT_START, branches: LEFT_SEED })
          setLeftSel(0)
        })}
        caption={
          <>
            <b>Five control points, four curves.</b> The gap from P₂ to P₆ gives only the sum of the
            legs it spans, so w₃ = ±√N₆ becomes a real choice and w₂ solves a quadratic. Take the same
            five consecutively, P₀…P₄, and there is exactly <i>one</i>.{' '}
            <span className="text-slate-400">Drag any blue point; click a curve to select it.</span>
          </>
        }
      >
        {(vp) => (
          <g onPointerMove={onMove('L', vp)} onPointerUp={() => setDrag(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {left.branches.map((s, i) =>
              i === leftSel ? null : (
                <GhostCurve key={`l${i}`} vp={vp} cps={s.controlPoints} onPick={() => setLeftSel(i)} />
              ),
            )}

            {lSel && (
              <>
                <ControlPolygon vp={vp} cps={lSel.controlPoints} />
                <path d={pathOf(vp, lSel.controlPoints)} {...curveStroke(vp, true)} />
                {DERIVED.map((k) => (
                  <DerivedPoint key={k} vp={vp} p={lSel.controlPoints[k]} label={`P${SUB[k]}`} />
                ))}
              </>
            )}

            {left.points.map((p, i) => (
              <DataPoint
                key={i}
                vp={vp}
                p={p}
                label={`P${SUB[GIVEN[i]]}`}
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
          { label: 'solutions', value: String(right.branches.length) },
          { label: 'R = ∫|κ|ds', value: rSel ? showR(rSel.solution) : '—' },
          rightSel === right.branches.reduce(
            (best, b, i) => (byFairness(b.solution, right.branches[best].solution) < 0 ? i : best),
            0,
          )
            ? { label: '', value: 'fairest ✓', tone: 'ok' as const }
            : { label: '', value: 'fairest is another', tone: 'plain' as const },
        ]}
        controls={resetButton(() => {
          setRight({ points: RIGHT_START, branches: RIGHT_SEED })
          setRightSel(0)
        })}
        caption={
          <>
            <b>Five points on the curve, eight.</b> The same ten conditions become three quadrics in
            ℙ³. The unknowns are complex, so all eight Bézout roots are real curves — they never
            vanish, they only collide.{' '}
            <span className="text-slate-400">Click a curve to select it.</span>
          </>
        }
      >
        {(vp) => (
          <g onPointerMove={onMove('R', vp)} onPointerUp={() => setDrag(null)}>
            <rect x={-1e4} y={-1e4} width={2e4} height={2e4} fill="transparent" />

            {right.branches.map((b, i) =>
              i === rightSel ? null : (
                <GhostCurve
                  key={`r${i}`}
                  vp={vp}
                  cps={b.solution.controlPoints}
                  onPick={() => setRightSel(i)}
                />
              ),
            )}

            {rSel && (
              <>
                <ControlPolygon vp={vp} cps={rSel.solution.controlPoints} />
                <path d={pathOf(vp, rSel.solution.controlPoints)} {...curveStroke(vp, true)} />
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
