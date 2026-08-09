// ============================================================================
// THE STRUCTURE OF THE CONFORMAL PH FAMILY — what the space of these curves actually is, in
// O(4,1) terms, and where the polynomial PH curves sit inside it. Everything here is measured;
// the derivations are in the doc comments of the functions being measured.
//
// 1. THE DEGREE LAW, AND THE ANSWER TO "CAN A POLYNOMIAL PH QUINTIC BE A CONFORMAL SEXTIC?"  No —
//    it needs conformal degree 10. The null lift of a polynomial curve is (1, p, ½‖p‖²), and the
//    ∞-coordinate is ‖p‖², so a polynomial curve of degree d lifts to conformal degree exactly 2d.
//    Exactly, not at most: the o-coordinate is the constant 1, so the five components share no
//    common factor and the degree cannot be reduced. And O(4,1) acts LINEARLY and invertibly, so
//    conformal degree is a Möbius invariant — bending cannot lower it either. Measured: the lifted
//    PH cubic is a degree-6 member to 4.1e-16 and the lifted PH quintic a degree-10 member to
//    3.4e-16, both with every weight exactly 1. So conformal 6 carries the polynomial PH CUBICS,
//    conformal 10 the quintics, and conformal 4 the quadratics — which are straight lines.
//
// 2. BENDABILITY IS A LINEAR-ALGEBRA TEST, and an invariant one. p is a Möbius image of a
//    polynomial curve iff some null S has ⟨P(t),S⟩ ≡ constant — S is the point that gets sent to
//    infinity, and constant means the curve never reaches it. Constant in Bernstein form means all
//    coefficients equal, i.e. S ⊥ every difference Cᵢ − Cᵢ₊₁. So: take the orthogonal complement of
//    the n differences and ask whether it contains a NULL vector. At degree n ≥ 5 the complement is
//    generically ZERO and no test is needed; at degree 4 it is a line and one scalar decides.
//    Measured: the lifted polynomials give ⟨S,S⟩ = 0 EXACTLY (the control experiment — they are
//    polynomials), the generic degree-4 member gives 2.0e-3, and the generic degree-6 member has no
//    kernel at all. This is slide 13's "nothing here can be made by bending", verified invariantly
//    rather than through the degree count.
//
// 3. THE CARRIER SPHERE stratifies the family. rank of span{Cₖ} in R^{4,1} is 5 for a curve on no
//    sphere, 4 on a sphere or plane, 3 on a circle or line — and since O(4,1) acts linearly the rank
//    is a Möbius invariant, so this stratification is conformally intrinsic. Measured 5 for every
//    member tried, including the lifted PH cubic: PH cubics are NOT planar here, which is why no
//    Tschirnhausen claim is made.
//
// 4. THE MODULI COUNT. The gauge group is 12-dimensional: 10 for O(4,1), one for the projective
//    scale, one for the wₖ ↦ λᵏwₖ reparametrisation. All 12 are verified to lie in the tangent space
//    to 1.8e-12 (the reparametrisation direction is differenced from the exact closed-form map;
//    writing δh by hand left it 1.2e-3 out, since h is stored one degree above its true one). With
//    the family 2n+5 dimensional, the curves modulo Möbius AND reparametrisation number
//
//        2n + 5 − 12  =  2n − 7        1 at degree 4, 5 at degree 6, 13 at degree 10.
//
// 5. A RANK DEFECT THE SOLVERS SHOULD KNOW ABOUT. The constraint Jacobian has nullity 2n+6, one MORE
//    than the family's dimension, at every member and always in the same direction. The reason: the
//    top PH condition is n²⟨Aₙ,Aₙ⟩ = (h's leading coefficient)², and nullity has already forced
//    ⟨Aₙ,Aₙ⟩ = 0, so it reads h_top² = 0 — a SQUARED equation, whose gradient vanishes on its own
//    zero set. Measured: h's leading power-basis coefficient is 6e-14 of its largest, and the
//    Jacobian rank is 15 of 16 rows at degree 4, 23 of 24 at degree 6, with a 3.7e+9 gap. So the
//    variety is 2n+5 dimensional while its linearisation admits one extra direction that leaves it
//    at second order. Any corrector that least-squares through this Jacobian is working with a
//    structurally rank-deficient matrix — the first place to look when a continuation stalls.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Conformal,
  bivectorGenerator,
  conformalLiftBezier,
  innerProduct,
} from '../conformal'
import { type Quat } from '../quaternion'
import { controlPoints as phControlPoints, squareWeights, type SpatialPHCurve } from '../phSpatialFreeDragN'
import {
  type ConformalPHCurve,
  controlPoints,
  definingJacobian,
  degreeOf,
  curveAt,
  farinParameters,
  findMember,
  freeRadiusIndices,
  radii,
  speedAt,
  hermiteDataOf,
  lambdaForFirstBead,
  pack,
  reparametrise,
  unpack,
  residual,
  weights,
} from '../conformalPHCurve'
import { bernsteinToPower } from '../conformalPHHopf'

