// ============================================================================
// SPATIAL PH QUINTIC — C¹ Hermite interpolation, in CLOSED FORM.
//
// The next rung after phSpatialCubic, and structurally the same thing one link
// longer. See docs/PH_SANDWICH_CHAIN.md; the short version:
//
//   A spatial PH interpolation problem is a CHAIN of sandwich equations XuX* = v.
//   Each link has a CIRCLE of solutions, and the hodograph depends only on the
//   DIFFERENCES of the angles — so k+1 links give a k-dimensional TORUS.
//
//   cubic    2 links (tangent, closure)              → 1 angle  → a circle
//   quintic  3 links (two tangents, closure)         → 2 angles → a torus
//
// So there is NOTHING TO SOLVE here — no Newton, no continuation. Given the two
// angles you evaluate a formula. That is the whole module.
//
// Source: Farouki, Giannelli, Manni, Sestini, "Identification of spatial PH quintic
// Hermite interpolants with near-optimal shape measures", CAGD 25 (2008) 274–297,
// equations (47)–(55). Their nᵢ = (δᵢ+u)/|δᵢ+u| is exactly our quatFromSandwich.
//
// THE THREE LINKS
//
//     A₀ i A₀* = dᵢ      →  A₀ = √|dᵢ|·nᵢ·exp(φ₀i)
//     A₂ i A₂* = d_f     →  A₂ = √|d_f|·n_f·exp(φ₂i)
//     B  i B*  = d       →  B  = √|d|·n·exp(φ₁i),   B = 3A₀ + 4A₁ + 3A₂
//
//                           d = c + 5(A₀iA₂* + A₂iA₀*),  c = 120Δp − 15(dᵢ+d_f)
//                           A₁ = ¼B − ¾(A₀ + A₂)
//
// The third link IS the closure condition. Writing B for 3A₀+4A₁+3A₂ and expanding
// the sandwich of a sum,
//
//     sand(B)      = 9 sand(A₀) + 16 sand(A₁) + 9 sand(A₂)
//                    + 12 polar(A₀,A₁) + 9 polar(A₀,A₂) + 12 polar(A₁,A₂)
//     120·Δp       = 24 sand(A₀) + 16 sand(A₁) + 24 sand(A₂)
//                    + 12 polar(A₀,A₁) + 4 polar(A₀,A₂) + 12 polar(A₁,A₂)
//
// and subtracting leaves sand(B) = 120Δp − 15(dᵢ+d_f) + 5 polar(A₀,A₂) = d, with
// every A₁ term gone. That cancellation is why the closure collapses to one
// sandwich instead of needing a solve — and it is pinned in the tests, not trusted.
//
// ONLY DIFFERENCES MATTER, so φ₁ = 0 without loss and the two essential parameters
// are α = ½(φ₀+φ₂) and β = φ₂−φ₀.
//
// AND α CANNOT CHANGE THE ARC LENGTH. Because exp(θi) commutes with i,
//
//     A₀ i A₂* = √(|dᵢ||d_f|) · nᵢ · i·exp(−βi) · n_f*
//
// — α cancels, so d depends on β alone, hence |d|, hence L. That is the quintic's
// version of the cubic's isometry (which depends on nothing at all), and it is the
// sharpest available check that this construction is implemented correctly: on an
// (α,β) heatmap, arc length MUST show as horizontal banding.
// ============================================================================
import {
  type Quat,
  type Vec3,
  QUAT_I,
  gaugeRotate,
  qmul,
  polarSandwich,
  qadd,
  qnormSq,
  qscale,
  qsub,
  quatFromSandwich,
  sandwich,
  vadd,
  vscale,
  vsub,
} from './quaternion'

/** A(t) = A₀B₀²(t) + A₁B₁²(t) + A₂B₂²(t), and r′ = A i A*. */
export interface SpatialPHQuintic {
  readonly A0: Quat
  readonly A1: Quat
  readonly A2: Quat
  readonly p0: Vec3
}

/** First-order Hermite data: endpoints and end derivatives. */
export interface SpatialHermiteData {
  readonly pi: Vec3
  readonly pf: Vec3
  readonly di: Vec3
  readonly df: Vec3
}

const qdot = (a: Quat, b: Quat): number => a.u * b.u + a.v * b.v + a.p * b.p + a.q * b.q

