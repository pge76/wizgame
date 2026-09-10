import type { Grid } from "@world/Grid";
import type { GridPos } from "@world/Coordinates";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { TileDefinition } from "@data/resources/TileDefinition";

export const BATTLE_MOVE_RANGE = 3;

/** All free, walkable tiles reachable from origin within `range` orthogonal steps (BFS, distance-limited). */
export function computeReachableTiles(
  grid: Grid,
  tileRegistry: ResourceRegistry<TileDefinition>,
  origin: GridPos,
  range: number
): GridPos[] {
  const key = (pos: GridPos): string => `${pos.x},${pos.y}`;
  const distances = new Map<string, number>([[key(origin), 0]]);
  const queue: GridPos[] = [origin];
  const reachable: GridPos[] = [];

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const dist = distances.get(key(pos))!;
    if (dist >= range) continue;

    for (const neighbor of grid.neighbors(pos, false)) {
      const neighborKey = key(neighbor);
      if (distances.has(neighborKey)) continue;
      distances.set(neighborKey, dist + 1);

      const cell = grid.getCell(neighbor);
      if (cell.occupantEntityId !== null || !tileRegistry.get(cell.terrainId).walkable) continue;

      reachable.push(neighbor);
      queue.push(neighbor);
    }
  }

  return reachable;
}
