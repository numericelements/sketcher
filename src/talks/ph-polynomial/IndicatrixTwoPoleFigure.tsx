// ============================================================================
// TWO POLES ON ONE SPHERE — the cusps count the poles.
//
// The sibling of IndicatrixFigure, and deliberately the same picture with one thing changed. Same sphere,
// same great circles, ONE indicatrix — but the curve underneath has two poles instead of one, so the track
// carries TWO cusps. That is the whole claim, and it is the answer to "does rationality need one cusp":
// no, it needs one per pole.
//
// WHAT DEGREE THIS TAKES. deg c = 2n − m + 1 for a spinor of degree n and m poles. Two poles with the
// sweepable one-dimensional fiber forces n = m + 1 = 3, so deg c = 5: a rational PH QUINTIC, with w
// quadratic. Note the parity flip, because it is the thing that looks wrong and is not — one pole gives
// EVEN degree (4, 6, 8: the classical rational PH families, including the conformal sextic at n = 3), two
// poles give ODD (5, 7). Since 2n is always even, the parity is decided by m alone. Measured across
// m = 1, 2, 3 in rationalPHDegreeParity.test.ts.
//
// THE CUSPS ARE SHALLOWER HERE, and the figure has to survive that. One pole has Σ = 0, so N′(r) and σ′(r)
// each vanish outright and the corner is sharp — |T′| climbs to 0.207 within 0.05 of the pole. With two
// poles Σ = ±0.3846 and NEITHER vanishes (|N′|/|N| = 0.769, exactly 2|Σ|); they are instead both 2Σ times
// themselves, so T′ cancels. Same geometric event by a different route, but the approach is gentler:
// |T′| only reaches 0.029/0.044 at the same distance. So the violet markers are load-bearing — without
// them a viewer would not find the corners by eye. Measured in tangentIndicatrix.test.ts.
//
// The mathematics is core/tangentIndicatrix, which asks only for {N, σ} — the reason this file is short:
// the multi-pole member exposes the same shape as the one-pole member, so the sphere came for free.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  dataOf,
  fiberLoop,
  phDefect,
  poleMargin,
  seedQuintic,
  toMember,
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

const SEED = seedQuintic()

const BOUNDS = {
  min: [-1.25, -1.25, -1.25] as [number, number, number],
  max: [1.25, 1.25, 1.25] as [number, number, number],
}
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

/** The three coordinate great circles — depth cue only, no mathematical content. */
const GREAT_CIRCLES: [number, number, number][][] = [0, 1, 2].map((axis) =>
  Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96
    const c = Math.cos(a)
    const s = Math.sin(a)
    return (axis === 0 ? [0, c, s] : axis === 1 ? [c, 0, s] : [c, s, 0]) as [number, number, number]
  }),
)

/**
 * Walked for its members: "around the loop" selects one, so the list has to exist.
 *
 * NOTE THE OPTION NAMES DIFFER BY MODULE, which cost a broken build. The one-pole `fiberLoop` takes
 * `steps`; this multi-pole one takes `maxSteps` (default 900) and only `stride`. This call was written by
 * copying the one-pole one, so it passed a `steps` that does not exist here — harmless at runtime, a type
 * error on `tsconfig.app.json`. The sibling RationalPHTwoPoleFigure uses { stride: 0.09, maxSteps: 400 };
 * this keeps stride 0.05 and the default cap, which is the behaviour that has been on screen.
 */
const fiberOf = (prm: MultiPoleParams): MultiPoleParams[] => fiberLoop(prm, { stride: 0.05 })

