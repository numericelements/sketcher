// ============================================================================
// THE DUAL CHART, MEASURED — rational PH curves by support function, and what inflections cost.
//
// PH means the unit tangent is rational. In the DUAL chart you index by that tangent instead of by the
// point, so the condition is free by construction and the point is recovered by DIFFERENTIATION:
//
//     n̂(u) = (1−u², 2u)/D,   t̂(u) = (−2u, 1−u²)/D,   D = 1+u²      (the rational circle)
//     c = h·n̂ + (dh/dθ)·t̂,          dθ/du = 2/D  so  dh/dθ = (D/2)·h_u
//     dc/dθ = (h + h_θθ)·t̂
//
// Everything is rational, no residue condition appears, and ‖c′‖ is rational automatically — which is
// the whole point: integration was the obstruction in the primal chart and there is no integration here.
//
// TWO THINGS THIS FILE MEASURES, because both were asserted in conversation before being checked:
//
//   1. THE DIMENSION COUNT. How many parameters does a degree-d support function carry, what degree of
//      curve comes out, and how big is the Hermite fiber? The claim to test is that prescribing point
//      and tangent direction at each end is LINEAR in h, so the fiber is an affine space and its
//      dimension is (parameters − conditions) exactly — no solver, no rank measurement.
//
//   2. WHAT INFLECTIONS DO. h as a FUNCTION of direction requires the direction map to be injective,
//      and it is not: at an inflection the turning reverses, so θ folds. The fix measured here is to
//      stop requiring a graph — let the direction parameter u ALSO be a rational function of τ, so the
//      dual datum is a rational LEGENDRE CURVE (u(τ), H(τ)) rather than a function h(u). Folds are then
//      allowed and nothing else changes.
//
// A CAVEAT THAT IS STRUCTURAL, not numerical: this chart exists for HYPERSURFACES — plane curves and
// surfaces in R³ — because those have a unique tangent hyperplane at each point. A CURVE in R³ does
// not (the tangent planes form a pencil, deck slide 10), so it has no support function, and that is
// why the spatial conformal work needs a solver where the planar work would not.
// ============================================================================
import { describe, it, expect } from 'vitest'

// --- polynomials in the power basis ----------------------------------------
type Poly = number[]
const pEval = (p: Poly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const pDeriv = (p: Poly): Poly => p.slice(1).map((c, i) => c * (i + 1))

/** The rational unit circle and its tangent, plus dθ/du. */
const circle = (u: number) => {
  const D = 1 + u * u
  return {
    D,
    n: { x: (1 - u * u) / D, y: (2 * u) / D },
    t: { x: (-2 * u) / D, y: (1 - u * u) / D },
    dThetaDu: 2 / D,
  }
}

/**
 * The GRAPH case: h given as a polynomial in u, so the direction is the parameter.
 * c = h·n̂ + (D/2)·h_u·t̂
 */
function curveFromSupport(h: Poly, u: number): { x: number; y: number } {
  const { D, n, t } = circle(u)
  const hv = pEval(h, u)
  const hTheta = (D / 2) * pEval(pDeriv(h), u)
  return { x: hv * n.x + hTheta * t.x, y: hv * n.y + hTheta * t.y }
}

/** h + h_θθ — the radius of curvature, and the speed in θ. Zero is a CUSP, a pole is an inflection. */
function radiusOfCurvature(h: Poly, u: number): number {
  const D = 1 + u * u
  const h1 = pEval(pDeriv(h), u)
  const h2 = pEval(pDeriv(pDeriv(h)), u)
  // h_θθ = (D²/4)·h_uu + (uD/2)·h_u
  return pEval(h, u) + ((D * D) / 4) * h2 + ((u * D) / 2) * h1
}

/**
 * The LEGENDRE case, which is the one that admits inflections: both the direction parameter and the
 * support value are free rational (here polynomial) functions of τ. No graph is required, so u(τ) may
 * turn back — and that fold is exactly an inflection of the curve.
 */
function curveFromLegendre(uOf: Poly, H: Poly, tau: number): { x: number; y: number } {
  const u = pEval(uOf, tau)
  const { D, n, t } = circle(u)
  const uDot = pEval(pDeriv(uOf), tau)
  const HDot = pEval(pDeriv(H), tau)
  // dH/dθ = (dH/dτ)/(dθ/dτ), and dθ/dτ = (2/D)·u̇
  const hTheta = HDot / ((2 / D) * uDot)
  const hv = pEval(H, tau)
  return { x: hv * n.x + hTheta * t.x, y: hv * n.y + hTheta * t.y }
}

const norm = (a: { x: number; y: number }): number => Math.hypot(a.x, a.y)
const sub = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: a.x - b.x, y: a.y - b.y })

