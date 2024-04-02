import { computeBasisFunction, rangeIncludingStopValue } from "../curves/BasisFunctions"
import { uniformKnots } from "../curves/curves"



it ("computes a range including its stop value", () => {
    const r = rangeIncludingStopValue(0, 1, 0.3)
    expect(r[0]).toBeCloseTo(0)
    expect(r[1]).toBeCloseTo(0.3)
    expect(r[2]).toBeCloseTo(0.6)
    expect(r[3]).toBeCloseTo(0.9)
    expect(r[4]).toBeCloseTo(1)
})

it ("computes basis functions", () => {
    const basisFunctions = computeBasisFunction([0, 0, 1, 1], 1, 0.1) 
    expect(basisFunctions[0][0].value).toBeCloseTo(1)
    expect(basisFunctions[1][0].value).toBeCloseTo(0)
    expect(basisFunctions[0][11].value).toBeCloseTo(0)
    expect(basisFunctions[1][11].value).toBeCloseTo(1)
})

it ("can return a uniform knots distribution", () => {
    const knots = uniformKnots(1, 3)
    expect(knots[0]).toBeCloseTo(0)
    expect(knots[1]).toBeCloseTo(0)
    expect(knots[2]).toBeCloseTo(0.5)
    expect(knots[3]).toBeCloseTo(1)
    expect(knots[4]).toBeCloseTo(1)
})

it ("computes another basis functions", () => {
    const knots = uniformKnots(1, 3)
    const basisFunctions = computeBasisFunction(knots, 1, 0.1) 
    expect(basisFunctions[0][0].u).toBeCloseTo(0)
    expect(basisFunctions[0][0].value).toBeCloseTo(1)
    expect(basisFunctions[1][0].u).toBeCloseTo(0)
    expect(basisFunctions[1][0].value).toBeCloseTo(0)
    expect(basisFunctions[0][5].u).toBeCloseTo(0.5)
    expect(basisFunctions[0][5].value).toBeCloseTo(0)
    expect(basisFunctions[1][5].u).toBeCloseTo(0.5)
    expect(basisFunctions[1][5].value).toBeCloseTo(1)
    expect(basisFunctions[1][11].u).toBeCloseTo(1)
    expect(basisFunctions[1][11].value).toBeCloseTo(0)
    expect(basisFunctions[2][0].u).toBeCloseTo(0.5)
    expect(basisFunctions[2][0].value).toBeCloseTo(0)
    expect(basisFunctions[2][5].u).toBeCloseTo(1)
    expect(basisFunctions[2][5].value).toBeCloseTo(1)
    expect(basisFunctions.length).toEqual(3)
})

