// ============================================================================
// A RATIONAL BÉZIER CURVE OF SPHERES, AND ITS ENVELOPE — the unconstrained object.
//
// WHAT THIS IS FOR. `conformalPHCurve` imposes two conditions at once (null, and PH). This module
// imposes NONE. A control point is a plain sphere — centre, radius, weight — and every one of those
// is yours. Nothing here solves anything: every function below is arithmetic, which is why the
// figure using it drags at frame rate with no seeding.
//
// A ONE-PARAMETER FAMILY OF SPHERES IS NOT A CURVE. It has an ENVELOPE, and the envelope is a CANAL
// SURFACE — the tube the family sweeps. In the plane the same object is the medial axis transform:
// a shape given by the discs that fill it rather than by its boundary.
//
// ── WHICH SPACE, AND WHY IT IS NOT THE ONE NEXT DOOR ────────────────────────────────────────────
//
// Spheres have two classical homes and they are DIFFERENT GEOMETRIES, not two spellings:
//
//   ℝ^{4,1}  MÖBIUS.    A sphere is a vector, ⟨S,S⟩ = w²ρ² — UNORIENTED, since that gives ρ² and
//                       never ρ. Points are the null vectors. Angles are preserved.
//   ℝ^{3,1}  LAGUERRE.  A sphere IS the point (centre, radius), radius SIGNED. Oriented contact is
//                       the Minkowski segment being lightlike, |Δc|² = Δρ². Points are not
//                       preserved — a point may become a sphere.
//
// Both are subgroups of one Lie sphere group in ℝ^{4,2} (Krasauskas, AACA 27, 2017 — already cited
// by the hodograph-light-cone deck), so this is not a choice of allegiance. But it IS a choice of
// which straight lines you get, and the difference is not subtle:
//
//   MEASURED: two spheres of radius 0.7 with centres 3 apart — DISJOINT — joined by a straight line
//   in ℝ^{4,1} pass through radius −1.33 at the midpoint. An IMAGINARY sphere. That is the classical
//   pencil fact (two non-intersecting spheres determine a pencil with no real member between them),
//   it is correct, and it makes ℝ^{4,1} interpolation useless as something to drag: set two spheres
//   apart and the tube between them ceases to exist.
//
// So this module interpolates CYCLOGRAPHICALLY — centre and radius as independent rational Bézier
// functions, which is what the canal-surface literature does and what gives a cone frustum between
// two spheres instead of a gap. The ℝ^{4,1} reading is kept as `conformalOf` so the contrast can be
// shown rather than asserted.
//
// ── THE ENVELOPE, derived rather than quoted ────────────────────────────────────────────────────
//
// A point x is on the envelope when it is on the sphere AND on the derivative of that condition:
//
//     |x − c|² = ρ²        and        ⟨x − c, ċ⟩ = −ρ ρ̇
//
// The second is a PLANE, so the contact set is a CIRCLE — the characteristic circle:
//
//     centre = c − (ρ ρ̇ / |ċ|²) ċ            radius = ρ √(1 − ρ̇²/|ċ|²)
//
// THE ENVELOPE THEREFORE EXISTS ONLY WHERE |ċ|² > ρ̇², and that is not an algebraic nicety — it is
// whether the tube is there. Pull a radius faster than its centre moves and the root goes imaginary
// and the surface stops existing, visibly, mid-drag.
//
// AND THAT QUANTITY IS THE MINKOWSKI ONE: |ċ|² − ρ̇² is the squared speed of the spine in ℝ^{3,1}.
// So the envelope's rationality condition — |ċ|² − ρ̇² a perfect square — is Pythagorean in the
// MINKOWSKI metric. That is MPH: canal surfaces, offsets, the medial axis. It is NOT the condition
// `conformalPHCurve` imposes; they are invariants of two different subgroups.
//
// THE SECOND FAILURE MODE is different and also visible: even where the envelope exists, the tube
// SELF-INTERSECTS once the radius outruns the spine's radius of curvature, ρκ > 1.
//
// DEGREE 5 IS HONEST HERE, and the contrast with the constrained figure is worth saying out loud:
// the parity theorem needs the null condition (⟨C,C⟩ ≡ 0 forcing ‖q‖² = 2w·c∞) to force a common
// factor. With no conditions there is no identity and nothing is forced.
// ============================================================================
import type { Conformal } from './conformal'
import { type Vec3, vadd, vcross, vnorm, vscale, vsub } from './quaternion'

