// ============================================================================
// THE SHAPE MODULI OF THE CONFORMAL CHART — measured, because two of our own numbers disagreed.
//
// conformalPHCurve's header says "dimension 2n+5, of which 9 are Möbius MOTIONS, leaving 2n−4 genuine
// shape moduli", and quotes 8 at conformal degree 6. Slide 26 of price-of-a-circle says 6. Neither is
// right, and the disagreement is entirely in how much is subtracted for the symmetry group.
//
// WHAT IS MEASURED HERE. At a member, the family's dimension is unknowns − rank(definingJacobian).
// The symmetry tangent is built explicitly: the ten generators of the Lie algebra of O(4,1) acting as
// δC_k = X·C_k (⟨P′,P′⟩ is O(4,1)-invariant, so δh = 0), plus the one scale gauge (C,h) ↦ (cC,ch),
// which is the same curve because null vectors are points only up to scale. Every one of those
// columns is verified to lie in the kernel of the defining Jacobian — containment 1e-16 — so they
// really are motions along the family rather than off it.
//
//     conformal degree    3     5     6
//     dimension          12    16    18        (unknowns − rank; the scale is still in)
//     symmetry orbit     11    11    11        (10 Möbius + 1 scale, no stabiliser at these members)
//     SHAPE MODULI        1     5     7
//
// so the formula is 2n − 5, not 2n − 4. Reported in the header's convention, where the scale has
// already been divided out, dimension is 2n+5 — 11, 15, 17 — which matches; the error was subtracting
// NINE for the Möbius group. It is ten, measured, with no stabiliser at a generic member.
//
// AND THE SLIDE'S 6 IS THE OPPOSITE MISTAKE: subtracting all eleven from an already scale-quotiented
// dimension, so the scale comes off twice.
//
// WHAT IS NOT SETTLED HERE. The comparison figure — "against 4 from bending a polynomial PH cubic" —
// is not measured in this file and should not be quoted until it is. The same subtraction question
// applies to it, and by hand it looks like 3 rather than 4: the Möbius images of polynomial PH cubics
// form a 13-dimensional set (10 for the cubics, 10 for Möbius, minus 7 for the similarities that
// preserve them), and 13 − 10 = 3.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type ConformalPHCurve,
  definingJacobian, findMember, residual, unknownCount,
} from '../conformalPHCurve'
import { metricApply, type Conformal } from '../conformal'
import { orthonormalise } from '../sp11RationalPH'

const rankOf = (M: readonly number[][], tol = 1e-9): number =>
  orthonormalise(M.map((r) => {
    const n = Math.hypot(...r)
    return n > 0 ? r.map((v) => v / n) : r.slice()
  }), tol).length

/** The metric as a matrix, read off by applying it to the standard basis. */
const G: number[][] = Array.from({ length: 5 }, (_, j) => {
  const e = new Array<number>(5).fill(0)
  e[j] = 1
  return [...metricApply(e as unknown as Conformal)]
})

function inverse5(A: readonly number[][]): number[][] {
  const M = A.map((r, i) => [...r, ...Array.from({ length: 5 }, (_, j) => (i === j ? 1 : 0))])
  for (let c = 0; c < 5; c++) {
    let p = c
    for (let r = c; r < 5; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    const d = M[c][c]
    for (let j = 0; j < 10; j++) M[c][j] /= d
    for (let r = 0; r < 5; r++) {
      if (r === c) continue
      const f = M[r][c]
      for (let j = 0; j < 10; j++) M[r][j] -= f * M[c][j]
    }
  }
  return M.map((r) => r.slice(5))
}

/**
 * The Lie algebra of O(4,1): X with XᵀG + GX = 0, i.e. X = G⁻¹A with A antisymmetric. Ten of them,
 * which is the whole Möbius group of ℝ³ ∪ {∞} — there is no reason to expect fewer.
 */
function mobiusGenerators(): number[][][] {
  const Gm = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => G[j][i]))
  const Gi = inverse5(Gm)
  const out: number[][][] = []
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      const A = Array.from({ length: 5 }, () => new Array<number>(5).fill(0))
      A[a][b] = 1
      A[b][a] = -1
      out.push(Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 5 }, (_, j) => {
          let s = 0
          for (let k = 0; k < 5; k++) s += Gi[i][k] * A[k][j]
          return s
        })))
    }
  }
  return out
}

