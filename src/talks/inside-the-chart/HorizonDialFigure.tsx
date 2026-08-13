// ============================================================================
// THE HORIZON DIAL — turn the chart's own coordinate until it runs out.
//
// WHAT THIS FIGURE IS FOR. The λ-chart misses the σ = 0 stratum, where the circle and the whole
// conformal family live. The question a picture can settle is whether that stratum is an ISLAND or
// an EDGE: can you approach it continuously from inside the chart, or must you jump?
//
// THE COORDINATE IS AN ANGLE, and that is a measured decision rather than a styling one. σ(r) falls
// off as 1/λ², so a linear λ slider can never arrive and spends nearly all its travel doing nothing
// — which is exactly why λ felt like a bad handle when arc length moved 0.3% across λ ∈ [−39, 41].
// Substituting λ = tan θ puts the stratum at θ = ±90°, with σ(r) ∝ cos²θ arriving smoothly at the
// end of a finite slider. Measured in stratumIsTheHorizon.test.ts.
//
// AND THE THING THE FIGURE EXISTS TO SHOW, which contradicted the expectation it was built on. The
// pole appears on the tangent indicatrix as a CUSP, and the natural guess is that the cusp fades as
// the pole stops being a pole. IT DOES NOT. |T′(r)| stays at machine zero for every θ — the cusp is
// there at every angle — while the indicatrix speed just off the pole GROWS by a factor of seven.
// The corner sharpens as the coordinate collapses.
//
// That is consistent rather than strange: at any finite θ, σ(r) ≠ 0, so it IS a genuine pole, the
// curve does reach infinity, and the cusp is real. The cusp goes only AT σ(r) = 0, which is θ = 90°
// exactly — a value the chart does not contain. So the coordinate approaches the boundary
// continuously while the geometry changes discontinuously at it, and the two readouts moving in
// opposite directions are the whole argument.
//
// DEGREE 4, ONE POLE, deliberately. deg c = 2n − m + 1 = 4 for a spinor of degree 2 and one pole:
// nine coordinates in all, 8 fibre + 1 dial, which is the count slide 1 promises the viewer can
// move. The quintic with two poles is the next figure, where "two of everything" is the point.
//
// A NOTE ON WHY THIS FIGURE EXISTS AT ALL. Building it found a production bug: familyBasis returned
// SHORT bases at large |λ|, so withDial failed at scattered angles on exactly this dial. That bug
// had also faked a headline number elsewhere (an arc-length spread of ×510; the true figure is
// 1.03). Fixed in familyBasisConditioning.test.ts — without which this slider would have holes in it.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  dataOf,
  familyBasis,
  phDefect,
  toMember,
  unpackSpinor,
  withDial,
} from '../../core/rationalPHMultiPoleSpatial'
import {
  indicatrixArc,
  indicatrixAt,
  indicatrixLoop,
  indicatrixSpeedAt,
  sphereResidual,
} from '../../core/tangentIndicatrix'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const POLE = 1.7
const ZERO = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

/** A degree-2 spinor drawn from the fibre at λ = 0 — the member the dial starts on. */
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [POLE], lambdas: [0] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()
/** Held for the whole sweep: the dial moves WITHIN the fixed-data fibre, so the ends never drift. */
const TARGET = dataOf(toMember(SEED))

const BOUNDS = {
  min: [-1.25, -1.25, -1.25] as [number, number, number],
  max: [1.25, 1.25, 1.25] as [number, number, number],
}
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const GREAT_CIRCLES: [number, number, number][][] = [0, 1, 2].map((axis) =>
  Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96
    const c = Math.cos(a)
    const s = Math.sin(a)
    return (axis === 0 ? [0, c, s] : axis === 1 ? [c, 0, s] : [c, s, 0]) as [number, number, number]
  }),
)

/**
 * σ(r) = |𝒜(r)|², divided by the spinor's own coefficient scale so the readout means something as
 * the coefficients blow up near the horizon. Without this the number is unreadable exactly where
 * the figure is trying to make a point.
 */
function sigmaAtPole(prm: MultiPoleParams): number {
  const A = prm.A
  let u = 0, v = 0, p = 0, q = 0
  for (let k = A.length - 1; k >= 0; k--) {
    u = u * POLE + A[k].u; v = v * POLE + A[k].v; p = p * POLE + A[k].p; q = q * POLE + A[k].q
  }
  const s = Math.max(...A.flatMap((a) => [Math.abs(a.u), Math.abs(a.v), Math.abs(a.p), Math.abs(a.q)]))
  return (u * u + v * v + p * p + q * q) / (s * s)
}

