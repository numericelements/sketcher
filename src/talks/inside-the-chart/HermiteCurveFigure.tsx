// ============================================================================
// THE SAME CONFIGURATION, DRAWN AS THE CURVE — second of the degree-6 pair, same state.
//
// WHAT THE SPHERE COULD NOT SHOW. The indicatrix is c′/‖c′‖, so it carries the DIRECTIONS of the two
// end tangents and nothing else: four of the nine held numbers. The tangent magnitudes and the
// displacement are held just as firmly and are invisible there. Here they are the picture — P₁ and P₅
// stand off their ends by an amount that IS ‖c′(0)‖ and ‖c′(1)‖, and P₆ is c(1) exactly.
//
// STRICT'S FOUR HANDLES ARE DERIVED, NOT CHOSEN.
//
//     P₀   c(0) — the ORIGIN. Pinned inside the family by p(0) = 0, so its drag is a change of origin
//          and the other three hold their SCREEN places while it moves. The curve reshapes.
//     P₁   carries c′(0) = 6(w₁/w₀)(P₁ − P₀)
//     P₅   carries c′(1) = 6(w₅/w₆)(P₆ − P₅)
//     P₆   IS c(1)
//     P₂ P₃ P₄  outputs, drawn grey
//
// and the arithmetic closes against the family: 12 handle numbers + ψ + s + λ + r = 16, which is the
// chart's measured dimension. Offering P₂, P₃ or P₄ in strict would be offering motions the family
// does not have.
//
// ONE AT A TIME: dragging any of the four leaves the other three where they are. That is a statement
// about POINTS and it is not the same as holding the nine numbers, because two of the nine are
// DIFFERENCES between two handles — c′(0) = k₀(P₁ − P₀) and c′(1) = k₁(P₆ − P₅). Holding the number
// while one end of it moves carries the other end rigidly, which is what the two endpoint handles did
// until it was measured: P₅ moved by exactly the P₆ drag, P₁ by exactly the P₀ drag. So an endpoint
// drag retargets its own end tangent, and the mid-tangent handles need no such term.
// → degree6HandlesTrack.test.ts
//
// THE WEIGHT RATIOS ARE CONSTANT while a handle moves, which is what makes "P₁ carries c′(0)" an
// identity rather than a linearisation: w = ∏(t − r) depends only on the poles, and the poles are held
// during a handle drag. Measured drift across the drags: exactly 0.
//
// FREE releases the nine numbers and makes all seven control points handles, one at a time, with the
// ends holding each other. P₀ still does not go through the solver — asking for a motion the family
// cannot make spends the whole subspace failing and the points fly apart — it changes the origin while
// c(1) holds its screen place.
//
// NO FAN AND NO RUN-OUT. The sphere slide learned that ten members at once leaves nowhere to rest the
// eye; the degree-4 curve slide learned that drawing the continuation past t = 1 costs a third of the
// frame and pulls attention off the thing being edited. Only t ∈ [0,1] is drawn, with the pole outside.
//
// r3f cannot be verified headlessly, so this file holds no mathematics — only marks and gestures.
// Everything it displays is pinned in core/__tests__/degree6HandlesTrack.test.ts,
// degree6FreeDrag.test.ts and degree6TwoCircles.test.ts.
// ============================================================================
import { useMemo } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  controlStructure,
  curveAt,
  derivativeAt,
  hermiteOf,
  poleMargin,
  toMember,
} from '../../core/rationalPHMultiPoleSpatial'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'
import HermiteControls from './HermiteControls'
import { SEED, hermiteChart, useHermiteChart } from './hermiteModel'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const SAMPLES = 160

const drawn = (m: ReturnType<typeof toMember>): [number, number, number][] =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => tri(curveAt(m, i / SAMPLES)))

/**
 * Framed once, from the SEED alone. A camera that reframes mid-gesture is worse than one framed a
 * little wide.
 *
 * AND THE SEED ALONE IS ENOUGH, which is measured rather than hoped: with the nine Hermite numbers
 * held, max‖c‖ over the drawn piece is 7.665 at EVERY pole from 1.01 to 20, identical to four figures
 * (degree6PoleSlider.test.ts). The pole moves the shape around inside a box it never leaves.
 *
 * THE VERSION THIS REPLACES IS WHY THE CURVE WAS INVISIBLE. It probed five poles by jumping straight
 * from the seed, and a jumped solve does not converge — r = 1.1 solved, 1.15 did not, 1.2 did, no
 * clean boundary, the signature of a bad starting point. A non-converged solve still passes
 * `poleMargin`, which only asks where the pole SITS, so one with a residual of 1.2e13 and a curve
 * reaching 5.8e11 was accepted, the box came out ±3e11, and the real curve became a sub-pixel dot.
 * Probing by CONTINUATION would fix the convergence but costs ~200 projections at module load, which
 * stalls the deck; the measurement above says the probing was never needed.
 */
