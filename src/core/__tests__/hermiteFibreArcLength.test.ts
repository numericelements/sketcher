// ============================================================================
// ARC LENGTH ON THE DEGREE-6 HERMITE FIBRE — rational, and NOT constant. Two answers, one expected.
//
// TWO QUESTIONS, both Eric's.
//
// 1. IS THE ARC LENGTH RATIONAL, or does it need log / arctan?  RATIONAL, always. That is the whole
//    reason to want rational PH curves (Farouki & Sakkalis 2019, "rational arc lengths by direct
//    integration") and it survives every case tried here, including COMPLEX poles, where an
//    irreducible quadratic denominator is exactly where an arctan would come from.
//
//    The mechanism is prettier than "Σ is an empty sum at one pole". The log coefficient at a root is
//
//        Bₖ = [σ′(rₖ) − 2σ(rₖ)Σₖ] / φₖ(rₖ)²  ,   φₖ = w/(t − rₖ)
//
//    and the residue condition forces the bracket to vanish AT EVERY ROOT: with 𝒜′(r) = 𝒜(r)(Σ + λi),
//
//        σ′ = 2Re(𝒜′𝒜̄) = 2Σ·Re(𝒜𝒜̄) + 2λ·Re(𝒜i𝒜̄) = 2Σσ + 0
//
//    because 𝒜i𝒜̄ is a PURE VECTOR — the Hopf map doing a third job, after making PH free and making
//    the interpolation fibre a circle. `rationalArcLength.test.ts` pins the two-pole case; this file
//    adds the degree-6 one-pole curve the slides actually draw, and the complex-pole case.
//
// 2. IS THE ARC LENGTH CONSTANT ALONG THE FIBRE SLIDERS?  **NO** — it varies by 0.6 % to 1.6 %.
//
//    This is worth stating loudly because the sibling result says the opposite, and the two are about
//    DIFFERENT FIBRES. `torusTimesRoads` measures arc length EXACTLY constant (1e-9) — but on the
//    degree-5 two-pole family holding SIX numbers (c′(0) and c(1)), whose fibre is 1-dimensional. The
//    degree-6 pair holds NINE (full C¹ Hermite) and its fibre is 2-dimensional, and there the length
//    moves. So "the torus kept its incapacity" does not carry over, and a slide must not say it does.
//
//    Measured identically along A alone, B alone and the whole grid — the variation is a property of
//    the fibre, not of one slider.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  familyBasis, speedAt, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import {
  cx, familyBasis as cBasis, phDefect as cPH, speedAt as cSpeed, toMember as cMember,
  unpackSpinor as cUnpack, type ComplexPoleParams,
} from '../rationalPHComplexPoleSpatial'
import { hermiteChart } from '../rationalHermiteCircles'
import { leastSquares } from '../linalg'
import type { Quat } from '../quaternion'

const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
const ev = (p: readonly number[], t: number): number => p.reduceRight((a, c) => a * t + c, 0)

const seedR = (r: number, thDeg: number): MultiPoleParams => {
  const base: MultiPoleParams = {
    A: Array.from({ length: 4 }, () => ZQ), roots: [r], lambdas: [Math.tan((thDeg * Math.PI) / 180)],
  }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
  return { ...base, A: unpackSpinor(x) }
}
const arc = (m: MultiPoleParams, N = 40000): number => {
  const mem = toMember(m)
  let s = 0
  for (let i = 0; i < N; i++) s += speedAt(mem, (i + 0.5) / N) / N
  return s
}
/**
 * Fit S(t) = u(t)/w(t) + v(t) with S′ = σ/w², i.e. u′w − uw′ + v′w² = σ. If it fits, the antiderivative
 * is RATIONAL — no log, no arctan. Returns the residual and S(1) − S(0).
 */
function rationalAntiderivative(sigma: readonly number[], w: readonly number[]): { res: number; total: number } {
  const scale = Math.max(...sigma.map(Math.abs), 1e-300)
  const du = sigma.length, dvg = sigma.length
  const w2: number[] = []
  for (let a = 0; a < w.length; a++) for (let b = 0; b < w.length; b++) w2[a + b] = (w2[a + b] ?? 0) + w[a] * w[b]
  const dw = w.slice(1).map((c, i) => c * (i + 1))
  const rows: number[][] = [], rhs: number[] = []
  const top = Math.max(sigma.length, du + w.length, dvg + w2.length) + 1
  for (let e = 0; e < top; e++) {
    const row = new Array<number>(du + 1 + dvg + 1).fill(0)
    for (let k = 0; k <= du; k++) {
      let acc = 0
      for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
      for (let a = 0; a < dw.length; a++) if (k + a === e) acc -= dw[a]
      row[k] = acc
    }
    for (let k = 0; k <= dvg; k++) {
      let acc = 0
      for (let a = 0; a < w2.length; a++) if (k - 1 + a === e) acc += k * w2[a]
      row[du + 1 + k] = acc
    }
    rows.push(row); rhs.push(sigma[e] ?? 0)
  }
  const sol = leastSquares(rows, rhs, 1e-14)
  const res = Math.max(...rows.map((row, i) => Math.abs(row.reduce((s, v, j) => s + v * sol[j], 0) - rhs[i]))) / scale
  const u = sol.slice(0, du + 1), v = sol.slice(du + 1)
  const S = (t: number): number => ev(u, t) / ev(w, t) + ev(v, t)
  return { res, total: S(1) - S(0) }
}

