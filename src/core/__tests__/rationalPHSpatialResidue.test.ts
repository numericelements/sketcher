// ============================================================================
// RATIONAL PH SPACE CURVES: IS THE NO-LOG CONDITION LINEAR IN THE SPINOR?
//
// WHERE 𝒜 SITS. Write the rational curve as c = p/w with p a vector polynomial and w scalar. Then
// c′ = N/w² with N = p′w − pw′ the WRONSKIAN, and ‖c′‖ = ‖N‖/w². So PH says ‖N‖ is a polynomial, and
// the classical theorem applies to N verbatim: N = 𝒜 i 𝒜̄. The spinor squares to the Wronskian, not to
// the derivative — and the polynomial case is the w = const corner where the two coincide. This is the
// spatial twin of FOUNDATIONS F13's 2D statement F′D − FD′ = S².
//
// THE QUESTION. Recovering the curve means solving p′w − pw′ = N, i.e. integrating N/w², and that is
// rational only if the residues vanish. In 2D (F13) those conditions come out LINEAR in S, because the
// equation is quadratic-homogeneous in a COMMUTATIVE field and one factor of S divides out. In 3D the
// same division is not available. So: linear, or not?
//
//   linear    → the spatial rational fiber is linear algebra, exactly as in 2D
//   not       → the fibers need genuine elimination, and the spinor construction reaching 17 of 18
//               dimensions is EXPECTED rather than a bookkeeping error
//
// THE RESIDUE CONDITION, derived here and checked below. For a simple root r of w, write w = (t−r)·φ.
// Then N/w² = g/(t−r)² with g = N/φ², so the 1/(t−r) coefficient is g′(r), and it vanishes iff
//
//     N′(r) = 2·N(r)·Σ,        Σ = φ′(r)/φ(r) = Σ_{l≠k} 1/(r_k − r_l)
//
// Substituting N = S² recovers F13's 2D condition S′(r) = S(r)·Σ exactly, which is the cross-check
// that the derivation is right.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qnormSq, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

// --- polynomial plumbing ----------------------------------------------------
type QPoly = Quat[]
type RPoly = number[]

const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const rDeriv = (p: RPoly): RPoly => p.slice(1).map((c, i) => c * (i + 1))

/** N = 𝒜 i 𝒜̄ as a polynomial: the Hopf square, coefficient by coefficient. */
function wronskianFromSpinor(A: QPoly): { x: RPoly; y: RPoly; z: RPoly } {
  const deg = 2 * (A.length - 1)
  const out = { x: new Array(deg + 1).fill(0), y: new Array(deg + 1).fill(0), z: new Array(deg + 1).fill(0) }
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
      out.x[i + j] += v.x
      out.y[i + j] += v.y
      out.z[i + j] += v.z
    }
  }
  return out
}

/** |𝒜|² as a polynomial — the speed numerator. */
function speedNumerator(A: QPoly): RPoly {
  const out = new Array(2 * (A.length - 1) + 1).fill(0)
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      const prod = qmul(A[i], qconj(A[j]))
      out[i + j] += prod.u
    }
  }
  return out
}

/** The residue of N/w² at a simple root r: N′(r) − 2·N(r)·Σ, componentwise. */
function residueAt(
  N: { x: RPoly; y: RPoly; z: RPoly }, roots: readonly number[], k: number,
): [number, number, number] {
  const r = roots[k]
  const sigma = roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (r - rl)), 0)
  const comp = (c: RPoly): number => rEval(rDeriv(c), r) - 2 * rEval(c, r) * sigma
  return [comp(N.x), comp(N.y), comp(N.z)]
}

const polyFromRoots = (roots: readonly number[]): RPoly =>
  roots.reduce<RPoly>((acc, r) => {
    const out = new Array(acc.length + 1).fill(0)
    for (let i = 0; i < acc.length; i++) { out[i + 1] += acc[i]; out[i] += -r * acc[i] }
    return out
  }, [1])

