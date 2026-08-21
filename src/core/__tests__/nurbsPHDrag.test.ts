// ============================================================================
// DOES A DRAG ON THE PROJECTIVE MODEL TRACK? — the question the conditioning could not answer.
//
// Cold random starts converge only 41% / 48% / 21% of the time at degrees 3 / 4 / 5
// (nurbsPHOddDegree), because the constraint Jacobian of ‖q′W − qW′‖² = ρ² has no rank gap. But a
// DRAG is a warm start, which is the easier problem: last frame is already a solution and the
// cursor moved a little. So that rate is a floor on the difficulty, not a measure of it.
//
// THE DRAG IS POSED BY PINNING, and that is what makes the answer mean something. Put the grabbed
// control point EXACTLY on the cursor and forbid the solver to move it back — freeze its three
// columns of the Jacobian. Tracking is then exact by construction, so "did it track" stops being a
// question about the solver's willingness and becomes the only question worth asking:
//
//     with that point held where the cursor is, can the PH condition still be met?
//
// A residual that stops falling is not a solver giving up. It is the feasible limit, and it is
// where the model actually stops.
//
// AND TRACKING ALONE PROVES NOTHING. A solver that quietly drops the constraint tracks perfectly;
// this deck has paid for that once (FOUNDATIONS F9 — a legacy drag tracked to 97% by letting the
// displayed bound climb 2 → 10). So every step re-checks the four ways a rational PH curve can go
// fake while nobody is looking:
//
//     a pole wandering onto [0,1]      the curve blows up on its own interval
//     q and W acquiring a common root  the fraction reduces and the degree collapses
//     the hodograph dropping rank      a straight line satisfies PH for free
//     the weights changing sign        W crosses zero, which IS the pole arriving
//
// WHAT THE ANSWER TURNED OUT TO BE, and it is neither of the two clean ones. The curve FOLLOWS —
// every degree goes the whole way with the cursor held exactly and nothing degenerating. But the
// PH condition is held to a WORSE precision while moving than at rest: 1e-13 standing still,
// around 1e-8 under a drag above degree 3. That is not infeasibility and not a stopping criterion
// set too tight — giving the solver ten times the budget and eight times the steps pushes the loss
// later and never below ~1e-8. It is the missing rank gap: with the grabbed point pinned the
// remaining Jacobian is more ill-conditioned still, and a damped step cannot resolve the last
// orders. Improving it is solver work, not a threshold to move.
//
// In speed terms a relative residual δ on ‖N‖² − ρ² is a relative error of about δ/2 in ‖x′‖, so
// 1e-8 is far below anything a figure could show. The number matters as a MEASURE OF THE MODEL,
// not as a defect in the picture: this is what "the interface is easy and the solve is hard" costs
// when you actually drag it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinToPower, rootsOf, type Poly } from '../conformalPHHopf'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import { type Rat, hodographN, phRelativeResidual, settleToPH } from '../nurbsPH'

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const bern = (n: number, t: number): number[] => {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let k = 1; k <= n; k++) {
    for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
    out[0] *= 1 - t
  }
  return out
}
const evalBern = (c: readonly number[], t: number): number => {
  const b = bern(c.length - 1, t)
  return c.reduce((s, v, k) => s + v * b[k], 0)
}

function seedRat(d: number, seed: number): Rat {
  const r = rng(seed)
  const P = Array.from({ length: d + 1 }, () => [2 * r() - 1, 2 * r() - 1, 2 * r() - 1])
  const w = Array.from({ length: d + 1 }, () => 0.5 + r())
  const N = hodographN({ P, w, rho: new Array<number>(2 * d).fill(0) })
  const rho = Array.from({ length: 2 * d }, (_, k) => {
    const t = 2 * d === 1 ? 0.5 : k / (2 * d - 1)
    return Math.hypot(evalBern(N[0], t), evalBern(N[1], t), evalBern(N[2], t))
  })
  return { P, w, rho }
}

