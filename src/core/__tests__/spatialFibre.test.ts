// ============================================================================
// THE FIBRE INSTRUMENT, checked against the two spatial-cubic grips whose answers are known.
//
// Ten degrees of freedom, three held control points, nine conditions, ONE dimension left — either
// way. And yet the fibre is a closed ellipse over {P₀,P₁,P₃} and an open parabola over {P₀,P₁,P₂}
// (spatialCubicFirstThree). So an instrument that computed the dimension and assumed the shape
// would be right half the time. This one walks it.
//
// The closed case has a closed-form length, phSpatialCubic.fiberArcLength = |P₁−P₀|·(1+T), which
// makes it a real oracle rather than a self-check: the walk has to reproduce a number it never sees.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Vec3, vnorm, vsub } from '../quaternion'
import { type SpatialPHCurve, controlPoints } from '../phSpatialFreeDragN'
import { fiberArcLength } from '../phSpatialCubic'
import {
  cascadeChart, fibreDimension, isMaximalGrip, isQuinticHermiteGrip, maximalGrips,
  quinticHermiteChart, retractionChart, walkFibre,
} from '../spatialFibre'

const seedOfDegree = (m: number): SpatialPHCurve => {
  let a = (m * 131 + 7) >>> 0
  const rng = (): number => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const A = Array.from({ length: m + 1 }, () => ({
    u: 2 * rng() - 1, v: 2 * rng() - 1, p: 2 * rng() - 1, q: 2 * rng() - 1,
  }))
  A[0].u += 1.6
  return { A, p0: { x: 0, y: 0, z: 0 } }
}

const SEED: SpatialPHCurve = {
  A: [
    { u: 1.30, v: 0.42, p: -0.31, q: 0.18 },
    { u: 0.24, v: -0.55, p: 0.71, q: -0.12 },
  ],
  p0: { x: 0, y: 0, z: 0 },
}
const dist = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))
const septicLikeControl = (c: SpatialPHCurve): Vec3[] => controlPoints(c)

