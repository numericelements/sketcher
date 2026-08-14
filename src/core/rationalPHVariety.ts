// ============================================================================
// THE RATIONAL PH CURVES OF A GIVEN DEGREE, AS AN EXACT POLYNOMIAL SYSTEM.
//
// WHY THIS EXISTS RATHER THAN rationalPHCoverage's version. That one writes the condition through a
// normalised formal square root: divide q by q(t₀), shift to t₀, run the series, compare the forced
// coefficients. It is a fine yes/no test and a bad thing to differentiate. The division and the shift
// both enter the Jacobian, its finite differences inherit their scale, and the measured rank then
// depends on the seed — codimension read 4, 5 or 6 at different members of the same family, and the
// ambient dimension 14, 15 or 16. A rank decided by a tolerance is not a measurement.
//
// THE FIX IS TO STOP ELIMINATING σ. PH says ‖c′‖ is rational, i.e. there EXISTS a polynomial σ with
//
//     |N|² = σ² ,        N = p′w − pw′
//
// so carry σ as unknowns instead of solving it away. What is left is a system of honest polynomial
// equations in the coefficients of (p, w, σ) — no division, no shift, no series — whose Jacobian is
// written down analytically rather than differenced.
//
// THE SIZES, for curve degree d:
//
//     unknowns    3(d+1) + (d+1) + (2d−1) = 6d+3        p, w, σ
//     equations   4d−3                                   coefficients of |N|² − σ²
//     d = 4:      27 unknowns, 13 equations
//
// deg N ≤ 2d−2 rather than 2d−1, because the top coefficient of p′w − pw′ is d·p_d·w_d − p_d·d·w_d,
// which cancels identically. So deg σ = 2d−2 and deg|N|² = 4d−4.
//
// TWO GAUGES, and both are quotiented out where dimensions are reported. (p,w,σ) ↦ (cp,cw,c²σ) is the
// same curve — the projective scale. And σ ↦ −σ is the same curve too, but that is a discrete flip,
// not a direction, so it costs no dimension.
//
// WHAT THIS BUYS: the containment check becomes exact. A translation p ↦ p + τw leaves N untouched, so
// J·(translation column) must be ZERO — analytically, not to some tolerance. When it is not, the
// instrument is broken and says so.
// ============================================================================
import { leastSquares } from './linalg'
import { orthonormalise } from './sp11RationalPH'

const pMul = (a: readonly number[], b: readonly number[]): number[] => {
  const out = new Array<number>(Math.max(a.length + b.length - 1, 1)).fill(0)
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  return out
}
const pDeriv = (a: readonly number[]): number[] =>
  a.length <= 1 ? [0] : a.slice(1).map((c, i) => c * (i + 1))

/** The layout of the unknown vector, for one curve degree. */
export interface Layout {
  readonly degree: number
  readonly degP: number
  readonly degW: number
  readonly degSigma: number
  readonly unknowns: number
  readonly equations: number
}

export function layoutFor(degree: number): Layout {
  const degSigma = 2 * degree - 2
  return {
    degree,
    degP: degree,
    degW: degree,
    degSigma,
    unknowns: 3 * (degree + 1) + (degree + 1) + (degSigma + 1),
    equations: 2 * degSigma + 1,
  }
}

export interface Unknowns {
  readonly p: number[][]
  readonly w: number[]
  readonly sigma: number[]
}

export function pack(u: Unknowns, L: Layout): number[] {
  const out: number[] = []
  for (let k = 0; k < 3; k++) for (let i = 0; i <= L.degP; i++) out.push(u.p[k][i] ?? 0)
  for (let i = 0; i <= L.degW; i++) out.push(u.w[i] ?? 0)
  for (let i = 0; i <= L.degSigma; i++) out.push(u.sigma[i] ?? 0)
  return out
}

export function unpack(x: readonly number[], L: Layout): Unknowns {
  const nP = L.degP + 1
  return {
    p: [0, 1, 2].map((k) => Array.from({ length: nP }, (_, i) => x[k * nP + i])),
    w: Array.from({ length: L.degW + 1 }, (_, i) => x[3 * nP + i]),
    sigma: Array.from({ length: L.degSigma + 1 }, (_, i) => x[3 * nP + L.degW + 1 + i]),
  }
}

