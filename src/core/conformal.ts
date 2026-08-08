// ============================================================================
// THE CONFORMAL MODEL OF R³ — where Möbius transformations become LINEAR.
//
// The same device as homogeneous coordinates, one level up. Points of R³ are represented
// as NULL VECTORS in a five-dimensional space carrying a signature-(4,1) inner product,
// in the basis { o, e₁, e₂, e₃, ∞ }:
//
//     P(x) = o + x + ½‖x‖²∞          ⟨A,B⟩ = a·b − (a_o b_∞ + a_∞ b_o)
//
// Three facts make it worth the extra coordinate:
//
//   1. ⟨P(x), P(y)⟩ = −½‖x − y‖²  —  DISTANCE IS AN INNER PRODUCT. So the maps preserving
//      the inner product, O(4,1), are exactly the Möbius transformations of R³ ∪ ∞.
//      Angles survive because inner products do; distances do not, because null vectors
//      have arbitrary scale.
//
//   2. A sphere and a plane are the SAME KIND OF OBJECT — one vector — which is why
//      Möbius maps interchange them. The sphere of centre c and radius ρ is
//      S = P(c) − ½ρ²∞, with ⟨S,S⟩ = ρ².
//
//   3. INVERSION IS A REFLECTION in that vector, X ↦ X − 2⟨X,S⟩S/⟨S,S⟩ — a constant 5×5
//      matrix. (That is also why the normalized differential in core/phMobius came out as
//      a Householder reflection of R³: it is the shadow of this five-dimensional one.)
//
// AND THE PROJECTIVE MODEL SITS INSIDE IT. Recovering the point is
//
//     x = (a₁, a₂, a₃)/a_o
//
// which is plain de-homogenization: a_o is the weight and (a₁,a₂,a₃) the weighted point,
// exactly as in a rational Bézier. The fifth coordinate is DETERMINED by the null
// condition and carries no freedom. So there is no conversion to write — the first four
// conformal coordinates ARE ordinary rational homogeneous coordinates.
//
// THE DEGREE LAW. A real rational curve of degree n with homogeneous coordinates (p : p_o)
// lifts to the POLYNOMIAL null 5-vector
//
//     P̃ = ( 2p_o² , 2p_o·p , ‖p‖² )        degree 2n, null identically
//
// so the lift DOUBLES the degree, and a Möbius transformation — a constant matrix —
// preserves it. Projecting therefore gives degree ≤ 2n, which is exactly the 7 → 14
// doubling measured three independent ways in core/phMobius (via ‖r−c‖², via the generator
// law, and here).
//
// AND IT SAYS WHEN THE DEGREE DOES NOT RISE: a map raises it only if it MOVES ∞.
// Similarities fix ∞ and stay within the old degree; the inversive transformations move it
// and double. Measured: translation leaves ∞ exactly fixed, every inversion displaces it.
// That is the same split the Lie-sphere lab makes when it groups its generators.
//
// (The 2D shadow of all this is the familiar "a complex rational curve of degree n is a
// real rational one of degree 2n". CP¹ IS the conformal model of the plane, so that
// doubling is this doubling, and the Möbius-invariance of complex rational curves is not a
// property of complex numbers but of the conformal lift.)
//
// ONE CAUTION. The null condition means lifted control points are not free — they lie on a
// quadric cone, so any direct manipulation would have to project back onto it after every
// move. This representation is a computational device for linearising Möbius, not a UI.
// ============================================================================
import { type Vec3, vnorm, vsub } from './quaternion'

/** A vector of the conformal model, in the basis { o, e₁, e₂, e₃, ∞ }. */
export type Conformal = readonly [number, number, number, number, number]

/** ⟨A,B⟩ for the signature-(4,1) form. */
export function innerProduct(a: Conformal, b: Conformal): number {
  return a[1] * b[1] + a[2] * b[2] + a[3] * b[3] - (a[0] * b[4] + a[4] * b[0])
}

/** P(x) = o + x + ½‖x‖²∞ — a null vector. */
export function lift(x: Vec3): Conformal {
  return [1, x.x, x.y, x.z, 0.5 * (x.x * x.x + x.y * x.y + x.z * x.z)]
}

/**
 * The polynomial lift of a RATIONAL point (p : p_o): P̃ = (2p_o², 2p_o·p, ‖p‖²).
 * Null identically, and of twice the degree — the degree law above.
 */
export function liftHomogeneous(p: Vec3, weight: number): Conformal {
  const n2 = p.x * p.x + p.y * p.y + p.z * p.z
  return [2 * weight * weight, 2 * weight * p.x, 2 * weight * p.y, 2 * weight * p.z, n2]
}

/** x = (a₁,a₂,a₃)/a_o — plain de-homogenization. Null at a_o = 0, i.e. the point ∞. */
export function project(a: Conformal): Vec3 | null {
  if (a[0] === 0) return null
  return { x: a[1] / a[0], y: a[2] / a[0], z: a[3] / a[0] }
}