/**
 * One control sphere. A NEGATIVE radius is legal and means the ORIENTATION IS REVERSED — in the
 * cyclographic model the radius is signed and the sphere stays perfectly real. (Do not confuse this
 * with ℝ^{4,1}'s ⟨S,S⟩ < 0, which is an IMAGINARY sphere and has no real counterpart at all. Same
 * minus sign, two different meanings — which is the orientation difference between the two models,
 * made concrete.)
 */
export interface ControlSphere {
  readonly centre: Vec3
  readonly radius: number
  readonly weight: number
}

/** A rational Bézier curve of spheres. */
export interface SphereSpline {
  readonly S: readonly ControlSphere[]
}

export const degreeOf = (s: SphereSpline): number => s.S.length - 1

/**
 * The ℝ^{4,1} vector of a sphere — `S = w(P(c) − ½ρ²∞)`, so `⟨S,S⟩ = w²ρ²`.
 * Kept so the two models can be COMPARED (see the header's pencil measurement); nothing in this
 * module evaluates through it.
 */
export function conformalOf(s: ControlSphere): Conformal {
  const { centre: c, radius: r, weight: w } = s
  const n2 = c.x * c.x + c.y * c.y + c.z * c.z
  const signed = r >= 0 ? r * r : -r * r
  return [w, w * c.x, w * c.y, w * c.z, (w * (n2 - signed)) / 2] as unknown as Conformal
}

// --- homogeneous cyclographic coordinates: (W, W·c, W·ρ) --------------------
type Hom = [number, number, number, number, number]

const homOf = (s: ControlSphere): Hom =>
  [s.weight, s.weight * s.centre.x, s.weight * s.centre.y, s.weight * s.centre.z, s.weight * s.radius]

/** Bernstein derivative coefficients: Dₖ = n(Cₖ₊₁ − Cₖ). */
const deriv = (C: readonly Hom[]): Hom[] => {
  const n = C.length - 1
  return Array.from({ length: n }, (_, k) =>
    C[k].map((v, i) => n * (C[k + 1][i] - v)) as Hom)
}

const deCasteljau = (C: readonly Hom[], t: number): Hom => {
  if (C.length === 0) return [0, 0, 0, 0, 0]
  let p = C.map((c) => [...c] as Hom)
  while (p.length > 1) {
    const next: Hom[] = []
    for (let i = 0; i < p.length - 1; i++) {
      next.push(p[i].map((v, k) => (1 - t) * v + t * p[i + 1][k]) as Hom)
    }
    p = next
  }
  return p[0]
}

/** Centre, radius and weight of the sphere at parameter `t`. */
export function sphereAt(s: SphereSpline, t: number): ControlSphere {
  const H = deCasteljau(s.S.map(homOf), t)
  return {
    centre: { x: H[1] / H[0], y: H[2] / H[0], z: H[3] / H[0] },
    radius: H[4] / H[0],
    weight: H[0],
  }
}

/**
 * Centre and radius with their first two derivatives, exactly — Bernstein derivatives of the
 * homogeneous coefficients, then the quotient rule. The radius is carried SIGNED, so ρ̇ passes
 * through the imaginary boundary continuously instead of reflecting off it.
 */
