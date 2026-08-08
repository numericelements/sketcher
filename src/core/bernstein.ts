import { scalarCoeffs, type Coeffs } from './coeffs'
import { makeIndexing, deBoor } from './indexing'
import { findOpenSpan, findPeriodicSpan } from './basis'

// ============================================================================
// B-spline FUNCTION algebra in Bernstein form.
//
// A B-spline function f: ℝ → ℝ is stored as its per-span Bézier (Bernstein)
// coefficients. Add / subtract / multiply / derivative all return another such
// function — a closed algebra. This is the substrate for the curvature numerator
// g(t): its Bernstein coefficients' sign changes bound the curvature extrema
// (Schoenberg's variation-diminishing property).
// ============================================================================

/** Binomial coefficient C(n, k). */
// Memoized — bernsteinMultiply calls this ~27× per product over thousands of products
// per gradient build; recomputing the loop each time dominated the Bernstein hot path.
// The cached value is the SAME float the loop produces (bit-identical), just looked up.
const binomCache = new Map<number, number>()
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  const key = n * 1024 + k
  const cached = binomCache.get(key)
  if (cached !== undefined) return cached
  let r = 1
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1)
  binomCache.set(key, r)
  return r
}

/** Distinct knot values (breakpoints). */
function distinctKnots(knots: readonly number[], eps = 1e-10): number[] {
  const out: number[] = []
  for (const k of knots) {
    if (out.length === 0 || Math.abs(k - out[out.length - 1]) > eps) out.push(k)
  }
  return out
}

/**
 * The Bézier-span breakpoints of a scalar B-spline: the distinct knots, plus the
 * wrap break (first knot + one period) for a periodic curve. `breaks[s]..breaks[s+1]`
 * is span `s`; there are `breaks.length - 1` spans. Exposed so the local-gradient
 * seed builder can index spans WITHOUT decomposing the whole curve (it decomposes
 * only each control point's support spans — the difference between O(n) and O(n²)).
 */
export function bernsteinBreaks(knots: readonly number[], closed: boolean): number[] {
  const distinct = distinctKnots(knots)
  return closed ? [...distinct, distinct[0] + 1] : [...distinct]
}

/** Degree-elevate a single Bernstein polynomial to `targetDegree`. */
export function bernsteinElevate(coeffs: number[], targetDegree: number): number[] {
  let result = coeffs
  while (result.length - 1 < targetDegree) {
    const n = result.length - 1
    const elevated = new Array<number>(n + 2)
    for (let i = 0; i <= n + 1; i++) {
      const a = i / (n + 1)
      const prev = i > 0 ? result[i - 1] : 0
      const curr = i <= n ? result[i] : 0
      elevated[i] = a * prev + (1 - a) * curr
    }
    result = elevated
  }
  return result
}

/** Product of two Bernstein polynomials (on the same interval): degree p+q. */
export function bernsteinMultiply(f: number[], g: number[]): number[] {
  const p = f.length - 1
  const q = g.length - 1
  const fs = f.map((v, i) => v * binomial(p, i))
  const gs = g.map((v, j) => v * binomial(q, j))
  const out: number[] = []
  for (let k = 0; k <= p + q; k++) {
    let c = 0
    for (let i = Math.max(0, k - q); i <= Math.min(p, k); i++) c += fs[i] * gs[k - i]
    out[k] = c / binomial(p + q, k)
  }
  return out
}

/**
 * A B-spline function in Bernstein form: `coeffs[s]` are the degree-d Bézier
 * coefficients on span [breaks[s], breaks[s+1]].
 */
export class BernsteinDecomposition {
  readonly coeffs: number[][]
  readonly breaks: number[]

  constructor(coeffs: number[][], breaks: number[]) {
    this.coeffs = coeffs
    this.breaks = breaks
  }

  get degree(): number {
    return this.coeffs.length > 0 ? this.coeffs[0].length - 1 : 0
  }
  get numSpans(): number {
    return this.coeffs.length
  }

