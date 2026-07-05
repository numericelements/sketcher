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
import { computeInactiveSetBySign } from './curvatureProblem'
import {
  TrustRegionBarrierOptimizer, TRSymmetricMatrix,
  type TrustRegionProblem, type TRMatrix,
} from './trustRegionOptimizer'
import { ComplexBD } from './complexBernstein'
import { curvatureExtremaNumeratorComplex, curvatureExtremaNumeratorComplexPeriodic } from './curvature'
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
  opts: {
    maxNumSteps?: number
    /** CLOSED curve: the wrap edge (edge = n−1) pairs w_{n−1} with wrapWeight,
     *  and every ratio change flows into the MONODROMY: on a cycle the edge
     *  ratios multiply around the loop into ρ, so changing ONE ratio while
     *  keeping the others fixed means scaling the suffix AND wrapWeight by
     *  the same s (ρ ← ρ·s). The count is the periodic numerator with the
     *  live ρ, counted cyclically. */
    closed?: { wrapWeight: Complex }
  } = {},
): { points: ComplexFarinCP[]; converged: boolean; wrapWeight?: Complex } {
  const n = cps.length
  const closed = opts.closed
  const isWrapEdge = !!closed && edge === n - 1
  const jNext = isWrapEdge ? 0 : edge + 1
  const z0: Complex = { re: cps[edge].re, im: cps[edge].im }
  const z1: Complex = { re: cps[jNext].re, im: cps[jNext].im }
  const w0: Complex = { re: cps[edge].w_re, im: cps[edge].w_im }
  const w1: Complex = isWrapEdge
    ? { re: closed!.wrapWeight.re, im: closed!.wrapWeight.im }
    : { re: cps[edge + 1].w_re, im: cps[edge + 1].w_im }
  const r0 = cdivc(w1, w0)

  // weights as a function of the suffix scale s (s = 1 at the start); for a
  // CLOSED curve the wrapWeight scales along (monodromy absorbs the change —
  // all OTHER edge ratios, including the wrap edge's when edge < n−1, stay
  // exactly fixed). Wrap-edge drag: suffix is empty, only wrapWeight scales.
  const weightsOf = (s: Complex): Complex[] =>
    cps.map((p, j) => (!isWrapEdge && j >= edge + 1 ? cmulc({ re: p.w_re, im: p.w_im }, s) : { re: p.w_re, im: p.w_im }))
  const wrapOf = (s: Complex): Complex | null =>
    closed ? cmulc({ re: closed.wrapWeight.re, im: closed.wrapWeight.im }, s) : null

  // VALUE-ONLY evaluation (perf): the plain Chen numerator — the dual pipeline
  // with zero tangents costs ~3× for nothing (measured: blocked ticks 38ms).
  const gOf = (s: Complex): number[] => {
    const w = weightsOf(s)
    if (closed) {
      const W = wrapOf(s)!
      const rho = cdivc(W, { re: w[0].re, im: w[0].im })
      return curvatureExtremaNumeratorComplexPeriodic(
        cps.map((p) => p.re), cps.map((p) => p.im),
        w.map((c) => c.re), w.map((c) => c.im), knots, degree, rho).flatCoeffs()
    }
    return curvatureExtremaNumeratorComplex(
      cps.map((p) => p.re), cps.map((p) => p.im),
      w.map((c) => c.re), w.map((c) => c.im), knots, degree).flatCoeffs()
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
  const rawCount = (gc: number[]) => cyclicSignChanges(assignSignsNeighbor(gc), !!closed)
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
  // Per-CALL count-evaluation budget: a fully BLOCKED tick otherwise pays the
  // whole direction fan (~50 numerator builds) just to conclude "park". Ticks
  // repeat at pointer rate — 24 evals per tick is plenty of exploration.
  let evalBudget = 24
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
        if (evalBudget <= 0) break
        const sc = sAtQ(qc)
        if (!sc) continue
        evalBudget--
        if (countAt(sc) > startBound) continue
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
          if (evalBudget <= 0) break
          const qc: Complex = { re: q.re + h * (ca * gap.re - sa * gap.im), im: q.im + h * (sa * gap.re + ca * gap.im) }
          const sc = sAtQ(qc)
          if (!sc) continue
          evalBudget--
          if (countAt(sc) > startBound) continue
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
    if (!advanced || evalBudget <= 0) {
      if (!advanced) break // true feasible limit in every probed direction
      break // budget spent — ticks repeat at pointer rate; park here
    }
    const d = Math.hypot(qT.re - q.re, qT.im - q.im)
    if (d < best.d) best = { s, d }
  }
  s = best.s

  // Law-2 backstop (the accepted states were count-checked; re-verify the final)
  if (countAt(s) > startBound) s = { re: 1, im: 0 }
  const w = weightsOf(s)
  const W = wrapOf(s)
  return {
    points: cps.map((p, j) => ({ re: p.re, im: p.im, w_re: w[j].re, w_im: w[j].im })),
    converged,
    ...(W ? { wrapWeight: W } : {}),
  }
}

