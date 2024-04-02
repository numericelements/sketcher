import { nanoid } from "nanoid";

import { setCurvesType } from "../hooks/useHistory";
import { ComplexMassPoint, averagePhi, cm2c, cmX, cmadd, cmult } from "./complexGrassmannSpace";
import { arcPoints, arrayRange, complexMassPointsFromCircleArc, q0FromPhi } from "./circleArc";

import { BSplineR1toR2 } from "../bsplines/R1toR2/BSplineR1toR2";
import { Vector2d } from "../mathVector/Vector2d";
import { automaticFitting, removeASingleKnot } from "../bsplines/knotPlacement/automaticFitting";
import { BSplineR1toC2 } from "../bsplines/R1toC2/BSplineR1toC2";

export enum InitialCurveEnumType {
    Freehand,
    Linear,
    CircleArc,
}

export enum BSplineEnumType {
    NonRational,
    Rational,
    Complex,
    PythagoreanHodograph
}


export type Coordinates = {
    x: number,
    y: number
}

function middlePoint(c0: Coordinates, c1: Coordinates): Coordinates {
    return {x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2}
}


export type Vector2D = {
    x: number,
    y: number
}

function movePoint(c: Coordinates, v: Vector2D): Coordinates {
    const {x: cx, y: cy} = c
    const {x: vx, y: vy} = v
    return {x: cx + vx, y: cy + vy}
}

function moveComplexMassPoint(c: ComplexMassPoint, v: Vector2D): ComplexMassPoint {
    const {mP: {x: cx, y: cy}, m} = c
    const {x: vx, y: vy} = cmult(v, m)
    return {mP: {x: cx + vx, y: cy + vy}, m}
}


export function displacement(c1: Coordinates, c2: Coordinates): Coordinates {
    const {x: cx1, y: cy1} = c1
    const {x: cx2, y: cy2} = c2
    return {x: cx2 - cx1, y: cy2 - cy1}
}

export const distance = (a: Coordinates, b: Coordinates) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) 


type BaseCurve = Readonly<{
    id: string;
}>

export type NonRational = BaseCurve & {
    type: BSplineEnumType.NonRational
    points: Coordinates[]
    knots: number[]
}


export type Rational = BaseCurve & {
    type: BSplineEnumType.Rational
    points: Coordinates[]
    knots: number[]
}

export type ComplexCurve = BaseCurve & {
    type: BSplineEnumType.Complex
    points: Coordinates[]
    knots: number[]
}

export type PythagoreanHodograph = BaseCurve & {
    type: BSplineEnumType.PythagoreanHodograph
    points: Coordinates[]
    knots: number[]
}

export type BSplineType = NonRational | Rational | ComplexCurve | PythagoreanHodograph



function createCurve(type: InitialCurveEnumType, x0: number, y0: number): BSplineType {
    const id = nanoid()
    switch (type) {
        case InitialCurveEnumType.Freehand:
            return {id, type: BSplineEnumType.NonRational,  points: [{x: x0, y: y0}], knots: [0, 1]}
        case InitialCurveEnumType.Linear:
            return {id, type: BSplineEnumType.NonRational, points: [{x: x0, y: y0}, {x: x0, y: y0}], knots: [0, 0, 1, 1]}
        case InitialCurveEnumType.CircleArc:
            return {id, type: BSplineEnumType.Complex, points: [{x: x0, y: y0}, {x: x0, y: y0}, {x: x0, y: y0}], knots: []}
    }
    
}

export function computeDegree(curve: BSplineType) {
    return curve.knots.length - curve.points.length - 1
}

export function moveControlPoint(curves: BSplineType[], setCurves: setCurvesType, id: string,  point: Coordinates, index: number) {
    let curvesCopy = structuredClone(curves)
    const curve = curvesCopy.find((e: BSplineType) => (e.id === id))
    if (!curve) return
    switch (curve.type) {
        case BSplineEnumType.NonRational :
        case BSplineEnumType.Complex :
            curve.points[index] = point
            break
    }
    setCurves(curvesCopy, true)
}


export function moveKnot(curves: BSplineType[], setCurves: setCurvesType, id: string, newPosition: number, index: number) {
    let curvesCopy = structuredClone(curves)
    const curve = curvesCopy.find((e: BSplineType) => (e.id === id))
    if (!curve) return
    const multiplicityRight = computeMultiplicityRight(curve.knots, index)
    const multiplicityLeft = computeMultiplicityLeft(curve.knots, index)
    for (let i = index - multiplicityLeft; i < index + multiplicityRight + 1; i += 1) {
        curve.knots[i] = newPosition
    }
    setCurves(curvesCopy, true)
}

