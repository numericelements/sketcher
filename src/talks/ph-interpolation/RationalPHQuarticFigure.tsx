// ============================================================================
// SLIDE 13 — DEGREE 4: the smallest genuinely-new rational case, and the one dimension left
// when the polygon is nailed down turns out to be the PARAMETER GAUGE.
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
// genuinely spatial curves. That is a qualitative gap, not the comparison of two dimension counts
// that degree 6 offers.
//
// WHAT THE STRICT DIAL IS, and this is a correction: an earlier version of this figure claimed the
// frozen polygon carried a one-parameter family of DISTINCT curves. It does not. Eric caught it
// from the figure itself — "the dial does not change the shape of the curve, it just moves the
// Farin points" — and the measurement agrees: the weight ratios wₖ/wₖ⁰ come out as 1, λ, λ², λ³, λ⁴
// with a SINGLE λ recovered to four decimals from all four, and the drawn image is unchanged to the
// sampling resolution. wₖ ↦ λᵏwₖ is the classical rational-Bézier reparametrisation.
//
// It is not an accident of the seed, it is FORCED. λᵏ moves only the weights; every control point,
// as a projective point, stays exactly where it was. So the gauge direction lies in the nullspace
// of any constraint of the form "control point k sits at this 3D position" — structurally, before
// anything is computed. Pinning positions cannot cut it: pin four points, pin all five, it survives.
//
// SO THE SLIDE'S STATEMENT IS A RIGIDITY ONE, and it is stronger than the family it replaced.
// 13 = 1 gauge + 12 geometric. Four pinned points is 12 conditions, and they can only bite on the
// 12 geometric directions; measured dim is 1, so they bite on ALL of them. The four points cut the
// geometric quotient to dimension ZERO: they determine the quartic's shape. The dial is kept and
// shown on purpose — every number on the screen changes and the curve does not move, which is what
// a gauge looks like, and worth one slide in a talk about parametrisation.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// The numbers above are pinned in core/__tests__/conformalPHHopf.test.ts.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  controlPoints,
  curveAt,
  denominatorRealRoots,
  dragControlPoint,
  dragFarin,
  farinParameters,
  farinPoints,
  findMember,
  measuredSpeed,
  residual,
  slideAlongFamily,
  speedAt,
  weights,
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
/**
 * The reference image the "curve moved" readout measures against, sampled far more finely than the
 * drawn curve on purpose: a coarse reference sets the floor of the measurement rather than the
 * curve doing so. At 61 samples this read 2.2e-2 and was reporting its own grid; at 401 it reads
 * 2.6e-3, which is the drawn resolution.
 */
const REFERENCE_SAMPLES = 400

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const sampleCurve = (s: ConformalPHCurve, n: number): Vec3[] => {
  const out: Vec3[] = []
  for (let k = 0; k <= n; k++) {
    const p = curveAt(s, k / n)
    if (p) out.push(p)
  }
  return out
}

const REFERENCE = START ? sampleCurve(START, REFERENCE_SAMPLES) : []
const START_WEIGHTS = START ? weights(START) : []

