// ============================================================================
// LOCAL EDITING of a C² PH quintic spline — the window-width measurements.
//
// The claim these pin, and it contradicts the received reading of the published
// planar scheme: the C² → C¹ relaxation is a consequence of holding the window at
// TWO segments, not a cost of the PH structure. Widen the window and C² returns.
//
//                      keep C²        relax to C¹
//     plane            W = 4          W = 2   ← Farouki–Giannelli–Sestini 2016
//     space            W = 3          W = 2
//
// The planar half is measured here too (with test-local helpers, since we do not
// ship planar local editing) because the comparison is the interesting part: space
// needs a NARROWER window than the plane, and gets a FAMILY where the plane gets a
// square system.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, type Vec3, vnorm, vsub } from '../quaternion'
import { leastSquares } from '../linalg'
import {
  type SpatialPHSpline,
  c2SplineFromMiddles,
  continuityDefects,
  editWindow,
  localEdit,
  minSpeed,
  splineControlPoints,
} from '../phSpatialSpline'

const V = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const vd = (a: Vec3, b: Vec3): number => vnorm(vsub(a, b))

const MIDDLES: Quat[] = [
  Q(1.05, 0.22, -0.31, 0.14), Q(0.82, -0.44, 0.51, 0.62), Q(1.14, 0.35, 0.18, -0.29),
  Q(0.71, 0.63, -0.22, 0.41), Q(1.02, -0.18, 0.44, 0.25), Q(0.88, 0.41, 0.13, -0.36),
  Q(1.10, -0.27, 0.36, 0.19), Q(0.95, 0.30, -0.18, 0.22),
]
const SPLINE = c2SplineFromMiddles(MIDDLES, Q(1, 0.1, -0.2, 0.05), Q(0.95, -0.15, 0.25, 0.3), V(-1.5, -0.4, 0.2))
/** A control point in the middle of the spline, well away from either end. */
const PICK = 18

// ---------------------------------------------------------------------------
describe('the spline itself', () => {
  it('is C² and PH by construction', () => {
    const d = continuityDefects(SPLINE)
    expect(d.c1).toBeLessThan(1e-14)
    expect(d.c2).toBeLessThan(1e-13)
    expect(minSpeed(SPLINE)).toBeGreaterThan(0.1)
  })

  it('has 5n+1 control points', () => {
    expect(splineControlPoints(SPLINE)).toHaveLength(5 * MIDDLES.length + 1)
  })

  it('refuses to drag the endpoints — those ARE the end conditions', () => {
    expect(editWindow(SPLINE, 0, 3)).toBeNull()
    expect(editWindow(SPLINE, 5 * MIDDLES.length, 3)).toBeNull()
    expect(localEdit(SPLINE, 0, V(0, 0, 0))).toBeNull()
  })

  it('centres the window on the dragged point and clamps at the ends', () => {
    expect(editWindow(SPLINE, PICK, 3)).toEqual([2, 4])
    expect(editWindow(SPLINE, 1, 3)).toEqual([0, 2])          // clamped left
    expect(editWindow(SPLINE, 5 * 8 - 1, 3)).toEqual([5, 7])  // clamped right
  })
})

// ---------------------------------------------------------------------------
describe('SPACE: three segments keep C², two do not', () => {
  const target = (d: number): Vec3 => {
    const p = splineControlPoints(SPLINE)[PICK]
    return V(p.x + 0.35 * d, p.y + 0.28 * d, p.z - 0.22 * d)
  }

  it('W = 2 CANNOT keep C² — the published obstruction, in space', () => {
    const r = localEdit(SPLINE, PICK, target(1), { window: 2, keepC2: true })
    expect(r).not.toBeNull()
    expect(r!.converged).toBe(false)
  })

  it('W = 3 CAN — this is the result', () => {
    const r = localEdit(SPLINE, PICK, target(1), { window: 3, keepC2: true })
    expect(r).not.toBeNull()
    expect(r!.converged).toBe(true)
    expect(r!.residual).toBeLessThan(1e-11)
    expect(r!.movedSegments).toEqual([2, 4])
  })

  it('W = 2 IS enough once C² is relaxed to C¹ — the published scheme', () => {
    const r = localEdit(SPLINE, PICK, target(1), { window: 2, keepC2: false })
    expect(r).not.toBeNull()
    expect(r!.converged).toBe(true)
  })

  it('and the W = 3 edit really is local, C², and PH', () => {
    const before = splineControlPoints(SPLINE)
    const r = localEdit(SPLINE, PICK, target(1), { window: 3, keepC2: true })!
    const after = splineControlPoints(r.spline)

    // the dragged point arrives
    expect(vd(after[PICK], target(1))).toBeLessThan(1e-9)
    // segments 0,1 and 5,6,7 are untouched — control points 0..10 and 25..40
    for (let i = 0; i <= 5 * 2; i++) expect(vd(after[i], before[i]), `cp ${i}`).toBeLessThan(1e-11)
    for (let i = 5 * 5; i < before.length; i++) expect(vd(after[i], before[i]), `cp ${i}`).toBeLessThan(1e-11)
    // still C² everywhere, still no cusp
    const d = continuityDefects(r.spline)
    expect(d.c1).toBeLessThan(1e-9)
    expect(d.c2).toBeLessThan(1e-8)
    expect(minSpeed(r.spline)).toBeGreaterThan(0.1)
  })
})

