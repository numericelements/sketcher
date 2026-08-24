// ============================================================================
// THE FIRST δ IN THIS INVESTIGATION THAT IS AN INTEGER.
//
// Everything else was fought at a resolution limit — δ counted below a floor, singular values read
// at √residual, a rate classified from one ratio that turned out to be a transient. Three
// instruments, each returning a number on inputs it could not measure. core/exactRank removes the
// floor: a rational PH space curve is CONSTRUCTIBLE over ℚ end to end (F17's no-log condition is
// linear in the spinor), PH holds by substitution rather than by solving, and every entry of the
// defining Jacobian is a binomial ratio times a rational coefficient. The rank comes back exact.
//
// WHAT IT SAYS, over seven distinct degree profiles and six spinor choices each:
//
//     deg w  deg q   lift degree N   EXACT rank   4N − 1 − rank
//       1      2          4              13            2
//       2      2          4              13            2         ← balanced
//       2      3          6              19            4
//       1      4          8              25            6
//       3      4          8              25            6
//       2      5         10              31            8
//       4      5         10              31            8
//
//     rank = 3N + 1 EXACTLY, so δ = N − 2.
//
// Independent of the balance, of the degree profile, of how many roots there are, and of the twist
// rates. Not a formula in (deg w, deg q) at all — a formula in the LIFT DEGREE alone.
//
// AND IT IS NOT A PROPERTY OF THE VARIETY, which is the part that matters. The native all-soft
// members sit at the generic rank 4N − 1 (soft6 reads 23 of 24 at degree 6, where this law would
// say 19). So δ = N − 2 is a statement about the LIFTS — and every specimen here has real rational
// roots, hence real poles, hence HARD ones. The deficiency of a hard lift grows linearly with its
// degree.
//
// THE ONE CONFOUND, stated because it is not removable with the machinery as it stands: rational
// roots are real roots, so every specimen constructible this way has only real (hard) poles. Whether
// the law survives a conjugate pair needs the same construction over ℚ(i), which is more machinery
// than this measurement needed.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  q, qNum, qAdd, qSub, qIsZero, exactMember, phDefectQ, liftExact, definingJacobianQ,
  definingResidualQ, rankQ, kernelQ, type Q, type QPoly, type ExactMember,
} from '../exactRank'
import { definingJacobian, residual, type ConformalPHCurve } from '../conformalPHCurve'
import { singularValues } from '../nurbsPH'
import type { Conformal } from '../conformal'

const trueDeg = (p: QPoly): number => { let d = p.length - 1; while (d > 0 && qIsZero(p[d])) d--; return d }
const allZero = (p: readonly Q[]): boolean => p.every(qIsZero)
const toFloat = (m: ReturnType<typeof liftExact>): ConformalPHCurve => ({
  C: m.C.map((row) => row.map(qNum) as unknown as Conformal),
  h: m.h.map(qNum),
})

