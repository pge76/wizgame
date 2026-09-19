import type { ResourceDefinition } from "./ResourceDefinition";

/** PC: a Player/Party Character (one of the 6 party slots).
 *  NPC: any non-party pawn. Monster: an aggressive NPC (the only NPC kind implemented so far). */
export enum Faction {
  PC,
  Monster
}

/** Basic: approach the nearest enemy and attack once adjacent.
 *  Skirmish: same, but retreats out of melee range right after landing a hit (hit-and-run). */
export enum AiBehavior {
  Basic,
  Skirmish
}

export interface CombatStats {
  readonly maxHP: number;
  readonly attack: number;
  readonly defense: number;
  readonly initiative: number;
}

/** Shared attribute set for PCs and NPCs/monsters alike. */
export interface Attributes {
  readonly level: number;
  readonly strength: number;
  readonly intelligence: number;
  readonly piety: number;
  readonly vitality: number;
  readonly dexterity: number;
  readonly speed: number;
  readonly senses: number;
}

/** One possible drop: `itemId` drops independently with probability `dropChance` (0-1) on death. */
export interface LootEntry {
  readonly itemId: string;
  readonly dropChance: number;
}

export interface PawnDefinition extends ResourceDefinition {
  readonly faction: Faction;
  readonly stats: CombatStats;
  readonly attributes?: Attributes;
  /** Exp granted to the party on kill. Monster/NPC only. */
  readonly expReward?: number;
  readonly aiBehavior?: AiBehavior;
  /** Filename of an imported raster sprite (see src/assets/monsters/) to render instead of the vector pawn. */
  readonly spriteAsset?: string;
  /** Possible item drops on death — see LootGenerator.rollLoot. Monster/NPC only. */
  readonly lootTable?: readonly LootEntry[];
}

export const PAWN_HUMANOID: PawnDefinition = {
  id: "pawn.humanoid",
  displayName: "Humanoid",
  faction: Faction.PC,
  stats: { maxHP: 20, attack: 5, defense: 2, initiative: 6 },
  attributes: {
    level: 1,
    strength: 10,
    intelligence: 10,
    piety: 10,
    vitality: 10,
    dexterity: 10,
    speed: 10,
    senses: 10
  }
};
