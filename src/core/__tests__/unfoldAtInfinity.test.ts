// ============================================================================
// THE UNFOLD AT INFINITY — it ports cleanly, and the real preset cannot use it.
//
// unfoldDirection.test.ts does the finite case: at a doubled root r, the direction that leaves the
// singular stratum is found by solving the obstruction q(v) = 0, and the split shows up in the u²
// term as |W(r)| growing from exactly zero. The λ-chart lift's doubled poles are at ∞ instead, so
// the same construction needs the same functional evaluated at the other end of ℙ¹.
//
// AND THAT IS ALL IT NEEDS. W's Bernstein coefficients are x[5k]; its TOP power coefficient is
// Σ_k (−1)^{N−k} C(N,k) W_k, and a root of multiplicity μ at ∞ IS the top μ power coefficients
// vanishing. So "move W(r) off zero" becomes "move the leading coefficient off zero", one
// functional, two ends. On an exact specimen with the λ-chart profile (deg w 1, deg q 4, N = 8,
// W of true degree 2, so multiplicity 6 at ∞ = three doubled poles there):
//
//     u        step residual   after ONE corrector   leading |W|/scale
//     3e-1        6.0e-6            2.0e-11             2.1e-5
//     1e-1        2.2e-7            2.9e-11             2.3e-6
//     3e-2        6.0e-9            6.5e-11             2.1e-7
//     1e-2        1.9e-10           3.6e-11             2.3e-8
//
// Same signature as the finite case: residual ∝ u³ before correcting, machine level after one
// step, and the leading coefficient — EXACTLY zero at u = 0 — growing as u². The pole at infinity
// splits, and W's true degree goes 2 → 8.
//
// WHY THE REAL `lift8` CANNOT BE UNFOLDED, which is the useful half of this file. The construction
// needs a RANK, to know where to cut the kernel. On the exact specimen the spectrum earns it:
//
//     exact   … 2e-9  3e-11 │ 3e-18 2e-18 …        cliff at 25, gap 9e+6
//     lift8   … 5e-6  1e-6  3e-7  6e-8  8e-9 │ 9e-19 …    NO cliff; gap at 25 is 3.0
//
// lift8's residual is 5.4e-13 and √(5.4e-13) ≈ 7e-7 — right inside the band 5e-6 … 8e-9 where its
// spectrum has no gap. So its rank is UNREADABLE in floating point: those values may be genuine or
// may be zeros seen at the resolution limit, and nothing in double precision distinguishes them.
// Assuming 25 from the degree profile gives the wrong kernel, hence the wrong direction: measured,
// the least obstructed direction reads 3.4e-6 instead of 5.9e-12, the corrector lands at 1.7e-5
// instead of 2.0e-11, and the drag afterwards is unchanged at ~78% tracking with a defect of 1e-2.
//
// AND IT CANNOT BE MADE EXACT WHERE IT IS: `hardQuarticMember` uses tan(20°) and 1.3·sin(1.7i+0.6),
// so its coefficients are transcendental. The exact specimen above is the SAME family with rational
// parameters — which makes the recommendation concrete: a lab that wants an unfoldable stuck
// specimen should carry the rational one, where δ is an integer and the slider works.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  q, qNum, qIsZero, exactMember, phDefectQ, liftExact, definingJacobianQ, rankQ, type Q,
} from '../exactRank'
import {
  definingJacobian, residual, pack, unpack, dragControlPoint, controlPoints,
  type ConformalPHCurve,
} from '../conformalPHCurve'
import { bernsteinToPower } from '../conformalPHHopf'
import { conformalNullResidual, readPoles, trueDegreePoly } from '../poleReadout'
import { PRESETS, conformalAsRat } from '../../talks/ph-interpolation/poleLabPresets'
import { frameConformal } from '../../talks/ph-interpolation/PoleLab'
import type { Conformal } from '../conformal'
import { vnorm, vsub } from '../quaternion'

