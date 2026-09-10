import type { EntityManager } from "@entities/EntityManager";
import type { EntityId } from "@entities/Entity";
import type { Grid } from "@world/Grid";
import type { GridPos } from "@world/Coordinates";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { PawnDefinition } from "@data/resources/PawnDefinition";
import type { TileDefinition } from "@data/resources/TileDefinition";
import { randomAppearance } from "@data/generation/AppearanceGenerator";
import { TransformComponent } from "@entities/components/TransformComponent";
import { PawnComponent } from "@entities/components/PawnComponent";
import { AppearanceComponent } from "@entities/components/AppearanceComponent";
import { StatsComponent } from "@entities/components/StatsComponent";
import { FactionComponent } from "@entities/components/FactionComponent";
import { BattleParticipantComponent } from "@entities/components/BattleParticipantComponent";

export function spawnCombatant(
  entityManager: EntityManager,
  pawnRegistry: ResourceRegistry<PawnDefinition>,
  grid: Grid,
  pawnDefinitionId: string,
  position: GridPos
): EntityId {
  const definition = pawnRegistry.get(pawnDefinitionId);
  const id = entityManager.createEntity();

  entityManager.addComponent(id, TransformComponent, new TransformComponent(position));
  entityManager.addComponent(id, PawnComponent, new PawnComponent(definition.id));
  entityManager.addComponent(id, AppearanceComponent, new AppearanceComponent(randomAppearance()));
  entityManager.addComponent(
    id,
    StatsComponent,
    new StatsComponent(
      definition.stats.maxHP,
      definition.stats.maxHP,
      definition.stats.attack,
      definition.stats.defense,
      definition.stats.initiative
    )
  );
  entityManager.addComponent(id, FactionComponent, new FactionComponent(definition.faction));
  entityManager.addComponent(id, BattleParticipantComponent, new BattleParticipantComponent());
  grid.getCell(position).occupantEntityId = id;

  return id;
}

/** Breadth-first search outward from `origin`, so results form one contiguous cluster. */
export function findFreeWalkablePositionsNear(
  grid: Grid,
  tileRegistry: ResourceRegistry<TileDefinition>,
  origin: GridPos,
  count: number
): GridPos[] {
  const key = (pos: GridPos): string => `${pos.x},${pos.y}`;
  const visited = new Set<string>([key(origin)]);
  const queue: GridPos[] = [origin];
  const positions: GridPos[] = [];

  while (queue.length > 0 && positions.length < count) {
    const pos = queue.shift()!;
    if (!grid.isInBounds(pos)) continue;

    const cell = grid.getCell(pos);
    if (cell.occupantEntityId === null && tileRegistry.get(cell.terrainId).walkable) {
      positions.push(pos);
    }

    for (const neighbor of grid.neighbors(pos, false)) {
      const neighborKey = key(neighbor);
      if (visited.has(neighborKey)) continue;
      visited.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return positions;
}
