import { describe, expect, it } from "vitest";
import { rollLoot } from "@data/generation/LootGenerator";
import { Faction, type PawnDefinition } from "@data/resources/PawnDefinition";

function makePawn(lootTable?: PawnDefinition["lootTable"]): PawnDefinition {
  return {
    id: "test.pawn",
    displayName: "Test Pawn",
    faction: Faction.Monster,
    stats: { maxHP: 10, attack: 1, defense: 0, initiative: 1 },
    lootTable
  };
}

describe("rollLoot", () => {
  it("always drops an entry with dropChance 1", () => {
    const pawn = makePawn([{ itemId: "item.a", dropChance: 1 }]);
    for (let i = 0; i < 20; i++) {
      expect(rollLoot(pawn)).toEqual(["item.a"]);
    }
  });

  it("never drops an entry with dropChance 0", () => {
    const pawn = makePawn([{ itemId: "item.a", dropChance: 0 }]);
    for (let i = 0; i < 20; i++) {
      expect(rollLoot(pawn)).toEqual([]);
    }
  });

  it("rolls each entry independently", () => {
    const pawn = makePawn([
      { itemId: "item.always", dropChance: 1 },
      { itemId: "item.never", dropChance: 0 }
    ]);
    expect(rollLoot(pawn)).toEqual(["item.always"]);
  });

  it("returns an empty array when there is no loot table", () => {
    expect(rollLoot(makePawn(undefined))).toEqual([]);
    expect(rollLoot(makePawn([]))).toEqual([]);
  });
});
