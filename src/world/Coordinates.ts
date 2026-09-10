export interface GridPos {
  readonly x: number;
  readonly y: number;
}

export const TILE_SIZE = 32;

export function gridToWorld(pos: GridPos): { x: number; y: number } {
  return { x: pos.x * TILE_SIZE, y: pos.y * TILE_SIZE };
}

export function worldToGrid(x: number, y: number): GridPos {
  return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

export function lerpGridPos(a: GridPos, b: GridPos, t: number): GridPos {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
