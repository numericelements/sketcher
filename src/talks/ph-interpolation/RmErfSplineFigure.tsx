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
// WHAT WAS MEASURED, and it is the point of the slide:
//
//   · AMPLIFICATION 1.52 at n=6 and 1.58 at n=8, mean 1.06 — identical to slide 8's best
//     case (W=5: 1.51, mean 1.06), but at any length and with a frame attached. Nothing
//     moves much more than the point you hold. THAT is what predictable means.
//   · LOCALITY IS NOT ACHIEVED. Reach is n of n: the disturbance spans the whole curve,
//     decaying roughly LINEARLY to 12–30% at the far end. So the honest claim here is
//     proportionality, not locality — and the ghost of the pre-drag curve lets the viewer
//     see exactly that rather than take a number on trust.
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
  frameComb,
  minSpeed,
  planarity,
  reach,
  sampleSegment,
  splineControlPoints,
  totalTwist,
} from '../../core/phSpatialSepticSpline'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const SEGMENTS = 6
const COMB = 0.34
const PER_SEGMENT = 5

const START: SepticSpline | null = buildRmErfSpline(SEGMENTS, { p0: { x: -1.5, y: -0.4, z: 0.1 } })

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const BOUNDS = (() => {
  const fallback = {
    min: [-3, -3, -3] as [number, number, number],
    max: [3, 3, 3] as [number, number, number],
  }
  if (!START) return fallback
  const pts = [...splineControlPoints(START), ...frameComb(START, PER_SEGMENT, COMB).rail]
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

  const curvePaths = useMemo(
    () => (spline ? Array.from({ length: SEGMENTS }, (_, k) => sampleSegment(spline, k, 14).map(tri)) : []),
    [spline],
  )
  const ghostPaths = useMemo(
    () =>
      baseline && baseline !== spline
        ? Array.from({ length: SEGMENTS }, (_, k) => sampleSegment(baseline, k, 14).map(tri))
        : [],
    [baseline, spline],
  )

  const frame = useMemo(() => {
    if (!spline) return { bars: [], rail: [] as Vec3[] }
    return frameComb(spline, PER_SEGMENT, COMB)
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
      notation={['every segment RM-ERF: ω₁ ≡ 0', 'C² because the generator is C¹', 'no window — locality measured']}
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
          <b>The same untwisting frame, now along a whole spline — and locality measured instead of
          promised.</b>{' '}
          Slide 8 bought <i>exact</i> locality and paid for it: far control points travelled up to{' '}
          <b>4.4×</b> further than the one being dragged. Here there is <b>no window at all</b> — every
          segment may move, the two end points are held, and minimum norm spends the rest. The result
          is not locality: the change reaches the whole curve, decaying to roughly a fifth at the far
          end. But <b>nothing moves much more than the point in your hand</b> — measured
          amplification about <b>1.5×</b>, the same as slide 8’s best case, at any length. The{' '}
          <b>ghost</b> is the curve as it was when you started dragging, so you can see how far the
          change travelled.{' '}
          <span className="text-slate-400">
            Every segment still satisfies ω₁ ≡ 0, so the rail stays parallel. Drag the background to
            rotate.
          </span>
        </>
      }
    >
      {ghostPaths.map((g, i) => (
        <Curve3D key={`gh${i}`} points={g} color={FIG.color.curveMuted} width={1.4} dashed />
      ))}

      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={[tri(bar[0]), tri(bar[1])]} color={FIG.color.derived} width={1.1} />
      ))}
      <Curve3D points={frame.rail.map(tri)} color={FIG.color.derived} width={1.4} dashed />

      {curvePaths.map((path, k) => (
        <Curve3D key={`seg${k}`} points={path} color={FIG.color.curve} width={3.2} />
      ))}
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
          radius={0.032}
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