/** The sphere of centre c and radius ρ: S = P(c) − ½ρ²∞, with ⟨S,S⟩ = ρ². */
export function sphereVector(centre: Vec3, radius: number): Conformal {
  return [
    1, centre.x, centre.y, centre.z,
    0.5 * (centre.x * centre.x + centre.y * centre.y + centre.z * centre.z - radius * radius),
  ]
}

/** Reflection in a vector — and for a sphere vector, that IS inversion in the sphere. */
export function reflectIn(X: Conformal, S: Conformal): Conformal | null {
  const denom = innerProduct(S, S)
  if (denom === 0) return null
  const k = (2 * innerProduct(X, S)) / denom
  return [X[0] - k * S[0], X[1] - k * S[1], X[2] - k * S[2], X[3] - k * S[3], X[4] - k * S[4]]
}

/** Translation as a linear map on conformal vectors — a similarity, so it fixes ∞. */
export function translate(X: Conformal, t: Vec3): Conformal {
  const n2 = t.x * t.x + t.y * t.y + t.z * t.z
  return [
    X[0],
    X[1] + X[0] * t.x,
    X[2] + X[0] * t.y,
    X[3] + X[0] * t.z,
    X[4] + X[1] * t.x + X[2] * t.y + X[3] * t.z + 0.5 * n2 * X[0],
  ]
}

export const POINT_AT_INFINITY: Conformal = [0, 0, 0, 0, 1]

/**
 * THE DEGREE CRITERION: how far a map displaces ∞.
 *
 * Zero means the map is a similarity and the projected degree is unchanged; nonzero means
 * it is genuinely inversive and the degree doubles. This is the honest way to ask "will
 * this transformation raise my degree", and it is one line rather than a degree fit.
 */
export function infinityDisplacement(apply: (X: Conformal) => Conformal | null): number {
  const image = apply(POINT_AT_INFINITY)
  if (!image) return NaN
  return Math.max(Math.abs(image[0]), Math.abs(image[1]), Math.abs(image[2]), Math.abs(image[3]))
}

/** How far from null a vector is, relative to its size — the quadric-cone check. */
export function nullDefect(a: Conformal): number {
  const scale = Math.max(...a.map(Math.abs))
  if (scale === 0) return 0
  return Math.abs(innerProduct(a, a)) / (scale * scale)
}

/** Distance recovered from the inner product — the identity that makes the model work. */
export function distanceFromInnerProduct(a: Conformal, b: Conformal): number {
  return Math.sqrt(Math.max(0, -2 * innerProduct(a, b)))
}

/** Convenience for tests and callers: the Euclidean distance, for comparison. */
export const euclideanDistance = (x: Vec3, y: Vec3): number => vnorm(vsub(x, y))

// ---------------------------------------------------------------------------
// FROM A MÖBIUS TRANSFORMATION TO THE IMAGE'S RATIONAL BÉZIER DATA
//
// This is where the model pays for itself. Because a Möbius transformation is a CONSTANT
// matrix M, and the Bernstein basis functions are scalars,
//
//     M · Σₖ Cₖ Bₖᴺ(t)  =  Σₖ (M Cₖ) Bₖᴺ(t)
//
// M acts on each Bernstein coefficient INDEPENDENTLY. So computing the control polygon of
// a Möbius image is N+1 matrix–vector products and N+1 divisions — no resultants, no
// reparameterisation, no fitting. Read the weight off the o-component and the control
// point off the vector part, exactly as for any rational Bézier.
//
// A useful tell falls out: the o-component of the plain lift is the CONSTANT polynomial 1,
// so a polynomial curve has all weights equal to 1. A similarity leaves that component
// alone and the weights stay equal — the curve is still polynomial. An inversion turns it
// into something of degree 2n and the weights genuinely vary. So "are the weights
// constant?" is the degree criterion again, now visible in the coefficients.
// ---------------------------------------------------------------------------

import { bernsteinElevate, bernsteinMultiply } from './bernstein'

/** A linear map of the conformal model — 5×5, rows first. */
export type Mat5 = readonly (readonly number[])[]

export function applyMatrix(m: Mat5, x: Conformal): Conformal {
  const out = [0, 0, 0, 0, 0]
  for (let i = 0; i < 5; i++) {
    let acc = 0
    for (let j = 0; j < 5; j++) acc += m[i][j] * x[j]
    out[i] = acc
  }
  return out as unknown as Conformal
}

