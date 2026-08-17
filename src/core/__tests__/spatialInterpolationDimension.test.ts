// ============================================================================
// Point interpolation in space: (k+1) points on a PH curve of degree 2k−1 leave a family
// of dimension k−1 — never a count, for any k ≥ 2.
//
//     dim = (4k + 2) − 3(k + 1) = k − 1
//
// docs/SEPTIC_SIX_POINTS.md records this row of the dimension rule as verified; this file
// is the pinning test behind the tick, measured by RANK with the gauge direction checked
// to lie in the kernel first (the rank-by-max-over-trials trap, §4 of that document).
//
// The contrast worth keeping in view: the SAME (k+1) points in the PLANE give a COUNT,
// 2^{k−1}, and that count is the Bézout maximum, attained exactly because the unknowns
// there are complex. Space converts every one of those discrete answers into a
// continuum. Which is the deck's central move, and this is it at four degrees at once.
//
// NOTE what the dimension does NOT distinguish. At a fixed degree, five prescribed
// CONTROL points and five prescribed CURVE points both cost 3 apiece and both leave the
// same dim — at degree 7, three. In the plane those two problems differ in their COUNT
// (one versus eight at degree 7); in space they differ only in the fibre's shape. The
// cubic instance is measured in spatialCubicFirstThree.test.ts: control points P₀P₁P₂
// give an open parabola, control points P₀P₁P₃ a closed isometric ellipse, both dim 1.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat, type Vec3, QUAT_I, qmul, qadd,
  sandwich, polarSandwich, vadd, vsub, vscale,
} from '../quaternion'

const qf = (c: number[]): Quat => ({ u: c[0], v: c[1], p: c[2], q: c[3] })

const binom = (n: number, k: number): number => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** ∫₀^T B_m^{2n} dt. */
const intBernstein = (m: number, twoN: number, T: number): number => {
  let s = 0
  for (let r = m + 1; r <= twoN + 1; r++) s += binom(twoN + 1, r) * T ** r * (1 - T) ** (twoN + 1 - r)
  return s / (twoN + 1)
}

/** M[j][l] = ∫₀^T B_j^n B_l^n dt. */
const gram = (n: number, T: number): number[][] =>
  Array.from({ length: n + 1 }, (_, j) =>
    Array.from({ length: n + 1 }, (_, l) =>
      ((binom(n, j) * binom(n, l)) / binom(2 * n, j + l)) * intBernstein(j + l, 2 * n, T),
    ),
  )

/** ∫₀^T 𝒜i𝒜* dt — the displacement along the curve, exact. */
function displacement(A: readonly Quat[], T: number): Vec3 {
  const n = A.length - 1
  const M = gram(n, T)
  let s: Vec3 = { x: 0, y: 0, z: 0 }
  for (let j = 0; j <= n; j++) {
    s = vadd(s, vscale(sandwich(A[j]), M[j][j]))
    for (let l = j + 1; l <= n; l++) s = vadd(s, vscale(polarSandwich(A[j], A[l]), M[j][l]))
  }
  return s
}

function mulberry(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Singular values by Jacobi on JᵀJ — enough for a rank with a clean gap. */
function singularValues(J: number[][]): number[] {
  const m = J.length
  const n = J[0].length
  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0
      for (let k = 0; k < m; k++) s += J[k][i] * J[k][j]
      return s
    }),
  )
  for (let sweep = 0; sweep < 200; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j]
    if (off < 1e-26) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-18) continue
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const a1 = A[k][p], a2 = A[k][q]
          A[k][p] = c * a1 - s * a2
          A[k][q] = s * a1 + c * a2
        }
        for (let k = 0; k < n; k++) {
          const a1 = A[p][k], a2 = A[q][k]
          A[p][k] = c * a1 - s * a2
          A[q][k] = s * a1 + c * a2
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, A[i][i]))).sort((a, b) => b - a)
}

describe('spatial point interpolation leaves a family of dimension k−1', () => {
  for (const k of [2, 3, 4, 5]) {
    it(`k = ${k} (degree ${2 * k - 1}, ${k + 1} points): dim ${k - 1}`, () => {
      const rng = mulberry(k * 977 + 3)
      const A = Array.from({ length: k }, () => qf([0, 1, 2, 3].map(() => 2 * rng() - 1)))
      A[0] = qadd(A[0], { u: 1.3, v: 0, p: 0, q: 0 })
      const ts = Array.from({ length: k }, (_, i) => (i + 1) / k)
      const D = ts.map((T) => displacement(A, T))

      // c(0) fixes the translation; these are the remaining k vector conditions.
      const F = (x: number[]): number[] => {
        const B = Array.from({ length: k }, (_, j) => qf(x.slice(4 * j, 4 * j + 4)))
        return ts.flatMap((T, i) => {
          const d = vsub(displacement(B, T), D[i])
          return [d.x, d.y, d.z]
        })
      }

      const x0 = A.flatMap((q) => [q.u, q.v, q.p, q.q])
      expect(Math.max(...F(x0).map(Math.abs))).toBeLessThan(1e-12)

      const rows = 3 * k
      const J = Array.from({ length: rows }, () => new Array(4 * k).fill(0))
      for (let j = 0; j < 4 * k; j++) {
        const h = 1e-6 * Math.max(1, Math.abs(x0[j]))
        const up = [...x0]; up[j] += h
        const dn = [...x0]; dn[j] -= h
        const fu = F(up), fd = F(dn)
        for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * h)
      }

      // The gauge must be in the kernel before any rank is believed.
      const g = A.flatMap((q) => { const r = qmul(q, QUAT_I); return [r.u, r.v, r.p, r.q] })
      const Jg = J.map((row) => row.reduce((s, v, i) => s + v * g[i], 0))
      expect(Math.hypot(...Jg) / Math.hypot(...g)).toBeLessThan(1e-8)

      const sv = singularValues(J)
      const rank = sv.filter((v) => v > sv[0] * 1e-8).length
      expect(rank).toBe(rows)                    // every condition independent
      expect(4 * k - rank - 1).toBe(k - 1)       // nullity, less the gauge
    })
  }
})
