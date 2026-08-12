// ============================================================================
// ONE DIAL, TWO PANELS: the curve moves and the sphere does not.
//
// The converse of slide 17, and the pair is the point. There the interpolation data is held and sweeping the
// fiber moves the indicatrix by up to 1.94 on a unit sphere. Here the SPINOR is held, so the indicatrix
// cannot move at all — r = −2b/α gives r′ = −2μF/α², making the unit tangent ±F/|F| for every member of the
// solution space whatever b and μ are. A whole vector space of curves sits over one sphere picture.
//
// TWO VIEWPORTS, WHICH IS NEW IN THIS DECK, and necessary rather than decorative: "the sphere does not move"
// is only convincing if both are visible at once, and a unit sphere sharing a scale with a space curve reads
// badly. Each panel is a separate Figure3D so the framework still owns the Canvas, lighting, camera rig and
// the Safari-safe aspect box; only the chrome below is laid out here.
//
// CONTROLS GET THEIR OWN ROW. Figure3D's own header records why — a slider sharing a wrapping line with
// live-updating text gets shoved sideways mid-drag and the drag reads as a jump. That applies here too, so
// the readouts row and the control row are separate elements.
//
// THE CAMERA IS FRAMED ONCE, so the bounds must cover the WHOLE dial range rather than the current member —
// otherwise the curve walks out of view as you drag. DIAL_BOUNDS is sampled across the range at module load.
//
// All the mathematics is in core/rationalPHCubicFamily, pinned in rationalPHCubicFamily.test.ts.
// ============================================================================
import { useMemo, useState } from 'react'
import {
  curveAt,
  indicatrixAt,
  indicatrixDrift,
  mix,
  muFloorOn01,
  phDefect,
  speedAt,
  stationaryOn01,
} from '../../core/rationalPHCubicFamily'
import type { Vec3 } from '../../core/quaternion'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]

const S_MIN = -1.2
const S_MAX = 2

/** Framed once, so it has to hold every member the dial can reach. */
const DIAL_BOUNDS = (() => {
  const pts: Vec3[] = []
  for (let k = 0; k <= 24; k++) {
    const m = mix(S_MIN + ((S_MAX - S_MIN) * k) / 24)
    for (let i = 0; i <= 40; i++) pts.push(curveAt(m, i / 40))
  }
  const lo = [0, 1, 2].map((c) => Math.min(...pts.map((p) => [p.x, p.y, p.z][c])))
  const hi = [0, 1, 2].map((c) => Math.max(...pts.map((p) => [p.x, p.y, p.z][c])))
  const pad = 0.06 * Math.max(...[0, 1, 2].map((c) => hi[c] - lo[c]))
  return {
    min: [lo[0] - pad, lo[1] - pad, lo[2] - pad] as [number, number, number],
    max: [hi[0] + pad, hi[1] + pad, hi[2] + pad] as [number, number, number],
  }
})()

const SPHERE_BOUNDS = {
  min: [-1.25, -1.25, -1.25] as [number, number, number],
  max: [1.25, 1.25, 1.25] as [number, number, number],
}

const GREAT_CIRCLES: [number, number, number][][] = [0, 1, 2].map((axis) =>
  Array.from({ length: 97 }, (_, i) => {
    const a = (2 * Math.PI * i) / 96
    const c = Math.cos(a)
    const s = Math.sin(a)
    return (axis === 0 ? [0, c, s] : axis === 1 ? [c, 0, s] : [c, s, 0]) as [number, number, number]
  }),
)

/** The indicatrix depends only on the spinor, so it is computed ONCE and never recomputed. */
const INDICATRIX = (() => {
  const pts: [number, number, number][] = []
  const count = 600
  for (let i = 1; i < count; i++) pts.push(tri(indicatrixAt(Math.tan(Math.PI * (i / count - 0.5)))))
  return pts
})()
const INDICATRIX_USED = Array.from({ length: 121 }, (_, i) => tri(indicatrixAt(i / 120)))

const TONE: Record<string, string> = { ok: 'text-emerald-600', warn: 'text-amber-600', plain: 'text-slate-600' }