const OUT: string[] = []
const say = (...a: unknown[]): void => { OUT.push(a.join(' ')) }
const allZero = (p: readonly Q[]): boolean => p.every(qIsZero)
const binom = (n: number, k: number): number => {
  let c = 1
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1)
  return c
}
function svd(Ain: readonly (readonly number[])[]): { U: number[][]; s: number[]; V: number[][] } {
  const m = Ain.length, n = Ain[0].length
  const U = Ain.map((r) => [...r])
  const V: number[][] = Array.from({ length: n },
    (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let r = p + 1; r < n; r++) {
      let app = 0, aqq = 0, apq = 0
      for (let i = 0; i < m; i++) { app += U[i][p] ** 2; aqq += U[i][r] ** 2; apq += U[i][p] * U[i][r] }
      if (app * aqq === 0 || Math.abs(apq) < 1e-300) continue
      const o = Math.abs(apq) / Math.sqrt(app * aqq)
      off = Math.max(off, o)
      if (o < 1e-16) continue
      const tau = (aqq - app) / (2 * apq)
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
      const c = 1 / Math.sqrt(1 + t * t), sn = c * t
      for (let i = 0; i < m; i++) { const a = U[i][p], b = U[i][r]; U[i][p] = c * a - sn * b; U[i][r] = sn * a + c * b }
      for (let i = 0; i < n; i++) { const a = V[i][p], b = V[i][r]; V[i][p] = c * a - sn * b; V[i][r] = sn * a + c * b }
    }
    if (off < 1e-15) break
  }
  const s = Array.from({ length: n }, (_, j) => Math.hypot(...U.map((r) => r[j])))
  for (let j = 0; j < n; j++) if (s[j] > 0) for (let i = 0; i < m; i++) U[i][j] /= s[j]
  return { U, s, V }
}

