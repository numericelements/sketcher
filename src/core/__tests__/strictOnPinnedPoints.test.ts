// ============================================================================
// SLIDE 11's STRICT MODE — pin P₀, P₁, P₅, P₆ and ride what is left. The §9.6 gate, run before the
// figure was written, because "there are dimensions left" and "this handle moves" are different
// claims and degree 4 is the proof: there, pinning the four outer points leaves exactly ONE
// dimension and it is a pure weight direction — the middle point moves by 1e-6 of the norm by which
// every weight moves (conformalPHHopf.test.ts). Eric's strict gesture is IMPOSSIBLE at degree 4.
// This file measures that degree 6 has the room degree 4 does not.
//
// THE COUNT, and it decomposes cleanly:
//
//     family                                 18   (17 after the projective scale)
//     pin P₀,P₆        6 coords   nullity    12
//     pin P₀,P₁,P₅,P₆  12 coords  nullity     6   = 1 scale + 1 parameter gauge + 4 SHAPE
//     pin six points   18 coords  nullity     2   = scale + gauge, nothing left
//
// so free mode (ends held) has 11 and strict has 4 dials' worth. Adding readouts one at a time cuts
// the nullity by exactly one each: ρ₂, ρ₃, ρ₄, L — so the three radii are one SHORT and the total
// arc length is the fourth dial. That is the whole design of the slide's control strip.
//
// AND THE GAUGE IS LIVE HERE, which is the trap this slice carries and `dragStrict`'s does not.
// Pinning the Hermite data fixes λ, because d₀ = n(w₁/w₀)(P₁−P₀) scales by it. Pinning control
// POINTS does not: Cₖ ↦ λᵏCₖ moves no control point, so it satisfies the pins for free. Any dial
// offered here must therefore be gauge-INVARIANT. Radii and the TOTAL length are; the HALF-lengths
// are not, since reparametrisation moves the midpoint. `dragPinned` throws on a half-length rather
// than offering a slider that changes every weight and bead while the curve sits still — that dial
// is what got the degree-5 strict/free slide retired.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { sexticSeed } from '../conformalPHSeeds'
import {
  type ConformalPHCurve,
  arcLength, controlPoints, definingJacobian, dragControlPoint, dragPinned, farinParameters,
  pack, radii, residual, unknownCount, unpack,
} from '../conformalPHCurve'
import { rankOf } from '../rationalPHVariety'
import { vnorm, vsub } from '../quaternion'

const PIN = [0, 1, 5, 6]

/** Finite-difference rows for a vector readout of the packed unknowns. */
function rowsFor(s: ConformalPHCurve, f: (c: ConformalPHCurve) => number[]): number[][] {
  const x = pack(s)
  const out: number[][] = f(s).map(() => [])
  const eps = 1e-6
  for (let j = 0; j < x.length; j++) {
    const xp = x.slice(); xp[j] += eps
    const xm = x.slice(); xm[j] -= eps
    const fp = f(unpack(xp)), fm = f(unpack(xm))
    for (let i = 0; i < out.length; i++) out[i].push((fp[i] - fm[i]) / (2 * eps))
  }
  return out
}

const points = (idx: readonly number[]) => (c: ConformalPHCurve): number[] =>
  idx.flatMap((i) => { const P = controlPoints(c)[i]; return [P.x, P.y, P.z] })

