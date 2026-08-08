// ============================================================================
// RATIONAL PH CURVES BUILT DIRECTLY IN R^{4,1} — the family's DIMENSION, measured.
//
// The question this answers: if you place control points directly in the conformal model
// instead of bending a polynomial PH curve, how much do you gain? The answer is a
// dimension, so it has to be a rank, and a rank is only as honest as its gap.
//
// METHOD, and the two traps it exists to avoid.
//
//   1. The constraints are EXACT Bernstein algebra, never sampled. Sampling ⟨P,P⟩ at 2n+1
//      points and finite-differencing gives a Jacobian whose smallest true singular value
//      sits at the noise floor — a first attempt read "rank 13" straight off that floor.
//
//   2. The singular values come from ONE-SIDED JACOBI on the Jacobian itself, never from
//      J^T J. Forming the Gram matrix squares the condition number and buries the small
//      values under √eps·σ_max. With the Gram route the largest gap was 1.7 (no gap at
//      all, so no rank); done properly the gap is 10^8–10^9 and the rank is unambiguous.
//
// MEASURED, and these are the numbers the next figures rest on:
//
//                                        n=3     n=4     n=5     n=6
//     family dimension  (2n+5)            11      13      15      17
//     Möbius motions inside it             9       9       9       9
//     genuine shape moduli                 2       4       6       8
//
//   · The Jacobian's rank is one LESS than the number of equations — and the reason is now
//     identified (see the last describe block). It is not a dependency among the geometric
//     conditions: h is over-parametrized by one degree. The null conditions force P's
//     leading power coefficient pₙ to be a NULL vector, ⟨pₙ,pₙ⟩ = 0; the leading power
//     coefficient of ⟨P′,P′⟩ is n²⟨pₙ,pₙ⟩, hence also zero; so ⟨P′,P′⟩ has degree ≤ 2n−3,
//     and being a square it has EVEN degree, so ≤ 2n−4 — giving deg h ≤ n−2. Parametrizing
//     h at degree n−1 therefore carries one coordinate pinned to zero, and because h enters
//     quadratically the matching constraint combination equals h_top²/(n²A): it vanishes to
//     SECOND order, so its gradient vanishes and the rank drops by exactly one. The
//     dimension is unaffected — the extra unknown and the lost rank cancel in U − rank.
//
//   · A Möbius image of a polynomial PH curve has EVEN conformal degree, because the lift
//     doubles. So odd degrees — degree 3 included — are unreachable by bending, and at
//     degree 6, where the two constructions do meet, the direct family is 17-dimensional
//     against the orbit's measured 13.
//
//   · At degree 3 only TWO of the eleven dimensions change the shape. An editor there will
//     feel excellent (seven spare parameters against four constrained) and do very little.
//     Shape diversity needs higher degree, exactly as the counting says.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Conformal,
  derivativeCoefficients,
  innerProduct,
  metricApply,
  nullCurveResidual,
  phSquareResidual,
  project,
} from '../conformal'
import { leastSquares } from '../linalg'

/** Singular values by one-sided Jacobi on the matrix itself — see the header. */
function singularValues(J: readonly (readonly number[])[]): number[] {
  const E = J.length, U = J[0].length
  const A: number[][] = Array.from({ length: U }, (_, i) => Array.from({ length: E }, (_, j) => J[j][i]))
  for (let sweep = 0; sweep < 80; sweep++) {
    let rotated = 0
    for (let p = 0; p < E; p++) {
      for (let q = p + 1; q < E; q++) {
        let app = 0, aqq = 0, apq = 0
        for (let i = 0; i < U; i++) { app += A[i][p] ** 2; aqq += A[i][q] ** 2; apq += A[i][p] * A[i][q] }
        if (app === 0 || aqq === 0 || Math.abs(apq) <= 1e-17 * Math.sqrt(app * aqq)) continue
        const z = (aqq - app) / (2 * apq)
        const t = Math.sign(z) / (Math.abs(z) + Math.sqrt(1 + z * z))
        const cs = 1 / Math.sqrt(1 + t * t), sn = cs * t
        for (let i = 0; i < U; i++) {
          const a = A[i][p], b = A[i][q]
          A[i][p] = cs * a - sn * b
          A[i][q] = sn * a + cs * b
        }
        rotated++
      }
    }
    if (rotated === 0) break
  }
  return Array.from({ length: E }, (_, k) => Math.hypot(...A.map((r) => r[k]))).sort((a, b) => b - a)
}

