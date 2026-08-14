// ============================================================================
// WHY THE TANGENT AT (3,4) MEASURED 6 WHERE THE COUNT SAID 3 — the count was wrong, and here is why.
//
// THE OPEN QUESTION. freeLambdaReachesFourPoles records that at (n,m) = (3,4) the tangent to the
// residue quadrics is 6-dimensional, while dim 𝒱 = 4(n+1) − 3m = 4 predicts 3 once the unit-norm
// equation is counted. Three of the equations are dependent there and nothing said why.
//
// THE SWEEP. Rank of the 3m residue quadrics at a member, across the whole table:
//
//     m ≤ n        rank = 3m exactly          deficit 0     — every case from (2,1) to (5,5)
//     m = n + 1    rank = 3m − 3              deficit 3     — (1,2), (2,3), (3,4)
//     m > n + 1    no member exists at all
//
// Not special to (3,4): it is exactly the locus where the fixed-λ fibre 4(n+1) − 4m collapses to zero.
//
// AND THE MECHANISM IS ELEMENTARY, which is the satisfying part. The residues of a proper rational
// function sum to zero whenever the numerator's degree is at most the denominator's minus two. Here
//
//     deg N = 2n ,   deg w² = 2m ,   so the relation holds ⟺ 2n ≤ 2m − 2 ⟺ m ≥ n + 1
//
// N is vector-valued, so that is THREE real linear relations among the 3m residue conditions — the
// exact deficit. Verified below on RANDOM spinors with no condition imposed at all: the residue sum is
// machine zero when m ≥ n+1 and O(1) otherwise, with no exceptions across n = 1…4, m = 1…5.
//
// ONE SOLVER LIMITATION RECORDED HERE RATHER THAN HIDDEN: at (4,5), which is also m = n+1, the
// quadric solve's 120 deterministic starts all miss and no member is found. The geometry there is
// presumably the same; the solver is not.
//
// SO THE DIMENSION FORMULA NEEDS A CAVEAT:
//
//     dim 𝒱 = 4(n+1) − 3m           for m ≤ n
//     dim 𝒱 = 4(n+1) − 3m + 3 = n + 4   for m = n + 1
//
// At (3,4) that is 7, and the tangent with the unit-norm equation is 6 — the number that was measured.
// sp11ChartScales verifies the first formula at seven (n,m) pairs and every one of them has m ≤ n, so
// it never met the exception; it is not wrong, it is untested in this regime.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  denominatorOf, familyBasis, packSpinor, phDefect, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import { residueQuadrics, solveWithFreeLambda } from '../rationalPHFreeLambda'
import { orthonormalise } from '../sp11RationalPH'
import type { Quat } from '../quaternion'

