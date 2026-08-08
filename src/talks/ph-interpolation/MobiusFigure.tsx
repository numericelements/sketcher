// ============================================================================
// SLIDE 10 — a RATIONAL PH curve, made by bending a polynomial one, with its frame
// still refusing to turn.
//
// THE CONSTRUCTION. Take the degree-7 RM-ERF curve of the previous slide and apply a
// Möbius transformation. Two things survive and one changes:
//
//   ‖s′‖ = ρ²σ/‖u‖²      σ is a POLYNOMIAL, so the image has RATIONAL speed — it is a
//                        rational PH curve. That is the whole construction.
//   the frame            Theorem 1 of Bartoň–Jüttler–Wang: Möbius transformations COMMUTE
//                        with computing the rotation-minimizing frame. Verified in
//                        core/phMobius, along with the stronger fact that the image's own
//                        Euler–Rodrigues frame stays rotation-minimizing too.
//   the DEGREE           8 control points become 15. Inversion doubles it.
//
// WHY THE SLIDERS ARE GENERATORS, not an inversion centre. The transformation is
// exp(Σ sᵢXᵢ) on the conformal model, exactly as the Lie-sphere lab does it, so all-zeros
// is the identity and each slider is an infinitesimal generator. The three exposed here are
// the SPECIAL CONFORMAL ones — "inversive bend" — because the Möbius group is rotations,
// translations, scaling and these, and only these BEND anything: the others are
// similarities. Their range is deliberately small; a little inversive bend goes a long way.
//
// HOW EDITING WORKS, AND WHY NO NEW SOLVER WAS NEEDED. The constraints are simple in the
// PREIMAGE — five RM-ERF conditions on sixteen unknowns, which dragInClass already solves —
// and hopeless in the image, where they would have to be expressed on fifteen weighted
// control points. So the Möbius map is a pure DISPLAY transformation and the solve stays
// where it is easy. Möbius maps are invertible, so the gesture still feels direct:
//
//     cursor in image space  →  μ⁻¹(cursor)  →  dragInClass on the source  →  push forward
//
// and exp(−G) inverts exp(G), so μ⁻¹ costs nothing.
//
// THE REAL 15-POINT POLYGON IS DRAWN, and getting it is the model paying for itself. Since
// a Möbius transformation is a CONSTANT matrix and Bernstein basis functions are scalars,
// M·Σ Cₖ Bₖ(t) = Σ (M Cₖ) Bₖ(t) — the matrix acts on each coefficient INDEPENDENTLY. So the
// image's rational Bézier data is fifteen matrix–vector products and fifteen divisions. No
// resultants, no fitting. Two independent routes to that curve agree to 1e-9 in the tests.
//
// THE HONEST GUARD. As the transformation strengthens, a weight approaches zero and the
// corresponding control point escapes to infinity — a genuine singularity, not a numerical
// wobble. "min |w|" is that distance, displayed, and watching the image swell as it falls is
// the most vivid demonstration of what inversion actually does.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/phMobius (14 tests), core/conformal (22), core/phSpatialSeptic (25).
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vsub } from '../../core/quaternion'
import {
  type SpatialPHSeptic,
  controlPoints,
  curveAt,
  dragInClass,
  erfAt,
  findClassMember,
  rmErfResidual,
} from '../../core/phSpatialSeptic'
import { asSpline, frameCombByArcLength } from '../../core/phSpatialSepticSpline'
import { normalizedDifferentialOf, transportedTwist } from '../../core/phMobius'
import {
  type Mat5,
  conformalLiftBezier,
  evaluateRationalBezier,
  infinityDisplacement,
  inversiveBendGenerator,
  matrixExp5,
  minAbsWeight,
  mobiusImageRationalBezier,
  pointMap,
  applyMatrix,
} from '../../core/conformal'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

/** A little inversive bend goes a long way — the Lie lab uses ±0.3 for the same reason. */
const BEND_RANGE = 0.22
const STATIONS = 30
const COMB = 0.3
const CURVE_SAMPLES = 140

const START: SpatialPHSeptic = {
  A: findClassMember() ?? [
    { u: 1, v: 0.3, p: 0.3, q: 0.3 },
    { u: 1, v: -0.3, p: 0.3, q: -0.3 },
    { u: 1, v: 0.3, p: -0.3, q: -0.3 },
    { u: 1, v: -0.3, p: -0.3, q: 0.3 },
  ],
  p0: { x: -0.9, y: -0.3, z: 0.1 },
}

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const apply3 = (m: number[][], v: Vec3): Vec3 => ({
  x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
  y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
  z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
})

