// Core-level unit test for slideRationalFarin — the 1-D count-guarded ratio walk,
// exercised WITHOUT the editor store (the sibling store test is
// sketcher/store/rationalFarinEditorDrag.test.ts). Contract (E27): the handle rides
// its edge at t = w₁/(w₀+w₁); the drag is a single real ratio; the RAW-count bound
// (open linear / closed cyclic) is held every tick and t advances toward the target.
import { describe, it, expect } from 'vitest'
import {
  slideRationalFarin,
  curvatureExtremaNumeratorComplex,
  curvatureExtremaNumeratorComplexPeriodic,
  assignSignsNeighbor,
  cyclicSignChanges,
} from '../index'

function fixture(closed: boolean) {
  const n = closed ? 12 : 10
  const x: number[] = []
  const y: number[] = []
  const w: number[] = []
  for (let i = 0; i < n; i++) {
    if (closed) {
      const a = (2 * Math.PI * i) / n
      x.push(170 * Math.cos(a) + 16 * Math.sin(3 * a))
      y.push(95 * Math.sin(a) - 10 * Math.cos(2 * a))
    } else {
      x.push(40 + 28 * i)
      y.push(120 + 70 * Math.sin((Math.PI * i) / 5))
    }
    w.push(1 + 0.1 * Math.sin(i * 1.7))
  }
  const knots: number[] = []
  if (closed) for (let i = 0; i < n; i++) knots.push(i / n)
  else {
    for (let i = 0; i < 4; i++) knots.push(0)
    for (let i = 1; i < n - 3; i++) knots.push(i / (n - 3))
    for (let i = 0; i < 4; i++) knots.push(1)
  }
  return { n, x, y, w, knots, degree: 3 }
}

const zeros = (n: number) => new Array<number>(n).fill(0)

function boundOf(
  x: readonly number[], y: readonly number[], w: readonly number[],
  knots: readonly number[], degree: number, closed: boolean, wrapWeight?: number,
) {
  if (!closed)
    return cyclicSignChanges(
      assignSignsNeighbor(curvatureExtremaNumeratorComplex(x, y, w, zeros(w.length), knots, degree).flatCoeffs()),
      false,
    )
  const wrap = wrapWeight ?? w[0]
  return cyclicSignChanges(
    assignSignsNeighbor(
      curvatureExtremaNumeratorComplexPeriodic(x, y, w, zeros(w.length), knots, degree, { re: wrap / w[0], im: 0 }).flatCoeffs(),
    ),
    true,
  )
}

// t = w₁/(w₀+w₁) on the dragged edge (wrap edge on closed uses wrapWeight as w₁).
function tOf(w: readonly number[], edge: number, closed: boolean, wrapWeight?: number) {
  const n = w.length
  const isWrap = closed && edge === n - 1
  const w0 = w[edge]
  const w1 = isWrap ? (wrapWeight ?? w[0]) : w[(edge + 1) % n]
  return w1 / (w0 + w1)
}

describe('slideRationalFarin (core 1-D count-guarded ratio walk)', () => {
  it('open + closed (incl. wrap edge): t advances to the target, RAW bound held every tick', () => {
    for (const [closed, edge] of [[false, 4], [true, 3], [true, 11]] as const) {
      const f = fixture(closed)
      let { x, y, w, knots, degree } = f
      let wrapWeight: number | undefined = closed ? w[0] : undefined
      const startB = boundOf(x, y, w, knots, degree, closed, wrapWeight)
      const t0 = tOf(w, edge, closed, wrapWeight)
      const tGoal = 0.75

      for (let s = 1; s <= 5; s++) {
        const tt = t0 + (tGoal - t0) * (s / 5)
        const closedOpt = closed ? { closed: { wrapWeight: wrapWeight! } } : {}
        const r = slideRationalFarin(x, y, w, knots, degree, edge, tt, closedOpt)
        w = r.weights
        if (closed) wrapWeight = r.wrapWeight
        const b = boundOf(x, y, w, knots, degree, closed, wrapWeight)
        expect(b, `${closed ? 'closed' : 'open'} edge ${edge} tick ${s}: bound rose ${startB}→${b}`).toBeLessThanOrEqual(startB)
      }

      const tEnd = tOf(w, edge, closed, wrapWeight)
      expect(
        tEnd,
        `${closed ? 'closed' : 'open'} edge ${edge}: t did not advance (t0 ${t0.toFixed(3)} → ${tEnd.toFixed(3)})`,
      ).toBeGreaterThan(t0 + 0.03)
    }
  }, 60000)

  it('the drag touches ONLY weights on/after the edge — geometry (x,y) is untouched', () => {
    const f = fixture(false)
    const r = slideRationalFarin(f.x, f.y, f.w, f.knots, f.degree, 4, 0.7)
    // slideRationalFarin returns weights only; x/y are pure inputs. The prefix weights
    // (before the edge) are fixed points of the suffix scale — assert they are unchanged.
    for (let j = 0; j <= 4; j++) {
      expect(r.weights[j], `prefix weight ${j} moved`).toBeCloseTo(f.w[j], 10)
    }
  }, 30000)
})