/** Numerical curvature of a sampled planar curve, signed. */
function curvatureAt(f: (t: number) => { x: number; y: number }, t: number, e = 1e-4): number {
  const a = f(t - e), b = f(t), c = f(t + e)
  const d1 = { x: (c.x - a.x) / (2 * e), y: (c.y - a.y) / (2 * e) }
  const d2 = { x: (c.x - 2 * b.x + a.x) / (e * e), y: (c.y - 2 * b.y + a.y) / (e * e) }
  const cross = d1.x * d2.y - d1.y * d2.x
  return cross / Math.pow(Math.hypot(d1.x, d1.y), 3)
}

/** Rank by the largest relative gap in the singular values — the repo's rule, no tolerance. */
function rank(rows: number[][]): { rank: number; gap: number } {
  const m = rows.length, n = rows[0]?.length ?? 0
  if (m === 0 || n === 0) return { rank: 0, gap: 0 }
  // Gram matrix eigenvalues via Jacobi on AᵀA is overkill; use QR-free power-free approach:
  // build AᵀA and run symmetric Jacobi.
  const A: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => rows.reduce((s, r) => s + r[i] * r[j], 0)),
  )
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j]
    if (off < 1e-30) break
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) < 1e-300) continue
        const theta = 0.5 * Math.atan2(2 * A[i][j], A[i][i] - A[j][j])
        const c = Math.cos(theta), s = Math.sin(theta)
        for (let k = 0; k < n; k++) {
          const aik = A[i][k], ajk = A[j][k]
          A[i][k] = c * aik + s * ajk
          A[j][k] = -s * aik + c * ajk
        }
        for (let k = 0; k < n; k++) {
          const aki = A[k][i], akj = A[k][j]
          A[k][i] = c * aki + s * akj
          A[k][j] = -s * aki + c * akj
        }
      }
    }
  }
  // Truncate to min(m, n): a matrix with m rows cannot have rank above m, and letting the gap
  // heuristic see the spurious tail reported rank 5 for a 4-row system.
  const sv = Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, A[i][i])))
    .sort((a, b) => b - a)
    .slice(0, Math.min(m, n))
  let best = 0, at = sv.length
  for (let i = 0; i + 1 < sv.length; i++) {
    const ratio = sv[i] / Math.max(sv[i + 1], 1e-300)
    if (ratio > best) { best = ratio; at = i + 1 }
  }
  const zeroLevel = sv[0] * 2.2e-16 * n
  if (sv[sv.length - 1] > zeroLevel && best < 1e6) return { rank: sv.length, gap: best }
  return { rank: at, gap: best }
}

const SAMPLES = [-1.7, -0.9, -0.35, 0.2, 0.6, 1.1, 1.8, 2.4]

