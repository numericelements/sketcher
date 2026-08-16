// ============================================================================
// THREE SPHERES — the inventory slide. Nothing is imposed and nothing helps you.
//
// THERE ARE NO CONTROL POINTS HERE, and that is the design. Slide 13 had two spheres and a bead on
// the leg; this one drops the polygon language entirely. There are three SPHERES, a point is a
// sphere of radius zero, and each sphere carries the same three controls:
//
//     centre   dragged in space          (the centre is only a DEVICE for moving the sphere —
//     radius   a slider                   it is not Möbius-natural and nothing here claims it is;
//     weight   a slider                   the SPHERE is the invariant object)
//
// 3 × 5 = 15 numbers, one of which is the overall projective scale, so w₀ is pinned at 1 and the
// figure exposes FOURTEEN handles. Against them stand FIVE conditions — the Bernstein coefficients
// of ⟨P,P⟩ — and 14 − 5 = 9 is the dimension of the curves of points at this degree.
//
// WHAT YOU ARE ACTUALLY MAKING IS A TUBE, and the curve is the special member where it collapses.
// The figure OPENS on the bottom row of this ladder — the straight line — so the first drag is the
// lesson. All of it measured in spherePolygonDegreeTwo.test.ts:
//
//     free spheres                     radii 0.600 0.259 0.436 0.420 0.250   a tube
//     ends pinched to points, middle too big    0 0.765 0.883 0.765 0         a spindle
//     ends pinched to points, middle too small  0 −0.437 −0.505 −0.437 0      a GAP — imaginary
//     the five numbers at zero                  0 0 0 0 0                     a CURVE
//
// So the null condition is not an equation to admire: it is the knife edge between a fat tube and
// nothing at all, and at this size you can walk across it in both directions by hand.
//
// THE FIVE NUMBERS ARE SHOWN RAW AND UNLABELLED. They are the honest computed quantity, and each one
// answers to a different sphere — measured: pushing the middle centre off the bisector plane breaks
// b₃ alone and leaves the rest at 1e-17. Nobody is told the rules; the numbers say what is wrong.
//
// AND THE PAYOFF THE PRESENTER SAYS OUT LOUD when they hit zero: the curve is an arc of a circle,
// every time, and it is automatically PH. Neither was asked for.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — every number comes from
// core/canalSphereSpline.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale } from '../../core/quaternion'
import {
  type ControlSphere, type SphereSpline, conformalSphereAt, nullCoefficients,
} from '../../core/canalSphereSpline'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const RING = 40
/** Where the spheres ON the curve are drawn. Few, because each is three great circles. */
const PROBES = [0.12, 0.28, 0.44, 0.56, 0.72, 0.88]
const SUB = '₀₁₂'

/**
 * IT OPENS ON A STRAIGHT LINE, which is the simplest curve of points there is and, measured, the
 * tidiest polygon in the whole family: two point-spheres and the sphere on the segment as DIAMETER
 * — centre the midpoint, radius half the chord, all weights 1. All five numbers are zero, every
 * sphere on the curve is a point, and there is nothing to see but a segment.
 *
 * So the first move is the lesson, exactly as on slide 15: touch ANY of the fourteen handles and the
 * tube appears. The difference is that here you can get back, and can walk the family — keep the
 * middle sphere through both ends and it bows into arcs instead.
 */
const SEED: ControlSphere[] = [
  { centre: { x: -1, y: 0, z: 0 }, radius: 0, weight: 1 },
  { centre: { x: 0, y: 0, z: 0 }, radius: 1, weight: 1 },
  { centre: { x: 1, y: 0, z: 0 }, radius: 0, weight: 1 },
]

/**
 * ONLY REAL SPHERES ARE DRAWN. A negative radius here means ⟨S,S⟩ < 0 — an IMAGINARY sphere, which
 * is not a sphere at all, so it must draw as NOTHING and leave a visible gap. (The canal figure's
 * copy of this helper takes |radius| and is right to: there a negative radius is a reversed
 * ORIENTATION and the sphere is real. Same helper, opposite meaning — this file takes the
 * conformal one, and the gap it leaves is the point of the slide.)
 */
function greatCircles(centre: Vec3, radius: number): [number, number, number][][] {
  if (!(radius > 1e-4)) return []
  const axes: Vec3[] = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]
  return axes.map((axis) => {
    const seed = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    const u = vscale(vcross(axis, seed), 1 / vnorm(vcross(axis, seed)))
    const v = vcross(axis, u)
    return Array.from({ length: RING + 1 }, (_, k) => {
      const a = (2 * Math.PI * k) / RING
      return tri(vadd(centre, vadd(vscale(u, radius * Math.cos(a)), vscale(v, radius * Math.sin(a)))))
    })
  })
}

const BOUNDS = {
  min: [-2.8, -2.2, -2.2] as [number, number, number],
  max: [2.8, 2.2, 2.2] as [number, number, number],
}

