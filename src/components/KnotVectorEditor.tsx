import { FunctionComponent, useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react"
import { SketcherState } from "../SketcherState"
import { ActionManager } from "../actions/manager"
import { BSplineEnumType, BSplineType, Coordinates, computeDegree, moveKnot } from "../curves/curves"
import { setCurvesType } from "../hooks/useHistory"
import { createColorPalette, createColorPaletteRGB } from "../utilities/color"
import { computeBasisFunction, computeComplexRationalBasisFunction } from "../curves/BasisFunctions"
import { carg, cnorm } from "../curves/complexGrassmannSpace"


type KnotEditorStateType = "idle" | "moving a knot" | "selected knot" | "display position on abscissa"
type ActionType = "none" | "zooming" | "scrolling"
type mouseMoveThresholdType = "not exceeded" | "just exceeded" | "exceeded"

interface EditorProps {
    sketcherState: SketcherState
    actionManager: ActionManager
    sketchElements: BSplineType[]
    setSketchElements: setCurvesType
    windowWidth: number
    windowHeight: number
    offsetX: number
    offsetY: number
}

enum CountActionKind {
    INCREASE = 'INCREASE',
    DECREASE = 'DECREASE'
}

interface CountAction {
    type: CountActionKind
    payload: number
}

interface CountState {
    count: number
}

function counterReducer(state: CountState, action: CountAction) {
    const { type, payload} = action
    switch (type) {
        case CountActionKind.INCREASE:
            return {
                ...state,
                count: state.count + payload,
            }
        case CountActionKind.DECREASE:
            return {
                ...state,
                count: state.count - payload,
            }
        default:
            return state
    }
}


const KnotVectorEditor: FunctionComponent<EditorProps> = (props) => {
    const [state, dispatch] = useReducer(counterReducer, {count: 0})
    const {sketcherState, actionManager, sketchElements, setSketchElements, windowWidth, windowHeight, offsetX, offsetY } = props
    const [editorState, setEditorState] = useState<KnotEditorStateType>("idle")
    const [initialMouseXPosition, setInitialMouseXPosition] = useState<number | null>(null)
    const [zoom, setZoom] = useState(1)
    const [action, setAction] = useState<ActionType>("none")
    const [scroll, setScroll] = useState(0)
    //const [selectedKnot, setSelectedKnot] = useState<number | null>(null)


    const [curve, setCurve] = useState<BSplineType | null>(null)
    const [mouseMoveThreshold, setMouseMoveThreshold] = useState<mouseMoveThresholdType>("not exceeded")
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const maximumZoom = 10
    const leftMaximumSliderPosition = 0.35
    const rightMaximumSliderPosition = 0.65
    const reductionFactor = 0.9
    const clickWithoutMovingResolution = 0.0005


    useLayoutEffect(() => {
        const cpd = sketcherState.controlPolygonDisplayed
        if (cpd) {
            const curves = sketchElements.filter((element) => cpd.curveIDs.includes(element.id))
            setCurve(() => curves[0])
        } 
    }, [sketchElements, sketcherState.controlPolygonDisplayed])

    const drawBasisFunctions = useCallback((context: CanvasRenderingContext2D, curve: BSplineType, ratio: number = 1) => {
        //let lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        //const lineColor = sketcherState.theme === "dark" ? "rgba(1, 0, 255, 1)" : "rgba(0, 0, 0, 1)"
        const scaleX = reductionFactor * zoom
        const scaleY = 0.5
        const offsetLeft = 0.05 + reductionFactor * scroll
        const offsetTop = 0.7 * ratio

        const colorPalette = createColorPaletteRGB(curve.points.length, 1)
        const colorPaletteAngle = createColorPaletteRGB(360, 0.3)

        context.save()
        context.beginPath()
        context.rect(0.03, 0, 0.94, 1)
        context.clip()

        switch (curve.type) {
            case BSplineEnumType.NonRational: {
                const degree = curve.knots.length - curve.points.length - 1
                if (degree > 0) {
                    const basisFunctions = computeBasisFunction(curve.knots, degree)
                    context.strokeStyle = colorPalette[0]
                    context.lineJoin = 'round'
                    context.lineWidth = 1.6 / windowWidth
                    basisFunctions.forEach((b, index) => {
                        if (b[0] !== undefined) {
                            context.beginPath()
                            context.strokeStyle = colorPalette[index]
                            context.moveTo(b[0].u * scaleX + offsetLeft, - b[0].value * ratio * scaleY + offsetTop)
                            b.forEach( (point, index) =>
                                context.lineTo(point.u * scaleX + offsetLeft, - point.value * ratio * scaleY + offsetTop)    
                            )
                            context.stroke()
                        }
                    })
                }}
                break
            case BSplineEnumType.Complex: {
                    const basisFunctions = computeComplexRationalBasisFunction(curve)
                    context.lineWidth = 8 / windowWidth
                    basisFunctions.forEach((b, bIndex) => {
                        if (b[0] !== undefined) {
                            b.forEach( (point, index) => {
                                if (index === 0) return
                                context.beginPath()
                                context.moveTo(b[index - 1].u * scaleX + offsetLeft, - (Math.atan(cnorm(b[index - 1].value)) + 0 / windowWidth) / Math.PI * 2 * ratio * scaleY + offsetTop)
                                const arg = carg(point.value)
                                context.strokeStyle = colorPaletteAngle[ (Math.round(arg * 180 / Math.PI) + bIndex / basisFunctions.length * 360 ) % 360]
                                context.lineTo(point.u * scaleX + offsetLeft, - (Math.atan(cnorm(point.value)) + 0 / windowWidth) / Math.PI * 2 * ratio * scaleY + offsetTop)    
                                context.stroke()
                            })
                        }
                    }) 

                    context.strokeStyle = colorPalette[0]
                    context.lineJoin = 'round'
                    context.lineWidth = 1.6 / windowWidth
                    basisFunctions.forEach((b, index) => {
                        if (b[0] !== undefined) {
                            context.beginPath()
                            context.strokeStyle = colorPalette[index]
                            context.moveTo(b[0].u * scaleX + offsetLeft, - Math.atan(cnorm(b[0].value)) / Math.PI * 2 * ratio * scaleY + offsetTop)
                            b.forEach( (point, index) =>
                                context.lineTo(point.u * scaleX + offsetLeft, - Math.atan(cnorm(point.value)) / Math.PI * 2 * ratio * scaleY + offsetTop)    
                            )
                            context.stroke()
                        }
                    }) 
                }
                break
        }

        context.restore()
        
    }, [scroll, windowWidth, zoom])

    const drawKnotTicks = useCallback((context: CanvasRenderingContext2D, curve: BSplineType, ratio: number = 1) => {
        let lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        const scaleX = reductionFactor * zoom
        const scaleY = 0.5
        const offsetLeft = 0.05 + reductionFactor * scroll
        const offsetTop = 0.7 * ratio

        context.save()
        context.beginPath()
        context.rect(0.03, 0, 0.94, 1)
        context.clip()

        context.strokeStyle = lineColor
        context.lineJoin = 'round'
        context.lineWidth = 1.2 / windowWidth


        switch (curve.type) {
            case BSplineEnumType.NonRational:
            case BSplineEnumType.Complex:
                const ticks = addSpaceBetweenTicks(curve.knots, 0.005 / zoom)
                ticks.forEach(u => {
                    context.beginPath()
                    context.moveTo(u * scaleX + offsetLeft, + 0.05 * ratio * scaleY + offsetTop)
                    context.lineTo(u * scaleX + offsetLeft, - 0.05 * ratio * scaleY + offsetTop)    
                    context.stroke()
                })
                break
        }

        context.restore()
        
    }, [scroll, sketcherState.theme, windowWidth, zoom])

    const drawKnotSlider = useCallback((context: CanvasRenderingContext2D, curve: BSplineType, ratio: number = 1) => {
        let lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"
        const scaleX = reductionFactor * zoom
        const offsetLeft = 0.05 + reductionFactor * scroll
        const offsetTop = 0.85 * ratio

        context.save()
        context.beginPath()
        context.rect(0.03, 0, 0.94, 1)
        context.clip()

        context.strokeStyle = lineColor
        context.lineCap = "round";
        context.lineWidth = 4.5 / windowWidth
        let degree = curve.knots.length - curve.points.length - 1
        if (curve.type === BSplineEnumType.Complex) {
            degree = Math.round(curve.knots.length - (curve.points.length / 2 + 0.5) - 1)
        }
        const ticks = positionOfKnotsOnSlider(curve.knots, degree, scaleX, offsetLeft)
        ticks.forEach(u => {
            context.beginPath()
            context.moveTo(u, + 0.025 * ratio  + offsetTop)
            context.lineTo(u, - 0.025 * ratio  + offsetTop)    
            context.stroke()
        })
        if (sketcherState.selectedKnot !== null) {
            const u = ticks[sketcherState.selectedKnot]
            context.lineWidth = 6 / windowWidth
            context.beginPath()
            context.moveTo(u, + 0.025 * ratio  + offsetTop)
            context.lineTo(u, - 0.025 * ratio  + offsetTop)    
            context.stroke()
        }
        //if (parametricPosition !== null) {
        //    const u = parameterToPositionOnKnotSlider(parametricPosition, scaleX, offsetLeft)
        if (sketcherState.displayParametricPositionOnSelectedCurve !== null) {
            const u = parameterToPositionOnKnotSlider(sketcherState.displayParametricPositionOnSelectedCurve, scaleX, offsetLeft)
            context.lineWidth = 1.2 / windowWidth
            context.beginPath()
            context.moveTo(u, + 0.025 * ratio  + offsetTop)
            context.lineTo(u, - 0.025 * ratio  + offsetTop)    
            context.stroke()
        }

        context.restore()
        
    }, [scroll, sketcherState.displayParametricPositionOnSelectedCurve, sketcherState.selectedKnot, sketcherState.theme, windowWidth, zoom])


   function sliderPosition(zoom: number){
        const left = leftMaximumSliderPosition
        const right = rightMaximumSliderPosition   
        return left + (zoom - 1) * (right - left) / (maximumZoom - 1)
    }

    function zoomFromSliderPosition(position: number){
        const left = leftMaximumSliderPosition
        const right = rightMaximumSliderPosition   
        return (position - left) * (maximumZoom - 1) / (right - left) + 1
    }

    const drawZoomSlider = useCallback((context: CanvasRenderingContext2D, ratio: number) => {
        const left = leftMaximumSliderPosition
        const right = rightMaximumSliderPosition 
        const lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        const lineColorA = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"
        const lineColorB = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"
        context.save()
        context.strokeStyle = lineColorA
        context.lineJoin = 'round'
        context.lineWidth = 1.2 / windowWidth
        context.beginPath()
        context.moveTo(left, 0.15 * ratio)
        context.lineTo(right, 0.15 * ratio)
        context.stroke()
        context.lineWidth = 1.5 / windowWidth
        context.strokeStyle = lineColor
        context.beginPath()
        //minus symbol
        context.moveTo(0.33 - 0.025 * ratio, 0.15 * ratio)
        context.lineTo(0.33 + 0.025 * ratio, 0.15 * ratio)
        //plus symbol
        context.moveTo(0.67 - 0.025 * ratio, 0.15 * ratio)
        context.lineTo(0.67 + 0.025 * ratio, 0.15 * ratio)
        context.moveTo(0.67, 0.125 * ratio)
        context.lineTo(0.67, 0.175 * ratio)
        context.stroke()

        context.lineWidth = 4.5 / windowWidth
        context.strokeStyle = lineColorB
        context.lineCap = "round";
        context.beginPath()
        //slider
        const position = sliderPosition(zoom)
        context.moveTo(position , 0.125 * ratio)
        context.lineTo(position, 0.175 * ratio)
        context.stroke()
        context.restore()
        
    }, [sketcherState.theme, windowWidth, zoom])

    useLayoutEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return
        context.save()
        context.clearRect(0, 0, windowWidth, windowHeight)
        const ratio = windowHeight / windowWidth
        //setZoom(windowWidth)
        context.scale(windowWidth, windowWidth)
        //context.translate( 0,  0)
        drawZoomSlider(context, ratio)
        if (curve) {
            drawBasisFunctions(context, curve, ratio)
            drawKnotTicks(context, curve, ratio)
            drawKnotSlider(context, curve, ratio)
        }

        const lineColor = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 1)" : "rgba(0, 0, 0, 1)"
        context.strokeStyle = lineColor
        context.lineJoin = 'round'
        context.lineWidth = 1.2 / windowWidth
        context.beginPath()
        context.moveTo(0.03, 0.7 * ratio)
        context.lineTo(0.97, 0.7 * ratio)
        context.stroke()

        let lineColorA = sketcherState.theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)"
        context.strokeStyle = lineColorA
        context.beginPath()
        context.moveTo(0.03, 0.85 * ratio)
        context.lineTo(0.97, 0.85 * ratio)
        //context.moveTo(0.35, 0.15 * ratio)
        //context.lineTo(0.65, 0.15 * ratio)
        context.stroke()
        context.restore()
    }
    , [curve, drawBasisFunctions, drawKnotSlider, drawKnotTicks, drawZoomSlider, scroll, sketcherState.controlPolygonDisplayed, sketcherState.theme, windowHeight, windowWidth, zoom])


    const viewportCoordsToSceneCoords = useCallback(({ clientX, clientY }: { clientX: number; clientY: number }) => {
        const x = (clientX - offsetX) / windowWidth
        const y = (clientY - offsetY) / windowHeight
        return { x, y };
    }, [offsetX, offsetY, windowHeight, windowWidth])

    /*
    const getMouseCoordinates = useCallback((event: MouseEvent): Coordinates | null => {
        if (!canvasRef.current) return null
        const canvas: HTMLCanvasElement = canvasRef.current
        //const viewportCoords = {clientX : event.pageX - canvas.offsetLeft, clientY: event.pageY - canvas.offsetTop}
        const viewportCoords = {clientX : event.clientX - canvas.offsetLeft, clientY: event.clientY - canvas.offsetTop}
        return viewportCoordsToSceneCoords(viewportCoords)
    }, [viewportCoordsToSceneCoords])
    */

    const onZoomSlider = useCallback((point: Coordinates) => {
        if (point.y < 0.2 && Math.abs(point.x - sliderPosition(zoom)) < 0.05) {
            return true
        }
    }, [zoom])

    const onBasisFunctionsArea = useCallback((point: Coordinates) => {
        if (point.y > 0.2 && point.y < 0.7) {
            return true
        }
    }, [])

    const onKnotSliderArea = useCallback((point: Coordinates) => {
        if (point.y > 0.75 && point.y < 0.95) {
            return true
        }
    }, [])

    const addAnEntryToTheHistory = useCallback(() => {
        const e = structuredClone(sketchElements)
        setSketchElements(e, false)
        }, [setSketchElements, sketchElements])


    const helperPressDown = useCallback((client: {clientX: number, clientY: number}) => {
        //setSelectedKnot(null)
        //actionManager.renderAction("selectKnot", null)
        setEditorState("idle")
        //setParametricPosition(null)
        //actionManager.renderAction("displayParametricPositionOnCurve", null)

        setMouseMoveThreshold("not exceeded")
        const point = viewportCoordsToSceneCoords(client)
        if(onZoomSlider(point)) {
            setAction("zooming")
            actionManager.renderAction("removeParametricPositionOnCurveAndKnotSelection")
        }
        else if(onBasisFunctionsArea(point)) {
            setAction("scrolling")
            setInitialMouseXPosition(point.x)  
            actionManager.renderAction("removeParametricPositionOnCurveAndKnotSelection")
        }
        else if(onKnotSliderArea(point)){
            setInitialMouseXPosition(point.x)  
            if (curve) {
                const scaleX = reductionFactor * zoom
                const offsetLeft = 0.05 + reductionFactor * scroll
                const degree = computeDegree(curve)
                const knots = positionOfKnotsOnSlider(curve.knots, degree, scaleX, offsetLeft)
                const knotIndex = getKnotAtPosition(point.x, knots)
                
                //setSelectedKnot(knotIndex)
                if (knotIndex !== null) { 
                    actionManager.renderAction("selectKnot", knotIndex)
                    setEditorState("moving a knot") 
                } else {
                    let position = positionToParameterOnKnotSlider(point.x, scaleX, offsetLeft)
                    if (position < 0) position = 0
                    if (position > 1) position = 1
                    //setParametricPosition(position)
                    actionManager.renderAction("displayParametricPositionOnCurveAndRemoveKnotSelection", position)
                    setEditorState("display position on abscissa")
                }
            }
        } 
        
    }, [actionManager, curve, onBasisFunctionsArea, onKnotSliderArea, onZoomSlider, scroll, viewportCoordsToSceneCoords, zoom])

    const handleMouseDown = useCallback((event: MouseEvent) => {
        const clientX = event.clientX 
        const clientY = event.clientY 
        helperPressDown({clientX, clientY})
    }, [helperPressDown])

    const handleTouchStart = useCallback((event: TouchEvent) => {
        const clientX = event.touches[0].clientX
        const clientY = event.touches[0].clientY
        helperPressDown({clientX, clientY})
    }, [helperPressDown])

    const helperMove = useCallback((point: {clientX: number, clientY: number}) => {
        const x = viewportCoordsToSceneCoords(point).x
        if (editorState !== "display position on abscissa") {
            actionManager.renderAction("displayParametricPositionOnCurve", null)
        }
        if (action === "zooming") {
            let newZoom = zoomFromSliderPosition(x)
            if (newZoom < 1) newZoom = 1
            if (newZoom > maximumZoom) newZoom = maximumZoom
            let newScroll = (scroll - 0.5) * newZoom / zoom + 0.5
            if (newScroll > 0 ) newScroll = 0
            if (newScroll < 1 - zoom) newScroll = 1 - zoom
            setZoom(newZoom)
            setScroll(newScroll)
        }
        if (action === "scrolling" && initialMouseXPosition) {
            let newScroll = scroll + (x - initialMouseXPosition) 
            if (newScroll > 0 ) newScroll = 0
            if (newScroll < 1 - zoom) newScroll = 1 - zoom 
            setInitialMouseXPosition(x)
            setScroll(newScroll)
        }
        if (editorState === "moving a knot") {
            if (initialMouseXPosition === null) return
            if (mouseMoveThreshold === "just exceeded") {
                addAnEntryToTheHistory()
                setMouseMoveThreshold("exceeded")
            }
            if (mouseMoveThreshold === "not exceeded") {
                const d = Math.abs(initialMouseXPosition - x)
                if (d > clickWithoutMovingResolution / sketcherState.zoom) {
                    setMouseMoveThreshold("just exceeded")
                }
            }
            if (!curve || sketcherState.selectedKnot === null) return
            const offsetLeft = 0.05 + reductionFactor * scroll
            let newPosition = (x - offsetLeft ) / zoom / reductionFactor
            if (newPosition < 0) newPosition = 0
            if (newPosition > 1) newPosition = 1
            const index = sketcherState.selectedKnot + computeDegree(curve) + 1
            const cpd = sketcherState.controlPolygonDisplayed
            if (!cpd || mouseMoveThreshold !== "exceeded") return
            moveKnot(sketchElements, setSketchElements, cpd.curveIDs[0] , newPosition, index)
        }
    }, [action, actionManager, addAnEntryToTheHistory, curve, editorState, initialMouseXPosition, mouseMoveThreshold, scroll, setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed, sketcherState.selectedKnot, sketcherState.zoom, viewportCoordsToSceneCoords, zoom])
    

    const handleMouseMove = useCallback((event: MouseEvent) => {
        helperMove({clientX: event.clientX, clientY: event.clientY})
    },[helperMove])

    const handleTouchMove = useCallback((event: TouchEvent) => {  
        helperMove({clientX: event.touches[0].clientX, clientY: event.touches[0].clientY})  
    }, [helperMove])


    const helperPressRelease = useCallback((newMousePosition: Coordinates) => {
        
        if (editorState !== "display position on abscissa") {
            actionManager.renderAction("displayParametricPositionOnCurve", null)
        }
        
        setAction("none")
        setInitialMouseXPosition(null)
        if (editorState === "moving a knot") {
            setEditorState("selected knot")
        }
    }, [actionManager, editorState])

    const handleMouseUp = useCallback((event: MouseEvent) => {
        helperPressRelease(viewportCoordsToSceneCoords({clientX: event.clientX, clientY: event.clientY}))
    }, [helperPressRelease, viewportCoordsToSceneCoords] )

    const handleMouseLeave = useCallback((event: MouseEvent) => {
    }, [] )

    const handleTouchEnd = useCallback((event : TouchEvent) => {
        if (event.touches.length === 0) {
            setAction("none")
        }
    }, [])

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
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown)
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('mousemove', handleMouseMove)
            canvas.removeEventListener('touchmove', handleTouchMove)
            canvas.removeEventListener('mouseup', handleMouseUp)
            canvas.removeEventListener('touchend', handleTouchEnd)
            canvas.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [handleMouseDown, handleMouseLeave, handleMouseMove, handleMouseUp, handleTouchEnd, handleTouchMove, handleTouchStart])


    //return <canvas ref={canvasRef} width = {windowWidth} height = {windowHeight} style = {{backgroundColor: (sketcherState.theme === "dark") ? "black" : "white"}}/>
    return <canvas ref={canvasRef} width = {windowWidth} height = {windowHeight} />

}

