// ============================================================================
// RETIRED — imported nowhere, and the "SLIDE 14" below is stale: slide 14 is SexticFivePointFigure,
// which replaced this one. The weakness it fixed, in its own words: "you could turn five dials but
// move no control point." Kept for the measurements, which are still the source of the degree-6
// moduli counts quoted elsewhere.
//
// ORIGINAL HEADER FOLLOWS.
//
// SLIDE 14 — DEGREE 6, AND THE FIVE MODULI. Slide 12's gesture two degrees up, where the count of
// genuinely different shapes is five and every one of them is a dial you can turn.
//
// WHY THE COUNT IS FIVE. The family has 2n+5 = 17 dimensions, and twelve of those change nothing
// geometric: ten for the Möbius group O(4,1) acting linearly on R^{4,1}, one for the projective
// scale of the homogeneous representative, and one for the wₖ ↦ λᵏwₖ reparametrisation that slide 13
// is about. So the curves modulo Möbius AND reparametrisation number 2n − 7 — one at degree 4, three
// at degree 5, FIVE here. All twelve gauge directions are verified to lie in the tangent space to
// 1.8e-12, so this is a measured decomposition and not a hopeful count.
//
// AND THE COUNT IS NOT ABSTRACT: pinning the C¹ Hermite data at both ends is exactly a slice through
// the gauge. Twelve rows added to the defining Jacobian leave nullity 2, 4, 6 at degrees 4, 5, 6 —
// minus the one structurally spurious direction (see below) that is 1, 3, 5 = 2n − 7, with gaps
// 4.7e9, 3.2e5, 8.4e9. So strict mode holds the data and what is left to move is FIVE SHAPES —
// which is 2n−7, a codimension-1 slice of the 2n−6 = 6 moduli, not the moduli themselves. (Corrected:
// the family is 2n+6 = 18, not 17; the Jacobian's 23-of-24 defect is a redundant EQUATION, not a
// spurious direction. See conformalPHStructure.test.ts finding 14.)
//
// THE FIVE DIALS, and finding them took a measurement. `strictCoordinates` offers the free radii plus
// the arc length, which is 3 + 1 = 4 here — one short, where degree 5's 2 + 1 = 3 matched by luck.
// Splitting the arc length into its two halves supplies the fifth, and it is a real coordinate rather
// than a gauge artefact because the Hermite data pins the parametrisation: d₀ = n(w₁/w₀)(P₁−P₀) fixes
// λ, so "the length from 0 to ½" means something. Measured: ρ₂, ρ₃, ρ₄, L₁, L₂ pin 5 of the 5 slice
// directions.
//
// WHAT BENDING CAN AND CANNOT REACH HERE. The null lift of a polynomial curve is (1, p, ½‖p‖²), so
// degree d lands at conformal degree 2d — exactly, since the o-coordinate is the constant 1 and the
// five components share no common factor; and O(4,1) acts linearly and invertibly, so the degree is a
// Möbius invariant that bending cannot lower. Conformal 6 therefore carries the polynomial PH CUBICS,
// not the quintics: a polynomial PH quintic needs conformal degree 10. And a generic member here is
// not a bent cubic at all — p is a Möbius image of a polynomial iff some NULL S has ⟨P,S⟩ constant,
// which forces S orthogonal to every difference Cᵢ − Cᵢ₊₁, and at degree 6 that orthogonal complement
// is measured to be ZERO-dimensional. Degree 4 needed a scalar test (⟨S,S⟩ = 2.0e-3); here there is
// no candidate to test.
//
// THE MEMBER IS PINNED AS DATA rather than solved at load (core/conformalPHSeeds): findMember takes
// ~19 s at this degree, which is not something a slide can do while the room waits. It is a computed
// member cached, not a hand-tuned one — conformalPHStructure.test.ts asserts its residual is machine
// zero and its guards still hold, so an edit to the family's algebra turns that test red.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vsub } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  type StrictCoordinate,
  arcLength,
  controlPoints,
  curveAt,
  denominatorRealRoots,
  dragControlPoint,
  dragFarin,
  dragStrict,
  farinPoints,
  freeRadiusIndices,
  hermiteDataOf,
  measuredSpeed,
  radii,
  residual,
  shapeMeasures,
  speedAt,
} from '../../core/conformalPHCurve'
import { sexticSeed } from '../../core/conformalPHSeeds'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const DEGREE = 6

const START: ConformalPHCurve = sexticSeed()

const CURVE_SAMPLES = 140
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const sampleCurve = (s: ConformalPHCurve, n: number): Vec3[] => {
  const out: Vec3[] = []
  for (let k = 0; k <= n; k++) {
    const p = curveAt(s, k / n)
    if (p) out.push(p)
  }
  return out
}