export default function ThreeSphereFigure() {
  const [S, setS] = useState<ControlSphere[]>(SEED)
  const [grabbed, setGrabbed] = useState<number | null>(null)

  const spline: SphereSpline = useMemo(() => ({ S }), [S])

  /** The five Bernstein coefficients of ⟨P,P⟩ — raw, unlabelled, and the whole task. */
  const nulls = useMemo(() => nullCoefficients(spline), [spline])
  const onIt = Math.max(...nulls.map(Math.abs)) < 1e-9

  /** The spheres ON the curve. Zero draws nothing; imaginary draws nothing and is counted. */
  const probes = useMemo(() => PROBES.map((t) => conformalSphereAt(spline, t)), [spline])
  const imaginary = probes.filter((p) => p.radius < 0).length
  const biggest = Math.max(...probes.map((p) => p.radius))

  /** The centres of the spheres on the curve — what is left when the tube collapses. */
  const spine = useMemo(
    () => Array.from({ length: 121 }, (_, k) => tri(conformalSphereAt(spline, k / 120).centre)),
    [spline],
  )

  const set = (i: number, patch: Partial<ControlSphere>): void =>
    setS((prev) => prev.map((s, k) => (k === i ? { ...s, ...patch } : s)))

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Bᵢ(t)·Sᵢ   — three spheres, degree 2',
        'a point is a sphere of radius zero',
        '⟨P,P⟩ ≡ 0 ⟺ every sphere on the curve is a point',
      ]}
      readouts={[
        {
          label: '⟨P,P⟩',
          value: nulls.map((v) => (Math.abs(v) < 5e-4 ? '0' : v.toFixed(3))).join('  '),
          tone: onIt ? ('ok' as const) : ('warn' as const),
        },
        { label: 'biggest sphere on the curve', value: biggest.toFixed(3) },
        { label: 'imaginary', value: `${imaginary} of ${PROBES.length}` },
        { label: 'handles', value: '14' },
        { label: 'conditions', value: '5' },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          {S.map((s, i) => (
            <label key={`r${i}`} className="flex items-center gap-1">
              <span className="text-slate-400">ρ{SUB[i]}</span>
              <input
                type="range"
                min={0}
                max={2.4}
                step={0.005}
                value={s.radius}
                onChange={(e) => set(i, { radius: Number(e.target.value) })}
                className="w-16"
              />
            </label>
          ))}
          {[1, 2].map((i) => (
            <label key={`w${i}`} className="flex items-center gap-1">
              <span className="text-slate-400">w{SUB[i]}</span>
              <input
                type="range"
                min={0.15}
                max={3}
                step={0.005}
                value={S[i].weight}
                onChange={(e) => set(i, { weight: Number(e.target.value) })}
                className="w-16"
              />
            </label>
          ))}
          <button
            onClick={() => { setS(SEED); setGrabbed(null) }}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Three spheres, and every number they have.</b> Forget control points and polygons: there
          are only spheres here, and a point is a sphere of radius zero. Each one has a{' '}
          <b>centre</b> you drag, a <b>radius</b> and a <b>weight</b> &mdash; fifteen numbers, one of
          which is an overall scale, so <b>fourteen handles</b>. Against them stand{' '}
          <b>five numbers</b>, and nothing on this slide will move them for you.{' '}
          <b>It opens on a straight line</b>, and that is already the whole construction: two spheres
          of radius zero, and between them the sphere <b>on the segment as diameter</b>. All five
          numbers are zero, so every sphere on the curve is a point and there is nothing to see but a
          segment.{' '}
          <b>Now touch anything.</b> Move a centre, grow a radius, pull a weight, and spheres appear
          all along the curve: what you are really making is a <b>tube</b>, and the line was the one
          member where it had collapsed. Push further and the middle of the tube goes{' '}
          <i>imaginary</i> &mdash; drawn as nothing, because nothing is there.{' '}
          <b>So the five numbers are the game.</b> Zero means a curve; anything else means a tube or
          a gap. Try to get back &mdash; and then try to reach a <i>different</i> curve: keep the
          middle sphere touching both ends while you move it, and the segment bows into an arc.{' '}
          <span className="text-slate-400">
            That is the knife edge the slide after next asks a solver to hold with seven spheres in
            seventeen dimensions. Here it is the same edge with three, and you can still find it by
            hand &mdash; and the centre you drag is only a device for moving a sphere, not something
            the geometry believes in. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the three spheres — the only objects on this slide */}
      {S.flatMap((s, i) =>
        greatCircles(s.centre, s.radius).map((ring, j) => (
          <Curve3D key={`ctl${i}-${j}`} points={ring} color={FIG.color.controlPolygon} width={1.4} />
        )))}

      {/* the spheres ON the curve — the tube, absent wherever it is imaginary */}
      {probes.flatMap((p, i) =>
        greatCircles(p.centre, p.radius).map((ring, j) => (
          <Curve3D key={`probe${i}-${j}`} points={ring} color={FIG.color.derived} width={1} />
        )))}

      {/* their centres: the thread the tube collapses onto */}
      <Curve3D points={spine} color={FIG.color.curve} width={onIt ? 3 : 1.5} />

      {S.map((s, i) => (
        <DragPoint3D
          key={`d${i}`}
          position={tri(s.centre)}
          color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.06}
          onDragStart={() => setGrabbed(i)}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => set(i, { centre: { x, y, z } })}
        />
      ))}
    </Figure3D>
  )
}
