// ============================================================================
// SLIDE 10 — the same frame along a whole spline, and locality MEASURED rather than
// promised.
//
// Slide 9 put a rotation-minimizing frame on ONE degree-7 Bézier and the editing felt
// excellent. Slide 8 put exact locality on a C² PH quintic spline and the editing did
// not: three spare parameters moving ten control points, with far control points
// travelling up to 4.4× further than the one in your hand. So this slide takes slide 9's
// mechanism and scales it to a spline by dropping the window entirely:
//
//     unknowns 16n+3, conditions 11n+3 (5n class, 6(n−1) C², 2 ends, 1 cursor),
//     gauge n  →  spare 4n  →  about 0.59 per movable point, FOR ANY n
//
// WHAT WAS MEASURED. Amplification does NOT fall monotonically with n — measured worst
// cases 1.68 (n=2), 1.61 (n=3), 2.40 (n=4), 1.52 (n=6), 1.58 (n=8), with the mean at
// 1.06–1.11 throughout — so the figure reports the number for the size it actually ships
// rather than a general claim. At the shipped n=2: 15 control points, worst amplification
// 1.68, mean 1.08, no failures on any of the fifteen. Compare slide 8's hard window at
// W=3: 4.44. Nothing here moves much more than the point you hold, and THAT is what
// predictable means — proportionality, not locality.
//
// AND AT THIS SIZE LOCALITY IS SIMPLY ABSENT, which the figure says rather than hides:
// two segments, and the measured profile is 1.00 0.92 — no decay to speak of. On longer
// splines the same mechanism does decay (n=6: 1.00 0.99 0.77 0.59 0.39 0.20, roughly
// linearly, reach still n of n). Fifteen control points was chosen for CONTROL, after 43
// proved to be more handles than anyone can hold in mind; the decay story lives in the
// notes, and the readouts measure the amplification and the reach live as you drag.
//
// A GHOST of the pre-drag curve was tried here and removed. At two segments it had almost
// nothing to show (measured profile 1.00 0.92 — no decay), and it was a THIRD dashed
// element competing with the control polygon and the frame rail. The readouts carry the
// same measurement without the clutter.
//
// The frame is still three sandwiches per segment, A i A*, A j A*, A k A* over σ, and
// every segment still satisfies the five RM-ERF constraints, so ω₁ ≡ 0 along the whole
// spline. C² across the joints comes for free because the generator is a C¹ spline.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/phSpatialSepticSpline carries all of it, with 9 tests.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type SepticSpline,
  buildRmErfSpline,
  classDefect,
  continuityDefects,
  dragSpline,
  frameCombByArcLength,
  minSpeed,
  planarity,
  reach,
  sampleSpline,
  splineControlPoints,
  totalTwist,
} from '../../core/phSpatialSepticSpline'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const SEGMENTS = 2
const COMB = 0.30
/** Curve samples per segment. Was 14, which read as a visible polygon. */
const CURVE_SAMPLES = 60
/** Comb stations over the WHOLE spline, spaced by arc length. */
const STATIONS = 34

