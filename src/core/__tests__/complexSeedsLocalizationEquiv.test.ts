// The localized O(n) complex Dirac seeds (complexSupportSeeds, curvature.ts) must be
// BIT-IDENTICAL to the old O(n²) full-width builders, subset/gathered onto each control
// point's support. OPEN reference = the frozen pre-localization builder (real Dirac,
// contiguous subset); CLOSED reference = precomputeComplexPeriodicSeeds (still used by the
// dense path) gathered on its own spans. Covers ρ=1 AND ρ≠1 (the seam spiral), where the
// wrap span's imaginary part is nonzero. Cleanup changes the cost, never the numbers.
import { describe, it, expect } from 'vitest'
import { decomposeToBernstein } from '../bernstein'
import { ComplexBD } from '../complexBernstein'
import { complexSupportSeeds, precomputeComplexPeriodicSeeds } from '../curvature'
import type { Complex } from '../complex'

// old OPEN seed for one control point (real Dirac), subset to its contiguous support.
const openRef = (knots: number[], degree: number, n: number) => {
  const out: { spans: number[]; N: ComplexBD; N1: ComplexBD; N2: ComplexBD; N3: ComplexBD }[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Nre = decomposeToBernstein(e, knots, degree)
    let s0 = -1, s1 = -1
    for (let s = 0; s < Nre.numSpans; s++) {
      if (Nre.coeffs[s].some((c) => Math.abs(c) > 1e-14)) { if (s0 < 0) s0 = s; s1 = s }
    }
    const Ni = new ComplexBD(Nre, Nre.scale(0))
    const d1 = Ni.derivative(), d2 = d1.derivative(), d3 = d2.derivative()
    if (s0 < 0) { const z = new ComplexBD(decomposeToBernstein(e, knots, degree).subset(0, 0), Nre.subset(0, 0)); out.push({ spans: [], N: z, N1: z, N2: z, N3: z }); continue }
    s1 += 1
    const spans: number[] = []
    for (let s = s0; s < s1; s++) spans.push(s)
    out.push({ spans, N: Ni.subset(s0, s1), N1: d1.subset(s0, s1), N2: d2.subset(s0, s1), N3: d3.subset(s0, s1) })
  }
  return out
}

const sameC = (a: ComplexBD, b: ComplexBD, msg: string) => {
  const ar = a.re.flatCoeffs(), br = b.re.flatCoeffs(), ai = a.im.flatCoeffs(), bi = b.im.flatCoeffs()
  expect(ar.length, `${msg} re len`).toBe(br.length)
  expect(ai.length, `${msg} im len`).toBe(bi.length)
  for (let k = 0; k < ar.length; k++) expect(ar[k], `${msg} re[${k}]`).toBe(br[k])
  for (let k = 0; k < ai.length; k++) expect(ai[k], `${msg} im[${k}]`).toBe(bi[k])
}

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d + 1; i++) k.push(0)
  for (let i = 1; i < n - d; i++) k.push(i / (n - d))
  for (let i = 0; i < d + 1; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

describe('complex Dirac seed localization is byte-for-byte equal to the dense builders', () => {
  it('open (real seed), several n', () => {
    const d = 3
    for (const n of [8, 12, 20, 31]) {
      const knots = openKnots(n, d)
      const got = complexSupportSeeds(knots, d, n, false)
      const ref = openRef(knots, d, n)
      for (let i = 0; i < n; i++) {
        expect(got[i].spans, `n=${n} col ${i} spans`).toEqual(ref[i].spans)
        sameC(got[i].N, ref[i].N, `open n=${n} col ${i} N`)
        sameC(got[i].N1, ref[i].N1, `open n=${n} col ${i} N1`)
        sameC(got[i].N2, ref[i].N2, `open n=${n} col ${i} N2`)
        sameC(got[i].N3, ref[i].N3, `open n=${n} col ${i} N3`)
      }
    }
  })

  it('closed (ρ=1 and ρ≠1 seam spiral), several n', () => {
    const d = 3
    for (const rho of [{ re: 1, im: 0 }, { re: 0.9, im: 0.3 }] as Complex[]) {
      for (const n of [8, 12, 20]) {
        const knots = periodicKnots(n)
        const got = complexSupportSeeds(knots, d, n, true, rho)
        const ref = precomputeComplexPeriodicSeeds(knots, d, n, rho)
        for (let i = 0; i < n; i++) {
          expect(got[i].spans, `ρ=${rho.re}+${rho.im}i n=${n} col ${i} spans`).toEqual(ref.spans[i])
          sameC(got[i].N, ref.N[i].gather(ref.spans[i]), `closed ρ=${rho.re} n=${n} col ${i} N`)
          sameC(got[i].N1, ref.N1[i].gather(ref.spans[i]), `closed ρ=${rho.re} n=${n} col ${i} N1`)
          sameC(got[i].N2, ref.N2[i].gather(ref.spans[i]), `closed ρ=${rho.re} n=${n} col ${i} N2`)
          sameC(got[i].N3, ref.N3[i].gather(ref.spans[i]), `closed ρ=${rho.re} n=${n} col ${i} N3`)
        }
      }
    }
  })
})