/**
 * Bernstein weights of the SQUARE: [A²]ⱼ = Σ_{a+b=j} C(2,a)C(2,b)/C(4,j) · A_a·A_b.
 * Indexed [j][a]; entries outside 0 ≤ j−a ≤ 2 are zero.
 */
const SQUARE_W: readonly (readonly number[])[] = [
  [1, 0, 0],
  [1 / 2, 1 / 2, 0],
  [1 / 6, 4 / 6, 1 / 6],
  [0, 1 / 2, 1 / 2],
  [0, 0, 1],
]

// ---------------------------------------------------------------------------
// GAUGE REFERENCES — what (α, β) are angles FROM
//
// α and β are only meaningful relative to a chosen representative at each end. The
// default choice, quatFromSandwich, builds one from h = normalise(x̂ + δ̂) — which
// DEGENERATES when a tangent points at −x̂ and flips to a perpendicular axis. Fine
// for a static curve; fatal while dragging, because at that instant a fixed (α, β)
// starts naming a different curve and the picture jumps.
//
// So a figure that lets the data move must TRANSPORT its references: keep the
// previous ones and rotate each new one to the nearest gauge. That is not a fudge —
// it is the honest statement that the parameterisation is relative, and transporting
// it is the same idea as the monodromy elsewhere in this deck.
// ---------------------------------------------------------------------------

/** The representatives α and β are measured from, one per end. */
export interface GaugeRefs {
  readonly base0: Quat
  readonly base2: Quat
}

/**
 * Rotate `base` around its gauge circle to the representative closest to
 * `previous`. Maximising ⟨base·exp(θi), previous⟩ over θ is a single atan2, since
 * the objective is cos θ·⟨base,prev⟩ + sin θ·⟨base·i,prev⟩.
 */
export function alignedGauge(base: Quat, previous: Quat): Quat {
  const bi = qmul(base, QUAT_I)
  return gaugeRotate(base, Math.atan2(qdot(bi, previous), qdot(base, previous)))
}

/** References for this data, transported from `previous` when there is one. */
export function gaugeRefsFor(data: SpatialHermiteData, previous?: GaugeRefs | null): GaugeRefs | null {
  const b0 = quatFromSandwich(data.di)
  const b2 = quatFromSandwich(data.df)
  if (b0 === null || b2 === null) return null
  if (!previous) return { base0: b0, base2: b2 }
  return { base0: alignedGauge(b0, previous.base0), base2: alignedGauge(b2, previous.base2) }
}

/**
 * THE CONSTRUCTION — [FGMS08] (49)–(55). Returns null only on degenerate data:
 * a vanishing end derivative, or a vanishing closure vector d.
 *
 * α and β are angles; the family is a torus (see the identifications pinned in the
 * tests). Nothing here iterates.
 *
 * Pass `refs` to measure the angles from transported representatives instead of the
 * default ones — required by anything that lets the data move (see GaugeRefs).
 */
export function interpolateSpatialQuintic(
  data: SpatialHermiteData,
  alpha: number,
  beta: number,
  refs?: GaugeRefs | null,
): SpatialPHQuintic | null {
  const { pi, pf, di, df } = data

  // Links 1 and 2 — the tangents. quatFromSandwich is the φ = 0 representative.
  const base0 = refs ? refs.base0 : quatFromSandwich(di)
  const base2 = refs ? refs.base2 : quatFromSandwich(df)
  if (base0 === null || base2 === null) return null
  const A0 = gaugeRotate(base0, alpha - beta / 2)
  const A2 = gaugeRotate(base2, alpha + beta / 2)

  // Link 3 — the closure, which is a sandwich too. φ₁ = 0 without loss.
  const c = vsub(vscale(vsub(pf, pi), 120), vscale(vadd(di, df), 15))
  const d = vadd(c, vscale(polarSandwich(A0, A2), 5))
  const B = quatFromSandwich(d)
  if (B === null) return null

  const A1 = qsub(qscale(B, 1 / 4), qscale(qadd(A0, A2), 3 / 4))
  return { A0, A1, A2, p0: pi }
}

/** The closure vector d. Exposed because the α-independence claim is about it. */
export function closureVector(data: SpatialHermiteData, alpha: number, beta: number): Vec3 | null {
  const { pi, pf, di, df } = data
  const base0 = quatFromSandwich(di)
  const base2 = quatFromSandwich(df)
  if (base0 === null || base2 === null) return null
  const A0 = gaugeRotate(base0, alpha - beta / 2)
  const A2 = gaugeRotate(base2, alpha + beta / 2)
  const c = vsub(vscale(vsub(pf, pi), 120), vscale(vadd(di, df), 15))
  return vadd(c, vscale(polarSandwich(A0, A2), 5))
}

