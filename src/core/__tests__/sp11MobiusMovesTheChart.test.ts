// ============================================================================
// DOES A MÖBIUS IMAGE LAND IN THE SAME 𝒱? — no, and the reason reframes what we have.
//
// 𝒱 is defined RELATIVE TO A CHOICE OF POLES: the spinors satisfying N′(r_k) = 2N(r_k)Σ_k at a fixed
// r₁ … r_m. But a pole is where the curve meets INFINITY, and infinity is not conformally
// distinguished — a Möbius map sends it to an ordinary point and promotes some ordinary point in its
// place. So the pole data is gauge, and 𝒱 is inherently a gauge-dependent slice.
//
// MEASURED HERE, on the seed and one inversion:
//   · the seed satisfies the residue condition at its own poles {1.7, −0.9}
//   · the image does NOT satisfy it there
//   · the image DOES satisfy it at ITS own poles — the roots of ⟨p,p⟩, of which there are ten, all
//     COMPLEX, where the original had two, both REAL
//
// So the number of poles, their location, and even whether they are real all change. The image is a
// perfectly good rational PH curve; it simply lives in a different 𝒱.
//
// WHICH IS THE USEFUL WAY TO SAY IT: the FAMILY {𝒱_β} indexed by pole configurations is closed under
// Möbius, while no individual member is. What we have is an ATLAS whose charts are indexed by pole
// data, with the Möbius action supplying the transition maps between them. That is a better
// description than "one chart with a hole in it", and it is the same fact as the σ(r) = 0 story seen
// from the other side: everything indexed by poles is gauge-dependent.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { seedQuintic, toMember } from '../rationalPHMultiPoleSpatial'
import { pAdd, pSub, pMul, pDeriv, pMax, type Poly } from '../sp11RationalPH'

// --- complex arithmetic and roots --------------------------------------------
type C = { re: number; im: number }
const cMul = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
const cSub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
const cDiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
const cAbs = (a: C): number => Math.hypot(a.re, a.im)
const cEval = (p: Poly, z: C): C => p.reduceRight<C>((a, c) => cAdd(cMul(a, z), { re: c, im: 0 }), { re: 0, im: 0 })

function roots(poly: Poly): C[] {
  const a = poly.slice()
  const s = pMax(a) || 1
  while (a.length > 1 && Math.abs(a[a.length - 1]) < 1e-11 * s) a.pop()
  const n = a.length - 1
  const mon = a.map((c) => c / a[n])
  let z: C[] = Array.from({ length: n }, (_, k) =>
    ({ re: 0.4 * Math.cos(2.3 * k + 0.7), im: 0.4 * Math.sin(2.3 * k + 0.7) + 0.9 }))
  for (let it = 0; it < 4000; it++) {
    let move = 0
    z = z.map((zi, i) => {
      let den: C = { re: 1, im: 0 }
      z.forEach((zj, j) => { if (i !== j) den = cMul(den, cSub(zi, zj)) })
      if (cAbs(den) < 1e-300) return zi
      const step = cDiv(cEval(mon, zi), den)
      move = Math.max(move, cAbs(step))
      return cSub(zi, step)
    })
    if (move < 1e-14) break
  }
  return z
}

/** Worst relative |N′(r_k) − 2N(r_k)Σ_k| over a given pole set — the residue condition. */
function residueDefect(N: readonly Poly[], poles: readonly C[]): number {
  const Nd = N.map(pDeriv)
  let worst = 0
  poles.forEach((r, k) => {
    let S: C = { re: 0, im: 0 }
    poles.forEach((rl, l) => { if (l !== k) S = cAdd(S, cDiv({ re: 1, im: 0 }, cSub(r, rl))) })
    let num = 0, scale = 1e-30
    for (let c = 0; c < 3; c++) {
      const a = cEval(Nd[c], r), b = cEval(N[c], r)
      const e = cSub(a, cMul(b, { re: 2 * S.re, im: 2 * S.im }))
      num = Math.max(num, cAbs(e))
      scale = Math.max(scale, cAbs(a), cAbs(b) * 2 * cAbs(S))
    }
    worst = Math.max(worst, num / scale)
  })
  return worst
}
const wronskian = (p: readonly Poly[], w: Poly): Poly[] =>
  p.map((pi) => pSub(pMul(pDeriv(pi), w), pMul(pi, pDeriv(w))))

// --- the seed, translated off the origin so inversion is non-degenerate -------
const m0 = toMember(seedQuintic())
const W = m0.w as Poly
const P = (m0.p as Poly[]).map((pi, i) => {
  const a = [5, 3, -2][i]
  return Array.from({ length: Math.max(pi.length, W.length) }, (_, k) => (pi[k] ?? 0) + a * (W[k] ?? 0))
})
const OLD_POLES: C[] = [{ re: 1.7, im: 0 }, { re: -0.9, im: 0 }]

// one inversion, the ordinary way
const P2 = P.map((pi) => pMul(pi, W))
const W2 = P.reduce<Poly>((acc, pi) => pAdd(acc, pMul(pi, pi)), [0])

describe('a Mobius image does not stay in the same V', () => {
  it('the seed satisfies the residue condition at ITS poles', () => {
    expect(residueDefect(m0.N as Poly[], OLD_POLES)).toBeLessThan(1e-9)
    expect(roots(W).every((r) => Math.abs(r.im) < 1e-9)).toBe(true)   // two REAL poles
    expect(roots(W).length).toBe(2)
  })

  it('THE POLES MOVE: two real become ten complex', () => {
    const newPoles = roots(W2)
    expect(newPoles.length).toBe(10)                                  // was 2
    for (const r of newPoles) expect(Math.abs(r.im)).toBeGreaterThan(1e-6)  // and none is real
    // so W2 is positive on the whole line: the image is bounded
    for (let i = 0; i <= 400; i++) {
      const t = -20 + i / 10
      expect(W2.reduceRight((s, c) => s * t + c, 0)).toBeGreaterThan(0)
    }
  })

  it('and the image FAILS the condition at the OLD poles', () => {
    expect(residueDefect(wronskian(P2, W2), OLD_POLES)).toBeGreaterThan(1e-2)
  })

  it('but SATISFIES it at its own — it is a good PH curve in a DIFFERENT V', () => {
    expect(residueDefect(wronskian(P2, W2), roots(W2))).toBeLessThan(1e-6)
  })

  it('so the FAMILY is closed under Mobius while no member is', () => {
    // the same statement once more, as a pair: defect small at the right poles, large at the wrong
    const N2 = wronskian(P2, W2)
    const atOwn = residueDefect(N2, roots(W2))
    const atOld = residueDefect(N2, OLD_POLES)
    expect(atOwn).toBeLessThan(1e-6)
    expect(atOld / atOwn).toBeGreaterThan(1e3)      // many orders apart, not a tolerance question
  })
})
