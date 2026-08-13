// ============================================================================
// TWO STRAIGHT LINES BETWEEN THE SAME TWO CURVES — and only one of them stays PH.
//
// WHAT THIS FIGURE IS FOR. Slide 2 promised eight fibre directions and said the fibre is LINEAR. That
// sentence is easy to nod at and hard to feel. This figure makes it a gesture: pick one of the eight,
// slide along it, and watch the Pythagorean readout refuse to move — not converge, not drift, not
// recover. There is no solver behind the slider. Membership is a linear combination.
//
// AND THE COMPARISON IS WHAT MAKES IT AN ARGUMENT RATHER THAN A DEMONSTRATION. The two ends of the
// slide are two rational PH curves sharing a denominator, so the obvious thing — drag every control
// point in a straight line from one to the other — produces a rational curve of the same degree with
// the same poles. The grey tracks are those straight lines; the small grey points ride them. The dark
// points are where the CHART puts the control points at the same s, and they sit off the tracks. Two
// straight lines between the same two curves, one of them straight in the wrong coordinates.
//
// THE HONEST PART IS THE SIZE OF THE MISS. The pointwise blend is not wildly wrong. It is CLOSE — a
// part in fifty thousand to a part in a thousand, direction depending — and it is never PH, eleven to
// thirteen orders above the measure's own floor, which is pinned alongside it. That is
// the fact worth carrying away: you cannot land on this set by interpolating between points of it,
// and you cannot see the difference by looking at the curve. The chart is not a convenience; it is
// how you stay on the set at all.
//
// THE PHASE SLIDER IS A HANDLE THAT MOVES NOTHING, and it is here to keep the count honest. 𝒜 ↦ 𝒜e^{iθ}
// lies in the same eight-dimensional fibre and leaves N = 𝒜i𝒜* and σ = |𝒜|² untouched (F16). Turn it
// and the spinor readout climbs while the curve readout stays at machine zero. Eight coordinates,
// seven curves, at a fixed dial.
//
// NOTHING IS DRAGGABLE, deliberately. The sibling ph-interpolation deck already has the drag-anything
// rational figure; repeating it would cost the slide its point. Here the handles are the coordinates
// themselves, which is what "inside the chart" means.
//
// Every number is pinned in core/__tests__/theChartIsStraight.test.ts, at exactly this seed, this
// pole and these eight directions. r3f cannot be verified headlessly, so this file holds no
// mathematics — only marks and gestures.
// ============================================================================
import { useMemo, useState } from 'react'
import { qmul, type Quat, type Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  controlStructure,
  familyBasis,
  packSpinor,
  toMember,
  unpackSpinor,
} from '../../core/rationalPHMultiPoleSpatial'
import { type RationalCurve, blendCurves, pointOn, rationalPHResidual } from '../../core/rationalCurveBlend'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const POLE = 1.7
const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const BASE: MultiPoleParams = { A: ZERO, roots: [POLE], lambdas: [0.5] }
const BASIS = familyBasis(BASE)

const combine = (amps: readonly number[]): MultiPoleParams => {
  const x = new Array<number>(12).fill(0)
  BASIS.forEach((b, i) => { for (let j = 0; j < 12; j++) x[j] += (amps[i] ?? 0) * b[j] })
  return { ...BASE, A: unpackSpinor(x) }
}

const AMPS = BASIS.map((_, i) => 1.3 * Math.sin(1.7 * i + 0.6))

const curveOf = (prm: MultiPoleParams): RationalCurve => {
  const m = toMember(prm)
  return { p: m.p, w: m.w }
}

const SAMPLES = 120
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const draw = (c: RationalCurve): [number, number, number][] =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => tri(pointOn(c, i / SAMPLES)))

const gapBetween = (a: RationalCurve, b: RationalCurve): number => {
  let d = 0
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const u = pointOn(a, t), v = pointOn(b, t)
    d = Math.max(d, Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z))
  }
  return d
}

const step = (k: number, s: number): MultiPoleParams => combine(AMPS.map((v, i) => (i === k ? v + s : v)))

