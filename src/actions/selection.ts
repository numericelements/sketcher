import { SketcherState } from "../SketcherState";
import { register } from "./register";

/*
export const ActionSelectCurve = register({
  name: "selectCurve",
  perform: (state: SketcherState, id: string) => {
    return {
        ...state,
        controlPolygonDisplayed: {id, selectedControlPoint: null},
        highlightedCurves: [],
    }
  }
});
*/


export const ActionHighlightCurves = register({
  name: "highlightCurves",
  perform: (state: SketcherState, id: string) => {
    const curveIsAlreadySelected = state.highlightedCurves.includes(id)
    let selectedCurves = []
    if (curveIsAlreadySelected) {
      //selectedCurves = state.highlightedCurves.filter(e => e !== id)
      selectedCurves = state.highlightedCurves
    } else {
      selectedCurves = [...state.highlightedCurves, id]
    }
    return {
        ...state,
        highlightedCurves: selectedCurves,
    }
  }
});

export const ActionUnselectCurve = register({
  name: "unselectCurve",
  perform: (state: SketcherState, id: string) => {
    let selectedCurves = state.controlPolygonDisplayed
    if (selectedCurves) {
      const curveIDs = selectedCurves.curveIDs.filter(e => e !== id)
      selectedCurves = {curveIDs, selectedControlPoint: null}
    }
    return {
        ...state,
        controlPolygonDisplayed: selectedCurves,
    }
  }
});

  export const ActionClearSelectedCurves = register({
    name: "clearSelectedCurves",
    perform: (state: SketcherState) => {
      return {
          ...state,
          activeTool: "none",
          highlightedCurves: [],
          controlPolygonDisplayed: null,
      }
    }
  });

  export const ActionDisplayControlPolygon = register({
    name: "displayControlPolygon",
    perform: (state: SketcherState, id: string) => {
      return {
        ...state,
        activeTool: "singleSelection",
        displayParametricPositionOnSelectedCurve: null,
        controlPolygonDisplayed: { curveIDs: [id], selectedControlPoint: null}
      }
    }
  })

  export const ActionDisplayParametricPositionOnCurve = register({
    name: "displayParametricPositionOnCurve",
    perform: (state: SketcherState, u: number | null) => {
      return {
        ...state,
        displayParametricPositionOnSelectedCurve: u,
      }
    }
  })

  export const ActionDisplayParametricPositionOnCurveAndRemoveKnotSelection = register({
    name: "displayParametricPositionOnCurveAndRemoveKnotSelection",
    perform: (state: SketcherState, u: number | null) => {
      return {
        ...state,
        displayParametricPositionOnSelectedCurve: u,
        selectedKnot: null,
      }
    }
  })

  export const ActionRemoveParametricPositionOnCurveAndKnotSelection = register({
    name: "removeParametricPositionOnCurveAndKnotSelection",
    perform: (state: SketcherState) => {
      return {
        ...state,
        displayParametricPositionOnSelectedCurve: null,
        selectedKnot: null,
      }
    }
  })

  export const ActionSelectCurves = register({
    name: "selectCurves",
    perform: (state: SketcherState, id: string) => {
      const selectedCurves = (!state.controlPolygonDisplayed) ? [] 
        : state.controlPolygonDisplayed.curveIDs
      const curveIsAlreadySelected = selectedCurves.includes(id)
      let newSelectedCurves: string[] = []
      if (curveIsAlreadySelected) {
        newSelectedCurves = [...selectedCurves]
      } else {
        newSelectedCurves = [...selectedCurves, id]
      }
      return {
        ...state,
        activeTool: "multipleSelection",
        controlPolygonDisplayed: { curveIDs: newSelectedCurves, selectedControlPoint: null}
      }
    }
  })

  export const ActionSelectControlPoint = register({
    name: "selectControlPoint",
    perform: (state: SketcherState, payload: {curveID: string, controlPointIndex: number}) => {
      const curveID = payload.curveID
      const controlPointIndex = payload.controlPointIndex
      const controlPolygonDisplayed =  state.controlPolygonDisplayed ? 
       {curveIDs: state.controlPolygonDisplayed.curveIDs, selectedControlPoint: {curveID, controlPointIndex}} : null
       return {
        ...state,
        controlPolygonDisplayed: controlPolygonDisplayed
      }
    }
  })