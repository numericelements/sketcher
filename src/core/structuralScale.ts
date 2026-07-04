// ============================================================================
// STRUCTURAL SCALE of a numerator's Bernstein coefficients — the magnitude
// ENVELOPE (F1's open task, investigation E21).
//
// Run the SAME pipeline that builds g, but in absolute-value arithmetic: every
// input is |input|, every subtraction becomes an addition, every derivative
// takes p·(|c_i| + |c_{i+1}|)/h. The result s_i majorizes both:
//   (1) the coefficient itself:            |g_i| ≤ s_i             (triangle inequality
//       through every operation — B-spline→Bernstein conversion and Bernstein
//       products have POSITIVE weights, so they preserve the envelope), and
//   (2) the accumulated double roundoff:   |fl(g_i) − g_i| ≲ Nops·ε·s_i
//       (standard forward error analysis: each op contributes ≤ ε times the
//       magnitude flowing through it, and s_i IS that magnitude).
//
// So ε·s_i is a PER-COEFFICIENT machine-zero floor — the principled replacement
// for the global 1e-12·max|g| floor that E12-3 proved misclassifies genuine
// small coefficients at scale (specimen #225: a real +3.4e3 sign carrier
// classified as noise against a 2.6e16 max). The envelope is knot-structure
// aware for free: it accumulates the same 1/Δ^6 span factors g does (F1),
// per coefficient, through the actual computation — no a-priori knot formula
// needed, and it prices the clamped-end blowup exactly where it happens.
//
// The laws' one permitted threshold is "separates a true machine-precision
// zero from a nonzero value" — ε·s_i is that separator made per-coefficient.
// ============================================================================
import { BernsteinDecomposition, decomposeToBernstein, decomposeToBernsteinPeriodic } from './bernstein'

/** Nonnegative Bernstein envelope: same algebra, subtraction impossible. */
export class EnvBD {
  readonly bd: BernsteinDecomposition
  constructor(bd: BernsteinDecomposition) {
    this.bd = bd
  }
  add(o: EnvBD): EnvBD {
    return new EnvBD(this.bd.add(o.bd))
  }
  /** Envelope of a−b is the envelope of a+b. */
  sub(o: EnvBD): EnvBD {
    return new EnvBD(this.bd.add(o.bd))
  }
  /** Bernstein product weights are positive → product of envelopes IS the envelope. */
  mul(o: EnvBD): EnvBD {
    return new EnvBD(this.bd.multiply(o.bd))
  }
  scale(s: number): EnvBD {
    return new EnvBD(this.bd.scale(Math.abs(s)))
  }
  /** Envelope derivative: p·(c_i + c_{i+1})/h majorizes |p·(c_{i+1} − c_i)/h|. */
  derivative(): EnvBD {
    const src = this.bd
    const p = src.degree
    if (p === 0) return new EnvBD(new BernsteinDecomposition(src.coeffs.map(() => [0]), src.breaks.slice()))
    const out: number[][] = []
    for (let s = 0; s < src.coeffs.length; s++) {
      const c = src.coeffs[s]
      const interval = src.breaks[s + 1] - src.breaks[s]
      const d: number[] = []
      for (let i = 0; i < p; i++) d.push((p * (c[i + 1] + c[i])) / interval)
      out.push(d)
    }
    return new EnvBD(new BernsteinDecomposition(out, src.breaks.slice()))
  }
  flat(): number[] {
    return this.bd.flatCoeffs()
  }
}

/** Envelope of a coefficient vector's decomposition (conversion weights ≥ 0). */
export function envelopeOf(
  values: readonly number[], knots: readonly number[], degree: number, periodic = false,
): EnvBD {
  const dec = periodic ? decomposeToBernsteinPeriodic : decomposeToBernstein
  return new EnvBD(dec(values.map(Math.abs), knots, degree))
}

