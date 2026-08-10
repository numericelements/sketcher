// ============================================================================
// THE HODOGRAPH ON THE LIGHT CONE — the facts the theory deck opens with, pinned.
//
// PH says ‖c′‖ = σ with σ polynomial. Square it and move everything to one side and the condition is
// ‖c′‖² − σ² = 0, which is a quadratic form of signature (n,1) evaluated on ONE vector:
//
//     γ(t) = (c′(t), σ(t))          ⟨(v,s),(v,s)⟩ = ‖v‖² − s²
//
// So PH ⟺ γ lies on the LIGHT CONE of ℝⁿ˙¹. Nothing has been done except refusing to treat σ as a
// derived quantity. Everything here is a check of that reading, because a slide may not carry a claim
// that has only been checked on one hand-picked example.
//
// THE ONE IDENTITY WORTH PROVING, and it is two lines from Lagrange:
//
//     ⟨γ′,γ′⟩ = ‖c″‖² − σ′²                        (definition of γ)
//             = ‖c″‖² − (c′·c″)²/‖c′‖²             (σ = ‖c′‖, so σ′ = (c′·c″)/‖c′‖)
//             = (‖c′‖²‖c″‖² − (c′·c″)²)/‖c′‖²      (common denominator)
//             = ‖c′ × c″‖² / ‖c′‖²                 (Lagrange's identity)
//             = κ² σ⁴                              (κ = ‖c′×c″‖/‖c′‖³, σ = ‖c′‖)
//
// So γ's POSITION is null while its TANGENT is not, and the failure to be null is exactly the
// curvature. Two consequences the deck uses:
//
//   · γ is SPACELIKE wherever the curve is curved, and genuinely LIGHTLIKE exactly at inflections.
//     A straight line is the one PH curve whose hodograph really is a null curve — a light ray.
//   · "null curve" in semi-Riemannian geometry means the TANGENT is null (zero arc length), and null
//     curves in ℂ³ are the Weierstrass data of minimal surfaces. We mean position, not tangent. The
//     deck's title says "lies on the light cone" for exactly this reason.
//
// AND THE SHAPE OF γ, for the deck's one static picture: for a linear spinor it is a PARABOLA with a
// lightlike axis. A CORRECTION is recorded in that test, because the slide sketch had the weaker reason
// first: the specimen w = t + i satisfies s − x = 2, putting γ in a plane with null normal, but that
// constant is special (in general s − x = 2(Im w)², constant only when Im w is). The general reason is
// one line: γ is the squaring map applied to w, so the image of any single spinor coefficient is null —
// in particular γ's LEADING coefficient, at any degree. For a linear spinor γ is quadratic, so ½γ″ IS
// that constant null vector, and a curve with constant null second derivative is such a parabola.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qconj, qmul, qvec, vcross, vdot, vnorm } from '../quaternion'

// ---------------------------------------------------------------------------
// Polynomials in the power basis, exactly. No solver and no core dependency: these tests are the
// deck's arithmetic, and they should fail for a reason in the mathematics, not in a solver.
// ---------------------------------------------------------------------------

type Complex = { re: number; im: number }

const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
})

/** Multiply two polynomials given as coefficient arrays, with a supplied product on the scalars. */
function convolve<T>(a: readonly T[], b: readonly T[], mul: (x: T, y: T) => T, add: (x: T, y: T) => T, zero: T): T[] {
  const out: T[] = new Array(a.length + b.length - 1).fill(zero)
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] = add(out[i + j], mul(a[i], b[j]))
  }
  return out
}

const evalPoly = <T,>(c: readonly T[], t: number, scale: (x: T, k: number) => T, add: (x: T, y: T) => T, zero: T): T => {
  let acc = zero
  for (let k = c.length - 1; k >= 0; k--) acc = add(scale(acc, t), c[k])
  return acc
}

