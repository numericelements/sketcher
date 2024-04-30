import React, { useCallback, useEffect, useMemo, useState } from 'react';

import './Sketcher.css';
import { useTranslation } from '../hooks/useTranslation';
import { SketcherState, defaultInitialState } from '../SketcherState';
import { useWindowSize } from '../hooks/useWindowSize';
import { useOutsideClickHook } from '../hooks/useOutsideClickHook';
import { useHistory } from '../hooks/useHistory';
import { BSplineType, elevateDegree, insertKnot, optimizedKnotPositions, removeAKnot } from '../curves/curves';
import { ActionManager } from '../actions/manager';
import { actions } from "../actions/register";
import '../actions';
import clsx from 'clsx';
import { CircleArcIcon, CircleArcIconDark, DeleteKnotIcon, DownArrowIcon, DuplicateIcon, ExportIcon, ExportImageIcon, FreeDrawIcon, HamburgerMenuIcon, InsertKnotIcon, KnotVectorEditorIcon, LineIcon, LineIconDark, LoadIcon, MoonIcon, MultipleSelectionIcon, PencilIcon, RedoIcon, SelectionIcon, ShiftIcon, SunIcon, TrashIcon, UndoIcon, UpArrowIcon, ZoomInIcon, ZoomOutIcon } from '../icons';
import Canvas from './canvas/Canvas';
import { LanguageList } from './LanguageList';
import KnotVectorEditor from './KnotVectorEditor';
import { removeASingleKnot } from '../bsplines/knotPlacement/automaticFitting';
import { downloadRectangleSvg} from '../renderer/RenderSceneToSvg';
import { saveCurves } from '../renderer/SaveAndOpen';


const initialElements: BSplineType[] = []


