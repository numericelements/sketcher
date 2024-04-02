import { basisFunctions } from "../bsplines/Piegl_Tiller_NURBS_Book"
import { cadd, cdiv, cmult, csub } from "./complexGrassmannSpace"
import { ComplexCurve } from "./curves"


export function computeBasisFunction(knots: readonly number[], degree: number, step: number = 0.001) {
   const numberOfControlPoints = knots.length - degree - 1
   if (numberOfControlPoints < 0) {
        throw Error("negative number of control points is not allowed")
   }
   let result: {u: number, value: number}[][] = []
   for (let i = 0; i < numberOfControlPoints; i += 1) {
    result.push([])
   }
   knots.forEach((value, knotIndex) => {
        if (knotIndex < knots.length - 1 && value !== knots[knotIndex + 1]) {
            const range = rangeIncludingStopValue(value, knots[knotIndex + 1], step)
            range.forEach(u => {
                const basis = basisFunctions(knotIndex, u, knots, degree)
                basis.forEach((value, index) => {
                    result[knotIndex + index - degree].push({u, value})
                })
            })
        }
   })
   return result
}

export function computeComplexRationalBasisFunction(curve: ComplexCurve, step: number = 0.001) {
    
    const knots = curve.knots
    const degree = Math.round(curve.knots.length - (curve.points.length / 2 + 0.5) - 1)
    const numberOfControlPoints = knots.length - degree - 1
    if (numberOfControlPoints < 0) {
         throw Error("negative number of control points is not allowed")
    }
    
    let result: {u: number, value: {x: number, y: number}}[][] = []
    for (let i = 0; i < numberOfControlPoints; i += 1) {
     result.push([])
    }
    
    knots.forEach((value, knotIndex) => {
        
         if (knotIndex < knots.length - 1 && value !== knots[knotIndex + 1]) {
            
            const weights = relativeComplexWeight(curve, knotIndex, degree)
            const range = rangeIncludingStopValue(value, knots[knotIndex + 1], step)
            range.forEach(u => {
                    let denominator = {x: 0, y: 0}
                    const basis = basisFunctions(knotIndex, u, knots, degree)
                    for (let i = 0; i < weights.length; i += 1) {
                       denominator = cadd(denominator, cmult({x: basis[i], y: 0},  weights[i]))
                    }
                    basis.forEach((value, index) => {
                    const v = cdiv(cmult({x: value, y: 0}, weights[index]), denominator)
                    result[knotIndex + index - degree].push({u,  value: v})
                    })
            })
             
         }
         
    })
    
    return result
    
 }

 function relativeComplexWeight(curve: ComplexCurve, knotIndex: number, degree: number) {
    const firstControlPointIndex = knotIndex - degree
    let weights = [{x: 1, y: 0}]
    
    for (let i = 0; i < degree; i += 1) {
        const z0 = curve.points[2 * (firstControlPointIndex + i)]
        const z1 = curve.points[2 * (firstControlPointIndex + i + 1)]
        const q0 = curve.points[2 * (firstControlPointIndex + i + 1) - 1]
        weights.push( cmult( weights[i], cdiv( csub(q0, z0), csub(z1, q0)) ) )
    }
    
    return weights
 }

export function rangeIncludingStopValue(start: number, stop: number, step: number) {
    let result: number[] = []
    for (let i = start; i <= stop; i += step) {
        result.push(i)
    }
    if (result[result.length - 1] !== stop) result.push(stop)
    return result
}