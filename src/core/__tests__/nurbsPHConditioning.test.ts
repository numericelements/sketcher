// ============================================================================
// PH IMPOSED DIRECTLY ON A RATIONAL BÉZIER — what it reaches, and what it costs.
//
// THE FORMULATION, with no conformal lift anywhere: unknowns are the control points P_k, the
// weights w_k and the speed numerator ρ, and the whole condition is
//
//     ‖q′w − qw′‖² = ρ²        q = w·P,        4d−1 Bernstein equations
//
// WHAT IT BUYS. Hard poles are GENERIC here. The conformal model cannot represent one at the
// curve's own degree — ⟨C,C⟩ ≡ 0 forces every pole isotropic (conformalPolesAreSoft) — but in
// (P, w, ρ) nothing forces it, and the λ-chart quartic with σ(1.7) = 8.2 sits in this variety at
// its own degree 4 with isotropy 1.0 at the pole. Also: positive weights ⟹ W(t) > 0 on [0,1], so
// "no pole on the curve" is a box constraint rather than a sampled guard.
//
// WHAT IT COSTS, and this is the part a solver author needs before starting. The constraint
// Jacobian has NO RANK. Row-normalised, its spectrum decays smoothly over eight orders with no gap
// anywhere, so there is no principled truncation level for a Gauss–Newton step:
//
//     1e+0 6e-1 4e-1 2e-1 2e-1 8e-2 4e-2 2e-2 5e-4 7e-5 3e-7 2e-8 | 3e-17 1e-17 8e-18
//
// Against the conformal defining Jacobian, which has 23 clean values and then machine zero — a
// twelve-order gap (conformalPHStructure, conformalFamilyDimensions). The reason is structural:
// ⟨P′,P′⟩ = h² is QUADRATIC in the conformal unknowns, ‖q′w − qw′‖² = ρ² is QUARTIC in (P, w).
// That is what the fifth coordinate buys.
//
// THREE THINGS THIS FILE HAD TO RULE OUT FIRST, because each one looked like the explanation:
//   · seed placement — refuted, this member is the λ-chart quartic, not a random solve;
//   · scaling — refuted, the projective rescale (q,w,ρ) ↦ (λq, λw, λ²ρ) is free and changes nothing;
//   · a finite-difference Jacobian — refuted here, by computing the Jacobian ANALYTICALLY and
//     checking it against finite differences. Only the last one or two singular values were noise.
//
// And the exact count of structural redundancies is 3, not the 2 that the degree bookkeeping
// predicts (‖N‖² and ρ² are both elevations of degree-(4d−4) polynomials).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinMultiply } from '../bernstein'
import { bernsteinToPower, rootsOf, type Poly } from '../conformalPHHopf'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import {
  type MultiPoleParams, familyBasis, projectToFamily, toMember, unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const DEG = 4
const layout = (d: number) => ({ nP: 3 * (d + 1), nW: d + 1, nR: 2 * d, total: 3 * (d + 1) + (d + 1) + 2 * d })
interface Rat { P: number[][]; w: number[]; rho: number[] }
const packRat = (r: Rat): number[] => [...r.P.flat(), ...r.w, ...r.rho]
const unpackRat = (x: readonly number[], d: number): Rat => {
  const L = layout(d)
  return {
    P: Array.from({ length: d + 1 }, (_, k) => [x[3 * k], x[3 * k + 1], x[3 * k + 2]]),
    w: Array.from({ length: d + 1 }, (_, k) => x[L.nP + k]),
    rho: Array.from({ length: L.nR }, (_, k) => x[L.nP + L.nW + k]),
  }
}
const deriv = (c: readonly number[]): number[] => {
  const n = c.length - 1
  return Array.from({ length: n }, (_, k) => n * (c[k + 1] - c[k]))
}
/** N = q′w − qw′ in Bernstein at degree 2d−1, with q = w·P. */
function hodographN(r: Rat): number[][] {
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const dw = deriv(r.w)
  return [0, 1, 2].map((i) => {
    const a = bernsteinMultiply(deriv(q[i]), r.w)
    const b = bernsteinMultiply(q[i], dw)
    return a.map((v, k) => v - b[k])
  })
}
/** ‖N‖² − ρ², the 4d−1 Bernstein coefficients — zero exactly on the variety. */
function phResidual(r: Rat): number[] {
  const N = hodographN(r)
  const sq = N.map((Ni) => bernsteinMultiply(Ni, Ni))
  const rr = bernsteinMultiply(r.rho, r.rho)
  return sq[0].map((_, k) => sq[0][k] + sq[1][k] + sq[2][k] - rr[k])
}
/** dR = 2·Σᵢ Nᵢ * dNᵢ − 2·ρ * dρ — every derivative is itself a Bernstein product. */
function analyticJacobian(r: Rat): number[][] {
  const d = r.P.length - 1
  const L = layout(d)
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const dq = q.map(deriv)
  const dw = deriv(r.w)
  const N = hodographN(r)
  const rows = 4 * d - 1
  const J = Array.from({ length: rows }, () => new Array<number>(L.total).fill(0))
  const unit = (k: number, n: number): number[] => Array.from({ length: n + 1 }, (_, j) => (j === k ? 1 : 0))
  const addCol = (col: number, dN: number[][]): void => {
    const contrib = [0, 1, 2]
      .map((i) => bernsteinMultiply(N[i], dN[i]).map((v) => 2 * v))
      .reduce((a, b) => a.map((v, k) => v + b[k]))
    for (let m = 0; m < rows; m++) J[m][col] = contrib[m]
  }
  for (let k = 0; k <= d; k++) {
    const ek = unit(k, d)
    const dek = deriv(ek)
    for (let i = 0; i < 3; i++) {
      const u = ek.map((v) => v * r.w[k])
      const uw = bernsteinMultiply(u, dw)
      const dNi = bernsteinMultiply(deriv(u), r.w).map((v, m) => v - uw[m])
      addCol(3 * k + i, [0, 1, 2].map((j) => (j === i ? dNi : new Array<number>(dNi.length).fill(0))))
    }
    const ekw = bernsteinMultiply(ek, dw)
    const common = bernsteinMultiply(dek, r.w).map((v, m) => v - ekw[m])
    addCol(L.nP + k, [0, 1, 2].map((i) => {
      const qd = bernsteinMultiply(q[i], dek)
      const extra = bernsteinMultiply(dq[i], ek).map((v, m) => v - qd[m])
      return common.map((v, m) => r.P[k][i] * v + extra[m])
    }))
  }
  for (let m2 = 0; m2 < L.nR; m2++) {
    const contrib = bernsteinMultiply(r.rho, unit(m2, L.nR - 1)).map((v) => -2 * v)
    for (let m = 0; m < rows; m++) J[m][L.nP + L.nW + m2] = contrib[m]
  }
  return J
}
function numericJacobian(F: (x: number[]) => number[], x0: readonly number[]): number[][] {
  const h = 1e-7
  const rows = F([...x0]).length
  const J = Array.from({ length: rows }, () => new Array<number>(x0.length).fill(0))
  for (let j = 0; j < x0.length; j++) {
    const st = h * Math.max(1, Math.abs(x0[j]))
    const up = [...x0]; up[j] += st
    const dn = [...x0]; dn[j] -= st
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * st)
  }
  return J
}
function singularValues(A: readonly (readonly number[])[]): number[] {
  const M = A.length >= A[0].length ? A.map((r) => [...r]) : A[0].map((_, j) => A.map((r) => r[j]))
  const m = M.length, n = M[0].length
  const U = M
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let app = 0, aqq = 0, apq = 0
      for (let i = 0; i < m; i++) { app += U[i][p] ** 2; aqq += U[i][q] ** 2; apq += U[i][p] * U[i][q] }
      if (app * aqq === 0 || Math.abs(apq) < 1e-300) continue
      off = Math.max(off, Math.abs(apq) / Math.sqrt(app * aqq))
      const tau = (aqq - app) / (2 * apq)
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let i = 0; i < m; i++) { const a = U[i][p], b = U[i][q]; U[i][p] = c * a - s * b; U[i][q] = s * a + c * b }
    }
    if (off < 1e-15) break
  }
  return Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j]))).sort((a, b) => b - a)
}
const rowNormalise = (J: number[][]): number[][] =>
  J.map((row) => { const n = Math.hypot(...row); return n > 0 ? row.map((v) => v / n) : row })
