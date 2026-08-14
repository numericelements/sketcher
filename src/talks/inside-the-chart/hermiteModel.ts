// ============================================================================
// THE DEGREE-6 HERMITE CHART — the state the second pair of figures steers.
//
// SEPARATE FROM chartModel.ts ON PURPOSE. That one is the degree-4 pair and its slides are fixed; this
// is a different family holding different data, and sharing one store with a degree switch would make
// every handle in both conditional. §9.1 wants state carried across a PAIR, not across the deck.
//
// THE FAMILY. Degree 6, one pole: spinor degree 3, so 4(n+1) − 4m = 12 admissible directions. Holding
// full C¹ Hermite — c′(0), c′(1), c(1) − c(0), nine numbers — leaves 12 − 9 − 1 = 2. The first rational
// degree at which the classical interpolation problem is even posable: degree 4's fibre is 8 and its
// map to those nine numbers has rank 7, so two of the nine are unreachable there.
//
//     P₀ P₁ P₅ P₆   12 handle numbers   = 3 translation + 9 Hermite
//     fibre ψ, fibre s, twist λ, pole r  4 sliders
//     ─────────────────────────────────
//                                   16   = the chart's dimension, measured
//
// THE TWO FIBRE SLIDERS ARE NOT THE SAME KIND OF THING, and the figure says so.
//
//   ψ  IS A CIRCLE. c′(0) = 𝒜(0)i𝒜(0)*/w(0)² leaves 𝒜(0) free on a Hopf circle, and likewise at t = 1.
//      Pinning 𝒜(0) exactly spends the global gauge; the phase of 𝒜(1) against it is then a genuine
//      coordinate that returns at 2π BY CONSTRUCTION — the target at 2π is literally the target at 0.
//      Measured: 2.4e-16, with the nine Hermite numbers held to 5.6e-13 the whole way round.
//
//   s  IS ALSO A CIRCLE, AND NOW IN CLOSED FORM. At fixed 𝒜(0) and 𝒜(1) the leftover freedom is
//      {X·u(t) : X ∈ ℍ} for one complex cubic u, and because u is complex the displacement condition
//      completes into one more Hopf equation. So 𝒜(θ) = 𝒜₀ + (X₀e^{iθ} − X₀)u — no solver, closing at
//      2π because e^{2πi} = 1. This replaces a 2180-step continuation walk that took 109 s to traverse
//      and could only be shown as a bounded road. → rationalHermiteCircles.ts, rationalMiddleCircle.test.ts
//
// COST. A projection is ~9 ms, so ψ, λ, r and the handles run live. The s circle is CLOSED FORM, so it
// costs nothing at all — which is the practical payoff of the derivation, on top of the honest one.
//
// No mathematics lives here, only state. Everything it calls is pinned in
// core/__tests__/degree6TwoCircles.test.ts and degree6HandlesTrack.test.ts.
// ============================================================================
import { useSyncExternalStore } from 'react'
import type { Quat, Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  controlStructure,
  curveAt,
  derivativeAt,
  dragWithEndHeld,
  familyBasis,
  hermiteOf,
  phaseTarget,
  poleMargin,
  projectOnto,
  projectToFamily,
  spinorEndsAndSpan,
  toMember,
  unpackSpinor,
} from '../../core/rationalPHMultiPoleSpatial'
import { middleCircle } from '../../core/rationalHermiteCircles'

export const SEED_POLE = 1.7
/** Same reason as the degree-4 pair: both ends of the twist dial degenerate to a polynomial curve. */
export const OPENING_THETA = 35

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))

