// ============================================================================
// DRIVING A SOFT MEMBER AT A HARD ONE — and where it stops, which is the open question.
//
// A local drag keeps a soft member soft and a hard member hard (softHardUnderDrag). That says the
// cells are not crossed by a small motion; it does not say they are separate components. The way
// to tell is to AIM: take a soft member's control points and drive them at a hard member's, staying
// on the PH variety the whole way, and see what stops you.
//
// WHAT HAPPENS. It closes about a fifth of the distance, the poles harden by eight orders on the
// way — 1e-16 to 1e-4, so soft is NOT absorbing under driving, only under a small drag — and then
// it stalls with the PH residual at 1e-7.
//
// AND NOTHING IS DEGENERATE AT THE WALL, which is what makes this inconclusive rather than a
// result. Measured at the stall: W still of true degree 6, all six poles still complex, the closest
// pair 0.12 apart, every weight the same sign and none near zero. There is no collision, no pole
// arriving on the real axis, no reduction — nothing to point at and call the boundary of the cell.
//
// SO THIS IS SOLVER-LIMITED, and it is the first question in this line that is. The residual at the
// stall is 1e-7, which is exactly the floor a drag on this model already showed (nurbsPHDrag: 1e-13
// standing still, ~1e-8 under motion, and ten times the budget does not help). Smaller driving
// steps do not get further — 21%, 19%, 17% at steps 0.02, 0.005, 0.001 — which is what an
// obstruction would look like, but also what a fixed precision floor would look like, and these
// measurements cannot separate them.
//
// The lever is named and not guessed at: this Jacobian has no rank gap, so the damped step stands
// in for a rank decision that cannot be made. A rank-revealing or properly scaled step is the thing
// to try, and THEN this experiment is worth re-running. Until it is, "are the soft and hard cells
// connected" stays open.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinMultiply } from '../bernstein'
import { bernsteinToPower, rootsOf, type Poly } from '../conformalPHHopf'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import { findMember } from '../conformalPHCurve'
import { type Rat, hodographN, phRelativeResidual, settleToPH } from '../nurbsPH'

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}
function trimPoly(p: Poly): Poly {
  const s = Math.max(...p.map(Math.abs), 1e-300)
  const c = [...p]
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-12 * s) c.pop()
  return c
}
function relValue(p: Poly, z: Complex): number {
  const r = Math.hypot(z.re, z.im)
  let terms = 0
  for (let k = 0; k < p.length; k++) terms += Math.abs(p[k]) * r ** k
  return cnorm(cpeval(p, z)) / Math.max(terms, 1e-300)
}
const polesOf = (r: Rat): Complex[] =>
  rootsOf(trimPoly(bernsteinToPower(r.w)).map((v) => ({ re: v, im: 0 })))
/** 0 is soft, O(1) is hard — |ρ(r)|, which is the definition and works at a real pole too. */
const hardness = (r: Rat): number[] => {
  const rhoP = bernsteinToPower(r.rho)
  return polesOf(r).map((z) => relValue(rhoP, z))
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
  const rho = Array.from({ length: 2 * d }, (_, k) =>
    Math.hypot(...[0, 1, 2].map((i) => evalBern(N[i], k / (2 * d - 1)))))
  return { P, w, rho }
}
const polyDistance = (a: number[][], b: number[][]): number =>
  Math.max(...a.map((p, k) => Math.hypot(...p.map((v, i) => v - b[k][i]))))

