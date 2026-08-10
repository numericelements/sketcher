// ============================================================================
// COMPLEX-RATIONAL PH CUBICS — the chart is the control points plus the Farin points.
//
// A complex-rational cubic IS its four control points and its three Farin points: 8 + 6 =
// 14 real numbers, and the chart is BIJECTIVE, because each edge's Farin point hands back
// that edge's weight ratio outright,
//
//     wₖ₊₁/wₖ = (qₖ − Zₖ)/(Zₖ₊₁ − qₖ)
//
// with the overall weight scale invisible. PH costs 4 real conditions, so the family is
// 10-dimensional and exactly FIVE of the seven points can be prescribed: the four control
// points — on which NO condition falls — plus ONE Farin point. The remaining two Farin
// points are determined, and measured (complexRationalPHCubic.test.ts) they are determined
// in exactly TWO ways, stable across polygons, start counts and seeds. Bézout allows 32;
// the truth is 2, the same count as the polynomial cubic.
//
// PH, in one line. With P = Σ wₖZₖBₖ and Q = Σ wₖBₖ the hodograph numerator is the
// Wronskian M = P′Q − PQ′ (degree 4 — the t⁵ terms cancel), and ‖z′‖ = |M|/|Q|² is rational
// exactly when M is a PERFECT SQUARE, M = A². Then ‖z′‖ = |A|²/|Q|², so h = |A|² has degree
// 4 and w = QQ̄ degree 6 — the (n−2)/n law, in the plane.
//
// AND MÖBIUS IS FREE, which is the reason this representation is worth the trouble:
// z ↦ (az+b)/(cz+d) is the LINEAR map (P,Q) ↦ (aP+bQ, cP+dQ), and the Wronskian is
// alternating bilinear, so M ↦ (ad−bc)·M. Every complex number has a square root, so a
// square stays a square. In R³ the same fact needs the whole O(4,1) model.
//
// The solve carries A as an unknown rather than eliminating it. Eliminating needs
// 8m₁m₄² − 4m₂m₃m₄ + m₃³ = 0 and 64m₀m₄³ − (4m₄m₂ − m₃²)² = 0 — degree 6 and 8, with
// spurious m₄ = 0 branches. Here every root is a genuine (w, A) and the residual reported
// is the one that was actually driven to zero.
// ============================================================================
import { type Complex, cadd, cdiv, cmul, cnorm, csub } from './complex'
import { rootsOf } from './conformalPHHopf'

const C = (re: number, im = 0): Complex => ({ re, im })
const cneg = (a: Complex): Complex => ({ re: -a.re, im: -a.im })

/** Which edge's Farin point you are holding. The other two are derived. */
export type FarinHandle = 0 | 1 | 2

export interface ComplexRationalPHCubic {
  /** The four control points — free, no condition falls on them. */
  readonly Z: readonly Complex[]
  /** The four complex weights, normalised to w₀ = 1. */
  readonly w: readonly Complex[]
  /** The quadratic with M = A², so ‖z′‖ = |A|²/|Q|². */
  readonly A: readonly Complex[]
  /** max |coeff(M − A²)|, relative — driven to machine zero, and reported not assumed. */
  readonly residual: number
}

// --- polynomial plumbing -----------------------------------------------------
/** Bernstein coefficients of a cubic to the power basis. */
export const toPower = (c: readonly Complex[]): Complex[] => [
  c[0],
  cadd(cmul(C(-3), c[0]), cmul(C(3), c[1])),
  cadd(cadd(cmul(C(3), c[0]), cmul(C(-6), c[1])), cmul(C(3), c[2])),
  cadd(cadd(cadd(cneg(c[0]), cmul(C(3), c[1])), cmul(C(-3), c[2])), c[3]),
]

const deriv = (p: readonly Complex[]): Complex[] => p.slice(1).map((v, k) => cmul(C(k + 1), v))

function mulPoly(a: readonly Complex[], b: readonly Complex[]): Complex[] {
  const out: Complex[] = Array.from({ length: a.length + b.length - 1 }, () => C(0))
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    out[i + j] = cadd(out[i + j], cmul(a[i], b[j]))
  }
  return out
}

export const evalPoly = (p: readonly Complex[], t: number): Complex =>
  p.reduceRight((acc, c) => cadd(cmul(acc, C(t)), c), C(0))

/** The five coefficients of M − A², whose vanishing IS the PH condition. */
function residualOf(Z: readonly Complex[], w: readonly Complex[], A: readonly Complex[]): Complex[] {
  const P = toPower(Z.map((z, k) => cmul(w[k], z)))
  const Q = toPower(w)
  const lhs = mulPoly(deriv(P), Q)
  const rhs = mulPoly(P, deriv(Q))
  const A2 = mulPoly(A, A)
  return Array.from({ length: 5 }, (_, k) =>
    csub(csub(lhs[k] ?? C(0), rhs[k] ?? C(0)), A2[k] ?? C(0)),
  )
}

