// ============================================================================
// Exact analytic Newton Hessian of the curvature-extrema numerator g for an OPEN
// planar B-spline drag. The interior-point barrier needs Σ_k w_k ∇²c_k to take a
// full-Newton step (vs Gauss-Newton, which drops the constraint-curvature term and
// so tracks the cursor worse + overshoots the bound near a binding constraint).
//
// Rather than hand-transcribe the second-derivative block formulas, we run the
// SAME g formula (gOverJets, identical to gradient.ts gOverDuals) over a second-
// order forward-AD type Jet2 = value + two first tangents + one cross term. Seeding
// the two tangent channels with the Dirac basis derivatives of control points i and
// j gives result.h = ∂²g/∂(cp_i)∂(cp_j) exactly — guaranteed consistent with g and
// the first-order gradient. B-spline locality keeps it O(n·d²): only |i−j| ≤ degree
// pairs and only their shared support spans are touched. Matches ne-core's
// polynomial_g_hessian_seeded (interior_point.rs exact-Hessian path); we use AD where
// Rust uses explicit seeded formulas — same result.
// ============================================================================

import { BernsteinDecomposition, decomposeToBernstein } from './bernstein'
import { type OpenSeeds, precomputeOpenSeeds } from './gradient'

/** Second-order forward-AD over Bernstein polynomials: value v, tangents along two
 *  independent seed directions (tA, tB), and the second-order cross term h = ∂²/∂a∂b. */
class Jet2 {
  constructor(
    readonly v: BernsteinDecomposition,
    readonly tA: BernsteinDecomposition,
    readonly tB: BernsteinDecomposition,
    readonly h: BernsteinDecomposition,
  ) {}
  add(o: Jet2): Jet2 {
    return new Jet2(this.v.add(o.v), this.tA.add(o.tA), this.tB.add(o.tB), this.h.add(o.h))
  }
  sub(o: Jet2): Jet2 {
    return new Jet2(this.v.subtract(o.v), this.tA.subtract(o.tA), this.tB.subtract(o.tB), this.h.subtract(o.h))
  }
  mul(o: Jet2): Jet2 {
    // (fg)   = f·g
    // (fg)_A = f·g_A + f_A·g
    // (fg)_B = f·g_B + f_B·g
    // (fg)_AB= f·g_AB + f_A·g_B + f_B·g_A + f_AB·g
    const v = this.v.multiply(o.v)
    const tA = this.v.multiply(o.tA).add(this.tA.multiply(o.v))
    const tB = this.v.multiply(o.tB).add(this.tB.multiply(o.v))
    const h = this.v.multiply(o.h)
      .add(this.tA.multiply(o.tB))
      .add(this.tB.multiply(o.tA))
      .add(this.h.multiply(o.v))
    return new Jet2(v, tA, tB, h)
  }
  scale(s: number): Jet2 {
    return new Jet2(this.v.scale(s), this.tA.scale(s), this.tB.scale(s), this.h.scale(s))
  }
}

/** g = ‖c′‖²(c′×c‴) − 3(c′·c″)(c′×c″) — byte-for-byte the same chain as gradient.ts. */
function gOverJets(x1: Jet2, y1: Jet2, x2: Jet2, y2: Jet2, x3: Jet2, y3: Jet2): Jet2 {
  const cross1 = x1.mul(y2).sub(y1.mul(x2))
  const dot = x1.mul(x2).add(y1.mul(y2))
  const cross2 = x1.mul(y3).sub(y1.mul(x3))
  const normSq = x1.mul(x1).add(y1.mul(y1))
  return normSq.mul(cross2).sub(dot.mul(cross1).scale(3))
}

const zeroLike = (bd: BernsteinDecomposition): BernsteinDecomposition =>
  new BernsteinDecomposition(bd.coeffs.map((span) => span.map(() => 0)), bd.breaks)