describe('driving a soft member at a hard one', () => {
  it('hardens the poles, then stalls with nothing degenerate to blame', () => {
    const D = 6
    const s = findMember(D)
    expect(s, 'a genuine degree-6 conformal member').not.toBeNull()
    if (!s) return
    const w = s.C.map((c) => c[0])
    const q = [1, 2, 3].map((i) => s.C.map((c) => c[i]))
    const soft: Rat = {
      P: Array.from({ length: D + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w: [...w],
      rho: bernsteinMultiply([...s.h], w),
    }
    const softStart = Math.max(...hardness(soft))
    expect(softStart, 'the source is soft').toBeLessThan(1e-12)

    let hard: Rat | null = null
    for (let t = 0; t < 200 && !hard; t++) {
      const got = settleToPH(seedRat(D, 9001 + 37 * t), D)
      if (got.residual > 1e-11) continue
      const h = hardness(got.rat)
      if (h.length === D && Math.min(...h) > 1e-3) hard = got.rat
    }
    expect(hard, 'a hard degree-6 member to aim at').not.toBeNull()
    if (!hard) return
    console.log(`    soft source hardness ${hardness(soft).map((v) => v.toExponential(0)).join(' ')}`)
    console.log(`    hard target hardness ${hardness(hard).map((v) => v.toExponential(0)).join(' ')}`)

    // matched in scale and position, so the distance means something
    const chordOf = (r: Rat): number => Math.hypot(...r.P[D].map((v, i) => v - r.P[0][i]))
    const k = chordOf(soft) / chordOf(hard)
    const target = hard.P.map((p) => p.map((v, i) => soft.P[0][i] + k * (v - hard.P[0][i])))
    const span = polyDistance(soft.P, target)

    let worstClosed = 0
    let endState: Rat = soft
    for (const step of [0.02, 0.005]) {
      let cur = soft
      let best = span
      let stalls = 0
      for (let it = 0; it < 4000; it++) {
        const pushed: Rat = {
          P: cur.P.map((p, j) => p.map((v, i) => v + step * (target[j][i] - v))),
          w: [...cur.w],
          rho: [...cur.rho],
        }
        const got = settleToPH(pushed, D, { steps: 600 })
        if (got.residual > 1e-7) break
        cur = got.rat
        const d = polyDistance(cur.P, target)
        if (d < best - 1e-7) { best = d; stalls = 0 } else { stalls++ }
        if (stalls > 40 || d < 1e-4) break
      }
      const closed = 1 - best / span
      worstClosed = Math.max(worstClosed, closed)
      endState = cur
      console.log(`      step ${step}: closed ${(100 * closed).toFixed(0)}% of ${span.toFixed(2)},` +
        ` residual ${phRelativeResidual(cur).toExponential(1)},` +
        ` hardness now ${hardness(cur).map((v) => v.toExponential(0)).join(' ')}`)
    }

    // THE POLES DID DEPART. Soft is absorbing under a small drag and not under driving.
    const ended = Math.max(...hardness(endState))
    console.log(`    poles went from ${softStart.toExponential(0)} to ${ended.toExponential(0)}` +
      ` — ${Math.round(Math.log10(ended / softStart))} orders — but stopped short of hard (O(1))`)
    expect(ended / softStart, 'softness is left behind once you AIM rather than nudge')
      .toBeGreaterThan(1e8)
    expect(ended, 'and yet it never becomes hard before the drive stalls').toBeLessThan(1e-2)
    expect(worstClosed, 'the drive stalls well short of the target').toBeLessThan(0.5)

    // NOTHING IS DEGENERATE AT THE WALL — which is why this is inconclusive, not a result.
    const roots = polesOf(endState)
    let closestPair = Infinity
    let nearestReal = Infinity
    for (const z of roots) {
      nearestReal = Math.min(nearestReal, Math.abs(z.im))
      for (const o of roots) {
        if (o === z) continue
        closestPair = Math.min(closestPair, Math.hypot(z.re - o.re, z.im - o.im))
      }
    }
    const weights = endState.w
    console.log(`    at the wall: W true degree ${roots.length}, closest pole pair` +
      ` ${closestPair.toFixed(3)}, nearest pole to the real axis ${nearestReal.toFixed(3)},` +
      ` weights ${Math.min(...weights.map(Math.abs)).toFixed(3)}..${Math.max(...weights.map(Math.abs)).toFixed(3)}` +
      ` all ${new Set(weights.map(Math.sign)).size === 1 ? 'one sign' : 'MIXED SIGN'}`)
    expect(roots.length, 'the curve has not reduced').toBe(D)
    expect(closestPair, 'no two poles have collided').toBeGreaterThan(0.05)
    expect(nearestReal, 'no pole has reached the real axis').toBeGreaterThan(0.01)
    expect(new Set(weights.map(Math.sign)).size, 'no weight has crossed zero').toBe(1)
  }, 900_000)
})
