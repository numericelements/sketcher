// ============================================================================
// SLIDE 13 — the smallest rational PH curve that no bent polynomial can be, and the one dial
// that is left when the whole polygon is nailed down. DEGREE 4.
//
// WHY 4 AND NOT 5, which is what slides 11 and 12 use. Nullity is a polynomial identity,
// ‖q‖² = 2w·c∞, so at any real root of w the numerator vanishes too and (t−r) divides q, w and h
// alike. A real polynomial of ODD degree always has a real root, so every degree-5 member is a
// quartic in a quintic polygon — slides 11 and 12 draw genuine rational PH curves, but quartic
// ones. Even degree can keep w off the real axis, and this figure's member is guarded to do so
// (`irreducible`, and the readout shows the count).
//
// AND AT DEGREE 4 THE ARGUMENT FOR THIS WHOLE CONSTRUCTION IS AT ITS SHARPEST. The conformal lift
// doubles the degree, so a Möbius image of a polynomial PH curve of degree d has conformal degree
// 2d; conformal 4 comes from a polynomial PH QUADRATIC, and a PH quadratic is a straight line
// (‖p′‖ = |at+b| forces p′ = (at+b)·u with u constant). So at this degree, bending a polynomial
// can only ever produce a CIRCLE OR A LINE — while the direct construction gives 13 dimensions of
// genuinely spatial curves, measured here at curvature spread 0.39 and out-of-plane 0.05. That is
// a qualitative gap, not the comparison of two dimension counts that degree 6 offers.
//
// THE TWO MODES, and the surprise is in the first one.
//
//   STRICT holds the four outer control points, which is 12 conditions on a 13-dimensional family
//   and leaves exactly ONE. Eric asked for that dial to move the middle control point — and it
//   cannot. Measured: project each of the three "push P₂ this way" directions onto the nullspace of
//   the defining rows plus the four pins and all three return the same tangent (as a
//   one-dimensional family must), carrying ‖δP₂‖ = 1e-6 against ‖δ‖ = 1 while every WEIGHT moves by
//   0.1–0.5. So the dial is a weight dial, and the slide is better for it: the ENTIRE 3D control
//   polygon is frozen, every point of it, and a one-parameter family of distinct rational PH curves
//   still runs through it. The beads slide, the curve changes, the polygon does not move (verified:
//   1e-15). The polynomial curve through that polygon is the single member with every bead at its
//   midpoint.
//
//   FREE holds only the two ends, so an interior point drags and the rest answers — the gesture
//   from slides 9 and 11.
//
// WHERE THE DIAL ENDS. Both ways, the weights run to a degeneration: w₀, w₁ and w₄ all go to zero
// relative to w₂, so the beads pin to the ends of their legs. The wall is asymptotic — a
// continuation crawled 16000 steps without arriving — so the slider slows to a stop rather than
// snapping, and the curve is a member the whole way.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// The numbers above are pinned in core/__tests__/conformalPHHopf.test.ts (19 tests).
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale, vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  controlPoints,
  curveAt,
  denominatorFloor,
  denominatorRealRoots,
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
  slideAlongFamily,
  speedAt,
} from '../../core/conformalPHCurve'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const DEGREE = 4
/** The four the strict mode holds — everything except the middle one. */
const OUTER = [0, 1, 3, 4]
/**
 * Guards read off a survey, and `irreducible` is the one that matters here: without it the solver
 * happily returns a member whose w has two real roots, which is a CONIC wearing a quartic polygon.
 */