/**
 * s IS MEASURED IN CURVE DISPLACEMENT, not in spinor units, and that is the better gauge rather than
 * a framing convenience. The eight basis vectors are orthonormal in ℝ¹², which has no geometric
 * meaning whatever — one unit along direction 1 moves the curve 3.8 and one along direction 8 moves
 * it 1.4. Rescaling so that s = 1 means "1.8 units of curve" makes the slider comparable across the
 * eight and lets one camera frame all of them. The mathematics is untouched: a line is a line at any
 * parametrisation, and every claim here is pinned at unit spinor steps in the test.
 */
const SCALE = Array.from({ length: BASIS.length }, (_, k) =>
  1.8 / gapBetween(curveOf(step(k, 0)), curveOf(step(k, 1))))

/** Fibre direction k, walked a distance s. Every one of these is exactly PH, at every s. */
const along = (k: number, s: number): MultiPoleParams => step(k, s * SCALE[k])

const S_MIN = -0.3
const S_MAX = 1.3

/** Framed once, from every direction at both ends of the slider. */
const BOUNDS = (() => {
  const pts: [number, number, number][] = []
  for (let k = 0; k < BASIS.length; k++) {
    for (const s of [S_MIN, 0, S_MAX]) pts.push(...draw(curveOf(along(k, s))))
  }
  const pad = 0.5
  const axis = (i: number): [number, number] => [
    Math.min(...pts.map((p) => p[i])) - pad,
    Math.max(...pts.map((p) => p[i])) + pad,
  ]
  const [x0, x1] = axis(0), [y0, y1] = axis(1), [z0, z1] = axis(2)
  return { min: [x0, y0, z0] as [number, number, number], max: [x1, y1, z1] as [number, number, number] }
})()

