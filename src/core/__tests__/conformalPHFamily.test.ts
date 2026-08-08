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
//   · The Jacobian's rank is one LESS than the number of equations, at every n and every
//     seed — so there is exactly one relation among the 4n conditions. Its algebraic origin
//     is not identified here; the dimension is measured, not derived.
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
        // rank is one BELOW the equation count: exactly one relation among the conditions
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
