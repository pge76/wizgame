import type { PawnDefinition } from "@data/resources/PawnDefinition";

/** Rolls `pawnDefinition.lootTable` — each entry drops independently with its own `dropChance`.
 *  Any monster/NPC can carry a loot table; it's a property of the PawnDefinition, not special-cased
 *  per monster in code. Empty/absent table → no drops. */
export function rollLoot(pawnDefinition: PawnDefinition): string[] {
  const table = pawnDefinition.lootTable;
  if (!table || table.length === 0) return [];

  return table.filter((entry) => Math.random() < entry.dropChance).map((entry) => entry.itemId);
}
