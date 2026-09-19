import type { Component } from "./Component";

/** An item lying on the overworld floor (e.g. monster loot) — doesn't block movement, unlike doors
 *  and pawns, and is picked up automatically when a party member walks onto its tile. */
export class GroundItemComponent implements Component {
  constructor(public readonly itemId: string) {}
}
