// ============================================================================
// The SPLIT prescription P₀P₁P₂ · P₆P₇, taken into space — where the plane's four
// curves become a THREE-dimensional family.
//
// The plane and space are asked exactly the same question and the cascade has exactly
// the same three stages; every stage that offered a BINARY CHOICE in the plane offers a
// CIRCLE in space, and one stage that was rigid in the plane is not rigid here at all:
//
//                            plane (w cubic, ℂ)          space (𝒜 cubic, ℍ)
//   N₀ = sandwich(A₀)        w₀ = ±√N₀, the ± is gauge   a Hopf circle, spent on gauge
//   N₁ = ½polar(A₀,A₁)       w₁ = N₁/w₀   → UNIQUE       3 eqs, 4 unknowns → +1
//   N₆ = sandwich(A₃)        w₃ = ±√N₆    → TWO          a Hopf circle     → +1
//   S  = N₂+N₃+N₄+N₅         quadratic    → TWO          3 eqs, 4 unknowns → +1
//                            ------------------          ------------------
//                            2 × 2 = 4 curves            dim 3
//
// So two of the three dimensions are the deck's central move — a discrete choice
// becoming a continuum — and the THIRD has no planar counterpart at all. It is created
// at the N₁ stage, where the plane divides by w₀ (invertible on ℂ) and space applies
// polar(A₀,·): ℍ → ℝ³, four unknowns for three equations. That missing dimension is the
// gauge's, again.
//
// AND THE DIMENSION CAN NEVER BE 1 OR 2 HERE. Prescribing whole control points in space
// costs 3 apiece against a family of 4k+2 = 18, so dim = 18 − 3v is always a MULTIPLE OF
// THREE: six points → 0 (the counted case, docs/SEPTIC_SIX_POINTS.md), five → 3, four →
// 6. A two-dimensional answer would need a condition that is not a whole point.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat, type Vec3, QUAT_I, qmul, qadd,
  sandwich, polarSandwich, vadd, vsub, vscale,
} from '../quaternion'

type Cubic = [Quat, Quat, Quat, Quat]
const qf = (c: number[]): Quat => ({ u: c[0], v: c[1], p: c[2], q: c[3] })

/** The seven legs of the degree-6 hodograph 𝒜i𝒜*. */
function legs(A: Cubic): Vec3[] {
  const [A0, A1, A2, A3] = A
  return [
    sandwich(A0),
    vscale(polarSandwich(A0, A1), 1 / 2),
    vadd(vscale(polarSandwich(A0, A2), 1 / 5), vscale(sandwich(A1), 3 / 5)),
    vadd(vscale(polarSandwich(A0, A3), 1 / 20), vscale(polarSandwich(A1, A2), 9 / 20)),
    vadd(vscale(polarSandwich(A1, A3), 1 / 5), vscale(sandwich(A2), 3 / 5)),
    vscale(polarSandwich(A2, A3), 1 / 2),
    sandwich(A3),
  ]
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
  const A: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0
      for (let k = 0; k < m; k++) s += J[k][i] * J[k][j]
      return s
    }),
  )
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j]
    if (off < 1e-24) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-18) continue
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q]
          A[k][p] = c * akp - s * akq
          A[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k]
          A[p][k] = c * apk - s * aqk
          A[q][k] = s * apk + c * aqk
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, A[i][i]))).sort((a, b) => b - a)
}

function jacobian(F: (x: number[]) => number[], x: number[], rows: number): number[][] {
  const J = Array.from({ length: rows }, () => new Array(x.length).fill(0))
  for (let j = 0; j < x.length; j++) {
    const h = 1e-6 * Math.max(1, Math.abs(x[j]))
    const up = [...x]; up[j] += h
    const dn = [...x]; dn[j] -= h
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * h)
  }
  return J
}

const sampleCubic = (seed: number): Cubic => {
  const rng = mulberry(seed)
  const A = [0, 1, 2, 3].map(() => qf([0, 1, 2, 3].map(() => 2 * rng() - 1))) as Cubic
  A[0] = qadd(A[0], { u: 1.4, v: 0, p: 0, q: 0 })
  return A
}

