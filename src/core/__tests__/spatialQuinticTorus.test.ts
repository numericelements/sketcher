// ============================================================================
// WHICH TWO CIRCLES IS THE TORUS? — the derivation Act III-b owed, done and pinned.
//
// The spatial PH quintic Hermite family is two-dimensional, and the count is easy: A quadratic means
// A₀, A₁, A₂ ∈ ℍ = 12 real unknowns; d₀, d₁ and Δp are 9 conditions; the global gauge A ↦ A e^{iθ}
// is 1. So 12 − 9 − 1 = 2. What the count does NOT say is that the family is a TORUS. That needs the
// two circles named, and here they are — three of them, with one gauged away.
//
// THE FIRST TWO ARE THE HOPF FIBERS OVER THE END TANGENTS, which is immediate:
//
//     A₀ i Ā₀ = d₀   ⟹   A₀ = A₀^* e^{iφ₀}          a circle
//     A₂ i Ā₂ = d₁   ⟹   A₂ = A₂^* e^{iφ₂}          a circle
//
// THE THIRD IS THE INTERESTING ONE. The displacement condition looks like a messy quadratic in A₁.
// Integrate A i Ā over the quintic's Bernstein basis — ∫₀¹ Bᵢ²Bⱼ² = C(2,i)C(2,j)/(5·C(4,i+j)) — and
//
//     5Δp = A₀iĀ₀ + A₂iĀ₂ + ⅔·A₁iĀ₁ + ½(A₁iS̄ + SiĀ₁) + ⅙(A₀iĀ₂ + A₂iĀ₀),      S = A₀ + A₂
//
// Now COMPLETE THE SQUARE in A₁. With Y = A₁ + ¾S the cross term is absorbed and what is left is one
// more Hopf equation:
//
//     Y i Ȳ = T,     T = 3/2·V + 9/16·S i S̄,     V = 5Δp − d₀ − d₁ − ⅙(A₀iĀ₂ + A₂iĀ₀)
//
// So A₁'s freedom is the Hopf fiber over T — a THIRD circle, Y = Y^* e^{iψ}. The whole solution family
// is therefore parametrised in CLOSED FORM by three angles, with no solver anywhere:
//
//     (φ₀, φ₂, ψ)  ⟼  (A₀, A₁, A₂)  ⟼  the curve
//
// AND THE GAUGE IS THE DIAGONAL. Under A ↦ A e^{iθ}: d₀, d₁ are fixed, e^{iθ} commutes with i so the
// polarisation A₀iĀ₂ + A₂iĀ₀ is fixed, hence V and S i S̄ and T are ALL fixed — so Y ↦ Y e^{iθ} and
// A₁ ↦ A₁ e^{iθ}. The gauge shifts all three angles equally and changes nothing. Hence
//
//     the family  =  (S¹)³ / S¹(diagonal)  ≅  T²
//
// and the two circles of the torus are any two of the three Hopf phases.
//
// NOT CLAIMED AS NEW. That the spatial PH quintic Hermite family is a two-parameter family indexed by
// angles is classical (Farouki and co-authors), and a manipulation of this kind is very likely how it
// was first obtained. What this file does is re-derive it in the form Act III needs — three Hopf
// fibers, one diagonal gauge — and check it rather than recall it.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type Quat,
  type Vec3,
  gaugeRotate,
  polarSandwich,
  qadd,
  qnormSq,
  qscale,
  qsub,
  quatFromSandwich,
  sandwich,
  vadd,
  vnorm,
  vscale,
  vsub,
} from '../quaternion'

/** A(t) in the quadratic Bernstein basis. */
const evalA = (A: readonly [Quat, Quat, Quat], t: number): Quat => {
  const s = 1 - t
  return qadd(qadd(qscale(A[0], s * s), qscale(A[1], 2 * s * t)), qscale(A[2], t * t))
}

/** c′(t) = A(t) i Ā(t) — the Hopf map, hence automatically PH with ‖c′‖ = |A|². */
const hodograph = (A: readonly [Quat, Quat, Quat], t: number): Vec3 => sandwich(evalA(A, t))

/**
 * Δp by the exact Bernstein integral, which is the formula the derivation uses:
 * 5Δp = Σᵢⱼ [C(2,i)C(2,j)/C(4,i+j)] Aᵢ i Āⱼ.
 */
function displacementClosed(A: readonly [Quat, Quat, Quat]): Vec3 {
  const five = vadd(
    vadd(
      vadd(sandwich(A[0]), sandwich(A[2])),
      vscale(sandwich(A[1]), 2 / 3),
    ),
    vadd(
      vscale(vadd(polarSandwich(A[0], A[1]), polarSandwich(A[1], A[2])), 1 / 2),
      vscale(polarSandwich(A[0], A[2]), 1 / 6),
    ),
  )
  return vscale(five, 1 / 5)
}

/** Δp by quadrature — an independent check that the Bernstein coefficients above are right. */
function displacementNumeric(A: readonly [Quat, Quat, Quat], n = 4000): Vec3 {
  let acc: Vec3 = { x: 0, y: 0, z: 0 }
  for (let k = 0; k < n; k++) acc = vadd(acc, vscale(hodograph(A, (k + 0.5) / n), 1 / n))
  return acc
}

