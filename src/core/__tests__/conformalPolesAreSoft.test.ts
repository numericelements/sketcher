// ============================================================================
// EVERY POLE OF A CONFORMAL PH MEMBER IS SOFT — forced by the null condition, not chosen.
//
// THE IDENTITY, and it needs no spinor. For C = (W, q, c∞) write N = q′W − qW′, so the point
// curve is x = q/W with ‖x′‖ = ‖N‖/W². At a root r of W,
//
//     N(r) = −q(r)·W′(r)      ⟹      σ(r)² = ⟨q(r),q(r)⟩·W′(r)²
//
// so SOFTNESS IS ISOTROPY OF THE NUMERATOR AT THE POLE. That is the whole definition, and it
// costs no 𝒜(r)⁻¹ — which is exactly what the λ-chart divides by and cannot do at a soft pole.
// Measured below: ⟨q,q⟩/|q|² and ⟨N,N⟩/|N|² print the SAME number at every pole, as the identity
// says they must.
//
// AND NULLITY FORCES IT. ⟨C,C⟩ ≡ 0 reads ‖q‖² = 2·W·c∞, so at a root of W the numerator is
// isotropic automatically. Hence:
//
//     a conformal PH member's poles are ALL SOFT, always. It is row 7 of THE_MAP, by identity.
//
// SO WHERE DOES AllHard LIVE? Only on the NON-REDUCED locus. A hard curve of degree d lifts as
// (2w², 2wq, ‖q‖²), whose denominator 2w² has every pole DOUBLED and whose numerator 2wq cancels
// there — the only room a null curve has to carry a hard pole. Measured on the λ-chart quartic
// with σ(1.7) = 8.2: conformal degree 8, denominator 0.29(t−1.7)², |q(1.7)| = 5.5e-13.
//
// AND ONE DRAG DESTROYS IT. The double root splits, the cancellation goes, and every pole that
// results is soft. Hard → soft, never back — the absorbing story, visible in the editor.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { hodograph, rootsOf, type Poly } from '../conformalPHHopf'
import { liftHardQuarticToConformal } from '../hardQuarticWitness'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import {
  type ConformalPHCurve, controlPoints, dragControlPoint, findMember, degreeOf,
} from '../conformalPHCurve'
import type { Vec3 } from '../quaternion'
import { vnorm, vsub } from '../quaternion'

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}
const formSquare = (v: Complex[]): Complex => v.reduce((a, z) => cadd(a, cmul(z, z)), C0)
const hermitian = (v: Complex[]): number => Math.hypot(...v.map(cnorm))

interface PoleReading { z: Complex; qRel: number; isoQ: number; isoN: number }
function poles(s: ConformalPHCurve): { degW: number; list: PoleReading[] } {
  const hd = hodograph(s)
  const sc = Math.max(...hd.w.map(Math.abs))
  const w = hd.w.slice()
  while (w.length > 1 && Math.abs(w[w.length - 1]) < 1e-11 * sc) w.pop()
  const qScale = Math.max(...hd.q.map((qi) => Math.max(...qi.map(Math.abs))))
  return {
    degW: w.length - 1,
    list: rootsOf(w.map((v) => ({ re: v, im: 0 }))).map((z) => {
      const qv = hd.q.map((qi) => cpeval(qi, z))
      const Nv = hd.N.map((Ni) => cpeval(Ni, z))
      return {
        z,
        qRel: hermitian(qv) / qScale,
        isoQ: cnorm(formSquare(qv)) / Math.max(hermitian(qv) ** 2, 1e-300),
        isoN: cnorm(formSquare(Nv)) / Math.max(hermitian(Nv) ** 2, 1e-300),
      }
    }),
  }
}

