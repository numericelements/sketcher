import { describe, it, expect } from 'vitest'
import {
  familyJacobian, poly, rational, complex,
  type AlgebraicFamily, type Topology, type WeightedCP,
} from '../index'

// Cross-validation: every EXACT Jacobian backend (analytic / AD) must match the
// universal FD oracle. This is the "validate everything, choose the best" backbone
// (the Rust shape). When a (family, topology, backend) cell is filled, it gets a row
// here; the FD oracle is the same for all, so the matrix is uniform.

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

const makeCurve = (kind: AlgebraicFamily, n: number, s: number): WeightedCP[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    const x = 120 * Math.cos(a) + 11 * Math.sin((2 + s) * a)
    const y = 80 * Math.sin(a) + 9 * Math.cos((3 + s) * a)
    if (kind === 'polynomial') return poly(x, y)
    if (kind === 'rational') return rational(x, y, 0.7 + 0.25 * Math.cos(i + s))
    return complex(x, y, 0.85 + 0.1 * Math.cos(i + s), 0.08 * Math.sin(i + s))
  })

// max |exact - fd| normalized per column by the column's own scale (g has a wide
// dynamic range across columns, so a single global norm would be dominated by one column).
const maxRelColErr = (A: number[][], B: number[][]): number => {
  const nG = A.length, cols = A[0]?.length ?? 0
  let worst = 0
  for (let j = 0; j < cols; j++) {
    let scale = 1e-300, err = 0
    for (let k = 0; k < nG; k++) { scale = Math.max(scale, Math.abs(B[k][j])); err = Math.max(err, Math.abs(A[k][j] - B[k][j])) }
    worst = Math.max(worst, err / scale)
  }
  return worst
}

// (kind, topology, backend) cells currently filled with an exact gradient.
const FILLED: [AlgebraicFamily, Topology, 'analytic' | 'ad'][] = [
  ['polynomial', 'open', 'ad'],
  ['polynomial', 'closed', 'ad'],
  ['rational', 'closed', 'analytic'],
  ['complex', 'closed', 'analytic'],
]

describe('family Jacobian: exact backends match the FD oracle', () => {
  for (const [kind, topology, backend] of FILLED) {
    it(`${kind} / ${topology} / ${backend} ≈ fd`, () => {
      const d = 3
      for (let s = 0; s < 6; s++) {
        const n = 11 + (s % 3)
        const knots = topology === 'open' ? openKnots(n, d) : periodicKnots(n)
        const cps = makeCurve(kind, n, s)
        const exact = familyJacobian(kind, cps, knots, d, topology, backend)
        const fd = familyJacobian(kind, cps, knots, d, topology, 'fd')
        expect(exact.length).toBe(fd.length)
        const e = maxRelColErr(exact, fd)
        expect(e, `${kind}/${topology}/${backend} seed ${s}: rel err ${e.toExponential(2)}`).toBeLessThan(1e-4)
      }
    })
  }

  it('unfilled cells throw a clear "not in the set yet" error (the gap is explicit)', () => {
    const d = 3, n = 10, knots = openKnots(n, d)
    const cps = makeCurve('complex', n, 0)
    // open complex/rational have no exact gradient in core yet → must throw, not silently wrong
    expect(() => familyJacobian('complex', cps, knots, d, 'open', 'analytic')).toThrow(/not in the set yet/)
    expect(() => familyJacobian('rational', cps, knots, d, 'open', 'analytic')).toThrow(/not in the set yet/)
    // FD always works
    expect(() => familyJacobian('complex', cps, knots, d, 'open', 'fd')).not.toThrow()
  })
})
