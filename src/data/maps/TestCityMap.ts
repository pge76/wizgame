import type { Grid } from "@world/Grid";
import { TILE_FLOOR, TILE_GRASS, TILE_SAND, TILE_WALL, TILE_WATER } from "@data/resources/TileDefinition";
import type { GridPos } from "@world/Coordinates";

/**
 * Rough block-out of the reference city screenshot for grid/pathfinding testing.
 * Thin walls from the reference art are approximated as full wall tiles
 * (see architecture discussion) - rooms end up ~1 tile narrower than the source image.
 */

const MAP_WIDTH = 56;
const MAP_HEIGHT = 48;

const CHAR_TO_TILE_ID: Record<string, string> = {
  g: TILE_GRASS.id,
  ",": TILE_SAND.id,
  ".": TILE_FLOOR.id,
  "#": TILE_WALL.id,
  "~": TILE_WATER.id
};

/** A candidate doorway gap left in an internal room-divider wall. `orientation` is the wall's own
 *  axis (vertical wall → gap lets you pass east/west, and vice versa) — used to tell a genuine
 *  1-tile doorway from a gap later swallowed by an open area (e.g. the central plaza cutting
 *  through a divider): a real doorway still has a wall tile immediately along that axis. */
interface DoorGapCandidate {
  readonly pos: GridPos;
  readonly orientation: "vertical" | "horizontal";
}

function fillRect(rows: string[][], x0: number, y0: number, x1: number, y1: number, char: string): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      rows[y]![x] = char;
    }
  }
}

function strokeRect(rows: string[][], x0: number, y0: number, x1: number, y1: number, char: string): void {
  for (let x = x0; x <= x1; x++) {
    rows[y0]![x] = char;
    rows[y1]![x] = char;
  }
  for (let y = y0; y <= y1; y++) {
    rows[y]![x0] = char;
    rows[y]![x1] = char;
  }
}

function drawVerticalWall(rows: string[][], x: number, y0: number, y1: number, doorEvery: number, gaps: DoorGapCandidate[]): void {
  for (let y = y0; y <= y1; y++) {
    if ((y - y0) % doorEvery === Math.floor(doorEvery / 2)) {
      gaps.push({ pos: { x, y }, orientation: "vertical" });
      continue;
    }
    rows[y]![x] = "#";
  }
}

function drawHorizontalWall(rows: string[][], y: number, x0: number, x1: number, doorEvery: number, gaps: DoorGapCandidate[]): void {
  for (let x = x0; x <= x1; x++) {
    if ((x - x0) % doorEvery === Math.floor(doorEvery / 2)) {
      gaps.push({ pos: { x, y }, orientation: "horizontal" });
      continue;
    }
    rows[y]![x] = "#";
  }
}

function drawWaterBlob(rows: string[][], cx: number, cy: number, rx: number, ry: number): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        rows[y]![x] = "~";
      }
    }
  }
}

/** True if `candidate` is still a genuine 1-tile doorway in the final map — i.e. not swallowed by a
 *  later open area (the plaza carve-out) or overwritten by a crossing wall. */
function isRealDoorGap(rows: string[][], candidate: DoorGapCandidate): boolean {
  const { x, y } = candidate.pos;
  if (rows[y]?.[x] !== ".") return false;

  return candidate.orientation === "vertical"
    ? rows[y - 1]?.[x] === "#" || rows[y + 1]?.[x] === "#"
    : rows[y]?.[x - 1] === "#" || rows[y]?.[x + 1] === "#";
}

function buildMap(): { rows: string[]; doorPositions: GridPos[] } {
  const rows: string[][] = Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => "g"));
  const gapCandidates: DoorGapCandidate[] = [];

  // Sand plaza ring surrounding the walled city.
  fillRect(rows, 2, 2, MAP_WIDTH - 3, MAP_HEIGHT - 3, ",");

  // Outer city wall + interior floor.
  const wallX0 = 8;
  const wallY0 = 6;
  const wallX1 = 47;
  const wallY1 = 43;
  fillRect(rows, wallX0, wallY0, wallX1, wallY1, ".");
  strokeRect(rows, wallX0, wallY0, wallX1, wallY1, "#");

  // Gates through the outer wall (approximating the arrow exits in the reference image) — always
  // open, not candidate doorways: these are the city's own entrances, not room dividers.
  rows[24]![wallX0] = ".";
  rows[25]![wallX0] = ".";
  rows[20]![wallX1] = ".";
  rows[wallY1]![27] = ".";
  rows[wallY1]![28] = ".";

  // Internal room grid - vertical dividers with doorway gaps.
  for (const x of [16, 24, 32, 40]) {
    drawVerticalWall(rows, x, wallY0 + 1, wallY1 - 1, 6, gapCandidates);
  }
  // Internal room grid - horizontal dividers with doorway gaps.
  for (const y of [15, 22, 34]) {
    drawHorizontalWall(rows, y, wallX0 + 1, wallX1 - 1, 8, gapCandidates);
  }

  // Central plaza clearing (fountain courtyard), cut through any dividers crossing it.
  fillRect(rows, 23, 20, 33, 29, ".");
  drawWaterBlob(rows, 28, 24, 3, 3);

  // Lake along the south-west edge, spilling past the city wall.
  drawWaterBlob(rows, 8, 44, 9, 5);
  fillRect(rows, 0, 45, 20, MAP_HEIGHT - 1, "~");

  const doorPositions = gapCandidates.filter((candidate) => isRealDoorGap(rows, candidate)).map((candidate) => candidate.pos);

  return { rows: rows.map((row) => row.join("")), doorPositions };
}

const built = buildMap();

export const TEST_CITY_MAP = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  rows: built.rows,
  /** Map-local positions of internal-room doorway gaps — candidates for door placement (see
   *  Game.placeDoors), not yet translated to world coordinates. */
  doorPositions: built.doorPositions
};

export function applyTestCityMap(grid: Grid, origin: GridPos): void {
  TEST_CITY_MAP.rows.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const char = row[colIndex]!;
      const tileId = CHAR_TO_TILE_ID[char];
      if (!tileId) {
        throw new Error(`Unknown map legend character "${char}"`);
      }
      const pos: GridPos = { x: origin.x + colIndex, y: origin.y + rowIndex };
      if (!grid.isInBounds(pos)) continue;
      grid.setCell(pos, { terrainId: tileId, occupantEntityId: null });
    }
  });
}
