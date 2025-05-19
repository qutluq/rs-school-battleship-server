import { Direction } from "../types/index.js";

export const getDirection = (booleanDirection: boolean): Direction =>
  booleanDirection ? "vertical" : "horizontal";
