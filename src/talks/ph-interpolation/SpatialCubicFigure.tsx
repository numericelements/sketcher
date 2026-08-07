// ============================================================================
// SLIDE 6 — the same gesture, one dimension up, and the answer changes kind.
//
// Slide 4 pinned both ends of a PLANAR PH cubic and dragged P₁: 6 DOF against 6
// conditions, square, and P₂ was DETERMINED — two ways, discretely. Here the curve
// is spatial and nothing else changes:
//
//     10 DOF − 3 (P₀) − 3 (P₁) − 3 (P₃)  =  ONE degree of freedom left over
//
// so P₂ is not determined at all. It SWEEPS A CURVE of admissible positions, drawn
// here, with a slider to travel along it. Finite choice has become a continuum — the
// deck's central jump, at the smallest degree where it happens.
//
// (10 = 8 for A₀,A₁ − 1 for the CONTINUOUS gauge A ↦ A(cos θ + i sin θ) + 3 for the
// origin. In the plane the corresponding gauge is the discrete w ↦ −w, which costs
// no dimension — that one missing dimension is the whole difference.)
//
// AND THE FAMILY IS ISOMETRIC. Measured while building this figure, then proved
// (core/phSpatialCubic, fiberArcLength): every curve on the fiber has the SAME ARC
// LENGTH, to machine precision, on every fiber. The shape changes completely —
// peak curvature varies by more than an order of magnitude along it — and the
// length does not move at all. So the classical fairness measure that would rank
// planar interpolants is BLIND here, which is worth saying out loud on a slide
// about choosing.
//
// AND IT CONTAINS SLIDE 4. Exactly TWO members of the fiber are PLANAR — a planar PH
// cubic is a spatial one, so the plane problem's two discrete solutions must live
// somewhere on the spatial family, and they do, as two isolated points you can slide
// onto. "Finite choice becomes a continuum" is therefore not an analogy: the finite
// set is EMBEDDED in the continuum. They are marked on the fiber.
//
// (That also explains a wrong first default. Picking the "gentlest" member by peak
// curvature landed on a PLANAR one — planar is gentler — so the whole figure read as
// flat. The default is now the most spatial member instead.)
//
// The fiber has no closed form; it is traced by continuation in core/phSpatialCubic,
// whose 27 tests are what this figure trusts. r3f cannot be verified headlessly, so
// the rule is that this file holds no mathematics — only marks and gestures.
//
// Drag P₁ in the plane facing the camera; rotate the view to reach out of it.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  controlPoints,
  curveAt,
  fiberArcLength,
  hodographAt,
  planarMembers,
  planarity,
  speedAt,
  spatialCubicFiber,
  type FiberPoint,
  type SpatialPHCubic,
} from '../../core/phSpatialCubic'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const P0: Vec3 = { x: -0.9, y: 0, z: -0.35 }
const P3: Vec3 = { x: 0.9, y: 0, z: -0.35 }
const START_P1: Vec3 = { x: -0.45, y: 0.35, z: 0.5 }

/** Samples along the fiber. Cheap — a continuation step is a 3×4 least-norm solve. */
const FIBER_SAMPLES = 140

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const sampleCurve = (c: SpatialPHCubic, n = 60): [number, number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => tri(curveAt(c, i / n)))

/**
 * Framed and defaulted ONCE from the starting configuration; recomputing either
 * during a drag would make the view lurch.
 *
 * The default is the MOST SPATIAL member. Arc length cannot choose — it is identical
 * for every member — and choosing the "gentlest" by curvature picks a PLANAR one,
 * which made the whole figure read as flat. Most-spatial is the honest default for a
 * slide whose point is that the family leaves the plane.
 */
