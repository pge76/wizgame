import { describe, expect, it } from "vitest";
import { EntityManager } from "@entities/EntityManager";
import { TransformComponent } from "@entities/components/TransformComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { EquipmentComponent } from "@entities/components/EquipmentComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";
import { Grid } from "@world/Grid";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import { TILE_FLOOR, type TileDefinition } from "@data/resources/TileDefinition";
import { AiBehavior, Faction, type PawnDefinition } from "@data/resources/PawnDefinition";
import type { ItemDefinition } from "@data/resources/ItemDefinition";
import { BattleSystem } from "@battle/BattleSystem";
import { BattleState } from "@battle/BattleState";
import { EnemyAISystem } from "@battle/EnemyAISystem";

const SKIRMISHER_DEF: PawnDefinition = {
  id: "test.skirmisher",
  displayName: "Test Skirmisher",
  faction: Faction.Monster,
  stats: { maxHP: 10, attack: 3, defense: 1, initiative: 5 },
  aiBehavior: AiBehavior.Skirmish
};

const BASIC_DEF: PawnDefinition = {
  id: "test.basic",
  displayName: "Test Basic",
  faction: Faction.Monster,
  stats: { maxHP: 10, attack: 3, defense: 1, initiative: 5 },
  aiBehavior: AiBehavior.Basic
};

function setup(pawnDef: PawnDefinition, enemyHpFraction: number) {
  const manager = new EntityManager();
  const grid = new Grid(5, 5, TILE_FLOOR.id);
  const tileRegistry = new ResourceRegistry<TileDefinition>();
  tileRegistry.register(TILE_FLOOR);
  const pawnRegistry = new ResourceRegistry<PawnDefinition>();
  pawnRegistry.register(pawnDef);
  const itemRegistry = new ResourceRegistry<ItemDefinition>();

  const battleSystem = new BattleSystem(new BattleState(), itemRegistry, () => {}, () => {});
  const moves: Array<{ entityId: number; destination: { x: number; y: number } }> = [];
  const ai = new EnemyAISystem(battleSystem, tileRegistry, pawnRegistry, (entityId, _tilesMoved, destination) =>
    moves.push({ entityId, destination })
  );

  const enemyId = manager.createEntity();
  manager.addComponent(enemyId, TransformComponent, new TransformComponent({ x: 2, y: 2 }));
  manager.addComponent(enemyId, PawnComponent, new PawnComponent(pawnDef.id));
  const maxHp = pawnDef.stats.maxHP;
  manager.addComponent(
    enemyId,
    StatsComponent,
    new StatsComponent(maxHp, Math.round(maxHp * enemyHpFraction), pawnDef.stats.attack, pawnDef.stats.defense, pawnDef.stats.initiative)
  );
  manager.addComponent(enemyId, FactionComponent, new FactionComponent(Faction.Monster));
  grid.getCell({ x: 2, y: 2 }).occupantEntityId = enemyId;

  const targetId = manager.createEntity();
  manager.addComponent(targetId, TransformComponent, new TransformComponent({ x: 2, y: 3 })); // adjacent to (2,2)
  manager.addComponent(targetId, StatsComponent, new StatsComponent(20, 20, 5, 0, 5));
  manager.addComponent(targetId, FactionComponent, new FactionComponent(Faction.PC));
  manager.addComponent(targetId, EquipmentComponent, new EquipmentComponent());
  manager.addComponent(targetId, BattleParticipantComponent, new BattleParticipantComponent());
  grid.getCell({ x: 2, y: 3 }).occupantEntityId = targetId;

  return { manager, grid, ai, enemyId, targetId, moves };
}

describe("EnemyAISystem", () => {
  it("Basic: stays put and attacks while already adjacent, at full HP", () => {
    const { manager, grid, ai, enemyId, targetId, moves } = setup(BASIC_DEF, 1);

    ai.takeTurn(manager, grid, enemyId);

    expect(moves).toEqual([]);
    expect(manager.getComponent(enemyId, TransformComponent)!.position).toEqual({ x: 2, y: 2 });
    expect(manager.getComponent(targetId, StatsComponent)!.currentHP).toBeLessThan(20);
  });

  it("Skirmish: stays put and attacks while already adjacent, at full HP (no more unconditional retreat)", () => {
    const { manager, grid, ai, enemyId, targetId, moves } = setup(SKIRMISHER_DEF, 1);

    ai.takeTurn(manager, grid, enemyId);

    expect(moves).toEqual([]);
    expect(manager.getComponent(enemyId, TransformComponent)!.position).toEqual({ x: 2, y: 2 });
    expect(manager.getComponent(targetId, StatsComponent)!.currentHP).toBeLessThan(20);
  });

  it("Skirmish: retreats instead of attacking once its own HP drops below FLEE_HP_RATIO", () => {
    const { manager, grid, ai, enemyId, targetId, moves } = setup(SKIRMISHER_DEF, 0.2);

    ai.takeTurn(manager, grid, enemyId);

    expect(moves).toHaveLength(1);
    expect(manager.getComponent(enemyId, TransformComponent)!.position).not.toEqual({ x: 2, y: 2 });
    expect(manager.getComponent(targetId, StatsComponent)!.currentHP).toBe(20); // no attack happened
  });
});