  private combine(other: BernsteinDecomposition, sign: 1 | -1): BernsteinDecomposition {
    const out: number[][] = []
    for (let s = 0; s < this.coeffs.length; s++) {
      let a = this.coeffs[s]
      let b = other.coeffs[s]
      const deg = Math.max(a.length, b.length) - 1
      if (a.length - 1 < deg) a = bernsteinElevate(a, deg)
      if (b.length - 1 < deg) b = bernsteinElevate(b, deg)
      out[s] = a.map((v, i) => v + sign * b[i])
    }
    return new BernsteinDecomposition(out, this.breaks)
  }

  add(other: BernsteinDecomposition): BernsteinDecomposition {
    return this.combine(other, 1)
  }
  subtract(other: BernsteinDecomposition): BernsteinDecomposition {
    return this.combine(other, -1)
  }

  /** Pointwise product f·g (degree adds), span by span. */
  multiply(other: BernsteinDecomposition): BernsteinDecomposition {
    const out = this.coeffs.map((c, s) => bernsteinMultiply(c, other.coeffs[s]))
    return new BernsteinDecomposition(out, this.breaks)
  }

  scale(value: number): BernsteinDecomposition {
    return new BernsteinDecomposition(
      this.coeffs.map((c) => c.map((v) => v * value)),
      this.breaks,
    )
  }

  /** Derivative f′ (degree − 1), accounting for each span's width. */
  derivative(): BernsteinDecomposition {
    const p = this.degree
    if (p === 0) {
      return new BernsteinDecomposition(this.coeffs.map(() => [0]), this.breaks)
    }
    const out: number[][] = []
    for (let s = 0; s < this.coeffs.length; s++) {
      const c = this.coeffs[s]
      const interval = this.breaks[s + 1] - this.breaks[s]
      const d: number[] = []
      for (let i = 0; i < p; i++) d.push((p * (c[i + 1] - c[i])) / interval)
      out.push(d)
    }
    return new BernsteinDecomposition(out, this.breaks)
  }

  /** Evaluate at parameter t (de Casteljau on the containing span). */
  evaluate(t: number): number {
    let s = 0
    while (s < this.breaks.length - 2 && t > this.breaks[s + 1]) s++
    const tA = this.breaks[s]
    const tB = this.breaks[s + 1]
    const u = tB === tA ? 0 : (t - tA) / (tB - tA)
    const work = [...this.coeffs[s]]
    for (let r = 1; r < work.length; r++) {
      for (let i = 0; i < work.length - r; i++) work[i] = (1 - u) * work[i] + u * work[i + 1]
    }
    return work[0]
  }

  /** All Bernstein coefficients, concatenated across spans. */
  flatCoeffs(): number[] {
    return this.coeffs.flat()
  }

  /** Restrict to spans [start, end) — used to exploit B-spline locality. */
  subset(start: number, end: number): BernsteinDecomposition {
    return new BernsteinDecomposition(this.coeffs.slice(start, end), this.breaks.slice(start, end + 1))
  }

  /**
   * Gather an explicit (possibly WRAPPING) list of spans into a compact
   * decomposition whose local span index k holds the coeffs of original span
   * `spans[k]`. Lets closed-curve locality keep only a control point's support
   * spans (which wrap the seam) instead of the full width. Synthetic integer
   * breaks — the result is used for span-by-span products, not parameter evaluation.
   */
  gather(spans: readonly number[]): BernsteinDecomposition {
    const breaks = spans.map((_, k) => k)
    breaks.push(spans.length)
    return new BernsteinDecomposition(spans.map((s) => this.coeffs[s]), breaks)
  }

  /**
   * Number of strict sign changes S⁻ in the Bernstein coefficients (zeros
   * skipped). By the variation-diminishing property this bounds the number of
   * zeros of f — for g(t) that is the bound on the number of curvature extrema.
   *
   * `cyclic` (for CLOSED/periodic g): also compare the last nonzero coefficient
   * back to the first, so the seam crossing is counted. A periodic g's zeros come
   * in EVEN number; the linear (non-cyclic) walk drops the seam crossing and can
   * report an odd count. Open curves are not periodic → leave `cyclic` false.
   */
  signChanges(cyclic = false): number {
    return cyclicSignChanges(this.flatCoeffs(), cyclic)
  }
}

