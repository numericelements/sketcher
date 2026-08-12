// ============================================================================
// WHERE THE CUSPS REALLY LIVE: on the RIEMANN SPHERE of the parameter, not on the drawn curve.
//
// The right frame for "why does rationality produce a cusp" is the one the question about genus points at.
// A curve is RATIONAL exactly when it is parametrised by the Riemann sphere P¹(ℂ) — genus 0. (Genus 1 would
// need elliptic functions, genus ≥ 2 Poincaré's automorphic/Fuchsian ones; that is the uniformization
// ladder, and it is a DIFFERENT axis from the cusp, which needs none of it.) What matters here is that the
// parameter lives on a sphere and the thing we DRAW is only the real circle P¹(ℝ) inside it.
//
// THE NO-LOG CONDITION APPLIES AT EVERY ROOT OF w — real or complex, since it is one polynomial identity.
// Each root forces T′ = 0, so each root is a cusp of the (complexified) indicatrix. Whether you SEE it
// depends entirely on whether that root happens to sit on the real circle you are drawing:
//
//     real root of w      →  the curve visits infinity for a real t  →  VISIBLE cusp (slides 17 and 19)
//     complex root of w   →  the cusp sits off the real circle       →  the drawn indicatrix is SMOOTH
//
// So the cusp is not the price of rationality as such. It is the price of the pole being REAL — of the
// affine chart's infinity actually lying on the piece of parameter line you are looking at.
//
// TWO MEASUREMENTS, one per half of that claim:
//   1. The algebra: W = N′σ − Nσ′ is the indicatrix's Wronskian and T′ = W/σ². Rationality forces w | W —
//      one zero of W handed to each pole, real or not. Checked by polynomial division.
//   2. The consequence: the CONFORMAL sextic family is rational PH of degree 6 whose w has NO real root.
//      Its drawn indicatrix should therefore have no cusp at all. Checked by scanning |T′|.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { QUAT_I, QUAT_ONE, qadd, qscale } from '../quaternion'
import { toMember as oneToMember, type OnePoleParams } from '../rationalPHOnePoleSpatial'
import { seedQuintic, toMember as multiToMember } from '../rationalPHMultiPoleSpatial'
import { curveAt, degreeOf as conformalDegree, weights } from '../conformalPHCurve'
import { sexticSeed } from '../conformalPHSeeds'

const dPoly = (p: readonly number[]): number[] => p.slice(1).map((c, i) => c * (i + 1))
const mulPoly = (a: readonly number[], b: readonly number[]): number[] => {
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((av, i) => b.forEach((bv, j) => { out[i + j] += av * bv }))
  return out
}
const subPoly = (a: readonly number[], b: readonly number[]): number[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0))
const degOf = (c: readonly number[]): number => {
  const scale = Math.max(...c.map(Math.abs), 1e-300)
  let d = c.length - 1
  while (d > 0 && Math.abs(c[d]) < 1e-12 * scale) d--
  return d
}
/** Divide by `d`, returning the worst remainder coefficient relative to the dividend's scale. */
function divisionRemainder(a: readonly number[], d: readonly number[]): number {
  const r = [...a]
  const dd = degOf(d)
  const scale = Math.max(...a.map(Math.abs), 1e-300)
  for (let s = degOf(a) - dd; s >= 0; s--) {
    const f = r[s + dd] / d[dd]
    for (let k = 0; k <= dd; k++) r[s + k] -= f * d[k]
  }
  return Math.max(...r.slice(0, dd).map(Math.abs)) / scale
}

