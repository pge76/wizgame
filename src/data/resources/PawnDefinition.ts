import type { ResourceDefinition } from "./ResourceDefinition";

export enum Faction {
  Player,
  Enemy
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

export interface PawnDefinition extends ResourceDefinition {
  readonly faction: Faction;
  readonly stats: CombatStats;
  readonly aiBehavior?: AiBehavior;
  /** Filename of an imported raster sprite (see src/assets/monsters/) to render instead of the vector pawn. */
  readonly spriteAsset?: string;
}

export const PAWN_HUMANOID: PawnDefinition = {
  id: "pawn.humanoid",
  displayName: "Humanoid",
  faction: Faction.Player,
  stats: { maxHP: 20, attack: 5, defense: 2, initiative: 6 }
};