/**
 * Strict sign changes in a sequence of ±1/0 signs (zeros skipped). `cyclic` adds
 * the seam crossing (last nonzero ↔ first nonzero) — use it for CLOSED/periodic
 * sign arrays so the count is even (the four-vertex / even-zero-count property),
 * not for open curves. Mirrors ne-core optimizer.rs `sign_changes(s, cyclic)`.
 */
export function cyclicSignChanges(signs: readonly number[], cyclic: boolean): number {
  let changes = 0
  let prev = 0
  let first = 0
  for (const v of signs) {
    const s = Math.sign(v)
    if (s === 0) continue
    if (prev === 0) first = s // first nonzero sign
    else if (s !== prev) changes++
    prev = s
  }
  if (cyclic && first !== 0 && prev !== first) changes++
  return changes
}

/**
 * A coefficient counts as a STRUCTURAL ZERO only when its magnitude is at the ROUNDOFF
 * level of the g computation — i.e. its sign is numerical noise, not real information.
 *
 * This MUST stay at machine-roundoff scale. g's coefficients span a huge dynamic range
 * (they blow up near clamped endpoints), so a larger "small relative to the max" floor
 * deletes genuine low-amplitude coefficients and makes S⁻ read BELOW the true number of
 * sign changes — a FALSE bound (CLAUDE.md, Law 3). The constant is MEASURED, not
 * guessed (E21, BigInt oracle): worst per-coefficient error ≈ 9ε·max, so 1e-14 sits
 * ~45× above it. SINCE E25 this floor never touches a SIGN — it survives only as
 * feasibility SLACK (structuralMarginsScaled: a practically-zero active coefficient
 * starts a hair off its wall) and in the inert row scale. E25's oracle specimen showed
 * why sign-rewriting is forbidden even at the honest level: on clustered knots the
 * structurally-tiny coefficients carry correct signs eleven orders above their own
 * errors, and reassigning them read the bound 14 where the exact count is 25.
 */
export const SIGN_NOISE_REL = 1e-14

/**
 * RAW strict signs of Bernstein coefficients (E25): every NONZERO coefficient keeps its
 * own computed sign; only an EXACT floating-point zero (whose sign genuinely does not
 * exist) takes its nearest neighbour's, so it joins its run for the optimizer without
 * adding a sign change. NO magnitude floor participates — E25's oracle specimen proved
 * a floor-based reassignment can ERASE real sign changes and read the bound BELOW the
 * true count (clustered knots: displayed 14 vs exact 25, with every double sign
 * correct; a global floor cannot tell "tiny because unresolvable" from "tiny because
 * the span is wide", F1). Raw signs err only at true machine zeros, and there only by
 * ADDING a spurious pair — loose is true; false is forbidden. The count's monotone
 * display under editing is the MECHANISM's guarantee (Theorem 2: actives held, anchors
 * forbid the all-flip, free interiors only merge), not a smoothing artifact. The noise
 * floor (SIGN_NOISE_REL) survives only as feasibility SLACK — see
 * structuralMarginsScaled. Returned signs use the optimizer's internal convention
 * (+v → −1, −v → +1); only sign CHANGES matter.
 */
export function assignSignsNeighbor(gc: number[]): number[] {
  const det = gc.map((v) => (v === 0 ? 0 : v > 0 ? -1 : 1))
  const out = det.slice()
  const n = det.length
  for (let i = 0; i < n; i++) {
    if (det[i] !== 0) continue
    let l = i - 1
    while (l >= 0 && det[l] === 0) l--
    let r = i + 1
    while (r < n && det[r] === 0) r++
    const dl = l >= 0 ? i - l : Infinity
    const dr = r < n ? r - i : Infinity
    out[i] = dl <= dr ? (l >= 0 ? det[l] : 1) : r < n ? det[r] : 1
    if (out[i] === 0) out[i] = 1
  }
  return out
}

/**
 * Decompose a scalar B-spline function into Bernstein form. One implementation
 * for open and periodic, via the unified de Boor blossom (Indexing handles the
 * topology). Each span's Bézier coefficients are the blossom values at the span
 * corners — exact. For periodic the spans are the distinct knots; the last wraps
 * to +period.
 */