// --- little linear algebra -------------------------------------------------
/**
 * One-sided Jacobi on the matrix itself — never on JᵀJ, which squares the condition number and is
 * exactly how a rank reading goes wrong here. The rotations are accumulated into V so the null
 * RIGHT singular vectors come out at full accuracy too; an earlier Kaczmarz projection for that
 * vector stalled at 1e-3 and made a null vector look non-null.
 */
function svd(a: readonly (readonly number[])[]): { sv: number[]; V: number[][] } {
  const m = a.length, n = a[0].length
  const B = a.map((r) => [...r])
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        let app = 0, aqq = 0, apq = 0
        for (let i = 0; i < m; i++) { app += B[i][p] ** 2; aqq += B[i][q] ** 2; apq += B[i][p] * B[i][q] }
        if (Math.abs(apq) < 1e-300) continue
        off = Math.max(off, Math.abs(apq) / Math.sqrt(app * aqq || 1))
        const tau = (aqq - app) / (2 * apq)
        const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
        const c = 1 / Math.sqrt(1 + t * t), s2 = c * t
        for (let i = 0; i < m; i++) {
          const x = B[i][p], y = B[i][q]
          B[i][p] = c * x - s2 * y
          B[i][q] = s2 * x + c * y
        }
        for (let i = 0; i < n; i++) {
          const x = V[i][p], y = V[i][q]
          V[i][p] = c * x - s2 * y
          V[i][q] = s2 * x + c * y
        }
      }
    }
    if (off < 1e-15) break
  }
  const norms = Array.from({ length: n }, (_, j) => Math.hypot(...B.map((r) => r[j])))
  const order = Array.from({ length: n }, (_, j) => j).sort((x, y) => norms[y] - norms[x])
  return {
    sv: order.map((j) => norms[j]),
    V: order.map((j) => V.map((row) => row[j])),
  }
}

const singularValues = (a: readonly (readonly number[])[]): number[] => svd(a).sv

/**
 * Rank from the LARGEST RELATIVE GAP in the spectrum — never a tolerance on the values
 * themselves. The one number that IS allowed here is the machine-precision zero level,
 * σ₁·ε·dim, used only as the floor a full-rank matrix is compared against; without it the
 * "gap" below the last singular value is a division by a sentinel and always wins.
 */
function rankFromGap(sv: readonly number[], rows: number): { rank: number; gap: number } {
  const floor = sv[0] * 2.2e-16 * Math.max(rows, sv.length)
  let best = 0, at = sv.length
  for (let k = 1; k <= sv.length; k++) {
    const below = k < sv.length ? Math.max(sv[k], floor) : floor
    const ratio = sv[k - 1] / Math.max(below, 1e-300)
    if (ratio > best) { best = ratio; at = k }
  }
  return { rank: at, gap: best }
}

