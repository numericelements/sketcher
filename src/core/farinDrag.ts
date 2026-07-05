// ============================================================================
// Bound-preserving COMPLEX Farin-point drag (E26) — the "known-hard" problem
// retried with the tools that did not exist at the last attempt (exact duals
// over the B-spline algebra, the trust-region barrier, raw signs + honest
// margins).
//
// THE REDUCTION. The Farin point of edge i is q = (w₀z₀ + w₁z₁)/(w₀ + w₁), so
// its position determines the COMPLEX edge ratio r = w₁/w₀ = (q−z₀)/(z₁−q) in
// closed form. Dragging Farin i is therefore a TWO-REAL-VARIABLE problem: the
// suffix scale s (r = s·r⁰; weights w_j, j ≥ i+1, scale by s) — which keeps
// every OTHER edge ratio, hence every other Farin point, exactly fixed (the
// editing semantics the fixed-ratio CP drag already established). The
// unconstrained answer is s* = r*/r⁰, known before solving; the drag is a
// PROJECTION of s* onto the feasible cage of g's active sign rows.
//
// The old attempt's killer was the finite-difference reduced Jacobian (it
// drowned the small-g rows in g's dynamic range — F1). Here ∂g/∂s is EXACT:
// the weight seeds are linear in s, decomposition is linear, and a dual pair
// (value, tangent) of ComplexBDs propagates through the Chen pipeline — the
// same pattern that unlocked the PH family (RDual) and the value bound.
// ============================================================================
import { BernsteinDecomposition, decomposeToBernstein, assignSignsNeighbor, cyclicSignChanges } from './bernstein'
import { ComplexBD } from './complexBernstein'
import type { Complex } from './complex'

const cmulc = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const caddc = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const cdivc = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

/** Dual (value, tangent) over ComplexBD — forward AD through the complex B-spline algebra. */
class CBDual {
  readonly val: ComplexBD
  readonly tan: ComplexBD
  constructor(val: ComplexBD, tan: ComplexBD) {
    this.val = val
    this.tan = tan
  }
  add(o: CBDual) { return new CBDual(this.val.add(o.val), this.tan.add(o.tan)) }
  sub(o: CBDual) { return new CBDual(this.val.sub(o.val), this.tan.sub(o.tan)) }
  mul(o: CBDual) { return new CBDual(this.val.mul(o.val), this.val.mul(o.tan).add(this.tan.mul(o.val))) }
  scale(s: number) { return new CBDual(this.val.scale(s), this.tan.scale(s)) }
  conj() { return new CBDual(this.val.conj(), this.tan.conj()) }
  derivative() { return new CBDual(this.val.derivative(), this.tan.derivative()) }
}

/** The Chen numerator g = Im((D1*)²·T·w̄) propagated as a dual — mirror of complexChenG. */
function chenGDual(Z: CBDual, W: CBDual): { g: BernsteinDecomposition; dg: BernsteinDecomposition } {
  const Zu = Z.derivative(), Zuu = Zu.derivative(), Zuuu = Zuu.derivative()
  const Wu = W.derivative(), Wuu = Wu.derivative(), Wuuu = Wuu.derivative()
  const D1 = Zu.mul(W).sub(Z.mul(Wu))
  const D2 = Zuu.mul(W).sub(Z.mul(Wuu))
  const D3 = Zuuu.mul(W).sub(Z.mul(Wuuu))
  const D21 = Zuu.mul(Wu).sub(Zu.mul(Wuu))
  const D1c = D1.conj()
  const D1conjSq = D1c.mul(D1c)
  const bracket = D3.mul(D1).add(D1.mul(D21)).sub(D2.mul(D2).scale(1.5))
  const T = W.mul(bracket).add(D1.mul(Wu.mul(D2).sub(Wuu.mul(D1))).scale(2))
  const G = D1conjSq.mul(T).mul(W.conj())
  return { g: G.val.im, dg: G.tan.im }
}

export interface ComplexFarinCP {
  re: number
  im: number
  w_re: number
  w_im: number
}

/**
 * One bound-preserving drag of Farin point `edge` toward `target` (OPEN
 * complex-rational curve). Returns the new control points (weights updated on
 * the suffix; positions untouched) — or the input if fully blocked.
 */
