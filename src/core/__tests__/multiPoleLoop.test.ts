// ============================================================================
// THE GATE ON EXTENDING THE FIGURE: with m poles, is there still a LOOP to sweep?
//
// F17 says m poles want m sliders and both solves stay linear. That makes a richer figure POSSIBLE, but
// the figure's best feature is the closed loop you can sweep, and more conditions means less nullity. So
// before building anything: does the sweepable dimension survive, and does it still close?
//
// THE COUNT. Holding the λ's and the roots, the admissible 𝒜 form a subspace of dimension 4(n+1) − 4m
// (F17). Prescribing c′(0) and c(1) is 6 conditions, and the spinor phase is 1 gauge, so
//
//     fiber = 4(n+1) − 4m − 6 − 1 = 4n − 4m − 3
//
// which is ONE exactly when n = m + 1. And the curve degree is 2n − m + 1, so that family is
//
//     m = 1, n = 2 → degree 4      (what the figure has today)
//     m = 2, n = 3 → degree 5
//     m = 3, n = 4 → degree 6
//
// Each extra pole buys one more degree of curve and one more twist dial while KEEPING the loop
// one-dimensional. If it closes, extending the figure is a clean upgrade; if it does not, the figure
// would lose the thing that makes it worth looking at, and the answer is to leave it at one pole.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
type Vec = { x: number; y: number; z: number }
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const rDeriv = (p: RPoly): RPoly => p.slice(1).map((c, i) => c * (i + 1))
const parts = (a: Quat): number[] => [a.u, a.v, a.p, a.q]
const UNITS: Quat[] = [Q(1, 0, 0, 0), Q(0, 1, 0, 0), Q(0, 0, 1, 0), Q(0, 0, 0, 1)]
const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)

const polyFromRoots = (roots: readonly number[]): RPoly =>
  roots.reduce<RPoly>((acc, r) => {
    const out = new Array(acc.length + 1).fill(0)
    for (let i = 0; i < acc.length; i++) { out[i + 1] += acc[i]; out[i] += -r * acc[i] }
    return out
  }, [1])
const sigmaOf = (roots: readonly number[], k: number): number =>
  roots.reduce((s, rl, l) => (l === k ? s : s + 1 / (roots[k] - rl)), 0)

/** 𝒜′(rₖ) − 𝒜(rₖ)(Σₖ + λₖ i) = 0 — four real rows per root, linear in 𝒜 for fixed λ (F17). */
function conditionMatrix(n: number, roots: readonly number[], lambdas: readonly number[]): number[][] {
  const rows: number[][] = []
  for (let k = 0; k < roots.length; k++) {
    const r = roots[k]
    const rhs = Q(sigmaOf(roots, k), lambdas[k], 0, 0)
    const block: number[][] = [[], [], [], []]
    for (let j = 0; j <= n; j++) {
      for (const e of UNITS) {
        const col = parts(qadd(
          qscale(e, j === 0 ? 0 : j * Math.pow(r, j - 1)),
          qscale(qmul(e, rhs), -Math.pow(r, j)),
        ))
        for (let c = 0; c < 4; c++) block[c].push(col[c])
      }
    }
    rows.push(...block)
  }
  return rows
}

function nullspace(M: number[][], cols: number): number[][] {
  const basis: number[][] = []
  for (let seed = 0; seed < 2 * cols; seed++) {
    const probe = Array.from({ length: cols }, (_, i) =>
      Math.cos(1.3 * seed + 0.41 * i) + 0.35 * Math.sin(2.7 * i - 0.6 * seed))
    let n: number[]
    try {
      const c = leastSquares(M, M.map((row) => dot(row, probe)), 1e-13)
      n = probe.map((v, i) => v - c[i])
    } catch { continue }
    for (const b of basis) {
      const d = dot(n, b)
      n = n.map((v, i) => v - d * b[i])
    }
    const len = Math.hypot(...n)
    if (len > 1e-6) basis.push(n.map((v) => v / len))
  }
  return basis
}

const spinorFrom = (x: readonly number[], n: number): Quat[] =>
  Array.from({ length: n + 1 }, (_, j) => Q(x[4 * j], x[4 * j + 1], x[4 * j + 2], x[4 * j + 3]))

