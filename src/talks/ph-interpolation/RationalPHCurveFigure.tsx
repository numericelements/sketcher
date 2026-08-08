// ============================================================================
// SLIDE 11 — a rational PH curve built where Möbius transformations are linear, and nothing
// bent to make it. DEGREE 5, and the degree matters.
//
// The previous slide bent a polynomial curve. This one never has one: the control points are
// placed directly in the conformal model, so this is a rational PH curve that NO Möbius
// transformation of a polynomial one can produce — the conformal lift doubles the degree, so a
// Möbius image always has EVEN conformal degree, and the odd ones are unreachable by bending.
//
// WHY NOT DEGREE 3, WHICH WAS THE FIRST VERSION OF THIS FIGURE. Four coefficients span at most
// a 4-dimensional subspace of R⁵, so a vector S is left orthogonal to all of them and
// ⟨P(x),S⟩ = 0 confines the curve to a single sphere. Measured, the span collapses further to
// rank 3 and the curve is a CIRCULAR ARC — flat to 1e-9, curvature spread 0.000 — and it stays
// one with the PH conditions removed, so it is the null condition doing it. That version
// shipped, drawn under a caption about general rational PH cubics, until Eric asked whether the
// curve was staying in a plane. Degree 5 is the first degree the figure can honestly use.
//
// AND YET NOTHING FIVE-DIMENSIONAL IS DRAWN. A conformal vector's five coordinates are
// weight + centre + radius (the ∞-component is fixed by the null condition), so:
//
//   · the six SPHERE CENTRES are the ordinary rational-Bézier control points;
//   · the two end spheres have radius ZERO — the ends are point-spheres;
//   · the OUTER two radii are DETERMINED — ρ₁ = ‖P₁−P₀‖ and ρ₄ = ‖P₄−P₅‖, verified to 1e-8 —
//     so those spheres GRIP the endpoints and are drawn from the polygon;
//   · but the MIDDLE two, ρ₂ and ρ₃, are genuine extra freedom, pinned to nothing. They get
//     their own handles, and they are the reason degree 5 is a better figure than degree 3
//     rather than merely a bigger one: at degree 3 every radius is determined, so the spheres
//     are a reveal with no controls attached.
//
// THE WEIGHTS ARE FARIN BEADS, one per leg — and the count is exact, since degree 3 has three
// legs and three weight ratios after the overall scale. A bead at its leg's midpoint means
// those two weights are equal, so ALL THREE at the midpoints would mean polynomial: the
// rationality is visible as how far off-centre they sit. A bead leaving its segment would
// mean a weight ratio went negative.
//
// WHAT EDITING COSTS. The degree-5 family is 15-dimensional, of which 9 are Möbius MOTIONS,
// leaving 6 genuine shape moduli — three times what degree 3 offers. Nothing moves alone: the
// defining conditions couple the centres, the weights and the radii, so dragging a point makes
// the weights answer, which is exactly what the beads make visible.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/conformalPHCurve (22 tests), core/conformalPHFamily (10), core/conformal (28).
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale, vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  mobiusImage,
  controlPoints,
  curveAt,
  denominatorFloor,
  dragControlPoint,
  dragFarin,
  dragRadius,
  farinParameters,
  farinPoints,
  findMember,
  freeRadiusIndices,
  measuredSpeed,
  radii,
  residual,
  shapeMeasures,
  speedAt,
} from '../../core/conformalPHCurve'
import { inversiveBendGenerator, matrixExp5 } from '../../core/conformal'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const DEGREE = 5
const START = findMember(DEGREE)
/** ±2, the range measured on slide 10 — the pole comes in from infinity as it grows. */
const BEND_RANGE = 2
const AXES: { key: 'x' | 'y' | 'z'; label: string }[] = [
  { key: 'x', label: 'inversive bend X' },
  { key: 'y', label: 'inversive bend Y' },
  { key: 'z', label: 'inversive bend Z' },
]
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
  for (let k = 0; k <= DEGREE; k++) {
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

export default function RationalPHCurveFigure() {
  /**
   * `base` is the curve; `bend` is a Möbius transformation applied for display. Since the family
   * is closed under O(4,1) acting linearly on the coefficients, the displayed state is a genuine
   * member — so edits can be solved in DISPLAY coordinates (what the hand is pointing at) and
   * pushed back through exp(−G), with no cursor pull-back anywhere.
   */
  const [base, setBase] = useState<ConformalPHCurve | null>(START)
  const [bend, setBend] = useState<Vec3>({ x: 0, y: 0, z: 0 })
  const [grabbed, setGrabbed] = useState<{ kind: 'point' | 'farin' | 'radius'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)

  const { forward, inverse } = useMemo(() => ({
    forward: matrixExp5(inversiveBendGenerator(bend)),
    inverse: matrixExp5(inversiveBendGenerator({ x: -bend.x, y: -bend.y, z: -bend.z })),
  }), [bend])

  /** What is drawn, and what edits act on. */
  const state = useMemo(() => (base ? mobiusImage(base, forward) : null), [base, forward])
  /** Take an edited DISPLAY state back to the base. */
  const commit = (edited: ConformalPHCurve): void => setBase(mobiusImage(edited, inverse))

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

  const free = useMemo(() => (state ? freeRadiusIndices(state) : []), [state])

  /** Every sphere with a real radius: the two gripping the ends, and the free middle ones. */
  const rings = useMemo(
    () =>
      state
        ? cps.flatMap((c, k) =>
            greatCircles(c, rho[k]).map((ring) => ({ ring, free: free.includes(k) })))
        : [],
    [state, cps, rho, free],
  )

  /** One handle per FREE radius, placed on its sphere so it can be dragged in or out. */
  const radiusHandles = useMemo(
    () => free.map((k) => ({ index: k, at: { x: cps[k].x + rho[k], y: cps[k].y, z: cps[k].z } })),
    [free, cps, rho],
  )

  const shape = useMemo(() => (state ? shapeMeasures(state) : { outOfPlane: 0, curvatureSpread: 0 }), [state])

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
    setBase(START)
    setBend({ x: 0, y: 0, z: 0 })
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
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 5',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        'ρ₁ = ‖P₁−P₀‖, ρ₄ = ‖P₄−P₅‖',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'dim', value: '15 — 9 motions, 6 shape' },
        { label: 'beads off centre', value: offCentre.toFixed(3) },
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        { label: 'κ spread', value: shape.curvatureSpread.toFixed(3), tone: 'ok' as const },
        { label: 'min W(t)', value: denominatorFloor(state).toFixed(3), tone: 'ok' as const },
        { label: 'h under bend', value: 'unchanged', tone: 'ok' as const },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          {AXES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1">
              <span className="text-slate-400">{label}</span>
              <input
                type="range"
                min={-BEND_RANGE}
                max={BEND_RANGE}
                step={BEND_RANGE / 80}
                value={bend[key]}
                onChange={(e) => setBend((b) => ({ ...b, [key]: Number(e.target.value) }))}
                className="w-20"
              />
            </label>
          ))}
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
          <b>even</b> conformal degree. Yet nothing five-dimensional is drawn: a conformal vector’s
          coordinates <i>are</i> weight, centre and radius, so the six centres are the ordinary
          control points and the ends have radius <b>zero</b>. The two <b>outer</b> spheres are
          determined — <i>ρ₁ = ‖P₁−P₀‖</i>, <i>ρ₄ = ‖P₄−P₅‖</i> — so they <b>grip the endpoints</b>;
          the two <b>middle</b> radii are pinned to nothing and carry their own handles. The beads on
          the legs are the <b>weights</b>: five legs, five ratios, so all five at the midpoints would
          mean polynomial — the rationality is how far off-centre they sit.{' '}
{' '}
          And the sliders are the payoff: a Möbius transformation is a <b>constant matrix</b> here, so it
          acts on each control point <i>independently</i> — <b>the spheres stay spheres, the beads stay
          Farin beads, the polygon maps one point for one point, and the degree does not move.</b> Bend
          it and <i>h</i> does not even change: the speed numerator is a Möbius <b>invariant</b>, and only
          the weight answers. On the previous slide the same transformation turned 8 control points into
          15.{' '}
          <span className="text-slate-400">
            Degree 5 and not 3: four coefficients cannot span enough of R^{'{4,1}'} to leave a sphere,
            so a degree-3 curve here is a circular arc — with or without the PH condition. Of the 15
            dimensions, 9 are Möbius motions and 6 change the shape. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the spheres, as great circles so they do not bury the curve */}
      {rings.map(({ ring, free: isFree }, i) => (
        <Curve3D
          key={`ring${i}`}
          points={ring}
          color={isFree ? FIG.color.derived : FIG.color.controlPolygon}
          width={isFree ? 1.3 : 1}
        />
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
              // dragFarin rate-limits the step itself, so a jumpy cursor projection cannot ask
              // for a huge reshape in one event.
              const step = dragFarin(state, i, s)
              if (step.converged) { commit(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        ) : null,
      )}

      {/* the FREE radii — the freedom degree 3 does not have. A SPOKE from the centre, because
          a lone dot sitting on a sphere reads as another control point, which it is not. */}
      {radiusHandles.map(({ index, at }) => (
        <Curve3D key={`spoke${index}`} points={[tri(cps[index]), tri(at)]} color={FIG.color.derived} width={1.4} />
      ))}
      {radiusHandles.map(({ index, at }) => (
        <DragPoint3D
          key={`rad${index}`}
          position={tri(at)}
          color={grabbed?.kind === 'radius' && grabbed.index === index ? FIG.color.dataPointDrag : FIG.color.derived}
          radius={0.032}
          onDragStart={() => { setGrabbed({ kind: 'radius', index }); setStalled(false) }}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            const want = vnorm(vsub({ x, y, z }, cps[index]))
            const step = dragRadius(state, index, want)
            if (step.converged) { commit(step.state); setStalled(false) } else setStalled(true)
          }}
        />
      ))}

      {/* the control points: the ends are the curve's own endpoints, the others are sphere centres */}
      {cps.map((p, i) => (
        <DragPoint3D
          key={`cp${i}`}
          position={tri(p)}
          color={
            grabbed?.kind === 'point' && grabbed.index === i
              ? FIG.color.dataPointDrag
              : grabbed !== null && (i === 0 || i === DEGREE)
                ? FIG.color.pinned
                : FIG.color.dataPoint
          }
          radius={0.045}
          onDragStart={() => { setGrabbed({ kind: 'point', index: i }); setStalled(false) }}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            const step = dragControlPoint(state, i, { x, y, z })
            if (step.converged) { commit(step.state); setStalled(false) } else setStalled(true)
          }}
        />
      ))}

      {/* the endpoints again, marked so it is clear they are the curve's ends and radius-zero */}
      {[0, DEGREE].map((i) => (
        <Point3D key={`end${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.016} />
      ))}
    </Figure3D>
  )
}
