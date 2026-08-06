// ============================================================================
// Rung 1 + rung 2 of the interpolation ladder.
//
// Rung 1 (phQuinticHermite) is derived from the definition c′ = w², NOT copied
// from a paper, so these tests are what make it trustworthy:
//   * the control-point legs really do reproduce c′ = w² (sampled)
//   * each of the four solutions interpolates the C¹ data EXACTLY
//   * the count is the literature's 4
//
// Rung 2 (phSubsetInterp) is cross-checked AGAINST rung 1: the general Newton
// subset solver on S = {0,1,4,5} must recover exactly the four closed-form
// Hermite interpolants. That is the oracle relationship the whole ladder rests
// on — an independent method finding the same answers.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul, csub, cscale, cnorm } from '../complex'
import {
  type PHQuinticGenerator,
  csqrtBoth,
  csolveQuadratic,
  controlPoints,
  hodographAt,
  curveAt,
  speedAt,
  arcLength,
  sigmaBernstein,
  speedLowerBound,
  phQuinticHermite,
  selectGoodSolution,
} from '../phQuinticHermite'
import {
  solvePHSubset,
  allFourSubsets,
  subsetTable,
  cpOffsets,
  cpOffsetDerivs,
  csolveLinear,
  countDirectSquares,
  isTriangularSubset,
} from '../phSubsetInterp'

const C = (re: number, im: number): Complex => ({ re, im })
const dist = (a: Complex, b: Complex): number => cnorm(csub(a, b))

/** Derivative of a Bézier polygon, evaluated by de Casteljau: c′(t) = n·Σ Δpₖ Bₖⁿ⁻¹. */
function bezierDerivAt(cps: readonly Complex[], t: number): Complex {
  const n = cps.length - 1
  let pts = cps.slice(1).map((p, i) => cscale(csub(p, cps[i]), n))
  while (pts.length > 1) {
    const next: Complex[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(cadd(cscale(pts[i], 1 - t), cscale(pts[i + 1], t)))
    }
    pts = next
  }
  return pts[0]
}

const REF: PHQuinticGenerator = { w0: C(1.3, 0.4), w1: C(-0.2, 1.1), w2: C(0.9, -0.7) }
const REF_P0 = C(0.15, -0.35)

// ---------------------------------------------------------------------------
describe('complex helpers', () => {
  it('csqrtBoth returns the two square roots and they square back', () => {
    for (const z of [C(3, 4), C(-2, 0), C(0, 5), C(-1, -1), C(7, -0.001)]) {
      const [a, b] = csqrtBoth(z)
      expect(dist(cmul(a, a), z)).toBeLessThan(1e-12 * (1 + cnorm(z)))
      expect(dist(cmul(b, b), z)).toBeLessThan(1e-12 * (1 + cnorm(z)))
      expect(dist(a, cscale(b, -1))).toBeLessThan(1e-14 * (1 + cnorm(z)))
    }
  })

  it('csolveQuadratic roots satisfy the equation, including a wildly scaled one', () => {
    const cases: [Complex, Complex, Complex][] = [
      [C(2, 0), C(3, -1), C(-4, 2)],
      [C(1, 1), C(0, 0), C(-1, 0)],
      [C(1, 0), C(1e8, 0), C(1, 0)], // catastrophic-cancellation case
    ]
    for (const [a, b, c] of cases) {
      for (const x of csolveQuadratic(a, b, c)) {
        const v = cadd(cadd(cmul(cmul(a, x), x), cmul(b, x)), c)
        const scale = cnorm(a) * cnorm(x) * cnorm(x) + cnorm(b) * cnorm(x) + cnorm(c)
        expect(cnorm(v)).toBeLessThan(1e-9 * (1 + scale))
      }
    }
  })

  it('csolveLinear solves a 3x3 complex system', () => {
    const A = [
      [C(2, 1), C(0, -1), C(1, 0)],
      [C(1, 0), C(3, 2), C(0, 1)],
      [C(0, 2), C(1, 1), C(4, 0)],
    ]
    const x = [C(1, -2), C(0.5, 0.25), C(-3, 1)]
    const b = A.map((row) => row.reduce((s, z, j) => cadd(s, cmul(z, x[j])), C(0, 0)))
    const got = csolveLinear(A, b)
    expect(got).not.toBeNull()
    for (let i = 0; i < 3; i++) expect(dist(got![i], x[i])).toBeLessThan(1e-12)
  })
})

