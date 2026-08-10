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
// coordinates — the two ends, their neighbours, and the middle — and one dimension is left over. That
// is why {P₀, P₁, P₃, P₅, P₆} are handles and P₂, P₄ are not: the grey pair is what absorbs. Drag one
// handle and the other four are held; nothing else about the arrangement is a choice.
//
// MEASURED BEFORE IT WAS BUILT (same test). Dragging one of the five with the other four held tracks
// the cursor to 100% for four of them over a long path, the held points stay put to 2e-15, and the
// residual never leaves machine zero. P₀ is the exception at 87%, which is honest and visible: ρ₁ is
// the distance from P₀ to P₁, so holding P₁ while dragging P₀ drives that sphere's radius directly.
//
// THE LEFTOVER DIMENSION IS A ROAD, and that is the second version of this figure. The first spent it
// on an abstract slider, which is what it felt like. But the dimension has a concrete picture: with
// the five held, P₂ is confined to a CURVE in space and P₄ runs along with it. So the road is DRAWN
// (locusSamples — measured: 36 samples, arc 1.65 against a polygon span of 1.45, chord/arc 0.83, so it
// is genuinely curved and worth drawing) and the gesture is to PUSH the grey point along it. Measured:
// a cursor 60° off the road still slides P₂ 1.50 along it with the five held to 2e-15. No slider, no
// orientation to carry, no re-seating — and it is slide 4's gesture one dimension up.
//
// WHY NOT A NAMED QUANTITY, which took a measurement to learn. With all five held, ρ₂ is CONSTANT
// along the road (a dead dial, 0% both ways), while ρ₃, ρ₄ and the total arc length each sit at a FOLD,
// running one way and stalling or reversing the other. A fold is where a readout stops being a
// coordinate; it is not a solver defect. The road has no such problem: it is the family's own shape.
//
// The road ends where the family does — ρ₄ falls toward zero going one way, and a sphere of zero
// radius is a point-sphere. That is a boundary, not a stall, and the drawn road shows it as an end
// rather than reporting it in words.
//
// FREE MODE holds NOTHING, which was measured against the alternative (ends pinned): all seven points
// track the cursor to 100% either way, and with nothing pinned the rest of the curve answers more
// evenly — the largest companion motion is 1.22 against 3.07. So free is the literal thing: every
// control point moves, and minimum norm spends the fifteen spare dimensions.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  arcLength,
  controlPoints,
  curveAt,
  denominatorRealRoots,
  dragAlongLocus,
  dragControlPoint,
  farinPoints,
  freeRadiusIndices,
  locusSamples,
  measuredSpeed,
  radii,
  residual,
  shapeMeasures,
  speedAt,
} from '../../core/conformalPHCurve'
import { sexticSeed } from '../../core/conformalPHSeeds'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

/** The five you can touch, and the two that absorb. 15 + 1 = 16. */
const TOUCH = [0, 1, 3, 5, 6]
const GREY = [2, 4]
/** Whose locus is walked to draw the road. Either grey point gives the same one-dimensional family. */
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

/** The longest polygon edge, the unit every step size here is quoted in. */
const SPAN = Math.max(
  ...controlPoints(START).map((p, i, a) => (i ? vnorm(vsub(p, a[i - 1])) : 0)),
)

