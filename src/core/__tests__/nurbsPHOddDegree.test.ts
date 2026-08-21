// ============================================================================
// DOES THE PROJECTIVE MODEL REACH ODD DEGREE? — the region the conformal model provably cannot.
//
// The conformal model's parity theorem is proved (conformalPHCurve, near the bottom): ⟨C,C⟩ ≡ 0
// gives ‖q‖² = 2·W·c∞, ‖q‖² is a sum of real squares so each of its real roots has EVEN
// multiplicity, hence (t−r) ∣ c∞ exactly when mult_r(W) is odd — and an odd-degree W must HAVE a
// real root of odd multiplicity, since non-real roots come in conjugate pairs. So every odd-degree
// conformal member factors: it is a degree-(n−1) curve in disguise. Measured there too — degrees
// 3, 5 and 7 give exactly one real root of W every time.
//
// The projective model ‖q′W − qW′‖² = ρ² has NO such obstruction in its equations: deg N = 2d−1 on
// both sides at every d. But "the system is dimensionally consistent" is not "solutions exist", and
// still less "honest solutions exist". So this file solves it and then tries hard to disqualify
// what comes back.
//
// FOUR WAYS A SOLUTION CAN BE FAKE, and all four are checked because three of them have already
// caught something in this repository:
//
//   · ρ ≡ 0        — then N ≡ 0 and the curve is a POINT. A solution of every equation, and an
//                    attractor for anything that does not exclude it.
//   · rank 1       — N parallel to a fixed vector, so ‖N‖² is a perfect square for free. This is
//                    the trap that made "every all-hard solution is a straight line" (THE_MAP);
//                    240 spinor starts produced 48 all-hard hits and every one was a line.
//   · elevation    — q and W both of power-degree < d, a lower-degree curve written in a bigger
//                    Bézier basis. Nothing in the residual notices.
//   · common root  — W(r) = 0 and q(r) = 0 together, so the fraction reduces. This is EXACTLY the
//                    trap the conformal parity theorem springs, and the reason the deck's degree-5
//                    figures turned out to be drawing quartics.
//
// Degree 4 is carried through as a CONTROL: it is even, the conformal model reaches it, and the
// λ-chart quartic is a known-good member of this very variety. If the checks disqualified degree 4
// as well they would be measuring the checks, not the degrees.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinToPower, rootsOf, type Poly } from '../conformalPHHopf'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import {
  type Rat, hodographN, layout, settleToPH,
} from '../nurbsPH'

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}
const csq = (z: Complex): Complex => cmul(z, z)

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

/** A random start: control points in a box, positive weights, rho sampled off the hodograph. */
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

/** Damped minimum-norm Gauss-Newton on the 4d-1 equations (core/nurbsPH.settleToPH). */
function solve(d: number, seed: number): { rat: Rat; residual: number } | null {
  const got = settleToPH(seedRat(d, seed), d)
  return got.residual < 1e-11 ? got : null
}

/** Rank of the hodograph's three coefficient vectors: 1 = a line, 2 = planar, 3 = spatial. */
function hodographRank(N: readonly number[][]): number {
  const basis: number[][] = []
  const scale = Math.max(...N.flat().map(Math.abs), 1e-300)
  for (const row of N) {
    let v = row.map((x) => x / scale)
    for (const u of basis) {
      const dd = u.reduce((s, x, i) => s + x * v[i], 0)
      v = v.map((x, i) => x - dd * u[i])
    }
    const n = Math.hypot(...v)
    if (n > 1e-7) basis.push(v.map((x) => x / n))
  }
  return basis.length
}

interface Verdict {
  honest: boolean
  why: string
  rank: number
  softPoles: number
  hardPoles: number
  /** True if no root of W lies in [0,1] — i.e. the curve is finite on its own interval. */
  usable: boolean
}

