// ============================================================================
// DO THE TWO DEGREE-6 FIBRE DIRECTIONS DESERVE TWO SLIDERS? — measured before drawing anything.
//
// §9.5 of RATIONAL_PH_STATE says measure the configuration before designing the picture, and this is
// the measurement the next slide pair needs. Degree 6, one pole, full C¹ Hermite held: the fibre is
// 12 − 9 − 1 = 2, so the design calls for TWO fibre sliders. Two sliders are only honest if the two
// directions move the picture DIFFERENTLY and by comparable amounts. If one is nearly dead, the figure
// offers a handle the family does not really have (§9.2), and if they move it the same way the second
// slider is a redundant twin.
//
// THE MEASURE HAS TO BE BASIS-INDEPENDENT. The 2-plane of fibre tangents has no preferred axes — any
// rotation of them is as good — so "the angle between direction 1 and direction 2" is not a fact about
// the family. What IS a fact: take the linear map (fibre tangent 2-plane) → (motion of the drawn
// object), and look at its two SINGULAR VALUES. σ₂/σ₁ is invariant under any choice of axes. σ₂/σ₁ ≈ 1
// means both sliders bite equally whichever way you cut the plane; σ₂/σ₁ ≈ 0 means one direction is
// dead no matter how the sliders are chosen.
//
// THE CONTROL is the polynomial PH quintic, whose Hermite fibre is the classical torus — two Hopf
// circles mod the diagonal gauge, derived in closed form in `spatialQuinticTorus.test.ts`. It is a
// known-good two-slider family, so its σ₂/σ₁ is the scale against which the rational sextic's number
// means something. Both run through ONE code path here; only the base params differ.
//
// MEASURED:
//
//                         rank of the      σ₂/σ₁, indicatrix motion on the drawn piece t ∈ [0,1]
//                         Hermite map
//     polynomial quintic     9 of 9        0.069        ← the classical torus. THE CONTROL.
//     rational sextic        9 of 9        0.093        at the seed; 0.071 … 0.346 over the sweep
//
// The rank is 9 of 9 and the kernel 3 (two fibre + the gauge) at EVERY configuration swept — λ at
// 5°/35°/70°, r at 1.15/1.7/4, two members each. So the fibre is 2-dimensional everywhere the slide
// would put the user, and both directions move both the sphere and the curve.
//
// AND A THRESHOLD THIS FILE GOT WRONG, KEPT HERE BECAUSE IT IS THE LESSON. It first asserted
// σ₂/σ₁ > 0.1 as "the second slider is not dead" — and THE CONTROL FAILED IT at 0.069. The classical
// torus is not a one-parameter family, so 0.1 was an invented pass mark, not a fact.
//
// The reason the ratio misleads: it is measured in the coordinate metric on the fibre plane, and
// `familyBasis`'s coordinates carry no geometry. A slider is not driven in coordinate length — it is
// driven around its own circle, once. Measured on the control, where both circles are known in closed
// form:
//
//     full turn of φ₂: 16.80        full turn of ψ: 20.68        ratio 0.812
//
// against a differential ratio of 0.069 — the full-turn measure is TWELVE TIMES more balanced. So
// σ₂/σ₁ ≈ 0.07 is not evidence of a weak slider; it is roughly what a balanced two-slider family
// measures. The predictive number needs the two circles, which is the open item in §8.
//
// Swept over several members and several (λ, r), because a number at one configuration restated as a
// structural fact is failure mode §10.1 and it has already cost three retractions.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, derivativeAt, familyBasis, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { orthonormalise } from '../sp11RationalPH'
import {
  QUAT_I, type Quat, type Vec3, gaugeRotate, polarSandwich, qadd, qmul, qscale, qsub,
  quatFromSandwich, sandwich, vadd, vnorm, vscale, vsub,
} from '../quaternion'

const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)

const rankOf = (M: readonly number[][], tol = 1e-9): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

/** Orthonormal basis of ker M, by complement of the row space. */
function kernelOf(M: readonly number[][], cols: number, tol = 1e-9): number[][] {
  const rows = orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol)
  const out: number[][] = []
  for (let i = 0; i < cols; i++) {
    let v: number[] = Array.from({ length: cols }, (_, j) => (i === j ? 1 : 0))
    for (const b of rows) { const d = dot(v, b); v = v.map((q, k) => q - d * b[k]) }
    for (const b of out) { const d = dot(v, b); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > 1e-8) out.push(v.map((q) => q / len))
  }
  return out
}

