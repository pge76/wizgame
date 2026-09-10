import { describe, expect, it } from "vitest";
import { Grid } from "@world/Grid";
import { BATTLE_SCALE, buildBattleGrid } from "@battle/BattleGridBuilder";

describe("buildBattleGrid", () => {
  it("scales the carved region by BATTLE_SCALE in each axis", () => {
    const worldGrid = new Grid(30, 30, "tile.grass");
    const result = buildBattleGrid(worldGrid, { x: 15, y: 15 }, 6);

    const expectedSize = (6 * 2 + 1) * BATTLE_SCALE;
    expect(result.grid.width).toBe(expectedSize);
    expect(result.grid.height).toBe(expectedSize);
  });

  it("replicates each world tile's terrain into its 4x4 block", () => {
    const worldGrid = new Grid(10, 10, "tile.grass");
    worldGrid.setCell({ x: 5, y: 5 }, { terrainId: "tile.wall", occupantEntityId: null });

    const result = buildBattleGrid(worldGrid, { x: 5, y: 5 }, 2);
    const blockOrigin = result.worldToBattle({ x: 5, y: 5 });
    const blockX0 = blockOrigin.x - (blockOrigin.x % BATTLE_SCALE);
    const blockY0 = blockOrigin.y - (blockOrigin.y % BATTLE_SCALE);

    for (let dy = 0; dy < BATTLE_SCALE; dy++) {
      for (let dx = 0; dx < BATTLE_SCALE; dx++) {
        expect(result.grid.getCell({ x: blockX0 + dx, y: blockY0 + dy }).terrainId).toBe("tile.wall");
      }
    }
  });

  it("clamps the carve origin to world grid bounds near an edge", () => {
    const worldGrid = new Grid(10, 10, "tile.grass");
    const result = buildBattleGrid(worldGrid, { x: 0, y: 0 }, 6);

    expect(result.worldOrigin.x).toBe(0);
    expect(result.worldOrigin.y).toBe(0);
  });

  it("maps world <-> battle coordinates as inverses", () => {
    const worldGrid = new Grid(30, 30, "tile.grass");
    const result = buildBattleGrid(worldGrid, { x: 15, y: 15 }, 6);

    const worldPos = { x: 12, y: 18 };
    const battlePos = result.worldToBattle(worldPos);
    expect(result.battleToWorld(battlePos)).toEqual(worldPos);
  });
});