const START: SepticSpline | null = buildRmErfSpline(SEGMENTS, { p0: { x: -1.5, y: -0.4, z: 0.1 } })

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const BOUNDS = (() => {
  const fallback = {
    min: [-3, -3, -3] as [number, number, number],
    max: [3, 3, 3] as [number, number, number],
  }
  if (!START) return fallback
  const pts = [...splineControlPoints(START), ...frameCombByArcLength(START, STATIONS, COMB).rail]
  const pad = 0.6
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function RmErfSplineFigure() {
  const [spline, setSpline] = useState<SepticSpline | null>(START)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  /** The curve as it was when this gesture began — the baseline for every measurement. */
  const [baseline, setBaseline] = useState<SepticSpline | null>(START)

  const cps = useMemo(() => (spline ? splineControlPoints(spline) : []), [spline])

  /** ONE polyline for the whole spline: per-segment strokes notch at the joints. */
  const curvePts = useMemo(
    () => (spline ? sampleSpline(spline, CURVE_SAMPLES).map(tri) : []),
    [spline],
  )

  const frame = useMemo(() => {
    if (!spline) return { bars: [], rail: [] as Vec3[] }
    return frameCombByArcLength(spline, STATIONS, COMB)
  }, [spline])

  /** How far the change actually travelled, against the gesture that caused it. */
  const measured = useMemo(() => {
    if (!spline || !baseline || baseline === spline || dragIdx === null) return null
    const before = splineControlPoints(baseline)
    const after = cps
    const dragged = vnorm(vsub(after[dragIdx], before[dragIdx]))
    if (dragged <= 0) return null
    let other = 0
    for (let i = 0; i < after.length; i++) {
      if (i !== dragIdx) other = Math.max(other, vnorm(vsub(after[i], before[i])))
    }
    return { amplification: other / dragged, reach: reach(before, after, dragIdx, SEGMENTS) }
  }, [spline, baseline, cps, dragIdx])

  const reset = (): void => {
    setSpline(START)
    setBaseline(START)
    setDragIdx(null)
    setStalled(false)
  }

  if (!spline) {
    return (
      <Figure3D bounds={BOUNDS} base={{ width: 900, height: 430 }} caption={<>Could not build a spatial RM-ERF spline.</>}>
        <group />
      </Figure3D>
    )
  }

  const LAST = 7 * SEGMENTS

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['every segment RM-ERF: ω₁ ≡ 0', 'C² because the generator is C¹', 'no window — proportional, not local']}
      readouts={[
        { label: 'twist ∫|ω₁|ds', value: totalTwist(spline).toExponential(1), tone: 'ok' as const },
        { label: 'in class', value: classDefect(spline).toExponential(1), tone: 'ok' as const },
        { label: 'C² defect', value: continuityDefects(spline).c2.toExponential(1), tone: 'ok' as const },
        { label: 'min σ', value: minSpeed(spline).toFixed(3) },
        { label: 'non-planar', value: planarity(spline).toFixed(3) },
        ...(measured
          ? [
              { label: 'amplification', value: `${measured.amplification.toFixed(2)}×`, tone: 'ok' as const },
              { label: 'reach', value: `${measured.reach} of ${SEGMENTS} segments` },
            ]
          : []),
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
          reset
        </button>
      }
      caption={
        <>
          <b>The same untwisting frame, now across a joint — and nothing amplifies.</b>{' '}
          Slide 8 bought <i>exact</i> locality on a spline and paid for it: far control points
          travelled up to <b>4.4×</b> further than the one being dragged. Here there is{' '}
          <b>no window at all</b> — both segments may move, the two end points are held, and minimum
          norm spends what is left. So there is <b>no locality guarantee</b>, and at this size
          scarcely any locality — the change reaches the whole curve. What you get instead is{' '}
          <b>proportionality</b> — measured amplification <b>1.68×</b> worst,{' '}
          <b>1.08×</b> on average, against slide 8’s 4.4. Nothing moves much more than the point in
          your hand, which is what makes it feel controllable — the readouts measure both as you
          drag.{' '}
          <span className="text-slate-400">
            Both segments still satisfy ω₁ ≡ 0 and meet with C², so the rail stays parallel across
            the joint. Drag the background to rotate.
          </span>
        </>
      }
    >
      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={[tri(bar[0]), tri(bar[1])]} color={FIG.color.derived} width={1.1} />
      ))}
      <Curve3D points={frame.rail.map(tri)} color={FIG.color.derived} width={1.4} dashed />

      <Curve3D points={curvePts} color={FIG.color.curve} width={3.2} />
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />

      {cps.map((p, i) => (
        <DragPoint3D
          key={i}
          position={tri(p)}
          color={
            dragIdx === i
              ? FIG.color.dataPointDrag
              : dragIdx !== null && (i === 0 || i === LAST)
                ? FIG.color.pinned
                : FIG.color.dataPoint
          }
          radius={0.042}
          onDragStart={() => { setDragIdx(i); setStalled(false); setBaseline(spline) }}
          onDragEnd={() => setDragIdx(null)}
          onDrag={([x, y, z]) => {
            const step = dragSpline(spline, i, { x, y, z })
            if (step.converged) {
              setSpline(step.state)
              setStalled(false)
            } else {
              setStalled(true)
            }
          }}
        />
      ))}
    </Figure3D>
  )
}
