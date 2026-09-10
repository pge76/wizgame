import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import type { Grid } from "@world/Grid";
import type { GridPos } from "@world/Coordinates";
import { TransformComponent } from "@entities/components/TransformComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { findPath } from "@world/Pathfinding";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { TileDefinition } from "@data/resources/TileDefinition";
import { AiBehavior, Faction, type PawnDefinition } from "@data/resources/PawnDefinition";
import type { BattleSystem } from "./BattleSystem";

function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isAdjacent(grid: Grid, a: GridPos, b: GridPos): boolean {
  return grid.neighbors(a, false).some((n) => n.x === b.x && n.y === b.y);
}

export class EnemyAISystem {
  constructor(
    private readonly battleSystem: BattleSystem,
    private readonly tileRegistry: ResourceRegistry<TileDefinition>,
    private readonly pawnRegistry: ResourceRegistry<PawnDefinition>,
    private readonly onMove: (entityId: EntityId, tilesMoved: number, destination: GridPos) => void
  ) {}

  takeTurn(manager: EntityManager, grid: Grid, enemyId: EntityId): void {
    const pawnDefinitionId = manager.getComponent(enemyId, PawnComponent)?.pawnDefinitionId;
    const behavior = pawnDefinitionId ? this.pawnRegistry.get(pawnDefinitionId).aiBehavior ?? AiBehavior.Basic : AiBehavior.Basic;

    if (behavior === AiBehavior.Skirmish) {
      this.takeSkirmishTurn(manager, grid, enemyId);
    } else {
      this.takeBasicTurn(manager, grid, enemyId);
    }
  }

  /** Approach the nearest enemy and attack once adjacent. */
  private takeBasicTurn(manager: EntityManager, grid: Grid, enemyId: EntityId): void {
    const nearest = this.findNearestTarget(manager, enemyId);
    if (!nearest) return;

    const pos = this.approach(manager, grid, enemyId, nearest.pos);
    if (isAdjacent(grid, pos, nearest.pos)) {
      this.battleSystem.resolveMeleeAttack(manager, enemyId, nearest.id, grid);
    }
  }

  /** Approach and attack like takeBasicTurn, then retreat out of melee range after landing a hit. */
  private takeSkirmishTurn(manager: EntityManager, grid: Grid, enemyId: EntityId): void {
    const nearest = this.findNearestTarget(manager, enemyId);
    if (!nearest) return;

    const pos = this.approach(manager, grid, enemyId, nearest.pos);
    if (!isAdjacent(grid, pos, nearest.pos)) return;

    const attacked = this.battleSystem.resolveMeleeAttack(manager, enemyId, nearest.id, grid);
    if (!attacked) return;

    this.retreat(manager, grid, enemyId, pos, nearest.pos);
  }

  private findNearestTarget(manager: EntityManager, enemyId: EntityId): { id: EntityId; pos: GridPos } | null {
    const pos = manager.getComponent(enemyId, TransformComponent)?.position;
    if (!pos) return null;

    const targets = manager
      .query(StatsComponent, FactionComponent, TransformComponent)
      .filter((id) => manager.getComponent(id, FactionComponent)!.faction === Faction.Player && manager.getComponent(id, StatsComponent)!.currentHP > 0);
    if (targets.length === 0) return null;

    const nearest = targets.reduce((best, id) => {
      const d = manhattan(manager.getComponent(id, TransformComponent)!.position, pos);
      return d < best.d ? { id, d } : best;
    }, { id: targets[0]!, d: Infinity }).id;

    return { id: nearest, pos: manager.getComponent(nearest, TransformComponent)!.position };
  }

  /** Moves the enemy one tile toward targetPos if not already adjacent; returns its (possibly new) position. */
  private approach(manager: EntityManager, grid: Grid, enemyId: EntityId, targetPos: GridPos): GridPos {
    const pos = manager.getComponent(enemyId, TransformComponent)!.position;
    if (isAdjacent(grid, pos, targetPos)) return pos;

    const approachCells = grid
      .neighbors(targetPos, false)
      .filter((n) => grid.getCell(n).occupantEntityId === null && this.tileRegistry.get(grid.getCell(n).terrainId).walkable)
      .sort((a, b) => manhattan(a, pos) - manhattan(b, pos));

    let step: GridPos | undefined;
    for (const cell of approachCells) {
      step = findPath(grid, this.tileRegistry, pos, cell)?.[0];
      if (step) break;
    }
    if (!step) return pos;

    this.moveTo(manager, grid, enemyId, pos, step);
    return step;
  }

  /** Steps once onto the free neighbor farthest from targetPos, to break melee range after attacking. */
  private retreat(manager: EntityManager, grid: Grid, enemyId: EntityId, pos: GridPos, targetPos: GridPos): void {
    const retreatCell = grid
      .neighbors(pos, false)
      .filter((n) => grid.getCell(n).occupantEntityId === null && this.tileRegistry.get(grid.getCell(n).terrainId).walkable)
      .sort((a, b) => manhattan(b, targetPos) - manhattan(a, targetPos))[0];
    if (!retreatCell) return;

    this.moveTo(manager, grid, enemyId, pos, retreatCell);
  }

  private moveTo(manager: EntityManager, grid: Grid, enemyId: EntityId, from: GridPos, to: GridPos): void {
    grid.getCell(from).occupantEntityId = null;
    grid.getCell(to).occupantEntityId = enemyId;
    manager.getComponent(enemyId, TransformComponent)!.position = to;
    this.onMove(enemyId, 1, to);
  }
}
