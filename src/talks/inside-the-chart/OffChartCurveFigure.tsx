// ============================================================================
// THE SAME WALK, ON THE CURVE — and the curve stops running to infinity.
//
// Slide 4 shows the pole approaching the drawn piece: `infinity to curve` closes and the run-out
// reaches further. Here the pole does something the chart cannot ask it to do — it leaves the real
// axis entirely. The denominator w then has no real root, so w > 0 on the WHOLE line and the curve is
// bounded everywhere, not merely on [0,1]. That is exactly what complex poles exist to buy, and the
// ledger lists it as one of the things rationality gives you.
//
// So the pair reads: on the sphere the cusp goes, and here the escape goes with it. One event.
//
// THE FRAME IS FIXED across the whole walk, computed from every station at load, because a camera that
// rescales while you drag is worse than one framed a little wide — and the point of the figure is that
// the curve stays put in size while its pole structure changes underneath it.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import OffChartControls from './OffChartControls'
import { LEAVES_AT, PATH, denominatorAt, sampleCurve, useStation } from './offChartModel'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** Framed once from every station, so nothing moves the camera mid-walk. */
const BOUNDS = (() => {
  const pts = PATH.flatMap((s) => sampleCurve(s.curve, 60).map(tri))
  const pad = 0.6
  const axis = (i: number): [number, number] => [
    Math.min(...pts.map((p) => p[i])) - pad,
    Math.max(...pts.map((p) => p[i])) + pad,
  ]
  const [x0, x1] = axis(0), [y0, y1] = axis(1), [z0, z1] = axis(2)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

export default function OffChartCurveFigure() {
  const { index, station } = useStation()
  const curve = useMemo(() => sampleCurve(station.curve).map(tri), [station])
  /** Smallest |w| over a wide window: zero means a real pole, positive means bounded everywhere. */
  const floor = useMemo(() => {
    let worst = Infinity
    for (let i = 0; i <= 400; i++) worst = Math.min(worst, Math.abs(denominatorAt(station, -6 + (12 * i) / 400)))
    const scale = Math.max(...station.curve.w.map(Math.abs), 1e-300)
    return worst / scale
  }, [station])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴄ = p/w', 'no real root of w ⟹ bounded on all of ℝ', 'PH exact at every station']}
      readouts={[
        { label: 'real poles', value: `${station.realPoles}`, tone: station.realPoles > 0 ? ('plain' as const) : ('ok' as const) },
        { label: 'min |w| / scale', value: floor.toExponential(1), tone: floor > 1e-3 ? ('ok' as const) : ('warn' as const) },
        { label: 'largest |c|', value: station.extent.toFixed(2) },
        { label: 'PH system rank', value: `${station.rank} of 13` },
        { label: 'station', value: `${index}` },
      ]}
      controls={<OffChartControls />}
      caption={
        <>
          <b>The same walk, with the curve drawn instead of the sphere.</b> Slide 4 pushed the pole
          toward the drawn piece and watched <i>infinity to curve</i> close. Here the pole does what
          the chart cannot ask of it — it leaves the <b>real axis</b>. The denominator then has no real
          root at all, so <i>w</i> &gt; 0 on the <b>whole line</b> and the curve is bounded everywhere,
          not merely on [0,1]. Watch <i>min |w|</i> lift off zero.{' '}
          <span className="text-slate-400">
            That is precisely what complex poles are for, and the ledger of <i>The Price of a Circle</i>{' '}
            lists it as something rationality buys: boundedness is unreachable with real poles, where a
            pole <i>is</i> an escape to infinity. Past station {LEAVES_AT} the λ-chart cannot describe
            any of this — its construction takes real roots — and yet the Pythagorean condition has not
            wavered once. <b>The geometry walks calmly across a boundary the coordinates cannot
            follow.</b> Drag the background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={curve} color={FIG.color.curve} width={3.5} />
      <Point3D position={curve[0]} color={FIG.color.pinned} radius={0.06} />
      <Point3D position={curve[curve.length - 1]} color={FIG.color.dataPoint} radius={0.06} />
    </Figure3D>
  )
}