/** A zero polynomial on `ref`'s spans but at per-span degree `deg` (deg+1 coeffs). */
const zeroAtDegree = (ref: BernsteinDecomposition, deg: number): BernsteinDecomposition =>
  new BernsteinDecomposition(ref.coeffs.map(() => new Array<number>(deg + 1).fill(0)), ref.breaks)

/**
 * Reference (oracle) weighted Hessian via Jet2 second-order AD: runs the full g chain
 * per control-point pair. Correct but O(n·d·|gchain|) with heavy allocation — kept as
 * the test oracle for the fast explicit version below.
 */
export function curvatureExtremaHessianPlanarWeightedAD(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
  wFlat: readonly number[],
  seeds: OpenSeeds = precomputeOpenSeeds(knots, degree, x.length),
): number[][] {
  const n = x.length
  const X1 = decomposeToBernstein(x, knots, degree).derivative()
  const Y1 = decomposeToBernstein(y, knots, degree).derivative()
  const X2 = X1.derivative()
  const Y2 = Y1.derivative()
  const X3 = X2.derivative()
  const Y3 = Y2.derivative()

  // g's flat layout (stride) — built once from the value chain.
  const gVal = gOverJets(
    new Jet2(X1, zeroLike(X1), zeroLike(X1), zeroLike(X1)),
    new Jet2(Y1, zeroLike(Y1), zeroLike(Y1), zeroLike(Y1)),
    new Jet2(X2, zeroLike(X2), zeroLike(X2), zeroLike(X2)),
    new Jet2(Y2, zeroLike(Y2), zeroLike(Y2), zeroLike(Y2)),
    new Jet2(X3, zeroLike(X3), zeroLike(X3), zeroLike(X3)),
    new Jet2(Y3, zeroLike(Y3), zeroLike(Y3), zeroLike(Y3)),
  ).v
  const gDeg = gVal.degree
  const stride = gDeg + 1

  const H: number[][] = Array.from({ length: 2 * n }, () => new Array<number>(2 * n).fill(0))

  // Contract a block (BernsteinDecomposition on global spans [a, a+block.numSpans))
  // with wFlat, returning the scalar Σ_flat wFlat·coeff. Block is elevated to gDeg so
  // its per-span coefficients align 1:1 with g's flat layout.
  const contract = (block: BernsteinDecomposition, a: number): number => {
    const b = block.add(zeroAtDegree(block, gDeg)) // ensure per-span degree == gDeg
    let acc = 0
    for (let ls = 0; ls < b.numSpans; ls++) {
      const base = (a + ls) * stride
      const row = b.coeffs[ls]
      for (let l = 0; l < row.length; l++) {
        const w = wFlat[base + l]
        if (w !== 0) acc += w * row[l]
      }
    }
    return acc
  }

  const zJ = (bd: BernsteinDecomposition) => zeroLike(bd)

  for (let i = 0; i < n; i++) {
    const si = seeds.cols[i]
    if (si.s0 < 0) continue
    const jLo = Math.max(0, i - degree)
    const jHi = Math.min(n - 1, i + degree)
    for (let j = jLo; j <= jHi; j++) {
      const sj = seeds.cols[j]
      if (sj.s0 < 0) continue
      const a = Math.max(si.s0, sj.s0)
      const bEnd = Math.min(si.s1, sj.s1)
      if (a >= bEnd) continue // disjoint support → no Hessian coupling

      // Curve derivatives + each CP's basis derivatives, restricted to the shared spans.
      const x1 = X1.subset(a, bEnd), y1 = Y1.subset(a, bEnd)
      const x2 = X2.subset(a, bEnd), y2 = Y2.subset(a, bEnd)
      const x3 = X3.subset(a, bEnd), y3 = Y3.subset(a, bEnd)
      const Ni1 = si.n1.subset(a - si.s0, bEnd - si.s0)
      const Ni2 = si.n2.subset(a - si.s0, bEnd - si.s0)
      const Ni3 = si.n3.subset(a - si.s0, bEnd - si.s0)
      const Nj1 = sj.n1.subset(a - sj.s0, bEnd - sj.s0)
      const Nj2 = sj.n2.subset(a - sj.s0, bEnd - sj.s0)
      const Nj3 = sj.n3.subset(a - sj.s0, bEnd - sj.s0)
      const z1 = zJ(x1), z2 = zJ(x2), z3 = zJ(x3)

      // ∂²g/∂y_i∂x_j : tangent A on y_i, tangent B on x_j. Computed for ALL (i,j).
      const hxy = gOverJets(
        new Jet2(x1, z1, Nj1, z1),
        new Jet2(y1, Ni1, z1, z1),
        new Jet2(x2, z2, Nj2, z2),
        new Jet2(y2, Ni2, z2, z2),
        new Jet2(x3, z3, Nj3, z3),
        new Jet2(y3, Ni3, z3, z3),
      ).h
      const vxy = contract(hxy, a)
      H[n + i][j] += vxy
      H[j][n + i] += vxy

      if (j <= i) {
        // ∂²g/∂x_i∂x_j : tangent A on x_i, tangent B on x_j.
        const hxx = gOverJets(
          new Jet2(x1, Ni1, Nj1, z1),
          new Jet2(y1, z1, z1, z1),
          new Jet2(x2, Ni2, Nj2, z2),
          new Jet2(y2, z2, z2, z2),
          new Jet2(x3, Ni3, Nj3, z3),
          new Jet2(y3, z3, z3, z3),
        ).h
        // ∂²g/∂y_i∂y_j : tangent A on y_i, tangent B on y_j.
        const hyy = gOverJets(
          new Jet2(x1, z1, z1, z1),
          new Jet2(y1, Ni1, Nj1, z1),
          new Jet2(x2, z2, z2, z2),
          new Jet2(y2, Ni2, Nj2, z2),
          new Jet2(x3, z3, z3, z3),
          new Jet2(y3, Ni3, Nj3, z3),
        ).h
        const vxx = contract(hxx, a)
        const vyy = contract(hyy, a)
        H[i][j] += vxx
        H[n + i][n + j] += vyy
        if (j < i) {
          H[j][i] += vxx
          H[n + j][n + i] += vyy
        }
      }
    }
  }
  return H
}

