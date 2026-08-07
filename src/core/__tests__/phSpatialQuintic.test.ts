// ============================================================================
// The spatial PH quintic's two-parameter family — slide 7's mathematics.
//
// The gate on the whole construction is ARC LENGTH DEPENDS ON β ALONE. It is a
// sharp, non-obvious consequence of [FGMS08] that a wrong transcription would not
// accidentally satisfy, so it is checked before anything else.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import { type HermiteData, phQuinticHermite } from '../phQuinticHermite'
import {
  type SpatialPHCurve,
  controlPoints as generalControlPoints,
  dragSpatialFree,
} from '../phSpatialFreeDragN'
import {
  type GaugeRefs,
  type SpatialHermiteData,
  type SpatialPHQuintic,
  anglesOf,
  arcLength,
  closureVector,
  controlPoints,
  curveAt,
  gaugeRefsFor,
  hermiteDataOf,
  hodographAt,
  interpolateSpatialQuintic,
  planarity,
  planarMemberAngles,
  planeCrossingAngles,
  speedAt,
  speedCoefficients,
} from '../phSpatialQuintic'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const DATA: SpatialHermiteData = {
  pi: V(-1, -0.2, 0.1),
  pf: V(1, 0.3, -0.2),
  di: V(1.4, 1.1, 0.5),
  df: V(1.2, -0.9, 0.7),
}

/** Coplanar data (everything in z = 0) — the locus where planar members can exist. */
const FLAT: SpatialHermiteData = {
  pi: V(-1, -0.2, 0),
  pf: V(1, 0.3, 0),
  di: V(1.4, 1.1, 0),
  df: V(1.2, -0.9, 0),
}

const make = (a: number, b: number, data = DATA): SpatialPHQuintic => {
  const q = interpolateSpatialQuintic(data, a, b)
  expect(q, `(α,β) = (${a},${b})`).not.toBeNull()
  return q as SpatialPHQuintic
}

const GRID: [number, number][] = []
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 6; j++) GRID.push([(2 * Math.PI * i) / 6, (4 * Math.PI * j) / 6])
}

// ---------------------------------------------------------------------------
describe('it interpolates, everywhere on the torus', () => {
  it('matches the Hermite data for every (α, β)', () => {
    for (const [a, b] of GRID) {
      const q = make(a, b)
      const pts = controlPoints(q)
      expect(vd(pts[0], DATA.pi), `p(0) at ${a},${b}`).toBeLessThan(1e-12)
      expect(vd(pts[5], DATA.pf), `p(1) at ${a},${b}`).toBeLessThan(1e-12)
      expect(vd(hodographAt(q, 0), DATA.di), `r′(0) at ${a},${b}`).toBeLessThan(1e-12)
      expect(vd(hodographAt(q, 1), DATA.df), `r′(1) at ${a},${b}`).toBeLessThan(1e-12)
    }
  })

  it('the curve really passes through its end points (de Casteljau agrees)', () => {
    const q = make(0.7, 1.3)
    expect(vd(curveAt(q, 0), DATA.pi)).toBeLessThan(1e-12)
    expect(vd(curveAt(q, 1), DATA.pf)).toBeLessThan(1e-12)
  })

  it('IS a PH curve: |r′(t)| = |A(t)|², a polynomial', () => {
    for (const [a, b] of GRID) {
      const q = make(a, b)
      for (let k = 0; k <= 8; k++) {
        const t = k / 8
        expect(Math.abs(vnorm(hodographAt(q, t)) - speedAt(q, t))).toBeLessThan(1e-12)
      }
    }
  })

  it('the speed polynomial agrees with its Bernstein coefficients', () => {
    const q = make(1.1, -0.4)
    const s = speedCoefficients(q)
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, u = 1 - t
      const b = [u ** 4, 4 * u ** 3 * t, 6 * u ** 2 * t ** 2, 4 * u * t ** 3, t ** 4]
      const got = s.reduce((acc, c, j) => acc + c * b[j], 0)
      expect(Math.abs(got - speedAt(q, t))).toBeLessThan(1e-12)
    }
  })

  it('exact arc length agrees with quadrature', () => {
    for (const [a, b] of [[0.3, 0.9], [2.0, 3.4], [5.1, -2.2]] as const) {
      const q = make(a, b)
      const N = 20000
      let sum = 0
      for (let k = 0; k < N; k++) sum += speedAt(q, (k + 0.5) / N) / N
      expect(Math.abs(arcLength(q) - sum) / sum).toBeLessThan(1e-9)
    }
  })
})