interface Health {
  poleOnInterval: boolean
  commonRootMargin: number
  rank: number
  weightsOneSign: boolean
}
function health(rat: Rat): Health {
  const Wp = bernsteinToPower(rat.w)
  const qp = [0, 1, 2].map((i) => bernsteinToPower(rat.P.map((p, k) => rat.w[k] * p[i])))
  const qMag = Math.max(...qp.flat().map(Math.abs), 1e-300)
  const roots = rootsOf(Wp.map((v) => ({ re: v, im: 0 })))
  let margin = Infinity
  for (const r of roots) {
    margin = Math.min(margin, Math.max(...qp.map((c) => cnorm(cpeval(c, r)))) / qMag)
  }
  const N = hodographN(rat)
  const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
  const basis: number[][] = []
  for (const row of N) {
    let v = row.map((x) => x / scale)
    for (const u of basis) {
      const dd = u.reduce((sm, x, i) => sm + x * v[i], 0)
      v = v.map((x, i) => x - dd * u[i])
    }
    const n = Math.hypot(...v)
    if (n > 1e-7) basis.push(v.map((x) => x / n))
  }
  return {
    poleOnInterval: roots.some((r) => Math.abs(r.im) < 1e-9 && r.re > -1e-9 && r.re < 1 + 1e-9),
    commonRootMargin: roots.length ? margin : Infinity,
    rank: basis.length,
    weightsOneSign: new Set(rat.w.map((v) => Math.sign(v))).size === 1,
  }
}
const isHealthy = (rat: Rat, tol = 1e-9): boolean => {
  const h = health(rat)
  return phRelativeResidual(rat) < tol && !h.poleOnInterval && h.rank === 3 &&
    h.commonRootMargin > 1e-6 && h.weightsOneSign
}

describe('dragging the projective model', () => {
  it('tracks the cursor exactly, and the PH condition follows', () => {
    const STEPS = 120
    for (const d of [3, 4, 5]) {
      // a healthy member to start from — finding one is not the subject, the drag is
      let start: Rat | null = null
      for (let s = 0; s < 60 && !start; s++) {
        const got = settleToPH(seedRat(d, 4241 * d + 97 * s), d)
        if (isHealthy(got.rat, 1e-11)) start = got.rat
      }
      expect(start, `a healthy degree-${d} member to drag`).not.toBeNull()
      if (!start) continue

      const g = 1                                   // an interior control point, never an end
      const P0 = start.P.map((p) => [...p])
      const chord = Math.hypot(...P0[d].map((v, i) => v - P0[0][i]))
      const dir = [0.7, 0.5, -0.4]
      const dn = Math.hypot(...dir)
      const travel = 0.8 * chord
      const frozen = [3 * g, 3 * g + 1, 3 * g + 2]

      let cur = start
      const startResidual = phRelativeResidual(start)
      let worstResidual = 0
      let stopped = -1
      let why = ''
      let disturbance = 0
      let reached = 0
      let worstPin = 0
      for (let s = 1; s <= STEPS; s++) {
        const u = (travel * s) / STEPS
        const cursor = P0[g].map((v, i) => v + (u * dir[i]) / dn)
        const moved: Rat = {
          P: cur.P.map((p, k) => (k === g ? [...cursor] : [...p])),
          w: [...cur.w],
          rho: [...cur.rho],
        }
        const got = settleToPH(moved, d, { frozen, steps: 400 })
        const h = health(got.rat)
        // the pin must have held, or the whole framing is void
        worstPin = Math.max(worstPin, Math.hypot(...got.rat.P[g].map((v, i) => v - cursor[i])))
        // Degeneracy stops the drag; a degraded residual does not, it is recorded. Stopping on
        // the residual would report a number chosen here rather than a property of the model.
        const bad = got.residual > 1e-5 ? 'PH residual left every useful tolerance'
          : h.poleOnInterval ? 'a pole reached [0,1]'
            : h.rank < 3 ? 'hodograph dropped rank'
              : h.commonRootMargin < 1e-6 ? 'q and W met at a root'
                : !h.weightsOneSign ? 'a weight changed sign' : ''
        if (bad) { stopped = s; why = bad; break }
        cur = got.rat
        worstResidual = Math.max(worstResidual, got.residual)
        reached = u
        disturbance = Math.max(...cur.P.map((p, k) =>
          k === g ? 0 : Math.hypot(...p.map((v, i) => v - P0[k][i]))))
      }

      const pct = (100 * reached) / travel
      console.log(`  degree ${d}: dragged P${g} by ${travel.toFixed(3)} (0.80 chords) in ${STEPS} steps`)
      console.log(`      followed ${pct.toFixed(0)}% of the way` +
        `${stopped < 0 ? ' — the whole drag' : `, stopped at step ${stopped} (${why})`}` +
        `,  cursor error ${worstPin.toExponential(1)}`)
      console.log(`      the rest of the polygon moved ${disturbance.toFixed(3)}` +
        ` (${(disturbance / chord).toFixed(2)} chords);  PH residual` +
        ` ${startResidual.toExponential(1)} at rest -> ${worstResidual.toExponential(1)} worst` +
        ` under the drag`)

      expect(worstPin, 'the pin held, so tracking is exact by construction').toBeLessThan(1e-12)
      expect(pct, `degree ${d} followed the cursor`).toBeGreaterThan(95)
      // loose on purpose: the point is to RECORD the degradation, and a tight bound here would be
      // a number chosen to pass rather than the model's own
      expect(worstResidual, 'the curve is still PH far beyond drawing precision').toBeLessThan(1e-5)
    }
  }, 900_000)
})