/** The matrix of any linear map, read off its action on the basis. */
export function matrixOf(apply: (x: Conformal) => Conformal | null): Mat5 | null {
  const cols: Conformal[] = []
  for (let j = 0; j < 5; j++) {
    const e = [0, 0, 0, 0, 0]
    e[j] = 1
    const image = apply(e as unknown as Conformal)
    if (!image) return null
    cols.push(image)
  }
  return [0, 1, 2, 3, 4].map((i) => cols.map((c) => c[i]))
}

/** Inversion in a sphere, as a constant 5×5 matrix. */
export function reflectionMatrix(s: Conformal): Mat5 | null {
  return matrixOf((x) => reflectIn(x, s))
}

/**
 * The conformal lift of a polynomial Bézier curve, as the Bernstein coefficients of a
 * degree-2n null 5-vector polynomial.
 *
 * Components are (1, r, ½‖r‖²) of degrees (0, n, 2n), all elevated to 2n — which is the
 * degree law made concrete: the lift doubles because ‖r‖² does.
 */
export function conformalLiftBezier(controlPoints: readonly Vec3[]): Conformal[] {
  const n = controlPoints.length - 1
  const target = 2 * n
  const xs = controlPoints.map((p) => p.x)
  const ys = controlPoints.map((p) => p.y)
  const zs = controlPoints.map((p) => p.z)
  const norm2 = bernsteinMultiply(xs, xs)
    .map((v, i) => v + bernsteinMultiply(ys, ys)[i] + bernsteinMultiply(zs, zs)[i])

  const o = bernsteinElevate([1], target)
  const X = bernsteinElevate(xs, target)
  const Y = bernsteinElevate(ys, target)
  const Z = bernsteinElevate(zs, target)
  const inf = bernsteinElevate(norm2.map((v) => 0.5 * v), target)

  return Array.from({ length: target + 1 }, (_, k) => [o[k], X[k], Y[k], Z[k], inf[k]] as unknown as Conformal)
}

export interface RationalBezier {
  readonly points: Vec3[]
  readonly weights: number[]
}

/**
 * The image's rational Bézier data: apply M to each lift coefficient, then read off the
 * weight and the control point. Nothing else to do — that is the whole point of the model.
 */
export function mobiusImageRationalBezier(liftCoeffs: readonly Conformal[], m: Mat5): RationalBezier {
  const points: Vec3[] = []
  const weights: number[] = []
  for (const c of liftCoeffs) {
    const a = applyMatrix(m, c)
    weights.push(a[0])
    points.push(a[0] === 0
      ? { x: NaN, y: NaN, z: NaN }
      : { x: a[1] / a[0], y: a[2] / a[0], z: a[3] / a[0] })
  }
  return { points, weights }
}

/** Evaluate a rational Bézier, by de Casteljau on the homogeneous coefficients. */
export function evaluateRationalBezier(rb: RationalBezier, t: number): Vec3 | null {
  const n = rb.points.length - 1
  const h = rb.points.map((p, i) => [
    rb.weights[i] * p.x, rb.weights[i] * p.y, rb.weights[i] * p.z, rb.weights[i],
  ])
  for (let r = 1; r <= n; r++) {
    for (let i = 0; i <= n - r; i++) {
      for (let c = 0; c < 4; c++) h[i][c] = (1 - t) * h[i][c] + t * h[i + 1][c]
    }
  }
  if (h[0][3] === 0) return null
  return { x: h[0][0] / h[0][3], y: h[0][1] / h[0][3], z: h[0][2] / h[0][3] }
}

/**
 * Smallest |weight| — near zero means one CONTROL POINT escaping to infinity.
 *
 * NOT a health check on the curve, and it was displayed as one by mistake. A control
 * point at infinity is a fact about the REPRESENTATION: the point becomes a direction and
 * the polygon can no longer be drawn in affine space, while the curve itself carries on
 * perfectly well. Use `minDenominator` for the curve.
 */
export function minAbsWeight(rb: RationalBezier): number {
  return Math.min(...rb.weights.map(Math.abs))
}

/**
 * min over t∈[0,1] of the denominator W(t) = Σ wᵢBᵢ(t) — the quantity that actually
 * decides whether the image is a bounded curve.
 *
 * And there is an exact identity behind it, verified in the tests to 1e-9:
 *
 *     W(t) = λ · ‖r(t) − pole‖²          pole = μ⁻¹(∞), λ constant
 *
 * because W = −⟨M·P(r), ∞⟩ = −⟨P(r), M⁻¹∞⟩ and the conformal inner product of two lifted
 * points IS a squared distance. Three consequences, all of them useful:
 *
 *   · "min W" and "how close the pole comes to the curve" are the SAME readout;
 *   · W is λ times a sum of squares, so it can only TOUCH zero, never cross — the image
 *     runs to infinity at one parameter and comes back, and never flips branch;
 *   · the zero is therefore a DOUBLE root, which is why sampling finds 1e-19 rather than
 *     a clean sign change (see the test).
 */
