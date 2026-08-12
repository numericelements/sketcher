// ============================================================================
// WHAT EXACTLY IS ON THE SPHERE IN SLIDE 18 — the identification, measured rather than recalled.
//
// Four questions, all about the SAME seed the figure draws (slide 16's seed, so the two slides are two
// views of one curve): which curve is it, what degree, is the indicatrix rational and of what degree,
// and does the slide-16 fiber loop share one indicatrix or carry a family of them.
//
// THE LAST ONE IS THE TRAP, and it is why this file exists. The gauge 𝒜 ↦ 𝒜e^{iθ} leaves the hodograph
// COMPLETELY alone — N = 𝒜e^{iθ} i e^{−iθ}𝒜̄ = 𝒜i𝒜̄ — so if the swept loop were the gauge orbit, every
// member would be the same curve and the sweep would show nothing. It plainly does show something, so the
// loop is NOT the gauge orbit and each member must have its own indicatrix. Measured here instead of
// argued, because the caption on slide 16 calls the freedom a "Hopf phase" and that wording invites
// exactly the wrong conclusion.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { dataOf, fiberLoop, toMember, type OnePoleParams } from '../rationalPHOnePoleSpatial'
import { indicatrixAt, indicatrixLoop } from '../tangentIndicatrix'

/** The seed both slide 16 and slide 18 draw. */
const SEED: OnePoleParams = {
  b0: { u: 1.0, v: 0.3, p: -0.4, q: 0.2 },
  b2: { u: 0.25, v: -0.5, p: 0.15, q: 0.35 },
  lambda: 0.6,
  pole: 1.7,
}

/** Degree of a polynomial: the highest coefficient that is not dead relative to the largest. */
const degreeOf = (c: readonly number[]): number => {
  const scale = Math.max(...c.map(Math.abs), 1e-300)
  let d = c.length - 1
  while (d > 0 && Math.abs(c[d]) < 1e-12 * scale) d--
  return d
}

/** Euclidean gcd on real coefficient arrays, with a relative cut for "this remainder is zero". */
function polyGcd(a: readonly number[], b: readonly number[]): number[] {
  const trim = (c: readonly number[]): number[] => c.slice(0, degreeOf(c) + 1)
  let x = trim(a)
  let y = trim(b)
  const scale = Math.max(...a.map(Math.abs), ...b.map(Math.abs), 1e-300)
  while (degreeOf(y) > 0 || Math.abs(y[0]) > 1e-10 * scale) {
    const dx = degreeOf(x)
    const dy = degreeOf(y)
    if (dx < dy) {
      ;[x, y] = [y, x]
      continue
    }
    const r = [...x]
    for (let s = dx - dy; s >= 0; s--) {
      const f = r[s + dy] / y[dy]
      for (let k = 0; k <= dy; k++) r[s + k] -= f * y[k]
    }
    const rem = trim(r.slice(0, dy))
    if (Math.max(...rem.map(Math.abs)) < 1e-10 * scale) return trim(y)
    ;[x, y] = [y, rem]
  }
  return trim(x)
}

