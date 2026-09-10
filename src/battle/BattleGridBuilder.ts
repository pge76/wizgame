import { Grid } from "@world/Grid";
import type { GridPos } from "@world/Coordinates";

export const BATTLE_SCALE = 3;
export const ENCOUNTER_RADIUS = 6;

export interface BattleGridResult {
  readonly grid: Grid;
  readonly worldOrigin: GridPos;
  worldToBattle(worldPos: GridPos): GridPos;
  battleToWorld(battlePos: GridPos): GridPos;
}

export function buildBattleGrid(
  worldGrid: Grid,
  anchor: GridPos,
  radius: number = ENCOUNTER_RADIUS
): BattleGridResult {
  const rawX0 = anchor.x - radius;
  const rawY0 = anchor.y - radius;
  const size = radius * 2 + 1;

  const worldOrigin: GridPos = {
    x: Math.max(0, Math.min(rawX0, worldGrid.width - size)),
    y: Math.max(0, Math.min(rawY0, worldGrid.height - size))
  };

  const battleGrid = new Grid(size * BATTLE_SCALE, size * BATTLE_SCALE, worldGrid.getCell(worldOrigin).terrainId);

  for (let wy = 0; wy < size; wy++) {
    for (let wx = 0; wx < size; wx++) {
      const worldPos: GridPos = { x: worldOrigin.x + wx, y: worldOrigin.y + wy };
      if (!worldGrid.isInBounds(worldPos)) continue;
      const terrainId = worldGrid.getCell(worldPos).terrainId;

      for (let sy = 0; sy < BATTLE_SCALE; sy++) {
        for (let sx = 0; sx < BATTLE_SCALE; sx++) {
          const battlePos: GridPos = { x: wx * BATTLE_SCALE + sx, y: wy * BATTLE_SCALE + sy };
          battleGrid.setCell(battlePos, { terrainId, occupantEntityId: null });
        }
      }
    }
  }

  const worldToBattle = (worldPos: GridPos): GridPos => ({
    x: (worldPos.x - worldOrigin.x) * BATTLE_SCALE + Math.floor(BATTLE_SCALE / 2),
    y: (worldPos.y - worldOrigin.y) * BATTLE_SCALE + Math.floor(BATTLE_SCALE / 2)
  });

  const battleToWorld = (battlePos: GridPos): GridPos => ({
    x: worldOrigin.x + Math.floor(battlePos.x / BATTLE_SCALE),
    y: worldOrigin.y + Math.floor(battlePos.y / BATTLE_SCALE)
  });

  return { grid: battleGrid, worldOrigin, worldToBattle, battleToWorld };
}
