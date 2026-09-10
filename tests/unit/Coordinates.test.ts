import { describe, expect, it } from "vitest";
import { gridToWorld, worldToGrid, TILE_SIZE } from "@world/Coordinates";

describe("Coordinates", () => {
  it("converts grid positions to world positions", () => {
    expect(gridToWorld({ x: 2, y: 3 })).toEqual({ x: 2 * TILE_SIZE, y: 3 * TILE_SIZE });
  });

  it("round-trips world positions back to grid positions", () => {
    const grid = { x: 4, y: 7 };
    const world = gridToWorld(grid);
    expect(worldToGrid(world.x, world.y)).toEqual(grid);
  });
});
