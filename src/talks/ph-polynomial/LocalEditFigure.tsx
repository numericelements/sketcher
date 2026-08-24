// ============================================================================
// PARKED — not currently in the deck.
//
// This was the windowed local-editing slide. It is kept because the approach is a real
// alternative and the figure works; it came out because its editing FEEL was poor, which
// the measurements explain: three spare parameters moving ten control points, and
// amplification up to 4.4× (far control points travelling further than the one in your
// hand). The result it demonstrated — that the C²→C¹ relaxation is a consequence of the
// window WIDTH, not of the PH structure — survives in docs/PH_LOCAL_EDITING.md and in
// core/phSpatialSpline with 22 tests. Restoring it is one import and one slide entry.
//
// local editing of a C² spatial PH spline. One gesture, one lesson.
//
// No mode toggle, no slider. Grab any control point and drag it: THREE segments
// move, as little as they can, and C² holds everywhere. That is the whole figure.
//
// WHY THREE IS THE NUMBER, and why it is a result rather than a setting.
//
// An ordinary C² cubic B-spline gives locality away for nothing: displace one control
// point and four spans change while C² is maintained. A PH spline does not. Farouki–
// Giannelli–Sestini (Adv. Comput. Math. 42 (2016) 199–225) show that for a PLANAR C²
// PH quintic spline the two-segment support CANNOT preserve C² — holding the
// neighbours fixed leaves one complex unknown against two complex equations — so
// "the continuity between modified and unmodified segments must be relaxed from C² to
// C¹."
//
// Measured (docs/PH_LOCAL_EDITING.md): that relaxation is a consequence of the WINDOW
// WIDTH, not a cost of the PH structure.
//
//                      keep C²        relax to C¹
//     plane            W = 4          W = 2   ← the published scheme
//     space            W = 3          W = 2
//
// So widen the window by one segment and C² comes back. And SPACE NEEDS A NARROWER
// WINDOW THAN THE PLANE — per segment the plane offers 6 unknowns against 4 conditions
// per joint, space 12 against 6, so space reaches feasibility sooner. Better still,
// the plane at W = 4 is exactly square (finitely many edits, no slack) while space at
// W = 3 has a family: three genuinely shape-changing parameters once the three
// per-segment gauges are quotiented out. Space gives a family where the plane gives a
// count — the deck's central move, showing up in editing rather than interpolation.
//
// The three spare parameters are spent by MINIMUM NORM, which needs no code: a
// ridge-regularised Gauss–Newton step on an underdetermined system IS the minimum-norm
// step, so the drag already disturbs the recruited points as little as it can. They are
// also where a further invariant — curvature-extrema count, a curvature bound — would
// live, which is the next slide, not this one.
//
// WHAT THE MARKS MEAN, and all four are checkable rather than asserted:
//   · the three thick segments are the ones allowed to move;
//   · grey points are being recruited this instant (still grabbable — grey is not
//     "disabled", which is why the CURVE carries the signal and not the dots);
//   · "outside" reads the measured displacement of every control point beyond the
//     window, which sits at machine zero — locality proved, not claimed;
//   · "C² defect" reads the worst r″ mismatch across all seven joints.
//
// EVERY control point drags, the two endpoints included. A boundary condition exists
// only to protect a neighbour, so a window reaching the start imposes nothing on its
// left and the start tangent is free — dragging P₁ changes it, which is the point of
// dragging P₁. The end POINTS are boundary data and move only when they are themselves
// the handle, or min-norm would drift P₀ whenever you nudged P₁.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks
// and gestures. core/phSpatialSpline carries all of it, with 19 tests.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type SpatialPHSpline,
  c2SplineFromMiddles,
  continuityDefects,
  editWindow,
  localEdit,
  minSpeed,
  sampleSegment,
  splineControlPoints,
} from '../../core/phSpatialSpline'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const WINDOW = 3
/** Eight segments, so that three of them reads as LOCAL rather than as most of it. */
const START: SpatialPHSpline = c2SplineFromMiddles(
  [
    { u: 1.05, v: 0.22, p: -0.31, q: 0.14 },
    { u: 0.82, v: -0.44, p: 0.51, q: 0.62 },
    { u: 1.14, v: 0.35, p: 0.18, q: -0.29 },
    { u: 0.71, v: 0.63, p: -0.22, q: 0.41 },
    { u: 1.02, v: -0.18, p: 0.44, q: 0.25 },
    { u: 0.88, v: 0.41, p: 0.13, q: -0.36 },
    { u: 1.10, v: -0.27, p: 0.36, q: 0.19 },
    { u: 0.95, v: 0.30, p: -0.18, q: 0.22 },
  ],
  { u: 1, v: 0.1, p: -0.2, q: 0.05 },
  { u: 0.95, v: -0.15, p: 0.25, q: 0.3 },
  { x: -1.5, y: -0.4, z: 0.2 },
)
const SEGMENTS = START.segments.length

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** Framed once from the starting curve, with room for a drag, so the view never lurches. */
const BOUNDS = (() => {
  const pts = splineControlPoints(START)
  const pad = 1.1
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function LocalEditFigure() {
  const [spline, setSpline] = useState<SpatialPHSpline>(START)
  /** Kept after release, so the window stays visible while you talk about it. */
  const [active, setActive] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [stalled, setStalled] = useState(false)
  /** Control points as they were when this drag began — the "outside" readout's baseline. */
  const baseline = useRef<Vec3[]>(splineControlPoints(START))

  const cps = useMemo(() => splineControlPoints(spline), [spline])
  const window_ = useMemo(
    () => (active === null ? null : editWindow(spline, active, WINDOW)),
    [spline, active],
  )

  const segmentPaths = useMemo(
    () => Array.from({ length: SEGMENTS }, (_, k) => sampleSegment(spline, k, 18).map(tri)),
    [spline],
  )

  const defects = useMemo(() => continuityDefects(spline), [spline])

  /** The measured leak: how far anything OUTSIDE the window has moved. */
  const leak = useMemo(() => {
    if (!window_) return 0
    const [k0, k1] = window_
    let worst = 0
    for (let i = 0; i < cps.length; i++) {
      const inside = i >= 5 * k0 && i <= 5 * (k1 + 1)
      if (!inside) worst = Math.max(worst, vnorm(vsub(cps[i], baseline.current[i])))
    }
    return worst
  }, [cps, window_])

  const inWindow = (i: number): boolean => {
    if (!window_) return false
    return i >= 5 * window_[0] && i <= 5 * (window_[1] + 1)
  }

  const pointColour = (i: number): string => {
    if (dragging && i === active) return FIG.color.dataPointDrag
    if (inWindow(i)) return FIG.color.derived
    return FIG.color.dataPoint
  }

  const reset = (): void => {
    setSpline(START)
    setActive(null)
    setDragging(false)
    setStalled(false)
    baseline.current = splineControlPoints(START)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['r′ = A i A*, C² spline', 'displace one control point', 'three segments move, C² holds']}
      readouts={[
        {
          label: 'window',
          value: window_ ? `${WINDOW} of ${SEGMENTS} segments` : `${WINDOW} segments`,
        },
        { label: 'C² defect', value: defects.c2.toExponential(1), tone: 'ok' as const },
        {
          label: 'outside',
          value: window_ ? leak.toExponential(1) : '—',
          tone: 'ok' as const,
        },
        { label: 'min σ', value: minSpeed(spline).toFixed(3), tone: 'ok' as const },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-2">
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>An ordinary cubic B-spline gives you locality for nothing. A PH spline charges
          for it.</b>{' '}
          Displace one control point of an ordinary C² cubic and four spans change while C² is
          maintained. For a PH quintic spline the published result is that the two-segment support{' '}
          <i>cannot</i> keep C², so the continuity there must be relaxed to C¹. But that is the cost of
          the <b>window</b>, not of the PH structure: <b>widen it by one segment and C² comes back</b> —
          three in space, four in the plane, so space is the cheaper place to edit. The three thick
          segments are the ones that move; the grey points are being recruited, and they move as little
          as they can. Everything else is untouched — <b>“outside” is the measured displacement</b> of
          every control point beyond the window, not a promise.{' '}
          <span className="text-slate-400">
            Drag any point, the two ends included. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the curve, one polyline per segment so the window can be thickened */}
      {segmentPaths.map((path, k) => {
        const lit = window_ !== null && k >= window_[0] && k <= window_[1]
        return (
          <Curve3D
            key={`seg${k}`}
            points={path}
            color={lit ? FIG.color.curve : FIG.color.curveMuted}
            width={lit ? 4 : 1.8}
          />
        )
      })}

      {/* the control polygon, faint — 41 points would otherwise read as confetti */}
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />

      {cps.map((p, i) => (
        <DragPoint3D
          key={i}
          position={tri(p)}
          color={pointColour(i)}
          radius={0.035}
          onDragStart={() => {
            setActive(i)
            setDragging(true)
            setStalled(false)
            baseline.current = cps
          }}
          onDragEnd={() => setDragging(false)}
          onDrag={([x, y, z]) => {
            const step = localEdit(spline, i, { x, y, z }, { window: WINDOW, keepC2: true })
            if (step && step.converged) {
              setSpline(step.spline)
              setStalled(false)
            } else {
              // Report it and keep the last good state — never silently freeze.
              setStalled(true)
            }
          }}
        />
      ))}
    </Figure3D>
  )
}
