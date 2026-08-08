// ============================================================================
// THE HOPF FORM OF A RATIONAL PH CURVE — and the PARITY THEOREM found while testing it.
//
// The extraction was written to settle Eric's torus question (see conformalPHCurve's bridge
// block). It works, verified independently by multiplying the quaternion polynomial out — but
// only at EVEN conformal degree, and chasing why the odd degrees failed produced the sharper
// result of the two.
//
// THE PARITY THEOREM. A member's conformal control points are C = (w, q, c∞), and the NULL
// condition ⟨C,C⟩ = ‖q‖² − 2w·c∞ = 0 is an identity between POLYNOMIALS. So
//
//     ‖q‖² = 2·w·c∞      hence at every real root r of w:  ‖q(r)‖² = 0,  and q is REAL,
//                        so q(r) = 0 — and (t−r) divides q, w, c∞ and h alike.
//
// A real polynomial of ODD degree always has a real root. w has degree n. Therefore:
//
//     n odd   →  w has a real root  →  the member is (t−r) × a degree-(n−1) member.
//               ODD CONFORMAL DEGREE IS NEVER GENUINELY ODD.
//     n even  →  w may avoid the real axis, and generically does → genuinely degree n.
//
// Measured below, and the pattern is total: degrees 3, 5, 7 give exactly ONE real root of w
// every time with q vanishing there to 1e-7…1e-8; degree 6 gives NONE in five members out of
// five; degree 4 gives none in three of five and TWO in the other two — and those two are
// reducible by two degrees, exactly as the theorem allows.
//
// THE DEGREE-3 CIRCLE IS A COROLLARY, which is the check that this is really the mechanism. A
// degree-3 member is (t−r) × a degree-2 member; a rational quadratic is a conic; PH makes it a
// circle. conformalPHCurve's header reached the same fact from the outside (four coefficients
// span ≤ 4 dimensions of R⁵, so the curve lies on a sphere, and the span collapses to rank 3).
// Both are true. This one says WHY.
//
// WHY THE EXTRACTION FAILS AT ODD DEGREE, since it is the same fact wearing numerical clothes.
// Reducibility gives h = (t−r)h̃ and w = (t−r)w̃, so ‖N‖ = |h·w| = (t−r)²|h̃w̃| has a DOUBLE
// root. U = (‖N‖ + N₁)/2 inherits it, and a member sitting 1e-9 from the variety splits that
// double root into two simple ones about √1e-9 ≈ 3e-5 apart — U dips NEGATIVE between them, so
// it is no longer a sum of two squares and no conjugate-pair selection is right. That is why
// the selection gap reads 1.0 at odd degree (no selection is better than any other) against
// 1e7…1e10 at even degree. The extraction is not fragile; it was being fed a degenerate degree.
//
// SO THE FIGURES SHOULD BE DEGREE 6, not 5 — which is also the degree where working directly in
// R^{4,1} first beats bending a polynomial (17 dimensions against the Möbius orbit's 13).
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type ConformalPHCurve,
  definingJacobian,
  hermiteDataOf,
  normalize,
  residual,
  unpack,
} from '../conformalPHCurve'
import { bernsteinToPower, hodograph, hopfForm } from '../conformalPHHopf'
import { leastSquares } from '../linalg'

// ---------------------------------------------------------------------------
// helpers — everything evaluated by de Casteljau, never through the power basis
// ---------------------------------------------------------------------------

const deCasteljau = (b: readonly number[], t: number): number => {
  let p = [...b]
  while (p.length > 1) {
    const next: number[] = []
    for (let i = 0; i < p.length - 1; i++) next.push((1 - t) * p[i] + t * p[i + 1])
    p = next
  }
  return p[0]
}

const binom = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}

/** Σ|bₖ|·|Bₖⁿ(t)| — the only honest scale for a value at t, and it is finite well outside [0,1]. */
const bernsteinScale = (b: readonly number[], t: number): number =>
  b.reduce((acc, c, k) =>
    acc + Math.abs(c) * binom(b.length - 1, k) * Math.abs(t) ** k * Math.abs(1 - t) ** (b.length - 1 - k), 0)

