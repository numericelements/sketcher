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
// 5. THE POLYNOMIAL CUBIC FIBER SURVIVES THE LIFT, EXACTLY — AND LIES ON A SINGULARITY. Spatial PH
//    cubics sharing p₀, the first leg and the far endpoint form a CLOSED ELLIPSE on which the arc
//    length is constant, so arc length cannot select among them (phSpatialCubic, slide 6). Lift all
//    181 traced members: every one is a conformal degree-6 member to 1.4e-15, and the loop CLOSES in
//    the 41-dimensional coefficient space — end gap 0.02 of a median step. The lift is canonical, so
//    that closure is literal and not up to a gauge. Arc length is still constant: the spread reads
//    2.9e-6 at 512 quadrature points and 1.8e-4 at 64, a factor of 64 for an 8-fold refinement, which
//    is midpoint quadrature's 1/n² — the spread is the quadrature, and the values agree with
//    fiberArcLength's closed form. So the degeneracy is not an artefact of the polynomial setting;
//    it is a property of those curves that the richer representation does not disturb.
//
//    WHAT THE EXTRA DEFICIENCIES ARE, as far as measurement takes it. residual(s) is [2n+1 nullity
//    coefficients, 2n-1 PH coefficients], so a dependency among the rows is a pair of polynomial
//    functionals and its block tells you which identity is degenerating. Measured, on unit-normalised
//    rows: a generic degree-6 member has ONE dependency and it is MIXED — 0.950 of its weight in the
//    nullity block, 0.313 in the PH block, heaviest on the MIDDLE nullity rows N6, N7, N8. (Not the
//    top PH row, which is what an earlier guess in this file's history claimed; that guess was wrong
//    about which rows, though right that the h_top² structure makes the variety's dimension one below
//    the linearisation's.) At a lifted polynomial there are THREE, and they are almost purely nullity
//    — 0.999 against 0.04 — so what collapses is the NULLITY identity, not the PH one.
//
//    AND THE COUNT FOLLOWS THE POLYNOMIAL DEGREE: a lifted polynomial of degree d has exactly d
//    dependencies, so d−1 extra. Measured 3 for the cubic at conformal 6 and 5 for the quintic at
//    conformal 10. Bending the same cubic by a Möbius transform gives the identical count, as it must
//    since O(4,1) acts linearly — so this is intrinsic to being a bent polynomial and not an accident
//    of one curve. The algebraic identity that produces d−1 relations is NOT yet in hand: the obvious
//    candidate, that differentiating ⟨P,P⟩ ≡ 0 twice makes ⟨P′,P′⟩ + ⟨P,P″⟩ a derivative of the
//    nullity residual, explains a relation between the blocks but not a count that grows with d.
//
//    BUT THE STRATUM IS SINGULAR. At a lifted polynomial the defining Jacobian has rank 21 of 24,
//    where a generic degree-6 member gives 23 of 24 — two extra deficiencies beyond the structural
//    one. So the polynomial locus is not a smooth slice of the rational family, and a dimension read
//    off the linearisation there is the LINEARISATION's count, not the family's: with p₀, p_end and d₀
//    held it offers 10 directions, and only the claim "the fiber is 1 of them" is safe. Any solver
//    walking near the equal-weights locus is walking near a singularity.
//
// 6. A RANK DEFECT THE SOLVERS SHOULD KNOW ABOUT. The constraint Jacobian has nullity 2n+6, one MORE
//    than the family's dimension, at every member and always in the same direction. The reason: the
//    top PH condition is n²⟨Aₙ,Aₙ⟩ = (h's leading coefficient)², and nullity has already forced
//    ⟨Aₙ,Aₙ⟩ = 0, so it reads h_top² = 0 — a SQUARED equation, whose gradient vanishes on its own
//    zero set. Measured: h's leading power-basis coefficient is 6e-14 of its largest, and the
//    Jacobian rank is 15 of 16 rows at degree 4, 23 of 24 at degree 6, with a 3.7e+9 gap. So the
//    variety is 2n+5 dimensional while its linearisation admits one extra direction that leaves it
//    at second order. Any corrector that least-squares through this Jacobian is working with a
//    structurally rank-deficient matrix — the first place to look when a continuation stalls.
//
// 7. BENDING THE CUBIC FIBERS DOES NOT FILL THE FAMILY: 3 MODULI OF THE 5. The cubics come in closed
//    fibers (5), their Möbius images are rational, so the bent fibers span more than the polynomial
//    family did — but not everything. The tangent space to the Möbius ORBIT of the lifted cubics,
//    built from an explicit parametrisation and so free of the degenerate row of (6):
//
//        11 polynomial parameters (A₀, A₁, p₀), of rank 10 — the missing one is A ↦ A·e^{iθ},
//           which leaves A i Ā alone, measured at 0.0e+0 motion
//      + 12 gauge directions
//      − 7 overlap                    =  15, against the family's 17
//
//    and the overlap being exactly 7 identifies it: translation 3 + rotation 3 + dilation 1, the
//    Möbius maps that keep a polynomial polynomial. Modulo the gauge: 15 − 12 = 3 against 5. So
//    CODIMENSION 2 — two of the five shape directions are reachable by no polynomial cubic, bent or
//    not.
//
//    A determinantal count AGREES but does not confirm it. Bendability (2) is the rank drop of a 6×5
//    matrix, and the rank ≤ 4 locus of an m×n matrix has codimension (m−r)(n−r) = 2·1. That is the
//    codimension for an UNSTRUCTURED family of 6×5 matrices; here D(s) is the tightly structured image
//    of a 17-dimensional variety, so the pullback could perfectly well be codimension 1 with the
//    nullity of S supplying the second condition. Treat it as a heuristic that lands on the same
//    number, not as a second proof — the tangent count above is the measurement. (An attempt to settle
//    it by riding dials off the stratum failed for the reason in (8), and an early version of that test
//    read a rank of 2 that was four identical "did not move" columns divided by a clamp.)
//
//    Cross-check downstairs, with no conformal model at all: PH cubics are 10-dimensional (they
//    interpolate any p₀, d₀, p₃ with a 1-parameter fiber, 9 + 1) and the similarity group is 7, so
//    their shapes number 10 − 7 = 3. Möbius adds no shapes because the moduli are already a Möbius
//    quotient — bending buys REPRESENTATIONS, not shapes.
//
//    THE FIBER SURVIVES BENDING AS A FIBER, and loses its degeneracy. Push the 181-member fiber
//    through a transversion — the only part of the Möbius group that bends lines into circles: every
//    image is still a member (3.8e-15), none is polynomial any more (least bead offset 2.7e-2), the
//    loop still CLOSES (end gap 0.02 median steps), but the arc length now SPREADS by 1.2e-2 where it
//    was zero. So in the rational family arc length does select among the fiber, and the ellipse's
//    "arc length cannot choose for you" is a polynomial-only fact.
//
// 8. THE STRAIGHTENING CENTRE — the invariant that the two new directions destroy, and the one drawable
//    object in all of this. S null means S is a POINT, and ⟨P,S⟩ ≡ const then says every inversion
//    centred at S carries the curve to a POLYNOMIAL one: an inversion about S sends S to infinity, and
//    ⟨P,∞⟩ = −w(t), so constant weight. Measured on a bent cubic (transversion of scale 0.4 on the
//    lift, chosen as the strongest bend that keeps the weights of one sign — otherwise w(t) = 0 puts a
//    pole on the curve and every arc length on it is NaN): the centre is at (3.2653, −2.0408, 1.2245),
//    and inverting about it gives weight ratio 1.000000000000, beads off centre 6.2e-15, residual
//    8.4e-17. So the centre is real, exact, and finite — it can be drawn as a dot.
//
//    Riding the one dial that moves here takes it away: ρ₃ at +3% sends rank(D) from 4 to 5 with defect
//    2.2e-3. No point in space straightens the curve any more. THAT is what a new direction looks like.
//
//    The bendable directions come out with NO solver and NO defining Jacobian: (orbit tangent, 15
//    explicit directions) ∩ (12 Hermite rows) = 3. Their image in dial space is only 2-dimensional
//    (dial-rate matrix rank 2, third singular value 4.8e-10 against 2.2e-1 and 8.7e-2), and that is
//    EXACTLY RIGHT rather than a degenerate chart — see (9).
//
// 9. THE PROJECTIVE SCALE HIDES IN THE HERMITE SLICE, so every "how many knobs" count taken there is one
//    too high. C ↦ cC, h ↦ ch changes NOTHING observable: not a curve point, not a radius (ρ = √⟨C,C⟩/w
//    scales top and bottom alike), not a speed (h/w likewise), and not the Hermite data (curve points
//    and a ratio of weights). Yet it is tangent to the family, because every defining condition is
//    quadratic and the constraint set is therefore a CONE. Measured at a bent cubic: the scale direction
//    lies inside the orbit tangent to 1.000000 and inside the 3-dimensional bendable kernel to
//    1.000000, while the Hermite data responds 2.1e-10 and the five dials respond at most 4.9e-10.
//
//    So read every slice count as (directions) = 1 + (shapes):
//
//        bendable stratum in the slice     3 directions = scale + 2 SHAPES   -> dial rank 2, correct
//        the whole Hermite slice           5 directions = scale + 4 SHAPES   -> FIVE dials on FOUR knobs
//
//    The 2n−7 of (4) is the MODULI count — curves modulo the 11 gauge motions that act on curves at all
//    — and it is right. What is wrong is reading the Hermite slice's 2n−7 directions as 2n−7 shapes:
//    pinning the 12 Hermite values fixes 11 gauge motions AND imposes one genuine shape condition, so
//    the slice sees a codimension-1 subset of the moduli. Codimension 2 for the bent cubics survives
//    either way (5 vs 3 in the moduli, 4 vs 2 in the slice).
//
//    The degree-4 cross-check is the convincing one. There the slice has 2 directions, hence ONE shape
//    minus... no: raw nullity 2, minus the spurious row of (6), leaves 1 direction, which IS the scale —
//    so ZERO shapes. And that is exactly what slide 13 shows: with the four points pinned, nothing can
//    move, the middle control point is inert, and the only dial the figure can honestly offer is the
//    reparametrisation gauge. The old reading ("2n−7 = 1, so one knob at degree 4") predicted a shape
//    knob that the figure does not have.
//
//    Note this is NOT the cause of the four stalled dials in (8). That is the variety's singularity at
//    the polynomial stratum, rank 21 against 23 — a different defect at the same place.
//
// 10. TOWARD A CLOSED FORM — the reduction, and exactly where it stops. Writing P = (w, q, ‖q‖²/2w):
//
//     (a) w has NO REAL ROOTS, for an irreducible member. A real root forces ‖q‖² = 0 there, hence
//         q = 0 there — ‖q‖² is a sum of REAL squares — hence a common factor. So w is a product of
//         three definite quadratics, w = ∏(t−z_j)(t−z̄_j). Measured on the seed: smallest |Im z| = 1.3e-2.
//         (This is what denominatorRealRoots guards, seen from the algebra.)
//
//     (b) NULLITY ⟺ q(z_j) IS ISOTROPIC IN C³, i.e. q₁²+q₂²+q₃² = 0 at each root — because P is a
//         polynomial 5-vector only if w | ‖q‖², and w's roots are exactly the z_j. Measured on the seed:
//         2.8e-11 or better at all six roots. This is the useful form, because the isotropic cone of C³
//         is exactly the image of the SPINOR map (a²−b², i(a²+b²), −2ab) — so the nullity half of the
//         family has a closed-form parametrisation: choose three roots, a spinor at each, and
//         interpolate the real q of degree 6 (18 real conditions on 21 coefficients, the leftover 3
//         being q ↦ q + w·u, i.e. TRANSLATION). Count: 6 (roots) + 1 (scale) + 12 (spinors) + 3
//         (translation) = 22, which is the null-curve family's dimension.
//
//     (c) PH ⟺ ‖N‖ = h·w where N = q′w − qw′, and a vector polynomial with polynomial norm is exactly
//         the HOPF form N = A i A* with A a quaternion polynomial of degree 5. Measured on the seed via
//         `hodograph`: ‖N‖ = h·w to 4.6e-14. The extraction is already implemented (`hopfForm`).
//
//     WHERE IT STOPS: the two halves do not compose freely. Going forward from (c) — pick A and w with
//     w | |A|², set p′ = A i A*/w² — the curve is PH by construction but generally NOT RATIONAL: p′ has
//     double poles at the roots of w, and unless the residue of the simple-pole part vanishes at each
//     root the integral picks up logarithms. The condition is N′(z_j)·g(z_j) = 2N(z_j)·g′(z_j) with
//     g = w/(t−z_j), i.e. N′(z_j) parallel to N(z_j) with a prescribed ratio. A tempting shortcut,
//     A = D·E with w = |D|² and h = |E|² (degrees 3 and 2, and the norm is multiplicative so PH is
//     free), does NOT satisfy it: D·(E i E*)·D* is not divisible by w, since at a root z the quaternion
//     D(z) is null rather than zero. So attack it from the SPINOR side instead — (11).
//
// 11. THE SPINOR SIDE SOLVES THE NO-LOG CONDITION IN CLOSED FORM. Write A = u + vj and read N = A i A*
//     in the NULL basis of the complexified form: X = N_j + iN_k = c·uv, Y = c̄·u*v*, Z = uu* − vv*,
//     where * is COEFFICIENT conjugation (so u*(t) = conj(u(t)) for real t, but not for complex t).
//     Then ‖N‖² = Z² + XY, and the residue condition N′(z) = (w″/w′)(z)·N(z) splits into
//
//         (uv)′/(uv) = w″/w′ at z ,    (u*v*)′/(u*v*) = w″/w′ at z ,    plus the Z component
//
//     of which the Z component is IMPLIED — writing the logarithmic derivatives as α+β = μ and
//     α*+β* = μ, the Z equation reduces to their sum, (α+α*)+(β+β*) = 2μ. And the second is the
//     coefficient conjugate of the first with w real, hence automatic. So the whole thing lands on the
//     PRODUCT π = uv:
//
//         w | π′w′ − πw″            THE no-log condition, on uv alone
//         π = w′ν − wν′             its closed form, ν complex of degree ≤ n−1 = 5, entirely FREE
//
//     The second line is exact rather than modular: putting π = wμ + w′ν gives π′w′ − πw″ ≡ w′²(μ + ν′)
//     mod w, and deg(μ + ν′) ≤ 4 < 6 = deg w forces μ = −ν′. Its solution space is 6 complex dimensional
//     out of 11, one MORE than 6 root conditions would leave — the dependency is the residue theorem,
//     N/w² decaying like t⁻² so its residues sum to zero. Measured on the seed: remainder 4.3e-13 for
//     the condition, and 1.2e-12 for ν of degree 5 reproducing π.
//
//     WHAT REMAINS IS w | uu* + vv*, six real conditions, and it has a geometric form. Per conjugate
//     pair, Λ(z) = 0 says the spinor values at z and z̄ are HERMITIAN-ORTHOGONAL in C²; dividing through
//     by v it says the spinor RATIO f = u/v satisfies f(z)·f*(z) = −1, i.e. the direction [u:v] at z̄ is
//     the ANTIPODE of the one at z on CP¹. Since [u:v] is the curve's tangent indicatrix, this is the
//     curve's reality condition read at the complex roots of its own denominator. Measured on the seed:
//     3.7e-10, 3.9e-11, 4.8e-11 for the three pairs.
//
//     THE COUNT CLOSES: w (7, three conjugate root pairs and a scale) + ν (12) + the scale split of
//     π = u·v (2, of which 1 is the gauge A ↦ Ae^{iθ}, so 1) − 6 (the orthogonality) + 3 (translation,
//     the constant of integration) = 17, which is the variety's dimension. So the construction is
//     complete except for step three: factor a GIVEN π of degree 10 into u·v of degree 5 each such that
//     the three antipodal conditions hold. Two of the four steps are closed-form; that one is not yet.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Conformal,
  bivectorGenerator,
  conformalLiftBezier,
  innerProduct,
  inversiveBendGenerator,
  matrixExp5,
  project,
  reflectionMatrix,
  sphereVector,
} from '../conformal'
import { type Quat, type Vec3, gaugeRotate } from '../quaternion'
import { controlPoints as phControlPoints, squareWeights, type SpatialPHCurve } from '../phSpatialFreeDragN'
import {
  type ConformalPHCurve,
  type StrictCoordinate,
  arcLength,
  controlPoints,
  definingJacobian,
  denominatorRealRoots,
  dragStrict,
  shapeMeasures,
  degreeOf,
  curveAt,
  farinParameters,
  findMember,
  freeRadiusIndices,
  radii,
  speedAt,
  hermiteDataOf,
  lambdaForFirstBead,
  mobiusImage,
  pack,
  reparametrise,
  unpack,
  residual,
  weights,
} from '../conformalPHCurve'
import { bernsteinToPower, hodograph, hopfForm, rootsOf } from '../conformalPHHopf'
import { sexticSeed } from '../conformalPHSeeds'
import {
  controlPoints as cubicControlPoints,
  fiberArcLength,
  fiberTraceIsClosed,
  spatialCubicFiber,
} from '../phSpatialCubic'

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
          `    of which ONE is the projective scale, which changes nothing observable (finding 9),\n` +
          `        so SHAPES with the Hermite data pinned = ${raw - 2}` +
          `   ${n === 4 ? '<- zero: slide 13 has nothing to move, and does not' : ''}\n` +
          `    free radii ${free.length} (indices ${free.join(',')}) + arc length = ${free.length + 1} dials` +
          `   ${free.length + 1 > raw - 2 ? `<- ${free.length + 1} dials on ${raw - 2} knobs: they are DEPENDENT` : ''}`,
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
      // They pin raw−1 of the raw nullspace directions at every degree, and the one they NEVER pin is
      // the projective scale — they are all built from ρ = √⟨C,C⟩/w and h/w, both scale-invariant
      // (finding 9). Since one of the ones they DO pin is the spurious h_top direction of (6), the
      // shapes they actually resolve number raw−2, and that is the honest dial count.
      console.log(
        `    dials: ${base.length} candidates (${free.length} radii + 2 half-lengths) ->` +
          ` they pin ${jointRank - rank} of the ${raw} nullspace directions;` +
          ` never the projective scale, so ${raw - 2} SHAPES resolved`,
      )
      expect(jointRank - rank, 'the dials pin everything except the projective scale').toBe(raw - 1)
    }
  }, 180_000)

  it('the cached degree-6 seed is a member, and its five dials ride', () => {
    const seed = sexticSeed()
    expect(degreeOf(seed), 'degree').toBe(6)
    expect(relResidual(seed), 'the cached seed is on the family').toBeLessThan(1e-12)
    expect(denominatorRealRoots(seed), 'genuinely sextic, not a lower-degree curve').toBe(0)
    const guards = shapeMeasures(seed)
    expect(guards.outOfPlane, 'still spatial').toBeGreaterThan(0.05)
    expect(guards.curvatureSpread, 'still curvature-varying').toBeGreaterThan(0.35)

    // The five dials the figure offers: the free radii plus each half's arc length.
    const dials: StrictCoordinate[] = [
      ...freeRadiusIndices(seed).map((index) => ({ kind: 'radius', index }) as StrictCoordinate),
      { kind: 'length', from: 0, to: 0.5 },
      { kind: 'length', from: 0.5, to: 1 },
    ]
    expect(dials.length, 'five dials for five moduli').toBe(5)

    const data = hermiteDataOf(seed)
    const value = (c: ConformalPHCurve, d: StrictCoordinate): number =>
      d.kind === 'radius' ? radii(c)[d.index] : arcLength(c, 8, d.from ?? 0, d.to ?? 1)
    for (const d of dials) {
      const start = value(seed, d)
      let cur = seed
      for (let k = 0; k < 8; k++) {
        const step = dragStrict(cur, d, start * 1.25, { data, lengthSamples: 8 })
        if (!step.converged) break
        cur = step.state
      }
      const after = hermiteDataOf(cur)
      const dataMove = Math.max(
        Math.hypot(after.p0.x - data.p0.x, after.p0.y - data.p0.y, after.p0.z - data.p0.z),
        Math.hypot(after.p1.x - data.p1.x, after.p1.y - data.p1.y, after.p1.z - data.p1.z),
        Math.hypot(after.d0.x - data.d0.x, after.d0.y - data.d0.y, after.d0.z - data.d0.z),
        Math.hypot(after.d1.x - data.d1.x, after.d1.y - data.d1.y, after.d1.z - data.d1.z),
      )
      const shapeMove = Math.max(
        ...Array.from({ length: 41 }, (_, k) => {
          const a = curveAt(cur, k / 40)!, b = curveAt(seed, k / 40)!
          return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        }),
      )
      const label = d.kind === 'radius' ? `rho_${d.index}` : `L(${d.from},${d.to})`
      console.log(
        `${label.padEnd(10)} ${start.toFixed(3)} -> ${value(cur, d).toFixed(3)}` +
          ` (asked ${(start * 1.25).toFixed(3)})   curve moved ${shapeMove.toExponential(1)}` +
          `   Hermite data held to ${dataMove.toExponential(1)}   residual ${relResidual(cur).toExponential(1)}`,
      )
      expect(value(cur, d) / start, `${label} moved`).toBeGreaterThan(1.05)
      expect(dataMove, `${label} holds the data`).toBeLessThan(1e-6)
      expect(relResidual(cur), `${label} stays on the family`).toBeLessThan(1e-10)
      // NOTE: this is the SAME-PARAMETER distance, which a reparametrisation also makes large. It is
      // kept as a cheap smoke test only; that none of the five dials is a gauge direction is
      // established by the IMAGE distance in conformalPHDialsAreShape.test.ts.
      expect(shapeMove, `${label} moves same-parameter points`).toBeGreaterThan(1e-3)
    }
  }, 120_000)


  it('the cubic fiber survives the lift, and the rational family breaks its degeneracy', () => {
    // The classical structure: spatial PH cubics sharing p0, the first leg (hence A0) and the far
    // endpoint form a CLOSED ELLIPSE, on which the arc length is CONSTANT -- so arc length cannot
    // select among them. Does any of that survive inside the conformal degree-6 family?
    const p0 = { x: 0, y: 0, z: 0 }
    const p1 = { x: 0.6, y: 0.25, z: 0.1 }
    const p3 = { x: 1.7, y: 0.4, z: 0.55 }
    const fiber = spatialCubicFiber(p0, p1, p3, { samples: 220, step: 0.05 })
    expect(fiber.length, 'the fiber traced').toBeGreaterThan(40)
    const closedDownstairs = fiberTraceIsClosed(fiber)
    const predictedLength = fiberArcLength(p0, p1, p3)

    // Lift every member. h = |A|^2 elevated, exactly as for any polynomial PH curve.
    const lifted = fiber.map((f) => {
      const cps = cubicControlPoints(f.curve)
      const C = conformalLiftBezier(cps)
      return { C, h: elevate(speedPolynomial([f.curve.A0, f.curve.A1]), C.length - 2) }
    })
    const worstResidual = Math.max(...lifted.map(relResidual))
    const degrees = new Set(lifted.map(degreeOf))
    // Arc length at TWO sample counts, because the interesting claim is that the spread is zero and
    // a single count cannot show that: 64 points read 1.8e-4 and 512 read 2.9e-6, a factor of 64 for
    // an 8-fold refinement, which is exactly midpoint quadrature's 1/n². The spread is the
    // quadrature, not the curve. Compared against fiberArcLength's closed form, which is exact.
    const lengths = lifted.map((m) => arcLength(m, 512))
    const coarse = lifted.map((m) => arcLength(m, 64))
    const spreadOf = (v: number[]): number => (Math.max(...v) - Math.min(...v)) / Math.max(...v)
    const quadratureRatio = spreadOf(coarse) / spreadOf(lengths)
    const lengthSpread = spreadOf(lengths)

    // Does the LIFTED loop close, in the 41-dimensional coefficient space rather than in the drawn
    // P2? The lift is canonical -- (1, p, half|p|^2), no representative to choose -- so closure is
    // literal, not up to a gauge.
    const X = lifted.map(pack)
    const gaps: number[] = []
    for (let i = 1; i < X.length; i++) gaps.push(Math.hypot(...X[i].map((v, j) => v - X[i - 1][j])))
    const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
    const endGap = Math.hypot(...X[X.length - 1].map((v, j) => v - X[0][j]))

    // How thin is it? The fiber holds NINE of the twelve Hermite conditions -- p0, the far endpoint,
    // and d0 -- leaving d1 free. Count what the rational family offers under the same nine.
    const mid = lifted[Math.floor(lifted.length / 2)]
    const x = pack(mid)
    const step = 1e-6
    const nine = (c: ConformalPHCurve): number[] => {
      const d = hermiteDataOf(c)
      return [d.p0.x, d.p0.y, d.p0.z, d.p1.x, d.p1.y, d.p1.z, d.d0.x, d.d0.y, d.d0.z]
    }
    const rows: number[][] = Array.from({ length: 9 }, () => new Array(x.length).fill(0))
    for (let j = 0; j < x.length; j++) {
      const up = nine(unpack(x.map((v, i) => (i === j ? v + step : v))))
      const dn = nine(unpack(x.map((v, i) => (i === j ? v - step : v))))
      for (let r = 0; r < 9; r++) rows[r][j] = (up[r] - dn[r]) / (2 * step)
    }
    const unit = (row: number[]): number[] => {
      const m = Math.hypot(...row) || 1
      return row.map((v) => v / m)
    }
    // Is the lifted polynomial a SMOOTH point of the family, or does the bendable stratum sit on a
    // singularity? Read the defining Jacobian's rank here and compare with the 23 of 24 that a
    // generic degree-6 member gives.
    const Jhere = definingJacobian(mid).map(unit)
    const rankAlone = rankFromGap(singularValues(Jhere), Jhere.length).rank
    const withNine = [...Jhere, ...rows.map(unit)]
    const rank = rankFromGap(singularValues(withNine), withNine.length).rank
    const available = x.length - rank - 1 // minus the one structurally spurious direction

    console.log(
      `the cubic fiber, lifted:\n` +
        `    ${fiber.length} members, closed downstairs ${closedDownstairs}\n` +
        `    every lift is a conformal member       residual <= ${worstResidual.toExponential(1)}\n` +
        `    conformal degree                       ${[...degrees].join(',')}\n` +
        `    ARC LENGTH along the fiber             spread ${lengthSpread.toExponential(1)} at 512 pts,` +
          ` ${spreadOf(coarse).toExponential(1)} at 64 -- ratio ${quadratureRatio.toFixed(0)}, i.e. the` +
          ` QUADRATURE\n` +
        `                                           closed form ${predictedLength?.toFixed(6)},` +
          ` measured ${lengths[0].toFixed(6)}\n` +
        `    the LIFTED loop closes                 end gap ${(endGap / median).toFixed(2)} median steps\n` +
        `    defining Jacobian rank HERE            ${rankAlone} of ${Jhere.length}` +
          `   (a generic degree-6 member gives 23 of 24)\n` +
        `    with p0, p_end and d0 held, the linearisation offers ${available} directions,\n` +
        `        of which the polynomial fiber is 1`,
    )

    expect(worstResidual, 'every lift is on the family').toBeLessThan(1e-12)
    expect(degrees.size, 'all at degree 6').toBe(1)
    expect([...degrees][0], 'degree 6').toBe(6)
    const vsClosedForm = Math.max(...lengths.map((L) => Math.abs(L - (predictedLength ?? 0)))) /
      Math.max(...lengths)
    expect(vsClosedForm, 'every lift has the arc length the closed form predicts').toBeLessThan(1e-5)
    expect(quadratureRatio, 'the spread is the quadrature: it falls like 1/n^2').toBeGreaterThan(32)
    expect(lengthSpread, 'so the true spread is zero').toBeLessThan(1e-5)
    expect(rankAlone, 'the polynomial stratum is SINGULAR in the rational family').toBeLessThan(23)
    if (closedDownstairs) expect(endGap / median, 'the lifted loop closes too').toBeLessThan(2.5)
    expect(available, 'the fiber sits inside a much larger rational family').toBeGreaterThan(1)
  }, 120_000)


  it('what the extra deficiencies at a polynomial member ARE', () => {
    // residual(s) is [nullity coefficients, PH coefficients]: 2n+1 rows for <P,P> = 0 (degree 2n)
    // then 2n-1 for <P',P'> - h^2 = 0 (degree 2n-2). So a DEPENDENCY among the rows is a pair of
    // polynomial functionals, and which block it lives in says what it means. Rows are unit-normalised
    // first, so the weights below are comparable rather than dominated by row scale.
    const unit = (row: readonly number[]): number[] => {
      const m = Math.hypot(...row) || 1
      return row.map((v) => v / m)
    }
    const transpose = (a: readonly (readonly number[])[]): number[][] =>
      a[0].map((_, j) => a.map((r) => r[j]))

    const report = (name: string, s: ConformalPHCurve): number => {
      const n = degreeOf(s)
      const nullityRows = 2 * n + 1
      const J = definingJacobian(s).map(unit)
      // Left null vectors of J = right null vectors of J-transpose: the dependencies among the ROWS.
      const { sv, V } = svd(transpose(J))
      const { rank } = rankFromGap(sv, J[0].length)
      const deficiency = J.length - rank
      const lines: string[] = []
      for (let d = 0; d < deficiency; d++) {
        const lam = V[V.length - 1 - d]
        const nrm = Math.hypot(...lam) || 1
        const w = lam.map((v) => Math.abs(v) / nrm)
        const inNullity = Math.hypot(...w.slice(0, nullityRows))
        const inPH = Math.hypot(...w.slice(nullityRows))
        const top = w
          .map((v, i) => ({ v, i }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 3)
          .map(({ v, i }) =>
            `${i < nullityRows ? `N${i}` : `PH${i - nullityRows}`}:${v.toFixed(3)}`,
          )
          .join(' ')
        lines.push(
          `      dep ${d + 1}: nullity block ${inNullity.toFixed(3)}, PH block ${inPH.toFixed(3)}` +
            `   heaviest ${top}`,
        )
      }
      console.log(`  ${name}: ${J.length} rows, rank ${rank}, ${deficiency} dependencies\n` + lines.join('\n'))
      return deficiency
    }

    const generic6 = sexticSeed()
    const A_CUBIC: Quat[] = [
      { u: 1, v: 0.3, p: 0.1, q: 0 },
      { u: 0.8, v: 0, p: 0.25, q: 0.4 },
    ]
    const A_QUINTIC: Quat[] = [
      { u: 1, v: 0.3, p: 0.1, q: 0 },
      { u: 0.8, v: 0, p: 0, q: 0.2 },
      { u: 1.1, v: 0.2, p: -0.4, q: 0 },
    ]

    const dGeneric = report('generic degree-6 member', generic6)
    const dCubic = report('lifted polynomial cubic (conformal 6)', liftPolynomialPH(A_CUBIC))
    const dQuintic = report('lifted polynomial quintic (conformal 10)', liftPolynomialPH(A_QUINTIC))

    // Is it BEING POLYNOMIAL, or an accident of this one curve? Bend it: O(4,1) acts linearly, so a
    // Mobius image must have the identical rank -- and a member NEAR the stratum must recover 1.
    const bend = bivectorGenerator([0, 1, 0, 0, 0], [0, 0, 0, 0, 1])
    const expBend = (m: readonly (readonly number[])[], k: number): number[][] => {
      let acc: number[][] = [[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,1]]
      let term: number[][] = acc.map((r) => [...r])
      for (let i = 1; i <= 12; i++) {
        term = term.map((r) => m.map((_c, j) => r.reduce((a, v, q) => a + v * m[q][j], 0) * (k / i)))
        acc = acc.map((r, a) => r.map((v, b) => v + term[a][b]))
      }
      return acc
    }
    const M = expBend(bend, 0.35)
    const cubic = liftPolynomialPH(A_CUBIC)
    const bent: ConformalPHCurve = {
      C: cubic.C.map((c) => M.map((row) => row.reduce((a, v, i) => a + v * c[i], 0)) as unknown as Conformal),
      h: cubic.h,
    }
    const dBent = report('the SAME cubic, bent by a Mobius transform', bent)

    // The pattern: a lifted polynomial of degree d has exactly d dependencies where a generic member
    // has 1 -- so d-1 EXTRA, which is 2 for the cubic at conformal 6 and 4 for the quintic at
    // conformal 10. Checked at two degrees; the algebraic identity behind it is not yet in hand.
    expect(dGeneric, 'a generic member has exactly one dependency').toBe(1)
    expect(dCubic, 'a lifted CUBIC has d = 3').toBe(3)
    expect(dQuintic, 'a lifted QUINTIC has d = 5').toBe(5)
    expect(dBent, 'bending cannot change it -- O(4,1) acts linearly').toBe(dCubic)
  }, 120_000)


  it('DEPARTING the polynomial stratum: lift a cubic, then navigate the rational space', () => {
    // The lift is an ENTRY POINT, not a destination. Start at a curve the audience knows -- a
    // polynomial PH cubic -- and ask whether the five dials can walk OFF the polynomial stratum into
    // the genuinely rational family. The stratum is where the Jacobian is rank 21 of 24 instead of
    // 23, so this departure starts from the worst-conditioned point there is.
    const A: Quat[] = [
      { u: 1, v: 0.3, p: 0.1, q: 0 },
      { u: 0.8, v: 0, p: 0.25, q: 0.4 },
    ]
    const start = liftPolynomialPH(A)
    const unit = (row: readonly number[]): number[] => {
      const m = Math.hypot(...row) || 1
      return row.map((v) => v / m)
    }
    const jRank = (c: ConformalPHCurve): number => {
      const J = definingJacobian(c).map(unit)
      return rankFromGap(singularValues(J), J.length).rank
    }
    /** Two odometers for "how far off the polynomial stratum are we". */
    const offStratum = (c: ConformalPHCurve) => {
      const w = weights(c)
      return {
        // polynomial <=> every weight equal <=> every Farin bead at the midpoint
        beads: Math.max(...farinParameters(c).map((v) => Math.abs(v - 0.5))),
        weightSpread: Math.max(...w) / Math.min(...w) - 1,
        bend: bendability(c),
      }
    }

    const before = offStratum(start)
    console.log(
      `  at the lifted cubic: beads off centre ${before.beads.toExponential(1)},` +
        ` weight spread ${before.weightSpread.toExponential(1)},` +
        ` bend kernel ${before.bend.kernelDim} with <S,S> = ${before.bend.nullDefect.toExponential(1)},` +
        ` J rank ${jRank(start)} of 24`,
    )

    const data = hermiteDataOf(start)
    const dials: StrictCoordinate[] = [
      ...freeRadiusIndices(start).map((index) => ({ kind: 'radius', index }) as StrictCoordinate),
      { kind: 'length', from: 0, to: 0.5 },
      { kind: 'length', from: 0.5, to: 1 },
    ]
    const value = (c: ConformalPHCurve, d: StrictCoordinate): number =>
      d.kind === 'radius' ? radii(c)[d.index] : arcLength(c, 8, d.from ?? 0, d.to ?? 1)

    let departed = 0
    for (const d of dials) {
      const from0 = value(start, d)
      let cur = start
      let passes = 0
      for (let k = 0; k < 12; k++) {
        const step = dragStrict(cur, d, from0 * 1.35, { data, lengthSamples: 8 })
        if (!step.converged) break
        cur = step.state
        passes++
      }
      const after = offStratum(cur)
      const label = d.kind === 'radius' ? `rho_${d.index}` : `L(${d.from},${d.to})`
      const left = after.beads > 1e-6
      if (left) departed++
      console.log(
        `  ${label.padEnd(10)} ${passes} passes, ${from0.toFixed(3)} -> ${value(cur, d).toFixed(3)}` +
          `   beads off centre ${after.beads.toExponential(1)}` +
          `   weight spread ${after.weightSpread.toExponential(1)}` +
          `   bend kernel ${after.bend.kernelDim}` +
          `   J rank ${jRank(cur)}` +
          `   residual ${relResidual(cur).toExponential(1)}` +
          `   ${left ? '<- OFF the stratum' : '<- still polynomial'}`,
      )
      if (left) {
        expect(relResidual(cur), `${label} stays on the family`).toBeLessThan(1e-10)
      }
    }

    // Are the stuck dials genuinely blocked, or blocked only AT the singularity? Nudge off the
    // stratum with the one dial that works, then try them again from there.
    let nudged = start
    {
      const d = dials[1]
      const goal = value(start, d) * 1.05
      for (let k = 0; k < 6; k++) {
        const step = dragStrict(nudged, d, goal, { data, lengthSamples: 8 })
        if (!step.converged) break
        nudged = step.state
      }
    }
    console.log(
      `  after a 5% nudge off the stratum (beads ${offStratum(nudged).beads.toExponential(1)},` +
        ` J rank ${jRank(nudged)}):`,
    )
    const nudgedData = hermiteDataOf(nudged)
    for (const d of dials) {
      const from0 = value(nudged, d)
      let cur = nudged
      let passes = 0
      for (let k = 0; k < 12; k++) {
        const step = dragStrict(cur, d, from0 * 1.35, { data: nudgedData, lengthSamples: 8 })
        if (!step.converged) break
        cur = step.state
        passes++
      }
      const label = d.kind === 'radius' ? `rho_${d.index}` : `L(${d.from},${d.to})`
      console.log(
        `    ${label.padEnd(10)} ${passes} passes, ${from0.toFixed(3)} -> ${value(cur, d).toFixed(3)}` +
          `   ${passes > 0 ? 'moves' : 'STILL stuck'}`,
      )
    }

    expect(before.beads, 'the lift starts exactly on the stratum').toBeLessThan(1e-12)
    expect(Math.abs(before.bend.nullDefect), 'and reads as bendable, exactly').toBeLessThan(1e-12)
    expect(departed, 'at least one dial walks off into the rational family').toBeGreaterThan(0)
  }, 120_000)

  it('bending the cubic fibers gives 3 of the 5 moduli, never all 5', () => {
    // Eric's question, exactly. The polynomial PH cubics come in CLOSED fibers. Möbius images of them
    // are rational degree-6 members, so the bent fibers span more than the polynomial family did. Is
    // that the WHOLE degree-6 rational family, or only part of it?
    //
    // Dimension settles it, and it needs no solver. Build the tangent space to the Möbius ORBIT of the
    // lifted cubics at one of its points -- 11 polynomial parameters (A0, A1, p0) plus the 12 gauge
    // directions -- and read its rank in the 41-dimensional coefficient space. Below the family's own
    // 17 means the bent cubics are a proper subvariety, and the shortfall is what bending cannot reach.
    const liftAt = (A: readonly Quat[], p0: Vec3): ConformalPHCurve => {
      const cps = phControlPoints({ A, p0 } as SpatialPHCurve)
      const C = conformalLiftBezier(cps)
      return { C, h: elevate(speedPolynomial(A), C.length - 2) }
    }
    const P0: Vec3 = { x: 0.2, y: -0.1, z: 0.35 }
    const asQ = (v: readonly number[]): Quat => ({ u: v[0], v: v[1], p: v[2], q: v[3] })
    const memberOf = (v: readonly number[]): ConformalPHCurve =>
      liftAt([asQ(v.slice(0, 4)), asQ(v.slice(4, 8))], { x: v[8], y: v[9], z: v[10] })
    const theta = [
      CUBIC[0].u, CUBIC[0].v, CUBIC[0].p, CUBIC[0].q,
      CUBIC[1].u, CUBIC[1].v, CUBIC[1].p, CUBIC[1].q,
      P0.x, P0.y, P0.z,
    ]
    const base = memberOf(theta)

    const unit = (v: readonly number[]): number[] => {
      const m = Math.hypot(...v) || 1
      return v.map((x) => x / m)
    }
    // Directions as COLUMNS: the Jacobi SVD orthogonalises columns, so it wants rows >= cols, and here
    // there are 41 coefficients against at most 23 directions.
    const spanRank = (dirs: readonly (readonly number[])[]): number => {
      const cols = dirs.map(unit)
      const m = Array.from({ length: cols[0].length }, (_, i) => cols.map((c) => c[i]))
      return rankFromGap(singularValues(m), m.length).rank
    }

    const step = 1e-6
    const poly: number[][] = theta.map((_, j) => {
      const up = pack(memberOf(theta.map((v, i) => (i === j ? v + step : v))))
      const dn = pack(memberOf(theta.map((v, i) => (i === j ? v - step : v))))
      return up.map((v, i) => (v - dn[i]) / (2 * step))
    })
    const gauge = gaugeDirections(base)

    const polyRank = spanRank(poly)
    const orbitRank = spanRank([...poly, ...gauge])
    const gaugeRank = spanRank(gauge)
    const overlap = polyRank + gaugeRank - orbitRank

    // The 11th polynomial parameter is not a shape: A -> A·e^(i theta) leaves A i Abar alone, so the
    // parametrisation has a one-dimensional kernel. Measure it rather than asserting it.
    const circle = pack(
      liftAt([gaugeRotate(CUBIC[0], 1e-6), gaugeRotate(CUBIC[1], 1e-6)], P0),
    )
    const b = pack(base)
    const circleMotion = Math.hypot(...circle.map((v, i) => v - b[i])) / Math.hypot(...b)

    // The family's own dimension, read at a GENERIC member -- not here. The polynomial stratum is
    // singular (the defining Jacobian drops from 23 to 21), so its tangent cone there is too big to
    // use as the ambient count.
    //
    // The Jacobian rank is 23 of 24 and 41 - 23 = 18, one MORE than 2n+5 = 17. That last one is not a
    // real direction: the top PH condition reads n²⟨Aₙ,Aₙ⟩ = h_top², nullity has already forced the
    // left side to zero, so what survives is h_top² = 0 -- a genuine condition whose GRADIENT vanishes
    // because it is a double root. The linearisation cannot see it; the variety obeys it. Hence -1, and
    // h_top is measured below rather than assumed.
    const generic = sexticSeed()
    const Jg = definingJacobian(generic).map(unit)
    const jRankGeneric = rankFromGap(singularValues(Jg), Jg.length).rank
    const hPower = bernsteinToPower(generic.h as number[])
    const hTop = Math.abs(hPower[hPower.length - 1]) / Math.max(...hPower.map(Math.abs))
    const familyDim = pack(generic).length - jRankGeneric - 1

    console.log(
      `Möbius orbit of the lifted cubics, at one of its points:\n` +
        `    polynomial parameters      11 given, rank ${polyRank}` +
          `   (the missing one is A -> A e^{i t}: motion ${circleMotion.toExponential(1)})\n` +
        `    gauge directions           rank ${gaugeRank} of 12\n` +
        `    ORBIT tangent              rank ${orbitRank} of 41 coefficients\n` +
        `    overlap                    ${polyRank} + ${gaugeRank} - ${orbitRank} = ${overlap}` +
          `   (translation 3 + rotation 3 + dilation 1: the Möbius maps that keep a polynomial polynomial)\n` +
        `    the family itself          41 - ${jRankGeneric} - 1 = ${familyDim} at a generic member` +
          `   [2n+5 = 17; the -1 is the gradient-free row, h_top = ${hTop.toExponential(1)}]\n` +
        `    MODULI: bent cubics ${orbitRank} - ${gaugeRank} = ${orbitRank - gaugeRank}` +
          `   vs the family's ${familyDim} - ${gaugeRank} = ${familyDim - gaugeRank}` +
          `   -> CODIMENSION ${familyDim - orbitRank}`,
    )

    // The same codimension, from the other side: bendability is the rank drop of a 6x5 matrix, and the
    // rank <= 4 locus of an m x n matrix has codimension (m-r)(n-r) = 2. So the two derivations of
    // "codimension 2" are independent -- one a tangent-space count, one determinantal.
    const bentBend = bendability(base)
    const genericBend = bendability(generic)

    // And the fibers themselves: does a CLOSED fiber stay closed after a genuine bend? Take the
    // transversion, the only piece of the Möbius group that bends lines into circles, so the image is
    // certainly not a similarity copy.
    const mu = matrixExp5(inversiveBendGenerator({ x: 0.4, y: -0.25, z: 0.15 }))
    const p0f = { x: 0, y: 0, z: 0 }
    const p1f = { x: 0.6, y: 0.25, z: 0.1 }
    const p3f = { x: 1.7, y: 0.4, z: 0.55 }
    const fiber = spatialCubicFiber(p0f, p1f, p3f, { samples: 220, step: 0.05 })
    const bent = fiber.map((f) => {
      const cps = cubicControlPoints(f.curve)
      const lifted = { C: conformalLiftBezier(cps), h: elevate(speedPolynomial([f.curve.A0, f.curve.A1]), 5) }
      return mobiusImage(lifted, mu)
    })
    const bentResidual = Math.max(...bent.map(relResidual))
    const bentBeads = Math.min(...bent.map((c) => Math.max(...farinParameters(c).map((v) => Math.abs(v - 0.5)))))
    const X = bent.map(pack)
    const gaps: number[] = []
    for (let i = 1; i < X.length; i++) gaps.push(Math.hypot(...X[i].map((v, j) => v - X[i - 1][j])))
    const median = [...gaps].sort((x, y) => x - y)[Math.floor(gaps.length / 2)]
    const endGap = Math.hypot(...X[X.length - 1].map((v, j) => v - X[0][j]))
    const L = bent.map((c) => arcLength(c, 512))
    const bentSpread = (Math.max(...L) - Math.min(...L)) / Math.max(...L)

    console.log(
      `    bendable at the lift       kernel ${bentBend.kernelDim}, ⟨S,S⟩ = ${bentBend.nullDefect.toExponential(1)}\n` +
        `    bendable at the seed       kernel ${genericBend.kernelDim}` +
          `   (so a generic member is NOT any polynomial curve bent)\n` +
        `  the fiber after a transversion (${fiber.length} members):\n` +
        `    still members              residual <= ${bentResidual.toExponential(1)}\n` +
        `    no longer polynomial       least bead offset ${bentBeads.toExponential(1)}\n` +
        `    still a CLOSED loop        end gap ${(endGap / median).toFixed(2)} median steps\n` +
        `    arc length along it        spread ${bentSpread.toExponential(1)}` +
          `   (it was 0 before the bend: the degeneracy is GONE)`,
    )

    expect(circleMotion, 'A -> A e^{i t} is not a shape direction').toBeLessThan(1e-9)
    expect(polyRank, 'so 11 polynomial parameters carry 10 directions').toBe(10)
    expect(gaugeRank, 'the gauge group is 12-dimensional').toBe(12)
    expect(overlap, 'the similarities are the overlap: 7 of them').toBe(7)
    expect(orbitRank, 'the bent cubics are 15-dimensional in the coefficient space').toBe(15)
    expect(hTop, 'deg h = n-2, so the top PH row has a vanishing gradient').toBeLessThan(1e-12)
    expect(familyDim, 'against the family 2n+5 = 17').toBe(17)
    expect(orbitRank - gaugeRank, 'MODULI of bent cubics: 3').toBe(3)
    expect(familyDim - orbitRank, 'a proper subvariety, of codimension 2').toBe(2)
    expect(Math.abs(bentBend.nullDefect), 'the lift is bendable, exactly').toBeLessThan(1e-12)
    expect(genericBend.kernelDim, 'a generic member is not bendable at all').toBe(0)
    expect(bentResidual, 'a bent fiber is still made of members').toBeLessThan(1e-12)
    expect(bentBeads, 'and none of them is polynomial any more').toBeGreaterThan(1e-3)
    expect(endGap / median, 'the bent fiber still closes').toBeLessThan(2.5)
    expect(bentSpread, 'but arc length now VARIES along it').toBeGreaterThan(1e-3)
  }, 120_000)

  it('the two new directions: what breaks is the STRAIGHTENING CENTRE', () => {
    // What do the two extra moduli look like? The thing that dies is a single geometric object. A
    // member is a bent polynomial iff some S has ⟨P(t),S⟩ ≡ const with S NULL. Null means S is a POINT,
    // and ⟨P,S⟩ ≡ const then says every inversion centred at S sends the curve to a polynomial one --
    // because an inversion about S sends S to infinity, and ⟨P,∞⟩ = −w(t), so constant weight.
    //
    // So S is a STRAIGHTENING CENTRE: stand there, invert, and the rational curve becomes polynomial.
    // Two independent things can take it away, and that is the codimension 2. This measures which.
    const bendM = (s: ConformalPHCurve): number[][] =>
      Array.from({ length: degreeOf(s) }, (_, i) =>
        METRIC_ROW(s.C[i].map((v, k) => v - s.C[i + 1][k]) as unknown as Conformal))

    /** The special vector, and the two ways it can fail: no vector at all, or a vector that is a SPHERE. */
    const special = (s: ConformalPHCurve) => {
      const D = bendM(s)
      const { sv, V } = svd(D)
      const S = V[V.length - 1] as unknown as Conformal
      return {
        rank: rankFromGap(sv, D.length).rank,
        defect: sv[sv.length - 1] / sv[0], // 0 = a special vector EXISTS
        nullity: innerProduct(S, S), //       0 = it is a POINT, non-zero = a genuine SPHERE
        S,
        D,
        sv,
      }
    }

    // A BENT cubic, not the lifted one: the lift puts the centre at infinity, where it cannot be drawn.
    // The bend must not push a POLE onto the curve -- w(t) = 0 somewhere in [0,1] sends the curve
    // through infinity and every arc length on it is meaningless (this cost a NaN before the guard went
    // in). Weights of one sign is the sufficient test, by the convex hull. Take the strongest bend that
    // passes, so the centre lands as close in as it honestly can.
    const lift0 = liftPolynomialPH(CUBIC)
    const oneSign = (c: ConformalPHCurve): boolean => {
      const w = weights(c)
      return w.every((v) => v > 0) || w.every((v) => v < 0)
    }
    let mu = matrixExp5(inversiveBendGenerator({ x: 0, y: 0, z: 0 }))
    let s0 = lift0
    let bendScale = 0
    for (const c of [0.4, 0.3, 0.22, 0.16, 0.11, 0.07, 0.045]) {
      const m = matrixExp5(inversiveBendGenerator({ x: c, y: -0.625 * c, z: 0.375 * c }))
      const cand = mobiusImage(lift0, m)
      if (oneSign(cand) && denominatorRealRoots(cand) === 0) { mu = m; s0 = cand; bendScale = c; break }
    }
    const at0 = special(s0)
    const centre = project(at0.S)

    // Does standing there actually straighten it? Invert about the centre and read the weights.
    let weightRatio = NaN, straightResidual = NaN, beadOffset = NaN
    const inv = centre ? reflectionMatrix(sphereVector(centre, 1)) : null
    if (inv) {
      const straight = mobiusImage(s0, inv)
      const w = weights(straight).map(Math.abs)
      weightRatio = Math.max(...w) / Math.min(...w)
      straightResidual = relResidual(straight)
      beadOffset = Math.max(...farinParameters(straight).map((v) => Math.abs(v - 0.5)))
    }

    console.log(
      `a BENT cubic (transversion of scale ${bendScale} applied to the lift):\n` +
        `    weights                    ${weights(s0).map((v) => v.toFixed(3)).join(' ')}  (one sign: no pole)\n` +
        `    special vector exists      rank ${at0.rank} of 5, defect ${at0.defect.toExponential(1)}\n` +
        `    and it is a POINT          ⟨S,S⟩ = ${at0.nullity.toExponential(1)}\n` +
        `    the straightening centre   (${centre?.x.toFixed(4)}, ${centre?.y.toFixed(4)}, ${centre?.z.toFixed(4)})\n` +
        `    inverting about it gives   weight ratio ${weightRatio.toFixed(12)},` +
          ` beads off centre ${beadOffset.toExponential(1)}, residual ${straightResidual.toExponential(1)}\n` +
        `                               -> a POLYNOMIAL curve, so the centre is real`,
    )

    // Now ride each of the five dials off the stratum and watch the centre.
    const data = hermiteDataOf(s0)
    const dials: StrictCoordinate[] = [
      ...freeRadiusIndices(s0).map((index) => ({ kind: 'radius', index }) as StrictCoordinate),
      { kind: 'length', from: 0, to: 0.5 },
      { kind: 'length', from: 0.5, to: 1 },
    ]
    const label = (d: StrictCoordinate): string =>
      d.kind === 'radius' ? `rho_${d.index}` : `L(${d.from},${d.to})`
    const value = (c: ConformalPHCurve, d: StrictCoordinate): number =>
      d.kind === 'radius' ? radii(c)[d.index] : arcLength(c, 8, d.from ?? 0, d.to ?? 1)
    const ride = (from: ConformalPHCurve, d: StrictCoordinate, target: number): ConformalPHCurve => {
      let cur = from
      for (let k = 0; k < 10; k++) {
        const step = dragStrict(cur, d, target, { data, lengthSamples: 8 })
        if (!step.converged) break
        cur = step.state
      }
      return cur
    }

    // WHICH dial combinations keep the centre? Not by riding dials -- four of the five are STUCK here,
    // because the polynomial stratum IS the singularity (finding 5), and an earlier version of this
    // test read a rank of 2 that was nothing but four identical "did not move" columns divided by a
    // clamp. So do it with no solver at all: the bendable directions inside the slice are exactly
    //
    //     (tangent to the Möbius orbit, 15 explicit directions)  ∩  (Hermite data held, 12 rows)
    //
    // and 15 − 12 = 3 of them, in a computation that touches neither the defining Jacobian nor a drag.
    const orbit: number[][] = []
    {
      const theta = [
        CUBIC[0].u, CUBIC[0].v, CUBIC[0].p, CUBIC[0].q,
        CUBIC[1].u, CUBIC[1].v, CUBIC[1].p, CUBIC[1].q, 0, 0, 0,
      ]
      const asQ = (v: readonly number[]): Quat => ({ u: v[0], v: v[1], p: v[2], q: v[3] })
      const bentOf = (v: readonly number[]): ConformalPHCurve => {
        const cps = phControlPoints({
          A: [asQ(v.slice(0, 4)), asQ(v.slice(4, 8))],
          p0: { x: v[8], y: v[9], z: v[10] },
        } as SpatialPHCurve)
        const C = conformalLiftBezier(cps)
        return mobiusImage({ C, h: elevate(speedPolynomial([asQ(v.slice(0, 4)), asQ(v.slice(4, 8))]), C.length - 2) }, mu)
      }
      const st = 1e-6
      for (let j = 0; j < theta.length; j++) {
        const up = pack(bentOf(theta.map((v, i) => (i === j ? v + st : v))))
        const dn = pack(bentOf(theta.map((v, i) => (i === j ? v - st : v))))
        orbit.push(up.map((v, i) => (v - dn[i]) / (2 * st)))
      }
      orbit.push(...gaugeDirections(s0))
    }

    /** Gram-Schmidt, keeping only what is genuinely new -- the count is asserted, never assumed. */
    const independent = (vs: readonly (readonly number[])[], rel = 1e-8): number[][] => {
      const big = Math.max(...vs.map((v) => Math.hypot(...v)))
      const out: number[][] = []
      for (const v0 of vs) {
        let v = [...v0]
        for (const q of out) {
          const dp = q.reduce((a, x, i) => a + x * v[i], 0)
          v = v.map((x, i) => x - dp * q[i])
        }
        const nrm = Math.hypot(...v)
        if (nrm > big * rel) out.push(v.map((x) => x / nrm))
      }
      return out
    }
    const Q = independent(orbit)

    // The Hermite map, in the orbit's own 15 coordinates.
    const x0 = pack(s0)
    const twelve = (c: ConformalPHCurve): number[] => {
      const d = hermiteDataOf(c)
      return [d.p0, d.p1, d.d0, d.d1].flatMap((v) => [v.x, v.y, v.z])
    }
    const st2 = 1e-6
    const H = Array.from({ length: 12 }, () => new Array(Q.length).fill(0))
    for (let j = 0; j < Q.length; j++) {
      const up = twelve(unpack(x0.map((v, i) => v + st2 * Q[j][i])))
      const dn = twelve(unpack(x0.map((v, i) => v - st2 * Q[j][i])))
      for (let r = 0; r < 12; r++) H[r][j] = (up[r] - dn[r]) / (2 * st2)
    }
    // Kernel of H = what is left of the orbit once the Hermite data is pinned: complete the 12 rows to
    // a basis of R^15 and keep the completion.
    const spanH = independent(H)
    const axes: number[][] = Array.from({ length: Q.length }, (_, i) =>
      Array.from({ length: Q.length }, (_, j) => (i === j ? 1 : 0)),
    )
    const kernel = independent([...spanH, ...axes]).slice(spanH.length)

    // IS ONE OF THE THREE THE PROJECTIVE SCALE? C ↦ cC, h ↦ ch changes no curve point, no radius
    // (ρ = √⟨C,C⟩ / w scales top and bottom alike) and no speed (h/w likewise) -- and the Hermite data
    // is built from curve points and a RATIO of weights, so it is blind to the scale too. Meanwhile the
    // constraint set is a CONE (every condition is quadratic), so the scaling direction is tangent to
    // it. Conclusion if it lands in the kernel: the stratum holds 2 SHAPES, not 3, and the dial rank of
    // 2 is the honest dimension rather than a degenerate chart.
    const scaleInQ = (() => {
      const nrm = Math.hypot(...x0)
      return Q.map((q) => q.reduce((a, v, i) => a + v * x0[i], 0) / nrm)
    })()
    const scaleInOrbit = Math.hypot(...scaleInQ)
    const scaleInKernel = Math.hypot(
      ...kernel.map((k) => k.reduce((a, v, j) => a + v * scaleInQ[j], 0)),
    ) / (scaleInOrbit || 1)
    const stS = 1e-6
    const upS = unpack(x0.map((v) => v * (1 + stS)))
    const dnS = unpack(x0.map((v) => v * (1 - stS)))
    const dialToScale = dials.map((d) => (value(upS, d) - value(dnS, d)) / (2 * stS * value(s0, d)))
    const hRef = Math.max(...twelve(s0).map(Math.abs))
    const hermiteToScale =
      Math.max(...twelve(upS).map((v, i) => Math.abs(v - twelve(dnS)[i]))) / (2 * stS * hRef)

    console.log(
      `  the PROJECTIVE SCALE, C -> cC:\n` +
        `    inside the orbit tangent   ${scaleInOrbit.toFixed(6)} of 1\n` +
        `    inside the 3-dim kernel    ${scaleInKernel.toFixed(6)} of 1\n` +
        `    Hermite data responds      ${hermiteToScale.toExponential(1)}\n` +
        `    the five dials respond     ${dialToScale.map((v) => v.toExponential(1)).join(' ')}\n` +
        `    -> it is IN the slice and invisible to everything shown, so the slice holds one fewer` +
          ` SHAPE than it holds directions`,
    )

    // Read those directions in DIAL coordinates: what relative change in each dial do they make?
    const toCoeff = (k: readonly number[]): number[] =>
      Array.from({ length: x0.length }, (_, i) => k.reduce((a, kc, j) => a + kc * Q[j][i], 0))
    const ratesAt = (st3: number): number[][] =>
      kernel.map((k) => {
        const dir = toCoeff(k)
        const up = unpack(x0.map((v, i) => v + st3 * dir[i]))
        const dn = unpack(x0.map((v, i) => v - st3 * dir[i]))
        return dials.map((d) => (value(up, d) - value(dn, d)) / (2 * st3 * value(s0, d)))
      })
    const dialRates = ratesAt(1e-6)
    // Rank of the 5x3 matrix of dial rates: how much of the 3-dimensional bendable stratum the five
    // dials can actually SEE. (The annihilator has to come from a Gram-Schmidt completion, not from
    // this SVD's V -- V is 3x3 here, and reading a 4th and 5th entry off it gave NaN.)
    const R = Array.from({ length: 5 }, (_, i) => dialRates.map((r) => r[i]))
    const rRank = rankFromGap(singularValues(R), 5)
    const dialAxes: number[][] = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i === j ? 1 : 0)),
    )
    // The floor here is 1e-7 relative, not the usual 1e-8: the step scan above puts this construction's
    // noise at 5e-10 relative, and the two real rates are at 1 and 0.4, so 1e-7 separates a
    // machine-precision zero from a nonzero value with nine orders of room on both sides.
    const seenByDials = independent(dialRates, 1e-7)
    const unreachable = independent([...seenByDials, ...dialAxes]).slice(seenByDials.length)

    // Does each of the three genuinely MOVE the curve? (Asking instead how much of the direction lies
    // in the 12-dimensional gauge span is meaningless: a generic vector in 15 dimensions already has
    // projection sqrt(12/15) = 0.89 onto any 12-dimensional subspace. Transversality to the gauge is
    // the Hermite-slice theorem's business, and it is pinned in its own test.)
    const shapeOf = (k: readonly number[]) => {
      const dir = toCoeff(k)
      const st3 = 1e-6
      const up = unpack(x0.map((v, i) => v + st3 * dir[i]))
      const dn = unpack(x0.map((v, i) => v - st3 * dir[i]))
      let vel = 0
      for (let i = 0; i <= 20; i++) {
        const t = i / 20
        const a = curveAt(up, t), b = curveAt(dn, t)
        if (a && b) vel = Math.max(vel, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / (2 * st3))
      }
      return { vel }
    }

    console.log(
      `  the bendable directions inside the slice, with no solver:\n` +
        `    orbit tangent              ${Q.length} of ${orbit.length} given\n` +
        `    Hermite rows on it         ${spanH.length} of 12\n` +
        `    what survives              ${kernel.length}   [15 - 12 = 3]\n` +
        `    seen in DIAL coordinates   rank ${rRank.rank} (gap ${rRank.gap.toExponential(1)});` +
          ` singular values ${singularValues(R).map((v) => v.toExponential(1)).join(' ')}\n` +
        `    the third one, by step     ` +
          [1e-4, 1e-5, 1e-6].map((h) => {
            const s = singularValues(Array.from({ length: 5 }, (_, i) => ratesAt(h).map((r) => r[i])))
            return `h=${h.toExponential(0)}: ${s[2].toExponential(1)}`
          }).join('   ') +
          `\n                               (100x the step moves it 4x, so it is the construction's NOISE` +
          ` FLOOR -- not a resolved quantity -- and it sits 9 orders under the two real ones)`,
    )
    for (const [k, kv] of kernel.entries()) {
      const sh = shapeOf(kv)
      console.log(
        `    bendable direction ${k + 1}       dial rates ` +
          dialRates[k].map((v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(4)).join(' ') +
          `   curve speed ${sh.vel.toExponential(1)}`,
      )
    }
    // The stratum's 3 directions are 1 projective scale + 2 shapes, so its dial image being 2-dimensional
    // is EXACTLY RIGHT, and these three complementary dial motions are three genuine shape requests that
    // leave the stratum. (An earlier reading of this called the dial chart degenerate. It is not; the
    // missing dimension was the scale, which changes nothing at all.)
    for (const [k, v] of unreachable.entries()) {
      console.log(
        `    outside the stratum's dial image ${k + 1}   ` +
          dials.map((d, i) => `${label(d)} ${v[i] >= 0 ? '+' : '−'}${Math.abs(v[i]).toFixed(3)}`).join('  '),
      )
    }

    // And the one dial that does ride here: does it leave the stratum, and HOW does the centre die?
    console.log(`  riding each dial 3% with the Hermite data held (4 of 5 stall at the singularity):`)
    for (const d of dials) {
      const from0 = value(s0, d)
      const cur = ride(s0, d, from0 * 1.03)
      const got = (value(cur, d) - from0) / from0
      const now = special(cur)
      console.log(
        `    ${label(d).padEnd(10)} moved ${(got * 100).toFixed(1)}%` +
          `   rank ${now.rank}   defect ${now.defect.toExponential(1)}` +
          `   ⟨S,S⟩ ${now.nullity.toExponential(1)}` +
          `   residual ${relResidual(cur).toExponential(1)}` +
          `   ${got > 1e-6 ? (now.rank === 5 ? '<- CENTRE GONE' : '<- centre survives') : '<- stalled'}`,
      )
    }

    expect(bendScale, 'a genuine bend, not the identity').toBeGreaterThan(0)
    expect(oneSign(s0), 'and no pole on the curve, so arc length means something').toBe(true)
    expect(at0.rank, 'a bent cubic has a special vector').toBe(4)
    expect(Math.abs(at0.nullity), 'and it is a point, exactly').toBeLessThan(1e-12)
    expect(centre, 'the centre is finite, so it can be drawn').not.toBeNull()
    expect(weightRatio, 'inverting about it straightens the curve into a polynomial').toBeCloseTo(1, 9)
    expect(beadOffset, 'every Farin bead back at the midpoint').toBeLessThan(1e-9)
    expect(straightResidual, 'and it is still a member').toBeLessThan(1e-12)
    expect(Q.length, 'the orbit tangent is 15-dimensional here too').toBe(15)
    expect(spanH.length, 'the 12 Hermite rows are independent on it').toBe(12)
    expect(kernel.length, 'so 3 bendable directions survive in the slice').toBe(3)
    expect(
      Math.min(...kernel.map((k) => shapeOf(k).vel)),
      'every one of the three genuinely moves the curve',
    ).toBeGreaterThan(1e-4)
    expect(scaleInKernel, 'the projective scale is one of the three, entirely').toBeCloseTo(1, 6)
    expect(hermiteToScale, 'the Hermite data cannot see it').toBeLessThan(1e-8)
    expect(Math.max(...dialToScale.map(Math.abs)), 'and neither can any dial').toBeLessThan(1e-8)
    expect(rRank.rank, 'so the stratum is 2 SHAPES, and the dials see exactly 2').toBe(2)
    expect(unreachable.length, 'leaving 3 dial motions that leave the stratum').toBe(3)
  }, 180_000)

  it('the algebra a closed form would have to satisfy: q is ISOTROPIC at every root of w', () => {
    // Toward a closed formula for the family. P = (w, q, ‖q‖²/2w) is a POLYNOMIAL 5-vector only if
    // w divides ‖q‖². And w can have no real root: a real root would force ‖q‖² = 0 there, hence
    // q = 0 there (a sum of REAL squares), hence a common factor and a reducible curve. So
    //
    //     w = ∏ (t − z_j)(t − z̄_j),   three conjugate pairs, no real roots
    //     w | ‖q‖²   ⟺   q(z_j)² summed over the three components = 0 IN C³
    //
    // The second line is the whole nullity condition, and it is a statement about ISOTROPIC vectors in
    // C³ — which are exactly the image of the spinor map (a²−b², i(a²+b²), −2ab). That is what makes a
    // closed form conceivable: choose the roots, choose a spinor at each, interpolate q.
    const s = sexticSeed()
    const hod = hodograph(s)
    const asC = (p: readonly number[]): { re: number; im: number }[] => p.map((v) => ({ re: v, im: 0 }))
    const roots = rootsOf(asC(hod.w))
    const cmulL = (a: { re: number; im: number }, b: { re: number; im: number }) =>
      ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
    const evalC = (p: readonly number[], z: { re: number; im: number }) => {
      let acc = { re: 0, im: 0 }
      for (let k = p.length - 1; k >= 0; k--) acc = { re: cmulL(acc, z).re + p[k], im: cmulL(acc, z).im }
      return acc
    }

    const imParts = roots.map((z) => Math.abs(z.im))
    const isotropy = roots.map((z) => {
      const v = hod.q.map((qi) => evalC(qi, z))
      const sum = v.reduce((acc, c) => {
        const sq = cmulL(c, c)
        return { re: acc.re + sq.re, im: acc.im + sq.im }
      }, { re: 0, im: 0 })
      const scale = Math.max(...v.map((c) => c.re * c.re + c.im * c.im))
      return Math.hypot(sum.re, sum.im) / Math.max(scale, 1e-300)
    })

    console.log(
      `the degree-6 seed, in the (w, q) algebra:\n` +
        `    roots of w                 ` +
          roots.map((z) => `${z.re.toFixed(3)}${z.im >= 0 ? '+' : '−'}${Math.abs(z.im).toFixed(3)}i`).join('  ') + `\n` +
        `    smallest |Im|              ${Math.min(...imParts).toExponential(1)}` +
          `   (no real roots, so w is a product of three definite quadratics)\n` +
        `    ISOTROPY of q there        ` + isotropy.map((v) => v.toExponential(1)).join('  ') + `\n` +
        `                               (q1²+q2²+q3² = 0 in C³ at each root: the nullity condition, exactly)\n` +
        `    ‖N‖ = h·w as polynomials   ${hod.squareDefect.toExponential(1)}` +
          `   (so N has POLYNOMIAL norm, hence Hopf form N = A i A*)`,
    )

    expect(roots.length, 'w is degree 6').toBe(6)
    expect(Math.min(...imParts), 'and has no real roots').toBeGreaterThan(1e-3)
    expect(Math.max(...isotropy), 'q is isotropic at every root of w').toBeLessThan(1e-9)
    expect(hod.squareDefect, 'and N has polynomial norm h·w').toBeLessThan(1e-9)
  }, 60_000)

  it('the SPINOR side: the no-log condition is uv = w′ν − wν′, ν free', () => {
    // The residue condition at a simple root z of w reads N′(z) = (w″/w′)(z)·N(z). Write A = u + vj and
    // read N = A i A* in the NULL basis X = N_j + i N_k = c·uv, Y = c̄·u*v*, Z = uu* − vv*, where * is
    // coefficient conjugation. Then ‖N‖² = Z² + XY, and the three components of the condition become
    //
    //     (uv)′/(uv) = w″/w′ at z ,   (u*v*)′/(u*v*) = w″/w′ at z ,   and the Z component
    //
    // where the Z component is IMPLIED by the other two: substituting the logarithmic derivatives
    // α+β = μ and α*+β* = μ into it gives (α+α*) + (β+β*) = 2μ, which is their sum. And the second is
    // the coefficient conjugate of the first, with w real, so it is automatic too. Everything therefore
    // collapses onto the PRODUCT π = uv:
    //
    //     w | π′w′ − πw″                                                             (the condition)
    //     π = w′ν − wν′ , ν complex of degree ≤ 5, FREE                              (its closed form)
    //
    // The second line is exact: putting π = wμ + w′ν gives π′w′ − πw″ ≡ w′²(μ + ν′) mod w, and since
    // deg(μ + ν′) ≤ 4 < 6 = deg w the divisibility forces μ = −ν′, not merely μ ≡ −ν′. The solution
    // space is 6 complex dimensional out of 11, one MORE than the 6 root conditions would allow — the
    // dependency is the residue theorem, N/w² decaying like t⁻² so its residues sum to zero.
    const s = sexticSeed()
    const hf = hopfForm(s)
    expect(hf, 'the seed has a Hopf form').not.toBeNull()
    if (!hf) return
    const w = hf.w
    type Cx = { re: number; im: number }
    const cm = (a: Cx, b: Cx): Cx => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
    const cpmul = (a: readonly Cx[], b: readonly Cx[]): Cx[] => {
      const out: Cx[] = Array.from({ length: a.length + b.length - 1 }, () => ({ re: 0, im: 0 }))
      for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
        const t = cm(a[i], b[j])
        out[i + j] = { re: out[i + j].re + t.re, im: out[i + j].im + t.im }
      }
      return out
    }
    const cpderiv = (a: readonly Cx[]): Cx[] =>
      a.slice(1).map((c, k) => ({ re: c.re * (k + 1), im: c.im * (k + 1) }))
    const real = (p: readonly number[]): Cx[] => p.map((v) => ({ re: v, im: 0 }))
    const cpsub = (a: readonly Cx[], b: readonly Cx[]): Cx[] =>
      Array.from({ length: Math.max(a.length, b.length) }, (_, k) => ({
        re: (a[k]?.re ?? 0) - (b[k]?.re ?? 0), im: (a[k]?.im ?? 0) - (b[k]?.im ?? 0),
      }))
    const cpmax = (a: readonly Cx[]): number => Math.max(...a.map((c) => Math.hypot(c.re, c.im)), 0)
    const dpoly = (p: readonly number[]): number[] => p.slice(1).map((v, k) => v * (k + 1))

    const pi = cpmul(hf.u, hf.v)
    const wp = dpoly(w), wpp = dpoly(wp)

    // (1) THE CONDITION: divide π′w′ − πw″ by w and read the remainder.
    const R = cpsub(cpmul(cpderiv(pi), real(wp)), cpmul(pi, real(wpp)))
    const rem = R.map((c) => ({ ...c }))
    for (let k = rem.length - 1; k >= w.length - 1; k--) {
      const f = { re: rem[k].re / w[w.length - 1], im: rem[k].im / w[w.length - 1] }
      for (let j = 0; j < w.length; j++) {
        const t = cm(f, { re: w[j], im: 0 })
        rem[k - (w.length - 1) + j] = {
          re: rem[k - (w.length - 1) + j].re - t.re,
          im: rem[k - (w.length - 1) + j].im - t.im,
        }
      }
    }
    const remainder = cpmax(rem.slice(0, w.length - 1)) / Math.max(cpmax(R), 1e-300)

    // (2) ITS CLOSED FORM: recover ν of degree ≤ 5 from π = w′ν − wν′, by least squares over the 11
    // coefficient equations, and report how well it reproduces π.
    const basis: Cx[][] = Array.from({ length: 6 }, (_, j) => {
      const e = Array.from({ length: 6 }, (_, k) => ({ re: k === j ? 1 : 0, im: 0 }))
      return cpsub(cpmul(real(wp), e), cpmul(real(w), cpderiv(e)))
    })
    const rows = Math.max(...basis.map((b) => b.length), pi.length)
    const M: number[][] = [], rhs: number[] = []
    for (let r = 0; r < rows; r++) {
      M.push(basis.map((b) => b[r]?.re ?? 0)); rhs.push(pi[r]?.re ?? 0)
      M.push(basis.map((b) => b[r]?.im ?? 0)); rhs.push(pi[r]?.im ?? 0)
    }
    // ν is complex, so each basis column splits into a real and an imaginary multiplier.
    const cols: number[][] = []
    for (let j = 0; j < 6; j++) {
      cols.push(M.map((row) => row[j]))
      cols.push(M.map((_row, r) => (r % 2 === 0 ? -M[r + 1][j] : M[r - 1][j])))
    }
    const G = cols.map((a) => cols.map((b) => a.reduce((acc, v, i) => acc + v * b[i], 0)))
    const gb = cols.map((a) => a.reduce((acc, v, i) => acc + v * rhs[i], 0))
    for (let i = 0; i < 12; i++) {
      let piv = i
      for (let r = i + 1; r < 12; r++) if (Math.abs(G[r][i]) > Math.abs(G[piv][i])) piv = r
      ;[G[i], G[piv]] = [G[piv], G[i]]; [gb[i], gb[piv]] = [gb[piv], gb[i]]
      for (let r = i + 1; r < 12; r++) {
        const f = G[r][i] / G[i][i]
        for (let c2 = i; c2 < 12; c2++) G[r][c2] -= f * G[i][c2]
        gb[r] -= f * gb[i]
      }
    }
    const x = new Array(12).fill(0)
    for (let i = 11; i >= 0; i--) {
      let acc = gb[i]
      for (let c2 = i + 1; c2 < 12; c2++) acc -= G[i][c2] * x[c2]
      x[i] = acc / G[i][i]
    }
    const nu: Cx[] = Array.from({ length: 6 }, (_, j) => ({ re: x[2 * j], im: x[2 * j + 1] }))
    const rebuilt = cpsub(cpmul(real(wp), nu), cpmul(real(w), cpderiv(nu)))
    const nuDefect = cpmax(cpsub(rebuilt, pi)) / Math.max(cpmax(pi), 1e-300)

    // (3) WHAT IS LEFT: w | uu* + vv*. Per conjugate pair of roots this says the spinor at z and at z̄
    // are HERMITIAN-ORTHOGONAL in C²: u(z)·conj(u(z̄)) + v(z)·conj(v(z̄)) = 0.
    const roots = rootsOf(real(w))
    const evalC = (p: readonly Cx[], z: Cx): Cx => {
      let acc: Cx = { re: 0, im: 0 }
      for (let k = p.length - 1; k >= 0; k--) {
        const t = cm(acc, z)
        acc = { re: t.re + p[k].re, im: t.im + p[k].im }
      }
      return acc
    }
    const used = new Set<number>()
    const ortho: number[] = []
    for (let a = 0; a < roots.length; a++) {
      if (used.has(a)) continue
      let best = -1, bestD = Infinity
      for (let b = 0; b < roots.length; b++) {
        if (b === a || used.has(b)) continue
        const d = Math.hypot(roots[a].re - roots[b].re, roots[a].im + roots[b].im)
        if (d < bestD) { bestD = d; best = b }
      }
      if (best < 0) continue
      used.add(a); used.add(best)
      const z = roots[a], zb = roots[best]
      const U1 = evalC(hf.u, z), U2 = evalC(hf.u, zb)
      const V1 = evalC(hf.v, z), V2 = evalC(hf.v, zb)
      const ip = {
        re: U1.re * U2.re + U1.im * U2.im + V1.re * V2.re + V1.im * V2.im,
        im: U1.im * U2.re - U1.re * U2.im + V1.im * V2.re - V1.re * V2.im,
      }
      const scale = Math.max(
        Math.hypot(U1.re, U1.im) * Math.hypot(U2.re, U2.im),
        Math.hypot(V1.re, V1.im) * Math.hypot(V2.re, V2.im),
      )
      ortho.push(Math.hypot(ip.re, ip.im) / Math.max(scale, 1e-300))
    }

    console.log(
      `the spinor side, on the degree-6 seed:\n` +
        `    Hopf form recovered        sandwich ${hf.sandwichDefect.toExponential(1)},` +
          ` norm ${hf.normDefect.toExponential(1)}, selection gap ${hf.selectionGap.toExponential(1)}\n` +
        `    w | π′w′ − πw″             remainder ${remainder.toExponential(1)}` +
          `   <- THE no-log condition, on the product π = uv alone\n` +
        `    π = w′ν − wν′              defect ${nuDefect.toExponential(1)}` +
          `   <- and ν of degree 5 recovers it, so the condition is SOLVED\n` +
        `    ν                          ` +
          nu.map((c) => `${c.re.toFixed(3)}${c.im >= 0 ? '+' : '−'}${Math.abs(c.im).toFixed(3)}i`).join(' ') + `\n` +
        `    ⟨s(z), s(z̄)⟩ per pair      ` + ortho.map((v) => v.toExponential(1)).join('  ') +
          `   <- what REMAINS: w | uu* + vv*, i.e. Hermitian orthogonality`,
    )

    expect(hf.sandwichDefect, 'the Hopf extraction is exact').toBeLessThan(1e-8)
    expect(remainder, 'the no-log condition holds on the product uv').toBeLessThan(1e-8)
    expect(nuDefect, 'and uv = w′ν − wν′ reproduces it exactly').toBeLessThan(1e-8)
    expect(ortho.length, 'three conjugate pairs').toBe(3)
    expect(Math.max(...ortho), 'the spinor is Hermitian-orthogonal across each pair').toBeLessThan(1e-8)
  }, 60_000)

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
