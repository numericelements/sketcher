// ============================================================================
// IS THE SOFT LOCUS A COMPONENT? — the numerical evidence behind "soft is absorbing".
//
// A pole of a rational PH curve is SOFT when the numerator is isotropic there. The question this
// answers is not whether that holds at a point but whether it can be UNDONE: starting from a
// member with a soft pole, is there any motion INSIDE the residue variety that makes it hard?
//
// WHY A HESSIAN IS THE RIGHT INSTRUMENT, and why it is well defined. sigma >= 0 everywhere and
// sigma = 0 at a soft pole, so d(sigma) vanishes on the tangent space there. That is exactly the
// condition under which the second derivative restricted to the variety is independent of how you
// retract back onto it — a genuine second fundamental form rather than an artefact of the
// projection. So the number below means something no matter how the corrector is written:
//
//     |H| ~ 0    the soft locus is a COMPONENT — the strata genuinely separate
//     |H| != 0   tangential — escape exists, but only by marching and watching sigma
//
// The tangent space is the kernel of the residue-condition Jacobian WITH a normalisation row
// appended, or the radial direction would sit in the kernel and be mistaken for freedom.
//
// AND A HESSIAN ONLY SETTLES SECOND ORDER, so it is followed by a finite walk: every kernel
// direction and several random combinations, out to delta = 0.3, each Newton-retracted back onto
// the variety. Second order says the escape is not immediate; the walk says there is no escape at
// the distances the editor actually moves.
//
// This is the evidence that came first. The conclusion has an algebraic proof now —
// N(r) = -q(r)*w'(r) gives sigma(r)^2 = <q(r),q(r)>*W'(r)^2, so softness IS isotropy and cannot be
// tuned away — but that identity says softness is an equation, and this says its zero set is a
// COMPONENT. Those are different claims, and the second is the one the atlas needed.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, cmul, cnorm } from '../complex'
import {
  type PoleSet, toSpinor, poleDiagnostics, newtonToResidue, residueConditions, spinorAt,
  hodographRank,
} from '../rationalPHResidue'

const C = (re: number, im = 0): Complex => ({ re, im })
const M4: PoleSet = [C(0.6, 0.9), C(0.6, -0.9), C(-0.5, 0.7), C(-0.5, -0.7)]
const P6: PoleSet = [C(0.6,0.9),C(0.6,-0.9),C(-0.5,0.7),C(-0.5,-0.7),C(1.3,0.4),C(1.3,-0.4)]
const M4_WITNESS: number[] = [
  -2.61410954817405838e-1, -1.02794345890687866e-1, 1.44160147739611499e-1, 3.57770603829519918e-1,
  -3.11332839155708141e-1, 3.37978328087302549e-1, -3.77569614167863332e-1, 3.63845224869703776e-1,
  -2.79058887177438597e-1, -1.18446869927122875e-1, -3.73720961521592926e-2, -2.49469201630884457e-1,
  -1.42605895681224559e-2, 6.86705384466648333e-2, -1.08209948793829780e-1, 7.03363487622871292e-2,
  1.52346407979708637e-1, -4.08096667306168184e-2, -3.18282588727410998e-2, -2.88474360955877418e-1,
]

const sigmaAt = (x: readonly number[], poles: PoleSet, k: number): Complex => {
  let a: Complex = C(0)
  for (const z of spinorAt(toSpinor(x), poles[k])) a = cadd(a, cmul(z, z))
  return a
}

function jac(F: (x: number[]) => number[], x0: readonly number[], h: number): number[][] {
  const rows = F([...x0]).length
  const J = Array.from({ length: rows }, () => new Array(x0.length).fill(0))
  for (let j = 0; j < x0.length; j++) {
    const st = h * Math.max(1, Math.abs(x0[j]))
    const up = [...x0]; up[j] += st
    const dn = [...x0]; dn[j] -= st
    const fu = F(up), fd = F(dn)
    for (let i = 0; i < rows; i++) J[i][j] = (fu[i] - fd[i]) / (2 * st)
  }
  return J
}

/** Orthonormal basis of ker(J): project every standard basis vector, modified Gram-Schmidt. */
function kernelBasis(J: number[][], n: number): number[][] {
  // orthonormalise the ROW space first
  const rowOrth: number[][] = []
  for (const r of J) {
    let w = [...r]
    for (let pass = 0; pass < 2; pass++) {
      for (const u of rowOrth) {
        const d = u.reduce((s, c, i) => s + c * w[i], 0)
        w = w.map((c, i) => c - d * u[i])
      }
    }
    const nn = Math.hypot(...w)
    if (nn > 1e-7 * Math.hypot(...r)) rowOrth.push(w.map((c) => c / nn))
  }
  // then project e_1 … e_n off it and orthonormalise what is left
  const basis: number[][] = []
  for (let k = 0; k < n; k++) {
    let w: number[] = Array.from({ length: n }, (_, i) => (i === k ? 1 : 0))
    for (let pass = 0; pass < 2; pass++) {
      for (const u of [...rowOrth, ...basis]) {
        const d = u.reduce((s, c, i) => s + c * w[i], 0)
        w = w.map((c, i) => c - d * u[i])
      }
    }
    const nn = Math.hypot(...w)
    if (nn > 1e-6) basis.push(w.map((c) => c / nn))
  }
  return basis
}