/** Framed once, wide enough that a moderate bend stays inside it. */
const BOUNDS = (() => {
  const pts = [...controlPoints(START), ...frameCombByArcLength(asSpline(START), STATIONS, COMB).rail]
  const pad = 1.6
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

const AXES: { key: 'x' | 'y' | 'z'; label: string }[] = [
  { key: 'x', label: 'inversive bend X' },
  { key: 'y', label: 'inversive bend Y' },
  { key: 'z', label: 'inversive bend Z' },
]

export default function MobiusFigure() {
  const [source, setSource] = useState<SpatialPHSeptic>(START)
  const [bend, setBend] = useState<Vec3>({ x: 0, y: 0, z: 0 })
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)

  /** exp(Σ sᵢXᵢ), and its inverse exp(−ΣsᵢXᵢ) — which is what makes the drag invertible. */
  const { forward, inverse, matrix } = useMemo(() => {
    const m = matrixExp5(inversiveBendGenerator(bend))
    const mi = matrixExp5(inversiveBendGenerator({ x: -bend.x, y: -bend.y, z: -bend.z }))
    return { forward: pointMap(m), inverse: pointMap(mi), matrix: m as Mat5 }
  }, [bend])

  const sourceCps = useMemo(() => controlPoints(source), [source])

  /** The image's own rational Bézier: 15 matrix–vector products, nothing more. */
  const image = useMemo(
    () => mobiusImageRationalBezier(conformalLiftBezier(sourceCps), matrix),
    [sourceCps, matrix],
  )

  /** The curve drawn FROM the rational Bézier, so the polygon and the curve share a source. */
  const curvePts = useMemo(() => {
    const out: [number, number, number][] = []
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const p = evaluateRationalBezier(image, k / CURVE_SAMPLES)
      if (p) out.push(tri(p))
    }
    return out
  }, [image])

  /** The frame, carried through by the normalized differential (Theorem 1). */
  const frame = useMemo(() => {
    const bars: [number, number, number][][] = []
    const rail: [number, number, number][] = []
    const comb = frameCombByArcLength(asSpline(source), STATIONS, 1)
    for (const [foot, tip] of comb.bars) {
      const e2 = vsub(tip, foot) // unit, since the comb length was 1
      const at = forward(foot)
      const d = normalizedDifferentialOf(forward, foot)
      if (!at || !d) continue
      const carried = apply3(d, e2)
      const end = { x: at.x + carried.x * COMB, y: at.y + carried.y * COMB, z: at.z + carried.z * COMB }
      bars.push([tri(at), tri(end)])
      rail.push(tri(end))
    }
    return { bars, rail }
  }, [source, forward])

  /** Measured on the IMAGE's frame, not inferred from the source's. */
  const twist = useMemo(
    () =>
      transportedTwist(
        (t) => {
          const f = erfAt(source.A, t)
          return f ? { e2: f.e2, e3: f.e3 } : null
        },
        (t) => {
          const d = normalizedDifferentialOf(forward, curveAt(source, t))
          return d ? (v: Vec3) => apply3(d, v) : null
        },
        40,
      ),
    [source, forward],
  )

  const classDefect = useMemo(
    () => Math.max(...rmErfResidual(source.A).map(Math.abs)),
    [source],
  )
  const bendStrength = useMemo(() => infinityDisplacement((X) => applyMatrix(matrix, X)), [matrix])

  const reset = (): void => {
    setSource(START)
    setBend({ x: 0, y: 0, z: 0 })
    setDragIdx(null)
    setStalled(false)
  }

  /** Images of the SOURCE control points — the handles. Not the image's control polygon. */
  const handles = useMemo(
    () => sourceCps.map((p) => forward(p)).filter((p): p is Vec3 => p !== null),
    [sourceCps, forward],
  )

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        '‖s′‖ = ρ²σ/‖u‖² — rational speed',
        'exp(Σ sᵢXᵢ) on the conformal model',
        'the frame still does not turn',
      ]}
      readouts={[
        { label: 'twist ∫|ω₁|ds', value: twist.toExponential(1), tone: 'ok' as const },
        { label: 'in class', value: classDefect.toExponential(1), tone: 'ok' as const },
        { label: 'degree', value: `${image.points.length - 1} (${image.points.length} points)` },
        { label: 'min |w|', value: minAbsWeight(image).toFixed(3) },
        { label: 'bend', value: bendStrength.toFixed(3) },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          {AXES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1">
              <span className="text-slate-400">{label}</span>
              <input
                type="range"
                min={-BEND_RANGE}
                max={BEND_RANGE}
                step={BEND_RANGE / 60}
                value={bend[key]}
                onChange={(e) => setBend((b) => ({ ...b, [key]: Number(e.target.value) }))}
                className="w-24"
              />
            </label>
          ))}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Bend the curve with a Möbius transformation and it becomes RATIONAL — while the frame
          still refuses to turn.</b>{' '}
          Because <i>σ = |A|²</i> is a polynomial, the image’s speed <i>ρ²σ/‖u‖²</i> is{' '}
          <b>rational</b>: a polynomial PH curve bent by Möbius is a rational PH curve. And Möbius
          transformations <i>commute</i> with computing the rotation-minimizing frame, so the carried
          frame is still rotation-minimizing — the twist readout is measured on the{' '}
          <i>image</i>, not inherited. What does change is the <b>degree</b>: eight control points
          become <b>fifteen</b>, and the faint polygon is the real one, obtained by pushing fifteen
          Bernstein coefficients through a constant matrix. The eight blue handles are the{' '}
          <i>source</i>’s points; dragging one pulls your cursor back through <i>μ⁻¹</i> and solves
          where the constraints are easy.{' '}
          <span className="text-slate-400">
            Watch “min |w|” fall as you bend — at zero a control point escapes to infinity. Drag the
            background to rotate.
          </span>
        </>
      }
    >
      {/* the image's REAL control polygon, 15 points — read-only */}
      <Curve3D points={image.points.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      {image.points.map((p, i) => (
        <Point3D key={`w${i}`} position={tri(p)} color={FIG.color.derived} radius={0.02} />
      ))}

      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={bar} color={FIG.color.derived} width={1.1} />
      ))}
      <Curve3D points={frame.rail} color={FIG.color.derived} width={1.4} dashed />

      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {handles.map((p, i) => (
        <DragPoint3D
          key={i}
          position={tri(p)}
          color={dragIdx === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.05}
          onDragStart={() => { setDragIdx(i); setStalled(false) }}
          onDragEnd={() => setDragIdx(null)}
          onDrag={([x, y, z]) => {
            // Pull the cursor back through μ⁻¹ and solve in the preimage.
            const target = inverse({ x, y, z })
            if (!target) { setStalled(true); return }
            const step = dragInClass(source, i, target)
            if (step.converged) {
              setSource(step.state)
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
