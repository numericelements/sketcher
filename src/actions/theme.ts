import { SketcherState, Theme } from "../SketcherState";
import { register } from "./register";

export const ActionSetTheme = register({
    name: "setTheme",
    perform: (state: SketcherState, theme: Theme) => {
      return {
          ...state,
          theme: theme,
      }
    }
  });