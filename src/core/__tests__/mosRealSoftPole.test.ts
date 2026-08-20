// ============================================================================
// THE FIRST REAL SOFT POLE — it exists in R^{3,1}, and it cannot exist in R³.
//
// WHY THIS FILE. Everywhere else in this repository softness is a COMPLEX phenomenon: over R³,
// σ(r)² = ⟨q(r),q(r)⟩·W′(r)² with ⟨,⟩ a sum of three real squares, so a soft REAL pole forces
// q(r) = 0 — the pole cancels and the degree drops. "A genuine real pole is always hard" is the
// consequence, and it is load-bearing for the whole soft/hard stratification (F17, §13.7).
//
// It is a fact about the SIGNATURE, not about PH. In the cyclographic model of oriented spheres a
// point is (x, r) ∈ R³×R with ⟨V,V⟩ = |v|² − v_r², the real null cone is three-dimensional, and
// ⟨Q(r),Q(r)⟩ = 0 with Q(r) ≠ 0 becomes ONE REAL CONDITION. Constructed below: MOS residual
// 2e-14, a simple real pole at 1.7 (W′ = −4.05), |Q(r)| = 0.86 so nothing cancels, and
// ⟨Q,Q⟩/|Q|² = 6e-15. Softness with real points, and hence with a picture, for the first time.
//
// AND THE CAUSAL BOUND, which has no Euclidean analogue. σ is a REAL polynomial, so ⟨N,N⟩ = σ² ≥ 0
// on the real axis, hence at a simple real pole ⟨Q(r),Q(r)⟩ = σ(r)²/W′(r)² ≥ 0:
//
//     spacelike (HARD)  or  lightlike (SOFT).  TIMELIKE IS FORBIDDEN.
//
// so softness is the BOUNDARY of the allowed region rather than an interior wall.
//
// TWO FALSE ALARMS ARE RECORDED HERE, because both are traps a later reader will re-enter.
//   1. Asking the solver for a timelike pole "succeeds" — by sending W to zero. The scale row pins
//      |Q|²+|W|² = 1, so a solver with no guard on W satisfies anything with no denominator at all.
//   2. With W guarded it still "succeeds" — because t = 1.7 is an EXTRAPOLATION. The residual is
//      pinned in Bernstein coefficients on [0,1] and grows off it, and the solver shrinks W′(1.7)
//      until the violation hides underneath. The audit below is the test that catches it: compare
//      |⟨N,N⟩(t)| against the MOS residual EVALUATED AT t, not against the coefficients.
//
// The machinery is inlined rather than promoted to core/: this is a model we have not adopted, and
// the file is a measurement about it, not production code.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinMultiply } from '../bernstein'

const DIM = 4
const layout = (n: number) => ({
  nQ: DIM * (n + 1), nW: n + 1, nS: 2 * n, total: DIM * (n + 1) + (n + 1) + 2 * n,
})
interface MOS { Q: number[][]; W: number[]; sigma: number[] }
const unpackMOS = (x: readonly number[], n: number): MOS => {
  const L = layout(n)
  return {
    Q: Array.from({ length: DIM }, (_, i) => Array.from({ length: n + 1 }, (_, k) => x[i * (n + 1) + k])),
    W: Array.from({ length: n + 1 }, (_, k) => x[L.nQ + k]),
    sigma: Array.from({ length: L.nS }, (_, k) => x[L.nQ + L.nW + k]),
  }
}
const deriv = (c: readonly number[]): number[] => {
  const d = c.length - 1
  return Array.from({ length: d }, (_, k) => d * (c[k + 1] - c[k]))
}
/** de Casteljau — valid for ANY t, including outside [0,1]. */
const evalBern = (c: readonly number[], t: number): number => {
  let p = [...c]
  while (p.length > 1) p = p.slice(0, -1).map((v, i) => (1 - t) * v + t * p[i + 1])
  return p[0]
}
const mink = (v: readonly number[]): number => v[0] ** 2 + v[1] ** 2 + v[2] ** 2 - v[3] ** 2
const euclid2 = (v: readonly number[]): number => v.reduce((a, c) => a + c * c, 0)

