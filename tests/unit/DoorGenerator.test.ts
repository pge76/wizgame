import { describe, expect, it } from "vitest";
import { generateDoorPlacements } from "@data/generation/DoorGenerator";
import type { GridPos } from "@world/Coordinates";

function makeGaps(count: number): GridPos[] {
  return Array.from({ length: count }, (_, i) => ({ x: i, y: 0 }));
}

describe("generateDoorPlacements", () => {
  it("selects exactly 50% (rounded) of the gaps as doors", () => {
    const placements = generateDoorPlacements(makeGaps(28));
    expect(placements).toHaveLength(14);
  });

  it("locks exactly 10% (rounded) of the chosen doors", () => {
    const placements = generateDoorPlacements(makeGaps(28));
    expect(placements.filter((p) => p.locked)).toHaveLength(1);
  });

  it("only ever picks from the given gap positions, with no duplicates", () => {
    const gaps = makeGaps(28);
    const placements = generateDoorPlacements(gaps);
    const keys = placements.map((p) => `${p.pos.x},${p.pos.y}`);

    expect(new Set(keys).size).toBe(keys.length);
    for (const p of placements) {
      expect(gaps).toContainEqual(p.pos);
    }
  });

  it("handles an empty gap list", () => {
    expect(generateDoorPlacements([])).toEqual([]);
  });
});
