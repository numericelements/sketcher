// ============================================================================
// THE POLE, SEEN ON THE SPHERE — first of a pair, and the second half is the same configuration.
//
// WHAT IS DRAWN. The tangent indicatrix T = N/σ. The w² cancels, so this spherical curve is finite and
// smooth exactly where the space curve runs off to infinity: the pole is INVISIBLE in the shape of the
// curve and unmistakable here. The two branches — before the pole and after it — are drawn in different
// weights, and they arrive at the same violet point from opposite directions and stop dead.
//
// THAT IS A CUSP, AND IT IS THE POLE. Not a coincidence of this seed:
//
//     T′ = (N′σ − Nσ′)/σ² ,   so T′ = 0 exactly when {N, N′} are dependent — the no-log condition
//
// which is Kalkan–Scharler–Schröcker–Šír Rem. 4.7 in our chart: a simple pole exists if and only if the
// indicatrix cusps there. Move the pole slider and the violet point travels with it. There is no
// setting of any handle on this figure that produces a pole without a corner.
//
// AN EARLIER VERSION DREW THE CORNER WRONG, and the fix is the reason the branches are drawn instead.
// It highlighted a fixed PARAMETER window either side of the pole; the indicatrix speed near the pole
// grows several-fold as the twist dial turns, so that fixed window swept an ever-longer arc and the
// corner appeared to open up and vanish — the opposite of what the figure says. Branches have no
// window to get wrong.
//
// THE SECOND SLIDE SHOWS THE SAME VIOLET VECTOR as the direction the curve escapes to infinity, because
// N(r) = −p(r) exactly (tangentIndicatrix.test.ts). Same handles, same state (chartModel.ts): whatever
// you set up here is what the next slide opens on.
//
// NO STRICT/FREE TOGGLE HERE, deliberately. The two modes differ only in which control points you may
// grab, and this figure draws none — the toggle would be a handle that changes nothing visible. The
// sliders stay, because they do act on the sphere. The curve slide carries the toggle.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { toMember } from '../../core/rationalPHMultiPoleSpatial'
import {
  indicatrixArc,
  indicatrixAt,
  indicatrixLength,
  indicatrixLoop,
  indicatrixNear,
  indicatrixSpeedAt,
  sphereResidual,
} from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import ChartControls from './ChartControls'
import { useChart } from './chartModel'

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

export default function PoleSphereFigure() {
  const { live, theta } = useChart()
  const pole = live.roots[0]

  const member = useMemo(() => toMember(live), [live])
  const whole = useMemo(() => indicatrixLoop(member, 900).map(tri), [member])
  const used = useMemo(() => indicatrixArc(member, 0, 1, 240).map(tri), [member])
  /**
   * The corner: ONE strand through the cusp, sized in spherical ARC as a tenth of the whole
   * indicatrix. Both earlier versions used a fixed window in the PARAMETER and both were wrong — one
   * too small (the corner rendered as a polygon) and one too large (it swallowed most of the curve
   * and read as a second curve drawn on top). Guarded in indicatrixNeighbourhood.test.ts.
   */
  const corner = useMemo(
    () => indicatrixNear(member, pole, Math.min(0.45, 0.1 * indicatrixLength(member))).map(tri),
    [member, pole],
  )
  const cusp = useMemo(() => tri(indicatrixAt(member, pole)), [member, pole])

  const atCusp = indicatrixSpeedAt(member, pole)
  const offCusp = indicatrixSpeedAt(member, pole + 0.05)

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={['ᴛ = N/σ — the w² cancels', 'ᴛ′ = 0 ⟺ {N, N′} dependent', 'λ = tan θ']}
      readouts={[
        { label: 'pole r', value: pole.toFixed(3) },
        { label: '|T′(r)| — at the cusp', value: atCusp.toExponential(1), tone: 'ok' as const },
        { label: '|T′| just off it', value: offCusp.toExponential(2) },
        { label: 'λ', value: Math.abs(Math.tan((theta * Math.PI) / 180)) > 999 ? '≫' : Math.tan((theta * Math.PI) / 180).toFixed(1) },
        { label: '‖T‖ − 1', value: sphereResidual(member).toExponential(1), tone: 'ok' as const },
      ]}
      controls={<ChartControls modes={false} />}
      caption={
        <>
          <b>The pole is invisible on the curve and unmistakable here.</b> The unit tangent{' '}
          <i>T = N/σ</i> has no denominator <i>w</i>, so it stays finite and smooth at the very
          parameter where the curve runs off to infinity. Follow the{' '}
          <b style={{ color: FIG.color.pole }}>violet strand</b>: it runs in to the point, stops dead,
          and comes back out the way it arrived. That is a <b>cusp</b>, and <b>|T′(r)|</b> reads
          machine zero to prove it.{' '}
          <span className="text-slate-400">
            <b>Move the pole and the cusp goes with it.</b> There is no setting of these handles that
            gives a pole without a corner — <i>T′ = (N′σ − Nσ′)/σ²</i> vanishes exactly when{' '}
            <i>{'{N, N′}'}</i> are dependent, which is the no-log condition itself. Stated as a
            theorem: a simple pole exists <i>if and only if</i> the indicatrix cusps there
            (Kalkan–Scharler–Schröcker–Šír, Rem. 4.7). <b>The next slide is this same configuration</b>{' '}
            — same handles, same state — with the curve drawn instead, and that violet vector is the
            direction it escapes along, because <i>N(r) = −p(r)</i> exactly. Drag the background to
            rotate.
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

      <Curve3D points={whole} color={FIG.color.curveMuted} width={1} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      {/* the corner: one strand in and out through the cusp */}
      <Curve3D points={corner} color={FIG.color.pole} width={3} />
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />

      {/* the ends of the drawn piece, so the data STRICT holds is visible rather than asserted */}
      <Point3D position={tri(indicatrixAt(member, 0))} color={FIG.color.pinned} radius={0.035} />
      <Point3D position={tri(indicatrixAt(member, 1))} color={FIG.color.dataPoint} radius={0.035} />
    </Figure3D>
  )
}
