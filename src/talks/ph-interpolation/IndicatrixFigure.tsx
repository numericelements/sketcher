// ============================================================================
// THE INDICATRIX ON THE SPHERE — the pole, which has no position in space, made visible.
//
// This is the same one-pole member as the previous slide, seen through its unit tangent instead of its
// position. T = c′/‖c′‖ = N/σ: the w² cancels, so the picture is a RATIONAL curve on S², and that
// cancellation is the PH property. All the mathematics is in core/tangentIndicatrix; this file draws.
//
// WHAT THE FIGURE IS FOR, in one line: the pole is a parameter, not a place. In the curve picture there
// is nothing to point at — r lives off at infinity. Here it is a CUSP, and you can watch it move.
//
// THREE CHOICES WORTH THE WORDS.
//
//   1. THE WHOLE INDICATRIX IS DRAWN, not the [0,1] part. T is defined over the entire projective line
//      and closes up through its point at infinity (measured exactly: the ends coincide to 0.0e+0), so
//      drawing only [0,1] would hide the closure AND hide the cusp — because r is required to sit
//      OUTSIDE [0,1], the cusp is never on the arc the curve actually uses. The bold arc is [0,1]; the
//      pale remainder is the rest of the line. Both are the same curve.
//
//   2. THE POLE DIAL IS THE POINT OF THE FIGURE, not an extra. Walking r toward [0,1] walks the violet
//      cusp toward the bold arc, and the `infinity to curve` readout is the same fact as a number. The
//      family's honest limit becomes something you SEE approaching rather than a solver complaint.
//
//   3. THE SPHERE DOES NOT WRITE DEPTH. A translucent surface that occluded the far half would hide most
//      of a curve that is inherently all over the sphere. Three great circles give the depth cue instead,
//      and orbiting supplies the rest.
//
// The two readouts are the measurement, not a decoration: |T′(r)| reads ~1e-14 — the indicatrix stopping
// dead — and ‖T‖−1 reads ~1e-14, the sphere holding without anything being normalised.
//
// AND THE LOOP SLIDER IS HERE FOR A MEASURED REASON, not for parity with slide 16. The gauge 𝒜 ↦ 𝒜e^{iθ}
// leaves the hodograph alone, so it was worth checking whether the swept fiber is that gauge — in which
// case every member would share ONE indicatrix and this slider would do nothing. It is not: the
// indicatrix moves by up to 1.94 on a unit sphere across the loop while the held data moves 7.9e-14
// (indicatrixDegree.test.ts). So the fiber is a FAMILY of tangent tracks, and the pale ones are it.
//
// TWO TIERS, for the same reason slide 16 has them: a loop walk is ~120 ms (measured, and the `steps`
// option does not reduce it — the walk runs until it closes), so it is rebuilt when a dial gesture ENDS.
// The dials themselves re-solve in ~1 ms through withDial and stay live under the finger.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type OnePoleParams,
  dataOf,
  fiberLoop,
  phDefect,
  poleMargin,
  toMember,
  withDial,
} from '../../core/rationalPHOnePoleSpatial'
import {
  indicatrixArc,
  indicatrixAt,
  indicatrixLoop,
  indicatrixSpeedAt,
  sphereResidual,
} from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

/** The same member as the previous slide, so the two figures are two views of one curve. */
const SEED: OnePoleParams = {
  b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
  b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
  lambda: 0.6,
  pole: 1.7,
}

const BOUNDS = { min: [-1.25, -1.25, -1.25] as [number, number, number], max: [1.25, 1.25, 1.25] as [number, number, number] }
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

/** The fiber, thinned for drawing: every few members is enough to read it as a family. */
function familyOf(prm: OnePoleParams): { members: OnePoleParams[]; ghosts: [number, number, number][][] } {
  const members = fiberLoop(prm, { steps: 96, stride: 0.05 })
  const ghosts: [number, number, number][][] = []
  for (let i = 0; i < members.length; i += 8) {
    ghosts.push(indicatrixLoop(toMember(members[i]), 120).map(tri))
  }
  return { members, ghosts }
}

