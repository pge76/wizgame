import type { EncounterTable } from "@data/resources/EncounterTable";

function pickWeightedEntry<T extends { weight: number }>(entries: readonly T[]): T {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  const lastEntry = entries[entries.length - 1];
  if (!lastEntry) {
    throw new Error("Cannot pick a weighted entry from an empty list.");
  }
  return lastEntry;
}

export function rollEncounter(table: EncounterTable): string[] {
  const entry = pickWeightedEntry(table.entries);
  const count = entry.minCount + Math.floor(Math.random() * (entry.maxCount - entry.minCount + 1));
  return Array.from({ length: count }, () => entry.pawnDefinitionId);
}
