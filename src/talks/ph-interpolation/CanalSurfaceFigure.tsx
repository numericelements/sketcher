// ============================================================================
// THE UNCONSTRAINED OBJECT — a curve of SPHERES, and the tube it sweeps.
//
// This is the only figure in either deck where nothing is constrained and nothing is solved. Every
// number on screen is arithmetic on the control spheres, so it drags at frame rate and loads
// instantly — which is exactly why it comes BEFORE the slide that imposes two conditions at once.
//
// WHAT IS DRAGGABLE, and the contrast with slide 11 is deliberate:
//
//   centres   3-D drag        a genuine 3-D object
//   radii     SLIDERS         a scalar is not a place — the lesson slide 11 paid for
//   weights   FARIN BEADS     and here they ARE handles. Nothing competes for those dimensions in
//                             the unconstrained family. On slide 11 the same beads are a READOUT,
//                             because the four dials had already spent the slice.
//
// TWO THINGS THE AUDIENCE CAN BREAK, which is the point of going first:
//
//   |ċ|² − ρ̇² ≤ 0   the envelope does not exist. Pull a radius faster than its centre moves and the
//                    characteristic circles stop being drawn — not clamped, ABSENT.
//   ρκ > 1          the envelope exists and self-intersects. A different failure, and the one people
//                    meet in practice when they inflate a canal surface.
//
// AND THE BEADS ARE COUPLED, honestly: setting wₖ₊₁ from bead k moves bead k+1 too, because they
// share a weight. That is what a Farin bead is, and there is no solver here to hide it.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// Everything it draws is pinned in core/__tests__/canalSphereSpline.test.ts against a cylinder, a
// cone and a torus.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale, vsub } from '../../core/quaternion'
import {
  type ControlSphere, type SphereSpline,
  characteristicCircle, envelopeTest, pinchTest, sphereAt, worstOver,
} from '../../core/canalSphereSpline'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const RING = 40
const ENVELOPE_SAMPLES = 36

/** Six control spheres: a gentle arc with a radius that swells and falls. Embedded, envelope real. */
const SEED: ControlSphere[] = [
  { centre: { x: -1.7, y: -0.45, z: 0.0 }, radius: 0.30, weight: 1 },
  { centre: { x: -1.0, y: 0.45, z: 0.30 }, radius: 0.46, weight: 1 },
  { centre: { x: -0.2, y: 0.70, z: -0.20 }, radius: 0.56, weight: 1 },
  { centre: { x: 0.55, y: 0.30, z: 0.40 }, radius: 0.46, weight: 1 },
  { centre: { x: 1.15, y: -0.40, z: 0.05 }, radius: 0.36, weight: 1 },
  { centre: { x: 1.80, y: -0.35, z: -0.30 }, radius: 0.26, weight: 1 },
]

