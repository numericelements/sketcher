// ============================================================================
// ONE CHART, TWO VIEWS — the state both figures of the pole/cusp pair steer.
//
// WHY THIS FILE EXISTS. The sphere slide and the curve slide are not two demonstrations; they are two
// views of ONE configuration, and the point only lands if the handles are the same handles. So the
// state lives here, module-level, and both figures subscribe to it. Move the pole on the sphere slide,
// advance, and the curve slide is already showing that pole.
//
// WHAT IS BEING SHOWN, and it is a theorem rather than a coincidence of our seed. For a simple pole r:
//
//     the tangent indicatrix has a CUSP at r        (Kalkan–Scharler–Schröcker–Šír, Rem. 4.7)
//     and N(r) = −p(r) exactly                       (tangentIndicatrix.test.ts)
//
// so the cusp is not merely located at the pole — the cusp DIRECTION is the direction the curve
// escapes to infinity. Sphere slide: here is the corner. Curve slide: here is the ray it names. One
// pole slider drives both.
//
// THE HANDLES, and the count is F17's, not a design choice. Spinor degree 2, one pole: an 8-dimensional
// fibre plus one dial. Pinning the data (c′(0) and c(1) — six conditions) and dividing out the Hopf
// gauge leaves ONE dimension, which closes into a loop. So STRICT mode is honest with three sliders and
// one draggable point:
//
//     pole r      where the curve meets infinity — the shared handle, and the one with a limit
//     twist θ     λ = tan θ, so the σ = 0 horizon sits at ±90° rather than at infinity
//     phase       the one leftover fibre dimension, which closes
//     c(1)        draggable: it IS one of the six data items, so moving it changes fibre
//
// FREE mode releases the data and makes every control point a handle, with the ends holding each other
// — c(0) needs no pinning since p(0) = 0 fixes the translation.
//
// COST, and why the split below. A member is sub-millisecond, so pole/twist/drag run live. The fibre
// LOOP is ~200 projections, so it is rebuilt when a gesture SETTLES, never per frame.
//
// No mathematics lives here — only state. Everything it calls is measured in
// core/__tests__/tangentIndicatrix.test.ts, rationalPHMultiPoleSpatial.test.ts and
// familyBasisConditioning.test.ts.
// ============================================================================
import { useSyncExternalStore } from 'react'
import type { Quat, Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  controlStructure,
  curveAt,
  dataOf,
  derivativeAt,
  dragWithEndHeld,
  familyBasis,
  fiberLoop,
  poleMargin,
  projectToData,
  toMember,
  unpackSpinor,
  withDial,
} from '../../core/rationalPHMultiPoleSpatial'

export const SEED_POLE = 1.7
const ZERO: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

/** The member both slides open on — the same seed the horizon dial has always used. */
/**
 * THE OPENING TWIST IS NOT ZERO, and that is a measured decision. λ = 0 makes the curve EXACTLY
 * planar — off-plane distance 0.0e+0 at every fibre member tried — because λ is the frame twist rate
 * at the pole and zero twist leaves the hodograph in a plane. Opening a spatial deck on the one
 * setting of the dial that is flat would have been an unforced error; both figures opened there until
 * this was measured. λ = tan 35° ≈ 0.70.
 */
export const OPENING_THETA = 35