/** Singular values of a matrix given as COLUMNS, via the 2×2 Gram. Descending. */
function singularValues2(c1: readonly number[], c2: readonly number[]): [number, number] {
  const a = dot(c1, c1), b = dot(c1, c2), d = dot(c2, c2)
  const tr = a + d, det = a * d - b * b
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
  return [Math.sqrt(Math.max(0, tr / 2 + disc)), Math.sqrt(Math.max(0, tr / 2 - disc))]
}

/** A configuration: the family, a chart of it, and the nine C¹ Hermite numbers of a point in it. */
function chartOf(base: MultiPoleParams, phase: number) {
  const B = familyBasis(base)
  const spinorOf = (c: readonly number[]): number[] => {
    const x = new Array<number>(4 * base.A.length).fill(0)
    B.forEach((b, i) => { for (let j = 0; j < x.length; j++) x[j] += c[i] * b[j] })
    return x
  }
  const paramsAt = (c: readonly number[]): MultiPoleParams => ({ ...base, A: unpackSpinor(spinorOf(c)) })
  const c0 = B.map((_, i) => 1.3 * Math.sin(1.7 * i + phase))
  /** c′(0), c′(1), c(1) − c(0). */
  const hermite = (c: readonly number[]): number[] => {
    const m = toMember(paramsAt(c))
    const d0 = derivativeAt(m, 0), d1 = derivativeAt(m, 1)
    const s = curveAt(m, 0), e = curveAt(m, 1)
    return [d0.x, d0.y, d0.z, d1.x, d1.y, d1.z, e.x - s.x, e.y - s.y, e.z - s.z]
  }
  return { B, c0, paramsAt, spinorOf, hermite, dim: B.length }
}

