// ============================================================================
// SLIDE 12 — the same pair of gestures as slides 4, 6, 7 and 8, now on a RATIONAL curve.
//
//   STRICT  pin the C¹ Hermite data and ride what is left. Twelve conditions against the
//           degree-5 family's fifteen, so THREE remain — rank 31 of 32, gap 2.5e8. Slide 7's
//           polynomial PH quintic has 14 before its data and 2 after, so RATIONALITY BUYS
//           EXACTLY ONE MORE DIMENSION at the same degree and the same data: the torus becomes
//           a 3-fold, and it takes three sliders instead of two dials.
//
//   FREE    drag any control point, or any Farin bead, with the ends held. Nine dimensions.
//
// WHAT THE THREE SLIDERS ARE, measured and not chosen for looks. Candidate quantities were added
// to the pinned system one at a time and the rank watched: {ρ₂, ρ₃, arc length} is a COMPLETE
// coordinate system — rank 34, freedom 0. So are {ρ₂, ρ₃, ⟨C₂,C₃⟩} and {L, λ₁, λ₂}. And one
// plausible triple is NOT: {ρ₂, ρ₃, λ₁} leaves freedom 1, because λ₁ is dependent on the two
// radii once the data is pinned. The two free radii were already handles on slide 11, and arc
// length rhymes with slide 7, where L turns out to depend on a single coordinate.
//
// ONE SLIDER AT A TIME, which is the reformulation that made this work at all. Prescribing all
// three leaves the system exactly determined with a projective kernel, and Newton stalls at a
// defect of 1e-6…1e-7 — the three coordinates were hit exactly while the defining conditions
// were not, which would have meant displaying one quantity and enforcing another. Prescribing
// only the slider you are touching leaves 2 spare dimensions and the defect returns to 1e-13.
//
// SO THE OTHER TWO READOUTS DRIFT while you move one. They are genuinely coupled by the defining
// conditions, so the drift is the truth; the sliders read the CURRENT values rather than holding
// their positions, which is why they are shown with their measured numbers beside them.
//
// AND STRICT MODE'S SECOND GESTURE: the four outer control points are draggable, which moves the
// DATA. But unlike slide 7 they are NOT the data — for a rational curve r′(0) = 5(w₁/w₀)(P₁−P₀)
// carries the weights too, so pinning the four points and pinning the Hermite data give different
// 3-folds of the same dimension. The figure pins the DATA, and says so.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// core/conformalPHCurve (32 tests).
// ============================================================================
import { type ReactElement, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vnorm, vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  type HermiteData,
  type StrictCoordinate,
  arcLength,
  controlPoints,
  curveAt,
  denominatorFloor,
  dragControlPoint,
  dragFarin,
  dragStrict,
  farinPoints,
  findMember,
  freeRadiusIndices,
  hermiteDataOf,
  moveToData,
  radii,
  residual,
} from '../../core/conformalPHCurve'
import Figure3D, { Curve3D, DragPoint3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const DEGREE = 5
const START = findMember(DEGREE)
const CURVE_SAMPLES = 120
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

type Mode = 'strict' | 'free'

const BOUNDS = (() => {
  if (!START) {
    return { min: [-1.5, -1.5, -1.5] as [number, number, number], max: [1.5, 1.5, 1.5] as [number, number, number] }
  }
  const pts = controlPoints(START)
  const pad = 0.6
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function StrictFreeRationalFigure() {
  const [state, setState] = useState<ConformalPHCurve | null>(START)
  const [mode, setMode] = useState<Mode>('strict')
  /** The pinned data in strict mode. Re-read whenever the outer points are dragged. */
  const [data, setData] = useState<HermiteData | null>(START ? hermiteDataOf(START) : null)
  const [grabbed, setGrabbed] = useState<string | null>(null)
  const [stalled, setStalled] = useState(false)

  const cps = useMemo(() => (state ? controlPoints(state) : []), [state])
  const beads = useMemo(() => (state ? farinPoints(state) : []), [state])
  const free = useMemo(() => (state ? freeRadiusIndices(state) : []), [state])
  const rho = useMemo(() => (state ? radii(state) : []), [state])
  const length = useMemo(() => (state ? arcLength(state) : 0), [state])

  const curvePts = useMemo(() => {
    if (!state) return []
    const out: [number, number, number][] = []
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const p = curveAt(state, k / CURVE_SAMPLES)
      if (p) out.push(tri(p))
    }
    return out
  }, [state])

  const defect = useMemo(() => (state ? Math.max(...residual(state).map(Math.abs)) : NaN), [state])
  /** Measured drift of the pinned data — strict mode's honesty check. */
  const dataDrift = useMemo(() => {
    if (!state || !data || mode === 'free') return 0
    const d = hermiteDataOf(state)
    const scale = vnorm(vsub(data.p1, data.p0))
    return Math.max(
      vnorm(vsub(d.p0, data.p0)), vnorm(vsub(d.p1, data.p1)),
      vnorm(vsub(d.d0, data.d0)), vnorm(vsub(d.d1, data.d1)),
    ) / scale
  }, [state, data, mode])

  const ride = (coordinate: StrictCoordinate, target: number): void => {
    if (!state || !data) return
    const step = dragStrict(state, coordinate, target, { data })
    if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
  }

  const reset = (): void => {
    setState(START)
    setData(START ? hermiteDataOf(START) : null)
    setGrabbed(null)
    setStalled(false)
  }

  if (!state || !data) {
    return <div className="text-sm text-slate-500">No non-degenerate member found.</div>
  }

  /** In strict mode only the four OUTER points are grabbable — they carry the data. */
  const grabbable = (i: number): boolean =>
    mode === 'free' || i === 0 || i === 1 || i === DEGREE - 1 || i === DEGREE

  const slider = (label: string, value: number, coordinate: StrictCoordinate, span: number): ReactElement => (
    <label key={label} className="flex items-center gap-1">
      <span className="text-slate-400">{label}</span>
      <input
        type="range"
        min={value * (1 - span)}
        max={value * (1 + span)}
        step={(value * span) / 40}
        value={value}
        onChange={(e) => ride(coordinate, Number(e.target.value))}
        className="w-20"
      />
      <span className="tabular-nums text-slate-500">{value.toFixed(3)}</span>
    </label>
  )

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        mode === 'strict' ? '12 conditions of 15 — 3 left' : '6 conditions of 15 — 9 left',
        'slide 7’s quintic left 2',
        'ρ₂, ρ₃, L coordinatize it',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        ...(mode === 'strict'
          ? [{ label: 'data drift', value: dataDrift.toExponential(1), tone: 'ok' as const }]
          : []),
        { label: 'arc length', value: length.toFixed(3) },
        { label: 'min W(t)', value: denominatorFloor(state).toFixed(3), tone: 'ok' as const },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex rounded border border-slate-300 overflow-hidden">
            {(['strict', 'free'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setData(hermiteDataOf(state)); setGrabbed(null) }}
                className={`px-2 py-[0.15em] ${mode === m ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
              >
                {m}
              </button>
            ))}
          </span>
          {mode === 'strict' && free.map((i) =>
            slider(`ρ${i}`, rho[i], { kind: 'radius', index: i }, 0.35),
          )}
          {mode === 'strict' && slider('arc length', length, { kind: 'length' }, 0.3)}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>The same two gestures as the polynomial slides, on a rational curve — and one more
          dimension.</b>{' '}
          <b>Strict</b> pins the C¹ Hermite data: twelve conditions against fifteen, so{' '}
          <b>three</b> remain. Slide 7’s polynomial quintic had fourteen and kept <b>two</b>, so
          rationality buys exactly one more at the same degree and the same data — the torus becomes
          a 3-fold, and it takes three sliders. They are the two <b>free sphere radii</b> and the{' '}
          <b>arc length</b>, which is a complete coordinate system on that 3-fold and was found by
          measurement, not chosen: one plausible alternative, <i>ρ₂, ρ₃, λ₁</i>, is <i>not</i>
          complete. Only one slider is prescribed at a time, so the other two readings{' '}
          <b>drift</b> as you move it — they are genuinely coupled, and pretending otherwise would
          be enforcing something other than what is shown.{' '}
          <span className="text-slate-400">
            The four outer points move the data — but unlike slide 7 they are not the data, since
            r′(0) = 5(w₁/w₀)(P₁−P₀) carries the weights too. <b>Free</b> releases everything but the
            ends. Drag the background to rotate.
          </span>
        </>
      }
    >
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {mode === 'free' && beads.map((b, i) =>
        Number.isFinite(b.x) ? (
          <DragPoint3D
            key={`bead${i}`}
            position={tri(b)}
            color={grabbed === `bead${i}` ? FIG.color.dataPointDrag : FIG.color.derived}
            radius={0.028}
            onDragStart={() => { setGrabbed(`bead${i}`); setStalled(false) }}
            onDragEnd={() => setGrabbed(null)}
            onDrag={([x, y, z]) => {
              const a = cps[i], leg = vsub(cps[i + 1], a)
              const len2 = leg.x * leg.x + leg.y * leg.y + leg.z * leg.z
              if (len2 === 0) { setStalled(true); return }
              const rel = vsub({ x, y, z }, a)
              const step = dragFarin(state, i, (rel.x * leg.x + rel.y * leg.y + rel.z * leg.z) / len2)
              if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        ) : null,
      )}

      {cps.map((p, i) => (
        <DragPoint3D
          key={`cp${i}`}
          position={tri(p)}
          color={
            grabbed === `cp${i}`
              ? FIG.color.dataPointDrag
              : !grabbable(i)
                ? FIG.color.derived
                : mode === 'strict'
                  ? FIG.color.dataPoint
                  : grabbed !== null && (i === 0 || i === DEGREE)
                    ? FIG.color.pinned
                    : FIG.color.dataPoint
          }
          radius={grabbable(i) ? 0.045 : 0.03}
          onDragStart={() => { if (grabbable(i)) { setGrabbed(`cp${i}`); setStalled(false) } }}
          onDragEnd={() => setGrabbed(null)}
          onDrag={([x, y, z]) => {
            if (!grabbable(i)) return
            if (mode === 'free') {
              const step = dragControlPoint(state, i, { x, y, z })
              if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
              return
            }
            // strict: dragging an outer point re-prescribes the DATA
            const next = hermiteDataOf(state)
            const moved: HermiteData =
              i === 0 ? { ...next, p0: { x, y, z } }
                : i === DEGREE ? { ...next, p1: { x, y, z } }
                  : i === 1
                    ? { ...next, d0: { x: (x - cps[0].x) * DEGREE, y: (y - cps[0].y) * DEGREE, z: (z - cps[0].z) * DEGREE } }
                    : { ...next, d1: { x: (cps[DEGREE].x - x) * DEGREE, y: (cps[DEGREE].y - y) * DEGREE, z: (cps[DEGREE].z - z) * DEGREE } }
            const step = moveToData(state, moved)
            if (step.converged) { setState(step.state); setData(hermiteDataOf(step.state)); setStalled(false) }
            else setStalled(true)
          }}
        />
      ))}
    </Figure3D>
  )
}