// ---------------------------------------------------------------------------
describe('generator -> curve (the eq. 2/3 formulas)', () => {
  it("the control-point legs reproduce c' = w^2 exactly at sampled t", () => {
    const cps = controlPoints(REF, REF_P0)
    expect(cps).toHaveLength(6)
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      const fromPolygon = bezierDerivAt(cps, t)
      const fromGenerator = hodographAt(REF, t)
      expect(dist(fromPolygon, fromGenerator)).toBeLessThan(1e-12)
    }
  })

  it('|c\'| = sigma = |w|^2 — the PH property, no radical', () => {
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(Math.abs(cnorm(hodographAt(REF, t)) - speedAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('sigma is a degree-4 polynomial: its Bernstein form matches sampled |w|^2', () => {
    const coeffs = sigmaBernstein(REF)
    expect(coeffs).toHaveLength(5)
    const bern = (t: number): number => {
      const s = 1 - t
      const B = [s ** 4, 4 * t * s ** 3, 6 * t * t * s * s, 4 * t ** 3 * s, t ** 4]
      return coeffs.reduce((acc, c, k) => acc + c * B[k], 0)
    }
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      expect(Math.abs(bern(t) - speedAt(REF, t))).toBeLessThan(1e-12)
    }
  })

  it('arc length is exact: matches fine numerical quadrature of sigma', () => {
    const n = 20000
    let num = 0
    for (let i = 0; i < n; i++) num += speedAt(REF, (i + 0.5) / n) / n
    expect(Math.abs(arcLength(REF) - num)).toBeLessThan(1e-8 * num)
  })

  it('curveAt endpoints are the first and last control points', () => {
    const cps = controlPoints(REF, REF_P0)
    expect(dist(curveAt(REF, REF_P0, 0), cps[0])).toBeLessThan(1e-14)
    expect(dist(curveAt(REF, REF_P0, 1), cps[5])).toBeLessThan(1e-13)
  })

  it('speedLowerBound is a genuine lower bound on sampled sigma (variation diminishing)', () => {
    const gens: PHQuinticGenerator[] = [
      REF,
      { w0: C(1, 0), w1: C(0.1, 0.9), w2: C(-0.4, 0.3) },
      { w0: C(2, -1), w1: C(2, -1), w2: C(2, -1) },
    ]
    for (const g of gens) {
      const lb = speedLowerBound(g)
      for (let i = 0; i <= 200; i++) {
        expect(speedAt(g, i / 200)).toBeGreaterThanOrEqual(lb - 1e-12)
      }
    }
  })
})

// ---------------------------------------------------------------------------
describe('rung 1 — planar PH quintic C1 Hermite', () => {
  // Data taken from the reference curve, so an exact interpolant is guaranteed.
  const refCps = controlPoints(REF, REF_P0)
  const data = {
    p0: refCps[0],
    d0: hodographAt(REF, 0),
    p1: refCps[5],
    d1: hodographAt(REF, 1),
  }

  it('returns exactly four solutions (the classical count)', () => {
    expect(phQuinticHermite(data)).toHaveLength(4)
  })

  it('every solution interpolates the C1 data exactly', () => {
    for (const s of phQuinticHermite(data)) {
      const cps = s.controlPoints
      expect(dist(cps[0], data.p0)).toBeLessThan(1e-12)
      expect(dist(cps[5], data.p1)).toBeLessThan(1e-11)
      expect(dist(hodographAt(s.generator, 0), data.d0)).toBeLessThan(1e-12)
      expect(dist(hodographAt(s.generator, 1), data.d1)).toBeLessThan(1e-12)
    }
  })

  it('the four solutions are genuinely distinct curves', () => {
    const sols = phQuinticHermite(data)
    const mid = sols.map((s) => curveAt(s.generator, data.p0, 0.5))
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        expect(dist(mid[i], mid[j])).toBeGreaterThan(1e-6)
      }
    }
  })

  it('one of the four IS the reference curve', () => {
    const sols = phQuinticHermite(data)
    const errs = sols.map((s) =>
      Math.max(...s.controlPoints.map((p, i) => dist(p, refCps[i]))),
    )
    expect(Math.min(...errs)).toBeLessThan(1e-10)
  })

  it("the 'good' solution (min rotation index) is the reference for gentle data", () => {
    const sols = phQuinticHermite(data)
    const good = sols[selectGoodSolution(sols)]
    const err = Math.max(...good.controlPoints.map((p, i) => dist(p, refCps[i])))
    expect(err).toBeLessThan(1e-10)
  })

  it('fairness measures are finite and positive on regular solutions', () => {
    for (const s of phQuinticHermite(data)) {
      if (s.minSpeed <= 1e-9) continue // cusped branch: kappa undefined, skip
      expect(Number.isFinite(s.rotationIndex)).toBe(true)
      expect(s.rotationIndex).toBeGreaterThan(0)
      expect(s.elasticEnergy).toBeGreaterThan(0)
      expect(s.arcLength).toBeGreaterThan(0)
    }
  })

  it('is rotation/scale equivariant: rotating the data rotates every solution', () => {
    const q = C(Math.cos(0.7), Math.sin(0.7)) // unit rotation
    const rot = (z: Complex): Complex => cmul(q, z)
    const rotated = { p0: rot(data.p0), d0: rot(data.d0), p1: rot(data.p1), d1: rot(data.d1) }
    const a = phQuinticHermite(data)
    const b = phQuinticHermite(rotated)
    expect(b).toHaveLength(a.length)
    // Match by mid-point after rotating solution set a.
    for (const sa of a) {
      const target = rot(curveAt(sa.generator, data.p0, 0.5))
      const best = Math.min(...b.map((sb) => dist(curveAt(sb.generator, rotated.p0, 0.5), target)))
      expect(best).toBeLessThan(1e-9)
    }
  })
})

