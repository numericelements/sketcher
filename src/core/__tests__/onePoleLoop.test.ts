// ============================================================================
// DOES THE ONE-POLE RATIONAL FIBER CLOSE? — the gate on building the figure.
//
// The polynomial cubic's fiber is beautiful for three reasons and only one is mathematical: it CLOSES,
// so you can sweep it and come back; you can see all of it at once; and it has a punchline (arc length
// is constant on it). The rational fiber as measured so far is a ROAD — it has none of those.
//
// But the one-pole family mixes TWO kinds of freedom:
//
//   · a HOPF PHASE — prescribing c′(0) pins 𝒜(0) only up to a circle. COMPACT. This is the same thing
//     that closes the polynomial ellipse.
//   · λ and r — twist, and the pole. NON-COMPACT. This is the road.
//
// So the claim to test: HOLD λ and r, and what is left should be a closed loop. Counting, at degree 4:
// 8 free parameters (B₀, B₂) − 6 data conditions − 1 gauge = 1 dimension. Walk it and see if it returns.
//
// If it closes, the figure is worth building: a loop you can sweep, plus two NAMED sliders (twist, pole)
// that deform it, the second with a visible geometric end. If it does not, the beauty is not there and
// the figure should not be built — which is why this is a gate and not a demonstration.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Quat, QUAT_I, qadd, qconj, qmul, qscale, qvec } from '../quaternion'
import { leastSquares } from '../linalg'

type RPoly = number[]
type Vec = { x: number; y: number; z: number }
const Q = (u: number, v: number, p: number, q: number): Quat => ({ u, v, p, q })
const rEval = (p: RPoly, t: number): number => p.reduceRight((a, c) => a * t + c, 0)
const vsub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const vnorm = (a: Vec): number => Math.hypot(a.x, a.y, a.z)
const vcross = (a: Vec, b: Vec): Vec => ({
  x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x,
})

const LAMBDA = 0.6
const R = 1.7

/** parameters: B₀ (4 reals) then B₂ (4 reals); λ and r are HELD. */
function build(prm: readonly number[]): { p: RPoly[]; w: RPoly; N: RPoly[]; sigma: RPoly } {
  const B0 = Q(prm[0], prm[1], prm[2], prm[3])
  const B2 = Q(prm[4], prm[5], prm[6], prm[7])
  const B1 = qscale(qmul(B0, QUAT_I), LAMBDA)
  // Taylor about R → power basis, degree 2
  const A: Quat[] = [
    qadd(qadd(B0, qscale(B1, -R)), qscale(B2, R * R)),
    qadd(B1, qscale(B2, -2 * R)),
    B2,
  ]
  const deg = 4
  const N = [new Array(deg + 1).fill(0), new Array(deg + 1).fill(0), new Array(deg + 1).fill(0)]
  const sigma = new Array(deg + 1).fill(0)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const v = qvec(qmul(qmul(A[i], QUAT_I), qconj(A[j])))
    N[0][i + j] += v.x; N[1][i + j] += v.y; N[2][i + j] += v.z
    sigma[i + j] += qmul(A[i], qconj(A[j])).u
  }
  const p: RPoly[] = []
  for (let c = 0; c < 3; c++) {
    const f = new Array(deg + 1).fill(0)
    for (let e = deg; e >= 2; e--) f[e] = (N[c][e] + (e + 1 <= deg ? R * (e + 1) * f[e + 1] : 0)) / (e - 1)
    f[0] = 0
    f[1] = -N[c][0] / R
    p.push(f)
  }
  return { p, w: [-R, 1], N, sigma }
}