const BD = BernsteinDecomposition

/**
 * Weighted sum of curvature-numerator Hessians H = Σ_flat wFlat[flat]·∇²(g_flat),
 * returned as a dense 2n×2n matrix in BLOCK variable order [x₀..x_{n-1}, y₀..y_{n-1}]
 * (x_i → row/col i, y_i → n+i). `wFlat` is indexed by g's flat Bernstein-coefficient
 * layout (span·(gDeg+1)+local). Open planar B-splines only.
 *
 * FAST explicit assembly (ne-core polynomial_g_hessian): the per-control-point first
 * derivatives of A=‖c′‖², B=c′×c‴, C=c′·c″, D=c′×c″ are computed ONCE per CP, then the
 * second-derivative blocks ∂²g/∂cp_i∂cp_j are combined per pair from those pieces —
 * O(n·d²), no per-pair g rebuild. Validated against the Jet2 AD oracle above + FD.
 *   g = A·B − 3·C·D ⇒ (product rule twice):
 *   hxx = A_ij·B + 2(a5xᵢ·b67xⱼ+a5xⱼ·b67xᵢ) − 3·C_ij·D − 3(c89xᵢ·d1011xⱼ+c89xⱼ·d1011xᵢ)
 *   hyy = (same with y pieces; A_ij,C_ij are channel-independent)
 *   hxy = 2(a5yᵢ·b67xⱼ+a5xⱼ·b67yᵢ) − A·Dh67 − 3(c89yᵢ·d1011xⱼ+c89xⱼ·d1011yᵢ) + 3·C·Dh1011
 */