/** Rank from the LARGEST RELATIVE GAP. No fixed tolerance ever decides a rank here. */
function rankFromGap(sv: number[]): { rank: number; gap: number } {
  let rank = sv.length, gap = 1
  for (let k = 1; k < sv.length; k++) {
    const r = sv[k - 1] / (sv[k] + 1e-300)
    if (r > gap) { gap = r; rank = k }
  }
  if (sv[sv.length - 1] / sv[0] > 1e-8 && gap < 1e3) return { rank: sv.length, gap: Infinity }
  return { rank, gap }
}

const asC = (x: readonly number[], n: number): Conformal[] =>
  Array.from({ length: n + 1 }, (_, k) => x.slice(5 * k, 5 * k + 5) as unknown as Conformal)

const residualOf = (x: readonly number[], n: number): number[] => {
  const C = asC(x, n)
  return [...nullCurveResidual(C), ...phSquareResidual(C, x.slice(5 * (n + 1)))]
}

/** Analytic Jacobian of both residual blocks — quadratic, so this is exact. */
function jacobianOf(x: readonly number[], n: number): number[][] {
  const NC = 5 * (n + 1), U = NC + n
  const C = asC(x, n), h = x.slice(NC), D = derivativeCoefficients(C)
  const bin = (a: number, b: number): number => {
    if (b < 0 || b > a) return 0
    let c = 1
    for (let i = 0; i < b; i++) c = (c * (a - i)) / (i + 1)
    return c
  }
  const EN = 2 * n + 1
  const J = Array.from({ length: EN + 2 * n - 1 }, () => new Array(U).fill(0))
  for (let m = 0; m < EN; m++) {
    for (let i = 0; i <= n; i++) {
      const k = m - i
      if (k < 0 || k > n) continue
      const coef = (2 * bin(n, i) * bin(n, k)) / bin(2 * n, m)
      const g = metricApply(C[k]) as unknown as number[]
      for (let c = 0; c < 5; c++) J[m][5 * i + c] += coef * g[c]
    }
  }
  for (let m = 0; m <= 2 * n - 2; m++) {
    const row = EN + m
    for (let i = 0; i <= n; i++) {
      for (const [jj, sign] of [[i - 1, 1], [i, -1]] as const) {
        if (jj < 0 || jj > n - 1) continue
        const k = m - jj
        if (k < 0 || k > n - 1) continue
        const v = (bin(n - 1, jj) * bin(n - 1, k)) / bin(2 * n - 2, m)
        const g = metricApply(D[k]) as unknown as number[]
        for (let c = 0; c < 5; c++) J[row][5 * i + c] += 2 * n * sign * v * g[c]
      }
    }
    for (let i = 0; i <= n - 1; i++) {
      const k = m - i
      if (k < 0 || k > n - 1) continue
      J[row][NC + i] += -2 * ((bin(n - 1, i) * bin(n - 1, k)) / bin(2 * n - 2, m)) * h[k]
    }
  }
  return J
}

/** A member of the family, found by damped Gauss–Newton from a deterministic seed. */
function findMember(n: number, seed: number): number[] | null {
  const U = 5 * (n + 1) + n
  const rnd = (k: number): number => {
    const v = Math.sin(seed * 53.7 + k * 11.3 + n * 7.1) * 43758.5453
    return (v - Math.floor(v)) * 2 - 1
  }
  let x = Array.from({ length: U }, (_, k) => (k % 5 === 0 && k < 5 * (n + 1) ? 1 + 0.4 * rnd(k) : rnd(k)))
  for (let it = 0; it < 600; it++) {
    const r = residualOf(x, n)
    const nr = Math.hypot(...r)
    if (nr < 1e-14) break
    let step: number[]
    try { step = leastSquares(jacobianOf(x, n), r.map((v) => -v), 1e-12) } catch { return null }
    let lam = 1, ok = false
    for (let bt = 0; bt < 40; bt++) {
      const trial = x.map((v, i) => v + lam * step[i])
      if (Math.hypot(...residualOf(trial, n)) < nr) { x = trial; ok = true; break }
      lam *= 0.5
    }
    if (!ok) break
  }
  if (Math.hypot(...residualOf(x, n)) > 1e-11) return null
  // reject degenerate members: a vanishing weight or an essentially constant projection
  const C = asC(x, n)
  const pts: (ReturnType<typeof project>)[] = []
  for (let k = 0; k <= 20; k++) {
    const t = k / 20
    let p = C.map((c) => [...(c as unknown as number[])])
    while (p.length > 1) {
      const nx: number[][] = []
      for (let i = 0; i < p.length - 1; i++) nx.push(p[i].map((v, j) => (1 - t) * v + t * p[i + 1][j]))
      p = nx
    }
    if (Math.abs(p[0][0]) < 1e-3) return null
    pts.push(project(p[0] as unknown as Conformal))
  }
  const a = pts[0]!, b = pts[pts.length - 1]!
  if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-3) return null
  return x
}

