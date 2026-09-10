import { createEmptyCell, type GridCell } from "./GridCell";
import type { GridPos } from "./Coordinates";

export class Grid {
  private readonly cells: GridCell[];

  constructor(
    public readonly width: number,
    public readonly height: number,
    defaultTerrainId: string
  ) {
    this.cells = Array.from({ length: width * height }, () => createEmptyCell(defaultTerrainId));
  }

  isInBounds(pos: GridPos): boolean {
    return pos.x >= 0 && pos.y >= 0 && pos.x < this.width && pos.y < this.height;
  }

  getCell(pos: GridPos): GridCell {
    if (!this.isInBounds(pos)) {
      throw new Error(`Grid position out of bounds: (${pos.x}, ${pos.y})`);
    }
    const cell = this.cells[pos.y * this.width + pos.x];
    if (!cell) {
      throw new Error(`Missing grid cell at (${pos.x}, ${pos.y})`);
    }
    return cell;
  }

  setCell(pos: GridPos, cell: GridCell): void {
    if (!this.isInBounds(pos)) {
      throw new Error(`Grid position out of bounds: (${pos.x}, ${pos.y})`);
    }
    this.cells[pos.y * this.width + pos.x] = cell;
  }

  neighbors(pos: GridPos, diagonal = false): GridPos[] {
    const offsets: GridPos[] = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];
    if (diagonal) {
      offsets.push({ x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 });
    }
    return offsets
      .map((offset) => ({ x: pos.x + offset.x, y: pos.y + offset.y }))
      .filter((neighbor) => this.isInBounds(neighbor));
  }
}