describe('the exact rank of a lifted hard curve', () => {
  it('the specimens are members SYMBOLICALLY — no residual, not a small one', () => {
    const src = exactMember([q(2), q(3)], [q(1), q(1)], 2, [1, 0, 0, 0])
    const lifted = liftExact(src)
    const defect = phDefectQ(src)
    const res = definingResidualQ(lifted)
    console.log(`    PH defect ‖N‖² − ρ²: ${defect.filter((v) => !qIsZero(v)).length} nonzero of ${defect.length}`)
    console.log(`    defining residual:   ${res.filter((v) => !qIsZero(v)).length} nonzero of ${res.length}`)
    expect(allZero(defect), 'the source is PH by substitution').toBe(true)
    expect(allZero(res), 'and the lift is a member, exactly').toBe(true)
  })

  it('the exact Jacobian agrees with the production one entry by entry', () => {
    const lifted = liftExact(exactMember([q(2), q(3)], [q(1), q(1)], 2, [1, 0, 0, 0]))
    const Jq = definingJacobianQ(lifted).map((row) => row.map(qNum))
    const Jf = definingJacobian(toFloat(lifted))
    const scale = Math.max(...Jf.flat().map(Math.abs))
    let worst = 0
    for (let i = 0; i < Jf.length; i++) {
      for (let j = 0; j < Jf[0].length; j++) worst = Math.max(worst, Math.abs(Jq[i][j] - Jf[i][j]) / scale)
    }
    console.log(`    ${Jf.length} × ${Jf[0].length}, worst relative difference ${worst.toExponential(1)}`)
    expect(worst, 'the exact and floating Jacobians are the same matrix').toBeLessThan(1e-13)
  })

  it('rank = 3N + 1 exactly, across every profile the construction reaches', () => {
    const configs: [Q[], Q[], number][] = [
      [[q(2)], [q(1)], 1],
      [[q(2)], [q(1, 2)], 2],
      [[q(2), q(3)], [q(1), q(1)], 2],
      [[q(2), q(3)], [q(1, 2), q(2)], 2],
      [[q(-1), q(2)], [q(1), q(1)], 2],
      [[q(2), q(3)], [q(1), q(1)], 3],
      [[q(-1), q(2), q(3)], [q(1), q(1), q(1)], 3],
      [[q(-2), q(-1), q(2), q(3)], [q(1), q(1), q(1), q(1)], 4],
    ]
    const picks = [[1, 0, 0, 0], [1, 1, 0, 0], [1, 2, 0, 0], [0, 1, 1, 0], [1, 1, 1, 1], [2, 1, 3, 1]]
    const seen = new Set<string>()
    let count = 0
    for (const [roots, lambdas, n] of configs) {
      for (const pick of picks) {
        let src
        try { src = exactMember(roots, lambdas, n, pick) } catch { continue }
        if (!allZero(phDefectQ(src))) continue
        const lifted = liftExact(src)
        if (!allZero(definingResidualQ(lifted))) continue
        const N = lifted.degree
        const rank = rankQ(definingJacobianQ(lifted))
        const key = `w${trueDeg(src.w)} q${Math.max(...src.q.map(trueDeg))} N${N}`
        if (!seen.has(key)) {
          seen.add(key)
          console.log(`    ${key.padEnd(14)} rank ${rank} of ${4 * N}   δ = ${4 * N - 1 - rank}` +
            `   (3N+1 = ${3 * N + 1})`)
        }
        expect(rank, `${key}: rank is 3N + 1`).toBe(3 * N + 1)
        count++
      }
    }
    console.log(`    ${count} exact specimens, ${seen.size} distinct degree profiles, all rank 3N + 1`)
    expect(count, 'the sweep actually ran').toBeGreaterThan(20)
  }, 300_000)

  it('and the law is about the LIFTS, not the variety — soft members sit at 4N − 1', async () => {
    const { PRESETS } = await import('../../talks/ph-rational/poleLabPresets')
    for (const id of ['soft6', 'soft4']) {
      const st = PRESETS.find((p) => p.id === id)?.conformal
      if (!st) continue
      const n = st.C.length - 1
      const sv = singularValues(definingJacobian(st).map((r) => {
        const m = Math.hypot(...r); return m > 0 ? r.map((v) => v / m) : r
      }))
      const live = sv.filter((v) => v / sv[0] > 1e-12).length
      const defect = Math.max(...residual(st).map(Math.abs))
      console.log(`    ${id}: degree ${n}, residual ${defect.toExponential(0)},` +
        ` rank ${live} of ${4 * n} — generic is ${4 * n - 1}, this law would say ${3 * n + 1}`)
      expect(live, `${id} is at the generic rank, not 3N+1`).toBe(4 * n - 1)
    }
  })

  it('and δ counts the directions that are free at FIRST order and blocked at SECOND', () => {
    // The residual is QUADRATIC in the unknowns, so for v in ker J,
    //     F(x + v)  =  F(x) + J·v + ½D²F(v,v)  =  ½D²F(v,v)      exactly, no differencing.
    // A kernel direction is genuinely tangent when that second-order term can be absorbed — when
    // it lies in the image of J. What cannot be absorbed is an OBSTRUCTION: the direction looks
    // free to the linearisation and is blocked one order down. That is the cone tip stated as
    // arithmetic, and the count is exactly δ.
    const packQ = (m: ExactMember): Q[] => [...m.C.flat(), ...m.h]
    const unpackQ = (x: readonly Q[], n: number): ExactMember => ({
      C: Array.from({ length: n + 1 }, (_, k) => x.slice(5 * k, 5 * k + 5)),
      h: x.slice(5 * (n + 1)),
      degree: n,
    })
    for (const [roots, lambdas, n] of [
      [[q(2), q(3)], [q(1), q(1)], 2],
      [[q(-1), q(2), q(3)], [q(1), q(1), q(1)], 3],
    ] as [Q[], Q[], number][]) {
      const lifted = liftExact(exactMember(roots, lambdas, n, [1, 0, 0, 0]))
      const N = lifted.degree
      const J = definingJacobianQ(lifted)
      const rank = rankQ(J)
      const delta = 4 * N - 1 - rank
      const x0 = packQ(lifted)
      const ker = kernelQ(J)
      const Fof = (v: readonly Q[]): Q[] =>
        definingResidualQ(unpackQ(x0.map((c, i) => qAdd(c, v[i])), N))
      const image: Q[][] = Array.from({ length: x0.length }, (_, j) => J.map((row) => row[j]))
      const base = rankQ(image)
      const second: Q[][] = ker.map(Fof)
      for (let a = 0; a < ker.length; a++) {
        for (let b = a + 1; b < ker.length; b++) {
          const sum = Fof(ker[a].map((c, i) => qAdd(c, ker[b][i])))
          second.push(sum.map((c, i) => qSub(qSub(c, second[a][i]), second[b][i])))
        }
      }
      const obstructed = rankQ([...image, ...second]) - base
      console.log(`    degree ${N}: kernel of J is ${ker.length} directions,` +
        ` generic would be ${x0.length - (4 * N - 1)} — ${delta} too many`)
      console.log(`      second order restores rank ${base} → ${base + obstructed}` +
        ` = 4N − 1 = ${4 * N - 1};  OBSTRUCTED directions ${obstructed}, δ = ${delta}`)
      expect(obstructed, 'the obstruction dimension IS δ').toBe(delta)
      expect(base + obstructed, 'and second order restores exactly the generic rank').toBe(4 * N - 1)
      expect(ker.length - delta, 'so the true local dimension is the generic one').toBe(2 * N + 6)
    }
  }, 300_000)

  it('ONE doubled pole is free: δ = 2·max(0, m − 1)', () => {
    // m = the number of DOUBLED poles on ℙ¹. For a lift W = 2w² is a perfect square, so m = N/2
    // counting multiplicity and counting ∞ — which turns δ = N − 2 into
    //
    //     δ  =  2·max(0, m − 1)          two directions per doubled pole, one doubling FREE
    //
    // The m = 1 end is what matters for design: a member may keep ONE hard pole and still sit at a
    // smooth point. Exactly here (though the m = 1 specimen this construction reaches is a straight
    // line, the thinnest possible witness), and in floating point on mixedMin — degree 4, one
    // doubled hard pole, two simple soft ones — which reads the generic rank and converges
    // quadratically.
    const found = new Map<number, number>()
    for (const [roots, lambdas, n] of [
      [[q(2)], [q(0)], 1], [[q(2)], [q(1)], 1], [[q(2), q(3)], [q(1), q(1)], 2],
    ] as [Q[], Q[], number][]) {
      for (const pick of [[1, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [2, 1, 3, 1]]) {
        let src
        try { src = exactMember(roots, lambdas, n, pick) } catch { continue }
        if (!allZero(phDefectQ(src)) || src.q.every((c) => trueDeg(c) === 0)) continue
        const lifted = liftExact(src)
        if (!allZero(definingResidualQ(lifted)) || lifted.degree < 2) continue
        const N = lifted.degree
        found.set(N / 2, 4 * N - 1 - rankQ(definingJacobianQ(lifted)))
      }
    }
    for (const [m, delta] of [...found].sort((a, b) => a[0] - b[0])) {
      console.log(`    m = ${m} doubled pole${m === 1 ? '' : 's'}: δ = ${delta},` +
        ` 2·max(0, m−1) = ${2 * Math.max(0, m - 1)}`)
      expect(delta, `m = ${m}`).toBe(2 * Math.max(0, m - 1))
    }
    expect(found.has(1), 'the m = 1 case was reached').toBe(true)
  }, 300_000)
})
