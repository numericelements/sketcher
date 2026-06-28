// Thin adapter: the open-PH hodograph-matching fit now lives in CORE (src/core/phFit.ts,
// fitOpenPHSpline). This wraps the core result (a plain generator+curve) into the sketcher's
// PHCurveResult/PHMetadata — the layer boundary (core must not depend on sketcher types).
// Validated control-point-identical to the original (src/core/__tests__/phFit.test.ts).

import { fitOpenPHSpline } from '../../core'
import type { PHCurveResult } from './phCurve'
import type { Point2D } from '../types/curve'

export interface PHSplineFitOptions {
  /** Generator degree: 2 → quintic PH, C² joins (default). 3 → degree-7, C³. */
  generatorDegree?: number
  /** Samples per stroke span for the √h least-squares fit (default 12). */
  samplesPerSpan?: number
}

/**
 * Fit a polynomial PH spline to an open B-spline `{controlPoints, knots}` by hodograph
 * matching (the √h linear least-squares trick). Computation is core's `fitOpenPHSpline`;
 * this only attaches the PHMetadata. Returns null if the input is too small / the solve fails.
 */
export function fitPHSplineToBSpline(
  controlPoints: Point2D[],
  knots: number[],
  options: PHSplineFitOptions = {},
): PHCurveResult | null {
  const degree = knots.length - controlPoints.length - 1
  const f = fitOpenPHSpline(controlPoints, knots, degree, options)
  if (!f) return null
  return {
    controlPoints: f.controlPoints,
    knots: f.knots,
    degree: f.degree,
    metadata: {
      kind: 'polynomial',
      uvDegree: f.uvDegree,
      uControlPoints: f.uControlPoints,
      vControlPoints: f.vControlPoints,
      uvKnots: f.uvKnots,
      origin: f.origin,
    },
  }
}