/** N = p′w − pw′, truncated at deg 2d−2 where the top coefficient cancels identically. */
export function hodograph(u: Unknowns, L: Layout): number[][] {
  const wD = pDeriv(u.w)
  return u.p.map((pk) => {
    const a = pMul(pDeriv(pk), u.w)
    const b = pMul(pk, wD)
    return Array.from({ length: L.degSigma + 1 }, (_, i) => (a[i] ?? 0) - (b[i] ?? 0))
  })
}

/** |N|² − σ², coefficient by coefficient. Zero exactly on the variety. */
export function residual(x: readonly number[], L: Layout): number[] {
  const u = unpack(x, L)
  const N = hodograph(u, L)
  const out = new Array<number>(L.equations).fill(0)
  for (const n of N) {
    for (let i = 0; i < n.length; i++) {
      for (let j = 0; j < n.length; j++) if (i + j < L.equations) out[i + j] += n[i] * n[j]
    }
  }
  for (let i = 0; i < u.sigma.length; i++) {
    for (let j = 0; j < u.sigma.length; j++) {
      if (i + j < L.equations) out[i + j] -= u.sigma[i] * u.sigma[j]
    }
  }
  return out
}

/**
 * The Jacobian, written down rather than differenced.
 *
 *   ∂|N|²/∂p_{k,i} = 2·N_k · (i t^{i−1} w − t^i w′)
 *   ∂|N|²/∂w_j     = 2·Σ_k N_k · (p_k′ t^j − j p_k t^{j−1})
 *   ∂(σ²)/∂σ_l     = 2·σ t^l
 *
 * Every entry is a polynomial coefficient product, so this is exact to round-off and carries no
 * step size, no shift and no normalisation.
 */
export function jacobian(x: readonly number[], L: Layout): number[][] {
  const u = unpack(x, L)
  const N = hodograph(u, L)
  const wD = pDeriv(u.w)
  const nP = L.degP + 1
  const J = Array.from({ length: L.equations }, () => new Array<number>(L.unknowns).fill(0))

  /** add 2·A·(B shifted by `shift`) into column `col` */
  const accumulate = (A: readonly number[], B: readonly number[], shift: number, col: number, s: number): void => {
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const e = i + j + shift
        // shift is i−1 for the ∂/∂p and ∂/∂w terms, so e can be −1 at the constant coefficient;
        // that term is multiplied by i = 0 anyway, but the index must still be guarded.
        if (e >= 0 && e < L.equations) J[e][col] += s * A[i] * B[j]
      }
    }
  }

  for (let k = 0; k < 3; k++) {
    const pkD = pDeriv(u.p[k])
    for (let i = 0; i <= L.degP; i++) {
      const col = k * nP + i
      // t^i·w′ term, and the i·t^{i−1}·w term
      accumulate(N[k], u.w, i - 1, col, 2 * i)
      accumulate(N[k], wD, i, col, -2)
    }
    for (let j = 0; j <= L.degW; j++) {
      const col = 3 * nP + j
      accumulate(N[k], pkD, j, col, 2)
      accumulate(N[k], u.p[k], j - 1, col, -2 * j)
    }
  }
  for (let l = 0; l <= L.degSigma; l++) {
    const col = 3 * nP + L.degW + 1 + l
    accumulate(u.sigma, [1], l, col, -2)
  }
  return J
}

/** Rank after row-normalising, which does not touch the kernel but makes the tolerance mean something. */
export function rankOf(J: readonly number[][], tol = 1e-9): number {
  const rows = J.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  })
  return orthonormalise(rows, tol).length
}

/** Orthonormal basis of ker J — the tangent space of the variety at x. */
export function tangentSpace(J: readonly number[][], L: Layout, tol = 1e-9): number[][] {
  const rows = J.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  })
  const basis = orthonormalise(rows, tol)
  const out: number[][] = []
  for (let i = 0; i < L.unknowns; i++) {
    let v: number[] = Array.from({ length: L.unknowns }, (_, j) => (i === j ? 1 : 0))
    for (const b of basis) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    for (const b of out) { const d = v.reduce((s, q, k) => s + q * b[k], 0); v = v.map((q, k) => q - d * b[k]) }
    const len = Math.hypot(...v)
    if (len > 1e-8) out.push(v.map((q) => q / len))
  }
  return out
}