/** The symmetry tangent at a member: ten Möbius directions plus the scale gauge. */
function symmetryTangent(s: ConformalPHCurve): number[][] {
  const n = s.C.length - 1
  const U = unknownCount(n)
  const cols: number[][] = []
  for (const X of mobiusGenerators()) {
    const v = new Array<number>(U).fill(0)
    s.C.forEach((c, k) => {
      for (let i = 0; i < 5; i++) {
        let acc = 0
        for (let j = 0; j < 5; j++) acc += X[i][j] * c[j]
        v[5 * k + i] = acc
      }
    })
    cols.push(v)
  }
  const g = new Array<number>(U).fill(0)
  s.C.forEach((c, k) => { for (let i = 0; i < 5; i++) g[5 * k + i] = c[i] })
  for (let i = 0; i < s.h.length; i++) g[5 * (n + 1) + i] = s.h[i]
  cols.push(g)
  return cols
}

const MEMBERS = [3, 5, 6].map((deg) => ({ deg, member: findMember(deg) }))

describe('the conformal chart s shape moduli', () => {
  it('every member found is genuinely on the family', () => {
    for (const { deg, member } of MEMBERS) {
      expect(member, `degree ${deg}`).not.toBeNull()
      expect(Math.max(...residual(member!).map(Math.abs))).toBeLessThan(1e-10)
    }
  })

  it('THE SYMMETRY GROUP IS TEN-DIMENSIONAL PLUS THE SCALE, and its directions are tangent', () => {
    expect(mobiusGenerators().length).toBe(10)
    for (const { member } of MEMBERS) {
      const s = member!
      const J = definingJacobian(s)
      const cols = symmetryTangent(s)
      const U = unknownCount(s.C.length - 1)
      const jScale = Math.max(...Array.from({ length: U },
        (_, j) => Math.hypot(...J.map((r) => r[j]))), 1e-300)
      for (const c of cols) {
        const n = Math.hypot(...c) || 1
        // each really is a motion ALONG the family, not off it
        expect(Math.hypot(...J.map((r) => r.reduce((s2, v, i) => s2 + v * c[i], 0) / n)) / jScale)
          .toBeLessThan(1e-12)
      }
      // eleven independent directions: ten Möbius, one scale, no stabiliser here
      expect(rankOf(cols)).toBe(11)
    }
  })

  it('THE MODULI ARE 2n − 5: one, five and seven at conformal degrees 3, 5 and 6', () => {
    const measured = MEMBERS.map(({ deg, member }) => {
      const s = member!
      const dim = unknownCount(deg) - rankOf(definingJacobian(s))
      return { deg, dim, moduli: dim - rankOf(symmetryTangent(s)) }
    })
    expect(measured.map((m) => m.dim)).toEqual([12, 16, 18])
    expect(measured.map((m) => m.moduli)).toEqual([1, 5, 7])
    for (const m of measured) expect(m.moduli).toBe(2 * m.deg - 5)

    // In the header's convention the scale is already divided out, so dimension reads 2n+5 — which
    // is what it says, and matches. The error was in the subtraction, not the dimension.
    for (const m of measured) expect(m.dim - 1).toBe(2 * m.deg + 5)
  })

  it('SO BOTH OF OUR RECORDED NUMBERS AT DEGREE 6 ARE WRONG, and in opposite directions', () => {
    const s = MEMBERS.find((m) => m.deg === 6)!.member!
    const dim = unknownCount(6) - rankOf(definingJacobian(s))
    const moduli = dim - rankOf(symmetryTangent(s))
    expect(moduli).toBe(7)
    expect(moduli).not.toBe(8)   // conformalPHCurve's header: subtracts 9 for Möbius, one too few
    expect(moduli).not.toBe(6)   // slide 26: subtracts 11, taking the scale off twice
  })
})
