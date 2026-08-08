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
//   the DEGREE           8 control points become 15.
//
// TWO CURVES ARE DRAWN, AND THAT IS THE POINT — a slide about a map should show both sides.
// The thin curve with the blue handles is the polynomial source; the bold one is its image.
// At all sliders zero they coincide exactly (the identity, seen), and the image peels away
// as you bend.
//
// WHY THE SOURCE'S CONTROL POINTS ARE NOT DRAWN IN IMAGE SPACE — the correction that shaped
// this figure. A Möbius transformation does NOT send control points to control points: μ(Pᵢ)
// is not the i-th control point of μ∘r, and nothing like it, apart from the two endpoints.
// An earlier version drew the μ(Pᵢ) as a polygon around the bent curve, which invites the
// reading "these eight points control this curve" — they do not. Affine maps are covariant
// on control points; Möbius maps are covariant on the CONFORMAL LIFT, which is exactly why
// the honest polygon has 15 points and not 8. So the blue handles stay on the source, where
// they mean something, and the image carries only its own polygon.
//
// It also makes the editing simpler than it was: dragging a source point needs no pull-back
// through μ⁻¹, and the solve happens where the constraints live — five RM-ERF conditions on
// sixteen unknowns, which dragInClass already handles. In the image those conditions would
// have to be expressed on fifteen weighted control points; the Möbius map stays a pure
// display transformation and no new solver was needed.
//
// THE 15-POINT POLYGON IS THE MODEL PAYING FOR ITSELF. Since a Möbius transformation is a
// CONSTANT matrix and Bernstein basis functions are scalars, M·Σ Cₖ Bₖ(t) = Σ (M Cₖ) Bₖ(t) —
// the matrix acts on each coefficient INDEPENDENTLY. Fifteen matrix–vector products and
// fifteen divisions. No resultants, no fitting. And it is 15 even at zero bend: the LIFT
// doubles the degree, the bend adds none.
//
// WHY THE SLIDERS ARE GENERATORS, not an inversion centre. The transformation is
// exp(Σ sᵢXᵢ) on the conformal model, exactly as the Lie-sphere lab does it, so all-zeros
// is the identity and each slider is an infinitesimal generator. The three exposed are the
// SPECIAL CONFORMAL ones — "inversive bend" — because the Möbius group is rotations,
// translations, scaling and these, and only these BEND anything: the others are similarities.
//
// THE RANGE IS ±2, FROM MEASUREMENT. The generator moves the map's POLE in from infinity —
// at zero the pole IS at infinity, which is why the identity is affine. Measured pole
// distance: 8.2 at slider 0.22, 1.15 at 1, 0.30 at 2. The old range of ±0.22 therefore bent
// the curve by 6% and looked broken. Past 3 the pole has swept by and the curve is crushed
// instead of bent, so 2 is where the interesting deformation lives.
//
// AND THE READOUT IS THE DENOMINATOR, not min |w| — a correction, measured. A weight near
// zero puts one CONTROL POINT at infinity, a fact about the polygon; the curve itself blows
// up only where W(t) = 0, which happens exactly when the pole lies ON it. The two are wildly
// different: aim the pole at the curve and W reads 1e-19 while min |w| still reads 2.8e-3,
// sixteen orders away from noticing. And W = λ‖r(t) − pole‖² exactly, so "min W" IS the
// pole's distance to the curve, squared and scaled.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/phMobius (14 tests), core/conformal (25), core/phSpatialSeptic (25).
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
  minDenominator,
  mobiusImageRationalBezier,
  pointMap,
  applyMatrix,
} from '../../core/conformal'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

/** ±2, from the pole-distance measurement in the header — not a guess this time. */
const BEND_RANGE = 2
const STATIONS = 30
const COMB = 0.3
const CURVE_SAMPLES = 140
const POINT_RADIUS = 0.05

const START: SpatialPHSeptic = {
  A: findClassMember() ?? [
    { u: 1, v: 0.3, p: 0.3, q: 0.3 },
    { u: 1, v: -0.3, p: 0.3, q: -0.3 },
    { u: 1, v: 0.3, p: -0.3, q: -0.3 },
    { u: 1, v: -0.3, p: -0.3, q: 0.3 },
  ],
  p0: { x: -0.9, y: -0.3, z: 0.1 },
}
const LAST = 7

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const apply3 = (m: number[][], v: Vec3): Vec3 => ({
  x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
  y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
  z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
})

/**
 * Framed once from the SOURCE, so the view never lurches. A strong bend grows the image
 * past the frame — measured max radius 2.9 at slider 2 against a source radius of 1 — and
 * that is accepted: leaving the screen is not a failure, it is what a big Möbius map does.
 */
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

  /** exp(Σ sᵢXᵢ) — a constant 5×5 matrix, which is the whole reason the image is cheap. */
  const { forward, matrix } = useMemo(() => {
    const m = matrixExp5(inversiveBendGenerator(bend))
    return { forward: pointMap(m), matrix: m as Mat5 }
  }, [bend])

  const sourceCps = useMemo(() => controlPoints(source), [source])

  /** The source curve — drawn, because it is the thing you are editing. */
  const sourcePts = useMemo(
    () => Array.from({ length: CURVE_SAMPLES + 1 }, (_, k) => tri(curveAt(source, k / CURVE_SAMPLES))),
    [source],
  )

  /** The image's own rational Bézier: 15 matrix–vector products, nothing more. */
  const image = useMemo(
    () => mobiusImageRationalBezier(conformalLiftBezier(sourceCps), matrix),
    [sourceCps, matrix],
  )

  /** The image curve drawn FROM that data, so the polygon and the curve share a source. */
  const imagePts = useMemo(() => {
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
        { label: 'min W(t)', value: minDenominator(image).toFixed(3), tone: 'ok' as const },
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
                step={BEND_RANGE / 80}
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
          <i>image</i>, not inherited. The thin curve with the blue handles is the polynomial{' '}
          <b>source</b>, which is what you edit; the bold one is its image, and at zero they coincide.
          What changes is the <b>degree</b>: the image’s own polygon has <b>fifteen</b> points, obtained
          by pushing fifteen Bernstein coefficients through one constant matrix — and it has fifteen
          even at zero bend, because the <i>lift</i> doubles the degree and the bend adds none.{' '}
          <span className="text-slate-400">
            A Möbius map does not send control points to control points, so the source’s eight are
            drawn only on the source. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* THE IMAGE — bold, with its own real 15-point polygon, read-only */}
      <Curve3D points={image.points.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      {image.points.map((p, i) => (
        <Point3D key={`w${i}`} position={tri(p)} color={FIG.color.derived} radius={0.02} />
      ))}

      {frame.bars.map((bar, i) => (
        <Curve3D key={`bar${i}`} points={bar} color={FIG.color.derived} width={1.1} />
      ))}
      <Curve3D points={frame.rail} color={FIG.color.derived} width={1.4} dashed />

      <Curve3D points={imagePts} color={FIG.color.curve} width={3.5} />

      {/* THE SOURCE — thin, and the only thing with handles */}
      <Curve3D points={sourcePts} color={FIG.color.curveMuted} width={1.8} />
      <Curve3D points={sourceCps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />

      {sourceCps.map((p, i) => (
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
          radius={POINT_RADIUS}
          onDragStart={() => { setDragIdx(i); setStalled(false) }}
          onDragEnd={() => setDragIdx(null)}
          onDrag={([x, y, z]) => {
            // Straight into the source's own space — no pull-back needed, because the
            // handles live where the solve does. Ends held, as on the previous slide.
            const step = dragInClass(source, i, { x, y, z }, { pinEnds: true })
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