describe('spatial septic, split prescription P₀P₁P₂ · P₆P₇', () => {
  it('the family is THREE-dimensional, not zero and not two', () => {
    for (const seed of [31, 77, 501]) {
      const A = sampleCubic(seed)
      const N = legs(A)
      const S = vadd(vadd(N[2], N[3]), vadd(N[4], N[5]))

      // The four vector conditions the five prescribed control points impose.
      const F = (x: number[]): number[] => {
        const B = [0, 1, 2, 3].map((j) => qf(x.slice(4 * j, 4 * j + 4))) as Cubic
        const M = legs(B)
        const s = vadd(vadd(M[2], M[3]), vadd(M[4], M[5]))
        return [vsub(M[0], N[0]), vsub(M[1], N[1]), vsub(s, S), vsub(M[6], N[6])]
          .flatMap((v) => [v.x, v.y, v.z])
      }

      const x0 = A.flatMap((q) => [q.u, q.v, q.p, q.q])
      expect(Math.max(...F(x0).map(Math.abs))).toBeLessThan(1e-12)

      const J = jacobian(F, x0, 12)

      // Verify the gauge really is in the kernel BEFORE trusting any rank — the
      // rank-by-max-over-trials trap cost real time once (docs/SEPTIC_SIX_POINTS.md §4).
      const g = A.flatMap((q) => { const r = qmul(q, QUAT_I); return [r.u, r.v, r.p, r.q] })
      const gn = Math.hypot(...g)
      const Jg = J.map((row) => row.reduce((s, v, k) => s + v * g[k], 0))
      expect(Math.hypot(...Jg) / gn).toBeLessThan(1e-8)

      const sv = singularValues(J)
      // A clean gap, so the rank is not a matter of tolerance-picking.
      expect(sv[11] / sv[0]).toBeGreaterThan(1e-3)
      expect(sv[12] / sv[0]).toBeLessThan(1e-6)

      const rank = sv.filter((v) => v > sv[0] * 1e-8).length
      expect(rank).toBe(12)                 // all twelve conditions independent
      expect(16 - rank).toBe(4)             // nullity = gauge + family
      expect(16 - rank - 1).toBe(3)         // THE FAMILY DIMENSION
    }
  })

  it('the three come one from each stage — and one has no planar counterpart', () => {
    const A = sampleCubic(31)
    const [A0, A1, , A3] = A
    const N = legs(A)

    // Stage N₁: the plane divides by w₀ and is rigid; space has a kernel of dimension 1.
    const J1 = jacobian(
      (x) => { const v = polarSandwich(A0, qf(x)); return [v.x, v.y, v.z] },
      [A1.u, A1.v, A1.p, A1.q],
      3,
    )
    const sv1 = singularValues(J1)
    expect(sv1.filter((v) => v > sv1[0] * 1e-8).length).toBe(3)   // 4 unknowns − 3 = +1

    // Stage N₆: the plane offers ±√N₆, two points; space offers the Hopf circle.
    const J6 = jacobian(
      (x) => { const v = sandwich(qf(x)); return [v.x, v.y, v.z] },
      [A3.u, A3.v, A3.p, A3.q],
      3,
    )
    const sv6 = singularValues(J6)
    expect(sv6.filter((v) => v > sv6[0] * 1e-8).length).toBe(3)   // +1, and it is a circle
    // …and that circle really is the solution set: rotating A₃ leaves N₆ fixed exactly.
    for (const th of [0.3, 1.1, 2.7]) {
      const rot = qmul(A3, { u: Math.cos(th), v: Math.sin(th), p: 0, q: 0 })
      expect(Math.hypot(...[sandwich(rot)].flatMap((v) =>
        [v.x - N[6].x, v.y - N[6].y, v.z - N[6].z]))).toBeLessThan(1e-12)
    }

    // Stage S: quadratic in A₂ in both settings — two roots in the plane, a curve here.
    const S = vadd(vadd(N[2], N[3]), vadd(N[4], N[5]))
    const JS = jacobian(
      (x) => {
        const B: Cubic = [A[0], A[1], qf(x), A[3]]
        const M = legs(B)
        const s = vadd(vadd(M[2], M[3]), vadd(M[4], M[5]))
        return [s.x - S.x, s.y - S.y, s.z - S.z]
      },
      [A[2].u, A[2].v, A[2].p, A[2].q],
      3,
    )
    const svS = singularValues(JS)
    expect(svS.filter((v) => v > svS[0] * 1e-8).length).toBe(3)   // +1
  })

  it('with whole control points the dimension is always a multiple of three', () => {
    // 18 − 3v. So five points give 3 and six give 0; there is no arrangement of WHOLE
    // control points giving 1 or 2. Anything finer needs a partial condition.
    for (let v = 0; v <= 6; v++) expect((18 - 3 * v) % 3).toBe(0)
    expect(18 - 3 * 5).toBe(3)
    expect(18 - 3 * 6).toBe(0)
  })
})
