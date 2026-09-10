import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import type { Grid } from "@world/Grid";
import { TransformComponent } from "@entities/components/TransformComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { AttackAnimationComponent } from "@entities/components/AttackAnimationComponent";
import { Faction } from "@data/resources/PawnDefinition";
import type { System } from "@systems/System";
import { BattleOutcome, BattleState } from "./BattleState";

function isAlive(manager: EntityManager, id: EntityId): boolean {
  return (manager.getComponent(id, StatsComponent)?.currentHP ?? 0) > 0;
}

export class BattleSystem implements System {
  constructor(
    private readonly state: BattleState,
    private readonly onOutcome: (outcome: BattleOutcome) => void,
    private readonly onAttack: (attackerId: EntityId, targetId: EntityId, attackStat: number, defenseStat: number, damage: number) => void
  ) {}

  update(_dt: number, manager: EntityManager, _grid: Grid): void {
    if (this.state.outcome !== BattleOutcome.Ongoing) return;

    this.checkOutcome(manager);
    if (this.state.outcome !== BattleOutcome.Ongoing) {
      this.onOutcome(this.state.outcome);
    }
  }

  resolveMeleeAttack(manager: EntityManager, attackerId: EntityId, targetId: EntityId, grid: Grid): boolean {
    const attackerPos = manager.getComponent(attackerId, TransformComponent)?.position;
    const targetPos = manager.getComponent(targetId, TransformComponent)?.position;
    if (!attackerPos || !targetPos) return false;

    const isAdjacent = grid.neighbors(attackerPos, false).some((n) => n.x === targetPos.x && n.y === targetPos.y);
    if (!isAdjacent) return false;

    const attackerStats = manager.getComponent(attackerId, StatsComponent);
    const targetStats = manager.getComponent(targetId, StatsComponent);
    if (!attackerStats || !targetStats) return false;

    manager.addComponent(attackerId, AttackAnimationComponent, new AttackAnimationComponent(targetPos));

    const attackValue = Math.max(0, attackerStats.attack - targetStats.defense);
    const damage = 1 + attackValue;
    targetStats.currentHP -= damage;
    this.onAttack(attackerId, targetId, attackerStats.attack, targetStats.defense, damage);

    if (targetStats.currentHP <= 0) {
      grid.getCell(targetPos).occupantEntityId = null;
    }

    return true;
  }

  private checkOutcome(manager: EntityManager): void {
    const combatants = manager.query(StatsComponent, FactionComponent, BattleParticipantComponent);
    const aliveEnemies = combatants.filter(
      (id) => manager.getComponent(id, FactionComponent)!.faction === Faction.Monster && isAlive(manager, id)
    );
    const alivePlayers = combatants.filter(
      (id) => manager.getComponent(id, FactionComponent)!.faction === Faction.PC && isAlive(manager, id)
    );

    if (aliveEnemies.length === 0) this.state.outcome = BattleOutcome.Victory;
    else if (alivePlayers.length === 0) this.state.outcome = BattleOutcome.Defeat;
  }
}