const derivative = <T,>(c: readonly T[], scale: (x: T, k: number) => T): T[] =>
  c.slice(1).map((v, i) => scale(v, i + 1))

const rscale = (x: number, k: number): number => x * k
const radd = (x: number, y: number): number => x + y

/** The 2D setup: a complex spinor w, the hodograph c′ = w², the speed σ = |w|² — all exact. */
function planarPH(w: readonly Complex[]) {
  const czero: Complex = { re: 0, im: 0 }
  const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
  const cscale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k })
  const hodo = convolve(w, w, cmul, cadd, czero)                                  // c′ = w²
  const conj = w.map((v) => ({ re: v.re, im: -v.im }))
  const sigma = convolve(w, conj, cmul, cadd, czero).map((v) => v.re)             // σ = w·w̄ = |w|², real
  const hodoD = derivative(hodo, cscale)
  const sigmaD = derivative(sigma, rscale)
  return {
    at: (t: number) => {
      const d1 = evalPoly(hodo, t, cscale, cadd, czero)
      const d2 = evalPoly(hodoD, t, cscale, cadd, czero)
      return {
        cd: { x: d1.re, y: d1.im, z: 0 },
        cdd: { x: d2.re, y: d2.im, z: 0 },
        sigma: evalPoly(sigma, t, rscale, radd, 0),
        sigmaD: evalPoly(sigmaD, t, rscale, radd, 0),
      }
    },
    /** γ itself, coefficient by coefficient in the power basis: (Re w², Im w², |w|²). */
    gamma: hodo.map((h, k) => ({ x: h.re, y: h.im, z: sigma[k] ?? 0 })),
  }
}

/** The 3D setup: a quaternion spinor A, the hodograph c′ = A i Ā, the speed σ = |A|². */
function spatialPH(A: readonly Quat[]) {
  const qzero: Quat = { u: 0, v: 0, p: 0, q: 0 }
  const qadd2 = (a: Quat, b: Quat): Quat => ({ u: a.u + b.u, v: a.v + b.v, p: a.p + b.p, q: a.q + b.q })
  const qscale2 = (a: Quat, k: number): Quat => ({ u: a.u * k, v: a.v * k, p: a.p * k, q: a.q * k })
  const Ai = A.map((a) => qmul(a, QUAT_I))
  const Abar = A.map(qconj)
  const hodoQ = convolve(Ai, Abar, qmul, qadd2, qzero)                            // c′ = A i Ā
  const sigma = convolve(A, Abar, qmul, qadd2, qzero).map((v) => v.u)             // σ = A Ā = |A|², real
  const hodoQD = derivative(hodoQ, qscale2)
  const sigmaD = derivative(sigma, rscale)
  return {
    at: (t: number) => ({
      cd: qvec(evalPoly(hodoQ, t, qscale2, qadd2, qzero)),
      cdd: qvec(evalPoly(hodoQD, t, qscale2, qadd2, qzero)),
      sigma: evalPoly(sigma, t, rscale, radd, 0),
      sigmaD: evalPoly(sigmaD, t, rscale, radd, 0),
    }),
  }
}

/** The Minkowski form of signature (n,1): ‖v‖² − s². */
const mink = (v: { x: number; y: number; z: number }, s: number): number => vdot(v, v) - s * s

const SAMPLES = [-1.3, -0.7, -0.2, 0.15, 0.4, 0.65, 0.9, 1.4, 2.1]

