// ============================================================================
// SLIDE 6 — ten degrees of freedom, nine conditions; the tenth is a curve.
//
// Slide 4 pinned both ends of a PLANAR PH cubic and prescribed one interior point:
// 6 DOF against 6 conditions, square, so the other interior point was DETERMINED —
// two ways, discretely. Make the curve spatial and change nothing else:
//
//     10 DOF − 3 (P₀) − 3 (handle) − 3 (P₃)  =  ONE degree of freedom left over
//
// so the other interior point is not determined at all. It rides a CURVE of
// admissible positions — the fiber — and a slider travels along it. Finite choice
// has become a continuum, at the smallest degree where that happens.
//
// (10 = 8 for A₀,A₁ − 1 for the CONTINUOUS gauge A ↦ A(cos θ + i sin θ) + 3 for the
// origin. In the plane the corresponding gauge is the discrete w ↦ −w, which costs
// no dimension. That one missing dimension is the whole difference.)
//
// EITHER interior point can be the handle, as on slide 4: press the pale one and it
// becomes the one you hold while the other rides instead. Seamless, because
// prescribing P₂ with the ends pinned IS prescribing P₁ from the other end — the
// curve solves both problems (core: spatialCubicFiberAt, via reverseSpatialCubic).
//
// THE FAMILY IS ISOMETRIC. Every member has the SAME ARC LENGTH — measured, then
// proved (core: fiberArcLength). The shape changes completely, peak curvature by
// more than 5×, and the length does not move at all. So the classical fairness
// measure that would rank planar interpolants is BLIND here, which is worth saying
// on a slide about choosing.
//
// AND IT CONTAINS SLIDE 4. Exactly TWO members are PLANAR — the plane problem's two
// discrete solutions, sitting on this curve as dark beads. "Finite choice becomes a
// continuum" is not an analogy: the finite set is EMBEDDED in the continuum, and you
// can slide onto it. (They are SOLVED for by the planar solver, not hunted along the
// trace, which was unreliable.)
//
// CONTINUITY. The fiber is re-traced every drag tick, and its array length and
// direction both shift — so selecting by INDEX made the ridden point jump between
// solutions. The figure tracks the shape parameter z instead: pick the member whose
// z is nearest the last one, and seed the continuation from it so the trace itself
// stays continuous.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks
// and gestures. core/phSpatialCubic and core/phSpatialFreeDrag carry the tests.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Quat, Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type FiberPoint,
  type InteriorHandle,
  type SpatialPHCubic,
  controlPoints,
  curveAt,
  fiberArcLength,
  hodographAt,
  planarMembers,
  planarity,
  spatialCubicFiberAt,
  speedAt,
} from '../../core/phSpatialCubic'
import { dragSpatialCubicFree, spatialPHPolygonResidual } from '../../core/phSpatialFreeDrag'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const P0: Vec3 = { x: -0.9, y: 0, z: -0.35 }
const P3: Vec3 = { x: 0.9, y: 0, z: -0.35 }
const START_HANDLE: Vec3 = { x: -0.45, y: 0.35, z: 0.5 }
const FIBER_SAMPLES = 140

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const zDist = (a: Quat, b: Quat): number => Math.hypot(a.u - b.u, a.v - b.v, a.p - b.p, a.q - b.q)

const sampleCurve = (c: SpatialPHCubic, n = 60): [number, number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => tri(curveAt(c, i / n)))

