import type { Component } from "./Component";

export class PawnComponent implements Component {
  constructor(public pawnDefinitionId: string) {}
}
