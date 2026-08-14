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
//   s  IS A ROAD ALONG A REAL LOOP. At fixed ψ the leftover is one-dimensional and it DOES close —
//      648 steps on the polynomial-quintic control, 2180 steps on the rational sextic (gap 1.7e-9).
//      But 2180 steps is 109 s to walk, so the slider drives a bounded stretch of it rather than the
//      whole turn. The loop is real; driving all of it live is not affordable.
//      → degree6TwoCircles.test.ts
//
// COST, and why the split. A projection is ~9 ms, so ψ, λ, r and the handles run live. The ROAD is
// ~52 projections, so it is built on first touch and rebuilt when a gesture settles, never per frame.
// The FAN — the pale arcs that show the answer set — is 10 projections and is cheap enough to rebuild
// whenever ψ's anchor moves.
//
// No mathematics lives here, only state. Everything it calls is pinned in
// core/__tests__/degree6TwoCircles.test.ts and degree6HandlesTrack.test.ts.
// ============================================================================
import { useSyncExternalStore } from 'react'
import type { Quat, Vec3 } from '../../core/quaternion'
import {
  type MultiPoleParams,
  familyBasis,
  fiberRoad,
  hermiteOf,
  phaseTarget,
  poleMargin,
  projectOnto,
  projectToFamily,
  spinorEndsAndSpan,
  toMember,
  unpackSpinor,
} from '../../core/rationalPHMultiPoleSpatial'

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
  road: { min: 0, max: 1, step: 0.004 },
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
  /** The bounded road along the leftover direction, and where on it we are. */
  road: MultiPoleParams[]
  roadAt: number
  /** Members spread around the ψ circle — the answer set, drawn pale. */
  fan: MultiPoleParams[]
  origin: Vec3
  stalled: boolean
}

const FAN = 10
const atPhase = (anchor: MultiPoleParams, psiDeg: number): MultiPoleParams =>
  projectOnto(anchor, spinorEndsAndSpan, phaseTarget(anchor, (psiDeg * Math.PI) / 180), 40)

const fanOf = (anchor: MultiPoleParams): MultiPoleParams[] =>
  Array.from({ length: FAN }, (_, i) => atPhase(anchor, (360 * i) / FAN))

const roadOf = (prm: MultiPoleParams): MultiPoleParams[] =>
  fiberRoad(prm, { stride: 0.08, steps: 26, readout: spinorEndsAndSpan })

const initial = (): HermiteState => ({
  mode: 'strict',
  live: SEED,
  anchor: SEED,
  target: hermiteOf(toMember(SEED)),
  theta: OPENING_THETA,
  psi: 0,
  road: [SEED],
  roadAt: 0,
  fan: fanOf(SEED),
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
    emit({ psi: deg, live: next, stalled: false })
  },

  /**
   * The leftover direction — a bounded road along a loop that is real but 2180 steps long.
   *
   * BUILT ON FIRST USE, not at module load. The road is ~52 projections at ~9 ms, and paying that
   * while the deck is loading would stall the first paint of every slide. Building it here means the
   * cost lands on the first touch of this one slider, where the user is already waiting for it.
   */
  setRoad(u: number): void {
    if (state.road.length <= 1) emit({ road: roadOf(state.live) })
    const road = state.road
    if (road.length === 0) return
    const i = Math.min(road.length - 1, Math.max(0, Math.round(u * (road.length - 1))))
    emit({ roadAt: u, live: road[i], stalled: false })
  },

  setTheta(deg: number): void {
    const moved: MultiPoleParams = {
      ...state.live, lambdas: [Math.tan((deg * Math.PI) / 180)],
    }
    const next = withHermiteDial(moved, state.target)
    emit(next ? { live: next, theta: deg, stalled: false } : { theta: deg, stalled: true })
  },

  setPole(r: number): void {
    const next = withHermiteDial({ ...state.live, roots: [r] }, state.target)
    emit(next ? { live: next, stalled: false } : { stalled: true })
  },

  /** Rebuild the anchor, the fan and the road around wherever the gesture left us. On settle only. */
  settle(): void {
    emit({
      anchor: state.live,
      psi: 0,
      fan: fanOf(state.live),
      road: roadOf(state.live),
      roadAt: 0.5,
      target: hermiteOf(toMember(state.live)),
    })
  },

  setMode(mode: Mode): void {
    emit({ mode, stalled: false })
  },

  reset(): void {
    state = initial()
    listeners.forEach((fn) => fn())
  },
}
