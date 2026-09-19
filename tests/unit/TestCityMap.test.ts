import { describe, expect, it } from "vitest";
import { TEST_CITY_MAP } from "@data/maps/TestCityMap";

describe("TEST_CITY_MAP.doorPositions", () => {
  it("finds a reasonable number of real internal-wall doorway gaps", () => {
    console.log("doorPositions count:", TEST_CITY_MAP.doorPositions.length);
    expect(TEST_CITY_MAP.doorPositions.length).toBeGreaterThan(5);
  });

  it("every candidate position is floor with a wall neighbor on the wall's own axis", () => {
    const rows = TEST_CITY_MAP.rows;
    for (const pos of TEST_CITY_MAP.doorPositions) {
      expect(rows[pos.y]?.[pos.x]).toBe(".");
      const north = rows[pos.y - 1]?.[pos.x];
      const south = rows[pos.y + 1]?.[pos.x];
      const west = rows[pos.y]?.[pos.x - 1];
      const east = rows[pos.y]?.[pos.x + 1];
      expect([north, south, west, east]).toContain("#");
    }
  });

  it("positions are unique (no duplicate doorways from overlapping walls)", () => {
    const keys = TEST_CITY_MAP.doorPositions.map((p) => `${p.x},${p.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