describe('the hodograph lies on the light cone', () => {
  // Spinors of several degrees, so nothing depends on a hand-picked example. The last planar one is
  // the deck's parabola case (w = t + i, the Tschirnhausen cubic).
  const PLANAR: { label: string; w: Complex[] }[] = [
    { label: 'w = t + i (cubic)', w: [{ re: 0, im: 1 }, { re: 1, im: 0 }] },
    { label: 'w quadratic (quintic)', w: [{ re: 0.7, im: -0.4 }, { re: -1.1, im: 0.9 }, { re: 0.3, im: 1.2 }] },
    { label: 'w cubic (degree 7)', w: [{ re: 1, im: 0.2 }, { re: 0.4, im: -1.3 }, { re: -0.8, im: 0.5 }, { re: 0.6, im: 0.9 }] },
  ]
  const SPATIAL: { label: string; A: Quat[] }[] = [
    { label: 'A linear (spatial cubic)', A: [{ u: 1, v: 0.3, p: -0.5, q: 0.2 }, { u: -0.4, v: 0.9, p: 0.1, q: -0.7 }] },
    {
      label: 'A quadratic (spatial quintic)',
      A: [
        { u: 0.8, v: -0.2, p: 0.6, q: 0.1 },
        { u: -0.5, v: 1.1, p: -0.3, q: 0.7 },
        { u: 0.2, v: 0.4, p: 0.9, q: -0.6 },
      ],
    },
  ]

  it('γ = (c′, σ) is ON the cone — that IS the PH condition', () => {
    for (const { label, w } of PLANAR) {
      const ph = planarPH(w)
      const worst = Math.max(...SAMPLES.map((t) => {
        const { cd, sigma } = ph.at(t)
        return Math.abs(mink(cd, sigma)) / Math.max(sigma * sigma, 1e-300)
      }))
      console.log(`    2D ${label.padEnd(24)} ⟨γ,γ⟩/σ² ≤ ${worst.toExponential(1)}`)
      expect(worst, `2D ${label}`).toBeLessThan(1e-14)
    }
    for (const { label, A } of SPATIAL) {
      const ph = spatialPH(A)
      const worst = Math.max(...SAMPLES.map((t) => {
        const { cd, sigma } = ph.at(t)
        return Math.abs(mink(cd, sigma)) / Math.max(sigma * sigma, 1e-300)
      }))
      console.log(`    3D ${label.padEnd(24)} ⟨γ,γ⟩/σ² ≤ ${worst.toExponential(1)}`)
      expect(worst, `3D ${label}`).toBeLessThan(1e-14)
    }
  })

  it('but its TANGENT is not null, and the failure is exactly the curvature: ⟨γ′,γ′⟩ = κ²σ⁴', () => {
    // The identity the deck puts on a slide. Derived in this file's header from Lagrange; measured here
    // in both signatures and at several degrees, since a one-example check is not a fact.
    const check = (label: string, at: (t: number) => ReturnType<ReturnType<typeof planarPH>['at']>) => {
      let worst = 0
      for (const t of SAMPLES) {
        const { cd, cdd, sigma, sigmaD } = at(t)
        const speed = vnorm(cd)
        if (!(speed > 1e-9)) continue
        const tangentForm = vdot(cdd, cdd) - sigmaD * sigmaD          // ⟨γ′,γ′⟩ directly
        const kappa = vnorm(vcross(cd, cdd)) / (speed * speed * speed)
        const predicted = kappa * kappa * Math.pow(sigma, 4)          // κ²σ⁴
        worst = Math.max(worst, Math.abs(tangentForm - predicted) / Math.max(Math.abs(predicted), 1e-12))
      }
      console.log(`    ${label.padEnd(30)} |⟨γ′,γ′⟩ − κ²σ⁴| / κ²σ⁴ ≤ ${worst.toExponential(1)}`)
      expect(worst, label).toBeLessThan(1e-9)
    }
    for (const { label, w } of PLANAR) check(`2D ${label}`, planarPH(w).at)
    for (const { label, A } of SPATIAL) check(`3D ${label}`, spatialPH(A).at)
  })

  it('so γ is lightlike EXACTLY at inflections — and a straight line is a light ray', () => {
    // κ²σ⁴ vanishes iff κ does, so the one PH curve whose hodograph is a genuine null curve is the
    // straight line. Both directions checked: a curved specimen is strictly spacelike everywhere, and
    // a line is exactly null everywhere.
    const curved = planarPH(PLANAR[1].w)
    const least = Math.min(...SAMPLES.map((t) => {
      const { cdd, sigmaD } = curved.at(t)
      return vdot(cdd, cdd) - sigmaD * sigmaD
    }))
    console.log(`    a curved PH quintic: min ⟨γ′,γ′⟩ = ${least.toExponential(2)}  (strictly spacelike)`)
    expect(least, 'a curved PH curve has a strictly spacelike hodograph curve').toBeGreaterThan(1e-6)

    // w constant ⟹ c′ constant ⟹ a straight line.
    const line = planarPH([{ re: 0.6, im: -0.8 }])
    const worst = Math.max(...SAMPLES.map((t) => {
      const { cdd, sigmaD, sigma } = line.at(t)
      return Math.abs(vdot(cdd, cdd) - sigmaD * sigmaD) / Math.max(sigma * sigma, 1e-300)
    }))
    console.log(`    a straight line:     |⟨γ′,γ′⟩|/σ² ≤ ${worst.toExponential(1)}  (a light ray)`)
    expect(worst, 'a straight line is the lightlike case').toBeLessThan(1e-15)
  })

  it("γ's LEADING COEFFICIENT is null — so a linear spinor gives a parabola with a lightlike axis", () => {
    // CORRECTION, recorded because it was on a slide sketch first. The specimen w = t + i satisfies
    // s − x = 2, a constant, which put γ in a plane with null normal — a parabola. That constant is NOT
    // general: in fact s − x = 2(Im w)², which is constant only when Im w is. The general statement is
    // better and one line: γ = (Re w², Im w², |w|²) is the squaring map applied to w, so EVERY
    // coefficient-level image of a single spinor coefficient is null. In particular the LEADING
    // coefficient of γ is null, always, at any degree.
    //
    // For a LINEAR spinor that settles the shape with no plane geometry at all: γ is quadratic, so
    // ½γ″ is its constant leading coefficient, and a curve with a constant NULL second derivative is a
    // parabola whose axis is lightlike.
    for (const { label, w } of PLANAR) {
      const g = planarPH(w).gamma
      const lead = g[g.length - 1]
      const scale = Math.max(...g.map((c) => Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.z)), 1e-300)
      const rel = Math.abs(mink({ x: lead.x, y: lead.y, z: 0 }, lead.z)) / (scale * scale)
      console.log(`    2D ${label.padEnd(24)} ⟨lead γ, lead γ⟩ / scale² = ${rel.toExponential(1)}`)
      expect(rel, `${label}: the leading coefficient of γ is null`).toBeLessThan(1e-15)
    }

    // And the plane a linear spinor's γ spans has a NULL normal, which is the same fact read as
    // geometry. For the form diag(1,1,−1) the Minkowski normal of the plane spanned by γ₁, γ₂ is
    // J(γ₁ × γ₂), and ⟨J m, J m⟩ = m_x² + m_y² − m_s², so the test is on the Euclidean cross product.
    for (const w of [
      PLANAR[0].w,
      [{ re: -0.3, im: 1.4 }, { re: 0.9, im: 0.5 }],
      [{ re: 2.1, im: 0 }, { re: -0.4, im: 1.7 }],
    ]) {
      const g = planarPH(w).gamma
      const v = (c: { x: number; y: number; z: number }) => ({ x: c.x, y: c.y, z: c.z })
      const m = vcross(v(g[1]), v(g[2]))
      const rel = Math.abs(mink({ x: m.x, y: m.y, z: 0 }, m.z)) / Math.max(vdot(m, m), 1e-300)
      console.log(`    the plane's Minkowski normal is null to ${rel.toExponential(1)}  -> a PARABOLA`)
      expect(rel, 'the plane of a linear spinor cuts the cone in a parabola').toBeLessThan(1e-14)
    }
  })
})