/** A sphere drawn as three great circles — a solid one would bury the tube it is explaining. */
function greatCircles(centre: Vec3, radius: number): [number, number, number][][] {
  const r = Math.abs(radius)
  if (!(r > 1e-6)) return []
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

/** A circle in the plane perpendicular to `axis`. */
function ringAt(centre: Vec3, radius: number, axis: Vec3): [number, number, number][] {
  const seed = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
  const u = vscale(vcross(axis, seed), 1 / vnorm(vcross(axis, seed)))
  const v = vcross(axis, u)
  return Array.from({ length: RING + 1 }, (_, k) => {
    const a = (2 * Math.PI * k) / RING
    return tri(vadd(centre, vadd(vscale(u, radius * Math.cos(a)), vscale(v, radius * Math.sin(a)))))
  })
}

const BOUNDS = (() => {
  const pts: Vec3[] = []
  for (const s of SEED) {
    for (const d of [-1, 1]) {
      pts.push({ x: s.centre.x + d * s.radius, y: s.centre.y + d * s.radius, z: s.centre.z + d * s.radius })
    }
  }
  const pad = 0.5
  const axis = (f: (p: Vec3) => number): [number, number] =>
    [Math.min(...pts.map(f)) - pad, Math.max(...pts.map(f)) + pad]
  const [x0, x1] = axis((p) => p.x), [y0, y1] = axis((p) => p.y), [z0, z1] = axis((p) => p.z)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

const SUB = '₀₁₂₃₄₅'

export default function CanalSurfaceFigure() {
  const [S, setS] = useState<ControlSphere[]>(SEED)
  const [grabbed, setGrabbed] = useState<{ kind: 'centre' | 'bead'; index: number } | null>(null)
  const [showSpheres, setShowSpheres] = useState(true)

  const spline: SphereSpline = useMemo(() => ({ S }), [S])

  const spine = useMemo(
    () => Array.from({ length: 121 }, (_, k) => tri(sphereAt(spline, k / 120).centre)),
    [spline],
  )

  /** The envelope, as the characteristic circles. Absent where there is no envelope — not clamped. */
  const envelope = useMemo(() => {
    const out: [number, number, number][][] = []
    for (let k = 0; k <= ENVELOPE_SAMPLES; k++) {
      const cc = characteristicCircle(spline, k / ENVELOPE_SAMPLES)
      if (cc) out.push(ringAt(cc.centre, cc.radius, cc.axis))
    }
    return out
  }, [spline])

  /** Fᵢ = (wᵢcᵢ + wᵢ₊₁cᵢ₊₁)/(wᵢ + wᵢ₊₁) — the weights, one bead per leg. */
  const beads = useMemo(
    () => S.slice(0, -1).map((s, i) => {
      const n = S[i + 1]
      const sum = s.weight + n.weight
      return vscale(vadd(vscale(s.centre, s.weight), vscale(n.centre, n.weight)), 1 / sum)
    }),
    [S],
  )

  const minEnvelope = useMemo(() => worstOver(spline, envelopeTest), [spline])
  const maxPinch = useMemo(() => worstOver(spline, pinchTest, 96, 'max'), [spline])
  const minRadius = useMemo(
    () => worstOver(spline, (sp, t) => sphereAt(sp, t).radius),
    [spline],
  )

  const setCentre = (i: number, c: Vec3): void =>
    setS((prev) => prev.map((s, k) => (k === i ? { ...s, centre: c } : s)))
  const setRadius = (i: number, r: number): void =>
    setS((prev) => prev.map((s, k) => (k === i ? { ...s, radius: r } : s)))
  /** Slide bead i along its leg: the position IS the weight ratio wᵢ₊₁/(wᵢ + wᵢ₊₁). */
  const setBead = (i: number, s01: number): void =>
    setS((prev) => {
      const t = Math.min(0.88, Math.max(0.12, s01))
      return prev.map((s, k) => (k === i + 1 ? { ...s, weight: (prev[i].weight * t) / (1 - t) } : s))
    })

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'a control point IS a sphere: centre, radius, weight',
        'envelope ⟺ |ċ|² > ρ̇²',
        'circle: c − (ρρ̇/|ċ|²)ċ,  radius ρ√(1−ρ̇²/|ċ|²)',
      ]}
      readouts={[
        {
          label: 'envelope  |ċ|² − ρ̇²',
          value: minEnvelope.toFixed(3),
          tone: minEnvelope > 0 ? ('ok' as const) : ('warn' as const),
        },
        {
          label: 'pinch  ρκ',
          value: maxPinch.toFixed(3),
          tone: maxPinch < 1 ? ('ok' as const) : ('warn' as const),
        },
        { label: 'min radius', value: minRadius.toFixed(3) },
        { label: 'spheres', value: `${S.length}, degree ${S.length - 1}` },
        { label: 'conditions', value: 'none' },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          {S.map((s, i) => (
            <label key={i} className="flex items-center gap-1">
              <span className="text-slate-400">ρ{SUB[i]}</span>
              <input
                type="range"
                min={-0.2}
                max={1.4}
                step={0.005}
                value={s.radius}
                onChange={(e) => setRadius(i, Number(e.target.value))}
                className="w-16"
              />
            </label>
          ))}
          <button
            onClick={() => setShowSpheres((v) => !v)}
            className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100"
          >
            {showSpheres ? 'hide spheres' : 'show spheres'}
          </button>
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
          <b>Nothing here is constrained.</b> A control point is a <b>sphere</b> — centre, radius,
          weight — and all three are yours. What you get is not a curve: a one-parameter family of
          spheres has an <b>envelope</b>, and the envelope is a <b>canal surface</b>, drawn here as
          the circles along which each sphere touches it. In the plane the same object is the{' '}
          <i>medial axis transform</i>, a shape given by the discs that fill it.{' '}
          <b>Two things you can break by dragging.</b> Pull a radius faster than its centre moves and{' '}
          <i>|ċ|² − ρ̇²</i> goes negative — the square root is imaginary and the envelope simply{' '}
          <b>stops existing</b>. Or inflate it until <i>ρκ</i> passes 1 and the tube self-intersects:
          a different failure, and the one you meet in practice.{' '}
          <span className="text-slate-400">
            That first quantity is the squared speed of the spine in <i>Minkowski</i> space, so asking
            the envelope to be rational is a Pythagorean condition in <i>that</i> metric — MPH, canal
            surfaces, offsets. It is not the condition the next slide imposes; the two are invariants
            of two different subgroups of one Lie sphere group. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the control spheres */}
      {showSpheres
        && S.flatMap((s, i) =>
          greatCircles(s.centre, s.radius).map((ring, j) => (
            <Curve3D key={`sph${i}-${j}`} points={ring} color={FIG.color.controlPolygon} width={1} />
          )))}

      {/* the envelope: absent wherever it does not exist */}
      {envelope.map((ring, i) => (
        <Curve3D key={`env${i}`} points={ring} color={FIG.color.curve} width={1.6} />
      ))}

      {/* the spine — the centres, and the polygon they come from */}
      <Curve3D points={S.map((s) => tri(s.centre))} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={spine} color={FIG.color.derived} width={2} />

      {/* the weights, one bead per leg */}
      {beads.map((b, i) => (
        <DragPoint3D
          key={`bead${i}`}
          position={tri(b)}
          color={grabbed?.kind === 'bead' && grabbed.index === i ? FIG.color.dataPointDrag : FIG.color.derived}
          radius={0.03}
          onDragStart={() => setGrabbed({ kind: 'bead', index: i })}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            const a = S[i].centre, c = S[i + 1].centre
            const leg = vsub(c, a)
            const len2 = leg.x * leg.x + leg.y * leg.y + leg.z * leg.z
            if (len2 === 0) return
            const rel = vsub({ x, y, z }, a)
            setBead(i, (rel.x * leg.x + rel.y * leg.y + rel.z * leg.z) / len2)
          }}
        />
      ))}

      {/* the centres */}
      {S.map((s, i) => (
        <DragPoint3D
          key={`c${i}`}
          position={tri(s.centre)}
          color={grabbed?.kind === 'centre' && grabbed.index === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
          radius={0.05}
          onDragStart={() => setGrabbed({ kind: 'centre', index: i })}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => setCentre(i, { x, y, z })}
        />
      ))}
    </Figure3D>
  )
}