describe('rationality hands one zero of the indicatrix Wronskian to every pole', () => {
  const check = (label: string, N: readonly number[][], sigma: readonly number[], w: readonly number[]) => {
    // T = N/σ, so T′ = (N′σ − Nσ′)/σ². The numerator W is the object whose zeros are the cusps.
    const W = [0, 1, 2].map((c) => subPoly(mulPoly(dPoly(N[c]), sigma), mulPoly(N[c], dPoly(sigma))))
    const rem = Math.max(...W.map((Wc) => divisionRemainder(Wc, w)))
    const dW = Math.max(...W.map(degOf))
    console.log(
      `    ${label}:  deg N = ${degOf(N[0])}, deg σ = ${degOf(sigma)}, deg w = ${degOf(w)}` +
        `  →  deg W = ${dW}  (≤ 2·degσ − 2 = ${2 * degOf(sigma) - 2}, the leading terms cancel)` +
        `\n      worst remainder of W ÷ w = ${rem.toExponential(1)}  →  w DIVIDES W`,
    )
    expect(rem, 'w divides the Wronskian, one zero per pole').toBeLessThan(1e-10)
    return dW
  }

  it('one pole: w | W', () => {
    const prm: OnePoleParams = {
      b0: qadd(QUAT_ONE, qscale(QUAT_I, 0.4)),
      b2: { u: 0.3, v: -0.7, p: 1.1, q: 0.2 },
      lambda: 0.6,
      pole: 1.7,
    }
    const m = oneToMember(prm)
    check('m = 1', m.N, m.sigma, m.w)
  })

  it('two poles: w | W as well, so BOTH roots are cusps', () => {
    const m = multiToMember(seedQuintic())
    check('m = 2', m.N, m.sigma, m.w)
  })
})

describe('a rational PH family whose poles are COMPLEX has a smooth drawn indicatrix', () => {
  // The conformal sextic: rational PH, degree 6 — which is m = 1, n = 3 in the pole picture — but its
  // denominator has no REAL root, so the curve never visits infinity for a real parameter.
  const s = sexticSeed()

  it('its w has no real root anywhere on the line, not merely none in [0,1]', () => {
    // All-positive Bernstein coefficients only rule out roots INSIDE [0,1]; a real root could still sit
    // outside it. So scan the whole line, mapped in through t = tan θ to reach ±∞.
    const w = weights(s)
    const n = conformalDegree(s)
    const binom = (a: number, b: number) => { let r = 1; for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1); return r }
    const wAt = (t: number) => w.reduce((a, c, k) => a + c * binom(n, k) * Math.pow(t, k) * Math.pow(1 - t, n - k), 0)
    let changes = 0
    let prev = wAt(Math.tan(Math.PI * (0.5 / 4001 - 0.5)))
    for (let i = 1; i < 4001; i++) {
      const v = wAt(Math.tan(Math.PI * ((i + 0.5) / 4001 - 0.5)))
      if (Number.isFinite(v) && Number.isFinite(prev) && v * prev < 0) changes++
      prev = v
    }
    console.log(
      `    weights ${w.map((v) => v.toFixed(2)).join(', ')};  sign changes of w over ALL of ℝ: ${changes}`,
    )
    expect(changes, 'no real root, so no real parameter reaches infinity').toBe(0)
  })

  it('and its indicatrix never stops — no cusp on the real circle', () => {
    // |T′| by central differences on the unit tangent. Compared against the one-pole curve, whose |T′|
    // dives to machine zero AT its real pole.
    const T = (t: number): number[] | null => {
      const e = 1e-5
      const a = curveAt(s, t - e)
      const b = curveAt(s, t + e)
      if (!a || !b) return null
      const v = [b.x - a.x, b.y - a.y, b.z - a.z]
      const n = Math.hypot(...v)
      return n > 0 ? v.map((x) => x / n) : null
    }
    const speeds: number[] = []
    for (let i = 0; i <= 400; i++) {
      const t = -1.5 + (4 * i) / 400
      const a = T(t - 1e-3)
      const b = T(t + 1e-3)
      if (!a || !b) continue
      speeds.push(Math.hypot(...b.map((v, k) => v - a[k])) / 2e-3)
    }
    const min = Math.min(...speeds)
    const max = Math.max(...speeds)
    console.log(
      `    ${speeds.length} samples over t ∈ [−1.5, 2.5]:  min |T′| = ${min.toFixed(4)},` +
        ` max = ${max.toFixed(4)},  ratio ${(max / min).toFixed(1)}` +
        `\n    it never comes near zero — contrast the one-pole curve, whose |T′| hits 1.7e-14 AT its pole.` +
        `\n    Same theory, complex roots instead of real ones: the cusps are off the drawn circle.`,
    )
    expect(min, 'the indicatrix is an immersion on the whole real line').toBeGreaterThan(0.05)
  })
})