describe('the soft locus is a component of the residue variety', () => {
  it('the Hessian of sigma on the variety vanishes at a soft pole, and a finite walk agrees',
    { timeout: 600000 }, () => {
    const out: string[] = []
    let worstRelativeHessian = 0
    let worstWalkSigma = 0
    let cases = 0
    let walks = 0
    out.push('Hessian of sigma(r_k) RESTRICTED to the residue variety, at a SOFT pole.')
    out.push('d sigma vanishes on the tangent space there, so the Hessian is retraction-independent.')
    out.push('  ~0  -> the soft locus is a COMPONENT: strata genuinely separate')
    out.push('  !=0 -> tangential: escape exists, but only by marching and WATCHING sigma')
    out.push('')

    const probe = (label: string, x0: number[], poles: PoleSet, k: number, hardK: number) => {
      const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
      // residue rows PLUS the normalisation row, so the radial direction is not in the kernel
      const F = (y: number[]) => [...residueConditions(toSpinor(y), poles, reps),
        y.reduce((s, v) => s + v * v, 0) - 1]
      const J = jac(F, x0, 1e-6)
      const K = kernelBasis(J, x0.length)
      const scale = cnorm(sigmaAt(x0, poles, hardK))       // the hard pole's |sigma|, for units
      const retract = (v: number[]) =>
        newtonToResidue(x0.map((c, i) => c + v[i]), poles, reps, undefined, 200)
      const rows: string[] = []
      for (const h of [0.08, 0.04]) {
        const q = (v: number[]) => {
          const y = retract(v)
          return y ? sigmaAt(y, poles, k) : null
        }
        const single = K.map((e) => q(e.map((c) => c * h)))
        let worst = 0, worstMoved = 0
        for (let i = 0; i < K.length; i++) {
          if (!single[i]) continue
          worst = Math.max(worst, 2 * cnorm(single[i]!) / (h * h))
          for (let j = i + 1; j < K.length; j++) {
            if (!single[j]) continue
            const both = q(K[i].map((c, t) => (c + K[j][t]) * h))
            if (!both) continue
            const v = cnorm({ re: both.re - single[i]!.re - single[j]!.re,
              im: both.im - single[i]!.im - single[j]!.im })
            worst = Math.max(worst, v / (h * h))
          }
          const y = retract(K[i].map((c) => c * h))
          if (y) worstMoved = Math.max(worstMoved, Math.hypot(...y.map((c, t) => c - x0[t])))
        }
        worstRelativeHessian = Math.max(worstRelativeHessian, worst / scale)
        rows.push(`h=${h}: max|H| = ${worst.toExponential(2)}  (relative ${(worst / scale).toExponential(2)})  moved ${worstMoved.toFixed(3)}`)
      }
      cases++
      out.push(`  ${label}   kernel dim ${K.length}   |sigma| at the hard pole ${scale.toExponential(2)}`)
      for (const r of rows) out.push('      ' + r)
    }

    probe('(4,4) mixed witness, soft pole r2', [...M4_WITNESS], M4, 2, 0)

    const sample = (poles: PoleSet, n: number, want: (l: string, r: number) => boolean) => {
      const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
      for (let t = 0; t < 160; t++) {
        const raw = Array.from({ length: 4 * (n + 1) }, (_, i) => (t % 3 === 0
          ? Math.sin(1.7 * i + 2.3 * t + 0.4)
          : t % 3 === 1 ? Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t)
          : Math.sin(0.9 * i - 1.1 * t) * Math.cos(0.5 * i * i + t)))
        const nn = Math.hypot(...raw) || 1
        const x = newtonToResidue(raw.map((v) => v / nn), poles, reps, undefined, 200)
        if (!x) continue
        const A = toSpinor(x)
        const dd = poleDiagnostics(A, poles).filter((q) => !q.real)
        const soft = dd.map((q) => q.softness < 1e-8)
        const l = soft.every(Boolean) ? 'AllSoft' : soft.some(Boolean) ? 'Mixed' : 'AllHard'
        if (want(l, hodographRank(A))) return x
      }
      return null
    }

    const m44 = sample(M4, 4, (l, r) => l === 'Mixed' && r === 3)
    if (m44) {
      const d = poleDiagnostics(toSpinor(m44), M4)
      const softK = d.findIndex((q) => q.softness < 1e-8)
      const hardK = d.findIndex((q) => q.softness > 0.1)
      probe(`(4,4) sampled Mixed, soft pole r${softK}`, m44, M4, softK, hardK)
    }
    const m54 = sample(M4, 5, (l, r) => l === 'Mixed' && r === 3)
    if (m54) {
      const d = poleDiagnostics(toSpinor(m54), M4)
      const softK = d.findIndex((q) => q.softness < 1e-8)
      const hardK = d.findIndex((q) => q.softness > 0.1)
      probe(`CONTROL (5,4) Mixed, soft pole r${softK}`, m54, M4, softK, hardK)
    }
    const m66 = sample(P6, 6, (l, r) => l === 'Mixed' && r === 3)
    if (m66) {
      const d = poleDiagnostics(toSpinor(m66), P6)
      const softK = d.findIndex((q) => q.softness < 1e-8)
      const hardK = d.findIndex((q) => q.softness > 0.1)
      probe(`(6,6) Mixed, soft pole r${softK}`, m66, P6, softK, hardK)
    }
    const m76 = sample(P6, 7, (l, r) => l === 'Mixed' && r === 3)
    if (m76) {
      const d = poleDiagnostics(toSpinor(m76), P6)
      const softK = d.findIndex((q) => q.softness < 1e-8)
      const hardK = d.findIndex((q) => q.softness > 0.1)
      probe(`CONTROL (7,6) Mixed, soft pole r${softK}`, m76, P6, softK, hardK)
    }
    // ---- ALL ORDERS: a FINITE walk over the whole kernel basis, not just second order ----
    out.push('')
    out.push('FINITE walk: every kernel basis direction plus random combinations, delta up to 0.3.')
    out.push('A zero Hessian leaves third order open; a finite walk does not.')
    const walk = (label: string, x0: number[], poles: PoleSet, k: number) => {
      const reps = poles.map((_, i) => i).filter((i) => poles[i].im >= -1e-12)
      const F = (y: number[]) => [...residueConditions(toSpinor(y), poles, reps),
        y.reduce((s, v) => s + v * v, 0) - 1]
      const K = kernelBasis(jac(F, x0, 1e-6), x0.length)
      const dirs: number[][] = [...K]
      for (let t = 0; t < 6; t++) {
        let v = K.reduce<number[]>((acc, e, i2) =>
          acc.map((c, j2) => c + Math.sin(2.7 * i2 + 1.3 * t + 0.4) * e[j2]), new Array(x0.length).fill(0))
        const nn = Math.hypot(...v)
        v = v.map((c) => c / nn)
        dirs.push(v)
      }
      let worstSigma = 0, worstMoved = 0, failed = 0
      for (const d of dirs) {
        for (const delta of [0.1, 0.3]) {
          const y = newtonToResidue(x0.map((c, i2) => c + delta * d[i2]), poles, reps, undefined, 200)
          if (!y) { failed++; continue }
          worstSigma = Math.max(worstSigma, cnorm(sigmaAt(y, poles, k)))
          worstMoved = Math.max(worstMoved, Math.hypot(...y.map((c, i2) => c - x0[i2])))
        }
      }
      walks++
      worstWalkSigma = Math.max(worstWalkSigma, worstSigma)
      out.push(`  ${label}  ${dirs.length} dirs  worst |sigma(r${k})| = ${worstSigma.toExponential(2)}` +
        `  max distance ${worstMoved.toFixed(3)}  (${failed} Newton failures)`)
    }
    walk('(4,4) mixed witness ', [...M4_WITNESS], M4, 2)
    if (m44) walk('(4,4) sampled Mixed ', m44, M4, poleDiagnostics(toSpinor(m44), M4).findIndex((q) => q.softness < 1e-8))
    if (m54) walk('CONTROL (5,4) Mixed ', m54, M4, poleDiagnostics(toSpinor(m54), M4).findIndex((q) => q.softness < 1e-8))
    if (m76) walk('CONTROL (7,6) Mixed ', m76, P6, poleDiagnostics(toSpinor(m76), P6).findIndex((q) => q.softness < 1e-8))

    for (const line of out) console.log('    ' + line)

    // The sampler can come up empty on a bad draw, and a test that quietly probed nothing would
    // pass forever. Say how many cases actually ran, and require the ones the witness guarantees.
    expect(cases, 'the Hessian was probed on at least the pinned witness').toBeGreaterThanOrEqual(1)
    expect(walks, 'and the finite walk ran on it too').toBeGreaterThanOrEqual(1)

    // ~1e-11 relative at worst when this was measured; 1e-9 is machine zero at this conditioning
    expect(worstRelativeHessian, 'sigma has no second-order escape along the variety')
      .toBeLessThan(1e-9)
    // ~3e-14 at worst, after travelling 0.29 in parameter space
    expect(worstWalkSigma, 'and none at finite distance either').toBeLessThan(1e-12)
  })
})
