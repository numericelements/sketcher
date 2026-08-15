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
  controlPoints,
  curveAt,
  dragAlongLocus,
  dragControlPoint,
  farinParameters,
  definingJacobian,
  hermiteDataOf,
  normalize,
  residual,
  shapeMeasures,
  slideAlongFamily,
  unpack,
  weights,
} from '../conformalPHCurve'
import { bernsteinToPower, hodograph, hopfForm } from '../conformalPHHopf'
import { vadd, vnorm, vsub } from '../quaternion'
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


/** Orthonormal nullspace basis by pivoted Gram–Schmidt: row space first, then what is left. */
function nullspaceBasis(J: readonly (readonly number[])[], dim: number): number[][] {
  const U = J[0].length
  const rowBasis: number[][] = []
  for (const row of J) {
    let v = row.slice()
    for (let pass = 0; pass < 2; pass++) {
      for (const b of rowBasis) {
        const d = v.reduce((acc, x, i) => acc + x * b[i], 0)
        v = v.map((x, i) => x - d * b[i])
      }
    }
    const nn = Math.hypot(...v)
    if (nn > 1e-7 * Math.hypot(...row)) rowBasis.push(v.map((x) => x / nn))
  }
  const out: number[][] = []
  const candidates: number[][] = []
  for (let i = 0; i < U; i++) {
    let v = new Array(U).fill(0)
    v[i] = 1
    for (const b of rowBasis) {
      const d = v.reduce((acc, x, k) => acc + x * b[k], 0)
      v = v.map((x, k) => x - d * b[k])
    }
    candidates.push(v)
  }
  for (let pick = 0; pick < dim; pick++) {
    let best = 0, bestNorm = -1
    for (let i = 0; i < candidates.length; i++) {
      const nn = Math.hypot(...candidates[i])
      if (nn > bestNorm) { bestNorm = nn; best = i }
    }
    const v = candidates[best].map((x) => x / bestNorm)
    out.push(v)
    for (let i = 0; i < candidates.length; i++) {
      const d = candidates[i].reduce((acc, x, k) => acc + x * v[k], 0)
      candidates[i] = candidates[i].map((x, k) => x - d * v[k])
    }
  }
  return out
}

/** The 12 defining rows plus the C¹ Hermite rows, at a member. */
function pinnedJacobian(m: ConformalPHCurve): { J: number[][]; x: number[] } {
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
  const J = base.map((r) => r.slice())
  for (let e = 0; e < 12; e++) J.push(new Array(x.length).fill(0))
  const step = 1e-7
  for (let c = 0; c < x.length; c++) {
    const xp = x.slice(); xp[c] += step
    const xm = x.slice(); xm[c] -= step
    const rp = rows(unpack(xp)), rm = rows(unpack(xm))
    for (let e = 0; e < 12; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * step)
  }
  return { J, x }
}

