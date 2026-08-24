// ============================================================================
// SLIDE 11 — a rational PH curve built where Möbius transformations are linear, and nothing
// bent to make it. DEGREE 6, and the degree is a correction.
//
// THE ARGUMENT THIS SLIDE USED TO MAKE, AND WHY IT IS GONE. It read: "no Möbius image of a
// polynomial PH curve can be this curve, because the conformal lift doubles the degree, so a
// bent curve always has EVEN conformal degree and the ODD ones are unreachable." The parity
// theorem (bottom of core/conformalPHCurve) then showed that odd conformal degree is never
// GENUINELY odd: ⟨C,C⟩ ≡ 0 forces ‖q‖² = 2·w·c∞, so at every real root of w the real vector q
// vanishes and (t−r) divides q, w, c∞ and h alike. A real odd-degree polynomial always has a
// real root. Measured on the member this figure used to load: `denominatorRealRoots` = 1 — it
// was a conformal QUARTIC wearing a quintic polygon, so one of its six control points was pure
// reparametrisation, and the unreachability argument did not apply to the curve on screen.
//
// So the figure moved to degree 6, where w may avoid the real axis and generically does
// (measured: five members of five). Everything improves at once — 2n−7 genuinely different
// shapes goes 3 → 5, the free middle radii go two → THREE, the strict-slice nullity gap goes
// 3.2e5 → 8.4e9 — and the seed is the cached one, so nothing is searched at module load.
//
// WHAT THE SLIDE ARGUES NOW is the half that survived, and it was always the better half:
// bending here is a CONSTANT 5×5 MATRIX, so it acts on each control point independently. The
// polygon maps one point for one point, the spheres stay spheres, the beads stay Farin beads,
// h does not move and the degree does not move. Slide 10 does the same bend in the ordinary
// representation and 8 control points become 15. That contrast is the payoff of the model.
//
// AND NOTHING FIVE-DIMENSIONAL IS DRAWN. A conformal vector's five coordinates are
// weight + centre + radius (the ∞-component is fixed by the null condition), so:
//
//   · the seven SPHERE CENTRES are the ordinary rational-Bézier control points;
//   · the two end spheres have radius ZERO — the ends are point-spheres;
//   · the OUTER two radii are DETERMINED — ρ₁ = ‖P₁−P₀‖ and ρ₅ = ‖P₅−P₆‖, verified to 1e-8 —
//     so those spheres GRIP the endpoints and are drawn from the polygon;
//   · but ρ₂, ρ₃ and ρ₄ are genuine extra freedom, pinned to nothing.
//
// STRICT AND FREE, and the strict slice is the one Eric asked for: hold the outer TWO at each end.
// Twelve coordinates against seventeen, and the nullity is 6, which decomposes
//
//     6  =  1 projective scale  +  1 parameter gauge  +  4 SHAPE
//
// so there are FOUR dials, not three: ρ₂, ρ₃, ρ₄ cut three of the four shapes and the TOTAL ARC
// LENGTH cuts the fourth. Measured one readout at a time — 6, 5, 4, 3, 2 — in
// strictOnPinnedPoints.test.ts, which also runs the §9.6 gate: all four handles track the cursor to
// 100% with the other three held to 1e-15, while the interior absorbs (|ΔP₃| = 0.32 on a 0.15 ask).
//
// AND THE GATE MATTERED, because this gesture is IMPOSSIBLE two degrees down. At degree 4 pinning
// the four outer points leaves exactly one dimension and it is a pure weight direction — the middle
// point moves 1e-6 while every weight moves 0.1–0.5. "There are dimensions left" and "this handle
// moves" are different claims, and degree 6 is where they finally agree.
//
// THE ONE FORBIDDEN DIAL: a HALF arc length. Pinning control POINTS leaves the gauge Cₖ ↦ λᵏCₖ live —
// it moves no control point, so it satisfies the pins for free — and the half-lengths are not
// gauge-invariant, so such a slider would move every weight and every bead with the curve standing
// still. That is the dead dial that got the degree-5 strict/free slide retired. `dragPinned` throws.
// (Radii and the total length ARE invariant, which is why those four are safe.)
//
// FREE holds only the ends, leaving 11, and `dragControlPoint` drops the dragged index from its own
// pin list — so grabbing an end frees that end, which is the gesture asked for.
//
// THOSE THREE ARE SLIDERS, NOT 3-D HANDLES, and that is a fix rather than a preference. A
// radius is a SCALAR and the old handle asked for it with a point drag: it was drawn at
// centre + (ρ,0,0), so it teleported back to the +x axis after every event instead of following
// the cursor, and it read the radius as ‖cursor − centre‖ — so dragging AROUND the sphere did
// nothing while dragging ACROSS it took the radius through zero. There was no direction that
// meant "bigger". Eric found it by using it. The fixed-range/ask-vs-achieve arrangement is
// StrictFreeRationalFigure's, for the reason recorded there: a range derived from the live
// value chases the cursor.
//
// THE WEIGHTS ARE FARIN BEADS, one per leg — six legs, six weight ratios after the overall
// scale, an exact match. A bead at its leg's midpoint means those two weights are equal, so ALL
// SIX at the midpoints would mean polynomial: the rationality is visible as how far off-centre
// they sit. A bead leaving its segment would mean a weight ratio went negative.
//
// AND THEY ARE A READOUT, NOT A HANDLE, in BOTH modes — see the block beside them in the JSX for
// why. Short version: the mechanical reason is that `dragFarin`'s 0.03-per-event clamp made the
// bead crawl behind the cursor, and the structural reason is better — in strict the four dials
// already spend the slice, and in free the eleven dimensions are what the seven POINTS are for.
// A weight handle and a point handle competing for the same dimensions is two controls for one
// freedom. What the beads are for is watching the rationality answer on its own.
//
// WHAT EDITING COSTS. 18 dimensions, 17 after the projective scale, of which TEN are Möbius
// motions — the group is ten-dimensional, and an earlier version of this figure subtracted nine
// (retracted, RATIONAL_PH_STATE §7). That leaves 2n−5 = 7 shape moduli. Nothing moves alone:
// the defining conditions couple the centres, the weights and the radii, so dragging a point
// makes the weights answer, which is exactly what the beads make visible.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and
// gestures. core/conformalPHCurve (22 tests), core/conformalPHFamily (10), core/conformal (28).
// ============================================================================
import { useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import { vadd, vcross, vnorm, vscale } from '../../core/quaternion'
import {
  type ConformalPHCurve,
  type StrictCoordinate,
  mobiusImage,
  controlPoints,
  curveAt,
  denominatorFloor,
  arcLength,
  dragControlPoint,
  dragPinned,
  farinParameters,
  farinPoints,
  freeRadiusIndices,
  measuredSpeed,
  radii,
  residual,
  shapeMeasures,
  speedAt,
} from '../../core/conformalPHCurve'
import { sexticSeed } from '../../core/conformalPHSeeds'
import { inversiveBendGenerator, matrixExp5 } from '../../core/conformal'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const DEGREE = 6
/** The cached member — a GENUINE sextic (w has no real root), not searched at module load. */
const START: ConformalPHCurve = sexticSeed()
/**
 * ±0.2, AND THE RANGE IS MEASURED HERE RATHER THAN INHERITED. It used to be ±2, which is slide 10's
 * number for a different object (a septic in the ordinary representation) — at degree 6 on this seed
 * that spends the whole slider outside the interesting region, which is why the bend arrived all at
 * once. Along one axis, with the drawn box 4.51 × 3.77 × 4.49:
 *
 *     s      0.05   0.10   0.15   0.20   0.30   0.60   1.00   2.00
 *     extent 1.25×  1.59×  2.10×  2.76×  4.05×  1.50×  0.31×  0.05×
 *     min W  0.628  0.472  0.352  0.268  0.195  0.416  1.999  12.44
 *
 * So everything worth watching happens below 0.3 — the old slider put it in the first SEVEN PERCENT
 * of its travel. Past 0.3 the curve swells through max ρ = 46.5 and then collapses to a twentieth of
 * its size, all of it far outside the frame and all of it still an exact member (residual ≤ 1.9e-12 —
 * the family does not care, the framing does). The curve's own box at s = 0.20 is 2.19 × 2.79 × 3.33,
 * inside the drawn one with room for the three axes to be turned together; 0.25 already touches the
 * edge. Step is range/200, so the pointer has 200 notches over the useful region instead of 8.
 */
const BEND_RANGE = 0.2
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

/** STRICT holds these four; P₂ P₃ P₄ are outputs. Twelve coordinates against seventeen. */
const PIN = [0, 1, 5, 6]

/**
 * THE FOUR DIALS, and the count is measured rather than chosen (strictOnPinnedPoints.test.ts).
 * With the four points held the nullity is 6 = 1 projective scale + 1 parameter gauge + 4 SHAPE, and
 * ρ₂, ρ₃, ρ₄, L cut those four one at a time. The three radii alone are ONE SHORT — which is why the
 * arc length is here and is not decoration.
 *
 * AND NOT THE HALF-LENGTHS, which is the trap this slice carries. Pinning control POINTS leaves the
 * gauge Cₖ ↦ λᵏCₖ live (it moves no control point, so it satisfies the pins for free), and a
 * half-length is not gauge-invariant. Such a slider would move every weight and every bead with the
 * curve standing still. `dragPinned` throws rather than offering it.
 */
const RADIUS_DIALS = freeRadiusIndices(START).map((index) => ({
  index,
  key: `r${index}`,
  label: `ρ${'₀₁₂₃₄₅₆'[index]}`,
  coordinate: { kind: 'radius' as const, index },
  read: (s: ConformalPHCurve): number => radii(s)[index],
}))
const DIALS = [
  ...RADIUS_DIALS,
  {
    index: -1,
    key: 'L',
    label: 'arc L',
    coordinate: { kind: 'length' as const },
    read: (s: ConformalPHCurve): number => arcLength(s, 8),
  },
]

/**
 * Slider ranges, computed ONCE from the starting member and never again — StrictFreeRationalFigure's
 * arrangement, for the bug recorded there: a range derived from the LIVE measured value recenters as
 * you drag, so the same value maps to a new pixel and the thumb slides out from under the mouse.
 */
const DIAL_RANGE: Record<string, [number, number]> = Object.fromEntries(
  DIALS.map((d) => {
    const here = d.read(START)
    return [d.key, [Math.max(0.05, here * 0.5), here * 1.8] as [number, number]]
  }),
)

type Mode = 'strict' | 'free'

export default function RationalPHCurveFigure() {
  /**
   * `base` is the curve; `bend` is a Möbius transformation applied for display. Since the family
   * is closed under O(4,1) acting linearly on the coefficients, the displayed state is a genuine
   * member — so edits can be solved in DISPLAY coordinates (what the hand is pointing at) and
   * pushed back through exp(−G), with no cursor pull-back anywhere.
   */
  const [base, setBase] = useState<ConformalPHCurve>(START)
  const [bend, setBend] = useState<Vec3>({ x: 0, y: 0, z: 0 })
  const [mode, setMode] = useState<Mode>('strict')
  /** Only control points are grabbable now — the beads are a readout in both modes. */
  const [grabbed, setGrabbed] = useState<{ kind: 'point'; index: number } | null>(null)
  const [stalled, setStalled] = useState(false)
  /**
   * What each dial was last ASKED for. The measured values drift as the other handles move — they are
   * genuinely coupled by the defining conditions — so a thumb showing the measured value would jump
   * under the pointer. The thumb shows the ask; the readouts show what was achieved.
   */
  const [asked, setAsked] = useState<Record<string, number>>(() =>
    Object.fromEntries(DIALS.map((d) => [d.key, d.read(START)])),
  )
  const strict = mode === 'strict'

  const { forward, inverse } = useMemo(() => ({
    forward: matrixExp5(inversiveBendGenerator(bend)),
    inverse: matrixExp5(inversiveBendGenerator({ x: -bend.x, y: -bend.y, z: -bend.z })),
  }), [bend])

  /** What is drawn, and what the DIRECT gestures act on. */
  const state = useMemo(() => mobiusImage(base, forward), [base, forward])
  /** Take an edited DISPLAY state back to the base. */
  const commit = (edited: ConformalPHCurve): void => setBase(mobiusImage(edited, inverse))

  const cps = useMemo(() => controlPoints(state), [state])
  const rho = useMemo(() => radii(state), [state])
  const beads = useMemo(() => farinPoints(state), [state])
  const lambdas = useMemo(() => farinParameters(state), [state])

  const curvePts = useMemo(() => {
    const out: [number, number, number][] = []
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const p = curveAt(state, k / CURVE_SAMPLES)
      if (p) out.push(tri(p))
    }
    return out
  }, [state])

  const free = useMemo(() => freeRadiusIndices(state), [state])

  /** Every sphere with a real radius: the two gripping the ends, and the free middle ones. */
  const rings = useMemo(
    () => cps.flatMap((c, k) => greatCircles(c, rho[k]).map((ring) => ({ ring, free: free.includes(k) }))),
    [cps, rho, free],
  )

  /**
   * A radius and a length are SCALARS, so they are sliders — see the header for the 3-D handle this
   * replaces. The solve runs on the BASE rather than on the display: a bend changes the radii
   * (spheres map to spheres, but not congruently), so editing the display would let a fixed slider
   * range drift off the value it is steering. The bend then just shows the result.
   *
   * ONE DIAL AT A TIME, inherited from the retired degree-5 slide: prescribing all four at once
   * leaves the system exactly determined with a projective kernel and Newton stalls at 1e-6, hitting
   * the coordinates exactly while the defining conditions are not — a figure enforcing something
   * other than what it displays. Prescribing only the one being touched leaves spare dimensions and
   * the defect returns to 1e-13.
   */
  const setDial = (key: string, coordinate: StrictCoordinate, want: number): void => {
    setAsked((a) => ({ ...a, [key]: want }))
    const step = dragPinned(base, PIN, coordinate, want)
    if (step.converged) { setBase(step.state); setStalled(false) } else setStalled(true)
  }

  const shape = useMemo(() => shapeMeasures(state), [state])

  /** The PH claim, measured on the curve rather than read off h. */
  const speedError = useMemo(() => {
    let worst = 0
    for (const t of [0.15, 0.35, 0.5, 0.7, 0.85]) {
      const a = Math.abs(speedAt(state, t))
      const b = measuredSpeed(state, t)
      if (b > 0) worst = Math.max(worst, Math.abs(a - b) / b)
    }
    return worst
  }, [state])

  const defect = useMemo(() => Math.max(...residual(state).map(Math.abs)), [state])
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
    setAsked(Object.fromEntries(DIALS.map((d) => [d.key, d.read(START)])))
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'P(t) = Σ Cₖ Bₖ(t) in R^{4,1}, n = 6',
        '⟨P,P⟩ ≡ 0 and ⟨P′,P′⟩ = h²',
        'ρ₁ = ‖P₁−P₀‖, ρ₅ = ‖P₅−P₆‖',
      ]}
      readouts={[
        { label: 'on the family', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'PH: |h/w| vs |p′|', value: speedError.toExponential(1), tone: 'ok' as const },
        {
          label: 'dim',
          value: strict ? '6 held — 4 shapes + 2 gauge' : '17 — ends held leaves 11',
        },
        ...DIALS.map((d) => ({ label: d.label, value: d.read(state).toFixed(3) })),
        { label: 'beads off centre', value: offCentre.toFixed(3) },
        { label: 'out of plane', value: shape.outOfPlane.toFixed(3), tone: 'ok' as const },
        { label: 'κ spread', value: shape.curvatureSpread.toFixed(3), tone: 'ok' as const },
        { label: 'min W(t)', value: denominatorFloor(state).toFixed(3), tone: 'ok' as const },
        /*
         * The bend's magnitude, replacing a readout that said "h under bend: unchanged". That was
         * hardcoded, and true BY CONSTRUCTION — `mobiusImage` copies h — so it read as a measurement
         * while measuring nothing. What actually verifies the claim is "on the family" above: the
         * bent coefficients still satisfy ⟨P′,P′⟩ = h² with the SAME h, to ~1e-13.
         */
        { label: 'bend |s|', value: Math.hypot(bend.x, bend.y, bend.z).toFixed(3) },
        ...(stalled ? [{ label: 'step', value: 'not reached' }] : []),
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <span className="inline-flex rounded overflow-hidden border border-slate-300">
            {(['strict', 'free'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setGrabbed(null); setStalled(false) }}
                className={`px-2 py-[0.15em] ${mode === m ? 'bg-slate-700 text-white' : 'hover:bg-slate-100'}`}
              >
                {m}
              </button>
            ))}
          </span>

          {/* The headline: bending is a constant matrix here, so it costs one slider per generator.
              Live in BOTH modes, because it is the slide's thesis rather than an editing tool. */}
          {AXES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1">
              <span className="text-slate-400">{label}</span>
              <input
                type="range"
                min={-BEND_RANGE}
                max={BEND_RANGE}
                step={BEND_RANGE / 200}
                value={bend[key]}
                onChange={(e) => setBend((b) => ({ ...b, [key]: Number(e.target.value) }))}
                className="w-28"
              />
            </label>
          ))}

          <span className="text-slate-300">|</span>

          {/* The four strict dials — all scalars, so all sliders. Hidden in free, where dragging
              spends the same dimensions and a slider would only fight the cursor. */}
          {strict ? (
            DIALS.map((d) => (
              <label key={d.key} className="flex items-center gap-1">
                <span className="text-slate-400">{d.label}</span>
                <input
                  type="range"
                  min={DIAL_RANGE[d.key][0]}
                  max={DIAL_RANGE[d.key][1]}
                  step={(DIAL_RANGE[d.key][1] - DIAL_RANGE[d.key][0]) / 200}
                  value={asked[d.key]}
                  onChange={(e) => setDial(d.key, d.coordinate, Number(e.target.value))}
                  className="w-20"
                />
              </label>
            ))
          ) : (
            <span className="text-slate-400">drag any point — the ends hold unless you grab one</span>
          )}

          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>Nothing was bent to make this one.</b> The control points sit directly in the space where
          Möbius transformations are linear. Yet nothing five-dimensional is drawn: a conformal
          vector’s coordinates <i>are</i> weight, centre and radius, so the seven centres are the
          ordinary control points and the ends have radius <b>zero</b>. The two <b>outer</b> spheres
          are determined — <i>ρ₁ = ‖P₁−P₀‖</i>, <i>ρ₅ = ‖P₅−P₆‖</i> — so they{' '}
          <b>grip the endpoints</b>; <i>ρ₂</i>, <i>ρ₃</i> and <i>ρ₄</i> are pinned to nothing and get
          sliders, because a radius is a number and not a place. The beads on the legs are the{' '}
          <b>weights</b>: six legs, six ratios, so all six at the midpoints would mean polynomial —
          the rationality is how far off-centre they sit. They are a <b>readout</b>, not a handle;
          move anything else and watch them answer.{' '}
          <b>The bend sliders are the payoff.</b> A Möbius transformation is a <b>constant matrix</b>{' '}
          here, so it acts on each control point <i>independently</i> — <b>the spheres stay spheres,
          the beads stay Farin beads, the polygon maps one point for one point, and the degree does
          not move.</b> Bend it and <i>h</i> does not even change: the speed numerator is a Möbius{' '}
          <b>invariant</b>, and only the weight answers — the bent coefficients still satisfy{' '}
          ⟨P′,P′⟩ = h² with the <i>same</i> h, which is what the residual readout is checking. On the
          previous slide the same transformation turned 8 control points into 15.{' '}
          <b>Strict</b> holds the outer two at each end — twelve coordinates against seventeen — and
          what is left is <b>four shapes</b>, which is why there are four dials and not three: the
          three free radii are one short, and the arc length is the fourth. P₂, P₃, P₄ are outputs,
          drawn grey. <b>Free</b> hides the dials and makes every point a handle, with the ends held
          unless you grab one.{' '}
          <span className="text-slate-400">
            Degree 6 and not 5: a real root of the denominator forces the whole member to factor, and
            a real polynomial of odd degree always has one — so an odd conformal degree is always a
            lower-degree curve wearing a bigger polygon. Of the 17 dimensions, 10 are Möbius motions
            and 7 change the shape; holding the ends leaves 11, holding the four leaves 4. Drag the
            background to rotate.
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

      {/*
        THE FARIN BEADS ARE A READOUT IN BOTH MODES, and that is the whole of the weights' display:
        one bead per leg, six legs, six ratios after the overall scale, at the midpoint when the two
        weights are equal — so all six centred would mean polynomial, and how far off-centre they sit
        IS the rationality.

        They used to be draggable and it did not work. Two reasons, and neither is worth repairing
        here. The mechanical one: `dragFarin` clamps every event to 0.03 in the ratio, so the bead
        crawled several events behind the cursor and read as dead. The structural one is better —
        in STRICT the four dials already spend the slice, so a bead drag is a fifth ask on a
        four-dimensional space; and in FREE the eleven dimensions are what the SEVEN POINTS are for,
        with the weights answering. A weight handle competing with a point handle for the same
        dimensions is two controls for one freedom.

        So: nothing here is grabbable, and what the beads are for is watching them ANSWER — turn a
        dial or drag a point and the rationality moves on its own.
      */}
      {beads.map((b, i) =>
        Number.isFinite(b.x) ? (
          <Point3D key={`bead${i}`} position={tri(b)} color={FIG.color.derived} radius={0.028} derived />
        ) : null,
      )}

      {/*
        The control points. In STRICT only P₀ P₁ P₅ P₆ are handles — twelve coordinates against
        seventeen — and P₂ P₃ P₄ are drawn grey as the outputs they are. Dragging one holds the other
        THREE explicitly (`pin`), not merely the ends: measured, all four track the cursor to 100%
        with the others held to 1e-15 while the interior absorbs (|ΔP₃| = 0.32 on a 0.15 ask).
        In FREE every point is a handle and only the ENDS are held — and `dragControlPoint` drops the
        dragged index from its own pin list, so grabbing an end frees it, which is the gesture asked
        for. → strictOnPinnedPoints.test.ts
      */}
      {cps.map((p, i) => {
        const handle = !strict || PIN.includes(i)
        if (!handle) {
          return <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.derived} radius={0.038} derived />
        }
        return (
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
              const step = strict
                ? dragControlPoint(state, i, { x, y, z }, { pin: PIN })
                : dragControlPoint(state, i, { x, y, z }, { pinEnds: true })
              if (step.converged) { commit(step.state); setStalled(false) } else setStalled(true)
            }}
          />
        )
      })}

      {/* the endpoints again, marked so it is clear they are the curve's ends and radius-zero */}
      {[0, DEGREE].map((i) => (
        <Point3D key={`end${i}`} position={tri(cps[i])} color={FIG.color.pinned} radius={0.016} />
      ))}
    </Figure3D>
  )
}