// --- the curve ----------------------------------------------------------------
export function curveAt(c: ComplexRationalPHCubic, t: number): Complex | null {
  const q = evalPoly(toPower(c.w), t)
  if (cnorm(q) < 1e-12) return null
  return cdiv(evalPoly(toPower(c.Z.map((z, k) => cmul(c.w[k], z))), t), q)
}

/** ‖z′‖ = |A|²/|Q|² — rational by construction, which is what PH means. */
export function speedAt(c: ComplexRationalPHCubic, t: number): number {
  const q = cnorm(evalPoly(toPower(c.w), t))
  return q < 1e-12 ? NaN : cnorm(evalPoly(c.A, t)) ** 2 / (q * q)
}

/** qₖ = (wₖZₖ + wₖ₊₁Zₖ₊₁)/(wₖ + wₖ₊₁) — the complex-weight Farin point. */
export function farinPoints(c: ComplexRationalPHCubic): (Complex | null)[] {
  return [0, 1, 2].map((k) => {
    const s = cadd(c.w[k], c.w[k + 1])
    if (cnorm(s) < 1e-12) return null
    return cdiv(cadd(cmul(c.w[k], c.Z[k]), cmul(c.w[k + 1], c.Z[k + 1])), s)
  })
}

/** min over [0,1] of |Q| — a zero is a pole, where the curve runs through infinity. */
export function denominatorFloor(c: ComplexRationalPHCubic, samples = 200): number {
  const Q = toPower(c.w)
  let lo = Infinity
  for (let i = 0; i <= samples; i++) lo = Math.min(lo, cnorm(evalPoly(Q, i / samples)))
  return lo / Math.max(...c.w.map(cnorm))
}

/** A complex polynomial at a COMPLEX argument — Horner. */
const evalAt = (p: readonly Complex[], z: Complex): Complex =>
  p.reduceRight((acc, c) => cadd(cmul(acc, z), c), C(0))

/**
 * min over Q's roots of |P|, relative. ZERO means P and Q share a factor, so z = P/Q is a
 * LOWER-degree curve wearing a cubic coat — and then the cubic representations of it form a
 * positive-dimensional family, which is a curve that does not move when you drag a control
 * point. Eric found exactly that on screen before this function existed: over a polygon and
 * a bead there are two algebraic solutions, and one of them has P and Q sharing a QUADRATIC
 * factor, collapsing to degree one — a circular arc, trivially PH. So the count of genuine
 * cubics is ONE, and callers that want curves rather than roots must filter on this.
 */
export function reducibility(c: ComplexRationalPHCubic): number {
  const P = toPower(c.Z.map((z, k) => cmul(c.w[k], z)))
  const roots = rootsOf(toPower(c.w))
  if (roots.length === 0) return 0
  const scale = Math.max(...P.map(cnorm))
  return Math.min(...roots.map((r) => cnorm(evalAt(P, r)))) / Math.max(scale, 1e-300)
}

/**
 * The PH condition itself, as a number: max |coeff(M − A²)| relative to the scale of M.
 *
 * Exported because it is the quantity the theory deck's Act II is about, and a claim about it should
 * be checkable from outside this file rather than trusted.
 */
export function phResidual(c: ComplexRationalPHCubic): number {
  const P = toPower(c.Z.map((z, k) => cmul(c.w[k], z)))
  const Q = toPower(c.w)
  const M = Array.from({ length: 5 }, (_, k) =>
    csub(mulPoly(deriv(P), Q)[k] ?? C(0), mulPoly(P, deriv(Q))[k] ?? C(0)),
  )
  const scale = Math.max(...M.map(cnorm), 1e-300)
  return Math.max(...residualOf(c.Z, c.w, c.A).map(cnorm)) / scale
}

export interface MobiusMap {
  readonly a: Complex
  readonly b: Complex
  readonly c: Complex
  readonly d: Complex
}

/** The principal square root — the phase a Möbius map hands to A. */
const csqrt = (z: Complex): Complex => {
  const r = Math.sqrt(cnorm(z))
  const half = Math.atan2(z.im, z.re) / 2
  return { re: r * Math.cos(half), im: r * Math.sin(half) }
}