describe("slide 11 strict: pin the outer two at each end", () => {
  const seed = sexticSeed()
  const U = unknownCount(6)
  const nullityWith = (extra: (c: ConformalPHCurve) => number[]): number =>
    U - rankOf([...definingJacobian(seed), ...rowsFor(seed, extra)])

  it('the family is 18, and the two pinned sets leave 12 and 6', () => {
    expect(U - rankOf(definingJacobian(seed)), 'the family').toBe(18)
    expect(nullityWith(points([0, 6])), 'free: ends held').toBe(12)
    expect(nullityWith(points(PIN)), 'strict: outer two at each end').toBe(6)
    expect(nullityWith(points([0, 1, 2, 4, 5, 6])), 'six points leaves only the two gauges').toBe(2)
  })

  it('THE THREE RADII ARE ONE SHORT — the total length is the fourth dial', () => {
    const rho = (k: number) => (c: ConformalPHCurve): number => radii(c)[k]
    const L = (c: ConformalPHCurve): number => arcLength(c, 8)
    const with_ = (...fs: ((c: ConformalPHCurve) => number)[]): number =>
      nullityWith((c) => [...points(PIN)(c), ...fs.map((f) => f(c))])
    expect(with_(), 'nothing prescribed').toBe(6)
    expect(with_(rho(2)), 'ρ₂').toBe(5)
    expect(with_(rho(2), rho(3)), 'ρ₂ ρ₃').toBe(4)
    expect(with_(rho(2), rho(3), rho(4)), 'ρ₂ ρ₃ ρ₄ — one shape still free').toBe(3)
    expect(with_(rho(2), rho(3), rho(4), L), 'and the total length spends it').toBe(2)
    // what is left is the projective scale and the parameter gauge; a Farin parameter cuts the gauge
    const withBead = nullityWith((c) => [
      ...points(PIN)(c), radii(c)[2], radii(c)[3], radii(c)[4], arcLength(c, 8), farinParameters(c)[3],
    ])
    expect(withBead, 'the bead parameter cuts the gauge, leaving the scale').toBe(1)
  })

  it('ALL FOUR HANDLES TRACK with the other three held — the gate degree 4 fails', () => {
    const P = controlPoints(seed)
    const chord = vnorm(vsub(P[6], P[0]))
    let worstTrack = 1, worstHeld = 0, worstDefect = 0
    for (const i of PIN) {
      for (const f of [0.05, 0.12]) {
        const target = { x: P[i].x + f * chord, y: P[i].y - 0.6 * f * chord, z: P[i].z + 0.4 * f * chord }
        const ask = vnorm(vsub(target, P[i]))
        const r = dragControlPoint(seed, i, target, { pin: PIN })
        expect(r.converged, `P${i} at ${f}`).toBe(true)
        const Q = controlPoints(r.state)
        worstTrack = Math.min(worstTrack, vnorm(vsub(Q[i], P[i])) / ask)
        worstHeld = Math.max(worstHeld, ...PIN.filter((k) => k !== i).map((k) => vnorm(vsub(Q[k], P[k]))))
        worstDefect = Math.max(worstDefect, r.defect)
      }
    }
    console.log(`    tracked ≥ ${(worstTrack * 100).toFixed(0)}%, others held ${worstHeld.toExponential(1)}, defect ${worstDefect.toExponential(1)}`)
    expect(worstTrack).toBeGreaterThan(0.999)
    expect(worstHeld).toBeLessThan(1e-9)
    expect(worstDefect).toBeLessThan(1e-11)

    // and the curve RESHAPES between the handles rather than sliding
    const r = dragControlPoint(seed, 1, { x: P[1].x + 0.12 * chord, y: P[1].y, z: P[1].z }, { pin: PIN })
    const Q = controlPoints(r.state)
    expect(vnorm(vsub(Q[3], P[3])), 'the interior absorbs').toBeGreaterThan(0.5 * 0.12 * chord)
  })

  it('each of the four DIALS reaches its value with the four points held', () => {
    const dials = [
      { label: 'ρ₂', c: { kind: 'radius' as const, index: 2 }, get: (s: ConformalPHCurve) => radii(s)[2] },
      { label: 'ρ₃', c: { kind: 'radius' as const, index: 3 }, get: (s: ConformalPHCurve) => radii(s)[3] },
      { label: 'ρ₄', c: { kind: 'radius' as const, index: 4 }, get: (s: ConformalPHCurve) => radii(s)[4] },
      { label: 'L', c: { kind: 'length' as const }, get: (s: ConformalPHCurve) => arcLength(s, 8) },
    ]
    const P = controlPoints(seed)
    for (const d of dials) {
      // a slider is a SEQUENCE of steps: dragPinned rate-limits each to 4%, as dragStrict does
      let cur = seed
      const want = d.get(seed) * 1.25
      for (let k = 0; k < 12; k++) {
        const r = dragPinned(cur, PIN, d.c, want)
        expect(r.converged, `${d.label} step ${k}`).toBe(true)
        cur = r.state
      }
      expect(d.get(cur), `${d.label} arrives`).toBeCloseTo(want, 6)
      const Q = controlPoints(cur)
      expect(Math.max(...PIN.map((i) => vnorm(vsub(Q[i], P[i])))), `${d.label} holds the four`).toBeLessThan(1e-9)
      expect(Math.max(...residual(cur).map(Math.abs)), `${d.label} stays a member`).toBeLessThan(1e-11)
    }
  })

  it('a HALF-length is refused rather than silently riding the live gauge', () => {
    expect(() => dragPinned(seed, PIN, { kind: 'length', from: 0, to: 0.5 }, 1)).toThrow(/gauge/)
    // the total length is fine, and that asymmetry is the point
    expect(() => dragPinned(seed, PIN, { kind: 'length' }, arcLength(seed, 8))).not.toThrow()
  })
})
