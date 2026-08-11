// ============================================================================
// SLIDE 16 — THE FIBER YOU CAN SWEEP, AND THE TWO DIALS THAT DEFORM IT.
//
// This figure exists to beat the previous one on the three things that made the POLYNOMIAL fiber
// (slide 6) beautiful: it closes, you can see all of it at once, and it says something. The rational
// fiber measured as a bare road had none of those. But the one-pole family mixes two kinds of freedom:
//
//   · a compact HOPF PHASE — prescribing c′(0) pins 𝒜(0) only up to a circle. Hold the two dials and
//     what is left is a CLOSED LOOP (measured: returns after wandering 1.04, closure 3.9e-3).
//   · λ and r — non-compact. λ is the frame TWIST at the pole; r is where the curve passes through
//     INFINITY. These deform the loop, and the second one has a visible end.
//
// SO THE THREE THINGS IT DOES THAT NO OTHER FIGURE IN THIS DECK CAN:
//
//   1. The PH readout NEVER MOVES. Every other figure here reports a residual that drifts as you drag,
//      because a solver is holding the invariant. Here PH is a substitution: 𝒜 i 𝒜̄ IS the Wronskian, so
//      the defect sits at 1e-15 permanently and cannot do otherwise. That is the visceral difference
//      between "the solver held it" and "it is not a thing that can fail".
//   2. The sliders have NAMES. Slide 15's leftover dimension could only be called "along the road".
//      Here they are TWIST and POLE, and twist is a frame quantity — the deck's own subject.
//   3. The limit names itself. Push the pole and the readout says how close infinity is to the curve
//      while the end speed visibly diverges. A geometric event, not a solver failure.
//
// AND IT IS FAST: 0.014 ms to build a member, so the current curve follows a gesture instantly. The
// loop WALK is different — one PROJECTION per sample, ~200 of them — so it is rebuilt when a gesture
// SETTLES, never per frame. That split is why the figure stays responsive: during a drag the live curve
// re-solves (about a millisecond) while the pale family stays as it was, and refreshes on release.
//
// THE FAR ENDPOINT IS A HANDLE, because it is already one of the three data items. Dragging it changes
// the DATA, hence the fiber, so the loop it belongs to is a different loop — which is exactly the thing
// worth feeling. (The start point is NOT a handle: c(0) is the origin by the translation gauge, so
// moving it would only translate the picture.) With 8 parameters against 6 conditions the drag has slack
// and minimum norm spends it; where no member exists the readout says so rather than lying.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures. The
// numbers above are pinned in core/__tests__/rationalPHOnePoleSpatial.test.ts and onePoleLoop.test.ts.
// ============================================================================
import { useCallback, useMemo, useState } from 'react'
import type { Vec3 } from '../../core/quaternion'
import {
  type OnePoleParams,
  controlStructure,
  curveAt,
  dataOf,
  derivativeAt,
  fiberLoop,
  phDefect,
  poleMargin,
  projectToData,
  speedAt,
  toMember,
  withDial,
} from '../../core/rationalPHOnePoleSpatial'
import Figure3D, { Curve3D, DragPoint3D, Point3D } from '../framework/Figure3D'
import { FIG } from '../framework/figureStyle'

const SEED: OnePoleParams = {
  b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
  b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
  lambda: 0.6,
  pole: 1.7,
}

const tri = (v: Vec3): [number, number, number] => [v.x, v.y, v.z]
const SAMPLES = 90

const sample = (prm: OnePoleParams): [number, number, number][] => {
  const m = toMember(prm)
  return Array.from({ length: SAMPLES + 1 }, (_, k) => tri(curveAt(m, k / SAMPLES)))
}

/** The loop, thinned for drawing: every few samples is enough to read the family as a family. */
function loopOf(prm: OnePoleParams): { members: OnePoleParams[]; ghosts: [number, number, number][][] } {
  const members = fiberLoop(prm, { steps: 96, stride: 0.05 })
  const stride = Math.max(1, Math.floor(members.length / 28))
  return { members, ghosts: members.filter((_, i) => i % stride === 0).map(sample) }
}