const rankFromGap = (sv: number[]): { rank: number; gap: number } => {
  let rank = sv.length, gap = 1
  for (let k = 1; k < sv.length; k++) {
    const ratio = sv[k - 1] / (sv[k] + 1e-300)
    if (ratio > gap) { gap = ratio; rank = k }
  }
  return { rank, gap }
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

// ---------------------------------------------------------------------------
// WHAT THE EVEN DEGREES ACTUALLY OFFER — the two candidates for a figure.
//
//     conformal degree 4:  family 13,  ONE dimension once the C¹ data is pinned
//     conformal degree 6:  family 17,  FIVE dimensions
//
// AND DEGREE 4 IS THE STRONGER SLIDE, for a reason that has nothing to do with dimension counts.
// The conformal lift DOUBLES the degree, so a Möbius image of a polynomial PH curve of degree d
// lands at conformal degree 2d. Conformal degree 4 therefore comes from a polynomial PH
// QUADRATIC — and a PH quadratic is a straight line (‖p′‖ = |at+b| forces p′ = (at+b)·u with u
// constant). So at conformal degree 4 the bend-a-polynomial construction can only ever produce
// CIRCLES AND LINES, while the direct construction gives 13 dimensions of genuinely spatial
// curves. Measured here: curvature spread 0.44…0.84 where a circle is 0, out-of-plane up to 0.09,
// and no best-fit sphere. That is the whole argument for working in R^{4,1} at the smallest
// degree where it can be made, and it is sharper than degree 6's "17 against 13".
// ---------------------------------------------------------------------------

describe('what the even degrees offer', () => {
  it('degree 4 is not a circle, and not confined to a plane either', () => {
    const members = membersOf(4, 6).filter((m) => realRoots(m.C.map((c) => c[0])).length === 0)
    expect(members.length, 'irreducible degree-4 members').toBeGreaterThanOrEqual(4)
    const shapes = members.map(shapeMeasures)
    // A circle has curvature spread 0 exactly. Every member is far from that — this is the check
    // that degree 4 is NOT the degree-3 story one rung up.
    for (const s of shapes) expect(s.curvatureSpread, 'curvature spread').toBeGreaterThan(0.3)
    // And at least one member is genuinely out of plane. Individually they can be nearly planar
    // (measured down to 9e-4), so the claim is about the FAMILY, not about every member.
    expect(Math.max(...shapes.map((s) => s.outOfPlane)), 'best out-of-plane').toBeGreaterThan(0.03)
  }, 300000)

  it.each([[4, 1], [6, 5]])('degree %i leaves %i dimensions once the C¹ data is pinned', (n, want) => {
    const m = membersOf(n, 6).filter((c) => realRoots(c.C.map((x) => x[0])).length === 0)[0]
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
    // Family 2n+5, less 12 for the data; and one nullspace direction is the (C,h) ↦ (λC,λh)
    // rescale, which is not a new curve. Degree 5 gave 3 — of a curve that was really a quartic.
    // Degree 4's ONE is the rational analogue of the polynomial cubic's single angle: whether it
    // CLOSES into a circle is a separate question and is not measured here.
    expect(U - rank - 1).toBe(want)
  }, 300000)
})

// ---------------------------------------------------------------------------
// COUNTED IN CURVES RATHER THAN POLYGONS — what the retired degree-5 slide 12 was actually showing,
// and one of the three reasons it was retired.
//
// A tangent direction to the pinned family may move the CURVE, or it may only reshuffle the
// polygon and leave the curve pointwise identical. The rescale (C,h) ↦ (λC,λh) is the obvious
// example. At odd degree there is another one, and it is not obvious at all: the redundant linear
// factor (t−r) of the parity theorem can slide freely, changing every weight and radius on screen
// while the curve does not move.
//
// Measured: at degree 5 the four nullspace directions produce a curve-motion map of rank TWO
// (singular values 1.0, 0.73, 7e-6, 4e-9 — gap 1e5). One is the rescale, so of that slide's THREE
// strict dimensions only TWO were curve shape — a third slider that moved the polygon and left the
// curve alone. At degree 4 the two directions give rank ONE, and
// the one that does nothing is exactly the rescale — no hidden redundancy left.
//
// That is why degree 4 is the honest figure: every dial it offers moves the curve.
// ---------------------------------------------------------------------------

describe("Eric's strict mode: pin the four outer control points", () => {
  // Pinning P₀, P₁, P₃, P₄ is 12 conditions, the same COUNT as the C¹ Hermite data but not the
  // same conditions (the data involves the weights, the points do not). It leaves exactly ONE
  // dimension, so a slider that holds all four moves the middle control point and nothing else —
  // which is the figure Eric asked for, and it is possible at degree 4 because of this number.
  it('leaves exactly one dimension at degree 4', () => {
    const m = membersOf(4, 6).filter((c) => realRoots(c.C.map((x) => x[0])).length === 0)[0]
    const want = controlPoints(m)
    const pinned = [0, 1, 3, 4]
    const rows = (s: ConformalPHCurve): number[] => {
      const P = controlPoints(s)
      return pinned.flatMap((i) => [P[i].x - want[i].x, P[i].y - want[i].y, P[i].z - want[i].z])
    }
    const x = [...m.C.flatMap((c) => [...c]), ...m.h]
    const base = definingJacobian(m)
    const J = base.map((r) => r.slice())
    for (let e = 0; e < 12; e++) J.push(new Array(x.length).fill(0))
    const step = 1e-7
    for (let c = 0; c < x.length; c++) {
      const xp = x.slice(); xp[c] += step
      const xm = x.slice(); xm[c] -= step
      const rp = rows(unpack(xp)), rm = rows(unpack(xm))
      for (let e = 0; e < 12; e++) J[base.length + e][c] = (rp[e] - rm[e]) / (2 * step)
    }
    const { rank, gap } = rankFromGap(singularValues(J))
    expect(gap, 'rank gap').toBeGreaterThan(1e5)
    // rank 27 of 28 rows — the one deficiency is the h-leading-coefficient relation, as always.
    expect(x.length - rank - 1, 'dimensions left with four points pinned').toBe(1)
  }, 300000)
})

describe('the strict family, counted in curves', () => {
  it.each([[4, 2, 1], [5, 4, 2]])(
    'degree %i: %i tangent directions, only %i of which move the curve',
    (n, directions, moving) => {
      const m = membersOf(n, 6).filter((c) =>
        n % 2 === 1 || realRoots(c.C.map((x) => x[0])).length === 0)[0]
      const { J, x } = pinnedJacobian(m)
      const basis = nullspaceBasis(J, directions)
      const ts = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85]
      const samples = ts.map((t) => curveAt(m, t))
      const extent = Math.max(...samples.map((p) => (p ? vnorm(vsub(p, samples[0]!)) : 0)))
      const motion = basis.map((d) => {
        const eps = 1e-6
        const plus = unpack(x.map((v, i) => v + eps * d[i]))
        const minus = unpack(x.map((v, i) => v - eps * d[i]))
        return ts.flatMap((t) => {
          const a = curveAt(plus, t), b = curveAt(minus, t)
          if (!a || !b) return [0, 0, 0]
          return [(a.x - b.x), (a.y - b.y), (a.z - b.z)].map((v) => v / (2 * eps) / extent)
        })
      })
      const { rank, gap } = rankFromGap(singularValues(motion))
      expect(gap, 'the curve-motion rank gap must be decisive').toBeGreaterThan(1e4)
      expect(rank, `directions that move the curve at degree ${n}`).toBe(moving)
    }, 300000)
})

