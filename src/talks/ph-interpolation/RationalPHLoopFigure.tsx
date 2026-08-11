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
// STRICT AND FREE. Strict is the above: the data held, a loop to sweep, two named dials. FREE releases
// the data and makes every control point a handle — and it is the sharper demonstration of the same
// point, because you can drag anything anywhere and the PH readout still does not move. There is no
// optimizer holding an invariant here; there is no invariant available to violate. Measured: P₁…P₄ track
// a long path at 100% with PH at 1e-15 (rationalPHOnePoleSpatial.test.ts).
//
// P₀ IS THE EXCEPTION, and it is structural rather than a limitation: c(0) is the origin by the
// translation gauge, so P₀ cannot move within the family. Dragging it therefore TRANSLATES the picture,
// which is exactly what moving it means — the figure owns that offset, not the core.
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
  dragWithEndHeld,
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
  const [grabbed, setGrabbed] = useState<number | null>(null)
  const [stalled, setStalled] = useState(false)
  const [mode, setMode] = useState<'strict' | 'free'>('strict')
  /** P₀'s drag is a translation, since c(0) is the origin by the gauge. The figure owns it. */
  const [origin, setOrigin] = useState<Vec3>({ x: 0, y: 0, z: 0 })

  const strict = mode === 'strict'

  const lambda = live.lambda
  const pole = live.pole
  const loop = committed

  /**
   * Rebuild the walked loop AROUND wherever the gesture left us. fiberLoop starts at its argument, so
   * resetting the sweep to 0 shows exactly the curve that is already on screen — the loop changes under
   * it without the curve moving.
   */
  const settle = useCallback((prm: OnePoleParams) => {
    setCommitted({ anchor: prm, ...loopOf(prm) })
    setPhase(0)
  }, [])

  /**
   * ONE source of truth for what is on screen. Sweeping the loop SELECTS a member, so it writes `live`
   * like every other gesture does — an earlier version indexed the loop for display while leaving `live`
   * behind, so switching to free (which shows `live`) jumped back to wherever the last dial had left it.
   */
  const here = live
  const member = useMemo(() => toMember(here), [here])

  const shift = useCallback(
    (v: Vec3): [number, number, number] => [v.x + origin.x, v.y + origin.y, v.z + origin.z],
    [origin],
  )
  const curve = useMemo(
    () => sample(here).map(([x, y, z]) => [x + origin.x, y + origin.y, z + origin.z] as [number, number, number]),
    [here, origin],
  )
  const control = useMemo(() => controlStructure(member), [member])
  const defect = useMemo(() => Math.max(phDefect(member), member.consistency), [member])
  const endSpeed = speedAt(member, 1)
  const margin = poleMargin(here)

  const reset = (): void => {
    setLive(SEED)
    setTarget(SEED_DATA)
    setStalled(false)
    setGrabbed(null)
    setOrigin({ x: 0, y: 0, z: 0 })
    settle(SEED)
  }

  /** Entering strict re-reads the data from wherever free left the curve, then rebuilds its fiber. */
  const toMode = (next: 'strict' | 'free') => (): void => {
    setMode(next)
    setStalled(false)
    setGrabbed(null)
    // Entering strict, the data is whatever free left on screen, and the fiber is rebuilt around it.
    // Entering free needs nothing: `live` is already the displayed curve.
    if (next === 'strict') {
      setTarget(dataOf(toMember(live)))
      settle(live)
    }
  }

  /**
   * FREE, with the ENDS HELD — the gesture the rest of this deck already has: move an interior point and
   * the endpoints stay put; move one endpoint and the other stays put.
   *
   * c(0) needs no holding: p(0) = 0 pins the translation, so the start cannot move within the family. So
   * an interior drag adds one condition (hold c(1) in WORLD space) and stays underdetermined — 6 against
   * 10 — with minimum norm spending the rest. Dragging P₀ is the mirror case: the picture translates to
   * the cursor while the family re-solves to leave c(1) where it was on screen.
   */
  const dragFree = (index: number, [x, y, z]: [number, number, number]): void => {
    const last = control.points.length - 1
    const worldEnd = shift(curveAt(member, 1))
    if (index === 0) {
      const nextOrigin = { x, y, z }
      const held = { x: worldEnd[0] - x, y: worldEnd[1] - y, z: worldEnd[2] - z }
      const solved = dragWithEndHeld(live, null, null, held)
      if (!solved) { setStalled(true); return }
      setStalled(false)
      setOrigin(nextOrigin)
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

  /** Sweeping selects a member of the committed loop — and writes it, so every mode sees the same curve. */
  const sweep = (next: number): void => {
    setPhase(next)
    const idx = Math.min(loop.members.length - 1, Math.max(0, Math.round(next * (loop.members.length - 1))))
    setLive(loop.members[idx])
    setStalled(false)
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
          {!strict ? (
            <span className="text-slate-400">drag any control point — nothing is held</span>
          ) : null}
          <label className="flex items-center gap-1" style={{ display: strict ? undefined : 'none' }}>
            <span className="text-slate-400">around the loop</span>
            <input
              type="range" min={0} max={1} step={0.004} value={phase}
              onChange={(e) => sweep(Number(e.target.value))} className="w-36"
            />
          </label>
          <label className="flex items-center gap-1" style={{ display: strict ? undefined : 'none' }}>
            <span className="text-slate-400">twist</span>
            <input
              type="range" min={-1.6} max={2.4} step={0.02} value={lambda}
              onChange={(e) => dial({ lambda: Number(e.target.value) })}
              onPointerUp={() => settle(live)} onKeyUp={() => settle(live)} className="w-24"
            />
          </label>
          <label className="flex items-center gap-1" style={{ display: strict ? undefined : 'none' }}>
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
        strict ? (
          <>
            <b>A fiber you can sweep, and two dials with names.</b> The start point, the start tangent
            and the far endpoint are held. What is left closes into a <b>loop</b> — the pale curves are
            the whole family at once — because the freedom is a <b>Hopf phase</b>, and a phase is an
            angle. Sweep it and you come back.{' '}
            <b>Then the two dials deform it, and both mean something.</b> <b>Twist</b> is the
            frame&apos;s rate of rotation <i>about</i> the tangent at the pole — measured, exactly{' '}
            <i>ω</i> = 2λ·<b>e</b>₁, purely tangential. <b>Pole</b> is where the curve passes through{' '}
            <b>infinity</b>: drive it down and watch <i>infinity to curve</i> shrink while ‖c′(1)‖
            diverges — the family&apos;s honest limit, a geometric event rather than a solver giving up.{' '}
            <b>The far endpoint is draggable</b>, and since it is one of the held data items, moving it
            takes you to a <i>different</i> fiber; the pale family redraws when you let go.{' '}
            <span className="text-slate-400">
              And watch the <b>PH defect</b>: it does not move. Elsewhere in this deck a solver holds the
              invariant and the residual drifts; here <b>𝒜 i 𝒜̄ IS the Wronskian</b>, so PH is a
              substitution. A member costs 0.014 ms — no Newton, no cached seed. Interior control points
              are <i>outputs</i>, drawn grey. Drag the background to rotate.
            </span>
          </>
        ) : (
          <>
            <b>Free: nothing is held, and every control point is a handle.</b> Drag any of the five and
            all ten parameters answer by minimum norm — the four of the spinor&apos;s base point, the four
            of its second coefficient, plus <b>twist</b> and <b>pole</b>, which you can watch move in the
            readouts. Measured: the four movable points track a long path at 100%.{' '}
            <b>And the PH defect still does not move.</b> That is the whole argument of this figure. There
            is no optimizer holding an invariant here, because <b>there is no invariant available to
            violate</b> — <b>𝒜 i 𝒜̄</b> <i>is</i> the Wronskian, so every parameter value whatsoever is a
            PH curve. Nothing can stall, and nothing needs to be projected back.{' '}
            <span className="text-slate-400">
              <b>The ends hold each other.</b> Move an interior point and both endpoints stay put; move one
              endpoint and the other does. c(0) needs no pinning — p(0) = 0 fixes it — so dragging{' '}
              <b>P₀</b> slides the picture while the family re-solves to leave c(1) on screen. The one
              thing refused is walking the <b>pole</b> into [0,1], where the curve would pass through the
              piece you are drawing; then the readout says <i>no member there</i>. Return to <b>strict</b>
              and the data is re-read from wherever you left the curve. Drag the background to rotate.
            </span>
          </>
        )
      }
    >
      {/* the whole family at once — the thing that made the polynomial fiber beautiful */}
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

      {/*
        Colour carries one distinction and it is static: can the mouse move this? In STRICT only the far
        endpoint can, because it is data; the interior points are outputs. In FREE every one is a handle.
        Nothing recolours mid-drag except the grabbed point itself.
      */}
      {control.points.map((p, i) => {
        const handle = !strict || i === 4
        if (!handle) {
          return <Point3D key={`cp${i}`} position={shift(p)} color={FIG.color.derived} radius={0.04} derived />
        }
        return (
          <DragPoint3D
            key={`cp${i}`}
            position={shift(p)}
            color={grabbed === i ? FIG.color.dataPointDrag : FIG.color.dataPoint}
            radius={i === 0 || i === 4 ? 0.056 : 0.046}
            onDragStart={() => { setGrabbed(i); setStalled(false) }}
            onDragEnd={() => { setGrabbed(null); if (strict) settle(live) }}
            onDrag={(q) => (strict ? dragEnd(q) : dragFree(i, q))}
          />
        )
      })}

      {/* the start point: pinned in strict, a translation handle in free (see the header) */}
      {strict ? (
        <Point3D position={shift(curveAt(member, 0))} color={FIG.color.pinned} radius={0.055} />
      ) : null}

      {/* the start tangent — visible so the held data is shown rather than asserted */}
      {strict ? (
        <Curve3D
          points={[
            shift(curveAt(member, 0)),
            shift((() => {
              const c0 = curveAt(member, 0)
              const d0 = derivativeAt(member, 0)
              const n = Math.hypot(d0.x, d0.y, d0.z) || 1
              const k = 0.5 / n
              return { x: c0.x + d0.x * k, y: c0.y + d0.y * k, z: c0.z + d0.z * k }
            })()),
          ]}
          color={FIG.color.pinned}
          width={2}
        />
      ) : null}

    </Figure3D>
  )
}