/** Everything the unfold needs, for a state whose EXACT rank is known. */
function unfold(st: ConformalPHCurve, exactRank: number, label: string) {
  const N = st.C.length - 1
  const x0 = pack(st)
  const J = definingJacobian(st)
  const rows = J.length, cols = J[0].length

  let gapAtRank = 0
  const kerOf = (): number[][] => {
    const { U, s } = svd(Array.from({ length: cols }, (_, j) => J.map((r) => r[j])))
    const ord = s.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0])
    const rowSpace = ord.slice(0, exactRank).map(([, i]) => U.map((r) => r[i]))
    const ker: number[][] = ord.slice(exactRank).map(([, i]) => U.map((r) => r[i]))
    for (let j = 0; j < cols && ker.length < cols - exactRank; j++) {
      let v: number[] = Array.from({ length: cols }, (_, k) => (k === j ? 1 : 0))
      for (const b of [...rowSpace, ...ker]) {
        const d = v.reduce((a, x, k) => a + x * b[k], 0)
        const bn = b.reduce((a, x) => a + x * x, 0)
        v = v.map((x, k) => x - (d / bn) * b[k])
      }
      const n2 = Math.hypot(...v)
      if (n2 > 1e-8) ker.push(v.map((x) => x / n2))
    }
    return ker
  }
  const pinv = (b: readonly number[], rank: number): number[] => {
    const rowScale = J.map((row) => Math.hypot(...row) || 1)
    const An = J.map((row, k) => row.map((v) => v / rowScale[k]))
    const bn = b.map((v, k) => v / rowScale[k])
    const { U: Uc, s: sc, V: Vc } = svd(Array.from({ length: cols }, (_, k) => An.map((r) => r[k])))
    const ord = sc.map((v, k) => [v, k] as const).sort((a, b2) => b2[0] - a[0])
    const out = new Array<number>(cols).fill(0)
    for (let k = 0; k < Math.min(rank, ord.length); k++) {
      const [sv, idx] = ord[k]
      if (sv <= 0) continue
      let vb = 0
      for (let a = 0; a < rows; a++) vb += Vc[a][idx] * bn[a]
      const coef = vb / sv
      for (let k2 = 0; k2 < cols; k2++) out[k2] += coef * Uc[k2][idx]
    }
    return out
  }
  const secondOrder = (v: readonly number[]): number[] =>
    residual(unpack(x0.map((c, i) => c + v[i])))
  const obstruction = (v: readonly number[]): number => {
    const r2 = secondOrder(v)
    const w = pinv(r2.map((z) => -z), exactRank)
    const left = J.map((row, i) => row.reduce((a, x, k) => a + x * w[k], 0) + r2[i])
    return Math.hypot(...left) / Math.max(Math.hypot(...r2), 1e-300)
  }

  /**
   * SPLITTING A POLE AT ∞. W's Bernstein coefficients are x[5k]. Its TOP power coefficient is
   * Σ_k (−1)^{N−k} C(N,k) W_k, and a root of multiplicity μ at ∞ is exactly the top μ power
   * coefficients vanishing. So the ∞ analogue of "move W(r) off zero" is "move the leading
   * coefficient off zero" — the same functional, evaluated at the other end of ℙ¹.
   */
  const leadingOf = (x: readonly number[], j: number): number => {
    // coefficient of t^{N−j} in the power basis, from the Bernstein coefficients
    const W = bernsteinToPower(Array.from({ length: N + 1 }, (_, k) => x[5 * k]))
    const scale = Math.max(...W.map(Math.abs), 1e-300)
    return Math.abs(W[N - j] ?? 0) / scale
  }
  const splitInf = (v: readonly number[]): number => {
    let acc = 0
    for (let k = 0; k <= N; k++) acc += (-1) ** (N - k) * binom(N, k) * v[5 * k]
    return acc
  }

  const ker = kerOf()
  say(`  ${label}: degree ${N}, ${rows} rows, ${cols} unknowns, rank ${exactRank},` +
    ` δ = ${4 * N - 1 - exactRank}, kernel ${ker.length}`)
  const Wp = bernsteinToPower(Array.from({ length: N + 1 }, (_, k) => x0[5 * k]))
  const dW = trueDegreePoly([...Wp], 1e-11).length - 1
  say(`      W true degree ${dW} of ${N} → multiplicity ${N - dW} at ∞ = ${(N - dW) / 2} doubled poles there`)
  say(`      residual ${Math.max(...residual(st).map(Math.abs)).toExponential(1)}`)
  {
    const { s: sv } = svd(Array.from({ length: cols }, (_, j) => J.map((r) => r[j])))
    const rel = sv.map((v) => v).sort((a, b) => b - a).map((v, _i, arr) => v / arr[0])
    say(`      spectrum ${rel.map((v) => v.toExponential(0)).join(' ')}`)
    say(`      σ at the assumed rank ${exactRank}: ${rel[exactRank - 1].toExponential(1)},` +
      ` next ${rel[exactRank].toExponential(1)}, gap ${(rel[exactRank - 1] / Math.max(rel[exactRank], 1e-300)).toExponential(0)}`)
    gapAtRank = rel[exactRank - 1] / Math.max(rel[exactRank], 1e-300)
  }

  // Rank the kernel directions by OBSTRUCTION, not by how much they split: the finite case
  // showed the split is second order anyway, arriving through the u²w term, so what matters is
  // that the direction be available.
  const scored = ker.map((e, i) => ({ i, e, obs: obstruction(e), split: Math.abs(splitInf(e)) }))
  scored.sort((a, b) => a.obs - b.obs)
  say(`      obstruction across the kernel: best ${scored[0].obs.toExponential(1)},` +
    ` median ${scored[Math.floor(scored.length / 2)].obs.toExponential(1)},` +
    ` worst ${scored[scored.length - 1].obs.toExponential(1)}`)
  say(`      chosen: direction #${scored[0].i}, obstruction ${scored[0].obs.toExponential(1)},` +
    ` first-order ∞-split ${scored[0].split.toExponential(1)}`)
  const v = scored[0].e
  const w = pinv(secondOrder(v).map((z) => -z), exactRank)
  say('      u        raw residual   after ONE corrector   leading |W|   deg W   ms')
  const out: { u: number; corrected: number[]; res: number; lead: number }[] = []
  for (const u of [0.3, 0.1, 0.03, 0.01]) {
    const xu = x0.map((v0, j) => v0 + u * v[j] + u * u * w[j])
    const raw = Math.max(...residual(unpack(xu)).map(Math.abs))
    const t0 = Date.now()
    // corrector at the CURRENT point (J changes as we move), truncated at the same rank
    let y = [...xu]
    for (let it = 0; it < 2; it++) {
      const Jy = definingJacobian(unpack(y))
      const ry = residual(unpack(y))
      const rowScale = Jy.map((row) => Math.hypot(...row) || 1)
      const An = Jy.map((row, k) => row.map((z) => z / rowScale[k]))
      const bn = ry.map((z, k) => -z / rowScale[k])
      const { U: Uc, s: sc, V: Vc } = svd(Array.from({ length: cols }, (_, k) => An.map((r) => r[k])))
      const ord = sc.map((z, k) => [z, k] as const).sort((a, b2) => b2[0] - a[0])
      const stepv = new Array<number>(cols).fill(0)
      for (let k = 0; k < Math.min(exactRank, ord.length); k++) {
        const [sv, idx] = ord[k]
        if (sv <= 0) continue
        let vb = 0
        for (let a = 0; a < rows; a++) vb += Vc[a][idx] * bn[a]
        const coef = vb / sv
        for (let k2 = 0; k2 < cols; k2++) stepv[k2] += coef * Uc[k2][idx]
      }
      y = y.map((z, k) => z + stepv[k])
    }
    const ms = Date.now() - t0
    const Wy = bernsteinToPower(Array.from({ length: N + 1 }, (_, k) => y[5 * k]))
    const degWy = trueDegreePoly([...Wy], 1e-11).length - 1
    const resY = Math.max(...residual(unpack(y)).map(Math.abs))
    say(`      ${u.toExponential(0).padEnd(7)}  ${raw.toExponential(1)}` +
      `        ${resY.toExponential(1)}            ${leadingOf(y, 0).toExponential(1)}` +
      `       ${degWy}      ${ms}`)
    out.push({ u, corrected: y, res: resY, lead: leadingOf(y, 0) })
  }
  return { path: out, gapAtRank, bestObstruction: scored[0].obs }
}

