// ============================================================================
// WHY THE λ-CHART LIFT IS SLOW — the same curve, three ways of writing it.
//
// It is one curve of degree 4. Drag the SAME control point the SAME distance, and count the
// iterations each representation needs to put the point on the cursor:
//
//     representation                          denominator   iterations to track
//     the curve itself, degree 4              degree 1              5
//     lift8g, degree 8, denominator FULL      degree 8             40
//     lift8,  degree 8, denominator degree 2  degree 2            200
//
// Two costs, and they are separate.
//
//   · DEGREE. Writing a degree-4 curve at degree 8 costs 8× (5 → 40). The lift doubles the degree
//     by construction — that is what a lift is — and the extra control points carry no new shape,
//     so the solver spends steps discovering that.
//
//   · MISMATCH. Writing a degree-2 denominator inside a degree-8 box costs another 5× (40 → 200).
//     lift8g pays only the first cost because its denominator fills its box; lift8 pays both.
//     Its five coordinates have true degrees (2, 5, 8) against lift8g's (8, 8, 8).
//
// So "stuck" was the wrong word for it, and this file exists to retire it. The drag works — 100%
// tracking, defect 3.4e-8 — it simply needs forty times the iterations of the same curve written
// at its own size. Nothing about the geometry of the curve is difficult; what is expensive is
// carrying six degrees of denominator that are not there.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { settleToPH, phRelativeResidual, type Rat } from '../nurbsPH'
import { hardQuarticRat, PRESETS, conformalAsRat } from '../../talks/ph-interpolation/poleLabPresets'
import { frameConformal } from '../../talks/ph-interpolation/PoleLab'
import { dragControlPoint, controlPoints, degreeOf } from '../conformalPHCurve'
import { conformalNullResidual } from '../poleReadout'
import { vnorm, vsub } from '../quaternion'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }

describe('the same curve, three ways of writing it', () => {
  it('counts the iterations each representation needs', () => {
    // ---- the SOURCE: the λ-chart quartic, degree 4, denominator degree 1 ----
    const rat = hardQuarticRat()
    const d = rat.P.length - 1
    const P0 = rat.P.map((p) => ({ x: p[0], y: p[1], z: p[2] }))
    const chord = vnorm(vsub(P0[d], P0[0]))
    say(`  SOURCE: projective degree ${d}, starting residual ${phRelativeResidual(rat).toExponential(1)}`)
    say(`      chord ${chord.toExponential(1)}`)
    say('')
    say('  drag control point 2 by a fraction of the chord, IN THE SOURCE (degree 4):')
    let cur: Rat = rat
    for (const f of [0.05, 0.10, 0.15, 0.20, 0.30]) {
      const start = rat.P[2]
      const to = [start[0] + f * chord * 0.6, start[1] + f * chord * 0.6, start[2] - f * chord * 0.5]
      const want = Math.hypot(...to.map((v, i) => v - cur.P[2][i]))
      const seed: Rat = { P: cur.P.map((p, k) => (k === 2 ? [...to] : [...p])), w: [...cur.w], rho: [...cur.rho] }
      const frozen = [6, 7, 8, ...Array.from({ length: 3 }, (_, i) => i), ...Array.from({ length: 3 }, (_, i) => 3 * d + i)]
      const t0 = Date.now()
      const got = settleToPH(seed, d, { frozen, steps: 200 })
      const ms = Date.now() - t0
      const moved = Math.hypot(...got.rat.P[2].map((v, i) => v - to[i]))
      say(`      ${(100 * f).toFixed(0).padStart(3)}% : tracked ${(100 * (1 - moved / Math.max(want, 1e-12))).toFixed(1)}%` +
        `  PH residual ${got.residual.toExponential(1)}  ${ms}ms`)
      cur = got.rat
    }

    // ---- the LIFT of the same curve: degree 8 ----
    say('')
    const st = frameConformal(PRESETS.find((p) => p.id === 'lift8')!.conformal!)
    const n = degreeOf(st)
    const Q = controlPoints(st)
    const chord2 = vnorm(vsub(Q[n], Q[0]))
    say(`  LIFT of the SAME curve: conformal degree ${n}`)
    say('  drag control point 3 by a fraction of the chord, IN THE LIFT (degree 8):')
    let conf = st
    for (const f of [0.05, 0.10, 0.15, 0.20, 0.30]) {
      const s0 = controlPoints(st)[3]
      const to = { x: s0.x + f * chord2 * 0.6, y: s0.y + f * chord2 * 0.6, z: s0.z - f * chord2 * 0.5 }
      const want = vnorm(vsub(to, controlPoints(conf)[3]))
      const t0 = Date.now()
      const got = dragControlPoint(conf, 3, to, { pinEnds: true, iterations: 200 })
      const ms = Date.now() - t0
      say(`      ${(100 * f).toFixed(0).padStart(3)}% : tracked ${(100 * (1 - got.trackingError / Math.max(want, 1e-12))).toFixed(1)}%` +
        `  defect ${got.defect.toExponential(1)}  ⟨C,C⟩ ${conformalNullResidual(got.state).toExponential(1)}  ${ms}ms`)
      conf = got.state
    }
    // ---- the SAME drag at the SAME budget, both representations ----
    say('')
    say('  the same 20%-of-chord drag, at matched iteration budgets:')
    say('      budget    SOURCE (degree 4)          LIFT (degree 8)')
    for (const it of [5, 10, 20, 40, 80, 200]) {
      const start = rat.P[2]
      const to = [start[0] + 0.2 * chord * 0.6, start[1] + 0.2 * chord * 0.6, start[2] - 0.2 * chord * 0.5]
      const seed: Rat = { P: rat.P.map((p, k) => (k === 2 ? [...to] : [...p])), w: [...rat.w], rho: [...rat.rho] }
      const frozen = [6, 7, 8, 0, 1, 2, 3 * d, 3 * d + 1, 3 * d + 2]
      const a = settleToPH(seed, d, { frozen, steps: it })
      const movedA = Math.hypot(...a.rat.P[2].map((v, i) => v - to[i]))
      const s0 = controlPoints(st)[3]
      const toC = { x: s0.x + 0.2 * chord2 * 0.6, y: s0.y + 0.2 * chord2 * 0.6, z: s0.z - 0.2 * chord2 * 0.5 }
      const wantC = vnorm(vsub(toC, s0))
      const b = dragControlPoint(st, 3, toC, { pinEnds: true, iterations: it })
      say(`      ${String(it).padStart(4)}      residual ${a.residual.toExponential(1)}` +
        `  tracked ${(100 * (1 - movedA / 1e-12 * 0 - movedA / Math.max(Math.hypot(...to.map((v, i) => v - rat.P[2][i])), 1e-12))).toFixed(0)}%` +
        `      defect ${b.defect.toExponential(1)}  tracked ${(100 * (1 - b.trackingError / wantC)).toFixed(0)}%`)
    }
    // ---- lift8g: ALSO a degree-4 curve written at degree 8, but with a FULL denominator ----
    say('')
    const g = frameConformal(PRESETS.find((p) => p.id === 'lift8g')!.conformal!)
    const Qg = controlPoints(g)
    const chordG = vnorm(vsub(Qg[degreeOf(g)], Qg[0]))
    say('  lift8g — the other degree-8 lift, whose denominator IS degree 8:')
    say('      budget    tracked   defect')
    for (const it of [5, 10, 20, 40, 80]) {
      const s0 = Qg[3]
      const toG = { x: s0.x + 0.2 * chordG * 0.6, y: s0.y + 0.2 * chordG * 0.6, z: s0.z - 0.2 * chordG * 0.5 }
      const wantG = vnorm(vsub(toG, s0))
      const b = dragControlPoint(g, 3, toG, { pinEnds: true, iterations: it })
      say(`      ${String(it).padStart(4)}      ${(100 * (1 - b.trackingError / wantG)).toFixed(0).padStart(4)}%   ${b.defect.toExponential(1)}`)
    }
    void conformalAsRat
    for (const line of OUT) console.log(line)

    // the ladder, pinned: the curve at its own size tracks immediately, the full-denominator lift
    // needs a moderate budget, and the mismatched one needs an order more.
    const srcAt5 = (() => {
      const start = rat.P[2]
      const to = [start[0] + 0.2 * chord * 0.6, start[1] + 0.2 * chord * 0.6, start[2] - 0.2 * chord * 0.5]
      const seed: Rat = { P: rat.P.map((p, k) => (k === 2 ? [...to] : [...p])), w: [...rat.w], rho: [...rat.rho] }
      const frozen = [6, 7, 8, 0, 1, 2, 3 * d, 3 * d + 1, 3 * d + 2]
      const a = settleToPH(seed, d, { frozen, steps: 5 })
      return Math.hypot(...a.rat.P[2].map((v, i) => v - to[i]))
    })()
    expect(srcAt5, 'the curve at its own degree tracks in five iterations').toBeLessThan(1e-9)

    const liftAt80 = (() => {
      const s0 = controlPoints(st)[3]
      const to = { x: s0.x + 0.2 * chord2 * 0.6, y: s0.y + 0.2 * chord2 * 0.6, z: s0.z - 0.2 * chord2 * 0.5 }
      const b = dragControlPoint(st, 3, to, { pinEnds: true, iterations: 80 })
      return b.trackingError / vnorm(vsub(to, s0))
    })()
    expect(liftAt80, 'the mismatched lift is still short at eighty').toBeGreaterThan(0.1)

    const liftAt200 = (() => {
      const s0 = controlPoints(st)[3]
      const to = { x: s0.x + 0.2 * chord2 * 0.6, y: s0.y + 0.2 * chord2 * 0.6, z: s0.z - 0.2 * chord2 * 0.5 }
      const b = dragControlPoint(st, 3, to, { pinEnds: true, iterations: 200 })
      return { err: b.trackingError / vnorm(vsub(to, s0)), defect: b.defect }
    })()
    expect(liftAt200.err, 'and arrives by two hundred — it was never stuck').toBeLessThan(1e-6)
    expect(liftAt200.defect, 'on the variety when it gets there').toBeLessThan(1e-6)
  }, 900_000)
})
