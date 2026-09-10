import type { Component } from "./Component";
import type { GridPos } from "@world/Coordinates";

export class TransformComponent implements Component {
  constructor(public position: GridPos) {}
}
