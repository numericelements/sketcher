import { useState } from "react"
import { BSplineType } from "../curves/curves"


// https://github.com/redhwannacef/youtube-tutorials/blob/main/excalidraw-tutorial/src/App.js
// not yet used here: https://medium.com/geekculture/react-hook-to-allow-undo-redo-d9d791c5cd94

export type setCurvesType = (action: BSplineType[] | ((e: BSplineType[]) => BSplineType[]), overwrite?: boolean) => void

type useHistoryReturnType = [BSplineType[], (action: BSplineType[] | ((e: BSplineType[]) => BSplineType[]), overwrite?: boolean) => void, () => false | void, () => false | void, () => void, number]

export const useHistory = (initialState: BSplineType[]): useHistoryReturnType  => {
    const [index, setIndex] = useState(0)
    const [history, setHistory] = useState([initialState])

    const setState = (action: BSplineType[] | ((e: BSplineType[]) => BSplineType[]), overwrite: boolean = false) => {
        const newState = typeof action === "function" ? action(history[index]) : action
        if (overwrite) {
            const historyCopy = [...history]
            historyCopy[index] = newState
            setHistory(historyCopy)
        } else {
            const updatedState = [...history].slice(0, index + 1)
            setHistory([...updatedState, newState])
            //setIndex(prevState => prevState + 1)
            setIndex(updatedState.length)
        }
    }

    const undo = () => index > 0 && setIndex(prevState => prevState -1)
    const redo = () => index < history.length -1 && setIndex(prevState => prevState + 1)
    const clearHistory = () => {
        setIndex(0)
        setHistory([[]])
    }

    return [history[index], setState, undo, redo, clearHistory, history.length];
}