describe('unfolding a pole at infinity', () => {
  it('works exactly, and says why the transcendental preset cannot use it', () => {
    say('=== A. the EXACT specimen with the same profile as lift8 (deg w 1, deg q 4, N = 8) ===')
    const src = exactMember([q(2)], [q(1, 2)], 2, [1, 0, 0, 0])
    if (!allZero(phDefectQ(src))) throw new Error('not PH')
    const lifted = liftExact(src)
    const exactRank = rankQ(definingJacobianQ(lifted))
    const stEx: ConformalPHCurve = {
      C: lifted.C.map((row) => row.map(qNum) as unknown as Conformal),
      h: lifted.h.map(qNum),
    }
    const exactRun = unfold(stEx, exactRank, 'exact w1 q4')

    say('')
    say('=== B. the REAL lift8, using the rank the exact computation supplies ===')
    const st = frameConformal(PRESETS.find((p) => p.id === 'lift8')!.conformal!)
    const lift8Run = unfold(st, exactRank, 'lift8 (framed)')
    const results = lift8Run.path

    say('')
    say('=== C. does it DRAG afterwards? ===')
    for (const r of [{ u: 0, corrected: pack(st) }, ...results]) {
      const cur = unpack(r.corrected)
      const P = controlPoints(cur)
      const n = cur.C.length - 1
      const chord = vnorm(vsub(P[n], P[0]))
      const to = { x: P[3].x + 0.15 * chord, y: P[3].y + 0.1 * chord, z: P[3].z - 0.05 * chord }
      const want = vnorm(vsub(to, P[3]))
      const t0 = Date.now()
      const got = dragControlPoint(cur, 3, to, { pinEnds: true, iterations: 80 })
      const ms = Date.now() - t0
      const poles = readPoles(conformalAsRat(got.state)).filter((p) => p.numerator > 1e-7)
      say(`      u = ${r.u.toExponential(0).padEnd(7)} drag at the CHEAP budget:` +
        ` tracked ${(100 * (1 - got.trackingError / want)).toFixed(1)}%` +
        `  defect ${got.defect.toExponential(1)}  ⟨C,C⟩ ${conformalNullResidual(got.state).toExponential(1)}` +
        `  ${ms}ms  poles ${poles.map((p) => p.verdict[0]).join('')}`)
    }
    say('')
    say('=== D. the same drags, with a RANK-AWARE step instead of the production one ===')
    const dragSVD = (cur: ConformalPHCurve, index: number, target: { x: number; y: number; z: number },
      iterations: number, cut: number) => {
      const n = cur.C.length - 1
      const before = controlPoints(cur)
      const held = [0, n].filter((i) => i !== index)
      const extra = (sx: ConformalPHCurve): number[] => {
        const P = controlPoints(sx)
        const o = [P[index].x - target.x, P[index].y - target.y, P[index].z - target.z]
        for (const i of held) o.push(P[i].x - before[i].x, P[i].y - before[i].y, P[i].z - before[i].z)
        return o
      }
      let x = pack(cur)
      const cols2 = x.length
      for (let it = 0; it < iterations; it++) {
        const sx = unpack(x)
        const base = definingJacobian(sx)
        const r2 = [...residual(sx), ...extra(sx)]
        const nr = Math.hypot(...r2)
        if (nr < 1e-13) break
        const J2: number[][] = base.map((row) => [...row])
        const P = controlPoints(sx)
        for (const i of [index, ...held]) {
          const Wi = (sx.C[i] as unknown as number[])[0]
          const p = [P[i].x, P[i].y, P[i].z]
          for (let ccc = 0; ccc < 3; ccc++) {
            const row = new Array<number>(cols2).fill(0)
            row[5 * i + 1 + ccc] = 1 / Wi
            row[5 * i] = -p[ccc] / Wi
            J2.push(row)
          }
        }
        const rowScale = J2.map((row) => Math.hypot(...row) || 1)
        const An = J2.map((row, k) => row.map((z) => z / rowScale[k]))
        const bn = r2.map((z, k) => -z / rowScale[k])
        const rows2 = J2.length
        const { U: Uc, s: sc, V: Vc } = svd(
          Array.from({ length: cols2 }, (_, k) => An.map((rr) => rr[k])))
        const ord = sc.map((z, k) => [z, k] as const).sort((a, b2) => b2[0] - a[0])
        const smax = ord[0][0]
        const stepv = new Array<number>(cols2).fill(0)
        for (let k = 0; k < ord.length; k++) {
          const [sv, idx] = ord[k]
          if (sv <= cut * smax) continue
          let vb = 0
          for (let a = 0; a < rows2; a++) vb += Vc[a][idx] * bn[a]
          const coef = vb / sv
          for (let k2 = 0; k2 < cols2; k2++) stepv[k2] += coef * Uc[k2][idx]
        }
        let h = 1
        let took: number[] | null = null
        for (let cuts = 0; cuts < 25; cuts++) {
          const cand = x.map((z, k) => z + h * stepv[k])
          if (cand.every(Number.isFinite)) {
            const sc2 = unpack(cand)
            if (Math.hypot(...residual(sc2), ...extra(sc2)) < nr) { took = cand; break }
          }
          h /= 2
        }
        if (!took) break
        x = took
      }
      const outS = unpack(x)
      return {
        state: outS,
        defect: Math.max(...residual(outS).map(Math.abs)),
        trackingError: vnorm(vsub(controlPoints(outS)[index], target)),
      }
    }
    for (const r of [{ u: 0, corrected: pack(st) }, ...results]) {
      const cur = unpack(r.corrected)
      const P = controlPoints(cur)
      const n = cur.C.length - 1
      const chord = vnorm(vsub(P[n], P[0]))
      const to = { x: P[3].x + 0.15 * chord, y: P[3].y + 0.1 * chord, z: P[3].z - 0.05 * chord }
      const want = vnorm(vsub(to, P[3]))
      const t0 = Date.now()
      const got = dragSVD(cur, 3, to, 40, 1e-10)
      const ms = Date.now() - t0
      say(`      u = ${r.u.toExponential(0).padEnd(7)} rank-aware drag:` +
        ` tracked ${(100 * (1 - got.trackingError / want)).toFixed(1)}%` +
        `  defect ${got.defect.toExponential(1)}  ${ms}ms`)
    }
    for (const line of OUT) console.log(line)

    // the exact specimen unfolds: one corrector reaches machine level, and the leading
    // coefficient grows from EXACTLY zero
    expect(exactRun.bestObstruction, 'the exact kernel has an available direction').toBeLessThan(1e-9)
    expect(exactRun.path[0].res, 'one corrector step is enough there').toBeLessThan(1e-9)
    expect(exactRun.path[0].lead / exactRun.path[2].lead, 'the ∞ split grows as u²')
      .toBeGreaterThan(30)
    expect(exactRun.gapAtRank, 'and its spectrum earns the rank').toBeGreaterThan(1e5)
    // lift8 does not: no cliff, so no rank, so no direction
    expect(lift8Run.gapAtRank, 'lift8 has no cliff at that rank').toBeLessThan(1e2)
    expect(lift8Run.bestObstruction, 'so nothing in its kernel is cleanly available')
      .toBeGreaterThan(1e-9)
  }, 1_800_000)
})