function computeMultiplicityRight(knots: number[], index: number) {
    let multiplicity = 0
    let i = index + 1
    while (i < knots.length && knots[index] > knots[i])  {
        i += 1
        multiplicity += 1
    }
    return multiplicity
} 

function computeMultiplicityLeft(knots: number[], index: number) {
    let multiplicity = 0
    let i = index - 1
    while (i > 0 && knots[index] < knots[i])  {
        i -= 1
        multiplicity += 1
    }
    return multiplicity
} 

export function moveCurve(curves: BSplineType[], setCurves: setCurvesType, id: string,  displacement: Vector2D) {
    let curvesCopy = structuredClone(curves)
    const curve = curvesCopy.find((c: BSplineType) => (c.id === id))
    if (!curve) return
    //const c = curve as NonRational
    let c : BSplineType
    let newPoints : Coordinates[] = [] 
    switch(curve.type) {
        case BSplineEnumType.Complex: 
            c = curve as ComplexCurve
            newPoints = c.points.map(p => movePoint(p, displacement))
            break
        case BSplineEnumType.NonRational:
            c = curve as NonRational
            newPoints = c.points.map(p => movePoint(p, displacement))
            break
        case BSplineEnumType.Rational:
            c = curve as Rational
            break
        case BSplineEnumType.PythagoreanHodograph:
            c = curve as PythagoreanHodograph
            break 
        default :
            throw new Error("unknown B-spline type")          
    }
    //const newPoints = c.points.map(p => movePoint(p, displacement))
    c.points = newPoints 
    setCurves(curvesCopy, true)
}

export function moveCurves(curves: BSplineType[], setCurves: setCurvesType, ids: string[],  displacement: Vector2D) {
    let curvesCopy = structuredClone(curves)
    ids.forEach(id => {
    const curve = curvesCopy.find((c: BSplineType) => (c.id === id))
    if (!curve) return
            const c = curve as NonRational
            const newPoints = c.points.map(p => movePoint(p, displacement))
            c.points = newPoints
    })
    setCurves(curvesCopy, true)
}

export function updateCurve(curves: BSplineType[], setCurves: setCurvesType, id: string,  point: Coordinates, initialCurveType: InitialCurveEnumType) {
    
    //let curvesCopy = [...curves]
    let curvesCopy = structuredClone(curves)
    
    const curve = curvesCopy.find((c: BSplineType) => (c.id === id))
    if (!curve) return

    switch (initialCurveType) {
        case InitialCurveEnumType.Freehand:
        {
            const c = curve as NonRational
            let degree = 1
            if (c.points.length < 5) {
                degree = c.points.length
            } else {
                degree = 5
            } 
            c.points = [...c.points, point]
            c.knots = uniformKnots(degree, c.points.length)
            break
        }
        case InitialCurveEnumType.Linear:
        {
            const c = curve as Rational
            c.points[1] = point
            break
        }
        case InitialCurveEnumType.CircleArc:
        {
            const c = curve as ComplexCurve
            c.points = [...c.points, point]
            break
        }
    }
    setCurves(curvesCopy, true)
}

export function normalizeCircle(c: ComplexCurve): ComplexCurve { 
    
    let curveCopy = structuredClone(c)
    if (c.points.length === 1) {
        curveCopy.points = [c.points[0], c.points[0], c.points[0]]
    } else if (c.points.length === 2) {
        curveCopy.points = [c.points[0], middlePoint(c.points[0], c.points[1]), c.points[1]]
    } else if (c.points.length > 3) {
        const z0 = c.points[0]
        const z1 = c.points[c.points.length - 1]
        const phi = averagePhi(c.points)
        const q0 = q0FromPhi(phi, z0, z1)
        curveCopy.points = [z0, q0, z1]
        curveCopy.knots = [0, 0, 1, 1]
    }
    return curveCopy
}

export function setCurve(newVersion: BSplineType, curves: BSplineType[], setCurves: setCurvesType, id: string) {
    let curvesCopy = structuredClone(curves)
    let index = curvesCopy.findIndex((e: BSplineType) => (e.id === id))
    curvesCopy[index] = newVersion
    setCurves(curvesCopy, true)
}

export function arcPointsFrom3Points(points: Coordinates[]) {
    const phi = averagePhi(points)
    const z0 = points[0]
    const z1 = points[points.length - 1]
    const q0 = q0FromPhi(phi, z0, z1)
    const cm = complexMassPointsFromCircleArc({z0: z0, z1: z1, q0: q0})
    const us = arrayRange(0, 1, 0.01)
    return arcPoints(cm.p0, cm.p1, us)
}


