import { AiBehavior, Faction, type CombatStats, type LootEntry, type PawnDefinition } from "@data/resources/PawnDefinition";

interface MonsterJson {
  readonly id: string;
  readonly displayName: string;
  readonly faction: "player" | "enemy";
  readonly stats: CombatStats;
  readonly aiBehavior?: "basic" | "skirmish";
  readonly spriteAsset?: string;
  readonly lootTable?: readonly LootEntry[];
}

const FACTION_BY_NAME: Record<MonsterJson["faction"], Faction> = {
  player: Faction.PC,
  enemy: Faction.Monster
};

const AI_BEHAVIOR_BY_NAME: Record<NonNullable<MonsterJson["aiBehavior"]>, AiBehavior> = {
  basic: AiBehavior.Basic,
  skirmish: AiBehavior.Skirmish
};

function toPawnDefinition(json: MonsterJson): PawnDefinition {
  const faction = FACTION_BY_NAME[json.faction];
  if (faction === undefined) {
    throw new Error(`Unknown faction "${json.faction}" in monster definition "${json.id}".`);
  }

  let aiBehavior: AiBehavior | undefined;
  if (json.aiBehavior !== undefined) {
    aiBehavior = AI_BEHAVIOR_BY_NAME[json.aiBehavior];
    if (aiBehavior === undefined) {
      throw new Error(`Unknown aiBehavior "${json.aiBehavior}" in monster definition "${json.id}".`);
    }
  }

  return {
    id: json.id,
    displayName: json.displayName,
    faction,
    stats: json.stats,
    aiBehavior,
    spriteAsset: json.spriteAsset,
    lootTable: json.lootTable
  };
}

const monsterModules = import.meta.glob("../resources/monsters/*.json", { eager: true }) as Record<
  string,
  { default: MonsterJson }
>;

/** All monster PawnDefinitions found under src/data/resources/monsters/*.json. */
export const MONSTER_DEFINITIONS: readonly PawnDefinition[] = Object.values(monsterModules).map((module) =>
  toPawnDefinition(module.default)
);
