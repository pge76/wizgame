import { describe, expect, it } from "vitest";
import { Grid } from "@world/Grid";

describe("Grid", () => {
  it("reports positions within bounds", () => {
    const grid = new Grid(3, 3, "tile.floor");
    expect(grid.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(grid.isInBounds({ x: 2, y: 2 })).toBe(true);
    expect(grid.isInBounds({ x: 3, y: 0 })).toBe(false);
    expect(grid.isInBounds({ x: -1, y: 0 })).toBe(false);
  });

  it("stores and retrieves cell data", () => {
    const grid = new Grid(2, 2, "tile.floor");
    grid.setCell({ x: 1, y: 1 }, { terrainId: "tile.wall", occupantEntityId: 7 });
    expect(grid.getCell({ x: 1, y: 1 })).toEqual({ terrainId: "tile.wall", occupantEntityId: 7 });
  });

  it("throws when accessing out-of-bounds cells", () => {
    const grid = new Grid(2, 2, "tile.floor");
    expect(() => grid.getCell({ x: 5, y: 5 })).toThrow();
  });

  it("returns only in-bounds orthogonal neighbors by default", () => {
    const grid = new Grid(3, 3, "tile.floor");
    const neighbors = grid.neighbors({ x: 0, y: 0 });
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toEqual(
      expect.arrayContaining([
        { x: 1, y: 0 },
        { x: 0, y: 1 }
      ])
    );
  });

  it("includes diagonal neighbors when requested", () => {
    const grid = new Grid(3, 3, "tile.floor");
    const neighbors = grid.neighbors({ x: 1, y: 1 }, true);
    expect(neighbors).toHaveLength(8);
  });
});