/**
 * ANCHORED ratio+CP Farin drag (E26-C) — the continuous dial between the two
 * semantics: the dragged edge's complex ratio is the cheap variable, every
 * control point is Tikhonov-anchored to its tick-start position, and the
 * anchor weight sets how much SHAPE a hard pull may spend (anchor→∞ = the
 * pure-weight drag; anchor≈20 reproduced the legacy reshape on the measured
 * Pareto front — see labE26Anchored). Bound: raw-count guarded (Law 2 on the
 * displayed metric). OPEN curves. TRIAL-GRADE Jacobian (central FD): the
 * exact CBDual columns are the production upgrade if the feel is kept.
 */
export function slideComplexFarinAnchored(
  cps: readonly ComplexFarinCP[],
  knots: readonly number[],
  degree: number,
  edge: number,
  target: { x: number; y: number },
  opts: { anchorWeight?: number; maxNumSteps?: number; dragWeight?: number; anchorTo?: { x: number[]; y: number[] } } = {},
): { points: ComplexFarinCP[]; bound: number; startBound: number } {
  const n = cps.length
  const nv = 2 * n + 1 // [re..., im..., β] — β advances q along the USER'S RAY only
  const anchorW = opts.anchorWeight ?? 100
  const DRAGW = opts.dragWeight ?? 10
  const w0Re = cps.map((p) => p.w_re)
  const w0Im = cps.map((p) => p.w_im)
  // E26-C ratchet fix, final form — NO SUBSTITUTION. Measured (notebook
  // E26-C-RATCHET): under a bound-resisted pull, a free 2-DOF ratio drifts
  // along the feasible directions the user did NOT ask for, and the feasible
  // path toward "more weight phase" curls into the neighbouring control point
  // (d(q,CP) 12.5→1.5px in the s-chart; 19.6→3.1 even in the well-conditioned
  // λ-chart — the chart softened the ratchet, the OBJECTIVE still paid radial
  // drift for phase progress). The cure is semantic: the Farin point may move
  // ONLY along the user's pull ray — ONE variable β with q(β) = q0 + β(qT−q0)
  // in absolute coordinates, the ratio recovered by the Möbius pullback from
  // the CURRENT control points. The anchored CPs supply any reshape the ray
  // needs; off-ray drift is impossible by construction, so the handle either
  // follows the hand or honestly stops. λ→1 (suffix weights → ∞) and suffix
  // weights → 0 are rejected as infeasible in evaluation.
  const r0c: Complex = cdivc({ re: cps[edge + 1].w_re, im: cps[edge + 1].w_im }, { re: cps[edge].w_re, im: cps[edge].w_im })
  // start Farin position q0 (from the input state) — the ray origin
  const w0c: Complex = { re: cps[edge].w_re, im: cps[edge].w_im }
  const w1c: Complex = { re: cps[edge + 1].w_re, im: cps[edge + 1].w_im }
  const q0abs: Complex = cdivc(
    caddc(cmulc(w0c, { re: cps[edge].re, im: cps[edge].im }), cmulc(w1c, { re: cps[edge + 1].re, im: cps[edge + 1].im })),
    caddc(w0c, w1c),
  )
  /** suffix scale from (β, current CPs): q(β) on the ray → λ via the CURRENT
   *  edge endpoints → r → s. Null = degenerate (rejected in evaluation). */
  const sOfZ = (zz: number[]): Complex | null => {
    const beta = zz[2 * n]
    const q: Complex = { re: q0abs.re + beta * (target.x - q0abs.re), im: q0abs.im + beta * (target.y - q0abs.im) }
    const zA: Complex = { re: zz[edge], im: zz[n + edge] }
    const zB: Complex = { re: zz[edge + 1], im: zz[n + edge + 1] }
    const den: Complex = { re: zB.re - q.re, im: zB.im - q.im }
    if (Math.hypot(den.re, den.im) < 1e-6) return null // q at z₁: degenerate
    const r = cdivc({ re: q.re - zA.re, im: q.im - zA.im }, den)
    const sc = cdivc(r, r0c)
    const m = Math.hypot(sc.re, sc.im)
    if (m < 1e-4 || m > 1e4) return null
    return sc
  }
  const weightsOf = (sRe: number, sIm: number) => {
    const wRe = w0Re.slice()
    const wIm = w0Im.slice()
    for (let j = edge + 1; j < n; j++) {
      const a = w0Re[j]
      const b = w0Im[j]
      wRe[j] = a * sRe - b * sIm
      wIm[j] = a * sIm + b * sRe
    }
    return { wRe, wIm }
  }
  const gFlat = (z: number[]) => {
    const sc = sOfZ(z)
    if (!sc) return null
    const { wRe, wIm } = weightsOf(sc.re, sc.im)
    const Zre = z.slice(0, n).map((x, j) => x * wRe[j] - z[n + j] * wIm[j])
    const Zim = z.slice(0, n).map((x, j) => x * wIm[j] + z[n + j] * wRe[j])
    const Z = new ComplexBD(decomposeToBernstein(Zre, knots, degree), decomposeToBernstein(Zim, knots, degree))
    const W = new ComplexBD(decomposeToBernstein(wRe, knots, degree), decomposeToBernstein(wIm, knots, degree))
    const zero = Z.re.scale(0)
    return chenGDual(new CBDual(Z, new ComplexBD(zero, zero)), new CBDual(W, new ComplexBD(zero, zero))).g.flatCoeffs()
  }
  const qAt = (z: number[]) => {
    if (!sOfZ(z)) return null
    const beta = z[2 * n]
    return { re: q0abs.re + beta * (target.x - q0abs.re), im: q0abs.im + beta * (target.y - q0abs.im) } as Complex
  }

  const z0v = [...cps.map((p) => p.re), ...cps.map((p) => p.im), 0]
  const gc0 = gFlat(z0v)!
  const rawCount = (gc: number[]) => cyclicSignChanges(assignSignsNeighbor(gc), false)
  const startBound = rawCount(gc0)
  const signsAll = assignSignsNeighbor(gc0)
  const inactive = computeInactiveSetBySign(signsAll, gc0.map(Math.abs))
  const active = gc0.map((_, i) => i).filter((i) => !inactive.has(i) && gc0[i] !== 0)

  let z = z0v.slice()
  // Anchors reference the DRAG-START positions when supplied (anchorTo) — a
  // per-tick re-centered anchor is a ratchet: each tick's creep is cheap and
  // the accumulation is free, and the control point CHASES the handle
  // (measured: d(handle, CP) → 1.8px with per-tick anchors at weight 100).
  const anchX = opts.anchorTo?.x ?? cps.map((p) => p.re)
  const anchY = opts.anchorTo?.y ?? cps.map((p) => p.im)
  // DEGENERACY PRICE (the disease's true cure — notebook E26-C-RATCHET): the
  // bound-feasible set's open end is the DEGENERATE ratio (|s| → ∞ fades the
  // prefix, the count DROPS, the cage opens), and the optimizer will reach it
  // through any door left open — the s-chart, the λ-chart, or by carrying the
  // CONTROL POINT to the handle (measured: 23.7px CP travel to make r explode).
  // (log|s|)² prices distance-from-start in RATIO MODULUS symmetrically and
  // scale-free: a user's along-edge pull pays it knowingly (drag benefit),
  // the constraint-relaxation cheat cannot (no benefit to offset it).
  const MU = 2000
  const lnS = (zz: number[]): number | null => {
    const sc = sOfZ(zz)
    return sc ? Math.log(Math.hypot(sc.re, sc.im)) : null
  }
  const f0Of = (zz: number[]) => {
    const q = qAt(zz)
    const ls = lnS(zz)
    if (!q || ls === null) return 1e300 // degenerate chart point: never accepted
    let sm = 0.5 * DRAGW * ((q.re - target.x) ** 2 + (q.im - target.y) ** 2)
    sm += 0.5 * MU * ls * ls
    for (let i = 0; i < n; i++) {
      sm += 0.5 * anchorW * ((zz[i] - anchX[i]) ** 2 + (zz[n + i] - anchY[i]) ** 2)
    }
    return sm
  }
  const fOf = (zz: number[]) => {
    const gc = gFlat(zz)
    if (!gc) return active.map(() => 1) // infeasible (f ≥ 0): feasibility shrink rejects
    return active.map((i) => signsAll[i] * gc[i])
  }
  let atZ: { f: number[]; f0: number; g0: number[]; J: number[][] | null; JtJ: TRSymmetricMatrix | null } | null = null
  let cand: { dx: number[]; f: number[]; f0: number } | null = null
  const ensure = () => {
    if (!atZ) atZ = { f: fOf(z), f0: f0Of(z), g0: [], J: null, JtJ: null }
    return atZ
  }
  const buildJ = () => {
    const a = ensure()
    if (a.J) return
    const J: number[][] = active.map(() => new Array<number>(nv).fill(0))
    const q = qAt(z)!
    const rx = q.re - target.x
    const ry = q.im - target.y
    const qCols: { x: number; y: number }[] = []
    for (let c = 0; c < nv; c++) {
      const h = 1e-5 * (Math.abs(z[c]) + 1)
      const zp = z.slice()
      zp[c] += h
      const zm = z.slice()
      zm[c] -= h
      const gp = gFlat(zp) ?? gFlat(z)!
      const gm = gFlat(zm) ?? gFlat(z)!
      for (let k = 0; k < active.length; k++) J[k][c] = (signsAll[active[k]] * (gp[active[k]] - gm[active[k]])) / (2 * h)
      const qp = qAt(zp) ?? q
      qCols.push({ x: (qp.re - q.re) / h, y: (qp.im - q.im) / h })
    }
    // penalty residual √MU·ln|s|: FD row (cheap — sOfZ only)
    const ls0 = lnS(z) ?? 0
    const lsCols = new Array<number>(nv).fill(0)
    for (let c = 0; c < nv; c++) {
      const h = 1e-5 * (Math.abs(z[c]) + 1)
      const zp = z.slice()
      zp[c] += h
      const lp = lnS(zp)
      lsCols[c] = lp === null ? 0 : (lp - ls0) / h
    }
    const g0 = new Array<number>(nv).fill(0)
    const JtJ = new TRSymmetricMatrix(nv)
    for (let c = 0; c < nv; c++) {
      g0[c] = DRAGW * (rx * qCols[c].x + ry * qCols[c].y) + MU * ls0 * lsCols[c] +
        (c < n ? anchorW * (z[c] - anchX[c]) : c < 2 * n ? anchorW * (z[c] - anchY[c - n]) : 0)
      for (let l = 0; l <= c; l++) {
        let v = DRAGW * (qCols[c].x * qCols[l].x + qCols[c].y * qCols[l].y) + MU * lsCols[c] * lsCols[l]
        if (c === l && c < 2 * n) v += anchorW
        JtJ.set(c, l, v)
      }
    }
    a.J = J
    a.g0 = g0
    a.JtJ = JtJ
  }
  const visit = (dx: number[]) => {
    if (cand && cand.dx === dx) return cand
    const zc = z.map((v, i) => v + dx[i])
    cand = { dx, f: fOf(zc), f0: f0Of(zc) }
    return cand
  }
  const problem: TrustRegionProblem = {
    get numberOfIndependentVariables() { return nv },
    get f0() { return ensure().f0 },
    get gradient_f0() { buildJ(); return ensure().g0 },
    get hessian_f0(): TRMatrix { buildJ(); return ensure().JtJ! },
    get numberOfConstraints() { return active.length },
    get f() { return ensure().f },
    get gradient_f(): TRMatrix {
      buildJ()
      const J = ensure().J!
      return { shape: [active.length, nv], get: (r, c) => J[r][c] }
    },
    step(dx: number[]) {
      z = z.map((v, i) => v + dx[i])
      atZ = null
      cand = null
    },
    fStep(dx: number[]) { return visit(dx).f },
    f0Step(dx: number[]) { return visit(dx).f0 },
  }
  try {
    new TrustRegionBarrierOptimizer(problem).optimize(10e-8, 10, opts.maxNumSteps ?? 12)
  } catch { /* guard below */ }
  const countAt = (zz: number[]) => {
    const gc = gFlat(zz)
    return gc ? rawCount(gc) : Number.POSITIVE_INFINITY
  }
  if (countAt(z) > startBound) {
    let lo = 0
    let hi = 1
    for (let it = 0; it < 22; it++) {
      const mid = (lo + hi) / 2
      const zm = z0v.map((v, i) => v + mid * (z[i] - v))
      if (countAt(zm) <= startBound) lo = mid
      else hi = mid
    }
    z = z0v.map((v, i) => v + lo * (z[i] - v))
  }
  const sFin = sOfZ(z) ?? { re: 1, im: 0 }
  const { wRe, wIm } = weightsOf(sFin.re, sFin.im)
  return {
    points: cps.map((_p, j) => ({ re: z[j], im: z[n + j], w_re: wRe[j], w_im: wIm[j] })),
    bound: countAt(z),
    startBound,
  }
}