// ---------------------------------------------------------------------------
describe('THE GATE — arc length depends on β alone', () => {
  it('α does not move it, at all', () => {
    for (const beta of [0, 0.8, 2.5, -1.7, 4.0]) {
      const reference = arcLength(make(0, beta))
      for (let k = 1; k < 12; k++) {
        const alpha = (2 * Math.PI * k) / 12
        const got = arcLength(make(alpha, beta))
        expect(Math.abs(got - reference) / reference, `β = ${beta}, α = ${alpha}`).toBeLessThan(1e-12)
      }
    }
  })

  it('β genuinely does move it — so the claim is not vacuous', () => {
    const lengths: number[] = []
    for (let k = 0; k < 240; k++) lengths.push(arcLength(make(0.4, (4 * Math.PI * k) / 240)))
    const lo = Math.min(...lengths), hi = Math.max(...lengths)
    // Measured on this data: L(β) swings a few percent. Small, but ~1e13 times the
    // 1e-12 floor at which α is pinned above — the asymmetry is the whole point.
    expect((hi - lo) / lo).toBeGreaterThan(0.02)
  })

  it('the mechanism: the closure vector d itself is α-free', () => {
    // exp(θi) commutes with i, so α cancels out of A₀ i A₂*. Everything above is
    // downstream of this one fact.
    for (const beta of [0.3, 2.2, -1.1]) {
      const reference = closureVector(DATA, 0, beta) as Vec3
      for (let k = 1; k < 8; k++) {
        const got = closureVector(DATA, (2 * Math.PI * k) / 8, beta) as Vec3
        expect(vd(got, reference) / (1 + vnorm(reference)), `β = ${beta}`).toBeLessThan(1e-12)
      }
    }
  })

  it('but α DOES change the curve — it is a shape parameter, not a gauge', () => {
    const a = controlPoints(make(0, 1.0))
    const b = controlPoints(make(1.4, 1.0))
    const moved = Math.max(...a.map((p, i) => vd(p, b[i])))
    expect(moved).toBeGreaterThan(0.05)
  })
})

// ---------------------------------------------------------------------------
describe('the parameter domain is a TORUS', () => {
  const same = (x: SpatialPHQuintic, y: SpatialPHQuintic, why: string): void => {
    const a = controlPoints(x), b = controlPoints(y)
    for (let i = 0; i < 6; i++) expect(vd(a[i], b[i]), `${why}, point ${i}`).toBeLessThan(1e-12)
  }

  it('α has period 2π', () => same(make(0.6, 1.2), make(0.6 + 2 * Math.PI, 1.2), 'α + 2π'))

  it('β has period 4π', () => same(make(0.6, 1.2), make(0.6, 1.2 + 4 * Math.PI), 'β + 4π'))

  it('and the diagonal (α+π, β+2π) is an identification too', () => {
    // φ₀ = α − β/2 is unchanged and φ₂ = α + β/2 shifts by 2π, so the underlying
    // (φ₀, φ₂) torus is covered twice by the (α, β) square.
    same(make(0.6, 1.2), make(0.6 + Math.PI, 1.2 + 2 * Math.PI), '(α+π, β+2π)')
  })

  it('α + π ALONE is a different curve — the −A gauge is not available here', () => {
    // A₀ and A₂ both negate, but A₁ = ¼B − ¾(A₀+A₂) does not, because φ₁ is pinned
    // to 0. So this is a genuinely different interpolant, not the same one relabelled.
    const a = controlPoints(make(0.6, 1.2))
    const b = controlPoints(make(0.6 + Math.PI, 1.2))
    expect(Math.max(...a.map((p, i) => vd(p, b[i])))).toBeGreaterThan(0.05)
  })
})

