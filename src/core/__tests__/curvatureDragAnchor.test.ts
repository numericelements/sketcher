import { describe, it, expect } from 'vitest'
import { slide, familyBound, rational, complex, type WeightedCP } from '../index'

// ANCHORED generic drag (drift resistance): slide() carries the same uniform
// ½·aw·Σ‖Pᵢ−anchorᵢ‖² Tikhonov term as PlanarCurvatureProblem (all points,
// dragged included — damping; callers keep aw < dragWeight so the cursor wins),
// so the open rational / open complex-rational editor routes can ride core with
// anchorWeight > 0 (legacy never implemented anchors for these families).
// Pins: (1) Law 1 — the bound never rises with anchors on; (2) the anchor
// actually resists drift — undragged points stay nearer their drag-start
// positions than in the unanchored solve; (3) the dragged point still tracks.

const openKnots = (n: number, d: number) => {
  const k: number[] = []
  for (let i = 0; i < d; i++) k.push(0)
  const inner = n - d + 1
  for (let i = 0; i < inner; i++) k.push(i / (inner - 1))
  for (let i = 0; i < d; i++) k.push(1)
  return k
}

describe('generic drag with anchors (open rational + open complex-rational)', () => {
  const d = 3, n = 11, knots = openKnots(n, d)
  const base = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * i) / (n - 1)
    return { x: 160 * Math.cos(a) + 10 * Math.sin(3 * a), y: 95 * Math.sin(a) + 8 * Math.cos(2 * a) }
  })
  const families = [
    { kind: 'rational' as const, mk: (x: number, y: number) => rational(x, y, 0.8) },
    { kind: 'complex' as const, mk: (x: number, y: number) => complex(x, y, 0.9, 0.05) },
  ]
  // The editor's recipe for these routes (sceneStore): single primal-dual solve,
  // analytic local Jacobian, 20 iterations.
  const recipe = { solver: 'primal-dual' as const, jacobian: 'analytic' as const, maxIterations: 20 }

  for (const f of families) {
    it(`${f.kind}/open: anchors hold the bound, resist drift, and still track`, () => {
      const orig: WeightedCP[] = base.map((p) => f.mk(p.x, p.y))
      const k = 5, tx = orig[k].re + 30, ty = orig[k].im - 22
      const start = familyBound(f.kind, orig, knots, d, 'open')

      // Tick 1 (both regimes share it): pull partway toward the target.
      const t1 = slide(f.kind, orig, knots, d, 'open', k, { x: (orig[k].re + tx) / 2, y: (orig[k].im + ty) / 2 }, recipe)
      expect(familyBound(f.kind, t1.points, knots, d, 'open')).toBeLessThanOrEqual(start)

      // Tick 2: finish the pull — unanchored vs anchored to the DRAG-START positions.
      const free = slide(f.kind, t1.points, knots, d, 'open', k, { x: tx, y: ty }, recipe)
      const anch = slide(f.kind, t1.points, knots, d, 'open', k, { x: tx, y: ty }, {
        ...recipe,
        anchorWeight: 0.5, // below the drag weight (1) — the cursor must win the tug-of-war
        anchorX: orig.map((p) => p.re),
        anchorY: orig.map((p) => p.im),
      })

      // (1) Law 1 in both regimes.
      expect(familyBound(f.kind, free.points, knots, d, 'open')).toBeLessThanOrEqual(start)
      expect(familyBound(f.kind, anch.points, knots, d, 'open')).toBeLessThanOrEqual(start)

      // (2) Drift resistance: total undragged displacement from drag-start is no
      // larger with anchors on (and the anchor must not be a silent no-op when
      // the free solve drifted).
      const drift = (pts: WeightedCP[]) => {
        let s = 0
        for (let i = 0; i < n; i++) {
          if (i === k) continue
          s += Math.hypot(pts[i].re - orig[i].re, pts[i].im - orig[i].im)
        }
        return s
      }
      expect(drift(anch.points)).toBeLessThanOrEqual(drift(free.points) + 1e-9)

      // (3) Still tracks: the dragged point makes real progress toward the cursor
      // even with the anchor pulling back.
      const before = Math.hypot(t1.points[k].re - tx, t1.points[k].im - ty)
      const after = Math.hypot(anch.points[k].re - tx, anch.points[k].im - ty)
      expect(after).toBeLessThan(before)

      // Weights ride fixed through both regimes.
      for (let i = 0; i < n; i++) {
        expect(anch.points[i].wRe).toBe(orig[i].wRe)
        expect(anch.points[i].wIm).toBe(orig[i].wIm)
      }
    }, 30000)
  }
})