describe('arc length on the degree-6 Hermite fibre', () => {
  it('IT IS RATIONAL — an explicit u/w + v matches quadrature to nine digits', () => {
    for (const [r, th] of [[1.7, 35], [1.7, 0], [4, -35], [1.06, 70]] as const) {
      const mem = toMember(seedR(r, th))
      const { res, total } = rationalAntiderivative(mem.sigma as number[], mem.w as number[])
      const quad = arc(seedR(r, th), 200000)
      console.log(
        `    r=${String(r).padStart(5)} θ=${String(th).padStart(4)}°:  fits to ${res.toExponential(1)},` +
          `  S(1)−S(0) ${total.toFixed(9)}  vs quadrature ${quad.toFixed(9)}`,
      )
      expect(res, 'the antiderivative really is rational').toBeLessThan(1e-12)
      expect(Math.abs(total - quad) / quad, 'and it is the arc length').toBeLessThan(1e-8)
    }
  }, 300_000)

  it('AND STILL RATIONAL WITH COMPLEX POLES — no arctan, which is where one would appear', () => {
    for (const [n, re, im, lr, li] of [
      [3, 0.5, 0.8, 0.3, 0.0], [3, 0.5, 0.8, 0.3, 0.4], [3, 1.4, 0.6, -0.2, 0.5], [4, 0.5, 1.2, 0.3, 0.4],
    ] as const) {
      const base: ComplexPoleParams = {
        A: Array.from({ length: n + 1 }, () => ZQ), pairs: [cx(re, im)], lambdas: [cx(lr, li)],
      }
      const B = cBasis(base)
      expect(B.length, 'the complex-pole family is nonempty here').toBeGreaterThan(0)
      const x = new Array<number>(4 * (n + 1)).fill(0)
      B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 4 * (n + 1); j++) x[j] += a * b[j] })
      const m: ComplexPoleParams = { ...base, A: cUnpack(x) }
      const mem = cMember(m)
      expect(cPH(mem)).toBeLessThan(1e-12)
      expect(mem.denominatorFloor, 'w > 0 on all of ℝ — the point of complex poles').toBeGreaterThan(0)

      const { res, total } = rationalAntiderivative(mem.sigma as number[], mem.w as number[])
      let quad = 0
      const N = 200000
      for (let i = 0; i < N; i++) quad += cSpeed(mem, (i + 0.5) / N) / N
      console.log(
        `    pole ${re}+${im}i, λ ${lr}+${li}i:  fits to ${res.toExponential(1)},` +
          `  S(1)−S(0) ${total.toFixed(9)}  vs quadrature ${quad.toFixed(9)}`,
      )
      expect(res, 'no arctan: the antiderivative is rational at complex poles too').toBeLessThan(1e-12)
      expect(Math.abs(total - quad) / quad).toBeLessThan(1e-8)
    }
  }, 300_000)

  it('BUT IT IS NOT CONSTANT along the fibre sliders — 0.6 % to 1.6 %', () => {
    // The sibling result says the opposite and is about a DIFFERENT fibre: torusTimesRoads holds SIX
    // numbers on a 1-dimensional fibre at degree 5, and there the length is constant to 1e-9. Here nine
    // numbers are held and the fibre is 2-dimensional. A slide must not carry the other punchline over.
    let least = Infinity
    for (const [r, th] of [[1.7, 35], [1.7, 0], [4, -35], [1.2, 70]] as const) {
      const ch = hermiteChart(seedR(r, th))!
      const cell = (a: number, b: number): number | null => {
        const q = ch.at(((a + b) * Math.PI) / 180, (b * Math.PI) / 180)
        return q ? arc(q) : null
      }
      const spread = (L: number[]): number => (Math.max(...L) - Math.min(...L)) / Math.max(...L)
      const grid: number[] = [], aOnly: number[] = [], bOnly: number[] = []
      for (const a of [0, 60, 140, 220, 300]) for (const b of [0, 90, 180, 270]) { const v = cell(a, b); if (v) grid.push(v) }
      for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) { const v = cell(a, 0); if (v) aOnly.push(v) }
      for (const b of [0, 45, 90, 135, 180, 225, 270, 315]) { const v = cell(0, b); if (v) bOnly.push(v) }
      console.log(
        `    r=${String(r).padStart(4)} θ=${String(th).padStart(4)}°:  A alone ${spread(aOnly).toExponential(1)},` +
          `  B alone ${spread(bOnly).toExponential(1)},  whole grid ${spread(grid).toExponential(1)}` +
          `   (${Math.min(...grid).toFixed(4)} … ${Math.max(...grid).toFixed(4)})`,
      )
      expect(spread(grid), 'it genuinely moves — well above the 1e-9 quadrature floor').toBeGreaterThan(1e-3)
      least = Math.min(least, spread(grid))
      // and no single slider preserves it either
      expect(spread(aOnly)).toBeGreaterThan(1e-3)
      expect(spread(bOnly)).toBeGreaterThan(1e-3)
    }
    expect(least).toBeGreaterThan(1e-3)
  }, 600_000)
})