const BOUNDS = (() => {
  const pts: [number, number, number][] = drawn(toMember(SEED))
  const pad = 1.0
  const axis = (i: number): [number, number] => [
    Math.min(...pts.map((p) => p[i])) - pad,
    Math.max(...pts.map((p) => p[i])) + pad,
  ]
  const [x0, x1] = axis(0), [y0, y1] = axis(1), [z0, z1] = axis(2)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

export default function HermiteCurveFigure() {
  const { live, mode, mirrorA, mirrorB, origin, target } = useHermiteChart()
  const strict = mode === 'strict'
  const pole = live.roots[0]

  const member = useMemo(() => toMember(live), [live])
  const shift = (p: [number, number, number]): [number, number, number] =>
    [p[0] + origin.x, p[1] + origin.y, p[2] + origin.z]
  const local = (p: [number, number, number]): Vec3 =>
    ({ x: p[0] - origin.x, y: p[1] - origin.y, z: p[2] - origin.z })

  const curve = useMemo(() => drawn(member), [member])
  const control = useMemo(() => controlStructure(member).points, [member])
  const last = control.length - 1

  /** P₀, P₁, P₅, P₆ in strict; everything in free. */
  const isHandle = (i: number): boolean =>
    !strict || i === 0 || i === 1 || i === last - 1 || i === last

  const drift = useMemo(() => {
    const h = hermiteOf(member)
    return Math.hypot(...h.map((v, i) => v - target[i]))
  }, [member, target])
  const margin = poleMargin(live)
  const d0 = derivativeAt(member, 0)
  const d1 = derivativeAt(member, 1)

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴄ = p/w,  w = t − r', 'c′(0) = 6(w₁/w₀)(P₁ − P₀)', 'P₆ = c(1)']}
      readouts={[
        { label: 'fibre A, B', value: `${mirrorA.toFixed(0)}°, ${mirrorB.toFixed(0)}°` },
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'infinity to curve',
          value: margin.toFixed(3),
          tone: margin < 0.1 ? ('warn' as const) : ('ok' as const),
        },
        { label: '‖c′(0)‖, ‖c′(1)‖', value: `${Math.hypot(d0.x, d0.y, d0.z).toFixed(1)}, ${Math.hypot(d1.x, d1.y, d1.z).toFixed(1)}` },
        { label: 'Hermite drift', value: drift.toExponential(1), tone: 'ok' as const },
        { label: 'mode', value: strict ? 'data held' : 'ends held' },
      ]}
      controls={<HermiteControls />}
      caption={
        <>
          <b>The same configuration as the last slide, drawn as the curve.</b> The sphere carried only
          the <i>directions</i> of the two end tangents — four of the nine held numbers. Their{' '}
          <i>magnitudes</i> and the displacement were held just as firmly and were invisible there.
          Here they are the picture: <b>P₁</b> and <b>P₅</b> stand off their ends by exactly ‖c′(0)‖
          and ‖c′(1)‖ up to the fixed weight ratio, and <b>P₆</b> is c(1).{' '}
          <span className="text-slate-400">
            <b>Strict gives you four points, and the number is derived.</b> P₁ carries the start
            tangent, P₅ the end tangent, P₆ is the endpoint, and P₀ is c(0) — pinned inside the family
            by <i>p</i>(0) = 0, so dragging it changes the <i>origin</i> and the curve reshapes.{' '}
            <b>Drag any one of the four and the other three stay where they are</b>, which is a promise
            about the points and not about the nine numbers: two of the nine are <i>differences</i>{' '}
            between handles, so at each end it is the tangent that gives way. P₂, P₃, P₄ are outputs,
            drawn grey. Then
            the arithmetic closes: 12 numbers in the handles plus ψ, s, λ and r is <b>sixteen</b>, and
            sixteen is the chart&rsquo;s dimension. <b>Turn either fibre slider with the control polygon in
            view</b> — the interior rearranges and the four handles do not move, because they{' '}
            <i>are</i> the held data. And the two sliders are a <b>mirror pair</b>: turn <b>A</b>,
            reflect the picture, and it looks like you turned <b>B</b>. <b>Free</b> releases it and every one of the seven points is a handle with the
            ends holding each other. Nothing in either mode enforces PH; inside the chart there is
            nothing to enforce. Drag the background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={control.map((p) => shift(tri(p)))} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curve.map(shift)} color={FIG.color.curve} width={3.5} />

      {control.map((p, i) => {
        if (!isHandle(i)) {
          return <Point3D key={`cp${i}`} position={shift(tri(p))} color={FIG.color.derived} radius={0.05} derived />
        }
        return (
          <DragPoint3D
            key={`cp${i}`}
            position={shift(tri(p))}
            color={FIG.color.dataPoint}
            radius={i === 0 || i === last ? 0.075 : 0.062}
            onDrag={(q) => {
              // P₀'s handle speaks WORLD coordinates: its world position IS the offset.
              if (i === 0) {
                const world = { x: q[0], y: q[1], z: q[2] }
                if (strict) hermiteChart.translate(world)
                else hermiteChart.slideStart(world)
                return
              }
              const v = local(q)
              if (!strict) { hermiteChart.dragFree(i, v, last); return }
              if (i === last) hermiteChart.dragEnd(v)
              else if (i === last - 1) hermiteChart.dragEndTangent(v)
              else hermiteChart.dragStartTangent(v)
            }}
            onDragEnd={() => hermiteChart.settle()}
          />
        )
      })}
    </Figure3D>
  )
}
