// ============================================================================
// THE SAME POLE, SEEN ON THE CURVE — second of the pair, and the same state (chartModel.ts).
//
// WHAT THE PREVIOUS SLIDE LEFT OWING. There the pole was a violet point on a sphere: a DIRECTION, with
// nothing yet attached to it. Here it is the direction the curve actually leaves along. The identity
// is exact, not approximate —
//
//     N(r) = −p(r)
//
// — measured in tangentIndicatrix.test.ts. So the violet ray drawn from the origin is the same violet
// vector that was the cusp, and the pale continuation of the curve runs out along it. Push the pole
// slider toward the drawn piece and the run-out reaches further before it leaves the frame; the
// readout `infinity to curve` says how close it has come.
//
// AND ONE MEASURED CORRECTION TO THE OBVIOUS CAPTION. Naively ‖c′(1)‖ = σ(1)/(1−r)² should grow more
// than a thousandfold across this slider. It grows 6.6× (poleSliderHasNoHoles.test.ts), because the
// data is HELD: the solve shrinks σ(1) to compensate, so the curve reshapes rather than blowing up.
// The blow-up is real and lives past t = 1, on the run-out — not on the drawn piece.
//
// AND THE TWO BRANCHES ARRIVE ANTIPARALLEL, which is why the sphere picture stops dead rather than
// turning: the pole of c′ is of EVEN order, so the tangent has the same limit from both sides while
// the curve itself escapes one way and returns from the other. That is the corner, seen from the
// second side.
//
// THE HANDLES ARE THE SAME HANDLES, deliberately — pole, twist, fibre phase, and the mode toggle, all
// from ChartControls. What is added here is the gestures that only make sense on a curve:
//
//   STRICT  the six data numbers are held; c(1) is draggable because it IS data, so moving it takes
//           you to a different fibre. Interior control points are OUTPUTS and drawn grey.
//   FREE    every control point is a handle, one at a time, and the ends hold each other. c(0) needs
//           no pinning: p(0) = 0 fixes the translation.
//
// FRAMING. The curve's size varies enormously with the pole, so the box is computed once, generously,
// from the seed across the pole slider's whole range, and the run-out is CLIPPED at a radius rather
// than allowed to rescale the camera mid-gesture. A camera that reframes while you drag is worse than
// one framed a little wide.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  controlStructure,
  curveAt,
  derivativeAt,
  poleMargin,
  speedAt,
  toMember,
  withDial,
} from '../../core/rationalPHMultiPoleSpatial'
import { indicatrixAt } from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import ChartControls from './ChartControls'
import { RANGE, SEED, chart, useChart } from './chartModel'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const SAMPLES = 140

const drawn = (m: ReturnType<typeof toMember>): [number, number, number][] =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => tri(curveAt(m, i / SAMPLES)))

/**
 * The run-out: sampled from the drawn piece toward the pole and stopped when it leaves the box. This is
 * the only place the figure clips anything, and it clips rather than rescales on purpose.
 */
function runOut(
  m: ReturnType<typeof toMember>, from: number, to: number, radius: number,
): [number, number, number][] {
  const out: [number, number, number][] = []
  for (let i = 0; i <= 200; i++) {
    const t = from + ((to - from) * i) / 200
    const v = curveAt(m, t)
    if (Math.hypot(v.x, v.y, v.z) > radius) break
    out.push(tri(v))
  }
  return out
}

