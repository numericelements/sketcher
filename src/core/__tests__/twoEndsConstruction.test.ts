/**
 * THE TWO-ENDS THEOREM, VALIDATED — hold any prefix + suffix with p + q = m + 2 at arbitrary
 * positions; `twoEndsCurve` completes to a genuine PH curve hitting every held point exactly.
 *
 * This is the numerical verification of the lean-companion's construction (completing the
 * square on the Hopf sandwich; see spatialTwoEnds.ts and docs/SURJECTIVITY.md). It covers all
 * m+3 splits per degree — including both pure cascades (p = 0, q = 0) and the classical
 * quintic Hermite grip (m = 2, p = q = 2) — at degrees 5, 7, 9, 11, plus a wide-spread stress
 * configuration. The construction is EXACT (two cascades + one closed-form Hopf inversion), so
 * the tolerance is machine-level relative to the data scale, not solver-level.
 */
import { describe, expect, it } from 'vitest'
import type { Vec3 } from '../quaternion'
import { controlPoints } from '../phSpatialFreeDragN'
import { twoEndsCurve, twoEndsGrip } from '../spatialTwoEnds'

// Deterministic LCG so every run sees the same configurations.
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const randPoint = (r: () => number, scale: number): Vec3 => ({
  x: (2 * r() - 1) * scale,
  y: (2 * r() - 1) * scale,
  z: (2 * r() - 1) * scale,
})

function maxHeldError(m: number, p: number, targets: readonly Vec3[]): number {
  const curve = twoEndsCurve(m, p, targets)
  expect(curve, `m=${m} p=${p}: construction returned null`).not.toBeNull()
  const pts = controlPoints(curve!)
  const grip = twoEndsGrip(m, p)
  let worst = 0
  grip.forEach((idx, i) => {
    const d = pts[idx]
    const t = targets[i]
    worst = Math.max(worst, Math.hypot(d.x - t.x, d.y - t.y, d.z - t.z))
  })
  return worst
}

describe('the two-ends construction', () => {
  it('hits every held point exactly, all splits, degrees 5–11', () => {
    for (const m of [2, 3, 4, 5]) {
      const splits = Array.from({ length: m + 3 }, (_, p) => p)
      expect(splits.length).toBe(m + 3) // one grip per split — the theorem's coverage count
      for (const p of splits) {
        const r = rng(1000 * m + p)
        for (let cfg = 0; cfg < 3; cfg++) {
          const targets = Array.from({ length: m + 2 }, () => randPoint(r, 2))
          // Exact in exact arithmetic; in floats the deep cascades lose digits to the inverse
          // Bernstein weights (1/cⱼ reaches 252 at m = 5, sandwich terms ~1e8 cancelling to
          // O(1e2) targets). Measured worst cases: 7e-9 (m=4), 1.9e-6 (m=5), all at p ≤ 1 —
          // the deep-right-cascade splits. Same dynamic-range story as FOUNDATIONS F1.
          const tol = m <= 3 ? 1e-9 : m === 4 ? 1e-7 : 1e-5
          expect(maxHeldError(m, p, targets), `m=${m} p=${p} cfg=${cfg}`).toBeLessThan(tol)
        }
      }
    }
  })

  it('survives a wide-spread configuration at degree 9', () => {
    const r = rng(77)
    const targets = Array.from({ length: 6 }, () => randPoint(r, 100))
    for (let p = 0; p <= 6; p++) {
      expect(maxHeldError(4, p, targets), `p=${p}`).toBeLessThan(1e-6)
    }
  })

  it('returns null only on the degenerate first leg', () => {
    const r = rng(5)
    const targets = Array.from({ length: 5 }, () => randPoint(r, 1))
    targets[1] = { ...targets[0] } // P₁ = P₀ with p ≥ 2: nothing for the first sandwich to invert
    expect(twoEndsCurve(3, 3, targets)).toBeNull()
  })
})