const METRIC_ROW = (d: Conformal): number[] => [-d[4], d[1], d[2], d[3], -d[0]]

// --- polynomial PH curves, lifted -----------------------------------------
const dot4 = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q

/** σ = |A|² in the Bernstein basis of degree 2m — the parametric speed of a polynomial PH curve. */
function speedPolynomial(A: readonly Quat[]): number[] {
  const m = A.length - 1
  const W = squareWeights(m)
  return Array.from({ length: 2 * m + 1 }, (_, j) => {
    let acc = 0
    for (let a = Math.max(0, j - m); a <= Math.min(m, j); a++) acc += W[j][a] * dot4(A[a], A[j - a])
    return acc
  })
}

function elevate(b: readonly number[], to: number): number[] {
  let cur = [...b]
  while (cur.length - 1 < to) {
    const n = cur.length - 1
    cur = Array.from({ length: n + 2 }, (_, i) => {
      const lo = i > 0 ? (i / (n + 1)) * cur[i - 1] : 0
      const hi = i <= n ? (1 - i / (n + 1)) * cur[i] : 0
      return lo + hi
    })
  }
  return cur
}

/** The conformal member of degree 2d carrying a polynomial PH curve of degree d. */
function liftPolynomialPH(A: readonly Quat[]): ConformalPHCurve {
  const cps = phControlPoints({ A, p0: { x: 0, y: 0, z: 0 } } as SpatialPHCurve)
  const C = conformalLiftBezier(cps)
  const n = C.length - 1
  return { C, h: elevate(speedPolynomial(A), n - 1) }
}

const CUBIC: Quat[] = [
  { u: 1, v: 0.3, p: 0.1, q: 0 },
  { u: 0.8, v: 0, p: 0.25, q: 0.4 },
]
const QUINTIC: Quat[] = [
  { u: 1, v: 0.3, p: 0.1, q: 0 },
  { u: 0.8, v: 0, p: 0, q: 0.2 },
  { u: 1.1, v: 0.2, p: -0.4, q: 0 },
]

const worst = (s: ConformalPHCurve): number => Math.max(...residual(s).map(Math.abs))
const scaleOf = (s: ConformalPHCurve): number => Math.max(...pack(s).map(Math.abs))
/**
 * Every defining condition is QUADRATIC in the coefficients, so the honest relative measure divides
 * by the scale SQUARED. Dividing by one power reads 1e-8 at lambda = 60 purely because lambda^n has
 * multiplied the coefficients by 1e7 — an artefact of the normalisation, not a departure.
 */
const relResidual = (s: ConformalPHCurve): number => worst(s) / scaleOf(s) ** 2

/** Rank of span{Cₖ} in R^{4,1}: 5 = on no sphere, 4 = on a sphere or plane, 3 = on a circle. */
function carrier(s: ConformalPHCurve): { rank: number; gap: number } {
  return rankFromGap(singularValues(s.C.map((c) => [...c])), s.C.length)
}

/**
 * Bendability, invariantly. p is a Möbius image of a POLYNOMIAL curve iff some null S has
 * ⟨P(t),S⟩ ≡ const — that S is the point sent to infinity. Constant means every Bernstein
 * coefficient is equal, i.e. S ⊥ every difference Cᵢ − Cᵢ₊₁. So: take the orthogonal complement
 * of the differences and ask whether it contains a NULL vector.
 */
function bendability(s: ConformalPHCurve): { kernelDim: number; nullDefect: number } {
  const n = degreeOf(s)
  const rows = Array.from({ length: n }, (_, i) =>
    METRIC_ROW(s.C[i].map((v, k) => v - s.C[i + 1][k]) as unknown as Conformal),
  )
  const { sv, V } = svd(rows)
  const kernelDim = 5 - rankFromGap(sv, rows.length).rank
  if (kernelDim <= 0) return { kernelDim, nullDefect: NaN }
  // The last right singular vector spans the kernel (kernelDim is 1 in every case measured).
  const S = V[V.length - 1]
  const nrm = Math.hypot(...S)
  const V0 = S.map((v) => v / nrm) as unknown as Conformal
  return { kernelDim, nullDefect: innerProduct(V0, V0) }
}