/**
 * Newton onto the variety, using the analytic Jacobian. Used to reach a GENERIC point: our chart's
 * members all have w of low degree, which puts them on the boundary of the deg w ≤ d ambient, and the
 * rank there is not the rank anywhere else.
 */
export function newtonToVariety(x0: readonly number[], L: Layout, iterations = 200): number[] {
  let x = x0.slice()
  const scale = (): number => Math.max(...x.map(Math.abs), 1e-300) ** 4
  for (let it = 0; it < iterations; it++) {
    const F = residual(x, L)
    if (Math.max(...F.map(Math.abs)) < 1e-13 * scale()) break
    try {
      const step = leastSquares(jacobian(x, L), F.map((v) => -v), 1e-12)
      x = x.map((v, j) => v + 0.8 * step[j])
    } catch { break }
  }
  return x
}

/**
 * A CONTINUATION PATH ALONG THE VARIETY that never lets σ lose its sign.
 *
 * σ > 0 is an inequality and Newton solves equations, so it cannot be added to the target. Walking is
 * the way in: step a little along the tangent, Newton back, and REJECT any step whose σ would change
 * sign. Every returned point is joined to the start by a path that stayed on one branch, which is what
 * makes a rank measured along it comparable to the rank at the start.
 *
 * Measured on the one-pole quartic: 61 points in ~120 ms, the rank climbing 11 → 13 within ten steps
 * while the denominator goes from one REAL root to two complex conjugate pairs — so the curve stops
 * reaching infinity and the chart stops being able to describe it, both at once.
 */
export function continuationPath(
  start: readonly number[], L: Layout,
  options: { steps?: number; stride?: number; phase?: number; floor?: number } = {},
): number[][] {
  const steps = options.steps ?? 60
  const stride = options.stride ?? 0.06
  const phase = options.phase ?? 3.1
  const floor = options.floor ?? 1e-3
  const sigmaFloor = (sigma: readonly number[]): number => {
    let worst = Infinity
    const scale = Math.max(...sigma.map(Math.abs), 1e-300)
    for (let i = 0; i <= 300; i++) {
      const t = -6 + (12 * i) / 300
      worst = Math.min(worst, sigma.reduceRight((s, c) => s * t + c, 0))
    }
    return worst / scale
  }
  const relative = (x: readonly number[]): number =>
    Math.max(...residual(x, L).map(Math.abs)) / Math.max(...x.map(Math.abs)) ** 4

  let x = start.slice()
  const out: number[][] = [x.slice()]
  for (let k = 0; out.length <= steps && k < steps * 3; k++) {
    const T = tangentSpace(jacobian(x, L), L)
    if (T.length === 0) break
    const dir = new Array<number>(L.unknowns).fill(0)
    T.forEach((v, i) => {
      const a = Math.sin(2.7 * i + 1.9 * k + phase)
      for (let j = 0; j < dir.length; j++) dir[j] += a * v[j]
    })
    const norm = Math.hypot(...dir) || 1
    const scale = Math.max(...x.map(Math.abs))
    const y = newtonToVariety(x.map((v, i) => v + (stride * scale * dir[i]) / norm), L)
    if (relative(y) > 1e-11) continue
    if (sigmaFloor(unpack(y, L).sigma) <= floor) continue
    x = y
    out.push(x.slice())
  }
  return out
}

/** The scale gauge (p,w,σ) ↦ (cp,cw,c²σ), as a tangent direction at x. */
export function scaleDirection(x: readonly number[], L: Layout): number[] {
  const nP = L.degP + 1
  const v = x.slice()
  for (let i = 3 * nP + L.degW + 1; i < L.unknowns; i++) v[i] = 2 * x[i]
  const n = Math.hypot(...v) || 1
  return v.map((q) => q / n)
}
