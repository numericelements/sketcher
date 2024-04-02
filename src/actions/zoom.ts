import { register } from "./register";

const zoomFactor = 1.2

export const ActionZoomIn = register({
  name: "zoomIn",
  perform: state => {
    //const newZoom =  state.zoom + 0.1
    const newZoom =  state.zoom * zoomFactor
    const cx = state.windowWidth / 2
    const cy = state.windowHeight / 2
    return {
      ...state,
      zoom: newZoom,
      scrollX:  state.scrollX - (cx * (newZoom / state.zoom) - cx) / newZoom,
      scrollY:  state.scrollY - (cy * (newZoom / state.zoom) - cy) / newZoom
    }
  }
});

export const ActionZoomOUt = register({
  name: "zoomOut",
  perform: state => {
    //const newZoom = state.zoom > 0.2 ? state.zoom - 0.1 : state.zoom
    const newZoom = state.zoom > 0.2 ? state.zoom / zoomFactor : state.zoom
    const cx = state.windowWidth / 2
    const cy = state.windowHeight / 2
    return {
    ...state,
    zoom: newZoom,
    scrollX:  state.scrollX - (cx * (newZoom / state.zoom) - cx) / newZoom,
    scrollY:  state.scrollY - (cy * (newZoom / state.zoom) - cy) / newZoom
    }
  }
});

export const ActionResetZoom = register({
    name: "resetZoom",
    perform: state => {
      const cx = state.windowWidth / 2
      const cy = state.windowHeight / 2
      return {
      ...state,
      zoom: 1,
      scrollX:  state.scrollX - (cx / state.zoom - cx),
      scrollY:  state.scrollY - (cy / state.zoom - cy)
      }
    }
});

export const ActionZoomWithAFixedPoint = register({
    name: "zoomWithAFixedPoint",
    perform: (state, [viewportX, viewportY, newZoom]: number[]) => {
      return {
      ...state,
      zoom: newZoom,
      scrollX:  state.scrollX - (viewportX * (newZoom / state.zoom) - viewportX) / newZoom,
      scrollY:  state.scrollY - (viewportY * (newZoom / state.zoom) - viewportY) / newZoom
      }
    }
})

export const ActionZoomWithTwoFingers = register({
  name: "zoomWithTwoFingers",
  perform: (state, [deltaX, deltaY, newZoom]: number[]) => {
    return {
    ...state,
    zoom: newZoom,
    scrollX: state.scrollX + deltaX,
    scrollY: state.scrollY + deltaY
    }
  }
})


export const ActionScroll = register({
  name: "scroll",
  perform: (state, [deltaX, deltaY]: number[]) => {
    return {
    ...state,
    scrollX: state.scrollX + deltaX,
    scrollY: state.scrollY + deltaY
    }
  }
})