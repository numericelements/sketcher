//https://www.ankursheel.com/blog/react-component-draw-page-hooks-typescript

import {useRef, useEffect, useCallback, useState, useLayoutEffect} from 'react'
import { SketcherState } from '../../SketcherState'
import { ActionManager } from '../../actions/manager'
import createCurve, { Coordinates, InitialCurveEnumType, BSplineType, distance, updateCurve, BSplineEnumType, Vector2D, moveCurves, moveCurve, displacement, moveControlPoint, normalizeCircle, setCurve, ComplexCurve, arcPointsFrom3Points as arcPointsFromMultiplePoints, pointsOnCurve, pointOnCurve, NonRational, CoordinatesToVector2d, optimizedKnotPositions, Rational, PythagoreanHodograph, pointsOnComplexCurve } from '../../curves/curves'
import { setCurvesType } from '../../hooks/useHistory'
import { viewportCoordsToSceneCoords } from './viewport'
import { flushSync } from 'react-dom'
import { cm2c, cphi } from '../../curves/complexGrassmannSpace'
import { circleArcFromThreePoints } from '../../curves/circleArc'
import { createColorPalette, createColorPaletteRGB } from '../../utilities/color'
import { automaticFitting } from '../../bsplines/knotPlacement/automaticFitting'
import { BSplineR1toR2 } from '../../bsplines/R1toR2/BSplineR1toR2'
//import createElement, { CircleArcElement, Coordinates, ElementType, SketchElement, distance, normalizeCircle, updateElement } from './element/element'

//import { useService } from '@xstate/react';
//import { useService } from 'xstate/lib/index';


interface CanvasProps {
    sketcherState: SketcherState
    actionManager: ActionManager
    sketchElements: BSplineType[]
    setSketchElements: setCurvesType
    windowWidth?: number
    windowHeight?: number
}

type ActionType = "none" | "drawing" | "moving a single curve" | "moving multiple curves" | "moving a control point"

type mouseMoveThresholdType = "not exceeded" | "just exceeded" | "exceeded"

