import type { Component } from "./Component";
import type { AppearanceDefinition } from "@data/resources/AppearanceDefinition";

export class AppearanceComponent implements Component {
  constructor(public appearance: AppearanceDefinition) {}
}