function decomposeScalar(
  coeffs: readonly number[],
  knots: readonly number[],
  degree: number,
  closed: boolean,
): BernsteinDecomposition {
  // The ρ=1 real special case of the generic decomposition (scalarCoeffs ⇒ H=number,
  // no spiral). Delegates so the de Boor blossom loop lives in one place.
  const { coeffs: spanCoeffs, breaks } = decomposeBsplineGeneric(scalarCoeffs, coeffs, knots, degree, closed)
  return new BernsteinDecomposition(spanCoeffs, breaks)
}

/**
 * Generic Bernstein decomposition over ANY coefficient field (`Coeffs`): returns the
 * per-span homogeneous Bézier coefficients (in H-space) + breaks. The periodic wrap
 * AND the weight SPIRAL (`spiralRatio` ρ, applied per wrap by the indexing) live in
 * one place, so a quasi-periodic curve — W(t+P)=ρ·W(t) — decomposes correctly. The
 * scalar `decomposeScalar` is the ρ=1 real special case; complex-rational uses this
 * with `complexCoeffs` to get ρ-correct Z and W in one pass.
 */
export function decomposeBsplineGeneric<CP, H, S, Out>(
  coeffs: Coeffs<CP, H, S, Out>,
  controlPoints: readonly CP[],
  knots: readonly number[],
  degree: number,
  closed: boolean,
  spiralRatio?: S,
): { coeffs: H[][]; breaks: number[] } {
  const ix = makeIndexing(coeffs, controlPoints, knots, degree, closed, spiralRatio)
  const distinct = distinctKnots(knots)
  const breaks = closed ? [...distinct, distinct[0] + 1] : [...distinct]
  const numSpans = breaks.length - 1
  const spanCoeffs: H[][] = []
  for (let s = 0; s < numSpans; s++) {
    const a = breaks[s]
    const b = breaks[s + 1]
    const span = ix.span(a)
    const seg: H[] = []
    for (let j = 0; j <= degree; j++) {
      const args: number[] = []
      for (let m = 0; m < degree - j; m++) args.push(a)
      for (let m = 0; m < j; m++) args.push(b)
      seg.push(deBoor(ix, coeffs, span, degree, args))
    }
    spanCoeffs.push(seg)
  }
  return { coeffs: spanCoeffs, breaks }
}

/**
 * LOCALIZED Dirac decomposition (any coefficient field) — the O(n) heart of every
 * seed precompute. For each control point i it returns i's support Bézier spans
 * (ascending) and the per-span Bernstein coeffs of the Dirac basis Nᵢ on ONLY those
 * spans. Nᵢ is nonzero on just d+1 spans, so decomposing the full curve per control
 * point (the naive seed builders) is O(n²); this runs de Boor on the support spans
 * alone — O(n·d³) total — via a single reused impulse vector `e` (no per-column O(n)
 * allocation) and one indexing, so the de Boor / knot arithmetic is byte-for-byte the
 * same path as `decomposeBsplineGeneric`. Field-generic: scalar (polynomial seeds) and
 * complex-with-spiral (complex-rational seeds) share it. `oneCP`/`zeroCP` are the
 * impulse and background control-point values; `hNonzero` is the structural-zero test.
 */
