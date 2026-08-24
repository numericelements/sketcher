// ============================================================================
// THE DIAL CROSSES THE PLANE — degree 3, hold {P₀,P₁,P₂}, and the mirror rule.
//
// Eric's expectation, proved and then measured (2026-08-24): three held points span a plane,
// reflection through it is an isometry fixing them, so the one-parameter family is mirror-
// symmetric — on the cascade chart the reflection is t ↦ −t, the fixed point t = 0 is the
// PLANAR cubic (the planar cascade count is 1), and P₃'s locus crosses the held plane exactly
// there, with mirror-image branches either side.
//
// The figure used to hide all of it: the dial was calibrated to the largest SYMMETRIC travel
// keeping every point in the ±2.1 box, from an opening curve framed to 2.05 for the TOUR grip's
// fibre — one direction exits immediately, the symmetric rule silenced the other, and the
// slider read ±0.014 against a crossing 0.895 away. Two fixes, both Eric's calls:
//
//     · each direction bisected on its own (asymmetric DialRange)
//     · reach-the-mirror: the cascade grip's dial must include −t₀ when that member is in-box —
//       travel only; nothing is drawn for the mirror and nothing reframes on grip change
// ============================================================================
import { describe, it, expect } from 'vitest'
import { cascadeGrip, reframe, seedFor } from '../SpatialSubsetFigure'
import { controlPoints } from '../../../core/phSpatialFreeDragN'
import { type Vec3, vcross, vdot, vnorm, vsub } from '../../../core/quaternion'

describe('the cascade dial reaches the plane crossing', () => {
  it('degree 3, {P0,P1,P2}: travel spans t0 → −t0, and P3 crosses the held plane at t = 0', () => {
    const m = 1
    const seed = seedFor(m)
    const got = reframe(m, cascadeGrip(m), seed)
    if (!got.chart) throw new Error('no chart')
    expect(got.kind).toBe('cascade')

    const t0 = got.t0[0]
    const { down, up } = got.ranges[0]
    // The planar member t = 0 is inside the travel WITH MARGIN — the slider passes THROUGH the
    // plane, not up to it. (The full mirror member −t0 is reached only when it is in the box; on
    // this seed it sits just outside — reflection does not respect the frame — which is honest.)
    const margin = 0.15 * Math.abs(t0)
    expect(0, 'the planar member is inside the travel').toBeGreaterThan(t0 - down)
    expect(0, 'the planar member is inside the travel').toBeLessThan(t0 + up)
    expect(Math.min(Math.abs(t0 + up), Math.abs(t0 - down)), 'with margin past the crossing')
      .toBeGreaterThanOrEqual(margin - 1e-9)

    const P = controlPoints(seed)
    const nrm = vcross(vsub(P[1], P[0]), vsub(P[2], P[0]))
    const nn = vnorm(nrm)
    const dist = (p: Vec3): number => vdot(vsub(p, P[0]), nrm) / nn
    const d = (t: number): number => dist(controlPoints(got.chart!.build([t]))[3])

    // P3 sits on opposite sides at the two ends of the travel, i.e. the slider CROSSES the plane…
    const dLo = d(t0 - down)
    const dHi = d(t0 + up)
    console.log(`    t0 = ${t0.toFixed(3)}, travel −${down.toFixed(3)}/+${up.toFixed(3)},` +
      ` P3 distance ${dLo.toFixed(3)} → ${dHi.toFixed(3)}, at t = 0: ${d(0).toExponential(1)}`)
    expect(Math.sign(dLo) * Math.sign(dHi), 'P3 changes sides across the travel').toBeLessThan(0)
    // …and the crossing is the planar member at exactly t = 0, mirror-symmetrically.
    expect(Math.abs(d(0)), 'the crossing is the planar cubic at t = 0').toBeLessThan(1e-9)
    expect(Math.abs(d(t0) + d(-t0)), 'the two sides are mirror images').toBeLessThan(1e-9)
  }, 300_000)
})