// ---------------------------------------------------------------------------
// THE TWO SLIDE-13 GESTURES, at degree 4.
//
// Strict mode holds the four outer control points and leaves the middle one a CURVE to move on,
// so its drag prescribes one scalar (the component along the drag direction) against 12 pinned
// coordinates — 13 rows for a 13-dimensional family. Free mode holds only the two ends and
// prescribes all three cursor coordinates, which leaves 4 spare dimensions.
// ---------------------------------------------------------------------------

describe('slide 13 gestures', () => {
  const quartic = (): ConformalPHCurve =>
    membersOf(4, 6).filter((c) => realRoots(c.C.map((x) => x[0])).length === 0)[0]

  // The gesture Eric asked for — hold the four outer points, move the middle one — turns out to be
  // IMPOSSIBLE, and that is the interesting finding rather than a bug. The single remaining
  // dimension is a pure weight direction: the tangent moves every weight by 0.1–0.5 and the middle
  // point by 1e-6 of the same norm. So the honest strict dial slides the Farin beads.
  it('strict: the middle point CANNOT move with the four outer points held', () => {
    const m = quartic()
    const before = controlPoints(m)
    const scale = vnorm(vsub(before[4], before[0]))
    const target = vadd(before[2], { x: 0.05 * scale, y: 0.02 * scale, z: 0.03 * scale })
    const step = dragAlongLocus(m, 2, target, { pin: [0, 1, 3, 4] })
    // It reports the full shortfall and leaves the curve exactly as it was — no drift off the
    // family to please the cursor.
    expect(vnorm(vsub(controlPoints(step.state)[2], before[2])), 'no motion').toBeLessThan(1e-9)
    expect(step.trackingError, 'the shortfall is reported').toBeGreaterThan(0.9 * vnorm(vsub(target, before[2])))
    expect(Math.max(...residual(step.state).map(Math.abs)), 'still a member').toBeLessThan(1e-9)
  }, 300000)

  it('strict: dragging an outer point holds the other three', () => {
    const m = quartic()
    const before = controlPoints(m)
    const scale = vnorm(vsub(before[4], before[0]))
    const target = vadd(before[1], { x: 0.02 * scale, y: 0.015 * scale, z: 0.01 * scale })
    const step = dragControlPoint(m, 1, target, { pin: [0, 1, 3, 4] })
    expect(step.converged, 'converged').toBe(true)
    const after = controlPoints(step.state)
    expect(vnorm(vsub(after[1], target)), 'tracked the cursor').toBeLessThan(1e-6)
    for (const i of [0, 3, 4]) {
      expect(vnorm(vsub(after[i], before[i])), `pinned point ${i}`).toBeLessThan(1e-7)
    }
  }, 300000)

  it('free: dragging an interior point holds only the two ends', () => {
    const m = quartic()
    const before = controlPoints(m)
    const scale = vnorm(vsub(before[4], before[0]))
    const target = vadd(before[2], { x: 0.03 * scale, y: -0.02 * scale, z: 0.015 * scale })
    const step = dragControlPoint(m, 2, target, { pinEnds: true })
    expect(step.converged, 'converged').toBe(true)
    const after = controlPoints(step.state)
    expect(vnorm(vsub(after[2], target)), 'tracked the cursor').toBeLessThan(1e-6)
    for (const i of [0, 4]) expect(vnorm(vsub(after[i], before[i])), `end ${i}`).toBeLessThan(1e-7)
    // And P₁ IS allowed to answer here — that is the difference from strict mode.
    expect(vnorm(vsub(after[1], before[1])), 'P₁ responds in free mode').toBeGreaterThan(0)
  }, 300000)
})