/**
 * RATIONAL Farin-point drag — the 1-D sibling of slideComplexFarin: the handle
 * lives ON its edge at t = w₁/(w₀+w₁), so the drag is a single real ratio.
 * Same pure-weight semantics (suffix scaling; closed: wrapWeight scales along —
 * the monodromy absorbs the change) and the same direct Law-2 enforcement:
 * bisect toward the target t on the RAW count (open linear / closed cyclic).
 * In one dimension there are no lateral directions — no substitution, no
 * ratchet, by construction.
 */
export function slideRationalFarin(
  x: readonly number[],
  y: readonly number[],
  w: readonly number[],
  knots: readonly number[],
  degree: number,
  edge: number,
  tTarget: number,
  opts: { closed?: { wrapWeight: number } } = {},
): { weights: number[]; wrapWeight?: number; t: number } {
  const n = w.length
  const closed = opts.closed
  const isWrapEdge = !!closed && edge === n - 1
  const w0 = w[edge]
  const w1 = isWrapEdge ? closed!.wrapWeight : w[edge + 1]
  const r0 = w1 / w0
  const t0 = r0 / (1 + r0)
  const tT = Math.min(0.99, Math.max(0.01, tTarget))

  const weightsOf = (s: number): number[] =>
    w.map((v, j) => (!isWrapEdge && j >= edge + 1 ? v * s : v))
  const wrapOf = (s: number): number | undefined =>
    closed ? closed.wrapWeight * s : undefined
  const zeros = x.map(() => 0)
  const gOf = (s: number): number[] => {
    const ws = weightsOf(s)
    if (closed) {
      const rho = { re: wrapOf(s)! / ws[0], im: 0 }
      return curvatureExtremaNumeratorComplexPeriodic(x, y, ws, zeros, knots, degree, rho).flatCoeffs()
    }
    return curvatureExtremaNumeratorComplex(x, y, ws, zeros, knots, degree).flatCoeffs()
  }
  const rawCount = (gc: number[]) => cyclicSignChanges(assignSignsNeighbor(gc), !!closed)
  const startBound = rawCount(gOf(1))
  const sOfT = (t: number): number | null => {
    if (t <= 1e-6 || t >= 1 - 1e-6) return null
    const s = t / (1 - t) / r0
    return s > 1e-4 && s < 1e4 ? s : null
  }
  const feasible = (t: number): number | null => {
    const s = sOfT(t)
    if (s === null) return null
    return rawCount(gOf(s)) <= startBound ? s : null
  }

  let s = 1
  let t = t0
  const sFull = feasible(tT)
  if (sFull !== null) {
    s = sFull
    t = tT
  } else {
    let lo = 0
    let hi = 1
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2
      const tm = t0 + mid * (tT - t0)
      if (feasible(tm) !== null) lo = mid
      else hi = mid
    }
    t = t0 + lo * (tT - t0)
    s = sOfT(t) ?? 1
    if (rawCount(gOf(s)) > startBound) {
      s = 1
      t = t0
    }
  }
  const weights = weightsOf(s)
  const W = wrapOf(s)
  return { weights, ...(W !== undefined ? { wrapWeight: W } : {}), t }
}