/**
 * Solve p′w − pw′ = N for the vector polynomial p, by linear least squares on its coefficients.
 * Consistency of this system IS the no-log condition: the kernel always contains the translations
 * p ↦ p + c₀w, so the rank falls 3 short and 3 conditions per root of w must hold on N.
 */
function solveWronskian(
  N: { x: RPoly; y: RPoly; z: RPoly }, w: RPoly,
): { residual: number; unknowns: number; equations: number } {
  const degN = Math.max(N.x.length, N.y.length, N.z.length) - 1
  const degP = degN - (w.length - 1) + 1
  const wD = rDeriv(w)
  const rows: number[][] = []
  const rhs: number[] = []
  const comps: RPoly[] = [N.x, N.y, N.z]
  // One scalar system per component, assembled together so the reported residual covers all three.
  for (let c = 0; c < 3; c++) {
    for (let e = 0; e <= degN; e++) {
      const row = new Array(3 * (degP + 1)).fill(0)
      for (let k = 0; k <= degP; k++) {
        // coefficient of tᵉ in (p′w − pw′) contributed by pₖtᵏ
        let acc = 0
        for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
        for (let a = 0; a < wD.length; a++) if (k + a === e) acc -= wD[a]
        row[c * (degP + 1) + k] = acc
      }
      rows.push(row)
      rhs.push(comps[c][e] ?? 0)
    }
  }
  const x = leastSquares(rows, rhs, 1e-14)
  let worst = 0
  const scale = Math.max(...rhs.map(Math.abs), 1e-300)
  for (let i = 0; i < rows.length; i++) {
    const got = rows[i].reduce((s, a, j) => s + a * x[j], 0)
    worst = Math.max(worst, Math.abs(got - rhs[i]))
  }
  return { residual: worst / scale, unknowns: 3 * (degP + 1), equations: rows.length }
}

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const qsubq = (a: Quat, b: Quat): Quat => qadd(a, qscale(b, -1))