export default function StraightLineFigure() {
  const [dir, setDir] = useState(6)
  const [s, setS] = useState(0.5)
  const [phase, setPhase] = useState(0)

  const ends = useMemo(() => ({ a: curveOf(along(dir, 0)), b: curveOf(along(dir, 1)) }), [dir])

  /** The chart's straight line, then the gauge turned on top of it. */
  const plain = useMemo(() => along(dir, s), [dir, s])
  const turned = useMemo(() => {
    const rot: Quat = { u: Math.cos(phase), v: Math.sin(phase), p: 0, q: 0 }
    return { ...plain, A: plain.A.map((q) => qmul(q, rot)) }
  }, [plain, phase])

  const lawful = useMemo(() => curveOf(turned), [turned])
  const naive = useMemo(() => blendCurves(ends.a, ends.b, s), [ends, s])

  const lawfulPoints = useMemo(() => controlStructure(toMember(turned)).points, [turned])
  const naivePoints = useMemo(() => {
    const pa = controlStructure(toMember(along(dir, 0))).points
    const pb = controlStructure(toMember(along(dir, 1))).points
    return pa.map((p, i) => ({
      x: (1 - s) * p.x + s * pb[i].x,
      y: (1 - s) * p.y + s * pb[i].y,
      z: (1 - s) * p.z + s * pb[i].z,
    }))
  }, [dir, s])
  /** Drawn over the SLIDER's range, not just [0,1] — the naive blend extrapolates, and so should its track. */
  const tracks = useMemo(() => {
    const pa = controlStructure(toMember(along(dir, 0))).points
    const pb = controlStructure(toMember(along(dir, 1))).points
    const at = (i: number, u: number): [number, number, number] => [
      (1 - u) * pa[i].x + u * pb[i].x,
      (1 - u) * pa[i].y + u * pb[i].y,
      (1 - u) * pa[i].z + u * pb[i].z,
    ]
    return pa.map((_, i) => [at(i, S_MIN), at(i, S_MAX)])
  }, [dir])

  /** What the phase did: to the spinor, and to the curve. The two numbers are the count. */
  const spinorMoved = useMemo(() => {
    const xa = packSpinor(plain.A), xb = packSpinor(turned.A)
    return Math.hypot(...xa.map((v, i) => v - xb[i]))
  }, [plain, turned])
  const curveMoved = useMemo(() => {
    const before = curveOf(plain)
    let d = 0
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const u = pointOn(before, t), v = pointOn(lawful, t)
      d = Math.max(d, Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z))
    }
    return d
  }, [plain, lawful])

  const chartPH = rationalPHResidual(lawful)
  const naivePH = rationalPHResidual(naive)

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['𝒜(s) = 𝒜₀ + s·b_k — linear', 'c_s = (1−s)c₀ + s c₁ — also linear', '𝒜 ↦ 𝒜e^{iθ} — invisible']}
      readouts={[
        { label: 'PH — chart line', value: chartPH.toExponential(1), tone: 'ok' as const },
        { label: 'PH — pointwise', value: naivePH.toExponential(1), tone: naivePH > 1e-10 ? ('warn' as const) : ('ok' as const) },
        { label: 'phase moved the spinor', value: spinorMoved.toFixed(2) },
        { label: '…and the curve', value: curveMoved.toExponential(1), tone: 'ok' as const },
        { label: 'direction', value: `${dir + 1} of 8` },
        { label: 's', value: s.toFixed(2) },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">direction</span>
            <input
              type="range" min={0} max={7} step={1} value={dir}
              onChange={(e) => setDir(Number(e.target.value))} className="w-24"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">slide along it</span>
            <input
              type="range" min={S_MIN} max={S_MAX} step={0.005} value={s}
              onChange={(e) => setS(Number(e.target.value))} className="w-48"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">Hopf phase</span>
            <input
              type="range" min={0} max={6.283} step={0.01} value={phase}
              onChange={(e) => setPhase(Number(e.target.value))} className="w-28"
            />
          </label>
        </span>
      }
      caption={
        <>
          <b>Two straight lines between the same two curves.</b> The pale curves are the ends. The{' '}
          <b>grey tracks</b> are the obvious path — drag every control point straight from one end to
          the other — and the small grey points ride them. The <b>dark points</b> are where the{' '}
          <i>chart</i> puts the control points at the same <i>s</i>, and they are not on the tracks.{' '}
          <b>Slide, and only one of the two readouts stays still.</b>{' '}
          <span className="text-slate-400">
            <b>PH — chart line</b> sits at machine zero for every <i>s</i>, in all eight directions,
            far outside <b>[0,1]</b> as well: the admissible spinors are a <i>linear subspace</i>, so a
            straight line in them cannot leave. Nothing is solving. <b>PH — pointwise</b> is the honest
            surprise — the naive blend is <i>close</i>, between a part in fifty thousand and a part in
            a thousand depending on which direction you pick, and it never lands. It is a perfectly
            good rational curve of the same degree with the same pole; it simply is not Pythagorean,
            eleven to thirteen orders above the floor this same measure reads on the chart&rsquo;s own
            curves. You cannot get onto this set by interpolating between points of it.{' '}
            <b>Then turn the Hopf phase.</b> The spinor readout climbs to 2 and the curve does not move
            at all — <b>𝒜 ↦ 𝒜e^{'{iθ}'}</b> leaves both <i>N</i> and <i>σ</i> alone. Eight
            coordinates, seven curves. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the two ends of the slide */}
      <Curve3D points={draw(ends.a)} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={draw(ends.b)} color={FIG.color.curveMuted} width={1.5} />

      {/* the obvious path, and where it lands */}
      {tracks.map((seg, i) => (
        <Curve3D key={`track${i}`} points={seg} color={FIG.color.controlPolygon} width={1} />
      ))}
      <Curve3D points={draw(naive)} color={FIG.color.derived} width={2} dashed />
      {naivePoints.map((p, i) => (
        <Point3D key={`np${i}`} position={tri(p)} color={FIG.color.derived} radius={0.035} derived />
      ))}

      {/* the chart's path */}
      <Curve3D points={draw(lawful)} color={FIG.color.curve} width={3.5} />
      {lawfulPoints.map((p, i) => (
        <Point3D key={`lp${i}`} position={tri(p)} color={FIG.color.pinned} radius={0.05} />
      ))}
    </Figure3D>
  )
}