export function uniformKnots(degree: number, numberOfControlPoints: number) {
    const numberOfInteriorKnot = numberOfControlPoints - degree - 1
    if (numberOfInteriorKnot < 0) {
        throw new Error("The number of interior knot cannot be negative")
    }
    let knots: number[] = []
    for (let i = 0; i < degree + 1; i += 1) {
        knots.push(0)
    }
    const step = 1 / (numberOfInteriorKnot + 1)

    for (let i = 0; i < numberOfInteriorKnot; i += 1) {
        knots.push(step + i * step)
    }

    for (let i = 0; i < degree + 1; i += 1) {
        knots.push(1)
    }
    return knots
}

export function pointsOnCurve(curve: NonRational, numberOfPoints: number) {
    const bspline: BSplineR1toR2 =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
    return [...Array(numberOfPoints).keys()].map((u) => {
        const p = bspline.evaluate(u / (numberOfPoints - 1))
        return {x: p.x, y: p.y}
    })        
}

export function pointsOnComplexCurve(curve: ComplexCurve, numberOfPoints: number) {
    const bspline: BSplineR1toC2 = new BSplineR1toC2()
    return {x: 0, y: 0}

}

export function pointOnCurve(curve: NonRational, u: number) {
    const bspline: BSplineR1toR2 =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
    const p = bspline.evaluate(u)
    return {x: p.x, y: p.y}
}

export function CoordinatesToVector2d(list: Coordinates[]) {
    return list.map(point => new Vector2d(point.x, point.y))
}

function Vector2dToCoordinates(list: Vector2d[]) {
    return list.map(point => {return {x: point.x, y: point.y}} )
}

export function insertKnot(u: number, curves: BSplineType[], setCurves: setCurvesType, id: string) {

    let curvesCopy = structuredClone(curves)
    let index = curvesCopy.findIndex((e: BSplineType) => (e.id === id))
    let curve = curvesCopy[index]

    switch (curve.type) {
        case BSplineEnumType.NonRational: 
        const bspline =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
        const newBSpline = bspline.insertKnot(u)
        curvesCopy[index] = {id, type: BSplineEnumType.NonRational,  points: Vector2dToCoordinates(newBSpline.controlPoints ), knots: newBSpline.knots}
        break
    }
    
    //curvesCopy[index] = curve
    setCurves(curvesCopy, false)
}

export function elevateDegree(curves: BSplineType[], setCurves: setCurvesType, id: string) {

    let curvesCopy = structuredClone(curves)
    let index = curvesCopy.findIndex((e: BSplineType) => (e.id === id))
    let curve = curvesCopy[index]

    switch (curve.type) {
        case BSplineEnumType.NonRational: 
        const bspline =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
        const newBSpline = bspline.elevateDegree()
        curvesCopy[index] = {id, type: BSplineEnumType.NonRational,  points: Vector2dToCoordinates(newBSpline.controlPoints ), knots: newBSpline.knots}
        break
    }
    
    //curvesCopy[index] = curve
    setCurves(curvesCopy, false)
}

export function optimizedKnotPositions(curves: BSplineType[], setCurves: setCurvesType, id: string, scale = 1, resolutionFactor = 0.3, overwrite = true) {

    let curvesCopy = structuredClone(curves)
    let index = curvesCopy.findIndex((e: BSplineType) => (e.id === id))
    let curve = curvesCopy[index]

    switch (curve.type) {
        case BSplineEnumType.NonRational: 
        const bspline =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
        const newBSpline = automaticFitting(bspline, scale, resolutionFactor)
        curvesCopy[index] = {id, type: BSplineEnumType.NonRational,  points: Vector2dToCoordinates(newBSpline.controlPoints ), knots: newBSpline.knots}
        break
    }

    setCurves(curvesCopy, overwrite)
}

export function removeAKnot(curves: BSplineType[], setCurves: setCurvesType, id: string, knotIndex: number) {
    let curvesCopy = structuredClone(curves)
    let index = curvesCopy.findIndex((e: BSplineType) => (e.id === id))
    let curve = curvesCopy[index]

    switch (curve.type) {
        case BSplineEnumType.NonRational: 
        const bspline =  new BSplineR1toR2(CoordinatesToVector2d(curve.points), curve.knots)
        const newBSpline = removeASingleKnot(bspline, knotIndex + bspline.degree + 1)
        curvesCopy[index] = {id, type: BSplineEnumType.NonRational,  points: Vector2dToCoordinates(newBSpline.controlPoints ), knots: newBSpline.knots}
        break
    }

    setCurves(curvesCopy, false)
}




export default createCurve