type M = ReturnType<typeof build>
const at = (m: M, t: number): Vec => {
  const wv = rEval(m.w, t)
  return { x: rEval(m.p[0], t) / wv, y: rEval(m.p[1], t) / wv, z: rEval(m.p[2], t) / wv }
}
const deriv = (m: M, t: number): Vec => {
  const w2 = Math.pow(rEval(m.w, t), 2)
  return { x: rEval(m.N[0], t) / w2, y: rEval(m.N[1], t) / w2, z: rEval(m.N[2], t) / w2 }
}
/** The data: c′(0) and c(1) — c(0) is the origin by construction. */
const readout = (prm: readonly number[]): number[] => {
  const m = build(prm)
  const d0 = deriv(m, 0), e1 = at(m, 1)
  return [d0.x, d0.y, d0.z, e1.x, e1.y, e1.z]
}
/** A curve-level signature, for detecting the return. */
const signature = (prm: readonly number[]): number[] => {
  const m = build(prm)
  return [0.2, 0.4, 0.6, 0.8].flatMap((t) => { const v = at(m, t); return [v.x, v.y, v.z] })
}
/** The gauge tangent: 𝒜 ↦ 𝒜(1 + εi) is (B₀i, B₂i) in these coordinates. */
function gaugeTangent(prm: readonly number[]): number[] {
  const b0i = qmul(Q(prm[0], prm[1], prm[2], prm[3]), QUAT_I)
  const b2i = qmul(Q(prm[4], prm[5], prm[6], prm[7]), QUAT_I)
  return [b0i.u, b0i.v, b0i.p, b0i.q, b2i.u, b2i.v, b2i.p, b2i.q]
}
const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0)
const scale = (a: readonly number[], k: number): number[] => a.map((v) => v * k)

const jacobian = (prm: readonly number[]): number[][] => {
  const base = readout(prm)
  return base.map((_, k) => prm.map((_, j) => {
    const e = 1e-7
    const hi = prm.slice(); hi[j] += e
    const lo = prm.slice(); lo[j] -= e
    return (readout(hi)[k] - readout(lo)[k]) / (2 * e)
  }))
}

/** Project a probe onto the nullspace of J, then strip the gauge direction. */
function fiberTangent(prm: readonly number[], probe: readonly number[]): number[] | null {
  const J = jacobian(prm)
  const Jp = J.map((row) => dot(row, probe))
  let corr: number[]
  try { corr = leastSquares(J, Jp, 1e-12) } catch { return null }
  let n = probe.map((v, i) => v - corr[i])
  const g = gaugeTangent(prm)
  const gn = Math.hypot(...g)
  if (gn > 0) {
    const gh = scale(g, 1 / gn)
    n = n.map((v, i) => v - dot(n, gh) * gh[i])
  }
  const len = Math.hypot(...n)
  return len > 1e-9 ? scale(n, 1 / len) : null
}

/** Correct back onto the prescribed data by min-norm Gauss-Newton. */
function project(prm: readonly number[], target: readonly number[]): number[] {
  let x = prm.slice()
  for (let it = 0; it < 40; it++) {
    const r = readout(x).map((v, i) => v - target[i])
    if (Math.hypot(...r) < 1e-13) break
    const J = jacobian(x)
    let step: number[]
    try { step = leastSquares(J, r.map((v) => -v), 1e-12) } catch { break }
    x = x.map((v, j) => v + step[j])
  }
  return x
}

const SEED = [1.0, 0.3, -0.4, 0.2, 0.25, -0.5, 0.15, 0.35]