/** Central-difference Jacobian of a vector map. */
function jacobianOf(f: (x: readonly number[]) => number[], x: readonly number[], h = 1e-6): number[][] {
  const m = f(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = h * (Math.abs(x[j]) + 1)
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = f(hi), fl = f(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}

/**
 * The fibre's 2-plane at c₀: ker(∂Hermite) with the Hopf gauge stripped. The gauge 𝒜 ↦ 𝒜i is in the
 * kernel because it moves no curve at all, so it would otherwise occupy one of the three directions
 * and be mistaken for a slider.
 */
function fibrePlane(base: MultiPoleParams, phase: number) {
  const ch = chartOf(base, phase)
  const J = jacobianOf(ch.hermite, ch.c0)
  const ker = kernelOf(J, ch.dim)
  const A = unpackSpinor(ch.spinorOf(ch.c0))
  const gi = A.flatMap((q) => { const r = qmul(q, QUAT_I); return [r.u, r.v, r.p, r.q] })
  const g = ch.B.map((b) => dot(gi, b))
  const gn = Math.hypot(...g)
  const gh = g.map((v) => v / gn)
  // strip the gauge, then re-orthonormalise what is left
  const plane: number[][] = []
  for (const v of ker) {
    let w = v.map((q, i) => q - dot(v, gh) * gh[i])
    for (const b of plane) { const d = dot(w, b); w = w.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...w)
    if (len > 1e-6) plane.push(w.map((q) => q / len))
  }
  return { ...ch, J, rank: rankOf(J), ker, gaugeInKernel: Math.hypot(...J.map((row) => dot(row, gh))), plane }
}

/** How a fibre direction moves the tangent indicatrix, sampled over a parameter range. */
function indicatrixMotion(
  ch: ReturnType<typeof chartOf>, v: readonly number[], span: readonly [number, number], samples = 60,
): number[] {
  const h = 1e-5
  const T = (c: readonly number[]): number[] => {
    const m = toMember(ch.paramsAt(c))
    const out: number[] = []
    for (let i = 0; i <= samples; i++) {
      // the 0.5 offset keeps the sample points off any pole sitting on a round number
      const t = span[0] + ((span[1] - span[0]) * (i + 0.5)) / (samples + 1)
      const d = derivativeAt(m, t)
      const n = Math.hypot(d.x, d.y, d.z)
      out.push(...(Number.isFinite(n) && n > 1e-12 ? [d.x / n, d.y / n, d.z / n] : [0, 0, 0]))
    }
    return out
  }
  const hi = T(ch.c0.map((q, i) => q + h * v[i]))
  const lo = T(ch.c0.map((q, i) => q - h * v[i]))
  return hi.map((q, i) => (q - lo[i]) / (2 * h))
}

/** The same, for the curve itself on the drawn piece — what slide two shows. */
function curveMotion(ch: ReturnType<typeof chartOf>, v: readonly number[], samples = 40): number[] {
  const h = 1e-5
  const P = (c: readonly number[]): number[] => {
    const m = toMember(ch.paramsAt(c))
    const out: number[] = []
    for (let i = 0; i <= samples; i++) {
      const p = curveAt(m, i / samples)
      out.push(p.x, p.y, p.z)
    }
    return out
  }
  const hi = P(ch.c0.map((q, i) => q + h * v[i]))
  const lo = P(ch.c0.map((q, i) => q - h * v[i]))
  return hi.map((q, i) => (q - lo[i]) / (2 * h))
}

const SEXTIC = (lambdaDeg: number, r: number): MultiPoleParams =>
  ({ A: ZERO(4), roots: [r], lambdas: [Math.tan((lambdaDeg * Math.PI) / 180)] })
const QUINTIC: MultiPoleParams = { A: ZERO(3), roots: [], lambdas: [] }

describe('the two degree-6 fibre directions', () => {
  it('THE CONTROL: the polynomial quintic torus is a known-good two-slider family', () => {
    const f = fibrePlane(QUINTIC, 0.6)
    expect(f.dim).toBe(12)
    expect(f.rank).toBe(9)
    expect(f.ker.length).toBe(3)                     // 2 fibre + 1 gauge
    expect(f.gaugeInKernel, 'the gauge really is in the kernel').toBeLessThan(1e-6)
    expect(f.plane.length).toBe(2)

    const [s1, s2] = singularValues2(
      indicatrixMotion(f, f.plane[0], [0, 1]), indicatrixMotion(f, f.plane[1], [0, 1]))
    console.log(`    polynomial quintic:  sigma = ${s1.toFixed(3)}, ${s2.toFixed(3)}   ratio ${(s2 / s1).toFixed(3)}`)
    // 0.069. NOT a pass mark invented here: this is the classical torus, a family nobody would call
    // one-dimensional, so 0.069 is what a legitimate two-slider family measures. The threshold this
    // test originally carried was 0.1, and the control failed it — which is the whole point of having
    // one. What the number establishes is that the second direction is NONZERO, not that it is equal.
    expect(s2 / s1, 'both circles of the classical torus bite').toBeGreaterThan(0.05)
  }, 60_000)

  it('AND WHAT THE RATIO DOES NOT PREDICT: over a FULL TURN the two circles are comparable', () => {
    // The differential ratio is measured in the coordinate metric on the fibre plane, and that metric
    // is arbitrary — familyBasis's coordinates carry no geometry. A slider is not driven in coordinate
    // length; it is driven around its own CIRCLE, once. So the question the figure actually asks is:
    // over a full turn of each coordinate, how far does the indicatrix travel?
    //
    // For the polynomial quintic we can answer it exactly, because the two circles are known in closed
    // form (spatialQuinticTorus: three Hopf angles, gauge the diagonal). Measured below, the two
    // full-turn travels come out within a factor of ~2 of each other while the differential ratio is
    // 0.069 — a factor of 14. SO THE DIFFERENTIAL RATIO IS A POOR PREDICTOR OF SLIDER FEEL, and the
    // rational sextic's 0.07–0.37 should not be read as "the second slider will be nearly dead".
    const D0: Vec3 = { x: 1.1, y: 0.4, z: -0.3 }
    const D1: Vec3 = { x: 0.6, y: -0.9, z: 0.5 }
    const DP: Vec3 = { x: 1.0, y: 0.25, z: 0.15 }
    /** The closed form, in the BERNSTEIN basis this derivation uses. */
    const member = (phi2: number, psi: number): [Quat, Quat, Quat] => {
      const A0 = quatFromSandwich(D0)!
      const A2 = gaugeRotate(quatFromSandwich(D1)!, phi2)
      const S = qadd(A0, A2)
      const V = vsub(vsub(vsub(vscale(DP, 5), sandwich(A0)), sandwich(A2)),
        vscale(polarSandwich(A0, A2), 1 / 6))
      const Y = gaugeRotate(quatFromSandwich(vadd(vscale(V, 3 / 2), vscale(sandwich(S), 9 / 16)))!, psi)
      return [A0, qsub(Y, qscale(S, 3 / 4)), A2]
    }
    const indicatrix = (A: readonly [Quat, Quat, Quat]): number[] => {
      const out: number[] = []
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, s = 1 - t
        const a = qadd(qadd(qscale(A[0], s * s), qscale(A[1], 2 * s * t)), qscale(A[2], t * t))
        const d = sandwich(a)
        const n = vnorm(d)
        out.push(d.x / n, d.y / n, d.z / n)
      }
      return out
    }
    /** Path length of the indicatrix configuration as one angle runs a full 2π. */
    const travel = (fixed: number, which: 'phi2' | 'psi', steps = 720): number => {
      let total = 0
      let prev = indicatrix(which === 'phi2' ? member(0, fixed) : member(fixed, 0))
      for (let k = 1; k <= steps; k++) {
        const a = (2 * Math.PI * k) / steps
        const cur = indicatrix(which === 'phi2' ? member(a, fixed) : member(fixed, a))
        total += Math.hypot(...cur.map((v, i) => v - prev[i]))
        prev = cur
      }
      return total
    }
    const tPhi = travel(1.9, 'phi2'), tPsi = travel(0.7, 'psi')
    console.log(
      `    full turn of phi2: ${tPhi.toFixed(2)}    full turn of psi: ${tPsi.toFixed(2)}` +
        `    ratio ${(Math.min(tPhi, tPsi) / Math.max(tPhi, tPsi)).toFixed(3)}`,
    )
    expect(Math.min(tPhi, tPsi) / Math.max(tPhi, tPsi),
      'over a full turn the two circles are comparable, unlike the differential ratio')
      .toBeGreaterThan(0.25)
  }, 60_000)

  it('THE RATIONAL SEXTIC: the fibre is 2-dimensional and both directions bite', () => {
    const f = fibrePlane(SEXTIC(35, 1.7), 0.6)
    expect(f.dim).toBe(12)                           // 4(n+1) − 4m = 16 − 4
    expect(f.rank).toBe(9)                           // C¹ Hermite is fully interpolable here
    expect(f.ker.length).toBe(3)
    expect(f.gaugeInKernel).toBeLessThan(1e-6)
    expect(f.plane.length).toBe(2)                   // 12 − 9 − 1 = 2, the two sliders
    expect(phDefect(toMember(f.paramsAt(f.c0)))).toBeLessThan(1e-12)

    const ind = singularValues2(
      indicatrixMotion(f, f.plane[0], [0, 1]), indicatrixMotion(f, f.plane[1], [0, 1]))
    const full = singularValues2(
      indicatrixMotion(f, f.plane[0], [-2, 2]), indicatrixMotion(f, f.plane[1], [-2, 2]))
    const crv = singularValues2(curveMotion(f, f.plane[0]), curveMotion(f, f.plane[1]))
    console.log(`    rational sextic, indicatrix on [0,1]:   sigma = ${ind[0].toFixed(3)}, ${ind[1].toFixed(3)}   ratio ${(ind[1] / ind[0]).toFixed(3)}`)
    console.log(`    rational sextic, indicatrix on [-2,2]:  sigma = ${full[0].toFixed(3)}, ${full[1].toFixed(3)}   ratio ${(full[1] / full[0]).toFixed(3)}`)
    console.log(`    rational sextic, curve on [0,1]:        sigma = ${crv[0].toFixed(3)}, ${crv[1].toFixed(3)}   ratio ${(crv[1] / crv[0]).toFixed(3)}`)
    expect(ind[1] / ind[0], 'the second slider is not dead on the sphere').toBeGreaterThan(0.05)
    expect(crv[1] / crv[0], 'nor on the curve').toBeGreaterThan(0.05)
  }, 60_000)

  it('AND IT HOLDS ACROSS THE CHART, not just at one seed', () => {
    // §10.1: a number measured at one configuration is not a structural fact until it is swept.
    const rows: string[] = []
    let worst = Infinity, worstAt = ''
    for (const lam of [5, 35, 70]) {
      for (const r of [1.15, 1.7, 4]) {
        for (const phase of [0.6, 2.4]) {
          const f = fibrePlane(SEXTIC(lam, r), phase)
          if (f.plane.length !== 2 || f.rank !== 9) { rows.push(`  lam ${lam} r ${r} ph ${phase}: rank ${f.rank}, plane ${f.plane.length}`); continue }
          const [s1, s2] = singularValues2(
            indicatrixMotion(f, f.plane[0], [0, 1]), indicatrixMotion(f, f.plane[1], [0, 1]))
          if (s2 / s1 < worst) { worst = s2 / s1; worstAt = `lambda ${lam} deg, r ${r}, phase ${phase}` }
          rows.push(`    lam ${String(lam).padStart(2)}deg  r ${String(r).padStart(4)}  ph ${phase}:  ` +
            `sigma ${s1.toExponential(2)} / ${s2.toExponential(2)}  ratio ${(s2 / s1).toFixed(3)}`)
        }
      }
    }
    rows.forEach((r) => console.log(r))
    console.log(`    worst ratio over the sweep: ${worst.toFixed(3)} at ${worstAt}`)
    expect(worst, 'nowhere in the swept chart does the second direction go dead').toBeGreaterThan(0.02)
  }, 120_000)
})