describe('the direct family in R^{4,1}: dimension', () => {
  const EXPECTED: Record<number, number> = { 3: 11, 4: 13, 5: 15, 6: 17 }

  for (const n of [3, 4, 6]) {
    it(`degree ${n}: dimension ${EXPECTED[n]} = 2n+5, from a gap of 10^8 or better`, () => {
      let found = 0
      for (let seed = 0; seed < 14 && found < 2; seed++) {
        const x = findMember(n, seed)
        if (!x) continue
        found++
        const U = 5 * (n + 1) + n
        const J = jacobianOf(x, n)
        const sv = singularValues(J)
        const { rank, gap } = rankFromGap(sv)
        // The gap must be decisive, or the rank is not a measurement.
        expect(gap, `n=${n} seed=${seed} gap`).toBeGreaterThan(1e6)
        // rank is one BELOW the equation count — the over-parametrized h, explained below
        expect(rank, `n=${n} seed=${seed} rank`).toBe(J.length - 1)
        // dim = (nullspace) − 1 for the (C,h) ↦ (λC,λh) rescaling, which is not a new curve
        expect(U - rank - 1, `n=${n} seed=${seed} dim`).toBe(EXPECTED[n])
      }
      expect(found, `n=${n}: members found`).toBeGreaterThan(0)
    })
  }

  it('NINE of those dimensions are Möbius motions, at every degree', () => {
    // so(4,1) is 10-dimensional and acts by Cₖ ↦ G Cₖ; adding the rescaling direction gives
    // 11 directions whose span measures 10, so the orbit of a CURVE is 9-dimensional —
    // there is a one-parameter subgroup that moves the coefficients along the family.
    for (const n of [3, 4, 6]) {
      let x: number[] | null = null
      for (let seed = 0; seed < 14 && !x; seed++) x = findMember(n, seed)
      expect(x, `n=${n}`).not.toBeNull()
      const C = asC(x as number[], n)
      const E5 = (k: number): Conformal => {
        const e = [0, 0, 0, 0, 0]
        e[k] = 1
        return e as unknown as Conformal
      }
      const dirs: number[][] = []
      for (let a = 0; a < 5; a++) {
        for (let b = a + 1; b < 5; b++) {
          const ea = metricApply(E5(a)) as unknown as number[]
          const eb = metricApply(E5(b)) as unknown as number[]
          const G = Array.from({ length: 5 }, (_, i) =>
            Array.from({ length: 5 }, (_, j) => (E5(b) as unknown as number[])[i] * ea[j]
              - (E5(a) as unknown as number[])[i] * eb[j]))
          dirs.push(C.flatMap((c) =>
            Array.from({ length: 5 }, (_, i) => G[i].reduce((s, g, j) => s + g * (c as unknown as number[])[j], 0))))
        }
      }
      dirs.push(C.flatMap((c) => [...(c as unknown as number[])]))
      const { rank, gap } = rankFromGap(singularValues(dirs))
      expect(gap, `n=${n} orbit gap`).toBeGreaterThan(1e4)
      expect(rank, `n=${n} orbit rank`).toBe(10)
      // so the shape moduli are the rest
      expect(2 * n + 5 - (rank - 1)).toBe(2 * n - 4)
    }
  })

  it('and a member really is a null PH curve, checked away from the constraints', () => {
    let x: number[] | null = null
    for (let seed = 0; seed < 14 && !x; seed++) x = findMember(3, seed)
    const C = asC(x as number[], 3)
    const D = derivativeCoefficients(C)
    const ev = (K: readonly Conformal[], t: number): number[] => {
      let p = K.map((c) => [...(c as unknown as number[])])
      while (p.length > 1) {
        const nx: number[][] = []
        for (let i = 0; i < p.length - 1; i++) nx.push(p[i].map((v, j) => (1 - t) * v + t * p[i + 1][j]))
        p = nx
      }
      return p[0]
    }
    for (const t of [0.13, 0.37, 0.62, 0.88]) {
      const P = ev(C, t) as unknown as Conformal
      const scale = Math.max(...(P as unknown as number[]).map(Math.abs))
      // null: it is a curve of POINTS
      expect(Math.abs(innerProduct(P, P)) / (scale * scale), `null at t=${t}`).toBeLessThan(1e-12)
      // PH: ‖p′‖ = h/w with h a POLYNOMIAL — compare against a central difference of p
      const Pp = ev(D, t) as unknown as Conformal
      const speed = Math.sqrt(Math.abs(innerProduct(Pp, Pp))) / Math.abs((P as unknown as number[])[0])
      const hStep = 1e-5
      const at = (s: number): number[] => {
        const Q = ev(C, s)
        return [Q[1] / Q[0], Q[2] / Q[0], Q[3] / Q[0]]
      }
      const a = at(t + hStep), b = at(t - hStep)
      const fd = Math.hypot(...a.map((v, i) => (v - b[i]) / (2 * hStep)))
      expect(Math.abs(speed - fd) / fd, `speed at t=${t}`).toBeLessThan(1e-7)
    }
  })
})

