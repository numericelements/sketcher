import { uniformKnots } from "../curves/curves"


it ("returns a uniform distribution of knots", () => {
    const knots = uniformKnots(3, 5)
    expect(knots[0]).toBeCloseTo(0)
    expect(knots[1]).toBeCloseTo(0)
    expect(knots[2]).toBeCloseTo(0)
    expect(knots[3]).toBeCloseTo(0)
    expect(knots[4]).toBeCloseTo(0.5)
    expect(knots[5]).toBeCloseTo(1)
    expect(knots[6]).toBeCloseTo(1)
    expect(knots[7]).toBeCloseTo(1)
    expect(knots[8]).toBeCloseTo(1)
})

it ("returns a uniform distribution of knots when degree is 0", () => {
    const knots = uniformKnots(0, 1)
    expect(knots[0]).toBeCloseTo(0)
    expect(knots[1]).toBeCloseTo(1)
})