/*
function computeBasisFunction(us: number[], knots: readonly number[], degree: number) {
    let result: number[][] = []
    us.forEach((u) => {
        const span = findSpan(u, knots, degree)
        const basis = basisFunctions(span, u, knots, degree)
        result.push(basis)
    })
    return result
}
*/


export function addSpaceBetweenTicks(knots: number[], step: number = 0.01) {
    let result: number[] = []
    let multiplicity = 1
    knots.forEach( (u, i) => {
        if (i === knots.length - 1) {
            result = result.concat(distribute(u, multiplicity, step))
        }
        else if (knots[i] === knots[i + 1]) {
            multiplicity += 1
        } else {
                result = result.concat(distribute(u, multiplicity, step))
                multiplicity = 1
        }
    })
    return result
}

function distribute(value: number, multiplicity: number, step: number = 0.01) {
    let result: number[] = []
    if (multiplicity === 1) {
        return [value]
    }
    const left = value - (multiplicity - 1) * step / 2
    for (let i = 0; i < multiplicity; i += 1) {
        result.push(left + i * step)
    }
    return result
}

function positionOfKnotsOnSlider(knots: number[], degree: number, scaleX: number, offsetLeft: number) {
        const ticks = knots.slice(degree + 1, -(degree + 1))
        return ticks.map((u) =>  u * scaleX + offsetLeft)
}

function positionToParameterOnKnotSlider(u: number, scaleX: number, offsetLeft: number) {
    return  (u - offsetLeft) / scaleX
}

function parameterToPositionOnKnotSlider(u: number, scaleX: number, offsetLeft: number) {
    return  u * scaleX + offsetLeft
}

function getKnotAtPosition(position: number, knots: number[], delta: number = 0.015) {
    const result = knots.findIndex(u => Math.abs(u - position) < delta)
    if (result === -1) {
        return null
    } else return result
}






export default KnotVectorEditor