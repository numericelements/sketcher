// ============================================================================
// WHERE GENUINE ALL-HARD MEMBERS EXIST — and the answer is a clean inequality in the
// number of NON-REAL poles, not in m.
//
//     genuine (hodographRank 3) all-hard members appear  ⟺  deg 𝒜  ≥  c + 1
//
// where c is the number of COMPLEX poles. Real poles are free: softness is identically 1 at
// a real pole (Cauchy–Schwarz equality, `poleDiagnostics`), so they are hard by theorem and
// cost nothing. Measured, 160 deterministic Newton starts per configuration:
//
//     poles              c    deg 𝒜 = c−1   c    c+1   c+2
//     m=2  (0 real)      2         0         0    84     —      threshold n = 3
//     m=3  (1 real)      2         0        26    65     —      threshold n = 3
//     m=4  (0 real)      4         0         0    38     —      threshold n = 5
//     m=5  (1 real)      4         0        34    55     —      threshold n = 5
//     m=6  (0 real)      6         0         0    12     —      threshold n = 7
//
// (counts are genuine all-hard hits; the m=3 and m=5 rows reach the threshold one degree
// below their m because one of their poles is real.)
//
// WHY IT MATTERS. The λ-chart requires σ(r) ≠ 0 at EVERY pole — it can only chart all-hard
// members. So at n ≤ c the chart's home stratum contains no genuinely spatial curve at all.
// That is a better account of three weeks of chart trouble than ill-conditioning was: at
// (n, m) = (4, 4) the chart is not awkward, it is EMPTY. And it says where the chart is
// fine — n ≥ c+1, which is where every λ-chart member in this repository lives (m = 2 with
// deg 𝒜 = 3 and 4).
//
// THIS IS SAMPLING, NOT A PROOF. 160 deterministic Newton starts per configuration, with
// the degeneracy guard applied. A homotopy count would settle it; absence of evidence over
// 2880 solves is what is on offer here. What IS proved-by-mechanism is the companion fact
// in `softIsAbsorbing.test.ts`: soft is absorbing, so no continuation can carry a member
// into all-hard from anywhere else.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex } from '../complex'
import {
  type PoleSet, toSpinor, poleDiagnostics, newtonToResidue, hodographRank,
} from '../rationalPHResidue'

const C = (re: number, im = 0): Complex => ({ re, im })

const P2: PoleSet = [C(0.5, 0.8), C(0.5, -0.8)]
const P3: PoleSet = [C(0.4), C(0.5, 0.8), C(0.5, -0.8)]
const P4: PoleSet = [C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7)]
const P6: PoleSet = [
  C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7), C(1.3, 0.4), C(1.3, -0.4),
]

interface Tally { genuineHard: number; degenerateHard: number; total: number }

/** 160 deterministic starts; count all-hard hits split by hodograph rank. */
function survey(poles: PoleSet, n: number): Tally {
  const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
  const t: Tally = { genuineHard: 0, degenerateHard: 0, total: 0 }
  for (let s = 0; s < 160; s++) {
    const raw = Array.from({ length: 4 * (n + 1) }, (_, i) => (s % 3 === 0
      ? Math.sin(1.7 * i + 2.3 * s + 0.4)
      : s % 3 === 1 ? Math.cos(0.31 * i * i + 1.7 * s) - 0.8 * Math.sin(2.9 * i + 0.7 * s)
      : Math.sin(0.9 * i - 1.1 * s) * Math.cos(0.5 * i * i + s)))
    const nn = Math.hypot(...raw) || 1
    const x = newtonToResidue(raw.map((v) => v / nn), poles, reps, undefined, 200)
    if (!x) continue
    t.total++
    const A = toSpinor(x)
    // Only NON-REAL poles can be soft; softness is identically 1 at a real pole.
    const nonReal = poleDiagnostics(A, poles).filter((q) => !q.real)
    if (nonReal.some((q) => q.softness < 1e-8)) continue
    if (hodographRank(A) === 3) t.genuineHard++
    else t.degenerateHard++
  }
  return t
}

describe('where genuine all-hard members exist', () => {
  it('BELOW the threshold there are none — only straight lines and planar degenerates',
    { timeout: 300000 }, () => {
    for (const [label, poles, c, n] of [
      ['m=2, deg 𝒜 = 1', P2, 2, 1],
      ['m=2, deg 𝒜 = 2', P2, 2, 2],
      ['m=3, deg 𝒜 = 2', P3, 2, 2],
      ['m=4, deg 𝒜 = 3', P4, 4, 3],
      ['m=4, deg 𝒜 = 4', P4, 4, 4],
      ['m=6, deg 𝒜 = 5', P6, 6, 5],
      ['m=6, deg 𝒜 = 6', P6, 6, 6],
    ] as const) {
      expect(n, label).toBeLessThanOrEqual(c)
      const t = survey(poles, n)
      expect(t.total, label).toBeGreaterThan(60)           // the survey actually ran
      expect(t.genuineHard, label).toBe(0)                 // and found nothing genuine
    }
  })

  it('AT the threshold n = c + 1 they appear, at every m tested', { timeout: 300000 }, () => {
    for (const [label, poles, c, n, atLeast] of [
      ['m=2, deg 𝒜 = 3', P2, 2, 3, 40],
      ['m=3, deg 𝒜 = 3', P3, 2, 3, 10],                    // c = 2: one pole is REAL
      ['m=4, deg 𝒜 = 5', P4, 4, 5, 15],
      ['m=6, deg 𝒜 = 7', P6, 6, 7, 5],
    ] as const) {
      expect(n, label).toBe(c + 1)
      const t = survey(poles, n)
      expect(t.genuineHard, label).toBeGreaterThan(atLeast)
    }
  })

  it('the threshold is in the COMPLEX pole count, not m — real poles are free',
    { timeout: 300000 }, () => {
    // m = 3 (one real + one pair) reaches all-hard at deg 𝒜 = 3 while m = 4 (two pairs)
    // needs deg 𝒜 = 5. Same c + 1 = 3 versus 5. If the rule were about m, m = 3 would need
    // deg 𝒜 = 4 and m = 4 would be satisfied at 4; both readings are contradicted here.
    expect(survey(P3, 3).genuineHard).toBeGreaterThan(10)  // c = 2, n = 3 = c+1  → yes
    expect(survey(P4, 4).genuineHard).toBe(0)              // c = 4, n = 4 ≤ c    → none
  })

  it('and the degenerates really are the all-hard hits below threshold', { timeout: 120000 }, () => {
    // At (4,4) every all-hard hit is rank one — the observation that started this.
    const t = survey(P4, 4)
    expect(t.degenerateHard).toBeGreaterThan(20)           // 38
    expect(t.genuineHard).toBe(0)
  })
})