describe('rational PH space curves: the no-log condition', () => {
  it('cross-check: substituting N = S² reproduces F13s 2D condition', () => {
    // In 2D the condition is S′(r) = S(r)·Σ. Here it is N′(r) = 2N(r)·Σ. With N = S² the two agree,
    // since N′ = 2SS′. Checked numerically on a complex S so the derivation is not just plausible.
    const roots = [0.3, -1.2, 2.1]
    const sigma = (k: number) => roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)
    const S: [RPoly, RPoly] = [[1.3, -0.4, 0.25], [0.2, 0.9, -0.1]]  // real, imag parts
    let worst = 0
    for (let k = 0; k < roots.length; k++) {
      const r = roots[k], sg = sigma(k)
      // N = S² as a complex square
      const sr = rEval(S[0], r), si = rEval(S[1], r)
      const sdr = rEval(rDeriv(S[0]), r), sdi = rEval(rDeriv(S[1]), r)
      // N = (sr² − si², 2 sr si);  N′ = (2 sr sdr − 2 si sdi, 2(sdr si + sr sdi))
      const N = [sr * sr - si * si, 2 * sr * si]
      const Nd = [2 * sr * sdr - 2 * si * sdi, 2 * (sdr * si + sr * sdi)]
      const threeD = [Nd[0] - 2 * N[0] * sg, Nd[1] - 2 * N[1] * sg]
      // F13's 2D form, multiplied by 2S(r) to compare on the same footing
      const twoD0 = 2 * (sr * (sdr - sr * sg) - si * (sdi - si * sg))
      const twoD1 = 2 * (sr * (sdi - si * sg) + si * (sdr - sr * sg))
      worst = Math.max(worst, Math.abs(threeD[0] - twoD0), Math.abs(threeD[1] - twoD1))
    }
    console.log(`    N′ = 2N·Σ  vs  2S·(S′ − S·Σ):  ${worst.toExponential(1)}`)
    expect(worst, 'the spatial condition specialises to F13 in 2D').toBeLessThan(1e-12)
  })

  it('IT IS NOT LINEAR IN 𝒜 — it is quadratic, and that is the answer', () => {
    // A linear condition would scale as s under 𝒜 ↦ s𝒜; a quadratic one as s². Measured directly.
    const roots = [0.4, -1.1]
    const A: QPoly = [Q(1, 0.3, -0.5, 0.2), Q(-0.4, 0.9, 0.1, -0.7), Q(0.25, -0.15, 0.6, 0.35)]
    const base = residueAt(wronskianFromSpinor(A), roots, 0)
    for (const s of [2, 3, 0.5]) {
      const scaled = residueAt(wronskianFromSpinor(A.map((a) => qscale(a, s))), roots, 0)
      const ratio = scaled[0] / base[0]
      console.log(`    𝒜 ↦ ${s}𝒜 scales the residue by ${ratio.toFixed(4)}   (linear would be ${s}, quadratic ${s * s})`)
      expect(ratio, `scaling by ${s} scales the residue by s²`).toBeCloseTo(s * s, 8)
    }
  })

  it('BUT IT HAS STRUCTURE: 𝒜′(r) = 𝒜(r)·(Σ + λi), λ free — three conditions, not four', () => {
    // Dividing the quadratic condition through by 𝒜(r) leaves a condition on the LOGARITHMIC
    // derivative: 𝒜⁻¹𝒜′ must equal Σ + λi. Working out Vi + iV̄ = 2Σi for V = v₀ + v gives
    // v₀ = Σ, v₂ = v₃ = 0, and v₁ FREE — so the constraint is that 𝒜′(r) lies in the 2-plane
    // 𝒜(r)·span{1, i}, with the scalar part pinned. That plane is exactly the SCALE and GAUGE
    // directions of the spinor, which is why the gauge keeps reappearing.
    const roots = [0.35]                      // one simple root, so Σ = 0
    const w = polyFromRoots(roots)
    const A0 = Q(1.1, 0.4, -0.3, 0.8)
    for (const lambda of [0, 0.7, -1.9]) {
      // 𝒜(t) = A0 + A1(t−r) + A2(t−r)², with A1 = A0·(Σ + λi) = λ·A0·i since Σ = 0.
      const A1 = qmul(A0, qscale(QUAT_I, lambda))
      const A2 = Q(0.2, -0.5, 0.15, 0.6)
      const r = roots[0]
      // expand about r into the power basis
      const A: QPoly = [
        qadd(qsubq(A0, qscale(A1, r)), qscale(A2, r * r)),
        qsubq(A1, qscale(A2, 2 * r)),
        A2,
      ]
      const N = wronskianFromSpinor(A)
      const res = residueAt(N, roots, 0)
      const scale = Math.max(...[N.x, N.y, N.z].flat().map(Math.abs), 1e-300)
      const rel = Math.max(...res.map(Math.abs)) / scale
      const solved = solveWronskian(N, w)
      console.log(
        `    λ = ${String(lambda).padStart(5)}:  residue ${rel.toExponential(1)}` +
          `   Wronskian solve residual ${solved.residual.toExponential(1)}` +
          `   (${solved.unknowns} unknowns, ${solved.equations} equations)`,
      )
      expect(rel, `λ=${lambda}: the derived form kills the residue`).toBeLessThan(1e-12)
      expect(solved.residual, `λ=${lambda}: so p′w − pw′ = N is solvable`).toBeLessThan(1e-9)
    }

    // And a spinor NOT of that form leaves a residue, so the condition is not vacuous.
    const bad: QPoly = [A0, Q(0.3, 0.1, 0.9, -0.2), Q(0.2, -0.5, 0.15, 0.6)]
    const Nbad = wronskianFromSpinor(bad)
    const scaleBad = Math.max(...[Nbad.x, Nbad.y, Nbad.z].flat().map(Math.abs), 1e-300)
    const relBad = Math.max(...residueAt(Nbad, roots, 0).map(Math.abs)) / scaleBad
    const solvedBad = solveWronskian(Nbad, w)
    console.log(
      `    off-form:   residue ${relBad.toExponential(1)}` +
        `   Wronskian solve residual ${solvedBad.residual.toExponential(1)}  <- NOT solvable`,
    )
    expect(relBad, 'a generic spinor violates the condition').toBeGreaterThan(1e-3)
    expect(solvedBad.residual, 'and then the Wronskian cannot be solved').toBeGreaterThan(1e-6)
  })

  it('the admissible spinors form a 3-CODIMENSIONAL set per root, and the curve is PH', () => {
    // Count it by measuring the rank of the residue map at a point of the admissible set: three
    // conditions per root, matching the residue being a VECTOR. Then confirm end to end that a member
    // really is a rational PH curve — speed |𝒜|²/w².
    const roots = [0.35]
    const w = polyFromRoots(roots)
    const A0 = Q(1.1, 0.4, -0.3, 0.8)
    const A1 = qmul(A0, qscale(QUAT_I, 0.7))
    const A2 = Q(0.2, -0.5, 0.15, 0.6)
    const r = roots[0]
    const base: QPoly = [
      qadd(qsubq(A0, qscale(A1, r)), qscale(A2, r * r)),
      qsubq(A1, qscale(A2, 2 * r)),
      A2,
    ]
    // Jacobian of the 3 residue components with respect to all 12 spinor coefficients.
    const rows: number[][] = []
    for (let comp = 0; comp < 3; comp++) {
      rows.push(
        Array.from({ length: base.length * 4 }, (_, idx) => {
          const e = 1e-6
          const bump = (sign: number): QPoly =>
            base.map((a, k) => {
              if (Math.floor(idx / 4) !== k) return a
              const parts = [a.u, a.v, a.p, a.q]
              parts[idx % 4] += sign * e
              return Q(parts[0], parts[1], parts[2], parts[3])
            })
          const hi = residueAt(wronskianFromSpinor(bump(+1)), roots, 0)[comp]
          const lo = residueAt(wronskianFromSpinor(bump(-1)), roots, 0)[comp]
          return (hi - lo) / (2 * e)
        }),
      )
    }
    // rank of a 3 x 12 matrix, by Gram-determinant growth
    const gram = rows.map((a) => rows.map((b) => a.reduce((s, v, i) => s + v * b[i], 0)))
    const det3 =
      gram[0][0] * (gram[1][1] * gram[2][2] - gram[1][2] * gram[2][1]) -
      gram[0][1] * (gram[1][0] * gram[2][2] - gram[1][2] * gram[2][0]) +
      gram[0][2] * (gram[1][0] * gram[2][1] - gram[1][1] * gram[2][0])
    const norms = rows.map((a) => Math.hypot(...a))
    const conditioned = det3 / Math.pow(norms.reduce((a, b) => a * b, 1), 2)
    console.log(
      `    residue Jacobian is 3 x ${base.length * 4}; Gram det (normalised) ${conditioned.toExponential(1)}` +
        `  -> the 3 conditions per root are independent`,
    )
    expect(conditioned, 'three independent conditions per root').toBeGreaterThan(1e-6)

    // End to end: the speed of the recovered curve is |𝒜|²/w².
    const N = wronskianFromSpinor(base)
    const solved = solveWronskian(N, w)
    const sigma = speedNumerator(base)
    let worst = 0
    for (const t of [-0.4, 0.1, 0.8, 1.6]) {
      const nrm = Math.hypot(rEval(N.x, t), rEval(N.y, t), rEval(N.z, t))
      worst = Math.max(worst, Math.abs(nrm - rEval(sigma, t)) / Math.max(rEval(sigma, t), 1e-12))
    }
    console.log(
      `    and ‖N‖ = |𝒜|² to ${worst.toExponential(1)}, so ‖c′‖ = |𝒜|²/w²` +
        `   (Wronskian solved to ${solved.residual.toExponential(1)})`,
    )
    expect(worst, 'the Hopf identity holds, so the member is exactly PH').toBeLessThan(1e-12)
    expect(qnormSq(A0), 'sanity: the spinor is nonzero').toBeGreaterThan(0)
  })
})
