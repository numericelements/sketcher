// ============================================================================
// THE POLE READOUT, checked against every specimen whose answer is known independently.
//
// This is the instrument two lab slides read from, so it is tested against curves whose pole
// character is settled by ALGEBRA rather than by another measurement:
//
//   the λ-chart quartic       one real simple pole, sigma = 8.21   -> HARD
//   a conformal member        soft at every pole, by <C,C> = 0     -> SOFT
//   x = (1/(t+1)², 0, 0)      a DOUBLE real pole, POLE_ALGEBRA §6  -> undefined, not a verdict
//   a fake pole               q and W sharing a root               -> NOT A POLE
//
// The last two are the ones worth having. Both are cases where the question is malformed, and an
// instrument that answered them anyway would be quietly wrong on a slide.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bernsteinMultiply } from '../bernstein'
import { findMember } from '../conformalPHCurve'
import { type Rat } from '../nurbsPH'
import { readPoles, poleLines } from '../poleReadout'
import { hardQuarticMember, toBern } from './hardQuarticWitness'

const show = (label: string, rat: Rat): ReturnType<typeof readPoles> => {
  const ps = readPoles(rat)
  console.log(`    ${label}: ${ps.length} pole${ps.length === 1 ? '' : 's'}`)
  for (const p of ps) for (const line of poleLines(p)) console.log(`      ${line}`)
  return ps
}

describe('the pole readout', () => {
  it('the λ-chart quartic: one real simple pole, and it is HARD', () => {
    const m = hardQuarticMember()
    const d = 4
    const w = toBern([...m.w], d)
    const q = [0, 1, 2].map((i) => toBern([...m.p[i]], d))
    const rat: Rat = {
      P: Array.from({ length: d + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w,
      rho: toBern([...m.sigma], 2 * d - 1),
    }
    const ps = show('λ-chart quartic', rat)
    expect(ps.length, 'W is genuinely degree 1, so ONE pole — not four').toBe(1)
    expect(ps[0].real).toBe(true)
    expect(ps[0].multiple).toBe(false)
    expect(ps[0].at.re, 'at t = 1.7').toBeCloseTo(1.7, 6)
    expect(ps[0].angle, 'b = 0 at a real pole, so no angle to report').toBeNull()
    expect(ps[0].verdict).toBe('hard')
    expect(ps[0].isotropy, 'as hard as a pole gets').toBeCloseTo(1, 6)
  })

  it('a conformal member: every pole complex, simple, genuine and SOFT', () => {
    const s = findMember(6)
    expect(s, 'a genuine degree-6 conformal member').not.toBeNull()
    if (!s) return
    const w = s.C.map((c) => c[0])
    const q = [1, 2, 3].map((i) => s.C.map((c) => c[i]))
    const rat: Rat = {
      P: Array.from({ length: 7 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w: [...w],
      rho: bernsteinMultiply([...s.h], w),
    }
    const ps = show('conformal degree 6', rat)
    expect(ps.length).toBe(6)
    for (const p of ps) {
      expect(p.real, 'a genuine simple soft pole must be complex — §6').toBe(false)
      expect(p.multiple).toBe(false)
      expect(p.verdict).toBe('soft')
      // the alignment: equal lengths at a right angle
      expect(p.lengthA / p.lengthB, '|a| = |b|').toBeCloseTo(1, 8)
      expect(p.angle ?? 0, 'a ⊥ b').toBeCloseTo(90, 6)
    }
  }, 120_000)

  it('a DOUBLE real pole: the readout refuses to give a verdict', () => {
    // x = (1/(t+1)², 0, 0) — POLE_ALGEBRA §6's counterexample
    const w = toBern([1, 2, 1], 2)
    const q = [toBern([1], 2), toBern([0], 2), toBern([0], 2)]
    const rat: Rat = {
      P: Array.from({ length: 3 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w,
      rho: toBern([2, 2], 3),
    }
    const ps = show('x = (1/(t+1)², 0, 0)', rat)
    expect(ps.length, 'two coincident roots at t = −1').toBe(2)
    for (const p of ps) {
      expect(p.at.re).toBeCloseTo(-1, 5)
      expect(p.multiple, 'the roots sit on top of each other').toBe(true)
      expect(p.numerator, 'and the numerator does NOT cancel — the pole is genuine').toBeGreaterThan(0.1)
      expect(p.verdict, 'so the honest answer is that softness is undefined here')
        .toBe('multiple — undefined')
    }
  })

  it('a FAKE pole: q and W share a root, so there is no pole to judge', () => {
    // q = (t−0.5)·(1,0,0),  W = (t−0.5)(t−2) — the factor cancels
    const w = toBern([1, -2.5, 1], 2)                 // (t−0.5)(t−2) = t² − 2.5t + 1
    const q = [toBern([-0.5, 1], 2), toBern([0], 2), toBern([0], 2)]
    const rat: Rat = {
      P: Array.from({ length: 3 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w,
      rho: toBern([1], 3),
    }
    const ps = show('q, W sharing (t−0.5)', rat)
    const cancels = ps.filter((p) => p.verdict === 'not a pole')
    expect(cancels.length, 'the shared root is reported as not a pole').toBe(1)
    expect(cancels[0].at.re).toBeCloseTo(0.5, 6)
    const real = ps.filter((p) => p.verdict !== 'not a pole')
    expect(real.length, 'and the other root survives as a genuine one').toBe(1)
    expect(real[0].at.re).toBeCloseTo(2, 6)
  })

  it('the verdict is a DISPLAY convention — the number is always there to disagree with', () => {
    const m = hardQuarticMember()
    const d = 4
    const w = toBern([...m.w], d)
    const q = [0, 1, 2].map((i) => toBern([...m.p[i]], d))
    const rat: Rat = {
      P: Array.from({ length: d + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
      w,
      rho: toBern([...m.sigma], 2 * d - 1),
    }
    // move the threshold absurdly and the verdict flips; the isotropy does not
    const strict = readPoles(rat, { softBelow: 2 })
    const loose = readPoles(rat, { softBelow: 1e-30 })
    expect(strict[0].verdict).toBe('soft')
    expect(loose[0].verdict).toBe('hard')
    expect(strict[0].isotropy).toBe(loose[0].isotropy)
    console.log(`    isotropy ${strict[0].isotropy.toFixed(6)} either way;` +
      ` only the label moved — which is why the slide shows both`)
  })
})