export function generatorAt(q: SpatialPHQuintic, t: number): Quat {
  const s = 1 - t
  const b = [s * s, 2 * s * t, t * t]
  const A = [q.A0, q.A1, q.A2]
  let acc: Quat = { u: 0, v: 0, p: 0, q: 0 }
  for (let k = 0; k < 3; k++) acc = qadd(acc, qscale(A[k], b[k]))
  return acc
}

/** The five degree-4 Bernstein coefficients of r′ = A i A*. */
export function hodographCoefficients(q: SpatialPHQuintic): Vec3[] {
  const A = [q.A0, q.A1, q.A2]
  const out: Vec3[] = []
  for (let j = 0; j < 5; j++) {
    let acc: Vec3 = { x: 0, y: 0, z: 0 }
    for (let a = 0; a <= 2; a++) {
      const b = j - a
      if (b < 0 || b > 2 || a > b) continue
      const w = SQUARE_W[j][a]
      if (w === 0) continue
      // a < b contributes the polarization A_a i A_b* + A_b i A_a*; a === b the
      // sandwich itself. Same weight either way, since C(2,a)C(2,b) is symmetric.
      acc = vadd(acc, vscale(a === b ? sandwich(A[a]) : polarSandwich(A[a], A[b]), w))
    }
    out.push(acc)
  }
  return out
}

/** The five degree-4 Bernstein coefficients of σ = |A|², which is r′'s speed. */
export function speedCoefficients(q: SpatialPHQuintic): number[] {
  const A = [q.A0, q.A1, q.A2]
  const out: number[] = []
  for (let j = 0; j < 5; j++) {
    let acc = 0
    for (let a = 0; a <= 2; a++) {
      const b = j - a
      if (b < 0 || b > 2 || a > b) continue
      const w = SQUARE_W[j][a]
      if (w === 0) continue
      acc += w * (a === b ? qnormSq(A[a]) : 2 * qdot(A[a], A[b]))
    }
    out.push(acc)
  }
  return out
}

/** The six control points: P₀ = p₀, then P_{k+1} = P_k + dₖ/5. */
export function controlPoints(q: SpatialPHQuintic): Vec3[] {
  const d = hodographCoefficients(q)
  const pts: Vec3[] = [q.p0]
  for (let k = 0; k < 5; k++) pts.push(vadd(pts[k], vscale(d[k], 1 / 5)))
  return pts
}

export function hodographAt(q: SpatialPHQuintic, t: number): Vec3 {
  return sandwich(generatorAt(q, t))
}

/** |r′(t)| — a POLYNOMIAL, which is the whole point of a PH curve. */
export function speedAt(q: SpatialPHQuintic, t: number): number {
  return qnormSq(generatorAt(q, t))
}

export function curveAt(q: SpatialPHQuintic, t: number): Vec3 {
  const pts = controlPoints(q)
  // de Casteljau on the six control points.
  const work = pts.map((p) => ({ ...p }))
  for (let r = 1; r < 6; r++) {
    for (let k = 0; k < 6 - r; k++) {
      work[k] = vadd(vscale(work[k], 1 - t), vscale(work[k + 1], t))
    }
  }
  return work[0]
}

/**
 * EXACT arc length: L = ∫₀¹ |A|² dt, and the integral of a degree-4 Bernstein
 * polynomial is the mean of its coefficients. No quadrature.
 */
export function arcLength(q: SpatialPHQuintic): number {
  const s = speedCoefficients(q)
  return s.reduce((a, b) => a + b, 0) / 5
}

