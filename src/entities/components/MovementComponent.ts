import type { Component } from "./Component";
import type { GridPos } from "@world/Coordinates";

const DEFAULT_TILES_PER_SECOND = 4;

export class MovementComponent implements Component {
  constructor(
    public path: GridPos[],
    public progress = 0,
    public speed = DEFAULT_TILES_PER_SECOND
  ) {}
}