export function slideComplexFarin(
  cps: readonly ComplexFarinCP[],
  knots: readonly number[],
  degree: number,
  edge: number,
  target: { x: number; y: number },
  opts: { maxNumSteps?: number } = {},
): { points: ComplexFarinCP[]; converged: boolean } {
  void 0
  const z0: Complex = { re: cps[edge].re, im: cps[edge].im }
  const z1: Complex = { re: cps[edge + 1].re, im: cps[edge + 1].im }
  const w0: Complex = { re: cps[edge].w_re, im: cps[edge].w_im }
  const w1: Complex = { re: cps[edge + 1].w_re, im: cps[edge + 1].w_im }
  const r0 = cdivc(w1, w0)

  // weights as a function of the suffix scale s (s = 1 at the start)
  const weightsOf = (s: Complex): Complex[] =>
    cps.map((p, j) => (j >= edge + 1 ? cmulc({ re: p.w_re, im: p.w_im }, s) : { re: p.w_re, im: p.w_im }))

  const gOf = (s: Complex): number[] => {
    const w = weightsOf(s)
    const Zre = cps.map((p, j) => p.re * w[j].re - p.im * w[j].im)
    const Zim = cps.map((p, j) => p.re * w[j].im + p.im * w[j].re)
    const Z = new ComplexBD(decomposeToBernstein(Zre, knots, degree), decomposeToBernstein(Zim, knots, degree))
    const W = new ComplexBD(decomposeToBernstein(w.map((c) => c.re), knots, degree), decomposeToBernstein(w.map((c) => c.im), knots, degree))
    const zero = Z.re.scale(0)
    return chenGDual(new CBDual(Z, new ComplexBD(zero, zero)), new CBDual(W, new ComplexBD(zero, zero))).g.flatCoeffs()
  }
  // Farin position and its Jacobian: q(s) = (z₀ + r z₁)/(1 + r), r = s·r⁰;
  // dq/ds = r⁰·(z₁ − z₀)/(1 + r)² (complex-analytic → CR-structured 2×2).
  const qOf = (s: Complex): Complex => {
    const r = cmulc(s, r0)
    return cdivc(caddc(z0, cmulc(r, z1)), caddc({ re: 1, im: 0 }, r))
  }

  // --- STRAIGHT-q COUNT-GUARDED DRAG (E26) --------------------------------
  // The cage probe showed the sliding active set is too strict for this
  // 1-complex-DOF motion: extrema SLIDE along the curve as the ratio turns,
  // flipping rows in count-neutral pairs — legal under Law 2, blocked by
  // per-row sign constraints. With 2 real variables we enforce Law 2 DIRECTLY:
  // move the FARIN POINT straight toward the cursor, q(β) = q0 + β(qT − q0),
  // pull each candidate back to s in CLOSED FORM (r = (q−z0)/(z1−q), s = r/r0
  // — the Möbius pullback), and bisect on the RAW count (the displayed bound,
  // one metric). Count-neutral crossings pass; only a genuine count increase
  // stops the point — the true feasible limit along the cursor ray.
  const gc0 = gOf({ re: 1, im: 0 })
  const rawCount = (gc: number[]) => cyclicSignChanges(assignSignsNeighbor(gc), false)
  const startBound = rawCount(gc0)
  const countAt = (ss: Complex) => rawCount(gOf(ss))

  const qT: Complex = { re: target.x, im: target.y }
  const q0 = qOf({ re: 1, im: 0 })
  const sOfBeta = (beta: number): Complex | null => {
    const q: Complex = { re: q0.re + beta * (qT.re - q0.re), im: q0.im + beta * (qT.im - q0.im) }
    const den: Complex = { re: z1.re - q.re, im: z1.im - q.im }
    if (Math.hypot(den.re, den.im) < 1e-9) return null // Farin at z1 — degenerate
    const r = cdivc({ re: q.re - z0.re, im: q.im - z0.im }, den)
    const ss = cdivc(r, r0)
    if (Math.hypot(ss.re, ss.im) < 1e-3) return null // suffix weights → 0 — degenerate
    return ss
  }
  const feasible = (beta: number): Complex | null => {
    const ss = sOfBeta(beta)
    if (!ss) return null
    return countAt(ss) <= startBound ? ss : null
  }

  // Feasible-set WALK in q-space: repeatedly step toward the cursor; when the
  // straight step is walled (count would rise), try rotated directions — the
  // discrete analogue of sliding along the constraint wall, which is exactly
  // the motion the cage probe showed is legal (count-neutral row flips) and
  // the straight-ray bisection kept missing (it lands ON the frontier and the
  // next tick starts wall-locked).
  const sAtQ = (q: Complex): Complex | null => {
    const den: Complex = { re: z1.re - q.re, im: z1.im - q.im }
    if (Math.hypot(den.re, den.im) < 1e-9) return null
    const r = cdivc({ re: q.re - z0.re, im: q.im - z0.im }, den)
    const ss = cdivc(r, r0)
    if (Math.hypot(ss.re, ss.im) < 1e-3) return null
    return ss
  }
  void sOfBeta
  void feasible
  let s: Complex = { re: 1, im: 0 }
  let q: Complex = { re: q0.re, im: q0.im }
  let best: { s: Complex; d: number } = { s, d: Math.hypot(qT.re - q.re, qT.im - q.im) }
  let converged = false
  let lateralBudget = 8 // bounded wall-following (prevents creep/cycles)
  const maxIter = opts.maxNumSteps ?? 60
  for (let it = 0; it < maxIter; it++) {
    const gap: Complex = { re: qT.re - q.re, im: qT.im - q.im }
    const gapLen = Math.hypot(gap.re, gap.im)
    if (gapLen < 1e-9) { converged = true; break }
    let advanced = false
    // improving move: any feasible step strictly closer to the cursor
    for (let h = 1; h > 1 / 128 && !advanced; h /= 2) {
      for (const ang of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2]) {
        const ca = Math.cos(ang)
        const sa = Math.sin(ang)
        const qc: Complex = { re: q.re + h * (ca * gap.re - sa * gap.im), im: q.im + h * (sa * gap.re + ca * gap.im) }
        if (Math.hypot(qT.re - qc.re, qT.im - qc.im) >= gapLen) continue
        const sc = sAtQ(qc)
        if (!sc || countAt(sc) > startBound) continue
        q = qc
        s = sc
        advanced = true
        break
      }
    }
    if (!advanced && lateralBudget > 0) {
      // WALL-FOLLOWING: no improving step exists — take the best feasible
      // LATERAL step (perpendicular-ish, distance may worsen slightly) and
      // let the next iteration try to turn the corner. Best-so-far is kept.
      let bestLat: { q: Complex; s: Complex; d: number } | null = null
      for (const ang of [1.57, -1.57, 1.2, -1.2]) {
        const ca = Math.cos(ang)
        const sa = Math.sin(ang)
        for (const h of [0.5, 0.25, 0.125]) {
          const qc: Complex = { re: q.re + h * (ca * gap.re - sa * gap.im), im: q.im + h * (sa * gap.re + ca * gap.im) }
          const sc = sAtQ(qc)
          if (!sc || countAt(sc) > startBound) continue
          const d = Math.hypot(qT.re - qc.re, qT.im - qc.im)
          if (!bestLat || d < bestLat.d) bestLat = { q: qc, s: sc, d }
          break
        }
      }
      if (bestLat && bestLat.d < gapLen * 1.25) {
        q = bestLat.q
        s = bestLat.s
        lateralBudget--
        advanced = true
      }
    }
    if (!advanced) break // true feasible limit in every probed direction
    const d = Math.hypot(qT.re - q.re, qT.im - q.im)
    if (d < best.d) best = { s, d }
  }
  s = best.s

  // Law-2 backstop (the accepted states were count-checked; re-verify the final)
  if (countAt(s) > startBound) s = { re: 1, im: 0 }
  const w = weightsOf(s)
  return {
    points: cps.map((p, j) => ({ re: p.re, im: p.im, w_re: w[j].re, w_im: w[j].im })),
    converged,
  }
}