export default function HorizonDialFigure() {
  const [theta, setTheta] = useState(0)
  const [live, setLive] = useState<MultiPoleParams>(SEED)
  const [at, setAt] = useState(0.4)

  const member = useMemo(() => toMember(live), [live])

  const whole = useMemo(() => indicatrixLoop(member).map(tri), [member])
  const used = useMemo(() => indicatrixArc(member, 0, 1).map(tri), [member])
  const cusp = useMemo(() => tri(indicatrixAt(member, POLE)), [member])
  const marker = useMemo(() => tri(indicatrixAt(member, at)), [member, at])
  /** A short arc straddling the pole — the corner itself, so the sharpening is visible and not only read. */
  const corner = useMemo(() => indicatrixArc(member, POLE - 0.28, POLE + 0.28, 80).map(tri), [member])

  const atCusp = indicatrixSpeedAt(member, POLE)
  const offCusp = indicatrixSpeedAt(member, POLE + 0.05)
  const sigma = sigmaAtPole(live)

  /** θ drives λ = tan θ. The data is HELD, so this is motion inside one fibre, not a new problem. */
  const turn = useCallback((deg: number) => {
    setTheta(deg)
    const next = withDial(SEED, TARGET, { lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) } })
    if (next) setLive(next)          // hold the last good member rather than blanking the figure
  }, [])

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴛ = 𝒜 i 𝒜* / |𝒜|²', 'λ = tan θ — the horizon is θ = ±90°', 'σ(r) ∝ cos²θ']}
      readouts={[
        // The two numbers that move in OPPOSITE directions. That contrast is the whole figure.
        { label: 'σ(r) — the coordinate', value: sigma.toExponential(1), tone: sigma < 1e-3 ? ('warn' as const) : ('ok' as const) },
        { label: '|T′(r)| — the cusp', value: atCusp.toExponential(1), tone: 'ok' as const },
        { label: '|T′| just off it', value: offCusp.toExponential(2), tone: 'ok' as const },
        { label: 'λ', value: Math.abs(Math.tan((theta * Math.PI) / 180)) > 999 ? '≫' : Math.tan((theta * Math.PI) / 180).toFixed(1) },
        { label: 'PH defect', value: phDefect(member).toExponential(1), tone: 'ok' as const },
        { label: '‖T‖ − 1', value: sphereResidual(member).toExponential(1), tone: 'ok' as const },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">θ toward the horizon</span>
            <input
              type="range"
              min={-89.9}
              max={89.9}
              step={0.1}
              value={theta}
              onChange={(e) => turn(Number(e.target.value))}
              className="w-56"
            />
            <span className="tabular-nums text-slate-400 w-14">{theta.toFixed(1)}°</span>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">t along the curve</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.002}
              value={at}
              onChange={(e) => setAt(Number(e.target.value))}
              className="w-28"
            />
          </label>
        </span>
      }
      caption={
        <>
          <b>Turn θ and watch two numbers move opposite ways.</b> The chart&rsquo;s own coordinate{' '}
          <i>σ(r)</i> collapses — five orders of magnitude by 89.9° — because σ(r) falls off as 1/λ²
          and <b>λ = tan θ</b> puts the σ = 0 stratum at ±90°. That stratum is where the circle and
          the whole conformal family live, and this dial is the walk toward it.{' '}
          <b>But the cusp does not fade.</b> <i>|T′(r)|</i> stays at machine zero the whole way — the
          violet corner is there at <i>every</i> angle — while the speed just off the pole{' '}
          <b>grows sevenfold</b>. The corner <i>sharpens</i> as the coordinate runs out.{' '}
          <span className="text-slate-400">
            That is not a paradox, and it is the point. At any finite θ, σ(r) ≠ 0, so this really is a
            pole, the curve really does reach infinity, and the cusp is real. The cusp goes only{' '}
            <i>at</i> σ(r) = 0 — θ = 90° exactly, a value the chart does not contain. So the
            coordinate approaches the boundary continuously while the geometry jumps at it, which is
            why the σ = h·w family needs a chart of its own rather than a soft edge on this one. The
            curve is a rational PH <b>quartic</b>: one pole, one dial, eight fibre directions. Drag
            the background to rotate.
          </span>
        </>
      }
    >
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.11} depthWrite={false} roughness={0.9} />
      </mesh>

      {GREAT_CIRCLES.map((c, i) => (
        <Curve3D key={`gc${i}`} points={c} color={FIG.color.controlPolygon} width={1} />
      ))}

      <Curve3D points={whole} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />
      {/* the corner itself, drawn heavy so the sharpening is seen and not only read */}
      <Curve3D points={corner} color={FIG.color.pole} width={2.5} />

      <Curve3D points={[[0, 0, 0], marker]} color={FIG.color.dataPoint} width={1.5} />
      <Point3D position={marker} color={FIG.color.dataPoint} radius={0.045} />
      <Point3D position={cusp} color={FIG.color.pole} radius={0.05} />
    </Figure3D>
  )
}