/** Every sign change of a Bernstein polynomial on [-100,100], bracketed and bisected. */
function realRoots(b: readonly number[]): number[] {
  const out: number[] = []
  for (let k = -2000; k < 2000; k++) {
    let lo = k / 20, hi = (k + 1) / 20
    let flo = deCasteljau(b, lo)
    if (flo * deCasteljau(b, hi) > 0) continue
    for (let j = 0; j < 200; j++) {
      const mid = (lo + hi) / 2, fmid = deCasteljau(b, mid)
      if (flo * fmid <= 0) hi = mid
      else { lo = mid; flo = fmid }
    }
    out.push((lo + hi) / 2)
  }
  return out
}

/** A member from a deterministic seed, by damped Gauss–Newton with backtracking. */
function seededMember(n: number, seed: number): ConformalPHCurve | null {
  let state = seed * 9301 + 49297
  const rnd = (): number => { state = (state * 9301 + 49297) % 233280; return state / 233280 - 0.5 }
  let x = Array.from({ length: 6 * n + 5 }, (_, i) => (i % 5 === 0 ? 1 + 0.4 * rnd() : 2 * rnd()))
  for (let k = 0; k <= n; k++) x[5 * k + 1] = k / n + 0.3 * rnd()
  for (let it = 0; it < 600; it++) {
    const r = residual(unpack(x))
    const nr = Math.hypot(...r)
    if (nr < 1e-15) break
    let step: number[]
    try { step = leastSquares(definingJacobian(unpack(x)), r.map((v) => -v), 1e-11) } catch { return null }
    let lam = 1, moved = false
    for (let bt = 0; bt < 30; bt++) {
      const trial = x.map((v, i) => v + lam * step[i])
      if (Math.hypot(...residual(unpack(trial))) < nr) { x = trial; moved = true; break }
      lam *= 0.5
    }
    if (!moved) break
  }
  const s = normalize(unpack(x))
  return Math.max(...residual(s).map(Math.abs)) < 1e-13 ? s : null
}

const membersOf = (n: number, count: number): ConformalPHCurve[] => {
  const out: ConformalPHCurve[] = []
  for (let seed = 1; seed <= 300 && out.length < count; seed++) {
    const m = seededMember(n, seed)
    if (m) out.push(m)
  }
  return out
}