/**
 * THE CONSTRUCTION. Given the Hermite data and three angles, build the spinor — closed form, no
 * solver. Returns null only where a Hopf fiber degenerates (a zero end tangent, or T = 0).
 */
function member(
  d0: Vec3, d1: Vec3, dp: Vec3, phi0: number, phi2: number, psi: number,
): [Quat, Quat, Quat] | null {
  const a0 = quatFromSandwich(d0)
  const a2 = quatFromSandwich(d1)
  if (!a0 || !a2) return null
  const A0 = gaugeRotate(a0, phi0)
  const A2 = gaugeRotate(a2, phi2)
  const S = qadd(A0, A2)
  // V = 5Δp − d₀ − d₁ − ⅙(A₀iĀ₂ + A₂iĀ₀)
  const V = vsub(
    vsub(vsub(vscale(dp, 5), sandwich(A0)), sandwich(A2)),
    vscale(polarSandwich(A0, A2), 1 / 6),
  )
  // T = 3/2·V + 9/16·S i S̄
  const T = vadd(vscale(V, 3 / 2), vscale(sandwich(S), 9 / 16))
  const y = quatFromSandwich(T)
  if (!y) return null
  const Y = gaugeRotate(y, psi)
  const A1 = qsub(Y, qscale(S, 3 / 4))
  return [A0, A1, A2]
}

// Hermite data with nothing special about it.
const D0: Vec3 = { x: 1.1, y: 0.4, z: -0.3 }
const D1: Vec3 = { x: 0.6, y: -0.9, z: 0.5 }
const DP: Vec3 = { x: 1.0, y: 0.25, z: 0.15 }

const ANGLES = [0, 0.7, 1.9, 2.6, 4.1, 5.4]

