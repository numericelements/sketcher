// ============================================================================
// SLIDE 17 — THE SAME THING WITH TWO POLES, SO THE PREVIOUS SLIDE HAS SOMETHING TO BE COMPARED WITH.
//
// Slide 16 is the one-pole family: degree 4, one twist dial, one pole. This is m = 2: degree 5, TWO twist
// dials, TWO poles. Keeping both slides is the point — the difference between them IS the experience of
// adding a pole, and adding one is not a control you can put on a slider (it changes the curve degree and
// the whole parameter space).
//
// WHY IT WORKS AT ALL, and it needed checking before it was built (FOUNDATIONS F17, multiPoleLoop):
//
//   · the no-log condition is BILINEAR in (𝒜, λ), so one twist rate per root leaves it LINEAR in 𝒜 —
//     at any number of poles. Two linear solves, no elimination.
//   · the sweepable loop SURVIVES: fiber = 4n − 4m − 3, which is ONE exactly when n = m + 1. So each
//     extra pole buys a degree of curve AND a twist dial while keeping the loop one-dimensional.
//     Measured: the two-pole loop closes after wandering 0.177, gap 6.8e-4.
//
// WHAT TO LOOK FOR THAT SLIDE 16 CANNOT SHOW: the two poles are INDEPENDENT. Each has its own twist and
// its own place at infinity, and driving one toward the domain limits the curve while the other does
// nothing — so "the honest limit" becomes a property of a particular pole rather than of the family.
//
// AND WHAT IS UNCHANGED, which is the whole argument: the PH readout still does not move. 𝒜i𝒜̄ IS the
// Wronskian at any m, so PH remains a substitution rather than a constraint.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures. The
// numbers are pinned in core/__tests__/rationalPHMultiPoleSpatial.test.ts and multiPoleLoop.test.ts.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  controlStructure,
  curveAt,
  dataOf,
  derivativeAt,
  dragWithEndHeld,
  fiberLoop,
  phDefect,
  poleMargin,
  projectToData,
  seedQuintic,
  speedAt,
  toMember,
  withDial,
} from '../../core/rationalPHMultiPoleSpatial'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const SEED = seedQuintic()
const SEED_DATA = dataOf(toMember(SEED))
const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const SAMPLES = 90

const sample = (prm: MultiPoleParams): [number, number, number][] => {
  const m = toMember(prm)
  return Array.from({ length: SAMPLES + 1 }, (_, k) => tri(curveAt(m, k / SAMPLES)))
}

/** One walk gives the family; thinned for drawing. Each sample is a projection, so this is a settle cost. */
function loopOf(prm: MultiPoleParams): { members: MultiPoleParams[]; ghosts: [number, number, number][][] } {
  const members = fiberLoop(prm, { stride: 0.09, maxSteps: 400 })
  const stride = Math.max(1, Math.floor(members.length / 26))
  return { members, ghosts: members.filter((_, i) => i % stride === 0).map(sample) }
}