// ---------------------------------------------------------------------------
// WHERE THE ONE RELATION COMES FROM — h carries one degree too many
//
// The Jacobian's rank is E−1, not E, and the left null vector says exactly why. Extracting
// the LEADING POWER coefficient of a degree-N Bernstein polynomial is the functional
// b ↦ Σ (−1)^m C(N,m) b_m, and the measured λ is precisely that functional on both blocks:
//
//     null block:  (−1)^m C(2n,   m) / A
//     PH block:   −(−1)^m C(2n−2, m) / (n²A)
//
// so λ·F = ( a_{2n}[⟨P,P⟩] − a_{2n−2}[⟨P′,P′⟩ − h²] / n² ) / A. Writing P's leading power
// coefficient as pₙ, those two leading coefficients are ⟨pₙ,pₙ⟩ and n²⟨pₙ,pₙ⟩ − h_top², so
//
//     λ·F = h_top² / (n² A)
//
// which is ZERO to SECOND order at every solution. A function vanishing to second order has
// vanishing gradient, hence the rank drop — and it is one, not two, because there is one
// such coordinate.
//
// The chain that pins h_top: ⟨P,P⟩ ≡ 0 forces ⟨pₙ,pₙ⟩ = 0, so ⟨P′,P′⟩ has degree ≤ 2n−3;
// but it equals h², whose degree is EVEN, so ≤ 2n−4; so deg h ≤ n−2. Independently, from
// p = q/w: ‖q′w − qw′‖ = h·w with deg(q′w − qw′) ≤ 2n−2 gives the same bound. So the
// PARAMETRIC SPEED of these curves is ‖p′‖ = h/w with degrees (n−2)/n — for n = 3, degree
// one over degree three.
//
// Nothing here changes the dimension: the redundant unknown and the lost rank cancel.
// ---------------------------------------------------------------------------
describe('the one relation: h is over-parametrized by one degree', () => {
  const binom = (a: number, b: number): number => {
    if (b < 0 || b > a) return 0
    let c = 1
    for (let i = 0; i < b; i++) c = (c * (a - i)) / (i + 1)
    return c
  }
  /** one-sided Jacobi on Jᵀ, accumulating V, so the LEFT null vector of J is available */
  const leftNull = (J: readonly (readonly number[])[]): number[] => {
    const E = J.length, U = J[0].length
    const A: number[][] = Array.from({ length: U }, (_, i) => Array.from({ length: E }, (_, j) => J[j][i]))
    const V: number[][] = Array.from({ length: E }, (_, i) =>
      Array.from({ length: E }, (_, j) => (i === j ? 1 : 0)))
    for (let sweep = 0; sweep < 100; sweep++) {
      let rotated = 0
      for (let p = 0; p < E; p++) {
        for (let q = p + 1; q < E; q++) {
          let app = 0, aqq = 0, apq = 0
          for (let i = 0; i < U; i++) { app += A[i][p] ** 2; aqq += A[i][q] ** 2; apq += A[i][p] * A[i][q] }
          if (app === 0 || aqq === 0 || Math.abs(apq) <= 1e-18 * Math.sqrt(app * aqq)) continue
          const z = (aqq - app) / (2 * apq)
          const t = Math.sign(z) / (Math.abs(z) + Math.sqrt(1 + z * z))
          const cs = 1 / Math.sqrt(1 + t * t), sn = cs * t
          for (let i = 0; i < U; i++) { const a = A[i][p], b = A[i][q]; A[i][p] = cs*a-sn*b; A[i][q] = sn*a+cs*b }
          for (let i = 0; i < E; i++) { const a = V[i][p], b = V[i][q]; V[i][p] = cs*a-sn*b; V[i][q] = sn*a+cs*b }
          rotated++
        }
      }
      if (rotated === 0) break
    }
    const norms = Array.from({ length: E }, (_, k) => Math.hypot(...A.map((r) => r[k])))
    const idx = norms.indexOf(Math.min(...norms))
    return V.map((r) => r[idx])
  }

  for (const n of [3, 4, 5, 6]) {
    it(`n=${n}: λ IS the leading-coefficient functional, scaled by 1/n² on the PH block`, () => {
      let x: number[] | null = null
      for (let seed = 0; seed < 14 && !x; seed++) x = findMember(n, seed)
      expect(x, `n=${n}: a member`).not.toBeNull()
      const found = x as number[]
      const C = asC(found, n)
      const h = found.slice(5 * (n + 1))

      // (a) P's leading POWER coefficient is a NULL vector — forced by ⟨P,P⟩ ≡ 0
      const pTop = Array.from({ length: 5 }, (_, c) =>
        C.reduce((s, ck, m) => s + (-1) ** (n - m) * binom(n, m) * (ck as unknown as number[])[c], 0))
      const pScale = Math.max(...pTop.map(Math.abs))
      const pp = innerProduct(pTop as unknown as Conformal, pTop as unknown as Conformal)
      expect(Math.abs(pp) / (pScale * pScale), `n=${n} ⟨pₙ,pₙ⟩`).toBeLessThan(1e-8)

      // (b) so h's leading power coefficient is PINNED TO ZERO. It converges only to about
      // √(solver tolerance) — 1e-7…1e-9 against a 1e-14 residual — which is itself the
      // signature of a quantity that vanishes to SECOND order rather than first.
      const hTop = h.reduce((s, v, m) => s + (-1) ** (n - 1 - m) * binom(n - 1, m) * v, 0)
      expect(Math.abs(hTop) / Math.max(...h.map(Math.abs)), `n=${n} h_top`).toBeLessThan(1e-5)

      // (c) and the left null vector is the leading-coefficient functional on each block,
      // with the PH block weighted by exactly −1/n². This is the relation, identified.
      //
      // Read it as the RATIO of λ to the pattern (−1)^m C(N,m): that ratio must be one
      // constant across the null block and another across the PH block, and the second
      // must be −1/n² times the first. (Comparing raw signs at the two peaks would be
      // wrong — the peaks sit at m=n and m=n−1, whose parities differ, so the explicit
      // minus in the PH block is cancelled by the parity and the two peak values come out
      // with the SAME sign. The signed ratio is the invariant statement.)
      const lam = leftNull(jacobianOf(found, n))
      const EN = 2 * n + 1
      const alphas = Array.from({ length: 2 * n + 1 }, (_, m) =>
        lam[m] / ((-1) ** m * binom(2 * n, m)))
      const betas = Array.from({ length: 2 * n - 1 }, (_, m) =>
        lam[EN + m] / ((-1) ** m * binom(2 * n - 2, m)))
      const alpha = alphas[n], beta = betas[n - 1]
      for (const [label, arr, ref] of [['null', alphas, alpha], ['PH', betas, beta]] as const) {
        for (let m = 0; m < arr.length; m++) {
          expect(Math.abs(arr[m] / ref - 1), `n=${n} ${label} block shape at m=${m}`)
            .toBeLessThan(2e-3)
        }
      }
      // THE NUMBER: the PH block's weight relative to the null block's is exactly −1/n².
      expect(beta / alpha, `n=${n} PH/null weight`).toBeCloseTo(-1 / (n * n), 5)
    })
  }

  it('so the parametric speed is h/w with degrees (n−2)/n, not (n−1)/n', () => {
    // The structural consequence, checked by fitting: for n=3, ‖p′‖·w is LINEAR in t.
    const n = 3
    let x: number[] | null = null
    for (let seed = 0; seed < 14 && !x; seed++) x = findMember(n, seed)
    const C = asC(x as number[], n)
    const D = derivativeCoefficients(C)
    const ev = (K: readonly Conformal[], t: number): number[] => {
      let p = K.map((c) => [...(c as unknown as number[])])
      while (p.length > 1) {
        const nx: number[][] = []
        for (let i = 0; i < p.length - 1; i++) nx.push(p[i].map((v, j) => (1 - t) * v + t * p[i + 1][j]))
        p = nx
      }
      return p[0]
    }
    // h(t) = √⟨P′,P′⟩ sampled; second differences of a LINEAR function vanish
    const N = 9
    const ys = Array.from({ length: N }, (_, k) => {
      const t = k / (N - 1)
      const Pp = ev(D, t) as unknown as Conformal
      return Math.sqrt(Math.abs(innerProduct(Pp, Pp)))
    })
    const scale = Math.max(...ys)
    let d = ys.slice()
    for (let round = 0; round < 2; round++) d = d.slice(1).map((v, i) => v - d[i])
    expect(Math.max(...d.map(Math.abs)) / scale, 'h is linear for n=3').toBeLessThan(1e-6)
  })
})