// ---------------------------------------------------------------------------
describe('rung 2 — subset interpolation', () => {
  const refCps = controlPoints(REF, REF_P0)

  it('cpOffsets matches the control points, and L0 = 0', () => {
    const L = cpOffsets(REF)
    expect(cnorm(L[0])).toBe(0)
    for (let i = 0; i < 6; i++) {
      expect(dist(cadd(REF_P0, L[i]), refCps[i])).toBeLessThan(1e-14)
    }
  })

  it('cpOffsetDerivs matches central finite differences (the analytic Jacobian is right)', () => {
    const h = 1e-6
    const analytic = cpOffsetDerivs(REF)
    const vars: (keyof PHQuinticGenerator)[] = ['w0', 'w1', 'w2']
    for (let v = 0; v < 3; v++) {
      // Holomorphic: perturb along the REAL axis; dL/dw is then (L(w+h)-L(w-h))/2h.
      const plus = { ...REF, [vars[v]]: cadd(REF[vars[v]], C(h, 0)) } as PHQuinticGenerator
      const minus = { ...REF, [vars[v]]: csub(REF[vars[v]], C(h, 0)) } as PHQuinticGenerator
      const Lp = cpOffsets(plus)
      const Lm = cpOffsets(minus)
      for (let i = 0; i < 6; i++) {
        const fd = cscale(csub(Lp[i], Lm[i]), 1 / (2 * h))
        expect(dist(fd, analytic[i][v])).toBeLessThan(1e-7)
      }
    }
  })

  it('rejects a subset that is not a square system', () => {
    expect(() => solvePHSubset([0, 1, 5], [C(0, 0), C(1, 0), C(2, 0)])).toThrow(/exactly 4/)
    expect(() => solvePHSubset([0, 1, 1, 5], [C(0, 0), C(1, 0), C(2, 0), C(3, 0)])).toThrow(/distinct/)
    expect(() => solvePHSubset([0, 1, 4, 9], [C(0, 0), C(1, 0), C(2, 0), C(3, 0)])).toThrow(/distinct/)
  })

  it('THE ORACLE CROSS-CHECK: subset {0,1,4,5} recovers the four closed-form Hermite solutions', () => {
    const subset = [0, 1, 4, 5]
    const res = solvePHSubset(subset, subset.map((i) => refCps[i]), { starts: 400 })
    const closed = phQuinticHermite({
      p0: refCps[0],
      d0: hodographAt(REF, 0),
      p1: refCps[5],
      d1: hodographAt(REF, 1),
    })

    // Same count...
    expect(res.solutions).toHaveLength(closed.length)
    // ...and the same curves, matched by their full control polygons.
    for (const cs of closed) {
      const best = Math.min(
        ...res.solutions.map((ns) => Math.max(...ns.controlPoints.map((p, i) => dist(p, cs.controlPoints[i])))),
      )
      expect(best).toBeLessThan(1e-7)
    }
  })

  it('every found solution actually hits its prescribed control points', () => {
    for (const subset of allFourSubsets()) {
      const res = solvePHSubset(subset, subset.map((i) => refCps[i]), { starts: 120 })
      expect(res.solutions.length).toBeGreaterThan(0)
      for (const s of res.solutions) {
        expect(s.residual).toBeLessThan(1e-8)
        for (const [j, i] of subset.entries()) {
          expect(dist(s.controlPoints[i], refCps[subset[j]])).toBeLessThan(1e-8)
        }
      }
    }
  })

  it('the reference curve is recovered by EVERY subset (it is a solution of each)', () => {
    for (const subset of allFourSubsets()) {
      const res = solvePHSubset(subset, subset.map((i) => refCps[i]), { starts: 200 })
      const best = Math.min(
        ...res.solutions.map((s) => Math.max(...s.controlPoints.map((p, i) => dist(p, refCps[i])))),
      )
      expect(best, `subset ${subset}`).toBeLessThan(1e-7)
    }
  })

  it('the two TRIANGULAR subsets have a unique solution (provable, so asserted)', () => {
    // {0,1,2,3}: leg0 -> w0, leg1 -> w1, leg2 -> w2 by substitution.
    // {2,3,4,5}: leg4 -> w2, leg3 -> w1, leg2 -> w0 (the mirror).
    for (const subset of [[0, 1, 2, 3], [2, 3, 4, 5]]) {
      expect(isTriangularSubset(subset)).toBe(true)
      const res = solvePHSubset(subset, subset.map((i) => refCps[i]), { starts: 300 })
      expect(res.solutions.length, `subset ${subset}`).toBe(1)
    }
  })

  it('{1,2,3,4} is consecutive but NOT triangular: a quadratic in w1^2, so two solutions', () => {
    // No end square is isolated; w0 = 5a/w1 and w2 = 5c/w1 reduce leg2 to
    // 2*w1^4 - 15b*w1^2 + 25ac = 0. Two roots in w1^2 -> two curves.
    expect(isTriangularSubset([1, 2, 3, 4])).toBe(false)
    expect(countDirectSquares([1, 2, 3, 4])).toBe(0)
    const res = solvePHSubset([1, 2, 3, 4], [1, 2, 3, 4].map((i) => refCps[i]), { starts: 400 })
    expect(res.solutions).toHaveLength(2)
  })

  it('directSquares classifies the end-square structure', () => {
    expect(countDirectSquares([0, 1, 4, 5])).toBe(2) // Hermite: both ends pinned
    expect(countDirectSquares([0, 1, 2, 3])).toBe(1)
    expect(countDirectSquares([2, 3, 4, 5])).toBe(1)
    expect(countDirectSquares([0, 2, 3, 5])).toBe(0)
  })

  it('the 15-subset table is complete and internally consistent', () => {
    const rows = subsetTable(REF, REF_P0, { starts: 150 })
    expect(rows).toHaveLength(15)
    for (const r of rows) {
      expect(r.solutionCount).toBeGreaterThan(0)
      expect(r.certifiedRegularCount).toBeLessThanOrEqual(r.solutionCount)
      expect(r.convergenceRate).toBeGreaterThan(0)
      expect(r.directSquares).toBe(countDirectSquares(r.subset))
      expect(r.isTriangular).toBe(isTriangularSubset(r.subset))
      if (r.isTriangular) expect(r.solutionCount).toBe(1)
    }
    // The Hermite subset must show the classical 4.
    const hermite = rows.find((r) => r.subset.join() === '0,1,4,5')!
    expect(hermite.solutionCount).toBe(4)
  })

  it('REVERSAL SYMMETRY: subset S and its mirror 5-S have the same solution count', () => {
    // Reparameterising t -> 1-t maps a PH quintic to a PH quintic with the
    // generator reversed (w0 <-> w2) and control points reversed (i -> 5-i). So
    // the subset problems for S and {5-i : i in S} are the same problem relabelled
    // and MUST have equal solution counts. A provable invariant, hence asserted —
    // and a strong end-to-end check on the Newton enumeration.
    const rows = subsetTable(REF, REF_P0, { starts: 300 })
    const countOf = new Map(rows.map((r) => [r.subset.join(','), r.solutionCount]))
    for (const r of rows) {
      const mirror = r.subset.map((i) => 5 - i).sort((a, b) => a - b).join(',')
      expect(countOf.get(mirror), `${r.subset.join(',')} vs ${mirror}`).toBe(r.solutionCount)
    }
  })

  it('no subset beats the Hermite count of 4 (measured maximum over all 15)', () => {
    const rows = subsetTable(REF, REF_P0, { starts: 300 })
    expect(Math.max(...rows.map((r) => r.solutionCount))).toBe(4)
  })

  it('MEASUREMENT: print the 15-subset table (counts are lower bounds, not theorems)', () => {
    const rows = subsetTable(REF, REF_P0, { starts: 400 })
    const lines = rows.map(
      (r) =>
        `  {${r.subset.join(',')}}  n=${r.solutionCount}  regular=${r.certifiedRegularCount}` +
        `  sq=${r.directSquares}${r.isTriangular ? ' tri' : '    '}` +
        `  cond=${r.bestConditionProxy.toFixed(1).padStart(8)}` +
        `  conv=${(r.convergenceRate * 100).toFixed(0)}%`,
    )
    console.log(['', 'PH quintic: solutions per 4-of-6 prescribed control points', ...lines].join('\n'))
    // Nothing asserted about the individual counts here — this row set is the
    // experimental output. Only the two provable cases above are pinned.
    expect(rows.every((r) => r.solutionCount >= 1)).toBe(true)
  })
})