// ---------------------------------------------------------------------------
describe('what the family actually is (measured 2026-08-07)', () => {
  it('P₁ and P₄ DO NOT MOVE — the data pins them, only P₂ and P₃ sweep', () => {
    // P₁ = pᵢ + dᵢ/5 and P₄ = p_f − d_f/5: the end legs are the end tangents over 5,
    // and the tangents are given. So the two-parameter family lives entirely in the
    // two middle points. This is why the figure only needs to draw two surfaces.
    const ref = controlPoints(make(0, 0))
    let moved1 = 0, moved4 = 0, moved2 = 0, moved3 = 0
    for (const [a, b] of GRID) {
      const c = controlPoints(make(a, b))
      moved1 = Math.max(moved1, vd(c[1], ref[1]))
      moved2 = Math.max(moved2, vd(c[2], ref[2]))
      moved3 = Math.max(moved3, vd(c[3], ref[3]))
      moved4 = Math.max(moved4, vd(c[4], ref[4]))
    }
    expect(moved1).toBeLessThan(1e-12)
    expect(moved4).toBeLessThan(1e-12)
    expect(moved2).toBeGreaterThan(0.5)
    expect(moved3).toBeGreaterThan(0.5)
  })

  it('L(β) has exactly FOUR stationary points — the four helical interpolants', () => {
    // [FGMS08] prove four general helical PH quintic interpolants always exist, and
    // that they are the arc-length extrema. Reproduced here from our own code.
    const N = 4000
    const L: number[] = []
    for (let k = 0; k < N; k++) L.push(arcLength(make(0, (4 * Math.PI * k) / N)))
    let count = 0
    for (let k = 0; k < N; k++) {
      const prev = L[(k - 1 + N) % N], cur = L[k], next = L[(k + 1) % N]
      if ((cur - prev) * (next - cur) < 0) count++
    }
    expect(count).toBe(4)
  })
})

// ---------------------------------------------------------------------------
describe('THE FOUR PLANAR INTERPOLANTS SIT AT THE QUARTER-TURNS', () => {
  // The best thing slide 7 has to say: the classical planar quintic Hermite problem
  // — four solutions, slide 5 — is embedded in the spatial family at four exact
  // points of the torus. Not approximately; matched to 1e-14.
  //
  // WHY β ∈ {0, π}: a planar curve needs A(t) ∈ span{1,k} up to a global gauge. For
  // in-plane data nᵢ is pure and lies in span{i,j}, and nᵢ·exp(φi) enters span{1,k}
  // only when cos φ = 0. So φ₀, φ₂ ∈ {±π/2}, hence β = φ₂ − φ₀ ∈ {0, ±π}.

  const PLANAR: HermiteData = {
    p0: { re: FLAT.pi.x, im: FLAT.pi.y },
    d0: { re: FLAT.di.x, im: FLAT.di.y },
    p1: { re: FLAT.pf.x, im: FLAT.pf.y },
    d1: { re: FLAT.df.x, im: FLAT.df.y },
  }
  const QUARTER: [number, number][] = [
    [0, 0],
    [Math.PI, 0],
    [Math.PI / 2, Math.PI],
    [(3 * Math.PI) / 2, Math.PI],
  ]

  it('all four are exactly planar there', () => {
    for (const [a, b] of QUARTER) {
      expect(planarity(make(a, b, FLAT)), `(α,β) = (${a},${b})`).toBeLessThan(1e-7)
    }
  })

  it('each matches a branch of the planar solver, to 1e-14', () => {
    const planar = phQuinticHermite(PLANAR)
    expect(planar).toHaveLength(4)
    const spatial = QUARTER.map(([a, b]) => controlPoints(make(a, b, FLAT)))
    for (const sol of planar) {
      const want = sol.controlPoints.map((c) => V(c.re, c.im, 0))
      const best = Math.min(
        ...spatial.map((got) => Math.max(...got.map((p, k) => vd(p, want[k])))),
      )
      expect(best, `planar branch ${sol.branch}`).toBeLessThan(1e-14)
    }
  })

  it('and they pair up by arc length, exactly as β-dependence demands', () => {
    // Two branches at β = 0 share one length, two at β = π share another — computed
    // by a completely independent planar solver. A free check on the gate.
    const planar = phQuinticHermite(PLANAR).map((s) => s.arcLength).sort((x, y) => x - y)
    expect(Math.abs(planar[0] - planar[1])).toBeLessThan(1e-12)
    expect(Math.abs(planar[2] - planar[3])).toBeLessThan(1e-12)
    expect(Math.abs(planar[0] - planar[3])).toBeGreaterThan(1e-3)
    expect(Math.abs(arcLength(make(0.9, Math.PI, FLAT)) - planar[0])).toBeLessThan(1e-12)
    expect(Math.abs(arcLength(make(0.9, 0, FLAT)) - planar[3])).toBeLessThan(1e-12)
  })

  it('a generic β has NO planar member — so this is special, not typical', () => {
    let best = Infinity
    for (let i = 0; i <= 400; i++) best = Math.min(best, planarity(make((2 * Math.PI * i) / 400, 1.3, FLAT)))
    expect(best).toBeGreaterThan(1e-2)
  })
})