const BOUNDS = (() => {
  const pts = loopOf(SEED).ghosts.flat()
  const pad = 0.5
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), zs = pts.map((p) => p[2])
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

export default function RationalPHTwoPoleFigure() {
  /** Same two tiers as slide 16: `live` follows a gesture, the walked loop is rebuilt on release. */
  const [live, setLive] = useState<MultiPoleParams>(SEED)
  const [target, setTarget] = useState<number[]>(SEED_DATA)
  const [committed, setCommitted] = useState(() => loopOf(SEED))
  const [phase, setPhase] = useState(0)
  const [grabbed, setGrabbed] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  const [mode, setMode] = useState<'strict' | 'free'>('strict')
  const [origin, setOrigin] = useState<Vec3>({ x: 0, y: 0, z: 0 })

  const strict = mode === 'strict'
  const loop = committed
  const member = useMemo(() => toMember(live), [live])

  const settle = useCallback((prm: MultiPoleParams) => {
    setCommitted(loopOf(prm))
    setPhase(0)
  }, [])

  const shift = useCallback(
    (v: Vec3): [number, number, number] => [v.x + origin.x, v.y + origin.y, v.z + origin.z],
    [origin],
  )
  const curve = useMemo(
    () => sample(live).map(([x, y, z]) => [x + origin.x, y + origin.y, z + origin.z] as [number, number, number]),
    [live, origin],
  )
  const control = useMemo(() => controlStructure(member), [member])
  const defect = useMemo(() => Math.max(phDefect(member), member.noLog, member.wronskian), [member])
  const margin = poleMargin(live)

  /** Sweeping SELECTS a member, so it writes `live` — the same single-source rule as slide 16. */
  const sweep = (next: number): void => {
    setPhase(next)
    const idx = Math.min(loop.members.length - 1, Math.max(0, Math.round(next * (loop.members.length - 1))))
    setLive(loop.members[idx])
    setStalled(false)
  }

  const dial = (
    d: { lambda?: { index: number; value: number }; pole?: { index: number; value: number } },
  ): void => {
    const ok = withDial(live, target, d)
    if (!ok) { setStalled(true); return }
    setStalled(false)
    setLive(ok)
  }

  const dragEndpoint = ([x, y, z]: [number, number, number]): void => {
    const next = [target[0], target[1], target[2], x - origin.x, y - origin.y, z - origin.z]
    const solved = projectToData(live, next)
    if (Math.hypot(...dataOf(toMember(solved)).map((v, i) => v - next[i])) > 1e-6) { setStalled(true); return }
    setStalled(false)
    setTarget(next)
    setLive(solved)
  }

  /** FREE, with the ENDS HELD — see the slide-16 figure for why c(0) needs no pinning. */
  const dragFree = (index: number, [x, y, z]: [number, number, number]): void => {
    const last = control.points.length - 1
    const worldEnd = shift(curveAt(member, 1))
    if (index === 0) {
      const held = { x: worldEnd[0] - x, y: worldEnd[1] - y, z: worldEnd[2] - z }
      const solved = dragWithEndHeld(live, null, null, held)
      if (!solved) { setStalled(true); return }
      setStalled(false)
      setOrigin({ x, y, z })
      setLive(solved)
      return
    }
    const cursor = { x: x - origin.x, y: y - origin.y, z: z - origin.z }
    const held = index === last
      ? cursor
      : { x: worldEnd[0] - origin.x, y: worldEnd[1] - origin.y, z: worldEnd[2] - origin.z }
    const next = dragWithEndHeld(live, index === last ? null : index, index === last ? null : cursor, held)
    if (!next) { setStalled(true); return }
    setStalled(false)
    setLive(next)
  }

  const reset = (): void => {
    setLive(SEED)
    setTarget(SEED_DATA)
    setOrigin({ x: 0, y: 0, z: 0 })
    setGrabbed(null)
    setStalled(false)
    settle(SEED)
  }

  const toMode = (next: 'strict' | 'free') => (): void => {
    setMode(next)
    setStalled(false)
    setGrabbed(null)
    if (next === 'strict') { setTarget(dataOf(toMember(live))); settle(live) }
  }

  const slider = (
    label: string, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void,
  ) => (
    <label className="flex items-center gap-1" style={{ display: strict ? undefined : 'none' }}>
      <span className="text-slate-400">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => settle(live)} onKeyUp={() => settle(live)} className="w-20"
      />
    </label>
  )

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={['w = (t − r₁)(t − r₂)', '𝒜 i Ā = p′w − pw′', 'deg ᴄ = 2n − m + 1 = 5']}
      readouts={[
        { label: 'PH defect', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'twist λ₁, λ₂', value: `${live.lambdas[0].toFixed(2)}, ${live.lambdas[1].toFixed(2)}` },
        { label: 'poles', value: `${live.roots[0].toFixed(2)}, ${live.roots[1].toFixed(2)}` },
        {
          label: 'nearest to curve',
          value: margin.toFixed(3),
          tone: margin < 0.1 ? ('warn' as const) : ('ok' as const),
        },
        { label: '‖c′(1)‖', value: speedAt(member, 1).toFixed(1) },
        { label: 'loop', value: `${loop.members.length} members`.padEnd(14, ' ') },
        { label: 'step', value: (stalled ? 'no member there' : '—').padEnd(16, ' ') },
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
          {!strict ? <span className="text-slate-400">drag any control point — nothing is held</span> : null}
          <label className="flex items-center gap-1" style={{ display: strict ? undefined : 'none' }}>
            <span className="text-slate-400">loop</span>
            <input
              type="range" min={0} max={1} step={0.006} value={phase}
              onChange={(e) => sweep(Number(e.target.value))} className="w-28"
            />
          </label>
          {slider('λ₁', live.lambdas[0], -1.5, 2.2, 0.02, (v) => dial({ lambda: { index: 0, value: v } }))}
          {slider('λ₂', live.lambdas[1], -1.5, 2.2, 0.02, (v) => dial({ lambda: { index: 1, value: v } }))}
          {slider('r₁', live.roots[0], 1.06, 3.2, 0.01, (v) => dial({ pole: { index: 0, value: v } }))}
          {slider('r₂', live.roots[1], -3.2, -0.06, 0.01, (v) => dial({ pole: { index: 1, value: v } }))}
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        strict ? (
          <>
            <b>The same thing with two poles — degree 5, and two of everything.</b> Compare the previous
            slide: there the curve met infinity once and had one twist dial; here it meets infinity{' '}
            <b>twice</b>, and each place has <b>its own</b> twist rate. The two are independent — drive{' '}
            <b>r₁</b> toward the domain and the curve strains while <b>r₂</b> sits untouched, so the honest
            limit is a property of a <i>particular</i> pole rather than of the family.{' '}
            <b>And the loop survives.</b> Holding the four dials leaves{' '}
            <b>4n − 4m − 3 = 1</b> dimension, so there is still a family to sweep — the pale curves — and
            it still closes. Each extra pole buys a degree of curve <i>and</i> a dial without spending the
            loop.{' '}
            <span className="text-slate-400">
              Why any of it is possible: the no-log condition is <b>bilinear</b>, so one twist rate per
              root leaves it <b>linear</b> in the spinor — two linear solves at any number of poles, no
              elimination. And the <b>PH defect still does not move</b>, because 𝒜 i 𝒜̄ <i>is</i> the
              Wronskian whatever m is. Drag the far endpoint to change fibers; drag the background to
              rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free: nothing held, every control point a handle — on a quintic now.</b> Six control points,
            eighteen coordinates, over an <b>eight</b>-dimensional admissible space: none can be prescribed
            exactly and none needs to be. Drag one and the nearest member appears.{' '}
            <b>The PH defect still does not move</b>, at two poles as at one, because there is no invariant
            available to violate.{' '}
            <span className="text-slate-400">
              <b>The ends hold each other</b>, as on the previous slide: an interior drag leaves both
              endpoints put, and each endpoint drag leaves the other. c(0) needs no pinning because
              p(0) = 0 fixes it, so <b>P₀</b> slides the picture while the family re-solves. The refusals
              are geometric: a <b>pole</b> may not enter [0,1], and where no
              member exists the readout says <i>no member there</i>. Back to <b>strict</b> re-reads the
              data from wherever you left the curve. Drag the background to rotate.
            </span>
          </>
        )
      }
    >
      {strict
        ? loop.ghosts.map((g, i) => (
            <Curve3D
              key={`ghost${i}`}
              points={g.map(([x, y, z]) => [x + origin.x, y + origin.y, z + origin.z] as [number, number, number])}
              color={FIG.color.derived}
              width={1}
            />
          ))
        : null}

      <Curve3D points={control.points.map(shift)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curve} color={FIG.color.curve} width={3.5} />

      {control.points.map((p, i) => {
        const last = control.points.length - 1
        const handle = !strict || i === last
        if (!handle) {
          return <Point3D key={`cp${i}`} position={shift(p)} color={FIG.color.derived} radius={0.038} derived />
        }
        return (
          <DragPoint3D
            key={`cp${i}`}
            position={shift(p)}
            color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            radius={i === 0 || i === last ? 0.054 : 0.044}
            onDragStart={() => { setGrabbed(i); setStalled(false) }}
            onDragEnd={() => { setGrabbed(null); if (strict) settle(live) }}
            onDrag={(q) => (strict ? dragEndpoint(q) : dragFree(i, q))}
          />
        )
      })}

      {strict ? (
        <>
          <Point3D position={shift(curveAt(member, 0))} color={FIG.color.pinned} radius={0.052} />
          <Curve3D
            points={[
              shift(curveAt(member, 0)),
              shift((() => {
                const c0 = curveAt(member, 0)
                const d0 = derivativeAt(member, 0)
                const n = Math.hypot(d0.x, d0.y, d0.z) || 1
                const k = 0.45 / n
                return { x: c0.x + d0.x * k, y: c0.y + d0.y * k, z: c0.z + d0.z * k }
              })()),
            ]}
            color={FIG.color.pinned}
            width={2}
          />
        </>
      ) : null}
    </Figure3D>
  )
}
