import { CircleArcIcon, EraserIcon as DeleteIcon, FreeDrawIcon, LineIcon, SelectionIcon, ShiftIcon } from "../icons";
import { SketcherState, ActiveToolsType } from "../SketcherState";
import { register } from "./register";

export const TOOLS = [
    {
        icons: FreeDrawIcon,
        value: "freeDraw",
    },
    {
        icons: LineIcon,
        value: "line",
    },
    {
        icons: CircleArcIcon,
        value: "circleArc",
    },
    {
        icons: null,
        value: "singleSelection"
    },
    {
        icons: ShiftIcon,
        value: "multipleSelection",
    },
    {
        icons: null,
        value: "none"
    }
] as const;

/*
    {
        icons: DeleteIcon,
        value: "delete",
    },
*/


export const ActionToggleFreeDrawCreationTool = register({
    name: "toggleFreeDrawCreationTool",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "freeDraw" 
        if (state.activeTool === "freeDraw") {
            tool = "none"
        }
        return {
            ...state,
            activeTool :  tool,
            highlightedCurves: [],
            controlPolygonDisplayed: null,
        }
    }
})




export const ActionToggleLineCreationTool = register({
    name: "toggleLineCreationTool",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "line" 
        if (state.activeTool === "line") {
            tool = "none"
        }
        return {
            ...state,
            activeTool: tool,
            highlightedCurves: [],
            controlPolygonDisplayed: null,
        }
    }
  })

  export const ActionToggleCircleArcCreationTool = register({
    name: "toggleCircleArcCreationTool",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "circleArc" 
        if (state.activeTool === "circleArc") {
            tool = "none"
        }
        return {
            ...state,
            activeTool : tool,
            highlightedCurves: [],
            controlPolygonDisplayed: null,
        }
    }
  })

  export const ActionSelectElement = register({
    name: "selectElement",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "singleSelection" 
        return {
            ...state,
            activeTool : tool
        }
    }
  })


  export const ActionToggleSelection = register({
    name: "toggleSelection",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "multipleSelection" 
        let controlPolygonDisplayed = state.controlPolygonDisplayed
        if (state.activeTool === "multipleSelection") {
            tool = "none"
            controlPolygonDisplayed = null
        }
        //console.log("toggleSelection")
        return {
            ...state,
            activeTool: tool,
            controlPolygonDisplayed: controlPolygonDisplayed,
        }
    }
  })

  export const ActionActivateMultipleSelection = register({
    name: "activateMultipleSelection",
    perform: (state: SketcherState) => {
        let tool: ActiveToolsType  = "multipleSelection" 
        return {
            ...state,
            activeTool: tool,
        }
    }
  })

  export const ActionUnselectCreationTool = register({
    name: "unselectCreationTool",
    perform: (state: SketcherState) => {
        //console.log("unselectCreationTool")
        return {
            ...state,
            activeTool : "none",
            highlightedCurves: [],
            controlPolygonDisplayed: null,
        }
    }
  })

  export const ActionShowAllDrawingTools = register({
    name: "showAllDrawingTools",
    perform: (state: SketcherState, value: boolean) => {
        return {
            ...state,
            showAllDrawingTools: value
        }
    }
  })

  export const ActionShowAllDrawingToolsAndActivateFreeDraw = register({
    name: "showAllDrawingToolsAndActivateFreeDraw",
    perform: (state: SketcherState, value: boolean) => {
        return {
            ...state,
            activeTool : "freeDraw",
            showAllDrawingTools: value, 
            highlightedCurves: [],
            controlPolygonDisplayed: null
        }
    }
  })

  export const ActionShowAllDrawingToolsAndToggleFreeDraw = register({
    name: "showAllDrawingToolsAndToggleFreeDraw",
    perform: (state: SketcherState, value: boolean) => {
        let tool: ActiveToolsType  = "freeDraw" 
        if (state.activeTool === "freeDraw") {
            tool = "none"
        }
        return {
            ...state,
            activeTool : tool,
            showAllDrawingTools: value,
            highlightedCurves: [],
            controlPolygonDisplayed: null
        }
    }
  })



export const ActionToggleKnotVectorEditor = register({
    name: "toggleKnotVectorEditor",
    perform: (state: SketcherState) => {
        return {
            ...state,
            displayParametricPositionOnSelectedCurve: null,
            showKnotVectorEditor: ! state.showKnotVectorEditor,
        }
    }
  })

  export const ActionSelectKnot = register({
    name: "selectKnot",
    perform: (state: SketcherState, knot: null | number) => {
        return {
            ...state,
            selectedKnot: knot
        }
    }
  })

  export const ActionRemoveParametricPositionOnCurve = register({
    name: "removeParametricPositionOnCurve",
    perform: (state: SketcherState) => {
        return {
            ...state,
            displayParametricPositionOnSelectedCurve: null,
        }
    }
  })