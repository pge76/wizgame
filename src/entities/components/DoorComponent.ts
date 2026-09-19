import type { Component } from "./Component";

/** A door blocks its grid cell (via occupantEntityId, like a pawn) while closed. `requiredItemId`
 *  is the exact item id that unlocks it — null for a normal, always-openable door. Different doors
 *  can require different keys; there's no single "master key" concept. */
export class DoorComponent implements Component {
  constructor(
    public readonly requiredItemId: string | null,
    public isOpen = false
  ) {}
}
