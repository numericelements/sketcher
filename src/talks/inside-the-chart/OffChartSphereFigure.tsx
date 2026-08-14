// ============================================================================
// WALKING OFF THE CHART, ON THE SPHERE — the cusp that genuinely does disappear.
//
// Slide 3 shows a corner that refuses to soften: turn the chart's own twist dial all the way and
// |T′(r)| stays at machine zero, because at any finite angle the pole is still a pole. That figure was
// built expecting the cusp to fade and it does not.
//
// HERE IT DOES, and the mechanism is the one slide 3's theorem quietly allows. "A simple pole exists
// if and only if the indicatrix cusps there" is a statement about a pole at a REAL parameter. This
// walk moves the pole OFF the real axis — one real root becomes two complex conjugate pairs — and
// there is then no real parameter at which to have a corner. The indicatrix closes up and is smooth.
//
// Nothing is being enforced or projected along the way. Every station satisfies |N|² = σ² exactly and
// is joined to the previous one by a Newton correction that also kept σ's sign, so this is one
// continuous family of PH curves that happens to start inside the λ-chart and end outside it.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { indicatrixArc, indicatrixLoop, indicatrixSpeedAt } from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import OffChartControls from './OffChartControls'
import { LEAVES_AT, useStation } from './offChartModel'

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

export default function OffChartSphereFigure() {
  const { index, station } = useStation()
  const whole = useMemo(() => indicatrixLoop(station.hodograph, 900).map(tri), [station])
  const used = useMemo(() => indicatrixArc(station.hodograph, 0, 1, 240).map(tri), [station])
  /** The cusp exists only while a pole is real; at the start it is at 1.7. */
  const cusp = useMemo(
    () => (station.realPoles > 0 ? indicatrixArc(station.hodograph, 1.7, 1.7, 1).map(tri)[0] : null),
    [station],
  )
  const slowest = useMemo(() => {
    let worst = Infinity
    for (let i = 0; i <= 400; i++) worst = Math.min(worst, indicatrixSpeedAt(station.hodograph, -6 + (12 * i) / 400))
    return worst
  }, [station])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 420 }}
      notation={['ᴛ = N/σ', 'a cusp needs a pole at a REAL parameter', 'σ > 0 all the way']}
      readouts={[
        { label: 'real poles', value: `${station.realPoles}`, tone: station.realPoles > 0 ? ('plain' as const) : ('ok' as const) },
        { label: 'slowest |T′|', value: slowest.toExponential(1), tone: slowest > 1e-6 ? ('ok' as const) : ('warn' as const) },
        { label: 'PH system rank', value: `${station.rank} of 13` },
        { label: 'station', value: `${index}` },
      ]}
      controls={<OffChartControls />}
      caption={
        <>
          <b>The cusp that really does disappear.</b> Slide 3 turned the chart&rsquo;s own dial to its
          limit and the corner refused to soften — at any finite angle the pole is still a pole. This
          walk does something the dial cannot: it moves the pole <i>off the real axis</i>. One real
          root becomes <b>two complex conjugate pairs</b>, and a cusp needs a pole at a{' '}
          <b>real parameter</b> to exist at all. The indicatrix closes up and runs smooth — watch{' '}
          <i>slowest |T′|</i> lift off machine zero.{' '}
          <span className="text-slate-400">
            Nothing is enforced along the way. Every station satisfies <i>|N|² = σ²</i> exactly and is
            joined to the last by a step that also kept σ&rsquo;s sign, so this is one continuous
            family of PH curves — it simply starts inside the λ-chart and ends outside it. The chart
            takes <i>real</i> poles, so past station {LEAVES_AT} it has nothing to say, and the PH
            system&rsquo;s rank climbs from 11 to 13 as we go. Drag the background to rotate.
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
      {cusp ? <Point3D position={cusp} color={FIG.color.pole} radius={0.05} /> : null}
    </Figure3D>
  )
}
