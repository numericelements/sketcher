// ============================================================================
// THE ANSWER SET, SEEN ON THE SPHERE — degree 6, one pole, full C¹ Hermite held.
//
// WHAT IS DIFFERENT FROM THE DEGREE-4 PAIR, and it is the whole reason this pair exists. There we
// could hold six numbers — c′(0) and c(1) — and one end of the indicatrix arc was free. Here the
// classical Hermite data is held: BOTH end tangents and the displacement, nine numbers. Degree 6 with
// one pole is the first rational family where that is even posable (degree 4's map to those nine has
// rank 7 of 9), and what is left over is 12 − 9 − 1 = 2.
//
// SO THE FIGURE DRAWS THE ANSWER SET, not one answer. The PALE FAN is ten members spread around the ψ
// circle — ten different rational PH sextics through the SAME C¹ Hermite data — and every one of them
// leaves the sphere at the same two points. That convergence is the held data made visible, and it is
// why there are no endpoint dots: the fan says "pinned" along its whole length and at both ends at
// once, which two marks cannot.
//
// (§9.4 rules out endpoint dots on the sphere, and the reason given there was that the heavy arc
// already says which piece is drawn. The rule survives here for a second reason: the fan says it
// better. A dot would assert the pinning; the fan shows it.)
//
// THE TWO FIBRE SLIDERS ARE NOT THE SAME KIND OF HANDLE, and the caption says so rather than hiding it.
// ψ is a CIRCLE — 𝒜(1) turning on its Hopf fibre over c′(1), returning to the same curve at 360° to
// 2.4e-16. The leftover s closes too (2180 steps, gap 1.7e-9), so the fibre is a circle bundle over a
// circle — but 2180 steps is 109 s to walk, so the figure drives a bounded stretch of that loop
// instead of the whole turn.
//
// The pole still cusps the indicatrix, exactly as on the degree-4 slide — that is a theorem about
// simple poles (Kalkan–Scharler–Schröcker–Šír, Rem. 4.7), not a feature of degree 4.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// Everything it displays is pinned in core/__tests__/degree6TwoCircles.test.ts and
// degree6HandlesTrack.test.ts.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { hermiteOf, toMember } from '../../core/rationalPHMultiPoleSpatial'
import {
  indicatrixArc,
  indicatrixAt,
  indicatrixLength,
  indicatrixLoop,
  indicatrixNear,
  sphereResidual,
} from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import HermiteControls from './HermiteControls'
import { useHermiteChart } from './hermiteModel'

const BOUNDS = {
  min: [-1.3, -1.3, -1.3] as [number, number, number],
  max: [1.3, 1.3, 1.3] as [number, number, number],
}
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const GREAT_CIRCLES: [number, number, number][][] = [0, 1, 2].map((axis) =>
  Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96
    const c = Math.cos(a)
    const s = Math.sin(a)
    return (axis === 0 ? [0, c, s] : axis === 1 ? [c, 0, s] : [c, s, 0]) as [number, number, number]
  }),
)

export default function HermiteSphereFigure() {
  const { live, fan, theta, psi, target } = useHermiteChart()
  const pole = live.roots[0]

  const member = useMemo(() => toMember(live), [live])
  const whole = useMemo(() => indicatrixLoop(member, 900).map(tri), [member])
  const used = useMemo(() => indicatrixArc(member, 0, 1, 240).map(tri), [member])
  const corner = useMemo(
    () => indicatrixNear(member, pole, Math.min(0.45, 0.1 * indicatrixLength(member))).map(tri),
    [member, pole],
  )
  const cusp = useMemo(() => tri(indicatrixAt(member, pole)), [member, pole])

  /** The answer set: the drawn piece of ten members around the ψ circle. */
  const fanArcs = useMemo(
    () => fan.map((q) => indicatrixArc(toMember(q), 0, 1, 120).map(tri)),
    [fan],
  )

  /** How far the live member's Hermite data has drifted from what the pair holds. Zero, or a bug. */
  const drift = useMemo(() => {
    const h = hermiteOf(member)
    return Math.hypot(...h.map((v, i) => v - target[i]))
  }, [member, target])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={['ᴛ = N/σ', 'ψ turns 𝒜(1) on its Hopf circle', 'λ = tan θ']}
      readouts={[
        { label: 'fibre ψ', value: `${psi.toFixed(0)}°` },
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'λ',
          value: Math.abs(Math.tan((theta * Math.PI) / 180)) > 999
            ? '≫'
            : Math.tan((theta * Math.PI) / 180).toFixed(1),
        },
        { label: 'Hermite drift', value: drift.toExponential(1), tone: 'ok' as const },
        { label: '‖T‖ − 1', value: sphereResidual(member).toExponential(1), tone: 'ok' as const },
      ]}
      controls={<HermiteControls modes={false} />}
      caption={
        <>
          <b>Every pale arc is a different curve through the same Hermite data.</b> Both end tangents
          are held and so is the displacement — nine numbers — and the fan is ten members of what is
          left over. Look at where the arcs <i>start</i> and <i>end</i>: they all leave the sphere at
          the same two points. That convergence <i>is</i> the held data. What varies in between is the
          two-dimensional answer set.{' '}
          <span className="text-slate-400">
            <b>ψ is a circle.</b> It turns <i>𝒜(1)</i> on its Hopf fibre over <i>c′(1)</i>, so at 360°
            it is back to the same curve — measured to 2.4e-16, with the nine numbers held to 5.6e-13
            the whole way round. <b>s is a road along the other one.</b> That loop is real too, but it
            is 2180 steps long, so the slider drives a bounded stretch of it rather than the full turn.{' '}
            <b>The pole still cusps the indicatrix</b> — follow the{' '}
            <b style={{ color: FIG.color.pole }}>violet strand</b> in to the corner and back out. That
            is a theorem about simple poles, not a feature of degree 4. Drag the background to rotate.
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

      {/* the answer set: ten members through the same data */}
      {fanArcs.map((a, i) => (
        <Curve3D key={`fan${i}`} points={a} color={FIG.color.curveMuted} width={1.5} />
      ))}

      {/* the live member: its whole indicatrix pale, the drawn piece heavy */}
      <Curve3D points={whole} color={FIG.color.controlPolygon} width={1} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      {/* the corner: one strand in and out through the cusp */}
      <Curve3D points={corner} color={FIG.color.pole} width={3} />
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />
    </Figure3D>
  )
}
