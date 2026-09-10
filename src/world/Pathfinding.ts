import type { Grid } from "./Grid";
import type { GridPos } from "./Coordinates";
import type { ResourceRegistry } from "@data/loaders/ResourceRegistry";
import type { TileDefinition } from "@data/resources/TileDefinition";

function key(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

function heuristic(a: GridPos, b: GridPos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

class MinHeap<T> {
  private readonly items: { priority: number; value: T }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(value: T, priority: number): void {
    this.items.push({ value, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.priority <= this.items[i]!.priority) break;
      [this.items[parent]!, this.items[i]!] = [this.items[i]!, this.items[parent]!];
      i = parent;
    }
  }

  pop(): T | undefined {
    const top = this.items[0];
    if (!top) return undefined;

    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      while (true) {
        const left = i * 2 + 1;
        const right = i * 2 + 2;
        let smallest = i;
        if (left < n && this.items[left]!.priority < this.items[smallest]!.priority) smallest = left;
        if (right < n && this.items[right]!.priority < this.items[smallest]!.priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest]!, this.items[i]!] = [this.items[i]!, this.items[smallest]!];
        i = smallest;
      }
    }
    return top.value;
  }
}

function reconstructPath(cameFrom: Map<string, GridPos>, goal: GridPos, start: GridPos): GridPos[] {
  const path: GridPos[] = [];
  let current = goal;
  while (key(current) !== key(start)) {
    path.unshift(current);
    current = cameFrom.get(key(current))!;
  }
  return path;
}

export function findPath(
  grid: Grid,
  tileRegistry: ResourceRegistry<TileDefinition>,
  start: GridPos,
  goal: GridPos
): GridPos[] | null {
  if (!grid.isInBounds(goal)) return null;
  if (key(start) === key(goal)) return [];

  const goalCell = grid.getCell(goal);
  if (!tileRegistry.get(goalCell.terrainId).walkable) return null;

  const startKey = key(start);
  const cameFrom = new Map<string, GridPos>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const visited = new Set<string>();

  const open = new MinHeap<GridPos>();
  open.push(start, heuristic(start, goal));

  while (open.size > 0) {
    const current = open.pop()!;
    const currentKey = key(current);
    if (currentKey === key(goal)) {
      return reconstructPath(cameFrom, current, start);
    }
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    for (const neighbor of grid.neighbors(current)) {
      const neighborKey = key(neighbor);
      if (visited.has(neighborKey)) continue;

      const neighborCell = grid.getCell(neighbor);
      if (!tileRegistry.get(neighborCell.terrainId).walkable) continue;
      if (neighborCell.occupantEntityId !== null) continue;

      const tentativeG = gScore.get(currentKey)! + 1;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        open.push(neighbor, tentativeG + heuristic(neighbor, goal));
      }
    }
  }

  return null;
}
