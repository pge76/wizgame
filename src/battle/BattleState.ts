import type { EntityId } from "@entities/Entity";

export enum BattlePhase {
  Player,
  Enemy
}

export enum BattleOutcome {
  Ongoing,
  Victory,
  Defeat
}

export class BattleState {
  phase: BattlePhase = BattlePhase.Player;
  outcome: BattleOutcome = BattleOutcome.Ongoing;
  selectedEntityId: EntityId | null = null;

  reset(): void {
    this.phase = BattlePhase.Player;
    this.outcome = BattleOutcome.Ongoing;
    this.selectedEntityId = null;
  }
}