/** The 12 directions that change nothing geometric: 10 Möbius + reparametrisation + scale. */
function gaugeDirections(s: ConformalPHCurve): number[][] {
  const out: number[][] = []
  const basis: Conformal[] = [
    [1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1],
  ]
  for (let a = 0; a < 5; a++) {
    for (let b = a + 1; b < 5; b++) {
      const G = bivectorGenerator(basis[a], basis[b])
      out.push([
        ...s.C.flatMap((c) => G.map((row) => row.reduce((acc, v, i) => acc + v * c[i], 0))),
        ...s.h.map(() => 0),
      ])
    }
  }
  // The reparametrisation direction, differenced from the EXACT closed-form map rather than written
  // out by hand: δCₖ = k·Cₖ is easy, but δh is not (h is stored one degree above its true one), and
  // a hand-written δh left these directions only 1.2e-3 inside the tangent instead of at machine
  // zero. Taking the derivative of the map that is verified exact removes the guesswork.
  const eps = 1e-6
  const up = pack(reparametrise(s, 1 + eps)), down = pack(reparametrise(s, 1 - eps))
  out.push(up.map((v, i) => (v - down[i]) / (2 * eps)))
  // overall projective scale
  out.push([...s.C.flatMap((c) => c.map((v) => v)), ...s.h])
  return out
}

