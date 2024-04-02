import { Action } from "../SketcherState";

export const actions: Action[] = []

type RegisterFn = (action: Action) => Action

export const register: RegisterFn = action => {
  actions.push(action)
  return action
}