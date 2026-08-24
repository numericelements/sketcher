// ============================================================================
// EXACT CONVERSIONS AND FRAMINGS between the two rational-PH models and a view box.
//
// This is mathematics, not drawing, and it lived in PoleLab.tsx (a React component) until the
// design review of 2026-08-24 caught eight core tests importing it from there. Everything here is
// EXACT on the families — each function's comment carries the proof — which is the only reason a
// figure may frame a specimen at all: an approximate framing would change the verdicts the slides
// display.
//
//     conformalAsRat   R^{4,1} member → (P, w, ρ), exactly — one lab can hold both models
//     frame            centre + scale a Rat into a view box; PH survives exactly
//     frameConformal   the same framing as a MATRIX on R^{4,1}; ⟨C,C⟩ scales by λ², so null
//                      survives exactly
//     sampleRational   x(t) = ΣwₖPₖBₖ / ΣwₖBₖ on [0,1] — the shared sampler the framings measure
//                      extent with
// ============================================================================
import { bernsteinMultiply } from './bernstein'
import { type Conformal, project } from './conformal'
import type { ConformalPHCurve } from './conformalPHCurve'
import type { Rat } from './nurbsPH'
import type { Vec3 } from './quaternion'

const tri = (p: readonly number[]): [number, number, number] => [p[0], p[1], p[2]]

const bern = (n: number, t: number): number[] => {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let k = 1; k <= n; k++) {
    for (let j = k; j >= 1; j--) out[j] = out[j] * (1 - t) + out[j - 1] * t
    out[0] *= 1 - t
  }
  return out
}

/** x(t) = Σ wₖPₖBₖ / Σ wₖBₖ, sampled on [0,1]. */
export function sampleRational(rat: Rat, n = 120): [number, number, number][] {
  const d = rat.P.length - 1
  const out: [number, number, number][] = []
  for (let i = 0; i <= n; i++) {
    const b = bern(d, i / n)
    let W = 0
    const q = [0, 0, 0]
    for (let k = 0; k <= d; k++) {
      W += rat.w[k] * b[k]
      for (let c = 0; c < 3; c++) q[c] += rat.w[k] * rat.P[k][c] * b[k]
    }
    if (Math.abs(W) < 1e-12) continue
    out.push([q[0] / W, q[1] / W, q[2] / W])
  }
  return out
}

/**
 * A conformal member as projective (P, w, ρ) data.
 *
 * P = q/W and ρ = h·W, and the conversion is exact rather than a fit: it is why one lab can hold
 * both models. It also means the Möbius preset is a legal starting point for the projective slide,
 * so flipping model does not move the curve.
 */
export function conformalAsRat(s: ConformalPHCurve): Rat {
  const d = s.C.length - 1
  const w = s.C.map((c) => (c as unknown as number[])[0])
  const q = [1, 2, 3].map((i) => s.C.map((c) => (c as unknown as number[])[i]))
  return {
    P: Array.from({ length: d + 1 }, (_, k) => [q[0][k] / w[k], q[1][k] / w[k], q[2][k] / w[k]]),
    w: [...w],
    rho: bernsteinMultiply([...s.h], w),
  }
}

/**
 * Centre and scale a specimen to the view box — EXACTLY, not approximately.
 *
 * Translating the control points leaves N = q′W − qW′ unchanged, because the added term
 * c·(w′W − wW′) is identically zero. Scaling them by λ scales N by λ, hence ρ by λ. So both are
 * exact operations on a PH curve and the framing cannot make a specimen stop being PH.
 */
export function frame(rat: Rat, half = 1.6): Rat {
  const pts = [...sampleRational(rat, 60), ...rat.P.map((p) => tri(p))]
  const lo = [0, 1, 2].map((c) => Math.min(...pts.map((p) => p[c])))
  const hi = [0, 1, 2].map((c) => Math.max(...pts.map((p) => p[c])))
  const mid = [0, 1, 2].map((c) => (lo[c] + hi[c]) / 2)
  const span = Math.max(...[0, 1, 2].map((c) => hi[c] - lo[c]), 1e-9)
  const lam = (2 * half) / span
  return {
    P: rat.P.map((p) => p.map((v, c) => (v - mid[c]) * lam)),
    w: [...rat.w],
    rho: rat.rho.map((v) => v * lam),
  }
}

/**
 * The same framing, applied to a CONFORMAL member — as a matrix, which is the model's whole point.
 *
 * x ↦ λ(x − c) is a similarity, hence a Möbius transformation, hence LINEAR on ℝ^{4,1}. In the
 * basis {o, e₁, e₂, e₃, ∞} where C = [w, q, o∞] and ⟨C,C⟩ = ‖q‖² − 2·w·o∞:
 *
 *     w   ↦ w
 *     q   ↦ λ(q − c·w)
 *     o∞  ↦ λ²(o∞ − ⟨q,c⟩ + ½‖c‖²·w)
 *
 * and ⟨MC,MC⟩ = λ²⟨C,C⟩, so the null condition survives EXACTLY rather than approximately. h
 * scales by λ because ‖p′‖ = h/w and w is untouched.
 *
 * THIS IS WHY THE SPHERE WAS IN THE WRONG PLACE. The first version framed the projective form and
 * left the conformal state alone, so the drawn sphere lived in the specimen's original coordinates
 * while the control points lived in the box — and the cursor was being handed to a solver working
 * in different units, which is why dragging did nothing recognisable.
 */
export function frameConformal(s: ConformalPHCurve, half = 1.6): ConformalPHCurve {
  const pts = s.C.map((c) => project(c)).filter((v): v is Vec3 => v !== null)
  const all = [...pts.map((v) => [v.x, v.y, v.z]), ...sampleRational(conformalAsRat(s), 60)]
  const lo = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k])))
  const hi = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k])))
  const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2)
  const span = Math.max(...[0, 1, 2].map((k) => hi[k] - lo[k]), 1e-9)
  const lam = (2 * half) / span
  const cc = c[0] * c[0] + c[1] * c[1] + c[2] * c[2]
  return {
    C: s.C.map((v) => {
      const w = v[0]
      const q = [v[1], v[2], v[3]]
      const qc = q[0] * c[0] + q[1] * c[1] + q[2] * c[2]
      return [
        w,
        lam * (q[0] - c[0] * w),
        lam * (q[1] - c[1] * w),
        lam * (q[2] - c[2] * w),
        lam * lam * (v[4] - qc + 0.5 * cc * w),
      ] as unknown as Conformal
    }),
    h: s.h.map((v) => v * lam),
  }
}