describe('the space of conformal PH curves', () => {
  it('the exact parameter gauge: same curve, no solver, no stall', () => {
    const s = findMember(4, { irreducible: true, minCurvatureSpread: 0.3, minWeightRatio: 0.15 })!
    const ref = Array.from({ length: 401 }, (_, k) => curveAt(s, k / 400)!)
    const extent = Math.max(...ref.map((p) => Math.hypot(p.x, p.y, p.z)))
    for (const target of [0.1, 0.3, 0.7, 0.9]) {
      const lambda = lambdaForFirstBead(s, target)!
      const t = reparametrise(s, lambda)
      const drift = Math.max(
        ...Array.from({ length: 121 }, (_, k) => {
          const p = curveAt(t, k / 120)!
          return Math.min(...ref.map((q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)))
        }),
      )
      const cpMove = Math.max(
        ...controlPoints(t).map((p, i) => {
          const q = controlPoints(s)[i]
          return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)
        }),
      )
      console.log(
        `dial ${target}: lambda ${lambda.toFixed(4)}  bead lands ${farinParameters(t)[0].toFixed(6)}` +
          `  residual ${relResidual(t).toExponential(1)}` +
          `  control points move ${(cpMove / extent).toExponential(1)}` +
          `  image drift ${(drift / extent).toExponential(1)}`,
      )
      expect(farinParameters(t)[0], 'the dial lands exactly').toBeCloseTo(target, 12)
      expect(relResidual(t), 'still on the family').toBeLessThan(1e-9)
      expect(cpMove / extent, 'no control point moves').toBeLessThan(1e-12)
      expect(drift / extent, 'the same set of points').toBeLessThan(5e-3)
    }
  }, 60_000)

  it('polynomial PH curves land at conformal degree 2d, and nowhere lower', () => {
    for (const [name, A] of [['cubic', CUBIC], ['quintic', QUINTIC]] as const) {
      const s = liftPolynomialPH(A)
      const d = (A.length - 1) * 2 + 1
      const c = carrier(s)
      const bend = bendability(s)
      console.log(
        `polynomial PH ${name} (degree ${d}) -> conformal degree ${degreeOf(s)}\n` +
          `    on the family      ${relResidual(s).toExponential(1)}\n` +
          `    weights constant   ${Math.max(...weights(s).map((w) => Math.abs(w - 1))).toExponential(1)}` +
          `   (so no common factor: minimal degree IS ${degreeOf(s)})\n` +
          `    carrier rank       ${c.rank} of 5 (gap ${c.gap.toExponential(1)})` +
          `   ${c.rank <= 4 ? '<- lies on a sphere or plane' : '<- on no sphere'}\n` +
          `    bendable?          kernel dim ${bend.kernelDim}, ⟨S,S⟩ = ${bend.nullDefect.toExponential(1)}` +
          `   ${Math.abs(bend.nullDefect) < 1e-9 ? '<- NULL: yes, a bent polynomial' : '<- not null'}`,
      )
      expect(relResidual(s), `${name} is a member`).toBeLessThan(1e-9)
      expect(degreeOf(s), `${name} lifts to 2d`).toBe(2 * d)
    }
  }, 60_000)

  it('pinning the C1 Hermite data is a gauge slice: what is left is 2n-7', () => {
    for (const n of [4, 5, 6]) {
      const s = findMember(n, {
        irreducible: true,
        minOutOfPlane: 0.03,
        minCurvatureSpread: 0.3,
        minRadiusRatio: 0.05,
        minWeightRatio: 0.15,
        minSpanRatio: 0.3,
      })
      if (!s) { console.log(`degree ${n}: no member`); continue }
      const x = pack(s)
      const flat = (d: ReturnType<typeof hermiteDataOf>): number[] => [
        d.p0.x, d.p0.y, d.p0.z, d.p1.x, d.p1.y, d.p1.z,
        d.d0.x, d.d0.y, d.d0.z, d.d1.x, d.d1.y, d.d1.z,
      ]
      // The 12 Hermite rows, finite-differenced: they are ratios of the unknowns, not linear in them.
      const step = 1e-6
      const hermiteRows: number[][] = Array.from({ length: 12 }, () => new Array(x.length).fill(0))
      for (let j = 0; j < x.length; j++) {
        const up = flat(hermiteDataOf(unpack(x.map((v, i) => (i === j ? v + step : v)))))
        const dn = flat(hermiteDataOf(unpack(x.map((v, i) => (i === j ? v - step : v)))))
        for (let r = 0; r < 12; r++) hermiteRows[r][j] = (up[r] - dn[r]) / (2 * step)
      }
      const scaleRow = (row: number[]): number[] => {
        const m = Math.hypot(...row) || 1
        return row.map((v) => v / m)
      }
      const J = definingJacobian(s).map(scaleRow)
      const withPins = [...J, ...hermiteRows.map(scaleRow)]
      const sv = singularValues(withPins)
      const { rank, gap } = rankFromGap(sv, withPins.length)
      const raw = x.length - rank
      const free = freeRadiusIndices(s)
      console.log(
        `degree ${n}: ${withPins.length} rows (${J.length} defining + 12 Hermite), rank ${rank}` +
          ` (gap ${gap.toExponential(1)}) -> nullity ${raw}\n` +
          `    minus the one spurious direction (h_top squared): ${raw - 1}   [2n-7 = ${2 * n - 7}]\n` +
          `    free radii ${free.length} (indices ${free.join(',')}) + arc length = ${free.length + 1} coordinates`,
      )
      expect(raw - 1, `degree ${n} Hermite slice`).toBe(2 * n - 7)

      // Are the candidate DIALS actual coordinates on that slice? The free radii plus the arc
      // length of each half. Total length alone gives only free.length + 1, which is one short at
      // degree 6 — splitting the length in two is the cheapest honest fifth dial, and it is legal
      // because the Hermite data pins the parametrisation (d0 = n(w1/w0)(P1-P0) fixes lambda), so
      // arc length over a parameter subinterval is well defined.
      const dials = (c: ConformalPHCurve): number[] => {
        const r = radii(c)
        const half = (a: number, b: number): number => {
          let acc = 0
          for (let k = 0; k < 24; k++) acc += Math.abs(speedAt(c, a + ((k + 0.5) / 24) * (b - a))) * (b - a) / 24
          return acc
        }
        return [...free.map((i) => r[i]), half(0, 0.5), half(0.5, 1)]
      }
      const base = dials(s)
      const dialRows = base.map((_, r) =>
        x.map((_v, j) => {
          const up = dials(unpack(x.map((v, i) => (i === j ? v + step : v))))
          const dn = dials(unpack(x.map((v, i) => (i === j ? v - step : v))))
          return (up[r] - dn[r]) / (2 * step)
        }),
      )
      // Restrict to the slice: rank of the dial gradients TOGETHER with the constraint rows tells
      // how many independent directions along the slice they actually see.
      const together = [...withPins, ...dialRows.map(scaleRow)]
      const jointRank = rankFromGap(singularValues(together), together.length).rank
      console.log(
        `    dials: ${base.length} candidates (${free.length} radii + 2 half-lengths) ->` +
          ` they pin ${jointRank - rank} of the ${raw - 1} slice directions`,
      )
    }
  }, 180_000)

  it('the strata and the moduli count, at degree 4 and degree 6', () => {
    for (const n of [4, 6]) {
      const s = findMember(n, {
        irreducible: true,
        minOutOfPlane: 0.03,
        minCurvatureSpread: 0.3,
        minRadiusRatio: 0.05,
        minWeightRatio: 0.15,
        minSpanRatio: 0.3,
      })
      if (!s) { console.log(`degree ${n}: no member`); continue }
      const J = definingJacobian(s)
      const sv = singularValues(J)
      const tangent = rankFromGap(sv, J.length)
      console.log(
        `degree ${n}: J is ${J.length} x ${J[0].length}; spectrum\n      ` +
          sv.map((v, i) => `${i}:${v.toExponential(1)}`).join('  '),
      )
      const dim = pack(s).length - tangent.rank
      const G = gaugeDirections(s)
      const gr = rankFromGap(singularValues(G), G.length)
      const inTangent = Math.max(
        ...G.map((g) => {
          const nrm = Math.hypot(...g) || 1
          return Math.max(
            ...J.map((row) => {
              const rn = Math.hypot(...row) || 1
              return Math.abs(row.reduce((a, v, i) => a + v * g[i], 0)) / (nrm * rn)
            }),
          )
        }),
      )
      const c = carrier(s)
      const bend = bendability(s)
      const hPower = bernsteinToPower(s.h as number[])
      const hTop = Math.abs(hPower[hPower.length - 1]) / Math.max(...hPower.map(Math.abs))
      console.log(
        `    h: leading power coefficient / largest = ${hTop.toExponential(1)}` +
          `   (deg h = n-2, not n-1 -> the top PH row has a VANISHING gradient)\n` +
        `degree ${n}: unknowns ${pack(s).length}, J rank ${tangent.rank} (gap ${tangent.gap.toExponential(1)})` +
          ` -> tangent dim ${dim}   [2n+5 = ${2 * n + 5}]\n` +
          `    gauge+Möbius rank  ${gr.rank} of 12 (gap ${gr.gap.toExponential(1)}), all inside the tangent to ${inTangent.toExponential(1)}\n` +
          `    MODULI up to Möbius and reparametrisation: ${dim} - ${gr.rank} = ${dim - gr.rank}   [2n-7 = ${2 * n - 7}]\n` +
          `    carrier rank       ${c.rank} of 5 (gap ${c.gap.toExponential(1)})\n` +
          `    bendable?          kernel dim ${bend.kernelDim}, ⟨S,S⟩ = ${bend.nullDefect.toExponential(1)}`,
      )
    }
  }, 120_000)
})