const hodographN = (m: MOS): number[][] => {
  const dW = deriv(m.W)
  return m.Q.map((qi) => {
    const a = bernsteinMultiply(deriv(qi), m.W)
    const b = bernsteinMultiply(qi, dW)
    return a.map((v, k) => v - b[k])
  })
}
const mosResidual = (m: MOS): number[] => {
  const N = hodographN(m)
  const sq = N.map((Ni) => bernsteinMultiply(Ni, Ni))
  const ss = bernsteinMultiply(m.sigma, m.sigma)
  return sq[0].map((_, k) => sq[0][k] + sq[1][k] + sq[2][k] - sq[3][k] - ss[k])
}
const scaleRow = (m: MOS): number =>
  m.Q.reduce((a, qi) => a + euclid2(qi), 0) + euclid2(m.W) - 1

function svdJacobi(A: readonly (readonly number[])[]): { sig: number[]; U: number[][]; V: number[][] } {
  const m = A.length, n = A[0].length
  const U = A.map((r) => [...r])
  const V: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
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
      for (let i = 0; i < n; i++) { const a = V[i][p], b = V[i][q]; V[i][p] = c * a - s * b; V[i][q] = s * a + c * b }
    }
    if (off < 1e-15) break
  }
  return { sig: Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j]))), U, V }
}
function pinvSolve(J: readonly (readonly number[])[], b: readonly number[]): number[] {
  const { sig, U, V } = svdJacobi(J)
  const n = V.length, m = J.length
  const smax = Math.max(...sig)
  const x = new Array<number>(n).fill(0)
  for (let j = 0; j < n; j++) {
    if (sig[j] <= 1e-11 * smax) continue
    let ub = 0
    for (let i = 0; i < m; i++) ub += (U[i][j] / sig[j]) * b[i]
    const coef = ub / sig[j]
    for (let i = 0; i < n; i++) x[i] += coef * V[i][j]
  }
  return x
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

const POLE = 1.7
interface Ask { lightlike?: boolean; causal?: number }
function fullResidual(x: readonly number[], n: number, ask: Ask): number[] {
  const m = unpackMOS(x, n)
  const out = [...mosResidual(m), scaleRow(m), evalBern(m.W, POLE)]
  const Qr = m.Q.map((qi) => evalBern(qi, POLE))
  if (ask.lightlike) out.push(mink(Qr))
  if (ask.causal !== undefined) out.push(mink(Qr) / Math.max(euclid2(Qr), 1e-300) - ask.causal)
  return out
}
function solveMOS(n: number, seed: number, ask: Ask): MOS | null {
  const L = layout(n)
  const rnd = (k: number): number => {
    const v = Math.sin(seed * 77.3 + k * 17.7 + n * 5.1) * 43758.5453
    return (v - Math.floor(v)) * 2 - 1
  }
  let x = Array.from({ length: L.total }, (_, k) => rnd(k))
  for (let it = 0; it < 500; it++) {
    const r = fullResidual(x, n, ask)
    const nr = Math.hypot(...r)
    if (nr < 1e-14) break
    let step: number[]
    try { step = pinvSolve(numericJacobian((v) => fullResidual(v, n, ask), x), r.map((v) => -v)) } catch { break }
    let lam = 1, moved = false
    for (let bt = 0; bt < 30; bt++) {
      const trial = x.map((v, i) => v + lam * step[i])
      if (Math.hypot(...fullResidual(trial, n, ask)) < nr) { x = trial; moved = true; break }
      lam *= 0.5
    }
    if (!moved) break
  }
  return Math.hypot(...fullResidual(x, n, ask)) > 1e-11 ? null : unpackMOS(x, n)
}
/** everything the classification needs, read at the pole. */
function readAtPole(m: MOS) {
  const Qr = m.Q.map((qi) => evalBern(qi, POLE))
  const Nr = hodographN(m).map((Ni) => evalBern(Ni, POLE))
  return {
    W: evalBern(m.W, POLE),
    dW: evalBern(deriv(m.W), POLE),
    qSize: Math.sqrt(euclid2(Qr)),
    iso: mink(Qr) / Math.max(euclid2(Qr), 1e-300),
    NN: mink(Nr),
    sigma2: evalBern(m.sigma, POLE) ** 2,
    identity: mink(Nr) - mink(Qr) * evalBern(deriv(m.W), POLE) ** 2,
    residualAtT: evalBern(mosResidual(m), POLE),
    wScale: Math.max(...m.W.map(Math.abs)),
    qScale: Math.max(...m.Q.flat().map(Math.abs)),
  }
}

describe('MOS curves in R^{3,1}', () => {
  it('a GENUINE real soft pole: lightlike, simple, and the numerator does not cancel', () => {
    const m = solveMOS(3, 4, { lightlike: true })
    expect(m, 'the deterministic lightlike solve').not.toBeNull()
    const a = readAtPole(m as MOS)
    console.log(`    MOS residual ${Math.max(...mosResidual(m as MOS).map(Math.abs)).toExponential(1)};` +
      `  at t=1.7:  W ${a.W.toExponential(1)}  W′ ${a.dW.toFixed(4)}  |Q| ${a.qSize.toFixed(5)}` +
      `  ⟨Q,Q⟩/|Q|² ${a.iso.toExponential(1)}  σ² ${a.sigma2.toExponential(1)}`)
    expect(Math.abs(a.W), 'r = 1.7 is a pole').toBeLessThan(1e-12)
    expect(Math.abs(a.dW), 'and a SIMPLE one — the identity is not vacuous').toBeGreaterThan(0.1)
    expect(a.qSize, 'the numerator does NOT cancel: impossible in Euclidean signature').toBeGreaterThan(0.1)
    expect(Math.abs(a.iso), 'the pole is LIGHTLIKE, i.e. SOFT').toBeLessThan(1e-12)
    expect(a.sigma2, 'so σ vanishes there').toBeLessThan(1e-20)
  }, 120_000)

  it('the identity σ(r)² = ⟨Q,Q⟩·W′(r)² is exact, soft or hard', () => {
    for (const [tag, m] of [
      ['soft', solveMOS(3, 4, { lightlike: true })],
      ['hard', solveMOS(3, 0, {})],
    ] as [string, MOS | null][]) {
      expect(m, tag).not.toBeNull()
      const a = readAtPole(m as MOS)
      console.log(`    ${tag}: ⟨N,N⟩ ${a.NN.toExponential(3)}   ⟨Q,Q⟩·W′² ${(a.NN - a.identity).toExponential(3)}` +
        `   difference ${a.identity.toExponential(1)}`)
      expect(Math.abs(a.identity), 'N(r) = −Q(r)W′(r), exactly').toBeLessThan(1e-14)
    }
  }, 120_000)

  it('the HARD control at the same pole is spacelike, and sits far above the residual', () => {
    const m = solveMOS(3, 0, {})
    expect(m, 'the deterministic hard solve').not.toBeNull()
    const a = readAtPole(m as MOS)
    console.log(`    hard: ⟨Q,Q⟩/|Q|² ${a.iso.toExponential(2)}  W′ ${a.dW.toExponential(2)}` +
      `  |⟨N,N⟩| ${Math.abs(a.NN).toExponential(2)}  |residual at t| ${Math.abs(a.residualAtT).toExponential(2)}`)
    expect(a.iso, 'spacelike, not lightlike').toBeGreaterThan(1e-3)
    expect(Math.abs(a.NN), 'and the signal is far above the extrapolated residual')
      .toBeGreaterThan(1e4 * Math.abs(a.residualAtT))
  }, 120_000)

  it('TIMELIKE is forbidden: the solver only "reaches" it under the extrapolated residual', () => {
    // The row asks for ⟨Q,Q⟩/|Q|² = −0.05 and the solver satisfies it — but the MOS condition is
    // then violated at t = 1.7 by more than it is satisfied. Compare against the residual AT t.
    const m = solveMOS(3, 20, { causal: -0.05 })
    expect(m, 'the solve "succeeds"').not.toBeNull()
    const a = readAtPole(m as MOS)
    console.log(`    asked −0.05: got ⟨Q,Q⟩/|Q|² ${a.iso.toExponential(2)}, W′ ${a.dW.toExponential(2)}` +
      `  |⟨N,N⟩| ${Math.abs(a.NN).toExponential(2)}  |residual at t| ${Math.abs(a.residualAtT).toExponential(2)}` +
      `  -> ratio ${(Math.abs(a.NN) / Math.abs(a.residualAtT)).toFixed(2)}`)
    expect(a.iso, 'the row is met').toBeLessThan(-0.04)
    expect(Math.abs(a.NN), 'but ⟨N,N⟩ at the pole is INSIDE the residual: not a real curve')
      .toBeLessThan(10 * Math.abs(a.residualAtT))
  }, 120_000)
})
