import type { Component } from "./Component";
import type { GridPos } from "@world/Coordinates";

const DEFAULT_CYCLES_PER_SECOND = 4;

/** Transient visual-only lunge toward `targetPos` and back; does not affect grid position. */
export class AttackAnimationComponent implements Component {
  constructor(
    public targetPos: GridPos,
    public progress = 0,
    public speed = DEFAULT_CYCLES_PER_SECOND
  ) {}
}
