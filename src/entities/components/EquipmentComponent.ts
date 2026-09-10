import type { Component } from "./Component";

export enum EquipmentSlot {
  Head,
  Torso,
  Legs,
  Cloak,
  Gloves,
  Boots,
  Ring,
  LeftHand,
  RightHand,
  Ranged,
  Munition,
  Neck
}

/** Visual paperdoll only for now — no items exist yet to equip into these slots. */
export class EquipmentComponent implements Component {
  readonly slots: Partial<Record<EquipmentSlot, string | null>>;

  constructor() {
    this.slots = Object.fromEntries(
      Object.values(EquipmentSlot)
        .filter((v): v is EquipmentSlot => typeof v === "number")
        .map((slot) => [slot, null])
    );
  }
}
