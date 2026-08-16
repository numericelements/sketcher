// ============================================================================
// TWO SPHERES — the smallest case, and the one where the whole mechanism is visible.
//
// Degree ONE. Two control spheres, and the family between them: P(t) = (1−t)C₀ + tC₁ in ℝ^{4,1}.
// Classically this is a PENCIL of spheres, and everything the bigger figures do is already here.
//
// WHAT HAPPENS AS YOU PULL THEM APART (measured, canalSphereSpline.test.ts, radius 0.7 each):
//
//     gap        0.8      1.2      1.4      2.0      3.0
//     mid ρ    0.574    0.361    0.000   −0.714   −1.327
//     points     —        —      t=½     0.143, 0.857    0.058, 0.942
//
//   OVERLAPPING   every sphere between them is real — the pencil through their common circle
//   TANGENT       the middle sphere is a POINT. The bifurcation, at gap = 2ρ exactly
//   SEPARATED     TWO point-spheres, and everything between them is IMAGINARY
//
// The two point-spheres are the pencil's classical LIMIT POINTS. They are born at the centre when
// the spheres touch and walk outwards as the gap grows.
//
// AND THE PUNCHLINE, which only degree 1 can deliver. ⟨P,P⟩ ≡ 0 asks EVERY member to be a point.
// Here that means ⟨C₀,C₀⟩ = ⟨C₀,C₁⟩ = ⟨C₁,C₁⟩ = 0 — both control spheres are points, and two
// point-spheres are orthogonal only when they COINCIDE. So:
//
//     THE ONLY NULL CURVE OF DEGREE 1 IS A SINGLE STATIONARY POINT.
//
// You cannot draw a segment of points this way. Points do not interpolate to points. That is why the
// constrained figure needs SEVEN control spheres and why they are large and far apart: a curve of
// points has to be bought with degree, and the scaffold pays for it.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale, vsub } from '../../core/quaternion'
import {
  type ControlSphere, type SphereSpline,
  conformalOf, conformalSphereAt, pointSphereParameters,
} from '../../core/canalSphereSpline'
import { innerProduct } from '../../core/conformal'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const RING = 44
/** Where the pencil is sampled. Odd, so t = ½ is one of them. */
const PROBES = Array.from({ length: 17 }, (_, k) => k / 16)

/** Overlapping to start: gap 0.8 against radii 0.7, so every member is real. */
const SEED: ControlSphere[] = [
  { centre: { x: -0.4, y: 0, z: 0 }, radius: 0.7, weight: 1 },
  { centre: { x: 0.4, y: 0, z: 0 }, radius: 0.7, weight: 1 },
]

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

const BOUNDS = {
  min: [-3.2, -2.0, -2.0] as [number, number, number],
  max: [3.2, 2.0, 2.0] as [number, number, number],
}

export default function SpherePencilFigure() {
  const [S, setS] = useState<ControlSphere[]>(SEED)
  const [grabbed, setGrabbed] = useState<number | null>(null)

  const spline: SphereSpline = useMemo(() => ({ S }), [S])
  const probes = useMemo(() => PROBES.map((t) => conformalSphereAt(spline, t)), [spline])
  const limits = useMemo(() => pointSphereParameters(spline), [spline])

  /** ⟨C₀,C₁⟩ = ½(ρ₀² + ρ₁² − |c₀−c₁|²): the sign IS the relation between the two spheres. */
  const pairing = useMemo(() => innerProduct(conformalOf(S[0]), conformalOf(S[1])), [S])
  const gap = vnorm(vsub(S[1].centre, S[0].centre))
  const midRadius = conformalSphereAt(spline, 0.5).radius
  const imaginary = probes.filter((p) => p.radius < 0).length

  const relation = pairing > 1e-9 ? 'overlapping' : pairing < -1e-9 ? 'separated' : 'ORTHOGONAL'

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 400 }}
      notation={[
        'P(t) = (1−t)C₀ + tC₁   — degree ONE',
        '⟨C₀,C₁⟩ = ½(ρ₀² + ρ₁² − |c₀−c₁|²)',
        'a point ⟺ ⟨P,P⟩ = 0',
      ]}
      readouts={[
        { label: 'gap between centres', value: gap.toFixed(3) },
        { label: '⟨C₀,C₁⟩', value: `${pairing.toFixed(3)} — ${relation}` },
        {
          label: 'middle sphere',
          value: midRadius.toFixed(3),
          tone: midRadius >= 0 ? ('ok' as const) : ('warn' as const),
        },
        {
          label: 'point-spheres at t',
          value: limits.length ? limits.map((t) => t.toFixed(3)).join(', ') : 'none',
        },
        { label: 'imaginary samples', value: `${imaginary} of ${PROBES.length}` },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          {S.map((s, i) => (
            <label key={i} className="flex items-center gap-1">
              <span className="text-slate-400">ρ{i === 0 ? '₀' : '₁'}</span>
              <input
                type="range"
                min={0}
                max={1.6}
                step={0.005}
                value={s.radius}
                onChange={(e) => setS((p) => p.map((v, k) => (k === i ? { ...v, radius: Number(e.target.value) } : v)))}
                className="w-24"
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
          <b>Two spheres, and everything between them.</b> This is the same rule as the next two
          slides with the fewest possible pieces: <i>P(t) = (1−t)C₀ + tC₁</i>. Classically it is a{' '}
          <b>pencil</b> of spheres, and the whole mechanism is already here.{' '}
          <b>Pull them apart and watch the middle.</b> While they <b>overlap</b>, every sphere between
          them is real. At the moment they become <b>tangent</b> the middle one shrinks to a{' '}
          <b>point</b>. Past that, <i>two</i> point-spheres appear and walk outwards, and everything
          between them is <b>imaginary</b> — drawn as nothing, because there is nothing there. Those
          two are the pencil&rsquo;s classical <b>limit points</b>.{' '}
          <b>And now the punchline.</b> The next slides ask that <i>every</i> sphere on the curve be a
          point. Here that forces both control spheres to be points and to be orthogonal — and two
          points are orthogonal only if they are the <b>same point</b>.{' '}
          <span className="text-slate-400">
            So the only curve of points you can make with two control spheres is a single stationary
            point. Points do not interpolate to points. A curve of points must be bought with{' '}
            <i>degree</i> — which is why the constrained figure needs seven control spheres, and why
            they are large and far apart. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the pencil — absent where imaginary */}
      {probes.flatMap((p, i) =>
        greatCircles(p.centre, p.radius).map((ring, j) => (
          <Curve3D key={`p${i}-${j}`} points={ring} color={FIG.color.derived} width={1} />
        )))}

      {/* the two control spheres, heavier */}
      {S.flatMap((s, i) =>
        greatCircles(s.centre, s.radius).map((ring, j) => (
          <Curve3D key={`c${i}-${j}`} points={ring} color={FIG.color.controlPolygon} width={1.8} />
        )))}
      <Curve3D points={S.map((s) => tri(s.centre))} color={FIG.color.controlPolygon} width={1} dashed />

      {/* the limit points — where the pencil passes through a POINT */}
      {limits.map((t, i) => (
        <Point3D
          key={`lim${i}`}
          position={tri(conformalSphereAt(spline, t).centre)}
          color={FIG.color.curve}
          radius={0.07}
        />
      ))}

      {S.map((s, i) => (
        <DragPoint3D
          key={`d${i}`}
          position={tri(s.centre)}
          color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.06}
          onDragStart={() => setGrabbed(i)}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => setS((p) => p.map((v, k) => (k === i ? { ...v, centre: { x, y, z } } : v)))}
        />
      ))}
    </Figure3D>
  )
}
