// ============================================================================
// SLIDE 16 — NAVIGATING THE FAMILY BY ITS CONTROL POINTS. Eric's design, and the counting is what
// makes it the right one.
//
// THE COUNT. A degree-6 conformal PH curve has SEVEN control points, hence 21 coordinates, and the
// family has 18 dimensions — so a polygon looks over-determined and it IS, but not by three: the map
// from the family to the polygon has rank 16 (measured, conformalPHStructure.test.ts), because two
// family directions move NO control point at all. They are the projective scale (C ↦ cC changes
// nothing observable) and slide 13's reparametrisation (Cₖ ↦ λᵏCₖ moves the Farin beads and leaves
// every centre where it was). So a seven-point polygon is over-determined by FIVE, and the reachable
// polygons are 16-dimensional.
//
// SIXTEEN IS 15 + 1, which is the whole gesture. FIVE control points prescribed is fifteen
// coordinates — the two ends, their neighbours, and the middle — and one dimension is left over, so
// ONE slider closes it. That is why {P₀, P₁, P₃, P₅, P₆} are handles and P₂, P₄ are not: the grey
// pair is what absorbs. Drag one handle and the other four are held; nothing else about the
// arrangement is a choice.
//
// MEASURED BEFORE IT WAS BUILT (same test). Dragging one of the five with the other four held tracks
// the cursor to 100% for four of them over a long path, the held points stay put to 2e-15, and the
// residual never leaves machine zero. P₀ is the exception at 87%, which is honest and visible: ρ₁ is
// the distance from P₀ to P₁, so holding P₁ while dragging P₀ drives that sphere's radius directly.
//
// WHY THE SLIDER IS NOT A NAMED QUANTITY, which took a measurement to learn. With all five held the
// leftover is a CURVE through the family, and the obvious dial is a geometric readout — a free radius,
// an arc length. Every candidate was tried on that curve and every one fails: ρ₂ is CONSTANT along it
// (a dead slider), while ρ₃, ρ₄ and the total length each sit at a FOLD, running one way and stalling
// or reversing the other. A fold is where a readout stops being a coordinate; it is not a solver
// defect. So the slider rides the LOCUS TANGENT itself, which cannot fold because it is the family's
// own direction — core/conformalPHCurve locusDirection and slideLocus.
//
// The slider does travel further one way than the other, and that limit is real: measured, ρ₄ falls
// from 0.62 toward 0.29 as it runs, and a sphere radius reaching zero is a point-sphere — a genuine
// boundary of the family, not a stall. It is reported as "the locus ends here" rather than hidden.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  arcLength,
  controlPoints,
  curveAt,
  denominatorRealRoots,
  dragControlPoint,
  farinPoints,
  freeRadiusIndices,
  locusDirection,
  measuredSpeed,
  radii,
  residual,
  shapeMeasures,
  slideLocus,
  speedAt,
} from '../../core/conformalPHCurve'
import { sexticSeed } from '../../core/conformalPHSeeds'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

/** The five you can touch, and the two that absorb. 15 + 1 = 16. */
const TOUCH = [0, 1, 3, 5, 6]
const GREY = [2, 4]
/** The grey point whose locus the slider rides. Either would do; the family's dimension is one. */
const RIDER = 2

const START: ConformalPHCurve = sexticSeed()
const CURVE_SAMPLES = 140
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const sampleCurve = (s: ConformalPHCurve, n: number): Vec3[] => {
  const out: Vec3[] = []
  for (let k = 0; k <= n; k++) {
    const p = curveAt(s, k / n)
    if (p) out.push(p)
  }
  return out
}

/** The longest polygon edge — the unit the slider is measured in, so its range means something. */
const SPAN = Math.max(
  ...controlPoints(START).map((p, i, a) => (i ? vnorm(vsub(p, a[i - 1])) : 0)),
)