function Canvas(props: CanvasProps) {

    const {sketcherState, actionManager, sketchElements, setSketchElements, windowWidth = window.innerWidth, windowHeight = window.innerHeight} = props
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [pressDown, setPressDown] = useState(false)
    const [initialMousePosition, setInitialMousePosition] = useState<Coordinates | null>(null)
    const [action, setAction] = useState<ActionType>("none")
    const [currentlyDrawnElement, setCurrentlyDrawnElement] = useState<BSplineType | null>(null)
    const [newestMousePosition, setNewestMousePosition] = useState<Coordinates | null>(null)
    const [twoFingersTouch, setTwoFingersTouch] = useState<{p0: Coordinates, p1: Coordinates, initialZoom: number} | null>(null)
    const [curveToMoveID, setCurveToMoveID] = useState<string | null> (null)
    const [unselectCurveID, setUnselectCurveID] = useState<string | null> (null)
    const [mouseMoveThreshold, setMouseMoveThreshold] = useState<mouseMoveThresholdType>("not exceeded")
    const clickWithoutMovingResolution = 10



    const drawCurves = useCallback((context: CanvasRenderingContext2D, curve: BSplineType) => {
        const lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        const lineColor2 = sketcherState.theme === "dark" ? "rgba(255, 0, 0, 1)" : "rgba(250, 0, 0, 1)"
        switch (curve.type) {
            case BSplineEnumType.NonRational: {
                context.strokeStyle = lineColor
                context.lineJoin = 'round'
                context.lineWidth = 1.5 / sketcherState.zoom
                context.beginPath()
                const points = pointsOnCurve(curve, 1000)
                context.moveTo(points[0].x, points[0].y)
                points.forEach( (point) =>
                    context.lineTo(point.x, point.y)
                )
                context.stroke()
                }
                break
            case BSplineEnumType.Complex:
                if (curve.points.length >= 3 && curve.knots.length === 0) {
                    const points = arcPointsFromMultiplePoints(curve.points)
                    context.strokeStyle = lineColor
                    context.lineJoin = 'round'
                    context.lineWidth = 1.5 / sketcherState.zoom
                    context.beginPath()
                    context.moveTo(points[0].x, points[0].y)
                    const circle = circleArcFromThreePoints(points[0], points[Math.floor(points.length / 2)], points[points.length - 1])
                    if (! circle) return
                    const {xc, yc, r, startAngle, endAngle, counterclockwise} = circle
                    context.arc(xc, yc, r, startAngle, endAngle, counterclockwise)
                    context.stroke()
                } else if (curve.points.length >= 3) {
                    /*
                    const points = arcPointsFromMultiplePoints(curve.points)
                    context.strokeStyle = lineColor2
                    context.lineJoin = 'round'
                    context.lineWidth = 1.5 / sketcherState.zoom
                    context.beginPath()
                    context.moveTo(points[0].x, points[0].y)
                    const circle = circleArcFromThreePoints(points[0], points[Math.floor(points.length / 2)], points[points.length - 1])
                    if (! circle) return
                    const {xc, yc, r, startAngle, endAngle, counterclockwise} = circle
                    context.arc(xc, yc, r, startAngle, endAngle, counterclockwise)
                    context.stroke()
                    */
                    context.beginPath()
                    const points = pointsOnComplexCurve(curve, 1000)
                    context.moveTo(points[0].x, points[0].y)
                    points.forEach( (point) =>
                        context.lineTo(point.x, point.y)
                    )
                    context.stroke()
                }
                break
        }
    }, [sketcherState.zoom, sketcherState.theme])

    const drawHighlight = useCallback((context: CanvasRenderingContext2D, curve: BSplineType)  => {
        const zoom = sketcherState.zoom
        const fillStyle = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.2)"
        switch  (curve.type) {
            case BSplineEnumType.NonRational:
                context.strokeStyle = fillStyle
                context.lineJoin = 'round'
                context.lineWidth = 5 / zoom
                context.beginPath()
                context.moveTo(curve.points[0].x, curve.points[0].y)
                curve.points.forEach( (point) =>
                    context.lineTo(point.x, point.y)
                )
                context.stroke()
                break
            case BSplineEnumType.Complex: {
                const points =  arcPointsFromMultiplePoints(curve.points)
                context.strokeStyle = fillStyle
                context.lineJoin = 'round'
                context.lineWidth = 5 / zoom
                context.beginPath()
                context.moveTo(points[0].x, points[0].y)
                const circle = circleArcFromThreePoints(points[0], points[Math.floor(points.length / 2)], points[points.length - 1])
                if (! circle) return
                const {xc, yc, r, startAngle, endAngle, counterclockwise} = circle
                context.arc(xc, yc, r, startAngle, endAngle, counterclockwise)
                context.stroke()
                }
                break
        }
    }, [sketcherState.zoom, sketcherState.theme])

    const drawControlPolygon = useCallback((context: CanvasRenderingContext2D, curve: BSplineType, selectedControlPoint: number | null)  => {
        const zoom = sketcherState.zoom
        const innerCircleRadius = 3.5 /zoom 
        const outerCircleRadius = 6 / zoom 
        const s1 = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
        const s2 = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"
        const s3 = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"
        const s4 = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)"
        let fillStyle1 = s1
        let fillStyle2 = s2
        let fillStyle3 = s3
        let fillStyle4 = s4

        const colorPalette1 = createColorPaletteRGB(curve.points.length, 0.2)
        const colorPalette2 = createColorPaletteRGB(curve.points.length, 0.4)
        const colorPalette3 = createColorPaletteRGB(curve.points.length, 0.7)
        switch(curve.type) {
            case BSplineEnumType.NonRational :
                {
                    context.lineJoin = 'round'
                    context.lineWidth = 0
                    curve.points.forEach((p, index) => {
                        if (sketcherState.showKnotVectorEditor) {
                            fillStyle1 = colorPalette1[index]
                            fillStyle2 = colorPalette2[index]
                            fillStyle3 = colorPalette3[index]
                        }
                        const {x, y} = p
                        context.beginPath()
                        context.fillStyle = fillStyle3
                        context.arc(x, y, innerCircleRadius, 0, 2 * Math.PI, false)
                        context.fill()
                        context.arc(x, y, outerCircleRadius, 0, 2 * Math.PI, false)
                        if (index === selectedControlPoint) {
                            context.fillStyle = fillStyle2
                        } else {
                            context.fillStyle = fillStyle1
                        }
                        context.fill()
                    })
                    
                    context.beginPath()
                    context.strokeStyle = fillStyle4
                    context.lineWidth = 1.2 / zoom
                    context.moveTo(curve.points[0].x, curve.points[0].y)
                    curve.points.forEach( (point) =>
                        context.lineTo(point.x, point.y)
                    )
                    context.stroke()
                    break
                }
            case BSplineEnumType.Complex :  
            {
                context.lineJoin = 'round'
                context.lineWidth = 0
                curve.points.forEach((p, index) => {
                    
                    if (sketcherState.showKnotVectorEditor) {
                        if (index % 2 === 0) {
                            fillStyle1 = colorPalette1[index / 2]
                            fillStyle2 = colorPalette2[index / 2]
                            fillStyle3 = colorPalette3[index / 2]
                        } else {
                            fillStyle1 = s1
                            fillStyle2 = s2
                            fillStyle3 = s3
                        }
                    }
                    const {x, y} = p
                    context.beginPath()
                    context.fillStyle = fillStyle3
                    context.arc(x, y, innerCircleRadius, 0, 2 * Math.PI, false)
                    context.fill()
                    context.arc(x, y, outerCircleRadius, 0, 2 * Math.PI, false)
                    if (index === selectedControlPoint) {
                        context.fillStyle = fillStyle2
                    } else {
                        context.fillStyle = fillStyle1
                    }
                    context.fill()
                })
                //draw control polygon
                for (let i = 0; i < curve.points.length - 2; i += 2) {
                    const points = arcPointsFromMultiplePoints([curve.points[i], curve.points[i + 1], curve.points[i + 2]])
                    context.strokeStyle = fillStyle4
                    context.lineJoin = 'round'
                    context.lineWidth = 1.5 / sketcherState.zoom
                    context.beginPath()
                    context.moveTo(points[0].x, points[0].y)
                    const circle = circleArcFromThreePoints(points[0], points[Math.floor(points.length / 2)], points[points.length - 1])
                    if (! circle) return
                    const {xc, yc, r, startAngle, endAngle, counterclockwise} = circle
                    context.arc(xc, yc, r, startAngle, endAngle, counterclockwise)
                    context.stroke()
                }
                break
            }
        }
    }
    ,[sketcherState.showKnotVectorEditor, sketcherState.theme, sketcherState.zoom])

    const drawPositionOnCurve = useCallback((context: CanvasRenderingContext2D, curve: BSplineType, parametricPosition: number | null)  => {
        const zoom = sketcherState.zoom
        const radius = 4 /zoom 
        let fillStyle = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        switch(curve.type) {
            case BSplineEnumType.NonRational :
                {
                    if (parametricPosition !== null) {
                        const point = pointOnCurve(curve, parametricPosition)
                        context.beginPath()
                        context.fillStyle = fillStyle
                        context.arc(point.x, point.y, radius, 0, 2 * Math.PI, false)
                        context.fill()
                        
                    }
                    break
                }
            case BSplineEnumType.Complex :  
            {
                break
            }
        }
    }
    ,[sketcherState.theme, sketcherState.zoom])

    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return
        context.save()
        context.clearRect(0, 0, windowWidth, windowHeight)
        context.scale(sketcherState.zoom, sketcherState.zoom)
        context.translate( sketcherState.scrollX,  sketcherState.scrollY)
        sketchElements.forEach(sketchElement => {
            drawCurves(context, sketchElement)
        })
        /*
        sketcherState.highlightedCurves.forEach((key) => {
            const curve = sketchElements.find(e => e.id === key)
            if (curve) {
                drawHighlight(context, curve)
            }
        })
        if (curveToMoveID) {
            const c = sketchElements.find(c => c.id === curveToMoveID)
            if (c) drawHighlight(context, c)
        }
        */
        const cpd = sketcherState.controlPolygonDisplayed
        if (cpd) {
            //const curve = sketchElements.find(e => e.id === cpd.id)
            const curves = sketchElements.filter((element) => cpd.curveIDs.includes(element.id))
            curves.forEach( (curve) => {
                let selectedControlPoint = null
                if ( cpd.selectedControlPoint && curve.id === cpd.selectedControlPoint.curveID) {
                    selectedControlPoint = cpd.selectedControlPoint.controlPointIndex
                }
                switch (curve.type) {
                    case BSplineEnumType.NonRational :
                    case BSplineEnumType.Complex :  
                    {
                        drawControlPolygon(context, curve, selectedControlPoint)
                        break
                    }
                }
            })
            
            const u = sketcherState.displayParametricPositionOnSelectedCurve
            
            if (u !== null && curves.length === 1) {
                drawPositionOnCurve(context, curves[0], u)
            }
            
        }

        context.restore()
    }
    , [windowWidth, windowHeight, sketchElements, sketcherState, drawCurves, drawHighlight, curveToMoveID, drawControlPolygon, drawPositionOnCurve])

    const drawLine = useCallback(
        (newMousePosition: Coordinates, curveType: InitialCurveEnumType) => {
            if (currentlyDrawnElement !== null) {
                updateCurve(sketchElements, setSketchElements, currentlyDrawnElement.id, newMousePosition, curveType )
            }
        }, [sketchElements, setSketchElements, currentlyDrawnElement]
    )
    

    const getMouseCoordinates = useCallback((event: MouseEvent): Coordinates | null => {
        if (!canvasRef.current) return null
        const canvas: HTMLCanvasElement = canvasRef.current
        //const viewportCoords = {clientX : event.pageX - canvas.offsetLeft, clientY: event.pageY - canvas.offsetTop}
        const viewportCoords = {clientX : event.clientX - canvas.offsetLeft, clientY: event.clientY - canvas.offsetTop}
        return viewportCoordsToSceneCoords(viewportCoords, sketcherState)
    }, [sketcherState])

    const getTouchCoordinates = useCallback((event: TouchEvent): Coordinates | null => {
        if (!canvasRef.current) return null
        const canvas: HTMLCanvasElement = canvasRef.current
        const viewportCoords = {clientX : event.touches[0].clientX - canvas.offsetLeft, clientY: event.touches[0].clientY - canvas.offsetTop}
        return viewportCoordsToSceneCoords(viewportCoords, sketcherState)
    }, [sketcherState])

    const getTwoFingersTouchCoordinates = useCallback((event: TouchEvent): {p0: Coordinates, p1: Coordinates} | null => {
        if (!canvasRef.current) return null
        const canvas: HTMLCanvasElement = canvasRef.current
        const viewportCoords0 = {clientX : event.touches[0].clientX - canvas.offsetLeft, clientY: event.touches[0].clientY - canvas.offsetTop}
        const viewportCoords1 = {clientX : event.touches[1].clientX - canvas.offsetLeft, clientY: event.touches[1].clientY - canvas.offsetTop}
        const p0 = viewportCoordsToSceneCoords(viewportCoords0, sketcherState)
        const p1 = viewportCoordsToSceneCoords(viewportCoords1, sketcherState)
        return {p0: p0, p1: p1 }
    }, [sketcherState])

    const onLine = useCallback((endPoints: readonly Coordinates[], point: Coordinates, maxDistance = 1) => {
        // offset : semi-minor axis of the ellipse with the line endpoint as focal points
        const offset =   Math.sqrt(Math.pow((distance(endPoints[0], point) + distance(endPoints[1], point)) / 2, 2) - Math.pow(distance(endPoints[0], endPoints[1]) / 2, 2))
        return offset < maxDistance / sketcherState.zoom ? "inside" : null
    }, [sketcherState.zoom])

    const onCircle = useCallback((threePoints: readonly Coordinates[], point: Coordinates, maxDistance = 1 ) => {
        /*
        const phi0 = cphi(threePoints[0], threePoints[2], threePoints[1])
        const phi1 = cphi(threePoints[0], threePoints[2], point)
        return Math.abs(phi1 - phi0) < deltaPhi  ? "inside" : null
        */
       const circle = circleArcFromThreePoints(threePoints[0], threePoints[1], threePoints[2]) 
       if (circle) {
            const distanceFromCenter = Math.hypot(point.x - circle.xc, point.y - circle.yc)
            const offset = Math.abs(distanceFromCenter - circle.r)
            return offset < maxDistance / sketcherState.zoom ? "inside" : null
       } else {
        return onLine([threePoints[0], threePoints[2]], point)
       }
    }, [onLine, sketcherState.zoom])

    const positionWithinCurve = useCallback((point: Coordinates, curve: BSplineType) => {
        const {type} = curve
        switch (type) {
            case BSplineEnumType.NonRational: {
                const points = pointsOnCurve(curve, 100)
                const betweenAnyPoint = points.some((curvePoint, index) => {
                    const nextCurvePoint = points[index + 1]
                    if (!nextCurvePoint) return false
                    return onLine([curvePoint, nextCurvePoint], point, 10) != null
                })
                return betweenAnyPoint ? "inside" : null
                }
            case BSplineEnumType.Complex: {
                //const {points: threePoints} = curve
                //return onCircle(threePoints, point, 10)
                const points = pointsOnComplexCurve(curve, 100)
                const betweenAnyPoint = points.some((curvePoint, index) => {
                    const nextCurvePoint = points[index + 1]
                    if (!nextCurvePoint) return false
                    return onLine([curvePoint, nextCurvePoint], point, 10) != null
                })
                return betweenAnyPoint ? "inside" : null

                }
            default:
                throw new Error(`Type not recognised: ${type}`)
        }
    }, [onLine])


    const getCurveAtPosition = useCallback((coordinates: Coordinates, elements: BSplineType[]) => {
        return elements
        .map(element => ({...element, position: positionWithinCurve(coordinates, element)}))
        .find(element => element.position !== null)
    }, [positionWithinCurve])

    const moveSelectedCurve = useCallback((displacement: Vector2D, curves: BSplineType[], id: string) => {
        moveCurve(curves, setSketchElements, id, displacement)
        /*
        let curvesCopy = structuredClone(curves)
        const curve = curvesCopy.find((c: BSplineType) => (c.id === id))
        if (!curve) return
        //const c = curve as NonRational
        let c : BSplineType
        switch(curve.type) {
            case BSplineEnumType.Complex: 
                c = curve as Complex
                break
            case BSplineEnumType.NonRational:
                c = curve as NonRational
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
        const newPoints = c.points.map(p => movePoint(p, displacement))
        c.points = newPoints 
        setSketchElements(curvesCopy, true)
        */
    }, [setSketchElements])

    const moveSelectedCurves = useCallback((displacement: Vector2D, curves: BSplineType[]) => {
        const ids = sketcherState.controlPolygonDisplayed ? sketcherState.controlPolygonDisplayed.curveIDs : []
        moveCurves(curves, setSketchElements, ids, displacement)
    }, [setSketchElements, sketcherState.controlPolygonDisplayed])

    const getControlPointAtPosition = useCallback((point: Coordinates, curve: BSplineType, maxDistance = 1) => {
        let index = -1
        switch(curve.type) {
            case BSplineEnumType.Complex: 
            index = curve.points.findIndex(c => distance(point, c) < maxDistance / sketcherState.zoom )
                break
            case BSplineEnumType.NonRational:
                index = curve.points.findIndex(c => distance(point, c) < maxDistance / sketcherState.zoom )
                break
            case BSplineEnumType.Rational:
                break
            case BSplineEnumType.PythagoreanHodograph:
                break 
            default :
                throw new Error("unknown B-spline type")          
        }
        //const index = curve.points.findIndex(c => distance(point, c) < maxDistance / sketcherState.zoom )
        if (index === -1) return null
        return index
    }, [sketcherState.zoom])

    const findNearestControlPoint = (point : Coordinates, curves: BSplineType[], maxDistance = 1) => {
        if (curves.length === 0) return null
        let points: Coordinates[] = []
        switch(curves[0].type) {
            case BSplineEnumType.Complex: 
                points = curves[0].points
                break
            case BSplineEnumType.NonRational:
                points = curves[0].points
                break
            case BSplineEnumType.Rational:
                break
            case BSplineEnumType.PythagoreanHodograph:
                break 
            default :
                throw new Error("unknown B-spline type")          
        }



        let minDistance = distance(point, points[0])

        let curveID = curves[0].id
        let controlPointIndex = 0

        for(const curve of curves) {
            for (const [index, controlPoint] of points.entries()) {
                const d  = distance(point, controlPoint)
                if (d < minDistance) {
                    minDistance = d
                    curveID = curve.id
                    controlPointIndex = index
                }
            }
        }
        if (minDistance < maxDistance) return {curveID, controlPointIndex}
        else return null
    }

    const moveSelectedControlPoint = useCallback( 
        (newMousePosition: Coordinates) => {
            if (sketcherState.controlPolygonDisplayed && sketcherState.controlPolygonDisplayed.selectedControlPoint) {
                const id = sketcherState.controlPolygonDisplayed.selectedControlPoint.curveID
                const scp = sketcherState.controlPolygonDisplayed.selectedControlPoint.controlPointIndex
                if (scp !== null) {
                    moveControlPoint(sketchElements, setSketchElements, id, newMousePosition, scp)
                }
            }
        }, [setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed]
    )

    const addAnEntryToTheHistory = useCallback(() => {
        const e = structuredClone(sketchElements)
        setSketchElements(e, false)}, [setSketchElements, sketchElements])

    const helperPressDown = useCallback((coordinates: Coordinates) => {
        setPressDown(true)
        setInitialMousePosition(coordinates)
        setMouseMoveThreshold("not exceeded")
        switch(sketcherState.activeTool) {
            case "none": {
                const curve = getCurveAtPosition(coordinates, sketchElements)
                if (curve) {
                    setAction("moving a single curve")
                    setCurveToMoveID(curve.id)
                    actionManager.renderAction("displayControlPolygon", curve.id)
                }
                break
            }
            case "freeDraw": {
                break
            }
            case "singleSelection": {
                const cpd = sketcherState.controlPolygonDisplayed
                if (!cpd) return
                const curve =  sketchElements.find(e => e.id === cpd.curveIDs[0])
                if (!curve) return
                const index = getControlPointAtPosition(coordinates, curve, 15)
                if (index !== null) {
                    setAction("moving a control point")
                    actionManager.renderAction("selectControlPoint", {curveID: cpd.curveIDs[0], controlPointIndex: index})
                } else {
                    const curve = getCurveAtPosition(coordinates, sketchElements)
                    if (curve) {
                        setAction("moving a single curve")
                        setCurveToMoveID(curve.id)
                        actionManager.renderAction("displayControlPolygon", curve.id)
                    }
                }
                break
            }
            case "multipleSelection": {
                const selectedCurves = sketcherState.controlPolygonDisplayed
                const curves = selectedCurves ? sketchElements.filter(e => selectedCurves.curveIDs.includes(e.id)) : []
                const selectedControlPoint = findNearestControlPoint(coordinates, curves, 15)
                if (selectedControlPoint) {
                    setAction("moving a control point")
                    actionManager.renderAction("selectControlPoint", selectedControlPoint)
                }
                else {
                    const curve = getCurveAtPosition(coordinates, sketchElements)
                    if (curve) {
                        setAction("moving multiple curves")
                        actionManager.renderAction("selectCurves", curve.id)
                        const curveIsAlreadySelected = sketcherState.controlPolygonDisplayed ?
                            sketcherState.controlPolygonDisplayed.curveIDs.includes(curve.id) : null
                        if (curveIsAlreadySelected) setUnselectCurveID(curve.id)
                    }
                }
                break
            }
        }
        if (sketchElements.length === 0 && (sketcherState.activeTool === "none" || sketcherState.activeTool === "multipleSelection")) {
            actionManager.renderAction("showAllDrawingToolsAndToggleFreeDraw", true)
        }
    }, [sketcherState.activeTool, sketcherState.controlPolygonDisplayed, sketchElements, getCurveAtPosition, actionManager, getControlPointAtPosition])

    const handleMouseDown = useCallback((event: MouseEvent) => {
        const coordinates = getMouseCoordinates(event)
        if (!coordinates) return
        helperPressDown(coordinates)
    }, [getMouseCoordinates, helperPressDown])



    const handleTouchStart = useCallback((event: TouchEvent) => {
        if (event.touches.length === 1) {
            const coordinates = getTouchCoordinates(event)
            if (!coordinates) return
            helperPressDown(coordinates)
            event.preventDefault()
            setNewestMousePosition(coordinates) //touchend event does not give its position
        }
        if (event.touches.length === 2) {
            event.preventDefault()
            const coordinates = getTwoFingersTouchCoordinates(event)
            if (!coordinates) return
            setTwoFingersTouch({p0: coordinates.p0, p1: coordinates.p1, initialZoom: sketcherState.zoom})
        }
        //event.preventDefault()
    }, [getTouchCoordinates, getTwoFingersTouchCoordinates, helperPressDown, sketcherState.zoom])

    const helperMove = useCallback((newMousePosition: Coordinates) => {
        if (!initialMousePosition) return
        if (mouseMoveThreshold === "not exceeded") {
            const d = distance(initialMousePosition, newMousePosition)
            if (d > clickWithoutMovingResolution / sketcherState.zoom) {
                setMouseMoveThreshold("just exceeded")
            }
        }
        if (mouseMoveThreshold === "just exceeded") {
            setMouseMoveThreshold("exceeded")
        }

        switch(sketcherState.activeTool) {
            case "none": {
                /*
                if (curveToMoveID && mouseMoveThreshold === "exceeded") {
                    const d = displacement(initialMousePosition, newMousePosition)
                    moveSelectedCurve(d, sketchElements, curveToMoveID)
                    setInitialMousePosition(newMousePosition)
                } else if (curveToMoveID && mouseMoveThreshold === "just exceeded") {
                        addAnEntryToTheHistory()
                } else {
                    const deltaX = newMousePosition.x - initialMousePosition.x 
                    const deltaY = newMousePosition.y - initialMousePosition.y 
                    actionManager.renderAction("scroll", [deltaX, deltaY])
                }
                */
                const deltaX = newMousePosition.x - initialMousePosition.x 
                const deltaY = newMousePosition.y - initialMousePosition.y 
                actionManager.renderAction("scroll", [deltaX, deltaY])
                break
            }
            case "freeDraw": {
               flushSync(() => {
                switch(action) {
                    case 'none':
                        if (mouseMoveThreshold === "exceeded") {
                            setAction("drawing") // React doesn’t update state immediately, flushSync is necessary for ipad to make the state transition fast enough
                            const sketchElement = createCurve(InitialCurveEnumType.Freehand, initialMousePosition.x, initialMousePosition.y)
                            setSketchElements(prevState => [...prevState, sketchElement])
                            setCurrentlyDrawnElement(sketchElement)
                        }
                        break
                    case 'drawing':
                        drawLine(newMousePosition, InitialCurveEnumType.Freehand)
                        break
               }})
                break
            }
            case "line": {
                flushSync(() => {
                switch(action) {
                    case 'none':
                        if (mouseMoveThreshold === "exceeded") {
                            setAction("drawing") // React doesn’t update state immediately, flushSync is necessary for ipad to make the state transition fast enough
                            const sketchElement = createCurve(InitialCurveEnumType.Linear, initialMousePosition.x, initialMousePosition.y)
                            setSketchElements(prevState => [...prevState, sketchElement])
                            setCurrentlyDrawnElement(sketchElement)
                        }
                        break
                    case 'drawing':
                        drawLine(newMousePosition, InitialCurveEnumType.Linear)
                        break
               }})
                break
            }
            case "circleArc": {
                flushSync(() => {
                switch(action) {
                    case 'none':
                        if (mouseMoveThreshold === "exceeded") {
                            setAction("drawing") // React doesn’t update state immediately, flushSync is necessary for ipad to make the state transition fast enough
                            const sketchElement = createCurve(InitialCurveEnumType.CircleArc, initialMousePosition.x, initialMousePosition.y)
                            setSketchElements(prevState => [...prevState, sketchElement])
                            setCurrentlyDrawnElement(sketchElement)
                        }
                        break
                    case 'drawing':
                        drawLine(newMousePosition, InitialCurveEnumType.CircleArc)
                        break
                }})
                break
            }
            case "singleSelection": {
                switch(action) {
                    case 'moving a control point':
                        if (mouseMoveThreshold === "exceeded") {
                            moveSelectedControlPoint(newMousePosition)
                        }
                        if (mouseMoveThreshold === "just exceeded") {
                            addAnEntryToTheHistory()
                        }
                        break
                    case 'moving a single curve':
                        if (curveToMoveID && mouseMoveThreshold === "exceeded") {
                            const d = displacement(initialMousePosition, newMousePosition)
                            moveSelectedCurve(d, sketchElements, curveToMoveID)
                            setInitialMousePosition(newMousePosition)
                        }
                        if (curveToMoveID && mouseMoveThreshold === "just exceeded") {
                            addAnEntryToTheHistory()
                        }
                        break
                    case 'none': {
                            const deltaX = newMousePosition.x - initialMousePosition.x 
                            const deltaY = newMousePosition.y - initialMousePosition.y 
                            actionManager.renderAction("scroll", [deltaX, deltaY])
                        }
                        break
                }
                break
            }
            case "multipleSelection": {
                switch(action) {
                    case 'moving a control point':
                        if (mouseMoveThreshold === "exceeded") {
                            moveSelectedControlPoint(newMousePosition)
                        }
                        if (mouseMoveThreshold === "just exceeded") {
                            addAnEntryToTheHistory()
                        }
                        break
                    case 'moving multiple curves':
                        const d = displacement(initialMousePosition, newMousePosition)
                        moveSelectedCurves(d, sketchElements)
                        setInitialMousePosition(newMousePosition)
                        break
                    case 'none':
                        const deltaX = newMousePosition.x - initialMousePosition.x 
                        const deltaY = newMousePosition.y - initialMousePosition.y 
                        actionManager.renderAction("scroll", [deltaX, deltaY])
                }
                break
            }
        }
        
    }, [initialMousePosition, mouseMoveThreshold, sketcherState.activeTool, sketcherState.zoom, curveToMoveID, moveSelectedCurve, sketchElements, actionManager, action, drawLine, setSketchElements, moveSelectedControlPoint, addAnEntryToTheHistory, moveSelectedCurves])
    
    const handleMouseMove = useCallback((event: MouseEvent) => {
        const newMousePosition = getMouseCoordinates(event)
        if (!pressDown || !newMousePosition) return
        helperMove(newMousePosition)
    },[getMouseCoordinates, pressDown, helperMove])

    const handleTouchMove = useCallback((event: TouchEvent) => {    
        if (event.touches.length === 1) {
            const coordinates = getTouchCoordinates(event)
            if (!pressDown || !coordinates) return
            helperMove(coordinates)
            setNewestMousePosition(coordinates) //touchend event does not give its position
        }
        if (event.touches.length === 2) {
            const coordinates = getTwoFingersTouchCoordinates(event)
            if (!coordinates || !twoFingersTouch) return
            const deltaX0 = coordinates.p0.x - twoFingersTouch.p0.x 
            const deltaY0 = coordinates.p0.y - twoFingersTouch.p0.y
            const newDistanceX = coordinates.p1.x - coordinates.p0.x 
            const newDistanceY = coordinates.p1.y - coordinates.p0.y
            const initialDistanceX = twoFingersTouch.p1.x - twoFingersTouch.p0.x 
            const initialDistanceY = twoFingersTouch.p1.y - twoFingersTouch.p0.y
            const newDistance = Math.hypot(newDistanceX, newDistanceY)
            const initialDistance = Math.hypot(initialDistanceX, initialDistanceY)
            actionManager.renderAction("zoomWithTwoFingers", [deltaX0, deltaY0, sketcherState.zoom *  newDistance / initialDistance])
        }
    }, [actionManager, getTouchCoordinates, getTwoFingersTouchCoordinates, helperMove, pressDown, sketcherState.zoom, twoFingersTouch])


    const helperPressRelease = useCallback((newMousePosition: Coordinates) => {
        setPressDown(false)
        if (mouseMoveThreshold === "not exceeded" &&
            sketcherState.activeTool !== "multipleSelection" &&
            action !== "moving a control point" && action !== "moving a single curve") {
            actionManager.renderAction("unselectCreationTool")
        }
        if (curveToMoveID) {
            setCurveToMoveID(null)
            actionManager.renderAction("displayControlPolygon", curveToMoveID)
        }
        if (action === "drawing") {
            if (sketcherState.activeTool === "circleArc") {
                if (currentlyDrawnElement) {
                    const e = sketchElements.find(e => e.id === currentlyDrawnElement.id) as ComplexCurve
                    setCurve(normalizeCircle(e), sketchElements, setSketchElements, currentlyDrawnElement.id)
                }
            } else if (sketcherState.activeTool === "freeDraw") {
                if (currentlyDrawnElement) {
                    const e = sketchElements.find(e => e.id === currentlyDrawnElement.id) as NonRational
                    //optimizedKnotPositions(sketchElements, setSketchElements, e.id, Math.sqrt(sketcherState.zoom))
                    optimizedKnotPositions(sketchElements, setSketchElements, e.id, sketcherState.zoom)

                }
            }
        }
        if (unselectCurveID && mouseMoveThreshold === "not exceeded") {
            //setUnselectCurveID(null)
            actionManager.renderAction("unselectCurve", unselectCurveID)
        }
        setUnselectCurveID(null)
        setMouseMoveThreshold("not exceeded")
        setAction("none")
    }, [mouseMoveThreshold, sketcherState.activeTool, sketcherState.zoom, action, curveToMoveID, unselectCurveID, actionManager, currentlyDrawnElement, sketchElements, setSketchElements])

    const handleMouseUp = useCallback((event: MouseEvent) => {
        setPressDown(false)
        const newMousePosition = getMouseCoordinates(event)
        if (newMousePosition) {
            helperPressRelease(newMousePosition)
        }
    }, [getMouseCoordinates, helperPressRelease] )

    const handleMouseLeave = useCallback((event: MouseEvent) => {
    }, [] )

    const handleTouchEnd = useCallback((event : TouchEvent) => {
        if (event.touches.length === 0) {
            setPressDown(false)
            if (newestMousePosition) {
                helperPressRelease(newestMousePosition)
            }
        }
        if (event.touches.length === 1) {
            setTwoFingersTouch(null)
            const coordinates = getTouchCoordinates(event)
            if (!coordinates) return
            helperPressDown(coordinates)
        }
        setNewestMousePosition(null)
    }, [getTouchCoordinates, helperPressDown, helperPressRelease, newestMousePosition])

    const handleWheel = useCallback((event: WheelEvent) => {
        event.preventDefault()
        const { deltaX, deltaY} = event
        if (event.ctrlKey || event.metaKey) {
            const mousePosition = getMouseCoordinates(event)
            const viewportCoords = {clientX : event.clientX, clientY: event.clientY}
            if (!mousePosition) return
            const factor = 1 - deltaY / 1000
            const newZoom = sketcherState.zoom * factor
            actionManager.renderAction("zoomWithAFixedPoint", [viewportCoords.clientX, viewportCoords.clientY, newZoom])
        } else {
            actionManager.renderAction("scroll", [-deltaX / sketcherState.zoom, -deltaY / sketcherState.zoom])
        }
    },
    [actionManager, getMouseCoordinates, sketcherState.zoom])

    const handleKeyPress = useCallback((event: KeyboardEvent) => {
        switch(event.key) {
            case "Escape":
                actionManager.renderAction("unselectCreationTool")
                break
        }
    }, [actionManager])

    useEffect(() => {
        if (!canvasRef.current) {
            return
        }
        const canvas: HTMLCanvasElement = canvasRef.current
        canvas.addEventListener('mousedown', handleMouseDown)
        canvas.addEventListener('touchstart', handleTouchStart)
        canvas.addEventListener('mousemove', handleMouseMove)
        canvas.addEventListener('touchmove', handleTouchMove)
        canvas.addEventListener('mouseup', handleMouseUp)
        canvas.addEventListener('touchend', handleTouchEnd)
        canvas.addEventListener('mouseleave', handleMouseLeave)
        canvas.addEventListener('wheel', handleWheel)
        window.addEventListener('keydown', handleKeyPress)
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown)
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('touchmove', handleTouchMove)
            canvas.removeEventListener('mouseup', handleMouseUp)
            canvas.removeEventListener('touchend', handleTouchEnd)
            canvas.removeEventListener('mouseleave', handleMouseLeave)
            canvas.removeEventListener('wheel', handleWheel)
            window.removeEventListener('keydown', handleKeyPress)
        }
    }, [handleKeyPress, handleMouseDown, handleMouseLeave, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove, handleTouchStart, handleWheel])

    return <canvas ref={canvasRef} width = {windowWidth} height = {windowHeight} style = {{backgroundColor: (sketcherState.theme === "dark") ? "black" : "white"}}/>
}




export default Canvas






function movePoint(p: Coordinates, displacement: Vector2D): any {
    throw new Error('Function not implemented.')
}