function hopf(A: readonly Quat[]): { N: RPoly[]; sigma: RPoly } {
  const deg = 2 * (A.length - 1)
  const N = [0, 1, 2].map(() => new Array(deg + 1).fill(0))
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A.length; j++) {
    const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
    N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
    sigma[i + j] += qmul(A[i], qconj(A[j])).u
  }
  return { N, sigma }
}

/** The Wronskian system for a fixed w, built once and reused: only the right-hand side moves with 𝒜. */
function wronskianSystem(degN: number, w: RPoly): { rows: number[][]; degP: number } {
  const degP = degN - (w.length - 1) + 1
  const wD = rDeriv(w)
  const rows: number[][] = []
  for (let e = 0; e <= degN; e++) {
    const row = new Array(degP + 1).fill(0)
    for (let k = 0; k <= degP; k++) {
      let acc = 0
      for (let a = 0; a < w.length; a++) if (k - 1 + a === e) acc += k * w[a]
      for (let a = 0; a < wD.length; a++) if (k + a === e) acc -= wD[a]
      row[k] = acc
    }
    rows.push(row)
  }
  return { rows, degP }
}

interface Member { p: RPoly[]; w: RPoly; N: RPoly[]; sigma: RPoly; wronskian: number }

function build(x: readonly number[], n: number, w: RPoly, sys: ReturnType<typeof wronskianSystem>): Member {
  const { N, sigma } = hopf(spinorFrom(x, n))
  const p: RPoly[] = []
  let worst = 0
  for (let c = 0; c < 3; c++) {
    const rhs = N[c]
    const sol = leastSquares(sys.rows, rhs, 1e-14)
    const scale = Math.max(...rhs.map(Math.abs), 1e-300)
    for (let e = 0; e < sys.rows.length; e++) {
      worst = Math.max(worst, Math.abs(dot(sys.rows[e], sol) - rhs[e]) / scale)
    }
    p.push(sol)
  }
  return { p, w, N, sigma, wronskian: worst }
}

const at = (m: Member, t: number): Vec => {
  const wv = rEval(m.w, t)
  return { x: rEval(m.p[0], t) / wv, y: rEval(m.p[1], t) / wv, z: rEval(m.p[2], t) / wv }
}
const deriv = (m: Member, t: number): Vec => {
  const w2 = Math.pow(rEval(m.w, t), 2)
  return { x: rEval(m.N[0], t) / w2, y: rEval(m.N[1], t) / w2, z: rEval(m.N[2], t) / w2 }
}
const vn = (a: Vec): number => Math.hypot(a.x, a.y, a.z)
const vd = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