const BOUNDS = (() => {
  // Generous: the drags and the slider both reshape well outside the seed's own extent, and a
  // camera reframed mid-gesture is worse than one framed a little wide.
  const pts = [...controlPoints(START), ...sampleCurve(START, 200)]
  const pad = 0.9
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

const RADIUS_LABELS = freeRadiusIndices(START).map((index) => ({
  index,
  label: `ρ${'₀₁₂₃₄₅₆'[index]}`,
}))

/** How much of the slider's ask one solve may deliver: the backtracking in slideLocus wants small bites. */
const BITE = SPAN * 0.05

export default function SexticFivePointFigure() {
  const [state, setState] = useState<ConformalPHCurve>(START)
  const [grabbed, setGrabbed] = useState<number | null>(null)
  const [note, setNote] = useState<'' | 'stalled' | 'end of the locus'>('')
  /**
   * Where the slider handle sits, in units of SPAN, and where the curve actually is. They can differ:
   * the locus ends, and a handle snapped back to the reached value would fight the pointer.
   */
  const [asked, setAsked] = useState(0)
  const reached = useRef(0)
  /**
   * The oriented locus tangent, carried between calls so the slider's sense does not flip mid-drag.
   * A ref rather than state: nothing renders from it, and a stale copy would reverse the handle.
   */
  const heading = useRef<Vec3 | null>(null)

  const cps = useMemo(() => controlPoints(state), [state])
  const beads = useMemo(() => farinPoints(state), [state])
  const curvePts = useMemo(() => sampleCurve(state, CURVE_SAMPLES).map(tri), [state])
  const rs = useMemo(() => radii(state), [state])

  const speedError = useMemo(() => {
    let w = 0
    for (const t of [0.15, 0.35, 0.5, 0.7, 0.85]) {
      const a = Math.abs(speedAt(state, t))
      const b = measuredSpeed(state, t)
      if (b > 0) w = Math.max(w, Math.abs(a - b) / b)
    }
    return w
  }, [state])
  const defect = useMemo(() => Math.max(...residual(state).map(Math.abs)), [state])
  const shape = useMemo(() => shapeMeasures(state), [state])

  /** A control-point drag lands on a DIFFERENT locus, so the slider is re-seated at zero. */
  const reseat = (s: ConformalPHCurve): void => {
    reached.current = 0
    setAsked(0)
    heading.current = locusDirection(s, RIDER, TOUCH)
  }

  const grab = (i: number) => (): void => {
    setGrabbed(i)
    setNote('')
  }

  const drop = (): void => {
    setGrabbed(null)
    reseat(state)
  }

  const dragTo = (i: number, [x, y, z]: [number, number, number]): void => {
    const step = dragControlPoint(state, i, { x, y, z }, { pin: TOUCH.filter((k) => k !== i) })
    if (step.converged) { setState(step.state); setNote('') } else setNote('stalled')
  }

  /** Ride the leftover dimension in small bites, so the predictor is never handed a slider jump. */
  const ride = (target: number): void => {
    setAsked(target)
    let current = state
    let here = reached.current
    let dir = heading.current ?? locusDirection(current, RIDER, TOUCH)
    let ended = false
    for (let k = 0; k < 8; k++) {
      const remaining = (target - here) * SPAN
      if (Math.abs(remaining) < 1e-6) break
      const bite = Math.sign(remaining) * Math.min(Math.abs(remaining), BITE)
      const slide = slideLocus(current, RIDER, TOUCH, bite, { orient: dir })
      dir = slide.direction
      if (!(Math.abs(slide.travelled) > 1e-9)) { ended = true; break }
      current = slide.state
      here += slide.travelled / SPAN
    }
    heading.current = dir
    reached.current = here
    if (current !== state) setState(current)
    setNote(ended ? 'end of the locus' : '')
  }

  const reset = (): void => {
    setState(START)
    setGrabbed(null)
    setNote('')
    reseat(START)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 6',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        '5 points × 3 + 1 slider = 16',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'real roots of w', value: `${denominatorRealRoots(state)} — genuinely sextic`, tone: 'ok' as const },
        ...RADIUS_LABELS.map(({ index, label }) => ({ label, value: rs[index].toFixed(3) })),
        { label: 'L', value: arcLength(state, 8).toFixed(3) },
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        // Constant width, non-breaking pad: a readout that changes width can re-wrap the row and
        // slide the slider out from under the pointer. See RationalPHQuarticFigure.
        { label: 'step', value: (note || '—').padEnd(16, ' ') },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">the 16th dimension</span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.005}
              value={asked}
              onChange={(e) => ride(Number(e.target.value))}
              className="w-40"
            />
          </label>
          <span className="text-slate-400">drag a blue point — the other four hold</span>
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Five control points and one slider — that is the whole family.</b> Seven points is 21
          numbers for an 18-dimensional family, so the polygon looks over-determined; it is, and by{' '}
          <b>five</b>, because two family directions move no control point at all — the projective
          scale, and slide 13's reparametrisation, which slides the <b>beads</b> and leaves every
          centre alone. What is reachable is <b>16</b>-dimensional, and 16 = 5 × 3 + 1: drag any{' '}
          <b>blue</b> point and the other four are <i>held</i>, while <b>grey P₂ and P₄ absorb</b> —
          measured to track the cursor to 100% for four of the five, with the held points staying put
          to 2e-15 and the curve never leaving the family.{' '}
          <b>The slider is the one dimension left over</b>, and it is not a named quantity on purpose:
          with all five held, ρ₂ is <i>constant</i> along what remains, and ρ₃, ρ₄ and the arc length
          each turn back at a fold — so the dial rides the locus's own <b>tangent</b>, which cannot
          fold.{' '}
          <span className="text-slate-400">
            P₀ is the one stiff handle (87%, not 100%): ρ₁ is the distance from P₀ to P₁, so holding
            P₁ drives that sphere directly. The slider runs further one way than the other and says so
            — ρ₄ falls toward zero as it goes, and a point-sphere is a real edge of the family. Moving
            a control point lands you on a different locus, so the slider re-seats at zero. Drag the
            background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {/* the Farin beads — the weights, and what the reparametrisation moves */}
      {beads.map((b, i) =>
        Number.isFinite(b.x) ? (
          <Point3D key={`bead${i}`} position={tri(b)} color={FIG.color.derived} radius={0.026} derived />
        ) : null,
      )}

      {/* the two absorbing points: grey, and not yours to move */}
      {GREY.map((i) => (
        <Point3D key={`grey${i}`} position={tri(cps[i])} color={FIG.color.derived} radius={0.04} derived />
      ))}

      {/*
        Colour carries one distinction and it is static: can the mouse move this? Nothing recolours
        mid-drag — see the note in RationalPHQuarticFigure for why that mattered.
      */}
      {TOUCH.map((i) => (
        <DragPoint3D
          key={`cp${i}`}
          position={tri(cps[i])}
          color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.048}
          onDragStart={grab(i)}
          onDragEnd={drop}
          onDrag={(p) => dragTo(i, p)}
        />
      ))}
    </Figure3D>
  )
}