function Sketcher() {

    const t = useTranslation()
    const [sketcherState, setSketcherState] = useState(defaultInitialState)
    const [openMainMenu, setOpenMainMenu] = useState(false)
    //const [openRightToolbar, setOpenRightToolar] = useState(false)
    const [windowWidth, windowHeight] = useWindowSize()
    const menuRef = useOutsideClickHook(() => {setOpenMainMenu(false)})
    const [sketchElements, setSketchElements, undo, redo, clearCanvasAndHistory, historyLength] = useHistory(initialElements)
    //const [showAllDrawingTools, setShowAllDrawingTools] = useState(false)


    useEffect(() => {
      document.body.className = 'sketcher'
      return () => {
        document.body.className = ''
      }
    })

    useEffect(() => {
        setSketcherState((prevState: SketcherState) => {
          return {
            ...prevState,
            windowWidth: windowWidth,
            windowHeight: windowHeight,
          }
        })
      }, [windowWidth, windowHeight]
    )

    const actionManager = useMemo(() => new ActionManager(sketcherState, setSketcherState), [sketcherState])
    actionManager.registerAll(actions)

    const handleOpenMainMenu = () => {
      setOpenMainMenu(!openMainMenu)
    }

    const handleZoomOut = useCallback(() => {
      actionManager.renderAction("zoomOut")
    },[actionManager])
  
    const handleZoomIn = useCallback(() => {
      actionManager.renderAction("zoomIn")
    },[actionManager])
  
    const handleZoomReset = () => {
      actionManager.renderAction("resetZoom")
    }
  
    const handleOpenFile = () => {
        const fileInput = document.getElementById('file')
        if (fileInput !== null) {
          fileInput.onclick = (e: Event) => {
            let t = e.target as HTMLInputElement
            t.value = ""
          }
          fileInput.addEventListener('change', readSingleFile, false ) 
          fileInput.click()
          //fileInput.removeEventListener('change', readSingleFile )
        }
        setOpenMainMenu(false)
    }

    const openCurves = useCallback((fileContent: string) => {
      const curves = JSON.parse(fileContent)
      setSketchElements(curves)
    }, [setSketchElements])

    const readSingleFile = useCallback((ev: Event) => {
      const fileReader = new FileReader()
            fileReader.onload = async() => {
                const fileContent = fileReader.result as string
                openCurves(fileContent)
            }
            if (ev.target === null ) return
            let t = ev.target as HTMLInputElement
            if (t.files === null) return
            fileReader.readAsText(t.files[0])
            //t.files = null
    }, [openCurves] )

    useEffect(() => {
      const fileInput = document.getElementById('file')
      if (fileInput !== null) {
        fileInput.addEventListener('change', readSingleFile, false) 
      }
      return () => {
        if (fileInput !== null) {
        fileInput.removeEventListener('change', readSingleFile, false )
        }
      }
    }, [readSingleFile])


      
      





  
    const handleSave = () => {
      saveCurves(sketchElements)
      setOpenMainMenu(false)
    }
  
    const handleExport = () => {
      downloadRectangleSvg()
      //testSave()
      setOpenMainMenu(false)
    }
  
    const handleResetCanvas = () => {
      clearCanvasAndHistory()
      setSketcherState({...defaultInitialState, 
        windowWidth: windowWidth,
        windowHeight: windowHeight,
        theme: sketcherState.theme
      })
      setOpenMainMenu(false)
    }
  
  
    const handleLightMode = () => {
      //setLightMode(!lightMode)
      if (sketcherState.theme === "dark")
        actionManager.renderAction("setTheme", "light")
      else if (sketcherState.theme === "light") {
        actionManager.renderAction("setTheme", "dark")
      }
    }
  
    const handleUndo = () => {
      //actionManager.renderAction("clearSelectedElements")
      undo()
    }
  
    const handleRedo = () => {
      redo()
    }
  
    const handleCreateFreeDraw = useCallback(() => {
      //actionManager.renderAction("showAllDrawingTools", true)
      //actionManager.renderAction("showAllDrawingToolsAndActivateFreeDraw", true)
      actionManager.renderAction("showAllDrawingToolsAndToggleFreeDraw", true)
    },[actionManager])
  
    const handleCreateLine = useCallback(() => {
      actionManager.renderAction("toggleLineCreationTool")
    }, [actionManager])
  
    const handleCreateCircleArc = useCallback(() => {
      actionManager.renderAction("toggleCircleArcCreationTool")
    }, [actionManager])
    
    const handleSelectionMode = useCallback(() => {
      actionManager.renderAction("toggleSelection")
    }, [actionManager])

    const handleActivateMultipleSelection = useCallback(() => {
      if (!sketcherState.showKnotVectorEditor)  {
        actionManager.renderAction("activateMultipleSelection")
      }
    }, [actionManager, sketcherState.showKnotVectorEditor])
  
    const handleDelete = useCallback(() => {
      //const selectedElements = sketcherState.highlightedCurves
      //let newElements = sketchElements.filter((element) => !selectedElements.includes(element.id))
      let newElements: BSplineType[] = []
      if (sketcherState.controlPolygonDisplayed !== null) {
        const editingElements = sketcherState.controlPolygonDisplayed.curveIDs
        newElements = sketchElements.filter((element) => !editingElements.includes(element.id))
        setSketchElements(newElements)
      }
      actionManager.renderAction("clearSelectedCurves")
  }, [actionManager, setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed])

  const handleShowKnotVectorEditor = useCallback(() => {
    actionManager.renderAction("toggleKnotVectorEditor")
  }, [actionManager])

  const handleIncreaseDegree = useCallback(() => {
    if (sketcherState.controlPolygonDisplayed === null) return
    elevateDegree(sketchElements, setSketchElements, sketcherState.controlPolygonDisplayed.curveIDs[0])
  }, [setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed])

  const handleDecreaseDegree = useCallback(() => {

  }, [])

  const handleInsertKnot = useCallback(() => {
    //console.log(sketcherState.displayParametricPositionOnSelectedCurve)
      const u = sketcherState.displayParametricPositionOnSelectedCurve
      if (u === null || sketcherState.controlPolygonDisplayed === null) return
      insertKnot(u, sketchElements, setSketchElements, sketcherState.controlPolygonDisplayed.curveIDs[0])
      actionManager.renderAction("displayParametricPositionOnCurve", null)
  }, [actionManager, setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed, sketcherState.displayParametricPositionOnSelectedCurve])  

  const handleDeleteKnot = useCallback(() => {
    /*
    if (sketcherState.controlPolygonDisplayed === null) return
    const id = sketcherState.controlPolygonDisplayed.curveIDs[0]
    let index = sketchElements.findIndex((e: BSplineType) => (e.id === id))
    let curve = sketchElements[index]
    let c = curve.points.length
    if (sketcherState.controlPolygonDisplayed === null) return
    optimizedKnotPositions(sketchElements, setSketchElements, sketcherState.controlPolygonDisplayed.curveIDs[0], sketcherState.zoom, 0.1 * c / 10, false)
    */
    if (sketcherState.controlPolygonDisplayed === null) return
    if (sketcherState.selectedKnot === null) {
      optimizedKnotPositions(sketchElements, setSketchElements, sketcherState.controlPolygonDisplayed.curveIDs[0], sketcherState.zoom, 0.1, false)
    } else {
      removeAKnot(sketchElements, setSketchElements, sketcherState.controlPolygonDisplayed.curveIDs[0], sketcherState.selectedKnot)
    }
    actionManager.renderAction("selectKnot", null)
  }, [actionManager, setSketchElements, sketchElements, sketcherState.controlPolygonDisplayed, sketcherState.selectedKnot, sketcherState.zoom])  
  
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch(event.key) {
        case "1":
            handleCreateFreeDraw()
            break
        case "2":
          handleCreateLine()
          break
        case "3":
          handleCreateCircleArc()
          break
        case "Shift":
            handleActivateMultipleSelection()
            break
        case "Delete":
        case "Backspace":
            handleDelete()
            break
        case "+":
        case "=":
            handleZoomIn()
            break
        case "-":
            handleZoomOut()
            break
    }
  }, [handleActivateMultipleSelection, handleCreateCircleArc, handleCreateFreeDraw, handleCreateLine, handleDelete, handleZoomIn, handleZoomOut])