export function curvatureExtremaHessianPlanarWeighted(
  x: readonly number[],
  y: readonly number[],
  knots: readonly number[],
  degree: number,
  wFlat: readonly number[],
  seeds: OpenSeeds = precomputeOpenSeeds(knots, degree, x.length),
): number[][] {
  const n = x.length
  const X1 = decomposeToBernstein(x, knots, degree).derivative()
  const Y1 = decomposeToBernstein(y, knots, degree).derivative()
  const X2 = X1.derivative(), Y2 = Y1.derivative()
  const X3 = X2.derivative(), Y3 = Y2.derivative()

  // A=‖c′‖², B=c′×c‴, C=c′·c″, D=c′×c″ (full domain) + g's flat stride.
  const A = X1.multiply(X1).add(Y1.multiply(Y1))
  const B = X1.multiply(Y3).subtract(Y1.multiply(X3))
  const C = X1.multiply(X2).add(Y1.multiply(Y2))
  const D = X1.multiply(Y2).subtract(Y1.multiply(X2))
  const gDeg = A.multiply(B).degree
  const stride = gDeg + 1

  // Per-CP first-derivative pieces of A,B,C,D on the CP's own support [s0,s1).
  type Pieces = { s0: number; s1: number; a5x: BernsteinDecomposition; a5y: BernsteinDecomposition; b67x: BernsteinDecomposition; b67y: BernsteinDecomposition; c89x: BernsteinDecomposition; c89y: BernsteinDecomposition; d1011x: BernsteinDecomposition; d1011y: BernsteinDecomposition }
  const P: (Pieces | null)[] = []
  for (let i = 0; i < n; i++) {
    const sd = seeds.cols[i]
    if (sd.s0 < 0) { P.push(null); continue }
    const { s0, s1, n1, n2, n3 } = sd
    const x1 = X1.subset(s0, s1), y1 = Y1.subset(s0, s1)
    const x2 = X2.subset(s0, s1), y2 = Y2.subset(s0, s1)
    const x3 = X3.subset(s0, s1), y3 = Y3.subset(s0, s1)
    P.push({
      s0, s1,
      a5x: n1.multiply(x1), a5y: n1.multiply(y1),
      b67x: n1.multiply(y3).subtract(y1.multiply(n3)), b67y: x1.multiply(n3).subtract(n1.multiply(x3)),
      c89x: n1.multiply(x2).add(x1.multiply(n2)), c89y: n1.multiply(y2).add(y1.multiply(n2)),
      d1011x: n1.multiply(y2).subtract(y1.multiply(n2)), d1011y: x1.multiply(n2).subtract(n1.multiply(x2)),
    })
  }

  const H: number[][] = Array.from({ length: 2 * n }, () => new Array<number>(2 * n).fill(0))
  // Contract a block on global spans [a, a+block.numSpans) with wFlat (elevate to gDeg).
  const zeroAtG = (ref: BernsteinDecomposition) => new BD(ref.coeffs.map(() => new Array<number>(stride).fill(0)), ref.breaks)
  const contract = (block: BernsteinDecomposition, a: number): number => {
    const b = block.add(zeroAtG(block))
    let acc = 0
    for (let ls = 0; ls < b.numSpans; ls++) {
      const base = (a + ls) * stride, row = b.coeffs[ls]
      for (let l = 0; l < row.length; l++) { const w = wFlat[base + l]; if (w !== 0) acc += w * row[l] }
    }
    return acc
  }
  const sub = (bd: BernsteinDecomposition, p: Pieces, a: number, bEnd: number) => bd.subset(a - p.s0, bEnd - p.s0)

  for (let i = 0; i < n; i++) {
    const pi = P[i]
    if (!pi) continue
    const jHi = Math.min(n - 1, i + degree)
    for (let j = Math.max(0, i - degree); j <= jHi; j++) {
      const pj = P[j]
      if (!pj) continue
      const a = Math.max(pi.s0, pj.s0), bEnd = Math.min(pi.s1, pj.s1)
      if (a >= bEnd) continue

      const sd_i = seeds.cols[i], sd_j = seeds.cols[j]
      const n1i = sd_i.n1.subset(a - sd_i.s0, bEnd - sd_i.s0)
      const n2i = sd_i.n2.subset(a - sd_i.s0, bEnd - sd_i.s0)
      const n3i = sd_i.n3.subset(a - sd_i.s0, bEnd - sd_i.s0)
      const n1j = sd_j.n1.subset(a - sd_j.s0, bEnd - sd_j.s0)
      const n2j = sd_j.n2.subset(a - sd_j.s0, bEnd - sd_j.s0)
      const n3j = sd_j.n3.subset(a - sd_j.s0, bEnd - sd_j.s0)
      const Bs = B.subset(a, bEnd), Ds = D.subset(a, bEnd), As = A.subset(a, bEnd), Cs = C.subset(a, bEnd)

      // i & j pieces on the shared range.
      const a5xi = sub(pi.a5x, pi, a, bEnd), a5yi = sub(pi.a5y, pi, a, bEnd)
      const b67xi = sub(pi.b67x, pi, a, bEnd), b67yi = sub(pi.b67y, pi, a, bEnd)
      const c89xi = sub(pi.c89x, pi, a, bEnd), c89yi = sub(pi.c89y, pi, a, bEnd)
      const d1011xi = sub(pi.d1011x, pi, a, bEnd), d1011yi = sub(pi.d1011y, pi, a, bEnd)
      const a5xj = sub(pj.a5x, pj, a, bEnd), a5yj = sub(pj.a5y, pj, a, bEnd)
      const b67xj = sub(pj.b67x, pj, a, bEnd), b67yj = sub(pj.b67y, pj, a, bEnd)
      const c89xj = sub(pj.c89x, pj, a, bEnd), c89yj = sub(pj.c89y, pj, a, bEnd)
      const d1011xj = sub(pj.d1011x, pj, a, bEnd), d1011yj = sub(pj.d1011y, pj, a, bEnd)

      // Second-order seed pieces (channel-independent A_ij,C_ij; mixed Dh67,Dh1011).
      const aij = n1i.multiply(n1j).scale(2)
      const cij = n1i.multiply(n2j).add(n1j.multiply(n2i))

      // hxy = ∂²g/∂y_i∂x_j (all i,j).
      const dh67 = n1i.multiply(n3j).subtract(n1j.multiply(n3i))
      const dh1011 = n1i.multiply(n2j).subtract(n1j.multiply(n2i))
      const hxy = a5yi.multiply(b67xj).add(a5xj.multiply(b67yi)).scale(2)
        .subtract(As.multiply(dh67))
        .subtract(c89yi.multiply(d1011xj).add(c89xj.multiply(d1011yi)).scale(3))
        .add(Cs.multiply(dh1011).scale(3))
      const vxy = contract(hxy, a)
      H[n + i][j] += vxy
      H[j][n + i] += vxy

      if (j <= i) {
        const hxx = aij.multiply(Bs)
          .add(a5xi.multiply(b67xj).add(a5xj.multiply(b67xi)).scale(2))
          .subtract(cij.multiply(Ds).scale(3))
          .subtract(c89xi.multiply(d1011xj).add(c89xj.multiply(d1011xi)).scale(3))
        const hyy = aij.multiply(Bs)
          .add(a5yi.multiply(b67yj).add(a5yj.multiply(b67yi)).scale(2))
          .subtract(cij.multiply(Ds).scale(3))
          .subtract(c89yi.multiply(d1011yj).add(c89yj.multiply(d1011yi)).scale(3))
        const vxx = contract(hxx, a), vyy = contract(hyy, a)
        H[i][j] += vxx
        H[n + i][n + j] += vyy
        if (j < i) { H[j][i] += vxx; H[n + j][n + i] += vyy }
      }
    }
  }
  return H
}
