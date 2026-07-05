// The localized O(n) seed precompute (precomputeOpen/PeriodicSeeds, gradient.ts) must be
// BIT-IDENTICAL to the old O(n²) full-decompose-per-control-point version. That old body is
// frozen here as the oracle; the new exported functions are compared column-for-column
// (support spans + every derivative-seed coefficient). A cleanup may change the cost, never
// the numbers (CLAUDE.md). Includes non-uniform + repeated interior knots, the cases where
// span↔control-point support is least obvious.
import { describe, it, expect } from 'vitest'
import { BernsteinDecomposition, decomposeToBernstein, decomposeToBernsteinPeriodic } from '../bernstein'
import { precomputeOpenSeeds, precomputePeriodicSeeds } from '../gradient'

// ---- frozen dense reference (the pre-localization implementations) ----
function openSeedsDense(knots: readonly number[], degree: number, n: number) {
  const probe = decomposeToBernstein(new Array<number>(n).fill(0), knots, degree)
  const numSpans = probe.numSpans
  const cols: { s0: number; s1: number; n1: BernsteinDecomposition; n2: BernsteinDecomposition; n3: BernsteinDecomposition }[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Ni = decomposeToBernstein(e, knots, degree)
    let s0 = -1, s1 = -1
    for (let s = 0; s < Ni.numSpans; s++) {
      if (Ni.coeffs[s].some((c) => Math.abs(c) > 1e-14)) { if (s0 < 0) s0 = s; s1 = s }
    }
    if (s0 < 0) { const empty = new BernsteinDecomposition([], []); cols.push({ s0: -1, s1: -1, n1: empty, n2: empty, n3: empty }); continue }
    s1 += 1
    const d1 = Ni.derivative(), d2 = d1.derivative()
    cols.push({ s0, s1, n1: d1.subset(s0, s1), n2: d2.subset(s0, s1), n3: d2.derivative().subset(s0, s1) })
  }
  return { numSpans, cols }
}
function periodicSeedsDense(knots: readonly number[], degree: number, n: number) {
  const probe = decomposeToBernsteinPeriodic(new Array<number>(n).fill(0), knots, degree)
  const numSpans = probe.numSpans
  const spans: number[][] = [], n1: BernsteinDecomposition[] = [], n2: BernsteinDecomposition[] = [], n3: BernsteinDecomposition[] = []
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0)
    e[i] = 1
    const Ni = decomposeToBernsteinPeriodic(e, knots, degree)
    const sp: number[] = []
    for (let s = 0; s < numSpans; s++) if (Ni.coeffs[s].some((c) => Math.abs(c) > 1e-14)) sp.push(s)
    const d1 = Ni.derivative(), d2 = d1.derivative()
    spans.push(sp); n1.push(d1.gather(sp)); n2.push(d2.gather(sp)); n3.push(d2.derivative().gather(sp))
  }
  return { numSpans, spans, n1, n2, n3 }
}

const sameCoeffs = (a: BernsteinDecomposition, b: BernsteinDecomposition, msg: string) => {
  const ca = a.flatCoeffs(), cb = b.flatCoeffs()
  expect(ca.length, `${msg} length`).toBe(cb.length)
  for (let i = 0; i < ca.length; i++) expect(ca[i], `${msg} [${i}]`).toBe(cb[i])
}

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d + 1; i++) k.push(0)
  for (let i = 1; i < n - d; i++) k.push(i / (n - d))
  for (let i = 0; i < d + 1; i++) k.push(1)
  return k
}
// clamped open knots with a REPEATED interior knot (multiplicity 2) — shrinks one CP's support.
const openKnotsRepeated = (d: number) => {
  // n = 8, degree d: clamp + interior [0.3, 0.3, 0.6]
  const k = [0, 0, 0, 0, 0.3, 0.3, 0.6, 1, 1, 1, 1]
  return k // n = k.length - d - 1 = 11 - 3 - 1 = 7
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)
const nonUniformPeriodic = (n: number) =>
  Array.from({ length: n }, (_, i) => (i + 0.35 * Math.sin(i)) / n).map((v) => Math.max(0, Math.min(0.999, v))).sort((a, b) => a - b)

describe('seed localization is byte-for-byte equal to the dense reference', () => {
  it('open: uniform knots, several n', () => {
    for (const n of [8, 12, 20, 33]) {
      const d = 3, knots = openKnots(n, d)
      const got = precomputeOpenSeeds(knots, d, n), ref = openSeedsDense(knots, d, n)
      expect(got.numSpans).toBe(ref.numSpans)
      expect(got.cols.length).toBe(ref.cols.length)
      for (let i = 0; i < n; i++) {
        expect(got.cols[i].s0, `n=${n} col ${i} s0`).toBe(ref.cols[i].s0)
        expect(got.cols[i].s1, `n=${n} col ${i} s1`).toBe(ref.cols[i].s1)
        sameCoeffs(got.cols[i].n1, ref.cols[i].n1, `open n=${n} col ${i} n1`)
        sameCoeffs(got.cols[i].n2, ref.cols[i].n2, `open n=${n} col ${i} n2`)
        sameCoeffs(got.cols[i].n3, ref.cols[i].n3, `open n=${n} col ${i} n3`)
      }
    }
  })

  it('open: repeated interior knot (multiplicity 2)', () => {
    const d = 3, knots = openKnotsRepeated(d), n = knots.length - d - 1
    const got = precomputeOpenSeeds(knots, d, n), ref = openSeedsDense(knots, d, n)
    expect(got.numSpans).toBe(ref.numSpans)
    for (let i = 0; i < n; i++) {
      expect(got.cols[i].s0, `col ${i} s0`).toBe(ref.cols[i].s0)
      expect(got.cols[i].s1, `col ${i} s1`).toBe(ref.cols[i].s1)
      sameCoeffs(got.cols[i].n1, ref.cols[i].n1, `rep col ${i} n1`)
      sameCoeffs(got.cols[i].n2, ref.cols[i].n2, `rep col ${i} n2`)
      sameCoeffs(got.cols[i].n3, ref.cols[i].n3, `rep col ${i} n3`)
    }
  })

  it('periodic: uniform + non-uniform knots, several n', () => {
    const d = 3
    for (const n of [8, 12, 20]) {
      for (const knots of [periodicKnots(n), nonUniformPeriodic(n)]) {
        const got = precomputePeriodicSeeds(knots, d, n), ref = periodicSeedsDense(knots, d, n)
        expect(got.numSpans).toBe(ref.numSpans)
        for (let i = 0; i < n; i++) {
          expect(got.spans[i], `n=${n} col ${i} spans`).toEqual(ref.spans[i])
          sameCoeffs(got.n1[i], ref.n1[i], `per n=${n} col ${i} n1`)
          sameCoeffs(got.n2[i], ref.n2[i], `per n=${n} col ${i} n2`)
          sameCoeffs(got.n3[i], ref.n3[i], `per n=${n} col ${i} n3`)
        }
      }
    }
  })
})
