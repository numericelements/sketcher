import { it } from 'vitest'
import { curvatureExtremaNumeratorComplex, assignSignsNeighbor, computeInactiveSetBySign } from '../index'

const n = 10, degree = 3
const knots: number[] = []
for (let i = 0; i < 4; i++) knots.push(0)
for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
for (let i = 0; i < 4; i++) knots.push(1)
type CP = { re: number; im: number; w_re: number; w_im: number }
const mk = (): CP[] => Array.from({ length: n }, (_, i) => ({
  re: 40 + 28 * i, im: 120 + 70 * Math.sin((Math.PI * i) / 5),
  w_re: 1 + 0.1 * Math.cos(i * 1.3), w_im: 0.06 * Math.sin(i * 2.1),
}))

// Eric's correction to the E26 write-up (2026-07-04): the mechanism frees the
// WHOLE maximal alternating sequence except the single largest-|g| anchor —
// not just "interiors" — so within-run pattern translations ARE legal under
// the row surrogate. What blocks is (a) RECRUITMENT: the pattern's leading
// edge needs a coefficient currently inside a same-sign block (always active,
// however small), and (b) an ANCHOR that must flip (the run's largest member
// can be globally tiny). Verified by this classification: the freed run
// member (#106) flips freely; the blockers are same-sign-block members and
// one small anchor. Per-tick re-reads advance the front ~one recruitment per
// tick — the row solver crawls rather than freezes.
it.skip('WHO BLOCKS: classify the rows that flip along the Farin pull (LAB RECORD — output-only; results in the header + notebook E26-CORRECTION; remove .skip to rerun)', () => {
  const cps = mk()
  const edge = 4
  const gO = (s: { re: number; im: number }) => {
    const w = cps.map((p, j) => j >= edge + 1
      ? { re: p.w_re * s.re - p.w_im * s.im, im: p.w_re * s.im + p.w_im * s.re }
      : { re: p.w_re, im: p.w_im })
    return curvatureExtremaNumeratorComplex(
      cps.map((p) => p.re), cps.map((p) => p.im), w.map((c) => c.re), w.map((c) => c.im), knots, degree).flatCoeffs()
  }
  const g0 = gO({ re: 1, im: 0 })
  const signs = assignSignsNeighbor(g0)
  const inactive = computeInactiveSetBySign(signs, g0.map(Math.abs))
  // s* direction (from the cage probe): walk a little along it, find early flippers
  const sStar = { re: -3.471, im: -0.369 }
  const flips = new Set<number>()
  for (const al of [0.02, 0.05, 0.1]) {
    const s = { re: 1 + al * (sStar.re - 1), im: al * sStar.im }
    const g = gO(s)
    g.forEach((v, i) => { if (Math.sign(v) !== Math.sign(g0[i]) && !flips.has(i)) flips.add(i) })
  }
  const classify = (i: number) => {
    if (inactive.has(i)) return 'FREED (run member, non-anchor)'
    const sl = i > 0 ? signs[i - 1] : 0
    const sr = i < signs.length - 1 ? signs[i + 1] : 0
    const alt = (sl !== 0 && sl !== signs[i]) || (sr !== 0 && sr !== signs[i])
    return alt ? 'ACTIVE ANCHOR (largest of its run)' : 'ACTIVE same-sign-block member'
  }
  for (const i of [...flips].sort((a, b) => a - b)) {
    console.log(`row #${i}: |g|/max ${(Math.abs(g0[i]) / Math.max(...g0.map(Math.abs))).toExponential(1)}  → ${classify(i)}`)
  }
}, 120000)
