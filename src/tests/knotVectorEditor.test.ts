import { addSpaceBetweenTicks } from "../components/KnotVectorEditor"

it ("computes spaces between ticks", () => {
    const ticks = addSpaceBetweenTicks([0, 0, 1, 1], 0.01)
    expect(ticks[0]).toBeCloseTo(-0.005)
})