const BOUNDS = (() => {
  const fallback = {
    min: [-1.5, -1.5, -1.5] as [number, number, number],
    max: [1.5, 1.5, 1.5] as [number, number, number],
  }
  if (!START) return fallback
  const pts = [...controlPoints(START), ...REFERENCE]
  const pad = 0.25
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

const EXTENT = Math.max(
  1e-9,
  Math.hypot(
    BOUNDS.max[0] - BOUNDS.min[0],
    BOUNDS.max[1] - BOUNDS.min[1],
    BOUNDS.max[2] - BOUNDS.min[2],
  ),
)

/**
 * How far the drawn SET OF POINTS has moved, as a fraction of the scene — one-sided, current
 * samples against the reference image. One-sided is the right direction: a reparametrisation
 * clusters uniform-in-t samples, so the current curve may leave gaps in the reference while every
 * point it draws still lies on it, which is exactly the claim being checked.
 */
function imageDrift(s: ConformalPHCurve): number {
  if (!REFERENCE.length) return NaN
  let worst = 0
  for (const p of sampleCurve(s, CURVE_SAMPLES)) {
    let near = Infinity
    for (const q of REFERENCE) near = Math.min(near, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z))
    worst = Math.max(worst, near)
  }
  return worst / EXTENT
}

/**
 * Read the reparametrisation out of the weights. If wₖ/wₖ⁰ is (up to one overall scale) λᵏ then
 * `lambda` is that λ and `fit` is how far the per-k readings disagree — `fit` near zero is the
 * evidence that the dial is the gauge and nothing else.
 */
function gaugeReading(s: ConformalPHCurve): { lambda: number; fit: number } {
  const w = weights(s)
  if (w.length !== START_WEIGHTS.length) return { lambda: NaN, fit: NaN }
  const r = w.map((v, k) => v / START_WEIGHTS[k])
  if (!Number.isFinite(r[0]) || r[0] === 0) return { lambda: NaN, fit: NaN }
  const per = r.slice(1).map((v, i) => Math.pow(Math.abs(v / r[0]), 1 / (i + 1)))
  const lambda = per[per.length - 1]
  const fit = Math.max(...per.map((v) => Math.abs(v / per[0] - 1)))
  return { lambda, fit }
}

/** The dial's readout: the first bead's place along its leg. One dial moves all four together. */
const dialOf = (s: ConformalPHCurve): number => farinParameters(s)[0]

type Mode = 'strict' | 'free'

export default function RationalPHQuarticFigure() {
  const [state, setState] = useState<ConformalPHCurve | null>(START)
  const [mode, setMode] = useState<Mode>('strict')
  const [grabbed, setGrabbed] = useState<{ kind: 'point' | 'farin'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)
  const [atLimit, setAtLimit] = useState(false)
  /** What the slider was last asked for, so its handle never chases the measured value. */
  const [asked, setAsked] = useState<number>(START ? dialOf(START) : 0.5)

  const strict = mode === 'strict'

  const cps = useMemo(() => (state ? controlPoints(state) : []), [state])
  const beads = useMemo(() => (state ? farinPoints(state) : []), [state])
  const curvePts = useMemo(() => (state ? sampleCurve(state, CURVE_SAMPLES).map(tri) : []), [state])

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
  const drift = useMemo(() => (state ? imageDrift(state) : NaN), [state])
  const gauge = useMemo(() => (state ? gaugeReading(state) : { lambda: NaN, fit: NaN }), [state])

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

  const toMode = (next: Mode) => (): void => {
    setMode(next)
    setStalled(false)
    setAtLimit(false)
  }

  if (!state) {
    return (
      <div className="text-sm text-slate-500">
        No irreducible degree-4 member found — every seed was rejected by the guards.
      </div>
    )
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 4',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        strict ? 'P₀, P₁, P₃, P₄ held — 12 of 13' : 'ends held — 9 free',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'real roots of w', value: `${denominatorRealRoots(state)} — genuinely quartic`, tone: 'ok' as const },
        { label: 'dim', value: strict ? '1 of 13 — and it is the gauge' : '13 = 1 gauge + 12' },
        { label: 'dial', value: dialOf(state).toFixed(3) },
        ...(strict
          ? [
              { label: 'λ', value: Number.isFinite(gauge.lambda) ? gauge.lambda.toFixed(3) : '—' },
              { label: 'λᵏ fit', value: Number.isFinite(gauge.fit) ? gauge.fit.toExponential(1) : '—', tone: 'ok' as const },
              { label: 'curve moved', value: drift.toExponential(1), tone: 'ok' as const },
            ]
          : []),
        {
          label: 'step',
          // Padded to a constant width with non-breaking spaces. The font is monospace, so equal
          // character counts are equal pixels, and the readouts row can no longer WRAP differently
          // as this value changes — which would shift the controls row below it vertically and move
          // the slider under the pointer even now that the two have separate rows. The pad
          // character is a NON-BREAKING space, because HTML collapses runs of ordinary ones and
          // padding with those would silently do nothing.
          value: (atLimit ? 'at the family’s limit' : stalled ? 'not reached' : '—').padEnd(21, ' '),
        },
      ]}
      controls={
        <span className="flex items-center gap-2">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            <button
              onClick={toMode('strict')}
              className={`px-2 py-[0.15em] ${strict ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              strict
            </button>
            <button
              onClick={toMode('free')}
              className={`px-2 py-[0.15em] ${!strict ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
            >
              free
            </button>
          </span>
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
        strict ? (
          <>
            <b>Four control points determine the quartic — and the dimension that is left is a
            reparametrisation.</b>{' '}
            Holding the four outer points is twelve conditions on a thirteen-dimensional family, so{' '}
            <b>one</b> is left. Turn the dial: every weight changes, the <b>beads</b> slide, and the{' '}
            <b>curve does not move</b> — the readouts measure it. The weight ratios come out as 1, λ,
            λ², λ³, λ⁴ for a <i>single</i> λ, which is the classical{' '}
            <b>w<sub>k</sub> ↦ λᵏw<sub>k</sub></b> reparametrisation. It cannot be otherwise: λᵏ leaves
            every control point where it is, so pinning positions can never remove it. Thirteen
            dimensions are therefore <b>1 gauge + 12 geometric</b>, and the twelve conditions cut the
            geometric part to <b>zero</b>.{' '}
            <b>And nothing here can be made by bending.</b> The conformal lift doubles the degree, so a
            Möbius image of a polynomial PH curve of degree <i>d</i> lands at conformal degree 2<i>d</i> —
            degree 4 comes from a polynomial PH <b>quadratic</b>, which is a straight <b>line</b>. At this
            degree bending gives only circles and lines; building directly here gives thirteen
            dimensions of spatial curves.{' '}
            <span className="text-slate-400">
              Degree 4 and not 5: nullity forces ‖q‖² = 2w·c∞, so at a real root of w the numerator
              vanishes too and the curve is secretly of lower degree — and an odd-degree w always has a
              real root. The readout shows this member has none. Switch to <b>free</b> to drag any point
              with only the ends held. Drag the background to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free: only the two ends are held.</b> Drag any interior control point, or a bead, and the
            rest of the curve answers — nine dimensions, the gesture from slides 9 and 11. The curve
            stays exactly PH and exactly on the null quadric throughout; both readouts are measured, not
            asserted.{' '}
            <span className="text-slate-400">
              Come back to <b>strict</b> for the rigidity statement: four points fix the shape, and the
              one dimension they leave is a reparametrisation. Drag the background to rotate.
            </span>
          </>
        )
      }
    >
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {/* the Farin beads — the weights, and in strict mode the only thing that moves */}
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

      {/*
        THE CONTROL POINTS, ALL ONE COLOUR, and that is deliberate rather than an oversight. Earlier
        versions recoloured them — grey for the middle one, grey for all of them while a drag was in
        progress — and the flicker read as though the mathematics were changing state. It is not: in
        strict mode every one of the five is held, and under the dial none of them moves at all. A
        uniform blue polygon that visibly stays put is the whole point of the slide. In strict mode
        the middle point is not a handle (holding the outer four already uses all twelve conditions,
        so there is nothing left to move it with), so it is rendered as a plain mark.
      */}
      {cps.map((p, i) =>
        strict && i === 2 ? (
          <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.dataPoint} radius={0.045} />
        ) : (
          <DragPoint3D
            key={`cp${i}`}
            position={tri(p)}
            color={FIG.color.dataPoint}
            radius={0.045}
            onDragStart={() => { setGrabbed({ kind: 'point', index: i }); setStalled(false) }}
            onDragEnd={() => setGrabbed(null)}
            onDrag={([x, y, z]) => {
              const step = strict
                ? dragControlPoint(state, i, { x, y, z }, { pin: OUTER })
                : dragControlPoint(state, i, { x, y, z }, { pinEnds: true })
              if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        ),
      )}
    </Figure3D>
  )
}