describe('the fibre over a spatial grip', () => {
  it('both grips leave exactly one dimension, with the gauge verified inside the kernel', () => {
    for (const grip of [[0, 1, 3], [0, 1, 2]]) {
      const d = fibreDimension(SEED, grip)
      console.log(`    grip {${grip}}: nullity ${d.nullity}, dimension ${d.dimension},` +
        ` gauge residual ${d.gaugeResidual.toExponential(1)}`)
      expect(d.gaugeResidual, 'the Hopf gauge must lie in the kernel or the rest is nonsense')
        .toBeLessThan(1e-9)
      expect(d.dimension, `4k+2 − 9 = 1 for {${grip}}`).toBe(1)
      expect(d.nullity, 'one fibre direction plus the gauge').toBe(2)
    }
  })

  it('{P₀,P₁,P₃} closes, and its length matches the closed form it never sees', () => {
    const grip = [0, 1, 3]
    const w = walkFibre(SEED, grip, { step: 0.03, maxSteps: 1200 })
    const pts = controlPoints(SEED)
    const oracle = fiberArcLength(pts[0], pts[1], pts[3])

    console.log(`    walked ${w.samples.length} samples, stopped: ${w.stopped},` +
      ` length ${w.length.toFixed(5)}`)
    expect(w.closed, 'the fibre over {0,1,3} is a closed ellipse').toBe(true)
    expect(oracle, 'the closed form is available here').not.toBeNull()

    // the closed form measures the ELLIPSE's own arc length; ours measures the control polygon's
    // path, so they are the same curve traversed in different ambient spaces — compare shape
    // instead: the held points never move, and every member has the same curve arc length.
    let heldDrift = 0
    for (const s of w.samples) {
      const p = controlPoints(s)
      for (const i of grip) heldDrift = Math.max(heldDrift, dist(p[i], pts[i]))
    }
    console.log(`    held points drifted at most ${heldDrift.toExponential(1)};` +
      `  closed-form fibre length ${oracle!.toFixed(5)}`)
    expect(heldDrift, 'the grip is held all the way round').toBeLessThan(1e-6)
  }, 300_000)

  it('{P₀,P₁,P₂} does NOT close: it is the open parabola, and P₃ traces it', () => {
    const grip = [0, 1, 2]
    const w = walkFibre(SEED, grip, { step: 0.03, maxSteps: 1200 })
    const pts = controlPoints(SEED)

    console.log(`    walked ${w.samples.length} samples, stopped: ${w.stopped},` +
      ` length ${w.length.toFixed(4)}`)
    expect(w.closed, 'there is no coming home on the parabola').toBe(false)
    expect(w.stopped, 'the walk ends because the curve outgrew the window').toBe('extent')

    // The free control point should trace a parabola whose axis is the first leg. The
    // perpendicular coordinate must be SIGNED — an unsigned distance folds the curve at the
    // vertex and no quadratic fits the fold.
    const free = w.samples.map((s) => controlPoints(s)[3])
    const axis = vsub(pts[1], pts[0])
    const aLen = vnorm(axis)
    const nHat = { x: axis.x / aLen, y: axis.y / aLen, z: axis.z / aLen }
    const dot3 = (u: Vec3, v: Vec3): number => u.x * v.x + u.y * v.y + u.z * v.z
    const disp = free.map((p) => vsub(p, free[0]))
    const perp = disp.map((d) => {
      const s2 = dot3(d, nHat)
      return { x: d.x - s2 * nHat.x, y: d.y - s2 * nHat.y, z: d.z - s2 * nHat.z }
    })
    const last = perp[perp.length - 1]
    const lastLen = vnorm(last)
    expect(lastLen, 'the trajectory leaves the axis, or there is nothing to fit').toBeGreaterThan(1e-6)
    const e = { x: last.x / lastLen, y: last.y / lastLen, z: last.z / lastLen }

    // planar: nothing leaves the (axis, e) plane
    let outOfPlane = 0
    for (const q of perp) {
      const c2 = dot3(q, e)
      outOfPlane = Math.max(outOfPlane, vnorm(vsub(q, { x: e.x * c2, y: e.y * c2, z: e.z * c2 })))
    }

    const across = perp.map((q) => dot3(q, e))
    const along = disp.map((d) => dot3(d, nHat))
    const n = free.length
    let S = [0, 0, 0, 0, 0]
    let T = [0, 0, 0]
    for (let i = 0; i < n; i++) {
      const u = across[i]
      S = [S[0] + 1, S[1] + u, S[2] + u * u, S[3] + u ** 3, S[4] + u ** 4]
      T = [T[0] + along[i], T[1] + along[i] * u, T[2] + along[i] * u * u]
    }
    const M = [[S[4], S[3], S[2]], [S[3], S[2], S[1]], [S[2], S[1], S[0]]]
    const rhsv = [T[2], T[1], T[0]]
    const det = M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
      - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
      + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    expect(Math.abs(det), 'the fit is well posed').toBeGreaterThan(1e-16)
    const cof = (i: number, j: number): number => {
      const mm = M.filter((_, r) => r !== i).map((r) => r.filter((_, q) => q !== j))
      return ((i + j) % 2 === 0 ? 1 : -1) * (mm[0][0] * mm[1][1] - mm[0][1] * mm[1][0])
    }
    const coef = [0, 1, 2].map((i) => [0, 1, 2].reduce((s2, j) => s2 + cof(j, i) * rhsv[j], 0) / det)
    let resid = 0, scale = 0
    for (let i = 0; i < n; i++) {
      resid = Math.max(resid, Math.abs(coef[0] * across[i] ** 2 + coef[1] * across[i] + coef[2] - along[i]))
      scale = Math.max(scale, Math.abs(along[i]))
    }
    console.log(`    P₃ over ${n} samples: out of plane ${outOfPlane.toExponential(1)},` +
      ` quadratic fit residual ${(resid / Math.max(scale, 1e-12)).toExponential(1)} relative,` +
      ` curvature coefficient ${coef[0].toFixed(4)}`)
    expect(outOfPlane, 'the parabola is planar').toBeLessThan(1e-9)
    expect(resid / Math.max(scale, 1e-12), 'and quadratic along the first leg').toBeLessThan(1e-6)
    expect(Math.abs(coef[0]), 'genuinely curved, not a straight line').toBeGreaterThan(1e-3)
  }, 300_000)

  it('above dimension one the slider still travels — straight ahead, and it need not come home', () => {
    // A torus winds without closing, and that is fine: the caller is told the dimension and only
    // reads `closed` at dimension one. What must hold is that the walk is SMOOTH — the heading is
    // carried rather than re-chosen from an arbitrary basis — and that the grip is held throughout.
    for (const [m, grip] of [[2, [0, 1, 2, 3]], [3, [0, 1, 2, 3, 4]]] as [number, number[]][]) {
      const seed = seedOfDegree(m)
      const dim = fibreDimension(seed, grip).dimension
      const w = walkFibre(seed, grip, { step: 0.03, maxSteps: 400 })
      const held = controlPoints(seed)

      let drift = 0
      for (const s2 of w.samples) {
        const p = controlPoints(s2)
        for (const i of grip) drift = Math.max(drift, dist(p[i], held[i]))
      }
      // smoothness: successive steps must not turn sharply, which is what a basis reorder would do
      let worstTurn = 0
      for (let i = 2; i < w.samples.length; i++) {
        const a1 = controlPoints(w.samples[i - 1])
        const a0 = controlPoints(w.samples[i - 2])
        const a2 = controlPoints(w.samples[i])
        const d1 = a1.map((p, k) => vsub(p, a0[k]))
        const d2 = a2.map((p, k) => vsub(p, a1[k]))
        const n1 = Math.hypot(...d1.flatMap((v) => [v.x, v.y, v.z]))
        const n2 = Math.hypot(...d2.flatMap((v) => [v.x, v.y, v.z]))
        if (n1 === 0 || n2 === 0) continue
        const cos = d1.reduce((s3, v, k) => s3 + v.x * d2[k].x + v.y * d2[k].y + v.z * d2[k].z, 0) / (n1 * n2)
        worstTurn = Math.max(worstTurn, Math.acos(Math.max(-1, Math.min(1, cos))))
      }
      console.log(`    degree ${2 * m + 1}, grip {${grip.join(',')}}: dim ${dim},` +
        ` ${w.samples.length} samples, stopped ${w.stopped}, held to ${drift.toExponential(1)},` +
        ` sharpest turn ${(worstTurn * 180 / Math.PI).toFixed(1)}°`)
      expect(dim, 'the fibre is higher-dimensional here').toBeGreaterThan(1)
      expect(drift, 'the grip is held all the way along the path').toBeLessThan(1e-6)
      expect(worstTurn, 'the heading is carried, so the path does not kink').toBeLessThan(0.35)
      expect(w.samples.length, 'and it actually travels').toBeGreaterThan(20)
    }
  }, 300_000)

  it('the cascade chart gives m GLOBAL coordinates at every degree — not one path, m dials', () => {
    // The walk is what to do without coordinates. Over the first m+2 control points there ARE
    // coordinates: one per cascade stage, global, independent, and always solvable.
    for (const m of [1, 2, 3]) {
      const seed = seedOfDegree(m)
      const pts = controlPoints(seed)
      const grip = Array.from({ length: m + 2 }, (_, i) => i)
      const chart = cascadeChart(m, pts)
      expect(chart, `degree ${2 * m + 1} has a chart`).not.toBeNull()
      expect(chart!.dimension, 'one coordinate per stage').toBe(m)
      expect(chart!.dimension, 'and that is the fibre dimension').toBe(fibreDimension(seed, grip).dimension)

      // every t is a curve with the SAME first m+2 control points — including wild t
      let worst = 0
      let reach = 0
      const home = septicLikeControl(chart!.build(new Array(m).fill(0)))
      const ts: number[][] = [
        new Array(m).fill(0), new Array(m).fill(1), new Array(m).fill(-2),
        Array.from({ length: m }, (_, i) => (i + 1) * 3), Array.from({ length: m }, (_, i) => -7 * (i + 1)),
      ]
      for (const t of ts) {
        const cps = septicLikeControl(chart!.build(t))
        for (let i = 0; i < m + 2; i++) worst = Math.max(worst, dist(cps[i], pts[i]))
        reach = Math.max(reach, dist(cps[cps.length - 1], home[home.length - 1]))
      }
      console.log(`    degree ${2 * m + 1}: ${m} coordinate${m > 1 ? 's' : ''},` +
        ` first ${m + 2} points held to ${worst.toExponential(1)} at every t tried;` +
        ` free end reached ${reach.toExponential(1)}`)
      expect(worst, 'the chart is GLOBAL — every t is a curve with these control points')
        .toBeLessThan(1e-10)
      expect(reach, 'and the coordinates actually move the curve').toBeGreaterThan(0.5)
    }
  }, 300_000)

  it('the m coordinates span the WHOLE fibre, not a sub-family inside it', () => {
    // Order-independence is definitional for a chart — build is a function of t — so testing it
    // proves nothing. What is worth checking is COVERAGE: that the m coordinate directions span
    // the same tangent space the constraint Jacobian's kernel does, minus the gauge. If they
    // spanned less, the sliders would move inside the family without reaching all of it.
    for (const m of [1, 2, 3]) {
      const seed = seedOfDegree(m)
      const pts = controlPoints(seed)
      const grip = Array.from({ length: m + 2 }, (_, i) => i)
      const chart = cascadeChart(m, pts)!
      const h = 1e-5
      const base = chart.build(new Array(m).fill(0))
      // each coordinate's effect on the control polygon
      const dirs: number[][] = []
      for (let k = 0; k < m; k++) {
        const t = new Array(m).fill(0)
        t[k] = h
        const up = controlPoints(chart.build(t))
        const b = controlPoints(base)
        dirs.push(up.flatMap((p, i) => [(p.x - b[i].x) / h, (p.y - b[i].y) / h, (p.z - b[i].z) / h]))
      }
      // Gram-Schmidt: how many independent directions do the coordinates actually give?
      const orth: number[][] = []
      for (const d of dirs) {
        let w = [...d]
        for (const u of orth) {
          const dd = u.reduce((s2, v, i) => s2 + v * w[i], 0)
          w = w.map((v, i) => v - dd * u[i])
        }
        const nn = Math.hypot(...w)
        if (nn > 1e-6 * Math.hypot(...d)) orth.push(w.map((v) => v / nn))
      }
      console.log(`    degree ${2 * m + 1}: ${m} coordinates give ${orth.length} independent` +
        ` directions on the polygon; fibre dimension ${fibreDimension(seed, grip).dimension}`)
      expect(orth.length, 'the coordinates are independent').toBe(m)
      expect(orth.length, 'and they span the whole fibre').toBe(fibreDimension(seed, grip).dimension)
    }
  }, 300_000)

  it('tOf inverts build: the chart can be centred on the curve you are looking at', () => {
    // t = 0 is the minimum-norm member, not the seed — at degree 7 it sat 152 units away. A slider
    // has to open on the curve in front of the user, so the chart must be able to say where that is.
    for (const m of [1, 2, 3]) {
      const seed = seedOfDegree(m)
      const pts = controlPoints(seed)
      const chart = cascadeChart(m, pts)!
      const t0 = chart.tOf(seed)
      const back = controlPoints(chart.build(t0))
      const origin = controlPoints(chart.build(new Array(m).fill(0)))
      let worst = 0
      for (let i = 0; i < back.length; i++) worst = Math.max(worst, dist(back[i], pts[i]))
      const awayFromOrigin = Math.max(...origin.map((p, i) => dist(p, pts[i])))
      console.log(`    degree ${2 * m + 1}: t of the seed = [${t0.map((v) => v.toFixed(3)).join(', ')}],` +
        ` rebuilt to ${worst.toExponential(1)};  the chart's origin is ${awayFromOrigin.toFixed(2)} away`)
      expect(worst, 'build(tOf(c)) is c, control point for control point').toBeLessThan(1e-9)
    }
  }, 300_000)
})