/** Index of the member whose shape is nearest `z` — the continuity rule. */
function nearestByZ(fiber: readonly FiberPoint[], z: Quat | null): number {
  if (!z || fiber.length === 0) return 0
  let best = 0
  let bestD = Infinity
  fiber.forEach((f, i) => {
    const d = zDist(f.z, z)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

/** The fiber member whose ridden point is nearest a target position. */
function nearestByPoint(fiber: readonly FiberPoint[], target: Vec3): FiberPoint | null {
  let best: FiberPoint | null = null
  let bestD = Infinity
  for (const f of fiber) {
    const d = vnorm(vsub(f.derived, target))
    if (d < bestD) { bestD = d; best = f }
  }
  return best
}

/**
 * Framed and defaulted ONCE from the starting configuration; recomputing either
 * during a drag would make the view lurch. The default is the MOST SPATIAL member —
 * arc length cannot choose (it is identical for every member) and choosing the
 * gentlest picks a PLANAR one, which made the whole figure read as flat.
 */
const START_FIBER = spatialCubicFiberAt(P0, P3, START_HANDLE, 1, { samples: FIBER_SAMPLES })
const START_Z: Quat | null = (() => {
  if (START_FIBER.length === 0) return null
  let best = START_FIBER[0]
  let bestD = -1
  for (const f of START_FIBER) {
    const d = Math.abs(planarity(f.curve))
    if (d > bestD) { bestD = d; best = f }
  }
  return best.z
})()
const BOUNDS = (() => {
  const all: Vec3[] = [P0, P3, START_HANDLE, ...START_FIBER.map((f) => f.derived)]
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y), zs = all.map((p) => p.z)
  const pad = 0.3
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

type Mode = 'strict' | 'free'

export default function SpatialCubicFigure() {
  const [mode, setMode] = useState<Mode>('strict')
  const [ends, setEnds] = useState({ p0: P0, p3: P3 })
  const [which, setWhich] = useState<InteriorHandle>(1)
  const [handle, setHandle] = useState<Vec3>(START_HANDLE)
  const [chosenZ, setChosenZ] = useState<Quat | null>(START_Z)
  const [freeState, setFreeState] = useState<SpatialPHCubic | null>(null)
  const [freeInfo, setFreeInfo] = useState({ tracking: 0, disturbance: 0 })
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const lastGood = useRef<FiberPoint[]>(START_FIBER)

  const derivedIdx = which === 1 ? 2 : 1

  // --- strict: the fiber, seeded from the last shape so the trace is continuous --
  const fiber = useMemo(() => {
    const f = spatialCubicFiberAt(ends.p0, ends.p3, handle, which, {
      samples: FIBER_SAMPLES,
      seed: chosenZ ?? undefined,
    })
    if (f.length > 0) lastGood.current = f
    return f.length > 0 ? f : lastGood.current
    // chosenZ is a seed only — re-tracing on every slider tick would be waste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ends, handle, which])

  const index = nearestByZ(fiber, chosenZ)
  const chosen: FiberPoint | undefined = fiber[index]

  const curve = mode === 'free' && freeState ? freeState : chosen?.curve
  const cps: Vec3[] = curve ? controlPoints(curve) : []

  const planar = useMemo(
    () => (mode === 'strict' ? planarMembers(ends.p0, ends.p3, handle, which) : []),
    [mode, ends, handle, which],
  )

  // --- mode handoff, continuous both ways ---------------------------------------
  const toFree = () => {
    if (curve) setFreeState(curve)
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('free')
  }
  const toStrict = () => {
    if (freeState) {
      const c = controlPoints(freeState)
      setEnds({ p0: c[0], p3: c[3] })
      setHandle(c[which])
      const f = spatialCubicFiberAt(c[0], c[3], c[which], which, { samples: FIBER_SAMPLES })
      const best = nearestByPoint(f, c[derivedIdx])
      if (best) setChosenZ(best.z)
    }
    setMode('strict')
  }

  /**
   * Take hold of the ridden point instead. The curve does not change — it solves
   * both problems — so this re-locks onto the same curve on the mirrored fiber.
   */
  const swapHandle = () => {
    if (!chosen) return
    const c = controlPoints(chosen.curve)
    const next: InteriorHandle = which === 1 ? 2 : 1
    const f = spatialCubicFiberAt(ends.p0, ends.p3, c[next], next, { samples: FIBER_SAMPLES })
    const best = nearestByPoint(f, c[next === 1 ? 2 : 1])
    setWhich(next)
    setHandle(c[next])
    setChosenZ(best ? best.z : null)
  }

  const reset = () => {
    setEnds({ p0: P0, p3: P3 })
    setWhich(1)
    setHandle(START_HANDLE)
    setChosenZ(START_Z)
    setFreeState(null)
    setFreeInfo({ tracking: 0, disturbance: 0 })
    setMode('strict')
  }

  // --- readouts -------------------------------------------------------------------
  const phError = useMemo(() => {
    if (!curve) return 0
    let worst = 0
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      worst = Math.max(worst, Math.abs(vnorm(hodographAt(curve, t)) - speedAt(curve, t)))
    }
    return worst
  }, [curve])

  const spread = useMemo(() => {
    if (fiber.length < 2) return 0
    let m = 0
    for (const a of fiber) m = Math.max(m, vnorm(vsub(a.derived, fiber[0].derived)))
    return m
  }, [fiber])

  const label = (i: number): string => `P${'₀₁₂₃'[i]}`

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={
        mode === 'strict'
          ? ['r′ = A i A*', '10 DOF − 9 conditions = 1', 'the tenth is a curve']
          : ['r′ = A i A*', '10 DOF − 3 dragged = 7 spare', 'min Σ |Pⱼ − Pⱼᵒˡᵈ|²']
      }
      readouts={
        mode === 'strict'
          ? [
              { label: 'spare DOF', value: '1' },
              { label: 'holding', value: label(which) },
              { label: `${label(derivedIdx)} roams`, value: spread.toFixed(3) },
              {
                label: 'arc len',
                value: `${(fiberArcLength(ends.p0, handle, ends.p3) ?? 0).toFixed(4)} (same for all)`,
                tone: 'ok' as const,
              },
              { label: 'planar', value: String(planar.length) },
              { label: '|r′|−σ', value: phError.toExponential(1), tone: 'ok' as const },
            ]
          : [
              { label: 'spare DOF', value: '7' },
              { label: 'cursor error', value: freeInfo.tracking.toFixed(4) },
              { label: 'others moved', value: freeInfo.disturbance.toFixed(4) },
              {
                label: 'PH residual',
                value: cps.length === 4 ? spatialPHPolygonResidual(cps).toExponential(1) : '—',
                tone: 'ok' as const,
              },
            ]
      }
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
          {mode === 'strict' && fiber.length > 1 && (
            <label className="flex items-center gap-1">
              <span className="text-slate-400">along the fiber</span>
              <input
                type="range"
                min={0}
                max={fiber.length - 1}
                step={1}
                value={index}
                onChange={(e) => setChosenZ(fiber[Number(e.target.value)].z)}
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
            <b>In the plane the other interior point was determined — two ways. In space it is not
            determined at all.</b> Ten degrees of freedom minus nine conditions leaves one over, so the
            admissible positions trace the grey curve and something has to choose a point on it. The
            family is <b>isometric</b> — every member has the same arc length, so the measure that
            would rank planar interpolants cannot tell these apart. The two dark beads are the{' '}
            <b>planar</b> members: the two discrete answers from before, sitting on this curve.{' '}
            <span className="text-slate-400">
              Drag the blue point; press the pale one to hold it instead; drag the background to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free.</b> Nothing pinned, so grab <i>any</i> of the four. Ten degrees of freedom against
            three conditions leaves <b>seven</b> spare — against the plane’s four — so minimum-norm has
            far more to decide and the rest of the polygon drifts more. And the curve stays exactly PH,
            by construction.
          </>
        )
      }
    >
      {mode === 'strict' && (
        <>
          {/* the fiber: every position the data permits for the ridden point */}
          <Curve3D points={fiber.map((f) => tri(f.derived))} color={FIG.color.derived} width={2} />
          {/* the two planar members — slide 4's discrete pair, embedded here */}
          {planar.map((c, i) => (
            <Point3D key={`pl${i}`} position={tri(c[derivedIdx])} color={FIG.color.curve} radius={0.042} />
          ))}
        </>
      )}

      {curve && cps.length === 4 && (
        <>
          <Curve3D points={sampleCurve(curve)} color={FIG.color.curve} width={3.5} />
          <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
        </>
      )}

      {mode === 'strict' && cps.length === 4 ? (
        <>
          <Point3D position={tri(cps[0])} color={FIG.color.pinned} radius={0.045} />
          <Point3D position={tri(cps[3])} color={FIG.color.pinned} radius={0.045} />
          {/* the ridden point: pressing it takes hold, and drags in the same gesture */}
          <DragPoint3D
            position={tri(cps[derivedIdx])}
            color={FIG.color.derived}
            radius={0.055}
            onDragStart={swapHandle}
            onDrag={([x, y, z]) => setHandle({ x, y, z })}
          />
          <DragPoint3D
            position={tri(cps[which])}
            color={dragIdx === which ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            onDragStart={() => setDragIdx(which)}
            onDragEnd={() => setDragIdx(null)}
            onDrag={([x, y, z]) => setHandle({ x, y, z })}
          />
        </>
      ) : (
        cps.map((p, i) => (
          <DragPoint3D
            key={i}
            position={tri(p)}
            color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            onDragStart={() => setDragIdx(i)}
            onDragEnd={() => setDragIdx(null)}
            onDrag={([x, y, z]) => {
              if (!freeState) return
              const step = dragSpatialCubicFree(freeState, i, { x, y, z })
              setFreeState(step.state)
              setFreeInfo({ tracking: step.trackingError, disturbance: step.disturbance })
            }}
          />
        ))
      )}
    </Figure3D>
  )
}
