// ============================================================================
// THE FIBER WALK, AGAINST A CONTROL IT CAN FAIL — and the earlier failure was a misapplied control.
//
// THE STANDING WORRY (RATIONAL_PH_STATE §8): the walk used to test whether the Hermite fiber closes had
// been run on the polynomial PH QUINTIC as a control, where |𝒜| grew linearly 5 → 34 and nothing ever
// came back. That was read as "the walk is buggy, not the geometry", and every closure number it
// produced was withheld.
//
// THE CONTROL WAS THE WRONG ONE. `fiberLoop` holds SIX numbers — c′(0) and c(1). On the polynomial
// quintic the spinor has twelve coefficients, so those six leave
//
//     12 − 6 − 1(gauge)  =  5
//
// a FIVE-dimensional fiber. Walking one arbitrarily-chosen tangent direction through a five-dimensional
// set has no reason to return and nothing bounding it. There was no loop there to find. (The quintic is
// a provable circle only once NINE numbers are held — and that is a TORUS, where a generic tangent
// winds forever without closing, so the quintic could not have been this walk's control either way.)
//
// THE RIGHT CONTROL IS THE POLYNOMIAL PH CUBIC. Its spinor has eight coefficients and the six numbers
// it holds are exactly c′(0) and c(1) — precisely what the walk holds:
//
//     8 − 6 − 1  =  1        a one-dimensional fiber
//
// and it is a provable circle, by the completion of the square `spatialQuinticTorus.test.ts` does at
// degree 3. In this module's MONOMIAL basis, 𝒜 = A₀ + A₁t, that reads
//
//     Δc = A₀iĀ₀ + ½·polar(A₀,A₁) + ⅓·A₁iĀ₁        ⟹ with Y = A₁ + 3/2·A₀,
//     Y i Ȳ  =  3Δc − ¾·c′(0)  =  T,     T held because the data is held
//
// so A₀ runs a Hopf circle over c′(0), Y runs one over T, and the gauge is the diagonal: (S¹)²/S¹ ≅ S¹.
// (The coefficient is 3/2, not the ½ of the Bernstein derivation — same algebra, different basis.)
//
// MEASURED, after fixing the stopping rule (see below):
//
//     polynomial CUBIC   fiber 1   CLOSES     gauge gap 5.3e-10   indicatrix gap 3.5e-10
//     rational quintic   fiber 1   CLOSES     gauge gap 8.5e-11   indicatrix gap 3.7e-11
//     polynomial QUINTIC fiber 5   REFUSES    gap 7.5 after 300 steps — correctly reports no loop
//
// with both Hopf identities held to 1e-13 along the whole cubic walk.
//
// AND THE BUG WAS THE RULER, NOT THE WALK. The old rule stopped when three curve points on t ∈ [0,1]
// came within 4e-3. Measured here: it fires at step 155 of 158 — three strides early — with the full
// indicatrix over t ∈ [−2,2] still 1.6e-2 away on a unit sphere. The drawn piece had returned; the
// curve had not, and the closest approach was always the LAST step taken, i.e. the walk was still
// coming back when it was stopped. The new rule measures the gap modulo the Hopf gauge (exact,
// complete, no window to hide outside of), waits for the walk to leave, detects the turn NEAR the
// start, and refines the final step onto it by golden section — a bracketing search because the
// distance is V-shaped at a true return, not smooth.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  fiberClosure, gaugeDistance, indicatrixDistance,
  curveAt, dataOf, derivativeAt, familyBasis, seedQuintic, toMember,
  type MultiPoleParams,
} from '../rationalPHMultiPoleSpatial'
import { type Quat, qadd, qscale, sandwich, vnorm, vsub } from '../quaternion'

const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })

/** n = 1, m = 0: a polynomial PH cubic. Eight spinor coefficients, six held, one-dimensional fiber. */
const CUBIC: MultiPoleParams = {
  A: [Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1)], roots: [], lambdas: [],
}
/** n = 2, m = 0: a polynomial PH quintic. Twelve coefficients, six held — a FIVE-dimensional fiber. */
const QUINTIC: MultiPoleParams = {
  A: [Q(0.8, 0.2, -0.3, 0.5), Q(-0.4, 0.6, 0.25, 0.1), Q(0.3, -0.5, 0.15, 0.4)],
  roots: [], lambdas: [],
}

const curveGap = (a: MultiPoleParams, b: MultiPoleParams): number => {
  const ma = toMember(a), mb = toMember(b)
  let worst = 0
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    worst = Math.max(worst, vnorm(vsub(curveAt(ma, t), curveAt(mb, t))))
  }
  return worst
}

describe('does the fiber walk close', () => {
  it('THE CONTROL: on the polynomial PH CUBIC the fiber is a provable circle, and the walk closes', () => {
    expect(familyBasis(CUBIC).length - 6 - 1).toBe(1)

    const m0 = toMember(CUBIC)
    const d0 = derivativeAt(m0, 0)
    // T = 3Δc − ¾c′(0), and c(0) = 0 because p(0) = 0 is how this module pins the translation.
    const T = vsub(vscale3(curveAt(m0, 1), 3), vscale3(d0, 0.75))

    const { loop, gap, closed } = fiberClosure(CUBIC, { stride: 0.05, maxSteps: 600 })
    expect(closed, 'the walk found a return').toBe(true)
    expect(loop.length).toBeGreaterThan(40)

    // THE TWO HOPF IDENTITIES, along the whole walk. These are the closed form: A₀ on the fiber over
    // c′(0), Y = A₁ + 3/2·A₀ on the fiber over T. If the walk left the circle, they would move.
    let worstD0 = 0, worstT = 0
    for (const q of loop) {
      worstD0 = Math.max(worstD0, vnorm(vsub(sandwich(q.A[0]), d0)) / vnorm(d0))
      const Y = qadd(q.A[1], qscale(q.A[0], 1.5))
      worstT = Math.max(worstT, vnorm(vsub(sandwich(Y), T)) / vnorm(T))
    }
    console.log(
      `    ${loop.length} steps.  A₀iĀ₀ = c′(0) to ${worstD0.toExponential(1)},` +
        `  YiȲ = T to ${worstT.toExponential(1)}`,
    )
    expect(worstD0, 'A₀ stays on its Hopf circle').toBeLessThan(1e-12)
    expect(worstT, 'Y stays on its Hopf circle — the completed square holds along the walk')
      .toBeLessThan(1e-12)

    const ind = indicatrixDistance(loop[0], loop[loop.length - 1])
    console.log(
      `    closure:  gauge ${gap.toExponential(1)},` +
        `  indicatrix over t∈[−2,2] ${ind.toExponential(1)},` +
        `  curve on [0,1] ${curveGap(loop[0], loop[loop.length - 1]).toExponential(1)}`,
    )
    expect(gap, 'it comes back to the same spinor mod gauge').toBeLessThan(1e-8)
    expect(ind, 'and the WHOLE indicatrix comes back, not just the drawn piece').toBeLessThan(1e-8)
    expect(curveGap(loop[0], loop[loop.length - 1])).toBeLessThan(1e-8)
  }, 60_000)

  it('THE MISAPPLIED CONTROL: the polynomial QUINTIC fiber is 5-dimensional, so there is no loop', () => {
    // This is the case that produced "|𝒜| grows 5 → 34 and never closes" and cost the walk its
    // credibility. It is not a bug and it is not a failure — it is the correct answer to a question
    // with no loop in it. The walk now says so rather than running to its step cap and being read as
    // broken.
    expect(familyBasis(QUINTIC).length).toBe(12)
    expect(12 - 6 - 1).toBe(5)

    const { gap, closed, loop } = fiberClosure(QUINTIC, { stride: 0.05, maxSteps: 300 })
    console.log(`    ${loop.length} steps, closed=${closed}, gap ${gap.toExponential(1)}`)
    expect(closed, 'no return is found, because there is none to find').toBe(false)
    expect(gap).toBeGreaterThan(1)

    // and the data really is held the whole way — the walk is IN the fiber, it just cannot exhaust it
    const target = dataOf(toMember(QUINTIC))
    for (const q of loop) {
      expect(Math.hypot(...dataOf(toMember(q)).map((v, i) => v - target[i]))).toBeLessThan(1e-8)
    }
  }, 60_000)

  it('AND THE RATIONAL FIBER CLOSES, on all three measures at once', () => {
    const seed = seedQuintic()                       // two poles, degree 5, fiber 8 − 6 − 1 = 1
    expect(familyBasis(seed).length - 6 - 1).toBe(1)

    const { loop, gap, closed } = fiberClosure(seed, { stride: 0.05, maxSteps: 900 })
    expect(closed).toBe(true)
    const ind = indicatrixDistance(loop[0], loop[loop.length - 1])
    const cv = curveGap(loop[0], loop[loop.length - 1])
    console.log(
      `    ${loop.length} steps.  gauge ${gap.toExponential(1)},` +
        `  indicatrix over t∈[−2,2] ${ind.toExponential(1)},  curve on [0,1] ${cv.toExponential(1)}`,
    )
    expect(gap).toBeLessThan(1e-8)
    expect(ind, 'the full indicatrix returns — the sphere picture is honest').toBeLessThan(1e-8)
    expect(cv).toBeLessThan(1e-8)
  }, 60_000)

  it('WHY THE OLD RULE WAS WRONG: its trigger fires while the curve is still far away', () => {
    // The old rule: stop once three curve points on t ∈ [0,1] are within 4e-3 of the start. Replay it
    // against the walk and measure what the rest of the curve is doing at that moment.
    const seed = seedQuintic()
    const { loop } = fiberClosure(seed, { stride: 0.05, maxSteps: 900 })
    const sig = (q: MultiPoleParams): number[] => {
      const m = toMember(q)
      return [0.2, 0.45, 0.7].flatMap((t) => { const v = curveAt(m, t); return [v.x, v.y, v.z] })
    }
    const sig0 = sig(loop[0])
    const scale = Math.hypot(...sig0)
    const fires = loop.findIndex((q, i) =>
      i > 40 && Math.hypot(...sig(q).map((v, k) => v - sig0[k])) / scale < 4e-3)
    expect(fires, 'the old rule does fire somewhere in here').toBeGreaterThan(0)

    const atOld = indicatrixDistance(loop[0], loop[fires])
    const atNew = indicatrixDistance(loop[0], loop[loop.length - 1])
    const ratio = gaugeDistance(loop[0].A, loop[fires].A) / gaugeDistance(loop[0].A, loop[loop.length - 1].A)
    console.log(
      `    old rule fires at step ${fires} of ${loop.length}:` +
        `  full indicatrix still ${atOld.toExponential(1)} away on a unit sphere` +
        `  (the new rule lands at ${atNew.toExponential(1)}, a factor of ${ratio.toExponential(1)} closer)`,
    )
    // Measured 1.6e-2 at this seed — three strides short. RATIONAL_PH_STATE §8 records 0.49 at a
    // different configuration; that number is not reproduced here and is not what is claimed. What IS
    // claimed is the DIRECTION: the trigger fires while the drawn piece has returned and the rest of
    // the curve has not, and the size of "not" is not something the trigger controls.
    expect(atOld, 'the drawn piece had returned; the curve had not').toBeGreaterThan(1e-3)
    expect(atNew).toBeLessThan(1e-8)
    expect(ratio, 'and the refined landing is orders closer, not marginally').toBeGreaterThan(1e5)
  }, 60_000)
})

function vscale3(v: { x: number; y: number; z: number }, k: number): { x: number; y: number; z: number } {
  return { x: v.x * k, y: v.y * k, z: v.z * k }
}