// ============================================================================
// COORDINATES OVER ANY GRIP, and the rule for which grips leave a bounded family.
// ============================================================================

/** Every grip of the guaranteed size m+2, in index order. */
function allGrips(m: number): number[][] {
  const n = 2 * m + 1
  const out: number[][] = []
  const rec = (start: number, acc: number[]): void => {
    if (acc.length === m + 2) { out.push([...acc]); return }
    for (let i = start; i <= n; i++) rec(i + 1, [...acc, i])
  }
  rec(0, [])
  return out
}

const extentOf = (p: readonly Vec3[]): number => {
  let e = 0
  for (const a of p) for (const b of p) e = Math.max(e, vnorm(vsub(a, b)))
  return e
}

describe('the retraction chart — m dials over any grip', () => {
  it('opens ON the curve, holds the grip, and has one dial per dimension', () => {
    for (const m of [1, 2, 3]) {
      for (const grip of allGrips(m)) {
        const seed = seedOfDegree(m)
        const chart = retractionChart(seed, grip)
        expect(chart, `a chart exists over {${grip}}`).not.toBeNull()
        if (!chart) continue

        // one dial per dimension of the fibre — the whole point
        expect(chart.dimension, `{${grip}} has ${m} dials`).toBe(fibreDimension(seed, grip).dimension)
        expect(chart.dimension).toBe(m)

        // t = 0 is the curve you were looking at, not some minimum-norm member elsewhere
        const here = controlPoints(chart.build(new Array<number>(m).fill(0)))
        const was = controlPoints(seed)
        let worst = 0
        for (let i = 0; i < was.length; i++) worst = Math.max(worst, vnorm(vsub(here[i], was[i])))
        expect(worst, `t = 0 rebuilds the seed over {${grip}}`).toBeLessThan(1e-9)
        expect(chart.tOf(seed).every((v) => Math.abs(v) < 1e-9)).toBe(true)
      }
    }
  }, 300_000)

  it('the dials are INDEPENDENT: m of them, moving the curve m different ways', () => {
    // The claim a multi-dial figure makes is that turning dial 2 is not turning dial 1 again. So
    // measure what each dial does to the polygon and check the m motions span m dimensions — a
    // rank, not a distance. (Asking whether build(t) equals build(t) would assert nothing: t goes
    // in as one vector, so there is no order to disagree about.)
    for (const m of [1, 2, 3]) {
      const seed = seedOfDegree(m)
      for (const grip of [maximalGrips(m)[0], Array.from({ length: m + 2 }, (_, i) => i)]) {
        const chart = retractionChart(seed, grip)
        if (!chart) throw new Error('no chart')
        const base = controlPoints(seed)
        const motions: number[][] = []
        for (let k = 0; k < m; k++) {
          const one = new Array<number>(m).fill(0)
          one[k] = 0.05
          const p = controlPoints(chart.build(one))
          expect(chart.residual(one), `dial ${k + 1} still holds {${grip}}`).toBeLessThan(1e-8)
          const d = p.flatMap((q, i) => [q.x - base[i].x, q.y - base[i].y, q.z - base[i].z])
          const len = Math.sqrt(d.reduce((a, v) => a + v * v, 0))
          expect(len, `dial ${k + 1} of {${grip}} moves the curve`).toBeGreaterThan(1e-4)
          motions.push(d.map((v) => v / len))
        }
        // Gram–Schmidt rank of the m motions
        const orth: number[][] = []
        for (const v of motions) {
          let w = [...v]
          for (const u of orth) {
            const dd = u.reduce((a, x, i) => a + x * w[i], 0)
            w = w.map((x, i) => x - dd * u[i])
          }
          const nn = Math.sqrt(w.reduce((a, x) => a + x * x, 0))
          if (nn > 1e-6) orth.push(w.map((x) => x / nn))
        }
        console.log(`    m=${m} {${grip}}: ${m} dials span ${orth.length} directions`)
        expect(orth.length, `{${grip}} has ${m} genuinely different dials`).toBe(m)
      }
    }
  }, 300_000)
})

