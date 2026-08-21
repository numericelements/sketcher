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
// HOW THE HARDENING HAPPENS, and it is not the gradual thing the codimension count suggests. Write
// the numerator at a pole as q(r) = a + i·b with a, b real. Then ⟨q,q⟩ = |a|² − |b|² + 2i⟨a,b⟩, so
//
//     SOFT  ⟺  |a| = |b|  AND  a ⊥ b
//
// — the real and imaginary parts perpendicular and equal in length. There are therefore TWO ways to
// harden a pole, and only the first is continuous:
//
//   · tilt off that alignment. A randomly-solved "hard" member is barely off it: |a|/|b| = 0.983
//     and the angle 85.3°, against 1.000000 and 90.00° for a soft one.
//   · send the pole ONTO THE REAL AXIS. Then b = 0 identically, |a| = |b| forces a = 0 too, and
//     softness is impossible unless the numerator vanishes — which is the fake pole. Nothing is
//     gradual about it: a conjugate pair collides and the isotropy jumps to exactly 1.
//
// BOTH ROUTES HAVE BEEN OBSERVED, on different hard targets, which is worth knowing before anyone
// generalises from one run:
//
//   · aiming at the target this test finds, the poles STAY complex — closest approach to the real
//     axis 6.9e-3 — and the pair at 1.387 ± 0.062i tilts to |a|/|b| = 0.886 and 141.6°, while the
//     other four stay at 1.000000 and 90.00° to the last digit;
//   · aiming at a target from a slightly different search, the pair nearest the real axis
//     (1.326 ± 0.0129i) COLLIDES by the sixth step and lands at 1.392 and 1.271 with |Im| ~ 1e-47.
//
// Either way it is TWO poles of six that harden and four that do not move off alignment at all.
// The eleven orders are local to one conjugate pair, not a global rotation.
//
// AN EARLIER VERSION OF THIS FILE SAID THERE WAS "NOTHING TO POINT AT" AT THE WALL. There was: the
// alignment of one pair had tilted badly. The quantity had simply not been measured — the end state
// was checked for collisions, reductions and sign changes, none of which is what happened.
//
// AND IT IS STILL SOLVER-LIMITED, which the mechanism does not change: the drive stalls before the
// remaining four poles do anything at all. The residual at the
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
    let wentReal = 0
    let minImEver = Infinity
    let alignedThroughout = 0
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
        // track the POLES ALONG THE PATH, not only at the end
        const rs = polesOf(cur)
        for (const z of rs) minImEver = Math.min(minImEver, Math.abs(z.im))
        wentReal = Math.max(wentReal, rs.filter((z) => Math.abs(z.im) < 1e-12).length)
        alignedThroughout = Math.max(alignedThroughout, rs.filter((z) => Math.abs(z.im) >= 1e-12).length)
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

    // HOW it hardened: q(r) = a + i·b, and soft is |a| = |b| with a ⊥ b.
    const roots = polesOf(endState)
    const qp = [0, 1, 2].map((i) => bernsteinToPower(endState.P.map((p, j) => endState.w[j] * p[i])))
    console.log(`    at the wall: W true degree ${roots.length}; alignment at each pole` +
      ` (soft is 1.000000 at 90.00°):`)
    for (const z of roots) {
      const qv = qp.map((c) => cpeval(c, z))
      const a = qv.map((c) => c.re)
      const b = qv.map((c) => c.im)
      const na = Math.hypot(...a)
      const nb = Math.hypot(...b)
      const ang = (180 / Math.PI) * Math.acos(Math.max(-1, Math.min(1,
        a.reduce((sm, v, i) => sm + v * b[i], 0) / Math.max(na * nb, 1e-300))))
      console.log(`      r ${z.re.toFixed(3)}${z.im >= 0 ? '+' : '-'}${Math.abs(z.im).toFixed(4)}i` +
        `  |a|/|b| ${(na / Math.max(nb, 1e-300)).toExponential(2)}  angle ${ang.toFixed(2)}°` +
        `  ${Math.abs(z.im) < 1e-12 ? '<- REAL, so b = 0 and it CANNOT be soft' : ''}`)
    }
    // Which of the two routes did this run take?
    const tilted = roots.filter((z) => {
      if (Math.abs(z.im) < 1e-12) return false
      const qv = qp.map((c) => cpeval(c, z))
      const na = Math.hypot(...qv.map((c) => c.re))
      const nb = Math.hypot(...qv.map((c) => c.im))
      return Math.abs(na / Math.max(nb, 1e-300) - 1) > 1e-3
    }).length
    console.log(`    along the whole path: ${wentReal} pole(s) reached the real axis` +
      ` (closest approach ${minImEver.toExponential(1)}), ${alignedThroughout} stayed complex;` +
      ` ${tilted} tilted off |a| = |b| while staying complex`)
    expect(roots.length, 'the curve has not reduced').toBe(D)
    expect(new Set(endState.w.map(Math.sign)).size, 'no weight has crossed zero').toBe(1)
    // The mechanism, asserted without prescribing WHICH route: hardening happens at some poles by
    // one of the two, and the rest keep their alignment exactly.
    expect(wentReal + tilted, 'some pole either went real or left the |a| = |b| alignment')
      .toBeGreaterThan(0)
    expect(wentReal + tilted, 'and not all of them did — this is local to a conjugate pair')
      .toBeLessThan(D)
  }, 900_000)
})
