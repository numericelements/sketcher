// ============================================================================
// SLIDE 11 — a rational PH curve built where Möbius transformations are linear, and
// nothing bent to make it.
//
// The previous slide bent a polynomial curve. This one never has one: the control points are
// placed directly in the conformal model, so this is a rational PH curve that NO Möbius
// transformation of a polynomial one can produce — the conformal lift doubles the degree, so
// a Möbius image always has EVEN conformal degree, and degree 3 is unreachable by bending.
//
// AND YET NOTHING FIVE-DIMENSIONAL IS DRAWN. A conformal vector's five coordinates are
// weight + centre + radius (the ∞-component is fixed by the null condition), so:
//
//   · the four SPHERE CENTRES are the ordinary rational-Bézier control points;
//   · the two end spheres have radius ZERO — the ends are point-spheres;
//   · and the two interior radii are DETERMINED: ρ₁ = ‖P₁−P₀‖, ρ₂ = ‖P₂−P₃‖, verified to
//     1e-9. So each sphere is drawn from the polygon, with nothing stored.
//
// That last fact is why the figure can show both pictures at once and neither is a
// translation of the other: the spheres GRIP THE TWO ENDPOINTS, and PH-ness is a statement
// about how they relate to each other and to the chord.
//
// THE WEIGHTS ARE FARIN BEADS, one per leg — and the count is exact, since degree 3 has three
// legs and three weight ratios after the overall scale. A bead at its leg's midpoint means
// those two weights are equal, so ALL THREE at the midpoints would mean polynomial: the
// rationality is visible as how far off-centre they sit. A bead leaving its segment would
// mean a weight ratio went negative.
//
// WHAT EDITING COSTS. An ordinary rational cubic has 15 degrees of freedom; the PH ones have
// 11, measured — so PH is CODIMENSION 4 and a rational cubic you build by placing points and
// weights is essentially never PH. You cannot move anything alone: four of the sixteen
// numbers are spoken for, and dragging a point makes the weights answer, which is exactly
// what the beads make visible.
//
// The budget is thin on paper — 11, less 6 for the pinned ends, less 3 for the cursor, leaves
// 2 — and it works anyway: measured tracking 1e-16 with the defining conditions at 1e-13.
//
// ONE HONEST WARNING ON THE SLIDE. Of the 11 dimensions, 9 are Möbius MOTIONS and only 2
// change the shape, so a lot of what a drag does here is move the curve rather than reshape
// it. Pinning the ends helps, by freezing most of the motions. Shape diversity needs higher
// degree, and the counting says so: 2n−4 moduli.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/conformalPHCubic (13 tests), core/conformalPHFamily (10), core/conformal (28).
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale, vsub } from '../../core/quaternion'
import {
  type ConformalPHCubic,
  controlPoints,
  curveAt,
  denominatorFloor,
  dragControlPoint,
  dragFarin,
  farinParameters,
  farinPoints,
  findMember,
  measuredSpeed,
  radii,
  residual,
  speedAt,
} from '../../core/conformalPHCubic'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const START = findMember()
const CURVE_SAMPLES = 120
const RING_SAMPLES = 48

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/**
 * A sphere drawn as three great circles rather than a surface. A solid sphere would bury the
 * curve it is meant to explain, and the rings still read as one sphere because they share a
 * centre.
 */
function greatCircles(centre: Vec3, radius: number): [number, number, number][][] {
  if (!(radius > 0)) return []
  const axes: Vec3[] = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]
  return axes.map((axis) => {
    // any two unit vectors perpendicular to the axis
    const seed = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
    const u = vscale(vcross(axis, seed), 1 / vnorm(vcross(axis, seed)))
    const v = vcross(axis, u)
    return Array.from({ length: RING_SAMPLES + 1 }, (_, k) => {
      const a = (2 * Math.PI * k) / RING_SAMPLES
      return tri(vadd(centre, vadd(vscale(u, radius * Math.cos(a)), vscale(v, radius * Math.sin(a)))))
    })
  })
}