export default function IndicatrixTwoPoleFigure() {
  const [live, setLive] = useState<MultiPoleParams>(SEED)
  const [at, setAt] = useState(0.35)
  const [phase, setPhase] = useState(0)
  const [fiber, setFiber] = useState<MultiPoleParams[]>(() => fiberOf(SEED))

  const member = useMemo(() => toMember(live), [live])
  const roots = live.roots

  const whole = useMemo(() => indicatrixLoop(member).map(tri), [member])
  const used = useMemo(() => indicatrixArc(member, 0, 1).map(tri), [member])
  const cusps = useMemo(() => roots.map((r) => tri(indicatrixAt(member, r))), [member, roots])
  const marker = useMemo(() => tri(indicatrixAt(member, at)), [member, at])

  const onSphere = sphereResidual(member)
  const margin = poleMargin(live)

  const sweep = useCallback(
    (v: number) => {
      setPhase(v)
      setLive(fiber[Math.min(fiber.length - 1, Math.round(v * (fiber.length - 1)))])
    },
    [fiber],
  )

  /** A dial re-solves the same held data. Returns null when the move would leave the family. */
  const dial = useCallback(
    (d: { lambda?: { index: number; value: number }; pole?: { index: number; value: number } }) => {
      const next = withDial(live, dataOf(toMember(live)), d)
      if (next) setLive(next)
    },
    [live],
  )

  const settle = useCallback(() => setFiber(fiberOf(live)), [live])

  /** One slider per pole, each confined to its own side so the two roots cannot cross or enter [0,1]. */
  const poleSlider = (index: number) => {
    const r = roots[index]
    const negative = r < 0
    return (
      <label className="flex items-center gap-1" key={`pole${index}`}>
        <span className="text-slate-400">pole r{index === 0 ? '₁' : '₂'}</span>
        <input
          type="range"
          min={negative ? -2.6 : 1.06}
          max={negative ? -1.06 : 2.6}
          step={0.005}
          value={r}
          onChange={(e) => dial({ pole: { index, value: Number(e.target.value) } })}
          onPointerUp={settle}
          onKeyUp={settle}
          className="w-24"
        />
      </label>
    )
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['ᴛ = 𝒜 i Ā / |𝒜|²', 'w quadratic — two poles', 'ᴛ′(r₁) = ᴛ′(r₂) = 0']}
      readouts={[
        // Both cusps, so the claim of the slide is on screen as two numbers rather than one.
        {
          label: '|T′(r₁)|',
          value: indicatrixSpeedAt(member, roots[0]).toExponential(1),
          tone: 'ok' as const,
        },
        {
          label: '|T′(r₂)|',
          value: indicatrixSpeedAt(member, roots[1]).toExponential(1),
          tone: 'ok' as const,
        },
        { label: '‖T‖ − 1', value: onSphere.toExponential(1), tone: 'ok' as const },
        { label: 'PH defect', value: phDefect(member).toExponential(1), tone: 'ok' as const },
        { label: 'poles', value: `${roots[0].toFixed(2)}, ${roots[1].toFixed(2)}` },
        {
          label: 'infinity to curve',
          value: margin.toFixed(3),
          tone: margin < 0.08 ? ('warn' as const) : ('ok' as const),
        },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">around the loop</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.004}
              value={phase}
              onChange={(e) => sweep(Number(e.target.value))}
              className="w-32"
            />
          </label>
          {poleSlider(0)}
          {poleSlider(1)}
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
          <b>One sphere, one track, two cusps.</b> Everything is as on the previous sphere except the curve
          underneath: <b>w is quadratic</b>, so it meets infinity twice, and the indicatrix stops dead{' '}
          <b>twice</b> — read <i>|T′(r₁)|</i> and <i>|T′(r₂)|</i>, both machine zero. So the answer to
          &ldquo;does being rational cost one cusp?&rdquo; is <b>no — one per pole</b>. Move either{' '}
          <b>pole dial</b> and its own violet cusp walks while the other sits still; the poles are
          independent, which is the thing a single-pole picture cannot show.{' '}
          <b>The degree is 5 — a rational PH quintic</b> — and the parity is worth a sentence because it
          looks wrong. deg <i>c</i> = 2<i>n</i> − <i>m</i> + 1, and 2<i>n</i> is always even, so{' '}
          <b>the pole count alone decides parity</b>: one pole gives EVEN degree (4, 6, 8 — the classical
          rational PH families, the sextic among them), two poles give ODD.{' '}
          <span className="text-slate-400">
            <b>The corners are gentler here, and that is real rather than a drawing artifact.</b> A single
            pole has Σ = 0, so N′ and σ′ each vanish at it and the corner is sharp. With two poles
            Σ = ±0.3846 and neither vanishes — |N′|/|N| = 0.769, exactly 2|Σ| — but both equal 2Σ times
            themselves, so T′ cancels anyway. Same event, gentler approach: |T′| reaches 0.029 near the
            pole where the one-pole curve reaches 0.207. That is why the violet markers are drawn; by eye
            alone you would not find these corners. Drag the background to rotate.
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

      {/* One indicatrix. The pale half is the same member outside [0,1] — and both poles live there. */}
      <Curve3D points={whole} color={FIG.color.curveMuted} width={1.5} />
      <Curve3D points={used} color={FIG.color.curve} width={3.5} />

      <Curve3D points={[[0, 0, 0], marker]} color={FIG.color.dataPoint} width={1.5} />
      <Point3D position={marker} color={FIG.color.dataPoint} radius={0.045} />

      {cusps.map((c, i) => (
        <Point3D key={`cusp${i}`} position={c} color={FIG.color.pole} radius={0.05} />
      ))}
    </Figure3D>
  )
}