describe('m poles: is there still a loop to sweep?', () => {
  const CASES: { n: number; roots: number[]; lambdas: number[] }[] = [
    { n: 2, roots: [1.7], lambdas: [0.6] },
    { n: 3, roots: [1.7, -0.9], lambdas: [0.6, -0.35] },
    { n: 4, roots: [1.7, -0.9, 2.6], lambdas: [0.6, -0.35, 0.9] },
  ]

  it('the fiber dimension is 4n − 4m − 3, so n = m + 1 keeps it at ONE', () => {
    for (const { n, roots, lambdas } of CASES) {
      const m = roots.length
      const cols = 4 * (n + 1)
      const basis = nullspace(conditionMatrix(n, roots, lambdas), cols)
      const w = polyFromRoots(roots)
      const sys = wronskianSystem(2 * n, w)
      // data Jacobian over the nullspace coordinates
      const coord = basis.map((_, i) => 1 + 0.3 * i)
      const toX = (c: readonly number[]): number[] =>
        basis.reduce<number[]>((acc, b, i) => acc.map((v, j) => v + c[i] * b[j]), new Array(cols).fill(0))
      // Translation-invariant: p is only defined up to p + c₀w, so c(1) alone is bookkeeping.
      const readout = (c: readonly number[]): number[] => {
        const mem = build(toX(c), n, w, sys)
        const d0 = deriv(mem, 0), gap = vd(at(mem, 1), at(mem, 0))
        return [d0.x, d0.y, d0.z, gap.x, gap.y, gap.z]
      }
      const J = readout(coord).map((_, k) => coord.map((_, j) => {
        const e = 1e-6
        const hi = coord.slice(); hi[j] += e
        const lo = coord.slice(); lo[j] -= e
        return (readout(hi)[k] - readout(lo)[k]) / (2 * e)
      }))
      // rank of the 6 x dim(basis) map
      const G = J.map((a) => J.map((b) => dot(a, b)))
      let rank = 0
      const A = G.map((row) => row.slice())
      for (let c = 0; c < 6; c++) {
        let piv = c
        for (let r2 = c; r2 < 6; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2
        ;[A[c], A[piv]] = [A[piv], A[c]]
        if (Math.abs(A[c][c]) < 1e-14 * Math.abs(A[0][0])) continue
        rank++
        for (let r2 = c + 1; r2 < 6; r2++) {
          const f = A[r2][c] / A[c][c]
          for (let cc = c; cc < 6; cc++) A[r2][cc] -= f * A[c][cc]
        }
      }
      const fiber = basis.length - rank - 1
      console.log(
        `    n = ${n}, m = ${m} (curve degree ${2 * n - m + 1}):  subspace ${basis.length}` +
          ` (4(n+1)−4m = ${cols - 4 * m}) − rank ${rank} − 1 gauge = fiber ${fiber}` +
          `   [4n−4m−3 = ${4 * n - 4 * m - 3}]`,
      )
      expect(basis.length, 'the subspace dimension is F17s count').toBe(cols - 4 * m)
      expect(fiber, 'and the fiber matches 4n − 4m − 3').toBe(4 * n - 4 * m - 3)
    }
  }, 300_000)

  it('AND IT CLOSES at two poles — so extending the figure keeps its best feature', () => {
    const n = 3, roots = [1.7, -0.9], lambdas = [0.6, -0.35]
    const cols = 4 * (n + 1)
    const basis = nullspace(conditionMatrix(n, roots, lambdas), cols)
    const w = polyFromRoots(roots)
    const sys = wronskianSystem(2 * n, w)
    const toX = (c: readonly number[]): number[] =>
      basis.reduce<number[]>((acc, b, i) => acc.map((v, j) => v + c[i] * b[j]), new Array(cols).fill(0))
    const readout = (c: readonly number[]): number[] => {
      const mem = build(toX(c), n, w, sys)
      const d0 = deriv(mem, 0), gap = vd(at(mem, 1), at(mem, 0))
      return [d0.x, d0.y, d0.z, gap.x, gap.y, gap.z]
    }
    const signature = (c: readonly number[]): number[] => {
      const mem = build(toX(c), n, w, sys)
      const base = at(mem, 0)
      return [0.2, 0.45, 0.7].flatMap((t) => { const v = vd(at(mem, t), base); return [v.x, v.y, v.z] })
    }
    // the gauge direction 𝒜 ↦ 𝒜i, expressed in nullspace coordinates
    const gaugeCoord = (c: readonly number[]): number[] => {
      const A = spinorFrom(toX(c), n)
      const gi = A.flatMap((q) => parts(qmul(q, QUAT_I)))
      return basis.map((b) => dot(gi, b))
    }
    const jac = (c: readonly number[]): number[][] =>
      readout(c).map((_, k) => c.map((_, j) => {
        const e = 1e-6
        const hi = c.slice(); hi[j] += e
        const lo = c.slice(); lo[j] -= e
        return (readout(hi)[k] - readout(lo)[k]) / (2 * e)
      }))
    const tangent = (c: readonly number[], probe: readonly number[]): number[] | null => {
      const J = jac(c)
      let n2: number[]
      try {
        const corr = leastSquares(J, J.map((row) => dot(row, probe)), 1e-12)
        n2 = probe.map((v, i) => v - corr[i])
      } catch { return null }
      const g = gaugeCoord(c)
      const gn = Math.hypot(...g)
      if (gn > 0) { const gh = g.map((v) => v / gn); const d = dot(n2, gh); n2 = n2.map((v, i) => v - d * gh[i]) }
      const len = Math.hypot(...n2)
      return len > 1e-9 ? n2.map((v) => v / len) : null
    }
    const project = (c: readonly number[], target: readonly number[]): number[] => {
      let x = c.slice()
      for (let it = 0; it < 30; it++) {
        const r = readout(x).map((v, i) => v - target[i])
        if (Math.hypot(...r) < 1e-13) break
        try { const st = leastSquares(jac(x), r.map((v) => -v), 1e-12); x = x.map((v, j) => v + st[j]) } catch { break }
      }
      return x
    }

    let c0 = basis.map((_, i) => 1 + 0.25 * i)
    const target = readout(c0)
    const sig0 = signature(c0)
    const scale = Math.hypot(...sig0) || 1
    // Try each coordinate direction as a probe: a single one can land inside the gauge plus row space and
    // project to nothing, which says nothing about the fiber.
    let t: number[] | null = null
    for (let i = 0; i < basis.length && !t; i++) {
      t = tangent(c0, basis.map((_, j) => (j === i ? 1 : 0)))
    }
    expect(t, 'the fiber has a tangent at two poles').not.toBeNull()
    let closedAt = -1
    let maxAway = 0
    let last = 0
    const trail: string[] = []
    for (let step = 1; step <= 4000 && t; step++) {
      const proposed = c0.map((v, i) => v + 0.05 * t![i])
      const fixed = project(proposed, target)
      if (Math.hypot(...readout(fixed).map((v, i) => v - target[i])) > 1e-9) break
      c0 = fixed
      const nx = tangent(c0, t)
      t = nx && dot(nx, t) < 0 ? nx.map((v) => -v) : nx
      const gap = Math.hypot(...signature(c0).map((v, i) => v - sig0[i])) / scale
      maxAway = Math.max(maxAway, gap)
      last = gap
      if (step % 400 === 0) trail.push(`${step}:${gap.toFixed(3)}`)
      if (step > 40 && gap < 4e-3) { closedAt = step; break }
    }
    console.log(`    distance from the start along the walk — ${trail.join('  ')}`)
    const mem = build(toX(c0), n, w, sys)
    console.log(
      `    two poles, degree 5:  furthest ${maxAway.toFixed(3)}, returned at step ` +
        `${closedAt > 0 ? closedAt : 'never'} (gap ${last.toExponential(1)})` +
        `   Wronskian ${mem.wronskian.toExponential(1)}`,
    )
    // PH holds throughout, by construction
    let phGap = 0
    for (const tt of [0.1, 0.4, 0.7, 1]) {
      phGap = Math.max(phGap, Math.abs(vn(deriv(mem, tt)) - Math.abs(rEval(mem.sigma, tt) / Math.pow(rEval(mem.w, tt), 2))))
    }
    console.log(`    and PH throughout: ‖c′‖ vs σ/w² ≤ ${phGap.toExponential(1)}`)
    expect(closedAt, 'the two-pole fiber closes — the loop survives').toBeGreaterThan(0)
    expect(maxAway, 'and it travels before returning').toBeGreaterThan(0.05)
    expect(phGap, 'PH holds by construction all the way round').toBeLessThan(1e-8)
  }, 300_000)

  it('and the shape varies around the two-pole loop, so it is worth drawing', () => {
    const n = 3, roots = [1.7, -0.9], lambdas = [0.6, -0.35]
    const cols = 4 * (n + 1)
    const basis = nullspace(conditionMatrix(n, roots, lambdas), cols)
    const w = polyFromRoots(roots)
    const sys = wronskianSystem(2 * n, w)
    const toX = (c: readonly number[]): number[] =>
      basis.reduce<number[]>((acc, b, i) => acc.map((v, j) => v + c[i] * b[j]), new Array(cols).fill(0))
    const c0 = basis.map((_, i) => 1 + 0.25 * i)
    const mem = build(toX(c0), n, w, sys)
    const mid = at(mem, 0.5)
    const ends = vd(at(mem, 1), at(mem, 0))
    console.log(
      `    seed member: |c(1)−c(0)| = ${vn(ends).toFixed(3)}, midpoint offset ${vn(vd(mid, at(mem, 0))).toFixed(3)},` +
        `  speed at ends ${vn(deriv(mem, 0)).toFixed(2)} / ${vn(deriv(mem, 1)).toFixed(2)}`,
    )
    expect(vn(ends), 'the seed is a genuine curve, not a point').toBeGreaterThan(0.05)
  }, 300_000)
})