const BOUNDS = (() => {
  // Generous: both modes reshape well outside the seed's own extent, and a camera reframed mid-gesture
  // is worse than one framed a little wide.
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

/**
 * How the road is sampled. Each sample is a solve, so this is the one place a settle costs time:
 * 14 steps either way at 6% of the span, which is enough to reach both ends of the measured locus.
 */
const ROAD = { steps: 14, bite: SPAN * 0.06 }

type Mode = 'strict' | 'free'

export default function SexticFivePointFigure() {
  const [mode, setMode] = useState<Mode>('strict')
  const [state, setState] = useState<ConformalPHCurve>(START)
  const [grabbed, setGrabbed] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  /**
   * The state the road was drawn from. Dragging a HANDLE lands on a different road, so it is redrawn
   * when the handle is released — not per frame, since each sample costs a solve. Pushing a GREY point
   * travels along the road that is already drawn, so it leaves this alone and the road stays put under
   * the point, which is the whole visual point of drawing it.
   */
  const [settled, setSettled] = useState<ConformalPHCurve>(START)

  const strict = mode === 'strict'

  const cps = useMemo(() => controlPoints(state), [state])
  const beads = useMemo(() => farinPoints(state), [state])
  const curvePts = useMemo(() => sampleCurve(state, CURVE_SAMPLES).map(tri), [state])
  const rs = useMemo(() => radii(state), [state])

  /** One walk gives BOTH roads, since each sample is a whole curve. */
  const roads = useMemo(() => {
    if (!strict) return null
    const road = locusSamples(settled, RIDER, TOUCH, ROAD)
    if (road.length < 3) return null
    return GREY.map((i) => road.map((s) => tri(controlPoints(s)[i])))
  }, [settled, strict])

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

  const grab = (i: number) => (): void => {
    setGrabbed(i)
    setStalled(false)
  }

  /** A handle drag changed which road exists; a grey push did not. */
  const drop = (i: number) => (): void => {
    setGrabbed(null)
    if (strict && !GREY.includes(i)) setSettled(state)
  }

  /** Drag a HANDLE: strict holds the other four, free holds nothing at all. */
  const dragHandle = (i: number, [x, y, z]: [number, number, number]): void => {
    const step = dragControlPoint(state, i, { x, y, z },
      strict ? { pin: TOUCH.filter((k) => k !== i) } : { pin: [] })
    if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
  }

  /** Push a GREY point: it has only its road to move along, and the cursor need not be on it. */
  const pushGrey = (i: number, [x, y, z]: [number, number, number]): void => {
    const step = dragAlongLocus(state, i, { x, y, z }, { pin: TOUCH, maxStep: 0.06 })
    if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
  }

  const reset = (): void => {
    setState(START)
    setSettled(START)
    setGrabbed(null)
    setStalled(false)
  }

  const toMode = (next: Mode) => (): void => {
    setMode(next)
    setStalled(false)
    // Entering strict, the road is the one through wherever free mode left the curve.
    if (next === 'strict') setSettled(state)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 6',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        strict ? '5 points × 3 + 1 road = 16' : 'nothing held — 15 spare',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'real roots of w', value: `${denominatorRealRoots(state)} — genuinely sextic`, tone: 'ok' as const },
        ...RADIUS_LABELS.map(({ index, label }) => ({ label, value: rs[index].toFixed(3) })),
        { label: 'L', value: arcLength(state, 8).toFixed(3) },
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        // Constant width, non-breaking pad: a readout that changes width can re-wrap the row and slide
        // a control out from under the pointer. See RationalPHQuarticFigure.
        { label: 'step', value: (stalled ? 'not reached' : '—').padEnd(11, ' ') },
      ]}
      controls={
        <span className="flex items-center gap-2 flex-wrap justify-center">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            <button
              onClick={toMode('strict')}
              className={`px-2 py-[0.15em] ${strict ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              strict
            </button>
            <button
              onClick={toMode('free')}
              className={`px-2 py-[0.15em] ${!strict ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              free
            </button>
          </span>
          <span className="text-slate-400">
            {strict
              ? 'drag a blue point — the other four hold; push a grey one along its road'
              : 'drag any of the seven — nothing is held'}
          </span>
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        strict ? (
          <>
            <b>Five control points and one road — that is the whole family.</b> Seven points is 21
            numbers for an 18-dimensional family, so the polygon looks over-determined; it is, and by{' '}
            <b>five</b>, because two family directions move no control point at all — the projective
            scale, and slide 13's reparametrisation, which slides the <b>beads</b> and leaves every
            centre alone. What is reachable is <b>16</b>-dimensional, and 16 = 5 × 3 + 1: drag any{' '}
            <b>blue</b> point and the other four are <i>held</i>, while <b>grey P₂ and P₄ absorb</b> —
            measured to track the cursor to 100% for four of the five, with the held points staying put
            to 2e-15 and the curve never leaving the family.{' '}
            <b>The one dimension left over is drawn.</b> Hold the five and the grey points are not free
            in space: each is confined to a <b>road</b>, and they travel it together. Push one and it
            slides — the cursor need not be on the road, and a shove 60° off it still carries the point
            1.5 units along. Which is why the dial here is not a number: ρ₂ is <i>constant</i> along the
            road, and ρ₃, ρ₄ and the arc length each turn back at a fold.{' '}
            <span className="text-slate-400">
              P₀ is the one stiff handle (87%, not 100%): ρ₁ is the distance from P₀ to P₁, so holding
              P₁ drives that sphere directly. The road ENDS, and the end is real — ρ₄ falls toward zero
              one way, and a sphere of zero radius is a point-sphere, a boundary of the family. Moving a
              blue point puts you on a different road, redrawn when you let go. Drag the background to
              rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free: nothing is held.</b> Drag any of the seven and the other six answer — fifteen
            spare dimensions, spent by minimum norm. Measured against the alternative of pinning the
            two ends: both track the cursor to 100%, and holding nothing lets the rest of the curve
            answer more evenly (largest companion motion 1.22 against 3.07). Coming back to{' '}
            <b>strict</b> draws the road through wherever you left the curve.{' '}
            <span className="text-slate-400">
              Both readouts are measured, not asserted: the curve stays on the null quadric and exactly
              PH throughout, so no drag here can leave the family. Drag the background to rotate.
            </span>
          </>
        )
      }
    >
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {/* the two roads: the one dimension the five held points leave, made visible */}
      {roads?.map((road, i) => (
        <Curve3D key={`road${i}`} points={road} color={FIG.color.derived} width={1.4} />
      ))}

      {/* the Farin beads — the weights, and what the reparametrisation moves */}
      {beads.map((b, i) =>
        Number.isFinite(b.x) ? (
          <Point3D key={`bead${i}`} position={tri(b)} color={FIG.color.derived} radius={0.026} derived />
        ) : null,
      )}

      {/*
        Colour carries one distinction and it is static: blue is a handle that goes where you point,
        grey is a point with only a road. In free mode there are no roads, so every point is blue.
        Nothing recolours mid-drag — see the note in RationalPHQuarticFigure for why that mattered.
      */}
      {cps.map((p, i) => {
        const onRoad = strict && GREY.includes(i)
        return (
          <DragPoint3D
            key={`cp${i}`}
            position={tri(p)}
            color={
              grabbed === i
                ? FIG.color.dataPointDrag
                : onRoad
                  ? FIG.color.derived
                  : FIG.color.dataPoint
            }
            radius={onRoad ? 0.042 : 0.048}
            onDragStart={grab(i)}
            onDragEnd={drop(i)}
            onDrag={(q) => (onRoad ? pushGrey(i, q) : dragHandle(i, q))}
          />
        )
      })}
    </Figure3D>
  )
}