// ---------------------------------------------------------------------------
describe('the α-ellipses, and the mechanism behind the four points', () => {
  const NZ = V(0, 0, 1)

  it('every control point is EXACTLY one harmonic in α — hence an ellipse', () => {
    // The claim the figure rests on. Second and third harmonics must be machine zero;
    // if they were not, "the surface is a stack of ellipses" would be a lie.
    for (const beta of [0, 0.7, Math.PI, 2.3]) {
      const N = 256
      for (let j = 0; j < 6; j++) {
        const s: Vec3[] = []
        for (let k = 0; k < N; k++) s.push(controlPoints(make((2 * Math.PI * k) / N, beta))[j])
        for (const h of [2, 3, 4]) {
          let xr = 0, xi = 0, yr = 0, yi = 0, zr = 0, zi = 0
          for (let k = 0; k < N; k++) {
            const th = (2 * Math.PI * h * k) / N
            const co = Math.cos(th), si = Math.sin(th)
            xr += s[k].x * co; xi -= s[k].x * si
            yr += s[k].y * co; yi -= s[k].y * si
            zr += s[k].z * co; zi -= s[k].z * si
          }
          const amp = (2 / N) * Math.hypot(xr, xi, yr, yi, zr, zi)
          expect(amp, `P${j} harmonic ${h} at β=${beta}`).toBeLessThan(1e-12)
        }
      }
    }
  })

  it('the plane crossings really are in the plane', () => {
    for (const beta of [0, 0.9, Math.PI, 2.7]) {
      for (const index of [2, 3]) {
        for (const alpha of planeCrossingAngles(FLAT, beta, index, NZ, FLAT.pi)) {
          expect(Math.abs(controlPoints(make(alpha, beta, FLAT))[index].z)).toBeLessThan(1e-12)
        }
      }
    }
  })

  it('there are two of them, or none — never more', () => {
    for (let k = 0; k < 40; k++) {
      const beta = (4 * Math.PI * k) / 40
      for (const index of [2, 3]) {
        expect([0, 2]).toContain(planeCrossingAngles(FLAT, beta, index, NZ, FLAT.pi).length)
      }
    }
  })

  it('AT A GENERIC β THE TWO SETS DISAGREE — which is why the curve is not planar', () => {
    for (const beta of [0.6, 1.3, 2.4]) {
      const c2 = planeCrossingAngles(FLAT, beta, 2, NZ, FLAT.pi)
      const c3 = planeCrossingAngles(FLAT, beta, 3, NZ, FLAT.pi)
      expect(c2.length).toBe(2)
      expect(c3.length).toBe(2)
      const gap = Math.min(...c2.map((a) => Math.min(...c3.map((b) => Math.abs(a - b)))))
      expect(gap, `β = ${beta}`).toBeGreaterThan(1e-3)
    }
  })

  it('AT β = 0 AND β = π THEY COINCIDE — and that is exactly planarity', () => {
    for (const beta of [0, Math.PI]) {
      const c2 = planeCrossingAngles(FLAT, beta, 2, NZ, FLAT.pi).sort((x, y) => x - y)
      const c3 = planeCrossingAngles(FLAT, beta, 3, NZ, FLAT.pi).sort((x, y) => x - y)
      expect(c2).toHaveLength(2)
      expect(c3).toHaveLength(2)
      for (let i = 0; i < 2; i++) expect(Math.abs(c2[i] - c3[i]), `β = ${beta}`).toBeLessThan(1e-9)
    }
  })

  it('planarMemberAngles finds the four, and they are the quarter-turns', () => {
    const found = planarMemberAngles(FLAT)
    expect(found).toHaveLength(4)
    for (const [a, b] of found) expect(planarity(make(a, b, FLAT)), `(${a}, ${b})`).toBeLessThan(1e-7)
    const key = found.map(([a, b]) => `${(a / Math.PI).toFixed(3)},${(b / Math.PI).toFixed(3)}`).sort()
    expect(key).toEqual(['0.000,0.000', '0.500,1.000', '1.000,0.000', '1.500,1.000'])
  })

  it('and it refuses non-coplanar data rather than inventing members', () => {
    expect(planarMemberAngles(DATA)).toHaveLength(0)
  })

  it('the quarter-turn pattern is not an accident of one dataset', () => {
    const other: SpatialHermiteData = {
      pi: V(-0.8, 0.4, 0), pf: V(1.1, -0.5, 0), di: V(0.9, 1.6, 0), df: V(1.7, 0.6, 0),
    }
    const found = planarMemberAngles(other)
    expect(found).toHaveLength(4)
    for (const [a, b] of found) {
      const q = interpolateSpatialQuintic(other, a, b)
      expect(q).not.toBeNull()
      expect(planarity(q as SpatialPHQuintic)).toBeLessThan(1e-7)
    }
  })
})

