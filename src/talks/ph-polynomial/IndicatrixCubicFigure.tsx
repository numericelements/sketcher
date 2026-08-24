// ============================================================================
// THE CUBIC ON THE SPHERE — where the cusp turns out to be, and it is not where w says.
//
// Third sphere in the deck, and the one that corrects the pattern the first two set up. Slides 17 and 19 have
// their cusps at FINITE real poles, one each per pole of w. This curve's w = t² + 1 has only COMPLEX roots, so
// the natural prediction is a smooth track — and on every finite parameter it is smooth (min |dT/dθ| = 0.223
// over t ∈ [−40, 40]). But the curve has a third pole projectively, at t = ∞, and THAT one cusps: |dT/dθ|
// falls like 1/t (8.94e-2, 8.94e-3, 8.94e-4, 8.94e-5 at t = 1e2 … 1e5).
//
// SO THE CUSP SITS EXACTLY WHERE THE LOOP CLOSES. indicatrixLoop joins the two tails through the point at
// infinity, and for this curve that join is the corner. That is a genuinely better picture than a smooth
// track would have been: the closure point stops being a drawing convenience and becomes the feature.
//
// THE MEASURE MATTERS AND THE FIGURE SAYS SO. |T′| in the t chart dips toward zero in the tails for EVERY
// rational indicatrix — t is simply a bad coordinate at infinity — so it cannot distinguish this cusp from
// nothing at all. The invariant speed |dT/dθ| with t = tan θ is finite through infinity, and its readout is
// what the slide rests on. Measured limits: one pole → 0.790, two poles → 3.78, this cubic → 0.
//
// Mathematics in core/rationalPHCubic and core/tangentIndicatrix; this file draws.
// ============================================================================
import { useMemo, useState } from 'react'
import {
  N,
  indicatrixSpeedInvariant,
  sigma,
} from '../../core/rationalPHCubic'
import { indicatrixArc, indicatrixAt, indicatrixAtInfinity, indicatrixLoop, sphereResidual } from '../../core/tangentIndicatrix'
import type { Vec3 } from '../../core/quaternion'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const MEMBER = { N, sigma }

const BOUNDS = {
  min: [-1.25, -1.25, -1.25] as [number, number, number],
  max: [1.25, 1.25, 1.25] as [number, number, number],
}
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** The three coordinate great circles — depth cue only, no mathematical content. */
const GREAT_CIRCLES: [number, number, number][][] = [0, 1, 2].map((axis) =>
  Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96
    const c = Math.cos(a)
    const s = Math.sin(a)
    return (axis === 0 ? [0, c, s] : axis === 1 ? [c, 0, s] : [c, s, 0]) as [number, number, number]
  }),
)

export default function IndicatrixCubicFigure() {
  const [at, setAt] = useState(0.4)

  const whole = useMemo(() => indicatrixLoop(MEMBER, 720).map(tri), [])
  const used = useMemo(() => indicatrixArc(MEMBER, 0, 1).map(tri), [])
  const cusp = useMemo(() => tri(indicatrixAtInfinity(MEMBER)), [])
  const marker = tri(indicatrixAt(MEMBER, at))

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴛ = N/σ', 'w = t² + 1 — roots ±i, complex', 'the cusp is at t = ∞']}
      readouts={[
        // The claim of the slide, as three numbers.
        { label: '|dT/dθ| at t = 10³', value: indicatrixSpeedInvariant(1e3).toExponential(1), tone: 'ok' as const },
        { label: 'at t = 10⁵', value: indicatrixSpeedInvariant(1e5).toExponential(1), tone: 'ok' as const },
        { label: 'min over |t| ≤ 40', value: '0.223 (no finite cusp)' },
        { label: '‖T‖ − 1', value: sphereResidual(MEMBER).toExponential(1), tone: 'ok' as const },
        { label: 't', value: at.toFixed(3) },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">t along the curve</span>
            <input
              type="range" min={0} max={1} step={0.002} value={at}
              onChange={(e) => setAt(Number(e.target.value))} className="w-36"
            />
          </label>
          <span className="text-slate-400">the violet cusp is the point at t = ∞, where the loop closes</span>
        </span>
      }
      caption={
        <>
          <b>The same cubic, seen through its unit tangent — and the cusp is not where w says it is.</b> Its
          denominator t² + 1 has only <b>complex</b> roots, so the prediction from the previous two spheres is
          a smooth track, and at every <i>finite</i> parameter it is: the invariant speed never drops below
          0.223 across t ∈ [−40, 40]. <b>The cusp is at t = ∞</b>, the third pole — the one w does not show,
          which exists because the numerator has degree 3 while w has degree 2. So{' '}
          <b>the corner sits exactly where the loop closes up</b>, and the point at infinity stops being a
          drawing convenience and becomes the feature.{' '}
          <b>Read the two speed readouts:</b> 8.9·10⁻³ at t = 10³ and 8.9·10⁻⁵ at t = 10⁵ — a decade of t per
          decade of speed, so it is falling like 1/t and genuinely reaching zero.{' '}
          <span className="text-slate-400">
            <b>Which measure you use decides whether you see this at all.</b> |T′| against t dips toward zero
            in the tails for <i>every</i> rational indicatrix, because t is a bad coordinate at infinity — it
            cannot tell this cusp from nothing. The honest instrument is |dT/dθ| with t = tan θ, finite
            through infinity, and that is what the readouts show. Checked against the other two: one pole
            → 0.790, two poles → 3.78, both finite, so their counts of one and two cusps stand and only this
            curve cusps at infinity. <b>So the rule survives, once you count poles projectively:</b> one cusp
            per real pole, none for a complex pair, and t = ∞ is a real pole like any other. Drag the
            background to rotate.
          </span>
        </>
      }
    >
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.11} depthWrite={false} roughness={0.9} />
      </mesh>

      {GREAT_CIRCLES.map((c, i) => (
        <Curve3D key={`gc${i}`} points={c} color={FIG.color.controlPolygon} width={1} />
      ))}

      <Curve3D points={whole} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      <Curve3D points={[[0, 0, 0], marker]} color={FIG.color.dataPoint} width={1.5} />
      <Point3D position={marker} color={FIG.color.dataPoint} radius={0.045} />

      {/* the cusp: the pole at infinity, which is also the loop's closure point */}
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />
    </Figure3D>
  )
}