// ---------------------------------------------------------------------------
describe('THERE IS NO MAXIMUM DRAG DISTANCE', () => {
  it('one shot stalls, but incremental warm-started dragging goes far past it', () => {
    // The distinction that matters: a single solve attempting the whole displacement
    // has a basin of attraction, and that is a SOLVER limit. Dragged in steps, the
    // point keeps going — no cusp, residual at machine zero.
    const p0 = splineControlPoints(SPLINE)[PICK]
    const dir = V(0.6, 0.5, -0.4)
    const at = (d: number): Vec3 => V(p0.x + dir.x * d, p0.y + dir.y * d, p0.z + dir.z * d)

    let oneShot = 0
    for (let d = 1; d <= 12; d += 1) {
      const r = localEdit(SPLINE, PICK, at(d), { window: 3 })
      if (r && r.converged) oneShot = d
      else break
    }

    let state = SPLINE
    let reached = 0
    for (let d = 0.5; d <= 12; d += 0.5) {
      const r = localEdit(state, PICK, at(d), { window: 3 })
      if (!r || !r.converged) break
      state = r.spline
      reached = d
    }

    expect(oneShot).toBeGreaterThan(0)
    expect(reached).toBeGreaterThanOrEqual(12)
    expect(reached).toBeGreaterThan(oneShot)
    expect(minSpeed(state)).toBeGreaterThan(0.01)
    const d = continuityDefects(state)
    expect(d.c2).toBeLessThan(1e-6)
  })
})