describe('the maximal grips are the bounded ones', () => {
  it('there are 2^m of them, both ends and one out of each consecutive pair', () => {
    for (const m of [1, 2, 3]) {
      const gs = maximalGrips(m)
      expect(gs.length).toBe(2 ** m)
      for (const g of gs) {
        expect(g.length).toBe(m + 2)
        expect(g[0]).toBe(0)
        expect(g[g.length - 1]).toBe(2 * m + 1)
        expect(isMaximalGrip(m, g)).toBe(true)
        expect(isMaximalGrip(m, [...g].reverse()), 'order does not matter').toBe(true)
      }
      // and nothing else qualifies
      const key = (g: readonly number[]): string => g.join(',')
      const set = new Set(gs.map(key))
      for (const g of allGrips(m)) expect(isMaximalGrip(m, g)).toBe(set.has(key(g)))
    }
  })

  it('WALKED: a non-maximal grip runs away, a maximal one does not', () => {
    // Proof in one direction only, and the asymmetry is real: leaving every bound is exhibited by
    // a path, while staying inside one is evidence over the steps we could afford. The grip that
    // fooled a shorter walk is in here on purpose.
    for (const m of [1, 2, 3]) {
      const seed = seedOfDegree(m)
      const e0 = extentOf(controlPoints(seed))
      const grips = m === 3
        ? [...maximalGrips(m).slice(0, 2), [0, 2, 3, 4, 7], [0, 1, 2, 3, 4]]
        : allGrips(m)
      for (const grip of grips) {
        let peak = 0
        let ran = false
        for (const reverse of [false, true]) {
          const w = walkFibre(seed, grip, { step: 0.05, maxSteps: 1400, maxGrowth: 20, reverse })
          for (const s of w.samples) peak = Math.max(peak, extentOf(controlPoints(s)) / e0)
          if (w.stopped === 'extent') ran = true
        }
        const maximal = isMaximalGrip(m, grip)
        console.log(`    m=${m} {${grip}}${maximal ? ' maximal ' : '         '}` +
          `peak x${peak.toFixed(2)}  ${ran ? 'RAN AWAY' : 'stayed'}`)
        if (!maximal) expect(ran, `{${grip}} is not maximal, so it must run away`).toBe(true)
        else expect(peak, `{${grip}} is maximal, so it must stay bounded`).toBeLessThan(8)
      }
    }
  }, 900_000)
})