export default function SharedIndicatrixFigure() {
  const [s, setS] = useState(0)
  const [at, setAt] = useState(0.4)

  const member = useMemo(() => mix(s), [s])
  const curve = useMemo(
    () => Array.from({ length: 201 }, (_, i) => tri(curveAt(member, i / 200))),
    [member],
  )
  const { drift, skipped } = useMemo(() => indicatrixDrift(member), [member])
  const stops = useMemo(() => stationaryOn01(member), [member])
  const floor = muFloorOn01(member)

  const here = curveAt(member, at)
  const onSphere = tri(indicatrixAt(at))

  const readouts = [
    {
      // The skipped count is shown rather than swallowed: those samples sit where μ ≈ 0 and the tangent
      // direction is genuinely undefined, so excluding them is part of the measurement, not a tidy-up.
      label: 'indicatrix drift',
      value: `${drift.toExponential(1)}${skipped ? ` (${skipped} skipped at μ≈0)` : ''}`,
      tone: 'ok' as const,
    },
    { label: 'PH defect', value: phDefect(member).toExponential(1), tone: 'ok' as const },
    { label: 'curve degree', value: String(member.degree) },
    { label: 'mix s', value: s.toFixed(3) },
    { label: 'μ floor on [0,1]', value: floor.toFixed(5), tone: floor < 1e-3 ? ('warn' as const) : ('plain' as const) },
    {
      label: 'stationary points',
      value: stops.length ? stops.map((t) => t.toFixed(3)).join(', ') : 'none',
      tone: stops.length ? ('warn' as const) : ('ok' as const),
    },
    { label: '‖r′(t)‖', value: speedAt(member, at).toFixed(4) },
  ]

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Figure3D
            bounds={DIAL_BOUNDS}
            base={{ width: 430, height: 380 }}
            notation={['ᴄ = −2b/α', 'this panel MOVES']}
          >
            <Curve3D points={curve} color={FIG.color.curve} width={3.5} />
            <Point3D position={tri(here)} color={FIG.color.dataPoint} radius={0.006} />
            {stops.map((t, i) => (
              <Point3D key={`stop${i}`} position={tri(curveAt(member, t))} color={FIG.color.extrema} radius={0.007} />
            ))}
          </Figure3D>
        </div>
        <div className="flex-1 min-w-0">
          <Figure3D
            bounds={SPHERE_BOUNDS}
            base={{ width: 430, height: 380 }}
            notation={['ᴛ = ±𝒜 i Ā / |𝒜|²', 'this panel does NOT']}
          >
            <mesh>
              <sphereGeometry args={[1, 48, 32]} />
              <meshStandardMaterial color="#94a3b8" transparent opacity={0.11} depthWrite={false} roughness={0.9} />
            </mesh>
            {GREAT_CIRCLES.map((c, i) => (
              <Curve3D key={`gc${i}`} points={c} color={FIG.color.controlPolygon} width={1} />
            ))}
            <Curve3D points={INDICATRIX} color={FIG.color.curveMuted} width={1.5} />
            <Curve3D points={INDICATRIX_USED} color={FIG.color.curve} width={3.5} />
            <Curve3D points={[[0, 0, 0], onSphere]} color={FIG.color.dataPoint} width={1.5} />
            <Point3D position={onSphere} color={FIG.color.dataPoint} radius={0.045} />
          </Figure3D>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[0.42em]">
        {readouts.map((r, i) => (
          <span key={i} className={TONE[r.tone ?? 'plain']}>
            <span className="text-slate-400">{r.label} </span>
            {r.value}
          </span>
        ))}
      </div>

      {/* Own row, never sharing with the live values above — see the header. */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[0.42em]">
        <label className="flex items-center gap-1">
          <span className="text-slate-400">mix in the sextic</span>
          <input
            type="range"
            min={S_MIN}
            max={S_MAX}
            step={0.005}
            value={s}
            onChange={(e) => setS(Number(e.target.value))}
            className="w-44"
          />
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
            className="w-32"
          />
        </label>
      </div>

      <div className="text-center text-[0.44em] leading-snug text-slate-600 max-w-[46em] mx-auto">
        <b>One dial. The left panel changes shape; the right one cannot.</b> Every rational PH curve here is{' '}
        <b>r = −2b/α</b> subject to <b>αb′ − α′b = μ·𝒜i𝒜̄</b> — the construction of Kalkan, Scharler,
        Schröcker and Šír, which is a <i>linear system</i> and so reaches the null-spinor stratum where our own
        chart cannot go. Differentiating gives <b>r′ = −2μ·𝒜i𝒜̄/α²</b>, so the unit tangent is{' '}
        <b>±𝒜i𝒜̄/|𝒜|²</b> for <i>every</i> member, whatever b and μ are. <b>The indicatrix is a function of
        the spinor alone.</b> Hold 𝒜 and a whole vector space of curves remains free above one fixed sphere
        picture — read <i>indicatrix drift</i>, which stays at the finite-difference floor while the left panel
        visibly moves. <b>This is the exact converse of the fiber slide</b>: there the data is held and sweeping
        moves the indicatrix by up to 1.94; here the indicatrix is held and the curve moves instead.{' '}
        <span className="text-slate-400">
          <b>At s = 0 this is the published rational cubic</b>, reproduced to 0.0e+0. Any nonzero mix brings in
          the second truly rational member of the solution space, which has degree <b>six</b> — the readout
          says so, because the degree genuinely jumps rather than deforming. <b>And below s = −1/2 the curve
          stops.</b> ‖r′‖ = 2|μ|σ/α², so a real zero of μ is a true stationary point, not a numerical
          artifact; it enters at t = 1 and walks inward as you keep going, marked in amber, with ‖r′‖ there
          measured at 0.0e+0. That threshold is measured rather than derived — normalising the basis rescales
          μ, so the tidy value the raw system suggests is wrong. Drag either background to rotate.
        </span>
      </div>
    </div>
  )
}
