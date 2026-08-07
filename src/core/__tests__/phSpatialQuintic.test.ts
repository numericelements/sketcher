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
  type SpatialHermiteData,
  type SpatialPHQuintic,
  arcLength,
  closureVector,
  controlPoints,
  curveAt,
  hodographAt,
  interpolateSpatialQuintic,
  planarity,
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