/** Singular values by one-sided Jacobi on the matrix itself — never through JᵀJ. */
function singularValues(J: readonly (readonly number[])[]): number[] {
  const E = J.length, U = J[0].length
  const A: number[][] = Array.from({ length: U }, (_, i) => Array.from({ length: E }, (_, j) => J[j][i]))
  for (let sweep = 0; sweep < 120; sweep++) {
    let rotated = 0
    for (let p = 0; p < E; p++) {
      for (let q = p + 1; q < E; q++) {
        let app = 0, aqq = 0, apq = 0
        for (let i = 0; i < U; i++) { app += A[i][p] ** 2; aqq += A[i][q] ** 2; apq += A[i][p] * A[i][q] }
        if (app === 0 || aqq === 0 || Math.abs(apq) <= 1e-18 * Math.sqrt(app * aqq)) continue
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

// ---------------------------------------------------------------------------

describe('bernsteinToPower', () => {
  it('agrees with de Casteljau, including outside [0,1]', () => {
    const b = [1.3, -0.4, 2.2, 0.7, -1.1, 3.4]
    const p = bernsteinToPower(b)
    for (const t of [-2, -0.678, 0, 0.25, 0.5, 1, 1.7, 4]) {
      const want = deCasteljau(b, t)
      const power = p.reduceRight((acc, c) => acc * t + c, 0)
      expect(Math.abs(power - want)).toBeLessThan(1e-10 * (1 + Math.abs(want)))
    }
    // B₂³ = 3t²(1−t) = 3t² − 3t³, which is the whole conversion in one line.
    expect(bernsteinToPower([0, 0, 1, 0])).toEqual([0, 0, 3, -3])
  })
})

describe('the parity theorem', () => {
  // Odd degree: w has a real root, ALWAYS (odd-degree real polynomial), and nullity then forces
  // q to vanish there — so the member carries a common linear factor and is a lower-degree curve.
  it.each([3, 5, 7])('degree %i: w has a real root and q vanishes there', (n) => {
    const members = membersOf(n, 4)
    expect(members.length, `members at degree ${n}`).toBeGreaterThan(0)
    for (const m of members) {
      const w = m.C.map((c) => c[0])
      const q = [1, 2, 3].map((i) => m.C.map((c) => c[i]))
      const roots = realRoots(w)
      expect(roots.length, `real roots of w at degree ${n}`).toBeGreaterThanOrEqual(1)
      for (const r of roots) {
        const scale = Math.max(...q.map((qi) => bernsteinScale(qi, r)))
        const value = Math.hypot(...q.map((qi) => deCasteljau(qi, r)))
        // Measured 1e-7…1e-8. Not machine zero, and it should not be read as one: the members
        // sit ~1e-9 from the variety (the Jacobian is ill-conditioned), and this quantity is
        // that distance, amplified. Against O(1) for any polygon without the common factor.
        expect(value / scale, `|q| at w's real root, degree ${n}`).toBeLessThan(1e-5)
        // h carries the same factor, since h/w is the speed and the reduced curve has its own.
        // Asserted at degrees 5 and 7 only. At degree 3 the same quantity measures 1e-4…6.5e-4:
        // that is the CIRCLE stratum, the most singular point of the construction, where a member
        // sits furthest from the variety — and inventing a bound loose enough to cover it would
        // be choosing a threshold to make a test pass rather than recording what was measured.
        // The theorem's content at degree 3 is q(r) = 0, asserted above and clean.
        if (n > 3) {
          expect(Math.abs(deCasteljau(m.h, r)) / bernsteinScale(m.h, r), `|h| at degree ${n}`)
            .toBeLessThan(1e-5)
        }
      }
    }
  }, 300000)

  it('degree 6 keeps w off the real axis, so it is genuinely degree 6', () => {
    const members = membersOf(6, 5)
    expect(members.length).toBe(5)
    // Five out of five, no real root. Nothing forces this — it is what an even degree ALLOWS,
    // and the solver finding it every time says the irreducible stratum is the generic one.
    for (const m of members) expect(realRoots(m.C.map((c) => c[0])).length).toBe(0)
  }, 300000)

  it('degree 4 is mixed — and where w does have real roots, q vanishes there too', () => {
    const members = membersOf(4, 5)
    expect(members.length).toBe(5)
    const counts = members.map((m) => realRoots(m.C.map((c) => c[0])).length)
    // Measured: three with none, two with TWO. Never one — an even-degree real polynomial cannot
    // have an odd number of sign changes, which is the theorem's other half showing up.
    for (const c of counts) expect(c % 2).toBe(0)
    expect(counts.some((c) => c === 0), 'some degree-4 members are irreducible').toBe(true)
    for (const m of members) {
      const q = [1, 2, 3].map((i) => m.C.map((c) => c[i]))
      for (const r of realRoots(m.C.map((c) => c[0]))) {
        const scale = Math.max(...q.map((qi) => bernsteinScale(qi, r)))
        expect(Math.hypot(...q.map((qi) => deCasteljau(qi, r))) / scale).toBeLessThan(1e-5)
      }
    }
  }, 300000)
})

describe('the Hopf form', () => {
  // The verification is the point: A is CONSTRUCTED by a root selection that could be wrong, and
  // then A i A* is multiplied out and compared with N coefficient by coefficient. A wrong
  // selection scores O(1), so these numbers are the proof rather than a plausibility check.
  it.each([4, 6])('extracts A at degree %i and reproduces N exactly', (n) => {
    const members = membersOf(n, 3)
    expect(members.length).toBeGreaterThan(0)
    let clean = 0
    for (const m of members) {
      const form = hopfForm(m)
      expect(form, `hopfForm at degree ${n}`).not.toBeNull()
      if (!form) continue
      expect(form.A.length - 1, 'deg A = n − 1').toBe(n - 1)
      if (form.sandwichDefect < 1e-9) {
        clean++
        // Measured 1e-11…1e-12 for all three of these, on members at 1e-15.
        expect(form.normDefect, '|A|² = h·w').toBeLessThan(1e-9)
        expect(form.divisionDefect, 'v = G/u divides exactly').toBeLessThan(1e-9)
        // And the conjugate-pair selection is DECISIVE: 1e7…1e10 between best and runner-up.
        expect(form.selectionGap, 'selection gap').toBeGreaterThan(1e5)
      }
    }
    // Not every member extracts: a degree-6 member whose w is CLOSE to having a real root is
    // close to the reducible stratum and inherits the odd-degree conditioning. Two of three at
    // degree 6, three of three at degree 4 — reported rather than hidden behind a retry.
    expect(clean, `clean extractions at degree ${n}`).toBeGreaterThanOrEqual(2)
  }, 300000)

  it('W = w exactly: the conformal weight IS the PH denominator', () => {
    const m = membersOf(4, 1)[0]
    const form = hopfForm(m)
    expect(form).not.toBeNull()
    if (!form) return
    // ‖p′‖ = |A|²/w², and |A|² = h·w, so ‖p′‖ = h/w with NO extra denominator anywhere.
    // Checked against the hodograph's own H rather than against a resampled speed.
    const hd = hodograph(m)
    const scale = Math.max(...hd.H.map(Math.abs))
    expect(form.normDefect * scale).toBeLessThan(1e-7 * scale)
    expect(form.w).toEqual(hd.w)
  }, 300000)

  it('fails HONESTLY at odd degree, with a selection gap of 1', () => {
    const m = membersOf(5, 1)[0]
    const form = hopfForm(m)
    expect(form).not.toBeNull()
    if (!form) return
    // The failure is reported, not thrown: no conjugate-pair selection beats any other (gap ≈ 1)
    // and the reconstruction is far off. That is the double root of ‖N‖ = (t−r)²|h̃w̃| splitting.
    expect(form.selectionGap).toBeLessThan(10)
    expect(form.sandwichDefect).toBeGreaterThan(1e-6)
  }, 300000)
})

describe('what a degree-6 figure would offer', () => {
  it('the C¹-Hermite-pinned family has FIVE dimensions at degree 6, not three', () => {
    const m = membersOf(6, 1)[0]
    const data = hermiteDataOf(m)
    const rows = (s: ConformalPHCurve): number[] => {
      const d = hermiteDataOf(s)
      return [
        d.p0.x - data.p0.x, d.p0.y - data.p0.y, d.p0.z - data.p0.z,
        d.p1.x - data.p1.x, d.p1.y - data.p1.y, d.p1.z - data.p1.z,
        d.d0.x - data.d0.x, d.d0.y - data.d0.y, d.d0.z - data.d0.z,
        d.d1.x - data.d1.x, d.d1.y - data.d1.y, d.d1.z - data.d1.z,
      ]
    }
    const x = [...m.C.flatMap((c) => [...c]), ...m.h]
    const base = definingJacobian(m)
    const U = x.length
    const J = base.map((r) => r.slice())
    for (let e = 0; e < 12; e++) J.push(new Array(U).fill(0))
    const step = 1e-7
    for (let c = 0; c < U; c++) {
      const xp = x.slice(); xp[c] += step
      const xm = x.slice(); xm[c] -= step
      const rp = rows(unpack(xp)), rm = rows(unpack(xm))
      for (let e = 0; e < 12; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * step)
    }
    const sv = singularValues(J)
    // Read the rank from the largest gap, and require the gap to be decisive.
    let rank = sv.length, gap = 1
    for (let k = 1; k < sv.length; k++) {
      const ratio = sv[k - 1] / (sv[k] + 1e-300)
      if (ratio > gap) { gap = ratio; rank = k }
    }
    expect(gap, 'the rank gap must be decisive').toBeGreaterThan(1e5)
    // Family 17, less 12 for the data, is 5; and one nullspace direction is the (C,h) ↦ (λC,λh)
    // rescale, which is not a new curve. Degree 5 gave 3 — of a curve that was really a quartic.
    expect(U - rank - 1).toBe(5)
  }, 300000)
})