describe('what the sphere is showing', () => {
  const m = toMember(SEED)

  it('the underlying curve is a rational PH SPACE curve of degree 4, with one pole', () => {
    const degP = Math.max(...m.p.map(degreeOf))
    const degW = degreeOf(m.w)
    console.log(
      `    c = p/w   deg p = ${degP}, deg w = ${degW}  →  rational space curve of degree ${Math.max(degP, degW)}` +
        `\n    spinor 𝒜 degree 2, poles m = 1, so degree = 2n − m + 1 = ${2 * 2 - 1 + 1}` +
        `\n    PH defect ${Number(m.consistency).toExponential(1)} — the PH property is a substitution, not a fit`,
    )
    expect(degP).toBe(4)
    expect(degW).toBe(1)
  })

  it('the indicatrix is a rational curve of degree 4 on the sphere — N and σ share no factor', () => {
    const degs = [degreeOf(m.N[0]), degreeOf(m.N[1]), degreeOf(m.N[2]), degreeOf(m.sigma)]
    let g = polyGcd(m.sigma, m.N[0])
    g = polyGcd(g, m.N[1])
    g = polyGcd(g, m.N[2])
    const common = degreeOf(g)
    console.log(
      `    T = N/σ with deg N = ${degs.slice(0, 3).join(', ')} and deg σ = ${degs[3]}` +
        `\n    gcd(σ, N₁, N₂, N₃) has degree ${common}  →  the map t ↦ T has degree ${degs[3] - common}` +
        `\n    σ = |𝒜|² is > 0 for every real t, so no real root can cancel; the pole r = 1.7 is NOT a` +
        `\n    zero of the denominator here — σ(r) = ${m.sigma.reduce((a, c, k) => a + c * Math.pow(1.7, k), 0).toFixed(4)}`,
    )
    expect(common, 'no common factor, so the degree does not drop').toBe(0)
    expect(degs[3] - common).toBe(4)
  })

  it('and it is NOT a circle: a degree-4 spherical curve, not a doubly-traversed conic', () => {
    // Worth pinning because the natural guess is wrong. The Hopf map's INVARIANTS are |z|² − |w|² and zw
    // (the gauge acts as (z,w) ↦ (z e^{iθ}, w e^{−iθ})), NOT the ratio [z : w]. Had it been the ratio, the
    // indicatrix would be a degree-2 map onto P¹ followed by the conic embedding — a circle covered twice.
    // It is not, and the flatness test says so: fit the best plane through the loop and measure the spread.
    const pts = indicatrixLoop(m, 240)
    const c = pts.reduce((a, p) => ({ x: a.x + p.x / pts.length, y: a.y + p.y / pts.length, z: a.z + p.z / pts.length }), { x: 0, y: 0, z: 0 })
    // smallest singular direction of the centred cloud, by power iteration on the inverse — here just the
    // eigenvector of the 3×3 scatter matrix with the least eigenvalue, found by cyclic Jacobi-free sweep.
    const S = [0, 1, 2].map((i) => [0, 1, 2].map((j) => pts.reduce((a, p) => {
      const v = [p.x - c.x, p.y - c.y, p.z - c.z]
      return a + v[i] * v[j]
    }, 0) / pts.length))
    let best = { spread: Infinity, n: [0, 0, 1] }
    for (let a = 0; a < 60; a++) for (let b = 0; b < 60; b++) {
      const th = (Math.PI * a) / 60
      const ph = (2 * Math.PI * b) / 60
      const n = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]
      const q = n.reduce((acc, ni, i) => acc + ni * n.reduce((s, nj, j) => s + S[i][j] * nj, 0), 0)
      if (q < best.spread) best = { spread: q, n }
    }
    const outOfPlane = Math.sqrt(best.spread)
    console.log(
      `    best-fit plane through the whole indicatrix: out-of-plane spread ${outOfPlane.toFixed(4)}` +
        `\n    a circle on the sphere would read 0 here — this is genuinely non-planar`,
    )
    expect(outOfPlane, 'not planar, so not a circle').toBeGreaterThan(0.05)
  })

  it('every member of the slide-16 loop has its OWN indicatrix — the loop is not the gauge orbit', () => {
    // If the swept freedom were the gauge 𝒜 ↦ 𝒜e^{iθ}, N would be untouched and all members would be one
    // curve. Measure how far the indicatrix actually moves around the loop.
    const members = fiberLoop(SEED, { steps: 96, stride: 0.05 })
    const base = toMember(SEED)
    let worst = 0
    let dataWorst = 0
    for (const prm of members) {
      const mm = toMember(prm)
      for (let k = 0; k <= 20; k++) {
        const t = k / 20
        const a = indicatrixAt(base, t)
        const b = indicatrixAt(mm, t)
        worst = Math.max(worst, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z))
      }
      const d0 = dataOf(base)
      const d1 = dataOf(mm)
      dataWorst = Math.max(dataWorst, Math.max(...d0.map((v, i) => Math.abs(v - d1[i]))))
    }
    console.log(
      `    ${members.length} members;  worst |T_member(t) − T_seed(t)| over the loop = ${worst.toFixed(4)}` +
        `\n    held data moves at most ${dataWorst.toExponential(1)} — the interpolation conditions ARE held,` +
        `\n    so the loop moves the indicatrix while fixing the data: a family of spheres pictures, not one.`,
    )
    expect(worst, 'the indicatrix genuinely varies along the loop').toBeGreaterThan(0.1)
    expect(dataWorst, 'while the held data does not').toBeLessThan(1e-6)
  })
})