describe('the dual chart: rational PH curves by support function', () => {
  it('PH IS FREE HERE: the speed is rational for any h, with no condition imposed', () => {
    // The whole claim of the chart. Pick support functions with nothing special about them and check
    // ‖dc/du‖ against the closed form 2·|h + h_θθ|/D — a rational function of u. No residues, no logs.
    const CASES: { label: string; h: Poly }[] = [
      { label: 'h = 1 (the unit circle)', h: [1] },
      { label: 'h linear', h: [1.4, 0.7] },
      { label: 'h cubic', h: [2, -0.6, 0.35, 0.12] },
      { label: 'h quintic', h: [3, 0.4, -0.9, 0.25, 0.05, -0.02] },
    ]
    for (const { label, h } of CASES) {
      let worst = 0
      for (const u of SAMPLES) {
        const e = 1e-5
        const d = sub(curveFromSupport(h, u + e), curveFromSupport(h, u - e))
        const measured = norm(d) / (2 * e)
        const predicted = (2 * Math.abs(radiusOfCurvature(h, u))) / (1 + u * u)
        worst = Math.max(worst, Math.abs(measured - predicted) / Math.max(predicted, 1e-12))
      }
      console.log(`    ${label.padEnd(24)} ‖dc/du‖ vs 2|h+h_θθ|/D:  ${worst.toExponential(1)}`)
      expect(worst, `${label}: the speed is the closed-form rational function`).toBeLessThan(1e-7)
    }
  })

  it('THE DIMENSION COUNT: a degree-d support polynomial gives d+1 parameters, all effective', () => {
    // Does every coefficient of h move the curve? Sample the curve, differentiate with respect to each
    // coefficient, and take the rank. If the rank is d+1 the chart has no redundancy — which is what
    // makes the count closed-form rather than something to measure per case.
    for (const d of [1, 2, 3, 4, 5, 6]) {
      const h0: Poly = Array.from({ length: d + 1 }, (_, i) => 1 + 0.3 * i - 0.05 * i * i)
      const rows: number[][] = []
      for (const u of SAMPLES) {
        for (const axis of ['x', 'y'] as const) {
          rows.push(h0.map((_, k) => {
            const e = 1e-6
            const hp = h0.slice(); hp[k] += e
            const hm = h0.slice(); hm[k] -= e
            return (curveFromSupport(hp, u)[axis] - curveFromSupport(hm, u)[axis]) / (2 * e)
          }))
        }
      }
      const r = rank(rows)
      console.log(`    deg h = ${d}:  parameters ${d + 1}, effective ${r.rank}  (gap ${r.gap.toExponential(1)})`)
      expect(r.rank, `deg ${d}: every coefficient of h moves the curve`).toBe(d + 1)
    }
  })

  it('THE HERMITE FIBER IS AFFINE: the conditions are LINEAR in h, so the count is arithmetic', () => {
    // Prescribing the tangent DIRECTION at an end fixes the parameter u; prescribing the POINT there
    // gives h(u) = c·n̂ and dh/dθ = c·t̂. Both are linear functionals on h's coefficients. So four
    // conditions at two ends leave an affine space of dimension (d+1) − 4, exactly.
    const u0 = -0.6, u1 = 0.8
    for (const d of [3, 4, 5, 6, 7]) {
      const rowsOf = (u: number): number[][] => {
        const D = 1 + u * u
        const value = Array.from({ length: d + 1 }, (_, k) => Math.pow(u, k))
        const slope = Array.from({ length: d + 1 }, (_, k) => (D / 2) * k * Math.pow(u, k - 1))
        return [value, slope]
      }
      const M = [...rowsOf(u0), ...rowsOf(u1)]
      // Linearity is exact by construction above; verify against the nonlinear map to be sure.
      const h0: Poly = Array.from({ length: d + 1 }, (_, i) => 0.8 + 0.2 * i)
      let worst = 0
      for (const [i, u] of [u0, u0, u1, u1].entries()) {
        const want = M[i].reduce((s, m, k) => s + m * h0[k], 0)
        const got = i % 2 === 0
          ? pEval(h0, u)
          : ((1 + u * u) / 2) * pEval(pDeriv(h0), u)
        worst = Math.max(worst, Math.abs(want - got) / Math.max(Math.abs(got), 1e-12))
      }
      const r = rank(M)
      console.log(
        `    deg h = ${d}:  ${d + 1} parameters − 4 conditions (rank ${r.rank}) = fiber ${d + 1 - r.rank}` +
          `   linearity ${worst.toExponential(1)}`,
      )
      expect(worst, 'the four conditions really are linear in h').toBeLessThan(1e-12)
      expect(r.rank, `deg ${d}: the four conditions are independent`).toBe(4)
      expect(d + 1 - r.rank, 'the fiber dimension is arithmetic').toBe(d - 3)
    }
  })

  it('INFLECTIONS: the graph chart cannot hold one, and the LEGENDRE chart can', () => {
    // A graph h(u) has dc/dθ = (h + h_θθ)·t̂. Where that vanishes the curve CUSPS; an inflection needs
    // it to blow up, so a polynomial h on a finite u-range simply has no inflection to offer. Measured:
    // the curvature of a graph specimen never changes sign.
    const hGraph: Poly = [2, -0.6, 0.35, 0.12]
    const kGraph = SAMPLES.map((u) => curvatureAt((t) => curveFromSupport(hGraph, t), u))
    const graphSignChanges = kGraph.slice(1).filter((k, i) => k * kGraph[i] < 0).length
    console.log(
      `    graph h:     κ = ${kGraph.map((k) => k.toFixed(2)).join(', ')}` +
        `  -> ${graphSignChanges} sign change(s)`,
    )

    // Now stop requiring a graph. Let the DIRECTION parameter turn back: u(τ) with a critical point.
    // That fold is the inflection, and the construction does not care.
    const uOf: Poly = [-0.4, 0, 0.9]   // u(τ) = 0.9τ² − 0.4, so u̇ = 0 at τ = 0: a fold
    const H: Poly = [1.6, 0.5, -0.2, 0.08]
    const taus = [-1.5, -1.1, -0.7, -0.35, 0.35, 0.7, 1.1, 1.5]
    const kLeg = taus.map((t) => curvatureAt((s) => curveFromLegendre(uOf, H, s), t))
    const legSignChanges = kLeg.slice(1).filter((k, i) => k * kLeg[i] < 0).length
    console.log(
      `    Legendre:    κ = ${kLeg.map((k) => k.toFixed(2)).join(', ')}` +
        `  -> ${legSignChanges} sign change(s)  <- INFLECTION`,
    )
    expect(graphSignChanges, 'a graph support function offers no inflection').toBe(0)
    expect(legSignChanges, 'letting u(τ) fold produces a genuine inflection').toBeGreaterThan(0)

    // And the Legendre curve is still PH: its speed is still the closed-form rational expression.
    let worst = 0
    for (const t of taus) {
      const e = 1e-5
      const measured = norm(sub(curveFromLegendre(uOf, H, t + e), curveFromLegendre(uOf, H, t - e))) / (2 * e)
      // ‖dc/dτ‖ = |h + h_θθ|·|dθ/dτ|, computed from the same data by finite difference of dH/dθ.
      const u = pEval(uOf, t), D = 1 + u * u
      const dTheta = (2 / D) * pEval(pDeriv(uOf), t)
      const hThetaAt = (s: number): number => {
        const uu = pEval(uOf, s), DD = 1 + uu * uu
        return pEval(pDeriv(H), s) / ((2 / DD) * pEval(pDeriv(uOf), s))
      }
      const rho = pEval(H, t) + (hThetaAt(t + e) - hThetaAt(t - e)) / (2 * e) / dTheta
      const predicted = Math.abs(rho * dTheta)
      worst = Math.max(worst, Math.abs(measured - predicted) / Math.max(predicted, 1e-9))
    }
    console.log(`    and it is still PH: ‖dc/dτ‖ vs |ρ·dθ/dτ| ≤ ${worst.toExponential(1)}`)
    expect(worst, 'the Legendre chart keeps the closed-form rational speed').toBeLessThan(1e-4)
  })
})