/** (q,w) ↦ (λq, λw) is the same curve; ρ ↦ λ²ρ since N is quadratic. P is untouched. */
function projectiveNormalise(r: Rat): Rat {
  const q = [0, 1, 2].map((i) => r.P.map((p, k) => r.w[k] * p[i]))
  const lam = 1 / Math.max(...q.flat().map(Math.abs), ...r.w.map(Math.abs))
  return { P: r.P, w: r.w.map((v) => v * lam), rho: r.rho.map((v) => v * lam * lam) }
}

// --- the λ-chart quartic, a curve we KNOW is good, expressed in (P, w, ρ) --------------------
const POLE = 1.7
const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
const toBern = (a: readonly number[], n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    let acc = 0
    for (let j = 0; j <= Math.min(k, a.length - 1); j++) acc += (binom(k, j) / binom(n, j)) * a[j]
    return acc
  })
function hardQuarticAsRat(): { rat: Rat; sigmaAtPole: number } {
  const ZERO3: Quat[] = Array.from({ length: 3 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
  const base: MultiPoleParams = { A: ZERO3, roots: [POLE], lambdas: [Math.tan((20 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(12).fill(0)
  B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 12; j++) x[j] += a * b[j] })
  const m = toMember(projectToFamily({ ...base, A: unpackSpinor(x) }))
  const wB = toBern([...m.w], DEG)
  const qB = [0, 1, 2].map((i) => toBern([...m.p[i]], DEG))
  return {
    rat: {
      P: Array.from({ length: DEG + 1 }, (_, k) => [qB[0][k] / wB[k], qB[1][k] / wB[k], qB[2][k] / wB[k]]),
      w: wB,
      rho: toBern([...m.sigma], 2 * DEG - 1),
    },
    sigmaAtPole: [...m.sigma].reduceRight((s, c) => s * POLE + c, 0),
  }
}

const C0: Complex = { re: 0, im: 0 }
const cpeval = (p: Poly, z: Complex): Complex => {
  let acc: Complex = C0
  for (let k = p.length - 1; k >= 0; k--) acc = cadd(cmul(acc, z), { re: p[k], im: 0 })
  return acc
}

describe('PH imposed directly on a rational Bézier', () => {
  const { rat, sigmaAtPole } = hardQuarticAsRat()

  it('a curve we KNOW is good satisfies it, and its pole is HARD — the cell the lift cannot reach', () => {
    const scale = Math.max(...hodographN(rat).flat().map(Math.abs)) ** 2
    const res = Math.max(...phResidual(rat).map(Math.abs)) / scale
    const wp = bernsteinToPower(rat.w)
    const trimmed = [...wp]
    const sc = Math.max(...wp.map(Math.abs))
    while (trimmed.length > 1 && Math.abs(trimmed[trimmed.length - 1]) < 1e-10 * sc) trimmed.pop()
    const N = hodographN(rat).map((Ni) => bernsteinToPower(Ni))
    const root = rootsOf(trimmed.map((v) => ({ re: v, im: 0 })))[0]
    const Nv = N.map((Ni) => cpeval(Ni, root))
    const iso = cnorm(Nv.reduce((a, z) => cadd(a, cmul(z, z)), C0)) / Math.hypot(...Nv.map(cnorm)) ** 2

    console.log(`    PH residual ${res.toExponential(1)} relative;  σ(1.7) = ${sigmaAtPole.toFixed(2)};` +
      `  denominator degree ${trimmed.length - 1}, root ${root.re.toFixed(4)};  isotropy ${iso.toFixed(4)}`)
    expect(res, 'the λ-chart quartic IS a point of this variety, at its own degree 4').toBeLessThan(1e-12)
    expect(Math.abs(sigmaAtPole), 'and it is genuinely hard').toBeGreaterThan(1)
    expect(iso, 'isotropy 1.0 — as far from soft as a pole gets').toBeGreaterThan(0.99)
    expect(new Set(rat.w.map((v) => Math.sign(v))).size, 'weights share a sign, so W > 0 on [0,1]').toBe(1)
  })

  it('the analytic Jacobian agrees with finite differences, so the spectrum is not FD noise', () => {
    const Ja = analyticJacobian(rat)
    const Jf = numericJacobian((v) => phResidual(unpackRat(v, DEG)), packRat(rat))
    let gap = 0, scale = 0
    for (let i = 0; i < Ja.length; i++) for (let j = 0; j < Ja[0].length; j++) {
      gap = Math.max(gap, Math.abs(Ja[i][j] - Jf[i][j])); scale = Math.max(scale, Math.abs(Ja[i][j]))
    }
    console.log(`    analytic vs finite-difference: ${(gap / scale).toExponential(1)} relative`)
    expect(gap / scale, 'the analytic derivative is right').toBeLessThan(1e-8)
  })

  it('and the spectrum has NO GAP — eight orders of smooth decay, then exactly three zeros', () => {
    for (const [tag, r] of [['as given  ', rat], ['projective', projectiveNormalise(rat)]] as [string, Rat][]) {
      const sv = singularValues(rowNormalise(analyticJacobian(r)))
      console.log(`    ${tag}  ${sv.map((v) => (v / sv[0]).toExponential(0)).join(' ')}`)

      const rel = sv.map((v) => v / sv[0])
      const zeros = rel.filter((v) => v < 1e-14).length
      expect(zeros, 'three structural redundancies among the 4d−1 = 15 equations').toBe(3)

      // no gap: every consecutive ratio among the NONZERO values stays under three orders
      const live = rel.filter((v) => v >= 1e-14)
      let worst = 1
      for (let i = 1; i < live.length; i++) worst = Math.max(worst, live[i - 1] / live[i])
      console.log(`      largest consecutive ratio among the ${live.length} nonzero values: ${worst.toExponential(1)}`)
      expect(worst, 'no twelve-order cliff anywhere — unlike the conformal Jacobian').toBeLessThan(1e3)
    }
  })
})