/**
 * A Möbius transformation of a complex-rational PH cubic — and the whole of Act II in one function.
 *
 * μ(z) = (az+b)/(cz+d) acts LINEARLY on the homogeneous pair, coefficient by Bernstein coefficient,
 * because the matrix is constant:
 *
 *     (P, Q)  ↦  (aP + bQ,  cP + dQ)
 *
 * No degree rise and no reparametrisation — contrast the real model, where a Möbius image of a cubic
 * is a sextic and the control polygon has to be rebuilt from the lift.
 *
 * AND PH SURVIVES, in one line. The Wronskian is bilinear and alternating, so
 *
 *     M̃ = P̃′Q̃ − P̃Q̃′ = (ad − bc)·M = λM
 *
 * and a constant multiple of a square is a square, because ℂ has square roots: λA² = (√λ·A)². The
 * only property of the ambient used is that the scalars are closed under square roots — there is no
 * geometry in it at all. Renormalising to w₀ = 1 divides P and Q by Q̃₀, and M is bilinear, so it
 * divides M by Q̃₀² and A by Q̃₀.
 *
 * Returns null when a Bernstein weight of the image vanishes, since Zₖ = P̃ₖ/Q̃ₖ is then not a point.
 */
export function mobiusImage(curve: ComplexRationalPHCubic, m: MobiusMap): ComplexRationalPHCubic | null {
  const P = curve.Z.map((z, k) => cmul(curve.w[k], z))
  const Q = curve.w
  const Pt = P.map((p, k) => cadd(cmul(m.a, p), cmul(m.b, Q[k])))
  const Qt = P.map((p, k) => cadd(cmul(m.c, p), cmul(m.d, Q[k])))
  const scale = Math.max(...Qt.map(cnorm))
  if (!(scale > 0) || Qt.some((q) => cnorm(q) < 1e-9 * scale)) return null

  const norm = Qt[0]
  const w = Qt.map((q) => cdiv(q, norm))
  const Z = Pt.map((p, k) => cdiv(p, Qt[k]))
  const lambda = csub(cmul(m.a, m.d), cmul(m.b, m.c))
  const factor = cdiv(csqrt(lambda), norm)
  const A = curve.A.map((a) => cmul(factor, a))
  const image: ComplexRationalPHCubic = { Z, w, A, residual: curve.residual }
  return { ...image, residual: phResidual(image) }
}

// --- the solve ----------------------------------------------------------------
/** The weight ratio an edge's Farin point prescribes. */
export const ratioFromFarin = (Za: Complex, Zb: Complex, q: Complex): Complex | null => {
  const d = csub(Zb, q)
  return cnorm(d) < 1e-12 ? null : cdiv(csub(q, Za), d)
}

/** Two free weights plus the prescribed ratio make all four, with w₀ = 1. */
function weightsFrom(handle: FarinHandle, ratio: Complex, u: Complex, v: Complex): Complex[] {
  if (handle === 0) return [C(1), ratio, u, v]
  if (handle === 1) return [C(1), u, cmul(ratio, u), v]
  return [C(1), u, v, cmul(ratio, v)]
}

function solveLinear(Ain: Complex[][], bin: Complex[]): Complex[] | null {
  const n = bin.length
  const M = Ain.map((r) => r.map((c) => ({ ...c })))
  const b = bin.map((c) => ({ ...c }))
  for (let i = 0; i < n; i++) {
    let piv = i
    for (let r = i + 1; r < n; r++) if (cnorm(M[r][i]) > cnorm(M[piv][i])) piv = r
    if (cnorm(M[piv][i]) < 1e-300) return null
    ;[M[i], M[piv]] = [M[piv], M[i]]
    ;[b[i], b[piv]] = [b[piv], b[i]]
    for (let r = i + 1; r < n; r++) {
      const f = cdiv(M[r][i], M[i][i])
      for (let c = i; c < n; c++) M[r][c] = csub(M[r][c], cmul(f, M[i][c]))
      b[r] = csub(b[r], cmul(f, b[i]))
    }
  }
  const x: Complex[] = Array.from({ length: n }, () => C(0))
  for (let i = n - 1; i >= 0; i--) {
    let acc = b[i]
    for (let c = i + 1; c < n; c++) acc = csub(acc, cmul(M[i][c], x[c]))
    x[i] = cdiv(acc, M[i][i])
  }
  return x
}

/**
 * Newton on (u, v, a₀, a₁, a₂). The Jacobian is a COMPLEX-STEP central difference, exact to
 * O(h²) because the residual is holomorphic in the unknowns — no hand-written derivative of
 * a quadratic system to get wrong.
 */