describe('the one-pole fiber with twist and pole HELD', () => {
  it('is one-dimensional, as counted', () => {
    const J = jacobian(SEED)
    // rank of the 6x8 data Jacobian
    const G = J.map((a) => J.map((b) => dot(a, b)))
    // crude but adequate: the smallest diagonal of a Cholesky-like reduction
    let rank = 0
    const A = G.map((row) => row.slice())
    for (let c = 0; c < 6; c++) {
      let piv = c
      for (let r2 = c; r2 < 6; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2
      ;[A[c], A[piv]] = [A[piv], A[c]]
      if (Math.abs(A[c][c]) < 1e-16 * Math.abs(A[0][0])) continue
      rank++
      for (let r2 = c + 1; r2 < 6; r2++) {
        const f = A[r2][c] / A[c][c]
        for (let cc = c; cc < 6; cc++) A[r2][cc] -= f * A[c][cc]
      }
    }
    const fiber = 8 - rank - 1
    console.log(`    8 params − rank ${rank} − 1 gauge = fiber ${fiber}`)
    expect(rank, 'the six data conditions are independent').toBe(6)
    expect(fiber, 'one dimension left, as counted').toBe(1)
  })

  it('AND IT CLOSES — a loop, not a road', () => {
    const target = readout(SEED)
    const sig0 = signature(SEED)
    let x = SEED.slice()
    let tangent = fiberTangent(x, [0, 0, 0, 0, 1, 0, 0, 0]) ?? fiberTangent(x, [1, 0, 0, 0, 0, 0, 0, 0])
    expect(tangent, 'the fiber has a tangent').not.toBeNull()
    const h = 0.02
    let path = 0
    let closedAt = -1
    let maxAway = 0
    const away: number[] = []
    for (let step = 1; step <= 900; step++) {
      if (!tangent) break
      const proposed = x.map((v, i) => v + h * tangent![i])
      const corrected = project(proposed, target)
      const err = Math.hypot(...readout(corrected).map((v, i) => v - target[i]))
      if (err > 1e-9) break
      const moved = Math.hypot(...corrected.map((v, i) => v - x[i]))
      path += moved
      x = corrected
      const next = fiberTangent(x, tangent)
      tangent = next && dot(next, tangent) < 0 ? scale(next, -1) : next
      const gap = Math.hypot(...signature(x).map((v, i) => v - sig0[i])) / Math.hypot(...sig0)
      away.push(gap)
      maxAway = Math.max(maxAway, gap)
      if (step > 40 && gap < 2e-3) { closedAt = step; break }
    }
    console.log(
      `    walked ${away.length} steps, path ${path.toFixed(2)} in parameter space;` +
        `  furthest from the start ${maxAway.toFixed(3)} (relative)`,
    )
    console.log(
      `    returned at step ${closedAt > 0 ? closedAt : 'never'}` +
        (closedAt > 0 ? `, closure gap ${away[away.length - 1].toExponential(1)}  <- a LOOP` : '  <- a ROAD'),
    )
    expect(closedAt, 'the fiber returns to its starting curve — it is a loop').toBeGreaterThan(0)
    expect(maxAway, 'and it genuinely travels before returning').toBeGreaterThan(0.05)
  }, 300_000)

  it('and the loop is worth looking at: the shape really varies along it', () => {
    // A gauge orbit would return too, and be invisible. Measure that the SHAPE changes: out-of-plane
    // content and curvature spread, sampled around the loop.
    const target = readout(SEED)
    let x = SEED.slice()
    let tangent = fiberTangent(x, [0, 0, 0, 0, 1, 0, 0, 0])
    const shapes: { flat: number; kSpread: number }[] = []
    for (let step = 0; step < 240 && tangent; step++) {
      const m = build(x)
      const ts = [0.15, 0.35, 0.5, 0.65, 0.85]
      const ks = ts.map((t) => {
        const e = 1e-4
        const a = at(m, t - e), b = at(m, t), c = at(m, t + e)
        const d1 = { x: (c.x - a.x) / (2 * e), y: (c.y - a.y) / (2 * e), z: (c.z - a.z) / (2 * e) }
        const d2 = {
          x: (c.x - 2 * b.x + a.x) / (e * e), y: (c.y - 2 * b.y + a.y) / (e * e), z: (c.z - 2 * b.z + a.z) / (e * e),
        }
        return vnorm(vcross(d1, d2)) / Math.pow(vnorm(d1), 3)
      })
      // out-of-plane: distance of the midpoint from the plane of the two ends and the start tangent
      const n = vcross(deriv(m, 0), vsub(at(m, 1), at(m, 0)))
      const nn = vnorm(n)
      const mid = vsub(at(m, 0.5), at(m, 0))
      const flat = nn > 0 ? Math.abs((mid.x * n.x + mid.y * n.y + mid.z * n.z) / nn) : 0
      shapes.push({ flat, kSpread: Math.max(...ks) - Math.min(...ks) })
      const proposed = x.map((v, i) => v + 0.02 * tangent![i])
      const corrected = project(proposed, target)
      if (Math.hypot(...readout(corrected).map((v, i) => v - target[i])) > 1e-9) break
      x = corrected
      const next = fiberTangent(x, tangent)
      tangent = next && dot(next, tangent) < 0 ? scale(next, -1) : next
    }
    const flats = shapes.map((s) => s.flat)
    const kss = shapes.map((s) => s.kSpread)
    console.log(
      `    over ${shapes.length} samples of the loop:  out-of-plane ${Math.min(...flats).toFixed(3)}` +
        ` … ${Math.max(...flats).toFixed(3)}   κ-spread ${Math.min(...kss).toFixed(2)} … ${Math.max(...kss).toFixed(2)}`,
    )
    expect(Math.max(...flats) - Math.min(...flats), 'the out-of-plane content varies').toBeGreaterThan(1e-2)
    expect(Math.max(...kss) - Math.min(...kss), 'and so does the curvature').toBeGreaterThan(1e-2)
  }, 300_000)
})
