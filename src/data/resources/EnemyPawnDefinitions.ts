import { AiBehavior, Faction, type PawnDefinition } from "./PawnDefinition";

export const PAWN_RAT: PawnDefinition = {
  id: "pawn.rat",
  displayName: "Rat",
  faction: Faction.Enemy,
  stats: { maxHP: 8, attack: 3, defense: 0, initiative: 8 },
  aiBehavior: AiBehavior.Skirmish
};

export const PAWN_BANDIT: PawnDefinition = {
  id: "pawn.bandit",
  displayName: "Bandit",
  faction: Faction.Enemy,
  stats: { maxHP: 16, attack: 6, defense: 2, initiative: 5 },
  aiBehavior: AiBehavior.Basic
};
