import { BernsteinDecomposition, decomposeBsplineGeneric } from './bernstein'
import { complexCoeffs } from './coeffs'
import type { Complex } from './complex'
import type { ComplexPoint } from './types'

/**
 * A complex-valued B-spline function in Bernstein form: real and imaginary
 * parts are each a BernsteinDecomposition. Complex arithmetic on top of the
 * real B-spline-function algebra — used to assemble the complex-rational
 * curvature numerator.
 */
export class ComplexBD {
  readonly re: BernsteinDecomposition
  readonly im: BernsteinDecomposition

  constructor(re: BernsteinDecomposition, im: BernsteinDecomposition) {
    this.re = re
    this.im = im
  }

  add(o: ComplexBD): ComplexBD {
    return new ComplexBD(this.re.add(o.re), this.im.add(o.im))
  }
  sub(o: ComplexBD): ComplexBD {
    return new ComplexBD(this.re.subtract(o.re), this.im.subtract(o.im))
  }
  mul(o: ComplexBD): ComplexBD {
    return new ComplexBD(
      this.re.multiply(o.re).subtract(this.im.multiply(o.im)),
      this.re.multiply(o.im).add(this.im.multiply(o.re)),
    )
  }
  scale(s: number): ComplexBD {
    return new ComplexBD(this.re.scale(s), this.im.scale(s))
  }
  conj(): ComplexBD {
    return new ComplexBD(this.re, this.im.scale(-1))
  }
  derivative(): ComplexBD {
    return new ComplexBD(this.re.derivative(), this.im.derivative())
  }
  /** Gather a (possibly wrapping) span list — closed-curve locality. See BernsteinDecomposition.gather. */
  gather(spans: readonly number[]): ComplexBD {
    return new ComplexBD(this.re.gather(spans), this.im.gather(spans))
  }
  /** Restrict to the contiguous span run [start, end) — open-curve locality. See BernsteinDecomposition.subset. */
  subset(start: number, end: number): ComplexBD {
    return new ComplexBD(this.re.subset(start, end), this.im.subset(start, end))
  }
}

/**
 * Decompose a CLOSED complex-rational curve into its homogeneous Bernstein parts
 * Z = w·z (numerator) and W = w (denominator), with the periodic weight SPIRAL
 * folded in: a curve with monodromy ρ = wrapWeight/w₀ ≠ 1 satisfies W(t+P) = ρ·W(t),
 * so the wrap-span coefficients are scaled by ρ^(wraps). One pass over `complexCoeffs`
 * (which carries both c0=Z and c1=W); ρ defaults to 1 (the ordinary periodic case,
 * bit-identical to decomposing Zre/Zim/wre/wim as four scalar periodic splines).
 */
export function decomposeComplexCurvePeriodic(
  controlPoints: readonly ComplexPoint[],
  knots: readonly number[],
  degree: number,
  spiralRatio: Complex = { re: 1, im: 0 },
): { Z: ComplexBD; W: ComplexBD } {
  const { coeffs, breaks } = decomposeBsplineGeneric(complexCoeffs, controlPoints, knots, degree, true, spiralRatio)
  const Zre: number[][] = [], Zim: number[][] = [], Wre: number[][] = [], Wim: number[][] = []
  for (const seg of coeffs) {
    Zre.push(seg.map((h) => h.c0.re)); Zim.push(seg.map((h) => h.c0.im))
    Wre.push(seg.map((h) => h.c1.re)); Wim.push(seg.map((h) => h.c1.im))
  }
  return {
    Z: new ComplexBD(new BernsteinDecomposition(Zre, breaks), new BernsteinDecomposition(Zim, breaks)),
    W: new ComplexBD(new BernsteinDecomposition(Wre, breaks), new BernsteinDecomposition(Wim, breaks)),
  }
}