const ROOTS = [1.7, -0.9, 2.6, -3.1, 4.2]
const ZERO = (k: number): Quat[] => Array.from({ length: k }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const evalAt = (a: readonly number[], t: number): number => a.reduceRight((s, c) => s * t + c, 0)
const deriv = (a: readonly number[]): number[] => (a.length < 2 ? [0] : a.slice(1).map((c, i) => c * (i + 1)))
const rankOf = (M: readonly number[][], tol = 1e-9): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

/** Jacobian of the 3m quadrics alone — central differences are EXACT, the map is quadratic. */
function quadricJacobian(x: readonly number[], roots: readonly number[]): number[][] {
  const f = (y: readonly number[]): number[] => residueQuadrics(y, roots).slice(0, 3 * roots.length)
  const m = f(x).length
  const J = Array.from({ length: m }, () => new Array<number>(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const e = 1e-5
    const hi = x.slice(); hi[j] += e
    const lo = x.slice(); lo[j] -= e
    const fh = f(hi), fl = f(lo)
    for (let i = 0; i < m; i++) J[i][j] = (fh[i] - fl[i]) / (2 * e)
  }
  return J
}

/** A point ON the variety: from the linear fibre where there is one, from the quadric solve otherwise. */
function memberAt(n: number, m: number): number[] | null {
  const roots = ROOTS.slice(0, m)
  const size = 4 * (n + 1)
  const B = familyBasis({ A: ZERO(n + 1), roots, lambdas: roots.map(() => 0.3) })
  if (B.length > 0) {
    const v = new Array<number>(size).fill(0)
    B.forEach((b, i) => {
      const a = 1.3 * Math.sin(1.7 * i + 0.6)
      for (let j = 0; j < size; j++) v[j] += a * b[j]
    })
    const norm = Math.hypot(...v)
    return v.map((q) => q / norm)
  }
  const sol = solveWithFreeLambda(roots, n)
  return sol ? packSpinor(sol.params.A) : null
}

/** Σ_k Res_{r_k}(N/w²), componentwise — relative to the largest single residue. */
function residueSum(x: readonly number[], roots: readonly number[]): number {
  const mem = toMember({ A: unpackSpinor(x), roots, lambdas: roots.map(() => 0) })
  const N = mem.N as number[][]
  const sum = [0, 0, 0]
  let scale = 0
  roots.forEach((r, k) => {
    let u: number[] = [1]                       // u = w/(t − r_k) = Π_{l≠k}(t − r_l)
    roots.forEach((rl, l) => {
      if (l === k) return
      const next = new Array<number>(u.length + 1).fill(0)
      u.forEach((c, i) => { next[i + 1] += c; next[i] -= rl * c })
      u = next
    })
    const ur = evalAt(u, r), upr = evalAt(deriv(u), r)
    for (let c = 0; c < 3; c++) {
      const v = (evalAt(deriv(N[c]), r) * ur - 2 * evalAt(N[c], r) * upr) / Math.pow(ur, 3)
      sum[c] += v
      scale = Math.max(scale, Math.abs(v))
    }
  })
  return Math.hypot(...sum) / (scale || 1)
}

describe('the residue conditions and when they stop being independent', () => {
  it('THE MECHANISM: the residues sum to zero exactly when deg N ≤ deg w² − 2', () => {
    // A RANDOM spinor — nothing imposed. If the sum vanishes here it is an identity, not a condition.
    for (let n = 1; n <= 4; n++) {
      for (let m = 1; m <= 5; m++) {
        const roots = ROOTS.slice(0, m)
        const x = Array.from({ length: 4 * (n + 1) },
          (_, i) => Math.sin(2.3 * i + 1.1 * n + 0.7 * m) + 0.4 * Math.cos(0.9 * i))
        const automatic = 2 * n <= 2 * m - 2               // deg N ≤ deg w² − 2
        const sum = residueSum(x, roots)
        if (automatic) expect(sum).toBeLessThan(1e-12)     // measured 3e-16 … 2e-15
        else expect(sum).toBeGreaterThan(0.1)              // measured 0.54 … 1.9
        expect(automatic).toBe(m >= n + 1)                 // and that condition IS m ≥ n+1
      }
    }
  })

  it('THE CONSEQUENCE: rank 3m when m ≤ n, and 3m − 3 when m = n + 1', () => {
    const seen: string[] = []
    for (let n = 1; n <= 5; n++) {
      for (let m = 1; m <= 5; m++) {
        const x = memberAt(n, m)
        if (!x) {
          // Beyond n+1 there is genuinely nothing. AT n+1 there is, but the quadric solve has to find
          // it, and at (4,5) its 120 deterministic starts all miss — a solver limitation, recorded
          // rather than dressed up as geometry.
          expect(m).toBeGreaterThanOrEqual(n + 1)
          if (m === n + 1) expect([n, m]).toEqual([4, 5])
          continue
        }
        const roots = ROOTS.slice(0, m)
        expect(Math.max(...residueQuadrics(x, roots).slice(0, 3 * m).map(Math.abs))).toBeLessThan(1e-10)
        expect(phDefect(toMember({ A: unpackSpinor(x), roots, lambdas: roots.map(() => 0) })))
          .toBeLessThan(1e-12)

        const rank = rankOf(quadricJacobian(x, roots))
        const deficit = 3 * m - rank
        expect(deficit).toBe(m === n + 1 ? 3 : 0)
        seen.push(`${n},${m}:${deficit}`)
      }
    }
    // every (n,m) with m ≤ n+1 was reached except (4,5), where the solver misses
    expect(seen.length).toBeGreaterThanOrEqual(18)
    expect(seen).toContain('3,4:3')
    expect(seen).not.toContain('4,5:3')
    // 30 s, not the 5 s default: the sweep runs the quadric solve at every (n,m) where the linear
    // fibre is empty, and 120 deterministic starts at (4,5) is most of the budget.
  }, 30_000)

  it('SO dim 𝒱 IS n + 4 AT m = n + 1, and that is the 6 that was measured at (3,4)', () => {
    for (const [n, m] of [[1, 2], [2, 3], [3, 4]] as const) {
      const x = memberAt(n, m)!
      const dim = 4 * (n + 1) - rankOf(quadricJacobian(x, ROOTS.slice(0, m)))
      expect(dim).toBe(n + 4)                       // 5, 6, 7
      expect(dim).toBe(4 * (n + 1) - 3 * m + 3)     // the formula, plus the three dependencies
      // with the unit-norm equation the tangent is one less: 6 at (3,4)
      if (n === 3) expect(dim - 1).toBe(6)
    }
    // and the fibre collapse happens at the same place, which is why they showed up together
    for (const n of [1, 2, 3, 4]) {
      expect(4 * (n + 1) - 4 * (n + 1)).toBe(0)
      expect(familyBasis({
        A: ZERO(n + 1),
        roots: ROOTS.slice(0, n + 1),
        lambdas: ROOTS.slice(0, n + 1).map(() => 0.3),
      }).length).toBe(0)
    }
  }, 30_000)

  it('CONTROL: where m ≤ n the old formula is exactly right', () => {
    for (const [n, m] of [[2, 1], [3, 2], [3, 3], [4, 3], [5, 5]] as const) {
      const x = memberAt(n, m)!
      expect(4 * (n + 1) - rankOf(quadricJacobian(x, ROOTS.slice(0, m)))).toBe(4 * (n + 1) - 3 * m)
      expect(denominatorOf(ROOTS.slice(0, m)).length - 1).toBe(m)
    }
  })
})
