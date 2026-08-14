// ============================================================================
// THE DEGREE-6 POLE SLIDER — a non-converged solve is not a member, and one made the curve invisible.
//
// THE SYMPTOM: slide 6 rendered with NO CURVE ON SCREEN. The cause was not in the drawing code. The
// figure frames its camera once, from the seed across the pole slider's range, and one of the five
// probe solves came back with a residual of 1.2e13 and a curve reaching 5.8e11. It still passed
// `poleMargin`, which only asks where the pole SITS, so it was accepted — the box came out ±3e11 and
// the real curve, whose extent is 7.7, became a sub-pixel dot.
//
// TWO SEPARATE LESSONS, and the second is the interesting one.
//
//   1. `poleMargin` is not a convergence test. Anything that accepts a solve must check the RESIDUAL.
//
//   2. The failures were a bad STARTING POINT, not an edge of the family. Jumping the pole straight
//      from the seed, r = 1.1 solved and 1.15 did not and 1.2 did — scattered, with no boundary. A
//      real limit of the family does not look like that. Stepping r in slider-sized increments and
//      re-solving from the previous member reaches r = 1.01, residuals at 1e-14, all the way down.
//
// So both the figure's framing and `setPole` walk the pole rather than jumping it. During an actual
// drag the steps are already small; the continuation is what makes CLICKING the slider track behave
// the same as dragging to the same place.
//
// AND ONE MEASURED FACT WORTH KEEPING, which is also what lets the figure frame itself for free: with
// the nine Hermite numbers held, `max‖c‖` over the drawn piece is 7.665 at EVERY pole from 1.01 to 20 —
// identical to four figures. The pole moves the shape around inside a box it never leaves. That is the
// same "the data is held, so the curve reshapes rather than blowing up" effect the degree-4 slide
// measured as 6.6× instead of 1340×, here in its strongest form. So `HermiteCurveFigure` frames from
// the SEED alone rather than probing the slider's range, which would otherwise cost ~200 projections
// at module load and stall the deck.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  type MultiPoleParams,
  curveAt, familyBasis, hermiteOf, phDefect, poleMargin, projectOnto, projectToFamily, toMember,
  unpackSpinor,
} from '../rationalPHMultiPoleSpatial'
import type { Quat } from '../quaternion'

const ZERO: Quat[] = Array.from({ length: 4 }, () => ({ u: 0, v: 0, p: 0, q: 0 }))
const SEED: MultiPoleParams = (() => {
  const base: MultiPoleParams = { A: ZERO, roots: [1.7], lambdas: [Math.tan((35 * Math.PI) / 180)] }
  const B = familyBasis(base)
  const x = new Array<number>(16).fill(0)
  B.forEach((b, i) => {
    const a = 1.3 * Math.sin(1.7 * i + 0.6)
    for (let j = 0; j < 16; j++) x[j] += a * b[j]
  })
  return { ...base, A: unpackSpinor(x) }
})()
const TARGET = hermiteOf(toMember(SEED))

const residual = (prm: MultiPoleParams): number =>
  Math.hypot(...hermiteOf(toMember(prm)).map((v, i) => v - TARGET[i]))
const extent = (prm: MultiPoleParams): number => {
  const m = toMember(prm)
  let w = 0
  for (let i = 0; i <= 40; i++) {
    const p = curveAt(m, i / 40)
    w = Math.max(w, Math.hypot(p.x, p.y, p.z))
  }
  return w
}
/** One jump: what the figure and the slider used to do. */
const jump = (r: number): MultiPoleParams =>
  projectOnto(projectToFamily({ ...SEED, roots: [r] }), hermiteOf, TARGET, 40)
/** Stepped: what they do now. */
const walk = (to: number, step = 0.02): MultiPoleParams | null => {
  let cur = SEED
  const from = SEED.roots[0]
  const n = Math.max(1, Math.ceil(Math.abs(to - from) / step))
  for (let k = 1; k <= n; k++) {
    const moved = projectToFamily({ ...cur, roots: [from + ((to - from) * k) / n] })
    if (familyBasis(moved).length === 0) return null
    const next = projectOnto(moved, hermiteOf, TARGET, 40)
    if (!(residual(next) < 1e-6) || poleMargin(next) < 1e-3) return null
    cur = next
  }
  return cur
}

describe('the degree-6 pole slider', () => {
  it('A JUMPED SOLVE CAN FAIL AND STILL LOOK FINE to poleMargin — which is what hid the curve', () => {
    const bad = jump(1.06)
    console.log(
      `    jumped to r = 1.06:  residual ${residual(bad).toExponential(1)},` +
        `  poleMargin ${poleMargin(bad).toFixed(3)},  curve extent ${extent(bad).toExponential(2)}`,
    )
    expect(residual(bad), 'the solve did not converge').toBeGreaterThan(1)
    expect(poleMargin(bad), 'and poleMargin has no idea — it only asks where the pole sits')
      .toBeGreaterThan(1e-3)
    expect(extent(bad), 'a curve this size is what blew the camera box').toBeGreaterThan(1e6)
  })

  it('and the jump failures are SCATTERED, so they are a bad start and not a limit of the family', () => {
    const rows = [1.1, 1.15, 1.2].map((r) => ({ r, ok: residual(jump(r)) < 1e-6 }))
    console.log(`    jumped: ${rows.map((x) => `r=${x.r} ${x.ok ? 'ok' : 'FAIL'}`).join('  ')}`)
    // ok, FAIL, ok. A real edge of the family is monotone in r; this is not.
    expect(rows[0].ok).toBe(true)
    expect(rows[1].ok).toBe(false)
    expect(rows[2].ok).toBe(true)
  })

  it('CONTINUATION REACHES r = 1.01, with the data held and every member PH', () => {
    const rows: string[] = []
    for (const r of [1.01, 1.05, 1.2, 1.7, 4]) {
      const prm = walk(r)
      expect(prm, `r = ${r} is reachable by continuation`).not.toBeNull()
      expect(residual(prm!)).toBeLessThan(1e-6)
      expect(poleMargin(prm!)).toBeGreaterThan(1e-3)
      // PH DEGRADES NEAR THE POLE, and it is conditioning rather than a defect in the solve: at
      // r = 1.01 the denominator w(1)² = 1e-4, so ‖c′‖ = σ/w² is formed by dividing by a small
      // number and the relative check inherits it. 1.6e-11 at r = 1.01 against 1e-14 out at r = 4.
      const ph = phDefect(toMember(prm!))
      expect(ph).toBeLessThan(1e-9)
      rows.push(
        `    r = ${String(r).padStart(5)}:  residual ${residual(prm!).toExponential(1)},` +
          `  PH ${ph.toExponential(1)},  max‖c‖ ${extent(prm!).toFixed(3)}`,
      )
    }
    rows.forEach((x) => console.log(x))
  }, 60_000)

  it('AND THE CURVE NEVER LEAVES ITS BOX: max‖c‖ is the same at every pole', () => {
    // The strongest form of "the data is held, so the curve reshapes rather than blowing up". At
    // degree 4 holding six numbers that showed up as 6.6× instead of the naive 1340×; here, holding
    // nine, the extent does not move at all.
    const sizes = [1.01, 1.05, 1.2, 1.7, 4].map((r) => extent(walk(r)!))
    const spread = Math.max(...sizes) / Math.min(...sizes)
    console.log(`    max‖c‖ across the slider: ${sizes.map((v) => v.toFixed(3)).join(', ')}  (spread ${spread.toFixed(6)})`)
    expect(spread).toBeLessThan(1.001)
  }, 60_000)
})
