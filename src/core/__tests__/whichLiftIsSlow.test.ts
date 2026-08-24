// ============================================================================
// WHY ONE PRESET IS SLOW AND THE OTHERS ARE NOT — it is the CURVE, not the model.
//
// The λ-chart lift ("lift8") drags at 300–500 ms a frame and lets poles read HARD, in a model
// where ⟨C,C⟩ ≡ 0 forbids hardness. Everything else in the lab drags at 1–7 ms with ⟨C,C⟩ at
// 1e-13 or better. Swept over every draggable point, 1.2 chords in twenty steps:
//
//     lift8g    all 7 points   2–7 ms    ⟨C,C⟩ 1e-14    0 of 20 steps reading hard
//     soft6     all 5 points   1 ms      ⟨C,C⟩ 1e-15    0 of 20
//     mixedUni  all 5 points   1–3 ms    ⟨C,C⟩ 1e-13    0 of 20
//     lift8     point 3        515 ms    ⟨C,C⟩ 1.7e-7   16 of 20, isotropy up to 1.0
//
// So it is not the Möbius model, not the degree, and NOT the doubled pole: mixedUni is a uniform
// lift at degree 6, every pole doubled, and it drags at a millisecond.
//
// THE REASON IS A MULTIPLE POLE, and it is visible in the source's degrees alone. lift8's source is
// w = t − 1.7 against q of degree 4, so x ~ t³ as t → ∞: the curve has a pole of MULTIPLICITY 3 at
// infinity. That is the same singularity the double-pole specimen has, it is intrinsic — a
// reparametrisation carries the triple pole with it rather than removing it (§12) — and it is why
// this member converges linearly where the others converge quadratically.
//
// WHICH MAKES IT A CATEGORY RATHER THAN A NUISANCE. "The awkward one" was never a property of the
// lift; it is the lab's specimen whose CURVE has a multiple pole, and the slowness is that fact
// being felt. Unsticking it is the singular-point solver, not solver tuning — two attempts at the
// latter are recorded in solveWith and PoleLab, both reverted.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { dragControlPoint, degreeOf, type ConformalPHCurve } from '../conformalPHCurve'
import { conformalNullResidual, readPoles, trueDegreePoly } from '../poleReadout'
import { PRESETS, conformalAsRat } from '../../talks/ph-rational/poleLabPresets'
import { frameConformal } from '../specimenFraming'
import { hardQuarticMember } from '../hardQuarticWitness'

const trueDeg = (p: readonly number[]): number => trueDegreePoly([...p], 1e-10).length - 1

/** One drag of `steps` frames, reporting what an editor would feel and what the slide would show. */
function sweep(base: ConformalPHCurve, g: number, chords: number, steps: number) {
  const n = degreeOf(base)
  const pts = conformalAsRat(base).P
  const chord = Math.hypot(...pts[n].map((v, i) => v - pts[0][i]))
  const start = pts[g].slice()
  const dir = [0.6, 0.6, -0.5]
  const dn = Math.hypot(...dir)
  let conf = base
  let slowest = 0, worstNull = 0, hardSteps = 0, worstIso = 0, worstBudget = 0
  for (let s = 1; s <= steps; s++) {
    const u = (chords * chord * s) / steps
    const to = start.map((v, i) => v + (u * dir[i]) / dn)
    const t0 = Date.now()
    let best: ConformalPHCurve | null = null
    let bestNull = Infinity
    let budget = 0
    for (const iterations of [80, 300, 900]) {
      const r = dragControlPoint(conf, g, { x: to[0], y: to[1], z: to[2] }, { pinEnds: true, iterations })
      const off = conformalNullResidual(r.state)
      budget = iterations
      if (off < bestNull) { bestNull = off; best = r.state }
      if (off <= 1e-9) break
    }
    worstBudget = Math.max(worstBudget, budget)
    slowest = Math.max(slowest, Date.now() - t0)
    if (!best) break
    conf = best
    worstNull = Math.max(worstNull, bestNull)
    const poles = readPoles(conformalAsRat(conf)).filter((x) => x.numerator > 1e-7)
    if (bestNull <= 1e-9 && poles.length > 0) {
      worstIso = Math.max(worstIso, ...poles.map((x) => x.isotropy))
      if (!poles.every((x) => x.verdict === 'soft')) hardSteps++
    }
  }
  return { slowest, worstNull, worstIso, hardSteps, worstBudget }
}

describe('which lift is slow, and why', () => {
  it('the source degrees predict it: a multiple pole at infinity', () => {
    const m = hardQuarticMember()
    const dw = trueDeg([...m.w])
    const dq = Math.max(...m.p.map((c) => trueDeg([...c])))
    // deg q − deg w = 3, so x ~ t³ at infinity: a pole of multiplicity 3 there.
    console.log(`    lift8's source: deg w ${dw}, deg q ${dq} → multiplicity ${dq - dw} at ∞,` +
      ` so Σ(m_p − 1) = ${dq - dw - 1} from infinity alone`)
    expect(dw, 'the λ-chart denominator is genuinely degree 1').toBe(1)
    expect(dq - dw, 'and the numerator outruns it by three').toBe(3)
  })

  it('and the slowness follows the multiple pole, not the doubling or the degree', () => {
    const rows: [string, ReturnType<typeof sweep>][] = []
    for (const id of ['lift8g', 'mixedUni', 'lift8']) {
      const p = PRESETS.find((x) => x.id === id)
      if (!p?.conformal) throw new Error(`missing ${id}`)
      const base = frameConformal(p.conformal)
      const g = Math.max(1, Math.floor(degreeOf(base) / 2) - 1)
      const got = sweep(base, g, 1.2, 12)
      rows.push([id, got])
      console.log(`    ${id.padEnd(9)} point ${g}: worst budget needed ${String(got.worstBudget).padStart(3)}` +
        `  slowest frame ${String(got.slowest).padStart(4)}ms  worst ⟨C,C⟩ ${got.worstNull.toExponential(1)}` +
        `  worst isotropy ${got.worstIso.toExponential(1)}  ${got.hardSteps} of 12 steps reading hard`)
    }
    const by = Object.fromEntries(rows)
    // mixedUni is a UNIFORM lift with every pole doubled — and it is one of the fast ones.
    expect(by.mixedUni.worstNull, 'the doubled uniform lift stays on the model').toBeLessThan(1e-9)
    expect(by.mixedUni.hardSteps, 'and never reads a hard pole').toBe(0)
    expect(by.lift8g.worstNull, 'so does the other degree-8 lift').toBeLessThan(1e-9)
    expect(by.lift8g.hardSteps, 'which is the specimen that teaches the transition').toBe(0)
    // lift8 is the one with a multiple pole, and it is the only one that struggles. The ITERATION
    // BUDGET is what to pin, not the milliseconds: wall time depends on the machine and on JIT
    // warm-up, and a first-call 14 ms against a steady-state 1 ms is enough to make a timing ratio
    // lie. The budget the escalation has to reach is deterministic.
    expect(by.lift8g.worstBudget, 'the clean lift never leaves the cheap budget').toBe(80)
    expect(by.mixedUni.worstBudget, 'nor does the doubled uniform lift').toBe(80)
    expect(by.lift8.worstBudget, 'the multiple-pole specimen has to escalate').toBeGreaterThan(80)
  }, 300_000)
})