function newton(
  Z: readonly Complex[], handle: FarinHandle, ratio: Complex, x0: readonly Complex[], iters = 40,
): { x: Complex[]; residual: number } | null {
  const F = (x: readonly Complex[]): Complex[] =>
    residualOf(Z, weightsFrom(handle, ratio, x[0], x[1]), [x[2], x[3], x[4]])
  const h = 1e-6
  let x = x0.map((c) => ({ ...c }))
  for (let it = 0; it < iters; it++) {
    const f = F(x)
    const nf = Math.max(...f.map(cnorm))
    if (!Number.isFinite(nf)) return null
    if (nf < 1e-13) return { x, residual: nf }
    const J: Complex[][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => C(0)))
    for (let j = 0; j < 5; j++) {
      const up = x.map((v, i) => (i === j ? cadd(v, C(h)) : v))
      const dn = x.map((v, i) => (i === j ? csub(v, C(h)) : v))
      const fu = F(up), fd = F(dn)
      for (let r = 0; r < 5; r++) J[r][j] = cdiv(csub(fu[r], fd[r]), C(2 * h))
    }
    const step = solveLinear(J, f.map(cneg))
    if (!step) return null
    const scale = Math.max(...step.map(cnorm))
    const damp = scale > 4 ? 4 / scale : 1
    x = x.map((v, i) => cadd(v, cmul(C(damp), step[i])))
    if (!x.every((v) => Number.isFinite(v.re) && Number.isFinite(v.im))) return null
  }
  const f = F(x)
  const nf = Math.max(...f.map(cnorm))
  return nf < 1e-9 ? { x, residual: nf } : null
}

const build = (
  Z: readonly Complex[], handle: FarinHandle, ratio: Complex, r: { x: Complex[]; residual: number },
): ComplexRationalPHCubic => ({
  Z: Z.map((z) => ({ ...z })),
  w: weightsFrom(handle, ratio, r.x[0], r.x[1]),
  A: [r.x[2], r.x[3], r.x[4]],
  residual: r.residual,
})

/** Deterministic PRNG — the same polygon must give the same two branches every time. */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * BOTH solutions, from scratch. Measured to be exactly two; the search is a sweep of Newton
 * starts rather than a homotopy, so it stops as soon as two distinct roots are in hand and
 * degenerate roots (A ≡ 0, a vanishing or runaway weight) are discarded rather than counted.
 */
export function solveFromFarin(
  Z: readonly Complex[], handle: FarinHandle, farin: Complex, starts = 2000, seed = 12345,
): ComplexRationalPHCubic[] {
  const ratio = ratioFromFarin(Z[handle], Z[handle + 1], farin)
  if (!ratio) return []
  const rnd = lcg(seed)
  const out: ComplexRationalPHCubic[] = []
  for (let s = 0; s < starts && out.length < 2; s++) {
    const x0 = Array.from({ length: 5 }, () => C(4 * rnd() - 2, 4 * rnd() - 2))
    const r = newton(Z, handle, ratio, x0)
    if (!r) continue
    const cand = build(Z, handle, ratio, r)
    if (Math.max(...cand.A.map(cnorm)) < 1e-6) continue
    if (Math.min(...cand.w.map(cnorm)) < 1e-6) continue
    if (Math.max(...cand.w.map(cnorm)) > 1e6) continue
    // Dedupe on the WEIGHTS alone: A ↦ −A is the same curve.
    if (out.some((o) => Math.max(...o.w.map((wv, i) => cnorm(csub(wv, cand.w[i])))) < 1e-6)) continue
    out.push(cand)
  }
  return out
}

/**
 * Follow one branch to new data — the interactive path. Newton from where that branch was,
 * so the identity of the branch is carried by continuity rather than re-decided each frame.
 */
export function trackFromFarin(
  Z: readonly Complex[], handle: FarinHandle, farin: Complex, from: ComplexRationalPHCubic,
): ComplexRationalPHCubic | null {
  const ratio = ratioFromFarin(Z[handle], Z[handle + 1], farin)
  if (!ratio) return null
  // Seed from the previous weights, reading the two FREE ones for this handle.
  const free: Complex[] =
    handle === 0 ? [from.w[2], from.w[3]] : handle === 1 ? [from.w[1], from.w[3]] : [from.w[1], from.w[2]]
  const r = newton(Z, handle, ratio, [...free, ...from.A], 25)
  if (!r) return null
  const cand = build(Z, handle, ratio, r)
  if (Math.max(...cand.A.map(cnorm)) < 1e-9) return null
  return cand
}

/**
 * The one IRREDUCIBLE solution — what a figure should draw. The reducible root is a circular
 * arc in disguise and is not a peer of this one, so it is filtered out here rather than
 * offered as a second branch.
 */
export function solveIrreducibleFromFarin(
  Z: readonly Complex[], handle: FarinHandle, farin: Complex, starts = 3000, seed = 12345,
): ComplexRationalPHCubic | null {
  const all = solveFromFarin(Z, handle, farin, starts, seed)
  return all.find((c) => reducibility(c) > 1e-8) ?? null
}

// There is deliberately NO withHandle(): swapping which bead you hold changes nothing about
// the curve, so it is not an operation on a member. The caller re-reads farinPoints() and
// takes the bead it wants as its new handle — see the figure.
