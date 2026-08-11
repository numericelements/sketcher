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
// AND IT IS FAST: 0.014 ms to build a member, so the whole loop redraws live. The loop WALK is a
// projection per sample, so it is rebuilt when a dial settles rather than every frame.
//
// r3f cannot be verified headlessly, so this file holds NO mathematics — only marks and gestures. The
// numbers above are pinned in core/__tests__/rationalPHOnePoleSpatial.test.ts and onePoleLoop.test.ts.
// ============================================================================
import { useMemo, useState } from 'react'
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
  speedAt,
  toMember,
  withDial,
} from '../../core/rationalPHOnePoleSpatial'
import Figure3D, { Curve3D, Point3D } from '../framework/Figure3D'
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

export default function RationalPHLoopFigure() {
  /** The dials, and where we are around the loop. The DATA is fixed once, from the seed. */
  const [lambda, setLambda] = useState(SEED.lambda)
  const [pole, setPole] = useState(SEED.pole)
  const [phase, setPhase] = useState(0)
  const [stalled, setStalled] = useState(false)

  const target = useMemo(() => dataOf(toMember(SEED)), [])

  /** Moving a dial re-solves the same data; the loop is then rebuilt around the new member. */
  const anchor = useMemo(() => {
    if (lambda === SEED.lambda && pole === SEED.pole) return SEED
    return withDial(SEED, target, { lambda, pole }) ?? SEED
  }, [lambda, pole, target])

  const loop = useMemo(() => loopOf(anchor), [anchor])
  const here = loop.members[Math.min(loop.members.length - 1, Math.round(phase * (loop.members.length - 1)))]
  const member = useMemo(() => toMember(here), [here])

  const curve = useMemo(() => sample(here), [here])
  const control = useMemo(() => controlStructure(member), [member])
  const defect = useMemo(() => Math.max(phDefect(member), member.consistency), [member])
  const endSpeed = speedAt(member, 1)
  const margin = poleMargin(here)

  const reset = (): void => {
    setLambda(SEED.lambda)
    setPole(SEED.pole)
    setPhase(0)
    setStalled(false)
  }

  const dial = (next: { lambda?: number; pole?: number }): void => {
    const ok = withDial(SEED, target, {
      lambda: next.lambda ?? lambda,
      pole: next.pole ?? pole,
    })
    if (!ok) { setStalled(true); return }
    setStalled(false)
    if (next.lambda !== undefined) setLambda(next.lambda)
    if (next.pole !== undefined) setPole(next.pole)
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
        { label: 'step', value: (stalled ? 'no member' : '—').padEnd(10, ' ') },
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
              onChange={(e) => dial({ lambda: Number(e.target.value) })} className="w-24"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-slate-400">pole</span>
            <input
              type="range" min={1.04} max={3} step={0.01} value={pole}
              onChange={(e) => dial({ pole: Number(e.target.value) })} className="w-24"
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
            The control points are <i>outputs</i>, drawn grey. Drag the background to rotate.
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

      {/* the two ends, which the data holds */}
      <Point3D position={tri(curveAt(member, 0))} color={FIG.color.pinned} radius={0.055} />
      <Point3D position={tri(curveAt(member, 1))} color={FIG.color.pinned} radius={0.055} />

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