/** The member both slides open on. */
export const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = {
    A: ZERO, roots: [SEED_POLE], lambdas: [Math.tan((OPENING_THETA * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 12; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

export const RANGE = {
  pole: { min: 1.06, max: 3.2, step: 0.005 },
  theta: { min: -89.9, max: 89.9, step: 0.1 },
  phase: { min: 0, max: 1, step: 0.004 },
} as const

export type Mode = 'strict' | 'free'

export interface ChartState {
  mode: Mode
  /** The member on screen. Everything else is derived from it or held beside it. */
  live: MultiPoleParams
  /** The six data numbers STRICT holds: c′(0) and c(1). */
  target: number[]
  /** The dial's own position, held here so both slides show the same slider. λ = tan θ. */
  theta: number
  /** The walked fibre at the last settle — expensive, so not rebuilt per frame. */
  loop: MultiPoleParams[]
  phase: number
  /**
   * WHERE c(0) SITS ON SCREEN. p(0) = 0 pins the curve's start to the origin inside the family, so
   * P₀ cannot move within it — dragging P₀ can only mean "translate the picture", and the figure owns
   * that offset rather than the core. This is a real handle, not a workaround: translations are three
   * genuine dimensions of the space of curves, and the handle count only balances with them counted.
   */
  origin: Vec3
  /** Set when a gesture had no member to move to. Reported, never hidden. */
  stalled: boolean
}

const loopOf = (prm: MultiPoleParams): MultiPoleParams[] => fiberLoop(prm, { stride: 0.05, maxSteps: 400 })

const initial = (): ChartState => ({
  mode: 'strict',
  live: SEED,
  target: dataOf(toMember(SEED)),
  theta: OPENING_THETA,
  loop: loopOf(SEED),
  phase: 0,
  origin: { x: 0, y: 0, z: 0 },
  stalled: false,
})

let state: ChartState = initial()
const listeners = new Set<() => void>()
const emit = (next: Partial<ChartState>): void => {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

/** Both figures read the SAME configuration, so advancing a slide never resets the picture. */
export function useChart(): ChartState {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => state,
  )
}

export const chart = {
  /** θ drives λ = tan θ. The data is held, so this moves within one fibre. */
  setTheta(deg: number): void {
    const next = withDial(state.live, state.target, {
      lambda: { index: 0, value: Math.tan((deg * Math.PI) / 180) },
    })
    emit(next ? { live: next, theta: deg, stalled: false } : { theta: deg, stalled: true })
  },

  /** The pole: where the curve meets infinity, and the handle both slides share. */
  setPole(r: number): void {
    const next = withDial(state.live, state.target, { pole: { index: 0, value: r } })
    emit(next ? { live: next, stalled: false } : { stalled: true })
  },

  /** Sweeping selects a member of the walked fibre — it writes `live`, so both modes agree. */
  sweep(u: number): void {
    const loop = state.loop
    if (loop.length === 0) return
    const i = Math.min(loop.length - 1, Math.max(0, Math.round(u * (loop.length - 1))))
    emit({ phase: u, live: loop[i], stalled: false })
  },

  /**
   * P₀ IS THE ORIGIN, so its world position IS the offset — pass the cursor in WORLD coordinates, not
   * curve-local ones. p(0) = 0 puts P₀ at the family's own zero, so `origin` and P₀'s screen position
   * are the same point; converting to local first and then assigning sets origin = cursor − origin,
   * which is what made the handle refuse to follow the mouse.
   *
   * STRICT: a pure translation. The whole picture slides and the curve is unchanged, which is exactly
   * what the three translation dimensions are.
   */
  translate(world: Vec3): void {
    emit({ origin: world, stalled: false })
  },

  /**
   * FREE: the mirror of an interior drag. There the ends hold while the middle moves; here P₀ goes to
   * the cursor while the family re-solves to leave c(1) where it was ON SCREEN, so the curve stretches
   * between them. Same gesture the sibling ph-interpolation figure has.
   */
  slideStart(world: Vec3): void {
    const m = toMember(state.live)
    const end = curveAt(m, 1)
    const held = {
      x: end.x + state.origin.x - world.x,
      y: end.y + state.origin.y - world.y,
      z: end.z + state.origin.z - world.z,
    }
    const solved = dragWithEndHeld(state.live, null, null, held)
    if (!solved) { emit({ stalled: true }); return }
    emit({
      origin: world, live: solved, target: dataOf(toMember(solved)), stalled: false,
    })
  },

  /**
   * STRICT: P₁ carries the start tangent, and it carries it LINEARLY — c′(0) = 4(w₁/w₀)(P₁ − P₀), and
   * P₀ = 0 inside the family, so c′(0) = k·P₁ with k fixed by the weights (hence by the pole alone).
   * Reading k off the current member rather than rebuilding it from the Bernstein weights keeps this
   * exact at any pole without duplicating the weight convention.
   */
  dragTangent(p: Vec3): void {
    const m = toMember(state.live)
    const P1 = controlStructure(m).points[1]
    const n2 = P1.x * P1.x + P1.y * P1.y + P1.z * P1.z
    if (!(n2 > 1e-18)) { emit({ stalled: true }); return }
    const d0 = derivativeAt(m, 0)
    const k = (d0.x * P1.x + d0.y * P1.y + d0.z * P1.z) / n2
    const next = [k * p.x, k * p.y, k * p.z, state.target[3], state.target[4], state.target[5]]
    const solved = projectToData(state.live, next)
    const err = Math.hypot(...dataOf(toMember(solved)).map((v, i) => v - next[i]))
    if (err > 1e-7 || poleMargin(solved) < 1e-3) { emit({ stalled: true }); return }
    emit({ live: solved, target: next, stalled: false })
  },

  /** STRICT: c(1) is data, so dragging it moves to a DIFFERENT fibre. */
  dragEnd(p: Vec3): void {
    const next = [state.target[0], state.target[1], state.target[2], p.x, p.y, p.z]
    const solved = projectToData(state.live, next)
    const err = Math.hypot(...dataOf(toMember(solved)).map((v, i) => v - next[i]))
    if (err > 1e-7 || poleMargin(solved) < 1e-3) { emit({ stalled: true }); return }
    emit({ live: solved, target: next, stalled: false })
  },

  /**
   * FREE: any control point EXCEPT P₀, with the far end held. c(0) needs no holding — the gauge pins
   * it — and routing P₀ here is what made the curve fly apart: the solver was asked for a motion the
   * family cannot make, and spent the whole admissible subspace failing to make it. P₀ translates.
   */
  dragFree(index: number, p: Vec3, lastIndex: number): void {
    if (index === 0) { chart.slideStart(p); return }
    const end = { x: state.target[3], y: state.target[4], z: state.target[5] }
    const held = index === lastIndex ? p : end
    const next = index === lastIndex
      ? dragWithEndHeld(state.live, null, null, held)
      : dragWithEndHeld(state.live, index, p, held)
    if (!next) { emit({ stalled: true }); return }
    emit({ live: next, target: dataOf(toMember(next)), stalled: false })
  },

  /** Rebuild the walked fibre AROUND wherever the gesture left us. Call on gesture end, not per frame. */
  settle(): void {
    emit({ loop: loopOf(state.live), phase: 0 })
  },

  setMode(mode: Mode): void {
    if (mode === 'strict') {
      emit({ mode, target: dataOf(toMember(state.live)), loop: loopOf(state.live), phase: 0, stalled: false })
    } else {
      emit({ mode, stalled: false })
    }
  },

  reset(): void {
    state = initial()
    listeners.forEach((fn) => fn())
  },
}