/** Framed once, from the seed across the pole slider's range. */
const BOUNDS = (() => {
  const pts: [number, number, number][] = []
  const target = [0, 0, 0, 0, 0, 0]
  const seedMember = toMember(SEED)
  const d0 = derivativeAt(seedMember, 0)
  const e1 = curveAt(seedMember, 1)
  target[0] = d0.x; target[1] = d0.y; target[2] = d0.z
  target[3] = e1.x; target[4] = e1.y; target[5] = e1.z
  for (const r of [RANGE.pole.min, 1.3, 1.7, 2.4, RANGE.pole.max]) {
    const prm: MultiPoleParams | null = withDial(SEED, target, { pole: { index: 0, value: r } })
    if (prm) pts.push(...drawn(toMember(prm)))
  }
  const pad = 0.9
  const axis = (i: number): [number, number] => [
    Math.min(...pts.map((p) => p[i])) - pad,
    Math.max(...pts.map((p) => p[i])) + pad,
  ]
  const [x0, x1] = axis(0), [y0, y1] = axis(1), [z0, z1] = axis(2)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

const RADIUS = 0.5 * Math.hypot(
  BOUNDS.max[0] - BOUNDS.min[0], BOUNDS.max[1] - BOUNDS.min[1], BOUNDS.max[2] - BOUNDS.min[2],
)

export default function PoleCurveFigure() {
  const { live, mode, theta } = useChart()
  const strict = mode === 'strict'
  const pole = live.roots[0]

  const member = useMemo(() => toMember(live), [live])
  const curve = useMemo(() => drawn(member), [member])
  const control = useMemo(() => controlStructure(member).points, [member])
  const last = control.length - 1

  /** Toward the pole from the drawn piece, and back from the far side. */
  const outbound = useMemo(() => runOut(member, 1, pole - 1e-3, RADIUS), [member, pole])
  const inbound = useMemo(() => runOut(member, pole + 1e-3, pole + 1.2, RADIUS), [member, pole])

  /** The violet vector: the cusp on the previous slide, and the escape direction here. */
  const escape = useMemo(() => {
    const T = indicatrixAt(member, pole)
    const k = 0.75 * RADIUS
    return [[0, 0, 0], [T.x * k, T.y * k, T.z * k]] as [number, number, number][]
  }, [member, pole])

  const margin = poleMargin(live)
  const endSpeed = speedAt(member, 1)

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴄ = p/w,  w = t − r', 'N(r) = −p(r)', '‖ᴄ′‖ = σ/w²']}
      readouts={[
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'infinity to curve',
          value: margin.toFixed(3),
          tone: margin < 0.1 ? ('warn' as const) : ('ok' as const),
        },
        { label: '‖c′(1)‖', value: endSpeed.toFixed(1), tone: endSpeed > 60 ? ('warn' as const) : ('plain' as const) },
        { label: 'λ', value: Math.abs(Math.tan((theta * Math.PI) / 180)) > 999 ? '≫' : Math.tan((theta * Math.PI) / 180).toFixed(1) },
        { label: 'mode', value: strict ? 'data held' : 'ends held' },
      ]}
      controls={<ChartControls />}
      caption={
        <>
          <b>The same configuration as the last slide, with the curve drawn instead of the sphere.</b>{' '}
          The <b style={{ color: FIG.color.pole }}>violet ray</b> is the same violet vector that was
          the cusp — <i>N(r) = −p(r)</i> exactly, so the corner on the sphere <i>is</i> the direction
          the curve escapes along. The pale continuation runs out beside it and comes back from the
          other side.{' '}
          <b>Push the pole toward the drawn piece</b> and <i>infinity to curve</i> closes while the
          run-out reaches further and further before it leaves the frame.{' '}
          <b>But watch how little ‖c′(1)‖ moves.</b> Naively it should grow more than a thousandfold
          across this slider; it grows <b>sixfold</b>, because the data is <i>held</i> — the solve
          shrinks σ(1) to compensate and the curve <i>reshapes</i> rather than blowing up. The blow-up
          is real, and it lives past <i>t</i> = 1, out on the pale continuation.{' '}
          <span className="text-slate-400">
            In <b>strict</b> the six data numbers are held and only the far endpoint is yours; the
            interior control points are <i>outputs</i>, drawn grey, and the three sliders are exactly
            the coordinates left over — one dial, one pole, one fibre dimension that closes. In{' '}
            <b>free</b> every control point is a handle, one at a time, and the ends hold each other;
            c(0) needs no pinning because <i>p</i>(0) = 0 fixes the translation. Nothing here enforces
            PH — inside the chart there is nothing to enforce. Drag the background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={control.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={outbound} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={inbound} color={FIG.color.curveMuted} width={1.5} dashed />
      <Curve3D points={curve} color={FIG.color.curve} width={3.5} />

      {/* the pole, as a direction — the link to the previous slide */}
      <Curve3D points={escape} color={FIG.color.pole} width={2} />

      {control.map((p, i) => {
        const handle = !strict || i === last
        if (!handle) {
          return <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.derived} radius={0.05} derived />
        }
        return (
          <DragPoint3D
            key={`cp${i}`}
            position={tri(p)}
            color={FIG.color.dataPoint}
            radius={i === 0 || i === last ? 0.075 : 0.062}
            onDrag={([x, y, z]) => (strict
              ? chart.dragEnd({ x, y, z })
              : chart.dragFree(i, { x, y, z }, last))}
            onDragEnd={() => chart.settle()}
          />
        )
      })}

      {/* c(0): pinned by the translation gauge, so it is a mark rather than a handle */}
      <Point3D position={tri(curveAt(member, 0))} color={FIG.color.pinned} radius={0.07} />
    </Figure3D>
  )
}
