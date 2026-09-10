import type { Component } from "./Component";
import type { Faction } from "@data/resources/PawnDefinition";

export class FactionComponent implements Component {
  constructor(public faction: Faction) {}
}