export default function IndicatrixFigure() {
  /** The member on screen. Dials move it live; the loop slider picks a different one outright. */
  const [live, setLive] = useState<OnePoleParams>(SEED)
  const [at, setAt] = useState(0.35)
  const [phase, setPhase] = useState(0)
  /** Rebuilt on gesture end, not per tick — see the header on the two tiers. */
  const [family, setFamily] = useState(() => familyOf(SEED))

  const { lambda, pole } = live
  const member = useMemo(() => toMember(live), [live])

  const whole = useMemo(() => indicatrixLoop(member).map(tri), [member])
  const used = useMemo(() => indicatrixArc(member, 0, 1).map(tri), [member])
  const cusp = useMemo(() => tri(indicatrixAt(member, pole)), [member, pole])
  const marker = useMemo(() => tri(indicatrixAt(member, at)), [member, at])

  const cuspSpeed = indicatrixSpeedAt(member, pole)
  const onSphere = sphereResidual(member)
  const margin = poleMargin(live)

  /** Sweeping is a SELECTION: it names a member of the walked family, so it writes `live` directly. */
  const sweep = useCallback(
    (v: number) => {
      setPhase(v)
      const list = family.members
      setLive(list[Math.min(list.length - 1, Math.round(v * (list.length - 1)))])
    },
    [family],
  )

  /** A dial re-solves the SAME held data — cheap, so it stays live under the finger. */
  const dial = useCallback(
    (d: { lambda?: number; pole?: number }) => {
      const next = withDial(live, dataOf(toMember(live)), d)
      if (next) setLive(next)
    },
    [live],
  )

  /** The expensive half, deferred to the end of the gesture. */
  const settle = useCallback(() => setFamily(familyOf(live)), [live])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴛ = ᴄ′/‖ᴄ′‖ = 𝒜 i Ā / |𝒜|²', 'the w² cancels', 'ᴛ′(r) = 0']}
      readouts={[
        // The two numbers that ARE the figure's claims.
        { label: '|T′(r)| at the pole', value: cuspSpeed.toExponential(1), tone: 'ok' as const },
        { label: '‖T‖ − 1', value: onSphere.toExponential(1), tone: 'ok' as const },
        { label: 'PH defect', value: phDefect(member).toExponential(1), tone: 'ok' as const },
        { label: 'twist λ', value: lambda.toFixed(3) },
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'infinity to curve',
          value: margin.toFixed(3),
          tone: margin < 0.08 ? ('warn' as const) : ('ok' as const),
        },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          {/* Same control as slide 16, and it does the same thing: it changes WHICH CURVE you are
              looking at. Distinct from `t` below, which moves along a fixed one. */}
          <label className="flex items-center gap-1">
            <span className="text-slate-400">around the loop</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.004}
              value={phase}
              onChange={(e) => sweep(Number(e.target.value))}
              className="w-32"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">twist</span>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.01}
              value={lambda}
              onChange={(e) => dial({ lambda: Number(e.target.value) })}
              onPointerUp={settle}
              onKeyUp={settle}
              className="w-32"
            />
          </label>
          <label className="flex items-center gap-1">
            {/* Stops short of [0,1] on both sides: inside it the curve would pass through the piece
                being drawn, and the family genuinely has no member there. */}
            <span className="text-slate-400">pole</span>
            <input
              type="range"
              min={-2.6}
              max={-1.06}
              step={0.005}
              value={pole < 0 ? pole : -2.6}
              onChange={(e) => dial({ pole: Number(e.target.value) })}
              onPointerUp={settle}
              onKeyUp={settle}
              className="w-24"
              style={{ opacity: pole < 0 ? 1 : 0.35 }}
            />
            <input
              type="range"
              min={1.06}
              max={2.6}
              step={0.005}
              value={pole > 0 ? pole : 2.6}
              onChange={(e) => dial({ pole: Number(e.target.value) })}
              onPointerUp={settle}
              onKeyUp={settle}
              className="w-24"
              style={{ opacity: pole > 0 ? 1 : 0.35 }}
            />
          </label>
          {/* NOT a member selector: this one walks along the curve you already have. */}
          <label className="flex items-center gap-1">
            <span className="text-slate-400">t along the curve</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.002}
              value={at}
              onChange={(e) => setAt(Number(e.target.value))}
              className="w-28"
            />
          </label>
        </span>
      }
      caption={
        <>
          <b>The pole has no position in space — here it has one.</b> This is the same curve as the
          previous slide, drawn through its <b>unit tangent</b> instead of its position: every direction
          the curve ever points is a point on this sphere, and the track it traces is the{' '}
          <b>tangent indicatrix</b>. For a PH curve the <b>w² cancels</b> —{' '}
          <b>
            T = <i>c</i>′/‖<i>c</i>′‖ = 𝒜 i 𝒜̄ / |𝒜|²
          </b>{' '}
          — so T is a <b>rational curve on the sphere</b>, and that cancellation <i>is</i> the PH
          property. The bold arc is <b>t ∈ [0,1]</b>, the part the drawn curve uses; the pale remainder is
          the rest of the line, closing up through the direction at <b>infinity</b>.{' '}
          <b>The violet point is the pole</b>, and the indicatrix <b>stops dead</b> there — read{' '}
          <i>|T′(r)|</i>, which is machine zero while the curve is moving at 0.2 a step away. That cusp{' '}
          <i>is</i> the no-log condition, the residue formula from the last slide turned into something
          you can point at.{' '}
          <b>And the fiber is here too.</b> <i>Around the loop</i> is the same slider as the previous
          slide and it means the same thing — it changes <b>which curve</b> you are looking at, holding
          the interpolation data fixed. The pale tracks are the whole family at once. That this shows
          anything at all was worth checking: the gauge 𝒜 ↦ 𝒜e^{'{iθ}'} leaves the hodograph
          untouched, so had the fiber been that gauge, every member would share <i>one</i> indicatrix
          and the slider would be dead. Measured instead: the track moves by up to <b>1.94</b> on a unit
          sphere while the held data moves 8·10⁻¹⁴.{' '}
          <span className="text-slate-400">
            <b>Drive the pole dial.</b> Because r must stay outside [0,1], the cusp never sits on the bold
            arc — but walking r inward walks the cusp <i>toward</i> it, and{' '}
            <i>infinity to curve</i> shrinking is that same approach as a number. <b>Twist</b> reshapes
            the whole track while the cusp stays a cusp: it is not a property of this member but of having
            a pole at all. <b>t along the curve</b> is the odd one out — it does not change the curve,
            it walks the blue radius along the one you have. Nothing here is normalised — ‖T‖ − 1 stays at
            machine zero because the sphere is an identity, not a projection. Drag the background to
            rotate.
          </span>
        </>
      }
    >
      {/* No depth write: the indicatrix wanders over the whole sphere and occlusion would hide most of it. */}
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.11} depthWrite={false} roughness={0.9} />
      </mesh>

      {GREAT_CIRCLES.map((c, i) => (
        <Curve3D key={`gc${i}`} points={c} color={FIG.color.controlPolygon} width={1} />
      ))}

      {/* the whole fiber as tangent tracks — the thing the measurement said would be there */}
      {family.ghosts.map((g, i) => (
        <Curve3D key={`fam${i}`} points={g} color={FIG.color.derived} width={0.8} />
      ))}

      <Curve3D points={whole} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      {/* the swept direction, drawn as a radius so it reads as a TANGENT rather than a dot on a surface */}
      <Curve3D points={[[0, 0, 0], marker]} color={FIG.color.dataPoint} width={1.5} />
      <Point3D position={marker} color={FIG.color.dataPoint} radius={0.045} />

      {/* the cusp: the pole, showing itself */}
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />
    </Figure3D>
  )
}