export function minDenominator(rb: RationalBezier, samples = 200): number {
  const n = rb.points.length - 1
  let worst = Infinity
  for (let k = 0; k <= samples; k++) {
    const t = k / samples
    const w = rb.weights.slice()
    for (let r = 1; r <= n; r++) {
      for (let i = 0; i <= n - r; i++) w[i] = (1 - t) * w[i] + t * w[i + 1]
    }
    worst = Math.min(worst, w[0])
  }
  return worst
}

// ---------------------------------------------------------------------------
// GENERATORS — the Lie algebra so(4,1), so a slider can start at the identity
//
// The Lie-sphere lab's design: the transformation is exp(Σ sᵢXᵢ), so all-zeros is "no
// transformation" and each slider is an infinitesimal generator. so(4,1) is spanned by
// bivectors a∧b acting as
//
//     G_{a,b}(X) = ⟨X,a⟩b − ⟨X,b⟩a
//
// which is antisymmetric for the form, so exp(sG) lands in O(4,1) — a genuine Möbius
// transformation — for every s. The ten generators split as rotations (eᵢ∧eⱼ),
// translations (eᵢ∧∞), dilation (o∧∞) and the SPECIAL CONFORMAL ones (eᵢ∧o). Only the
// last group bends anything: the others are similarities, which fix ∞ and leave the degree
// alone. That is why the lab groups them separately and gives the inversive ones a tighter
// slider range.
//
// A convenience worth knowing: any combination of the three special conformal generators
// is again a SINGLE one, G_{b,o} with b = (s₁,s₂,s₃) — and G_{b,o}³ = 0, so its exponential
// is the finite series I + G + G²/2, exactly. No matrix-exponential routine required,
// though `matrixExp5` is provided and tested against that closed form.
// ---------------------------------------------------------------------------

/** The metric, as a matrix: ⟨X,Y⟩ = Xᵀ η Y. */
const ETA: number[][] = [
  [0, 0, 0, 0, -1],
  [0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [-1, 0, 0, 0, 0],
]

const etaTimes = (a: Conformal): number[] =>
  [0, 1, 2, 3, 4].map((i) => ETA[i].reduce((acc, v, j) => acc + v * a[j], 0))

/** G_{a,b}(X) = ⟨X,a⟩b − ⟨X,b⟩a, as a 5×5 matrix. Antisymmetric for the form. */
export function bivectorGenerator(a: Conformal, b: Conformal): Mat5 {
  const ea = etaTimes(a)
  const eb = etaTimes(b)
  return [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => b[i] * ea[j] - a[i] * eb[j]))
}

const ORIGIN_VECTOR: Conformal = [1, 0, 0, 0, 0]

/**
 * The special conformal ("inversive bend") generator along b — the only part of the
 * Möbius group that bends straight lines into circles.
 */
export function inversiveBendGenerator(b: Vec3): Mat5 {
  return bivectorGenerator([0, b.x, b.y, b.z, 0], ORIGIN_VECTOR)
}

/** exp(M), by scaling and squaring — correct for any generator, not just nilpotent ones. */
export function matrixExp5(m: Mat5, terms = 18): Mat5 {
  let scale = 0
  let norm = 0
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) norm = Math.max(norm, Math.abs(m[i][j]))
  while (norm > 0.25) { norm /= 2; scale++ }
  const s = 2 ** -scale
  const a: number[][] = m.map((row) => row.map((v) => v * s))

  let result: number[][] = [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => (i === j ? 1 : 0)))
  let term: number[][] = result.map((r) => [...r])
  for (let k = 1; k <= terms; k++) {
    term = multiply5(term, a).map((row) => row.map((v) => v / k))
    result = result.map((row, i) => row.map((v, j) => v + term[i][j]))
  }
  for (let k = 0; k < scale; k++) result = multiply5(result, result)
  return result
}

export function multiply5(a: Mat5, b: Mat5): number[][] {
  return [0, 1, 2, 3, 4].map((i) =>
    [0, 1, 2, 3, 4].map((j) => {
      let acc = 0
      for (let k = 0; k < 5; k++) acc += a[i][k] * b[k][j]
      return acc
    }),
  )
}

/** How far a matrix is from preserving the form — the "is it Möbius?" check. */
export function isometryDefect(m: Mat5): number {
  // Mᵀ η M should equal η.
  let worst = 0
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      let acc = 0
      for (let p = 0; p < 5; p++) for (let q = 0; q < 5; q++) acc += m[p][i] * ETA[p][q] * m[q][j]
      worst = Math.max(worst, Math.abs(acc - ETA[i][j]))
    }
  }
  return worst
}

/** The Möbius point map of a matrix, and its inverse — exp(−G) inverts exp(G). */
export function pointMap(m: Mat5): (x: Vec3) => Vec3 | null {
  return (x) => project(applyMatrix(m, lift(x)))
}