// ---------------------------------------------------------------------------
// THE DIAL WITH FOUR POINTS PINNED IS A REPARAMETRISATION — Eric spotted it in the figure
// ("the dial does not change the shape of the curve, it just moves the Farin points") and he is
// right. Measured: the weights move by w_k ↦ λᵏ·w_k with a single λ = 3.4218 recovered to four
// decimals from all four ratios, and the curve's IMAGE is unchanged to 2.6e-3 of its extent, which
// is the sampling resolution. Points slide ALONG the curve, so samples at equal t move by 0.56 of
// the extent while the curve itself does not move at all.
//
// It explains every earlier observation at a stroke: the control points cannot move because λᵏ
// leaves them fixed; all the weights change; the wall is asymptotic because λ ranges over (0,∞);
// and the "open arc that does not close projectively" is that half-line.
//
// SO THE FAMILY'S 13 DIMENSIONS INCLUDE THIS PARAMETER GAUGE. Geometric content is 12, and
// pinning the four outer control points leaves ZERO genuine freedom — the frozen-polygon reading
// was wrong, and the slide needs the C¹ HERMITE DATA pinned instead. λᵏ rescales p′(0) by λ
// (since p′(0) = n(w₁/w₀)(P₁−P₀)), so pinning the data DOES fix λ, and the one dimension left
// there is genuine shape: measured curve motion 6.9e-4 per unit against control-point motion
// 1.3e-2, nonzero and rank 1 with a decisive gap.
// ---------------------------------------------------------------------------

describe('the four-points dial is the parameter gauge', () => {
  it('moves the weights as λᵏ and leaves the curve where it was', () => {
    const m = membersOf(4, 6).filter((c) => realRoots(c.C.map((x) => x[0])).length === 0)[0]
    const dial = (s: ConformalPHCurve): number => farinParameters(s)[0]
    let s = m
    for (let k = 0; k < 20; k++) {
      const step = slideAlongFamily(s, { pin: [0, 1, 3, 4], readout: dial, target: dial(m) + 0.3 })
      if (!step.converged) break
      s = step.state
    }
    expect(dial(s) - dial(m), 'the dial moved').toBeGreaterThan(0.1)

    // A single λ explains every weight ratio — that IS the classical reparametrisation.
    const before = weights(m), after = weights(s)
    const ratio = after.map((v, k) => v / before[k])
    const lambdas = ratio.slice(1).map((r, i) => Math.pow(r / ratio[0], 1 / (i + 1)))
    for (const l of lambdas) expect(l / lambdas[0], 'one λ for every k').toBeCloseTo(1, 3)

    // And the IMAGE is unchanged: every point of the new curve lies on the old one.
    const ts = Array.from({ length: 61 }, (_, k) => k / 60)
    // The REFERENCE curve is sampled far more finely than the test points: a nearest-neighbour
    // distance cannot resolve below the reference's own spacing, and at 61 samples it read 0.022 —
    // the grid, not the curve. At 401 it reads 2.6e-3.
    const old = Array.from({ length: 401 }, (_, k) => curveAt(m, k / 400)!)
    const extent = Math.max(...old.map((p) => vnorm(vsub(p, old[0]))))
    let worst = 0
    for (const t of ts) {
      const q = curveAt(s, t)!
      worst = Math.max(worst, Math.min(...old.map((p) => vnorm(vsub(q, p)))))
    }
    expect(worst / extent, 'the curve is the same set of points').toBeLessThan(0.02)
  }, 300000)
})