// ---------------------------------------------------------------------------
describe('gauge transport — so a moving datum cannot make the curve jump', () => {
  /** Data whose start tangent sweeps a full turn, passing exactly through −x̂. */
  const sweeping = (theta: number): SpatialHermiteData => ({
    ...DATA,
    di: V(1.8 * Math.cos(theta), 1.8 * Math.sin(theta), 0),
  })

  it('WITHOUT transport the curve jumps as a tangent crosses −x̂', () => {
    // The failure this exists to prevent. quatFromSandwich builds its representative
    // from normalise(x̂ + δ̂); at δ̂ = −x̂ that vanishes and the fallback axis flips
    // sign, so a fixed (α,β) suddenly names a different curve.
    let worst = 0
    let prev = controlPoints(make(0.7, 1.3, sweeping(Math.PI - 0.05)))
    for (const th of [Math.PI - 0.02, Math.PI + 0.02, Math.PI + 0.05]) {
      const now = controlPoints(make(0.7, 1.3, sweeping(th)))
      worst = Math.max(worst, ...now.map((p, i) => vd(p, prev[i])))
      prev = now
    }
    expect(worst).toBeGreaterThan(0.5)
  })

  it('WITH transport it is continuous all the way round', () => {
    let refs = gaugeRefsFor(sweeping(0))
    expect(refs).not.toBeNull()
    let prev: Vec3[] | null = null
    let worst = 0
    const N = 400
    for (let k = 0; k <= N; k++) {
      const data = sweeping((2 * Math.PI * k) / N)
      refs = gaugeRefsFor(data, refs)
      expect(refs, `step ${k}`).not.toBeNull()
      const q = interpolateSpatialQuintic(data, 0.7, 1.3, refs)
      expect(q, `step ${k}`).not.toBeNull()
      const now = controlPoints(q as SpatialPHQuintic)
      if (prev) worst = Math.max(worst, ...now.map((p, i) => vd(p, prev![i])))
      prev = now
    }
    // Each step turns the tangent by 0.9°; nothing should move more than a hair.
    expect(worst).toBeLessThan(0.05)
  })

  it('transport still interpolates the data — it only relabels the angles', () => {
    let refs = gaugeRefsFor(sweeping(0))
    for (let k = 0; k <= 40; k++) {
      const data = sweeping((2 * Math.PI * k) / 40)
      refs = gaugeRefsFor(data, refs)
      const q = interpolateSpatialQuintic(data, 0.7, 1.3, refs) as SpatialPHQuintic
      const pts = controlPoints(q)
      expect(vd(pts[0], data.pi)).toBeLessThan(1e-12)
      expect(vd(pts[5], data.pf)).toBeLessThan(1e-12)
      expect(vd(hodographAt(q, 0), data.di)).toBeLessThan(1e-11)
      expect(vd(hodographAt(q, 1), data.df)).toBeLessThan(1e-12)
    }
  })

  it('and arc length is STILL β-only under transported references', () => {
    const refs = gaugeRefsFor(sweeping(2.0), gaugeRefsFor(sweeping(0)))
    const data = sweeping(2.0)
    const reference = arcLength(interpolateSpatialQuintic(data, 0, 1.1, refs) as SpatialPHQuintic)
    for (let k = 1; k < 8; k++) {
      const got = arcLength(
        interpolateSpatialQuintic(data, (2 * Math.PI * k) / 8, 1.1, refs) as SpatialPHQuintic,
      )
      expect(Math.abs(got - reference) / reference).toBeLessThan(1e-12)
    }
  })
})

