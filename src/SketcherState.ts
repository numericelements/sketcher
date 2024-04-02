import { TOOLS } from "./actions/tools"

export type Theme = "light" | "dark"

export type ActiveToolsType = typeof TOOLS[number]["value"]

export type SketcherState = {
    theme: Theme
    zoom: number
    offsetLeft: number
    offsetTop: number
    scrollX: number
    scrollY: number
    windowWidth: number
    windowHeight: number
    openMenu: "app" | "shape" | null
    activeTool:  ActiveToolsType
    highlightedCurves: string[] // list of curve IDs.
    controlPolygonDisplayed: {curveIDs: string[], selectedControlPoint: {curveID: string,  controlPointIndex: number} | null } | null
    displayParametricPositionOnSelectedCurve: number | null
    showAllDrawingTools: boolean
    showKnotVectorEditor: boolean
    selectedKnot: null | number
}

export const defaultInitialState: SketcherState = {
    theme: "light",
    zoom: 1,
    offsetLeft: 0,
    offsetTop: 0,
    scrollX: 0,
    scrollY: 0,
    windowWidth: 0,
    windowHeight: 0,
    openMenu: null,
    activeTool: "none",
    highlightedCurves: [],
    controlPolygonDisplayed: null,
    displayParametricPositionOnSelectedCurve: null,
    showAllDrawingTools: false,
    showKnotVectorEditor: false,
    selectedKnot: null,
}
  
export type Action = {
    name: string
    perform: (appState: SketcherState, payload: any) => SketcherState
}