const BOUNDS = (() => {
  // Framed from the seed loop, generously: the dials reshape well past the seed's own extent and a
  // camera that reframes mid-gesture is worse than one framed a little wide.
  const pts = loopOf(SEED).ghosts.flat()
  const pad = 0.6
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), zs = pts.map((p) => p[2])
  return {
    min: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.min(...zs) - pad] as [number, number, number],
    max: [Math.max(...xs) + pad, Math.max(...ys) + pad, Math.max(...zs) + pad] as [number, number, number],
  }
})()

const SEED_DATA = dataOf(toMember(SEED))

export default function RationalPHLoopFigure() {
  /**
   * Two tiers, and the split is what keeps the figure responsive. `live` is the member on screen and
   * costs ~1 ms to re-solve, so it follows a gesture. `committed` carries the walked loop, which costs
   * ~200 projections, so it is rebuilt only when a gesture ENDS. During a drag the pale family is
   * therefore momentarily the old fiber — correct, and it refreshes on release.
   */
  const [live, setLive] = useState<OnePoleParams>(SEED)
  const [target, setTarget] = useState<number[]>(SEED_DATA)
  const [committed, setCommitted] = useState(() => ({ anchor: SEED, ...loopOf(SEED) }))
  const [phase, setPhase] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [stalled, setStalled] = useState(false)

  const lambda = live.lambda
  const pole = live.pole
  const loop = committed

  /** Rebuild the walked loop around wherever the gesture left us. */
  const settle = useCallback((prm: OnePoleParams) => {
    setCommitted({ anchor: prm, ...loopOf(prm) })
    setPhase(0)
  }, [])

  const here = dragging
    ? live
    : loop.members[Math.min(loop.members.length - 1, Math.round(phase * (loop.members.length - 1)))]
  const member = useMemo(() => toMember(here), [here])

  const curve = useMemo(() => sample(here), [here])
  const control = useMemo(() => controlStructure(member), [member])
  const defect = useMemo(() => Math.max(phDefect(member), member.consistency), [member])
  const endSpeed = speedAt(member, 1)
  const margin = poleMargin(here)

  const reset = (): void => {
    setLive(SEED)
    setTarget(SEED_DATA)
    setStalled(false)
    setDragging(false)
    settle(SEED)
  }

  /** A dial re-solves the SAME data at a new λ or r. Cheap, so it runs live. */
  const dial = (next: { lambda?: number; pole?: number }): void => {
    const ok = withDial(live, target, {
      lambda: next.lambda ?? lambda,
      pole: next.pole ?? pole,
    })
    if (!ok) { setStalled(true); return }
    setStalled(false)
    setLive(ok)
  }

  /**
   * Drag the far endpoint: the DATA moves, so this is a different fiber. The start tangent is kept, the
   * dials are kept, and the 8 parameters absorb the 6 conditions with slack to spare.
   */
  const dragEnd = ([x, y, z]: [number, number, number]): void => {
    const next = [target[0], target[1], target[2], x, y, z]
    const solved = projectToData(live, next)
    const err = Math.hypot(...dataOf(toMember(solved)).map((v, i) => v - next[i]))
    if (err > 1e-7) { setStalled(true); return }
    setStalled(false)
    setTarget(next)
    setLive(solved)
  }

  return (
    <Figure3D
      bounds={BOUNDS}
      base={{ width: 900, height: 430 }}
      notation={[
        'ᴄ = p/w,  w = t − r',
        '𝒜 i Ā = p′w − pw′',
        '‖ᴄ′‖ = |𝒜|²/w²',
      ]}
      readouts={[
        // The point of the figure: this number cannot move.
        { label: 'PH defect', value: defect.toExponential(1), tone: 'ok' as const },
        { label: 'twist λ', value: lambda.toFixed(3) },
        { label: 'pole r', value: pole.toFixed(3) },
        {
          label: 'infinity to curve',
          value: margin.toFixed(3),
          tone: margin < 0.08 ? ('warn' as const) : ('ok' as const),
        },
        { label: '‖c′(1)‖', value: endSpeed.toFixed(1), tone: endSpeed > 40 ? ('warn' as const) : ('plain' as const) },
        { label: 'loop', value: `${loop.members.length} members`.padEnd(14, ' ') },
        { label: 'step', value: (stalled ? 'no member there' : '—').padEnd(16, ' ') },
      ]}
      controls={
        <span className="flex items-center gap-3 flex-wrap justify-center">
          <label className="flex items-center gap-1">
            <span className="text-slate-400">around the loop</span>
            <input
              type="range" min={0} max={1} step={0.004} value={phase}
              onChange={(e) => setPhase(Number(e.target.value))} className="w-36"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">twist</span>
            <input
              type="range" min={-1.6} max={2.4} step={0.02} value={lambda}
              onChange={(e) => dial({ lambda: Number(e.target.value) })}
              onPointerUp={() => settle(live)} onKeyUp={() => settle(live)} className="w-24"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">pole</span>
            <input
              type="range" min={1.04} max={3} step={0.01} value={pole}
              onChange={(e) => dial({ pole: Number(e.target.value) })}
              onPointerUp={() => settle(live)} onKeyUp={() => settle(live)} className="w-24"
            />
          </label>
          <button onClick={reset} className="px-2 py-[0.15em] rounded border border-slate-300 hover:bg-slate-100">
            reset
          </button>
        </span>
      }
      caption={
        <>
          <b>A fiber you can sweep, and two dials with names.</b> The start point, the start tangent and
          the far endpoint are held. What is left closes into a <b>loop</b> — the pale curves are the
          whole family at once — because the freedom is a <b>Hopf phase</b>, and a phase is an angle.
          Sweep it and you come back.{' '}
          <b>Then the two dials deform it, and both mean something.</b> <b>Twist</b> is the frame&apos;s
          rate of rotation <i>about</i> the tangent at the pole — measured, exactly{' '}
          <i>ω</i> = 2λ·<b>e</b>₁, purely tangential. <b>Pole</b> is where the curve passes through{' '}
          <b>infinity</b>: drive it down and watch <i>infinity to curve</i> shrink while ‖c′(1)‖ diverges.
          That is the family&apos;s honest limit — a geometric event, not a solver giving up.{' '}
          <span className="text-slate-400">
            And watch the <b>PH defect</b>: it does not move. Everywhere else in this deck a solver is
            holding the invariant and the residual drifts; here <b>𝒜 i 𝒜̄ IS the Wronskian</b>, so PH is a
            substitution and cannot fail. A member costs 0.014 ms to build — no Newton, no cached seed.
            The interior control points are <i>outputs</i>, drawn grey — nothing is solved from them. The
            start point is pinned because c(0) is the origin by the translation gauge, so moving it would
            only slide the picture. Drag the background to rotate.
          </span>
        </>
      }
    >
      {/* the whole family at once — the thing that made the polynomial fiber beautiful */}
      {loop.ghosts.map((g, i) => (
        <Curve3D key={`ghost${i}`} points={g} color={FIG.color.derived} width={1} />
      ))}

      <Curve3D points={control.points.map(tri)} color={FIG.color.controlPolygon} width={1} dashed />
      <Curve3D points={curve} color={FIG.color.curve} width={3.5} />

      {/* control points are DERIVED here — nothing is solved from them */}
      {control.points.map((p, i) => (
        <Point3D key={`cp${i}`} position={tri(p)} color={FIG.color.derived} radius={0.04} derived />
      ))}

      {/* the start is pinned — it is the origin by the translation gauge, so moving it only translates */}
      <Point3D position={tri(curveAt(member, 0))} color={FIG.color.pinned} radius={0.055} />

      {/* the FAR endpoint is a handle: it is one of the three data items, so dragging it changes fibers */}
      <DragPoint3D
        position={tri(curveAt(member, 1))}
        color={dragging ? FIG.color.dataPointDrag : FIG.color.dataPoint}
        radius={0.058}
        onDragStart={() => { setDragging(true); setStalled(false) }}
        onDragEnd={() => { setDragging(false); settle(live) }}
        onDrag={dragEnd}
      />

      {/* the held start tangent, so the pinned data is visible rather than asserted */}
      <Curve3D
        points={[tri(curveAt(member, 0)), tri((() => {
          const c0 = curveAt(member, 0)
          const d0 = derivativeAt(member, 0)
          const n = Math.hypot(d0.x, d0.y, d0.z) || 1
          const s = 0.5 / n
          return { x: c0.x + d0.x * s, y: c0.y + d0.y * s, z: c0.z + d0.z * s }
        })())]}
        color={FIG.color.pinned}
        width={2}
      />
    </Figure3D>
  )
}