describe('the spatial PH quintic Hermite family is a 2-torus of Hopf phases', () => {
  it('the closed form HITS the data, for every triple of angles', () => {
    // If the completed square is right, every (φ₀, φ₂, ψ) gives an interpolant with no solving at all.
    // If the algebra were wrong this fails immediately and loudly.
    let worstEnds = 0
    let worstDisp = 0
    let count = 0
    for (const phi0 of ANGLES) {
      for (const phi2 of ANGLES) {
        for (const psi of ANGLES) {
          const A = member(D0, D1, DP, phi0, phi2, psi)
          if (!A) continue
          count++
          worstEnds = Math.max(
            worstEnds,
            vnorm(vsub(hodograph(A, 0), D0)) / vnorm(D0),
            vnorm(vsub(hodograph(A, 1), D1)) / vnorm(D1),
          )
          worstDisp = Math.max(worstDisp, vnorm(vsub(displacementClosed(A), DP)) / vnorm(DP))
        }
      }
    }
    console.log(
      `    ${count} members from ${ANGLES.length}³ angle triples:` +
        `  end tangents off by ≤ ${worstEnds.toExponential(1)},` +
        `  displacement off by ≤ ${worstDisp.toExponential(1)}`,
    )
    expect(count, 'every angle triple gives a member').toBe(ANGLES.length ** 3)
    expect(worstEnds, 'the end tangents are hit exactly').toBeLessThan(1e-13)
    expect(worstDisp, 'the displacement is hit exactly — the completed square is right').toBeLessThan(1e-13)
  })

  it('and the Bernstein integral is the real integral, not a mis-remembered formula', () => {
    // The closed displacement formula is the load-bearing algebra, so it is checked against quadrature
    // rather than trusted. Midpoint at 4000 points, so ~1e-8 is the expected agreement.
    const A = member(D0, D1, DP, 1.9, 0.7, 2.6)!
    const rel = vnorm(vsub(displacementClosed(A), displacementNumeric(A))) / vnorm(DP)
    console.log(`    closed form vs quadrature: ${rel.toExponential(1)} relative`)
    expect(rel, 'the Bernstein integral coefficients are right').toBeLessThan(1e-7)
  })

  it('the curve is PH by construction: ‖c′‖ = |A|², exactly', () => {
    const A = member(D0, D1, DP, 0.7, 4.1, 1.9)!
    let worst = 0
    for (const t of [0, 0.2, 0.4, 0.5, 0.75, 1]) {
      const speed = vnorm(hodograph(A, t))
      const sigma = qnormSq(evalA(A, t))
      worst = Math.max(worst, Math.abs(speed - sigma) / Math.max(sigma, 1e-300))
    }
    console.log(`    |c′| vs |A|²: ${worst.toExponential(1)} relative`)
    expect(worst).toBeLessThan(1e-14)
  })

  it('THE GAUGE IS THE DIAGONAL: shifting all three angles equally changes nothing', () => {
    // This is what makes the family T² rather than T³. e^{iθ} commutes with i, so d₀, d₁ and the
    // polarisation A₀iĀ₂ + A₂iĀ₀ are all fixed — hence T is fixed, and A₁ picks up the same phase.
    const base: [number, number, number] = [0.7, 2.6, 4.1]
    let worst = 0
    for (const theta of [0.3, 1.1, 2.2, 3.9]) {
      const A = member(D0, D1, DP, base[0], base[1], base[2])!
      const B = member(D0, D1, DP, base[0] + theta, base[1] + theta, base[2] + theta)!
      for (const t of [0.15, 0.5, 0.85]) {
        const a = hodograph(A, t), b = hodograph(B, t)
        worst = Math.max(worst, vnorm(vsub(a, b)) / Math.max(vnorm(a), 1e-300))
      }
      // And the spinors differ by exactly that phase.
      const rotated = gaugeRotate(A[1], theta)
      const gap = Math.sqrt(qnormSq(qsub(rotated, B[1]))) / Math.sqrt(qnormSq(B[1]))
      expect(gap, `θ = ${theta}: A₁ picks up exactly e^{iθ}`).toBeLessThan(1e-13)
    }
    console.log(`    diagonal shift leaves the hodograph unchanged to ${worst.toExponential(1)}`)
    expect(worst, 'the diagonal is gauge — so three circles give a TWO-torus').toBeLessThan(1e-13)
  })

  it('the two remaining circles are INDEPENDENT, and each closes at 2π', () => {
    // Two things to establish, or "torus" is unearned. First: moving φ₂ and moving ψ are genuinely
    // different motions of the curve — otherwise the family is a circle, not a surface. Second: each
    // parameter returns after 2π, which is what makes the surface closed.
    const gauge0 = 0
    const at = (phi2: number, psi: number): number[] => {
      const A = member(D0, D1, DP, gauge0, phi2, psi)!
      return [0.2, 0.45, 0.7, 0.9].flatMap((t) => {
        const v = hodograph(A, t)
        return [v.x, v.y, v.z]
      })
    }
    const base: [number, number] = [1.9, 0.7]
    const h = 1e-5
    const dPhi = at(base[0] + h, base[1]).map((v, i) => (v - at(base[0] - h, base[1])[i]) / (2 * h))
    const dPsi = at(base[0], base[1] + h).map((v, i) => (v - at(base[0], base[1] - h)[i]) / (2 * h))
    const dot = dPhi.reduce((a, v, i) => a + v * dPsi[i], 0)
    const nPhi = Math.hypot(...dPhi), nPsi = Math.hypot(...dPsi)
    // sin of the angle between the two tangent directions: 1 is orthogonal, 0 is parallel (a curve).
    const independence = Math.sqrt(Math.max(0, 1 - (dot / (nPhi * nPsi)) ** 2))
    console.log(
      `    ∂/∂φ₂ and ∂/∂ψ:  |·| = ${nPhi.toFixed(3)}, ${nPsi.toFixed(3)};` +
        `  sin(angle) = ${independence.toFixed(3)}  <- a SURFACE, not a curve`,
    )
    expect(independence, 'the two directions span a 2-plane').toBeGreaterThan(1e-3)

    for (const [label, shift] of [['φ₂', [2 * Math.PI, 0]], ['ψ', [0, 2 * Math.PI]]] as const) {
      const here = at(base[0], base[1])
      const round = at(base[0] + shift[0], base[1] + shift[1])
      const gap = Math.hypot(...round.map((v, i) => v - here[i])) / Math.hypot(...here)
      console.log(`    ${label} + 2π returns to the same curve, to ${gap.toExponential(1)}`)
      expect(gap, `${label} closes at 2π`).toBeLessThan(1e-12)
    }
  })

  it('and T can vanish — where it does, the closed form has nothing to invert', () => {
    // Honesty about the construction's one failure mode: T = 0 kills the third Hopf fiber. It is not
    // hypothetical, so it is measured rather than assumed away — sweep the displacement towards where
    // the family degenerates and report the smallest |T| reached.
    const tOf = (dp: Vec3, phi0: number, phi2: number): number => {
      const a0 = quatFromSandwich(D0)!, a2 = quatFromSandwich(D1)!
      const A0 = gaugeRotate(a0, phi0), A2 = gaugeRotate(a2, phi2)
      const S = qadd(A0, A2)
      const V = vsub(
        vsub(vsub(vscale(dp, 5), sandwich(A0)), sandwich(A2)),
        vscale(polarSandwich(A0, A2), 1 / 6),
      )
      return vnorm(vadd(vscale(V, 3 / 2), vscale(sandwich(S), 9 / 16)))
    }
    let smallest = Infinity
    let where = ''
    for (let s = -2; s <= 2; s += 0.25) {
      for (const phi2 of ANGLES) {
        const dp = vadd(DP, vscale({ x: 0.3, y: -0.2, z: 0.45 }, s))
        const t = tOf(dp, 0, phi2)
        if (t < smallest) { smallest = t; where = `Δp offset ${s.toFixed(2)}, φ₂ = ${phi2}` }
      }
    }
    console.log(`    smallest |T| over the sweep: ${smallest.toExponential(2)} at ${where}`)
    // At the data this file uses, T is comfortably away from zero — that is the claim, not that T is
    // never zero.
    expect(tOf(DP, 0, 0), 'T is nonzero at the data used here').toBeGreaterThan(1e-3)
  })
})
