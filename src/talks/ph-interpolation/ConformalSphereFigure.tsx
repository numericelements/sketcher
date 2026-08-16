// ============================================================================
// THE SAME RULE AS THE NEXT SLIDE, WITH NOTHING IMPOSED — the missing warm-up.
//
// WHY THIS EXISTS, and the mistake it repairs. The canal slide before this one interpolates centre
// and radius SEPARATELY, which is intuitive and is what the canal-surface literature does — but it
// is NOT the rule the next slide uses, so it built intuition for a different object. This figure
// uses the next slide's rule exactly: combine the five-number VECTORS, then read centre and radius
// back off the result. The only difference from the next slide is that nothing is solved.
//
// AND IT STARTS ON THE CONSTRAINT. The seed is the next slide's own member, so at first the spheres
// along the curve are all radius ZERO and you see nothing but a curve. Drag anything and they
// inflate: that is what the null condition was holding down, made visible by removing it.
//
// THE MECHANISM, in one table (measured, canalSphereSpline.test.ts) — two spheres of radius 0.7,
// with the gap between their centres varying:
//
//     gap        0.6      1.0      1.4      2.0      3.0
//     radius   0.633    0.490    0.000   −0.714   −1.327
//
// Separating two spheres drives the in-between radius DOWN, through zero, and out into imaginary.
// Zero lands at gap 1.4 = 2×0.7 — where the two spheres are TANGENT. So:
//
//     ⟨P,P⟩ ≡ 0  is not an equation to admire. It is "keep every sphere on the curve exactly at
//     that crossing point, at every t at once."
//
// which is why the next slide's control spheres are large and well separated, and why a curve of
// POINTS comes out of a scaffold of big spheres. Two point-spheres a unit apart already fail it:
// the sphere between them has radius² = −0.25. POINTS DO NOT INTERPOLATE TO POINTS.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale } from '../../core/quaternion'
import {
  type ControlSphere, type SphereSpline, conformalSphereAt, nullDefect,
} from '../../core/canalSphereSpline'
import { controlPoints, radii } from '../../core/conformalPHCurve'
import { sexticSeed } from '../../core/conformalPHSeeds'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const RING = 36
/** Where the spheres ON the curve are drawn. Few, because each is three great circles. */
const PROBES = [0.08, 0.24, 0.4, 0.56, 0.72, 0.88]

/** The NEXT SLIDE'S OWN member, so the figure opens sitting exactly on the constraint. */
const SEED: ControlSphere[] = (() => {
  const s = sexticSeed()
  const P = controlPoints(s), r = radii(s)
  return P.map((centre, i) => ({ centre, radius: r[i], weight: 1 }))
})()

function greatCircles(centre: Vec3, radius: number): [number, number, number][][] {
  const r = Math.abs(radius)
  if (!(r > 1e-4)) return []
  const axes: Vec3[] = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]
  return axes.map((axis) => {
    const seed = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    const u = vscale(vcross(axis, seed), 1 / vnorm(vcross(axis, seed)))
    const v = vcross(axis, u)
    return Array.from({ length: RING + 1 }, (_, k) => {
      const a = (2 * Math.PI * k) / RING
      return tri(vadd(centre, vadd(vscale(u, r * Math.cos(a)), vscale(v, r * Math.sin(a)))))
    })
  })
}