/** Try every way of disqualifying a solution, and say which one fired. */
function judge(rat: Rat, d: number): Verdict {
  const N = hodographN(rat)
  const rank = hodographRank(N)
  const rhoScale = Math.max(...rat.rho.map(Math.abs))
  const nScale = Math.max(...N.flat().map(Math.abs))
  const fail = (why: string): Verdict =>
    ({ honest: false, why, rank, softPoles: 0, hardPoles: 0, usable: false })

  if (rhoScale < 1e-8 * Math.max(1, nScale)) return fail('rho = 0, a point')
  if (rank < 2) return fail('rank 1, a straight line')

  const Wp = bernsteinToPower(rat.w)
  const qB = [0, 1, 2].map((i) => rat.P.map((p, k) => rat.w[k] * p[i]))
  const qp = qB.map(bernsteinToPower)
  const wLead = Math.abs(Wp[d]) / Math.max(...Wp.map(Math.abs), 1e-300)
  const qLead = Math.max(...qp.map((c) => Math.abs(c[d]))) / Math.max(...qp.flat().map(Math.abs), 1e-300)
  if (wLead < 1e-8 && qLead < 1e-8) return fail('degree-elevated, really degree < d')

  // common root: W(r) = 0 and q(r) = 0 together means the fraction reduces
  const roots = rootsOf(Wp.map((v) => ({ re: v, im: 0 })))
  const qMag = Math.max(...qp.flat().map(Math.abs), 1e-300)
  let soft = 0
  let hard = 0
  for (const r of roots) {
    const qv = qp.map((c) => cpeval(c, r))
    const mag = Math.max(...qv.map(cnorm))
    if (mag < 1e-7 * qMag) return fail('common root, the fraction reduces')
    // softness IS isotropy of the numerator at the pole: <q(r),q(r)> = 0
    const iso = cnorm(qv.map(csq).reduce(cadd, C0)) / qv.reduce((s, z) => s + cnorm(z) ** 2, 0)
    if (iso < 1e-6) soft++
    else hard++
  }
  // a real root in [0,1] means the curve blows up on its own parameter interval — still a
  // rational PH curve, but not one an editor can show
  const usable = !roots.some((r) => Math.abs(r.im) < 1e-9 && r.re > -1e-9 && r.re < 1 + 1e-9)
  return { honest: true, why: 'genuine', rank, softPoles: soft, hardPoles: hard, usable }
}

describe('the projective model at odd degree', () => {
  it('solves, then tries to disqualify what comes back', () => {
    const STARTS = 140
    for (const d of [3, 4, 5]) {
      const L = layout(d)
      const tally = new Map<string, number>()
      let solved = 0
      let honest = 0
      const ranks = new Map<number, number>()
      let softTotal = 0
      let hardTotal = 0
      let usable = 0
      for (let s = 0; s < STARTS; s++) {
        const got = solve(d, 7919 * d + 31 * s + 5)
        if (!got) { tally.set('no convergence', (tally.get('no convergence') ?? 0) + 1); continue }
        solved++
        const v = judge(got.rat, d)
        tally.set(v.why, (tally.get(v.why) ?? 0) + 1)
        if (v.honest) {
          honest++
          ranks.set(v.rank, (ranks.get(v.rank) ?? 0) + 1)
          softTotal += v.softPoles
          hardTotal += v.hardPoles
          if (v.usable) usable++
        }
      }
      const breakdown = [...tally.entries()].sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${n} ${k}`).join(', ')
      console.log(`  degree ${d}: ${4 * d - 1} equations in ${L.total} unknowns, ${STARTS} starts` +
        `  ->  ${solved} converged, ${honest} GENUINELY degree ${d}`)
      console.log(`      ${breakdown}`)
      if (honest > 0) {
        console.log(`      rank ${[...ranks.entries()].sort().map(([r, n]) => `${r}:${n}`).join(' ')}` +
          `   poles: ${hardTotal} hard, ${softTotal} soft` +
          `   ${usable} of ${honest} have no pole on [0,1]`)
      }
      // Degree 4 is the CONTROL. If the checks disqualified it too they would be measuring
      // themselves; if they disqualified nothing anywhere they would not be checks at all, which
      // is why the four failure modes are each known to fire elsewhere (see the header).
      expect(honest, `degree ${d} is reached, and survives every disqualification`).toBeGreaterThan(0)
      expect(hardTotal, `and hard poles are not rare at degree ${d}`).toBeGreaterThan(0)
    }
  }, 900_000)
})