// ---------------------------------------------------------------------------
describe('anglesOf — reading (α, β) back off a curve', () => {
  it('round-trips exactly', () => {
    const refs = gaugeRefsFor(DATA) as GaugeRefs
    for (const [a, b] of [[0.4, 1.1], [2.9, -0.7], [5.5, 3.3]] as const) {
      const q = interpolateSpatialQuintic(DATA, a, b, refs) as SpatialPHQuintic
      const got = anglesOf(q, refs)
      const back = interpolateSpatialQuintic(DATA, got.alpha, got.beta, refs) as SpatialPHQuintic
      const want = controlPoints(q), have = controlPoints(back)
      for (let i = 0; i < 6; i++) expect(vd(have[i], want[i]), `(${a},${b}) point ${i}`).toBeLessThan(1e-11)
    }
  })

  it('recovers a FREELY dragged curve — which carries an arbitrary global gauge', () => {
    // The free→strict handoff. A dragged curve has φ₁ ≠ 0, so anglesOf must subtract
    // it before forming α and β, or the rebuilt curve lands somewhere else.
    let state: SpatialPHCurve = (() => {
      const q = interpolateSpatialQuintic(DATA, 0.8, 1.6) as SpatialPHQuintic
      return { A: [q.A0, q.A1, q.A2], p0: q.p0 }
    })()
    for (let k = 0; k < 12; k++) {
      const c = generalControlPoints(state)
      state = dragSpatialFree(state, 2, V(c[2].x + 0.04, c[2].y + 0.03, c[2].z - 0.02)).state
    }
    const dragged: SpatialPHQuintic = { A0: state.A[0], A1: state.A[1], A2: state.A[2], p0: state.p0 }
    const data = hermiteDataOf(dragged)
    const refs = gaugeRefsFor(data) as GaugeRefs
    const got = anglesOf(dragged, refs)
    const rebuilt = interpolateSpatialQuintic(data, got.alpha, got.beta, refs) as SpatialPHQuintic
    const want = controlPoints(dragged), have = controlPoints(rebuilt)
    for (let i = 0; i < 6; i++) expect(vd(have[i], want[i]), `point ${i}`).toBeLessThan(1e-9)
  })
})

// ---------------------------------------------------------------------------
describe('planarity', () => {
  it('is zero for a curve built from coplanar data at β = 0', () => {
    // Not a claim that all flat data gives planar curves — just that the measure
    // reads zero when the legs really do span a plane.
    //
    // The floor is √eps ≈ 1.5e-8, not eps: planarity is a SINGULAR-value ratio read
    // off the GRAM matrix, and forming Gᵀ G squares the condition number, so a
    // machine-zero direction surfaces as √eps. Measured 1.2e-8 here. This is the one
    // permitted kind of threshold — machine zero versus nonzero — and generic data
    // reads ~1e-1 below, thirteen thousand times larger.
    const q = make(0, 0, FLAT)
    expect(planarity(q)).toBeLessThan(1e-7)
  })

  it('is scale-free and positive for generic spatial data', () => {
    const q = make(0.5, 1.1)
    const p = planarity(q)
    expect(p).toBeGreaterThan(1e-3)
    const big: SpatialHermiteData = {
      pi: { x: DATA.pi.x * 10, y: DATA.pi.y * 10, z: DATA.pi.z * 10 },
      pf: { x: DATA.pf.x * 10, y: DATA.pf.y * 10, z: DATA.pf.z * 10 },
      di: { x: DATA.di.x * 10, y: DATA.di.y * 10, z: DATA.di.z * 10 },
      df: { x: DATA.df.x * 10, y: DATA.df.y * 10, z: DATA.df.z * 10 },
    }
    expect(Math.abs(planarity(make(0.5, 1.1, big)) - p)).toBeLessThan(1e-9)
  })
})