const BOUNDS = (() => {
  const pts = [...controlPoints(START), ...sampleCurve(START, 200)]
  const pad = 0.25
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), zs = pts.map((p) => p.z)
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

/**
 * The five dials, in the order they are shown. `freeRadiusIndices` gives 2, 3, 4 here — radii 1 and
 * n−1 are not free because the Hermite data already fixes them, each being the distance to its near
 * endpoint. The two halves complete the count.
 */
const RADIUS_DIALS = freeRadiusIndices(START)
const DIALS: { key: string; label: string; coordinate: StrictCoordinate }[] = [
  ...RADIUS_DIALS.map((index) => ({
    key: `r${index}`,
    label: `ρ${'₀₁₂₃₄₅₆'[index]}`,
    coordinate: { kind: 'radius', index } as StrictCoordinate,
  })),
  { key: 'L1', label: 'L₁', coordinate: { kind: 'length', from: 0, to: 0.5 } },
  { key: 'L2', label: 'L₂', coordinate: { kind: 'length', from: 0.5, to: 1 } },
]

const LENGTH_SAMPLES = 8
const valueOf = (s: ConformalPHCurve, c: StrictCoordinate): number =>
  c.kind === 'radius' ? radii(s)[c.index] : arcLength(s, LENGTH_SAMPLES, c.from ?? 0, c.to ?? 1)

type Mode = 'strict' | 'free'

export default function RationalPHSexticFigure() {
  const [state, setState] = useState<ConformalPHCurve>(START)
  const [mode, setMode] = useState<Mode>('strict')
  const [grabbed, setGrabbed] = useState<{ kind: 'point' | 'farin'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)
  /**
   * What each slider was last ASKED for. The measured values drift as the others move — they are
   * genuinely coupled by the defining conditions, and hiding that would be displaying one quantity
   * while enforcing another — so a handle that showed its measured value would jump under the
   * pointer. The readouts show the measured values; the handles show the asks.
   */
  const [asked, setAsked] = useState<Record<string, number>>(() =>
    Object.fromEntries(DIALS.map((d) => [d.key, valueOf(START, d.coordinate)])),
  )
  /** The data strict mode holds, captured whenever we enter it. */
  const [data, setData] = useState(() => hermiteDataOf(START))

  const strict = mode === 'strict'

  const cps = useMemo(() => controlPoints(state), [state])
  const beads = useMemo(() => farinPoints(state), [state])
  const curvePts = useMemo(() => sampleCurve(state, CURVE_SAMPLES).map(tri), [state])

  const speedError = useMemo(() => {
    let w = 0
    for (const t of [0.15, 0.35, 0.5, 0.7, 0.85]) {
      const a = Math.abs(speedAt(state, t))
      const b = measuredSpeed(state, t)
      if (b > 0) w = Math.max(w, Math.abs(a - b) / b)
    }
    return w
  }, [state])
  const defect = useMemo(() => Math.max(...residual(state).map(Math.abs)), [state])
  const shape = useMemo(() => shapeMeasures(state), [state])

  /** Ride one dial. Rate-limited inside dragStrict, so a slider jump takes several passes. */
  const ride = (key: string, coordinate: StrictCoordinate, target: number): void => {
    setAsked((prev) => ({ ...prev, [key]: target }))
    let current = state
    let moved = false
    for (let k = 0; k < 8; k++) {
      if (Math.abs(valueOf(current, coordinate) - target) < 1e-6) break
      const step = dragStrict(current, coordinate, target, { data, lengthSamples: LENGTH_SAMPLES })
      if (!step.converged) break
      if (Math.abs(valueOf(step.state, coordinate) - valueOf(current, coordinate)) < 1e-9) break
      current = step.state
      moved = true
    }
    if (moved) { setState(current); setStalled(false) } else setStalled(true)
  }

  const reset = (): void => {
    setState(START)
    setData(hermiteDataOf(START))
    setGrabbed(null)
    setStalled(false)
    setAsked(Object.fromEntries(DIALS.map((d) => [d.key, valueOf(START, d.coordinate)])))
  }

  const toMode = (next: Mode) => (): void => {
    setMode(next)
    setStalled(false)
    if (next === 'strict') {
      // Re-read the data from wherever free mode left the curve, and re-seat the handles on it.
      setData(hermiteDataOf(state))
      setAsked(Object.fromEntries(DIALS.map((d) => [d.key, valueOf(state, d.coordinate)])))
    }
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 6',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        strict ? '18 − 12 gauge = 6 moduli' : 'ends held — 14 spare',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        { label: 'real roots of w', value: `${denominatorRealRoots(state)} — genuinely sextic`, tone: 'ok' as const },
        { label: 'dim', value: strict ? '5 shapes of the 6 moduli' : '3 of 17 asked — 14 spare' },
        ...DIALS.map((d) => ({ label: d.label, value: valueOf(state, d.coordinate).toFixed(3) })),
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        { label: 'κ spread', value: shape.curvatureSpread.toFixed(3), tone: 'ok' as const },
        // Constant width, non-breaking pad: see the note in RationalPHQuarticFigure. A readout that
        // changes width can re-wrap the row and slide a slider out from under the pointer.
        { label: 'step', value: (stalled ? 'not reached' : '—').padEnd(11, ' ') },
      ]}
      controls={
        <span className="flex items-center gap-2 flex-wrap justify-center">
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
            DIALS.map((d) => {
              const here = valueOf(START, d.coordinate)
              return (
                <label key={d.key} className="flex items-center gap-1">
                  <span className="text-slate-400">{d.label}</span>
                  <input
                    type="range"
                    min={Math.max(0.05, here * 0.4)}
                    max={here * 2.2}
                    step={here / 400}
                    value={asked[d.key]}
                    onChange={(e) => ride(d.key, d.coordinate, Number(e.target.value))}
                    className="w-20"
                  />
                </label>
              )
            })
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
            <b>Five dials, and there is no sixth.</b> The C¹ Hermite data is held at both ends — twelve
            conditions, and they cut exactly through the twelve-dimensional <b>gauge</b>: ten for
            Möbius, one for the projective scale, one for slide 13's reparametrisation. What is left is{' '}
            <b>17 − 12 = 5</b>, and these five sliders are it — three sphere radii and the arc length of
            each half. Every one changes the shape; the others drift as you move one, because they are
            genuinely coupled by the defining conditions.{' '}
            <b>None of this can be reached by bending a polynomial.</b> The null lift squares the
            position, so degree <i>d</i> lands at conformal degree 2<i>d</i>: this degree carries the
            polynomial PH <b>cubics</b>, and a polynomial PH <b>quintic</b> needs conformal degree{' '}
            <b>10</b>. A generic member here is not even a bent cubic — a bent polynomial needs a{' '}
            <i>null</i> S with ⟨P,S⟩ constant, and at degree 6 the space of candidate S is measured to
            be <b>zero-dimensional</b>. At degree 4 one scalar had to be checked; here there is nothing
            to check.{' '}
            <span className="text-slate-400">
              The count 2n − 7 is one at degree 4, three at degree 5 (slide 12's measured “freedom 3”),
              five here. Radii 1 and 5 are not dials because the data already fixes them, each being
              the distance to its near endpoint. Switch to <b>free</b> to drag points instead. Drag the
              background to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free: only the two ends are held.</b> Drag any interior control point, or a bead, and the
            rest answers — eleven dimensions. Coming back to <b>strict</b> re-reads the Hermite data
            from wherever you left the curve, so the five dials pick up from there rather than snapping
            home.{' '}
            <span className="text-slate-400">
              Both readouts are measured, not asserted: the curve stays on the null quadric and exactly
              PH throughout. Drag the background to rotate.
            </span>
          </>
        )
      }
    >
      <Curve3D points={cps.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curvePts} color={FIG.color.curve} width={3.5} />

      {/* the Farin beads — the weights */}
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
              if (strict) return           // in strict mode the dials drive the weights
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
        Colour carries one distinction and it is static: can the mouse move this? Blue is a handle,
        grey is not. In strict mode nothing is a handle — the dials drive everything — so the whole
        polygon is grey, which is also the visible statement that the DATA is what is held. Nothing
        recolours mid-drag; see the note in RationalPHQuarticFigure for why that mattered.
      */}
      {cps.map((p, i) =>
        strict ? (
          <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.derived} radius={0.038} />
        ) : (
          <DragPoint3D
            key={`cp${i}`}
            position={tri(p)}
            color={FIG.color.dataPoint}
            radius={0.045}
            onDragStart={() => { setGrabbed({ kind: 'point', index: i }); setStalled(false) }}
            onDragEnd={() => setGrabbed(null)}
            onDrag={([x, y, z]) => {
              const step = dragControlPoint(state, i, { x, y, z }, { pinEnds: true })
              if (step.converged) { setState(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        ),
      )}

      {/* the two ends, which strict mode holds exactly and free mode also pins */}
      {[0, DEGREE].map((i) => (
        <Point3D key={`end${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.05} />
      ))}
    </Figure3D>
  )
}