const BOUNDS = (() => {
  const fallback = {
    min: [-1.5, -1.5, -1.5] as [number, number, number],
    max: [1.5, 1.5, 1.5] as [number, number, number],
  }
  if (!START) return fallback
  const pts = [...controlPoints(START)]
  const r = radii(START)
  // include the spheres, or a big one leaves the frame
  for (let k = 0; k < 4; k++) {
    if (r[k] > 0) {
      for (const s of [-1, 1]) {
        pts.push({ x: pts[k].x + s * r[k], y: pts[k].y + s * r[k], z: pts[k].z + s * r[k] })
      }
    }
  }
  const pad = 0.35
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function RationalPHCubicFigure() {
  const [state, setState] = useState<ConformalPHCubic | null>(START)
  const [grabbed, setGrabbed] = useState<{ kind: 'point' | 'farin'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)

  const cps = useMemo(() => (state ? controlPoints(state) : []), [state])
  const rho = useMemo(() => (state ? radii(state) : []), [state])
  const beads = useMemo(() => (state ? farinPoints(state) : []), [state])
  const lambdas = useMemo(() => (state ? farinParameters(state) : []), [state])

  const curvePts = useMemo(() => {
    if (!state) return []
    const out: [number, number, number][] = []
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const p = curveAt(state, k / CURVE_SAMPLES)
      if (p) out.push(tri(p))
    }
    return out
  }, [state])

  const rings = useMemo(
    () => (state ? [1, 2].flatMap((k) => greatCircles(cps[k], rho[k])) : []),
    [state, cps, rho],
  )

  /** The PH claim, measured on the curve rather than read off h. */
  const speedError = useMemo(() => {
    if (!state) return 0
    let worst = 0
    for (const t of [0.15, 0.35, 0.5, 0.7, 0.85]) {
      const a = Math.abs(speedAt(state, t))
      const b = measuredSpeed(state, t)
      if (b > 0) worst = Math.max(worst, Math.abs(a - b) / b)
    }
    return worst
  }, [state])

  const defect = useMemo(
    () => (state ? Math.max(...residual(state).map(Math.abs)) : NaN),
    [state],
  )
  /** How far the beads sit from the midpoints — zero would be a polynomial curve. */
  const offCentre = useMemo(
    () => (lambdas.length ? Math.max(...lambdas.map((v) => Math.abs(v - 0.5))) : 0),
    [lambdas],
  )

  const reset = (): void => {
    setState(START)
    setGrabbed(null)
    setStalled(false)
  }

  if (!state) {
    return (
      <div className="text-sm text-slate-500">
        No non-degenerate member found — the guards in core/conformalPHCubic rejected every seed.
      </div>
    )
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        'ρ₁ = ‖P₁−P₀‖, ρ₂ = ‖P₂−P₃‖',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'dim', value: '11 of 15 — PH costs 4' },
        { label: 'beads off centre', value: offCentre.toFixed(3) },
        { label: 'min W(t)', value: denominatorFloor(state).toFixed(3), tone: 'ok' as const },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-400">
            drag a control point, or slide a bead along its leg
          </span>
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Nothing was bent to make this one.</b> The control points sit directly in the space where
          Möbius transformations are linear, and <i>no</i> Möbius image of a polynomial PH curve can be
          this curve — the conformal lift doubles the degree, so a bent curve always has{' '}
          <b>even</b> conformal degree, and degree three is out of reach. Yet nothing
          five-dimensional is drawn: a conformal vector’s coordinates <i>are</i> weight, centre and
          radius, so the four centres are the ordinary control points, the two ends have radius{' '}
          <b>zero</b>, and the two interior radii are <b>determined</b> —{' '}
          <i>ρ₁ = ‖P₁−P₀‖</i>, <i>ρ₂ = ‖P₂−P₃‖</i>. The spheres <b>grip the endpoints</b>, and being
          PH is a statement about how they stand to each other and to the chord. The beads on the legs
          are the <b>weights</b>: three legs, three ratios, so all three at the midpoints would mean
          polynomial — the rationality is how far off-centre they sit.{' '}
          <span className="text-slate-400">
            An ordinary rational cubic has 15 degrees of freedom and the PH ones have 11, so nothing
            moves alone: drag a point and the weights answer. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the spheres, as great circles so they do not bury the curve */}
      {rings.map((ring, i) => (
        <Curve3D key={`ring${i}`} points={ring} color={FIG.color.controlPolygon} width={1} />
      ))}

      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {/* the Farin beads — the weights, one per leg */}
      {beads.map((b, i) =>
        Number.isFinite(b.x) ? (
          <DragPoint3D
            key={`bead${i}`}
            position={tri(b)}
            color={grabbed?.kind === 'farin' && grabbed.index === i ? FIG.color.dataPointDrag : FIG.color.derived}
            radius={0.028}
            onDragStart={() => { setGrabbed({ kind: 'farin', index: i }); setStalled(false) }}
            onDragEnd={() => setGrabbed(null)}
            onDrag={([x, y, z]) => {
              // project the cursor onto the leg and slide the bead there — a pure weight edit
              const a = cps[i], b2 = cps[i + 1]
              const leg = vsub(b2, a)
              const len2 = leg.x * leg.x + leg.y * leg.y + leg.z * leg.z
              if (len2 === 0) { setStalled(true); return }
              const rel = vsub({ x, y, z }, a)
              const s = (rel.x * leg.x + rel.y * leg.y + rel.z * leg.z) / len2
              const step = dragFarin(state, i, s)
              if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        ) : null,
      )}

      {/* the four control points: the ends are the curve's own endpoints, the middle two are
          the sphere centres */}
      {cps.map((p, i) => (
        <DragPoint3D
          key={`cp${i}`}
          position={tri(p)}
          color={
            grabbed?.kind === 'point' && grabbed.index === i
              ? FIG.color.dataPointDrag
              : grabbed !== null && (i === 0 || i === 3)
                ? FIG.color.pinned
                : FIG.color.dataPoint
          }
          radius={0.045}
          onDragStart={() => { setGrabbed({ kind: 'point', index: i }); setStalled(false) }}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            const step = dragControlPoint(state, i, { x, y, z })
            if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
          }}
        />
      ))}

      {/* the endpoints again, marked so it is clear they are the curve's ends and radius-zero */}
      {[0, 3].map((i) => (
        <Point3D key={`end${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.016} />
      ))}
    </Figure3D>
  )
}