/** Complex envelope: per-component nonnegative bounds; ops mirror ComplexBD with − → +. */
export class EnvComplex {
  readonly re: EnvBD
  readonly im: EnvBD
  constructor(re: EnvBD, im: EnvBD) {
    this.re = re
    this.im = im
  }
  add(o: EnvComplex): EnvComplex {
    return new EnvComplex(this.re.add(o.re), this.im.add(o.im))
  }
  sub(o: EnvComplex): EnvComplex {
    return this.add(o)
  }
  mul(o: EnvComplex): EnvComplex {
    return new EnvComplex(
      this.re.mul(o.re).add(this.im.mul(o.im)),
      this.re.mul(o.im).add(this.im.mul(o.re)),
    )
  }
  scale(s: number): EnvComplex {
    return new EnvComplex(this.re.scale(s), this.im.scale(s))
  }
  conj(): EnvComplex {
    return new EnvComplex(this.re, this.im)
  }
  derivative(): EnvComplex {
    return new EnvComplex(this.re.derivative(), this.im.derivative())
  }
}

/**
 * Envelope of the PLANAR curvature-extrema numerator g — the mirror of
 * curvatureExtremaNumeratorPlanar(Periodic) in absolute-value arithmetic.
 */
export function planarNumeratorEnvelope(
  x: readonly number[], y: readonly number[], knots: readonly number[], degree: number,
  periodic = false,
): number[] {
  const X = envelopeOf(x, knots, degree, periodic)
  const Y = envelopeOf(y, knots, degree, periodic)
  const x1 = X.derivative()
  const y1 = Y.derivative()
  const x2 = x1.derivative()
  const y2 = y1.derivative()
  const x3 = x2.derivative()
  const y3 = y2.derivative()
  const crossPrime2 = x1.mul(y2).sub(y1.mul(x2))
  const dot = x1.mul(x2).add(y1.mul(y2))
  const crossPrime3 = x1.mul(y3).sub(y1.mul(x3))
  const normSq = x1.mul(x1).add(y1.mul(y1))
  return normSq.mul(crossPrime3).sub(dot.mul(crossPrime2).scale(3)).flat()
}

/**
 * Envelope of the COMPLEX-rational (Chen) numerator g = Im((D1*)²·T·w̄) — the
 * mirror of curvatureExtremaNumeratorComplex (OPEN chart) in absolute-value
 * arithmetic, including the CP-level homogeneous products Z = w·z.
 */
export function complexNumeratorEnvelope(
  zre: readonly number[], zim: readonly number[], wre: readonly number[], wim: readonly number[],
  knots: readonly number[], degree: number,
): number[] {
  const ZreEnv = zre.map((zr, i) => Math.abs(zr) * Math.abs(wre[i]) + Math.abs(zim[i]) * Math.abs(wim[i]))
  const ZimEnv = zre.map((zr, i) => Math.abs(zr) * Math.abs(wim[i]) + Math.abs(zim[i]) * Math.abs(wre[i]))
  const Z = new EnvComplex(envelopeOf(ZreEnv, knots, degree), envelopeOf(ZimEnv, knots, degree))
  const W = new EnvComplex(envelopeOf(wre, knots, degree), envelopeOf(wim, knots, degree))
  const Zu = Z.derivative()
  const Zuu = Zu.derivative()
  const Zuuu = Zuu.derivative()
  const Wu = W.derivative()
  const Wuu = Wu.derivative()
  const Wuuu = Wuu.derivative()
  const D1 = Zu.mul(W).sub(Z.mul(Wu))
  const D2 = Zuu.mul(W).sub(Z.mul(Wuu))
  const D3 = Zuuu.mul(W).sub(Z.mul(Wuuu))
  const D21 = Zuu.mul(Wu).sub(Zu.mul(Wuu))
  const D1conjSq = D1.conj().mul(D1.conj())
  const bracket = D3.mul(D1).add(D1.mul(D21)).sub(D2.mul(D2).scale(1.5))
  const T = W.mul(bracket).add(D1.mul(Wu.mul(D2).sub(Wuu.mul(D1))).scale(2))
  return D1conjSq.mul(T).mul(W.conj()).im.flat()
}
