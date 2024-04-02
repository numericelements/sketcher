import { Complex, Complex2d, cdiv, cmult } from "../../mathVector/Complex2d"
import { BSplineR1toC2 } from "../R1toC2/BSplineR1toC2"

export class RationalBSplineR1toC1 {

    private readonly spline: BSplineR1toC2

    /**
     * Create a B-Spline
     * @param controlPoints The control points array
     * @param knots The knot vector
     */
    constructor(controlPoints: Complex2d[] = [new Complex2d({x: 0, y: 0}, {x: 1, y: 0})], knots: number[] = [0, 1]) {
        this.spline = new BSplineR1toC2(controlPoints, knots)
    }


    get knots() : number[] {
        return this.spline.knots
    }

    get degree() : number {
        return this.spline.degree
    }

    get controlPoints(): Complex2d[] {
        return this.spline.controlPoints
    }


    evaluate(u: number) : Complex {
        const result = this.spline.evaluate(u)
        const p = cdiv(result.c0, result.c1)
        return {x: p.x, y: p.y}
    }

    controlPoints2D() : Complex[] {
        let result: Complex[] = []
        for (let cp of this.spline.controlPoints) {
            const p = cdiv(cp.c0, cp.c1)
            result.push({x: p.x, y: p.y})
        }
        return result
    }

    clone(): RationalBSplineR1toC1 {
        return new RationalBSplineR1toC1(this.spline.controlPoints, this.spline.knots)
    }

    insertKnot(u: number, times: number = 1)  {
        let s = this.spline.insertKnot(u, times)
        return new RationalBSplineR1toC1(s.controlPoints, s.knots)
    }



    setControlPointPosition(index: number, value: Complex2d) {
        const s = this.spline.setControlPointPosition(index, value)
        return new RationalBSplineR1toC1(s.controlPoints, s.knots)
    }

    setControlPointWeight(controlPointIndex: number, w: Complex) {
        const c0 = this.controlPoints[controlPointIndex].c0
        const c1 = this.controlPoints[controlPointIndex].c1
        const s = this.setControlPointPosition(controlPointIndex, new Complex2d(cdiv(cmult(c0, w), c1), w))
        return new RationalBSplineR1toC1(s.controlPoints, s.knots)
    }

    getControlPointWeight(controlPointIndex: number) {
        return this.controlPoints[controlPointIndex].c1
    }

    distinctKnots() {
        let result = [this.knots[0]]
        let temp = result[0]
        for (let i = 1; i < this.knots.length; i += 1) {
            if (this.knots[i] !== temp) {
                result.push(this.knots[i]);
                temp = this.knots[i];
            }
        }
        return result;
    }


    grevilleAbscissae() {
        let result = []
        for (let i = 0; i < this.spline.controlPoints.length; i += 1) {
            let sum = 0
            for (let j = i + 1; j < i + this.spline.degree + 1; j += 1) {
                sum += this.spline.knots[j]
            }
            result.push(sum / this.spline.degree)
        }
        return result
    }



}