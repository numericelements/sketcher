// ============================================================================
// SLIDE 9 — a curve whose natural frame does not twist, and you can edit it.
//
// One degree-7 PH curve, always inside the RM-ERF class. Two ways to move it, the same
// pair as slides 4 and 6:
//
//   STRICT  pin the C¹ Hermite data — 16 unknowns against 14 conditions (5 class, 9
//           Hermite), rank measured at 14, so the null space is TWO-dimensional: one
//           gauge and ONE real freedom. So there is a CURVE of RM-ERF interpolants to
//           any given data, and a single slider rides it. The spatial cubic's fiber,
//           one act later, and now with a frame attached.
//
//           TWO THINGS THAT MADE THIS FEEL WRONG, both fixed and both worth knowing.
//           The slider thumb oscillated while dragging a datum, because the family was
//           re-traced every tick and the traced list's LENGTH varies as the walks
//           terminate; now a datum drag corrects the current curve (moveToData) and the
//           trace happens on release. And riding the slider jumped between two curves,
//           because the continuation's tangent SIGN was unoriented so the trace doubled
//           back over itself — 23 reversals in a 49-member list. Fixed in core by
//           orienting each tangent against the previous one.
//
//   FREE    drag any of the eight control points; the class is held either way.
//
//           WITH THE END POINTS HELD, whichever you are not dragging. A single degree-7
//           Bézier has NO local support, so with only the class and the cursor
//           constrained minimum norm slides the whole curve and the edit reads as stiff
//           — measured: the ends drift by more than 1e-3 per gesture without the pin,
//           under 1e-8 with it. Six conditions of nineteen unknowns buys the anchor, and
//           about four parameters are left over.
//
// The strict mode is the stronger statement: ride the slider through the whole family
// and the frame STILL never twists. That is a property of the class, not of one lucky
// curve.
//
// WHY THIS CLASS. A rational rotation-minimizing frame is reachable two ways. On a
// quintic RRMF curve the ERF twists and a rational normal-plane rotation
// θ = −2·arctan(b/a) cancels it — two pieces, so the FRAME is high degree even though
// the curve is low. On these degree-7 curves the ERF does not twist at all, so the RMF
// IS the ERF: one piece. The survey's own words: "although the curves are of higher
// degree than the RRMF quintics, their rational RMFs are actually of LOWER degree,
// since the rational normal-plane rotation is not required." You pay in curve degree
// or in frame degree, and for an editor the second is the better bargain.
//
// THE FRAME COSTS NOTHING. It is three sandwiches, one per axis:
//
//     e₁ = A i A*/σ      e₂ = A j A*/σ      e₃ = A k A*/σ,      σ = |A|²
//
// the same machinery as every other slide, with σ a polynomial — which is the whole
// reason a PH frame can be rational at all.
//
// WHAT MAKES IT AN RM FRAME. The ERF's angular velocity about the tangent is
// ω₁ = 2·scal(A i A′*)/σ² (survey eq. 13), and that vanishes identically exactly when
// the five constraints (14) hold on A's Bernstein coefficients. So membership in the
// class IS the absence of twist. Both readings are pinned by a test that imposes (14)
// and then samples ω₁ — because if either were wrong this figure would be a lie.
//
// WHAT THE VIEWER CAN CHECK, and every mark here is checkable:
//   · the RAIL — the locus of the e₂ tips — runs PARALLEL to the curve. A twisting
//     frame would spiral around it, and that is what the comb would show.
//   · "twist" reads the MEASURED ∫|ω₁| ds, at machine zero, not a promise.
//   · "in class" reads the worst of the five constraints, likewise.
//   · and it stays that way while you drag: the constraints are HARD in the solve, and
//     the leftover freedom is spent by minimum norm.
//
// ONE TRAP WORTH KNOWING, because it nearly produced a vacuous figure. Every PLANAR PH
// curve satisfies the five constraints for free — for A in span{1,k} the scal terms
// vanish one by one — so the planar family sits inside the class as a large, easily
// reached component, and minimum-norm projection falls into it (measured: four of five
// seeds landed with planarity exactly 0). A flat curve has nothing to twist about, so
// the starting curve is chosen by `findClassMember`, which searches for a genuinely
// SPATIAL member and refuses flat ones.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks
// and gestures. core/phSpatialSeptic carries all of it, with 30 tests.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type SpatialPHSeptic,
  classHermiteFamily,
  controlPoints,
  curveAt,
  dragInClass,
  erfAt,
  findClassMember,
  hermiteDataOf,
  minSpeed,
  moveToData,
  planarity,
  rmErfResidual,
  totalErfTwist,
} from '../../core/phSpatialSeptic'
import { asSpline, frameCombByArcLength } from '../../core/phSpatialSepticSpline'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const STATIONS = 26
const COMB = 0.42

