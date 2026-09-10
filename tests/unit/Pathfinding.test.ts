import { describe, expect, it } from "vitest";
import { Grid } from "@world/Grid";
import { findPath } from "@world/Pathfinding";
import { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import { TILE_FLOOR, TILE_WALL, type TileDefinition } from "@data/resources/TileDefinition";

function buildRegistry(): ResourceRegistry<TileDefinition> {
  const registry = new ResourceRegistry<TileDefinition>();
  registry.register(TILE_FLOOR);
  registry.register(TILE_WALL);
  return registry;
}

describe("findPath", () => {
  it("returns an empty path when start equals goal", () => {
    const grid = new Grid(5, 5, TILE_FLOOR.id);
    const registry = buildRegistry();

    expect(findPath(grid, registry, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([]);
  });

  it("finds the shortest orthogonal path on an open grid", () => {
    const grid = new Grid(5, 5, TILE_FLOOR.id);
    const registry = buildRegistry();

    const path = findPath(grid, registry, { x: 0, y: 0 }, { x: 2, y: 1 });

    expect(path).not.toBeNull();
    expect(path).toHaveLength(3);
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 1 });
  });

  it("routes around a wall obstacle instead of failing", () => {
    const grid = new Grid(5, 5, TILE_FLOOR.id);
    const registry = buildRegistry();
    // Wall spans column x=2 for rows 0-3, leaving row 4 as the only gap through.
    for (let y = 0; y <= 3; y++) {
      grid.setCell({ x: 2, y }, { terrainId: TILE_WALL.id, occupantEntityId: null });
    }

    const path = findPath(grid, registry, { x: 0, y: 0 }, { x: 4, y: 0 });

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(4);
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it("returns null when the goal tile is not walkable", () => {
    const grid = new Grid(5, 5, TILE_FLOOR.id);
    const registry = buildRegistry();
    grid.setCell({ x: 3, y: 3 }, { terrainId: TILE_WALL.id, occupantEntityId: null });

    expect(findPath(grid, registry, { x: 0, y: 0 }, { x: 3, y: 3 })).toBeNull();
  });

  it("returns null when the goal tile is occupied", () => {
    const grid = new Grid(5, 5, TILE_FLOOR.id);
    const registry = buildRegistry();
    grid.setCell({ x: 3, y: 3 }, { terrainId: TILE_FLOOR.id, occupantEntityId: 42 });

    expect(findPath(grid, registry, { x: 0, y: 0 }, { x: 3, y: 3 })).toBeNull();
  });

  it("returns null when the goal is unreachable", () => {
    const grid = new Grid(3, 3, TILE_FLOOR.id);
    const registry = buildRegistry();
    grid.setCell({ x: 0, y: 2 }, { terrainId: TILE_WALL.id, occupantEntityId: null });
    grid.setCell({ x: 1, y: 2 }, { terrainId: TILE_WALL.id, occupantEntityId: null });
    grid.setCell({ x: 2, y: 2 }, { terrainId: TILE_WALL.id, occupantEntityId: null });

    expect(findPath(grid, registry, { x: 1, y: 0 }, { x: 1, y: 2 })).toBeNull();
  });
});