// ---------------------------------------------------------------------------
describe('PLANE: four segments are needed, and there is no slack', () => {
  // Test-local planar machinery — we do not ship planar local editing, but the
  // comparison is the point: the plane needs a WIDER window and lands on a SQUARE
  // system (finitely many edits, no room to choose), where space gets a family.
  type C = { re: number; im: number }
  const cm = (a: C, b: C): C => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
  const cadd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im })
  const csub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im })
  const cmul = (a: C, k: number): C => ({ re: a.re * k, im: a.im * k })
  const WSQ = [[1, 0, 0], [0.5, 0.5, 0], [1 / 6, 4 / 6, 1 / 6], [0, 0.5, 0.5], [0, 0, 1]]
  const legs = (w: C[]): C[] => {
    const out: C[] = []
    for (let j = 0; j < 5; j++) {
      let acc: C = { re: 0, im: 0 }
      for (let a = Math.max(0, j - 2); a <= Math.min(2, j); a++) {
        const b = j - a
        if (WSQ[j][a] === 0) continue
        acc = cadd(acc, cmul(cm(w[a], w[b]), WSQ[j][a]))
      }
      out.push(cmul(acc, 1 / 5))
    }
    return out
  }
  const accStart = (w: C[]): C => cmul(cm(w[0], csub(w[1], w[0])), 4)
  const accEnd = (w: C[]): C => cmul(cm(w[2], csub(w[2], w[1])), 4)
  const MID: C[] = [
    { re: 1.05, im: 0.22 }, { re: 0.82, im: -0.44 }, { re: 1.14, im: 0.35 }, { re: 0.71, im: 0.63 },
    { re: 1.02, im: -0.18 }, { re: 0.88, im: 0.41 }, { re: 1.10, im: -0.27 }, { re: 0.95, im: 0.30 },
    { re: 1.0, im: 0.12 },
  ]
  const shared: C[] = [{ re: 1, im: 0.1 }]
  for (let k = 1; k < MID.length; k++) shared.push(cmul(cadd(MID[k - 1], MID[k]), 0.5))
  shared.push({ re: 0.95, im: -0.15 })
  const SEGS: C[][] = MID.map((m, k) => [shared[k], m, shared[k + 1]])
  const ORG: C = { re: -1.5, im: -0.4 }
  const CPS: C[] = (() => {
    const o: C[] = [ORG]
    let c = ORG
    for (const w of SEGS) for (const l of legs(w)) { c = cadd(c, l); o.push(c) }
    return o
  })()

  const planarEdit = (W: number, keepC2: boolean): { U: number; E: number; res: number } => {
    const k0 = 2
    const win = SEGS.slice(k0, k0 + W)
    const dL = cm(SEGS[k0 - 1][2], SEGS[k0 - 1][2]), aL = accEnd(SEGS[k0 - 1])
    const dR = cm(SEGS[k0 + W][0], SEGS[k0 + W][0]), aR = accStart(SEGS[k0 + W])
    let net: C = { re: 0, im: 0 }
    for (const w of win) for (const l of legs(w)) net = cadd(net, l)
    const legOffset = Math.ceil((5 * W) / 2)
    const start = 1 + 5 * k0
    const target = cadd(CPS[start + legOffset - 1], { re: 0.35, im: 0.28 })
    const unpack = (x: number[]): C[][] =>
      Array.from({ length: W }, (_, s) => [0, 1, 2].map((j) => ({ re: x[6 * s + 2 * j], im: x[6 * s + 2 * j + 1] })))
    const resid = (x: number[]): number[] => {
      const w = unpack(x), r: number[] = []
      const push = (v: C): void => { r.push(v.re, v.im) }
      push(csub(cm(w[0][0], w[0][0]), dL))
      if (keepC2) push(csub(accStart(w[0]), aL))
      for (let s = 1; s < W; s++) {
        push(csub(cm(w[s][0], w[s][0]), cm(w[s - 1][2], w[s - 1][2])))
        push(csub(accStart(w[s]), accEnd(w[s - 1])))
      }
      push(csub(cm(w[W - 1][2], w[W - 1][2]), dR))
      if (keepC2) push(csub(accEnd(w[W - 1]), aR))
      let nt: C = { re: 0, im: 0 }
      let cur = CPS[start - 1], hit = cur, c = 0
      for (const ww of w) for (const l of legs(ww)) { nt = cadd(nt, l); cur = cadd(cur, l); c++; if (c === legOffset) hit = cur }
      push(csub(nt, net))
      push(csub(hit, target))
      return r
    }
    let x = win.flatMap((w) => w.flatMap((a) => [a.re, a.im]))
    const E = resid(x).length, U = x.length, h = 1e-6
    for (let it = 0; it < 60; it++) {
      const r = resid(x)
      const J = Array.from({ length: E }, () => new Array(U).fill(0))
      for (let col = 0; col < U; col++) {
        const p = x.slice(); p[col] += h
        const m = x.slice(); m[col] -= h
        const rp = resid(p), rm = resid(m)
        for (let e = 0; e < E; e++) J[e][col] = (rp[e] - rm[e]) / (2 * h)
      }
      const st = leastSquares(J, r.map((v) => -v), 1e-11)
      if (!st.every(Number.isFinite)) break
      const nx = x.map((v, i) => v + st[i])
      if (!nx.every(Number.isFinite)) break
      x = nx
      if (Math.max(...st.map(Math.abs)) < 1e-14) break
    }
    return { U, E, res: Math.max(...resid(x).map(Math.abs)) }
  }

  it('W = 1, 2, 3 cannot keep C² in the plane', () => {
    for (const W of [1, 2, 3]) expect(planarEdit(W, true).res, `W=${W}`).toBeGreaterThan(1e-8)
  })

  it('W = 4 can — and it is EXACTLY SQUARE, so there is no room to choose', () => {
    const r = planarEdit(4, true)
    expect(r.res).toBeLessThan(1e-10)
    expect(r.U).toBe(r.E)
    expect(r.U).toBe(24)
  })

  it('W = 2 suffices with the C¹ relaxation — the 2016 scheme reproduced', () => {
    expect(planarEdit(2, false).res).toBeLessThan(1e-10)
  })

  it('SPACE BEATS THE PLANE: narrower window, and a family instead of a square system', () => {
    // space: W=3, 36 unknowns against 30 equations -> 6-dimensional family
    // plane: W=4, 24 unknowns against 24 equations -> isolated solutions
    expect(planarEdit(4, true).U - planarEdit(4, true).E).toBe(0)
    const spatial = localEdit(SPLINE, PICK, (() => {
      const p = splineControlPoints(SPLINE)[PICK]
      return V(p.x + 0.35, p.y + 0.28, p.z - 0.22)
    })(), { window: 3, keepC2: true })!
    expect(spatial.converged).toBe(true)
    expect(spatial.movedSegments[1] - spatial.movedSegments[0] + 1).toBe(3)
  })
})