const START_FIBER = spatialCubicFiber(P0, START_P1, P3, { samples: FIBER_SAMPLES })
const START_ALONG = (() => {
  if (START_FIBER.length < 2) return 0.5
  let best = 0
  let bestD = -1
  START_FIBER.forEach((f, i) => {
    const d = Math.abs(planarity(f.curve))
    if (d > bestD) { bestD = d; best = i }
  })
  return best / (START_FIBER.length - 1)
})()
const BOUNDS = (() => {
  const all: Vec3[] = [P0, P3, START_P1, ...START_FIBER.map((f) => f.p2)]
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y), zs = all.map((p) => p.z)
  const pad = 0.3
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function SpatialCubicFigure() {
  const [p1, setP1] = useState<Vec3>(START_P1)
  /** Position along the fiber as a FRACTION, so the bead keeps its place as the
   *  fiber changes length under a drag. */
  const [along, setAlong] = useState(START_ALONG)
  const [dragging, setDragging] = useState(false)
  const lastGood = useRef<FiberPoint[]>(START_FIBER)

  const fiber = useMemo(() => {
    const f = spatialCubicFiber(P0, p1, P3, { samples: FIBER_SAMPLES })
    if (f.length > 0) lastGood.current = f
    return f.length > 0 ? f : lastGood.current
  }, [p1])

  const index = fiber.length > 0 ? Math.min(fiber.length - 1, Math.round(along * (fiber.length - 1))) : 0
  const chosen: FiberPoint | undefined = fiber[index]
  const cps = chosen ? controlPoints(chosen.curve) : []

  // A few faint members, so the family reads as a family and not as one curve.
  const ghosts = useMemo(() => {
    if (fiber.length < 8) return []
    const picks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => Math.round(f * (fiber.length - 1)))
    return [...new Set(picks)].filter((i) => i !== index).map((i) => sampleCurve(fiber[i].curve, 40))
  }, [fiber, index])

  const p2Path = useMemo(() => fiber.map((f) => tri(f.p2)), [fiber])

  /** The two planar members — slide 4's two answers, sitting on this curve.
   *  Solved exactly by the PLANAR solver, not hunted along the trace. */
  const planar = useMemo(() => planarMembers(P0, p1, P3), [p1])

  // Honest check, sampled: |r′| must equal σ on the chosen curve.
  const phError = useMemo(() => {
    if (!chosen) return 0
    let worst = 0
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      worst = Math.max(worst, Math.abs(vnorm(hodographAt(chosen.curve, t)) - speedAt(chosen.curve, t)))
    }
    return worst
  }, [chosen])

  const spread = useMemo(() => {
    if (fiber.length < 2) return 0
    let m = 0
    for (const a of fiber) m = Math.max(m, vnorm(vsub(a.p2, fiber[0].p2)))
    return m
  }, [fiber])

  return (
    <Figure3D
      bounds={BOUNDS}
      height={400}
      notation={['r′ = A i A*', '10 DOF − 9 conditions = 1', 'P₂ is NOT determined']}
      readouts={[
        { label: 'spare DOF', value: '1' },
        { label: 'fiber', value: `${fiber.length} samples` },
        { label: 'P₂ roams', value: spread.toFixed(3) },
        { label: 'planar members', value: String(planar.length) },
        {
          label: 'arc len',
          value: (fiberArcLength(P0, p1, P3) ?? 0).toFixed(4) + ' (same for all)',
          tone: 'ok' as const,
        },
        { label: '|r′|−σ', value: phError.toExponential(1), tone: 'ok' as const },
      ]}
      controls={
        <span className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">along the fiber</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.002}
              value={along}
              onChange={(e) => setAlong(Number(e.target.value))}
              className="w-40"
            />
          </label>
          <button
            onClick={() => {
              setP1(START_P1)
              setAlong(START_ALONG)
            }}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>In the plane P₂ was determined — two ways. In space it is not determined at all.</b> Ten
          degrees of freedom minus nine conditions leaves one over, so the admissible P₂ trace out the
          grey curve and something has to choose a point on it. Same gesture, and the answer changes
          from “pick one of two” to “pick a point on a curve”. And the family is <b>isometric</b> —
          every member has the same arc length, so the fairness measure that would rank planar
          interpolants cannot tell these apart at all. The two dark beads are the <b>planar</b>
          members — the two discrete answers from before, sitting on this curve.{' '}
          <span className="text-slate-400">Drag P₁; drag the background to rotate.</span>
        </>
      }
    >
      {/* the fiber: every P₂ the data permits */}
      <Curve3D points={p2Path} color={FIG.color.derived} width={2} />

      {/* the two PLANAR members — slide 4's discrete pair, embedded here */}
      {planar.map((m, i) => (
        <Point3D key={`pl${i}`} position={tri(m.p2)} color={FIG.color.curve} radius={0.042} />
      ))}

      {/* a few members of the family, faint */}
      {ghosts.map((g, i) => (
        <Curve3D key={i} points={g} color={FIG.color.curveMuted} width={1.2} />
      ))}

      {chosen && (
        <>
          <Curve3D points={sampleCurve(chosen.curve)} color={FIG.color.curve} width={3.5} />
          <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />
          {/* P₂ — the bead the slider drives along the fiber */}
          <Point3D position={tri(cps[2])} derived radius={0.055} />
        </>
      )}

      <Point3D position={tri(P0)} color={FIG.color.pinned} radius={0.045} />
      <Point3D position={tri(P3)} color={FIG.color.pinned} radius={0.045} />

      <DragPoint3D
        position={tri(p1)}
        color={dragging ? FIG.color.dataPointDrag : FIG.color.dataPoint}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => setDragging(false)}
        onDrag={([x, y, z]) => setP1({ x, y, z })}
      />
    </Figure3D>
  )
}