export function localDiracDecompose<CP, H, S, Out>(
  coeffs: Coeffs<CP, H, S, Out>,
  oneCP: CP,
  zeroCP: CP,
  hNonzero: (h: H) => boolean,
  knots: readonly number[],
  degree: number,
  n: number,
  closed: boolean,
  spiralRatio?: S,
): { spans: number[]; niCoeffs: H[][] }[] {
  const breaks = bernsteinBreaks(knots, closed)
  const numSpans = breaks.length - 1
  // knot-span index of each Bézier span (open: strictly increasing; periodic: in the
  // CP index space mod n).
  const spanKnot = new Array<number>(numSpans)
  for (let s = 0; s < numSpans; s++) {
    spanKnot[s] = closed ? findPeriodicSpan(knots, breaks[s]) : findOpenSpan(degree, knots, breaks[s])
  }
  // periodic: CP-index (mod n) → Bézier spans read at that index, for O(d) candidate
  // lookup per column instead of an O(numSpans) scan.
  const spansByCp = new Map<number, number[]>()
  if (closed) {
    for (let s = 0; s < numSpans; s++) {
      const v = ((spanKnot[s] % n) + n) % n
      const list = spansByCp.get(v)
      if (list) list.push(s)
      else spansByCp.set(v, [s])
    }
  }
  const e = new Array<CP>(n).fill(zeroCP) // reused impulse — allocated ONCE, not per column
  const ix = makeIndexing(coeffs, e, knots, degree, closed, spiralRatio)
  // Bézier coeffs of the current impulse on one span (de Boor blossom at the corners) —
  // the exact per-span body of decomposeBsplineGeneric.
  const decompSpan = (s: number): H[] => {
    const a = breaks[s], b = breaks[s + 1]
    const span = spanKnot[s]
    const seg = new Array<H>(degree + 1)
    for (let j = 0; j <= degree; j++) {
      const args = new Array<number>(degree)
      for (let m = 0; m < degree - j; m++) args[m] = a
      for (let m = 0; m < j; m++) args[degree - j + m] = b
      seg[j] = deBoor(ix, coeffs, span, degree, args)
    }
    return seg
  }
  const out: { spans: number[]; niCoeffs: H[][] }[] = []
  let lo = 0, hi = 0 // open: monotone two-pointer over the [i, i+degree] value window
  for (let i = 0; i < n; i++) {
    let cand: number[]
    if (closed) {
      const set = new Set<number>()
      for (let r = 0; r <= degree; r++) {
        const list = spansByCp.get((i + r) % n)
        if (list) for (const s of list) set.add(s)
      }
      cand = [...set].sort((p, q) => p - q)
    } else {
      while (lo < numSpans && spanKnot[lo] < i) lo++
      while (hi < numSpans && spanKnot[hi] <= i + degree) hi++
      cand = []
      for (let s = lo; s < hi; s++) cand.push(s)
    }
    e[i] = oneCP
    const spans: number[] = []
    const niCoeffs: H[][] = []
    for (const s of cand) {
      const seg = decompSpan(s)
      if (seg.some(hNonzero)) { spans.push(s); niCoeffs.push(seg) } // structural-zero trim (1e-14)
    }
    e[i] = zeroCP
    out.push({ spans, niCoeffs })
  }
  return out
}

/** Bernstein decomposition of an open (clamped) scalar B-spline function. */
export function decomposeToBernstein(
  coeffs: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  return decomposeScalar(coeffs, knots, degree, false)
}

/**
 * Bernstein decomposition of a PERIODIC scalar B-spline function (one period;
 * knots in [0,1) starting at 0), over [0,1). Spans are the distinct knots; the
 * last wraps to +period.
 */
export function decomposeToBernsteinPeriodic(
  coeffs: readonly number[],
  knots: readonly number[],
  degree: number,
): BernsteinDecomposition {
  return decomposeScalar(coeffs, knots, degree, true)
}

// ----------------------------------------------------------------------------
// de Casteljau on a single Bézier's coefficients (the ONE shared implementation;
// curvature.ts's sign-change locator and phValueBound.ts's certificate subdivision
// both route through these instead of hand-rolling their own splits).
// ----------------------------------------------------------------------------

/** Split a Bézier `c` at parameter u (de Casteljau): [left on [0,u], right on [u,1]]. */
export function splitBezierAt(c: readonly number[], u: number): [number[], number[]] {
  const n = c.length
  const work = c.slice()
  const left = [work[0]]
  const right = [work[n - 1]]
  for (let r = 1; r < n; r++) {
    for (let i = 0; i < n - r; i++) work[i] = (1 - u) * work[i] + u * work[i + 1]
    left.push(work[0])
    right.unshift(work[n - 1 - r])
  }
  return [left, right]
}

/**
 * The sub-Bézier of `c` (on [0,1]) restricted to [lo,hi] — extracted from the ORIGINAL
 * coefficients in a single two-sided de Casteljau (split at hi, keep left; then split
 * that at lo/hi, keep right), never by compounding earlier neighbour splits (compounding
 * near g's huge clamped-endpoint coefficients manufactures phantom signs — F1).
 */
export function subBezierOn(c: readonly number[], lo: number, hi: number): number[] {
  const onHi = splitBezierAt(c, hi)[0] // Bézier on [0, hi]
  return hi <= lo ? onHi : splitBezierAt(onHi, lo / hi)[1] // restrict to [lo, hi]
}