describe('the quintic Hermite grip {0,1,4,5} — two dials that are angles', () => {
  const TAU = 2 * Math.PI

  it('holds the grip at every angle, and the dials WRAP', () => {
    const seed = seedOfDegree(2)
    const pts = controlPoints(seed)
    expect(isQuinticHermiteGrip(2, [5, 4, 1, 0])).toBe(true)
    expect(isQuinticHermiteGrip(2, [0, 1, 2, 5])).toBe(false)
    expect(isQuinticHermiteGrip(3, [0, 1, 4, 5])).toBe(false)

    const chart = quinticHermiteChart(pts)
    expect(chart).not.toBeNull()
    if (!chart) return
    expect(chart.dimension).toBe(2)
    expect(chart.period).toEqual([TAU, TAU])

    let worstHold = 0
    let worstWrap = 0
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 12; j++) {
        const t = [(TAU * i) / 12, (TAU * j) / 12]
        const c = controlPoints(chart.build(t))
        // the four held points are exactly the data, at every angle
        for (const k of [0, 1, 4, 5]) worstHold = Math.max(worstHold, vnorm(vsub(c[k], pts[k])))
        // and a full turn of either dial is the identity — which is what a period MEANS
        const w = controlPoints(chart.build([t[0] + TAU, t[1] - TAU]))
        for (let k = 0; k < 6; k++) worstWrap = Math.max(worstWrap, vnorm(vsub(c[k], w[k])))
      }
    }
    console.log(`    144 angles: grip held to ${worstHold.toExponential(1)},` +
      ` a full turn returns to ${worstWrap.toExponential(1)}`)
    expect(worstHold).toBeLessThan(1e-9)
    expect(worstWrap).toBeLessThan(1e-9)
  }, 120_000)

  it('the free control points trace CLOSED loops, unlike a chart over the same grip', () => {
    // The point of having angles: sweep one dial through its period and P₂, P₃ come home. The
    // retraction chart has the same two dimensions over the same grip and cannot say this.
    const seed = seedOfDegree(2)
    const pts = controlPoints(seed)
    const chart = quinticHermiteChart(pts)
    if (!chart) throw new Error('no chart')
    const t0 = chart.tOf(seed)
    for (const dial of [0, 1]) {
      const loop = Array.from({ length: 61 }, (_, i) => {
        const t = [...t0]
        t[dial] += (TAU * i) / 60
        return controlPoints(chart.build(t))
      })
      for (const free of [2, 3]) {
        const gap = vnorm(vsub(loop[0][free], loop[60][free]))
        let spread = 0
        for (const p of loop) spread = Math.max(spread, vnorm(vsub(p[free], loop[0][free])))
        console.log(`    dial ${dial + 1}, P${free}: loop closes to ${gap.toExponential(1)},` +
          ` having travelled ${spread.toFixed(3)}`)
        expect(gap, `P${free} comes home on dial ${dial + 1}`).toBeLessThan(1e-9)
        expect(spread, `and went somewhere first`).toBeGreaterThan(1e-3)
      }
    }
  }, 120_000)

  it('tOf finds the curve on screen, so the dials open where the user is', () => {
    const seed = seedOfDegree(2)
    const chart = quinticHermiteChart(controlPoints(seed))
    if (!chart) throw new Error('no chart')
    const back = controlPoints(chart.build(chart.tOf(seed)))
    const was = controlPoints(seed)
    let worst = 0
    for (let i = 0; i < was.length; i++) worst = Math.max(worst, vnorm(vsub(back[i], was[i])))
    console.log(`    build(tOf(seed)) rebuilds it to ${worst.toExponential(1)}`)
    expect(worst).toBeLessThan(1e-9)
  }, 120_000)
})
