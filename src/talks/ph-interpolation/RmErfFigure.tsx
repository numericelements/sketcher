// ============================================================================
// SLIDE 9 — a curve whose natural frame does not twist, and you can edit it.
//
// The simplest possible statement of the frames story: ONE degree-7 PH curve, always
// inside the RM-ERF class, every control point draggable. No toggle, no slider.
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
// and gestures. core/phSpatialSeptic carries all of it, with 18 tests.
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type SpatialPHSeptic,
  controlPoints,
  curveAt,
  dragInClass,
  erfAt,
  findClassMember,
  minSpeed,
  planarity,
  rmErfResidual,
  totalErfTwist,
} from '../../core/phSpatialSeptic'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
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
  const [curve, setCurve] = useState<SpatialPHSeptic>(START)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  const last = useRef<SpatialPHSeptic>(START)

  const cps = useMemo(() => controlPoints(curve), [curve])

  const curvePts = useMemo(
    () => Array.from({ length: 121 }, (_, i) => tri(curveAt(curve, i / 120))),
    [curve],
  )

  /** The comb and the rail: the frame's second axis, drawn along the curve. */
  const frame = useMemo(() => {
    const bars: [number, number, number][][] = []
    const rail: [number, number, number][] = []
    for (let k = 0; k <= STATIONS; k++) {
      const t = k / STATIONS
      const f = erfAt(curve.A, t)
      if (!f) continue
      const at = curveAt(curve, t)
      const tip: Vec3 = { x: at.x + f.e2.x * COMB, y: at.y + f.e2.y * COMB, z: at.z + f.e2.z * COMB }
      bars.push([tri(at), tri(tip)])
      rail.push(tri(tip))
    }
    return { bars, rail }
  }, [curve])

  const twist = useMemo(() => totalErfTwist(curve.A), [curve])
  const classResidual = useMemo(
    () => Math.max(...rmErfResidual(curve.A).map(Math.abs)),
    [curve],
  )

  const reset = (): void => {
    setCurve(START)
    last.current = START
    setDragIdx(null)
    setStalled(false)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['e₁,e₂,e₃ = A i A*, A j A*, A k A* over σ', 'ω₁ = 2·scal(A i A′*)/σ² ≡ 0', 'the ERF *is* the RMF']}
      readouts={[
        { label: 'twist ∫|ω₁|ds', value: twist.toExponential(1), tone: 'ok' as const },
        { label: 'in class', value: classResidual.toExponential(1), tone: 'ok' as const },
        { label: 'min σ', value: minSpeed(curve.A).toFixed(3), tone: 'ok' as const },
        { label: 'non-planar', value: planarity(curve.A).toFixed(3) },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
          reset
        </button>
      }
      caption={
        <>
          <b>A curve whose natural frame never rotates about the tangent — and it stays that way
          while you edit it.</b>{' '}
          On a degree-7 PH curve the Euler–Rodrigues frame is three sandwiches,{' '}
          <i>A i A*</i>, <i>A j A*</i>, <i>A k A*</i> over σ — rational, because σ is a polynomial.
          Normally it twists. On this class five constraints on A make the twist vanish{' '}
          <i>identically</i>, so the ERF <b>is</b> the rotation-minimizing frame: one piece, not a
          rational rotation applied to another frame. Watch the <b>rail</b> — the locus of the frame
          tips — run parallel to the curve rather than spiralling around it, and the{' '}
          <b>twist readout stay at machine zero</b> as you drag. That number is measured from the
          frame, not asserted.{' '}
          <span className="text-slate-400">
            Drag any of the eight control points; the curve never leaves the class. Drag the
            background to rotate.
          </span>
        </>
      }
    >
      {/* the frame comb, and the rail its tips trace */}
      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={bar} color={FIG.color.derived} width={1.4} />
      ))}
      <Curve3D points={frame.rail} color={FIG.color.derived} width={1.6} dashed />

      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1.2} dashed />

      {cps.map((p, i) => (
        <DragPoint3D
          key={i}
          position={tri(p)}
          color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.05}
          onDragStart={() => { setDragIdx(i); setStalled(false); last.current = curve }}
          onDragEnd={() => setDragIdx(null)}
          onDrag={([x, y, z]) => {
            const step = dragInClass(curve, i, { x, y, z })
            if (step.converged) {
              setCurve(step.state)
              setStalled(false)
            } else {
              // Report and keep the last good curve — never leave the class silently.
              setStalled(true)
            }
          }}
        />
      ))}
    </Figure3D>
  )
}
