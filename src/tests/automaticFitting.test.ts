import { create_BSplineR1toR2 } from "../bsplines/R1toR2/BSplineR1toR2"
import { approximateArcLengthParametrization, cumulativeFeatureFunction, knotDistribution, leastSquareApproximation } from "../bsplines/knotPlacement/automaticFitting"


it ("returns a b-spline with an approximate arc length parametrization", () => {
    const spline = create_BSplineR1toR2([[0, 0], [1, 1], [2, 0]], [0, 0, 0, 1, 1, 1])
    const newSpline = approximateArcLengthParametrization(spline)
    expect(newSpline.knots.length).toBe(6)
    const spline1 = create_BSplineR1toR2([[0, 0], [1, 1], [2, 1], [3, 0]], [0, 0, 0, 0.9, 1, 1, 1])
    const newSpline1 = approximateArcLengthParametrization(spline1)
    expect(newSpline1.knots.length).toBe(7)
    expect(newSpline1.knots[3]).toBeCloseTo(0.5908831985120645)
})

it ("returns the cumulative feature function", () => {
    const spline1 = create_BSplineR1toR2([[0, 0], [1, 1], [2, 1], [3, 0], [4, 0], [5, 1], [6, 0]], [0, 0, 0, 0, 0,  0.1, 0.5, 1, 1, 1, 1, 1])
    const cff = cumulativeFeatureFunction(spline1, spline1.degree - 1)
    //expect(cff.xs.length).toBe(3)
    //expect(cff.ys.length).toBe(3)
    //expect(cff.ys[1]).toBeLessThan(cff.ys[2])
    console.log(spline1.degree)
    console.log(cff)
})

it ("returns a new knot distribution from the cumulative feature function", () => {
    const spline0 = create_BSplineR1toR2([[0, 0], [1, 1], [2, 1], [3, 0]], [0, 0, 0, 0, 1, 1, 1, 1])
    const spline1 = spline0.elevateDegree()
    const cff = cumulativeFeatureFunction(spline1, 4)
    expect(cff.ys.length).toBe(2)
    expect(cff.ys[0]).toBeCloseTo(0)
    expect(cff.ys[1]).toBeCloseTo(0)
    const knots = knotDistribution(cff, 3)
    //expect(knots.length).toBe(7)
    const spline2 = create_BSplineR1toR2([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5]], [0, 0, 0, 0, 0, 0.5, 1, 1, 1, 1, 1])
    const cff2 = cumulativeFeatureFunction(spline2, 4)
    const knots2 = knotDistribution(cff2, 3)
    //console.log(knots2)
    const newControlPoints = leastSquareApproximation(spline2, knots2)
    //console.log(newControlPoints)
})

