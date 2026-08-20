// ============================================================================
// THE CONTROL POINTS ARE SPHERES, AND TWO OF THE NULL EQUATIONS ARE INCIDENCES.
//
// THE QUESTION, Eric's, and it is the right one to be puzzled by: the lift of a POINT is
// P(x) = (1, x, ½‖x‖²), which is null — radius zero. So where do the radii on screen come from?
//
// THE ANSWER: the control points are not lifts of points. They are the Bernstein COEFFICIENTS
// of the null polynomial P(t), and nullity is a condition on the CURVE, not on each coefficient:
//
//     ⟨P,P⟩ = Σ_{j,k} ⟨C_j,C_k⟩ B_j(t) B_k(t) ≡ 0
//
// constrains the PAIRWISE products. Only four Gram entries are killed individually — the first
// two Bernstein coefficients of that identity and their mirrors — and since ⟨S,P(x)⟩ = 0 says
// "x lies on the sphere S", they read as incidences:
//
//     ⟨C₀,C₀⟩ = ⟨C_n,C_n⟩ = 0       the two ends are POINTS (the curve's endpoints)
//     ⟨C₀,C₁⟩ = ⟨C_{n-1},C_n⟩ = 0    the neighbouring SPHERE passes through each end point
//                                    hence ρ₁ = ‖P₁−P₀‖ and ρ_{n-1} = ‖P_{n-1}−P_n‖ exactly
//
// Every other coefficient sits OFF the cone, which is what makes it a sphere of radius
// ρ = √⟨C,C⟩/|w|. The middle spheres are constrained only JOINTLY: none of their Gram entries
// vanishes, and their radii have no relation to the endpoint distances.
//
// WHAT THIS CORRECTS. conformalPHCurve.radii's doc said the interior radii equal "the distance to
// the near endpoint". That is a DEGREE-3 statement — at degree 3 the interior two ARE C₁ and
// C_{n-1} — and false from degree 4 up. Fixed 2026-08-18, along with THE_LATTICE §2.5.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { innerProduct } from '../conformal'
import { controlPoints, findMember, radii, type ConformalPHCurve } from '../conformalPHCurve'
import { vnorm, vsub } from '../quaternion'

const seed = findMember(6)

describe('the conformal control spheres', () => {
  it('the null condition kills exactly four Gram entries, and they are incidences', () => {
    expect(seed, 'the deterministic degree-6 seed').not.toBeNull()
    const s = seed as ConformalPHCurve
    const n = s.C.length - 1
    const scale = Math.max(...s.C.flatMap((c) => c.map(Math.abs))) ** 2
    const G = (j: number, k: number): number => innerProduct(s.C[j], s.C[k]) / scale

    console.log('    <C_j,C_k>/scale, the four that vanish:' +
      ` <C0,C0> ${G(0, 0).toExponential(1)}  <Cn,Cn> ${G(n, n).toExponential(1)}` +
      `  <C0,C1> ${G(0, 1).toExponential(1)}  <Cn-1,Cn> ${G(n - 1, n).toExponential(1)}`)

    expect(Math.abs(G(0, 0)), 'C₀ is a point').toBeLessThan(1e-14)
    expect(Math.abs(G(n, n)), 'C_n is a point').toBeLessThan(1e-14)
    expect(Math.abs(G(0, 1)), 'the first sphere passes through the start point').toBeLessThan(1e-14)
    expect(Math.abs(G(n - 1, n)), 'the last sphere passes through the end point').toBeLessThan(1e-14)

    // and NOTHING else vanishes — the middle spheres are constrained only jointly
    let smallestOther = Infinity
    for (let j = 0; j <= n; j++) {
      for (let k = j; k <= n; k++) {
        const isPinned = (j === 0 && k <= 1) || (k === n && j >= n - 1)
        if (isPinned) continue
        smallestOther = Math.min(smallestOther, Math.abs(G(j, k)))
      }
    }
    console.log(`    smallest of the remaining Gram entries: ${smallestOther.toExponential(1)}`)
    expect(smallestOther, 'no other Gram entry is zero').toBeGreaterThan(1e-6)
  })

  it('so ρ₁ and ρ_{n-1} ARE the endpoint distances — and the middle radii are not', () => {
    const s = seed as ConformalPHCurve
    const n = s.C.length - 1
    const P = controlPoints(s)
    const r = radii(s)
    const toStart = P.map((p) => vnorm(vsub(p, P[0])))
    const toEnd = P.map((p) => vnorm(vsub(p, P[n])))

    for (let k = 0; k <= n; k++) {
      console.log(`    k=${k}  ρ ${r[k].toFixed(5)}   |P_k−P₀| ${toStart[k].toFixed(5)}   |P_k−P_n| ${toEnd[k].toFixed(5)}`)
    }
    // NOTE THE TOLERANCE: ρ = √⟨C,C⟩/|w| is a SQUARE ROOT, so a Gram entry at machine zero
    // (1e-15) surfaces as a radius near 1e-8, not near 1e-15. Measured: ρ₀ = 7.3e-8. That is the
    // honest noise floor of a radius, and asserting 1e-12 on it would be asserting an impossibility.
    expect(r[0], 'the ends are points').toBeLessThan(1e-6)
    expect(r[n], 'the ends are points').toBeLessThan(1e-6)
    expect(Math.abs(r[1] - toStart[1]), 'ρ₁ = |P₁−P₀|').toBeLessThan(1e-9)
    expect(Math.abs(r[n - 1] - toEnd[n - 1]), 'ρ_{n-1} = |P_{n-1}−P_n|').toBeLessThan(1e-9)

    // the middle ones obey no such rule — this is the half the old doc got wrong
    for (const k of [2, 3, 4]) {
      const gap = Math.min(Math.abs(r[k] - toStart[k]), Math.abs(r[k] - toEnd[k]))
      expect(gap, `ρ_${k} is NOT an endpoint distance`).toBeGreaterThan(0.1)
    }
  })
})
