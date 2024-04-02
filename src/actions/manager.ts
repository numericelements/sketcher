import { Action, SketcherState } from "../SketcherState";

type UpdaterFn = (appState: SketcherState) => void

export class ActionManager {
    actions: { [keyProp: string]: Action }
    state: SketcherState
    updater: UpdaterFn
  
    constructor(state: SketcherState, updater: UpdaterFn) {
      this.state = state
      this.updater = updater
      this.actions = {}
    }
  
    registerAction = (action: Action) => {
      this.actions[action.name] = action
    }
  
    registerAll = (actions: Action[]) => {
      actions.forEach(action => this.registerAction(action))
    }
  
    renderAction = (name: string, payload?: any) => {
      const action = this.actions[name]
      if (!action) {
        console.log(`No action with name ${name}`)
        return
      }
      const newState = action.perform(this.state, payload)
      this.updater(newState)
    }
    
  }