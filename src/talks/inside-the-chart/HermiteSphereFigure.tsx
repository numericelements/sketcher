// ============================================================================
// THE ANSWER SET, SEEN ON THE SPHERE — degree 6, one pole, full C¹ Hermite held.
//
// WHAT IS DIFFERENT FROM THE DEGREE-4 PAIR, and it is the whole reason this pair exists. There we
// could hold six numbers — c′(0) and c(1) — and one end of the indicatrix arc was free. Here the
// classical Hermite data is held: BOTH end tangents and the displacement, nine numbers. Degree 6 with
// one pole is the first rational family where that is even posable (degree 4's map to those nine has
// rank 7 of 9), and what is left over is 12 − 9 − 1 = 2.
//
// ONE INDICATRIX, NOT A FAN. A first version drew ten members of the fibre at once — the answer set,
// all through the same data, all leaving the sphere at the same two points. It made the pinning
// visible in a still frame, and it was removed anyway: with ten arcs on the sphere there is nowhere to
// rest the eye, and the thing this slide is actually for is watching ONE indicatrix move while its
// ends stay put. The fan showed the answer set; turning ψ IS the answer set, and it does not cost the
// picture its focus.
//
// (§9.4's "no endpoint dots on the sphere" still holds, and for its original reason. The ends staying
// put under a moving slider says "held" better than two marks would, and it says it while you watch.)
//
// BOTH FIBRE SLIDERS ARE CIRCLES AND BOTH ARE CLOSED FORM — one chart drives them (`hermiteChart`).
// Underneath they are ψ (the phase of 𝒜(1) against 𝒜(0)) and s (the middle circle, the rational
// completed square); the sliders drive the MIRRORED PAIR A, B with ψ = A + B and s = B, because those
// are the two loops the reversal exchanges. Neither makes a minimum-norm choice, and both return
// because e^{2πi} = 1 rather than because a solver came home.
// → rationalHermiteCircles.ts, mirroredSliderPair.test.ts, slide 7.
//
// The pole still cusps the indicatrix, exactly as on the degree-4 slide — that is a theorem about
// simple poles (Kalkan–Scharler–Schröcker–Šír, Rem. 4.7), not a feature of degree 4.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// Everything it displays is pinned in core/__tests__/degree6TwoCircles.test.ts,
// rationalMiddleCircle.test.ts, hermiteTorusCoordinates.test.ts and degree6HandlesTrack.test.ts.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { hermiteOf, toMember } from '../../core/rationalPHMultiPoleSpatial'
import { symmetryDefect } from '../../core/rationalSymmetries'
import {
  indicatrixArcSmooth,
  indicatrixAt,
  indicatrixLength,
  indicatrixLoopSmooth,
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

/**
 * Segment length on a unit sphere. Both curves are sampled to hold every chord under this, rather than
 * to a fixed point count: |T′| varies by orders of magnitude along the indicatrix, so a uniform count
 * renders the fast stretches as a polygon. At the closest pole the old uniform loop drew one chord of
 * 0.166 — a sixth of the radius, as a straight line. → indicatrixArcSmooth.test.ts
 */
const CHORD = 0.003

export default function HermiteSphereFigure() {
  const { live, theta, mirrorA, mirrorB, target } = useHermiteChart()
  const pole = live.roots[0]

  const member = useMemo(() => toMember(live), [live])
  const whole = useMemo(() => indicatrixLoopSmooth(member, CHORD).map(tri), [member])
  const used = useMemo(() => indicatrixArcSmooth(member, 0, 1, CHORD).map(tri), [member])
  const corner = useMemo(
    () => indicatrixNear(member, pole, Math.min(0.45, 0.1 * indicatrixLength(member))).map(tri),
    [member, pole],
  )
  const cusp = useMemo(() => tri(indicatrixAt(member, pole)), [member, pole])

  /** How far the live member's Hermite data has drifted from what the pair holds. Zero, or a bug. */
  const drift = useMemo(() => {
    const h = hermiteOf(member)
    return Math.hypot(...h.map((v, i) => v - target[i]))
  }, [member, target])

  /**
   * How far the held data is from admitting a mirror. The A/B sliders are only an EXCHANGED pair where
   * this is zero — without it on screen, the labels would be a promise with no way to check it.
   */
  const symDefect = useMemo(() => symmetryDefect(target), [target])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={['ᴛ = N/σ', 'ψ = A + B,  s = B', 'λ = tan θ']}
      readouts={[
        { label: 'fibre A, B', value: `${mirrorA.toFixed(0)}°, ${mirrorB.toFixed(0)}°` },
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'λ',
          value: Math.abs(Math.tan((theta * Math.PI) / 180)) > 999
            ? '≫'
            : Math.tan((theta * Math.PI) / 180).toFixed(1),
        },
        { label: 'Hermite drift', value: drift.toExponential(1), tone: 'ok' as const },
        {
          label: 'symmetry defect',
          value: symDefect.toExponential(1),
          tone: symDefect < 1e-6 ? ('ok' as const) : ('warn' as const),
        },
        { label: '‖T‖ − 1', value: sphereResidual(member).toExponential(1), tone: 'ok' as const },
      ]}
      controls={<HermiteControls modes={false} />}
      caption={
        <>
          <b>Turn ψ and watch the two ends of the dark arc stay exactly where they are.</b> Both end
          tangents are held, and so is the displacement — nine numbers — so every position of the
          slider is a <i>different</i> rational PH sextic through the <i>same</i> Hermite data. The
          ends not moving is that data; everything between them is the two-dimensional set of answers
          to it.{' '}
          <span className="text-slate-400">
            <b>Both fibre sliders are circles, and both are formulas</b> — neither solves anything, so
            both return at 360° because <i>e</i><sup>2πi</sup> = 1. They are chosen so that{' '}
            <b>the mirror exchanges them</b>: turn <b>A</b>, reflect the picture, and it looks like you
            turned <b>B</b>. That is exact when the data is mirror-symmetric and the pole is far out —
            watch <i>symmetry defect</i> and <i>pole r</i> together. <b>Push the twist dial to either
            extreme</b> — not to zero, which is where the pole is most genuine — and the pole{' '}
            <i>cancels</i>: the family becomes the polynomial PH quintic and these two circles become
            the ones the sibling deck sweeps.{' '}
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

      {/*
        The live member: whole indicatrix pale, drawn piece heavy — the same two weights and the same
        two colours as the degree-4 sphere slide, deliberately.

        `curveMuted` and NOT `controlPolygon`. While the fan existed the pale loop wore the great
        circles' grey so the fan could own curveMuted, and that left the loop the SAME colour as the
        scaffolding it is drawn on top of — it vanished. The palette already separates these: the
        great circles are furniture (controlPolygon), the pale loop is the curve where the drawn piece
        is not (curveMuted). With the fan gone there is nothing to yield to.
      */}
      <Curve3D points={whole} color={FIG.color.curveMuted} width={1} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      {/* the corner: one strand in and out through the cusp */}
      <Curve3D points={corner} color={FIG.color.pole} width={3} />
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />
    </Figure3D>
  )
}