/** Eigenvalues of a symmetric 3×3, largest first (the standard closed form). */
function symmetricEigenvalues(m: readonly number[][]): [number, number, number] {
  const p1 = m[0][1] ** 2 + m[0][2] ** 2 + m[1][2] ** 2
  const tr = m[0][0] + m[1][1] + m[2][2]
  if (p1 === 0) {
    const d = [m[0][0], m[1][1], m[2][2]].sort((a, b) => b - a)
    return [d[0], d[1], d[2]]
  }
  const qq = tr / 3
  const p2 = (m[0][0] - qq) ** 2 + (m[1][1] - qq) ** 2 + (m[2][2] - qq) ** 2 + 2 * p1
  const p = Math.sqrt(p2 / 6)
  const b = m.map((row, i) => row.map((v, j) => (v - (i === j ? qq : 0)) / p))
  const det =
    b[0][0] * (b[1][1] * b[2][2] - b[1][2] * b[2][1]) -
    b[0][1] * (b[1][0] * b[2][2] - b[1][2] * b[2][0]) +
    b[0][2] * (b[1][0] * b[2][1] - b[1][1] * b[2][0])
  const r = Math.min(1, Math.max(-1, det / 2))
  const phi = Math.acos(r) / 3
  const e1 = qq + 2 * p * Math.cos(phi)
  const e3 = qq + 2 * p * Math.cos(phi + (2 * Math.PI) / 3)
  return [e1, tr - e1 - e3, e3]
}

/**
 * How far from planar, in [0, 1]: the ratio of the smallest to the largest singular
 * value of the 5×3 matrix of legs. Zero exactly when the legs span a plane, which
 * for a Bézier curve is exactly when the curve is planar. Scale-free.
 *
 * Note this is a DIFFERENT normalisation from the cubic's `planarity` (a signed leg
 * determinant); four points admit a determinant, six do not.
 */