export function frameAt(s: SphereSpline, t: number): {
  c: Vec3; cd: Vec3; cdd: Vec3; rho: number; rhod: number
} {
  const C = s.S.map(homOf)
  const D = deriv(C)
  const DD = deriv(D)
  const H = deCasteljau(C, t), Hd = deCasteljau(D, t), Hdd = deCasteljau(DD, t)

  const w = H[0], wd = Hd[0], wdd = Hdd[0]
  const vec = (h: Hom): Vec3 => ({ x: h[1], y: h[2], z: h[3] })
  const q = vec(H), qd = vec(Hd), qdd = vec(Hdd)

  const c = vscale(q, 1 / w)
  const cd = vsub(vscale(qd, 1 / w), vscale(q, wd / (w * w)))
  //  c̈ = q̈/w − 2q̇ẇ/w² − q ẅ/w² + 2q ẇ²/w³
  const cdd = vadd(
    vsub(vscale(qdd, 1 / w), vscale(qd, (2 * wd) / (w * w))),
    vadd(vscale(q, (2 * wd * wd) / (w * w * w)), vscale(q, -wdd / (w * w))),
  )

  const rho = H[4] / w
  const rhod = Hd[4] / w - (H[4] * wd) / (w * w)
  return { c, cd, cdd, rho, rhod }
}

/**
 * `|ċ|² − ρ̇²` — the squared speed of the spine in MINKOWSKI space, and the envelope's existence
 * test. Positive: the tube is there. Negative: the radius is outrunning the centre and there is no
 * envelope at all. Zero: the characteristic circle has collapsed to a point.
 */
export function envelopeTest(s: SphereSpline, t: number): number {
  const { cd, rhod } = frameAt(s, t)
  return vnorm(cd) ** 2 - rhod * rhod
}

/**
 * The characteristic circle at `t` — where this sphere touches the envelope. `null` where the
 * envelope does not exist, which a caller should DRAW AS NOTHING rather than clamp: the gap is the
 * whole point.
 */
export function characteristicCircle(
  s: SphereSpline, t: number,
): { centre: Vec3; radius: number; axis: Vec3 } | null {
  const { c, cd, rho, rhod } = frameAt(s, t)
  const speed2 = vnorm(cd) ** 2
  if (!(speed2 > 1e-14)) return null
  const k = 1 - (rhod * rhod) / speed2
  if (!(k > 0)) return null
  // |ρ|, NOT ρ: here a negative radius is a REVERSED ORIENTATION and the sphere is perfectly real.
  // An earlier version rejected ρ < 0 and so refused to draw half the Laguerre picture — the
  // imaginary-sphere phenomenon it was reaching for belongs to ℝ^{4,1}, not to this model.
  // ρ = 0 is a point sphere: the circle degenerates to a point ON the envelope, which is correct.
  return {
    centre: vsub(c, vscale(cd, (rho * rhod) / speed2)),
    radius: Math.abs(rho) * Math.sqrt(k),
    axis: vscale(cd, 1 / Math.sqrt(speed2)),
  }
}

/**
 * `ρ·κ` — the SECOND failure mode. Even where the envelope exists, the tube self-intersects once
 * the radius outruns the spine's radius of curvature. Below 1 the surface is embedded; above it,
 * it pinches.
 */
export function pinchTest(s: SphereSpline, t: number): number {
  const { cd, cdd, rho } = frameAt(s, t)
  const sp = vnorm(cd)
  if (!(sp > 1e-12)) return Infinity
  return (Math.abs(rho) * vnorm(vcross(cd, cdd))) / (sp * sp * sp)
}

/** Extreme of a test over the interval — what a readout shows. */
export function worstOver(
  s: SphereSpline,
  f: (s: SphereSpline, t: number) => number,
  samples = 96,
  pick: 'min' | 'max' = 'min',
): number {
  let best = pick === 'min' ? Infinity : -Infinity
  for (let i = 0; i <= samples; i++) {
    const v = f(s, i / samples)
    if (!Number.isFinite(v)) continue
    best = pick === 'min' ? Math.min(best, v) : Math.max(best, v)
  }
  return best
}
