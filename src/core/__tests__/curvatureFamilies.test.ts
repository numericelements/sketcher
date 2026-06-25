import { describe, it, expect } from 'vitest'
import {
  ALGEBRAIC_FAMILIES, TOPOLOGIES, familyBound, familyMarkers,
  poly, rational, complex, type AlgebraicFamily, type Topology, type WeightedCP,
} from '../index'

// The uniform face: one loop exercises every algebraic family × topology. Adding a
// family/topology cell to the set extends this coverage automatically — no per-family
// test duplication. (PH joins once its numerator is ported into core.)

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}
const periodicKnots = (n: number) => Array.from({ length: n }, (_, i) => i / n)

// A non-degenerate curve of the given family, parameterized by seed.
const makeCurve = (kind: AlgebraicFamily, n: number, s: number): WeightedCP[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    const x = 150 * Math.cos(a) + 14 * Math.sin((2 + s) * a)
    const y = 95 * Math.sin(a) + 11 * Math.cos((3 + s) * a)
    if (kind === 'polynomial') return poly(x, y)
    if (kind === 'rational') return rational(x, y, 0.6 + 0.3 * (1 + Math.cos(i + s)))
    return complex(x, y, 0.8 + 0.2 * Math.cos(i + s), 0.1 * Math.sin(i * 1.2 + s))
  })

describe('curvature family set: uniform Law 1 across the whole matrix', () => {
  for (const kind of ALGEBRAIC_FAMILIES) {
    for (const topology of TOPOLOGIES) {
      it(`${kind} / ${topology}: S⁻ ≥ markers (and finite)`, () => {
        const d = 3
        for (let s = 0; s < 12; s++) {
          const n = 10 + (s % 4)
          const knots = topology === 'open' ? openKnots(n, d) : periodicKnots(n)
          const cps = makeCurve(kind, n, s)
          const S = familyBound(kind, cps, knots, d, topology)
          const Z = familyMarkers(kind, cps, knots, d, topology).length
          expect(Number.isFinite(S)).toBe(true)
          expect(S, `${kind}/${topology} seed ${s}: S⁻=${S} < markers=${Z}`).toBeGreaterThanOrEqual(Z)
          if (topology === 'closed') expect(S % 2, `${kind}/${topology} seed ${s}: closed bound ${S} must be even`).toBe(0)
        }
      })
    }
  }
})

describe('curvature family set: specialization chain (poly ⊂ rational ⊂ complex)', () => {
  // The single representation is consistent: a rational with w ≡ 1 and a complex with
  // w ≡ (1,0) must give the SAME bound as the polynomial of the same points.
  const d = 3, n = 12, knots = periodicKnots(n), topo: Topology = 'closed'
  const pts = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return { x: 160 * Math.cos(a) + 12 * Math.sin(3 * a), y: 96 * Math.sin(a) } })

  it('rational(w=1) and complex(w=(1,0)) match polynomial', () => {
    const P = pts.map((p) => poly(p.x, p.y))
    const R = pts.map((p) => rational(p.x, p.y, 1))
    const C = pts.map((p) => complex(p.x, p.y, 1, 0))
    const bP = familyBound('polynomial', P, knots, d, topo)
    expect(familyBound('rational', R, knots, d, topo)).toBe(bP)
    expect(familyBound('complex', C, knots, d, topo)).toBe(bP)
  })
})