// --- the λ-chart quartic with a GENUINE hard real pole, and its lift ------------------------
const POLE = 1.7
describe('every pole of a conformal PH member is soft', () => {
  it('a generic degree-6 member: six genuine poles, every one isotropic', () => {
    const s = findMember(6)
    expect(s, 'the deterministic degree-6 seed').not.toBeNull()
    const { degW, list } = poles(s as ConformalPHCurve)
    expect(degW, 'a genuine degree-6 curve carries six poles').toBe(6)
    for (const p of list) {
      console.log(`    pole ${p.z.re.toFixed(4)}${p.z.im >= 0 ? '+' : '-'}${Math.abs(p.z.im).toFixed(4)}i` +
        `   |q(r)|/scale ${p.qRel.toExponential(1)}   q·q/|q|² ${p.isoQ.toExponential(1)}   N·N/|N|² ${p.isoN.toExponential(1)}`)
      expect(p.qRel, 'the pole is genuine — the numerator does not cancel').toBeGreaterThan(1e-4)
      expect(p.isoQ, 'and it is isotropic, i.e. SOFT').toBeLessThan(1e-9)
      // the identity N(r) = −q(r)W′(r) makes these the SAME number
      expect(Math.abs(p.isoQ - p.isoN), 'softness of N IS isotropy of q').toBeLessThan(1e-8)
    }
  }, 120_000)

  it('AllHard lives on the non-reduced locus: a doubled pole with a cancelling numerator', () => {
    const { state, sigmaAtPole } = liftHardQuarticToConformal()
    expect(Math.abs(sigmaAtPole), 'the source really is HARD: σ(1.7) ≠ 0').toBeGreaterThan(1)
    expect(degreeOf(state), 'the lift doubles the degree').toBe(8)

    const hd = hodograph(state)
    const sc = Math.max(...hd.w.map(Math.abs))
    const trimmed = hd.w.slice()
    while (trimmed.length > 1 && Math.abs(trimmed[trimmed.length - 1]) < 1e-11 * sc) trimmed.pop()
    const qScale = Math.max(...hd.q.map((qi) => Math.max(...qi.map(Math.abs))))
    const qAt = hd.q.map((qi) => qi.reduceRight((a, c) => a * POLE + c, 0))
    console.log(`    σ(1.7) = ${sigmaAtPole.toFixed(2)} (hard);  conformal degree ${degreeOf(state)};` +
      ` denominator degree ${trimmed.length - 1}, coefficients ${trimmed.map((v) => (v / sc).toFixed(3)).join(' ')}`)
    console.log(`    at r = 1.7:  W/scale ${(hd.w.reduceRight((a, c) => a * POLE + c, 0) / sc).toExponential(1)}` +
      `   |q|/scale ${(Math.hypot(...qAt) / qScale).toExponential(1)}  <- the numerator cancels too`)

    expect(trimmed.length - 1, 'the denominator is 2w², degree 2 — a DOUBLED pole').toBe(2)
    expect(Math.hypot(...qAt) / qScale, 'and the numerator vanishes there: non-reduced').toBeLessThan(1e-10)
  }, 120_000)

  it('and ONE drag destroys it: the double root splits and every pole comes back soft', () => {
    const { state } = liftHardQuarticToConformal()
    const P0 = controlPoints(state)
    const chord = vnorm(vsub(P0[P0.length - 1], P0[0]))
    const base = P0[4]
    const target: Vec3 = {
      x: base.x + 0.3038 * 0.05 * chord,
      y: base.y + 0.8101 * 0.05 * chord,
      z: base.z + 0.5063 * 0.05 * chord,
    }
    const r = dragControlPoint(state, 4, target, { pinEnds: true, iterations: 200 })
    // THE DEFECT IS RECORDED, NOT ASSERTED AT 1e-9. The production drag is the ridge-regularised
    // solver, and starting ON the non-reduced locus it does not reach its own `converged`
    // threshold — the same stall measured on the polynomial fold. What is being pinned here is
    // the POLE STRUCTURE, which is unambiguous at this defect.
    console.log(`    drag defect ${r.defect.toExponential(1)}, tracking ${(r.trackingError / chord).toExponential(1)},` +
      ` converged flag ${r.converged}`)
    expect(r.defect, 'still recognisably on the family').toBeLessThan(1e-5)
    expect(r.trackingError / chord, 'and the point went where it was asked').toBeLessThan(1e-9)

    const { degW, list } = poles(r.state)
    console.log(`    after a 5% drag: denominator degree ${degW} (was 2), ${list.length} poles`)
    expect(degW, 'the doubled pole splits — the curve is genuinely degree 8 now').toBe(8)
    // THE ISOTROPY FLOOR HERE IS THE DRAG'S DEFECT SHOWING THROUGH. Softness is forced by
    // ⟨C,C⟩ ≡ 0, so a state 6e-8 off the variety has only approximately-isotropic poles. The
    // contrast is still unambiguous: a HARD pole reads O(1) on this scale — the λ-chart source of
    // this very curve reads 1.0 — so 1e-4 is soft by four orders, not by a threshold.
    for (const p of list) {
      expect(p.qRel, 'no pole cancels any more').toBeGreaterThan(1e-3)
      expect(p.isoQ, 'and every one of them is SOFT (hard reads 1.0)').toBeLessThan(1e-3)
    }
    console.log(`    isotropies: ${list.map((p) => p.isoQ.toExponential(0)).join(' ')}` +
      `  <- all soft, against 1.0 for a hard pole`)
  }, 120_000)
})