/** A genuinely spatial member — see the planar trap in the header. */
const START: SpatialPHSeptic = {
  A: findClassMember() ?? [
    { u: 1, v: 0.3, p: 0.3, q: 0.3 },
    { u: 1, v: -0.3, p: 0.3, q: -0.3 },
    { u: 1, v: 0.3, p: -0.3, q: -0.3 },
    { u: 1, v: -0.3, p: -0.3, q: 0.3 },
  ],
  p0: { x: -1.1, y: -0.35, z: 0.1 },
}

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
/** The four control points the data does NOT fix — they ride the family. */
const middleOf = (c: SpatialPHSeptic): Vec3[] => controlPoints(c).slice(2, 6)
const shapeDistance = (a: readonly Vec3[], b: readonly Vec3[]): number => {
  let d = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    d = Math.max(d, Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y, a[i].z - b[i].z))
  }
  return d
}
/** Tracing is the expensive step, so it runs when a gesture ENDS, not per tick. */
const FAMILY_SAMPLES = 24
const FAMILY_STEP = 0.08
type Mode = 'strict' | 'free'

const BOUNDS = (() => {
  const pts = [...controlPoints(START)]
  for (let k = 0; k <= STATIONS; k++) {
    const f = erfAt(START.A, k / STATIONS)
    const at = curveAt(START, k / STATIONS)
    if (f) pts.push({ x: at.x + f.e2.x * COMB, y: at.y + f.e2.y * COMB, z: at.z + f.e2.z * COMB })
  }
  const pad = 0.7
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function RmErfFigure() {
  const [mode, setMode] = useState<Mode>('strict')
  /**
   * THE CURVE IS STATE, not something derived from the family.
   *
   * It used to be `family[index]`, with the family re-traced on every data change —
   * which made the slider thumb oscillate under your hand, because the traced list's
   * LENGTH varies as the walks terminate and selection-by-shape then re-indexes. Now
   * dragging a datum corrects THIS curve onto the new data (moveToData: smooth by
   * construction, and cheap), and the family is re-traced only when the gesture ENDS.
   */
  const [curve, setCurve] = useState<SpatialPHSeptic>(START)
  const [family, setFamily] = useState<SpatialPHSeptic[]>(
    () => classHermiteFamily(hermiteDataOf(START), START.A, { samples: FAMILY_SAMPLES, step: FAMILY_STEP }),
  )
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  const lastFamily = useRef<SpatialPHSeptic[]>(family)

  /** Re-trace, centred on where the curve now is. Called on gesture END, never per tick. */
  const retrace = (from: SpatialPHSeptic): void => {
    const traced = classHermiteFamily(hermiteDataOf(from), from.A, {
      samples: FAMILY_SAMPLES,
      step: FAMILY_STEP,
    })
    if (traced.length > 0) {
      lastFamily.current = traced
      setFamily(traced)
    } else {
      setFamily(lastFamily.current)
    }
  }

  /** Where the current curve sits on the traced family — by SHAPE, as slide 6 does. */
  const index = useMemo(() => {
    const want = middleOf(curve)
    let best = 0
    let bestD = Infinity
    family.forEach((m, i) => {
      const d = shapeDistance(middleOf(m), want)
      if (d < bestD) { bestD = d; best = i }
    })
    return best
  }, [family, curve])

  const cps = useMemo(() => controlPoints(curve), [curve])

  const curvePts = useMemo(
    () => Array.from({ length: 121 }, (_, i) => tri(curveAt(curve, i / 120))),
    [curve],
  )

  /**
   * The comb and the rail, with stations at EQUAL ARC LENGTH rather than equal
   * parameter — ω₁ = dθ/ds is defined per unit arc length, so arc length is the frame's
   * own parameter and the honest sampling for showing twist. A single degree-7 curve is
   * borrowed into the spline module's machinery as a one-segment spline.
   */
  const frame = useMemo(() => {
    const { bars, rail } = frameCombByArcLength(asSpline(curve), STATIONS, COMB)
    return { bars: bars.map(([a, b]) => [tri(a), tri(b)]), rail: rail.map(tri) }
  }, [curve])

  const twist = useMemo(() => totalErfTwist(curve.A), [curve])
  const classResidual = useMemo(
    () => Math.max(...rmErfResidual(curve.A).map(Math.abs)),
    [curve],
  )

  // --- mode handoff, continuous both ways --------------------------------------
  const toFree = (): void => {
    setStalled(false)
    setMode('free')
  }
  const toStrict = (): void => {
    retrace(curve)
    setStalled(false)
    setMode('strict')
  }

  const reset = (): void => {
    setCurve(START)
    retrace(START)
    setDragIdx(null)
    setStalled(false)
    setMode('strict')
  }

  /**
   * In strict mode the outer four points ARE the data — dᵢ = 7(P₁ − P₀) — so dragging
   * one re-prescribes it. Correct the CURRENT curve onto the new data rather than
   * re-tracing: one warm-started solve, smooth, and it leaves the slider alone.
   */
  const setDatum = (i: number, at: Vec3): void => {
    const put = (k: number): Vec3 => (k === i ? at : cps[k])
    const p0 = put(0), p1 = put(1), p6 = put(6), p7 = put(7)
    const next = moveToData(curve, {
      pi: p0,
      pf: p7,
      di: { x: 7 * (p1.x - p0.x), y: 7 * (p1.y - p0.y), z: 7 * (p1.z - p0.z) },
      df: { x: 7 * (p7.x - p6.x), y: 7 * (p7.y - p6.y), z: 7 * (p7.z - p6.z) },
    })
    if (next) {
      setCurve(next)
      setStalled(false)
    } else {
      // Report and keep the last good curve — never leave the class silently.
      setStalled(true)
    }
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={
        mode === 'strict'
          ? ['e₁,e₂,e₃ = A i A*, A j A*, A k A* over σ', '16 unknowns − 14 conditions', 'a curve of untwisted interpolants']
          : ['e₁,e₂,e₃ = A i A*, A j A*, A k A* over σ', 'ω₁ = 2·scal(A i A′*)/σ² ≡ 0', 'the ERF *is* the RMF']
      }
      readouts={[
        { label: 'twist ∫|ω₁|ds', value: twist.toExponential(1), tone: 'ok' as const },
        { label: 'in class', value: classResidual.toExponential(1), tone: 'ok' as const },
        { label: 'min σ', value: minSpeed(curve.A).toFixed(3), tone: 'ok' as const },
        { label: 'non-planar', value: planarity(curve.A).toFixed(3) },
        ...(mode === 'strict'
          ? [{ label: 'spare DOF', value: `1  (member ${index + 1}/${family.length})` }]
          : [{ label: 'spare DOF', value: dragIdx === 0 || dragIdx === 7 ? '7' : '4  (ends held)' }]),
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
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
          {mode === 'strict' && family.length > 1 && (
            <label className="flex items-center gap-1">
              <span className="text-slate-400">along the family</span>
              <input
                type="range"
                min={0}
                max={family.length - 1}
                step={1}
                value={index}
                onChange={(e) => setCurve(family[Number(e.target.value)])}
                className="w-40"
              />
            </label>
          )}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        mode === 'strict' ? (
          <>
            <b>Pin the data and the untwisted interpolants form a curve — one slider rides it.</b>{' '}
            Sixteen unknowns against fourteen conditions (five for the class, nine for C¹ Hermite)
            leaves <b>one</b> real freedom once the gauge is quotiented out. The four blue points{' '}
            <i>are</i> the data — dᵢ = 7(P₁ − P₀) — and the four grey ones ride what is left. The
            frame is three sandwiches, <i>A i A*</i>, <i>A j A*</i>, <i>A k A*</i> over σ: rational,
            because σ is a polynomial. <b>Ride the slider from end to end and it still never turns
            about the tangent</b> — watch the rail stay parallel and the twist readout stay at
            machine zero. That is a property of the whole class, not of one lucky curve.{' '}
            <span className="text-slate-400">
              Drag a blue point to change the data; press “free” to release it. Drag the background
              to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free.</b> Grab any of the eight — and the curve still cannot leave the class. A single
            degree-7 Bézier has <i>no local support</i>, so with only the class and your cursor
            constrained, minimum norm slides the whole curve at once. So the two{' '}
            <b>end points are held</b> — whichever one you are not dragging — which costs six
            conditions of the nineteen unknowns and buys an anchor: the curve now deforms{' '}
            <i>where you pull</i> instead of drifting bodily. About four parameters are left, spent by
            minimum norm. The five class constraints stay <i>hard</i> in that solve, never penalties,
            which is why <b>“in class” and “twist” read machine zero</b> rather than merely small.
          </>
        )
      }
    >
      {/* the frame comb, and the rail its tips trace */}
      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={bar} color={FIG.color.derived} width={1.4} />
      ))}
      <Curve3D points={frame.rail} color={FIG.color.derived} width={1.6} dashed />

      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />

      {mode === 'strict' ? (
        <>
          {/* the four the data does not fix: they ride the family, not your cursor */}
          {[2, 3, 4, 5].map((i) => (
            <Point3D key={`d${i}`} position={tri(cps[i])} color={FIG.color.derived} radius={0.045} />
          ))}
          {/* the data, drawn — dᵢ = 7(P₁ − P₀), so dragging these re-prescribes it */}
          {[0, 1, 6, 7].map((i) => (
            <DragPoint3D
              key={i}
              position={tri(cps[i])}
              color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
              radius={0.05}
              onDragStart={() => { setDragIdx(i); setStalled(false) }}
              onDragEnd={() => { setDragIdx(null); retrace(curve) }}
              onDrag={([x, y, z]) => setDatum(i, { x, y, z })}
            />
          ))}
        </>
      ) : (
        cps.map((p, i) => (
          <DragPoint3D
            key={i}
            position={tri(p)}
            color={
              dragIdx === i
                ? FIG.color.dataPointDrag
                : // an end that is being HELD this instant, rather than merely idle
                  dragIdx !== null && (i === 0 || i === 7)
                  ? FIG.color.pinned
                  : FIG.color.dataPoint
            }
            radius={0.05}
            onDragStart={() => { setDragIdx(i); setStalled(false) }}
            onDragEnd={() => setDragIdx(null)}
            onDrag={([x, y, z]) => {
              // Hold whichever end you are not holding: one Bézier segment has no
              // local support, so without an anchor min-norm slides the whole curve.
              const step = dragInClass(curve, i, { x, y, z }, { pinEnds: true })
              if (step.converged) {
                setCurve(step.state)
                setStalled(false)
              } else {
                // Report and keep the last good curve — never leave the class silently.
                setStalled(true)
              }
            }}
          />
        ))
      )}
    </Figure3D>
  )
}
