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
  c2SplineFromMiddles,
  continuityDefects,
  editWindow,
  localEdit,
  segmentHodograph,
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

  it('EVERY control point is draggable, endpoints included', () => {
    const last = 5 * MIDDLES.length
    for (let i = 0; i <= last; i++) expect(editWindow(SPLINE, i, 3), `cp ${i}`).not.toBeNull()
    expect(editWindow(SPLINE, 0, 3)).toEqual([0, 2])
    expect(editWindow(SPLINE, last, 3)).toEqual([5, 7])
    expect(editWindow(SPLINE, -1, 3)).toBeNull()
    expect(editWindow(SPLINE, last + 1, 3)).toBeNull()
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
describe('HOW MANY FREE PARAMETERS the edit really has', () => {
  // The W=3 system has a 6-dimensional kernel, but THREE of those dimensions are
  // per-segment gauge: every residual is built from sandwich/polarSandwich WITHIN one
  // segment, and both are invariant under A ↦ A·e^{iθ}. So they move the unknowns and
  // leave the curve exactly where it was.
  //
  // That leaves THREE genuinely shape-changing parameters — the slack a further
  // invariant (curvature-extrema count, a curvature bound) would live in.
  const eig = (Ain: number[][]): number[] => {
    const n = Ain.length
    const A = Ain.map((r) => r.slice())
    for (let s = 0; s < 3000; s++) {
      let off = 0
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j]
      if (off < 1e-34) break
      for (let p = 0; p < n; p++) {
        for (let q = p + 1; q < n; q++) {
          if (Math.abs(A[p][q]) < 1e-300) continue
          const th = (A[q][q] - A[p][p]) / (2 * A[p][q])
          const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1))
          const co = 1 / Math.sqrt(t * t + 1), si = t * co
          for (let k = 0; k < n; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = co * a - si * b; A[k][q] = si * a + co * b }
          for (let k = 0; k < n; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = co * a - si * b; A[q][k] = si * a + co * b }
        }
      }
    }
    return A.map((r, i) => r[i]).sort((a, b) => a - b)
  }

  const p = splineControlPoints(SPLINE)[PICK]
  const edited = localEdit(SPLINE, PICK, V(p.x + 0.3, p.y + 0.25, p.z - 0.2), { window: 3 })!
  const [k0, k1] = edited.movedSegments
  const W = k1 - k0 + 1
  const segs = edited.spline.segments.slice(k0, k1 + 1)
  const x0 = segs.flatMap((A) => A.flatMap((a) => [a.u, a.v, a.p, a.q]))
  /** The window's geometry as a function of its unknowns. */
  const geometry = (x: readonly number[]): number[] => {
    const out: number[] = []
    for (let s = 0; s < W; s++) {
      const A = [0, 1, 2].map((j) => {
        const o = 12 * s + 4 * j
        return { u: x[o], v: x[o + 1], p: x[o + 2], q: x[o + 3] }
      })
      for (const d of segmentHodograph(A)) out.push(d.x, d.y, d.z)
    }
    return out
  }
  const U = x0.length
  const m = geometry(x0).length
  const h = 1e-6
  const J: number[][] = Array.from({ length: m }, () => new Array(U).fill(0))
  for (let c = 0; c < U; c++) {
    const a = x0.slice(); a[c] += h
    const b = x0.slice(); b[c] -= h
    const fa = geometry(a), fb = geometry(b)
    for (let e = 0; e < m; e++) J[e][c] = (fa[e] - fb[e]) / (2 * h)
  }

  it('the geometry map has a 3-dimensional kernel — one gauge per segment', () => {
    const G = Array.from({ length: U }, () => new Array(U).fill(0))
    for (let i = 0; i < U; i++) {
      for (let j = 0; j < U; j++) {
        let s = 0
        for (let e = 0; e < m; e++) s += J[e][i] * J[e][j]
        G[i][j] = s
      }
    }
    const sv = eig(G).map((v) => Math.sqrt(Math.max(0, v)))
    const rel = sv.map((v) => v / sv[U - 1])
    // A clean gap: three at zero, then O(1e-1). Not a tolerance judgement.
    expect(rel[2]).toBeLessThan(1e-12)
    expect(rel[3]).toBeGreaterThan(1e-3)
  })

  it('and the gauge directions are exactly those — verified, not assumed', () => {
    for (let s = 0; s < W; s++) {
      const g = new Array(U).fill(0)
      for (let j = 0; j < 3; j++) {
        const a = segs[s][j], o = 12 * s + 4 * j
        g[o] = -a.v; g[o + 1] = a.u; g[o + 2] = a.q; g[o + 3] = -a.p
      }
      let worst = 0
      for (let e = 0; e < m; e++) {
        let d = 0
        for (let c = 0; c < U; c++) d += J[e][c] * g[c]
        worst = Math.max(worst, Math.abs(d))
      }
      expect(worst, `segment ${s} gauge`).toBeLessThan(1e-8)
    }
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

// ---------------------------------------------------------------------------
describe('dragging the ENDS — where there is no neighbour to protect', () => {
  const LAST = 5 * MIDDLES.length

  it('P₀ moves, and the tail beyond the window does NOT come with it', () => {
    // The trap: p₀ is the integration constant, so a naive edit translates the whole
    // spline. The window's far END is pinned instead of its net displacement.
    const before = splineControlPoints(SPLINE)
    const want = V(before[0].x - 0.3, before[0].y + 0.25, before[0].z + 0.2)
    const r = localEdit(SPLINE, 0, want, { window: 3 })
    expect(r).not.toBeNull()
    expect(r!.converged).toBe(true)
    const after = splineControlPoints(r!.spline)
    expect(vd(after[0], want)).toBeLessThan(1e-9)
    for (let i = 5 * 3; i < before.length; i++) expect(vd(after[i], before[i]), `cp ${i}`).toBeLessThan(1e-10)
    expect(continuityDefects(r!.spline).c2).toBeLessThan(1e-8)
  })

  it('the LAST control point likewise, with the head left alone', () => {
    const before = splineControlPoints(SPLINE)
    const want = V(before[LAST].x + 0.3, before[LAST].y - 0.25, before[LAST].z + 0.2)
    const r = localEdit(SPLINE, LAST, want, { window: 3 })!
    expect(r.converged).toBe(true)
    const after = splineControlPoints(r.spline)
    expect(vd(after[LAST], want)).toBeLessThan(1e-9)
    for (let i = 0; i <= 5 * 5; i++) expect(vd(after[i], before[i]), `cp ${i}`).toBeLessThan(1e-10)
    expect(continuityDefects(r.spline).c2).toBeLessThan(1e-8)
  })

  it('P₁ changes the start TANGENT — which is the point of dragging it', () => {
    const before = splineControlPoints(SPLINE)
    const want = V(before[1].x + 0.2, before[1].y + 0.3, before[1].z - 0.15)
    const r = localEdit(SPLINE, 1, want, { window: 3 })!
    expect(r.converged).toBe(true)
    const after = splineControlPoints(r.spline)
    expect(vd(after[1], want)).toBeLessThan(1e-9)
    // the start point itself is unmoved, but the tangent (P₁ − P₀) is not
    expect(vd(after[0], before[0])).toBeLessThan(1e-9)
    expect(vd(vsub(after[1], after[0]), vsub(before[1], before[0]))).toBeGreaterThan(0.1)
    expect(continuityDefects(r.spline).c2).toBeLessThan(1e-8)
  })

  it('every control point can be dragged, and each stays local and C²', () => {
    const before = splineControlPoints(SPLINE)
    for (let i = 0; i <= LAST; i++) {
      const want = V(before[i].x + 0.12, before[i].y + 0.1, before[i].z - 0.08)
      const r = localEdit(SPLINE, i, want, { window: 3 })
      expect(r, `cp ${i}`).not.toBeNull()
      expect(r!.converged, `cp ${i} converged`).toBe(true)
      const after = splineControlPoints(r!.spline)
      expect(vd(after[i], want), `cp ${i} tracks`).toBeLessThan(1e-8)
      expect(continuityDefects(r!.spline).c2, `cp ${i} C²`).toBeLessThan(1e-7)
      // outside the window, nothing moved
      const [k0, k1] = r!.movedSegments
      for (let j = 0; j < before.length; j++) {
        const inside = j >= 5 * k0 && j <= 5 * (k1 + 1)
        if (!inside) expect(vd(after[j], before[j]), `cp ${i} leaked to ${j}`).toBeLessThan(1e-9)
      }
    }
  })
})

// ---------------------------------------------------------------------------
describe('WHY A MINIMAL WINDOW FEELS UNPREDICTABLE, and what fixes it', () => {
  // Observed while using the figure: most drags behave, but some produce startling
  // motion. The cause is AMPLIFICATION — at the minimal window some control points,
  // when dragged, force OTHERS to move several times further. Holding C² at both
  // edges plus the end position plus the cursor leaves only three parameters, and the
  // compensating excursions have to be large.
  //
  // The cure is a WIDER window, not less continuity: worst amplification falls from
  // ~4.4x at W=3 to ~1.5x at W=5 and then saturates, while C² and the speed margin are
  // untouched. The price is that more points move — but each moves less, which is what
  // reads as predictable.
  const amplification = (W: number): { worst: number; mean: number; moving: number } => {
    const before = splineControlPoints(SPLINE)
    let worst = 0, sum = 0, n = 0
    for (let i = 0; i < before.length; i++) {
      const want = V(before[i].x + 0.3, before[i].y + 0.24, before[i].z - 0.18)
      const r = localEdit(SPLINE, i, want, { window: W, keepC2: true })
      if (!r || !r.converged) continue
      const after = splineControlPoints(r.spline)
      const dragged = vd(want, before[i])
      let other = 0
      for (let j = 0; j < after.length; j++) if (j !== i) other = Math.max(other, vd(after[j], before[j]))
      worst = Math.max(worst, other / dragged)
      sum += other / dragged
      n++
    }
    const mid = 18
    const r = localEdit(SPLINE, mid, V(before[mid].x + 0.3, before[mid].y + 0.24, before[mid].z - 0.18), { window: W })!
    const after = splineControlPoints(r.spline)
    let moving = 0
    for (let j = 0; j < after.length; j++) if (vd(after[j], before[j]) > 1e-6) moving++
    return { worst, mean: sum / n, moving }
  }

  it('the minimal window amplifies — some points move several times the drag', () => {
    const a = amplification(3)
    expect(a.worst).toBeGreaterThan(3)
    expect(a.mean).toBeLessThan(2.5) // most drags are fine; it is the tail that startles
  })

  it('widening calms it, monotonically, and then saturates', () => {
    const w3 = amplification(3), w4 = amplification(4), w5 = amplification(5)
    expect(w4.worst).toBeLessThan(w3.worst)
    expect(w5.worst).toBeLessThan(w4.worst)
    expect(w5.worst).toBeLessThan(2)
    // and it costs locality in the honest way: five more points per added segment
    expect(w4.moving - w3.moving).toBe(5)
    expect(w5.moving - w4.moving).toBe(5)
  })

  it('and it is free — C² and the speed margin do not pay for it', () => {
    const before = splineControlPoints(SPLINE)
    for (const W of [3, 4, 5]) {
      const r = localEdit(SPLINE, 18, V(before[18].x + 0.3, before[18].y + 0.24, before[18].z - 0.18), { window: W })!
      expect(r.converged, `W=${W}`).toBe(true)
      expect(continuityDefects(r.spline).c2, `W=${W} C²`).toBeLessThan(1e-9)
      expect(minSpeed(r.spline), `W=${W} σ`).toBeGreaterThan(0.1)
    }
  })
})