export function planarity(q: SpatialPHQuintic): number {
  const legs = hodographCoefficients(q)
  const g = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (const l of legs) {
    const v = [l.x, l.y, l.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g[i][j] += v[i] * v[j]
  }
  const [hi, , lo] = symmetricEigenvalues(g)
  if (hi <= 0) return 0
  return Math.sqrt(Math.max(0, lo) / hi)
}

// ---------------------------------------------------------------------------
// THE α-ELLIPSES, and how four isolated planar members come out of two surfaces
//
// EVERY control point is a SINGLE HARMONIC in α — measured to 1e-16, and the reason
// is structural: sand(A₀) = dᵢ and polar(A₀,A₂) are α-free (that is the gate), so the
// only α-dependence anywhere sits in cross terms with B, which are LINEAR in
// A₀ ~ exp(iα). Nothing quadratic in α survives. So at fixed β,
//
//     Pⱼ(α) = cⱼ + (first harmonic)   →   an exact ELLIPSE
//
// and the swept surface is a STACK OF ELLIPSES indexed by β. Slide 6's fiber is one
// of these ellipses; slide 7 adds the dial that moves through the stack.
//
// WHICH EXPLAINS THE FOUR POINTS. A surface cut by a plane gives a CURVE, so "the
// planar members are where the P₂ surface meets the data plane" cannot be right. It
// is not one condition but TWO:
//
//     P₂ in the plane   AND   P₃ in the plane
//
// (P₀,P₁,P₄,P₅ are already in it for coplanar data, and four points fix a plane.)
// Each condition alone cuts a curve out of the torus; the planar interpolants are
// where the two curves CROSS. Two conditions, two parameters ⇒ dimension zero ⇒
// isolated points, and the count is four.
//
// Concretely: at any β the P₂ ellipse pierces the plane at two α, and so does the P₃
// ellipse — generically at DIFFERENT α, which is why the curve is not planar. At four
// spots they coincide. That coincidence is the whole mechanism, and it is visible.
// ---------------------------------------------------------------------------

/** a + b·cos α + c·sin α — the exact α-dependence of any scalar built from a control point. */
export interface AlphaHarmonic {
  readonly a: number
  readonly b: number
  readonly c: number
}

/**
 * The signed height of control point `index` above a plane, as a function of α at
 * fixed β. EXACT with three samples, because the dependence is exactly one harmonic
 * (pinned in the tests) — this is not a fit.
 */
export function alphaHeightHarmonic(
  data: SpatialHermiteData,
  beta: number,
  index: number,
  planeNormal: Vec3,
  planeOrigin: Vec3,
): AlphaHarmonic | null {
  const h: number[] = []
  for (let k = 0; k < 3; k++) {
    const q = interpolateSpatialQuintic(data, (2 * Math.PI * k) / 3, beta)
    if (q === null) return null
    const p = controlPoints(q)[index]
    const d = vsub(p, planeOrigin)
    h.push(d.x * planeNormal.x + d.y * planeNormal.y + d.z * planeNormal.z)
  }
  return {
    a: (h[0] + h[1] + h[2]) / 3,
    b: (2 * h[0] - h[1] - h[2]) / 3,
    c: (h[1] - h[2]) / Math.sqrt(3),
  }
}

/**
 * The α at which control point `index` pierces the plane, at this β. Zero or two of
 * them — a single harmonic cannot do better, which is why the picture stays legible.
 */
export function planeCrossingAngles(
  data: SpatialHermiteData,
  beta: number,
  index: number,
  planeNormal: Vec3,
  planeOrigin: Vec3,
): number[] {
  const harm = alphaHeightHarmonic(data, beta, index, planeNormal, planeOrigin)
  if (harm === null) return []
  const { a, b, c } = harm
  const r = Math.hypot(b, c)
  if (r === 0 || Math.abs(a) > r) return []
  const phi = Math.atan2(c, b)
  const w = Math.acos(Math.min(1, Math.max(-1, -a / r)))
  const wrap = (x: number): number => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return [wrap(phi + w), wrap(phi - w)]
}

/**
 * The (α, β) of the planar interpolants, for COPLANAR data. Four of them.
 *
 * β ∈ {0, π} is forced: a planar curve needs A(t) ∈ span{1,k} up to a global gauge,
 * and for in-plane data nᵢ is pure and lies in span{i,j}, so nᵢ·exp(φi) enters
 * span{1,k} only when cos φ = 0. Hence φ₀, φ₂ ∈ {±π/2} and β = φ₂ − φ₀ ∈ {0, ±π}.
 * The α are then read off as the plane crossings, which at those β coincide for P₂
 * and P₃ — that coincidence being exactly what planarity means.
 *
 * Returns [] for data that is not coplanar, rather than pretending.
 */
export function planarMemberAngles(data: SpatialHermiteData): [number, number][] {
  const spanA = vsub(data.pf, data.pi)
  const normal = {
    x: spanA.y * data.di.z - spanA.z * data.di.y,
    y: spanA.z * data.di.x - spanA.x * data.di.z,
    z: spanA.x * data.di.y - spanA.y * data.di.x,
  }
  const nlen = Math.hypot(normal.x, normal.y, normal.z)
  if (nlen === 0) return []
  const unit = vscale(normal, 1 / nlen)
  // d_f must lie in that plane too, or the data is not coplanar at all.
  const scale = Math.hypot(data.df.x, data.df.y, data.df.z)
  const off = Math.abs(data.df.x * unit.x + data.df.y * unit.y + data.df.z * unit.z)
  if (scale === 0 || off / scale > 1e-9) return []

  const out: [number, number][] = []
  for (const beta of [0, Math.PI]) {
    for (const alpha of planeCrossingAngles(data, beta, 2, unit, data.pi)) {
      out.push([alpha, beta])
    }
  }
  return out
}

/** The Hermite data a quintic actually realises — for asserting it interpolates. */
export function hermiteDataOf(q: SpatialPHQuintic): SpatialHermiteData {
  const pts = controlPoints(q)
  return {
    pi: pts[0],
    pf: pts[5],
    di: hodographAt(q, 0),
    df: hodographAt(q, 1),
  }
}

/** The angle from `base` to `a` around the gauge circle they share. */
function gaugeAngle(base: Quat, a: Quat): number {
  return Math.atan2(qdot(qmul(base, QUAT_I), a), qdot(base, a))
}

/**
 * Read (α, β) back off a curve — the inverse of interpolateSpatialQuintic, needed to
 * re-enter slider mode after a free drag without the curve jolting.
 *
 * A freely-built curve carries an arbitrary global gauge, so φ₁ is not 0. Since only
 * differences matter, subtract it from all three before forming α and β; that is what
 * makes this an exact round trip rather than an approximation.
 */
export function anglesOf(
  q: SpatialPHQuintic,
  refs: GaugeRefs,
): { readonly alpha: number; readonly beta: number } {
  const B = qadd(qadd(qscale(q.A0, 3), qscale(q.A1, 4)), qscale(q.A2, 3))
  const baseB = quatFromSandwich(sandwich(B))
  const phi1 = baseB === null ? 0 : gaugeAngle(baseB, B)
  const phi0 = gaugeAngle(refs.base0, q.A0) - phi1
  const phi2 = gaugeAngle(refs.base2, q.A2) - phi1
  return { alpha: (phi0 + phi2) / 2, beta: phi2 - phi0 }
}