export const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = {
    A: ZERO, roots: [SEED_POLE], lambdas: [Math.tan((OPENING_THETA * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()

export const RANGE = {
  pole: { min: 1.06, max: 4, step: 0.005 },
  theta: { min: -89.9, max: 89.9, step: 0.1 },
  psi: { min: 0, max: 360, step: 0.5 },
  sAngle: { min: 0, max: 360, step: 0.5 },
} as const

export type Mode = 'strict' | 'free'

export interface HermiteState {
  mode: Mode
  /** The member on screen. */
  live: MultiPoleParams
  /**
   * The member ψ is measured FROM. ψ has to be a coordinate, not a path — solving from `live` each
   * tick would make the slider's value depend on how it got there, and dragging back would not retrace.
   */
  anchor: MultiPoleParams
  /** The nine C¹ Hermite numbers held by every handle and slider on this pair. */
  target: number[]
  /** Degrees. λ = tan θ. */
  theta: number
  /** Degrees around the 𝒜(1) Hopf circle. */
  psi: number
  /** Degrees around the second (closed-form) fibre circle. */
  sAngle: number
  /** The member at (ψ, s = 0) — the base the s circle is built on. */
  base: MultiPoleParams
  origin: Vec3
  stalled: boolean
}

const atPhase = (anchor: MultiPoleParams, psiDeg: number): MultiPoleParams =>
  projectOnto(anchor, spinorEndsAndSpan, phaseTarget(anchor, (psiDeg * Math.PI) / 180), 40)

/** The s circle at a base member — closed form, so this is free to call per frame. */
const sAt = (base: MultiPoleParams, deg: number): MultiPoleParams => {
  const circle = middleCircle(base)
  return circle ? circle.at((deg * Math.PI) / 180) : base
}

const initial = (): HermiteState => ({
  mode: 'strict',
  live: SEED,
  anchor: SEED,
  target: hermiteOf(toMember(SEED)),
  theta: OPENING_THETA,
  psi: 0,
  sAngle: 0,
  base: SEED,
  origin: { x: 0, y: 0, z: 0 },
  stalled: false,
})

let state: HermiteState = initial()
const listeners = new Set<() => void>()
const emit = (next: Partial<HermiteState>): void => {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

export function useHermiteChart(): HermiteState {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => state,
  )
}

/** Re-solve the nine Hermite numbers after a dial moved the family under them. */
function withHermiteDial(prm: MultiPoleParams, target: readonly number[]): MultiPoleParams | null {
  const moved = projectToFamily(prm)
  if (familyBasis(moved).length === 0) return null
  const solved = projectOnto(moved, hermiteOf, target, 40)
  const err = Math.hypot(...hermiteOf(toMember(solved)).map((v, i) => v - target[i]))
  return err < 1e-6 && poleMargin(solved) > 1e-3 ? solved : null
}

export const hermiteChart = {
  /** The ψ circle. Always solved from the ANCHOR, so the slider is a coordinate and closes at 360°. */
  setPsi(deg: number): void {
    const next = atPhase(state.anchor, deg)
    const err = Math.hypot(
      ...spinorEndsAndSpan(toMember(next), next).map((v, i) => v - phaseTarget(state.anchor, (deg * Math.PI) / 180)[i]),
    )
    if (err > 1e-6) { emit({ psi: deg, stalled: true }); return }
    // ψ moves the base the s circle is built on; s is then re-applied so the pair reads as coordinates
    // rather than as a history — turning ψ and back returns to the same curve at the same s.
    emit({ psi: deg, base: next, live: sAt(next, state.sAngle), stalled: false })
  },

  /** The second fibre circle. Closed form, so it costs nothing and returns exactly at 360°. */
  setS(deg: number): void {
    emit({ sAngle: deg, live: sAt(state.base, deg), stalled: false })
  },

  setTheta(deg: number): void {
    const moved: MultiPoleParams = {
      ...state.live, lambdas: [Math.tan((deg * Math.PI) / 180)],
    }
    const next = withHermiteDial(moved, state.target)
    emit(next ? { live: next, base: next, sAngle: 0, theta: deg, stalled: false } : { theta: deg, stalled: true })
  },

  /**
   * The pole. BY CONTINUATION when the jump is large — clicking the slider track moves r much further
   * than dragging it does, and a single Gauss-Newton solve from the current member does not converge
   * across a big jump. Measured on the seed: r = 1.1 solved, 1.15 did not, 1.2 did, with no clean
   * boundary — the signature of a bad starting point rather than of an edge of the family. Stepped in
   * increments of 0.02 it reaches r = 1.01 with residuals at 1e-14.
   */
  setPole(r: number): void {
    const from = state.live.roots[0]
    const steps = Math.max(1, Math.ceil(Math.abs(r - from) / 0.02))
    let cur = state.live
    for (let k = 1; k <= steps; k++) {
      const next = withHermiteDial({ ...cur, roots: [from + ((r - from) * k) / steps] }, state.target)
      if (!next) { emit({ stalled: true }); return }
      cur = next
    }
    emit({ live: cur, base: cur, sAngle: 0, stalled: false })
  },

  /** Rebuild the anchor and the road around wherever the gesture left us. On settle only. */
  settle(): void {
    emit({
      anchor: state.live,
      base: state.live,
      psi: 0,
      sAngle: 0,
      target: hermiteOf(toMember(state.live)),
    })
  },

  /**
   * STRICT: P₁ carries c′(0) and P₅ carries c′(1), both EXACTLY — c′(0) = 6(w₁/w₀)(P₁ − P₀) and
   * c′(1) = 6(w₅/w₆)(P₆ − P₅), and w = ∏(t − r) depends only on the poles, which are held during a
   * handle drag. So the weight ratios do not move and these are identities, not linearisations
   * (degree6HandlesTrack pins them at exactly 0 drift). Read k off the current member rather than
   * rebuilding it from the Bernstein weights, so it stays right at any pole.
   */
  dragStartTangent(p: Vec3): void {
    const m = toMember(state.live)
    const P = controlStructure(m).points
    const n2 = P[1].x * P[1].x + P[1].y * P[1].y + P[1].z * P[1].z
    if (!(n2 > 1e-18)) { emit({ stalled: true }); return }
    const d0 = derivativeAt(m, 0)
    const k = (d0.x * P[1].x + d0.y * P[1].y + d0.z * P[1].z) / n2
    const next = state.target.slice()
    next[0] = k * p.x; next[1] = k * p.y; next[2] = k * p.z
    hermiteChart.solveTo(next)
  },

  /** STRICT: P₅ carries c′(1). Its handle is P₆ − P₅, so the target is built from the current P₆. */
  dragEndTangent(p: Vec3): void {
    const m = toMember(state.live)
    const P = controlStructure(m).points
    const last = P.length - 1
    const v = { x: P[last].x - P[last - 1].x, y: P[last].y - P[last - 1].y, z: P[last].z - P[last - 1].z }
    const n2 = v.x * v.x + v.y * v.y + v.z * v.z
    if (!(n2 > 1e-18)) { emit({ stalled: true }); return }
    const d1 = derivativeAt(m, 1)
    const k = (d1.x * v.x + d1.y * v.y + d1.z * v.z) / n2
    const next = state.target.slice()
    next[3] = k * (P[last].x - p.x); next[4] = k * (P[last].y - p.y); next[5] = k * (P[last].z - p.z)
    hermiteChart.solveTo(next)
  },

  /** STRICT: P₆ IS c(1), so dragging it moves the displacement — a different fibre. */
  dragEnd(p: Vec3): void {
    const next = state.target.slice()
    next[6] = p.x; next[7] = p.y; next[8] = p.z
    hermiteChart.solveTo(next)
  },

  /**
   * STRICT P₀: a change of ORIGIN, not a motion inside the family — p(0) = 0 pins c(0). The other
   * three handles hold their SCREEN places while P₀ goes to the cursor, which in the family's own
   * coordinates means moving every held point by −δ. The tangents are directions and do not shift;
   * only the displacement does. That RESHAPES rather than sliding, which is the whole point: a rigid
   * translation moves the picture without moving the curve.
   */
  translate(world: Vec3): void {
    const d = { x: world.x - state.origin.x, y: world.y - state.origin.y, z: world.z - state.origin.z }
    const next = state.target.slice()
    next[6] -= d.x; next[7] -= d.y; next[8] -= d.z
    const solved = projectOnto(state.live, hermiteOf, next, 40)
    const err = Math.hypot(...hermiteOf(toMember(solved)).map((v, i) => v - next[i]))
    if (err > 1e-6 || poleMargin(solved) < 1e-3) { emit({ stalled: true }); return }
    emit({ origin: world, live: solved, target: next, anchor: solved, base: solved, psi: 0, sAngle: 0, stalled: false })
  },

  /** Shared tail of the strict handles: solve the nine numbers, or report the stall. */
  solveTo(next: readonly number[]): void {
    const solved = projectOnto(state.live, hermiteOf, next, 40)
    const err = Math.hypot(...hermiteOf(toMember(solved)).map((v, i) => v - next[i]))
    if (err > 1e-6 || poleMargin(solved) < 1e-3) { emit({ stalled: true }); return }
    emit({ live: solved, target: next.slice(), anchor: solved, base: solved, psi: 0, sAngle: 0, stalled: false })
  },

  /**
   * FREE: any control point except P₀, with the far end held. c(0) needs no holding — p(0) = 0 fixes
   * it — and routing P₀ here is the trap the degree-4 pair paid for once: the solver is asked for a
   * motion the family cannot make and spends the whole subspace failing, and the points fly apart.
   */
  dragFree(index: number, p: Vec3, lastIndex: number): void {
    if (index === 0) { hermiteChart.slideStart(p); return }
    const end = curveAt(toMember(state.live), 1)
    const next = index === lastIndex
      ? dragWithEndHeld(state.live, null, null, p)
      : dragWithEndHeld(state.live, index, p, end)
    if (!next) { emit({ stalled: true }); return }
    emit({
      live: next, target: hermiteOf(toMember(next)), anchor: next, base: next, psi: 0, sAngle: 0,
      stalled: false,
    })
  },

  /** FREE P₀: the mirror of an interior drag — P₀ goes to the cursor, c(1) holds its SCREEN place. */
  slideStart(world: Vec3): void {
    const end = curveAt(toMember(state.live), 1)
    const held = {
      x: end.x + state.origin.x - world.x,
      y: end.y + state.origin.y - world.y,
      z: end.z + state.origin.z - world.z,
    }
    const solved = dragWithEndHeld(state.live, null, null, held)
    if (!solved) { emit({ stalled: true }); return }
    emit({
      origin: world, live: solved, target: hermiteOf(toMember(solved)), anchor: solved, base: solved,
      psi: 0, sAngle: 0, stalled: false,
    })
  },

  setMode(mode: Mode): void {
    if (mode === 'strict') {
      emit({
        mode, target: hermiteOf(toMember(state.live)), anchor: state.live, base: state.live,
        psi: 0, sAngle: 0, stalled: false,
      })
    } else {
      emit({ mode, stalled: false })
    }
  },

  reset(): void {
    state = initial()
    listeners.forEach((fn) => fn())
  },
}