const START = findMember(DEGREE, {
  irreducible: true,
  minOutOfPlane: 0.03,
  minCurvatureSpread: 0.3,
  minRadiusRatio: 0.05,
  minWeightRatio: 0.15,
  minSpanRatio: 0.3,
})
const CURVE_SAMPLES = 120
const RING_SAMPLES = 48

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** A sphere as three great circles: a solid one would bury the curve it is meant to explain. */
function greatCircles(centre: Vec3, radius: number): [number, number, number][][] {
  if (!(radius > 0)) return []
  const axes: Vec3[] = [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }]
  return axes.map((axis) => {
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
  for (let k = 0; k <= DEGREE; k++) {
    if (r[k] > 0) {
      for (const s of [-1, 1]) {
        pts.push({ x: pts[k].x + s * r[k], y: pts[k].y + s * r[k], z: pts[k].z + s * r[k] })
      }
    }
  }
  const pad = 0.3
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

/** The dial's readout: the first bead's place along its leg. One dial moves all four together. */
const dialOf = (s: ConformalPHCurve): number => farinParameters(s)[0]

export default function RationalPHQuarticFigure() {
  const [state, setState] = useState<ConformalPHCurve | null>(START)
  const [strict, setStrict] = useState(true)
  const [grabbed, setGrabbed] = useState<{ kind: 'point' | 'farin' | 'radius'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)
  const [atLimit, setAtLimit] = useState(false)
  /** What the slider was last asked for, so its handle never chases the measured value. */
  const [asked, setAsked] = useState<number>(START ? dialOf(START) : 0.5)

  const cps = useMemo(() => (state ? controlPoints(state) : []), [state])
  const rho = useMemo(() => (state ? radii(state) : []), [state])
  const beads = useMemo(() => (state ? farinPoints(state) : []), [state])
  const lambdas = useMemo(() => (state ? farinParameters(state) : []), [state])
  const free = useMemo(() => (state ? freeRadiusIndices(state) : []), [state])

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
    () => (state ? cps.flatMap((c, k) => greatCircles(c, rho[k]).map((ring) => ({ ring, free: free.includes(k) }))) : []),
    [state, cps, rho, free],
  )
  const radiusHandles = useMemo(
    () => free.map((k) => ({ index: k, at: { x: cps[k].x + rho[k], y: cps[k].y, z: cps[k].z } })),
    [free, cps, rho],
  )

  const shape = useMemo(() => (state ? shapeMeasures(state) : { outOfPlane: 0, curvatureSpread: 0 }), [state])
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
  const defect = useMemo(() => (state ? Math.max(...residual(state).map(Math.abs)) : NaN), [state])
  const offCentre = useMemo(
    () => (lambdas.length ? Math.max(...lambdas.map((v) => Math.abs(v - 0.5))) : 0),
    [lambdas],
  )

  /** Ride the dial towards `target`; slideAlongFamily rate-limits, so this takes several passes. */
  const ride = (target: number): void => {
    if (!state) return
    setAsked(target)
    let current = state
    let moved = false
    let limit = false
    for (let k = 0; k < 6; k++) {
      if (Math.abs(dialOf(current) - target) < 1e-6) break
      const step = slideAlongFamily(current, { pin: OUTER, readout: dialOf, target })
      if (!step.converged) { limit = true; break }
      if (Math.abs(dialOf(step.state) - dialOf(current)) < 1e-9) { limit = true; break }
      current = step.state
      moved = true
    }
    setAtLimit(limit)
    if (moved) { setState(current); setStalled(false) } else setStalled(true)
  }

  const reset = (): void => {
    setState(START)
    setGrabbed(null)
    setStalled(false)
    setAtLimit(false)
    setAsked(START ? dialOf(START) : 0.5)
  }

  if (!state) {
    return (
      <div className="text-sm text-slate-500">
        No irreducible degree-4 member found — every seed was rejected by the guards.
      </div>
    )
  }

  /** In strict mode the middle point has nowhere to go, so it is shown as a reveal, not a handle. */
  const frozen = (i: number): boolean => strict && i === 2

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 4',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        'strict: P₀, P₁, P₃, P₄ held — 12 of 13',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'real roots of w', value: `${denominatorRealRoots(state)} — genuinely quartic`, tone: 'ok' as const },
        { label: 'dim', value: strict ? '1 left of 13' : '13 — 9 motions, 4 shape' },
        { label: 'beads off centre', value: offCentre.toFixed(3) },
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        { label: 'κ spread', value: shape.curvatureSpread.toFixed(3), tone: 'ok' as const },
        { label: 'min W(t)', value: denominatorFloor(state).toFixed(3), tone: 'ok' as const },
        { label: 'dial', value: dialOf(state).toFixed(3) },
        {
          label: 'step',
          value: atLimit ? 'at the family’s limit' : stalled ? 'not reached' : '—',
        },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={strict} onChange={(e) => { setStrict(e.target.checked); setStalled(false); setAtLimit(false) }} />
            <span className="text-slate-400">strict — hold all four outer points</span>
          </label>
          {strict ? (
            <label className="flex items-center gap-1">
              <span className="text-slate-400">weight dial</span>
              <input
                type="range"
                min={0.05}
                max={0.95}
                step={0.005}
                value={asked}
                onChange={(e) => ride(Number(e.target.value))}
                className="w-32"
              />
            </label>
          ) : (
            <span className="text-slate-400">drag any point — the two ends stay put</span>
          )}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Freeze the whole polygon and there is still a family.</b> In <b>strict</b> mode all four
          outer control points are held — twelve conditions on a thirteen-dimensional family, so{' '}
          <b>one</b> dimension is left. It does <i>not</i> move the middle point: measured, that
          tangent carries ‖δP₂‖ = 1e-6 against ‖δ‖ = 1 while every <b>weight</b> moves by 0.1–0.5.
          So the dial slides the <b>beads</b>, every control point stays where it is to 1e-15, and the
          curve still changes shape. The <i>polynomial</i> curve through this polygon is the single
          member with every bead at its <b>midpoint</b>.{' '}
          <b>And nothing here can be made by bending.</b> The conformal lift doubles the degree, so a
          Möbius image of a polynomial PH curve of degree <i>d</i> lands at conformal degree 2<i>d</i> —
          degree 4 comes from a polynomial PH <b>quadratic</b>, which is a straight <b>line</b>. At this
          degree bending can only ever give a circle or a line; building directly here gives thirteen
          dimensions of spatial curves.{' '}
          <span className="text-slate-400">
            Degree 4 and not 5: nullity forces ‖q‖² = 2w·c∞, so at a real root of w the numerator
            vanishes too and the curve is secretly of lower degree — and an odd-degree w always has a
            real root. The readout shows this member has none. Untick strict to drag any point with
            only the ends held. The dial ends where w₀, w₁, w₄ all reach zero together and the beads
            pin to their leg ends; it slows to a stop rather than snapping. Drag the background to
            rotate.
          </span>
        </>
      }
    >
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

      {/* the Farin beads — the weights, and in strict mode the ONLY thing that moves */}
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
              if (strict) return           // in strict mode the dial drives all four together
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

      {/* the one free radius, with a spoke so the handle does not read as another control point */}
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
            if (strict) return
            const want = vnorm(vsub({ x, y, z }, cps[index]))
            const step = dragRadius(state, index, want)
            if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
          }}
        />
      ))}

      {cps.map((p, i) => (
        <DragPoint3D
          key={`cp${i}`}
          position={tri(p)}
          color={
            grabbed?.kind === 'point' && grabbed.index === i
              ? FIG.color.dataPointDrag
              : frozen(i) || (strict && grabbed !== null)
                ? FIG.color.pinned
                : FIG.color.dataPoint
          }
          radius={frozen(i) ? 0.034 : 0.045}
          onDragStart={() => { setGrabbed({ kind: 'point', index: i }); setStalled(false) }}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            // Strict mode: the middle point has nowhere to go, so it is not a handle at all — and
            // the other four hold each other rather than only the ends.
            if (frozen(i)) { setStalled(true); return }
            const step = strict
              ? dragControlPoint(state, i, { x, y, z }, { pin: OUTER })
              : dragControlPoint(state, i, { x, y, z }, { pinEnds: true })
            if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
          }}
        />
      ))}

      {[0, DEGREE].map((i) => (
        <Point3D key={`end${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.016} />
      ))}
    </Figure3D>
  )
}