const BOUNDS = (() => {
  const pts: Vec3[] = []
  for (const s of SEED) {
    for (const d of [-1, 1]) {
      pts.push({ x: s.centre.x + d * s.radius, y: s.centre.y + d * s.radius, z: s.centre.z + d * s.radius })
    }
  }
  const pad = 0.55
  const axis = (f: (p: Vec3) => number): [number, number] =>
    [Math.min(...pts.map(f)) - pad, Math.max(...pts.map(f)) + pad]
  const [x0, x1] = axis((p) => p.x), [y0, y1] = axis((p) => p.y), [z0, z1] = axis((p) => p.z)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

const SUB = '₀₁₂₃₄₅₆'

export default function ConformalSphereFigure() {
  const [S, setS] = useState<ControlSphere[]>(SEED)
  const [grabbed, setGrabbed] = useState<number | null>(null)

  const spline: SphereSpline = useMemo(() => ({ S }), [S])

  /** The spine — the centres of the spheres ON the curve. */
  const spine = useMemo(
    () => Array.from({ length: 121 }, (_, k) => tri(conformalSphereAt(spline, k / 120).centre)),
    [spline],
  )

  /** The spheres ON the curve. Radius zero draws nothing; imaginary draws nothing and is counted. */
  const probes = useMemo(
    () => PROBES.map((t) => conformalSphereAt(spline, t)),
    [spline],
  )
  const imaginary = probes.filter((p) => p.radius < 0).length
  const biggest = Math.max(...probes.map((p) => p.radius))
  const defect = useMemo(() => nullDefect(spline), [spline])

  const setCentre = (i: number, c: Vec3): void =>
    setS((prev) => prev.map((s, k) => (k === i ? { ...s, centre: c } : s)))
  const setRadius = (i: number, r: number): void =>
    setS((prev) => prev.map((s, k) => (k === i ? { ...s, radius: r } : s)))

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'same rule as the next slide — combine the VECTORS',
        'nothing is solved here',
        '⟨P,P⟩ = 0 ⟺ every sphere on the curve is a POINT',
      ]}
      readouts={[
        {
          label: 'null defect  max |⟨P,P⟩/w²|',
          value: defect.toExponential(1),
          tone: defect < 1e-6 ? ('ok' as const) : ('warn' as const),
        },
        { label: 'biggest sphere on the curve', value: biggest.toFixed(3) },
        { label: 'imaginary probes', value: `${imaginary} of ${PROBES.length}` },
        { label: 'conditions', value: 'none' },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          {S.map((s, i) => (
            <label key={i} className="flex items-center gap-1">
              <span className="text-slate-400">ρ{SUB[i]}</span>
              <input
                type="range"
                min={0}
                max={2.4}
                step={0.005}
                value={s.radius}
                onChange={(e) => setRadius(i, Number(e.target.value))}
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
          <b>The next slide&rsquo;s rule, with nothing imposed.</b> Same seven control spheres, same
          way of combining them — the five-number vectors are averaged and the centre and radius are
          read off the <i>result</i>. Only the conditions are gone.{' '}
          <b>It opens sitting exactly on the constraint</b>, so every sphere <i>on</i> the curve has
          radius zero and there is nothing to see but a curve. <b>Then move anything.</b> The spheres
          along the curve inflate — that is what the null condition was holding
          down, made visible by removing it.{' '}
          <b>And the radius does not average.</b> Separate two spheres of radius 0.7 and the sphere
          between them goes 0.633, 0.490, <b>0.000</b>, −0.714, −1.327 as the gap grows 0.6, 1.0,{' '}
          <b>1.4</b>, 2.0, 3.0 — through zero exactly where the two are <b>tangent</b>, and out into{' '}
          <i>imaginary</i> beyond. So <i>⟨P,P⟩ = 0</i> is not an equation to admire: it is{' '}
          <b>keep every sphere at that crossing point, at every t at once</b>, which is why the next
          slide needs a solver and why its control spheres are large and far apart.{' '}
          <span className="text-slate-400">
            Two <i>point</i>-spheres a unit apart already fail it — the sphere between them has
            radius² = −0.25. Points do not interpolate to points. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the control spheres — the scaffold */}
      {S.flatMap((s, i) =>
        greatCircles(s.centre, s.radius).map((ring, j) => (
          <Curve3D key={`ctl${i}-${j}`} points={ring} color={FIG.color.controlPolygon} width={1} />
        )))}
      <Curve3D points={S.map((s) => tri(s.centre))} color={FIG.color.controlPolygon} width={1} dashed />

      {/* the spheres ON the curve — invisible while the constraint holds, ballooning once it does not */}
      {probes.flatMap((p, i) =>
        greatCircles(p.centre, p.radius).map((ring, j) => (
          <Curve3D key={`probe${i}-${j}`} points={ring} color={FIG.color.derived} width={1.4} />
        )))}

      <Curve3D points={spine} color={FIG.color.curve} width={3} />

      {S.map((s, i) => (
        <DragPoint3D
          key={`c${i}`}
          position={tri(s.centre)}
          color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.05}
          onDragStart={() => setGrabbed(i)}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => setCentre(i, { x, y, z })}
        />
      ))}
    </Figure3D>
  )
}