/*
  useEffect(() => {
      let inputFile: HTMLInputElement | null
      if (document !== null) {
        inputFile = document.getElementById('file') as HTMLInputElement
        if (inputFile !== null) {
          inputFile.addEventListener('change', readSingleFile ) 
        }
      }
      return () => {
        if (inputFile !== null)
          inputFile.removeEventListener('change', readSingleFile )
      }
  }, [readSingleFile])
  */

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
        window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])






  const theme = sketcherState.theme

  return (
    <div className="canvas-menu-container">
          <div className="fixed-side-container">
            <div className="menu-top"> 
              <div className={"dropdown-menu-button-" + theme} ref={menuRef}>
                <button onClick={handleOpenMainMenu} className={"dropdown-menu-button-" + theme}><div className={"hamburger"}>{HamburgerMenuIcon}</div></button>
                {openMainMenu ? (
                  <div  >
                  <ul className={"menu-" + theme}>
                    <li className="menu-item">
                      <button onClick={handleOpenFile}>
                        <div className={"dropdown-menu-item-icon-" + theme}>{LoadIcon}</div> &nbsp; <div className={"dropdown-menu-item-text-" + theme}>{t("buttons.load")}</div></button>
                    </li>
                    <li className="menu-item">
                      <button onClick={handleSave}><div className={"dropdown-menu-item-icon-" + theme}>{ExportIcon}</div> &nbsp; <div className={"dropdown-menu-item-text-" + theme}>{t("buttons.export")}</div></button>
                    </li>
                    <li className="menu-item">
                      {/* <button onClick={handleExport}><div className={"dropdown-menu-item-icon-" + theme}>{ExportImageIcon}</div> &nbsp; <div className={"dropdown-menu-item-text-" + theme}>{t("buttons.exportToSvg")}</div></button> */}
                    </li>
                
                    <li className="menu-item">
                      <button onClick={handleResetCanvas}><div className={"dropdown-menu-item-icon-" + theme}>{TrashIcon}</div> &nbsp; <div className={"dropdown-menu-item-text-" + theme}>{t("buttons.clearReset")}</div></button>
                    </li>
                    <li className="menu-item">
                      <button onClick={handleLightMode}><div className={"dropdown-menu-item-icon-" + theme}>{sketcherState.theme === "dark" ? SunIcon: MoonIcon}</div> &nbsp;<div className={"dropdown-menu-item-text-" + theme}>{sketcherState.theme === "dark"? t("buttons.lightMode") : t("buttons.darkMode")}</div></button>
                    </li>
                    <li className="menu-item">
                      <LanguageList className = {"dropdown-select-language-" + theme} style={{ width: "100%"}}/>
                    </li>
                  </ul>
                  </div>
                ) : null}
              </div>
              <div className={"shapes-section-" + theme}>
                {sketcherState.showAllDrawingTools || sketchElements.length !== 0 ? 
                  <>
                  <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "freeDraw" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "freeDraw" && sketcherState.theme === "dark")})} onClick={handleCreateFreeDraw}>{FreeDrawIcon}</button>
                  <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "line" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "line" && sketcherState.theme === "dark")})}  onClick={handleCreateLine}>{sketcherState.theme === "light" ? LineIcon : LineIconDark}</button>
                  <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "circleArc" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "circleArc" && sketcherState.theme === "dark")})}  onClick={handleCreateCircleArc}>{sketcherState.theme === "light" ? CircleArcIcon : CircleArcIconDark}</button>
                  </>
                : <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "freeDraw" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "freeDraw" && sketcherState.theme === "dark")})} onClick={handleCreateFreeDraw}>{PencilIcon}</button>
              }
                { sketchElements.length !== 0 ?
                <> 
                {/*
                <div className={"toolbar-divider-" + theme}></div>
                 <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "highlightElements" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "highlightElements" && sketcherState.theme === "dark")})} onClick={handleSelectionMode}>{SelectionIcon}</button>
                <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "highlightElements" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "highlightElements" && sketcherState.theme === "dark")})} onClick={handleSelectionMode}>{MultipleSelectionIcon}</button> */}
                 </>
                : null}
              </div>
              <div className={"right-toolbar-positionning"}>
              {sketcherState.highlightedCurves.length !== 0 || sketcherState.controlPolygonDisplayed !== null || sketcherState.activeTool === "multipleSelection" ? (
                  <div>
                  <ul className={"right-toolbar-menu-" + theme}>
                    { (sketcherState.activeTool === "singleSelection") ?
                    <li>
                      <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.showKnotVectorEditor && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.showKnotVectorEditor && sketcherState.theme === "dark")})} onClick={handleShowKnotVectorEditor} style={{fontSize:"19px", fontWeight:"700", textAlign:"left"}}>b</button>
                    </li> : null
                    }
                    { (!sketcherState.showKnotVectorEditor) ?
                    <div>
                    <li >
                      <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"}, {"is-checked-light": (sketcherState.activeTool === "multipleSelection" && sketcherState.theme === "light")}, {"is-checked-dark": (sketcherState.activeTool === "multipleSelection" && sketcherState.theme === "dark")})} onClick={handleSelectionMode}>{ShiftIcon}</button>
                    </li>
                    </div> : null
                    }

                   

                    { (sketcherState.showKnotVectorEditor) ?
                    <div>
                    <li>
                    <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleIncreaseDegree}>{UpArrowIcon}</button>
                    </li> 
                    {/* <li>
                      <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleDecreaseDegree}>{DownArrowIcon}</button>
                    </li> */}
                    { (sketcherState.displayParametricPositionOnSelectedCurve) ? 
                    <li>
                    <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleInsertKnot}>{InsertKnotIcon}</button>
                    </li> : null }
                    <li>
                    <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleDeleteKnot}>{DeleteKnotIcon}</button>
                    </li> 
                    </div>
                    : null
                    } 
                    <li >
                      <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleDelete}>{DuplicateIcon} </button>
                    </li>
                    <li >
                      <button className={clsx({"menu-top-button-light": theme === "light"}, {"menu-top-button-dark": theme === "dark"})} onClick={handleDelete}>{TrashIcon} </button>
                    </li>
                  </ul>
                  </div>
                ) : null}

              </div>
            </div>

            <div>
              <input id='file' type='file' />
            </div>

            {(historyLength !== 1 || sketcherState.zoom !== 1) ? (
            <div className="footer">
              
              <button onClick={handleZoomOut} className={"zoom-undo-redo-button-" + theme + " " + "zoom-out-button"}>{ZoomOutIcon}</button>
              <button onClick={handleZoomReset} className={"reset-zoom-button-" + theme}>{Math.round(sketcherState.zoom * 100)}%
                <span className="tooltiptext">{t("buttons.resetZoom")}</span>
              </button>
              <button onClick={handleZoomIn} className={"zoom-undo-redo-button-" + theme + " " + "zoom-in-button"}>{ZoomInIcon}</button>
              <button onClick={handleUndo} className={"zoom-undo-redo-button-" + theme + " " + "undo-button"}>{UndoIcon}
                <span className="tooltiptext">{t("buttons.undo")}</span>
              </button>
              <button onClick={handleRedo} className={"zoom-undo-redo-button-" + theme + " " + "redo-button"}>{RedoIcon}
                <span className="tooltiptext">{t("buttons.redo")}</span>
              </button>
            
            </div>
            ): null}
          
          </div>
          <main className="canvas">
            <Canvas sketcherState = {sketcherState} actionManager = {actionManager} sketchElements={sketchElements} setSketchElements={setSketchElements} windowWidth={windowWidth} windowHeight={windowHeight}/>
          </main>
          { sketcherState.showKnotVectorEditor &&  sketcherState.activeTool === "singleSelection"?
            <div className= {clsx({"knot-vector-editor-light": theme === "light"}, {"knot-vector-editor-dark": theme === "dark"})} style={{top: windowHeight * 2 / 3 , left: windowWidth / 3 }}>
              <KnotVectorEditor sketcherState = {sketcherState} actionManager = {actionManager} sketchElements={sketchElements} setSketchElements={setSketchElements} windowWidth={windowWidth * 9 / 16} windowHeight={windowHeight  / 4} offsetX = {windowWidth / 3} offsetY = {windowHeight * 2 / 3} />
            </div> : null
          }
        </div>

        )
}


export default Sketcher