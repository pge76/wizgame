import type { Component } from "./Component";

/** PC-only runtime progression state. Level itself lives in PawnDefinition.attributes. */
export class ExperienceComponent implements Component {
  constructor(
    public currentExp: number,
    public expToNextLevel: number
  ) {}
}
